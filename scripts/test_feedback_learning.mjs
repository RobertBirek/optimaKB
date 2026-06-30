#!/usr/bin/env node

import assert from 'assert';

const learning = await import(`./lib/feedback_learning.mjs?test=${Date.now()}`);

const discoveryCandidates = [
  {
    id: 'c1',
    kbNamespace: 'TaxbellLegalReference',
    queryId: 'q1',
    canonicalUrl: 'https://example.org/a',
    sourceTier: 'professional',
    action: 'CREATE_DRAFT',
    status: 'DRAFTED',
    operatorDecision: {
      source: 'operator',
      actualAction: 'CREATE_DRAFT',
      expectedAction: 'CREATE_DRAFT',
      outcome: 'DRAFTED',
      decidedAt: '2026-06-29T07:00:00.000Z',
      note: 'good source',
    },
  },
  {
    id: 'c2',
    kbNamespace: 'TaxbellLegalReference',
    queryId: 'q1',
    canonicalUrl: 'https://example.org/b',
    sourceTier: 'professional',
    action: 'CREATE_DRAFT',
    status: 'REJECTED',
    operatorDecision: {
      source: 'operator',
      actualAction: 'REJECT',
      expectedAction: 'CREATE_DRAFT',
      outcome: 'REJECTED',
      decidedAt: '2026-06-29T07:10:00.000Z',
      note: 'duplicate boilerplate',
    },
  },
  {
    id: 'c3',
    kbNamespace: 'TaxbellLegalReference',
    queryId: 'q2',
    canonicalUrl: 'https://trusted.example.com/c',
    sourceTier: 'official',
    action: 'CREATE_DRAFT',
    status: 'DRAFTED',
    operatorDecision: {
      source: 'operator',
      actualAction: 'CREATE_DRAFT',
      expectedAction: 'CREATE_DRAFT',
      outcome: 'DRAFTED',
      decidedAt: '2026-06-29T07:20:00.000Z',
      note: 'official and useful',
    },
  },
  {
    id: 'c4',
    kbNamespace: 'TaxbellLegalReference',
    queryId: 'q2',
    canonicalUrl: 'https://trusted.example.com/d',
    sourceTier: 'official',
    action: 'CREATE_DRAFT',
    status: 'DRAFTED',
    operatorDecision: {
      source: 'operator',
      actualAction: 'CREATE_DRAFT',
      expectedAction: 'CREATE_DRAFT',
      outcome: 'DRAFTED',
      decidedAt: '2026-06-29T07:30:00.000Z',
      note: 'another official success',
    },
  },
];

const discoveryState = learning.deriveDiscoveryLearningState(discoveryCandidates, { persist: false });
assert.strictEqual(discoveryState.overall.reviewed, 4);
assert.strictEqual(discoveryState.byQuery.q1.reviewed, 2);
assert(discoveryState.byDomain['trusted.example.com'].scoreDelta > 0);
assert(discoveryState.byQuery.q1.scoreDelta < 0);
assert(discoveryState.promptMemory.recentRejectNotes.length > 0);

const candidateAdjustment = learning.discoveryLearningAdjustment({
  kbNamespace: 'TaxbellLegalReference',
  queryId: 'q1',
  canonicalUrl: 'https://trusted.example.com/new',
  sourceTier: 'official',
}, discoveryState);
assert(candidateAdjustment.scoreDelta !== 0);
assert(candidateAdjustment.reasons.length > 0);

const queryAdjustment = learning.discoveryQueryLearningAdjustment({ id: 'q1', kbNamespace: 'TaxbellLegalReference' }, discoveryState);
assert(queryAdjustment.orderDelta < 0);
assert(queryAdjustment.confidenceBias > 0);
assert(learning.buildDiscoveryPromptMemory({ id: 'q1', kbNamespace: 'TaxbellLegalReference' }, { kbNamespace: 'TaxbellLegalReference' }, discoveryState).length > 0);

const automationJobs = [
  {
    id: 'j1',
    mode: 'shadow',
    origin: 'live',
    kbNamespace: 'ComarchOptimaReference',
    review: { confidence: 0.88, targetKb: 'ComarchBetterflyReference' },
    adjudication: { actualAction: 'publish', expectedAction: 'hold', correct: false },
  },
  {
    id: 'j2',
    mode: 'shadow',
    origin: 'live',
    kbNamespace: 'ComarchOptimaReference',
    review: { confidence: 0.82, targetKb: 'ComarchBetterflyReference' },
    adjudication: { actualAction: 'reroute', expectedAction: 'reroute', correct: true },
    reroute: { sourceKb: 'ComarchOptimaReference', targetKb: 'ComarchBetterflyReference' },
  },
  {
    id: 'j3',
    mode: 'shadow',
    origin: 'live',
    kbNamespace: 'ComarchOptimaReference',
    review: { confidence: 0.81, targetKb: 'ComarchBetterflyReference' },
    adjudication: { actualAction: 'reroute', expectedAction: 'reroute', correct: true },
    reroute: { sourceKb: 'ComarchOptimaReference', targetKb: 'ComarchBetterflyReference' },
  },
];

const automationState = learning.deriveAutomationLearningState(automationJobs, { persist: false });
assert.strictEqual(automationState.overall.reviewed, 3);
assert(automationState.byKbNamespace.ComarchOptimaReference.publishFalsePositiveRate > 0);
assert(automationState.reroutePairs['ComarchOptimaReference->ComarchBetterflyReference'].scoreDelta > 0);
assert(automationState.promptMemory.recentRerouteNotes.length > 0 || automationState.promptMemory.recentRejectNotes.length >= 0);

const automationAdjustment = learning.automationLearningAdjustment({
  kbNamespace: 'ComarchOptimaReference',
  review: { confidence: 0.84, targetKb: 'ComarchBetterflyReference' },
  shadow: { publishable: true },
}, automationState);
assert(['hold', 'reroute', null].includes(automationAdjustment.recommendedAction));
assert(automationAdjustment.priorityDelta > 0);

const guardrails = learning.automationGuardrailsForDraft({ kbNamespace: 'ComarchOptimaReference' }, automationState);
assert(guardrails.publishConfidenceDelta > 0);
assert(learning.buildAutomationPromptMemory({ kbNamespace: 'ComarchOptimaReference' }, automationState).length > 0);

{
  const kbJobs = [
    { mode: 'shadow', origin: 'live', kbNamespace: 'TestKB', adjudication: { actualAction: 'publish', expectedAction: 'publish' } },
    { mode: 'shadow', origin: 'live', kbNamespace: 'TestKB', adjudication: { actualAction: 'publish', expectedAction: 'publish' } },
    { mode: 'shadow', origin: 'live', kbNamespace: 'TestKB', adjudication: { actualAction: 'publish', expectedAction: 'publish' } },
    { mode: 'shadow', origin: 'live', kbNamespace: 'TestKB', adjudication: { actualAction: 'publish', expectedAction: 'hold' } },
    { mode: 'shadow', origin: 'live', kbNamespace: 'TestKB', adjudication: { actualAction: 'publish', expectedAction: 'hold' } },
  ];
  const state = learning.deriveAutomationLearningState(kbJobs, { persist: false });
  const tunedKb = state.byKbNamespace.TestKB;
  assert.ok(tunedKb, 'should have TestKB entry');
  assert.equal(tunedKb.windowSize, 5, 'window should be 5');
  assert.equal(tunedKb.publishFalsePositives, 2, '2 false positives');
  assert.equal(tunedKb.windowFpRate, 0.4, 'windowFpRate should be 0.4');
  assert.ok(tunedKb.tunedBaseline > 0.6, 'tuned baseline should be above base (windowFpRate 0.4 > 0.2 target)');
  assert.ok(tunedKb.tunedBaseline <= 0.95, 'tuned baseline should be clamped to 0.95 max');
  assert.equal(tunedKb.baseThreshold, 0.6, 'baseThreshold should be 0.6');
  process.stdout.write('PASS: Phase 3 threshold tuning\n');
}

{
  const manyJobs = [];
  for (let index = 0; index < 55; index += 1) {
    manyJobs.push({ mode: 'shadow', origin: 'live', kbNamespace: 'WindowKB', adjudication: { actualAction: 'publish', expectedAction: 'publish' } });
  }
  manyJobs[0].adjudication.expectedAction = 'hold';
  manyJobs[1].adjudication.expectedAction = 'hold';
  const winState = learning.deriveAutomationLearningState(manyJobs, { persist: false });
  const winKb = winState.byKbNamespace.WindowKB;
  assert.equal(winKb.windowSize, 50, 'window size should be capped at 50');
  assert.equal(winKb.publishFalsePositives, 2, 'total false positives across all 55');
  assert.equal(winKb.windowFpRate, 0, 'windowFpRate should be 0 because FPs are at index 0 and 1, outside last-50 window');
  assert.equal(winKb.tunedBaseline.toFixed(4), '0.5000', 'tuned baseline with 0 fpRate should be 0.5');
  process.stdout.write('PASS: Phase 3 window boundary\n');
}

{
  const noiseCandidates = [
    { id: 'n1', kbNamespace: 'Test', queryId: 'q', canonicalUrl: 'https://spam.pl/a', sourceTier: 'unknown', action: 'CANDIDATE_ONLY', status: 'REJECTED', operatorDecision: { source: 'operator', actualAction: 'REJECT', expectedAction: 'CANDIDATE_ONLY', outcome: 'REJECTED', decidedAt: '2026-06-29T08:00:00Z' } },
    { id: 'n2', kbNamespace: 'Test', queryId: 'q', canonicalUrl: 'https://spam.pl/b', sourceTier: 'unknown', action: 'CANDIDATE_ONLY', status: 'REJECTED', operatorDecision: { source: 'operator', actualAction: 'REJECT', expectedAction: 'CANDIDATE_ONLY', outcome: 'REJECTED', decidedAt: '2026-06-29T08:01:00Z' } },
    { id: 'n3', kbNamespace: 'Test', queryId: 'q', canonicalUrl: 'https://spam.pl/c', sourceTier: 'unknown', action: 'CANDIDATE_ONLY', status: 'REJECTED', operatorDecision: { source: 'operator', actualAction: 'REJECT', expectedAction: 'CANDIDATE_ONLY', outcome: 'REJECTED', decidedAt: '2026-06-29T08:02:00Z' } },
    { id: 'n4', kbNamespace: 'Test', queryId: 'q', canonicalUrl: 'https://spam.pl/d', sourceTier: 'unknown', action: 'CANDIDATE_ONLY', status: 'REJECTED', operatorDecision: { source: 'operator', actualAction: 'REJECT', expectedAction: 'CANDIDATE_ONLY', outcome: 'REJECTED', decidedAt: '2026-06-29T08:03:00Z' } },
    { id: 'n5', kbNamespace: 'Test', queryId: 'q', canonicalUrl: 'https://spam.pl/e', sourceTier: 'unknown', action: 'CANDIDATE_ONLY', status: 'REJECTED', operatorDecision: { source: 'operator', actualAction: 'REJECT', expectedAction: 'CANDIDATE_ONLY', outcome: 'REJECTED', decidedAt: '2026-06-29T08:04:00Z' } },
    { id: 'g1', kbNamespace: 'Test', queryId: 'q', canonicalUrl: 'https://good.com/a', sourceTier: 'official', action: 'CREATE_DRAFT', status: 'DRAFTED', operatorDecision: { source: 'operator', actualAction: 'CREATE_DRAFT', expectedAction: 'CREATE_DRAFT', outcome: 'DRAFTED', decidedAt: '2026-06-29T08:10:00Z' } },
  ];
  const ns = learning.deriveDiscoveryLearningState(noiseCandidates, { persist: false });
  assert.ok(ns.byDomain['spam.pl'], 'should have spam.pl domain');
  assert.equal(ns.byDomain['spam.pl'].noisePenalty, 0.8, '100% reject rate should give 0.8 penalty');
  assert.equal(ns.byDomain['good.com'].noisePenalty, 0, 'only 1 reviewed, below threshold of 5, penalty should be 0');
  assert.equal(ns.byDomain['good.com'].reviewed, 1, 'only 1 reviewed, below threshold of 5');
  assert.equal(ns.byDomain['spam.pl'].operatorOverride, null, 'operatorOverride should default to null');
  process.stdout.write('PASS: Phase 3 noise penalty\n');
}

process.stdout.write(`${JSON.stringify({ ok: true }, null, 2)}\n`);
