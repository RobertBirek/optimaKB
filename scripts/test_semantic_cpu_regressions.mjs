// First-wave CPU contracts. Synthetic inputs; no corpus, environment or runtime I/O.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { test } from 'node:test';
import { owaMetadataMentions, owaDocumentPaths } from './lib/owa_query_context.mjs';
import { buildSemanticCatalog } from './lib/semantic_catalog.mjs';

// Explicit RED controls never edit a production file. Normal --test has no variant.
const variant = process.argv.find(arg => arg.startsWith('--counterfactual='))?.split('=')[1];
assert([undefined, 'literal', 'catalog'].includes(variant), 'Unknown counterfactual');
const read = relative => fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
const originalCatalogSource = read('./fixtures/semantic_catalog_pre_cpu.source.txt');
assert(Buffer.byteLength(originalCatalogSource) <= 16384, 'Bounded code-only oracle');
assert.equal(crypto.createHash('sha256').update(originalCatalogSource).digest('hex'),
  '1044e9c75b491086703a2989054856aaa3840092cd767fc86dc5ca4af153f9c6', 'Exact pre-CPU catalog at f23796f; never discover a corpus/oracle fallback');
function replaceOnce(source, from, to) {
  assert.equal(source.split(from).length, 2, 'Instrumentation precondition: ' + from);
  return source.replace(from, to);
}
function codeBody(source) {
  return source.replace(/^import .*;$/m, '').replaceAll('export function ', 'function ');
}
function observedMentions() {
  let constructions = 0, source = read('./lib/owa_query_context.mjs');
  if (variant === 'literal') source = replaceOnce(source, '  if (!inflect && !text.includes(label)) return [];\n', '');
  const mentions = new Function('RegExp', codeBody(source) + '\nreturn owaMetadataMentions;')(
    new Proxy(RegExp, { construct(target, args) { constructions++; return new target(...args); } }));
  return { mentions, constructions: () => constructions };
}
function observedCatalog() {
  const counts = { kinds: 0, refs: 0 };
  let source = variant === 'catalog' ? originalCatalogSource : read('./lib/semantic_catalog.mjs');
  source = replaceOnce(source, 'function rowKind(row) {', 'function rowKind(row) { counts.kinds++;');
  source = replaceOnce(source, '=> JSON.stringify([namespace, id])', '=> (counts.refs++, JSON.stringify([namespace, id]))');
  const build = new Function('owaDocumentPaths', 'counts', codeBody(source) + '\nreturn buildSemanticCatalog;')(owaDocumentPaths, counts);
  return { build, counts };
}
const originalCatalog = new Function('owaDocumentPaths', codeBody(originalCatalogSource) + '\nreturn buildSemanticCatalog;')(owaDocumentPaths);
const scope = new Set(['OWAOntology', 'ComarchOptimaBusinessSemantics']);
const row = (id, extra = {}, kind = 'ontology_entity', namespace = 'OWAOntology') => ({
  namespace, artifact: `fixture/${kind}.csv`, line: 2, endLine: 9, contentHash: 'sha256:' + 'a'.repeat(64), fields: { id, ...extra },
});

test('absent noninflected exact and folded literals construct no dynamic regex', () => {
  const f = observedMentions();
  for (const options of [{ exact: true }, {}, { exact: true, inflect: false }, { inflect: false }]) {
    assert.deepEqual(f.mentions('Żółty rejestr', 'Missing.[ID]+', options), []);
  }
  assert.equal(f.constructions(), 0, 'literal absence must short-circuit before regex allocation');
  assert.deepEqual(f.mentions('present', 'present'), [{ start: 0, end: 7 }]);
  assert.equal(f.constructions(), 1, 'present literals still run authoritative boundary regex');
  assert.deepEqual(f.mentions('karty', 'karta', { inflect: true }), [{ start: 0, end: 5 }]);
  assert.equal(f.constructions(), 2, 'inflection cannot be rejected by whole-label literal absence');
});

test('literal negatives preserve Unicode boundaries, folding, escaped literals, opaque extensions and fresh spans', () => {
  for (const [text, label, options, expected] of [
    ['ŁÓDŹ lodz', 'łódź', {}, [{ start: 0, end: 4 }, { start: 5, end: 9 }]],
    ['żółć', 'ŻÓŁĆ', { exact: true }, []],
    ['A.[B]+', 'A.[B]+', { exact: true }, [{ start: 0, end: 6 }]],
    ['AxxB', 'A.B', {}, []],
    ['(Id:a).', 'Id:a', { exact: true }, [{ start: 1, end: 5 }]],
    ['Id:a:', 'Id:a', { exact: true }, [{ start: 0, end: 4 }]],
    ['Id:a.Child Id:a:Child Id:a-x Id:a_7 xId:a .Id:a :Id:a -Id:a', 'Id:a', { exact: true }, []],
    ['漢Name Name漢 éName Nameé', 'Name', { exact: true }, []],
    ['\u0301Name Name\u0301', 'Name', { exact: true }, [{ start: 1, end: 5 }, { start: 6, end: 10 }]],
    ['karty\npróbnej', 'karta próbna', { inflect: true }, [{ start: 0, end: 13 }]],
    ['', '', {}, []], ['abc', '', {}, []],
  ]) assert.deepEqual(owaMetadataMentions(text, label, options), expected, JSON.stringify([text, label, options]));
  const first = owaMetadataMentions('ID ID', 'ID', { exact: true });
  first[0].start = 999; first.pop();
  assert.deepEqual(owaMetadataMentions('ID ID', 'ID', { exact: true }), [{ start: 0, end: 2 }, { start: 3, end: 5 }]);
});

for (const metric of ['kinds', 'refs']) test(`${metric}: catalog operations grow linearly with selected rows`, () => {
  const observations = [];
  for (const n of [100, 400, 1200]) {
    const rows = Array.from({ length: n }, (_, i) => row(`owner:${i}`, { name: `Owner ${i}` }));
    rows.push(...Array.from({ length: n }, (_, i) => row(`chunk:${i}`, { sourceDocumentRefId: `owner:${i}`, content: `Pole: F_${i}` }, 'chunk')));
    const { build, counts } = observedCatalog();
    const catalog = build(rows, scope);
    assert.equal(catalog.fields.length, n, 'real owned declarations, not an empty fast path');
    observations.push({ n, ...counts });
    console.log('catalog operation counts:', JSON.stringify(observations.at(-1)));
    if (metric === 'kinds') assert.equal(counts.kinds, rows.length, 'one classification per selected row occurrence');
    else assert(counts.refs <= 6 * rows.length, 'reference association must be linear, not per owner');
  }
  assert.equal(observations[2][metric] / observations[0][metric], 12);
});

test('complete ordered catalog graph and exact origins equal the bound pre-CPU oracle', () => {
  const a = row('a', { ontologyId: 'a', canonicalName: 'Karta morska', aliases: 'AliasRef', mainTable: 'DB.Sea', description: 'Pole: Own_A' });
  const b = row('b', { ontologyId: 'shared', canonicalName: 'Obiekt drugi' });
  const c = row('c', { ontologyId: 'shared', canonicalName: 'Obiekt trzeci' });
  const other = row('a', { canonicalName: 'Reguła inna' }, 'business_description', 'ComarchOptimaBusinessSemantics');
  const chunk = (id, ref, content, ns) => row(id, { sourceDocumentRefId: ref, content }, 'chunk', ns);
  const first = chunk('first', 'a', 'Zdanie pierwsze.\nPole: First_A\nSymbol: ZZ; Status: UNKNOWN\n## Tabele MSSQL\n- `DB.Extra`');
  const last = chunk('last', 'a', 'Zdanie ostatnie.\nPole: Last_A');
  const duplicate = row('dup', { canonicalName: 'Duplikat' });
  const document = row('doc', { canonicalName: 'Przesyłka próbna (ZZ)', aliases: 'Spis próbny', classification: 'document' });
  const transformation = row('change', { canonicalName: 'Zmiana ZZ' });
  const edge = row('edge', { sourceEntityRefId: 'a', targetEntityRefId: 'shared', status: 'UNKNOWN' }, 'ontology_relation');
  const workflow = row('flow', { workflowName: 'Przebieg próbny', sourceEntityRefId: 'a', targetEntityRefId: 'absent', description: 'AAA → MISSING → AAA' }, 'workflow_pattern');
  const rows = [first, a, b, chunk('ambiguous', 'shared', 'Pole: Must_Not_Appear'), c, other,
    chunk('foreign', 'a', 'Pole: Other_A', 'ComarchOptimaBusinessSemantics'),
    chunk('alias', 'AliasRef', 'Pole: Alias_Must_Not_Appear'), chunk('missing', 'absent', 'Pole: Missing_Must_Not_Appear'),
    row('f', { entityRefId: 'shared', fieldName: 'Shared_Field' }, 'ontology_field'),
    duplicate, duplicate, chunk('dupchunk', 'dup', 'Pole: Duplicate_Must_Not_Appear'), last, last,
    document, transformation, edge, workflow];
  const before = JSON.stringify(rows);
  const actual = buildSemanticCatalog(rows, scope);
  assert.deepEqual(actual, originalCatalog(rows, scope), 'all arrays, Maps, private phrases/tables/compositions, owners and locators');
  assert.equal(JSON.stringify(rows), before);
  assert.deepEqual(actual.fields.filter(f => f.owner.origin === a).map(f => f.name), ['Own_A', 'First_A', 'Last_A', 'Last_A']);
  assert.deepEqual(actual.fields.filter(f => f.name === 'Shared_Field').map(f => f.owner.origin), [b, c]);
  assert.equal(actual.references.get(JSON.stringify(['OWAOntology', 'a'])).length, 1, 'id == ontologyId is one owner');
  assert.equal(actual.references.get(JSON.stringify(['OWAOntology', 'dup'])).length, 2, 'repeated identical row remains ambiguous');
  assert(!actual.fields.some(f => f.name.includes('Must_Not_Appear')));
  assert(actual.identities.find(i => i.origin === transformation).compositions.length > 0, 'exercise private composition links');
  assert.deepEqual(actual.workflows[0].documentPaths, [['AAA', 'MISSING', 'AAA']]);
  assert.deepEqual(actual.workflows[0].unresolvedEndpointIds, ['absent']);
  const origins = new Set(rows), identities = new Set(actual.identities);
  for (const entry of [...actual.identities, ...actual.fields, ...actual.symbols, ...actual.relations, ...actual.workflows,
    ...actual.identities.flatMap(i => [...i.phrases, ...i.tables, ...i.compositions])]) {
    assert(origins.has(entry.origin), 'original row object identity');
    if (entry.owner) assert(identities.has(entry.owner), 'actual catalog owner object');
    if (entry.targetOrigin) assert(origins.has(entry.targetOrigin));
    if (entry.targetIdentityOrigin) assert(origins.has(entry.targetIdentityOrigin));
  }
  first.fields.sourceDocumentRefId = 'b';
  assert.deepEqual(buildSemanticCatalog(rows, scope), originalCatalog(rows, scope), 'next request sees source changes');
  for (const namespace of scope) {
    const selectedScope = new Set([namespace]);
    assert.deepEqual(buildSemanticCatalog(rows, selectedScope), originalCatalog(rows, selectedScope), 'namespace-specific complete graph');
  }
});

test('excluded namespaces and empty scope are filtered before any private metadata read', () => {
  const forbidden = namespace => ({ namespace,
    get fields() { assert.fail('excluded fields inspected'); }, get artifact() { assert.fail('excluded artifact inspected'); } });
  assert.deepEqual(buildSemanticCatalog([forbidden('Private')], scope), originalCatalog([], scope));
  assert.deepEqual(buildSemanticCatalog([forbidden('OWAOntology'), forbidden('Private')], new Set()), originalCatalog([], new Set()));
  const { build, counts } = observedCatalog();
  assert.deepEqual(build([forbidden('Private')], scope), originalCatalog([], scope));
  assert.deepEqual(counts, { kinds: 0, refs: 0 });
});

test('ambiguous and dangling chunk bodies are not inspected or attached', () => {
  const rows = [row('a', { ontologyId: 'shared' }), row('b', { ontologyId: 'shared' })];
  for (const ref of ['shared', 'missing']) {
    const chunk = row('chunk:' + ref, { sourceDocumentRefId: ref }, 'chunk');
    Object.defineProperty(chunk.fields, 'content', { enumerable: true, get() { assert.fail('unowned or ambiguous body inspected'); } });
    rows.push(chunk);
  }
  assert.deepEqual(buildSemanticCatalog(rows, scope), originalCatalog(rows, scope));
});
