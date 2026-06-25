#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { OPENSPG_API_BASE } from './lib/config.mjs';

const API_BASE = OPENSPG_API_BASE;
const LOGIN_PATH = process.env.OPENSPG_LOGIN_PATH || '/v1/accounts/login';
const COOKIE_OUT = process.env.OPENSPG_COOKIE_OUT || process.env.OPENSPG_COOKIE_FILE || '/etc/erp-kb-openspg.cookie';
const LOGIN_FILE = process.env.OPENSPG_LOGIN_FILE || '/etc/erp-kb-openspg-login.env';
const VALIDATE_PROJECT_ID = process.env.OPENSPG_PROJECT_ID || '4';
const VALIDATE_PATH = process.env.OPENSPG_AUTH_CHECK_PATH || `/v1/schemas/graph/${encodeURIComponent(VALIDATE_PROJECT_ID)}`;

function parseEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return {};
  const values = {};
  const text = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function getLoginConfig() {
  const fileValues = parseEnvFile(LOGIN_FILE);
  const account = process.env.OPENSPG_LOGIN_ACCOUNT || fileValues.OPENSPG_LOGIN_ACCOUNT || '';
  const password = process.env.OPENSPG_LOGIN_PASSWORD || fileValues.OPENSPG_LOGIN_PASSWORD || '';
  if (!account || !password) {
    throw new Error(
      `OPENSPG_LOGIN_ACCOUNT and OPENSPG_LOGIN_PASSWORD are required, either in environment or ${LOGIN_FILE}`,
    );
  }
  return { account, password };
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(`${password}OPENSPG`).digest('hex');
}

function splitSetCookie(headerValue) {
  if (!headerValue) return [];
  return headerValue
    .split(/,\s*(?=[A-Za-z0-9_.-]+=)/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function responseCookies(headers) {
  if (typeof headers.getSetCookie === 'function') {
    const values = headers.getSetCookie();
    if (values.length) return values;
  }
  return splitSetCookie(headers.get('set-cookie'));
}

function cookieHeaderFromSetCookies(setCookies) {
  return setCookies
    .map((cookie) => cookie.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
}

function writeCookieFile(cookieHeader) {
  const dir = path.dirname(COOKIE_OUT);
  fs.mkdirSync(dir, { recursive: true });
  const tempPath = `${COOKIE_OUT}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, `${cookieHeader}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tempPath, COOKIE_OUT);
  fs.chmodSync(COOKIE_OUT, 0o600);
}

async function validateCookie(cookieHeader) {
  const response = await fetch(`${API_BASE}${VALIDATE_PATH}`, {
    headers: { Cookie: cookieHeader },
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // Keep non-JSON responses as failed validation below.
  }
  return {
    ok: response.ok && (!json || json.success !== false),
    status: response.status,
    success: json?.success ?? null,
  };
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

try {
  const { account, password } = getLoginConfig();
  const response = await fetch(`${API_BASE}${LOGIN_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      account,
      password: hashPassword(password),
    }),
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // handled below
  }

  const setCookies = responseCookies(response.headers);
  const cookieHeader = cookieHeaderFromSetCookies(setCookies);

  if (!response.ok || !json?.success || !cookieHeader) {
    printJson({
      ok: false,
      apiBase: API_BASE,
      loginPath: LOGIN_PATH,
      cookieOut: COOKIE_OUT,
      status: response.status,
      success: json?.success ?? null,
      hasSetCookie: Boolean(cookieHeader),
      message: 'OpenSPG login failed or did not return a session cookie.',
    });
    process.exit(1);
  }

  writeCookieFile(cookieHeader);
  const validation = await validateCookie(cookieHeader);
  printJson({
    ok: validation.ok,
    apiBase: API_BASE,
    loginPath: LOGIN_PATH,
    cookieOut: COOKIE_OUT,
    status: response.status,
    success: json.success,
    cookieNames: cookieHeader
      .split(';')
      .map((part) => part.trim().split('=')[0])
      .filter(Boolean),
    validation,
    message: validation.ok
      ? 'OpenSPG login succeeded and cookie validation passed.'
      : 'OpenSPG login succeeded, but cookie validation failed.',
  });
  if (!validation.ok) process.exit(1);
} catch (error) {
  printJson({
    ok: false,
    apiBase: API_BASE,
    loginPath: LOGIN_PATH,
    cookieOut: COOKIE_OUT,
    message: error.message,
  });
  process.exit(1);
}
