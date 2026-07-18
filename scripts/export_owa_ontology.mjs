#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, makeId, writeCsv, writeJson } from './lib/export_utils.mjs';
import { findRawDrafts, splitDraftContent, truncate } from './lib/promoted_knowledge.mjs';

const ROOT = '/docker/openspg';
const EXPORT_DIR = path.join(ROOT, 'exports/owa_ontology/v1');
const MANIFEST_PATH = path.join(EXPORT_DIR, '_manifest.json');
const README_PATH = path.join(EXPORT_DIR, 'README.md');
const TARGET_NAMESPACE = 'OWAOntology';

function normalize(value) {
  return String(value || '').replace(/\r/g, '').trim();
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

function latestOntologyDrafts() {
  const drafts = findRawDrafts().filter((draft) => draft.kbNamespace === TARGET_NAMESPACE);
  const byTitle = new Map();
  for (const draft of drafts) {
    const key = normalize(draft.title).toLowerCase();
    const existing = byTitle.get(key);
    const draftLen = String(draft.content || '').length;
    const existingLen = existing ? String(existing.content || '').length : -1;
    const draftAt = Date.parse(draft.createdAt || '') || 0;
    const existingAt = existing ? Date.parse(existing.createdAt || '') || 0 : -1;
    if (!existing || draftLen > existingLen || (draftLen === existingLen && draftAt > existingAt)) {
      byTitle.set(key, draft);
    }
  }
  return [...byTitle.values()].sort((a, b) => a.title.localeCompare(b.title, 'pl'));
}

function parseEntityDraft(draft) {
  const content = String(draft.content || '');
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
  const relationSection = parseSection(content, 'Relacje ontologiczne');
  const relationRows = parseMarkdownTable(relationSection)[0]?.rows || [];
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
    relations: relationRows.map((row, index) => ({
      id: makeId('OWA_REL', `${canonicalName}_${row[0] || index}`),
      name: normalize(row[0] || `Relation ${index + 1}`),
      description: normalize(row[5] || ''),
      semanticType: 'ontology_relation',
      sourceEntityRefId: entityId,
      targetEntityRefId: makeId('OWA_ENTITY', row[2] || row[1] || `Target ${index + 1}`),
      predicate: normalize(row[0] || ''),
      cardinality: normalize(row[3] || ''),
      relationType: normalize(row[4] || ''),
      joinCondition: normalize(row[5] || ''),
      status: normalize(row[6] || ''),
      summary: truncate(`${row[0] || ''} ${row[5] || ''}`.trim(), 1200),
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
    chunks: splitDraftContent(content, 1800).map((chunk, index) => ({
      id: makeId('OWA_CHUNK', `${canonicalName}_${index + 1}`),
      name: `${canonicalName} chunk ${index + 1}`,
      description: `Ontology chunk for ${canonicalName}`,
      semanticType: 'chunk',
      sourceDocumentRefId: entityId,
      sourcePath: draft.rawMarkdownPath.replace(`${ROOT}/`, ''),
      sectionHeading: canonicalName,
      sectionOrder: String(index + 1),
      content: chunk,
    })),
  };
}

ensureDir(EXPORT_DIR);

const drafts = latestOntologyDrafts();
const parsed = drafts.map(parseEntityDraft);

const entityRows = parsed.map((item) => item.entity);
const fieldRows = parsed.flatMap((item) => item.fields);
const relationRows = parsed.flatMap((item) => item.relations);
const workflowRows = parsed.flatMap((item) => item.workflows);
const chunkRows = parsed.flatMap((item) => item.chunks);

const files = [];
files.push(writeCsv(EXPORT_DIR, 'ontology_entity.csv', ['id', 'name', 'description', 'semanticType', 'canonicalName', 'ontologyId', 'verificationStatus', 'confidenceLevel', 'businessDomain', 'mainTable', 'mcpReadTools', 'mcpWriteTools', 'aliases', 'summary'], entityRows));
files.push(writeCsv(EXPORT_DIR, 'ontology_field.csv', ['id', 'name', 'description', 'semanticType', 'entityRefId', 'fieldName', 'mssqlColumn', 'mcpField', 'sqlType', 'nullable', 'keyRole', 'mappingStatus', 'summary'], fieldRows));
files.push(writeCsv(EXPORT_DIR, 'ontology_relation.csv', ['id', 'name', 'description', 'semanticType', 'sourceEntityRefId', 'targetEntityRefId', 'predicate', 'cardinality', 'relationType', 'joinCondition', 'status', 'summary'], relationRows));
files.push(writeCsv(EXPORT_DIR, 'workflow_pattern.csv', ['id', 'name', 'description', 'semanticType', 'workflowName', 'sourceEntityRefId', 'targetEntityRefId', 'mcpTool', 'mode', 'status', 'summary'], workflowRows));
files.push(writeCsv(EXPORT_DIR, 'chunk.csv', ['id', 'name', 'description', 'semanticType', 'sourceDocumentRefId', 'sourcePath', 'sectionHeading', 'sectionOrder', 'content'], chunkRows));

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
  sourceType: 'knowledge_inbox_drafts',
  sourceRoots: ['downloads/knowledge_inbox/2026-07-15', 'downloads/knowledge_inbox/2026-07-17'],
  selectedDraftCount: drafts.length,
  files: files.map(({ fileName, rowCount, columns }) => ({ fileName, rowCount, columns })),
});

process.stdout.write(`${JSON.stringify({ ok: true, namespace: TARGET_NAMESPACE, exportDir: EXPORT_DIR, selectedDraftCount: drafts.length, files: files.map((f) => ({ fileName: f.fileName, rowCount: f.rowCount })) }, null, 2)}\n`);
