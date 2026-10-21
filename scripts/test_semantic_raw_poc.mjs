// Offline Task6 only. Explicit subprocess filename, sealed inputs, private output.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import http from 'node:http';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {sha256,canonicalJson,RAW_ARTIFACTS} from './lib/semantic_raw_contract.mjs';
const api=await import('./run_semantic_raw_poc.mjs').catch(e=>{if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;return {};});
test('Task6 trusted CLI accepts only exact explicit controller paths',()=>{
  assert.equal(typeof api.parsePocArgs,'function','Task6 CLI parser missing');
  const args=['--source-root','/tmp/opencode/semantic42-frozen-EsJ4gr','--output','/tmp/opencode/task6-new-private'];
  assert.equal(api.parsePocArgs(args).output,args[3]);
  for(const bad of [[],args.slice(0,2),[...args,'--query','operator'],[args[0],'/tmp/other',...args.slice(2)],[...args.slice(0,3),'relative'],[...args.slice(0,3),'/docker/openspg/output'],[...args.slice(0,3),args[1]],[...args.slice(0,3),'/tmp/opencode/a/../b']])assert.throws(()=>api.parsePocArgs(bad));
});
test('Task6 operator exposure requires both owners and exact quoted metadata names',()=>{
  assert.equal(typeof api.assertOperatorExposure,'function','full exposure assertion missing');
  const c=(owner,name)=>({candidate_kind:'field',entity_ref:{namespace:'OWAOntology',id:owner},name,record_refs:[sha256(name)]});
  const cs=[c('kontrahent','Knt_OpeZalID'),c('kontrahent','Knt_OpeModID'),c('towar','`Twr_OpeZalID`'),c('towar','`Twr_OpeModID`')];
  assert.doesNotThrow(()=>api.assertOperatorExposure(cs));
  for(const altered of [cs.slice(0,3),cs.map((x,i)=>i===3?{...x,name:'Twr_OpeModID'}:x),cs.map(x=>({...x,candidate_kind:'identifier_mention'}))])assert.throws(()=>api.assertOperatorExposure(altered),/BLOCKED/);
});
test('Task6 missing normative exposure stops after first discover; no gold fallback or get',async()=>{
  assert.equal(typeof api.runWorkflow,'function','bounded workflow missing');
  const calls=[];
  const result=await api.runWorkflow('operator',async(name,args)=>{calls.push({name,args});return {jsonrpc:'2.0',id:1,result:{structuredContent:{snapshot_id:'a'.repeat(64),candidates:[],has_more:false}}};});
  assert.equal(result.status,'BLOCKED');assert.equal(calls.length,1);
  assert.deepEqual(calls[0],{name:'erp_subject.discover',args:{query:'operator',kind:'field',limit:5}});
});
test('Task6 missing creation-date exposure blocks before get even when last-modified is visible',async()=>{
  assert.equal(typeof api.runWorkflow,'function');
  const cs=[['kontrahent','Knt_OpeZalID','Operator zakładający rekord'],['kontrahent','Knt_OpeModID','Operator modyfikujący rekord'],['towar','`Twr_OpeZalID`','Operator zakładający'],['towar','`Twr_OpeModID`','Operator modyfikujący']].map(([owner,name,description])=>({candidate_kind:'field',entity_ref:{namespace:'OWAOntology',id:owner},name,record_refs:[sha256(name)],metadata_hints:[{key:'description',value:description}]}));
  const calls=[];
  const result=await api.runWorkflow('operator',async(name,args)=>{
    calls.push({name,args});return {result:{structuredContent:{mode:'discovery',snapshot_id:'a'.repeat(64),has_more:false,candidates:calls.length===1?cs:[{...cs[0],name:'date',metadata_hints:[{key:'description',value:'Data ostatniej modyfikacji'}]}]}}};
  });
  assert.equal(result.status,'BLOCKED');assert.match(result.reason,/both distinct contractor date/);assert.equal(calls.length,2);assert.equal(calls[1].args.query,'data');
});
test('Task6 controller read capability cannot be opened with write/truncate/append flags',()=>{
  assert.equal(typeof api.installControllerGuard,'function');
  const file=fileURLToPath(new URL('../.superpowers/sdd/task6-guard-probe-'+randomUUID(),import.meta.url));
  fs.writeFileSync(file,'synthetic readonly capability',{flag:'wx',mode:0o600});
  const guard=api.installControllerGuard({readFiles:[file],output:'/tmp/opencode/task6-never-created',writeFiles:[],directories:[]});
  try{for(const flags of ['w','wx','a','r+',fs.constants.O_TRUNC,fs.constants.O_APPEND,fs.constants.O_WRONLY])assert.throws(()=>{const fd=fs.openSync(file,flags);fs.closeSync(fd);},/guard/,'write flags must be refused before OS open');}
  finally{guard.restore();}
  assert.equal(fs.readFileSync(file,'utf8'),'synthetic readonly capability');
});
test('Task6 controller guard denies ambient reads, writes and external network before effects',()=>{
  assert.equal(typeof api.installControllerGuard,'function','controller guard missing');
  const guard=api.installControllerGuard({readFiles:[],output:'/tmp/opencode/task6-never-created',writeFiles:[],directories:[]});
  try{
    assert.throws(()=>fs.readFileSync('/forbidden/config'),/guard/);
    assert.throws(()=>fs.writeFileSync('/forbidden/write','x'),/guard/);
    assert.throws(()=>http.request({host:'example.invalid',port:443}),/guard/);
    assert.equal(guard.violations.length,3);
  }finally{guard.restore();}
});
test('Task6 guarded ephemeral literal loopback needs no resolver or external capability',async()=>{
  assert.equal(typeof api.installControllerGuard,'function');
  const guard=api.installControllerGuard({readFiles:[],output:'/tmp/opencode/task6-never-created',writeFiles:[],directories:[]});
  let server;
  try{
    server=http.createServer((req,res)=>res.end('{}'));
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    guard.allowPort(server.address().port);
    await new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port:server.address().port,agent:false},res=>{res.resume();res.on('end',resolve);});req.on('error',reject);req.end();});
    assert.deepEqual(guard.violations,[]);
  }finally{if(server?.listening)await new Promise(resolve=>server.close(resolve));guard.restore();}
});
test('Task6 CPU-burst health mechanism has a bounded real-thread running barrier',async()=>{
  assert.equal(typeof api.probeCpuHealth,'function','bounded CPU/health proof missing');
  const server=http.createServer((req,res)=>res.end('{"ok":true}'));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{const result=await api.probeCpuHealth(server.address().port);assert.equal(result.busy_before_request,true);assert.equal(result.busy_after_response,true);assert.equal(result.health.body.ok,true);assert(result.iterations>0);}
  finally{await new Promise(resolve=>server.close(resolve));}
});
test('Task6 final trusted runner records real ranks, independently verified full records, identities and exact budgets',()=>{
  assert.equal(typeof api.runPoc,'function','trusted runner missing');
  const output=fileURLToPath(new URL('../.superpowers/sdd/task6-test-'+randomUUID(),import.meta.url));
  const run=spawnSync(process.execPath,['scripts/run_semantic_raw_poc.mjs','--source-root','/tmp/opencode/semantic42-frozen-EsJ4gr','--output',output],{cwd:new URL('../',import.meta.url),encoding:'utf8',timeout:240000,maxBuffer:4*1024*1024});
  assert.equal(run.error,undefined,run.error?.message);
  assert.equal(run.status,0,run.stdout+run.stderr);
  const report=JSON.parse(fs.readFileSync(output+'/poc.json'));
  console.log(JSON.stringify({task6_artifact:output,status:report.status,workflows:report.workflows.map(w=>({name:w.name,status:w.status,reason:w.reason??null}))}));
  assert.equal(report.independent_verification.result.valid,true);
  assert.equal(report.pool_released_after_verification,true);
  assert.equal(report.bindings.worker_generation_id,'ebea90186241da3e5c4a25a6b0f2f8cc32f5c9326efe622052a809dd6861b0f0');
  assert.equal(report.bindings.snapshot_id,'4767385d4ff213f519527daf0f173b7bcaf7b399b3b4daa0c3ef4941e7db1d69');
  assert.deepEqual(report.bindings.environment,{node_version:process.version,unicode_version:process.versions.unicode,icu_version:process.versions.icu});
  const manifest=JSON.parse(fs.readFileSync(output+'/artifact/manifest.json'));
  assert.equal(sha256(fs.readFileSync(output+'/artifact/manifest.json')),report.bindings.manifest_sha256);
  assert.equal(manifest.snapshot_id,report.bindings.snapshot_id);assert.equal(manifest.runtime_code_sha256,report.bindings.runtime_code_sha256);
  const captured=JSON.parse(fs.readFileSync(output+'/code-capture.json'));
  assert.equal(sha256(JSON.stringify(captured.sources)),captured.id);assert.equal(captured.id,report.bindings.worker_generation_id);
  for(const f of [...report.runtime_files,...report.compiler_files]){const b=fs.readFileSync(new URL('../'+f.path,import.meta.url));assert.equal(b.length,f.bytes);assert.equal(sha256(b),f.sha256);}
  for(const f of Object.values(report.capture).filter(f=>f.path)){const b=fs.readFileSync(f.path);assert.equal(b.length,f.bytes);assert.equal(sha256(b),f.sha256);}
  assert.equal(report.runtime_files.length,42);assert.equal(report.compiler_files.length,7);
  assert(report.serialized_bytes.five_file_aggregate<=8388608);assert(report.serialized_bytes.runtime<=2097152);assert(report.serialized_bytes.compiler<=2097152);
  assert.equal(report.artifact.files.length,5);
  assert.deepEqual(report.artifact.files.map(f=>f.path).sort(),['manifest.json','index.json',...RAW_ARTIFACTS].sort());
  for(const f of report.artifact.files){const b=fs.readFileSync(output+'/artifact/'+f.path);assert.equal(sha256(b),f.sha256);assert.equal(b.length,f.bytes);assert.equal(fs.statSync(output+'/artifact/'+f.path).mode&0o777,0o600);}
  assert.equal(fs.statSync(output).mode&0o777,0o700);
  assert.equal(report.controller_guard.violations.length,0);
  assert.equal(report.loopback.health_during_cold.active,2);
  assert.equal(report.loopback.health_under_synthetic_cpu.busy_after_response,true);
  assert.equal(report.loopback.capacity.maxQueued,8);assert.equal(report.loopback.capacity.busy,'SEMANTIC_BUSY');
  assert.equal(report.loopback.capacity.cancelled_active,'SEMANTIC_CANCELLED');
  assert.equal(report.loopback.capacity.cancelled_queued,'SEMANTIC_CANCELLED');
  assert.equal(report.worker_audits.length,2);
  for(const slot of report.worker_audits){
    assert.equal(slot.data_ready.length,1);assert.equal(slot.data_ready[0].snapshot_id,report.bindings.snapshot_id);
    assert(slot.audits.every(a=>a.violations.length===0));
    const loads=slot.audits.filter(a=>a.phase==='loaded');assert.equal(loads.length,2);
    assert.equal(loads[0].opens.length,5);assert.equal(loads[1].opens.length,10);assert.equal(loads[1].decodes,loads[0].decodes);
  }
  assert.equal(report.status,'DONE',JSON.stringify(report.workflows.map(w=>({name:w.name,status:w.status,reason:w.reason}))));
  for(const [i,expected]of [[0,[8,2,13175]],[1,[4,1,2600]],[2,[4,1,6579]]]){
    const w=report.workflows[i];assert.equal(w.status,'DONE');assert(w.transcript.calls.length<=3);assert.equal(w.verification.result.valid,true);
    const gets=w.transcript.calls.filter(c=>c.request.params.name==='erp_evidence.get');assert.equal(gets.length,1);
    const body=gets[0].response.result.structuredContent;
    assert.deepEqual([body.budget.used_records,body.budget.used_entity_refs,body.budget.used_fields_utf16],expected);
    assert.equal(body.budget.used_fields_utf16,body.records.reduce((n,r)=>n+canonicalJson(r.fields).length,0));
    assert(body.results.every(r=>r.status==='returned_all'));assert(body.records.every(r=>r.semantic_completeness==='not_assessed'));
  }
  const op=report.workflows[1].transcript.calls;
  api.assertOperatorExposure(op[0].response.result.structuredContent.candidates);
  const dates=op[1].response.result.structuredContent.candidates.filter(c=>c.candidate_kind==='field');
  assert.deepEqual(dates.map(c=>c.name).sort(),['Knt_TS_Mod','Knt_TS_Zal']);
  assert.equal(new Set(dates.flatMap(c=>c.record_refs)).size,2);
  assert.equal(op[0].request.params.arguments.query,'operator');assert.equal(op[1].request.params.arguments.query,'data');
  // Entire actual bounded rank/kind/owner/name/ref sets: post-response witnesses,
  // never supplied to the queries or selection function.
  const owner='OWA_ENTITY_ENCJA_KONTRAHENT_KARTOTEKA_KONTRAHENTOW',towar='OWA_ENTITY_ENCJA_TOWAR_KARTOTEKA_TOWAROW_I_USUG';
  const set=call=>call.response.result.structuredContent.candidates.map(c=>[c.candidate_kind,c.entity_ref.id,c.name,c.record_refs]);
  assert.deepEqual(set(op[0]),[
    ['field',owner,'Knt_OpeModID',['f6beb61d8e6c50fce6cfd52f8cb940c9178fa16f3f9acdc6a4a6df02458ff25f']],
    ['field',owner,'Knt_OpeZalID',['5ae14cee96f0d70c4e8522f7d47f5863f31584b128a21329b8c7f726d4b85285']],
    ['field',towar,'`Twr_OpeModID`',['39c84543a3ff2c8be481b99d11cf9bd05659f9ff54605711fec0e78489a2e873']],
    ['field',towar,'`Twr_OpeZalID`',['f5f5f9d825a18f88a4b34501108b25635c4ca967d4e4044240ddbdd02af1c526']],
  ]);
  assert.deepEqual(set(op[1]),[
    ['field',owner,'Knt_TS_Mod',['6ac2f9f1b7684e9b4b31f585916006422bc879dd752080079e87b8de09daff74']],
    ['field',owner,'Knt_TS_Zal',['7b9cd6cecb53cade3b23ff88806364f0781c972aebf3f529cd329d3e4defdab0']],
  ]);
  assert.deepEqual(set(report.workflows[0].transcript.calls[0]).map(c=>c.slice(0,3)),[
    ['entity','OWA_ENTITY_ENCJA_KONTO_BANKOWE','OWA_ENTITY_ENCJA_KONTO_BANKOWE'],['entity','OWA_ENTITY_ENCJA_KONTO_KSIEGOWE','OWA_ENTITY_ENCJA_KONTO_KSIEGOWE']]);
  assert.deepEqual(set(report.workflows[2].transcript.calls[1]),[['identifier_mention','OWA_ENTITY_ENCJA_KONTO_BANKOWE','BRa_IBAN',['d5b2bcdcf60791f0b8be65bd1a2a1209a95a28daf28f8a56341525e81def30c5','5e1c4d27284c6079401e3db86b04dacd8c5d135a2935e22253247d89fce1c245']]]);
  for(const w of report.workflows)for(const c of w.transcript.calls.filter(c=>c.request.params.name==='erp_subject.discover')){
    const b=c.response.result.structuredContent;assert.equal(b.has_more,false);assert(b.candidates.length<=5);
    for(const candidate of b.candidates){assert(candidate.record_refs.length<=8);assert(candidate.related_records.length<=8);assert(candidate.origins.length<=8);assert(candidate.record_ref_count>=candidate.record_refs.length);assert(candidate.related_record_count>=candidate.related_records.length);}
  }
  // Existing output cannot be reused or relabeled, including report-only reruns.
  const sealed=sha256(fs.readFileSync(output+'/poc.json'));
  const again=spawnSync(process.execPath,['scripts/run_semantic_raw_poc.mjs','--source-root','/tmp/opencode/semantic42-frozen-EsJ4gr','--output',output],{cwd:new URL('../',import.meta.url),encoding:'utf8',timeout:10000});
  assert.equal(again.status,1);assert.match(again.stderr,/output must not exist/);assert.equal(sha256(fs.readFileSync(output+'/poc.json')),sealed);
});
