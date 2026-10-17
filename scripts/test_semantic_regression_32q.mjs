#!/usr/bin/env node
// Actual handler execution, not a fact scorer. Manual grades always start pending.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BASELINE_SHA256, sha256, registerFrozenModules, installRuntimeGuard } from './lib/owa_offline_harness.mjs';
import { HOLDOUT20_SHA256, validateSemanticBundle, semanticRequest, assertSemanticRequest, namedReporter,
  assertCleanRuntime, inspectSemanticResponse, privateParent, parseArguments } from './lib/semantic_regression_harness.mjs';

try {
  const a = parseArguments(process.argv.slice(2), ['--bundle', '--output-parent']);
  const bundle = validateSemanticBundle(a['--bundle']), parent = privateParent(a['--output-parent']);
  if (parent === bundle.root || parent.startsWith(bundle.root + '/')) throw Error('Output must be separate from bundle');
  process.umask(0o077);
  const output = fs.mkdtempSync(path.join(parent, 'semantic32-candidate-'));
  const reportName = 'Semantic_Intent_Subject_Regression32Q_2026-10-16';
  for (const k of Object.keys(process.env)) delete process.env[k];
  Object.assign(process.env, { ROOT: bundle.root, EXA_AUTO_DRAFT: '0', ENABLE_LIVE_LEARNING: '0', LEARNING_ENABLED: '0', EXA_PROVIDER: 'disabled' });
  registerFrozenModules(bundle);
  const guard = installRuntimeGuard({ ...bundle, output });
  const write = namedReporter(guard, [...bundle.cases.flatMap(q => [`${q.id}.request.json`, `${q.id}.json`, `${q.id}.md`]), reportName + '.json', reportName + '.md']);
  try {
    const { handleJsonRpcRequest } = await import(pathToFileURL(path.join(bundle.root, 'scripts/lib/erp_knowledge_mcp_core.mjs')).href);
    const { getMcpProfile } = await import(pathToFileURL(path.join(bundle.root, 'scripts/lib/erp_knowledge_mcp_profiles.mjs')).href);
    const results = [];
    for (const q of bundle.cases) {
      const request = semanticRequest(q); assertSemanticRequest(request, bundle.cases);
      const violationStart = guard.violations.length, started = Date.now();
      const raw = await handleJsonRpcRequest(request, { profile: getMcpProfile('erp-semantic-mcp'),
        allowedNamespaces: new Set(['OWAOntology', 'ComarchOptimaBusinessSemantics']), writeAllowed: false });
      const response = JSON.parse(JSON.stringify(raw)), json = JSON.stringify(response, null, 2) + '\n';
      const markdown = (response.result?.content || []).filter(p => p.type === 'text').map(p => p.text).join('\n');
      const requestBytes = JSON.stringify(request, null, 2) + '\n';
      write(`${q.id}.request.json`, requestBytes); write(`${q.id}.json`, json); write(`${q.id}.md`, markdown);
      let audit; try { audit = inspectSemanticResponse(response, bundle); } catch (e) { audit = { error: e.message }; }
      results.push({ id: q.id, bank: q.bank, expected: q.expected, request, requestHash: sha256(requestBytes),
        responseFile: `${q.id}.json`, responseHash: sha256(json), markdownFile: `${q.id}.md`, markdownHash: sha256(markdown),
        rpcOk: !response.error && !response.result?.isError, audit, elapsedMs: Date.now() - started,
        guardViolations: guard.violations.slice(violationStart), manualScore: 'PENDING_MANUAL_REVIEW' });
    }
    const report = { schemaVersion: 1, status: 'PENDING_MANUAL_REVIEW', bundle: bundle.root, output,
      manifestHash: bundle.manifestHash, bankHashes: { original12: BASELINE_SHA256, holdout20: HOLDOUT20_SHA256 },
      sourceAndModuleManifest: bundle.manifest, results,
      guard: { violations: guard.violations, runtimeReads: [...new Set(guard.reads)], blockedLearningWriterCalls: globalThis.owaBlockedLearningCalls || 0 } };
    const bytes = JSON.stringify(report, null, 2) + '\n';
    write(reportName + '.json', bytes);
    write(reportName + '.md', '# Offline32 candidate — PENDING_MANUAL_REVIEW\n\n' +
      `Manifest SHA-256: ${bundle.manifestHash}\n\n` + results.map(r => `## ${r.id}\n\nExpected (unchanged): ${r.expected}\n\nFull answer: ${r.markdownFile}; SHA-256 ${r.markdownHash}\n\nAudit: ${r.audit.error || 'PASS (not a factual grade)'}`).join('\n\n'));
    console.log(JSON.stringify({ output, manifestHash: bundle.manifestHash, reportHash: sha256(bytes), cases: results.length,
      rpcOk: results.filter(r => r.rpcOk).length, auditOk: results.filter(r => !r.audit.error).length, guard: report.guard }, null, 2));
    assertCleanRuntime(guard);
    assert.equal(results.length, 32); assert(results.every(r => r.rpcOk && !r.audit.error), 'Retained RPC/presentation/source audit failure');
  } finally { guard.restore(); }
} catch (e) { console.error(e.stack); process.exitCode = 1; }
