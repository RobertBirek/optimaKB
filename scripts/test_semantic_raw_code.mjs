import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const api = await import('./lib/semantic_raw_code.mjs').catch(e => { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return {}; });
const requireApi = name => assert.equal(typeof api[name], 'function', name);
test('runtime/compiler closures measure sorted bytes, distinct hashes and exact environment', () => {
  requireApi('rawEnvironment'); requireApi('measureRawClosure');
  const env = api.rawEnvironment();
  assert.deepEqual(env, { node_version: process.version, unicode_version: process.versions.unicode, icu_version: process.versions.icu });
  const files = { 'scripts/b.mjs': 'export const b = "😀";', 'scripts/a.mjs': 'import {b} from "./b.mjs"; import "fs"; export {b};' };
  const r = api.measureRawClosure(files, env, 'runtime'), c = api.measureRawClosure(files, env, 'compiler');
  assert.deepEqual(r.files.map(f => f.path), ['scripts/a.mjs', 'scripts/b.mjs']);
  assert.equal(r.files[1].bytes, Buffer.byteLength(files['scripts/b.mjs']));
  assert.notEqual(r.sha256, c.sha256);
  assert.deepEqual(api.measureRawClosure(Object.fromEntries(Object.entries(files).reverse()), env, 'runtime'), r);
  assert.throws(() => api.measureRawClosure(files, { ...env, node_version: 'v0' }, 'runtime'), e => e.code === 'ENVIRONMENT_MISMATCH');
});
test('closure resolves static/export/literal dynamic imports and environment-bound builtin spellings', () => {
  requireApi('measureRawClosure');
  for (const source of ['import "node:fs"; import "fs"; import("node:crypto");', 'export {x} from "./b.mjs";', 'const x = await import( /* comment */ "./b.mjs");', 'import "./b\\u002emjs";', 'const text = "import(unknown)"; /* import("bad") */ import("./b.mjs");']) {
    assert.doesNotThrow(() => api.measureRawClosure({ 'scripts/a.mjs': source, 'scripts/b.mjs': 'export const x=1;' }, api.rawEnvironment(), 'runtime'));
  }
});
test('closure fails closed on unknown/unlisted imports, variable imports, traversal, invalid paths and byte ceiling', () => {
  requireApi('measureRawClosure');
  for (const source of ['import "unknown-package";', 'import "node:not_a_builtin";', 'import "./missing.mjs";', 'export * from "./missing.mjs";', 'import(name);', 'import(`./${name}.mjs`);', 'import("./" + name);', 'import("./b.mjs", options);', 'import("../../escape.mjs");', 'import("./b.mjs?query");', 'import("node:fs/promises/not");', 'const value = `${import(name)}`;']) {
    assert.throws(() => api.measureRawClosure({ 'scripts/a.mjs': source }, api.rawEnvironment(), 'runtime'), e => e.code === 'CODE_CLOSURE_INVALID', source);
  }
  for (const p of ['/absolute.mjs', '../bad.mjs', 'a//b.mjs', 'a/./b.mjs', 'a\\b.mjs', 'a/../b.mjs', 'a/%2e%2e/b.mjs']) assert.throws(() => api.measureRawClosure({ [p]: 'export {};' }, api.rawEnvironment(), 'runtime'));
  assert.throws(() => api.measureRawClosure({ 'a.mjs': ' '.repeat(2097153) }, api.rawEnvironment(), 'runtime'), e => e.code === 'CODE_CLOSURE_INVALID');
});
test('trusted old-generation bootstrap exception is role-specific and still requires captured target', () => {
  requireApi('measureRawClosure');
  const files = { 'scripts/erp_knowledge_mcp_http_bridge.mjs': 'await import(semanticGeneration.coreUrl); await import(semanticGeneration.profilesUrl);', 'scripts/lib/erp_knowledge_mcp_core.mjs': 'export {};', 'scripts/lib/erp_knowledge_mcp_profiles.mjs': 'export {};' };
  assert.doesNotThrow(() => api.measureRawClosure(files, api.rawEnvironment(), 'runtime'));
  assert.throws(() => api.measureRawClosure({ ...files, 'scripts/other.mjs': 'import(semanticGeneration.coreUrl);' }, api.rawEnvironment(), 'runtime'));
  delete files['scripts/lib/erp_knowledge_mcp_profiles.mjs'];
  assert.throws(() => api.measureRawClosure(files, api.rawEnvironment(), 'runtime'));
});
test('lexical ambiguity cannot hide unresolved imports in division, templates or executable generation strings', () => {
  requireApi('measureRawClosure');
  for (const source of ['const n = {} / 2; import(name); / 3;', 'const t = `${import(name)}`;', 'const r = /abc/; import(name);', 'const f = () => { return /abc/; }; import(name);']) {
    assert.throws(() => api.measureRawClosure({ 'a.mjs': source }, api.rawEnvironment(), 'runtime'), e => e.code === 'CODE_CLOSURE_INVALID', source);
  }
  assert.throws(() => api.measureRawClosure({ 'scripts/lib/semantic_worker_generation.mjs': 'export const SEMANTIC_WORKER_BOOTSTRAP = `import(g.workerUrl);`;' }, api.rawEnvironment(), 'runtime'));
  assert.doesNotThrow(() => api.measureRawClosure({ 'a.mjs': 'import "node:test";' }, api.rawEnvironment(), 'runtime'));
  assert.throws(() => api.measureRawClosure({ 'a.mjs': 'import "test";' }, api.rawEnvironment(), 'runtime'));
});
test('regular-expression text is not executable dependency code', () => {
  assert.doesNotThrow(() => api.measureRawClosure({ 'a.mjs':'const r = /import(name)/; const x = /export\\s+from/;' }, api.rawEnvironment(),'runtime'));
});
const hiddenImportCases = [
  ['line separator ends comment','// comment\u2028import("./missing.mjs");'],
  ['paragraph separator ends comment','// comment\u2029import("./missing.mjs");'],
  ...['\u2028','\u2029'].map((separator,n) => [
    `escaped Unicode line continuation ${n + 1} is not a path character`,
    'import("./miss\\' + separator + 'ing.mjs");',
    { ['miss' + separator + 'ing.mjs']:'export {};' },
  ]),
  ['object spread is not member access','const x = {...import("./missing.mjs")};'],
  ['array spread variable import','const x = [...import(name)];'],
  ...['.','?.','#'].map(marker => [
    `string ${marker} is not member punctuation`, `const x = "${marker}"\nimport(name);`,
  ]),
  ['dot specifier is not import.meta','import ".";'],
  ['string dot cannot hide export-from','const x = "."\nexport * from "./missing.mjs";'],
  ...['return','throw','yield','case','void','typeof','delete'].map(key => [
    `property ${key} precedes division`, `const x = ({${key}:1}).${key} / import(name) / 2;`,
  ]),
  ['optional property precedes division','const x = ({return:1})?.return / import(name) / 2;'],
  ['private property precedes division','class C { #return=1; f(){ return this.#return / import(name) / 2; } }'],
  ...['a\u0301return','a\u200creturn','\u{10400}return'].map(name => [
    `Unicode identifier ${name} precedes division`, `const ${name} = 1; const x = ${name} / import(name) / 2;`,
  ]),
];
for (const [name,source,extraFiles = {}] of hiddenImportCases) {
  test(`closure rejects hidden import: ${name}`, () => {
    for (const kind of ['runtime','compiler']) assert.throws(
      () => api.measureRawClosure({ 'a.mjs':source,...extraFiles },api.rawEnvironment(),kind),
      e => e.code === 'CODE_CLOSURE_INVALID',kind,
    );
  });
  test(`capture rejects hidden import: ${name}`, async () => {
    // An independent pin slot prevents an earlier erroneous acceptance from
    // making later negatives pass merely because replacement is forbidden.
    const fresh = await import('./lib/semantic_raw_code.mjs?task1-fix-hidden=' + encodeURIComponent(name));
    const root = 'file:///tmp/opencode/task1-rejected-code/';
    const sources = Object.fromEntries(['erp_knowledge_mcp_core','erp_knowledge_mcp_profiles','semantic_worker_entry'].map(n => [root + 'scripts/lib/' + n + '.mjs','export {};']));
    sources[root + 'a.mjs'] = source;
    for (const [path,text] of Object.entries(extraFiles)) sources[root + path] = text;
    const generation = { sources,id:createHash('sha256').update(JSON.stringify(sources)).digest('hex'),coreUrl:root + 'scripts/lib/erp_knowledge_mcp_core.mjs',profilesUrl:root + 'scripts/lib/erp_knowledge_mcp_profiles.mjs',workerUrl:root + 'scripts/lib/semantic_worker_entry.mjs' };
    assert.throws(() => fresh.installRawCodeCapture(generation),e => e.code === 'CODE_CLOSURE_INVALID');
  });
}
test('token boundaries retain regex data, member methods and inventoried spread imports', () => {
  for (const source of [
    '// import(name)\u2028const r = /import(name)/;',
    '// import(name)\u2029const r = /export\\s+from/;',
    'const r = () => /import(name)/; function f(){ return /import(name)/; }',
    'function f(){ const x = "."\nreturn /import(name)/; }',
    'obj.import(name); obj?.import(name); obj.require(name); obj?.require(name);',
    'const x = ({return:1}).return / 2; const y = obj?.throw / 2;',
    'class C { #return=1; f(){ return this.#return / 2; } }',
    'const x = {...import("node:fs")}; const y = [.../import(name)/];',
    'const x = {...import("./b.mjs")};',
    ...['\n','\r\n','\u2028','\u2029'].map(separator => 'import("node:f\\' + separator + 's");'),
  ]) assert.doesNotThrow(() => api.measureRawClosure({ 'a.mjs':source,'b.mjs':'export {};' },api.rawEnvironment(),'runtime'),source);
});
async function captureNumericFixture(source,key) {
  const fresh = await import('./lib/semantic_raw_code.mjs?task1-fix2-numeric=' + encodeURIComponent(key));
  const root = 'file:///tmp/opencode/task1-fix2-numeric/';
  const sources = Object.fromEntries(['erp_knowledge_mcp_core','erp_knowledge_mcp_profiles','semantic_worker_entry'].map(n => [root + 'scripts/lib/' + n + '.mjs','export {};']));
  sources[root + 'a.mjs'] = source;
  return fresh.installRawCodeCapture({ sources,id:createHash('sha256').update(JSON.stringify(sources)).digest('hex'),coreUrl:root + 'scripts/lib/erp_knowledge_mcp_core.mjs',profilesUrl:root + 'scripts/lib/erp_knowledge_mcp_profiles.mjs',workerUrl:root + 'scripts/lib/semantic_worker_entry.mjs' });
}
const numericAsiCases = [
  ['reviewed decimal trailing dot','const n = 1.\nimport("./missing.mjs");'],
  ['decimal trailing dot variable import','const n = 1.\nimport(name);'],
  ['zero trailing dot','const n = 0.\nimport("./missing.mjs");'],
  ['separator trailing dot','const n = 1_000.\nimport("./missing.mjs");'],
  ['trailing dot before export-from','const n = 1.\nexport * from "./missing.mjs";'],
];
for (const [name,source] of numericAsiCases) {
  for (const kind of ['runtime','compiler']) test(`numeric ASI rejects hidden import: ${name} (${kind})`, () => {
    assert.throws(() => api.measureRawClosure({ 'a.mjs':source },api.rawEnvironment(),kind),e => e.code === 'CODE_CLOSURE_INVALID');
  });
  test(`independent capture rejects numeric ASI: ${name}`, async () => {
    await assert.rejects(() => captureNumericFixture(source,name),e => e.code === 'CODE_CLOSURE_INVALID');
  });
}
const numericLiterals = ['0','42','0.','1.','1.25','.5','1e2','1e+2','1e-2','1.e2','1_000','1_000.','1_0.2_5e+1_0','0xA_B','0b1_0','0o7_0','1n','1_000n','0xA_Bn','0b1_0n','0o7_0n'];
for (const kind of ['runtime','compiler']) {
  test(`all numeric forms retain dependency checks after ASI and division (${kind})`, () => {
    for (const literal of numericLiterals) for (const tail of ['\nimport("./missing.mjs");',' / import(name) / 2;']) {
      const source = `const n = ${literal}${tail}`;
      assert.throws(() => api.measureRawClosure({ 'a.mjs':source },api.rawEnvironment(),kind),e => e.code === 'CODE_CLOSURE_INVALID',source);
    }
  });
  test(`numeric literals and actual numeric member access stay valid (${kind})`, () => {
    for (const literal of numericLiterals) {
      const source = `const n = ${literal};\nconst r = /import(name)/; import("node:fs");`;
      assert.doesNotThrow(() => api.measureRawClosure({ 'a.mjs':source },api.rawEnvironment(),kind),literal);
    }
    for (const source of numericMemberSources) assert.doesNotThrow(() => api.measureRawClosure({ 'a.mjs':source },api.rawEnvironment(),kind),source);
  });
  test(`malformed numeric boundaries fail closed (${kind})`, () => {
    for (const literal of ['0x','0x1g','0b2','0o8','1e+','1_','1__0','1_.','01','1.2n','.5n','1foo']) {
      assert.throws(() => api.measureRawClosure({ 'a.mjs':`const n = ${literal};` },api.rawEnvironment(),kind),e => e.code === 'CODE_CLOSURE_INVALID',literal);
    }
  });
}
const numericMemberSources = [
  'const x = 1..import("./not-a-module.mjs");',
  'const x = 1. .import(name);',
  'const x = 1_000..import(name);',
  ...['0x1','0b10','0o70','1e2','1.25','.5','1n','0xAn','1_000n'].map(literal => `const x = ${literal}.import(name);`),
];
test('independent captures retain numeric forms and real member calls', async () => {
  for (const [i,source] of [...numericLiterals.map(literal => `const n = ${literal}; import("node:fs");`),...numericMemberSources].entries()) {
    const capture = await captureNumericFixture(source,`positive-${i}`);
    assert.equal(capture.runtime_files.length,4);
  }
});
test('new primitives form a closed real-code inventory and captured old bootstrap roles stay bounded', () => {
  const files = Object.fromEntries(['semantic_raw_contract','semantic_raw_csv','semantic_raw_code'].map(n => ['scripts/lib/' + n + '.mjs',readFileSync(new URL('./lib/' + n + '.mjs',import.meta.url))]));
  assert.doesNotThrow(() => api.measureRawClosure(files,api.rawEnvironment(),'runtime'));
  const old = readFileSync(new URL('./lib/semantic_worker_generation.mjs',import.meta.url),'utf8');
  assert.doesNotThrow(() => api.measureRawClosure({ 'scripts/lib/semantic_worker_generation.mjs':old,'scripts/lib/semantic_worker_entry.mjs':'export {};' },api.rawEnvironment(),'runtime'));
});
test('trusted code capture pins immutable one-generation code-only sources and rejects replacement/mismatched roles', () => {
  requireApi('installRawCodeCapture');
  const root = 'file:///tmp/opencode/task1-captured-code/';
  const sources = Object.fromEntries(['erp_knowledge_mcp_core', 'erp_knowledge_mcp_profiles', 'semantic_worker_entry'].map(n => [root + 'scripts/lib/' + n + '.mjs', 'export const marker = "pinned";']));
  const generationSource = readFileSync(new URL('./lib/semantic_worker_generation.mjs',import.meta.url),'utf8');
  sources[root + 'scripts/lib/semantic_worker_generation.mjs'] = generationSource;
  const start = generationSource.indexOf('const LOADER = `') + 'const LOADER = `'.length;
  const loader = generationSource.slice(start,generationSource.indexOf('`;',start));
  const id = createHash('sha256').update(JSON.stringify(sources)).digest('hex');
  const generation = { id, sources, loader, coreUrl: root + 'scripts/lib/erp_knowledge_mcp_core.mjs', profilesUrl: root + 'scripts/lib/erp_knowledge_mcp_profiles.mjs', workerUrl: root + 'scripts/lib/semantic_worker_entry.mjs' };
  assert.throws(() => api.installRawCodeCapture({ ...generation, workerUrl: root + 'missing.mjs' }));
  assert.throws(() => api.installRawCodeCapture({ ...generation, loader:'import("unknown-package");' }), 'loader bytes cannot live outside the measured generation-file inventory');
  const captured = api.installRawCodeCapture(generation);
  assert.equal(captured.id, id); assert(Object.isFrozen(captured)); assert(Object.isFrozen(captured.sources));
  sources[generation.coreUrl] = 'changed';
  assert.equal(captured.sources[generation.coreUrl], 'export const marker = "pinned";');
  assert.equal(api.installRawCodeCapture({ ...generation, sources: { ...captured.sources } }), captured);
  assert.throws(() => api.installRawCodeCapture({ ...generation, id: 'a'.repeat(64) }));
  const changed = { ...captured.sources,[generation.coreUrl]:'export const marker="replacement";' };
  const changedId = createHash('sha256').update(JSON.stringify(changed)).digest('hex');
  assert.throws(() => api.installRawCodeCapture({ ...generation,id:changedId,sources:changed }), 'a valid second generation cannot replace the first');
});
