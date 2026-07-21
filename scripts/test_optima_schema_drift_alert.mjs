#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'optima-schema-alert-'));
const stateFile = path.join(temporaryDirectory, 'alert-state.json');
const event = 'schema_drift_check_failed';
const exitCode = 17;
const fingerprint = crypto.createHash('sha256')
  .update(`${event}\n${exitCode}\n`)
  .digest('hex');

try {
  fs.writeFileSync(stateFile, JSON.stringify({
    fingerprint,
    deliveredAt: new Date().toISOString(),
    deliveries: ['telegram'],
  }));

  const result = spawnSync(process.execPath, [
    path.join(process.cwd(), 'scripts/send_optima_schema_drift_alert.mjs'),
    '--exit-code',
    String(exitCode),
  ], {
    encoding: 'utf8',
    env: {
      ...process.env,
      OPTIMA_SCHEMA_DRIFT_ALERT_STATE_FILE: stateFile,
      OPTIMA_SCHEMA_DRIFT_ALERT_COOLDOWN_MINUTES: '60',
      OPTIMA_SCHEMA_DRIFT_TELEGRAM_BOT_TOKEN: 'must-not-be-used',
      OPTIMA_SCHEMA_DRIFT_TELEGRAM_CHAT_ID: 'must-not-be-used',
    },
  });

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout.trim());
  assert.equal(output.delivery, 'suppressed');
  assert.equal(output.reason, 'duplicate_within_cooldown');
  assert.equal(output.cooldownMinutes, 60);
  console.log(JSON.stringify({ suppressed: true, networkAttempted: false }));
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}
