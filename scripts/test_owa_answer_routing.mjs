#!/usr/bin/env node
// Static routing definitions only; importing the classifier does not load artifacts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { classifyQuestion, buildResponse } from './erp_knowledge_assistant.mjs';

const routing = JSON.parse(fs.readFileSync(new URL('../docs/reference/ERP_Knowledge_Assistant_Routing.json', import.meta.url), 'utf8'));
const OWA = 'OWAOntology', SEMANTICS = 'ComarchOptimaBusinessSemantics';
const semanticScope = new Set([OWA, SEMANTICS]);

test('explicit OWA wins over generic entity/workflow/Optima/news routing', () => {
  for (const question of [
    'W ontologii OWA czym jest kontrahent?',
    'Jak OWA opisuje workflow i ograniczenia?',
    'OWAOntology.TestEntity',
    'W OWA czym jest uczestnik i jakie ma identyfikatory?',
    'Ceny i waluty taryfy w OWA: co oznaczają?',
    'OWA: pełne mapowanie pól uczestnika do MSSQL i API Optima',
    'OWAOntology',
    'OWA nowa wersja Optima',
  ]) {
    const classified = classifyQuestion(question, routing, semanticScope);
    assert.equal(classified.primaryRoute.primaryKb, OWA, question);
    assert.equal(classified.question, question);
    assert(classified.supportKbs.includes(SEMANTICS));
  }
});

test('explicit OWA remains selected even with zero keyword scores and a legacy fallback', () => {
  const staticRouting = structuredClone(routing);
  staticRouting.routes = staticRouting.routes.map(route => ({ ...route, keywords: [] }));
  assert.equal(classifyQuestion('OWAOntology.Example', staticRouting).primaryRoute.primaryKb, OWA);
});

test('excluded OWA falls back only within allowed scope', () => {
  for (const allowed of [new Set([SEMANTICS]), new Set(['ComarchOptimaSchema']), new Set(['TaxbellLegalReference'])]) {
    const result = classifyQuestion('W OWA czym jest kontrahent?', routing, allowed);
    assert(allowed.has(result.primaryRoute.primaryKb));
    assert(result.supportKbs.every(kb => allowed.has(kb)));
    assert(result.routeScores.every(route => allowed.has(route.primaryKb)));
    const response = buildResponse(result, routing, allowed);
    assert(response.supportKbs.every(kb => allowed.has(kb.name)));
  }
  assert.equal(classifyQuestion('W OWA czym jest kontrahent?', routing, new Set([SEMANTICS])).primaryRoute.primaryKb, SEMANTICS);
});

test('OWA-only and empty scopes never add supporting KBs', () => {
  const result = classifyQuestion('OWA workflow JOIN COM Optima', routing, new Set([OWA]));
  assert.equal(result.primaryRoute.primaryKb, OWA);
  assert.deepEqual(result.supportKbs, []);
  assert.deepEqual(buildResponse(result, routing, new Set([OWA])).supportKbs, []);
  assert.throws(() => classifyQuestion('OWA', routing, new Set()), /No knowledge route/);
});

test('existing server-selected release intent has final precedence within scope', () => {
  const allowed = new Set([OWA, SEMANTICS, 'ComarchCommunityNews', 'ComarchOptimaReference']);
  const question = 'W OWA czym jest uczestnik?';
  assert.equal(classifyQuestion(question, routing, allowed).primaryRoute.primaryKb, OWA);
  const release = classifyQuestion(question, routing, allowed, { intent: 'release' });
  assert.equal(release.primaryRoute.primaryKb, 'ComarchCommunityNews');
  assert(release.supportKbs.includes('ComarchOptimaReference'));
  assert.equal(classifyQuestion(question, routing, semanticScope, { intent: 'release' }).primaryRoute.primaryKb, OWA);
});

test('ordinary words containing owa keep legacy routing', () => {
  for (const question of ['nowa faktura', 'Przechowywanie towaru', 'Co oznacza typ dokumentu PZ w Optima?']) {
    const result = classifyQuestion(question, routing);
    const withoutOwa = classifyQuestion(question, routing, new Set(routing.routes.map(route => route.primaryKb).filter(kb => kb !== OWA)));
    assert.equal(result.primaryRoute.primaryKb, withoutOwa.primaryRoute.primaryKb, question);
  }
});

test('classification preserves shared routing definitions', () => {
  const before = JSON.stringify(routing);
  classifyQuestion('OWA: uczestnik', routing, semanticScope);
  assert.equal(JSON.stringify(routing), before);
});
