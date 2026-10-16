#!/usr/bin/env node
// Synthetic public answers only; no corpus, runtime, network or report writes.
import assert from 'node:assert/strict';
import { test } from 'node:test';

let api = {};
try { api = await import('./lib/owa_answer_presentation.mjs'); }
catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }

test('omission aggregation counts units, with stable reasons and final facet precedence', () => {
  assert.equal(typeof api.summarizeOmissions, 'function', 'missing pure omission aggregation');
  assert.deepEqual(api.summarizeOmissions(), { total: 0, byReason: [], uncoveredFacets: [] });
  const omissions = [
    { reason: 'source_limit', missingFacets: ['fields'], uncoveredFacets: [] },
    { reason: 'new_reason', missingFacets: ['workflow', 'fields'] },
    { reason: 'source_limit', uncoveredFacets: ['workflow', 'identifiers'] },
    { reason: 'budget', uncoveredFacets: ['fields'] },
  ];
  assert.deepEqual(api.summarizeOmissions(omissions), {
    total: 4,
    byReason: [{ reason: 'source_limit', count: 2 }, { reason: 'new_reason', count: 1 }, { reason: 'budget', count: 1 }],
    uncoveredFacets: ['workflow', 'fields', 'identifiers'],
  });
  assert.deepEqual(api.summarizeOmissions([omissions[0]]).uncoveredFacets, []);
});

const text = '## Warunki\r\nTylko w buforze; nie potwierdzono wykonania.\r\n\r\n| Pole | Typ |\r\n| --- | --- |\r\n| Sample_Key | int |  \r\n';
function fixture() {
  return {
    question: 'OWA: mapowanie karty', primaryKb: 'OWAOntology', supportKbs: [],
    owaCoverage: { status: 'partial', missingFacets: ['fields'] },
    answerNotes: ['UNKNOWN: brak pełnego enum Sample_Tag.'],
    evidenceAssessment: { status: 'insufficient_evidence', missingTerms: [], reasons: [] },
    retrieval: { backend: 'local_artifacts', graphUsed: false }, evidence: [],
    extracts: [{ sourceKey: 'source-a', artifact: 'fixture/chunk.csv', line: 2, endLine: 8, recordId: 'ROW_A', text }],
    sources: [{ key: 'source-a', kind: 'local_artifact', title: 'Karta próbna', namespace: 'OWAOntology',
      recordIds: ['ROW_A'], records: [{ artifact: 'fixture/chunk.csv', locator: 'L2-L8', recordId: 'ROW_A', contentHash: 'sha256:' + 'a'.repeat(64) }] }],
    omissions: Array.from({ length: 49 }, () => ({ sourceKey: 'sha256:' + 'b'.repeat(64), reason: 'source_limit' })),
  };
}
function render(answer) {
  assert.equal(typeof api.renderCompactOwaAnswer, 'function', 'missing pure compact renderer');
  return api.renderCompactOwaAnswer(answer);
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
const count = (value, part) => value.split(part).length - 1;

test('compact blocks preserve the complete conditional extract bytes and aggregate 49 omissions', () => {
  const answer = fixture(), before = JSON.stringify(answer);
  const markdown = render(freeze(answer));
  assert.equal(JSON.stringify(answer), before);
  assert(markdown.startsWith('Odpowiedź:\n\n'));
  assert(markdown.includes('[S1] fixture/chunk.csv, linie 2–8:\n' + text));
  assert(markdown.includes('UNKNOWN: brak pełnego enum Sample_Tag.'));
  assert(markdown.indexOf('UNKNOWN:') < markdown.indexOf(text));
  assert(markdown.includes('Źródła:\n- [S1] Karta próbna — OWAOntology; fixture/chunk.csv L2-L8; rekord ROW_A'));
  assert(markdown.includes('Pominięcia: 49 jednostek (limit źródeł: 49). Szczegóły w danych strukturalnych.'));
  for (const noise of ['Pytanie:', 'Główna KB:', 'sha256:', 'Polecane artefakty:', 'Confidence']) assert(!markdown.includes(noise), noise);
  assert.deepEqual(api.summarizeOmissions(answer.omissions).byReason, [{ reason: 'source_limit', count: 49 }]);
  assert.equal(api.summarizeOmissions(answer.omissions).total, 49);
});

test('identical notes deduplicate only at exactly the same textual scope', () => {
  const answer = fixture();
  answer.answerNotes = ['UNKNOWN: owner A / Sample_Tag.', 'UNKNOWN: owner A / Sample_Tag.',
    'UNKNOWN: owner B / Sample_Tag.', 'CONFLICT: owner A / Sample_Tag.'];
  const markdown = render(answer);
  for (const note of new Set(answer.answerNotes)) assert.equal(count(markdown, note), 1);
});

test('source labels follow selected source identity across versions, not title or extract order', () => {
  const answer = fixture();
  answer.sources.push({ ...answer.sources[0], key: 'source-b', recordIds: ['ROW_B'],
    records: [{ artifact: 'fixture/chunk.csv', locator: 'L20-L28', recordId: 'ROW_B' }] });
  answer.extracts.unshift({ ...answer.extracts[0], sourceKey: 'source-b', recordId: 'ROW_B', line: 20, endLine: 28 });
  const markdown = render(answer);
  assert(markdown.includes('[S2] fixture/chunk.csv, linie 20–28:\n' + text));
  assert(markdown.includes('[S1] fixture/chunk.csv, linie 2–8:\n' + text));
  assert.equal(count(markdown, text), 2, 'cross-version content must not deduplicate');
  assert.equal(count(markdown, 'Karta próbna — OWAOntology'), 2);
  assert(markdown.indexOf('[S2] fixture') < markdown.indexOf('[S1] fixture'));
  assert.equal(count(markdown, '\n- [S'), 2);
});

test('citations use only emitted records and physical locations, deduplicated within a source', () => {
  const answer = fixture();
  answer.sources[0].records.push({ artifact: 'fixture/unused.csv', locator: 'L800-L999', recordId: 'UNUSED' });
  answer.sources[0].records[0].locator = 'L2-L999'; // candidate extent is not the displayed extent
  answer.extracts.push({ ...answer.extracts[0], text: 'Autorska druga jednostka.' });
  answer.extracts.push({ ...answer.extracts[0], line: 12, endLine: 14, recordId: 'ROW_C', text: 'Trzecia jednostka.' });
  answer.sources[0].records.push({ artifact: 'fixture/chunk.csv', locator: 'L12-L14', recordId: 'ROW_C' });
  const markdown = render(answer);
  assert(markdown.includes('Źródła:\n'), 'missing source block');
  const citation = markdown.split('Źródła:\n')[1].split('\n\n')[0];
  assert.equal(count(citation, 'fixture/chunk.csv L2-L8; rekord ROW_A'), 1);
  assert(citation.includes('fixture/chunk.csv L12-L14; rekord ROW_C'));
  for (const unused of ['UNUSED', 'unused.csv', 'L2-L999', 'L800-L999']) assert(!markdown.includes(unused));
  for (const extract of answer.extracts) assert(markdown.includes(extract.text));
});

test('known source URL and dates stay visible without replacing unknown dates with observation time', () => {
  const answer = fixture();
  Object.assign(answer.sources[0], { sourceUrl: 'https://example.org/real-source',
    publication: { value: '2024-03-05', precision: 'day', timezone: null },
    update: { value: '2024-03-06T11:12', timezone: 'Europe/Warsaw' },
    retrieved: { value: null, reason: 'source_date_unavailable' }, observedAt: '2099-01-01' });
  const markdown = render(answer);
  for (const known of ['https://example.org/real-source', 'Publikacja: 2024-03-05', 'Aktualizacja: 2024-03-06T11:12', 'Europe/Warsaw']) assert(markdown.includes(known));
  assert(markdown.includes('Nieznane daty źródłowe: pobranie.'));
  assert(!markdown.includes('2099-01-01'));
});

test('empty extracts preserve explicit missing and ambiguous notices without substitute facts', () => {
  for (const status of ['unknown', 'ambiguous']) {
    const answer = fixture();
    answer.extracts = []; answer.sources = []; answer.omissions = [];
    answer.owaCoverage = { status, missingFacets: ['workflow'] };
    answer.answerNotes = [status === 'unknown' ? 'Brak dowodów dla Example_Process; nie oznacza nieistnienia w ERP.'
      : 'Niejednoznaczny właściciel Example_Process; doprecyzuj identyfikator.'];
    const markdown = render(answer);
    assert(markdown.includes(answer.answerNotes[0]));
    assert(markdown.includes('Brak wystarczających lokalnych dowodów'));
    assert(!markdown.includes('Źródła:'));
    assert(!markdown.includes('[S0]'));
  }
});

test('sole technical snippets survive without source bodies, at their original namespace and locator', () => {
  const answer = fixture();
  answer.extracts = []; answer.sources = []; answer.omissions = [];
  answer.evidence = [{ kb: 'ComarchOptimaBusinessSemantics', artifact: 'fixture/technical.csv', hits: [
    { line: 30, endLine: 32, recordId: 'TECH_A', snippet: 'Nie potwierdzono wywołania; stan nie oznacza sukcesu.' },
    { line: 40, recordId: 'TECH_B', snippet: 'CONFLICT: warunek wykonania nadal nieznany.' },
  ] }];
  const markdown = render(freeze(answer));
  assert(markdown.includes('Dodatkowe dowody:'));
  for (const value of ['[A1] ComarchOptimaBusinessSemantics; fixture/technical.csv:', '[H1] L30-L32', '[H2] L40']) assert(markdown.includes(value), value);
  assert.deepEqual(answer.evidence[0].hits.map(h => h.recordId), ['TECH_A', 'TECH_B']);
  for (const hit of answer.evidence[0].hits) assert(markdown.includes(hit.snippet));
  assert(!markdown.includes('Brak lokalnych dowodów dla żądanego zakresu.'));
});

test('auxiliary evidence is not removed by lexical relevance, generic source metadata or different version', () => {
  const answer = fixture();
  answer.evidence = [{ kb: 'OWAOntology', artifact: 'fixture/chunk.csv', hits: [
    { line: 18, endLine: 19, recordId: 'OTHER_VERSION', bodyField: 'content',
      source: { contentHash: 'sha256:other-version', recordId: 'OTHER_VERSION' }, snippet: text },
    { line: 29, snippet: 'Ten krótki techniczny warunek pozostaje jedynym dowodem.' },
  ] }, { kb: 'ComarchOptimaBusinessSemantics', artifact: 'fixture/only-excerpt.md', hits: [],
    excerpt: 'Dodatkowy dowód bez listy trafień.' }];
  const markdown = render(answer);
  assert.equal(count(markdown, text), 2);
  for (const value of ['[A1] OWAOntology; fixture/chunk.csv:', '[H1] L18-L19', '[H2] L29', 'Ten krótki techniczny warunek', '[A2] ComarchOptimaBusinessSemantics; fixture/only-excerpt.md:', 'Dodatkowy dowód bez listy trafień.']) assert(markdown.includes(value), value);
  assert.equal(answer.evidence[0].hits[0].source.contentHash, 'sha256:other-version');
});

test('coverage retains actual missing owner-field-aspect cells and named unknown metrics', () => {
  const answer = fixture();
  answer.owaCoverage = { status: 'unknown', missingFacets: ['enums'],
    requirements: [{ ownerId: 'Example.OwnerA', fieldName: 'Missing_Flag', facet: 'fields', covered: false },
      { ownerId: 'Example.OwnerB', fieldName: 'Missing_Flag', facet: 'workflow', processId: 'Example.Flow', covered: false },
      { ownerId: 'Example.OwnerC', fieldName: 'ALREADY_COVERED', facet: 'fields', covered: true }],
    limitations: [{ type: 'unknown', fieldNames: ['Sample_Rate', 'Sample_Age_Days'], relevant: false,
      artifact: 'fixture/metrics.csv', recordId: 'METRIC_A' }],
    notices: ['UNKNOWN: brak pełnego enum Sample_Tag.', 'CONFLICT: osobny zakres Example.OwnerB.'] };
  answer.omissions = [{ reason: 'new_reason', missingFacets: ['OBSOLETE'], uncoveredFacets: ['identifiers'] },
    { reason: 'new_reason', missingFacets: ['ALSO_OBSOLETE'], uncoveredFacets: [] }];
  const markdown = render(answer);
  for (const value of ['Pokrycie: unknown', 'enums', 'identifiers', 'Example.OwnerA', 'Example.OwnerB', 'Missing_Flag', 'workflow', 'Example.Flow',
    'Sample_Rate', 'Sample_Age_Days', 'fixture/metrics.csv', 'METRIC_A', 'CONFLICT: osobny zakres Example.OwnerB.', 'new_reason: 2']) assert(markdown.includes(value), value);
  assert.equal(count(markdown, 'UNKNOWN: brak pełnego enum Sample_Tag.'), 1);
  for (const value of ['OBSOLETE', 'ALSO_OBSOLETE', 'ALREADY_COVERED', '[object Object]']) assert(!markdown.includes(value), value);
});

test('nonempty freshness, CSV diagnostics, missing terms and local verification boundary remain visible', () => {
  const answer = fixture();
  answer.freshnessNote = 'Stan źródła na dzień wskazany przez autora; bez aktualizacji.';
  answer.evidenceAssessment.missingTerms = ['Required_Column'];
  answer.evidenceAssessment.reasons = ['invalid_csv', 'unrecognized_diagnostic'];
  const markdown = render(answer);
  for (const value of [answer.freshnessNote, 'Required_Column', 'Część źródeł CSV ma nieprawidłowy format i została pominięta.']) assert(markdown.includes(value), value);
  assert.deepEqual(answer.evidenceAssessment.reasons, ['invalid_csv', 'unrecognized_diagnostic']);
  assert(!markdown.includes('Diagnostyka:'), 'nonfactual reason codes stay in unchanged JSON');
  assert.match(markdown, /CSV.*nieprawidłowy/);
  assert.match(markdown, /lokalne.*nie.*weryfikacj.*ERP\/MSSQL.*graf/iu);
});

test('no-source clarification and unlabelled extracts do not manufacture source identity or locations', () => {
  const empty = { owaCoverage: { status: 'ambiguous', notices: ['Doprecyzuj oś stanu Example.Doc.'] } };
  const markdown = render(empty);
  assert(markdown.includes('Doprecyzuj oś stanu Example.Doc.'));
  assert(markdown.includes('Brak lokalnych dowodów dla żądanego zakresu.'));
  const unlabelled = render({ ...empty, extracts: [{ text: 'Nie potwierdzono sukcesu; CONFLICT.', artifact: 'fixture/no-owner.md', locator: 'L7-L9' }] });
  assert(unlabelled.includes('Nie potwierdzono sukcesu; CONFLICT.'));
  assert(unlabelled.includes('fixture/no-owner.md, L7-L9'));
  for (const value of ['[S0]', 'undefined', 'Lundefined']) assert(!unlabelled.includes(value));
});

test('formatter ignores enumerable private rows and hidden public-field getters without touching either', () => {
  const answer = fixture();
  for (const value of [answer, answer.extracts[0], answer.sources[0]]) {
    Object.defineProperty(value, 'owa', { enumerable: true, get() { throw Error('private row accessed'); } });
    Object.defineProperty(value, 'privateContext', { get() { throw Error('hidden context accessed'); } });
  }
  Object.defineProperty(answer, 'freshnessNote', { get() { throw Error('hidden freshness accessed'); } });
  Object.defineProperty(answer.extracts[0], 'locator', { get() { throw Error('hidden locator accessed'); } });
  assert.doesNotThrow(() => render(answer));
  assert(render(answer).includes(text));
});

test('an extract without a source key retains its record attribution without borrowing a candidate identity', () => {
  const answer = fixture();
  delete answer.extracts[0].sourceKey;
  delete answer.sources[0].key;
  const markdown = render(answer);
  assert(markdown.includes('[źródło nieustalone] fixture/chunk.csv, linie 2–8; rekord ROW_A:\n' + text));
  assert(!markdown.includes('[S1]'), 'absent keys are not a source identity match');
  assert(!markdown.includes('Karta próbna'), 'unused candidate source must not be cited');
});

test('literal unfamiliar omission reasons and repeated extract units survive deep-frozen input deterministically', () => {
  const answer = fixture();
  answer.extracts.push({ ...answer.extracts[0] });
  answer.omissions = [{ reason: '__proto__', missingFacets: ['fields'], uncoveredFacets: [] }, { reason: 'new_reason' }];
  const before = JSON.stringify(answer);
  const markdown = render(freeze(answer));
  assert.equal(render(answer), markdown);
  assert.equal(JSON.stringify(answer), before);
  assert.equal(count(markdown, text), 2, 'every selected unit must remain, including repeated text');
  assert(markdown.includes('__proto__: 1; new_reason: 1'));
});

test('only used source entries appear, without relabelling the second selected source or fabricating a third', () => {
  const answer = fixture();
  answer.sources.unshift({ ...answer.sources[0], key: 'unused-source', title: 'UNUSED CANDIDATE' });
  const markdown = render(answer);
  assert(markdown.includes('[S2] fixture/chunk.csv, linie 2–8:\n' + text));
  assert(markdown.includes('Źródła:\n- [S2] Karta próbna'));
  assert(!markdown.includes('UNUSED CANDIDATE'));
  assert.equal(count(markdown, '\n- [S'), 1);
});

test('auxiliary grouping collapses only byte-identical same-item excerpt and retains complete snippets with unique short locators', () => {
  const answer = fixture();
  const snippet = 'Only after approval.\r\n| State | UNKNOWN |\r\nNever infer execution.  ';
  answer.evidence = [{ kb: 'OWAOntology', artifact: 'fixture/technical.csv', locator: 'L4,L9', excerpt: snippet,
    hits: [{ line: 4, endLine: 6, recordId: 'LONG_TECHNICAL_UUID_A', snippet },
      { line: 9, recordId: 'LONG_TECHNICAL_UUID_B', snippet: 'CONFLICT: no verified transition.', source: { sourceUrl: 'https://example.org/proof' } }] }];
  const before = JSON.stringify(answer), markdown = render(freeze(answer));
  assert(markdown.includes('Dodatkowe dowody:\n\n[A1] OWAOntology; fixture/technical.csv:\n\n- [H1] L4-L6:\n' + snippet));
  assert(markdown.includes('- [H2] L9; https://example.org/proof:\nCONFLICT: no verified transition.'));
  assert.equal(count(markdown, snippet), 1);
  assert.equal(count(markdown, 'fixture/technical.csv'), 1);
  assert(!markdown.includes('LONG_TECHNICAL_UUID_'));
  assert.equal(JSON.stringify(answer), before, 'all record IDs/full provenance stay in untouched JSON');
});

test('auxiliary excerpt dedup never crosses item/owner/version or whitespace boundaries', () => {
  const answer = fixture(), snippet = 'UNKNOWN: version-specific condition; do not execute.';
  answer.evidence = [{ kb: 'OWAOntology', artifact: 'fixture/shared.csv', locator: 'L3', excerpt: snippet,
    hits: [{ line: 3, recordId: 'A', source: { contentHash: 'version-a' }, snippet }] },
  { kb: 'OWAOntology', artifact: 'fixture/shared.csv', locator: 'L3', excerpt: snippet + ' ',
    hits: [{ line: 3, recordId: 'B', source: { contentHash: 'version-b' }, snippet }] },
  { kb: 'ComarchOptimaBusinessSemantics', artifact: 'fixture/excerpt.md', locator: 'L8', excerpt: snippet }];
  const markdown = render(answer);
  for (const label of ['[A1]', '[A2]', '[A3]']) assert(markdown.includes(label));
  assert.equal(count(markdown, snippet), 4, 'one same-item exact duplicate only; all other occurrences survive');
  assert(markdown.includes('- [E] L3:\n' + snippet + ' '));
  assert(markdown.includes('[A3] ComarchOptimaBusinessSemantics; fixture/excerpt.md:\n\n- [E] L8:\n' + snippet));
});

test('presentation removes duplicate scoped limitation/requirement scaffolding and diagnostic codes, never the original statements', () => {
  const answer = fixture();
  const note = 'Źródło (fixture/metrics.csv, METRIC_A) oznacza zakres „Sample_Rate” jako UNKNOWN / do potwierdzenia; pokazany fragment nie potwierdza kompletnej wiedzy w tym zakresie.';
  answer.answerNotes = [note];
  answer.owaCoverage = { status: 'unknown', missingFacets: ['fields'], notices: [note],
    requirements: [{ facet: 'fields', covered: false }],
    limitations: [{ type: 'unknown', artifact: 'fixture/metrics.csv', recordId: 'METRIC_A', fieldNames: ['Sample_Rate'] }] };
  answer.evidenceAssessment.reasons = ['invalid_csv', 'source_explicit_unknown', 'nonfactual_reason_code'];
  const before = JSON.stringify(answer), markdown = render(freeze(answer));
  assert.equal(count(markdown, note), 1);
  assert(!markdown.includes('UNKNOWN: fixture/metrics.csv'), 'canonical source declaration already carries this exact scope');
  assert(!markdown.includes('Brak pokrycia wymagania: fields.'), 'facet already explicitly listed in final coverage');
  assert(!markdown.includes('Diagnostyka:'));
  assert(markdown.includes('Część źródeł CSV ma nieprawidłowy format i została pominięta.'));
  assert(markdown.includes('Brak pokrycia: fields.'));
  assert.equal(JSON.stringify(answer), before, 'all full coverage/diagnostics remain unchanged in JSON');
});

test('a query echo, wrong owner, missing named field or bare UNKNOWN cannot suppress a scoped limitation', () => {
  for (const note of ['Pytanie: UNKNOWN fixture/metrics.csv METRIC_A Sample_Rate?',
    'Źródło (fixture/metrics.csv, OTHER_OWNER) oznacza zakres „Sample_Rate” jako UNKNOWN / do potwierdzenia; pokazany fragment nie potwierdza kompletnej wiedzy w tym zakresie.',
    'Źródło (fixture/metrics.csv, METRIC_A) oznacza zakres „Other_Field” jako UNKNOWN / do potwierdzenia; pokazany fragment nie potwierdza kompletnej wiedzy w tym zakresie.', 'UNKNOWN']) {
    const answer = fixture(); answer.answerNotes = [note];
    answer.owaCoverage.limitations = [{ type: 'unknown', artifact: 'fixture/metrics.csv', recordId: 'METRIC_A', fieldNames: ['Sample_Rate'] }];
    const markdown = render(answer);
    assert(markdown.includes(note));
    assert(markdown.includes('UNKNOWN: fixture/metrics.csv, METRIC_A, Sample_Rate.'));
  }
});

for (const local of [true, false]) test(`external evidence retains every public byte and truthful context (${local ? 'mixed' : 'no local'})`, () => {
  const answer = fixture();
  if (!local) { answer.extracts = []; answer.sources = []; answer.omissions = []; }
  answer.retrieval.backend = local ? 'local_artifacts_with_external_search' : 'external_search';
  answer.note = local ? 'Local and external evidence; neither proves execution.' : 'External evidence only; local coverage remains UNKNOWN.';
  answer.freshnessNote = 'Live search is not verification of ERP execution.';
  answer.externalEvidence = [
    { title: 'Qualified rule', sourceType: 'official', url: 'https://example.test/full/path?version=2&scope=all#conditions',
      publishedDate: '2026-10-15T09:10:11+02:00', snippet: 'Only after manual approval.\r\n\r\n| State | UNKNOWN |\r\nNever infer successful execution.  ' },
    { title: 'Second version', sourceType: 'community', url: 'https://example.test/version-1', snippet: 'CONFLICT: not confirmed; never substitute another workflow.' },
  ];
  for (const value of [answer.externalEvidence[0], answer.retrieval]) {
    Object.defineProperty(value, 'raw', { enumerable: true, get() { throw Error('private provider payload accessed'); } });
    Object.defineProperty(value, 'privateContext', { get() { throw Error('hidden provider context accessed'); } });
  }
  Object.defineProperty(answer.externalEvidence[1], 'publishedDate', { get() { throw Error('hidden date accessed'); } });
  // Freeze descriptors without reading poisoned private getters.
  for (const item of answer.externalEvidence) Object.freeze(item);
  Object.freeze(answer.externalEvidence); Object.freeze(answer.retrieval); Object.freeze(answer);
  const markdown = render(answer);
  const expected = 'Zewnętrzne dowody live:\n- Qualified rule [official] -> https://example.test/full/path?version=2&scope=all#conditions\n'
    + '  - opublikowano: 2026-10-15T09:10:11+02:00\n  - fragment: ' + answer.externalEvidence[0].snippet
    + '\n- Second version [community] -> https://example.test/version-1\n  - fragment: ' + answer.externalEvidence[1].snippet;
  assert(markdown.includes(expected), 'complete legacy external block, including final qualification/whitespace');
  assert(markdown.includes(answer.note)); assert(markdown.includes(answer.freshnessNote));
  assert(markdown.includes(`Źródło: ${local ? 'lokalne artefakty KB i zewnętrzne wyszukiwanie' : 'zewnętrzne wyszukiwanie'}; bez wykonania grafu KAG/OpenSPG.`));
  if (local) assert(markdown.includes(text));
  else assert(markdown.includes('Brak lokalnych dowodów dla żądanego zakresu.'));
  assert.equal(render(answer), markdown);
});

test('hidden external evidence/backend/note are outside the public formatter surface', () => {
  const answer = fixture(), before = render(answer);
  for (const key of ['externalEvidence', 'retrieval', 'note']) Object.defineProperty(answer, key, { enumerable: false, get() { throw Error('hidden ' + key); } });
  assert.equal(render(answer), before);
});
