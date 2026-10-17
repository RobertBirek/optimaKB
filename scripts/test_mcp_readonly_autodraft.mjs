#!/usr/bin/env node
// Actual handlers/engine/provider adapter/writer; synthetic inputs, no live I/O.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { syncBuiltinESMExports } from 'node:module';
import { MODULE_FILES, readStatic, registerFrozenModules, installRuntimeGuard,
  validateClosure, sha256 } from './lib/owa_offline_harness.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
const root = fs.mkdtempSync(path.join(repo, '.superpowers/sdd/readonly-autodraft-fixture-'));
const files = new Map(), directories = new Set([root]), checks = [], logs = [], writes = [];
const state = { draftAttempts: [], dispatch: [], providerCalls: [], permitDraft: false };
globalThis.readonlyDraftFixture = state;
const modules = Object.fromEntries(MODULE_FILES.map(f => [f, readStatic(repo, f).toString('utf8')]));
const runtimeModuleHashes = Object.fromEntries(Object.entries(modules).map(([f, bytes]) => [f, sha256(bytes)]));
function fixture(relative, bytes) {
  const file = path.join(root, relative);
  files.set(file, Buffer.from(bytes));
  for (let dir = path.dirname(file); dir.startsWith(root); dir = path.dirname(dir)) {
    directories.add(dir); if (dir === root) break;
  }
}
function csv(rows) {
  const keys = Object.keys(rows[0]);
  return [keys, ...rows.map(row => keys.map(k => row[k] ?? ''))].map(row =>
    row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n') + '\n';
}
fixture('docs/reference/ERP_Knowledge_Assistant_Routing.json', readStatic(repo, 'docs/reference/ERP_Knowledge_Assistant_Routing.json'));
fixture('docs/reference/ERP_KB_Dashboard_KB_Registry.json', '{"entries":[]}');
const registryPath = 'docs/reference/knowledge_inbox/registry.json';
fixture(registryPath, '{"entries":[],"fixture":"unchanged"}');
// No provider-secret discovery, API socket, credential file or subprocess.
modules['scripts/lib/provider_secrets.mjs'] = 'export function loadProviderSecrets() { return { exaApiKey: "fixture-only" }; } export function maskProviderSecrets() { return {}; } export function saveProviderSecrets() { throw Error("Secret write forbidden"); }';
// Observe the real draft branch before any validation/dedupe/write, even if a
// caught exception would otherwise hide an attempted write from the response.
for (const f of ['scripts/erp_knowledge_answer.mjs', 'scripts/lib/erp_knowledge_mcp_core.mjs']) {
  const spec = f.includes('/lib/') ? './external_search.mjs' : './lib/external_search.mjs';
  assert(modules[f].includes(`from '${spec}'`));
  modules[f] = modules[f].replace(`from '${spec}'`, `from '${spec.replace('external_search', 'fixture_external')}'`);
}
modules['scripts/lib/fixture_external.mjs'] = `
  export * from './external_search.mjs';
  import { createExternalKnowledgeDraft as actual } from './external_search.mjs';
  export function createExternalKnowledgeDraft(input) {
    globalThis.readonlyDraftFixture.draftAttempts.push(input);
    if (!globalThis.readonlyDraftFixture.permitDraft) throw Error('Read-only draft attempt');
    return actual(input);
  }`;
modules['scripts/lib/erp_knowledge_mcp_core.mjs'] = modules['scripts/lib/erp_knowledge_mcp_core.mjs']
  .replace("from '../erp_knowledge_answer.mjs'", "from '../fixture_answer.mjs'");
modules['scripts/fixture_answer.mjs'] = `
  export { renderAnswerMarkdown } from './erp_knowledge_answer.mjs';
  import { answerQuestion as actual } from './erp_knowledge_answer.mjs';
  export function answerQuestion(...args) {
    globalThis.readonlyDraftFixture.dispatch.push(args);
    return actual(...args);
  }`;
validateClosure(modules);
for (const k of Object.keys(process.env)) delete process.env[k];
Object.assign(process.env, { ROOT: root, EXA_PROVIDER: 'api', EXA_API_URL: 'https://provider.invalid/search',
  EXA_AUTO_DRAFT: '1', ENABLE_LIVE_LEARNING: '0', LEARNING_ENABLED: '0' });
const environment = { ...process.env };
const source = {
  title: 'Próbna aktualizacja', url: 'https://pomoc.comarch.pl/optima/fixture-readonly',
  summary: 'Pełny fragment próbny. '.repeat(25) + 'Nie potwierdzono wdrożenia; zapowiedź nie stanowi gwarancji.',
  publishedDate: '2026-02-03', updatedDate: '2026-02-04',
};
const real = { exists: fs.existsSync.bind(fs), read: fs.promises.readFile.bind(fs.promises),
  readdir: fs.readdirSync.bind(fs), mkdir: fs.promises.mkdir.bind(fs.promises), write: fs.promises.writeFile.bind(fs.promises) };
registerFrozenModules({ root, modules });
const guard = installRuntimeGuard({ root, files, directories, output: root });
const originals = [];
const patch = (object, key, value) => { originals.push([object, key, object[key]]); object[key] = value; };
const inRoot = f => typeof f === 'string' && (path.resolve(f) === root || path.resolve(f).startsWith(root + '/'));
const inInbox = f => inRoot(f) && path.resolve(f).startsWith(path.join(root, 'downloads/knowledge_inbox') + '/');
const oldExists = fs.existsSync, oldRead = fs.readFileSync, oldReaddir = fs.readdirSync;
// Unknown synthetic paths are absent. Known reads still use the closed guard;
// only positive controls may read/write real disposable inbox files.
patch(fs, 'existsSync', f => inRoot(f)
  ? files.has(f) || directories.has(f) || (state.permitDraft && (inInbox(f) || f === path.join(root, 'downloads/knowledge_inbox')) && real.exists(f))
  : oldExists(f));
patch(fs, 'readFileSync', (f, ...args) => {
  if (inRoot(f) && !files.has(f) && !directories.has(f)) {
    const error = new Error('Synthetic fixture absent'); error.code = 'ENOENT'; throw error;
  }
  return oldRead(f, ...args);
});
patch(fs, 'readdirSync', (f, ...args) => state.permitDraft && (inInbox(f) || f === path.join(root, 'downloads/knowledge_inbox'))
  ? real.readdir(f, ...args) : oldReaddir(f, ...args));
const oldMkdirSync = fs.mkdirSync, oldAppend = fs.appendFileSync, oldStat = fs.statSync;
patch(fs, 'mkdirSync', (f, ...args) => f === path.join(root, 'logs') ? undefined : oldMkdirSync(f, ...args));
patch(fs, 'appendFileSync', (f, bytes, ...args) => [path.join(root, 'logs/external_search_discovery.jsonl'),
  path.join(root, 'logs/external_search_fallback.jsonl')].includes(f)
  ? logs.push({ path: path.relative(root, f), entry: JSON.parse(bytes) }) : oldAppend(f, bytes, ...args));
patch(fs, 'statSync', (f, ...args) => f === path.join(root, 'logs/external_search_discovery.jsonl') || f === path.join(root, 'logs/external_search_fallback.jsonl')
  ? { size: 0 } : oldStat(f, ...args));
for (const [name, actual] of [['mkdir', real.mkdir], ['writeFile', real.write]]) {
  const denied = fs.promises[name];
  patch(fs.promises, name, (f, ...args) => {
    if (!state.permitDraft || !inInbox(f)) return denied(f, ...args);
    writes.push({ operation: name, path: path.relative(root, f) });
    return actual(f, ...args).then(result => {
      if (name === 'writeFile') fixture(path.relative(root, f), args[0]);
      return result;
    });
  });
}
patch(globalThis, 'fetch', async (url, options) => {
  assert.equal(url, 'https://provider.invalid/search');
  assert.equal(options.method, 'POST');
  state.providerCalls.push(JSON.parse(options.body));
  return { ok: true, status: 200, text: async () => JSON.stringify({ results: [{ ...source }] }) };
});
syncBuiltinESMExports();
async function check(name, run) {
  try { await run(); checks.push({ name, status: 'PASS' }); }
  catch (e) { checks.push({ name, status: 'FAIL', message: e.message }); }
}
let readonlyCalls = 0, readonlyAttempts = 0;
try {
  const load = f => import(pathToFileURL(path.join(root, f)).href);
  const { answerQuestion, renderAnswerMarkdown } = await load('scripts/erp_knowledge_answer.mjs');
  const { KB_DETAILS } = await load('scripts/erp_knowledge_assistant.mjs');
  const { handleJsonRpcRequest, listToolsForProfile } = await load('scripts/lib/erp_knowledge_mcp_core.mjs');
  const { getMcpProfile, listMcpProfiles } = await load('scripts/lib/erp_knowledge_mcp_profiles.mjs');
  const { getExternalSearchStatus } = await load('scripts/lib/external_search.mjs');
  const question = 'Aktualizacja próbna: jakie informacje są aktualne?';
  const call = (name, profile, namespaces, permission, extra = {}) => handleJsonRpcRequest({
    jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: {
      ...(name === 'answer_question' ? { question } : { query: question, as_of: '2026-10-16', correlation_id: 'readonly-fixture' }), ...extra,
    } },
  }, { profile, allowedNamespaces: new Set(namespaces), ...(permission === undefined ? {} : { writeAllowed: permission }) });
  const profiles = listMcpProfiles().filter(p => p.mode === 'read-only' || p.id === 'scoped-readonly' || p.id === 'legacy');
  const methods = profiles.flatMap(p => listToolsForProfile(p).filter(t => t.name === 'answer_question'
    || t.name.includes('.') && t.name !== 'legal_live_source.search').map(tool => ({ profile: p, tool })));
  const mixedArtifacts = new Map();
  for (const [ns, kb] of Object.entries(KB_DETAILS)) {
    for (const file of kb.artifacts.filter(f => !f.endsWith('/'))) {
      fixture(file, file.endsWith('.csv') ? 'id,name,content\n' : file.endsWith('.json') ? '{}' : '');
    }
    const artifact = kb.artifacts.find(f => f.endsWith('.csv'));
    if (ns !== 'OWAOntology') mixedArtifacts.set(ns, artifact);
  }
  const localText = 'Próbna aktualizacja: informacje lokalne wymagają sprawdzenia; brak potwierdzenia wdrożenia.';
  for (const mixed of [false, true]) {
    for (const [ns, artifact] of mixedArtifacts) fixture(artifact, mixed ? csv([{ id: `fixture-${ns}`, name: 'Aktualizacja próbna',
      title: 'Aktualizacja próbna', content: localText, description: localText, sourceOrigin: 'manual', sourceUrl: `https://example.test/local/${ns}` }]) : 'id,name,content\n');
    for (const { profile, tool } of methods) for (const permission of [false, true, undefined]) {
      await check(`${tool.name} / ${profile.id} / ${mixed ? 'mixed' : 'external'} / writeAllowed=${permission}`, async () => {
        const before = { attempts: state.draftAttempts.length, provider: state.providerCalls.length, logs: logs.length };
        const namespaces = profile.namespaces || ['ComarchOptimaReference'];
        const rpc = await call(tool.name, profile, namespaces, permission,
          { allowAutoDraft: true, options: { allowAutoDraft: true }, writeAllowed: true });
        readonlyCalls++;
        assert(!rpc.error, JSON.stringify(rpc.error));
        const body = rpc.result.content[0].text, data = rpc.result.structuredContent;
        assert.equal(data.answer ?? body, body);
        assert.equal(state.providerCalls.length, before.provider + 1, 'Successful configured provider must execute');
        for (const text of [source.title, source.url, source.summary, source.publishedDate]) assert(body.includes(text), `Missing external text: ${text}`);
        assert.equal(data.retrieval.backend, mixed ? 'local_artifacts_with_external_search' : 'external_search');
        if (mixed) assert(data.evidence.length, 'Mixed fallback retains actual local evidence');
        else assert.equal(data.evidence.length, 0);
        assert.equal(state.draftAttempts.length, before.attempts, 'Read-only method attempted automatic draft');
        const events = logs.slice(before.logs);
        assert(events.some(l => l.entry.event === 'external_search' && l.entry.resultCount === 1));
        assert(events.some(l => l.path.endsWith('external_search_fallback.jsonl') && l.entry.resultCount === 1 && l.entry.autoDraft === null));
        const options = state.dispatch.at(-1)[2];
        assert.equal(options.allowAutoDraft, false);
        if (tool.name === 'optima_release.search') assert.equal(options.intent, 'release');
        const intents = { 'erp_entity.get': 'entity', 'erp_relation.list': 'relation', 'erp_concept.search': 'concept', 'erp_process.explain': 'process' };
        if (intents[tool.name]) assert.equal(options.semanticIntent, intents[tool.name]);
        assert.equal(tool.annotations.readOnlyHint, true);
        assert.equal(tool.inputSchema.additionalProperties, false);
        assert(!Object.hasOwn(tool.inputSchema.properties, 'allowAutoDraft'), 'Injection rejected by closed public schema');
        assert(!body.includes('allowAutoDraft'));
      });
    }
  }
  readonlyAttempts = state.draftAttempts.length;
  await check('Read-only calls leave inbox absent, registry byte-identical, configuration intact and no guarded attempts', () => {
    assert.equal(readonlyAttempts, 0); assert.deepEqual(writes, []);
    assert.equal(real.exists(path.join(root, 'downloads')), false);
    assert.equal(files.get(path.join(root, registryPath)).toString(), '{"entries":[],"fixture":"unchanged"}');
    assert.deepEqual({ ...process.env }, environment); assert.equal(getExternalSearchStatus().activeProvider, 'api');
    assert.deepEqual(guard.violations, []);
  });
  await check('Direct engine private false preserves successful fallback without any draft attempt', async () => {
    const before = state.draftAttempts.length;
    const { answer } = await answerQuestion(question, new Set(['ComarchOptimaReference']), { allowAutoDraft: false });
    assert.equal(answer.externalSearch.used, true); assert(renderAnswerMarkdown(answer).includes(source.summary));
    assert.equal(state.draftAttempts.length, before); assert.equal(answer.externalSearch.autoDraft, undefined);
  });
  state.permitDraft = true;
  await check('Direct default engine keeps configured automatic creation through actual writer', async () => {
    const before = state.draftAttempts.length;
    const { answer } = await answerQuestion(question, new Set(['ComarchOptimaReference']));
    assert.equal(state.draftAttempts.length, before + 1); assert.equal(state.draftAttempts.at(-1).auto, true);
    assert.equal(answer.externalSearch.autoDraft.created, true);
    const draft = JSON.parse(await real.read(answer.externalSearch.autoDraft.jsonPath));
    assert.equal(draft.sourceUrl, source.url); assert.equal(draft.metadata.discoveredVia, 'exa');
    assert((await real.read(answer.externalSearch.autoDraft.mdPath, 'utf8')).includes(source.summary));
  });
  await check('Unauthorized explicit tools are denied before provider or writer, even with injected permission', async () => {
    for (const name of ['submit_knowledge_draft', 'draft_external_source']) for (const permission of [false, undefined]) {
      const before = [writes.length, state.providerCalls.length, state.draftAttempts.length];
      const rpc = await call(name, getMcpProfile('knowledge-editorial-mcp'), ['ComarchOptimaReference'], permission, { writeAllowed: true });
      assert.equal(rpc.error.code, -32003);
      assert.deepEqual([writes.length, state.providerCalls.length, state.draftAttempts.length], before);
    }
  });
  await check('Authorized explicit external draft still searches and writes real JSON/Markdown', async () => {
    source.url = 'https://pomoc.comarch.pl/optima/fixture-explicit';
    const before = state.draftAttempts.length;
    const rpc = await call('draft_external_source', getMcpProfile('knowledge-editorial-mcp'), ['ComarchOptimaReference'], true,
      { kbName: 'Fixture Optima', kbNamespace: 'ComarchOptimaReference' });
    assert(!rpc.error); const data = rpc.result.structuredContent;
    assert.equal(data.ok, true); assert.equal(state.draftAttempts.length, before + 1);
    assert.equal(state.draftAttempts.at(-1).auto, false);
    assert.equal(JSON.parse(await real.read(data.jsonPath)).sourceUrl, source.url);
    assert((await real.read(data.mdPath, 'utf8')).includes(source.summary));
  });
  await check('Authorized submit draft still uses the actual writer and validation', async () => {
    const profile = getMcpProfile('knowledge-editorial-mcp');
    const input = { kbName: 'Fixture Optima', kbNamespace: 'ComarchOptimaReference', title: 'Szkic próbny', content: 'Treść próbna.' };
    const rpc = await call('submit_knowledge_draft', profile, ['ComarchOptimaReference'], true, input);
    assert.equal(rpc.result.structuredContent.saved, true);
    assert.equal(JSON.parse(await real.read(rpc.result.structuredContent.jsonPath)).content, input.content);
    await assert.rejects(call('submit_knowledge_draft', profile, ['ComarchOptimaReference'], true, { ...input, kbNamespace: 'invalid-fixture' }), /Unsupported kbNamespace/);
  });
  await check('Positive controls are exactly three actual draft pairs; no registry mutation/network/process/other writes', () => {
    assert.equal(writes.filter(w => w.operation === 'writeFile').length, 6);
    assert(writes.every(w => w.path.startsWith('downloads/knowledge_inbox/')));
    assert.deepEqual(guard.violations, []); assert.deepEqual({ ...process.env }, environment);
    assert.equal(files.get(path.join(root, registryPath)).toString(), '{"entries":[],"fixture":"unchanged"}');
  });
} finally {
  for (const [object, key, original] of originals.reverse()) object[key] = original;
  guard.restore(); fs.rmSync(root, { recursive: true, force: true }); delete globalThis.readonlyDraftFixture;
}
const failed = checks.filter(c => c.status === 'FAIL').length;
console.log(JSON.stringify({ passed: checks.length - failed, failed, readonlyCalls, readonlyAttempts,
  providerCalls: state.providerCalls.length, telemetryRecords: logs.length, guardViolations: guard.violations,
  positiveFixtureWrites: writes, runtimeModuleHashes, checks }, null, 2));
if (failed) process.exitCode = 1;
