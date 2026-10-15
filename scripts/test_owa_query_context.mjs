#!/usr/bin/env node
// Pure synthetic metadata only: no filesystem, network, learning or draft I/O.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isExplicitOwaQuestion, parseOwaQuestion, resolveOwaOwners } from './lib/owa_query_context.mjs';

const entity = (id, canonicalName, extra = {}) => ({
  artifact: 'exports/owa_ontology/v1/ontology_entity.csv',
  fields: { id, semanticType: 'ontology_entity', canonicalName, ...extra },
});
const field = (entityRefId, fieldName, extra = {}) => ({
  artifact: 'exports/owa_ontology/v1/ontology_field.csv',
  fields: { id: `field:${entityRefId}:${fieldName}`, semanticType: 'ontology_field', entityRefId, fieldName, ...extra },
});
const rows = [
  entity('opaque:party-7', 'Uczestnik', { ontologyId: 'OWAOntology.Uczestnik', name: 'Partner obrotu',
    aliases: 'Podmiot testowy; Strona umowy', mainTable: 'CDN.TestParties' }),
  entity('opaque:price-9', 'Taryfa', { ontologyId: 'OWAOntology.Taryfa', aliases: '["Plan cenowy", "Cennik testowy"]' }),
  entity('ENCJA_ExactOnly', 'Rezerwacja testowa', { ontologyId: 'OWAOntology.ReservationSample' }),
  field('opaque:party-7', 'Party_ExternalKey', { mcpField: 'externalKey', mssqlColumn: 'Tst_ExternalKey' }),
  field('opaque:price-9', 'Price_Value'),
];
const resolve = (question, sourceRows = rows) => resolveOwaOwners(parseOwaQuestion(question), sourceRows);

test('offline integration: parenthetical descriptions keep the complete base identity', () => {
  const source = [entity('violet', 'Partner (rejestr partnerów)'), entity('indigo', 'Produkt (rejestr produktów)')];
  assert.deepEqual(resolve('OWA Partner i ceny produktu', source).ownerIds, ['violet', 'indigo']);
  assert.deepEqual(resolve('OWA rejestr', source).ownerIds, []);
});
test('offline integration: single document-code suffix outranks broad catalogue alias', () => {
  const source = [entity('broad', 'Katalog dokumentów', { aliases: 'PZ' }), entity('specific', 'Przyjęcie próbne (PZ)')];
  assert.deepEqual(resolve('OWA proces PZ → FZ', source).ownerIds, ['specific']);
});
test('offline integration: negated type/axis disclosure still asks for status clarification', () => {
  assert(parseOwaQuestion('OWA stan dokumentu. Nie podano typu dokumentu ani czy chodzi o księgowanie czy obieg.').facets.includes('statusAmbiguity'));
  assert(!parseOwaQuestion('OWA status księgowania dokumentu FS').facets.includes('statusAmbiguity'));
});
test('offline integration: inflected price vocabulary and opaque process identifiers', () => {
  assert(parseOwaQuestion('OWA przechowywanie cen produktu').facets.includes('prices'));
  assert(parseOwaQuestion('OWA słownik wartości State_Tag').facets.includes('unknownEnums'));
  const c = parseOwaQuestion('OWA proces SAMPLE_SHIPMENT_PATH_2468');
  assert.deepEqual(c.qualifiedIds, ['SAMPLE_SHIPMENT_PATH_2468']);
  assert.deepEqual(c.fieldNames, []);
  assert.equal(resolveOwaOwners(c, rows).missing, true);
});
test('offline integration: relation endpoints are not a request for their price values', () => {
  const relation = parseOwaQuestion('OWA relacja produktu z cennikiem i cenami: kardynalność i JOIN');
  assert(relation.facets.includes('relations'));
  assert(relation.facets.includes('cardinality'));
  assert(!relation.facets.includes('prices'));
  assert(parseOwaQuestion('OWA relacja produktu z cenami: JOIN oraz wartości cen netto').facets.includes('prices'));
});

test('explicit OWA uses whole tokens, including qualified identifiers', () => {
  for (const q of ['W ontologii OWA czym jest kontrahent?', 'OWAOntology.TestEntity', 'owa', '(owaontology)', 'OWA: pola']) {
    assert.equal(isExplicitOwaQuestion(q), true, q);
  }
  for (const q of ['Przechowywanie towaru', 'nowa faktura', 'OWAOntologyExtra', 'xOWA', 'OWA_alias', 'żOWA', 'OWAż']) {
    assert.equal(isExplicitOwaQuestion(q), false, q);
  }
});

test('context keeps original question and ordered bounded document codes', () => {
  const question = 'Relacja pz → FZ w OWA; WZ → fs; XPZ PZ_test FZebra PZ';
  const context = parseOwaQuestion(question);
  assert.equal(context.question, question);
  assert.equal(context.explicitOwa, true);
  assert.deepEqual(context.documentCodes, ['PZ', 'FZ', 'WZ', 'FS']);
  assert.deepEqual(parseOwaQuestion('RO→ZD / PA PF PW RW MM').documentCodes, ['RO', 'ZD', 'PA', 'PF', 'PW', 'RW', 'MM']);
});

test('qualified IDs preserve opaque case and do not consume sentence punctuation', () => {
  assert.deepEqual(parseOwaQuestion('OWAOntology.Example').qualifiedIds, ['OWAOntology.Example']);
  assert.deepEqual(parseOwaQuestion('OWAOntology.Example, OWAOntology.Other_2. OWAOntology.Example').qualifiedIds,
    ['OWAOntology.Example', 'OWAOntology.Other_2']);
  assert.deepEqual(parseOwaQuestion('xOWAOntology.Example OWAOntology').qualifiedIds, []);
});

test('normalization folds Polish diacritics without broad substring matching', () => {
  const context = parseOwaQuestion('OWA: Źródła, płatność i CENA');
  assert.equal(context.normalizedQuestion, 'owa: zrodla, platnosc i cena');
  assert(context.tokens.includes('platnosc'));
});

test('extracts quoted, bracketed and qualified table field names', () => {
  const context = parseOwaQuestion('OWA pola `Party_ExternalKey`, "externalKey", [Tst_ExternalKey], „Price_Value” i CDN.TestParties.Party_Id');
  assert.deepEqual(context.fieldNames, ['Party_ExternalKey', 'externalKey', 'Tst_ExternalKey', 'Price_Value', 'CDN.TestParties.Party_Id']);
});

test('bare table-style fields establish a field query without prose hints', () => {
  assert.deepEqual(parseOwaQuestion('Party_ExternalKey w OWA').fieldNames, ['Party_ExternalKey']);
  assert.deepEqual(resolve('Party_ExternalKey w OWA').ownerIds, ['opaque:party-7']);
});

test('qualified identity accepts sentence punctuation but never a longer dotted ID', () => {
  const source = [...rows, entity('other', 'Uczestnik')];
  assert.deepEqual(resolve('Opisz OWAOntology.Uczestnik.', source).ownerIds, ['opaque:party-7']);
  assert.deepEqual(parseOwaQuestion('OWAOntology.Uczestnik.Child.').qualifiedIds, ['OWAOntology.Uczestnik.Child']);
  assert.equal(resolve('OWAOntology.Uczestnik.Child', source).missing, true);
  assert.deepEqual(resolve('OWAOntology.Uczestnik.Child', source).ownerIds, []);
  assert.equal(resolve('OWAOntology.UczestnikExtra', source).missing, true);
});

test('qualified and named endpoints can coexist when exact identifiers are known', () => {
  assert.deepEqual(resolve('Relacja OWAOntology.Uczestnik do taryfy').ownerIds, ['opaque:party-7', 'opaque:price-9']);
});

test('facets describe requested facts without encoding any answers', () => {
  for (const [question, facet] of [
    ['Jakie identyfikatory i klucze ma uczestnik w OWA?', 'identifiers'],
    ['OWA: role odbiorcy i dostawcy', 'roles'],
    ['OWA: ceny i waluty taryfy', 'prices'],
    ['OWA: mapowanie kolumn API i MSSQL', 'fields'],
    ['OWA: powiązanie i JOIN', 'relations'],
    ['OWA: kardynalność i liczność relacji', 'cardinality'],
    ['OWA: przebieg i ograniczenia workflow', 'workflow'],
    ['OWA: pełna lista dopuszczalnych wartości enum', 'unknownEnums'],
    ['Co znaczy stan dokumentu w OWA?', 'statusAmbiguity'],
  ]) assert(parseOwaQuestion(question).facets.includes(facet), `${question}: ${facet}`);
  for (const q of ['OWA: stan płatności dokumentu', 'OWA: status księgowania', 'OWA: stan PZ', 'OWA: etap obiegu dokumentu']) {
    assert(!parseOwaQuestion(q).facets.includes('statusAmbiguity'), q);
  }
});

test('canonical labels allow bounded conservative Polish inflection (identifier paraphrase)', () => {
  assert.deepEqual(resolve('Jakie klucze uczestnika opisuje OWA?').ownerIds, ['opaque:party-7']);
  assert.deepEqual(resolve('OWA: o uczestniku i jego identyfikatorach').ownerIds, ['opaque:party-7']);
  assert.deepEqual(resolve('Identyfikatory współuczestnika w OWA').ownerIds, []);
  assert.deepEqual(resolve('OWA: uczestnictwo oraz taryfikator').ownerIds, []);
});

test('complete multiword inflections support locative softening and plural people labels', () => {
  const source = [entity('register', 'Rejestr testowy'), entity('element', 'Element testowy'),
    entity('person', 'Uczestnik'), entity('invoice', 'Faktura próbna')];
  for (const [question, owner] of [
    ['OWA: klucze w rejestrze testowym', 'register'],
    ['OWA: identyfikatory w elemencie testowym', 'element'],
    ['OWA: jakie role mają uczestnicy?', 'person'],
    ['OWA: pola w fakturze próbnej', 'invoice'],
  ]) assert.deepEqual(resolve(question, source).ownerIds, [owner], question);
  for (const question of ['OWA: rejestracja testowa', 'OWA: elementarny testowy', 'OWA: uczestnictwo']) {
    assert.equal(resolve(question, source).missing, true, question);
  }
});

test('prices paraphrase resolves inflected metadata name rather than benchmark nouns', () => {
  assert.deepEqual(resolve('Jak OWA określa ceny oraz waluty taryfy?').ownerIds, ['opaque:price-9']);
  assert.deepEqual(resolve('Pokaż pola taryfie w OWA').ownerIds, ['opaque:price-9']);
});

test('full multiword names and aliases do not match partial or reordered labels', () => {
  for (const q of ['OWA: partnera obrotu', 'OWA: podmiotu testowego', 'OWA: stroną umowy', 'OWA: plan cenowy']) {
    assert.equal(resolve(q).missing, false, q);
  }
  for (const q of ['OWA: partner', 'OWA: testowy', 'OWA: obrotu partnera', 'OWA: plan cen']) {
    assert.equal(resolve(q).missing, true, q);
  }
});

test('exact opaque IDs outrank words inside them and remain case-sensitive', () => {
  const competing = [...rows, entity('other', 'Uczestnik')];
  assert.deepEqual(resolve('OWAOntology.Uczestnik', competing), {
    ownerIds: ['opaque:party-7'], identityMatches: [{ ownerId: 'opaque:party-7', kind: 'ontologyId' }], missing: false,
  });
  assert.deepEqual(resolve('OWA: opaque:party-7').ownerIds, ['opaque:party-7']);
  assert.deepEqual(resolve('OWA: ENCJA_ExactOnly').ownerIds, ['ENCJA_ExactOnly']);
  assert.equal(resolve('OWAOntology.uczestnik').missing, true);
  assert.equal(resolve('OWA: ExactOnly').missing, true);
  assert.equal(resolve('OWA: OPAQUE:PARTY-7').missing, true);
});

test('qualified unknown ID stays missing even when its words match an existing owner', () => {
  const result = resolve('Co to OWAOntology.UczestnikExtra? Uczestnik ma podobną nazwę.');
  assert.deepEqual(result.ownerIds, []);
  assert.equal(result.missing, true);
  const partial = resolve('Relacja OWAOntology.Uczestnik → OWAOntology.AbsentSample');
  assert.deepEqual(partial.ownerIds, ['opaque:party-7']);
  assert.equal(partial.missing, true);
});

for (const [kind, labelFields] of [
  ['canonicalName', { canonicalName: 'OWAOntology.Sample' }],
  ['name', { name: 'OWAOntology.Sample' }],
  ['alias', { aliases: '["Other label", "OWAOntology.Sample"]' }],
]) {
  test(`literal qualified ${kind} is an exact identity without ontologyId`, () => {
    const source = [entity('opaque:item', 'Unrelated label', labelFields), entity('bare', 'Sample')];
    assert.deepEqual(resolve('OWAOntology.Sample', source), {
      ownerIds: ['opaque:item'], identityMatches: [{ ownerId: 'opaque:item', kind }], missing: false,
    });
    const partial = resolve('OWAOntology.Sample → OWAOntology.Absent', source);
    assert.deepEqual(partial.ownerIds, ['opaque:item']);
    assert.equal(partial.missing, true);
  });
}

test('qualified labels keep case, unknown and non-synthesized-namespace barriers', () => {
  for (const labelFields of [{ canonicalName: 'OWAOntology.Sample' }, { name: 'OWAOntology.Sample' },
    { aliases: 'Other label; OWAOntology.Sample' }]) {
    const source = [entity('opaque:item', 'Unrelated label', labelFields)];
    for (const question of ['OWAOntology.sample', 'owaontology.Sample', 'OWAOntology.Sample.Child', 'OWAOntology.SampleExtra']) {
      assert.deepEqual(resolve(question, source), { ownerIds: [], identityMatches: [], missing: true }, question);
    }
  }
  for (const labelFields of [{ canonicalName: 'Sample' }, { name: 'Sample' }, { aliases: 'Sample' }]) {
    assert.equal(resolve('OWAOntology.Sample', [entity('opaque:item', 'Unrelated label', labelFields)]).missing, true);
  }
});

test('competing literal qualified canonical and alias identities are both retained', () => {
  const source = [entity('one', 'OWAOntology.Sample'), entity('two', 'Other', { aliases: 'OWAOntology.Sample' })];
  assert.deepEqual(resolve('Opisz OWAOntology.Sample.', source), {
    ownerIds: ['one', 'two'], identityMatches: [{ ownerId: 'one', kind: 'canonicalName' }, { ownerId: 'two', kind: 'alias' }],
    missing: false,
  });
});

test('qualified labels do not become invented field-reference IDs', () => {
  const source = [entity('opaque:item', 'Other', { aliases: 'OWAOntology.Sample' }),
    field('OWAOntology.Sample', 'Alias_Reference')];
  assert.equal(resolve('OWA: pole `Alias_Reference`', source).missing, true);
});

test('competing full labels are retained, longer nested labels are preferred', () => {
  const source = [entity('one', 'Grupa testowa'), entity('two', 'Inna', { aliases: 'Grupa testowa' }), entity('short', 'Grupa')];
  const result = resolve('OWA: grupa testowa', source);
  assert.deepEqual(result.ownerIds, ['one', 'two']);
  assert.equal(result.missing, false);
  assert.equal(result.identityMatches.length, 2);
});

test('field-map paraphrase resolves fields through exact entity ownership only', () => {
  for (const q of ['OWA: mapowanie pola `Party_ExternalKey`', 'OWA: kolumna Tst_ExternalKey', 'OWA: pole "externalKey"']) {
    assert.deepEqual(resolve(q).ownerIds, ['opaque:party-7'], q);
  }
  const broken = [entity('ENCJA_ExactOnly', 'Other'), field('ExactOnly', 'Bad_Field')];
  assert.equal(resolve('OWA: pole `Bad_Field`', broken).missing, true);
  assert.equal(resolve('OWA: pole `Bad_Field`', [field('absent', 'Bad_Field')]).missing, true);
});

test('field ownership and main-table metadata preserve competing owners', () => {
  const source = [...rows, field('opaque:price-9', 'Party_ExternalKey')];
  assert.deepEqual(resolve('OWA: pole `Party_ExternalKey`', source).ownerIds, ['opaque:party-7', 'opaque:price-9']);
  assert.deepEqual(resolve('OWA: pola CDN.TestParties').ownerIds, ['opaque:party-7']);
  assert.equal(resolve('OWA: pola CDN.TestPartiesExtra').missing, true);
});

for (const [question, ownerIds] of [
  ['OWA: relacja pola `Party_ExternalKey` do taryfy', ['party', 'tariff']],
  ['OWA: relacja taryfy do pola `Party_ExternalKey`', ['tariff', 'party']],
]) {
  test(`explicit field and named endpoints both resolve in mention order: ${question}`, () => {
    const source = [entity('party', 'Uczestnik'), entity('tariff', 'Taryfa'), field('party', 'Party_ExternalKey')];
    const result = resolve(question, source);
    assert.deepEqual(result.ownerIds, ownerIds);
    assert.deepEqual(result.identityMatches, ownerIds.map(ownerId => ({ ownerId,
      kind: ownerId === 'party' ? 'fieldName' : 'canonicalName' })));
    assert.equal(result.missing, false);
  });
}

test('competing exact field owners survive a separately named endpoint', () => {
  const source = [entity('party', 'Uczestnik'), entity('tariff', 'Taryfa'), entity('alternative', 'Inna encja'),
    field('party', 'Party_ExternalKey'), field('alternative', 'Party_ExternalKey')];
  assert.deepEqual(resolve('OWA: relacja pola `Party_ExternalKey` do taryfy', source).ownerIds,
    ['party', 'alternative', 'tariff']);
  assert.deepEqual(resolve('OWA: relacja taryfy do pola `Party_ExternalKey`', source).ownerIds,
    ['tariff', 'party', 'alternative']);
});

test('owner order follows endpoint mentions rather than input row order', () => {
  assert.deepEqual(resolve('OWA: relacja taryfy do uczestnika').ownerIds, ['opaque:price-9', 'opaque:party-7']);
  assert.deepEqual(resolve('OWAOntology.Taryfa → OWAOntology.Uczestnik').ownerIds, ['opaque:price-9', 'opaque:party-7']);
});

test('rows and context are immutable; summary words never establish ownership', () => {
  const source = [...rows, entity('noise', 'Niepowiązana', { summary: 'Uczestnik taryfa Party_ExternalKey' })];
  const context = parseOwaQuestion('OWA: uczestnik');
  const before = JSON.stringify({ source, context });
  assert.deepEqual(resolveOwaOwners(context, source).ownerIds, ['opaque:party-7']);
  assert.equal(JSON.stringify({ source, context }), before);
  assert.equal(resolveOwaOwners(parseOwaQuestion('OWA'), []).missing, true);
});
