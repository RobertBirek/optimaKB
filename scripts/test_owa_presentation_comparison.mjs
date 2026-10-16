#!/usr/bin/env node
// Synthetic complete captures only. No domain imports, network or runtime writes.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { renderCompactOwaAnswer } from './lib/owa_answer_presentation.mjs';
import { BASELINE, BASELINE_SHA256, STATIC_FILES, MODULE_FILES, sha256 } from './lib/owa_offline_harness.mjs';

const api = await import('./compare_owa_presentation_runs.mjs').catch(e => {
  if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
  return {};
});
const baselineBytes = fs.readFileSync(new URL('../docs/reference/OWA_SemanticKB_12Q_2026-10-15.json', import.meta.url), 'utf8');
const questions = JSON.parse(baselineBytes).questions;
const clone = value => structuredClone(value);
const stamp = '2026-10-15T12:00:00Z';
function fixture() {
  const sourceManifest = files => ({ schemaVersion: 1, files: files.map(p => ({ path: p, bytes: p === BASELINE ? Buffer.byteLength(baselineBytes) : 10,
    sourcePath: '/explicit/synthetic/' + p, sha256: p === BASELINE ? BASELINE_SHA256 : 'a'.repeat(64) })) });
  const run = candidate => {
    const sourceManifestBytes = JSON.stringify(sourceManifest([...STATIC_FILES, ...MODULE_FILES.filter(p => candidate || !p.endsWith('/owa_answer_presentation.mjs'))]));
    const captures = questions.map(q => {
      const request = { jsonrpc: '2.0', id: q.id, method: 'tools/call', params: { name: q.tool,
        arguments: { query: q.query, as_of: '2026-10-15', limit: 5, correlation_id: `synthetic-${q.id}` } } };
      const extracts = [{ sourceKey: 'version-A', artifact: 'exports/owa_ontology/v1/chunk.csv', recordId: 'row-1', line: 2, endLine: 4,
        text: 'Only when verified.\r\n| flag | UNKNOWN |\r\nNever assume execution. 😀' }];
      const omissions = Array.from({ length: 30 }, () => ({ sourceKey: 'sha256:' + 'f'.repeat(64), reason: 'section_limit', uncoveredFacets: [] }));
      const body = { domain: 'semantic', question: q.query, primaryKb: 'OWAOntology', supportKbs: [], recommendedArtifacts: [],
        note: 'Routing zadziałał, ale w wybranych artefaktach startowych nie znaleziono mocnych lokalnych trafień tekstowych.',
        evidence: [], sources: [{ key: 'version-A', namespace: 'OWAOntology', title: 'Conditional facts', kind: 'local_artifact',
        records: [], publication: { value: null, reason: 'unknown', basis: 'source' }, update: { value: null, reason: 'unknown', basis: 'source' }, retrieved: { value: null, reason: 'unknown', basis: 'source' } }],
      retrieval: { backend: 'local_artifacts', graphUsed: false, retrievedAt: stamp },
      evidenceAssessment: { status: 'insufficient_evidence' }, owaCoverage: { status: 'unknown', notices: ['UNKNOWN; do not infer enum.'] },
      answerNotes: ['UNKNOWN; do not infer enum.'], knowledge_status: 'UNKNOWN', validity: { assessed_at: stamp }, warnings: [], correlation_id: `synthetic-${q.id}` };
      const markdown = candidate ? renderCompactOwaAnswer({ ...body, extracts, omissions })
        : `Pytanie: ${q.query}\n\nGłówna KB: OWAOntology\n\nRouting zadziałał, ale w wybranych artefaktach startowych nie znaleziono mocnych lokalnych trafień tekstowych.\nŹródło: lokalne artefakty KB; bez wykonania grafu KAG/OpenSPG.\nConfidence oznacza punktację wyszukiwania, nie prawdopodobieństwo poprawności.\nBrak wystarczających lokalnych dowodów dla pytania. Nie traktuj fragmentów jako potwierdzonej procedury.\n\nZakres odpowiedzi:\n- UNKNOWN; do not infer enum.\n\nFragmenty treści źródeł:\n\n[S1] ${extracts[0].artifact}, linie 2–4:\n${extracts[0].text}\n\nOgraniczenie prezentacji: pominięto całe fragmenty lub źródła; brakujące aspekty oceniono względem pokazanych dowodów.\n${omissions.map(o => '- ' + o.sourceKey + ': section_limit\n').join('')}\nCytowane źródła (daty źródłowe, nie daty wejścia w życie):\n- [S1] Conditional facts — OWAOntology\n  Publikacja: nieznana (unknown); podstawa: source\n  Aktualizacja: nieznana (unknown); podstawa: source\n  Pobranie: nieznana (unknown); podstawa: source\n\nPolecane artefakty:`;
      const response = { jsonrpc: '2.0', id: q.id, result: { content: [{ type: 'text', text: markdown }], structuredContent: { ...body, answer: markdown, ...(candidate ? { extracts, omissions } : {}) } } };
      return { id: q.id, request, expected: q.expected, response, markdown,
        ...(candidate ? {} : { legacy: { request: clone(request), response: clone(response), extracts, omissions,
          framing: { question: q.query, primaryKb: 'OWAOntology', supportKbs: [], recommendedArtifacts: [],
            note: 'Routing zadziałał, ale w wybranych artefaktach startowych nie znaleziono mocnych lokalnych trafień tekstowych.' }, renderedMarkdown: markdown } }) };
    });
    return { manifest: { schemaVersion: 1, sourceManifestBytes, sourceManifestHash: sha256(sourceManifestBytes), baselineBytes,
      questionsHash: BASELINE_SHA256, guard: { violations: [] }, ...(candidate ? {} : { replay: { sourceManifestHash: sha256(sourceManifestBytes), guard: { violations: [] }, method: 'sealed-answerQuestion-pre-render' } }) }, captures };
  };
  return { before: run(false), after: run(true) };
}
function compare(pair) {
  assert.equal(typeof api.analyzePresentationRuns, 'function', 'missing comparison implementation');
  return api.analyzePresentationRuns(pair.before, pair.after);
}
function rejected(mutator, pattern) {
  const pair = fixture(); mutator(pair);
  const result = compare(pair);
  assert.equal(result.automatedGatesPassed, false);
  assert.match(JSON.stringify(result), pattern);
}
test('twelve complete captures: exact UTF-16 totals, lines, median, maximum; additive arrays; pending manual grading', () => {
  const pair = fixture(), result = compare(pair);
  assert.equal(result.automatedGatesPassed, true, JSON.stringify({ diagnostics: result.diagnostics, errors: result.results.map(r => r.errors), gates: result.gates }));
  assert.equal(result.status, 'PENDING_MANUAL_REVIEW');
  assert.equal(result.results.length, 12);
  assert(result.results.every(r => r.manualScore === 'PENDING_MANUAL_REVIEW'));
  assert.equal(result.totals.before.characters, pair.before.captures.reduce((n, c) => n + c.markdown.length, 0));
  assert.equal(result.totals.after.characters, pair.after.captures.reduce((n, c) => n + c.markdown.length, 0));
  assert.equal(result.totals.after.lines, pair.after.captures.reduce((n, c) => n + c.markdown.split('\n').length, 0));
  assert.equal(result.totals.after.maxCharacters, Math.max(...pair.after.captures.map(c => c.markdown.length)));
  const sorted = pair.before.captures.map(c => c.markdown.length).sort((a, b) => a - b);
  assert.equal(result.totals.before.medianCharacters, (sorted[5] + sorted[6]) / 2);
  assert(result.reduction >= .35);
  assert.match(result.characterUnit, /UTF-16/);
  assert(result.totals.after.utf8Bytes > result.totals.after.characters);
});
for (const [name, mutation, pattern] of [
  ['missing call', p => p.after.captures.pop(), /capture.*inventory/i],
  ['swapped query', p => p.after.captures[0].request.params.arguments.query = p.after.captures[1].request.params.arguments.query, /request/i],
  ['changed non-correlation argument', p => p.after.captures[0].request.params.arguments.limit = 6, /request/i],
  ['changed tool', p => p.after.captures[0].request.params.name = 'erp_process.explain', /request/i],
  ['changed source fingerprint', p => { const m = JSON.parse(p.after.manifest.sourceManifestBytes); m.files[1].sha256 = 'b'.repeat(64); p.after.manifest.sourceManifestBytes = JSON.stringify(m); p.after.manifest.sourceManifestHash = sha256(p.after.manifest.sourceManifestBytes); }, /static.*fingerprint/i],
  ['changed existing semantic field', p => p.after.captures[0].response.result.structuredContent.knowledge_status = 'CONFIRMED', /knowledge_status/],
  ['unapproved new semantic field', p => p.after.captures[0].response.result.structuredContent.unapproved = true, /unapproved/],
  ['nested timestamp-like semantic field is not broadly stripped', p => p.after.captures[0].response.result.structuredContent.owaCoverage.updatedAt = stamp, /updatedAt/],
  ['lost extract qualification', p => p.after.captures[0].response.result.structuredContent.extracts[0].text = 'Only when verified.', /extract/i],
  ['changed omissions', p => p.after.captures[0].response.result.structuredContent.omissions.pop(), /omission|framing/i],
  ['missing old pre-render evidence', p => delete p.before.captures[0].legacy, /pre.render/i],
  ['old replay differs from saved response', p => p.before.captures[0].legacy.response.result.structuredContent.warnings.push('different'), /replay/i],
  ['guard swallowed attempt', p => p.after.manifest.guard.violations.push('outside read'), /guard/i],
  ['gold-byte change', p => p.after.manifest.baselineBytes += '\n', /baseline/i],
  ['source manifests falsely bind baseline bytes on both sides', p => {
    for (const run of [p.before, p.after]) {
      const m = JSON.parse(run.manifest.sourceManifestBytes); m.files[0].bytes++;
      run.manifest.sourceManifestBytes = JSON.stringify(m); run.manifest.sourceManifestHash = sha256(run.manifest.sourceManifestBytes);
      if (run.manifest.replay) run.manifest.replay.sourceManifestHash = run.manifest.sourceManifestHash;
    }
  }, /baseline.*fingerprint/i],
]) test(`reject ${name}`, () => rejected(mutation, pattern));
test('a single longer answer fails even with aggregate savings and otherwise exact semantic parity', () => {
  const p = fixture();
  const old = p.before.captures[0], compact = p.after.captures[0];
  Object.assign(old.response.result.structuredContent, { extracts: old.legacy.extracts, omissions: old.legacy.omissions });
  delete old.legacy;
  p.before.captures[0] = compact;
  p.after.captures[0] = old;
  const result = compare(p);
  assert(result.results[0].after.characters > result.results[0].before.characters);
  assert(result.reduction >= .35);
  assert.deepEqual(result.results[0].semanticDiffs, []);
  assert.equal(result.gates.identityAndBody, true, JSON.stringify(result.results.map(r => r.errors)));
  assert.equal(result.results[0].noGrowth, false);
  assert.equal(result.automatedGatesPassed, false);
});
test('only actual observation values can vary; source dates and correlation IDs remain semantic', () => {
  const p = fixture();
  for (const run of [p.before, p.after]) for (const c of run.captures) {
    const body = c.response.result.structuredContent;
    body.evidence = [{ kb: 'OWAOntology', artifact: 'exports/owa_ontology/v1/chunk.csv', hits: [], observedAt: stamp }];
    // Empty auxiliary evidence changes legacy scaffolding, so this control tests
    // the exact recursive comparator without pretending it is a real capture.
  }
  assert.equal(typeof api.structuredDiffs, 'function');
  const original = p.before.captures[0].response, changed = clone(original);
  changed.result.structuredContent.evidence[0].observedAt = '2026-10-16T14:00:00Z';
  assert.deepEqual(api.structuredDiffs(original, changed), []);
  changed.result.structuredContent.sources[0].publication.value = '2026-10-16';
  assert.match(JSON.stringify(api.structuredDiffs(original, changed)), /publication/);
  rejected(p => p.after.captures[0].request.params.arguments.correlation_id = 'undeclared-prefix-Q01', /request/);
});
test('real file CLI writes a pending report; detects body/hash/path tampering without following manifest roots', () => {
  assert.equal(typeof api.compareRuns, 'function', 'missing comparison CLI implementation');
  const parent = fs.mkdtempSync('/tmp/opencode/owa-comparison-test-');
  try {
    const p = fixture();
    const roots = ['before', 'after'].map(name => { const root = path.join(parent, name); fs.mkdirSync(root); return root; });
    for (const [i, run] of [p.before, p.after].entries()) {
      const results = run.captures.map(c => {
        const json = JSON.stringify(c.response, null, 2) + '\n';
        fs.writeFileSync(path.join(roots[i], c.id + '.json'), json);
        fs.writeFileSync(path.join(roots[i], c.id + '.md'), c.markdown);
        let preRenderHash;
        if (c.legacy) { const bytes = JSON.stringify(c.legacy); preRenderHash = sha256(bytes); fs.writeFileSync(path.join(roots[i], c.id + '.pre-render.json'), bytes); }
        return { id: c.id, request: c.request, requestHash: sha256(JSON.stringify(c.request)), expected: c.expected,
          responseFile: c.id + '.json', responseHash: sha256(json), markdownFile: c.id + '.md', markdownHash: sha256(c.markdown), preRenderHash };
      });
      fs.writeFileSync(path.join(roots[i], 'presentation-run.json'), JSON.stringify({ ...run.manifest, results }));
    }
    const options = { before: roots[0], after: roots[1], outputParent: parent };
    const result = api.compareRuns(options);
    assert.equal(result.report.automatedGatesPassed, true);
    const saved = JSON.parse(fs.readFileSync(path.join(result.output, api.REPORT + '.json')));
    assert.equal(saved.status, 'PENDING_MANUAL_REVIEW');
    const manifestFile = path.join(roots[1], 'presentation-run.json'), manifest = JSON.parse(fs.readFileSync(manifestFile));
    manifest.results[0].responseFile = '../before/Q01.json';
    fs.writeFileSync(manifestFile, JSON.stringify(manifest));
    assert.throws(() => api.compareRuns(options), /filename/);
    manifest.results[0].responseFile = 'Q01.json'; fs.writeFileSync(manifestFile, JSON.stringify(manifest));
    fs.appendFileSync(path.join(roots[1], 'Q01.md'), 'lost parity');
    assert.throws(() => api.compareRuns(options), /fingerprint/);
  } finally { fs.rmSync(parent, { recursive: true, force: true }); }
});
test('aggregate below 35 percent fails even when no individual answer grows', () => {
  const p = fixture(); p.before.captures = clone(p.after.captures);
  const result = compare(p);
  assert.equal(result.reduction, 0);
  assert(result.results.every(r => r.noGrowth));
  assert.equal(result.automatedGatesPassed, false);
});
test('CLI requires explicit absolute, distinct roots and output parent without production fallback', async () => {
  assert.equal(typeof api.compareRuns, 'function', 'missing comparison CLI implementation');
  for (const args of [{}, { before: '.', after: '/tmp/opencode', outputParent: '/tmp/opencode' },
    { before: '/tmp/opencode', after: '/tmp/opencode', outputParent: '/tmp/opencode' }]) {
    assert.throws(() => api.compareRuns(args), /explicit|absolute|distinct/i);
  }
});
