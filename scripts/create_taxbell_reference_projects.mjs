#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { readOpenSpgCookie } from './lib/openspg_auth.mjs';
import { taxbellConfigsFor } from './lib/taxbell_reference_config.mjs';
import { OPENSPG_API_BASE } from './lib/config.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';
const API_BASE = OPENSPG_API_BASE;
const COOKIE = readOpenSpgCookie();
const VECTOR_MODEL_ID = process.env.OPENSPG_VECTOR_MODEL_ID || 'b87d551d4ba14909907c6e29218fa011@text-embedding-3-small';
const PROJECT_MAP_PATH = path.join(ROOT, 'docs/reference/Taxbell_KB_Project_Map.json');

if (!COOKIE) throw new Error('OPENSPG_COOKIE or OPENSPG_COOKIE_FILE is required');

function valueFor(args, name, fallback = '') {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function readJsonIfExists(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

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
  if (!response.ok) throw new Error(`${pathname} failed with HTTP ${response.status}: ${text.slice(0, 400)}`);
  return json;
}

async function listProjects() {
  const params = new URLSearchParams({ isOwner: 'false', keyword: '', pageNo: '1', pageSize: '200', appId: '0' });
  const json = await api(`/v1/projects/list?${params.toString()}`);
  if (!json.success || !Array.isArray(json.result?.data)) throw new Error(`Unable to list projects: ${JSON.stringify(json).slice(0, 400)}`);
  return json.result.data;
}

async function createProject(config) {
  const json = await api('/v1/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: config.projectName,
      namespace: config.namespace,
      description: config.projectDescription,
      visibility: 'PRIVATE',
      tag: 'TAXBELL',
      config: { vectorizer: { modelId: VECTOR_MODEL_ID } },
    }),
  });
  if (!json.success || (!json.result && json.result !== 0)) throw new Error(`Project create failed: ${JSON.stringify(json).slice(0, 400)}`);
  return { id: Number(json.result), name: config.projectName, namespace: config.namespace };
}

async function pushSchema(projectId, config) {
  const schemaPath = path.join(ROOT, config.schemaFile);
  const schemaText = fs.readFileSync(schemaPath, 'utf8');
  const json = await api(`/v1/schemas?projectId=${encodeURIComponent(projectId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: schemaText }),
  });
  if (!json.success) throw new Error(`Schema push failed for ${config.namespace}: ${JSON.stringify(json).slice(0, 400)}`);
}

const configs = taxbellConfigsFor(valueFor(process.argv.slice(2), '--kb', 'all'));
const existingProjects = await listProjects();
const projectMap = readJsonIfExists(PROJECT_MAP_PATH, { generatedAt: '', entries: [] });
const entries = projectMap.entries || [];
const results = [];

for (const config of configs) {
  let project = existingProjects.find((item) => item.namespace === config.namespace);
  let created = false;
  if (!project) {
    project = await createProject(config);
    created = true;
  }
  await pushSchema(project.id, config);
  const entry = {
    namespace: config.namespace,
    kbName: config.kbName,
    projectId: Number(project.id),
    projectName: config.projectName,
    schemaFile: config.schemaFile,
    exportDir: config.exportDir,
    buildManifest: config.buildManifest,
    updatedAt: new Date().toISOString(),
  };
  const index = entries.findIndex((item) => item.namespace === config.namespace);
  if (index >= 0) entries[index] = entry;
  else entries.push(entry);
  results.push({ ...entry, created });
}

writeJson(PROJECT_MAP_PATH, {
  generatedAt: new Date().toISOString(),
  entries: entries.sort((a, b) => a.namespace.localeCompare(b.namespace)),
});

process.stdout.write(`${JSON.stringify({ ok: true, results, projectMapPath: path.relative(ROOT, PROJECT_MAP_PATH) }, null, 2)}\n`);
