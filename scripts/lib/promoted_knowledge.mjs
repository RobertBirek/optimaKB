#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { createHash } from 'node:crypto';
import { appendDashboardAudit } from './dashboard_audit.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';
export const RAW_INBOX_ROOT = path.join(ROOT, 'downloads/knowledge_inbox');
export const REVIEW_ROOT = path.join(ROOT, 'docs/reference/knowledge_inbox');
export const PROMOTED_ROOT = path.join(REVIEW_ROOT, 'promoted');
export const WITHDRAWN_ROOT = path.join(REVIEW_ROOT, 'withdrawn');
export const REGISTRY_PATH = path.join(REVIEW_ROOT, 'registry.json');

export const TARGET_KBS = {
  ComarchOptimaSchema: {
    kbName: 'Comarch Optima ERP MSSQL Schema',
    namespace: 'ComarchOptimaSchema',
  },
  ComarchOptimaAdditionalFunctions: {
    kbName: 'Comarch Optima Additional Functions',
    namespace: 'ComarchOptimaAdditionalFunctions',
  },
  ComarchOptimaSprint: {
    kbName: 'Comarch Optima Sprint and Prints',
    namespace: 'ComarchOptimaSprint',
  },
  ComarchOptimaReference: {
    kbName: 'Comarch Optima Reference',
    namespace: 'ComarchOptimaReference',
  },
  ComarchOptimaPartnerTechnical: {
    kbName: 'Comarch Optima Partner Technical',
    namespace: 'ComarchOptimaPartnerTechnical',
  },
  ComarchBetterflyReference: {
    kbName: 'Comarch Betterfly Reference',
    namespace: 'ComarchBetterflyReference',
  },
  ComarchCommunityNews: {
    kbName: 'Comarch Community News',
    namespace: 'ComarchCommunityNews',
  },
  ComarchOptimaBusinessSemantics: {
    kbName: 'Comarch Optima Business Semantics',
    namespace: 'ComarchOptimaBusinessSemantics',
  },
  TaxbellLegalReference: {
    kbName: 'Taxbell Legal Reference',
    namespace: 'TaxbellLegalReference',
  },
  TaxbellPayrollHRReference: {
    kbName: 'Taxbell Payroll HR Reference',
    namespace: 'TaxbellPayrollHRReference',
  },
  TaxbellAccountingVATReference: {
    kbName: 'Taxbell Accounting VAT Reference',
    namespace: 'TaxbellAccountingVATReference',
  },
  ComarchUniversalKnowledge: {
    kbName: 'Comarch Universal Knowledge',
    namespace: 'ComarchUniversalKnowledge',
  },
  OWAOntology: {
    kbName: 'OWA Platform Optima Ontology',
    namespace: 'OWAOntology',
  },
  InsERTGTSchema: {
    kbName: 'InsERT GT MSSQL Schema',
    namespace: 'InsERTGTSchema',
  },
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonIfExists(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, filePath);
}

function rawDraftMarkdown(draft) {
  return [
    `# ${draft.title}`,
    '',
    `- id: \`${draft.id}\``,
    `- kb: \`${draft.kbName}\``,
    `- namespace: \`${draft.kbNamespace}\``,
    `- createdAt: \`${draft.createdAt}\``,
    draft.sourceUrl ? `- sourceUrl: ${draft.sourceUrl}` : null,
    draft.tags?.length ? `- tags: ${draft.tags.map((tag) => `\`${tag}\``).join(', ')}` : null,
    draft.metadata?.sourceTier ? `- sourceTier: \`${draft.metadata.sourceTier}\`` : null,
    '',
    '## Content',
    '',
    draft.content,
    '',
  ].filter(Boolean).join('\n');
}

function listFilesRecursive(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const results = [];
  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.isFile()) results.push(fullPath);
    }
  }
  walk(rootDir);
  return results.sort((a, b) => a.localeCompare(b));
}

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function truncate(value, limit = 1200) {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 3)}...`;
}

export function slug(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\s.-]/g, '')
    .trim()
    .replace(/[\s./\\-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

export function makePromotedId(prefix, draftId) {
  const normalized = slug(draftId) || 'DRAFT';
  if (normalized.length <= 96) return `${prefix}_${normalized}`;

  const hash = createHash('sha256').update(normalized).digest('hex').slice(0, 15).toUpperCase();
  return `${prefix}_${normalized.slice(0, 80)}_${hash}`;
}

export function splitDraftContent(content, maxLength = 1800) {
  const paragraphs = normalizeWhitespace(content)
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!paragraphs.length) return [];

  const chunks = [];
  let current = '';
  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= maxLength) {
      current = candidate;
      continue;
    }
    if (current) chunks.push(current);
    if (paragraph.length <= maxLength) {
      current = paragraph;
      continue;
    }
    for (let index = 0; index < paragraph.length; index += maxLength) {
      chunks.push(paragraph.slice(index, index + maxLength));
    }
    current = '';
  }
  if (current) chunks.push(current);
  return chunks;
}

export function loadRegistry() {
  return readJsonIfExists(REGISTRY_PATH, {
    generatedAt: new Date().toISOString(),
    entries: [],
  });
}

export function saveRegistry(registry) {
  writeJson(REGISTRY_PATH, {
    ...registry,
    generatedAt: new Date().toISOString(),
    entries: [...(registry.entries || [])].sort((a, b) => a.draftId.localeCompare(b.draftId)),
  });
}

export function findRawDrafts() {
  return listFilesRecursive(RAW_INBOX_ROOT)
    .filter((filePath) => filePath.endsWith('.json'))
    .map((filePath) => {
      const draft = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return {
        ...draft,
        rawJsonPath: filePath,
        rawMarkdownPath: filePath.replace(/\.json$/, '.md'),
      };
    })
    .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
}

export function findRawDraftById(draftId) {
  const draft = findRawDrafts().find((item) => item.id === draftId);
  if (!draft) throw new Error(`Draft not found: ${draftId}`);
  return draft;
}

export function reroutePendingDraft(draftId, targetNamespace, options = {}) {
  const draft = findRawDraftById(draftId);
  const target = TARGET_KBS[targetNamespace];
  if (!target) throw new Error(`Unsupported target kbNamespace: ${targetNamespace}`);
  if (draft.kbNamespace === targetNamespace) {
    throw new Error(`Draft already targets ${targetNamespace}`);
  }
  const registry = loadRegistry();
  const existing = registryEntryFor(registry, draftId);
  if (existing && existing.status !== 'pending') {
    throw new Error(`Only pending drafts can be rerouted. Current status: ${existing.status}`);
  }

  const at = new Date().toISOString();
  const before = {
    kbName: draft.kbName,
    kbNamespace: draft.kbNamespace,
  };
  const next = {
    ...draft,
    kbName: target.kbName,
    kbNamespace: target.namespace,
    metadata: {
      ...(draft.metadata || {}),
      routingHistory: [
        ...(Array.isArray(draft.metadata?.routingHistory) ? draft.metadata.routingHistory : []),
        {
          from: draft.kbNamespace,
          to: target.namespace,
          at,
          by: String(options.reroutedBy || process.env.USER || 'operator'),
          note: String(options.note || '').slice(0, 1000),
          automationJobId: String(options.automationJobId || ''),
        },
      ],
    },
  };
  delete next.rawJsonPath;
  delete next.rawMarkdownPath;

  const jsonTemp = `${draft.rawJsonPath}.${process.pid}.reroute.tmp`;
  const markdownTemp = `${draft.rawMarkdownPath}.${process.pid}.reroute.tmp`;
  const previousJson = fs.readFileSync(draft.rawJsonPath, 'utf8');
  const previousMarkdown = fs.existsSync(draft.rawMarkdownPath)
    ? fs.readFileSync(draft.rawMarkdownPath, 'utf8')
    : null;
  try {
    fs.writeFileSync(jsonTemp, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    fs.writeFileSync(markdownTemp, rawDraftMarkdown(next), 'utf8');
    fs.renameSync(jsonTemp, draft.rawJsonPath);
    fs.renameSync(markdownTemp, draft.rawMarkdownPath);
  } catch (error) {
    fs.rmSync(jsonTemp, { force: true });
    fs.rmSync(markdownTemp, { force: true });
    fs.writeFileSync(draft.rawJsonPath, previousJson, 'utf8');
    if (previousMarkdown == null) fs.rmSync(draft.rawMarkdownPath, { force: true });
    else fs.writeFileSync(draft.rawMarkdownPath, previousMarkdown, 'utf8');
    throw error;
  }

  return {
    draft: {
      ...next,
      rawJsonPath: draft.rawJsonPath,
      rawMarkdownPath: draft.rawMarkdownPath,
    },
    before,
    after: {
      kbName: next.kbName,
      kbNamespace: next.kbNamespace,
    },
    reroutedAt: at,
  };
}

export function registryEntryFor(registry, draftId) {
  return (registry.entries || []).find((entry) => entry.draftId === draftId) || null;
}

export function promoteDraft(draftId, options = {}) {
  const draft = findRawDraftById(draftId);
  const target = TARGET_KBS[draft.kbNamespace];
  if (!target) throw new Error(`Unsupported kbNamespace: ${draft.kbNamespace}`);

  const registry = loadRegistry();
  const existing = registryEntryFor(registry, draftId);
  if (existing?.status === 'promoted' && !options.force) {
    throw new Error(`Draft already promoted: ${draftId}`);
  }

  const promotedAt = new Date().toISOString();
  const promoted = {
    ...draft,
    status: 'promoted',
    promotedAt,
    promotedBy: options.promotedBy || process.env.USER || 'operator',
    reviewNote: options.reviewNote || '',
    sourceDraftPath: path.relative(ROOT, draft.rawJsonPath).replaceAll(path.sep, '/'),
  };
  delete promoted.rawJsonPath;
  delete promoted.rawMarkdownPath;

  const targetDir = path.join(PROMOTED_ROOT, draft.kbNamespace);
  ensureDir(targetDir);
  const jsonPath = path.join(targetDir, `${draft.id}.json`);
  const mdPath = path.join(targetDir, `${draft.id}.md`);
  writeJson(jsonPath, promoted);

  const markdown = [
    `# ${promoted.title}`,
    '',
    `- draftId: \`${promoted.id}\``,
    `- kbNamespace: \`${promoted.kbNamespace}\``,
    `- status: \`${promoted.status}\``,
    `- promotedAt: \`${promoted.promotedAt}\``,
    promoted.sourceUrl ? `- sourceUrl: ${promoted.sourceUrl}` : null,
    promoted.tags?.length ? `- tags: ${promoted.tags.map((tag) => `\`${tag}\``).join(', ')}` : null,
    promoted.reviewNote ? `- reviewNote: ${promoted.reviewNote}` : null,
    '',
    '## Content',
    '',
    promoted.content,
    '',
  ].filter(Boolean).join('\n');
  fs.writeFileSync(mdPath, markdown, 'utf8');

  const nextEntry = {
    draftId,
    status: 'promoted',
    kbName: target.kbName,
    kbNamespace: target.namespace,
    title: promoted.title,
    sourceUrl: promoted.sourceUrl || '',
    rawJsonPath: path.relative(ROOT, draft.rawJsonPath).replaceAll(path.sep, '/'),
    promotedJsonPath: path.relative(ROOT, jsonPath).replaceAll(path.sep, '/'),
    promotedMarkdownPath: path.relative(ROOT, mdPath).replaceAll(path.sep, '/'),
    promotedAt,
    promotedBy: promoted.promotedBy,
    reviewNote: promoted.reviewNote,
  };

  registry.entries = [
    ...(registry.entries || []).filter((entry) => entry.draftId !== draftId),
    nextEntry,
  ];
  saveRegistry(registry);

  appendDashboardAudit({
    actor: promoted.promotedBy,
    role: 'operator',
    action: 'knowledge_draft.promote',
    resourceType: 'knowledge_draft',
    resourceId: draftId,
    before: existing,
    after: nextEntry,
  });

  return { promoted, jsonPath, mdPath, registryEntry: nextEntry };
}

export function rejectDraft(draftId, options = {}) {
  const draft = findRawDraftById(draftId);
  const registry = loadRegistry();
  const existing = registryEntryFor(registry, draftId);
  const rejectedAt = new Date().toISOString();
  const nextEntry = {
    draftId,
    status: 'rejected',
    kbName: draft.kbName,
    kbNamespace: draft.kbNamespace,
    title: draft.title,
    sourceUrl: draft.sourceUrl || '',
    rawJsonPath: path.relative(ROOT, draft.rawJsonPath).replaceAll(path.sep, '/'),
    rejectedAt,
    rejectedBy: options.rejectedBy || process.env.USER || 'operator',
    reviewNote: options.reviewNote || '',
  };

  registry.entries = [
    ...(registry.entries || []).filter((entry) => entry.draftId !== draftId),
    nextEntry,
  ];
  saveRegistry(registry);
  appendDashboardAudit({
    actor: nextEntry.rejectedBy,
    role: 'operator',
    action: 'knowledge_draft.reject',
    resourceType: 'knowledge_draft',
    resourceId: draftId,
    before: existing,
    after: nextEntry,
  });
  return nextEntry;
}

export function withdrawPromotedDraft(draftId, options = {}) {
  const draft = findRawDraftById(draftId);
  const registry = loadRegistry();
  const existing = registryEntryFor(registry, draftId);
  if (existing?.status !== 'promoted') {
    throw new Error(`Only promoted drafts can be withdrawn. Current status: ${existing?.status || 'pending'}`);
  }

  const withdrawnAt = new Date().toISOString();
  const targetDir = path.join(WITHDRAWN_ROOT, draft.kbNamespace);
  ensureDir(targetDir);
  const movedPaths = [];

  for (const key of ['promotedJsonPath', 'promotedMarkdownPath']) {
    const relativePath = existing[key];
    if (!relativePath) continue;
    const sourcePath = path.join(ROOT, relativePath);
    if (!fs.existsSync(sourcePath)) continue;
    const destinationPath = path.join(targetDir, path.basename(sourcePath));
    fs.renameSync(sourcePath, destinationPath);
    movedPaths.push({
      from: relativePath,
      to: path.relative(ROOT, destinationPath).replaceAll(path.sep, '/'),
    });
  }

  const nextEntry = {
    draftId,
    status: 'withdrawn',
    kbName: existing.kbName || draft.kbName,
    kbNamespace: existing.kbNamespace || draft.kbNamespace,
    title: existing.title || draft.title,
    sourceUrl: existing.sourceUrl || draft.sourceUrl || '',
    rawJsonPath: existing.rawJsonPath || path.relative(ROOT, draft.rawJsonPath).replaceAll(path.sep, '/'),
    withdrawnAt,
    withdrawnBy: options.withdrawnBy || process.env.USER || 'operator',
    reviewNote: options.reviewNote || '',
    previousPromotedAt: existing.promotedAt || '',
    movedPaths,
  };

  registry.entries = [
    ...(registry.entries || []).filter((entry) => entry.draftId !== draftId),
    nextEntry,
  ];
  saveRegistry(registry);
  appendDashboardAudit({
    actor: nextEntry.withdrawnBy,
    role: 'operator',
    action: 'knowledge_draft.withdraw',
    resourceType: 'knowledge_draft',
    resourceId: draftId,
    before: existing,
    after: nextEntry,
  });
  return nextEntry;
}

export function listInboxDrafts() {
  const registry = loadRegistry();
  const statusById = new Map((registry.entries || []).map((entry) => [entry.draftId, entry]));
  return findRawDrafts().map((draft) => {
    const entry = statusById.get(draft.id);
    return {
      id: draft.id,
      title: draft.title,
      kbName: draft.kbName,
      kbNamespace: draft.kbNamespace,
      sourceUrl: draft.sourceUrl || '',
      tags: draft.tags || [],
      createdAt: draft.createdAt || '',
      status: entry?.status || 'pending',
      rawJsonPath: path.relative(ROOT, draft.rawJsonPath).replaceAll(path.sep, '/'),
      registryEntry: entry || null,
    };
  });
}

export function loadPromotedKnowledge(kbNamespace) {
  const target = TARGET_KBS[kbNamespace];
  if (!target) return [];
  const targetDir = path.join(PROMOTED_ROOT, kbNamespace);
  return listFilesRecursive(targetDir)
    .filter((filePath) => filePath.endsWith('.json'))
    .map((filePath) => ({
      ...JSON.parse(fs.readFileSync(filePath, 'utf8')),
      promotedJsonPath: path.relative(ROOT, filePath).replaceAll(path.sep, '/'),
      promotedMarkdownPath: path.relative(ROOT, filePath.replace(/\.json$/, '.md')).replaceAll(path.sep, '/'),
    }))
    .filter((draft) => draft.status === 'promoted')
    .sort((a, b) => String(a.promotedAt || '').localeCompare(String(b.promotedAt || '')));
}
