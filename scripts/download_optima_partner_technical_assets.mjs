#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { extractPdfText } from './lib/pdf_text.mjs';

const ROOT = '/docker/openspg';
const EXPORT_DIR = path.join(ROOT, 'exports/optima_partner_technical/v1');
const ASSET_CSV = path.join(EXPORT_DIR, 'partner_asset.csv');
const SOURCE_ROOT = path.join(ROOT, 'downloads/partner/optima_technical');
const DOWNLOAD_ROOT = path.join(SOURCE_ROOT, 'downloads');
const EXTRACTED_ROOT = path.join(SOURCE_ROOT, 'extracted');
const UNPACKED_ROOT = path.join(SOURCE_ROOT, 'unpacked');
const MANIFEST_PATH = path.join(SOURCE_ROOT, 'download_manifest.json');
const README_PATH = path.join(SOURCE_ROOT, 'README.md');

const PARTNER_COOKIE = process.env.PARTNER_COOKIE || '';
const DOWNLOAD_TYPES = new Set(
  String(process.env.PARTNER_DOWNLOAD_TYPES || 'pdf,zip')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);
const CATEGORY_FILTER = new Set(
  String(process.env.PARTNER_CATEGORY_FILTER || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);
const AREA_FILTER = new Set(
  String(process.env.PARTNER_PRODUCT_AREA_FILTER || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);
const STATE_FILTER = new Set(
  String(process.env.PARTNER_STATE_FILTER || 'CURRENT')
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean),
);
const LIMIT = Math.max(1, Number(process.env.PARTNER_DOWNLOAD_LIMIT || '20'));
const MAX_BYTES = Math.max(1, Number(process.env.PARTNER_MAX_BYTES || '157286400'));
const SINCE = String(process.env.PARTNER_DOWNLOAD_SINCE || '').trim();
const INCLUDE_ROUTE_ONLY = /^(1|true|yes)$/i.test(String(process.env.PARTNER_INCLUDE_ROUTE_ONLY || ''));
const FORCE = /^(1|true|yes)$/i.test(String(process.env.PARTNER_DOWNLOAD_FORCE || ''));

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonIfExists(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function readProbeText(filePath, maxBytes = 8192) {
  try {
    const buffer = fs.readFileSync(filePath);
    return normalizeWhitespace(buffer.subarray(0, Math.min(buffer.length, maxBytes)).toString('utf8'));
  } catch {
    return '';
  }
}

function detectHtmlLoginBarrier(contentType, probeText) {
  const normalizedType = String(contentType || '').toLowerCase();
  const normalizedText = String(probeText || '').toLowerCase();
  if (!normalizedType.includes('text/html')) return null;
  if (
    normalizedText.includes('<title>sso</title>') ||
    normalizedText.includes('<app-root></app-root>') ||
    normalizedText.includes('g-recaptcha') ||
    normalizedText.includes('sso.comarch.com')
  ) {
    return {
      probeState: 'AUTH_REDIRECT_HTML',
      probeNote: 'Partner asset download returned the Comarch SSO HTML page instead of the requested binary.',
    };
  }
  return {
    probeState: 'HTML_CONTENT_MISMATCH',
    probeNote: 'Partner asset download returned HTML instead of the requested binary.',
  };
}

function detectBarrierFromDownloadedFile(filePath) {
  const probeText = readProbeText(filePath);
  const normalized = String(probeText || '').toLowerCase();
  if (!normalized) return null;
  if (
    normalized.startsWith('<!doctype html') ||
    normalized.startsWith('<html') ||
    normalized.includes('<head>') ||
    normalized.includes('<body')
  ) {
    return detectHtmlLoginBarrier('text/html', probeText);
  }
  return null;
}

function sanitizeSegment(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\s.-]/g, '')
    .trim()
    .replace(/[\s/\\:]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'asset';
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    if (ch !== '\r') {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [header = [], ...records] = rows;
  return records
    .filter((record) => record.some((value) => value !== ''))
    .map((record) => Object.fromEntries(header.map((key, index) => [key, record[index] || ''])));
}

function readAssets() {
  if (!fs.existsSync(ASSET_CSV)) {
    throw new Error(`Missing staged asset CSV: ${ASSET_CSV}`);
  }
  const rows = parseCsv(fs.readFileSync(ASSET_CSV, 'utf8'));
  return rows;
}

function matchesFilters(asset) {
  const overlap = asset.overlapPolicy || '';
  if (!INCLUDE_ROUTE_ONLY && overlap !== 'INDEX_AND_RETRIEVE') return false;

  const extension = String(asset.fileExtension || '').toLowerCase();
  if (!DOWNLOAD_TYPES.has(extension)) return false;

  const state = String(asset.currentState || '').toUpperCase();
  if (STATE_FILTER.size && !STATE_FILTER.has(state)) return false;

  if (CATEGORY_FILTER.size && !CATEGORY_FILTER.has(asset.categoryRefId || '')) return false;
  if (AREA_FILTER.size && !AREA_FILTER.has(asset.productAreaRefId || '')) return false;

  if (SINCE && String(asset.publishedAt || '') < SINCE) return false;

  return Boolean(asset.directDownloadUrl);
}

function sortAssets(assets) {
  return [...assets].sort((a, b) =>
    String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')) ||
    String(a.name || '').localeCompare(String(b.name || '')),
  );
}

function fileTargetPath(asset) {
  const stateDir = String(asset.currentState || 'UNSPECIFIED').toLowerCase();
  const ext = String(asset.fileExtension || 'bin').toLowerCase();
  const fileName = `${asset.id}__${sanitizeSegment(asset.name)}.${ext}`;
  return path.join(DOWNLOAD_ROOT, stateDir, ext, fileName);
}

async function partnerFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (PARTNER_COOKIE) headers.set('Cookie', PARTNER_COOKIE);
  const response = await fetch(url, { ...options, headers, redirect: 'follow' });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} for ${url}: ${text.slice(0, 300)}`);
  }
  return response;
}

async function readContentLength(url) {
  try {
    const response = await partnerFetch(url, { method: 'HEAD' });
    const length = response.headers.get('content-length');
    return length ? Number(length) : null;
  } catch {
    return null;
  }
}

async function downloadToFile(url, targetPath) {
  const response = await partnerFetch(url);
  ensureDir(path.dirname(targetPath));
  const fileStream = fs.createWriteStream(targetPath);
  await pipeline(Readable.fromWeb(response.body), fileStream);
  return {
    contentType: response.headers.get('content-type') || '',
    contentLength: Number(response.headers.get('content-length') || '0') || fs.statSync(targetPath).size,
  };
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

async function extractPdfSidecar(asset, filePath) {
  const probe = detectBarrierFromDownloadedFile(filePath);
  if (probe) {
    return {
      extractedTextPath: '',
      extractedTextLength: 0,
      note: probe.probeNote,
    };
  }
  const text = normalizeWhitespace(await extractPdfText(filePath));
  const relativeTextPath = path.join('extracted', 'pdf_text', `${path.basename(filePath, '.pdf')}.txt`);
  if (text.length < 40) {
    return {
      extractedTextPath: '',
      extractedTextLength: 0,
      note: 'No reliable PDF text recovered',
    };
  }
  const outPath = path.join(SOURCE_ROOT, relativeTextPath);
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, text + '\n', 'utf8');
  return {
    extractedTextPath: relativeTextPath.replaceAll(path.sep, '/'),
    extractedTextLength: text.length,
    note: `Recovered PDF text for ${asset.name}`,
  };
}

function inventoryZipSidecar(asset, filePath) {
  const probe = detectBarrierFromDownloadedFile(filePath);
  if (probe) {
    return {
      inventoryPath: '',
      inventoryCount: 0,
      note: probe.probeNote,
    };
  }
  try {
    const listing = execFileSync('unzip', ['-Z1', filePath], { encoding: 'utf8' });
    const relativeInventoryPath = path.join('unpacked', 'zip_inventory', `${path.basename(filePath, '.zip')}.txt`);
    const outPath = path.join(SOURCE_ROOT, relativeInventoryPath);
    ensureDir(path.dirname(outPath));
    fs.writeFileSync(outPath, listing.trim() + '\n', 'utf8');
    const entries = listing
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    return {
      inventoryPath: relativeInventoryPath.replaceAll(path.sep, '/'),
      inventoryCount: entries.length,
      note: `Captured ZIP inventory for ${asset.name}`,
    };
  } catch (error) {
    return {
      inventoryPath: '',
      inventoryCount: 0,
      note: `ZIP inventory unavailable: ${error.message.split('\n')[0]}`,
    };
  }
}

function refreshReadme(manifest) {
  const authRedirectCount = (manifest.assets || []).filter((asset) => asset.probeState === 'AUTH_REDIRECT_HTML').length;
  const htmlMismatchCount = (manifest.assets || []).filter((asset) => asset.probeState === 'HTML_CONTENT_MISMATCH').length;
  const lines = [
    '# Comarch Optima Partner Technical Local Source',
    '',
    'This directory is the local working area for the KB:',
    '',
    '- `ComarchOptimaPartnerTechnical`',
    '',
    'Current subdirectories:',
    '- `api/`',
    '- `downloads/`',
    '- `extracted/`',
    '- `unpacked/`',
    '',
    'Current downloader:',
    '- `scripts/download_optima_partner_technical_assets.mjs`',
    '- central URL provenance registry: `source_registry.json`',
    '',
    'Downloader policy:',
    '- reads staged `partner_asset.csv` from `exports/optima_partner_technical/v1/`',
    '- defaults to `INDEX_AND_RETRIEVE` assets only',
    '- defaults to `CURRENT` state only',
    '- defaults to file types `pdf,zip`',
    '- writes `download_manifest.json` here',
    '- writes PDF sidecar text into `extracted/pdf_text/` when recoverable',
    '- writes ZIP entry inventories into `unpacked/zip_inventory/` when `unzip` is available',
    '',
    'Last known download run:',
    `- downloaded: \`${manifest.downloadedCount}\``,
    `- skipped existing: \`${manifest.skippedExistingCount}\``,
    `- skipped large: \`${manifest.skippedLargeCount}\``,
    `- errors: \`${manifest.errorCount}\``,
    `- auth redirect HTML: \`${authRedirectCount}\``,
    `- other HTML mismatch: \`${htmlMismatchCount}\``,
    `- filter limit: \`${manifest.config.limit}\``,
    `- filter state: \`${manifest.config.stateFilter.join(',')}\``,
    `- filter types: \`${manifest.config.downloadTypes.join(',')}\``,
    '',
    'Do not place:',
    '- credentials',
    '- cookies',
    '- live customer data',
    '- unrelated commercial paperwork unless a separate commercial KB is intentionally built',
    '',
  ];
  fs.writeFileSync(README_PATH, lines.join('\n'), 'utf8');
}

async function main() {
  ensureDir(DOWNLOAD_ROOT);
  ensureDir(EXTRACTED_ROOT);
  ensureDir(UNPACKED_ROOT);

  const assets = sortAssets(readAssets().filter(matchesFilters)).slice(0, LIMIT);
  const previousManifest = readJsonIfExists(MANIFEST_PATH, { runs: [] });

  const run = {
    generatedAt: new Date().toISOString(),
    sourceCsv: path.relative(ROOT, ASSET_CSV).replaceAll(path.sep, '/'),
    config: {
      includeRouteOnly: INCLUDE_ROUTE_ONLY,
      downloadTypes: [...DOWNLOAD_TYPES],
      categoryFilter: [...CATEGORY_FILTER],
      productAreaFilter: [...AREA_FILTER],
      stateFilter: [...STATE_FILTER],
      since: SINCE,
      limit: LIMIT,
      maxBytes: MAX_BYTES,
      force: FORCE,
    },
    selectedCount: assets.length,
    downloadedCount: 0,
    skippedExistingCount: 0,
    skippedLargeCount: 0,
    errorCount: 0,
    assets: [],
  };

  for (const asset of assets) {
    const targetPath = fileTargetPath(asset);
    const relativePath = path.relative(SOURCE_ROOT, targetPath).replaceAll(path.sep, '/');
    const existing = fs.existsSync(targetPath);

    try {
      const contentLength = await readContentLength(asset.directDownloadUrl);
      if (contentLength != null && contentLength > MAX_BYTES) {
        run.skippedLargeCount += 1;
        run.assets.push({
          id: asset.id,
          name: asset.name,
          directDownloadUrl: asset.directDownloadUrl,
          localPath: relativePath,
          status: 'SKIPPED_LARGE',
          contentLength,
        });
        continue;
      }

      if (existing && !FORCE) {
        run.skippedExistingCount += 1;
        const stats = fs.statSync(targetPath);
        run.assets.push({
          id: asset.id,
          name: asset.name,
          directDownloadUrl: asset.directDownloadUrl,
          localPath: relativePath,
          status: 'SKIPPED_EXISTING',
          contentLength: stats.size,
          sha256: sha256File(targetPath),
        });
        continue;
      }

      const downloadMeta = await downloadToFile(asset.directDownloadUrl, targetPath);
      const sha256 = sha256File(targetPath);
      const probeText = readProbeText(targetPath);
      const contentBarrier = detectHtmlLoginBarrier(downloadMeta.contentType, probeText);
      const record = {
        id: asset.id,
        name: asset.name,
        directDownloadUrl: asset.directDownloadUrl,
        localPath: relativePath,
        status: 'DOWNLOADED',
        contentType: downloadMeta.contentType,
        contentLength: downloadMeta.contentLength,
        sha256,
        probeState: contentBarrier?.probeState || 'BINARY_OK',
        probeNote: contentBarrier?.probeNote || '',
        sidecars: {},
      };

      const extension = String(asset.fileExtension || '').toLowerCase();
      if (extension === 'pdf') {
        record.sidecars.pdfText = await extractPdfSidecar(asset, targetPath);
      } else if (extension === 'zip') {
        record.sidecars.zipInventory = inventoryZipSidecar(asset, targetPath);
      }

      run.downloadedCount += 1;
      run.assets.push(record);
    } catch (error) {
      run.errorCount += 1;
      run.assets.push({
        id: asset.id,
        name: asset.name,
        directDownloadUrl: asset.directDownloadUrl,
        localPath: relativePath,
        status: 'ERROR',
        error: error.message,
      });
    }
  }

  previousManifest.runs = Array.isArray(previousManifest.runs) ? previousManifest.runs : [];
  previousManifest.runs.unshift(run);
  previousManifest.runs = previousManifest.runs.slice(0, 20);
  previousManifest.lastRun = run;

  writeJson(MANIFEST_PATH, previousManifest);
  refreshReadme(run);

  console.log(JSON.stringify({
    success: true,
    selectedCount: run.selectedCount,
    downloadedCount: run.downloadedCount,
    skippedExistingCount: run.skippedExistingCount,
    skippedLargeCount: run.skippedLargeCount,
    errorCount: run.errorCount,
    manifest: MANIFEST_PATH,
  }, null, 2));
}

await main();
