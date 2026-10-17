// Explicit frozen original32 only. No live endpoint/corpus discovery.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { Worker } from 'node:worker_threads';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { MODULE_FILES, sha256 } from './lib/owa_offline_harness.mjs';
import { validateSemanticBundle, inspectSemanticResponse, parseArguments, privateParent } from './lib/semantic_regression_harness.mjs';

const args = parseArguments(process.argv.slice(2), ['--bundle', '--accepted', '--output-parent', '--mode'], ['--baseline-bridge']);
assert(['red', 'single', 'burst', 'parity', 'mechanism', 'context', 'request-errors'].includes(args['--mode']));
process.umask(0o077);
const repo = fileURLToPath(new URL('../', import.meta.url));
const begin = performance.now(), setupCpu = process.cpuUsage();
const bundle = validateSemanticBundle(args['--bundle']);
const output = fs.mkdtempSync(path.join(privateParent(args['--output-parent']), 'cpu-isolation-' + args['--mode'] + '-'));
const modules = { ...bundle.modules }, inventory = [];
const extras = ['scripts/erp_knowledge_mcp_http_bridge.mjs', 'scripts/lib/mcp_registry.mjs',
  'scripts/lib/semantic_worker_generation.mjs', 'scripts/lib/semantic_worker_pool.mjs', 'scripts/lib/semantic_worker_entry.mjs'];
for (const p of [...MODULE_FILES, ...extras]) {
  if (!fs.existsSync(path.join(repo, p))) continue; // RED predates the helpers.
  const bytes = fs.readFileSync(path.join(repo, p));
  modules[p] = bytes.toString(); inventory.push({ path: p, bytes: bytes.length, sha256: sha256(bytes) });
}
if (args['--baseline-bridge']) {
  assert.equal(args['--mode'], 'red');
  const bytes = fs.readFileSync(args['--baseline-bridge']);
  assert.equal(sha256(bytes), '36f1edb1d7fc1670df5c42ab59a519af8ab14c0bc67e8b74b50acfeac7ded466', 'exact pre-isolation bridge');
  modules['scripts/erp_knowledge_mcp_http_bridge.mjs'] = bytes.toString();
  const entry = inventory.find(e => e.path === 'scripts/erp_knowledge_mcp_http_bridge.mjs');
  entry.bytes = bytes.length; entry.sha256 = sha256(bytes);
}
// The sole domain substitution: the same precise learning-writer no-op used by
// the frozen harness, expressed in-place so the code-generation loader pins it.
assert(modules['scripts/lib/learning.mjs'].includes('export function recordLearningGap('));
modules['scripts/lib/learning.mjs'] = modules['scripts/lib/learning.mjs'].replace('export function recordLearningGap(', 'function fixtureUnusedRecordLearningGap(')
  + '\nexport function recordLearningGap() { globalThis.owaBlockedLearningCalls = (globalThis.owaBlockedLearningCalls || 0) + 1; return null; }\n';
const files = new Map(bundle.files);
for (const [p, s] of Object.entries(modules)) files.set(path.join(bundle.root, p), Buffer.from(s));
files.set(path.join(bundle.root, 'docs/reference/mcp_users.json'), Buffer.from('{"users":[]}'));
const fixture = { root: bundle.root, files: [...files], directories: [...bundle.directories], modules,
  environment: { ROOT: bundle.root, EXA_PROVIDER: 'disabled', EXA_AUTO_DRAFT: '0', ENABLE_LIVE_LEARNING: '0', LEARNING_ENABLED: '0',
    ERP_KB_HTTP_HOST: '127.0.0.1', ERP_KB_HTTP_PORT: '0', ERP_KB_HTTP_TOKEN: 'private-fixture-only', ERP_KB_MCP_PROFILE: 'erp-semantic-mcp', ERP_KB_HTTP_AUDIT_LOG_ENABLED: '0' } };
if (args['--mode'] === 'mechanism') fixture.barrier = new SharedArrayBuffer(4);
const host = new Worker(new URL('./lib/semantic_isolation_fixture_host.mjs', import.meta.url), { workerData: { privateSemanticFixture: fixture }, env: {} });
let hostFailure;
host.on('error', error => { hostFailure = error; });
const wait = type => new Promise((resolve, reject) => {
  const message = data => { if (data.type === 'fixture-error') { error(Error(data.message)); return; } if (data.type === type) { cleanup(); resolve(data); } };
  const error = e => { cleanup(); reject(e); };
  const exit = code => error(Error('Fixture exited before ' + type + ': ' + code));
  const cleanup = () => { host.off('message', message); host.off('error', error); host.off('exit', exit); };
  host.on('message', message); host.on('error', error); host.on('exit', exit);
});
let port;
const request = (method, url, payload, token = 'private-fixture-only', signal) => new Promise((resolve, reject) => {
  const start = performance.now();
  const req = http.request({ host: '127.0.0.1', port, path: url, method, agent: false, signal, headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' } }, res => {
    const chunks = []; res.on('data', b => chunks.push(b)); res.on('error', reject);
    res.on('end', () => { try { const text = Buffer.concat(chunks).toString(); resolve({ status: res.statusCode, headers: res.headers, body: text ? JSON.parse(text) : null, ms: performance.now() - start }); } catch (e) { reject(e); } });
  });
  req.on('error', reject); req.end(payload === undefined ? undefined : JSON.stringify(payload));
});
const inputs = bundle.cases.map(q => {
  const bytes = fs.readFileSync(path.join(args['--accepted'], q.id + '.request.json'));
  return { id: q.id, bytes, request: JSON.parse(bytes) };
});
const save = (p, bytes) => fs.writeFileSync(path.join(output, p), bytes, { mode: 0o600 });
const results = [], probes = [], failures = [];
function audit(input, response) {
  const raw = response.body, json = JSON.stringify(raw, null, 2) + '\n';
  save(input.id + '.request.json', input.bytes); save(input.id + '.json', json);
  const accepted = JSON.parse(fs.readFileSync(path.join(args['--accepted'], input.id + '.json')));
  const differences = [];
  const compare = (a, b, at = '') => {
    if (a === b) return;
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      assert.deepEqual(Object.keys(a), Object.keys(b), at); for (const k of Object.keys(a)) compare(a[k], b[k], at + '/' + k);
    } else differences.push({ path: at, actual: a, accepted: b });
  };
  compare(raw, accepted);
  save(input.id + '.differences.json', JSON.stringify(differences, null, 2));
  assert(differences.every(d => /^\/result\/structuredContent\/evidence\/\d+\/observedAt$/.test(d.path)));
  assert.equal(raw.result.structuredContent.answer, fs.readFileSync(path.join(args['--accepted'], input.id + '.md'), 'utf8'));
  const sourceAudit = inspectSemanticResponse(raw, bundle);
  assert.deepEqual(sourceAudit, inspectSemanticResponse(accepted, bundle));
  save(input.id + '.md', raw.result.structuredContent.answer);
  results.push({ id: input.id, wallMs: response.ms, requestHash: sha256(input.bytes), responseHash: sha256(json),
    markdownHash: sha256(raw.result.structuredContent.answer), sourceAudit, differences });
}
try {
  ({ port } = await wait('listening'));
  const setup = { wallMs: performance.now() - begin, cpu: process.cpuUsage(setupCpu) };
  assert.equal((await request('POST', '/mcp', { id: 0, method: 'tools/list' }, 'wrong')).status, 401);
  if (!args['--baseline-bridge']) assert.equal((await request('GET', '/health')).body.semanticExecution?.workers ?? 0, 0, 'no workers before authorized semantic work');
  if (args['--mode'] === 'context') {
    const input = inputs.find(q => q.id === 'Q04');
    const controlsP = wait('context-controls'); host.postMessage({ type: 'context-controls', request: input.request });
    const controls = await controlsP;
    audit(input, { body: controls.responses[0].response, ms: controls.responses[0].timing.totalMs });
    assert.equal(controls.responses[1].response.id, input.request.id); assert.equal(controls.responses[1].response.error.code, -32001);
    assert.equal(controls.responses[2].response.id, input.request.id); assert.equal(controls.responses[2].response.error.code, -32601);
    assert.deepEqual(controls.guardViolations, []);
    for (const e of controls.workerEvents) if (e.fixtureAudit) assert.deepEqual(e.fixtureAudit.violations, []);
    save('context-controls.json', JSON.stringify(controls, null, 2));
    console.log(JSON.stringify({ output, context: 'PASS', results: results.map(({ id, wallMs }) => ({ id, wallMs })) }));
  } else if (args['--mode'] === 'request-errors') {
    const original = inputs.find(q => q.id === 'Q04'), cases = [], healths = [];
    const make = (id, malformed = false) => {
      const rpc = structuredClone(original.request); rpc.id = id;
      if (malformed) rpc.params.arguments.query = { toString: null };
      return rpc;
    };
    const call = async (label, rpc, malformed) => {
      const response = await request('POST', '/mcp', rpc);
      cases.push({ label, malformed, request: rpc, response }); return response;
    };
    await call('initial-malformed', make('same', true), true);
    await call('valid-same-id', make('same'), false);
    await call('valid-different-id', make('different'), false);
    healths.push(await request('GET', '/health'));
    for (const badFirst of [true, false]) for (const equalIds of [true, false]) {
      const label = `concurrent-badFirst-${badFirst}-equalIds-${equalIds}`;
      const pair = [{ rpc: make('pair', true), malformed: true }, { rpc: make(equalIds ? 'pair' : 'other'), malformed: false }];
      if (!badFirst) pair.reverse();
      await Promise.all(pair.map(p => call(label + (p.malformed ? '-bad' : '-valid'), p.rpc, p.malformed)));
      healths.push(await request('GET', '/health'));
    }
    await call('final-followup', make('pair'), false);
    const denied = await request('POST', '/mcp/optima-technical-mcp', make('denied', true));
    const metricsP = wait('metrics'); host.postMessage('metrics'); const metrics = await metricsP;
    save('request-errors.json', JSON.stringify({ setup, inventory, cases, healths, denied, metrics }, null, 2));
    console.log(JSON.stringify({ output, requestErrors: cases.filter(c => c.malformed).map(c => ({ label: c.label, status: c.response.status })),
      validStatuses: cases.filter(c => !c.malformed).map(c => c.response.status), states: healths.map(h => h.body.semanticExecution) }));
    for (const c of cases) {
      assert.equal(c.response.body.id, c.request.id, c.label + ': caller ID preserved');
      if (c.malformed) {
        assert.equal(c.response.status, 500, c.label + ': request-local HTTP error, not unavailable');
        assert.deepEqual(c.response.body, { jsonrpc: '2.0', id: c.request.id, error: { code: -32603, message: 'Semantic request failed.' } });
        assert(Buffer.byteLength(JSON.stringify(c.response.body)) < 256);
      } else {
        assert.equal(c.response.status, 200, c.label);
        assert.equal(c.response.body.result.structuredContent.answer, fs.readFileSync(path.join(args['--accepted'], 'Q04.md'), 'utf8'));
        const accepted = JSON.parse(fs.readFileSync(path.join(args['--accepted'], 'Q04.json')));
        const compare = (a, b, at = '') => {
          if (a === b || at === '/id') return; // this control intentionally changes only the caller ID
          if (a && b && typeof a === 'object' && typeof b === 'object') { assert.deepEqual(Object.keys(a), Object.keys(b), at); for (const k of Object.keys(a)) compare(a[k], b[k], at + '/' + k); }
          else assert.match(at, /^\/result\/structuredContent\/evidence\/\d+\/observedAt$/);
        };
        compare(c.response.body, accepted);
        assert.deepEqual(inspectSemanticResponse(c.response.body, bundle), inspectSemanticResponse(accepted, bundle));
      }
    }
    assert.equal(denied.status, 200); assert.equal(denied.body.error.code, -32601);
    assert(healths.every(h => h.status === 200 && h.body.semanticExecution.available && h.body.semanticExecution.unavailableReason === null
      && h.body.semanticExecution.active === 0 && h.body.semanticExecution.queued === 0 && h.ms <= 1000));
    assert(metrics.workerStarts.length <= 2);
    assert.deepEqual(metrics.violations, []);
    for (const e of metrics.workerEvents) if (e.fixtureAudit) assert.deepEqual(e.fixtureAudit.violations, []);
  } else if (args['--mode'] === 'mechanism') {
    assert.equal((await request('POST', '/mcp', [])).status, 400);
    assert.equal((await request('POST', '/mcp', { method: 'notifications/initialized' })).status, 202);
    assert.equal((await request('OPTIONS', '/mcp')).status, 204);
    assert.equal((await request('POST', '/mcp', { id: 5, method: 'initialize' })).body.result.serverInfo.name, 'erp-semantic-mcp');
    assert.equal((await request('POST', '/mcp', { id: 6, method: 'invalid-method' })).body.error.code, -32601);
    assert.equal((await request('POST', '/mcp', { oversized: 'x'.repeat(1048576) })).status, 413);
    const sse = await new Promise((resolve, reject) => {
      const req = http.get({ host: '127.0.0.1', port, path: '/sse', agent: false, headers: { authorization: 'Bearer private-fixture-only' } }, res => {
        let text = '';
        res.on('data', b => { text += b; if (text.includes('event: endpoint\ndata: /sse\n\n')) { resolve({ status: res.statusCode, headers: res.headers, text }); req.destroy(); } });
        res.on('error', e => { if (!text.includes('event: endpoint')) reject(e); });
      });
      req.on('error', reject);
    });
    assert.equal(sse.status, 200); assert.equal(sse.headers['mcp-protocol-version'], '2025-03-26');
    assert.equal((await request('GET', '/mcp/erp-semantic-mcp')).status, 405);
    const controllers = Array.from({ length: 10 }, () => new AbortController());
    const pending = controllers.map((c, i) => request('POST', '/mcp', { jsonrpc: '2.0', id: 7, method: 'tools/call',
      params: { name: 'erp_entity.get', arguments: { query: String(i), writeAllowed: true, profileId: 'knowledge-editorial-mcp' } } }, 'private-fixture-only', c.signal)
      .then(value => ({ value }), error => ({ error: error.code })));
    const healths = [];
    const until = async predicate => {
      for (let i = 0; i < 100; i++) { const h = await request('GET', '/health'); healths.push(h); if (predicate(h.body.semanticExecution)) return h; await new Promise(r => setTimeout(r, 10)); }
      throw Error('Pool state condition not reached');
    };
    await until(s => s.active === 2 && s.queued === 8);
    const overflow = await request('POST', '/mcp', inputs[0].request);
    assert.equal(overflow.status, 503); assert.equal(overflow.body.error.code, -32004);
    const denied = await request('POST', '/mcp/optima-technical-mcp', inputs[0].request);
    assert.equal(denied.status, 200); assert.equal(denied.body.error.code, -32601);
    for (let i = 0; i < 10; i++) {
      const h = await request('GET', '/health'); healths.push(h);
      const m = await request('POST', '/mcp', { id: 'metadata', method: 'tools/list' });
      assert.equal(m.status, 200); assert.equal(m.body.result.tools.length, 5);
      assert.equal(m.headers['x-content-type-options'], 'nosniff');
    }
    controllers[0].abort(); assert.equal((await pending[0]).error, 'ABORT_ERR');
    await until(s => s.active === 2 && s.queued === 8);
    controllers[9].abort(); assert.equal((await pending[9]).error, 'ABORT_ERR');
    await until(s => s.active === 2 && s.queued === 7);
    Atomics.store(new Int32Array(fixture.barrier), 0, 1);
    const replies = await Promise.all(pending);
    for (let i = 1; i < 9; i++) { assert.equal(replies[i].value.body.id, 7); assert.equal(replies[i].value.body.result, String(i)); }
    const drained = await until(s => s.active === 0 && s.queued === 0);
    assert.equal(drained.body.semanticExecution.workers, 2);
    host.postMessage('crash-worker');
    const failedHealth = await until(s => !s.available);
    assert.equal(failedHealth.body.semanticExecution.unavailableReason, 'WORKER_EXIT');
    const unavailable = await request('POST', '/mcp', inputs[0].request);
    assert.equal(unavailable.status, 503); assert(!JSON.stringify(unavailable.body).includes('/tmp/'));
    assert.equal((await request('POST', '/mcp', { method: 'tools/list', id: 2 })).status, 200);
    const infoP = wait('metrics'); host.postMessage('metrics'); const metrics = await infoP;
    assert.deepEqual(metrics.violations, []);
    assert(healths.every(h => h.status === 200 && h.ms <= 1000));
    save('mechanism.json', JSON.stringify({ setup, healths, overflow, denied, unavailable, replies, metrics, sse, failedHealth }, null, 2));
    console.log(JSON.stringify({ output, mechanism: 'PASS', probes: healths.length, healthMax: Math.max(...healths.map(h => h.ms)), bounds: drained.body.semanticExecution }));
  } else {
  const ids = ['red', 'single'].includes(args['--mode']) ? ['Q04'] : args['--mode'] === 'burst' ? ['Q04', 'Q03', 'Q06', 'Q10'] : inputs.map(q => q.id);
  let probing = true;
  const probe = async (kind, method, url, payload) => {
    await new Promise(r => setTimeout(r, 10));
    while (probing) {
        try { const r = await request(method, url, payload); probes.push({ kind, ms: r.ms, status: r.status }); }
        catch (e) { failures.push({ kind, error: e.message }); }
      await new Promise(r => setTimeout(r, 200));
    }
  };
  const ongoing = args['--mode'] === 'parity' ? Promise.resolve() : Promise.all([
    probe('health', 'GET', '/health'), probe('metadata', 'POST', '/mcp', { id: 'probe', method: 'tools/list' }),
  ]);
  const cpuBefore = wait('metrics'); host.postMessage('metrics'); const before = await cpuBefore;
  const loadStart = performance.now();
  if (args['--mode'] === 'parity') {
    for (const id of ids) { const input = inputs.find(q => q.id === id); audit(input, await request('POST', '/mcp', input.request)); }
  } else {
    const responses = await Promise.all(ids.map(id => request('POST', '/mcp', inputs.find(q => q.id === id).request)));
    // Save/audit outside load interval; expensive independent audit is parent-only.
    const elapsed = performance.now() - loadStart;
    probing = false; await ongoing;
    const cpuAfter = wait('metrics'); host.postMessage('metrics'); const after = await cpuAfter;
    for (const [i, id] of ids.entries()) audit(inputs.find(q => q.id === id), responses[i]);
    // Repeat one identical request on the already warm worker pool.
    const warmBeforeP = wait('metrics'); host.postMessage('metrics'); const warmBefore = await warmBeforeP;
    const warm = await request('POST', '/mcp', inputs.find(q => q.id === 'Q04').request);
    const warmAfterP = wait('metrics'); host.postMessage('metrics'); const warmAfter = await warmAfterP;
    assert.equal(warm.status, 200);
    save('warm-Q04.json', JSON.stringify(warm.body, null, 2));
    save('warm-load.json', JSON.stringify({ wallMs: warm.ms, processCpuMs: ((warmAfter.cpu.user + warmAfter.cpu.system) - (warmBefore.cpu.user + warmBefore.cpu.system)) / 1000,
      rssBefore: warmBefore.rss, rssAfter: warmAfter.rss }, null, 2));
    results.push({ id: 'warm-Q04', wallMs: warm.ms });
    save('load.json', JSON.stringify({ elapsedMs: elapsed, before, after, processCpuMs: ((after.cpu.user + after.cpu.system) - (before.cpu.user + before.cpu.system)) / 1000 }, null, 2));
  }
  probing = false; await ongoing;
  const metricsP = wait('metrics'); host.postMessage('metrics'); const metrics = await metricsP;
  assert.deepEqual(metrics.violations, []);
  for (const event of metrics.workerEvents || []) if (event.fixtureAudit) assert.deepEqual(event.fixtureAudit.violations, []);
  const summary = kind => { const values = probes.filter(p => p.kind === kind).map(p => p.ms).sort((a, b) => a - b); return { count: values.length,
    p50: values[Math.ceil(values.length * .5) - 1], p95: values[Math.ceil(values.length * .95) - 1], max: values.at(-1), success: probes.filter(p => p.kind === kind && p.status === 200).length }; };
  const report = { output, mode: args['--mode'], frozenManifestHash: bundle.manifestHash, inventory, setup, results, probes, failures,
    health: summary('health'), metadata: summary('metadata'), metrics };
  save('metrics.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ output, setup, health: report.health, metadata: report.metadata, failures, results: results.map(({ id, wallMs }) => ({ id, wallMs })) }));
  assert.deepEqual(failures, []); assert(probes.every(p => p.status === 200));
  if (args['--mode'] !== 'parity') assert(report.health.p95 <= 250 && report.health.max <= 1000, 'health availability p95 <=250ms / max <=1000ms');
  }
} finally {
  if (fixture.barrier) Atomics.store(new Int32Array(fixture.barrier), 0, 1);
  try {
    if (port && !hostFailure && host.threadId !== -1) {
      let timeout;
      const exited = new Promise((resolve, reject) => {
        host.once('exit', code => { clearTimeout(timeout); resolve(code); });
        timeout = setTimeout(() => reject(Error('Private bridge/workers did not exit after close')), 5000);
      });
      const closed = wait('closed'); host.postMessage('close'); await closed;
      assert.equal(await exited, 0, 'private bridge and nested workers exit naturally after close');
    }
  }
  finally { await host.terminate(); }
}
