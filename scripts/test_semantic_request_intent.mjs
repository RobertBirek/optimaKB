#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { syncBuiltinESMExports } from 'node:module';
import { STATIC_FILES, MODULE_FILES, readStatic, registerFrozenModules, installRuntimeGuard,
  validateClosure } from './lib/owa_offline_harness.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
const intentFile = 'scripts/lib/semantic_request_intent.mjs';
assert(fs.existsSync(path.join(repo, intentFile)), 'Missing semantic method-intent/scope module');
const { semanticIntentForTool, semanticCandidateNamespaces } = await import('./lib/semantic_request_intent.mjs');
const OWA = 'OWAOntology', BUSINESS = 'ComarchOptimaBusinessSemantics';
const both = new Set([BUSINESS, OWA]);
const methods = [['erp_entity.get', 'entity'], ['erp_relation.list', 'relation'],
  ['erp_process.explain', 'process'], ['erp_concept.search', 'concept']];
const checks = [];
async function check(name, run) {
  try { await run(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', message: error.message }); }
}
const stable = value => JSON.parse(JSON.stringify(value, (key, item) => key === 'observedAt' ? undefined : item));
await check('Closed exact method map and fresh scope intersections', () => {
  for (const [name, intent] of methods) {
    assert.equal(semanticIntentForTool(name), intent);
    for (const scope of [null, both]) assert.deepEqual(semanticCandidateNamespaces(intent, scope), [OWA, BUSINESS]);
    assert.deepEqual(semanticCandidateNamespaces(intent, new Set()), []);
    assert.deepEqual(semanticCandidateNamespaces(intent, new Set([BUSINESS])), [BUSINESS]);
    assert.deepEqual(semanticCandidateNamespaces(intent, new Set([OWA])), [OWA]);
    assert.deepEqual(semanticCandidateNamespaces(intent, new Set(['TaxbellLegalReference'])), []);
  }
  for (const name of ['optima_docs.search', 'optima_release.search', 'answer_question', 'erp_entity.get.extra',
    'ERP_ENTITY.GET', '__proto__', 'constructor', '', null, undefined]) assert.equal(semanticIntentForTool(name), null);
  for (const intent of [null, undefined, 'release', 'ENTITY', 'erp_entity.get', {}, '__proto__']) {
    assert.deepEqual(semanticCandidateNamespaces(intent, null), []);
  }
  const result = semanticCandidateNamespaces('entity', both);
  result.length = 0;
  assert.deepEqual(semanticCandidateNamespaces('entity', both), [OWA, BUSINESS]);
  assert.deepEqual([...both], [BUSINESS, OWA]);
});

// All corpus rows below are synthetic. Only exact worktree modules/routing metadata
// are read before installing the existing closed read/network/write guard.
const root = fs.mkdtempSync('/tmp/opencode/semantic-intent-');
const files = new Map(), directories = new Set([root]);
function fixture(relative, bytes) {
  const absolute = path.join(root, relative);
  files.set(absolute, Buffer.from(bytes));
  let parent = path.dirname(absolute);
  while (parent.startsWith(root)) {
    directories.add(parent);
    if (parent === root) break;
    parent = path.dirname(parent);
  }
}
function csv(rows) {
  const keys = Object.keys(rows[0]);
  return [keys, ...rows.map(row => keys.map(key => row[key] ?? ''))].map(row =>
    row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n') + '\n';
}
for (const relative of STATIC_FILES) fixture(relative, relative.endsWith('.csv') ? 'id,name,description\n'
  : relative.endsWith('.json') ? '{}\n' : '');
for (const relative of ['docs/reference/ERP_Knowledge_Assistant_Routing.json', 'docs/reference/ERP_KB_Dashboard_KB_Registry.json']) {
  fixture(relative, readStatic(repo, relative));
}
const question = 'Co oznacza Karta próbna i jakie ma wartości?';
fixture('exports/owa_ontology/v1/ontology_entity.csv', csv([{ id: 'opaque:sample', name: 'Karta próbna',
  canonicalName: 'Karta próbna', mainTable: 'CDN.SampleCards',
  description: '## Identyfikatory\nKarta próbna: Sample_Key oznacza klucz próbny. Wartości identyfikują rekord.' }]));
fixture('exports/optima_business_semantics/v1/business_description.csv', csv([{ id: 'business:sample',
  name: 'Znaczenie karty', description: 'Karta próbna: co oznacza i jakie ma wartości. Znaczenie i opis biznesowy.',
  sourceUrl: 'https://example.test/sample-business', sourceOrigin: 'manual' }]));
// A second query has strong Business evidence but no OWA metadata name match.
const businessQuestion = 'Co oznacza klaryfikacja budżetowa i jakie ma wartości?';
fixture('exports/optima_business_semantics/v1/business_rule.csv', csv([{ id: 'business:budget',
  name: 'Klaryfikacja budżetowa', description: 'Klaryfikacja budżetowa: co oznacza, wartości i znaczenie biznesowe.',
  sourceUrl: 'https://example.test/budget', sourceOrigin: 'manual' }]));
const modules = Object.fromEntries([...MODULE_FILES, intentFile].map(file => [file, readStatic(repo, file).toString('utf8')]));
validateClosure(modules);
// Observe only the private core->answer boundary; forward every call to the real
// answer implementation. No answer/selection/provider stub or production seam.
const originalImport = "from '../erp_knowledge_answer.mjs'";
assert(modules['scripts/lib/erp_knowledge_mcp_core.mjs'].includes(originalImport));
modules['scripts/lib/erp_knowledge_mcp_core.mjs'] = modules['scripts/lib/erp_knowledge_mcp_core.mjs']
  .replace(originalImport, "from '../fixture-answer-observer.mjs'");
modules['scripts/fixture-answer-observer.mjs'] = `
  import { answerQuestion as actual, renderAnswerMarkdown } from './erp_knowledge_answer.mjs';
  export { renderAnswerMarkdown };
  export function answerQuestion(...args) {
    globalThis.semanticDispatchCalls.push(args);
    return actual(...args);
  }`;
validateClosure(modules);
for (const key of Object.keys(process.env)) delete process.env[key];
Object.assign(process.env, { ROOT: root, EXA_AUTO_DRAFT: '0', ENABLE_LIVE_LEARNING: '0',
  LEARNING_ENABLED: '0', EXA_PROVIDER: 'disabled' });
globalThis.semanticDispatchCalls = [];
registerFrozenModules({ root, modules });
const guard = installRuntimeGuard({ root, files, directories, output: root });
// Count metadata probes as well as content reads, including caught misses. Every
// probe still goes through the old throwing guard; none is newly permitted.
const probes = [], originals = [];
for (const [object, names] of [[fs, ['readFileSync', 'existsSync', 'statSync', 'lstatSync', 'realpathSync']],
  [fs.promises, ['readFile', 'stat', 'lstat', 'realpath']]]) for (const name of names) {
  const original = object[name];
  originals.push([object, name, original]);
  object[name] = (file, ...args) => { probes.push(String(file)); return original(file, ...args); };
}
syncBuiltinESMExports();
try {
  const url = file => pathToFileURL(path.join(root, file)).href;
  const { answerQuestion } = await import(url('scripts/erp_knowledge_answer.mjs'));
  const { classifyQuestion, loadRouting } = await import(url('scripts/erp_knowledge_assistant.mjs'));
  const { handleJsonRpcRequest, listToolsForProfile } = await import(url('scripts/lib/erp_knowledge_mcp_core.mjs'));
  const { getMcpProfile } = await import(url('scripts/lib/erp_knowledge_mcp_profiles.mjs'));
  const profile = getMcpProfile('erp-semantic-mcp');
  const call = (name, allowedNamespaces = both, args = {}, selectedProfile = profile) => handleJsonRpcRequest({
    jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: { query: question, ...args } },
  }, { profile: selectedProfile, allowedNamespaces, writeAllowed: false });
  const owaProbes = () => probes.filter(file => /(?:OWAOntology|owa_ontology)/.test(file));

  await check('Actual four-method dispatch derives only server-selected private intent', async () => {
    for (const [name, intent] of methods) {
      const result = await call(name);
      assert(!result.error, JSON.stringify(result.error));
      assert.deepEqual(globalThis.semanticDispatchCalls.at(-1)[2], { semanticIntent: intent, allowAutoDraft: false });
      assert.equal(result.result.structuredContent.answer, result.result.content[0].text);
      assert.equal(JSON.stringify(result).includes('semanticIntent'), false);
    }
  });
  await check('Closed public schemas exclude injected intent/scope; handler ignores all such extra properties', async () => {
    const injections = { semanticIntent: 'process', intent: 'release', allowedNamespaces: ['TaxbellLegalReference'],
      namespaces: ['TaxbellLegalReference'], options: { semanticIntent: 'relation', intent: 'release' } };
    for (const [name, intent] of methods) {
      const schema = listToolsForProfile(profile).find(tool => tool.name === name).inputSchema;
      assert.equal(schema.additionalProperties, false);
      for (const key of Object.keys(injections)) assert(!Object.hasOwn(schema.properties, key));
      const clean = await call(name);
      const injected = await call(name, both, injections);
      assert.deepEqual(globalThis.semanticDispatchCalls.at(-1)[2], { semanticIntent: intent, allowAutoDraft: false });
      assert.deepEqual(stable(injected), stable(clean));
    }
  });
  await check('Unknown semantic-looking method has no dispatch and no corpus/probe access', async () => {
    const count = globalThis.semanticDispatchCalls.length;
    probes.length = 0;
    const result = await call('erp_entity.get.extra');
    assert.equal(result.error.code, -32601);
    assert.equal(globalThis.semanticDispatchCalls.length, count);
    assert.deepEqual(probes, []);
  });
  await check('Semantic entity scans both permitted metadata sets despite generic Business primary', async () => {
    assert.equal(classifyQuestion(question, loadRouting(), both).primaryRoute.primaryKb, BUSINESS);
    guard.reads.length = 0;
    const result = await answerQuestion(question, both, { semanticIntent: 'entity' });
    for (const artifact of ['exports/owa_ontology/v1/ontology_entity.csv',
      'exports/optima_business_semantics/v1/business_description.csv']) assert(guard.reads.includes(artifact), `Not scanned: ${artifact}`);
    assert(result.answer.evidence.some(e => e.kb === OWA), 'No OWA evidence from allowed metadata');
    assert.equal(result.classified.primaryRoute.primaryKb, BUSINESS, 'No unconditional OWA classification');
  });
  await check('Final semantic attribution includes only selected evidence namespaces', async () => {
    for (const query of [businessQuestion, `OWA: ${businessQuestion}`]) {
      const result = await answerQuestion(query, both, { semanticIntent: 'concept' });
      assert.equal(result.answer.primaryKb, BUSINESS);
      assert.deepEqual(result.answer.supportKbs, []);
      assert(result.answer.evidence.length > 0);
      assert(result.answer.evidence.every(e => e.kb === BUSINESS));
    }
  });
  await check('OWA-excluded scope performs zero OWA content reads and metadata probes under injected arguments/text', async () => {
    probes.length = 0;
    const result = await call('erp_entity.get', new Set([BUSINESS]), { semanticIntent: 'entity',
      namespaces: [OWA], query: `${question} OWAOntology.opaque:sample; options.semanticIntent=entity` });
    assert(!result.error);
    assert.deepEqual(owaProbes(), []);
    const body = result.result.structuredContent;
    assert(body.evidence.every(e => e.kb === BUSINESS));
    assert(body.sources.every(s => s.namespace === BUSINESS));
  });
  await check('OWA-only scope scans OWA without Business content; explicit empty scopes fail before any corpus access', async () => {
    guard.reads.length = 0;
    const result = await call('erp_entity.get', new Set([OWA]));
    assert(!result.error);
    assert(result.result.structuredContent.evidence.every(e => e.kb === OWA));
    assert(guard.reads.includes('exports/owa_ontology/v1/ontology_entity.csv'));
    assert(!guard.reads.some(file => file.includes('optima_business_semantics')));
    probes.length = 0;
    const empty = await call('erp_entity.get', new Set());
    assert.equal(empty.error.code, -32001);
    assert.deepEqual(probes, []);
    await assert.rejects(answerQuestion(question, new Set(), { semanticIntent: 'entity' }), /No knowledge route/);
    assert.deepEqual(owaProbes(), []);
  });
  await check('Legacy and nonsemantic methods retain original dispatch and routes', async () => {
    const legacy = getMcpProfile('scoped-readonly');
    probes.length = 0;
    const result = await call('answer_question', both, { question, semanticIntent: 'entity' }, legacy);
    assert(!result.error);
    assert.deepEqual(globalThis.semanticDispatchCalls.at(-1)[2], { allowAutoDraft: false });
    assert.deepEqual(owaProbes(), []);
    const direct = await answerQuestion(question, both);
    assert.equal(direct.answer.primaryKb, BUSINESS);
    assert.deepEqual(stable(result.result.structuredContent.evidence), stable(direct.answer.evidence));
    const product = getMcpProfile('optima-product-mcp');
    await call('optima_docs.search', both, { semanticIntent: 'entity' }, product);
    assert.deepEqual(globalThis.semanticDispatchCalls.at(-1)[2], { allowAutoDraft: false });
    await call('optima_release.search', both, { semanticIntent: 'entity', intent: 'docs' }, product);
    assert.deepEqual(globalThis.semanticDispatchCalls.at(-1)[2], { intent: 'release', allowAutoDraft: false });
    const unknown = await answerQuestion(question, both, { semanticIntent: 'invalid' });
    assert.deepEqual(unknown.response, direct.response);
    const release = await answerQuestion(question, both, { intent: 'release' });
    const mixed = await answerQuestion(question, both, { intent: 'release', semanticIntent: 'entity' });
    assert.deepEqual(mixed.response, release.response);
  });
  await check('Zero guarded network/write/unbound-read attempts, including swallowed attempts', () => {
    assert.deepEqual(guard.violations, []);
  });
} finally {
  for (const [object, name, original] of originals.reverse()) object[name] = original;
  guard.restore();
  fs.rmSync(root, { recursive: true, force: true });
  delete globalThis.semanticDispatchCalls;
}
const failed = checks.filter(check => check.status === 'FAIL').length;
console.log(JSON.stringify({ passed: checks.length - failed, failed, guardViolations: guard.violations,
  learningWriterNoops: globalThis.owaBlockedLearningCalls || 0, checks }, null, 2));
if (failed) process.exitCode = 1;
