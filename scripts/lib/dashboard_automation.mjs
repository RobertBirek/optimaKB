#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { appendDashboardAudit } from './dashboard_audit.mjs';
import { automationLearningAdjustment, deriveAutomationLearningState, reroutePairKey } from './feedback_learning.mjs';
import { loadProviderSecrets, maskProviderSecrets, saveProviderSecrets } from './provider_secrets.mjs';
import {
  findRawDraftById,
  reroutePendingDraft,
} from './promoted_knowledge.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';
const SCRIPTS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const AUTOMATION_ROOT = path.join(ROOT, 'data/dashboard/automation');
export const AUTOMATION_CONFIG_PATH = path.join(AUTOMATION_ROOT, 'config.json');
export const AUTOMATION_JOBS_ROOT = path.join(AUTOMATION_ROOT, 'jobs');
export const AUTOMATION_LOCKS_ROOT = path.join(AUTOMATION_ROOT, 'locks');
export const AUTOMATION_SNAPSHOTS_ROOT = path.join(AUTOMATION_ROOT, 'snapshots');
export const AUTOMATION_LLM_HEALTH_PATH = path.join(AUTOMATION_ROOT, 'llm_health.json');
export const AUTOMATION_SHADOW_REPORT_PATH = path.join(
  ROOT,
  'docs/reference/ERP_KB_Dashboard_Shadow_Review_Report.json',
);
export const AUTOMATION_CANARY_REPORT_PATH = path.join(
  ROOT,
  'docs/reference/ERP_KB_Dashboard_Canary_Readiness_Report.json',
);

const DEFAULT_CONFIG = {
  enabled: false,
  paused: false,
  shadowOnly: true,
  allowedNamespaces: ['ComarchCommunityNews'],
  minimumConfidence: 0.85,
  autoRollback: true,
  canaryMinimumSamples: 20,
  canaryMinimumAccuracy: 0.95,
  canaryMaximumFalsePositives: 0,
  publicationApproved: false,
  publicationApprovedAt: '',
  publicationApprovedBy: '',
  pauseReason: '',
  pausedAt: '',
  maxRecentJobs: 100,
  updatedAt: '',
  updatedBy: '',
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJsonAtomic(filePath, value, mode = 0o640) {
  ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.${process.pid}.${crypto.randomUUID().slice(0, 8)}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode });
  fs.renameSync(tempPath, filePath);
  try {
    fs.chmodSync(filePath, mode);
  } catch {
    // Some mounted filesystems do not support chmod.
  }
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function clampConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_CONFIG.minimumConfidence;
  return Math.max(0, Math.min(1, number));
}

function normalizeNamespaces(value) {
  const items = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(items.map((item) => String(item).trim()).filter(Boolean))];
}

export function loadAutomationConfig() {
  const stored = readJson(AUTOMATION_CONFIG_PATH, {});
  const envNamespaces = process.env.ERP_KB_AUTOMATION_ALLOWED_NAMESPACES;
  return {
    ...DEFAULT_CONFIG,
    ...stored,
    enabled: process.env.ERP_KB_AUTOMATION_ENABLED === '1' ? true : Boolean(stored.enabled),
    paused: Boolean(stored.paused),
    shadowOnly: process.env.ERP_KB_AUTOMATION_SHADOW_ONLY === '1'
      ? true
      : process.env.ERP_KB_AUTOMATION_SHADOW_ONLY === '0'
        ? false
        : stored.shadowOnly !== false,
    shadowOnlyForced: process.env.ERP_KB_AUTOMATION_SHADOW_ONLY === '1',
    allowedNamespaces: normalizeNamespaces(
      envNamespaces === undefined
        ? (stored.allowedNamespaces || DEFAULT_CONFIG.allowedNamespaces)
        : envNamespaces,
    ),
    minimumConfidence: clampConfidence(
      process.env.ERP_KB_AUTOMATION_MIN_CONFIDENCE || stored.minimumConfidence,
    ),
    canaryMinimumSamples: Math.max(
      1,
      Number(process.env.ERP_KB_AUTOMATION_CANARY_MIN_SAMPLES || stored.canaryMinimumSamples || 20),
    ),
    canaryMinimumAccuracy: clampConfidence(
      process.env.ERP_KB_AUTOMATION_CANARY_MIN_ACCURACY
      || stored.canaryMinimumAccuracy
      || 0.95,
    ),
    canaryMaximumFalsePositives: Math.max(
      0,
      Number(
        process.env.ERP_KB_AUTOMATION_CANARY_MAX_FALSE_POSITIVES
        ?? stored.canaryMaximumFalsePositives
        ?? 0,
      ),
    ),
    autoRollback: stored.autoRollback !== false,
  };
}

export function saveAutomationConfig(patch = {}, operator = '') {
  const current = loadAutomationConfig();
  const policyChanged = (
    patch.minimumConfidence !== undefined
    || patch.allowedNamespaces !== undefined
    || patch.canaryMinimumSamples !== undefined
    || patch.canaryMinimumAccuracy !== undefined
    || patch.canaryMaximumFalsePositives !== undefined
  );
  const paused = patch.paused === undefined ? current.paused : Boolean(patch.paused);
  if (patch.shadowOnly === false) {
    const gate = evaluateAutomationPromotionGate({ config: current });
    const forcedBlocker = current.shadowOnlyForced
      ? 'Shadow mode is forced by ERP_KB_AUTOMATION_SHADOW_ONLY=1.'
      : '';
    if (forcedBlocker || policyChanged || !gate.approved) {
      const blockers = [
        ...(forcedBlocker ? [forcedBlocker] : []),
        ...(policyChanged ? ['Save policy changes before requesting publication mode.'] : []),
        ...gate.blockers,
      ];
      const error = new Error(`Publication mode is locked: ${blockers.join(' ')}`);
      error.code = 'PROMOTION_GATE_BLOCKED';
      error.gate = { ...gate, blockers };
      throw error;
    }
  }
  const next = {
    ...current,
    ...(patch.enabled === undefined ? {} : { enabled: Boolean(patch.enabled) }),
    paused,
    ...(patch.shadowOnly === undefined ? {} : { shadowOnly: Boolean(patch.shadowOnly) }),
    ...(patch.allowedNamespaces === undefined
      ? {}
      : { allowedNamespaces: normalizeNamespaces(patch.allowedNamespaces) }),
    ...(patch.autoRollback === undefined ? {} : { autoRollback: Boolean(patch.autoRollback) }),
    ...(patch.minimumConfidence === undefined
      ? {}
      : { minimumConfidence: clampConfidence(patch.minimumConfidence) }),
    ...(patch.canaryMinimumSamples === undefined
      ? {}
      : { canaryMinimumSamples: Math.max(1, Number(patch.canaryMinimumSamples) || 20) }),
    ...(patch.canaryMinimumAccuracy === undefined
      ? {}
      : { canaryMinimumAccuracy: clampConfidence(patch.canaryMinimumAccuracy) }),
    ...(patch.canaryMaximumFalsePositives === undefined
      ? {}
      : {
          canaryMaximumFalsePositives: Math.max(
            0,
            Number(patch.canaryMaximumFalsePositives) || 0,
          ),
        }),
    ...(patch.pauseReason === undefined
      ? (paused ? {} : { pauseReason: '', pausedAt: '' })
      : {
          pauseReason: String(patch.pauseReason || '').slice(0, 1000),
          pausedAt: paused ? (patch.pausedAt || new Date().toISOString()) : '',
        }),
    ...(policyChanged
      ? {
          shadowOnly: true,
          publicationApproved: false,
          publicationApprovedAt: '',
          publicationApprovedBy: '',
        }
      : {}),
    ...(patch.publicationApproved === undefined
      ? {}
      : {
          publicationApproved: Boolean(patch.publicationApproved),
          publicationApprovedAt: patch.publicationApproved
            ? (patch.publicationApprovedAt || new Date().toISOString())
            : '',
          publicationApprovedBy: patch.publicationApproved
            ? String(patch.publicationApprovedBy || operator || 'dashboard')
            : '',
          ...(patch.publicationApproved ? {} : { shadowOnly: true }),
        }),
    updatedAt: new Date().toISOString(),
    updatedBy: String(operator || 'dashboard').trim(),
  };
  const stored = { ...next };
  delete stored.shadowOnlyForced;
  writeJsonAtomic(AUTOMATION_CONFIG_PATH, stored);
  const saved = loadAutomationConfig();
  appendDashboardAudit({
    actor: operator || 'dashboard',
    role: 'operator',
    action: 'automation.config.update',
    resourceType: 'automation_config',
    resourceId: 'default',
    before: current,
    after: saved,
    metadata: { changedFields: Object.keys(patch).sort() },
  });
  refreshAutomationCanaryReport();
  return saved;
}

export function providerSecretsSummary() {
  return maskProviderSecrets(loadProviderSecrets());
}

export function updateProviderSecrets(patch = {}, operator = '') {
  return maskProviderSecrets(saveProviderSecrets(patch, operator));
}

export function automationJobPath(jobId) {
  return path.join(AUTOMATION_JOBS_ROOT, `${jobId}.json`);
}

export function saveAutomationJob(job) {
  const next = {
    ...job,
    updatedAt: new Date().toISOString(),
  };
  writeJsonAtomic(automationJobPath(next.id), next);
  return next;
}

export function readAutomationJob(jobId) {
  return readJson(automationJobPath(jobId), null);
}

export function listAutomationJobs(limit = 100) {
  if (!fs.existsSync(AUTOMATION_JOBS_ROOT)) return [];
  return fs.readdirSync(AUTOMATION_JOBS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .flatMap((entry) => {
      try {
        return [readJson(path.join(AUTOMATION_JOBS_ROOT, entry.name))];
      } catch {
        return [];
      }
    })
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .slice(0, Math.max(1, Math.min(500, Number(limit) || 100)));
}

export function findAutomationJobForDraft(draftId, statuses = []) {
  return listAutomationJobs(500).find((job) => (
    job.draftId === draftId
    && (!statuses.length || statuses.includes(job.status))
  )) || null;
}

export function createAutomationJob(draft, options = {}) {
  const mode = options.mode === 'shadow' ? 'shadow' : 'publish';
  const existing = listAutomationJobs(500).find((job) => (
    job.draftId === draft.id
    && (job.mode || 'publish') === mode
    && ['QUEUED', 'RUNNING', 'PUBLISHED', 'SHADOW_COMPLETE', 'REROUTE_PROPOSED'].includes(job.status)
  ));
  if (existing && !options.force) return { job: existing, created: false };
  const now = new Date().toISOString();
  const job = {
    id: `automation_${now.slice(0, 10)}_${crypto.randomUUID().slice(0, 8)}`,
    draftId: draft.id,
    title: draft.title,
    kbNamespace: draft.kbNamespace,
    kbName: draft.kbName,
    sourceUrl: draft.sourceUrl || '',
    mode,
    origin: options.origin || (options.expectedStatus ? 'benchmark' : 'live'),
    expectedStatus: options.expectedStatus || '',
    status: 'QUEUED',
    stage: 'PENDING',
    createdAt: now,
    updatedAt: now,
    startedAt: '',
    finishedAt: '',
    attempt: Number(options.attempt || 1),
    retryOf: options.retryOf || '',
    reroutedFrom: options.reroutedFrom || '',
    review: null,
    guards: [],
    snapshotPath: '',
    pipeline: null,
    rollback: null,
    error: '',
    transitions: [{
      stage: 'PENDING',
      status: 'QUEUED',
      at: now,
      message: options.message || 'Draft queued for automatic review.',
    }],
  };
  const saved = saveAutomationJob(job);
  appendDashboardAudit({
    actor: options.actor || 'automation-worker',
    role: 'system',
    action: 'automation.job.create',
    resourceType: 'automation_job',
    resourceId: saved.id,
    after: {
      draftId: saved.draftId,
      mode: saved.mode,
      origin: saved.origin,
      kbNamespace: saved.kbNamespace,
      reroutedFrom: saved.reroutedFrom,
    },
  });
  return { job: saved, created: true };
}

export function transitionAutomationJob(jobOrId, stage, patch = {}) {
  const current = typeof jobOrId === 'string' ? readAutomationJob(jobOrId) : jobOrId;
  if (!current) throw new Error(`Automation job not found: ${jobOrId}`);
  const now = new Date().toISOString();
  const status = patch.status || current.status;
  const next = saveAutomationJob({
    ...current,
    ...patch,
    stage,
    status,
    startedAt: current.startedAt || (status === 'RUNNING' ? now : ''),
    finishedAt: [
      'PUBLISHED',
      'SHADOW_COMPLETE',
      'REROUTE_PROPOSED',
      'EXCEPTION',
      'ROLLED_BACK',
      'ROLLBACK_FAILED',
    ].includes(status)
      ? (patch.finishedAt || now)
      : (patch.finishedAt ?? current.finishedAt),
    transitions: [
      ...(current.transitions || []),
      {
        stage,
        status,
        at: now,
        message: patch.transitionMessage || '',
      },
    ],
  });
  appendDashboardAudit({
    actor: patch.actor || 'automation-worker',
    role: 'system',
    action: 'automation.job.transition',
    resourceType: 'automation_job',
    resourceId: next.id,
    before: { stage: current.stage, status: current.status },
    after: { stage: next.stage, status: next.status },
    metadata: {
      draftId: next.draftId,
      message: patch.transitionMessage || '',
    },
  });
  if (next.finishedAt) refreshAutomationCanaryReport();
  return next;
}

export function acquireAutomationLock(name, metadata = {}) {
  ensureDir(AUTOMATION_LOCKS_ROOT);
  const safeName = String(name || 'global').replace(/[^A-Za-z0-9_.-]+/g, '_');
  const lockPath = path.join(AUTOMATION_LOCKS_ROOT, `${safeName}.lock`);
  const staleAfterMs = Number(process.env.ERP_KB_AUTOMATION_LOCK_STALE_MS || 6 * 60 * 60 * 1000);
  if (fs.existsSync(lockPath)) {
    const existing = readJson(lockPath, {});
    const ageMs = Date.now() - Date.parse(existing.createdAt || 0);
    let processAlive = false;
    if (Number.isInteger(existing.pid) && existing.pid > 0) {
      try {
        process.kill(existing.pid, 0);
        processAlive = true;
      } catch {
        processAlive = false;
      }
    }
    if (!processAlive || !Number.isFinite(ageMs) || ageMs > staleAfterMs) {
      fs.rmSync(lockPath, { force: true });
    }
  }
  try {
    const fd = fs.openSync(lockPath, 'wx', 0o640);
    fs.writeFileSync(fd, `${JSON.stringify({
      pid: process.pid,
      createdAt: new Date().toISOString(),
      ...metadata,
    }, null, 2)}\n`);
    fs.closeSync(fd);
  } catch (error) {
    if (error.code === 'EEXIST') {
      const lock = readJson(lockPath, {});
      const lockError = new Error(`Automation lock is active: ${safeName}`);
      lockError.code = 'AUTOMATION_LOCKED';
      lockError.lock = lock;
      throw lockError;
    }
    throw error;
  }
  return {
    path: lockPath,
    release() {
      try {
        fs.unlinkSync(lockPath);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    },
  };
}

export function loadAutomationLlmHealth() {
  const health = readJson(AUTOMATION_LLM_HEALTH_PATH, null);
  if (!health) {
    return {
      status: 'UNKNOWN',
      healthy: false,
      stale: true,
      checkedAt: '',
      consecutiveFailures: 0,
      error: 'No LLM health check has completed.',
    };
  }
  const maxAgeMs = Number(process.env.ERP_KB_AUTOMATION_LLM_HEALTH_MAX_AGE_MS || 30 * 60 * 1000);
  const checkedAtMs = Date.parse(health.checkedAt || '');
  const stale = !Number.isFinite(checkedAtMs) || Date.now() - checkedAtMs > maxAgeMs;
  return {
    ...health,
    stale,
    healthy: health.status === 'PASS' && !stale,
  };
}

export function saveAutomationLlmHealth(health) {
  const previous = readJson(AUTOMATION_LLM_HEALTH_PATH, null);
  const next = {
    ...health,
    checkedAt: health.checkedAt || new Date().toISOString(),
  };
  writeJsonAtomic(AUTOMATION_LLM_HEALTH_PATH, next);
  appendDashboardAudit({
    actor: 'llm-health-check',
    role: 'system',
    action: 'automation.llm_health.update',
    resourceType: 'llm_health',
    resourceId: 'reviewer',
    outcome: next.status === 'PASS' ? 'success' : 'failure',
    before: previous,
    after: next,
  });
  refreshAutomationCanaryReport();
  return next;
}

function actualActionForJob(job) {
  if (job.status === 'REROUTE_PROPOSED' || job.reroute?.targetKb) return 'reroute';
  if (job.shadow?.publishable) return 'publish';
  return 'hold';
}

function learnedActionForJob(job, learningState) {
  const learned = automationLearningAdjustment(job, learningState);
  return learned.recommendedAction || actualActionForJob(job);
}

export function adjudicateAutomationJob(jobId, expectedAction, operator = '', note = '') {
  const job = readAutomationJob(jobId);
  if (!job) throw new Error(`Automation job not found: ${jobId}`);
  if (!['SHADOW_COMPLETE', 'REROUTE_PROPOSED'].includes(job.status)) {
    throw new Error(`Only completed shadow jobs can be adjudicated. Current status: ${job.status}`);
  }
  if (!['publish', 'hold', 'reroute'].includes(expectedAction)) {
    throw new Error(`Unsupported expected action: ${expectedAction}`);
  }
  const actualAction = actualActionForJob(job);
  const next = saveAutomationJob({
    ...job,
    adjudication: {
      expectedAction,
      actualAction,
      correct: expectedAction === actualAction,
      operator: String(operator || 'dashboard'),
      note: String(note || '').slice(0, 1000),
      adjudicatedAt: new Date().toISOString(),
    },
  });
  appendDashboardAudit({
    actor: operator || 'dashboard',
    role: 'operator',
    action: 'automation.job.adjudicate',
    resourceType: 'automation_job',
    resourceId: jobId,
    before: job.adjudication || null,
    after: next.adjudication,
    metadata: { draftId: next.draftId, status: next.status },
  });
  refreshAutomationCanaryReport();
  return next;
}

export function evaluateAutomationPromotionGate(options = {}) {
  const config = options.config || loadAutomationConfig();
  const jobs = options.jobs || listAutomationJobs(500);
  const health = options.health || loadAutomationLlmHealth();
  const adjudicated = jobs.filter((job) => (
    job.mode === 'shadow'
    && job.origin === 'live'
    && job.adjudication
  ));
  const decisions = adjudicated.length;
  const samples = new Set(adjudicated.map((job) => job.draftId)).size;
  const correct = adjudicated.filter((job) => job.adjudication.correct).length;
  const falsePositives = adjudicated.filter((job) => (
    job.adjudication.actualAction === 'publish'
    && job.adjudication.expectedAction !== 'publish'
  )).length;
  const accuracy = decisions ? correct / decisions : 0;
  const checks = {
    automationReady: config.enabled && !config.paused,
    samples: samples >= config.canaryMinimumSamples,
    accuracy: accuracy >= config.canaryMinimumAccuracy,
    falsePositives: falsePositives <= config.canaryMaximumFalsePositives,
    llmHealth: health.healthy,
    noActiveJobs: !jobs.some((job) => ['QUEUED', 'RUNNING'].includes(job.status)),
    noRollbackFailures: !jobs.some((job) => job.status === 'ROLLBACK_FAILED'),
  };
  const eligible = Object.values(checks).every(Boolean);
  const approved = eligible && config.publicationApproved === true;
  const blockers = [];
  if (!checks.automationReady) blockers.push('Automation must be enabled and resumed.');
  if (!checks.samples) blockers.push(`Need ${config.canaryMinimumSamples - samples} more adjudicated live sample(s).`);
  if (!checks.accuracy) blockers.push(`Accuracy ${Math.round(accuracy * 100)}% is below ${Math.round(config.canaryMinimumAccuracy * 100)}%.`);
  if (!checks.falsePositives) blockers.push(`False positives ${falsePositives} exceed ${config.canaryMaximumFalsePositives}.`);
  if (!checks.llmHealth) blockers.push('LLM health check is not current and passing.');
  if (!checks.noActiveJobs) blockers.push('Automation jobs are still active.');
  if (!checks.noRollbackFailures) blockers.push('A rollback failure requires resolution.');
  if (eligible && !config.publicationApproved) blockers.push('Admin publication approval is still required.');
  return {
    eligible,
    approved,
    checks,
    blockers,
    metrics: {
      samples,
      decisions,
      correct,
      accuracy,
      falsePositives,
    },
    requirements: {
      minimumSamples: config.canaryMinimumSamples,
      minimumAccuracy: config.canaryMinimumAccuracy,
      maximumFalsePositives: config.canaryMaximumFalsePositives,
    },
    approvedAt: config.publicationApprovedAt || '',
    approvedBy: config.publicationApprovedBy || '',
  };
}

export function approveAutomationPublication(operator = '') {
  const config = loadAutomationConfig();
  const gate = evaluateAutomationPromotionGate({ config });
  if (!gate.eligible) {
    const error = new Error(`Publication gate is not eligible: ${gate.blockers.join(' ')}`);
    error.code = 'PROMOTION_GATE_BLOCKED';
    error.gate = gate;
    throw error;
  }
  const next = saveAutomationConfig({
    publicationApproved: true,
    publicationApprovedAt: new Date().toISOString(),
    publicationApprovedBy: operator || 'dashboard',
  }, operator);
  const approvedGate = evaluateAutomationPromotionGate({ config: next });
  appendDashboardAudit({
    actor: operator || 'dashboard',
    role: 'admin',
    action: 'automation.publication.approve',
    resourceType: 'promotion_gate',
    resourceId: 'canary',
    after: approvedGate,
  });
  refreshAutomationCanaryReport();
  return { config: next, gate: approvedGate };
}

function applyLearningAdjustedThreshold(job, learningState) {
  const kbSignal = learningState?.byKbNamespace?.[job.kbNamespace];
  if (!kbSignal || kbSignal.tunedBaseline == null) return null;
  return {
    tunedBaseline: kbSignal.tunedBaseline,
    windowFpRate: kbSignal.windowFpRate || 0,
    stricter: kbSignal.tunedBaseline > (kbSignal.baseThreshold || 0.6),
  };
}

function canaryPriority(job, learningState) {
  let score = 0;
  if (job.status === 'REROUTE_PROPOSED') score += 100;
  if (job.review?.contentRisk === 'high' || job.review?.duplicateRisk === 'high') score += 80;
  if (['review', 'reject'].includes(job.review?.decision)) score += 60;
  score += Math.round((1 - Number(job.review?.confidence || 0)) * 20);
  score += automationLearningAdjustment(job, learningState).priorityDelta;
  return score;
}

export function automationCanaryQueue(jobs = listAutomationJobs(500), learningState = deriveAutomationLearningState(jobs)) {
  return jobs
    .filter((job) => (
      job.mode === 'shadow'
      && job.origin === 'live'
      && ['SHADOW_COMPLETE', 'REROUTE_PROPOSED'].includes(job.status)
      && !job.adjudication
    ))
    .map((job) => ({
      ...job,
      canaryPriority: canaryPriority(job, learningState),
      recommendedAction: learnedActionForJob(job, learningState),
      learning: automationLearningAdjustment(job, learningState),
    }))
    .sort((left, right) => (
      right.canaryPriority - left.canaryPriority
      || String(left.finishedAt || left.createdAt).localeCompare(String(right.finishedAt || right.createdAt))
    ));
}

export function refreshAutomationCanaryReport(options = {}) {
  const config = options.config || loadAutomationConfig();
  const jobs = options.jobs || listAutomationJobs(500);
  const health = options.health || loadAutomationLlmHealth();
  const learning = options.learning || deriveAutomationLearningState(jobs);
  const gate = evaluateAutomationPromotionGate({ config, jobs, health });
  const queue = automationCanaryQueue(jobs, learning);
  const report = {
    generatedAt: new Date().toISOString(),
    overall: gate.approved ? 'APPROVED' : gate.eligible ? 'READY' : 'BLOCKED',
    gate,
    learning,
    queue: {
      pending: queue.length,
      nextJobId: queue[0]?.id || '',
      items: queue.slice(0, 100).map((job) => ({
        jobId: job.id,
        draftId: job.draftId,
        title: job.title,
        kbNamespace: job.kbNamespace,
        status: job.status,
        priority: job.canaryPriority,
        recommendedAction: job.recommendedAction,
        confidence: job.review?.confidence ?? null,
        targetKb: job.review?.targetKb || '',
        finishedAt: job.finishedAt || '',
      })),
    },
  };
  fs.writeFileSync(
    AUTOMATION_CANARY_REPORT_PATH,
    `${JSON.stringify(report, null, 2)}\n`,
    { encoding: 'utf8', mode: 0o640 },
  );
  const lines = [
    '# ERP KB Dashboard Canary Readiness Report',
    '',
    `Generated: \`${report.generatedAt}\``,
    '',
    `- Status: \`${report.overall}\``,
    `- Unique live samples: \`${gate.metrics.samples}/${gate.requirements.minimumSamples}\``,
    `- Adjudicated decisions: \`${gate.metrics.decisions}\``,
    `- Accuracy: \`${Math.round(gate.metrics.accuracy * 100)}%\``,
    `- False-positive publishes: \`${gate.metrics.falsePositives}\``,
    `- Pending adjudications: \`${queue.length}\``,
    '',
    ...(gate.blockers.length ? ['## Blockers', '', ...gate.blockers.map((item) => `- ${item}`), ''] : []),
    '## Queue',
    '',
    '| Job | Draft | Status | Suggested | Priority |',
    '|---|---|---|---|---:|',
    ...report.queue.items.map((item) => (
      `| ${item.jobId} | ${item.draftId} | ${item.status} | ${item.recommendedAction} | ${item.priority} |`
    )),
    '',
  ];
  fs.writeFileSync(AUTOMATION_CANARY_REPORT_PATH.replace(/\.json$/, '.md'), lines.join('\n'), 'utf8');
  return report;
}

export function applyAutomationReroute(jobId, operator = '', note = '') {
  const job = readAutomationJob(jobId);
  if (!job) throw new Error(`Automation job not found: ${jobId}`);
  if (job.status !== 'REROUTE_PROPOSED' || !job.reroute?.targetKb) {
    throw new Error(`Job does not have an applicable reroute proposal: ${job.status}`);
  }
  if (
    job.adjudication?.expectedAction !== 'reroute'
    || job.adjudication?.actualAction !== 'reroute'
    || !job.adjudication?.correct
  ) {
    throw new Error('A matching operator reroute adjudication is required before applying the proposal');
  }
  if (job.reroute?.appliedAt) throw new Error('Reroute proposal was already applied');

  const lock = acquireAutomationLock(`draft_${job.draftId}`, {
    jobId,
    operation: 'apply_reroute',
  });
  try {
    const beforeDraft = findRawDraftById(job.draftId);
    const rerouted = reroutePendingDraft(job.draftId, job.reroute.targetKb, {
      reroutedBy: operator || 'dashboard',
      note,
      automationJobId: job.id,
    });
    const nextReview = triggerAutomationForDraft(rerouted.draft, {
      force: true,
      mode: 'shadow',
      origin: 'live',
      reroutedFrom: job.id,
      actor: operator || 'dashboard',
      message: `Post-reroute shadow review from ${job.kbNamespace} to ${rerouted.draft.kbNamespace}.`,
    });
    if (!nextReview.started) {
      throw new Error(`Post-reroute review did not start: ${nextReview.reason || 'unknown reason'}`);
    }
    const updatedJob = transitionAutomationJob(job, 'REROUTED', {
      status: 'REROUTED',
      actor: operator || 'dashboard',
      reroute: {
        ...job.reroute,
        appliedAt: new Date().toISOString(),
        appliedBy: operator || 'dashboard',
        note: String(note || '').slice(0, 1000),
        reviewJobId: nextReview.job.id,
      },
      transitionMessage: `Draft rerouted to ${rerouted.draft.kbNamespace}; post-reroute shadow review started.`,
    });
    appendDashboardAudit({
      actor: operator || 'dashboard',
      role: 'operator',
      action: 'automation.reroute.apply',
      resourceType: 'knowledge_draft',
      resourceId: job.draftId,
      before: {
        kbName: beforeDraft.kbName,
        kbNamespace: beforeDraft.kbNamespace,
      },
      after: rerouted.after,
      metadata: {
        proposalJobId: job.id,
        reviewJobId: nextReview.job.id,
        note,
      },
    });
    refreshAutomationCanaryReport();
    return {
      job: updatedJob,
      draft: rerouted.draft,
      reviewJob: nextReview.job,
    };
  } finally {
    lock.release();
  }
}

export function applyAutomationRerouteAuto(job, learningState) {
  if (!job || !job.reroute?.targetKb) {
    throw new Error('Job does not have a reroute proposal');
  }
  if (job.status !== 'REROUTE_PROPOSED' || !job.reroute?.targetKb) {
    throw new Error(`Job does not have an applicable reroute proposal: ${job.status}`);
  }
  if (job.reroute?.appliedAt) throw new Error('Reroute proposal was already applied');

  const pairKey = reroutePairKey(job.kbNamespace, job.reroute.targetKb);
  const pairSignal = learningState?.reroutePairs?.[pairKey];
  const correctRate = pairSignal?.correctRate ?? 0;
  const reviewed = pairSignal?.reviewed ?? 0;

  if (correctRate < 0.9 || reviewed < 5) {
    throw new Error(
      `Reroute pair ${pairKey} does not meet auto-apply threshold: ` +
      `correctRate=${(correctRate * 100).toFixed(1)}% (need ≥90%), reviewed=${reviewed} (need ≥5)`,
    );
  }

  const lock = acquireAutomationLock(`draft_${job.draftId}`, {
    jobId: job.id,
    operation: 'apply_reroute_auto',
  });
  try {
    const beforeDraft = findRawDraftById(job.draftId);
    const rerouted = reroutePendingDraft(job.draftId, job.reroute.targetKb, {
      reroutedBy: 'discovery-autodraft',
      note: `Auto-reroute: pair ${pairKey} has ${(correctRate * 100).toFixed(1)}% accuracy over ${reviewed} reviews.`,
      automationJobId: job.id,
    });
    const nextReview = triggerAutomationForDraft(rerouted.draft, {
      force: true,
      mode: 'shadow',
      origin: 'live',
      reroutedFrom: job.id,
      actor: 'discovery-autodraft',
      message: `Post-reroute shadow review from ${job.kbNamespace} to ${rerouted.draft.kbNamespace} (auto-applied).`,
    });
    if (!nextReview.started) {
      throw new Error(`Post-reroute review did not start: ${nextReview.reason || 'unknown reason'}`);
    }
    const updatedJob = transitionAutomationJob(job, 'REROUTED', {
      status: 'REROUTED',
      actor: 'discovery-autodraft',
      autoApplied: true,
      reroute: {
        ...job.reroute,
        appliedAt: new Date().toISOString(),
        appliedBy: 'discovery-autodraft',
        note: `Auto-reroute: ${pairKey} (${(correctRate * 100).toFixed(1)}% accuracy, ${reviewed} reviews)`,
        reviewJobId: nextReview.job.id,
      },
      transitionMessage: `Draft auto-rerouted to ${rerouted.draft.kbNamespace}; post-reroute shadow review started.`,
    });
    appendDashboardAudit({
      actor: 'discovery-autodraft',
      role: 'system',
      action: 'automation.reroute.auto_apply',
      resourceType: 'knowledge_draft',
      resourceId: job.draftId,
      before: {
        kbName: beforeDraft.kbName,
        kbNamespace: beforeDraft.kbNamespace,
      },
      after: rerouted.after,
      metadata: {
        proposalJobId: job.id,
        reviewJobId: nextReview.job.id,
        reroutePair: pairKey,
        correctRate,
        reviewed,
      },
    });
    refreshAutomationCanaryReport();
    return {
      job: updatedJob,
      draft: rerouted.draft,
      reviewJob: nextReview.job,
    };
  } finally {
    lock.release();
  }
}

export function automationSummary() {
  const config = loadAutomationConfig();
  const allJobs = listAutomationJobs(500);
  const jobs = allJobs.slice(0, config.maxRecentJobs);
  const health = loadAutomationLlmHealth();
  const learning = deriveAutomationLearningState(allJobs);
  const canaryQueue = automationCanaryQueue(allJobs, learning);
  const canaryReport = refreshAutomationCanaryReport({ config, jobs: allJobs, health, learning });
  const counts = jobs.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {});
  return {
    config,
    counts,
    active: jobs.filter((job) => ['QUEUED', 'RUNNING'].includes(job.status)),
    exceptions: jobs.filter((job) => ['EXCEPTION', 'ROLLBACK_FAILED'].includes(job.status)),
    reroutes: jobs.filter((job) => (
      job.status === 'REROUTE_PROPOSED'
      && job.origin === 'live'
      && !job.reroute?.appliedAt
    )),
    canaryQueue,
    canaryReport,
    jobs,
    shadowReport: readJson(AUTOMATION_SHADOW_REPORT_PATH, null),
    llmHealth: health,
    learning,
    promotionGate: evaluateAutomationPromotionGate({ config, jobs: allJobs, health }),
    llm: {
      configured: Boolean(
        process.env.ERP_KB_AUTOMATION_LLM_MOCK_FILE
        || (
          (
            process.env.OPENSPG_COOKIE
            || process.env.OPENSPG_COOKIE_FILE
            || fs.existsSync('/etc/erp-kb-openspg.cookie')
          )
          && process.env.OPENSPG_LLM_APP_ID
          && process.env.OPENSPG_LLM_SESSION_ID
        )
      ),
      endpoint: process.env.OPENSPG_LLM_ENDPOINT || '/v1/chat/completions',
      model: process.env.ERP_KB_AUTOMATION_LLM_MODEL || process.env.OPENSPG_LLM_MODEL || '',
      promptVersion: 'dashboard-review-v1',
    },
    providerSecrets: providerSecretsSummary(),
  };
}

export function triggerAutomationForDraft(draft, options = {}) {
  const config = loadAutomationConfig();
  if ((!config.enabled || config.paused) && !options.force) {
    return { started: false, reason: config.paused ? 'automation_paused' : 'automation_disabled' };
  }
  if (
    config.allowedNamespaces.length
    && !config.allowedNamespaces.includes(draft.kbNamespace)
    && !options.force
  ) {
    return { started: false, reason: 'namespace_not_allowed' };
  }
  const { job, created } = createAutomationJob(draft, {
    ...options,
    mode: options.mode || (config.shadowOnly ? 'shadow' : 'publish'),
    origin: options.origin || 'live',
  });
  if (!created && !options.force) {
    return { started: false, reason: 'job_exists', job };
  }
  const child = spawn(process.execPath, [
    path.join(SCRIPTS_ROOT, 'run_dashboard_automation.mjs'),
    '--job',
    job.id,
  ], {
    cwd: ROOT,
    env: { ...process.env, ROOT },
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  return { started: true, job, pid: child.pid };
}

export function triggerShadowBenchmark(options = {}) {
  const args = [
    path.join(SCRIPTS_ROOT, 'run_dashboard_automation.mjs'),
    '--shadow-history',
  ];
  if (options.namespace) args.push('--namespace', String(options.namespace));
  if (options.limit) args.push('--limit', String(options.limit));
  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    env: { ...process.env, ROOT, ERP_KB_AUTOMATION_FORCE: '1' },
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  return { started: true, pid: child.pid };
}
