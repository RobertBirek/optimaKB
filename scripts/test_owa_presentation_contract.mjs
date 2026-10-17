#!/usr/bin/env node
// Synthetic corpus; both real handler closures run inside the closed runtime guard.
import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BASELINE_SHA256, MODULE_FILES, STATIC_FILES, inspectResponse, installRuntimeGuard, registerFrozenModules, sha256, validateClosure } from './lib/owa_offline_harness.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = fs.mkdtempSync(path.join(repo, '.superpowers/sdd/task2-contract-'));
const sealedCode = '/tmp/opencode/owa-compact-task1-baseline-JxUymw/bundle';
const manifestBytes = fs.readFileSync(path.join(sealedCode, 'manifest.json'));
assert.equal(sha256(manifestBytes), '61e9f3e593df0248262d1911e17379162ee7bb5fecfef456b9ca42c43599c88d');
const baselineFiles = JSON.parse(manifestBytes).files;
const modules = {};
const sourceFingerprints = [];
// Setup reads code only, never the sealed corpus/captures. The old closure is immutable.
for (const file of MODULE_FILES) {
  modules[file] = fs.readFileSync(path.join(repo, file), 'utf8');
  sourceFingerprints.push({ path: file, sha256: sha256(modules[file]), bytes: Buffer.byteLength(modules[file]) });
  if (baselineFiles.some(entry => entry.path === file)) {
    let old = fs.readFileSync(path.join(sealedCode, file), 'utf8');
    assert.equal(sha256(old), baselineFiles.find(entry => entry.path === file)?.sha256, 'sealed code fingerprint: ' + file);
    if (file === 'scripts/erp_knowledge_answer.mjs') {
      assert.equal(old.split("from './lib/learning.mjs'").length, 2);
      // Same precise answer-only writer stub as registerFrozenModules; confidence is real.
      old = old.replace("from './lib/learning.mjs'", "from '../../fixture-learning-writer.mjs'");
    }
    modules['legacy/' + file] = old;
  }
}
validateClosure(Object.fromEntries(MODULE_FILES.map(file => [file, modules[file]])));
// Replace only the external provider boundary in both answer closures. Real
// classification, policy, answer construction, citations and renderers still run.
for (const prefix of ['', 'legacy/']) {
  const file = prefix + 'scripts/erp_knowledge_answer.mjs';
  assert.equal(modules[file].split("from './lib/external_search.mjs'").length, 2);
  modules[file] = modules[file].replace("from './lib/external_search.mjs'", "from './lib/fixture-provider.mjs'");
  modules[prefix + 'scripts/lib/fixture-provider.mjs'] = `
    export { buildExternalCitationBlock } from './external_search.mjs';
    import { searchExternalSources as disabledSearch } from './external_search.mjs';
    export async function searchExternalSources(request) {
      if (!globalThis.owaMockProvider) return disabledSearch(request);
      globalThis.owaProviderCalls.push(request);
      return { ok: true, provider: 'in-process-fixture', resultCount: globalThis.owaMockProvider.length, results: globalThis.owaMockProvider };
    }
    export function recordExternalFallback(event) { globalThis.owaFallbackEvents.push(event); }
    export function createExternalKnowledgeDraft() { throw Error('Unexpected auto draft'); }
  `;
}
// registerFrozenModules supplies this same answer-only writer stub at load time.
modules['fixture-learning-writer.mjs'] = "export { computeConfidenceScore, CONFIDENCE_LOW_THRESHOLD } from './scripts/lib/learning.mjs'; export function recordLearningGap() { globalThis.owaBlockedLearningCalls = (globalThis.owaBlockedLearningCalls || 0) + 1; return null; }";
validateClosure(modules);
const files = new Map(), directories = new Set([root]);
function fixture(file, bytes) {
  const absolute = path.join(root, file);
  files.set(absolute, Buffer.from(bytes));
  for (let dir = path.dirname(absolute); dir !== root; dir = path.dirname(dir)) directories.add(dir);
}
const csv = rows => {
  const keys = [...new Set(rows.flatMap(Object.keys))];
  return [keys, ...rows.map(row => keys.map(k => row[k] || ''))]
    .map(row => row.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\r\n') + '\r\n';
};
fixture('docs/reference/ERP_Knowledge_Assistant_Routing.json', fs.readFileSync(path.join(repo, 'docs/reference/ERP_Knowledge_Assistant_Routing.json')));
fixture('docs/reference/ERP_KB_Dashboard_KB_Registry.json', '{"knowledgeBases":[]}');
for (const file of ['OWAOntology.schema', 'OWAOntology.seed.md', 'OWA_Order_to_Cash_v1.md',
  'ComarchOptimaBusinessSemantics.schema', 'ComarchCommunityNews.seed.md', 'ComarchCommunityNews.audit.md']) fixture('docs/reference/' + file, '');
for (const [directory, names] of [
  ['owa_ontology', ['ontology_field', 'ontology_relation', 'workflow_pattern', 'chunk']],
  ['optima_business_semantics', ['code_meaning', 'business_rule', 'business_domain']],
  ['community_news', ['reference_document', 'news_topic', 'community_attachment']],
]) for (const name of names) fixture(`exports/${directory}/v1/${name}.csv`, 'id,content\n');
fixture('data/dashboard/automation/provider_secrets.json', '{}'); // synthetic empty provider, never a real secret read
fixture('exports/owa_ontology/v1/ontology_entity.csv', csv([{ id: 'synthetic-owner', canonicalName: 'OWAOntology.SyntheticCard', aliases: 'SyntheticCard',
  description: '## Pola\nReady_Flag: identyfikator, wyłącznie w buforze.\n\n## Mapowanie pól\n| Pole | SQL |\n|---|---|\n| Ready_Flag | Syn_Ready |\nNie oznacza potwierdzenia API.\n\n## Reguły pól\nReady_Flag: UNKNOWN — nie zgaduj wartości.\n\n## Dalsze pola\nReady_Flag: tylko warunkowo.\n\n## Ostatnie pole\nReady_Flag: bez potwierdzenia wykonania.',
  privateCandidate: 'PRIVATE_CANDIDATE_ROW_SENTINEL' }]));
fixture('exports/optima_business_semantics/v1/business_description.csv', csv([{ id: 'semantic', title: 'Znaczenie semantyki biznesowej',
  content: 'Znaczenie semantyki biznesowej: definicje encji procesów i reguł. '.repeat(20) }]));
fixture('exports/community_news/v1/chunk.csv', csv([{ id: 'release', title: 'Optima 2026.2.1 wydanie',
  sourceUrl: 'https://example.test/release', sourceOrigin: 'official', publishedAt: '2026-01-29',
  content: '## Wydanie\nOptima 2026.2.1 dostępność aktualizacja nowości wydania. '.repeat(20) }]));

process.env.ROOT = root;
process.env.EXA_AUTO_DRAFT = '0';
process.env.ENABLE_LIVE_LEARNING = '0';
process.env.LEARNING_ENABLED = '0';
delete process.env.EXA_API_KEY;
delete process.env.EXA_MCP_COMMAND;
registerFrozenModules({ root, modules });
const guard = installRuntimeGuard({ root, output: root, files, directories });
const NativeDate = Date;
globalThis.Date = class extends NativeDate {
  constructor(...args) { super(...(args.length ? args : ['2026-10-15T12:00:00Z'])); }
  static now() { return NativeDate.parse('2026-10-15T12:00:00Z'); }
};
const load = file => import(pathToFileURL(path.join(root, file)).href);
const current = await load('scripts/erp_knowledge_answer.mjs');
const legacy = await load('legacy/scripts/erp_knowledge_answer.mjs');
const handler = await load('scripts/lib/erp_knowledge_mcp_core.mjs');
const oldHandler = await load('legacy/scripts/lib/erp_knowledge_mcp_core.mjs');
const { parseOwaQuestion } = await load('scripts/lib/owa_query_context.mjs');
const { getMcpProfile } = await load('scripts/lib/erp_knowledge_mcp_profiles.mjs');
const { semanticIntentForTool } = await load('scripts/lib/semantic_request_intent.mjs');
const scope = new Set(['OWAOntology', 'ComarchOptimaBusinessSemantics']);
const query = 'OWAOntology.SyntheticCard mapowanie pól `Ready_Flag`';
const round = value => JSON.parse(JSON.stringify(value));
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) if ('value' in descriptor) freeze(descriptor.value);
  return Object.freeze(value);
}
async function dispatch(api, tool, question = query, profile = 'erp-semantic-mcp', allowedNamespaces = scope) {
  return round(await api.handleJsonRpcRequest({ jsonrpc: '2.0', id: tool, method: 'tools/call', params: { name: tool,
    arguments: { query: question, as_of: '2026-10-15', correlation_id: 'task2-fixture', limit: 5 } } },
  { profile: getMcpProfile(profile), allowedNamespaces, writeAllowed: false }));
}
after(() => {
  globalThis.Date = NativeDate;
  guard.writeOutput('source-binding.json', JSON.stringify({ sourceFingerprints, sealedManifestHash: sha256(manifestBytes),
    substitutions: ['answer-only learning writer', 'external provider boundary in both answer closures'], violations: guard.violations }, null, 2) + '\n');
  guard.restore();
  if (process.argv.includes('--retain-evidence')) console.log('Fallback parity evidence: ' + root);
  else fs.rmSync(root, { recursive: true, force: true });
});

test('candidate inventory adds formatter and explicit semantic closure, retaining static allowlist/baseline SHA', () => {
  assert.deepEqual([...MODULE_FILES].sort(), [...baselineFiles.filter(f => f.path.startsWith('scripts/')).map(f => f.path),
    'scripts/lib/owa_answer_presentation.mjs', ...['semantic_request_intent', 'semantic_catalog', 'semantic_requirements', 'semantic_evidence'].map(n => `scripts/lib/${n}.mjs`)].sort());
  assert.deepEqual([...STATIC_FILES].sort(), baselineFiles.filter(f => !f.path.startsWith('scripts/')).map(f => f.path).sort());
  assert.equal(BASELINE_SHA256, '4124f75b330142b6894637380e90589c78dec24362af721eedc45f57276221d2');
});
for (const tool of ['erp_concept.search', 'erp_entity.get', 'erp_process.explain', 'erp_relation.list']) {
  test(`${tool}: public contract preserved with attributable semantic selection and complete visible facts`, async () => {
    const old = await dispatch(oldHandler, tool), result = await dispatch(handler, tool);
    assert(!old.error && !result.error);
    const structured = result.result.structuredContent, before = old.result.structuredContent;
    assert.equal(inspectResponse(old).units.length, 3, 'the actual old domain capture remains independently auditable');
    const selected = new Set(['answer', 'evidence', 'sources', 'evidenceAssessment', 'owaCoverage', 'answerNotes', 'extracts', 'omissions']);
    for (const key of Object.keys(before).filter(k => !selected.has(k))) assert.deepEqual(structured[key], before[key], key);
    const { answer } = await current.answerQuestion(query, scope, { semanticIntent: semanticIntentForTool(tool) });
    assert(answer.extracts.length > 0 && answer.omissions.length > 0, 'exercise actual selected/omitted evidence');
    assert.deepEqual(structured.extracts, round(answer.extracts));
    assert.deepEqual(structured.omissions, round(answer.omissions));
    assert.equal(structured.answer, result.result.content.filter(p => p.type === 'text').map(p => p.text).join('\n'));
    assert(!JSON.stringify(result).includes('PRIVATE_CANDIDATE_ROW_SENTINEL'));
    assert(structured.answer.includes('Ready_Flag: UNKNOWN — nie zgaduj wartości.'));
    assert.equal(structured.owaCoverage.status, 'unknown');
    assert(structured.owaCoverage.requirements.every(r => r.ownerId === 'synthetic-owner' && r.fieldName === 'Ready_Flag' && r.covered));
    for (const unit of structured.extracts) assert(structured.answer.includes(unit.text));
    assert.equal(inspectResponse(result).units.length, structured.extracts.length);
  });
  test(`${tool}: real dispatch uses compact OWA layout`, async () => {
    const result = await dispatch(handler, tool);
    assert.match(result.result.structuredContent.answer, /^Odpowiedź:\n/);
    assert.match(result.result.structuredContent.answer, /\n\nŹródła:\n- \[S1\]/);
  });
}
test('render delegation preserves root and nested public/private data on frozen real answers', async () => {
  const { answer } = await current.answerQuestion(query, scope);
  const before = round(answer);
  Object.defineProperty(answer, 'privateCandidate', { get() { throw new Error('private root accessed'); } });
  freeze(answer);
  const markdown = current.renderAnswerMarkdown(answer);
  assert.deepEqual(round(answer), before);
  assert.equal(current.renderAnswerMarkdown(answer), markdown);
  for (const unit of before.extracts) assert(markdown.includes(unit.text));
  const oldAnswer = (await legacy.answerQuestion(query, scope)).answer;
  assert.deepEqual(before, round(oldAnswer), 'renderer integration cannot change selection or coverage');
});
test('independent audit accepts the actual full legacy renderer with public arrays and rejects a trailing unit', async () => {
  const { answer } = await legacy.answerQuestion(query, scope);
  const markdown = legacy.renderAnswerMarkdown(answer);
  const response = { result: { content: [{ type: 'text', text: markdown }], structuredContent: { ...round(answer), answer: markdown } } };
  assert.equal(inspectResponse(response).units.length, answer.extracts.length);
  response.result.content[0].text += '\n\nUnbound final condition.';
  response.result.structuredContent.answer = response.result.content[0].text;
  assert.throws(() => inspectResponse(response), /body|framing|unbound/);
});
for (const [tool, question, profile, scope] of [
  ['erp_entity.get', 'Znaczenie semantyki biznesowej encji procesów i reguł', 'erp-semantic-mcp', new Set(['ComarchOptimaBusinessSemantics'])],
  ['optima_release.search', 'Optima 2026.2.1 dostępność aktualizacja nowości wydania', 'optima-product-mcp', new Set(['ComarchCommunityNews'])],
]) test(`${tool}: non-OWA contract and complete source evidence; release retains sealed byte parity`, async () => {
  const old = await dispatch(oldHandler, tool, question, profile, scope);
  const result = await dispatch(handler, tool, question, profile, scope);
  assert(!result.error && result.result.structuredContent.evidence.length);
  assert(!Object.hasOwn(result.result.structuredContent, 'owaCoverage'));
  if (tool === 'optima_release.search') assert.equal(JSON.stringify(result), JSON.stringify(old));
  else {
    const body = result.result.structuredContent, before = old.result.structuredContent;
    assert(body.answer.includes('Znaczenie semantyki biznesowej: definicje encji procesów i reguł. '.repeat(20).trim()));
    assert(body.sources.some(s => s.kind === 'local_artifact'));
    for (const key of ['sourceId', 'uri', 'locator', 'contentHash']) assert.equal(body.evidence[0][key], before.evidence[0][key]);
    assert.equal(body.evidence[0].hits[0].snippet, '', 'no lossy second fact channel');
    assert.deepEqual(body.retrieval, before.retrieval);
  }
});
test('missing OWA evidence uses only the precise no-op learning writer and no runtime escape', async () => {
  const before = globalThis.owaBlockedLearningCalls || 0;
  await dispatch(handler, 'erp_process.explain', 'OWA proces OWA_QA_NONEXISTENT_SYNTHETIC_987654');
  assert.equal(globalThis.owaBlockedLearningCalls, before + 1);
  assert.deepEqual(guard.violations, []);
  assert(guard.reads.length > 0);
  assert(guard.reads.every(file => files.has(path.join(root, file))));
});
test('real compact and legacy zero-extract clarifications pass the whole-envelope audit', async () => {
  for (const question of ['OWA proces OWA_QA_NONEXISTENT_SYNTHETIC_987654', 'OWA jaki jest stan dokumentu?']) {
    for (const api of [oldHandler, handler]) {
      const result = await dispatch(api, 'erp_process.explain', question);
      assert.equal(inspectResponse(result).units.length, 0);
      assert(['unknown', 'ambiguous'].includes(result.result.structuredContent.owaCoverage.status));
    }
  }
  assert.deepEqual(guard.violations, []);
});
for (const [layout, renderer] of [['compact', current.renderAnswerMarkdown], ['legacy', legacy.renderAnswerMarkdown]]) {
  const fixtures = async count => {
    const { answer } = await legacy.answerQuestion(query, scope);
    const body = round(answer);
    body.extracts = Array.from({ length: count }, (_, i) => ({ ...body.extracts[0], text: `Complete conditional unit ${i + 1}; only after verification.` }));
    const markdown = renderer(body);
    return { result: { content: [{ type: 'text', text: markdown }], structuredContent: { ...body, answer: markdown } } };
  };
  const replaceLabels = (response, labels) => {
    let index = 0;
    const markdown = response.result.structuredContent.answer.replace(/^\[S1\]/gm, () => `[${labels[index++]}]`);
    response.result.content[0].text = response.result.structuredContent.answer = markdown;
    return response;
  };
  test(`I1 ${layout}: noncanonical source aliases are refused even below the unit cap`, async () => {
    const response = await fixtures(1);
    assert.equal(inspectResponse(response).units.length, 1);
    assert.throws(() => inspectResponse(replaceLabels(response, ['S01'])), /canonical.*source|source.*label/);
  });
  test(`I1 ${layout}: four units bound to one source cannot split their budget across label aliases`, async () => {
    assert.equal(inspectResponse(await fixtures(3)).units.length, 3);
    const canonicalFour = await fixtures(4);
    assert.throws(() => inspectResponse(canonicalFour), /section budget/);
    const response = replaceLabels(await fixtures(4), ['S1', 'S01', 'S001', 'S0001']);
    assert.throws(() => inspectResponse(response), /canonical.*source|source.*label|section budget/);
    if (layout === 'legacy') {
      delete response.result.structuredContent.extracts;
      delete response.result.structuredContent.omissions;
      assert.throws(() => inspectResponse(response), /canonical.*source|source.*label|section budget/);
    }
  });
}

for (const [kind, question] of [
  ['no-local', 'Order-to-Cash aktualne zasady procesu'],
  ['mixed', 'Order-to-Cash aktualizacja zasady procesu Ready_Flag SyntheticCard'],
  ['non-OWA', 'Znaczenie semantyki biznesowej aktualizacja zasady encji procesów i reguł'],
]) test(`real implicit fallback (${kind}): sealed/current answer and complete external presentation parity`, async () => {
  const provider = [
    { title: 'Qualified external rule', url: 'https://example.test/rules/full?version=2&scope=all#approval', sourceType: 'official',
      publishedDate: '2026-10-15T09:10:11+02:00', snippet: 'Only after manual approval.\r\n\r\n| State | UNKNOWN |\r\nNever infer successful execution.  ' },
    { title: 'Historical condition', url: 'https://example.test/rules/old', sourceType: 'community', publishedDate: '2024-01-02',
      snippet: 'CONFLICT: this version is unverified; do not infer an unconditional rule.' },
  ];
  globalThis.owaMockProvider = freeze(provider);
  globalThis.owaProviderCalls = []; globalThis.owaFallbackEvents = [];
  try {
    assert.equal(parseOwaQuestion(question).explicitOwa, false);
    const before = (await legacy.answerQuestion(question, scope)).answer;
    const answer = (await current.answerQuestion(question, scope)).answer;
    assert.equal(globalThis.owaProviderCalls.length, 2, 'actual answerQuestion must call the provider in each closure');
    assert.equal(globalThis.owaFallbackEvents.length, 2, 'successful production fallback must reach its telemetry boundary');
    assert.deepEqual(round(answer), round(before), 'routing, fallback and all pre-render fields unchanged');
    assert.equal(answer.externalSearch.used, true);
    assert.equal(answer.externalSearch.provider, 'in-process-fixture');
    assert.equal(answer.externalSearch.reason, kind === 'no-local' ? 'weak_local_evidence' : 'recency_question');
    if (kind !== 'non-OWA') assert.equal(answer.primaryKb, 'OWAOntology');
    assert.equal(Boolean(answer.owaCoverage), kind !== 'non-OWA');
    assert.equal(Boolean(answer.evidence.length), kind !== 'no-local');
    if (kind === 'mixed') assert(answer.extracts.length, 'mixed case includes real selected local units');
    const snapshot = round(answer), oldMarkdown = legacy.renderAnswerMarkdown(before);
    freeze(answer);
    const markdown = current.renderAnswerMarkdown(answer);
    assert.deepEqual(round(answer), snapshot, 'deep frozen real answer remains intact');
    const externalBlock = oldMarkdown.slice(oldMarkdown.indexOf('Zewnętrzne dowody live:'), oldMarkdown.indexOf('\n\nPolecane artefakty:'));
    assert(markdown.includes(externalBlock), 'full sealed legacy block parity, not keyword matching');
    for (const item of provider) for (const key of ['title', 'url', 'sourceType', 'publishedDate', 'snippet']) assert(markdown.includes(item[key]), key);
    assert(markdown.includes(answer.note)); assert(markdown.includes('Uwaga o świeżości: ' + answer.freshnessNote));
    const backendLine = oldMarkdown.split('\n').find(line => line.startsWith('Źródło: '));
    assert(markdown.includes(backendLine));
    for (const unit of answer.extracts) assert(markdown.includes(unit.text));
    if (kind === 'non-OWA') assert.equal(markdown, oldMarkdown, 'complete non-OWA fallback bytes');
    else for (const [body, md] of [[before, oldMarkdown], [answer, markdown]]) {
      const response = { result: { content: [{ type: 'text', text: md }], structuredContent: { ...round(body), answer: md } } };
      assert.equal(inspectResponse(response).units.length, body.extracts.length);
    }
    const oldRpc = await dispatch(oldHandler, 'erp_process.explain', question);
    const rpc = await dispatch(handler, 'erp_process.explain', question);
    const semanticAnswer = (await current.answerQuestion(question, scope, { semanticIntent: 'process' })).answer;
    const semanticMarkdown = current.renderAnswerMarkdown(semanticAnswer);
    assert.equal(rpc.result.structuredContent.answer, semanticMarkdown);
    for (const item of provider) for (const key of ['title', 'url', 'sourceType', 'publishedDate', 'snippet']) assert(semanticMarkdown.includes(item[key]), key);
    for (const key of Object.keys(oldRpc.result.structuredContent).filter(key => !['answer', 'evidence', 'sources', 'evidenceAssessment', 'owaCoverage', 'answerNotes', 'extracts', 'omissions'].includes(key)))
      assert.deepEqual(rpc.result.structuredContent[key], oldRpc.result.structuredContent[key], key);
    if (kind === 'non-OWA') {
      const body = rpc.result.structuredContent, before = oldRpc.result.structuredContent;
      assert(!body.owaCoverage);
      assert(body.answer.includes('Znaczenie semantyki biznesowej: definicje encji procesów i reguł. '.repeat(20).trim()));
      for (const key of ['sourceId', 'uri', 'locator', 'contentHash']) assert.equal(body.evidence[0][key], before.evidence[0][key]);
    }
    assert.deepEqual(guard.violations, []);
    guard.writeOutput(`${kind}.json`, JSON.stringify({ question, answer: round(answer), before: round(before), oldMarkdown, markdown,
      oldRpc, rpc, providerCalls: globalThis.owaProviderCalls, fallbackEvents: globalThis.owaFallbackEvents,
      externalBlock, oldExternalBlockHash: sha256(externalBlock), currentExternalBlockHash: sha256(markdown.slice(markdown.indexOf('Zewnętrzne dowody live:'),
        kind === 'non-OWA' ? markdown.indexOf('\n\nPolecane artefakty:') : markdown.indexOf('\n\nŹródła lokalne nie są'))),
      violations: guard.violations }, null, 2) + '\n');
  } finally { delete globalThis.owaMockProvider; }
});
