#!/usr/bin/env node

import http from 'http';
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MCP_FIXTURE = path.join(ROOT, 'scripts/fixtures/external_search_mcp_fixture.mjs');

function runMcpCase(mode) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `external-search-mcp-${mode}-`));
  const counterPath = path.join(os.tmpdir(), `external-search-mcp-${mode}-${process.pid}.count`);
  const script = `
    import fs from 'fs';
    const search = await import('./scripts/lib/external_search.mjs');
    if (process.env.MCP_CASE === 'spawn-error') fs.rmSync(process.env.ROOT, { recursive: true, force: true });
    try {
      const result = await search.searchExternalSources({ query: 'MCP regression test', numResults: 1 });
      process.stdout.write(JSON.stringify({ ok: true, result }));
    } catch (error) {
      process.stdout.write(JSON.stringify({ ok: false, message: error.message }));
    }
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: ROOT,
    env: {
      ...process.env,
      ROOT: root,
      MCP_CASE: mode,
      EXA_PROVIDER: 'mcp',
      EXA_API_KEY: '',
      EXA_MCP_COMMAND: `${process.execPath} ${JSON.stringify(MCP_FIXTURE)} ${mode} ${JSON.stringify(counterPath)}`,
      EXA_MCP_TIMEOUT_MS: '500',
      ERP_KB_TRANSIENT_RETRY_DELAY_MS: '0',
    },
    encoding: 'utf8',
    timeout: 5000,
  });
  const count = fs.existsSync(counterPath) ? Number(fs.readFileSync(counterPath, 'utf8')) : 0;
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(counterPath, { force: true });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  return { output: JSON.parse(result.stdout), count };
}

function sendJson(res, payload, status = 200) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body, 'utf8'),
  });
  res.end(body);
}

let timeoutRequestCount = 0;
let clientErrorRequestCount = 0;

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/search') {
    res.writeHead(404);
    res.end();
    return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (payload.query === 'retry timeout') {
    timeoutRequestCount += 1;
    if (timeoutRequestCount === 1) {
      setTimeout(() => {
        if (!res.destroyed) sendJson(res, { results: [] });
      }, 75);
      return;
    }
  }
  if (payload.query === 'no retry client error') {
    clientErrorRequestCount += 1;
    sendJson(res, { error: 'bad request' }, 400);
    return;
  }
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
process.env.EXA_REQUEST_TIMEOUT_MS = '25';
process.env.ERP_KB_TRANSIENT_RETRY_DELAY_MS = '0';

// Warm Node 18's fetch path so the 25 ms limit measures provider response time.
const warmupResponse = await fetch(process.env.EXA_API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'warmup' }),
});
await warmupResponse.text();
const { searchExternalSources } = await import('./lib/external_search.mjs');
const { answerQuestion } = await import('./erp_knowledge_answer.mjs');

const retriedSearch = await searchExternalSources({ query: 'retry timeout', numResults: 1 });
assert.strictEqual(retriedSearch.ok, true);
assert.strictEqual(timeoutRequestCount, 2);

await assert.rejects(
  () => searchExternalSources({ query: 'no retry client error', numResults: 1 }),
  /HTTP 400/,
);
assert.strictEqual(clientErrorRequestCount, 1);

const malformedMcp = runMcpCase('malformed');
assert.strictEqual(malformedMcp.output.ok, false);
assert.match(malformedMcp.output.message, /malformed.*JSON/i);
assert.doesNotMatch(malformedMcp.output.message, /timed out/i);
assert.strictEqual(malformedMcp.count, 1);

const exitedMcp = runMcpCase('exit');
assert.strictEqual(exitedMcp.output.ok, false);
assert.match(exitedMcp.output.message, /exited.*17/i);
assert.doesNotMatch(exitedMcp.output.message, /timed out/i);
assert.strictEqual(exitedMcp.count, 1);

const spawnErrorMcp = runMcpCase('spawn-error');
assert.strictEqual(spawnErrorMcp.output.ok, false);
assert.match(spawnErrorMcp.output.message, /spawn.*ENOENT/i);
assert.doesNotMatch(spawnErrorMcp.output.message, /timed out/i);
assert.strictEqual(spawnErrorMcp.count, 0);

const retriedMcp = runMcpCase('timeout-then-success');
assert.strictEqual(retriedMcp.output.ok, true);
assert.strictEqual(retriedMcp.output.result.provider, 'mcp');
assert.strictEqual(retriedMcp.count, 2);

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
  mcpTimeoutAttempts: retriedMcp.count,
}, null, 2)}\n`);
