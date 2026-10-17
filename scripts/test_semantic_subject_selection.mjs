#!/usr/bin/env node
// Synthetic only: real handler/answer/scanner/renderer, closed virtual I/O.
import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MODULE_FILES, STATIC_FILES, readStatic, registerFrozenModules, installRuntimeGuard,
  validateClosure, inspectResponse } from './lib/owa_offline_harness.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
const root = fs.mkdtempSync('/tmp/opencode/semantic-selection-');
const files = new Map(), directories = new Set([root]);
function put(relative, bytes) {
  const file = path.join(root, relative);
  files.set(file, Buffer.from(bytes));
  for (let p = path.dirname(file); p.startsWith(root); p = path.dirname(p)) {
    directories.add(p); if (p === root) break;
  }
}
function csv(rows) {
  const keys = [...new Set(rows.flatMap(Object.keys))];
  return [keys, ...rows.map(row => keys.map(key => row[key] ?? ''))].map(row =>
    row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n') + '\n';
}
for (const file of STATIC_FILES) put(file, file.endsWith('.csv') ? 'id\n' : '');
for (const file of ['docs/reference/ERP_Knowledge_Assistant_Routing.json', 'docs/reference/ERP_KB_Dashboard_KB_Registry.json']) put(file, readStatic(repo, file));
const OWA = 'OWAOntology', BUSINESS = 'ComarchOptimaBusinessSemantics';
const artifact = type => `exports/owa_ontology/v1/${type}.csv`;
const owners = [
  { id: 'opaque:amber', name: 'Karta bursztynowa', canonicalName: 'Karta bursztynowa', mainTable: 'CDN.AmberCards',
    description: '## Identyfikatory\nPK: Amber_Key; Status: do potwierdzenia; tylko identyfikacja lokalna.\n\n## Pola\n| Pole | Typ | Status | Uwagi |\n| --- | --- | --- | --- |\n| Amber_Mode | int | UNKNOWN | Słownik nieznany; nie wyprowadzaj kodów z SQL. |' },
  { id: 'opaque:grove', name: 'Grupa leśna', canonicalName: 'Grupa leśna', mainTable: 'CDN.GroveGroups',
    description: '## Identyfikatory\nPK: Grove_Key; Status: DRAFT.\n\n' + Array.from({ length: 7 }, (_, i) => `## Reguły ${i}\nGrupa leśna: klucz relacja i ograniczenia reguł biznesowych. ${'reguła '.repeat(25)}`).join('\n\n') },
  { id: 'opaque:violet', name: 'Rejestr fiołkowy', canonicalName: 'Rejestr fiołkowy', mainTable: 'CDN.VioletBook',
    description: '## Identyfikatory\nPK: Violet_Number; Status: DRAFT; bez automatycznego nadawania.' },
  { id: 'opaque:mist', name: 'Zbiór mglisty', canonicalName: 'Zbiór mglisty', mainTable: 'CDN.MistSet',
    description: '## Identyfikatory\nPK: Mist_Number; Status: DRAFT.' },
  { id: 'opaque:original', name: 'Zapis bazowy (JRX)', canonicalName: 'Zapis bazowy (JRX)', classification: 'dokument', description: 'Symbol: JRX; Klasyfikacja: dokument; Status: DRAFT.' },
  { id: 'opaque:revision', name: 'Zmiana zapisu (JRXR)', canonicalName: 'Zmiana zapisu (JRXR)', classification: 'korekta', description: 'Symbol: JRXR; Klasyfikacja: korekta; Status: DRAFT.' },
];
const relations = [
  { id: 'edge:amber-grove', sourceEntityRefId: 'opaque:amber', targetEntityRefId: 'opaque:grove', predicate: 'belongsTo', cardinality: 'N:1', relationType: 'logical', joinCondition: 'Amber_Group = Grove_Key', status: 'do potwierdzenia', description: 'Powiązanie logiczne. Formalny FK nie został potwierdzony; wymaga weryfikacji katalogu SQL, nie dowodzi wykonania procesu.' },
  { id: 'edge:violet-mist', sourceEntityRefId: 'opaque:violet', targetEntityRefId: 'opaque:mist', predicate: 'groups', cardinality: 'N:1', relationType: 'logical', joinCondition: 'Violet_Set = Mist_Number', status: 'DRAFT' },
];
put(artifact('ontology_entity'), csv(owners)); put(artifact('ontology_relation'), csv(relations));
put(artifact('workflow_pattern'), csv([{ id: 'flow:revision', workflowName: 'Zmiana zapisu do bazy', sourceEntityRefId: 'opaque:revision', targetEntityRefId: 'opaque:original', mode: 'READ', status: 'DRAFT', description: 'JRXR → JRX → JRXR: ścieżka korekty do oryginału i powrotu; tylko dla zgodnych zapisów.' }]));
put('exports/optima_business_semantics/v1/business_description.csv', csv([{ id: 'business:reserve', name: 'Rezerwa szafirowa', description: 'Rezerwa szafirowa oznacza wyodrębnioną pulę środków. Dotyczy budżetu, nie identyfikatora rekordu.', sourceUrl: 'https://example.test/reserve', sourceOrigin: 'manual', publishedAt: '2026-09-03' }]));
const modules = Object.fromEntries([...new Set([...MODULE_FILES, ...['semantic_request_intent', 'semantic_catalog', 'semantic_requirements'].map(n => `scripts/lib/${n}.mjs`)])].map(file => [file, readStatic(repo, file).toString('utf8')]));
// Provider boundary only; no answer facts, routing or source selection replaced.
modules['scripts/lib/external_search.mjs'] = `
export async function searchExternalSources() { globalThis.semanticProviderCalls = (globalThis.semanticProviderCalls || 0) + 1; return {ok:true,provider:'fixture',resultCount:1,results:[{title:'External reference',url:'https://example.test/full-reference',publishedDate:'2026-09-11',sourceType:'official',snippet:'External beginning. ' + 'Full external qualification. '.repeat(80) + 'ONLY IF independently checked.'}]}; }
export function buildExternalCitationBlock() { return ''; }
export function recordExternalFallback() {}
export function getExternalSearchStatus() { return {enabled:true}; }
export function createExternalKnowledgeDraft() { throw new Error('unexpected draft'); }
`;
validateClosure(modules);
for (const key of Object.keys(process.env)) delete process.env[key];
Object.assign(process.env, { ROOT: root, EXA_AUTO_DRAFT: '0', ENABLE_LIVE_LEARNING: '0', LEARNING_ENABLED: '0' });
registerFrozenModules({ root, modules });
const guard = installRuntimeGuard({ root, output: root, files, directories });
const load = file => import(pathToFileURL(path.join(root, file)).href);
const { handleJsonRpcRequest } = await load('scripts/lib/erp_knowledge_mcp_core.mjs');
const { getMcpProfile } = await load('scripts/lib/erp_knowledge_mcp_profiles.mjs');
const { answerQuestion, renderAnswerMarkdown } = await load('scripts/erp_knowledge_answer.mjs');
const { owaUnitsForRow } = await load('scripts/lib/owa_evidence.mjs');
const { parseOwaQuestion } = await load('scripts/lib/owa_query_context.mjs');
const scope = new Set([OWA, BUSINESS]);
async function call(tool, query, allowedNamespaces = scope) {
  const rpc = await handleJsonRpcRequest({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: tool, arguments: { query, limit: 5 } } },
    { profile: getMcpProfile('erp-semantic-mcp'), allowedNamespaces, writeAllowed: false });
  assert(!rpc.error && !rpc.result?.isError, JSON.stringify(rpc));
  assert.equal(rpc.result.structuredContent.answer, rpc.result.content[0].text);
  // Domain envelopes expose additive extracts only on the OWA branch.
  if (rpc.result.structuredContent.owaCoverage && rpc.result.structuredContent.retrieval.backend === 'local_artifacts') inspectResponse(rpc);
  return rpc.result.structuredContent;
}
for (const [x, y, key] of [['Karta bursztynowa', 'Grupa leśna', 'Amber_Key'], ['Rejestr fiołkowy', 'Zbiór mglisty', 'Violet_Number']]) {
  test(`primary identifiers survive endpoint rules: ${x}`, async () => {
    const b = await call('erp_entity.get', `${x}: jej klucz i relacja do ${y}, kardynalność`);
    assert(b.answer.includes(key)); assert(b.answer.includes('N:1'));
    assert(!b.owaCoverage.requirements.some(r => r.ownerId === (y === 'Grupa leśna' ? 'opaque:grove' : 'opaque:mist') && r.facet === 'identifiers'));
    assert(b.owaCoverage.requirements.every(r => r.covered), JSON.stringify(b.owaCoverage));
  });
}
test('formal FK/verification qualifications select logical relation and do not request workflow', async () => {
  const b = await call('erp_relation.list', 'Relacja Karta bursztynowa do Grupa leśna: formalny FK i ograniczenia weryfikacji');
  assert(b.answer.includes('Formalny FK nie został potwierdzony'));
  assert(!b.owaCoverage.requestedFacets.includes('workflow'));
  assert(b.owaCoverage.requirements.some(r => r.qualifications?.includes('formalFk') && r.qualifications.includes('verification') && r.covered));
  assert.equal(b.owaCoverage.status, 'unknown');
});
test('explicit comparison reserves identifier facts for both owners', async () => {
  const b = await call('erp_concept.search', 'Porównaj klucze: Karta bursztynowa i Grupa leśna');
  assert(b.answer.includes('Amber_Key') && b.answer.includes('Grove_Key'), JSON.stringify({ extracts: b.extracts, coverage: b.owaCoverage }));
  for (const ownerId of ['opaque:amber', 'opaque:grove']) assert(b.owaCoverage.requirements.some(r => r.ownerId === ownerId && r.facet === 'identifiers' && r.covered));
});
test('source-owned unknown enum without field CSV is specific and never invented', async () => {
  const b = await call('erp_entity.get', 'Karta bursztynowa: słownik wartości pola Amber_Mode');
  assert(b.answer.includes('Amber_Mode') && b.answer.includes('Słownik nieznany'));
  assert.equal(b.owaCoverage.status, 'unknown');
  assert(b.owaCoverage.limitations.some(l => l.fieldNames.includes('Amber_Mode') && l.relevant));
  assert(!/Amber_Mode\s*=\s*[01]/.test(b.answer));
});
test('tentative primary key is named by its source-owned limitation', async () => {
  const b = await call('erp_entity.get', 'Karta bursztynowa: jej klucz');
  assert.equal(b.owaCoverage.status, 'unknown');
  assert(b.owaCoverage.limitations.some(l => l.relevant && l.fieldNames.includes('Amber_Key')));
  assert(b.answer.includes('PK: Amber_Key; Status: do potwierdzenia; tylko identyfikacja lokalna.'));
});
test('oversized primary fact is specifically omitted, not replaced with endpoint rules', async () => {
  const changed = owners.map((r, i) => i ? r : { ...r, description: '## Identyfikatory\nPK: Amber_Key; HIDDEN_PRIMARY ' + 'k'.repeat(4100) });
  put(artifact('ontology_entity'), csv(changed));
  try {
    const b = await call('erp_entity.get', 'Karta bursztynowa: jej klucz i relacja do Grupa leśna');
    assert(!b.answer.includes('HIDDEN_PRIMARY'));
    assert(b.answer.includes('Formalny FK nie został potwierdzony'));
    assert(b.owaCoverage.requirements.some(r => r.ownerId === 'opaque:amber' && r.facet === 'identifiers' && !r.covered));
    assert(b.omissions.some(o => o.reason === 'answer_budget' && o.uncoveredRequirements.some(r => r.ownerId === 'opaque:amber' && r.facet === 'identifiers')));
  } finally { put(artifact('ontology_entity'), csv(owners)); }
});
test('affirmative and unknown field declarations both survive visible selection', async () => {
  const description = '## Pola\nPole: Amber_Mode; Status: DRAFT; nadawanie automatyczne.\n\n## Niewiadome\nPole: Amber_Mode; Status: UNKNOWN; automatyczne nadawanie nadal do potwierdzenia.'
    + Array.from({ length: 3 }, (_, i) => `\n\n## Dodatkowe zastrzeżenie ${i}\nPole: Amber_Mode; Status: UNKNOWN; Amber_Mode wymaga osobnej analizy ${i}.`).join('');
  put(artifact('ontology_entity'), csv(owners.map((r, i) => i ? r : { ...r, description })));
  try {
    const b = await call('erp_entity.get', 'Karta bursztynowa: pole Amber_Mode');
    assert(b.answer.includes('nadawanie automatyczne.') && b.answer.includes('automatyczne nadawanie nadal do potwierdzenia.'));
    assert.equal(b.owaCoverage.status, 'unknown');
    assert(!b.answer.includes('CONFIRMED'));
  } finally { put(artifact('ontology_entity'), csv(owners)); }
});
for (const [statement, status] of [
  ['not CONFIRMED but UNKNOWN', 'unknown'], ['not UNKNOWN but CONFLICT', 'ambiguous'],
  ['not UNKNOWN or CONFLICT', 'covered'], ['nie tylko UNKNOWN, ale CONFLICT', 'ambiguous'],
  ['[x] Amber_Mode: UNKNOWN — oznaczone, nadal nierozstrzygnięte', 'unknown'],
]) test(`actual semantic marker attribution: ${statement}`, async () => {
  const description = `## Enum pola\nPole: Amber_Mode; Status: DRAFT.\n${statement.startsWith('[x]') ? '- ' + statement : 'Amber_Mode: ' + statement + '.'}`;
  put(artifact('ontology_entity'), csv(owners.map((r, i) => i ? r : { ...r, description })));
  try {
    const b = await call('erp_entity.get', 'Karta bursztynowa: enum Amber_Mode');
    assert.equal(b.owaCoverage.status, status, JSON.stringify(b.owaCoverage));
    assert(b.answer.includes(statement));
  } finally { put(artifact('ontology_entity'), csv(owners)); }
});
test('repeated field spelling retains each occurrence owner and facet in actual dispatch', async () => {
  const changed = owners.map((r, i) => i > 1 ? r : { ...r, description: i
    ? '## Pola\nPole: Shared_Mode; Status: UNKNOWN; słownik grupy nieznany.'
    : '## Pola\nPole: Shared_Mode; Status: DRAFT; mapowanie karty.' });
  put(artifact('ontology_entity'), csv(changed));
  try {
    const b = await call('erp_entity.get', 'Karta bursztynowa: pole Shared_Mode; Grupa leśna: enum Shared_Mode');
    assert(b.answer.includes('mapowanie karty.') && b.answer.includes('słownik grupy nieznany.'));
    assert(b.owaCoverage.requirements.some(r => r.ownerId === 'opaque:amber' && r.fieldName === 'Shared_Mode' && r.facet === 'fields' && r.covered));
    assert(b.owaCoverage.requirements.some(r => r.ownerId === 'opaque:grove' && r.fieldName === 'Shared_Mode' && r.facet === 'unknownEnums' && r.covered));
    assert(!b.owaCoverage.requirements.some(r => r.ownerId === 'opaque:amber' && r.facet === 'unknownEnums'));
  } finally { put(artifact('ontology_entity'), csv(owners)); }
});
test('metadata-declared correction symbols preserve positive ordered round trip', async () => {
  const b = await call('erp_process.explain', 'Ścieżka korekty JRXR → JRX → JRXR');
  assert(b.answer.includes('ścieżka korekty do oryginału i powrotu; tylko dla zgodnych zapisów.'));
  assert(b.owaCoverage.requirements.some(r => r.facet === 'workflow' && r.covered));
});
for (const query of ['Ścieżka korekty JRXR → LOST → JRX', 'Ścieżka korekty JRX → JRXR → JRX']) test(`no path bridge or reversal: ${query}`, async () => {
  const b = await call('erp_process.explain', query);
  assert(!b.owaCoverage.requirements.some(r => r.facet === 'workflow' && r.covered));
  assert(b.answer.includes(query.replace('Ścieżka korekty ', '')));
});
test('Business concept remains a legitimate answer without irrelevant OWA coverage', async () => {
  guard.reads.length = 0;
  const b = await call('erp_concept.search', 'Co oznacza Rezerwa szafirowa?');
  assert.equal(b.owaCoverage, undefined);
  assert(b.evidence.every(e => e.kb === BUSINESS));
  assert(b.answer.includes('wyodrębnioną pulę środków'));
  for (const name of [artifact('ontology_entity'), 'exports/optima_business_semantics/v1/business_description.csv']) assert.equal(guard.reads.filter(f => f === name).length, 1);
  const direct = await answerQuestion('Co oznacza Rezerwa szafirowa?', scope, { semanticIntent: 'concept' });
  assert.equal(direct.answer.primaryKb, BUSINESS);
});
for (const query of ['Encja absent:moon: jej klucz', 'Encje opaque:amber i absent:moon: klucze']) test(`identity barrier survives server intent: ${query}`, async () => {
  const before = globalThis.semanticProviderCalls || 0;
  const b = await call('erp_entity.get', query);
  assert.equal(globalThis.semanticProviderCalls || 0, before);
  assert.equal(b.owaCoverage.status, 'unknown'); assert.deepEqual(b.extracts, []);
  assert(!b.answer.includes('Amber_Key')); assert(b.answer.includes('absent:moon'));
});
test('ordinary implicit fallback retains full external URL, date and last qualification', async () => {
  const before = globalThis.semanticProviderCalls || 0;
  const { answer } = await answerQuestion('unrelated ephemeral absent topic', new Set([BUSINESS]), { semanticIntent: 'concept' });
  const text = renderAnswerMarkdown(answer);
  assert.equal(globalThis.semanticProviderCalls, before + 1);
  for (const token of ['https://example.test/full-reference', '2026-09-11', 'ONLY IF independently checked.']) assert(text.includes(token));
  assert(text.includes(answer.externalEvidence[0].snippet));
});
test('implicit weak matched-owner fallback still preserves full external evidence', async () => {
  const before = globalThis.semanticProviderCalls || 0;
  const { answer } = await answerQuestion('Karta bursztynowa aktualizacja jej klucza', scope, { semanticIntent: 'entity' });
  assert.equal(globalThis.semanticProviderCalls, before + 1);
  const text = renderAnswerMarkdown(answer);
  assert(text.includes(answer.externalEvidence[0].snippet));
  assert(text.includes('Amber_Key') && text.includes('do potwierdzenia'));
});
test('qualified source-owned enum stays attributable without a field CSV', async () => {
  const b = await call('erp_entity.get', 'Karta bursztynowa: słownik wartości pola CDN.AmberCards.Amber_Mode');
  assert(b.answer.includes('Słownik nieznany'));
  assert(b.owaCoverage.requirements.some(r => r.fieldName === 'CDN.AmberCards.Amber_Mode' && r.covered));
  assert.equal(b.owaCoverage.status, 'unknown');
});
test('Business title/content records resolve as concepts without relying on descriptions', async () => {
  const file = 'exports/optima_business_semantics/v1/business_rule.csv';
  put(file, csv([{ id: 'business:velvet', title: 'Plan aksamitny', content: 'Plan aksamitny określa miesięczny przydział. '.repeat(15) }]));
  try {
    const b = await call('erp_concept.search', 'Co oznacza Plan aksamitny?', new Set([BUSINESS]));
    assert(b.evidence.length > 0 && b.evidence.every(e => e.kb === BUSINESS));
    assert(b.answer.includes('określa miesięczny przydział'));
    assert.equal(b.owaCoverage, undefined);
    const direct = (await answerQuestion('Co oznacza Plan aksamitny?', new Set([BUSINESS]), { semanticIntent: 'concept' })).answer;
    assert(direct.extracts.some(u => u.text === 'Plan aksamitny określa miesięczny przydział. '.repeat(15).trim()));
    assert(direct.sources.some(s => s.kind === 'local_artifact' && s.records.some(r => r.recordId === 'business:velvet')));
  } finally { put(file, 'id\n'); }
});
test('mixed-namespace comparison keeps both explicit subjects visibly required', async () => {
  const b = await call('erp_concept.search', 'Porównaj Karta bursztynowa i Rezerwa szafirowa');
  assert(b.answer.includes('wyodrębnioną pulę środków'));
  assert(b.owaCoverage.requirements.some(r => r.namespace === BUSINESS && r.ownerId === 'business:reserve' && r.covered));
  assert(b.owaCoverage.requirements.some(r => r.namespace === OWA && r.ownerId === 'opaque:amber' && r.covered));
});
test('unshown Business main subject stays insufficient and cannot claim a used source', async () => {
  const file = 'exports/optima_business_semantics/v1/business_rule.csv';
  put(file, csv([{ id: 'business:velvet', title: 'Plan aksamitny', content: 'Plan aksamitny: HIDDEN_BUSINESS ' + 'a'.repeat(4100) }]));
  try {
    const solo = (await answerQuestion('Co oznacza Plan aksamitny?', scope, { semanticIntent: 'concept' })).answer;
    assert.equal(solo.owaCoverage, undefined);
    assert.equal(solo.evidenceAssessment.status, 'insufficient_evidence');
    assert(!renderAnswerMarkdown(solo).includes('HIDDEN_BUSINESS'));
    assert(solo.omissions.some(o => o.uncoveredRequirements.some(r => r.ownerId === 'business:velvet' && r.facet === 'overview')));
    const mixed = (await answerQuestion('Porównaj Plan aksamitny i Karta bursztynowa', scope, { semanticIntent: 'concept' })).answer;
    assert.equal(mixed.primaryKb, OWA);
    assert(!mixed.supportKbs.includes(BUSINESS));
    assert(mixed.owaCoverage.requirements.some(r => r.ownerId === 'business:velvet' && !r.covered));
  } finally { put(file, 'id\n'); }
});
test('missing exact identity blocks provider even with OWA excluded', async () => {
  const before = globalThis.semanticProviderCalls || 0;
  const b = await call('erp_entity.get', 'Encja absent:moon: klucz aktualizacja', new Set([BUSINESS]));
  assert.equal(globalThis.semanticProviderCalls || 0, before);
  assert.equal(b.owaCoverage, undefined);
  assert.deepEqual(b.evidence, []);
});
for (const reverse of [false, true]) for (const longIsRelevant of [false, true]) {
  for (const comparison of [false, true]) test(`review I1 actual reservation: reverse=${reverse}, longRelevant=${longIsRelevant}, comparison=${comparison}`, async () => {
    const primary = 'owner:cedar', peer = 'owner:fern';
    const keys = [
      { id: primary, name: 'Karta cedrowa', canonicalName: 'Karta cedrowa', description: '## Identyfikatory\nPK: Cedar_Key; Status: DRAFT; tylko dla zgodnych zapisów.' },
      { id: peer, name: 'Grupa paprociowa', canonicalName: 'Grupa paprociowa', description: '## Identyfikatory\nPK: Fern_Sequence; Status: DRAFT; tylko dla zgodnych zapisów.' },
    ].map(r => ({ ...r, description: r.description + 'k'.repeat(448 - r.description.length) }));
    const edge = { sourceEntityRefId: primary, targetEntityRefId: peer, predicate: 'tie', cardinality: 'N:1', status: 'DRAFT' };
    const padRelation = (id, size, relevant) => {
      const fields = { id, ...edge, description: (relevant ? 'Relacja kardynalność. ' : '') + 'Tylko dla zgodnych zapisów.' };
      const text = owaUnitsForRow(parseOwaQuestion('relacja kardynalność'), { fields, artifact: artifact('ontology_relation') })[0].text;
      assert(text.length <= size);
      return { ...fields, description: fields.description + 'r'.repeat(size - text.length) };
    };
    const edges = [padRelation('rel:long', 3585, longIsRelevant), padRelation('rel:short', longIsRelevant ? 235 : 320, !longIsRelevant)];
    put(artifact('ontology_entity'), csv(reverse ? [...keys].reverse() : keys));
    put(artifact('ontology_relation'), csv(reverse ? [...edges].reverse() : edges));
    const query = comparison ? 'Porównaj klucze Karta cedrowa i Grupa paprociowa; relacja Karta cedrowa do Grupa paprociowa, kardynalność'
      : 'Karta cedrowa: jej klucz i relacja do Grupa paprociowa, kardynalność';
    try {
      const b = await call(comparison ? 'erp_concept.search' : 'erp_entity.get', query);
      assert(b.answer.includes(keys[0].description), JSON.stringify(b.owaCoverage));
      assert(b.owaCoverage.requirements.some(r => r.ownerId === primary && r.facet === 'identifiers' && r.covered));
      if (comparison) {
        assert(b.answer.includes(keys[1].description));
        assert(b.owaCoverage.requirements.some(r => r.ownerId === peer && r.facet === 'identifiers' && r.covered));
        const relationRequirements = b.owaCoverage.requirements.filter(r => ['relations', 'cardinality'].includes(r.facet));
        assert.deepEqual(relationRequirements.map(r => r.facet).sort(), ['cardinality', 'relations']);
        assert(relationRequirements.every(r => !r.covered), 'two separate key sources leave no third relation source slot');
      } else {
        assert(b.extracts.some(u => u.recordId === 'rel:short' && u.text.includes('DRAFT') && u.text.includes('Tylko dla zgodnych zapisów.')));
        assert(b.owaCoverage.requirements.every(r => r.covered));
        assert(!b.owaCoverage.requirements.some(r => r.ownerId === peer && r.facet === 'identifiers'));
        if (longIsRelevant) assert.equal(b.extracts.reduce((n, u) => n + u.text.length, 0), 683, 'exact reviewer-sized feasible whole-unit answer');
      }
      assert(b.sources.length <= 2);
      assert(b.extracts.reduce((n, u) => n + u.text.length, 0) <= 4000);
      for (const source of b.sources) assert(b.extracts.filter(u => u.sourceKey === source.key).length <= 3);
    } finally { put(artifact('ontology_entity'), csv(owners)); put(artifact('ontology_relation'), csv(relations)); }
  });
}
for (const query of ['Wyjaśnij przebieg, kierunek i skutek procesu flow:cedar', 'Opisz proces flow:cedar']) {
  test(`review I2 actual bodyless process cannot explain: ${query}`, async () => {
    put(artifact('workflow_pattern'), csv([{ id: 'flow:cedar', workflowName: 'Proces cedrowy', mode: 'READ', status: 'DRAFT' }]));
    try {
      const b = await call('erp_process.explain', query);
      assert(b.owaCoverage.requirements.some(r => r.processId === 'flow:cedar' && r.facet === 'workflow' && !r.covered));
      assert.equal(b.owaCoverage.processCoverage.find(p => p.processId === 'flow:cedar').visible, true);
      assert.equal(b.owaCoverage.processCoverage.find(p => p.processId === 'flow:cedar').covered, false);
      assert.equal(b.evidenceAssessment.status, 'insufficient_evidence');
      assert(b.answerNotes.some(n => n.includes('flow:cedar') && /nie pokazano|brak pokrycia/.test(n)));
    } finally { put(artifact('workflow_pattern'), csv([{ id: 'flow:revision', workflowName: 'Zmiana zapisu do bazy', description: 'JRXR → JRX → JRXR: tylko dla zgodnych zapisów.' }])); }
  });
}
for (const [label, description] of [
  ['prose', 'Najpierw operator wybiera zapis. Następnie proces przechodzi z oceny do akceptacji. Skutkiem jest utworzenie powiązania, wyłącznie po kontroli zgodności.'],
  ['path', 'PZ → FZ: przebieg prowadzi od zgłoszenia do zapisu. Skutkiem jest utworzenie powiązania, wyłącznie po kontroli zgodności.'],
]) test(`review I2 actual qualified ${label} explains the named process without fresh verification`, async () => {
  put(artifact('workflow_pattern'), csv([{ id: 'flow:cedar', workflowName: 'Proces cedrowy', mode: 'READ', status: 'do potwierdzenia', description }]));
  try {
    const b = await call('erp_process.explain', 'Wyjaśnij przebieg, kierunek i skutek procesu flow:cedar');
    assert(b.answer.includes(description));
    assert(b.owaCoverage.requirements.filter(r => r.processId === 'flow:cedar').every(r => r.covered));
    assert.equal(b.owaCoverage.status, 'unknown');
    assert(b.owaCoverage.limitations.some(l => l.relevant && l.type === 'unknown'));
  } finally { put(artifact('workflow_pattern'), 'id\n'); }
});
test('review I2 Business concept definition is not an unasked process explanation', async () => {
  const b = await call('erp_process.explain', 'Znaczenie Rezerwa szafirowa w kontekście encji procesów i reguł');
  assert.equal(b.owaCoverage, undefined);
  assert.equal(b.evidenceAssessment.status, 'unverified_evidence');
  assert(b.answer.includes('Rezerwa szafirowa oznacza wyodrębnioną pulę środków.'));
});
after(() => {
  guard.restore(); fs.rmSync(root, { recursive: true, force: true });
  assert.deepEqual(guard.violations, []);
  console.log(JSON.stringify({ guardViolations: guard.violations, learningWriterNoops: globalThis.owaBlockedLearningCalls || 0 }));
});
