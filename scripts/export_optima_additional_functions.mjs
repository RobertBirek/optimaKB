#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { extractPdfText } from './lib/pdf_text.mjs';
import { parseOptimaManualExport } from './lib/optima_manual_exports.mjs';
import { loadPromotedKnowledge } from './lib/promoted_knowledge.mjs';
import { ensureDir, writeCsv, writeJson, makeId } from './lib/export_utils.mjs';

const ROOT = '/docker/openspg';
const EXPORT_DIR = path.join(ROOT, 'exports/optima_additional_functions/v1');
const MANIFEST_PATH = path.join(EXPORT_DIR, '_manifest.json');
const README_PATH = path.join(EXPORT_DIR, 'README.md');
const DRIVE_ROOT = path.join(ROOT, 'downloads/google_drive/additional_functions');
const MANUAL_EXPORT_ROOT = path.join(ROOT, 'downloads/google_drive/manual_exports');
const META_DIR = path.join(DRIVE_ROOT, 'meta');
const SOURCE_REGISTRY_PATH = path.join(META_DIR, 'source_registry.json');
const EXAMPLES_ROOT =
  'Przyklady użycia obiektów COM 2016 - NET - XPT - JS - VB60 - VC';

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

function truncate(value, limit = 1200) {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 3)}...`;
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

function isTextExtension(ext) {
  return new Set([
    'csv',
    'js',
    'json',
    'hta',
    'md',
    'txt',
    'vb',
    'vbs',
    'vc',
    'cpp',
    'cs',
    'csproj',
    'sln',
    'xml',
    'xpt',
    'h',
    'tlh',
    'tli',
    'config',
    'sql',
    'log',
  ]).has(ext);
}

function readMaybeText(filePath) {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  if (!isTextExtension(ext)) return '';
  const buffer = fs.readFileSync(filePath);
  const utf8 = buffer.toString('utf8');
  const badUtf8 = (utf8.match(/\uFFFD/g) || []).length;
  if (badUtf8 <= 5) return utf8;
  return buffer.toString('latin1');
}

function parseComDok(rawText) {
  const text = rawText || '';
  const blockMatch = text.match(/\/\*<COM_DOK>([\s\S]*?)<\/COM_DOK>\*\//i);
  if (!blockMatch) {
    return {
      description: '',
      launchHint: '',
      author: '',
      optimaVersion: '',
      interfaces: [],
    };
  }
  const block = blockMatch[1];
  const getTag = (tag) => {
    const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return normalizeWhitespace(match?.[1] || '');
  };
  const interfaces = [
    ...block.matchAll(/<Interfejs>\s*([\s\S]*?)\s*<\/Interfejs>/gi),
  ].map((match) => normalizeWhitespace(match[1]));
  return {
    description: getTag('OPIS'),
    launchHint: getTag('Uruchomienie'),
    author: getTag('Osoba'),
    optimaVersion: getTag('OPT_VER'),
    interfaces,
  };
}

function parseDelimited(text, delimiter = ';') {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;
  const normalized = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i];
    const next = normalized[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(field);
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      field = '';
      continue;
    }
    field += ch;
  }
  row.push(field);
  if (row.some((value) => value !== '')) rows.push(row);
  return rows;
}

function parseSemicolonDelimited(text) {
  return parseDelimited(text, ';');
}

function parseMessagesXml(text) {
  const map = new Map();
  for (const match of text.matchAll(/<Message\s+([^>]+?)\/>/g)) {
    const attrs = {};
    for (const attr of match[1].matchAll(/(\w+)="([^"]*)"/g)) {
      attrs[attr[1]] = attr[2];
    }
    if (attrs.Id || attrs.Constant) {
      map.set(attrs.Id || attrs.Constant, attrs);
    }
  }
  return map;
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

function inferArtifactType(relPath, ext) {
  const lowerPath = relPath.toLowerCase();
  if (lowerPath.includes('dictionaries_')) return 'dictionary_artifact';
  if (lowerPath.includes('komunikaty_optimy')) return 'message_catalog_artifact';
  if (lowerPath.includes('interfejsy_obiektow_com')) return 'runtime_package_artifact';
  if (ext === 'js') return 'script_example';
  if (ext === 'xpt') return 'xpt_example';
  if (ext === 'hta') return 'hta_example';
  if (ext === 'xml') return 'xml_example';
  if (ext === 'txt') return 'companion_input';
  if (new Set(['ico', 'png', 'jpg', 'jpeg', 'gif', 'db']).has(ext)) return 'ui_asset';
  if (new Set(['exe', 'dll', 'pdb']).has(ext)) return 'binary_artifact';
  if (new Set(['cs', 'vb', 'cpp', 'h', 'tlh', 'tli', 'csproj', 'sln', 'config']).has(ext)) return 'source_artifact';
  return 'file_artifact';
}

function inferRuntimeFamily(relPath, ext, text) {
  const lowerPath = relPath.toLowerCase();
  if (lowerPath.includes('interfejsy_obiektow_com')) return 'com_sdk';
  if (lowerPath.includes('/net') || lowerPath.includes('\\net')) return '.net';
  if (ext === 'hta') return 'wsh_hta';
  if (ext === 'js' && /ActiveXObject|WScript/i.test(text)) return 'wsh_com';
  if (ext === 'xpt') return 'xpt';
  if (ext === 'xml') return 'xml_payload';
  if (ext === 'exe') return 'desktop_binary';
  return '';
}

function inferModuleScope(relPath) {
  const parts = relPath.split(path.sep);
  const exampleIndex = parts.indexOf(EXAMPLES_ROOT);
  if (exampleIndex === -1) return '';
  const afterRoot = parts.slice(exampleIndex + 1);
  if (afterRoot[0] === 'JS' && afterRoot[1]) return afterRoot[1];
  if (afterRoot[0]) return afterRoot[0];
  return '';
}

function inferImplementationScope(relPath) {
  const dir = path.dirname(relPath);
  if (dir === '.') return '';
  return dir.split(path.sep).slice(-1)[0];
}

function inferExampleType(ext) {
  if (ext === 'js') return 'automation_script';
  if (ext === 'xpt') return 'xpt_script';
  if (ext === 'hta') return 'interactive_shell';
  if (ext === 'xml') return 'xml_payload';
  return 'example';
}

function inferLanguage(ext) {
  if (ext === 'js') return 'jscript';
  if (ext === 'hta') return 'html_jscript_vbscript';
  if (ext === 'xpt') return 'xpt';
  if (ext === 'xml') return 'xml';
  return ext || 'text';
}

function inferTopLevelDocumentCategory(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.includes('readme')) return 'local_index';
  if (lower.includes('kompendium')) return 'local_handbook';
  if (lower.includes('debugowania skryptów')) return 'local_debugging_guide';
  if (lower.includes('problemy-z-ladowaniem-zaleznosci')) return 'local_sdk_troubleshooting';
  if (lower.includes('compass_artifact')) return 'local_project_kb';
  if (lower.includes('funkcje_dodatkowe')) return 'local_additional_functions_kb';
  return 'local_reference';
}

function inferManualModuleScope(setName, recordName) {
  const context = `${setName} ${recordName}`.toLowerCase();
  if (context.includes('bank') || context.includes('raport')) return 'KASA_BANK';
  if (context.includes('vat') || context.includes('ewid')) return 'KSIEGOWOSC_COMPLIANCE';
  if (context.includes('faktur') || context.includes('dok') || context.includes('sprzeda')) return 'HANDEL_MAGAZYN';
  if (context.includes('excel') || context.includes('xml') || context.includes('pef')) return 'INTEGRATION_EXPORT';
  return setName || 'GENERAL_ERP';
}

function inferManualRuntimeFamily(record) {
  if (record.definitionKind === 'jscript') return 'wsh_com';
  if (record.definitionKind === 'sql') return 'sql_logic';
  if (record.definitionKind === 'xml' || record.definitionKind === 'genrap_xml') return 'xml_payload';
  if (record.definitionKind === 'compressed') return 'compressed_export_definition';
  return 'text_definition';
}

function buildManualDefinitionContent(record) {
  const parts = [
    `Nazwa: ${record.WDR_NAZWA || record.printNameAttr || ''}`,
    `Zestaw: ${record.setName || ''}`,
    `Rodzaj/Typ/PodTyp: ${record.WDR_RODZAJ || ''}/${record.WDR_TYP || ''}/${record.WDR_PODTYP || ''}`,
    `Kompresja: ${record.WDR_KOMPRESJA || '0'}`,
    `Definition kind: ${record.definitionKind}`,
  ];
  if (record.WDR_WARUNEK) parts.push(`Warunek: ${normalizeWhitespace(record.WDR_WARUNEK)}`);
  if (record.WDR_WARUNEKAUTO) parts.push(`Warunek auto: ${normalizeWhitespace(record.WDR_WARUNEKAUTO)}`);
  if (record.WDR_PARAMETRY) parts.push(`Parametry:\n${record.WDR_PARAMETRY}`);
  if (record.definitionKind === 'compressed') {
    parts.push('Definicja: [COMPRESSED_DEFINITION]');
  } else if (record.WDR_DEFINICJA) {
    parts.push(`Definicja:\n${record.WDR_DEFINICJA}`);
  }
  return truncate(parts.join('\n\n'), 4000);
}

async function scanLocalCorpus() {
  const fileArtifacts = [];
  const implementationExamples = [];
  const interfaces = new Map();
  const referenceDocuments = [];
  const localReferenceChunks = [];

  if (!fs.existsSync(DRIVE_ROOT)) {
    return { fileArtifacts, implementationExamples, comInterfaces: [], referenceDocuments };
  }

  referenceDocuments.push(
    {
      id: 'AF_DOC_DRIVE_DICTIONARIES',
      name: 'Local dictionaries corpus',
      description: 'Local Google Drive corpus with configuration, procedure, and message dictionaries for Optima customization work.',
      semanticType: 'reference_document',
      sourceUrl: 'downloads/google_drive/additional_functions/Dictionaries_2026_4',
      sourceType: 'local_drive_folder',
      documentCategory: 'local_dictionary_corpus',
      versionHint: '2026.4',
      articleUpdatedAt: '',
      relatedKnowledgeBase: 'ComarchOptimaAdditionalFunctions',
      summary: 'Local dictionary corpus containing configuration keys, procedure ids, and message catalogs used around additional functions and adjacent mechanisms.',
    },
    {
      id: 'AF_DOC_DRIVE_MESSAGES',
      name: 'Local Optima message catalog corpus',
      description: 'Local Google Drive corpus with Optima message XML used for UI and process diagnostics.',
      semanticType: 'reference_document',
      sourceUrl: 'downloads/google_drive/additional_functions/Komunikaty_Optimy_2025_3',
      sourceType: 'local_drive_folder',
      documentCategory: 'local_message_corpus',
      versionHint: '2025.3',
      articleUpdatedAt: '',
      relatedKnowledgeBase: 'ComarchOptimaAdditionalFunctions',
      summary: 'Local message corpus mapping ids and constants to real Optima UI and process messages, useful for implementation diagnostics and procedure context.',
    },
    {
      id: 'AF_DOC_DRIVE_COM_EXAMPLES',
      name: 'Local COM examples corpus',
      description: 'Local Google Drive corpus with COM, XPT, JS, HTA, and supporting example materials.',
      semanticType: 'reference_document',
      sourceUrl: `downloads/google_drive/additional_functions/${EXAMPLES_ROOT}`,
      sourceType: 'local_drive_folder',
      documentCategory: 'local_example_corpus',
      versionHint: 'mixed',
      articleUpdatedAt: '',
      relatedKnowledgeBase: 'ComarchOptimaAdditionalFunctions',
      summary: 'Local implementation corpus containing example scripts, templates, payloads, binaries, and companion files for Optima automation and additional-function style work.',
    },
  );

  for (const fullPath of listFilesRecursive(DRIVE_ROOT)) {
    const relPath = path.relative(DRIVE_ROOT, fullPath);
    const ext = path.extname(fullPath).slice(1).toLowerCase();
    let rawText;
    if (ext === 'pdf') rawText = await extractPdfText(fullPath);
    else rawText = readMaybeText(fullPath);
    const contentPreview = truncate(rawText, 2200);
    const collectionName = relPath.split(path.sep)[0] || '';
    const moduleScope = inferModuleScope(relPath);
    const implementationScope = inferImplementationScope(relPath);
    const artifactType = inferArtifactType(relPath, ext);
    const runtimeFamily = inferRuntimeFamily(relPath, ext, rawText);
    const artifactId = makeId('AF_FILE', relPath);
    const fileName = path.basename(fullPath);

    fileArtifacts.push({
      id: artifactId,
      name: fileName,
      description: `${artifactType} from local Additional Functions corpus`,
      semanticType: 'file_artifact',
      relativePath: relPath,
      sourceOrigin: 'google_drive_local_download',
      collectionName,
      artifactType,
      fileExtension: ext,
      moduleScope,
      implementationScope,
      runtimeFamily,
      fileSizeBytes: String(fs.statSync(fullPath).size),
      contentPreview,
    });

    const isTopLevelReferenceDoc =
      !relPath.includes(path.sep) &&
      new Set(['md', 'pdf']).has(ext);
    if (isTopLevelReferenceDoc) {
      const refId = makeId('AF_DOC_LOCAL', relPath);
      const baseName = path.basename(fullPath);
      const summary =
        ext === 'md'
          ? truncate(rawText, 1400)
          : truncate(`${baseName} from local Google Drive Additional Functions corpus.`, 800);
      referenceDocuments.push({
        id: refId,
        name: baseName,
        description: `Local Additional Functions reference document ${baseName}.`,
        semanticType: 'reference_document',
        sourceUrl: `downloads/google_drive/additional_functions/${relPath}`,
        sourceType: ext === 'md' ? 'local_drive_markdown' : 'local_drive_pdf',
        documentCategory: inferTopLevelDocumentCategory(baseName),
        versionHint: rawText.match(/\b202[4-6](?:\.\d(?:\.\d)?)?\b/)?.[0] || '',
        articleUpdatedAt: '',
        relatedKnowledgeBase: 'ComarchOptimaAdditionalFunctions',
        summary,
      });

      if (new Set(['md', 'pdf']).has(ext) && rawText.trim()) {
        const sections = parseMarkdownSections(rawText).slice(0, 24);
        sections.forEach((section, index) => {
          localReferenceChunks.push({
            id: makeId('AF_CHUNK_LOCAL', `${relPath}_${index}_${section.heading}`),
            name: section.heading || `${baseName} section ${index + 1}`,
            description: `Local markdown chunk from ${baseName}.`,
            sourceObjectRefId: refId,
            sourceDocument: baseName,
            sourceSection: section.heading || 'Document',
            semanticType: 'documentation_chunk',
            content: truncate(section.content || section.heading, 2400),
          });
        });
      }
    }

    const isExampleSource =
      relPath.includes(EXAMPLES_ROOT) &&
      new Set(['js', 'xpt', 'hta', 'xml']).has(ext);
    if (!isExampleSource) continue;

    const header = parseComDok(rawText);
    const siblingFiles = fs
      .readdirSync(path.dirname(fullPath))
      .filter((name) => name !== fileName)
      .slice(0, 20)
      .join('; ');

    const exampleId = makeId('AF_EXAMPLE', relPath);
    implementationExamples.push({
      id: exampleId,
      name: fileName,
      description:
        header.description || `${inferExampleType(ext)} in ${implementationScope || moduleScope || collectionName}`,
      semanticType: 'implementation_example',
      exampleType: inferExampleType(ext),
      sourceArtifactRefId: artifactId,
      sourceCollection: collectionName,
      runtimeFamily,
      language: inferLanguage(ext),
      moduleScope,
      operationScope: implementationScope,
      optimaVersion: header.optimaVersion,
      author: header.author,
      launchHint: header.launchHint,
      interfaceList: header.interfaces.join('; '),
      companionArtifacts: siblingFiles,
      summary: truncate(
        [
          header.description,
          header.launchHint,
          moduleScope && `module=${moduleScope}`,
          implementationScope && `scope=${implementationScope}`,
          header.interfaces.length ? `interfaces=${header.interfaces.join(', ')}` : '',
        ]
          .filter(Boolean)
          .join(' | '),
        1200,
      ),
      codePreview: contentPreview,
    });

    for (const interfaceName of header.interfaces) {
      const key = interfaceName;
      const current = interfaces.get(key) || {
        id: makeId('AF_IFACE', interfaceName),
        name: interfaceName,
        description: 'COM interface referenced by local Optima additional-function example materials.',
        semanticType: 'com_interface',
        interfaceName,
        interfaceGroup: interfaceName.startsWith('I') ? 'interface' : 'component',
        sourceCollection: collectionName,
        sourceArtifactRefId: artifactId,
        exampleRefCount: 0,
        summary: '',
      };
      current.exampleRefCount += 1;
      current.summary = `Referenced by ${current.exampleRefCount} local example material(s).`;
      interfaces.set(key, current);
    }
  }

  return {
    fileArtifacts,
    implementationExamples,
    comInterfaces: [...interfaces.values()].sort((a, b) =>
      a.interfaceName.localeCompare(b.interfaceName),
    ),
    referenceDocuments,
    localReferenceChunks,
  };
}

function loadManualExportDefinitions() {
  const fileArtifacts = [];
  const implementationExamples = [];
  const referenceDocuments = [];
  const localReferenceChunks = [];

  const exportPath = path.join(MANUAL_EXPORT_ROOT, 'export_fd.xml');
  if (!fs.existsSync(exportPath)) {
    return { fileArtifacts, implementationExamples, referenceDocuments, localReferenceChunks };
  }

  const relPath = 'manual_exports/export_fd.xml';
  const artifactId = makeId('AF_FILE', relPath);
  const parsed = parseOptimaManualExport(exportPath);
  const comboSummary = [...parsed.comboCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([combo, count]) => `${combo.replaceAll('|', '/')}=${count}`)
    .join('; ');
  const kindSummary = [...parsed.definitionKindCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([kind, count]) => `${kind}=${count}`)
    .join('; ');

  fileArtifacts.push({
    id: artifactId,
    name: 'export_fd.xml',
    description: 'Manual Optima export of Additional Functions / print-layer definitions.',
    semanticType: 'file_artifact',
    relativePath: relPath,
    sourceOrigin: 'manual_optima_export',
    collectionName: 'manual_exports',
    artifactType: 'optima_manual_fd_export',
    fileExtension: 'xml',
    moduleScope: 'GENERAL_ERP',
    implementationScope: 'manual_export',
    runtimeFamily: 'mixed_export_definitions',
    fileSizeBytes: String(fs.statSync(exportPath).size),
    contentPreview: truncate(`Wydruk records=${parsed.records.length}; combos=${comboSummary}; kinds=${kindSummary}`, 2000),
  });

  referenceDocuments.push({
    id: 'AF_DOC_MANUAL_EXPORT_FD',
    name: 'Manual export - definicje funkcji dodatkowych',
    description: 'Direct Optima export of additional-function style definitions.',
    semanticType: 'reference_document',
    sourceUrl: 'downloads/google_drive/manual_exports/export_fd.xml',
    sourceType: 'manual_optima_export',
    documentCategory: 'manual_additional_function_export',
    versionHint: 'manual_export',
    articleUpdatedAt: '',
    relatedKnowledgeBase: 'ComarchOptimaAdditionalFunctions',
    summary: truncate(`Direct Optima export with ${parsed.records.length} records. Type families: ${comboSummary}. Definition kinds: ${kindSummary}.`, 1200),
  });

  const seenRecordKeys = new Set();
  const dedupedRecords = parsed.records.filter((record) => {
    const baseKey = `${record.setName}_${record.WDR_ID || ''}_${record.WDR_NAZWA || record.printNameAttr || ''}`;
    if (seenRecordKeys.has(baseKey)) return false;
    seenRecordKeys.add(baseKey);
    return true;
  });

  for (const record of dedupedRecords) {
    const baseKey = `${record.setName}_${record.WDR_ID || ''}_${record.WDR_NAZWA || record.printNameAttr || ''}`;
    const docId = makeId('AF_DOC_MANUAL_DEF', baseKey);
    const exampleId = makeId('AF_EXAMPLE_MANUAL', baseKey);
    const normalizedParams = normalizeWhitespace(record.WDR_PARAMETRY || '');
    const normalizedCondition = normalizeWhitespace(record.WDR_WARUNEK || '');
    const normalizedAutoCondition = normalizeWhitespace(record.WDR_WARUNEKAUTO || '');
    const readablePreview =
      record.definitionKind === 'compressed'
        ? '[COMPRESSED_DEFINITION]'
        : truncate(record.WDR_DEFINICJA || '', 2200);
    const moduleScope = inferManualModuleScope(record.setName, record.WDR_NAZWA || record.printNameAttr || '');
    const summary = truncate(
      [
        record.setName && `set=${record.setName}`,
        `rodzaj=${record.WDR_RODZAJ || ''}`,
        `typ=${record.WDR_TYP || ''}`,
        `podtyp=${record.WDR_PODTYP || ''}`,
        `definition=${record.definitionKind}`,
        normalizedParams ? 'hasParameters=1' : 'hasParameters=0',
        normalizedCondition || normalizedAutoCondition ? 'hasCondition=1' : 'hasCondition=0',
      ].join(' | '),
      1000,
    );

    referenceDocuments.push({
      id: docId,
      name: record.WDR_NAZWA || record.printNameAttr || `FD ${record.WDR_ID || ''}`,
      description: `Manual Optima export definition from set ${record.setName || ''}.`,
      semanticType: 'reference_document',
      sourceUrl: `downloads/google_drive/manual_exports/export_fd.xml#WDR_ID=${record.WDR_ID || ''}`,
      sourceType: 'manual_optima_export',
      documentCategory: 'manual_additional_function_definition',
      versionHint: 'manual_export',
      articleUpdatedAt: record.WDR_TS_MOD || record.WDR_TS_ZAL || '',
      relatedKnowledgeBase: 'ComarchOptimaAdditionalFunctions',
      summary,
    });

    implementationExamples.push({
      id: exampleId,
      name: record.WDR_NAZWA || record.printNameAttr || `FD ${record.WDR_ID || ''}`,
      description: `Manual Optima export definition from set ${record.setName || ''}.`,
      semanticType: 'implementation_example',
      exampleType: 'optima_manual_export_definition',
      sourceArtifactRefId: artifactId,
      sourceCollection: 'manual_exports',
      runtimeFamily: inferManualRuntimeFamily(record),
      language: record.language,
      moduleScope,
      operationScope: `rodzaj=${record.WDR_RODZAJ || ''}; typ=${record.WDR_TYP || ''}; podtyp=${record.WDR_PODTYP || ''}`,
      optimaVersion: '',
      author: record.WDR_AUTOR || '',
      launchHint: normalizedCondition || normalizedAutoCondition,
      interfaceList: '',
      companionArtifacts: '',
      summary,
      codePreview: readablePreview,
    });

    localReferenceChunks.push({
      id: makeId('AF_CHUNK_MANUAL_DEF', baseKey),
      name: `${record.WDR_NAZWA || record.printNameAttr || 'FD'} - definition`,
      description: `Manual export chunk for ${record.WDR_NAZWA || record.printNameAttr || ''}.`,
      sourceObjectRefId: docId,
      sourceDocument: record.WDR_NAZWA || record.printNameAttr || `FD ${record.WDR_ID || ''}`,
      sourceSection: 'Definition',
      semanticType: 'documentation_chunk',
      content: buildManualDefinitionContent(record),
    });
  }

  return {
    fileArtifacts,
    implementationExamples,
    referenceDocuments,
    localReferenceChunks,
  };
}

function loadDictionaryRows() {
  const configurationEntries = [];
  const procedureEntries = [];
  const messageEntries = [];

  const configurationPath = path.join(DRIVE_ROOT, 'Dictionaries_2026_4/configuration.csv');
  if (fs.existsSync(configurationPath)) {
    const rows = parseSemicolonDelimited(readMaybeText(configurationPath));
    for (const cols of rows.slice(1)) {
      const [keyName, label, configType] = cols.map((value) => normalizeWhitespace(value));
      if (!keyName) continue;
      configurationEntries.push({
        id: makeId('AF_CFG', `${keyName}_${label}`),
        name: keyName,
        description: label || 'Configuration dictionary entry',
        semanticType: 'configuration_catalog_entry',
        keyName,
        configType,
        label,
        sourceArtifactRefId: makeId('AF_FILE', 'Dictionaries_2026_4/configuration.csv'),
        summary: truncate(`${keyName}: ${label}${configType ? ` [${configType}]` : ''}`, 1000),
      });
    }
  }

  const proceduresPath = path.join(DRIVE_ROOT, 'Dictionaries_2026_4/Procedures.csv');
  if (fs.existsSync(proceduresPath)) {
    const rows = parseSemicolonDelimited(readMaybeText(proceduresPath));
    for (const cols of rows.slice(1)) {
      const [procedureId, procedureName] = cols.map((value) => normalizeWhitespace(value));
      if (!procedureId && !procedureName) continue;
      procedureEntries.push({
        id: makeId('AF_PROC_DICT', `${procedureId}_${procedureName}`),
        name: procedureName || procedureId,
        description: 'Procedure dictionary entry from local Optima dictionaries.',
        semanticType: 'procedure_dictionary_entry',
        procedureId,
        procedureName,
        sourceArtifactRefId: makeId('AF_FILE', 'Dictionaries_2026_4/Procedures.csv'),
        categoryHint: procedureName.includes('wydruk') ? 'prints_or_functions' : '',
        summary: truncate(`${procedureId} ${procedureName}`, 1000),
      });
    }
  }

  const messagesCsvPath = path.join(DRIVE_ROOT, 'Dictionaries_2026_4/messages.csv');
  const messagesXmlPath = path.join(DRIVE_ROOT, 'Komunikaty_Optimy_2025_3/Messages.xml');
  const xmlMap = fs.existsSync(messagesXmlPath)
    ? parseMessagesXml(readMaybeText(messagesXmlPath))
    : new Map();
  if (fs.existsSync(messagesCsvPath)) {
    const rows = parseSemicolonDelimited(readMaybeText(messagesCsvPath));
    for (const cols of rows.slice(1)) {
      const [messageId, constant, messageText] = cols.map((value) => normalizeWhitespace(value));
      if (!constant && !messageId) continue;
      const xmlAttrs =
        xmlMap.get(messageId) ||
        xmlMap.get(constant) ||
        {};
      messageEntries.push({
        id: makeId('AF_MSG', `${messageId}_${constant}`),
        name: constant || messageId,
        description: 'Optima message catalog entry from local dictionaries.',
        semanticType: 'message_catalog_entry',
        messageId,
        constant,
        messageType: xmlAttrs.Type || '',
        buttons: xmlAttrs.Buttons || '',
        projects: xmlAttrs.Projects || '',
        sourceArtifactRefId: makeId('AF_FILE', 'Dictionaries_2026_4/messages.csv'),
        messageText: truncate(messageText, 1500),
        summary: truncate(
          [messageId, constant, xmlAttrs.Type, messageText].filter(Boolean).join(' | '),
          1000,
        ),
      });
    }
  }

  return {
    configurationEntries,
    procedureEntries,
    messageEntries,
  };
}

function loadSchemaTableIndex() {
  const tablePath = path.join(ROOT, 'exports/optima_schema/v1/table.csv');
  const index = new Map();
  if (!fs.existsSync(tablePath)) return index;
  const rows = parseDelimited(fs.readFileSync(tablePath, 'utf8'), ',');
  const header = rows.shift() || [];
  for (const cols of rows) {
    const row = Object.fromEntries(header.map((name, idx) => [name, cols[idx] || '']));
    if (row.name && !index.has(row.name)) {
      index.set(row.name, row);
    }
  }
  return index;
}

const INTERFACE_TOUCHPOINT_MAP = {
  IKontrahent: ['Kontrahenci'],
  Kontrahenci: ['Kontrahenci'],
  ITowar: ['Towary'],
  IDefAtrybut: ['DefAtrybuty', 'TwrAtrybuty', 'KntAtrybuty'],
  IOperator: ['Operatorzy'],
  IKonto: ['Konta'],
  IDekret: ['DekretyNag', 'DekretyElem'],
  IOkres: ['OkresyObrach'],
  IDefinicjaDokumentu: ['DokDefinicje'],
  DefinicjeDokumentow: ['DokDefinicje'],
  Rachunki: ['BnkRachunki'],
  RaportyKB: ['BnkRaporty'],
  ZapisyKB: ['BnkZapisy'],
  IMagazyn: ['Magazyny'],
  IDokumentHaMag: ['TraNag', 'TraElem'],
  IElementHaMag: ['TraElem'],
  ISerwisHaMag: ['TraNag'],
  SerwisHaMag: ['TraNag'],
  IDokumentHaMagXml: ['TraNag', 'TraElem'],
  IVAT: ['VatNag', 'VatTab'],
  IEwidencjaDodatkowa: ['EwidDodNag', 'EwidDodElem'],
  IKwotaDodatkowa: ['EwidDodElem'],
  IKONTAKT: ['CRMKontakty'],
  IFormaPlatnosci: ['FormyPlatnosci'],
};

const EXAMPLE_TOUCHPOINT_MAP = [
  { match: 'Atrybuty.js', tables: ['DefAtrybuty', 'TwrAtrybuty', 'KntAtrybuty', 'Towary', 'Kontrahenci'], type: 'ATTRIBUTE_MODEL' },
  { match: 'DodajOperatora.js', tables: ['Operatorzy'], type: 'ADMIN_OPERATOR' },
  { match: 'DodajkontaAnalityczne.js', tables: ['Konta', 'OkresyObrach', 'DekretyKonta'], type: 'ACCOUNTING_ACCOUNT' },
  { match: 'Dekrety_KH', tables: ['DekretyNag', 'DekretyElem', 'Konta', 'OkresyObrach', 'Dzienniki', 'Kontrahenci'], type: 'ACCOUNTING_DECREE' },
  { match: 'DodawanieDokKP', tables: ['BnkZapisy', 'BnkRachunki', 'BnkRaporty', 'DokDefinicje', 'Kontrahenci'], type: 'BANK_CASH_IMPORT' },
  { match: 'DokMagazynowe', tables: ['TraNag', 'TraElem', 'Towary', 'Kontrahenci', 'Magazyny', 'DokDefinicje'], type: 'TRADE_DOCUMENT' },
  { match: 'DokMagImpExp', tables: ['TraNag', 'TraElem', 'DokDefinicje'], type: 'TRADE_XML_IO' },
  { match: 'OperacjeNaRVATiEwidDod', tables: ['VatNag', 'VatTab', 'EwidDodNag', 'EwidDodElem', 'Kontrahenci'], type: 'VAT_AND_ADDITIONAL_LEDGER' },
  { match: 'Kontrah_KontaktCRM.js', tables: ['Kontrahenci', 'CRMKontakty'], type: 'CRM_CONTACT' },
  { match: 'HaMagPA2FS', tables: ['TraNag', 'TraElem', 'DokDefinicje'], type: 'TRADE_DOCUMENT_TRANSFORM' },
  { match: 'HaMagFPF2RO', tables: ['TraNag', 'TraElem', 'DokDefinicje'], type: 'TRADE_DOCUMENT_TRANSFORM' },
  { match: 'KorektaIloscFA.js', tables: ['TraNag', 'TraElem', 'DokDefinicje'], type: 'TRADE_CORRECTION' },
  { match: 'KorektaVATFA.js', tables: ['TraNag', 'TraElem', 'DokDefinicje', 'VatNag', 'VatTab'], type: 'TRADE_VAT_CORRECTION' },
  { match: 'KorektaWartosciFA.js', tables: ['TraNag', 'TraElem', 'DokDefinicje'], type: 'TRADE_CORRECTION' },
  { match: 'Okno_Postepu_w_IE', tables: ['Kontrahenci'], type: 'UI_PROGRESS_SQL' },
];

function buildImplementationGuides() {
  return [
    {
      id: 'AF_GUIDE_TRADE_COM_DOCUMENTS',
      name: 'Trade document automation through COM objects',
      description: 'Use COM document objects when the function creates, corrects, or transforms trade and warehouse documents.',
      semanticType: 'implementation_guide',
      guideType: 'implementation_recipe',
      preferredMechanism: 'additional_function_or_wsh_com',
      runtimeFamily: 'wsh_com',
      moduleScope: 'HANDEL_MAGAZYN',
      triggerSuitability: 'manual; after_save',
      schemaKnowledgeBase: 'ComarchOptimaSchema',
      caution: 'Document automation typically touches headers, lines, document definitions, warehouse, and contractor context. Validate save-side effects carefully.',
      summary: 'Use COM document objects for HaMag and warehouse scenarios. Start from TraNag, TraElem, DokDefinicje, Towary, Kontrahenci, and Magazyny in ComarchOptimaSchema.',
    },
    {
      id: 'AF_GUIDE_BANK_CASH_IMPORT',
      name: 'Bank and cash import pattern',
      description: 'Use script-driven imports when the function creates cash or bank entries from an external payload.',
      semanticType: 'implementation_guide',
      guideType: 'implementation_recipe',
      preferredMechanism: 'additional_function_or_wsh_com',
      runtimeFamily: 'wsh_com',
      moduleScope: 'KASA_BANK',
      triggerSuitability: 'manual',
      schemaKnowledgeBase: 'ComarchOptimaSchema',
      caution: 'Resolve account, report, document definition, and contractor context before save.',
      summary: 'The reference schema surface is BnkZapisy, BnkRachunki, BnkRaporty, DokDefinicje, and Kontrahenci.',
    },
    {
      id: 'AF_GUIDE_ACCOUNTING_DECREE_IMPORT',
      name: 'Accounting decree import pattern',
      description: 'Use COM accounting objects for scripted decree creation and account resolution.',
      semanticType: 'implementation_guide',
      guideType: 'implementation_recipe',
      preferredMechanism: 'additional_function_or_wsh_com',
      runtimeFamily: 'wsh_com',
      moduleScope: 'KSIEGOWOSC_COMPLIANCE',
      triggerSuitability: 'manual',
      schemaKnowledgeBase: 'ComarchOptimaSchema',
      caution: 'This pattern depends on accounting period, journals, accounts, and partner resolution.',
      summary: 'Start from DekretyNag, DekretyElem, Konta, OkresyObrach, Dzienniki, and Kontrahenci when shaping SQL or object lookups.',
    },
    {
      id: 'AF_GUIDE_ATTRIBUTE_CUSTOMIZATION',
      name: 'Attribute and dictionary customization pattern',
      description: 'Use dedicated COM objects when the requirement is to manage attributes or supporting dictionaries.',
      semanticType: 'implementation_guide',
      guideType: 'implementation_recipe',
      preferredMechanism: 'additional_function_or_wsh_com',
      runtimeFamily: 'wsh_com',
      moduleScope: 'GENERAL_ERP',
      triggerSuitability: 'manual; startup',
      schemaKnowledgeBase: 'ComarchOptimaSchema',
      caution: 'Attribute models span definition tables and entity-specific attribute tables.',
      summary: 'The relevant schema entry points are DefAtrybuty, TwrAtrybuty, KntAtrybuty, Towary, and Kontrahenci.',
    },
    {
      id: 'AF_GUIDE_UI_WRAPPERS',
      name: 'UI helper shell pattern',
      description: 'Use HTA/IE style wrappers only when the function needs a lightweight progress or login shell around an Optima script.',
      semanticType: 'implementation_guide',
      guideType: 'ui_pattern',
      preferredMechanism: 'wsh_shell_wrapper',
      runtimeFamily: 'wsh_hta',
      moduleScope: 'GENERAL_ERP',
      triggerSuitability: 'manual',
      schemaKnowledgeBase: 'ComarchOptimaSchema',
      caution: 'Keep UI shells thin. Business logic should stay in reusable scripts or SQL objects, not in the window wrapper.',
      summary: 'Examples such as IE progress and HTA login wrappers are useful for operator experience, but they are not a substitute for domain logic design.',
    },
    {
      id: 'AF_GUIDE_XML_IO',
      name: 'XML import/export wrapper pattern',
      description: 'Use XML-oriented examples when the function exchanges document payloads instead of editing rows directly.',
      semanticType: 'implementation_guide',
      guideType: 'integration_pattern',
      preferredMechanism: 'additional_function_or_batch_integration',
      runtimeFamily: 'xml_payload',
      moduleScope: 'HANDEL_MAGAZYN',
      triggerSuitability: 'manual; after_save',
      schemaKnowledgeBase: 'ComarchOptimaSchema',
      caution: 'Even when the runtime works through XML interfaces, downstream validation still lands in trade-document schema areas.',
      summary: 'The schema anchors stay in TraNag, TraElem, and DokDefinicje even if the transport is XML-oriented.',
    },
    {
      id: 'AF_GUIDE_MECHANISM_CHOICE',
      name: 'Mechanism choice: function vs user column vs SQL object',
      description: 'Pick the lightest mechanism that matches the use case.',
      semanticType: 'implementation_guide',
      guideType: 'decision_guide',
      preferredMechanism: 'depends_on_use_case',
      runtimeFamily: 'mixed',
      moduleScope: 'GENERAL_ERP',
      triggerSuitability: 'manual; startup; before_save; after_save',
      schemaKnowledgeBase: 'ComarchOptimaSchema',
      caution: 'Use user columns for list augmentation, additional functions for UI-contextual actions, and SQL objects when the heavy logic already lives in the database.',
      summary: 'If the need is only a list column or SQL expression, prefer user columns. If the need is an action in context, prefer additional functions. If the behavior already exists in procedures/functions, reuse ComarchOptimaSchema object guides first.',
    },
  ];
}

function addTouchpoint(target, seen, example, tableRow, touchpointType, confidence, evidence, note) {
  if (!tableRow) return;
  const key = [example.id, tableRow.id, touchpointType].join('|');
  if (seen.has(key)) return;
  seen.add(key);
  target.push({
    id: makeId('AF_TOUCH', key),
    name: `${example.name} -> ${tableRow.name}`,
    description: `Schema touchpoint inferred for ${example.name} against ${tableRow.sqlName || tableRow.name}.`,
    semanticType: 'schema_touchpoint',
    sourceExampleRefId: example.id,
    sourceArtifactRefId: example.sourceArtifactRefId,
    schemaObjectRefId: tableRow.id,
    schemaObjectName: tableRow.sqlName || tableRow.name,
    schemaObjectKind: tableRow.objectKind || 'TABLE',
    touchpointType,
    confidence,
    evidence,
    schemaKnowledgeBase: 'ComarchOptimaSchema',
    queryDesignNote: note,
  });
}

function buildSchemaTouchpoints(corpus, tableIndex) {
  const touchpoints = [];
  const seen = new Set();
  for (const example of corpus.implementationExamples) {
    const interfaces = String(example.interfaceList || '')
      .split(';')
      .map((value) => value.trim())
      .filter(Boolean);
    for (const iface of interfaces) {
      for (const tableName of INTERFACE_TOUCHPOINT_MAP[iface] || []) {
        addTouchpoint(
          touchpoints,
          seen,
          example,
          tableIndex.get(tableName),
          'INTERFACE_SIGNAL',
          'HIGH',
          `Interface ${iface} declared in COM_DOK header.`,
          `Use ${tableName} as an initial anchor when translating the example into SQL or schema exploration.`,
        );
      }
    }
    const matchContext = `${example.name} ${example.moduleScope} ${example.operationScope}`;
    for (const rule of EXAMPLE_TOUCHPOINT_MAP) {
      if (!matchContext.includes(rule.match)) continue;
      for (const tableName of rule.tables) {
        addTouchpoint(
          touchpoints,
          seen,
          example,
          tableIndex.get(tableName),
          rule.type,
          'MEDIUM',
          `Filename/module heuristic matched "${rule.match}".`,
          `Heuristic touchpoint for implementation family ${rule.type}. Confirm exact join path in ComarchOptimaSchema before writing production SQL.`,
        );
      }
    }
  }
  return touchpoints;
}

function buildModuleRecipes(corpus) {
  const exampleByName = new Map(
    corpus.implementationExamples.map((example) => [example.name, example]),
  );
  const refList = (names) =>
    names
      .map((name) => exampleByName.get(name)?.id)
      .filter(Boolean)
      .join('; ');
  return [
    {
      id: 'AF_RECIPE_HANDEL_DOKUMENTY',
      name: 'Handel i magazyn: tworzenie lub korekta dokumentów',
      description: 'Recipe for trade and warehouse document automation through COM examples.',
      semanticType: 'module_recipe',
      moduleName: 'HANDEL_MAGAZYN',
      scenarioType: 'document_creation_and_correction',
      preferredMechanism: 'additional_function_or_wsh_com',
      triggerSuitability: 'manual; after_save',
      sourceExampleRefs: refList(['BO.js', 'FA_sprzedarzy.js', 'FZ.js', 'PZ.js', 'WZ.js', 'WZ_z_FA.js']),
      anchorSchemaObjects: 'CDN.TraNag; CDN.TraElem; CDN.DokDefinicje; CDN.Towary; CDN.Kontrahenci; CDN.Magazyny',
      joinHint: 'Start from TraNag -> TraElem, then attach Towary, DokDefinicje, Kontrahenci, and Magazyny according to the example context.',
      sqlObjectHint: 'Use ComarchOptimaSchema table guides for TraNag, TraElem, Towary, DokDefinicje, and curated join routes for trade documents.',
      schemaKnowledgeBase: 'ComarchOptimaSchema',
      caution: 'Document automation can create side effects on save and numbering. Validate buffer behavior, definition selection, and stock context before production rollout.',
      summary: 'Primary recipe for HaMag work. Treat TraNag and TraElem as the center, then expand into product, contractor, warehouse, and document-definition lookups.',
    },
    {
      id: 'AF_RECIPE_BANK_CASH_IMPORT',
      name: 'Kasa i bank: import zapisów oraz praca na raportach',
      description: 'Recipe for creating cash and bank entries from external payloads.',
      semanticType: 'module_recipe',
      moduleName: 'KASA_BANK',
      scenarioType: 'register_import',
      preferredMechanism: 'additional_function_or_wsh_com',
      triggerSuitability: 'manual',
      sourceExampleRefs: refList(['ImportZapisyK_B.js']),
      anchorSchemaObjects: 'CDN.BnkZapisy; CDN.BnkRachunki; CDN.BnkRaporty; CDN.DokDefinicje; CDN.Kontrahenci',
      joinHint: 'Resolve account and report first, then join document definition and contractor context for each bank or cash entry.',
      sqlObjectHint: 'Use ComarchOptimaSchema bank-cash guides and object dependencies around BnkZapisy, BnkRachunki, BnkRaporty, and DokDefinicje.',
      schemaKnowledgeBase: 'ComarchOptimaSchema',
      caution: 'Do not assume textual identifiers are unique across contexts. Confirm report numbering, account acronyms, and document-definition symbols in the target environment.',
      summary: 'Recipe for KP and similar import flows. Anchor on BnkZapisy with supporting account, report, document-definition, and contractor lookups.',
    },
    {
      id: 'AF_RECIPE_KSIEGOWOSC_DEKRETY',
      name: 'Księgowość: import dekretów i kont analitycznych',
      description: 'Recipe for accounting decree creation and account manipulation.',
      semanticType: 'module_recipe',
      moduleName: 'KSIEGOWOSC_COMPLIANCE',
      scenarioType: 'decree_and_accounting_setup',
      preferredMechanism: 'additional_function_or_wsh_com',
      triggerSuitability: 'manual',
      sourceExampleRefs: refList(['DEKRET.js', 'DEKRET_forma_platnosci_Przelew.js', 'DodajkontaAnalityczne.js']),
      anchorSchemaObjects: 'CDN.DekretyNag; CDN.DekretyElem; CDN.Konta; CDN.OkresyObrach; CDN.Dzienniki; CDN.Kontrahenci',
      joinHint: 'Start with period and account context, then decree header and lines. Add contractor or payment-form context only when the example requires it.',
      sqlObjectHint: 'Cross-check with ComarchOptimaSchema SQL guides such as CDN.DodajKontoAnl and other accounting procedures before inventing new SQL paths.',
      schemaKnowledgeBase: 'ComarchOptimaSchema',
      caution: 'Accounting flows are sensitive to period state, journal context, and numbering rules. Validate open period and account existence before write operations.',
      summary: 'Primary recipe for scripted accounting operations. Use Konta and OkresyObrach as hard prerequisites, then attach decree structures and business-party context.',
    },
    {
      id: 'AF_RECIPE_VAT_EWIDENCJA',
      name: 'VAT i ewidencja dodatkowa',
      description: 'Recipe for VAT-related and additional-ledger scripts.',
      semanticType: 'module_recipe',
      moduleName: 'KSIEGOWOSC_COMPLIANCE',
      scenarioType: 'vat_and_auxiliary_ledger',
      preferredMechanism: 'additional_function_or_wsh_com',
      triggerSuitability: 'manual; after_save',
      sourceExampleRefs: refList(['EwidDodatk.js', 'Kopia RejestrVat.js', 'RejestrVat.js']),
      anchorSchemaObjects: 'CDN.VatNag; CDN.VatTab; CDN.EwidDodNag; CDN.EwidDodElem; CDN.Kontrahenci',
      joinHint: 'Use VatNag -> VatTab for VAT structures and EwidDodNag -> EwidDodElem for additional-ledger structures. Attach contractor context only where the example proves it.',
      sqlObjectHint: 'Use ComarchOptimaSchema compliance/accounting table guides and join routes around VAT header/lines before adding custom SQL filters.',
      schemaKnowledgeBase: 'ComarchOptimaSchema',
      caution: 'VAT and auxiliary-ledger work can affect reporting correctness. Confirm declaration period, partner classification, and correction semantics before production use.',
      summary: 'Recipe for VAT and auxiliary-ledger examples, anchored on the standard VAT and ewidencja tables from ComarchOptimaSchema.',
    },
    {
      id: 'AF_RECIPE_ATRYBUTY_SLOWNIKI',
      name: 'Atrybuty i słowniki',
      description: 'Recipe for attribute-definition and dictionary-style customizations.',
      semanticType: 'module_recipe',
      moduleName: 'GENERAL_ERP',
      scenarioType: 'attribute_and_dictionary_customization',
      preferredMechanism: 'additional_function_or_wsh_com',
      triggerSuitability: 'manual; startup',
      sourceExampleRefs: refList(['Atrybuty.js']),
      anchorSchemaObjects: 'CDN.DefAtrybuty; CDN.TwrAtrybuty; CDN.KntAtrybuty; CDN.Towary; CDN.Kontrahenci',
      joinHint: 'Begin with DefAtrybuty, then attach the entity-specific attribute tables depending on whether the target is a product or contractor.',
      sqlObjectHint: 'Use ComarchOptimaSchema table guides for DefAtrybuty, TwrAtrybuty, and KntAtrybuty when shaping diagnostics or migration SQL.',
      schemaKnowledgeBase: 'ComarchOptimaSchema',
      caution: 'Attribute definitions and assignments are easy to scatter across entities. Separate dictionary setup from entity-level assignment logic.',
      summary: 'Recipe for metadata-style extensions. Anchor first on attribute definitions and then on the specific assignment tables for products or contractors.',
    },
    {
      id: 'AF_RECIPE_CRM_KONTAKTY',
      name: 'CRM i kontakty kontrahenta',
      description: 'Recipe for contractor-contact and CRM style examples.',
      semanticType: 'module_recipe',
      moduleName: 'CRM',
      scenarioType: 'contractor_contact_management',
      preferredMechanism: 'additional_function_or_wsh_com',
      triggerSuitability: 'manual',
      sourceExampleRefs: refList(['Kontrah_KontaktCRM.js']),
      anchorSchemaObjects: 'CDN.Kontrahenci; CDN.CRMKontakty',
      joinHint: 'Use Kontrahenci as the master anchor and attach CRMKontakty or related CRM structures only for the selected contractor context.',
      sqlObjectHint: 'Look for CRM-related object guides and contractor touchpoints in ComarchOptimaSchema before composing custom contact queries.',
      schemaKnowledgeBase: 'ComarchOptimaSchema',
      caution: 'CRM examples are often narrower than full contractor flows. Do not overgeneralize them into trade-document recipes.',
      summary: 'Small but useful recipe for CRM-contact work around contractors, using Kontrahenci as the main entry point.',
    },
    {
      id: 'AF_RECIPE_ADMIN_OPERATORZY',
      name: 'Administracja operatorami i shell wrappers',
      description: 'Recipe for operator-level scripts and thin helper shells.',
      semanticType: 'module_recipe',
      moduleName: 'ADMINISTRATION',
      scenarioType: 'operator_and_shell_support',
      preferredMechanism: 'wsh_com_or_wsh_shell_wrapper',
      triggerSuitability: 'manual',
      sourceExampleRefs: refList(['DodajOperatora.js', 'Logowanie.hta', 'ie.XPT']),
      anchorSchemaObjects: 'CDN.Operatorzy; CDN.Kontrahenci',
      joinHint: 'For operator-management scripts use Operatorzy as the primary anchor. For shell wrappers keep the schema surface minimal and isolate business queries.',
      sqlObjectHint: 'Use schema lookups only where the shell or operator script actually crosses into business objects; otherwise keep wrappers UI-only.',
      schemaKnowledgeBase: 'ComarchOptimaSchema',
      caution: 'Do not bury domain logic in HTA or IE wrappers. Keep wrappers thin and let reusable scripts or SQL objects carry the business behavior.',
      summary: 'Recipe for operator admin and helper windows. Treat shells as presentation glue, not as the main implementation layer.',
    },
  ];
}

ensureDir(EXPORT_DIR);

const referenceDocuments = [
  {
    id: 'AF_DOC_MAIN',
    name: 'Funkcje dodatkowe',
    description: 'Official Comarch ERP Optima article about additional functions.',
    semanticType: 'reference_document',
    sourceUrl: 'https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/funkcje-dodatkowe/',
    sourceType: 'official_help_article',
    documentCategory: 'additional_functions',
    versionHint: '2026',
    articleUpdatedAt: '2019-04-11',
    relatedKnowledgeBase: 'ComarchOptimaAdditionalFunctions',
    summary: 'Official reference describing additional functions, entry points, configuration options, execution modes, and implementation cautions.',
  },
  {
    id: 'AF_DOC_USER_COLUMNS',
    name: 'OPT074 Dodawanie kolumn użytkownika na listach',
    description: 'Supporting Comarch ERP Optima article about user-defined columns and SQL personalization.',
    semanticType: 'reference_document',
    sourceUrl: 'https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/opt074-dodawanie-kolumn-uzytkownika-na-listach/',
    sourceType: 'official_help_article',
    documentCategory: 'supporting_sql_customization',
    versionHint: '2026',
    articleUpdatedAt: '2025-02-24',
    relatedKnowledgeBase: 'ComarchOptimaAdditionalFunctions',
    summary: 'Supporting reference for SQL joins, expressions, dynamic variables, and performance implications on Optima lists.',
  },
];

const capabilities = [
  {
    id: 'AF_CAP_CONTEXTUAL_PRINT_WINDOWS',
    name: 'Contextual availability on print-enabled windows',
    description: 'Additional functions are available on windows where printing is available.',
    semanticType: 'additional_function_capability',
    capabilityType: 'availability',
    sourceDocumentRefId: 'AF_DOC_MAIN',
    defaultTrigger: 'contextual_window',
    relatedFeature: 'PrintingMechanism',
    evidence: 'Official help article states that additional functions are contextually available wherever the printing mechanism is available.',
    summary: 'Availability is tied to UI context. The function set may differ per window and even per tab.',
  },
  {
    id: 'AF_CAP_SHARED_PRINT_MECHANISM',
    name: 'Shared mechanism with prints',
    description: 'Additional functions are built on the same mechanism as prints.',
    semanticType: 'additional_function_capability',
    capabilityType: 'architecture',
    sourceDocumentRefId: 'AF_DOC_MAIN',
    defaultTrigger: 'shared_engine',
    relatedFeature: 'PrintingMechanism',
    evidence: 'Official help article explicitly says additional functions are built on the same mechanism as prints.',
    summary: 'This is the core implementation clue. Print-oriented configuration patterns are directly relevant when analyzing or extending additional functions.',
  },
  {
    id: 'AF_CAP_SYSTEM_VS_USER',
    name: 'System versus user functions',
    description: 'Additional functions are divided into system functions and user functions.',
    semanticType: 'additional_function_capability',
    capabilityType: 'classification',
    sourceDocumentRefId: 'AF_DOC_MAIN',
    defaultTrigger: 'configuration_catalog',
    relatedFeature: 'FunctionCatalog',
    evidence: 'The official article distinguishes immutable system functions from user-modifiable functions.',
    summary: 'System functions are vendor-provided and non-editable. User functions are visually distinguished and can be modified.',
  },
  {
    id: 'AF_CAP_AUTOMATIC_EXECUTION',
    name: 'Automatic execution support',
    description: 'Additional functions may execute automatically in predefined lifecycle moments.',
    semanticType: 'additional_function_capability',
    capabilityType: 'execution',
    sourceDocumentRefId: 'AF_DOC_MAIN',
    defaultTrigger: 'automatic_mode',
    relatedFeature: 'ExecutionLifecycle',
    evidence: 'The official article lists startup, before-save, and after-save execution modes.',
    summary: 'Automatic execution is part of the platform model and should be treated as lifecycle logic, not only as a manual action.',
  },
];

const entryPoints = [
  {
    id: 'AF_ENTRY_RIBBON_DEFAULT',
    name: 'Ribbon default action',
    description: 'The ribbon button launches the default additional function.',
    semanticType: 'additional_function_entry_point',
    entryPointType: 'manual',
    uiLocation: 'Ribbon button',
    shortcut: 'F11',
    behavior: 'Runs the function marked as default for the current context.',
    sourceDocumentRefId: 'AF_DOC_MAIN',
    summary: 'Primary manual launch path for end users. Context decides which default function is executed.',
  },
  {
    id: 'AF_ENTRY_RIBBON_MENU',
    name: 'Ribbon dropdown menu',
    description: 'The ribbon dropdown exposes all additional functions available in the current context.',
    semanticType: 'additional_function_entry_point',
    entryPointType: 'manual_menu',
    uiLocation: 'Ribbon dropdown',
    shortcut: '',
    behavior: 'Expands the context-dependent list of available additional functions.',
    sourceDocumentRefId: 'AF_DOC_MAIN',
    summary: 'The available menu may vary by window and by tab, so selection logic is context-sensitive.',
  },
  {
    id: 'AF_ENTRY_CONFIGURATION_WINDOW',
    name: 'Additional function configuration window',
    description: 'Configuration window for additional functions.',
    semanticType: 'additional_function_entry_point',
    entryPointType: 'configuration',
    uiLocation: 'Configuration window',
    shortcut: 'Ctrl+F11',
    behavior: 'Opens the catalog and configuration view for functions available from the current procedure.',
    sourceDocumentRefId: 'AF_DOC_MAIN',
    summary: 'This is the main administrative entry point for understanding function scope, visibility, and classification.',
  },
];

const executionModes = [
  {
    id: 'AF_MODE_STARTUP',
    name: 'Na starcie',
    description: 'Automatic execution before opening the form.',
    semanticType: 'additional_function_execution_mode',
    modeCode: 'startup',
    lifecyclePhase: 'before_form_open',
    intendedUse: 'Pre-fill or initialize values before the form is shown.',
    caution: 'Keep it focused on initialization logic.',
    sourceDocumentRefId: 'AF_DOC_MAIN',
    example: 'Default NIP prefix initialization for a country-specific contractor form.',
  },
  {
    id: 'AF_MODE_BEFORE_SAVE',
    name: 'Przed zapisem',
    description: 'Automatic execution before saving entered data.',
    semanticType: 'additional_function_execution_mode',
    modeCode: 'before_save',
    lifecyclePhase: 'pre_persist_validation',
    intendedUse: 'Validate whether entered data is correct before persistence.',
    caution: 'Do not use it to trigger document save from inside the function.',
    sourceDocumentRefId: 'AF_DOC_MAIN',
    example: 'Data completeness and correctness checks before the document save path continues.',
  },
  {
    id: 'AF_MODE_AFTER_SAVE',
    name: 'Po zapisie',
    description: 'Automatic execution after saving entered data.',
    semanticType: 'additional_function_execution_mode',
    modeCode: 'after_save',
    lifecyclePhase: 'post_persist_followup',
    intendedUse: 'Run follow-up actions that require saved data.',
    caution: 'Treat it as downstream process logic, not data-entry validation.',
    sourceDocumentRefId: 'AF_DOC_MAIN',
    example: 'After hiring, notify a supervisor about subsequent required actions.',
  },
];

const configurationOptions = [
  {
    id: 'AF_OPTION_SHOW_ONLY_FILLED',
    name: 'Pokazuj tylko wypełnione',
    description: 'Shows only branches with defined sets.',
    semanticType: 'additional_function_configuration_option',
    optionName: 'Pokazuj tylko wypełnione',
    effect: 'Filters the tree to branches that have defined sets.',
    scope: 'configuration_window',
    defaultState: 'user_toggle',
    sourceDocumentRefId: 'AF_DOC_MAIN',
    summary: 'Useful for reducing noise when browsing large configuration trees.',
  },
  {
    id: 'AF_OPTION_LIMIT_CURRENT_PROCEDURE',
    name: 'Ograniczaj do bieżącej procedury',
    description: 'Limits configuration to the current procedure context.',
    semanticType: 'additional_function_configuration_option',
    optionName: 'Ograniczaj do bieżącej procedury',
    effect: 'Shows functions that can be launched from the current place in the program.',
    scope: 'configuration_window',
    defaultState: 'enabled_on_open',
    sourceDocumentRefId: 'AF_DOC_MAIN',
    summary: 'This is the key rule for contextual scope. Procedure means the exact place from which the configuration window was opened.',
  },
  {
    id: 'AF_OPTION_SHOW_ONLY_USER_DEFINED',
    name: 'Pokazuj tylko wydruki użytkownika',
    description: 'Shows only user-defined items in the additional-functions configuration.',
    semanticType: 'additional_function_configuration_option',
    optionName: 'Pokazuj tylko wydruki użytkownika',
    effect: 'Filters visible items to user-defined functions.',
    scope: 'configuration_window',
    defaultState: 'user_toggle',
    sourceDocumentRefId: 'AF_DOC_MAIN',
    summary: 'Despite the label inherited from print terminology, in this context it narrows the list to user-created functions.',
  },
];

const rules = [
  {
    id: 'AF_RULE_NO_SAVE_IN_AUTO_FUNCTION',
    name: 'Do not save a document from an automatic function',
    description: 'Automatic functions should not trigger document save.',
    semanticType: 'additional_function_rule',
    ruleType: 'safety',
    severity: 'high',
    sourceDocumentRefId: 'AF_DOC_MAIN',
    rationale: 'Saving from inside automatic lifecycle logic can recurse into the persistence path or create unsafe side effects.',
    statement: 'An automatic additional function must not launch document save.',
  },
  {
    id: 'AF_RULE_PARTNER_IMPLEMENTATION',
    name: 'Use an authorized partner for implementation work',
    description: 'Comarch recommends using an authorized partner for creating additional functions.',
    semanticType: 'additional_function_rule',
    ruleType: 'delivery_guidance',
    severity: 'medium',
    sourceDocumentRefId: 'AF_DOC_MAIN',
    rationale: 'Additional functions sit in implementation-sensitive areas of the product and are often deployment-specific.',
    statement: 'Creation work should be handled with partner-level implementation discipline.',
  },
];

const patterns = [
  {
    id: 'AF_PATTERN_PREFILL',
    name: 'Prefill before form entry',
    description: 'Set values before opening the form.',
    semanticType: 'additional_function_pattern',
    patternType: 'startup',
    sourceDocumentRefId: 'AF_DOC_MAIN',
    relatedFeatureRefId: 'AF_FEATURE_PRINTING_MECHANISM',
    relatedKnowledgeBase: 'ComarchOptimaSchema',
    summary: 'Use startup mode to prefill or normalize default values before the operator starts data entry.',
    example: 'Initialize a default country-specific tax identifier prefix on a contractor form.',
  },
  {
    id: 'AF_PATTERN_VALIDATE_BEFORE_SAVE',
    name: 'Validate before persistence',
    description: 'Perform checks before the standard save path continues.',
    semanticType: 'additional_function_pattern',
    patternType: 'before_save',
    sourceDocumentRefId: 'AF_DOC_MAIN',
    relatedFeatureRefId: 'AF_FEATURE_SCHEMA_KB',
    relatedKnowledgeBase: 'ComarchOptimaSchema',
    summary: 'Use before-save mode for validation and guard clauses, not for launching additional persistence operations.',
    example: 'Check required field consistency before the document is committed.',
  },
  {
    id: 'AF_PATTERN_POST_SAVE_FOLLOWUP',
    name: 'Post-save follow-up',
    description: 'Run downstream logic after the object has been persisted.',
    semanticType: 'additional_function_pattern',
    patternType: 'after_save',
    sourceDocumentRefId: 'AF_DOC_MAIN',
    relatedFeatureRefId: 'AF_FEATURE_SCHEMA_KB',
    relatedKnowledgeBase: 'ComarchOptimaSchema',
    summary: 'Use after-save mode for follow-up processes that require a saved record and stable identifiers.',
    example: 'Notify a supervisor or trigger a downstream operational step after record creation.',
  },
  {
    id: 'AF_PATTERN_SQL_AUGMENTATION',
    name: 'Adjacent SQL augmentation through user columns',
    description: 'Use user-column personalization when a requirement is better served by list SQL extension than by an additional function.',
    semanticType: 'additional_function_pattern',
    patternType: 'supporting_sql_customization',
    sourceDocumentRefId: 'AF_DOC_USER_COLUMNS',
    relatedFeatureRefId: 'AF_FEATURE_USER_COLUMNS',
    relatedKnowledgeBase: 'ComarchOptimaSchema',
    summary: 'User columns are a neighboring mechanism for SQL-level UI augmentation, including joins, expressions, dynamic variables, and test execution.',
    example: 'Add a derived document-list column through list personalization instead of implementing a full additional function.',
  },
];

const relatedFeatures = [
  {
    id: 'AF_FEATURE_PRINTING_MECHANISM',
    name: 'Printing mechanism',
    description: 'Underlying mechanism reused by additional functions.',
    semanticType: 'related_feature',
    featureType: 'platform_mechanism',
    accessPath: 'Print-enabled windows and print configuration conventions',
    sourceDocumentRefId: 'AF_DOC_MAIN',
    relatedKnowledgeBase: 'ComarchOptimaAdditionalFunctions',
    summary: 'Additional functions inherit their context model and part of their configuration behavior from the print mechanism.',
  },
  {
    id: 'AF_FEATURE_USER_COLUMNS',
    name: 'User columns and list personalization',
    description: 'Adjacent SQL customization mechanism in Optima.',
    semanticType: 'related_feature',
    featureType: 'sql_customization',
    accessPath: 'Shift+F9 personalization window',
    sourceDocumentRefId: 'AF_DOC_USER_COLUMNS',
    relatedKnowledgeBase: 'ComarchOptimaSchema',
    summary: 'Supports joins, expressions, dynamic variables, and testing for custom list columns, including joins to the configuration database.',
  },
  {
    id: 'AF_FEATURE_SCHEMA_KB',
    name: 'ComarchOptimaSchema',
    description: 'Structural KB used to analyze tables, SQL objects, and join paths when implementing additional functions.',
    semanticType: 'related_feature',
    featureType: 'supporting_knowledge_base',
    accessPath: 'OpenSPG KB ComarchOptimaSchema',
    sourceDocumentRefId: 'AF_DOC_MAIN',
    relatedKnowledgeBase: 'ComarchOptimaSchema',
    summary: 'Use the schema KB when an additional function requires table lookup, SQL design, or object dependency analysis.',
  },
];

const chunks = [
  {
    id: 'AF_CHUNK_MAIN_SCOPE',
    name: 'Additional functions scope',
    description: 'Core definition of what additional functions are.',
    sourceObjectRefId: 'AF_DOC_MAIN',
    sourceDocument: 'Funkcje dodatkowe',
    sourceSection: 'Scope',
    semanticType: 'documentation_chunk',
    content: 'Additional functions extend standard Comarch ERP Optima behavior with extra functions implementing specific processes. They are built on the same mechanism as prints, are contextually available on windows where printing exists, and are divided into system functions and user functions.',
  },
  {
    id: 'AF_CHUNK_MAIN_ENTRYPOINTS',
    name: 'Additional functions entry points',
    description: 'How users launch additional functions.',
    sourceObjectRefId: 'AF_DOC_MAIN',
    sourceDocument: 'Funkcje dodatkowe',
    sourceSection: 'Entry points',
    semanticType: 'documentation_chunk',
    content: 'Users launch the default additional function from the ribbon button or with F11. The same control also exposes a dropdown menu of functions available in the current context. Ctrl+F11 opens the additional-function configuration window.',
  },
  {
    id: 'AF_CHUNK_MAIN_OPTIONS',
    name: 'Additional functions configuration options',
    description: 'Configuration window options.',
    sourceObjectRefId: 'AF_DOC_MAIN',
    sourceDocument: 'Funkcje dodatkowe',
    sourceSection: 'Configuration options',
    semanticType: 'documentation_chunk',
    content: 'The configuration window exposes three important filters: show only populated branches, limit to the current procedure, and show only user-defined items. The current procedure means the exact place in the program from which configuration was opened.',
  },
  {
    id: 'AF_CHUNK_MAIN_EXECUTION',
    name: 'Additional functions automatic execution',
    description: 'Automatic execution lifecycle.',
    sourceObjectRefId: 'AF_DOC_MAIN',
    sourceDocument: 'Funkcje dodatkowe',
    sourceSection: 'Automatic execution',
    semanticType: 'documentation_chunk',
    content: 'Automatic execution supports startup, before-save, and after-save modes. Startup is for presetting values before form open, before-save is for validation, and after-save is for follow-up operations. Automatic functions should not trigger document save.',
  },
  {
    id: 'AF_CHUNK_USER_COLUMNS_SQL',
    name: 'User columns SQL capabilities',
    description: 'SQL augmentation support from user columns.',
    sourceObjectRefId: 'AF_DOC_USER_COLUMNS',
    sourceDocument: 'OPT074 Dodawanie kolumn użytkownika na listach',
    sourceSection: 'SQL capabilities',
    semanticType: 'documentation_chunk',
    content: 'User columns allow adding joins to further database tables, including configuration-database tables, and defining expressions for new list columns. The mechanism supports testing the resulting SQL query.',
  },
  {
    id: 'AF_CHUNK_USER_COLUMNS_PERFORMANCE',
    name: 'User columns performance caveat',
    description: 'Performance implications of list personalization.',
    sourceObjectRefId: 'AF_DOC_USER_COLUMNS',
    sourceDocument: 'OPT074 Dodawanie kolumn użytkownika na listach',
    sourceSection: 'Performance',
    semanticType: 'documentation_chunk',
    content: 'Additional joins and visible derived columns can significantly reduce list performance. A definition alone may be harmless while hidden, but a visible column or a filter that depends on a left join will slow data retrieval.',
  },
];

(async () => {
const corpus = await scanLocalCorpus();
const manualExports = loadManualExportDefinitions();
const dictionaries = loadDictionaryRows();
const schemaTableIndex = loadSchemaTableIndex();
const implementationGuides = buildImplementationGuides();
const mergedCorpus = {
  fileArtifacts: [...corpus.fileArtifacts, ...manualExports.fileArtifacts],
  implementationExamples: [...corpus.implementationExamples, ...manualExports.implementationExamples],
  comInterfaces: corpus.comInterfaces,
  referenceDocuments: [...corpus.referenceDocuments, ...manualExports.referenceDocuments],
  localReferenceChunks: [...corpus.localReferenceChunks, ...manualExports.localReferenceChunks],
};
const schemaTouchpoints = buildSchemaTouchpoints(mergedCorpus, schemaTableIndex);
const moduleRecipes = buildModuleRecipes(mergedCorpus);
const promotedKnowledge = loadPromotedKnowledge('ComarchOptimaAdditionalFunctions');
const promotedReferenceDocuments = promotedKnowledge.map((draft) => ({
  id: makeId('AF_DOC_PROMOTED', draft.id),
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
const promotedChunks = promotedKnowledge.flatMap((draft) => {
  const documentId = makeId('AF_DOC_PROMOTED', draft.id);
  return parseMarkdownSections(`# ${draft.title}\n\n${draft.content}`).map((section, index) => ({
    id: makeId('AF_CHUNK_PROMOTED', `${draft.id}_${index + 1}`),
    name: `${draft.title} - ${section.heading}`,
    description: `Promoted knowledge inbox chunk for ${draft.title}.`,
    sourceObjectRefId: documentId,
    sourceDocument: draft.title,
    sourceSection: section.heading,
    semanticType: 'documentation_chunk',
    content: truncate(section.content || draft.content, 3800),
  }));
});
const mergedReferenceDocuments = dedupeById([...referenceDocuments, ...mergedCorpus.referenceDocuments, ...promotedReferenceDocuments]);
const mergedChunks = [...chunks, ...mergedCorpus.localReferenceChunks, ...promotedChunks];

const files = [];

files.push(
  writeCsv(EXPORT_DIR, 
    'reference_document.csv',
    ['id', 'name', 'description', 'semanticType', 'sourceUrl', 'sourceType', 'documentCategory', 'versionHint', 'articleUpdatedAt', 'relatedKnowledgeBase', 'summary'],
    mergedReferenceDocuments,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'additional_function_capability.csv',
    ['id', 'name', 'description', 'semanticType', 'capabilityType', 'sourceDocumentRefId', 'defaultTrigger', 'relatedFeature', 'evidence', 'summary'],
    capabilities,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'additional_function_entry_point.csv',
    ['id', 'name', 'description', 'semanticType', 'entryPointType', 'uiLocation', 'shortcut', 'behavior', 'sourceDocumentRefId', 'summary'],
    entryPoints,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'additional_function_execution_mode.csv',
    ['id', 'name', 'description', 'semanticType', 'modeCode', 'lifecyclePhase', 'intendedUse', 'caution', 'sourceDocumentRefId', 'example'],
    executionModes,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'additional_function_configuration_option.csv',
    ['id', 'name', 'description', 'semanticType', 'optionName', 'effect', 'scope', 'defaultState', 'sourceDocumentRefId', 'summary'],
    configurationOptions,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'additional_function_rule.csv',
    ['id', 'name', 'description', 'semanticType', 'ruleType', 'severity', 'sourceDocumentRefId', 'rationale', 'statement'],
    rules,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'additional_function_pattern.csv',
    ['id', 'name', 'description', 'semanticType', 'patternType', 'sourceDocumentRefId', 'relatedFeatureRefId', 'relatedKnowledgeBase', 'summary', 'example'],
    patterns,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'related_feature.csv',
    ['id', 'name', 'description', 'semanticType', 'featureType', 'accessPath', 'sourceDocumentRefId', 'relatedKnowledgeBase', 'summary'],
    relatedFeatures,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'file_artifact.csv',
    ['id', 'name', 'description', 'semanticType', 'relativePath', 'sourceOrigin', 'collectionName', 'artifactType', 'fileExtension', 'moduleScope', 'implementationScope', 'runtimeFamily', 'fileSizeBytes', 'contentPreview'],
    mergedCorpus.fileArtifacts,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'implementation_example.csv',
    ['id', 'name', 'description', 'semanticType', 'exampleType', 'sourceArtifactRefId', 'sourceCollection', 'runtimeFamily', 'language', 'moduleScope', 'operationScope', 'optimaVersion', 'author', 'launchHint', 'interfaceList', 'companionArtifacts', 'summary', 'codePreview'],
    mergedCorpus.implementationExamples,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'com_interface.csv',
    ['id', 'name', 'description', 'semanticType', 'interfaceName', 'interfaceGroup', 'sourceCollection', 'sourceArtifactRefId', 'exampleRefCount', 'summary'],
    mergedCorpus.comInterfaces,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'configuration_catalog_entry.csv',
    ['id', 'name', 'description', 'semanticType', 'keyName', 'configType', 'label', 'sourceArtifactRefId', 'summary'],
    dictionaries.configurationEntries,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'procedure_dictionary_entry.csv',
    ['id', 'name', 'description', 'semanticType', 'procedureId', 'procedureName', 'sourceArtifactRefId', 'categoryHint', 'summary'],
    dictionaries.procedureEntries,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'message_catalog_entry.csv',
    ['id', 'name', 'description', 'semanticType', 'messageId', 'constant', 'messageType', 'buttons', 'projects', 'sourceArtifactRefId', 'messageText', 'summary'],
    dictionaries.messageEntries,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'implementation_guide.csv',
    ['id', 'name', 'description', 'semanticType', 'guideType', 'preferredMechanism', 'runtimeFamily', 'moduleScope', 'triggerSuitability', 'schemaKnowledgeBase', 'caution', 'summary'],
    implementationGuides,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'schema_touchpoint.csv',
    ['id', 'name', 'description', 'semanticType', 'sourceExampleRefId', 'sourceArtifactRefId', 'schemaObjectRefId', 'schemaObjectName', 'schemaObjectKind', 'touchpointType', 'confidence', 'evidence', 'schemaKnowledgeBase', 'queryDesignNote'],
    schemaTouchpoints,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'module_recipe.csv',
    ['id', 'name', 'description', 'semanticType', 'moduleName', 'scenarioType', 'preferredMechanism', 'triggerSuitability', 'sourceExampleRefs', 'anchorSchemaObjects', 'joinHint', 'sqlObjectHint', 'schemaKnowledgeBase', 'caution', 'summary'],
    moduleRecipes,
  ),
);
files.push(
  writeCsv(EXPORT_DIR, 
    'chunk.csv',
    ['id', 'name', 'description', 'sourceObjectRefId', 'sourceDocument', 'sourceSection', 'semanticType', 'content'],
    mergedChunks,
  ),
);

const sourceFiles = [
  ...listFilesRecursive(DRIVE_ROOT).filter((filePath) => !filePath.includes(`${path.sep}meta${path.sep}`)),
  ...listFilesRecursive(MANUAL_EXPORT_ROOT),
];
const sourceRegistry = {
  generatedAt: new Date().toISOString(),
  kbName: 'Comarch Optima Additional Functions',
  namespace: 'ComarchOptimaAdditionalFunctions',
  purpose: 'Local Google Drive and manual-export provenance for freshness checks, duplicate checks, and source attribution.',
  sources: sourceFiles.map((filePath) => ({
    key: path.relative(ROOT, filePath).replaceAll(path.sep, '/'),
    localSnapshotPath: path.relative(ROOT, filePath).replaceAll(path.sep, '/'),
    sourceType: filePath.startsWith(MANUAL_EXPORT_ROOT) ? 'manual_optima_export' : 'google_drive_corpus',
    contentHash: fileSha256(filePath),
    hashAlgorithm: 'sha256',
    updatedAt: fs.statSync(filePath).mtime.toISOString(),
  })),
  referenceDocuments: mergedReferenceDocuments.map((doc) => ({
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
  namespace: 'ComarchOptimaAdditionalFunctions',
  projectIntent: 'documentation and implementation-reference KB for additional functions',
  driveRoot: fs.existsSync(DRIVE_ROOT) ? DRIVE_ROOT : '',
  sourceRegistryPath: path.relative(ROOT, SOURCE_REGISTRY_PATH).replaceAll(path.sep, '/'),
  files,
};

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
const readmeLines = [
  '# ComarchOptimaAdditionalFunctions export',
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
      driveRootExists: fs.existsSync(DRIVE_ROOT),
      files: files.length,
      localArtifacts: mergedCorpus.fileArtifacts.length,
      localExamples: mergedCorpus.implementationExamples.length,
      interfaces: mergedCorpus.comInterfaces.length,
      localReferenceDocs: mergedCorpus.referenceDocuments.length,
      localReferenceChunks: mergedCorpus.localReferenceChunks.length,
      configEntries: dictionaries.configurationEntries.length,
      procedureEntries: dictionaries.procedureEntries.length,
      messageEntries: dictionaries.messageEntries.length,
      implementationGuides: implementationGuides.length,
      schemaTouchpoints: schemaTouchpoints.length,
      moduleRecipes: moduleRecipes.length,
    },
    null,
    2,
  ),
);
})().catch((error) => { console.error(error.message); process.exit(1); });
