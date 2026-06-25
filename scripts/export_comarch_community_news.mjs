#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { loadPromotedKnowledge } from './lib/promoted_knowledge.mjs';
import { ensureDir, writeCsv, makeId } from './lib/export_utils.mjs';
import { loadJsonIfExists } from './lib/build_runner_core.mjs';

const ROOT = '/docker/openspg';
const KB_NAMESPACE = 'ComarchCommunityNews';
const EXPORT_DIR = path.join(ROOT, 'exports/community_news/v1');
const MANIFEST_PATH = path.join(EXPORT_DIR, '_manifest.json');
const README_PATH = path.join(EXPORT_DIR, 'README.md');
const SOURCE_ROOT = path.join(ROOT, 'downloads/community_news');
const API_DIR = path.join(SOURCE_ROOT, 'api');
const DETAILS_DIR = path.join(API_DIR, 'posts');
const META_DIR = path.join(SOURCE_ROOT, 'meta');
const POSTS_INDEX_PATH = path.join(API_DIR, 'posts_index.json');
const CATEGORIES_PATH = path.join(API_DIR, 'categories.json');
const SOURCE_REGISTRY_PATH = path.join(META_DIR, 'source_registry.json');

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

function extractParagraphsFromHtml(html) {
  const matches = [
    ...String(html || '').matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi),
    ...String(html || '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi),
  ];
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

function parseTopicItems(row) {
  const candidates = [];
  for (const key of ['categories', 'tags', 'topics']) {
    const value = row?.[key];
    if (Array.isArray(value)) candidates.push(...value);
  }
  return candidates
    .map((item) => {
      if (typeof item === 'string') {
        return { name: item, slug: item, type: 'label' };
      }
      if (!item || typeof item !== 'object') return null;
      return {
        name: item.name || item.title || item.slug || item.code || '',
        slug: item.slug || item.code || item.name || item.title || '',
        type: item.type || item.kind || item.group || 'label',
      };
    })
    .filter((item) => item && item.name);
}

function parseCategoryTopics(row, categoryMap) {
  const ids = Array.isArray(row?.categories_ids) ? row.categories_ids : [];
  return ids
    .map((id) => categoryMap.get(String(id)))
    .filter(Boolean)
    .map((item) => ({
      id: item.id,
      name: item.formattedName || item.name || String(item.id),
      slug: item.name || item.formattedName || String(item.id),
      type: Number(item.type) === 1 ? 'product' : 'domain',
    }));
}

function parseAttachmentItems(row) {
  const raw = [];
  for (const key of ['attachments', 'files']) {
    const value = row?.[key];
    if (Array.isArray(value)) raw.push(...value);
  }
  return raw
    .map((item) => {
      if (typeof item === 'string') {
        return {
          name: path.basename(item),
          url: item,
          ext: path.extname(item).replace(/^\./, '').toLowerCase(),
        };
      }
      if (!item || typeof item !== 'object') return null;
      const url = item.url || item.href || item.downloadUrl || item.src || '';
      const name = item.name || item.fileName || path.basename(url || 'attachment');
      return {
        name,
        url,
        ext: (item.extension || path.extname(url || '').replace(/^\./, '') || '').toLowerCase(),
      };
    })
    .filter((item) => item && item.url);
}

function extractImageUrlsFromHtml(html) {
  const urls = new Set();
  for (const match of String(html || '').matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    const url = String(match[1] || '').trim();
    if (url) urls.add(url);
  }
  return [...urls];
}

function parseMediaAttachments(row) {
  const media = [];
  if (row?.picture) {
    media.push({
      name: path.basename(new URL(row.picture).pathname || 'picture'),
      url: row.picture,
      ext: path.extname(new URL(row.picture).pathname || '').replace(/^\./, '').toLowerCase(),
      mediaKind: 'post_picture',
    });
  }
  for (const url of extractImageUrlsFromHtml(row?.content || '')) {
    let ext = '';
    let name = 'content-image';
    try {
      const parsed = new URL(url);
      name = path.basename(parsed.pathname || 'content-image');
      ext = path.extname(parsed.pathname || '').replace(/^\./, '').toLowerCase();
    } catch {
      name = path.basename(url);
      ext = path.extname(url).replace(/^\./, '').toLowerCase();
    }
    media.push({ name, url, ext, mediaKind: 'content_image' });
  }
  const byUrl = new Map();
  for (const item of media) {
    if (!item.url) continue;
    if (!byUrl.has(item.url)) byUrl.set(item.url, item);
  }
  return [...byUrl.values()];
}

function pickPublishedAt(row) {
  return row.datePublished || row.publishedAt || row.createdAt || row.dateCreated || '';
}

function inferModuleScope(value) {
  const lower = String(value || '').toLowerCase();
  if (/optima|handel|magazyn|kasa|bank|crm|ksieg|place|kadry|obieg/.test(lower)) return 'ComarchERPOptima';
  if (/betterfly|erp xt|ksef|ocr|api/.test(lower)) return 'ComarchBetterflyOrServices';
  if (/xl|altum|mobile|pos/.test(lower)) return 'OtherComarchERP';
  return 'GeneralComarchERP';
}

function inferDocumentCategory(row) {
  const lower = `${row.title || ''} ${row.slug || ''} ${row.guessedArticleUrl || ''}`.toLowerCase();
  if (/ksef|api|ocr/.test(lower)) return 'integration_update';
  if (/wersj|aktualiz|nowo|zmian/.test(lower)) return 'release_update';
  if (/konferenc|webinar|spotkan/.test(lower)) return 'event_news';
  return 'community_news';
}

function attachmentType(ext) {
  if (ext === 'pdf') return 'pdf';
  if (['zip', 'rar', '7z'].includes(ext)) return 'archive';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
  return ext ? 'file' : 'link';
}

ensureDir(EXPORT_DIR);

const postsIndex = loadJsonIfExists(POSTS_INDEX_PATH, {
  generatedAt: '',
  rows: [],
});
const categoriesIndex = loadJsonIfExists(CATEGORIES_PATH, {
  generatedAt: '',
  rows: [],
});
const categoryMap = new Map((categoriesIndex.rows || []).map((row) => [String(row.id), row]));
const detailFiles = listFilesRecursive(DETAILS_DIR).filter((filePath) => filePath.endsWith('.json'));
const detailIndex = new Map();

for (const filePath of detailFiles) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const data = raw?.data || raw;
  const relPath = path.relative(ROOT, filePath).replaceAll(path.sep, '/');
  const fallbackTitle = path.basename(filePath, '.json').replace(/_/g, ' ');
  detailIndex.set(String(data?.id || ''), {
    filePath,
    relPath,
    data,
    title: stripHtml(data?.title || fallbackTitle),
    paragraphs: extractParagraphsFromHtml(data?.content || ''),
  });
}

const referenceDocuments = [];
const topicsByKey = new Map();
const attachments = [];
const referenceIdByUrl = new Map();
const seenReferenceUrls = new Set();
const seenAttachmentIds = new Set();
const seenChunkUrls = new Set();

for (const row of postsIndex.rows || []) {
  const sourceUrl = row.guessedArticleUrl || row.url || row.link || `local://community-news/${row.id || row.slug || 'item'}`;
  if (seenReferenceUrls.has(sourceUrl)) continue;
  seenReferenceUrls.add(sourceUrl);
  const detail = detailIndex.get(String(row.id || ''));
  const title = detail?.title || row.title || `Community news ${row.id || row.slug || ''}`.trim();
  const categoryTopics = parseCategoryTopics(detail?.data || row, categoryMap);
  const explicitTopics = parseTopicItems(detail?.data || row);
  const allTopics = [...categoryTopics, ...explicitTopics];
  const moduleScope = inferModuleScope(`${title} ${JSON.stringify(allTopics)}`);
  const documentCategory = inferDocumentCategory(row);
  const summary = truncate(
    detail?.paragraphs?.slice(0, 3).join(' ') ||
      stripHtml(detail?.data?.intro || '') ||
      row.intro ||
      row.description ||
      row.excerpt ||
      row.content ||
      `Public Comarch community news post ${title}.`,
    1000,
  );
  const refId = makeId('COMMUNITY_DOC', sourceUrl);
  referenceIdByUrl.set(sourceUrl, refId);
  referenceDocuments.push({
    id: refId,
    name: title,
    description: `Public Comarch community news article ${title}.`,
    semanticType: 'reference_document',
    sourceUrl,
    sourceType: detail ? 'community_news_api_detail' : 'community_news_api_index',
    documentCategory,
    moduleScope,
    categoryHint: allTopics.map((item) => item.slug || item.name).join(';'),
    publishedAt: pickPublishedAt(row),
    lastModified: detail?.data?.dateModified || row.updatedAt || row.modifiedAt || '',
    localSnapshotPath: detail?.relPath || '',
    sourceOrigin: 'spolecznosc.comarch.pl',
    summary,
  });

  for (const topic of allTopics) {
    const topicKey = `${topic.type}:${topic.slug || topic.name}`.toLowerCase();
    const existing = topicsByKey.get(topicKey);
    if (existing) {
      existing.usageCount = String(Number(existing.usageCount || '0') + 1);
    } else {
      topicsByKey.set(topicKey, {
        id: makeId('COMMUNITY_TOPIC', topicKey),
        name: topic.name,
        description: `Normalized public community-news topic ${topic.name}.`,
        semanticType: 'news_topic',
        topicSlug: String(topic.slug || topic.name).toLowerCase(),
        topicType: topic.type,
        usageCount: '1',
        moduleScope: inferModuleScope(topic.name),
        sourceUrl,
        summary: truncate(
          `Public community-news topic ${topic.name}. Derived from article metadata and intended for routing and filtering.`,
          320,
        ),
      });
    }
  }

  for (const attachment of [...parseAttachmentItems(detail?.data || row), ...parseMediaAttachments(detail?.data || row)]) {
    const attachmentId = makeId('COMMUNITY_ATTACHMENT', `${sourceUrl}_${attachment.url}`);
    if (seenAttachmentIds.has(attachmentId)) continue;
    seenAttachmentIds.add(attachmentId);
    attachments.push({
      id: attachmentId,
      name: attachment.name,
      description: `Public attachment linked from community news article ${title}.`,
      semanticType: 'community_attachment',
      sourceUrl: attachment.url,
      attachmentType: attachmentType(attachment.ext),
      fileExtension: attachment.ext,
      parentDocumentRefId: refId,
      moduleScope,
      sourceOrigin: 'spolecznosc.comarch.pl',
      summary: truncate(`Attachment ${attachment.name} linked from ${title}. Type: ${attachmentType(attachment.ext)}.`, 280),
    });
  }
}

const promotedKnowledge = loadPromotedKnowledge(KB_NAMESPACE);
for (const draft of promotedKnowledge) {
  const sourceUrl = draft.sourceUrl || `local://knowledge-inbox/${draft.id}`;
  const refId = makeId('COMMUNITY_DOC_PROMOTED', draft.id);
  referenceDocuments.push({
    id: refId,
    name: draft.title,
    description: `Promoted knowledge inbox draft for ${draft.kbName}.`,
    semanticType: 'reference_document',
    sourceUrl,
    sourceType: 'promoted_knowledge_draft',
    documentCategory: 'promoted_knowledge',
    moduleScope: inferModuleScope(`${draft.title} ${draft.content}`),
    categoryHint: draft.tags?.join('; ') || 'knowledge-inbox',
    publishedAt: draft.promotedAt || '',
    lastModified: draft.promotedAt || '',
    localSnapshotPath: draft.promotedMarkdownPath,
    sourceOrigin: 'KnowledgeInboxPromoted',
    summary: truncate(draft.content, 420),
  });
}

const knowledgeRoutes = [
  {
    id: makeId('COMMUNITY_ROUTE', 'Community news -> Optima Reference'),
    name: 'Community news -> Optima Reference',
    description: 'Route from public community updates into official Optima documentation.',
    semanticType: 'knowledge_route',
    routeType: 'supporting_public_to_official',
    targetKbName: 'Comarch Optima Reference',
    targetNamespace: 'ComarchOptimaReference',
    recommendedWhen: 'when a public news item points to product behavior, release context, or operational changes that need official documentation follow-up',
    anchorObjects: 'ReferenceDocument;NewsTopic',
    summary: 'Use community news for release awareness, then route to official Optima docs for authoritative product guidance.',
  },
  {
    id: makeId('COMMUNITY_ROUTE', 'Community news -> Betterfly Reference'),
    name: 'Community news -> Betterfly Reference',
    description: 'Route from public community updates into Betterfly official documentation.',
    semanticType: 'knowledge_route',
    routeType: 'supporting_public_to_official',
    targetKbName: 'Comarch Betterfly Reference',
    targetNamespace: 'ComarchBetterflyReference',
    recommendedWhen: 'when a public news item mentions Betterfly, KSeF, OCR, or API-facing service changes that require authoritative API or help-center context',
    anchorObjects: 'ReferenceDocument;NewsTopic',
    summary: 'Use community news for awareness, then route to Betterfly reference KB for concrete API and product documentation.',
  },
];

const entryGuides = [
  {
    id: makeId('COMMUNITY_ENTRY', 'Start here - release awareness'),
    name: 'Start here - release awareness',
    description: 'Curated community-news entry guide for release/update questions.',
    semanticType: 'entry_guide',
    guideGroup: 'release_updates',
    priorityRank: '1',
    userIntent: 'understand recent public product changes, announcements, or version-related communication',
    primaryDocumentRefId: referenceDocuments[0]?.id || '',
    secondaryDocumentRefIds: '',
    targetKbName: 'Comarch Optima Reference',
    targetNamespace: 'ComarchOptimaReference',
    nextStep: 'Read the public news item, then verify behavior against the official documentation KB.',
    caution: 'Community news is supporting context, not the final authority for product behavior.',
    summary: 'Use the public community-news layer first for awareness, then verify in the official documentation KB.',
  },
  {
    id: makeId('COMMUNITY_ENTRY', 'Start here - Betterfly and services updates'),
    name: 'Start here - Betterfly and services updates',
    description: 'Curated entry guide for Betterfly/service-related public updates.',
    semanticType: 'entry_guide',
    guideGroup: 'service_updates',
    priorityRank: '2',
    userIntent: 'understand Betterfly, KSeF, OCR, or service-integration public announcements before checking detailed docs',
    primaryDocumentRefId: '',
    secondaryDocumentRefIds: '',
    targetKbName: 'Comarch Betterfly Reference',
    targetNamespace: 'ComarchBetterflyReference',
    nextStep: 'Use the public announcement as context, then route into the Betterfly reference KB.',
    caution: 'Do not answer API-contract questions from community news alone.',
    summary: 'Use community news for service-update context and Betterfly reference KB for authoritative API details.',
  },
];

const chunks = [];

for (const row of postsIndex.rows || []) {
  const sourceUrl = row.guessedArticleUrl || row.url || row.link || '';
  if (seenChunkUrls.has(sourceUrl)) continue;
  seenChunkUrls.add(sourceUrl);
  const refId = referenceIdByUrl.get(sourceUrl);
  if (!refId) continue;
  const detail = detailIndex.get(String(row.id || ''));
  const fallbackParagraphs = [
    stripHtml(detail?.data?.intro || ''),
    stripHtml(detail?.data?.content || ''),
    row.intro,
    row.description,
    row.excerpt,
    stripHtml(row.content || ''),
  ]
    .map((value) => normalizeWhitespace(value || ''))
    .filter((value) => value.length > 20);
  const paragraphChunks = buildParagraphChunks(detail?.paragraphs?.length ? detail.paragraphs : fallbackParagraphs, 3);
  paragraphChunks.forEach((content, index) => {
    chunks.push({
      id: makeId('COMMUNITY_CHUNK', `${sourceUrl}_${index + 1}`),
      name: `${detail?.title || row.title || 'Community news'} Chunk ${index + 1}`,
      description: `Community news retrieval chunk ${index + 1}.`,
      semanticType: 'chunk',
      sourceDocumentRefId: refId,
      sourceUrl,
      sourcePath: detail?.relPath || '',
      sectionHeading: index === 0 ? 'news_article_intro' : 'news_article_body',
      sectionOrder: String(index + 1),
      content,
    });
  });
}

for (const draft of promotedKnowledge) {
  const sourceUrl = draft.sourceUrl || `local://knowledge-inbox/${draft.id}`;
  const refId = makeId('COMMUNITY_DOC_PROMOTED', draft.id);
  buildParagraphChunks(
    normalizeWhitespace(draft.content)
      .split(/\n\s*\n/)
      .filter(Boolean),
    2,
  ).forEach((content, index) => {
    chunks.push({
      id: makeId('COMMUNITY_CHUNK_PROMOTED', `${draft.id}_${index + 1}`),
      name: `${draft.title} Chunk ${index + 1}`,
      description: `Promoted knowledge draft chunk ${index + 1}.`,
      semanticType: 'chunk',
      sourceDocumentRefId: refId,
      sourceUrl,
      sourcePath: draft.promotedMarkdownPath,
      sectionHeading: 'promoted_knowledge',
      sectionOrder: String(index + 1),
      content,
    });
  });
}

const files = [
  writeCsv(EXPORT_DIR, 
    'reference_document.csv',
    [
      'id',
      'name',
      'description',
      'semanticType',
      'sourceUrl',
      'sourceType',
      'documentCategory',
      'moduleScope',
      'categoryHint',
      'publishedAt',
      'lastModified',
      'localSnapshotPath',
      'sourceOrigin',
      'summary',
    ],
    referenceDocuments,
  ),
  writeCsv(EXPORT_DIR, 
    'news_topic.csv',
    [
      'id',
      'name',
      'description',
      'semanticType',
      'topicSlug',
      'topicType',
      'usageCount',
      'moduleScope',
      'sourceUrl',
      'summary',
    ],
    [...topicsByKey.values()].sort((a, b) => a.topicSlug.localeCompare(b.topicSlug)),
  ),
  writeCsv(EXPORT_DIR, 
    'community_attachment.csv',
    [
      'id',
      'name',
      'description',
      'semanticType',
      'sourceUrl',
      'attachmentType',
      'fileExtension',
      'parentDocumentRefId',
      'moduleScope',
      'sourceOrigin',
      'summary',
    ],
    attachments.sort((a, b) => a.sourceUrl.localeCompare(b.sourceUrl)),
  ),
  writeCsv(EXPORT_DIR, 
    'knowledge_route.csv',
    [
      'id',
      'name',
      'description',
      'semanticType',
      'routeType',
      'targetKbName',
      'targetNamespace',
      'recommendedWhen',
      'anchorObjects',
      'summary',
    ],
    knowledgeRoutes,
  ),
  writeCsv(EXPORT_DIR, 
    'entry_guide.csv',
    [
      'id',
      'name',
      'description',
      'semanticType',
      'guideGroup',
      'priorityRank',
      'userIntent',
      'primaryDocumentRefId',
      'secondaryDocumentRefIds',
      'targetKbName',
      'targetNamespace',
      'nextStep',
      'caution',
      'summary',
    ],
    entryGuides,
  ),
  writeCsv(EXPORT_DIR, 
    'chunk.csv',
    [
      'id',
      'name',
      'description',
      'semanticType',
      'sourceDocumentRefId',
      'sourceUrl',
      'sourcePath',
      'sectionHeading',
      'sectionOrder',
      'content',
    ],
    chunks,
  ),
];

const manifest = {
  kbName: 'Comarch Community News',
  namespace: KB_NAMESPACE,
  generatedAt: new Date().toISOString(),
  sourceRoots: {
    sourceRoot: path.relative(ROOT, SOURCE_ROOT).replaceAll(path.sep, '/'),
    postsIndexPath: path.relative(ROOT, POSTS_INDEX_PATH).replaceAll(path.sep, '/'),
    categoriesPath: path.relative(ROOT, CATEGORIES_PATH).replaceAll(path.sep, '/'),
    sourceRegistryPath: path.relative(ROOT, SOURCE_REGISTRY_PATH).replaceAll(path.sep, '/'),
  },
  counts: {
    postsIndexRows: (postsIndex.rows || []).length,
    detailSnapshots: detailFiles.length,
    promotedDrafts: promotedKnowledge.length,
  },
  files,
};

fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const readmeLines = [
  '# ComarchCommunityNews export',
  '',
  `Generated at: ${manifest.generatedAt}`,
  '',
  '## Sources',
  '',
  `- posts index: \`${manifest.sourceRoots.postsIndexPath}\``,
  `- categories index: \`${manifest.sourceRoots.categoriesPath}\``,
  `- source registry: \`${manifest.sourceRoots.sourceRegistryPath}\``,
  `- local details: \`${path.relative(ROOT, DETAILS_DIR).replaceAll(path.sep, '/')}\``,
  '',
  '## Export files',
  '',
  ...files.map((file) => `- \`${file.fileName}\`: \`${file.rowCount}\``),
  '',
  '## Notes',
  '',
  '- This KB is a supporting public news layer, not an authoritative product-manual KB.',
  '- URL provenance is stored in `downloads/community_news/meta/source_registry.json`.',
  '- Promoted MCP drafts are included into `reference_document.csv` and `chunk.csv`.',
  '',
];
fs.writeFileSync(README_PATH, `${readmeLines.join('\n')}\n`, 'utf8');

process.stdout.write(`${JSON.stringify({ ok: true, manifestPath: MANIFEST_PATH, files: files.map((file) => ({ fileName: file.fileName, rowCount: file.rowCount })) }, null, 2)}\n`);
