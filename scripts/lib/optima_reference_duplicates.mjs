#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { appendDashboardAudit } from './dashboard_audit.mjs';
import { withdrawPromotedDraft } from './promoted_knowledge.mjs';

const DEFAULT_ROOT = process.env.ROOT || '/docker/openspg';
const OFFICIAL_REFERENCE_CSV = 'exports/optima_reference/v1/reference_document.csv';
const PROMOTED_REFERENCE_ROOT = 'docs/reference/knowledge_inbox/promoted/ComarchOptimaReference';

function normalizeRoot(root = DEFAULT_ROOT) {
  return String(root || DEFAULT_ROOT).trim() || DEFAULT_ROOT;
}

function readTextFile(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function parseCsv(text) {
  const rows = [];
  let current = '';
  let row = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ',') {
      row.push(current);
      current = '';
      continue;
    }
    if (char === '\n') {
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
      continue;
    }
    if (char !== '\r') current += char;
  }

  if (current.length || row.length) {
    row.push(current);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((value) => String(value || '').trim().length));
}

function readCsvObjects(filePath) {
  const text = readTextFile(filePath).trim();
  if (!text) return [];
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const header = rows[0];
  return rows.slice(1).map((cells) => Object.fromEntries(header.map((column, index) => [column, cells[index] || ''])));
}

function listJsonFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const entries = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) entries.push(...listJsonFiles(fullPath));
    else if (entry.isFile() && entry.name.endsWith('.json')) entries.push(fullPath);
  }
  return entries.sort((left, right) => left.localeCompare(right));
}

export function loadOptimaReferenceOfficialDocuments(options = {}) {
  const root = normalizeRoot(options.root);
  const filePath = path.join(root, OFFICIAL_REFERENCE_CSV);
  return readCsvObjects(filePath).map((row) => ({
    id: row.id || '',
    name: row.name || '',
    sourceUrl: row.sourceUrl || '',
    sourceType: row.sourceType || '',
    raw: row,
  })).filter((row) => row.sourceUrl);
}

export function loadPromotedOptimaReferenceDrafts(options = {}) {
  const root = normalizeRoot(options.root);
  const dirPath = path.join(root, PROMOTED_REFERENCE_ROOT);
  return listJsonFiles(dirPath).flatMap((filePath) => {
    try {
      const draft = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return [{
        id: draft.id || path.basename(filePath, '.json'),
        title: draft.title || '',
        sourceUrl: draft.sourceUrl || '',
        kbNamespace: draft.kbNamespace || 'ComarchOptimaReference',
        sourceDraftPath: draft.sourceDraftPath || '',
        promotedJsonPath: path.relative(root, filePath).replaceAll(path.sep, '/'),
        promotedMarkdownPath: draft.promotedMarkdownPath || filePath.replace(/\.json$/, '.md'),
        promotedAt: draft.promotedAt || '',
        raw: draft,
      }];
    } catch {
      return [];
    }
  }).filter((draft) => draft.sourceUrl);
}

export function findOptimaReferenceDuplicateSources(options = {}) {
  const root = normalizeRoot(options.root);
  const officialDocuments = loadOptimaReferenceOfficialDocuments({ root });
  const promotedDrafts = loadPromotedOptimaReferenceDrafts({ root });
  const officialByUrl = new Map();
  for (const doc of officialDocuments) {
    const existing = officialByUrl.get(doc.sourceUrl) || [];
    existing.push(doc);
    officialByUrl.set(doc.sourceUrl, existing);
  }

  const duplicateUrls = [...officialByUrl.entries()]
    .filter(([, docs]) => docs.length > 1)
    .map(([sourceUrl]) => sourceUrl)
    .sort((left, right) => left.localeCompare(right));

  return duplicateUrls.map((sourceUrl) => {
    const officialRows = officialByUrl.get(sourceUrl) || [];
    const promotedRows = officialRows.filter((row) => row.sourceType === 'promoted_knowledge_draft');
    const promotedDraftsForUrl = promotedDrafts.filter((draft) => draft.sourceUrl === sourceUrl);
    return {
      sourceUrl,
      officialDocuments: officialRows,
      promotedDrafts: promotedDraftsForUrl,
      officialDocumentIds: officialRows.map((item) => item.id),
      promotedDraftIds: promotedDraftsForUrl.map((item) => item.id),
      promotedReferenceIds: promotedRows.map((item) => item.id),
    };
  });
}

export function findOptimaReferenceCleanupCandidates(options = {}) {
  const root = normalizeRoot(options.root);
  const officialDocuments = loadOptimaReferenceOfficialDocuments({ root });
  const promotedDrafts = loadPromotedOptimaReferenceDrafts({ root });
  const officialByUrl = new Map();
  for (const doc of officialDocuments) {
    const existing = officialByUrl.get(doc.sourceUrl) || [];
    existing.push(doc);
    officialByUrl.set(doc.sourceUrl, existing);
  }
  return promotedDrafts
    .filter((draft) => officialByUrl.has(draft.sourceUrl))
    .map((draft) => ({
      sourceUrl: draft.sourceUrl,
      draftId: draft.id,
      title: draft.title,
      promotedJsonPath: draft.promotedJsonPath,
      promotedMarkdownPath: draft.promotedMarkdownPath,
      officialDocuments: officialByUrl.get(draft.sourceUrl) || [],
      officialDocumentIds: (officialByUrl.get(draft.sourceUrl) || []).map((item) => item.id),
    }))
    .sort((left, right) => left.sourceUrl.localeCompare(right.sourceUrl) || left.draftId.localeCompare(right.draftId));
}

export function withdrawOptimaReferenceDuplicatePromotedDrafts(options = {}) {
  const root = normalizeRoot(options.root);
  const operator = String(options.operator || options.withdrawnBy || 'system').trim() || 'system';
  const reviewNote = String(options.reviewNote || options.note || 'Auto-withdrawn duplicate source URL').trim();
  const dryRun = options.dryRun === true;
  const candidates = findOptimaReferenceCleanupCandidates({ root });
  const withdrawn = [];
  const skipped = [];

  for (const candidate of candidates) {
    try {
      if (dryRun) {
        withdrawn.push({ ...candidate, dryRun: true });
        continue;
      }
      const result = withdrawPromotedDraft(candidate.draftId, {
        withdrawnBy: operator,
        reviewNote,
      });
      withdrawn.push({
        ...candidate,
        withdrawnAt: result.withdrawnAt,
        withdrawnBy: result.withdrawnBy,
        registryEntry: result,
      });
      appendDashboardAudit({
        actor: operator,
        role: 'system',
        action: 'knowledge_draft.auto_withdraw_duplicate_source_url',
        resourceType: 'knowledge_draft',
        resourceId: candidate.draftId,
        outcome: 'success',
        metadata: {
          sourceUrl: candidate.sourceUrl,
          reviewNote,
          dryRun: false,
        },
        after: {
          draftId: candidate.draftId,
          sourceUrl: candidate.sourceUrl,
          withdrawnAt: result.withdrawnAt,
        },
      });
    } catch (error) {
      skipped.push({
        ...candidate,
        error: error.message,
      });
    }
  }

  return {
    overall: withdrawn.length ? 'REMEDIATED' : 'OK',
    root,
    dryRun,
    operator,
    reviewNote,
    candidateCount: candidates.length,
    withdrawnCount: withdrawn.length,
    skippedCount: skipped.length,
    withdrawn,
    skipped,
  };
}

export function shouldSuppressPromotedOptimaReferenceDraft(sourceUrl, options = {}) {
  if (!sourceUrl) return false;
  const root = normalizeRoot(options.root);
  const officialDocuments = options.officialDocuments || loadOptimaReferenceOfficialDocuments({ root });
  return officialDocuments.some((doc) => doc.sourceUrl === sourceUrl);
}
