// Test-only fixtures: pure synthetic CSV construction and explicit production
// staging by an offline controller. Never imported by runtime modules.
import fs from 'node:fs';
import { RAW_ARTIFACTS, RAW_HEADERS, RAW_BASE_MANIFEST_SHA256, sha256, parseStrictJson } from './semantic_raw_contract.mjs';
import { rawEnvironment } from './semantic_raw_code.mjs';
import { captureCurrentRawCompiler, readProductionRawInputs, stageRawCompilation } from './semantic_raw_compile_controller.mjs';
import { installRawCompilerCapture, compileRawIndex } from './semantic_raw_index.mjs';

export function syntheticRawFixture(options = {}) {
  const [E,F,C] = RAW_ARTIFACTS;
  const rows = options.rows ?? {
    [E]: [{ id:'ROOT', name:'Root', ontologyId:'ONTO' }, ...(options.duplicateCanonicalOwner ? [{ id:'ROOT',ontologyId:'ONTO' }] : [])],
    [F]: [{ id:'FIELD',entityRefId:'ROOT',fieldName:'A_ID' }],
    [C]: [{ id:'CHUNK',sourceDocumentRefId:'ONTO',sectionOrder:'1',content:'A_ID' }],
  };
  const quote = s => /[",\r\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
  const inputs = RAW_ARTIFACTS.map(artifact => ({ artifact,bytes:Buffer.from(
    RAW_HEADERS[artifact].join(',')+'\n'+(rows[artifact] ?? []).map(row => RAW_HEADERS[artifact].map(k => quote(row[k] ?? '')).join(',')+'\n').join('')) }));
  const sources = inputs.map(({artifact,bytes}) => ({ artifact,bytes:bytes.length,sha256:sha256(bytes),record_count:(rows[artifact] ?? []).length })).sort((a,b) => a.artifact < b.artifact ? -1 : 1);
  return { inputs,sources,bindings:{ base_manifest_sha256:RAW_BASE_MANIFEST_SHA256,compiler_closure_sha256:'a'.repeat(64),runtime_code_sha256:'b'.repeat(64),worker_generation_id:'c'.repeat(64),environment:rawEnvironment() } };
}

// Trusted OFFLINE test controller. No miniature/synthetic admission switch and
// no inferred future code inventory. Caller owns a unique, nonexistent output.
export function stageProductionRawFixture({sourceRoot,outputRoot}) {
  const captured = captureCurrentRawCompiler();
  installRawCompilerCapture(captured);
  const inputs = readProductionRawInputs(sourceRoot);
  const code = Object.freeze({worker_generation_id:captured.generation.id,runtime_code_sha256:captured.code.runtime_code_sha256,environment:captured.code.environment});
  const result = compileRawIndex({compiler:captured.compiler,runtime_files:captured.code.runtime_files,...code,base_manifest_sha256:RAW_BASE_MANIFEST_SHA256,inputs});
  if (!result.ok) throw Object.assign(new Error(result.code),{code:result.code});
  stageRawCompilation(outputRoot,result,inputs);
  const manifest = parseStrictJson(result.manifest_bytes), index = parseStrictJson(result.index_bytes);
  const trusted = Object.freeze({abi:'owa-raw-data-generation/1',data_root:outputRoot,manifest_path:outputRoot+'/manifest.json',manifest_sha256:sha256(result.manifest_bytes),snapshot_id:result.snapshot_id,worker_generation_id:code.worker_generation_id,runtime_code_sha256:code.runtime_code_sha256});
  return {trusted,code,generation:captured.generation,manifest,index,cleanup:() => fs.rmSync(outputRoot,{recursive:true,force:true})};
}
