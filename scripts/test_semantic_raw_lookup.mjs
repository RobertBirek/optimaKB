import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RAW_ARTIFACTS, RAW_METADATA_KEYS, canonicalJson, hashRaw, sha256,
  validateRawOutput, validateRawType, validateEvidenceInput, rawCallResult } from './lib/semantic_raw_contract.mjs';
import { syntheticRawFixture } from './lib/semantic_raw_test_fixture.mjs';
import { deriveRawIndex } from './lib/semantic_raw_index.mjs';
const api = await import('./lib/semantic_raw_lookup.mjs').catch(e => { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return {}; });
const [E,F,C] = RAW_ARTIFACTS;
const entity = id => ({namespace:'OWAOntology',id});
const unknown = '0'.repeat(64), stale = 'f'.repeat(64);
const clone = x => JSON.parse(canonicalJson(x));
function make(entities = [{id:'A'}], fields = [], chunks = [], mutate) {
  assert.equal(typeof api.createRawHandle,'function');
  const f = syntheticRawFixture({rows:{[E]:entities,[F]:fields,[C]:chunks}});
  const index = deriveRawIndex({...f.bindings,...f});
  mutate?.(index);
  const manifest = {snapshot_id:hashRaw('synthetic-snapshot',index),sources:index.sources};
  const sourceBytes = f.inputs;
  const handle = api.createRawHandle({manifest,index,sourceBytes});
  const ref = id => index.records.find(r => r.core.record_id === id).core.record_ref;
  const input = requests => ({snapshot_id:manifest.snapshot_id,requests});
  return {f,index,manifest,sourceBytes,handle,ref,input};
}
const request = (id,owner,refs) => ({id,entity_ref:entity(owner),record_refs:refs});
function discover(f,input) {
  assert.equal(typeof api.discoverRaw,'function');
  const out = api.discoverRaw(f.handle,input);
  assert.equal(validateRawOutput('discovery',out,{index:f.index,manifest:f.manifest,input}),true,canonicalJson(out));
  assert.notEqual(out.mode,'error',canonicalJson(out));
  assert.equal(rawCallResult(out).content[0].text,canonicalJson(out));
  return out;
}
function evidence(f,input) {
  assert.equal(typeof api.getRawRecords,'function');
  const out = api.getRawRecords(f.handle,input);
  assert.equal(validateRawOutput('evidence',out,{index:f.index,manifest:f.manifest,input}),true,canonicalJson(out));
  assert.notEqual(out.mode,'error',canonicalJson(out));
  assert.equal(rawCallResult(out).content[0].text,canonicalJson(out));
  return out;
}
const fixture = {
  twoOwnerRepeatedBatch() {
    const f = make([{id:'B'},{id:'A'}],[{id:'fa',entityRefId:'A',fieldName:'A_ID'},{id:'fb',entityRefId:'B',fieldName:'B_ID'}],
      [{id:'ca',sourceDocumentRefId:'A',sectionOrder:'1',content:'A_ID'}]);
    const input = f.input([request('a','A',[f.ref('fa'),f.ref('ca')]),request('b','B',[f.ref('fb')]),request('again','A',[f.ref('fa'),f.ref('A')])]);
    return {...f,input,ownerRefs:[f.ref('A'),f.ref('B')],selectedRefs:[f.ref('fa'),f.ref('ca'),f.ref('fb'),f.ref('A')]};
  },
};
test('owners reserve complete E first and repeated refs have one global charge', () => {
  assert.equal(typeof api.getRawRecords,'function');
  const {handle,input,ownerRefs,selectedRefs} = fixture.twoOwnerRepeatedBatch();
  const r = api.getRawRecords(handle,input);
  assert.deepEqual(r.records.slice(0,2).map(x => x.record_ref),ownerRefs);
  assert.equal(r.budget.used_records,new Set([...ownerRefs,...selectedRefs]).size);
  assert.equal(r.budget.used_fields_utf16,r.records.reduce((n,x) => n+canonicalJson(x.fields).length,0));
  assert.deepEqual(r.results.map(x => x.status),['returned_all','returned_all','returned_all']);
});
test('handle is opaque, frozen, nonforgeable by JSON or prototype and owns all inputs', () => {
  const f = make([{id:'A',description:'original'}],[{id:'f',entityRefId:'A',fieldName:'A_ID'}]);
  const input = {query:'A_ID',kind:'field'};
  const before = api.discoverRaw(f.handle,input);
  assert(Object.isFrozen(f.handle)); assert.deepEqual(Reflect.ownKeys(f.handle),[]);
  f.index.postings.length = 0; f.manifest.snapshot_id = stale;
  f.sourceBytes.forEach(s => s.bytes.fill(0));
  assert.deepEqual(api.discoverRaw(f.handle,input),before);
  before.candidates[0].name = 'changed'; before.candidates[0].origins.length = 0;
  assert.equal(api.discoverRaw(f.handle,input).candidates[0].name,'A_ID');
  for (const forged of [clone(f.handle),Object.create(f.handle),{},null]) {
    assert.equal(api.discoverRaw(forged,input).code,'INTERNAL_CONTRACT_ERROR');
  }
});
test('returned evidence mutations do not change a later stateless call', () => {
  const f = make(); const input = f.input([request('r','A',[f.ref('A')])]);
  const first = evidence(f,input), expected = clone(first);
  first.records[0].fields.id = 'bad'; first.sources[0].sha256 = stale;
  assert.deepEqual(evidence(f,input),expected);
});
test('first tier then kind then literal owner/name ranks, without OR or cross-candidate pooling', () => {
  const f = make([{id:'A'},{id:'B'}],[
    {id:'f1',entityRefId:'B',fieldName:'Z_ID',description:'operator'},
    {id:'f2',entityRefId:'A',fieldName:'X_ID',description:'Operator'},
    {id:'f3',entityRefId:'A',fieldName:'A_ID',description:'operator modyfikujący'},
    {id:'f4',entityRefId:'A',fieldName:'B_ID',description:'data'},
  ],[{id:'c',sourceDocumentRefId:'A',content:'operator'}]);
  const out = discover(f,{query:'operator',kind:'field'});
  assert.deepEqual(out.candidates.map(c => [c.candidate_kind,c.name]),[['field','Z_ID'],['field','X_ID'],['field','A_ID']]);
  assert.equal(discover(f,{query:'operator data',kind:'field'}).status,'no_candidates');
  assert.deepEqual(discover(f,{query:'operator modyfikujacy',kind:'field'}).candidates.map(c => c.name),['A_ID']);
});
test('future descriptive metadata and quoted names use complete source values', () => {
  const f = make([{id:'CONTRACTOR'},{id:'GOODS'}],[
    {id:'a',entityRefId:'CONTRACTOR',fieldName:'Future_Created',description:'Operator zakładający rekord'},
    {id:'b',entityRefId:'CONTRACTOR',fieldName:'Future_Modified',description:'Operator modyfikujący rekord'},
    {id:'c',entityRefId:'CONTRACTOR',fieldName:'Future_Date1',description:'Data utworzenia'},
    {id:'d',entityRefId:'CONTRACTOR',fieldName:'Future_Date2',description:'Data ostatniej modyfikacji'},
    {id:'e',entityRefId:'GOODS',fieldName:'`Future_Goods1`',description:'Operator zakładający'},
    {id:'f',entityRefId:'GOODS',fieldName:'`Future_Goods2`',description:'Operator modyfikujący'},
  ]);
  const first = discover(f,{query:'operator',kind:'field'});
  assert.equal(first.candidates.length,4); assert.equal(first.has_more,false);
  assert.deepEqual(first.candidates.map(c => c.name),['Future_Created','Future_Modified','`Future_Goods1`','`Future_Goods2`']);
  const second = discover(f,{query:'data',kind:'field',entity_ref:first.candidates[0].entity_ref,expected_snapshot_id:first.snapshot_id});
  assert.deepEqual(second.candidates.map(c => c.name),['Future_Date1','Future_Date2']);
  const refs = [...first.candidates.slice(0,2),second.candidates[1]].flatMap(c => c.record_refs);
  assert.equal(evidence(f,f.input([request('chosen','CONTRACTOR',refs)])).budget.used_records,4);
});
for (const [query,expected] of [['`Quoted_ID`','`Quoted_ID`'],['`quoted_id`','`Quoted_ID`'],['Quoted_ID','Quoted_ID']]) {
  test('quote-sensitive exact/fold matching and separate decoded mention '+query, () => {
    const f = make([{id:'A'}],[{id:'f',entityRefId:'A',fieldName:'`Quoted_ID`'}],[{id:'c',sourceDocumentRefId:'A',content:'`Quoted_ID`'}]);
    const r = discover(f,{query,kind:'field'});
    assert.equal(r.candidates[0].name,expected);
    assert.equal(r.candidates.length,2);
    assert.equal(new Set(r.candidates.map(c => c.candidate_id)).size,2);
    assert(r.candidates.some(c => c.name === '`Quoted_ID`' && c.candidate_kind === 'field'));
  });
}
test('all raw selector spellings including whitespace/punctuation preserve identity and fallback anchors', () => {
  const names = [' F_ID ','[F ID]','"F_ID"','   ','!','😀'.repeat(64)];
  const f = make([{id:'A'}],names.map((fieldName,i) => ({id:'f'+i,entityRefId:'A',fieldName})).concat({id:'fallback',entityRefId:'A',fieldName:'bad\n',mssqlColumn:'Fallback',description:'findfallback'}));
  for (const name of names.filter(n => n.trim())) assert(discover(f,{query:name,kind:'field'}).candidates.some(c => c.name === name));
  const fallback = discover(f,{query:'findfallback',kind:'field'}).candidates[0];
  assert.equal(fallback.name,'Fallback'); assert.equal(fallback.origins[0].metadata_key,'mssqlColumn');
});
for (const terms of [2,8,9]) test('exact technical set grammar/cardinality '+terms, () => {
  const names = Array.from({length:terms},(_,i) => 'X_'+i);
  const f = make([{id:'A'}],names.map((fieldName,i) => ({id:'f'+i,entityRefId:'A',fieldName})));
  const r = discover(f,{query:names.join(' '),kind:'field',limit:2});
  assert.deepEqual(r.candidates.map(c => c.name),terms <= 8 ? names.slice(0,2) : []);
  assert.equal(r.has_more,terms === 8);
});
for (const [query,names] of [['X_1 X_1',['X_1']],['x_1 X_2',['X_2']],['`X_1` X_2',[]],['!',[]]]) test('technical set does not decode quotes, fold members, dedupe or accept punctuation '+query, () => {
  const f = make([{id:'A'}],[{id:'f',entityRefId:'A',fieldName:'X_1'},{id:'g',entityRefId:'A',fieldName:'X_2'}]);
  assert.deepEqual(discover(f,{query,kind:'field'}).candidates.map(c => c.name),names);
});
test('folded whole values precede AND tokens; full omitted descriptions remain searchable', () => {
  const description = 'z'.repeat(241)+' rachunek Łódź';
  const f = make([{id:'A',canonicalName:'x'.repeat(241),description},{id:'B',name:'Rachunek Łódź'}]);
  const r = discover(f,{query:'rachunek lodz',kind:'entity'});
  assert.deepEqual(r.candidates.map(c => c.name),['B','A']);
  assert.equal(r.candidates[1].label,null);
  assert.deepEqual(r.candidates[1].omitted_metadata_keys,['canonicalName','description']);
  assert(!r.candidates[1].metadata_hints.some(h => ['description','canonicalName'].includes(h.key)));
});
test('first origin alone supplies metadata hints, empty values included, keys in enum order', () => {
  const f = make([{id:'A'}],[{id:'f1',entityRefId:'A',fieldName:'Same_ID',name:'n'.repeat(241),description:'first'},
    {id:'f2',entityRefId:'A',fieldName:'Same_ID',name:'second',description:'needle'}]);
  const c = discover(f,{query:'needle',kind:'field'}).candidates[0];
  assert.equal(c.label,null); assert.deepEqual(c.omitted_metadata_keys,['name']);
  assert.equal(c.metadata_hints.find(h => h.key === 'description').value,'first');
  assert.equal(c.metadata_hints.find(h => h.key === 'sqlType').value,'');
  assert.deepEqual(c.metadata_hints.map(h => h.key),c.metadata_hints.map(h => h.key).sort((a,b) => RAW_METADATA_KEYS.indexOf(a)-RAW_METADATA_KEYS.indexOf(b)));
  assert.equal(c.origins_count,2); assert.equal(c.record_ref_count,2);
});
test('field scope canonical absent/duplicate/alias/case and kind filters are exact', () => {
  const f = make([{id:'A',ontologyId:'ONTO',aliases:'Alias'},{id:'D'},{id:'D'}],[],[{id:'c',sourceDocumentRefId:'A',content:'BRa_IBAN'}]);
  for (const id of ['missing','ONTO','Alias','a']) assert.equal(discover(f,{query:'BRa_IBAN',kind:'field',entity_ref:entity(id)}).status,'owner_not_found');
  assert.equal(discover(f,{query:'BRa_IBAN',kind:'field',entity_ref:entity('D')}).status,'ambiguous_owner_ref');
  const c = discover(f,{query:'BRa_IBAN',kind:'field',entity_ref:entity('A')}).candidates;
  assert.deepEqual(c.map(c => c.candidate_kind),['identifier_mention']);
  assert.deepEqual(discover(f,{query:'BRa_IBAN',kind:'identifier_mention'}).candidates,c);
  assert.equal(discover(f,{query:'BRa_IBAN',kind:'entity'}).status,'no_candidates');
});
test('origins and unique refs retain full >8 counts; emitted origin refs are a subset', () => {
  const f = make([{id:'A'}],[],Array.from({length:10},(_,i) => ({id:'c'+i,sourceDocumentRefId:'A',content:i === 0 ? 'Token_ID Token_ID Token_ID' : 'Token_ID'})));
  const c = discover(f,{query:'Token_ID',kind:'field'}).candidates[0];
  assert.equal(c.origins_count,12); assert.equal(c.record_ref_count,10);
  assert.equal(c.origins.length,8); assert.equal(c.record_refs.length,8);
  assert(c.origins.every(o => c.record_refs.includes(o.record_ref)));
  assert.deepEqual(c.origins.slice(0,3).map(o => o.start_utf16),[0,9,18]);
  assert.deepEqual(c.record_refs,f.index.records.filter(r => r.core.kind === 'source_chunk').slice(0,8).map(r => r.core.record_ref));
});
test('related excludes every origin even capped refs and uses all-origin paths and truthful full counts', () => {
  const chunks = Array.from({length:9},(_,i) => ({id:'origin'+i,sourceDocumentRefId:'A',sourcePath:i === 8 ? 'late' : 'early',content:'Token_ID'}));
  chunks.push(...Array.from({length:11},(_,i) => ({id:'other'+i,sourceDocumentRefId:'A',sourcePath:'late',sectionOrder:String(11-i)})));
  const f = make([{id:'A'}],[],chunks), c = discover(f,{query:'Token_ID',kind:'field'}).candidates[0];
  assert.equal(c.related_record_count,12); assert.equal(c.related_records.length,8);
  assert.equal(c.related_records[0].record_ref,f.ref('A'));
  assert.deepEqual(c.related_records.slice(1).map(r => r.record_ref),Array.from({length:7},(_,i) => f.ref('other'+(10-i))));
  assert(c.related_records.slice(1).every(r => r.relation === 'same_owner_source_path'));
  assert(!c.related_records.some(r => r.record_ref === f.ref('origin8')));
});
test('navigation numeric safe decimal then invalid literal orders, path and physical ties; no hint inheritance', () => {
  const orders = ['10','2','02','','bad','9007199254740992','-1'];
  const f = make([{id:'A'}],[{id:'f',entityRefId:'A',fieldName:'Field_ID'}],
    [{id:'origin',sourceDocumentRefId:'A',sourcePath:'p',content:'Token_ID'},...orders.map((sectionOrder,i) => ({id:'c'+i,sourceDocumentRefId:'A',sourcePath:'p',sectionOrder}))]);
  const c = discover(f,{query:'Token_ID',kind:'identifier_mention'}).candidates[0];
  assert.deepEqual(c.related_records.map(r => r.record_ref),['A','c1','c2','c0','c3','c6','c5','c4'].map(f.ref));
  assert.equal(c.related_record_count,9);
  const field = discover(f,{query:'Field_ID',kind:'field'}).candidates[0];
  assert(field.related_records.filter(r => r.relation === 'owner_context').every(r => r.source_path === null && r.section_order === null));
  assert(!field.metadata_hints.some(h => h.key === 'sourcePath'));
});
test('evidence resolves owners before refs and preserves missing order with exact quarantine/mismatch reasons', () => {
  const f = make([{id:'A',ontologyId:'X'},{id:'B',ontologyId:'X'},{id:'D'},{id:'D'}],
    [{id:'a',entityRefId:'A',fieldName:'A_ID'},{id:'b',entityRefId:'B',fieldName:'B_ID'},
      {id:'amb',entityRefId:'X'},{id:'unr',entityRefId:'missing'}]);
  const input = f.input([request('a','A',[unknown,f.ref('b'),f.ref('amb'),f.ref('unr'),f.ref('a')]),request('absent','ONTO',[f.ref('a')])]);
  const r = evidence(f,input);
  assert.deepEqual(r.results[0].missing.map(m => m.reason),['record_not_found','record_owner_mismatch','record_quarantined_ambiguous','record_quarantined_unresolved']);
  assert.equal(r.results[0].status,'returned_some');
  assert.equal(r.results[1].missing[0].reason,'owner_not_found');
  assert.equal(evidence(f,f.input([request('dup','D',[f.ref('a')])])).results[0].missing[0].reason,'ambiguous_owner_ref');
  assert.deepEqual(r.records.map(r => r.record_id),['A','a']);
  assert.deepEqual(r.sources.map(s => s.artifact),[E,F]);
});
test('unknown and mismatched explicit refs still charge all owners contexts first', () => {
  const f = make([{id:'A'},{id:'B'}]);
  const r = evidence(f,f.input([request('a','A',[unknown]),request('b','B',[f.ref('A')])]));
  assert.deepEqual(r.records.map(r => r.record_id),['A','B']);
  assert.deepEqual(r.results.map(r => r.status),['returned_none','returned_none']);
  assert.deepEqual(r.sources.map(s => s.artifact),[E]);
});
test('missing/quarantined context blocks refs without borrowing another owner', () => {
  const f = make([{id:'A'}],[],[],idx => { idx.records[0].disposition = 'quarantined_unresolved'; idx.records[0].entity_ref = null; });
  const r = evidence(f,f.input([request('a','A',[unknown])]));
  assert.equal(r.results[0].missing[0].reason,'owner_context_unavailable');
  assert.deepEqual(r.records,[]); assert.deepEqual(r.sources,[]);
});
function sizedField(owner,id,target) {
  const row = {id,entityRefId:owner,fieldName:id,summary:'😀"\\\n\u0001'};
  const f = syntheticRawFixture({rows:{[E]:[{id:owner}],[F]:[row],[C]:[]}});
  const idx = deriveRawIndex({...f.bindings,...f}), size = idx.records.find(r => r.core.kind === 'field_metadata').core.fields_utf16;
  assert(target >= size); return {...row,summary:row.summary+'x'.repeat(target-size)};
}
for (const delta of [0,1]) test('canonical fields budget exact 16000 and one over, including keys/empty cells/escapes/emoji '+delta, () => {
  const base = make(), eCost = base.index.records[0].core.fields_utf16;
  const f = make([{id:'A'}],[sizedField('A','Big_ID',16000-eCost+delta)]);
  const input = f.input([request('a','A',[f.ref('Big_ID')])]);
  const r = evidence(f,input);
  assert.equal(r.budget.used_fields_utf16,delta ? eCost : 16000);
  assert.equal(r.results[0].status,delta ? 'budget_limited' : 'returned_all');
  if (delta) assert.equal(r.results[0].missing[0].reason,'char_limit');
  else assert.equal(r.records[1].fields.summary.startsWith('😀"\\\n\u0001'),true);
});
for (const n of [7,8]) test('unique complete record cap exact eight and ninth missing '+n, () => {
  const f = make([{id:'A'}],Array.from({length:n},(_,i) => ({id:'F_'+i,entityRefId:'A',fieldName:'F_'+i})));
  const refs = Array.from({length:n},(_,i) => f.ref('F_'+i));
  const r = evidence(f,f.input([request('r','A',refs)]));
  assert.equal(r.budget.used_records,8);
  assert.equal(r.results[0].status,n === 7 ? 'returned_all' : 'budget_limited');
  if (n === 8) assert.deepEqual(r.results[0].missing,[{record_ref:refs[7],reason:'record_limit'}]);
});
test('record limit wins when both limits fail and budget status wins over other missing reasons', () => {
  const f = make([{id:'A'}],[...Array.from({length:7},(_,i) => ({id:'F_'+i,entityRefId:'A',fieldName:'F_'+i})),sizedField('A','Big_ID',16001)]);
  const refs = Array.from({length:7},(_,i) => f.ref('F_'+i));
  const r = evidence(f,f.input([request('first','A',refs),request('last','A',[unknown,f.ref('Big_ID')])]));
  assert.equal(r.results[1].status,'budget_limited');
  assert.deepEqual(r.results[1].missing.map(m => m.reason),['record_not_found','record_limit']);
});
test('too large earlier ref permits later smaller; repeated failures remain deterministic', () => {
  const f = make([{id:'A'}],[sizedField('A','Big_ID',16001),{id:'Small_ID',entityRefId:'A',fieldName:'Small_ID'}]);
  const input = f.input([request('r1','A',[f.ref('Big_ID'),f.ref('Small_ID')]),request('r2','A',[f.ref('Big_ID'),f.ref('Small_ID')])]);
  const r = evidence(f,input);
  assert.deepEqual(r.records.map(r => r.record_id),['A','Small_ID']);
  assert.deepEqual(r.results.map(r => r.missing),Array(2).fill([{record_ref:f.ref('Big_ID'),reason:'char_limit'}]));
  assert.deepEqual(evidence(f,input),r);
});
test('same owner/ref keeps its first char rejection across intervening record exhaustion within one batch', () => {
  const f = make([{id:'A'}],[sizedField('A','Big_ID',16001),
    ...Array.from({length:7},(_,i) => ({id:'F_'+i,entityRefId:'A',fieldName:'F_'+i}))]);
  const big = f.ref('Big_ID'), small = Array.from({length:7},(_,i) => f.ref('F_'+i));
  const first = request('first','A',[big]), fill = request('fill','A',small), repeat = request('repeat','A',[big]);
  const input = f.input([first,fill,repeat]), out = evidence(f,input);
  assert.deepEqual(out.results.map(r => r.missing),[[{record_ref:big,reason:'char_limit'}],[],[{record_ref:big,reason:'char_limit'}]]);
  assert.deepEqual(out.results.map(r => r.status),['budget_limited','returned_all','budget_limited']);
  assert.deepEqual(out.records.map(r => r.record_ref),[f.ref('A'),...small]);
  assert.equal(out.budget.used_records,8);
  assert.equal(out.budget.used_fields_utf16,out.records.reduce((n,r) => n+canonicalJson(r.fields).length,0));
  // The same immutable handle starts a fresh outcome map for the next batch.
  const reversed = evidence(f,f.input([fill,first,repeat]));
  assert.deepEqual(reversed.results.slice(1).map(r => r.missing),Array(2).fill([{record_ref:big,reason:'record_limit'}]));
  assert.deepEqual(evidence(f,input),out);
});
test('oversized first owner context blocks all its refs yet smaller second context and body fit', () => {
  const f = make([{id:'A',summary:'x'.repeat(16000)},{id:'B'}],[{id:'b',entityRefId:'B',fieldName:'B_ID'}]);
  const r = evidence(f,f.input([request('a','A',[unknown,f.ref('b')]),request('b','B',[f.ref('b')])]));
  assert.deepEqual(r.results[0].missing.map(m => m.reason),Array(2).fill('owner_context_char_limit'));
  assert.deepEqual(r.records.map(r => r.record_id),['B','b']);
});
test('all owner E contexts reserve before a large first owner selected record', () => {
  const eCost = make().index.records[0].core.fields_utf16;
  const f = make([{id:'A'},{id:'B'}],[sizedField('A','Big_ID',16000-eCost)]);
  const r = evidence(f,f.input([request('a','A',[f.ref('Big_ID')]),request('b','B',[unknown])]));
  assert.deepEqual(r.records.map(r => r.record_id),['A','B']);
  assert.equal(r.results[0].missing[0].reason,'char_limit');
});
test('second owner context fails before any ref lookup when earlier context consumes characters', () => {
  const base = make().index.records[0].core.fields_utf16;
  const f = make([{id:'A',summary:'x'.repeat(16000-base)},{id:'B'}]);
  const r = evidence(f,f.input([request('a','A',[f.ref('A')]),request('b','B',[unknown,f.ref('A')])]));
  assert.equal(r.budget.used_fields_utf16,16000);
  assert.deepEqual(r.results[1].missing.map(m => m.reason),Array(2).fill('owner_context_char_limit'));
});
test('whole literal raw fields, physical hashes, source order, explicit E reuse and semantic literals survive', () => {
  const f = make([{id:'A',summary:'UNKNOWN\r\n?'}],[{id:'f',entityRefId:'A',fieldName:'`Field`',nullable:'',sqlType:'UNKNOWN'}],
    [{id:'c',sourceDocumentRefId:'A',sourcePath:'/never/open',sectionOrder:'0002',content:'| split\r\n😀 "quoted"'}]);
  const r = evidence(f,f.input([request('r','A',[f.ref('c'),f.ref('A'),f.ref('f')])]));
  assert.deepEqual(r.records.map(r => r.record_id),['A','c','f']);
  assert.deepEqual(r.sources.map(r => r.artifact),[C,E,F]);
  for (const record of r.records) {
    assert.deepEqual(record.fields,f.index.records.find(s => s.core.record_ref === record.record_ref).core.fields);
    const bytes = f.sourceBytes.find(s => s.artifact === record.artifact).bytes;
    assert.equal(record.raw_record_sha256,sha256(bytes.subarray(record.physical.byte_start,record.physical.byte_end)));
    assert.equal(record.semantic_completeness,'not_assessed'); assert.equal(record.integrity,'exact_export_record');
  }
});
for (const operation of ['discovery','evidence']) test('snapshot mismatch is whole-call, bound and canonical '+operation, () => {
  const f = make();
  const input = operation === 'discovery' ? {query:'A',kind:'entity',expected_snapshot_id:stale,correlation_id:'corr'} : {...f.input([request('r','A',[unknown])]),snapshot_id:stale,correlation_id:'corr'};
  const r = (operation === 'discovery' ? api.discoverRaw : api.getRawRecords)(f.handle,input);
  assert.equal(r.code,'SNAPSHOT_MISMATCH'); assert.equal(r.expected_snapshot_id,stale); assert.equal(r.active_snapshot_id,f.manifest.snapshot_id);
  assert.equal(r.correlation_id,'corr'); assert(validateRawOutput(operation,r,{manifest:f.manifest,input}));
  assert.equal(rawCallResult(r).isError,true);
});
test('strict norm inputs reject extras, caller budgets, unsafe integer limits and more than two owners', () => {
  const f = make();
  for (const limit of [0,6,1.5,Number.MAX_SAFE_INTEGER+1,-0,null]) assert.throws(() => api.discoverRaw(f.handle,{query:'A',kind:'entity',limit}),e => e.code === -32602);
  for (const extra of [{budget:1},{aspect:'x'},{queryplan:[]}]) assert.throws(() => api.getRawRecords(f.handle,{...f.input([request('r','A',[unknown])]),...extra}),e => e.code === -32602);
  const input = f.input(['A','B','C'].map((id,i) => request('r'+i,id,[unknown])));
  assert.equal(validateEvidenceInput(input),false);
  assert.throws(() => api.getRawRecords(f.handle,input),e => e.code === -32602);
  assert.throws(() => api.discoverRaw(f.handle,{query:'x',kind:'field',entity_ref:{namespace:'Foreign',id:'A'}}),e => e.code === -32001);
});
test('existing contextual validator rejects tampered candidate caps/navigation/hints/rank/counts', () => {
  const f = make([{id:'A'}],[{id:'f',entityRefId:'A',fieldName:'Field_ID',description:'needle'}],[{id:'c',sourceDocumentRefId:'A',content:'Field_ID'}]);
  const input = {query:'Field_ID',kind:'field'}, out = discover(f,input), context = {index:f.index,manifest:f.manifest,input};
  for (const change of [r => r.candidates.reverse(),r => r.has_more = true,r => r.candidates[0].origins_count++,r => r.candidates[0].record_ref_count++,
    r => r.candidates[0].metadata_hints[0].value = 'lie',r => r.candidates[0].related_records[0].relation = 'same_owner',r => r.candidates[0].record_refs[0] = unknown]) {
    const bad = clone(out); change(bad); assert.equal(validateRawOutput('discovery',bad,context),false);
  }
});
test('existing contextual validator rejects tampered evidence integrity/context/ref/order/budget/status coupling', () => {
  const f = make([{id:'A'}],[{id:'f',entityRefId:'A',fieldName:'Field_ID'}]);
  const input = f.input([request('r','A',[f.ref('f'),unknown])]), out = evidence(f,input), context = {index:f.index,manifest:f.manifest,input};
  for (const change of [r => r.records.reverse(),r => r.records[1].fields.sqlType = 'lie',r => r.budget.used_fields_utf16++,r => r.results[0].context_refs = [],
    r => r.results[0].missing[0].reason = 'record_owner_mismatch',r => r.results[0].status = 'returned_all',r => r.sources.reverse(),r => r.results[0].returned_refs = []]) {
    const bad = clone(out); change(bad); assert.equal(validateRawOutput('evidence',bad,context),false);
  }
});
test('lookup refuses a success whose trusted internal data fails output cross-invariants', () => {
  const f = make([{id:'A'}],[{id:'f',entityRefId:'A',fieldName:'Field_ID'}],[],idx => { idx.records.find(r => r.core.record_id === 'f').core.fields_utf16++; });
  const r = api.getRawRecords(f.handle,f.input([request('r','A',[f.ref('f')])]));
  assert.deepEqual(Object.keys(r).sort(),['schema_version','mode','operation','code','retry','expected_snapshot_id','active_snapshot_id','correlation_id'].sort());
  assert.equal(r.code,'INTERNAL_CONTRACT_ERROR'); assert.equal(r.expected_snapshot_id,null);
  assert(validateRawType('ToolError',r));
});
test('metadata caps count UTF16 exactly at 240/241, not scalars or UTF8 bytes', () => {
  const f = make([{id:'A'}],[{id:'a',entityRefId:'A',fieldName:'Boundary_A',name:'😀'.repeat(120),description:'😀'.repeat(120)},
    {id:'b',entityRefId:'A',fieldName:'Boundary_B',name:'😀'.repeat(120)+'x',description:'😀'.repeat(120)+'x'}]);
  const a = discover(f,{query:'Boundary_A',kind:'field'}).candidates[0];
  const b = discover(f,{query:'Boundary_B',kind:'field'}).candidates[0];
  assert.equal(a.label.length,240); assert.equal(a.metadata_hints.find(h => h.key === 'description').value.length,240);
  assert.deepEqual(a.omitted_metadata_keys,[]); assert.equal(b.label,null); assert.deepEqual(b.omitted_metadata_keys,['name','description']);
});
test('navigation path precedes numeric order, empty paths get same_owner and null applies only to non-C', () => {
  const f = make([{id:'A'}],[{id:'f',entityRefId:'A',fieldName:'Field_ID'}],[
    {id:'oa',sourceDocumentRefId:'A',sourcePath:'a',content:'Token_ID'},
    {id:'ob',sourceDocumentRefId:'A',sourcePath:'b',content:'Token_ID'},
    {id:'a10',sourceDocumentRefId:'A',sourcePath:'a',sectionOrder:'10'},
    {id:'b1',sourceDocumentRefId:'A',sourcePath:'b',sectionOrder:'1'},
    {id:'empty',sourceDocumentRefId:'A',sourcePath:'',sectionOrder:''},
  ]);
  const c = discover(f,{query:'Token_ID',kind:'field'}).candidates[0];
  assert.deepEqual(c.related_records.map(r => r.record_ref),['A','a10','b1','empty','f'].map(f.ref));
  assert.deepEqual(c.related_records.map(r => [r.relation,r.source_path,r.section_order]),[
    ['owner_context',null,null],['same_owner_source_path','a','10'],['same_owner_source_path','b','1'],['same_owner','',''],['same_owner',null,null],
  ]);
});
test('same owned physical ref is reused for its owner but mismatched for the other owner', () => {
  const f = make([{id:'A'},{id:'B'}],[{id:'f',entityRefId:'A',fieldName:'Field_ID'}]);
  const r = evidence(f,f.input([request('own','A',[f.ref('f')]),request('foreign','B',[f.ref('f')]),request('again','A',[f.ref('f')])]));
  assert.deepEqual(r.results.map(r => r.status),['returned_all','returned_none','returned_all']);
  assert.equal(r.results[1].missing[0].reason,'record_owner_mismatch');
  assert.equal(r.budget.used_records,3);
});
test('limit and has_more reflect all ranked kinds, and exact mentions beat token metadata', () => {
  const f = make([{id:'A'}],[{id:'a',entityRefId:'A',fieldName:'`Token_ID`'},
    ...Array.from({length:6},(_,i) => ({id:'f'+i,entityRefId:'A',fieldName:'F_'+i,description:'Token_ID extra'}))],
  [{id:'c',sourceDocumentRefId:'A',content:'Token_ID'}]);
  const r = discover(f,{query:'Token_ID',kind:'field',limit:1});
  assert.equal(r.has_more,true); assert.equal(r.candidates.length,1); assert.equal(r.candidates[0].candidate_kind,'identifier_mention');
  assert.equal(discover(f,{query:'Token_ID',kind:'identifier_mention'}).has_more,false);
});
test('literal UTF16 owner/name sorting avoids locale order and never resolves ontology aliases', () => {
  const f = make([{id:'Z'},{id:'a'},{id:'Ą'}],[{id:'z',entityRefId:'Z',fieldName:'x',description:'needle'},
    {id:'a',entityRefId:'a',fieldName:'x',description:'needle'},{id:'q',entityRefId:'Ą',fieldName:'x',description:'needle'}]);
  assert.deepEqual(discover(f,{query:'needle',kind:'field'}).candidates.map(c => c.entity_ref.id),['Z','a','Ą']);
});
test('all eight requests may share complete E and refs, with no query session requirement', () => {
  const f = make([{id:'A'}],[{id:'f',entityRefId:'A',fieldName:'Field_ID'}]);
  const input = f.input(Array.from({length:8},(_,i) => request('r'+i,'A',[f.ref('f')])));
  const r = evidence(f,input);
  assert.equal(r.results.length,8); assert.equal(r.budget.used_records,2); assert(r.results.every(r => r.status === 'returned_all'));
  assert.equal(validateRawType('IndexPayload',f.index),false,'internal constructor never weakens production all-366 gate');
});
