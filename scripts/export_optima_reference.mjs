#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { loadPromotedKnowledge } from './lib/promoted_knowledge.mjs';
import { shouldSuppressPromotedOptimaReferenceDraft } from './lib/optima_reference_duplicates.mjs';
import { ensureDir, writeCsv, writeJson, makeId } from './lib/export_utils.mjs';

const ROOT = '/docker/openspg';
const EXPORT_DIR = path.join(ROOT, 'exports/optima_reference/v1');
const MANIFEST_PATH = path.join(EXPORT_DIR, '_manifest.json');
const README_PATH = path.join(EXPORT_DIR, 'README.md');
const SOURCE_ROOT = path.join(ROOT, 'downloads/official/optima_reference');
const PAGES_DIR = path.join(SOURCE_ROOT, 'pages');
const SITEMAPS_DIR = path.join(SOURCE_ROOT, 'sitemaps');
const META_DIR = path.join(SOURCE_ROOT, 'meta');
const SOURCE_REGISTRY_PATH = path.join(META_DIR, 'source_registry.json');

function fileSha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
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
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  }
  walk(rootDir);
  return results.sort((a, b) => a.localeCompare(b));
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function parseSitemap(filePath) {
  const xml = readText(filePath);
  const rows = [];
  const regex = /<url><loc>(.*?)<\/loc>(?:<lastmod>(.*?)<\/lastmod>)?<\/url>/g;
  let match;
  while ((match = regex.exec(xml))) {
    rows.push({
      loc: match[1],
      lastmod: match[2] || '',
    });
  }
  return rows;
}

function slugFromUrl(url) {
  const parts = String(url || '')
    .replace(/[?#].*$/, '')
    .split('/')
    .filter(Boolean);
  return parts[parts.length - 1] || '';
}

function humanizeSlug(value) {
  return String(value || '')
    .split('-')
    .filter(Boolean)
    .map((part) => {
      if (/^\d/.test(part)) return part;
      if (part.toUpperCase() === part && part.length <= 5) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
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

function snapshotSlug(filePath) {
  const base = path.basename(filePath, path.extname(filePath));
  return base.replace(/_print$/i, '').replace(/_/g, '-');
}

function canonicalSlugKey(value) {
  return String(value || '').toLowerCase().replace(/[-_]+/g, '-');
}

function inferModuleScope(value) {
  const lower = String(value || '').toLowerCase();
  if (/handel|magazyn|towar|kontrah|cennik|faktur|paragon/.test(lower)) return 'TradeAndWarehouse';
  if (/kasa|bank|przelew|raport-kasowy|raport-bankowy/.test(lower)) return 'CashAndBank';
  if (/ksieg|plan-kont|vat|jpk|deklar|dekret|rejestr/.test(lower)) return 'AccountingAndCompliance';
  if (/plac|kadry|pracown|wyplat|urlop|nieobecn/.test(lower)) return 'HRAndPayroll';
  if (/crm|serwis|kontakt|zadani|ofert/.test(lower)) return 'CRMAndService';
  if (/obieg-dokumentow|workflow|iwd/.test(lower)) return 'DocumentWorkflow';
  if (/personalizacja|kolumn|wydruk|genrap|sql/.test(lower)) return 'PersonalizationAndReporting';
  if (/ksef|ocr|api|integrac|exchange|import|export/.test(lower)) return 'IntegrationsAndServices';
  if (/instalac|aktualiz|uruchom|wymagania|serwer|backup|kopia|logowan|rejestracja/.test(lower)) return 'PlatformAndAdministration';
  return 'General';
}

function inferDocumentCategory(url) {
  const lower = String(url || '').toLowerCase();
  if (/szybki-start|podstawowe-elementy|wiadomosci-ogolne/.test(lower)) return 'orientation';
  if (/wymagania|uruchomienie|kopia-bezpieczenstwa|instalacja|logowanie/.test(lower)) return 'administration';
  if (/personalizacja|wydruk|kolumn|zapytan-sql/.test(lower)) return 'personalization_reporting';
  if (/aktualizacje-po-wydaniu|nowosci-i-zmiany/.test(lower)) return 'updates';
  if (/faq|pytanie-|ostrzezenie-|informacja-/.test(lower)) return 'troubleshooting';
  if (/ksef|ocr|api|internetowa-wymiana-dokumentow/.test(lower)) return 'integration';
  if (/handel|kasa-i-bank|crm|ksiegowosc|place-i-kadry|obieg-dokumentow|ogolne-9/.test(lower)) return 'module_entry';
  return 'help_article';
}

function generatedSummary({ title, moduleScope, documentCategory, lastModified }) {
  const freshness = lastModified ? ` Last updated ${lastModified.slice(0, 10)}.` : '';
  return truncate(
    `Official Comarch ERP Optima help article covering ${title}. Category: ${documentCategory}. Module scope: ${moduleScope}.${freshness}`,
    360,
  );
}

function versionCodeFromText(value) {
  const match = String(value || '').match(/(20\d{2}(?:-\d(?:-\d)?)?)/);
  if (!match) return '';
  return match[1].replace(/-/g, '.');
}

function topCategoryGroup(categorySlug) {
  const lower = String(categorySlug || '').toLowerCase();
  if (/nowosci-i-zmiany/.test(lower)) return 'update_stream';
  if (/faq/.test(lower)) return 'faq_cluster';
  if (/konfiguracja-programu/.test(lower)) return 'configuration';
  if (/handel|magazyn|kasa-i-bank|crm|ksiegowosc|place-i-kadry|obieg-dokumentow|srodki-trwale/.test(lower)) return 'module';
  if (/instalacja|uruchamianie|serwer-bazy-danych|ogolne/.test(lower)) return 'platform';
  if (/personalizacja|wydruki/.test(lower)) return 'personalization_reporting';
  if (/ksef|ocr|api|internetowa-wymiana-dokumentow/.test(lower)) return 'integration';
  return 'category';
}

function priorityTier(categorySlug) {
  const lower = String(categorySlug || '').toLowerCase();
  if (/^ogolne$|^ogolne-i-kasabank$|^handel$|^handel-z-magazynem$|^kasa-i-bank$|^crm-serwis$|^ksiega-handlowa$|^ksiega-podatkowa$|^place-i-kadry$|^obieg-dokumentow$|^personalizacja$|^instalacja-i-aktualizacje$/.test(lower)) {
    return 'top';
  }
  if (/nowosci-i-zmiany/.test(lower)) return 'release';
  return 'detail';
}

ensureDir(EXPORT_DIR);

const sitemapFiles = listFilesRecursive(SITEMAPS_DIR).filter((filePath) => filePath.endsWith('.xml'));
const pageFiles = listFilesRecursive(PAGES_DIR).filter((filePath) => filePath.endsWith('.html'));

const categoryEntries = sitemapFiles
  .filter((filePath) => filePath.includes('categories'))
  .flatMap(parseSitemap);

const articleEntries = sitemapFiles
  .filter((filePath) => /ht_kb[-_]\d+\.xml$/.test(filePath))
  .flatMap(parseSitemap);

const snapshotPages = pageFiles.map((filePath) => {
  const html = readText(filePath);
  const pageSlug = snapshotSlug(filePath);
  const title = extractTitleFromHtml(html, humanizeSlug(pageSlug));
  const paragraphs = extractParagraphsFromHtml(html);
  const summary = truncate(paragraphs.slice(0, 3).join(' '), 1000) || generatedSummary({
    title,
    moduleScope: inferModuleScope(pageSlug),
    documentCategory: inferDocumentCategory(pageSlug),
    lastModified: '',
  });
  return {
    filePath,
    relPath: path.relative(ROOT, filePath).replaceAll(path.sep, '/'),
    slug: pageSlug,
    title,
    paragraphs,
    summary,
  };
});

const snapshotBySlug = new Map();
for (const page of snapshotPages) {
  const key = canonicalSlugKey(page.slug);
  if (!snapshotBySlug.has(key)) snapshotBySlug.set(key, page);
}
const referenceMap = new Map();
const matchedSnapshotPaths = new Set();

for (const entry of articleEntries) {
  const articleSlug = slugFromUrl(entry.loc);
  const snapshot = snapshotBySlug.get(canonicalSlugKey(articleSlug));
  if (snapshot) matchedSnapshotPaths.add(snapshot.relPath);
  const title = snapshot?.title || humanizeSlug(articleSlug);
  const moduleScope = inferModuleScope(entry.loc);
  const documentCategory = inferDocumentCategory(entry.loc);
  referenceMap.set(entry.loc, {
    id: makeId('REF_DOC', entry.loc),
    name: title,
    description: `Official Comarch ERP Optima help article ${title}.`,
    semanticType: 'reference_document',
    sourceUrl: entry.loc,
    sourceType: snapshot ? 'official_help_print_snapshot' : 'official_help_sitemap',
    documentCategory,
    moduleScope,
    categoryHint: articleSlug,
    versionHint: entry.lastmod ? entry.lastmod.slice(0, 4) : '2026',
    lastModified: entry.lastmod,
    localSnapshotPath: snapshot?.relPath || '',
    sourceOrigin: 'pomoc.comarch.pl',
    summary: snapshot?.summary || generatedSummary({
      title,
      moduleScope,
      documentCategory,
      lastModified: entry.lastmod,
    }),
  });
}

for (const page of snapshotPages) {
  if (matchedSnapshotPaths.has(page.relPath)) continue;
  const sourceUrl = `https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/${page.slug}/`;
  if (!referenceMap.has(sourceUrl)) {
    const moduleScope = inferModuleScope(page.slug);
    const documentCategory = inferDocumentCategory(page.slug);
    referenceMap.set(sourceUrl, {
      id: makeId('REF_DOC', sourceUrl),
      name: page.title,
      description: `Official Comarch ERP Optima help page ${page.title}.`,
      semanticType: 'reference_document',
      sourceUrl,
      sourceType: 'official_help_print_snapshot',
      documentCategory,
      moduleScope,
      categoryHint: page.slug,
      versionHint: '2026',
      lastModified: '',
      localSnapshotPath: page.relPath,
      sourceOrigin: 'pomoc.comarch.pl',
      summary: page.summary,
    });
  }
}

const referenceDocuments = [...referenceMap.values()].sort((a, b) => a.sourceUrl.localeCompare(b.sourceUrl));
const promotedKnowledge = loadPromotedKnowledge('ComarchOptimaReference');
const suppressedPromotedDrafts = [];
for (const draft of promotedKnowledge) {
  if (draft.sourceUrl && shouldSuppressPromotedOptimaReferenceDraft(draft.sourceUrl, { root: ROOT, officialDocuments: referenceDocuments })) {
    suppressedPromotedDrafts.push({
      draftId: draft.id,
      sourceUrl: draft.sourceUrl,
      title: draft.title,
      promotedJsonPath: draft.promotedJsonPath || '',
      promotedMarkdownPath: draft.promotedMarkdownPath || '',
    });
    continue;
  }
  referenceDocuments.push({
    id: makeId('REF_DOC_PROMOTED', draft.id),
    name: draft.title,
    description: `Promoted knowledge inbox draft for ${draft.kbName}.`,
    semanticType: 'reference_document',
    sourceUrl: draft.sourceUrl || `local://knowledge-inbox/${draft.id}`,
    sourceType: 'promoted_knowledge_draft',
    documentCategory: 'promoted_knowledge',
    moduleScope: inferModuleScope(`${draft.title} ${draft.content}`),
    categoryHint: draft.tags?.join('; ') || 'knowledge-inbox',
    versionHint: draft.promotedAt ? draft.promotedAt.slice(0, 4) : 'local',
    lastModified: draft.promotedAt || '',
    localSnapshotPath: draft.promotedMarkdownPath,
    sourceOrigin: 'KnowledgeInboxPromoted',
    summary: truncate(draft.content, 420),
  });
}

const helpCategories = categoryEntries.map((entry) => {
  const categorySlug = slugFromUrl(entry.loc);
  const moduleScope = inferModuleScope(categorySlug);
  return {
    id: makeId('REF_CAT', entry.loc),
    name: humanizeSlug(categorySlug),
    description: `Official Optima help category ${humanizeSlug(categorySlug)}.`,
    semanticType: 'help_category',
    sourceUrl: entry.loc,
    categorySlug,
    categoryGroup: topCategoryGroup(categorySlug),
    moduleScope,
    priorityTier: priorityTier(categorySlug),
    summary: truncate(
      `Official Comarch ERP Optima help category for ${humanizeSlug(categorySlug)}. Group: ${topCategoryGroup(categorySlug)}. Module scope: ${moduleScope}.`,
      320,
    ),
  };
});

const moduleAreas = [
  ['General', 'General orientation, startup, and shared product behavior.', 'ogolne-9', 'ogolne;ogolne-i-kasabank;uruchamianie-programu', 'orientation and shared platform topics', 'Use before diving into module-specific or implementation-specific knowledge.'],
  ['TradeAndWarehouse', 'Trade, documents, stock, and warehouse-oriented product use.', 'handel-i-magazyn-3', 'handel;handel-z-magazynem;magazyn;kontrahenci;cennik', 'sales, warehouse, and item workflows', 'Pair with ComarchOptimaSchema when the task turns into SQL or print-source design.'],
  ['CashAndBank', 'Cash, bank, settlements, transfers, and payment operations.', 'kasa-i-bank', 'kasa-i-bank;banki;urzedy', 'bank and cash workflows', 'Many reporting questions here cross into accounting structures and bank integration topics.'],
  ['AccountingAndCompliance', 'Accounting, VAT, JPK, declarations, and compliance-heavy flows.', 'ksiegowosc-56', 'ksiega-handlowa;ksiega-podatkowa;plan-kont;zestawienia-ksiegowe', 'accounting, tax, and compliance tasks', 'Use together with ComarchOptimaSchema for SQL-object and table-structure questions.'],
  ['HRAndPayroll', 'Payroll, HR, employees, absences, and labor law related usage.', 'place-i-kadry-56', 'place-i-kadry;pracownicy', 'HR and payroll tasks', 'Operational examples often have sensitive data; keep this KB documentation-only.'],
  ['CRMAndService', 'CRM, tasks, contacts, service, and customer-workflow areas.', 'crm', 'crm-serwis;crm;serwis;zadania-i-kontakty', 'CRM and service workflows', 'Frequently overlaps with document workflow and communication features.'],
  ['DocumentWorkflow', 'Document circulation, IWD, and document handoff processes.', 'obieg-dokumentow-3', 'obieg-dokumentow;internetowa-wymiana-dokumentow', 'workflow and document circulation', 'Use this before designing Sprint or custom automation around document flow.'],
  ['PlatformAndAdministration', 'Installation, startup, backup, SQL admin, and environment operations.', 'uruchomienie-programu', 'instalacja-i-aktualizacje;serwer-bazy-danych;uruchamianie-programu', 'administration, deployment, and maintenance', 'This is the right route for environment, server, and SQL execution questions.'],
  ['PersonalizationAndReporting', 'Personalization, prints, user columns, and SQL-assisted configuration.', 'personalizacja', 'personalizacja;wydruki', 'reporting and customization tasks', 'Route deep print work to ComarchOptimaSprint and database work to ComarchOptimaSchema.'],
  ['IntegrationsAndServices', 'KSeF, OCR, API, and cross-system service integrations.', 'aktualizacje-po-wydaniu-wersji-38', 'ksef-informacje-ogolne;internetowa-wymiana-dokumentow;api-archiwum', 'integration-heavy work', 'These topics move quickly across releases; check recent update pages as well.'],
].map(([moduleCode, description, anchorSlug, relatedCategories, recommendedFor, caution]) => {
  const anchorUrl = `https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/${anchorSlug}/`;
  const anchorDocument = referenceMap.get(anchorUrl);
  return {
    id: makeId('REF_MOD', moduleCode),
    name: moduleCode,
    description,
    semanticType: 'module_area',
    moduleCode,
    scopeType: 'official_module_area',
    anchorDocumentRefId: anchorDocument?.id || '',
    relatedCategories,
    recommendedFor,
    caution,
    summary: truncate(
      `${description} Recommended for ${recommendedFor}. Anchor article: ${anchorDocument?.name || humanizeSlug(anchorSlug)}. ${caution}`,
      500,
    ),
  };
});

const versionTopics = [
  ...helpCategories
    .filter((row) => row.categoryGroup === 'update_stream')
    .map((row) => ({
      id: makeId('REF_VER', row.sourceUrl),
      name: row.name,
      description: `Official update stream ${row.name}.`,
      semanticType: 'version_topic',
      sourceUrl: row.sourceUrl,
      versionCode: versionCodeFromText(row.categorySlug),
      topicType: 'category_stream',
      lifecycleStatus: /2026/.test(row.categorySlug) ? 'current_generation' : 'historical_generation',
      moduleScope: inferModuleScope(row.categorySlug),
      lastModified: '',
      summary: row.summary,
    })),
  ...referenceDocuments
    .filter((row) => /aktualizacje-po-wydaniu-wersji-/.test(row.sourceUrl))
    .map((row) => ({
      id: makeId('REF_VER', row.sourceUrl),
      name: row.name,
      description: `Official release update article ${row.name}.`,
      semanticType: 'version_topic',
      sourceUrl: row.sourceUrl,
      versionCode: versionCodeFromText(row.sourceUrl),
      topicType: 'release_update_article',
      lifecycleStatus: /wersji-38/.test(row.sourceUrl) ? 'active_release_updates' : 'historical_release_updates',
      moduleScope: 'General',
      lastModified: row.lastModified,
      summary: row.summary,
    })),
].sort((a, b) => a.sourceUrl.localeCompare(b.sourceUrl));

const learningGuides = [
  ['Getting Started', 'onboarding', 'new users and consultants', 'Start with the product entry path, then move to module entry pages.', 'szybki-start-z-programem'],
  ['Program Basics', 'orientation', 'any Optima user', 'Read the core UI and product basics before module specialization.', 'podstawowe-elementy-programu'],
  ['Environment Readiness', 'administration', 'admins and implementers', 'Validate requirements and startup path before deployment or troubleshooting.', 'wymagania-sprzetowe-i-programowe'],
  ['Startup And Login', 'administration', 'admins and end users', 'Use for launch, access, and early environment checks.', 'uruchomienie-programu'],
  ['Backup And Recovery', 'administration', 'admins and operators', 'Use before risky maintenance or migration activities.', 'kopia-bezpieczenstwa'],
  ['SQL And Reporting Entry', 'power_user', 'consultants and advanced users', 'Use when official documentation leads into SQL-backed diagnostics or reporting.', 'wykonywanie-zapytan-sql'],
  ['Customization Entry', 'power_user', 'consultants and advanced users', 'Use before going deeper into Additional Functions, Sprint, or user-column patterns.', 'personalizacja'],
  ['Current Release Awareness', 'release', 'admins and implementers', 'Check recent update guidance before designing new customizations or integrations.', 'aktualizacje-po-wydaniu-wersji-38'],
  ['User Columns And Lists', 'power_user', 'consultants and advanced users', 'Use when personalization on lists requires SQL-backed custom columns or joins.', 'opt074-dodawanie-kolumn-uzytkownika-na-listach'],
  ['Performance And SQL Administration', 'administration', 'admins and database-oriented implementers', 'Use for MSSQL performance, operational SQL work, and safe environment diagnostics.', 'opt057-strojenie-wydajnosciowe-baz-ms-sql-dla-comarch-erp-optima'],
  ['Training Catalog', 'learning', 'new users and implementers', 'Use when official e-learning or guided training is the right next step.', 'szkolenia-e_learningowe'],
  ['Online Document Exchange', 'integration', 'operators and implementers', 'Use for IWD, online document flows, and cross-company document exchange context.', 'internetowa-wymiana-dokumentow'],
].map(([name, guideType, audience, startStep, slugValue]) => {
  const sourceUrl = `https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/${slugValue}/`;
  const ref = referenceMap.get(sourceUrl);
  return {
    id: makeId('REF_GUIDE', name),
    name,
    description: `Official learning path ${name}.`,
    semanticType: 'learning_guide',
    guideType,
    audience,
    startStep,
    sourceDocumentRefId: ref?.id || '',
    summary: truncate(`${startStep} Primary article: ${ref?.name || humanizeSlug(slugValue)}. Audience: ${audience}.`, 360),
  };
});

const knowledgeRoutes = [
  ['Official orientation -> Schema KB', 'specialized_kb', 'Comarch Optima ERP MSSQL Schema', 'ComarchOptimaSchema', 'when the task becomes SQL design, table lookup, join-path analysis, or database-object tracing', 'Table;Column;ForeignKey;StoredProcedure;SqlObjectGuide', 'Use the general docs KB first for terminology and workflow, then switch to the schema KB for real database analysis.'],
  ['Official orientation -> Additional Functions KB', 'specialized_kb', 'Comarch Optima Additional Functions', 'ComarchOptimaAdditionalFunctions', 'when the task becomes implementation of additional functions, COM examples, user-column patterns, or runtime messages', 'ImplementationExample;ComInterface;SchemaTouchpoint;ModuleRecipe', 'Use the docs KB to understand official product context, then move to the dedicated Additional Functions KB for executable patterns.'],
  ['Official orientation -> Sprint KB', 'specialized_kb', 'Comarch Optima Sprint and Prints', 'ComarchOptimaSprint', 'when the task becomes print design, Sprint configuration, print SQL, diagnostics, or print migration', 'SqlPattern;PrintWorkflow;SchemaTouchpoint;ModuleRecipe', 'Use the docs KB for official print context and then move to the Sprint KB for design and diagnostics.'],
  ['SQL from official help -> Schema KB', 'cross_kb_workflow', 'Comarch Optima ERP MSSQL Schema', 'ComarchOptimaSchema', 'when an official article mentions SQL execution, reports, views, procedures, or optimization of the MS SQL environment', 'ReferenceDocument:Wykonywanie zapytan SQL;SqlObjectGuide;JoinPathGuide', 'The docs KB explains when and why; the schema KB explains what database objects exist and how they connect.'],
  ['Reporting customization -> Sprint and Additional Functions', 'cross_kb_workflow', 'Comarch Optima Sprint and Prints', 'ComarchOptimaSprint', 'when a personalization or print task needs a report, print source, or parameter binding', 'ReferenceDocument:Konfiguracja wydrukow;PrintWorkflow;SqlPattern', 'Reporting customization often spans both Sprint and schema analysis; route accordingly.'],
  ['User columns and personalization -> Additional Functions and Schema', 'cross_kb_workflow', 'Comarch Optima Additional Functions', 'ComarchOptimaAdditionalFunctions', 'when an official personalization article leads into user columns, COM automation, or SQL-backed list customization', 'ReferenceDocument:OPT074 Dodawanie kolumn użytkownika na listach;ImplementationGuide;SchemaTouchpoint', 'Use the general docs KB for official guidance, then move to Additional Functions and Schema for the actual implementation surface.'],
].map(([name, routeType, targetKbName, targetNamespace, recommendedWhen, anchorObjects, summary]) => ({
  id: makeId('REF_ROUTE', name),
  name,
  description: `Cross-KB route ${name}.`,
  semanticType: 'knowledge_route',
  routeType,
  targetKbName,
  targetNamespace,
  recommendedWhen,
  anchorObjects,
  summary,
}));

function refIdForSlug(slugValue) {
  const sourceUrl = `https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/${slugValue}/`;
  return referenceMap.get(sourceUrl)?.id || '';
}

const entryGuides = [
  ['Start here - new implementation', 'onboarding', '1', 'start a new Optima rollout or first evaluation', 'szybki-start-z-programem', ['wymagania-sprzetowe-i-programowe', 'uruchomienie-programu'], '', '', 'Read the quick-start path, then validate environment readiness and startup flow.', 'Do not jump into SQL or customization before the basic environment path is clear.'],
  ['Start here - daily product orientation', 'orientation', '2', 'understand the product UI, shared concepts, and general navigation', 'podstawowe-elementy-programu', ['wiadomosci-ogolne', 'ogolne-9'], '', '', 'Use the core UI and general-area articles before going module-specific.', 'This is the best first stop when the user question is broad or underspecified.'],
  ['Start here - environment and maintenance', 'administration', '3', 'handle installation, upgrades, backup, and runtime administration', 'wymagania-sprzetowe-i-programowe', ['uruchomienie-programu', 'kopia-bezpieczenstwa', 'automatyczne-aktualizacje-programu', 'instalacja-i-reinstalacja-systemu-49'], '', '', 'Follow requirements, startup, backup, updates, and reinstallation guidance in that order.', 'Environment work can affect production stability; validate backup and update guidance first.'],
  ['Start here - trade and warehouse', 'module', '4', 'work in sales, stock, products, contractors, or warehouse documents', 'handel-i-magazyn-3', ['handel', 'konfiguracja-wydrukow'], 'Comarch Optima ERP MSSQL Schema', 'ComarchOptimaSchema', 'Use the module entry page first, then route to the schema KB if the task becomes SQL or print-source analysis.', 'Trade reporting and prints usually spill into the schema KB quickly.'],
  ['Start here - cash and bank', 'module', '5', 'work in cash, bank, transfers, settlements, or payment operations', 'kasa-i-bank', ['ogolne-9'], 'Comarch Optima ERP MSSQL Schema', 'ComarchOptimaSchema', 'Use the cash/bank entry page, then route to the schema KB for SQL-backed diagnostics or joins.', 'These tasks often overlap with accounting structures and bank integrations.'],
  ['Start here - accounting and compliance', 'module', '6', 'work in accounting, VAT, JPK, declarations, or ledgers', 'ksiegowosc-56', ['aktualizacje-po-wydaniu-wersji-38'], 'Comarch Optima ERP MSSQL Schema', 'ComarchOptimaSchema', 'Use the accounting entry page and current release updates, then move to schema analysis for database-level work.', 'Compliance-heavy areas are version-sensitive; check updates before designing custom logic.'],
  ['Start here - HR and payroll', 'module', '7', 'work in employees, payroll, absences, declarations, or labor-law workflows', 'place-i-kadry-56', ['szkolenia-e_learningowe'], '', '', 'Use the payroll/HR entry page and training catalog when the user needs guided rather than technical help.', 'Operational examples in this area are sensitive; keep the KB usage documentation-first.'],
  ['Start here - CRM and service', 'module', '8', 'work in CRM, tasks, contacts, service, or customer communication', 'crm', ['obieg-dokumentow-3'], '', '', 'Use CRM first, then move to document workflow if the process spans communication and document flow.', 'CRM questions often mix process and data concerns; route carefully.'],
  ['Start here - workflow and IWD', 'integration', '9', 'work in document circulation, online exchange, or cross-company document flow', 'obieg-dokumentow-3', ['internetowa-wymiana-dokumentow'], '', '', 'Use workflow and IWD official articles before any implementation-specific customization.', 'If the task becomes automation or reporting, route out to the specialized KBs.'],
  ['Start here - personalization and user columns', 'customization', '10', 'customize lists, user columns, general personalization, or SQL-backed UI extensions', 'opt074-dodawanie-kolumn-uzytkownika-na-listach', ['personalizacja', 'wykonywanie-zapytan-sql'], 'Comarch Optima Additional Functions', 'ComarchOptimaAdditionalFunctions', 'Start with the official user-columns article, then move to Additional Functions and Schema for the implementation surface.', 'User columns can turn into SQL and performance work quickly; review MSSQL guidance as needed.'],
  ['Start here - Sprint and prints', 'reporting', '11', 'work on print configuration, print customization, Sprint, or report SQL', 'konfiguracja-wydrukow', ['wykonywanie-zapytan-sql'], 'Comarch Optima Sprint and Prints', 'ComarchOptimaSprint', 'Use official print configuration context first, then move to the Sprint KB for design and diagnostics.', 'Do not overload the general docs KB with Sprint-specific implementation detail.'],
  ['Start here - SQL and performance', 'technical', '12', 'diagnose SQL behavior, run queries, or tune the MS SQL environment for Optima', 'opt057-strojenie-wydajnosciowe-baz-ms-sql-dla-comarch-erp-optima', ['wykonywanie-zapytan-sql'], 'Comarch Optima ERP MSSQL Schema', 'ComarchOptimaSchema', 'Start with official MSSQL tuning and SQL execution guidance, then move to the schema KB for concrete object analysis.', 'This route is operationally sensitive; treat production SQL work conservatively.'],
].map(([name, guideGroup, priorityRank, userIntent, primarySlug, secondarySlugs, targetKbName, targetNamespace, nextStep, caution]) => ({
  id: makeId('REF_ENTRY', name),
  name,
  description: `Curated entry guide ${name}.`,
  semanticType: 'entry_guide',
  guideGroup,
  priorityRank,
  userIntent,
  primaryDocumentRefId: refIdForSlug(primarySlug),
  secondaryDocumentRefIds: secondarySlugs.map(refIdForSlug).filter(Boolean).join(';'),
  targetKbName,
  targetNamespace,
  nextStep,
  caution,
  summary: truncate(`Intent: ${userIntent}. Primary article: ${humanizeSlug(primarySlug)}. ${nextStep} ${caution}`, 520),
}));

const chunks = [];
for (const page of snapshotPages) {
  const sourceUrl = `https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/${page.slug}/`;
  const reference = referenceMap.get(sourceUrl);
  const paragraphChunks = buildParagraphChunks(page.paragraphs, 3);
  paragraphChunks.forEach((content, index) => {
    chunks.push({
      id: makeId('REF_CHUNK', `${page.slug}_${index + 1}`),
      name: `${page.title} Chunk ${index + 1}`,
      description: `Official printable-page chunk ${index + 1} from ${page.title}.`,
      semanticType: 'chunk',
      sourceDocumentRefId: reference?.id || '',
      sourceUrl,
      sourcePath: page.relPath,
      sectionHeading: page.title,
      sectionOrder: String(index + 1),
      content: truncate(content, 3000),
    });
  });
}
for (const draft of promotedKnowledge) {
  const documentId = makeId('REF_DOC_PROMOTED', draft.id);
  buildParagraphChunks(
    String(draft.content || '')
      .split(/\n\s*\n/)
      .map((part) => normalizeWhitespace(part))
      .filter(Boolean),
    2,
  ).forEach((content, index) => {
    chunks.push({
      id: makeId('REF_CHUNK_PROMOTED', `${draft.id}_${index + 1}`),
      name: `${draft.title} chunk ${index + 1}`,
      description: `Promoted knowledge inbox chunk ${index + 1} from ${draft.title}.`,
      semanticType: 'chunk',
      sourceDocumentRefId: documentId,
      sourceUrl: draft.sourceUrl || `local://knowledge-inbox/${draft.id}`,
      sourcePath: draft.promotedMarkdownPath,
      sectionHeading: draft.title,
      sectionOrder: String(index + 1),
      content,
    });
  });
}

const exportFiles = [
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
      'versionHint',
      'lastModified',
      'localSnapshotPath',
      'sourceOrigin',
      'summary',
    ],
    referenceDocuments,
  ),
  writeCsv(EXPORT_DIR, 
    'help_category.csv',
    [
      'id',
      'name',
      'description',
      'semanticType',
      'sourceUrl',
      'categorySlug',
      'categoryGroup',
      'moduleScope',
      'priorityTier',
      'summary',
    ],
    helpCategories,
  ),
  writeCsv(EXPORT_DIR, 
    'module_area.csv',
    [
      'id',
      'name',
      'description',
      'semanticType',
      'moduleCode',
      'scopeType',
      'anchorDocumentRefId',
      'relatedCategories',
      'recommendedFor',
      'caution',
      'summary',
    ],
    moduleAreas,
  ),
  writeCsv(EXPORT_DIR, 
    'version_topic.csv',
    [
      'id',
      'name',
      'description',
      'semanticType',
      'sourceUrl',
      'versionCode',
      'topicType',
      'lifecycleStatus',
      'moduleScope',
      'lastModified',
      'summary',
    ],
    versionTopics,
  ),
  writeCsv(EXPORT_DIR, 
    'learning_guide.csv',
    [
      'id',
      'name',
      'description',
      'semanticType',
      'guideType',
      'audience',
      'startStep',
      'sourceDocumentRefId',
      'summary',
    ],
    learningGuides,
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

const sourceRegistry = {
  generatedAt: new Date().toISOString(),
  kbName: 'Comarch Optima Reference',
  namespace: 'ComarchOptimaReference',
  purpose: 'URL and local snapshot provenance for freshness checks, duplicate checks, and source attribution.',
  suppressedPromotedDrafts,
  sources: [
    ...sitemapFiles.map((filePath) => ({
      key: path.relative(ROOT, filePath).replaceAll(path.sep, '/'),
      localSnapshotPath: path.relative(ROOT, filePath).replaceAll(path.sep, '/'),
      sourceType: 'sitemap',
      contentHash: fileSha256(filePath),
      hashAlgorithm: 'sha256',
      updatedAt: fs.statSync(filePath).mtime.toISOString(),
    })),
    ...pageFiles.map((filePath) => ({
      key: path.relative(ROOT, filePath).replaceAll(path.sep, '/'),
      localSnapshotPath: path.relative(ROOT, filePath).replaceAll(path.sep, '/'),
      sourceType: 'official_help_snapshot',
      contentHash: fileSha256(filePath),
      hashAlgorithm: 'sha256',
      updatedAt: fs.statSync(filePath).mtime.toISOString(),
    })),
  ],
  referenceDocuments: referenceDocuments.map((doc) => ({
    id: doc.id,
    name: doc.name,
    sourceUrl: doc.sourceUrl,
    sourceType: doc.sourceType,
    documentCategory: doc.documentCategory,
    localSnapshotPath: doc.localSnapshotPath,
    contentHash: doc.localSnapshotPath
      ? fileSha256(path.join(ROOT, doc.localSnapshotPath))
      : crypto.createHash('sha256').update(JSON.stringify(doc)).digest('hex'),
    hashAlgorithm: 'sha256',
  })),
};
writeJson(SOURCE_REGISTRY_PATH, sourceRegistry);

const manifest = {
  generatedAt: new Date().toISOString(),
  sourceRoot: SOURCE_ROOT,
  sourceRegistryPath: path.relative(ROOT, SOURCE_REGISTRY_PATH).replaceAll(path.sep, '/'),
  sitemaps: sitemapFiles.map((filePath) => path.relative(ROOT, filePath).replaceAll(path.sep, '/')),
  pages: pageFiles.map((filePath) => path.relative(ROOT, filePath).replaceAll(path.sep, '/')),
  files: exportFiles.map((file) => ({
    fileName: file.fileName,
    rowCount: file.rowCount,
    columns: file.columns,
  })),
};

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

const readmeLines = [
  '# ComarchOptimaReference export',
  '',
  `Generated at: ${manifest.generatedAt}`,
  '',
  '## Source snapshot',
  '',
  `- Sitemaps: ${sitemapFiles.length}`,
  `- Printable pages: ${pageFiles.length}`,
  '',
  '## Export files',
  '',
  ...exportFiles.map((file) => `- \`${file.fileName}\`: \`${file.rowCount}\``),
  '',
];
fs.writeFileSync(README_PATH, readmeLines.join('\n'), 'utf8');

console.log(JSON.stringify({
  success: true,
  exportDir: EXPORT_DIR,
  files: exportFiles.map((file) => ({ fileName: file.fileName, rowCount: file.rowCount })),
}, null, 2));
