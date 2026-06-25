#!/usr/bin/env node

import process from 'process';
import {
  loadAutomationConfig,
  loadAutomationLlmHealth,
  saveAutomationConfig,
  saveAutomationLlmHealth,
} from './lib/dashboard_automation.mjs';
import { readOpenSpgCookie } from './lib/openspg_auth.mjs';
import { OPENSPG_API_BASE } from './lib/config.mjs';

const API_BASE = OPENSPG_API_BASE;
const ENDPOINT = process.env.OPENSPG_LLM_ENDPOINT || '/v1/chat/completions';
const APP_ID = process.env.OPENSPG_LLM_APP_ID || '';
const SESSION_ID = process.env.OPENSPG_LLM_SESSION_ID || '';
const MODEL = process.env.ERP_KB_AUTOMATION_LLM_MODEL || process.env.OPENSPG_LLM_MODEL || '';
const TIMEOUT_MS = Number(process.env.ERP_KB_AUTOMATION_LLM_HEALTH_TIMEOUT_MS || 90000);
const HARD_TIMEOUT_MS = Number(
  process.env.ERP_KB_AUTOMATION_LLM_HEALTH_HARD_TIMEOUT_MS
  || Math.max(TIMEOUT_MS + 30000, 120000),
);
const FAILURE_THRESHOLD = Math.max(
  1,
  Number(process.env.ERP_KB_AUTOMATION_LLM_HEALTH_FAILURE_THRESHOLD || 2),
);

function parseSseAnswer(body) {
  let lastAnswer = '';
  for (const line of String(body || '').split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    if (['[ERROR]', '[TIMEOUT]'].includes(payload)) throw new Error(`LLM stream ended with ${payload}`);
    try {
      const event = JSON.parse(payload);
      if (event.success === false) {
        throw new Error(event.errorMsg || event.message || 'LLM stream failed');
      }
      if (typeof event.answer === 'string') lastAnswer = event.answer;
    } catch (error) {
      if (error instanceof SyntaxError) continue;
      throw error;
    }
  }
  if (!lastAnswer) throw new Error('LLM stream did not contain an answer');
  return lastAnswer;
}

function parseJsonObject(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] || raw;
  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('LLM probe did not return a JSON object');
  return JSON.parse(fenced.slice(start, end + 1));
}

async function realProbe() {
  const cookie = readOpenSpgCookie({ required: true });
  if (!APP_ID || !SESSION_ID) {
    throw new Error('OPENSPG_LLM_APP_ID and OPENSPG_LLM_SESSION_ID are required');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const response = await fetch(`${API_BASE}${ENDPOINT}`, {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...(MODEL ? { model: MODEL } : {}),
        app_id: /^\d+$/.test(APP_ID) ? Number(APP_ID) : APP_ID,
        session_id: /^\d+$/.test(SESSION_ID) ? Number(SESSION_ID) : SESSION_ID,
        prompt: [{
          type: 'text',
          content: 'Zwróć wyłącznie ten obiekt JSON bez markdown: {"health":true}',
        }],
        thinking_enabled: false,
        search_enabled: false,
      }),
      signal: controller.signal,
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`LLM health HTTP ${response.status}: ${body.slice(0, 300)}`);
    const parsed = parseJsonObject(parseSseAnswer(body));
    if (parsed.health !== true) throw new Error('LLM health response did not contain health=true');
    return { latencyMs: Date.now() - startedAt };
  } finally {
    clearTimeout(timer);
  }
}

async function probe() {
  const mock = process.env.ERP_KB_AUTOMATION_LLM_HEALTH_MOCK;
  if (mock === 'success') return { latencyMs: 1 };
  if (mock === 'fail') throw new Error('Mock LLM health failure');
  return realProbe();
}

async function main() {
  const hardTimeout = setTimeout(() => {
    process.stderr.write(`LLM health hard timeout after ${HARD_TIMEOUT_MS}ms\n`);
    process.exit(124);
  }, HARD_TIMEOUT_MS);
  hardTimeout.unref?.();
  const previous = loadAutomationLlmHealth();
  try {
    const result = await probe();
    const health = saveAutomationLlmHealth({
      status: 'PASS',
      checkedAt: new Date().toISOString(),
      latencyMs: result.latencyMs,
      consecutiveFailures: 0,
      error: '',
      model: MODEL,
      appId: APP_ID,
    });
    process.stdout.write(`${JSON.stringify({ ok: true, health }, null, 2)}\n`);
  } catch (error) {
    const consecutiveFailures = Number(previous.consecutiveFailures || 0) + 1;
    const health = saveAutomationLlmHealth({
      status: 'FAIL',
      checkedAt: new Date().toISOString(),
      latencyMs: null,
      consecutiveFailures,
      error: String(error.message || error).slice(0, 2000),
      model: MODEL,
      appId: APP_ID,
    });
    let paused = false;
    if (consecutiveFailures >= FAILURE_THRESHOLD) {
      const config = loadAutomationConfig();
      if (!config.paused || !String(config.pauseReason || '').startsWith('LLM health check failed')) {
        saveAutomationConfig({
          paused: true,
          pauseReason: `LLM health check failed ${consecutiveFailures} consecutive time(s): ${health.error}`,
          publicationApproved: false,
        }, 'llm-health-check');
      }
      paused = true;
    }
    process.stdout.write(`${JSON.stringify({ ok: false, paused, health }, null, 2)}\n`);
    process.exitCode = 1;
  } finally {
    clearTimeout(hardTimeout);
  }
}

main();
