#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { submitKnowledgeDraft } from './knowledge_inbox.mjs';
import { TARGET_KBS, loadPromotedKnowledge, listInboxDrafts } from './promoted_knowledge.mjs';
import {
  buildExternalCitationLine,
  classifySourceTier,
  dedupeExternalResults,
  normalizeUrl,
  preferredDomainsForKb,
  sortExternalResults,
  trustRankForTier,
} from './external_search_policy.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';
const LOG_DIR = path.join(ROOT, 'logs');
const FALLBACK_LOG = path.join(LOG_DIR, 'external_search_fallback.jsonl');
const DISCOVERY_LOG = path.join(LOG_DIR, 'external_search_discovery.jsonl');

const EXA_PROVIDER = process.env.EXA_PROVIDER || 'auto';
const EXA_API_KEY = process.env.EXA_API_KEY || '';
const EXA_API_URL = process.env.EXA_API_URL || 'https://api.exa.ai/search';
const EXA_USER_LOCATION = process.env.EXA_USER_LOCATION || 'PL';
const EXA_DEFAULT_NUM_RESULTS = Number(process.env.EXA_DEFAULT_NUM_RESULTS || '5');
const EXA_REQUEST_TIMEOUT_MS = Number(process.env.EXA_REQUEST_TIMEOUT_MS || '15000');

const EXA_MCP_COMMAND = process.env.EXA_MCP_COMMAND || '';
const EXA_MCP_TOOL_NAME = process.env.EXA_MCP_TOOL_NAME || 'search';
const EXA_MCP_QUERY_ARG = process.env.EXA_MCP_QUERY_ARG || 'query';
const EXA_MCP_LIMIT_ARG = process.env.EXA_MCP_LIMIT_ARG || 'numResults';
const EXA_MCP_DOMAINS_ARG = process.env.EXA_MCP_DOMAINS_ARG || 'includeDomains';
const EXA_MCP_TIMEOUT_MS = Number(process.env.EXA_MCP_TIMEOUT_MS || '20000');
const EXA_AUTO_DRAFT_SOURCE_TIERS = new Set(['official', 'community']);

const MAX_LOG_BYTES = 5 * 1024 * 1024;
const MAX_LOG_FILES = 5;

function ensureLogDir() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function rotateLog(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size < MAX_LOG_BYTES) return;
    for (let i = MAX_LOG_FILES - 1; i >= 0; i--) {
      const oldPath = i === 0 ? filePath : `${filePath}.${i}`;
      const newPath = `${filePath}.${i + 1}`;
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
      }
    }
  } catch {
    // file may not exist yet
  }
}

function appendJsonLine(filePath, payload) {
  ensureLogDir();
  rotateLog(filePath);
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
}

function providerAvailability() {
  return {
    api: Boolean(EXA_API_KEY),
    mcp: Boolean(EXA_MCP_COMMAND),
  };
}

export function getExternalSearchStatus() {
  const availability = providerAvailability();
  const activeProvider = EXA_PROVIDER === 'api'
    ? (availability.api ? 'api' : 'disabled')
    : EXA_PROVIDER === 'mcp'
      ? (availability.mcp ? 'mcp' : 'disabled')
      : availability.api
        ? 'api'
        : availability.mcp
          ? 'mcp'
          : 'disabled';
  return {
    configuredProvider: EXA_PROVIDER,
    activeProvider,
    apiConfigured: availability.api,
    mcpConfigured: availability.mcp,
    enabled: activeProvider !== 'disabled',
  };
}

function truncate(value, maxChars = 1200) {
  const text = String(value || '').trim();
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 3)}...`;
}

function normalizeApiResult(raw) {
  const url = normalizeUrl(raw.url || raw.id || '');
  const sourceType = classifySourceTier(url);
  const domain = (() => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return '';
    }
  })();
  const snippet = truncate(
    raw.summary ||
    (Array.isArray(raw.highlights) ? raw.highlights[0] : '') ||
    raw.text ||
    raw.snippet ||
    '',
    900,
  );
  return {
    title: String(raw.title || url || '').trim(),
    url,
    domain,
    snippet,
    publishedDate: raw.publishedDate || raw.published_date || '',
    updatedDate: raw.updatedDate || '',
    author: raw.author || '',
    sourceType,
    trustRank: trustRankForTier(sourceType),
    retrievedAt: new Date().toISOString(),
    raw,
  };
}

async function searchViaApi({ query, numResults, includeDomains = [], type = 'auto', category = '', text = false }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXA_REQUEST_TIMEOUT_MS);
  try {
    const body = {
      query,
      type,
      numResults,
      userLocation: EXA_USER_LOCATION,
      contents: {
        highlights: { numSentences: 2 },
        summary: true,
        text: text ? { maxCharacters: 1500 } : false,
      },
    };
    if (includeDomains.length) body.includeDomains = includeDomains;
    if (category) body.category = category;
    const response = await fetch(EXA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': EXA_API_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const textBody = await response.text();
    let json;
    try {
      json = JSON.parse(textBody);
    } catch {
      throw new Error(`Exa API returned non-JSON response: ${textBody.slice(0, 300)}`);
    }
    if (!response.ok) {
      throw new Error(`Exa API search failed with HTTP ${response.status}: ${textBody.slice(0, 300)}`);
    }
    const rawResults = Array.isArray(json.results) ? json.results : [];
    return {
      provider: 'api',
      requestId: json.requestId || '',
      searchType: json.resolvedSearchType || json.searchType || type,
      results: dedupeExternalResults(rawResults.map(normalizeApiResult)),
      raw: json,
    };
  } finally {
    clearTimeout(timer);
  }
}

function parseMcpSearchResults(payload) {
  const structured = payload?.structuredContent || payload?.structured || payload || {};
  const candidates = structured.results || structured.items || structured.data || [];
  if (!Array.isArray(candidates)) return [];
  return candidates.map((item) => normalizeApiResult({
    title: item.title,
    url: item.url,
    summary: item.summary || item.snippet,
    text: item.text,
    highlights: item.highlights,
    publishedDate: item.publishedDate || item.published_date,
    author: item.author,
  }));
}

async function searchViaMcp({ query, numResults, includeDomains = [] }) {
  if (!EXA_MCP_COMMAND) throw new Error('EXA_MCP_COMMAND is not configured');
  const child = spawn('/bin/bash', ['-lc', EXA_MCP_COMMAND], {
    cwd: ROOT,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let stdoutBuffer = Buffer.alloc(0);
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdoutBuffer = Buffer.concat([stdoutBuffer, chunk]); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8'); });

  const readFrames = () => {
    const frames = [];
    while (true) {
      const headerEnd = stdoutBuffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) break;
      const header = stdoutBuffer.slice(0, headerEnd).toString('utf8');
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) break;
      const length = Number(match[1]);
      const total = headerEnd + 4 + length;
      if (stdoutBuffer.length < total) break;
      const body = stdoutBuffer.slice(headerEnd + 4, total).toString('utf8');
      stdoutBuffer = stdoutBuffer.slice(total);
      try {
        frames.push(JSON.parse(body));
      } catch {
        // ignore malformed frame
      }
    }
    return frames;
  };

  const call = (request) => new Promise((resolve, reject) => {
    const payload = JSON.stringify(request);
    const frame = `Content-Length: ${Buffer.byteLength(payload, 'utf8')}\r\n\r\n${payload}`;
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for Exa MCP response for ${request.method}`)), EXA_MCP_TIMEOUT_MS);
    const onData = () => {
      const frames = readFrames();
      for (const response of frames) {
        if (response.id === request.id) {
            clearTimeout(timeout);
            child.stdout.off('data', onData);
            resolve(response);
            return;
          }
        }
    };
    child.stdout.on('data', onData);
    child.stdin.write(frame, (error) => {
      if (error) {
        clearTimeout(timeout);
        child.stdout.off('data', onData);
        reject(error);
      }
    });
  });

  try {
    await call({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'erp-kb-exa-adapter', version: '1.0.0' },
      },
    });

    const toolResponse = await call({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: EXA_MCP_TOOL_NAME,
        arguments: {
          [EXA_MCP_QUERY_ARG]: query,
          [EXA_MCP_LIMIT_ARG]: numResults,
          ...(includeDomains.length ? { [EXA_MCP_DOMAINS_ARG]: includeDomains } : {}),
        },
      },
    });
    if (toolResponse.error) throw new Error(toolResponse.error.message || 'Exa MCP tool call failed');
    return {
      provider: 'mcp',
      requestId: '',
      searchType: 'mcp',
      results: dedupeExternalResults(parseMcpSearchResults(toolResponse.result)),
      raw: toolResponse.result,
    };
  } finally {
    child.kill('SIGTERM');
    if (stderr.trim()) {
      appendJsonLine(DISCOVERY_LOG, {
        ts: new Date().toISOString(),
        event: 'exa_mcp_stderr',
        stderr: truncate(stderr, 1500),
      });
    }
  }
}

export async function searchExternalSources({
  query,
  kbName = '',
  includeDomains = [],
  allowedSourceTiers = [],
  numResults = EXA_DEFAULT_NUM_RESULTS,
  type = 'auto',
  category = '',
  text = false,
  logContext = 'manual',
} = {}) {
  if (!String(query || '').trim()) throw new Error('query is required');
  const status = getExternalSearchStatus();
  if (!status.enabled) {
    return {
      ok: false,
      provider: 'disabled',
      query,
      results: [],
      message: 'External search is not configured.',
    };
  }

  const provider = status.activeProvider;
  const effectiveDomains = includeDomains.length ? includeDomains : [];
  const searchResult = provider === 'api'
    ? await searchViaApi({ query, numResults, includeDomains: effectiveDomains, type, category, text })
    : await searchViaMcp({ query, numResults, includeDomains: effectiveDomains });
  const preferredDomains = preferredDomainsForKb(kbName);
  const filteredResults = allowedSourceTiers.length
    ? searchResult.results.filter((item) => allowedSourceTiers.includes(item.sourceType))
    : searchResult.results;
  const sortedResults = sortExternalResults(filteredResults, preferredDomains);
  appendJsonLine(DISCOVERY_LOG, {
    ts: new Date().toISOString(),
    event: 'external_search',
    provider,
    query,
    kbName,
    logContext,
    includeDomains: effectiveDomains,
    allowedSourceTiers,
    resultCount: sortedResults.length,
    topUrls: sortedResults.slice(0, 5).map((item) => item.url),
  });
  return {
    ok: true,
    provider,
    query,
    kbName,
    resultCount: sortedResults.length,
    requestId: searchResult.requestId,
    searchType: searchResult.searchType,
    results: sortedResults,
  };
}

export function recordExternalFallback(payload) {
  appendJsonLine(FALLBACK_LOG, {
    ts: new Date().toISOString(),
    ...payload,
  });
}

export function buildExternalDraftContent({ query, result, notes = '' }) {
  return [
    `External source discovered via Exa query: ${query}`,
    '',
    `Title: ${result.title}`,
    `URL: ${result.url}`,
    `Tier: ${result.sourceType}`,
    result.publishedDate ? `Published: ${result.publishedDate}` : '',
    '',
    'Summary:',
    result.snippet || 'No snippet returned by Exa.',
    notes ? `\nOperator notes:\n${notes.trim()}` : '',
    '',
    'This draft came from external search and requires review before promotion into a KB.',
  ].filter(Boolean).join('\n');
}

export function buildExternalCitationBlock(results, limit = 5) {
  return (results || []).slice(0, limit).map((item) => buildExternalCitationLine(item));
}

function normalizedSourceUrl(sourceUrl) {
  return normalizeUrl(sourceUrl || '');
}

function hasDraftWithSourceUrl(sourceUrl) {
  const normalized = normalizedSourceUrl(sourceUrl);
  if (!normalized) return null;

  const pendingMatch = listInboxDrafts().find((draft) => normalizedSourceUrl(draft.sourceUrl) === normalized);
  if (pendingMatch) {
    return {
      status: pendingMatch.status,
      draftId: pendingMatch.id,
      kbNamespace: pendingMatch.kbNamespace,
      title: pendingMatch.title,
      sourceUrl: pendingMatch.sourceUrl,
      location: pendingMatch.rawJsonPath,
    };
  }

  for (const kbNamespace of Object.keys(TARGET_KBS)) {
    const promotedMatch = loadPromotedKnowledge(kbNamespace).find((draft) => normalizedSourceUrl(draft.sourceUrl) === normalized);
    if (promotedMatch) {
      return {
        status: 'promoted',
        draftId: promotedMatch.id,
        kbNamespace: promotedMatch.kbNamespace,
        title: promotedMatch.title,
        sourceUrl: promotedMatch.sourceUrl,
        location: promotedMatch.promotedJsonPath,
      };
    }
  }

  return null;
}

export function resolveExternalDraftNamespace(result, fallbackNamespace = '') {
  const domain = String(result?.domain || '').toLowerCase();
  if (result?.sourceType === 'community' || domain.includes('spolecznosc.comarch.pl')) {
    return 'ComarchCommunityNews';
  }
  if (domain.includes('comarchbetterfly.pl')) {
    return 'ComarchBetterflyReference';
  }
  if (domain.includes('pomoc.comarch.pl') || domain.includes('comarch.pl')) {
    return 'ComarchOptimaReference';
  }
  return TARGET_KBS[fallbackNamespace] ? fallbackNamespace : 'ComarchCommunityNews';
}

export async function createExternalKnowledgeDraft({
  kbName,
  kbNamespace,
  query,
  result,
  notes = '',
  tags = [],
  auto = false,
} = {}) {
  if (!result || !result.url) {
    return {
      ok: false,
      created: false,
      skipped: 'missing_result',
    };
  }
  if (auto && !EXA_AUTO_DRAFT_SOURCE_TIERS.has(result.sourceType)) {
    return {
      ok: true,
      created: false,
      skipped: 'source_tier',
      result,
    };
  }

  const targetNamespace = String(kbNamespace || '').trim() || resolveExternalDraftNamespace(result, '');
  const targetKb = TARGET_KBS[targetNamespace];
  if (!targetKb) {
    return {
      ok: false,
      created: false,
      skipped: 'unsupported_namespace',
      result,
    };
  }

  const existing = hasDraftWithSourceUrl(result.url);
  if (existing) {
    return {
      ok: true,
      created: false,
      skipped: 'duplicate_source',
      existing,
      result,
    };
  }

  const draft = await submitKnowledgeDraft({
    kbName: String(kbName || targetKb.kbName),
    kbNamespace: targetNamespace,
    title: String(result.title || query || 'External source').trim(),
    content: buildExternalDraftContent({ query, result, notes }),
    sourceUrl: result.url,
    tags: Array.isArray(tags) ? tags : [],
    metadata: {
      discoveredVia: 'exa',
      exaQuery: query,
      sourceTier: result.sourceType,
      retrievedAt: result.retrievedAt,
    },
  }, { silent: true });

  return {
    ok: true,
    created: true,
    draft,
    result,
  };
}
