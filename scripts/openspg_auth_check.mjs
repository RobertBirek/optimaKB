#!/usr/bin/env node

import { readOpenSpgCookie, openSpgCookieSource } from './lib/openspg_auth.mjs';
import { OPENSPG_API_BASE } from './lib/config.mjs';

const API_BASE = OPENSPG_API_BASE;
const PROJECT_ID = process.env.OPENSPG_PROJECT_ID || '4';
const CHECK_PATH = process.env.OPENSPG_AUTH_CHECK_PATH || `/v1/schemas/graph/${encodeURIComponent(PROJECT_ID)}`;

let COOKIE = '';
try {
  COOKIE = readOpenSpgCookie({ required: true });
} catch (error) {
  process.stdout.write(`${JSON.stringify({
    ok: false,
    apiBase: API_BASE,
    checkPath: CHECK_PATH,
    cookieSource: openSpgCookieSource(),
    status: null,
    success: null,
    message: error.message,
  }, null, 2)}\n`);
  process.exit(1);
}

let response;
try {
  response = await fetch(`${API_BASE}${CHECK_PATH}`, {
    headers: { Cookie: COOKIE },
  });
} catch (error) {
  process.stdout.write(`${JSON.stringify({
    ok: false,
    apiBase: API_BASE,
    checkPath: CHECK_PATH,
    cookieSource: openSpgCookieSource(),
    status: null,
    success: null,
    message: `OpenSPG auth check request failed: ${error.message}`,
  }, null, 2)}\n`);
  process.exit(1);
}
const text = await response.text();
let json = null;
try {
  json = JSON.parse(text);
} catch {
  // keep raw text below
}

const ok = response.ok && (!json || json.success !== false);
const payload = {
  ok,
  apiBase: API_BASE,
  checkPath: CHECK_PATH,
  cookieSource: openSpgCookieSource(),
  status: response.status,
  success: json?.success ?? null,
  message: ok ? 'OpenSPG authentication is valid.' : 'OpenSPG authentication failed.',
};

process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
if (!ok) {
  process.exit(1);
}
