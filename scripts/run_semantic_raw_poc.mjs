// Trusted OFFLINE Task6 controller. Never imported by runtime/compiler inventories.
// Domain input is exactly the three sealed streams; selectors consume responses only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import http2 from 'node:http2';
import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns';
import dgram from 'node:dgram';
import cp from 'node:child_process';
import {Worker,MessageChannel} from 'node:worker_threads';
import {register,syncBuiltinESMExports} from 'node:module';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {randomUUID} from 'node:crypto';
import {RAW_ARTIFACTS,RAW_BASE_MANIFEST_SHA256,canonicalJson,parseStrictJson,sha256,isSafeRawPath,validateRawType} from './lib/semantic_raw_contract.mjs';
import {captureCurrentRawCompiler,readProductionRawInputs,stageRawCompilation,RAW_SOURCE_ROOT,RAW_COMPILER_FILES,CURRENT_RAW_RUNTIME_FILES} from './lib/semantic_raw_compile_controller.mjs';
import {captureSemanticGeneration,SEMANTIC_WORKER_BOOTSTRAP} from './lib/semantic_worker_generation.mjs';
import {createSemanticWorkerPool} from './lib/semantic_worker_pool.mjs';
import {createPrivateRawHttpAdapter} from './lib/semantic_raw_http.mjs';

const ROOT=fileURLToPath(new URL('../',import.meta.url)).replace(/\/$/,'');
const AUTH=Object.freeze({profile_id:'erp-semantic-evidence-poc',scope:'kb.semantic.read',namespaces:['OWAOntology']});
const context=()=>({profile:{id:AUTH.profile_id},authorization:AUTH,allowedNamespaces:new Set(AUTH.namespaces)});
const rpc=(id,name,args)=>({jsonrpc:'2.0',id,method:'tools/call',params:{name,arguments:args}});
const blocked=message=>{throw Error('BLOCKED: '+message);};
function need(condition,message){if(!condition)blocked(message);}
const hints=c=>Object.fromEntries(c.metadata_hints.map(h=>[h.key,h.value]));
const body=response=>{need(response?.result?.structuredContent?.mode!=='error'&&!response.error,'tool unavailable');return response.result.structuredContent;};
const unique=xs=>[...new Set(xs)];
const checkpoint=()=>({wall:performance.now(),cpu:process.cpuUsage()});
function elapsed(start){const cpu=process.cpuUsage(start.cpu);return {wall_ms:performance.now()-start.wall,cpu_user_ms:cpu.user/1000,cpu_system_ms:cpu.system/1000,cpu_scope:'process-wide including all worker threads; not per-worker CPU'};}
function measure(fn){const s=checkpoint(),value=fn();return {value,measurement:elapsed(s)};}
async function measureAsync(fn){const s=checkpoint(),value=await fn();return {value,measurement:elapsed(s)};}

export function parsePocArgs(args){
  if(args.length!==4||args[0]!=='--source-root'||args[1]!==RAW_SOURCE_ROOT||args[2]!=='--output')throw Error('Explicit --source-root frozen EsJ4gr --output ABS required');
  const output=args[3];
  if(typeof output!=='string'||!output.startsWith('/tmp/opencode/')||!isSafeRawPath(output.slice(1))||output===RAW_SOURCE_ROOT||output.startsWith(RAW_SOURCE_ROOT+'/')||output===ROOT||output.startsWith(ROOT+'/')&&!output.startsWith(ROOT+'/.superpowers/sdd/'))throw Error('Private exclusive output required');
  return {sourceRoot:args[1],output};
}

// Literal witness names are post-response assertions only, NEVER selectors or queries.
export function assertOperatorExposure(cs){
  const fields=cs.filter(c=>c.candidate_kind==='field');
  for(const [owner,names]of [['kontrahent',['Knt_OpeZalID','Knt_OpeModID']],['towar',['`Twr_OpeZalID`','`Twr_OpeModID`']]]){
    for(const name of names)need(fields.some(c=>c.entity_ref.id.toLowerCase().includes(owner)&&c.name===name&&c.record_refs.length),'required '+owner+' metadata declaration '+name+' not exposed');
  }
  need(new Set(fields.map(c=>c.entity_ref.id)).size===2,'both literal metadata owners required');
}

export async function runWorkflow(name,call){
  try{
    let S,requests;
    if(name==='konto'){
      const first=body(await call('erp_subject.discover',{query:'konto',kind:'entity',limit:5}));S=first.snapshot_id;
      const select=word=>first.candidates.find(c=>c.candidate_kind==='entity'&&(c.label??'').toLowerCase().includes(word));
      const bank=select('bankowe'),ledger=select('księgowe');need(bank&&ledger,'konto bank and ledger owners not both exposed');
      requests=[['bank',bank],['ledger',ledger]].map(([id,c])=>{
        const refs=c.related_records.filter(r=>r.source_path!==null).map(r=>r.record_ref);
        need(refs.length===3,'three whole source chunk refs not exposed for '+id);
        return {id,entity_ref:c.entity_ref,record_refs:refs};
      });
    }else if(name==='operator'){
      const first=body(await call('erp_subject.discover',{query:'operator',kind:'field',limit:5}));S=first.snapshot_id;
      assertOperatorExposure(first.candidates);
      const owners=first.candidates.filter(c=>c.candidate_kind==='field'&&c.entity_ref.id.toLowerCase().includes('kontrahent'));
      need(owners.length===2,'two contractor operator declarations required');
      const selectedOwner=owners[0].entity_ref;
      const created=owners.find(c=>(hints(c).description??'').toLowerCase().startsWith('operator zakładający'));
      const modified=owners.find(c=>(hints(c).description??'').toLowerCase().startsWith('operator modyfikujący'));
      need(created&&modified,'literal operator descriptions insufficient');
      const second=body(await call('erp_subject.discover',{query:'data',kind:'field',entity_ref:selectedOwner,expected_snapshot_id:S,limit:5}));
      const dates=second.candidates.filter(c=>c.candidate_kind==='field'&&canonicalJson(c.entity_ref)===canonicalJson(selectedOwner));
      need(dates.some(c=>hints(c).description==='Data utworzenia')&&dates.some(c=>hints(c).description==='Data ostatniej modyfikacji')&&new Set(dates.flatMap(c=>c.record_refs)).size>=2,'both distinct contractor date metadata declarations must be exposed');
      const last=dates.find(c=>hints(c).description==='Data ostatniej modyfikacji');
      requests=[['created_by',created],['modified_by',modified],['modified_at',last]].map(([id,c])=>({id,entity_ref:selectedOwner,record_refs:[c.record_refs[0]]}));
    }else if(name==='iban'){
      const first=body(await call('erp_subject.discover',{query:'Konto bankowe',kind:'entity',limit:5}));S=first.snapshot_id;
      const bank=first.candidates.find(c=>c.candidate_kind==='entity'&&(c.label??'').toLowerCase()==='konto bankowe');need(bank,'bank owner not exposed');
      const second=body(await call('erp_subject.discover',{query:'BRa_IBAN',kind:'field',entity_ref:bank.entity_ref,expected_snapshot_id:S,limit:5}));
      need(second.candidates.length>0&&second.candidates.every(c=>c.candidate_kind==='identifier_mention'),'IBAN must be lexical mentions, not invented metadata');
      const refs=unique(second.candidates.flatMap(c=>[...c.related_records.filter(r=>r.source_path!==null).map(r=>r.record_ref),...c.origins.filter(o=>o.body_field==='content').map(o=>o.record_ref)]));
      need(refs.length===3,'three IBAN whole source chunk refs not exposed');requests=[{id:'iban_sources',entity_ref:bank.entity_ref,record_refs:refs}];
    }else throw Error('Unknown fixed workflow');
    const evidence=body(await call('erp_evidence.get',{snapshot_id:S,requests}));
    const expected={konto:[8,2,13175],operator:[4,1,2600],iban:[4,1,6579]}[name];
    const observed=[evidence.budget.used_records,evidence.budget.used_entity_refs,evidence.budget.used_fields_utf16];
    need(canonicalJson(expected)===canonicalJson(observed)&&evidence.results.every(r=>r.status==='returned_all'),'exact whole-record budget/result expectation failed');
    return {name,status:'DONE',expected_budget:expected,observed_budget:observed};
  }catch(e){return {name,status:'BLOCKED',reason:e.message};}
}

// Parent trusted controller: exact file allowlists, exclusive private writes,
// bounded local network capability. Worker guard is independently installed by bootstrap.
export function installControllerGuard({readFiles,writeFiles,output,directories}){
  const saved=[],violations=[],reads=[],writes=[],metadata=[],ports=new Set(),fds=new Map();
  const readSet=new Set(readFiles),writeSet=new Set(writeFiles),dirs=new Set(directories),ancestors=new Set(['/']);
  for(const f of [...readSet,...writeSet,...dirs]){let p=f;while(p){ancestors.add(p);p=path.dirname(p);if(p==='/'){ancestors.add(p);break;}}}
  const deny=op=>{violations.push(op);throw Error('Task6 controller guard: '+op);};
  const val=p=>p instanceof URL?fileURLToPath(p):typeof p==='string'?p:'';
  const patch=(obj,key,value)=>{saved.push([obj,key,obj[key]]);obj[key]=value;};
  const block=(obj,names)=>{for(const k of names)if(typeof obj[k]==='function')patch(obj,k,()=>deny(k));};
  const original={};for(const k of Object.keys(fs))if(typeof fs[k]==='function')original[k]=fs[k];
  block(fs,Object.keys(original));block(fs.promises,Object.keys(fs.promises));
  for(const k of ['lstatSync','statSync'])patch(fs,k,(p,...args)=>{p=val(p);if(!ancestors.has(p))return deny('metadata '+p);metadata.push(p);return original[k](p,...args);});
  patch(fs,'mkdirSync',(p,options)=>{p=val(p);if(!dirs.has(p)||options?.mode!==0o700||options.recursive)return deny('mkdir '+p);writes.push({operation:'mkdir',path:p});return original.mkdirSync(p,options);});
  patch(fs,'readFileSync',(p,...args)=>{p=val(p);if(!readSet.has(p))return deny('read '+p);reads.push(p);return original.readFileSync(p,...args);});
  patch(fs,'writeFileSync',(p,bytes,options)=>{p=val(p);if(!writeSet.has(p)||!p.startsWith(output+'/')||options?.flag!=='wx'||options?.mode!==0o600)return deny('write '+p);writes.push({operation:'write-exclusive',path:p,bytes:Buffer.byteLength(bytes)});return original.writeFileSync(p,bytes,options);});
  patch(fs,'openSync',(p,flags,...args)=>{
    p=val(p);const writing=flags==='wx'||flags===(fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL);
    const reading=flags==='r'||Number.isInteger(flags)&&flags>=0&&(flags&~(fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK))===fs.constants.O_RDONLY;
    if(writing?(!writeSet.has(p)||!p.startsWith(output+'/')||args[0]!==0o600):(!reading||!readSet.has(p)))return deny('open '+p);
    const fd=original.openSync(p,flags,...args);fds.set(fd,writing?'write':'read');return fd;
  });
  for(const k of ['readSync','writeSync','fstatSync','closeSync'])patch(fs,k,(fd,...args)=>{if(!fds.has(fd)||k==='writeSync'&&fds.get(fd)!=='write'||k==='readSync'&&fds.get(fd)!=='read')return deny(k);const result=original[k](fd,...args);if(k==='closeSync')fds.delete(fd);return result;});
  block(globalThis,['fetch','WebSocket']);block(https,['request','get','createServer']);block(http2,['connect','createServer','createSecureServer']);
  block(tls,['connect','createServer','createSecurePair']);block(net,['connect','createConnection','createServer']);block(dgram,['createSocket']);
  block(dns,Object.keys(dns));block(dns.promises,Object.keys(dns.promises));block(cp,['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork']);
  // Node18 net.Server.listen calls dns.lookup even for this literal address.
  // Return the literal locally; never delegate to an OS/DNS resolver.
  patch(dns,'lookup',(host,options,callback)=>{if(host!=='127.0.0.1')return deny('external DNS');const cb=typeof options==='function'?options:callback;process.nextTick(()=>cb(null,'127.0.0.1',4));});
  const request=http.request;
  patch(http,'request',(options,...args)=>{if(options?.host!=='127.0.0.1'||!ports.has(options.port))return deny('external HTTP');return request(options,...args);});block(http,['get']);
  const connect=net.Socket.prototype.connect;
  patch(net.Socket.prototype,'connect',function(...args){const o=Array.isArray(args[0])?args[0][0]:args[0];if(!o||o.host!=='127.0.0.1'||!ports.has(Number(o.port)))return deny('external socket');return connect.apply(this,args);});
  const create=http.createServer;
  patch(http,'createServer',(...args)=>{const server=create(...args),listen=server.listen;server.listen=function(port,host,...rest){if(port!==0||host!=='127.0.0.1')return deny('non-ephemeral listener');return listen.call(this,port,host,...rest);};return server;});
  syncBuiltinESMExports();
  return {violations,reads,writes,metadata,allowPort(port){ports.add(port);},restore(){for(const [o,k,v]of saved.reverse())o[k]=v;syncBuiltinESMExports();}};
}

function preflightPaths(sourceRoot,output){
  for(const file of [sourceRoot,...RAW_ARTIFACTS.map(p=>sourceRoot+'/'+p),path.dirname(output)]){
    let p='';for(const part of file.slice(1).split('/')){p+='/'+part;assert(!fs.lstatSync(p).isSymbolicLink(),'symlink forbidden');}
  }
  assert(!fs.existsSync(output),'output must not exist');
  return RAW_ARTIFACTS.map(p=>{const s=fs.statSync(sourceRoot+'/'+p);assert.equal(s.mode&0o222,0,'input must be readonly');return {path:p,mode:s.mode&0o777,bytes:s.size};});
}
function waitFor(predicate,label){return new Promise((resolve,reject)=>{const start=Date.now(),t=setInterval(()=>{if(predicate()){clearInterval(t);resolve();}else if(Date.now()-start>90000){clearInterval(t);reject(Error('Timeout '+label));}},5);});}
function localRequest(port,request){return new Promise((resolve,reject)=>{
  const req=http.request({host:'127.0.0.1',port,path:request?'/mcp':'/health',method:request?'POST':'GET',headers:{Authorization:'Bearer task6-inert-local-only'},agent:false},res=>{const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>resolve({status:res.statusCode,body:parseStrictJson(Buffer.concat(chunks))}));});
  req.setTimeout(90000,()=>req.destroy(Error('Bounded local client timeout')));req.on('error',reject);req.end(request?canonicalJson(request):undefined);
});}

export async function probeCpuHealth(port){
  // Separate synthetic mechanism, NOT a production worker/data generation or
  // a latency comparison with old A8. Shared running barrier proves overlap.
  const flags=new Int32Array(new SharedArrayBuffer(4)),messages=[];
  const worker=new Worker(`const {parentPort,workerData}=require('node:worker_threads');
    const flags=new Int32Array(workerData),start=Date.now();let iterations=0;
    Atomics.store(flags,0,1);parentPort.postMessage('running');
    while(Atomics.load(flags,0)===1 && Date.now()-start<5000){Math.sqrt(++iterations);}
    Atomics.store(flags,0,3);parentPort.postMessage({iterations});`,{eval:true,workerData:flags.buffer,env:{}});
  worker.on('message',m=>messages.push(m));
  try{
    await waitFor(()=>messages.includes('running'),'synthetic CPU running');
    const busy_before_request=Atomics.load(flags,0)===1;
    const health=await measureAsync(()=>localRequest(port));
    const busy_after_response=Atomics.load(flags,0)===1;
    Atomics.store(flags,0,2);await waitFor(()=>messages.some(m=>m?.iterations),'synthetic CPU done');
    assert(busy_before_request&&busy_after_response,'health must complete before bounded CPU burst ends');
    return {kind:'separate_synthetic_cpu_mechanism_not_raw_worker',busy_before_request,busy_after_response,maximum_burst_ms:5000,iterations:messages.find(m=>m?.iterations).iterations,health:health.value,measurement:health.measurement};
  }finally{Atomics.store(flags,0,2);await worker.terminate();}
}

async function auditedSlots(generation,trusted,code){
  const states=[];
  try{
    for(let slot=0;slot<2;slot++){
      const channel=new MessageChannel(),audits=[],frames=[],errors=[];
      channel.port1.on('message',m=>audits.push(m));
      const worker=new Worker(SEMANTIC_WORKER_BOOTSTRAP,{eval:true,workerData:{generation,raw:{trustedDataGeneration:trusted,code},auditPort:channel.port2},transferList:[channel.port2],env:{}});
      worker.on('message',m=>frames.push(m));worker.on('error',e=>errors.push(e.message));
      const state={slot,worker,channel,audits,frames,errors,measurements:[]};states.push(state);
      await waitFor(()=>frames.some(f=>f.type==='ready')||errors.length,'audit ready');assert.deepEqual(errors,[]);
      const send=async(request,authorization=AUTH)=>{
        const jobId=randomUUID(),start=checkpoint();worker.postMessage({jobId,request,context:{authorization,trustedDataGeneration:trusted,code},timing:{queueMs:0,startupMs:0}});
        await waitFor(()=>frames.some(f=>f.type==='result'&&f.jobId===jobId)||errors.length,'audit result');assert.deepEqual(errors,[]);
        const frame=frames.find(f=>f.type==='result'&&f.jobId===jobId);assert(validateRawType('RawWorkerResult',frame,{trusted,request}));
        return {frame,measurement:elapsed(start)};
      };
      const request=rpc('audit','erp_subject.discover',{query:'konto',kind:'entity',limit:5});
      const denied=await send(request,null);assert.equal(denied.frame.response.error.code,-32001);
      const bad=structuredClone(request);bad.params.arguments.limit='5';assert.equal((await send(bad)).frame.response.error.code,-32602);
      await waitFor(()=>audits.filter(a=>a.phase==='rejected').length===2,'rejected audits');assert(audits.every(a=>a.opens.length===0&&a.reads===0));
      for(const phase of ['cold_first_authorized_job','warm_fingerprint_plus_lookup'])state.measurements.push({phase,...await send(request)});
      await waitFor(()=>audits.filter(a=>a.phase==='loaded').length===2,'loaded audits');
      const loads=audits.filter(a=>a.phase==='loaded');assert.equal(loads[0].opens.length,5);assert.equal(loads[1].opens.length,10);assert.equal(loads[1].decodes,loads[0].decodes);assert(audits.every(a=>a.violations.length===0));
    }
    return states.map(s=>({slot:s.slot,audits:s.audits,data_ready:s.frames.filter(f=>f.type==='data-ready'),measurements:s.measurements,errors:s.errors}));
  }finally{for(const s of states){await s.worker.terminate();s.channel.port1.close();}}
}

export async function runPoc({sourceRoot,output}){
  // Paths have also been checked by CLI parsing; recheck for direct trusted use.
  parsePocArgs(['--source-root',sourceRoot,'--output',output]);
  const readonly_inputs=preflightPaths(sourceRoot,output),artifact=output+'/artifact';
  const dataFiles=['manifest.json','index.json',...RAW_ARTIFACTS];
  const reports=['code-capture.json','compiler-capture.json','binding.json','poc.json'];
  const writeFiles=[...dataFiles.map(f=>artifact+'/'+f),...reports.map(f=>output+'/'+f)];
  const codePaths=unique([...CURRENT_RAW_RUNTIME_FILES,...RAW_COMPILER_FILES,'scripts/run_semantic_raw_poc.mjs']);
  const guard=installControllerGuard({readFiles:[...codePaths.map(f=>ROOT+'/'+f),...RAW_ARTIFACTS.map(f=>sourceRoot+'/'+f),...writeFiles],writeFiles,output,directories:[output,artifact,artifact+'/exports',artifact+'/exports/owa_ontology',artifact+'/exports/owa_ontology/v1']});
  let pool,server;
  try{
    const capture=measure(()=>{const captured=captureCurrentRawCompiler(),generation=captureSemanticGeneration();assert.equal(generation.id,captured.generation.id);assert.equal(JSON.stringify(generation.sources),JSON.stringify(captured.generation.sources));return {captured,generation,runner:fs.readFileSync(ROOT+'/scripts/run_semantic_raw_poc.mjs')};});
    const {captured,generation,runner}=capture.value;
    fs.mkdirSync(output,{mode:0o700});
    // Measurements contain fractional milliseconds. Reports/code captures are
    // external controller JSON, not hashed normative C(fields)/manifest values.
    const write=(name,value)=>{const bytes=Buffer.from(JSON.stringify(value));fs.writeFileSync(output+'/'+name,bytes,{flag:'wx',mode:0o600});return {path:output+'/'+name,bytes:bytes.length,sha256:sha256(bytes)};};
    const code_capture=write('code-capture.json',generation),compiler_capture=write('compiler-capture.json',captured.compiler_sources);
    // Register only already measured immutable code. Parent/controller imports
    // above remain the explicit trusted startup boundary, not an OS sandbox.
    const sources={...generation.sources};for(const [f,s]of Object.entries(captured.compiler_sources))sources[new URL('../'+f,import.meta.url).href]=s;
    register('data:text/javascript,'+encodeURIComponent(generation.loader),import.meta.url,{data:sources});
    const indexApi=await import('./lib/semantic_raw_index.mjs');indexApi.installRawCompilerCapture(captured);
    const inputs=measure(()=>readProductionRawInputs(sourceRoot));
    const compilation=measure(()=>indexApi.compileRawIndex({compiler:captured.compiler,runtime_files:captured.code.runtime_files,runtime_code_sha256:captured.code.runtime_code_sha256,worker_generation_id:generation.id,environment:captured.code.environment,base_manifest_sha256:RAW_BASE_MANIFEST_SHA256,inputs:inputs.value}));
    assert.equal(compilation.value.ok,true,compilation.value.code);
    const stage=measure(()=>stageRawCompilation(artifact,compilation.value,inputs.value));
    const manifest=parseStrictJson(compilation.value.manifest_bytes),index=parseStrictJson(compilation.value.index_bytes);
    const code={worker_generation_id:generation.id,runtime_code_sha256:captured.code.runtime_code_sha256,environment:captured.code.environment};
    const trusted={abi:'owa-raw-data-generation/1',data_root:artifact,manifest_path:artifact+'/manifest.json',manifest_sha256:sha256(compilation.value.manifest_bytes),snapshot_id:manifest.snapshot_id,worker_generation_id:generation.id,runtime_code_sha256:code.runtime_code_sha256};
    const binding_file=write('binding.json',{trustedDataGeneration:trusted,codeBinding:code,code_capture:code_capture.path,compiler_capture:compiler_capture.path});
    const verifier=await import('./lib/semantic_raw_verifier.mjs');
    const verification=measure(()=>verifier.verifyRawArtifact(trusted,code,AUTH));assert.equal(verification.value.valid,true,'independent verification must precede pool release');
    const report={status:'BLOCKED',assessment:'contract_only',semantic_assessment:'not_performed',readonly_inputs,runner_source:{path:'scripts/run_semantic_raw_poc.mjs',bytes:runner.length,sha256:sha256(runner)},bindings:{...code,manifest_sha256:trusted.manifest_sha256,snapshot_id:trusted.snapshot_id,index_sha256:manifest.index.sha256,compiler_closure_sha256:manifest.compiler.closure_sha256},capture:{measurement:capture.measurement,code_capture,compiler_capture,binding_file},input_capture:inputs.measurement,compilation:compilation.measurement,staging:stage.measurement,independent_verification:{measurement:verification.measurement,result:verification.value},pool_released_after_verification:true,artifact:{root:artifact,files:dataFiles.map(f=>{const b=fs.readFileSync(artifact+'/'+f);assert.equal(fs.statSync(artifact+'/'+f).mode&0o777,0o600);return {path:f,bytes:b.length,sha256:sha256(b)};})},accounting:index.accounting,postings:index.postings.length,diagnostics:index.diagnostics.length,runtime_files:manifest.runtime_files,compiler_files:manifest.compiler.files,workflows:[],limits:{max_records:8,max_fields_utf16:16000,max_entity_refs:2,max_data_bytes:8388608,max_code_bytes:2097152,max_workers:2,max_queued:8},limitations:['Deterministic selectors, no caller model execution or semantic quality evaluation.','Whole source fragments and qualifications are delivered unchanged; semantic completeness not assessed; current SQL not certified.','K3/K4 remain un-reassembled/unassessed.','Old A8 FAIL/BLOCKED 1.25; known20 1 PASS / 12 PARTIAL / 7 MISS unchanged.','Trusted parent/controller startup and builtin guards are not an OS sandbox.','CPU measurements use process.cpuUsage: aggregate for this process and all worker threads, no per-worker CPU claim.']};
    pool=createSemanticWorkerPool(generation,{trustedDataGeneration:trusted,codeBinding:code});
    const adapter=createPrivateRawHttpAdapter({authenticate:r=>({authorized:r.headers.authorization==='Bearer task6-inert-local-only',scopes:['kb.semantic.read']}),pool,allowedNamespaces:new Set(['OWAOntology'])});
    server=http.createServer((req,res)=>{if(req.url==='/health'&&req.method==='GET'){res.setHeader('Content-Type','application/json');res.end(canonicalJson({ok:true,...pool.stats()}));}else void adapter(req,res);});
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    const port=server.address().port;guard.allowPort(port);
    const initial=rpc('cold','erp_subject.discover',{query:'konto',kind:'entity',limit:5});
    const coldStart=checkpoint(),cold=[localRequest(port,initial),localRequest(port,{...initial,id:'cold2'})];
    await waitFor(()=>pool.stats().active===2,'two cold default slots');
    const health=await measureAsync(()=>localRequest(port));assert.equal(health.value.body.active,2,'health must respond while both cold jobs active');
    const coldResults=await Promise.all(cold);assert(coldResults.every(r=>r.body.result?.structuredContent.snapshot_id===trusted.snapshot_id));
    const coldMeasurement=elapsed(coldStart);
    const warm=await measureAsync(()=>Promise.all([localRequest(port,initial),localRequest(port,{...initial,id:'warm2'})]));
    assert(warm.value.every(r=>r.body.result?.structuredContent.snapshot_id===trusted.snapshot_id));
    const health_under_synthetic_cpu=await probeCpuHealth(port);
    const active=new AbortController(),queued=new AbortController();
    const settle=p=>p.then(value=>({value}),error=>({error:error.code}));
    const jobs=Array.from({length:10},(_,i)=>settle(pool.run({...initial,id:'capacity'+i},context(),{signal:i===0?active.signal:i===2?queued.signal:undefined})));
    const capacity={...pool.stats()};assert.equal(capacity.active,2);assert.equal(capacity.queued,8);
    capacity.busy=(await settle(pool.run(initial,context()))).error;
    capacity.cheap_denial=(await pool.run(initial,{...context(),authorization:null})).response;
    active.abort();queued.abort();capacity.cancelled_active=(await jobs[0]).error;capacity.cancelled_queued=(await jobs[2]).error;
    capacity.after_cancel=pool.stats();assert.equal(capacity.after_cancel.active,2);assert.equal(capacity.after_cancel.queued,7);
    await Promise.all(jobs);await waitFor(()=>pool.stats().active===0,'cancelled owner drain');
    report.loopback={host:'127.0.0.1',ephemeral_port:port,synthetic_auth:true,closed_client:true,health_during_cold:{...health.value.body,measurement:health.measurement},health_under_synthetic_cpu,two_default_workers_cold:{measurement:coldMeasurement,responses:coldResults},two_default_workers_warm:{measurement:warm.measurement,responses:warm.value},capacity};
    for(const name of ['konto','operator','iban']){
      const transcript={calls:[],outcome:'clarification',final_answer:null},callMeasurements=[];
      const total=checkpoint();
      const result=await runWorkflow(name,async(tool,args)=>{
        const request=rpc(name+'-'+transcript.calls.length,tool,args),measured=await measureAsync(()=>localRequest(port,request));
        assert.equal(measured.value.status,200);const response=measured.value.body;assert(validateRawType('RPCSuccess',response,{request}));
        transcript.calls.push({request,response});callMeasurements.push(measured.measurement);return response;
      });
      const execution=elapsed(total);if(result.status==='DONE')transcript.outcome='answer';
      const replay=measure(()=>verifier.verifyRawTranscript(trusted,code,AUTH,transcript));
      report.workflows.push({...result,transcript,execution,call_measurements:callMeasurements,verification:{result:replay.value,measurement:replay.measurement}});
    }
    report.loopback.final_pool=pool.stats();await new Promise(resolve=>server.close(resolve));server=null;await pool.close();pool=null;
    report.worker_audits=await auditedSlots(generation,trusted,code);
    // Isolated serial decomposition, not falsely attributed to worker timings.
    const {createRawGenerationLoader}=await import('./lib/semantic_raw_generation.mjs');
    const {discoverRaw}=await import('./lib/semantic_raw_lookup.mjs');
    const loader=createRawGenerationLoader(trusted,code),load=measure(()=>loader.load(AUTH));assert.equal(load.value.ok,true);
    const fingerprint=measure(()=>loader.load(AUTH));assert.equal(fingerprint.value.ok,true);
    const lookup=measure(()=>discoverRaw(fingerprint.value.handle,{query:'konto',kind:'entity',limit:5}));
    report.serial_controller_decomposition={cold_load:load.measurement,warm_five_file_fingerprint:fingerprint.measurement,lookup:lookup.measurement,note:'Separate controller observation; worker jobs include their own fingerprint and lookup.'};
    const finalInputs=readProductionRawInputs(sourceRoot);assert(finalInputs.every((x,i)=>sha256(x.bytes)===sha256(inputs.value[i].bytes)));
    assert.equal(sha256(fs.readFileSync(ROOT+'/scripts/run_semantic_raw_poc.mjs')),report.runner_source.sha256);
    report.status=report.workflows.every(w=>w.status==='DONE'&&w.verification.result.valid)?'DONE':'BLOCKED';
    report.serialized_bytes={runtime:manifest.runtime_files.reduce((n,f)=>n+f.bytes,0),compiler:manifest.compiler.files.reduce((n,f)=>n+f.bytes,0),sources:manifest.sources.reduce((n,f)=>n+f.bytes,0),index:manifest.index.bytes,manifest:compilation.value.manifest_bytes.length,five_file_aggregate:report.artifact.files.reduce((n,f)=>n+f.bytes,0)};
    report.controller_guard={violations:[...guard.violations],reads:[...guard.reads],writes:[...guard.writes],metadata_calls:guard.metadata.length,note:'Sample before final exclusive poc.json write; allowlist permits only declared files/ancestors and ephemeral local client/server. Negative guard tests are separate.'};
    write('poc.json',report);return report;
  }finally{if(server)await new Promise(resolve=>server.close(resolve));if(pool)await pool.close();guard.restore();}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const opts=parsePocArgs(process.argv.slice(2)),report=await runPoc(opts);process.stdout.write(canonicalJson({status:report.status,output:opts.output,snapshot_id:report.bindings.snapshot_id,workflows:report.workflows.map(w=>({name:w.name,status:w.status,reason:w.reason??null}))})+'\n');}
  catch(e){process.stderr.write(canonicalJson({status:'BLOCKED',reason:e.message})+'\n');process.exitCode=1;}
}
