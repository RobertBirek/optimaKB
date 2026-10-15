#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BASELINE_SHA256, validateBundle, installRuntimeGuard, registerFrozenModules, inspectResponse, sha256 } from './lib/owa_offline_harness.mjs';

try {
  const args = process.argv.slice(2);
  const value = name => args[args.indexOf(name) + 1];
  if (!args.includes('--bundle')) throw new Error('Require explicit --bundle absolute existing directory');
  if (!args.includes('--output-parent')) throw new Error('Require explicit --output-parent');
  const bundle = validateBundle(value('--bundle'));
  const parent = value('--output-parent');
  if (!path.isAbsolute(parent) || fs.realpathSync(parent) !== parent || !(parent === '/tmp/opencode' || parent.startsWith('/tmp/opencode/'))) throw new Error('Private existing output parent required');
  if (parent === bundle.root || parent.startsWith(bundle.root + path.sep)) throw new Error('Output must be separate from frozen bundle');
  process.umask(0o077);
  const output = fs.mkdtempSync(path.join(parent, 'owa-quality-'));
  // Discard ambient credentials/configuration before importing any domain module.
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, { ROOT: bundle.root, EXA_AUTO_DRAFT: '0', ENABLE_LIVE_LEARNING: '0', LEARNING_ENABLED: '0', EXA_PROVIDER: 'disabled' });
  registerFrozenModules(bundle);
  const guard = installRuntimeGuard({ ...bundle, output });
  try {
    const { handleJsonRpcRequest } = await import(pathToFileURL(path.join(bundle.root, 'scripts/lib/erp_knowledge_mcp_core.mjs')).href);
    const { getMcpProfile } = await import(pathToFileURL(path.join(bundle.root, 'scripts/lib/erp_knowledge_mcp_profiles.mjs')).href);
    const results = [];
    for (const q of bundle.baseline.questions) {
      const request = { jsonrpc: '2.0', id: q.id, method: 'tools/call', params: {
        name: q.tool, arguments: { query: q.query, as_of: '2026-10-15', limit: 5, correlation_id: `owa-quality-candidate-${q.id}` },
      } };
      const response = await handleJsonRpcRequest(request, { profile: getMcpProfile('erp-semantic-mcp'),
        allowedNamespaces: new Set(['OWAOntology', 'ComarchOptimaBusinessSemantics']), writeAllowed: false });
      // Whole JSON roundtrip: no private metadata, response whitelist or snippet substitution.
      const safe = JSON.parse(JSON.stringify(response));
      const markdown = (safe.result?.content || []).filter(p => p.type === 'text').map(p => p.text).join('\n');
      const json = JSON.stringify(safe, null, 2) + '\n';
      guard.writeOutput(`${q.id}.md`, markdown);
      guard.writeOutput(`${q.id}.json`, json);
      const body = safe.result?.structuredContent;
      let checks;
      try { checks = inspectResponse(safe); }
      catch (error) { checks = { error: error.message }; }
      results.push({ id: q.id, request, requestHash: sha256(JSON.stringify(request)), responseFile: `${q.id}.json`,
        responseHash: sha256(json), markdownFile: `${q.id}.md`, markdownHash: sha256(markdown), expected: q.expected,
        provisional: { rpcOk: !safe.error && !safe.result?.isError, presentation: checks, coverage: body?.owaCoverage || null }, manualScore: 'PENDING' });
    }
    const report = { schemaVersion: 1, status: 'PENDING_MANUAL_REVIEW', bundle: bundle.root,
      sourceManifestHash: bundle.manifestHash, questionsHash: BASELINE_SHA256, results,
      guard: { violations: guard.violations, runtimeReads: [...new Set(guard.reads)], blockedLearningWriterCalls: globalThis.owaBlockedLearningCalls || 0 } };
    guard.writeOutput('OWA_Answer_Quality_Offline_2026-10-15.json', JSON.stringify(report, null, 2) + '\n');
    guard.writeOutput('OWA_Answer_Quality_Offline_2026-10-15.md', '# Frozen offline candidate — manual review pending\n\n' +
      `Manifest: ${bundle.manifestHash}\nQuestions: ${BASELINE_SHA256}\n\n` + results.map(r => `## ${r.id}\n\nExpected: ${r.expected}\n\nResponse: ${r.markdownFile}; SHA-256 ${r.markdownHash}\n`).join('\n'));
    console.log(JSON.stringify({ output, probes: results.length, violations: guard.violations, manualScore: 'PENDING' }, null, 2));
    assert.equal(guard.violations.length, 0, 'Offline guard violation, including swallowed attempts');
    assert(results.every(r => r.provisional.rpcOk), 'RPC failure; inspect retained full responses');
    assert(results.every(r => !r.provisional.presentation.error), 'Presentation gate failure; inspect retained full responses');
  } finally { guard.restore(); }
} catch (e) { console.error(e.stack); process.exitCode = 1; }
