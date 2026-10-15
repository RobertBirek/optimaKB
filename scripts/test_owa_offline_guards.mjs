#!/usr/bin/env node
// Synthetic targets only. Setup/cleanup and CLI subprocesses precede runtime guards.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { prepareFixtures } from './prepare_owa_answer_quality_fixtures.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let api = {};
try { api = await import('./lib/owa_offline_harness.mjs'); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; }
test('offline harness API exists before dispatch', () => {
  assert.equal(typeof api.validateBundle, 'function', 'missing manifest preflight');
  assert.equal(typeof api.installRuntimeGuard, 'function', 'missing runtime guard');
});
test('runner refuses missing explicit bundle before dispatch', () => {
  const result = cp.spawnSync(process.execPath, [path.join(repo, 'scripts/test_owa_answer_quality_12q.mjs')], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /explicit --bundle/);
});
test('malformed manifest refuses before dispatch', () => {
  assert.equal(typeof api.validateBundle, 'function');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'owa-guard-'));
  try {
    fs.writeFileSync(path.join(root, 'manifest.json'), '{"schemaVersion":1,"files":[]}');
    assert.throws(() => api.validateBundle(root), /manifest|baseline|inventory/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
  // A lookalike sibling must be rejected lexically, before any filesystem probe.
  const realpath = fs.realpathSync;
  fs.realpathSync = () => { throw new Error('Unexpected outside metadata probe'); };
  try {
    assert.throws(() => prepareFixtures({ corpusRoot: '/tmp/opencode', codeRoot: '/tmp/opencode', outputParent: '/tmp/opencode-sibling' }), /Private output parent required/);
  } finally { fs.realpathSync = realpath; }
});
test('dependency closure refuses unbound modules, packages and network imports', () => {
  assert.equal(typeof api.validateClosure, 'function');
  for (const source of ["import './missing.mjs';", "import 'surprise-package';", "import 'https://example.invalid/x.mjs';"])
    assert.throws(() => api.validateClosure({ 'scripts/main.mjs': source }), /closure|dependency/);
  assert.doesNotThrow(() => api.validateClosure({ 'scripts/main.mjs': "import fs from 'node:fs';" }));
});
test('loader refuses computed outside-file/data/package imports before execution', () => {
  const script = `
    import assert from 'node:assert/strict';
    import { registerFrozenModules } from ${JSON.stringify(new URL('./lib/owa_offline_harness.mjs', import.meta.url).href)};
    const root = '/tmp/opencode/synthetic-closed-modules';
    registerFrozenModules({ root, modules: { 'scripts/probe.mjs': 'export const marker = 17;' } });
    assert.equal((await import('file://' + root + '/scripts/probe.mjs')).marker, 17);
    for (const specifier of ['file:///etc/passwd', 'data:text/javascript,throw 99', 'surprise-package', 'node:worker_threads', 'node:module']) {
      await assert.rejects(import(specifier), /Offline module closure/);
    }
    console.log('closed-loader-pass');`;
  const result = cp.spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /closed-loader-pass/);
});
test('manifest refuses traversal, duplicates, symlinks, fingerprint drift and changed gold', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'owa-manifest-'));
  const all = [...api.STATIC_FILES, ...api.MODULE_FILES];
  const make = () => ({ schemaVersion: 1, files: all.map(relative => ({ path: relative, bytes: 0, sha256: api.sha256(''), sourcePath: '/synthetic/' + relative })) });
  const manifestPath = path.join(root, 'manifest.json');
  try {
    for (const relative of all) { fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true }); fs.writeFileSync(path.join(root, relative), ''); }
    for (const mutate of [m => { m.files[0].path = '../outside'; }, m => { m.files[1].path = m.files[0].path; },
      m => { m.files[0].sha256 = '0'.repeat(64); }, m => m]) {
      const m = make(); mutate(m); fs.writeFileSync(manifestPath, JSON.stringify(m));
      assert.throws(() => api.validateBundle(root), /manifest|baseline/);
    }
    fs.unlinkSync(path.join(root, api.BASELINE)); fs.symlinkSync('/etc/passwd', path.join(root, api.BASELINE));
    fs.writeFileSync(manifestPath, JSON.stringify(make()));
    assert.throws(() => api.validateBundle(root), /Symlink/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
test('response gate checks real visible extraction budgets and Markdown/JSON parity', () => {
  assert.equal(typeof api.inspectResponse, 'function');
  const body = 'Fragmenty treści źródeł:\n\n[S1] fixture.csv, linie 2–2:\nFull conditional unit.\n\nCytowane źródła (daty):\n';
  const response = markdown => ({ result: { content: [{ type: 'text', text: markdown }], structuredContent: {
    answer: markdown, retrieval: { backend: 'local_artifacts', graphUsed: false }, sources: [{ namespace: 'OWAOntology' }],
  } } });
  assert.equal(api.inspectResponse(response(body)).extractCharacters, 'Full conditional unit.'.length);
  const multiline = body.replace('Full conditional unit.', '## Heading\n\nFull conditional unit.');
  assert.equal(api.inspectResponse(response(multiline)).extractCharacters, '## Heading\n\nFull conditional unit.'.length);
  assert.throws(() => api.inspectResponse(response(body.replace('Full conditional unit.', '## Heading\n\n' + 'x'.repeat(4001)))), /budget/);
  assert.throws(() => api.inspectResponse(response(body.replace('Full conditional unit.', 'x'.repeat(4001)))), /budget/);
  assert.throws(() => api.inspectResponse(response(body.replace('Full conditional unit.', Array.from({ length: 4 }, (_, i) => `[S1] fixture.csv, linie ${i + 2}–${i + 2}:\nunit`).join('\n\n')))), /section/);
  const mismatch = response(body); mismatch.result.structuredContent.answer = 'different';
  assert.throws(() => api.inspectResponse(mismatch), /parity/);
});
test('runtime blocks sync/async reads, descriptors, metadata, writes, network and processes', async () => {
  assert.equal(typeof api.installRuntimeGuard, 'function');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'owa-guard-'));
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'owa-output-'));
  const inside = path.join(root, 'fixture.txt');
  fs.writeFileSync(inside, 'frozen');
  fs.symlinkSync('/etc/passwd', path.join(root, 'escape'));
  const guard = api.installRuntimeGuard({ root, output, files: new Map([[inside, Buffer.from('frozen')]]), directories: new Set([root]) });
  try {
    assert.equal(fs.readFileSync(inside, 'utf8'), 'frozen');
    assert.equal((await fs.promises.readFile(inside)).toString(), 'frozen');
    for (const target of ['/etc/passwd', path.join(root, 'escape'), path.join(root, 'unbound'), 0]) {
      assert.throws(() => fs.readFileSync(target), /Offline guard/);
      await assert.rejects(async () => fs.promises.readFile(target), /Offline guard/);
    }
    for (const action of [() => fs.statSync('/etc/passwd'), () => fs.openSync(inside, 'r'),
      () => fs.createReadStream(inside), () => fs.writeFileSync(inside, 'changed'),
      () => fs.mkdirSync(path.join(root, 'logs')), () => fs.writeFileSync(path.join(output, '../escape'), 'x'),
      () => fs.symlinkSync('/etc/passwd', path.join(output, 'link')),
      () => http.get('http://127.0.0.1'), () => https.request('https://example.invalid'),
      () => net.connect(1), () => tls.connect(1), () => cp.spawn('true'), () => process.dlopen({}, '/tmp/no')])
      assert.throws(action, /Offline guard/);
    await assert.rejects(async () => fetch('https://example.invalid'), /Offline guard/);
    await assert.rejects(async () => fs.promises.open(inside, 'r'), /Offline guard/);
    assert.throws(() => fs.writeFileSync(path.join(output, 'handler-write'), 'x'), /Offline guard/,
      'handler cannot write even into reporter output');
    guard.writeOutput('result.json', '{}');
    assert.throws(() => guard.writeOutput('../escape', 'x'), /Offline guard/);
    assert(guard.violations.length >= 20);
  } finally { guard.restore(); fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(output, { recursive: true, force: true }); }
});
