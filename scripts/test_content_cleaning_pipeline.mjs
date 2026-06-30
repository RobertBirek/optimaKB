#!/usr/bin/env node

import assert from 'assert';
import http from 'http';

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

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
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

const aiCleaned = await cleanContent('REKLAMA\nTreść bazowa.', {
  aiCleaner: async (text) => `${text}\nSekcja merytoryczna.`,
});
assert(!aiCleaned.includes('REKLAMA'));
assert(aiCleaned.includes('Treść bazowa.'));
assert(aiCleaned.includes('Sekcja merytoryczna.'));

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

await new Promise((resolve) => server.close(resolve));

process.stdout.write(`${JSON.stringify({ ok: true, provider: fetched.provider }, null, 2)}\n`);
