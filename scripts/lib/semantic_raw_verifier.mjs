import { canonicalJson, parseStrictJson, rawCallResult, validateRawRequest, validateRawOutput, validateRawType } from './semantic_raw_contract.mjs';
import { authorizeRawScope, captureRawArtifact, validateRawArtifactCapture } from './semantic_raw_artifact.mjs';
import { createRawHandle, discoverRaw, getRawRecords } from './semantic_raw_lookup.mjs';

const same = (a,b) => a !== undefined && b !== undefined && canonicalJson(a) === canonicalJson(b);
function inspect(trusted,code,authorized) {
  // Independent execution: never reuses a loader's validated handle/fingerprint
  // cache, never invokes compileRawIndex or trusts index checksums alone.
  return validateRawArtifactCapture(captureRawArtifact(trusted,code,authorized));
}
export function verifyRawArtifact(trusted,code,authorized) {
  authorizeRawScope(authorized);
  try {const {manifest,index} = inspect(trusted,code,authorized); return {valid:true,snapshot_id:manifest.snapshot_id,accounting:index.accounting};}
  catch(e) {return {valid:false,code:validateRawType('LoadError',e.code) ? e.code : 'INDEX_CORRUPT'};}
}
const closed = (value,keys) => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value,k));
function evidenceDifferences(actual,expected,add) {
  if (!same(actual.records,expected.records) || !same(actual.sources,expected.sources)) add('record_integrity');
  if (!same(actual.results,expected.results)) {
    add('result_partition');
    if (Array.isArray(actual.results) && actual.results.every(r => r && typeof r === 'object')) {
      if (!same(actual.results.map(r => r.context_refs ?? null),expected.results.map(r => r.context_refs))) add('context_required');
      if (!same(actual.results.map(r => r.entity_ref ?? null),expected.results.map(r => r.entity_ref))) add('owner_binding');
    }
  }
  if (!same(actual.budget,expected.budget)) add('budget');
}
export function verifyRawTranscript(trusted,code,authorized,transcript) {
  authorizeRawScope(authorized);
  let artifact;
  try {artifact = inspect(trusted,code,authorized);} catch {return {valid:false,violations:[{call_index:null,rule:'artifact_binding'}]};}
  const violations = [], seen = new Set();
  function add(call_index,rule) {const key = call_index+':'+rule; if (!seen.has(key)) {seen.add(key); violations.push({call_index,rule});}}
  try {
    // Strict owned JSON clone prevents accessors, prototypes, sparse arrays,
    // symbols and invalid Unicode before shape traversal or final_answer use.
    transcript = parseStrictJson(canonicalJson(transcript));
    // Validate the outer shell here; full closed request/response validation is
    // per call, so its violation has the offending zero-based call_index.
    if (!closed(transcript,['calls','outcome','final_answer']) || !['answer','clarification','unavailable'].includes(transcript.outcome) || !(transcript.final_answer === null || typeof transcript.final_answer === 'string') || !Array.isArray(transcript.calls) || transcript.calls.length > 100 || !transcript.calls.every(c => closed(c,['request','response']))) {add(null,'wire_schema'); return {valid:false,violations};}
  } catch {add(null,'wire_schema'); return {valid:false,violations};}
  const {manifest,index,sourceBytes} = artifact, S = manifest.snapshot_id;
  const handle = createRawHandle({manifest,index,sourceBytes}), records = new Map(index.records.map(r => [r.core.record_ref,r]));
  let discoveries = 0, gets = 0, successes = 0, firstSnapshot = null, ended = false;
  const exposed = new Map();
  for (const [i,{request,response}] of transcript.calls.entries()) {
    const note = rule => add(i,rule);
    if (!validateRawRequest(request)) {note('wire_schema'); continue;}
    const discovery = request.params.name === 'erp_subject.discover', input = request.params.arguments;
    if (ended) note('call_order');
    if (discovery) {if (++discoveries > 2) note('call_limit'); if (gets) note('call_order');}
    else {if (++gets > 1) note('call_limit'); if (!firstSnapshot) note('call_order');}
    const refs = discovery ? (input.entity_ref ? [input.entity_ref] : []) : input.requests.map(r => r.entity_ref);
    if (refs.some(r => r.namespace !== 'OWAOntology')) {note('owner_binding'); continue;}
    // An initial stale request can deterministically return a mismatch and end
    // unavailable; it exposes no second snapshot. Later calls must bind the
    // first successful discovery, and no continuation after mismatch is legal.
    if (discovery ? discoveries === 2 && input.expected_snapshot_id !== firstSnapshot : input.snapshot_id !== firstSnapshot) note('snapshot_mixing');
    if (!discovery) for (const r of input.requests) for (const ref of r.record_refs) {
      const record = records.get(ref);
      if (!record || record.disposition !== 'owned' || !exposed.get(S+':'+r.entity_ref.id)?.has(ref)) note('reference_membership');
      if (record?.disposition === 'owned' && !same(record.entity_ref,r.entity_ref)) note('owner_binding');
    }
    if (!response || typeof response !== 'object') {note('wire_schema'); continue;}
    if (response.id !== request.id) note('wire_schema');
    if (Object.hasOwn(response,'error')) {if (!validateRawType('RPCError',response,{request})) note('wire_schema'); continue;}
    const wireValid = validateRawType('RPCSuccess',response,{request});
    if (!wireValid) note('wire_schema');
    const body = response.result?.structuredContent, operation = discovery ? 'discovery' : 'evidence';
    if (!body || typeof body !== 'object' || Array.isArray(body)) continue;
    if (response.result.content?.[0]?.text !== canonicalJson(body)) note('text_parity');
    if (response.result.isError !== (body.mode === 'error') || (body.mode === 'error' ? body.operation !== operation : body.mode !== operation)) note('wire_schema');
    if (body.mode === 'error' && body.code === 'SNAPSHOT_MISMATCH') ended = true;
    if (body.mode !== 'error' && body.snapshot_id !== S) note('snapshot_mixing');
    const expected = discovery ? discoverRaw(handle,input) : getRawRecords(handle,input);
    const validOutput = validateRawOutput(operation,body,{manifest,index,input});
    if (!validOutput || !same(response.result,rawCallResult(expected))) note('output_not_deterministic');
    if (!discovery && body.mode === 'evidence' && expected.mode === 'evidence') evidenceDifferences(body,expected,note);
    // Exposure only from a successful, exactly replayed closed response under
    // this snapshot. Altered hints cannot bootstrap a subsequent valid get.
    if (discovery && wireValid && validOutput && body.mode === 'discovery' && same(response.result,rawCallResult(expected)) && !ended) {
      firstSnapshot ??= body.snapshot_id;
      for (const c of body.candidates) {const key = S+':'+c.entity_ref.id; if (!exposed.has(key)) exposed.set(key,new Set()); for (const ref of [...c.record_refs,...c.related_records.map(r => r.record_ref)]) exposed.get(key).add(ref);}
    }
    if (!discovery && wireValid && validOutput && body.mode === 'evidence' && !response.result.isError && same(response.result,rawCallResult(expected))) successes++;
  }
  if (transcript.outcome === 'answer' && successes !== 1) add(null,'discovery_not_evidence');
  return violations.length ? {valid:false,violations} : {valid:true,assessment:'contract_only',semantic_assessment:'not_performed',snapshot_id:S};
}
