// Pure contract/dispatch tests. No corpus, provider, registry, or service calls.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {getMcpProfile,listMcpProfiles} from './lib/erp_knowledge_mcp_profiles.mjs';
import {RAW_SCHEMAS,rawRpcError,rawToolError,canonicalJson} from './lib/semantic_raw_contract.mjs';
const api = await import('./lib/semantic_raw_mcp.mjs').catch(e=>{if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;return {};});
export const authorization = {profile_id:'erp-semantic-evidence-poc',scope:'kb.semantic.read',namespaces:['OWAOntology']};
export const request = (args={query:'operator',kind:'field'},name='erp_subject.discover')=>({jsonrpc:'2.0',id:7,method:'tools/call',params:{name,arguments:args}});
export const context = ()=>({profile:{id:'erp-semantic-evidence-poc'},authorization:structuredClone(authorization),allowedNamespaces:new Set(['OWAOntology'])});
test('private tools do not leak through default profile enumeration',()=>{
  let profile;try{profile=getMcpProfile('erp-semantic-evidence-poc');}catch{}
  assert(profile,'missing private evidence profile');
  assert.deepEqual(profile.tools,['erp_subject.discover','erp_evidence.get','list_knowledge_bases']);
  assert.equal(profile.port,null);assert.deepEqual(profile.namespaces,['OWAOntology']);
  assert.equal(listMcpProfiles().filter(p=>p.mode==='read-only').length,7);
  assert(!listMcpProfiles().some(p=>p.id===profile.id));
});
test('dedicated definitions have exact closed input/output unions and annotations',()=>{
  assert.equal(typeof api.rawToolDefinitions,'function','private typed definitions missing');
  assert.deepEqual(api.RAW_TOOL_NAMES,['erp_subject.discover','erp_evidence.get']);
  const tools=api.rawToolDefinitions();assert.equal(tools.length,2);
  for(const [i,t] of tools.entries()){
    assert.equal(t.name,api.RAW_TOOL_NAMES[i]);
    assert.deepEqual(t.inputSchema,RAW_SCHEMAS[i?'EvidenceInput':'DiscoverInput']);
    assert.deepEqual(t.outputSchema,RAW_SCHEMAS[i?'EvidenceOutput':'DiscoverOutput']);
    assert.deepEqual(t.annotations,{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false});
  }
});
for(const [label,mutate,code] of [
  ['null scope',c=>c.authorization=null,-32001],['empty intersection',c=>c.allowedNamespaces=new Set(),-32001],
  ['missing allowlist',c=>c.allowedNamespaces=null,-32001],['wrong profile',c=>c.profile={id:'erp-semantic-mcp'},-32601],
  ['forged scope',c=>c.authorization={...authorization,scope:'kb.read'},-32001],
])test(label+' denies before lazy loader getter',async()=>{
  assert.equal(typeof api.handleRawRpc,'function','raw handler missing');
  const c=context();mutate(c);Object.defineProperty(c,'rawLoader',{get(){assert.fail('loader touched');}});
  assert.deepEqual(await api.handleRawRpc(request(),c),rawRpcError(7,code));
});
for(const args of [null,{}, {query:'x',kind:'field',limit:'5'},{query:' ',kind:'field'},
  {query:'x',kind:'field',data_root:'/secret'}, {query:'x',kind:'field',entity_ref:{namespace:'OWAOntology',id:'x'},limit:6}])
test('strict arguments rejected before loader: '+JSON.stringify(args),async()=>{
  assert.equal(typeof api.handleRawRpc,'function','raw handler missing');
  const c=context();Object.defineProperty(c,'rawLoader',{get(){assert.fail('loader touched');}});
  assert.deepEqual(await api.handleRawRpc(request(args),c),rawRpcError(7,-32602));
});
test('foreign namespace anywhere denies the entire evidence batch before loader',async()=>{
  assert.equal(typeof api.handleRawRpc,'function');const c=context();Object.defineProperty(c,'rawLoader',{get(){assert.fail('loader touched');}});
  const args={snapshot_id:'a'.repeat(64),requests:['OWAOntology','Foreign'].map((namespace,i)=>({id:String(i),entity_ref:{namespace,id:'owner'},record_refs:['b'.repeat(64)]}))};
  assert.deepEqual(await api.handleRawRpc(request(args,'erp_evidence.get'),c),rawRpcError(7,-32001));
});
test('closed envelope has fixed InvalidRequest and controlled load failure canonical parity',async()=>{
  assert.equal(typeof api.handleRawRpc,'function');
  for(const r of [{...request(),extra:1},{...request(),id:null},{...request(),jsonrpc:'1.0'}])assert.equal((await api.handleRawRpc(r,context())).error.code,-32600);
  const c={...context(),rawLoader:{load(){return {ok:false,code:'INDEX_UNAVAILABLE'};}}};
  const out=await api.handleRawRpc(request(),c);assert.deepEqual(out.result.structuredContent,rawToolError('discovery','INDEX_UNAVAILABLE'));
  assert.equal(out.result.content[0].text,canonicalJson(out.result.structuredContent));assert.equal(out.result.isError,true);
});
test('early core dispatch preserves raw denial before generic argument coercion; lists remain private',async()=>{
  const core=await import('./lib/erp_knowledge_mcp_core.mjs');
  assert(!core.listToolsForProfile().some(t=>api.RAW_TOOL_NAMES.includes(t.name)));
  for(const p of listMcpProfiles())assert(!core.listToolsForProfile(p).some(t=>api.RAW_TOOL_NAMES.includes(t.name)));
  assert.deepEqual(core.listToolsForProfile(getMcpProfile('erp-semantic-evidence-poc')).map(t=>t.name),[...api.RAW_TOOL_NAMES,'list_knowledge_bases']);
  const malformed=request({query:{toString:null},kind:'field'});const c=context();Object.defineProperty(c,'rawLoader',{get(){assert.fail('loader touched');}});
  assert.deepEqual(await core.handleJsonRpcRequest(malformed,c),rawRpcError(7,-32602));
  assert.deepEqual(await core.handleJsonRpcRequest(malformed,{...c,allowedNamespaces:new Set()}),rawRpcError(7,-32001));
});
