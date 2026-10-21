// Shared bounded artifact IO and PURE source verification, never the offline
// compiler controller/CLI. The verifier executes these stages independently;
// warm worker loads use only the byte-capture half, without parsing/derivation.
import fs from 'node:fs';
import { RAW_ARTIFACTS, RAW_SOURCE_SEALS, RAW_BASE_MANIFEST_SHA256, RAW_LEXER_SHA256, RAW_LIMITS,
  canonicalJson, parseStrictJson, sha256, hashRaw, isSafeRawPath, validateRawType } from './semantic_raw_contract.mjs';
import { getRawCodeCapture, rawEnvironment } from './semantic_raw_code.mjs';
import { deriveRawIndex } from './semantic_raw_index.mjs';

const fail = code => {throw Object.assign(new Error(code),{code});};
const same = (a,b) => canonicalJson(a) === canonicalJson(b);
export function authorizeRawScope(authorized) {
  if (!validateRawType('AuthorizedScope',authorized)) throw Object.assign(new Error('Access denied.'),{code:-32001});
}
export function pinRawDataDescriptor(trusted,code,authorized) {
  authorizeRawScope(authorized);
  let t,c;
  try { t = parseStrictJson(canonicalJson(trusted)); c = parseStrictJson(canonicalJson(code)); }
  catch {fail('DATA_CODE_MISMATCH');}
  if (!t || typeof t !== 'object' || Array.isArray(t) || typeof t.data_root !== 'string' || typeof t.manifest_path !== 'string') fail('DATA_CODE_MISMATCH');
  if (!t.data_root.startsWith('/') || !isSafeRawPath(t.data_root.slice(1)) || t.manifest_path !== t.data_root+'/manifest.json') fail('INDEX_CORRUPT');
  if (!validateRawType('TrustedDataGeneration',t) || !validateRawType('CodeBinding',c) || ['worker_generation_id','runtime_code_sha256'].some(k => t[k] !== c[k])) fail('DATA_CODE_MISMATCH');
  return {trusted:Object.freeze(t),code:Object.freeze({...c,environment:Object.freeze(c.environment)})};
}
function readFixed(absolute,max,missing) {
  let fd;
  try {
    let current = '', last;
    for (const part of absolute.slice(1).split('/')) {
      current += '/'+part; last = fs.lstatSync(current);
      if (last.isSymbolicLink() || (current === absolute ? !last.isFile() : !last.isDirectory())) fail('INDEX_CORRUPT');
    }
    if (last.size > max) fail('DATA_BOUND_EXCEEDED');
    fd = fs.openSync(absolute,fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    const before = fs.fstatSync(fd);
    if (!before.isFile() || before.dev !== last.dev || before.ino !== last.ino) fail('INDEX_CORRUPT');
    if (before.size > max) fail('DATA_BOUND_EXCEEDED');
    const owned = Buffer.alloc(before.size+1); let used = 0,n;
    while (used < owned.length && (n = fs.readSync(fd,owned,used,owned.length-used,null)) > 0) used += n;
    const after = fs.fstatSync(fd);
    if (used > max) fail('DATA_BOUND_EXCEEDED');
    if (used !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs) fail(missing === 'SOURCE_SNAPSHOT_CHANGED' ? missing : 'INDEX_CORRUPT');
    return owned.subarray(0,used);
  } catch(e) {
    if (validateRawType('LoadError',e.code)) throw e;
    if (e.code === 'ELOOP') fail('INDEX_CORRUPT');
    fail(missing);
  } finally {if (fd !== undefined) fs.closeSync(fd);}
}
function canonical(bytes) {
  try {const value = parseStrictJson(bytes); if (!Buffer.from(canonicalJson(value)).equals(bytes)) fail('INDEX_CORRUPT'); return value;}
  catch {fail('INDEX_CORRUPT');}
}
function versions(value,expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('INDEX_CORRUPT');
  for (const [key,wanted] of Object.entries(expected)) {
    if (typeof value[key] !== typeof wanted) fail('INDEX_CORRUPT');
    if (value[key] !== wanted) fail('INDEX_FORMAT_UNSUPPORTED');
  }
}
// This function owns each of the five byte buffers exactly once per job.
// No path or filename from manifest/index/raw cells ever chooses an open.
export function captureRawArtifact(trusted,code,authorized,previous = null) {
  const pinned = pinRawDataDescriptor(trusted,code,authorized), t = pinned.trusted;
  let used = 0; const fingerprints = [];
  function read(relative,missing) {
    const bytes = readFixed(t.data_root+'/'+relative,RAW_LIMITS.max_data_bytes-used,missing); used += bytes.length;
    const f = {path:relative,bytes:bytes.length,sha256:sha256(bytes)}; fingerprints.push(f);
    const expected = previous?.find(e => e.path === relative);
    if (expected && !same(f,expected)) fail(missing === 'SOURCE_SNAPSHOT_CHANGED' ? missing : 'INDEX_CORRUPT');
    return bytes;
  }
  const manifestBytes = read('manifest.json','INDEX_UNAVAILABLE');
  if (sha256(manifestBytes) !== t.manifest_sha256) fail('INDEX_CORRUPT');
  // Warm paths never decode JSON, CSV or rebuild lookup tables. The previous
  // fingerprints are private lifecycle state from full first-load validation.
  const cold = previous === null;
  const manifest = cold ? canonical(manifestBytes) : null;
  if (cold) {
    versions(manifest,{kind:'owa-raw-record-poc',manifest_version:1,contract_version:'0.1',canonicalization:'cjson-utf16-v1'});
    versions(manifest.compiler,{abi:'owa-raw-compiler/1',lexer:'source-lexer-esj4gr-v1'});
    versions(manifest.index,{format:'owa-record-index/1'});
    if (manifest.index.path !== 'index.json' || !Number.isSafeInteger(manifest.index.bytes) || manifest.index.bytes < 1 || !validateRawType('Hex',manifest.index.sha256)) fail('INDEX_CORRUPT');
  }
  const indexBytes = read('index.json','INDEX_UNAVAILABLE');
  if (cold && (indexBytes.length !== manifest.index.bytes || sha256(indexBytes) !== manifest.index.sha256)) fail('INDEX_CORRUPT');
  const index = cold ? canonical(indexBytes) : null;
  if (cold) versions(index,{format:'owa-record-index/1',contract_version:'0.1',canonicalization:'cjson-utf16-v1'});
  const sourceBytes = RAW_ARTIFACTS.map(artifact => {
    const bytes = read(artifact,'SOURCE_SNAPSHOT_CHANGED'), seal = RAW_SOURCE_SEALS.find(s => s.artifact === artifact);
    if (bytes.length !== seal.bytes || sha256(bytes) !== seal.sha256) fail('SOURCE_SNAPSHOT_CHANGED');
    return {artifact,bytes};
  });
  return {...pinned,manifest,index,sourceBytes,fingerprints};
}
// Pure reconstruction from the three owned source vectors. In particular, a
// rehashed index with omitted/altered postings is NOT accepted as self-attested.
export function validateRawArtifactCapture(captured) {
  const {trusted:t,code,manifest:m,index,sourceBytes} = captured;
  if (!validateRawType('IndexPayload',index)) fail('INDEX_CORRUPT');
  let expected;
  try {expected = deriveRawIndex({sources:index.sources,inputs:sourceBytes,base_manifest_sha256:index.base_manifest_sha256,compiler_closure_sha256:index.compiler_closure_sha256,runtime_code_sha256:index.runtime_code_sha256,worker_generation_id:index.worker_generation_id,environment:index.environment});}
  catch {fail('INDEX_CORRUPT');}
  if (!same(expected,index)) fail('INDEX_CORRUPT');
  // All data-side/schema/accounting invariants precede final code consistency.
  if (!same(m.sources,index.sources) || !same(m.accounting,index.accounting) || m.base_manifest_sha256 !== RAW_BASE_MANIFEST_SHA256 || m.data_bytes !== m.sources.reduce((n,s) => n+s.bytes,0)+m.index.bytes) fail('INDEX_CORRUPT');
  const capture = getRawCodeCapture();
  if (!capture || capture.id !== code.worker_generation_id || capture.runtime_code_sha256 !== code.runtime_code_sha256 || !same(code.environment,rawEnvironment()) || !same(code.environment,capture.environment)) fail('DATA_CODE_MISMATCH');
  if (['worker_generation_id','runtime_code_sha256','environment'].some(k => !same(m[k],code[k]) || !same(index[k],code[k])) || !same(m.runtime_files,capture.runtime_files) || !same(m.compiler.environment,code.environment) || m.compiler.closure_sha256 !== index.compiler_closure_sha256) fail('DATA_CODE_MISMATCH');
  if (!validateRawType('Compiler',m.compiler) || m.runtime_files.reduce((n,f) => n+f.bytes,0) > RAW_LIMITS.max_code_bytes || m.compiler.files.reduce((n,f) => n+f.bytes,0) > RAW_LIMITS.max_code_bytes) fail('DATA_CODE_MISMATCH');
  if (!m.compiler.files.some(f => f.path === 'scripts/compile_semantic_raw_index.mjs') || !m.compiler.files.some(f => f.path === 'scripts/lib/semantic_lexical_context.mjs' && f.sha256 === RAW_LEXER_SHA256)) fail('DATA_CODE_MISMATCH');
  for (const f of m.compiler.files) {const runtime = capture.runtime_files.find(r => r.path === f.path); if (runtime && !same(f,runtime)) fail('DATA_CODE_MISMATCH');}
  const snapshot = hashRaw('snapshot',{format:index.format,contract_version:index.contract_version,canonicalization:index.canonicalization,base_manifest_sha256:index.base_manifest_sha256,compiler_closure_sha256:index.compiler_closure_sha256,runtime_code_sha256:index.runtime_code_sha256,worker_generation_id:index.worker_generation_id,environment:index.environment,sources:index.sources,index_sha256:m.index.sha256});
  if (m.snapshot_id !== snapshot || t.snapshot_id !== snapshot) fail('DATA_CODE_MISMATCH');
  if (!validateRawType('DataManifest',m,{index})) fail('INDEX_CORRUPT');
  return captured;
}
