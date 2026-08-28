#!/usr/bin/env node

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import process from 'node:process';

import { OPENSPG_API_BASE } from './lib/config.mjs';
import { readOpenSpgCookie } from './lib/openspg_auth.mjs';

const OPENAI_BASE_URL = 'https://api.openai.com/v1';

export function buildModelRequest({ apiKey, model, displayName }) {
  return {
    provider: 'OpenAI',
    visibility: 'PUBLIC_READ',
    name: displayName,
    config: [{
      api_key: apiKey,
      modelId: model,
      base_url: OPENAI_BASE_URL,
      model,
      modelType: 'chat',
      type: 'maas',
      customize: {},
    }],
  };
}

export function buildLlmConfig({ apiKey, model, modelId }) {
  return {
    visibility: 'PRIVATE',
    modelId,
    provider: 'OpenAI',
    api_key: apiKey,
    base_url: OPENAI_BASE_URL,
    name: model,
    logo: '/img/logo/openai.png',
    model,
    modelType: 'chat',
    type: 'maas',
    customize: {},
  };
}

export function buildAppUpdatePayload(app, llm) {
  return {
    id: Number(app.id),
    name: app.name,
    description: app.description,
    logo: app.logo,
    alias: app.alias,
    config: {
      ...app.config,
      llm: { ...llm },
    },
  };
}

function redact(value) {
  return String(value || '')
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, '[REDACTED]')
    .replace(/("?api[_-]?key"?\s*[:=]\s*)[^,}\s]+/gi, '$1[REDACTED]')
    .replace(/("?accessToken"?\s*[:=]\s*)[^,}\s]+/gi, '$1[REDACTED]');
}

function readOption(args, name, fallback = '') {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value`);
  return value;
}

export function parseOptions(args) {
  const model = readOption(args, '--model');
  const displayName = readOption(args, '--display-name');
  const appIdTokens = readOption(args, '--app-ids', '2,4').split(',');
  const appIds = appIdTokens.map((value) => Number(value.trim()));
  if (!model) throw new Error('--model is required');
  if (!displayName) throw new Error('--display-name is required');
  if (
    appIds.length === 0
    || appIdTokens.some((value) => !/^\d+$/.test(value.trim()))
    || appIds.some((value) => !Number.isInteger(value) || value <= 0)
    || new Set(appIds).size !== appIds.length
  ) {
    throw new Error('--app-ids must contain positive, unique integers');
  }
  return { model, displayName, appIds, apply: args.includes('--apply') };
}

export function validateModelMatch(match, { apiKey, model }) {
  const valid = match?.group?.provider === 'OpenAI'
    && match?.group?.visibility === 'PUBLIC_READ'
    && match?.entry?.api_key === apiKey
    && match?.entry?.model === model
    && match?.entry?.base_url === OPENAI_BASE_URL
    && match?.entry?.modelType === 'chat'
    && match?.entry?.type === 'maas'
    && Boolean(match?.entry?.modelId);
  if (!valid) {
    throw new Error(`${model} does not match the required OpenAI chat configuration`);
  }
  return match;
}

export function assertMutationResult(result, operation) {
  if (result !== true) throw new Error(`${operation} returned ${JSON.stringify(result)}`);
  return true;
}

export function snapshotApp(app) {
  return buildAppUpdatePayload(app, app.config.llm);
}

export function assertAppAssignment(app, modelId) {
  if (app?.config?.llm?.modelId !== modelId) {
    throw new Error(`app ${app?.id} does not use ${modelId}`);
  }
  return app;
}

export function buildModelDeleteEndpoint(match) {
  const provider = encodeURIComponent(match.group.provider);
  const name = encodeURIComponent(match.group.name);
  const modelId = encodeURIComponent(match.entry.modelId);
  return `/v1/model/${provider}/${name}/?modelId=${modelId}`;
}

function withTimeout(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function requestJson(url, options, timeoutMs = 120000) {
  const timeout = withTimeout(timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: timeout.signal });
    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(`HTTP ${response.status} returned non-JSON: ${redact(text).slice(0, 300)}`);
    }
    if (!response.ok || body?.success === false) {
      throw new Error(`HTTP ${response.status}: ${redact(text).slice(0, 500)}`);
    }
    return { response, body };
  } finally {
    timeout.clear();
  }
}

async function testOpenAiModel(apiKey, model) {
  const startedAt = Date.now();
  const { response, body } = await requestJson(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Reply with OK only.' }],
      max_completion_tokens: 16,
    }),
  }, 60000);
  if (!Array.isArray(body.choices) || body.choices.length === 0) {
    throw new Error('OpenAI chat response contained no choices');
  }
  return { status: response.status, latencyMs: Date.now() - startedAt };
}

function createOpenSpgApi(cookie) {
  return async (method, endpoint, body) => {
    const result = await requestJson(`${OPENSPG_API_BASE}${endpoint}`, {
      method,
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return result.body.result;
  };
}

function findModelEntries(modelGroups, model) {
  return modelGroups.flatMap((group) => (group.model || [])
    .filter((entry) => entry.model === model)
    .map((entry) => ({ group, entry })));
}

async function restoreApps(api, snapshots) {
  const errors = [];
  for (const app of snapshots) {
    try {
      assertMutationResult(
        await api('PUT', `/v1/app/${app.id}`, app),
        `restore app ${app.id}`,
      );
      assertMutationResult(
        await api('POST', '/v1/app/deploy', { id: Number(app.id) }),
        `deploy restored app ${app.id}`,
      );
      assertAppAssignment(await api('GET', `/v1/app/${app.id}`), app.config.llm.modelId);
    } catch (error) {
      errors.push(`app ${app.id}: ${redact(error.message)}`);
    }
  }
  if (errors.length) throw new Error(`Application rollback failed: ${errors.join('; ')}`);
}

async function cleanupCreatedModel(api, model) {
  const matches = findModelEntries(await api('GET', '/v1/model/list/'), model);
  if (matches.length !== 1) {
    throw new Error(`Cannot safely clean up ${model}: found ${matches.length} records`);
  }
  assertMutationResult(
    await api('DELETE', buildModelDeleteEndpoint(matches[0])),
    `delete failed model ${model}`,
  );
  const remaining = findModelEntries(await api('GET', '/v1/model/list/'), model);
  if (remaining.length !== 0) throw new Error(`${model} cleanup verification failed`);
}

export async function rotate(options, dependencies = {}) {
  const keyFile = String(process.env.OPENAI_API_KEY_FILE || '/etc/openspg-openai.key');
  const apiKey = dependencies.apiKey ?? fs.readFileSync(keyFile, 'utf8').trim();
  if (!apiKey) throw new Error(`OPENAI_API_KEY_FILE ${keyFile} is empty`);

  const testModel = dependencies.testModel || testOpenAiModel;
  const directTest = await testModel(apiKey, options.model);
  if (!options.apply) {
    return { applied: false, model: options.model, directTest, appIds: options.appIds };
  }

  const api = dependencies.api || createOpenSpgApi(readOpenSpgCookie({ required: true }));
  let createdModel = false;
  const snapshots = [];
  let mutationStarted = false;

  try {
    let modelGroups = await api('GET', '/v1/model/list/');
    let matches = findModelEntries(modelGroups, options.model);
    if (matches.length === 0) {
      await api('POST', '/v1/model', buildModelRequest({
        apiKey,
        model: options.model,
        displayName: options.displayName,
      }));
      createdModel = true;
      modelGroups = await api('GET', '/v1/model/list/');
      matches = findModelEntries(modelGroups, options.model);
    }
    if (matches.length !== 1 || !matches[0].entry.modelId) {
      throw new Error(`Expected one ${options.model} record with modelId, found ${matches.length}`);
    }

    const targetMatch = validateModelMatch(matches[0], { apiKey, model: options.model });
    const target = targetMatch.entry;
    const llm = buildLlmConfig({ apiKey, model: options.model, modelId: target.modelId });
    for (const appId of options.appIds) {
      snapshots.push(snapshotApp(await api('GET', `/v1/app/${appId}`)));
    }

    mutationStarted = true;
    for (const app of snapshots) {
      assertMutationResult(
        await api('PUT', `/v1/app/${app.id}`, buildAppUpdatePayload(app, llm)),
        `update app ${app.id}`,
      );
      assertMutationResult(
        await api('POST', '/v1/app/deploy', { id: Number(app.id) }),
        `deploy app ${app.id}`,
      );
    }
    for (const app of snapshots) {
      assertAppAssignment(await api('GET', `/v1/app/${app.id}`), target.modelId);
    }

    return {
      applied: true,
      model: options.model,
      modelId: target.modelId,
      directTest,
      appIds: options.appIds,
    };
  } catch (error) {
    if (mutationStarted) {
      try {
        await restoreApps(api, snapshots);
      } catch (rollbackError) {
        throw new Error(
          `Rotation failed and app rollback failed: ${redact(error.message)}; ${redact(rollbackError.message)}`,
        );
      }
    }
    if (createdModel) {
      try {
        await cleanupCreatedModel(api, options.model);
      } catch (cleanupError) {
        throw new Error(
          `Rotation failed and model cleanup failed: ${redact(error.message)}; ${redact(cleanupError.message)}`,
        );
      }
    }
    const rollbackState = mutationStarted ? 'app rollback completed' : 'no app mutation occurred';
    throw new Error(`Rotation failed; ${rollbackState}: ${redact(error.message)}`);
  }
}

async function main() {
  try {
    const result = await rotate(parseOptions(process.argv.slice(2)));
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(redact(error.message));
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
