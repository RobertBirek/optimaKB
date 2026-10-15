#!/usr/bin/env node
// Synthetic metadata only. Actual routing/answer/MCP dispatch; provider and learning
// writer are in-memory boundaries. Closed runtime FS/network/process guards.
import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MODULE_FILES, STATIC_FILES, installRuntimeGuard, registerFrozenModules } from './lib/owa_offline_harness.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = fs.mkdtempSync(path.join(repo, '.superpowers/sdd/final-fix-fixture-'));
const files = new Map(), modules = {}, directories = new Set([root]);
function put(file, text) {
  files.set(path.join(root, file), Buffer.from(text));
  let parent = path.dirname(path.join(root, file));
  while (parent.startsWith(root)) { directories.add(parent); if (parent === root) break; parent = path.dirname(parent); }
}
for (const file of MODULE_FILES) modules[file] = fs.readFileSync(path.join(repo, file), 'utf8');
// Only replace the provider/logging boundary. Fallback policy and real callers run.
modules['scripts/lib/external_search.mjs'] = `
export async function searchExternalSources() {
  globalThis.finalFixProviderCalls = (globalThis.finalFixProviderCalls || 0) + 1;
  return { ok: true, provider: 'synthetic', resultCount: 1, results: [{
    title: 'UNRELATED_PROVIDER_CLAIM', snippet: 'UNRELATED_PROVIDER_CLAIM',
    url: 'https://synthetic.invalid/unrelated', sourceType: 'official' }] };
}
export function buildExternalCitationBlock() { return 'UNRELATED_PROVIDER_CLAIM'; }
export function getExternalSearchStatus() { return { enabled: true, provider: 'synthetic' }; }
export function recordExternalFallback() { globalThis.finalFixFallbackLogs = (globalThis.finalFixFallbackLogs || 0) + 1; }
export function createExternalKnowledgeDraft() { throw new Error('Unexpected draft'); }
`;
for (const file of STATIC_FILES) put(file, '');
for (const file of ['docs/reference/ERP_Knowledge_Assistant_Routing.json', 'docs/reference/ERP_KB_Dashboard_KB_Registry.json']) {
  put(file, fs.readFileSync(path.join(repo, file)));
}
const artifact = type => `exports/owa_ontology/v1/${type}.csv`;
const entities = [
  { id: 'sample-owner', name: 'SampleCard', canonicalName: 'OWAOntology.SampleCard', mainTable: 'CDN.SampleCard', description: 'Krótki opis.' },
  { id: 'other-owner', name: 'OtherCard', canonicalName: 'OWAOntology.OtherCard', mainTable: 'CDN.OtherCard', description: 'Drugi opis.' },
  { id: 'tie-a', canonicalName: 'OWAOntology.TieFirst', aliases: 'TiedCard', description: 'Pierwszy opis.' },
  { id: 'tie-b', canonicalName: 'OWAOntology.TieSecond', aliases: 'TiedCard', description: 'Drugi opis.' },
];
const fields = [
  { id: 'sample-field', entityRefId: 'sample-owner', fieldName: 'Ready_Flag', mssqlColumn: 'Ready_Flag', mcpField: 'ready', mappingStatus: 'DRAFT' },
  { id: 'other-field', entityRefId: 'other-owner', fieldName: 'Ready_Flag', mssqlColumn: 'Ready_Flag', mcpField: 'otherReady', mappingStatus: 'DRAFT' },
  { id: 'dangling-field', entityRefId: 'sample', fieldName: 'Ready_Flag', mssqlColumn: 'Ready_Flag', mcpField: 'BAD_REFERENCE' },
];
const workflows = [
  { id: 'SAMPLE_SHIPMENT_PATH_2468', workflowName: 'RO → FS → RO', sourceEntityRefId: 'sample-owner',
    mcpTool: 'synthetic_document_tool', mode: 'WRITE', status: 'WRITE_NOT_CALLED', description: 'READ — opis cyklu; tylko po zatwierdzeniu.' },
  { id: 'stored-lowercase-process', ontologyId: 'OWAOntology.DeclaredProcess', workflowName: 'Opis procesu',
    sourceEntityRefId: 'sample-owner', mcpTool: 'synthetic_read_tool', mode: 'READ', status: 'READ_NOT_CALLED', description: 'Dokumentacja odczytu.' },
];
function csv(rows) {
  const keys = [...new Set(rows.flatMap(Object.keys))];
  return [keys, ...rows.map(row => keys.map(key => row[key] || ''))]
    .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n') + '\n';
}
put(artifact('ontology_entity'), csv(entities));
put(artifact('ontology_field'), csv(fields));
put(artifact('workflow_pattern'), csv(workflows));
put(artifact('ontology_relation'), 'id\n'); put(artifact('chunk'), 'id\n');
for (const file of ['business_description', 'code_meaning', 'business_rule', 'business_domain']) put(`exports/optima_business_semantics/v1/${file}.csv`, 'id\n');
for (const key of Object.keys(process.env)) delete process.env[key];
Object.assign(process.env, { ROOT: root, EXA_AUTO_DRAFT: '0', ENABLE_LIVE_LEARNING: '0', LEARNING_ENABLED: '0' });
registerFrozenModules({ root, modules });
const guard = installRuntimeGuard({ root, output: root, files, directories });
const load = file => import(pathToFileURL(path.join(root, file)).href);
const api = await load('scripts/erp_knowledge_answer.mjs');
const { parseOwaQuestion } = await load('scripts/lib/owa_query_context.mjs');
const { selectOwaEvidence, assessOwaCoverage } = await load('scripts/lib/owa_evidence.mjs');
const { handleJsonRpcRequest } = await load('scripts/lib/erp_knowledge_mcp_core.mjs');
const { getMcpProfile } = await load('scripts/lib/erp_knowledge_mcp_profiles.mjs');
const scope = new Set(['OWAOntology', 'ComarchOptimaBusinessSemantics']);
const rows = (type, items) => items.map(fields => ({ namespace: 'OWAOntology', artifact: artifact(type), fields }));
const metadata = [...rows('ontology_entity', entities), ...rows('ontology_field', fields), ...rows('workflow_pattern', workflows)];
const select = (q, input = metadata) => selectOwaEvidence(parseOwaQuestion(q), input);
const selectedIds = s => s.candidates.map(row => row.fields.id);
async function dispatch(query, namespaces = scope) {
  const rpc = await handleJsonRpcRequest({ jsonrpc: '2.0', id: 'synthetic', method: 'tools/call', params: {
    name: 'erp_process.explain', arguments: { query, as_of: '2026-10-15', limit: 5 } } },
  { profile: getMcpProfile('erp-semantic-mcp'), allowedNamespaces: namespaces, writeAllowed: false });
  assert(!rpc.error && !rpc.result?.isError, JSON.stringify(rpc));
  const body = JSON.parse(JSON.stringify(rpc)).result.structuredContent;
  assert.equal(body.answer, rpc.result.content.filter(x => x.type === 'text').map(x => x.text).join('\n'));
  return body;
}
for (const query of ['OWAOntology.MissingSaffron', 'OWA TiedCard proces', 'OWA stan dokumentu bez podania typu dokumentu']) {
  test(`I1 final: actual dispatch preserves OWA local abstention: ${query}`, async () => {
    const before = globalThis.finalFixProviderCalls || 0;
    const body = await dispatch(query);
    assert.equal(globalThis.finalFixProviderCalls || 0, before, 'provider must not bypass local OWA answer');
    assert.equal(body.retrieval.backend, 'local_artifacts');
    assert(!body.answer.includes('UNRELATED_PROVIDER_CLAIM'));
    assert(['unknown', 'ambiguous'].includes(body.owaCoverage.status));
  });
}
test('I1 final: nonOWA generic fallback still uses successful mocked provider', async () => {
  const before = globalThis.finalFixProviderCalls || 0;
  const result = await api.answerQuestion('saffron generic absent topic', new Set(['ComarchOptimaBusinessSemantics']));
  assert.equal(globalThis.finalFixProviderCalls, before + 1);
  assert.equal(result.answer.retrieval.backend, 'external_search');
  assert(api.renderAnswerMarkdown(result.answer).includes('UNRELATED_PROVIDER_CLAIM'));
  assert(globalThis.finalFixFallbackLogs > 0);
});
test('I2 final: normal scoped route scans workflow CSV and emits literal tool/mode/status disagreement', async () => {
  const result = await api.answerQuestion('OWA SampleCard proces RO → FS → RO', scope);
  assert(result.response.primaryKb.artifacts.includes(artifact('workflow_pattern')));
  assert(result.answer.extracts.some(unit => unit.text.includes('synthetic_document_tool')));
  const body = await dispatch('OWA SampleCard proces RO → FS → RO');
  assert(body.answer.includes('WRITE_NOT_CALLED') && body.answer.includes('READ — opis cyklu'));
  assert(body.answer.includes('nie jest dowodem wykonania'));
  const excluded = await dispatch('OWA SampleCard proces RO → FS → RO', new Set(['ComarchOptimaBusinessSemantics']));
  assert(!excluded.answer.includes('synthetic_document_tool'));
});
for (const id of ['SAMPLE_SHIPMENT_PATH_2468', 'OWAOntology.DeclaredProcess', 'stored-lowercase-process']) {
  test(`I3 final: exact stored process identity resolves without becoming an entity owner: ${id}`, async () => {
    const s = select(`OWA proces ${id}`);
    assert.equal(s.missing, false);
    assert.deepEqual(s.ownerIds, [], 'process is not an entity owner');
    assert(selectedIds(s).includes(id === 'OWAOntology.DeclaredProcess' ? 'stored-lowercase-process' : id));
    const body = await dispatch(`OWA proces ${id}`);
    assert(!body.owaCoverage.reasons.includes('requested_identity_not_found'));
    assert(body.answer.includes(id === 'SAMPLE_SHIPMENT_PATH_2468' ? 'synthetic_document_tool' : 'synthetic_read_tool'));
  });
}
test('I3 final: absent/mixed/undeclared process identities fail closed; foreign namespace cannot resolve', () => {
  for (const q of ['OWA proces MISSING_SHIPMENT_PATH_2468', 'OWA proces OWAOntology.UndeclaredProcess',
    'OWA proces OWAOntology.DeclaredProcess OWAOntology.UndeclaredProcess', 'OWA proces OWAOntology.stored-lowercase-process']) {
    const s = select(q); assert(s.missing, q); assert.deepEqual(s.candidates, [], q);
  }
  assert(select('OWA proces OWAOntology.DeclaredProcess', metadata.map(r => ({ ...r, namespace: 'OtherKB' }))).missing);
});
for (const name of ['Ready_Flag', 'CDN.SampleCard.Ready_Flag', 'SampleCard.Ready_Flag']) {
  test(`I4 final: owned field is selected and visibly covered for ${name}`, async () => {
    const q = `OWA SampleCard pole \`${name}\``;
    const s = select(q);
    assert(selectedIds(s).includes('sample-field'));
    assert(!selectedIds(s).includes('other-field') && !selectedIds(s).includes('dangling-field'));
    const body = await dispatch(q);
    assert(body.owaCoverage.requirements.some(r => r.fieldName === name && r.facet === 'fields' && r.covered));
    assert(body.answer.includes('Ready_Flag') && body.answer.includes('ready'));
  });
}
test('I4 final: wrong qualifier/owner/extended table never gains a tail-matched field', async () => {
  for (const table of ['CDN.WrongCard', 'CDN.SampleCardExtra', 'dbo.SampleCard']) {
    const q = `OWAOntology.SampleCard pole \`${table}.Ready_Flag\``;
    assert(!selectedIds(select(q)).includes('sample-field'), q);
    const body = await dispatch(q);
    assert(!body.owaCoverage.requirements.some(r => r.fieldName && r.covered), q);
  }
  assert(!selectedIds(select('OWAOntology.OtherCard pole `CDN.SampleCard.Ready_Flag`')).includes('other-field'));
});
test('I4 final: unquoted table.column retains its qualifier, including a wrong-table negative', async () => {
  for (const [name, covered] of [['SampleCard.Ready_Flag', true], ['WrongCard.Ready_Flag', false]]) {
    const q = `OWAOntology.SampleCard pole ${name}`;
    assert.deepEqual(parseOwaQuestion(q).fieldNames, [name]);
    assert.equal(selectedIds(select(q)).includes('sample-field'), covered);
    const body = await dispatch(q);
    assert.equal(body.owaCoverage.requirements.some(r => r.fieldName === name && r.covered), covered);
  }
});
for (const [pathText, covered] of [['RO → FS', false], ['FS → RO → FS', false], ['RO → FS → RO', true]]) {
  test(`I5 final: round-trip query requires complete ordered path, source=${pathText}`, () => {
    const q = 'OWA SampleCard proces RO → FS → RO';
    const c = parseOwaQuestion(q);
    const s = select(q, [...rows('ontology_entity', entities), ...rows('chunk', [{ id: 'cycle', sourceDocumentRefId: 'sample-owner', content: `## Proces\n${pathText}: tylko po zatwierdzeniu.` }])]);
    assert.deepEqual(c.documentCodes, ['RO', 'FS'], 'unique lexical vocabulary stays separate');
    assert.equal(selectedIds(s).includes('cycle'), covered);
    assert.deepEqual(c.documentPaths, [['RO', 'FS', 'RO']]);
    const visible = s.candidates.flatMap(row => (s.metadata.get(row)?.units || []).map(unit => ({ ...unit, namespace: 'OWAOntology', owa: { row, ownerIds: s.metadata.get(row).ownerIds } })));
    const coverage = assessOwaCoverage(c, s, visible);
    assert.equal(coverage.coveredFacets.includes('workflow'), covered);
    // Actual scanner -> selection -> answer -> JSON -> renderer, with the
    // workflow inventory excluded only for this source-direction control.
    const text = `## Proces\n${pathText}: tylko po zatwierdzeniu.`;
    put(artifact('chunk'), csv([{ id: 'cycle', sourceDocumentRefId: 'sample-owner', content: text }]));
    try {
      const response = { primaryKb: { name: 'OWAOntology', artifacts: ['ontology_entity', 'chunk'].map(artifact) }, supportKbs: [] };
      const evidence = api.gatherEvidence(response, api.extractTerms(q), api.extractFocusHints(q), scope, [], c);
      const answer = JSON.parse(JSON.stringify(api.buildPragmaticAnswer(q, response, evidence)));
      assert.equal(answer.owaCoverage.coveredFacets.includes('workflow'), covered);
      assert.equal(answer.extracts.some(unit => unit.text.includes(text)), covered);
      assert.equal(api.renderAnswerMarkdown(answer).includes(text), covered, 'no rejected one-way preview leakage');
    } finally { put(artifact('chunk'), 'id\n'); }
  });
}
// In-memory source replacements only; the scanner/build/render code is real.
function syntheticAnswer(question, { workflowRows = [], chunkRows = [], entityRows = entities, fieldRows = fields } = {}) {
  const replacements = { ontology_entity: entityRows, ontology_field: fieldRows, workflow_pattern: workflowRows, chunk: chunkRows };
  for (const [type, records] of Object.entries(replacements)) put(artifact(type), records.length ? csv(records) : 'id\n');
  try {
    const context = parseOwaQuestion(question);
    const response = { primaryKb: { name: 'OWAOntology', artifacts: Object.keys(replacements).map(artifact) }, supportKbs: [] };
    const evidence = api.gatherEvidence(response, api.extractTerms(question), api.extractFocusHints(question), scope, [], context);
    const built = api.buildPragmaticAnswer(question, response, evidence);
    const answer = JSON.parse(JSON.stringify(built));
    return { context, selection: evidence.owaSelection, built, answer, markdown: api.renderAnswerMarkdown(answer) };
  } finally {
    put(artifact('ontology_entity'), csv(entities)); put(artifact('ontology_field'), csv(fields));
    put(artifact('workflow_pattern'), csv(workflows)); put(artifact('chunk'), 'id\n');
  }
}
const processRow = (id, description = 'READ — dokumentacja; tylko warunkowo.') => ({ id, workflowName: `Opis ${id}`,
  mcpTool: 'synthetic_read', mode: 'READ', status: 'READ_NOT_CALLED', description });
const firstProcess = 'PROCESS_FIRST_FLOW_123', secondProcess = 'PROCESS_SECOND_FLOW_456';
test('R1 residual: two exact processes each have visible identity requirements, without entity owners', () => {
  const result = syntheticAnswer(`OWA proces ${firstProcess} i ${secondProcess}`,
    { workflowRows: [processRow(firstProcess), processRow(secondProcess)] });
  assert.deepEqual(result.selection.ownerIds, []);
  for (const processId of [firstProcess, secondProcess]) {
    assert(result.answer.owaCoverage.requirements.some(r => r.processId === processId && r.facet === 'workflow' && r.covered));
    assert(result.answer.extracts.some(u => u.recordId === processId));
  }
  assert.equal(result.answer.owaCoverage.status, 'covered');
  assert(result.markdown.includes('tylko warunkowo.'));
});
test('R1 residual: an over-budget process stays uncovered even when selected/source record inventory lists it', () => {
  const result = syntheticAnswer(`OWA proces ${firstProcess} i ${secondProcess}`, { workflowRows: [
    processRow(firstProcess, 'FIRST_HIDDEN_CLAIM ' + 'a'.repeat(4100)), processRow(secondProcess)] });
  assert(result.selection.processIds.includes(firstProcess));
  assert(result.answer.sources.some(s => s.records.some(r => r.recordId === firstProcess)), 'inventory is not visible content');
  assert.equal(result.answer.owaCoverage.status, 'partial');
  assert.equal(result.answer.evidenceAssessment.status, 'insufficient_evidence');
  assert(result.answer.owaCoverage.requirements.some(r => r.processId === firstProcess && !r.covered));
  assert(result.answer.owaCoverage.requirements.some(r => r.processId === secondProcess && r.covered));
  assert(result.answer.omissions.some(o => o.recordId === firstProcess && o.reason === 'answer_budget'
    && o.uncoveredRequirements.some(r => r.processId === firstProcess) && o.uncoveredFacets.includes('workflow')));
  assert(result.answer.answerNotes.some(n => n.includes(firstProcess) && /nie pokazano|brak pokrycia/.test(n)));
  assert(!result.markdown.includes('FIRST_HIDDEN_CLAIM'));
});
test('R1 residual: pure assessor cannot count a selected but unshown process or a lexical ID mention', () => {
  const question = `OWA proces ${firstProcess} i ${secondProcess}`;
  const selection = select(question, rows('workflow_pattern', [processRow(firstProcess), processRow(secondProcess)]));
  const row = selection.candidates.find(row => row.fields.id === secondProcess);
  const visible = selection.metadata.get(row).units.map(unit => ({ ...unit, namespace: 'OWAOntology', owa: { row, ownerIds: [] } }));
  visible.push({ text: firstProcess, facet: 'workflow', namespace: 'ComarchOptimaBusinessSemantics', recordId: firstProcess });
  const coverage = assessOwaCoverage(parseOwaQuestion(question), selection, visible);
  assert.equal(coverage.status, 'partial');
  assert(coverage.requirements.some(r => r.processId === firstProcess && !r.covered));
});
test('R1 residual: process omitted by source cap has exact missing identity and omission binding', () => {
  const ids = [firstProcess, secondProcess, 'PROCESS_THIRD_FLOW_789', 'PROCESS_FOURTH_FLOW_012'];
  const result = syntheticAnswer(`OWA proces ${ids.join(' i ')}`, { workflowRows: ids.map(id => processRow(id)) });
  assert.equal(result.answer.extracts.length, 2);
  const omitted = result.answer.omissions.find(o => o.reason === 'source_limit'); assert(omitted);
  assert(result.answer.owaCoverage.requirements.some(r => r.processId === omitted.recordId && !r.covered));
  assert(omitted.uncoveredRequirements.some(r => r.processId === omitted.recordId));
  assert(result.answer.answerNotes.some(n => n.includes(omitted.recordId)));
  assert.equal(result.answer.owaCoverage.status, 'partial');
});
test('R1 residual: underscore-style stored_process is not an unasked field mapping', () => {
  const result = syntheticAnswer('OWA proces stored_process', { workflowRows: [processRow('stored_process')] });
  assert.equal(result.selection.missing, false);
  assert.equal(result.answer.owaCoverage.status, 'covered');
  assert(!result.answer.owaCoverage.requestedFacets.includes('fields'));
  assert(!result.answer.owaCoverage.requirements.some(r => r.fieldName));
  assert(!/żądan[eay] pole stored_process|brak pokrycia.*fields/.test(result.markdown));
});
for (const mappingShown of [true, false]) test(`R1 residual: separately requested real mapping remains required, visible=${mappingShown}`, () => {
  const result = syntheticAnswer('OWA SampleCard proces stored_process i pole Ready_Flag', {
    workflowRows: [{ ...processRow('stored_process'), sourceEntityRefId: 'sample-owner' }],
    fieldRows: [{ ...fields[0], description: mappingShown ? 'Mapowanie Ready_Flag do ready.' : 'MAPPING_HIDDEN ' + 'f'.repeat(4100) }] });
  assert(result.answer.owaCoverage.requirements.some(r => r.processId === 'stored_process' && r.covered));
  assert(result.answer.owaCoverage.requirements.some(r => r.fieldName === 'Ready_Flag' && r.covered === mappingShown));
  assert(!result.answer.owaCoverage.requirements.some(r => r.fieldName === 'stored_process'));
  assert.equal(result.answer.owaCoverage.status, mappingShown ? 'covered' : 'partial');
  assert(!result.markdown.includes('MAPPING_HIDDEN'));
});
for (const [requestPath, sourcePath, covered] of [
  ['RO → XQ → FS', 'RO → FS', false],
  ['RO → XQ → FS', 'XQ → RO → FS', false],
  ['RO → FS', 'RO → XQ → FS', false],
  ['RO → FS', 'XQ → RO → FS', true],
  ['XQ → RO → FS', 'RO → FS', false],
  ['XQ → YQ', 'RO → FS', false],
  ['RO → FS → RO', 'XQ → RO → FS → RO', true],
]) test(`R2 residual: raw request ${requestPath} vs source ${sourcePath}`, () => {
  const question = `OWA SampleCard proces ${requestPath}`;
  const text = `## Proces\n${sourcePath}: wyłącznie ta ścieżka; tylko po zatwierdzeniu.`;
  const result = syntheticAnswer(question, { chunkRows: [{ id: 'raw-path-source', sourceDocumentRefId: 'sample-owner', content: text }] });
  assert.deepEqual(result.context.documentPaths, [requestPath.split(/\s*→\s*/)]);
  assert.equal(result.selection.candidates.some(row => row.fields.id === 'raw-path-source'), covered);
  assert.equal(result.answer.owaCoverage.coveredFacets.includes('workflow'), covered);
  assert.equal(result.answer.extracts.some(u => u.text.includes(text)), covered);
  assert.equal(result.markdown.includes(text), covered, 'no rejected source through previews');
  if (!covered) {
    assert.equal(result.answer.evidenceAssessment.status, 'insufficient_evidence');
    assert(result.answer.answerNotes.some(n => n.includes(requestPath)), 'retain exact unresolved path in insufficiency notice');
  }
});
test('R2 residual: separate explicit paths cannot supply an unknown middle gap', () => {
  const result = syntheticAnswer('OWA SampleCard proces RO → XQ → FS', { chunkRows: [{ id: 'separate-legs', sourceDocumentRefId: 'sample-owner',
    content: '## Proces\nRO → FS: bezpośrednio.\nRO → XQ: pierwsza część.\nXQ → FS: druga część.' }] });
  assert(!result.answer.owaCoverage.coveredFacets.includes('workflow'));
  assert(!result.answer.extracts.some(u => u.recordId === 'separate-legs'));
});
test('M2 residual: absent process notice preserves full double-underscore ID and Unicode boundary', () => {
  const id = 'SYNTHETIC_PROCESS_RECORD_INFO_0__ABSENT';
  const result = syntheticAnswer(`OWA proces ${id}`);
  assert.deepEqual(result.context.qualifiedIds, [id]);
  assert(result.answer.answerNotes.some(n => n.includes(`(${id})`)));
  assert(result.markdown.includes(`(${id})`));
  assert.deepEqual(parseOwaQuestion(`OWA proces ż${id}`).qualifiedIds, []);
  assert.equal(result.answer.owaCoverage.status, 'unknown');
});
for (const marker of ['UNKNOWN', 'CONFLICT']) {
  test(`R3 review: selected valid stock companion ${marker} remains a relevant limitation through JSON/render`, () => {
    const stock = `## Skutek RO\nRO zmniejsza stan magazynowy tylko po zatwierdzeniu. ${marker}: szczegóły skutku magazynowego wymagają wyjaśnienia.`;
    const forward = '## Proces\nRO → FS: tylko dla powiązanych dokumentów.';
    const result = syntheticAnswer('OWA SampleCard proces RO → FS i skutek magazynowy', {
      chunkRows: [{ id: 'qualified-stock', sourceDocumentRefId: 'sample-owner', content: `${stock}\n\n${forward}` }] });
    assert(result.answer.extracts.some(unit => unit.text === stock));
    assert(result.answer.extracts.some(unit => unit.text === forward));
    const type = marker === 'UNKNOWN' ? 'unknown' : 'ambiguous';
    assert.equal(result.answer.owaCoverage.status, type);
    assert.equal(result.answer.evidenceAssessment.status, 'insufficient_evidence');
    assert(result.answer.owaCoverage.limitations.some(l => l.recordId === 'qualified-stock' && l.type === type && l.relevant));
    assert(result.answer.evidenceAssessment.reasons.includes(marker === 'UNKNOWN' ? 'source_explicit_unknown' : 'source_explicit_ambiguity'));
    assert(result.markdown.includes(stock) && result.markdown.includes(forward), 'whole conditions remain visible');
    assert(!JSON.stringify(result.answer).includes('workflowScope'), 'private scope is not a public source assertion');
  });
  test(`R3 review: same-owner foreign stock ${marker} cannot qualify the requested process`, () => {
    const foreign = `## Skutek PZ\nPZ zwiększa stan magazynowy tylko po przyjęciu. ${marker}: szczegóły skutku magazynowego wymagają wyjaśnienia.`;
    const forward = '## Proces\nRO → FS: tylko dla powiązanych dokumentów.';
    const result = syntheticAnswer('OWA SampleCard proces RO → FS i skutek magazynowy', {
      chunkRows: [{ id: 'foreign-stock', sourceDocumentRefId: 'sample-owner', content: `${foreign}\n\n${forward}` }] });
    assert.equal(result.answer.owaCoverage.status, 'covered');
    assert(!result.answer.owaCoverage.limitations.some(l => l.relevant));
    assert(!result.answer.extracts.some(unit => unit.text.includes('PZ zwiększa')));
    assert(!result.markdown.includes('PZ zwiększa'), 'foreign whole unit cannot leak through a preview');
    assert(result.markdown.includes(forward));
  });
}
test('R3 review: a qualified companion alone is not positive path proof when the direct unit is over budget', () => {
  const stock = '## Skutek RO\nRO zmniejsza stan magazynowy tylko po zatwierdzeniu. UNKNOWN: szczegóły skutku magazynowego wymagają wyjaśnienia.';
  const forward = '## Proces\nRO → FS: HIDDEN_FORWARD_PROOF ' + 'p'.repeat(4100);
  const result = syntheticAnswer('OWA SampleCard proces RO → FS i skutek magazynowy', {
    chunkRows: [{ id: 'budget-stock', sourceDocumentRefId: 'sample-owner', content: `${stock}\n\n${forward}` }] });
  assert(result.answer.extracts.some(unit => unit.text === stock));
  assert(!result.answer.owaCoverage.coveredFacets.includes('workflow'), 'no direct visible path, regardless of companion relevance');
  assert(result.answer.owaCoverage.limitations.some(l => l.type === 'unknown' && l.relevant));
  assert.equal(result.answer.evidenceAssessment.status, 'insufficient_evidence');
  assert(result.answer.owaCoverage.reasons.includes('requested_path_not_shown'));
  assert(result.markdown.includes(stock) && !result.markdown.includes('HIDDEN_FORWARD_PROOF'));
});
for (const [requested, source] of [['RO → XQ → FS', 'RO → FS'], ['RO → FS', 'FS → RO']]) {
  test(`R3 review: stock qualification cannot bypass path barrier ${requested} vs ${source}`, () => {
    const result = syntheticAnswer(`OWA SampleCard proces ${requested} i skutek magazynowy`, {
      chunkRows: [{ id: 'barrier-stock', sourceDocumentRefId: 'sample-owner', content:
        `## Skutek RO\nRO zmniejsza stan magazynowy. UNKNOWN: szczegóły skutku magazynowego wymagają wyjaśnienia.\n\n## Proces\n${source}: tylko po zatwierdzeniu.` }] });
    assert(!result.answer.owaCoverage.coveredFacets.includes('workflow'));
    assert(!result.answer.owaCoverage.limitations.some(l => l.relevant));
    assert(!result.markdown.includes('RO zmniejsza stan magazynowy'));
    assert.equal(result.answer.evidenceAssessment.status, 'insufficient_evidence');
  });
}
after(async () => {
  await api.answerQuestion('OWAOntology.UnresolvedFixture', scope);
  guard.restore(); fs.rmSync(root, { recursive: true, force: true });
  assert.deepEqual(guard.violations, [], 'including swallowed forbidden operations');
  assert(globalThis.owaBlockedLearningCalls > 0, 'precise fixture-only learning stub exercised');
});
