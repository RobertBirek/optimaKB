// Test-only private listener/worker capability. Never imported by production.
import http from 'node:http';
import dns from 'node:dns';
import { Worker as NativeWorker, parentPort, workerData } from 'node:worker_threads';
import { register, syncBuiltinESMExports } from 'node:module';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { installRuntimeGuard } from './owa_offline_harness.mjs';

export function fixtureLoader(fixture) {
  const sources = Object.fromEntries(Object.entries(fixture.modules).map(([p, s]) => [pathToFileURL(fixture.root + '/' + p).href, s]));
  const generationLoader = /const LOADER = `([\s\S]*?)`;/.exec(fixture.modules['scripts/lib/semantic_worker_generation.mjs'] || '')?.[1];
  if (generationLoader) sources['data:text/javascript,' + encodeURIComponent(generationLoader)] = generationLoader;
  const learning = pathToFileURL(fixture.root + '/scripts/lib/learning.mjs').href;
  const answer = pathToFileURL(fixture.root + '/scripts/erp_knowledge_answer.mjs').href;
  const stub = pathToFileURL(fixture.root + '/fixture-learning-writer.mjs').href;
  sources[stub] = `export { computeConfidenceScore, CONFIDENCE_LOW_THRESHOLD } from ${JSON.stringify(learning)}; export function recordLearningGap() { globalThis.owaBlockedLearningCalls = (globalThis.owaBlockedLearningCalls || 0) + 1; return null; }`;
  register('data:text/javascript,' + encodeURIComponent(`
    import { isBuiltin } from 'node:module';
    let sources;
    export function initialize(data) { sources = data; }
    export function resolve(specifier, context) {
      if (isBuiltin(specifier)) return { url: specifier.startsWith('node:') ? specifier : 'node:' + specifier, shortCircuit: true };
      let url = new URL(specifier, context.parentURL).href;
      if (context.parentURL === ${JSON.stringify(answer)} && url === ${JSON.stringify(learning)}) url = ${JSON.stringify(stub)};
      if (!Object.hasOwn(sources, url)) throw Error('Unbound fixture module');
      return { url, shortCircuit: true };
    }
    export function load(url, context, next) {
      if (url.startsWith('node:')) return next(url, context);
      if (!Object.hasOwn(sources, url)) throw Error('Unbound fixture load');
      return { source: sources[url], format: 'module', shortCircuit: true };
    }
  `), import.meta.url, { data: sources });
}

export function guardFixture(fixture) {
  for (const k of Object.keys(process.env)) delete process.env[k];
  Object.assign(process.env, fixture.environment);
  fixtureLoader(fixture);
  return installRuntimeGuard({ ...fixture, files: new Map(fixture.files.map(([p, b]) => [p, Buffer.from(b)])), directories: new Set(fixture.directories) });
}

// An explicitly granted test capability wraps *only* this bridge's nested pool
// workers. The production bootstrap remains intact; the guard is installed first.
if (workerData?.privateSemanticFixture) {
  const fixture = workerData.privateSemanticFixture;
  const createServer = http.createServer.bind(http);
  const guard = guardFixture(fixture);
  const deniedLookup = dns.lookup;
  dns.lookup = (host, options, callback) => {
    if (host !== '127.0.0.1') return deniedLookup(host, options, callback);
    if (typeof options === 'function') callback = options;
    queueMicrotask(() => callback(null, '127.0.0.1', 4));
  };
  const module = await import('node:worker_threads');
  // Builtin default object is mutable; synchronize named Worker imports afterwards.
  const mutable = module.default;
  const workerEvents = [], workerStarts = [], poolWorkers = [];
  mutable.Worker = class extends NativeWorker {
    constructor(source, options) {
      if (!options?.eval || !options.workerData?.generation) throw Error('Unbound fixture worker capability');
      if (Object.keys(options.env || {}).some(k => k.startsWith('ERP_KB_HTTP_'))) throw Error('Transport environment leaked to worker');
      if (fixture.barrier) source = `const {parentPort,workerData} = require('node:worker_threads');
        const barrier = new Int32Array(workerData.privatePoolFixture.barrier);
        parentPort.postMessage({type:'ready',generation:workerData.generation.id});
        parentPort.on('message', m => { while(Atomics.load(barrier,0)===0) Math.sqrt(Math.random());
          parentPort.postMessage({type:'result',jobId:m.jobId,response:{jsonrpc:'2.0',id:m.request.id,result:m.request.params.arguments.query}}); });`;
      const prelude = `const { workerData } = require('node:worker_threads');
        import(${JSON.stringify(import.meta.url)}).then(m => {
          const guard = m.guardFixture(workerData.privatePoolFixture);
          const { parentPort } = require('node:worker_threads');
          const post = parentPort.postMessage.bind(parentPort);
          parentPort.postMessage = message => post({ ...message, fixtureAudit: {
            violations: guard.violations, reads: guard.reads, blockedLearning: globalThis.owaBlockedLearningCalls || 0, rss: process.memoryUsage().rss } });
          return (async () => { ${source}\n })(); }).catch(e => { console.error('Fixture worker startup: ' + e.message); process.exit(1); });`;
      super(prelude, { ...options, workerData: { ...options.workerData, privatePoolFixture: fixture } });
      workerStarts.push(performance.now());
      poolWorkers.push(this);
      this.on('message', m => workerEvents.push({ type: m.type, jobId: m.jobId, handlerWallMs: m.handlerWallMs, at: performance.now(), fixtureAudit: m.fixtureAudit }));
    }
    postMessage(message) {
      workerEvents.push({ type: 'dispatch', jobId: message.jobId, callerId: message.request.id, timing: message.timing, at: performance.now() });
      return super.postMessage(message);
    }
  };
  let server;
  const sentinels = [];
  http.createServer = (...args) => {
    if (server) throw Error('Only one private fixture listener');
    const listener = args[0];
    args[0] = (req, res) => {
      req.once('end', () => {
        const start = performance.now();
        setTimeout(() => { if (sentinels.length < 256) sentinels.push({ path: req.url, ms: performance.now() - start }); }, 0);
      });
      return listener(req, res);
    };
    server = createServer(...args);
    const listen = server.listen.bind(server);
    server.listen = (port, host, cb) => {
      if (port !== 0 || host !== '127.0.0.1') throw Error('Private fixture binding required');
      server.once('listening', () => parentPort.postMessage({ type: 'listening', port: server.address().port }));
      return listen(port, host, cb);
    };
    return server;
  };
  syncBuiltinESMExports();
  const started = performance.now(), cpu = process.cpuUsage();
  parentPort.on('message', async message => {
    if (message?.type === 'context-controls') {
      const load = p => import(pathToFileURL(fixture.root + '/scripts/lib/' + p + '.mjs').href);
      const { captureSemanticGeneration } = await load('semantic_worker_generation');
      const { createSemanticWorkerPool } = await load('semantic_worker_pool');
      const { getMcpProfile } = await load('erp_knowledge_mcp_profiles');
      const pool = createSemanticWorkerPool(captureSemanticGeneration(pathToFileURL(fixture.root + '/')));
      const common = { profile: getMcpProfile('erp-semantic-mcp'), allowedNamespaces: new Set(['OWAOntology', 'ComarchOptimaBusinessSemantics']), writeAllowed: true,
        serverInfo: { name: 'admin-fixture', version: '1' }, authorization: 'private-secret-must-not-cross' };
      const req = structuredClone(message.request);
      req.params.arguments = { ...req.params.arguments, writeAllowed: true, allowAutoDraft: true, options: { allowAutoDraft: true }, profile: 'knowledge-editorial-mcp', allowedNamespaces: ['TaxbellLegalReference'] };
      try {
        const jobs = [pool.run(req, common), pool.run(req, { ...common, allowedNamespaces: new Set() }),
          pool.run(req, { ...common, allowedNamespaces: null, profile: getMcpProfile('optima-technical-mcp') })];
        req.params.arguments.query = 'mutated-after-enqueue'; common.allowedNamespaces.clear();
        const responses = await Promise.all(jobs);
        parentPort.postMessage({ type: 'context-controls', responses, workerEvents, guardViolations: guard.violations });
      } catch (error) { parentPort.postMessage({ type: 'fixture-error', message: error.stack }); }
      finally { await pool.close(); }
    }
    if (message === 'crash-worker') await poolWorkers[0].terminate();
    if (message === 'metrics') parentPort.postMessage({ type: 'metrics', wallMs: performance.now() - started,
      cpu: process.cpuUsage(cpu), rss: process.memoryUsage().rss, violations: guard.violations, reads: guard.reads,
      blockedLearning: globalThis.owaBlockedLearningCalls || 0, workerStarts, workerEvents, sentinels });
    if (message === 'close') {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
      parentPort.postMessage({ type: 'closed', violations: guard.violations });
      parentPort.close();
    }
  });
  await import(pathToFileURL(fixture.root + '/scripts/erp_knowledge_mcp_http_bridge.mjs').href);
}
