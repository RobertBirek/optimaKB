// Importable private transport seam. No listener, registry, config, or capability
// discovery: a trusted controller supplies the pool and inert/test auth callback.
import {getMcpProfile} from './erp_knowledge_mcp_profiles.mjs';
import {parseStrictJson,rawRpcError} from './semantic_raw_contract.mjs';
import {RAW_TOOL_NAMES,preflightRawRpc,handleRawMetadata,rawRpcId} from './semantic_raw_mcp.mjs';
function send(res,status,payload){const body=JSON.stringify(payload);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(body),'Cache-Control':'no-store'});res.end(body);}
async function body(req,maxBytes){
  const chunks=[];let bytes=0;
  for await(const chunk of req){bytes+=chunk.length;if(bytes>maxBytes)throw Error('Invalid raw body');chunks.push(chunk);}
  return parseStrictJson(Buffer.concat(chunks));
}
export function createPrivateRawHttpAdapter({authenticate,pool,allowedNamespaces,maxBodyBytes=1048576}){
  const profile=getMcpProfile('erp-semantic-evidence-poc');
  const allowed=allowedNamespaces instanceof Set?new Set([...allowedNamespaces].filter(n=>profile.namespaces.includes(n))):new Set();
  return async function privateRawHttp(req,res){
    const cancellation=new AbortController();
    const disconnect=()=>{if(!res.writableEnded)cancellation.abort();};
    const disconnected=()=>{if(res.destroyed||req.aborted)cancellation.abort();return cancellation.signal.aborted;};
    // Observe disconnects across auth/body awaits, and latch states whose events
    // preceded registration. Admission must not depend on the pool's signal check.
    res.on('close',disconnect);req.on('aborted',disconnect);
    try{
      if(disconnected())return;
      const auth=await authenticate(req);
      if(disconnected())return;
      if(auth?.authorized!==true){res.setHeader('WWW-Authenticate','Bearer');return send(res,401,{error:'unauthorized',message:'Missing or invalid bearer token.'});}
      let request;
      try{request=await body(req,maxBodyBytes);}catch{if(disconnected())return;return send(res,400,rawRpcError(null,-32700));}
      if(disconnected())return;
      const authorization=Array.isArray(auth.scopes)&&auth.scopes.includes('kb.semantic.read')&&allowed.has('OWAOntology')
        ?{profile_id:profile.id,scope:'kb.semantic.read',namespaces:['OWAOntology']}:null;
      const context={profile,allowedNamespaces:allowed,authorization};
      try{
        let response;
        if(RAW_TOOL_NAMES.includes(request?.params?.name)){
          response=preflightRawRpc(request,context);
          if(!response){
            if(disconnected())return;
            response=(await pool.run(request,context,{signal:cancellation.signal})).response;
          }
        }else response=handleRawMetadata(request,context);
        if(disconnected())return;
        if(response===null){res.writeHead(202,{'Content-Length':'0'});res.end();return;}
        return send(res,200,response);
      }catch(error){
        if(disconnected())return;
        return send(res,503,rawRpcError(rawRpcId(request),error.code==='SEMANTIC_BUSY'?-32004:-32603));
      }
    }finally{res.off('close',disconnect);req.off('aborted',disconnect);}
  };
}
