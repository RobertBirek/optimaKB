import { RAW_LIMITS, RAW_METADATA_KEYS, canonicalJson, hashRaw, validateDiscoverInput,
  validateEvidenceInput, validateRawOutput, rawToolError, RAW_RPC_MESSAGES } from './semantic_raw_contract.mjs';

// This constructor is a trusted loader seam, NOT IndexPayload admission. The
// loader/verifier must validate the complete pinned artifact before calling it.
// Weak identity is the capability: no symbol/property/JSON value grants access.
const handles = new WeakMap();
const copy = value => JSON.parse(canonicalJson(value));
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
const compare = (a,b) => a === b ? 0 : a === null ? -1 : b === null ? 1 : a < b ? -1 : 1;
function tuple(a,b) { for (let i=0;i<a.length;i++) { const c = compare(a[i],b[i]); if (c) return c; } return 0; }
const physical = (a,b) => compare(a.artifact,b.artifact) || compare(a.physical.byte_start,b.physical.byte_start);
const fold = text => text.normalize('NFD').replace(/\p{M}/gu,'').replace(/[łŁ]/g,c => c === 'ł' ? 'l' : 'L').toLowerCase();
const tokens = text => fold(text).match(/[\p{L}\p{N}_]+/gu) || [];
const technical = text => /^[\p{L}_][\p{L}\p{N}_-]*(?:[.:][\p{L}\p{N}_-]+)*$/u.test(text);
const kindOrder = {entity:0,field:1,identifier_mention:2};
const relationOrder = {owner_context:0,same_owner_source_path:1,same_owner:2};
const budgetReasons = new Set(['owner_context_record_limit','owner_context_char_limit','record_limit','char_limit']);
function sectionKey(order) {
  const numeric = /^[0-9]+$/.test(order) && Number.isSafeInteger(Number(order));
  return [numeric ? 0 : 1,numeric ? Number(order) : order];
}

function candidateFrom(group,state) {
  const {records,index} = state;
  const coordinate = o => { const c = records.get(o.record_ref).core; return [c.artifact,c.physical.byte_start,o.body_field,o.start_utf16,o.end_utf16,o.kind]; };
  const origins = [...group.origins.values()].sort((a,b) => tuple(coordinate(a),coordinate(b)));
  const allRefs = new Set(origins.map(o => o.record_ref)), refs = [...allRefs].slice(0,8);
  const first = records.get(origins[0].record_ref).core.fields;
  const hintKeys = group.candidate_kind === 'entity' ? ['name','canonicalName','ontologyId','aliases','verificationStatus','description']
    : group.candidate_kind === 'field' ? ['name','fieldName','mssqlColumn','sqlType','mcpField','mappingStatus','description']
      : ['sourcePath','sectionHeading','sectionOrder'].filter(k => Object.hasOwn(first,k));
  const labelKey = group.candidate_kind === 'entity' ? (first.canonicalName ? 'canonicalName' : first.name ? 'name' : null)
    : group.candidate_kind === 'field' && first.name ? 'name' : null;
  const metadata_hints = [], omitted_metadata_keys = [];
  for (const key of RAW_METADATA_KEYS) if (hintKeys.includes(key) || key === labelKey) {
    if (first[key].length > 240) omitted_metadata_keys.push(key);
    else if (hintKeys.includes(key)) metadata_hints.push({key,value:first[key]});
  }
  // Navigation uses ALL origins/refs, not only the first eight shown on wire.
  const paths = new Set(origins.map(o => records.get(o.record_ref).core.fields.sourcePath).filter(Boolean));
  const related = index.records.filter(s => s.disposition === 'owned' && s.entity_ref.id === group.entity_ref.id && !allRefs.has(s.core.record_ref)).map(s => {
    const c = s.core, chunk = c.kind === 'source_chunk';
    return {record_ref:c.record_ref,relation:c.kind === 'entity_metadata' ? 'owner_context' : chunk && paths.has(c.fields.sourcePath) ? 'same_owner_source_path' : 'same_owner',
      source_path:chunk ? c.fields.sourcePath : null,section_order:chunk ? c.fields.sectionOrder : null};
  });
  related.sort((a,b) => relationOrder[a.relation]-relationOrder[b.relation]
    || (a.relation === 'same_owner_source_path' ? tuple([a.source_path,...sectionKey(a.section_order)],[b.source_path,...sectionKey(b.section_order)]) : 0)
    || physical(records.get(a.record_ref).core,records.get(b.record_ref).core));
  return freeze({candidate_id:group.id,candidate_kind:group.candidate_kind,entity_ref:group.entity_ref,name:group.name,
    label:labelKey && first[labelKey].length <= 240 ? first[labelKey] : null,metadata_hints,omitted_metadata_keys,
    record_refs:refs,record_ref_count:allRefs.size,origins:origins.filter(o => refs.includes(o.record_ref)).slice(0,8),origins_count:origins.length,
    related_records:related.slice(0,8),related_record_count:related.length});
}

export function createRawHandle({manifest,index,sourceBytes}) {
  // Own both JSON trees and each byte vector. None can escape through the handle
  // or a response; there are no query-owned or ambient lifecycle caches here.
  const state = {manifest:freeze(copy(manifest)),index:freeze(copy(index)),
    sourceBytes:sourceBytes.map(({artifact,bytes}) => ({artifact,bytes:Uint8Array.from(bytes)}))};
  state.records = new Map(state.index.records.map(s => [s.core.record_ref,s]));
  state.roots = new Map();
  for (const s of state.index.records) if (s.core.kind === 'entity_metadata') {
    const roots = state.roots.get(s.core.record_id) || [];
    roots.push(s); state.roots.set(s.core.record_id,roots);
  }
  const groups = new Map();
  for (const p of state.index.postings) {
    const identity = {candidate_kind:p.candidate_kind,entity_ref:p.entity_ref,name:p.name}, id = hashRaw('candidate',identity);
    if (!groups.has(id)) groups.set(id,{...identity,id,values:new Set(),folded:new Set(),bag:new Set(),origins:new Map()});
    const group = groups.get(id);
    group.values.add(p.search_value); group.folded.add(fold(p.search_value));
    for (const token of tokens(p.search_value)) group.bag.add(token);
    group.origins.set(canonicalJson(p.origin),p.origin);
  }
  state.candidates = [...groups.values()].map(g => ({...g,candidate:candidateFrom(g,state)}));
  const handle = Object.freeze(Object.create(null));
  handles.set(handle,state);
  return handle;
}

function checkInput(operation,input) {
  const valid = operation === 'discovery' ? validateDiscoverInput(input) : validateEvidenceInput(input);
  const deny = code => { throw Object.assign(new TypeError(RAW_RPC_MESSAGES[code]),{code}); };
  if (!valid) deny(-32602);
  const refs = operation === 'discovery' ? (input.entity_ref ? [input.entity_ref] : []) : input.requests.map(r => r.entity_ref);
  if (refs.some(r => r.namespace !== 'OWAOntology')) deny(-32001);
}
function execute(operation,handle,input,lookup) {
  // Defense in depth only; upstream still validates/authenticates before load.
  checkInput(operation,input);
  const error = () => rawToolError(operation,'INTERNAL_CONTRACT_ERROR',input.correlation_id ?? null);
  const state = handles.get(handle);
  if (!state) return error();
  try {
    const expected = operation === 'discovery' ? input.expected_snapshot_id : input.snapshot_id;
    const out = expected && expected !== state.manifest.snapshot_id
      ? rawToolError(operation,'SNAPSHOT_MISMATCH',input.correlation_id ?? null,expected,state.manifest.snapshot_id)
      : lookup(state,input);
    // Reuse the strong independent Task 1 checks, not a second parallel schema
    // system or the lookup algorithm itself as its own expected-value oracle.
    if (!validateRawOutput(operation,out,{index:state.index,manifest:state.manifest,input})) return error();
    return copy(out);
  } catch { return error(); }
}
const base = (state,input,mode) => ({schema_version:'0.1',mode,snapshot_id:state.manifest.snapshot_id,
  assessment:'source_records_only',semantic_assessment:'not_performed',correlation_id:input.correlation_id ?? null});

export function discoverRaw(handle,input) {
  return execute('discovery',handle,input,(state,input) => {
    const out = {...base(state,input,'discovery'),status:'no_candidates',candidates:[],has_more:false};
    if (input.entity_ref) {
      const roots = state.roots.get(input.entity_ref.id) || [];
      if (roots.length !== 1) return {...out,status:roots.length ? 'ambiguous_owner_ref' : 'owner_not_found'};
    }
    const folded = fold(input.query), queryTokens = [...new Set(tokens(input.query))], words = input.query.trim().split(/\s+/u);
    const exactSet = words.length >= 2 && words.length <= 8 && new Set(words).size === words.length && words.every(technical);
    const ranked = [];
    for (const g of state.candidates) {
      if (input.entity_ref && g.entity_ref.id !== input.entity_ref.id) continue;
      if (input.kind === 'entity' ? g.candidate_kind !== 'entity' : input.kind === 'identifier_mention' ? g.candidate_kind !== 'identifier_mention' : g.candidate_kind === 'entity') continue;
      const tier = g.values.has(input.query) ? 1 : g.folded.has(folded) ? 2 : exactSet && words.includes(g.name) ? 3
        : queryTokens.length && queryTokens.every(t => g.bag.has(t)) ? 4 : 0;
      if (tier) ranked.push({g,tier});
    }
    ranked.sort((a,b) => tuple([a.tier,kindOrder[a.g.candidate_kind],a.g.entity_ref.id,a.g.name,a.g.id],
      [b.tier,kindOrder[b.g.candidate_kind],b.g.entity_ref.id,b.g.name,b.g.id]));
    const limit = input.limit ?? 5;
    return {...out,status:ranked.length ? 'candidates' : 'no_candidates',candidates:ranked.slice(0,limit).map(r => r.g.candidate),has_more:ranked.length > limit};
  });
}

export function getRawRecords(handle,input) {
  return execute('evidence',handle,input,(state,input) => {
    const records = [], admitted = new Set(), owners = new Map(); let usedChars = 0;
    const admit = stored => {
      const c = stored.core;
      if (admitted.has(c.record_ref)) return null;
      if (records.length >= RAW_LIMITS.max_records) return 'record_limit';
      if (usedChars+c.fields_utf16 > RAW_LIMITS.max_fields_utf16) return 'char_limit';
      records.push({...c,entity_ref:stored.entity_ref,ownership:stored.ownership});
      admitted.add(c.record_ref); usedChars += c.fields_utf16;
      return null;
    };
    // §6 phases 1–2: first-request owner order; ALL whole E reservations before
    // visiting even the first selected ref. Unknown owners never resolve refs.
    for (const req of input.requests) if (!owners.has(req.entity_ref.id)) {
      const roots = state.roots.get(req.entity_ref.id) || [], root = roots[0];
      let reason = roots.length === 0 ? 'owner_not_found' : roots.length > 1 ? 'ambiguous_owner_ref'
        : root.disposition !== 'owned' ? 'owner_context_unavailable' : null;
      if (!reason) { const over = admit(root); if (over) reason = 'owner_context_'+over; }
      owners.set(req.entity_ref.id,{root,reason,outcomes:new Map()});
    }
    // Phases 3–4: ordered refs, membership before charge, one global dedup set.
    const results = input.requests.map(req => {
      const owner = owners.get(req.entity_ref.id), returned_refs = [], missing = [];
      for (const ref of req.record_refs) {
        let reason;
        if (owner.outcomes.has(ref)) reason = owner.outcomes.get(ref);
        else {
          reason = owner.reason;
          if (!reason) {
            const s = state.records.get(ref);
            reason = !s ? 'record_not_found' : s.disposition !== 'owned' ? 'record_'+s.disposition
              : s.entity_ref.id !== req.entity_ref.id ? 'record_owner_mismatch' : admit(s);
          }
          // §6 step 4: later budget exhaustion cannot change the first outcome.
          // This per-owner map exists only within this batch, including null success.
          owner.outcomes.set(ref,reason);
        }
        if (reason) missing.push({record_ref:ref,reason}); else returned_refs.push(ref);
      }
      // Phase 5: budget failure takes precedence over every other missing kind.
      const status = missing.some(m => budgetReasons.has(m.reason)) ? 'budget_limited'
        : !missing.length ? 'returned_all' : !returned_refs.length ? 'returned_none' : 'returned_some';
      return {id:req.id,entity_ref:req.entity_ref,requested_refs:req.record_refs,status,returned_refs,
        context_refs:owner.reason ? [] : [owner.root.core.record_ref],missing};
    });
    const artifacts = new Set(records.map(r => r.artifact));
    const sources = state.index.sources.filter(s => artifacts.has(s.artifact)).sort((a,b) => compare(a.artifact,b.artifact));
    return {...base(state,input,'evidence'),results,records,sources,budget:{max_records:RAW_LIMITS.max_records,
      max_fields_utf16:RAW_LIMITS.max_fields_utf16,max_entity_refs:RAW_LIMITS.max_entity_refs,used_records:records.length,
      used_fields_utf16:records.reduce((n,r) => n+canonicalJson(r.fields).length,0),used_entity_refs:new Set(records.map(r => r.entity_ref.id)).size}};
  });
}
