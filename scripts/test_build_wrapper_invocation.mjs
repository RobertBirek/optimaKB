#!/usr/bin/env node

import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const {
  OPENSPG_COOKIE: _cookie,
  OPENSPG_COOKIE_FILE: _cookieFile,
  ...environment
} = process.env;
const result = spawnSync(process.execPath, [
  path.join(process.cwd(), 'scripts/build_optima_schema_metadata.mjs'),
], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: environment,
});

assert.notEqual(result.status, 0, 'Build wrapper returned success without executing the runner');
assert.match(`${result.stdout}\n${result.stderr}`, /OPENSPG_COOKIE or OPENSPG_COOKIE_FILE is required/);
console.log(JSON.stringify({ wrapperInvokedRunner: true }));
