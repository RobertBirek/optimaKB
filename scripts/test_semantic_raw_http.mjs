// Bounded ephemeral loopback, synthetic inert auth. Never verifyApiKey.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import http from 'node:http';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {rawRpcError} from './lib/semantic_raw_contract.mjs';
import {rawCallResult,canonicalJson,validateRawType} from './lib/semantic_raw_contract.mjs';
import {randomUUID} from 'node:crypto';
import {stageProductionRawFixture} from './lib/semantic_raw_test_fixture.mjs';
import {captureSemanticGeneration} from './lib/semantic_worker_generation.mjs';
import {createSemanticWorkerPool} from './lib/semantic_worker_pool.mjs';
import {verifyRawArtifact} from './lib/semantic_raw_verifier.mjs';
const api=await import('./lib/semantic_raw_http.mjs').catch(e=>{if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;return {};});
test('private HTTP factory exists without importing bridge or starting a service',()=>assert.equal(typeof api.createPrivateRawHttpAdapter,'function','importable private adapter missing'));
const request={jsonrpc:'2.0',id:7,method:'tools/call',params:{name:'erp_subject.discover',arguments:{query:'operator',kind:'field'}}};
const authorized={authorized:true,scopes:['kb.semantic.read']};
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function memoryTransport(req=Readable.from([Buffer.from(JSON.stringify(request))])){
  const res=new EventEmitter();Object.assign(res,{destroyed:false,writableEnded:false,writes:[],headers:{},
    setHeader(name,value){this.headers[name]=value;},
    writeHead(status,headers){this.writes.push({status,headers});},
    end(body){this.writableEnded=true;this.body=body;}});
  const responseListener=()=>{},requestListener=()=>{};
  res.on('close',responseListener);req.on('aborted',requestListener);
  return {req,res,assertClean(){assert.deepEqual(res.listeners('close'),[responseListener]);assert.deepEqual(req.listeners('aborted'),[requestListener]);}};
}
for(const phase of ['already-destroyed','already-aborted','sync-auth-close','sync-auth-aborted','async-auth-close','async-auth-aborted','body-close','body-aborted','body-complete-close','body-complete-aborted'])test('private HTTP pre-dispatch disconnect '+phase,async()=>{
  const entered=deferred(),resume=deferred(),bytes=Buffer.from(JSON.stringify(request));
  let transport;
  const disconnect=()=>phase.endsWith('aborted')?transport.req.emit('aborted'):transport.res.emit('close');
  const req=phase.startsWith('body')?Readable.from((async function*(){
    yield bytes;
    if(phase.startsWith('body-complete'))disconnect();
    else{entered.resolve();await resume.promise;}
  })()):Readable.from([bytes]);
  transport=memoryTransport(req);
  if(phase==='already-destroyed')transport.res.destroyed=true;
  if(phase==='already-aborted')req.aborted=true;
  const admissions=[];
  const adapter=api.createPrivateRawHttpAdapter({allowedNamespaces:new Set(['OWAOntology']),
    authenticate:async()=>{
      if(phase.startsWith('sync-auth'))disconnect();
      if(phase.startsWith('async-auth')){entered.resolve();await resume.promise;}
      return authorized;
    },
    // Deliberately ignores the signal: the adapter must prevent admission itself.
    pool:{async run(r,c,{signal}){admissions.push({r,c,aborted:signal.aborted});return {response:rawRpcError(r.id,-32603)};}}});
  const pending=adapter(req,transport.res);
  if(phase.startsWith('async-auth')||phase==='body-close'||phase==='body-aborted'){
    await entered.promise;disconnect();resume.resolve();
  }
  await pending;
  transport.assertClean();
  assert.equal(admissions.length,0,'disconnected transport must never call pool.run, even with a signal-ignoring executor');
  assert.deepEqual(transport.res.writes,[],'disconnected transport must not write a response');
});
for(const exit of ['unauthorized','parse','oversize','scope','success','pool-error','auth-error'])test('private HTTP cancellation listeners cleaned on '+exit,async()=>{
  const transport=memoryTransport(Readable.from([Buffer.from(exit==='parse'?'{':JSON.stringify(request))]));
  const admissions=[];
  const adapter=api.createPrivateRawHttpAdapter({allowedNamespaces:new Set(['OWAOntology']),maxBodyBytes:exit==='oversize'?1:1048576,
    authenticate:async()=>{if(exit==='auth-error')throw Error('inert auth failure');return exit==='unauthorized'?{authorized:false}:exit==='scope'?{...authorized,scopes:[]}:authorized;},
    pool:{async run(r,c,{signal}){admissions.push(signal);if(exit==='pool-error')throw Error('inert executor failure');return {response:rawRpcError(r.id,-32603)};}}});
  if(exit==='auth-error')await assert.rejects(adapter(transport.req,transport.res),/inert auth failure/);
  else await adapter(transport.req,transport.res);
  transport.assertClean();
  assert.equal(admissions.length,['success','pool-error'].includes(exit)?1:0);
  if(exit!=='auth-error')assert.equal(transport.res.writes[0].status,exit==='unauthorized'?401:['parse','oversize'].includes(exit)?400:exit==='pool-error'?503:200);
});
for(const event of ['close','aborted'])test('private HTTP admitted cancellation propagates '+event,async()=>{
  const transport=memoryTransport(),admitted=deferred();let signal;
  const adapter=api.createPrivateRawHttpAdapter({allowedNamespaces:new Set(['OWAOntology']),authenticate:()=>authorized,
    pool:{run(r,c,options){signal=options.signal;admitted.resolve();return new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(Object.assign(Error('cancelled'),{code:'SEMANTIC_CANCELLED'})),{once:true});});}}});
  const pending=adapter(transport.req,transport.res);await admitted.promise;assert.equal(signal.aborted,false);
  (event==='close'?transport.res:transport.req).emit(event);
  await pending;assert.equal(signal.aborted,true);assert.deepEqual(transport.res.writes,[]);transport.assertClean();
});
async function loopback(run,{scopes=['kb.semantic.read'],allowedNamespaces=new Set(['OWAOntology']),error}={}){
  const jobs=[];let bodyListeners=0;
  const adapter=api.createPrivateRawHttpAdapter({authenticate:req=>({authorized:req.headers.authorization==='Bearer inert-task5',scopes}),allowedNamespaces,
    pool:{async run(r,c){jobs.push({r,c});if(error)throw Object.assign(Error('/secret path bearer key'),{code:error});return {response:rawRpcError(r.id,-32603)};}}});
  const server=http.createServer((req,res)=>{const on=req.on;req.on=function(event,...args){if(event==='data'||event==='readable')bodyListeners++;return on.call(this,event,...args);};void adapter(req,res);});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const post=(bytes,token='inert-task5')=>new Promise((resolve,reject)=>{const r=http.request({host:'127.0.0.1',port:server.address().port,path:'/mcp',method:'POST',headers:{Authorization:'Bearer '+token}},res=>{const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(Buffer.concat(chunks))}));});r.on('error',reject);r.end(bytes);});
  try{await run({post,jobs,get bodyListeners(){return bodyListeners;}});}finally{await new Promise(resolve=>server.close(resolve));}
}
test('unauthenticated malformed body gets generic 401 before strict parsing or body listeners',async()=>{
  await loopback(async state=>{const r=await state.post(Buffer.from([0xff]),'bad');assert.equal(r.status,401);assert.deepEqual(r.body,{error:'unauthorized',message:'Missing or invalid bearer token.'});assert.equal(state.bodyListeners,0);assert.equal(state.jobs.length,0);});
});
for(const bytes of ['{"jsonrpc":"2.0","id":7,"id":8}',Buffer.from([0xff]),'\ufeff{}','{"x":"\\ud800"}',''])test('authorized strict private JSON parse failure '+String(bytes),async()=>{
  await loopback(async({post,jobs})=>{const r=await post(bytes);assert.deepEqual(r.body,rawRpcError(null,-32700));assert.equal(jobs.length,0);});
});
for(const opts of [{scopes:[]},{scopes:['kb.read']},{allowedNamespaces:null},{allowedNamespaces:new Set()},{allowedNamespaces:new Set(['Foreign'])}])test('scope/allowlist cannot be authorized by profile assignment '+JSON.stringify(opts),async()=>{
  await loopback(async({post,jobs})=>{const r=await post(JSON.stringify(request));assert.deepEqual(r.body,rawRpcError(7,-32001));assert.equal(jobs.length,0);},opts);
});
test('foreign whole batch and strict arguments denied without worker admission',async()=>{
  await loopback(async({post,jobs})=>{
    for(const [args,code]of [[{...request.params.arguments,limit:'5'},-32602],[{...request.params.arguments,entity_ref:{namespace:'Foreign',id:'x'}},-32001]]){
      const r=await post(JSON.stringify({...request,params:{...request.params,arguments:args}}));assert.deepEqual(r.body,rawRpcError(7,code));
    }assert.equal(jobs.length,0);
  });
});
for(const error of ['SEMANTIC_BUSY','SEMANTIC_UNAVAILABLE','SEMANTIC_REQUEST_FAILED','SEMANTIC_CANCELLED'])test('private HTTP fixed executor error '+error,async()=>{
  await loopback(async({post,jobs})=>{const r=await post(JSON.stringify(request));assert.deepEqual(r.body,rawRpcError(7,error==='SEMANTIC_BUSY'?-32004:-32603));assert.equal(jobs.length,1);assert.deepEqual(Object.keys(jobs[0].c).sort(),['allowedNamespaces','authorization','profile']);}, {error});
});
test('private initialize/list/common metadata use no executor or registry',async()=>{
  await loopback(async({post,jobs})=>{
    for(const method of ['initialize','tools/list','resources/list'])assert((await post(JSON.stringify({jsonrpc:'2.0',id:7,method}))).body.result);
    const r=await post(JSON.stringify({...request,params:{name:'list_knowledge_bases',arguments:{}}}));assert.deepEqual(r.body.result.structuredContent,{kbs:[{name:'OWA Ontology',namespace:'OWAOntology',projectId:16}],count:1});assert.equal(jobs.length,0);
  });
});
test('private bounded HTTP actual adapter → default two-worker pool → pinned record tools',async()=>{
  const fixture=stageProductionRawFixture({sourceRoot:'/tmp/opencode/semantic42-frozen-EsJ4gr',outputRoot:'/tmp/opencode/task5-http-'+randomUUID()});
  const authorization={profile_id:'erp-semantic-evidence-poc',scope:'kb.semantic.read',namespaces:['OWAOntology']};
  const verified=verifyRawArtifact(fixture.trusted,fixture.code,authorization);assert.equal(verified.valid,true);
  const g=captureSemanticGeneration();assert.equal(g.id,fixture.generation.id);
  const pool=createSemanticWorkerPool(g,{trustedDataGeneration:fixture.trusted,codeBinding:fixture.code});
  const adapter=api.createPrivateRawHttpAdapter({authenticate:r=>({authorized:r.headers.authorization==='Bearer task5-e2e',scopes:['kb.semantic.read']}),pool,allowedNamespaces:new Set(['OWAOntology'])});
  const server=http.createServer((req,res)=>{void adapter(req,res);});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const post=(r,token='task5-e2e')=>new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port:server.address().port,path:'/mcp',method:'POST',headers:{Authorization:'Bearer '+token}},res=>{const b=[];res.on('data',c=>b.push(c));res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(Buffer.concat(b))}));});req.on('error',reject);req.end(JSON.stringify(r));});
  try{
    assert.equal((await post(request,'wrong')).status,401);assert.equal(pool.stats().workers,0);
    const bad=structuredClone(request);bad.params.arguments.limit='5';assert.deepEqual((await post(bad)).body,rawRpcError(7,-32602));assert.equal(pool.stats().workers,0);
    assert((await post({jsonrpc:'2.0',id:7,method:'tools/list'})).body.result.tools.length===3);assert.equal(pool.stats().workers,0);
    const results=await Promise.all([post(request),post(request)]);assert.equal(pool.stats().workers,2);
    for(const r of results){assert.equal(r.status,200);assert(validateRawType('RPCSuccess',r.body,{request}));assert.equal(r.body.result.structuredContent.snapshot_id,fixture.trusted.snapshot_id);assert.equal(r.body.result.content[0].text,canonicalJson(r.body.result.structuredContent));}
    const candidate=results[0].body.result.structuredContent.candidates[0];assert(candidate);
    const get={jsonrpc:'2.0',id:'selected',method:'tools/call',params:{name:'erp_evidence.get',arguments:{snapshot_id:fixture.trusted.snapshot_id,requests:[{id:'selected',entity_ref:candidate.entity_ref,record_refs:[candidate.record_refs[0]]}]}}};
    const evidence=(await post(get)).body;assert(validateRawType('RPCSuccess',evidence,{request:get}));assert.equal(evidence.result.structuredContent.results[0].status,'returned_all');assert.equal(evidence.result.structuredContent.records.length,2);assert.deepEqual(evidence.result,rawCallResult(evidence.result.structuredContent));
    assert(!JSON.stringify(evidence).includes(fixture.trusted.data_root));
    console.log(JSON.stringify({probe:'private-http-real-two-slot',generation:g.id,runtime_code_sha256:fixture.code.runtime_code_sha256,compiler_closure_sha256:fixture.manifest.compiler.closure_sha256,manifest_sha256:fixture.trusted.manifest_sha256,index_sha256:fixture.manifest.index.sha256,snapshot_id:fixture.trusted.snapshot_id,artifact_root:fixture.trusted.data_root,artifact_retained:false,stats:pool.stats()}));
  }finally{await new Promise(resolve=>server.close(resolve));await pool.close();fixture.cleanup();}
});
