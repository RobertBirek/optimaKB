#!/usr/bin/env node
// Synthetic fixture ROOT only; no corpus, network, processes, drafts or learning.
import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { fileURLToPath } from 'node:url';

const worktree = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = fs.mkdtempSync(path.join(worktree, '.superpowers/sdd/task3-fixture-'));
process.env.ROOT = root;
process.env.EXA_AUTO_DRAFT = '0';
process.env.ENABLE_LIVE_LEARNING = '0';
process.env.LEARNING_ENABLED = '0';
delete process.env.EXA_API_KEY;
delete process.env.EXA_MCP_COMMAND;
let blockedCalls = 0;
const saved = [];
function block(object, key) {
  saved.push([object, key, object[key]]);
  object[key] = () => { blockedCalls++; throw new Error(`Forbidden ${key}`); };
}
for (const [object, keys] of [[globalThis, ['fetch']], [http, ['request', 'get']],
  [https, ['request', 'get']], [net.Socket.prototype, ['connect']],
  [childProcess, ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']]]) {
  for (const key of keys) block(object, key);
}
syncBuiltinESMExports();
const api = await import('./erp_knowledge_answer.mjs');
const { parseOwaQuestion } = await import('./lib/owa_query_context.mjs');
const { owaUnitsForRow } = await import('./lib/owa_evidence.mjs');
let describeLocalSource;
try { ({ describeLocalSource } = await import('./lib/local_source_provenance.mjs')); }
catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
const kb = 'OWAOntology';
const artifact = file => `exports/owa_ontology/v1/${file}.csv`;
const hash = char => `sha256:${char.repeat(64)}`;
const response = { primaryKb: { name: kb, artifacts: [] }, supportKbs: [] };
const ownerPath = 'downloads/knowledge_inbox/fixture/document.md';
function row(fields = {}, extra = {}) {
  return { namespace: kb, artifact: artifact('chunk'), contentHash: hash('a'), line: 85, endLine: 102,
    fields: { id: 'LOCAL_1', sourcePath: ownerPath, ...fields }, ...extra };
}
function item(text, { fields = {}, extra = {}, units = [{ text, facet: 'fields' }], score = 10 } = {}) {
  const parsed = row({ content: text, ...fields }, extra);
  const hit = { line: parsed.line, endLine: parsed.endLine, score, recordId: parsed.fields.id,
    bodyField: 'content', bodyText: text, bodyDisplayText: text, snippet: 'SHORT_UNQUALIFIED_PREVIEW',
    source: { recordId: parsed.fields.id, sourceUrl: null, owningPath: parsed.fields.sourcePath,
      sourceDocumentRefId: parsed.fields.sourceDocumentRefId || null, title: 'Fixture' } };
  Object.defineProperty(hit, 'owa', { value: { row: parsed, units, facets: units.map(u => u.facet), ownerIds: ['opaque:owner'] } });
  return { kb: parsed.namespace, artifact: parsed.artifact, contentHash: parsed.contentHash,
    observedAt: '2099-01-01T00:00:00Z', hits: [hit], excerpt: hit.snippet };
}
const answerFor = (...items) => api.buildPragmaticAnswer('OWA mapowanie pól', response, items);
function noFilesystem(run) {
  const originals = ['readFileSync', 'realpathSync', 'statSync', 'existsSync'].map(key => [key, fs[key]]);
  let calls = 0;
  for (const [key] of originals) fs[key] = () => { calls++; throw new Error('Local provenance must be pure'); };
  try { const value = run(); assert.equal(calls, 0); return value; }
  finally { for (const [key, value] of originals) fs[key] = value; }
}
after(() => {
  for (const [object, key, value] of saved) object[key] = value;
  syncBuiltinESMExports();
  fs.rmSync(root, { recursive: true, force: true });
});

test('URL-less exact local row yields a full extract and hash-backed citation', () => {
  const text = '## Pola\n| Pole | Warunek |\n| --- | --- |\n| Key | Tylko lokalnie |\nUNKNOWN: API niezweryfikowane.';
  const input = item(text);
  const answer = noFilesystem(() => answerFor(input));
  assert.equal(answer.sources.length, 1);
  assert.equal(answer.extracts[0].text, text);
  const source = answer.sources[0];
  assert.equal(source.kind, 'local_artifact');
  assert.equal(source.namespace, kb);
  assert.equal(source.artifact, artifact('chunk'));
  assert.equal(source.recordId, 'LOCAL_1');
  assert.equal(source.locator, 'L85-L102');
  assert.equal(source.contentHash, hash('a'));
  assert.equal(source.sourceUrl, null);
  for (const date of ['publication', 'update', 'retrieved']) assert.equal(source[date].value, null);
  const extract = answer.extracts[0];
  assert.equal(extract.kind, 'local_artifact');
  assert.equal(extract.locator, source.locator);
  assert.equal(extract.recordId, source.recordId);
  assert.deepEqual(extract.facets, ['fields']);
  const md = api.renderAnswerMarkdown(answer);
  for (const value of [text, artifact('chunk'), 'L85-L102', 'LOCAL_1']) assert(md.includes(value));
  assert(md.includes(`[S1] ${artifact('chunk')}, linie 85–102:\n${text}`), 'the complete qualified unit has its physical citation');
  assert(md.includes(`- [S1] ${source.title || 'LOCAL_1'} — ${kb}; ${artifact('chunk')} L85-L102; rekord LOCAL_1`));
  assert.equal(extract.sourceKey, source.key);
  assert.equal(source.owningPath, ownerPath, 'full ownership remains in public JSON alongside the hash');
  assert(!md.includes('URL: null'));
  assert(!md.includes('2099-01-01'));
  assert(!JSON.stringify(answer).includes('SHORT_UNQUALIFIED_PREVIEW'));
  assert(!JSON.stringify(answer).includes('owaSelection'));
  assert(!JSON.stringify(answer).includes('ownerIds'));
  assert(!Object.hasOwn(answer.evidence[0].hits[0], 'bodyText'));
  assert.equal(input.hits[0].snippet, 'SHORT_UNQUALIFIED_PREVIEW');
});

test('pure descriptor accepts only five configured artifacts and literal scanner provenance', () => {
  assert.equal(typeof describeLocalSource, 'function');
  noFilesystem(() => {
    for (const file of ['chunk', 'ontology_entity', 'ontology_field', 'ontology_relation', 'workflow_pattern']) {
      const source = describeLocalSource(row({}, { artifact: artifact(file) }));
      assert.deepEqual(source, { kind: 'local_artifact', recordId: 'LOCAL_1', artifact: artifact(file),
        locator: 'L85-L102', contentHash: hash('a'), owningPath: ownerPath, sourceUrl: null });
    }
    assert.equal(describeLocalSource(row({}, { line: 1, endLine: 1 })).locator, 'L1');
    for (const bad of ['../secret', '/exports/owa_ontology/v1/chunk.csv', 'exports/owa_ontology/v1/other.csv',
      'exports/owa_ontology/v1/./chunk.csv', 'exports/owa_ontology/v1/../v1/chunk.csv',
      'exports\\owa_ontology\\v1\\chunk.csv', artifact('chunk') + '\0', 'exports/owa_ontology/v1/%63hunk.csv']) {
      assert.equal(describeLocalSource(row({}, { artifact: bad })), null, bad);
    }
    for (const changes of [{ namespace: 'NotAllowedFixture' }, { namespace: null },
      { contentHash: 'sha256:fixture' }, { contentHash: 'a'.repeat(64) }, { contentHash: hash('z') },
      { line: 0 }, { line: 1.5 }, { line: '85' }, { endLine: 84 }, { endLine: null }]) {
      assert.equal(describeLocalSource(row({}, changes)), null, JSON.stringify(changes));
    }
    for (const id of ['', ' ', null]) assert.equal(describeLocalSource(row({ id })), null);
  });
});

test('owner paths are display-only, safe or absent; hostile and symlink-like paths cause zero reads', () => {
  assert.equal(typeof describeLocalSource, 'function');
  const unsafe = ['/etc/passwd', '../secrets', 'downloads/knowledge_inbox/../secrets',
    'downloads/knowledge_inbox/./a.md', 'downloads/knowledge_inbox//a.md',
    'downloads\\knowledge_inbox\\a.md', 'downloads/knowledge_inbox/%2e%2e/a.md',
    'data/private.json', 'https://example.test/a.md', 'downloads/knowledge_inbox/a.md\nsecret',
    'docs/reference/knowledge_inbox/promoted/Foreign/a.md'];
  noFilesystem(() => {
    for (const sourcePath of unsafe) {
      assert.equal(describeLocalSource(row({ sourcePath })).owningPath, null, sourcePath);
      assert.equal(answerFor(item('Pełny warunek.', { fields: { sourcePath } })).sources[0].owningPath, null);
    }
    for (const sourcePath of [null, '', 'downloads/knowledge_inbox/symlink/a.md',
      `docs/reference/knowledge_inbox/promoted/${kb}/fixture.md`]) {
      assert.equal(describeLocalSource(row({ sourcePath })).owningPath, sourcePath || null);
    }
  });
});

test('exact 4000 chars fit and 4001 chars omit whole units without a preview leak', () => {
  const boundary = answerFor(item('w'.repeat(4000)));
  assert.equal(boundary.extracts[0]?.text.length, 4000);
  assert.deepEqual(boundary.omissions, []);
  const overflow = answerFor(item('w'.repeat(4001)));
  assert.deepEqual(overflow.extracts, []);
  assert.equal(overflow.omissions[0]?.reason, 'answer_budget');
  assert.deepEqual(overflow.omissions[0]?.missingFacets, ['fields']);
  assert(!JSON.stringify(overflow).includes('SHORT_UNQUALIFIED_PREVIEW'));
  assert(!api.renderAnswerMarkdown(overflow).includes('SHORT_UNQUALIFIED_PREVIEW'));
  assert(!JSON.stringify(overflow).includes('w'.repeat(4001)));
  const md = api.renderAnswerMarkdown(overflow);
  assert.match(md, /Pominięcia: 1 jednostek \(answer_budget: 1\)/);
  assert.match(md, /Brak pokrycia: fields\./);
  assert.deepEqual(overflow.owaCoverage.missingFacets, ['fields']);
  assert.equal(overflow.omissions[0].recordId, 'LOCAL_1');
});

test('actual selected units count once per text with combined facets, not body preview', () => {
  const full = '## Pola\n| Pole | SQL |\n| --- | --- |\n| Key | int |\n\nTylko w buforze; UNKNOWN: brak enum.';
  const input = item('LOSSY_SUMMARY', { units: [{ text: full, facet: 'fields' }, { text: full, facet: 'identifiers' }] });
  const answer = answerFor(input);
  assert.equal(answer.extracts.length, 1);
  assert.equal(answer.extracts[0].text, full);
  assert.deepEqual(answer.extracts[0].facets, ['fields', 'identifiers']);
  assert(!JSON.stringify(answer).includes('LOSSY_SUMMARY'));
});

test('generic artifact preview cap cannot discard complete selected OWA units before actual budgets', () => {
  const local = item('BODY', { fields: { id: 'IMPORTANT' }, score: 0,
    units: [{ text: 'Pełne żądane mapowanie, tylko warunkowo.', facet: 'fields' }] });
  const metadata = ['ontology_entity', 'ontology_field', 'ontology_relation', 'workflow_pattern'].map(file =>
    item('Generic', { fields: { id: `M_${file}` }, extra: { artifact: artifact(file) }, score: 100,
      units: [{ text: 'Generic metadata.', facet: 'overview' }] }));
  const support = { kb: 'ComarchOptimaSchema', artifact: 'fixture/table.csv',
    hits: [{ line: 1, score: 100, bodyField: 'technical_fields', snippet: 'Technical' }] };
  const scoped = { ...response, supportKbs: [{ name: support.kb, artifacts: [] }] };
  const answer = api.buildPragmaticAnswer('OWA mapowanie pól', scoped, [...metadata, support, local]);
  assert.equal(answer.evidence.length, 5); // legacy previews retain their cap
  assert(answer.extracts.some(e => e.recordId === 'IMPORTANT'));
});

test('facets merge when exact URL version has both a legacy unit and an OWA unit', () => {
  const text = 'Pełne źródło, tylko warunkowo.';
  const selected = item(text);
  selected.hits[0].source = { recordId: 'A', sourceUrl: 'https://example.test/exact',
    sourceOrigin: 'official', owningPath: 'ordinary/exact.md', csvDates: { publishedAt: '2025-12' } };
  const legacy = { ...selected, hits: [{ ...selected.hits[0] }] };
  const answer = answerFor(legacy, selected);
  assert.equal(answer.extracts.length, 1);
  assert.deepEqual(answer.extracts[0].facets, ['fields']);
  assert.equal(answer.extracts[0].owa.row, selected.hits[0].owa.row);
});

test('empty selected OWA units never fall back to a lossy body or summary', () => {
  const answer = answerFor(item('LOSSY_BODY_MUST_NOT_REENTER', { units: [] }));
  assert.deepEqual(answer.extracts, []);
  assert(!JSON.stringify(answer).includes('LOSSY_BODY_MUST_NOT_REENTER'));
  assert(!JSON.stringify(answer).includes('SHORT_UNQUALIFIED_PREVIEW'));
});

test('local over-budget nested table and qualifiers are omitted together, including URL-source controls', () => {
  const table = '## Reguły\nWyłącznie w buforze.\n\n### Pola\n| Pole | Typ |\n| --- | --- |\n'
    + '| Key | int |\n| Other | ' + 'x'.repeat(4000) + ' |\n\nUNKNOWN: wynik niezweryfikowany.';
  const local = item('Lossy', { units: [{ text: table, facet: 'fields' }] });
  const external = item('Lossy', { units: [{ text: table, facet: 'fields' }] });
  external.hits[0].source = { recordId: 'URL', sourceUrl: 'https://example.test/exact', sourceOrigin: 'official' };
  for (const input of [local, external]) {
    const answer = answerFor(input);
    assert.deepEqual(answer.extracts, []);
    assert.equal(answer.omissions[0].reason, 'answer_budget');
    assert.deepEqual(answer.omissions[0].missingFacets, ['fields']);
    assert(!JSON.stringify(answer).includes('SHORT_UNQUALIFIED_PREVIEW'));
    assert(!JSON.stringify(answer).includes('| Key | int |'));
  }
});

test('three actual units per source prioritize requested facets and UNKNOWN before overview', () => {
  const units = [{ text: 'Generic overview fields fields fields', facet: 'overview' },
    { text: 'UNKNOWN: mapowanie wymaga potwierdzenia.', facet: 'unknownEnums' },
    ...[1, 2, 3].map(i => ({ text: `| Pole${i} | int |\nWarunkowe; do potwierdzenia.`, facet: 'fields' }))];
  const answer = answerFor(item('NEVER_BODY', { units }));
  assert.equal(answer.extracts.length, 3);
  assert(answer.extracts.every(e => e.facets.includes('fields')));
  assert.equal(answer.omissions.filter(o => o.reason === 'section_limit').length, 2);
  const fewer = answerFor(item('NEVER_BODY', { units: units.slice(0, 4) }));
  assert.equal(fewer.extracts.length, 3);
  assert(fewer.extracts.some(e => e.text.startsWith('UNKNOWN:')));
  assert(!fewer.extracts.some(e => e.facets.includes('overview')));
});

test('literal CONFLICT unit precedes generic metadata without changing its source status', () => {
  const units = [1, 2, 3].map(i => ({ text: `SampleProduct generic metadata ${i}.`, facet: 'overview' }));
  units.push({ text: 'CONFLICT: source statuses disagree; do not infer a verified mapping.', facet: 'overview' });
  const input = item('LOSSY', { units, fields: { status: 'CONFLICT' } });
  const answer = api.buildPragmaticAnswer('OWA SampleProduct', response, [input]);
  assert.equal(answer.extracts.length, 3);
  assert.equal(answer.extracts[0].text, units[3].text);
  assert.equal(answer.evidenceAssessment.status, 'insufficient_evidence');
  assert(answer.evidenceAssessment.reasons.includes('source_explicit_ambiguity'));
  assert.equal(answer.owaCoverage.status, 'ambiguous');
  assert.equal(input.hits[0].owa.row.fields.status, 'CONFLICT');
  assert.equal(answer.extracts[0].owa.row.fields.status, 'CONFLICT');
  assert(api.renderAnswerMarkdown(answer).includes(units[3].text));
  assert(answer.answerNotes.some(note => note.includes(artifact('chunk'))
    && note.includes('LOCAL_1') && note.includes('overview') && note.includes('konflikt')));
});

test('two sources and shared 4000-char budget apply to emitted units with facet omissions', () => {
  const inputs = [1, 2, 3].map(i => item('BODY', { fields: { id: `R${i}` },
    units: [1, 2, 3, 4].map(j => ({ text: `${i}:${j} ` + 'x'.repeat(697), facet: 'fields' })) }));
  const answer = answerFor(...inputs);
  assert.equal(answer.sources.length, 2);
  assert(answer.extracts.reduce((sum, e) => sum + e.text.length, 0) <= 4000);
  assert(answer.omissions.some(o => o.reason === 'source_limit' && o.missingFacets.includes('fields')));
  assert(answer.omissions.some(o => o.reason === 'answer_budget' && o.missingFacets.includes('fields')));
  assert(!JSON.stringify(answer).includes('SHORT_UNQUALIFIED_PREVIEW'));
});

test('local grouping requires explicit source ref plus same safe owner and scanner version', () => {
  const a = item('Same complete text.', { fields: { id: 'A', sourceDocumentRefId: 'EXACT' } });
  const b = item('Second condition.', { fields: { id: 'B', sourceDocumentRefId: 'EXACT' }, extra: { line: 103, endLine: 105 } });
  const combined = answerFor(a, b);
  assert.equal(combined.sources.length, 1);
  assert.deepEqual(combined.sources[0].recordIds, ['A', 'B']);
  assert.deepEqual(combined.sources[0].records.map(r => r.locator), ['L85-L102', 'L103-L105']);
  for (const changes of [{ id: 'B', sourceDocumentRefId: 'ALIAS' },
    { id: 'B', sourceDocumentRefId: 'EXACT', sourcePath: null },
    { id: 'B', sourceDocumentRefId: 'EXACT', sourcePath: 'downloads/knowledge_inbox/fixture/other.md' }]) {
    assert.equal(answerFor(a, item('Same complete text.', { fields: changes })).sources.length, 2);
  }
  const version = item('Same complete text.', { fields: { id: 'B', sourceDocumentRefId: 'EXACT' }, extra: { contentHash: hash('b') } });
  assert.equal(answerFor(a, version).extracts.length, 2);
  const dated = item('Same complete text.', { fields: { id: 'B', sourceDocumentRefId: 'EXACT', publishedAt: '2026-01' } });
  assert.equal(answerFor(a, dated).sources.length, 2);
  // A shared topic/path/URL or reference-ID alias is never enough.
  assert.equal(answerFor(item('Same complete text.', { fields: { id: 'A' } }),
    item('Same complete text.', { fields: { id: 'B' } })).extracts.length, 2);
});

test('missing owner path still cites exact entity row without guessed grouping', () => {
  const input = item('Pełny opis encji.', { fields: { id: 'ENTITY', sourcePath: null }, extra: { artifact: artifact('ontology_entity') } });
  const answer = answerFor(input);
  assert.equal(answer.sources[0]?.owningPath, null);
  assert.equal(answer.sources[0]?.recordId, 'ENTITY');
  assert.equal(answer.extracts[0]?.artifact, artifact('ontology_entity'));
});

test('promoted/observed timestamps never become local publication and explicit source dates validate', () => {
  const input = item('Warunkowe.', { fields: { publishedAt: '2026-10-15', promotedAt: '2026-10-15',
    sourceOrigin: 'promoted_knowledge_draft', sourcePublicationDate: '2025-12',
    sourceUpdatedAt: '2026-02-27T18:03:45+01:00', sourceRetrievedAt: '2026-03-01T09:00:00Z' } });
  const source = noFilesystem(() => answerFor(input)).sources[0];
  assert.equal(source?.publication.value, '2025-12');
  assert.equal(source?.update.value, '2026-02-27T18:03:45+01:00');
  assert.equal(source?.retrieved.value, '2026-03-01T09:00:00Z');
  const unknown = answerFor(item('Warunkowe.', { fields: { publishedAt: '2026-10-15', promotedAt: '2026-10-15',
    sourceOrigin: 'promoted_knowledge_draft' } })).sources[0];
  assert.equal(unknown?.publication.value, null);
  const invalid = answerFor(item('Warunkowe.', { fields: { sourcePublicationDate: '2025-02-29' } })).sources[0];
  assert.equal(invalid?.publication.reason, 'invalid_source_date');
});

test('OWA URL-bearing hits use complete private units while preserving URL resolver provenance', () => {
  const input = item('LOSSY_SUMMARY', { units: [{ text: 'Pełne źródło, tylko warunkowo.', facet: 'fields' }] });
  input.hits[0].source = { ...input.hits[0].source, sourceUrl: 'https://example.test/exact',
    sourceOrigin: 'official', owningPath: 'ordinary/exact.md', csvDates: { publishedAt: '2025-12' } };
  const answer = answerFor(input);
  assert.equal(answer.sources[0]?.kind, 'external_url');
  assert.equal(answer.sources[0]?.sourceUrl, 'https://example.test/exact');
  assert.equal(answer.sources[0]?.publication.value, '2025-12');
  assert.equal(answer.extracts[0]?.text, 'Pełne źródło, tylko warunkowo.');
  assert(!JSON.stringify(answer).includes('LOSSY_SUMMARY'));
});

test('structured OWA URL rows remain substantive when the legacy body field is technical', () => {
  const input = item('RAW_TECHNICAL_PREVIEW', { units: [{ text: '| Pole | Typ |\n| --- | --- |\n| Key | int |\nUNKNOWN: API niezweryfikowane.', facet: 'fields' }] });
  input.hits[0].bodyField = 'technical_fields';
  input.hits[0].source = { recordId: 'URL_FIELD', sourceUrl: 'https://example.test/exact',
    sourceOrigin: 'official', owningPath: 'ordinary/exact.md', csvDates: { publishedAt: '2025-12' } };
  const answer = answerFor(input);
  assert.equal(answer.sources[0]?.kind, 'external_url');
  assert.equal(answer.sources[0]?.publication.value, '2025-12');
  assert.equal(answer.extracts[0]?.text, input.hits[0].owa.units[0].text);
  assert(!JSON.stringify(answer).includes('SHORT_UNQUALIFIED_PREVIEW'));
  assert(!api.renderAnswerMarkdown(JSON.parse(JSON.stringify(answer))).includes('SHORT_UNQUALIFIED_PREVIEW'));
  const empty = item('LOSSY_BODY_MUST_NOT_REENTER', { units: [] });
  empty.hits[0].bodyField = 'technical_fields';
  empty.hits[0].source = input.hits[0].source;
  assert(!JSON.stringify(answerFor(empty)).includes('SHORT_UNQUALIFIED_PREVIEW'));
  const legacy = { ...input, hits: [{ ...input.hits[0] }] };
  const legacyAnswer = answerFor(legacy);
  assert.deepEqual(legacyAnswer.extracts, []);
  assert(api.renderAnswerMarkdown(legacyAnswer).includes('SHORT_UNQUALIFIED_PREVIEW'));
});

test('empty/excluded scope and invalid local citation never acquire invented source identity', () => {
  noFilesystem(() => {
    assert.deepEqual(api.assembleSourceExtracts('OWA', [item('Hidden')], new Set(), root), { sources: [], extracts: [], omissions: [] });
    for (const extra of [{ artifact: '../secret' }, { namespace: 'Foreign' }, { contentHash: 'sha256:bad' }]) {
      assert.deepEqual(api.assembleSourceExtracts('OWA', [item('Hidden', { extra })], new Set([kb]), root),
        { sources: [], extracts: [], omissions: [] });
    }
  });
});

test('exact row binding prevents citation substitution or downgrading a declared URL to local', () => {
  noFilesystem(() => {
    for (const change of [input => { input.artifact = artifact('ontology_entity'); },
      input => { input.contentHash = hash('b'); }, input => { input.hits[0].line = 84; },
      input => { input.hits[0].owa.row.fields.sourceUrl = 'https://example.test/declared'; }]) {
      const input = item('Guarded');
      change(input);
      assert.deepEqual(api.assembleSourceExtracts('OWA', [input], new Set([kb]), root),
        { sources: [], extracts: [], omissions: [] });
    }
  });
});

test('actual scanner and gatherer render complete field rows and preserve original bytes/physical locators', () => {
  const fields = { id: 'opaque:entity', name: 'Produkt syntetyczny', canonicalName: 'Produkt syntetyczny',
    ontologyId: 'OWAOntology.Synthetic', description: '## Pola\nPola są wyłącznie lokalne.', semanticType: 'ontology_entity' };
  const encode = rows => rows.map(cells => cells.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n') + '\r\n';
  const write = (file, records) => {
    const target = path.join(root, artifact(file));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const bytes = encode([Object.keys(records[0]), ...records.map(r => Object.values(r))]);
    fs.writeFileSync(target, bytes);
    return bytes;
  };
  write('ontology_entity', [fields]);
  const record = { id: 'opaque:field', entityRefId: fields.id, fieldName: 'SampleKey', mssqlColumn: 'Syn_Key',
    mcpField: 'sampleKey', sqlType: 'int', nullable: 'NO', keyRole: 'PK', mappingStatus: 'UNKNOWN',
    description: 'Tylko w buforze.\nNiezweryfikowane API.', semanticType: 'ontology_field' };
  const bytes = write('ontology_field', [record]);
  const scoped = { primaryKb: { name: kb, artifacts: [artifact('ontology_entity'), artifact('ontology_field')] }, supportKbs: [] };
  const question = 'OWA Produkt syntetyczny mapowanie pól';
  const context = parseOwaQuestion(question);
  const gathered = api.gatherEvidence(scoped, api.extractTerms(question), [], new Set([kb]), [], context);
  const selected = gathered.find(i => i.artifact === artifact('ontology_field')).hits[0];
  const answer = noFilesystem(() => api.buildPragmaticAnswer(question, scoped, gathered));
  const extract = answer.extracts.find(e => e.recordId === record.id);
  assert.equal(extract?.text, owaUnitsForRow(context, selected.owa.row)[0].text);
  assert.equal(extract?.contentHash, `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`);
  assert.equal(extract?.line, 2);
  assert.equal(extract?.endLine, 3);
  assert.equal(extract?.locator, 'L2-L3');
  const md = api.renderAnswerMarkdown(answer);
  for (const value of ['Syn_Key', 'sampleKey', 'nullable', 'keyRole', 'UNKNOWN', 'Tylko w buforze.', 'Niezweryfikowane API.']) assert(md.includes(value));
});

test('network/process attempts and draft/learning writes remain zero', () => {
  assert.equal(blockedCalls, 0);
  assert(!fs.existsSync(path.join(root, 'downloads')));
  assert(!fs.existsSync(path.join(root, 'docs')));
});
