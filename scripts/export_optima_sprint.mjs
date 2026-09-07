#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { extractPdfText } from './lib/pdf_text.mjs';
import { parseOptimaManualExport } from './lib/optima_manual_exports.mjs';
import { loadPromotedKnowledge } from './lib/promoted_knowledge.mjs';
import { ensureDir, writeCsv, writeJson, makeId } from './lib/export_utils.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';
const EXPORT_DIR = path.join(ROOT, 'exports/optima_sprint/v1');
const MANIFEST_PATH = path.join(EXPORT_DIR, '_manifest.json');
const README_PATH = path.join(EXPORT_DIR, 'README.md');
const DRIVE_ROOT = path.join(ROOT, 'downloads/google_drive/sprint');
const MANUAL_EXPORT_ROOT = path.join(ROOT, 'downloads/google_drive/manual_exports');
const META_DIR = path.join(DRIVE_ROOT, 'meta');
const SOURCE_REGISTRY_PATH = path.join(META_DIR, 'source_registry.json');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function fileSha256(filePath) {
  return sha256(fs.readFileSync(filePath));
}

function dedupeById(rows) {
  return [...new Map(rows.map((row) => [row.id, row])).values()];
}

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function canonicalHttpUrl(value) {
  try {
    const parsed = new URL(String(value || '').trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLowerCase();
    if (parsed.pathname.length > 1) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    }
    return parsed.toString();
  } catch {
    return '';
  }
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

function relFromDrive(filePath) {
  return path.relative(DRIVE_ROOT, filePath).replaceAll(path.sep, '/');
}

function inferArtifactType(relPath) {
  const lower = relPath.toLowerCase();
  if (lower.endsWith('.sp')) return 'sprint_definition';
  if (lower.endsWith('.md')) return 'knowledge_markdown';
  if (lower.endsWith('.pdf')) return 'documentation_pdf';
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image_asset';
  return 'file_artifact';
}

function inferDocumentCategory(relPath) {
  const lower = relPath.toLowerCase();
  if (lower.includes('workflow')) return 'workflow';
  if (lower.includes('sql')) return 'sql_patterns';
  if (lower.includes('diagnostyka')) return 'diagnostics';
  if (lower.includes('slownik')) return 'glossary';
  if (lower.includes('zrodla')) return 'sources';
  if (lower.includes('fundamenty')) return 'architecture';
  if (lower.includes('edytor')) return 'template_editor';
  if (lower.includes('index')) return 'index';
  return 'project_kb';
}

function fileSummary(text) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('#') && !line.startsWith('|---'));
  return truncate(lines.slice(0, 4).join(' '), 800);
}

function buildManualPrintContent(record) {
  const parts = [
    `Nazwa: ${record.WDR_NAZWA || record.printNameAttr || ''}`,
    `Zestaw: ${record.setName || ''}`,
    `Rodzaj/Typ/PodTyp: ${record.WDR_RODZAJ || ''}/${record.WDR_TYP || ''}/${record.WDR_PODTYP || ''}`,
    `Kompresja: ${record.WDR_KOMPRESJA || '0'}`,
    `Definition kind: ${record.definitionKind}`,
  ];
  if (record.WDR_PARAMETRY) parts.push(`Parametry:\n${record.WDR_PARAMETRY}`);
  if (record.WDR_WARUNEK) parts.push(`Warunek:\n${record.WDR_WARUNEK}`);
  if (record.WDR_WARUNEKAUTO) parts.push(`Warunek auto:\n${record.WDR_WARUNEKAUTO}`);
  if (record.definitionKind === 'compressed') {
    parts.push('Definicja:\n[COMPRESSED_DEFINITION]');
  } else if (record.WDR_DEFINICJA) {
    parts.push(`Definicja:\n${record.WDR_DEFINICJA}`);
  }
  return truncate(parts.join('\n\n'), 4000);
}

function parseMarkdownSections(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const sections = [];
  let current = null;
  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      if (current) {
        current.content = normalizeWhitespace(current.contentLines.join('\n'));
        sections.push(current);
      }
      current = {
        level: heading[1].length,
        heading: normalizeWhitespace(heading[2]),
        contentLines: [],
      };
      continue;
    }
    if (!current) {
      current = {
        level: 0,
        heading: 'Document',
        contentLines: [],
      };
    }
    current.contentLines.push(line);
  }
  if (current) {
    current.content = normalizeWhitespace(current.contentLines.join('\n'));
    sections.push(current);
  }
  return sections.filter((section) => section.content || section.heading);
}

(async () => {
const localFiles = listFilesRecursive(DRIVE_ROOT);
const localDocFiles = localFiles.filter((filePath) =>
  ['.md', '.pdf'].includes(path.extname(filePath).toLowerCase()),
);
const localDocs = [];
for (const filePath of localDocFiles) {
  const relPath = relFromDrive(filePath);
  const ext = path.extname(filePath).toLowerCase();
  let text;
  if (ext === '.pdf') text = await extractPdfText(filePath);
  else text = readText(filePath);
  localDocs.push({
    id: makeId('SPR_DOC', relPath),
    name: path.basename(filePath, path.extname(filePath)),
    description: `Local Sprint KB document ${relPath}.`,
    semanticType: 'reference_document',
    sourceUrl: relPath,
    sourceType: ext === '.pdf' ? 'local_drive_pdf' : 'local_drive_markdown',
    documentCategory: inferDocumentCategory(relPath),
    versionHint: text.match(/\b202[4-6](?:\.\d(?:\.\d)?)?\b/)?.[0] || '2026',
    sourceOrigin: 'google_drive_sprint_corpus',
    summary: fileSummary(text),
    relPath,
    text,
  });
}

const referenceDocuments = [...localDocs];

const officialReferences = [
  {
    name: 'Optima - Jak dodawac i edytowac wydruki sPrint',
    sourceUrl: 'https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/jak-dodawac-edytowac-wydruki-sprint/',
    documentCategory: 'official_workflow',
    summary: 'Official Optima workflow for adding, editing, importing, exporting, and testing Sprint print definitions.',
  },
  {
    name: 'Optima - Konfiguracja wydrukow',
    sourceUrl: 'https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/konfiguracja-wydrukow/',
    documentCategory: 'official_workflow',
    summary: 'Official configuration entry point for print sets, print assignment, and print context in Optima.',
  },
  {
    name: 'Optima - Import i eksport definicji wydruku',
    sourceUrl: 'https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/jak-wyeksportowac-zaimportowac-definicje-wydruku/',
    documentCategory: 'official_workflow',
    summary: 'Official guidance for exporting and importing print definitions between environments.',
  },
  {
    name: 'Optima - Nowosci 2026.0.1 dla wydrukow zlozonych',
    sourceUrl: 'https://pomoc.comarch.pl/optima/pl/2026/kategorie/nowosci-i-zmiany-w-wersji-2026-0-1/',
    documentCategory: 'official_versions',
    summary: 'Version notes covering complex prints and new Sprint coverage in newer Optima releases.',
  },
  {
    name: 'Comarch sPrint - Strona glowna bazy wiedzy',
    sourceUrl: 'https://pomoc.comarch.pl/sprint/',
    documentCategory: 'official_index',
    summary: 'Top-level official knowledge base for Sprint documentation, FAQ, and release notes.',
  },
  {
    name: 'Comarch sPrint - Spis tresci',
    sourceUrl: 'https://pomoc.comarch.pl/sprint/index.php/spis-tresci/',
    documentCategory: 'official_index',
    summary: 'Sprint table of contents for official how-to and technical articles.',
  },
  {
    name: 'Comarch sPrint - Integracja z Comarch ERP Optima',
    sourceUrl: 'https://pomoc.comarch.pl/sprint/index.php/dokumentacja/integracja-z-comarch-erp-optima/',
    documentCategory: 'official_integration',
    summary: 'Official Sprint integration overview for Comarch ERP Optima.',
  },
  {
    name: 'Comarch sPrint - Parametry',
    sourceUrl: 'https://pomoc.comarch.pl/sprint/index.php/dokumentacja/parametry/',
    documentCategory: 'official_template_editor',
    summary: 'Official Sprint parameter handling reference.',
  },
  {
    name: 'Comarch sPrint - Bindowanie parametrow',
    sourceUrl: 'https://pomoc.comarch.pl/sprint/index.php/dokumentacja/bindowanie-parametrow/',
    documentCategory: 'official_template_editor',
    summary: 'Official parameter binding guidance for subreports and linked data.',
  },
  {
    name: 'Comarch sPrint - Miary wyliczane',
    sourceUrl: 'https://pomoc.comarch.pl/sprint/index.php/kategorie/miary-wyliczane/',
    documentCategory: 'official_template_editor',
    summary: 'Official reference for calculated measures and expression logic.',
  },
  {
    name: 'Comarch sPrint - Logi',
    sourceUrl: 'https://pomoc.comarch.pl/sprint/index.php/dokumentacja/logi-dla-comarch-sprint/',
    documentCategory: 'official_diagnostics',
    summary: 'Official Sprint logging location and diagnostic guidance.',
  },
  {
    name: 'Comarch sPrint - Incorrect syntax near WHERE',
    sourceUrl: 'https://pomoc.comarch.pl/sprint/index.php/dokumentacja/komunikat-incorrect-syntax-near-the-keyword-where/',
    documentCategory: 'official_diagnostics',
    summary: 'Official diagnostic article for the WHERE syntax error scenario.',
  },
];

for (const entry of officialReferences) {
  referenceDocuments.push({
    id: makeId('SPR_DOC', entry.sourceUrl),
    name: entry.name,
    description: `Official Sprint or Optima help page: ${entry.name}.`,
    semanticType: 'reference_document',
    sourceUrl: entry.sourceUrl,
    sourceType: 'official_web',
    documentCategory: entry.documentCategory,
    versionHint: '2026',
    sourceOrigin: 'official_comarch_help',
    summary: entry.summary,
  });
}

function loadManualPrintExport() {
  const extraFileArtifacts = [];
  const extraReferenceDocuments = [];
  const extraSqlPatterns = [];
  const extraChunks = [];

  const exportPath = path.join(MANUAL_EXPORT_ROOT, 'export_wydruki.xml');
  if (!fs.existsSync(exportPath)) {
    return { extraFileArtifacts, extraReferenceDocuments, extraSqlPatterns, extraChunks };
  }

  const parsed = parseOptimaManualExport(exportPath);
  const relPath = 'manual_exports/export_wydruki.xml';
  const artifactId = makeId('SPR_FILE', relPath);
  const comboSummary = [...parsed.comboCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([combo, count]) => `${combo.replaceAll('|', '/')}=${count}`)
    .join('; ');
  const kindSummary = [...parsed.definitionKindCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([kind, count]) => `${kind}=${count}`)
    .join('; ');

  extraFileArtifacts.push({
    id: artifactId,
    name: 'export_wydruki.xml',
    description: 'Manual Optima export of print definitions.',
    semanticType: 'file_artifact',
    relativePath: relPath,
    sourceOrigin: 'manual_optima_export',
    collectionName: 'manual_exports',
    artifactType: 'optima_manual_print_export',
    fileExtension: 'xml',
    fileSizeBytes: String(fs.statSync(exportPath).size),
    contentPreview: truncate(`Wydruk records=${parsed.records.length}; combos=${comboSummary}; kinds=${kindSummary}`, 2000),
  });

  const masterDocId = 'SPR_DOC_MANUAL_PRINT_EXPORT';
  extraReferenceDocuments.push({
    id: masterDocId,
    name: 'Manual export - definicje wydruków',
    description: 'Direct Optima export of print definitions from the configuration layer.',
    semanticType: 'reference_document',
    sourceUrl: 'downloads/google_drive/manual_exports/export_wydruki.xml',
    sourceType: 'manual_optima_export',
    documentCategory: 'manual_print_export',
    versionHint: 'manual_export',
    sourceOrigin: 'manual_optima_export',
    summary: truncate(`Direct Optima export with ${parsed.records.length} records. Type families: ${comboSummary}. Definition kinds: ${kindSummary}.`, 1200),
  });

  extraChunks.push({
    id: 'SPR_CHUNK_MANUAL_PRINT_EXPORT_SUMMARY',
    name: 'Manual export - type family summary',
    description: 'Summary of direct Optima print export type families.',
    sourceObjectRefId: masterDocId,
    sourceDocument: 'Manual export - definicje wydruków',
    sourceSection: 'Type families',
    semanticType: 'chunk',
    content: truncate(
      [
        `Total records: ${parsed.records.length}`,
        `Type families: ${comboSummary}`,
        `Definition kinds: ${kindSummary}`,
      ].join('\n\n'),
      3000,
    ),
  });

  const readableRecords = parsed.records.filter((record) => record.definitionKind !== 'compressed');
  for (const record of readableRecords) {
    const baseKey = `${record.setName}_${record.WDR_ID || ''}_${record.WDR_NAZWA || record.printNameAttr || ''}`;
    const docId = makeId('SPR_DOC_MANUAL_DEF', baseKey);
    const name = record.WDR_NAZWA || record.printNameAttr || `Wydruk ${record.WDR_ID || ''}`;
    const normalizedParams = normalizeWhitespace(record.WDR_PARAMETRY || '');
    extraReferenceDocuments.push({
      id: docId,
      name,
      description: `Manual Optima print definition from set ${record.setName || ''}.`,
      semanticType: 'reference_document',
      sourceUrl: `downloads/google_drive/manual_exports/export_wydruki.xml#WDR_ID=${record.WDR_ID || ''}`,
      sourceType: 'manual_optima_export',
      documentCategory: 'manual_print_definition',
      versionHint: 'manual_export',
      sourceOrigin: 'manual_optima_export',
      summary: truncate(
        [
          `set=${record.setName || ''}`,
          `rodzaj=${record.WDR_RODZAJ || ''}`,
          `typ=${record.WDR_TYP || ''}`,
          `podtyp=${record.WDR_PODTYP || ''}`,
          `definition=${record.definitionKind}`,
        ].join(' | '),
        1000,
      ),
    });

    extraChunks.push({
      id: makeId('SPR_CHUNK_MANUAL_DEF', baseKey),
      name: `${name} - definition`,
      description: `Manual export chunk for ${name}.`,
      sourceObjectRefId: docId,
      sourceDocument: name,
      sourceSection: 'Definition',
      semanticType: 'chunk',
      content: buildManualPrintContent(record),
    });

    if (record.definitionKind === 'sql') {
      extraSqlPatterns.push({
        id: makeId('SPR_SQL_MANUAL', baseKey),
        name: `Manual export SQL - ${name}`,
        description: `Readable SQL definition exported directly from Optima for ${name}.`,
      semanticType: 'sql_pattern',
      patternType: 'OPTIMA_MANUAL_EXPORT_SQL',
      contextParams: truncate(normalizedParams, 300),
        sourceMode: 'Optima manual export',
        sourceDocumentRefId: docId,
        anchorSchemaObjects: 'CDN_KNF_Konfiguracja:TABLE:CDN.Wydruki',
        caution: 'Treat this as an exported definition snapshot. Validate parameters and context before reusing it as a live Sprint source.',
        summary: truncate(`Direct SQL definition exported from Optima. Set=${record.setName || ''}; rodzaj=${record.WDR_RODZAJ || ''}; typ=${record.WDR_TYP || ''}; podtyp=${record.WDR_PODTYP || ''}.`, 1000),
        exampleSql: truncate(record.WDR_DEFINICJA || '', 3500),
      });
    }
  }

  return { extraFileArtifacts, extraReferenceDocuments, extraSqlPatterns, extraChunks };
}

const manualPrintExport = loadManualPrintExport();
referenceDocuments.push(...manualPrintExport.extraReferenceDocuments);
const promotedKnowledge = loadPromotedKnowledge('ComarchOptimaSprint');
const officialDocumentIdByCanonicalUrl = new Map(
  referenceDocuments
    .filter((document) => document.sourceType === 'official_web')
    .map((document) => [canonicalHttpUrl(document.sourceUrl), document.id])
    .filter(([canonicalUrl]) => canonicalUrl),
);
const promotedDocumentIdByDraftId = new Map();

for (const draft of promotedKnowledge) {
  const officialDocumentId = officialDocumentIdByCanonicalUrl.get(
    canonicalHttpUrl(draft.sourceUrl),
  );
  const documentId = officialDocumentId || makeId('SPR_DOC_PROMOTED', draft.id);
  promotedDocumentIdByDraftId.set(draft.id, documentId);
  if (officialDocumentId) continue;

  referenceDocuments.push({
    id: documentId,
    name: draft.title,
    description: `Promoted knowledge inbox draft for ${draft.kbName}.`,
    semanticType: 'reference_document',
    sourceUrl: draft.sourceUrl || `local://knowledge-inbox/${draft.id}`,
    sourceType: 'promoted_knowledge_draft',
    documentCategory: 'promoted_knowledge',
    versionHint: draft.promotedAt ? draft.promotedAt.slice(0, 10) : 'local',
    sourceOrigin: 'KnowledgeInboxPromoted',
    summary: truncate(draft.content, 800),
  });
}

const localDocIdByRelPath = new Map(localDocs.map((doc) => [doc.relPath, doc.id]));

const fileArtifacts = localFiles.map((filePath) => {
  const relPath = relFromDrive(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const preview = ext === 'md' ? fileSummary(readText(filePath)) : '';
  return {
    id: makeId('SPR_FILE', relPath),
    name: path.basename(filePath),
    description: `Local Sprint corpus file ${relPath}.`,
    semanticType: 'file_artifact',
    relativePath: relPath,
    sourceOrigin: 'google_drive_sprint_corpus',
    collectionName: 'sprint',
    artifactType: inferArtifactType(relPath),
    fileExtension: ext,
    fileSizeBytes: String(fs.statSync(filePath).size),
    contentPreview: preview,
  };
});
fileArtifacts.push(...manualPrintExport.extraFileArtifacts);

const printTechnologies = [
  {
    id: 'SPR_TECH_SPRINT',
    name: 'sPrint',
    description: 'Comarch native print technology for Optima and other ERP products.',
    semanticType: 'print_technology',
    technologyCode: 'SPRINT',
    lifecycleStatus: 'ACTIVE_TARGET',
    preferredUse: 'Default technology for new and migrated Optima prints.',
    editorType: 'Web editor integrated with ERP workflow.',
    dataSources: 'MSSQL;PostgreSQL;SQL query;SQL procedure;SQL function;data configurator',
    exportFormats: 'PDF;DOCX;XLSX;SP',
    migrationNote: 'Preferred replacement for Crystal Reports and GenRap.',
    summary: 'Use Sprint for new work, for migrated standard prints, and for most custom print design in current Optima versions.',
  },
  {
    id: 'SPR_TECH_CRYSTAL',
    name: 'Crystal Reports',
    description: 'Legacy external reporting technology historically used in Optima.',
    semanticType: 'print_technology',
    technologyCode: 'CRYSTAL',
    lifecycleStatus: 'LEGACY_EOL',
    preferredUse: 'Maintenance only for existing legacy prints until migration.',
    editorType: 'External licensed desktop editor.',
    dataSources: 'SQL direct and legacy report patterns.',
    exportFormats: 'PDF;Excel;Word;RTF',
    migrationNote: 'Requires manual migration. No automatic converter should be assumed.',
    summary: 'Treat Crystal as legacy input for migration planning, not as the preferred target for new development.',
  },
  {
    id: 'SPR_TECH_GENRAP',
    name: 'GenRap',
    description: 'Legacy Comarch print technology coexisting historically with Sprint.',
    semanticType: 'print_technology',
    technologyCode: 'GENRAP',
    lifecycleStatus: 'LEGACY_EOL',
    preferredUse: 'Maintenance only for old custom prints until migration.',
    editorType: 'Older desktop-oriented reporting path.',
    dataSources: 'ERP context and SQL in legacy patterns.',
    exportFormats: 'PDF',
    migrationNote: 'Requires manual recreation in Sprint.',
    summary: 'Treat GenRap as a legacy print family that should be analyzed and reimplemented in Sprint where still business-critical.',
  },
  {
    id: 'SPR_TECH_XML',
    name: 'XML',
    description: 'Alternative print/export family present in Optima print-type choices.',
    semanticType: 'print_technology',
    technologyCode: 'XML',
    lifecycleStatus: 'ACTIVE_CONTEXTUAL',
    preferredUse: 'Structured export or integration scenarios, not general visual report design.',
    editorType: 'Definition-driven export rather than Sprint visual editor.',
    dataSources: 'Application context and export logic.',
    exportFormats: 'XML',
    migrationNote: 'Do not treat XML as a direct substitute for Sprint visual reports.',
    summary: 'XML belongs in the print landscape as a different output class, useful for structured exchange rather than normal printable layout design.',
  },
];

const workflowDocId = localDocIdByRelPath.get('KB-sprint-02-optima-workflow-wydrukow.md');
const fundamentalsDocId = localDocIdByRelPath.get('KB-sprint-01-fundamenty-architektura-migracja.md');
const sprintKbDocId = localDocIdByRelPath.get('comarch-optima-sprint-kb.md');

const printWorkflows = [
  {
    id: 'SPR_WF_OPEN_CONFIG',
    name: 'Otworz konfiguracje wydrukow',
    description: 'Enter Optima print configuration from a document or list context.',
    semanticType: 'print_workflow',
    workflowType: 'ENTRY',
    uiContext: 'Comarch ERP Optima',
    triggerPath: 'Wydruk danych -> Konfiguracja wydrukow',
    shortcut: 'Ctrl+F2',
    primaryAction: 'Open print configuration for the active context.',
    sourceDocumentRefId: workflowDocId,
    caution: 'Use the correct list or document context, because available print sets depend on where configuration is opened.',
    summary: 'Start from the exact business context where the print should run. Ctrl+F2 is the standard shortcut into Optima print configuration.',
  },
  {
    id: 'SPR_WF_CREATE_PRINT',
    name: 'Dodaj nowy wydruk Sprint',
    description: 'Create a new Sprint print in a user print set.',
    semanticType: 'print_workflow',
    workflowType: 'CREATE',
    uiContext: 'Comarch ERP Optima print configuration',
    triggerPath: 'Konfiguracja wydrukow -> Dodaj wydruk -> typ sPrint',
    shortcut: '',
    primaryAction: 'Create a new Sprint definition from import or editor flow.',
    sourceDocumentRefId: workflowDocId,
    caution: 'Prefer a user print set and avoid editing standard definitions directly when a copy workflow is available.',
    summary: 'Create Sprint prints under a user set, choose type sPrint, then import a definition or open the editor.',
  },
  {
    id: 'SPR_WF_CLONE_STANDARD',
    name: 'Skopiuj standardowy wydruk',
    description: 'Safely clone a standard Sprint print before modification.',
    semanticType: 'print_workflow',
    workflowType: 'CLONE',
    uiContext: 'Comarch ERP Optima print configuration',
    triggerPath: 'Eksport definicji .SP -> nowy wydruk typu sPrint -> import .SP',
    shortcut: 'Ctrl+Insert',
    primaryAction: 'Use a copy of the standard print instead of editing the standard directly.',
    sourceDocumentRefId: workflowDocId,
    caution: 'Always export the original definition first and keep a dated backup.',
    summary: 'The safe path is to export the standard Sprint definition, create a user print, import the copy, then edit only the user copy.',
  },
  {
    id: 'SPR_WF_IMPORT_EXPORT',
    name: 'Import i eksport definicji SP',
    description: 'Move Sprint print definitions between environments using .SP files.',
    semanticType: 'print_workflow',
    workflowType: 'TRANSFER',
    uiContext: 'Comarch ERP Optima print configuration',
    triggerPath: 'Zakladka Definicja -> Importuj/Eksportuj definicje',
    shortcut: '',
    primaryAction: 'Export or import the .SP definition file.',
    sourceDocumentRefId: workflowDocId,
    caution: 'Importing the .SP file alone may not recreate dynamic parameters on the Optima side.',
    summary: 'Use .SP files for backup and transport, then separately verify or import dynamic parameter definitions in Optima.',
  },
  {
    id: 'SPR_WF_EDIT_SEND',
    name: 'Edytuj i wyslij do ERP',
    description: 'Open Sprint editor, modify the definition, and push it back to Optima.',
    semanticType: 'print_workflow',
    workflowType: 'EDIT_DEPLOY',
    uiContext: 'Comarch sPrint editor',
    triggerPath: 'Konfiguracja wydrukow -> Edytuj definicje -> Wyslij do Comarch ERP',
    shortcut: '',
    primaryAction: 'Persist editor changes back into the ERP print configuration.',
    sourceDocumentRefId: fundamentalsDocId,
    caution: 'Sending from the editor is not the end. Save the print in Optima and test it on real documents.',
    summary: 'The practical save path is editor change -> Wyślij do Comarch ERP -> save in Optima -> test preview.',
  },
  {
    id: 'SPR_WF_PARAM_IMPORT',
    name: 'Importuj parametry dynamiczne',
    description: 'Verify and import dynamic parameters after definition import or change.',
    semanticType: 'print_workflow',
    workflowType: 'PARAMETER_SYNC',
    uiContext: 'Comarch ERP Optima print configuration',
    triggerPath: 'Zakladka Inne -> import definicji parametrow dynamicznych',
    shortcut: '',
    primaryAction: 'Synchronize Optima-side dynamic parameters with the Sprint definition.',
    sourceDocumentRefId: workflowDocId,
    caution: 'If parameter names or import state are wrong, the print may fail or prompt unexpectedly.',
    summary: 'After import or major edit, always verify that dynamic parameters were imported and match Sprint parameter names exactly.',
  },
  {
    id: 'SPR_WF_ITERATIVE_TEST',
    name: 'Iteracyjny test wydruku',
    description: 'Use a short design-test-fix loop while building a Sprint print.',
    semanticType: 'print_workflow',
    workflowType: 'TEST_LOOP',
    uiContext: 'Optima + Sprint + PDF preview + SSMS',
    triggerPath: 'Analiza -> edycja -> wysylka -> podglad PDF -> poprawka',
    shortcut: '',
    primaryAction: 'Validate layout, SQL, parameters, and data on real samples.',
    sourceDocumentRefId: workflowDocId,
    caution: 'Do not rely on one happy-path document. Test multiple documents and edge cases.',
    summary: 'Work in short loops: inspect the current print, edit the copy, send to ERP, test preview, then inspect SQL or logs if needed.',
  },
  {
    id: 'SPR_WF_COMPLEX_PRINT',
    name: 'Skonfiguruj wydruk zlozony',
    description: 'Use the newer complex-print mechanism for running multiple Sprint prints.',
    semanticType: 'print_workflow',
    workflowType: 'COMPLEX_PRINT',
    uiContext: 'Comarch ERP Optima 2026+',
    triggerPath: 'Definicja wydruku zlozonego oparta o SQL i zestaw wydrukow Sprint',
    shortcut: '',
    primaryAction: 'Drive multiple Sprint outputs from one print definition.',
    sourceDocumentRefId: sprintKbDocId,
    caution: 'Complex print is Sprint-only and depends on version support. Validate availability in the target Optima release.',
    summary: 'Complex print replaces older cascading mechanisms and executes multiple Sprint prints based on a SQL-defined record set.',
  },
];

const editorDocId = localDocIdByRelPath.get('KB-sprint-03-edytor-szablony-formuly.md');
const sqlDocId = localDocIdByRelPath.get('KB-sprint-04-sql-mssql-patterns.md');
const diagnosticsDocId = localDocIdByRelPath.get('KB-sprint-05-diagnostyka-checklisty.md');
const sourcesDocId = localDocIdByRelPath.get('KB-sprint-06-zrodla-roadmap-szkolenia.md');
const glossaryDocId = localDocIdByRelPath.get('KB-sprint-07-slownik-pojec.md');

const printOptions = [
  {
    id: 'SPR_OPT_IGNORE_FILTER',
    name: 'Ignoruj filtr aplikacji',
    description: 'Prevent Optima from appending the application filter to custom SQL.',
    semanticType: 'print_option',
    optionName: 'Ignoruj filtr aplikacji',
    optionScope: 'Optima print configuration',
    effect: 'Stops application-side filter injection into SQL used by the print.',
    recommendedWhen: 'Use custom SQL or custom parameters that conflict with application-generated WHERE clauses.',
    riskIfSkipped: 'May trigger WHERE syntax errors or wrong result sets.',
    sourceDocumentRefId: workflowDocId,
    summary: 'This is the primary option to check when a custom Sprint SQL print breaks because Optima appends its own filter.',
  },
  {
    id: 'SPR_OPT_IGNORE_SORT',
    name: 'Ignoruj sortowanie aplikacji',
    description: 'Disable application-enforced sorting for the print query.',
    semanticType: 'print_option',
    optionName: 'Ignoruj sortowanie aplikacji',
    optionScope: 'Optima print configuration',
    effect: 'Prevents application-side sorting from altering the intended SQL order.',
    recommendedWhen: 'Custom SQL or grouped layout becomes unstable because application sorting interferes.',
    riskIfSkipped: 'Unexpected ordering or invalid SQL composition in some scenarios.',
    sourceDocumentRefId: workflowDocId,
    summary: 'Use this when application-driven sort order breaks the intended report logic or groups.',
  },
  {
    id: 'SPR_OPT_PARAM_IMPORT',
    name: 'Import definicji parametrow dynamicznych',
    description: 'Synchronize Optima parameter definitions after importing or changing a Sprint definition.',
    semanticType: 'print_option',
    optionName: 'Importuj definicje parametrow dynamicznych',
    optionScope: 'Optima print configuration',
    effect: 'Refreshes the Optima-side parameter metadata used by the print.',
    recommendedWhen: 'After importing a .SP or changing parameters in the editor.',
    riskIfSkipped: 'Missing prompts, wrong values, or repeated prompts for subreports.',
    sourceDocumentRefId: workflowDocId,
    summary: 'Treat parameter import as a separate operational step, not as something automatically guaranteed by the .SP import.',
  },
  {
    id: 'SPR_OPT_SECTION_ONE_PAGE',
    name: 'Pokazuj sekcje na jednej stronie',
    description: 'Keep a section from being split across page breaks.',
    semanticType: 'print_option',
    optionName: 'Pokazuj sekcje na jednej stronie',
    optionScope: 'Sprint editor section settings',
    effect: 'Reduces awkward section splitting and layout breakage.',
    recommendedWhen: 'Use for grouped headers, summaries, and fixed layout blocks.',
    riskIfSkipped: 'Broken layout across page boundaries.',
    sourceDocumentRefId: editorDocId,
    summary: 'Section pagination control matters for clean grouped and summary layout in Sprint.',
  },
  {
    id: 'SPR_OPT_REPEAT_SECTION',
    name: 'Powtarzaj sekcje na kazdej stronie',
    description: 'Repeat a section across pages, typically for headers or group headers.',
    semanticType: 'print_option',
    optionName: 'Powtarzaj sekcje na kazdej stronie',
    optionScope: 'Sprint editor section settings',
    effect: 'Maintains readability on multipage outputs.',
    recommendedWhen: 'Long detail sections or grouped print layouts.',
    riskIfSkipped: 'Hard-to-read multipage printouts with missing contextual headers.',
    sourceDocumentRefId: editorDocId,
    summary: 'Use repeated sections to keep headers visible on later pages of long documents.',
  },
  {
    id: 'SPR_OPT_SHOW_BOTTOM',
    name: 'Pokazuj na dole strony',
    description: 'Pin footer output to the bottom of the page where applicable.',
    semanticType: 'print_option',
    optionName: 'Pokazuj na dole strony',
    optionScope: 'Sprint editor footer settings',
    effect: 'Improves print consistency for summaries and totals.',
    recommendedWhen: 'Footer summaries, especially VAT or group totals.',
    riskIfSkipped: 'Totals may appear too high on the page or in unstable positions.',
    sourceDocumentRefId: editorDocId,
    summary: 'Bottom-pinned footer output is useful for clean summary presentation.',
  },
  {
    id: 'SPR_OPT_LATE_PARAM_INPUT',
    name: 'Pozwol na pozniejsze wprowadzenie parametru',
    description: 'Allow SQL parameter values to be supplied later instead of fixed at design time.',
    semanticType: 'print_option',
    optionName: 'Pozwol na pozniejsze wprowadzenie wartosci parametru',
    optionScope: 'Sprint data configurator',
    effect: 'Keeps the query reusable across documents or operator prompts.',
    recommendedWhen: 'Parameters depend on runtime context or user input.',
    riskIfSkipped: 'The print becomes tied to fixed test values used during design.',
    sourceDocumentRefId: editorDocId,
    summary: 'Runtime parameter entry keeps the print definition reusable beyond the original design sample.',
  },
  {
    id: 'SPR_OPT_SHARE_MEASURE',
    name: 'Udostepnij miare',
    description: 'Expose a calculated measure for use between subreport and main report.',
    semanticType: 'print_option',
    optionName: 'Udostepnij miare',
    optionScope: 'Sprint calculated measures',
    effect: 'Allows reuse of calculated values across template layers.',
    recommendedWhen: 'Subreports need to surface totals or derived values to the main layout.',
    riskIfSkipped: 'Repeated logic or inability to reuse aggregated values outside the local scope.',
    sourceDocumentRefId: editorDocId,
    summary: 'Shared measures help when subreport calculations must drive visible values in the main report.',
  },
];

const templateFeatures = [
  ['Data configurator', 'DATA_SOURCE', '2023.0', 'Data source setup', 'Choose tables, SQL, procedures, or functions as the report source.', editorDocId, 'Do not assume schema shape without validation.'],
  ['Table control', 'CONTROL', '2023.0', 'Layout', 'Primary repeating layout for detail lines and tabular report sections.', editorDocId, 'Verify width and grouping behavior on multi-page outputs.'],
  ['Subreport', 'COMPOSITION', '2023.0', 'Layout', 'Separate header, detail, VAT summary, or auxiliary blocks into nested report parts.', editorDocId, 'Parameter binding must be correct or users will be prompted repeatedly.'],
  ['Calculated measure', 'CALCULATION', '2024.1', 'Data/Expressions', 'Compute derived totals, counts, and reusable report values.', editorDocId, 'Measure behavior depends on scope: source vs table.'],
  ['Conditional visibility', 'CONDITION', '2024.0', 'Formatting/Visibility', 'Hide or show sections and controls based on expressions.', editorDocId, 'Nested section visibility can inherit from the parent.'],
  ['Grouping', 'LAYOUT', '2023.0', 'Data', 'Organize output into grouped headers, details, and footers.', editorDocId, 'Grouping can change totals and page behavior.'],
  ['Rich text field', 'CONTROL', '2024.2', 'Layout', 'Format fragments of text with richer styling than plain text.', editorDocId, 'Check paste/import behavior after formatting from external editors.'],
  ['Attachment from database', 'CONTROL', '2024.2', 'Layout', 'Render or expose database-backed attachments in the print.', editorDocId, 'Validate database payload availability in target environments.'],
  ['QR code', 'CONTROL', '2024.0', 'Layout', 'Generate payment, KSeF, or document data codes directly in Sprint.', editorDocId, 'Version features vary; verify exact QR scenario support.'],
  ['Barcode', 'CONTROL', '2024.0', 'Layout', 'Render EAN, Code39, Code128, and related codes.', editorDocId, 'Supported barcode families depend on Sprint version.'],
  ['Pixel Perfect', 'LAYOUT', '2023.0', 'Page settings', 'Align output to fixed forms or preprinted layouts.', fundamentalsDocId, 'Page margins and exact element width matter much more here.'],
  ['Complex print', 'ORCHESTRATION', '2026.0.1', 'Optima integration', 'Execute multiple Sprint prints from one print definition.', sprintKbDocId, 'Available only in newer Optima versions and only for Sprint prints.'],
];

const templateFeatureRows = templateFeatures.map((entry) => ({
  id: makeId('SPR_FEATURE', entry[0]),
  name: entry[0],
  description: `${entry[0]} Sprint feature.`,
  semanticType: 'template_feature',
  featureType: entry[1],
  availabilityVersion: entry[2],
  editorArea: entry[3],
  useCase: entry[4],
  sourceDocumentRefId: entry[5],
  caution: entry[6],
  summary: `${entry[0]} is used for ${entry[4]}`,
}));

const sqlPatterns = [
  {
    name: 'Preferuj SELECT',
    patternType: 'SAFE_DEFAULT',
    contextParams: '',
    sourceMode: 'Custom SQL',
    anchorSchemaObjects: '',
    caution: 'Avoid DML unless explicitly requested and operationally justified.',
    exampleSql: 'SELECT TOP 100 * FROM CDN.TraNag;',
    summary: 'Sprint SQL should default to SELECT-based data preparation, not database modification.',
  },
  {
    name: 'Wlasne zapytanie SQL',
    patternType: 'DATA_SOURCE_MODE',
    contextParams: '',
    sourceMode: 'Custom SQL',
    anchorSchemaObjects: 'CDN_TEST:TABLE:CDN.TraNag;CDN_TEST:TABLE:CDN.TraElem',
    caution: 'Validate the query in SSMS with representative parameters before using it in Sprint.',
    exampleSql: 'SELECT TrN_TrNID, TrN_NumerPelny FROM CDN.TraNag WHERE TrN_TrNID = {eID};',
    summary: 'Use custom SQL when the visual data configurator is not enough and a direct report query is clearer.',
  },
  {
    name: 'Procedura jako zrodlo danych',
    patternType: 'DATA_SOURCE_MODE',
    contextParams: '@Identyfikator;@Wdr_Jednostka',
    sourceMode: 'SQL procedure',
    anchorSchemaObjects: 'CDN_TEST:PROCEDURE:CDN.RO_GetReportHeader;CDN_TEST:PROCEDURE:CDN.RO_GetReportContent',
    caution: 'Do not assume returned columns without validating the procedure result.',
    exampleSql: 'EXEC CDN.RO_GetReportHeader @Identyfikator, @Wdr_Jednostka;',
    summary: 'Sprint can use SQL procedures as data sources, especially for standard document print patterns.',
  },
  {
    name: 'Funkcja SQL jako zrodlo danych',
    patternType: 'DATA_SOURCE_MODE',
    contextParams: '',
    sourceMode: 'SQL function',
    anchorSchemaObjects: '',
    caution: 'Validate whether the function returns the shape expected by Sprint.',
    exampleSql: 'SELECT * FROM CDN.SomeTableValuedFunction({eID});',
    summary: 'Functions are a viable source mode when the database already exposes reusable table-valued logic.',
  },
  {
    name: 'Parametry kontekstu ERP',
    patternType: 'PARAMETERIZATION',
    contextParams: '{eID};{ePodmiotID}',
    sourceMode: 'Custom SQL',
    anchorSchemaObjects: 'CDN_TEST:TABLE:CDN.TraNag;CDN_TEST:TABLE:CDN.Kontrahenci',
    caution: 'Parameter syntax and availability depend on where the print is launched.',
    exampleSql: 'SELECT Knt_Email FROM CDN.TraNag JOIN CDN.Kontrahenci ON Knt_KntId = TrN_OdbID WHERE TrN_TrNID = {eID};',
    summary: 'ERP context parameters are the normal bridge between the active Optima document and a custom Sprint SQL query.',
  },
  {
    name: 'RO_GetReportHeader',
    patternType: 'STANDARD_PROCEDURE',
    contextParams: '@Identyfikator;@Wdr_Jednostka',
    sourceMode: 'SQL procedure',
    anchorSchemaObjects: 'CDN_TEST:PROCEDURE:CDN.RO_GetReportHeader',
    caution: 'Treat this as a validated source of header data, not as a table.',
    exampleSql: 'EXEC CDN.RO_GetReportHeader @Identyfikator, @Wdr_Jednostka;',
    summary: 'The KB corpus repeatedly points to RO_GetReportHeader as the header-data procedure for standard document prints.',
  },
  {
    name: 'RO_GetReportContent',
    patternType: 'STANDARD_PROCEDURE',
    contextParams: '@Identyfikator',
    sourceMode: 'SQL procedure',
    anchorSchemaObjects: 'CDN_TEST:PROCEDURE:CDN.RO_GetReportContent',
    caution: 'Use procedure execution semantics; do not write FROM EXEC.',
    exampleSql: 'EXEC CDN.RO_GetReportContent @Identyfikator;',
    summary: 'The KB corpus repeatedly points to RO_GetReportContent as the detail-line procedure for standard document prints.',
  },
  {
    name: 'Procedura nie jest tabela',
    patternType: 'ANTI_PATTERN',
    contextParams: '@Identyfikator',
    sourceMode: 'SQL procedure',
    anchorSchemaObjects: 'CDN_TEST:PROCEDURE:CDN.RO_GetReportContent',
    caution: 'FROM EXEC is not a valid normal table access pattern.',
    exampleSql: 'SELECT * FROM EXEC CDN.RO_GetReportContent @Identyfikator;',
    summary: 'Do not model SQL procedures as tables. That anti-pattern is explicitly called out in the Sprint corpus.',
  },
  {
    name: 'Tabela tymczasowa do analizy',
    patternType: 'ANALYTIC_HELPER',
    contextParams: '@Identyfikator',
    sourceMode: 'SSMS analysis',
    anchorSchemaObjects: 'CDN_TEST:PROCEDURE:CDN.RO_GetReportContent',
    caution: 'This is an SSMS-side analysis helper, not automatically a stable Sprint production pattern.',
    exampleSql: 'CREATE TABLE #tmp (...); INSERT INTO #tmp EXEC CDN.RO_GetReportContent @Identyfikator; SELECT * FROM #tmp;',
    summary: 'A temp-table capture pattern can help inspect a procedure result in SSMS before designing the final Sprint data source.',
  },
  {
    name: 'Bezpieczniejszy wariant z widokiem lub TVF',
    patternType: 'SAFE_VARIANT',
    contextParams: '',
    sourceMode: 'Custom SQL or function',
    anchorSchemaObjects: 'CDN_TEST:VIEW:CDN.TwrKarty;CDN_TEST:VIEW:CDN.KntKarty',
    caution: 'Prefer simpler source shapes when Sprint struggles with multi-statement SQL.',
    exampleSql: 'SELECT * FROM CDN.KntKarty WHERE Knt_KntId = {ePodmiotID};',
    summary: 'If multi-statement logic is unstable in Sprint, move complexity into a stable view or table-valued function.',
  },
  {
    name: 'Naglowek i pozycje',
    patternType: 'REPORT_SHAPE',
    contextParams: '{eID}',
    sourceMode: 'Custom SQL or procedures',
    anchorSchemaObjects: 'CDN_TEST:TABLE:CDN.TraNag;CDN_TEST:TABLE:CDN.TraElem',
    caution: 'Keep the one-to-many split clear or duplicated joins will inflate totals.',
    exampleSql: 'SELECT TrN_TrNID, TrN_NumerPelny FROM CDN.TraNag WHERE TrN_TrNID = {eID};',
    summary: 'Most document prints need a clear separation between header data and repeating line data.',
  },
  {
    name: 'Agregacja pozycji',
    patternType: 'AGGREGATION',
    contextParams: '{eID}',
    sourceMode: 'Custom SQL',
    anchorSchemaObjects: 'CDN_TEST:TABLE:CDN.TraElem',
    caution: 'Validate GROUP BY keys carefully to avoid accidental duplication.',
    exampleSql: 'SELECT TrE_TwrId, SUM(TrE_Ilosc) AS Ilosc FROM CDN.TraElem WHERE TrE_TrNId = {eID} GROUP BY TrE_TwrId;',
    summary: 'Aggregate line data only after verifying the grouping key and detail-cardinality expectations.',
  },
];

const sqlPatternRows = sqlPatterns.map((entry) => ({
  id: makeId('SPR_SQL', entry.name),
  name: entry.name,
  description: `${entry.name} Sprint SQL pattern.`,
  semanticType: 'sql_pattern',
  patternType: entry.patternType,
  contextParams: entry.contextParams,
  sourceMode: entry.sourceMode,
  sourceDocumentRefId: sqlDocId,
  anchorSchemaObjects: entry.anchorSchemaObjects,
  caution: entry.caution,
  summary: entry.summary,
  exampleSql: entry.exampleSql,
}));
sqlPatternRows.push(...manualPrintExport.extraSqlPatterns);

const diagnosticCases = [
  ['Incorrect syntax near WHERE', 'Application filter appended to custom SQL, conflicting parameters, or misplaced WHERE logic.', 'Check Ignoruj filtr aplikacji and test SQL in SSMS with concrete values.', 'Review print options, validate parameters, then inspect final SQL shape.', ''],
  ['Pusta co druga strona', 'Layout element, table, or subreport exceeds the printable width or page-break rules.', 'Check template width, margins, section breaks, and subreport width.', 'Review page settings and oversized controls.', ''],
  ['Brak danych na wydruku', 'Wrong parameters, wrong document context, or empty result set from SQL/procedure.', 'Run the source SQL or procedure in SSMS for the same input.', 'Verify input IDs and context parameters from Optima.', ''],
  ['Zle sumy lub duplikaty pozycji', 'Incorrect JOIN or grouping strategy multiplies detail rows.', 'Inspect the one-to-many joins and aggregate step.', 'Reduce the query to the minimal reproducing join path.', ''],
  ['Login failed for user CDNHASP', 'SQL connection or mapped connection identity issue in the environment.', 'Verify the SQL login path and connection configuration.', 'Check environment-specific SQL auth and mapping.', ''],
  ['Blad licencji lub polaczenia sieciowego', 'Sprint runtime cannot validate key or reach required services.', 'Check network ports, SQL Browser, aliases, and local Sprint state.', 'Use logs and environment diagnostics before changing the template.', 'C:\\Users\\<user>\\AppData\\Roaming\\Comarch sPrint\\Logs'],
  ['Parametry nie dzialaja po imporcie', 'Dynamic parameter definitions were not imported or names do not match.', 'Re-import dynamic parameters and compare names exactly.', 'Check both the Optima side and the Sprint definition side.', ''],
  ['Podszablon pyta o parametry wielokrotnie', 'Bindings between main report and subreport are incomplete or inconsistent.', 'Inspect subreport parameter binding definitions.', 'Reduce duplicated parameters and verify links.', ''],
  ['Widocznosc warunkowa zachowuje sie dziwnie', 'Condition inheritance or expression logic is wrong.', 'Check parent section visibility and the exact expression.', 'Validate conditions in the simplest possible layout.', ''],
  ['Pierwsze uruchomienie jest wolne lub niestabilne', 'Sprint process startup, local runtime state, or environment connectivity causes delay.', 'Check whether Sprint is prestarted and inspect runtime logs.', 'Review workstation environment and startup behavior.', 'C:\\Users\\<user>\\AppData\\Roaming\\Comarch sPrint\\Logs'],
];

const diagnosticCaseRows = diagnosticCases.map((entry) => ({
  id: makeId('SPR_DIAG', entry[0]),
  name: entry[0],
  description: `Diagnostic case: ${entry[0]}.`,
  semanticType: 'diagnostic_case',
  symptom: entry[0],
  probableCause: entry[1],
  firstCheck: entry[2],
  escalationPath: entry[3],
  logPath: entry[4],
  sourceDocumentRefId: diagnosticsDocId,
  summary: `${entry[0]}: ${entry[1]}`,
}));

const versionChanges = [
  ['2024.0', '', 'FEATURES', 'Sprint core', '', 'Added EAN8, GS1 DataMatrix, unlimited QR length, and DOCX export.'],
  ['2024.1', '', 'FEATURES', 'Sprint core', '', 'Added page numbering after group header, summarization functions, measure split by scope, and bottom-of-page group footer support.'],
  ['2024.1.1', '', 'FEATURES', 'Sprint core', '', 'Added Code39, Code39 Extended, Code128, and ChatERP beta references.'],
  ['2024.2', '', 'FEATURES', 'Sprint core', '', 'Added rich text, database attachments, regex validation/coloring, ITF14, grouping sort, and larger workspace zoom.'],
  ['2025.1', '2025-05-15', 'FEATURES', 'Sprint core', '', 'Added QR/barcode orientation, thin borders, dynamic images from URL, and DateTimeFromParts.'],
  ['2025.2', '2025-07-31', 'FEATURES', 'Sprint core', '', 'Added GetTimeFromMinutes and data-aware page numbering formulas.'],
  ['2025.3', '', 'FEATURES', 'Sprint core', '', 'Added FormatString, vertical cell merge, network diagnostics, and formatted text copying.'],
  ['2026.0.1', '2025-11-03', 'FEATURES', 'Optima integration', '', 'Introduced complex print and expanded Sprint print coverage in trade and HR areas.'],
  ['2026.4.1', '', 'FEATURES', 'Optima accounting', '', 'Expanded Sprint standard prints in accounting and related reporting areas.'],
  ['2026-04-01', '2026-04-01', 'LIFECYCLE', 'Legacy print technologies', 'EOL milestone for Crystal Reports and GenRap support.', 'Treat this date as a migration deadline for legacy custom print assets.'],
];

const versionChangeRows = versionChanges.map((entry) => ({
  id: makeId('SPR_VER', entry[0]),
  name: `Sprint ${entry[0]}`,
  description: `Sprint/Optima version change ${entry[0]}.`,
  semanticType: 'version_change',
  versionCode: entry[0],
  releaseDate: entry[1],
  changeScope: entry[2],
  moduleScope: entry[3],
  lifecycleImpact: entry[4],
  sourceDocumentRefId: sourcesDocId,
  summary: entry[5],
}));

const printCatalogs = [
  ['Faktury i korekty', 'SPRINT', 'Handel', '2026', 'Faktura VAT;Duplikat;JPK_V7;Marza;Pro Forma;Zaliczkowa;Finalna', 'Migrated and expanded Sprint family for sales documents.'],
  ['Handel - QR i adnotacje', 'SPRINT', 'Handel', '2026.0.1', 'Kod QR KSeF;adnotacje dodatkowe', 'Represents newer Sprint-only enhancements in trade prints.'],
  ['Wydruk zlozony', 'SPRINT', 'Cross-module', '2026.0.1', 'Wykonanie wielu wydrukow Sprint', 'Replacement for older cascading print behavior.'],
  ['Rejestry VAT i odliczenia', 'SPRINT', 'Ksiegowosc', '2026.4.1', 'Rejestry VAT;Wydruk wg rodzaju odliczen', 'Accounting-side Sprint expansion.'],
  ['Deklaracje podatkowe', 'SPRINT', 'Ksiegowosc', '2026.4.1', 'ORD-ZU IFT-1/1R;PIT-4R;PIT-8C;PIT-11;PIT-8A', 'Accounting and declaration print family moved into Sprint coverage.'],
  ['Raporty pracownicze', 'SPRINT', 'Kadry i Place', '2026.0.1', 'Badania okresowe;ZAS-12;Karta zasilkowa;ZNp-7;Staz pracy', 'HR Sprint coverage expansion.'],
  ['Raporty socjalne i zdrowotne', 'SPRINT', 'Kadry i Place', '2026.4.1', 'Wypłacone swiadczenia socjalne;Rozliczenie roczne skladki zdrowotnej', 'Later accounting/HR extensions in Sprint.'],
  ['Wydruki magazynowe', 'SPRINT', 'Magazyn', '2026', 'Wydruki dokumentow magazynowych i logistycznych', 'Sprint is the preferred target for new warehouse print design.'],
  ['Druki Pixel Perfect', 'SPRINT', 'Cross-module', '2026', 'CMR;blankiety przelewow;druki PIT', 'Sprint supports precise preprinted form layouts.'],
  ['Crystal custom prints', 'CRYSTAL', 'Legacy cross-module', 'Legacy', 'Starsze wydruki indywidualne', 'Analyze and manually migrate business-critical prints.'],
  ['GenRap custom prints', 'GENRAP', 'Legacy cross-module', 'Legacy', 'Starsze wydruki indywidualne', 'Analyze and manually migrate business-critical prints.'],
  ['XML prints', 'XML', 'Integration/export', 'Current', 'Eksporty XML', 'XML remains a separate output family rather than Sprint visual layout.'],
];

const printCatalogRows = printCatalogs.map((entry) => ({
  id: makeId('SPR_CAT', entry[0]),
  name: entry[0],
  description: `Print catalog area: ${entry[0]}.`,
  semanticType: 'print_catalog',
  catalogGroup: entry[0],
  printTechnology: entry[1],
  moduleScope: entry[2],
  versionHint: entry[3],
  printExamples: entry[4],
  migrationContext: entry[5],
  sourceDocumentRefId: sprintKbDocId,
  summary: `${entry[0]} uses ${entry[1]} and covers ${entry[2]}.`,
}));

const learningResources = [
  ['Optima Sprint article', 'OFFICIAL_HELP', 'Comarch', 'Optima docs', 'https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/jak-dodawac-edytowac-wydruki-sprint/', '2026', 'Implementers', 'Primary Optima-side workflow article for Sprint print work.'],
  ['Sprint knowledge base', 'OFFICIAL_HELP', 'Comarch', 'Sprint docs', 'https://pomoc.comarch.pl/sprint/', 'Current', 'Implementers', 'Primary official Sprint knowledge base.'],
  ['Sprint table of contents', 'OFFICIAL_HELP', 'Comarch', 'Sprint docs', 'https://pomoc.comarch.pl/sprint/index.php/spis-tresci/', 'Current', 'Implementers', 'Official navigation entry for Sprint documentation.'],
  ['Sprint integration with Optima', 'OFFICIAL_HELP', 'Comarch', 'Sprint docs', 'https://pomoc.comarch.pl/sprint/index.php/dokumentacja/integracja-z-comarch-erp-optima/', 'Current', 'Implementers', 'Official Sprint integration notes for Optima.'],
  ['Sprint demo environment', 'DEMO_ENVIRONMENT', 'Comarch', 'Web demo', 'https://demo-sprint.comarch.pl/', 'Current', 'Learners', 'Public demo environment for Sprint exploration.'],
  ['Comarch Sprint YouTube playlist', 'VIDEO_PLAYLIST', 'Comarch', 'YouTube', 'https://www.youtube.com/playlist?list=PLVWwVR27RU1-PaSKGJfdfsN8OyTVlvRLG', 'Current', 'Learners', 'Official video material for editor, SQL, grouping, parameters, and layout features.'],
  ['Comarch Szkolenia', 'VIDEO_CHANNEL', 'Comarch', 'YouTube', '', 'Current', 'Learners', 'Supplemental Comarch training channel referenced by the corpus.'],
  ['E-Comarch Sprint', 'TRAINING', 'Comarch', 'Commercial training', '', 'Current', 'Implementers', 'Official e-learning path for Sprint.'],
  ['Prospeo CSP30', 'TRAINING', 'Prospeo', 'Commercial training', '', 'Current', 'Implementers', 'Partner training course focused on Sprint print design and modification.'],
  ['ELTE-S blog', 'PARTNER_BLOG', 'ELTE-S', 'Web blog', 'https://elte-s.com/category/comarch-sprint/', 'Current', 'Advanced implementers', 'Independent technical blog with practical Sprint-focused articles.'],
  ['Wydruki Comarch sPrint service', 'SERVICE', 'Comarch', 'Email service', 'mailto:wydruki-comarch-sprint@comarch.pl', 'Current', 'Customers', 'Service channel for ordering ready-made Sprint prints.'],
];

const learningResourceRows = learningResources.map((entry) => ({
  id: makeId('SPR_RES', entry[0]),
  name: entry[0],
  description: `Learning resource: ${entry[0]}.`,
  semanticType: 'learning_resource',
  resourceType: entry[1],
  provider: entry[2],
  accessChannel: entry[3],
  sourceUrl: entry[4],
  versionHint: entry[5],
  audience: entry[6],
  sourceDocumentRefId: sourcesDocId,
  summary: entry[7],
}));

function parseGlossary(text) {
  const rows = [];
  for (const line of String(text || '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || trimmed.includes('|---')) continue;
    const parts = trimmed
      .split('|')
      .slice(1, -1)
      .map((part) => normalizeWhitespace(part));
    if (parts.length < 2) continue;
    if (parts[0] === 'Pojęcie') continue;
    rows.push(parts);
  }
  return rows;
}

const glossaryText = localDocs.find((doc) => doc.relPath === 'KB-sprint-07-slownik-pojec.md')?.text || '';
const glossaryTerms = parseGlossary(glossaryText).map(([term, definition]) => ({
  id: makeId('SPR_GLOSS', term),
  name: term,
  description: `Glossary term ${term}.`,
  semanticType: 'glossary_term',
  term,
  relatedTopic: term.includes('SQL') || term.includes('JOIN') || term.includes('GROUP BY') ? 'sql' : 'sprint',
  sourceDocumentRefId: glossaryDocId,
  definition,
}));

const schemaTouchpoints = [
  ['Procedura naglowka raportu', 'SPR_SQL_RO_GETREPORTHEADER', 'CDN_TEST:PROCEDURE:CDN.RO_GetReportHeader', 'CDN.RO_GetReportHeader', 'PROCEDURE', 'STANDARD_REPORT_SOURCE', 'HIGH', 'Referenced explicitly in multiple Sprint KB documents as the header procedure.', 'Use as a starting point when inspecting standard document header logic.'],
  ['Procedura pozycji raportu', 'SPR_SQL_RO_GETREPORTCONTENT', 'CDN_TEST:PROCEDURE:CDN.RO_GetReportContent', 'CDN.RO_GetReportContent', 'PROCEDURE', 'STANDARD_REPORT_SOURCE', 'HIGH', 'Referenced explicitly in multiple Sprint KB documents as the detail-line procedure.', 'Use as a starting point when inspecting standard line-item logic.'],
  ['Naglowki dokumentow handlowych', 'SPR_SQL_NAGLOWEK_I_POZYCJE', 'CDN_TEST:TABLE:CDN.TraNag', 'CDN.TraNag', 'TABLE', 'PRINT_SQL_ANCHOR', 'HIGH', 'The Sprint KB repeatedly points to TraNag for document header queries.', 'Anchor header-level report work here first.'],
  ['Pozycje dokumentow handlowych', 'SPR_SQL_NAGLOWEK_I_POZYCJE', 'CDN_TEST:TABLE:CDN.TraElem', 'CDN.TraElem', 'TABLE', 'PRINT_SQL_ANCHOR', 'HIGH', 'The Sprint KB repeatedly points to TraElem for repeating line queries.', 'Anchor detail-level report work here first.'],
  ['Platnosci i zdarzenia bankowe', 'SPR_RECIPE_BANK', 'CDN_TEST:TABLE:CDN.BnkZdarzenia', 'CDN.BnkZdarzenia', 'TABLE', 'PRINT_SQL_ANCHOR', 'HIGH', 'BnkZdarzenia is mentioned in the Sprint SQL corpus for payment-oriented prints.', 'Useful for bank/payment-related print scenarios.'],
  ['Kontrahenci', 'SPR_SQL_ERP_CONTEXT_PARAMS', 'CDN_TEST:TABLE:CDN.Kontrahenci', 'CDN.Kontrahenci', 'TABLE', 'PRINT_SQL_ANCHOR', 'HIGH', 'Kontrahenci is part of the example email lookup and customer-oriented print queries.', 'Use for customer fields in document and CRM-oriented prints.'],
  ['Kontakty kontrahenta', 'SPR_RECIPE_CRM', 'CDN_TEST:TABLE:CDN.KntOsoby', 'CDN.KntOsoby', 'TABLE', 'PRINT_SQL_ANCHOR', 'MEDIUM', 'KntOsoby is listed among important customer-related tables in the Sprint corpus.', 'Check when the print needs contact-person details rather than only contractor header data.'],
  ['Karty kontrahentow jako widok', 'SPR_SQL_SAFE_VARIANT_Z_WIDOKIEM_LUB_TVF', 'CDN_TEST:VIEW:CDN.KntKarty', 'CDN.KntKarty', 'VIEW', 'SAFE_SOURCE_SHAPE', 'MEDIUM', 'KntKarty appears in the schema KB as a view that can simplify some customer queries.', 'A view can be a simpler read surface than reconstructing complex joins repeatedly.'],
  ['PodmiotyView', 'SPR_RECIPE_CRM', 'CDN_TEST:TABLE:CDN.PodmiotyView', 'CDN.PodmiotyView', 'TABLE', 'PRINT_SQL_ANCHOR', 'MEDIUM', 'PodmiotyView is named in the Sprint corpus as a useful entity-centric source.', 'Check when a unified subject representation is needed.'],
  ['Towary jako widok', 'SPR_RECIPE_TRADE', 'CDN_TEST:VIEW:CDN.TwrKarty', 'CDN.TwrKarty', 'VIEW', 'SAFE_SOURCE_SHAPE', 'MEDIUM', 'TwrKarty appears in the schema KB and matches the product-centric data family named in the Sprint corpus.', 'Useful when a report needs product descriptors in a view-friendly shape.'],
  ['Ceny towarow', 'SPR_RECIPE_TRADE', 'CDN_TEST:TABLE:CDN.TwrCeny', 'CDN.TwrCeny', 'TABLE', 'PRINT_SQL_ANCHOR', 'MEDIUM', 'TwrCeny is listed as a relevant table in the Sprint SQL material.', 'Check for price-list and pricing-related prints.'],
  ['EAN towarow', 'SPR_RECIPE_TRADE', 'CDN_TEST:TABLE:CDN.TwrEan', 'CDN.TwrEan', 'TABLE', 'PRINT_SQL_ANCHOR', 'MEDIUM', 'TwrEan supports barcode-oriented output scenarios.', 'Useful when the print includes barcode or product code output.'],
  ['Jednostki miary towarow', 'SPR_RECIPE_TRADE', 'CDN_TEST:TABLE:CDN.TwrJm', 'CDN.TwrJm', 'TABLE', 'PRINT_SQL_ANCHOR', 'MEDIUM', 'TwrJm belongs to the product data family listed in Sprint SQL patterns.', 'Use for unit labels in line-item layouts.'],
  ['Ilosci towarow', 'SPR_RECIPE_WAREHOUSE', 'CDN_TEST:TABLE:CDN.TwrIlosci', 'CDN.TwrIlosci', 'TABLE', 'PRINT_SQL_ANCHOR', 'MEDIUM', 'TwrIlosci is explicitly named in the Sprint SQL corpus.', 'Useful for stock/state reporting.'],
  ['Zasoby towarow', 'SPR_RECIPE_WAREHOUSE', 'CDN_TEST:TABLE:CDN.TwrZasoby', 'CDN.TwrZasoby', 'TABLE', 'PRINT_SQL_ANCHOR', 'MEDIUM', 'TwrZasoby is explicitly named in the Sprint SQL corpus.', 'Useful for warehouse and stock allocation views.'],
  ['Magazyny', 'SPR_RECIPE_WAREHOUSE', 'CDN_TEST:TABLE:CDN.Magazyny', 'CDN.Magazyny', 'TABLE', 'PRINT_SQL_ANCHOR', 'MEDIUM', 'Magazyny belongs to the warehouse print area in the Sprint corpus.', 'Use when the report groups or filters by warehouse.'],
  ['Atrybuty definicje', 'SPR_RECIPE_ATTRIBUTES', 'CDN_TEST:TABLE:CDN.DefAtrybuty', 'CDN.DefAtrybuty', 'TABLE', 'PRINT_SQL_ANCHOR', 'MEDIUM', 'DefAtrybuty is explicitly named in the Sprint SQL material.', 'Start here when custom attribute labels or metadata are needed.'],
  ['Atrybuty dokumentow', 'SPR_RECIPE_ATTRIBUTES', 'CDN_TEST:TABLE:CDN.DokAtrybuty', 'CDN.DokAtrybuty', 'TABLE', 'PRINT_SQL_ANCHOR', 'MEDIUM', 'DokAtrybuty is explicitly named in the Sprint SQL material.', 'Use when the print exposes document-bound attributes.'],
  ['Etaty pracownikow', 'SPR_RECIPE_HR', 'CDN_TEST:TABLE:CDN.PracEtaty', 'CDN.PracEtaty', 'TABLE', 'PRINT_SQL_ANCHOR', 'MEDIUM', 'PracEtaty is listed for HR report scenarios.', 'Start here for employee and HR-oriented print work.'],
  ['Metadane wydrukow', 'SPR_RECIPE_ADMIN', 'CDN_KNF_Konfiguracja:TABLE:CDN.Wydruki', 'CDN.Wydruki', 'TABLE', 'PRINT_METADATA', 'HIGH', 'The Sprint corpus explicitly names Wydruki as print metadata.', 'Use when analyzing stored print definitions and print-type metadata.'],
  ['Zestawy wydrukow', 'SPR_RECIPE_ADMIN', 'CDN_KNF_Konfiguracja:TABLE:CDN.WdrZestawy', 'CDN.WdrZestawy', 'TABLE', 'PRINT_METADATA', 'HIGH', 'The Sprint corpus explicitly names WdrZestawy as print-set metadata.', 'Use for print-set organization and assignment analysis.'],
  ['Podlaczenia zestawow wydrukow', 'SPR_RECIPE_ADMIN', 'CDN_KNF_Konfiguracja:TABLE:CDN.WdrPodlaczeniaZestawow', 'CDN.WdrPodlaczeniaZestawow', 'TABLE', 'PRINT_METADATA', 'HIGH', 'The Sprint corpus explicitly names WdrPodlaczeniaZestawow for print-set linkage.', 'Use to inspect how print sets are connected in configuration metadata.'],
];

const schemaTouchpointRows = schemaTouchpoints.map((entry) => ({
  id: makeId('SPR_TOUCH', `${entry[0]}:${entry[2]}`),
  name: entry[0],
  description: `${entry[0]} schema touchpoint for Sprint KB.`,
  semanticType: 'schema_touchpoint',
  sourceObjectRefId: entry[1],
  schemaObjectRefId: entry[2],
  schemaObjectName: entry[3],
  schemaObjectKind: entry[4],
  touchpointType: entry[5],
  confidence: entry[6],
  evidence: entry[7],
  schemaKnowledgeBase: 'ComarchOptimaSchema',
  queryDesignNote: entry[8],
}));

const moduleRecipes = [
  {
    id: 'SPR_RECIPE_TRADE',
    name: 'Handel i faktury',
    description: 'Recipe for trade documents, invoices, and related standard Sprint prints.',
    semanticType: 'module_recipe',
    moduleName: 'Handel',
    scenarioType: 'DOCUMENT_PRINT',
    preferredMechanism: 'Sprint copy of standard print plus header/detail SQL validation',
    triggerSuitability: 'High for document and invoice prints',
    anchorSchemaObjects: 'CDN_TEST:TABLE:CDN.TraNag;CDN_TEST:TABLE:CDN.TraElem;CDN_TEST:TABLE:CDN.Kontrahenci',
    joinHint: 'Start from TraNag and only then join TraElem or contractor data as needed.',
    sqlObjectHint: 'Inspect RO_GetReportHeader and RO_GetReportContent before reinventing standard document logic.',
    schemaKnowledgeBase: 'ComarchOptimaSchema',
    caution: 'Detail joins can multiply totals if header/detail separation is blurred.',
    summary: 'For trade prints, begin from a standard Sprint document pattern and validate header/detail data flow before custom SQL changes.',
  },
  {
    id: 'SPR_RECIPE_WAREHOUSE',
    name: 'Magazyn i stany',
    description: 'Recipe for warehouse and stock-oriented prints.',
    semanticType: 'module_recipe',
    moduleName: 'Magazyn',
    scenarioType: 'STOCK_PRINT',
    preferredMechanism: 'Sprint custom SQL or view-based source',
    triggerSuitability: 'Medium',
    anchorSchemaObjects: 'CDN_TEST:TABLE:CDN.Magazyny;CDN_TEST:TABLE:CDN.TwrIlosci;CDN_TEST:TABLE:CDN.TwrZasoby',
    joinHint: 'Anchor by warehouse and stock tables first, then bring in item descriptors.',
    sqlObjectHint: 'Prefer stable read surfaces when multi-statement logic is not necessary.',
    schemaKnowledgeBase: 'ComarchOptimaSchema',
    caution: 'Warehouse prints often fail because of overcomplicated joins and ambiguous stock granularity.',
    summary: 'Warehouse prints work best with a clear stock granularity and item descriptor strategy.',
  },
  {
    id: 'SPR_RECIPE_BANK',
    name: 'Kasa i bank',
    description: 'Recipe for bank, payment, and transfer-related prints.',
    semanticType: 'module_recipe',
    moduleName: 'Kasa i Bank',
    scenarioType: 'PAYMENT_PRINT',
    preferredMechanism: 'Sprint standard print copy plus payment-specific SQL validation',
    triggerSuitability: 'Medium',
    anchorSchemaObjects: 'CDN_TEST:TABLE:CDN.BnkZdarzenia;CDN_TEST:TABLE:CDN.Kontrahenci',
    joinHint: 'Resolve payment event and contractor mapping first.',
    sqlObjectHint: 'Check whether the print only needs payment metadata or full document linkage.',
    schemaKnowledgeBase: 'ComarchOptimaSchema',
    caution: 'Payment QR and transfer scenarios often depend on document state and bank account availability.',
    summary: 'Bank-related prints require clean payment-event and contractor context before layout work.',
  },
  {
    id: 'SPR_RECIPE_HR',
    name: 'Kadry i place',
    description: 'Recipe for employee and payroll-related Sprint prints.',
    semanticType: 'module_recipe',
    moduleName: 'Kadry i Place',
    scenarioType: 'HR_PRINT',
    preferredMechanism: 'Sprint standard print family plus version-aware template customization',
    triggerSuitability: 'Medium',
    anchorSchemaObjects: 'CDN_TEST:TABLE:CDN.PracEtaty',
    joinHint: 'Confirm the employee-level anchor and only then widen the query.',
    sqlObjectHint: 'Version support matters because many HR prints were added in later releases.',
    schemaKnowledgeBase: 'ComarchOptimaSchema',
    caution: 'HR report availability is version-sensitive and should be validated in the target Optima release.',
    summary: 'HR Sprint work is strongly version-dependent; confirm that the standard print family already exists before deep customization.',
  },
  {
    id: 'SPR_RECIPE_ATTRIBUTES',
    name: 'Atrybuty i dane dodatkowe',
    description: 'Recipe for attribute-rich prints and custom metadata exposure.',
    semanticType: 'module_recipe',
    moduleName: 'Atrybuty',
    scenarioType: 'ATTRIBUTE_PRINT',
    preferredMechanism: 'Sprint custom SQL with carefully validated joins',
    triggerSuitability: 'Medium',
    anchorSchemaObjects: 'CDN_TEST:TABLE:CDN.DefAtrybuty;CDN_TEST:TABLE:CDN.DokAtrybuty',
    joinHint: 'Resolve attribute definitions and document bindings as separate steps.',
    sqlObjectHint: 'Attribute joins are a common source of duplication and null surprises.',
    schemaKnowledgeBase: 'ComarchOptimaSchema',
    caution: 'Attributes are flexible but can quickly create noisy, brittle SQL if the join path is not controlled.',
    summary: 'Attribute-driven prints need disciplined join design and explicit validation of which attribute layer is actually required.',
  },
  {
    id: 'SPR_RECIPE_CRM',
    name: 'Kontrahenci i kontakty',
    description: 'Recipe for contractor and contact-centric print scenarios.',
    semanticType: 'module_recipe',
    moduleName: 'CRM',
    scenarioType: 'CONTACT_PRINT',
    preferredMechanism: 'Sprint SQL with contractor/contact split',
    triggerSuitability: 'Medium',
    anchorSchemaObjects: 'CDN_TEST:TABLE:CDN.Kontrahenci;CDN_TEST:TABLE:CDN.KntOsoby;CDN_TEST:TABLE:CDN.PodmiotyView',
    joinHint: 'Decide whether the print needs contractor header data, contact-person data, or a unified subject view.',
    sqlObjectHint: 'Use PodmiotyView or KntKarty only if they truly simplify the query shape.',
    schemaKnowledgeBase: 'ComarchOptimaSchema',
    caution: 'Customer and contact joins are easy to overgeneralize without confirming the exact business context.',
    summary: 'Customer-oriented prints should separate contractor identity from contact-person detail early in the design.',
  },
  {
    id: 'SPR_RECIPE_ADMIN',
    name: 'Administracja wydrukami',
    description: 'Recipe for analyzing print metadata and configuration storage.',
    semanticType: 'module_recipe',
    moduleName: 'Administracja',
    scenarioType: 'PRINT_METADATA_ANALYSIS',
    preferredMechanism: 'Schema KB exploration plus Sprint documentation',
    triggerSuitability: 'Low for end-user prints, high for administrators',
    anchorSchemaObjects: 'CDN_KNF_Konfiguracja:TABLE:CDN.Wydruki;CDN_KNF_Konfiguracja:TABLE:CDN.WdrZestawy;CDN_KNF_Konfiguracja:TABLE:CDN.WdrPodlaczeniaZestawow',
    joinHint: 'Start from Wydruki, then set and linkage tables.',
    sqlObjectHint: 'This is metadata analysis, not live business-row reporting.',
    schemaKnowledgeBase: 'ComarchOptimaSchema',
    caution: 'Keep this slice separated from business data and from direct modification of configuration tables.',
    summary: 'When analyzing how prints are stored and grouped, use the configuration tables in the schema KB rather than guessing ERP internals.',
  },
];

const chunks = [];
for (const doc of localDocs) {
  const sections = parseMarkdownSections(doc.text);
  sections.forEach((section, index) => {
    if (!section.content) return;
    const content = truncate(section.content, 4000);
    chunks.push({
      id: makeId('SPR_CHUNK', `${doc.relPath}:${index + 1}:${section.heading}`),
      name: `${doc.name} - ${section.heading}`,
      description: `Chunk from ${doc.relPath}, section ${section.heading}.`,
      sourceObjectRefId: doc.id,
      sourceDocument: doc.name,
      sourceSection: section.heading,
      semanticType: 'chunk',
      content,
    });
  });
}
chunks.push(...manualPrintExport.extraChunks);
for (const draft of promotedKnowledge) {
  const documentId = promotedDocumentIdByDraftId.get(draft.id)
    || makeId('SPR_DOC_PROMOTED', draft.id);
  parseMarkdownSections(`# ${draft.title}\n\n${draft.content}`).forEach((section, index) => {
    chunks.push({
      id: makeId('SPR_CHUNK_PROMOTED', `${draft.id}_${index + 1}`),
      name: `${draft.title} - ${section.heading}`,
      description: `Promoted knowledge inbox chunk for ${draft.title}.`,
      sourceObjectRefId: documentId,
      sourceDocument: draft.title,
      sourceSection: section.heading,
      semanticType: 'chunk',
      content: truncate(section.content || draft.content, 3800),
    });
  });
}

ensureDir(EXPORT_DIR);

const files = [];
files.push(
  writeCsv(EXPORT_DIR, 
    'reference_document.csv',
    ['id', 'name', 'description', 'semanticType', 'sourceUrl', 'sourceType', 'documentCategory', 'versionHint', 'sourceOrigin', 'summary'],
    dedupeById(referenceDocuments),
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'file_artifact.csv',
    ['id', 'name', 'description', 'semanticType', 'relativePath', 'sourceOrigin', 'collectionName', 'artifactType', 'fileExtension', 'fileSizeBytes', 'contentPreview'],
    fileArtifacts,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'print_technology.csv',
    ['id', 'name', 'description', 'semanticType', 'technologyCode', 'lifecycleStatus', 'preferredUse', 'editorType', 'dataSources', 'exportFormats', 'migrationNote', 'summary'],
    printTechnologies,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'print_workflow.csv',
    ['id', 'name', 'description', 'semanticType', 'workflowType', 'uiContext', 'triggerPath', 'shortcut', 'primaryAction', 'sourceDocumentRefId', 'caution', 'summary'],
    printWorkflows,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'print_option.csv',
    ['id', 'name', 'description', 'semanticType', 'optionName', 'optionScope', 'effect', 'recommendedWhen', 'riskIfSkipped', 'sourceDocumentRefId', 'summary'],
    printOptions,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'template_feature.csv',
    ['id', 'name', 'description', 'semanticType', 'featureType', 'availabilityVersion', 'editorArea', 'useCase', 'sourceDocumentRefId', 'caution', 'summary'],
    templateFeatureRows,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'sql_pattern.csv',
    ['id', 'name', 'description', 'semanticType', 'patternType', 'contextParams', 'sourceMode', 'sourceDocumentRefId', 'anchorSchemaObjects', 'caution', 'summary', 'exampleSql'],
    sqlPatternRows,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'diagnostic_case.csv',
    ['id', 'name', 'description', 'semanticType', 'symptom', 'probableCause', 'firstCheck', 'escalationPath', 'logPath', 'sourceDocumentRefId', 'summary'],
    diagnosticCaseRows,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'version_change.csv',
    ['id', 'name', 'description', 'semanticType', 'versionCode', 'releaseDate', 'changeScope', 'moduleScope', 'lifecycleImpact', 'sourceDocumentRefId', 'summary'],
    versionChangeRows,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'print_catalog.csv',
    ['id', 'name', 'description', 'semanticType', 'catalogGroup', 'printTechnology', 'moduleScope', 'versionHint', 'printExamples', 'migrationContext', 'sourceDocumentRefId', 'summary'],
    printCatalogRows,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'learning_resource.csv',
    ['id', 'name', 'description', 'semanticType', 'resourceType', 'provider', 'accessChannel', 'sourceUrl', 'versionHint', 'audience', 'sourceDocumentRefId', 'summary'],
    learningResourceRows,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'glossary_term.csv',
    ['id', 'name', 'description', 'semanticType', 'term', 'relatedTopic', 'sourceDocumentRefId', 'definition'],
    glossaryTerms,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'schema_touchpoint.csv',
    ['id', 'name', 'description', 'semanticType', 'sourceObjectRefId', 'schemaObjectRefId', 'schemaObjectName', 'schemaObjectKind', 'touchpointType', 'confidence', 'evidence', 'schemaKnowledgeBase', 'queryDesignNote'],
    schemaTouchpointRows,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'module_recipe.csv',
    ['id', 'name', 'description', 'semanticType', 'moduleName', 'scenarioType', 'preferredMechanism', 'triggerSuitability', 'anchorSchemaObjects', 'joinHint', 'sqlObjectHint', 'schemaKnowledgeBase', 'caution', 'summary'],
    moduleRecipes,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'chunk.csv',
    ['id', 'name', 'description', 'sourceObjectRefId', 'sourceDocument', 'sourceSection', 'semanticType', 'content'],
    dedupeById(chunks),
  ),
);

const sourceFiles = [
  ...listFilesRecursive(DRIVE_ROOT).filter((filePath) => !filePath.includes(`${path.sep}meta${path.sep}`)),
  ...listFilesRecursive(MANUAL_EXPORT_ROOT),
];
const sourceRegistry = {
  generatedAt: new Date().toISOString(),
  kbName: 'Comarch Optima Sprint and Prints',
  namespace: 'ComarchOptimaSprint',
  purpose: 'Local Google Drive and manual-export provenance for freshness checks, duplicate checks, and source attribution.',
  sources: sourceFiles.map((filePath) => ({
    key: path.relative(ROOT, filePath).replaceAll(path.sep, '/'),
    localSnapshotPath: path.relative(ROOT, filePath).replaceAll(path.sep, '/'),
    sourceType: filePath.startsWith(MANUAL_EXPORT_ROOT) ? 'manual_optima_export' : 'google_drive_corpus',
    contentHash: fileSha256(filePath),
    hashAlgorithm: 'sha256',
    updatedAt: fs.statSync(filePath).mtime.toISOString(),
  })),
  referenceDocuments: dedupeById(referenceDocuments).map((doc) => ({
    id: doc.id,
    name: doc.name,
    sourceUrl: doc.sourceUrl,
    sourceType: doc.sourceType,
    documentCategory: doc.documentCategory,
    contentHash: sha256(JSON.stringify(doc)),
    hashAlgorithm: 'sha256',
  })),
};
writeJson(SOURCE_REGISTRY_PATH, sourceRegistry);

const manifest = {
  generatedAt: new Date().toISOString(),
  namespace: 'ComarchOptimaSprint',
  projectIntent: 'documentation and design-reference KB for Sprint and other Optima print technologies',
  driveRoot: fs.existsSync(DRIVE_ROOT) ? DRIVE_ROOT : '',
  sourceRegistryPath: path.relative(ROOT, SOURCE_REGISTRY_PATH).replaceAll(path.sep, '/'),
  files,
};

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

const readmeLines = [
  '# ComarchOptimaSprint export',
  '',
  `Generated at: ${manifest.generatedAt}`,
  '',
  '## Files',
  '',
  ...files.map((file) => `- \`${file.fileName}\`: \`${file.rowCount}\``),
  '',
];
fs.writeFileSync(README_PATH, readmeLines.join('\n'), 'utf8');

console.log(
  JSON.stringify(
    {
      success: true,
      exportDir: EXPORT_DIR,
      files: files.length,
      referenceDocuments: referenceDocuments.length,
      fileArtifacts: fileArtifacts.length,
      printTechnologies: printTechnologies.length,
      printWorkflows: printWorkflows.length,
      sqlPatterns: sqlPatternRows.length,
      diagnostics: diagnosticCaseRows.length,
      schemaTouchpoints: schemaTouchpointRows.length,
      moduleRecipes: moduleRecipes.length,
      chunks: chunks.length,
    },
    null,
    2,
  ),
);
})().catch((error) => { console.error(error.message); process.exit(1); });
