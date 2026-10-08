#!/usr/bin/env node

import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
process.env.ROOT = process.env.ROOT || path.resolve(scriptDirectory, '..');
const { KB_DETAILS, buildResponse, classifyQuestion, filterRouting, listKnowledgeBases, loadRouting } = await import('./erp_knowledge_assistant.mjs');

const SEMANTICS = 'ComarchOptimaBusinessSemantics';
const SCHEMA = 'ComarchOptimaSchema';
const COM = 'ComarchOptimaAdditionalFunctions';
const PARTNER = 'ComarchOptimaPartnerTechnical';
const SPRINT = 'ComarchOptimaSprint';
const routing = loadRouting();
const originalRouting = JSON.stringify(routing);
let checks = 0;

function check(name, run) {
  run();
  checks += 1;
  process.stdout.write(`PASS ${name}\n`);
}

function supportNames(response) {
  return response.supportKbs.map((kb) => kb.name);
}

const synthetic = {
  question: 'Znaczenie PZ, COM i SQL',
  primaryRoute: { primaryKb: SEMANTICS, intent: 'optima_business_semantics', matched: ['znaczenie'] },
  supportKbs: [SCHEMA, SCHEMA, SEMANTICS],
  blendedRoutes: [
    { case: 'fd_implementation_with_table_context', primaryKb: COM, supportKbs: [SCHEMA, PARTNER] },
    { case: 'print_sql_and_joins', primaryKb: SPRINT, supportKbs: [SCHEMA, COM] },
    { case: 'duplicate', primaryKb: COM, supportKbs: [SEMANTICS, PARTNER] },
  ],
  routeScores: [
    { primaryKb: SEMANTICS, intent: 'optima_business_semantics', score: 12, matched: ['znaczenie'] },
    { primaryKb: COM, intent: 'optima_additional_functions', score: 4, matched: ['com'] },
    { primaryKb: PARTNER, intent: 'optima_partner_technical', score: 2, matched: ['partner'] },
  ],
};
const originalSynthetic = JSON.stringify(synthetic);

check('Trafione trasy dodają primary i wsparcie z kompletem artefaktów', () => {
  const response = buildResponse(synthetic, routing);
  assert.equal(response.primaryKb.name, SEMANTICS);
  assert.deepEqual(supportNames(response), [SCHEMA, COM, PARTNER, SPRINT]);
  for (const kb of [response.primaryKb, ...response.supportKbs]) {
    assert.equal(kb.namespace, kb.name);
    assert.equal(kb.projectId, KB_DETAILS[kb.name].projectId);
    assert.deepEqual(kb.artifacts, KB_DETAILS[kb.name].artifacts);
    assert.ok(kb.artifacts.length > 0);
  }
});

check('Kolejność wsparcia jest stabilna, bez duplikatów i primary', () => {
  const first = buildResponse(synthetic, routing);
  const repeated = buildResponse(structuredClone(synthetic), routing);
  assert.deepEqual(repeated, first);
  assert.equal(new Set(supportNames(first)).size, first.supportKbs.length);
  assert.ok(!supportNames(first).includes(first.primaryKb.name));
});

check('Ograniczenie namespace filtruje również mieszane trasy i ranking', () => {
  const allowed = new Set([SEMANTICS, COM]);
  const response = buildResponse(synthetic, routing, allowed);
  assert.deepEqual(supportNames(response), [COM]);
  assert.deepEqual(response.blendedRoutes.map((blend) => blend.case), ['fd_implementation_with_table_context', 'duplicate']);
  for (const blend of response.blendedRoutes) {
    assert.ok(allowed.has(blend.primaryKb));
    assert.ok(blend.supportKbs.every((kb) => allowed.has(kb)));
  }
  assert.ok(response.topRoutes.every((route) => allowed.has(route.primaryKb)));
});

check('Filtrowanie routingu nie ujawnia niedozwolonych blendedRoutes', () => {
  const allowed = new Set([SCHEMA, COM]);
  const filtered = filterRouting(routing, allowed);
  for (const route of [...filtered.routes, ...filtered.blendedRoutes]) {
    assert.ok(allowed.has(route.primaryKb));
    assert.ok(route.supportKbs.every((kb) => allowed.has(kb)));
  }
  assert.ok(filtered.primaryKbOrder.every((kb) => allowed.has(kb)));
  assert.ok(filtered.blendedRoutes.some((route) => route.case === 'fd_implementation_with_table_context'));
});

check('Pusty Set nie oznacza dostępu do wszystkich KB', () => {
  const allowed = new Set();
  const filtered = filterRouting(routing, allowed);
  assert.deepEqual(filtered.routes, []);
  assert.deepEqual(filtered.blendedRoutes, []);
  assert.deepEqual(filtered.primaryKbOrder, []);
  assert.deepEqual(listKnowledgeBases(allowed), {});
  assert.throws(() => classifyQuestion('Optima PZ COM SQL', routing, allowed), /No knowledge route/);
  assert.throws(() => buildResponse(synthetic, routing, allowed), /Brak dozwolonej bazy/);
});

check('Bezpośrednie buildResponse odrzuca niedozwolone primary', () => {
  assert.throws(() => buildResponse(synthetic, routing, new Set([COM])), /Brak dozwolonej bazy/);
});

check('Brak ograniczenia namespace zachowuje dotychczasowy kontrakt', () => {
  assert.equal(filterRouting(routing, null), routing);
  assert.equal(listKnowledgeBases(null), KB_DETAILS);
  assert.deepEqual(buildResponse(synthetic, routing, null), buildResponse(synthetic, routing));
});

check('Pytanie PZ z COM i SQL zachowuje semantykę i dodaje przykłady COM', () => {
  const question = 'Optima PZ: co oznacza typ dokumentu, dopuszczalne wartości i ograniczenia? COM AddNew SQL TraNag';
  const classified = classifyQuestion(question, routing);
  const response = buildResponse(classified, routing);
  assert.equal(response.primaryKb.name, SEMANTICS);
  assert.ok(classified.blendedRoutes.some((route) => route.case === 'fd_implementation_with_table_context'));
  assert.ok(supportNames(response).includes(SCHEMA));
  assert.ok(supportNames(response).includes(COM));
});

check('Pytanie PZ w profilu semantycznym nie przekracza zakresu', () => {
  const allowed = new Set([SEMANTICS, SCHEMA]);
  const question = 'Optima PZ: co oznacza typ dokumentu, dopuszczalne wartości i ograniczenia? COM AddNew SQL TraNag';
  const classified = classifyQuestion(question, routing, allowed);
  const response = buildResponse(classified, routing, allowed);
  assert.equal(response.primaryKb.name, SEMANTICS);
  assert.deepEqual(supportNames(response), [SCHEMA]);
  assert.deepEqual(response.blendedRoutes, []);
});

check('Trasa bez mieszanego trafienia pozostaje bez nowego wsparcia', () => {
  const question = 'Jak działa token Betterfly API?';
  const classified = classifyQuestion(question, routing);
  const response = buildResponse(classified, routing);
  assert.equal(response.primaryKb.name, 'ComarchBetterflyReference');
  assert.deepEqual(supportNames(response), []);
  assert.deepEqual(response.blendedRoutes, []);
});

check('Operacje nie zmieniają współdzielonego routingu ani wejściowego wyniku', () => {
  assert.equal(JSON.stringify(routing), originalRouting);
  assert.equal(JSON.stringify(synthetic), originalSynthetic);
});

process.stdout.write(JSON.stringify({ ok: true, checks, externalCalls: 0 }) + '\n');
