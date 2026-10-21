import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { register } from 'node:module';

// Code only, captured once before the bridge imports its core/profiles. Not a
// corpus cache. Fixed inventory and byte ceiling bound retention/startup work.
export const SEMANTIC_CODE_FILES = Object.freeze([
  'scripts/erp_knowledge_answer.mjs', 'scripts/erp_knowledge_assistant.mjs',
  ...['erp_knowledge_mcp_core', 'erp_knowledge_mcp_profiles', 'knowledge_retrieval',
    'owa_query_context', 'owa_evidence', 'owa_answer_presentation', 'local_source_provenance', 'learning',
    'semantic_request_intent', 'semantic_catalog', 'semantic_requirements', 'semantic_evidence',
    'external_search', 'external_search_policy', 'knowledge_inbox', 'promoted_knowledge',
    'content_cleaner', 'provider_secrets', 'transient_retry', 'dashboard_automation',
    'dashboard_audit', 'feedback_learning', 'atomic_file', 'semantic_worker_entry'].map(n => `scripts/lib/${n}.mjs`),
  'scripts/erp_knowledge_mcp_http_bridge.mjs',
  ...['mcp_registry', 'semantic_worker_pool', 'semantic_worker_generation',
    'semantic_raw_contract', 'semantic_raw_csv', 'semantic_raw_code', 'semantic_raw_index', 'semantic_lexical_context',
    'semantic_raw_lookup', 'semantic_raw_artifact', 'semantic_raw_generation', 'semantic_raw_verifier',
    'semantic_raw_mcp', 'semantic_raw_worker', 'semantic_raw_http', 'semantic_raw_deployment'].map(n => `scripts/lib/${n}.mjs`),
]);

const LOADER = `
  import { isBuiltin } from 'node:module';
  let sources;
  export function initialize(data) { sources = data; }
  export async function resolve(specifier, context, next) {
    if (isBuiltin(specifier)) return next(specifier, context);
    let url; try { url = new URL(specifier, context.parentURL).href; } catch {}
    if (Object.hasOwn(sources, url)) return { url, shortCircuit: true };
    if (Object.hasOwn(sources, context.parentURL)) throw Error('Semantic code generation dependency unavailable');
    return next(specifier, context);
  }
  export function load(url, context, next) {
    if (Object.hasOwn(sources, url)) return { source: sources[url], format: 'module', shortCircuit: true };
    return next(url, context);
  }
`;

export function captureSemanticGeneration(rootUrl = new URL('../../', import.meta.url)) {
  const sources = {};
  let bytes = 0;
  for (const file of SEMANTIC_CODE_FILES) {
    const url = new URL(file, rootUrl);
    const size = fs.statSync(url).size;
    if (size > 2 * 1024 * 1024 - bytes) throw Error('Semantic code generation exceeds byte bound');
    const source = fs.readFileSync(url, 'utf8');
    bytes += Buffer.byteLength(source);
    if (bytes > 2 * 1024 * 1024) throw Error('Semantic code generation exceeds byte bound');
    sources[url.href] = source;
  }
  const id = createHash('sha256').update(JSON.stringify(sources)).digest('hex');
  return Object.freeze({ id, sources: Object.freeze(sources), loader: LOADER,
    coreUrl: new URL('scripts/lib/erp_knowledge_mcp_core.mjs', rootUrl).href,
    profilesUrl: new URL('scripts/lib/erp_knowledge_mcp_profiles.mjs', rootUrl).href,
    workerUrl: new URL('scripts/lib/semantic_worker_entry.mjs', rootUrl).href });
}

export function installSemanticGeneration(generation) {
  register('data:text/javascript,' + encodeURIComponent(generation.loader), import.meta.url, { data: generation.sources });
}

// Supplied to Worker(eval), so source transfer after parent startup cannot make
// a lazy worker import a newer entrypoint or dependency. No filesystem writes.
export const SEMANTIC_WORKER_BOOTSTRAP = `
  const { workerData } = require('node:worker_threads');
  const { register } = require('node:module');
  const { createHash } = require('node:crypto');
  const g = workerData.generation;
  if (createHash('sha256').update(JSON.stringify(g.sources)).digest('hex') !== g.id) throw Error('Semantic generation mismatch');
  if (!Object.hasOwn(g.sources, g.workerUrl) || !g.workerUrl.endsWith('/scripts/lib/semantic_worker_entry.mjs')) throw Error('Semantic bootstrap unavailable');
  // Before loader registration or ANY application import. Only the controller
  // can provide workerData.raw. Audit travels on a separate test MessagePort,
  // never as extension fields in production worker frames.
  if (workerData.raw) {
    let codeBytes=0;
    for (const source of Object.values(g.sources)) {
      if (typeof source!=='string' || !source.length) throw Error('Raw code bootstrap unavailable');
      codeBytes+=Buffer.byteLength(source);
      if (codeBytes>2097152) throw Error('Raw code bootstrap unavailable');
    }
    const suffix='scripts/lib/semantic_worker_entry.mjs', rootUrl=g.workerUrl.slice(0,-suffix.length);
    if (g.coreUrl!==rootUrl+'scripts/lib/erp_knowledge_mcp_core.mjs' || g.profilesUrl!==rootUrl+'scripts/lib/erp_knowledge_mcp_profiles.mjs') throw Error('Raw code bootstrap unavailable');
    const generationSource=g.sources[rootUrl+'scripts/lib/semantic_worker_generation.mjs'];
    const marker='const LOADER = '+String.fromCharCode(96);
    const offset=typeof generationSource==='string'?generationSource.indexOf(marker):-1;
    const start=offset+marker.length, end=offset<0?-1:generationSource.indexOf(String.fromCharCode(96)+';',start);
    if (offset<0 || end<start || generationSource.slice(start,end)!==g.loader) throw Error('Raw code bootstrap unavailable');
    const fs = require('node:fs');
    const fsp = require('node:fs/promises');
    const http = require('node:http'), https = require('node:https'), http2 = require('node:http2');
    const net = require('node:net'), tls = require('node:tls'), dns = require('node:dns');
    const dgram = require('node:dgram'), cp = require('node:child_process');
    const { syncBuiltinESMExports } = require('node:module');
    const root = workerData.raw.trustedDataGeneration.data_root;
    const fixed = new Set([root+'/manifest.json', root+'/index.json',
      root+'/exports/owa_ontology/v1/ontology_entity.csv', root+'/exports/owa_ontology/v1/ontology_field.csv', root+'/exports/owa_ontology/v1/chunk.csv']);
    const ancestors = new Set();
    for (const file of fixed) { let p=file; while (p) { ancestors.add(p); p=p.slice(0,p.lastIndexOf('/')); } }
    ancestors.add('/');
    let active=false, reads=0, bytes=0, decodes=0;
    const opens=[], violations=[], fds=new Set();
    const deny = () => {
      if (workerData.auditPort) { violations.push('AMBIENT_IO_DENIED'); workerData.auditPort.postMessage({phase:'blocked',reads,bytes,decodes,opens:[...opens],violations:[...violations]}); }
      throw Error('Raw IO unavailable');
    };
    const pathValue = p => p instanceof URL ? p.pathname : typeof p === 'string' ? p : '';
    for (const name of ['lstatSync','statSync']) { const original=fs[name]; fs[name]=function(p,...args) {
      if (!active || !ancestors.has(pathValue(p))) return deny();
      return original.call(fs,p,...args);
    }; }
    const open=fs.openSync, read=fs.readSync, fstat=fs.fstatSync, close=fs.closeSync;
    fs.openSync=function(p,flags,...args) {
      if (!active || !fixed.has(pathValue(p)) || typeof flags!=='number' || (flags & (fs.constants.O_WRONLY|fs.constants.O_RDWR|fs.constants.O_CREAT|fs.constants.O_TRUNC|fs.constants.O_APPEND))) return deny();
      const fd=open.call(fs,p,flags,...args); fds.add(fd); if (workerData.auditPort) opens.push(pathValue(p)); return fd;
    };
    fs.readSync=function(fd,...args) { if (!active || !fds.has(fd)) return deny(); const n=read.call(fs,fd,...args); if (workerData.auditPort) { reads++;bytes+=n; } return n; };
    fs.fstatSync=function(fd,...args) { if (!active || !fds.has(fd)) return deny(); return fstat.call(fs,fd,...args); };
    fs.closeSync=function(fd,...args) { if (!fds.has(fd)) return deny(); fds.delete(fd);return close.call(fs,fd,...args); };
    const allowed=new Set(['lstatSync','statSync','openSync','readSync','fstatSync','closeSync']);
    for (const name of Object.keys(fs)) if (typeof fs[name]==='function' && !allowed.has(name)) fs[name]=deny;
    for (const name of Object.keys(fsp)) if (typeof fsp[name]==='function') fsp[name]=deny;
    for (const mod of [http,https,http2,net,tls,dns,dgram,cp]) for (const name of Object.keys(mod)) if (typeof mod[name]==='function') mod[name]=deny;
    if (dns.promises) for (const name of Object.keys(dns.promises)) if (typeof dns.promises[name]==='function') dns.promises[name]=deny;
    globalThis.fetch=deny;
    if (workerData.auditPort) {
      const decode=TextDecoder.prototype.decode;
      TextDecoder.prototype.decode=function(...args) { if (active) decodes++; return decode.apply(this,args); };
    }
    globalThis[Symbol.for('owa.raw.guard')]=Object.freeze({beginData(){active=true;},endData(){active=false;},audit(phase){
      workerData.auditPort?.postMessage({phase,reads,bytes,decodes,opens:[...opens],violations:[...violations]});
    }});
    syncBuiltinESMExports();
    globalThis[Symbol.for('owa.raw.guard')].audit('bootstrap');
  }
  register('data:text/javascript,' + encodeURIComponent(g.loader), { data: g.sources });
  import(g.workerUrl).catch(() => process.exit(1));
`;
