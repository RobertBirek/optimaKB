import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanBoilerplate } from './lib/content_cleaner.mjs';
import { assessSourceBody, assertSourceBodyAvailable } from './lib/source_body_validation.mjs';

const title = 'Problemy z odbiorem faktur z KSEF - Społeczność ERP';
const summary = `User query: problemy z KSeF Optima 2026
- The page title suggests a discussion about issues receiving invoices from KSeF (Krajowy System Elektronicznego Faktoringu) in the Comarch ERP community.
- It appears to address problems related to odbiór faktur (invoice reception) from KSEF, likely within ERP Optima (Comarch Optima) usage.
- No detailed content snippets are provided, so the summary focuses on the likely scope: troubleshooting or questions about importing/receiving KSEF invoices in Optima in 2026.
- For precise guidance, the page would typically cover error messages, steps for configuring KSEF integration, authentication/tokens, certificate setup, connectivity, and reconciliation in Optima, plus potential updates or patches for 2026.
If you need exact solutions or steps, I can extract and summarize the specific Q&A from the linked page (once you provide the content o...`;
const refusal = 'W dostarczonych materiałach nie ma surowej treści strony WWW ani artykułu do oczyszczenia. W związku z tym nie można na ich podstawie wykonać oczyszczania.';

const removableTitle = 'Udostępnij fakturę w KSeF - Społeczność ERP';
for (const [name, suppliedTitle, source, ok] of [
  ['cleaned title alone', removableTitle, removableTitle, false],
  ['cleaned title with logo and loader', removableTitle, `${removableTitle}\nloader\n![logo](assets/logo.svg)`, false],
  ['original title retained', removableTitle, removableTitle, false],
  ['two exact titles on one line', title, `${title} ${title}\nloader`, false],
  ['mixed full and suffixless titles', title, `${title} Problemy z odbiorem faktur z KSEF loader`, false],
  ['repeated cleaned titles', removableTitle, `${removableTitle} ${removableTitle}\nloader`, false],
  ['literal metacharacters repeated', 'Import (KSeF) [2026] + .?', 'Import (KSeF) [2026] + .? Import (KSeF) [2026] + .? loader', false],
  ['same cleaned title with short body', removableTitle, `${removableTitle}\nOK`, true],
  ['repeated titles with short trailing body', title, `${title} ${title} OK`, true],
  ['repeated titles with attached trailing body', title, `${title} ${title}: Wybierz Importuj.`, true],
  ['repeated cleaned titles with trailing instruction', removableTitle, `${removableTitle} ${removableTitle} Wybierz Importuj.`, true],
  ['loader prefix before repeated titles', title, `Loader ${title} ${title}`, true],
  ['loader prefix before cleaned title', removableTitle, `Loader ${removableTitle}`, true],
  ['repeated titles followed by quoted error', title, `${title} ${title} Komunikat „${refusal}” oznacza błąd ekstrakcji.`, true],
  ['cleaned title with quoted error body', removableTitle, `${removableTitle}\n> ${refusal}\nPobierz treść.`, true],
]) {
  test(`title shell regression: ${name}`, () => {
    const body = name === 'original title retained' ? source : cleanBoilerplate(source);
    assert.deepEqual(assessSourceBody(body, suppliedTitle), {
      ok, code: ok ? null : 'SOURCE_SHELL_ONLY',
    });
    if (ok) assert.doesNotThrow(() => assertSourceBodyAvailable(body, suppliedTitle));
    else assert.throws(() => assertSourceBodyAvailable(body, suppliedTitle), error => error.code === 'SOURCE_SHELL_ONLY');
  });
}

const rejected = [
  ['', 'EMPTY_SOURCE_BODY'],
  [' \t\r\n\u00a0 ', 'EMPTY_SOURCE_BODY'],
  [null, 'EMPTY_SOURCE_BODY'],
  [undefined, 'EMPTY_SOURCE_BODY'],
  [title, 'SOURCE_SHELL_ONLY'],
  [`${title} loader`, 'SOURCE_SHELL_ONLY'],
  [`## ${title}\n### Problemy z odbiorem faktur z KSEF\nLOADER`, 'SOURCE_SHELL_ONLY'],
  [` loader\n![logo](assets/logo.svg)\n${title}`, 'SOURCE_SHELL_ONLY'],
  [`  Problemy\t z odbiorem faktur z KSEF -\u00a0Społeczność ERP\r\n loader`, 'SOURCE_SHELL_ONLY'],
  ['loader', 'SOURCE_SHELL_ONLY'],
  ['![logo](logo.svg)', 'SOURCE_SHELL_ONLY'],
  [`${title}\n${title}\n![logotype](assets/img/logo.svg)\nloader`, 'SOURCE_SHELL_ONLY'],
  [refusal, 'SOURCE_CONTENT_UNAVAILABLE'],
  ['User query: problemy z KSeF Optima 2026\n- The page title suggests a discussion about receiving invoices.\n- No detailed content snippets are provided, so the summary focuses on the likely scope.', 'SOURCE_CONTENT_UNAVAILABLE'],
  [summary, 'SOURCE_CONTENT_UNAVAILABLE'],
  ['The page title suggests a discussion.\nNo detailed content snippets are provided.', 'SOURCE_CONTENT_UNAVAILABLE'],
];
const accepted = [
  'OK',
  'Wybierz Importuj, następnie zatwierdź.',
  `${title}\nOpis problemu: token wygasł. Rozwiązanie: odnowić token i ponowić odbiór faktur.`,
  'Loader importu zapisuje stan przetwarzania dokumentów.',
  `${title}\nLoader ${title}`,
  `![logowanie](assets/instruction.svg)\n${title}`,
  '![diagram](assets/instruction.svg)',
  `![logo](assets/logo.svg)\n${title}\nWybierz Importuj.\nloader`,
  '![logo](logo.svg) Wybierz [Importuj](help/import)',
  `Komunikat „${refusal}” oznacza błąd ekstrakcji. Pobierz treść strony w przeglądarce.`,
  `> ${refusal}\nTo cytat diagnostyczny; rozwiązanie: pobrać surową treść.`,
  `„${refusal}”\nRozwiązanie: pobrać surową treść.`,
  'The page title suggests a discussion.\nOpis diagnostyki: komunikat „No detailed content snippets are provided” wymaga ponownej ekstrakcji.',
  'The page title suggests a discussion.\n```text\nNo detailed content snippets are provided\n```\nW takiej sytuacji otwórz stronę w przeglądarce i pobierz treść wątku.',
  'The page title suggests a discussion with genuine instructions: renew the token.',
  'User query: konfiguracja\nWybierz Importuj, następnie zatwierdź.',
  '#Loader jest nazwą komponentu, nie nagłówkiem strony.',
  'Komunikat „No detailed content snippets are provided” jest błędem ekstrakcji. W takiej sytuacji otwórz stronę w przeglądarce i pobierz treść wątku.',
];

for (const [body, code] of rejected) {
  test(`reject ${JSON.stringify(body)} as ${code}`, () => {
    assert.deepEqual(assessSourceBody(body, title), { ok: false, code }, body);
    assert.throws(() => assertSourceBodyAvailable(body, title), error =>
      error instanceof Error && error.code === code && error.message.includes(code));
  });
}
for (const body of accepted) {
  test(`accept ${JSON.stringify(body)}`, () => {
    assert.deepEqual(assessSourceBody(body, title), { ok: true, code: null }, body);
    assert.equal(assertSourceBodyAvailable(body, title), undefined);
  });
}
// Regex metacharacters in a title must be literal, with cosmetic site suffixes
// compared in both directions. These are source strings, never rewritten.
for (const [body, suppliedTitle, expected] of [
  ['## Import (KSeF) [2026] + .?\nloader', 'Import (KSeF) [2026] + .?', { ok: false, code: 'SOURCE_SHELL_ONLY' }],
  [title, 'Problemy z odbiorem faktur z KSEF', { ok: false, code: 'SOURCE_SHELL_ONLY' }],
  ['Problemy z odbiorem faktur z KSEF - Inna witryna', title, { ok: true, code: null }],
  ['Import (KSeF) [2026] + .? jest instrukcją.', 'Import (KSeF) [2026] + .?', { ok: true, code: null }],
  ['Importuj loader', 'Importuj', { ok: false, code: 'SOURCE_SHELL_ONLY' }],
  ['loader Importuj', 'Importuj', { ok: true, code: null }],
]) {
  test(`compare title ${JSON.stringify(suppliedTitle)} against ${JSON.stringify(body)}`, () => {
    assert.deepEqual(assessSourceBody(body, suppliedTitle), expected, body);
    if (expected.ok) assert.doesNotThrow(() => assertSourceBodyAvailable(body, suppliedTitle));
    else assert.throws(() => assertSourceBodyAvailable(body, suppliedTitle), error => error.code === expected.code);
  });
}
// Put the diagnostic after false closers to prove they cannot end a block.
for (const [name, lines, ok] of [
  ['longer backtick closer', ['```text', 'No detailed content snippets are provided', '````'], true],
  ['tilde fence', ['~~~text', 'No detailed content snippets are provided', '~~~'], true],
  ['longer tilde closer with indentation and whitespace', ['   ~~~~ text', 'No detailed content snippets are provided', '  ~~~~~ \t'], true],
  ['backtick ignores tilde closer', ['```', '~~~~', 'No detailed content snippets are provided', '````'], true],
  ['tilde ignores backtick closer', ['~~~', '````', 'No detailed content snippets are provided', '~~~~'], true],
  ['shorter closer stays inside block', ['````', '```', 'No detailed content snippets are provided', '`````'], true],
  ['mixed-character closer stays inside block', ['~~~', '~~~`', 'No detailed content snippets are provided', '~~~~'], true],
  ['closer info is not closing whitespace', ['```', '```text', 'No detailed content snippets are provided', '````'], true],
  ['shorter closer alone leaves block incomplete', ['````', 'No detailed content snippets are provided', '```'], false],
  ['wrong-type closer alone leaves block incomplete', ['~~~', 'No detailed content snippets are provided', '```'], false],
  ['four-space opener is not a fence', ['    ```', 'No detailed content snippets are provided', '```'], false],
  ['four-space closer does not close', ['```', 'No detailed content snippets are provided', '    ```'], false],
  ['two-character opener is not a fence', ['~~', 'No detailed content snippets are provided', '~~~'], false],
  ['diagnostic outside closed block remains unavailable', ['~~~text', 'quoted example', '~~~~', 'No detailed content snippets are provided'], false],
]) {
  test(`fenced diagnostic: ${name}`, () => {
    const body = ['The page title suggests a discussion.', ...lines, 'Wybierz Importuj.'].join('\n');
    const code = ok ? null : 'SOURCE_CONTENT_UNAVAILABLE';
    assert.deepEqual(assessSourceBody(body, title), { ok, code });
    if (ok) assert.equal(assertSourceBodyAvailable(body, title), undefined);
    else assert.throws(() => assertSourceBodyAvailable(body, title), error => error.code === code);
  });
}
test('default title and missing body use the same contract', () => {
  assert.deepEqual(assessSourceBody(), { ok: false, code: 'EMPTY_SOURCE_BODY' });
  assert.deepEqual(assessSourceBody('Wybierz Importuj.'), { ok: true, code: null });
});
