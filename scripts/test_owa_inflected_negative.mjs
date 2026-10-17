// Necessary-negative and original-grammar differential controls; synthetic only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
const source = fs.readFileSync(new URL('./lib/owa_query_context.mjs', import.meta.url), 'utf8')
  .replace(/^import .*;$/m, '').replaceAll('export function ', 'function ');
const oracle = new Function(source + `
  return (text, label, { inflect = false, exact = false } = {}) => {
    text = exact ? String(text) : normalize(text); label = exact ? String(label) : normalize(label);
    if (!label) return [];
    const pattern = inflect ? label.split(/\\s+/).map(wordPattern).join('\\\\s+') : escape(label);
    const boundary = exact ? '\\\\p{L}\\\\p{N}_.:-' : '\\\\p{L}\\\\p{N}_';
    const end = exact ? '(?![\\\\p{L}\\\\p{N}_-]|[.:][\\\\p{L}\\\\p{N}_.:-])' : '(?![' + boundary + '])';
    return [...text.matchAll(new RegExp('(?<![' + boundary + '])' + pattern + end, 'gu'))]
      .map(m => ({ start: m.index, end: m.index + m[0].length }));
  };`)();
function fixture() {
  let allocations = 0;
  const api = new Function('RegExp', source + '\nreturn { mentions: owaMetadataMentions, create: createOwaMentionContext };')(
    new Proxy(RegExp, { construct(target, args) { allocations++; return new target(...args); } }));
  return { ...api, allocations: () => allocations };
}

test('absent necessary inflected literals skip dynamic regex construction', () => {
  const f = fixture();
  for (const label of ['karta próbna', 'dokument', 'pracownik', 'łączenie', 'faktura', 'miedziany', 'handlowa', 'niebieski', 'A.[B]+']) {
    assert.deepEqual(f.mentions('zupełnie inny tekst', label, { inflect: true }), []);
  }
  assert.equal(f.allocations(), 0, 'derive negatives from wordPattern branches before boundary regex');
});

test('literal common prefixes never substitute for boundary or full-ending positives', () => {
  const f = fixture();
  for (const [text, label] of [['kartofel', 'karta'], ['dokumencik', 'dokument'], ['pracowniczy', 'pracownik'],
    ['xkarty kartyx (karty)', 'karta'], ['Id:a.Child Id:a. Id:a:', 'Id:a']]) {
    assert.deepEqual(f.mentions(text, label, { inflect: true, exact: label === 'Id:a' }), oracle(text, label, { inflect: true, exact: label === 'Id:a' }));
  }
  assert.equal(f.allocations(), 5, 'potential matches still run original full regex');
});

test('every grammatical family and Unicode/opaque boundary matches original with and without reuse', () => {
  const groups = [
    ['niebieski', 'niebiesk', ['i','iego','iemu','im','a','iej','ie','ich','imi']],
    ['miedziany', 'miedzian', ['y','ego','emu','ym','a','ej','e','ych','ymi']],
    ['łączenie', 'łączen', ['ie','ia','iu','iem']], ['handlowa', 'handlow', ['a','ej','e','ego','ym','ych','ymi']],
    ['karta', 'kart', ['a','y','i','e','ie','om','ami','ach']], ['próbna', 'próbn', ['a','y','i','e','ie','om','ami','ach','ej','ych','ymi']],
    ['rejestr', 'rejestr', ['', 'a','u','owi','em','iem','ie','y','ow','om','ami','ach']],
  ];
  const pairs = groups.flatMap(([label, stem, endings]) => endings.map(end => [stem + end, label]));
  pairs.push(['fakturze','faktura'], ['dokumencie','dokument'], ['dokumenci','dokument'], ['samochodzie','samochód'], ['rejestrze','rejestr'], ['pracownicy','pracownik']);
  pairs.push(['karty\npróbnej', 'karta próbna'], ['ŻÓŁĆ', 'żółć'], ['zółć', 'żółć'], ['Łódź', 'ŁÓDŹ'],
    ['Id:a.', 'Id:a'], ['Id:a.Child', 'Id:a'], ['A.[B]+', 'A.[B]+'], ['漢字', '漢字'], ['a😀b', '😀'], ['', ''], [' ', ' ']);
  const f = fixture(), cached = f.create();
  let cases = 0;
  for (const [form, label] of pairs) for (const [left, right] of [['',''], ['(',')'], ['x','x'], ['ż','ą'], ['漢','字'], ['_','_'], ['\u0301','\u0301'], ['.',':']]) {
    for (const exact of [false, true]) for (const inflect of [false, true]) {
      const text = left + form + right, options = { exact, inflect }, expected = oracle(text, label, options);
      assert.deepEqual(f.mentions(text, label, options), expected, JSON.stringify([text, label, options]));
      assert.deepEqual(cached.mentions(text, label, options), expected);
      assert.deepEqual(cached.mentions(text, label, options), expected); cases++;
    }
  }
  console.log('original-grammar differential tuples:', cases);
});
