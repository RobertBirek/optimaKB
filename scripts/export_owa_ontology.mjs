#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ensureDir, makeId, writeCsv, writeJson } from './lib/export_utils.mjs';
import { findRawDrafts, loadPromotedKnowledge, loadRegistry, splitDraftContent, truncate } from './lib/promoted_knowledge.mjs';
import { selectOwaExportDrafts } from './lib/owa_export_selection.mjs';
import { buildOwaRelationRows } from './lib/owa_relation_export.mjs';
import { loadOwaRelationPolicy } from './lib/owa_relation_policy.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';
const EXPORT_DIR = path.join(ROOT, 'exports/owa_ontology/v1');
const MANIFEST_PATH = path.join(EXPORT_DIR, '_manifest.json');
const README_PATH = path.join(EXPORT_DIR, 'README.md');
const TARGET_NAMESPACE = 'OWAOntology';

function normalize(value) {
  return String(value || '').replace(/\r/g, '').trim();
}

function relativeSourcePath(value) {
  return path.relative(path.resolve(ROOT), path.resolve(ROOT, value)).replaceAll(path.sep, '/');
}

function parseListValue(content, label) {
  const match = content.match(new RegExp(`-\\s+${label}:\\s+` + '`?([^`\n]+)`?', 'i'));
  return normalize(match?.[1] || '');
}

function parseSection(content, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`##\\s+${escaped}\\n([\\s\\S]*?)(?=\\n##\\s+|$)`, 'i');
  return normalize(content.match(regex)?.[1] || '');
}

function parseMarkdownTable(sectionText) {
  const lines = sectionText.split('\n').map((line) => line.trim());
  const tables = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].startsWith('|')) continue;
    if (i + 1 >= lines.length || !/^\|[-:| ]+\|?$/.test(lines[i + 1])) continue;
    const header = lines[i].split('|').slice(1, -1).map((cell) => cell.trim());
    const rows = [];
    let j = i + 2;
    while (j < lines.length && lines[j].startsWith('|')) {
      rows.push(lines[j].split('|').slice(1, -1).map((cell) => cell.trim()));
      j += 1;
    }
    tables.push({ header, rows });
    i = j - 1;
  }
  return tables;
}

function parseSectionBlock(content, headings) {
  for (const heading of headings) {
    const section = parseSection(content, heading);
    if (section) return section;
  }
  return '';
}

function parseEndpointTools(content) {
  const sectionText = parseSectionBlock(content, ['Endpointy OptimaMCP', 'MCP API']);
  if (!sectionText) return [];

  const tools = [];
  let currentMode = '';
  const lines = sectionText.split('\n');

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;

    if (/^#{3,}\s+/i.test(line)) {
      const lower = line.toLowerCase();
      if (lower.includes('read') || lower.includes('odczyt')) currentMode = 'READ';
      else if (lower.includes('write') || lower.includes('workflow') || lower.includes('zapis')) currentMode = 'WRITE';
      continue;
    }

    if (line.startsWith('|')) {
      const tables = parseMarkdownTable(lines.slice(i).join('\n'));
      for (const table of tables) {
        const headerMap = new Map(table.header.map((cell, index) => [cell.toLowerCase(), index]));
        const toolIdx = headerMap.get('narzędzie mcp') ?? headerMap.get('mcp tool') ?? 0;
        const descIdx = headerMap.get('opis') ?? headerMap.get('operacja biznesowa') ?? 1;
        const typeIdx = headerMap.get('typ workflow') ?? headerMap.get('tryb') ?? -1;
        for (const row of table.rows) {
          const tool = normalize(row[toolIdx] || '').replace(/`/g, '');
          if (!tool || tool === '—' || tool.startsWith('[')) continue;
          tools.push({
            tool,
            mode: currentMode || (String(row[typeIdx] || '').toUpperCase().includes('READ') ? 'READ' : 'WRITE'),
            op: normalize(row[descIdx] || tool),
            detail: normalize(row[typeIdx] || ''),
          });
        }
      }
      break;
    }

    const bulletMatch = line.match(/^-\s+`([^`]+)`(?:\s+`([^`]+)`)?\s*(?:—|-)?\s*(.*)$/);
    if (bulletMatch) {
      const tool = normalize(bulletMatch[1]);
      const tail = normalize(bulletMatch[3]);
      if (tool) {
        tools.push({
          tool,
          mode: currentMode || 'WRITE',
          op: tail || tool,
          detail: normalize(bulletMatch[2] || ''),
        });
      }
    }
  }

  const seen = new Set();
  return tools.filter((item) => {
    const key = `${item.mode}:${item.tool}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseEntityDraft(draft) {
  // Match the splitter's whitespace/paragraph normalization without chunking
  // parser input; retain the original snapshot for hashing and chunk generation.
  const content = draft.content.replace(/\r/g, '').replace(/[ \t]+/g, ' ')
    .split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean).join('\n\n');
  const entityId = makeId('OWA_ENTITY', draft.title);
  const canonicalName = draft.title.replace(/^Encja:\s*/i, '');
  const verificationStatus = parseListValue(content, 'Status');
  const confidenceLevel = parseListValue(content, 'Poziom pewności');
  const ontologyId = parseListValue(content, 'Identyfikator ontologiczny');
  const aliases = parseListValue(content, 'Aliasy');
  const businessDescription = parseSection(content, 'Opis biznesowy').split('\n').filter(Boolean).join(' ');
  const sourcesSection = parseSection(content, 'Źródła danych');
  const sourceTables = parseMarkdownTable(sourcesSection)[0]?.rows || [];
  const mainTableRow = sourceTables.find((row) => normalize(row[0]).toLowerCase().includes('tabela główna'));
  const mainTable = mainTableRow ? `${mainTableRow[1].replace(/`/g, '')}.${mainTableRow[2].replace(/`/g, '')}` : '';
  const endpointRows = parseEndpointTools(content);
  const readTools = [];
  const writeTools = [];
  for (const row of endpointRows) {
    const tool = normalize(row.tool).replace(/`/g, '');
    const mode = normalize(row.mode).replace(/`/g, '');
    if (!tool || tool === '—' || tool.startsWith('[NOT EXPOSED')) continue;
    if (mode === 'READ') readTools.push(tool);
    else if (mode === 'WRITE') writeTools.push(tool);
  }

  const fieldsSection = parseSection(content, 'Pola i mapowanie API ↔ MSSQL');
  const fieldRows = parseMarkdownTable(fieldsSection)[0]?.rows || [];
  const workflowRows = [];
  for (const row of endpointRows) {
    const op = normalize(row.op).replace(/`/g, '');
    const tool = normalize(row.tool).replace(/`/g, '');
    const mode = normalize(row.mode).replace(/`/g, '');
    if (!tool || tool === '—' || mode !== 'WRITE') continue;
    workflowRows.push({ op, tool, mode, detail: normalize(row.detail) });
  }

  return {
    entity: {
      id: entityId,
      name: canonicalName,
      description: businessDescription || truncate(content, 1000),
      semanticType: 'ontology_entity',
      canonicalName,
      ontologyId,
      verificationStatus,
      confidenceLevel,
      businessDomain: normalize(parseSection(content, 'Opis biznesowy')).includes('Magazyn') ? 'Magazyn' : '',
      mainTable,
      mcpReadTools: readTools.join('; '),
      mcpWriteTools: writeTools.join('; '),
      aliases,
      summary: truncate(`${canonicalName}. ${businessDescription}`.trim(), 1200),
    },
    fields: fieldRows.map((row, index) => ({
      id: makeId('OWA_FIELD', `${canonicalName}_${row[3] || row[2] || index}`),
      name: normalize(row[3] || row[2] || `Field ${index + 1}`),
      description: normalize(row[7] || row[8] || '[UNKNOWN]'),
      semanticType: 'ontology_field',
      entityRefId: entityId,
      fieldName: normalize(row[3] || row[2] || ''),
      mssqlColumn: normalize(row[3] || ''),
      mcpField: normalize(row[1] || '').replace(/`/g, ''),
      sqlType: normalize(row[4] || ''),
      nullable: normalize(row[5] || ''),
      keyRole: normalize(row[6] || ''),
      mappingStatus: normalize(row[8] || row[9] || ''),
      summary: truncate(`${row[3] || ''} ${row[7] || ''}`.trim(), 1200),
    })),
    workflows: workflowRows.map((row, index) => ({
      id: makeId('OWA_WF', `${canonicalName}_${row.tool}_${index}`),
      name: row.op || row.tool,
      description: row.op || row.tool,
      semanticType: 'workflow_pattern',
      workflowName: row.op || row.tool,
      sourceEntityRefId: entityId,
      targetEntityRefId: '',
      mcpTool: row.tool,
      mode: row.mode,
      status: 'WRITE_NOT_CALLED',
      summary: truncate(`${canonicalName}: ${row.op || row.tool}${row.detail ? ` | ${row.detail}` : ''} -> ${row.tool}`.trim(), 1200),
    })),
    chunks: splitDraftContent(draft.content, 1800).map((chunk, index) => ({
      id: makeId('OWA_CHUNK', `${canonicalName}_${index + 1}`),
      name: `${canonicalName} chunk ${index + 1}`,
      description: `Ontology chunk for ${canonicalName}`,
      semanticType: 'chunk',
      sourceDocumentRefId: entityId,
      sourcePath: relativeSourcePath(draft.rawMarkdownPath),
      sectionHeading: canonicalName,
      sectionOrder: String(index + 1),
      content: chunk,
    })),
  };
}

function refuse(issues) {
  // Flush the complete diagnostic before exiting, including under pipe backpressure.
  fs.writeFileSync(2, `${JSON.stringify({ ok: false, namespace: TARGET_NAMESPACE, issues }, null, 2)}\n`);
  process.exit(2);
}

// Qualify the entire corpus and parse every selected snapshot before creating
// the output directory or touching any prior staging/build evidence.
let drafts, parsed, selectedDrafts, sourceRoots, relationExports, policy, policySha256;
try {
  ({ policy, sha256: policySha256 } = loadOwaRelationPolicy());
  const selection = selectOwaExportDrafts({
    promotedDrafts: loadPromotedKnowledge(TARGET_NAMESPACE),
    registryEntries: loadRegistry().entries,
    rawDrafts: findRawDrafts(),
    root: ROOT,
  });
  if (selection.issues.length) refuse(selection.issues);
  drafts = selection.drafts;
  parsed = drafts.map(parseEntityDraft);
  relationExports = drafts.map((draft, index) => buildOwaRelationRows({
    draft, entityId: parsed[index].entity.id, root: ROOT, policy,
  }));
  selectedDrafts = drafts.map((draft, index) => ({
    draftId: draft.id,
    equivalentDraftIds: draft.equivalentDraftIds,
    entityId: parsed[index].entity.id,
    promotedJsonPath: relativeSourcePath(draft.promotedJsonPath),
    promotedMarkdownPath: relativeSourcePath(draft.promotedMarkdownPath),
    rawJsonPath: relativeSourcePath(draft.sourceDraftPath),
    rawMarkdownPath: relativeSourcePath(draft.rawMarkdownPath),
    contentSha256: createHash('sha256').update(draft.content, 'utf8').digest('hex'),
  }));
  sourceRoots = [...new Set(selectedDrafts.map((draft) => path.posix.dirname(draft.rawJsonPath)))].sort();
} catch (error) {
  refuse([{ kind: error.kind || 'input_error', title: '', draftIds: [],
    reason: error.reason || `Cannot load or parse OWA export inputs: ${error.message}`,
    ...(error.line === undefined ? {} : { line: error.line }) }]);
}

const entityRows = parsed.map((item) => item.entity);
const fieldRows = parsed.flatMap((item) => item.fields);
const relationRows = relationExports.flatMap((item) => item.rows);
const auditRows = relationExports.flatMap((item) => item.auditRows);
const workflowRows = parsed.flatMap((item) => item.workflows);
const chunkRows = parsed.flatMap((item) => item.chunks);

// Distinct full-title owners can still share canonical child IDs. Check every
// complete CSV rowset; collisions are errors, never a reason to rename/dedupe.
const duplicateIssues = [];
for (const [fileName, rows] of [
  ['ontology_entity.csv', entityRows],
  ['ontology_field.csv', fieldRows],
  ['ontology_relation.csv', relationRows],
  ['workflow_pattern.csv', workflowRows],
  ['chunk.csv', chunkRows],
]) {
  const seen = new Set();
  const duplicates = new Set();
  for (const row of rows) {
    if (seen.has(row.id)) duplicates.add(row.id);
    seen.add(row.id);
  }
  if (!duplicates.size) continue;
  const duplicateIds = [...duplicates].sort();
  duplicateIssues.push({ kind: 'duplicate_ids', title: '', draftIds: [], fileName, duplicateIds,
    reason: `${fileName} contains duplicate IDs: ${duplicateIds.join(', ')}` });
}
if (duplicateIssues.length) refuse(duplicateIssues);

const relationAuditBytes = `${JSON.stringify({
  schemaVersion: 1,
  namespace: TARGET_NAMESPACE,
  policy: { schemaVersion: 1, sha256: policySha256, observedAt: policy.observedAt },
  rows: auditRows,
}, null, 2)}\n`;
const relationAudit = {
  schemaVersion: 1, fileName: 'relation_audit.json', rowCount: auditRows.length,
  sha256: createHash('sha256').update(relationAuditBytes, 'utf8').digest('hex'), policySha256,
};

ensureDir(EXPORT_DIR);

const files = [];
files.push(writeCsv(EXPORT_DIR, 'ontology_entity.csv', ['id', 'name', 'description', 'semanticType', 'canonicalName', 'ontologyId', 'verificationStatus', 'confidenceLevel', 'businessDomain', 'mainTable', 'mcpReadTools', 'mcpWriteTools', 'aliases', 'summary'], entityRows));
files.push(writeCsv(EXPORT_DIR, 'ontology_field.csv', ['id', 'name', 'description', 'semanticType', 'entityRefId', 'fieldName', 'mssqlColumn', 'mcpField', 'sqlType', 'nullable', 'keyRole', 'mappingStatus', 'summary'], fieldRows));
files.push(writeCsv(EXPORT_DIR, 'ontology_relation.csv', ['id', 'name', 'description', 'semanticType', 'sourceEntityRefId', 'targetEntityRefId', 'predicate', 'cardinality', 'relationType', 'joinCondition', 'status', 'summary'], relationRows));
files.push(writeCsv(EXPORT_DIR, 'workflow_pattern.csv', ['id', 'name', 'description', 'semanticType', 'workflowName', 'sourceEntityRefId', 'targetEntityRefId', 'mcpTool', 'mode', 'status', 'summary'], workflowRows));
files.push(writeCsv(EXPORT_DIR, 'chunk.csv', ['id', 'name', 'description', 'semanticType', 'sourceDocumentRefId', 'sourcePath', 'sectionHeading', 'sectionOrder', 'content'], chunkRows));
fs.writeFileSync(path.join(EXPORT_DIR, relationAudit.fileName), relationAuditBytes, 'utf8');

fs.writeFileSync(README_PATH, [
  '# OWAOntology export',
  '',
  `Generated at: ${new Date().toISOString()}`,
  `Drafts selected: ${drafts.length}`,
  '',
  ...files.map((file) => `- \`${file.fileName}\`: \`${file.rowCount}\``),
  '',
].join('\n'), 'utf8');

writeJson(MANIFEST_PATH, {
  generatedAt: new Date().toISOString(),
  namespace: TARGET_NAMESPACE,
  sourceType: 'promoted_knowledge_snapshots',
  sourceRoots,
  selectedDraftCount: drafts.length,
  selectedDrafts,
  relationAudit,
  files: files.map(({ fileName, rowCount, columns }) => ({ fileName, rowCount, columns })),
});

process.stdout.write(`${JSON.stringify({ ok: true, namespace: TARGET_NAMESPACE, exportDir: EXPORT_DIR, selectedDraftCount: drafts.length, relationAuditRowCount: auditRows.length, unresolvedRelationCount: auditRows.length, files: files.map((f) => ({ fileName: f.fileName, rowCount: f.rowCount })) }, null, 2)}\n`);
