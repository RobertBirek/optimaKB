import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import fs from 'node:fs';
import { RAW_ARTIFACTS, RAW_LIMITS, canonicalJson, sha256, hashRaw, validateRawType } from './lib/semantic_raw_contract.mjs';
import * as fixtures from './lib/semantic_raw_test_fixture.mjs';
import * as capture from './lib/semantic_raw_code.mjs';
const api = await import('./lib/semantic_raw_generation.mjs').catch(e => { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return {}; });
const authorized = {profile_id:'erp-semantic-evidence-poc',scope:'kb.semantic.read',namespaces:['OWAOntology']};
let base, vectors;
after(() => base?.cleanup());
function fixture(t) {
  assert.equal(typeof fixtures.stageProductionRawFixture,'function');
  if (!base) {
    const parent = fs.mkdtempSync('/tmp/opencode/task4-generation-base-');
    try { base = fixtures.stageProductionRawFixture({sourceRoot:'/tmp/opencode/semantic42-frozen-EsJ4gr',outputRoot:parent+'/data'}); }
    catch(e) { fs.rmSync(parent,{recursive:true,force:true}); throw e; }
    const cleanup = base.cleanup; base.cleanup = () => { cleanup(); fs.rmSync(parent,{recursive:true,force:true}); };
    vectors = Object.fromEntries(['manifest.json','index.json',...RAW_ARTIFACTS].map(p => [p,fs.readFileSync(base.trusted.data_root+'/'+p)]));
    t.diagnostic('fresh captured production fixture: '+canonicalJson({...base.code,manifest_sha256:base.trusted.manifest_sha256,snapshot_id:base.trusted.snapshot_id,index_sha256:base.manifest.index.sha256,compiler_closure_sha256:base.manifest.compiler.closure_sha256,runtime_files:base.manifest.runtime_files.length,runtime_bytes:base.manifest.runtime_files.reduce((n,f) => n+f.bytes,0),five_file_bytes:Object.values(vectors).reduce((n,b) => n+b.length,0)}));
  }
  const root = fs.mkdtempSync('/tmp/opencode/task4-generation-case-'); t.after(() => fs.rmSync(root,{recursive:true,force:true}));
  for (const [p,b] of Object.entries(vectors)) { fs.mkdirSync(root+'/'+p.split('/').slice(0,-1).join('/'),{recursive:true}); fs.writeFileSync(root+'/'+p,b); }
  return {...base,trusted:{...base.trusted,data_root:root,manifest_path:root+'/manifest.json'},manifest:structuredClone(base.manifest),index:structuredClone(base.index)};
}
function rewrite(f, {index = f.index,manifest = f.manifest,trust = true,indexBytes = Buffer.from(canonicalJson(index))} = {}) {
  const ib = indexBytes;
  manifest.index.bytes = ib.length; manifest.index.sha256 = sha256(ib);
  manifest.snapshot_id = hashRaw('snapshot',{format:index.format,contract_version:index.contract_version,canonicalization:index.canonicalization,base_manifest_sha256:index.base_manifest_sha256,compiler_closure_sha256:index.compiler_closure_sha256,runtime_code_sha256:index.runtime_code_sha256,worker_generation_id:index.worker_generation_id,environment:index.environment,sources:index.sources,index_sha256:sha256(ib)});
  manifest.data_bytes = manifest.sources.reduce((n,s) => n+s.bytes,0)+ib.length;
  const mb = Buffer.from(canonicalJson(manifest));
  fs.writeFileSync(f.trusted.data_root+'/index.json',ib); fs.writeFileSync(f.trusted.manifest_path,mb);
  if (trust) { f.trusted.manifest_sha256 = sha256(mb); f.trusted.snapshot_id = manifest.snapshot_id; }
}
function load(f) { assert.equal(typeof api.loadRawGeneration,'function'); return api.loadRawGeneration(f.trusted,f.code,authorized); }
test('unauthorized loader never reads a descriptor or source', () => {
  assert.equal(typeof api.loadRawGeneration,'function');
  const trusted = new Proxy({}, {get(){throw Error('descriptor touched');},ownKeys(){throw Error('descriptor touched');}});
  for (const auth of [null,{}, {...authorized,namespaces:[]},{...authorized,scope:'wrong'},{...authorized,extra:true}]) assert.throws(() => api.loadRawGeneration(trusted,{},auth),/Access denied\./);
});
test('trusted current code capture is retained without accepting a binding as capture', () => {
  assert.equal(typeof capture.getRawCodeCapture,'function');
  assert.equal(capture.getRawCodeCapture(),undefined);
});
test('missing or nonobject trusted descriptors fail the descriptor stage with DATA_CODE_MISMATCH', () => {
  assert.equal(typeof api.loadRawGeneration,'function');
  for (const trusted of [null,{},[],'bad']) assert.deepEqual(api.loadRawGeneration(trusted,{},authorized),{ok:false,code:'DATA_CODE_MISMATCH'});
});
test('production helper stages the sealed 366-record artifact and complete current closure', t => {
  assert.equal(typeof api.loadRawGeneration,'function'); const f = fixture(t), r = load(f);
  assert.equal(r.ok,true,r.code); assert(Object.isFrozen(r.handle)); assert.deepEqual(Reflect.ownKeys(r.handle),[]);
  assert(validateRawType('TrustedDataGeneration',f.trusted)); assert(validateRawType('CodeBinding',f.code));
  assert.equal(f.index.records.length,366);
  for (const name of ['semantic_raw_lookup','semantic_raw_generation','semantic_raw_verifier','semantic_raw_artifact']) assert(f.manifest.runtime_files.some(e => e.path === 'scripts/lib/'+name+'.mjs'),name);
  assert.equal(capture.getRawCodeCapture().id,f.generation.id);
});
test('lifecycle authorizes before descriptor acquisition and pins owned descriptor/code copies', t => {
  assert.equal(typeof api.createRawGenerationLoader,'function');
  const hostile = new Proxy({}, {get(){throw Error('touched');},ownKeys(){throw Error('touched');}});
  const lazy = api.createRawGenerationLoader(hostile,hostile);
  assert.throws(() => lazy.load(null),/Access denied\./);
  const f = fixture(t), loader = api.createRawGenerationLoader(f.trusted,f.code);
  const first = loader.load(authorized); assert.equal(first.ok,true,first.code);
  f.trusted.data_root = '/does-not-exist'; f.code = {...f.code,worker_generation_id:'0'.repeat(64)};
  assert.equal(loader.load(authorized).handle,first.handle);
});
test('warm load reads each fixed file once, hashes owned buffers, and performs zero artifact JSON/CSV decoding', t => {
  assert.equal(typeof api.createRawGenerationLoader,'function'); const f = fixture(t), loader = api.createRawGenerationLoader(f.trusted,f.code);
  const originalOpen = fs.openSync, originalRead = fs.readSync, decode = TextDecoder.prototype.decode;
  let opens = [], reads = 0, decodes = 0;
  fs.openSync = (...a) => {opens.push(a[0]); return originalOpen(...a);};
  fs.readSync = (...a) => {reads++; return originalRead(...a);};
  TextDecoder.prototype.decode = function(...a) {decodes++; return decode.apply(this,a);};
  try {
    const first = loader.load(authorized); assert.equal(first.ok,true,first.code); assert.equal(opens.length,5); assert(decodes >= 5);
    t.diagnostic('first authorized load: opens='+opens.length+' reads='+reads+' decodes='+decodes);
    opens = []; reads = 0; decodes = 0;
    const warm = loader.load(authorized); assert.equal(warm.handle,first.handle); assert.equal(opens.length,5); assert.equal(new Set(opens).size,5); assert.equal(reads,10); assert.equal(decodes,0);
    t.diagnostic('warm authorized load: opens='+opens.length+' reads='+reads+' artifact decodes='+decodes);
    assert.deepEqual(opens.map(p => p.slice(f.trusted.data_root.length+1)),['manifest.json','index.json',...RAW_ARTIFACTS]);
    opens = []; assert.throws(() => loader.load(null),/Access denied\./); assert.equal(opens.length,0);
  } finally {fs.openSync = originalOpen; fs.readSync = originalRead; TextDecoder.prototype.decode = decode;}
});
for (const p of ['manifest.json','index.json',...RAW_ARTIFACTS]) test('changed fixed file invalidates until operator replacement: '+p, t => {
  assert.equal(typeof api.createRawGenerationLoader,'function'); const f = fixture(t), loader = api.createRawGenerationLoader(f.trusted,f.code);
  assert.equal(loader.load(authorized).ok,true);
  const file = f.trusted.data_root+'/'+p, bytes = fs.readFileSync(file); fs.appendFileSync(file,' ');
  const code = RAW_ARTIFACTS.includes(p) ? 'SOURCE_SNAPSHOT_CHANGED' : 'INDEX_CORRUPT';
  assert.deepEqual(loader.load(authorized),{ok:false,code}); fs.writeFileSync(file,bytes);
  assert.deepEqual(loader.load(authorized),{ok:false,code}); assert.equal(load(f).ok,true);
});
for (const [name,modify,code] of [
  ['missing manifest',f => fs.unlinkSync(f.trusted.manifest_path),'INDEX_UNAVAILABLE'],
  ['missing index',f => fs.unlinkSync(f.trusted.data_root+'/index.json'),'INDEX_UNAVAILABLE'],
  ['missing source',f => fs.unlinkSync(f.trusted.data_root+'/'+RAW_ARTIFACTS[0]),'SOURCE_SNAPSHOT_CHANGED'],
  ['changed source',f => fs.appendFileSync(f.trusted.data_root+'/'+RAW_ARTIFACTS[0],'!'),'SOURCE_SNAPSHOT_CHANGED'],
  ['manifest bound',f => fs.truncateSync(f.trusted.manifest_path,RAW_LIMITS.max_data_bytes+1),'DATA_BOUND_EXCEEDED'],
  ['index bound',f => fs.truncateSync(f.trusted.data_root+'/index.json',RAW_LIMITS.max_data_bytes+1),'DATA_BOUND_EXCEEDED'],
  ['source bound',f => fs.truncateSync(f.trusted.data_root+'/'+RAW_ARTIFACTS[0],RAW_LIMITS.max_data_bytes+1),'DATA_BOUND_EXCEEDED'],
  ['bad manifest hash',f => {f.trusted.manifest_sha256 = '0'.repeat(64);},'INDEX_CORRUPT'],
  ['bad index hash',f => fs.appendFileSync(f.trusted.data_root+'/index.json',' '),'INDEX_CORRUPT'],
  ['descriptor extra',f => {f.trusted.extra = true;},'DATA_CODE_MISMATCH'],
  ['descriptor path',f => {f.trusted.manifest_path += '/x';},'INDEX_CORRUPT'],
  ['descriptor traversal',f => {f.trusted.data_root += '/..'; f.trusted.manifest_path = f.trusted.data_root+'/manifest.json';},'INDEX_CORRUPT'],
  ['code extra',f => {f.code = {...f.code,extra:true};},'DATA_CODE_MISMATCH'],
  ['code generation',f => {f.code = {...f.code,worker_generation_id:'0'.repeat(64)};},'DATA_CODE_MISMATCH'],
  ['code environment',f => {f.code = {...f.code,environment:{...f.code.environment,icu_version:'0'}};},'DATA_CODE_MISMATCH'],
  ['manifest version',f => {f.manifest.manifest_version = 2; rewrite(f);},'INDEX_FORMAT_UNSUPPORTED'],
  ['index version',f => {f.index.format = 'future'; rewrite(f);},'INDEX_FORMAT_UNSUPPORTED'],
  ['compiler ABI',f => {f.manifest.compiler.abi = 'future'; rewrite(f);},'INDEX_FORMAT_UNSUPPORTED'],
  ['noncanonical manifest',f => {const b = Buffer.from(JSON.stringify(f.manifest,null,2)); fs.writeFileSync(f.trusted.manifest_path,b); f.trusted.manifest_sha256 = sha256(b);},'INDEX_CORRUPT'],
  ['rehashed noncanonical index',f => rewrite(f,{indexBytes:Buffer.from(JSON.stringify(f.index,null,2))}),'INDEX_CORRUPT'],
  ['duplicate key',f => {const b = Buffer.from('{"kind":"x",'+canonicalJson(f.manifest).slice(1)); fs.writeFileSync(f.trusted.manifest_path,b); f.trusted.manifest_sha256 = sha256(b);},'INDEX_CORRUPT'],
  ['rehashed omission',f => {f.index.postings.pop(); rewrite(f);},'INDEX_CORRUPT'],
  ['wrong description',f => {f.index.postings.find(p => p.candidate_kind === 'field' && p.search_value === 'Data utworzenia').search_value = 'False description'; rewrite(f);},'INDEX_CORRUPT'],
  ['wrong locator',f => {f.index.records[0].core.physical.byte_end--; rewrite(f);},'INDEX_CORRUPT'],
  ['wrong accounting',f => {f.index.accounting.owned--; rewrite(f);},'INDEX_CORRUPT'],
  ['trusted snapshot mismatch',f => {f.trusted.snapshot_id = '0'.repeat(64);},'DATA_CODE_MISMATCH'],
  ['nonregular index',f => {fs.unlinkSync(f.trusted.data_root+'/index.json'); fs.mkdirSync(f.trusted.data_root+'/index.json');},'INDEX_CORRUPT'],
  ['compiler overlap mismatch',f => {f.manifest.compiler.files.find(e => e.path === 'scripts/lib/semantic_raw_contract.mjs').sha256 = '0'.repeat(64); f.manifest.compiler.closure_sha256 = hashRaw('compiler-closure',{files:f.manifest.compiler.files,environment:f.manifest.compiler.environment,abi:f.manifest.compiler.abi,lexer:f.manifest.compiler.lexer}); f.index.compiler_closure_sha256 = f.manifest.compiler.closure_sha256; rewrite(f);},'DATA_CODE_MISMATCH'],
  ['runtime inventory replacement',f => {f.manifest.runtime_files[0].sha256 = '0'.repeat(64); f.manifest.runtime_code_sha256 = hashRaw('runtime-closure',{files:f.manifest.runtime_files,environment:f.manifest.environment}); f.index.runtime_code_sha256 = f.manifest.runtime_code_sha256; f.trusted.runtime_code_sha256 = f.manifest.runtime_code_sha256; f.code = {...f.code,runtime_code_sha256:f.manifest.runtime_code_sha256}; rewrite(f);},'DATA_CODE_MISMATCH'],
  ['unprovisioned rehashed manifest',f => {f.index.postings.pop(); rewrite(f,{trust:false});},'INDEX_CORRUPT'],
]) test('controlled stage failure: '+name, t => {
  assert.equal(typeof api.loadRawGeneration,'function'); const f = fixture(t); modify(f); assert.deepEqual(load(f),{ok:false,code});
});
for (const p of ['manifest.json','index.json',RAW_ARTIFACTS[0],'exports']) test('no symlink at any fixed path component: '+p, t => {
  assert.equal(typeof api.loadRawGeneration,'function'); const f = fixture(t), file = f.trusted.data_root+'/'+p;
  fs.renameSync(file,file+'-real'); fs.symlinkSync(file+'-real',file); assert.deepEqual(load(f),{ok:false,code:'INDEX_CORRUPT'});
});
test('inaccessible index is sanitized and does not try sources', t => {
  assert.equal(typeof api.loadRawGeneration,'function'); const f = fixture(t), original = fs.openSync; const opened = [];
  fs.openSync = (...args) => {opened.push(args[0]); if (args[0].endsWith('/index.json')) throw Object.assign(Error('SECRET'),{code:'EACCES'}); return original(...args);};
  try {assert.deepEqual(load(f),{ok:false,code:'INDEX_UNAVAILABLE'}); assert.equal(opened.length,2);} finally {fs.openSync = original;}
});
for (const stage of ['manifest','index']) for (const value of [null,false,0,'']) test('cold '+stage+' falsey JSON root '+canonicalJson(value)+' fails before downstream access', t => {
  const f = fixture(t), bytes = Buffer.from(canonicalJson(value));
  if (stage === 'manifest') {
    fs.writeFileSync(f.trusted.manifest_path,bytes); f.trusted.manifest_sha256 = sha256(bytes);
    fs.unlinkSync(f.trusted.data_root+'/index.json');
  } else {
    rewrite(f,{indexBytes:bytes}); fs.unlinkSync(f.trusted.data_root+'/'+RAW_ARTIFACTS[0]);
  }
  const originalOpen = fs.openSync, originalLstat = fs.lstatSync, opened = [], observed = [];
  fs.openSync = (...args) => {opened.push(args[0]); observed.push(args[0]); return originalOpen(...args);};
  fs.lstatSync = (...args) => {observed.push(args[0]); return originalLstat(...args);};
  try {
    const expected = {ok:false,code:'INDEX_CORRUPT'};
    assert.deepEqual(load(f),expected);
    const allowed = (stage === 'manifest' ? ['manifest.json'] : ['manifest.json','index.json']).map(p => f.trusted.data_root+'/'+p);
    assert.deepEqual(opened,allowed);
    assert.deepEqual([...new Set(observed.filter(p => p.startsWith(f.trusted.data_root+'/')))],allowed);
    const loader = api.createRawGenerationLoader(f.trusted,f.code);
    assert.deepEqual(loader.load(authorized),expected);
    observed.length = 0; opened.length = 0;
    assert.deepEqual(loader.load(authorized),expected); assert.deepEqual(observed,[]); assert.deepEqual(opened,[]);
  } finally {fs.openSync = originalOpen; fs.lstatSync = originalLstat;}
});
test('first failure precedence is descriptor then manifest then index then sources then payload then code/snapshot', t => {
  assert.equal(typeof api.loadRawGeneration,'function'); const f = fixture(t);
  fs.unlinkSync(f.trusted.data_root+'/'+RAW_ARTIFACTS[0]); fs.unlinkSync(f.trusted.data_root+'/index.json');
  f.trusted.manifest_sha256 = '0'.repeat(64); assert.deepEqual(load(f),{ok:false,code:'INDEX_CORRUPT'});
  f.code = {...f.code,worker_generation_id:'0'.repeat(64)}; assert.deepEqual(load(f),{ok:false,code:'DATA_CODE_MISMATCH'});
  f.code = base.code; f.trusted.manifest_sha256 = base.trusted.manifest_sha256; assert.deepEqual(load(f),{ok:false,code:'INDEX_UNAVAILABLE'});
  fs.writeFileSync(f.trusted.data_root+'/index.json',vectors['index.json']); assert.deepEqual(load(f),{ok:false,code:'SOURCE_SNAPSHOT_CHANGED'});
});
test('source failure precedes payload failure and payload failure precedes final environment binding', t => {
  assert.equal(typeof api.loadRawGeneration,'function'); const f = fixture(t);
  f.index.postings.pop(); rewrite(f); const file = f.trusted.data_root+'/'+RAW_ARTIFACTS[0], bytes = fs.readFileSync(file); fs.unlinkSync(file);
  f.code = {...f.code,environment:{...f.code.environment,icu_version:'0'}};
  assert.deepEqual(load(f),{ok:false,code:'SOURCE_SNAPSHOT_CHANGED'});
  fs.writeFileSync(file,bytes); assert.deepEqual(load(f),{ok:false,code:'INDEX_CORRUPT'});
});
