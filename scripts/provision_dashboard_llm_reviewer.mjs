#!/usr/bin/env node

import process from 'process';
import { readOpenSpgCookie } from './lib/openspg_auth.mjs';
import { OPENSPG_API_BASE } from './lib/config.mjs';

const API_BASE = OPENSPG_API_BASE;
const COOKIE = readOpenSpgCookie();
const SOURCE_APP_ID = Number(process.env.DASHBOARD_LLM_SOURCE_APP_ID || 2);
const REVIEWER_ALIAS = process.env.DASHBOARD_LLM_REVIEWER_ALIAS || 'dashboardllmreviewer';
const REVIEWER_NAME = 'Dashboard LLM Reviewer';
const MAX_CANDIDATES = Number(process.env.DASHBOARD_LLM_MAX_CANDIDATES || 12);
const PROBE_TIMEOUT_MS = Number(process.env.DASHBOARD_LLM_PROBE_TIMEOUT_MS || 90000);

if (!COOKIE) throw new Error('OPENSPG_COOKIE or OPENSPG_COOKIE_FILE is required');

async function api(method, endpoint, body) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      Cookie: COOKIE,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${method} ${endpoint} returned non-JSON: ${text.slice(0, 300)}`);
  }
  if (!response.ok || json.success === false) {
    throw new Error(`${method} ${endpoint} failed: ${text.slice(0, 500)}`);
  }
  return json.result;
}

async function listAllPages(endpoint) {
  const items = [];
  let pageNo = 1;
  for (;;) {
    const result = await api('GET', `${endpoint}?pageNo=${pageNo}&pageSize=100`);
    const page = Array.isArray(result) ? result : result?.data || [];
    items.push(...page);
    const total = Array.isArray(result) ? items.length : Number(result?.total || items.length);
    if (items.length >= total || page.length === 0) break;
    pageNo += 1;
  }
  return items;
}

async function listApps() {
  return listAllPages('/v1/app/list');
}

async function listProjects() {
  return listAllPages('/v1/projects/list');
}

async function createCandidate(index) {
  const suffix = `${Date.now().toString(36)}${index}`.slice(-10);
  return api('POST', '/v1/app', {
    name: `Dashboard reviewer candidate ${suffix}`,
    description: 'Temporary candidate used to align an OpenSPG app id with an existing project id.',
    logo: '/img/logo/appicon.png',
    alias: `drc${suffix}`,
  });
}

function sseAnswer(body) {
  let last = '';
  for (const line of String(body || '').split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    if (['[ERROR]', '[TIMEOUT]'].includes(payload)) throw new Error(`Probe ended with ${payload}`);
    try {
      const event = JSON.parse(payload);
      if (event.success === false) throw new Error(event.errorMsg || 'Probe failed');
      if (typeof event.answer === 'string') last = event.answer;
    } catch (error) {
      if (error instanceof SyntaxError) continue;
      throw error;
    }
  }
  return last;
}

async function createSession(app) {
  const result = await api('POST', '/public/v1/reasoner/session/create', {
    appId: app.id,
    accessToken: app.accessToken,
    type: 'app',
    name: `dashboard-llm-reviewer-${new Date().toISOString().slice(0, 10)}`,
  });
  if (!result?.id) throw new Error('Reviewer session creation returned no id');
  return result.id;
}

async function probe(appId, sessionId) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Cookie: COOKIE,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: appId,
        session_id: sessionId,
        prompt: [{
          type: 'text',
          content: 'Zwróć wyłącznie ten obiekt JSON bez markdown: {"reviewerProbe":true}',
        }],
        thinking_enabled: false,
        search_enabled: false,
      }),
      signal: controller.signal,
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`Reviewer probe HTTP ${response.status}: ${body.slice(0, 300)}`);
    const answer = sseAnswer(body);
    if (!answer.includes('"reviewerProbe"') || !answer.includes('true')) {
      throw new Error(`Reviewer probe returned an unexpected answer: ${answer.slice(0, 500)}`);
    }
    return { ok: true, answerLength: answer.length };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const sourceApp = await api('GET', `/v1/app/${SOURCE_APP_ID}`);
  if (!sourceApp?.config?.llm) {
    throw new Error(`Source app ${SOURCE_APP_ID} has no configured LLM`);
  }

  const projects = await listProjects();
  const projectById = new Map(projects.map((project) => [Number(project.id), project]));
  let reviewer = (await listApps()).find((app) => app.alias === REVIEWER_ALIAS) || null;
  const placeholders = [];

  if (!reviewer) {
    for (let index = 0; index < MAX_CANDIDATES; index += 1) {
      const id = Number(await createCandidate(index));
      if (projectById.has(id)) {
        reviewer = { id };
        break;
      }
      placeholders.push(id);
    }
  }
  if (!reviewer?.id || !projectById.has(Number(reviewer.id))) {
    throw new Error('Unable to align reviewer app id with an existing OpenSPG project id');
  }

  const project = projectById.get(Number(reviewer.id));
  await api('PUT', `/v1/app/${reviewer.id}`, {
    name: REVIEWER_NAME,
    description: 'Dedicated JSON-only LLM reviewer for dashboard shadow and canary automation.',
    logo: '/img/logo/appicon.png',
    alias: REVIEWER_ALIAS,
    config: {
      llm: sourceApp.config.llm,
      language: sourceApp.config.language || 'zh',
      kb: [{ id: project.id, name: project.name, enable: true }],
      chat: sourceApp.config.chat,
    },
  });
  await api('POST', '/v1/app/deploy', { id: reviewer.id });
  const deployed = await api('GET', `/v1/app/${reviewer.id}`);
  const sessionId = await createSession(deployed);
  const probeResult = process.argv.includes('--no-probe')
    ? { ok: false, skipped: true }
    : await probe(Number(reviewer.id), Number(sessionId));

  for (const id of placeholders) {
    await api('DELETE', `/v1/app/${id}`);
  }

  process.stdout.write(`${JSON.stringify({
    success: true,
    appId: Number(reviewer.id),
    sessionId: Number(sessionId),
    projectId: Number(project.id),
    projectName: project.name,
    model: deployed.config?.llm?.name || '',
    provider: deployed.config?.llm?.provider || '',
    probe: probeResult,
    deletedPlaceholderAppIds: placeholders,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
