// Private exact-record protocol. Pure initialization; no legacy imports or IO.
import {RAW_SCHEMAS,validateRawType,validateDiscoverInput,validateEvidenceInput,validateRawOutput,rawRpcError,rawToolError,rawCallResult} from './semantic_raw_contract.mjs';
import {discoverRaw,getRawRecords} from './semantic_raw_lookup.mjs';
export const RAW_TOOL_NAMES=Object.freeze(['erp_subject.discover','erp_evidence.get']);
const annotations=Object.freeze({readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false});
export function rawToolDefinitions(){return RAW_TOOL_NAMES.map((name,i)=>({name,
  description:i?'Retrieve selected whole source records and mandatory owner metadata; semantic interpretation is not performed.':'Discover literal metadata candidates and lexical hints; hints are not evidence.',
  inputSchema:RAW_SCHEMAS[i?'EvidenceInput':'DiscoverInput'],outputSchema:RAW_SCHEMAS[i?'EvidenceOutput':'DiscoverOutput'],annotations}));}
export function rawRpcId(request){return validateRawType('RpcId',request?.id)?request.id:null;}
function shell(value,keys){
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))return false;
  const descriptors=Object.getOwnPropertyDescriptors(value),own=Reflect.ownKeys(descriptors);
  return own.length===keys.length&&own.every(k=>keys.includes(k)&&descriptors[k].enumerable&&Object.hasOwn(descriptors[k],'value'));
}
function permitted(context){return validateRawType('AuthorizedScope',context?.authorization)
  &&context?.allowedNamespaces instanceof Set&&context.allowedNamespaces.has('OWAOntology');}
export function preflightRawRpc(request,context){
  const id=rawRpcId(request);
  if(!shell(request,['jsonrpc','id','method','params'])||request.jsonrpc!=='2.0'||id===null||request.method!=='tools/call'
    ||!shell(request.params,['name','arguments']))return rawRpcError(id,-32600);
  if(context?.profile?.id!=='erp-semantic-evidence-poc'||!RAW_TOOL_NAMES.includes(request.params.name))return rawRpcError(id,-32601);
  if(!permitted(context))return rawRpcError(id,-32001);
  const input=request.params.arguments;
  if(!(request.params.name===RAW_TOOL_NAMES[0]?validateDiscoverInput(input):validateEvidenceInput(input)))return rawRpcError(id,-32602);
  const refs=request.params.name===RAW_TOOL_NAMES[0]?(input.entity_ref?[input.entity_ref]:[]):input.requests.map(r=>r.entity_ref);
  if(refs.some(r=>r.namespace!=='OWAOntology'))return rawRpcError(id,-32001);
  return null;
}
export async function handleRawRpc(request,context){
  const refusal=preflightRawRpc(request,context);if(refusal)return refusal;
  const operation=request.params.name===RAW_TOOL_NAMES[0]?'discovery':'evidence',input=request.params.arguments;
  const loaded=context.rawLoader?.load(context.authorization);
  let structured;
  if(!loaded) return rawRpcError(request.id,-32603);
  if(!loaded.ok)structured=rawToolError(operation,validateRawType('LoadError',loaded.code)?loaded.code:'INTERNAL_CONTRACT_ERROR',input.correlation_id??null);
  else structured=operation==='discovery'?discoverRaw(loaded.handle,input):getRawRecords(loaded.handle,input);
  if(!validateRawOutput(operation,structured,{input}))structured=rawToolError(operation,'INTERNAL_CONTRACT_ERROR',input.correlation_id??null);
  return {jsonrpc:'2.0',id:request.id,result:rawCallResult(structured)};
}
// Existing common metadata protocol, with a code-pinned OWA registry entry only.
const kb=Object.freeze({name:'OWA Ontology',namespace:'OWAOntology',projectId:16});
export function privateRawTools(){return [...rawToolDefinitions(),{name:'list_knowledge_bases',description:'List configured knowledge bases.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations}];}
export function handleRawMetadata(request,context){
  const id=rawRpcId(request),method=request?.method;
  if(!request||request.jsonrpc!=='2.0'||(id===null&&method!=='notifications/initialized'))return rawRpcError(id,-32600);
  if(context?.profile?.id!=='erp-semantic-evidence-poc')return rawRpcError(id,-32601);
  if(!permitted(context))return rawRpcError(id,-32001);
  if(method==='initialize')return {jsonrpc:'2.0',id,result:{protocolVersion:'2025-03-26',serverInfo:{name:'erp-semantic-evidence-poc',version:'1.0.0'},capabilities:{tools:{},resources:{}}}};
  if(method==='notifications/initialized')return null;
  if(method==='tools/list')return {jsonrpc:'2.0',id,result:{tools:privateRawTools()}};
  if(method==='tools/call'&&request.params?.name==='list_knowledge_bases'){
    if(!shell(request.params.arguments,[]))return rawRpcError(id,-32602);
    return {jsonrpc:'2.0',id,result:{content:[{type:'text',text:'- OWA Ontology (OWAOntology, project 16)'}],structuredContent:{kbs:[kb],count:1}}};
  }
  if(method==='resources/list')return {jsonrpc:'2.0',id,result:{resources:[{uri:'erp-kb://OWAOntology/info',name:kb.name,description:'Knowledge base: OWA Ontology (project 16)',mimeType:'application/json'}]}};
  if(method==='resources/read'&&request.params?.uri==='erp-kb://OWAOntology/info')return {jsonrpc:'2.0',id,result:{contents:[{uri:request.params.uri,mimeType:'application/json',text:JSON.stringify(kb)}]}};
  return rawRpcError(id,-32601);
}
