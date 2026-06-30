#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import process from 'process';
import { appendDashboardAudit } from './lib/dashboard_audit.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';

const INBOX_ROOT = path.join(ROOT, 'downloads/knowledge_inbox');
const PROMOTED_ROOT = path.join(ROOT, 'docs/reference/knowledge_inbox/promoted');
const DISCOVERY_CANDIDATES_ROOT = path.join(ROOT, 'data/dashboard/discovery/candidates');
const PATTERNS_PATH = path.join(ROOT, 'data/dashboard/cleaning/patterns.json');
const EXPORTS_ROOT = path.join(ROOT, 'exports');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const operator = args.includes('--by') ? args[args.indexOf('--by') + 1] : 'cleanup';
const mode = args.includes('--mode') ? args[args.indexOf('--mode') + 1] : 'all';

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch { return fallback; }
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, filePath);
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
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

function loadPatterns() {
  const config = readJson(PATTERNS_PATH, { proposedPatterns: { dropLines: [], inlineRemove: [] } });
  return config.proposedPatterns || { dropLines: [], inlineRemove: [] };
}

function buildDropRegexes(patterns) {
  return (patterns.dropLines || [])
    .filter((p) => p.suggested !== false)
    .map((p) => ({ regex: new RegExp(p.pattern, p.flags || 'i'), reason: p.reason }));
}

function buildInlineRegexes(patterns) {
  return (patterns.inlineRemove || [])
    .filter((p) => p.suggested !== false)
    .map((p) => ({ regex: new RegExp(p.pattern, p.flags || 'gi'), reason: p.reason }));
}

function cleanText(text, dropRegexes, inlineRegexes) {
  let result = normalizeWhitespace(text);
  if (!result) return '';

  // Apply inline patterns first
  for (const { regex } of inlineRegexes) {
    result = result.replace(regex, ' ');
  }

  // Split, filter lines, rejoin
  const lines = result.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const keptLines = lines.filter((line) => !dropRegexes.some((r) => r.regex.test(line)));

  return normalizeWhitespace(keptLines.join('\n'));
}

function cleanDiscoveryCandidates(dropRegexes, inlineRegexes) {
  const candidates = listFilesRecursive(DISCOVERY_CANDIDATES_ROOT, '.json');
  let cleaned = 0, unchanged = 0;

  for (const filePath of candidates) {
    const doc = readJson(filePath);
    if (!doc) continue;

    const origContent = doc.content || '';
    const origSnippet = doc.snippet || '';
    const nextContent = cleanText(origContent, dropRegexes, inlineRegexes);
    const nextSnippet = cleanText(origSnippet, dropRegexes, inlineRegexes);
    const contentChanged = nextContent !== origContent;
    const snippetChanged = nextSnippet !== origSnippet;

    if (!contentChanged && !snippetChanged) { unchanged += 1; continue; }

    cleaned += 1;
    if (dryRun) continue;

    doc.content = nextContent;
    doc.snippet = nextSnippet;
    if (!doc.cleanup) doc.cleanup = [];
    if (!Array.isArray(doc.cleanup)) doc.cleanup = [];
    doc.cleanup.push({ operator, cleanedAt: new Date().toISOString(), contentChanged, snippetChanged });

    writeJsonAtomic(filePath, doc);
  }
  return { scanned: candidates.length, cleaned, unchanged, dryRun };
}

function cleanInboxDrafts(dropRegexes, inlineRegexes) {
  const drafts = listFilesRecursive(INBOX_ROOT, '.json');
  let cleaned = 0, unchanged = 0;

  for (const filePath of drafts) {
    const doc = readJson(filePath);
    if (!doc) continue;

    const origContent = doc.content || '';
    const nextContent = cleanText(origContent, dropRegexes, inlineRegexes);
    if (nextContent === origContent) { unchanged += 1; continue; }

    cleaned += 1;
    if (dryRun) continue;

    doc.content = nextContent;
    writeJsonAtomic(filePath, doc);

    // Also update the MD file if it exists
    const mdPath = filePath.replace(/\.json$/, '.md');
    if (fs.existsSync(mdPath)) {
      let md = fs.readFileSync(mdPath, 'utf8');
      // Replace content between "## Content" and next section or end
      md = md.replace(/## Content\n\n[\s\S]*?(?=\n##|$)/, `## Content\n\n${nextContent}\n`);
      fs.writeFileSync(mdPath, md, 'utf8');
    }
  }
  return { scanned: drafts.length, cleaned, unchanged, dryRun };
}

function cleanPromotedDrafts(dropRegexes, inlineRegexes) {
  const drafts = listFilesRecursive(PROMOTED_ROOT, '.json');
  let cleaned = 0, unchanged = 0;

  for (const filePath of drafts) {
    const doc = readJson(filePath);
    if (!doc) continue;

    const origContent = doc.content || '';
    const nextContent = cleanText(origContent, dropRegexes, inlineRegexes);
    if (nextContent === origContent) { unchanged += 1; continue; }

    cleaned += 1;
    if (dryRun) continue;

    doc.content = nextContent;
    writeJsonAtomic(filePath, doc);

    const mdPath = filePath.replace(/\.json$/, '.md');
    if (fs.existsSync(mdPath)) {
      let md = fs.readFileSync(mdPath, 'utf8');
      md = md.replace(/## Content\n\n[\s\S]*?(?=\n##|$)/, `## Content\n\n${nextContent}\n`);
      fs.writeFileSync(mdPath, md, 'utf8');
    }
  }
  return { scanned: drafts.length, cleaned, unchanged, dryRun };
}

function cleanExportCsvs(dropRegexes, inlineRegexes) {
  let cleaned = 0, unchanged = 0, csvFiles = 0;
  const exportDirs = fs.existsSync(EXPORTS_ROOT) ? fs.readdirSync(EXPORTS_ROOT) : [];

  for (const kbDir of exportDirs) {
    if (['ComarchOptimaSchema', 'ComarchOptimaBusinessSemantics', 'ComarchUniversalKnowledge'].includes(kbDir)) continue;
    const v1Dir = path.join(EXPORTS_ROOT, kbDir, 'v1');
    if (!fs.existsSync(v1Dir)) continue;
    for (const entry of fs.readdirSync(v1Dir)) {
      if (!entry.endsWith('.csv') || entry.startsWith('_')) continue;
      csvFiles += 1;
      const csvPath = path.join(v1Dir, entry);
      const content = fs.readFileSync(csvPath, 'utf8');
      const lines = content.split('\n').filter(Boolean);
      if (lines.length < 2) continue;
      const header = lines[0].split(',');
      const contentIdx = header.findIndex((h) => /content/i.test(h));
      const nameIdx = header.findIndex((h) => /^name$/i.test(h));
      const descriptionIdx = header.findIndex((h) => /description/i.test(h));
      const summaryIdx = header.findIndex((h) => /summary/i.test(h));
      const snippetIdx = header.findIndex((h) => /snippet/i.test(h));

      let changed = false;
      const outLines = [lines[0]];

      for (let i = 1; i < lines.length; i++) {
        let row = lines[i];
        for (const idx of [contentIdx, nameIdx, descriptionIdx, summaryIdx, snippetIdx]) {
          if (idx === -1) continue;
          const match = row.match(/^((?:[^,"]|"[^"]*")*?,){${idx}}("(?:[^"]|"")*"|[^,]*)/);
          // too complex for CSV inline parsing; handle simpler case
        }
        // Simple approach: find quoted fields and clean their content
        let newRow = row;
        for (const idx of [contentIdx, nameIdx, descriptionIdx, summaryIdx, snippetIdx]) {
          if (idx === -1) continue;
          // Find the idx-th field
          let pos = 0, currentIdx = 0;
          while (pos < row.length && currentIdx < idx) {
            if (row[pos] === '"') { pos += 1; while (pos < row.length && !(row[pos] === '"' && (pos + 1 >= row.length || row[pos + 1] === ','))) pos += 1; }
            pos += 1; currentIdx += 1;
          }
          if (pos >= row.length) continue;
          const fieldStart = pos;
          if (row[pos] === '"') {
            pos += 1; while (pos < row.length && !(row[pos] === '"' && (pos + 1 >= row.length || row[pos + 1] === ','))) pos += 1;
            if (pos >= row.length) continue;
            const fieldEnd = pos;
            const rawVal = row.slice(fieldStart + 1, fieldEnd);
            const cleanedVal = cleanText(rawVal.replace(/""/g, '"'), dropRegexes, inlineRegexes).replace(/"/g, '""');
            if (cleanedVal !== rawVal) {
              newRow = row.slice(0, fieldStart + 1) + cleanedVal + row.slice(fieldEnd);
              changed = true;
            }
            pos += 1;
          } else {
            const commaPos = row.indexOf(',', pos);
            const fieldEnd = commaPos === -1 ? row.length : commaPos;
            const rawVal = row.slice(fieldStart, fieldEnd);
            const cleanedVal = cleanText(rawVal, dropRegexes, inlineRegexes);
            if (cleanedVal !== rawVal) {
              // Wrap in quotes if contains comma or newline
              const safe = cleanedVal.includes(',') || cleanedVal.includes('\n') ? `"${cleanedVal}"` : cleanedVal;
              newRow = row.slice(0, fieldStart) + safe + row.slice(fieldEnd);
              changed = true;
            }
          }
        }
        outLines.push(newRow);
      }

      if (changed) {
        cleaned += 1;
        if (!dryRun) {
          fs.writeFileSync(csvPath, outLines.join('\n') + '\n', 'utf8');
        }
      } else {
        unchanged += 1;
      }
    }
  }
  return { csvFiles, cleaned, unchanged, dryRun };
}

function main() {
  const patterns = loadPatterns();
  const dropRegexes = buildDropRegexes(patterns);
  const inlineRegexes = buildInlineRegexes(patterns);

  console.log(`=== Content Garbage Cleaner ===`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log(`Operator: ${operator}`);
  console.log(`Drop patterns: ${dropRegexes.length}`);
  console.log(`Inline patterns: ${inlineRegexes.length}\n`);

  const results = {};

  if (mode === 'all' || mode === 'discovery') {
    console.log('Cleaning discovery candidates...');
    results.discovery = cleanDiscoveryCandidates(dropRegexes, inlineRegexes);
    console.log(`  scanned=${results.discovery.scanned} cleaned=${results.discovery.cleaned} unchanged=${results.discovery.unchanged} dryRun=${results.discovery.dryRun}`);
  }

  if (mode === 'all' || mode === 'inbox') {
    console.log('Cleaning pending inbox drafts...');
    results.inbox = cleanInboxDrafts(dropRegexes, inlineRegexes);
    console.log(`  scanned=${results.inbox.scanned} cleaned=${results.inbox.cleaned} unchanged=${results.inbox.unchanged} dryRun=${results.inbox.dryRun}`);
  }

  if (mode === 'all' || mode === 'promoted') {
    console.log('Cleaning promoted drafts...');
    results.promoted = cleanPromotedDrafts(dropRegexes, inlineRegexes);
    console.log(`  scanned=${results.promoted.scanned} cleaned=${results.promoted.cleaned} unchanged=${results.promoted.unchanged} dryRun=${results.promoted.dryRun}`);
  }

  if (mode === 'all' || mode === 'export') {
    console.log('Cleaning export CSVs...');
    results.export = cleanExportCsvs(dropRegexes, inlineRegexes);
    console.log(`  csvFiles=${results.export.csvFiles} cleaned=${results.export.cleaned} unchanged=${results.export.unchanged} dryRun=${results.export.dryRun}`);
  }

  if (!dryRun) {
    appendDashboardAudit({
      actor: operator, role: 'operator',
      action: 'content.cleaning.run',
      resourceType: 'content',
      resourceId: mode,
      after: results,
    });
  }

  console.log('\nDone.');
}

main();
