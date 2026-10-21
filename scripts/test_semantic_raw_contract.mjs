import assert from 'node:assert/strict';
import { test } from 'node:test';
const api = await import('./lib/semantic_raw_contract.mjs').catch(e => {
  if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return {};
});
const hex = 'a'.repeat(64), other = 'b'.repeat(64);
const owner = { namespace: 'OWAOntology', id: 'SYNTH_ENTITY' };
const input = () => ({ snapshot_id: hex, requests: [{ id: 'example', entity_ref: owner, record_refs: [other] }] });
const rpc = (arguments_, name = 'erp_evidence.get') => ({ jsonrpc: '2.0', id: -7, method: 'tools/call', params: { name, arguments: arguments_ } });
const requireApi = name => assert.equal(typeof api[name], 'function', `missing ${name}`);

test('canonical object order uses unsigned UTF16 and preserves literal Unicode', () => {
  requireApi('canonicalJson');
  assert.equal(api.canonicalJson({ z: 'ł', a: '\n', '\u{10000}': 0, '\uE000': 1 }), '{"a":"\\n","z":"ł","𐀀":0,"":1}');
  assert.equal(api.canonicalJson('\u0001\b\f\r\t/\u2028\u2029'), '"\\u0001\\b\\f\\r\\t/\u2028\u2029"');
  assert.equal(api.canonicalJson({ '2': 2, '10': 10 }), '{"10":10,"2":2}');
});
test('canonical serialization rejects silent coercion, sparse arrays, accessors and invalid scalars', () => {
  requireApi('canonicalJson');
  const cycle = {}; cycle.x = cycle;
  const accessor = Object.defineProperty({}, 'x', { enumerable: true, get() { throw Error('getter executed'); } });
  for (const value of [undefined, NaN, Infinity, -0, 1.2, Number.MAX_SAFE_INTEGER + 1, '\ud800', '\udfff', { x: undefined }, [undefined], Array(1), new Date(), 1n, cycle, accessor, { [Symbol()]: 1 }]) {
    assert.throws(() => api.canonicalJson(value), undefined, String(typeof value));
  }
  assert.equal(api.canonicalJson(-7), '-7');
});
test('strict decoder rejects duplicate decoded keys, BOM, UTF8, trailing input, negative zero and surrogates', () => {
  requireApi('parseStrictJson');
  assert.deepEqual(api.parseStrictJson(Buffer.from('{"__proto__":1,"a":[true,null,"😀"]}')), JSON.parse('{"__proto__":1,"a":[true,null,"😀"]}'));
  for (const value of ['{"a":1,"\\u0061":2}', '{"x":{"a":1,"a":2}}', '\ufeff{}', '{} {}', '-0', '1e999', '"\\ud800"', '"\ud800"', '{"a":01}', Buffer.from([0xc0, 0xaf]), Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])]) {
    assert.throws(() => api.parseStrictJson(value));
  }
  assert.equal(api.parseStrictJson('0.25'), 0.25, 'internal timing may be fractional');
});
test('strict discover input uses UTF16 limits, closed keys, exact optional/null rules and foreign namespace shape', () => {
  requireApi('validateDiscoverInput');
  const valid = { query: '😀'.repeat(250), kind: 'field', entity_ref: { namespace: 'ForeignKB', id: 'x' }, correlation_id: 'x' };
  assert.equal(api.validateDiscoverInput(valid), true, 'foreign shape must reach upstream AccessDenied');
  for (const value of [{ ...valid, query: '😀'.repeat(251) }, { ...valid, query: ' \t' }, { ...valid, kind: 'entity' }, { ...valid, entity_ref: null }, { ...valid, limit: 0 }, { ...valid, extra: 1 }, { ...valid, correlation_id: null }, { ...valid, correlation_id: '\u007f' }, { ...valid, entity_ref: { namespace: '', id: 'x' } }]) assert.equal(api.validateDiscoverInput(value), false);
});
test('evidence rejects duplicate IDs/refs, empty/null/extras and more than two owners', () => {
  requireApi('validateEvidenceInput');
  assert.equal(api.validateEvidenceInput(input()), true);
  assert.equal(api.validateEvidenceInput({ ...input(), requests: [{ ...input().requests[0], entity_ref: { namespace: 'ForeignKB', id: 'x' } }] }), true);
  for (const value of [null, {}, { ...input(), extra: 0 }, { ...input(), requests: [] }, { ...input(), requests: [input().requests[0], input().requests[0]] }, { ...input(), requests: [{ ...input().requests[0], record_refs: [other, other] }] }, { ...input(), requests: [0, 1, 2].map(n => ({ id: `r${n}`, entity_ref: { ...owner, id: `o${n}` }, record_refs: [hex] })) }, { ...input(), correlation_id: '' }]) assert.equal(api.validateEvidenceInput(value), false);
});
test('closed RPC call couples tool/arguments and accepts only signed safe integer or bounded string ids', () => {
  requireApi('validateRawRequest');
  assert.equal(api.validateRawRequest(rpc(input())), true);
  assert.equal(api.validateRawRequest(rpc({ query: 'x', kind: 'entity' }, 'erp_subject.discover')), true);
  for (const value of [rpc(input(), 'unknown'), rpc(input(), 'erp_subject.discover'), { ...rpc(input()), id: null }, { ...rpc(input()), id: -0 }, { ...rpc(input()), id: 1.2 }, { ...rpc(input()), id: '' }, { ...rpc(input()), extra: 1 }]) assert.equal(api.validateRawRequest(value), false);
});

function synthetic() {
  const artifact = 'exports/owa_ontology/v1/ontology_entity.csv';
  const fields = Object.fromEntries('id,name,description,semanticType,canonicalName,ontologyId,verificationStatus,confidenceLevel,businessDomain,mainTable,mcpReadTools,mcpWriteTools,aliases,summary'.split(',').map(k => [k, '']));
  Object.assign(fields, { id: 'SYNTH_ENTITY', name: 'Synthetic', semanticType: 'ontology_entity', canonicalName: 'Synthetic' });
  const source = { artifact, sha256: '9af641619beaffcf5b0b4b7aa6f61c549248af6a824e00c7650d197df2e6ac70', bytes: 220, record_count: 1 };
  const record = { record_ref: '23a414754fb011be8bbe08638342651c022c46267eba30ff6b59a2756766c664', kind: 'entity_metadata', record_id: fields.id, entity_ref: owner, ownership: { via: 'self', literal_ref: fields.id }, artifact, physical: { byte_start: 161, byte_end: 220, line_start: 2, line_end: 2 }, raw_record_sha256: '6c3810c85ee654aa632833b641848dda19353aa06547f511dbf62be13ec6cee7', record_hash: 'cc9faf12b6d1c77a9a689feddcc198c59a0846227acd16a983bbb24eef780838', fields_sha256: '3469bb2ceb01078c7a2cda3b0c2262143e82575d842917fa4c744eff4605a075', fields_utf16: 277, fields, integrity: 'exact_export_record', semantic_completeness: 'not_assessed' };
  const snapshot_id = 'fe0294cf7aeb55c2974d68fb90425d963a0b0a670685603261ff4ab359287b55';
  return { schema_version: '0.1', mode: 'evidence', snapshot_id, assessment: 'source_records_only', semantic_assessment: 'not_performed', correlation_id: null, results: [{ id: 'example', entity_ref: owner, requested_refs: [record.record_ref], status: 'returned_all', returned_refs: [record.record_ref], context_refs: [record.record_ref], missing: [] }], records: [record], sources: [source], budget: { max_records: 8, max_fields_utf16: 16000, max_entity_refs: 2, used_records: 1, used_fields_utf16: 277, used_entity_refs: 1 } };
}
test('full normative synthetic vector binds all fields/source/record/ref/snapshot hashes and 277 charge', () => {
  requireApi('hashRaw'); requireApi('validateRawOutput');
  const out = synthetic(), r = out.records[0], s = out.sources[0];
  const bytes = Buffer.from(Object.keys(r.fields).join(',') + '\nSYNTH_ENTITY,Synthetic,,ontology_entity,Synthetic,,,,,,,,,\n');
  assert.equal(bytes.length, 220); assert.equal(api.sha256(bytes), s.sha256);
  assert.equal(api.canonicalJson(r.fields).length, 277);
  assert.equal(api.sha256(Buffer.from(api.canonicalJson(r.fields))), r.fields_sha256);
  assert.equal(api.sha256(bytes.subarray(161)), r.raw_record_sha256);
  assert.equal(api.hashRaw('record', { artifact: r.artifact, source_sha256: s.sha256, physical: r.physical, fields: r.fields }), r.record_hash);
  assert.equal(api.hashRaw('record-ref', { artifact: r.artifact, source_sha256: s.sha256, physical: r.physical, record_hash: r.record_hash, raw_record_sha256: r.raw_record_sha256 }), r.record_ref);
  assert.equal(api.hashRaw('synthetic-snapshot', { fixture: 'one-owner-wire-example', source_sha256: s.sha256 }), out.snapshot_id);
  assert.equal(api.validateRawOutput('evidence', out), true);
});
test('evidence cross validation rejects altered hashes, owner/context/partition/status/budget and input mismatch', () => {
  requireApi('validateRawOutput');
  const mutations = [o => o.records[0].fields.description = 'changed', o => o.records[0].physical.byte_end++, o => o.records[0].entity_ref = { ...owner, id: 'different' }, o => o.records.push(o.records[0]), o => o.results[0].context_refs = [], o => o.results[0].returned_refs = [], o => o.results[0].status = 'returned_none', o => o.results[0].requested_refs.push(hex), o => o.budget.used_fields_utf16++, o => o.sources.push(o.sources[0]), o => o.records[0].fields.extra = '', o => o.results[0].extra = 1, o => o.records[0].physical.line_start = 0];
  for (const mutate of mutations) { const out = synthetic(); mutate(out); assert.equal(api.validateRawOutput('evidence', out), false, mutate.toString()); }
  assert.equal(api.validateRawOutput('evidence', synthetic(), { input: input() }), false);
  const out = synthetic();
  const i = { snapshot_id: out.snapshot_id, requests: [{ id: 'example', entity_ref: owner, record_refs: [out.records[0].record_ref] }] };
  assert.equal(api.validateRawOutput('evidence', out, { input: i, manifest: { snapshot_id: out.snapshot_id } }), true);
  assert.equal(api.validateRawOutput('evidence', out, { manifest: { snapshot_id: hex } }), false);
});
test('discovery count/status/identity/origin and contextual owner constraints fail closed', () => {
  requireApi('validateRawOutput');
  const base = { schema_version: '0.1', mode: 'discovery', snapshot_id: hex, assessment: 'source_records_only', semantic_assessment: 'not_performed', correlation_id: null, status: 'no_candidates', candidates: [], has_more: false };
  assert.equal(api.validateRawOutput('discovery', base), true);
  assert.equal(api.validateRawOutput('discovery', { ...base, has_more: true }), false);
  const candidate = { candidate_id: api.hashRaw('candidate', { candidate_kind: 'entity', entity_ref: owner, name: owner.id }), candidate_kind: 'entity', entity_ref: owner, name: owner.id, label: 'Synthetic', metadata_hints: [{ key: 'name', value: 'Synthetic' }], omitted_metadata_keys: [], record_refs: [other], record_ref_count: 1, origins: [{ record_ref: other, kind: 'metadata_entity', metadata_key: 'id', body_field: null, start_utf16: null, end_utf16: null, token: null }], origins_count: 1, related_records: [], related_record_count: 0 };
  const out = { ...base, status: 'candidates', candidates: [candidate] };
  assert.equal(api.validateRawOutput('discovery', out), true);
  for (const mutate of [o => o.candidates[0].origins[0].token = 'invented', o => o.candidates[0].candidate_id = hex, o => o.candidates[0].record_ref_count = 0, o => o.candidates[0].metadata_hints.push({ key: 'name', value: 'again' }), o => o.candidates[0].omitted_metadata_keys.push('name')]) { const o = structuredClone(out); mutate(o); assert.equal(api.validateRawOutput('discovery', o), false); }
  assert.equal(api.validateRawOutput('discovery', out, { index: { records: [] } }), false);
});
test('fixed errors and canonical CallResult parity, operation and snapshot couplings', () => {
  for (const name of ['rawToolError', 'rawRpcError', 'rawCallResult', 'validateRawType']) requireApi(name);
  const err = api.rawToolError('evidence', 'SNAPSHOT_MISMATCH', null, hex, other);
  assert.equal(api.validateRawOutput('evidence', err), true);
  assert.equal(api.validateRawOutput('discovery', err), false);
  assert.equal(api.validateRawOutput('evidence', { ...err, active_snapshot_id: null }), false);
  assert.equal(api.validateRawOutput('evidence', { ...err, retry: 'operator_required' }), false);
  assert.throws(() => api.rawToolError('evidence', 'arbitrary exception'));
  const result = api.rawCallResult(synthetic());
  assert.equal(result.content[0].text, api.canonicalJson(result.structuredContent));
  assert.equal(api.validateRawType('CallResult', result), true);
  assert.equal(api.validateRawType('CallResult', { ...result, isError: true }), false);
  assert.equal(api.validateRawType('CallResult', { ...result, content: [{ type: 'text', text: '{}' }] }), false);
  for (const [code, message] of [[-32700, 'Parse error.'], [-32600, 'Invalid request.'], [-32601, 'Method unavailable.'], [-32602, 'Invalid parameters.'], [-32603, 'Semantic execution unavailable.'], [-32001, 'Access denied.'], [-32004, 'Semantic capacity busy.']]) assert.deepEqual(api.rawRpcError(null, code), { jsonrpc: '2.0', id: null, error: { code, message } });
});
test('all nested closed ABI schemas are exported and reject extension/required/null violations', () => {
  requireApi('validateRawType'); assert(api.RAW_SCHEMAS);
  for (const name of ['Physical', 'Source', 'EFields', 'FFields', 'CFields', 'RecordCore', 'Record', 'Origin', 'Related', 'Candidate', 'DeliveryResult', 'Budget', 'Diagnostic', 'StoredRecord', 'Owner', 'OwnerLookup', 'Posting', 'ArtifactAccounting', 'Accounting', 'FileEntry', 'Environment', 'Compiler', 'IndexPayload', 'DataManifest', 'TrustedDataGeneration', 'CodeBinding', 'AuthorizedScope', 'RawWorkerJob', 'RawWorkerReady', 'RawWorkerDataReady', 'RawWorkerResult', 'RawWorkerFailure', 'Transcript', 'Violation', 'CompileInput', 'CompileResult', 'ArtifactVerification', 'TranscriptVerification']) {
    assert(api.RAW_SCHEMAS[name], name);
    assert.equal(api.validateRawType(name, null), false, name);
    assert.equal(api.validateRawType(name, { extra: true }), false, name);
  }
  assert.equal(api.validateRawType('Environment', { node_version: 'v18.19.1', unicode_version: '15.0', icu_version: '73.2' }), true);
  assert.equal(api.validateRawType('Environment', { node_version: 'v18\n', unicode_version: '15', icu_version: '73' }), false);
  const ready = { type: 'ready', generation: hex };
  assert.equal(api.validateRawType('RawWorkerReady', ready), true);
  assert.equal(api.validateRawType('RawWorkerReady', { ...ready, snapshot_id: hex }), false);
  assert.equal(api.validateRawType('RawWorkerFailure', { type: 'request-error', jobId: 'x', handlerWallMs: .25 }), true);
  assert.equal(api.validateRawType('RawWorkerFailure', { type: 'request-error', jobId: 'x', handlerWallMs: -0 }), false);
});

test('related nullability, no-context missing partition and unique two-owner batch invariants', () => {
  requireApi('validateRawType');
  assert.equal(api.validateRawType('Related', { record_ref: hex, relation: 'same_owner', source_path: null, section_order: '1' }), false);
  const out = synthetic(), ref = out.records[0].record_ref;
  out.results[0].requested_refs = [hex]; out.results[0].returned_refs = [];
  out.results[0].missing = [{ record_ref: hex, reason: 'record_not_found' }]; out.results[0].status = 'returned_none';
  assert.equal(api.validateRawOutput('evidence',out), true, 'context charged even when explicit ref is missing');
  out.results[0].context_refs = []; out.records = []; out.sources = []; Object.assign(out.budget,{ used_records:0,used_fields_utf16:0,used_entity_refs:0 });
  assert.equal(api.validateRawOutput('evidence',out), false, 'known owner lookup cannot happen without mandatory E');
  out.results[0].missing[0].reason = 'owner_not_found';
  assert.equal(api.validateRawOutput('evidence',out), true);
  assert.equal(api.validateRawType('Physical',{ byte_start:0,byte_end:0,line_start:1,line_end:1 }),false);
  assert.equal(api.validateRawType('Physical',{ byte_start:0,byte_end:1,line_start:2,line_end:1 }),false);
  assert.notEqual(ref,hex);
});
test('worker unavailable/validated state, request correlation and trusted identity coupling', () => {
  requireApi('validateRawType');
  const out = synthetic(), response = { jsonrpc:'2.0',id:1,result:api.rawCallResult(out) };
  const msg = { type:'result',jobId:'j',response,handlerWallMs:.25,worker_generation_id:hex,manifest_sha256:other,snapshot_id:out.snapshot_id,data_state:'validated' };
  assert.equal(api.validateRawType('RawWorkerResult',msg),true);
  assert.equal(api.validateRawType('RawWorkerResult',{ ...msg,snapshot_id:null }),false);
  assert.equal(api.validateRawType('RawWorkerResult',{ ...msg,data_state:'unavailable',snapshot_id:null }),false);
  const denied = { ...msg,data_state:'unavailable',snapshot_id:null,response:api.rawRpcError(1,-32001) };
  assert.equal(api.validateRawType('RawWorkerResult',denied),true);
  assert.equal(api.validateRawType('RawWorkerResult',denied,{ trusted:{ worker_generation_id:other,manifest_sha256:other } }),false);
  assert.equal(api.validateRawType('RPCSuccess',response,{ request:{ ...rpc(input()),id:2 } }),false);
  assert.equal(api.validateRawType('RPCError',{ ...api.rawRpcError(null,-32001),error:{ code:-32001,message:'secret path' } }),false);
  const descriptor = { abi:'owa-raw-data-generation/1',data_root:'/tmp/opencode/stage',manifest_path:'/tmp/opencode/stage/manifest.json',manifest_sha256:hex,snapshot_id:hex,worker_generation_id:hex,runtime_code_sha256:hex };
  assert.equal(api.validateRawType('TrustedDataGeneration',descriptor),true);
  for (const path of ['/tmp/opencode/stage/','/tmp/../stage','/tmp//stage','relative','/tmp/%2e%2e/stage']) assert.equal(api.validateRawType('TrustedDataGeneration',{ ...descriptor,data_root:path }),false);
});
test('metadata selectors preserve quotes and spaces; mention grammar and diagnostic spans remain independent', () => {
  requireApi('validSelector'); requireApi('validateRawType');
  for (const name of ['`Twr_OpeZalID`', ' "quoted" ', '   ', '😀'.repeat(64)]) assert.equal(api.validSelector(name),true);
  for (const name of ['', '😀'.repeat(65), 'x\n', '\ud800']) assert.equal(api.validSelector(name),false);
  const d = { record_ref:hex,code:'malformed_identifier',key:'content',start_utf16:0,end_utf16:2 };
  const diagnostic = { ...d,diagnostic_id:api.hashRaw('diagnostic',d) };
  assert.equal(api.validateRawType('Diagnostic',diagnostic,{ record:{ fields:{ content:'😀' } } }),true);
  assert.equal(api.validateRawType('Diagnostic',diagnostic,{ record:{ fields:{ content:'x' } } }),false);
  assert.equal(api.validateRawType('Diagnostic',{ ...diagnostic,start_utf16:null,end_utf16:null }),false);
  assert.equal(api.validateRawType('Origin',{ record_ref:hex,kind:'identifier_mention',metadata_key:null,body_field:'content',start_utf16:0,end_utf16:3,token:'`x`' }),false);
  assert.equal(api.validateRawType('Environment',{ node_version:'v18.19.1\n',unicode_version:'15.0',icu_version:'73' }),false);
});

// Synthetic full-cardinality data ABI (not a source import or compiler result).
// Derivation and production source byte verification belong to later tasks.
function fullAbi() {
  const sources = [...api.RAW_SOURCE_SEALS].sort((a,b) => a.artifact < b.artifact ? -1 : 1);
  const records = [], diagnostics = [], owners = [], owner_lookup = [];
  for (const src of sources) for (let n=0;n<src.record_count;n++) {
    const type = api.RAW_ARTIFACTS.indexOf(src.artifact), fields = Object.fromEntries(api.RAW_HEADERS[src.artifact].map(k => [k,'']));
    fields.id = `id_${type}_${n}`;
    const rootId = type === 0 ? fields.id : 'id_0_0';
    if (type === 1) fields.entityRefId = rootId;
    if (type === 2) { fields.sourceDocumentRefId = rootId; fields.sectionOrder = '1'; }
    const physical = { byte_start:n*10+200,byte_end:n*10+210,line_start:n+2,line_end:n+2 };
    const record_hash = api.hashRaw('record',{ artifact:src.artifact,source_sha256:src.sha256,physical,fields });
    const record_ref = api.hashRaw('record-ref',{ artifact:src.artifact,source_sha256:src.sha256,physical,record_hash,raw_record_sha256:hex });
    const core = { record_ref,kind:['entity_metadata','field_metadata','source_chunk'][type],record_id:fields.id,artifact:src.artifact,physical,raw_record_sha256:hex,record_hash,fields_sha256:api.sha256(Buffer.from(api.canonicalJson(fields))),fields_utf16:api.canonicalJson(fields).length,fields,integrity:'exact_export_record',semantic_completeness:'not_assessed' };
    const ds = ['no_hint_postings','owned_record','semantic_not_assessed'].map(code => { const d = { record_ref,code,key:null,start_utf16:null,end_utf16:null }; return { ...d,diagnostic_id:api.hashRaw('diagnostic',d) }; });
    diagnostics.push(...ds);
    records.push({ core,disposition:'owned',entity_ref:{ namespace:'OWAOntology',id:rootId },ownership:{ via:['self','entityRefId','sourceDocumentRefId'][type],literal_ref:rootId },diagnostic_ids:ds.map(d => d.diagnostic_id) });
  }
  for (const r of records.filter(r => r.core.kind === 'entity_metadata')) {
    owners.push({ entity_ref:r.entity_ref,entity_record_ref:r.core.record_ref,record_refs:records.filter(s => s.entity_ref.id === r.entity_ref.id).map(s => s.core.record_ref) });
    owner_lookup.push({ literal_ref:r.core.record_id,entity_record_refs:[r.core.record_ref] });
  }
  owners.sort((a,b) => a.entity_ref.id < b.entity_ref.id ? -1 : 1); owner_lookup.sort((a,b) => a.literal_ref < b.literal_ref ? -1 : 1);
  diagnostics.sort((a,b) => a.record_ref === b.record_ref ? a.code < b.code ? -1 : 1 : a.record_ref < b.record_ref ? -1 : 1);
  const accounting = { artifacts:sources.map(s => ({ artifact:s.artifact,total:s.record_count,owned:s.record_count,quarantined_ambiguous:0,quarantined_unresolved:0,diagnostic_count:s.record_count*3 })),total:366,owned:366,quarantined_ambiguous:0,quarantined_unresolved:0,diagnostic_count:1098 };
  const environment = { node_version:process.version,unicode_version:process.versions.unicode,icu_version:process.versions.icu }, files = [{ path:'scripts/a.mjs',bytes:10,sha256:hex }];
  const compiler = { abi:'owa-raw-compiler/1',lexer:'source-lexer-esj4gr-v1',files,environment };
  compiler.closure_sha256 = api.hashRaw('compiler-closure',compiler);
  const index = { format:'owa-record-index/1',contract_version:'0.1',canonicalization:'cjson-utf16-v1',base_manifest_sha256:api.RAW_BASE_MANIFEST_SHA256,compiler_closure_sha256:compiler.closure_sha256,runtime_code_sha256:api.hashRaw('runtime-closure',{ files,environment }),worker_generation_id:hex,environment,sources,records,owners,owner_lookup,postings:[],diagnostics,accounting };
  const bytes = Buffer.from(api.canonicalJson(index));
  const manifest = { kind:'owa-raw-record-poc',manifest_version:1,contract_version:'0.1',canonicalization:'cjson-utf16-v1',base_manifest_sha256:index.base_manifest_sha256,compiler,runtime_files:files,runtime_code_sha256:index.runtime_code_sha256,worker_generation_id:hex,environment,sources,index:{ path:'index.json',bytes:bytes.length,sha256:api.sha256(bytes),format:'owa-record-index/1' },snapshot_id:hex,data_bytes:sources.reduce((n,s) => n+s.bytes,bytes.length),accounting };
  manifest.snapshot_id = api.hashRaw('snapshot',{ format:index.format,contract_version:index.contract_version,canonicalization:index.canonicalization,base_manifest_sha256:index.base_manifest_sha256,compiler_closure_sha256:index.compiler_closure_sha256,runtime_code_sha256:index.runtime_code_sha256,worker_generation_id:hex,environment,sources,index_sha256:manifest.index.sha256 });
  return { index,manifest };
}
function removeDiagnosticAndRehash({ index,manifest },record,code) {
  const diagnostic = index.diagnostics.find(d => d.record_ref === record.core.record_ref && d.code === code);
  assert(diagnostic,'fixture must contain the diagnostic being removed');
  record.diagnostic_ids = record.diagnostic_ids.filter(id => id !== diagnostic.diagnostic_id);
  index.diagnostics = index.diagnostics.filter(d => d.diagnostic_id !== diagnostic.diagnostic_id);
  index.accounting.diagnostic_count--;
  index.accounting.artifacts.find(a => a.artifact === record.core.artifact).diagnostic_count--;
  manifest.accounting = structuredClone(index.accounting);
  const bytes = Buffer.from(api.canonicalJson(index));
  Object.assign(manifest.index,{ bytes:bytes.length,sha256:api.sha256(bytes) });
  manifest.data_bytes = index.sources.reduce((n,s) => n+s.bytes,bytes.length);
  const { format,contract_version,canonicalization,base_manifest_sha256,compiler_closure_sha256,runtime_code_sha256,worker_generation_id,environment,sources } = index;
  manifest.snapshot_id = api.hashRaw('snapshot',{ format,contract_version,canonicalization,base_manifest_sha256,compiler_closure_sha256,runtime_code_sha256,worker_generation_id,environment,sources,index_sha256:manifest.index.sha256 });
}
for (const kind of ['entity_metadata','field_metadata','source_chunk']) test(`zero-posting ${kind} requires no_hint_postings even after coherent deletion and rehash`, () => {
  const fixture = fullAbi(), { index,manifest } = fixture;
  assert.equal(api.validateRawType('IndexPayload',index,{ manifest }),true);
  assert.equal(index.postings.length,0);
  assert.equal(index.accounting.diagnostic_count,1098);
  const record = index.records.find(r => r.core.kind === kind);
  const oldHash = manifest.index.sha256, oldSnapshot = manifest.snapshot_id;
  removeDiagnosticAndRehash(fixture,record,'no_hint_postings');
  assert.equal(index.accounting.diagnostic_count,1097);
  assert.notEqual(manifest.index.sha256,oldHash);
  assert.notEqual(manifest.snapshot_id,oldSnapshot);
  assert.equal(api.validateRawType('DataManifest',manifest,{ index }),true,'hashes, byte lengths and accounting remain coherent');
  assert.equal(api.validateRawType('IndexPayload',index,{ manifest }),false,'zero postings require the associated diagnostic, not merely coherent hashes');
});
test('no_hint_postings cannot describe a record with a stored posting', () => {
  const { index } = fullAbi();
  const e = index.records.find(r => r.core.kind === 'entity_metadata');
  index.postings = [{ candidate_kind:'entity',entity_ref:e.entity_ref,name:e.entity_ref.id,search_value:e.core.fields.id,origin:{ record_ref:e.core.record_ref,kind:'metadata_entity',metadata_key:'id',body_field:null,start_utf16:null,end_utf16:null,token:null } }];
  assert.equal(api.validateRawType('Posting',index.postings[0],{ index }),true);
  assert.equal(api.validateRawType('IndexPayload',index),false,'diagnostics reflect actual stored postings');
});
test('full-cardinality index/manifest ABI has concrete nested validators and acyclic bindings', () => {
  requireApi('validateRawType');
  const { index,manifest } = fullAbi();
  assert.equal(api.validateRawType('IndexPayload',index),true);
  assert.equal(api.validateRawType('DataManifest',manifest,{ index }),true);
  assert.equal(api.validateRawType('IndexPayload',index,{ manifest }),true);
  for (const mutate of [v => v.records[0].core.fields.extra = '', v => v.records[0].core.physical.line_start = 0, v => v.records[0].diagnostic_ids.pop(), v => v.records[0].entity_ref = null, v => v.owners[0].record_refs = [hex], v => v.owner_lookup[0].literal_ref = 'wrong', v => v.diagnostics[0].diagnostic_id = hex, v => v.accounting.owned--, v => v.sources[0].record_count--, v => v.records.reverse()]) { const copy = structuredClone(index); mutate(copy); assert.equal(api.validateRawType('IndexPayload',copy),false,mutate.toString()); }
  for (const mutate of [v => v.data_bytes++, v => v.snapshot_id = hex, v => v.runtime_files[0].path = '../x', v => v.compiler.files[0].bytes++, v => v.index.bytes++, v => v.environment.icu_version = 'other', v => v.accounting.artifacts[0].extra = 0]) { const copy = structuredClone(manifest); mutate(copy); assert.equal(api.validateRawType('DataManifest',copy,{ index }),false,mutate.toString()); }
});
test('contextual discovery independently checks full origin counts, rank/status/has_more and metadata hint fidelity', () => {
  const out = synthetic(), record = out.records[0];
  const { entity_ref,ownership,...core } = record;
  const origin = { record_ref:record.record_ref,kind:'metadata_entity',metadata_key:'id',body_field:null,start_utf16:null,end_utf16:null,token:null };
  const index = { records:[{ core,entity_ref,ownership,disposition:'owned' }],postings:[{ candidate_kind:'entity',entity_ref,name:entity_ref.id,search_value:'Synthetic',origin }] };
  const hints = ['name','canonicalName','ontologyId','aliases','description','verificationStatus'].sort((a,b) => api.RAW_METADATA_KEYS.indexOf(a)-api.RAW_METADATA_KEYS.indexOf(b)).map(key => ({ key,value:core.fields[key] }));
  const c = { candidate_id:api.hashRaw('candidate',{ candidate_kind:'entity',entity_ref,name:entity_ref.id }),candidate_kind:'entity',entity_ref,name:entity_ref.id,label:'Synthetic',metadata_hints:hints,omitted_metadata_keys:[],record_refs:[record.record_ref],record_ref_count:1,origins:[origin],origins_count:1,related_records:[],related_record_count:0 };
  const success = { schema_version:'0.1',mode:'discovery',snapshot_id:out.snapshot_id,assessment:'source_records_only',semantic_assessment:'not_performed',correlation_id:null,status:'candidates',candidates:[c],has_more:false };
  const context = { index,input:{ query:'Synthetic',kind:'entity' } };
  assert.equal(api.validateRawOutput('discovery',success,context),true);
  for (const mutate of [v => v.candidates[0].origins_count = 17, v => v.has_more = true, v => v.candidates[0].metadata_hints[0].value = 'invented']) { const v = structuredClone(success); mutate(v); assert.equal(api.validateRawOutput('discovery',v,context),false,mutate.toString()); }
  assert.equal(api.validateRawOutput('discovery',{ ...success,candidates:[],status:'no_candidates' },context),false);
  assert.equal(api.validateRawOutput('discovery',success,{ ...context,input:{ query:'absent',kind:'entity' } }),false);
});
test('compile success ABI validates actual canonical manifest/index bytes and contextual identity', () => {
  const { index,manifest } = fullAbi();
  const result = { ok:true,index_bytes:Buffer.from(api.canonicalJson(index)),manifest_bytes:Buffer.from(api.canonicalJson(manifest)),snapshot_id:manifest.snapshot_id };
  assert.equal(api.validateRawType('CompileResult',result),true);
  assert.equal(api.validateRawType('CompileResult',{ ...result,snapshot_id:hex }),false);
  assert.equal(api.validateRawType('CompileResult',{ ...result,index_bytes:Buffer.from('{}') }),false);
  assert.equal(api.validateRawType('CompileResult',{ ...result,manifest_bytes:Buffer.from(' ' + api.canonicalJson(manifest)) }),false);
});
test('index ownership cannot be reassigned by coherently rewriting owner lists', () => {
  const { index } = fullAbi();
  const row = index.records.find(r => r.core.kind === 'field_metadata');
  const previous = index.owners.find(o => o.entity_ref.id === row.entity_ref.id);
  const next = index.owners.find(o => o.entity_ref.id !== row.entity_ref.id);
  previous.record_refs = previous.record_refs.filter(ref => ref !== row.core.record_ref);
  next.record_refs.push(row.core.record_ref);
  const order = new Map(index.records.map((r,i) => [r.core.record_ref,i]));
  next.record_refs.sort((a,b) => order.get(a)-order.get(b));
  row.entity_ref = next.entity_ref;
  assert.equal(api.validateRawType('IndexPayload',index),false,'literal entityRefId resolves to original E, regardless of coherent owner-list edits');
});
test('contextual evidence independently recomputes membership, owner contexts, quarantine and budget precedence', () => {
  const out = synthetic(), r = out.records[0], { entity_ref,ownership,...core } = r;
  const index = { records:[{ core,entity_ref,ownership,disposition:'owned' }] };
  assert.equal(api.validateRawOutput('evidence',out,{ index }),true);
  const miss = structuredClone(out); miss.results[0].requested_refs = [hex]; miss.results[0].returned_refs = []; miss.results[0].missing = [{ record_ref:hex,reason:'record_not_found' }]; miss.results[0].status = 'returned_none';
  assert.equal(api.validateRawOutput('evidence',miss,{ index }),true);
  const bad = structuredClone(miss); bad.results[0].missing[0].reason = 'record_owner_mismatch';
  assert.equal(api.validateRawOutput('evidence',bad,{ index }),false);
  const blocked = structuredClone(miss); blocked.records = []; blocked.sources = []; blocked.results[0].context_refs = []; blocked.results[0].status = 'budget_limited'; blocked.results[0].missing[0].reason = 'owner_context_char_limit'; Object.assign(blocked.budget,{ used_records:0,used_fields_utf16:0,used_entity_refs:0 });
  assert.equal(api.validateRawOutput('evidence',blocked,{ index:{ records:[{ ...index.records[0],core:{ ...core,fields_utf16:16001 } }] } }),true);
  const quarantined = { ...index.records[0],disposition:'quarantined_unresolved',entity_ref:null };
  const absent = structuredClone(blocked); absent.results[0].status = 'returned_none'; absent.results[0].missing[0].reason = 'owner_context_unavailable';
  assert.equal(api.validateRawOutput('evidence',absent,{ index:{ records:[quarantined] } }),true);
});
test('contextual evidence replay retains the first owner/ref outcome after intervening record exhaustion', () => {
  // Construct the expected wire directly, without the producer or its admission
  // algorithm: one E, one oversized F, seven affordable F, and three requests.
  const out = synthetic(), root = out.records[0], artifact = api.RAW_ARTIFACTS[1];
  const fields = Array.from({length:8},(_,i) => {
    const f = Object.fromEntries(api.RAW_HEADERS[artifact].map(k => [k,'']));
    Object.assign(f,{id:i ? 'F_'+i : 'Big_ID',entityRefId:owner.id,fieldName:i ? 'F_'+i : 'Big_ID',summary:i ? '' : 'x'.repeat(16001)});
    return f;
  });
  const header = api.RAW_HEADERS[artifact].join(',')+'\n';
  const lines = fields.map(f => api.RAW_HEADERS[artifact].map(k => f[k]).join(',')+'\n');
  const bytes = Buffer.from(header+lines.join(''));
  const source = {artifact,sha256:api.sha256(bytes),bytes:bytes.length,record_count:fields.length};
  let start = Buffer.byteLength(header);
  const fieldRecords = fields.map((f,i) => {
    const physical = {byte_start:start,byte_end:start+Buffer.byteLength(lines[i]),line_start:i+2,line_end:i+2};
    start = physical.byte_end;
    const raw_record_sha256 = api.sha256(bytes.subarray(physical.byte_start,physical.byte_end));
    const record_hash = api.hashRaw('record',{artifact,source_sha256:source.sha256,physical,fields:f});
    const record_ref = api.hashRaw('record-ref',{artifact,source_sha256:source.sha256,physical,record_hash,raw_record_sha256});
    return {record_ref,kind:'field_metadata',record_id:f.id,entity_ref:owner,ownership:{via:'entityRefId',literal_ref:owner.id},artifact,physical,
      raw_record_sha256,record_hash,fields_sha256:api.sha256(Buffer.from(api.canonicalJson(f))),fields_utf16:api.canonicalJson(f).length,
      fields:f,integrity:'exact_export_record',semantic_completeness:'not_assessed'};
  });
  const big = fieldRecords[0].record_ref, small = fieldRecords.slice(1).map(r => r.record_ref);
  const result = (id,refs,reason) => ({id,entity_ref:owner,requested_refs:refs,status:reason ? 'budget_limited' : 'returned_all',
    returned_refs:reason ? [] : refs,context_refs:[root.record_ref],missing:reason ? refs.map(record_ref => ({record_ref,reason})) : []});
  out.results = [result('first',[big],'char_limit'),result('fill',small),result('repeat',[big],'char_limit')];
  out.records = [root,...fieldRecords.slice(1)]; out.sources.push(source);
  Object.assign(out.budget,{used_records:8,used_fields_utf16:out.records.reduce((n,r) => n+api.canonicalJson(r.fields).length,0)});
  const index = {records:[root,...fieldRecords].map(r => {
    const {entity_ref,ownership,...core} = r; return {core,entity_ref,ownership,disposition:'owned'};
  })};
  const input = {snapshot_id:out.snapshot_id,requests:out.results.map(r => ({id:r.id,entity_ref:r.entity_ref,record_refs:r.requested_refs}))};
  const context = {index,manifest:{snapshot_id:out.snapshot_id,sources:out.sources},input};
  assert.equal(api.validateRawOutput('evidence',out),true,'coherent wire satisfies repeated-reason, integrity and accounting invariants');
  assert.equal(api.validateRawOutput('evidence',out,context),true,'independent replay must preserve first char_limit after seven F fill the record cap');
  const drift = structuredClone(out); drift.results[2].missing[0].reason = 'record_limit';
  assert.equal(api.validateRawOutput('evidence',drift),false,'repeated-reason invariant remains enforced without context');
  assert.equal(api.validateRawOutput('evidence',drift,context),false);
  const wrongFirst = structuredClone(drift); wrongFirst.results[0].missing[0].reason = 'record_limit';
  assert.equal(api.validateRawOutput('evidence',wrongFirst),true,'consistent reasons alone do not prove first-admission eligibility');
  assert.equal(api.validateRawOutput('evidence',wrongFirst,context),false,'replay still independently checks the first budget reason');
  const fillFirst = structuredClone(wrongFirst);
  fillFirst.results = [fillFirst.results[1],fillFirst.results[0],fillFirst.results[2]];
  const fillInput = {...input,requests:[input.requests[1],input.requests[0],input.requests[2]]};
  assert.equal(api.validateRawOutput('evidence',fillFirst,{...context,input:fillInput}),true,'fresh validation uses record-limit precedence when both caps fail at first attempt');
  assert.equal(api.validateRawOutput('evidence',out,context),true,'no outcome survives a validation call');
});
test('posting metadata descriptions and worker-job/code bindings are executable validators', () => {
  const fixture = fullAbi(), { index,manifest } = fixture;
  const e = index.records.find(r => r.core.kind === 'entity_metadata');
  const posting = { candidate_kind:'entity',entity_ref:e.entity_ref,name:e.entity_ref.id,search_value:e.core.fields.id,origin:{ record_ref:e.core.record_ref,kind:'metadata_entity',metadata_key:'id',body_field:null,start_utf16:null,end_utf16:null,token:null } };
  index.postings = [posting];
  removeDiagnosticAndRehash(fixture,e,'no_hint_postings');
  assert.equal(api.validateRawType('IndexPayload',index),true);
  assert.equal(api.validateRawType('IndexPayload',index,{ manifest }),true);
  assert.equal(api.validateRawType('Posting',{ ...posting,search_value:'another owner description' },{ index }),false);
  assert.equal(api.validateRawType('Posting',{ ...posting,origin:{ ...posting.origin,metadata_key:'description' } },{ index }),false);
  const trusted = { abi:'owa-raw-data-generation/1',data_root:'/tmp/opencode/stage',manifest_path:'/tmp/opencode/stage/manifest.json',manifest_sha256:hex,snapshot_id:hex,worker_generation_id:hex,runtime_code_sha256:hex };
  const job = { jobId:'job',request:rpc(input()),context:{ authorization:{ profile_id:'erp-semantic-evidence-poc',scope:'kb.semantic.read',namespaces:['OWAOntology'] },trustedDataGeneration:trusted,code:{ worker_generation_id:hex,runtime_code_sha256:hex,environment:index.environment } },timing:{ queueMs:.01,startupMs:1 } };
  assert.equal(api.validateRawType('RawWorkerJob',job),true);
  assert.equal(api.validateRawType('RawWorkerJob',{ ...job,context:{ ...job.context,code:{ ...job.context.code,worker_generation_id:other } } }),false);
  assert.equal(api.validateRawType('RawWorkerJob',{ ...job,context:{ ...job.context,authorization:{ ...job.context.authorization,namespaces:[] } } }),false);
});
test('error output schemas and runtime context bind operation, correlation and active snapshot', () => {
  const err = api.rawToolError('evidence','INDEX_CORRUPT','supplied');
  assert.equal(api.validateRawOutput('evidence',err,{ input:{ ...input(),correlation_id:'supplied' } }),true);
  assert.equal(api.validateRawOutput('evidence',err,{ input:{ ...input(),correlation_id:'different' } }),false);
  assert.equal(api.validateRawOutput('evidence',api.rawToolError('evidence','SNAPSHOT_MISMATCH',null,hex,other),{ manifest:{ snapshot_id:hex } }),false);
  assert.equal(api.RAW_SCHEMAS.DiscoverOutput.oneOf[1].properties.operation.const,'discovery');
  assert.equal(api.RAW_SCHEMAS.EvidenceOutput.oneOf[1].properties.operation.const,'evidence');
});
test('related navigation is derived from every origin, including those beyond the emitted ref cap', () => {
  const base = synthetic(), root = base.records[0], { entity_ref,ownership,...core } = root;
  const index = { records:[{ core,entity_ref,ownership,disposition:'owned' }],postings:[] }, origins = [];
  for (let n=1;n<=10;n++) {
    const fields = Object.fromEntries(api.RAW_HEADERS[api.RAW_ARTIFACTS[2]].map(k => [k,'']));
    Object.assign(fields,{ id:`c${n}`,sourceDocumentRefId:owner.id,sourcePath:`path${Math.min(n,9)}`,sectionOrder:String(n),content:'ABC' });
    const ref = n.toString(16).padStart(64,'0');
    index.records.push({ core:{ ...core,record_ref:ref,kind:'source_chunk',record_id:fields.id,artifact:api.RAW_ARTIFACTS[2],physical:{ byte_start:n*100,byte_end:n*100+90,line_start:n+2,line_end:n+2 },fields },entity_ref:owner,ownership:{ via:'sourceDocumentRefId',literal_ref:owner.id },disposition:'owned' });
    if (n<=9) {
      const origin = { record_ref:ref,kind:'identifier_mention',metadata_key:null,body_field:'content',start_utf16:0,end_utf16:3,token:'ABC' };
      origins.push(origin); index.postings.push({ candidate_kind:'identifier_mention',entity_ref:owner,name:'ABC',search_value:'ABC',origin });
    }
  }
  const c = { candidate_id:api.hashRaw('candidate',{ candidate_kind:'identifier_mention',entity_ref:owner,name:'ABC' }),candidate_kind:'identifier_mention',entity_ref:owner,name:'ABC',label:null,metadata_hints:[{ key:'sectionHeading',value:'' },{ key:'sectionOrder',value:'1' },{ key:'sourcePath',value:'path1' }],omitted_metadata_keys:[],record_refs:origins.slice(0,8).map(o => o.record_ref),record_ref_count:9,origins:origins.slice(0,8),origins_count:9,related_records:[{ record_ref:root.record_ref,relation:'owner_context',source_path:null,section_order:null },{ record_ref:'a'.padStart(64,'0'),relation:'same_owner_source_path',source_path:'path9',section_order:'10' }],related_record_count:2 };
  const out = { schema_version:'0.1',mode:'discovery',snapshot_id:base.snapshot_id,assessment:'source_records_only',semantic_assessment:'not_performed',correlation_id:null,status:'candidates',candidates:[c],has_more:false };
  assert.equal(api.validateRawOutput('discovery',out,{ index,input:{ query:'ABC',kind:'identifier_mention' } }),true);
  const bad = structuredClone(out); bad.candidates[0].related_records[1].relation = 'same_owner';
  assert.equal(api.validateRawOutput('discovery',bad,{ index,input:{ query:'ABC',kind:'identifier_mention' } }),false);
});
