import { isBuiltin } from 'node:module';
import { RAW_LIMITS, canonicalJson, hashRaw, isSafeRawPath, sha256, validUnicode, validateRawType } from './semantic_raw_contract.mjs';

const error = (code = 'CODE_CLOSURE_INVALID') => { throw Object.assign(new Error(code),{ code }); };
export function rawEnvironment() {
  return Object.freeze({ node_version:process.version,unicode_version:process.versions.unicode,icu_version:process.versions.icu });
}

// Conservative JS lexical inventory, not regex matching source text. Comments,
// strings, regular expressions and template text cannot hide executable imports;
// template interpolation is recursively tokenized. Unsupported syntax fails
// closed rather than claiming to have resolved a dependency.
function tokenize(source) {
  let p = 0;
  const number = /(?:0[xX][0-9a-fA-F](?:_?[0-9a-fA-F])*n?|0[bB][01](?:_?[01])*n?|0[oO][0-7](?:_?[0-7])*n?|(?:0|[1-9](?:_?[0-9])*)n|(?:(?:0|[1-9](?:_?[0-9])*)(?:\.(?:[0-9](?:_?[0-9])*)?)?|\.[0-9](?:_?[0-9])*)(?:[eE][+-]?[0-9](?:_?[0-9])*)?)/y;
  function quoted(quote) {
    let text = ''; p++;
    while (p < source.length) {
      let c = source[p++]; if (c === quote) return text;
      if (c === '\n' || c === '\r') error();
      if (c !== '\\') { text += c; continue; }
      c = source[p++];
      const escapes = { n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v','0':'\0' };
      if (c === 'u' || c === 'x') {
        const count = c === 'u' ? 4 : 2; let h;
        if (c === 'u' && source[p] === '{') { const end = source.indexOf('}',++p); if (end < 0) error(); h = source.slice(p,end); p = end+1; }
        else { h = source.slice(p,p+count); p += count; if (h.length !== count) error(); }
        if (!/^[0-9a-fA-F]+$/.test(h) || parseInt(h,16) > 0x10ffff) error();
        text += String.fromCodePoint(parseInt(h,16));
      } else if (c === '\n' || c === '\u2028' || c === '\u2029') { /* escaped line continuation */ }
      else if (c === '\r') { if (source[p] === '\n') p++; }
      else if (c === undefined || /[1-9]/.test(c)) error();
      else text += Object.hasOwn(escapes,c) ? escapes[c] : c;
    }
    error();
  }
  function tokens(stopAtBrace = false) {
    const out = []; let depth = 0;
    while (p < source.length) {
      const c = String.fromCodePoint(source.codePointAt(p)), n = source[p+1];
      if (/\s/.test(c)) { p++; continue; }
      if (c === '/' && n === '/') { p += 2; while (p < source.length && !/[\n\r\u2028\u2029]/.test(source[p])) p++; continue; }
      if (c === '/' && n === '*') { const end = source.indexOf('*/',p+2); if (end < 0) error(); p = end+2; continue; }
      if (c === '"' || c === "'") { out.push({ kind:'string',value:quoted(c) }); continue; }
      if (c === '`') {
        p++; let text = '', interpolated = false, closed = false; const nested = [];
        while (p < source.length) {
          if (source[p] === '`') { p++; closed = true; break; }
          if (source[p] === '\\') { text += source[p++]; if (p >= source.length) error(); text += source[p++]; continue; }
          if (source[p] === '$' && source[p+1] === '{') { p += 2; interpolated = true; nested.push(...tokens(true)); continue; }
          text += source[p++];
        }
        if (!closed) error();
        // Unescaped no-substitution templates are literals. Escaped templates
        // are conservatively rejected as import operands, never decoded via eval.
        out.push({ kind:'template',value:text,interpolated,nested }); continue;
      }
      // Preserve lexical boundaries: spread is not three member dots, and a
      // keyword-shaped property/identifier is not an expression-start keyword.
      // A decimal's trailing dot belongs to the number, not member access:
      // 1. followed by ASI must not hide an import; 1..import has a real dot.
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(n || ''))) {
        number.lastIndex = p; const match = number.exec(source); if (!match) error();
        p = number.lastIndex;
        const next = p < source.length ? String.fromCodePoint(source.codePointAt(p)) : '';
        if (/[\p{ID_Continue}$\u200c\u200d]/u.test(next) || next === '\\') error();
        out.push({ kind:'number',value:match[0] }); continue;
      }
      if (source.startsWith('...',p)) { out.push({ kind:'punct',value:'...' }); p += 3; continue; }
      if (source.startsWith('?.',p) && !/[0-9]/.test(source[p+2] || '')) { out.push({ kind:'punct',value:'?.' }); p += 2; continue; }
      const previous = out.at(-1), property = out.at(-2)?.kind === 'punct' && ['.','?.','#'].includes(out.at(-2).value);
      if (c === '/' && (!previous || (previous.kind === 'punct' && (/^[=>(:,[!&|?;{}]$/.test(previous.value) || previous.value === '...')) || (previous.kind === 'word' && !property && ['return','throw','yield','case','void','typeof','delete'].includes(previous.value)))) {
        const start = p++; let cls = false, closed = false;
        while (p < source.length) {
          const r = source[p++]; if (r === '\\') { p++; continue; }
          if (r === '[') cls = true; if (r === ']') cls = false;
          if (r === '/' && !cls) { closed = true; break; } if (/[\r\n\u2028\u2029]/.test(r)) error();
        }
        if (!closed) error();
        // Slash after a closing block/object is lexically ambiguous without a
        // full JS parser. Do not let an apparent regex swallow a dependency.
        // Unambiguous regex literals may legitimately spell these keywords.
        if (out.at(-1)?.value === '}' && /\b(?:import|export|require)\b/u.test(source.slice(start,p))) error();
        while (/[A-Za-z]/.test(source[p] || '0')) p++;
        out.push({ kind:'regex',value:'' }); continue;
      }
      if (c === '\\') error();
      if (/[\p{ID_Continue}$\u200c\u200d]/u.test(c)) {
        const start = p; p += c.length;
        while (p < source.length) { const next = String.fromCodePoint(source.codePointAt(p)); if (!/[\p{ID_Continue}$\u200c\u200d]/u.test(next)) break; p += next.length; }
        out.push({ kind:'word',value:source.slice(start,p) }); continue;
      }
      p += c.length;
      if (c === '{') depth++;
      if (c === '}') { if (stopAtBrace && depth === 0) return out; depth--; }
      out.push({ kind:'punct',value:c });
    }
    if (stopAtBrace) error(); return out;
  }
  return tokens();
}
const roles = Object.freeze({
  'semanticGeneration.coreUrl':'scripts/lib/erp_knowledge_mcp_core.mjs',
  'semanticGeneration.profilesUrl':'scripts/lib/erp_knowledge_mcp_profiles.mjs',
  'g.workerUrl':'scripts/lib/semantic_worker_entry.mjs',
});
function validateImports(path,source,files) {
  function resolve(specifier) {
    if (!validUnicode(specifier)) error();
    if (isBuiltin(specifier)) return;
    if (!specifier.startsWith('./') && !specifier.startsWith('../')) error();
    if (/[\\\x00-\x1f\x7f%?#:]/.test(specifier)) error();
    const components = path.split('/').slice(0,-1);
    for (const part of specifier.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') { if (!components.length) error(); components.pop(); }
      else components.push(part);
    }
    const target = components.join('/');
    if (!isSafeRawPath(target) || !Object.hasOwn(files,target)) error();
  }
  function scan(ts,bootstrap = false) {
    for (let i=0;i<ts.length;i++) {
      const t = ts[i];
      if (t.kind === 'template') {
        scan(t.nested,bootstrap);
        // Only the exact existing named generation strings are executable
        // bootstrap roles. Other string/template contents are ordinary data.
        if (path === 'scripts/lib/semantic_worker_generation.mjs' && !t.interpolated && ts[i-1]?.value === '=' && ['LOADER','SEMANTIC_WORKER_BOOTSTRAP'].includes(ts[i-2]?.value)) scan(tokenize(t.value),ts[i-2].value === 'SEMANTIC_WORKER_BOOTSTRAP');
        continue;
      }
      if (t.kind !== 'word' || !['import','export','require'].includes(t.value) || (ts[i-1]?.kind === 'punct' && ['.','?.','#'].includes(ts[i-1].value))) continue;
      if (t.value === 'import' && ts[i+1]?.kind === 'punct' && ts[i+1].value === '.') continue; // import.meta
      if (ts[i+1]?.value === '(') {
        let j = i+2, nesting = 1;
        while (j < ts.length) { if (ts[j].value === '(') nesting++; if (ts[j].value === ')' && --nesting === 0) break; j++; }
        if (j >= ts.length) error(); const args = ts.slice(i+2,j);
        if (args.length === 1 && (args[0].kind === 'string' || args[0].kind === 'template' && !args[0].interpolated && !args[0].value.includes('\\'))) resolve(args[0].value);
        else {
          const expr = args.map(a => a.value).join('');
          const allowed = t.value === 'import' && ((path === 'scripts/erp_knowledge_mcp_http_bridge.mjs' && ['semanticGeneration.coreUrl','semanticGeneration.profilesUrl'].includes(expr)) || (path === 'scripts/lib/semantic_worker_generation.mjs' && bootstrap && expr === 'g.workerUrl'));
          if (!allowed || !Object.hasOwn(files,roles[expr])) error();
        }
        // Don't skip operands: nested variable imports must also be examined.
        continue;
      }
      if (t.value === 'require') continue;
      if (t.value === 'import' && ts[i+1]?.kind === 'string') { resolve(ts[i+1].value); continue; }
      if (t.value === 'export' && !['*','{'].includes(ts[i+1]?.value)) continue;
      // Import declaration or export-from; stop at ; or the declaration's }.
      let found = false;
      for (let j=i+1;j<ts.length && ts[j].value !== ';';j++) {
        if (ts[j].kind === 'word' && ts[j].value === 'from') { if (ts[j+1]?.kind !== 'string') error(); resolve(ts[j+1].value); found = true; break; }
        if (ts[j].value === '}' && t.value === 'export' && ts[j+1]?.value !== 'from') break;
      }
      if (t.value === 'import' && !found) error();
    }
  }
  scan(tokenize(source));
}
export function measureRawClosure(files,environment,kind) {
  if (!validateRawType('Environment',environment) || canonicalJson(environment) !== canonicalJson(rawEnvironment())) error('ENVIRONMENT_MISMATCH');
  if (!['compiler','runtime'].includes(kind) || !files || typeof files !== 'object' || Array.isArray(files) || !Object.keys(files).length || Reflect.ownKeys(files).length !== Object.keys(files).length) error();
  const decoded = Object.create(null), entries = []; let total = 0;
  for (const path of Object.keys(files).sort()) {
    const d = Object.getOwnPropertyDescriptor(files,path); if (!isSafeRawPath(path) || !d || !Object.hasOwn(d,'value')) error();
    const value = d.value;
    if (typeof value !== 'string' && !(value instanceof Uint8Array)) error();
    if (typeof value === 'string' && !validUnicode(value)) error();
    const bytes = Buffer.from(value);
    if (!bytes.length || bytes.length > RAW_LIMITS.max_code_bytes-total) error(); total += bytes.length;
    try { decoded[path] = new TextDecoder('utf-8',{ fatal:true,ignoreBOM:true }).decode(bytes); } catch { error(); }
    if (decoded[path].startsWith('\ufeff')) error();
    entries.push(Object.freeze({ path,bytes:bytes.length,sha256:sha256(bytes) }));
  }
  for (const path of Object.keys(decoded)) validateImports(path,decoded[path],decoded);
  const payload = kind === 'compiler' ? { files:entries,environment,abi:'owa-raw-compiler/1',lexer:'source-lexer-esj4gr-v1' } : { files:entries,environment };
  return Object.freeze({ files:Object.freeze(entries),sha256:hashRaw(kind + '-closure',payload) });
}

let currentCapture;
// Internal read-only trust anchor. No installation, ambient code reads, or
// caller-declared descriptors can be substituted for the controller's capture.
export function getRawCodeCapture() { return currentCapture; }
export function installRawCodeCapture(generation) {
  // Controller/bootstrap only. Pin bytes, not a caller-selected path, and never
  // register/evaluate supplied loader text or read files here. The old bootstrap
  // remains responsible for installing its pinned loader.
  if (!generation || typeof generation !== 'object' || !generation.sources || typeof generation.sources !== 'object') error();
  const sources = {}, files = {}, roleNames = { coreUrl:'erp_knowledge_mcp_core',profilesUrl:'erp_knowledge_mcp_profiles',workerUrl:'semantic_worker_entry' };
  let root;
  for (const [key,name] of Object.entries(roleNames)) {
    if (typeof generation[key] !== 'string') error();
    const suffix = 'scripts/lib/' + name + '.mjs', url = generation[key];
    if (!url.endsWith(suffix) || !Object.hasOwn(generation.sources,url)) error();
    const candidateRoot = url.slice(0,-suffix.length); if (root && root !== candidateRoot) error(); root = candidateRoot;
  }
  try { const u = new URL(root); if (u.protocol !== 'file:' || u.host || u.search || u.hash || !u.pathname.startsWith('/') || u.href !== root) error(); } catch { error(); }
  for (const url of Reflect.ownKeys(generation.sources)) {
    const d = Object.getOwnPropertyDescriptor(generation.sources,url);
    if (typeof url !== 'string' || !d.enumerable || !Object.hasOwn(d,'value') || typeof d.value !== 'string' || !url.startsWith(root)) error();
    const path = url.slice(root.length); if (!isSafeRawPath(path) || !path.endsWith('.mjs')) error();
    sources[url] = d.value; files[path] = d.value;
  }
  if (sha256(Buffer.from(JSON.stringify(sources))) !== generation.id) error();
  if (generation.loader !== undefined) {
    if (typeof generation.loader !== 'string' || !validUnicode(generation.loader)) error();
    const generationSource = files['scripts/lib/semantic_worker_generation.mjs'];
    if (!generationSource) error();
    const ts = tokenize(generationSource);
    const i = ts.findIndex((t,n) => t.kind === 'word' && t.value === 'LOADER' && ts[n-1]?.value === 'const' && ts[n+1]?.value === '=');
    const capturedLoader = ts[i+2];
    if (i < 0 || capturedLoader?.kind !== 'template' || capturedLoader.interpolated || capturedLoader.value !== generation.loader) error();
  }
  const closure = measureRawClosure(files,rawEnvironment(),'runtime');
  const captured = Object.freeze({ id:generation.id,sources:Object.freeze(sources),...(generation.loader === undefined ? {} : { loader:generation.loader }),coreUrl:generation.coreUrl,profilesUrl:generation.profilesUrl,workerUrl:generation.workerUrl,runtime_files:closure.files,runtime_code_sha256:closure.sha256,environment:rawEnvironment() });
  if (currentCapture) { if (canonicalJson(captured) !== canonicalJson(currentCapture)) error(); return currentCapture; }
  currentCapture = captured; return captured;
}
