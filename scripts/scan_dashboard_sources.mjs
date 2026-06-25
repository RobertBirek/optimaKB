#!/usr/bin/env node

import fs from 'fs';
import os from 'os';
import path from 'path';
import process from 'process';
import { randomUUID } from 'crypto';
import { extractPdfText } from './lib/pdf_text.mjs';
import { submitKnowledgeDraft } from './lib/knowledge_inbox.mjs';
import { TARGET_KBS } from './lib/promoted_knowledge.mjs';
import { searchExternalSources } from './lib/external_search.mjs';
import {
  contentHash,
  findExistingDraftBySourceUrl,
  getSource,
  listSources,
  normalizeUrl,
  resolveCredential,
  updateSourceScanState,
} from './lib/dashboard_source_list.mjs';
import { safeFetch } from './lib/safe_http.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';
const RUN_ROOT = path.join(ROOT, 'downloads/source_watchlist/runs');
const FETCH_TIMEOUT_MS = Number(process.env.ERP_KB_SOURCE_FETCH_TIMEOUT_MS || 20000);
const MAX_CONTENT_CHARS = Number(process.env.ERP_KB_SOURCE_CONTENT_MAX_CHARS || 35000);
const MIN_CONTENT_CHARS = Number(process.env.ERP_KB_SOURCE_MIN_CONTENT_CHARS || 120);

function usage() {
  return [
    'Usage:',
    '  node scripts/scan_dashboard_sources.mjs --all [--create-drafts]',
    '  node scripts/scan_dashboard_sources.mjs --source <sourceId> [--create-drafts]',
  ].join('\n');
}

function parseArgs(argv) {
  const args = { all: false, sourceId: '', createDrafts: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--all') args.all = true;
    else if (arg === '--create-drafts') args.createDrafts = true;
    else if (arg === '--source') args.sourceId = argv[++index] || '';
    else if (arg === '--help' || arg === '-h') {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    }
  }
  if (!args.all && !args.sourceId) throw new Error('Use --all or --source <sourceId>');
  return args;
}

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
}

function stripHtmlToText(html) {
  return normalizeWhitespace(decodeHtmlEntities(String(html || '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<\/(p|div|section|article|header|footer|li|tr|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')));
}

function titleFromHtml(html, fallback = '') {
  return decodeHtmlEntities(String(html || '').match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || fallback).trim();
}

function titleFromContent(content, fallback = 'Source list draft') {
  const line = String(content || '').split(/\r?\n/).map((item) => item.replace(/^#+\s*/, '').trim()).find((item) => item.length >= 8);
  return (line || fallback).slice(0, 180);
}

function authHeaders(source) {
  const credential = resolveCredential(source);
  if (!credential) return {};
  if (source.authMode === 'basic' && credential.username && credential.password) {
    return { Authorization: `Basic ${Buffer.from(`${credential.username}:${credential.password}`).toString('base64')}` };
  }
  if (source.authMode === 'bearer' && credential.token) {
    return { Authorization: `Bearer ${credential.token}` };
  }
  return {};
}

async function fetchText(url, source) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await safeFetch(url, {
      headers: {
        Accept: 'text/html,text/plain,application/xml,text/xml,application/rss+xml,application/atom+xml;q=0.9,*/*;q=0.3',
        'User-Agent': 'TaxbellKnowledgePanelSourceScanner/1.0',
        ...authHeaders(source),
      },
      signal: controller.signal,
    });
    const contentType = response.headers.get('content-type') || '';
    const isPdf = contentType.toLowerCase().includes('application/pdf')
      || new URL(url).pathname.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!response.ok) throw new Error(`HTTP ${response.status}: PDF response (${bytes.length} bytes)`);
      const tempPath = path.join(os.tmpdir(), `erp-kb-source-${randomUUID()}.pdf`);
      try {
        fs.writeFileSync(tempPath, bytes, { mode: 0o600 });
        const body = await extractPdfText(tempPath);
        return {
          url,
          contentType,
          body,
          title: path.basename(new URL(url).pathname) || url,
        };
      } finally {
        fs.rmSync(tempPath, { force: true });
      }
    }
    const body = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${body.slice(0, 240)}`);
    return {
      url,
      contentType,
      body,
      title: titleFromHtml(body, url),
    };
  } finally {
    clearTimeout(timer);
  }
}

function uniqueByUrl(items) {
  const seen = new Set();
  const results = [];
  for (const item of items) {
    let url = '';
    try {
      url = normalizeUrl(item.url);
    } catch {
      continue;
    }
    if (seen.has(url)) continue;
    seen.add(url);
    results.push({ ...item, url });
  }
  return results;
}

function discoverRssItems(xml, baseUrl) {
  const itemBlocks = [...String(xml || '').matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map((match) => match[0]);
  return uniqueByUrl(itemBlocks.map((block) => {
    const title = decodeHtmlEntities(block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1] || '').trim();
    const link = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i)?.[1]
      || block.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1]
      || '';
    const summary = stripHtmlToText(block.match(/<(description|summary|content:encoded|content)\b[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/\1>/i)?.[2] || '');
    return {
      url: new URL(link.trim(), baseUrl).toString(),
      title,
      summary,
    };
  }));
}

function discoverSitemapItems(xml) {
  return uniqueByUrl([...String(xml || '').matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map((match) => ({
    url: decodeHtmlEntities(match[1]).trim(),
    title: '',
    summary: '',
  })));
}

function discoverHtmlLinks(html, baseUrl) {
  const baseHost = new URL(baseUrl).hostname;
  const links = [...String(html || '').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((match) => {
    const url = new URL(match[1], baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (url.hostname !== baseHost) return null;
    url.hash = '';
    return {
      url: url.toString(),
      title: stripHtmlToText(match[2]).slice(0, 180),
      summary: '',
    };
  }).filter(Boolean);
  return uniqueByUrl(links);
}

function discoverDirectoryItems(sourceRoot, filePatterns = ['.md', '.pdf', '.txt']) {
  const patterns = filePatterns.length ? filePatterns.filter((p) => p.startsWith('.')) : ['.md', '.pdf', '.txt'];
  const fullPath = path.resolve(ROOT, sourceRoot);
  if (!fs.existsSync(fullPath)) return [];
  return fs.readdirSync(fullPath).filter((name) => {
    const ext = path.extname(name).toLowerCase();
    return patterns.includes(ext) && fs.statSync(path.join(fullPath, name)).isFile();
  }).sort().map((name) => {
    const filePath = path.join(fullPath, name);
    const stat = fs.statSync(filePath);
    return { url: filePath, title: path.basename(name, path.extname(name)), mtime: stat.mtimeMs };
  });
}

function basketFile(sourceRoot, basketRoot, fileName) {
  const srcPath = path.join(path.resolve(ROOT, sourceRoot), fileName);
  if (!fs.existsSync(srcPath)) return null;
  const basketDir = path.join(path.resolve(ROOT, basketRoot), new Date().toISOString().slice(0, 10));
  fs.mkdirSync(basketDir, { recursive: true });
  let destPath = path.join(basketDir, fileName);
  let counter = 1;
  while (fs.existsSync(destPath)) {
    const ext = path.extname(fileName);
    const base = path.basename(fileName, ext);
    destPath = path.join(basketDir, `${base}_${counter}${ext}`);
    counter += 1;
  }
  fs.renameSync(srcPath, destPath);
  return destPath;
}

async function readFileContent(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const stat = fs.statSync(filePath);
  if (ext === '.pdf') {
    const text = await extractPdfText(filePath);
    return { body: text, contentType: 'application/pdf' };
  }
  const buffer = fs.readFileSync(filePath);
  const body = buffer.toString('utf8');
  const contentType = ext === '.md' ? 'text/markdown' : ext === '.json' ? 'application/json' : 'text/plain';
  return { body, contentType, mtime: stat.mtimeMs };
}

async function discoverItems(source) {
  if (source.sourceType === 'exa_query') {
    const result = await searchExternalSources({
      query: source.query,
      kbName: source.kbName,
      numResults: source.maxItemsPerScan,
      text: true,
      logContext: 'dashboard_source_list',
    });
    return (result.results || []).slice(0, source.maxItemsPerScan).map((item) => ({
      url: item.url,
      title: item.title,
      summary: item.snippet,
      retrievedAt: item.retrievedAt,
      provider: result.provider,
    }));
  }
  if (source.sourceType === 'directory') {
    return discoverDirectoryItems(source.sourceRoot, source.filePatterns).slice(0, source.maxItemsPerScan);
  }
  const fetched = await fetchText(source.url, source);
  if (source.sourceType === 'rss') return discoverRssItems(fetched.body, source.url).slice(0, source.maxItemsPerScan);
  if (source.sourceType === 'sitemap') return discoverSitemapItems(fetched.body).slice(0, source.maxItemsPerScan);
  if (source.sourceType === 'url') {
    return [{
      url: fetched.url,
      title: fetched.title || source.title || fetched.url,
      summary: '',
      fetched,
    }];
  }
  return discoverHtmlLinks(fetched.body, source.url).slice(0, source.maxItemsPerScan);
}

async function fetchItemContent(item, source) {
  if (source.sourceType === 'directory') {
    const fileInfo = await readFileContent(item.url);
    const body = fileInfo.body || '';
    if (body.length < MIN_CONTENT_CHARS) return { skipped: true, reason: 'content_too_short' };
    return {
      sourceUrl: item.url,
      title: item.title,
      content: body,
      provider: 'directory_file',
      retrievedAt: new Date().toISOString(),
    };
  }
  if (item.summary && item.summary.length >= MIN_CONTENT_CHARS) {
    return {
      sourceUrl: item.url,
      title: item.title || titleFromContent(item.summary, item.url),
      content: item.summary,
      provider: item.provider || 'source_summary',
      retrievedAt: item.retrievedAt || new Date().toISOString(),
    };
  }
  const fetched = item.fetched || await fetchText(item.url, source);
  const isHtml = fetched.contentType.includes('html') || /<html|<body|<article/i.test(fetched.body);
  const content = (isHtml ? stripHtmlToText(fetched.body) : normalizeWhitespace(fetched.body)).slice(0, MAX_CONTENT_CHARS);
  return {
    sourceUrl: item.url,
    title: item.title || fetched.title || titleFromContent(content, item.url),
    content,
    provider: isHtml ? 'http_html' : 'http_text',
    retrievedAt: new Date().toISOString(),
  };
}

async function scanSource(source, { createDrafts = false } = {}) {
  const runId = `source_scan_${new Date().toISOString().replace(/[:.]/g, '-')}_${randomUUID().slice(0, 8)}`;
  const startedAt = new Date().toISOString();
  const previousSeen = new Set((source.seen || []).map((item) => item.url || item.contentHash).filter(Boolean));
  const seen = [...(source.seen || [])];
  const result = {
    runId,
    sourceId: source.id,
    sourceType: source.sourceType,
    kbNamespace: source.kbNamespace,
    startedAt,
    finishedAt: '',
    ok: false,
    itemsSeen: 0,
    draftsCreated: 0,
    skipped: [],
    drafts: [],
    error: '',
  };

  try {
    const items = await discoverItems(source);
    result.itemsSeen = items.length;
    for (const item of items) {
      const isDirSource = source.sourceType === 'directory';
      const sourceUrl = isDirSource ? item.url : normalizeUrl(item.url);
      if (!isDirSource) {
        if (previousSeen.has(sourceUrl)) {
          result.skipped.push({ sourceUrl, reason: 'already_seen' });
          continue;
        }
        const existing = findExistingDraftBySourceUrl(sourceUrl);
        if (existing) {
          previousSeen.add(sourceUrl);
          seen.push({ url: sourceUrl, seenAt: new Date().toISOString(), existing });
          result.skipped.push({ sourceUrl, reason: 'existing_draft_or_promoted', existing });
          continue;
        }
      }
      const fetched = await fetchItemContent({ ...item, url: sourceUrl }, source);
      if (fetched.skipped) {
        result.skipped.push({ sourceUrl, reason: fetched.reason });
        continue;
      }
      const hash = contentHash(fetched.content);
      if (previousSeen.has(hash)) {
        result.skipped.push({ sourceUrl, reason: 'already_seen_hash' });
        continue;
      }
      if (!fetched.content || fetched.content.length < MIN_CONTENT_CHARS) {
        result.skipped.push({ sourceUrl, reason: 'content_too_short', contentLength: fetched.content?.length || 0 });
        continue;
      }
      if (!createDrafts) continue;
      previousSeen.add(sourceUrl);
      previousSeen.add(hash);
      seen.push({ url: sourceUrl, contentHash: hash, seenAt: new Date().toISOString() });
      const target = TARGET_KBS[source.kbNamespace];
      const draft = await submitKnowledgeDraft({
        kbName: target.kbName,
        kbNamespace: source.kbNamespace,
        title: fetched.title || source.title || titleFromContent(fetched.content, sourceUrl),
        content: [
          `Source list scan draft.`,
          '',
          `Source: ${source.title || source.sourceRoot || source.url || source.query}`,
          isDirSource ? `File: ${sourceUrl}` : `URL: ${sourceUrl}`,
          '',
          fetched.content,
        ].join('\n'),
        sourceUrl: isDirSource ? '' : sourceUrl,
        tags: source.tags || [],
        metadata: {
          discoveredVia: 'source_list',
          sourceListId: source.id,
          sourceType: source.sourceType,
          sourceTier: 'operator_draft',
          scanRunId: runId,
          retrievedAt: fetched.retrievedAt,
          contentHash: hash,
          contentProvider: fetched.provider,
        },
      }, { silent: true });
      result.draftsCreated += 1;
      result.drafts.push({
        draftId: draft.draft.id,
        sourceUrl,
        title: draft.draft.title,
        kbNamespace: draft.draft.kbNamespace,
      });
      if (isDirSource) {
        const fileName = path.basename(sourceUrl);
        const movedPath = basketFile(source.sourceRoot, source.basketRoot, fileName);
        if (movedPath) {
          seen[seen.length - 1].movedTo = movedPath;
        }
      }
    }
    result.ok = true;
    result.finishedAt = new Date().toISOString();
    updateSourceScanState(source.id, {
      seen,
      lastScanAt: startedAt,
      lastSuccessAt: result.finishedAt,
      lastErrorAt: '',
      lastError: '',
      lastRunId: runId,
      lastDraftsCreated: result.draftsCreated,
      lastItemsSeen: result.itemsSeen,
    });
  } catch (error) {
    result.ok = false;
    result.error = error.message;
    result.finishedAt = new Date().toISOString();
    updateSourceScanState(source.id, {
      lastScanAt: startedAt,
      lastErrorAt: result.finishedAt,
      lastError: error.message,
      lastRunId: runId,
      lastDraftsCreated: 0,
      lastItemsSeen: result.itemsSeen,
    });
  }
  return result;
}

function saveRunReport(report) {
  fs.mkdirSync(RUN_ROOT, { recursive: true });
  const filePath = path.join(RUN_ROOT, `${report.runId || `source_scan_${Date.now()}`}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return filePath;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sources = args.all ? listSources().filter((source) => source.enabled !== false) : [getSource(args.sourceId)];
  const report = {
    runId: `source_scan_batch_${new Date().toISOString().replace(/[:.]/g, '-')}_${randomUUID().slice(0, 8)}`,
    startedAt: new Date().toISOString(),
    finishedAt: '',
    createDrafts: args.createDrafts,
    sourceCount: sources.length,
    ok: false,
    results: [],
  };
  for (const source of sources) {
    process.stdout.write(`Scanning ${source.id} ${source.sourceType} ${source.url || source.query}\n`);
    const result = await scanSource(source, { createDrafts: args.createDrafts });
    report.results.push(result);
    process.stdout.write(`${result.ok ? 'OK' : 'FAIL'} ${source.id}: items=${result.itemsSeen} drafts=${result.draftsCreated}${result.error ? ` error=${result.error}` : ''}\n`);
  }
  report.finishedAt = new Date().toISOString();
  report.ok = report.results.every((item) => item.ok);
  const filePath = saveRunReport(report);
  process.stdout.write(JSON.stringify({
    ok: report.ok,
    runId: report.runId,
    sourceCount: report.sourceCount,
    draftsCreated: report.results.reduce((sum, item) => sum + item.draftsCreated, 0),
    reportPath: path.relative(ROOT, filePath).replaceAll(path.sep, '/'),
  }, null, 2) + '\n');
  if (!report.ok) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
