#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { loadPromotedKnowledge } from './lib/promoted_knowledge.mjs';
import { ensureDir, writeCsv, slug, makeId } from './lib/export_utils.mjs';

const ROOT = '/docker/openspg';
const KB_NAME = 'ComarchBetterflyReference';
const EXPORT_DIR = path.join(ROOT, 'exports/betterfly_reference/v1');
const MANIFEST_PATH = path.join(EXPORT_DIR, '_manifest.json');
const README_PATH = path.join(EXPORT_DIR, 'README.md');
const SOURCE_ROOT = path.join(ROOT, 'downloads/official/betterfly_reference');
const PAGES_DIR = path.join(SOURCE_ROOT, 'pages');
const META_DIR = path.join(SOURCE_ROOT, 'meta');
const SOURCE_REGISTRY_PATH = path.join(META_DIR, 'source_registry.json');
const LIVE_PROBE_DOC_PATH = path.join(ROOT, 'docs/reference/ComarchBetterflyReference.live_probe.md');
const CONTRACT_NOTES_DOC_PATH = path.join(ROOT, 'docs/reference/ComarchBetterflyReference.contract_notes.md');
const WRITE_NOTES_DOC_PATH = path.join(ROOT, 'docs/reference/ComarchBetterflyReference.write_notes.md');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function fileHashForRelativePath(relativePath) {
  const filePath = path.join(ROOT, relativePath || '');
  if (!relativePath || !fs.existsSync(filePath)) return '';
  return sha256(fs.readFileSync(filePath));
}

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function truncate(value, limit = 1200) {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 3)}...`;
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

function stripHtml(html) {
  return normalizeWhitespace(
    String(html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&#8211;/g, '-')
      .replace(/&#8212;/g, '-')
      .replace(/&#8222;/g, '"')
      .replace(/&#8221;/g, '"')
      .replace(/&#039;/g, "'"),
  );
}

function extractTitleFromHtml(html, fallback) {
  const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1) return stripHtml(h1[1]);
  const title = html.match(/<title>(.*?)<\/title>/i);
  if (title) return stripHtml(title[1]).replace(/\s*-\s*Baza Wiedzy.*$/, '');
  return fallback;
}

function extractCanonicalUrl(html) {
  return html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1] || '';
}

function extractMetaDescription(html) {
  return stripHtml(html.match(/<meta name="description" content="([^"]*)"/i)?.[1] || '');
}

function extractUpdatedTime(html) {
  return html.match(/<meta property="article:modified_time" content="([^"]+)"/i)?.[1] || '';
}

function extractParagraphsFromHtml(html) {
  const matches = [...String(html || '').matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
  return matches
    .map((match) => stripHtml(match[1]))
    .filter(Boolean)
    .filter((text) => text.length > 20);
}

function buildParagraphChunks(paragraphs, size = 3) {
  const chunks = [];
  for (let index = 0; index < paragraphs.length; index += size) {
    const batch = paragraphs.slice(index, index + size);
    if (!batch.length) continue;
    chunks.push(normalizeWhitespace(batch.join('\n\n')));
  }
  return chunks;
}

function isChunkEligiblePage({ canonicalUrl, relPath, documentCategory }) {
  const key = `${canonicalUrl} ${relPath}`.toLowerCase();
  if (/spis-tresci/.test(key)) return false;
  if (/api_article/.test(documentCategory)) return true;
  if (/comarch-erp-xt/.test(key)) return true;
  return false;
}

function snapshotSlug(filePath) {
  return path.basename(filePath, path.extname(filePath)).replace(/_/g, '-');
}

function humanizeSlug(value) {
  return String(value || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function inferDocumentCategory({ url, title, slug: pageSlug }) {
  const lower = `${url} ${title} ${pageSlug}`.toLowerCase();
  if (/api/.test(lower)) return 'api_article';
  if (/spis-tresci/.test(lower)) return 'table_of_contents';
  if (/comarch-erp-xt|dawniej/.test(lower)) return 'legacy_context';
  if (/zmiany|historia-zmian/.test(lower)) return 'updates';
  if (/print/.test(lower)) return 'offline_snapshot';
  return 'help_article';
}

function inferModuleScope({ url, title }) {
  const lower = `${url} ${title}`.toLowerCase();
  if (/api/.test(lower)) return 'PublicAPI';
  if (/platnos|rachunki-bankowe|formy-platnosci/.test(lower)) return 'PaymentsAndBanking';
  if (/faktura|proforma|korekty|vat/.test(lower)) return 'SalesDocuments';
  if (/produkty/.test(lower)) return 'Products';
  if (/kontrahenci/.test(lower)) return 'Customers';
  if (/wydruki|sprint|szablon/.test(lower)) return 'Printing';
  if (/uwierzytelnianie|instrukcja-uzytkownika/.test(lower)) return 'AuthenticationAndAccess';
  if (/comarch-erp-xt/.test(lower)) return 'LegacyContext';
  return 'General';
}

function inferSourceType({ canonicalUrl, filePath }) {
  if (/\/kategorie\//.test(canonicalUrl)) return 'category_page';
  if (/spis-tresci/.test(canonicalUrl) || /spis-tresci/.test(filePath)) return 'toc_page';
  return 'help_article';
}

function inferCategoryHint({ title, canonicalUrl }) {
  const lower = `${title} ${canonicalUrl}`.toLowerCase();
  if (/api/.test(lower)) return 'API';
  if (/comarch-erp-xt/.test(lower)) return 'Legacy';
  if (/spis-tresci/.test(lower)) return 'Navigation';
  return 'General';
}

function extractEndpoints(text) {
  const regex = /https:\/\/app\.comarchbetterfly\.pl\/api2\/public(?:\/[A-Za-z0-9._{}-]+)+(?:\?[^\s<)"']+)?/g;
  return [...new Set([...String(text || '').matchAll(regex)].map((match) => match[0]))];
}

function extractMethodEndpointPairs(text) {
  const regex = /\[(GET|POST|PUT|DELETE|DEL)\]\s*(https:\/\/app\.comarchbetterfly\.pl\/api2\/public(?:\/[A-Za-z0-9._{}-]+)+(?:\?[^\s<)"']+)?)/gi;
  return [...String(text || '').matchAll(regex)].map((match) => ({
    method: match[1].toUpperCase() === 'DEL' ? 'DELETE' : match[1].toUpperCase(),
    endpoint: match[2],
  }));
}

function endpointVersion(endpoint) {
  return endpoint.match(/\/public\/(v\d+(?:\.\d+)?)\//i)?.[1] || 'unversioned';
}

function normalizeEndpoint(endpoint) {
  return String(endpoint || '')
    .replace(/^https:\/\/app\.comarchbetterfly\.pl/i, '')
    .replace(/\/XXX\b/gi, '/{id}')
    .replace(/\/\d+\b/g, '/{id}')
    .replace(/\{id\}/gi, '{id}');
}

function endpointBase(endpoint) {
  const normalized = normalizeEndpoint(endpoint).split('?')[0];
  const parts = normalized.split('/').filter(Boolean);
  const publicIndex = parts.indexOf('public');
  if (publicIndex === -1) return normalized;
  const start = parts.slice(0, publicIndex + 1);
  const tail = parts.slice(publicIndex + 1);
  const result = [...start];
  for (const part of tail) {
    if (part === '{id}') break;
    if (/^(confirm|finalize|canFinalize)$/i.test(part) && result.length > start.length) break;
    result.push(part);
    if (result.length >= start.length + 2) break;
  }
  return `/${result.join('/')}`;
}

function resourceCodeFromEndpoint(endpoint) {
  const parts = endpointBase(endpoint).split('/').filter(Boolean);
  const tail = parts.slice(2); // after api2/public
  return slug(tail.join('_') || 'resource');
}

function resourceGroupFromTitle(title) {
  const lower = String(title || '').toLowerCase();
  if (/produkty/.test(lower)) return 'Products';
  if (/kontrahenci/.test(lower)) return 'Customers';
  if (/platnos|rachunki-bankowe|formy-platnosci/.test(lower)) return 'PaymentsAndBanking';
  if (/faktura|proforma|korekty|vat/.test(lower)) return 'SalesDocuments';
  if (/wydruki/.test(lower)) return 'Printing';
  if (/oss/.test(lower)) return 'CrossBorderTax';
  if (/uwierzytelnianie|instrukcja/.test(lower)) return 'Authentication';
  return 'GeneralAPI';
}

function generatedSummary({ title, moduleScope, documentCategory, lastModified, description }) {
  const freshness = lastModified ? ` Last updated ${String(lastModified).slice(0, 10)}.` : '';
  return truncate(
    `Official Comarch Betterfly article covering ${title}. Category: ${documentCategory}. Module scope: ${moduleScope}.${description ? ` ${description}` : ''}${freshness}`,
    420,
  );
}

function useCaseFrom(title, method, endpoint) {
  const lowerTitle = String(title || '').toLowerCase();
  if (lowerTitle.includes('uwierzytelnianie')) return 'Authorize and obtain API access';
  if (lowerTitle.includes('historia zmian')) return 'Track API evolution and version impact';
  if (lowerTitle.includes('filtrowanie')) return 'Filter, sort, and page resource collections';
  if (method === 'GET' && /\/\{id\}$/.test(normalizeEndpoint(endpoint))) return 'Get one resource by identifier';
  if (method === 'GET') return 'Read resource collection or status';
  if (method === 'POST' && /finalize/i.test(endpoint)) return 'Trigger business conversion/finalization';
  if (method === 'POST') return 'Create new resource';
  if (method === 'PUT' && /confirm/i.test(endpoint)) return 'Confirm previously created document';
  if (method === 'PUT') return 'Update existing resource';
  if (method === 'DELETE') return 'Delete resource';
  return `Use ${method} on ${title}`;
}

function sectionHeadingFrom(title, content) {
  if (/oauth|uwierzytelnianie/i.test(content)) return 'Authentication';
  if (/\$filter|\$orderby|\$skip|\$top|\$fts/.test(content)) return 'FilteringAndPaging';
  if (/\[GET\]|\[POST\]|\[PUT\]|\[DELETE\]|\[DEL\]/.test(content)) return 'EndpointExamples';
  if (/200 OK|401 Unauthorized|500 Internal Server Error/.test(content)) return 'StatusCodes';
  return title;
}

ensureDir(EXPORT_DIR);
ensureDir(META_DIR);

const pageFiles = listFilesRecursive(PAGES_DIR).filter((filePath) => filePath.endsWith('.html'));
const rawPageRecords = pageFiles.map((filePath) => {
  const html = fs.readFileSync(filePath, 'utf8');
  const slugValue = snapshotSlug(filePath);
  const canonicalUrl = extractCanonicalUrl(html);
  const title = extractTitleFromHtml(html, humanizeSlug(slugValue));
  const description = extractMetaDescription(html);
  const lastModified = extractUpdatedTime(html);
  const paragraphs = extractParagraphsFromHtml(html);
  const plainText = stripHtml(html);
  const endpoints = extractEndpoints(html);
  const pairs = extractMethodEndpointPairs(html);
  return {
    filePath,
    relPath: path.relative(ROOT, filePath).replaceAll(path.sep, '/'),
    slug: slugValue,
    canonicalUrl,
    title,
    description,
    lastModified,
    paragraphs,
    plainText,
    endpoints,
    pairs,
  };
});

const pageRecordMap = new Map();
for (const page of rawPageRecords) {
  const key = page.canonicalUrl || page.relPath;
  const existing = pageRecordMap.get(key);
  if (!existing) {
    pageRecordMap.set(key, page);
    continue;
  }
  const existingScore =
    existing.endpoints.length * 10 +
    existing.paragraphs.length * 2 +
    (existing.filePath.includes('api-') ? 5 : 0);
  const pageScore =
    page.endpoints.length * 10 +
    page.paragraphs.length * 2 +
    (page.filePath.includes('api-') ? 5 : 0);
  if (pageScore > existingScore) {
    pageRecordMap.set(key, page);
  }
}
const pageRecords = [...pageRecordMap.values()].sort((a, b) => a.filePath.localeCompare(b.filePath));

const referenceDocuments = pageRecords.map((page) => {
  const moduleScope = inferModuleScope({ url: page.canonicalUrl, title: page.title });
  const documentCategory = inferDocumentCategory({ url: page.canonicalUrl, title: page.title, slug: page.slug });
  return {
    id: makeId('BFRD', page.canonicalUrl || page.relPath),
    name: page.title,
    description: truncate(page.description || page.paragraphs[0] || '', 800),
    semanticType: documentCategory === 'api_article' ? 'betterflyApiArticle' : 'betterflyHelpArticle',
    sourceUrl: page.canonicalUrl,
    sourceType: inferSourceType({ canonicalUrl: page.canonicalUrl, filePath: page.filePath }),
    documentCategory,
    moduleScope,
    categoryHint: inferCategoryHint({ title: page.title, canonicalUrl: page.canonicalUrl }),
    versionHint: [...new Set(page.endpoints.map(endpointVersion))].filter(Boolean).join('; '),
    lastModified: page.lastModified,
    localSnapshotPath: page.relPath,
    sourceOrigin: 'OfficialBetterflyHelp',
    summary: generatedSummary({
      title: page.title,
      moduleScope,
      documentCategory,
      lastModified: page.lastModified,
      description: page.description,
    }),
  };
});

const liveProbeContent = fs.existsSync(LIVE_PROBE_DOC_PATH)
  ? normalizeWhitespace(fs.readFileSync(LIVE_PROBE_DOC_PATH, 'utf8'))
  : '';
const contractNotesContent = fs.existsSync(CONTRACT_NOTES_DOC_PATH)
  ? normalizeWhitespace(fs.readFileSync(CONTRACT_NOTES_DOC_PATH, 'utf8'))
  : '';
const writeNotesContent = fs.existsSync(WRITE_NOTES_DOC_PATH)
  ? normalizeWhitespace(fs.readFileSync(WRITE_NOTES_DOC_PATH, 'utf8'))
  : '';
const liveProbeDocument =
  liveProbeContent
    ? {
        id: 'BFRD_LIVE_API_METADATA_PROBE',
        name: 'Betterfly Live API Metadata Probe',
        description: truncate(
          'Safe metadata-only validation note for Betterfly token flow, Bearer auth usage, response-envelope shape, and mixed endpoint versioning.',
          800,
        ),
        semanticType: 'betterflyApiArticle',
        sourceUrl: 'local://betterfly/live-api-metadata-probe/2026-05-26',
        sourceType: 'local_metadata_probe',
        documentCategory: 'api_live_metadata',
        moduleScope: 'AuthenticationAndAccess',
        categoryHint: 'API',
        versionHint: 'AuthAndVersioning',
        lastModified: '2026-05-26',
        localSnapshotPath: path.relative(ROOT, LIVE_PROBE_DOC_PATH).replaceAll(path.sep, '/'),
        sourceOrigin: 'LiveApiMetadataProbe',
        summary: truncate(
          'Metadata-only Betterfly live API validation note covering token endpoint, Bearer auth, array response envelopes, and mixed versioned versus unversioned endpoint families.',
          420,
        ),
      }
    : null;
const contractNotesDocument =
  contractNotesContent
    ? {
        id: 'BFRD_API_CONTRACT_NOTES',
        name: 'Betterfly API Contract Notes',
        description: truncate(
          'Metadata-only contract notes for selected Betterfly API endpoints, focused on top-level keys, envelope shape, and integration cautions.',
          800,
        ),
        semanticType: 'betterflyApiArticle',
        sourceUrl: 'local://betterfly/api-contract-notes/2026-05-26',
        sourceType: 'local_contract_notes',
        documentCategory: 'api_contract_notes',
        moduleScope: 'PublicAPI',
        categoryHint: 'API',
        versionHint: 'ContractsAndShapes',
        lastModified: '2026-05-26',
        localSnapshotPath: path.relative(ROOT, CONTRACT_NOTES_DOC_PATH).replaceAll(path.sep, '/'),
        sourceOrigin: 'LocalContractNotes',
        summary: truncate(
          'Metadata-only Betterfly contract notes covering selected endpoint response shapes, top-level keys, and integration cautions for products, customers, invoices, paymentdetails, payments, and print flows.',
          420,
        ),
      }
    : null;
const writeNotesDocument =
  writeNotesContent
    ? {
        id: 'BFRD_API_WRITE_NOTES',
        name: 'Betterfly API Write-Side Notes',
        description: truncate(
          'Metadata-only write-side integration notes for Betterfly create, update, confirm, delete, and finalize workflows.',
          800,
        ),
        semanticType: 'betterflyApiArticle',
        sourceUrl: 'local://betterfly/api-write-notes/2026-05-26',
        sourceType: 'local_write_notes',
        documentCategory: 'api_write_notes',
        moduleScope: 'PublicAPI',
        categoryHint: 'API',
        versionHint: 'WriteWorkflows',
        lastModified: '2026-05-26',
        localSnapshotPath: path.relative(ROOT, WRITE_NOTES_DOC_PATH).replaceAll(path.sep, '/'),
        sourceOrigin: 'LocalWriteNotes',
        summary: truncate(
          'Metadata-only Betterfly write-side notes covering create, update, confirm, delete, and finalize workflow families across products, customers, payments, and document resources.',
          420,
        ),
      }
    : null;

if (liveProbeDocument) {
  referenceDocuments.push(liveProbeDocument);
}
if (contractNotesDocument) {
  referenceDocuments.push(contractNotesDocument);
}
if (writeNotesDocument) {
  referenceDocuments.push(writeNotesDocument);
}

const promotedKnowledge = loadPromotedKnowledge(KB_NAME);
const promotedKnowledgeDocuments = [];
const promotedDocumentBySource = new Map();
const promotedDocumentIdByDraft = new Map();
for (const draft of promotedKnowledge) {
  const sourceUrl = draft.sourceUrl || `local://knowledge-inbox/${draft.id}`;
  const existing = promotedDocumentBySource.get(sourceUrl);
  if (existing) {
    promotedDocumentIdByDraft.set(draft.id, existing.id);
    existing.categoryHint = [...new Set([
      ...String(existing.categoryHint || '').split('; ').filter(Boolean),
      ...(draft.tags || []),
    ])].join('; ');
    if (String(draft.content || '').length > String(existing.summary || '').length) {
      existing.summary = truncate(draft.content, 420);
    }
    continue;
  }
  const document = {
    id: makeId('BFRD_PROMOTED', draft.id),
    name: draft.title,
    description: truncate(`Promoted knowledge inbox draft for ${draft.kbName}.`, 800),
    semanticType: 'betterflyPromotedKnowledge',
    sourceUrl,
    sourceType: 'promoted_knowledge_draft',
    documentCategory: 'promoted_knowledge',
    moduleScope: inferModuleScope({ url: draft.sourceUrl || '', title: `${draft.title} ${draft.content}` }),
    categoryHint: draft.tags?.join('; ') || 'KnowledgeInbox',
    versionHint: draft.promotedAt ? draft.promotedAt.slice(0, 10) : '',
    lastModified: draft.promotedAt || '',
    localSnapshotPath: draft.promotedMarkdownPath,
    sourceOrigin: 'KnowledgeInboxPromoted',
    summary: truncate(draft.content, 420),
  };
  promotedKnowledgeDocuments.push(document);
  promotedDocumentBySource.set(sourceUrl, document);
  promotedDocumentIdByDraft.set(draft.id, document.id);
}
referenceDocuments.push(...promotedKnowledgeDocuments);

const referenceByUrl = new Map(referenceDocuments.map((row) => [row.sourceUrl, row]));

const helpCategories = [
  {
    id: 'BFCAT_API',
    name: 'API',
    description: 'Official Betterfly API documentation and endpoint reference.',
    semanticType: 'betterflyHelpCategory',
    sourceUrl: 'https://pomoc.comarchbetterfly.pl/kategorie/api/',
    categorySlug: 'api',
    categoryGroup: 'api',
    moduleScope: 'PublicAPI',
    priorityTier: 'top',
    summary: 'Primary category for Betterfly public API onboarding, resources, and endpoint usage.',
  },
  {
    id: 'BFCAT_NAV',
    name: 'Navigation',
    description: 'Official Betterfly table-of-contents and orientation layer.',
    semanticType: 'betterflyHelpCategory',
    sourceUrl: 'https://pomoc.comarchbetterfly.pl/spis-tresci/',
    categorySlug: 'spis-tresci',
    categoryGroup: 'orientation',
    moduleScope: 'General',
    priorityTier: 'top',
    summary: 'Entry category for navigating Betterfly official help coverage.',
  },
  {
    id: 'BFCAT_LEGACY',
    name: 'ERP XT Legacy Context',
    description: 'Context for articles still referring to the older Comarch ERP XT naming.',
    semanticType: 'betterflyHelpCategory',
    sourceUrl: 'https://pomoc.comarchbetterfly.pl/dokumentacja/comarch-erp-xt/',
    categorySlug: 'comarch-erp-xt',
    categoryGroup: 'legacy',
    moduleScope: 'LegacyContext',
    priorityTier: 'detail',
    summary: 'Legacy naming bridge between Comarch ERP XT and Comarch Betterfly documentation.',
  },
];

const moduleAreas = [
  {
    id: 'BFMOD_API_START',
    name: 'Public API Start',
    description: 'Start here for Betterfly public API access, concepts, and HTTP model.',
    semanticType: 'betterflyModuleArea',
    moduleCode: 'PublicAPI',
    scopeType: 'api_entry',
    anchorDocumentRefId: referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/api-informacje-ogolne/')?.id || '',
    relatedCategories: 'API; Navigation',
    recommendedFor: 'API onboarding, endpoint discovery, integration design',
    caution: 'Read authentication and change-history articles before implementing write operations.',
    summary: 'Core Betterfly API onboarding area centered on overview, access model, and resource families.',
  },
  {
    id: 'BFMOD_API_AUTH',
    name: 'Authentication And Access',
    description: 'OAuth 2.0 access model, account enablement, and application registration.',
    semanticType: 'betterflyModuleArea',
    moduleCode: 'AuthenticationAndAccess',
    scopeType: 'api_support',
    anchorDocumentRefId: referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/api-uwierzytelnianie/')?.id || '',
    relatedCategories: 'API',
    recommendedFor: 'Authorization design and operational access setup',
    caution: 'This is prerequisite material for any API client work.',
    summary: 'Authentication-focused module area for Betterfly API client registration and OAuth flow.',
  },
  {
    id: 'BFMOD_API_DOCS',
    name: 'Sales And Purchase Documents',
    description: 'Invoice, proforma, advance invoice, corrective invoice, and VAT purchase register resources.',
    semanticType: 'betterflyModuleArea',
    moduleCode: 'SalesDocuments',
    scopeType: 'api_domain',
    anchorDocumentRefId: referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/api-faktura-sprzedazy/')?.id || '',
    relatedCategories: 'API',
    recommendedFor: 'Document creation, update, confirmation, and corrections',
    caution: 'Version hints differ across document resource families.',
    summary: 'Domain area for Betterfly commercial and purchase document API resources.',
  },
  {
    id: 'BFMOD_API_PAY',
    name: 'Payments And Banking',
    description: 'Payments, payment types, and bank account resources.',
    semanticType: 'betterflyModuleArea',
    moduleCode: 'PaymentsAndBanking',
    scopeType: 'api_domain',
    anchorDocumentRefId: referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/api-platnosci/')?.id || '',
    relatedCategories: 'API',
    recommendedFor: 'Payment-state integrations and supporting dictionaries',
    caution: 'Payment details and payment status use different endpoint families.',
    summary: 'Domain area for Betterfly payment APIs and supporting banking dictionaries.',
  },
  {
    id: 'BFMOD_LEGACY',
    name: 'Legacy Naming Context',
    description: 'Bridge older ERP XT language to current Betterfly terminology.',
    semanticType: 'betterflyModuleArea',
    moduleCode: 'LegacyContext',
    scopeType: 'support',
    anchorDocumentRefId: referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/comarch-erp-xt/')?.id || '',
    relatedCategories: 'ERP XT Legacy Context',
    recommendedFor: 'Interpreting older docs, screenshots, and endpoint notes',
    caution: 'Do not assume old article naming implies obsolete endpoint behavior without checking version hints.',
    summary: 'Legacy context area for interpreting Betterfly docs that still mention Comarch ERP XT.',
  },
];

const apiResourceMap = new Map();
const apiPatternMap = new Map();
for (const page of pageRecords) {
  if (!/\/dokumentacja\/api-/i.test(page.canonicalUrl)) continue;
  const sourceDocumentRefId = referenceByUrl.get(page.canonicalUrl)?.id || '';
  const seenPairs = new Set();
  for (const pair of page.pairs) {
    const pairKey = `${pair.method} ${normalizeEndpoint(pair.endpoint)}`;
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);
    const base = endpointBase(pair.endpoint);
    const key = `${base}`;
    const resource = apiResourceMap.get(key) || {
      id: makeId('BFAPIRES', key),
      name: page.title.replace(/^API\s*[-–]\s*/i, ''),
      description: truncate(page.description || page.paragraphs[0] || '', 800),
      semanticType: 'betterflyApiResource',
      resourceCode: resourceCodeFromEndpoint(pair.endpoint),
      resourceGroup: resourceGroupFromTitle(page.title),
      endpointBase: base,
      versionHint: endpointVersion(pair.endpoint),
      supportedMethods: new Set(),
      authModel: 'OAuth2',
      sourceDocumentRefIds: new Set(),
      exampleEndpoints: new Set(),
    };
    resource.supportedMethods.add(pair.method);
    resource.sourceDocumentRefIds.add(sourceDocumentRefId);
    resource.exampleEndpoints.add(normalizeEndpoint(pair.endpoint));
    apiResourceMap.set(key, resource);

    const patternId = makeId('BFAPIPAT', `${page.canonicalUrl}_${pair.method}_${normalizeEndpoint(pair.endpoint)}`);
    apiPatternMap.set(patternId, {
      id: patternId,
      name: `${page.title} ${pair.method} ${normalizeEndpoint(pair.endpoint)}`,
      description: truncate(page.description || page.paragraphs[0] || '', 800),
      semanticType: 'betterflyApiPattern',
      patternType: /confirm|finalize/i.test(pair.endpoint) ? 'workflow_action' : 'endpoint_call',
      httpMethod: pair.method,
      endpointPath: normalizeEndpoint(pair.endpoint),
      versionHint: endpointVersion(pair.endpoint),
      useCase: useCaseFrom(page.title, pair.method, pair.endpoint),
      sourceDocumentRefId,
      exampleSnippet: `${pair.method} ${normalizeEndpoint(pair.endpoint)}`,
      summary: truncate(
        `${useCaseFrom(page.title, pair.method, pair.endpoint)}. Source article: ${page.title}. Endpoint: ${normalizeEndpoint(pair.endpoint)}.`,
        420,
      ),
    });
  }
}

const apiPatterns = [...apiPatternMap.values()].sort((a, b) => a.name.localeCompare(b.name));
if (liveProbeDocument) {
  apiPatterns.push(
    {
      id: 'BFAPIPAT_TOKEN_FLOW',
      name: 'Betterfly Token Acquisition',
      description: 'Acquire an access token with client credentials using Basic authorization and form-urlencoded body.',
      semanticType: 'betterflyApiPattern',
      patternType: 'auth_flow',
      httpMethod: 'POST',
      endpointPath: '/api2/public/token',
      versionHint: 'unversioned',
      useCase: 'Obtain access token for Betterfly public API calls',
      sourceDocumentRefId: liveProbeDocument.id,
      exampleSnippet: 'POST /api2/public/token + Authorization: Basic base64(clientId:clientSecret) + grant_type=client_credentials',
      summary: 'Confirmed Betterfly token flow: POST /api2/public/token with Basic client credentials and grant_type=client_credentials returns access_token, token_type, and expires.',
    },
    {
      id: 'BFAPIPAT_BEARER_AUTH',
      name: 'Betterfly Bearer Authorization',
      description: 'Use the access token from the token endpoint as a Bearer token for API requests.',
      semanticType: 'betterflyApiPattern',
      patternType: 'auth_header',
      httpMethod: 'GET',
      endpointPath: '/api2/public/*',
      versionHint: 'mixed',
      useCase: 'Authorize Betterfly public API requests after token acquisition',
      sourceDocumentRefId: liveProbeDocument.id,
      exampleSnippet: 'Authorization: Bearer <access_token>',
      summary: 'Confirmed Betterfly request authorization pattern: API calls use Authorization: Bearer <access_token> obtained from POST /api2/public/token.',
    },
    {
      id: 'BFAPIPAT_ARRAY_ENVELOPE',
      name: 'Betterfly Collection Response Shape',
      description: 'Selected collection endpoints return bare JSON arrays rather than items/data/results envelopes.',
      semanticType: 'betterflyApiPattern',
      patternType: 'response_shape',
      httpMethod: 'GET',
      endpointPath: '/api2/public/*?$top=1',
      versionHint: 'mixed',
      useCase: 'Parse Betterfly collection responses safely',
      sourceDocumentRefId: liveProbeDocument.id,
      exampleSnippet: 'GET /api2/public/products?$top=1 -> JSON array',
      summary: 'Confirmed Betterfly collection-envelope pattern: tested read endpoints returned bare JSON arrays, not wrapped items/data/results envelopes.',
    },
    {
      id: 'BFAPIPAT_VERSION_MIX',
      name: 'Betterfly Mixed Endpoint Versioning',
      description: 'Betterfly public API mixes versioned and unversioned endpoint families.',
      semanticType: 'betterflyApiPattern',
      patternType: 'versioning',
      httpMethod: 'GET',
      endpointPath: '/api2/public/*',
      versionHint: 'mixed',
      useCase: 'Choose correct endpoint path without assuming one global version prefix',
      sourceDocumentRefId: liveProbeDocument.id,
      exampleSnippet: '/api2/public/products versus /api2/public/v1.2/customers versus /api2/public/v1.4/invoices',
      summary: 'Confirmed Betterfly versioning pattern: some resources are unversioned while others live under explicit version prefixes, so path selection must be resource-specific.',
    },
  );
}
if (contractNotesDocument) {
  apiPatterns.push(
    {
      id: 'BFAPIPAT_CONTRACT_PRODUCTS',
      name: 'Betterfly Products Contract Note',
      description: 'Metadata-only contract note for the products collection response shape and top-level keys.',
      semanticType: 'betterflyApiPattern',
      patternType: 'contract_note',
      httpMethod: 'GET',
      endpointPath: '/api2/public/products?$top=1',
      versionHint: 'unversioned',
      useCase: 'Understand top-level fields returned by the products collection',
      sourceDocumentRefId: contractNotesDocument.id,
      exampleSnippet: 'Description; Id; ItemCode; Name; ProductCode; ProductType; Quantity; Rate; SaleGrossPrice; SaleNetPrice; UnitOfMeasurment',
      summary: 'Metadata-only contract note for Betterfly products collection shape: JSON array with product identity, pricing, quantity, and code fields.',
    },
    {
      id: 'BFAPIPAT_CONTRACT_CUSTOMERS',
      name: 'Betterfly Customers Contract Note',
      description: 'Metadata-only contract note for the customers collection response shape and top-level keys.',
      semanticType: 'betterflyApiPattern',
      patternType: 'contract_note',
      httpMethod: 'GET',
      endpointPath: '/api2/public/v1.2/customers?$top=1',
      versionHint: 'v1.2',
      useCase: 'Understand top-level fields returned by the customers collection',
      sourceDocumentRefId: contractNotesDocument.id,
      exampleSnippet: 'Address; CountryCode; CustomerCode; CustomerStatus; CustomerTaxNumber; CustomerType; Id; Mail; Name; PhoneNumber; RepresentativeFirstName; RepresentativeLastName',
      summary: 'Metadata-only contract note for Betterfly customers collection shape: JSON array with customer identity, contact, tax, and representative fields.',
    },
    {
      id: 'BFAPIPAT_CONTRACT_INVOICES',
      name: 'Betterfly Invoices Contract Note',
      description: 'Metadata-only contract note for the invoices collection response shape and top-level keys.',
      semanticType: 'betterflyApiPattern',
      patternType: 'contract_note',
      httpMethod: 'GET',
      endpointPath: '/api2/public/v1.4/invoices?$top=1',
      versionHint: 'v1.4',
      useCase: 'Understand top-level fields returned by the invoices collection',
      sourceDocumentRefId: contractNotesDocument.id,
      exampleSnippet: 'Id; Number; IssueDate; SalesDate; Status; InvoiceType; Items; GrossTotal; NetTotal; VatTotal; PaymentStatus; PurchasingParty; ReceivingParty',
      summary: 'Metadata-only contract note for Betterfly invoices collection shape: JSON array with document identity, totals, party references, payment state, and nested Items.',
    },
    {
      id: 'BFAPIPAT_CONTRACT_PAYMENTDETAILS',
      name: 'Betterfly Payment Details Contract Note',
      description: 'Metadata-only contract note for the paymentdetails collection response shape and top-level keys.',
      semanticType: 'betterflyApiPattern',
      patternType: 'contract_note',
      httpMethod: 'GET',
      endpointPath: '/api2/public/v1.5/paymentdetails?$top=1',
      versionHint: 'v1.5',
      useCase: 'Understand top-level fields returned by the payment details collection',
      sourceDocumentRefId: contractNotesDocument.id,
      exampleSnippet: 'Amount; Balance; Currency; DocumentId; DocumentNumber; DueDate; Payable; PaymentDirection; PaymentId; PaymentStatus; PaymentType; RecipientName; SenderName; Title; VatAmount',
      summary: 'Metadata-only contract note for Betterfly paymentdetails collection shape: JSON array with payment identity, balance, parties, direction, and settlement fields.',
    },
    {
      id: 'BFAPIPAT_CONTRACT_PAYMENTS_CAUTION',
      name: 'Betterfly Payments Probe Caution',
      description: 'Metadata-only caution note for the payments endpoint family based on a safe negative probe.',
      semanticType: 'betterflyApiPattern',
      patternType: 'error_shape',
      httpMethod: 'GET',
      endpointPath: '/api2/public/v1.4/payments?$top=1',
      versionHint: 'v1.4',
      useCase: 'Recognize that payments behavior may differ from paymentdetails and generic list probing assumptions',
      sourceDocumentRefId: contractNotesDocument.id,
      exampleSnippet: '400 -> Code; Message',
      summary: 'Metadata-only caution for Betterfly payments: a safe $top=1 probe returned HTTP 400 with Code and Message, so treat this family separately from paymentdetails.',
    },
    {
      id: 'BFAPIPAT_CONTRACT_PRINT_CAUTION',
      name: 'Betterfly Print Probe Caution',
      description: 'Metadata-only caution note for the invoice print endpoint based on a safe negative probe.',
      semanticType: 'betterflyApiPattern',
      patternType: 'error_shape',
      httpMethod: 'GET',
      endpointPath: '/api2/public/v1.4/invoices/{id}/print',
      versionHint: 'v1.4',
      useCase: 'Treat print endpoints as download/document operations, not ordinary JSON list reads',
      sourceDocumentRefId: contractNotesDocument.id,
      exampleSnippet: '400 -> Code; Data; Message',
      summary: 'Metadata-only caution for Betterfly print endpoints: safe negative probe returned Code, Data, and Message, indicating a different operational shape than normal collection reads.',
    },
  );
}
if (writeNotesDocument) {
  apiPatterns.push(
    {
      id: 'BFAPIPAT_WRITE_CRUD_FAMILIES',
      name: 'Betterfly Write CRUD Families',
      description: 'Curated write-side overview for resource families that expose official create, update, and delete operations.',
      semanticType: 'betterflyApiPattern',
      patternType: 'write_contract',
      httpMethod: 'POST; PUT; DELETE',
      endpointPath: '/api2/public/*',
      versionHint: 'mixed',
      useCase: 'Choose the correct write-side family before implementing request payloads',
      sourceDocumentRefId: writeNotesDocument.id,
      exampleSnippet: 'products; customers; paymenttypes; bankaccounts; proformas; invoices; advanceInvoices',
      summary: 'Curated Betterfly write-side overview for CRUD-capable families across master data and document resources.',
    },
    {
      id: 'BFAPIPAT_WRITE_CONFIRM_FLOWS',
      name: 'Betterfly Confirm Workflow Pattern',
      description: 'Some Betterfly document writes require explicit confirm endpoints after create or update.',
      semanticType: 'betterflyApiPattern',
      patternType: 'workflow_action',
      httpMethod: 'PUT',
      endpointPath: '/api2/public/*/confirm',
      versionHint: 'mixed',
      useCase: 'Model business confirmation as a separate step after draft creation or update',
      sourceDocumentRefId: writeNotesDocument.id,
      exampleSnippet: '/api2/public/v1.5/invoices/confirm; /api2/public/v1.5/correctiveinvoices/confirm; /api2/public/v1.4/advanceInvoices/confirm',
      summary: 'Betterfly document integrations should treat confirm as a separate workflow action, not as an implicit side effect of create or update.',
    },
    {
      id: 'BFAPIPAT_WRITE_FINALIZE_FLOWS',
      name: 'Betterfly Finalize Workflow Pattern',
      description: 'Advance-invoice conversion uses explicit finalize endpoints with behavior-changing query flags.',
      semanticType: 'betterflyApiPattern',
      patternType: 'workflow_action',
      httpMethod: 'POST',
      endpointPath: '/api2/public/v1.2/advanceInvoices/{id}/finalize',
      versionHint: 'v1.2',
      useCase: 'Handle advance-invoice to final-document transitions explicitly',
      sourceDocumentRefId: writeNotesDocument.id,
      exampleSnippet: '/api2/public/v1.2/advanceInvoices/{id}/finalize?convertAll=false|true',
      summary: 'Finalize is a distinct Betterfly business transition and should not be modeled as a plain update call.',
    },
    {
      id: 'BFAPIPAT_WRITE_CORRECTIVE_SEQUENCE',
      name: 'Betterfly Corrective Document Sequence',
      description: 'Corrective documents follow a staged write workflow starting from a source document id.',
      semanticType: 'betterflyApiPattern',
      patternType: 'workflow_sequence',
      httpMethod: 'POST; PUT; DELETE',
      endpointPath: '/api2/public/v1.5/corrective*',
      versionHint: 'v1.5',
      useCase: 'Implement corrective invoice and corrective advance invoice flows safely',
      sourceDocumentRefId: writeNotesDocument.id,
      exampleSnippet: 'POST ?documentId={id} -> PUT -> PUT /confirm -> optional DELETE /{id}',
      summary: 'Corrective Betterfly flows are staged sequences: create from source document, modify, confirm, and only then finalize operational handling.',
    },
    {
      id: 'BFAPIPAT_WRITE_VERSION_CAUTION',
      name: 'Betterfly Write Version Caution',
      description: 'Write-side endpoint families mix v1.2, v1.4, v1.5, and unversioned resources.',
      semanticType: 'betterflyApiPattern',
      patternType: 'versioning',
      httpMethod: 'POST; PUT; DELETE',
      endpointPath: '/api2/public/*',
      versionHint: 'mixed',
      useCase: 'Prevent incorrect assumptions that all write endpoints share one version prefix',
      sourceDocumentRefId: writeNotesDocument.id,
      exampleSnippet: 'v1.5 invoices; v1.4 payments; v1.2 advanceInvoices/finalize; unversioned products',
      summary: 'Betterfly write integrations must choose endpoint families per resource, because versions differ materially across document, payment, and master-data writes.',
    },
  );
}

const apiResources = [...apiResourceMap.values()]
  .map((row) => ({
    ...row,
    supportedMethods: [...row.supportedMethods].sort().join('; '),
    sourceDocumentRefIds: [...row.sourceDocumentRefIds].filter(Boolean).sort().join('; '),
    exampleEndpoints: [...row.exampleEndpoints].sort().slice(0, 6).join('; '),
    summary: truncate(
      `${row.name} API resource. Base endpoint: ${row.endpointBase}. Methods: ${[...row.supportedMethods].sort().join(', ')}. Version: ${row.versionHint}.`,
      420,
    ),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));
if (liveProbeDocument) {
  apiResources.push({
    id: 'BFAPIRES_TOKEN',
    name: 'Token Acquisition',
    description: 'Authentication endpoint used to obtain Betterfly public API access tokens.',
    semanticType: 'betterflyApiResource',
    resourceCode: 'TOKEN',
    resourceGroup: 'Authentication',
    endpointBase: '/api2/public/token',
    versionHint: 'unversioned',
    supportedMethods: 'POST',
    authModel: 'BasicClientCredentials',
    sourceDocumentRefIds: liveProbeDocument.id,
    exampleEndpoints: '/api2/public/token',
    summary: 'Authentication resource for Betterfly public API token acquisition using Basic client credentials and OAuth2 client_credentials grant.',
  });
}
apiResources.sort((a, b) => a.name.localeCompare(b.name));

const learningGuides = [
  {
    id: 'BFGUIDE_API_START',
    name: 'Start With Betterfly API',
    description: 'Read the API overview, then authentication, then one concrete resource article.',
    semanticType: 'betterflyLearningGuide',
    guideType: 'onboarding',
    audience: 'Integrator',
    startStep: 'Read API general information, then authentication and user guide before opening resource-specific pages.',
    sourceDocumentRefId: referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/api-informacje-ogolne/')?.id || '',
    summary: 'Fast onboarding path for new Betterfly API integrators.',
  },
  {
    id: 'BFGUIDE_FILTERS',
    name: 'Read And Filter Resources',
    description: 'Use the filtering article before implementing list endpoints or pagination.',
    semanticType: 'betterflyLearningGuide',
    guideType: 'usage_pattern',
    audience: 'Integrator',
    startStep: 'After reading a resource article, check API filtering to design read-side queries.',
    sourceDocumentRefId: referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/api-filtrowanie-zasobow/')?.id || '',
    summary: 'Guide for filtering, sorting, paging, and full-text search in Betterfly API reads.',
  },
  {
    id: 'BFGUIDE_DOCS',
    name: 'Implement Document Workflows',
    description: 'Start with sales invoice, then corrections, then payments and prints.',
    semanticType: 'betterflyLearningGuide',
    guideType: 'domain_flow',
    audience: 'Integrator',
    startStep: 'Read one document resource deeply before chaining corrections, payments, or print workflows.',
    sourceDocumentRefId: referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/api-faktura-sprzedazy/')?.id || '',
    summary: 'Guide for implementing Betterfly document flows incrementally instead of all at once.',
  },
];
if (liveProbeDocument) {
  learningGuides.push({
    id: 'BFGUIDE_SAFE_LIVE_VALIDATION',
    name: 'Validate Betterfly API Safely',
    description: 'Validate token flow, endpoint reachability, and response envelope shape without persisting tenant business data.',
    semanticType: 'betterflyLearningGuide',
    guideType: 'safe_validation',
    audience: 'Integrator',
    startStep: 'Start from token flow, then probe only metadata-safe GET calls such as $top=1 envelope checks and stop before persisting tenant payloads.',
    sourceDocumentRefId: liveProbeDocument.id,
    summary: 'Guide for metadata-only Betterfly API validation without ingesting tenant business payloads.',
  });
}
if (writeNotesDocument) {
  learningGuides.push({
    id: 'BFGUIDE_WRITE_SIDE_START',
    name: 'Implement Betterfly Writes Safely',
    description: 'Start write-side integrations from workflow families and version hints before payload implementation.',
    semanticType: 'betterflyLearningGuide',
    guideType: 'write_workflow',
    audience: 'Integrator',
    startStep: 'Choose the target resource family, confirm its version, then model create/update/confirm/delete/finalize as a workflow instead of one call.',
    sourceDocumentRefId: writeNotesDocument.id,
    summary: 'Guide for safer Betterfly write-side implementation across create, update, confirm, delete, and finalize flows.',
  });
}

const knowledgeRoutes = [
  {
    id: 'BFROUTE_API',
    name: 'Stay In Betterfly API KB',
    description: 'Use this KB when the question is about Betterfly public API behavior, endpoints, versions, or examples.',
    semanticType: 'betterflyKnowledgeRoute',
    routeType: 'intra_kb',
    targetKbName: 'Comarch Betterfly Reference',
    targetNamespace: KB_NAME,
    recommendedWhen: 'Question mentions Betterfly API, OAuth, endpoint versions, or document resource operations.',
    anchorObjects: 'ApiResource; ApiPattern; ReferenceDocument',
    summary: 'Primary route for Betterfly API work inside this KB.',
  },
  {
    id: 'BFROUTE_ORIENTATION',
    name: 'Use Orientation Layer First',
    description: 'Start from entry guides and table of contents when the topic is broad or unclear.',
    semanticType: 'betterflyKnowledgeRoute',
    routeType: 'intra_kb',
    targetKbName: 'Comarch Betterfly Reference',
    targetNamespace: KB_NAME,
    recommendedWhen: 'Question is broad, wording is uncertain, or legacy ERP XT naming appears.',
    anchorObjects: 'EntryGuide; HelpCategory; ModuleArea',
    summary: 'Orientation-first route for broad Betterfly documentation questions.',
  },
];

const entryGuides = [
  {
    id: 'BFENTRY_API_GENERAL',
    name: 'API Overview First',
    description: 'Start here for any Betterfly API question.',
    semanticType: 'betterflyEntryGuide',
    guideGroup: 'api',
    priorityRank: '1',
    userIntent: 'Understand the Betterfly public API surface and access model',
    primaryDocumentRefId: referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/api-informacje-ogolne/')?.id || '',
    secondaryDocumentRefIds: [
      referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/api-uwierzytelnianie/')?.id || '',
      referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/api-instrukcja-uzytkownika/')?.id || '',
    ].filter(Boolean).join('; '),
    targetKbName: 'Comarch Betterfly Reference',
    targetNamespace: KB_NAME,
    nextStep: 'Move to a concrete resource article after overview and authentication.',
    caution: 'Do not start write-side implementation without checking version hints and auth setup.',
    summary: 'Primary Betterfly API entry point covering HTTP model, resources, auth, and status codes.',
  },
  {
    id: 'BFENTRY_FILTERING',
    name: 'Filtering And Paging',
    description: 'Use this when the question is about searching or paging data.',
    semanticType: 'betterflyEntryGuide',
    guideGroup: 'api_usage',
    priorityRank: '2',
    userIntent: 'Design GET queries with filter, sort, page, or full-text search',
    primaryDocumentRefId: referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/api-filtrowanie-zasobow/')?.id || '',
    secondaryDocumentRefIds: '',
    targetKbName: 'Comarch Betterfly Reference',
    targetNamespace: KB_NAME,
    nextStep: 'Apply the filtering rules to the target resource endpoint.',
    caution: 'Check version and field names against the specific resource article.',
    summary: 'Entry point for filtering, sorting, paging, and full-text patterns.',
  },
  {
    id: 'BFENTRY_DOCS',
    name: 'Document Resources',
    description: 'Use this when implementing invoices, proformas, advances, or corrections.',
    semanticType: 'betterflyEntryGuide',
    guideGroup: 'api_domain',
    priorityRank: '3',
    userIntent: 'Implement document workflows in Betterfly API',
    primaryDocumentRefId: referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/api-faktura-sprzedazy/')?.id || '',
    secondaryDocumentRefIds: [
      referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/api-korekty/')?.id || '',
      referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/api-faktura-zaliczkowa/')?.id || '',
      referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/api-faktura-zakupu/')?.id || '',
    ].filter(Boolean).join('; '),
    targetKbName: 'Comarch Betterfly Reference',
    targetNamespace: KB_NAME,
    nextStep: 'Confirm the exact versioned endpoint family before coding.',
    caution: 'Document resources mix v1.4 and v1.5 families.',
    summary: 'Entry point for Betterfly document creation, update, confirmation, and corrective flows.',
  },
  {
    id: 'BFENTRY_PAYMENTS',
    name: 'Payments And Banking',
    description: 'Use this for payments, bank accounts, and payment type integration.',
    semanticType: 'betterflyEntryGuide',
    guideGroup: 'api_domain',
    priorityRank: '4',
    userIntent: 'Integrate payment state and banking-related endpoints',
    primaryDocumentRefId: referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/api-platnosci/')?.id || '',
    secondaryDocumentRefIds: [
      referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/api-formy-platnosci/')?.id || '',
      referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/api-rachunki-bankowe/')?.id || '',
    ].filter(Boolean).join('; '),
    targetKbName: 'Comarch Betterfly Reference',
    targetNamespace: KB_NAME,
    nextStep: 'Separate payment details from payment status endpoints.',
    caution: 'Payments and payment status use different endpoint families.',
    summary: 'Entry point for Betterfly payment and banking APIs.',
  },
  {
    id: 'BFENTRY_LEGACY',
    name: 'ERP XT Legacy Context',
    description: 'Use this when older screenshots or names mention ERP XT instead of Betterfly.',
    semanticType: 'betterflyEntryGuide',
    guideGroup: 'orientation',
    priorityRank: '5',
    userIntent: 'Interpret older Betterfly materials and naming',
    primaryDocumentRefId: referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/comarch-erp-xt/')?.id || '',
    secondaryDocumentRefIds: referenceByUrl.get('https://pomoc.comarchbetterfly.pl/spis-tresci/')?.id || '',
    targetKbName: 'Comarch Betterfly Reference',
    targetNamespace: KB_NAME,
    nextStep: 'Map legacy names to current Betterfly docs and API resources.',
    caution: 'Do not assume older article wording implies older endpoint version unless explicitly stated.',
    summary: 'Entry point for resolving Betterfly versus ERP XT naming ambiguity.',
  },
];
if (liveProbeDocument) {
  entryGuides.push({
    id: 'BFENTRY_LIVE_AUTH',
    name: 'Live Auth And Envelope Check',
    description: 'Use this when you need to validate Betterfly token flow or response shape safely against a real tenant.',
    semanticType: 'betterflyEntryGuide',
    guideGroup: 'api_validation',
    priorityRank: '2',
    userIntent: 'Validate Betterfly live API access without persisting business data',
    primaryDocumentRefId: liveProbeDocument.id,
    secondaryDocumentRefIds: [
      referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/api-uwierzytelnianie/')?.id || '',
      referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/api-informacje-ogolne/')?.id || '',
    ].filter(Boolean).join('; '),
    targetKbName: 'Comarch Betterfly Reference',
    targetNamespace: KB_NAME,
    nextStep: 'Confirm token flow first, then verify endpoint/version and envelope shape using metadata-only probes.',
    caution: 'Do not persist tenant business payloads into repo files or KB rows.',
    summary: 'Entry point for safe Betterfly live API validation focused on auth, versioning, and response shape.',
  });
}
if (writeNotesDocument) {
  entryGuides.push({
    id: 'BFENTRY_WRITE_SIDE',
    name: 'Write-Side Workflows',
    description: 'Use this when implementing create, update, confirm, delete, or finalize behavior in Betterfly API.',
    semanticType: 'betterflyEntryGuide',
    guideGroup: 'api_write',
    priorityRank: '3',
    userIntent: 'Implement Betterfly write-side workflow safely and with correct version selection',
    primaryDocumentRefId: writeNotesDocument.id,
    secondaryDocumentRefIds: [
      referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/api-faktura-sprzedazy/')?.id || '',
      referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/api-korekty/')?.id || '',
      referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/api-przeksztalcanie-faktur-zaliczkowych/')?.id || '',
      referenceByUrl.get('https://pomoc.comarchbetterfly.pl/dokumentacja/api-platnosci/')?.id || '',
    ].filter(Boolean).join('; '),
    targetKbName: 'Comarch Betterfly Reference',
    targetNamespace: KB_NAME,
    nextStep: 'Model the resource as a workflow family and verify confirm/finalize semantics before implementing payloads.',
    caution: 'Do not assume create or update is the final business step; many document flows need confirm or finalize.',
    summary: 'Entry point for Betterfly write-side work across document, payment, and master-data resources.',
  });
}

const chunkRows = [];
for (const page of pageRecords) {
  const document = referenceByUrl.get(page.canonicalUrl);
  if (!document) continue;
  const includeChunks = isChunkEligiblePage({
    canonicalUrl: page.canonicalUrl,
    relPath: page.relPath,
    documentCategory: document.documentCategory,
  });
  if (!includeChunks) continue;
  const paragraphChunks = buildParagraphChunks(page.paragraphs, 3);
  paragraphChunks.forEach((content, index) => {
    chunkRows.push({
      id: makeId('BFCHUNK', `${document.id}_${index + 1}`),
      name: `${page.title} chunk ${index + 1}`,
      description: truncate(content, 240),
      semanticType: 'betterflyHelpChunk',
      sourceDocumentRefId: document.id,
      sourceUrl: document.sourceUrl,
      sourcePath: page.relPath,
      sectionHeading: sectionHeadingFrom(page.title, content),
      sectionOrder: String(index + 1),
      content,
    });
  });
}
if (liveProbeDocument && liveProbeContent) {
  const liveProbeParagraphs = liveProbeContent
    .split(/\n\s*\n/)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);
  buildParagraphChunks(liveProbeParagraphs, 2).forEach((content, index) => {
    chunkRows.push({
      id: makeId('BFCHUNK', `${liveProbeDocument.id}_${index + 1}`),
      name: `${liveProbeDocument.name} chunk ${index + 1}`,
      description: truncate(content, 240),
      semanticType: 'betterflyHelpChunk',
      sourceDocumentRefId: liveProbeDocument.id,
      sourceUrl: liveProbeDocument.sourceUrl,
      sourcePath: liveProbeDocument.localSnapshotPath,
      sectionHeading: sectionHeadingFrom(liveProbeDocument.name, content),
      sectionOrder: String(index + 1),
      content,
    });
  });
}
if (contractNotesDocument && contractNotesContent) {
  const contractNoteParagraphs = contractNotesContent
    .split(/\n\s*\n/)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);
  buildParagraphChunks(contractNoteParagraphs, 2).forEach((content, index) => {
    chunkRows.push({
      id: makeId('BFCHUNK', `${contractNotesDocument.id}_${index + 1}`),
      name: `${contractNotesDocument.name} chunk ${index + 1}`,
      description: truncate(content, 240),
      semanticType: 'betterflyHelpChunk',
      sourceDocumentRefId: contractNotesDocument.id,
      sourceUrl: contractNotesDocument.sourceUrl,
      sourcePath: contractNotesDocument.localSnapshotPath,
      sectionHeading: sectionHeadingFrom(contractNotesDocument.name, content),
      sectionOrder: String(index + 1),
      content,
    });
  });
}
if (writeNotesDocument && writeNotesContent) {
  const writeNoteParagraphs = writeNotesContent
    .split(/\n\s*\n/)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);
  buildParagraphChunks(writeNoteParagraphs, 2).forEach((content, index) => {
    chunkRows.push({
      id: makeId('BFCHUNK', `${writeNotesDocument.id}_${index + 1}`),
      name: `${writeNotesDocument.name} chunk ${index + 1}`,
      description: truncate(content, 240),
      semanticType: 'betterflyHelpChunk',
      sourceDocumentRefId: writeNotesDocument.id,
      sourceUrl: writeNotesDocument.sourceUrl,
      sourcePath: writeNotesDocument.localSnapshotPath,
      sectionHeading: sectionHeadingFrom(writeNotesDocument.name, content),
      sectionOrder: String(index + 1),
      content,
    });
  });
}
for (const draft of promotedKnowledge) {
  const documentId = promotedDocumentIdByDraft.get(draft.id);
  buildParagraphChunks(
    String(draft.content || '')
      .split(/\n\s*\n/)
      .map((part) => normalizeWhitespace(part))
      .filter(Boolean),
    2,
  ).forEach((content, index) => {
    chunkRows.push({
      id: makeId('BFCHUNK_PROMOTED', `${draft.id}_${index + 1}`),
      name: `${draft.title} chunk ${index + 1}`,
      description: truncate(content, 240),
      semanticType: 'betterflyPromotedKnowledgeChunk',
      sourceDocumentRefId: documentId,
      sourceUrl: draft.sourceUrl || `local://knowledge-inbox/${draft.id}`,
      sourcePath: draft.promotedMarkdownPath,
      sectionHeading: sectionHeadingFrom(draft.title, content),
      sectionOrder: String(index + 1),
      content,
    });
  });
}

const sourceRegistry = {
  generatedAt: new Date().toISOString(),
  kbName: 'Comarch Betterfly Reference',
  namespace: KB_NAME,
  sources: [
    ...pageRecords.map((page) => ({
      localSnapshotPath: page.relPath,
      canonicalUrl: page.canonicalUrl,
      title: page.title,
      lastModified: page.lastModified,
      endpointCount: page.endpoints.length,
      contentHash: fileHashForRelativePath(page.relPath),
      hashAlgorithm: 'sha256',
    })),
    ...(liveProbeDocument
      ? [
          {
            localSnapshotPath: liveProbeDocument.localSnapshotPath,
            canonicalUrl: liveProbeDocument.sourceUrl,
            title: liveProbeDocument.name,
            lastModified: liveProbeDocument.lastModified,
            endpointCount: 5,
            contentHash: fileHashForRelativePath(liveProbeDocument.localSnapshotPath),
            hashAlgorithm: 'sha256',
          },
        ]
      : []),
    ...(contractNotesDocument
      ? [
          {
            localSnapshotPath: contractNotesDocument.localSnapshotPath,
            canonicalUrl: contractNotesDocument.sourceUrl,
            title: contractNotesDocument.name,
            lastModified: contractNotesDocument.lastModified,
            endpointCount: 6,
            contentHash: fileHashForRelativePath(contractNotesDocument.localSnapshotPath),
            hashAlgorithm: 'sha256',
          },
        ]
      : []),
    ...(writeNotesDocument
      ? [
          {
            localSnapshotPath: writeNotesDocument.localSnapshotPath,
            canonicalUrl: writeNotesDocument.sourceUrl,
            title: writeNotesDocument.name,
            lastModified: writeNotesDocument.lastModified,
            endpointCount: 5,
            contentHash: fileHashForRelativePath(writeNotesDocument.localSnapshotPath),
            hashAlgorithm: 'sha256',
          },
        ]
      : []),
  ],
};
fs.writeFileSync(SOURCE_REGISTRY_PATH, JSON.stringify(sourceRegistry, null, 2) + '\n', 'utf8');

const files = [
  writeCsv(EXPORT_DIR, 
    'reference_document.csv',
    ['id', 'name', 'description', 'semanticType', 'sourceUrl', 'sourceType', 'documentCategory', 'moduleScope', 'categoryHint', 'versionHint', 'lastModified', 'localSnapshotPath', 'sourceOrigin', 'summary'],
    referenceDocuments,
  ),
  writeCsv(EXPORT_DIR, 
    'help_category.csv',
    ['id', 'name', 'description', 'semanticType', 'sourceUrl', 'categorySlug', 'categoryGroup', 'moduleScope', 'priorityTier', 'summary'],
    helpCategories,
  ),
  writeCsv(EXPORT_DIR, 
    'module_area.csv',
    ['id', 'name', 'description', 'semanticType', 'moduleCode', 'scopeType', 'anchorDocumentRefId', 'relatedCategories', 'recommendedFor', 'caution', 'summary'],
    moduleAreas,
  ),
  writeCsv(EXPORT_DIR, 
    'api_resource.csv',
    ['id', 'name', 'description', 'semanticType', 'resourceCode', 'resourceGroup', 'endpointBase', 'versionHint', 'supportedMethods', 'authModel', 'sourceDocumentRefIds', 'exampleEndpoints', 'summary'],
    apiResources,
  ),
  writeCsv(EXPORT_DIR, 
    'api_pattern.csv',
    ['id', 'name', 'description', 'semanticType', 'patternType', 'httpMethod', 'endpointPath', 'versionHint', 'useCase', 'sourceDocumentRefId', 'exampleSnippet', 'summary'],
    apiPatterns,
  ),
  writeCsv(EXPORT_DIR, 
    'learning_guide.csv',
    ['id', 'name', 'description', 'semanticType', 'guideType', 'audience', 'startStep', 'sourceDocumentRefId', 'summary'],
    learningGuides,
  ),
  writeCsv(EXPORT_DIR, 
    'knowledge_route.csv',
    ['id', 'name', 'description', 'semanticType', 'routeType', 'targetKbName', 'targetNamespace', 'recommendedWhen', 'anchorObjects', 'summary'],
    knowledgeRoutes,
  ),
  writeCsv(EXPORT_DIR, 
    'entry_guide.csv',
    ['id', 'name', 'description', 'semanticType', 'guideGroup', 'priorityRank', 'userIntent', 'primaryDocumentRefId', 'secondaryDocumentRefIds', 'targetKbName', 'targetNamespace', 'nextStep', 'caution', 'summary'],
    entryGuides,
  ),
  writeCsv(EXPORT_DIR, 
    'chunk.csv',
    ['id', 'name', 'description', 'semanticType', 'sourceDocumentRefId', 'sourceUrl', 'sourcePath', 'sectionHeading', 'sectionOrder', 'content'],
    chunkRows,
  ),
];

const manifest = {
  generatedAt: new Date().toISOString(),
  kbName: 'Comarch Betterfly Reference',
  namespace: KB_NAME,
  sourceRoot: path.relative(ROOT, SOURCE_ROOT).replaceAll(path.sep, '/'),
  pageCount: pageRecords.length,
  files,
};
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

const readmeLines = [
  '# ComarchBetterflyReference export',
  '',
  `Generated at: ${manifest.generatedAt}`,
  '',
  '## Source snapshot',
  '',
  `- Pages: \`${pageRecords.length}\``,
  `- Local root: \`${manifest.sourceRoot}\``,
  '',
  '## Export files',
  '',
  ...files.map((file) => `- \`${file.fileName}\`: \`${file.rowCount}\``),
  '',
  '## Notes',
  '',
  '- This KB is documentation-only.',
  '- It emphasizes Betterfly public API resources, usage patterns, and onboarding.',
  '- URL provenance is stored in `downloads/official/betterfly_reference/meta/source_registry.json`.',
  '',
];
fs.writeFileSync(README_PATH, readmeLines.join('\n'), 'utf8');

console.log(JSON.stringify({
  ok: true,
  kbName: manifest.kbName,
  pageCount: pageRecords.length,
  files: files.map((file) => ({ fileName: file.fileName, rowCount: file.rowCount })),
}, null, 2));
