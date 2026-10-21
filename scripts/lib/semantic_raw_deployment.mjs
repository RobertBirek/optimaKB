// Trusted operator startup only. Configuration is not a request selector and
// contains no credentials. Domain artifacts remain lazy, authorized worker IO.
import fs from 'node:fs';
import {canonicalJson,isSafeRawPath,parseStrictJson,validateRawType} from './semantic_raw_contract.mjs';
import {installRawCodeCapture} from './semantic_raw_code.mjs';

const MAX_CONFIG_BYTES=16384;
const invalid=()=>{throw Object.assign(new Error('Raw deployment configuration invalid.'),{code:'RAW_DEPLOYMENT_INVALID'});};
function safeFile(stat){
  return stat.isFile()&&stat.size>0&&stat.size<=MAX_CONFIG_BYTES
    &&(stat.uid===0||stat.uid===process.getuid())&&(stat.mode&0o022)===0;
}
export function readRawDeploymentBinding(bindingFile,generation){
  try{
    if(typeof bindingFile!=='string'||!bindingFile.startsWith('/')||!isSafeRawPath(bindingFile.slice(1)))invalid();
    let current='',stat;
    for(const part of bindingFile.slice(1).split('/')){
      current+='/'+part;stat=fs.lstatSync(current);
      if(stat.isSymbolicLink()||(current!==bindingFile&&!stat.isDirectory()))invalid();
    }
    if(!safeFile(stat))invalid();
    const fd=fs.openSync(bindingFile,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
    let bytes;
    try{
      const opened=fs.fstatSync(fd);
      if(!safeFile(opened)||opened.dev!==stat.dev||opened.ino!==stat.ino)invalid();
      bytes=Buffer.alloc(opened.size+1);let used=0,n;
      while(used<bytes.length&&(n=fs.readSync(fd,bytes,used,bytes.length-used,null))>0)used+=n;
      const after=fs.fstatSync(fd);
      if(used!==opened.size||!safeFile(after)||after.size!==opened.size||after.mtimeMs!==opened.mtimeMs||after.ctimeMs!==opened.ctimeMs)invalid();
      bytes=bytes.subarray(0,used);
    }finally{fs.closeSync(fd);}
    const binding=parseStrictJson(bytes);
    if(!binding||typeof binding!=='object'||Array.isArray(binding)
      ||Object.keys(binding).sort().join(',')!=='code,trusted'
      ||!validateRawType('TrustedDataGeneration',binding.trusted)||!validateRawType('CodeBinding',binding.code))invalid();
    // Measurement uses only the already immutable capture, never ambient source
    // or data paths. It binds both the capture-order ID and canonical closure.
    const capture=installRawCodeCapture(generation),{trusted,code}=binding;
    if(code.worker_generation_id!==capture.id||trusted.worker_generation_id!==capture.id
      ||code.runtime_code_sha256!==capture.runtime_code_sha256||trusted.runtime_code_sha256!==capture.runtime_code_sha256
      ||canonicalJson(code.environment)!==canonicalJson(capture.environment))invalid();
    Object.freeze(code.environment);
    return Object.freeze({trustedDataGeneration:Object.freeze(trusted),codeBinding:Object.freeze(code)});
  }catch{invalid();}
}

// Apply only on the opted-in raw path. Profile assignment and editorial/no-auth
// modes confer no semantic scope; a user key must carry its own explicit scope.
export function rawDeploymentAuth(auth,allowReadToken=false){
  const authorized=auth?.authorized===true&&['user_key','read_token','write_token'].includes(auth.mode);
  const semantic=authorized&&((auth.mode==='read_token'&&allowReadToken===true)
    ||(auth.mode==='user_key'&&Array.isArray(auth.scopes)&&auth.scopes.includes('kb.semantic.read')));
  return {authorized,writeAllowed:false,scopes:semantic?['kb.semantic.read']:[]};
}
