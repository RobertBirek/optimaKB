#!/usr/bin/env node
// Synthetic rows only. Integration fixtures are disposable and remain in this worktree.
import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseOwaQuestion } from './lib/owa_query_context.mjs';
import { selectOwaEvidence, owaUnitsForRow } from './lib/owa_evidence.mjs';

const OWA = 'OWAOntology';
const row = (file, fields, extra = {}) => ({ namespace: OWA,
  artifact: `fixture/${file}.csv`, contentHash: 'sha256:synthetic', line: 2, endLine: 2,
  fields: { id: '', name: '', description: '', semanticType: file, ...fields }, ...extra });
const entity = (id, name, fields = {}) => row('ontology_entity', {
  id, name, canonicalName: name, ontologyId: `OWAOntology.${name}`,
  verificationStatus: 'DRAFT', confidenceLevel: 'unverified', businessDomain: 'fixture',
  mainTable: '', mcpReadTools: '', mcpWriteTools: '', aliases: '', summary: 'Krótki opis.', ...fields,
});
const chunk = (id, owner, content, extra = {}) => row('chunk', {
  id, sourceDocumentRefId: owner, sourcePath: 'downloads/knowledge_inbox/fixture/a.md',
  sectionHeading: '', sectionOrder: '1', content, ...extra,
});
const field = (id, owner, fieldName, extra = {}) => row('ontology_field', {
  id, entityRefId: owner, fieldName, mssqlColumn: fieldName, mcpField: 'sampleKey',
  sqlType: 'int', nullable: 'NO', keyRole: 'PK', mappingStatus: 'UNKNOWN', summary: '', ...extra,
});
const relation = (id, source, target, extra = {}) => row('ontology_relation', {
  id, sourceEntityRefId: source, targetEntityRefId: target, predicate: 'ma_taryfę',
  cardinality: 'N:1', relationType: 'logiczna', joinCondition: '', status: 'do potwierdzenia',
  summary: 'ma taryfę', ...extra,
});
const workflow = (id, source, target, description, extra = {}) => row('workflow_pattern', {
  id, workflowName: 'Przekształcenie', sourceEntityRefId: source, targetEntityRefId: target,
  mcpTool: 'synthetic_tool', mode: 'WRITE', status: 'WRITE_NOT_CALLED', summary: 'skrót',
  description, ...extra,
});
const description = '# Produkt próbny\nOpis podobny do taryfy.\n\n## Identyfikatory\nPrb_Id jest kluczem.\n\n'
  + '## Ceny\nPrbCeny przechowuje ceny, wyłącznie w walucie umowy.\n\n'
  + '## Otwarte problemy\nUNKNOWN: brak kompletnego słownika Prb_Typ.';
const product = entity('opaque:product-7', 'Produkt próbny', { aliases: 'SampleProduct', description });
const tariff = entity('opaque:tariff-2', 'Taryfa', { description: 'SampleProduct ceny klucz relacja '.repeat(30) });
const zero = chunk('zero', product.fields.id, '## Otwarte problemy\nUNKNOWN: nadal brak rozstrzygnięcia.');
const foreign = chunk('foreign', tariff.fields.id, '## Ceny\nSampleProduct Prb_Id ceny relacja');
const rows = [product, tariff, zero, foreign,
  field('field-A', product.fields.id, 'Prb_Id'), field('field-B', tariff.fields.id, 'Tar_Id'),
  relation('correct', product.fields.id, tariff.fields.id),
  relation('unrelated-end', product.fields.id, 'unknown:third'),
  relation('reverse', tariff.fields.id, product.fields.id, { relationType: 'FK', joinCondition: 'Tar.Prb = Prb.Id' }),
];
const select = (question, input = rows) => selectOwaEvidence(parseOwaQuestion(question), input);
const ids = selection => selection.candidates.map(item => item.fields.id);
const units = (question, input) => owaUnitsForRow(parseOwaQuestion(question), input);

test('metadata owner selection excludes similar body text and foreign namespaces', () => {
  const input = [...rows, { ...product, namespace: 'OtherKB' }];
  const original = JSON.stringify(input);
  const selected = select('W OWA encja SampleProduct, identyfikator i ceny', input);
  assert.deepEqual(selected.ownerIds, ['opaque:product-7']);
  assert(ids(selected).includes(product.fields.id));
  assert(!ids(selected).includes('foreign'));
  assert(!selected.candidates.some(item => item.namespace !== OWA));
  assert.equal(JSON.stringify(input), original);
});

test('zero-score owned outcome survives; shared URL/path never establishes ownership', () => {
  const selected = select('OWA SampleProduct UNKNOWN');
  assert(ids(selected).includes('zero'));
  assert(!ids(selected).includes('foreign'));
  assert(!ids(selected).includes('orphan'));
  const orphan = chunk('orphan', 'product-7', zero.fields.content);
  assert(!ids(select('OWA SampleProduct UNKNOWN', [...rows, orphan])).includes('orphan'));
});

test('declined and plural full names still select the exact same owner', () => {
  for (const question of ['OWA ceny produktu próbnego', 'OWA identyfikatory produktów próbnych']) {
    assert.deepEqual(select(question).ownerIds, [product.fields.id], question);
  }
});

test('ambiguous aliases retain competing owners without arbitrary first-row resolution', () => {
  const alternative = entity('alternative', 'Alternatywa', { aliases: 'SampleProduct', description });
  assert.deepEqual(select('OWA SampleProduct ceny', [product, alternative]).ownerIds,
    [product.fields.id, 'alternative']);
});

test('unknown qualified identity cannot degrade to a nearby owner or workflow', () => {
  for (const q of ['OWAOntology.NotDeclared SampleProduct ceny',
    'OWAOntology.NotDeclared PZ → FZ workflow']) {
    const selected = select(q);
    assert.equal(selected.missing, true);
    assert.deepEqual(selected.candidates, []);
  }
});

test('exact field names select only requested rows with literal valid owner references', () => {
  const selected = select('OWA pole `Prb_Id`', [...rows,
    field('bad-reference', 'product-7', 'Prb_Id'), field('other-field', product.fields.id, 'Prb_IdExtra')]);
  assert.deepEqual(selected.ownerIds, [product.fields.id]);
  assert(ids(selected).includes('field-A'));
  for (const id of ['field-B', 'bad-reference', 'other-field']) assert(!ids(selected).includes(id));
});

test('declared ontologyId references work; alias references never grant ownership', () => {
  const input = [product, chunk('qualified', product.fields.ontologyId, zero.fields.content),
    chunk('alias-reference', 'SampleProduct', zero.fields.content),
    chunk('case-reference', 'OPAQUE:product-7', zero.fields.content)];
  assert.deepEqual(ids(select('OWA SampleProduct UNKNOWN', input)), [product.fields.id, 'qualified']);
});

test('two requested relation ends exclude a relation sharing only one end, in either order', () => {
  for (const question of ['OWA relacja SampleProduct i Taryfa kardynalność',
    'OWA relacja Taryfa i SampleProduct kardynalność']) {
    const selected = ids(select(question));
    assert(selected.includes('correct'));
    assert(selected.includes('reverse'));
    assert(!selected.includes('unrelated-end'));
  }
});

test('requested relation type selects FK without converting logical relations into joins', () => {
  const selected = select('OWA relacja FK SampleProduct i Taryfa');
  assert(ids(selected).includes('reverse'));
  assert(!ids(selected).includes('correct'));
  const logical = units('OWA relacja', rows.find(item => item.fields.id === 'correct'))[0].text;
  assert(logical.includes('logiczna'));
  assert(!logical.includes('Tar.Prb'));
  assert(logical.includes('do potwierdzenia'));
});

test('relation mini table preserves every requested column and literal conflicts', () => {
  const input = relation('conflict', 'opaque:X', 'opaque:Y', { predicate: 'a|b',
    joinCondition: 'X.Id = Y.Ref\nAND X.Mode = 2', status: '**Potwierdzona**; UNKNOWN: konflikt źródeł',
    description: 'Warunkowe; wyłącznie przy Mode=2.' });
  const text = units('OWA relacje kardynalność', input)[0].text;
  for (const key of ['sourceEntityRefId', 'targetEntityRefId', 'predicate', 'cardinality',
    'relationType', 'joinCondition', 'status']) assert(text.includes(key));
  for (const value of ['opaque:X', 'opaque:Y', 'a\\|b', 'N:1', 'Mode = 2',
    'UNKNOWN: konflikt źródeł', 'Warunkowe; wyłącznie przy Mode=2.']) assert(text.includes(value), value);
});

test('field mini table retains mapping and key status beside the full description', () => {
  const text = units('OWA mapowanie pól', field('F', product.fields.id, 'Prb_Id', {
    description: 'UNKNOWN: API niezweryfikowane, tylko klucz lokalny.',
  }))[0].text;
  for (const value of ['fieldName', 'mssqlColumn', 'keyRole', 'mappingStatus', 'PK',
    'UNKNOWN', 'API niezweryfikowane']) assert(text.includes(value));
});

test('declared key field units cover the requested identifier facet without losing key/mapping qualifiers', () => {
  const result = units('OWA identyfikatory SampleProduct', field('key', product.fields.id, 'Prb_Id'));
  assert(result.some(unit => unit.facet === 'identifiers'));
  assert(result.every(unit => unit.text.includes('PK') && unit.text.includes('UNKNOWN')));
});

test('role and rule requests retain whole sections with their conditions', () => {
  const input = entity('subject', 'Podmiot próbny', { description: '## Role\nOdbiorca i dostawca; tylko po wskazaniu roli.\n\n'
    + '## Reguły\nOperacja wyłącznie w buforze. UNKNOWN: ograniczenia w kolejnej wersji.\n\n'
    + '## Ceny\nOsobny aspekt.' });
  const result = units('OWA role i ograniczenia procesu', input);
  assert(result.some(unit => unit.facet === 'roles' && unit.text.includes('tylko po wskazaniu roli.')));
  assert(result.some(unit => unit.facet === 'workflow' && unit.text.includes('UNKNOWN: ograniczenia w kolejnej wersji.')));
  assert(!result.some(unit => unit.text.includes('Osobny aspekt.')));
});

test('full entity descriptions outrank summary and retain complete requested facets', () => {
  const result = units('OWA SampleProduct identyfikatory i ceny UNKNOWN', product);
  for (const facet of ['identifiers', 'prices', 'unknownEnums']) assert(result.some(unit => unit.facet === facet));
  const text = result.map(unit => unit.text).join('\n');
  assert(text.includes('Prb_Id jest kluczem.'));
  assert(text.includes('wyłącznie w walucie umowy.'));
  assert(text.includes('UNKNOWN: brak kompletnego słownika Prb_Typ.'));
  assert(!text.includes('Krótki opis.'));
});

test('whole Markdown tables keep their headers, rows and adjacent qualifiers', () => {
  const content = '## Mapowanie pól\nTylko odczyt; API do potwierdzenia.\n\n'
    + '| fieldName | mssqlColumn | mappingStatus |\n| --- | --- | --- |\n'
    + '| Prb_Id | P_Id | UNKNOWN |\n| Prb_Value | P_Value | DRAFT |\n\n'
    + 'UNKNOWN: mapowanie zależy od wersji.\n\n## Ceny\nInny aspekt.';
  const result = units('OWA pole `Prb_Id`', chunk('table', product.fields.id, content));
  assert(result.some(unit => unit.text.includes('| Prb_Id | P_Id | UNKNOWN |')));
  const text = result.map(unit => unit.text).join('\n');
  for (const value of ['| fieldName |', 'Tylko odczyt', 'zależy od wersji.']) assert(text.includes(value));
  assert(!text.includes('Inny aspekt.'));
});

test('heading context and all conditions remain attached to nested sections', () => {
  const content = '## Ceny\nWyłącznie po zatwierdzeniu.\n### Waluta\nWartość w walucie umowy.\n'
    + '### Ograniczenia\nUNKNOWN: reguła zaokrągleń.\n## Role\nOdbiorca.';
  const result = units('OWA ceny', chunk('nested', product.fields.id, content));
  assert.equal(result.length, 1);
  assert(result[0].text.includes('Wyłącznie po zatwierdzeniu.'));
  assert(result[0].text.includes('UNKNOWN: reguła zaokrągleń.'));
  assert(!result[0].text.includes('Odbiorca.'));
});

const nestedFacetCases = [
  { label: 'identifier child', parent: 'Pola', child: 'Identyfikatory', request: 'identyfikatory', facet: 'identifiers',
    fact: 'Prb_Id jest kluczem.', table: '| pole | rola |\n| --- | --- |\n| Prb_Id | PK |\n| Prb_Ref | FK |' },
  { label: 'price child', parent: 'Role', child: 'Ceny', request: 'ceny', facet: 'prices',
    fact: 'Wartość w walucie umowy.', table: '| kwota | waluta |\n| --- | --- |\n| 3 | PLN |\n| 7 | EUR |' },
  { label: 'identifier child prose', parent: 'Pola', child: 'Metadane', request: 'identyfikatory', facet: 'identifiers',
    fact: 'Prb_Id jest kluczem.', table: '| pole | rola |\n| --- | --- |\n| Prb_Id | PK |\n| Prb_Ref | FK |' },
];
for (const sample of nestedFacetCases) {
  test(`I2 nested facet: ${sample.label} keeps its complete parent and table`, () => {
    const content = `## ${sample.parent}\nWyłącznie w wersji testowej.\n### ${sample.child}\n${sample.fact}\n\n`
      + sample.table + '\n\nUNKNOWN: mapowanie do potwierdzenia.';
    const owner = entity('opaque:nested', 'Przedmiot testowy', { aliases: 'SampleOwner', description: content });
    const owned = chunk('nested-child', owner.fields.id, content);
    const input = [owner, owned], before = JSON.stringify(input);
    const selected = select(`OWA SampleOwner ${sample.request}`, input);
    assert(ids(selected).includes('nested-child'), 'requested child facet was dropped with its owned chunk');
    for (const item of input) {
      const result = units(`OWA SampleOwner ${sample.request}`, item);
      assert.equal(result.length, 1);
      assert.equal(result[0].facet, sample.facet);
      assert(result[0].text.includes(content), 'whole parent, both table rows and trailing qualifier must survive');
      assert.deepEqual(selected.metadata.get(item).facets, [sample.facet]);
    }
    assert.equal(JSON.stringify(input), before);
  });
}

test('unheaded full prose remains selectable when chunk heading is just an owner label', () => {
  const input = chunk('prose', product.fields.id,
    'Ceny są wyłącznie w walucie umowy. UNKNOWN: brak reguły przeliczeń.',
    { sectionHeading: 'Produkt próbny' });
  const result = units('OWA ceny SampleProduct', input);
  assert(result.some(unit => unit.facet === 'prices'));
  assert(result[0].text.includes('UNKNOWN: brak reguły przeliczeń.'));
});

test('document introduction qualifiers stay with selected child sections', () => {
  const input = entity('intro', 'Przedmiot testowy', { description:
    '# Encja: Przedmiot testowy\nWyłącznie dla wersji próbnej; UNKNOWN: aktualność.\n\n'
    + '## Ceny\nWartość w walucie umowy.\n\n## Role\nOdbiorca.' });
  const result = units('OWA ceny', input);
  assert.equal(result.length, 1);
  assert(result[0].text.includes('Wyłącznie dla wersji próbnej; UNKNOWN: aktualność.'));
  assert(result[0].text.includes('Wartość w walucie umowy.'));
  assert(!result[0].text.includes('Odbiorca.'));
});

test('workflow rows preserve document direction, tool mode, status and full stock effect', () => {
  const forward = workflow('forward', product.fields.id, tariff.fields.id,
    'PZ → FZ: po przekształceniu zapas nie zwiększa się drugi raz. UNKNOWN: warunek wersji.');
  const backward = workflow('backward', tariff.fields.id, product.fields.id, 'FZ → PZ: odwrotny proces.');
  const other = workflow('other', '', '', 'WZ → FS: inny skutek.');
  const selected = select('OWA proces PZ → FZ', [product, tariff, forward, backward, other]);
  assert.deepEqual(ids(selected), ['forward']);
  const text = units('OWA proces PZ → FZ', forward)[0].text;
  for (const value of ['PZ → FZ', 'zapas nie zwiększa się drugi raz.', 'UNKNOWN',
    'synthetic_tool', 'WRITE', 'WRITE_NOT_CALLED']) assert(text.includes(value));
});

test('workflow selection uses exact declared endpoints and cannot follow dangling references', () => {
  const good = workflow('owned', product.fields.id, '', 'Odczyt, UNKNOWN: bez wykonania.');
  const bad = workflow('dangling', 'product-7', '', good.fields.description);
  assert(ids(select('OWA proces SampleProduct', [product, good, bad])).includes('owned'));
  assert(!ids(select('OWA proces SampleProduct', [product, good, bad])).includes('dangling'));
});

test('workflow direction is read within complete prose fields, without duplicate-name or substring codes', () => {
  const correct = workflow('forward', '', '', 'PZ → FZ: bez ponownego zwiększenia zapasu.', { workflowName: 'PZ' });
  const substring = workflow('substring', '', '', 'żPZ → FZ: obcy symbol.', { workflowName: 'Inny' });
  const longer = workflow('longer', '', '', 'PZW → FZ: obcy symbol.', { workflowName: 'Inny' });
  assert.deepEqual(ids(select('OWA proces PZ → FZ', [correct, substring, longer])), ['forward']);
});

test('I1 workflow direction: same-owner chunks qualify only the requested code pair from full content', () => {
  const owner = entity('opaque:owner', 'Przedmiot próbny', { aliases: 'SampleOwner' });
  const forward = chunk('forward', owner.fields.id,
    '## Proces\nPZ → FZ: zapas nie zwiększa się drugi raz. UNKNOWN: tylko w wersji testowej.',
    { description: 'FZ → PZ: krótki opis metadanych.' });
  const reverse = chunk('reverse', owner.fields.id,
    '## Proces\nFZ → PZ: odwrotny proces i inny skutek magazynowy.',
    { description: 'PZ → FZ: krótki opis nie zastępuje pełnej treści.' });
  const unrelated = chunk('unrelated', owner.fields.id, '## Proces\nWZ → FS: inny skutek magazynowy.');
  const unbound = chunk('PZ_FZ_opaque_id', owner.fields.id, '## Proces\nUNKNOWN: nie wskazano kierunku.');
  const input = [owner, forward, reverse, unrelated, unbound];
  assert.deepEqual(ids(select('OWA SampleOwner proces PZ → FZ', input)), [owner.fields.id, 'forward']);
  assert.deepEqual(ids(select('OWA SampleOwner proces FZ → PZ', input)), [owner.fields.id, 'reverse']);
  assert.deepEqual(ids(select('OWA SampleOwner proces WZ → FS', input)), [owner.fields.id, 'unrelated']);
  assert.deepEqual(ids(select('OWA SampleOwner proces', input)), input.map(item => item.fields.id));
  const result = units('OWA SampleOwner proces PZ → FZ', forward);
  assert.equal(result.length, 1);
  assert.equal(result[0].facet, 'workflow');
  assert.equal(result[0].text, forward.fields.content);
  assert.deepEqual(units('OWA SampleOwner proces PZ → FZ', reverse), []);
});

test('I1 workflow direction: entity sections cannot certify reverse or unrelated workflows via another facet', () => {
  const introduction = '# Przedmiot próbny\nWyłącznie w wersji testowej.';
  const forward = '## Proces przyjęcia\nPZ → FZ: zapas nie zwiększa się drugi raz. UNKNOWN: ograniczenie wersji.';
  const reverse = '## Proces odwrotny\nFZ → PZ: odwrotny skutek. UNKNOWN: reguła odwrotna.';
  const unrelated = '## Proces wydania\nWZ → FS: inny skutek. UNKNOWN: inny przebieg.';
  const owner = entity('opaque:owner', 'Przedmiot próbny', { aliases: 'SampleOwner',
    description: [introduction, forward, reverse, unrelated].join('\n\n') });
  const result = units('OWA SampleOwner proces PZ → FZ UNKNOWN', owner);
  assert.deepEqual(result.map(unit => unit.facet), ['workflow', 'unknownEnums']);
  for (const unit of result) {
    assert(unit.text.includes(introduction));
    assert(unit.text.includes(forward));
    assert(!unit.text.includes(reverse));
    assert(!unit.text.includes(unrelated));
    assert(unit.text.includes('verificationStatus: DRAFT'));
  }
  const selected = select('OWA SampleOwner proces PZ → FZ UNKNOWN', [owner]);
  assert.deepEqual(selected.metadata.get(owner).units, result);
});

test('I1 workflow direction: direct workflow-row units enforce the same code constraint as selection', () => {
  const forward = workflow('forward', '', '', 'PZ → FZ: zapas bez ponownego zwiększenia.');
  const reverse = workflow('reverse', '', '', 'FZ → PZ: inny proces.');
  const unrelated = workflow('unrelated', '', '', 'WZ → FS: inny proces.');
  assert.equal(units('OWA proces PZ → FZ', forward).length, 1);
  assert.deepEqual(units('OWA proces PZ → FZ', reverse), []);
  assert.deepEqual(units('OWA proces PZ → FZ', unrelated), []);
});

test('I1 workflow direction: explicit code pairs constrain workflow units without a workflow keyword in the request', () => {
  const owner = entity('opaque:owner', 'Przedmiot próbny', { aliases: 'SampleOwner' });
  const forward = chunk('forward', owner.fields.id, '## Proces\nPZ → FZ: bez ponownego zwiększenia zapasu.');
  const reverse = chunk('reverse', owner.fields.id, '## Proces\nFZ → PZ: odwrotny proces.');
  const question = 'OWA SampleOwner PZ → FZ';
  assert(!parseOwaQuestion(question).facets.includes('workflow'));
  assert.deepEqual(ids(select(question, [owner, forward, reverse])), [owner.fields.id, 'forward']);
  assert.deepEqual(units(question, reverse), []);
});

test('no local identity or workflow match returns missing without lexical substitution', () => {
  const selected = select('OWA NieznanyModel ceny', rows);
  assert.equal(selected.missing, true);
  assert.deepEqual(selected.candidates, []);
});

let root, scanArtifact, gatherEvidence, answerQuestion;
const previousRoot = process.env.ROOT;
const originalFetch = globalThis.fetch;
let networkAttempts = 0;
before(async () => {
  root = fs.mkdtempSync(fileURLToPath(new URL('../.superpowers/sdd/task-2-fixtures-', import.meta.url)));
  process.env.ROOT = root;
  globalThis.fetch = async () => { networkAttempts++; throw new Error('Network forbidden'); };
  ({ scanArtifact, gatherEvidence, answerQuestion } = await import('./erp_knowledge_answer.mjs'));
});
after(() => {
  if (previousRoot === undefined) delete process.env.ROOT;
  else process.env.ROOT = previousRoot;
  globalThis.fetch = originalFetch;
  fs.rmSync(root, { recursive: true, force: true });
  assert.equal(networkAttempts, 0);
});

const headers = {
  ontology_entity: 'id,name,description,semanticType,canonicalName,ontologyId,verificationStatus,confidenceLevel,businessDomain,mainTable,mcpReadTools,mcpWriteTools,aliases,summary',
  ontology_field: 'id,name,description,semanticType,entityRefId,fieldName,mssqlColumn,mcpField,sqlType,nullable,keyRole,mappingStatus,summary',
  ontology_relation: 'id,name,description,semanticType,sourceEntityRefId,targetEntityRefId,predicate,cardinality,relationType,joinCondition,status,summary',
  workflow_pattern: 'id,name,description,semanticType,workflowName,sourceEntityRefId,targetEntityRefId,mcpTool,mode,status,summary',
  chunk: 'id,name,description,semanticType,sourceDocumentRefId,sourcePath,sectionHeading,sectionOrder,content',
};
function write(file, bytes) {
  const destination = path.join(root, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes);
  return file;
}
function csv(type, input, prefix = 'fixture') {
  const columns = headers[type].split(',');
  const bytes = [columns, ...input.map(item => columns.map(key => item.fields[key] || ''))]
    .map(cells => cells.map(value => '"' + value.replaceAll('"', '""') + '"').join(',')).join('\n') + '\n';
  return { artifact: write(`${prefix}/${type}.csv`, bytes), bytes };
}
const response = (artifacts, supportKbs = []) => ({
  primaryKb: { name: OWA, artifacts }, supportKbs,
});

// The same directional grammar must work for metadata-known code pairs, not
// just a particular process name or the vocabulary of its stock-effect body.
const headingDirectionPairs = [['PZ', 'FZ', '→'], ['PW', 'RW', '->'], ['RO', 'ZD', '→']];
for (const [source, target, arrow] of headingDirectionPairs) {
  for (const processWord of ['', 'proces ']) {
    test(`I3 workflow-row selection: ${source}/${target}, ${processWord ? 'process request' : 'code-only request'}`, () => {
      const question = `OWA ${processWord}${source} → ${target}`;
      const forward = workflow('opaque:forward', '', '',
        `${source} ${arrow} ${target}: nie powiela skutku. UNKNOWN: warunek wersji.`,
        { workflowName: `${source} ${arrow} ${target}`, status: 'UNKNOWN' });
      const reverse = workflow('opaque:reverse', '', '', `${target} ${arrow} ${source}: odmienny skutek.`,
        { workflowName: `${target} ${arrow} ${source}` });
      const unrelated = workflow('opaque:unrelated', '', '', 'MM → PA: niezależny przebieg.',
        { workflowName: 'MM → PA' });
      const input = [reverse, unrelated, forward], before = JSON.stringify(input);
      const context = parseOwaQuestion(question);
      assert.equal(context.facets.includes('workflow'), Boolean(processWord));
      assert.deepEqual(context.documentCodes, [source, target]);
      const selected = selectOwaEvidence(context, input);
      assert.deepEqual(ids(selected), [forward.fields.id]);
      assert.equal(selected.missing, false);
      assert.deepEqual(selected.ownerIds, []);
      assert.strictEqual(selected.candidates[0], forward);
      assert.deepEqual(selected.metadata.get(forward).units, owaUnitsForRow(context, forward));
      assert.equal(selected.metadata.get(forward).units[0].facet, 'workflow');
      assert(selected.metadata.get(forward).units[0].text.includes('UNKNOWN: warunek wersji.'));
      assert(selected.metadata.get(forward).units[0].text.includes('| synthetic_tool | WRITE | UNKNOWN |'));
      assert.deepEqual(units(question, reverse), []);
      assert.equal(JSON.stringify(input), before);
      const reversed = select(`OWA ${processWord}${target} → ${source}`, input);
      assert.deepEqual(ids(reversed), [reverse.fields.id]);
      assert.equal(reversed.missing, false);

      const prefix = `i3-${source}-${target}-${processWord ? 'process' : 'codes'}`;
      const { artifact } = csv('workflow_pattern', input, prefix);
      const evidence = gatherEvidence(response([artifact]), ['never-matches'], [], new Set([OWA]), [], context);
      assert.equal(evidence.owaSelection.missing, false);
      assert.deepEqual(evidence[0].hits.map(hit => hit.recordId), [forward.fields.id]);
      assert.deepEqual(evidence[0].hits[0].owa.units, selected.metadata.get(forward).units);
      assert.equal(evidence[0].hits[0].score, 0);
    });
  }
}

test('I3 workflow-row selection: directed eligibility preserves scope, qualified-ID and exact-endpoint barriers', () => {
  const owner = entity('opaque:owner', 'Przedmiot próbny', { aliases: 'SampleOwner' });
  const forward = workflow('opaque:forward', '', '', 'PZ → FZ: warunek.', { status: 'UNKNOWN' });
  const foreign = { ...forward, namespace: 'OtherKB' };
  const dangling = workflow('dangling', 'owner', '', 'PZ → FZ: nieznany koniec.');
  const owned = workflow('owned', owner.fields.id, '', 'PZ → FZ: warunek.');
  for (const processWord of ['', 'proces ']) {
    assert.deepEqual(ids(select(`OWA ${processWord}PZ → FZ`, [foreign, dangling])), []);
    const unknown = select(`OWAOntology.Undeclared ${processWord}PZ → FZ`, [forward]);
    assert.equal(unknown.missing, true);
    assert.deepEqual(unknown.candidates, []);
    const selected = select(`OWA SampleOwner ${processWord}PZ → FZ`, [owner, dangling, owned]);
    assert.deepEqual(ids(selected), [owner.fields.id, 'owned']);
    assert.deepEqual(selected.metadata.get(owned).ownerIds, [owner.fields.id]);
  }
  // Mentioning known codes as a list is not an explicit directed request.
  assert.deepEqual(ids(select('OWA PZ, FZ', [forward])), []);
});

for (const [source, target, arrow] of headingDirectionPairs) {
  for (const processWord of ['', 'proces ']) {
    test(`I1 arrow headings: ${source}/${target}, ${processWord ? 'process request' : 'code-only request'}`, () => {
      const question = `OWA SampleOwner ${processWord}${source} → ${target}`;
      assert.deepEqual(parseOwaQuestion(question).documentCodes, [source, target]);
      const forwardText = `## ${source} ${arrow} ${target}\nNie powiela skutku. UNKNOWN: tylko w wersji testowej.`;
      const reverseText = `## ${target} ${arrow} ${source}\nZmienia skutek. UNKNOWN: tylko w wersji testowej.`;
      const owner = entity('opaque:arrows', 'Przedmiot próbny', { aliases: 'SampleOwner',
        description: `${reverseText}\n\n${forwardText}` });
      const forward = chunk('forward', owner.fields.id, forwardText);
      const reverse = chunk('reverse', owner.fields.id, reverseText);
      const input = [owner, reverse, forward], before = JSON.stringify(input);
      const selected = select(question, input);
      assert.deepEqual(ids(selected), [owner.fields.id, 'forward']);
      for (const item of [owner, forward]) {
        const result = units(question, item);
        assert.equal(result.length, 1, 'retain the qualifying direction, not an empty selection');
        assert.equal(result[0].facet, 'workflow');
        assert(result[0].text.includes(forwardText));
        assert(!result[0].text.includes(reverseText));
        assert.deepEqual(selected.metadata.get(item).units, result);
      }
      assert.deepEqual(units(question, reverse), []);
      assert.equal(JSON.stringify(input), before);

      const prefix = `arrow-${source}-${target}-${processWord ? 'process' : 'codes'}`;
      const { artifact: entities } = csv('ontology_entity', [owner], prefix);
      const { artifact: chunks } = csv('chunk', [reverse, forward], prefix);
      const evidence = gatherEvidence(response([chunks, entities]), ['sampleowner'], [], new Set([OWA]), [],
        parseOwaQuestion(question));
      const hit = evidence.find(item => item.artifact === chunks)?.hits[0];
      assert.equal(hit?.recordId, 'forward');
      assert.equal(evidence.find(item => item.artifact === chunks).hits.length, 1);
      assert.deepEqual(hit.owa.units, [{ facet: 'workflow', text: forwardText }]);
      assert.equal(hit.score, 0);
    });
  }
}

test('I1 arrow headings: incidental body code lists never establish a requested workflow direction', () => {
  const owner = entity('opaque:lists', 'Przedmiot próbny', { aliases: 'SampleOwner' });
  for (const [source, target] of headingDirectionPairs) {
    for (const heading of ['Informacje', 'Proces']) {
      const text = `## ${heading}\nLista symboli: ${source}, ${target}. UNKNOWN: bez wskazania kierunku.`;
      const listed = chunk('list', owner.fields.id, text);
      const listedRow = workflow('list-row', owner.fields.id, '', `Lista symboli: ${source}, ${target}.`);
      const question = `OWA SampleOwner proces ${source} → ${target}`;
      assert.deepEqual(ids(select(question, [owner, listed, listedRow])), [owner.fields.id]);
      assert.deepEqual(units(question, listed), []);
      assert.deepEqual(units(question, listedRow), []);
    }
    // A leading list cannot override an explicit reverse arrow in the body.
    const reverse = chunk('reverse', owner.fields.id,
      `## Proces\nLista symboli: ${source}, ${target}.\n${target} → ${source}: zmienia skutek.`);
    assert.deepEqual(units(`OWA SampleOwner proces ${source} → ${target}`, reverse), []);
  }
});

test('I1 arrow headings: declared direction wins over leading incidental lists and supports inline source arrows', () => {
  for (const [source, target, arrow] of headingDirectionPairs) {
    const input = chunk('inline', 'opaque:owner',
      `## Informacje\nLista symboli: ${target}, ${source}.\n${source} ${arrow} ${target}: nie powiela skutku. UNKNOWN: warunek.`);
    const question = `OWA proces ${source} → ${target}`;
    assert.deepEqual(units(question, input), [{ facet: 'workflow', text: input.fields.content }]);
    assert.deepEqual(units(`OWA proces ${target} → ${source}`, input), []);
  }
});

test('I1 workflow direction: gathered chunk hits retain only complete forward units before caps', () => {
  const owner = entity('opaque:owner', 'Przedmiot próbny', { aliases: 'SampleOwner' });
  const forward = chunk('forward', owner.fields.id, '## Proces\nPZ → FZ: zapas nie zwiększa się drugi raz. UNKNOWN: warunek.');
  const reverse = chunk('reverse', owner.fields.id, '## Proces\nFZ → PZ: odwrotny proces.');
  const unrelated = chunk('unrelated', owner.fields.id, '## Proces\nWZ → FS: inny proces.');
  const { artifact: entities } = csv('ontology_entity', [owner], 'i1');
  const { artifact: chunks } = csv('chunk', [reverse, unrelated, forward], 'i1');
  const selected = gatherEvidence(response([chunks, entities]), ['sampleowner'], [], new Set([OWA]), [],
    parseOwaQuestion('OWA SampleOwner proces PZ → FZ'));
  const hits = selected.find(item => item.artifact === chunks)?.hits;
  assert.deepEqual(hits?.map(hit => hit.recordId), ['forward']);
  assert.equal(hits[0].owa.units[0].text, forward.fields.content);
  assert.equal(hits[0].score, 0);
});

test('I2 nested facet: gatherer retains an owned mixed-facet hierarchy without detaching conditions', () => {
  const content = '## Pola\nWyłącznie w wersji testowej.\n### Identyfikatory\nPrb_Id jest kluczem.\n\n'
    + '| pole | rola |\n| --- | --- |\n| Prb_Id | PK |\n| Prb_Ref | FK |\n\nUNKNOWN: mapowanie do potwierdzenia.';
  const owner = entity('opaque:nested', 'Przedmiot próbny', { aliases: 'SampleOwner' });
  const { artifact: entities } = csv('ontology_entity', [owner], 'i2');
  const { artifact: chunks } = csv('chunk', [chunk('nested', owner.fields.id, content)], 'i2');
  const selected = gatherEvidence(response([chunks, entities]), ['sampleowner'], [], new Set([OWA]), [],
    parseOwaQuestion('OWA SampleOwner identyfikatory'));
  const hit = selected.find(item => item.artifact === chunks)?.hits[0];
  assert(hit, 'gatherer lost the requested nested identifier');
  assert.deepEqual(hit.owa.facets, ['identifiers']);
  assert.equal(hit.owa.units[0].text, content);
});

test('scanner retains parsed OWA records before caps even at limit zero, with private literal locators', () => {
  const { artifact, bytes } = csv('ontology_entity', [tariff, product]);
  const scanned = scanArtifact(artifact, ['taryfa'], [], 0, false,
    { namespace: OWA, context: parseOwaQuestion('OWA SampleProduct ceny') });
  assert.deepEqual(scanned.hits, []);
  assert.equal(scanned.owaRows?.length, 2);
  assert.equal(scanned.owaRows[1].fields.description, description);
  assert.equal(scanned.owaRows[1].namespace, OWA);
  assert.equal(scanned.owaRows[1].artifact, artifact);
  assert.equal(scanned.owaRows[1].contentHash, 'sha256:' + crypto.createHash('sha256').update(bytes).digest('hex'));
  assert.equal(scanned.owaRows[1].line, 3);
  assert(scanned.owaRows[1].endLine > 3);
  assert(!Object.keys(scanned).includes('owaRows'));
  assert(!JSON.stringify(scanned).includes('opaque:product-7'));
});

test('full OWA body priority is opt-in and leaves generic summary selection unchanged', () => {
  const { artifact } = csv('ontology_entity', [product]);
  const legacy = scanArtifact(artifact, ['sampleproduct']).hits[0];
  const scoped = scanArtifact(artifact, ['sampleproduct'], [], 4, false,
    { namespace: OWA, context: parseOwaQuestion('OWA SampleProduct ceny') }).hits[0];
  const other = scanArtifact(artifact, ['sampleproduct'], [], 4, false,
    { namespace: 'OtherKB', context: parseOwaQuestion('OWA SampleProduct ceny') }).hits[0];
  assert.equal(legacy.bodyField, 'summary');
  assert.equal(other.bodyText, legacy.bodyText);
  assert.equal(scoped.bodyField, 'description');
  assert.equal(scoped.bodyText, description);
});

test('gatherer indexes across artifacts before lexical top-k and retains zero-score same-owner units', () => {
  const { artifact: entities } = csv('ontology_entity', [tariff, product]);
  const noise = Array.from({ length: 8 }, (_, index) => chunk(`noise-${index}`, tariff.fields.id,
    '## Otwarte problemy\nSampleProduct UNKNOWN SampleProduct UNKNOWN'));
  const { artifact: chunks, bytes } = csv('chunk', [...noise, zero]);
  const selected = gatherEvidence(response([chunks, entities]), ['sampleproduct'], [], new Set([OWA]), [],
    parseOwaQuestion('OWA SampleProduct UNKNOWN'));
  const item = selected.find(item => item.artifact === chunks);
  assert(item);
  assert.deepEqual(item.hits.map(hit => hit.recordId), ['zero']);
  assert.equal(item.hits[0].score, 0);
  assert.deepEqual(item.hits[0].owa.ownerIds, [product.fields.id]);
  assert.equal(item.hits[0].owa.units[0].facet, 'unknownEnums');
  assert(item.hits[0].owa.units[0].text.endsWith('brak rozstrzygnięcia.'));
  assert.equal(item.contentHash, 'sha256:' + crypto.createHash('sha256').update(bytes).digest('hex'));
  assert.equal(item.locator, `L${item.hits[0].line}-L${item.hits[0].endLine}`);
  assert(!Object.keys(item.hits[0]).includes('owa'));
  assert(!Object.keys(item).includes('owaSelection'));
  assert.deepEqual(selected.owaSelection.ownerIds, [product.fields.id]);
});

test('all requested fields and source versions survive scanner caps without cross-owner contamination', () => {
  const { artifact: entities } = csv('ontology_entity', [product, tariff]);
  const fields = Array.from({ length: 9 }, (_, index) => field(`F${index}`, product.fields.id, `Prb_Val${index}`));
  const { artifact: mappings } = csv('ontology_field', [...fields, field('foreign-field', tariff.fields.id, 'Tar_Id')]);
  const { artifact: older } = csv('ontology_entity', [{ ...product, fields: { ...product.fields,
    description: '## Pola\nUNKNOWN: stara wersja.', verificationStatus: 'UNKNOWN' } }], 'older');
  const selected = gatherEvidence(response([entities, older, mappings]), ['sampleproduct'], [], null, [],
    parseOwaQuestion('OWA SampleProduct mapowanie pól'));
  const hits = selected.find(item => item.artifact === mappings).hits;
  assert.equal(hits.length, 9);
  assert(hits.every(hit => hit.owa.units[0].text.includes('mappingStatus')));
  const versions = selected.filter(item => item.hits.some(hit => hit.recordId === product.fields.id));
  assert.equal(versions.length, 2);
  assert.notEqual(versions[0].contentHash, versions[1].contentHash);
});

test('effective scope is checked before scanning or indexing and non-OWA uses generic retrieval', () => {
  const { artifact } = csv('ontology_entity', [product]);
  const generic = write('generic.csv', 'id,content\nother,SampleProduct generic evidence\n');
  const routed = response([artifact, 'not-permitted/malformed.csv'], [{ name: 'OtherKB', artifacts: [generic] }]);
  const diagnostics = [];
  const selected = gatherEvidence(routed, ['sampleproduct'], [], new Set(['OtherKB']), diagnostics,
    parseOwaQuestion('OWA SampleProduct ceny'));
  assert.deepEqual(selected.map(item => item.kb), ['OtherKB']);
  assert.deepEqual(diagnostics, []);
  assert.equal(selected.owaSelection, undefined);
  assert.equal(selected[0].hits[0].owa, undefined);
  assert.deepEqual(gatherEvidence(routed, ['sampleproduct'], [], new Set(), [], parseOwaQuestion('OWA SampleProduct')), []);
});

test('excluded OWA CSV is never read even if the caller supplies an explicit OWA context', () => {
  const forbidden = write('excluded/ontology_entity.csv', 'id,content\nX,"malformed');
  const originalRead = fs.readFileSync;
  fs.readFileSync = function(file, ...args) {
    assert.notEqual(String(file), path.join(root, forbidden), 'excluded source was read');
    return originalRead.call(this, file, ...args);
  };
  try {
    const diagnostics = [];
    assert.deepEqual(gatherEvidence(response([forbidden]), ['sampleproduct'], [], new Set(['OtherKB']),
      diagnostics, parseOwaQuestion('OWA SampleProduct ceny')), []);
    assert.deepEqual(diagnostics, []);
  } finally { fs.readFileSync = originalRead; }
});

test('scoped OWA never promotes shared URL/path to foreign ownership; legacy URL siblings stay unchanged', () => {
  const input = [zero, foreign].map(item => ({ ...item, fields: { ...item.fields,
    sourceUrl: 'https://example.invalid/shared', sourcePath: 'same/path.md' } }));
  // Additional sourceUrl header models the generic URL contract, not a real-corpus read.
  const columns = [...headers.chunk.split(','), 'sourceUrl'];
  const bytes = [columns, ...input.map(item => columns.map(key => item.fields[key] || ''))]
    .map(cells => cells.map(value => '"' + value.replaceAll('"', '""') + '"').join(',')).join('\n');
  const artifact = write('urls/chunk.csv', bytes);
  const legacy = scanArtifact(artifact, ['sampleproduct'], [], 3, true);
  assert.equal(legacy.siblingHits.length, 2);
  const { artifact: entities } = csv('ontology_entity', [product, tariff]);
  const selected = gatherEvidence(response([artifact, entities]), ['sampleproduct'], [], null, [],
    parseOwaQuestion('OWA SampleProduct UNKNOWN'));
  const item = selected.find(item => item.artifact === artifact);
  assert.deepEqual(item.hits.map(hit => hit.recordId), ['zero']);
  assert.equal(item.hits[0].source.sourceUrl, 'https://example.invalid/shared');
  assert.equal(item.hits[0].source.owningPath, 'same/path.md');
  assert.equal(item.siblingArtifacts.length, 0);
});

test('malformed permitted CSV cannot supply ownership or facts; excluded diagnostics stay private', () => {
  const artifact = write('bad/ontology_entity.csv', 'id,name,description\nA,SampleProduct,"unterminated\n');
  const { artifact: chunks } = csv('chunk', [zero]);
  const diagnostics = [];
  const selected = gatherEvidence(response([artifact, chunks]), ['sampleproduct'], [], null, diagnostics,
    parseOwaQuestion('OWA SampleProduct UNKNOWN'));
  assert.deepEqual([...selected], []);
  assert.equal(selected.owaSelection.missing, true);
  assert.deepEqual(diagnostics, [{ artifact, code: 'invalid_csv' }]);
});

test('unknown reference never triggers sourcePath reads or a generic lexical fallback', () => {
  const { artifact: entities } = csv('ontology_entity', [product]);
  const { artifact: chunks } = csv('chunk', [chunk('dangling', 'SampleProduct',
    '## Ceny\nSampleProduct prices', { sourcePath: '/must-not-be-read/secret' })]);
  const originalRead = fs.readFileSync;
  const reads = [];
  fs.readFileSync = function(file, ...args) { reads.push(String(file)); return originalRead.call(this, file, ...args); };
  try {
    const selected = gatherEvidence(response([entities, chunks]), ['sampleproduct'], [], null, [],
      parseOwaQuestion('OWAOntology.NoSuchIdentity SampleProduct ceny'));
    assert.deepEqual([...selected], []);
    assert.equal(selected.owaSelection.missing, true);
    assert(reads.every(file => [entities, chunks].some(artifact => file === path.join(root, artifact))));
  } finally { fs.readFileSync = originalRead; }
});

test('answer entrypoint supplies request context only to its routed permitted OWA scan', async () => {
  // Static routing is local code/configuration, not a runtime artifact.
  write('docs/reference/ERP_Knowledge_Assistant_Routing.json', fs.readFileSync(
    new URL('../docs/reference/ERP_Knowledge_Assistant_Routing.json', import.meta.url)));
  csv('ontology_entity', [tariff, product], 'exports/owa_ontology/v1');
  csv('chunk', [foreign, zero], 'exports/owa_ontology/v1');
  const originalLearning = process.env.ENABLE_LIVE_LEARNING;
  const originalDraft = process.env.EXA_AUTO_DRAFT;
  process.env.ENABLE_LIVE_LEARNING = '0';
  process.env.EXA_AUTO_DRAFT = '0';
  try {
    const { answer } = await answerQuestion('OWA SampleProduct UNKNOWN', new Set([OWA]));
    const item = answer.evidence.find(item => item.artifact.endsWith('/chunk.csv'));
    assert(item);
    assert.deepEqual(item.hits.map(hit => hit.recordId), ['zero']);
    assert.equal(answer.retrieval.backend, 'local_artifacts');
    assert.equal(answer.retrieval.graphUsed, false);
  } finally {
    for (const [key, value] of [['ENABLE_LIVE_LEARNING', originalLearning], ['EXA_AUTO_DRAFT', originalDraft]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
