#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import process from 'process';

const ROOT = process.env.ROOT || '/docker/openspg';
const AUTOMATION_ROOT = path.join(ROOT, 'data/dashboard/automation');
export const PROVIDER_SECRETS_PATH = path.join(AUTOMATION_ROOT, 'provider_secrets.json');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJsonAtomic(filePath, value, mode = 0o600) {
  ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.${process.pid}.${crypto.randomUUID().slice(0, 8)}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode });
  fs.renameSync(tempPath, filePath);
  try {
    fs.chmodSync(filePath, mode);
  } catch {
    // Some mounted filesystems do not support chmod.
  }
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function normalizeSecret(value) {
  return String(value || '').trim();
}

function previewSecret(value) {
  const secret = normalizeSecret(value);
  if (!secret) return '';
  if (secret.length <= 8) return `${secret.slice(0, 2)}***`;
  return `${secret.slice(0, 4)}***${secret.slice(-3)}`;
}

export function loadProviderSecrets() {
  const stored = readJson(PROVIDER_SECRETS_PATH, {}) || {};
  return {
    tavilyApiKey: normalizeSecret(process.env.TAVILY_API_KEY || stored.tavilyApiKey),
    firecrawlApiKey: normalizeSecret(process.env.FIRECRAWL_API_KEY || stored.firecrawlApiKey),
    exaApiKey: normalizeSecret(process.env.EXA_API_KEY || stored.exaApiKey),
    updatedAt: stored.updatedAt || '',
    updatedBy: stored.updatedBy || '',
  };
}

export function saveProviderSecrets(patch = {}, operator = '') {
  const current = readJson(PROVIDER_SECRETS_PATH, {}) || {};
  const next = {
    ...current,
    ...(patch.tavilyApiKey !== undefined ? { tavilyApiKey: normalizeSecret(patch.tavilyApiKey) } : {}),
    ...(patch.firecrawlApiKey !== undefined ? { firecrawlApiKey: normalizeSecret(patch.firecrawlApiKey) } : {}),
    ...(patch.exaApiKey !== undefined ? { exaApiKey: normalizeSecret(patch.exaApiKey) } : {}),
    updatedAt: new Date().toISOString(),
    updatedBy: String(operator || 'dashboard').trim(),
  };
  writeJsonAtomic(PROVIDER_SECRETS_PATH, next);
  return loadProviderSecrets();
}

export function maskProviderSecrets(secrets = loadProviderSecrets()) {
  return {
    tavilyApiKey: {
      configured: Boolean(secrets.tavilyApiKey),
      preview: previewSecret(secrets.tavilyApiKey),
    },
    firecrawlApiKey: {
      configured: Boolean(secrets.firecrawlApiKey),
      preview: previewSecret(secrets.firecrawlApiKey),
    },
    exaApiKey: {
      configured: Boolean(secrets.exaApiKey),
      preview: previewSecret(secrets.exaApiKey),
    },
    updatedAt: secrets.updatedAt || '',
    updatedBy: secrets.updatedBy || '',
  };
}
