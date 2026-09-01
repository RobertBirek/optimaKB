#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import process from 'process';
import { writeFileAtomically } from './lib/atomic_file.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';
const OUT_JSON = path.join(ROOT, 'docs/reference/KB_Source_Freshness_Report.json');
const OUT_MD = path.join(ROOT, 'docs/reference/KB_Source_Freshness_Report.md');
const DEFAULT_STALE_DAYS = Number(process.env.KB_SOURCE_STALE_DAYS || 14);

const TARGETS = [
  {
    namespace: 'ComarchOptimaReference',
    kbName: 'Comarch Optima Reference',
    sourceRoot: 'downloads/official/optima_reference',
    exportManifest: 'exports/optima_reference/v1/_manifest.json',
    registryPath: 'downloads/official/optima_reference/meta/source_registry.json',
    refreshPolicy: 'weekly or after a new Optima version',
  },
  {
    namespace: 'ComarchBetterflyReference',
    kbName: 'Comarch Betterfly Reference',
    sourceRoot: 'downloads/official/betterfly_reference',
    exportManifest: 'exports/betterfly_reference/v1/_manifest.json',
    registryPath: 'downloads/official/betterfly_reference/meta/source_registry.json',
    refreshPolicy: 'daily or weekly delta, depending on API doc activity',
  },
  {
    namespace: 'ComarchCommunityNews',
    kbName: 'Comarch Community News',
    sourceRoot: 'downloads/community_news',
    exportManifest: 'exports/community_news/v1/_manifest.json',
    registryPath: 'downloads/community_news/meta/source_registry.json',
    refreshPolicy: 'daily cron',
  },
  {
    namespace: 'ComarchOptimaPartnerTechnical',
    kbName: 'Comarch Optima Partner Technical',
    sourceRoot: 'downloads/partner/optima_technical',
    exportManifest: 'exports/optima_partner_technical/v1/_manifest.json',
    registryPath: 'downloads/partner/optima_technical/source_registry.json',
    refreshPolicy: 'manual authenticated pass',
  },
  {
    namespace: 'ComarchOptimaAdditionalFunctions',
    kbName: 'Comarch Optima Additional Functions',
    sourceRoot: 'downloads/google_drive/additional_functions',
    exportManifest: 'exports/optima_additional_functions/v1/_manifest.json',
    registryPath: 'downloads/google_drive/additional_functions/meta/source_registry.json',
    refreshPolicy: 'manual file-driven refresh',
  },
  {
    namespace: 'ComarchOptimaSprint',
    kbName: 'Comarch Optima Sprint and Prints',
    sourceRoot: 'downloads/google_drive/sprint',
    exportManifest: 'exports/optima_sprint/v1/_manifest.json',
    registryPath: 'downloads/google_drive/sprint/meta/source_registry.json',
    refreshPolicy: 'manual file-driven refresh',
  },
  {
    namespace: 'TaxbellLegalReference',
    kbName: 'Taxbell Legal Reference',
    sourceRoot: 'downloads/taxbell/legal_reference',
    exportManifest: 'exports/taxbell_legal_reference/v1/_manifest.json',
    registryPath: 'downloads/taxbell/legal_reference/meta/source_registry.json',
    refreshPolicy: 'wide Exa refresh, then manual review',
  },
  {
    namespace: 'TaxbellPayrollHRReference',
    kbName: 'Taxbell Payroll HR Reference',
    sourceRoot: 'downloads/taxbell/payroll_hr_reference',
    exportManifest: 'exports/taxbell_payroll_hr_reference/v1/_manifest.json',
    registryPath: 'downloads/taxbell/payroll_hr_reference/meta/source_registry.json',
    refreshPolicy: 'wide Exa refresh, then manual review',
  },
  {
    namespace: 'TaxbellAccountingVATReference',
    kbName: 'Taxbell Accounting VAT Reference',
    sourceRoot: 'downloads/taxbell/accounting_vat_reference',
    exportManifest: 'exports/taxbell_accounting_vat_reference/v1/_manifest.json',
    registryPath: 'downloads/taxbell/accounting_vat_reference/meta/source_registry.json',
    refreshPolicy: 'wide Exa refresh, then manual review',
  },
];

function readJsonIfExists(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listFilesRecursive(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const files = [];
  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.isFile()) files.push(fullPath);
    }
  }
  walk(rootDir);
  return files.sort((a, b) => a.localeCompare(b));
}

function fileHash(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function daysSince(dateValue, now = new Date()) {
  const timestamp = dateValue ? Date.parse(dateValue) : Number.NaN;
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.round((now.getTime() - timestamp) / 86400000));
}

function newestMtime(files) {
  let newest = 0;
  for (const filePath of files) {
    const mtime = fs.statSync(filePath).mtimeMs;
    if (mtime > newest) newest = mtime;
  }
  return newest ? new Date(newest).toISOString() : '';
}

function oldestMtime(files) {
  let oldest = 0;
  for (const filePath of files) {
    const mtime = fs.statSync(filePath).mtimeMs;
    if (!oldest || mtime < oldest) oldest = mtime;
  }
  return oldest ? new Date(oldest).toISOString() : '';
}

function registryStats(registry) {
  if (!registry) {
    return {
      registryPresent: false,
      registryGeneratedAt: '',
      registrySourceCount: 0,
      registryUpdatedCount: 0,
      registryHashCount: 0,
      registryStatusCounts: {},
    };
  }

  const candidates = [
    ...(Array.isArray(registry.sources) ? registry.sources : []),
    ...(Array.isArray(registry.entries) ? registry.entries : []),
    ...(Array.isArray(registry.referenceDocuments) ? registry.referenceDocuments : []),
    ...(Array.isArray(registry.partnerAssets) ? registry.partnerAssets : []),
  ];
  const statusCounts = {};
  let updatedCount = 0;
  let hashCount = 0;
  for (const item of candidates) {
    const status = item.status || item.sourceType || item.documentCategory || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    if (item.updatedAt || item.lastModified || item.publishedAt) updatedCount += 1;
    if (item.hash || item.sha256 || item.contentHash) hashCount += 1;
  }

  return {
    registryPresent: true,
    registryGeneratedAt: registry.generatedAt || '',
    registrySourceCount: candidates.length,
    registryUpdatedCount: updatedCount,
    registryHashCount: hashCount,
    registryStatusCounts: statusCounts,
  };
}

function assessTarget(target, staleDays) {
  const sourceRootAbs = path.join(ROOT, target.sourceRoot);
  const files = listFilesRecursive(sourceRootAbs);
  const registryPayload = target.registryPath
    ? readJsonIfExists(path.join(ROOT, target.registryPath), null)
    : null;
  const exportManifest = readJsonIfExists(path.join(ROOT, target.exportManifest), null);
  const newestSource = newestMtime(files);
  const oldestSource = oldestMtime(files);
  const exportGeneratedAt = exportManifest?.generatedAt || '';
  const registry = registryStats(registryPayload);
  const sourceAgeDays = daysSince(newestSource);
  const exportAgeDays = daysSince(exportGeneratedAt);
  const registryAgeDays = daysSince(registry.registryGeneratedAt);
  const stale = sourceAgeDays == null ? true : sourceAgeDays > staleDays;
  const exportBehindSource = exportGeneratedAt && newestSource
    ? Date.parse(exportGeneratedAt) < Date.parse(newestSource)
    : false;

  const warnings = [];
  if (!files.length) warnings.push('No source files found.');
  if (!registry.registryPresent) warnings.push('No source registry; freshness is based on file mtimes only.');
  if (registry.registryPresent && registry.registryHashCount === 0) warnings.push('Registry has no content hashes.');
  if (stale) warnings.push(`Newest source is older than ${staleDays} days.`);
  if (exportBehindSource) warnings.push('Export manifest is older than newest source file.');

  const sampleHashes = files.slice(0, 20).map((filePath) => ({
    path: path.relative(ROOT, filePath).replaceAll(path.sep, '/'),
    sha256: fileHash(filePath),
  }));

  return {
    namespace: target.namespace,
    kbName: target.kbName,
    refreshPolicy: target.refreshPolicy,
    sourceRoot: target.sourceRoot,
    sourceFileCount: files.length,
    newestSource,
    oldestSource,
    sourceAgeDays,
    exportManifest: target.exportManifest,
    exportGeneratedAt,
    exportAgeDays,
    exportBehindSource,
    stale,
    warnings,
    sampleHashes,
    ...registry,
    registryAgeDays,
  };
}

function buildMarkdown(payload) {
  const lines = [
    '# KB Source Freshness Report',
    '',
    `Generated at: ${payload.generatedAt}`,
    `Stale threshold: \`${payload.staleDays}\` days`,
    '',
    `Overall: \`${payload.overall}\``,
    '',
  ];
  for (const item of payload.results) {
    lines.push(`## ${item.namespace}`);
    lines.push('');
    lines.push(`- Policy: ${item.refreshPolicy}`);
    lines.push(`- Source files: \`${item.sourceFileCount}\``);
    lines.push(`- Newest source: \`${item.newestSource || 'n/a'}\``);
    lines.push(`- Source age days: \`${item.sourceAgeDays ?? 'n/a'}\``);
    lines.push(`- Export generatedAt: \`${item.exportGeneratedAt || 'n/a'}\``);
    lines.push(`- Export behind source: \`${item.exportBehindSource}\``);
    lines.push(`- Registry present: \`${item.registryPresent}\``);
    lines.push(`- Registry sources: \`${item.registrySourceCount}\``);
    lines.push(`- Registry hashes: \`${item.registryHashCount}\``);
    if (item.warnings.length) {
      lines.push('- Warnings:');
      for (const warning of item.warnings) lines.push(`  - ${warning}`);
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

const staleDays = Number(process.argv.includes('--stale-days')
  ? process.argv[process.argv.indexOf('--stale-days') + 1]
  : DEFAULT_STALE_DAYS);
const results = TARGETS.map((target) => assessTarget(target, Number.isFinite(staleDays) ? staleDays : DEFAULT_STALE_DAYS));
const overall = results.some((item) => item.exportBehindSource)
  ? 'ACTION_NEEDED'
  : results.some((item) => item.stale || item.warnings.length)
    ? 'WARN'
    : 'FRESH';
const payload = {
  generatedAt: new Date().toISOString(),
  staleDays: Number.isFinite(staleDays) ? staleDays : DEFAULT_STALE_DAYS,
  overall,
  results,
};

writeFileAtomically(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);
writeFileAtomically(OUT_MD, buildMarkdown(payload));
process.stdout.write(`${JSON.stringify({
  ok: true,
  overall,
  json: OUT_JSON,
  md: OUT_MD,
  summary: results.map((item) => ({
    namespace: item.namespace,
    sourceFileCount: item.sourceFileCount,
    sourceAgeDays: item.sourceAgeDays,
    exportBehindSource: item.exportBehindSource,
    warnings: item.warnings.length,
  })),
}, null, 2)}\n`);
