#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import process from 'process';

const ROOT = process.env.ROOT || '/docker/openspg';

const INBOX_ROOT = path.join(ROOT, 'downloads/knowledge_inbox');
const PROMOTED_ROOT = path.join(ROOT, 'docs/reference/knowledge_inbox/promoted');
const DISCOVERY_CANDIDATES_ROOT = path.join(ROOT, 'data/dashboard/discovery/candidates');
const EXPORTS_ROOT = path.join(ROOT, 'exports');

const EXISTING_DROP_LINE_PATTERNS = [
  /^reklama:?$/i,
  /^newsletter:?$/i,
  /^zapisz się na newsletter\.?$/i,
  /^subskrybuj(?: nasz)? newsletter\.?$/i,
  /^subskrybuj nas na youtube\.?$/i,
  /^dołącz do ekspertów(?: dołącz do grona ekspertów)?\.?$/i,
  /^udostępnij\.?$/i,
  /^czytaj także:?$/i,
  /^zobacz także:?$/i,
  /^zobacz również:?$/i,
  /^menu:?$/i,
  /^nawigacja:?$/i,
  /^tagi:?$/i,
  /^kategorie:?$/i,
  /^polityka prywatności$/i,
  /^regulamin$/i,
  /^wszelkie prawa zastrzeżone$/i,
  /^akceptuję$/i,
  /^zgadzam się$/i,
  /^facebook$/i,
  /^linkedin$/i,
  /^youtube$/i,
  /^x$/i,
  /^twitter$/i,
  /^shutterstock$/i,
  /^infor$/i,
  /^rozwiń\s*>$/i,
  /^adres redakcji:/i,
  /^www\.(dziennik|gazetaprawna|forsal)\.pl/i,
  /^autorzy:/i,
  /^redaktor merytoryczny:/i,
  /^korekta:/i,
  /^projekt graficzny okładki:/i,
  /^dtp:/i,
  /^biuro obsługi klienta:/i,
  /^tel\./i,
  /^e-mail:/i,
  /^©\s*copyright/i,
  /^wydanie\s+/i,
  /^isbn:/i,
  /^patrzymy obiektywnie/i,
  /^\d{2}-\d{3}\s+warszawa,/i,
  /^spis treści$/i,
  /^wstęp$/i,
  /^\d+$/,
  /^\.$/, /^,$/, /^:$/, /^;$/, /^!$/, /^\?$/,
  /^https?:\/\/\S+$/,
];

const EXISTING_INLINE_PATTERNS = [
  /\bREKLAMA\b/gi,
  /zapisz się na newsletter/gi,
  /subskrybuj(?: nasz)? newsletter/gi,
  /subskrybuj nas na youtube/gi,
  /dołącz do ekspertów(?: dołącz do grona ekspertów)?/gi,
  /pliki cookie/gi,
  /ta strona używa cookie/gi,
  /polityka prywatności/gi,
  /czytaj także/gi,
  /zobacz także/gi,
  /zobacz również/gi,
  /udostępnij/gi,
  /obserwuj nas/gi,
];

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch { return fallback; }
}

function listFilesRecursive(rootDir, ext = '') {
  if (!fs.existsSync(rootDir)) return [];
  const results = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.isFile() && (!ext || entry.name.endsWith(ext))) results.push(fullPath);
    }
  };
  walk(rootDir);
  return results;
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
}

function collectLines(text) {
  return normalizeWhitespace(text).split(/\n/).map((l) => l.trim()).filter(Boolean);
}

function buildKey(line) {
  return line.toLowerCase().replace(/[^a-z0-9ąćęłńóśźż\s]/gi, '').trim();
}

function scanText(text, source, stats) {
  const lines = collectLines(text);
  for (const line of lines) {
    const key = buildKey(line);
    if (!key || key.length < 3) continue;
    if (!stats.lines[key]) {
      stats.lines[key] = { text: line.slice(0, 120), count: 0, sources: {} };
    }
    stats.lines[key].count += 1;
    stats.lines[key].sources[source] = (stats.lines[key].sources[source] || 0) + 1;
  }
}

function scanDiscoveryCandidates() {
  const candidates = listFilesRecursive(DISCOVERY_CANDIDATES_ROOT, '.json');
  const stats = { lines: {}, totalDocs: 0 };
  for (const filePath of candidates) {
    const doc = readJson(filePath);
    if (!doc) continue;
    stats.totalDocs += 1;
    scanText(doc.content || '', `discovery.${doc.kbNamespace || 'unknown'}`, stats);
    scanText(doc.snippet || '', `discovery.${doc.kbNamespace || 'unknown'}`, stats);
  }
  return stats;
}

function scanInboxDrafts() {
  const drafts = listFilesRecursive(INBOX_ROOT, '.json');
  const stats = { lines: {}, totalDocs: 0 };
  for (const filePath of drafts) {
    const doc = readJson(filePath);
    if (!doc) continue;
    stats.totalDocs += 1;
    scanText(doc.content || '', `inbox.${doc.kbNamespace || 'unknown'}`, stats);
  }
  return stats;
}

function scanPromotedDrafts() {
  const drafts = listFilesRecursive(PROMOTED_ROOT, '.json');
  const stats = { lines: {}, totalDocs: 0 };
  for (const filePath of drafts) {
    const doc = readJson(filePath);
    if (!doc) continue;
    stats.totalDocs += 1;
    scanText(doc.content || '', `promoted.${doc.kbNamespace || 'unknown'}`, stats);
  }
  return stats;
}

function scanExportCsvs() {
  const stats = { lines: {}, totalDocs: 0 };
  const exportDirs = fs.existsSync(EXPORTS_ROOT) ? fs.readdirSync(EXPORTS_ROOT) : [];
  for (const kbDir of exportDirs) {
    const v1Dir = path.join(EXPORTS_ROOT, kbDir, 'v1');
    if (!fs.existsSync(v1Dir)) continue;
    for (const entry of fs.readdirSync(v1Dir)) {
      if (!entry.endsWith('.csv')) continue;
      const csvPath = path.join(v1Dir, entry);
      const content = fs.readFileSync(csvPath, 'utf8');
      // Extract content column (heuristic: find column index named "content")
      const lines = content.split('\n').filter(Boolean);
      if (lines.length < 2) continue;
      const header = lines[0].split(',');
      const contentIdx = header.findIndex((h) => /content/i.test(h));
      if (contentIdx === -1) continue;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        const val = (cols[contentIdx] || '').replace(/^"|"$/g, '');
        if (val) {
          stats.totalDocs += 1;
          scanText(val, `export.${kbDir}.${entry.replace('.csv', '')}`, stats);
        }
      }
    }
  }
  return stats;
}

function classifyPattern(lineStats, totalSources) {
  const matchedExisting = EXISTING_DROP_LINE_PATTERNS.some((p) => p.test(lineStats.text));
  const matchedInline = EXISTING_INLINE_PATTERNS.some((p) => p.test(lineStats.text));
  if (matchedExisting || matchedInline) return 'existing';
  const nChars = lineStats.text.length;
  if (nChars <= 40 && lineStats.count >= 3) return 'proposed_short';
  if (nChars <= 80 && lineStats.count >= 5) return 'proposed_medium';
  return 'noise';
}

function buildReport(results) {
  const report = {
    generatedAt: new Date().toISOString(),
    totalSources: results.length,
    existingPatterns: [],
    proposedNewPatterns: [],
    bySource: {},
  };

  // Merge all line stats
  const merged = {};
  let totalDocs = 0;
  for (const result of results) {
    totalDocs += result.totalDocs;
    for (const [key, stats] of Object.entries(result.lines)) {
      if (!merged[key]) merged[key] = { text: stats.text, count: 0, sources: {} };
      merged[key].count += stats.count;
      for (const [src, cnt] of Object.entries(stats.sources)) {
        merged[key].sources[src] = (merged[key].sources[src] || 0) + cnt;
      }
    }
  }

  report.totalDocs = totalDocs;
  report.totalUniqueLines = Object.keys(merged).length;

  const sorted = Object.entries(merged).sort((a, b) => b[1].count - a[1].count);

  for (const [key, stats] of sorted) {
    const classification = classifyPattern(stats, results.length);
    const sourceCount = Object.keys(stats.sources).length;
    if (classification === 'existing') {
      report.existingPatterns.push({
        text: stats.text,
        count: stats.count,
        sources: sourceCount,
      });
    } else if (classification.startsWith('proposed')) {
      report.proposedNewPatterns.push({
        text: stats.text,
        count: stats.count,
        sources: sourceCount,
        type: classification,
        sampleSources: Object.keys(stats.sources).slice(0, 5),
      });
    }
  }

  return report;
}

function main() {
  const results = [
    { name: 'Discovery candidates', ...scanDiscoveryCandidates() },
    { name: 'Pending inbox drafts', ...scanInboxDrafts() },
    { name: 'Promoted drafts', ...scanPromotedDrafts() },
    { name: 'Export CSVs', ...scanExportCsvs() },
  ];

  const report = buildReport(results);

  // Print summary
  console.log('=== Content Garbage Scan Report ===\n');
  for (const r of results) {
    console.log(`${r.name}: ${r.totalDocs} docs, ${Object.keys(r.lines).length} unique lines`);
  }
  console.log(`\nTotal unique lines scanned: ${report.totalUniqueLines}`);
  console.log(`Existing pattern matches: ${report.existingPatterns.length}`);
  console.log(`Proposed new patterns: ${report.proposedNewPatterns.length}\n`);

  if (report.proposedNewPatterns.length) {
    console.log('=== Top proposed new patterns ===');
    for (const p of report.proposedNewPatterns.slice(0, 40)) {
      console.log(`  [${p.sources} src][${p.count}x] ${p.text.slice(0, 100)}`);
    }
    console.log('');
  }

  if (report.existingPatterns.length) {
    console.log('=== Existing patterns (top 20) ===');
    for (const p of report.existingPatterns.slice(0, 20)) {
      console.log(`  [${p.sources} src][${p.count}x] ${p.text.slice(0, 100)}`);
    }
    console.log('');
  }

  // Write structured report
  const reportPath = path.join(ROOT, 'docs/reference/Content_Cleaning_Scan_Report.json');
  const mdPath = path.join(ROOT, 'docs/reference/Content_Cleaning_Scan_Report.md');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

  const md = [
    '# Content Cleaning Scan Report',
    '',
    `Generated: ${report.generatedAt}`,
    `Total docs scanned: ${report.totalDocs}`,
    `Total unique lines: ${report.totalUniqueLines}`,
    `Existing pattern matches: ${report.existingPatterns.length}`,
    `Proposed new patterns: ${report.proposedNewPatterns.length}`,
    '',
    '## Top proposed new patterns',
    '',
    '| Pattern | Count | Sources | Type |',
    '|---|---|---|---|',
    ...report.proposedNewPatterns.slice(0, 60).map((p) => `| \`${p.text.slice(0, 80).replace(/\|/g, '\\|')}\` | ${p.count} | ${p.sources} | ${p.type} |`),
    '',
    '## Existing patterns (top 30)',
    '',
    '| Pattern | Count | Sources |',
    '|---|---|---|',
    ...report.existingPatterns.slice(0, 30).map((p) => `| \`${p.text.slice(0, 80).replace(/\|/g, '\\|')}\` | ${p.count} | ${p.sources} |`),
    '',
  ].join('\n');
  fs.writeFileSync(mdPath, md, 'utf8');

  console.log(`Report written to:\n  ${reportPath}\n  ${mdPath}`);
}

main();
