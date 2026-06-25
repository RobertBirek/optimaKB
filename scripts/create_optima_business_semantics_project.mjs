#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { readOpenSpgCookie } from './lib/openspg_auth.mjs';
import { OPENSPG_API_BASE } from './lib/config.mjs';

const ROOT = '/docker/openspg';
const API_BASE = OPENSPG_API_BASE;
const COOKIE = readOpenSpgCookie();
const PROJECT_NAME = process.env.OPENSPG_PROJECT_NAME || 'Comarch Optima Business Semantics';
const NAMESPACE = process.env.OPENSPG_NAMESPACE || 'ComarchOptimaBusinessSemantics';
const DESCRIPTION =
  process.env.OPENSPG_PROJECT_DESCRIPTION ||
  'Business semantics for Optima tables: code-to-label mappings, business descriptions, validation rules, domain classification.';
const VISIBILITY = process.env.OPENSPG_VISIBILITY || 'PRIVATE';
const TAG = process.env.OPENSPG_TAG || 'LOCAL';
const VECTOR_MODEL_ID =
  process.env.OPENSPG_VECTOR_MODEL_ID ||
  'b87d551d4ba14909907c6e29218fa011@text-embedding-3-small';
const SCHEMA_FILE =
  process.env.OPENSPG_SCHEMA_FILE ||
  path.join(ROOT, 'docs/reference/ComarchOptimaBusinessSemantics.schema');

if (!COOKIE) throw new Error('OPENSPG_COOKIE or OPENSPG_COOKIE_FILE is required');
if (!fs.existsSync(SCHEMA_FILE)) throw new Error(`Schema file not found: ${SCHEMA_FILE}`);

async function api(pathname, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Cookie', COOKIE);
  const response = await fetch(`${API_BASE}${pathname}`, { ...options, headers });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response from ${pathname}: ${text.slice(0, 400)}`);
  }
  if (!response.ok) {
    throw new Error(`${pathname} failed with HTTP ${response.status}: ${text.slice(0, 400)}`);
  }
  return json;
}

async function listProjects() {
  const params = new URLSearchParams({
    isOwner: 'false',
    keyword: '',
    pageNo: '1',
    pageSize: '200',
    appId: '0',
  });
  const json = await api(`/v1/projects/list?${params.toString()}`);
  if (!json.success || !Array.isArray(json.result?.data)) {
    throw new Error(`Unable to list projects: ${JSON.stringify(json).slice(0, 400)}`);
  }
  return json.result.data;
}

async function createProject() {
  const payload = {
    name: PROJECT_NAME,
    namespace: NAMESPACE,
    description: DESCRIPTION,
    visibility: VISIBILITY,
    tag: TAG,
    config: {
      vectorizer: {
        modelId: VECTOR_MODEL_ID,
      },
    },
  };
  const json = await api('/v1/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!json.success || (!json.result && json.result !== 0)) {
    throw new Error(`Project create failed: ${JSON.stringify(json).slice(0, 400)}`);
  }
  return {
    id: Number(json.result),
    name: PROJECT_NAME,
    namespace: NAMESPACE,
  };
}

async function pushSchema(projectId) {
  const schemaText = fs.readFileSync(SCHEMA_FILE, 'utf8');
  const json = await api(`/v1/schemas?projectId=${encodeURIComponent(projectId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: schemaText }),
  });
  if (!json.success) {
    throw new Error(`Schema push failed: ${JSON.stringify(json).slice(0, 400)}`);
  }
  return true;
}

const existingProjects = await listProjects();
let project = existingProjects.find((entry) => entry.namespace === NAMESPACE);
let created = false;

if (!project) {
  project = await createProject();
  created = true;
}

await pushSchema(project.id);

process.stdout.write(
  `${JSON.stringify(
    {
      ok: true,
      created,
      projectId: project.id,
      name: project.name,
      namespace: project.namespace,
      schemaFile: SCHEMA_FILE,
      apiBase: API_BASE,
    },
    null,
    2,
  )}\n`,
);
