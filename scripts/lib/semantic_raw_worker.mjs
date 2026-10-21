// Loaded literally only for the private job branch. Never imports legacy core.
import {parentPort,workerData} from 'node:worker_threads';
import {performance} from 'node:perf_hooks';
import {getMcpProfile} from './erp_knowledge_mcp_profiles.mjs';
import {installRawCodeCapture} from './semantic_raw_code.mjs';
import {validateRawType,canonicalJson,rawToolError,rawCallResult} from './semantic_raw_contract.mjs';
import {createRawGenerationLoader} from './semantic_raw_generation.mjs';
import {handleRawRpc,preflightRawRpc} from './semantic_raw_mcp.mjs';
let loader,capture,dataReady=false;
export async function runRawWorkerJob(job){
  const {jobId,request,context}=job,start=performance.now(),guard=globalThis[Symbol.for('owa.raw.guard')];
  const pinned=workerData.raw;
  // Job frames are trusted parent transport, but cannot replace constructor roots.
  if(!pinned||canonicalJson(context.trustedDataGeneration)!==canonicalJson(pinned.trustedDataGeneration)
    ||canonicalJson(context.code)!==canonicalJson(pinned.code))throw Error('Raw worker binding unavailable');
  const trusted=pinned.trustedDataGeneration,code=pinned.code;
  const execution={profile:getMcpProfile('erp-semantic-evidence-poc'),authorization:context.authorization,
    allowedNamespaces:new Set(context.authorization?.namespaces||[])};
  const identity={worker_generation_id:workerData.generation.id,manifest_sha256:trusted.manifest_sha256};
  let response,state='unavailable',snapshot=null;
  try{
    const refusal=preflightRawRpc(request,execution);
    if(refusal){response=refusal;guard?.audit('rejected');}
    else if(!validateRawType('RawWorkerJob',job))throw Error('Raw worker protocol unavailable');
    else{
      capture ||= installRawCodeCapture(workerData.generation);
      if(capture.id!==code.worker_generation_id||capture.runtime_code_sha256!==code.runtime_code_sha256)response={jsonrpc:'2.0',id:request.id,
        result:rawCallResult(rawToolError(request.params.name==='erp_subject.discover'?'discovery':'evidence','DATA_CODE_MISMATCH',request.params.arguments.correlation_id??null))};
      else{
        loader ||= createRawGenerationLoader(trusted,code);
        execution.rawLoader={load(authorized){
          guard?.beginData();let loaded;
          try{loaded=loader.load(authorized);}finally{guard?.endData();}
          guard?.audit(loaded.ok?'loaded':'load-error');
          if(loaded.ok&&!dataReady){parentPort.postMessage({type:'data-ready',jobId,...identity,snapshot_id:trusted.snapshot_id});dataReady=true;}
          return loaded;
        }};
        response=await handleRawRpc(request,execution);
        const body=response.result?.structuredContent;
        if(body&&(body.mode!=='error'||body.code==='SNAPSHOT_MISMATCH')){state='validated';snapshot=trusted.snapshot_id;}
      }
    }
  }catch{
    guard?.endData();
    parentPort.postMessage({type:'request-error',jobId,handlerWallMs:performance.now()-start});return;
  }
  parentPort.postMessage({type:'result',jobId,response,handlerWallMs:performance.now()-start,...identity,snapshot_id:snapshot,data_state:state});
}
