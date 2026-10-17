// Synthetic operation/differential controls. No corpus, provider, runtime or file writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { owaMetadataMentions, parseOwaQuestion, matchesOwaField } from './lib/owa_query_context.mjs';
import { buildSemanticCatalog } from './lib/semantic_catalog.mjs';
import { resolveSemanticSubjects } from './lib/semantic_requirements.mjs';

const source = fs.readFileSync(new URL('./lib/owa_query_context.mjs', import.meta.url), 'utf8');
function fixture(onConstruct = () => {}) {
  let constructions = 0;
  const api = new Function('RegExp', source.replace(/^import .*;$/m, '').replaceAll('export function ', 'function ')
    + '\nreturn { owaMetadataMentions, create: typeof createOwaMentionContext === "function" ? createOwaMentionContext : null };')(
    new Proxy(RegExp, { construct(target, args) { constructions++; onConstruct(); return new target(...args); } }));
  // Baseline adapter lets the RED control demonstrate repeated work, not missing-module failure.
  const create = api.create || (() => ({ mentions: api.owaMetadataMentions, clear() {} }));
  return { create, calls: () => constructions };
}

test('one request computes each repeated positive and negative tuple only once', () => {
  const f = fixture(), context = f.create();
  for (let i = 0; i < 5; i++) {
    assert.deepEqual(context.mentions('karty próbnej', 'karta próbna', { inflect: true }), [{ start: 0, end: 13 }]);
    assert.deepEqual(context.mentions('ID.Child', 'ID', { exact: true }), []);
  }
  assert.equal(f.calls(), 2, 'one authoritative computation per exact tuple, including negative spans');
});

test('clear discards negative entries; requests and flags do not share entries', () => {
  const f = fixture(), a = f.create(), b = f.create();
  a.mentions('ID.Child', 'ID', { exact: true });
  a.mentions('ID.Child', 'ID', { exact: true });
  assert.equal(f.calls(), 1);
  a.clear();
  a.mentions('ID.Child', 'ID', { exact: true });
  assert.equal(f.calls(), 2, 'clear also removes negative entries');
  b.mentions('ID.Child', 'ID', { exact: true });
  assert.equal(f.calls(), 3, 'new request recomputes');
  for (const options of [{}, { inflect: true }, { exact: true, inflect: true }]) {
    const expected = owaMetadataMentions('ID.Child', 'ID', options);
    assert.deepEqual(a.mentions('ID.Child', 'ID', options), expected);
  }
  assert.equal(f.calls(), 6, 'all exact/inflect combinations are distinct');
  a.mentions('id.Child', 'id', { exact: true });
  assert.equal(f.calls(), 7, 'raw case is part of the key');
});

test('misses and hits expose fresh mutable arrays and span objects', () => {
  const context = fixture().create();
  const first = context.mentions('ID ID', 'ID', { exact: true });
  first[0].start = 99; first.push({ start: 77, end: 88 });
  const hit = context.mentions('ID ID', 'ID', { exact: true });
  assert.deepEqual(hit, [{ start: 0, end: 2 }, { start: 3, end: 5 }]);
  hit[1].end = 100; hit.shift();
  assert.deepEqual(context.mentions('ID ID', 'ID', { exact: true }), [{ start: 0, end: 2 }, { start: 3, end: 5 }]);
  const empty = context.mentions('ID.Child', 'ID', { exact: true }); empty.push({ start: 0, end: 2 });
  assert.deepEqual(context.mentions('ID.Child', 'ID', { exact: true }), []);
});

test('entry and character admission caps preserve results and release on clear', () => {
  const f = fixture(), limited = f.create({ maxEntries: 1, maxCharacters: 1024 });
  limited.mentions('ID', 'ID', { exact: true });
  for (let i = 0; i < 3; i++) assert.deepEqual(limited.mentions('XX', 'XX', { exact: true }), [{ start: 0, end: 2 }]);
  assert.equal(f.calls(), 4, 'over-cap tuple computes without retention');
  limited.mentions('ID', 'ID', { exact: true }); assert.equal(f.calls(), 4, 'admitted entry remains usable');
  limited.clear(); limited.mentions('XX', 'XX', { exact: true }); limited.mentions('XX', 'XX', { exact: true });
  assert.equal(f.calls(), 5, 'clear releases admission budget');
  const tiny = f.create({ maxEntries: 100, maxCharacters: 1 });
  tiny.mentions('ID', 'ID'); tiny.mentions('ID', 'ID');
  assert.equal(f.calls(), 7, 'oversized tuple bypasses retention');
});

test('reentrant computation cannot replace another request context', () => {
  let nested, active = false;
  const f = fixture(() => {
    if (!nested || active) return;
    active = true;
    try { nested.mentions('OTHER OTHER', 'OTHER', { exact: true }); } finally { active = false; }
  });
  const outer = f.create(); nested = f.create();
  assert.deepEqual(outer.mentions('ID ID', 'ID', { exact: true }), [{ start: 0, end: 2 }, { start: 3, end: 5 }]);
  assert.deepEqual(outer.mentions('ID ID', 'ID', { exact: true }), [{ start: 0, end: 2 }, { start: 3, end: 5 }]);
  assert.equal(f.calls(), 2, 'outer and nested request retain independent tuples');
});

test('exact tuples are unambiguous and coercible inputs retain original semantics', () => {
  const context = fixture().create();
  for (const [text, label] of [['a,b', 'c'], ['a', 'b,c'], ['["x"]', 'x'], ['null', null], [null, 'null'], [undefined, undefined],
    [{ toString: () => 'ID' }, 'ID'], ['ID', { toString: () => 'ID' }]]) {
    for (const exact of [false, true]) for (const inflect of [false, true]) {
      assert.deepEqual(context.mentions(text, label, { exact, inflect }), owaMetadataMentions(text, label, { exact, inflect }));
    }
  }
});

test('resolver and nominal comparisons use one local context, released between calls', () => {
  const f = fixture();
  const requirements = fs.readFileSync(new URL('./lib/semantic_requirements.mjs', import.meta.url), 'utf8');
  const resolve = new Function('parseOwaQuestion', 'matchesOwaField', 'owaMetadataMentions', 'createOwaMentionContext',
    requirements.replace(/^import .*;$/m, '').replaceAll('export function ', 'function ') + '\nreturn resolveSemanticSubjects;')(
    parseOwaQuestion, matchesOwaField, owaMetadataMentions, f.create);
  const rows = ['a', 'b', 'c'].map((id, i) => ({ namespace: 'OWAOntology', artifact: 'ontology_entity.csv',
    fields: { id, canonicalName: ['Karta próbna', 'Grupa próbna', 'Obiekt próbny'][i], name: 'Rejestr próbny', description: 'Zapis próbny.' } }));
  const catalog = buildSemanticCatalog(rows, new Set(['OWAOntology']));
  const actual = resolve('Karta próbna: jej klucz', 'entity', catalog);
  assert.deepEqual(actual, resolveSemanticSubjects('Karta próbna: jej klucz', 'entity', catalog));
  const first = f.calls();
  assert(first > 0, 'actual resolver must use local reuse context');
  resolve('Karta próbna: jej klucz', 'entity', catalog);
  assert.equal(f.calls(), 2 * first, 'no cross-request retention');
});
