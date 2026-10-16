// Test infrastructure only. No production imports or implicit corpus discovery.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import http2 from 'node:http2';
import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns';
import dgram from 'node:dgram';
import cp from 'node:child_process';
import process from 'node:process';
import { register, syncBuiltinESMExports } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const BASELINE = 'docs/reference/OWA_SemanticKB_12Q_2026-10-15.json';
// Entire baseline bytes, not a regenerated question/criteria subset.
export const BASELINE_SHA256 = '4124f75b330142b6894637380e90589c78dec24362af721eedc45f57276221d2';
export const STATIC_FILES = Object.freeze([
  BASELINE, 'docs/reference/ERP_Knowledge_Assistant_Routing.json',
  'docs/reference/ERP_KB_Dashboard_KB_Registry.json',
  'docs/reference/OWAOntology.schema', 'docs/reference/OWAOntology.seed.md',
  'docs/reference/OWA_Order_to_Cash_v1.md', 'docs/reference/ComarchOptimaBusinessSemantics.schema',
  ...['ontology_entity', 'ontology_field', 'ontology_relation', 'workflow_pattern', 'chunk'].map(n => `exports/owa_ontology/v1/${n}.csv`),
  ...['business_description', 'code_meaning', 'business_rule', 'business_domain'].map(n => `exports/optima_business_semantics/v1/${n}.csv`),
]);
export const MODULE_FILES = Object.freeze([
  'scripts/erp_knowledge_answer.mjs', 'scripts/erp_knowledge_assistant.mjs',
  ...['erp_knowledge_mcp_core', 'erp_knowledge_mcp_profiles', 'knowledge_retrieval',
     'owa_query_context', 'owa_evidence', 'owa_answer_presentation', 'local_source_provenance', 'learning',
    'external_search', 'external_search_policy', 'knowledge_inbox', 'promoted_knowledge',
    'content_cleaner', 'provider_secrets', 'transient_retry', 'dashboard_automation',
    'dashboard_audit', 'feedback_learning', 'atomic_file'].map(n => `scripts/lib/${n}.mjs`),
]);
const BUILTINS = new Set(['fs', 'fs/promises', 'path', 'url', 'crypto', 'process', 'child_process']);
export const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export function safeRelative(value) {
  if (typeof value !== 'string' || !value || path.isAbsolute(value) || value.includes('\\')
      || value.split('/').some(p => !p || p === '.' || p === '..')) throw new Error('Unsafe manifest path');
  return value;
}
export function readStatic(root, relative) {
  safeRelative(relative);
  const file = path.join(root, relative);
  let current = root;
  if (fs.realpathSync(root) !== root) throw new Error('Symlink root');
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    if (fs.lstatSync(current).isSymbolicLink()) throw new Error('Symlink in fixture path');
  }
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size > 32 * 1024 * 1024) throw new Error('Unsafe static file size/type');
  return fs.readFileSync(file);
}
export function dependencies(source) {
  const statics = [...source.matchAll(/^\s*(?:import|export)\s+(?:[^;]*?\s+from\s*)?["']([^"']+)["']/gm)].map(m => m[1]);
  const dynamics = [...source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']/g)].map(m => m[1]);
  return [...statics, ...dynamics];
}
export function validateClosure(modules) {
  for (const [file, source] of Object.entries(modules)) for (const specifier of dependencies(source)) {
    if (BUILTINS.has(specifier.replace(/^node:/, ''))) continue;
    const target = specifier.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier)) : '';
    if (!Object.hasOwn(modules, target)) throw new Error(`Unbound module dependency closure: ${file} -> ${specifier}`);
  }
}
export function validateBundle(root) {
  if (!root || !path.isAbsolute(root)) throw new Error('Require explicit --bundle absolute existing directory');
  const manifestBytes = readStatic(root, 'manifest.json');
  const manifest = JSON.parse(manifestBytes);
  const expected = [...STATIC_FILES, ...MODULE_FILES].sort();
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.files)
      || JSON.stringify(manifest.files.map(f => f.path).sort()) !== JSON.stringify(expected)) throw new Error('Invalid manifest inventory');
  const files = new Map(), modules = {}, directories = new Set([root]);
  for (const entry of manifest.files) {
    safeRelative(entry.path);
    const bytes = readStatic(root, entry.path);
    if (entry.bytes !== bytes.length || entry.sha256 !== sha256(bytes)
        || typeof entry.sourcePath !== 'string' || !path.isAbsolute(entry.sourcePath)) throw new Error(`Invalid manifest fingerprint: ${entry.path}`);
    if (entry.path === BASELINE && entry.sha256 !== BASELINE_SHA256) throw new Error('Immutable baseline hash mismatch');
    files.set(path.join(root, entry.path), bytes);
    let parent = path.dirname(path.join(root, entry.path));
    while (parent.startsWith(root)) { directories.add(parent); if (parent === root) break; parent = path.dirname(parent); }
    if (MODULE_FILES.includes(entry.path)) modules[entry.path] = bytes.toString('utf8');
  }
  // Reject unmanifested files/directories and symlinks, including output left in a bundle.
  const walk = dir => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Symlink in manifest inventory');
    if (entry.isDirectory() && directories.has(file)) walk(file);
    else if (!files.has(file) && file !== path.join(root, 'manifest.json')) throw new Error('Unbound manifest inventory entry');
  } };
  walk(root);
  validateClosure(modules);
  const baseline = JSON.parse(files.get(path.join(root, BASELINE)));
  if (baseline.questions.length !== 12) throw new Error('Invalid baseline questions');
  return { root, manifest, manifestHash: sha256(manifestBytes), files, modules, directories, baseline };
}

export function inspectResponse(response) {
  if (response.error || response.result?.isError) throw new Error('RPC failure');
  const body = response.result?.structuredContent;
  const markdown = (response.result?.content || []).filter(p => p.type === 'text').map(p => p.text).join('\n');
  if (body?.answer !== markdown) throw new Error('Markdown/JSON parity failure');
  const backend = body?.retrieval?.backend;
  const externalBackend = ['external_search', 'local_artifacts_with_external_search'].includes(backend);
  if ((!externalBackend && backend !== 'local_artifacts') || body?.retrieval?.graphUsed !== false) throw new Error('Unsupported backend/graph');
  if (Object.hasOwn(body, 'externalEvidence') && !Array.isArray(body.externalEvidence)) throw new Error('Public external evidence array required');
  if (externalBackend !== Boolean(body.externalEvidence?.length)) throw new Error('Unbound external backend/evidence');
  if ((body.sources || []).length > 2 || (body.sources || []).some(s => !['OWAOntology', 'ComarchOptimaBusinessSemantics'].includes(s.namespace))) throw new Error('Source budget/scope');
  const compact = markdown.startsWith('Odpowiedź:\n\n');
  const legacy = markdown.startsWith('Pytanie: ');
  if (!compact && !legacy) throw new Error('Unrecognized answer layout');
  if (Object.hasOwn(body, 'extracts') && !Array.isArray(body.extracts)) throw new Error('Public extracts array required');
  if (compact && !Array.isArray(body.extracts)) throw new Error('Compact public extracts array required');
  let units;
  if (Array.isArray(body.extracts)) {
    units = inspectBoundPresentation(markdown, body, compact);
  } else {
    // Old captures predate public extract arrays. Retain their legacy parser;
    // never use it for compact or for a response claiming the new contract.
    units = inspectLegacyCapture(markdown, body);
  }
  const perSource = {}, countsByKey = new Map();
  for (const unit of units) {
    const count = (countsByKey.get(unit.sourceKey) || 0) + 1;
    countsByKey.set(unit.sourceKey, count);
    perSource[unit.source] = count; // Retain canonical display labels in the report.
  }
  if ([...countsByKey.values()].some(count => count > 3)) throw new Error('Source section budget');
  const extractCharacters = units.reduce((sum, unit) => sum + unit.text.length, 0);
  if (extractCharacters > 4000) throw new Error('Extract character budget');
  const external = body.externalEvidence || [];
  return { extractCharacters, perSource, sources: body.sources?.length || 0, units,
    externalCharacters: external.reduce((sum, item) => sum + (item.snippet || '').length, 0), externalResults: external.length };
}

function inspectLegacyCapture(markdown, body) {
  // Without authoritative arrays, delimiter-like source text is ambiguous.
  // Fail closed rather than discard the part after a counterfeit heading.
  for (const marker of ['Fragmenty treści źródeł:', 'Cytowane źródła', 'Ograniczenie prezentacji:', 'Polecane artefakty:'])
    if ([...markdown.matchAll(new RegExp(`(?:^|\\n\\n)${marker}`, 'g'))].length > 1) throw new Error('Ambiguous legacy framing');
  const marker = 'Fragmenty treści źródeł:\n\n', start = markdown.indexOf(marker);
  let matches = [];
  if (start !== -1) {
    const section = markdown.slice(start + marker.length).split(/\n\n(?:Ograniczenie prezentacji:|Cytowane źródła)/)[0];
    matches = [...section.matchAll(/^\[(S\d+)\] ([^\n]+), linie (\d+)–(\d+):\n([\s\S]*?)(?=\n\n\[S\d+\] |(?![\s\S]))/gm)];
    if (!matches.length) throw new Error('Unrecognized legacy extract body');
  }
  const sources = body.sources || [];
  const extracts = matches.map(m => ({ sourceKey: sources[Number(m[1].slice(1)) - 1]?.key,
    artifact: m[2], line: Number(m[3]), endLine: Number(m[4]), text: m[5] }));
  const projected = { ...body, sources, extracts, omissions: [] };
  if (markdown.startsWith('Pytanie: ')) {
    const route = /^Pytanie: ([^\n]*)\n\nGłówna KB: (\w+)\n(?:KB pomocnicze: ([^\n]+)\n)?/.exec(markdown);
    if (!route) throw new Error('Unbound legacy body routing');
    projected.question = route[1]; projected.primaryKb = route[2]; projected.supportKbs = route[3]?.split(', ') || [];
    if ([route[2], ...projected.supportKbs].some(ns => !['OWAOntology', 'ComarchOptimaBusinessSemantics'].includes(ns))) throw new Error('Unbound legacy body namespace');
    projected.note = body.evidence?.length ? 'To jest wstępna odpowiedź z lokalnych artefaktów KB.'
      : 'Routing zadziałał, ale w wybranych artefaktach startowych nie znaleziono mocnych lokalnych trafień tekstowych.';
    const recommendations = markdown.split('\n\nPolecane artefakty:')[1];
    if (recommendations == null) throw new Error('Unbound legacy body footer');
    projected.recommendedArtifacts = recommendations ? recommendations.split('\n- ').slice(1) : [];
    const allowed = new Set([...STATIC_FILES, ...sources.map(s => s.artifact), ...(body.evidence || []).map(e => e.artifact)]);
    if (projected.recommendedArtifacts.some(a => !allowed.has(a))) throw new Error('Unbound legacy body artifact');
    const omitted = markdown.split('\n\nOgraniczenie prezentacji:')[1]?.split('\n\n')[0];
    if (omitted) {
      const [heading, ...rows] = omitted.split('\n');
      if (heading !== ' pominięto całe fragmenty lub źródła; brakujące aspekty oceniono względem pokazanych dowodów.') throw new Error('Ambiguous legacy omission framing');
      projected.omissions = rows.map(row => {
        const m = /^- (sha256:[a-f0-9]{64}): (source_limit|section_limit|answer_budget)(?:; brak pokrycia: (\w+(?:, \w+)*))?(?![\s\S])/.exec(row);
        if (!m) throw new Error('Unbound legacy omission body');
        return { sourceKey: m[1], reason: m[2], uncoveredFacets: m[3]?.split(', ') || [] };
      });
    }
  }
  return inspectBoundPresentation(markdown, projected, false);
}

// Independent audit grammar, deliberately not imported from the formatter.
// Every emitted byte must be a bound unit or a known public-metadata scaffold.
// A cursor (not delimiter splitting or multiline `$`) consumes the whole input.
function inspectBoundPresentation(markdown, body, compact) {
  const sources = body.sources || [], expected = JSON.parse(JSON.stringify(body.extracts));
  const keys = sources.map(s => s.key);
  if (keys.some(k => typeof k !== 'string' || !k) || new Set(keys).size !== keys.length) throw new Error('Invalid source identity keys');
  if (!Array.isArray(body.omissions)) throw new Error('Public omissions array required');
  for (const unit of expected) if (typeof unit.text !== 'string' || !unit.text.length || !unit.sourceKey || !keys.includes(unit.sourceKey)) throw new Error('Unbound extract source key/text');
  let offset = 0;
  const scopeBodies = [];
  const take = (text, kind = 'body framing') => {
    if (!markdown.startsWith(text, offset)) throw new Error(`Unbound ${kind} at ${offset}`);
    offset += text.length;
  };
  const block = text => take(text + '\n\n');
  const unique = values => [...new Set(values)];
  const location = u => u.line != null ? `L${u.line}${u.endLine != null && u.endLine !== u.line ? `-L${u.endLine}` : ''}` : u.locator || 'lokalizacja nieznana';
  const coverage = body.owaCoverage || {}, assessment = body.evidenceAssessment || {};
  const backendLabel = body.retrieval?.backend === 'external_search' ? 'zewnętrzne wyszukiwanie'
    : body.retrieval?.backend === 'local_artifacts_with_external_search' ? 'lokalne artefakty KB i zewnętrzne wyszukiwanie' : 'lokalne artefakty KB';
  const externalBlock = () => {
    take('Zewnętrzne dowody live:\n');
    for (const [index, item] of body.externalEvidence.entries()) {
      if (index) take('\n');
      take(`- ${item.title} [${item.sourceType}] -> ${item.url}`, 'external title/type/URL');
      if (item.publishedDate) take(`\n  - opublikowano: ${item.publishedDate}`, 'external source date');
      if (item.snippet) take(`\n  - fragment: ${item.snippet}`, 'external full text');
    }
  };
  if (compact) {
    block('Odpowiedź:');
    if (body.retrieval?.backend !== 'local_artifacts') {
      if (body.note) block(body.note);
      block(`Źródło: ${backendLabel}; bez wykonania grafu KAG/OpenSPG.`);
    }
    const notes = unique([...(body.answerNotes || []), ...(coverage.notices || [])]).filter(n => n?.trim());
    if (notes.length) block(notes.join('\n'));
    if (assessment.status === 'insufficient_evidence') block('Brak wystarczających lokalnych dowodów dla pytania. Nie traktuj fragmentów jako potwierdzonej procedury.');
    const missing = unique([...(coverage.uncoveredFacets ?? coverage.missingFacets ?? []),
      ...body.omissions.flatMap(o => o.uncoveredFacets ?? o.missingFacets ?? [])]);
    if (coverage.status && (coverage.status !== 'covered' || missing.length)) block(`Pokrycie: ${coverage.status}.${missing.length ? ` Brak pokrycia: ${missing.join(', ')}.` : ''}`);
    for (const r of coverage.requirements || []) if (r.covered === false
        && !(!r.ownerId && !r.processId && !r.fieldName && missing.includes(r.facet)))
      block(`Brak pokrycia wymagania: ${[r.ownerId, r.processId, r.fieldName, r.facet].filter(Boolean).join(' / ')}.`);
    for (const l of coverage.limitations || []) {
      // Independently parse complete declarative note bodies. Query echoes and
      // arbitrary mentions of UNKNOWN/record IDs are not this grammar.
      const identity = [l.artifact, l.recordId].filter(Boolean).join(', ') || 'pokazany fragment';
      const conveyed = notes.some(note => {
        const unknown = /^Źródło \((.*)\) oznacza zakres „(.*)” jako UNKNOWN \/ do potwierdzenia; pokazany fragment nie potwierdza kompletnej wiedzy w tym zakresie\.$/u.exec(note);
        const ambiguous = /^Źródło \((.*)\) wskazuje konflikt lub niejednoznaczność w zakresie „(.*)”\. Pokazany fragment wymaga wyjaśnienia przed rozstrzygnięciem\.$/u.exec(note);
        const match = l.type === 'unknown' ? unknown : l.type === 'ambiguous' ? ambiguous : null;
        return match && match[1] === identity && (l.fieldNames || []).every(field => match[2].split(', ').includes(field));
      });
      if (conveyed) continue;
      block(`${String(l.type || 'ograniczenie').toUpperCase()}: ${[l.artifact, l.recordId, ...(l.fieldNames || [])].filter(Boolean).join(', ')}${l.relevant === false ? ' (zakres poboczny)' : ''}.`);
    }
    if (assessment.missingTerms?.length) block(`Brakujące terminy: ${assessment.missingTerms.join(', ')}.`);
    const reasons = unique([...(assessment.reasons || []), ...(coverage.reasons || [])]).filter(r => r !== 'text_matches_do_not_verify_claims');
    if (reasons.includes('invalid_csv')) block('Część źródeł CSV ma nieprawidłowy format i została pominięta.');
    if (body.freshnessNote) block(`Uwaga o świeżości: ${body.freshnessNote}`);
  } else {
    // Only the actual full legacy envelope is accepted. Domain captures without
    // arrays obtain routing scaffolding from the historical parser above.
    take(`Pytanie: ${body.question}\n\nGłówna KB: ${body.primaryKb}\n`);
    if (body.supportKbs?.length) take(`KB pomocnicze: ${body.supportKbs.join(', ')}\n`);
    take(`\n${body.note}\n`);
    if (body.retrieval) {
      take(`Źródło: ${backendLabel}; bez wykonania grafu KAG/OpenSPG.\n`);
      take('Confidence oznacza punktację wyszukiwania, nie prawdopodobieństwo poprawności.\n');
    }
    if (body.evidenceAssessment) {
      take((assessment.status === 'insufficient_evidence'
        ? 'Brak wystarczających lokalnych dowodów dla pytania. Nie traktuj fragmentów jako potwierdzonej procedury.'
        : 'Lokalne fragmenty wymagają weryfikacji; dopasowanie tekstu nie potwierdza prawdziwości twierdzeń.') + '\n');
      if (assessment.missingTerms?.length) take(`Brakujące terminy: ${assessment.missingTerms.join(', ')}.\n`);
      if (assessment.reasons?.includes('invalid_csv')) take('Część źródeł CSV ma nieprawidłowy format i została pominięta.\n');
    }
    take('\n');
    if (body.freshnessNote) block(`Uwaga o świeżości: ${body.freshnessNote}`);
    if (body.answerNotes?.length) {
      take('Zakres odpowiedzi:\n');
      for (const note of body.answerNotes) {
        take('- ');
        const start = offset;
        take(note);
        scopeBodies.push(markdown.slice(start, offset));
        take('\n');
      }
      take('\n');
    }
    if (body.evidence?.length) {
      take('Dowody z lokalnej KB:\n');
      for (const item of body.evidence) {
        take(`- ${item.kb} -> ${item.artifact}\n`);
        for (const hit of item.hits || []) if (!['local_artifact', 'external_url'].includes(hit.source?.kind))
          take(`  - ${hit.endLine > hit.line ? `linie ${hit.line}–${hit.endLine}` : `linia ${hit.line}`}: ${hit.snippet}\n`);
      }
      take('\n');
    }
    if (expected.length) take('Fragmenty treści źródeł:\n\n');
  }
  const units = [];
  for (const expectedUnit of expected) {
    const header = /^\[(S\d+)\] ([^\n]+):\n/.exec(markdown.slice(offset));
    if (!header) throw new Error('Missing extract unit header');
    const index = Number(header[1].slice(1)) - 1;
    if (header[1] !== `S${index + 1}`) throw new Error('Noncanonical source label');
    const sourceKey = sources[index]?.key;
    if (sourceKey !== expectedUnit.sourceKey) throw new Error('Extract source identity mismatch');
    const locator = expectedUnit.line != null ? `linie ${expectedUnit.line}–${expectedUnit.endLine ?? expectedUnit.line}` : location(expectedUnit);
    if (header[2] !== `${expectedUnit.artifact || 'artefakt nieznany'}, ${locator}`) throw new Error('Extract unit locator mismatch');
    offset += header[0].length;
    // Length-bound bytes prevent any heading in a source from ending the unit.
    const text = markdown.slice(offset, offset + expectedUnit.text.length);
    if (text !== expectedUnit.text) throw new Error('Extract unit text mismatch');
    offset += text.length;
    units.push({ source: header[1], sourceKey, text });
    take('\n\n', 'extract unit framing');
  }
  if (compact) {
    const auxiliary = [];
    for (const [itemIndex, item] of (body.evidence || []).entries()) {
      const parts = [];
      for (const [hitIndex, hit] of (item.hits || []).entries()) if (hit.snippet?.trim()) {
        const s = hit.source || {};
        parts.push(`- [H${hitIndex + 1}] ${location({ ...hit, locator: hit.locator || s.locator })}${s.sourceUrl ? `; ${s.sourceUrl}` : ''}:\n${hit.snippet}`);
      }
      // This exact byte comparison is confined to one original evidence item.
      // Different hit identities/versions and nonidentical excerpts all remain.
      if (item.excerpt?.trim() && !(item.hits || []).some(h => h.snippet === item.excerpt)) parts.push(`- [E] ${location(item)}:\n${item.excerpt}`);
      if (parts.length) auxiliary.push(`[A${itemIndex + 1}] ${item.kb || 'namespace nieznany'}; ${item.artifact || 'artefakt nieznany'}:\n\n${parts.join('\n\n')}`);
    }
    if (auxiliary.length) block('Dodatkowe dowody:\n\n' + auxiliary.join('\n\n'));
    if (!units.length && !auxiliary.length) block('Brak lokalnych dowodów dla żądanego zakresu.');
    if (body.externalEvidence?.length) { externalBlock(); take('\n\n'); }
    // This is the last mandatory body block; the remaining grammar is citation
    // metadata/omission counts only, never a free-form unbudgeted evidence tail.
    take('Źródła lokalne nie są świeżą weryfikacją ERP/MSSQL ani wykonaniem grafu KAG/OpenSPG.');
    const usedSources = sources.map((s, i) => ({ s, i, used: expected.filter(u => u.sourceKey === s.key) })).filter(v => v.used.length);
    if (usedSources.length) {
      take('\n\nŹródła:\n');
      for (const [n, { s, i, used }] of usedSources.entries()) {
        if (n) take('\n');
        take(`- [S${i + 1}] ${s.title || used.map(u => u.recordId).filter(Boolean).join(', ')} — ${s.namespace}; `);
        take(unique(used.map(u => `${u.artifact || 'artefakt nieznany'} ${location(u)}; rekord ${u.recordId || 'nieznany'}`)).join('; '));
        if (s.sourceUrl) take(`; ${s.sourceUrl}`);
        const unknown = [];
        for (const [key, label] of [['publication', 'Publikacja'], ['update', 'Aktualizacja'], ['retrieved', 'Pobranie']]) {
          if (s[key]?.value) take(`; ${label}: ${s[key].value}${s[key].timezone ? ` (${s[key].timezone})` : ''}`);
          else unknown.push(label.toLowerCase());
        }
        if (unknown.length) take(`. Nieznane daty źródłowe: ${unknown.join(', ')}.`);
      }
    }
    if (body.omissions.length) {
      const counts = new Map();
      for (const o of body.omissions) counts.set(o.reason, (counts.get(o.reason) || 0) + 1);
      const labels = { source_limit: 'limit źródeł', section_limit: 'limit sekcji', budget: 'budżet' };
      const reasons = [...counts].map(([reason, count]) => `${Object.hasOwn(labels, reason) ? labels[reason] : reason}: ${count}`).join('; ');
      take(`\n\nPominięcia: ${body.omissions.length} jednostek (${reasons}). Szczegóły w danych strukturalnych.`);
    }
  } else {
    if (body.omissions.length) {
      take('Ograniczenie prezentacji: pominięto całe fragmenty lub źródła; brakujące aspekty oceniono względem pokazanych dowodów.\n');
      for (const o of body.omissions) {
        const missing = o.uncoveredFacets ?? o.missingFacets;
        take(`- ${o.sourceKey}: ${o.reason}${missing?.length ? `; brak pokrycia: ${missing.join(', ')}` : ''}\n`);
      }
      take('\n');
    }
    if (sources.length) {
      take('Cytowane źródła (daty źródłowe, nie daty wejścia w życie):\n');
      for (const [i, s] of sources.entries()) {
        take(`- [S${i + 1}] ${s.title || s.recordIds.join(', ')} — ${s.namespace}\n`);
        if (s.kind === 'local_artifact') {
          for (const r of s.records || [s]) take(`  Źródło lokalne: ${r.artifact}, ${r.locator}\n  Rekord: ${r.recordId}; hash: ${r.contentHash}\n`);
          if (s.owningPath) take(`  Dokument właścicielski: ${s.owningPath}\n`);
        } else take(`  URL: ${s.sourceUrl}\n`);
        for (const [key, label] of [['publication', 'Publikacja'], ['update', 'Aktualizacja'], ['retrieved', 'Pobranie']]) {
          const d = s[key];
          take(`  ${label}: ${d.value || `nieznana (${d.reason})`}; podstawa: ${d.basis}${d.value ? `; precyzja: ${d.precision}; strefa: ${d.timezone || 'nie dotyczy'}` : ''}\n`);
        }
      }
      take('\n');
    }
    if (body.externalEvidence?.length) { externalBlock(); take('\n\n'); }
    take('Polecane artefakty:' + (body.recommendedArtifacts || []).map(a => `\n- ${a}`).join(''));
  }
  if (offset !== markdown.length) throw new Error('Unbound body text after presentation framing');
  // Only parsed note bodies and exact consumed source-unit text can satisfy a
  // required notice. Query echoes, unit headers, citations and omissions cannot.
  if (!compact) for (const notice of coverage.notices || []) {
    if (notice?.trim() && !scopeBodies.some(text => text.includes(notice)) && !units.some(unit => unit.text.includes(notice)))
      throw new Error('Missing substantive public legacy condition/notice');
  }
  return units;
}

// A closed virtual read filesystem: no runtime OS read, even for metadata misses.
// All runtime writes fail. Only the runner retains a private output capability.
export function installRuntimeGuard({ root, output, files, directories }) {
  const saved = [], violations = [], reads = [];
  const originalOpen = fs.openSync.bind(fs), originalWrite = fs.writeSync.bind(fs), originalClose = fs.closeSync.bind(fs);
  const deny = op => { violations.push(op); throw new Error(`Offline guard: ${op}`); };
  const patch = (object, key, value) => { saved.push([object, key, object[key]]); object[key] = value; };
  const block = (object, keys) => keys.forEach(key => { if (typeof object[key] === 'function') patch(object, key, () => deny(key)); });
  const locate = value => {
    if (value instanceof URL) value = fileURLToPath(value);
    if (typeof value !== 'string' || !path.isAbsolute(value)) return deny('read descriptor/relative path');
    const resolved = path.resolve(value);
    if (!resolved.startsWith(root + path.sep) && resolved !== root) return deny(`outside read ${resolved}`);
    if (files.has(resolved) || directories.has(resolved)) return resolved;
    // Routing's two legacy directory locators are deliberately absent, not copied.
    if (['downloads/knowledge_inbox/2026-07-15', 'downloads/knowledge_inbox/2026-07-17'].some(p => resolved === path.join(root, p))) {
      const error = new Error('Frozen artifact absent'); error.code = 'ENOENT'; throw error;
    }
    return deny(`unbound read ${resolved}`);
  };
  const read = (value, options) => {
    const file = locate(value), bytes = files.get(file);
    if (!bytes) return deny('directory content read');
    reads.push(path.relative(root, file));
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? bytes.toString(encoding) : Buffer.from(bytes);
  };
  const stat = value => {
    const file = locate(value);
    return { size: files.get(file)?.length || 0, isFile: () => files.has(file), isDirectory: () => directories.has(file), isSymbolicLink: () => false };
  };
  for (const object of [fs, fs.promises]) {
    // Default deny every filesystem function; enable only the closed read surface.
    block(object, Object.keys(object).filter(k => !['constants', 'promises'].includes(k)));
  }
  patch(fs, 'readFileSync', read);
  patch(fs, 'readFile', (file, options, cb) => { if (typeof options === 'function') { cb = options; options = undefined; } try { cb(null, read(file, options)); } catch (e) { cb(e); } });
  patch(fs.promises, 'readFile', async (file, options) => read(file, options));
  for (const name of ['stat', 'lstat']) {
    patch(fs, name + 'Sync', stat);
    patch(fs.promises, name, async value => stat(value));
  }
  patch(fs, 'existsSync', value => { try { locate(value); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } });
  patch(fs, 'realpathSync', locate);
  patch(fs.promises, 'realpath', async value => locate(value));
  block(globalThis, ['fetch', 'WebSocket']);
  block(http, ['request', 'get', 'createServer']); block(https, ['request', 'get', 'createServer']);
  block(http2, ['connect', 'createServer', 'createSecureServer']);
  block(net, ['connect', 'createConnection', 'createServer']); block(net.Socket.prototype, ['connect']);
  block(tls, ['connect', 'createSecurePair', 'createServer']); block(dgram, ['createSocket']);
  block(dns, Object.keys(dns)); block(dns.promises, Object.keys(dns.promises));
  block(cp, ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']);
  block(process, ['dlopen', 'binding', '_linkedBinding', 'chdir', 'kill']);
  syncBuiltinESMExports();
  return {
    violations, reads,
    writeOutput(relative, bytes) {
      if (!/^[a-zA-Z0-9_.-]+$/.test(relative) || relative === '.' || relative === '..') return deny('output traversal');
      const fd = originalOpen(path.join(output, relative), 'wx', 0o600);
      try {
        const buffer = Buffer.from(bytes);
        let offset = 0;
        while (offset < buffer.length) offset += originalWrite(fd, buffer, offset, buffer.length - offset);
      } finally { originalClose(fd); }
    },
    restore() { for (const [object, key, value] of saved.reverse()) object[key] = value; syncBuiltinESMExports(); },
  };
}

export function registerFrozenModules(bundle) {
  const sources = Object.fromEntries(Object.entries(bundle.modules).map(([file, source]) => [pathToFileURL(path.join(bundle.root, file)).href, source]));
  const learning = pathToFileURL(path.join(bundle.root, 'scripts/lib/learning.mjs')).href;
  const answer = pathToFileURL(path.join(bundle.root, 'scripts/erp_knowledge_answer.mjs')).href;
  const stub = pathToFileURL(path.join(bundle.root, 'fixture-learning-writer.mjs')).href;
  sources[stub] = `export { computeConfidenceScore, CONFIDENCE_LOW_THRESHOLD } from ${JSON.stringify(learning)}; export function recordLearningGap() { globalThis.owaBlockedLearningCalls = (globalThis.owaBlockedLearningCalls || 0) + 1; return null; }`;
  // Loader serves manifest-verified bytes from memory. Never next() for a file,
  // package, data URL or unknown builtin; even computed imports fail closed.
  register(`data:text/javascript,${encodeURIComponent(`
    let sources, builtins;
    export function initialize(data) { sources = data.sources; builtins = new Set(data.builtins); }
    export async function resolve(specifier, context) {
      const builtin = specifier.replace(/^node:/, '');
      if (builtins.has(builtin)) return { url: 'node:' + builtin, shortCircuit: true };
      let url; try { url = new URL(specifier, context.parentURL).href; } catch {}
      if (context.parentURL === ${JSON.stringify(answer)} && url === ${JSON.stringify(learning)}) url = ${JSON.stringify(stub)};
      if (!Object.hasOwn(sources, url)) throw new Error('Offline module closure: ' + specifier);
      return { url, shortCircuit: true };
    }
    export async function load(url, context, next) {
      if (url.startsWith('node:') && builtins.has(url.slice(5))) return next(url, context);
      if (!Object.hasOwn(sources, url)) throw new Error('Offline module closure load');
      return { format: 'module', source: sources[url], shortCircuit: true };
    }
  `)}`, import.meta.url, { data: { sources, builtins: [...BUILTINS] } });
}
