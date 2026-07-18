#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { triggerAutomationForDraft } from './dashboard_automation.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';
const INBOX_ROOT = path.join(ROOT, 'downloads/knowledge_inbox');
const MAX_TITLE_CHARS = Number(process.env.ERP_KB_DRAFT_MAX_TITLE_CHARS || 200);
const MAX_CONTENT_CHARS = Number(process.env.ERP_KB_DRAFT_MAX_CONTENT_CHARS || 50000);
const MAX_SOURCE_URL_CHARS = Number(process.env.ERP_KB_DRAFT_MAX_SOURCE_URL_CHARS || 2048);
const MAX_TAGS = Number(process.env.ERP_KB_DRAFT_MAX_TAGS || 20);
const MAX_TAG_CHARS = Number(process.env.ERP_KB_DRAFT_MAX_TAG_CHARS || 64);
const MAX_DRAFTS_PER_DAY = Number(process.env.ERP_KB_DRAFT_MAX_PER_DAY || 100);
const MAX_AUTO_DRAFTS_PER_DAY = Number(process.env.ERP_KB_AUTO_DRAFT_MAX_PER_DAY || 25);
const AUTO_DRAFT_SOURCES = new Set(['exa', 'source_list']);
const ALLOWED_SOURCE_DOMAINS = String(process.env.ERP_KB_DRAFT_ALLOWED_SOURCE_DOMAINS || [
  'pomoc.comarch.pl',
  'pomoc.comarchbetterfly.pl',
  'comarch.pl',
  'comarchbetterfly.pl',
  'spolecznosc.comarch.pl',
  'gov.pl',
  'podatki.gov.pl',
  'zus.pl',
  'pip.gov.pl',
  'biznes.gov.pl',
  'isap.sejm.gov.pl',
  'dziennikustaw.gov.pl',
  'sejm.gov.pl',
  'praca.gov.pl',
  'infor.pl',
  'poradnikprzedsiebiorcy.pl',
  'pit.pl',
  'lexlege.pl',
  'rachunkowosc.com.pl',
].join(','))
  .split(',')
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

const ALLOWED_KB_NAMESPACES = new Set([
  'ComarchOptimaSchema',
  'ComarchOptimaAdditionalFunctions',
  'ComarchOptimaSprint',
  'ComarchOptimaReference',
  'ComarchOptimaPartnerTechnical',
  'ComarchOptimaBusinessSemantics',
  'ComarchBetterflyReference',
  'ComarchCommunityNews',
  'TaxbellLegalReference',
  'TaxbellPayrollHRReference',
  'TaxbellAccountingVATReference',
  'ComarchUniversalKnowledge',
  'OWAOntology',
]);
const ALLOWED_SOURCE_TIERS = new Set(['official', 'community', 'third_party', 'official_law', 'official_authority', 'professional_commentary', 'news_or_low', 'operator_draft']);

function countJsonFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .length;
}

function readJsonDrafts(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .flatMap((entry) => {
      try {
        return [JSON.parse(fs.readFileSync(path.join(dirPath, entry.name), 'utf8'))];
      } catch {
        return [];
      }
    });
}

function sourceDomainAllowed(sourceUrl, metadata) {
  if (!sourceUrl || !ALLOWED_SOURCE_DOMAINS.length) return true;
  const sourceTier = metadata?.sourceTier || '';
  if (metadata?.discoveredVia === 'source_list') {
    return true;
  }
  if (sourceTier === 'third_party' && metadata?.discoveredVia === 'exa') {
    return false;
  }
  const hostname = new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, '');
  return ALLOWED_SOURCE_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

function toSlug(value) {
  return String(value || 'knowledge-item')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'knowledge-item';
}

function isoDateStamp(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

function buildMarkdown(draft) {
  const lines = [
    `# ${draft.title}`,
    '',
    `- id: \`${draft.id}\``,
    `- kb: \`${draft.kbName}\``,
    `- namespace: \`${draft.kbNamespace}\``,
    `- createdAt: \`${draft.createdAt}\``,
    draft.sourceUrl ? `- sourceUrl: ${draft.sourceUrl}` : null,
    draft.tags.length ? `- tags: ${draft.tags.map((tag) => `\`${tag}\``).join(', ')}` : null,
    draft.metadata?.discoveredVia ? `- discoveredVia: \`${draft.metadata.discoveredVia}\`` : null,
    draft.metadata?.exaQuery ? `- exaQuery: ${draft.metadata.exaQuery}` : null,
    draft.metadata?.sourceTier ? `- sourceTier: \`${draft.metadata.sourceTier}\`` : null,
    draft.metadata?.retrievedAt ? `- retrievedAt: \`${draft.metadata.retrievedAt}\`` : null,
    '',
    '## Content',
    '',
    draft.content.trim(),
    '',
  ].filter(Boolean);
  return lines.join('\n');
}

function buildDraft({ kbName, kbNamespace, title, content, sourceUrl, tags, metadata }) {
  const now = new Date();
  const id = `draft_${isoDateStamp(now)}_${randomUUID().slice(0, 8)}_${toSlug(title)}`;
  return {
    id,
    kbName: String(kbName || '').trim(),
    kbNamespace: String(kbNamespace || '').trim(),
    title: String(title || '').trim(),
    content: String(content || '').trim(),
    sourceUrl: sourceUrl ? String(sourceUrl).trim() : '',
    tags: Array.isArray(tags) ? tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
    metadata: metadata && typeof metadata === 'object' ? metadata : null,
    createdAt: now.toISOString(),
  };
}

function assertLength(name, value, maxChars) {
  if (String(value || '').length > maxChars) {
    throw new Error(`${name} exceeds ${maxChars} characters`);
  }
}

function validateDraft(draft) {
  if (!draft.kbName || !draft.kbNamespace || !draft.title || !draft.content) {
    throw new Error('kbName, kbNamespace, title, and content are required');
  }
  if (!ALLOWED_KB_NAMESPACES.has(draft.kbNamespace)) {
    throw new Error(`Unsupported kbNamespace: ${draft.kbNamespace}`);
  }
  assertLength('title', draft.title, MAX_TITLE_CHARS);
  assertLength('content', draft.content, MAX_CONTENT_CHARS);
  assertLength('sourceUrl', draft.sourceUrl, MAX_SOURCE_URL_CHARS);
  if (draft.sourceUrl) {
    try {
      const url = new URL(draft.sourceUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('sourceUrl must use http or https');
      }
    } catch (error) {
      throw new Error(`Invalid sourceUrl: ${error.message}`);
    }
  }
  if (draft.tags.length > MAX_TAGS) {
    throw new Error(`tags exceeds ${MAX_TAGS} items`);
  }
  for (const tag of draft.tags) {
    assertLength('tag', tag, MAX_TAG_CHARS);
  }
  if (draft.metadata) {
    if (draft.metadata.discoveredVia && !AUTO_DRAFT_SOURCES.has(draft.metadata.discoveredVia)) {
      throw new Error(`Unsupported discoveredVia: ${draft.metadata.discoveredVia}`);
    }
    if (draft.metadata.exaQuery) {
      assertLength('metadata.exaQuery', draft.metadata.exaQuery, MAX_CONTENT_CHARS);
    }
    if (draft.metadata.sourceTier && !ALLOWED_SOURCE_TIERS.has(draft.metadata.sourceTier)) {
      throw new Error(`Unsupported sourceTier: ${draft.metadata.sourceTier}`);
    }
    if (draft.metadata.retrievedAt && Number.isNaN(Date.parse(draft.metadata.retrievedAt))) {
      throw new Error('metadata.retrievedAt must be a valid ISO timestamp');
    }
  }
}

export async function submitKnowledgeDraft(input, options = {}) {
  const draft = buildDraft(input);
  validateDraft(draft);

  const dayDir = path.join(INBOX_ROOT, isoDateStamp());
  const draftCount = countJsonFiles(dayDir);
  if (draftCount >= MAX_DRAFTS_PER_DAY) {
    throw new Error(`Daily draft limit reached: ${MAX_DRAFTS_PER_DAY}`);
  }
  if (!sourceDomainAllowed(draft.sourceUrl, draft.metadata)) {
    throw new Error(`sourceUrl domain is not allowed for draft ingestion: ${draft.sourceUrl}`);
  }
  if (AUTO_DRAFT_SOURCES.has(draft.metadata?.discoveredVia)) {
    const autoDraftCount = readJsonDrafts(dayDir)
      .filter((item) => AUTO_DRAFT_SOURCES.has(item.metadata?.discoveredVia))
      .length;
    if (autoDraftCount >= MAX_AUTO_DRAFTS_PER_DAY) {
      throw new Error(`Daily automatic draft limit reached: ${MAX_AUTO_DRAFTS_PER_DAY}`);
    }
  }
  await ensureDir(dayDir);

  const baseName = `${draft.id}`;
  const jsonPath = path.join(dayDir, `${baseName}.json`);
  const mdPath = path.join(dayDir, `${baseName}.md`);

  await writeFile(jsonPath, `${JSON.stringify(draft, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  await writeFile(mdPath, buildMarkdown(draft), { encoding: 'utf8', flag: 'wx' });
  const automation = triggerAutomationForDraft(draft);

  if (!options.silent) {
    process.stdout.write(JSON.stringify({
      ok: true,
      event: 'knowledge_draft_saved',
      draftId: draft.id,
      kbNamespace: draft.kbNamespace,
      jsonPath,
      mdPath,
    }) + '\n');
  }

  return {
    draft,
    jsonPath,
    mdPath,
    automation,
  };
}
