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
import { fileURLToPath, pathToFileURL } from 'node:url';
import { prepareFixtures } from './prepare_owa_answer_quality_fixtures.mjs';
import { renderCompactOwaAnswer } from './lib/owa_answer_presentation.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let api = {};
try { api = await import('./lib/owa_offline_harness.mjs'); } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; }

// Read-only sealed code/captures during setup; no corpus replay or mocked renderer.
const archive = '/tmp/opencode/owa-compact-task1-baseline-JxUymw';
const sealBytes = fs.readFileSync(path.join(archive, 'seal.json'));
assert.equal(api.sha256(sealBytes), 'd05bc12228b776587afe9c7b92953b80802ad7d573454f9729b90962a4e6213c');
const sealedEntries = JSON.parse(sealBytes).files;
function readSealed(relative) {
  const entry = sealedEntries.find(e => e.path === relative), bytes = fs.readFileSync(path.join(archive, relative));
  assert(entry, 'unbound sealed fixture: ' + relative);
  assert.equal(bytes.length, entry.bytes);
  assert.equal(api.sha256(bytes), entry.sha256);
  return bytes;
}
const sealedResponses = Array.from({ length: 12 }, (_, i) => {
  const id = `Q${String(i + 1).padStart(2, '0')}`;
  const response = JSON.parse(readSealed(`old-format/${id}.json`));
  const markdown = readSealed(`old-format/${id}.md`).toString('utf8');
  assert.equal(markdown, response.result.structuredContent.answer);
  return { id, response };
});
const legacyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'owa-legacy-renderer-'));
const oldRoot = process.env.ROOT;
process.env.ROOT = legacyRoot;
api.registerFrozenModules({ root: legacyRoot, modules: Object.fromEntries(api.MODULE_FILES
  .filter(file => sealedEntries.some(entry => entry.path === 'bundle/' + file)).map(file => [file, readSealed('bundle/' + file).toString('utf8')])) });
const importGuard = api.installRuntimeGuard({ root: legacyRoot, output: legacyRoot, files: new Map(), directories: new Set([legacyRoot]) });
let renderLegacyAnswer;
try {
  ({ renderAnswerMarkdown: renderLegacyAnswer } = await import(pathToFileURL(path.join(legacyRoot, 'scripts/erp_knowledge_answer.mjs')).href));
  assert.deepEqual(importGuard.violations, []);
} finally {
  importGuard.restore();
  if (oldRoot === undefined) delete process.env.ROOT; else process.env.ROOT = oldRoot;
  fs.rmSync(legacyRoot, { recursive: true, force: true });
}
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
  const captured = presented([unit('Full conditional unit.')], { layout: 'legacy' });
  delete captured.result.structuredContent.extracts;
  delete captured.result.structuredContent.omissions;
  const body = captured.result.structuredContent.answer;
  const response = markdown => edit(JSON.parse(JSON.stringify(captured)), () => markdown);
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

// Complete synthetic public answers rendered by the actual sealed legacy renderer
// and current compact formatter. The audit imports neither renderer.
// Mutations always keep RPC text/answer parity, so the content gate must catch them.
const source = (key = 'version-a') => ({ key, namespace: 'OWAOntology', title: 'Same title',
  artifact: 'fixture.csv', recordId: 'row', recordIds: ['row'], locator: 'L2-L9', kind: 'local_artifact',
  contentHash: 'sha256:' + 'a'.repeat(64),
  ...Object.fromEntries(['publication', 'update', 'retrieved'].map(field => [field,
    { value: null, reason: 'source_date_unavailable', basis: 'fixture' }])) });
const unit = (text, sourceKey = 'version-a') => ({ sourceKey, text, artifact: 'fixture.csv', line: 2, endLine: 9, recordId: 'row' });
function presented(extracts, { layout = 'compact', sources = [source()], ...extra } = {}) {
  const body = { question: 'OWA synthetic conditional evidence', primaryKb: 'OWAOntology', supportKbs: [],
    retrieval: { backend: 'local_artifacts', graphUsed: false }, owaCoverage: { status: 'covered' },
    evidenceAssessment: { status: 'unverified_evidence', missingTerms: [], reasons: ['text_matches_do_not_verify_claims'] },
    sources, extracts, omissions: [], evidence: [], externalEvidence: [], recommendedArtifacts: [], ...extra };
  body.note = body.evidence.length ? 'To jest wstępna odpowiedź z lokalnych artefaktów KB.'
    : 'Routing zadziałał, ale w wybranych artefaktach startowych nie znaleziono mocnych lokalnych trafień tekstowych.';
  body.answer = layout === 'compact' ? renderCompactOwaAnswer(body) : renderLegacyAnswer(body);
  return { result: { content: [{ type: 'text', text: body.answer }], structuredContent: JSON.parse(JSON.stringify(body)) } };
}
function edit(response, transform) {
  response.result.structuredContent.answer = transform(response.result.structuredContent.answer);
  response.result.content[0].text = response.result.structuredContent.answer;
  return response;
}
test('grouped auxiliary audit binds item/version and original hit indices with exact excerpt dedup only', () => {
  const text = 'UNKNOWN: only after approval.\r\nNever otherwise.  ';
  const options = { evidence: [{ kb: 'OWAOntology', artifact: 'same.csv', locator: 'L3', excerpt: text,
    hits: [{ line: 3, recordId: 'version-A', snippet: text }] },
  { kb: 'OWAOntology', artifact: 'same.csv', locator: 'L3', excerpt: text + ' ',
    hits: [{ line: 3, recordId: 'version-B', snippet: text }] }] };
  const good = presented([unit('Full selected extract.')], options);
  assert.equal(api.inspectResponse(good).units.length, 1);
  for (const mutate of [
    md => md.replace('[A2]', '[A1]'), md => md.replace('[H1] L3', '[H2] L3'),
    md => md.replace('Never otherwise.  ', ''), md => md.replace('- [E] L3:\n' + text + ' ', ''),
    md => md + '\n\n[A3] injected facts',
  ]) assert.throws(() => api.inspectResponse(edit(structuredClone(good), mutate)), /body|framing|unbound/);
});
test('compact scoped notices replace only exact duplicate limitation metadata and bind every surviving condition', () => {
  const note = 'Źródło (metrics.csv, ROW_A) oznacza zakres „Rate_Flag” jako UNKNOWN / do potwierdzenia; pokazany fragment nie potwierdza kompletnej wiedzy w tym zakresie.';
  const options = { answerNotes: [note], owaCoverage: { status: 'unknown', notices: [note], missingFacets: ['fields'],
    requirements: [{ facet: 'fields', covered: false }, { ownerId: 'Other.Owner', fieldName: 'Missing_Field', facet: 'fields', covered: false }],
    limitations: [{ type: 'unknown', artifact: 'metrics.csv', recordId: 'ROW_A', fieldNames: ['Rate_Flag'] }] },
  evidenceAssessment: { status: 'insufficient_evidence', reasons: ['invalid_csv'], missingTerms: ['Required_Field'] }, freshnessNote: 'Source freshness is unverified.' };
  const good = presented([unit('Exact conditional source.')], options);
  assert.equal(api.inspectResponse(good).units.length, 1);
  for (const condition of [note, 'Other.Owner / Missing_Field / fields', 'Brak pokrycia: fields.', 'Required_Field', 'CSV ma nieprawidłowy format', options.freshnessNote])
    assert.throws(() => api.inspectResponse(edit(structuredClone(good), md => md.replace(condition, ''))), /body|framing|unbound/);
});
test('compact limitation fallback cannot be satisfied by the echoed query or auxiliary/citation metadata', () => {
  const response = presented([unit('Original fact.')], { question: 'UNKNOWN: metrics.csv, ROW_A, Rate_Flag.',
    owaCoverage: { status: 'unknown', limitations: [{ type: 'unknown', artifact: 'metrics.csv', recordId: 'ROW_A', fieldNames: ['Rate_Flag'] }] } });
  assert.equal(api.inspectResponse(response).units.length, 1);
  assert.throws(() => api.inspectResponse(edit(response, md => md.replace('UNKNOWN: metrics.csv, ROW_A, Rate_Flag.\n\n', ''))), /body|framing|unbound/);
});
for (const layout of ['compact', 'legacy']) {
  test(`${layout} audit counts intact multiline table and exact trailing whitespace`, () => {
    const text = '  ## Fields\r\n| Key | Condition |\r\n|---|---|\r\n| A | not confirmed |\r\n\r\nOnly after approval.  \r\n';
    const result = api.inspectResponse(presented([unit(text)], { layout }));
    assert.equal(result.extractCharacters, text.length);
    assert.equal(result.units.length, 1);
    assert.equal(result.units[0].text, text);
    assert.equal(result.units[0].sourceKey, 'version-a');
  });
  test(`${layout} audit enforces actual 4000/4001 body characters including multiline end`, () => {
    for (const size of [4000, 4001]) {
      const text = '## Table\n\n' + 'ą'.repeat(size - 10);
      const response = presented([unit(text)], { layout });
      if (size === 4000) assert.equal(api.inspectResponse(response).extractCharacters, size);
      else assert.throws(() => api.inspectResponse(response), /budget/);
    }
  });
  test(`${layout} audit detects a lost final qualifier and either direction of array drift`, () => {
    const text = '## Rule\nAllowed.\n\nOnly if linked; never otherwise.';
    assert.throws(() => api.inspectResponse(edit(presented([unit(text)], { layout }), md => md.replace('Only if linked; never otherwise.', ''))), /unit|extract|body|framing/);
    const extraJson = presented([unit(text)], { layout });
    extraJson.result.structuredContent.extracts.push(unit('Not emitted.'));
    assert.throws(() => api.inspectResponse(extraJson), /unit|extract|body|framing/);
    const missingJson = presented([unit(text)], { layout });
    missingJson.result.structuredContent.extracts = [];
    assert.throws(() => api.inspectResponse(missingJson), /unit|extract|body|framing/);
  });
  test(`${layout} audit rejects unbound extra units and plain text across the entire envelope`, () => {
    for (const extra of ['\n\n[S1] fixture.csv, linie 2–9:\nUnbound condition.', '\n\nUnbound condition.']) {
      for (const where of ['before', 'inside', 'after']) {
        const response = presented([unit('Known condition.')], { layout });
        edit(response, md => where === 'before' ? extra + '\n\n' + md : where === 'after' ? md + extra
          : md.replace('Known condition.', 'Known condition.' + extra));
        assert.throws(() => api.inspectResponse(response), /unit|extract|body|layout|framing|unbound/);
      }
    }
  });
  test(`${layout} audit never invents source identity or merges same-title versions`, () => {
    const good = presented([unit('Identical.'), unit('Identical.', 'version-b')], { layout, sources: [source(), source('version-b')] });
    assert.deepEqual(api.inspectResponse(good).units.map(u => u.sourceKey), ['version-a', 'version-b']);
    assert.throws(() => api.inspectResponse(edit(good, md => md.replace('[S2] fixture.csv', '[S1] fixture.csv'))), /source|identity|unit/);
    for (const mutate of [body => { delete body.extracts[0].sourceKey; }, body => { delete body.sources[0].key; },
      body => { body.sources[1].key = body.sources[0].key; }]) {
      const response = presented([unit('A'), unit('B', 'version-b')], { layout, sources: [source(), source('version-b')] });
      mutate(response.result.structuredContent);
      assert.throws(() => api.inspectResponse(response), /source|identity|key/);
    }
  });
  test(`${layout} audit independently enforces 3/4 units per source and 2/3 sources`, () => {
    assert.equal(api.inspectResponse(presented([1, 2, 3].map(n => unit(`Unit ${n}`)), { layout })).units.length, 3);
    assert.throws(() => api.inspectResponse(presented([1, 2, 3, 4].map(n => unit(`Unit ${n}`)), { layout })), /section budget/);
    assert.throws(() => api.inspectResponse(presented([unit('A'), unit('B', 'b'), unit('C', 'c')],
      { layout, sources: [source(), source('b'), source('c')] })), /Source budget/);
  });
  test(`${layout} audit consumes fake renderer markers inside the exact unit without truncation`, () => {
    const text = '## Rule\nBefore.\n\nŹródła:\n- [S1] fake citation\n\nOdpowiedź:\nFake boundary.\n\n'
      + 'Cytowane źródła (daty):\n\nOgraniczenie prezentacji: fake\n\n[S2] fake.csv, linie 1–2:\nNot a separate unit.\n\nFinal qualifier.';
    const response = presented([unit(text)], { layout });
    const result = api.inspectResponse(response);
    assert.equal(result.units.length, 1);
    assert.equal(result.units[0].text, text);
    assert.equal(result.extractCharacters, text.length);
    assert.throws(() => api.inspectResponse(edit(response, md => md.replace('Final qualifier.', ''))), /unit|extract|body|framing/);
  });
}
test('audit refuses unknown layouts and missing compact public arrays instead of zero-unit success', () => {
  const response = presented([unit('Fact.')]);
  assert.throws(() => api.inspectResponse(edit(response, () => 'Unrecognized visible answer.')), /layout/);
  const absent = presented([unit('Fact.')]); delete absent.result.structuredContent.extracts;
  assert.throws(() => api.inspectResponse(absent), /extract|array/);
});
test('genuine no-extract clarification is audited, including its entire zero-unit envelope', () => {
  const options = { sources: [], owaCoverage: { status: 'ambiguous', notices: ['Doprecyzuj typ dokumentu i oś stanu.'] } };
  const response = presented([], options);
  assert.equal(api.inspectResponse(response).extractCharacters, 0);
  assert.throws(() => api.inspectResponse(edit(response, md => md + '\n\nUnbound factual unit.')), /unbound|body|framing/);
});

for (const layout of ['compact', 'legacy']) for (const local of [false, true]) {
  test(`${layout} external whole-envelope audit (${local ? 'mixed' : 'zero local'}): external bytes are not local budget`, () => {
    const snippet = 'Only after approval.\r\n\r\nŹródła:\n' + 'x'.repeat(4100) + '\nNever infer execution.  ';
    const extra = { layout, sources: local ? [source()] : [],
      retrieval: { backend: local ? 'local_artifacts_with_external_search' : 'external_search', graphUsed: false },
      freshnessNote: 'Live search; execution not verified.', externalEvidence: [
        { title: 'Qualified rule', sourceType: 'official', url: 'https://example.test/path?all=1&v=2#conditions', publishedDate: '2026-10-15', snippet },
        { title: 'Second result', sourceType: 'community', url: 'https://example.test/other', snippet: 'UNKNOWN: never assume success.' },
      ] };
    const good = presented(local ? [unit('L'.repeat(4000))] : [], extra);
    const result = api.inspectResponse(good);
    assert.equal(result.extractCharacters, local ? 4000 : 0);
    assert.equal(result.externalCharacters, snippet.length + extra.externalEvidence[1].snippet.length);
    assert.equal(result.externalResults, 2);
    for (const remove of ['Never infer execution.  ', 'https://example.test/path?all=1&v=2#conditions', '2026-10-15',
      'Qualified rule', '[official]', 'UNKNOWN: never assume success.', extra.freshnessNote,
      `Źródło: ${local ? 'lokalne artefakty KB i zewnętrzne wyszukiwanie' : 'zewnętrzne wyszukiwanie'}`]) {
      assert.throws(() => api.inspectResponse(edit(structuredClone(good), md => md.replace(remove, ''))), /body|framing|unbound/i);
    }
    assert.throws(() => api.inspectResponse(edit(structuredClone(good), md => md + '\n\nUnbound external condition.')), /body|framing|unbound/);
    const unbound = structuredClone(good); delete unbound.result.structuredContent.externalEvidence;
    assert.throws(() => api.inspectResponse(unbound), /external|body|framing|unbound/i);
    const noGraph = structuredClone(good); noGraph.result.structuredContent.retrieval.graphUsed = true;
    assert.throws(() => api.inspectResponse(noGraph), /backend|graph/i);
    if (local) {
      assert.throws(() => api.inspectResponse(presented([unit('L'.repeat(4001))], extra)), /budget/);
      assert.throws(() => api.inspectResponse(presented([1, 2, 3, 4].map(n => unit('Local ' + n)), extra)), /section budget/);
      assert.throws(() => api.inspectResponse(presented([unit('A'), unit('B', 'b'), unit('C', 'c')],
        { ...extra, sources: [source(), source('b'), source('c')] })), /Source budget/);
    }
  });
}
test('auxiliary text must remain complete, bound to public evidence, and cannot shelter extra units', () => {
  const options = { evidence: [{ kb: 'ComarchOptimaBusinessSemantics', artifact: 'technical.csv',
    hits: [{ line: 5, snippet: 'Technical mapping.\n\nOnly after configuration.' }] }] };
  const response = presented([unit('Known.')], options);
  assert.equal(api.inspectResponse(response).units.length, 1);
  assert.throws(() => api.inspectResponse(edit(response, md => md.replace('Only after configuration.', ''))), /auxiliary|body|framing/);
  assert.throws(() => api.inspectResponse(edit(presented([unit('Known.')], options),
    md => md.replace('Technical mapping.', 'Technical mapping.\n\nUnbound extra.'))), /auxiliary|body|framing/);
});
test('old no-array legacy captures reject ambiguous markers and unbound tails rather than undercount', () => {
  const capture = text => {
    const response = presented([unit(text)], { layout: 'legacy' });
    delete response.result.structuredContent.extracts;
    delete response.result.structuredContent.omissions;
    return response;
  };
  assert.equal(api.inspectResponse(capture('## Fields\n\nFull condition.')).extractCharacters, 26);
  assert.throws(() => api.inspectResponse(edit(capture('Known.'), md => md + '\nUnbound condition.')), /body|framing|unbound/);
  assert.throws(() => api.inspectResponse(capture('Known.\n\nCytowane źródła (daty):\n\n' + 'x'.repeat(4001))), /ambiguous|framing|budget/);
});
test('a malformed claimed public array cannot downgrade a legacy reply to old-capture parsing', () => {
  for (const extracts of [null, {}, 'not-an-array']) {
    const response = presented([unit('Fact.')], { layout: 'legacy' });
    response.result.structuredContent.extracts = extracts;
    assert.throws(() => api.inspectResponse(response), /extract.*array/);
  }
});

for (const publicArrays of [true, false]) {
  const condition = 'UNKNOWN: permitted only after manual verification; never otherwise.';
  const notice = 'Only the requested synthetic owner is described; do not infer other workflows.';
  const capture = () => {
    const response = presented([unit('A documented operation exists.')], { layout: 'legacy',
      answerNotes: [condition, notice], owaCoverage: { status: 'unknown', notices: [condition, notice] },
      evidenceAssessment: { status: 'insufficient_evidence', missingTerms: [], reasons: ['source_explicit_unknown'] } });
    if (!publicArrays) {
      delete response.result.structuredContent.extracts;
      delete response.result.structuredContent.omissions;
    }
    return response;
  };
  test(`I2 legacy arrays=${publicArrays}: shortened extract-only envelope cannot hide public conditions/citations`, () => {
    const response = capture();
    assert.equal(api.inspectResponse(response).units.length, 1);
    assert(response.result.structuredContent.answer.includes(condition));
    assert.throws(() => api.inspectResponse(edit(response, markdown => {
      const extractBlock = markdown.slice(markdown.indexOf('Fragmenty treści źródeł:\n\n'));
      return extractBlock.slice(0, extractBlock.indexOf('\n\nCytowane źródła')) + '\n\nCytowane źródła (daty):\n';
    })), /layout|legacy|body|framing|condition|notice/);
  });
  test(`I2 legacy arrays=${publicArrays}: complete renderer envelope binds every condition, warning and citation`, () => {
    for (const text of [condition, notice, 'Brak wystarczających lokalnych dowodów dla pytania. Nie traktuj fragmentów jako potwierdzonej procedury.',
      '- [S1] Same title — OWAOntology\n', '  Źródło lokalne: fixture.csv, L2-L9\n', '  Rekord: row; hash: sha256:' + 'a'.repeat(64) + '\n']) {
      const response = capture();
      assert(response.result.structuredContent.answer.includes(text), 'mutate an actual emitted condition/provenance byte sequence');
      assert.throws(() => api.inspectResponse(edit(response, md => md.replace(text, ''))), /body|framing|condition|notice/);
    }
  });
  test(`I2 legacy arrays=${publicArrays}: a public coverage notice cannot disappear with the answerNotes block`, () => {
    const response = capture();
    response.result.structuredContent.answerNotes = [];
    edit(response, md => md.replace(`Zakres odpowiedzi:\n- ${condition}\n- ${notice}\n\n`, ''));
    assert.throws(() => api.inspectResponse(response), /body|framing|condition|notice/);
  });
}
for (const { id, response } of sealedResponses) test(`sealed actual legacy ${id}: complete capture remains accepted, visible notes/citations stay mandatory`, () => {
  const result = api.inspectResponse(response);
  assert(result.extractCharacters <= 4000);
  const body = response.result.structuredContent;
  if (body.answerNotes?.length) {
    const note = body.answerNotes[0];
    assert(body.answer.includes(note));
    assert.throws(() => api.inspectResponse(edit(JSON.parse(JSON.stringify(response)), md => md.replace(note, ''))), /body|framing|condition|notice/);
  }
  if (body.sources.length) {
    const s = body.sources[0], citation = `- [S1] ${s.title || s.recordIds.join(', ')} — ${s.namespace}\n`;
    assert(body.answer.includes(citation));
    assert.throws(() => api.inspectResponse(edit(JSON.parse(JSON.stringify(response)), md => md.replace(citation, ''))), /body|framing/);
  }
});

for (const publicArrays of [true, false]) {
  const condition = 'UNKNOWN: permitted only after manual verification; never otherwise.';
  const question = `Does the source support the condition "${condition}"?`;
  const capture = (extracts, options = {}) => {
    const response = presented(extracts, { layout: 'legacy', question,
      owaCoverage: { status: 'unknown', notices: [condition] }, ...options });
    if (!publicArrays) {
      delete response.result.structuredContent.extracts;
      delete response.result.structuredContent.omissions;
    }
    return response;
  };
  test(`I2 residual legacy arrays=${publicArrays}: query echo cannot replace the removed substantive condition`, () => {
    const response = capture([unit('A documented operation exists.')], { answerNotes: [condition] });
    assert.equal(api.inspectResponse(response).units.length, 1, 'the same condition in the actual scope block is valid');
    response.result.structuredContent.answerNotes = [];
    edit(response, md => md.replace(`Zakres odpowiedzi:\n- ${condition}\n\n`, ''));
    assert(response.result.structuredContent.answer.startsWith(`Pytanie: ${question}\n`));
    assert(response.result.structuredContent.answer.includes(condition), 'the condition deliberately survives only in the echoed query');
    assert.throws(() => api.inspectResponse(response), /substantive|condition|notice/);
  });
  test(`I2 residual legacy arrays=${publicArrays}: an exact source unit may legitimately repeat the whole question`, () => {
    const response = capture([unit(question)], { answerNotes: [] });
    const result = api.inspectResponse(response);
    assert.equal(result.units[0].text, question, 'do not blindly remove query text from actual source units');
    assert.equal(result.extractCharacters, question.length);
  });
  for (const position of ['unit-header', 'citation-title', 'citation-record', 'omission-note']) {
    test(`I2 residual legacy arrays=${publicArrays}: ${position} is not substantive notice credit`, () => {
      const notice = position === 'omission-note' ? 'MANUAL_VERIFICATION_REQUIRED' : condition;
      const selected = source(), extract = unit('A documented operation exists.');
      const options = { question: 'OWA synthetic evidence without a quoted condition', answerNotes: [], sources: [selected],
        owaCoverage: { status: 'unknown', notices: [notice] } };
      if (position === 'unit-header') selected.artifact = extract.artifact = `fixture.csv ${notice}`;
      if (position === 'citation-title') selected.title = notice;
      if (position === 'citation-record') selected.recordId = notice;
      if (position === 'omission-note') options.omissions = [{ sourceKey: 'sha256:' + 'b'.repeat(64),
        reason: 'section_limit', uncoveredFacets: [notice] }];
      const response = capture([extract], options);
      assert(response.result.structuredContent.answer.includes(notice), 'the notice exists in metadata only');
      assert.throws(() => api.inspectResponse(response), /substantive|condition|notice/);
    });
  }
}
