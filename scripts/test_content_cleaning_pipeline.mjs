#!/usr/bin/env node

import assert from 'assert';
import http from 'http';
import dns from 'dns/promises';
import fs from 'fs';
import { execFileSync } from 'child_process';

// Fresh module evaluation with legacy AI configuration and dummy auth only.
// Intercept fetch entirely: even a regression cannot reach a real endpoint.
const noHttpResult = execFileSync(process.execPath, ['--input-type=module', '-e', `
  import assert from 'node:assert/strict';
  let httpCalls = 0;
  globalThis.fetch = async () => {
    httpCalls += 1;
    return new Response(JSON.stringify({
      choices: [{ message: { content: 'Nieźródłowa odpowiedź modelu.' } }],
    }), { status: 200 });
  };
  const { cleanContent } = await import(${JSON.stringify(new URL('./lib/content_cleaner.mjs', import.meta.url).href)});
  const result = cleanContent('REKLAMA\\nTreść źródłowa.');
  assert.ok(result instanceof Promise);
  assert.strictEqual(await result, 'Treść źródłowa.');
  assert.strictEqual(httpCalls, 0);
  process.stdout.write('PASS: legacy AI configuration performs zero HTTP requests\\n');
`], {
  encoding: 'utf8',
  timeout: 10000,
  env: {
    CONTENT_AI_CLEAN: '1',
    CONTENT_AI_CLEAN_MAX_CHARS: '12000',
    OPENSPG_API_BASE: 'http://127.0.0.1:1',
    OPENSPG_LLM_ENDPOINT: '/v1/chat/completions',
    OPENSPG_LLM_APP_ID: '123',
    OPENSPG_LLM_SESSION_ID: '456',
    OPENSPG_LLM_MODEL: 'dummy-model',
    OPENSPG_COOKIE: 'test-cookie=dummy',
    OPENSPG_COOKIE_FILE: '',
  },
});
process.stdout.write(noHttpResult);

const temporaryRoot = fs.mkdtempSync('/tmp/opencode/content-cleaning-test-');
process.env.ROOT = temporaryRoot;
process.env.OPENSPG_COOKIE = 'test-cookie=dummy';
process.env.OPENSPG_COOKIE_FILE = '';
process.env.OPENSPG_LLM_APP_ID = '';
process.env.OPENSPG_LLM_SESSION_ID = '';
process.env.ERP_KB_ALLOW_PRIVATE_SOURCE_URLS = '0';

process.env.CONTENT_PROVIDER = 'auto';
process.env.TAVILY_API_KEY = 'tavily-test';
process.env.FIRECRAWL_API_KEY = 'firecrawl-test';
process.env.EXA_API_KEY = 'exa-test';
process.env.CONTENT_AI_CLEAN = '1';

let requestLog = [];

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/tavily/extract') {
    requestLog.push('tavily');
    const body = await readJson(req);
    assert.deepStrictEqual(body.urls, ['https://example.com/article']);
    const payload = {
      results: [{
        url: body.urls[0],
        title: 'Tavily title',
        raw_content: 'REKLAMA\nZapisz się na newsletter\nGłówna treść artykułu o KSeF i Optima.',
      }],
    };
    const text = JSON.stringify(payload);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(text) });
    res.end(text);
    return;
  }
  if (req.method === 'POST' && req.url === '/firecrawl/v1/scrape') {
    requestLog.push('firecrawl');
    const payload = {
      success: true,
      data: {
        markdown: 'REKLAMA\nTreść z Firecrawl.',
        metadata: { title: 'Firecrawl title', sourceURL: 'https://example.com/article' },
      },
    };
    const text = JSON.stringify(payload);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(text) });
    res.end(text);
    return;
  }
  if (req.method === 'POST' && req.url === '/exa/contents') {
    requestLog.push('exa');
    const payload = {
      requestId: 'exa-1',
      results: [{
        url: 'https://example.com/article',
        title: 'Exa title',
        summary: 'REKLAMA\nTreść z Exa.',
        text: 'REKLAMA\nTreść z Exa.',
      }],
    };
    const text = JSON.stringify(payload);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(text) });
    res.end(text);
    return;
  }
  res.writeHead(404);
  res.end();
});

const originalLookup = dns.lookup;
const originalFetch = globalThis.fetch;
try {
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
dns.lookup = async (hostname) => {
  assert.strictEqual(hostname, 'example.com');
  return [{ address: '93.184.216.34', family: 4 }];
};
globalThis.fetch = (url, options) => {
  assert.strictEqual(new URL(url).origin, `http://127.0.0.1:${port}`);
  return originalFetch(url, options);
};
process.env.TAVILY_EXTRACT_API_URL = `http://127.0.0.1:${port}/tavily/extract`;
process.env.FIRECRAWL_API_URL = `http://127.0.0.1:${port}/firecrawl/v1`;
process.env.EXA_CONTENTS_API_URL = `http://127.0.0.1:${port}/exa/contents`;

const {
  cleanBoilerplate,
  cleanContent,
  cleanContentWithProfile,
} = await import('./lib/content_cleaner.mjs');

const { fetchContent, detectCleanerProfile } = await import('./lib/content_provider.mjs');
assert.strictEqual(
  cleanBoilerplate('REKLAMA\nZapisz się na newsletter\nSubskrybuj nas na Youtube\nDołącz do ekspertów\nShutterstock\nrozwiń >\nWłaściwa treść.'),
  'Właściwa treść.',
);

assert.strictEqual(
  cleanBoilerplate('VAT 2026 / VAT 2026: 30 ważnych zmian / Shutterstock\nTreść główna VAT.'),
  'Treść główna VAT.',
);

assert.strictEqual(
  cleanBoilerplate('Adres redakcji: 01-066 Warszawa, ul. Burakowska 14\nwww.dziennik.pl, www.gazetaprawna.pl\nAutorzy: Praca zbiorowa – eksperci z MDDP\n© Copyright by INFOR PL SA\nISBN: 978-83-8268-877-1\nTreść rozdziału podatkowego.'),
  'Treść rozdziału podatkowego.',
);

assert.strictEqual(
  cleanBoilerplate('01-066 Warszawa, ul. Burakowska 14\n3\nSpis treści\nWstęp\nTreść rozdziału podatkowego.'),
  'Treść rozdziału podatkowego.',
);

let aiCalls = 0;
const contaminatedAnswer = 'Relacje między tabelami: DokumentyKSeF → DokAtrybuty\n<reference id="chunk:0_0"></reference>';
const cleaned = await cleanContent('REKLAMA\nTreść bazowa.', {
  aiCleaner: async () => {
    aiCalls += 1;
    return contaminatedAnswer;
  },
});
assert.strictEqual(cleaned, 'Treść bazowa.');
assert.strictEqual(aiCalls, 0);
const refusal = 'W dostarczonych materiałach nie ma surowej treści strony WWW ani artykułu do oczyszczenia.';
assert.strictEqual(await cleanContent('Treść źródłowa.', {
  aiCleaner: async () => { aiCalls += 1; return refusal; },
}), 'Treść źródłowa.');
assert.strictEqual(aiCalls, 0);
assert.strictEqual(cleanContentWithProfile('REKLAMA\nTreść źródłowa.', 'news', {
  aiCleaner: () => { aiCalls += 1; return contaminatedAnswer; },
}), 'Treść źródłowa.');
assert.strictEqual(aiCalls, 0);

const fetched = await fetchContent('https://example.com/article', {
  aiCleaner: async (text) => text,
});
assert.strictEqual(fetched.provider, 'tavily');
assert(!fetched.content.includes('REKLAMA'));
assert(!fetched.content.includes('newsletter'));
assert(fetched.content.includes('Główna treść artykułu'));
assert.deepStrictEqual(requestLog, ['tavily']);

assert.equal(detectCleanerProfile('https://example.com/news/aktualnosci'), 'news', 'news profile from /news/');
assert.equal(detectCleanerProfile('https://example.com/blog/post'), 'blog', 'blog profile from /blog/');
assert.equal(detectCleanerProfile('https://docs.example.com/manual/guide'), 'documentation', 'doc profile from /manual/');
assert.equal(detectCleanerProfile('https://example.com/file.pdf'), 'pdf', 'pdf profile from .pdf');
assert.equal(detectCleanerProfile('https://infor.pl/artykul'), 'news', 'news from infor.pl domain');
assert.equal(detectCleanerProfile('https://example.com/xyz'), 'blog', 'default blog profile');
process.stdout.write('PASS: profile detection\n');

const rawHtml = '<p>REKLAMA</p><p>Zapisz się na newsletter</p><p>Treść główna</p><p>Czytaj także: inne</p><p>Facebook</p><p>LinkedIn</p><p>Polityka prywatności</p><p>5</p>';
const newsResult = cleanContentWithProfile(rawHtml, 'news', { skipHtmlStrip: true });
assert.ok(newsResult.includes('Treść główna'), 'news should keep main content');
assert.ok(!newsResult.includes('REKLAMA'), 'news should remove REKLAMA');
const pdfResult = cleanContentWithProfile(rawHtml, 'pdf', { skipHtmlStrip: true });
assert.ok(pdfResult.includes('REKLAMA'), 'pdf should keep REKLAMA');
assert.ok(pdfResult.includes('Treść główna'), 'pdf should keep main content');
process.stdout.write('PASS: profile cleaning behavior\n');

process.stdout.write(`${JSON.stringify({ ok: true, provider: fetched.provider }, null, 2)}\n`);
} finally {
  dns.lookup = originalLookup;
  globalThis.fetch = originalFetch;
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
