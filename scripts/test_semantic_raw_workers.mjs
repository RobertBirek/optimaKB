// Synthetic closed-frame adversaries first; real-slot tests are below.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {EventEmitter} from 'node:events';
import {Worker,MessageChannel} from 'node:worker_threads';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {captureSemanticGeneration,SEMANTIC_CODE_FILES,SEMANTIC_WORKER_BOOTSTRAP} from './lib/semantic_worker_generation.mjs';
import {CURRENT_RAW_RUNTIME_FILES} from './lib/semantic_raw_compile_controller.mjs';
import {stageProductionRawFixture} from './lib/semantic_raw_test_fixture.mjs';
import {sha256} from './lib/semantic_raw_contract.mjs';
import {MODULE_FILES,LEGACY_MODULE_FILES,STATIC_FILES,validateLegacyManifestInventory,validateRawBundle} from './lib/owa_offline_harness.mjs';
import {createSemanticWorkerPool,isSemanticWorkerRequest} from './lib/semantic_worker_pool.mjs';
import {rawEnvironment,measureRawClosure} from './lib/semantic_raw_code.mjs';
import {rawCallResult,rawRpcError,validateRawType} from './lib/semantic_raw_contract.mjs';
const hex=c=>c.repeat(64), generation={id:hex('a')};
const trusted={abi:'owa-raw-data-generation/1',data_root:'/tmp/opencode/task5-synthetic',manifest_path:'/tmp/opencode/task5-synthetic/manifest.json',manifest_sha256:hex('b'),snapshot_id:hex('c'),worker_generation_id:generation.id,runtime_code_sha256:hex('d')};
const code={worker_generation_id:generation.id,runtime_code_sha256:hex('d'),environment:rawEnvironment()};
const auth={profile_id:'erp-semantic-evidence-poc',scope:'kb.semantic.read',namespaces:['OWAOntology']};
const ctx=()=>({profile:{id:auth.profile_id},authorization:structuredClone(auth),allowedNamespaces:new Set(auth.namespaces)});
const req=(id=7)=>({jsonrpc:'2.0',id,method:'tools/call',params:{name:'erp_subject.discover',arguments:{query:'x',kind:'field'}}});
class Fake extends EventEmitter{sent=[];postMessage(m){this.sent.push(m);}terminate(){return Promise.resolve();}ready(){this.emit('message',{type:'ready',generation:generation.id});}}
const settle=p=>p.then(value=>({value}),error=>({error}));
function setup(){const workers=[];const pool=createSemanticWorkerPool(generation,{trustedDataGeneration:trusted,codeBinding:code,spawnWorker:()=>{const w=new Fake();workers.push(w);return w;}});return {pool,workers};}
const dataReady=jobId=>({type:'data-ready',jobId,worker_generation_id:generation.id,manifest_sha256:trusted.manifest_sha256,snapshot_id:trusted.snapshot_id});
const success=()=>({jsonrpc:'2.0',id:7,result:rawCallResult({schema_version:'0.1',mode:'discovery',snapshot_id:trusted.snapshot_id,assessment:'source_records_only',semantic_assessment:'not_performed',correlation_id:null,status:'no_candidates',candidates:[],has_more:false})});
const result=jobId=>({type:'result',jobId,response:success(),handlerWallMs:1,worker_generation_id:generation.id,manifest_sha256:trusted.manifest_sha256,snapshot_id:trusted.snapshot_id,data_state:'validated'});
test('raw classifier never sync-falls-through invalid profile or empty namespace',()=>{
  assert.equal(isSemanticWorkerRequest(req(),{profile:{id:'legacy',tools:[]},allowedNamespaces:new Set()}),true,'raw name must always classify');
});
test('cheap preflight denies before allocation; caller context cannot provision capabilities',async()=>{
  assert.equal(isSemanticWorkerRequest(req(),{allowedNamespaces:new Set()}),true,'private preflight branch missing');
  const {pool,workers}=setup();try{
    assert.deepEqual((await pool.run(req(),{...ctx(),allowedNamespaces:new Set()})).response,rawRpcError(7,-32001));assert.equal(workers.length,0);
    const p=createSemanticWorkerPool(generation);try{await assert.rejects(p.run(req(),{...ctx(),trustedDataGeneration:trusted,code}),e=>e.code==='SEMANTIC_UNAVAILABLE');}finally{await p.close();}
  }finally{await pool.close();}
});
test('raw jobs have exact closed context and both slots receive the constructor binding',async()=>{
  const {pool,workers}=setup();try{
    const jobs=[settle(pool.run(req(),ctx())),settle(pool.run(req(),ctx()))];workers.forEach(w=>w.ready());
    for(const w of workers){const j=w.sent[0];assert(validateRawType('RawWorkerJob',j),'closed raw job ABI');assert.deepEqual(j.context,{authorization:auth,trustedDataGeneration:trusted,code});w.emit('message',dataReady(j.jobId));w.emit('message',result(j.jobId));}
    const outcomes=await Promise.all(jobs);assert(outcomes.every(o=>o.value));assert.deepEqual(outcomes[0].value.binding,outcomes[1].value.binding);
  }finally{await pool.close();}
});
for(const fault of ['before-ready','wrong-manifest','wrong-code','wrong-snapshot','extra-field','wrong-type','unavailable-success','rpc-validated','response-snapshot','response-id','duplicate-dataready'])test('refuses forged closed worker frame '+fault,async()=>{
  const {pool,workers}=setup();try{
    const job=settle(pool.run(req(),ctx()));workers[0].ready();const id=workers[0].sent[0].jobId;
    assert(validateRawType('RawWorkerJob',workers[0].sent[0]),'closed raw job ABI is required before frame validation');
    if(fault!=='before-ready')workers[0].emit('message',dataReady(id));
    const frame=result(id);
    if(fault==='wrong-manifest')frame.manifest_sha256=hex('e');
    if(fault==='wrong-code')frame.worker_generation_id=hex('e');
    if(fault==='wrong-snapshot')frame.snapshot_id=hex('e');
    if(fault==='extra-field')frame.audit={};
    if(fault==='wrong-type')frame.handlerWallMs='1';
    if(fault==='unavailable-success'){frame.data_state='unavailable';frame.snapshot_id=null;}
    if(fault==='rpc-validated')frame.response=rawRpcError(7,-32602);
    if(fault==='response-snapshot')frame.response=success(),frame.response.result.structuredContent.snapshot_id=hex('e');
    if(fault==='response-id')frame.response.id=8;
    if(fault==='duplicate-dataready')workers[0].emit('message',dataReady(id));
    workers[0].emit('message',frame);
    assert.equal((await job).error?.code,'SEMANTIC_UNAVAILABLE','forged frame must fail closed');
  }finally{await pool.close();}
});

test('current compiler capture uses complete runtime inventory in exact generation order',()=>{
  assert.deepEqual(CURRENT_RAW_RUNTIME_FILES,SEMANTIC_CODE_FILES);
  assert(SEMANTIC_CODE_FILES.includes('scripts/lib/semantic_raw_worker.mjs'));
  assert(SEMANTIC_CODE_FILES.includes('scripts/lib/semantic_raw_http.mjs'));
  assert(!SEMANTIC_CODE_FILES.some(f=>/test_fixture|compile_controller|compile_semantic/.test(f)));
  assert.deepEqual(MODULE_FILES,SEMANTIC_CODE_FILES);
});
test('original sealed legacy inventory is accepted unchanged by the legacy inventory validator',()=>{
  const bytes=fs.readFileSync('/tmp/opencode/semantic42-frozen-EsJ4gr/manifest.json');
  assert.equal(sha256(bytes),'9f4275a2400e7853f7b8bcdcfe3f4463c3ad30384f1bdb49a0bbfbfc3626eede');
  const original=JSON.parse(bytes);assert.equal(original.files.length,79);
  assert.equal(LEGACY_MODULE_FILES.length,25);
  // Use original fingerprint entries; no file/body regeneration, no expanded
  // runtime inventory imposed on the sealed 79-member provenance manifest.
  const legacy={schemaVersion:original.schemaVersion,files:original.files.filter(f=>STATIC_FILES.includes(f.path)||LEGACY_MODULE_FILES.includes(f.path))};
  assert(validateLegacyManifestInventory(legacy));
  assert(!validateLegacyManifestInventory({...legacy,files:[...legacy.files,{path:'scripts/lib/semantic_raw_mcp.mjs'}]}));
});
test('raw 2/8 capacity, cheap denial under saturation, cancellation, stale frames and request-error isolation',async()=>{
  const {pool,workers}=setup();try{
    const active=new AbortController(),queued=new AbortController();
    const jobs=Array.from({length:10},(_,i)=>settle(pool.run(req(),ctx(),{signal:i===0?active.signal:i===2?queued.signal:undefined})));
    assert.equal(workers.length,2);assert.equal(pool.stats().queued,8);
    await assert.rejects(pool.run(req(),ctx()),e=>e.code==='SEMANTIC_BUSY');
    assert.deepEqual((await pool.run(req(),{...ctx(),authorization:null})).response,rawRpcError(7,-32001));
    workers.forEach(w=>w.ready());active.abort();queued.abort();
    assert.equal((await jobs[0]).error.code,'SEMANTIC_CANCELLED');assert.equal((await jobs[2]).error.code,'SEMANTIC_CANCELLED');
    const old=workers[0].sent[0].jobId;
    workers[0].emit('message',{type:'request-error',jobId:old,handlerWallMs:1});
    assert.equal(pool.stats().available,true);
    workers[0].emit('message',result(old)); // stale must not make replacement data-ready
    assert.equal(pool.stats().active,2);
    for(const w of workers){
      let i=w===workers[0]?1:0,first=true;
      while(i<w.sent.length){const id=w.sent[i++].jobId;
        if(first){w.emit('message',dataReady(id));first=false;}
        w.emit('message',result(id));
      }
    }
    const outcomes=await Promise.all(jobs);assert.equal(outcomes.filter(o=>o.value).length,8);assert.equal(pool.stats().active,0);assert.equal(pool.stats().queued,0);
  }finally{await pool.close();}
});
for(const frame of [{type:'ready',generation:generation.id,extra:true},{type:'ready',generation:'not-hex'}])test('raw initial code-ready is closed and identity checked '+JSON.stringify(frame),async()=>{
  const {pool,workers}=setup();try{const p=settle(pool.run(req(),ctx()));workers[0].emit('message',frame);assert.equal((await p).error?.code,'SEMANTIC_UNAVAILABLE');}finally{await pool.close();}
});
function waitUntil(predicate,label){return new Promise((resolve,reject)=>{const start=Date.now();const t=setInterval(()=>{
  if(predicate()){clearInterval(t);resolve();}else if(Date.now()-start>60000){clearInterval(t);reject(Error('Timed out: '+label));}
},5);});}
function realWorker(g,trusted,code){
  const channel=new MessageChannel(),audits=[],frames=[],errors=[],exits=[];
  channel.port1.on('message',m=>audits.push(m));
  const w=new Worker(SEMANTIC_WORKER_BOOTSTRAP,{eval:true,workerData:{generation:g,raw:{trustedDataGeneration:trusted,code},auditPort:channel.port2},transferList:[channel.port2],env:{}});
  w.on('message',m=>frames.push(m));w.on('error',e=>errors.push(e));
  w.on('exit',code=>exits.push(code));
  return {w,audits,frames,errors,exits,close:async()=>{await w.terminate();channel.port1.close();}};
}
test('BOTH guarded real slots: data-free bootstrap/rejections, five-file cold/warm, immutable identities',async()=>{
  const outputRoot='/tmp/opencode/task5-worker-'+randomUUID();
  const fixture=stageProductionRawFixture({sourceRoot:'/tmp/opencode/semantic42-frozen-EsJ4gr',outputRoot});
  const g={...fixture.generation,loader:captureSemanticGeneration().loader};
  const states=[realWorker(g,fixture.trusted,fixture.code),realWorker(g,fixture.trusted,fixture.code)];
  try{
    const admitted=await validateRawBundle(fixture.trusted,fixture.code,fixture.generation,auth);assert.equal(admitted.kind,'owa-raw-record-poc');assert.equal(admitted.snapshot_id,fixture.trusted.snapshot_id);
    for(const [slot,s]of states.entries()){
      await waitUntil(()=>s.frames.some(f=>f.type==='ready')||s.errors.length,'code ready');assert.deepEqual(s.errors,[]);
      await waitUntil(()=>s.audits.some(a=>a.phase==='ready'),'ready audit');
      assert(s.audits.every(a=>a.reads===0&&a.opens.length===0&&a.violations.length===0));
      const send=async(request,authorization=auth)=>{
        const jobId=randomUUID();s.w.postMessage({jobId,request,context:{authorization,trustedDataGeneration:fixture.trusted,code:fixture.code},timing:{queueMs:0,startupMs:0}});
        await waitUntil(()=>s.frames.some(f=>f.jobId===jobId&&['result','request-error'].includes(f.type))||s.errors.length,'job result');
        assert.deepEqual(s.errors,[]);const out=s.frames.find(f=>f.jobId===jobId&&f.type==='result');assert(out,'raw result required');
        assert(validateRawType('RawWorkerResult',out,{trusted:fixture.trusted,request}),JSON.stringify(out));return out;
      };
      const denied=await send(req(),null);assert.deepEqual(denied.response,rawRpcError(7,-32001));assert.equal(denied.data_state,'unavailable');assert.equal(denied.snapshot_id,null);
      const malformed=req();malformed.params.arguments.limit='5';const bad=await send(malformed);assert.deepEqual(bad.response,rawRpcError(7,-32602));
      await waitUntil(()=>s.audits.filter(a=>a.phase==='rejected').length===2,'reject audit');assert(s.audits.every(a=>a.reads===0&&a.opens.length===0));
      const actual=req();actual.params.arguments.query='operator';const first=await send(actual);assert.equal(first.data_state,'validated');assert(first.response.result.structuredContent.candidates.length>0);
      const dr=s.frames.filter(f=>f.type==='data-ready');assert.equal(dr.length,1);assert(validateRawType('RawWorkerDataReady',dr[0],{trusted:fixture.trusted}));
      assert(s.frames.indexOf(dr[0])<s.frames.indexOf(first));
      await waitUntil(()=>s.audits.some(a=>a.phase==='loaded'),'cold audit');const cold=s.audits.filter(a=>a.phase==='loaded').at(-1);
      assert.equal(cold.opens.length,5);assert.equal(new Set(cold.opens).size,5);assert(cold.decodes>=5,'real worker must audit artifact decoding separately');
      const warm=await send(actual);assert.deepEqual(warm.response,first.response);await waitUntil(()=>s.audits.filter(a=>a.phase==='loaded').length===2,'warm audit');
      const after=s.audits.filter(a=>a.phase==='loaded').at(-1);assert.equal(after.opens.length,10);assert.equal(after.bytes,2*cold.bytes);assert.deepEqual(after.opens.slice(5),after.opens.slice(0,5));assert.equal(after.decodes,cold.decodes,'warm real worker does not decode artifacts');
      const candidate=first.response.result.structuredContent.candidates[0];
      const evidence={...req(),params:{name:'erp_evidence.get',arguments:{snapshot_id:fixture.trusted.snapshot_id,requests:[{id:'one',entity_ref:candidate.entity_ref,record_refs:[candidate.record_refs[0]]}]}}};
      const delivered=await send(evidence);assert.equal(delivered.data_state,'validated');assert.equal(delivered.response.result.structuredContent.results[0].status,'returned_all');assert.equal(delivered.response.result.structuredContent.records.length,2);
      const stale=req();stale.params.arguments.expected_snapshot_id=hex('f');const mismatch=await send(stale);assert.equal(mismatch.response.result.structuredContent.code,'SNAPSHOT_MISMATCH');assert.equal(mismatch.data_state,'validated');assert.equal(mismatch.snapshot_id,fixture.trusted.snapshot_id);
      const postDenied=await send(req(),null);assert.equal(postDenied.snapshot_id,null);assert.equal(postDenied.data_state,'unavailable');
      await waitUntil(()=>s.audits.filter(a=>a.phase==='rejected').length===3,'warm rejection');assert.equal(s.audits.at(-1).opens.length,20);assert.equal(s.audits.at(-1).decodes,cold.decodes);
      assert(s.audits.every(a=>a.violations.length===0));assert.equal(s.frames.filter(f=>f.type==='data-ready').length,1);
      console.log(JSON.stringify({slot,guard:s.audits.map(a=>({...a,opens:a.opens.map(p=>p.slice(outputRoot.length+1))})),code:g.id,runtime_code_sha256:fixture.code.runtime_code_sha256,manifest:fixture.trusted.manifest_sha256,snapshot:fixture.trusted.snapshot_id}));
    }
    assert.deepEqual(states[0].frames.find(f=>f.type==='data-ready').snapshot_id,states[1].frames.find(f=>f.type==='data-ready').snapshot_id);
    // Exercise the production pool's default worker constructor, not only a
    // custom spawn test seam. Both real slots bind the identical artifact.
    const pool=createSemanticWorkerPool(g,{trustedDataGeneration:fixture.trusted,codeBinding:fixture.code});
    try{
      const outcomes=await Promise.all([pool.run(req(),ctx()),pool.run(req(),ctx())]);
      assert.equal(pool.stats().workers,2);assert.deepEqual(outcomes[0].binding,outcomes[1].binding);assert.equal(outcomes[0].binding.data_state,'validated');
    }finally{await pool.close();}
    // Mutation is detected by each slot's next authorized fingerprint pass and
    // cannot be recovered by restoring the bytes within that lifecycle.
    const file=outputRoot+'/exports/owa_ontology/v1/chunk.csv',original=fs.readFileSync(file);fs.writeFileSync(file,Buffer.concat([original,Buffer.from('\n')]));
    for(const s of states){const jobId=randomUUID();s.w.postMessage({jobId,request:req(),context:{authorization:auth,trustedDataGeneration:fixture.trusted,code:fixture.code},timing:{queueMs:0,startupMs:0}});await waitUntil(()=>s.frames.some(f=>f.type==='result'&&f.jobId===jobId),'mutation');const out=s.frames.find(f=>f.type==='result'&&f.jobId===jobId);assert.equal(out.data_state,'unavailable');assert.equal(out.snapshot_id,null);assert.equal(out.response.result.structuredContent.code,'SOURCE_SNAPSHOT_CHANGED');}
  }finally{await Promise.all(states.map(s=>s.close()));fixture.cleanup();}
});
for(const attack of ["import fs from 'node:fs';fs.readFileSync('/forbidden/config.json');", "import fs from 'node:fs';fs.writeFileSync('/forbidden/write','x');", "import net from 'node:net';net.connect(1,'127.0.0.1');", "import cp from 'node:child_process';cp.spawn('false');"])
test('worker-local guard blocks ambient startup attack before application bootstrap '+attack,async()=>{
  const original=captureSemanticGeneration(),sources={...original.sources};
  sources[original.workerUrl]=attack;const g={...original,sources,id:sha256(Buffer.from(JSON.stringify(sources)))};
  const s=realWorker(g,{...trusted,worker_generation_id:g.id},{...code,worker_generation_id:g.id});
  try{await waitUntil(()=>s.exits.length,'guard attack exit');await waitUntil(()=>s.audits.length,'guard snapshot');
    assert.equal(s.frames.length,0);assert.equal(s.audits[0].reads,0);assert.equal(s.audits[0].opens.length,0);
    assert.equal(s.exits[0],1);assert.deepEqual(s.errors,[],'application import failure is sanitized by bootstrap');
    await waitUntil(()=>s.audits.some(a=>a.phase==='blocked'),'worker blocked audit');assert(s.audits.at(-1).violations.includes('AMBIENT_IO_DENIED'));
  }finally{await s.close();}
});
test('actual captured-code mismatch is a controlled load ToolError with unavailable/null and no reads',async()=>{
  const g=captureSemanticGeneration(),t={...trusted,worker_generation_id:g.id,runtime_code_sha256:hex('f')},c={...code,worker_generation_id:g.id,runtime_code_sha256:hex('f')};
  const s=realWorker(g,t,c);
  try{await waitUntil(()=>s.frames.some(f=>f.type==='ready'),'ready');const jobId=randomUUID();s.w.postMessage({jobId,request:req(),context:{authorization:auth,trustedDataGeneration:t,code:c},timing:{queueMs:0,startupMs:0}});
    await waitUntil(()=>s.frames.some(f=>f.type==='result'),'mismatch');const out=s.frames.find(f=>f.type==='result');
    assert.equal(out.response.result?.structuredContent.code,'DATA_CODE_MISMATCH','code mismatch must be load ToolError');assert.equal(out.data_state,'unavailable');assert.equal(out.snapshot_id,null);assert(s.audits.every(a=>a.reads===0&&a.opens.length===0));assert(!s.frames.some(f=>f.type==='data-ready'));
  }finally{await s.close();}
});
test('raw bootstrap refuses loader bytes not bound to captured generation source before executing them',async()=>{
  const g={...captureSemanticGeneration(),loader:"throw Error('UNBOUND_LOADER_EXECUTED');"};const s=realWorker(g,{...trusted,worker_generation_id:g.id},{...code,worker_generation_id:g.id});
  try{await waitUntil(()=>s.errors.length,'unbound loader');assert.equal(s.errors[0].message,'Raw code bootstrap unavailable');assert.equal(s.frames.length,0);}finally{await s.close();}
});
for(const fault of ['missing','corrupt'])test('actual worker fixed '+fault+' root produces unavailable/null controlled load failure',async()=>{
  const g=captureSemanticGeneration(),root=new URL('../',import.meta.url).href;
  const files=Object.fromEntries(Object.entries(g.sources).map(([url,bytes])=>[url.slice(root.length),bytes]));
  const runtime=measureRawClosure(files,rawEnvironment(),'runtime');
  const dataRoot='/tmp/opencode/task5-'+fault+'-'+randomUUID();
  const t={...trusted,data_root:dataRoot,manifest_path:dataRoot+'/manifest.json',worker_generation_id:g.id,runtime_code_sha256:runtime.sha256};
  const c={worker_generation_id:g.id,runtime_code_sha256:runtime.sha256,environment:rawEnvironment()};
  if(fault==='corrupt'){fs.mkdirSync(dataRoot,{mode:0o700});fs.writeFileSync(t.manifest_path,'{}',{flag:'wx',mode:0o600});}
  const s=realWorker(g,t,c);
  try{await waitUntil(()=>s.frames.some(f=>f.type==='ready'),'ready');const jobId=randomUUID();s.w.postMessage({jobId,request:req(),context:{authorization:auth,trustedDataGeneration:t,code:c},timing:{queueMs:0,startupMs:0}});
    await waitUntil(()=>s.frames.some(f=>f.type==='result'),'load failure');const out=s.frames.find(f=>f.type==='result');
    assert(validateRawType('RawWorkerResult',out,{trusted:t,request:req()}));assert.equal(out.data_state,'unavailable');assert.equal(out.snapshot_id,null);assert.equal(out.response.result.structuredContent.code,fault==='missing'?'INDEX_UNAVAILABLE':'INDEX_CORRUPT');assert(!s.frames.some(f=>f.type==='data-ready'));
  }finally{await s.close();if(fault==='corrupt')fs.rmSync(dataRoot,{recursive:true});}
});
