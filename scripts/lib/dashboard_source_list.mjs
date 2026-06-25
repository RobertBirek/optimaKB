#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { loadPromotedKnowledge, listInboxDrafts, TARGET_KBS } from './promoted_knowledge.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';
const DATA_ROOT = path.join(ROOT, 'data/dashboard');
export const SOURCE_LIST_PATH = path.join(DATA_ROOT, 'source_list.json');
export const SOURCE_CREDENTIALS_PATH = path.join(DATA_ROOT, 'source_credentials.json');

const SOURCE_TYPES = new Set(['url', 'rss', 'sitemap', 'exa_query', 'directory']);
const AUTH_MODES = new Set(['none', 'basic', 'bearer']);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value, mode = 0o640) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  try {
    fs.chmodSync(filePath, mode);
  } catch {
    // Keep going on filesystems that do not support chmod.
  }
}

function nowIso() {
  return new Date().toISOString();
}

export function normalizeUrl(value) {
  const url = new URL(String(value || '').trim());
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('URL must use http or https');
  url.hash = '';
  return url.toString();
}

function normalizeSourceInput(input = {}, existing = null) {
  const sourceType = String(input.sourceType || existing?.sourceType || 'url').trim();
  if (!SOURCE_TYPES.has(sourceType)) throw new Error(`Unsupported sourceType: ${sourceType}`);
  const kbNamespace = String(input.kbNamespace || existing?.kbNamespace || '').trim();
  if (!TARGET_KBS[kbNamespace]) throw new Error(`Unsupported kbNamespace: ${kbNamespace}`);
  const authMode = String(input.authMode || existing?.authMode || 'none').trim();
  if (!AUTH_MODES.has(authMode)) throw new Error(`Unsupported authMode: ${authMode}`);
  let target, sourceRoot, basketRoot, filePatterns;
  if (sourceType === 'directory') {
    sourceRoot = String(input.sourceRoot ?? existing?.sourceRoot ?? '').trim();
    if (!sourceRoot) throw new Error('sourceRoot is required for directory sources');
    const resolved = path.resolve(ROOT, sourceRoot);
    if (!resolved.startsWith(ROOT)) throw new Error(`sourceRoot must be within ${ROOT}`);
    if (!fs.existsSync(resolved)) throw new Error(`sourceRoot does not exist: ${sourceRoot}`);
    basketRoot = String(input.basketRoot ?? existing?.basketRoot ?? path.join(path.dirname(sourceRoot), path.basename(sourceRoot) + '_processed')).trim();
    const basketResolved = path.resolve(ROOT, basketRoot);
    if (!basketResolved.startsWith(ROOT)) throw new Error(`basketRoot must be within ${ROOT}`);
    ensureDir(basketResolved);
    filePatterns = Array.isArray(input.filePatterns ?? existing?.filePatterns)
      ? (input.filePatterns ?? (existing && existing.filePatterns) ?? []).filter((p) => p.startsWith('.'))
      : ['.md', '.pdf', '.txt'];
  } else {
    target = sourceType === 'exa_query'
      ? String(input.query ?? existing?.query ?? '').trim()
      : normalizeUrl(input.url ?? existing?.url ?? '');
    if (!target) throw new Error(sourceType === 'exa_query' ? 'query is required' : 'url is required');
  }
  return {
    sourceType,
    kbNamespace,
    kbName: TARGET_KBS[kbNamespace].kbName,
    title: String(input.title ?? existing?.title ?? '').trim().slice(0, 180),
    url: sourceType === 'exa_query' || sourceType === 'directory' ? '' : target,
    query: sourceType === 'exa_query' ? target : '',
    tags: Array.isArray(input.tags)
      ? input.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 20)
      : String(input.tags ?? existing?.tags ?? '').split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 20),
    enabled: input.enabled === undefined ? existing?.enabled !== false : Boolean(input.enabled),
    authMode,
    maxItemsPerScan: Math.max(1, Math.min(50, Number(input.maxItemsPerScan || existing?.maxItemsPerScan || 10))),
    notes: String(input.notes ?? existing?.notes ?? '').trim().slice(0, 1000),
    sourceRoot: sourceType === 'directory' ? sourceRoot : '',
    basketRoot: sourceType === 'directory' ? basketRoot : '',
    filePatterns: sourceType === 'directory' ? filePatterns.slice(0, 10) : [],
  };
}

export function loadSourceList() {
  const state = readJson(SOURCE_LIST_PATH, null);
  const sources = Array.isArray(state?.sources) ? state.sources : [];
  return {
    generatedAt: state?.generatedAt || nowIso(),
    sources: sources.map((source) => ({
      ...source,
      hasCredential: Boolean(source.credentialRef),
      credentials: undefined,
    })),
  };
}

function saveSourceList(state) {
  writeJson(SOURCE_LIST_PATH, {
    generatedAt: nowIso(),
    sources: [...(state.sources || [])].sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || ''))),
  });
}

export function loadSourceCredentials() {
  return readJson(SOURCE_CREDENTIALS_PATH, { generatedAt: nowIso(), credentials: {} });
}

function saveSourceCredentials(state) {
  writeJson(SOURCE_CREDENTIALS_PATH, {
    generatedAt: nowIso(),
    credentials: state.credentials || {},
  }, 0o600);
}

export function addOrUpdateCredential(sourceId, authMode, input = {}) {
  if (authMode === 'none') return '';
  const username = String(input.username || '').trim();
  const password = String(input.password || '');
  const token = String(input.token || '');
  const existing = loadSourceCredentials();
  const credentialRef = `source_credential_${sourceId}`;
  if (authMode === 'basic') {
    if (!username || !password) throw new Error('username and password are required for basic auth');
    existing.credentials[credentialRef] = { authMode, username, password, updatedAt: nowIso() };
  } else if (authMode === 'bearer') {
    if (!token) throw new Error('token is required for bearer auth');
    existing.credentials[credentialRef] = { authMode, token, updatedAt: nowIso() };
  }
  saveSourceCredentials(existing);
  return credentialRef;
}

export function deleteCredential(credentialRef) {
  if (!credentialRef) return;
  const existing = loadSourceCredentials();
  delete existing.credentials[credentialRef];
  saveSourceCredentials(existing);
}

export function resolveCredential(source) {
  if (!source?.credentialRef) return null;
  return loadSourceCredentials().credentials?.[source.credentialRef] || null;
}

export function createSource(input = {}) {
  const state = loadSourceList();
  const id = `source_${crypto.randomUUID().slice(0, 8)}`;
  const normalized = normalizeSourceInput(input);
  const now = nowIso();
  const credentialRef = addOrUpdateCredential(id, normalized.authMode, input);
  const source = {
    id,
    ...normalized,
    credentialRef,
    createdAt: now,
    updatedAt: now,
    lastScanAt: '',
    lastSuccessAt: '',
    lastErrorAt: '',
    lastError: '',
    lastRunId: '',
    lastDraftsCreated: 0,
    lastItemsSeen: 0,
    seen: [],
  };
  saveSourceList({ sources: [...state.sources, source] });
  return sanitizeSource(source);
}

export function updateSource(sourceId, input = {}) {
  const state = loadSourceList();
  const index = state.sources.findIndex((source) => source.id === sourceId);
  if (index === -1) throw new Error(`Source not found: ${sourceId}`);
  const existing = state.sources[index];
  const normalized = normalizeSourceInput(input, existing);
  let credentialRef = existing.credentialRef || '';
  const credentialsProvided = Boolean(input.username || input.password || input.token);
  if (normalized.authMode === 'none') {
    deleteCredential(credentialRef);
    credentialRef = '';
  } else if (credentialsProvided || !credentialRef) {
    credentialRef = addOrUpdateCredential(sourceId, normalized.authMode, input);
  }
  const next = {
    ...existing,
    ...normalized,
    credentialRef,
    updatedAt: nowIso(),
  };
  state.sources[index] = next;
  saveSourceList(state);
  return sanitizeSource(next);
}

export function deleteSource(sourceId) {
  const state = loadSourceList();
  const source = state.sources.find((item) => item.id === sourceId);
  if (!source) throw new Error(`Source not found: ${sourceId}`);
  deleteCredential(source.credentialRef);
  saveSourceList({ sources: state.sources.filter((item) => item.id !== sourceId) });
  return sanitizeSource(source);
}

export function setSourceEnabled(sourceId, enabled) {
  return updateSource(sourceId, { enabled });
}

export function sanitizeSource(source) {
  return {
    ...source,
    hasCredential: Boolean(source.credentialRef),
    credentialRef: source.credentialRef ? 'stored' : '',
    seenCount: Array.isArray(source.seen) ? source.seen.length : 0,
    seen: undefined,
  };
}

export function listSources() {
  return loadSourceList().sources.map(sanitizeSource);
}

export function getSource(sourceId) {
  const source = loadSourceList().sources.find((item) => item.id === sourceId);
  if (!source) throw new Error(`Source not found: ${sourceId}`);
  return source;
}

export function updateSourceScanState(sourceId, patch = {}) {
  const state = loadSourceList();
  const index = state.sources.findIndex((source) => source.id === sourceId);
  if (index === -1) throw new Error(`Source not found: ${sourceId}`);
  const source = state.sources[index];
  const seen = Array.isArray(patch.seen) ? patch.seen : source.seen;
  state.sources[index] = {
    ...source,
    ...patch,
    seen: Array.isArray(seen) ? seen.slice(-1000) : [],
    updatedAt: nowIso(),
  };
  saveSourceList(state);
  return state.sources[index];
}

export function contentHash(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

export function normalizedSourceKey(sourceUrl) {
  if (!sourceUrl) return '';
  try {
    return normalizeUrl(sourceUrl);
  } catch {
    return String(sourceUrl || '').trim();
  }
}

export function findExistingDraftBySourceUrl(sourceUrl) {
  const normalized = normalizedSourceKey(sourceUrl);
  if (!normalized) return null;
  const pending = listInboxDrafts().find((draft) => normalizedSourceKey(draft.sourceUrl) === normalized);
  if (pending) return { status: pending.status, draftId: pending.id, kbNamespace: pending.kbNamespace, title: pending.title };
  for (const kbNamespace of Object.keys(TARGET_KBS)) {
    const promoted = loadPromotedKnowledge(kbNamespace).find((draft) => normalizedSourceKey(draft.sourceUrl) === normalized);
    if (promoted) return { status: 'promoted', draftId: promoted.id, kbNamespace: promoted.kbNamespace, title: promoted.title };
  }
  return null;
}
