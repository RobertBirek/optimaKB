#!/usr/bin/env node

import assert from 'assert';

const autopilot = await import(`./lib/dashboard_autopilot.mjs?test=${Date.now()}`);

// Test 1: default state
const defState = autopilot.defaultAutopilotState();
assert.strictEqual(defState.version, 1);
assert.strictEqual(Object.keys(defState.frozenKbNamespaces).length, 0);

// Test 2: evaluate freeze for KB with high FP rate
const learningState = {
  byKbNamespace: {
    TestKB: { windowFpRate: 0.18, acceptanceRate: 0.5, reviewed: 10, windowSize: 10 },
  },
};
const decisions = autopilot.evaluateAutopilotDecisions(learningState, {});
assert.strictEqual(decisions.freezeKb.length, 1);
assert.strictEqual(decisions.freezeKb[0].ns, 'TestKB');
assert.strictEqual(decisions.freezeKb[0].reason, 'fp_rate_high');
console.log('PASS: freeze KB with high FP rate');

// Test 3: evaluate freeze for KB with low acceptance rate
const learningState2 = {
  byKbNamespace: {
    TestKB2: { windowFpRate: 0.05, acceptanceRate: 0.15, reviewed: 6, windowSize: 10 },
  },
};
const decisions2 = autopilot.evaluateAutopilotDecisions(learningState2, {});
assert.strictEqual(decisions2.freezeKb.length, 1);
assert.strictEqual(decisions2.freezeKb[0].reason, 'acceptance_rate_low');
console.log('PASS: freeze KB with low acceptance rate');

// Test 4: no freeze for healthy KB
const learningState3 = {
  byKbNamespace: {
    HealthyKB: { windowFpRate: 0.05, acceptanceRate: 0.8, reviewed: 10, windowSize: 10 },
  },
};
const decisions3 = autopilot.evaluateAutopilotDecisions(learningState3, {});
assert.strictEqual(decisions3.freezeKb.length, 0);
console.log('PASS: no freeze for healthy KB');

// Test 5: evaluate throttle for KB with elevated FP rate
const learningState4 = {
  byKbNamespace: {
    ThrottledKB: { windowFpRate: 0.12, acceptanceRate: 0.6, reviewed: 10, windowSize: 10 },
  },
};
const decisions4 = autopilot.evaluateAutopilotDecisions(learningState4, {});
assert.strictEqual(decisions4.throttle.length, 1);
// should not freeze since fp rate is 0.12 (< 0.15)
assert.strictEqual(decisions4.freezeKb.length, 0);
console.log('PASS: throttle KB with elevated FP rate');

// Test 6: freeze domain with high noise penalty
const discoveryState = {
  byDomain: {
    'noisy.example.com': { noisePenalty: 0.6, reviewed: 5 },
  },
};
const decisions5 = autopilot.evaluateAutopilotDecisions({}, discoveryState);
assert.strictEqual(decisions5.freezeDomain.length, 1);
assert.strictEqual(decisions5.freezeDomain[0].domain, 'noisy.example.com');
console.log('PASS: freeze domain with high noise penalty');

// Test 7: apply + load round trip
const testDecisions = {
  freezeKb: [{ ns: 'FreezeMe', reason: 'fp_rate_high', fpRate: 0.18, acceptanceRate: 0.5, reviewed: 10 }],
  unfreezeKb: [],
  freezeDomain: [{ domain: 'spam.com', noisePenalty: 0.7 }],
  unfreezeDomain: [],
  throttle: [{ ns: 'SlowMe', boost: 0.03 }],
  unthrottle: [],
  autoReject: [],
};
const result = autopilot.applyAutopilotDecisions(testDecisions);
assert.strictEqual(result.state.frozenKbNamespaces['FreezeMe'].reason, 'fp_rate_high');
assert.strictEqual(result.state.frozenDomains['spam.com'].reason, 'noise_penalty_high');
assert.strictEqual(result.state.throttledThresholds['SlowMe'].boost, 0.03);
assert.strictEqual(result.actions.length, 3);
console.log('PASS: apply + load round trip');

// Test 8: effective threshold
const baseThresh = 0.85;
const autopilotState = {
  throttledThresholds: {
    SlowMe: { boost: 0.03 },
  },
};
const eff = autopilot.effectiveThreshold(baseThresh, autopilotState, 'SlowMe');
assert.strictEqual(eff, 0.88);
console.log('PASS: effective threshold');

const eff2 = autopilot.effectiveThreshold(baseThresh, autopilotState, 'NoThrottle');
assert.strictEqual(eff2, 0.85);
console.log('PASS: effective threshold for non-throttled KB');

// Test 9: isKbFrozen / isDomainFrozen
assert.strictEqual(autopilot.isKbFrozen('FreezeMe', result.state), true);
assert.strictEqual(autopilot.isKbFrozen('Unknown', result.state), false);
assert.strictEqual(autopilot.isDomainFrozen('spam.com', result.state), true);
assert.strictEqual(autopilot.isDomainFrozen('clean.com', result.state), false);
console.log('PASS: freeze checks');

// Test 10: summary
const summary = autopilot.autopilotSummary(result.state);
assert.strictEqual(summary.frozenKbCount, 1);
assert.strictEqual(summary.frozenDomainCount, 1);
assert.strictEqual(summary.throttledCount, 1);
console.log('PASS: autopilot summary');

// Test 11: operator override
autopilot.setOperatorOverride('FreezeMe', 'kb', 48);
const stateAfterOverride = autopilot.loadAutopilotState();
assert(stateAfterOverride.operatorOverrides['kb:FreezeMe']);
console.log('PASS: operator override');

autopilot.removeOperatorOverride('FreezeMe', 'kb');
const stateAfterRemove = autopilot.loadAutopilotState();
assert(!stateAfterRemove.operatorOverrides['kb:FreezeMe']);
console.log('PASS: remove operator override');

console.log('\nAll autopilot tests PASS');
