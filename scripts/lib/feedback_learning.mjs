#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import process from 'process';

const ROOT = process.env.ROOT || '/docker/openspg';
const LEARNING_ROOT = path.join(ROOT, 'data/dashboard/learning');
const DISCOVERY_LEARNING_PATH = path.join(LEARNING_ROOT, 'discovery_learning_state.json');
const AUTOMATION_LEARNING_PATH = path.join(LEARNING_ROOT, 'automation_learning_state.json');

const AUTOMATION_BASE_THRESHOLD = 0.6;
const AUTOMATION_MAX_WINDOW_SIZE = 50;
const TUNED_BASELINE_FLOOR = 0.3;
const TUNED_BASELINE_CEILING = 0.95;
const TUNED_BASELINE_TARGET_FP = 0.2;
const TUNED_BASELINE_SENSITIVITY = 0.5;

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJsonAtomic(filePath, value, mode = 0o640) {
  ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.${process.pid}.${crypto.randomUUID().slice(0, 8)}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode });
  fs.renameSync(tempPath, filePath);
}

function hostnameFor(url) {
  try {
    return new URL(String(url || '')).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function bounded(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function summarizeDecisionGroup(items = []) {
  const reviewedItems = items.filter((item) => item.operatorDecision?.source === 'operator');
  const reviewed = reviewedItems.length;
  const accepted = reviewedItems.filter((item) => ['CREATE_DRAFT', 'ROUTE_TO_PIPELINE'].includes(item.operatorDecision.actualAction)).length;
  const rejected = reviewedItems.filter((item) => item.operatorDecision.actualAction === 'REJECT').length;
  const duplicates = items.filter((item) => item.status === 'DUPLICATE' || item.operatorDecision?.outcome === 'DUPLICATE').length;
  const acceptanceRate = reviewed ? accepted / reviewed : null;
  const rejectRate = reviewed ? rejected / reviewed : null;
  const duplicateRate = items.length ? duplicates / items.length : 0;
  let scoreDelta = 0;
  const reasons = [];
  if (reviewed >= 2 && acceptanceRate != null && acceptanceRate >= 0.75) {
    scoreDelta += 8;
    reasons.push('wysoka akceptacja operatora');
  }
  if (reviewed >= 2 && rejectRate != null && rejectRate >= 0.5) {
    scoreDelta -= 10;
    reasons.push('częste odrzucenia operatora');
  }
  if (items.length >= 2 && duplicateRate >= 0.4) {
    scoreDelta -= 8;
    reasons.push('wysoka duplikacja');
  }
  return {
    reviewed,
    accepted,
    rejected,
    duplicates,
    acceptanceRate,
    rejectRate,
    duplicateRate,
    scoreDelta: bounded(scoreDelta, -15, 12),
    reasons: reasons.slice(0, 3),
  };
}

function groupBy(items, keyFn) {
  const grouped = new Map();
  for (const item of items) {
    const key = keyFn(item) || 'unknown';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }
  return grouped;
}

function objectFromGrouped(grouped, mapper) {
  return Object.fromEntries([...grouped.entries()].map(([key, items]) => [key, mapper(items, key)]));
}

function recentOperatorNotes(items = [], limit = 5) {
  return items
    .filter((item) => item.operatorDecision?.source === 'operator' && item.operatorDecision?.note)
    .sort((left, right) => String(right.operatorDecision.decidedAt || '').localeCompare(String(left.operatorDecision.decidedAt || '')))
    .slice(0, limit)
    .map((item) => String(item.operatorDecision.note || '').trim())
    .filter(Boolean);
}

export function deriveDiscoveryLearningState(candidates = [], options = {}) {
  const byDomainRaw = objectFromGrouped(groupBy(candidates, (candidate) => hostnameFor(candidate.canonicalUrl)), (items) => summarizeDecisionGroup(items));
  const byDomain = Object.fromEntries(Object.entries(byDomainRaw).map(([domain, stats]) => {
    let noisePenalty = 0;
    if (stats.reviewed >= 5 && stats.acceptanceRate != null) {
      noisePenalty = parseFloat(Math.max(0, Math.min(0.8, 1 - stats.acceptanceRate)).toFixed(4));
    }
    return [domain, { ...stats, noisePenalty, operatorOverride: null }];
  }));
  const byQuery = objectFromGrouped(groupBy(candidates, (candidate) => candidate.queryId), (items) => summarizeDecisionGroup(items));
  const byKbNamespace = objectFromGrouped(groupBy(candidates, (candidate) => candidate.kbNamespace), (items) => summarizeDecisionGroup(items));
  const bySourceTier = objectFromGrouped(groupBy(candidates, (candidate) => candidate.sourceTier), (items) => summarizeDecisionGroup(items));
  const state = {
    generatedAt: new Date().toISOString(),
    overall: {
      reviewed: candidates.filter((candidate) => candidate.operatorDecision?.source === 'operator').length,
      candidates: candidates.length,
    },
    byDomain,
    byQuery,
    byKbNamespace,
    bySourceTier,
    highlights: {
      strongestDomains: Object.entries(byDomain).filter(([, value]) => value.scoreDelta !== 0).sort((left, right) => right[1].scoreDelta - left[1].scoreDelta).slice(0, 5),
      weakestQueries: Object.entries(byQuery).filter(([, value]) => value.scoreDelta < 0).sort((left, right) => left[1].scoreDelta - right[1].scoreDelta).slice(0, 5),
    },
    promptMemory: {
      recentRejectNotes: recentOperatorNotes(candidates.filter((candidate) => candidate.operatorDecision?.actualAction === 'REJECT')),
      recentAcceptNotes: recentOperatorNotes(candidates.filter((candidate) => ['CREATE_DRAFT', 'ROUTE_TO_PIPELINE'].includes(candidate.operatorDecision?.actualAction))),
    },
  };
  if (options.persist !== false) writeJsonAtomic(DISCOVERY_LEARNING_PATH, state);
  return state;
}

export function deriveDiscoveryAutoDraftState(policy = {}, automationLearningState) {
  const profiles = policy.profiles || [];
  const allowed = policy.semiAutoAllowedNamespaces || [];
  const maxFp = policy.semiAutoMaxFalsePositiveRate ?? 0.05;
  const fallbackThreshold = policy.semiAutoMinConfidence ?? 0.95;
  const result = {};
  for (const profile of profiles) {
    const ns = profile.kbNamespace;
    const kbSignal = automationLearningState?.byKbNamespace?.[ns] || null;
    const dynamicThreshold = kbSignal?.tunedBaseline != null
      ? Math.max(0.5, Math.min(0.95, Number(kbSignal.tunedBaseline)))
      : fallbackThreshold;
    const fpRate = kbSignal?.windowFpRate != null ? Number(kbSignal.windowFpRate) : null;
    const blockedByFp = fpRate != null && fpRate > maxFp;
    const eligible = !blockedByFp && allowed.includes(ns);
    result[ns] = {
      threshold: dynamicThreshold,
      tunedBaseline: kbSignal?.tunedBaseline ?? null,
      fpRate,
      blockedByFp,
      eligible,
      reviewed: kbSignal?.reviewed ?? 0,
      windowSize: kbSignal?.windowSize ?? 0,
    };
  }
  return result;
}

export function discoveryLearningAdjustment(candidate, state) {
  const domain = hostnameFor(candidate.canonicalUrl);
  const query = candidate.queryId || 'unknown';
  const namespace = candidate.kbNamespace || 'unknown';
  const parts = [
    state?.byDomain?.[domain],
    state?.byQuery?.[query],
    state?.byKbNamespace?.[namespace],
    state?.bySourceTier?.[candidate.sourceTier || 'unknown'],
  ].filter(Boolean);
  const scoreDelta = bounded(parts.reduce((sum, part) => sum + Number(part.scoreDelta || 0), 0), -20, 20);
  return {
    scoreDelta,
    reasons: [...new Set(parts.flatMap((part) => part.reasons || []))].slice(0, 4),
  };
}

export function discoveryQueryLearningAdjustment(query, state) {
  const querySignal = state?.byQuery?.[query.id] || null;
  const kbSignal = state?.byKbNamespace?.[query.kbNamespace] || null;
  const orderDelta = bounded(Number(querySignal?.scoreDelta || 0) + Math.round(Number(kbSignal?.scoreDelta || 0) / 2), -20, 20);
  const confidenceBias = orderDelta < 0 ? Math.abs(orderDelta) / 400 : 0;
  return {
    orderDelta,
    confidenceBias,
    reasons: [...new Set([...(querySignal?.reasons || []), ...(kbSignal?.reasons || [])])].slice(0, 4),
  };
}

export function buildDiscoveryPromptMemory(query, profile, state) {
  const queryAdjustment = discoveryQueryLearningAdjustment(query, state);
  const lines = [];
  if (queryAdjustment.reasons.length) {
    lines.push(`Learning signals for query ${query.id}: ${queryAdjustment.reasons.join('; ')}.`);
  }
  if (state?.promptMemory?.recentRejectNotes?.length) {
    lines.push(`Recent operator reject notes: ${state.promptMemory.recentRejectNotes.slice(0, 3).join(' | ')}.`);
  }
  if (state?.promptMemory?.recentAcceptNotes?.length) {
    lines.push(`Recent operator accept notes: ${state.promptMemory.recentAcceptNotes.slice(0, 2).join(' | ')}.`);
  }
  if (profile?.kbNamespace && state?.byKbNamespace?.[profile.kbNamespace]?.scoreDelta < 0) {
    lines.push(`Be stricter for ${profile.kbNamespace}; this KB recently had lower-quality discovery outcomes.`);
  }
  return lines.join('\n');
}

function summarizeAutomationKb(items = []) {
  const reviewed = items.length;
  const actualPublishes = items.filter((item) => item.adjudication?.actualAction === 'publish').length;
  const publishFalsePositives = items.filter((item) => item.adjudication?.actualAction === 'publish' && item.adjudication?.expectedAction !== 'publish').length;
  const publishFalsePositiveRate = actualPublishes ? publishFalsePositives / actualPublishes : 0;
  let scoreDelta = 0;
  const reasons = [];
  if (reviewed >= 3 && publishFalsePositiveRate >= 0.25) {
    scoreDelta += 16;
    reasons.push('historia false-positive publish');
  }
  const windowItems = items.slice(-AUTOMATION_MAX_WINDOW_SIZE);
  const windowFalsePositives = windowItems.filter((item) => item.adjudication?.actualAction === 'publish' && item.adjudication?.expectedAction !== 'publish').length;
  const windowSize = Math.min(reviewed, AUTOMATION_MAX_WINDOW_SIZE);
  const windowFpRate = windowSize > 0 ? windowFalsePositives / windowSize : 0;
  const tunedBaseline = Math.max(TUNED_BASELINE_FLOOR, Math.min(TUNED_BASELINE_CEILING, AUTOMATION_BASE_THRESHOLD + (windowFpRate - TUNED_BASELINE_TARGET_FP) * TUNED_BASELINE_SENSITIVITY));
  return {
    reviewed,
    actualPublishes,
    publishFalsePositives,
    publishFalsePositiveRate,
    scoreDelta,
    reasons,
    baseThreshold: AUTOMATION_BASE_THRESHOLD,
    windowSize,
    windowFpRate: windowSize > 0 ? parseFloat(windowFpRate.toFixed(4)) : 0,
    tunedBaseline: parseFloat(tunedBaseline.toFixed(4)),
  };
}

export function reroutePairKey(sourceKb, targetKb) {
  return `${sourceKb || 'unknown'}->${targetKb || 'unknown'}`;
}

export function deriveAutomationLearningState(jobs = [], options = {}) {
  const adjudicated = jobs.filter((job) => job.mode === 'shadow' && job.origin === 'live' && job.adjudication);
  const byKbNamespace = objectFromGrouped(groupBy(adjudicated, (job) => job.kbNamespace), (items) => summarizeAutomationKb(items));
  const byTargetKb = objectFromGrouped(groupBy(adjudicated, (job) => job.review?.targetKb || job.reroute?.targetKb || ''), (items) => summarizeAutomationKb(items));
  const rerouteCandidates = adjudicated.filter((job) => job.review?.targetKb || job.reroute?.targetKb);
  const reroutePairs = objectFromGrouped(groupBy(rerouteCandidates, (job) => reroutePairKey(job.kbNamespace, job.review?.targetKb || job.reroute?.targetKb)), (items) => {
    const reviewed = items.length;
    const confirmed = items.filter((item) => item.adjudication?.expectedAction === 'reroute').length;
    const correct = items.filter((item) => item.adjudication?.expectedAction === 'reroute' && item.adjudication?.correct).length;
    const correctRate = reviewed ? correct / reviewed : 0;
    const scoreDelta = reviewed >= 2 && correctRate >= 0.66 ? 18 : 0;
    return {
      reviewed,
      confirmed,
      correct,
      correctRate,
      scoreDelta,
      reasons: scoreDelta ? ['historycznie potwierdzany reroute'] : [],
    };
  });
  const state = {
    generatedAt: new Date().toISOString(),
    overall: {
      reviewed: adjudicated.length,
      kbNamespaces: Object.keys(byKbNamespace).length,
    },
    byKbNamespace,
    byTargetKb,
    reroutePairs,
    highlights: {
      guardedKbNamespaces: Object.entries(byKbNamespace).filter(([, value]) => value.scoreDelta > 0).sort((left, right) => right[1].scoreDelta - left[1].scoreDelta).slice(0, 5),
      reroutePairs: Object.entries(reroutePairs).filter(([, value]) => value.scoreDelta > 0).sort((left, right) => right[1].scoreDelta - left[1].scoreDelta).slice(0, 5),
    },
    promptMemory: {
      recentRejectNotes: adjudicated.filter((job) => job.adjudication?.expectedAction === 'reject' || job.adjudication?.expectedAction === 'hold').slice(-5).map((job) => String(job.adjudication?.note || '').trim()).filter(Boolean),
      recentRerouteNotes: adjudicated.filter((job) => job.adjudication?.expectedAction === 'reroute').slice(-5).map((job) => String(job.adjudication?.note || '').trim()).filter(Boolean),
    },
  };
  if (options.persist !== false) writeJsonAtomic(AUTOMATION_LEARNING_PATH, state);
  return state;
}

export function automationLearningAdjustment(job, state) {
  const kbSignal = state?.byKbNamespace?.[job.kbNamespace] || null;
  const targetKb = job.review?.targetKb || job.reroute?.targetKb || '';
  const pairSignal = targetKb ? state?.reroutePairs?.[reroutePairKey(job.kbNamespace, targetKb)] : null;
  const targetKbSignal = targetKb ? state?.byTargetKb?.[targetKb] : null;
  const confidence = Number(job.review?.confidence || 0);
  let recommendedAction = null;
  let priorityDelta = 0;
  const reasons = [];

  if (kbSignal?.scoreDelta) {
    priorityDelta += kbSignal.scoreDelta;
    reasons.push(...kbSignal.reasons);
    if (job.shadow?.publishable && kbSignal.publishFalsePositiveRate >= 0.25 && confidence < 0.95) {
      recommendedAction = 'hold';
    }
  }
  if (pairSignal?.scoreDelta) {
    priorityDelta += pairSignal.scoreDelta;
    reasons.push(...pairSignal.reasons);
    if (targetKb && confidence < 0.97) {
      recommendedAction = 'reroute';
    }
  }
  if (targetKbSignal?.scoreDelta && !recommendedAction && confidence < 0.9) {
    priorityDelta += Math.round(targetKbSignal.scoreDelta / 2);
  }

  return {
    recommendedAction,
    priorityDelta: bounded(priorityDelta, 0, 40),
    reasons: [...new Set(reasons)].slice(0, 4),
  };
}

export function automationGuardrailsForDraft(draft, state) {
  const kbSignal = state?.byKbNamespace?.[draft.kbNamespace] || null;
  const publishConfidenceDelta = kbSignal?.publishFalsePositiveRate >= 0.25 ? 0.05 : 0;
  return {
    publishConfidenceDelta,
    stricterPublish: publishConfidenceDelta > 0,
    reasons: kbSignal?.publishFalsePositiveRate >= 0.25 ? ['podwyższony próg publish przez historię false-positive'] : [],
  };
}

export function buildAutomationPromptMemory(draft, state) {
  const lines = [];
  const kbSignal = state?.byKbNamespace?.[draft.kbNamespace] || null;
  if (kbSignal?.publishFalsePositiveRate >= 0.25) {
    lines.push(`This KB has recent false-positive publish history; prefer hold when confidence is not high.`);
  }
  if (state?.promptMemory?.recentRejectNotes?.length) {
    lines.push(`Recent operator hold/reject notes: ${state.promptMemory.recentRejectNotes.slice(0, 3).join(' | ')}.`);
  }
  if (state?.promptMemory?.recentRerouteNotes?.length) {
    lines.push(`Recent operator reroute notes: ${state.promptMemory.recentRerouteNotes.slice(0, 3).join(' | ')}.`);
  }
  return lines.join('\n');
}
