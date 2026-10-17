#!/usr/bin/env node
// Synthetic guard probes only. No provider, production reads or corpus replay.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { BASELINE, STATIC_FILES, MODULE_FILES, sha256, installRuntimeGuard } from './lib/owa_offline_harness.mjs';
import { renderCompactOwaAnswer } from './lib/owa_answer_presentation.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
let api = {};
try { api = await import('./lib/semantic_regression_harness.mjs'); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; }
test('explicit bank-bound 32Q harness exists', () => {
  for (const name of ['validateSemanticBundle', 'semanticCases', 'assertSemanticRequest', 'namedReporter', 'assertCleanRuntime', 'inspectSemanticResponse'])
    assert.equal(typeof api[name], 'function', `Missing ${name}`);
});
test('runner rejects absent bundle and unknown output layout before dispatch', () => {
  for (const args of [[], ['--bundle', '/tmp/opencode/missing', '--output-parent', '/tmp/opencode', '--layout', 'anything']]) {
    const r = cp.spawnSync(process.execPath, [path.join(repo, 'scripts/test_semantic_regression_32q.mjs'), ...args], { encoding: 'utf8', env: { PATH: process.env.PATH } });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /explicit --bundle|Unknown argument/);
  }
});
test('banks bind entire original bytes; requests cannot swap tool/query/date/limit or inject intent', () => {
  assert.equal(typeof api.semanticCases, 'function', 'Missing semanticCases');
  const twelve = fs.readFileSync(path.join(repo, BASELINE));
  const twenty = fs.readFileSync(path.join(repo, '.superpowers/sdd/baseline32-zteRrT/holdout20-input.json'));
  const cases = api.semanticCases(twelve, twenty);
  assert.equal(cases.length, 32);
  for (const [a, b] of [[Buffer.concat([twelve, Buffer.from(' ')]), twenty], [twelve, Buffer.concat([twenty, Buffer.from(' ')])]])
    assert.throws(() => api.semanticCases(a, b), /bank.*hash/i);
  for (const q of cases) {
    const request = api.semanticRequest(q);
    assert.doesNotThrow(() => api.assertSemanticRequest(request, cases));
    for (const mutate of [r => { r.params.name = 'erp_entity.get.invalid'; }, r => { r.params.arguments.query += ' '; },
      r => { r.params.arguments.as_of = '2026-10-14'; }, r => { r.params.arguments.limit = 6; },
      r => { r.params.arguments.semanticIntent = 'process'; }]) {
      const copy = structuredClone(request); mutate(copy);
      assert.throws(() => api.assertSemanticRequest(copy, cases), /request binding/);
    }
  }
});
test('strict 32Q inventory rejects drift, traversal, unknown module, symlink and unmanifested artifact', () => {
  assert.equal(typeof api.validateSemanticBundle, 'function', 'Missing bundle validator');
  const root = fs.mkdtempSync('/tmp/opencode/semantic-guards-');
  try {
    const files = [...STATIC_FILES, api.HOLDOUT20, ...api.REFERENCE_FILES, ...MODULE_FILES];
    const manifest = { schemaVersion: 1, kind: 'semantic-regression-32q', files: [] };
    for (const relative of files) {
      const bytes = relative === BASELINE ? fs.readFileSync(path.join(repo, BASELINE))
        : relative === api.HOLDOUT20 ? fs.readFileSync(path.join(repo, '.superpowers/sdd/baseline32-zteRrT/holdout20-input.json')) : Buffer.from('');
      fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
      fs.writeFileSync(path.join(root, relative), bytes);
      manifest.files.push({ path: relative, sourcePath: '/synthetic/' + relative, bytes: bytes.length, sha256: sha256(bytes) });
    }
    const write = m => fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(m));
    write(manifest);
    const checked = api.validateSemanticBundle(root);
    assert.equal(checked.cases.length, 32);
    for (const relative of [BASELINE, api.HOLDOUT20, ...api.REFERENCE_FILES]) assert(!checked.files.has(path.join(root, relative)), 'reviewer-only data must not be domain-readable');
    const goldPath = path.join(root, BASELINE), goldBytes = fs.readFileSync(goldPath);
    fs.appendFileSync(goldPath, ' ');
    const alteredGold = structuredClone(manifest);
    alteredGold.files[0].bytes++; alteredGold.files[0].sha256 = sha256(fs.readFileSync(goldPath)); write(alteredGold);
    assert.throws(() => api.validateSemanticBundle(root), /bank hash/);
    fs.writeFileSync(goldPath, goldBytes); write(manifest);
    const moduleFile = MODULE_FILES[0], moduleBytes = Buffer.from("import './unbound.mjs';");
    fs.writeFileSync(path.join(root, moduleFile), moduleBytes);
    const unknownModule = structuredClone(manifest), moduleEntry = unknownModule.files.find(f => f.path === moduleFile);
    moduleEntry.bytes = moduleBytes.length; moduleEntry.sha256 = sha256(moduleBytes); write(unknownModule);
    assert.throws(() => api.validateSemanticBundle(root), /module dependency closure/);
    fs.writeFileSync(path.join(root, moduleFile), ''); write(manifest);
    for (const mutate of [m => { m.files[0].path = '../escape'; }, m => { m.files.push({ ...m.files[0], path: 'scripts/unknown.mjs' }); },
      m => { m.files[0].sha256 = '0'.repeat(64); }, m => { m.files[1].path = m.files[0].path; }]) {
      const m = structuredClone(manifest); mutate(m); write(m);
      assert.throws(() => api.validateSemanticBundle(root), /inventory|fingerprint|manifest/);
    }
    write(manifest);
    fs.writeFileSync(path.join(root, 'unmanifested'), 'x');
    assert.throws(() => api.validateSemanticBundle(root), /inventory/);
    fs.unlinkSync(path.join(root, 'unmanifested'));
    const target = path.join(root, STATIC_FILES[1]); fs.unlinkSync(target); fs.symlinkSync('/no-read', target);
    assert.throws(() => api.validateSemanticBundle(root), /Symlink/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
test('swallowed domain reads/writes/network/process attempts fail final gate; reporter outputs unreadable', async () => {
  assert.equal(typeof api.assertCleanRuntime, 'function', 'Missing runtime assertion');
  const root = fs.mkdtempSync('/tmp/opencode/semantic-virtual-'), output = fs.mkdtempSync('/tmp/opencode/semantic-report-');
  const guard = installRuntimeGuard({ root, output, files: new Map(), directories: new Set([root]) });
  try {
    const reporter = api.namedReporter(guard, ['Q01.md']);
    reporter('Q01.md', 'complete');
    assert.throws(() => reporter('unbound.md', 'x'), /named output/);
    assert.throws(() => reporter('../Q01.md', 'x'), /named output/);
    for (const attempt of [() => fs.readFileSync(path.join(output, 'Q01.md')), () => fs.writeFileSync(path.join(output, 'Q01.md'), 'x'),
      () => cp.spawn('true'), () => fetch('https://example.invalid')]) {
      try { await attempt(); } catch {}
    }
    assert.throws(() => api.assertCleanRuntime(guard), /swallowed|guard violation/);
    assert.equal(guard.violations.length, 4);
  } finally { guard.restore(); fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(output, { recursive: true, force: true }); }
});
test('independent source parser accepts canonical single-line locators and rejects wrong identity/version/namespace', () => {
  assert.equal(typeof api.inspectSemanticResponse, 'function');
  const root = '/tmp/opencode/synthetic-audit', artifact = 'exports/owa_ontology/v1/ontology_entity.csv';
  const bytes = Buffer.from('id,description\nowner:elm,"Whole source fact."\n');
  const source = { key: 'source-elm', kind: 'local_artifact', namespace: 'OWAOntology', artifact,
    recordId: 'owner:elm', locator: 'L2', contentHash: 'sha256:' + sha256(bytes), title: 'Elm',
    ...Object.fromEntries(['publication', 'update', 'retrieved'].map(k => [k, { value: null }])) };
  const body = { sources: [source], extracts: [{ sourceKey: source.key, artifact, recordId: source.recordId, line: 2, endLine: 2, text: 'Whole source fact.' }],
    evidence: [], omissions: [], retrieval: { backend: 'local_artifacts', graphUsed: false } };
  body.answer = renderCompactOwaAnswer(body);
  const response = { result: { content: [{ type: 'text', text: body.answer }], structuredContent: body } };
  const bundle = { root, files: new Map([[path.join(root, artifact), bytes]]) };
  assert.equal(api.inspectSemanticResponse(response, bundle).actualSources.length, 1);
  for (const patch of [{ recordId: 'other' }, { contentHash: 'sha256:' + '0'.repeat(64) }, { namespace: 'ComarchOptimaBusinessSemantics' }]) {
    const r = structuredClone(response); Object.assign(r.result.structuredContent.sources[0], patch);
    r.result.structuredContent.answer = renderCompactOwaAnswer(r.result.structuredContent); r.result.content[0].text = r.result.structuredContent.answer;
    assert.throws(() => api.inspectSemanticResponse(r, bundle), /Source .*mismatch/);
  }
});
test('domain legacy envelope retains exact presentation audit despite omitted routing scaffolding fields', () => {
  const answer = 'Pytanie: Synthetic ordinary concept\n\nGłówna KB: ComarchOptimaBusinessSemantics\n\n'
    + 'Routing zadziałał, ale w wybranych artefaktach startowych nie znaleziono mocnych lokalnych trafień tekstowych.\n'
    + 'Źródło: lokalne artefakty KB; bez wykonania grafu KAG/OpenSPG.\n'
    + 'Confidence oznacza punktację wyszukiwania, nie prawdopodobieństwo poprawności.\n'
    + 'Brak wystarczających lokalnych dowodów dla pytania. Nie traktuj fragmentów jako potwierdzonej procedury.\n\n'
    + 'Polecane artefakty:\n- docs/reference/ComarchOptimaBusinessSemantics.schema';
  const body = { answer, retrieval: { backend: 'local_artifacts', graphUsed: false },
    evidenceAssessment: { status: 'insufficient_evidence' }, sources: [], extracts: [], omissions: [], evidence: [] };
  const r = { result: { structuredContent: body, content: [{ type: 'text', text: answer }] } };
  assert.equal(api.inspectSemanticResponse(r, { root: '/tmp/opencode/empty', files: new Map() }).sources, 0);
  const changed = structuredClone(r); changed.result.content[0].text += '\nUnbound claim'; changed.result.structuredContent.answer += '\nUnbound claim';
  assert.throws(() => api.inspectSemanticResponse(changed, { root: '/tmp/opencode/empty', files: new Map() }), /Unbound|legacy/);
  const scoped = structuredClone(r);
  const scope = 'Zakres odpowiedzi:\n- W tej odpowiedzi nie pokazano lokalnych dowodów dla żądanego zakresu. Nie przesądza to o zawartości całej bazy.\n\n';
  scoped.result.structuredContent.answer = answer.replace('Polecane artefakty:', scope + 'Polecane artefakty:');
  scoped.result.content[0].text = scoped.result.structuredContent.answer;
  assert.equal(api.inspectSemanticResponse(scoped, { root: '/tmp/opencode/empty', files: new Map() }).sources, 0);
  const injection = structuredClone(scoped);
  injection.result.structuredContent.answer = injection.result.structuredContent.answer.replace('W tej odpowiedzi nie pokazano lokalnych dowodów dla żądanego zakresu. Nie przesądza to o zawartości całej bazy.', 'W tej odpowiedzi potwierdzono wykonanie operacji.');
  injection.result.content[0].text = injection.result.structuredContent.answer;
  assert.throws(() => api.inspectSemanticResponse(injection, { root: '/tmp/opencode/empty', files: new Map() }), /legacy scope/);
});
