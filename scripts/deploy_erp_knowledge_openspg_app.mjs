#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { readOpenSpgCookie } from './lib/openspg_auth.mjs';
import { OPENSPG_API_BASE } from './lib/config.mjs';

const ROOT = '/docker/openspg';
const API_BASE = OPENSPG_API_BASE;
const COOKIE = readOpenSpgCookie();
const BUNDLE_PATH =
  process.env.ERP_KNOWLEDGE_APP_BUNDLE ||
  path.join(ROOT, 'docs/reference/ERP_Knowledge_Assistant_OpenSPG_App_Bundle.json');
const DRY_RUN = process.argv.includes('--dry-run');

if (!COOKIE) throw new Error('OPENSPG_COOKIE or OPENSPG_COOKIE_FILE is required');

const bundle = JSON.parse(fs.readFileSync(BUNDLE_PATH, 'utf8'));
const DEFAULT_APP_ID = Number(process.env.OPENSPG_APP_ID || bundle.openSpgAppId || 2);

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Non-JSON response: ${text.slice(0, 400)}`);
  }
}

async function api(method, url, body) {
  const response = await fetch(url, {
    method,
    headers: {
      Cookie: COOKIE,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const json = parseJson(text);
  if (!response.ok || json.success === false) {
    throw new Error(`${method} ${url} failed: ${text.slice(0, 800)}`);
  }
  return json;
}

async function getApp(appId) {
  try {
    const json = await api('GET', `${API_BASE}/v1/app/${encodeURIComponent(appId)}`);
    return json.result || null;
  } catch (error) {
    if (String(error.message).includes('"success":false')) {
      return null;
    }
    throw error;
  }
}

async function createApp() {
  const body = {
    name: bundle.appName,
    description: bundle.appDescription,
    logo: bundle.appLogo,
    alias: bundle.appAlias,
  };
  if (DRY_RUN) {
    return { id: DEFAULT_APP_ID, created: false, createBody: body };
  }
  const json = await api('POST', `${API_BASE}/v1/app`, body);
  return { id: json.result, created: true, createBody: body };
}

function buildKbConfig() {
  return bundle.kbProjects.map((kb) => ({
    id: kb.projectId,
    name: kb.displayName || kb.name,
    enable: true,
  }));
}

function buildUpdatePayload(existing) {
  const currentConfig = existing?.config || {};
  const currentChat = currentConfig.chat || {};
  const currentLlm = currentConfig.llm || {};

  return {
    name: existing?.name || bundle.appName,
    description: existing?.description || bundle.appDescription,
    logo: existing?.logo || bundle.appLogo,
    alias: existing?.alias || bundle.appAlias,
    config: {
      llm: currentLlm,
      language: currentConfig.language || 'zh',
      kb: buildKbConfig(),
      chat: currentChat.ename
        ? currentChat
        : {
            ename: bundle.template || 'think_pipeline',
            ...currentChat,
          },
    },
  };
}

async function deployApp(appId) {
  if (DRY_RUN) {
    return { deployed: false, dryRun: true };
  }
  const json = await api('POST', `${API_BASE}/v1/app/deploy`, { id: appId });
  return { deployed: !!json.result, dryRun: false };
}

let app = await getApp(DEFAULT_APP_ID);
let createResult = null;

if (!app) {
  createResult = await createApp();
  if (!DRY_RUN) {
    app = await getApp(createResult.id);
  } else {
    app = { id: createResult.id };
  }
}

const appId = app?.id || createResult?.id || DEFAULT_APP_ID;
const updatePayload = buildUpdatePayload(app);

if (!DRY_RUN) {
  await api('PUT', `${API_BASE}/v1/app/${encodeURIComponent(appId)}`, updatePayload);
  await deployApp(appId);
}

const finalApp = DRY_RUN ? null : await getApp(appId);
const result = {
  success: true,
  appId,
  appAlias: bundle.appAlias,
  apiBase: API_BASE,
  dryRun: DRY_RUN,
  created: !!createResult?.created,
  bundlePath: BUNDLE_PATH,
  attachedKbProjectIds: bundle.kbProjects.map((kb) => kb.projectId),
  kbCount: finalApp?.config?.kb?.length || updatePayload.config.kb.length,
  templateEname: finalApp?.config?.chat?.ename || updatePayload.config.chat.ename || '',
  language: finalApp?.config?.language || updatePayload.config.language || '',
  promptInjected: false,
  note:
    'This OpenSPG build has no verified custom app-prompt field in app config. Deployment preserves template-backed chat config and attaches the ERP KB set.',
};

console.log(JSON.stringify(result, null, 2));
