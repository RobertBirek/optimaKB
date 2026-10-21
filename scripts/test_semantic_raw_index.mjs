import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { RAW_ARTIFACTS, RAW_SOURCE_SEALS, RAW_LEXER_SHA256, canonicalJson, sha256, hashRaw, validateRawType } from './lib/semantic_raw_contract.mjs';
import { syntheticRawFixture } from './lib/semantic_raw_test_fixture.mjs';
import { rawEnvironment, measureRawClosure } from './lib/semantic_raw_code.mjs';
const api = await import('./lib/semantic_raw_index.mjs').catch(e => { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return {}; });
const [E,F,C] = RAW_ARTIFACTS;
const controller = await import('./lib/semantic_raw_compile_controller.mjs').catch(e => { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return {}; });
const derive = options => { assert.equal(typeof api.deriveRawIndex,'function'); const f = syntheticRawFixture(options); return api.deriveRawIndex({...f.bindings,sources:f.sources,inputs:f.inputs}); };
const custom = (entities,fields = [],chunks = []) => ({ rows:{[E]:entities,[F]:fields,[C]:chunks} });
const ds = (idx,r) => idx.diagnostics.filter(d => d.record_ref === r.core.record_ref);

test('duplicate canonical IDs quarantine both E occurrences and dependent rows', () => {
  const idx = derive({duplicateCanonicalOwner:true});
  assert.equal(idx.accounting.total,idx.records.length);
  assert.equal(idx.postings.length,0);
  assert(idx.records.every(r => r.disposition === 'quarantined_ambiguous'));
  assert.equal(new Set(idx.records.map(r => r.core.record_ref)).size,4);
  assert.equal(idx.owners.length,0);
});
test('ontology collision retains canonical roots but union lookup quarantines dependents', () => {
  const idx = derive(custom([{id:'A',ontologyId:'X'},{id:'B',ontologyId:'X'}],[{id:'f',entityRefId:'X',fieldName:'F_ID'}],[{id:'c',sourceDocumentRefId:'A',sectionOrder:'0'}]));
  assert.equal(idx.owners.length,2);
  assert.equal(idx.records.find(r => r.core.record_id === 'f').disposition,'quarantined_ambiguous');
  assert.equal(idx.records.find(r => r.core.record_id === 'c').entity_ref.id,'A');
  assert.equal(idx.owner_lookup.find(l => l.literal_ref === 'X').entity_record_refs.length,2);
});
for (const id of ['', 'bad\nID', 'x'.repeat(257)]) test('invalid canonical id retained '+JSON.stringify(id.slice(0,12)), () => {
  const idx = derive(custom([{id,ontologyId:'X'}],[],[{id:'c',sourceDocumentRefId:'X'}]));
  assert(idx.records.every(r => r.disposition === 'quarantined_unresolved'));
  const root = idx.records.find(r => r.core.kind === 'entity_metadata');
  assert(ds(idx,root).some(d => d.code === 'invalid_owner_id' && d.key === 'id'));
});
test('lookup is literal union not first-match, alias, label or prefix resolution', () => {
  const idx = derive(custom([{id:'A',ontologyId:'A',aliases:'Alias',name:'Label'},{id:'B',ontologyId:'A'}],['A','B','Alias','Label','a','A_suffix',' A'].map((ref,i) => ({id:String(i),entityRefId:ref,fieldName:'F_ID'}))));
  const fields = idx.records.filter(r => r.core.kind === 'field_metadata');
  assert.deepEqual(fields.map(r => r.disposition),['quarantined_ambiguous','owned',...Array(5).fill('quarantined_unresolved')]);
  assert.equal(idx.owner_lookup.find(l => l.literal_ref === 'A').entity_record_refs.length,2);
});
test('invalid ontology id diagnosed without removing admitted canonical owner', () => {
  const idx = derive(custom([{id:'A',ontologyId:'bad\t'}]));
  assert.equal(idx.owners.length,1); assert(!idx.owner_lookup.some(l => l.literal_ref === 'bad\t'));
  assert(idx.diagnostics.some(d => d.code === 'invalid_owner_id' && d.key === 'ontologyId'));
});
test('duplicate nonempty record IDs retain every physical occurrence in each artifact', () => {
  const idx = derive(custom([{id:'A'}],[{id:'same',entityRefId:'A',fieldName:'F_ID'},{id:'same',entityRefId:'A',fieldName:'F_ID'},{id:'',entityRefId:'A'},{id:'',entityRefId:'A'}]));
  const fields = idx.records.filter(r => r.core.kind === 'field_metadata');
  assert.equal(new Set(fields.map(r => r.core.record_ref)).size,4);
  assert.deepEqual(fields.map(r => ds(idx,r).some(d => d.code === 'duplicate_record_id')),[true,true,false,false]);
});
test('complete descriptions and semicolon aliases admitted without display cutoff', () => {
  const description = 'x'.repeat(500)+' rachunek';
  const idx = derive(custom([{id:'A',description,aliases:' one ; ;two;one '}],[{id:'f',entityRefId:'A',fieldName:'F_ID',description:'Operator zakładający'}]));
  assert(idx.postings.some(p => p.candidate_kind === 'entity' && p.search_value === description));
  assert(idx.postings.some(p => p.candidate_kind === 'field' && p.search_value === 'Operator zakładający'));
  assert.equal(idx.postings.filter(p => p.candidate_kind === 'entity' && p.search_value === 'one').length,1);
  assert(!idx.postings.some(p => p.search_value === ' one ; ;two;one '));
});
for (const name of ['`F_ID`','[F ID]','"F_ID"',' F_ID ','   ','!','😀'.repeat(64)]) test('raw selector exact identity '+JSON.stringify(name.slice(0,15)), () => {
  const idx = derive(custom([{id:'A'}],[{id:'f',entityRefId:'A',fieldName:name,mssqlColumn:'fallback'}]));
  const postings = idx.postings.filter(p => p.candidate_kind === 'field');
  assert.equal(postings[0].name,name); assert.equal(postings[0].origin.metadata_key,'fieldName');
  assert(!idx.diagnostics.some(d => d.code === 'invalid_field_name'));
});
for (const [primary,fallback,keys,selected] of [
  ['bad\n','good',['fieldName'],'good'],['','good',[],'good'],['','',['mssqlColumn'],null],
  ['x'.repeat(129),'bad\t',['fieldName','mssqlColumn'],null],['ok','bad\n',[],'ok'],
]) test('selector fallback diagnostics '+JSON.stringify([primary.slice(0,10),fallback]), () => {
  const idx = derive(custom([{id:'A'}],[{id:'f',entityRefId:'A',fieldName:primary,mssqlColumn:fallback}]));
  assert.deepEqual(idx.diagnostics.filter(d => d.code === 'invalid_field_name').map(d => d.key),keys);
  assert.deepEqual([...new Set(idx.postings.filter(p => p.candidate_kind === 'field').map(p => p.name))],selected === null ? [] : [selected]);
});
test('body token roles suppress opaque/RHS/fences/malformed/glued/wildcards independently of metadata', () => {
  const description = '`Good_ID` "Opaque_ID" Head_ID = RHS_ID; ```Fence_ID``` Broken_ID* [Bad ID] Pre`Glue_ID`';
  const idx = derive(custom([{id:'A',description}],[{id:'f',entityRefId:'A',fieldName:'`Good_ID`',summary:'Summary_ID'}],[{id:'c',sourceDocumentRefId:'A',sectionOrder:'1',content:'Chunk_ID'}]));
  const names = [...new Set(idx.postings.filter(p => p.candidate_kind === 'identifier_mention').map(p => p.name))].sort();
  assert.deepEqual(names,['Chunk_ID','Good_ID','Head_ID','Summary_ID']);
  assert(idx.postings.some(p => p.search_value === description && p.candidate_kind === 'entity'));
  assert(idx.postings.some(p => p.name === '`Good_ID`' && p.candidate_kind === 'field'));
  assert(idx.diagnostics.some(d => d.code === 'malformed_identifier'));
});
test('tilde opener excludes whole body cell only and diagnostics use exact spans', () => {
  const text = 'Before_ID\r\n   ~~~code\nAfter_ID';
  const idx = derive(custom([{id:'A',description:text,summary:'Still_ID'}]));
  const d = idx.diagnostics.find(d => d.code === 'unsupported_fence');
  assert.deepEqual([d.key,d.start_utf16,d.end_utf16],['description',0,text.length]);
  assert.deepEqual(idx.postings.filter(p => p.candidate_kind === 'identifier_mention').map(p => p.name),['Still_ID']);
  assert(idx.postings.some(p => p.search_value === text));
});
test('all records get partition, semantic and iff-no-postings diagnostics, sorted and hash-bound', () => {
  const idx = derive(custom([{id:'A'},{id:'B'}],[{id:'f',entityRefId:'missing'}],[{id:'c',sourceDocumentRefId:'A',sectionOrder:'bad',content:'"Opaque_ID" "unclosed'}]));
  const posted = new Set(idx.postings.map(p => p.origin.record_ref));
  for (const r of idx.records) {
    assert.equal(ds(idx,r).some(d => d.code === 'no_hint_postings'),!posted.has(r.core.record_ref));
    assert(ds(idx,r).some(d => d.code === 'semantic_not_assessed'));
    for (const d of ds(idx,r)) { const {diagnostic_id,...key} = d; assert.equal(diagnostic_id,hashRaw('diagnostic',key)); assert(validateRawType('Diagnostic',d,{record:r.core})); }
    assert.deepEqual(r.diagnostic_ids,ds(idx,r).map(d => d.diagnostic_id));
  }
  assert(idx.diagnostics.some(d => d.code === 'unclosed_atom'));
  assert(idx.diagnostics.some(d => d.code === 'invalid_section_order'));
  assert.equal(idx.accounting.total,idx.accounting.owned+idx.accounting.quarantined_ambiguous+idx.accounting.quarantined_unresolved);
  assert.equal(idx.accounting.diagnostic_count,idx.diagnostics.length);
  assert.equal(validateRawType('IndexPayload',idx),false,'synthetic representation never production-admitted');
});
for (const order of ['','-1','1.5','1e2','9007199254740992','１２']) test('invalid section order '+JSON.stringify(order), () => {
  const idx = derive(custom([{id:'A'}],[],[{id:'c',sourceDocumentRefId:'A',sectionOrder:order}]));
  assert(idx.diagnostics.some(d => d.code === 'invalid_section_order'));
});
test('derivation binds each exact byte slice and is deterministic without mutating inputs', () => {
  assert.equal(typeof api.deriveRawIndex,'function');
  const f = syntheticRawFixture(custom([{id:'A',description:'a\r\n😀 "q"'}]));
  const before = f.inputs.map(i => sha256(i.bytes));
  const idx = api.deriveRawIndex({...f.bindings,...f});
  assert.deepEqual(idx,api.deriveRawIndex({...f.bindings,...f}));
  assert.deepEqual(before,f.inputs.map(i => sha256(i.bytes)));
  for (const r of idx.records) {
    const bytes = f.inputs.find(i => i.artifact === r.core.artifact).bytes;
    assert.equal(r.core.raw_record_sha256,sha256(bytes.subarray(r.core.physical.byte_start,r.core.physical.byte_end)));
    assert.equal(r.core.fields_utf16,canonicalJson(r.core.fields).length);
    assert(validateRawType('RecordCore',r.core,{source:f.sources.find(s => s.artifact === r.core.artifact)}));
  }
});
test('production compiler rejects synthetic inputs and closed-shape extras without throwing', () => {
  assert.equal(typeof api.compileRawIndex,'function');
  assert.deepEqual(api.compileRawIndex({}),{ok:false,code:'INDEX_CONTRACT_INVALID'});
});
test('frozen lexer byte identity', () => {
  assert.equal(typeof api.deriveRawIndex,'function');
  assert.equal(sha256(fs.readFileSync(new URL('./lib/semantic_lexical_context.mjs',import.meta.url))),RAW_LEXER_SHA256);
});
test('all pinned production rows retain references and every E/F complete description/quoted selector', () => {
  assert.equal(typeof api.deriveRawIndex,'function');
  const inputs = RAW_ARTIFACTS.map(artifact => ({artifact,bytes:fs.readFileSync('/tmp/opencode/semantic42-frozen-EsJ4gr/'+artifact)}));
  const f = syntheticRawFixture();
  const idx = api.deriveRawIndex({...f.bindings,inputs,sources:RAW_SOURCE_SEALS});
  assert.equal(idx.records.length,366); assert.equal(idx.accounting.owned,366);
  assert(validateRawType('IndexPayload',idx));
  let quoted = 0;
  for (const r of idx.records) {
    const c = r.core, ps = idx.postings.filter(p => p.origin.record_ref === c.record_ref);
    if (c.kind !== 'source_chunk') assert(ps.some(p => p.search_value === c.fields.description && p.candidate_kind === (c.kind === 'entity_metadata' ? 'entity' : 'field')));
    if (c.kind === 'field_metadata') { assert(ps.some(p => p.candidate_kind === 'field' && p.name === c.fields.fieldName)); if (c.fields.fieldName.startsWith('`')) quoted++; }
    const bytes = inputs.find(i => i.artifact === c.artifact).bytes;
    assert.equal(c.raw_record_sha256,sha256(bytes.subarray(c.physical.byte_start,c.physical.byte_end)));
    assert.equal(c.fields_utf16,canonicalJson(c.fields).length);
  }
  assert.equal(quoted,41);
  const vectors = [
    [E,171,'f0995fa082b0e7dc31f39a29b932ef3a9831390ce11db9d8cd3f418dc862817c'],
    [E,172,'5ad0cb476fa560cd7e270ad3eb554f6182f78d6ea0eb959d5452a29571d5bb45'],
    [E,173,'c42227c5225810041b78b23f71088938c18bcef1c9d1c52e174146db718d09bf'],
    [C,1954,'64cc68bdec3866dd91fe90c86ae03da039a3a108de1054526b1b7f5a2836e787'],
    [C,1982,'d5b2bcdcf60791f0b8be65bd1a2a1209a95a28daf28f8a56341525e81def30c5'],
    [C,2010,'5e1c4d27284c6079401e3db86b04dacd8c5d135a2935e22253247d89fce1c245'],
    [C,2045,'9da9cdf7ece2ef866fb527444a00e066ab2d8b20818aea449a558e12f10d5744'],
    [C,2078,'e60a87a47f68e2dd95e59f786df1d402f80466cfeb58f2ed9f8fcfbb1844a6a3'],
    [C,2105,'afea02c7a750f64d5334a52d36fcda7e452d1a100c05acf8b7393c36a1213711'],
    [F,47,'5ae14cee96f0d70c4e8522f7d47f5863f31584b128a21329b8c7f726d4b85285'],
    [F,48,'f6beb61d8e6c50fce6cfd52f8cb940c9178fa16f3f9acdc6a4a6df02458ff25f'],
    [F,50,'6ac2f9f1b7684e9b4b31f585916006422bc879dd752080079e87b8de09daff74'],
    [C,2125,'c0488980610c1f4fe19201c13d0c71b035ef7792e4b1a0902b552d5cb837f5b6'],
    [C,2144,'2674a3e65dc6f233e44babf33958f34fd95da3b7b3ea278bee64641e000bbdab'],
    [C,2200,'7e2705268e2639addb3b27ffe59d17e7e38261d56797bd999ca362c7c193ced9'],
    [C,2230,'17d2eca2a87f390b26fcbcfe788a0267636777ab69eb56ed8106e3f910011876'],
  ];
  for (const [artifact,line,ref] of vectors) assert.equal(idx.records.find(r => r.core.artifact === artifact && r.core.physical.line_start === line).core.record_ref,ref);
  for (const [line,expected] of [[96,'2617082c1553e2d215e9be21cc1c5344855f03861cbcb44dde41b3ea38139f7a'],[97,'93adcfbb784cba42650aee8e56ef1365ddff6c7549fdda0f22b03dc3d7cca38d']]) {
    const r = idx.records.find(r => r.core.artifact === F && r.core.physical.line_start === line);
    assert.equal(hashRaw('candidate',{candidate_kind:'field',entity_ref:r.entity_ref,name:r.core.fields.fieldName}),expected);
  }
});

// Each positive compiler test uses the real current compiler/runtime bytes.
// No future source files are invented and no service/application is imported.
function productionInput() {
  assert.equal(typeof controller.captureCurrentRawCompiler,'function');
  assert.equal(typeof api.installRawCompilerCapture,'function');
  const capture = controller.captureCurrentRawCompiler();
  api.installRawCompilerCapture(capture);
  return {compiler:capture.compiler,runtime_files:capture.code.runtime_files,runtime_code_sha256:capture.code.runtime_code_sha256,worker_generation_id:capture.generation.id,environment:rawEnvironment(),base_manifest_sha256:syntheticRawFixture().bindings.base_manifest_sha256,inputs:RAW_ARTIFACTS.map(artifact => ({artifact,bytes:fs.readFileSync('/tmp/opencode/semantic42-frozen-EsJ4gr/'+artifact)}))};
}
test('production compiler binds current complete captures and acyclic canonical hashes', () => {
  const input = productionInput(), out = api.compileRawIndex(input);
  assert.equal(out.ok,true,out.code);
  assert(validateRawType('CompileInput',input)); assert(validateRawType('CompileResult',out));
  const index = JSON.parse(Buffer.from(out.index_bytes)), manifest = JSON.parse(Buffer.from(out.manifest_bytes));
  assert.equal(manifest.data_bytes,406996+out.index_bytes.length);
  assert(manifest.data_bytes+out.manifest_bytes.length <= 8388608);
  assert.equal(manifest.index.sha256,sha256(out.index_bytes));
  assert.equal(Buffer.from(out.index_bytes).toString(),canonicalJson(index));
  assert.equal(Buffer.from(out.manifest_bytes).toString(),canonicalJson(manifest));
  assert.equal(index.accounting.total,366); assert.deepEqual(index.accounting.artifacts.map(a => a.total),[190,67,109]);
  assert(manifest.compiler.files.some(f => f.path === 'scripts/compile_semantic_raw_index.mjs'));
  for (const file of ['scripts/erp_knowledge_mcp_http_bridge.mjs','scripts/lib/semantic_worker_pool.mjs','scripts/lib/semantic_worker_generation.mjs','scripts/lib/semantic_worker_entry.mjs','scripts/lib/mcp_registry.mjs','scripts/lib/semantic_raw_index.mjs','scripts/lib/semantic_lexical_context.mjs',
    'scripts/lib/semantic_raw_lookup.mjs','scripts/lib/semantic_raw_artifact.mjs','scripts/lib/semantic_raw_generation.mjs','scripts/lib/semantic_raw_verifier.mjs']) assert(manifest.runtime_files.some(f => f.path === file),file);
  assert.deepEqual(manifest.runtime_files.map(f => f.path),[...controller.CURRENT_RAW_RUNTIME_FILES].sort());
  const again = api.compileRawIndex(input); assert.deepEqual(out,again);
});
for (const [label,mutate,code] of [
  ['extra',i => ({...i,extra:true}),'INDEX_CONTRACT_INVALID'],
  ['synthetic source',i => ({...i,inputs:syntheticRawFixture().inputs}),'SOURCE_FINGERPRINT_MISMATCH'],
  ['source byte',i => { i.inputs[0].bytes[200] ^= 1; return i; },'SOURCE_FINGERPRINT_MISMATCH'],
  ['missing artifact',i => ({...i,inputs:[i.inputs[0],i.inputs[0],i.inputs[2]]}),'SOURCE_FINGERPRINT_MISMATCH'],
  ['environment',i => ({...i,environment:{...i.environment,node_version:'v0'}}),'ENVIRONMENT_MISMATCH'],
  ['compiler descriptor',i => { i.compiler = structuredClone(i.compiler); i.compiler.files[0].sha256 = '0'.repeat(64); return i; },'CODE_CLOSURE_INVALID'],
  ['runtime descriptor',i => ({...i,runtime_code_sha256:'0'.repeat(64)}),'CODE_CLOSURE_INVALID'],
  ['worker identity',i => ({...i,worker_generation_id:'0'.repeat(64)}),'CODE_CLOSURE_INVALID'],
  ['base manifest',i => ({...i,base_manifest_sha256:'0'.repeat(64)}),'SOURCE_FINGERPRINT_MISMATCH'],
]) test('compiler controlled failure '+label, () => {
  const i = mutate(productionInput()); assert.deepEqual(api.compileRawIndex(i),{ok:false,code});
});
test('compiler capture rejects rehashed changed lexer and later replacement', () => {
  assert.equal(typeof controller.captureCurrentRawCompiler,'function');
  const c = controller.captureCurrentRawCompiler(); api.installRawCompilerCapture(c);
  const bad = {...c,compiler_sources:{...c.compiler_sources,'scripts/lib/semantic_lexical_context.mjs':'export const changed = 1;'}};
  const measured = measureRawClosure(bad.compiler_sources,rawEnvironment(),'compiler');
  bad.compiler = {...c.compiler,files:measured.files,closure_sha256:measured.sha256};
  assert.throws(() => api.installRawCompilerCapture(bad),e => e.code === 'CODE_CLOSURE_INVALID');
  const bad2 = {...c,compiler_sources:{...c.compiler_sources,'scripts/lib/semantic_raw_index.mjs':c.compiler_sources['scripts/lib/semantic_raw_index.mjs']+'\n// changed\n'}};
  assert.throws(() => api.installRawCompilerCapture(bad2),e => e.code === 'CODE_CLOSURE_INVALID');
});

test('compiler capture rejects invalid UTF8 instead of measuring replacement-character code', t => {
  const root = fs.mkdtempSync(new URL('../.superpowers/sdd/task2-invalid-code-',import.meta.url));
  t.after(() => fs.rmSync(root,{recursive:true,force:true}));
  for (const file of new Set([...controller.RAW_COMPILER_FILES,...controller.CURRENT_RAW_RUNTIME_FILES])) {
    const parts = file.split('/'); parts.pop(); fs.mkdirSync(root+'/'+parts.join('/'),{recursive:true});
    fs.writeFileSync(root+'/'+file,fs.readFileSync(new URL('../'+file,import.meta.url)));
  }
  fs.appendFileSync(root+'/scripts/compile_semantic_raw_index.mjs',Buffer.from([10,47,47,0xff,10]));
  const script = `import {captureCurrentRawCompiler} from ${JSON.stringify(new URL('./lib/semantic_raw_compile_controller.mjs',import.meta.url).href)}; try {captureCurrentRawCompiler(new URL(${JSON.stringify(pathToFileURL(root+'/').href)})); console.log('ACCEPTED');} catch(e) {console.log(e.code);}`;
  const r = spawnSync(process.execPath,['--input-type=module','--eval',script],{encoding:'utf8',timeout:30000});
  assert.equal(r.status,0,r.stderr); assert.equal(r.stdout.trim(),'CODE_CLOSURE_INVALID');
});

test('staging fails before creating files on extra paths, changed sources or oversized data', t => {
  const input = productionInput(), result = api.compileRawIndex(input);
  assert.equal(result.ok,true,result.code);
  const root = fs.mkdtempSync(new URL('../.superpowers/sdd/task2-staging-',import.meta.url));
  t.after(() => fs.rmSync(root,{recursive:true,force:true}));
  for (const [name,out,inputs,code] of [
    ['extra',result,[...input.inputs,{artifact:'../escape',bytes:Buffer.from('x')}],'SOURCE_FINGERPRINT_MISMATCH'],
    ['changed',result,input.inputs.map((i,n) => n ? i : {...i,bytes:Buffer.from('changed')}),'SOURCE_FINGERPRINT_MISMATCH'],
    ['oversized',{...result,index_bytes:Buffer.alloc(8388609)},input.inputs,'DATA_BOUND_EXCEEDED'],
    ['bad-manifest',{...result,manifest_bytes:Buffer.from('{}')},input.inputs,'INDEX_CONTRACT_INVALID'],
  ]) {
    const output = root+'/'+name;
    assert.throws(() => controller.stageRawCompilation(output,out,inputs),e => e.code === code);
    assert.equal(fs.existsSync(output),false);
  }
  assert.deepEqual(fs.readdirSync(root),[]);
});

for (const [body,names,code] of [
  ['"X_ID" \'Y_ID\' „Z_ID”',[],null],
  ['A_ID = B_ID; C_ID <> D_ID',['A_ID','C_ID'],null],
  ['| A_ID | = B_ID |',['A_ID'],null],
  ['A_ID = x + B_ID; After_ID',['A_ID','After_ID'],null],
  ['```\nFence_ID\n``` Tail_ID',['Tail_ID'],null],
  ['```Fence_ID',[],'unclosed_atom'],
  ['[Unclosed_ID',[],'unclosed_atom'],
  ['[Bad ID]',[],'malformed_identifier'],
  ['Prefix`Good_ID`',[],'malformed_identifier'],
  ['Good_ID*',[],'malformed_identifier'],
  ['A_ID::int',[],'malformed_identifier'],
  ['A_ID/B_ID',[],'malformed_identifier'],
  ['` A_ID ` [B_ID] CDN.Table',['A_ID','B_ID','CDN.Table'],null],
  ['A -> B',['A','B'],null],
  ['word without identifier',[],null],
]) test('synthetic mangled source lexer form '+JSON.stringify(body), () => {
  const idx = derive(custom([{id:'A'}],[],[{id:'c',sourceDocumentRefId:'A',sectionOrder:'0',content:body}]));
  const row = idx.records.find(r => r.core.kind === 'source_chunk');
  const actual = [...new Set(idx.postings.filter(p => p.origin.record_ref === row.core.record_ref).map(p => p.name))].sort();
  assert.deepEqual(actual,names.sort());
  if (code) assert(ds(idx,row).some(d => d.code === code));
});

test('raw excluded cells cannot create metadata or mentions, and no postings are capped', () => {
  const body = Array.from({length:140},(_,i) => 'Field_'+i).join(' ');
  const idx = derive(custom([{id:'A',mainTable:'Bad_ID',mcpReadTools:'Tool_ID'}],[],[{id:'c',sourceDocumentRefId:'A',description:'Wrong_ID',sourcePath:'Path_ID',sectionHeading:'Heading_ID',sectionOrder:'01',content:body}]));
  assert.equal(idx.postings.filter(p => p.candidate_kind === 'identifier_mention').length,140);
  assert(!idx.postings.some(p => ['Bad_ID','Tool_ID','Wrong_ID','Path_ID','Heading_ID'].includes(p.name)));
  assert(!idx.diagnostics.some(d => d.code === 'invalid_section_order'));
});

for (const [label,modify,code] of [
  ['ragged',f => { f.inputs[0].bytes = Buffer.from('id\nA\n'); },'CSV_INVALID'],
  ['quoting',f => { f.inputs[0].bytes = Buffer.concat([f.inputs[0].bytes,Buffer.from('"unclosed')]); },'CSV_INVALID'],
  ['utf8',f => { f.inputs[0].bytes = Buffer.concat([f.inputs[0].bytes,Buffer.from([0xff])]); },'CSV_INVALID'],
  ['count',f => { f.sources.find(s => s.artifact === E).record_count++; },'SOURCE_FINGERPRINT_MISMATCH'],
]) test('pure derivation rejects malformed synthetic '+label, () => {
  const f = syntheticRawFixture(); modify(f);
  if (label !== 'count') { const i = f.inputs[0], s = f.sources.find(s => s.artifact === i.artifact); s.bytes = i.bytes.length; s.sha256 = sha256(i.bytes); }
  assert.throws(() => api.deriveRawIndex({...f.bindings,sources:f.sources,inputs:f.inputs}),e => e.code === code);
});
test('CLI refuses wrong root/relative output/existing root and writes exactly five new private files', t => {
  assert.equal(typeof controller.captureCurrentRawCompiler,'function');
  const root = fs.mkdtempSync(new URL('../.superpowers/sdd/task2-cli-',import.meta.url)); t.after(() => fs.rmSync(root,{recursive:true,force:true}));
  const cli = args => spawnSync(process.execPath,['scripts/compile_semantic_raw_index.mjs',...args],{cwd:new URL('../',import.meta.url),encoding:'utf8',timeout:30000});
  const source = '/tmp/opencode/semantic42-frozen-EsJ4gr';
  for (const args of [[],['--source-root','/wrong','--output',root+'/bad'],['--source-root',source,'--output','relative'],['--source-root',source,'--output',root],['--source-root',source,'--output','/docker/openspg/nope'],['--source-root',source,'--output',root+'/bad','--extra','x']]) {
    const r = cli(args); assert.equal(r.status,1,r.stdout+r.stderr); assert(!r.stderr.includes('Error:')); assert(!r.stderr.includes('/wrong'));
  }
  const out = root+'/data', r = cli(['--source-root',source,'--output',out]);
  assert.equal(r.status,0,r.stdout+r.stderr);
  assert.deepEqual(fs.readdirSync(out).sort(),['exports','index.json','manifest.json']);
  const artifactFiles = RAW_ARTIFACTS.map(a => out+'/'+a);
  for (const [i,file] of artifactFiles.entries()) assert.equal(sha256(fs.readFileSync(file)),RAW_SOURCE_SEALS[i].sha256);
  const manifestBytes = fs.readFileSync(out+'/manifest.json'), indexBytes = fs.readFileSync(out+'/index.json');
  const m = JSON.parse(manifestBytes), idx = JSON.parse(indexBytes);
  assert(validateRawType('DataManifest',m,{index:idx}));
  assert.equal(fs.statSync(out).mode & 0o777,0o700);
  for (const file of [...artifactFiles,out+'/manifest.json',out+'/index.json']) assert.equal(fs.statSync(file).mode & 0o777,0o600);
  const repeat = cli(['--source-root',source,'--output',out]); assert.equal(repeat.status,1);
  assert.equal(sha256(fs.readFileSync(out+'/manifest.json')),sha256(manifestBytes));
});
