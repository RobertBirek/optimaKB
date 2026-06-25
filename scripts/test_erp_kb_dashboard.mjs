#!/usr/bin/env node

import fs from 'fs';
import process from 'process';
import { ERP_KB_DASHBOARD_TEST_URL } from './lib/config.mjs';

const ENV_PATH = process.env.ERP_KB_DASHBOARD_ENV_PATH || '/etc/erp-kb-dashboard.env';
const BASE_URL = ERP_KB_DASHBOARD_TEST_URL;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const values = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function authHeader(env) {
  const user = process.env.ERP_KB_DASHBOARD_USER || env.ERP_KB_DASHBOARD_USER || '';
  const password = process.env.ERP_KB_DASHBOARD_PASSWORD || env.ERP_KB_DASHBOARD_PASSWORD || '';
  if (!user && !password) return {};
  const token = Buffer.from(`${user}:${password}`).toString('base64');
  return { Authorization: `Basic ${token}` };
}

async function request(pathname, options = {}) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { response, text, json };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const env = loadEnvFile(ENV_PATH);
const headers = authHeader(env);
const result = {
  ok: false,
  baseUrl: BASE_URL,
  checks: [],
};

try {
  const health = await request('/health');
  assert(health.response.status === 200, `health returned ${health.response.status}`);
  assert(health.json?.ok === true, 'health did not return ok=true');
  assert(health.response.headers.get('x-content-type-options') === 'nosniff', 'health missing nosniff header');
  assert(Boolean(health.response.headers.get('content-security-policy')), 'health missing CSP header');
  result.checks.push({ name: 'health', status: 'PASS' });

  const unauth = await request('/api/status');
  if (Object.keys(headers).length && unauth.response.status === 401) {
    result.checks.push({ name: 'unauthorized_status', status: 'PASS' });
  } else if (Object.keys(headers).length && unauth.response.status === 200 && unauth.json?.service?.auth === 'none') {
    result.checks.push({ name: 'unauthorized_status', status: 'SKIP_SERVICE_AUTH_NONE' });
  } else if (Object.keys(headers).length) {
    assert(unauth.response.status === 401, `unauthorized status returned ${unauth.response.status}`);
  } else {
    result.checks.push({ name: 'unauthorized_status', status: 'SKIP_NO_AUTH' });
  }

  const status = await request('/api/status', { headers });
  assert(status.response.status === 200, `authorized status returned ${status.response.status}`);
  assert(status.json?.service?.ok === true, 'status service.ok is not true');
  assert(Array.isArray(status.json?.kbs) && status.json.kbs.length >= 1, 'status has no KB summaries');
  assert(Array.isArray(status.json?.reports) && status.json.reports.length >= 1, 'status has no reports');
  assert(Boolean(status.json?.service?.csrfToken), 'status has no CSRF token');
  assert(status.json?.automation?.config, 'status has no automation config');
  assert(Array.isArray(status.json?.tools) && status.json.tools.length >= 5, 'status has no basic tool links');
  assert(
    status.json.tools.every((tool) => /^https?:\/\//.test(tool.url) && !/@/.test(tool.url)),
    'tool links are invalid or contain embedded credentials',
  );
  assert(
    status.json.tools.some((tool) => tool.id === 'openspg-knowledge' && tool.url.includes('/#/knowledge')),
    'OpenSPG knowledge link is missing',
  );
  assert(
    status.json.tools.some((tool) => tool.id === 'mcp-health' && tool.url.endsWith('/health')),
    'MCP health link is missing',
  );
  const healthTargets = [...new Set(status.json.tools.map((tool) => tool.healthUrl).filter(Boolean))];
  for (const healthUrl of healthTargets) {
    const response = await fetch(healthUrl);
    assert(response.ok, `tool health check failed for ${healthUrl}: ${response.status}`);
  }
  result.checks.push({
    name: 'authorized_status',
    status: 'PASS',
    quality: status.json.overall?.quality || 'UNKNOWN',
    freshness: status.json.overall?.freshness || 'UNKNOWN',
    pendingDrafts: status.json.overall?.pendingDrafts ?? null,
    tools: status.json.tools.length,
  });

  const automation = await request('/api/automation', { headers });
  assert(automation.response.status === 200, `automation returned ${automation.response.status}`);
  assert(automation.json?.automation?.config, 'automation config missing');
  assert(automation.json?.automation?.llmHealth, 'automation LLM health missing');
  assert(automation.json?.automation?.promotionGate, 'automation promotion gate missing');
  assert(Array.isArray(automation.json?.automation?.reroutes), 'automation reroute queue missing');
  assert(Array.isArray(automation.json?.automation?.canaryQueue), 'automation canary queue missing');
  assert(automation.json?.automation?.canaryReport, 'automation canary report missing');
  result.checks.push({
    name: 'automation_status',
    status: 'PASS',
    llmHealth: automation.json.automation.llmHealth.status,
    gateEligible: automation.json.automation.promotionGate.eligible,
    gateSamples: automation.json.automation.promotionGate.metrics?.samples ?? null,
    reroutes: automation.json.automation.reroutes.length,
    canaryPending: automation.json.automation.canaryQueue.length,
  });

  const discovery = await request('/api/discovery', { headers });
  assert(discovery.response.status === 200, `discovery returned ${discovery.response.status}`);
  assert(discovery.json?.discovery?.policy?.dryRun === true, 'discovery dry-run is not enforced');
  assert(discovery.json?.discovery?.coverage?.configuredKbs === 10, 'discovery does not configure 10 KBs');
  assert(discovery.json?.discovery?.coverage?.coveredKbs === 10, 'discovery does not cover all 10 KBs');
  assert(Array.isArray(discovery.json?.discovery?.queries), 'discovery queries missing');
  assert(Array.isArray(discovery.json?.discovery?.candidates), 'discovery candidates missing');
  assert(discovery.json?.discovery?.feedback?.calibration?.target === 30, 'discovery calibration target is not 30');
  assert(
    Array.isArray(discovery.json?.discovery?.feedback?.calibration?.candidateIds),
    'discovery calibration candidates missing',
  );
  assert(
    Number.isInteger(discovery.json?.discovery?.report?.totals?.duplicates),
    'discovery duplicate count missing',
  );
  assert(Array.isArray(discovery.json?.discovery?.qualityAlerts), 'discovery quality alerts missing');
  assert(discovery.json?.discovery?.briefing?.totals, 'discovery briefing missing');
  assert(discovery.json?.discovery?.semiAuto?.metrics, 'discovery semi-auto gate missing');
  assert(
    discovery.json.discovery.candidates.every((candidate) => candidate.priority?.score != null),
    'candidate priority missing',
  );
  assert(
    discovery.json.discovery.queries.every((query) => query.analytics),
    'query analytics missing',
  );
  result.checks.push({
    name: 'discovery_status',
    status: 'PASS',
    coverage: `${discovery.json.discovery.coverage.coveredKbs}/${discovery.json.discovery.coverage.configuredKbs}`,
    queries: discovery.json.discovery.queries.length,
    candidates: discovery.json.discovery.candidates.length,
    duplicates: discovery.json.discovery.report.totals.duplicates,
    alerts: discovery.json.discovery.qualityAlerts.length,
    semiAutoActive: discovery.json.discovery.semiAuto.active,
    calibration: `${discovery.json.discovery.feedback.calibration.reviewed}/${discovery.json.discovery.feedback.calibration.target}`,
    dryRun: discovery.json.discovery.policy.dryRun,
  });

  assert(status.json?.audit?.verification, 'audit verification missing');
  assert(status.json.audit.verification.ok === true, 'audit hash chain verification failed');
  if (status.json.service?.role === 'admin') {
    const audit = await request('/api/audit?limit=20', { headers });
    assert(audit.response.status === 200, `audit returned ${audit.response.status}`);
    assert(audit.json?.verification?.ok === true, 'audit endpoint verification failed');
    assert(Array.isArray(audit.json?.events), 'audit endpoint events missing');
    result.checks.push({
      name: 'audit_chain',
      status: 'PASS',
      checked: audit.json.verification.checked,
      events: audit.json.events.length,
    });
  }

  if (status.json.inbox?.drafts?.length) {
    const draftId = status.json.inbox.drafts[0].id;
    const detail = await request(`/api/drafts/${encodeURIComponent(draftId)}`, { headers });
    assert(detail.response.status === 200, `draft detail returned ${detail.response.status}`);
    assert(detail.json?.id === draftId, 'draft detail id mismatch');
    result.checks.push({ name: 'draft_detail', status: 'PASS' });
  } else {
    result.checks.push({ name: 'draft_detail', status: 'SKIP_EMPTY_INBOX' });
  }

  result.ok = true;
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  result.error = error.message;
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = 1;
}
