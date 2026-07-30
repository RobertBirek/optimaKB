#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.env.ROOT || '/docker/openspg';
export const DASHBOARD_AUDIT_ROOT = path.join(ROOT, 'data/dashboard/audit');
const AUDIT_LOCK_PATH = path.join(DASHBOARD_AUDIT_ROOT, '.append.lock');
const REDACTED_KEY = /authorization|cookie|credential|password|secret|token/i;

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

function hashValue(value) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(stableValue(value)), 'utf8')
    .digest('hex');
}

function sanitize(value, key = '', depth = 0) {
  if (REDACTED_KEY.test(key)) return '[REDACTED]';
  if (depth > 8) return '[MAX_DEPTH]';
  if (typeof value === 'string') return value.slice(0, 4000);
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitize(item, '', depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 200)
        .map(([itemKey, item]) => [itemKey, sanitize(item, itemKey, depth + 1)]),
    );
  }
  return value ?? null;
}

function auditFiles() {
  if (!fs.existsSync(DASHBOARD_AUDIT_ROOT)) return [];
  return fs.readdirSync(DASHBOARD_AUDIT_ROOT)
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(name))
    .sort()
    .map((name) => path.join(DASHBOARD_AUDIT_ROOT, name));
}

const AUDIT_RETENTION_DAYS = Math.max(1, Number(process.env.ERP_KB_DASHBOARD_AUDIT_RETENTION_DAYS || 90));
let prunedThisProcess = false;

// Log is hash-chained (each event links to the previous one's hash), so this
// only prunes whole day-files older than the retention window rather than
// individual lines — it trades full from-genesis chain verification for
// bounded disk growth, same tradeoff any archive-then-delete audit policy
// makes. New appends keep working since they only need the latest event.
function pruneOldAuditFiles() {
  if (prunedThisProcess) return;
  prunedThisProcess = true;
  const cutoff = Date.now() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const filePath of auditFiles()) {
    const name = path.basename(filePath, '.jsonl');
    const fileDate = Date.parse(`${name}T00:00:00Z`);
    if (Number.isFinite(fileDate) && fileDate < cutoff) {
      try {
        fs.rmSync(filePath, { force: true });
      } catch {
        // Best-effort; a failed prune just means this file is retried next process start.
      }
    }
  }
}

function lastAuditEvent() {
  for (const filePath of auditFiles().reverse()) {
    const lines = fs.readFileSync(filePath, 'utf8').trim().split(/\r?\n/).filter(Boolean);
    for (const line of lines.reverse()) {
      try {
        return JSON.parse(line);
      } catch {
        // Verification reports malformed lines; appends continue from the last valid event.
      }
    }
  }
  return null;
}

function acquireAppendLock() {
  ensureDir(DASHBOARD_AUDIT_ROOT);
  const staleMs = Number(process.env.ERP_KB_DASHBOARD_AUDIT_LOCK_STALE_MS || 30000);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const fd = fs.openSync(AUDIT_LOCK_PATH, 'wx', 0o600);
      fs.writeFileSync(fd, `${process.pid} ${new Date().toISOString()}\n`);
      fs.closeSync(fd);
      return () => fs.rmSync(AUDIT_LOCK_PATH, { force: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try {
        const age = Date.now() - fs.statSync(AUDIT_LOCK_PATH).mtimeMs;
        if (age > staleMs) {
          fs.rmSync(AUDIT_LOCK_PATH, { force: true });
          continue;
        }
      } catch {
        // The competing writer may have released the lock.
      }
      const waitUntil = Date.now() + 10;
      while (Date.now() < waitUntil) {
        // Keep this synchronous helper dependency-free and bounded.
      }
    }
  }
  throw new Error('Dashboard audit append lock is busy');
}

export function appendDashboardAudit(input = {}) {
  pruneOldAuditFiles();
  const release = acquireAppendLock();
  try {
    const previous = lastAuditEvent();
    const at = input.at || new Date().toISOString();
    const event = {
      id: input.id || `audit_${at.slice(0, 10)}_${crypto.randomUUID().slice(0, 12)}`,
      at,
      actor: String(input.actor || 'system').slice(0, 200),
      role: String(input.role || 'system').slice(0, 40),
      action: String(input.action || 'unknown').slice(0, 200),
      resourceType: String(input.resourceType || '').slice(0, 100),
      resourceId: String(input.resourceId || '').slice(0, 500),
      outcome: String(input.outcome || 'success').slice(0, 40),
      before: sanitize(input.before),
      after: sanitize(input.after),
      metadata: sanitize(input.metadata || {}),
      previousHash: previous?.hash || '',
    };
    event.hash = hashValue(event);
    const filePath = path.join(DASHBOARD_AUDIT_ROOT, `${at.slice(0, 10)}.jsonl`);
    fs.appendFileSync(filePath, `${JSON.stringify(event)}\n`, { encoding: 'utf8', mode: 0o600 });
    return event;
  } finally {
    release();
  }
}

export function listDashboardAudit(options = {}) {
  const limit = Math.max(1, Math.min(1000, Number(options.limit || 100)));
  const action = String(options.action || '');
  const actor = String(options.actor || '');
  const resourceId = String(options.resourceId || '');
  const events = [];
  for (const filePath of auditFiles().reverse()) {
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean).reverse();
    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        if (action && event.action !== action) continue;
        if (actor && event.actor !== actor) continue;
        if (resourceId && event.resourceId !== resourceId) continue;
        events.push(event);
        if (events.length >= limit) return events;
      } catch {
        // A malformed line is surfaced by chain verification.
      }
    }
  }
  return events;
}

export function verifyDashboardAudit(limit = 1000) {
  const requestedLimit = Math.max(1, Math.min(10000, Number(limit) || 1000));
  const allRawLines = auditFiles()
    .flatMap((filePath) => fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line, index) => ({ filePath, line, lineNumber: index + 1 })));
  const truncated = allRawLines.length > requestedLimit;
  const rawLines = allRawLines.slice(-requestedLimit);
  const events = [];
  const problems = [];
  for (const raw of rawLines) {
    try {
      events.push(JSON.parse(raw.line));
    } catch {
      problems.push({
        file: path.basename(raw.filePath),
        line: raw.lineNumber,
        problem: 'malformed_json',
      });
    }
  }
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const { hash, ...unsigned } = event;
    if (hashValue(unsigned) !== hash) problems.push({ id: event.id, problem: 'hash_mismatch' });
    if (index > 0 && event.previousHash !== events[index - 1].hash) {
      problems.push({ id: event.id, problem: 'chain_mismatch' });
    }
  }
  if (!truncated && events[0]?.previousHash) {
    problems.push({ id: events[0].id, problem: 'chain_origin_mismatch' });
  }
  return {
    ok: problems.length === 0,
    checked: events.length,
    truncated,
    problems,
    latestAt: events.at(-1)?.at || '',
  };
}

export function dashboardAuditSummary() {
  const recent = listDashboardAudit({ limit: 100 });
  return {
    recent,
    verification: verifyDashboardAudit(1000),
    countInView: recent.length,
  };
}
