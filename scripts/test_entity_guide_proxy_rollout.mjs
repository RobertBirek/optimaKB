// Synthetic settings and in-memory send only. The inspected deployed .test.mjs
// is reference material, never executed: it reads live entity-guide-bindings.json.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { Worker, MessageChannel } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';
import { captureSemanticGeneration, SEMANTIC_CODE_FILES, SEMANTIC_WORKER_BOOTSTRAP } from './lib/semantic_worker_generation.mjs';
import { captureCurrentRawCompiler, CURRENT_RAW_RUNTIME_FILES } from './lib/semantic_raw_compile_controller.mjs';
import { MODULE_FILES } from './lib/owa_offline_harness.mjs';
import { measureRawClosure, rawEnvironment } from './lib/semantic_raw_code.mjs';

const helper = 'scripts/lib/entity_guide_text_proxy.mjs';
const helperUrl = new URL('./lib/entity_guide_text_proxy.mjs', import.meta.url);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const deployedHash = '9dda86e0b7f4e3f213b3336a0bc6c6ec23b31f9a2037ae214a695476f8a670d9';
const api = await import(helperUrl).catch(error => {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  return {};
});

test('deployed guide helper is preserved byte-for-byte', () => {
  assert(fs.existsSync(helperUrl), 'deployed guide helper missing from versioned MAIN');
  assert.equal(hash(fs.readFileSync(helperUrl)), deployedHash);
});
test('bridge preserves the exact deployed guide integration and every prior MAIN byte', () => {
  const source = fs.readFileSync(new URL('./erp_knowledge_mcp_http_bridge.mjs', import.meta.url), 'utf8');
  const integration = [
    "import { createEntityGuideTextProxy, GUIDE_TEXT_PATH } from './lib/entity_guide_text_proxy.mjs';\n",
    "const entityGuideTextProxy = createEntityGuideTextProxy({ configPath: process.env.ERP_KB_ENTITY_GUIDE_PROXY_CONFIG || '' });\n",
    "  if (req.url === GUIDE_TEXT_PATH) {\n    auditContext.toolName = 'optima_entity_guide_text_read';\n    await entityGuideTextProxy(req, res);\n    return;\n  }\n\n",
  ];
  let previous = source;
  for (const block of integration) {
    assert.equal(source.split(block).length, 2, 'deployed guide integration missing or duplicated');
    previous = previous.replace(block, '');
  }
  assert(source.indexOf(integration[2]) > source.indexOf('if (!rate.ok)'));
  assert(source.indexOf(integration[2]) < source.indexOf("if (req.url === '/health')"));
  assert.equal(hash(previous), '1a22e83daa139e2014ac118d5d373176860b94d9d0703592b136df573640f716',
    'raw/legacy bridge bytes changed beyond the three deployed guide blocks');
});
test('complete runtime capture measures the guide helper once in the same ordered inventory', () => {
  assert(SEMANTIC_CODE_FILES.includes(helper), 'guide helper missing from bounded capture');
  assert.equal(SEMANTIC_CODE_FILES.filter(file => file === helper).length, 1);
  assert.equal(SEMANTIC_CODE_FILES.length, 44);
  assert.deepEqual(CURRENT_RAW_RUNTIME_FILES, SEMANTIC_CODE_FILES);
  assert.deepEqual(MODULE_FILES, SEMANTIC_CODE_FILES);
  const compiler = captureCurrentRawCompiler(), generation = captureSemanticGeneration();
  assert.equal(compiler.generation.id, generation.id);
  assert.deepEqual(compiler.generation.sources, generation.sources);
  const measured = compiler.code.runtime_files.find(file => file.path === helper);
  assert.equal(measured.sha256, deployedHash);
  assert.equal(measured.bytes, fs.statSync(helperUrl).size);
  assert.equal(compiler.code.runtime_files.length, 44);
  assert(compiler.code.runtime_files.reduce((n, file) => n + file.bytes, 0) < 2097152);
});

// Optional reference is ONLY the inspected importable helper, never its test or
// settings/bindings files. Both factories run precisely the same synthetic cases.
const factories = [['versioned', api]];
if (process.env.ENTITY_GUIDE_PROXY_REFERENCE_MODULE) {
  const reference = pathToFileURL(process.env.ENTITY_GUIDE_PROXY_REFERENCE_MODULE);
  assert.equal(hash(fs.readFileSync(reference)), deployedHash);
  factories.push(['deployed-reference', await import(reference)]);
}
for (const [origin, module] of factories) {
  const cookie = 'TOPOLOGY_FIX_SYNTHETIC_COOKIE';
  const fields = ['id', 'entityRefId', 'content', 'contentHash'];
  const registry = { schemaVersion: 2, projects: [
    { namespace: 'McpOptimaEvidence', projectId: 21, fields },
    { namespace: 'McpOptimaOntology', projectId: 19, fields: ['toolName', 'readEntityRefId', 'readContract', 'readContractHash'] },
  ], guides: [
    { entity: 'Brand', entityRefId: 'SYNTHETIC_BRAND', sections: [{}], readContracts: [
      { tool: 'optima_list_brands', policy_level: 'Read' }, { tool: 'optima_delete_brand', policy_level: 'Write' },
    ] },
    { entity: 'Item', entityRefId: 'SYNTHETIC_ITEM', sections: [{}] },
  ] };
  const settings = { enabled: true, allowedClient: '192.0.2.10', trustedProxies: ['192.0.2.20'],
    cookieSha256: hash(cookie), registry };
  const payload = { projectId: 21, queryString: 'Brand', labelConstraints: ['McpOptimaEvidence.KnowledgeSection'], topk: 20 };
  const row = { fields: { __labels__: payload.labelConstraints, id: 'SECTION_1', entityRefId: '"SYNTHETIC_BRAND"',
    content: '"text"', contentHash: '"hash"', vector: [1, 2], privateField: 'excluded' }, score: 1 };
  async function invoke({ path = '/public/v1/search/text', method = 'POST', headers = {}, remote = '192.0.2.20',
    body = payload, config = settings, send } = {}) {
    assert.equal(typeof module.createEntityGuideTextProxy, 'function', 'deployed guide helper factory missing');
    registry.registryHash = module.registryHash(registry);
    const req = Readable.from([Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))]);
    Object.assign(req, { url: path, method, headers: { cookie, 'content-type': 'application/json',
      'x-forwarded-for': settings.allowedClient, ...headers }, socket: { remoteAddress: remote } });
    const res = { writeHead(status, headers) { this.status = status; this.headers = headers; },
      end(value) { this.value = JSON.parse(value); } };
    let calls = 0;
    const handler = module.createEntityGuideTextProxy({ settings: config, send: async (...args) => {
      calls++; return send ? send(...args) : new Response(JSON.stringify({ success: true, result: [row] }));
    } });
    return { handled: await handler(req, res), ...res, calls };
  }
  const check = (name, fn) => test(origin + ': ' + name, fn);
  check('scoped guide forwards only the fixed request and filters response fields', async () => {
    const result = await invoke({ send: (url, options) => {
      assert.equal(url, 'http://10.10.254.42:8887/public/v1/search/text');
      assert.equal(options.method, 'POST'); assert.equal(options.redirect, 'error');
      assert.deepEqual(options.headers, { Cookie: cookie, 'Content-Type': 'application/json' });
      assert.deepEqual(JSON.parse(options.body), payload); assert(options.signal instanceof AbortSignal);
      return new Response(JSON.stringify([row]));
    } });
    assert.equal(result.status, 200); assert.equal(result.calls, 1); assert.equal(result.handled, true);
    assert.deepEqual(Object.keys(result.value.result[0].fields).sort(), ['__labels__', ...fields].sort());
    assert.equal(result.headers['Cache-Control'], 'no-store');
    assert.equal(result.headers['X-Content-Type-Options'], 'nosniff');
  });
  for (const path of ['/mcp', '/sse', '/mcp/erp-semantic-evidence-poc', '/health', '/public/v1/search/text?extra=1'])
    check('does not intercept ' + path, async () => {
      const result = await invoke({ path }); assert.equal(result.handled, false); assert.equal(result.calls, 0);
    });
  for (const [name, change, status] of [
    ['disabled', { config: { ...settings, enabled: false } }, 503],
    ['missing cookie', { headers: { cookie: '' } }, 401], ['bad cookie', { headers: { cookie: 'OTHER' } }, 401],
    ['foreign client', { headers: { 'x-forwarded-for': '203.0.113.1' } }, 403],
    ['forged proxy', { remote: '203.0.113.1' }, 403], ['write method', { method: 'DELETE' }, 405],
    ['content type', { headers: { 'content-type': 'text/plain' } }, 415],
    ['foreign project', { body: { ...payload, projectId: 4 } }, 400],
    ['foreign entity', { body: { ...payload, queryString: 'Contractor' } }, 400],
    ['object entity', { body: { ...payload, queryString: { entity: 'Brand' } } }, 400],
    ['large topk', { body: { ...payload, topk: 200 } }, 400],
    ['foreign label', { body: { ...payload, labelConstraints: ['Other'] } }, 400],
    ['extra argument', { body: { ...payload, url: 'https://evil.invalid' } }, 400],
    ['invalid JSON', { body: '{' }, 400], ['large body', { body: 'x'.repeat(16385) }, 413],
  ]) check('guard ' + name, async () => {
    const result = await invoke(change); assert.equal(result.status, status); assert.equal(result.calls, 0);
  });
  for (const [name, send] of [
    ['redirect', () => new Response('', { status: 302 })],
    ['API failure', () => new Response(JSON.stringify({ success: false }))],
    ['foreign label', () => new Response(JSON.stringify([{ fields: { __labels__: ['Other'] } }]))],
    ['empty label', () => new Response(JSON.stringify([{ fields: { __labels__: [] } }]))],
    ['large response', () => new Response('x'.repeat(1048577))],
    ['timeout', () => { throw Error('SYNTHETIC_PRIVATE_ERROR'); }],
  ]) check('upstream guard ' + name, async () => {
    const result = await invoke({ send }); assert.equal(result.status, 502);
    assert(!JSON.stringify(result.value).includes('SYNTHETIC_PRIVATE_ERROR'));
  });
  check('filters foreign entities and admits the explicit Item binding', async () => {
    const result = await invoke({ body: { ...payload, queryString: 'Item' }, send: () => new Response(JSON.stringify([
      row, { ...row, fields: { ...row.fields, entityRefId: '"SYNTHETIC_ITEM"' } },
    ])) });
    assert.equal(result.status, 200); assert.equal(result.value.result.length, 1);
    assert.equal(result.value.result[0].fields.entityRefId, '"SYNTHETIC_ITEM"');
  });
  check('registry expansion and tamper refusal retain deployed behavior', async () => {
    assert.equal(typeof module.registryHash, 'function', 'registry hash missing');
    const expanded = structuredClone(registry);
    expanded.guides.push({ entity: 'SyntheticEntity', entityRefId: 'SYNTHETIC_THIRD', sections: [{}] });
    expanded.registryHash = module.registryHash(expanded);
    const config = { ...settings, registry: expanded };
    const result = await invoke({ config, body: { ...payload, queryString: 'SyntheticEntity' },
      send: () => new Response(JSON.stringify([{ ...row, fields: { ...row.fields, entityRefId: '"SYNTHETIC_THIRD"' } }])) });
    assert.equal(result.status, 200); assert.equal(result.value.result.length, 1);
    expanded.guides[0].entityRefId = 'CHANGED';
    const denied = await invoke({ config }); assert.equal(denied.status, 503); assert.equal(denied.calls, 0);
  });
  check('Operation read is restricted to registered Read tool, entity, label and project', async () => {
    const body = { projectId: 19, queryString: 'optima_list_brands', labelConstraints: ['McpOptimaOntology.Operation'], topk: 20 };
    const operation = { fields: { __labels__: body.labelConstraints, toolName: '"optima_list_brands"',
      readEntityRefId: '"SYNTHETIC_BRAND"', readContract: '"{}"', readContractHash: '"hash"', vector: [1] } };
    const result = await invoke({ body, send: () => new Response(JSON.stringify([operation,
      { fields: { ...operation.fields, toolName: '"other_tool"' } },
      { fields: { ...operation.fields, readEntityRefId: '"foreign"' } },
    ])) });
    assert.equal(result.status, 200); assert.equal(result.value.result.length, 1);
    assert.equal(result.value.result[0].fields.vector, undefined);
    for (const change of [{ queryString: 'optima_delete_brand' }, { projectId: 21 },
      { labelConstraints: payload.labelConstraints }, { topk: 21 }]) {
      const denied = await invoke({ body: { ...body, ...change } });
      assert.equal(denied.status, 400); assert.equal(denied.calls, 0);
    }
  });
}

test('both raw workers capture but never execute guide helper, read guide config or fetch', async () => {
  assert(SEMANTIC_CODE_FILES.includes(helper), 'guide helper must be captured before isolation can be proved');
  const original = captureSemanticGeneration(), root = new URL('../', import.meta.url).href;
  const sources = { ...original.sources, [new URL(helper, root).href]:
    "import fs from 'node:fs'; fs.readFileSync('/forbidden/guide-config.json'); fetch('https://forbidden.invalid'); throw Error('GUIDE_EXECUTED');" };
  const generation = { ...original, sources, id: hash(JSON.stringify(sources)) };
  const measured = measureRawClosure(Object.fromEntries(Object.entries(sources).map(([url, text]) => [url.slice(root.length), text])), rawEnvironment(), 'runtime');
  const code = { worker_generation_id: generation.id, runtime_code_sha256: measured.sha256, environment: rawEnvironment() };
  const dataRoot = '/tmp/opencode/topology-fix-absent-' + randomUUID();
  const trusted = { abi: 'owa-raw-data-generation/1', data_root: dataRoot, manifest_path: dataRoot + '/manifest.json',
    manifest_sha256: 'b'.repeat(64), snapshot_id: 'c'.repeat(64), worker_generation_id: generation.id, runtime_code_sha256: measured.sha256 };
  for (const slot of [0, 1]) {
    const channel = new MessageChannel(), frames = [], audits = [];
    channel.port1.on('message', message => audits.push(message));
    const worker = new Worker(SEMANTIC_WORKER_BOOTSTRAP, { eval: true, env: {}, workerData: {
      generation, raw: { trustedDataGeneration: trusted, code }, auditPort: channel.port2,
    }, transferList: [channel.port2] });
    const wait = predicate => new Promise((resolve, reject) => {
      const timer = setTimeout(() => { clearInterval(poll); reject(Error('raw guide isolation timed out')); }, 15000);
      const poll = setInterval(() => { if (predicate()) { clearTimeout(timer); clearInterval(poll); resolve(); } }, 5);
    });
    worker.on('message', message => frames.push(message));
    try {
      await wait(() => frames.some(frame => frame.type === 'ready'));
      for (const authorization of [null, { profile_id: 'erp-semantic-evidence-poc', scope: 'kb.semantic.read', namespaces: ['OWAOntology'] }]) {
        const jobId = randomUUID();
        worker.postMessage({ jobId, request: { jsonrpc: '2.0', id: slot, method: 'tools/call',
          params: { name: 'erp_subject.discover', arguments: { query: 'operator', kind: 'field' } } },
        context: { authorization, trustedDataGeneration: trusted, code }, timing: { queueMs: 0, startupMs: 0 } });
        await wait(() => frames.some(frame => frame.jobId === jobId && frame.type === 'result'));
        const result = frames.find(frame => frame.jobId === jobId && frame.type === 'result');
        assert.equal(result.data_state, 'unavailable');
        if (authorization) assert.equal(result.response.result.structuredContent.code, 'INDEX_UNAVAILABLE');
        else assert.equal(result.response.error.code, -32001);
      }
      await wait(() => audits.some(audit => audit.phase === 'rejected'));
      assert(audits.every(audit => audit.reads === 0 && audit.opens.length === 0 && audit.violations.length === 0));
    } finally { await worker.terminate(); channel.port1.close(); }
  }
});
