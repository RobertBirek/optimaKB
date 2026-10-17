#!/usr/bin/env node
// All source data is synthetic. Only disposable fixture setup/cleanup may write.
import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import childProcess from 'node:child_process';
import { register, syncBuiltinESMExports } from 'node:module';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = fs.mkdtempSync(path.join(repo, '.superpowers/sdd/task4-fixture-'));
process.env.ROOT = root;
process.env.EXA_AUTO_DRAFT = '0';
process.env.ENABLE_LIVE_LEARNING = '0';
process.env.LEARNING_ENABLED = '0';
process.env.EXA_PROVIDER = 'api';
delete process.env.EXA_API_KEY;
delete process.env.EXA_MCP_COMMAND;
let forbiddenCalls = 0;
const saved = [];
function block(object, key) {
  saved.push([object, key, object[key]]);
  object[key] = () => { forbiddenCalls++; throw new Error(`Forbidden ${key}`); };
}
for (const [object, keys] of [[globalThis, ['fetch']], [http, ['request', 'get']],
  [https, ['request', 'get']], [net.Socket.prototype, ['connect']],
  [childProcess, ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']]]) {
  for (const key of keys) block(object, key);
}
syncBuiltinESMExports();
const kb = 'OWAOntology', support = 'ComarchOptimaBusinessSemantics';
const artifact = type => `exports/owa_ontology/v1/${type}.csv`;
const response = { primaryKb: { name: kb, artifacts: [] }, supportKbs: [{ name: support, artifacts: [] }] };
function write(file, value) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value);
}
function csv(rows) {
  const keys = [...new Set(rows.flatMap(Object.keys))];
  return [keys, ...rows.map(row => keys.map(key => row[key] || ''))]
    .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n') + '\n';
}
write('docs/reference/ERP_Knowledge_Assistant_Routing.json', fs.readFileSync(path.join(repo, 'docs/reference/ERP_Knowledge_Assistant_Routing.json')));
const entities = [
  { id: 'signal-owner', canonicalName: 'OWAOntology.SignalCard', name: 'Karta sygnału', description: '## Identyfikatory\nKlucz karty: Signal_Key.' },
  { id: 'plain-owner', canonicalName: 'OWAOntology.PlainCard', name: 'Karta prosta', description: 'Krótki kompletny opis karty bez dalszych sekcji.' },
  { id: 'tie-a', canonicalName: 'OWAOntology.FirstCard', aliases: 'Wspólna karta', description: 'Pierwsza karta.' },
  { id: 'tie-b', canonicalName: 'OWAOntology.SecondCard', aliases: 'Wspólna karta', description: 'Druga karta.' },
  { id: 'full-owner', canonicalName: 'OWAOntology.FullCard', mainTable: 'CDN.SyntheticCard', description: '## Mapowanie pól\nCDN.SyntheticCard: Signal_Key jest identyfikatorem karty.\n\n## Proces\nPZ → FZ: Skutek zależy od powiązania dokumentów.\n\n## Reguły\nHistoryczny status CONFIRMED jest deklaracją źródła.' },
  { id: 'mixed-owner', canonicalName: 'OWAOntology.MixedLedger', description: '## Pola\nReady_Flag: CONFIRMED — mapowanie ReadyFlag.\nOther_Flag: UNKNOWN — do potwierdzenia.\nBrak konfliktów mapowania.' },
  { id: 'amber-owner', canonicalName: 'OWAOntology.AmberLedger', name: 'Księga bursztynowa', aliases: 'AmberBook', description: '## Mapowanie pól\nAmber_Key: identyfikator księgi bursztynowej.' },
  { id: 'cobalt-owner', canonicalName: 'OWAOntology.CobaltLedger', name: 'Księga kobaltowa', aliases: 'CobaltBook', description: '## Mapowanie pól\nCobalt_Key: kwalifikowane mapowanie. ' + 'z'.repeat(4100) },
  { id: 'ivory-owner', canonicalName: 'OWAOntology.IvoryLedger', description: '## Mapowanie pól\nIvory_Key: identyfikator księgi jasnej.' },
  { id: 'contrast-unknown', canonicalName: 'OWAOntology.ContrastUnknown', description: '## Enum pola\nReady_Flag: not CONFIRMED but UNKNOWN.' },
  { id: 'contrast-conflict', canonicalName: 'OWAOntology.ContrastConflict', description: '## Enum pola\nReady_Flag: not UNKNOWN but CONFLICT.' },
  { id: 'copper-owner', canonicalName: 'OWAOntology.CopperCard', description: '## Mapowanie pól\nReady_Flag → CopperReady.' },
  { id: 'slate-owner', canonicalName: 'OWAOntology.SlateCard', description: '## Mapowanie pól\nReady_Flag → SlateReady. ' + 's'.repeat(4100) },
  { id: 'pearl-owner', canonicalName: 'OWAOntology.PearlCard', description: '## Mapowanie pól\nReady_Flag → PearlReady.' },
  { id: 'bridge-owner', canonicalName: 'OWAOntology.BridgeCard', description: '## Mapowanie pól\nReady_Flag → ReadyValue.\n\n## Proces\nPZ → FZ: tylko dla powiązanych dokumentów.' },
  { id: 'bridge-peer', canonicalName: 'OWAOntology.BridgePeer', description: '## Mapowanie pól\nReady_Flag → PeerReady.' },
  { id: 'bridge-long-flow', canonicalName: 'OWAOntology.BridgeLongFlow', description: '## Mapowanie pól\nReady_Flag → ReadyValue.\n\n## Proces\nPZ → FZ: warunek. ' + 'w'.repeat(4100) },
  { id: 'bridge-long-field', canonicalName: 'OWAOntology.BridgeLongField', description: '## Mapowanie pól\nReady_Flag → ReadyValue. ' + 'f'.repeat(4100) + '\n\n## Proces\nPZ → FZ: tylko dla powiązanych dokumentów.' },
  { id: 'bridge-unknown-flow', canonicalName: 'OWAOntology.BridgeUnknownFlow', description: '## Mapowanie pól\nReady_Flag → ReadyValue.\n\n## Proces\nPZ → FZ: tylko dla powiązanych dokumentów.\nWorkflow_Stage: UNKNOWN.' },
];
write(artifact('ontology_entity'), csv(entities));
write(artifact('ontology_field'), csv([{ id: 'signal-field', entityRefId: 'signal-owner', fieldName: 'State_Tag',
  mssqlColumn: 'Sig_State', mappingStatus: 'UNKNOWN', description: 'Enum State_Tag: UNKNOWN — komplet dopuszczalnych wartości do potwierdzenia.' }]));
write('exports/optima_business_semantics/v1/business_description.csv', csv([{ id: 'generic', title: 'Karty',
  content: 'GENERIC_SUBSTITUTE: OWA karta mapowanie pola proces status dokumentu PZ FZ CDN.SyntheticCard.' },
{ id: 'slate-other', content: 'OWAOntology.SlateCard: mapowanie pól Other_Flag → SlateOther.' }]));

// ENABLE_LIVE_LEARNING=0 labels gaps as testpack but does not disable writes.
// Isolate only that side-effect export; use the actual confidence implementation.
const learningUrl = new URL('./lib/learning.mjs', import.meta.url).href;
const blockedLearning = new URL(`file://${path.join(root, 'blocked-learning.mjs')}`).href;
write('blocked-learning.mjs', `export { computeConfidenceScore, CONFIDENCE_LOW_THRESHOLD } from ${JSON.stringify(learningUrl)};
export function recordLearningGap() { globalThis.owaBlockedLearningCalls = (globalThis.owaBlockedLearningCalls || 0) + 1; return null; }`);
register(`data:text/javascript,${encodeURIComponent(`export async function resolve(specifier, context, next) {
  if (specifier === './lib/learning.mjs' && context.parentURL?.endsWith('/scripts/erp_knowledge_answer.mjs'))
    return { url: ${JSON.stringify(blockedLearning)}, shortCircuit: true };
  return next(specifier, context);
}`)}`, import.meta.url);

const { parseOwaQuestion } = await import('./lib/owa_query_context.mjs');
const { semanticIntentForTool } = await import('./lib/semantic_request_intent.mjs');
const evidenceApi = await import('./lib/owa_evidence.mjs');
const api = await import('./erp_knowledge_answer.mjs');
const { handleJsonRpcRequest, listToolsForProfile } = await import('./lib/erp_knowledge_mcp_core.mjs');
const { getMcpProfile } = await import('./lib/erp_knowledge_mcp_profiles.mjs');
const profile = getMcpProfile('erp-semantic-mcp');
// Runtime synchronous reads are restricted to the fixture; all runtime writes fail.
const readFileSync = fs.readFileSync;
saved.push([fs, 'readFileSync', readFileSync]);
fs.readFileSync = (file, ...args) => {
  if (!path.resolve(String(file)).startsWith(root + path.sep)) {
    forbiddenCalls++; throw new Error('Outside fixture read');
  }
  return readFileSync(file, ...args);
};
for (const key of ['writeFileSync', 'appendFileSync', 'renameSync', 'mkdirSync']) block(fs, key);
for (const key of ['writeFile', 'appendFile', 'rename', 'mkdir']) block(fs.promises, key);
syncBuiltinESMExports();
after(() => {
  for (const [object, key, value] of saved.reverse()) object[key] = value;
  syncBuiltinESMExports();
  fs.rmSync(root, { recursive: true, force: true });
});

const rows = entities.map(fields => ({ namespace: kb, artifact: artifact('ontology_entity'), fields }));
function assess(question, units = [], selection = null) {
  assert.equal(typeof evidenceApi.assessOwaCoverage, 'function', 'coverage assessment export');
  const context = parseOwaQuestion(question);
  return evidenceApi.assessOwaCoverage(context, selection || evidenceApi.selectOwaEvidence(context, rows), units);
}
function gathered(question, supportArtifacts = []) {
  const routed = { ...response, primaryKb: { name: kb, artifacts: ['ontology_entity', 'ontology_field', 'chunk', 'workflow_pattern'].map(artifact) },
    supportKbs: [{ name: support, artifacts: supportArtifacts }] };
  const evidence = api.gatherEvidence(routed, api.extractTerms(question), api.extractFocusHints(question), new Set([kb, support]), [], parseOwaQuestion(question));
  return { evidence, answer: api.buildPragmaticAnswer(question, routed, evidence) };
}
function localItem(text, facets, { units = null, snippet = 'HIDDEN_PREVIEW', id = 'unit-row' } = {}) {
  const row = { namespace: kb, artifact: artifact('chunk'), line: 2, endLine: 6, contentHash: `sha256:${'a'.repeat(64)}`,
    fields: { id, sourceDocumentRefId: 'full-owner', content: text } };
  const hit = { line: 2, endLine: 6, score: 5, snippet, bodyField: 'content', bodyText: text,
    source: { recordId: id, sourceUrl: null } };
  Object.defineProperty(hit, 'owa', { value: { row, units: units || facets.map(facet => ({ text, facet })), facets, ownerIds: ['full-owner'] } });
  return { kb, artifact: row.artifact, contentHash: row.contentHash, hits: [hit], excerpt: snippet };
}

test('offline integration: longer arrow path preserves known requested subpath and same-record stock effect', () => {
  const context = parseOwaQuestion('OWA proces RO → FS i skutek magazynowy');
  const row = { namespace: kb, artifact: artifact('chunk'), fields: { id: 'path-unit', content:
    '## Relacje\nRO generuje ruch magazynowy — zmniejsza stan tylko po zatwierdzeniu.\n\n## Uwagi\nXQ → RO → FS: dokument wynikowy zależy od powiązania.' } };
  const units = evidenceApi.owaUnitsForRow(context, row);
  assert(units.some(u => u.text.includes('XQ → RO → FS')));
  assert(units.some(u => u.text.includes('zmniejsza stan tylko po zatwierdzeniu')));
  const reverse = { ...row, fields: { ...row.fields, content: row.fields.content.replace('XQ → RO → FS', 'XQ → FS → RO') } };
  assert.equal(evidenceApi.owaUnitsForRow(context, reverse).length, 0);
});
test('offline integration: overview includes definition and declared verification of a short mapping-free source', () => {
  const context = parseOwaQuestion('Co opisuje OWAOntology.ShortSample i czy zawiera pełne mapowanie pól?');
  const row = { namespace: kb, artifact: artifact('chunk'), fields: { id: 'short-unit', content:
    '# Karta\n\n## Status weryfikacji\nStatus: częściowo-zweryfikowane\n\n## Opis biznesowy\nDefinicje próbne.\n\n## Źródła danych\nTabela CDN.SampleDefs, dowód MSSQL.' } };
  const units = evidenceApi.owaUnitsForRow(context, row);
  assert(units.some(u => u.text.includes('Definicje próbne.')));
  assert(units.some(u => u.text.includes('częściowo-zweryfikowane')));
});
test('offline integration: neutral open-problems heading is not an asserted conflict', () => {
  const c = parseOwaQuestion('OWAOntology.FullCard enum pola Ready_Flag');
  const selection = evidenceApi.selectOwaEvidence(c, rows);
  const result = evidenceApi.assessOwaCoverage(c, selection, [{ text: '## Otwarte problemy i konflikty\nReady_Flag: UNKNOWN.', facets: ['fields', 'unknownEnums'] }]);
  assert(!result.reasons.includes('source_explicit_ambiguity'));
  assert(result.reasons.includes('source_explicit_unknown'));
  const meta = evidenceApi.assessOwaCoverage(c, selection, [{ text: '- [x] Konflikty i braki oznaczone.', facets: ['fields'] }]);
  assert(!meta.reasons.includes('source_explicit_ambiguity'));
});
for (const marker of ['UNKNOWN', 'CONFLICT']) for (const annotation of ['oznaczone do ponownej analizy', 'marked for review', 'tagged for review', 'labelled for review']) {
  test(`F1 review: checked substantive ${marker} survives ${annotation}`, () => {
    const q = 'OWAOntology.FullCard enum pola `Ready_Flag`';
    const c = parseOwaQuestion(q);
    const text = `## Enum pola\n- [x] Ready_Flag: ${marker} — ${annotation}.`;
    const sourceUnits = evidenceApi.owaUnitsForRow(c, { artifact: artifact('chunk'), fields: { content: text } });
    const item = localItem(text, sourceUnits.map(u => u.facet), { units: sourceUnits });
    const evidence = [item];
    Object.defineProperty(evidence, 'owaSelection', { value: evidenceApi.selectOwaEvidence(c, [...rows, item.hits[0].owa.row]) });
    const answer = api.buildPragmaticAnswer(q, response, evidence);
    const serialized = JSON.parse(JSON.stringify(answer));
    assert.equal(serialized.owaCoverage.status, marker === 'UNKNOWN' ? 'unknown' : 'ambiguous');
    assert(serialized.evidenceAssessment.reasons.includes(marker === 'UNKNOWN' ? 'source_explicit_unknown' : 'source_explicit_ambiguity'));
    assert(serialized.owaCoverage.limitations.some(l => l.relevant && l.fieldNames.includes('Ready_Flag')));
    assert(serialized.extracts.some(u => u.text.includes(text)), 'retain the complete checked assertion and its qualifier');
    assert(api.renderAnswerMarkdown(serialized).includes(text));
  });
}
test('F1 review: neutral annotation and a separate substantive field assertion are assessed independently', () => {
  const text = '## Enum pola\n- [x] Konflikty i braki oznaczone.\n- [x] Ready_Flag: UNKNOWN — marked for review.';
  const result = assess('OWAOntology.FullCard enum pola `Ready_Flag`', [{ text, facets: ['fields', 'unknownEnums'] }]);
  assert.equal(result.status, 'unknown');
  assert(result.reasons.includes('source_explicit_unknown'));
  assert(!result.reasons.includes('source_explicit_ambiguity'));
});
for (const content of [
  '## Zakupy\nPZ generuje ruch magazynowy — zwiększa stan w magazynie docelowym.',
  '## RO — dokument\nPZ generuje ruch magazynowy — zwiększa stan tylko po zatwierdzeniu.',
  '## Zakupy PZ\nZwiększa stan magazynowy tylko po zatwierdzeniu.',
  '## Zakupy\nPZ zmniejsza stan magazynowy; RO jest tylko dokumentem powiązanym.',
]) test(`F2 review: unrelated same-record stock companion is excluded (${content.split('\n')[0]})`, () => {
  const c = parseOwaQuestion('OWA proces RO → FS i skutek magazynowy');
  const forward = '## Sprzedaż\nRO → FS: tylko dla powiązanych dokumentów.';
  const row = { namespace: kb, artifact: artifact('chunk'), fields: { id: 'mixed-stock',
    content: '# Katalog RO\n\n' + content + '\n\n' + forward } };
  const units = evidenceApi.owaUnitsForRow(c, row);
  assert(units.some(u => u.text.includes(forward)));
  assert(units.every(u => !u.text.includes('stan magazynowy') && !u.text.includes('ruch magazynowy')));
});
test('F2 review: requested-code section scopes an otherwise unnamed stock effect without removing qualification', () => {
  const c = parseOwaQuestion('OWA proces RO → FS i skutek magazynowy');
  const stock = '## Skutek RO\nZmniejsza stan magazynowy tylko po zatwierdzeniu; bez zatwierdzenia brak skutku.';
  const row = { namespace: kb, artifact: artifact('chunk'), fields: { id: 'scoped-stock', content: stock + '\n\n## Proces\nRO → FS: warunek.' } };
  assert(evidenceApi.owaUnitsForRow(c, row).some(u => u.text.includes(stock)));
});
for (const [name, stock, eligible] of [
  ['nested foreign', '## Skutek RO\n### Zakupy PZ\nZwiększa stan magazynowy tylko po zatwierdzeniu.', false],
  ['nested requested', '## Skutek RO\n### Realizacja RO\nZmniejsza stan magazynowy tylko po zatwierdzeniu; inaczej brak skutku.', true],
  ['no-code safe inheritance', '## Skutek RO\n### Warunki\n#### Zatwierdzenie\nZmniejsza stan magazynowy tylko po zatwierdzeniu.', true],
  ['no-code foreign inheritance', '## Skutek RO\n### Zakupy PZ\n#### Warunki\nZwiększa stan magazynowy tylko po zatwierdzeniu.', false],
  ['explicit foreign subject', '## Skutek RO\n### Warunki\nPZ generuje ruch magazynowy — zwiększa stan tylko po zatwierdzeniu.', false],
  ['explicit requested under foreign heading', '## Skutek RO\n### Zakupy PZ\nRO zmniejsza stan magazynowy tylko po zatwierdzeniu.', false],
  ['mixed atomic unit', '## Skutek RO\n### Realizacja RO\nZmniejsza stan magazynowy tylko po zatwierdzeniu.\n### Zakupy PZ\nZwiększa stan magazynowy wyłącznie dla dostaw.', false],
  ['sibling scope reset', '## Skutek RO\n### Zakupy PZ\nOpis odrębnej gałęzi.\n### Warunki\nZmniejsza stan magazynowy tylko po zatwierdzeniu.', true],
  ['foreign sibling', '## Skutek RO\n### Realizacja RO\nOpis powiązania.\n### Zakupy PZ\nZwiększa stan magazynowy tylko po zatwierdzeniu.', false],
]) test(`F2-R review: nearest active heading (${name})`, () => {
  const c = parseOwaQuestion('OWA proces RO → FS i skutek magazynowy');
  const forward = '## Sprzedaż\nRO → FS: tylko dla powiązanych dokumentów.';
  const row = { namespace: kb, artifact: artifact('chunk'), fields: { id: 'nested-scope', content: stock + '\n\n' + forward } };
  const units = evidenceApi.owaUnitsForRow(c, row);
  assert(units.some(u => u.text.includes(forward)));
  if (eligible) assert(units.some(u => u.text === stock), 'retain the entire nested unit and its conditions');
  else assert(units.every(u => !u.text.includes('stan magazynowy') && !u.text.includes('ruch magazynowy')), 'omit the whole incompatible atomic unit');
});
test('F2-R review: actual selection/build/JSON/render cannot expose the good half of a conflicting atomic stock unit', () => {
  const q = 'OWAOntology.FullCard proces RO → FS i skutek magazynowy';
  const c = parseOwaQuestion(q);
  const stock = '## Skutek RO\n### Realizacja RO\nZmniejsza stan magazynowy po zatwierdzeniu.\n### Zakupy PZ\nZwiększa stan magazynowy tylko po przyjęciu.';
  const forward = '## Sprzedaż\nRO → FS: tylko dla powiązanych dokumentów.';
  const body = stock + '\n\n' + forward;
  const units = evidenceApi.owaUnitsForRow(c, { artifact: artifact('chunk'), fields: { content: body } });
  const item = localItem(body, units.map(u => u.facet), { units });
  const evidence = [item];
  Object.defineProperty(evidence, 'owaSelection', { value: evidenceApi.selectOwaEvidence(c, [...rows, item.hits[0].owa.row]) });
  const answer = JSON.parse(JSON.stringify(api.buildPragmaticAnswer(q, response, evidence)));
  const md = api.renderAnswerMarkdown(answer);
  assert(md.includes(forward));
  assert(!md.includes('Zmniejsza stan magazynowy') && !md.includes('Zwiększa stan magazynowy'));
  assert(!JSON.stringify(answer).includes('tylko po przyjęciu'), 'private source preview cannot leak the rejected unit');
});
test('offline integration: generic source-free mapping evidence is explicitly limited to the shown source', () => {
  const q = 'Co opisuje OWAOntology.PlainCard i czy zawiera pełne mapowanie pól?';
  const { answer } = gathered(q);
  assert.match(answer.answerNotes.join('\n'), /mapowani[aeu].*p[oó]l|p[oó]l.*mapowani/iu);
  assert.match(api.renderAnswerMarkdown(answer), /Krótki kompletny opis/);
});
test('offline integration: requested process structure and tables outrank operation catalogues within three sections', () => {
  const q = 'OWAOntology.FullCard etapy workflow dokumentu, historię i tabele';
  const text = [
    '## Endpointy MCP\nWorkflow etapy dokumentu historię: katalog endpointów, nie ich wykonanie.',
    '## Struktura procesu\nKażdy typ dokumentu ma własną definicję etapów.',
    '## Źródła danych\nTabela SampleStages i SampleHistory przechowuje etapy i historię.',
    '## Reguły biznesowe\nSample_Required oznacza etap wymagany.',
  ];
  const item = localItem(text.join('\n\n'), ['workflow'], { units: text.map(text => ({ text, facet: 'workflow' })) });
  const answer = api.buildPragmaticAnswer(q, response, [item]);
  const shown = answer.extracts.map(u => u.text).join('\n');
  for (const fact of ['własną definicję', 'SampleHistory', 'Sample_Required']) assert(shown.includes(fact));
  assert(!shown.includes('katalog endpointów'));
  assert.match(answer.answerNotes.join('\n'), /nie.*dowod.*wykonania/iu);
  assert.equal(answer.extracts.length, 3);
});
test('offline integration: source chunk cut inside a table row is not a complete evidence unit', () => {
  const c = parseOwaQuestion('OWA mapowanie pól');
  const broken = { namespace: kb, artifact: artifact('chunk'), fields: { id: 'broken-table', content:
    '## Mapowanie pól\n| Pole | Typ | Opis |\n|---|---|---|\n| Sample_Key | int | PK |\n| Sample_Other | int |' } };
  assert.deepEqual(evidenceApi.owaUnitsForRow(c, broken), []);
  const complete = { ...broken, fields: { ...broken.fields, content: broken.fields.content + ' Warunkowy opis |\n\nTylko dla wersji próbnej.' } };
  assert(evidenceApi.owaUnitsForRow(c, complete).every(u => u.text.includes('Tylko dla wersji próbnej.')));
});
test('offline integration: owner-attributed relation rows use explicitly declared peer tables, without borrowing fields', () => {
  const c = parseOwaQuestion('OWAOntology.SampleLeft i OWAOntology.SampleRight relacja kardynalność');
  const input = [
    { namespace: kb, artifact: artifact('ontology_entity'), fields: { id: 'left-sample', canonicalName: 'OWAOntology.SampleLeft', mainTable: 'CDN.SampleLeft' } },
    { namespace: kb, artifact: artifact('ontology_entity'), fields: { id: 'right-sample', canonicalName: 'OWAOntology.SampleRight', description: '## Tabele MSSQL\n- `CDN.SampleRight` — tabela główna' } },
  ];
  const selection = evidenceApi.selectOwaEvidence(c, input);
  const unit = { text: '| Źródło | Cel | Kardynalność | JOIN |\n|---|---|---|---|\n| CDN.SampleLeft | SampleRight | N:1 | CDN.SampleLeft.Peer_Id = CDN.SampleRight.Row_Id |',
    facets: ['relations', 'cardinality'], namespace: kb, owa: { ownerIds: ['left-sample'] } };
  const result = evidenceApi.assessOwaCoverage(c, selection, [unit]);
  assert.equal(result.status, 'covered');
  // The source end remains explicitly declared; a container ID cannot replace
  // an unresolved explicit source table while testing the peer's declaration.
  const bodyTables = input.map(row => ({ ...row, fields: { ...row.fields,
    mainTable: row.fields.id === 'left-sample' ? row.fields.mainTable : '', description: '' } }));
  bodyTables.push({ namespace: kb, artifact: artifact('chunk'), fields: { id: 'owned-tables', sourceDocumentRefId: 'right-sample',
    content: '## Źródła danych\n- **Tabela główna**: `CDN.SampleRight`\n\n## Relacje\nRelacja próbna.' } });
  assert.equal(evidenceApi.assessOwaCoverage(c, evidenceApi.selectOwaEvidence(c, bodyTables), [unit]).status, 'covered');
  const wrong = { ...unit, text: unit.text.replaceAll('SampleRight', 'SampleRightExtra') };
  assert.notEqual(evidenceApi.assessOwaCoverage(c, selection, [wrong]).status, 'covered');
  const mapping = parseOwaQuestion('OWAOntology.SampleLeft i OWAOntology.SampleRight mapowanie pola Ready_Flag');
  const unrelated = { ...unit, text: 'Ready_Flag → CDN.SampleRight.Other', facets: ['fields'] };
  assert.notEqual(evidenceApi.assessOwaCoverage(mapping, selection, [unrelated]).status, 'covered');
});

test('specific owned field UNKNOWN yields scoped enum notice before full evidence', () => {
  const { answer } = gathered('OWA enum pola `State_Tag`');
  assert.equal(answer.owaCoverage?.status, 'unknown');
  assert.deepEqual(answer.owaCoverage.missingFacets, [], 'the shown enum limitation covers the requested topic, without resolving it');
  assert(answer.evidenceAssessment.reasons.includes('source_explicit_unknown'));
  const notes = answer.answerNotes.join('\n');
  assert.match(notes, /State_Tag/);
  assert.match(notes, /UNKNOWN/);
  assert.match(notes, /ontology_field\.csv/);
  const md = api.renderAnswerMarkdown(answer);
  const first = answer.extracts[0];
  const label = answer.sources.findIndex(source => source.key === first.sourceKey) + 1;
  const header = `[S${label}] ${first.artifact}, linie ${first.line}–${first.endLine ?? first.line}:\n`;
  assert(md.indexOf(header) >= 0, 'the actual owned unit header is visible');
  assert(md.indexOf(notes.split('\n')[0]) >= 0 && md.indexOf(notes.split('\n')[0]) < md.indexOf(header));
  for (const extract of answer.extracts) assert(md.includes(extract.text), 'retain every complete field assertion and qualification');
  assert.equal(answer.evidenceAssessment.status, 'insufficient_evidence');
});

test('UNKNOWN notice names the actual visible field when the question uses its column alias', () => {
  const { answer } = gathered('OWAOntology.SignalCard enum pola Sig_State');
  assert.equal(answer.owaCoverage.status, 'unknown');
  assert.match(answer.answerNotes.join('\n'), /State_Tag/);
  assert.match(answer.answerNotes.join('\n'), /Sig_State/);
});

test('every requested field name is required even when the fields facet is otherwise covered', () => {
  const coverage = assess('OWAOntology.FullCard pola `Signal_Key` oraz `Absent_Flag`',
    [{ text: '## Pola\nSignal_Key jest kluczem.', facet: 'fields' }]);
  assert.equal(coverage.status, 'partial');
  assert(coverage.reasons.includes('requested_field_not_shown'));
  assert.match(coverage.notices.join('\n'), /Absent_Flag/);
});

test('valid directional workflow evidence can have no owner IDs', () => {
  const context = parseOwaQuestion('OWA proces PZ → FZ');
  const workflowRows = [{ namespace: kb, artifact: artifact('workflow_pattern'), fields: {
    id: 'flow-unowned', workflowName: 'PZ → FZ', description: 'Skutek zależy od powiązań.', semanticType: 'workflow_pattern' } }];
  const selection = evidenceApi.selectOwaEvidence(context, workflowRows);
  assert.deepEqual(selection.ownerIds, []);
  assert.equal(selection.missing, false);
  const coverage = evidenceApi.assessOwaCoverage(context, selection, selection.metadata.get(workflowRows[0]).units);
  assert.equal(coverage.status, 'covered');
});

for (const id of ['OWAOntology.AbsentQuill', 'OWAOntology.ZebraProcess']) test(`missing literal ${id} cannot substitute generic evidence`, () => {
  const question = `OWA pokaż ${id} i OWAOntology.FullCard`;
  const coverage = assess(question);
  assert.equal(coverage.status, 'unknown');
  assert(coverage.reasons.includes('requested_identity_not_found'));
  assert.match(coverage.notices.join('\n'), /lokalnych/);
  const evidence = [localItem('GENERIC_SUBSTITUTE', ['overview'])];
  Object.defineProperty(evidence, 'owaSelection', { value: evidenceApi.selectOwaEvidence(parseOwaQuestion(question), rows) });
  const answer = api.buildPragmaticAnswer(question, response, evidence);
  assert.equal(answer.evidence.length, 0);
  assert.equal(answer.extracts.length, 0);
  assert(!api.renderAnswerMarkdown(answer).includes('GENERIC_SUBSTITUTE'));
});

test('equal alias owners are alternatives, explicit multiple identities are not a tie', () => {
  const ambiguous = assess('OWA Wspólna karta');
  assert.equal(ambiguous.status, 'ambiguous');
  assert(ambiguous.reasons.includes('ambiguous_owner'));
  for (const id of ['tie-a', 'tie-b']) assert(ambiguous.notices.join('\n').includes(id));
  assert.match(ambiguous.notices.join('\n'), /doprecyz/i);
  assert.notEqual(assess('OWAOntology.FirstCard i OWAOntology.SecondCard', [{ text: 'Pierwsza i druga karta', facet: 'overview' }]).status, 'ambiguous');
});

for (const question of ['OWA jaki jest stan dokumentu?', 'OWA status dokumentów — co oznacza?']) test(`unspecified document status asks for type and axis: ${question}`, () => {
  const coverage = assess(question, [{ text: 'Status płatności oraz status księgowania to odrębne osie.', facet: 'overview' }]);
  assert.equal(coverage.status, 'ambiguous');
  assert(coverage.reasons.includes('unspecified_document_status'));
  assert.match(coverage.notices.join('\n'), /typ.*dokument.*oś|typ.*dokument.*osi/);
});

test('short complete source without mapping and truncated retrieval both use only displayed-scope missing explanation', () => {
  for (const text of ['Krótki kompletny opis karty.', 'Opis skrócony…']) {
    const coverage = assess('OWAOntology.PlainCard mapowanie pól', [{ text, facet: 'overview' }]);
    assert.deepEqual(coverage.missingFacets, ['fields']);
    assert.equal(coverage.status, 'partial');
    assert.match(coverage.notices.join('\n'), /pokazanych/);
    assert.match(coverage.notices.join('\n'), /nie przesądza/i);
    assert(!/źródło nie zawiera|nie istnieje/.test(coverage.notices.join('\n')));
  }
});

test('coverage uses Context.facets and visible facet unions, never selected hidden units', () => {
  const question = 'OWAOntology.FullCard mapowanie pól i proces';
  const hidden = localItem('## Proces\nPZ → FZ: Pełna kwalifikacja.', ['workflow']);
  const selection = { ownerIds: ['full-owner'], missing: false, candidates: [hidden.hits[0].owa.row], metadata: new Map() };
  const coverage = assess(question, [{ text: '## Mapowanie pól\nWidoczne pola.', facets: ['fields'] }], selection);
  assert.deepEqual(coverage.coveredFacets, ['fields']);
  assert.deepEqual(coverage.missingFacets, ['workflow']);
});

test('source CONFLICT is ambiguous, source historical CONFIRMED never verifies claims', () => {
  const conflict = assess('OWAOntology.FullCard pola', [{ text: '## Pola\nCONFLICT: różne deklaracje mapowania.', facet: 'fields' }]);
  assert.equal(conflict.status, 'ambiguous');
  assert(conflict.reasons.includes('source_explicit_ambiguity'));
  const { answer } = gathered('OWAOntology.FullCard proces');
  assert(answer.extracts.some(unit => unit.text.includes('CONFIRMED')));
  assert.equal(answer.evidenceAssessment.status, 'unverified_evidence');
  assert.equal(answer.retrieval.graphUsed, false);
});

test('full rendered extracts cover document codes/table names even when hidden previews omit them', () => {
  const { answer } = gathered('OWAOntology.FullCard proces PZ → FZ mapowanie CDN.SyntheticCard');
  assert.equal(answer.evidenceAssessment.status, 'unverified_evidence');
  assert.deepEqual(answer.evidenceAssessment.missingTerms, []);
  assert.deepEqual(answer.owaCoverage.missingFacets, []);
  const text = '## Mapowanie pól\nCDN.SyntheticCard: pola karty.\n\n## Proces\nPZ → FZ: tylko przy powiązaniu.';
  const manual = api.buildPragmaticAnswer('OWA proces PZ → FZ mapowanie CDN.SyntheticCard', response,
    [localItem(text, ['fields', 'workflow'])]);
  assert.equal(manual.evidenceAssessment.status, 'unverified_evidence');
  assert.deepEqual(manual.evidenceAssessment.missingTerms, []);
  assert(!JSON.stringify(manual).includes('HIDDEN_PREVIEW'));
});

test('suppressed previews and whole omitted units cannot satisfy terms/facets or emit UNKNOWN notes', () => {
  const evidence = [localItem('## Pola\n' + 'x'.repeat(4001), ['fields'], { snippet: 'PZ FZ CDN.SyntheticCard UNKNOWN' })];
  const answer = api.buildPragmaticAnswer('OWA mapowanie CDN.SyntheticCard PZ FZ', response, evidence);
  assert.equal(answer.extracts.length, 0);
  assert.equal(answer.evidenceAssessment.status, 'insufficient_evidence');
  assert(answer.evidenceAssessment.missingTerms.includes('cdn.syntheticcard'));
  assert(answer.owaCoverage.missingFacets.includes('fields'));
  assert(!answer.answerNotes.join('\n').includes('UNKNOWN'));
});

test('unsuppressed technical snippets count, and omission facets reconcile against covered facets', () => {
  const technical = { kb: support, artifact: 'fixture/technical.csv', hits: [{ line: 1, score: 3, snippet: 'Mapowanie pól CDN.SyntheticCard PZ FZ', bodyField: 'technical_fields' }] };
  const answer = api.buildPragmaticAnswer('OWA mapowanie CDN.SyntheticCard PZ FZ', response,
    [technical, localItem('## Pola\n' + 'x'.repeat(4001), ['fields'])]);
  assert.equal(answer.evidenceAssessment.status, 'unverified_evidence');
  assert.deepEqual(answer.owaCoverage.missingFacets, []);
  // Task 3's field remains the omitted unit's facets; additive uncoveredFacets
  // is the reconciled answer-level interpretation used by Markdown.
  assert.deepEqual(answer.omissions[0].missingFacets, ['fields']);
  assert.deepEqual(answer.omissions[0].uncoveredFacets, []);
  assert(!api.renderAnswerMarkdown(answer).includes('brak pokrycia: fields'));
  assert(!api.renderAnswerMarkdown(answer).includes('odpowiedź nie obejmuje wszystkich aspektów'));
});

for (const [format, text] of [
  ['lines', 'Ready_Flag: CONFIRMED — mapowanie ReadyFlag.\nOther_Flag: UNKNOWN — do potwierdzenia.'],
  ['semicolon', 'Ready_Flag: CONFIRMED — mapowanie ReadyFlag; Other_Flag: UNKNOWN — do potwierdzenia.'],
  ['comma', 'Ready_Flag: CONFIRMED, Other_Flag: UNKNOWN — do potwierdzenia.'],
  ['conjunction', 'Ready_Flag: CONFIRMED oraz Other_Flag: UNKNOWN — do potwierdzenia.'],
  ['prose assignments', 'Ready_Flag is CONFIRMED, Other_Flag is UNKNOWN.'],
  ['table', '| Pole | Status |\n| --- | --- |\n| Ready_Flag | CONFIRMED |\n| Other_Flag | UNKNOWN |'],
  ['permuted rows', 'Other_Flag: UNKNOWN — do potwierdzenia.\nReady_Flag: CONFIRMED — mapowanie ReadyFlag.'],
]) test(`F1 marker attribution stays on its actual field (${format}) through assessment/build/render`, () => {
  const question = 'OWAOntology.FullCard pola `Ready_Flag`';
  const unit = { text: '## Pola\n' + text, facet: 'fields' };
  const coverage = assess(question, [unit]);
  assert.equal(coverage.status, 'covered', 'an unrelated field UNKNOWN cannot negate the requested CONFIRMED field');
  assert(!coverage.reasons.includes('source_explicit_unknown'));
  assert(coverage.notices.some(note => note.includes('Other_Flag') && note.includes('UNKNOWN')));
  assert(!coverage.notices.some(note => note.includes('Ready_Flag') && note.includes('UNKNOWN')));
  const input = [localItem(unit.text, ['fields'])];
  Object.defineProperty(input, 'owaSelection', { value: evidenceApi.selectOwaEvidence(parseOwaQuestion(question), rows) });
  const answer = api.buildPragmaticAnswer(question, response, input);
  assert.equal(answer.evidenceAssessment.status, 'unverified_evidence');
  assert.equal(answer.extracts[0].text, unit.text);
  const md = api.renderAnswerMarkdown(JSON.parse(JSON.stringify(answer)));
  assert(md.includes(unit.text));
  assert(!answer.answerNotes.some(note => note.includes('Ready_Flag') && note.includes('UNKNOWN')));
  const both = assess('OWAOntology.FullCard pola `Ready_Flag` i `Other_Flag`', [unit]);
  assert.equal(both.status, 'unknown');
  assert(both.reasons.includes('source_explicit_unknown'));
  assert(!both.notices.some(note => note.includes('Ready_Flag') && note.includes('UNKNOWN')));
});

for (const text of ['Brak konfliktów mapowania.', 'Nie ma konfliktów mapowania.',
  'No mapping conflicts.', 'Termin UNKNOWN oznacza brak potwierdzenia; termin CONFLICT oznacza sprzeczność.',
  'Status UNKNOWN oznacza brak potwierdzenia, nie status bieżącego pola.']) {
  test(`F1 negation/marker terminology is not an asserted source status: ${text}`, () => {
    const question = 'OWAOntology.FullCard pola `Ready_Flag`';
    const body = `## Pola\nReady_Flag: CONFIRMED — mapowanie ReadyFlag.\n${text}`;
    const coverage = assess(question, [{ text: body, facet: 'fields' }]);
    assert.equal(coverage.status, 'covered');
    assert(!coverage.reasons.includes('source_explicit_ambiguity'));
    assert(!coverage.reasons.includes('source_explicit_unknown'));
    const answer = api.buildPragmaticAnswer(question, response, [localItem(body, ['fields'])]);
    assert.equal(answer.evidenceAssessment.status, 'unverified_evidence');
    assert(api.renderAnswerMarkdown(answer).includes(text));
  });
}

test('F1 negation does not suppress a separate positive conflict assertion', () => {
  const text = 'Ready_Flag: CONFIRMED; brak konfliktów tego pola.\nOther_Flag: CONFLICT — sprzeczne mapowania.';
  const coverage = assess('OWAOntology.FullCard pola `Ready_Flag` i `Other_Flag`', [{ text, facet: 'fields' }]);
  assert.equal(coverage.status, 'ambiguous');
  assert(coverage.notices.some(note => note.includes('Other_Flag') && note.includes('konflikt')));
  assert(!coverage.notices.some(note => note.includes('Ready_Flag') && note.includes('konflikt')));
});

test('F1 actual-field metadata cannot reassign an explicitly different field limitation', () => {
  const text = '## Pola\nReady_Flag: CONFIRMED — gotowe mapowanie.\nOther_Flag: UNKNOWN — do potwierdzenia.';
  const unit = { text, facet: 'fields', owa: { ownerIds: ['full-owner'], row: { fields: {
    semanticType: 'ontology_field', fieldName: 'Ready_Flag', mssqlColumn: 'ReadyFlag' } } } };
  const coverage = assess('OWAOntology.FullCard pola `Ready_Flag`', [unit]);
  assert.equal(coverage.status, 'covered');
  assert(!coverage.notices.some(note => note.includes('Ready_Flag') && note.includes('UNKNOWN')));
  const actual = assess('OWAOntology.FullCard pola `Ready_Flag`', [{ ...unit,
    text: '## Pola\nReady_Flag\nmappingStatus: UNKNOWN — do potwierdzenia.' }]);
  assert.equal(actual.status, 'unknown', 'a real field-level status still qualifies that declared field');
});

for (const reverse of [false, true]) test(`F2 per-owner coverage keeps an omitted owner's fields missing (reverse=${reverse})`, () => {
  const ids = ['OWAOntology.AmberLedger', 'OWAOntology.CobaltLedger'];
  if (reverse) ids.reverse();
  const question = ids.join(' i ') + ' mapowanie pól';
  const context = parseOwaQuestion(question);
  const selection = evidenceApi.selectOwaEvidence(context, reverse ? [...rows].reverse() : rows);
  const alpha = { text: '## Mapowanie pól\nAmber_Key: identyfikator.', facets: ['fields'], owa: { ownerIds: ['amber-owner'] } };
  const coverage = evidenceApi.assessOwaCoverage(context, selection, [alpha]);
  assert.equal(coverage.status, 'partial');
  assert.deepEqual(coverage.coveredFacets, []);
  assert.deepEqual(coverage.missingFacets, ['fields']);
  assert.deepEqual(coverage.ownerCoverage.find(owner => owner.ownerId === 'amber-owner').coveredFacets, ['fields']);
  assert.deepEqual(coverage.ownerCoverage.find(owner => owner.ownerId === 'cobalt-owner').missingFacets, ['fields']);
  assert(coverage.notices.some(note => note.includes('OWAOntology.CobaltLedger') && note.includes('fields')));
  const { answer } = gathered(question);
  assert.equal(answer.evidenceAssessment.status, 'insufficient_evidence');
  assert(answer.extracts.some(unit => unit.recordId === 'amber-owner'));
  assert(!answer.extracts.some(unit => unit.recordId === 'cobalt-owner'));
  const omitted = answer.omissions.find(item => item.recordId === 'cobalt-owner');
  assert.equal(omitted.reason, 'answer_budget');
  assert.deepEqual(omitted.uncoveredFacets, ['fields']);
  const md = api.renderAnswerMarkdown(JSON.parse(JSON.stringify(answer)));
  assert(md.includes('brak pokrycia: fields'));
  assert(md.includes('OWAOntology.CobaltLedger'));
  assert(answer.answerNotes.some(note => note.includes('OWAOntology.AmberLedger')));
  const beta = { text: '## Mapowanie pól\nCobalt_Key: mapowanie.', facets: ['fields'], owa: { ownerIds: ['cobalt-owner'] } };
  assert.equal(evidenceApi.assessOwaCoverage(context, selection, [alpha, beta]).status, 'covered');
});

test('F2 technical attribution uses exact selected owner labels per clause, not a global facet union', () => {
  const context = parseOwaQuestion('OWAOntology.AmberLedger i OWAOntology.CobaltLedger mapowanie pól');
  const selection = evidenceApi.selectOwaEvidence(context, rows);
  const units = [{ namespace: support, text: 'AmberBook: mapowanie pól Amber_Key.\nCobaltBook: krótki opis ról.' }];
  const coverage = evidenceApi.assessOwaCoverage(context, selection, units);
  assert.equal(coverage.status, 'partial');
  assert.deepEqual(coverage.ownerCoverage.find(owner => owner.ownerId === 'amber-owner').coveredFacets, ['fields']);
  assert.deepEqual(coverage.ownerCoverage.find(owner => owner.ownerId === 'cobalt-owner').missingFacets, ['fields']);
});

test('F2 same-owner duplicate omission reconciles even while another owner remains missing', () => {
  const question = 'OWAOntology.FullCard i OWAOntology.CobaltLedger mapowanie pól';
  const evidence = [localItem('## Pola\nReady_Flag: mapowanie.', ['fields'], { id: 'shown-full' }),
    localItem('## Pola\n' + 'k'.repeat(4100), ['fields'], { id: 'omitted-full-duplicate' })];
  Object.defineProperty(evidence, 'owaSelection', { value: evidenceApi.selectOwaEvidence(parseOwaQuestion(question), rows) });
  const answer = api.buildPragmaticAnswer(question, response, evidence);
  assert.equal(answer.owaCoverage.status, 'partial');
  assert.deepEqual(answer.owaCoverage.missingFacets, ['fields']);
  assert.deepEqual(answer.omissions.find(item => item.recordId === 'omitted-full-duplicate').uncoveredFacets, []);
  assert.deepEqual(answer.owaCoverage.ownerCoverage.find(owner => owner.ownerId === 'cobalt-owner').missingFacets, ['fields']);
});

test('F2 relation facets require the requested joint endpoints, not separate per-owner relation prose', () => {
  const context = parseOwaQuestion('OWAOntology.AmberLedger i OWAOntology.CobaltLedger relacje i kardynalność');
  const selection = evidenceApi.selectOwaEvidence(context, rows);
  const separate = ['amber-owner', 'cobalt-owner'].map(ownerId => ({ text: 'Relacje i kardynalność tej księgi.',
    facets: ['relations', 'cardinality'], owa: { ownerIds: [ownerId] } }));
  assert.equal(evidenceApi.assessOwaCoverage(context, selection, separate).status, 'partial');
  const joint = [{ text: 'Pełny wiersz relacji z oboma końcami.', facets: ['relations', 'cardinality'],
    owa: { ownerIds: ['amber-owner', 'cobalt-owner'] } }];
  assert.equal(evidenceApi.assessOwaCoverage(context, selection, joint).status, 'covered');
});

test('F2 shared labels and extended qualified IDs cannot impersonate exact requested owners', () => {
  const context = parseOwaQuestion('OWAOntology.AmberLedger i OWAOntology.CobaltLedger mapowanie pól');
  const extended = [{ namespace: support,
    text: 'OWAOntology.AmberLedger.Child: mapowanie pól.\nOWAOntology.CobaltLedger.Child: mapowanie pól.' }];
  const selection = evidenceApi.selectOwaEvidence(context, rows);
  assert.notEqual(evidenceApi.assessOwaCoverage(context, selection, extended).status, 'covered');
  const sharedRows = rows.map(row => ['amber-owner', 'cobalt-owner'].includes(row.fields.id)
    ? { ...row, fields: { ...row.fields, mainTable: 'CDN.SharedLedger' } } : row);
  const shared = evidenceApi.selectOwaEvidence(context, sharedRows);
  assert.notEqual(evidenceApi.assessOwaCoverage(context, shared,
    [{ namespace: support, text: 'CDN.SharedLedger: mapowanie pól.' }]).status, 'covered');
});

const semanticTools = ['erp_concept.search', 'erp_entity.get', 'erp_process.explain', 'erp_relation.list'];
async function call(tool, query, extra = {}, allowedNamespaces = new Set([kb, support])) {
  return handleJsonRpcRequest({ jsonrpc: '2.0', id: tool, method: 'tools/call', params: { name: tool,
    arguments: { query, as_of: '2026-10-15', correlation_id: 'task4-fixture', ...extra } } },
  { profile, allowedNamespaces, writeAllowed: false });
}

for (const [text, expected, reason] of [
  ['Ready_Flag: UNKNOWN.', 'unknown', 'source_explicit_unknown'],
  ['Ready_Flag: not CONFIRMED but UNKNOWN.', 'unknown', 'source_explicit_unknown'],
  ['Ready_Flag: not UNKNOWN but CONFLICT.', 'ambiguous', 'source_explicit_ambiguity'],
  ['Ready_Flag: nie CONFIRMED, lecz UNKNOWN.', 'unknown', 'source_explicit_unknown'],
  ['Ready_Flag: not only UNKNOWN but also CONFLICT.', 'ambiguous', 'source_explicit_ambiguity'],
  ['Ready_Flag: not UNKNOWN but CONFIRMED.', 'covered', null],
  ['Ready_Flag: neither UNKNOWN nor CONFLICT.', 'covered', null],
]) test(`F1-R token-scoped contrast preserves the asserted status: ${text}`, () => {
  const question = 'OWAOntology.FullCard enum pola `Ready_Flag`';
  const unit = { text: '## Enum pola\n' + text, facets: ['fields', 'unknownEnums'] };
  const coverage = assess(question, [unit]);
  assert.equal(coverage.status, expected);
  if (reason) assert(coverage.reasons.includes(reason));
  else assert.equal(coverage.limitations.length, 0);
  if (text.includes('not UNKNOWN but CONFLICT')) assert(!coverage.reasons.includes('source_explicit_unknown'));
  const evidence = [localItem(unit.text, unit.facets)];
  Object.defineProperty(evidence, 'owaSelection', { value: evidenceApi.selectOwaEvidence(parseOwaQuestion(question), rows) });
  const answer = api.buildPragmaticAnswer(question, response, evidence);
  assert.equal(answer.evidenceAssessment.status, reason ? 'insufficient_evidence' : 'unverified_evidence');
  const serialized = JSON.parse(JSON.stringify(answer));
  assert.equal(serialized.extracts[0].text, unit.text);
  const md = api.renderAnswerMarkdown(serialized);
  assert(md.includes(text));
  if (reason) assert(serialized.answerNotes.some(note => note.includes('Ready_Flag')));
});

for (const reverse of [false, true]) test(`F2-R owner × requested field × facet, including budgeted mapping and unrelated technical field (reverse=${reverse})`, () => {
  const ids = ['OWAOntology.CopperCard', 'OWAOntology.SlateCard'];
  if (reverse) ids.reverse();
  const query = ids.join(' i ') + ' mapowanie pola `Ready_Flag`';
  const context = parseOwaQuestion(query);
  const selection = evidenceApi.selectOwaEvidence(context, reverse ? [...rows].reverse() : rows);
  const alpha = { text: 'Ready_Flag → CopperReady.', facets: ['fields'], owa: { ownerIds: ['copper-owner'] } };
  const betaOther = { text: 'Other_Flag → SlateOther.', facets: ['fields'], owa: { ownerIds: ['slate-owner'] } };
  const coverage = evidenceApi.assessOwaCoverage(context, selection, [alpha, betaOther]);
  assert.equal(coverage.status, 'partial');
  assert.deepEqual(coverage.ownerCoverage.find(owner => owner.ownerId === 'slate-owner').missingFacets, ['fields']);
  assert(coverage.requirements.some(req => req.ownerId === 'slate-owner' && req.fieldName === 'Ready_Flag'
    && req.facet === 'fields' && !req.covered));
  const betaReady = { ...betaOther, text: 'Ready_Flag → SlateReady.' };
  assert.equal(evidenceApi.assessOwaCoverage(context, selection, [alpha, betaReady]).status, 'covered');

  const { answer, evidence } = gathered(query, ['exports/optima_business_semantics/v1/business_description.csv']);
  assert.equal(answer.evidenceAssessment.status, 'insufficient_evidence');
  assert(answer.extracts.some(unit => unit.recordId === 'copper-owner'));
  assert(!answer.extracts.some(unit => unit.recordId === 'slate-owner'));
  assert(answer.evidence.some(item => item.hits.some(hit => hit.snippet.includes('Other_Flag'))));
  const omission = answer.omissions.find(item => item.recordId === 'slate-owner');
  assert.equal(omission.reason, 'answer_budget');
  assert.deepEqual(omission.uncoveredFacets, ['fields']);
  assert(omission.uncoveredRequirements.some(req => req.ownerId === 'slate-owner' && req.fieldName === 'Ready_Flag'));
  const serialized = JSON.parse(JSON.stringify(answer));
  const md = api.renderAnswerMarkdown(serialized);
  assert(md.includes('Other_Flag'));
  assert(md.includes('brak pokrycia: fields'));
  assert(serialized.answerNotes.some(note => note.includes('OWAOntology.SlateCard') && note.includes('Ready_Flag')));
  // An actually visible duplicate of the SAME owner's requested field can
  // reconcile the omission; the unrelated Other_Flag above cannot.
  const duplicated = evidence.map(item => item.kb === support ? { ...item, hits: item.hits.map(hit => ({ ...hit,
    snippet: hit.snippet.replaceAll('Other_Flag', 'Ready_Flag') })) } : item);
  Object.defineProperty(duplicated, 'owaSelection', { value: evidence.owaSelection });
  const reconciled = api.buildPragmaticAnswer(query, response, duplicated);
  assert.equal(reconciled.evidenceAssessment.status, 'unverified_evidence');
  assert.deepEqual(reconciled.omissions.find(item => item.recordId === 'slate-owner').uncoveredFacets, []);
});

test('F2-R omissions associate the actual requested field, not all missing fields of the same owner', () => {
  const query = 'OWAOntology.FullCard mapowanie pól `Ready_Flag` i `Other_Flag`';
  const evidence = [localItem('## Pola\nReady_Flag → ReadyValue.', ['fields'], { id: 'visible-ready' }),
    localItem('## Pola\nOther_Flag → OtherValue. ' + 'o'.repeat(4100), ['fields'], { id: 'omitted-other' }),
    localItem('## Pola\nUnasked_Flag → UnaskedValue. ' + 'u'.repeat(4100), ['fields'], { id: 'omitted-unasked' })];
  Object.defineProperty(evidence, 'owaSelection', { value: evidenceApi.selectOwaEvidence(parseOwaQuestion(query), rows) });
  const answer = api.buildPragmaticAnswer(query, response, evidence);
  assert.equal(answer.owaCoverage.status, 'partial');
  const other = answer.omissions.find(item => item.recordId === 'omitted-other');
  assert.deepEqual(other.uncoveredFacets, ['fields']);
  assert(other.uncoveredRequirements.every(req => req.fieldName === 'Other_Flag'));
  assert.deepEqual(answer.omissions.find(item => item.recordId === 'omitted-unasked').uncoveredFacets, []);
  assert.deepEqual(answer.omissions.find(item => item.recordId === 'omitted-unasked').uncoveredRequirements, []);
});

test('F2-R facet attribution for a named field cannot borrow another field\'s later subsection', () => {
  const query = 'OWAOntology.FullCard pola i ceny `Ready_Flag`';
  const text = '## Mapowanie pól\nReady_Flag → ReadyValue.\n### Ceny\nOther_Flag: cena zależy od konfiguracji.';
  const coverage = assess(query, [{ text, facets: ['fields', 'prices'] }]);
  assert.equal(coverage.status, 'partial');
  assert(coverage.requirements.some(req => req.fieldName === 'Ready_Flag' && req.facet === 'fields' && req.covered));
  assert(coverage.requirements.some(req => req.fieldName === 'Ready_Flag' && req.facet === 'prices' && !req.covered));
});

for (const [id, missingFacet, unknown] of [
  ['BridgeCard', null, false], ['BridgeLongFlow', 'workflow', false],
  ['BridgeLongField', 'fields', false], ['BridgeUnknownFlow', null, true],
]) test(`F3 actual select/build/JSON/render: named mapping plus independent document workflow (${id})`, () => {
  const query = `OWAOntology.${id} mapowanie pola \`Ready_Flag\` oraz proces PZ → FZ`;
  const { answer, evidence } = gathered(query);
  const serialized = JSON.parse(JSON.stringify(answer));
  const coverage = serialized.owaCoverage;
  assert(coverage.requirements.some(req => req.facet === 'workflow' && req.fieldName === null
    && req.covered === (missingFacet !== 'workflow')));
  assert(!coverage.requirements.some(req => req.facet === 'workflow' && req.fieldName !== null));
  assert(coverage.requirements.some(req => req.facet === 'fields' && req.fieldName === 'Ready_Flag'
    && req.covered === (missingFacet !== 'fields')));
  assert.equal(serialized.evidenceAssessment.status, missingFacet || unknown ? 'insufficient_evidence' : 'unverified_evidence');
  assert.deepEqual(coverage.missingFacets, missingFacet ? [missingFacet] : []);
  assert(!coverage.ownerCoverage[0].fieldCoverage[0].missingFacets.includes('workflow'));
  const md = api.renderAnswerMarkdown(serialized);
  if (!missingFacet) {
    assert(md.includes('Ready_Flag → ReadyValue.'));
    assert(md.includes('PZ → FZ: tylko dla powiązanych dokumentów.'));
    assert.deepEqual(serialized.omissions, []);
    assert.deepEqual(serialized.evidenceAssessment.missingTerms, []);
  } else {
    const omission = serialized.omissions.find(item => item.uncoveredFacets.includes(missingFacet));
    assert(omission);
    assert(omission.uncoveredRequirements.every(req => req.fieldName === (missingFacet === 'fields' ? 'Ready_Flag' : null)));
    assert(md.includes(`brak pokrycia: ${missingFacet}`));
  }
  assert.equal(serialized.evidenceAssessment.reasons.includes('requested_field_not_shown'), missingFacet === 'fields');
  if (unknown) {
    assert(serialized.evidenceAssessment.reasons.includes('source_explicit_unknown'));
    assert(serialized.answerNotes.some(note => note.includes('Workflow_Stage') && note.includes('UNKNOWN')));
    assert(!serialized.answerNotes.some(note => note.includes('Ready_Flag') && note.includes('UNKNOWN')));
  }
  if (id === 'BridgeCard') {
    const generic = gathered(query.replace('pola `Ready_Flag`', 'pól')).answer;
    assert.deepEqual(serialized.extracts.map(unit => unit.text), generic.extracts.map(unit => unit.text));
    assert.equal(generic.owaCoverage.status, 'covered');
    const selection = evidence.owaSelection;
    const units = selection.candidates.flatMap(row => selection.metadata.get(row).units.map(unit => ({ ...unit,
      owa: { ...selection.metadata.get(row), row } })));
    assert.equal(evidenceApi.assessOwaCoverage(parseOwaQuestion(query), selection, units).status, 'covered');
  }
});

for (const reverse of [false, true]) test(`F3 reversed-owner joint workflow stays owner-scoped but field-independent (reverse=${reverse})`, () => {
  const ids = ['OWAOntology.BridgeCard', 'OWAOntology.BridgePeer'];
  if (reverse) ids.reverse();
  const query = ids.join(' i ') + ' mapowanie pola `Ready_Flag` oraz proces PZ → FZ';
  const context = parseOwaQuestion(query);
  const selectedRows = rows.filter(row => ['bridge-owner', 'bridge-peer'].includes(row.fields.id)).map((row, index) => ({
    ...row, line: index + 2, endLine: index + 2, contentHash: `sha256:${'b'.repeat(64)}` }));
  selectedRows.push({ namespace: kb, artifact: artifact('workflow_pattern'), line: 2, endLine: 2,
    contentHash: `sha256:${'c'.repeat(64)}`, fields: { id: 'bridge-joint-flow', semanticType: 'workflow_pattern',
      sourceEntityRefId: 'bridge-owner', targetEntityRefId: 'bridge-peer', workflowName: 'PZ → FZ',
      description: 'PZ → FZ: tylko dla powiązanych dokumentów.' } });
  const selection = evidenceApi.selectOwaEvidence(context, reverse ? [...selectedRows].reverse() : selectedRows);
  const units = selection.candidates.flatMap(row => selection.metadata.get(row).units.map(unit => ({ ...unit,
    owa: { ...selection.metadata.get(row), row } })));
  const coverage = evidenceApi.assessOwaCoverage(context, selection, units);
  assert.equal(coverage.status, 'covered');
  assert.equal(coverage.requirements.filter(req => req.facet === 'workflow' && req.fieldName === null && req.covered).length, 2);
  const evidence = selection.candidates.map(row => {
    const hit = { line: row.line, endLine: row.endLine, score: 10, bodyField: 'description',
      bodyText: row.fields.description, snippet: 'HIDDEN_PREVIEW', source: { recordId: row.fields.id, sourceUrl: null } };
    Object.defineProperty(hit, 'owa', { value: { ...selection.metadata.get(row), row } });
    return { kb, artifact: row.artifact, contentHash: row.contentHash, hits: [hit], excerpt: hit.snippet };
  });
  Object.defineProperty(evidence, 'owaSelection', { value: selection });
  // Three exact sources compete for the unchanged two-source cap. Whatever
  // mapping is omitted must remain field-scoped; the joint workflow is shown.
  const answer = JSON.parse(JSON.stringify(api.buildPragmaticAnswer(query, response, evidence)));
  assert(answer.extracts.some(unit => unit.recordId === 'bridge-joint-flow'));
  assert(answer.owaCoverage.requirements.filter(req => req.facet === 'workflow').every(req => req.covered && req.fieldName === null));
  assert.equal(answer.owaCoverage.status, 'partial');
  assert.deepEqual(answer.owaCoverage.missingFacets, ['fields']);
  assert(answer.omissions.some(item => item.uncoveredRequirements.some(req => req.facet === 'fields' && req.fieldName === 'Ready_Flag')));
  assert(api.renderAnswerMarkdown(answer).includes('brak pokrycia: fields'));
});

for (const tool of semanticTools) test(`F3 serialized actual MCP ${tool}: mixed facet scopes and omissions`, async () => {
  for (const [id, missingFacet, unknown] of [['BridgeCard', null, false], ['BridgeLongFlow', 'workflow', false],
    ['BridgeLongField', 'fields', false], ['BridgeUnknownFlow', null, true]]) {
    const rpc = JSON.parse(JSON.stringify(await call(tool, `OWAOntology.${id} mapowanie pola \`Ready_Flag\` oraz proces PZ → FZ`)));
    assert(!rpc.error, JSON.stringify(rpc.error));
    const result = rpc.result.structuredContent;
    assert.equal(result.knowledge_status, missingFacet || unknown ? 'unknown' : 'partial');
    assert.deepEqual(result.owaCoverage.missingFacets, missingFacet ? [missingFacet] : []);
    assert(result.owaCoverage.requirements.filter(req => req.facet === 'workflow').every(req => req.fieldName === null));
    assert.equal(result.evidenceAssessment.reasons.includes('requested_field_not_shown'), missingFacet === 'fields');
    if (unknown) assert(result.evidenceAssessment.reasons.includes('source_explicit_unknown'));
    assert.equal(result.answer, rpc.result.content[0].text);
  }
});

for (const tool of semanticTools) test(`F1-R/F2-R serialized actual MCP ${tool}: contrast and scoped named-field omissions`, async () => {
  for (const [id, reason] of [['ContrastUnknown', 'source_explicit_unknown'], ['ContrastConflict', 'source_explicit_ambiguity']]) {
    const rpc = JSON.parse(JSON.stringify(await call(tool, `OWAOntology.${id} enum pola \`Ready_Flag\``)));
    assert(!rpc.error, JSON.stringify(rpc.error));
    const result = rpc.result.structuredContent;
    assert.equal(result.knowledge_status, 'unknown');
    assert.equal(result.evidenceAssessment.status, 'insufficient_evidence');
    assert(result.evidenceAssessment.reasons.includes(reason));
    assert(result.answer.includes(id === 'ContrastUnknown' ? 'not CONFIRMED but UNKNOWN' : 'not UNKNOWN but CONFLICT'));
    assert(result.answerNotes.some(note => note.includes('Ready_Flag')));
    assert.equal(result.answer, rpc.result.content[0].text);
  }
  for (const reverse of [false, true]) {
    for (const [id, missing] of [['SlateCard', true], ['PearlCard', false]]) {
      const ids = ['OWAOntology.CopperCard', `OWAOntology.${id}`];
      if (reverse) ids.reverse();
      const rpc = JSON.parse(JSON.stringify(await call(tool, ids.join(' i ') + ' mapowanie pola `Ready_Flag`')));
      assert(!rpc.error, JSON.stringify(rpc.error));
      const result = rpc.result.structuredContent;
      assert.equal(result.knowledge_status, missing ? 'unknown' : 'partial');
      assert.equal(result.owaCoverage.status, missing ? 'partial' : 'covered');
      if (missing) {
        assert(!result.answer.includes('SlateOther'), 'unrelated support field cannot replace the requested owner/field');
        assert(result.omissions.some(o => o.uncoveredRequirements.some(r => r.ownerId === 'slate-owner' && r.fieldName === 'Ready_Flag')));
        assert(result.owaCoverage.requirements.some(req => req.ownerId === 'slate-owner' && req.fieldName === 'Ready_Flag' && !req.covered));
        assert(result.answerNotes.some(note => note.includes('OWAOntology.SlateCard') && note.includes('Ready_Flag')));
        assert(result.answer.includes('brak pokrycia: fields'));
      }
      assert.equal(result.answer, rpc.result.content[0].text);
    }
  }
});
for (const tool of semanticTools) test(`F1/F2 serialized actual MCP ${tool}: mixed fields and per-owner budgets in both orders`, async () => {
  for (const [field, expected] of [['Ready_Flag', 'partial'], ['Other_Flag', 'unknown']]) {
    const rpc = JSON.parse(JSON.stringify(await call(tool, `OWAOntology.MixedLedger pola \`${field}\``)));
    assert(!rpc.error, JSON.stringify(rpc.error));
    const result = rpc.result.structuredContent;
    assert.equal(result.knowledge_status, expected);
    assert(!result.evidenceAssessment.reasons.includes('source_explicit_ambiguity'));
    assert(result.answer.includes('Ready_Flag: CONFIRMED'));
    assert(result.answer.includes('Other_Flag: UNKNOWN'));
    assert(!result.answerNotes.some(note => note.includes('Ready_Flag') && note.includes('UNKNOWN')));
  }
  for (const reverse of [false, true]) {
    for (const [other, missing] of [['CobaltLedger', true], ['IvoryLedger', false]]) {
      const ids = ['OWAOntology.AmberLedger', `OWAOntology.${other}`];
      if (reverse) ids.reverse();
      const query = ids.join(' i ') + ' mapowanie pól';
      const rpc = JSON.parse(JSON.stringify(await call(tool, query)));
      assert(!rpc.error, JSON.stringify(rpc.error));
      const result = rpc.result.structuredContent;
      assert.equal(result.knowledge_status, missing ? 'unknown' : 'partial');
      assert.equal(result.evidenceAssessment.status, missing ? 'insufficient_evidence' : 'unverified_evidence');
      assert.equal(result.owaCoverage.status, missing ? 'partial' : 'covered');
      const owner = result.owaCoverage.ownerCoverage.find(item => item.ownerId === (missing ? 'cobalt-owner' : 'ivory-owner'));
      assert.deepEqual(owner.missingFacets, missing ? ['fields'] : []);
      assert.equal(result.answer, rpc.result.content[0].text);
      assert(result.answer.includes('Amber_Key'));
      if (missing) {
        assert(result.answer.includes('brak pokrycia: fields'));
        assert(result.answerNotes.some(note => note.includes('OWAOntology.CobaltLedger')));
        assert(!result.answer.includes('z'.repeat(200)));
      } else assert(result.answer.includes('Ivory_Key'));
    }
  }
});
for (const tool of semanticTools) test(`actual Semantic tools/call ${tool}: insufficient and positive contracts, scope, caps`, async () => {
  for (const query of ['OWA enum pola `State_Tag`', 'OWAOntology.MissingFir', 'OWAOntology.FullCard i OWAOntology.MissingElm',
    'OWA Wspólna karta', 'OWA jaki jest stan dokumentu?', 'OWAOntology.PlainCard mapowanie pól',
    'OWAOntology.FullCard proces PZ → FZ mapowanie CDN.SyntheticCard']) {
    const rpc = await call(tool, query);
    assert(!rpc.error, JSON.stringify(rpc.error));
    const result = rpc.result.structuredContent;
    assert(result.owaCoverage, `MCP additive coverage: ${query}`);
    assert.deepEqual(result.answerNotes, result.owaCoverage.notices);
    assert.equal(result.correlation_id, 'task4-fixture');
    assert.deepEqual(result.validity, { valid_from: null, valid_to: null, as_of: '2026-10-15' });
    assert.equal(result.retrieval.backend, 'local_artifacts');
    assert.equal(result.retrieval.graphUsed, false);
    assert.equal(result.retrieval.confidenceMeaning, 'heuristic_retrieval_score');
    assert(result.warnings.length);
    assert(result.evidence.every(item => [kb, support].includes(item.kb)));
    assert(result.sources.length <= 2);
    const { answer: full } = await api.answerQuestion(query, new Set([kb, support]), { semanticIntent: semanticIntentForTool(tool) });
    assert.equal(result.answer, api.renderAnswerMarkdown(full));
    assert.deepEqual(result.sources, full.sources);
    assert.deepEqual(result.owaCoverage, full.owaCoverage);
    assert(full.extracts.reduce((sum, unit) => sum + unit.text.length, 0) <= 4000);
    for (const source of full.sources) assert(full.extracts.filter(unit => unit.sourceKey === source.key).length <= 3);
    const positive = query.startsWith('OWAOntology.FullCard proces');
    assert.equal(result.knowledge_status, positive ? 'partial' : 'unknown', `${query}: ${JSON.stringify(result.owaCoverage)}`);
    assert.equal(result.evidenceAssessment.status, positive ? 'unverified_evidence' : 'insufficient_evidence');
    assert.equal(rpc.result.content[0].text, result.answer);
    const injected = await call(tool, query, { intent: 'release', options: { intent: 'release' }, allowedNamespaces: ['ComarchCommunityNews'] });
    assert.deepEqual(injected.result.structuredContent.sources, result.sources);
    assert.deepEqual(injected.result.structuredContent.owaCoverage, result.owaCoverage);
  }
  const excluded = await call(tool, 'OWAOntology.SignalCard enum `State_Tag`', {}, new Set([support]));
  assert(!excluded.error);
  assert(excluded.result.structuredContent.evidence.every(item => item.kb === support));
  assert(!excluded.result.structuredContent.sources.some(source => source.namespace === kb));
  assert(!excluded.result.structuredContent.owaCoverage);
  assert.equal((await call(tool, 'OWA', {}, new Set())).error.code, -32001);
  const schema = listToolsForProfile(profile).find(item => item.name === tool).inputSchema;
  assert.equal(schema.additionalProperties, false);
  assert(!schema.properties.intent);
});

test('fixture has zero network/process/outside reads/runtime writes/draft/learning output', () => {
  assert.equal(forbiddenCalls, 0);
  for (const directory of ['downloads', 'logs', 'data']) assert(!fs.existsSync(path.join(root, directory)));
});
