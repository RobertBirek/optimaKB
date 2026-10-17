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
  register('data:text/javascript,' + encodeURIComponent(g.loader), { data: g.sources });
  import(g.workerUrl).catch(() => process.exit(1));
`;
