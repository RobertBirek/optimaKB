import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSemanticCatalog } from './lib/semantic_catalog.mjs';
import { buildSemanticRequestPlan } from './lib/semantic_requirements.mjs';
import { parseOwaQuestion } from './lib/owa_query_context.mjs';
import { selectOwaEvidence, assessOwaCoverage, reconcileOwaOmissions } from './lib/owa_evidence.mjs';

const OWA = 'OWAOntology';
const row = (type, fields, contentHash = 'sha256:synthetic') => ({ namespace: OWA, artifact: `exports/owa_ontology/v1/${type}.csv`, contentHash, line: 2, endLine: 4, fields });
const rows = [row('ontology_entity', { id: 'unit:cedar', name: 'Karta cedrowa', canonicalName: 'Karta cedrowa', mainTable: 'CDN.Cedar', description: '## Identyfikatory\nPK: Cedar_Key; Status: do potwierdzenia.' }),
  row('ontology_entity', { id: 'unit:fern', name: 'Grupa paprociowa', canonicalName: 'Grupa paprociowa', mainTable: 'CDN.Fern', description: '## Identyfikatory\nPK: Fern_Key; Status: DRAFT.' }),
  row('ontology_entity', { id: 'unit:lake', name: 'Zbiór jeziorny', canonicalName: 'Zbiór jeziorny', description: '## Identyfikatory\nPK: Lake_Key; Status: DRAFT.' }),
  row('ontology_relation', { id: 'edge:cf', sourceEntityRefId: 'unit:cedar', targetEntityRefId: 'unit:fern', cardinality: 'N:1', predicate: 'links', status: 'DRAFT', description: 'Formalny FK: nie zadeklarowano w tym materiale; tylko powiązanie logiczne.' }),
  row('ontology_relation', { id: 'edge:fl', sourceEntityRefId: 'unit:fern', targetEntityRefId: 'unit:lake', cardinality: '1:N', predicate: 'links', status: 'DRAFT', description: 'Wyłącznie drugi kierunek.' })];
function setup(question, input = rows, intent = 'entity') {
  const catalog = buildSemanticCatalog(input, new Set([OWA]));
  const plan = buildSemanticRequestPlan(question, intent, catalog);
  const context = parseOwaQuestion(question, { symbols: catalog.symbols });
  const selection = selectOwaEvidence(context, input, plan);
  const units = selection.candidates.flatMap(row => selection.metadata.get(row).units.map(unit => ({ ...unit, namespace: OWA, artifact: row.artifact, recordId: row.fields.id, owa: { row, ownerIds: selection.metadata.get(row).ownerIds } })));
  return { plan, context, selection, units, assess: visible => assessOwaCoverage(context, selection, visible, plan) };
}
test('the one plan drives relation-local endpoint coverage without a global owner product', () => {
  const s = setup('Relacja Karta cedrowa do Grupa paprociowa, kardynalność; relacja Grupa paprociowa do Zbiór jeziorny, kardynalność');
  const coverage = s.assess(s.units);
  assert(coverage.requirements.length >= 4);
  assert(coverage.requirements.every(r => r.covered), JSON.stringify(coverage));
  assert.deepEqual(coverage.requirements.map(r => r.endpointOwnerIds), s.plan.requirements.map(r => r.endpointOwnerIds));
});
test('catalog/selected inventory cannot count as visible key proof or substitute endpoint key', () => {
  const s = setup('Karta cedrowa: jej klucz i relacja do Grupa paprociowa, kardynalność');
  const withoutKey = s.units.filter(u => u.recordId !== 'unit:cedar');
  const coverage = s.assess(withoutKey);
  assert(coverage.requirements.some(r => r.ownerId === 'unit:cedar' && r.facet === 'identifiers' && !r.covered));
  assert(coverage.requirements.filter(r => ['relations', 'cardinality'].includes(r.facet)).every(r => r.covered));
  assert(!coverage.requirements.some(r => r.ownerId === 'unit:fern' && r.facet === 'identifiers'));
});
test('cut or foreign source/version units cannot satisfy qualified complete evidence', () => {
  const s = setup('Karta cedrowa: jej klucz');
  const key = s.units.find(u => u.recordId === 'unit:cedar'); assert(key);
  for (const altered of [{ ...key, text: key.text.split(';')[0] }, { ...key, namespace: 'OtherKB' },
    { ...key, owa: { ...key.owa, row: { ...key.owa.row, contentHash: 'sha256:other-version' } } }]) {
    assert(!s.assess([altered]).requirements.some(r => r.covered));
  }
  assert(s.assess([key]).requirements.every(r => r.covered));
  assert.equal(s.assess([key]).status, 'unknown');
});
test('omissions use the identical requirement keys and never add coverage', () => {
  const s = setup('Karta cedrowa: jej klucz i relacja do Grupa paprociowa');
  const key = s.units.find(u => u.recordId === 'unit:cedar'); assert(key);
  const coverage = s.assess(s.units.filter(u => u !== key));
  const omissions = reconcileOwaOmissions(s.context, s.selection, coverage, [{ sourceKey: 'key-source', reason: 'answer_budget', missingFacets: ['identifiers'], owaUnit: key }], s.plan);
  assert(omissions[0].uncoveredRequirements.some(r => r.ownerId === 'unit:cedar' && r.facet === 'identifiers'));
  assert.equal(coverage.requirements.find(r => r.facet === 'identifiers').covered, false);
});
test('all merged qualifications require visible text, not catalog recognition evidence', () => {
  const s = setup('Relacja Karta cedrowa do Grupa paprociowa: formalny FK; relacja Karta cedrowa do Grupa paprociowa: ograniczenia weryfikacji');
  const c = s.assess(s.units);
  const r = c.requirements.find(r => r.facet === 'relations');
  assert.deepEqual(r.qualifications, ['formalFk', 'verification']);
  assert.equal(r.covered, false, 'no verification qualification in visible source');
  assert.equal(r.requestSpans.length, 2);
});
test('an explicit owner can request a prose-only field without inventing a catalog declaration', () => {
  const input = [row('ontology_entity', { id: 'unit:cedar', canonicalName: 'OWAOntology.CedarBook', name: 'Karta cedrowa',
    description: '## Mapowanie pól\nVisible_Code: mapowanie do visibleCode.' })];
  const catalog = buildSemanticCatalog(input, new Set([OWA]));
  assert.equal(catalog.fields.length, 0, 'plain prose does not become schema metadata');
  const s = setup('OWAOntology.CedarBook pole Visible_Code', input);
  assert(s.plan.requirements.some(r => r.ownerId === 'unit:cedar' && r.fieldName === 'Visible_Code'));
  assert(s.assess(s.units).requirements.every(r => r.covered));
});
test('facet-only source headings cannot introduce phantom ambiguity beside a requested owner', () => {
  const input = [...rows, row('ontology_entity', { id: 'unit:cloud', name: 'Chmura', description: '## Enum pola\nCloud_Flag: UNKNOWN.' }),
    row('ontology_entity', { id: 'unit:sky', name: 'Niebo', description: '## Enum pola\nSky_Flag: UNKNOWN.' })];
  const s = setup('Karta cedrowa: enum pola Cedar_Key', input);
  assert.deepEqual(s.plan.ambiguities, []);
});
test('source-declared tentative keys need no underscore spelling', () => {
  const s = setup('Karta cedrowa: jej klucz', [row('ontology_entity', { id: 'unit:cedar', name: 'Karta cedrowa', description: '## Identyfikatory\nPK: CedarSequence; Status: do potwierdzenia.' })]);
  const c = s.assess(s.units);
  assert(c.requirements.every(r => r.covered));
  assert(c.limitations.some(l => l.fieldNames.includes('CedarSequence') && l.relevant));
  assert.equal(c.status, 'unknown');
});
test('an empty cardinality cell cannot count as a requested cardinality fact', () => {
  const s = setup('Relacja Karta cedrowa do Grupa paprociowa, kardynalność', rows.map(r => r.fields.id === 'edge:cf' ? { ...r, fields: { ...r.fields, cardinality: '' } } : r));
  assert(s.assess(s.units).requirements.some(r => r.facet === 'cardinality' && !r.covered));
});
test('independently named process paths stay local to their occurrence spans', () => {
  const input = [row('workflow_pattern', { id: 'flow:cedar', workflowName: 'Proces cedrowy', mode: 'READ', status: 'DRAFT', description: 'PZ → FZ: tylko dla zgodnych zapisów.' }),
    row('workflow_pattern', { id: 'flow:fern', workflowName: 'Proces paprociowy', mode: 'READ', status: 'DRAFT', description: 'RO → FS → RO: tylko po kontroli.' })];
  const s = setup('Proces flow:cedar ścieżka PZ → FZ; proces flow:fern ścieżka RO → FS → RO', input);
  const c = s.assess(s.units);
  assert(c.requirements.length >= 4);
  assert(c.requirements.every(r => r.covered), JSON.stringify(c));
  assert.deepEqual(c.requirements.filter(r => r.documentPath).map(r => [r.processId, r.documentPath]), [
    ['flow:cedar', ['PZ', 'FZ']], ['flow:fern', ['RO', 'FS', 'RO']],
  ]);
});
const processRow = description => row('workflow_pattern', { id: 'flow:cedar', workflowName: 'Proces cedrowy', mode: 'READ', status: 'DRAFT', ...(description ? { description } : {}) });
for (const question of ['Wyjaśnij przebieg, kierunek i skutek procesu flow:cedar', 'Opisz proces flow:cedar']) test(`review I2 pure inventory is not substantive evidence: ${question}`, () => {
  const s = setup(question, [processRow()], 'process');
  const c = s.assess(s.units);
  assert.equal(c.processCoverage[0].visible, true);
  assert.equal(c.processCoverage[0].covered, false);
  assert(c.requirements.some(r => r.facet === 'workflow' && !r.covered));
  assert(c.missingFacets.includes('workflow'));
});
test('review I2 pure identity-only lookup may expose inventory without claiming an explanation', () => {
  const s = setup('Proces flow:cedar', [processRow()], 'process');
  const c = s.assess(s.units);
  assert(c.requirements.every(r => r.covered));
  assert(c.requirements.some(r => r.workflowAspects?.includes('identity')));
  assert(c.notices.some(n => /metadane/.test(n) && /nie.*wyjaśnieniem/.test(n)));
});
test('review I2 pure directional path does not prove an absent requested outcome', () => {
  const s = setup('Wyjaśnij przebieg, kierunek i skutek procesu flow:cedar: ścieżka PZ → FZ', [processRow('PZ → FZ: tylko dla zgodnych zapisów.')], 'process');
  const c = s.assess(s.units);
  assert(c.requirements.some(r => r.documentPath && r.covered));
  assert(c.requirements.some(r => !r.documentPath && r.facet === 'workflow' && !r.covered));
  assert.equal(c.processCoverage[0].covered, false);
  assert(!c.reasons.includes('requested_path_not_shown'), 'the path was shown; the outcome is missing');
});
test('Task4 M1 entity-owned shown path cannot be called missing because its outcome is absent', () => {
  const s = setup('Karta cedrowa: proces PZ → FZ i skutek magazynowy', [row('ontology_entity', {
    id: 'owner:cedar', name: 'Karta cedrowa', description: '## Proces\nPZ → FZ: tylko dla zgodnych zapisów.' })]);
  const c = s.assess(s.units);
  assert(c.requirements.filter(r => ['progression', 'direction'].includes(r.workflowAspect)).every(r => r.covered));
  assert(c.requirements.some(r => r.workflowAspect === 'outcome' && !r.covered));
  assert(!c.reasons.includes('requested_path_not_shown'));
  assert(c.notices.some(n => /outcome/.test(n)));
  assert.notEqual(c.status, 'covered');
});
test('review I2 pure vague aspect labels cannot stand in for process facts', () => {
  const s = setup('Wyjaśnij przebieg, kierunek i skutek procesu flow:cedar', [processRow('Przebieg. Kierunek. Skutek.')], 'process');
  assert(s.assess(s.units).requirements.some(r => r.facet === 'workflow' && !r.covered));
});
test('review I2 pure qualified prose supports requested aspects while UNKNOWN remains source-owned', () => {
  const description = 'Najpierw operator wybiera zapis. Następnie proces przechodzi z oceny do akceptacji. Skutkiem jest utworzenie powiązania, tylko po kontroli zgodności. UNKNOWN: warunki wymagają potwierdzenia.';
  const s = setup('Wyjaśnij przebieg, kierunek, warunki i skutek procesu flow:cedar', [processRow(description)], 'process');
  const c = s.assess(s.units);
  assert(c.requirements.every(r => r.covered));
  assert.equal(c.status, 'unknown');
  assert(c.limitations.some(l => l.relevant && l.type === 'unknown'));
});
test('review I2 only the requested outcome is required, with its original occurrence span', () => {
  const s = setup('Wyjaśnij skutek procesu flow:cedar', [processRow('Skutkiem jest utworzenie powiązania, tylko po kontroli zgodności.')], 'process');
  const c = s.assess(s.units);
  assert.deepEqual(c.requirements.map(r => r.workflowAspect), ['outcome']);
  assert(c.requirements.every(r => r.covered));
  assert.equal(c.requirements[0].requestSpans[0].text, s.context.question);
});
test('review I2 repeated process requests keep outcome attribution and do not borrow path support', () => {
  const s = setup('Proces flow:cedar: ścieżka PZ → FZ; skutek procesu flow:cedar', [processRow('PZ → FZ: tylko dla zgodnych zapisów. UNKNOWN: skutek do potwierdzenia.')], 'process');
  const c = s.assess(s.units);
  assert(c.requirements.some(r => r.workflowAspect === 'direction' && r.covered));
  const outcome = c.requirements.find(r => r.workflowAspect === 'outcome');
  assert(outcome && !outcome.covered);
  assert.deepEqual(outcome.requestSpans.map(span => span.text.trim()), ['skutek procesu flow:cedar']);
  assert.equal(c.status, 'unknown');
  assert.equal(c.processCoverage[0].covered, false);
});
for (const pathShown of [true, false]) test(`review I2 scoped stock outcome is substantive but never replaces path proof: shown=${pathShown}`, () => {
  const description = '## Proces\nPZ → FZ: tylko dla zgodnych zapisów.\n\n## Skutek PZ\nPZ zmniejsza stan magazynowy tylko po kontroli. UNKNOWN: skutek do potwierdzenia.';
  const s = setup('Karta cedrowa: proces PZ → FZ i skutek magazynowy', [row('ontology_entity', { ...rows[0].fields, description })]);
  const visible = pathShown ? s.units : s.units.filter(u => u.text.includes('zmniejsza stan'));
  const c = s.assess(visible);
  assert(c.requirements.some(r => r.workflowAspect === 'outcome' && r.covered));
  assert(c.requirements.filter(r => ['progression', 'direction'].includes(r.workflowAspect)).every(r => r.covered === pathShown));
  assert.equal(c.status, 'unknown');
  assert.equal(c.reasons.includes('requested_path_not_shown'), !pathShown);
});
test('review I2 an unrecognized explanatory phrasing cannot silently become identity-only', () => {
  const s = setup('Co robi proces flow:cedar?', [processRow()], 'process');
  assert(s.assess(s.units).requirements.some(r => r.facet === 'workflow' && r.workflowAspect !== 'identity' && !r.covered));
});
test('review I2 catalog source phrases cannot consume explanatory request words', () => {
  const input = processRow();
  input.fields.descriptionPreview = 'Opisz całość';
  const s = setup('Opisz całość procesu flow:cedar', [input], 'process');
  assert(s.plan.subjects[0].mentions.some(m => m.kind === 'sourcePhrase'), 'exercise source-language recognition');
  assert(s.assess(s.units).requirements.some(r => r.workflowAspect === 'progression' && !r.covered));
});
