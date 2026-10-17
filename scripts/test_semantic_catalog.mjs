#!/usr/bin/env node
// Pure, synthetic rows: no filesystem, corpus, providers or runtime state.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveSemanticSubjects } from './lib/semantic_requirements.mjs';
const module = await import('./lib/semantic_catalog.mjs').catch(error => {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  return {};
});
const build = (...args) => {
  assert.equal(typeof module.buildSemanticCatalog, 'function', 'buildSemanticCatalog must exist');
  return module.buildSemanticCatalog(...args);
};
const scope = new Set(['OWAOntology', 'ComarchOptimaBusinessSemantics']);
const row = (id, name, description = '', extra = {}, kind = 'ontology_entity') => ({
  namespace: 'OWAOntology', artifact: `exports/owa_ontology/v1/${kind}.csv`,
  contentHash: 'sha256:' + 'a'.repeat(64), line: 2, endLine: 18,
  fields: { id, name, canonicalName: name, description, ...extra },
});

test('owned identifier table retains proposed PK, literal status, locator and source', () => {
  const card = row('opaque:card', 'Karta próbna', '## Identyfikatory\n| Typ | Pole | Status |\n| --- | --- | --- |\n| PK | Sample_Key | do potwierdzenia |\n\n## Otwarte problemy\nUNKNOWN: pełny słownik Sample_Tag.');
  const catalog = build([card], scope);
  const field = catalog.fields.find(item => item.name === 'Sample_Key');
  assert.equal(field.ownerId, 'opaque:card');
  assert.equal(field.status, 'do potwierdzenia');
  assert.equal(field.origin, card);
  assert.equal(field.keyRole, 'PK');
  assert.equal(field.declaration, 'source');
  assert.equal(field.locator.bodyField, 'description');
  assert.equal(field.locator.line, 4);
  assert.match(field.text, /do potwierdzenia/);
  assert(!catalog.fields.some(item => item.name === 'Sample_Tag'), 'prose UNKNOWN is not a field declaration');
});

test('scope is checked before touching excluded fields; empty scope is empty', () => {
  const forbidden = { namespace: 'Private', get fields() { throw Error('excluded metadata read'); } };
  assert.deepEqual(build([forbidden], scope).identities, []);
  const excluded = { namespace: 'OWAOntology', get fields() { throw Error('empty scope read'); } };
  const empty = build([excluded], new Set());
  for (const key of ['identities', 'fields', 'relations', 'workflows', 'symbols']) assert.deepEqual(empty[key], []);
});

test('literal reference IDs bind ownership; aliases and stripped IDs never do', () => {
  const owner = row('ENCJA_Amber', 'Bursztynowy rejestr', '', { ontologyId: 'OWAOntology.Amber', aliases: 'Wspólny rejestr; AliasRef', mainTable: 'DB.AmberLedger' });
  const fields = ['ENCJA_Amber', 'OWAOntology.Amber', 'Amber', 'AliasRef'].map((entityRefId, i) =>
    row(`field:${i}`, '', '', { entityRefId, fieldName: `Unrelated_${i}`, mappingStatus: 'UNKNOWN' }, 'ontology_field'));
  const catalog = build([owner, ...fields], scope);
  assert.deepEqual(catalog.fields.map(f => f.name), ['Unrelated_0', 'Unrelated_1']);
  assert(catalog.fields.every(f => f.ownerId === 'ENCJA_Amber' && f.status === 'UNKNOWN'));
  assert.equal(catalog.identities[0].origin, owner);
});

test('structured symbols, named code bullets and contradictory declarations stay attributable', () => {
  const source = row('uuid:73', 'Dyspozycja fiołkowa (QVR)', [
    '## Klasyfikacja', '- Symbol: `QVR`; Klasyfikacja: korekta; Status: proponowany',
    '## Pola', '- PK: `Violet_Key`; Status: do potwierdzenia',
    '| Pole | Rola | Status |', '| --- | --- | --- |', '| Violet_Key | PK | CONFIRMED |',
    '| Violet_Tag | enum | UNKNOWN |',
    '## Notatka', 'W innym systemie tabela DB.Unowned ma kolumnę Unowned_Key.',
  ].join('\n'));
  const catalog = build([source], scope);
  const declarations = catalog.fields.filter(f => f.name === 'Violet_Key');
  assert.deepEqual(declarations.map(f => f.status), ['do potwierdzenia', 'CONFIRMED']);
  assert.equal(catalog.fields.find(f => f.name === 'Violet_Tag').status, 'UNKNOWN');
  assert(!catalog.fields.some(f => f.name === 'Unowned_Key'));
  const symbol = catalog.symbols.find(s => s.name === 'QVR');
  assert.equal(symbol.ownerId, 'uuid:73');
  assert.equal(symbol.classification, 'korekta');
  assert.equal(symbol.status, 'proponowany');
  assert.equal(symbol.origin, source);
  assert(!catalog.identities[0].labels.some(l => l.value === 'DB.Unowned'));
});

test('relation and workflow endpoints preserve dangling IDs and declared paths', () => {
  const a = row('uuid:alpha', 'Paczka szmaragdowa');
  const relation = row('edge:1', 'Należy do', '', { sourceEntityRefId: a.fields.id,
    targetEntityRefId: 'ENCJA_Absent', status: 'niezweryfikowana' }, 'ontology_relation');
  const workflow = row('FLOW_EXACT_77', 'Obieg szmaragdowy', '', { workflowName: 'Scalanie szmaragdowe',
    sourceEntityRefId: a.fields.id, targetEntityRefId: 'ENCJA_Absent', description: 'AAA → MISSING → AAA', status: 'UNKNOWN' }, 'workflow_pattern');
  const catalog = build([a, relation, workflow], scope);
  assert.equal(catalog.relations[0].origin, relation);
  assert.deepEqual(catalog.relations[0].endpointRefIds, ['uuid:alpha', 'ENCJA_Absent']);
  assert.deepEqual(catalog.relations[0].unresolvedEndpointIds, ['ENCJA_Absent']);
  assert.equal(catalog.relations[0].status, 'niezweryfikowana');
  assert.deepEqual(catalog.workflows[0].documentPaths, [['AAA', 'MISSING', 'AAA']]);
  assert.equal(catalog.workflows[0].id, 'FLOW_EXACT_77');
  assert(!catalog.identities.some(i => i.id === 'ENCJA_Absent'));
});

test('both allowed namespaces are indexed independently without cross-namespace ref binding', () => {
  const a = row('same:id', 'Karta morska');
  const b = { ...row('same:id', 'Reguła pustynna', 'Uzgadnianie piaskowych przesyłek.'),
    namespace: 'ComarchOptimaBusinessSemantics', artifact: 'exports/business/v1/business_description.csv' };
  const field = row('field:77', '', '', { entityRefId: 'same:id', fieldName: 'Sea_Key' }, 'ontology_field');
  const before = JSON.stringify([a, b, field]);
  const catalog = build([a, b, field], scope);
  assert.equal(catalog.identities.length, 2);
  assert.equal(catalog.fields.length, 1);
  assert.equal(catalog.fields[0].owner.origin, a);
  assert.equal(JSON.stringify([a, b, field]), before);
  assert.deepEqual(build([a, b], new Set(['ComarchOptimaBusinessSemantics'])).identities.map(i => i.origin), [b]);
});

test('named code declarations require an explicit field or symbol label, not prose mentions', () => {
  const owner = row('code:93', 'Wpis rubinowy', '## Deklaracje\nPK: `Ruby_Key`; Status: proponowany\nSymbol: `RQ`; Klasyfikacja: korekta; Status: UNKNOWN\nDowolny tekst zawiera `Phantom_Key`.');
  const c = build([owner], scope);
  assert.equal(c.fields.find(f => f.name === 'Ruby_Key')?.status, 'proponowany');
  assert.equal(c.symbols.find(s => s.name === 'RQ')?.classification, 'korekta');
  assert(!c.fields.some(f => f.name === 'Phantom_Key'));
});

test('bounded source phrase locators count source lines rather than sentences', () => {
  const owner = row('phrase:91', 'Wpis oliwkowy', 'Pierwsze zdanie. Drugie zdanie.\nUzgadnianie oliwkowych paczek.');
  const c = build([owner], scope);
  const phrase = c.identities[0].phrases.find(p => p.text === 'Uzgadnianie oliwkowych paczek');
  assert.equal(phrase.locator.line, 2);
  assert.equal(phrase.origin, owner);
});
test('Task4 metadata parenthetical descriptions retain their bounded natural base label without inventing document symbols', () => {
  const input = [row('opaque:elm', 'Rejestr wiązowy (ewidencja przesyłek)', 'Rejestr zawiera ustrukturyzowane zapisy.'),
    row('opaque:amber', 'Karta bursztynowa (ewidencja katalogowa)', 'Opis zawiera informacje uzupełniające.')];
  const catalog = build(input, scope);
  for (const [query, id] of [['Opisz Rejestr wiązowy i jego klucz', 'opaque:elm'], ['Klucz Karty bursztynowej', 'opaque:amber']]) {
    const r = resolveSemanticSubjects(query, 'entity', catalog);
    assert.deepEqual(r.subjects.map(s => s.id), [id]);
    assert.deepEqual(r.ambiguities, []);
  }
  assert(!catalog.symbols.some(s => /ewidencja/.test(s.name)));
});
