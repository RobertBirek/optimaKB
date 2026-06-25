#!/usr/bin/env node

import http from 'http';

function sendJson(res, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body, 'utf8'),
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/search') {
    res.writeHead(404);
    res.end();
    return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  sendJson(res, {
    requestId: 'mock-req-1',
    resolvedSearchType: payload.type || 'auto',
    results: [
      {
        title: 'Comarch Betterfly - Public release note',
        url: 'https://www.comarchbetterfly.pl/aktualnosci/public-release-note',
        publishedDate: '2026-06-03T08:00:00.000Z',
        summary: 'Public release note for Betterfly.',
        text: 'Public release note for Betterfly with recent product update context.',
      },
      {
        title: 'Comarch Społeczność - Betterfly i KSeF',
        url: 'https://spolecznosc.comarch.pl/news/twoje-centrum-wiedzy-o-ksef-w-comarch-betterfly',
        publishedDate: '2026-06-02T08:00:00.000Z',
        summary: 'Community article about Betterfly and KSeF.',
        text: 'Community article about Betterfly and KSeF.',
      },
      {
        title: 'Third-party blog about Betterfly',
        url: 'https://example.org/betterfly-blog',
        publishedDate: '2026-06-01T08:00:00.000Z',
        summary: 'Third-party commentary.',
        text: 'Third-party commentary.',
      },
    ],
  });
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

process.env.EXA_PROVIDER = 'api';
process.env.EXA_API_KEY = 'test-key';
process.env.EXA_API_URL = `http://127.0.0.1:${port}/search`;
process.env.EXA_DEFAULT_NUM_RESULTS = '5';

const { searchExternalSources } = await import('./lib/external_search.mjs');
const { answerQuestion } = await import('./erp_knowledge_answer.mjs');

const searchResult = await searchExternalSources({
  query: 'Czy były ostatnio newsy o Comarch Betterfly?',
  kbName: 'ComarchCommunityNews',
  numResults: 3,
  text: true,
  logContext: 'test',
});

if (!searchResult.ok || searchResult.results.length !== 3) {
  throw new Error('Mock external search did not return expected results.');
}
if (searchResult.results[0].sourceType !== 'official') {
  throw new Error('Expected official result to rank first.');
}

const answerResult = await answerQuestion('Czy były ostatnio newsy o Comarch Betterfly?');
if (answerResult.answer.primaryKb !== 'ComarchCommunityNews') {
  throw new Error(`Unexpected primary KB: ${answerResult.answer.primaryKb}`);
}
if (!['blended', 'external'].includes(answerResult.answer.evidenceSource)) {
  throw new Error(`Unexpected evidenceSource: ${answerResult.answer.evidenceSource}`);
}
if (answerResult.answer.externalEvidence.length !== 2) {
  throw new Error(`Expected 2 external evidence items after runtime tier filtering, got ${answerResult.answer.externalEvidence.length}.`);
}
if (answerResult.answer.externalEvidence.some((item) => item.sourceType === 'third_party')) {
  throw new Error('Runtime answer should not include third-party sources.');
}

await new Promise((resolve) => server.close(resolve));

process.stdout.write(`${JSON.stringify({
  ok: true,
  searchResultCount: searchResult.results.length,
  topSourceType: searchResult.results[0].sourceType,
  answerEvidenceSource: answerResult.answer.evidenceSource,
  externalEvidenceCount: answerResult.answer.externalEvidence.length,
}, null, 2)}\n`);
