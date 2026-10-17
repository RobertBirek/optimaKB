import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventEmitter } from 'node:events';
import { Worker } from 'node:worker_threads';
import { performance } from 'node:perf_hooks';

const api = await import('./lib/semantic_worker_pool.mjs').catch(e => {
  if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
  return {};
});
const generation = { id: 'test-generation' };
const request = (id = 7, query = 'test') => ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'erp_entity.get', arguments: { query } } });
const context = () => ({ profile: { id: 'erp-semantic-mcp', tools: ['erp_entity.get'] }, allowedNamespaces: new Set(['OWAOntology']), writeAllowed: false, serverInfo: { name: 'fixture', version: '1' }, authorization: 'never-forward-this' });
class FakeWorker extends EventEmitter {
  sent = []; terminated = 0;
  postMessage(message) { this.sent.push(message); }
  terminate() { this.terminated++; return Promise.resolve(0); }
  ready(id = generation.id) { this.emit('message', { type: 'ready', generation: id }); }
  reply(index = 0, response = { id: 7, result: 'ok' }) { this.emit('message', { type: 'result', jobId: this.sent[index].jobId, response }); }
}
function setup(spawn) {
  assert.equal(typeof api.createSemanticWorkerPool, 'function', 'bounded semantic worker pool is implemented');
  const workers = [];
  const pool = api.createSemanticWorkerPool(generation, { spawnWorker: spawn || (() => { const w = new FakeWorker(); workers.push(w); return w; }) });
  return { pool, workers };
}
const settle = promise => promise.then(value => ({ value }), error => ({ error }));

test('non-exposed/profile-denied and empty-scope requests retain direct core errors under saturation', () => {
  setup();
  assert.equal(api.isSemanticWorkerRequest(request(), { ...context(), profile: { id: 'legacy', tools: ['answer_question'] } }), false);
  assert.equal(api.isSemanticWorkerRequest(request(), { ...context(), allowedNamespaces: new Set() }), false);
  assert.equal(api.isSemanticWorkerRequest(request(), { ...context(), allowedNamespaces: null }), true);
});

test('lazy fixed 2 active / 8 queue; overflow explicit and no worker allocated for metadata', async () => {
  const { pool, workers } = setup();
  try {
    assert.equal(workers.length, 0);
    assert.equal(api.isSemanticWorkerRequest({ method: 'tools/list' }), false);
    assert.equal(api.isSemanticWorkerRequest(request()), true);
    assert.equal(api.isSemanticWorkerRequest({ ...request(), method: 'wrong' }), false);
    const jobs = Array.from({ length: 10 }, () => settle(pool.run(request(), context())));
    assert.equal(workers.length, 2); assert.equal(pool.stats().active, 2); assert.equal(pool.stats().queued, 8);
    await assert.rejects(pool.run(request(), context()), e => e.code === 'SEMANTIC_BUSY' && !e.message.includes('/'));
    workers.forEach(w => w.ready());
    for (let i = 0; i < 5; i++) workers.forEach(w => w.reply(i));
    assert((await Promise.all(jobs)).every(j => j.value));
    assert.equal(pool.stats().queued, 0); assert.equal(pool.stats().active, 0);
  } finally { await pool.close(); }
  assert(workers.every(w => w.terminated === 1));
});

test('equal caller IDs use unique internal IDs; queued input/context snapshots exclude credentials', async () => {
  const { pool, workers } = setup();
  try {
    const jobs = [pool.run(request(), context()), pool.run(request(), context())];
    const req = request(7, 'original'), ctx = context();
    const queued = pool.run(req, ctx);
    req.params.arguments.query = 'mutated'; ctx.allowedNamespaces.clear(); ctx.profile.id = 'knowledge-editorial-mcp'; ctx.serverInfo.name = 'changed'; ctx.writeAllowed = true;
    workers.forEach(w => w.ready());
    const [a, b] = workers.map(w => w.sent[0]);
    assert.notEqual(a.jobId, b.jobId);
    workers[1].reply(0, { id: 7, result: 'second' }); workers[0].reply(0, { id: 7, result: 'first' });
    assert.deepEqual((await Promise.all(jobs)).map(j => j.response.result), ['first', 'second']);
    const snapshot = workers[1].sent[1];
    assert.equal(snapshot.request.params.arguments.query, 'original');
    assert.equal(snapshot.context.profileId, 'erp-semantic-mcp'); assert.equal(snapshot.context.writeAllowed, false);
    assert.deepEqual(snapshot.context.allowedNamespaces, new Set(['OWAOntology']));
    assert.equal(snapshot.context.serverInfo.name, 'fixture'); assert(!JSON.stringify(snapshot).includes('never-forward'));
    workers[1].reply(1); await queued;
    for (const ns of [null, new Set()]) {
      const job = pool.run(request(), { ...context(), allowedNamespaces: ns });
      const w = workers.find(w => w.sent.at(-1)?.context.allowedNamespaces === null || w.sent.at(-1)?.context.allowedNamespaces?.size === 0);
      assert.deepEqual(w.sent.at(-1).context.allowedNamespaces, ns); w.reply(w.sent.length - 1); await job;
    }
  } finally { await pool.close(); }
});

test('queued cancellation removes job; active cancellation retains busy slot until matching late reply', async () => {
  const { pool, workers } = setup();
  try {
    const active = new AbortController(), queued = new AbortController();
    const a = settle(pool.run(request(), context(), { signal: active.signal }));
    const b = settle(pool.run(request(), context()));
    const c = settle(pool.run(request(), context(), { signal: queued.signal }));
    workers.forEach(w => w.ready()); queued.abort(); active.abort();
    assert.equal((await a).error.code, 'SEMANTIC_CANCELLED'); assert.equal((await c).error.code, 'SEMANTIC_CANCELLED');
    assert.equal(pool.stats().active, 2); assert.equal(pool.stats().queued, 0);
    const d = pool.run(request(), context());
    assert.equal(pool.stats().queued, 1); assert.equal(workers[0].sent.length, 1);
    workers[0].reply(); assert.equal(workers[0].sent.length, 2);
    workers[0].reply(); // stale response must not resolve d or release its slot
    assert.equal(pool.stats().active, 2);
    workers[0].reply(1, { id: 7, result: 'new' }); workers[1].reply();
    assert.equal((await d).response.result, 'new'); await b;
  } finally { await pool.close(); }
});

test('request-error settles one queued-owner promise and preserves unrelated/late-response routing', async () => {
  const { pool, workers } = setup();
  try {
    const jobs = Array.from({ length: 10 }, () => settle(pool.run(request(), context())));
    workers.forEach(w => w.ready());
    const errorFrame = { type: 'request-error', jobId: workers[0].sent[0].jobId, handlerWallMs: 1 };
    workers[0].emit('message', errorFrame);
    assert.equal(pool.stats().available, true, 'request-error is not fatal');
    assert.equal(workers[0].sent.length, 2, 'next queued job owns the released slot');
    workers[1].reply(0);
    workers[0].emit('message', errorFrame); // late error cannot own the newly assigned job
    for (let i = 1; i < 5; i++) workers.forEach(w => w.reply(i));
    const outcomes = await Promise.all(jobs);
    assert.equal(outcomes[0].error?.code, 'SEMANTIC_REQUEST_FAILED');
    assert.equal(outcomes[0].error?.message, 'Semantic request failed.');
    assert(outcomes.slice(1).every(o => o.value));
    assert.equal(pool.stats().available, true); assert.equal(pool.stats().unavailableReason, null);
    assert.equal(pool.stats().active, 0); assert.equal(pool.stats().queued, 0);
  } finally { await pool.close(); }
});

test('cancelled active owner may finish with request-error without affecting its replacement', async () => {
  const { pool, workers } = setup();
  try {
    const controller = new AbortController();
    const a = settle(pool.run(request(), context(), { signal: controller.signal }));
    const b = settle(pool.run(request(), context()));
    const c = settle(pool.run(request(), context()));
    workers.forEach(w => w.ready()); controller.abort();
    assert.equal((await a).error.code, 'SEMANTIC_CANCELLED');
    workers[0].emit('message', { type: 'request-error', jobId: workers[0].sent[0].jobId });
    assert.equal(pool.stats().available, true, 'cancelled request error leaves replacement available');
    workers[0].reply(1); workers[1].reply(0);
    assert((await b).value); assert((await c).value); assert.equal(pool.stats().available, true);
  } finally { await pool.close(); }
});

for (const failure of ['error', 'exit', 'generation', 'job-error', 'constructor', 'message-error', 'dispatch', 'duplicate-ready']) test('fail closed without replay/respawn: ' + failure, async () => {
  const { pool, workers } = setup(failure === 'constructor' ? () => { throw Error('/secret/path bearer secret'); } : undefined);
  const jobs = [settle(pool.run(request(), context())), settle(pool.run(request(), context())), settle(pool.run(request(), context()))];
  if (failure === 'generation') workers[0].ready('wrong-generation');
  else if (failure === 'job-error') { workers[0].ready(); workers[0].emit('message', { type: 'failed', jobId: workers[0].sent[0].jobId }); }
  else if (failure === 'message-error') workers[0].emit('messageerror', Error('/secret/path bearer secret'));
  else if (failure === 'dispatch') { workers[0].postMessage = () => { throw Error('/secret/path bearer secret'); }; workers[0].ready(); }
  else if (failure === 'duplicate-ready') { workers[0].ready(); workers[0].ready(); }
  else if (failure !== 'constructor') workers[0].emit(failure, failure === 'error' ? Error('/secret/path bearer secret') : 1);
  const outcomes = await Promise.all(jobs);
  assert(outcomes.every(j => j.error.code === 'SEMANTIC_UNAVAILABLE' && !/secret|path|bearer/.test(j.error.message)));
  assert.equal(pool.stats().available, false); assert(workers.length <= 2);
  const reason = { error: 'WORKER_ERROR', exit: 'WORKER_EXIT', generation: 'GENERATION_MISMATCH', 'job-error': 'PROTOCOL_ERROR',
    constructor: 'WORKER_CONSTRUCTION_FAILED', 'message-error': 'MESSAGE_ERROR', dispatch: 'DISPATCH_FAILED', 'duplicate-ready': 'PROTOCOL_ERROR' }[failure];
  assert.equal(pool.stats().unavailableReason, reason);
  await assert.rejects(pool.run(request(), context()), e => e.code === 'SEMANTIC_UNAVAILABLE');
  await pool.close(); await pool.close(); assert(workers.every(w => w.terminated === 1));
  assert.equal(pool.stats().unavailableReason, reason, 'first bounded failure cause survives close/exit races');
});

test('close settles starting/queued jobs; already aborted request allocates no thread', async () => {
  const { pool, workers } = setup();
  const aborted = new AbortController(); aborted.abort();
  await assert.rejects(pool.run(request(), context(), { signal: aborted.signal }), e => e.code === 'SEMANTIC_CANCELLED');
  assert.equal(workers.length, 0);
  const jobs = Array.from({ length: 4 }, () => settle(pool.run(request(), context())));
  await pool.close('/private/path Bearer secret'); assert((await Promise.all(jobs)).every(j => j.error.code === 'SEMANTIC_UNAVAILABLE'));
  assert.equal(pool.stats().unavailableReason, 'CLOSED', 'public/internal callers cannot inject diagnostic strings');
});

test('real worker CPU burst leaves parent timers responsive and bounded', async () => {
  const { pool } = setup(() => new Worker(`const { parentPort } = require('node:worker_threads');
    parentPort.postMessage({type:'ready',generation:'test-generation'});
    parentPort.on('message', m => { const start=Date.now(); while(Date.now()-start<150) Math.sqrt(Math.random());
      parentPort.postMessage({type:'result',jobId:m.jobId,response:{id:m.request.id,result:m.request.params.arguments.query}}); });`, { eval: true }));
  let maximum = 0, last = performance.now();
  const timer = setInterval(() => { const now = performance.now(); maximum = Math.max(maximum, now - last); last = now; }, 10);
  try {
    const results = await Promise.all(Array.from({ length: 4 }, (_, i) => pool.run(request(7, String(i)), context())));
    assert.deepEqual(results.map(r => r.response.result), ['0', '1', '2', '3']); assert(maximum < 250, String(maximum));
    assert.equal(pool.stats().workers, 2);
  } finally { clearInterval(timer); await pool.close(); }
});
