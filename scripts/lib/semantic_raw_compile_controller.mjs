// Offline controller IO only. Neither runtime lookup nor index derivation
// imports this module. Explicit files, no corpus/config/provider discovery.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RAW_ARTIFACTS, RAW_LIMITS, RAW_SOURCE_SEALS, sha256, isSafeRawPath, validateRawType } from './semantic_raw_contract.mjs';
import { measureRawClosure, rawEnvironment, installRawCodeCapture } from './semantic_raw_code.mjs';

export const RAW_SOURCE_ROOT = '/tmp/opencode/semantic42-frozen-EsJ4gr';
export const RAW_COMPILER_FILES = Object.freeze([
  'scripts/compile_semantic_raw_index.mjs',
  ...['semantic_raw_compile_controller','semantic_raw_index','semantic_raw_contract','semantic_raw_csv','semantic_raw_code','semantic_lexical_context'].map(n => 'scripts/lib/'+n+'.mjs'),
]);
// Explicit CURRENT capture. Task5 must update central inventories and rebuild;
// this list never claims to contain modules that do not yet exist.
export const CURRENT_RAW_RUNTIME_FILES = Object.freeze([
  'scripts/erp_knowledge_answer.mjs','scripts/erp_knowledge_assistant.mjs',
  ...['erp_knowledge_mcp_core','erp_knowledge_mcp_profiles','knowledge_retrieval',
    'owa_query_context','owa_evidence','owa_answer_presentation','local_source_provenance','learning',
    'semantic_request_intent','semantic_catalog','semantic_requirements','semantic_evidence',
    'external_search','external_search_policy','knowledge_inbox','promoted_knowledge',
    'content_cleaner','provider_secrets','transient_retry','dashboard_automation',
    'dashboard_audit','feedback_learning','atomic_file','semantic_worker_entry'].map(n => 'scripts/lib/'+n+'.mjs'),
  'scripts/erp_knowledge_mcp_http_bridge.mjs',
  ...['mcp_registry','semantic_worker_pool','semantic_worker_generation','semantic_raw_contract','semantic_raw_csv','semantic_raw_code','semantic_raw_index','semantic_lexical_context',
    'semantic_raw_lookup','semantic_raw_artifact','semantic_raw_generation','semantic_raw_verifier',
    'semantic_raw_mcp','semantic_raw_worker','semantic_raw_http','semantic_raw_deployment','entity_guide_text_proxy'].map(n => 'scripts/lib/'+n+'.mjs'),
]);
const fail = code => { throw Object.assign(new Error(code),{code}); };
function components(absolute) {
  if (typeof absolute !== 'string' || !absolute.startsWith('/') || !isSafeRawPath(absolute.slice(1))) fail('INDEX_CONTRACT_INVALID');
  let current = '';
  for (const part of absolute.slice(1).split('/')) {
    current += '/'+part;
    const s = fs.lstatSync(current);
    if (s.isSymbolicLink() || (current !== absolute && !s.isDirectory())) fail('INDEX_CONTRACT_INVALID');
  }
}
function readFixed(absolute,max) {
  components(absolute);
  const fd = fs.openSync(absolute,fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const s = fs.fstatSync(fd);
    if (!s.isFile() || s.size < 1 || s.size > max) fail('DATA_BOUND_EXCEEDED');
    const bytes = Buffer.alloc(s.size+1);
    let used = 0, n;
    while (used < bytes.length && (n = fs.readSync(fd,bytes,used,bytes.length-used,null)) > 0) used += n;
    if (used !== s.size) fail('INDEX_CONTRACT_INVALID');
    return bytes.subarray(0,used);
  } finally { fs.closeSync(fd); }
}
export function captureCurrentRawCompiler(rootUrl = new URL('../../',import.meta.url)) {
  const environment = rawEnvironment(), compiler_sources = {}, sources = {};
  let codeBytes = 0;
  const cache = new Map();
  const read = file => {
    if (!cache.has(file)) cache.set(file,readFixed(fileURLToPath(new URL(file,rootUrl)),RAW_LIMITS.max_code_bytes));
    return cache.get(file);
  };
  for (const file of RAW_COMPILER_FILES) {
    try { compiler_sources[file] = new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(read(file)); }
    catch { fail('CODE_CLOSURE_INVALID'); }
  }
  const measured = measureRawClosure(compiler_sources,environment,'compiler');
  const compiler = {abi:'owa-raw-compiler/1',lexer:'source-lexer-esj4gr-v1',files:measured.files,closure_sha256:measured.sha256,environment};
  for (const file of CURRENT_RAW_RUNTIME_FILES) {
    const bytes = read(file); codeBytes += bytes.length;
    if (codeBytes > RAW_LIMITS.max_code_bytes) fail('CODE_CLOSURE_INVALID');
    try { sources[new URL(file,rootUrl).href] = new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes); }
    catch { fail('CODE_CLOSURE_INVALID'); }
  }
  const generation = {id:sha256(Buffer.from(JSON.stringify(sources))),sources:Object.freeze(sources),coreUrl:new URL('scripts/lib/erp_knowledge_mcp_core.mjs',rootUrl).href,profilesUrl:new URL('scripts/lib/erp_knowledge_mcp_profiles.mjs',rootUrl).href,workerUrl:new URL('scripts/lib/semantic_worker_entry.mjs',rootUrl).href};
  const code = installRawCodeCapture(generation);
  return {compiler,compiler_sources:Object.freeze(compiler_sources),generation:Object.freeze(generation),code};
}
export function readProductionRawInputs(sourceRoot) {
  if (sourceRoot !== RAW_SOURCE_ROOT) fail('SOURCE_FINGERPRINT_MISMATCH');
  return RAW_ARTIFACTS.map(artifact => {
    const seal = RAW_SOURCE_SEALS.find(s => s.artifact === artifact);
    const bytes = readFixed(sourceRoot+'/'+artifact,seal.bytes);
    if (bytes.length !== seal.bytes || sha256(bytes) !== seal.sha256) fail('SOURCE_FINGERPRINT_MISMATCH');
    return {artifact,bytes};
  });
}
export function stageRawCompilation(output,result,inputs) {
  if (!result.ok || typeof output !== 'string' || !output.startsWith('/tmp/opencode/') || !isSafeRawPath(output.slice(1)) || output === RAW_SOURCE_ROOT || output.startsWith(RAW_SOURCE_ROOT+'/')) fail('INDEX_CONTRACT_INVALID');
  if (!Array.isArray(inputs) || inputs.length !== 3 || new Set(inputs.map(i => i.artifact)).size !== 3 || inputs.some(i => {
    const seal = RAW_SOURCE_SEALS.find(s => s.artifact === i.artifact);
    return !seal || !(i.bytes instanceof Uint8Array) || i.bytes.length !== seal.bytes || sha256(i.bytes) !== seal.sha256;
  })) fail('SOURCE_FINGERPRINT_MISMATCH');
  if (!(result.index_bytes instanceof Uint8Array) || !(result.manifest_bytes instanceof Uint8Array)) fail('INDEX_CONTRACT_INVALID');
  if (inputs.reduce((n,i) => n+i.bytes.length,0)+result.index_bytes.length+result.manifest_bytes.length > RAW_LIMITS.max_data_bytes) fail('DATA_BOUND_EXCEEDED');
  if (!validateRawType('CompileResult',result)) fail('INDEX_CONTRACT_INVALID');
  const workspace = fileURLToPath(new URL('../../',import.meta.url)).replace(/\/$/,'');
  if (output === workspace || output.startsWith(workspace+'/') && !output.startsWith(workspace+'/.superpowers/sdd/')) fail('INDEX_CONTRACT_INVALID');
  components(path.dirname(output));
  let created = false;
  try {
    fs.mkdirSync(output,{mode:0o700}); created = true;
    fs.mkdirSync(output+'/exports',{mode:0o700});
    fs.mkdirSync(output+'/exports/owa_ontology',{mode:0o700});
    fs.mkdirSync(output+'/exports/owa_ontology/v1',{mode:0o700});
    for (const {artifact,bytes} of inputs) fs.writeFileSync(output+'/'+artifact,bytes,{flag:'wx',mode:0o600});
    fs.writeFileSync(output+'/index.json',result.index_bytes,{flag:'wx',mode:0o600});
    fs.writeFileSync(output+'/manifest.json',result.manifest_bytes,{flag:'wx',mode:0o600});
  } catch {
    if (created) fs.rmSync(output,{recursive:true,force:true});
    fail('INDEX_CONTRACT_INVALID');
  }
}
