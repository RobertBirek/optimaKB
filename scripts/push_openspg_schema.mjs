#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { readOpenSpgCookie } from './lib/openspg_auth.mjs';
import { OPENSPG_API_BASE } from './lib/config.mjs';

const ROOT = '/docker/openspg';
const API_BASE = OPENSPG_API_BASE;
const COOKIE = readOpenSpgCookie();
const PROJECT_ID = process.env.OPENSPG_PROJECT_ID;
const SCHEMA_FILE =
  process.env.OPENSPG_SCHEMA_FILE ||
  path.join(ROOT, 'docs/reference/ComarchOptimaSchema.schema');

if (!COOKIE) throw new Error('OPENSPG_COOKIE or OPENSPG_COOKIE_FILE is required');

const schemaText = fs.readFileSync(SCHEMA_FILE, 'utf8');
const schemaUrl = PROJECT_ID ? `${API_BASE}/v1/schemas?projectId=${encodeURIComponent(PROJECT_ID)}` : `${API_BASE}/v1/schemas`;

const response = await fetch(schemaUrl, {
  method: 'POST',
  headers: {
    Cookie: COOKIE,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ data: schemaText }),
});

const text = await response.text();
let json;
try {
  json = JSON.parse(text);
} catch (error) {
  throw new Error(`Non-JSON response: ${text.slice(0, 400)}`);
}

if (!response.ok || !json.success) {
  throw new Error(`Schema push failed: ${text.slice(0, 400)}`);
}

console.log(JSON.stringify({
  success: true,
  schemaFile: SCHEMA_FILE,
  apiBase: API_BASE,
  projectId: PROJECT_ID || '',
}, null, 2));
