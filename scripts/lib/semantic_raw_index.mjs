import { canonicalJson, sha256, hashRaw, RAW_ARTIFACTS, RAW_SOURCE_SEALS, RAW_BASE_MANIFEST_SHA256, RAW_LEXER_SHA256, RAW_LIMITS, validateRawType, validSelector } from './semantic_raw_contract.mjs';
import { parseRawCsv } from './semantic_raw_csv.mjs';
import { analyzeSemanticLexicalContext } from './semantic_lexical_context.mjs';
import { rawEnvironment, measureRawClosure, installRawCodeCapture } from './semantic_raw_code.mjs';

const [E,F,C] = RAW_ARTIFACTS;
const cmp = (a,b) => a === b ? 0 : a === null ? -1 : b === null ? 1 : a < b ? -1 : 1;
function tuple(a,b) { for (let i=0;i<a.length;i++) { const c = cmp(a[i],b[i]); if (c) return c; } return 0; }
const physical = c => [c.artifact,c.physical.byte_start];
const diagnosticKey = d => [d.record_ref,d.code,d.key,d.start_utf16,d.end_utf16];
const fail = code => { throw Object.assign(new Error(code),{code}); };
const validId = s => validateRawType('Id',s);

// Internal source-derived representation. Variable counts are useful for pure
// adversarial tests; they never relax the production IndexPayload schema.
export function deriveRawIndex({sources,inputs,base_manifest_sha256,compiler_closure_sha256,runtime_code_sha256,worker_generation_id,environment}) {
  if (!Array.isArray(inputs) || inputs.length !== 3 || !Array.isArray(sources) || sources.length !== 3 || new Set(inputs.map(i => i.artifact)).size !== 3 || new Set(sources.map(s => s.artifact)).size !== 3) fail('SOURCE_FINGERPRINT_MISMATCH');
  const sourceList = sources.map(s => ({...s})).sort((a,b) => cmp(a.artifact,b.artifact));
  const records = [];
  for (const artifact of [...RAW_ARTIFACTS].sort()) {
    const source = sourceList.find(s => s.artifact === artifact), input = inputs.find(i => i.artifact === artifact);
    if (!validateRawType('Source',source) || !(input?.bytes instanceof Uint8Array) || source.bytes !== input.bytes.length || source.sha256 !== sha256(input.bytes)) fail('SOURCE_FINGERPRINT_MISMATCH');
    const parsed = parseRawCsv(artifact,input.bytes);
    if (parsed.records.length !== source.record_count) fail('SOURCE_FINGERPRINT_MISMATCH');
    for (const {fields,physical,raw_record_sha256} of parsed.records) {
      const encoded = canonicalJson(fields);
      const record_hash = hashRaw('record',{artifact,source_sha256:source.sha256,physical,fields});
      const record_ref = hashRaw('record-ref',{artifact,source_sha256:source.sha256,physical,record_hash,raw_record_sha256});
      const via = artifact === E ? 'self' : artifact === F ? 'entityRefId' : 'sourceDocumentRefId';
      records.push({core:{record_ref,kind:artifact === E ? 'entity_metadata' : artifact === F ? 'field_metadata' : 'source_chunk',record_id:fields.id,artifact,physical,raw_record_sha256,record_hash,fields_sha256:sha256(Buffer.from(encoded)),fields_utf16:encoded.length,fields,integrity:'exact_export_record',semantic_completeness:'not_assessed'},disposition:'quarantined_unresolved',entity_ref:null,ownership:{via,literal_ref:fields[artifact === E ? 'id' : via]},diagnostic_ids:[]});
    }
  }
  const roots = records.filter(r => r.core.artifact === E), canonical = new Map(), lookup = new Map();
  const add = (map,key,value) => { if (!map.has(key)) map.set(key,[]); map.get(key).push(value); };
  for (const r of roots) {
    if (validId(r.core.record_id)) add(canonical,r.core.record_id,r);
    for (const value of new Set([r.core.fields.id,r.core.fields.ontologyId])) if (validId(value)) add(lookup,value,r);
  }
  for (const r of roots) {
    r.disposition = !validId(r.core.record_id) ? 'quarantined_unresolved' : canonical.get(r.core.record_id).length > 1 ? 'quarantined_ambiguous' : 'owned';
    if (r.disposition === 'owned') r.entity_ref = {namespace:'OWAOntology',id:r.core.record_id};
  }
  for (const r of records.filter(r => r.core.artifact !== E)) {
    const targets = lookup.get(r.ownership.literal_ref) ?? [];
    r.disposition = targets.length === 0 ? 'quarantined_unresolved' : targets.length > 1 ? 'quarantined_ambiguous' : targets[0].disposition;
    if (r.disposition === 'owned') r.entity_ref = {...targets[0].entity_ref};
  }
  const diagnosticsMap = new Map(), postingsMap = new Map();
  function diagnose(r,code,key = null,start_utf16 = null,end_utf16 = null) {
    const value = {record_ref:r.core.record_ref,code,key,start_utf16,end_utf16};
    const diagnostic_id = hashRaw('diagnostic',value);
    diagnosticsMap.set(diagnostic_id,{diagnostic_id,...value});
  }
  function post(r,candidate_kind,name,search_value,origin) {
    if (r.disposition !== 'owned' || !search_value) return;
    const p = {candidate_kind,entity_ref:{...r.entity_ref},name,search_value,origin};
    postingsMap.set(canonicalJson(p),p);
  }
  function metadata(r,kind,name,key,values) {
    const origin = {record_ref:r.core.record_ref,kind,metadata_key:key,body_field:null,start_utf16:null,end_utf16:null,token:null};
    for (const value of values) post(r,kind === 'metadata_entity' ? 'entity' : 'field',name,value,origin);
  }
  const ids = new Map();
  for (const r of records) if (r.core.record_id) add(ids,canonicalJson([r.core.artifact,r.core.record_id]),r);
  for (const r of records) {
    const f = r.core.fields, artifact = r.core.artifact;
    diagnose(r,r.disposition === 'owned' ? 'owned_record' : r.disposition === 'quarantined_ambiguous' ? 'ambiguous_owner_ref' : 'unresolved_owner_ref',r.disposition === 'owned' ? null : artifact === E ? 'id' : r.ownership.via);
    diagnose(r,'semantic_not_assessed');
    if (f.id && ids.get(canonicalJson([artifact,f.id])).length > 1) diagnose(r,'duplicate_record_id','id');
    if (artifact === E) {
      for (const key of ['id','ontologyId']) if ((key === 'id' || f[key]) && !validId(f[key])) diagnose(r,'invalid_owner_id',key);
      metadata(r,'metadata_entity',f.id,'id',[f.id,f.name,f.canonicalName,f.ontologyId,...f.aliases.split(';').map(x => x.trim()).filter(Boolean),f.description]);
    } else if (artifact === F) {
      let key = 'fieldName';
      if (!validSelector(f.fieldName)) {
        if (f.fieldName) diagnose(r,'invalid_field_name','fieldName');
        key = 'mssqlColumn';
        if (!validSelector(f.mssqlColumn)) diagnose(r,'invalid_field_name','mssqlColumn');
      }
      if (validSelector(f[key])) metadata(r,'metadata_field',f[key],key,[f[key],f.name,f.description]);
    } else if (!/^[0-9]+$/.test(f.sectionOrder) || !Number.isSafeInteger(Number(f.sectionOrder))) diagnose(r,'invalid_section_order','sectionOrder');
    for (const key of artifact === C ? ['content'] : ['description','summary']) {
      const cell = f[key];
      if (/(?:^|[\r\n]) {0,3}~{3,}/.test(cell)) { diagnose(r,'unsupported_fence',key,0,cell.length); continue; }
      const context = analyzeSemanticLexicalContext(cell,{mode:'source'});
      for (const d of context.diagnostics) diagnose(r,d.reason === 'invalidIdentifier' ? 'malformed_identifier' : 'unclosed_atom',key,d.start,d.end);
      for (const t of context.tokens) if (t.role === 'technicalIdentifier' && t.closed === true && t.kind === 'reference' && t.value !== null && validSelector(t.value) && /^[\p{L}_][\p{L}\p{N}_-]*(?:[.:][\p{L}\p{N}_-]+)*$/u.test(t.value)) {
        post(r,'identifier_mention',t.value,t.value,{record_ref:r.core.record_ref,kind:'identifier_mention',metadata_key:null,body_field:key,start_utf16:t.start,end_utf16:t.end,token:t.value});
      }
    }
  }
  const byRef = new Map(records.map(r => [r.core.record_ref,r.core]));
  const originKey = o => [...physical(byRef.get(o.record_ref)),o.body_field,o.start_utf16,o.end_utf16,o.kind];
  const postingKey = p => [p.candidate_kind,p.entity_ref.id,p.name,p.search_value,...originKey(p.origin)];
  const postings = [...postingsMap.values()].sort((a,b) => tuple(postingKey(a),postingKey(b)));
  const posted = new Set(postings.map(p => p.origin.record_ref));
  for (const r of records) if (!posted.has(r.core.record_ref)) diagnose(r,'no_hint_postings');
  const diagnostics = [...diagnosticsMap.values()].sort((a,b) => tuple(diagnosticKey(a),diagnosticKey(b)));
  const perRecordDiagnostics = new Map();
  for (const d of diagnostics) add(perRecordDiagnostics,d.record_ref,d.diagnostic_id);
  for (const r of records) r.diagnostic_ids = perRecordDiagnostics.get(r.core.record_ref);
  const owners = roots.filter(r => r.disposition === 'owned').sort((a,b) => cmp(a.entity_ref.id,b.entity_ref.id)).map(r => ({entity_ref:{...r.entity_ref},entity_record_ref:r.core.record_ref,record_refs:records.filter(s => s.disposition === 'owned' && s.entity_ref.id === r.entity_ref.id).map(s => s.core.record_ref)}));
  const owner_lookup = [...lookup].sort(([a],[b]) => cmp(a,b)).map(([literal_ref,rs]) => ({literal_ref,entity_record_refs:rs.map(r => r.core.record_ref)}));
  const artifacts = sourceList.map(({artifact}) => {
    const rs = records.filter(r => r.core.artifact === artifact);
    return {artifact,total:rs.length,owned:rs.filter(r => r.disposition === 'owned').length,quarantined_ambiguous:rs.filter(r => r.disposition === 'quarantined_ambiguous').length,quarantined_unresolved:rs.filter(r => r.disposition === 'quarantined_unresolved').length,diagnostic_count:diagnostics.filter(d => byRef.get(d.record_ref).artifact === artifact).length};
  });
  const accounting = {artifacts,...Object.fromEntries(['total','owned','quarantined_ambiguous','quarantined_unresolved','diagnostic_count'].map(k => [k,artifacts.reduce((n,a) => n+a[k],0)]))};
  return {format:'owa-record-index/1',contract_version:'0.1',canonicalization:'cjson-utf16-v1',base_manifest_sha256,compiler_closure_sha256,runtime_code_sha256,worker_generation_id,environment:{...environment},sources:sourceList,records,owners,owner_lookup,postings,diagnostics,accounting};
}

let compilerCapture;
// Trusted offline controller only, analogous to installRawCodeCapture. The CLI
// captures and pins executable bytes before importing this compiler. This is
// not an extra CompileInput field or an MCP capability.
export function installRawCompilerCapture({compiler_sources,generation,compiler}) {
  const measured = measureRawClosure(compiler_sources,rawEnvironment(),'compiler');
  for (const path of ['scripts/compile_semantic_raw_index.mjs','scripts/lib/semantic_raw_compile_controller.mjs','scripts/lib/semantic_raw_index.mjs','scripts/lib/semantic_raw_contract.mjs','scripts/lib/semantic_raw_csv.mjs','scripts/lib/semantic_raw_code.mjs','scripts/lib/semantic_lexical_context.mjs']) if (!Object.hasOwn(compiler_sources,path)) fail('CODE_CLOSURE_INVALID');
  if (sha256(Buffer.from(compiler_sources['scripts/lib/semantic_lexical_context.mjs'])) !== RAW_LEXER_SHA256 || !validateRawType('Compiler',compiler) || compiler.closure_sha256 !== measured.sha256 || canonicalJson(compiler.files) !== canonicalJson(measured.files)) fail('CODE_CLOSURE_INVALID');
  const code = installRawCodeCapture(generation);
  for (const file of measured.files) {
    const runtime = code.runtime_files.find(f => f.path === file.path);
    if (runtime && (runtime.sha256 !== file.sha256 || runtime.bytes !== file.bytes)) fail('CODE_CLOSURE_INVALID');
  }
  const captured = canonicalJson({compiler,code});
  if (compilerCapture && compilerCapture.identity !== captured) fail('CODE_CLOSURE_INVALID');
  // Store only owned canonical descriptors. Sources are already owned by the
  // code capture; no ambient filesystem read occurs in either pure operation.
  compilerCapture = {identity:captured,compiler:JSON.parse(canonicalJson(compiler)),code};
}

function closed(value,keys) {
  return value && typeof value === 'object' && !Array.isArray(value) && Reflect.ownKeys(value).length === keys.length && keys.every(k => { const d = Object.getOwnPropertyDescriptor(value,k); return d?.enumerable && Object.hasOwn(d,'value'); });
}
export function compileRawIndex(input) {
  const error = code => ({ok:false,code});
  try {
    if (!closed(input,['compiler','runtime_files','runtime_code_sha256','worker_generation_id','environment','base_manifest_sha256','inputs'])) return error('INDEX_CONTRACT_INVALID');
    if (!validateRawType('Environment',input.environment) || canonicalJson(input.environment) !== canonicalJson(rawEnvironment()) || !input.compiler || canonicalJson(input.compiler.environment) !== canonicalJson(rawEnvironment())) return error('ENVIRONMENT_MISMATCH');
    if (!compilerCapture || !validateRawType('Compiler',input.compiler) || canonicalJson(input.compiler) !== canonicalJson(compilerCapture.compiler) || canonicalJson(input.runtime_files) !== canonicalJson(compilerCapture.code.runtime_files) || input.runtime_code_sha256 !== compilerCapture.code.runtime_code_sha256 || input.worker_generation_id !== compilerCapture.code.id) return error('CODE_CLOSURE_INVALID');
    if (input.base_manifest_sha256 !== RAW_BASE_MANIFEST_SHA256 || !Array.isArray(input.inputs) || input.inputs.length !== 3 || new Set(input.inputs.map(i => i?.artifact)).size !== 3) return error('SOURCE_FINGERPRINT_MISMATCH');
    const inputs = [];
    for (const item of input.inputs) {
      if (!closed(item,['artifact','bytes']) || !(item.bytes instanceof Uint8Array)) return error('INDEX_CONTRACT_INVALID');
      const seal = RAW_SOURCE_SEALS.find(s => s.artifact === item.artifact);
      if (!seal || item.bytes.length !== seal.bytes || sha256(item.bytes) !== seal.sha256) return error('SOURCE_FINGERPRINT_MISMATCH');
      inputs.push({artifact:item.artifact,bytes:Buffer.from(item.bytes)});
    }
    if (!validateRawType('CompileInput',input)) return error('INDEX_CONTRACT_INVALID');
    let index;
    try { index = deriveRawIndex({...input,compiler_closure_sha256:input.compiler.closure_sha256,sources:RAW_SOURCE_SEALS,inputs}); }
    catch (e) { return error(['CSV_INVALID','SOURCE_FINGERPRINT_MISMATCH'].includes(e.code) ? e.code : 'OWNERSHIP_ACCOUNTING_INVALID'); }
    const index_bytes = Buffer.from(canonicalJson(index));
    if (index_bytes.length + RAW_SOURCE_SEALS.reduce((n,s) => n+s.bytes,0) > RAW_LIMITS.max_data_bytes) return error('DATA_BOUND_EXCEEDED');
    if (!validateRawType('IndexPayload',index)) return error('INDEX_CONTRACT_INVALID');
    const index_sha256 = sha256(index_bytes);
    const snapshot_id = hashRaw('snapshot',{format:index.format,contract_version:index.contract_version,canonicalization:index.canonicalization,base_manifest_sha256:index.base_manifest_sha256,compiler_closure_sha256:index.compiler_closure_sha256,runtime_code_sha256:index.runtime_code_sha256,worker_generation_id:index.worker_generation_id,environment:index.environment,sources:index.sources,index_sha256});
    const manifest = {kind:'owa-raw-record-poc',manifest_version:1,contract_version:'0.1',canonicalization:'cjson-utf16-v1',base_manifest_sha256:input.base_manifest_sha256,compiler:input.compiler,runtime_files:input.runtime_files,runtime_code_sha256:input.runtime_code_sha256,worker_generation_id:input.worker_generation_id,environment:input.environment,sources:index.sources,index:{path:'index.json',bytes:index_bytes.length,sha256:index_sha256,format:index.format},snapshot_id,data_bytes:index.sources.reduce((n,s) => n+s.bytes,0)+index_bytes.length,accounting:index.accounting};
    const manifest_bytes = Buffer.from(canonicalJson(manifest));
    if (manifest.data_bytes+manifest_bytes.length > RAW_LIMITS.max_data_bytes) return error('DATA_BOUND_EXCEEDED');
    if (!validateRawType('DataManifest',manifest,{index})) return error('INDEX_CONTRACT_INVALID');
    return {ok:true,index_bytes,manifest_bytes,snapshot_id};
  } catch { return error('INDEX_CONTRACT_INVALID'); }
}
