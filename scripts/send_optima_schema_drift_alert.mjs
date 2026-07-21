#!/usr/bin/env node

import fs from 'node:fs';

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

const webhookUrl = process.env.OPTIMA_SCHEMA_DRIFT_WEBHOOK_URL || '';
if (!webhookUrl) {
  console.error(JSON.stringify({ ...payload, delivery: 'webhook_not_configured' }));
  process.exit(0);
}

try {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Webhook returned HTTP ${response.status}`);
} catch (error) {
  console.error(JSON.stringify({ ...payload, delivery: 'failed', deliveryError: error.message }));
  process.exitCode = 1;
}
