#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import process from 'process';
import { TAXBELL_REFERENCE_KBS, taxbellConfigsFor } from './lib/taxbell_reference_config.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';
const ENV_FILE = process.env.ERP_KB_DASHBOARD_ENV || '/etc/erp-kb-dashboard.env';
const EXA_SEARCH_URL = process.env.EXA_API_URL || 'https://api.exa.ai/search';
const EXA_CONTENTS_URL = process.env.EXA_CONTENTS_API_URL || 'https://api.exa.ai/contents';
const REQUEST_TIMEOUT_MS = Number(process.env.TAXBELL_EXA_REQUEST_TIMEOUT_MS || process.env.EXA_REQUEST_TIMEOUT_MS || 30000);
const RESULTS_PER_QUERY = Number(process.env.TAXBELL_EXA_RESULTS_PER_QUERY || 8);
const MAX_CONTENT_CHARS = Number(process.env.TAXBELL_EXA_MAX_CONTENT_CHARS || 24000);
const MAX_URLS_PER_KB = Number(process.env.TAXBELL_MAX_URLS_PER_KB || 80);

function usage() {
  return [
    'Usage:',
    '  node scripts/refresh_taxbell_reference_sources.mjs --kb all',
    '  node scripts/refresh_taxbell_reference_sources.mjs --kb TaxbellLegalReference',
    '',
    'Options:',
    '  --dry-run      Search and print selected URLs without writing snapshots',
  ].join('\n');
}

function valueFor(args, name, fallback = '') {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function hasArg(args, name) {
  return args.includes(name);
}

function readEnvFileValue(key) {
  try {
    const raw = fs.readFileSync(ENV_FILE, 'utf8');
    const match = raw.match(new RegExp(`(^|\\n)${key}=([^\\n]*)`));
    return match ? match[2].trim() : '';
  } catch {
    return '';
  }
}

function exaApiKey() {
  return process.env.EXA_API_KEY || readEnvFileValue('EXA_API_KEY');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function readJsonIfExists(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sourceDomain(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function domainMatches(hostname, domain) {
  const left = String(hostname || '').toLowerCase().replace(/^www\./, '');
  const right = String(domain || '').toLowerCase().replace(/^www\./, '');
  return left === right || left.endsWith(`.${right}`);
}

function sourceTier(url, config) {
  const domain = sourceDomain(url);
  if (['isap.sejm.gov.pl', 'dziennikustaw.gov.pl', 'sejm.gov.pl'].some((item) => domainMatches(domain, item))) {
    return 'official_law';
  }
  if ((config.sourceDomains || []).some((item) => domainMatches(domain, item))) return 'official_authority';
  if ((config.broadDomains || []).some((item) => domainMatches(domain, item))) return 'professional_commentary';
  return 'news_or_low';
}

function trustRank(tier) {
  return {
    official_law: 4,
    official_authority: 3,
    professional_commentary: 2,
    news_or_low: 1,
  }[tier] || 0;
}

function normalizeUrl(value) {
  const url = new URL(String(value || '').trim());
  url.hash = '';
  if ((url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443')) url.port = '';
  return url.toString();
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

async function exaPost(url, body) {
  const key = exaApiKey();
  if (!key) throw new Error(`EXA_API_KEY is required in environment or ${ENV_FILE}`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Exa returned non-JSON response: ${text.slice(0, 300)}`);
    }
    if (!response.ok) throw new Error(`Exa failed with HTTP ${response.status}: ${text.slice(0, 300)}`);
    return json;
  } finally {
    clearTimeout(timer);
  }
}

async function searchQuery(config, query, includeDomains) {
  const json = await exaPost(EXA_SEARCH_URL, {
    query,
    type: 'auto',
    numResults: RESULTS_PER_QUERY,
    userLocation: 'PL',
    includeDomains,
    contents: {
      highlights: { numSentences: 2 },
      summary: true,
      text: false,
    },
  });
  return (json.results || []).map((item) => {
    const url = normalizeUrl(item.url || item.id || '');
    const tier = sourceTier(url, config);
    return {
      title: String(item.title || url).trim(),
      url,
      domain: sourceDomain(url),
      sourceTier: tier,
      trustRank: trustRank(tier),
      query,
      snippet: normalizeWhitespace(item.summary || item.highlights?.[0] || ''),
      publishedAt: item.publishedDate || '',
      retrievedAt: new Date().toISOString(),
    };
  }).filter((item) => item.url);
}

async function fetchContents(urls) {
  if (!urls.length) return [];
  const json = await exaPost(EXA_CONTENTS_URL, {
    urls,
    text: { maxCharacters: MAX_CONTENT_CHARS },
    summary: true,
  });
  return json.results || [];
}

function snapshotName(item) {
  return `${hash(item.url).slice(0, 16)}.json`;
}

async function refreshConfig(config, dryRun = false) {
  const sourceRoot = path.join(ROOT, config.sourceRoot);
  const snapshotsDir = path.join(sourceRoot, 'snapshots');
  const metaDir = path.join(sourceRoot, 'meta');
  const registryPath = path.join(metaDir, 'source_registry.json');
  const discoveryPath = path.join(metaDir, 'discovery_report.json');
  const includeDomains = [...new Set([...(config.sourceDomains || []), ...(config.broadDomains || [])])];
  const discovered = [];
  const errors = [];

  for (const query of config.queries) {
    try {
      discovered.push(...await searchQuery(config, query, includeDomains));
    } catch (error) {
      errors.push({ query, error: error.message });
    }
  }

  const byUrl = new Map();
  for (const item of discovered) {
    const existing = byUrl.get(item.url);
    if (!existing || item.trustRank > existing.trustRank) byUrl.set(item.url, item);
  }
  const selected = [...byUrl.values()]
    .sort((a, b) => b.trustRank - a.trustRank || a.domain.localeCompare(b.domain) || a.title.localeCompare(b.title))
    .slice(0, MAX_URLS_PER_KB);

  if (dryRun) {
    return {
      namespace: config.namespace,
      dryRun: true,
      selectedCount: selected.length,
      errors,
      selected: selected.map(({ title, url, sourceTier, query }) => ({ title, url, sourceTier, query })),
    };
  }

  ensureDir(snapshotsDir);
  ensureDir(metaDir);
  const existingRegistry = readJsonIfExists(registryPath, { entries: [] });
  const registryByUrl = new Map((existingRegistry.entries || []).map((entry) => [entry.url, entry]));
  const contents = await fetchContents(selected.map((item) => item.url));
  const contentsByUrl = new Map(contents.map((item) => [normalizeUrl(item.url || item.id || ''), item]));
  const entries = [];

  for (const item of selected) {
    const contentItem = contentsByUrl.get(item.url) || {};
    const content = normalizeWhitespace(contentItem.text || contentItem.summary || item.snippet || '');
    const contentHash = hash(content);
    const localSnapshotPath = path.join(snapshotsDir, snapshotName(item));
    const relativeSnapshotPath = path.relative(ROOT, localSnapshotPath).replaceAll(path.sep, '/');
    const previous = registryByUrl.get(item.url);
    const entry = {
      ...item,
      title: String(contentItem.title || item.title || item.url).trim(),
      summary: normalizeWhitespace(contentItem.summary || item.snippet || content.slice(0, 900)),
      contentHash,
      contentLength: content.length,
      localSnapshotPath: relativeSnapshotPath,
      changed: previous ? previous.contentHash !== contentHash : true,
    };
    writeJson(localSnapshotPath, {
      ...entry,
      content,
      raw: {
        search: item,
        contents: {
          url: contentItem.url || '',
          title: contentItem.title || '',
          publishedDate: contentItem.publishedDate || '',
          author: contentItem.author || '',
        },
      },
    });
    entries.push(entry);
  }

  const registry = {
    generatedAt: new Date().toISOString(),
    namespace: config.namespace,
    kbName: config.kbName,
    sourcePolicy: 'wide_exa_ranked',
    entries,
  };
  writeJson(registryPath, registry);
  writeJson(discoveryPath, {
    generatedAt: registry.generatedAt,
    namespace: config.namespace,
    queries: config.queries,
    includeDomains,
    errors,
    discoveredCount: discovered.length,
    selectedCount: selected.length,
    tierCounts: entries.reduce((acc, item) => {
      acc[item.sourceTier] = (acc[item.sourceTier] || 0) + 1;
      return acc;
    }, {}),
  });
  return {
    namespace: config.namespace,
    selectedCount: selected.length,
    registryPath: path.relative(ROOT, registryPath).replaceAll(path.sep, '/'),
    changedCount: entries.filter((item) => item.changed).length,
  };
}

const args = process.argv.slice(2);
if (hasArg(args, '--help')) {
  process.stdout.write(`${usage()}\n`);
  process.exit(0);
}

const configs = taxbellConfigsFor(valueFor(args, '--kb', 'all'));
const dryRun = hasArg(args, '--dry-run');
const results = [];
for (const config of configs) {
  results.push(await refreshConfig(config, dryRun));
}
process.stdout.write(`${JSON.stringify({ ok: true, results, knownNamespaces: Object.keys(TAXBELL_REFERENCE_KBS) }, null, 2)}\n`);
