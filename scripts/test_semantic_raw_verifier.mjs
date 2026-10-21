import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import fs from 'node:fs';
import { RAW_ARTIFACTS, canonicalJson, rawCallResult, rawToolError, rawRpcError, sha256, hashRaw, validateRawType } from './lib/semantic_raw_contract.mjs';
import * as fixtures from './lib/semantic_raw_test_fixture.mjs';
import { createRawHandle, discoverRaw, getRawRecords } from './lib/semantic_raw_lookup.mjs';
const api = await import('./lib/semantic_raw_verifier.mjs').catch(e => {if(e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return {};});
const authorized = {profile_id:'erp-semantic-evidence-poc',scope:'kb.semantic.read',namespaces:['OWAOntology']};
let base, transcript, handle;
after(() => base?.cleanup());
function fixture() {
  assert.equal(typeof api.verifyRawArtifact,'function'); assert.equal(typeof api.verifyRawTranscript,'function');
  assert.equal(typeof fixtures.stageProductionRawFixture,'function');
  if (!base) {
    const parent = fs.mkdtempSync('/tmp/opencode/task4-verifier-');
    try {base = fixtures.stageProductionRawFixture({sourceRoot:'/tmp/opencode/semantic42-frozen-EsJ4gr',outputRoot:parent+'/data'});} catch(e) {fs.rmSync(parent,{recursive:true,force:true}); throw e;}
    const cleanup = base.cleanup; base.cleanup = () => {cleanup(); fs.rmSync(parent,{recursive:true,force:true});};
    handle = createRawHandle({manifest:base.manifest,index:base.index,sourceBytes:RAW_ARTIFACTS.map(artifact => ({artifact,bytes:fs.readFileSync(base.trusted.data_root+'/'+artifact)}))});
    const a = call('first','erp_subject.discover',{query:'operator',kind:'field',limit:5});
    const owner = a.response.result.structuredContent.candidates.find(c => c.entity_ref.id.includes('KONTRAHENT')).entity_ref;
    const b = call('second','erp_subject.discover',{query:'data',kind:'field',entity_ref:owner,expected_snapshot_id:base.manifest.snapshot_id,limit:5});
    const candidates = [...a.response.result.structuredContent.candidates,...b.response.result.structuredContent.candidates].filter(c => c.entity_ref.id === owner.id && c.candidate_kind === 'field');
    const c = call('get','erp_evidence.get',{snapshot_id:base.manifest.snapshot_id,requests:candidates.slice(0,3).map((c,i) => ({id:'r'+i,entity_ref:owner,record_refs:[c.record_refs[0]]}))});
    transcript = {calls:[a,b,c],outcome:'answer',final_answer:'This text is deliberately not a semantic truth assertion.'};
  }
  return base;
}
function call(id,name,args) {return {request:{jsonrpc:'2.0',id,method:'tools/call',params:{name,arguments:args}},response:{jsonrpc:'2.0',id,result:rawCallResult(name === 'erp_subject.discover' ? discoverRaw(handle,args) : getRawRecords(handle,args))}};}
function replay(c) {c.response = call(c.request.id,c.request.params.name,c.request.params.arguments).response;}
function verify(t) {const f = fixture(); return api.verifyRawTranscript(f.trusted,f.code,authorized,t);}
function invalid(t,rule,index) {const r = verify(t); assert.equal(r.valid,false); assert(validateRawType('TranscriptVerification',r)); assert(r.violations.some(v => v.rule === rule && (index === undefined || v.call_index === index)),canonicalJson(r)); return r;}
function copy() {fixture(); return structuredClone(transcript);}
test('artifact verifier authorizes before descriptor getters or file access', () => {
  assert.equal(typeof api.verifyRawArtifact,'function'); const hostile = new Proxy({}, {get(){throw Error('TOUCHED');}});
  assert.throws(() => api.verifyRawArtifact(hostile,{},null),/Access denied\./);
  assert.throws(() => api.verifyRawTranscript(hostile,{},null,{}),/Access denied\./);
});
test('independent artifact verification reconstructs the sealed entire source payload', () => {
  const f = fixture(), r = api.verifyRawArtifact(f.trusted,f.code,authorized);
  assert.deepEqual(r,{valid:true,snapshot_id:f.manifest.snapshot_id,accounting:f.index.accounting}); assert(validateRawType('ArtifactVerification',r));
});
test('exact deterministic transcript passes contract-only and final text is never graded', () => {
  const f = fixture();
  for (const final_answer of [null,'','false factual claims','clarification text with no facts']) {
    const tr = copy(); tr.final_answer = final_answer;
    assert.deepEqual(verify(tr),{valid:true,assessment:'contract_only',semantic_assessment:'not_performed',snapshot_id:f.manifest.snapshot_id});
  }
});
test('clarification/unavailable may stop early without semantic certification', () => {
  for (const outcome of ['clarification','unavailable']) {const tr = copy(); tr.calls = tr.calls.slice(0,1); tr.outcome = outcome; assert.equal(verify(tr).valid,true);}
});
test('a deterministic initial stale-snapshot error may end an unavailable attempt', () => {
  const tr = copy(); tr.calls = tr.calls.slice(0,1); tr.outcome = 'unavailable';
  tr.calls[0].request.params.arguments.expected_snapshot_id = '0'.repeat(64); replay(tr.calls[0]);
  assert.deepEqual(verify(tr),{valid:true,assessment:'contract_only',semantic_assessment:'not_performed',snapshot_id:base.manifest.snapshot_id});
});
test('related references count as discovery exposure and automatic E needs none', () => {
  const tr = copy(), first = tr.calls[0].response.result.structuredContent.candidates[0];
  tr.calls = [tr.calls[0],call('related','erp_evidence.get',{snapshot_id:base.manifest.snapshot_id,requests:[{id:'r',entity_ref:first.entity_ref,record_refs:[first.related_records[0].record_ref]}]})];
  assert.equal(verify(tr).valid,true);
});
for (const [label,mutate,rule,index] of [
  ['guessed ref',tr => {tr.calls[2].request.params.arguments.requests[0].record_refs = ['f'.repeat(64)]; replay(tr.calls[2]);},'reference_membership',2],
  ['unexposed real ref',tr => {const req = tr.calls[2].request.params.arguments.requests[0]; const exposed = new Set(tr.calls.slice(0,2).flatMap(c => c.response.result.structuredContent.candidates.filter(c => c.entity_ref.id === req.entity_ref.id).flatMap(c => [...c.record_refs,...c.related_records.map(r => r.record_ref)]))); req.record_refs = [base.index.records.find(r => r.entity_ref?.id === req.entity_ref.id && !exposed.has(r.core.record_ref)).core.record_ref]; replay(tr.calls[2]);},'reference_membership',2],
  ['other owner',tr => {tr.calls[2].request.params.arguments.requests[0].entity_ref = tr.calls[0].response.result.structuredContent.candidates.find(c => c.entity_ref.id.includes('TOWAR')).entity_ref; replay(tr.calls[2]);},'owner_binding',2],
  ['third discovery',tr => {tr.calls.splice(2,0,structuredClone(tr.calls[1]));},'call_limit',2],
  ['second get',tr => tr.calls.push(structuredClone(tr.calls[2])),'call_limit',3],
  ['get before discovery',tr => {tr.calls = [tr.calls[2],tr.calls[0]];},'call_order',0],
  ['discovery after get',tr => tr.calls.push(structuredClone(tr.calls[1])),'call_order',3],
  ['second discovery missing expected snapshot',tr => {delete tr.calls[1].request.params.arguments.expected_snapshot_id; replay(tr.calls[1]);},'snapshot_mixing',1],
  ['mixed snapshot',tr => {tr.calls[2].request.params.arguments.snapshot_id = '0'.repeat(64); replay(tr.calls[2]);},'snapshot_mixing',2],
  ['continuation after mismatch',tr => {tr.calls[0].request.params.arguments.expected_snapshot_id = '0'.repeat(64); replay(tr.calls[0]);},'call_order',1],
  ['response id',tr => {tr.calls[0].response.id = 'wrong';},'wire_schema',0],
  ['extra request',tr => {tr.calls[0].request.extra = true;},'wire_schema',0],
  ['extra response',tr => {tr.calls[0].response.extra = true;},'wire_schema',0],
  ['legacy tool',tr => {tr.calls[0].request.params.name = 'erp_entity.get';},'wire_schema',0],
  ['foreign namespace',tr => {tr.calls[2].request.params.arguments.requests[0].entity_ref.namespace = 'Foreign';},'owner_binding',2],
  ['text parity',tr => {tr.calls[0].response.result.content[0].text += ' ';},'text_parity',0],
  ['tool error masquerades as success',tr => {tr.calls[2].response.result = rawCallResult(rawToolError('evidence','INDEX_CORRUPT')); tr.calls[2].response.result.isError = false;},'wire_schema',2],
  ['answers from hints',tr => {tr.calls.pop();},'discovery_not_evidence',null],
  ['error is not evidence success',tr => {tr.calls[2].response.result = rawCallResult(rawToolError('evidence','INDEX_CORRUPT'));},'discovery_not_evidence',null],
  ['RPC failure is not evidence',tr => {tr.calls[2].response = rawRpcError('get',-32603);},'discovery_not_evidence',null],
]) test('transcript mutation: '+label, () => {const tr = copy(); mutate(tr); invalid(tr,rule,index);});
for (const [label,mutate,rule] of [
  ['cell',s => {s.records[0].fields.description += '!';},'record_integrity'],
  ['span',s => {s.records[0].physical.byte_start++;},'record_integrity'],
  ['hash',s => {s.records[0].raw_record_sha256 = '0'.repeat(64);},'record_integrity'],
  ['source',s => {s.sources[0].sha256 = '0'.repeat(64);},'record_integrity'],
  ['partition',s => {s.results[0].returned_refs = [];},'result_partition'],
  ['result order',s => s.results.reverse(),'result_partition'],
  ['context',s => {s.results[0].context_refs = [];},'context_required'],
  ['budget',s => {s.budget.used_fields_utf16++;},'budget'],
  ['over budget',s => {s.budget.used_records = 9;},'budget'],
]) test('evidence full coupling: '+label, () => {const tr = copy(); const s = tr.calls[2].response.result.structuredContent; mutate(s); tr.calls[2].response.result.content[0].text = canonicalJson(s); const result = invalid(tr,rule,2); assert(result.violations.some(v => v.rule === 'output_not_deterministic' && v.call_index === 2));});
for (const [label,mutate] of [
  ['count',s => {s.candidates[0].record_ref_count++;}],
  ['origin',s => {s.candidates[0].origins[0].metadata_key = 'description';}],
  ['rank',s => s.candidates.reverse()],
  ['has more',s => {s.has_more = !s.has_more;}],
]) test('discovery is replayed completely: '+label, () => {const tr = copy(), s = tr.calls[0].response.result.structuredContent; mutate(s); tr.calls[0].response.result.content[0].text = canonicalJson(s); invalid(tr,'output_not_deterministic',0);});
test('malformed transcript is rejected with a closed wire violation', () => {
  for (const tr of [null,{}, {...copy(),extra:true},{...copy(),final_answer:42},{...copy(),calls:Array(101).fill(copy().calls[0])}]) invalid(tr,'wire_schema',null);
});
test('malformed nested evidence is a controlled violation, never an exception', () => {
  const tr = copy(); delete tr.calls[2].response.result.structuredContent.records;
  invalid(tr,'wire_schema',2);
});
test('artifact failure takes precedence and independent verifier rejects rehashed omission', () => {
  const f = fixture(), bytes = fs.readFileSync(f.trusted.data_root+'/index.json');
  try {fs.appendFileSync(f.trusted.data_root+'/index.json',' '); assert.deepEqual(verify(null),{valid:false,violations:[{call_index:null,rule:'artifact_binding'}]});} finally {fs.writeFileSync(f.trusted.data_root+'/index.json',bytes);}
  const m = structuredClone(f.manifest), index = structuredClone(f.index); index.postings.pop(); const ib = Buffer.from(canonicalJson(index));
  m.index.bytes = ib.length; m.index.sha256 = sha256(ib); m.data_bytes = 406996+ib.length;
  m.snapshot_id = hashRaw('snapshot',{format:index.format,contract_version:index.contract_version,canonicalization:index.canonicalization,base_manifest_sha256:index.base_manifest_sha256,compiler_closure_sha256:index.compiler_closure_sha256,runtime_code_sha256:index.runtime_code_sha256,worker_generation_id:index.worker_generation_id,environment:index.environment,sources:index.sources,index_sha256:m.index.sha256});
  const mb = Buffer.from(canonicalJson(m)), original = fs.readFileSync(f.trusted.manifest_path);
  try {fs.writeFileSync(f.trusted.data_root+'/index.json',ib); fs.writeFileSync(f.trusted.manifest_path,mb); assert.deepEqual(api.verifyRawArtifact({...f.trusted,manifest_sha256:sha256(mb),snapshot_id:m.snapshot_id},f.code,authorized),{valid:false,code:'INDEX_CORRUPT'});} finally {fs.writeFileSync(f.trusted.data_root+'/index.json',bytes); fs.writeFileSync(f.trusted.manifest_path,original);}
});
