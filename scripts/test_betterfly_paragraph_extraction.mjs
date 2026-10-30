import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const exporter = fileURLToPath(new URL('./export_betterfly_reference.mjs', import.meta.url));
const sourceUrl = 'https://pomoc.comarchbetterfly.pl/dokumentacja/api-fixture/';

function readRows(file) {
  const records = [];
  let row = [], cell = '', quoted = false;
  const text = fs.readFileSync(file, 'utf8');
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (!quoted && (char === ',' || char === '\n')) {
      row.push(cell); cell = '';
      if (char === '\n') { records.push(row); row = []; }
    } else cell += char;
  }
  assert.equal(quoted, false);
  const columns = records.shift();
  return records.map((values) => {
    assert.equal(values.length, columns.length);
    return Object.fromEntries(columns.map((key, index) => [key, values[index]]));
  });
}

function runFixture(body) {
  const root = fs.mkdtempSync('/tmp/opencode/betterfly-paragraph-');
  const pages = path.join(root, 'downloads/official/betterfly_reference/pages');
  fs.mkdirSync(pages, { recursive: true });
  fs.writeFileSync(path.join(pages, 'api-fixture.html'),
    `<html><head><link rel="canonical" href="${sourceUrl}"></head><body><h1>Fixture API</h1>${body}</body></html>`);
  const guard = path.join(root, 'guard.mjs');
  // Guard before loading the real CLI: a regression in ROOT cannot touch live files.
  fs.writeFileSync(guard, `
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncBuiltinESMExports } from 'node:module';
import http from 'node:http';
import https from 'node:https';
const root = ${JSON.stringify(root)};
for (const method of ['mkdirSync', 'writeFileSync', 'openSync', 'readFileSync', 'readdirSync', 'existsSync', 'statSync']) {
  const original = fs[method];
  fs[method] = function(file, ...args) {
    const name = typeof file === 'number' ? '' : path.resolve(file instanceof URL ? fileURLToPath(file) : String(file));
    if (name === '/docker/openspg' || name.startsWith('/docker/openspg/')) throw new Error('Forbidden live path: ' + name);
    if (['mkdirSync', 'writeFileSync', 'openSync'].includes(method) && name && name !== root && !name.startsWith(root + '/')) {
      throw new Error('Forbidden fixture write/open: ' + name);
    }
    return original.call(this, file, ...args);
  };
}
globalThis.fetch = () => { throw new Error('Forbidden network call'); };
for (const module of [http, https]) for (const method of ['get', 'request']) module[method] = () => { throw new Error('Forbidden network call'); };
syncBuiltinESMExports();
`);
  const result = spawnSync(process.execPath, ['--import', guard, exporter], {
    cwd: root, encoding: 'utf8', timeout: 15000,
    env: { ROOT: root, LANG: 'C.UTF-8', PATH: process.env.PATH },
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return { root, chunks: readRows(path.join(root, 'exports/betterfly_reference/v1/chunk.csv')) };
}

test('real exporter honors ROOT and retains clean paragraph grouping and provenance', () => {
  const paragraphs = [
    'First approved paragraph with enough text.',
    'Second approved paragraph with enough text.',
    'Third approved paragraph with enough text.',
    'Fourth approved paragraph with enough text.',
  ];
  const { chunks } = runFixture(paragraphs.map((text) => `<p>${text}</p>`).join(''));
  assert.deepEqual(chunks.map((row) => row.content), [paragraphs.slice(0, 3).join('\n\n'), paragraphs[3]]);
  assert.deepEqual(chunks.map((row) => row.sectionOrder), ['1', '2']);
  assert.equal(chunks[0].id, 'BFCHUNK_BFRD_HTTPS_POMOC_COMARCHBETTERFLY_PL_DOKUMENTACJA_API_FIXTURE_1');
  assert.equal(chunks[0].sourceUrl, sourceUrl);
  assert.equal(chunks[0].sourcePath, 'downloads/official/betterfly_reference/pages/api-fixture.html');
});

for (const tag of ['path', 'pre', 'picture', 'param', 'progress', 'p-custom']) {
  test(`a ${tag} tag cannot swallow navigation into the next real paragraph`, () => {
    const article = 'Only this approved article paragraph belongs in retrieval.';
    const poison = 'NAVIGATION_SENTINEL '.repeat(3500);
    const { chunks } = runFixture(`<${tag} data-fixture="true">${poison}</${tag}><p>${article}</p>`);
    assert.deepEqual(chunks.map((row) => row.content), [article]);
    assert.ok(chunks.every((row) => !row.content.includes('NAVIGATION_SENTINEL')));
  });
}

test('uppercase, attributed and multiline paragraph tags preserve full content', () => {
  const { chunks } = runFixture('<P class="article">First line, with "quotes".\nSecond line &amp; details.</P \n>'
    + '<p\nclass="next">Another approved paragraph with enough text.</p>');
  assert.deepEqual(chunks.map((row) => row.content), [
    'First line, with "quotes".\nSecond line & details.\n\nAnother approved paragraph with enough text.',
  ]);
});

test('a long real paragraph is preserved instead of being silently truncated', () => {
  const article = 'Approved article sentence. '.repeat(250);
  const { chunks } = runFixture(`<p>${article}</p>`);
  assert.deepEqual(chunks.map((row) => row.content), [article.trim()]);
});
