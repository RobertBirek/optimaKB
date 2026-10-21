// Operator-only configuration tests. Private temporary files; no registry/service IO.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {test} from 'node:test';
import {Readable} from 'node:stream';
import {EventEmitter} from 'node:events';
import {captureCurrentRawCompiler,CURRENT_RAW_RUNTIME_FILES} from './lib/semantic_raw_compile_controller.mjs';
import {captureSemanticGeneration,SEMANTIC_CODE_FILES} from './lib/semantic_worker_generation.mjs';
import {MODULE_FILES} from './lib/owa_offline_harness.mjs';
import {canonicalJson,rawRpcError} from './lib/semantic_raw_contract.mjs';
import {createPrivateRawHttpAdapter} from './lib/semantic_raw_http.mjs';
import {getMcpProfile,listMcpProfiles} from './lib/erp_knowledge_mcp_profiles.mjs';
const api=await import('./lib/semantic_raw_deployment.mjs').catch(e=>{if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;return {};});
let captured;
function config(){
  captured??=captureCurrentRawCompiler();
  const code={worker_generation_id:captured.generation.id,runtime_code_sha256:captured.code.runtime_code_sha256,environment:captured.code.environment};
  return {trusted:{abi:'owa-raw-data-generation/1',data_root:'/no-domain-read',manifest_path:'/no-domain-read/manifest.json',manifest_sha256:'a'.repeat(64),snapshot_id:'b'.repeat(64),worker_generation_id:code.worker_generation_id,runtime_code_sha256:code.runtime_code_sha256},code};
}
function fixture(t,bytes){
  const root=fs.mkdtempSync('/tmp/opencode/rollout-deployment-');
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const file=root+'/binding.json';fs.writeFileSync(file,bytes,{mode:0o600});return {root,file};
}
const invalid=e=>e.code==='RAW_DEPLOYMENT_INVALID'&&e.message==='Raw deployment configuration invalid.';
test('operator binding returns closed pool options from exact immutable capture with no domain reads',t=>{
  assert.equal(typeof api.readRawDeploymentBinding,'function','operator binding reader missing');
  const binding=config(),{file}=fixture(t,canonicalJson(binding));
  const observed=[];const originals={};
  for(const name of ['lstatSync','openSync','readSync','fstatSync','closeSync']){
    originals[name]=fs[name];fs[name]=function(...args){observed.push([name,args[0]]);return originals[name].apply(this,args);};
  }
  let options;
  try{options=api.readRawDeploymentBinding(file,captured.generation);}finally{Object.assign(fs,originals);}
  assert.deepEqual(options,{trustedDataGeneration:binding.trusted,codeBinding:binding.code});
  assert.deepEqual(observed.filter(([name])=>name==='openSync').map(([,p])=>p),[file]);
  assert(!observed.some(([,p])=>typeof p==='string'&&p.startsWith('/no-domain-read')));
  assert(Object.isFrozen(options)&&Object.isFrozen(options.trustedDataGeneration)&&Object.isFrozen(options.codeBinding.environment));
  assert.equal(captureSemanticGeneration().id,captured.generation.id);
});
for(const [name,change] of [
  ['extra top-level',b=>{b.token='never-accepted';}],['missing code',b=>{delete b.code;}],
  ['extra trusted',b=>{b.trusted.latest=true;}],['extra code',b=>{b.code.token='never-accepted';}],
  ['cross-bound runtime',b=>{b.trusted.runtime_code_sha256='c'.repeat(64);}],
  ['cross-bound generation',b=>{b.trusted.worker_generation_id='c'.repeat(64);}],
  ['joint stale runtime',b=>{b.trusted.runtime_code_sha256=b.code.runtime_code_sha256='c'.repeat(64);}],
  ['joint stale generation',b=>{b.trusted.worker_generation_id=b.code.worker_generation_id='c'.repeat(64);}],
  ['environment',b=>{b.code.environment.node_version='v0';}],
  ['unsafe data root',b=>{b.trusted.data_root='/tmp/../selected';}],
  ['manifest path',b=>{b.trusted.manifest_path='/other/manifest.json';}],
])test('binding refuses '+name,t=>{
  assert.equal(typeof api.readRawDeploymentBinding,'function');
  const b=structuredClone(config());change(b);const {file}=fixture(t,JSON.stringify(b));
  assert.throws(()=>api.readRawDeploymentBinding(file,captured.generation),invalid);
});
for(const bytes of ['{}','null','[]','{','{"trusted":{},"trusted":{},"code":{}}',Buffer.from([0xff]),'\ufeff{}','{"x":"\\ud800"}',Buffer.alloc(16385,32)])test('strict closed bounded configuration refuses '+String(bytes).slice(0,45),t=>{
  assert.equal(typeof api.readRawDeploymentBinding,'function');
  const {file}=fixture(t,bytes);config();assert.throws(()=>api.readRawDeploymentBinding(file,captured.generation),invalid);
});
for(const kind of ['relative','dot','trailing','missing','symlink','parent-symlink','directory','group-write','world-write','foreign-owner'])test('configuration file safety '+kind,t=>{
  assert.equal(typeof api.readRawDeploymentBinding,'function');
  const {root,file}=fixture(t,canonicalJson(config()));let selected=file;
  if(kind==='relative')selected='binding.json';
  if(kind==='dot')selected=root+'/./binding.json';
  if(kind==='trailing')selected=file+'/';
  if(kind==='missing')selected=root+'/absent';
  if(kind==='symlink'){selected=root+'/link';fs.symlinkSync(file,selected);}
  if(kind==='parent-symlink'){fs.mkdirSync(root+'/directory');fs.renameSync(file,root+'/directory/binding.json');fs.symlinkSync(root+'/directory',root+'/link');selected=root+'/link/binding.json';}
  if(kind==='directory')selected=root;
  if(kind==='group-write')fs.chmodSync(file,0o620);
  if(kind==='world-write')fs.chmodSync(file,0o602);
  if(kind==='foreign-owner'){
    if(process.getuid()!==0){t.skip('chown requires root');return;}
    fs.chownSync(file,65534,65534);
  }
  assert.throws(()=>api.readRawDeploymentBinding(selected,captured.generation),invalid);
});
test('configuration overbound is refused before open/read',t=>{
  assert.equal(typeof api.readRawDeploymentBinding,'function');
  const {file}=fixture(t,Buffer.alloc(16385));config();const open=fs.openSync;
  fs.openSync=()=>assert.fail('oversized config opened');
  try{assert.throws(()=>api.readRawDeploymentBinding(file,captured.generation),invalid);}finally{fs.openSync=open;}
});
test('configuration accepts the inclusive 16KiB bound and root/operator group-readable mode',t=>{
  const b=config(),json=canonicalJson(b),{file}=fixture(t,json+' '.repeat(16384-Buffer.byteLength(json)));
  fs.chmodSync(file,0o640);
  assert.deepEqual(api.readRawDeploymentBinding(file,captured.generation),{trustedDataGeneration:b.trusted,codeBinding:b.code});
});
test('configuration refuses a different file substituted between lstat and open',t=>{
  const {root,file}=fixture(t,canonicalJson(config()));
  fs.writeFileSync(root+'/replacement',canonicalJson(config()),{mode:0o600});
  const open=fs.openSync;
  fs.openSync=function(p,...args){if(p===file)fs.renameSync(root+'/replacement',file);return open.call(this,p,...args);};
  try{assert.throws(()=>api.readRawDeploymentBinding(file,captured.generation),invalid);}finally{fs.openSync=open;}
});
test('configuration cannot rebind a changed capture even with the original declared id',t=>{
  const {file}=fixture(t,canonicalJson(config()));
  const generation={...captured.generation,sources:{...captured.generation.sources}};
  generation.sources[generation.workerUrl]+='\n// changed capture\n';
  assert.throws(()=>api.readRawDeploymentBinding(file,generation),invalid);
});
test('runtime inventories include deployment helper once in the exact same capture order',()=>{
  const helper='scripts/lib/semantic_raw_deployment.mjs';
  assert(SEMANTIC_CODE_FILES.includes(helper),'deployment helper missing from capture');
  assert.deepEqual(CURRENT_RAW_RUNTIME_FILES,SEMANTIC_CODE_FILES);
  assert.deepEqual(MODULE_FILES,SEMANTIC_CODE_FILES);
  assert.equal(SEMANTIC_CODE_FILES.filter(f=>f===helper).length,1);
});
for(const [name,auth,flag,scope,authorized] of [
  ['default read',{authorized:true,mode:'read_token',scopes:[]},false,false,true],
  ['opted-in read',{authorized:true,mode:'read_token',scopes:[]},true,true,true],
  ['own user scope',{authorized:true,mode:'user_key',scopes:['kb.semantic.read']},false,true,true],
  ['unscoped user',{authorized:true,mode:'user_key',scopes:[]},true,false,true],
  ['editorial token',{authorized:true,mode:'write_token',scopes:['kb.editorial.write']},true,false,true],
  ['unauthenticated',{authorized:false,mode:'read_token',scopes:[]},true,false,false],
  ['no-auth legacy',{authorized:true,mode:'no_auth',scopes:[]},true,false,false],
])test('raw-only transport scope '+name,async()=>{
  assert.equal(typeof api.rawDeploymentAuth,'function','raw-only scope mapping missing');
  const before=structuredClone(auth),mapped=api.rawDeploymentAuth(auth,flag);
  assert.deepEqual(auth,before);assert.equal(mapped.authorized,authorized);assert.equal(mapped.writeAllowed,false);
  assert.deepEqual(mapped.scopes,scope?['kb.semantic.read']:[]);
  let jobs=0;
  const adapter=createPrivateRawHttpAdapter({authenticate:()=>mapped,allowedNamespaces:new Set(['OWAOntology']),pool:{run(){jobs++;return {response:rawRpcError(1,-32603)};}}});
  const req=Readable.from([Buffer.from(JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'erp_subject.discover',arguments:{query:'operator',kind:'field'}}}))]);
  const res=new EventEmitter();Object.assign(res,{setHeader(){},writeHead(status){this.status=status;},end(body){this.body=JSON.parse(body);this.writableEnded=true;}});
  await adapter(req,res);
  assert.equal(jobs,scope?1:0);
  assert.equal(res.status,authorized?200:401);
  if(authorized&&!scope)assert.equal(res.body.error.code,-32001);
});
test('bridge activation is operator opt-in, uses a separate pool and closes both pools',()=>{
  const source=fs.readFileSync(new URL('./erp_knowledge_mcp_http_bridge.mjs',import.meta.url),'utf8');
  assert.match(source,/ERP_KB_RAW_BINDING_FILE/,'bridge binding opt-in missing');
  assert.match(source,/readRawDeploymentBinding\(.*semanticGeneration/);
  assert.match(source,/const rawPool = .*createSemanticWorkerPool\(semanticGeneration, rawOptions\)/);
  assert.match(source,/if \(rawPool\) PATH_PROFILES\.set\(`\$\{MCP_PATH\}\/erp-semantic-evidence-poc`/);
  assert.match(source,/pool: rawPool/);
  assert.match(source,/rawDeploymentAuth\(authContext\(req\), process\.env\.ERP_KB_RAW_ALLOW_READ_TOKEN === '1'\)/);
  assert.match(source,/rawPool\?\.close\(\)/);
  assert.equal(listMcpProfiles().filter(p=>p.mode==='read-only').length,7);
  assert(!listMcpProfiles().some(p=>p.id==='erp-semantic-evidence-poc'));
  assert(getMcpProfile('erp-semantic-evidence-poc').tools.includes('erp_evidence.get'));
});
