#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { appendDashboardAudit } from './dashboard_audit.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';
const AUTOPILOT_STATE_PATH = path.join(ROOT, 'data/dashboard/learning/autopilot_state.json');
const FP_RATE_FREEZE_THRESHOLD = 0.15;
const FP_RATE_THROTTLE_THRESHOLD = 0.10;
const ACCEPT_RATE_FREEZE_THRESHOLD = 0.25;
const ACCEPT_RATE_THROTTLE_THRESHOLD = 0.40;
const NOISE_PENALTY_FREEZE_THRESHOLD = 0.5;
const NOISE_PENALTY_THROTTLE_THRESHOLD = 0.3;
const FREEZE_RECOVERY_DAYS = 7;
const DOMAIN_FREEZE_RECOVERY_DAYS = 14;
const THROTTLE_RECOVERY_RATE = 0.01;
const MAX_THROTTLE_BOOST = 0.98;
const OPERATOR_OVERRIDE_HOURS = 48;

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJsonAtomic(filePath, value, mode = 0o640) {
  ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.${process.pid}.${crypto.randomUUID().slice(0, 8)}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode });
  fs.renameSync(tempPath, filePath);
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function daysSince(isoString) {
  if (!isoString) return 999;
  const then = new Date(isoString).getTime();
  return (Date.now() - then) / 86400000;
}

export function defaultAutopilotState() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    frozenKbNamespaces: {},
    frozenDomains: {},
    throttledThresholds: {},
    recoveryCounters: {},
    operatorOverrides: {},
    lastActions: [],
  };
}

export function loadAutopilotState() {
  const stored = readJson(AUTOPILOT_STATE_PATH, {});
  return { ...defaultAutopilotState(), ...stored };
}

export function saveAutopilotState(state) {
  state.updatedAt = new Date().toISOString();
  writeJsonAtomic(AUTOPILOT_STATE_PATH, state);
  return state;
}

export function evaluateAutopilotDecisions(learningState, discoveryState) {
  const decisions = {
    freezeKb: [],
    unfreezeKb: [],
    freezeDomain: [],
    unfreezeDomain: [],
    throttle: [],
    unthrottle: [],
    autoReject: [],
  };

  const autoState = loadAutopilotState();
  const today = new Date().toISOString().slice(0, 10);

  // KB freeze / throttle from automation learning state
  if (learningState?.byKbNamespace) {
    for (const [ns, kb] of Object.entries(learningState.byKbNamespace)) {
      const fpRate = kb.windowFpRate ?? 0;
      const acceptanceRate = kb.acceptanceRate ?? 1;
      const reviewed = kb.reviewed ?? 0;
      const currentFreeze = autoState.frozenKbNamespaces[ns];
      const override = autoState.operatorOverrides[`kb:${ns}`];

      // Check operator override
      if (override && daysSince(override.since) < OPERATOR_OVERRIDE_HOURS / 24) {
        continue;
      }

      // Freeze conditions
      if (!currentFreeze) {
        const reason = fpRate > FP_RATE_FREEZE_THRESHOLD ? 'fp_rate_high'
          : (reviewed >= 5 && acceptanceRate < ACCEPT_RATE_FREEZE_THRESHOLD) ? 'acceptance_rate_low'
          : null;
        if (reason) {
          decisions.freezeKb.push({ ns, reason, fpRate, acceptanceRate, reviewed });
        }
      }

      // Throttle conditions (only if not frozen)
      if (!currentFreeze) {
        const currentThrottle = autoState.throttledThresholds[ns];
        const shouldThrottle = fpRate > FP_RATE_THROTTLE_THRESHOLD
          || (reviewed >= 3 && acceptanceRate < ACCEPT_RATE_THROTTLE_THRESHOLD);
        if (shouldThrottle && !currentThrottle) {
          const boost = parseFloat(
            Math.min(MAX_THROTTLE_BOOST - 0.5, (fpRate > FP_RATE_THROTTLE_THRESHOLD ? 0.03 : 0) + (acceptanceRate < ACCEPT_RATE_THROTTLE_THRESHOLD ? 0.02 : 0)).toFixed(4),
          );
          decisions.throttle.push({ ns, boost, fpRate, acceptanceRate });
        }
      }
    }
  }

  // Domain freeze / throttle from discovery learning state
  if (discoveryState?.byDomain) {
    for (const [domain, stats] of Object.entries(discoveryState.byDomain)) {
      const penalty = stats.noisePenalty ?? 0;
      const currentFreeze = autoState.frozenDomains[domain];
      const override = autoState.operatorOverrides[`domain:${domain}`];

      if (override && daysSince(override.since) < OPERATOR_OVERRIDE_HOURS / 24) {
        continue;
      }

      if (!currentFreeze && penalty > NOISE_PENALTY_FREEZE_THRESHOLD) {
        decisions.freezeDomain.push({ domain, noisePenalty: penalty });
      }

      if (!currentFreeze && !autoState.throttledThresholds[`domain:${domain}`] && penalty > NOISE_PENALTY_THROTTLE_THRESHOLD) {
        decisions.throttle.push({ ns: `domain:${domain}`, boost: 0.02, domain, noisePenalty: penalty });
      }
    }
  }

  // Recovery: unfreeze KB
  if (autoState.frozenKbNamespaces) {
    for (const [ns, frozen] of Object.entries(autoState.frozenKbNamespaces)) {
      const kb = learningState?.byKbNamespace?.[ns] || {};
      const fpRate = kb.windowFpRate ?? 0;
      const acceptanceRate = kb.acceptanceRate ?? 1;
      const reviewedToday = kb.reviewed ?? 0;
      const counter = autoState.recoveryCounters[ns] || { goodDays: 0, requiredDays: FREEZE_RECOVERY_DAYS, anomalyFound: false };

      if (fpRate <= 0.08 && acceptanceRate >= 0.5) {
        const updatedCounter = { ...counter, goodDays: counter.goodDays + 1, anomalyFound: false };
        if (updatedCounter.goodDays >= updatedCounter.requiredDays && reviewedToday >= 3) {
          decisions.unfreezeKb.push({ ns, reason: 'recovery', goodDays: updatedCounter.goodDays });
        }
      } else {
        decisions.throttle.push({ ns, boost: 0, note: 'recovery_counter_reset' });
      }
    }
  }

  // Recovery: unfreeze domain
  if (autoState.frozenDomains) {
    for (const [domain, frozen] of Object.entries(autoState.frozenDomains)) {
      const domainStats = discoveryState?.byDomain?.[domain] || {};
      const penalty = domainStats.noisePenalty ?? 0;
      const counter = autoState.recoveryCounters[`domain:${domain}`] || { goodDays: 0, requiredDays: DOMAIN_FREEZE_RECOVERY_DAYS };

      if (penalty <= NOISE_PENALTY_THROTTLE_THRESHOLD) {
        const updatedCounter = { ...counter, goodDays: counter.goodDays + 1 };
        if (updatedCounter.goodDays >= updatedCounter.requiredDays) {
          decisions.unfreezeDomain.push({ domain, goodDays: updatedCounter.goodDays });
        }
      } else {
        // Anomaly found during recovery — reset counter
      }
    }
  }

  // Unthrottle: gradual recovery
  if (autoState.throttledThresholds) {
    for (const [key, throttled] of Object.entries(autoState.throttledThresholds)) {
      const isDomain = key.startsWith('domain:');
      const ns = isDomain ? key.slice(7) : key;
      const fpRate = isDomain ? 0 : (learningState?.byKbNamespace?.[ns]?.windowFpRate ?? 0);
      const acceptanceRate = isDomain ? 1 : (learningState?.byKbNamespace?.[ns]?.acceptanceRate ?? 1);

      if (fpRate <= 0.08 && acceptanceRate >= 0.5) {
        const newBoost = parseFloat(Math.max(0, (throttled.boost || 0) - THROTTLE_RECOVERY_RATE).toFixed(4));
        if (newBoost <= 0) {
          decisions.unthrottle.push({ ns: key, reason: 'recovered' });
        } else if (newBoost < (throttled.boost || 0)) {
          decisions.unthrottle.push({ ns: key, reason: 'gradual', newBoost });
        }
      }
    }
  }

  // Auto-reject safe cases
  if (discoveryState?.byDomain) {
    for (const [domain, stats] of Object.entries(discoveryState.byDomain)) {
      if (autoState.frozenDomains[domain]) {
        decisions.autoReject.push({ domain, reason: 'domain_frozen' });
      }
    }
  }

  return decisions;
}

export function applyAutopilotDecisions(decisions) {
  const state = loadAutopilotState();
  const today = new Date().toISOString();
  const actions = [];

  // Apply freeze KB
  for (const d of decisions.freezeKb) {
    state.frozenKbNamespaces[d.ns] = {
      frozenAt: today,
      reason: d.reason,
      fpRate: d.fpRate ?? 0,
      acceptanceRate: d.acceptanceRate ?? 1,
      reviewed: d.reviewed ?? 0,
    };
    state.recoveryCounters[d.ns] = { goodDays: 0, requiredDays: FREEZE_RECOVERY_DAYS };
    if (state.throttledThresholds[d.ns]) {
      delete state.throttledThresholds[d.ns];
    }
    actions.push({ type: 'freeze_kb', ns: d.ns, reason: d.reason, at: today });
  }

  // Apply unfreeze KB
  for (const d of decisions.unfreezeKb) {
    delete state.frozenKbNamespaces[d.ns];
    delete state.recoveryCounters[d.ns];
    actions.push({ type: 'unfreeze_kb', ns: d.ns, reason: d.reason, at: today });
  }

  // Apply freeze domain
  for (const d of decisions.freezeDomain) {
    state.frozenDomains[d.domain] = {
      frozenAt: today,
      reason: 'noise_penalty_high',
      noisePenalty: d.noisePenalty ?? 0,
    };
    state.recoveryCounters[`domain:${d.domain}`] = { goodDays: 0, requiredDays: DOMAIN_FREEZE_RECOVERY_DAYS };
    actions.push({ type: 'freeze_domain', domain: d.domain, at: today });
  }

  // Apply unfreeze domain
  for (const d of decisions.unfreezeDomain) {
    delete state.frozenDomains[d.domain];
    delete state.recoveryCounters[`domain:${d.domain}`];
    actions.push({ type: 'unfreeze_domain', domain: d.domain, at: today });
  }

  // Apply throttle
  for (const d of decisions.throttle) {
    if (d.note === 'recovery_counter_reset') {
      const counter = state.recoveryCounters[d.ns];
      if (counter) { counter.goodDays = 0; counter.anomalyFound = true; }
      continue;
    }
    state.throttledThresholds[d.ns] = {
      boost: d.boost ?? 0.02,
      since: today,
    };
    actions.push({ type: 'throttle', ns: d.ns, boost: d.boost ?? 0.02, at: today });
  }

  // Apply unthrottle
  for (const d of decisions.unthrottle) {
    if (d.reason === 'recovered') {
      delete state.throttledThresholds[d.ns];
      actions.push({ type: 'unthrottle', ns: d.ns, at: today });
    } else if (d.reason === 'gradual' && d.newBoost != null) {
      state.throttledThresholds[d.ns].boost = d.newBoost;
      actions.push({ type: 'unthrottle_gradual', ns: d.ns, newBoost: d.newBoost, at: today });
    }
  }

  // Log actions
  for (const action of actions) {
    state.lastActions.push({ ...action, ts: today });
  }
  state.lastActions = state.lastActions.slice(-50);

  saveAutopilotState(state);

  // Audit
  for (const action of actions) {
    appendDashboardAudit({
      actor: 'autopilot',
      role: 'system',
      action: `autopilot.${action.type}`,
      resourceType: action.domain ? 'domain' : 'kb_namespace',
      resourceId: action.ns || action.domain || 'unknown',
      after: action,
    });
  }

  return { state, actions };
}

export function autopilotSummary(state) {
  const s = state || loadAutopilotState();
  const frozenKbCount = Object.keys(s.frozenKbNamespaces).length;
  const frozenDomainCount = Object.keys(s.frozenDomains).length;
  const throttledCount = Object.keys(s.throttledThresholds).length;
  const recentActions = (s.lastActions || []).slice(-10);
  return {
    frozenKbCount,
    frozenDomainCount,
    throttledCount,
    frozenKbNamespaces: Object.keys(s.frozenKbNamespaces),
    frozenDomains: Object.keys(s.frozenDomains),
    throttledThresholds: s.throttledThresholds,
    recentActions,
    operatorOverrides: Object.keys(s.operatorOverrides || {}),
  };
}

export function effectiveThreshold(baseThreshold, autopilotState, ns) {
  const throttle = autopilotState?.throttledThresholds?.[ns];
  if (!throttle || !throttle.boost) return baseThreshold;
  return Math.min(MAX_THROTTLE_BOOST, baseThreshold + throttle.boost);
}

export function isKbFrozen(ns, autopilotState) {
  return !!autopilotState?.frozenKbNamespaces?.[ns];
}

export function isDomainFrozen(domain, autopilotState) {
  return !!autopilotState?.frozenDomains?.[domain];
}

export function setOperatorOverride(nsOrDomain, type, hours = OPERATOR_OVERRIDE_HOURS) {
  const state = loadAutopilotState();
  if (!state.operatorOverrides) state.operatorOverrides = {};
  const key = `${type}:${nsOrDomain}`;
  state.operatorOverrides[key] = { since: new Date().toISOString(), expiresInHours: hours };
  saveAutopilotState(state);
  return state;
}

export function removeOperatorOverride(nsOrDomain, type) {
  const state = loadAutopilotState();
  if (!state.operatorOverrides) return state;
  const key = `${type}:${nsOrDomain}`;
  delete state.operatorOverrides[key];
  saveAutopilotState(state);
  return state;
}
