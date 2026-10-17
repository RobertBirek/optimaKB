// Actual pool/bootstrap/entry/core, inert answer-side dependencies only. No corpus
// or provider calls. The HTTP counterpart separately uses the frozen real corpus.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { captureSemanticGeneration, SEMANTIC_WORKER_BOOTSTRAP } from './lib/semantic_worker_generation.mjs';
import { createSemanticWorkerPool } from './lib/semantic_worker_pool.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const root = '/tmp/opencode/semantic-request-errors-virtual';
const original = captureSemanticGeneration();
const sources = { ...original.sources };
const url = name => new URL(name, new URL('../', import.meta.url)).href;
sources[url('scripts/erp_knowledge_answer.mjs')] = `
  export async function answerQuestion(query, scope, options) {
    if (options.allowAutoDraft !== false) throw Error('Auto-draft gate violated');
    if (query === 'domain-throw') throw Error('/private/source/path Bearer secret credential');
    return {answer:{query,evidence:query === 'serialize-fail' ? [() => {}] : []}};
  }
  export function renderAnswerMarkdown(answer) { return 'fixture: ' + answer.query; }
`;
sources[url('scripts/erp_knowledge_assistant.mjs')] = `
  export function loadRouting() { return {}; }
  export function listKnowledgeBases() { return {}; }
  export function buildResponse() { throw Error('Unexpected route'); }
  export function classifyQuestion() { throw Error('Unexpected classification'); }
  export function renderMarkdown() { throw Error('Unexpected renderer'); }
`;
sources[url('scripts/lib/knowledge_inbox.mjs')] = 'export function submitKnowledgeDraft() { throw Error("Unexpected write"); }';
sources[url('scripts/lib/external_search.mjs')] = `
  export function createExternalKnowledgeDraft() { throw Error('Unexpected external draft'); }
  export function getExternalSearchStatus() { return {enabled:false}; }
  export function searchExternalSources() { throw Error('Unexpected provider'); }
`;
const generation = { ...original, sources, id: hash(JSON.stringify(sources)) };
const codeRoot = fileURLToPath(new URL('../', import.meta.url));
const fixture = { root, modules: Object.fromEntries(Object.entries(sources).map(([u, s]) => [path.relative(codeRoot, fileURLToPath(u)), s])),
  files: [[root + '/docs/reference/ERP_KB_Dashboard_KB_Registry.json', Buffer.from('{"entries":[]}')]],
  directories: [root, root + '/docs', root + '/docs/reference'], environment: { ROOT: root, EXA_PROVIDER: 'disabled', EXA_AUTO_DRAFT: '0', ENABLE_LIVE_LEARNING: '0', LEARNING_ENABLED: '0' } };
// Authorize precisely the production loader's data URL in the outer test loader.
fixture.modules['scripts/lib/semantic_worker_generation.mjs'] = fs.readFileSync(new URL('./lib/semantic_worker_generation.mjs', import.meta.url), 'utf8');
const profile = { id: 'erp-semantic-mcp' };
const context = () => ({ profile, allowedNamespaces: new Set(['OWAOntology', 'ComarchOptimaBusinessSemantics']), writeAllowed: true });
const request = (id, query) => ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'erp_entity.get', arguments: { query, allowAutoDraft: true } } });
const settle = p => p.then(value => ({ value }), error => ({ error }));
function setup() {
  const events = [], workers = [];
  const pool = createSemanticWorkerPool(generation, { spawnWorker: () => {
    const prelude = `const {workerData,parentPort} = require('node:worker_threads');
      import(${JSON.stringify(new URL('./lib/semantic_isolation_fixture_host.mjs', import.meta.url).href)}).then(m => {
        const guard = m.guardFixture(workerData.fixture);
        const post = parentPort.postMessage.bind(parentPort);
        parentPort.postMessage = message => post({...message,fixtureAudit:{violations:guard.violations,reads:guard.reads}});
        return (async () => { ${SEMANTIC_WORKER_BOOTSTRAP}\n })();
      }).catch(error => { console.error(error); process.exit(1); });`;
    const worker = new Worker(prelude, { eval: true, workerData: { generation, fixture }, env: {} });
    worker.on('message', m => events.push(m)); workers.push(worker); return worker;
  } });
  return { pool, events, workers };
}
function boundedRequestFailure(outcome) {
  assert.equal(outcome.error?.code, 'SEMANTIC_REQUEST_FAILED', 'core throw must settle only this request');
  assert.equal(outcome.error.message, 'Semantic request failed.');
}
function successful(outcome, id, query) {
  assert(outcome.value, outcome.error?.code); assert.equal(outcome.value.response.id, id);
  assert.equal(outcome.value.response.result.structuredContent.answer, 'fixture: ' + query);
}
function audit({ pool, events, workers }) {
  assert.equal(pool.stats().available, true); assert.equal(pool.stats().unavailableReason, null);
  assert.equal(pool.stats().active, 0); assert.equal(pool.stats().queued, 0); assert(workers.length <= 2);
  for (const e of events) if (e.fixtureAudit) assert.deepEqual(e.fixtureAudit.violations, []);
  for (const e of events.filter(e => e.type === 'request-error')) {
    assert.deepEqual(Object.keys(e).sort(), ['fixtureAudit', 'handlerWallMs', 'jobId', 'type']);
    assert(!JSON.stringify(e).includes('credential'));
  }
}

test('actual core malformed query followed by valid same/different caller IDs retains available pool', async () => {
  const state = setup(), { pool } = state;
  try {
    assert.equal((await pool.run({ method: 'tools/list', id: 'startup' }, context())).response.result.tools.length, 5);
    const malformed = await settle(pool.run(request(7, { toString: null }), context()));
    const same = await settle(pool.run(request(7, 'same-id-valid'), context()));
    const different = await settle(pool.run(request('different-id', 'different-id-valid'), context()));
    console.log(JSON.stringify({ probe: 'actual-core-request-containment', malformed: malformed.error?.code, same: same.error?.code || 'success', different: different.error?.code || 'success', stats: pool.stats() }));
    boundedRequestFailure(malformed); successful(same, 7, 'same-id-valid'); successful(different, 'different-id', 'different-id-valid'); audit(state);
  } finally { await pool.close(); }
});

for (const badFirst of [true, false]) for (const equalIds of [true, false]) test(`actual concurrent core pair badFirst=${badFirst} equalIds=${equalIds}`, async () => {
  const state = setup(), { pool } = state;
  try {
    const bad = request('pair', { toString: null }), good = request(equalIds ? 'pair' : 'other', 'concurrent-valid');
    const pair = badFirst ? [bad, good] : [good, bad];
    const outcomes = await Promise.all(pair.map(r => settle(pool.run(r, context()))));
    boundedRequestFailure(outcomes[badFirst ? 0 : 1]); successful(outcomes[badFirst ? 1 : 0], good.id, 'concurrent-valid');
    successful(await settle(pool.run(request(bad.id, 'followup-valid'), context())), bad.id, 'followup-valid'); audit(state);
  } finally { await pool.close(); }
});

test('domain exception is sanitized and request-local; scope/profile denials retain precedence', async () => {
  const state = setup(), { pool } = state;
  try {
    boundedRequestFailure(await settle(pool.run(request('domain', 'domain-throw'), context())));
    for (const [ctx, code] of [[{ ...context(), allowedNamespaces: new Set() }, -32001],
      [{ ...context(), profile: { id: 'optima-technical-mcp' } }, -32601]]) {
      const r = await pool.run(request('denied', { toString: null }), ctx);
      assert.equal(r.response.id, 'denied'); assert.equal(r.response.error.code, code);
    }
    successful(await settle(pool.run(request('after-domain', 'still-valid'), context())), 'after-domain', 'still-valid'); audit(state);
  } finally { await pool.close(); }
});

for (const fault of ['context', 'serialization']) test(`genuine ${fault} failure remains fatal outside request-error catch`, async () => {
  const { pool } = setup();
  try {
    const ctx = fault === 'context' ? { ...context(), profile: { id: 'not-a-canonical-profile' } } : context();
    const r = await settle(pool.run(request('fatal', fault === 'serialization' ? 'serialize-fail' : 'valid'), ctx));
    assert.equal(r.error?.code, 'SEMANTIC_UNAVAILABLE'); assert.equal(pool.stats().available, false);
    assert.equal(pool.stats().unavailableReason, 'WORKER_ERROR');
    await assert.rejects(pool.run(request('after-fatal', 'valid'), context()), e => e.code === 'SEMANTIC_UNAVAILABLE');
  } finally { await pool.close(); }
});
