#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { readOpenSpgCookie } from './lib/openspg_auth.mjs';
import { OPENSPG_API_BASE } from './lib/config.mjs';

const ROOT = '/docker/openspg';
const API_BASE = OPENSPG_API_BASE;
const OPENSPG_COOKIE = readOpenSpgCookie();
const APP_ID = Number(process.env.OPENSPG_APP_ID || 2);
const POLL_COUNT = Number(process.env.OPENSPG_LIVE_POLL_COUNT || 8);
const POLL_DELAY_MS = Number(process.env.OPENSPG_LIVE_POLL_DELAY_MS || 1500);

if (!OPENSPG_COOKIE) throw new Error('OPENSPG_COOKIE or OPENSPG_COOKIE_FILE is required');

const SAMPLE = [
  { id: 'Q001', category: 'schema', question: 'Jak połączyć TraNag z TraElem i Towary?' },
  { id: 'Q026', category: 'additional_functions', question: 'Kiedy użyć funkcji dodatkowej zamiast kolumny użytkownika?' },
  { id: 'Q046', category: 'sprint', question: 'Jak zacząć wydruk sPrint z nagłówkiem i pozycjami?' },
  { id: 'Q061', category: 'reference', question: 'Gdzie w dokumentacji Optimy znajdę onboarding modułu Handel?' },
  { id: 'Q071', category: 'partner', question: 'Jakie partnerowe procedury dotyczą funkcji dodatkowych?' },
  { id: 'Q086', category: 'betterfly', question: 'Jak działa token Betterfly API?' },
  { id: 'Q103', category: 'schema', question: 'Jakie procedury raportowe dotykają wydruków handlowych?' },
  { id: 'Q130', category: 'additional_functions', question: 'Jakie przykłady COM mamy dla wydruków i zmiennych dynamicznych?' },
  { id: 'Q148', category: 'sprint', question: 'Jak znaleźć wydruki typu sPrint?' },
  { id: 'Q162', category: 'reference', question: 'Jak znaleźć oficjalne informacje o funkcjach dodatkowych w dokumentacji?' },
  { id: 'Q175', category: 'partner', question: 'Jakie partnerowe COM sample dotyczą wydruków i raportowania?' },
  { id: 'Q194', category: 'betterfly', question: 'Jak wygląda finalize flow dla advanceInvoices?' },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function api(method, url, body, extraHeaders = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      Cookie: OPENSPG_COOKIE,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new Error(`Non-JSON response from ${method} ${url}: ${text.slice(0, 400)}`);
  }
  return { ok: response.ok, json, text };
}

async function getAppAccessToken() {
  const { ok, json, text } = await api('GET', `${API_BASE}/v1/app/${APP_ID}`);
  if (!ok || json.success === false || !json.result?.accessToken) {
    throw new Error(`Failed to fetch app ${APP_ID}: ${text.slice(0, 600)}`);
  }
  return json.result.accessToken;
}

async function createSession(accessToken, name) {
  const body = {
    appId: APP_ID,
    accessToken,
    type: 'app',
    name,
  };
  const { json, text } = await api('POST', `${API_BASE}/public/v1/reasoner/session/create`, body);
  if (json.success === false || !json.result?.id) {
    throw new Error(`Session create failed: ${text.slice(0, 600)}`);
  }
  return json.result;
}

async function submitTask(sessionId, question) {
  const body = {
    sessionId,
    nl: question,
  };
  const { json, text } = await api('POST', `${API_BASE}/public/v1/reasoner/task/submit`, body);
  if (json.success === false || !json.result?.id) {
    throw new Error(`Task submit failed: ${text.slice(0, 600)}`);
  }
  return json.result;
}

async function submitDialogExecution(session, taskId, question) {
  const body = {
    sessionId: session.id,
    userNo: session.userNo,
    instruction: question,
    taskId,
  };
  const { json, text } = await api('POST', `${API_BASE}/public/v1/reasoner/dialog/submit`, body);
  if (json.success === false || !json.result?.id) {
    throw new Error(`Dialog submit failed: ${text.slice(0, 600)}`);
  }
  return json.result;
}

async function queryTask(taskId) {
  const url = `${API_BASE}/public/v1/reasoner/dialog/query?id=${encodeURIComponent(taskId)}&jobId=${encodeURIComponent(taskId)}`;
  const { json, text } = await api('GET', url);
  if (json.success === false) {
    throw new Error(`Dialog query failed: ${text.slice(0, 600)}`);
  }
  return json.result || {};
}

async function runOne(accessToken, item) {
  const session = await createSession(accessToken, `live-benchmark-${item.id}`);
  const baseTask = await submitTask(session.id, item.question);
  const dialogTask = await submitDialogExecution(session, baseTask.id, item.question);

  const polls = [];
  for (let i = 0; i < POLL_COUNT; i += 1) {
    const result = await queryTask(dialogTask.id);
    polls.push({
      tick: i + 1,
      status: result.status || null,
      resultMessage: result.resultMessage || null,
      reactionType: result.reactionType || null,
      hasTable: !!result.resultTable,
      nodeCount: Array.isArray(result.resultNodes) ? result.resultNodes.length : 0,
      edgeCount: Array.isArray(result.resultEdges) ? result.resultEdges.length : 0,
    });
    if (['FINISH', 'ERROR', 'CANCELED', 'TIMEOUT'].includes(result.status)) {
      return {
        ...item,
        sessionId: session.id,
        userNo: session.userNo,
        baseTaskId: baseTask.id,
        dialogTaskId: dialogTask.id,
        terminalStatus: result.status,
        polls,
      };
    }
    await sleep(POLL_DELAY_MS);
  }

  return {
    ...item,
    sessionId: session.id,
    userNo: session.userNo,
    baseTaskId: baseTask.id,
    dialogTaskId: dialogTask.id,
    terminalStatus: 'RUNNING_TIMEOUT',
    polls,
  };
}

function summarize(results) {
  const summary = {};
  for (const row of results) {
    summary[row.terminalStatus] = (summary[row.terminalStatus] || 0) + 1;
  }
  return summary;
}

function toMarkdown(results, summary) {
  const lines = [
    '# ERP Knowledge Assistant OpenSPG Live Benchmark',
    '',
    `Date: \`${new Date().toISOString().slice(0, 10)}\``,
    '',
    '## Summary',
    '',
  ];

  for (const [status, count] of Object.entries(summary)) {
    lines.push(`- ${status}: \`${count}\``);
  }

  lines.push('');
  lines.push('## Results');
  lines.push('');

  for (const row of results) {
    const lastPoll = row.polls[row.polls.length - 1] || {};
    lines.push(`### ${row.id} ${row.terminalStatus}`);
    lines.push('');
    lines.push(`- Category: \`${row.category}\``);
    lines.push(`- Question: ${row.question}`);
    lines.push(`- Session: \`${row.sessionId}\``);
    lines.push(`- Base task: \`${row.baseTaskId}\``);
    lines.push(`- Dialog task: \`${row.dialogTaskId}\``);
    lines.push(`- Last polled status: \`${lastPoll.status || '-'}\``);
    lines.push(`- Result message: \`${String(lastPoll.resultMessage || '').slice(0, 160)}\``);
    lines.push('');
  }

  lines.push('## Note');
  lines.push('');
  lines.push('This benchmark verifies the currently published OpenSPG app through the live public reasoner session/task flow.');
  lines.push('If tasks remain in `RUNNING_TIMEOUT`, the blocker is in app runtime execution, not in local KB routing.');
  lines.push('');

  return lines.join('\n');
}

async function main() {
  const accessToken = await getAppAccessToken();
  const results = [];

  for (const item of SAMPLE) {
    results.push(await runOne(accessToken, item));
  }

  const summary = summarize(results);
  const payload = {
    generatedAt: new Date().toISOString(),
    apiBase: API_BASE,
    appId: APP_ID,
    sampleSize: SAMPLE.length,
    summary,
    results,
  };

  const outJson = path.join(ROOT, 'docs/reference/ERP_Knowledge_Assistant_OpenSPG_Live_Benchmark.json');
  const outMd = path.join(ROOT, 'docs/reference/ERP_Knowledge_Assistant_OpenSPG_Live_Benchmark.md');

  fs.writeFileSync(outJson, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  fs.writeFileSync(outMd, toMarkdown(results, summary) + '\n', 'utf8');

  console.log(JSON.stringify(summary, null, 2));
  console.log(`Wrote: ${outJson}`);
  console.log(`Wrote: ${outMd}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
