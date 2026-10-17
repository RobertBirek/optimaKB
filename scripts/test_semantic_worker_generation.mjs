import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { createSemanticWorkerPool } from './lib/semantic_worker_pool.mjs';
const api = await import('./lib/semantic_worker_generation.mjs').catch(e => { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return {}; });

test('code generation is bounded, immutable, and imports pinned bytes after on-disk transfer', async () => {
  assert.equal(typeof api.captureSemanticGeneration, 'function', 'capture immutable code generation before parent handler import');
  const dir = fs.mkdtempSync('/tmp/opencode/semantic-generation-');
  try {
    fs.mkdirSync(path.join(dir, 'scripts/lib'), { recursive: true });
    for (const file of api.SEMANTIC_CODE_FILES) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      fs.writeFileSync(path.join(dir, file), 'export const value = "original";');
    }
    const generation = api.captureSemanticGeneration(pathToFileURL(dir + '/'));
    assert(Object.isFrozen(generation)); assert(Object.isFrozen(generation.sources));
    api.installSemanticGeneration(generation);
    fs.writeFileSync(path.join(dir, 'scripts/lib/erp_knowledge_mcp_core.mjs'), 'throw Error("unverified future source");');
    const core = await import(generation.coreUrl);
    assert.equal(core.value, 'original');
    assert.throws(() => { generation.sources[generation.coreUrl] = 'changed'; }, TypeError);
    fs.writeFileSync(path.join(dir, 'scripts/lib/erp_knowledge_mcp_core.mjs'), 'x'.repeat(2 * 1024 * 1024 + 1));
    assert.throws(() => api.captureSemanticGeneration(pathToFileURL(dir + '/')), /generation/i);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('unexpected dependency fails closed rather than loading an unpinned mixture', async () => {
  assert.equal(typeof api.captureSemanticGeneration, 'function');
  const dir = fs.mkdtempSync('/tmp/opencode/semantic-generation-');
  try {
    for (const file of api.SEMANTIC_CODE_FILES) { fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true }); fs.writeFileSync(path.join(dir, file), 'export const value = 1;'); }
    fs.writeFileSync(path.join(dir, 'scripts/lib/erp_knowledge_mcp_core.mjs'), 'export { secret } from "./unbound.mjs";');
    const generation = api.captureSemanticGeneration(pathToFileURL(dir + '/'));
    api.installSemanticGeneration(generation);
    await assert.rejects(import(generation.coreUrl), /generation/i);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('lazy real worker uses captured generation after source replacement; corrupt generation fails closed', async () => {
  const dir = fs.mkdtempSync('/tmp/opencode/semantic-worker-transfer-');
  let pool;
  try {
    for (const file of api.SEMANTIC_CODE_FILES) { fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true }); fs.writeFileSync(path.join(dir, file), 'export const value = 1;'); }
    fs.writeFileSync(path.join(dir, 'scripts/lib/erp_knowledge_mcp_core.mjs'), 'export async function handleJsonRpcRequest(r,c) { return {id:r.id,result:{generation:"original",profile:c.profile.id,scope:c.allowedNamespaces}}; }');
    fs.writeFileSync(path.join(dir, 'scripts/lib/erp_knowledge_mcp_profiles.mjs'), 'export function getMcpProfile(id) { return {id}; }');
    fs.writeFileSync(path.join(dir, 'scripts/lib/semantic_worker_entry.mjs'), fs.readFileSync(new URL('./lib/semantic_worker_entry.mjs', import.meta.url)));
    const generation = api.captureSemanticGeneration(pathToFileURL(dir + '/'));
    fs.writeFileSync(path.join(dir, 'scripts/lib/erp_knowledge_mcp_core.mjs'), 'throw Error("wrong transferred generation");');
    pool = createSemanticWorkerPool(generation);
    const result = await pool.run({ id: 5 }, { profile: { id: 'erp-semantic-mcp' }, allowedNamespaces: new Set(), writeAllowed: true });
    assert.deepEqual(result.response, { id: 5, result: { generation: 'original', profile: 'erp-semantic-mcp', scope: new Set() } });
    await pool.close();
    pool = createSemanticWorkerPool({ ...generation, id: 'corrupt-generation' });
    await assert.rejects(pool.run({ id: 5 }, { profile: { id: 'erp-semantic-mcp' } }), e => e.code === 'SEMANTIC_UNAVAILABLE');
    assert.equal(pool.stats().available, false);
  } finally { await pool?.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});
