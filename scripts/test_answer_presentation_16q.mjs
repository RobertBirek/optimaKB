#!/usr/bin/env node
// Derived from the approved private Task4 runner. Frozen probes are unchanged.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import { syncBuiltinESMExports } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { prepareFixtures, sha256, save as savePrivate } from './prepare_answer_presentation_fixtures.mjs';

for (const name of Object.keys(process.env)) delete process.env[name];
const { output, manifest, checkSourceHashes } = prepareFixtures();
const save = (relative, value) => savePrivate(output, relative, value);
const root = path.join(output, 'fixtures');
Object.assign(process.env, { PATH: '/usr/bin:/bin', LANG: 'C.UTF-8', EXA_PROVIDER: 'mcp',
  EXA_MCP_COMMAND: '', EXA_API_KEY: '', TAVILY_API_KEY: '', FIRECRAWL_API_KEY: '',
  EXA_AUTO_DRAFT: '0', ENABLE_LIVE_LEARNING: '0', ROOT: root, TMPDIR: output });
const authority = name => JSON.parse(fs.readFileSync(path.join(output, `authority/docs/reference/${name}`)));
const original = authority('Post_Correction_16Q_2026-10-13.json');
const live = authority('Live_Post_Correction_16Q_2026-10-14.json');
const pack = authority('Promoted_Correction_Pack_2026-10-13.json');
const mappings = authority('Promoted_Correction_Local_Apply_2026-10-13.json').mappings;
const readback = authority('Promoted_Correction_Build_Readback_2026-10-13.json');
const frozenBytes = fs.readFileSync(path.join(output, 'frozen-criteria.json'));
const frozen = JSON.parse(frozenBytes), probes = frozen.probes;
const criteriaHash = sha256(JSON.stringify({ criteria: original.criteria, questions: original.questions }));
assert.equal(criteriaHash, live.criteria.currentCanonicalCriteriaAndQuestionsSha256);
assert.deepEqual(frozen.criteria, original.criteria);
assert.deepEqual(frozen.questions, original.questions);
assert.equal(original.questions.length, 16);
const safety = { fetchAttempts: 0, externalCommandAttempts: 0, forbiddenReads: 0, forbiddenWrites: 0, writes: [], sealedModuleReads: [] };
process.on('uncaughtExceptionMonitor', error => save('failure.json', {
  finishedAt: new Date().toISOString(), message: error.message, stack: error.stack, safety,
  reviewStatus: 'FAILED_INVOCATION; never substitutes for reviewed QA', inputManifest: 'snapshot-manifest.json' }));
const patched = [];
function patch(object, name, replacement) { patched.push([object, name, object[name]]); object[name] = replacement; }
const within = file => {
  const value = path.resolve(file instanceof URL ? fileURLToPath(file) : String(file));
  return (value === root || value.startsWith(root + path.sep)) && !/(^|\/)(data|\.env(?:\..*)?|cookies?|secrets?)(\/|$)/i.test(value);
};
const readSync = fs.readFileSync;
const forbiddenRead = () => { safety.forbiddenReads++; throw new Error('Outside private fixture ROOT content read'); };
patch(fs, 'readFileSync', (file, ...args) => within(file) ? readSync(file, ...args) : forbiddenRead());
const modules = new Set(manifest.files.filter(r => r.kind === 'code').map(r => path.join(output, r.fixture)));
patch(fs.promises, 'readFile', async (file, ...args) => {
  const resolved = path.resolve(file instanceof URL ? fileURLToPath(file) : String(file));
  if (modules.has(resolved)) {
    safety.sealedModuleReads.push(path.relative(output, resolved));
    return readSync(file, ...args);
  }
  return within(file) ? readSync(file, ...args) : forbiddenRead();
});
const openSync = fs.openSync;
patch(fs, 'openSync', (file, flags, ...args) => {
  const resolved = path.resolve(file instanceof URL ? fileURLToPath(file) : String(file));
  if (flags !== 'r' && flags !== 0) { safety.forbiddenWrites++; throw new Error('Writable open forbidden'); }
  if (!within(file) && !modules.has(resolved)) return forbiddenRead();
  return openSync(file, flags, ...args);
});
for (const name of ['writeFileSync', 'appendFileSync', 'mkdirSync', 'renameSync', 'unlinkSync', 'rmSync', 'copyFileSync', 'createWriteStream'])
  patch(fs, name, () => { safety.forbiddenWrites++; throw new Error('Answer runtime writes forbidden'); });
for (const name of ['writeFile', 'appendFile', 'mkdir', 'rename', 'unlink', 'rm', 'copyFile', 'open'])
  patch(fs.promises, name, async () => { safety.forbiddenWrites++; throw new Error('Answer runtime async writes forbidden'); });
const networkBlocked = () => { safety.fetchAttempts++; throw new Error('Offline QA: network forbidden'); };
patch(globalThis, 'fetch', async () => networkBlocked());
for (const [object, names] of [[http, ['request', 'get']], [https, ['request', 'get']], [net, ['connect', 'createConnection']], [tls, ['connect']]])
  for (const name of names) patch(object, name, networkBlocked);
for (const name of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork'])
  patch(childProcess, name, () => { safety.externalCommandAttempts++; throw new Error('Offline QA: external command forbidden'); });
syncBuiltinESMExports();
const calls = [], scopeChecks = [];
let externalStatus;
try {
  const runtime = relative => pathToFileURL(path.join(output, `runtime/${relative}`));
  const { handleJsonRpcRequest } = await import(runtime('scripts/lib/erp_knowledge_mcp_core.mjs'));
  const { getMcpProfile } = await import(runtime('scripts/lib/erp_knowledge_mcp_profiles.mjs'));
  const { getExternalSearchStatus } = await import(runtime('scripts/lib/external_search.mjs'));
  externalStatus = getExternalSearchStatus();
  assert.equal(externalStatus.enabled, false);
  for (const q of original.questions) {
    const [kb, tool] = q.tool.split('.'), profile = getMcpProfile(original.execution.profileMapping[kb]);
    const request = { jsonrpc: '2.0', id: q.id, method: 'tools/call', params: { name: original.execution.actualToolMapping[tool],
      arguments: { query: q.query, as_of: '2026-10-13', limit: 5, correlation_id: `${path.basename(output)}-${q.id}` } } };
    const startedAt = new Date().toISOString();
    const response = await handleJsonRpcRequest(request, { profile, allowedNamespaces: new Set(profile.namespaces), writeAllowed: false });
    calls.push({ id: q.id, profile: profile.id, namespaces: profile.namespaces, request, startedAt, finishedAt: new Date().toISOString(), response });
    const structured = response.result?.structuredContent;
    assert(structured, `Handler returned no structured answer: ${q.id}`);
    assert((structured.sources || []).length <= 2, 'Source cap exceeded');
    assert((structured.sources || []).every(s => profile.namespaces.includes(s.namespace)), 'Source scope expanded');
    assert((structured.evidence || []).every(e => profile.namespaces.includes(e.kb)), 'Evidence scope expanded');
  }
  // Real dispatch permission control, kept outside the sixteen scored requests.
  const profile = getMcpProfile(original.execution.profileMapping[original.questions[0].tool.split('.')[0]]);
  const response = await handleJsonRpcRequest(calls[0].request, { profile, allowedNamespaces: new Set(), writeAllowed: false });
  assert(response.error || response.result?.isError, 'Empty namespace permission did not deny request');
  scopeChecks.push({ name: 'empty allowed namespaces denies actual dispatch', passed: true, response });
} finally {
  for (const [object, name, originalValue] of patched.reverse()) object[name] = originalValue;
  syncBuiltinESMExports();
}
checkSourceHashes();
assert.equal(sha256(fs.readFileSync(path.join(output, 'frozen-criteria.json'))), sha256(frozenBytes));
const { parseCsvRecords } = await import(pathToFileURL(path.join(output, 'runtime/scripts/lib/knowledge_retrieval.mjs')));
const results = [];
for (const [index, call] of calls.entries()) {
  const q = original.questions[index], mapping = mappings.find(m => m.key === q.key), payload = pack.records.find(r => r.key === q.key).payload;
  const stem = mapping.newDraftId.toUpperCase().replaceAll('-', '_');
  const expectedIds = readback.liveReadback.successorChecks.map(r => r.semanticId).filter(id => id.includes(stem));
  const raw = JSON.stringify(call.response, null, 2) + '\n';
  save(`responses/${q.id}-response.json`, raw);
  const structured = call.response.result?.structuredContent;
  const rendered = String(structured?.answer || '').replaceAll(q.query, '');
  const locators = [];
  for (const e of structured?.evidence || []) {
    if (!e.artifact?.endsWith('.csv')) continue;
    const file = path.join(root, e.artifact);
    assert(within(file));
    const parsed = parseCsvRecords(fs.readFileSync(file, 'utf8'));
    const idColumn = parsed.columns.indexOf('id');
    for (const hit of e.hits || []) {
      const record = parsed.records.find(r => r.line === hit.line && r.endLine === hit.endLine);
      assert(record, `Invalid physical CSV locator: ${q.id}`);
      locators.push({ artifact: e.artifact, line: hit.line, endLine: hit.endLine,
        sha256: sha256(fs.readFileSync(file)), recordId: record.cells[idColumn],
        owner: Object.fromEntries(parsed.columns.map((c, i) => [c, record.cells[i]])).sourcePath ?? null });
    }
  }
  const source = structured?.sources?.find(s => s.sourceUrl === payload.sourceUrl && s.owningPath?.includes(mapping.newDraftId));
  const checks = probes[index].map(([name, pattern]) => {
    const match = rendered.match(new RegExp(pattern, 'iu'));
    return { name, passed: !!match, matchedText: match?.[0] ?? null };
  });
  const dateChecks = ['sourcePublicationDate', 'sourceUpdatedAt'].map((field, i) => {
    const actual = source?.[i ? 'update' : 'publication'], expected = payload.metadata[field] ?? null;
    return { field, expected, actual: actual ?? null, passed: !!source && actual?.value === expected
      && (expected ? rendered.includes(expected) : !!actual?.reason) };
  });
  const literalProjectionIds = expectedIds.filter(id => raw.includes(id));
  const locatorProjectionIds = expectedIds.filter(id => locators.some(l => l.recordId === id));
  const returnedIds = [...new Set((structured?.sources || []).flatMap(s => s.recordIds || []))];
  const coverage = { expectedProjectionIds: expectedIds, literalNewDraftId: raw.includes(mapping.newDraftId),
    literalProjectionIds, locatorProjectionIds, sourceRecordIds: returnedIds.filter(id => expectedIds.includes(id)), locators,
    predecessorLiteral: raw.includes(mapping.oldDraftId) };
  const citationPassed = !!source && rendered.includes(payload.sourceUrl);
  const successorReturned = literalProjectionIds.length > 0 || locatorProjectionIds.length > 0;
  const missing = [...checks.filter(c => !c.passed).map(c => c.name), ...dateChecks.filter(c => !c.passed).map(c => c.field),
    ...(!citationPassed ? ['full target source citation'] : []), ...(!successorReturned ? ['successor coverage'] : [])];
  const useful = checks.some(c => c.passed) && successorReturned;
  const provisionalStatus = call.response.error || !useful ? 'MISS' : missing.length ? 'PARTIAL' : 'PASS';
  results.push({ id: q.id, query: q.query, expected: q.expected, provisionalStatus, previousStatus: original.results[index].status,
    probes: checks, missing, dates: dateChecks, citationPassed, coverage, renderedFacts: rendered, sources: structured?.sources || [],
    validity: structured?.validity, warnings: structured?.warnings, evidenceAssessment: structured?.evidenceAssessment,
    schemaNoise: /ComarchOptimaSchema|CDN\.[A-Za-z]|\bFK\b/.test(rendered),
    response: { path: `responses/${q.id}-response.json`, sha256: sha256(raw), bytes: Buffer.byteLength(raw) }, error: call.response.error });
}
// Reviewed proof strings are regression witnesses only, never score overrides or answer backfill.
const witnesses = JSON.parse(fs.readFileSync(path.join(output, 'semantic-review.json')));
save('requests-and-responses.json', calls);
save('rendered-answers.md', results.map(r => `# ${r.id}\n${r.renderedFacts}\n`).join('\n'));
const critical = ['Q07', 'Q10', 'Q16'].map(id => {
  const row = results.find(r => r.id === id);
  const witness = witnesses.rows.find(r => r.id === id);
  const proofs = witness.proof;
  assert(Array.isArray(proofs) && proofs.length, `Missing reviewed useful-fact witnesses: ${id}`);
  const proofChecks = proofs.map(p => { const text = typeof p === 'string' ? p : p.text || p.proof; return { text, passed: typeof text === 'string' && row.renderedFacts.includes(text) }; });
  return { id, passed: row.citationPassed && row.dates.every(d => d.passed) && proofChecks.every(p => p.passed), proofChecks, missing: row.missing };
});
const report = { taskId: 'Task4-functional16Q-repeat', channel: 'actual current sealed handler JSON-RPC, regular-file ROOT; local not live/deployed',
  reviewStatus: 'NOT_MANUALLY_REVIEWED; provisional automatic scores only', output, criteriaHash, frozenCriteriaHash: sha256(frozenBytes),
  inputManifest: 'snapshot-manifest.json', completionSealSha256: manifest.completionSealSha256, safety, externalStatus, results, scopeChecks,
  provisionalQuality: Object.fromEntries(['PASS', 'PARTIAL', 'MISS'].map(s => [s, results.filter(r => r.provisionalStatus === s).length])),
  assertions: { actual16: calls.length === 16, exactContract: calls.every((c, i) => c.request.params.arguments.query === original.questions[i].query
    && c.request.params.arguments.as_of === '2026-10-13' && c.request.params.arguments.limit === 5),
    sourceCapsAndScopes: true, offlineIsolated: !safety.fetchAttempts && !safety.externalCommandAttempts && !safety.forbiddenReads && !safety.forbiddenWrites,
    Q07Q10Q16: critical } };
save('functional16Q-probe-report.json', report);
checkSourceHashes();
console.log(JSON.stringify({ output, assertions: report.assertions, safety, provisionalQuality: report.provisionalQuality }, null, 2));
assert(report.assertions.actual16 && report.assertions.exactContract && report.assertions.offlineIsolated && critical.every(r => r.passed));
