#!/usr/bin/env node
// Offline evidence comparison. Never imports a domain module or follows roots in a manifest.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASELINE, BASELINE_SHA256, STATIC_FILES, MODULE_FILES, readStatic, sha256, inspectResponse } from './lib/owa_offline_harness.mjs';

export const REPORT = 'OWA_Compact_Presentation_Offline_2026-10-15';
const IDS = Array.from({ length: 12 }, (_, i) => `Q${String(i + 1).padStart(2, '0')}`);
const FORMATTER = 'scripts/lib/owa_answer_presentation.mjs';
const CHANGED_MODULES = new Set(['scripts/erp_knowledge_answer.mjs', 'scripts/lib/erp_knowledge_mcp_core.mjs']);
const counts = text => ({ characters: text.length, lines: text.split('\n').length, utf8Bytes: Buffer.byteLength(text) });
const summary = values => {
  const sorted = values.map(v => v.characters).sort((a, b) => a - b);
  return { characters: values.reduce((n, v) => n + v.characters, 0), lines: values.reduce((n, v) => n + v.lines, 0),
    utf8Bytes: values.reduce((n, v) => n + v.utf8Bytes, 0), maxCharacters: sorted.at(-1) || 0,
    medianCharacters: sorted.length ? (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2 : 0 };
};
// Exact observation location only, not arbitrary timestamp-named/source-date fields.
const observation = /^\/result\/structuredContent\/evidence\/\d+\/observedAt$/;
export function structuredDiffs(before, after, pointer = '') {
  if (Object.is(before, after)) return [];
  if (observation.test(pointer) && typeof before === 'string' && typeof after === 'string'
      && Number.isFinite(Date.parse(before)) && Number.isFinite(Date.parse(after))) return [];
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object' || Array.isArray(before) !== Array.isArray(after))
    return [{ path: pointer || '/', before, after }];
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap(key => {
    const next = pointer + '/' + key.replaceAll('~', '~0').replaceAll('/', '~1');
    if (!Object.hasOwn(before, key) || !Object.hasOwn(after, key)) return [{ path: next, before: before[key], after: after[key], missing: !Object.hasOwn(before, key) ? 'before' : 'after' }];
    return structuredDiffs(before[key], after[key], next);
  });
}
function semanticResponse(response) {
  const copy = structuredClone(response), body = copy.result?.structuredContent;
  if (body) for (const key of ['answer', 'extracts', 'omissions']) delete body[key];
  for (const item of copy.result?.content || []) if (item.type === 'text') item.text = '<bound answer Markdown>';
  return copy;
}
export function analyzePresentationRuns(before, after) {
  const diagnostics = [], record = (condition, message) => { if (!condition) diagnostics.push(message); };
  const manifests = [before.manifest, after.manifest];
  const sources = manifests.map((m, index) => {
    record(m.schemaVersion === 1, `run ${index}: manifest version`);
    record(m.questionsHash === BASELINE_SHA256 && sha256(m.baselineBytes) === BASELINE_SHA256, `run ${index}: immutable baseline binding`);
    record(m.sourceManifestHash === sha256(m.sourceManifestBytes), `run ${index}: source manifest hash`);
    record(Array.isArray(m.guard?.violations) && m.guard.violations.length === 0, `run ${index}: guard violations`);
    const source = JSON.parse(m.sourceManifestBytes);
    const expected = [...STATIC_FILES, ...MODULE_FILES.filter(p => index || p !== FORMATTER)].sort();
    record(source.schemaVersion === 1 && JSON.stringify(source.files.map(f => f.path).sort()) === JSON.stringify(expected), `run ${index}: fixed source/module inventory`);
    const baselineEntry = source.files.find(f => f.path === BASELINE);
    record(baselineEntry?.sha256 === BASELINE_SHA256 && baselineEntry?.bytes === Buffer.byteLength(m.baselineBytes), `run ${index}: baseline source fingerprint`);
    return new Map(source.files.map(f => [f.path, f]));
  });
  for (const file of [...STATIC_FILES, ...MODULE_FILES.filter(p => p !== FORMATTER && !CHANGED_MODULES.has(p))]) {
    const [a, b] = sources.map(m => m.get(file));
    record(a?.sha256 === b?.sha256 && a?.bytes === b?.bytes, `${STATIC_FILES.includes(file) ? 'static' : 'module'} fingerprint: ${file}`);
  }
  const baseline = JSON.parse(before.manifest.baselineBytes);
  record(JSON.stringify(baseline.questions.map(q => q.id)) === JSON.stringify(IDS), 'baseline question inventory');
  for (const [i, run] of [before, after].entries())
    record(JSON.stringify(run.captures.map(c => c.id)) === JSON.stringify(IDS), `run ${i}: capture inventory`);
  const results = [];
  for (const q of baseline.questions) {
    const a = before.captures.find(c => c.id === q.id), b = after.captures.find(c => c.id === q.id);
    if (!a || !b) continue;
    const errors = [];
    const require = (condition, message) => { if (!condition) errors.push(message); };
    for (const capture of [a, b]) {
      const r = capture.request;
      require(r?.jsonrpc === '2.0' && r.id === q.id && r.method === 'tools/call' && r.params?.name === q.tool
        && r.params.arguments?.query === q.query && r.params.arguments?.as_of === '2026-10-15' && r.params.arguments?.limit === 5, 'request differs from unchanged question/tool/as_of/limit');
      require(capture.expected === q.expected, 'expected criterion differs from baseline');
      require(capture.markdown === capture.response.result?.structuredContent?.answer, 'saved Markdown/body parity');
      try { inspectResponse(capture.response); } catch (e) { errors.push('independent body audit: ' + e.message); }
    }
    const requestDiffs = structuredDiffs(a.request, b.request); // No ID/correlation normalization is declared or needed for these runs.
    require(!requestDiffs.length, 'request parity');
    const semanticDiffs = structuredDiffs(semanticResponse(a.response), semanticResponse(b.response));
    require(!semanticDiffs.length, 'existing semantic response parity');
    let original = a.response.result?.structuredContent;
    if (!Array.isArray(original?.extracts)) {
      const replay = a.legacy, binding = before.manifest.replay;
      require(binding?.method === 'sealed-answerQuestion-pre-render' && binding.sourceManifestHash === before.manifest.sourceManifestHash
        && Array.isArray(binding.guard?.violations) && !binding.guard.violations.length, 'old pre-render provenance/guard');
      require(!!replay, 'missing old pre-render capture');
      if (replay) {
        require(!structuredDiffs(a.request, replay.request).length, 'old replay request parity');
        require(!structuredDiffs(a.response, replay.response).length, 'old replay complete response parity (observation timestamps excepted)');
        require(replay.renderedMarkdown === a.markdown, 'old pre-render reproduces original full Markdown');
        original = { ...original, extracts: replay.extracts, omissions: replay.omissions };
        try { inspectResponse({ ...a.response, result: { ...a.response.result, structuredContent: { ...replay.framing, ...original } } }); }
        catch (e) { errors.push('old pre-render bound body audit: ' + e.message); }
      }
    }
    const candidate = b.response.result?.structuredContent;
    const extractDiffs = structuredDiffs(original?.extracts, candidate?.extracts, '/extracts');
    const omissionDiffs = structuredDiffs(original?.omissions, candidate?.omissions, '/omissions');
    require(Array.isArray(candidate?.extracts) && !extractDiffs.length, 'pre-render extract identity');
    require(Array.isArray(candidate?.omissions) && !omissionDiffs.length, 'pre-render omission identity');
    for (const unit of original?.extracts || []) require(a.markdown.includes(unit.text) && b.markdown.includes(unit.text), 'original complete extract text lost');
    const beforeCounts = counts(a.markdown), afterCounts = counts(b.markdown);
    results.push({ id: q.id, query: q.query, tool: q.tool, expected: q.expected, before: beforeCounts, after: afterCounts,
      beforeHash: sha256(a.markdown), afterHash: sha256(b.markdown), beforeResponseHash: a.responseHash || sha256(JSON.stringify(a.response)),
      afterResponseHash: b.responseHash || sha256(JSON.stringify(b.response)), requestHash: sha256(JSON.stringify(a.request)),
      reduction: beforeCounts.characters ? 1 - afterCounts.characters / beforeCounts.characters : null,
      noGrowth: afterCounts.characters <= beforeCounts.characters, requestDiffs, semanticDiffs, extractDiffs, omissionDiffs,
      errors, manualScore: 'PENDING_MANUAL_REVIEW' });
  }
  const totals = { before: summary(results.map(r => r.before)), after: summary(results.map(r => r.after)) };
  const reduction = totals.before.characters ? 1 - totals.after.characters / totals.before.characters : null;
  const gates = { identityAndBody: !diagnostics.length && results.length === 12 && results.every(r => !r.errors.length),
    aggregateReduction: reduction !== null && reduction >= .35, noIndividualGrowth: results.length === 12 && results.every(r => r.noGrowth) };
  return { schemaVersion: 1, status: 'PENDING_MANUAL_REVIEW', characterUnit: 'JavaScript String.length (UTF-16 code units); full visible Markdown',
    lineUnit: "String.split('\\n').length; all visible Markdown, including blank lines", observationExclusions: ['/result/structuredContent/evidence/*/observedAt (valid date values only)'],
    requestExclusions: [], questionsHash: BASELINE_SHA256, sourceManifestHashes: manifests.map(m => m.sourceManifestHash),
    codeManifests: sources.map(m => [...m.values()].filter(f => f.path.startsWith('scripts/'))),
    diagnostics, results, totals, reduction, gates, automatedGatesPassed: Object.values(gates).every(Boolean) };
}

// A run root contains one self-contained presentation-run.json plus named Q files.
// sourceManifestBytes/baselineBytes are exact UTF-8 bytes, not regenerated subsets.
// The runner report is embedded verbatim by the packaging step; its paths cannot
// cause reads. Before-only Qxx.pre-render.json are separately hash-bound replays.
export function loadRun(root) {
  const bytes = readStatic(root, 'presentation-run.json'), manifest = JSON.parse(bytes);
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.results)
      || JSON.stringify(manifest.results.map(r => r.id)) !== JSON.stringify(IDS)) throw new Error('Invalid capture inventory');
  const captures = manifest.results.map(entry => {
    const { id } = entry;
    if (entry.responseFile !== `${id}.json` || entry.markdownFile !== `${id}.md`) throw new Error('Unbound capture filename');
    const responseBytes = readStatic(root, `${id}.json`), markdownBytes = readStatic(root, `${id}.md`);
    if (sha256(responseBytes) !== entry.responseHash || sha256(markdownBytes) !== entry.markdownHash
        || sha256(JSON.stringify(entry.request)) !== entry.requestHash) throw new Error('Capture fingerprint mismatch: ' + id);
    let legacy;
    if (entry.preRenderHash) {
      const replay = readStatic(root, `${id}.pre-render.json`);
      if (sha256(replay) !== entry.preRenderHash) throw new Error('Pre-render fingerprint mismatch: ' + id);
      legacy = JSON.parse(replay);
    }
    return { ...entry, response: JSON.parse(responseBytes), markdown: markdownBytes.toString('utf8'), legacy };
  });
  return { manifest, captures, root, manifestHash: sha256(bytes) };
}
export function comparisonMarkdown(report) {
  return `# OWA compact presentation — offline comparison\n\nStatus: ${report.status}. Automated diagnostics are not correctness grades.\n\n` +
    `Characters: ${report.characterUnit}. Lines: ${report.lineUnit}.\n\n` +
    `Aggregate reduction: ${(100 * report.reduction).toFixed(2)}%. Automated gates: ${JSON.stringify(report.gates)}.\n\n` +
    '| Case | Before UTF-16 | After UTF-16 | Reduction | Lines before/after | No growth | Manual |\n|---|---:|---:|---:|---:|---|---|\n' +
    report.results.map(r => `| ${r.id} | ${r.before.characters} | ${r.after.characters} | ${(100 * r.reduction).toFixed(2)}% | ${r.before.lines}/${r.after.lines} | ${r.noGrowth} | ${r.manualScore} |`).join('\n') +
    `\n\nTotals, medians and maxima:\n\n\`\`\`json\n${JSON.stringify(report.totals, null, 2)}\n\`\`\`\n\nFull requests, fingerprints, manifests and structured diffs: companion JSON.\n`;
}
export function compareRuns({ before, after, outputParent } = {}) {
  for (const value of [before, after, outputParent]) if (!value || !path.isAbsolute(value)) throw new Error('Explicit absolute before/after/output-parent required');
  if (before === after || before.startsWith(after + '/') || after.startsWith(before + '/')) throw new Error('Distinct independent run roots required');
  if (!(outputParent === '/tmp/opencode' || outputParent.startsWith('/tmp/opencode/')) || fs.realpathSync(outputParent) !== outputParent) throw new Error('Private existing output parent required');
  for (const root of [before, after]) if (outputParent === root || outputParent.startsWith(root + '/')) throw new Error('Output must be separate from run roots');
  const a = loadRun(before), b = loadRun(after), report = analyzePresentationRuns(a, b);
  report.inputs = [a, b].map(r => ({ root: r.root, manifestHash: r.manifestHash, manifest: r.manifest }));
  process.umask(0o077);
  const output = fs.mkdtempSync(path.join(outputParent, 'owa-presentation-comparison-'));
  fs.writeFileSync(path.join(output, REPORT + '.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o400 });
  fs.writeFileSync(path.join(output, REPORT + '.md'), comparisonMarkdown(report), { flag: 'wx', mode: 0o400 });
  return { output, report };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2), names = ['--before', '--after', '--output-parent'];
    if (args.length !== 6 || names.some(name => args.filter(v => v === name).length !== 1) || args.some((v, i) => i % 2 === 0 && !names.includes(v))) throw new Error('Require explicit --before ABS --after ABS --output-parent ABS');
    const value = name => args[args.indexOf(name) + 1];
    const { output, report } = compareRuns({ before: value('--before'), after: value('--after'), outputParent: value('--output-parent') });
    console.log(JSON.stringify({ output, status: report.status, reduction: report.reduction, gates: report.gates }));
    if (!report.automatedGatesPassed) process.exitCode = 1;
  } catch (e) { console.error(e.stack); process.exitCode = 1; }
}
