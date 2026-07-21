#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const MAX_DETAILS_LENGTH = 4000;
const REDACTIONS = [
  [/\b(password|pwd|token|secret|api[_-]?key)\s*[=:]\s*[^;\s]+/gi, '$1=<REDACTED>'],
  [/\b(User ID|UID)\s*=\s*[^;]+/gi, '$1=<REDACTED>'],
  [/\bMSSQL_CONNECTION_STRING\s*=\s*[^\r\n]+/gi, 'MSSQL_CONNECTION_STRING=<REDACTED>'],
];

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function redact(value) {
  return REDACTIONS.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), value)
    .slice(-MAX_DETAILS_LENGTH);
}

const exitCode = Number.parseInt(argument('--exit-code') || '1', 10);
const detailsFile = argument('--details-file');
const details = detailsFile && fs.existsSync(detailsFile)
  ? redact(fs.readFileSync(detailsFile, 'utf8'))
  : '';
const payload = {
  source: 'optima-schema-drift',
  severity: 'critical',
  event: 'schema_drift_check_failed',
  exitCode: Number.isFinite(exitCode) ? exitCode : 1,
  details,
  generatedAt: new Date().toISOString(),
};
const cooldownMinutes = Number.parseInt(
  process.env.OPTIMA_SCHEMA_DRIFT_ALERT_COOLDOWN_MINUTES || '60',
  10,
);
const stateFile = process.env.OPTIMA_SCHEMA_DRIFT_ALERT_STATE_FILE
  || '/var/lib/optima-schema-drift/alert-state.json';
const fingerprint = crypto.createHash('sha256')
  .update(`${payload.event}\n${payload.exitCode}\n${details}`)
  .digest('hex');

if (Number.isFinite(cooldownMinutes) && cooldownMinutes > 0 && fs.existsSync(stateFile)) {
  try {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const elapsed = Date.now() - Date.parse(state.deliveredAt || '');
    if (state.fingerprint === fingerprint && elapsed >= 0 && elapsed < cooldownMinutes * 60_000) {
      console.log(JSON.stringify({
        ...payload,
        delivery: 'suppressed',
        reason: 'duplicate_within_cooldown',
        cooldownMinutes,
      }));
      process.exit(0);
    }
  } catch {
    // A missing or malformed state must never block a fresh alert.
  }
}

const webhookUrl = process.env.OPTIMA_SCHEMA_DRIFT_WEBHOOK_URL || '';
const telegramBotToken = process.env.OPTIMA_SCHEMA_DRIFT_TELEGRAM_BOT_TOKEN || '';
const telegramChatId = process.env.OPTIMA_SCHEMA_DRIFT_TELEGRAM_CHAT_ID || '';
const deliveries = [];

if (telegramBotToken && telegramChatId) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: [
          '[CRITICAL] Optima schema drift check failed',
          `Exit code: ${payload.exitCode}`,
          `Time: ${payload.generatedAt}`,
          details ? `Details:\n${details.slice(-3000)}` : '',
        ].filter(Boolean).join('\n'),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    deliveries.push('telegram');
  } catch {
    console.error(JSON.stringify({
      ...payload,
      delivery: 'telegram_failed',
      deliveryError: 'Telegram request failed',
    }));
    process.exitCode = 1;
  }
}

if (!webhookUrl && deliveries.length === 0 && !process.exitCode) {
  console.error(JSON.stringify({ ...payload, delivery: 'external_delivery_not_configured' }));
  process.exit(0);
}

if (webhookUrl) {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Webhook returned HTTP ${response.status}`);
    deliveries.push('webhook');
  } catch (error) {
    console.error(JSON.stringify({ ...payload, delivery: 'webhook_failed', deliveryError: error.message }));
    process.exitCode = 1;
  }
}

if (deliveries.length > 0) {
  const stateDirectory = path.dirname(stateFile);
  const temporaryState = `${stateFile}.${process.pid}.tmp`;
  fs.mkdirSync(stateDirectory, { recursive: true, mode: 0o700 });
  fs.writeFileSync(temporaryState, JSON.stringify({
    fingerprint,
    deliveredAt: payload.generatedAt,
    deliveries,
  }), { mode: 0o600 });
  fs.renameSync(temporaryState, stateFile);
  console.log(JSON.stringify({ ...payload, deliveries }));
}
