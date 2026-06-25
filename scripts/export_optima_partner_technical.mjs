#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { loadPromotedKnowledge } from './lib/promoted_knowledge.mjs';
import { ensureDir, writeCsv, writeJson, slug, makeId } from './lib/export_utils.mjs';

const ROOT = '/docker/openspg';
const EXPORT_DIR = path.join(ROOT, 'exports/optima_partner_technical/v1');
const MANIFEST_PATH = path.join(EXPORT_DIR, '_manifest.json');
const README_PATH = path.join(EXPORT_DIR, 'README.md');
const SOURCE_ROOT = path.join(ROOT, 'downloads/partner/optima_technical');
const API_DIR = path.join(SOURCE_ROOT, 'api');
const SOURCE_REGISTRY_PATH = path.join(SOURCE_ROOT, 'source_registry.json');
const DOWNLOAD_MANIFEST_PATH = path.join(SOURCE_ROOT, 'download_manifest.json');
const EXTRACTION_MANIFEST_PATH = path.join(SOURCE_ROOT, 'extraction_manifest.json');
const AUDIT_PATH = path.join(ROOT, 'docs/reference/ComarchOptimaPartnerTechnical.audit.md');
const PARTNER_API_BASE = process.env.PARTNER_API_BASE || 'https://partner.erp.comarch.pl/wp-json/wp/v2';
const PARTNER_COOKIE = process.env.PARTNER_COOKIE || '';
const PARTNER_REFRESH = /^(1|true|yes)$/i.test(String(process.env.PARTNER_REFRESH || ''));

const BASE_CATEGORY_ROWS = [
  { id: 3, name: 'Comarch ERP Optima', slug: 'comarch-erp-optima', parent: 0, count: 39, link: 'https://partner.erp.comarch.pl/kategoria/comarch-erp-optima/' },
  { id: 237, name: 'Dokumentacja techniczna', slug: 'dokumentacja-techniczna', parent: 3, count: 0, link: 'https://partner.erp.comarch.pl/kategoria/comarch-erp-optima/dokumentacja-techniczna/' },
  { id: 238, name: 'Aktualna dokumentacja techniczna', slug: 'aktualna-dokumentacja-techniczna', parent: 237, count: 0, link: 'https://partner.erp.comarch.pl/kategoria/comarch-erp-optima/dokumentacja-techniczna/aktualna-dokumentacja-techniczna/' },
  { id: 239, name: 'Archiwalna dokumentacja techniczna', slug: 'archiwalna-dokumentacja-techniczna', parent: 237, count: 0, link: 'https://partner.erp.comarch.pl/kategoria/comarch-erp-optima/dokumentacja-techniczna/archiwalna-dokumentacja-techniczna/' },
  { id: 309, name: 'Struktura plików XML', slug: 'struktura-plikow-xml', parent: 3, count: 35, link: 'https://partner.erp.comarch.pl/kategoria/comarch-erp-optima/struktura-plikow-xml/' },
  { id: 310, name: 'Sterowniki', slug: 'sterowniki', parent: 3, count: 8, link: 'https://partner.erp.comarch.pl/kategoria/comarch-erp-optima/sterowniki/' },
  { id: 311, name: 'Makra księgowe', slug: 'makra-ksiegowe', parent: 3, count: 19, link: 'https://partner.erp.comarch.pl/kategoria/comarch-erp-optima/makra-ksiegowe/' },
  { id: 312, name: 'Struktura baz danych', slug: 'struktura-baz-danych', parent: 3, count: 10, link: 'https://partner.erp.comarch.pl/kategoria/comarch-erp-optima/struktura-baz-danych/' },
  { id: 314, name: 'Funkcje dodatkowe', slug: 'funkcje-dodatkowe', parent: 3, count: 84, link: 'https://partner.erp.comarch.pl/kategoria/comarch-erp-optima/funkcje-dodatkowe/' },
  { id: 315, name: 'Pliki pomocnicze', slug: 'pliki-pomocnicze', parent: 3, count: 14, link: 'https://partner.erp.comarch.pl/kategoria/comarch-erp-optima/pliki-pomocnicze/' },
  { id: 328, name: 'Aktualna dokumentacja techniczna działa z Comarch ERP Optima', slug: 'aktualna-dokumentacja-techniczna-dziala-z-comarch-erp-optima', parent: 3, count: 93, link: 'https://partner.erp.comarch.pl/kategoria/comarch-erp-optima/aktualna-dokumentacja-techniczna-dziala-z-comarch-erp-optima/' },
  { id: 329, name: 'Archiwalna dokumentacja techniczna działa z Comarch ERP Optima', slug: 'archiwalna-dokumentacja-techniczna-dziala-z-comarch-erp-optima', parent: 3, count: 103, link: 'https://partner.erp.comarch.pl/kategoria/comarch-erp-optima/archiwalna-dokumentacja-techniczna-dziala-z-comarch-erp-optima/' },
  { id: 330, name: 'Aktualna struktura bazy danych', slug: 'aktualna-struktura-bazy-danych-struktura-baz-danych', parent: 312, count: 50, link: 'https://partner.erp.comarch.pl/kategoria/comarch-erp-optima/struktura-baz-danych/aktualna-struktura-bazy-danych-struktura-baz-danych/' },
  { id: 331, name: 'Archiwalna struktura bazy danych', slug: 'archiwalna-struktura-bazy-danych-archiwalna-struktura-bazy-danych', parent: 312, count: 154, link: 'https://partner.erp.comarch.pl/kategoria/comarch-erp-optima/struktura-baz-danych/archiwalna-struktura-bazy-danych-archiwalna-struktura-bazy-danych/' },
];

const FETCH_CATEGORY_IDS = [3, 237, 238, 239, 309, 310, 311, 312, 314, 315, 328, 329, 330, 331];
const FETCH_MEDIA_CATEGORY_IDS = [309, 310, 311, 312, 314, 315, 328, 329, 330, 331];

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

function readJsonIfExists(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function writeSourceRegistry(referenceDocuments, partnerCategories, partnerAssets) {
  const registry = {
    generatedAt: new Date().toISOString(),
    kbName: 'Comarch Optima Partner Technical',
    namespace: 'ComarchOptimaPartnerTechnical',
    purpose: 'Central URL provenance registry for duplicate checks, routing, and source attribution.',
    referenceDocuments: referenceDocuments.map((item) => ({
      id: item.id,
      name: item.name,
      sourceUrl: item.sourceUrl,
      sourceType: item.sourceType,
      documentCategory: item.documentCategory,
      relatedKnowledgeBase: item.relatedKnowledgeBase,
      contentHash: sha256([
        item.id,
        item.name,
        item.sourceUrl,
        item.sourceType,
        item.documentCategory,
        item.relatedKnowledgeBase,
        item.summary,
      ].join('\n')),
      hashAlgorithm: 'sha256',
    })),
    partnerCategories: partnerCategories.map((item) => ({
      id: item.id,
      name: item.name,
      portalUrl: item.portalUrl,
      categoryGroup: item.categoryGroup,
      lifecycleBand: item.lifecycleBand,
      overlapPolicy: item.overlapPolicy,
      contentHash: sha256([
        item.id,
        item.name,
        item.portalUrl,
        item.categoryGroup,
        item.lifecycleBand,
        item.overlapPolicy,
      ].join('\n')),
      hashAlgorithm: 'sha256',
    })),
    partnerAssets: partnerAssets.map((item) => ({
      id: item.id,
      name: item.name,
      sourceUrl: item.sourceUrl,
      directDownloadUrl: item.directDownloadUrl,
      categoryRefId: item.categoryRefId,
      versionBandRefId: item.versionBandRefId,
      productAreaRefId: item.productAreaRefId,
      overlapPolicy: item.overlapPolicy,
      primaryRouteKbName: item.primaryRouteKbName,
      primaryRouteNamespace: item.primaryRouteNamespace,
      mimeType: item.mimeType,
      fileExtension: item.fileExtension,
      publishedAt: item.publishedAt,
      currentState: item.currentState,
      contentHash: sha256([
        item.id,
        item.name,
        item.sourceUrl,
        item.directDownloadUrl,
        item.categoryRefId,
        item.versionBandRefId,
        item.productAreaRefId,
        item.overlapPolicy,
        item.primaryRouteKbName,
        item.primaryRouteNamespace,
        item.mimeType,
        item.fileExtension,
        item.publishedAt,
        item.currentState,
        item.summary,
      ].join('\n')),
      hashAlgorithm: 'sha256',
    })),
  };
  writeJson(SOURCE_REGISTRY_PATH, registry);
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function assetRunStateMap(runs = []) {
  const merged = new Map();
  for (const run of runs) {
    for (const asset of run.assets || []) {
      if (!asset?.id) continue;
      const current = merged.get(asset.id);
      if (!current) {
        merged.set(asset.id, structuredClone(asset));
        continue;
      }
      const next = { ...current };
      for (const [key, value] of Object.entries(asset)) {
        if (key === 'sidecars') continue;
        if (key === 'probeState' || key === 'probeNote') continue;
        if (next[key] == null || next[key] === '') next[key] = value;
      }
      next.sidecars = { ...(asset.sidecars || {}), ...(current.sidecars || {}) };
      merged.set(asset.id, next);
    }
  }
  return merged;
}

function extractionRunStateMap(runs = []) {
  const merged = new Map();
  for (const run of runs) {
    for (const archive of run.archives || []) {
      if (!archive?.id) continue;
      const current = merged.get(archive.id);
      if (!current) {
        merged.set(archive.id, structuredClone(archive));
        continue;
      }
      const next = { ...current };
      if ((!next.extractedFiles || next.extractedFiles.length === 0) && archive.extractedFiles?.length) {
        next.extractedFiles = archive.extractedFiles;
      }
      if ((!next.selectedEntries || next.selectedEntries === 0) && archive.selectedEntries) {
        next.selectedEntries = archive.selectedEntries;
      }
      if ((!next.errors || next.errors.length === 0) && archive.errors?.length) {
        next.errors = archive.errors;
      }
      merged.set(archive.id, next);
    }
  }
  return merged;
}

function splitMarkdownSections(markdown) {
  const lines = String(markdown || '').split('\n');
  const sections = [];
  let current = { heading: 'Overview', lines: [] };
  for (const line of lines) {
    const heading = line.match(/^#{1,3}\s+(.*)$/);
    if (heading) {
      if (current.lines.length) sections.push(current);
      current = { heading: heading[1].trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.length) sections.push(current);
  return sections
    .map((section) => ({
      heading: section.heading,
      content: normalizeWhitespace(section.lines.join('\n')),
    }))
    .filter((section) => section.content.length > 40);
}

function detectLifecycle(value) {
  const lower = String(value || '').toLowerCase();
  if (/archiw/.test(lower)) return 'ARCHIVED';
  if (/aktual/.test(lower)) return 'CURRENT';
  return 'MIXED';
}

function detectCategoryGroup(category) {
  const lower = `${category.slug || ''} ${category.name || ''}`.toLowerCase();
  if (/struktura-baz-danych/.test(lower)) return 'database_structure';
  if (/funkcje-dodatkowe/.test(lower)) return 'additional_functions';
  if (/pliki-pomocnicze/.test(lower)) return 'helper_files';
  if (/makra-ksiegowe/.test(lower)) return 'accounting_macros';
  if (/sterowniki/.test(lower)) return 'drivers';
  if (/struktura-plikow-xml/.test(lower)) return 'xml_structures';
  if (/dokumentacja-techniczna/.test(lower)) return 'technical_docs';
  return 'partner_category';
}

function detectProductArea(category) {
  const lower = `${category.slug || ''} ${category.name || ''}`.toLowerCase();
  if (/struktura-baz-danych/.test(lower)) return 'DatabaseStructure';
  if (/funkcje-dodatkowe/.test(lower)) return 'AdditionalFunctions';
  if (/pliki-pomocnicze/.test(lower)) return 'HelperFiles';
  if (/makra-ksiegowe/.test(lower)) return 'AccountingMacros';
  if (/sterowniki/.test(lower)) return 'Drivers';
  if (/struktura-plikow-xml/.test(lower)) return 'XmlStructures';
  if (/dokumentacja-techniczna/.test(lower)) return 'TechnicalDocumentation';
  return 'General';
}

function routeTargetForArea(area) {
  switch (area) {
    case 'DatabaseStructure':
      return ['Comarch Optima ERP MSSQL Schema', 'ComarchOptimaSchema'];
    case 'AdditionalFunctions':
      return ['Comarch Optima Additional Functions', 'ComarchOptimaAdditionalFunctions'];
    case 'HelperFiles':
      return ['Comarch Optima Sprint and Prints', 'ComarchOptimaSprint'];
    default:
      return ['', ''];
  }
}

function categoryOverlapPolicy(category) {
  const area = detectProductArea(category);
  if (area === 'DatabaseStructure') return 'ROUTE_ONLY';
  if (area === 'AdditionalFunctions') return 'ROUTE_ONLY';
  return 'INDEX_AND_RETRIEVE';
}

function detectAssetKind(asset) {
  const lower = `${asset.title || ''} ${asset.mime_type || ''} ${asset.source_url || ''}`.toLowerCase();
  if (/struktura_bazy|zmiany-w-strukturze-baz/.test(lower)) return 'schema_pack';
  if (/xml/.test(lower)) return 'xml_manual';
  if (/narzedzia-serwisowe|generator/.test(lower)) return 'service_tool';
  if (/makr/.test(lower)) return 'macro_pack';
  if (/sterownik|menadzerkluczy|sql-dmo/.test(lower)) return 'driver_or_runtime';
  if (/crystal-reports|weryfikacjawymagan/.test(lower)) return 'helper_package';
  if (/pdf/.test(lower)) return 'pdf_manual';
  if (/zip/.test(lower)) return 'archive_package';
  if (/sheet|excel|xlsx/.test(lower)) return 'spreadsheet';
  return 'partner_asset';
}

function fileExtension(url) {
  const clean = String(url || '').split('?')[0];
  const match = clean.match(/\.([a-z0-9]{2,8})$/i);
  return match ? match[1].toLowerCase() : '';
}

function mimeFamily(mime) {
  const lower = String(mime || '').toLowerCase();
  if (lower.includes('pdf')) return 'pdf';
  if (lower.includes('zip')) return 'zip';
  if (lower.includes('sheet') || lower.includes('excel')) return 'spreadsheet';
  if (lower.includes('word') || lower.includes('document')) return 'document';
  return lower.split('/')[0] || 'binary';
}

function extractVersionCode(value) {
  const match = String(value || '').match(/(20\d{2}(?:[._-]\d(?:[._-]\d)?)?)/);
  if (!match) return '';
  return match[1].replace(/[_-]/g, '.');
}

function releaseFamily(versionCode) {
  if (!versionCode) return 'unknown';
  const major = versionCode.split('.')[0];
  return `${major}.x`;
}

function assetCurrentState(asset, categoryById) {
  const category = categoryById.get(asset.categoryId);
  const lifecycle = detectLifecycle(`${category?.slug || ''} ${category?.name || ''}`);
  if (lifecycle === 'CURRENT') return 'CURRENT';
  if (lifecycle === 'ARCHIVED') return 'ARCHIVED';
  return 'UNSPECIFIED';
}

function assetOverlapPolicy(asset, categoryById) {
  const category = categoryById.get(asset.categoryId) || {};
  const area = detectProductArea(category);
  const kind = detectAssetKind(asset);
  if (area === 'DatabaseStructure') return 'ROUTE_ONLY';
  if (area === 'AdditionalFunctions') return 'ROUTE_ONLY';
  if (kind === 'schema_pack') return 'ROUTE_ONLY';
  return 'INDEX_AND_RETRIEVE';
}

function areaTarget(areaCode) {
  switch (areaCode) {
    case 'DatabaseStructure':
      return ['Comarch Optima ERP MSSQL Schema', 'ComarchOptimaSchema'];
    case 'AdditionalFunctions':
      return ['Comarch Optima Additional Functions', 'ComarchOptimaAdditionalFunctions'];
    default:
      return ['Comarch Optima Reference', 'ComarchOptimaReference'];
  }
}

async function partnerApi(pathname) {
  if (!PARTNER_COOKIE) {
    throw new Error('PARTNER_COOKIE is required for live partner refresh');
  }
  const response = await fetch(`${PARTNER_API_BASE}${pathname}`, {
    headers: { Cookie: PARTNER_COOKIE },
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new Error(`Non-JSON partner response from ${pathname}: ${text.slice(0, 400)}`);
  }
  if (!response.ok) {
    throw new Error(`${pathname} failed with HTTP ${response.status}: ${text.slice(0, 400)}`);
  }
  return json;
}

async function fetchPaged(pathname) {
  const items = [];
  for (let page = 1; page <= 100; page += 1) {
    const pagePath = pathname.includes('?') ? `${pathname}&page=${page}` : `${pathname}?page=${page}`;
    const json = await partnerApi(pagePath);
    if (!Array.isArray(json) || json.length === 0) break;
    items.push(...json);
    if (json.length < 100) break;
  }
  return items;
}

async function refreshSnapshots() {
  ensureDir(API_DIR);

  const categories = [];
  for (const categoryId of FETCH_CATEGORY_IDS) {
    const item = await partnerApi(`/categories/${categoryId}`);
    categories.push(item);
  }

  const media = [];
  for (const categoryId of FETCH_MEDIA_CATEGORY_IDS) {
    const items = await fetchPaged(`/media?categories=${categoryId}&per_page=100`);
    for (const item of items) {
      media.push({ ...item, _seedCategoryId: categoryId });
    }
  }

  const dedupedCategories = [...new Map(categories.map((item) => [item.id, item])).values()];
  const dedupedMedia = [...new Map(media.map((item) => [item.id, item])).values()];

  writeJson(path.join(API_DIR, 'categories.json'), dedupedCategories);
  writeJson(path.join(API_DIR, 'media.json'), dedupedMedia);

  return { categories: dedupedCategories, media: dedupedMedia };
}

function buildReferenceDocuments() {
  const docs = [
    {
      id: 'PARTNER_TECH_AUDIT',
      name: 'Comarch Optima Partner Technical Audit',
      description: 'Authenticated audit of the partner portal technical area for Comarch ERP Optima.',
      semanticType: 'partnerTechnicalAudit',
      sourceUrl: 'https://partner.erp.comarch.pl/kategoria/comarch-erp-optima/',
      sourceType: 'local_audit_markdown',
      documentCategory: 'partner_portal_audit',
      versionHint: '',
      articleUpdatedAt: '2026-05-24',
      relatedKnowledgeBase: 'ComarchOptimaPartnerTechnical',
      summary: truncate('Authenticated audit of the Optima partner technical corpus, confirming that the useful technical material is primarily WordPress media organized by category and current/archived version state.', 360),
    },
    {
      id: 'PARTNER_TECH_ROOT',
      name: 'Partner Portal - Comarch ERP Optima',
      description: 'Root landing area for partner-only Comarch ERP Optima materials.',
      semanticType: 'partnerPortalRoot',
      sourceUrl: 'https://partner.erp.comarch.pl/kategoria/comarch-erp-optima/',
      sourceType: 'partner_portal_page',
      documentCategory: 'partner_root',
      versionHint: '',
      articleUpdatedAt: '',
      relatedKnowledgeBase: 'ComarchOptimaPartnerTechnical',
      summary: truncate('Partner-only Optima landing area grouping technical, commercial, training, and documentation materials.', 300),
    },
  ];
  return docs;
}

function buildAssetReferenceDocuments(partnerAssets, downloadStateById, extractionStateById) {
  return partnerAssets
    .filter((asset) => {
      const downloadState = downloadStateById.get(asset.id);
      const extractionState = extractionStateById.get(asset.id);
      return Boolean(
        downloadState?.sidecars?.pdfText?.extractedTextPath ||
        (extractionState?.extractedFiles || []).length > 0,
      );
    })
    .map((asset) => ({
      id: `PARTNER_ASSET_DOC_${asset.id}`,
      name: `${asset.name} Local Extract`,
      description: `Local extracted text context for partner asset ${asset.name}.`,
      semanticType: 'partnerAssetExtract',
      sourceUrl: asset.directDownloadUrl || asset.sourceUrl,
      sourceType: 'partner_local_extract',
      documentCategory: 'partner_asset_extract',
      versionHint: asset.versionBandRefId || '',
      articleUpdatedAt: asset.publishedAt || '',
      relatedKnowledgeBase: 'ComarchOptimaPartnerTechnical',
      summary: truncate(
        `Local extracted text for partner asset ${asset.name}. Area ref: ${asset.productAreaRefId}. Category ref: ${asset.categoryRefId}. Overlap policy: ${asset.overlapPolicy}. Download source: ${asset.directDownloadUrl || asset.sourceUrl}.`,
        360,
      ),
    }));
}

function isExampleExtractCandidate(asset, outputPath, content = '') {
  if (!asset?.productAreaRefId) return false;
  if (['PRODUCT_AREA_XMLSTRUCTURES', 'PRODUCT_AREA_HELPERFILES', 'PRODUCT_AREA_ACCOUNTINGMACROS'].includes(asset.productAreaRefId)) {
    return /\.(xml|xpt|htm|html)\.txt$/i.test(outputPath || '');
  }
  if (asset.productAreaRefId === 'PRODUCT_AREA_TECHNICALDOCUMENTATION') {
    if (!/przyklady-uzycia-obiektow-com/i.test(outputPath || '')) return false;
    return isComExampleCandidate(outputPath, content);
  }
  return false;
}

function exampleExtractName(outputPath) {
  if (/przyklady-uzycia-obiektow-com/i.test(outputPath || '')) {
    return baseExtractName(outputPath);
  }
  return path.basename(outputPath)
    .replace(/^\d+__/, '')
    .replace(/\.(xml|xpt|htm|html)\.txt$/i, '')
    .replace(/\.txt$/i, '');
}

function buildExtractExampleDocuments(partnerAssets, extractionStateById) {
  const assetsById = new Map(partnerAssets.map((asset) => [asset.id, asset]));
  const docs = [];
  for (const [assetId, extractionState] of extractionStateById.entries()) {
    const asset = assetsById.get(assetId);
    if (!asset) continue;
    const groupedDocs = new Map();
    let order = 1;
    for (const extractedFile of extractionState.extractedFiles || []) {
      const sourcePath = path.join(SOURCE_ROOT, extractedFile.outputPath);
      if (!fs.existsSync(sourcePath)) continue;
      const content = readText(sourcePath);
      if (!isExampleExtractCandidate(asset, extractedFile.outputPath, content)) continue;
      const name = exampleExtractName(extractedFile.outputPath);
      if (asset.productAreaRefId === 'PRODUCT_AREA_TECHNICALDOCUMENTATION') {
        const language = exampleLanguage(extractedFile.outputPath);
        const variantScore = { jscript: 4, hta: 3, csharp: 2, xpt: 1, xml: 1, sql: 1, ini: 0, text: 0 }[language] ?? 0;
        const key = slug(`${assetId}_${name}`);
        const existing = groupedDocs.get(key);
        const candidate = {
          outputPath: extractedFile.outputPath,
          content,
          language,
          variantScore,
        };
        if (!existing) {
          groupedDocs.set(key, {
            id: `PARTNER_EXAMPLE_DOC_${slug(`${assetId}_${name}_${order}`)}`,
            docName: name,
            variants: [candidate],
            primary: candidate,
          });
          order += 1;
        } else {
          existing.variants.push(candidate);
          if (
            candidate.variantScore > existing.primary.variantScore ||
            (candidate.variantScore === existing.primary.variantScore && candidate.content.length > existing.primary.content.length)
          ) {
            existing.primary = candidate;
          }
        }
        continue;
      }
      docs.push({
        id: `PARTNER_EXAMPLE_DOC_${slug(`${assetId}_${name}_${order}`)}`,
        name: `${asset.name} / ${name}`,
        description: `Extracted example document from partner asset ${asset.name}.`,
        semanticType: 'partnerExampleExtract',
        sourceUrl: asset.directDownloadUrl || asset.sourceUrl,
        sourceType: 'partner_example_extract',
        documentCategory: 'partner_example_extract',
        versionHint: asset.versionBandRefId || '',
        articleUpdatedAt: asset.publishedAt || '',
        relatedKnowledgeBase: 'ComarchOptimaPartnerTechnical',
        sourceAssetRefId: assetId,
        sourceExtractPath: extractedFile.outputPath,
        sourceExtractPaths: [extractedFile.outputPath],
        summary: truncate(
          `Partner example extract ${name} from asset ${asset.name}. Area ref: ${asset.productAreaRefId}. Category ref: ${asset.categoryRefId}. Source path: ${extractedFile.outputPath}. Preview: ${content.slice(0, 800)}`,
          500,
        ),
      });
      order += 1;
    }
    for (const grouped of groupedDocs.values()) {
      const variantList = grouped.variants.map((item) => `${item.language}:${item.outputPath}`).join(' | ');
      docs.push({
        id: grouped.id,
        name: `${asset.name} / ${grouped.docName}`,
        description: `Extracted example document from partner asset ${asset.name}.`,
        semanticType: 'partnerExampleExtract',
        sourceUrl: asset.directDownloadUrl || asset.sourceUrl,
        sourceType: 'partner_example_extract',
        documentCategory: 'partner_example_extract',
        versionHint: asset.versionBandRefId || '',
        articleUpdatedAt: asset.publishedAt || '',
        relatedKnowledgeBase: 'ComarchOptimaPartnerTechnical',
        sourceAssetRefId: assetId,
        sourceExtractPath: grouped.primary.outputPath,
        sourceExtractPaths: grouped.variants.map((item) => item.outputPath),
        summary: truncate(
          `Partner example extract ${grouped.docName} from asset ${asset.name}. Area ref: ${asset.productAreaRefId}. Category ref: ${asset.categoryRefId}. Primary variant: ${grouped.primary.language}. Variants: ${variantList}. Preview: ${grouped.primary.content.slice(0, 800)}`,
          500,
        ),
      });
    }
  }
  return docs;
}

function buildPartnerCategories(categoryRows) {
  return categoryRows.map((category) => ({
    id: `PARTNER_CATEGORY_${category.id}`,
    name: category.name,
    description: `${category.name} partner portal category for Comarch ERP Optima.`,
    semanticType: 'partnerCategory',
    categorySlug: category.slug,
    parentCategoryRefId: category.parent ? `PARTNER_CATEGORY_${category.parent}` : '',
    categoryGroup: detectCategoryGroup(category),
    lifecycleBand: detectLifecycle(`${category.slug} ${category.name}`),
    overlapPolicy: categoryOverlapPolicy(category),
    portalUrl: category.link || '',
    itemCount: String(category.count ?? ''),
    recommendedUse: `Use this category as a metadata anchor for ${detectProductArea(category)} partner materials.`,
    summary: truncate(`Partner category ${category.name}. Group: ${detectCategoryGroup(category)}. Lifecycle: ${detectLifecycle(`${category.slug} ${category.name}`)}. Portal count: ${category.count ?? 0}.`, 320),
  }));
}

function buildProductAreas() {
  const areas = [
    ['DatabaseStructure', 'database_structure', 'Structure packs, schema changes, and database technical materials.'],
    ['AdditionalFunctions', 'additional_functions', 'Partner technical assets related to additional functions and service-tool families.'],
    ['HelperFiles', 'helper_files', 'Helper packages, validation tools, and companion technical files.'],
    ['AccountingMacros', 'accounting_macros', 'Accounting macro packs and related implementation references.'],
    ['Drivers', 'drivers', 'Drivers, runtimes, and key-manager distributions.'],
    ['XmlStructures', 'xml_structures', 'XML schema manuals and integration file structure references.'],
    ['TechnicalDocumentation', 'technical_docs', 'Current and archived technical documentation collections.'],
    ['General', 'general', 'Fallback partner technical area.'],
  ];
  return areas.map(([name, code, summary]) => {
    const [targetKbName, targetNamespace] = areaTarget(name);
    return {
      id: `PRODUCT_AREA_${code.toUpperCase()}`,
      name,
      description: summary,
      semanticType: 'productArea',
      areaCode: code,
      scopeType: 'partner_technical',
      targetKbName,
      targetNamespace,
      recommendedUse: `Use this area to route partner technical materials into ${targetKbName}.`,
      summary: truncate(summary, 280),
    };
  });
}

function buildAssetTypes(mediaRows) {
  const seen = new Map();
  for (const asset of mediaRows) {
    const kind = detectAssetKind(asset);
    const mime = mimeFamily(asset.mime_type);
    const id = `ASSET_TYPE_${slug(kind)}`;
    if (seen.has(id)) continue;
    seen.set(id, {
      id,
      name: kind,
      description: `Normalized partner asset type for ${kind}.`,
      semanticType: 'assetType',
      assetKind: kind,
      mimeFamily: mime,
      typicalUse: `Used for partner technical materials of type ${kind}.`,
      sourceCategoryHint: detectProductArea({ slug: String(asset._seedCategoryId || asset.categoryId || '') }),
      summary: truncate(`Asset type ${kind}. MIME family: ${mime}.`, 220),
    });
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function buildVersionBands(mediaRows, categoryById) {
  const seen = new Map();
  for (const asset of mediaRows) {
    const versionCode = extractVersionCode(`${asset.title?.rendered || asset.title || ''} ${asset.source_url || ''}`);
    if (!versionCode) continue;
    const state = assetCurrentState(asset, categoryById);
    const id = `VERSION_BAND_${slug(`${versionCode}_${state}`)}`;
    if (seen.has(id)) continue;
    seen.set(id, {
      id,
      name: versionCode,
      description: `Partner technical version band ${versionCode}.`,
      semanticType: 'versionBand',
      versionCode,
      lifecycleState: state,
      releaseFamily: releaseFamily(versionCode),
      sourceCategoryHint: detectCategoryGroup(categoryById.get(asset.categoryId) || {}),
      summary: truncate(`Version band ${versionCode}. Lifecycle: ${state}. Release family: ${releaseFamily(versionCode)}.`, 220),
    });
  }
  return [...seen.values()].sort((a, b) => a.versionCode.localeCompare(b.versionCode));
}

function buildPartnerAssets(mediaRows, categoryById) {
  return mediaRows.map((asset) => {
    const title = asset.title?.rendered || asset.title || asset.slug || `asset-${asset.id}`;
    const category = categoryById.get(asset.categoryId) || {};
    const area = detectProductArea(category);
    const [primaryRouteKbName, primaryRouteNamespace] = routeTargetForArea(area);
    const versionCode = extractVersionCode(`${title} ${asset.source_url || ''}`);
    const versionRefId = versionCode
      ? `VERSION_BAND_${slug(`${versionCode}_${assetCurrentState(asset, categoryById)}`)}`
      : '';
    const extension = fileExtension(asset.source_url);
    const assetKind = detectAssetKind(asset);
    const localDownloadState = downloadedAssetState.get(`PARTNER_ASSET_${asset.id}`);
    const localProbeSummary = localDownloadState?.probeState
      ? ` Local probe: ${localDownloadState.probeState}${localDownloadState.probeNote ? ` (${localDownloadState.probeNote})` : ''}.`
      : '';
    return {
      id: `PARTNER_ASSET_${asset.id}`,
      name: title,
      description: `Partner technical asset ${title}.`,
      semanticType: 'partnerAsset',
      sourceUrl: asset.link || '',
      directDownloadUrl: asset.source_url || '',
      assetTypeRefId: `ASSET_TYPE_${slug(assetKind)}`,
      categoryRefId: `PARTNER_CATEGORY_${asset.categoryId}`,
      versionBandRefId: versionRefId,
      productAreaRefId: `PRODUCT_AREA_${slug(area)}`,
      overlapPolicy: assetOverlapPolicy(asset, categoryById),
      primaryRouteKbName,
      primaryRouteNamespace,
      mimeType: asset.mime_type || '',
      fileExtension: extension,
      publishedAt: String(asset.date || '').slice(0, 10),
      currentState: assetCurrentState(asset, categoryById),
      localSnapshotPath: localDownloadState?.localPath || '',
      summary: truncate(`Partner asset ${title}. Category: ${category.name || asset.categoryId}. Type: ${assetKind}. Version: ${versionCode || 'n/a'}. Download: ${asset.source_url || 'n/a'}.${localProbeSummary}`, 600),
    };
  });
}

function buildKnowledgeRoutes() {
  return [
    {
      id: 'ROUTE_TO_SCHEMA',
      name: 'Route database structure materials to schema KB',
      description: 'Use partner database structure packs together with the active schema-only KB.',
      semanticType: 'knowledgeRoute',
      routeType: 'cross_kb',
      targetKbName: 'Comarch Optima ERP MSSQL Schema',
      targetNamespace: 'ComarchOptimaSchema',
      recommendedWhen: 'Use when the partner material discusses table structure, schema changes, or COM/database deltas.',
      anchorObjects: 'Struktura baz danych; database structure; schema packs',
      summary: truncate('Partner database-structure assets should route to the schema-only KB for detailed MSSQL analysis.', 240),
    },
    {
      id: 'ROUTE_TO_ADDITIONAL_FUNCTIONS',
      name: 'Route additional-function assets to Additional Functions KB',
      description: 'Use partner technical assets around additional functions and service tools with the dedicated Additional Functions KB.',
      semanticType: 'knowledgeRoute',
      routeType: 'cross_kb',
      targetKbName: 'Comarch Optima Additional Functions',
      targetNamespace: 'ComarchOptimaAdditionalFunctions',
      recommendedWhen: 'Use when the partner asset belongs to Funkcje dodatkowe or related service-tool distributions.',
      anchorObjects: 'Funkcje dodatkowe; service tools; COM examples',
      summary: truncate('Partner additional-function assets should route to the Additional Functions KB for implementation guidance.', 240),
    },
    {
      id: 'ROUTE_TO_SPRINT',
      name: 'Route helper-print assets to Sprint KB',
      description: 'Use helper packages and print-related technical materials with the dedicated Sprint KB when they influence print/report workflows.',
      semanticType: 'knowledgeRoute',
      routeType: 'cross_kb',
      targetKbName: 'Comarch Optima Sprint and Prints',
      targetNamespace: 'ComarchOptimaSprint',
      recommendedWhen: 'Use when helper files, Crystal-related packages, or technical print assets affect reports or print environments.',
      anchorObjects: 'Crystal Reports; helper files; print environment',
      summary: truncate('Print-adjacent partner assets should route to the Sprint KB when they affect report design or runtime.', 240),
    },
  ];
}

function parseSemicolonCsv(text) {
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
    if (ch === ';') {
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
    if (ch !== '\r') field += ch;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header = [], ...records] = rows;
  return records
    .filter((record) => record.some((value) => value !== ''))
    .map((record) => Object.fromEntries(header.map((key, index) => [key, record[index] || ''])));
}

function dictionaryEntries(extractionStateById, assetsById) {
  const cfgEntries = [];
  const procEntries = [];
  const msgEntries = [];

  for (const [assetId, extractionState] of extractionStateById.entries()) {
    const asset = assetsById.get(assetId);
    if (!asset) continue;
    if (!/^Dictionaries_/i.test(asset.name || '')) continue;

    for (const extractedFile of extractionState.extractedFiles || []) {
      const sourcePath = path.join(SOURCE_ROOT, extractedFile.outputPath);
      if (!fs.existsSync(sourcePath)) continue;
      const fileName = path.basename(extractedFile.outputPath).toLowerCase();
      const rows = parseSemicolonCsv(readText(sourcePath));

      if (fileName.includes('configuration.csv')) {
        for (const row of rows) {
          const configKey = row.Nazwa || row.name || '';
          if (!configKey) continue;
          const configLabel = row.Opis || row.Description || '';
          const configType = row.Typ || row.Type || '';
          cfgEntries.push({
            id: `CFG_${slug(`${assetId}_${configKey}`)}`,
            name: configLabel || configKey,
            description: `Partner technical configuration dictionary entry ${configKey}.`,
            semanticType: 'partnerConfigEntry',
            configKey,
            configType,
            sourceAssetRefId: assetId,
            versionBandRefId: asset.versionBandRefId || '',
            sourcePath: extractedFile.outputPath,
            summary: truncate(
              `Configuration entry ${configKey}. Label: ${configLabel || 'n/a'}. Type: ${configType || 'n/a'}. Source asset: ${asset.name}. Version ref: ${asset.versionBandRefId || 'n/a'}.`,
              420,
            ),
          });
        }
      } else if (fileName.includes('procedures.csv')) {
        for (const row of rows) {
          const procedureCode = row.ProcedureId || row.Id || '';
          const procedureName = row.ProcedureName || row.Name || '';
          if (!procedureCode && !procedureName) continue;
          procEntries.push({
            id: `PROC_${slug(`${assetId}_${procedureCode || procedureName}`)}`,
            name: procedureName || `Procedure ${procedureCode}`,
            description: `Partner technical procedure dictionary entry ${procedureName || procedureCode}.`,
            semanticType: 'partnerProcedureEntry',
            procedureCode,
            sourceAssetRefId: assetId,
            versionBandRefId: asset.versionBandRefId || '',
            sourcePath: extractedFile.outputPath,
            summary: truncate(
              `Procedure dictionary entry ${procedureCode || 'n/a'} ${procedureName || ''}. Source asset: ${asset.name}. Version ref: ${asset.versionBandRefId || 'n/a'}.`,
              420,
            ),
          });
        }
      } else if (fileName.includes('messages.csv')) {
        for (const row of rows) {
          const messageCode = row.Id || '';
          const messageConstant = row.Constant || '';
          const messageText = normalizeWhitespace(row.Opis || row.Description || '');
          if (!messageCode && !messageConstant && !messageText) continue;
          msgEntries.push({
            id: `MSG_${slug(`${assetId}_${messageCode || messageConstant || messageText.slice(0, 32)}`)}`,
            name: messageConstant || `Message ${messageCode || 'UNSPECIFIED'}`,
            description: `Partner technical message catalog entry ${messageConstant || messageCode || 'message'}.`,
            semanticType: 'partnerMessageEntry',
            messageCode,
            messageConstant,
            messageText,
            sourceAssetRefId: assetId,
            versionBandRefId: asset.versionBandRefId || '',
            sourcePath: extractedFile.outputPath,
            summary: truncate(
              `Message catalog entry ${messageCode || 'n/a'} ${messageConstant || ''}. Text: ${messageText || 'n/a'}. Source asset: ${asset.name}. Version ref: ${asset.versionBandRefId || 'n/a'}.`,
              600,
            ),
          });
        }
      }
    }
  }

  return { cfgEntries, procEntries, msgEntries };
}

function baseExtractName(outputPath) {
  const fileName = path.basename(outputPath);
  const withoutPrefix = fileName.replace(/^\d+__/, '');
  const normalized = withoutPrefix.replace(/\.(js|xpt|xml|hta|cs|txt|ini|sql|json|config)\.(js|xpt|xml|hta|cs|txt|ini|sql|json|config)\.txt$/i, '')
    .replace(/\.(js|xpt|xml|hta|cs|txt|ini|sql|json|config)\.txt$/i, '')
    .replace(/\.txt$/i, '');
  return normalized
    .replace(/^Przyklady-uzycia-obiektow-COM-\d+(?:[._-]\d+)?-NET-XPT-JS-VB60-VC/i, '')
    .replace(/^OptimaSDK-COptimaSDKOptimaNETSDK/i, '')
    .replace(/^NET-C/i, '')
    .replace(/^JS/i, '')
    .replace(/^XPT/i, '')
    .replace(/^Logowanie-VC-6/i, '')
    .replace(/^[-_]+/, '')
    .trim() || normalized;
}

function exampleLanguage(outputPath) {
  const lower = outputPath.toLowerCase();
  if (lower.includes('.js.')) return 'jscript';
  if (lower.includes('.xpt.')) return 'xpt';
  if (lower.includes('.xml.')) return 'xml';
  if (lower.includes('.hta.')) return 'hta';
  if (lower.includes('.cs.')) return 'csharp';
  if (lower.includes('.sql.')) return 'sql';
  if (lower.includes('.ini.')) return 'ini';
  return 'text';
}

function exampleKind(outputPath, text) {
  const lower = `${outputPath}\n${text}`.toLowerCase();
  if (lower.includes('.xpt.') || lower.includes('<wydruki>') || lower.includes('wydrformat')) return 'print_transform';
  if (lower.includes('.hta.')) return 'login_shell';
  if (lower.includes('.xml.')) return 'xml_template';
  if (lower.includes('.cs.')) return 'dotnet_sample';
  if (lower.includes('.js.')) return 'script_sample';
  if (lower.includes('activexobject(') || lower.includes('createobject(')) return 'com_runtime_sample';
  return 'support_text';
}

function parseComDocBlock(text) {
  const block = String(text || '').match(/<COM_DOK>([\s\S]*?)<\/COM_DOK>/i);
  if (!block) return null;
  const body = block[1];
  const captureOne = (tag) => {
    const match = body.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return normalizeWhitespace(match?.[1] || '');
  };
  const captureMany = (tag) => {
    return [...body.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'ig'))]
      .map((match) => normalizeWhitespace(match[1]))
      .filter(Boolean);
  };
  return {
    opis: captureOne('OPIS'),
    uruchomienie: captureOne('Uruchomienie'),
    osoba: captureOne('Osoba'),
    optVer: captureOne('OPT_VER'),
    interfaces: captureMany('Interfejs'),
  };
}

function detectActiveXObjects(text) {
  const seen = new Set();
  for (const match of String(text || '').matchAll(/(?:ActiveXObject|CreateObject)\(\s*["']([^"']+)["']\s*\)/g)) {
    const value = normalizeWhitespace(match[1]);
    if (value) seen.add(value);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

function isComExampleCandidate(outputPath, text) {
  const lowerPath = outputPath.toLowerCase();
  if (!/przyklady-uzycia-obiektow-com/i.test(outputPath)) return false;
  if (/assemblyinfo|filelistabsolute|\\obj\\|\/obj\/|\\bin\\|\/bin\/|\.tlh\.|\.tli\.|\.h\./i.test(lowerPath)) return false;
  if (/<COM_DOK>/i.test(text)) return true;
  if (/(?:ActiveXObject|CreateObject)\(\s*["'](?:CDN|CDNBASE|DBImp)\.?/i.test(text)) return true;
  if (/Session\.CreateObject\(/i.test(text)) return true;
  return false;
}

const SCHEMA_HINT_RULES = [
  { objectName: 'TraNag', patterns: [/tra?nag/i, /\bTrN_/i, /DokumentyHaMag/i, /IDokumentHaMag/i, /DokMag/i] },
  { objectName: 'TraElem', patterns: [/traelem/i, /IElementHaMag/i, /ElementHaMag/i] },
  { objectName: 'Towary', patterns: [/\bTowar/i, /\bITowar\b/i, /\bTwr_/i] },
  { objectName: 'Kontrahenci', patterns: [/Kontrah/i, /\bIKontrahent\b/i, /\bKnt_/i] },
  { objectName: 'DokDefinicje', patterns: [/DefinicjaDokumentu/i, /IDefinicjaDokumentu/i, /DokDefinicj/i] },
  { objectName: 'BnkZapisy', patterns: [/ZapisyKB/i, /\bBnkZapisy\b/i, /\bBZp_/i] },
  { objectName: 'BnkZdarzenia', patterns: [/BnkZdarzenia/i, /Zdarzen/i, /\bBzD_/i] },
  { objectName: 'DekretyNag', patterns: [/DekretyNag/i, /\bDeN_/i, /\bIDekret\b/i, /KHDEKRET/i] },
  { objectName: 'DekretyElem', patterns: [/DekretyElem/i, /\bDeE_/i] },
  { objectName: 'Konta', patterns: [/\bIKonto\b/i, /PlanuKont/i, /\bKontoWn\b/i, /\bKontoMa\b/i] },
  { objectName: 'VatNag', patterns: [/\bIVAT\b/i, /RejestrVat/i, /\bRVAT\b/i, /\bVatNag\b/i] },
  { objectName: 'VatTab', patterns: [/\bIVATElement\b/i, /VATElement/i, /\bVatTab\b/i] },
  { objectName: 'PracEtaty', patterns: [/\bIPracownik\b/i, /Pracownik/i, /CDN\.Pracownicy/i, /PracEtaty/i] },
  { objectName: 'Kategorie', patterns: [/\bKategorie\b/i, /\bKat_/i, /Atrybut/i] },
  { objectName: 'CfgWartosci', patterns: [/CDN\.Bazy/i, /KopiaBezpieczenstwa/i, /KonfConn/i] },
];

function detectSchemaTouchpoints(exampleName, text) {
  const haystack = `${exampleName}\n${text}`;
  const hits = [];
  for (const rule of SCHEMA_HINT_RULES) {
    const evidence = rule.patterns.find((pattern) => pattern.test(haystack));
    if (evidence) {
      hits.push({ objectName: rule.objectName, evidence: evidence.toString() });
    }
  }
  return hits;
}

function detectModuleHint(touchpoints, exampleName, interfaces, activeX, language) {
  const joined = `${exampleName} ${(interfaces || []).join(' ')} ${(activeX || []).join(' ')} ${touchpoints.map((item) => item.objectName).join(' ')}`;
  if (/Dekrety|Konta|Dekret/i.test(joined)) return 'accounting';
  if (/Prac|CzasPracy|Kadry/i.test(joined)) return 'hr_payroll';
  if (/Vat|RejestrVat|RVAT/i.test(joined)) return 'vat';
  if (/Bnk|ZapisyKB|Bank|RozliczKB|Rachunek/i.test(joined)) return 'cash_bank';
  if (/Wydruk|Wydr|Rpt/i.test(joined) || (language === 'xpt' && /Format|ZmiennaDyn|Wydruk/i.test(joined))) return 'prints_reporting';
  if (/Towar|HaMag|DokMag|Kontrah|TraNag|TraElem/i.test(joined)) return 'trade_warehouse';
  if (/Login|Sesja|Application/i.test(joined)) return 'runtime_login';
  return 'general_com';
}

function detectMacroModuleHints(text, headingHints, tableHints, assetName) {
  const haystack = `${assetName}\n${headingHints.join('\n')}\n${tableHints.join('\n')}\n${text}`;
  const hints = [];
  if (/BnkZapisy|BnkZdarzenia|Rachunek|Bank|Rozlicz/i.test(haystack)) hints.push('cash_bank');
  if (/VatNag|VatTab|Rejestr\s+zakup|Rejestr\s+sprzeda|VAT/i.test(haystack)) hints.push('vat');
  if (/TraNag|TraElem|Towar|Kontrah|Magazyn|Dokument/i.test(haystack)) hints.push('trade_warehouse');
  if (/Dekret|Konto|Księg|Plan\s+kont|Schemat/i.test(haystack)) hints.push('accounting');
  if (!hints.length) hints.push('accounting');
  return [...new Set(hints)];
}

function collectMacroAndXmlSignals(extractionStateById, assetsById) {
  const xmlSignalsByModule = new Map();
  const macroSignalsByModule = new Map();

  const ensure = (map, moduleCode) => {
    if (!map.has(moduleCode)) {
      map.set(moduleCode, {
        sources: new Set(),
        labels: new Set(),
        fileKinds: new Set(),
        roots: new Set(),
        procedureIds: new Set(),
        contextIds: new Set(),
        paramHints: new Set(),
        tableHints: new Set(),
        headingHints: new Set(),
        sampleMacroCodes: new Set(),
        sqlFunctionHints: new Set(),
      });
    }
    return map.get(moduleCode);
  };

  for (const [assetId, extractionState] of extractionStateById.entries()) {
    const asset = assetsById.get(assetId);
    if (!asset) continue;

    for (const extractedFile of extractionState.extractedFiles || []) {
      const sourcePath = extractedFile.outputPath || '';
      const text = readRelativeText(sourcePath);
      if (!text) continue;

      if (/\.(xml|xpt)\.txt$/i.test(sourcePath) && ['PRODUCT_AREA_XMLSTRUCTURES', 'PRODUCT_AREA_HELPERFILES'].includes(asset.productAreaRefId)) {
        const fileName = path.basename(sourcePath);
        const fileKind = /\.xpt\.txt$/i.test(fileName) ? 'xpt' : 'xml';
        const rootElement = (text.match(/<([A-Za-z_][\w:-]*)\b[^>]*>/) || [])[1] || '';
        const procedureId = (text.match(/\bProcedureId="([^"]+)"/i) || [])[1] || '';
        const contextId = (text.match(/\bContextId="([^"]+)"/i) || [])[1] || '';
        const paramHints = uniqueTop([
          ...(text.match(/name="(@?[A-Za-z0-9_]+)"/g) || []).map((item) => item.replace(/^name="/, '').replace(/"$/, '')),
          ...(text.match(/Caption="([^"]+)"/g) || []).map((item) => item.replace(/^Caption="/, '').replace(/"$/, '')),
          ...(text.match(/Alias="([^"]+)"/g) || []).map((item) => item.replace(/^Alias="/, '').replace(/"$/, '')),
        ], 16);
        const tableHints = uniqueTop(text.match(/CDN\.[A-Za-z0-9_]+/g) || [], 16);
        const moduleHint = detectXmlModuleHint(text, rootElement, sourcePath);
        const bucket = ensure(xmlSignalsByModule, moduleHint);
        bucket.sources.add(asset.name);
        bucket.labels.add(path.basename(fileName).replace(/^\d+__/, '').replace(/\.(xml|xpt)\.txt$/i, '').replace(/\.txt$/i, ''));
        bucket.fileKinds.add(fileKind);
        if (rootElement) bucket.roots.add(rootElement);
        if (procedureId) bucket.procedureIds.add(procedureId);
        if (contextId) bucket.contextIds.add(contextId);
        paramHints.forEach((value) => bucket.paramHints.add(value));
        tableHints.forEach((value) => bucket.tableHints.add(value));
      }

      if (/\.(htm|html)\.txt$/i.test(sourcePath) && asset.productAreaRefId === 'PRODUCT_AREA_ACCOUNTINGMACROS') {
        const rawText = readRelativeText(sourcePath);
        const textWithoutTags = stripHtmlTags(rawText);
        const headingHints = uniqueTop([
          ...(rawText.match(/<P[^>]*><BIG><B>([^<]+)<\/B><\/BIG><\/P>/gi) || []).map((item) => stripHtmlTags(item)),
          ...(rawText.match(/<P[^>]*><B>([^<]+)<\/B>/gi) || []).map((item) => stripHtmlTags(item)),
        ], 16);
        const sampleMacroCodes = uniqueTop(textWithoutTags.match(/@[A-Z0-9_]+/g) || [], 24);
        const tableHints = uniqueTop(textWithoutTags.match(/CDN\.[A-Za-z0-9_]+/g) || [], 24);
        const sqlFunctionHints = uniqueTop([
          ...(textWithoutTags.match(/\bfn_[A-Za-z0-9_]+\b/g) || []),
          ...(textWithoutTags.match(/\bLEFT OUTER JOIN\b|\bJOIN\b|\bCASE\b/gi) || []),
        ], 16);
        const moduleHints = detectMacroModuleHints(textWithoutTags, headingHints, tableHints, asset.name);
        for (const moduleHint of moduleHints) {
          const bucket = ensure(macroSignalsByModule, moduleHint);
          bucket.sources.add(asset.name);
          bucket.labels.add(path.basename(sourcePath).replace(/^\d+__/, '').replace(/\.(htm|html)\.txt$/i, ''));
          headingHints.forEach((value) => bucket.headingHints.add(value));
          sampleMacroCodes.forEach((value) => bucket.sampleMacroCodes.add(value));
          tableHints.forEach((value) => bucket.tableHints.add(value));
          sqlFunctionHints.forEach((value) => bucket.sqlFunctionHints.add(value));
        }
      }
    }
  }

  return { xmlSignalsByModule, macroSignalsByModule };
}

function normalizeKey(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function uniqueTop(values, limit = 12) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const normalized = normalizeWhitespace(value);
    if (!normalized) continue;
    const key = normalizeKey(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
    if (result.length >= limit) break;
  }
  return result;
}

function summarizeLanguageMix(examples) {
  const counts = new Map();
  for (const example of examples) {
    const key = example.exampleLanguage || 'unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => `${name}:${count}`)
    .join('; ');
}

function stripHtmlTags(value) {
  return normalizeWhitespace(
    String(value || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&quot;/gi, '"')
      .replace(/&#8211;|&ndash;/gi, '-')
      .replace(/&#x[0-9a-f]+;|&#\d+;/gi, ' '),
  );
}

function readRelativeText(relativePath) {
  if (!relativePath) return '';
  const candidatePaths = [
    path.isAbsolute(relativePath) ? relativePath : path.join(SOURCE_ROOT, relativePath),
    path.isAbsolute(relativePath) ? '' : path.join(ROOT, relativePath),
  ].filter(Boolean);
  for (const fullPath of candidatePaths) {
    if (fs.existsSync(fullPath)) return readText(fullPath);
  }
  return '';
}

function detectXmlModuleHint(text, rootElement, sourcePath) {
  const haystack = `${rootElement} ${sourcePath} ${text}`;
  if (/ListCustomization|UserColumn|UserColumns/i.test(haystack)) return 'list_customization';
  if (/WydrukiTekstowe|RAPORT|PG_HEADER|XSL/i.test(haystack)) return 'text_print_template';
  if (/Zestawy|Wydruk|Funkcje-dodatkowe/i.test(haystack)) return 'additional_function_set';
  if (/KSeF|FAKTUR|SPRZEDAZ|ZAKUP/i.test(haystack)) return 'xml_exchange';
  return 'xml_structure';
}

const MODULE_RULES = {
  trade_warehouse: {
    label: 'Handel i magazyn',
    pattern: 'Zacznij od DokumentyHaMag, DefinicjeDokumentow, Towary i Kontrahenci. W przykładach importowych pilnuj serii dokumentu, magazynu i identyfikacji towaru.',
    cautions: 'Przykłady często zakładają gotowy plik wejściowy i istniejące definicje dokumentów. Część transformacji XPT działa na zaznaczeniach lub bieżącym obiekcie listy.',
    procedureKeywords: ['dokument', 'wydruk', 'import', 'eksport', 'format'],
    configKeywords: ['ExcelSeparator'],
    messageKeywords: ['Export_Excel_koniec', 'zatrzymana_operacja', 'Process_Aborted'],
  },
  accounting: {
    label: 'Księgowość i dekrety',
    pattern: 'Zacznij od Dekrety, Konta, Okresy i Kontrahenci. Dla importu dekretów sprawdzaj okres obrachunkowy i kompletność kont WN/MA.',
    cautions: 'Przykłady dekretowe zakładają poprawne okresy i plan kont. Błędy zwykle pojawiają się przy brakującym koncie, kontrahencie albo niezamkniętym okresie.',
    procedureKeywords: ['dekret', 'konto', 'ksieg', 'nota odsetk'],
    configKeywords: ['TypStronKsiegowych', 'PIT4Wg', 'BiuroRachunkowe'],
    messageKeywords: ['zatrzymana_operacja', 'Process_Aborted', 'Bledne_wykorzystanie_sourceEnh'],
  },
  cash_bank: {
    label: 'Kasa i bank',
    pattern: 'Zacznij od ZapisyKB, ZdarzeniaKB, RaportyKB, Rachunki i DefinicjeDokumentow. Dla importu pilnuj zgodności raportu, rachunku i formy płatności.',
    cautions: 'Przykłady kasowo-bankowe zwykle oczekują istniejących raportów i rachunków. Część skryptów sama tworzy raport, ale nie rozwiązuje konfliktów danych wejściowych.',
    procedureKeywords: ['bank', 'kasa', 'platn', 'raport', 'rozlicz'],
    configKeywords: ['ExcelSeparator'],
    messageKeywords: ['zatrzymana_operacja', 'Process_Aborted'],
  },
  vat: {
    label: 'VAT i ewidencje dodatkowe',
    pattern: 'Zacznij od RejestryVAT, dokumentu źródłowego oraz odpowiednich definicji. Dla księgowania faktur pilnuj zgodności dokumentu z rejestrem VAT.',
    cautions: 'W tym obszarze ważne są ustawienia deklaracyjne i warianty ewidencji. Przykłady często zakładają gotowe definicje rejestru oraz poprawne dane dokumentu.',
    procedureKeywords: ['vat', 'ewid', 'rejestr'],
    configKeywords: ['VAT7_', 'RozliczacVat', 'UwzgledniacSprzedaz', 'DawneZakupyZVAT'],
    messageKeywords: ['zatrzymana_operacja', 'Process_Aborted'],
  },
  prints_reporting: {
    label: 'Wydruki i raportowanie',
    pattern: 'Zacznij od WydrFormat, ZmiennaDyn i obiektu biznesowego przekazywanego do wydruku. Dla XPT sprawdzaj filtr, źródło danych i parametry dynamiczne.',
    cautions: 'Wiele przykładów wydrukowych działa na kontekście bieżącej listy lub tabeli zaznaczeń. Błędy zwykle wynikają z filtra, zmiennych dynamicznych albo konfiguracji drukarki/formatu.',
    procedureKeywords: ['wydruk', 'format', 'raport', 'drukark', 'parametr', 'zmienn'],
    configKeywords: ['ExcelSeparator', 'StosujFiltryObowiazkowe'],
    messageKeywords: ['Export_Excel_koniec', 'Zly_filtr_wyrazenie', 'Process_Aborted'],
  },
  runtime_login: {
    label: 'Logowanie i środowisko uruchomieniowe',
    pattern: 'Zacznij od Application/Login i ustawień operatora. Dla wrapperów HTA/JS sprawdzaj sposób logowania, parametry startowe i kontekst bazy.',
    cautions: 'Te przykłady zahaczają o środowisko uruchomieniowe i konfigurację logowania. Błędy wynikają zwykle z braku uprawnień operatora albo złego kontekstu bazy.',
    procedureKeywords: ['operator', 'logow', 'okno'],
    configKeywords: ['LogowanieZintegrowane', 'BRShowLoginDialog', 'NoOpeList', 'BRBackupFolder'],
    messageKeywords: ['zatrzymana_operacja', 'Process_Aborted'],
  },
  hr_payroll: {
    label: 'Kadry i płace',
    pattern: 'Zacznij od obiektu pracownika oraz danych kadrowych, a potem sprawdź wymagane atrybuty i słowniki towarzyszące.',
    cautions: 'Warstwa HR w partnerowych przykładach jest węższa niż handel i księgowość. Warto zakładać dodatkową ręczną weryfikację mapowania obiektów do schemy.',
    procedureKeywords: ['prac', 'kad', 'wyplat', 'pit'],
    configKeywords: ['PIT4Wg'],
    messageKeywords: ['zatrzymana_operacja', 'Process_Aborted'],
  },
  general_com: {
    label: 'Ogólne COM i utility',
    pattern: 'Zacznij od sesji COM, obiektu Application i minimalnego kontekstu biznesowego. Ten moduł obejmuje przykłady narzędziowe i mniej specyficzne transformacje.',
    cautions: 'To jest koszyk resztowy. Zanim użyjesz wzorca produkcyjnie, sprawdź czy nie należy go przepiąć do bardziej konkretnego modułu biznesowego.',
    procedureKeywords: ['import', 'eksport', 'wydruk'],
    configKeywords: ['ExcelSeparator'],
    messageKeywords: ['Process_Aborted'],
  },
};

function pickDictionaryHints(entries, valueGetter, keywords, limit = 10) {
  const normalizedKeywords = keywords.map((keyword) => normalizeKey(keyword));
  const picked = [];
  for (const entry of entries) {
    const haystack = normalizeKey(valueGetter(entry));
    if (!haystack) continue;
    if (!normalizedKeywords.some((keyword) => haystack.includes(keyword))) continue;
    picked.push(entry.name || entry.configKey || entry.messageConstant || entry.procedureCode || entry.id);
    if (picked.length >= limit) break;
  }
  return uniqueTop(picked, limit);
}

function buildComModuleRecipes(comExamples, comInterfaceUses, comSchemaTouchpoints, cfgEntries, procEntries, msgEntries, xmlSignalsByModule, macroSignalsByModule) {
  const byModule = new Map();
  for (const example of comExamples) {
    const moduleCode = example.moduleHint || 'general_com';
    if (!byModule.has(moduleCode)) byModule.set(moduleCode, []);
    byModule.get(moduleCode).push(example);
  }

  const recipes = [];
  for (const [moduleCode, examples] of [...byModule.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const rule = MODULE_RULES[moduleCode] || MODULE_RULES.general_com;
    const exampleIds = new Set(examples.map((example) => example.id));
    const relatedInterfaces = comInterfaceUses.filter((item) => exampleIds.has(item.sourceExampleRefId));
    const relatedTouchpoints = comSchemaTouchpoints.filter((item) => exampleIds.has(item.sourceExampleRefId));

    const interfaceHints = uniqueTop(relatedInterfaces.map((item) => item.interfaceName), 16);
    const schemaObjectHints = uniqueTop(relatedTouchpoints.map((item) => item.schemaObjectName), 16);
    const procedureHints = pickDictionaryHints(
      procEntries,
      (entry) => `${entry.name} ${entry.summary}`,
      rule.procedureKeywords,
      12,
    );
    const configHints = pickDictionaryHints(
      cfgEntries,
      (entry) => `${entry.configKey} ${entry.name} ${entry.summary}`,
      rule.configKeywords,
      12,
    );
    const messageHints = pickDictionaryHints(
      msgEntries,
      (entry) => `${entry.messageConstant} ${entry.name} ${entry.messageText} ${entry.summary}`,
      rule.messageKeywords,
      12,
    );

    const topExamples = uniqueTop(examples.map((item) => item.name), 12);
    const languageMix = summarizeLanguageMix(examples);
    const xmlSignals = xmlSignalsByModule?.get(moduleCode);
    const macroSignals = macroSignalsByModule?.get(moduleCode);
    const xmlHintList = xmlSignals
      ? uniqueTop([
        ...xmlSignals.labels,
        ...xmlSignals.roots,
        ...xmlSignals.fileKinds,
        ...xmlSignals.procedureIds,
        ...xmlSignals.contextIds,
        ...xmlSignals.paramHints,
        ...xmlSignals.tableHints,
      ], 20)
      : [];
    const macroHintList = macroSignals
      ? uniqueTop([
        ...macroSignals.labels,
        ...macroSignals.headingHints,
        ...macroSignals.sampleMacroCodes,
        ...macroSignals.tableHints,
        ...macroSignals.sqlFunctionHints,
      ], 24)
      : [];
    recipes.push({
      id: `COM_MODULE_RECIPE_${slug(moduleCode)}`,
      name: rule.label,
      description: `Partner COM module recipe for ${rule.label}.`,
      semanticType: 'partnerComModuleRecipe',
      moduleCode,
      moduleLabel: rule.label,
      exampleCount: String(examples.length),
      languageMix,
      interfaceHints: interfaceHints.join('; '),
      schemaObjectHints: schemaObjectHints.join('; '),
      procedureHintList: procedureHints.join('; '),
      configHintList: configHints.join('; '),
      messageHintList: messageHints.join('; '),
      recommendedEntryPattern: rule.pattern,
      cautions: rule.cautions,
      summary: truncate(
        `Module recipe ${rule.label}. Example count: ${examples.length}. Languages: ${languageMix || 'n/a'}. Top examples: ${topExamples.join(', ') || 'n/a'}. Interfaces: ${interfaceHints.join(', ') || 'n/a'}. Schema objects: ${schemaObjectHints.join(', ') || 'n/a'}. XML hints: ${xmlHintList.join(', ') || 'n/a'}. Macro hints: ${macroHintList.join(', ') || 'n/a'}. Procedure hints: ${procedureHints.join(', ') || 'n/a'}. Config hints: ${configHints.join(', ') || 'n/a'}. Message hints: ${messageHints.join(', ') || 'n/a'}. Pattern: ${rule.pattern}`,
        1200,
      ),
    });
  }
  return recipes;
}

function comExampleEntries(extractionStateById, assetsById) {
  const examples = [];
  const interfaceUses = [];
  const touchpoints = [];

  for (const [assetId, extractionState] of extractionStateById.entries()) {
    const asset = assetsById.get(assetId);
    if (!asset) continue;
    if (!/Przyklady-uzycia-obiektow-COM/i.test(asset.name || '')) continue;

    for (const extractedFile of extractionState.extractedFiles || []) {
      const sourcePath = path.join(SOURCE_ROOT, extractedFile.outputPath);
      if (!fs.existsSync(sourcePath)) continue;
      const text = readText(sourcePath);
      if (!isComExampleCandidate(extractedFile.outputPath, text)) continue;

      const comDoc = parseComDocBlock(text);
      const interfaces = [...new Set([...(comDoc?.interfaces || [])].map((value) => normalizeWhitespace(value)).filter(Boolean))];
      const activeX = detectActiveXObjects(text);
      const name = baseExtractName(extractedFile.outputPath);
      const language = exampleLanguage(extractedFile.outputPath);
      const kind = exampleKind(extractedFile.outputPath, text);
      const schemaHints = detectSchemaTouchpoints(name, text);
      const moduleHint = detectModuleHint(schemaHints, name, interfaces, activeX, language);
      const sourceKey = path.basename(extractedFile.outputPath).replace(/\.txt$/i, '');
      const exampleId = makeId('COM_EXAMPLE', `${assetId}_${sourceKey}`);

      examples.push({
        id: exampleId,
        name,
        description: comDoc?.opis || `Partner COM example ${name}.`,
        semanticType: 'partnerComExample',
        exampleKind: kind,
        exampleLanguage: language,
        sourceAssetRefId: assetId,
        versionBandRefId: asset.versionBandRefId || '',
        sourcePath: extractedFile.outputPath,
        exampleTitle: name,
        authorCode: comDoc?.osoba || '',
        optimaVersion: comDoc?.optVer || '',
        launchNotes: comDoc?.uruchomienie || '',
        interfaceList: interfaces.join('; '),
        activeXList: activeX.join('; '),
        moduleHint,
        summary: truncate(
          `Partner COM example ${name}. Kind: ${kind}. Language: ${language}. Module: ${moduleHint}. Interfaces: ${interfaces.join(', ') || 'n/a'}. ActiveX: ${activeX.join(', ') || 'n/a'}. Source asset: ${asset.name}. Launch notes: ${comDoc?.uruchomienie || 'n/a'}.`,
          600,
        ),
      });

      const seenInterfaces = new Set();
      for (const interfaceName of interfaces) {
        const normalized = normalizeWhitespace(interfaceName);
        if (!normalized || seenInterfaces.has(`COM_DOK:${normalized}`)) continue;
        seenInterfaces.add(`COM_DOK:${normalized}`);
        interfaceUses.push({
          id: `COM_IFACE_${slug(`${exampleId}_COM_DOK_${normalized}`)}`,
          name: normalized,
          description: `COM interface usage ${normalized} in partner example ${name}.`,
          semanticType: 'partnerComInterfaceUse',
          interfaceName: normalized,
          sourceExampleRefId: exampleId,
          sourceAssetRefId: assetId,
          versionBandRefId: asset.versionBandRefId || '',
          interfaceSource: 'COM_DOK',
          exampleLanguage: language,
          sourcePath: extractedFile.outputPath,
          summary: truncate(`Interface ${normalized} declared in COM_DOK for example ${name}. Source asset: ${asset.name}.`, 320),
        });
      }
      for (const activeXName of activeX) {
        const normalized = normalizeWhitespace(activeXName);
        if (!normalized || seenInterfaces.has(`ACTIVEX:${normalized}`)) continue;
        seenInterfaces.add(`ACTIVEX:${normalized}`);
        interfaceUses.push({
          id: `COM_IFACE_${slug(`${exampleId}_ACTIVEX_${normalized}`)}`,
          name: normalized,
          description: `Runtime COM object ${normalized} used in partner example ${name}.`,
          semanticType: 'partnerComInterfaceUse',
          interfaceName: normalized,
          sourceExampleRefId: exampleId,
          sourceAssetRefId: assetId,
          versionBandRefId: asset.versionBandRefId || '',
          interfaceSource: 'ACTIVEX',
          exampleLanguage: language,
          sourcePath: extractedFile.outputPath,
          summary: truncate(`Runtime object ${normalized} used by example ${name}. Source asset: ${asset.name}.`, 320),
        });
      }

      for (const touchpoint of schemaHints) {
        touchpoints.push({
          id: `COM_TOUCH_${slug(`${exampleId}_${touchpoint.objectName}`)}`,
          name: `${name} -> ${touchpoint.objectName}`,
          description: `Schema touchpoint from partner COM example ${name} to ${touchpoint.objectName}.`,
          semanticType: 'partnerComSchemaTouchpoint',
          sourceExampleRefId: exampleId,
          sourceAssetRefId: assetId,
          versionBandRefId: asset.versionBandRefId || '',
          targetKbName: 'Comarch Optima ERP MSSQL Schema',
          targetNamespace: 'ComarchOptimaSchema',
          schemaObjectName: touchpoint.objectName,
          moduleHint,
          evidence: touchpoint.evidence,
          sourcePath: extractedFile.outputPath,
          summary: truncate(`COM example ${name} touches schema object ${touchpoint.objectName}. Evidence: ${touchpoint.evidence}. Source asset: ${asset.name}.`, 360),
        });
      }
    }
  }

  return { examples, interfaceUses, touchpoints };
}

function buildChunks(referenceDocs, categories, assets, assetReferenceDocs, extractExampleDocs, downloadStateById, extractionStateById) {
  const chunks = [];
  const auditMarkdown = fs.existsSync(AUDIT_PATH) ? readText(AUDIT_PATH) : '';
  const sections = splitMarkdownSections(auditMarkdown);
  sections.forEach((section, index) => {
    chunks.push({
      id: `PARTNER_CHUNK_AUDIT_${index + 1}`,
      name: `Audit Chunk ${index + 1}`,
      description: `Partner technical audit chunk ${index + 1}.`,
      semanticType: 'chunk',
      sourceDocumentRefId: 'PARTNER_TECH_AUDIT',
      sourceUrl: 'https://partner.erp.comarch.pl/kategoria/comarch-erp-optima/',
      sourcePath: path.relative(ROOT, AUDIT_PATH).replaceAll(path.sep, '/'),
      sectionHeading: section.heading,
      sectionOrder: String(index + 1),
      content: truncate(section.content, 3800),
    });
  });

  categories.forEach((category, index) => {
    chunks.push({
      id: `PARTNER_CHUNK_CATEGORY_${category.id}`,
      name: `Category Chunk ${category.name}`,
      description: `Category summary chunk for ${category.name}.`,
      semanticType: 'chunk',
      sourceDocumentRefId: 'PARTNER_TECH_ROOT',
      sourceUrl: category.portalUrl,
      sourcePath: 'partner_api/categories',
      sectionHeading: category.name,
      sectionOrder: String(index + 1),
      content: truncate(`Partner category ${category.name}. Slug: ${category.categorySlug}. Group: ${category.categoryGroup}. Lifecycle: ${category.lifecycleBand}. Count: ${category.itemCount}. Use: ${category.recommendedUse}.`, 1200),
    });
  });

  assets
    .filter((asset) => asset.overlapPolicy === 'INDEX_AND_RETRIEVE')
    .sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')) || a.name.localeCompare(b.name))
    .slice(0, 120)
    .forEach((asset, index) => {
      chunks.push({
        id: `PARTNER_CHUNK_ASSET_${asset.id}`,
      name: `Asset Chunk ${asset.name}`,
      description: `Asset metadata chunk for ${asset.name}.`,
      semanticType: 'chunk',
      sourceDocumentRefId: 'PARTNER_TECH_ROOT',
      sourceUrl: asset.sourceUrl || asset.directDownloadUrl,
      sourcePath: 'partner_api/media',
      sectionHeading: asset.name,
      sectionOrder: String(index + 1),
      content: truncate(`Partner technical asset ${asset.name}. Category ref: ${asset.categoryRefId}. Asset type ref: ${asset.assetTypeRefId}. Product area ref: ${asset.productAreaRefId}. Version ref: ${asset.versionBandRefId || 'none'}. MIME: ${asset.mimeType}. Extension: ${asset.fileExtension}. Published: ${asset.publishedAt}. State: ${asset.currentState}. Overlap policy: ${asset.overlapPolicy}. Download: ${asset.directDownloadUrl}. Summary: ${asset.summary}`, 1600),
      });
    });

  const assetDocByAssetId = new Map(
    assetReferenceDocs.map((doc) => [doc.id.replace(/^PARTNER_ASSET_DOC_/, ''), doc]),
  );
  const exampleDocByExtractPath = new Map();
  for (const doc of extractExampleDocs) {
    for (const sourcePath of doc.sourceExtractPaths || [doc.sourceExtractPath]) {
      if (sourcePath) exampleDocByExtractPath.set(sourcePath, doc);
    }
  }

  for (const asset of assets) {
    const assetDoc = assetDocByAssetId.get(asset.id);
    if (!assetDoc) continue;

    const downloadState = downloadStateById.get(asset.id);
    const extractionState = extractionStateById.get(asset.id);

    const pdfTextPath = downloadState?.sidecars?.pdfText?.extractedTextPath
      ? path.join(SOURCE_ROOT, downloadState.sidecars.pdfText.extractedTextPath)
      : '';
    if (pdfTextPath && fs.existsSync(pdfTextPath)) {
      chunks.push({
        id: `PARTNER_CHUNK_EXTRACT_${asset.id}_PDF`,
        name: `Extract Chunk ${asset.name} PDF`,
        description: `Recovered PDF text for ${asset.name}.`,
        semanticType: 'chunk',
        sourceDocumentRefId: assetDoc.id,
        sourceUrl: asset.directDownloadUrl || asset.sourceUrl,
        sourcePath: path.relative(ROOT, pdfTextPath).replaceAll(path.sep, '/'),
        sectionHeading: `${asset.name} PDF Extract`,
        sectionOrder: '1',
        content: truncate(readText(pdfTextPath), 3800),
      });
    }

    let entryOrder = 1;
    for (const extractedFile of extractionState?.extractedFiles || []) {
      const sourcePath = path.join(SOURCE_ROOT, extractedFile.outputPath);
      if (!fs.existsSync(sourcePath)) continue;
      const exampleDoc = exampleDocByExtractPath.get(extractedFile.outputPath);
      chunks.push({
        id: `PARTNER_CHUNK_EXTRACT_${asset.id}_${String(entryOrder).padStart(3, '0')}`,
        name: `Extract Chunk ${asset.name} ${entryOrder}`,
        description: `Extracted archive text for ${asset.name}.`,
        semanticType: 'chunk',
        sourceDocumentRefId: exampleDoc?.id || assetDoc.id,
        sourceUrl: asset.directDownloadUrl || asset.sourceUrl,
        sourcePath: path.relative(ROOT, sourcePath).replaceAll(path.sep, '/'),
        sectionHeading: exampleDoc ? exampleExtractName(extractedFile.outputPath) : extractedFile.entryName,
        sectionOrder: String(entryOrder),
        content: truncate(readText(sourcePath), 3800),
      });
      entryOrder += 1;
    }
  }

  return chunks;
}

function refreshReadme(files) {
  const assetRows = fs.readFileSync(path.join(EXPORT_DIR, 'partner_asset.csv'), 'utf8').trim().split('\n');
  const assetHeader = assetRows.shift().split(',');
  const overlapIndex = assetHeader.indexOf('overlapPolicy');
  let routeOnly = 0;
  let indexAndRetrieve = 0;
  for (const line of assetRows) {
    const cols = line.match(/(?:"[^"]*(?:""[^"]*)*"|[^,])+/g) || [];
    const value = overlapIndex >= 0 ? cols[overlapIndex]?.replace(/^"|"$/g, '').replace(/""/g, '"') : '';
    if (value === 'ROUTE_ONLY') routeOnly += 1;
    if (value === 'INDEX_AND_RETRIEVE') indexAndRetrieve += 1;
  }
  const lines = [
    '# Comarch Optima Partner Technical KB Staging',
    '',
    'Prepared staging:',
    '',
    '- KB name: `Comarch Optima Partner Technical`',
    '- namespace: `ComarchOptimaPartnerTechnical`',
    '- OpenSPG project id: `9`',
    '- source model: metadata-first partner portal ingestion',
    '- anti-duplication model: route overlapping areas into specialist KBs',
    '',
    'Current staged row counts:',
    '',
    ...files.map((file) => `- \`${file.fileName}\`: \`${file.rowCount}\``),
    '',
    'Source notes:',
    '',
    '- partner metadata snapshots live under `downloads/partner/optima_technical/api/`',
    '- central URL provenance registry lives under `downloads/partner/optima_technical/source_registry.json`',
    '- selective download manifest lives under `downloads/partner/optima_technical/download_manifest.json`',
    '- set `PARTNER_COOKIE` and `PARTNER_REFRESH=1` to refresh live category/media metadata',
    '- use `scripts/download_optima_partner_technical_assets.mjs` for controlled binary retrieval',
    `- overlap split: \`ROUTE_ONLY=${routeOnly}\`, \`INDEX_AND_RETRIEVE=${indexAndRetrieve}\``,
    '',
  ];
  fs.writeFileSync(README_PATH, lines.join('\n'), 'utf8');
}

ensureDir(EXPORT_DIR);
ensureDir(SOURCE_ROOT);
ensureDir(API_DIR);

let snapshot = {
  categories: readJsonIfExists(path.join(API_DIR, 'categories.json'), []),
  media: readJsonIfExists(path.join(API_DIR, 'media.json'), []),
};
const downloadedAssetState = assetRunStateMap(readJsonIfExists(DOWNLOAD_MANIFEST_PATH, { runs: [] }).runs || []);
const extractedArchiveState = extractionRunStateMap(readJsonIfExists(EXTRACTION_MANIFEST_PATH, { runs: [] }).runs || []);

if (PARTNER_REFRESH) {
  snapshot = await refreshSnapshots();
}

const categoriesSeed = snapshot.categories.length ? snapshot.categories : BASE_CATEGORY_ROWS;
const categoryMap = new Map(categoriesSeed.map((category) => [category.id, category]));
const mediaRows = snapshot.media.map((item) => ({
  id: item.id,
  date: item.date || '',
  slug: item.slug || '',
  title: item.title?.rendered || item.title || '',
  link: item.link || '',
  source_url: item.source_url || '',
  mime_type: item.mime_type || '',
  categoryId: Number(item._seedCategoryId || item.categoryId || 0),
}));

const referenceDocuments = buildReferenceDocuments();
const partnerCategories = buildPartnerCategories(categoriesSeed);
const productAreas = buildProductAreas();
const assetTypes = buildAssetTypes(mediaRows);
const versionBands = buildVersionBands(mediaRows, categoryMap);
const partnerAssets = buildPartnerAssets(mediaRows, categoryMap);
const partnerAssetsById = new Map(partnerAssets.map((asset) => [asset.id, asset]));
const assetReferenceDocuments = buildAssetReferenceDocuments(partnerAssets, downloadedAssetState, extractedArchiveState);
const extractExampleDocuments = buildExtractExampleDocuments(partnerAssets, extractedArchiveState);
const promotedKnowledge = loadPromotedKnowledge('ComarchOptimaPartnerTechnical');
const promotedReferenceDocuments = promotedKnowledge.map((draft) => ({
  id: makeId('PARTNER_DOC_PROMOTED', draft.id),
  name: draft.title,
  description: `Promoted knowledge inbox draft for ${draft.kbName}.`,
  semanticType: 'reference_document',
  sourceUrl: draft.sourceUrl || `local://knowledge-inbox/${draft.id}`,
  sourceType: 'promoted_knowledge_draft',
  documentCategory: 'promoted_knowledge',
  versionHint: draft.promotedAt ? draft.promotedAt.slice(0, 10) : 'local',
  articleUpdatedAt: draft.promotedAt || '',
  relatedKnowledgeBase: draft.kbNamespace,
  summary: truncate(draft.content, 800),
}));
const allReferenceDocuments = [...referenceDocuments, ...assetReferenceDocuments, ...extractExampleDocuments, ...promotedReferenceDocuments];
const { cfgEntries, procEntries, msgEntries } = dictionaryEntries(extractedArchiveState, partnerAssetsById);
const { examples: comExamples, interfaceUses: comInterfaceUses, touchpoints: comSchemaTouchpoints } = comExampleEntries(extractedArchiveState, partnerAssetsById);
const { xmlSignalsByModule, macroSignalsByModule } = collectMacroAndXmlSignals(extractedArchiveState, partnerAssetsById);
const comModuleRecipes = buildComModuleRecipes(
  comExamples,
  comInterfaceUses,
  comSchemaTouchpoints,
  cfgEntries,
  procEntries,
  msgEntries,
  xmlSignalsByModule,
  macroSignalsByModule,
);
const knowledgeRoutes = buildKnowledgeRoutes();
const chunks = buildChunks(
  allReferenceDocuments,
  partnerCategories,
  partnerAssets,
  assetReferenceDocuments,
  extractExampleDocuments,
  downloadedAssetState,
  extractedArchiveState,
);
for (const draft of promotedKnowledge) {
  const documentId = makeId('PARTNER_DOC_PROMOTED', draft.id);
  splitMarkdownSections(`# ${draft.title}\n\n${draft.content}`).forEach((section, index) => {
    chunks.push({
      id: makeId('PARTNER_CHUNK_PROMOTED', `${draft.id}_${index + 1}`),
      name: `${draft.title} chunk ${index + 1}`,
      description: `Promoted knowledge inbox chunk for ${draft.title}.`,
      semanticType: 'chunk',
      sourceDocumentRefId: documentId,
      sourceUrl: draft.sourceUrl || `local://knowledge-inbox/${draft.id}`,
      sourcePath: draft.promotedMarkdownPath,
      sectionHeading: section.heading,
      sectionOrder: String(index + 1),
      content: truncate(section.content || draft.content, 3800),
    });
  });
}
writeSourceRegistry(allReferenceDocuments, partnerCategories, partnerAssets);

const files = [
  writeCsv(EXPORT_DIR, 
    'reference_document.csv',
    ['id', 'name', 'description', 'semanticType', 'sourceUrl', 'sourceType', 'documentCategory', 'versionHint', 'articleUpdatedAt', 'relatedKnowledgeBase', 'summary'],
    allReferenceDocuments,
  ),
  writeCsv(EXPORT_DIR, 
    'partner_category.csv',
    ['id', 'name', 'description', 'semanticType', 'categorySlug', 'parentCategoryRefId', 'categoryGroup', 'lifecycleBand', 'overlapPolicy', 'portalUrl', 'itemCount', 'recommendedUse', 'summary'],
    partnerCategories,
  ),
  writeCsv(EXPORT_DIR, 
    'partner_asset.csv',
    ['id', 'name', 'description', 'semanticType', 'sourceUrl', 'directDownloadUrl', 'assetTypeRefId', 'categoryRefId', 'versionBandRefId', 'productAreaRefId', 'overlapPolicy', 'primaryRouteKbName', 'primaryRouteNamespace', 'mimeType', 'fileExtension', 'publishedAt', 'currentState', 'localSnapshotPath', 'summary'],
    partnerAssets,
  ),
  writeCsv(EXPORT_DIR, 
    'asset_type.csv',
    ['id', 'name', 'description', 'semanticType', 'assetKind', 'mimeFamily', 'typicalUse', 'sourceCategoryHint', 'summary'],
    assetTypes,
  ),
  writeCsv(EXPORT_DIR, 
    'version_band.csv',
    ['id', 'name', 'description', 'semanticType', 'versionCode', 'lifecycleState', 'releaseFamily', 'sourceCategoryHint', 'summary'],
    versionBands,
  ),
  writeCsv(EXPORT_DIR, 
    'product_area.csv',
    ['id', 'name', 'description', 'semanticType', 'areaCode', 'scopeType', 'targetKbName', 'targetNamespace', 'recommendedUse', 'summary'],
    productAreas,
  ),
  writeCsv(EXPORT_DIR, 
    'cfg_entry.csv',
    ['id', 'name', 'description', 'semanticType', 'configKey', 'configType', 'sourceAssetRefId', 'versionBandRefId', 'sourcePath', 'summary'],
    cfgEntries,
  ),
  writeCsv(EXPORT_DIR, 
    'proc_entry.csv',
    ['id', 'name', 'description', 'semanticType', 'procedureCode', 'sourceAssetRefId', 'versionBandRefId', 'sourcePath', 'summary'],
    procEntries,
  ),
  writeCsv(EXPORT_DIR, 
    'msg_entry.csv',
    ['id', 'name', 'description', 'semanticType', 'messageCode', 'messageConstant', 'messageText', 'sourceAssetRefId', 'versionBandRefId', 'sourcePath', 'summary'],
    msgEntries,
  ),
  writeCsv(EXPORT_DIR, 
    'com_example.csv',
    ['id', 'name', 'description', 'semanticType', 'exampleKind', 'exampleLanguage', 'sourceAssetRefId', 'versionBandRefId', 'sourcePath', 'exampleTitle', 'authorCode', 'optimaVersion', 'launchNotes', 'interfaceList', 'activeXList', 'moduleHint', 'summary'],
    comExamples,
  ),
  writeCsv(EXPORT_DIR, 
    'com_interface_use.csv',
    ['id', 'name', 'description', 'semanticType', 'interfaceName', 'sourceExampleRefId', 'sourceAssetRefId', 'versionBandRefId', 'interfaceSource', 'exampleLanguage', 'sourcePath', 'summary'],
    comInterfaceUses,
  ),
  writeCsv(EXPORT_DIR, 
    'com_schema_touchpoint.csv',
    ['id', 'name', 'description', 'semanticType', 'sourceExampleRefId', 'sourceAssetRefId', 'versionBandRefId', 'targetKbName', 'targetNamespace', 'schemaObjectName', 'moduleHint', 'evidence', 'sourcePath', 'summary'],
    comSchemaTouchpoints,
  ),
  writeCsv(EXPORT_DIR, 
    'com_module_recipe.csv',
    ['id', 'name', 'description', 'semanticType', 'moduleCode', 'moduleLabel', 'exampleCount', 'languageMix', 'interfaceHints', 'schemaObjectHints', 'procedureHintList', 'configHintList', 'messageHintList', 'recommendedEntryPattern', 'cautions', 'summary'],
    comModuleRecipes,
  ),
  writeCsv(EXPORT_DIR, 
    'knowledge_route.csv',
    ['id', 'name', 'description', 'semanticType', 'routeType', 'targetKbName', 'targetNamespace', 'recommendedWhen', 'anchorObjects', 'summary'],
    knowledgeRoutes,
  ),
  writeCsv(EXPORT_DIR, 
    'chunk.csv',
    ['id', 'name', 'description', 'semanticType', 'sourceDocumentRefId', 'sourceUrl', 'sourcePath', 'sectionHeading', 'sectionOrder', 'content'],
    chunks,
  ),
];

const manifest = {
  generatedAt: new Date().toISOString(),
  namespace: 'ComarchOptimaPartnerTechnical',
  projectIntent: 'partner-only technical KB for Comarch ERP Optima',
  sourceRoot: SOURCE_ROOT,
  partnerRefreshUsed: PARTNER_REFRESH,
  liveSnapshotCounts: {
    categories: snapshot.categories.length,
    media: snapshot.media.length,
  },
  files,
};

writeJson(MANIFEST_PATH, manifest);
refreshReadme(files);

console.log(JSON.stringify({
  success: true,
  exportDir: EXPORT_DIR,
  sourceRoot: SOURCE_ROOT,
  snapshotCategories: snapshot.categories.length,
  snapshotMedia: snapshot.media.length,
  files: files.length,
}, null, 2));
