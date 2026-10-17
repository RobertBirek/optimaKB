#!/usr/bin/env node
// Synthetic metadata only. These tests never load the answer engine or corpus.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSemanticCatalog } from './lib/semantic_catalog.mjs';
import { parseOwaQuestion } from './lib/owa_query_context.mjs';
const module = await import('./lib/semantic_requirements.mjs').catch(error => {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  return {};
});
const invoke = (name, ...args) => {
  assert.equal(typeof module[name], 'function', `${name} must exist`);
  return module[name](...args);
};
const row = (id, name, extra = {}, kind = 'ontology_entity') => ({
  namespace: 'OWAOntology', artifact: `exports/owa_ontology/v1/${kind}.csv`,
  contentHash: 'sha256:' + 'b'.repeat(64), line: 2, endLine: 14,
  fields: { id, name, canonicalName: name, ...extra },
});
const card = row('opaque:card', 'Karta próbna', { ontologyId: 'OWAOntology.SampleCard', aliases: 'Kartoteka turkusowa; Wspólny alias',
  mainTable: 'DB.UnrelatedCards', description: 'Produkt Comarch występuje często.\nEwidencjonowanie turkusowych przesyłek.\n## Identyfikatory\n| Typ | Pole | Status |\n| --- | --- | --- |\n| PK | Sample_Key | do potwierdzenia |\n| enum | Sample_Tag | UNKNOWN |' });
const group = row('opaque:group', 'Grupa próbna', { aliases: 'Zbiór szmaragdowy; Wspólny alias', mainTable: 'DB.UnrelatedGroups', description: 'Produkt Comarch występuje często.' });
const other = row('unrelated:55', 'Obiekt niebieski', { description: 'Produkt Comarch występuje często.\nEwidencjonowanie zwykłych przesyłek.' });
const edge = row('edge:cg', 'Przypisanie próbne', { sourceEntityRefId: card.fields.id,
  targetEntityRefId: group.fields.id, status: 'logiczna, formalny FK do potwierdzenia' }, 'ontology_relation');
const process = row('FLOW_SAMPLE_77', 'Obieg lawendowy', { workflowName: 'Łączenie lawendowe',
  sourceEntityRefId: group.fields.id, targetEntityRefId: other.fields.id }, 'workflow_pattern');
const rows = [card, group, other, edge, process];
const catalog = buildSemanticCatalog(rows, new Set(['OWAOntology']));
const plan = (question, intent = 'entity', source = catalog) => invoke('buildSemanticRequestPlan', question, intent, source);
const resolve = (question, source = catalog, intent = 'entity') => invoke('resolveSemanticSubjects', question, intent, source);
const has = (p, ownerId, facet) => p.requirements.some(r => r.ownerId === ownerId && r.facet === facet);

for (const question of [
  'Encja Karta próbna: jej klucz i relacja do grupy próbnej',
  'Z grupą próbną powiązana karta próbna: podaj jej klucz i relację',
  'Do grupy próbnej: relacja karty próbnej i jej klucz',
]) test(`primary identifiers do not leak to an endpoint: ${question}`, () => {
  const p = plan(question);
  assert(p.subjects.some(s => s.id === card.fields.id && s.role === 'primary'));
  assert(p.subjects.some(s => s.id === group.fields.id && s.role === 'endpoint'));
  assert(has(p, card.fields.id, 'identifiers'));
  assert(!has(p, group.fields.id, 'identifiers'));
  const relation = p.requirements.find(r => r.facet === 'relations');
  assert.deepEqual(new Set(relation.endpointOwnerIds), new Set([card.fields.id, group.fields.id]));
  assert(relation.evidence.some(e => e.origin === edge));
});

test('explicit comparison reserves both explanations in either mention order', () => {
  for (const names of ['kartę próbną i grupę próbną', 'grupę próbną oraz kartę próbną']) {
    const p = plan(`Porównaj ${names}: opis i klucze`, 'concept');
    assert.equal(p.subjects.length, 2);
    assert(p.subjects.some(s => s.role === 'comparison'));
    for (const id of [card.fields.id, group.fields.id]) {
      assert(has(p, id, 'overview'));
      assert(has(p, id, 'identifiers'));
    }
  }
});

test('another synthetic inflected pair works without entity-specific maps', () => {
  const a = row('uuid:846', 'Rejestr miedziany', { aliases: 'Spis perłowy' });
  const b = row('uuid:907', 'Element bursztynowy');
  const relation = row('edge:ab', '', { sourceEntityRefId: a.fields.id, targetEntityRefId: b.fields.id }, 'ontology_relation');
  const c = buildSemanticCatalog([b, relation, a], new Set(['OWAOntology']));
  const p = plan('W rejestrze miedzianym: jego identyfikatory i relacja do elementu bursztynowego', 'entity', c);
  assert(has(p, a.fields.id, 'identifiers'));
  assert(!has(p, b.fields.id, 'identifiers'));
  assert.deepEqual(resolve('Opisz spis perłowy', c).subjects.map(s => s.id), [a.fields.id]);
});

test('qualified field binds its literal owner, wrong qualifier stays unresolved', () => {
  const p = plan('Słownik wartości DB.UnrelatedCards.Sample_Tag');
  assert(has(p, card.fields.id, 'unknownEnums'));
  assert.equal(p.requirements.find(r => r.facet === 'unknownEnums').fieldName, 'DB.UnrelatedCards.Sample_Tag');
  const wrong = plan('Słownik wartości DB.UnrelatedGroups.Sample_Tag');
  assert.equal(wrong.subjects.length, 0);
  assert(wrong.unresolved.some(u => u.kind === 'field' && u.value === 'DB.UnrelatedGroups.Sample_Tag'));
  assert.equal(wrong.requirements.length, 0);
});

test('source declared field and separate workflow never form field × facets', () => {
  const p = plan('Pole `Sample_Tag`: słownik wartości; niezależnie opisz proces FLOW_SAMPLE_77');
  assert(has(p, card.fields.id, 'unknownEnums'));
  const workflows = p.requirements.filter(r => r.facet === 'workflow');
  assert.equal(workflows.length, 1);
  assert.equal(workflows[0].processId, 'FLOW_SAMPLE_77');
  assert(!Object.hasOwn(workflows[0], 'fieldName'));
  assert(!p.requirements.some(r => r.ownerId === card.fields.id && r.facet === 'workflow'));
});

test('coordinated owner-specific requests retain each local facet', () => {
  const p = plan('Klucz karty próbnej oraz pola grupy próbnej');
  assert(has(p, card.fields.id, 'identifiers'));
  assert(has(p, group.fields.id, 'fields'));
  assert(!has(p, group.fields.id, 'identifiers'));
  assert(!has(p, card.fields.id, 'fields'));
});

test('two independent relations have local endpoints, auxiliary mentions add no obligations', () => {
  const p = plan('Klucz karty próbnej; relacja karty próbnej do grupy próbnej; relacja grupy próbnej do obiektu niebieskiego; w kontekście obiektu niebieskiego');
  const relations = p.requirements.filter(r => r.facet === 'relations');
  assert.equal(relations.length, 2);
  assert.deepEqual(relations.map(r => new Set(r.endpointOwnerIds)), [
    new Set([card.fields.id, group.fields.id]), new Set([group.fields.id, other.fields.id]),
  ]);
  const auxiliary = plan('Klucz karty próbnej w kontekście obiektu niebieskiego');
  assert.equal(auxiliary.subjects.find(s => s.id === other.fields.id).role, 'auxiliary');
  assert(!auxiliary.requirements.some(r => r.ownerId === other.fields.id));
});

test('relation verification limitations qualify that relation and do not invent a workflow', () => {
  const p = plan('Relacja karty próbnej do grupy próbnej: formalny FK, kardynalność i ograniczenia weryfikacji');
  assert(!p.requirements.some(r => r.facet === 'workflow'));
  const relation = p.requirements.find(r => r.facet === 'relations');
  assert(relation.qualifications.includes('verification'));
  assert(relation.qualifications.includes('formalFk'));
  assert(has(p, card.fields.id, 'cardinality'));
  assert(!has(p, group.fields.id, 'identifiers'));
});

test('known and unknown exact identities keep the barrier without stripping ENCJA', () => {
  const c = buildSemanticCatalog([row('ENCJA_OnlyLiteral', 'Srebrna karta'), card], new Set(['OWAOntology']));
  for (const question of ['OWAOntology.AbsentSample karta próbna', 'OWAOntology.SampleCard.Child', 'OWAOntology.samplecard']) {
    const p = plan(question, 'entity', c);
    assert.equal(p.identityBarrier, true);
    assert.equal(p.subjects.length, 0);
    assert(p.unresolved.some(u => u.kind === 'identity'));
  }
  const mixed = plan('Relacja OWAOntology.SampleCard do OWAOntology.AbsentSample', 'relation', c);
  assert.deepEqual(mixed.subjects.map(s => s.id), [card.fields.id]);
  assert.equal(mixed.identityBarrier, true);
  assert.equal(resolve('OnlyLiteral', c).subjects.length, 0);
  assert.deepEqual(resolve('ENCJA_OnlyLiteral', c).subjects.map(s => s.id), ['ENCJA_OnlyLiteral']);
});

test('ambiguous aliases are alternatives, never two comparison subjects', () => {
  const r = resolve('Jaki klucz ma wspólny alias?');
  assert.equal(r.subjects.length, 0);
  assert.equal(r.ambiguities.length, 1);
  assert.deepEqual(new Set(r.ambiguities[0].ownerIds), new Set([card.fields.id, group.fields.id]));
  assert.equal(plan('Wspólny alias: klucz').requirements.length, 0);
});

test('natural source-language anchors resolve without names; common words and product noise do not', () => {
  const r = resolve('Co ewidencjonuje turkusowe przesyłki?', catalog, 'concept');
  assert.deepEqual(r.subjects.map(s => s.id), [card.fields.id]);
  assert.equal(r.subjects[0].origin, card);
  assert.equal(r.subjects[0].mentions[0].kind, 'sourcePhrase');
  for (const text of ['Produkt Comarch', 'przesyłki', 'ewidencjonowanie', 'testowy', 'klucz']) {
    assert.equal(resolve(text).subjects.length, 0, text);
  }
  const duplicate = row('clone:42', 'Inny zbiór', { description: 'Ewidencjonowanie turkusowych przesyłek.' });
  const c = buildSemanticCatalog([...rows, duplicate], new Set(['OWAOntology']));
  assert.equal(resolve('Co ewidencjonuje turkusowe przesyłki?', c).ambiguities.length, 1);
});

test('long names outrank nested names and exact metadata wins over natural phrases', () => {
  const c = buildSemanticCatalog([...rows, row('short:1', 'Karta'), row('noise:2', 'Zupełnie inny', {
    description: 'Karta próbna ma tu wzmiankę.' })], new Set(['OWAOntology']));
  assert.deepEqual(resolve('Opisz kartę próbną', c).subjects.map(s => s.id), [card.fields.id]);
  assert.deepEqual(resolve('OWAOntology.SampleCard', c).subjects.map(s => s.id), [card.fields.id]);
});

test('metadata correction symbols are request scoped; unknown middle steps and repeats survive', () => {
  const correction = row('opaque:correction', 'Zwrot lawendowy (LQK)', { description:
    '## Klasyfikacja\n| Symbol | Klasyfikacja | Status |\n| --- | --- | --- |\n| LQK | korekta | do potwierdzenia |' });
  const original = row('opaque:original', 'Wydanie lawendowe (LQ)');
  const c = buildSemanticCatalog([correction, original], new Set(['OWAOntology']));
  assert.deepEqual(parseOwaQuestion('Korekta LQK do LQ', { symbols: c.symbols }).documentCodes, ['LQK', 'LQ']);
  assert.deepEqual(parseOwaQuestion('LQK LQ').documentCodes, []);
  assert.deepEqual(parseOwaQuestion('XLQK LQK_extra', { symbols: c.symbols }).documentCodes, []);
  const p = plan('Proces LQ → MISSING → LQK → LQ', 'process', c);
  assert.deepEqual(p.documentPaths, [['LQ', 'MISSING', 'LQK', 'LQ']]);
  assert.deepEqual(p.requirements.find(r => r.facet === 'workflow').documentPath, ['LQ', 'MISSING', 'LQK', 'LQ']);
  assert.equal(plan('Relacja korekty LQK do LQ', 'relation', c).requirements.find(r => r.facet === 'relations').endpointOwnerIds[0], correction.fields.id);
});

test('multiple exact workflow IDs stay independent and plans do not mutate metadata', () => {
  const second = row('PIPELINE_OPAQUE_88', 'Obieg srebrny', { workflowName: 'Rozliczanie srebrne' }, 'workflow_pattern');
  const c = buildSemanticCatalog([...rows, second], new Set(['OWAOntology']));
  const before = JSON.stringify(c);
  const p = plan('Procesy FLOW_SAMPLE_77 oraz PIPELINE_OPAQUE_88', 'process', c);
  assert.deepEqual(p.requirements.filter(r => r.facet === 'workflow').map(r => r.processId), ['FLOW_SAMPLE_77', 'PIPELINE_OPAQUE_88']);
  assert.equal(JSON.stringify(c), before);
  assert(p.subjects.every(s => s.origin && s.mentions.every(m => m.origin)));
});

test('a later primary request does not retroactively give an endpoint the first PK obligation', () => {
  const p = plan('Karta próbna: jej klucz i relacja do grupy próbnej; pola grupy próbnej');
  assert(has(p, card.fields.id, 'identifiers'));
  assert(has(p, group.fields.id, 'fields'));
  assert(!has(p, group.fields.id, 'identifiers'));
  assert.deepEqual(new Set(p.requirements.find(r => r.facet === 'relations').endpointOwnerIds),
    new Set([card.fields.id, group.fields.id]));
});

test('named owner scopes a shared unqualified field; qualified fields take precedence', () => {
  const shared = row('field:other', '', { entityRefId: group.fields.id, fieldName: 'Sample_Tag' }, 'ontology_field');
  const c = buildSemanticCatalog([...rows, shared], new Set(['OWAOntology']));
  const p = plan('Karta próbna: słownik wartości `Sample_Tag`', 'entity', c);
  assert.equal(p.ambiguities.length, 0);
  assert(has(p, card.fields.id, 'unknownEnums'));
  assert(!has(p, group.fields.id, 'unknownEnums'));
  assert.equal(plan('Słownik `Sample_Tag`', 'entity', c).ambiguities.length, 1);
  assert.deepEqual(resolve('DB.UnrelatedGroups.Sample_Tag', c).subjects.map(s => s.id), [group.fields.id]);
});

test('unknown opaque ID shapes retain a mixed-identity barrier without prefix rewriting', () => {
  const p = plan('Relacja opaque:card do ENCJA_Unlisted');
  assert.equal(p.identityBarrier, true);
  assert.deepEqual(p.subjects.map(s => s.id), [card.fields.id]);
  assert(p.unresolved.some(u => u.value === 'ENCJA_Unlisted' && u.kind === 'identity'));
});

test('workflow and limitation-only auxiliary clauses never inherit a field binding', () => {
  const p = plan('Pole Sample_Tag: słownik wartości; przebieg łączenia lawendowego; ograniczenia weryfikacji');
  const workflows = p.requirements.filter(r => r.facet === 'workflow');
  assert.equal(workflows.length, 1);
  assert.equal(workflows[0].processId, process.fields.id);
  assert(!workflows.some(r => r.fieldName || r.ownerId === card.fields.id));
});

test('uncertainty request names only its own field and retains contradictory source declarations', () => {
  const source = row('owner:pine', 'Rejestr sosnowy', { description: '## Identyfikatory\n| Typ | Pole | Status |\n| --- | --- | --- |\n| PK | Pine_Key | CONFIRMED |\n| PK | Pine_Key | do potwierdzenia |\n| enum | Pine_Tag | UNKNOWN |' });
  const c = buildSemanticCatalog([source], new Set(['OWAOntology']));
  const p = plan('Czy Pine_Key jest do potwierdzenia?', 'entity', c);
  assert(p.requirements.length);
  assert(p.requirements.every(r => r.ownerId === source.fields.id && r.fieldName === 'Pine_Key'));
  assert(!p.requirements.some(r => r.facet === 'workflow'));
  assert.deepEqual(c.fields.filter(f => f.name === 'Pine_Key').map(f => f.status), ['CONFIRMED', 'do potwierdzenia']);
});

test('comparison scope does not turn an independent third subject into another comparison', () => {
  const p = plan('Porównaj kartę próbną i grupę próbną: klucze; opisz obiekt niebieski', 'concept');
  assert(has(p, card.fields.id, 'identifiers'));
  assert(has(p, group.fields.id, 'identifiers'));
  assert(has(p, other.fields.id, 'overview'));
  assert(!has(p, other.fields.id, 'identifiers'));
  assert.equal(p.subjects.find(s => s.id === other.fields.id).role, 'primary');
});

test('two fields with different declared owners do not scope each other', () => {
  const c = buildSemanticCatalog([...rows, row('field:second', '', { entityRefId: group.fields.id,
    fieldName: 'Green_Tag' }, 'ontology_field')], new Set(['OWAOntology']));
  const p = plan('Słownik wartości Sample_Tag oraz Green_Tag', 'entity', c);
  assert(p.requirements.some(r => r.ownerId === card.fields.id && r.fieldName === 'Sample_Tag'));
  assert(p.requirements.some(r => r.ownerId === group.fields.id && r.fieldName === 'Green_Tag'));
  assert(!p.unresolved.length);
});

test('an unknown independent process is not a missing endpoint of a known relation', () => {
  const p = plan('Relacja opaque:card do opaque:group; proces UNLISTED_FLOW_99');
  assert(p.identityBarrier);
  const relation = p.requirements.find(r => r.facet === 'relations');
  assert.deepEqual(relation.endpointOwnerIds, [card.fields.id, group.fields.id]);
  assert.deepEqual(relation.unresolvedEndpointIds, []);
  assert(p.unresolved.some(u => u.value === 'UNLISTED_FLOW_99'));
});

test('metadata-name and classified alias symbols share no global vocabulary', () => {
  const c = buildSemanticCatalog([row('coral:34', 'Korekta koralowa', {
    classification: 'korekta', aliases: 'CRQ; Karta koralowa', verificationStatus: 'UNKNOWN' })], new Set(['OWAOntology']));
  assert.deepEqual(parseOwaQuestion('CRQ', { symbols: c.symbols }).documentCodes, ['CRQ']);
  assert.deepEqual(parseOwaQuestion('CRQ').documentCodes, []);
  assert.equal(c.symbols.find(s => s.name === 'CRQ').classification, 'korekta');
  assert.equal(c.symbols.find(s => s.name === 'CRQ').status, 'UNKNOWN');
  assert.deepEqual(resolve('CRQ', c).subjects.map(s => s.id), ['coral:34']);
});

test('document symbols fold case but opaque IDs and longer symbol spellings stay literal', () => {
  const c = buildSemanticCatalog([row('opaque:CaseSensitive', 'Zwrot wiśniowy (CQZ)')], new Set(['OWAOntology']));
  assert.deepEqual(resolve('Relacja cqz', c).subjects.map(s => s.id), ['opaque:CaseSensitive']);
  assert.equal(resolve('XCQZ CQZ_extra', c).subjects.length, 0);
  assert.equal(resolve('opaque:casesensitive', c).subjects.length, 0);
});

test('a formal foreign key question qualifies the relation without asking for an owner PK', () => {
  const p = plan('Relacja karty próbnej do grupy próbnej: czy formalny klucz obcy jest potwierdzony?');
  assert(!p.requirements.some(r => r.facet === 'identifiers' || r.facet === 'workflow'));
  const relation = p.requirements.find(r => r.facet === 'relations');
  assert(relation.qualifications.includes('formalFk'));
  assert(relation.qualifications.includes('verification'));
});

test('explicitly excluded workflow vocabulary does not create a process obligation', () => {
  const p = plan('Karta próbna: jej klucz, bez opisywania przebiegu procesu');
  assert(has(p, card.fields.id, 'identifiers'));
  assert(!p.requirements.some(r => r.facet === 'workflow'));
});

const sharedCatalog = () => buildSemanticCatalog([...rows, row('field:group-tag', '', {
  entityRefId: group.fields.id, fieldName: 'Sample_Tag', mappingStatus: 'UNKNOWN',
}, 'ontology_field')], new Set(['OWAOntology']));

for (const reversed of [false, true]) test(`review I1: repeated spelling binds each occurrence (${reversed ? 'reverse' : 'forward'})`, () => {
  const clauses = ['Karta próbna: pola Sample_Tag', 'Grupa próbna: słownik wartości Sample_Tag'];
  const question = (reversed ? clauses.reverse() : clauses).join('; ');
  const p = plan(question, 'entity', sharedCatalog());
  assert.equal(p.ambiguities.length, 0);
  assert(p.requirements.some(r => r.ownerId === card.fields.id && r.facet === 'fields' && r.fieldName === 'Sample_Tag'));
  assert(p.requirements.some(r => r.ownerId === group.fields.id && r.facet === 'unknownEnums' && r.fieldName === 'Sample_Tag'));
  assert(!p.requirements.some(r => r.ownerId === card.fields.id && r.facet === 'unknownEnums'));
  for (const [id, label] of [[card.fields.id, 'Karta próbna'], [group.fields.id, 'Grupa próbna']]) {
    const mentions = p.subjects.find(s => s.id === id).mentions.filter(m => m.kind === 'field');
    assert.equal(mentions.length, 1);
    const clauseStart = question.indexOf(label);
    assert(mentions[0].start > clauseStart && mentions[0].end <= question.indexOf(';', clauseStart) + 1 ||
      mentions[0].start > clauseStart && question.indexOf(';', clauseStart) < 0);
    assert.equal(question.slice(mentions[0].start, mentions[0].end), 'Sample_Tag');
  }
});

test('review I1: an unowned repeated occurrence stays ambiguous instead of inheriting the first owner', () => {
  const p = plan('Karta próbna: pola Sample_Tag; słownik wartości Sample_Tag', 'entity', sharedCatalog());
  assert.equal(p.ambiguities.length, 1);
  assert(!p.requirements.some(r => r.facet === 'unknownEnums'));
  assert.deepEqual(new Set(p.ambiguities[0].ownerIds), new Set([card.fields.id, group.fields.id]));
});

test('review I1: repeated qualified fields keep the qualifier and wrong-table occurrence unresolved', () => {
  const question = 'Karta próbna: pola DB.UnrelatedCards.Sample_Tag; Grupa próbna: słownik wartości DB.Absent.Sample_Tag';
  const p = plan(question, 'entity', sharedCatalog());
  assert(p.requirements.some(r => r.ownerId === card.fields.id && r.fieldName === 'DB.UnrelatedCards.Sample_Tag'));
  assert(!p.requirements.some(r => r.facet === 'unknownEnums'));
  assert(p.unresolved.some(u => u.kind === 'field' && u.value === 'DB.Absent.Sample_Tag'));
});

for (const request of ['jej klucz i słownik wartości Sample_Tag', 'słownik wartości Sample_Tag i jej klucz',
  'jej klucz oraz enum Sample_Tag', 'jej klucz, słownik wartości Sample_Tag',
  'jej klucz i dopuszczalne wartości Sample_Tag', 'jej klucz oraz lista wartości Sample_Tag']) test(`review I2: owner key is independent of the named enum (${request})`, () => {
  const p = plan(`Karta próbna: ${request}`);
  assert(p.requirements.some(r => r.ownerId === card.fields.id && r.facet === 'identifiers' && !r.fieldName));
  assert(p.requirements.some(r => r.ownerId === card.fields.id && r.facet === 'unknownEnums' && r.fieldName === 'Sample_Tag'));
  assert(!p.requirements.some(r => r.facet === 'identifiers' && r.fieldName === 'Sample_Tag'));
});

test('review I2: an explicitly named key remains a field-specific identifier request', () => {
  const p = plan('Karta próbna: klucz Sample_Key i słownik wartości Sample_Tag');
  assert(p.requirements.some(r => r.facet === 'identifiers' && r.fieldName === 'Sample_Key'));
  assert(!p.requirements.some(r => r.facet === 'identifiers' && r.fieldName === 'Sample_Tag'));
  assert(p.requirements.some(r => r.facet === 'unknownEnums' && r.fieldName === 'Sample_Tag'));
});

for (const reversed of [false, true]) test(`review I3: repeated relation merges every qualification and request (${reversed ? 'reverse' : 'forward'})`, () => {
  const clauses = ['Relacja karty próbnej do grupy próbnej',
    'Relacja karty próbnej do grupy próbnej: formalny FK',
    'Relacja karty próbnej do grupy próbnej: ograniczenia weryfikacji'];
  const question = (reversed ? clauses.reverse() : clauses).join('; ');
  const p = plan(question);
  const relations = p.requirements.filter(r => r.facet === 'relations');
  assert.equal(relations.length, 1);
  assert.deepEqual(new Set(relations[0].qualifications), new Set(['formalFk', 'verification']));
  assert.equal(relations[0].requestSpans.length, 3);
  for (const request of relations[0].requestSpans) assert.equal(question.slice(request.start, request.end), request.text);
  for (const qualification of ['formalFk', 'verification']) {
    const evidence = relations[0].qualificationRequests.find(r => r.qualification === qualification);
    assert(evidence);
    assert.equal(question.slice(evidence.start, evidence.end), evidence.text);
    assert.match(evidence.text, qualification === 'formalFk' ? /formalny FK/ : /ograniczenia weryfikacji/);
  }
  assert(relations[0].evidence.some(e => e.origin === edge));
  assert(!p.requirements.some(r => r.facet === 'workflow'));
});

test('review I4: uppercase source field is a declared field under entity wording', () => {
  const owner = row('opaque:upper', 'Rejestr turmalinowy', {
    description: '## Identyfikatory\n| Typ | Pole | Status |\n| --- | --- | --- |\n| PK | TST_FIELD_KEY | do potwierdzenia |',
  });
  const c = buildSemanticCatalog([owner], new Set(['OWAOntology']));
  const p = plan('Encja rejestr turmalinowy: pole TST_FIELD_KEY', 'entity', c);
  assert.equal(p.identityBarrier, false);
  assert.equal(p.unresolved.length, 0);
  assert(p.requirements.some(r => r.ownerId === owner.fields.id && r.fieldName === 'TST_FIELD_KEY'));
  assert.equal(p.subjects[0].mentions.find(m => m.kind === 'field').origin, owner);
});

test('review I4: declared uppercase symbols are classified before opaque-process heuristics', () => {
  const c = buildSemanticCatalog([row('symbol:54', 'Dyspozycja grafitowa', {
    symbol: 'SYN_CORR_CODE', classification: 'korekta',
  })], new Set(['OWAOntology']));
  for (const intent of ['entity', 'process']) {
    const p = plan(`${intent === 'entity' ? 'Encja' : 'Proces'} SYN_CORR_CODE`, intent, c);
    assert.equal(p.identityBarrier, false);
    assert.deepEqual(p.subjects.map(s => s.id), ['symbol:54']);
    assert.equal(p.unresolved.length, 0);
  }
});

test('review I4: unknown uppercase process remains a mixed-ID barrier beside known exact IDs and fields', () => {
  const c = buildSemanticCatalog([...rows, row('field:upper', '', {
    entityRefId: card.fields.id, fieldName: 'TST_FIELD_KEY',
  }, 'ontology_field')], new Set(['OWAOntology']));
  const p = plan('Encja opaque:card; pole TST_FIELD_KEY; proces NEVER_DECLARED_FLOW', 'entity', c);
  assert(p.identityBarrier);
  assert.deepEqual(p.subjects.map(s => s.id), [card.fields.id]);
  assert(p.unresolved.some(u => u.kind === 'identity' && u.value === 'NEVER_DECLARED_FLOW'));
  assert(!p.unresolved.some(u => u.kind === 'identity' && u.value === 'TST_FIELD_KEY'));
});

test('review I5: delimiting colons resolve literal entity and process IDs without losing paths', () => {
  const p = plan('Encja opaque:card: jej klucz');
  assert.equal(p.identityBarrier, false);
  assert.deepEqual(p.subjects.map(s => s.id), [card.fields.id]);
  assert(has(p, card.fields.id, 'identifiers'));
  const flow = plan('Proces FLOW_SAMPLE_77: AAA → MISSING → AAA', 'process');
  assert.equal(flow.identityBarrier, false);
  assert(flow.requirements.some(r => r.processId === process.fields.id));
  assert.deepEqual(flow.documentPaths, [['AAA', 'MISSING', 'AAA']]);
});

test('review I5: colon, dotted and suffixed longer identities never resolve through a known prefix', () => {
  for (const value of ['opaque:card:Child', 'opaque:card.Child', 'opaque:cardExtra', 'opaque:Card',
    'FLOW_SAMPLE_77:Child', 'OWAOntology.SampleCard.Child', 'OWAOntology.SampleCard:Child']) {
    const p = plan(`Encja ${value}: jej klucz`);
    assert(p.identityBarrier, value);
    assert.equal(p.subjects.length, 0, value);
    assert(p.unresolved.some(u => u.kind === 'identity' && u.value === value), value);
    assert.deepEqual(p.unresolved.filter(u => u.kind === 'identity').map(u => u.value), [value], value);
  }
  const mixed = plan('Relacja opaque:card: do opaque:card:Child');
  assert(mixed.identityBarrier);
  assert.deepEqual(mixed.subjects.map(s => s.id), [card.fields.id]);
});

test('review I5: bounded metadata identities do not create phantom qualified aliases', () => {
  const c = buildSemanticCatalog([row('opaque:leaf', 'Leaf', { aliases: 'SampleAlias' })], new Set(['OWAOntology']));
  for (const value of ['OWAOntology.Leaf', 'OWAOntology.SampleAlias']) {
    const p = plan(`${value}: jej klucz`, 'entity', c);
    assert(p.identityBarrier);
    assert.equal(p.subjects.length, 0);
  }
});

test('review I1/I4: uppercase fields never bypass a wrong table through a nested bare token', () => {
  const c = buildSemanticCatalog([...rows, row('field:upper-qualified', '', {
    entityRefId: card.fields.id, fieldName: 'TST_FIELD_KEY',
  }, 'ontology_field')], new Set(['OWAOntology']));
  const valid = plan('Encja: pole DB.UnrelatedCards.TST_FIELD_KEY', 'entity', c);
  assert(!valid.identityBarrier);
  assert(valid.requirements.some(r => r.fieldName === 'DB.UnrelatedCards.TST_FIELD_KEY' && r.ownerId === card.fields.id));
  const wrong = plan('Encja: pole DB.Absent.TST_FIELD_KEY', 'entity', c);
  assert(!wrong.identityBarrier, 'wrong qualified column is an unresolved field, not an invented process ID');
  assert(wrong.unresolved.some(u => u.kind === 'field' && u.value === 'DB.Absent.TST_FIELD_KEY'));
  assert.equal(wrong.subjects.length, 0);
  assert.equal(wrong.requirements.length, 0);
});
