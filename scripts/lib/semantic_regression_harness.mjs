// Acceptance infrastructure only. The original exact 12Q validator is unchanged.
import fs from 'node:fs';
import path from 'node:path';
import { BASELINE, BASELINE_SHA256, STATIC_FILES, LEGACY_MODULE_FILES as MODULE_FILES, readStatic, safeRelative, sha256,
  validateClosure, inspectResponse } from './owa_offline_harness.mjs';

export const HOLDOUT20 = 'docs/reference/OWA_SemanticKB_Holdout20Q_2026-10-16.json';
export const HOLDOUT20_SHA256 = '3ae42d67cba40608c84ce4f5ffad77ed5f7553fe1979a586e0b108904a79f936';
// Source-reference documents are evidence for the reviewer, never domain inputs.
export const REFERENCE_FILES = Object.freeze([
  'draft_2026-07-17_83fd7a46_encja-kontrahent-kartoteka-kontrahentow.md',
  'draft_2026-07-17_b759524a_encja-towar-kartoteka-towarow-i-us-ug.md',
  'draft_2026-07-17_86fccc4f_encja-magazyn.md',
  'draft_2026-07-17_d4097219_encja-przyjecie-zewnetrzne-pz.md',
  'draft_2026-07-17_e6ad73fd_encja-wydanie-zewnetrzne-wz.md',
  'draft_2026-07-17_4bc001c1_encja-workflow-dokumentu.md',
  'draft_2026-07-17_494ddc8b_owa-auto-atrybuty-test-v2.md',
  'draft_2026-07-17_3aa244d3_encja-jednostka-miary.md',
  'draft_2026-07-17_116f0633_encja-cena-towaru.md',
  'draft_2026-07-15_d163edaa_platnosc.md',
  'draft_2026-07-17_7b716bd7_encja-rozrachunek.md',
  'draft_2026-07-17_05de1ce8_encja-kompensata.md',
  'draft_2026-07-17_93504cdb_encja-korekta-fs-fskor.md',
  'draft_2026-07-17_9197d815_encja-korekta-fz-fzkor.md',
  'draft_2026-07-17_d8b5bd3d_encja-korekta-pz-pzkor.md',
  'draft_2026-07-17_f0509d1f_encja-przesuniecie-miedzymagazynowe-mm.md',
  'draft_2026-07-17_78203fd9_encja-roznica-kursowa-rkur.md',
].map(name => 'docs/reference/knowledge_inbox/promoted/OWAOntology/' + name));
export const SEMANTIC_FILES = Object.freeze([...STATIC_FILES, HOLDOUT20, ...REFERENCE_FILES, ...MODULE_FILES]);
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
export function semanticCases(twelveBytes, twentyBytes) {
  if (sha256(twelveBytes) !== BASELINE_SHA256 || sha256(twentyBytes) !== HOLDOUT20_SHA256) throw Error('Original bank hash mismatch');
  const twelve = JSON.parse(twelveBytes), twenty = JSON.parse(twentyBytes);
  const cases = [...twelve.questions.map(q => ({ ...q, bank: 'original12', asOf: '2026-10-15' })),
    ...twenty.questions.map(q => ({ ...q, bank: 'holdout20', asOf: '2026-10-16' }))];
  if (twelve.questions.length !== 12 || twenty.questions.length !== 20 || new Set(cases.map(q => q.id)).size !== 32) throw Error('Invalid bank counts');
  return freeze(cases);
}
export function semanticRequest(q) {
  return { jsonrpc: '2.0', id: q.id, method: 'tools/call', params: { name: q.tool,
    arguments: { query: q.query, as_of: q.asOf, limit: 5, correlation_id: `semantic32-candidate-${q.id}` } } };
}
export function assertSemanticRequest(request, cases) {
  const q = cases.find(q => q.id === request?.id);
  if (!q || JSON.stringify(request) !== JSON.stringify(semanticRequest(q))) throw Error('Original request binding mismatch');
}
export function privateParent(parent) {
  if (!parent || !path.isAbsolute(parent) || !(parent === '/tmp/opencode' || parent.startsWith('/tmp/opencode/'))
    || path.resolve(parent) !== parent || fs.realpathSync(parent) !== parent) throw Error('Private existing output parent required');
  return parent;
}
export function parseArguments(args, required, optional = []) {
  const result = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    if (![...required, ...optional].includes(key) || Object.hasOwn(result, key)) throw Error(`Unknown argument: ${key}`);
    if (!args[i + 1] || args[i + 1].startsWith('--')) throw Error(`Missing value for ${key}`);
    result[key] = args[i + 1];
  }
  for (const key of required) if (!result[key]) throw Error(`Require explicit ${key}`);
  return result;
}
export function validateSemanticBundle(root) {
  if (!root || !path.isAbsolute(root) || path.resolve(root) !== root) throw Error('Require explicit --bundle absolute existing directory');
  const bytes = readStatic(root, 'manifest.json'), manifest = JSON.parse(bytes);
  if (manifest.schemaVersion !== 1 || manifest.kind !== 'semantic-regression-32q' || !Array.isArray(manifest.files)
    || JSON.stringify(manifest.files.map(f => f.path).sort()) !== JSON.stringify([...SEMANTIC_FILES].sort())) throw Error('Invalid semantic manifest inventory');
  const allFiles = new Map(), files = new Map(), directories = new Set([root]), allDirectories = new Set([root]), modules = {};
  for (const entry of manifest.files) {
    safeRelative(entry.path);
    const content = readStatic(root, entry.path), file = path.join(root, entry.path);
    if (entry.bytes !== content.length || entry.sha256 !== sha256(content) || !path.isAbsolute(entry.sourcePath || '')) throw Error('Invalid manifest fingerprint: ' + entry.path);
    allFiles.set(file, content);
    const runtime = (STATIC_FILES.includes(entry.path) && entry.path !== BASELINE) || MODULE_FILES.includes(entry.path);
    if (runtime) files.set(file, content);
    let parent = path.dirname(file);
    while (true) { allDirectories.add(parent); if (runtime) directories.add(parent); if (parent === root) break; parent = path.dirname(parent); }
    if (MODULE_FILES.includes(entry.path)) modules[entry.path] = content.toString('utf8');
  }
  const walk = dir => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, e.name);
    if (e.isSymbolicLink()) throw Error('Symlink in manifest inventory');
    if (e.isDirectory() && allDirectories.has(file)) walk(file);
    else if (!allFiles.has(file) && file !== path.join(root, 'manifest.json')) throw Error('Unbound manifest inventory entry');
  } };
  walk(root); validateClosure(modules);
  const cases = semanticCases(allFiles.get(path.join(root, BASELINE)), allFiles.get(path.join(root, HOLDOUT20)));
  return { root, manifest, manifestHash: sha256(bytes), allFiles, files, directories, modules, cases };
}
export function namedReporter(guard, names) {
  const remaining = new Set(names);
  return (name, bytes) => {
    if (!remaining.has(name)) throw Error('Unbound or duplicate named output');
    guard.writeOutput(name, bytes); remaining.delete(name);
  };
}
export function assertCleanRuntime(guard) {
  if (guard.violations.length) throw Error('Offline guard violation (including swallowed attempts): ' + guard.violations.join('; '));
}
// Independent physical CSV parser, no retrieval/parser/formatter imports.
export function auditCsv(bytes) {
  const text = bytes.toString('utf8'), rows = [];
  let cells = [], cell = '', quoted = false, line = 1, start = 1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (c === ',' && !quoted) { cells.push(cell); cell = ''; }
    else if (c === '\n' && !quoted) { cells.push(cell.replace(/\r$/, '')); rows.push({ cells, line: start, endLine: line }); cells = []; cell = ''; line++; start = line; }
    else { cell += c; if (c === '\n') line++; }
  }
  if (quoted) throw Error('Unclosed audit CSV');
  if (cell || cells.length) { cells.push(cell); rows.push({ cells, line: start, endLine: line }); }
  const header = rows.shift()?.cells || [];
  return rows.map(r => ({ line: r.line, endLine: r.endLine, fields: Object.fromEntries(header.map((h, i) => [h, r.cells[i] || ''])) }));
}
export function inspectSemanticResponse(response, bundle) {
  const body = response.result?.structuredContent, markdown = body?.answer || '';
  let projected = response;
  // Domain envelopes omit the legacy renderer's routing scaffold. Reconstruct
  // only its closed metadata grammar; all body bytes still pass the old auditor.
  if (markdown.startsWith('Pytanie: ') && !Object.hasOwn(body, 'question')) {
    const route = /^Pytanie: ([^\n]*)\n\nGłówna KB: (\w+)\n(?:KB pomocnicze: ([^\n]+)\n)?\n([^\n]+)\n/.exec(markdown);
    const notes = ['To jest wstępna odpowiedź z lokalnych artefaktów KB.',
      'Routing zadziałał, ale w wybranych artefaktach startowych nie znaleziono mocnych lokalnych trafień tekstowych.'];
    const namespaces = [route?.[2], ...(route?.[3]?.split(', ') || [])];
    if (!route || !notes.includes(route[4]) || namespaces.some(n => !['OWAOntology', 'ComarchOptimaBusinessSemantics'].includes(n))) throw Error('Unbound legacy domain scaffold');
    const footer = markdown.split('\n\nPolecane artefakty:');
    if (footer.length !== 2) throw Error('Unbound legacy footer');
    const artifacts = footer[1] ? footer[1].split('\n- ').slice(1) : [];
    if (footer[1] !== artifacts.map(a => '\n- ' + a).join('') || artifacts.some(a => !STATIC_FILES.includes(a))) throw Error('Unbound legacy artifacts');
    const scope = /(?:^|\n\n)Zakres odpowiedzi:\n((?:- [^\n]+\n)+)\n/.exec(markdown);
    const answerNotes = scope ? scope[1].trimEnd().split('\n').map(n => n.slice(2)) : [];
    const noticePatterns = [
      /^Dla .+ w pokazanych fragmentach brak pokrycia: [\w, ]+\. To nie przesądza o zawartości pełnych źródeł\.$/u,
      /^Dla .+, żądane pole [\w.]+: w pokazanych dowodach brak pokrycia [\w, ]+\. Inne pola lub inny właściciel nie zastępują tego mapowania\.$/u,
      /^W pokazanych fragmentach brak pokrycia żądanych aspektów: [\w, ]+\. To nie przesądza o braku tych informacji w kompletnym źródle ani w całej bazie\.$/u,
      /^W pokazanych fragmentach brak żądanego pokrycia nazw w ich zakresie właściciela i aspektu: [\w., ]+\. Nie zastępuje go ogólny opis innych pól; nie przesądza to o pełnej zawartości źródeł\.$/u,
      /^W tej odpowiedzi nie pokazano lokalnych dowodów dla żądanego zakresu\. Nie przesądza to o zawartości całej bazy\.$/u,
    ];
    if (answerNotes.some(n => !noticePatterns.some(pattern => pattern.test(n)))) throw Error('Unbound legacy scope notice');
    projected = { ...response, result: { ...response.result, structuredContent: { ...body, question: route[1], primaryKb: route[2],
      supportKbs: route[3]?.split(', ') || [], note: route[4], recommendedArtifacts: artifacts, answerNotes } } };
  }
  const presentation = inspectResponse(projected);
  if (body.retrieval.backend !== 'local_artifacts' || body.externalEvidence?.length) throw Error('Offline acceptance requires local artifacts only');
  const records = [];
  for (const source of body.sources || []) {
    if (source.kind !== 'local_artifact') throw Error('Unbound nonlocal source');
    for (const record of source.records || [source]) {
      const bytes = bundle.files.get(path.join(bundle.root, record.artifact || ''));
      if (!bytes || record.contentHash !== 'sha256:' + sha256(bytes)) throw Error('Source artifact/hash mismatch');
      const rows = auditCsv(bytes), row = rows.find(r => r.fields.id === record.recordId
        && record.locator === (r.line === r.endLine ? `L${r.line}` : `L${r.line}-L${r.endLine}`));
      if (!row) throw Error('Source physical locator/identity mismatch');
      const namespace = record.artifact.startsWith('exports/owa_ontology/v1/') ? 'OWAOntology'
        : record.artifact.startsWith('exports/optima_business_semantics/v1/') ? 'ComarchOptimaBusinessSemantics' : null;
      if (!namespace || source.namespace !== namespace) throw Error('Source namespace mismatch');
      records.push({ sourceKey: source.key, artifact: record.artifact, recordId: record.recordId,
        locator: record.locator, contentHash: record.contentHash, physicalRowHash: sha256(JSON.stringify(row)), namespace });
    }
  }
  for (const unit of body.extracts || []) if (!records.some(r => r.sourceKey === unit.sourceKey && r.recordId === unit.recordId
    && r.artifact === unit.artifact && r.locator === (unit.line === (unit.endLine ?? unit.line)
      ? `L${unit.line}` : `L${unit.line}-L${unit.endLine}`))) throw Error('Extract/source record mismatch');
  return { ...presentation, actualSources: records };
}
