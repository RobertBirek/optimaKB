import { createHash } from 'node:crypto';

// v2 §§3–8/10, amended only by v3 §§2–4. No data IO or future-module imports.
export const RAW_LIMITS = Object.freeze({ max_records:8, max_fields_utf16:16000,
  max_entity_refs:2, max_data_bytes:8388608, max_code_bytes:2097152 });
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const hashRaw = (tag,value) => sha256(Buffer.from('owa-raw/0.1/' + tag + '\n' + canonicalJson(value),'utf8'));

export const RAW_ARTIFACTS = Object.freeze([
  'exports/owa_ontology/v1/ontology_entity.csv',
  'exports/owa_ontology/v1/ontology_field.csv',
  'exports/owa_ontology/v1/chunk.csv',
]);
export const RAW_HEADERS = freeze(Object.fromEntries(RAW_ARTIFACTS.map((a, i) => [a, [
  'id,name,description,semanticType,canonicalName,ontologyId,verificationStatus,confidenceLevel,businessDomain,mainTable,mcpReadTools,mcpWriteTools,aliases,summary',
  'id,name,description,semanticType,entityRefId,fieldName,mssqlColumn,mcpField,sqlType,nullable,keyRole,mappingStatus,summary',
  'id,name,description,semanticType,sourceDocumentRefId,sourcePath,sectionHeading,sectionOrder,content',
][i].split(',')])));
export const RAW_SOURCE_SEALS = freeze(RAW_ARTIFACTS.map((artifact, i) => ({ artifact,
  bytes: [74880,25729,306387][i], record_count: [67,109,190][i], sha256: [
    '35af823973b1d0377365efbcc68f184a83cac787f12dfecf983fb31190239d16',
    'c0c17e8f0115f86b140e40a9e2cc02b1601bcca93f2d932e21736031d8aa6e17',
    '6c8bc167db9c0009e5cb21c259ac191b81e8e721897487110a6946276fb7aca8',
  ][i] })));
export const RAW_BASE_MANIFEST_SHA256 = '9f4275a2400e7853f7b8bcdcfe3f4463c3ad30384f1bdb49a0bbfbfc3626eede';
export const RAW_LEXER_SHA256 = 'ed19d8afc0293ab62a0bc5f64a0dfb6966a9f39b546343c385df98153701e1d1';
export const RAW_METADATA_KEYS = Object.freeze('id,name,canonicalName,ontologyId,aliases,description,fieldName,mssqlColumn,sqlType,mcpField,verificationStatus,mappingStatus,sectionHeading,sectionOrder,sourcePath'.split(','));
export const RAW_DIAGNOSTIC_CODES = Object.freeze('owned_record,ambiguous_owner_ref,unresolved_owner_ref,invalid_owner_id,duplicate_record_id,no_hint_postings,invalid_field_name,invalid_section_order,malformed_identifier,unclosed_atom,unsupported_fence,semantic_not_assessed'.split(','));
export const RAW_MISSING_REASONS = Object.freeze('owner_not_found,ambiguous_owner_ref,record_not_found,record_owner_mismatch,record_quarantined_ambiguous,record_quarantined_unresolved,owner_context_unavailable,owner_context_record_limit,owner_context_char_limit,record_limit,char_limit'.split(','));
export const RAW_TOOL_ERROR_CODES = Object.freeze('SNAPSHOT_MISMATCH,SOURCE_SNAPSHOT_CHANGED,INDEX_UNAVAILABLE,INDEX_CORRUPT,INDEX_FORMAT_UNSUPPORTED,DATA_BOUND_EXCEEDED,DATA_CODE_MISMATCH,INTERNAL_CONTRACT_ERROR'.split(','));
export const RAW_BUILD_ERRORS = Object.freeze('SOURCE_FINGERPRINT_MISMATCH,CSV_INVALID,CODE_CLOSURE_INVALID,OWNERSHIP_ACCOUNTING_INVALID,INDEX_CONTRACT_INVALID,DATA_BOUND_EXCEEDED,ENVIRONMENT_MISMATCH'.split(','));
export const RAW_RPC_MESSAGES = Object.freeze({ '-32700':'Parse error.', '-32600':'Invalid request.', '-32601':'Method unavailable.', '-32602':'Invalid parameters.', '-32603':'Semantic execution unavailable.', '-32001':'Access denied.', '-32004':'Semantic capacity busy.' });

function freeze(x) { if (x && typeof x === 'object') { Object.values(x).forEach(freeze); Object.freeze(x); } return x; }
function fail() { throw new TypeError('Invalid raw contract value'); }
export function validUnicode(s) {
  if (typeof s !== 'string') return false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) { const n = s.charCodeAt(++i); if (!(n >= 0xdc00 && n <= 0xdfff)) return false; }
    else if (c >= 0xdc00 && c <= 0xdfff) return false;
  }
  return true;
}

// Reject before native quoting: no toJSON/getters, sparse arrays, symbols,
// nonenumerable baggage, exotic prototypes or silently coerced JSON values.
function jsonTree(value, integersOnly, stack = new Set()) {
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'string') { if (!validUnicode(value)) fail(); return; }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Object.is(value, -0) || (integersOnly && !Number.isSafeInteger(value)) || (Number.isInteger(value) && !Number.isSafeInteger(value))) fail();
    return;
  }
  if (!value || typeof value !== 'object' || stack.has(value)) fail();
  const array = Array.isArray(value), proto = Object.getPrototypeOf(value);
  if (array ? proto !== Array.prototype : proto !== Object.prototype && proto !== null) fail();
  const keys = Reflect.ownKeys(value);
  if (keys.some(k => typeof k !== 'string')) fail();
  if (array && (keys.length !== value.length + 1 || keys.some(k => k !== 'length' && (!/^(0|[1-9][0-9]*)$/.test(k) || Number(k) >= value.length)))) fail();
  stack.add(value);
  for (const k of keys) {
    if (array && k === 'length') continue;
    const d = Object.getOwnPropertyDescriptor(value, k);
    if (!d.enumerable || !Object.hasOwn(d, 'value') || !validUnicode(k)) fail();
    jsonTree(d.value, integersOnly, stack);
  }
  stack.delete(value);
}
export function canonicalJson(value) {
  jsonTree(value, true);
  const encode = v => v === null || typeof v !== 'object' ? JSON.stringify(v)
    : Array.isArray(v) ? '[' + v.map(encode).join(',') + ']'
      : '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + encode(v[k])).join(',') + '}';
  return encode(value);
}
export function parseStrictJson(bytesOrString) {
  let s;
  if (typeof bytesOrString === 'string') s = bytesOrString;
  else if (bytesOrString instanceof Uint8Array) s = new TextDecoder('utf-8', { fatal:true, ignoreBOM:true }).decode(bytesOrString);
  else fail();
  if (!validUnicode(s) || s.startsWith('\ufeff')) fail();
  let p = 0;
  const ws = () => { while (/[\x20\x09\x0a\x0d]/.test(s[p] || '\0')) p++; };
  function string() {
    const start = p++;
    while (p < s.length) {
      const ch = s[p++];
      if (ch === '"') { const v = JSON.parse(s.slice(start, p)); if (!validUnicode(v)) fail(); return v; }
      if (ch === '\\') { if (p >= s.length) fail(); p++; }
      else if (ch.charCodeAt(0) < 32) fail();
    }
    fail();
  }
  function value() {
    ws(); const ch = s[p];
    if (ch === '"') return string();
    if (ch === '{') {
      p++; ws(); const out = {}, keys = new Set();
      if (s[p] === '}') { p++; return out; }
      for (;;) {
        ws(); if (s[p] !== '"') fail(); const k = string(); if (keys.has(k)) fail(); keys.add(k);
        ws(); if (s[p++] !== ':') fail(); const v = value();
        Object.defineProperty(out, k, { value:v, enumerable:true, configurable:true, writable:true });
        ws(); if (s[p] === '}') { p++; return out; } if (s[p++] !== ',') fail();
      }
    }
    if (ch === '[') {
      p++; ws(); const out = []; if (s[p] === ']') { p++; return out; }
      for (;;) { out.push(value()); ws(); if (s[p] === ']') { p++; return out; } if (s[p++] !== ',') fail(); }
    }
    for (const [literal, v] of [['true',true],['false',false],['null',null]]) if (s.startsWith(literal, p)) { p += literal.length; return v; }
    const m = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(s.slice(p));
    if (!m) fail(); p += m[0].length; const n = Number(m[0]); jsonTree(n, false); return n;
  }
  const result = value(); ws(); if (p !== s.length) fail(); return result;
}

// These are concrete JSON schemas; x-utf16* supplements codepoint lengths.
// Runtime validation below also executes every named cross-invariant.
const str = (min = 0, max) => ({ type:'string', ...(min ? { minLength:min, 'x-utf16Min':min } : {}), ...(max === undefined ? {} : { maxLength:max, 'x-utf16Max':max }) });
const integer = (minimum = 0, maximum = Number.MAX_SAFE_INTEGER) => ({ type:'integer',minimum,maximum });
const literal = value => ({ const:value });
const en = values => ({ enum:values });
const union = (...oneOf) => ({ oneOf });
const nullable = s => union(s, { type:'null' });
const arr = (items, minItems = 0, maxItems, uniqueItems = false) => ({ type:'array',items,minItems,...(maxItems === undefined ? {} : { maxItems }), ...(uniqueItems ? { uniqueItems:true } : {}) });
const obj = (properties, optional = []) => ({ type:'object',properties,required:Object.keys(properties).filter(k => !optional.includes(k)),additionalProperties:false });
const S = {};
S.Hex = { ...str(64,64), pattern:'^[0-9a-f]{64}$' };
S.Id = { ...str(1,256), pattern:'^[^\\u0000-\\u001f\\u007f]+$' };
S.RequestId = { ...str(1,64), pattern:'^[A-Za-z0-9_-]{1,64}$' };
const safeString = max => ({ ...S.Id, maxLength:max, 'x-utf16Max':max });
S.Correlation = nullable(safeString(128));
// Shape is deliberately distinct from authority. Full strict input validation
// accepts a nonempty control-free foreign namespace, so preflight can return
// -32001 rather than -32602. Output/data refs always require literal OWA.
S.EntityRefShape = obj({ namespace:S.Id,id:S.Id });
S.EntityRef = obj({ namespace:literal('OWAOntology'),id:S.Id });
S.Artifact = en(RAW_ARTIFACTS);
S.Kind = en(['entity_metadata','field_metadata','source_chunk']);
S.Physical = obj({ byte_start:integer(),byte_end:integer(1),line_start:integer(1),line_end:integer(1) });
S.Source = obj({ artifact:S.Artifact,sha256:S.Hex,bytes:integer(1),record_count:integer() });
for (const [i, name] of ['EFields','FFields','CFields'].entries()) S[name] = obj(Object.fromEntries(RAW_HEADERS[RAW_ARTIFACTS[i]].map(k => [k,str()])));
const ownership = obj({ via:en(['self','entityRefId','sourceDocumentRefId']),literal_ref:str() });
S.RecordCore = obj({ record_ref:S.Hex,kind:S.Kind,record_id:str(),artifact:S.Artifact,physical:S.Physical,raw_record_sha256:S.Hex,record_hash:S.Hex,fields_sha256:S.Hex,fields_utf16:integer(),fields:union(S.EFields,S.FFields,S.CFields),integrity:literal('exact_export_record'),semantic_completeness:literal('not_assessed') });
S.Record = obj({ ...S.RecordCore.properties,entity_ref:S.EntityRef,ownership });
S.DiscoverInput = obj({ query:str(1,500),kind:en(['entity','field','identifier_mention']),entity_ref:S.EntityRefShape,expected_snapshot_id:S.Hex,limit:integer(1,5),correlation_id:safeString(128) }, ['entity_ref','expected_snapshot_id','limit','correlation_id']);
S.MetadataKey = en(RAW_METADATA_KEYS);
S.Origin = obj({ record_ref:S.Hex,kind:en(['metadata_entity','metadata_field','identifier_mention']),metadata_key:nullable(S.MetadataKey),body_field:nullable(en(['description','summary','content'])),start_utf16:nullable(integer()),end_utf16:nullable(integer()),token:nullable(str()) });
S.Related = obj({ record_ref:S.Hex,relation:en(['owner_context','same_owner','same_owner_source_path']),source_path:nullable(str()),section_order:nullable(str()) });
S.Candidate = obj({ candidate_id:S.Hex,candidate_kind:en(['entity','field','identifier_mention']),entity_ref:S.EntityRef,name:S.Id,label:nullable(str(0,240)),metadata_hints:arr(obj({ key:S.MetadataKey,value:str(0,240) }),0,16),omitted_metadata_keys:arr(S.MetadataKey,0,16,true),record_refs:arr(S.Hex,1,8,true),record_ref_count:integer(1),origins:arr(S.Origin,1,8,true),origins_count:integer(1),related_records:arr(S.Related,0,8),related_record_count:integer() });
const success = { schema_version:literal('0.1'),snapshot_id:S.Hex,assessment:literal('source_records_only'),semantic_assessment:literal('not_performed'),correlation_id:S.Correlation };
S.DiscoverSuccess = obj({ ...success,mode:literal('discovery'),status:en(['candidates','no_candidates','owner_not_found','ambiguous_owner_ref']),candidates:arr(S.Candidate,0,5),has_more:{ type:'boolean' } });
S.EvidenceRequest = obj({ id:S.RequestId,entity_ref:S.EntityRefShape,record_refs:arr(S.Hex,1,8,true) });
S.EvidenceInput = obj({ snapshot_id:S.Hex,requests:arr(S.EvidenceRequest,1,8),correlation_id:safeString(128) }, ['correlation_id']);
S.MissingReason = en(RAW_MISSING_REASONS);
S.DeliveryResult = obj({ id:S.RequestId,entity_ref:S.EntityRef,requested_refs:arr(S.Hex,1,8,true),status:en(['returned_all','returned_some','returned_none','budget_limited']),returned_refs:arr(S.Hex,0,8,true),context_refs:arr(S.Hex,0,1),missing:arr(obj({ record_ref:S.Hex,reason:S.MissingReason }),0,8) });
S.Budget = obj({ max_records:literal(8),max_fields_utf16:literal(16000),max_entity_refs:literal(2),used_records:integer(0,8),used_fields_utf16:integer(0,16000),used_entity_refs:integer(0,2) });
S.EvidenceSuccess = obj({ ...success,mode:literal('evidence'),results:arr(S.DeliveryResult,1,8),records:arr(S.Record,0,8),sources:arr(S.Source,0,3),budget:S.Budget });
S.ToolErrorCode = en(RAW_TOOL_ERROR_CODES);
S.ToolError = obj({ schema_version:literal('0.1'),mode:literal('error'),operation:en(['discovery','evidence']),code:S.ToolErrorCode,retry:en(['new_turn','operator_required']),expected_snapshot_id:nullable(S.Hex),active_snapshot_id:nullable(S.Hex),correlation_id:S.Correlation });
S.DiscoverOutput = union(S.DiscoverSuccess,obj({ ...S.ToolError.properties,operation:literal('discovery') }));
S.EvidenceOutput = union(S.EvidenceSuccess,obj({ ...S.ToolError.properties,operation:literal('evidence') }));
S.RpcId = union(integer(-Number.MAX_SAFE_INTEGER),safeString(128));
S.RawRequest = obj({ jsonrpc:literal('2.0'),id:S.RpcId,method:literal('tools/call'),params:union(obj({ name:literal('erp_subject.discover'),arguments:S.DiscoverInput }),obj({ name:literal('erp_evidence.get'),arguments:S.EvidenceInput })) });
S.CallResult = obj({ isError:{ type:'boolean' },structuredContent:union(S.DiscoverSuccess,S.EvidenceSuccess,S.ToolError),content:arr(obj({ type:literal('text'),text:str() }),1,1) });
S.RPCSuccess = obj({ jsonrpc:literal('2.0'),id:S.RpcId,result:S.CallResult });
S.RPCError = obj({ jsonrpc:literal('2.0'),id:nullable(S.RpcId),error:obj({ code:en(Object.keys(RAW_RPC_MESSAGES).map(Number)),message:str() }) });
S.Disposition = en(['owned','quarantined_ambiguous','quarantined_unresolved']);
S.Diagnostic = obj({ diagnostic_id:S.Hex,record_ref:S.Hex,code:en(RAW_DIAGNOSTIC_CODES),key:nullable(en('id,ontologyId,entityRefId,sourceDocumentRefId,fieldName,mssqlColumn,sectionOrder,description,summary,content'.split(','))),start_utf16:nullable(integer()),end_utf16:nullable(integer()) });
S.StoredRecord = obj({ core:S.RecordCore,disposition:S.Disposition,entity_ref:nullable(S.EntityRef),ownership,diagnostic_ids:arr(S.Hex,1,undefined,true) });
S.Owner = obj({ entity_ref:S.EntityRef,entity_record_ref:S.Hex,record_refs:arr(S.Hex,1,undefined,true) });
S.OwnerLookup = obj({ literal_ref:S.Id,entity_record_refs:arr(S.Hex,1,undefined,true) });
S.Posting = obj({ candidate_kind:en(['entity','field','identifier_mention']),entity_ref:S.EntityRef,name:S.Id,search_value:str(),origin:S.Origin });
S.ArtifactAccounting = obj({ artifact:S.Artifact,total:integer(),owned:integer(),quarantined_ambiguous:integer(),quarantined_unresolved:integer(),diagnostic_count:integer(1) });
S.Accounting = obj({ artifacts:arr(S.ArtifactAccounting,3,3),total:literal(366),owned:integer(0,366),quarantined_ambiguous:integer(0,366),quarantined_unresolved:integer(0,366),diagnostic_count:integer(366) });
S.FileEntry = obj({ path:{ ...str(1), 'x-safePath':true },bytes:integer(1),sha256:S.Hex });
S.Environment = obj(Object.fromEntries(['node_version','unicode_version','icu_version'].map(k => [k,{ ...str(1,128),pattern:'^[A-Za-z0-9._+-]{1,128}$' }])));
S.Compiler = obj({ abi:literal('owa-raw-compiler/1'),lexer:literal('source-lexer-esj4gr-v1'),files:arr(S.FileEntry,1),closure_sha256:S.Hex,environment:S.Environment });
const indexBase = { format:literal('owa-record-index/1'),contract_version:literal('0.1'),canonicalization:literal('cjson-utf16-v1'),base_manifest_sha256:S.Hex,compiler_closure_sha256:S.Hex,runtime_code_sha256:S.Hex,worker_generation_id:S.Hex,environment:S.Environment,sources:arr(S.Source,3,3) };
S.IndexPayload = obj({ ...indexBase,records:arr(S.StoredRecord,366,366),owners:arr(S.Owner,0,67),owner_lookup:arr(S.OwnerLookup,1,134),postings:arr(S.Posting),diagnostics:arr(S.Diagnostic,366),accounting:S.Accounting });
S.DataManifest = obj({ kind:literal('owa-raw-record-poc'),manifest_version:literal(1),contract_version:literal('0.1'),canonicalization:literal('cjson-utf16-v1'),base_manifest_sha256:S.Hex,compiler:S.Compiler,runtime_files:arr(S.FileEntry,1),runtime_code_sha256:S.Hex,worker_generation_id:S.Hex,environment:S.Environment,sources:arr(S.Source,3,3),index:obj({ path:literal('index.json'),bytes:integer(1),sha256:S.Hex,format:literal('owa-record-index/1') }),snapshot_id:S.Hex,data_bytes:integer(1,8388608),accounting:S.Accounting });
S.TrustedDataGeneration = obj({ abi:literal('owa-raw-data-generation/1'),data_root:{ ...str(1),'x-absolutePath':true },manifest_path:{ ...str(1),'x-absolutePath':true },manifest_sha256:S.Hex,snapshot_id:S.Hex,worker_generation_id:S.Hex,runtime_code_sha256:S.Hex });
S.CodeBinding = obj({ worker_generation_id:S.Hex,runtime_code_sha256:S.Hex,environment:S.Environment });
S.AuthorizedScope = obj({ profile_id:literal('erp-semantic-evidence-poc'),scope:literal('kb.semantic.read'),namespaces:arr(literal('OWAOntology'),1,1) });
S.Milliseconds = { type:'number',minimum:0 };
S.RawWorkerJob = obj({ jobId:S.RequestId,request:S.RawRequest,context:obj({ authorization:S.AuthorizedScope,trustedDataGeneration:S.TrustedDataGeneration,code:S.CodeBinding }),timing:obj({ queueMs:S.Milliseconds,startupMs:S.Milliseconds }) });
S.RawWorkerReady = obj({ type:literal('ready'),generation:S.Hex });
S.RawWorkerDataReady = obj({ type:literal('data-ready'),jobId:S.RequestId,worker_generation_id:S.Hex,manifest_sha256:S.Hex,snapshot_id:S.Hex });
S.RawWorkerResult = obj({ type:literal('result'),jobId:S.RequestId,response:union(S.RPCSuccess,S.RPCError),handlerWallMs:S.Milliseconds,worker_generation_id:S.Hex,manifest_sha256:S.Hex,snapshot_id:nullable(S.Hex),data_state:en(['validated','unavailable']) });
S.RawWorkerFailure = obj({ type:literal('request-error'),jobId:S.RequestId,handlerWallMs:S.Milliseconds });
S.Transcript = obj({ calls:arr(obj({ request:S.RawRequest,response:union(S.RPCSuccess,S.RPCError) }),0,100),outcome:en(['answer','clarification','unavailable']),final_answer:nullable(str()) });
S.Violation = obj({ call_index:nullable(integer(0,99)),rule:en('call_limit,call_order,snapshot_mixing,wire_schema,text_parity,artifact_binding,reference_membership,owner_binding,record_integrity,result_partition,context_required,budget,discovery_not_evidence,output_not_deterministic'.split(',')) });
S.CompileInput = obj({ compiler:S.Compiler,runtime_files:arr(S.FileEntry,1),runtime_code_sha256:S.Hex,worker_generation_id:S.Hex,environment:S.Environment,base_manifest_sha256:S.Hex,inputs:arr(obj({ artifact:S.Artifact,bytes:{ 'x-byteSequence':true } }),3,3) });
S.CompileResult = union(obj({ ok:literal(true),index_bytes:{ 'x-byteSequence':true },manifest_bytes:{ 'x-byteSequence':true },snapshot_id:S.Hex }),obj({ ok:literal(false),code:en(RAW_BUILD_ERRORS) }));
const loadErrors = RAW_TOOL_ERROR_CODES.filter(c => !['SNAPSHOT_MISMATCH','INTERNAL_CONTRACT_ERROR'].includes(c));
S.BuildError = en(RAW_BUILD_ERRORS); S.LoadError = en(loadErrors);
S.ArtifactVerification = union(obj({ valid:literal(true),snapshot_id:S.Hex,accounting:S.Accounting }),obj({ valid:literal(false),code:en([...new Set([...RAW_BUILD_ERRORS,...loadErrors])]) }));
S.TranscriptVerification = union(obj({ valid:literal(true),assessment:literal('contract_only'),semantic_assessment:literal('not_performed'),snapshot_id:S.Hex }),obj({ valid:literal(false),violations:arr(S.Violation,1) }));
export const RAW_SCHEMAS = freeze(S);

export function isSafeRawPath(path) {
  return typeof path === 'string' && validUnicode(path) && path.length > 0 && !/[\\\x00-\x1f\x7f%?#:]/.test(path) && path.split('/').every(p => p && p !== '.' && p !== '..');
}
function absolutePath(p) { return typeof p === 'string' && p.startsWith('/') && isSafeRawPath(p.slice(1)); }
function same(a,b) { return canonicalJson(a) === canonicalJson(b); }
function unique(a, key = x => x) { return new Set(a.map(key)).size === a.length; }
function ownerKey(r) { return canonicalJson(r); }
function ordered(a, key) { const keys = a.map(key); return keys.every((v,i) => !i || keys[i-1] < v); }
function shape(schema,v) {
  if (schema.oneOf) return schema.oneOf.filter(s => shape(s,v)).length === 1;
  if (Object.hasOwn(schema,'const')) return v === schema.const;
  if (schema.enum) return schema.enum.includes(v);
  if (schema['x-byteSequence']) return v instanceof Uint8Array;
  if (schema.type === 'null') return v === null;
  if (schema.type === 'object') return v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).every(k => Object.hasOwn(schema.properties,k)) && schema.required.every(k => Object.hasOwn(v,k)) && Object.keys(v).every(k => shape(schema.properties[k],v[k]));
  if (schema.type === 'array') return Array.isArray(v) && v.length >= schema.minItems && (schema.maxItems === undefined || v.length <= schema.maxItems) && v.every(x => shape(schema.items,x)) && (!schema.uniqueItems || unique(v,canonicalJson));
  if (schema.type === 'string') return typeof v === 'string' && validUnicode(v) && v.length >= (schema['x-utf16Min'] || 0) && (schema['x-utf16Max'] === undefined || v.length <= schema['x-utf16Max']) && (!schema.pattern || new RegExp(schema.pattern,'u').test(v)) && (!schema['x-safePath'] || isSafeRawPath(v)) && (!schema['x-absolutePath'] || absolutePath(v));
  if (schema.type === 'integer' || schema.type === 'number') return typeof v === 'number' && Number.isFinite(v) && !Object.is(v,-0) && (schema.type !== 'integer' || Number.isSafeInteger(v)) && (schema.minimum === undefined || v >= schema.minimum) && (schema.maximum === undefined || v <= schema.maximum);
  if (schema.type === 'boolean') return typeof v === 'boolean';
  return false;
}
// Byte vectors occur only in explicitly internal compile ABI, never wire JSON.
function internalTree(v) { if (v instanceof Uint8Array) return; if (v && typeof v === 'object') { if (Array.isArray(v)) { for (let i=0;i<v.length;i++) { if (!Object.hasOwn(v,i)) fail(); internalTree(v[i]); } } else { for (const k of Reflect.ownKeys(v)) { const d = Object.getOwnPropertyDescriptor(v,k); if (typeof k !== 'string' || !d.enumerable || !Object.hasOwn(d,'value')) fail(); internalTree(d.value); } } } else jsonTree(v,false); }
export function validateRawType(name,value,context = {}) {
  try {
    if (!Object.hasOwn(S,name)) return false;
    if (['CompileInput','CompileResult'].includes(name)) internalTree(value); else jsonTree(value,false);
    return shape(S[name],value) && invariant(name,value,context);
  } catch { return false; }
}
export const validateDiscoverInput = value => validateRawType('DiscoverInput',value);
export const validateEvidenceInput = value => validateRawType('EvidenceInput',value);
export const validateRawRequest = value => validateRawType('RawRequest',value);
export function validateRawOutput(operation,value,context = {}) {
  if (!['discovery','evidence'].includes(operation)) return false;
  if (value?.mode === 'error') return validateRawType('ToolError',value,context) && value.operation === operation;
  return validateRawType(operation === 'discovery' ? 'DiscoverSuccess' : 'EvidenceSuccess',value,context);
}
export function rawToolError(operation,code,correlation = null,expected = null,active = null) {
  const out = { schema_version:'0.1',mode:'error',operation,code,retry:code === 'SNAPSHOT_MISMATCH' ? 'new_turn' : 'operator_required',expected_snapshot_id:expected,active_snapshot_id:active,correlation_id:correlation };
  if (!validateRawType('ToolError',out)) fail(); return out;
}
export function rawRpcError(id,code) {
  const out = { jsonrpc:'2.0',id,error:{ code,message:RAW_RPC_MESSAGES[code] } };
  if (!validateRawType('RPCError',out)) fail(); return out;
}
export function rawCallResult(structured) {
  const operation = structured?.mode === 'error' ? structured.operation : structured?.mode;
  if (!validateRawOutput(operation,structured)) fail();
  return { isError:structured.mode === 'error',structuredContent:structured,content:[{ type:'text',text:canonicalJson(structured) }] };
}

const budgetReason = reason => ['owner_context_record_limit','owner_context_char_limit','record_limit','char_limit'].includes(reason);
const span = v => v.start_utf16 === null ? v.end_utf16 === null : v.end_utf16 !== null && v.start_utf16 < v.end_utf16;
const physicalOrder = (a,b) => a.artifact < b.artifact ? -1 : a.artifact > b.artifact ? 1 : a.physical.byte_start - b.physical.byte_start;
const sortedBy = (xs,cmp) => xs.every((x,i) => !i || cmp(xs[i-1],x) < 0);
const cmp = (a,b) => a === b ? 0 : a === null ? -1 : b === null ? 1 : a < b ? -1 : 1;
function compareTuple(a,b) { for (let i=0;i<a.length;i++) { const c = cmp(a[i],b[i]); if (c) return c; } return 0; }
function coreInvariant(v,source) {
  const i = RAW_ARTIFACTS.indexOf(v.artifact);
  if (v.kind !== ['entity_metadata','field_metadata','source_chunk'][i] || !shape(S[['EFields','FFields','CFields'][i]],v.fields) || v.record_id !== v.fields.id || !invariant('Physical',v.physical)) return false;
  const fields = canonicalJson(v.fields);
  if (v.fields_utf16 !== fields.length || v.fields_sha256 !== sha256(Buffer.from(fields))) return false;
  if (source) {
    if (v.physical.byte_end > source.bytes || v.record_hash !== hashRaw('record',{ artifact:v.artifact,source_sha256:source.sha256,physical:v.physical,fields:v.fields })) return false;
    if (v.record_ref !== hashRaw('record-ref',{ artifact:v.artifact,source_sha256:source.sha256,physical:v.physical,record_hash:v.record_hash,raw_record_sha256:v.raw_record_sha256 })) return false;
  }
  return true;
}
function recordOwnership(v,core = v) {
  const i = RAW_ARTIFACTS.indexOf(core.artifact), via = ['self','entityRefId','sourceDocumentRefId'][i];
  return v.ownership.via === via && v.ownership.literal_ref === core.fields[i === 0 ? 'id' : via] && (i !== 0 || v.entity_ref === null || v.entity_ref.id === core.record_id);
}
function originInvariant(v,record) {
  if (!span(v)) return false;
  if (v.kind !== 'identifier_mention') return v.metadata_key === (v.kind === 'metadata_entity' ? 'id' : 'fieldName') || (v.kind === 'metadata_field' && v.metadata_key === 'mssqlColumn')
    ? v.body_field === null && v.start_utf16 === null && v.end_utf16 === null && v.token === null && (!record || record.kind === (v.kind === 'metadata_entity' ? 'entity_metadata' : 'field_metadata')) : false;
  if (v.metadata_key !== null || v.body_field === null || v.start_utf16 === null || !validSelector(v.token) || !technical(v.token)) return false;
  return !record || (Object.hasOwn(record.fields,v.body_field) && ['entity_metadata','field_metadata'].includes(record.kind) ? ['description','summary'].includes(v.body_field) && v.end_utf16 <= record.fields[v.body_field].length : v.body_field === 'content' && v.end_utf16 <= record.fields.content.length);
}
export const validSelector = value => typeof value === 'string' && validUnicode(value) && value.length >= 1 && value.length <= 128 && !/[\x00-\x1f\x7f]/.test(value);
const technical = value => /^[\p{L}_][\p{L}\p{N}_-]*(?:[.:][\p{L}\p{N}_-]+)*$/u.test(value);
function recordsMap(index) { return new Map(index.records.map(r => [r.core.record_ref,r])); }
function candidateInvariant(v,index) {
  if (v.candidate_id !== hashRaw('candidate',{ candidate_kind:v.candidate_kind,entity_ref:v.entity_ref,name:v.name }) || v.record_ref_count < v.record_refs.length || v.origins_count < v.origins.length || v.related_record_count < v.related_records.length || !unique(v.metadata_hints,h => h.key) || !unique(v.related_records,r => r.record_ref)) return false;
  if (v.metadata_hints.some(h => v.omitted_metadata_keys.includes(h.key)) || v.related_records.some(r => v.record_refs.includes(r.record_ref))) return false;
  if (v.record_refs.length !== Math.min(8,v.record_ref_count) || v.related_records.length !== Math.min(8,v.related_record_count)) return false;
  if (v.candidate_kind === 'entity' ? v.name !== v.entity_ref.id : !validSelector(v.name)) return false;
  if (v.candidate_kind === 'identifier_mention' && (v.label !== null || !technical(v.name))) return false;
  const map = index ? recordsMap(index) : null;
  const owned = ref => !map || (map.get(ref)?.disposition === 'owned' && same(map.get(ref).entity_ref,v.entity_ref));
  if (![...v.record_refs,...v.related_records.map(r => r.record_ref)].every(owned)) return false;
  if (!v.origins.every(o => v.record_refs.includes(o.record_ref) && o.kind === { entity:'metadata_entity',field:'metadata_field',identifier_mention:'identifier_mention' }[v.candidate_kind] && originInvariant(o,map?.get(o.record_ref)?.core) && (o.kind !== 'identifier_mention' || o.token === v.name))) return false;
  if (map) {
    const originTuple = o => { const r = map.get(o.record_ref).core; return [r.artifact,r.physical.byte_start,o.body_field,o.start_utf16,o.end_utf16,o.kind]; };
    if (!sortedBy(v.origins,(a,b) => compareTuple(originTuple(a),originTuple(b)))) return false;
    for (const r of v.related_records) {
      const core = map.get(r.record_ref).core;
      if (r.source_path !== (core.kind === 'source_chunk' ? core.fields.sourcePath : null) || r.section_order !== (core.kind === 'source_chunk' ? core.fields.sectionOrder : null)) return false;
      if (r.relation === 'owner_context' && core.kind !== 'entity_metadata') return false;
      if (r.relation === 'same_owner_source_path' && (core.kind !== 'source_chunk' || !r.source_path)) return false;
    }
    const first = map.get(v.origins[0].record_ref).core;
    const hints = v.candidate_kind === 'entity' ? ['name','canonicalName','ontologyId','aliases','verificationStatus','description'] : v.candidate_kind === 'field' ? ['name','fieldName','mssqlColumn','sqlType','mcpField','mappingStatus','description'] : ['sourcePath','sectionHeading','sectionOrder'].filter(k => Object.hasOwn(first.fields,k));
    const expectedHints = hints.filter(k => first.fields[k].length <= 240).sort((a,b) => RAW_METADATA_KEYS.indexOf(a)-RAW_METADATA_KEYS.indexOf(b)).map(key => ({ key,value:first.fields[key] }));
    let labelKey = null;
    if (v.candidate_kind === 'entity') labelKey = first.fields.canonicalName ? 'canonicalName' : first.fields.name ? 'name' : null;
    if (v.candidate_kind === 'field' && first.fields.name) labelKey = 'name';
    const omitted = hints.filter(k => first.fields[k].length > 240);
    if (labelKey && first.fields[labelKey].length > 240 && !omitted.includes(labelKey)) omitted.push(labelKey);
    omitted.sort((a,b) => RAW_METADATA_KEYS.indexOf(a)-RAW_METADATA_KEYS.indexOf(b));
    if (!same(v.metadata_hints,expectedHints) || !same(v.omitted_metadata_keys,omitted) || v.label !== (labelKey && first.fields[labelKey].length <= 240 ? first.fields[labelKey] : null)) return false;
    if (v.candidate_kind === 'field') { const key = validSelector(first.fields.fieldName) ? 'fieldName' : 'mssqlColumn'; if (v.name !== first.fields[key] || v.origins.some(o => { const f = map.get(o.record_ref).core.fields; const k = validSelector(f.fieldName) ? 'fieldName' : 'mssqlColumn'; return o.metadata_key !== k || f[k] !== v.name; })) return false; }
    const postings = index.postings.filter(p => p.candidate_kind === v.candidate_kind && p.name === v.name && same(p.entity_ref,v.entity_ref));
    const origins = [...new Map(postings.map(p => [canonicalJson(p.origin),p.origin])).values()].sort((a,b) => compareTuple(originTuple(a),originTuple(b)));
    const refs = [...new Set(origins.map(o => o.record_ref))];
    if (v.origins_count !== origins.length || v.record_ref_count !== refs.length || !same(v.record_refs,refs.slice(0,8)) || !same(v.origins,origins.filter(o => v.record_refs.includes(o.record_ref)).slice(0,8))) return false;
    const paths = new Set(refs.map(ref => map.get(ref).core.fields.sourcePath).filter(Boolean));
    const related = index.records.filter(r => r.disposition === 'owned' && same(r.entity_ref,v.entity_ref) && !refs.includes(r.core.record_ref)).map(r => {
      const c = r.core, chunk = c.kind === 'source_chunk';
      return { record_ref:c.record_ref,relation:c.kind === 'entity_metadata' ? 'owner_context' : chunk && paths.has(c.fields.sourcePath) ? 'same_owner_source_path' : 'same_owner',source_path:chunk ? c.fields.sourcePath : null,section_order:chunk ? c.fields.sectionOrder : null };
    });
    const priority = { owner_context:0,same_owner_source_path:1,same_owner:2 };
    const orderKey = r => { const valid = r.section_order !== null && /^[0-9]+$/.test(r.section_order) && Number.isSafeInteger(Number(r.section_order)); return [valid ? 0 : 1,valid ? Number(r.section_order) : r.section_order]; };
    related.sort((a,b) => priority[a.relation]-priority[b.relation] || (a.relation === 'same_owner_source_path' ? compareTuple([a.source_path,...orderKey(a)],[b.source_path,...orderKey(b)]) : 0) || physicalOrder(map.get(a.record_ref).core,map.get(b.record_ref).core));
    if (v.related_record_count !== related.length || !same(v.related_records,related.slice(0,8))) return false;
  }
  return true;
}
const fold = value => value.normalize('NFD').replace(/\p{M}/gu,'').replace(/[łŁ]/g,c => c === 'ł' ? 'l' : 'L').toLowerCase();
const tokens = value => [...new Set(fold(value).match(/[\p{L}\p{N}_]+/gu) || [])];
function discoveryContext(v,{ index,input }) {
  if (input.entity_ref) {
    const roots = index.records.filter(r => r.core.kind === 'entity_metadata' && r.core.record_id === input.entity_ref.id);
    if (roots.length !== 1) return v.status === (roots.length ? 'ambiguous_owner_ref' : 'owner_not_found') && !v.has_more && !v.candidates.length;
  }
  const groups = new Map();
  for (const p of index.postings) {
    if (input.entity_ref && !same(input.entity_ref,p.entity_ref)) continue;
    if (input.kind === 'entity' ? p.candidate_kind !== 'entity' : input.kind === 'identifier_mention' ? p.candidate_kind !== 'identifier_mention' : p.candidate_kind === 'entity') continue;
    const key = { candidate_kind:p.candidate_kind,entity_ref:p.entity_ref,name:p.name }, id = hashRaw('candidate',key);
    if (!groups.has(id)) groups.set(id,{ ...key,id,values:[] }); groups.get(id).values.push(p.search_value);
  }
  const queryTokens = tokens(input.query), words = input.query.trim().split(/\s+/u);
  const setQuery = words.length >= 2 && words.length <= 8 && new Set(words).size === words.length && words.every(technical);
  const ranked = [];
  for (const g of groups.values()) {
    const bag = new Set(g.values.flatMap(tokens));
    const tier = g.values.includes(input.query) ? 1 : g.values.some(x => fold(x) === fold(input.query)) ? 2 : setQuery && words.includes(g.name) ? 3 : queryTokens.length && queryTokens.every(t => bag.has(t)) ? 4 : 0;
    if (tier) ranked.push({ ...g,tier });
  }
  const priority = { entity:0,field:1,identifier_mention:2 };
  ranked.sort((a,b) => compareTuple([a.tier,priority[a.candidate_kind],a.entity_ref.id,a.name,a.id],[b.tier,priority[b.candidate_kind],b.entity_ref.id,b.name,b.id]));
  const limit = input.limit ?? 5;
  return v.status === (ranked.length ? 'candidates' : 'no_candidates') && v.has_more === (ranked.length > limit) && same(v.candidates.map(c => c.candidate_id),ranked.slice(0,limit).map(g => g.id));
}
function deliveryInvariant(v) {
  const missing = v.requested_refs.filter(r => !v.returned_refs.includes(r));
  if (!same(v.missing.map(m => m.record_ref),missing) || !same(v.returned_refs,v.requested_refs.filter(r => v.returned_refs.includes(r)))) return false;
  const status = v.missing.some(m => budgetReason(m.reason)) ? 'budget_limited' : !v.missing.length ? 'returned_all' : !v.returned_refs.length ? 'returned_none' : 'returned_some';
  return v.status === status && (!v.returned_refs.length || v.context_refs.length === 1) && (v.context_refs.length > 0 || !v.missing.some(m => ['record_limit','char_limit','record_not_found','record_owner_mismatch','record_quarantined_ambiguous','record_quarantined_unresolved'].includes(m.reason)));
}
function evidenceInvariant(v,{ index,manifest,input } = {}) {
  if (!unique(v.records,r => r.record_ref) || !unique(v.results,r => r.id) || !ordered(v.sources,s => s.artifact) || !unique(v.results.map(r => r.entity_ref),ownerKey) && new Set(v.results.map(r => ownerKey(r.entity_ref))).size > 2) return false;
  const records = new Map(v.records.map(r => [r.record_ref,r]));
  const sources = new Map(v.sources.map(s => [s.artifact,s]));
  if (!v.records.every(r => sources.has(r.artifact) && coreInvariant(r,sources.get(r.artifact)) && recordOwnership(r)) || !v.sources.every(s => v.records.some(r => r.artifact === s.artifact))) return false;
  const used = new Set(), contexts = new Map(), seen = new Map(), expectedOrder = [];
  for (const r of v.results) {
    if (!deliveryInvariant(r)) return false;
    const key = ownerKey(r.entity_ref), context = r.context_refs[0] || null;
    if (contexts.has(key) && contexts.get(key) !== context) return false;
    contexts.set(key,context);
    if (context && !expectedOrder.includes(context)) expectedOrder.push(context);
    for (const ref of [...r.returned_refs,...r.context_refs]) { const rec = records.get(ref); if (!rec || !same(rec.entity_ref,r.entity_ref)) return false; used.add(ref); }
    if (context && records.get(context).kind !== 'entity_metadata') return false;
    if (r.missing.some(m => records.get(m.record_ref) && same(records.get(m.record_ref).entity_ref,r.entity_ref))) return false;
    for (const ref of r.requested_refs) {
      const eligibility = r.returned_refs.includes(ref) ? 'returned' : r.missing.find(m => m.record_ref === ref).reason;
      const k = key + ref; if (seen.has(k) && seen.get(k) !== eligibility) return false; seen.set(k,eligibility);
    }
  }
  for (const r of v.results) for (const ref of r.returned_refs) if (!expectedOrder.includes(ref)) expectedOrder.push(ref);
  if (used.size !== v.records.length || !same(v.records.map(r => r.record_ref),expectedOrder)) return false;
  if (v.budget.used_records !== v.records.length || v.budget.used_fields_utf16 !== v.records.reduce((n,r) => n+canonicalJson(r.fields).length,0) || v.budget.used_entity_refs !== new Set(v.records.map(r => ownerKey(r.entity_ref))).size || contexts.size > 2) return false;
  if (input && (!validateEvidenceInput(input) || input.snapshot_id !== v.snapshot_id || v.correlation_id !== (input.correlation_id ?? null) || !same(v.results.map(r => ({ id:r.id,entity_ref:r.entity_ref,record_refs:r.requested_refs })),input.requests))) return false;
  if (manifest && (manifest.snapshot_id !== v.snapshot_id || (manifest.sources && v.sources.some(s => !manifest.sources.some(ms => same(ms,s)))))) return false;
  if (index) {
    const map = recordsMap(index);
    if (!v.records.every(r => { const s = map.get(r.record_ref); if (!s || s.disposition !== 'owned') return false; const { entity_ref,ownership,...core } = r; return same(core,s.core) && same(entity_ref,s.entity_ref) && same(ownership,s.ownership); })) return false;
    // Recompute admission independently of the lookup module: contexts first,
    // exact error precedence, full-record charging, then ordered explicit refs.
    const admitted = [], ownerStates = new Map(); let chars = 0;
    const admit = s => { if (admitted.includes(s.core.record_ref)) return null; if (admitted.length === 8) return 'record_limit'; if (chars + s.core.fields_utf16 > 16000) return 'char_limit'; admitted.push(s.core.record_ref); chars += s.core.fields_utf16; return null; };
    for (const r of v.results) if (!ownerStates.has(ownerKey(r.entity_ref))) {
      const roots = index.records.filter(s => s.core.kind === 'entity_metadata' && s.core.record_id === r.entity_ref.id);
      let reason = roots.length > 1 ? 'ambiguous_owner_ref' : !roots.length ? 'owner_not_found' : null;
      const root = roots[0]; if (!reason && root.disposition !== 'owned') reason = 'owner_context_unavailable';
      if (!reason) { const over = admit(root); if (over) reason = 'owner_context_' + over; }
      ownerStates.set(ownerKey(r.entity_ref),{ root,reason,outcomes:new Map() });
    }
    for (const r of v.results) {
      const state = ownerStates.get(ownerKey(r.entity_ref)), returned = [], missing = [];
      if (!same(r.context_refs,state.reason ? [] : [state.root.core.record_ref])) return false;
      for (const ref of r.requested_refs) {
        let reason;
        if (state.outcomes.has(ref)) reason = state.outcomes.get(ref);
        else {
          const s = map.get(ref); reason = state.reason;
          if (!reason) reason = !s ? 'record_not_found' : s.disposition !== 'owned' ? 'record_' + s.disposition : !same(s.entity_ref,r.entity_ref) ? 'record_owner_mismatch' : admit(s);
          // Recompute first eligibility here; never trust the wire's missing reason.
          // Retain it only for this owner/ref in this one validation replay.
          state.outcomes.set(ref,reason);
        }
        if (reason) missing.push({ record_ref:ref,reason }); else returned.push(ref);
      }
      if (!same(r.returned_refs,returned) || !same(r.missing,missing)) return false;
    }
    if (!same(v.records.map(r => r.record_ref),admitted)) return false;
  }
  return true;
}

function fileList(files) { return ordered(files,f => f.path) && files.reduce((n,f) => n+f.bytes,0) <= RAW_LIMITS.max_code_bytes; }
function accountingInvariant(v) {
  if (v.total !== v.owned+v.quarantined_ambiguous+v.quarantined_unresolved) return false;
  if (!v.artifacts) return true;
  return ordered(v.artifacts,a => a.artifact) && same(v.artifacts.map(a => a.artifact),[...RAW_ARTIFACTS].sort()) && v.artifacts.every(a => accountingInvariant(a)) && ['total','owned','quarantined_ambiguous','quarantined_unresolved','diagnostic_count'].every(k => v[k] === v.artifacts.reduce((n,a) => n+a[k],0));
}
function diagnosticInvariant(v,record) {
  if (!span(v)) return false;
  if (['malformed_identifier','unclosed_atom','unsupported_fence'].includes(v.code) && (v.start_utf16 === null || !['description','summary','content'].includes(v.key))) return false;
  if (v.start_utf16 !== null && (!['description','summary','content'].includes(v.key) || (record && (!Object.hasOwn(record.fields,v.key) || v.end_utf16 > record.fields[v.key].length)))) return false;
  const { diagnostic_id,...key } = v; return diagnostic_id === hashRaw('diagnostic',key);
}
function postingInvariant(v,index) {
  if (!v.search_value || !originInvariant(v.origin) || v.origin.kind !== { entity:'metadata_entity',field:'metadata_field',identifier_mention:'identifier_mention' }[v.candidate_kind]) return false;
  if (v.candidate_kind === 'entity' ? v.name !== v.entity_ref.id : !validSelector(v.name)) return false;
  if (v.candidate_kind === 'identifier_mention' && (v.search_value !== v.origin.token || v.name !== v.origin.token)) return false;
  if (!index) return true;
  const s = recordsMap(index).get(v.origin.record_ref);
  if (!s || s.disposition !== 'owned' || !same(s.entity_ref,v.entity_ref) || !originInvariant(v.origin,s.core)) return false;
  const f = s.core.fields;
  if (v.candidate_kind === 'identifier_mention') return true; // token grammar/span checked; lexer recomputation is compiler/verifier responsibility.
  if (v.candidate_kind === 'entity') return [f.id,f.name,f.canonicalName,f.ontologyId,f.description,...f.aliases.split(';').map(a => a.trim()).filter(Boolean)].includes(v.search_value);
  const key = validSelector(f.fieldName) ? 'fieldName' : 'mssqlColumn';
  return validSelector(f[key]) && v.origin.metadata_key === key && v.name === f[key] && [f[key],f.name,f.description].includes(v.search_value);
}
function manifestInvariant(v,{ index } = {}) {
  if (!fileList(v.runtime_files) || !invariant('Compiler',v.compiler) || !same(v.environment,v.compiler.environment) || !same(v.sources,[...RAW_SOURCE_SEALS].sort((a,b) => cmp(a.artifact,b.artifact))) || v.base_manifest_sha256 !== RAW_BASE_MANIFEST_SHA256 || !accountingInvariant(v.accounting)) return false;
  if (v.runtime_code_sha256 !== hashRaw('runtime-closure',{ files:v.runtime_files,environment:v.environment })) return false;
  if (v.data_bytes !== v.sources.reduce((n,s) => n+s.bytes,0)+v.index.bytes || v.data_bytes+Buffer.byteLength(canonicalJson(v)) > RAW_LIMITS.max_data_bytes) return false;
  const snapshot = { format:v.index.format,contract_version:v.contract_version,canonicalization:v.canonicalization,base_manifest_sha256:v.base_manifest_sha256,compiler_closure_sha256:v.compiler.closure_sha256,runtime_code_sha256:v.runtime_code_sha256,worker_generation_id:v.worker_generation_id,environment:v.environment,sources:v.sources,index_sha256:v.index.sha256 };
  if (v.snapshot_id !== hashRaw('snapshot',snapshot)) return false;
  if (index) {
    const bytes = Buffer.from(canonicalJson(index));
    if (bytes.length !== v.index.bytes || sha256(bytes) !== v.index.sha256 || !same(index.accounting,v.accounting) || !same(index.sources,v.sources)) return false;
    for (const k of ['base_manifest_sha256','runtime_code_sha256','worker_generation_id','environment']) if (!same(index[k],v[k])) return false;
    if (index.compiler_closure_sha256 !== v.compiler.closure_sha256) return false;
  }
  return true;
}
function indexInvariant(v,{ manifest } = {}) {
  if (v.base_manifest_sha256 !== RAW_BASE_MANIFEST_SHA256 || !same(v.sources,[...RAW_SOURCE_SEALS].sort((a,b) => cmp(a.artifact,b.artifact))) || !accountingInvariant(v.accounting) || !sortedBy(v.records,(a,b) => physicalOrder(a.core,b.core)) || !unique(v.records,r => r.core.record_ref) || !ordered(v.owners,o => o.entity_ref.id) || !ordered(v.owner_lookup,l => l.literal_ref) || !unique(v.postings,canonicalJson)) return false;
  const map = recordsMap(v), diagnostics = new Map(v.diagnostics.map(d => [d.diagnostic_id,d]));
  const postedRecords = new Set(v.postings.map(p => p.origin.record_ref));
  if (diagnostics.size !== v.diagnostics.length || !sortedBy(v.diagnostics,(a,b) => compareTuple([a.record_ref,a.code,a.key,a.start_utf16,a.end_utf16],[b.record_ref,b.code,b.key,b.start_utf16,b.end_utf16]))) return false;
  const usedDiagnostics = new Set();
  for (const s of v.records) {
    if (!invariant('StoredRecord',s) || !coreInvariant(s.core,v.sources.find(src => src.artifact === s.core.artifact))) return false;
    if (!s.diagnostic_ids.every(id => { const d = diagnostics.get(id); usedDiagnostics.add(id); return d?.record_ref === s.core.record_ref && diagnosticInvariant(d,s.core); })) return false;
    const ds = s.diagnostic_ids.map(id => diagnostics.get(id));
    if (!ds.some(d => d.code === 'semantic_not_assessed') || !ds.some(d => d.code === (s.disposition === 'owned' ? 'owned_record' : s.disposition === 'quarantined_ambiguous' ? 'ambiguous_owner_ref' : 'unresolved_owner_ref'))) return false;
    if (ds.some(d => d.code === 'no_hint_postings') !== !postedRecords.has(s.core.record_ref)) return false;
    if (!sortedBy(ds,(a,b) => compareTuple([a.record_ref,a.code,a.key,a.start_utf16,a.end_utf16],[b.record_ref,b.code,b.key,b.start_utf16,b.end_utf16]))) return false;
  }
  if (usedDiagnostics.size !== diagnostics.size) return false;
  const roots = v.records.filter(s => s.disposition === 'owned' && s.core.kind === 'entity_metadata');
  if (roots.length !== v.owners.length) return false;
  for (const o of v.owners) {
    const root = map.get(o.entity_record_ref);
    if (!root || root.core.kind !== 'entity_metadata' || root.disposition !== 'owned' || !same(root.entity_ref,o.entity_ref)) return false;
    if (!same(o.record_refs,v.records.filter(r => r.disposition === 'owned' && same(r.entity_ref,o.entity_ref)).map(r => r.core.record_ref))) return false;
  }
  const lookup = new Map();
  for (const s of v.records.filter(r => r.core.kind === 'entity_metadata')) for (const text of new Set([s.core.fields.id,s.core.fields.ontologyId])) if (shape(S.Id,text)) { if (!lookup.has(text)) lookup.set(text,[]); lookup.get(text).push(s.core.record_ref); }
  if (!same(v.owner_lookup,[...lookup].sort(([a],[b]) => cmp(a,b)).map(([literal_ref,entity_record_refs]) => ({ literal_ref,entity_record_refs })))) return false;
  const entityRecords = v.records.filter(r => r.core.kind === 'entity_metadata');
  const rootDisposition = new Map(entityRecords.map(r => [r.core.record_ref,
    !shape(S.Id,r.core.record_id) ? 'quarantined_unresolved'
      : entityRecords.filter(e => e.core.record_id === r.core.record_id).length > 1 ? 'quarantined_ambiguous' : 'owned']));
  for (const r of v.records) {
    const isEntity = r.core.kind === 'entity_metadata';
    const targets = isEntity ? [r.core.record_ref] : lookup.get(r.ownership.literal_ref) || [];
    const disposition = targets.length === 0 ? 'quarantined_unresolved' : targets.length > 1 ? 'quarantined_ambiguous' : rootDisposition.get(targets[0]);
    if (r.disposition !== disposition) return false;
    if (disposition === 'owned' && r.entity_ref.id !== map.get(targets[0]).core.record_id) return false;
  }
  for (const a of v.accounting.artifacts) {
    const rs = v.records.filter(s => s.core.artifact === a.artifact);
    if (a.total !== rs.length || ['owned','quarantined_ambiguous','quarantined_unresolved'].some(k => a[k] !== rs.filter(s => s.disposition === k).length) || a.diagnostic_count !== v.diagnostics.filter(d => map.get(d.record_ref)?.core.artifact === a.artifact).length) return false;
    if (a.total !== v.sources.find(s => s.artifact === a.artifact).record_count) return false;
  }
  if (!v.postings.every(p => postingInvariant(p,v))) return false;
  const originTuple = o => { const r = map.get(o.record_ref).core; return [r.artifact,r.physical.byte_start,o.body_field,o.start_utf16,o.end_utf16,o.kind]; };
  if (!sortedBy(v.postings,(a,b) => compareTuple([a.candidate_kind,a.entity_ref.id,a.name,a.search_value,...originTuple(a.origin)],[b.candidate_kind,b.entity_ref.id,b.name,b.search_value,...originTuple(b.origin)]))) return false;
  if (manifest && !manifestInvariant(manifest,{ index:v })) return false;
  return true;
}
function invariant(name,v,context = {}) {
  switch (name) {
    case 'Physical': return v.byte_start < v.byte_end && v.line_start <= v.line_end;
    case 'DiscoverInput': return /\S/u.test(v.query) && !(v.kind === 'entity' && Object.hasOwn(v,'entity_ref'));
    case 'EvidenceInput': return unique(v.requests,r => r.id) && new Set(v.requests.map(r => ownerKey(r.entity_ref))).size <= 2;
    case 'RawRequest': return v.params.name === 'erp_subject.discover' ? validateDiscoverInput(v.params.arguments) : validateEvidenceInput(v.params.arguments);
    case 'RecordCore': return coreInvariant(v,context.source);
    case 'Record': return coreInvariant(v,context.source) && recordOwnership(v);
    case 'Origin': return originInvariant(v,context.record);
    case 'Related': return (v.source_path === null) === (v.section_order === null) && (v.relation !== 'same_owner_source_path' || !!v.source_path);
    case 'Candidate': return v.related_records.every(r => invariant('Related',r)) && candidateInvariant(v,context.index);
    case 'DiscoverSuccess': {
      if ((v.status === 'candidates') !== (v.candidates.length > 0) || (v.status !== 'candidates' && v.has_more) || !unique(v.candidates,c => c.candidate_id) || !v.candidates.every(c => invariant('Candidate',c,context))) return false;
      if (context.manifest && v.snapshot_id !== context.manifest.snapshot_id) return false;
      const input = context.input;
      if (input && context.index && (!validateDiscoverInput(input) || !discoveryContext(v,{ index:context.index,input }))) return false;
      return !input || (validateDiscoverInput(input) && v.correlation_id === (input.correlation_id ?? null) && v.candidates.length <= (input.limit ?? 5) && (!input.expected_snapshot_id || v.snapshot_id === input.expected_snapshot_id) && v.candidates.every(c => (input.kind === 'entity' ? c.candidate_kind === 'entity' : input.kind === 'identifier_mention' ? c.candidate_kind === 'identifier_mention' : c.candidate_kind !== 'entity') && (!input.entity_ref || same(c.entity_ref,input.entity_ref))) && (!['owner_not_found','ambiguous_owner_ref'].includes(v.status) || !!input.entity_ref));
    }
    case 'DeliveryResult': return deliveryInvariant(v);
    case 'EvidenceSuccess': return evidenceInvariant(v,context);
    case 'ToolError': {
      if (context.input) {
        const validInput = v.operation === 'discovery' ? validateDiscoverInput(context.input) : validateEvidenceInput(context.input);
        if (v.correlation_id !== (validInput ? context.input.correlation_id ?? null : null)) return false;
      }
      if (v.code !== 'SNAPSHOT_MISMATCH') return v.retry === 'operator_required' && v.expected_snapshot_id === null && v.active_snapshot_id === null;
      if (v.retry !== 'new_turn' || v.expected_snapshot_id === null || v.active_snapshot_id === null || v.expected_snapshot_id === v.active_snapshot_id) return false;
      if (context.manifest && v.active_snapshot_id !== context.manifest.snapshot_id) return false;
      return !context.input || (v.expected_snapshot_id === (v.operation === 'discovery' ? context.input.expected_snapshot_id : context.input.snapshot_id) && v.correlation_id === (context.input.correlation_id ?? null) && (!context.manifest || v.active_snapshot_id === context.manifest.snapshot_id));
    }
    case 'DiscoverOutput': return validateRawOutput('discovery',v,context);
    case 'EvidenceOutput': return validateRawOutput('evidence',v,context);
    case 'CallResult': return v.isError === (v.structuredContent.mode === 'error') && validateRawOutput(v.structuredContent.mode === 'error' ? v.structuredContent.operation : v.structuredContent.mode,v.structuredContent,context) && v.content[0].text === canonicalJson(v.structuredContent);
    case 'RPCSuccess': return invariant('CallResult',v.result,context) && (!context.request || (v.id === context.request.id && validateRawOutput(context.request.params.name === 'erp_subject.discover' ? 'discovery' : 'evidence',v.result.structuredContent,{ ...context,input:context.request.params.arguments })));
    case 'RPCError': return v.error.message === RAW_RPC_MESSAGES[v.error.code] && (!context.request || v.id === context.request.id);
    case 'Diagnostic': return diagnosticInvariant(v,context.record);
    case 'StoredRecord': return coreInvariant(v.core,context.source) && (v.disposition === 'owned') === (v.entity_ref !== null) && recordOwnership(v,v.core);
    case 'Owner': return v.record_refs.includes(v.entity_record_ref);
    case 'Posting': return postingInvariant(v,context.index);
    case 'ArtifactAccounting': case 'Accounting': return accountingInvariant(v);
    case 'Compiler': return fileList(v.files) && v.closure_sha256 === hashRaw('compiler-closure',{ files:v.files,environment:v.environment,abi:v.abi,lexer:v.lexer });
    case 'DataManifest': return manifestInvariant(v,context);
    case 'IndexPayload': return indexInvariant(v,context);
    case 'TrustedDataGeneration': return v.manifest_path === v.data_root + '/manifest.json';
    case 'RawWorkerJob': return validateRawRequest(v.request) && invariant('TrustedDataGeneration',v.context.trustedDataGeneration) && ['worker_generation_id','runtime_code_sha256'].every(k => v.context.code[k] === v.context.trustedDataGeneration[k]);
    case 'RawWorkerResult': {
      if (!validateRawType(v.response.result ? 'RPCSuccess' : 'RPCError',v.response,context)) return false;
      if (context.trusted && ['worker_generation_id','manifest_sha256'].some(k => v[k] !== context.trusted[k])) return false;
      const body = v.response.result?.structuredContent;
      return v.data_state === 'validated' ? v.snapshot_id !== null && !!body && (body.mode === 'error' ? body.code === 'SNAPSHOT_MISMATCH' && body.active_snapshot_id === v.snapshot_id : body.snapshot_id === v.snapshot_id) && (!context.trusted || v.snapshot_id === context.trusted.snapshot_id) : v.snapshot_id === null && (!body || body.mode === 'error' && body.code !== 'SNAPSHOT_MISMATCH');
    }
    case 'RawWorkerDataReady': return !context.trusted || ['worker_generation_id','manifest_sha256','snapshot_id'].every(k => v[k] === context.trusted[k]);
    case 'Transcript': return v.calls.every(c => validateRawRequest(c.request) && validateRawType(c.response.result ? 'RPCSuccess' : 'RPCError',c.response,{ ...context,request:c.request }));
    case 'CompileInput': return invariant('Compiler',v.compiler) && fileList(v.runtime_files) && same(v.environment,v.compiler.environment) && v.runtime_code_sha256 === hashRaw('runtime-closure',{ files:v.runtime_files,environment:v.environment }) && v.base_manifest_sha256 === RAW_BASE_MANIFEST_SHA256 && unique(v.inputs,i => i.artifact) && v.inputs.every(i => { const seal = RAW_SOURCE_SEALS.find(s => s.artifact === i.artifact); return i.bytes.length === seal.bytes && sha256(i.bytes) === seal.sha256; });
    case 'CompileResult': {
      if (!v.ok) return true;
      if (v.index_bytes.length + v.manifest_bytes.length > RAW_LIMITS.max_data_bytes) return false;
      const index = parseStrictJson(v.index_bytes), manifest = parseStrictJson(v.manifest_bytes);
      return Buffer.from(v.index_bytes).equals(Buffer.from(canonicalJson(index))) && Buffer.from(v.manifest_bytes).equals(Buffer.from(canonicalJson(manifest))) && v.snapshot_id === manifest.snapshot_id && validateRawType('IndexPayload',index) && validateRawType('DataManifest',manifest,{ index });
    }
    case 'ArtifactVerification': return !v.valid || invariant('Accounting',v.accounting);
    default: return true; // Scalar/closed shape is the complete invariant for this type.
  }
}
