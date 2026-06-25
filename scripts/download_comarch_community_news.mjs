#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT = '/docker/openspg';
const SOURCE_ROOT = path.join(ROOT, 'downloads/community_news');
const API_DIR = path.join(SOURCE_ROOT, 'api');
const DETAILS_DIR = path.join(API_DIR, 'posts');
const META_DIR = path.join(SOURCE_ROOT, 'meta');
const POSTS_INDEX_PATH = path.join(API_DIR, 'posts_index.json');
const CATEGORIES_PATH = path.join(API_DIR, 'categories.json');
const SOURCE_REGISTRY_PATH = path.join(META_DIR, 'source_registry.json');

const API_BASE = process.env.COMMUNITY_NEWS_API_BASE || 'https://api.spolecznosc.comarch.pl/posts';
const CATEGORY_API_URL = process.env.COMMUNITY_NEWS_CATEGORIES_API_URL || 'https://api.spolecznosc.comarch.pl/categories';
const SITE_BASE = process.env.COMMUNITY_NEWS_SITE_BASE || 'https://spolecznosc.comarch.pl';
const PAGE_LIMIT = Number(process.env.COMMUNITY_NEWS_LIMIT || '100');
const MAX_POSTS = Number(process.env.COMMUNITY_NEWS_MAX_POSTS || '200');
const FETCH_DETAILS = String(process.env.COMMUNITY_NEWS_FETCH_DETAILS || '1') !== '0';
const FORCE = String(process.env.COMMUNITY_NEWS_FORCE || '0') === '1';

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function fileSha256(filePath) {
  return sha256(fs.readFileSync(filePath));
}

function slug(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\s.-]/g, '')
    .trim()
    .replace(/[\s./\\-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function readJsonIfExists(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function requestUrl(offset = 0, limit = 50) {
  const url = new URL(API_BASE);
  url.searchParams.set('filter[type]', '{"eq":4}');
  url.searchParams.set('filter[status]', '{"eq":1}');
  url.searchParams.set('sort[datePublished]', 'DESC');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  return url.toString();
}

function extractRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result?.data)) return payload.result.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function pickTitle(row) {
  return row.title || row.name || row.subject || row.headline || `news-${row.id || 'item'}`;
}

function pickSlug(row) {
  return (
    row.slug ||
    row.urlSlug ||
    row.seoSlug ||
    row.pathSlug ||
    slug(pickTitle(row))
  );
}

function guessArticlePath(row) {
  const direct = row.url || row.link || row.href || row.publicUrl || '';
  if (direct) {
    try {
      return new URL(direct, SITE_BASE).toString();
    } catch {
      return '';
    }
  }
  const rowSlug = pickSlug(row);
  if (rowSlug) return `${SITE_BASE}/news/${rowSlug}`;
  return '';
}

function sanitizeRow(row) {
  return {
    ...row,
    title: pickTitle(row),
    slug: pickSlug(row),
    guessedArticleUrl: guessArticlePath(row),
  };
}

function sourceRegistryEntry(registry, key) {
  return registry.entries.find((entry) => entry.key === key) || null;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'erp-kb-community-news-downloader/1.0',
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed ${response.status} for ${url}: ${body.slice(0, 300)}`);
  }
  const payload = await response.json();
  const total = Number(response.headers.get('X-Total') || response.headers.get('x-total') || '0');
  return { payload, total };
}

function detailUrl(row) {
  return new URL(`${String(row.id || '').trim()}`, `${API_BASE.replace(/\/+$/, '')}/`).toString();
}

async function loadNewsIndex() {
  const rows = [];
  let offset = 0;
  let total = 0;
  const pageSize = Math.min(Math.max(PAGE_LIMIT, 1), 200);
  for (;;) {
    const url = requestUrl(offset, pageSize);
    const { payload, total: headerTotal } = await fetchJson(url);
    const batch = extractRows(payload).map(sanitizeRow);
    rows.push(...batch);
    total = headerTotal || total || rows.length;
    if (!batch.length) break;
    offset += batch.length;
    if (MAX_POSTS > 0 && rows.length >= MAX_POSTS) break;
    if (headerTotal && rows.length >= headerTotal) break;
    if (batch.length < pageSize) break;
  }
  return {
    generatedAt: new Date().toISOString(),
    apiBase: API_BASE,
    siteBase: SITE_BASE,
    total,
    rowCount: MAX_POSTS > 0 ? Math.min(rows.length, MAX_POSTS) : rows.length,
    rows: MAX_POSTS > 0 ? rows.slice(0, MAX_POSTS) : rows,
  };
}

async function loadCategories() {
  const { payload, total } = await fetchJson(CATEGORY_API_URL);
  const rows = extractRows(payload);
  return {
    generatedAt: new Date().toISOString(),
    apiUrl: CATEGORY_API_URL,
    total: total || rows.length,
    rowCount: rows.length,
    rows,
  };
}

async function downloadDetails(indexPayload) {
  const registry = readJsonIfExists(SOURCE_REGISTRY_PATH, { generatedAt: '', entries: [] });
  const detailResults = [];
  for (const row of indexPayload.rows) {
    if (!row.id) continue;
    const filePath = path.join(DETAILS_DIR, `${String(row.id)}.json`);
    const key = detailUrl(row);
    const existing = sourceRegistryEntry(registry, key);
    if (!FORCE && fs.existsSync(filePath) && existing?.status === 'DETAIL_OK') {
      if (!existing.contentHash) {
        existing.contentHash = fileSha256(filePath);
        existing.hashAlgorithm = 'sha256';
      }
      detailResults.push({ url: key, filePath, status: 'DETAIL_OK', cached: true });
      continue;
    }
    try {
      const { payload } = await fetchJson(key);
      ensureDir(path.dirname(filePath));
      fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
      detailResults.push({ url: key, filePath, status: 'DETAIL_OK', cached: false });
      registry.entries = registry.entries.filter((entry) => entry.key !== key);
      registry.entries.push({
        key,
        status: 'DETAIL_OK',
        filePath: path.relative(ROOT, filePath).replaceAll(path.sep, '/'),
        sourceType: 'community_news_detail',
        contentHash: fileSha256(filePath),
        hashAlgorithm: 'sha256',
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      detailResults.push({ url: key, filePath, status: 'DETAIL_ERROR', error: error.message });
      registry.entries = registry.entries.filter((entry) => entry.key !== key);
      registry.entries.push({
        key,
        status: 'DETAIL_ERROR',
        filePath: path.relative(ROOT, filePath).replaceAll(path.sep, '/'),
        sourceType: 'community_news_detail',
        updatedAt: new Date().toISOString(),
        error: error.message,
      });
    }
  }
  registry.generatedAt = new Date().toISOString();
  registry.entries.sort((a, b) => a.key.localeCompare(b.key));
  writeJson(SOURCE_REGISTRY_PATH, registry);
  return detailResults;
}

async function main() {
  ensureDir(API_DIR);
  ensureDir(DETAILS_DIR);
  ensureDir(META_DIR);

  const indexPayload = await loadNewsIndex();
  writeJson(POSTS_INDEX_PATH, indexPayload);
  const categoriesPayload = await loadCategories();
  writeJson(CATEGORIES_PATH, categoriesPayload);

  let detailResults = [];
  if (FETCH_DETAILS) {
    detailResults = await downloadDetails(indexPayload);
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        generatedAt: indexPayload.generatedAt,
        rowCount: indexPayload.rowCount,
        detailFetchEnabled: FETCH_DETAILS,
        detailsOk: detailResults.filter((row) => row.status === 'DETAIL_OK').length,
        detailsError: detailResults.filter((row) => row.status === 'DETAIL_ERROR').length,
        postsIndexPath: path.relative(ROOT, POSTS_INDEX_PATH).replaceAll(path.sep, '/'),
        categoriesPath: path.relative(ROOT, CATEGORIES_PATH).replaceAll(path.sep, '/'),
        sourceRegistryPath: path.relative(ROOT, SOURCE_REGISTRY_PATH).replaceAll(path.sep, '/'),
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
