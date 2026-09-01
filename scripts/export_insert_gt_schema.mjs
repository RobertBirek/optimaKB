#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { createHash } from 'node:crypto';
import { csvEscape } from './lib/export_utils.mjs';
import { assertUniqueIds, deduplicateIdenticalRowsById, upsertManifestFile } from './lib/schema_export_integrity.mjs';
import { extractPdfText } from './lib/pdf_text.mjs';

const ROOT = '/docker/openspg';
const OUTPUT_DIR = path.join(ROOT, 'exports/insert_gt_schema/v1');
const MANIFEST_FILE = path.join(OUTPUT_DIR, '_manifest.json');
const DRIVE_ROOT = path.join(ROOT, 'downloads/google_drive/insert_gt');
const SQL_ROOT = path.join(DRIVE_ROOT, 'extracted/Skrypty_SQL_1_89_HF1');
const XML_DOC_PATH = path.join(DRIVE_ROOT, 'extracted/Dokumentacja_bazy_danych_1_89_HF1/Dokumentacja_DB.xml');
const DB_NAME = 'pomagier';
const DOC_CHUNK_MAX = 1800;
const HELPER_ONLY = process.env.OPENSPG_HELPER_ONLY === '1';

function normalizeText(text) {
  return String(text || '').replace(/\r/g, '').replace(/\uFEFF/g, '').trim();
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

function stripBrackets(value) {
  return String(value || '').replace(/^\[|\]$/g, '');
}

function writeCsvRows(outPath, headers, rows) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header] || '')).join(','));
  }
  fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
}

function parseCsvRows(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') { field += '"'; index += 1; continue; }
      if (char === '"') { inQuotes = false; continue; }
      field += char;
      continue;
    }
    if (char === '"') { inQuotes = true; continue; }
    if (char === ',') { row.push(field); field = ''; continue; }
    if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    if (char === '\r') continue;
    field += char;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

  if (rows.length === 0) return [];
  const [headers, ...dataRows] = rows;
  return dataRows
    .filter((values) => values.some((value) => value !== ''))
    .map((values) => Object.fromEntries(headers.map((header, idx) => [header, values[idx] ?? ''])));
}

function escapeXmlEntities(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function parseXmlDoc(filePath) {
  const text = fs.readFileSync(filePath, 'latin1').toString('utf8');
  const tables = new Map();
  const fieldSeen = new Set();

  const tableRegex = /<Table ready="1">([\s\S]*?)<\/Table>/g;
  let tableMatch;
  while ((tableMatch = tableRegex.exec(text)) !== null) {
    const block = tableMatch[1];
    const nameMatch = block.match(/<Name>([^<]+)<\/Name>/);
    const descMatch = block.match(/<Description>([^<]*)<\/Description>/);
    const authorMatch = block.match(/<Author>([^<]*)<\/Author>/);
    if (!nameMatch) continue;

    const tableName = nameMatch[1].trim();
    const tableDesc = descMatch ? descMatch[1].trim() : '';
    const tableAuthor = authorMatch ? authorMatch[1].trim() : '';

    const fields = [];
    const fieldRegex = /<Field>([\s\S]*?)<\/Field>/g;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(block)) !== null) {
      const fBlock = fieldMatch[1];
      const fName = (fBlock.match(/<Name>([^<]+)<\/Name>/) || [])[1] || '';
      const fDesc = (fBlock.match(/<Description>([^<]*)<\/Description>/) || [])[1] || '';
      const fType = (fBlock.match(/<TypeDescription>([^<]*)<\/TypeDescription>/) || [])[1] || '';
      if (!fName) continue;
      const dedupeKey = `${tableName}.${fName}`;
      if (fieldSeen.has(dedupeKey)) continue;
      fieldSeen.add(dedupeKey);
      fields.push({ name: fName.trim(), description: fDesc.trim(), typeDescription: fType.trim() });
    }

    tables.set(tableName, { name: tableName, description: tableDesc, author: tableAuthor, fields });
  }
  return tables;
}

function parseSqlBlocks(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const blocks = [];
  let parenDepth = 0;
  let inString = false;
  let blockStart = null;

  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "'" && text[i - 1] !== '\\') {
      inString = !inString;
      i += 1;
      continue;
    }
    if (inString) {
      i += 1;
      continue;
    }
    if (ch === '(') {
      if (parenDepth === 0) blockStart = i;
      parenDepth += 1;
    } else if (ch === ')') {
      parenDepth -= 1;
      if (parenDepth === 0 && blockStart !== null) {
        tokens.push({
          type: 'paren_block',
          content: text.slice(blockStart + 1, i).trim(),
          start: blockStart,
          end: i + 1,
        });
        blockStart = null;
      }
    }
    i += 1;
  }

  tokens.sort((a, b) => a.start - b.start);
  const topLevel = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let currentTable = '';
  let currentSchema = 'dbo';
  for (const line of topLevel) {
    const tableMatch = line.match(/CREATE\s+TABLE\s+(?:\[([^\]]+)\]\.)?\[([^\]]+)\]/i);
    if (tableMatch) {
      currentSchema = tableMatch[1] || 'dbo';
      currentTable = tableMatch[2];
    }
  }

  return {
    schema: currentSchema,
    table: currentTable,
    fullText: text,
    tokens,
  };
}

function parseSqlFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const text = normalizeText(fs.readFileSync(filePath, 'utf8'));
  const objMatch = text.match(/CREATE\s+(TABLE|VIEW|PROCEDURE|PROC|FUNCTION|TRIGGER)\s+(?:\[([^\]]+)\]\.)?\[([^\]]+)\]/i);
  if (!objMatch) return null;
  return {
    objectType: objMatch[1].toUpperCase(),
    schema: objMatch[2] || 'dbo',
    name: objMatch[3],
    fullText: text,
  };
}

function extractTableColumns(fullText) {
  const columns = [];
  const pkMatch = fullText.match(/CONSTRAINT\s+\[([^\]]+)\]\s+PRIMARY\s+KEY\s+(?:CLUSTERED\s+)?\(([^)]+)\)/i);
  const pkName = pkMatch ? pkMatch[1] : '';
  const pkColumns = pkMatch ? pkMatch[2].split(',').map((c) => stripBrackets(c.trim().split(' ')[0])) : [];

  const identityCols = new Set();
  const identityMatch = fullText.match(/\[([^\]]+)\]\s*\[?\w+\]?\s*IDENTITY/g);
  if (identityMatch) {
    for (const im of identityMatch) {
      const name = im.match(/\[([^\]]+)\]/);
      if (name) identityCols.add(name[1]);
    }
  }

  const computedCols = new Map();
  const computedRegex = /\[([^\]]+)\]\s*AS\s*(.+?)(?=\s*,\s*\[|$)/g;
  let ccMatch;
  while ((ccMatch = computedRegex.exec(fullText)) !== null) {
    computedCols.set(ccMatch[1], ccMatch[2].trim().replace(/,\s*$/, ''));
  }

  const lines = fullText.split('\n');
  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx].trim();
    const colDef = line.match(/^\s*\[([^\]]+)\]\s*(\[(?:dbo\]\.)?\[[^\]]+\])\s*(NOT\s+NULL|NULL)?\s*(?:CONSTRAINT\s+\[([^\]]+)\]\s+DEFAULT\s*(.+?))?\s*[,]?\s*$/);
    if (colDef) {
      const name = colDef[1];
      const fullType = colDef[2].replace(/\[dbo\]\./, '').replace(/\[|\]/g, '');
      const nullable = (colDef[3] || '').includes('NULL') && !(colDef[3] || '').includes('NOT') ? 'YES' : 'NO';
      const defaultConstraint = colDef[4] || '';
      const defaultValue = colDef[5] || '';
      columns.push({
        name,
        dataType: fullType.match(/^(\w+)/)?.[1] || fullType,
        fullDataType: fullType,
        nullable,
        defaultConstraint,
        defaultValue: defaultValue.replace(/^[\s']+|[\s']+$/g, ''),
        isIdentity: identityCols.has(name) ? 'YES' : 'NO',
        isComputed: computedCols.has(name) ? 'YES' : 'NO',
        computedDefinition: computedCols.get(name) || '',
        isPrimaryKey: pkColumns.includes(name),
        // TODO: handle non-UDT columns (ROWGUIDCOL, etc.) and handle constraint definitions better
      });
    }
  }

  if (columns.length === 0) {
    const simpleColRegex = /\[([^\]]+)\]\s*(\[[^\]]+\])\s*(NOT\s+NULL|NULL)?(.*?)(?=\s*,\s*$|\s*,\s*\[|\s*\))/g;
    let scm;
    while ((scm = simpleColRegex.exec(fullText)) !== null) {
      const name = scm[1];
      const fullType = scm[2].replace(/\[dbo\]\./, '').replace(/\[|\]/g, '');
      const nullableText = scm[3] || '';
      const nullable = nullableText.includes('NOT') ? 'NO' : 'YES';
      const rest = scm[4] || '';
      const defaultMatch = rest.match(/CONSTRAINT\s+\[([^\]]+)\]\s+DEFAULT\s*(.+)/);
      columns.push({
        name,
        dataType: fullType.match(/^(\w+)/)?.[1] || fullType,
        fullDataType: fullType,
        nullable,
        defaultConstraint: defaultMatch ? defaultMatch[1] : '',
        defaultValue: defaultMatch ? defaultMatch[2].replace(/^[\s']+|[\s']+$/g, '').replace(/,$/, '') : '',
        isIdentity: identityCols.has(name) ? 'YES' : 'NO',
        isComputed: computedCols.has(name) ? 'YES' : 'NO',
        computedDefinition: computedCols.get(name) || '',
        isPrimaryKey: pkColumns.includes(name),
      });
    }
  }

  return { columns, pkName, pkColumns };
}

function parseCreateTable(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const tableMatch = text.match(/CREATE\s+TABLE\s+(?:\[([^\]]+)\]\.)?\[([^\]]+)\]/i);
  if (!tableMatch) return null;
  const schema = tableMatch[1] || 'dbo';
  const tableName = tableMatch[2];

  const { columns, pkName, pkColumns } = extractTableColumns(text);

  const fkRefs = [];
  const fkRegex = /CONSTRAINT\s+\[([^\]]+)\]\s+FOREIGN\s+KEY\s*\(\[([^\]]+)\]\)\s*REFERENCES\s+(?:\[([^\]]+)\]\.)?\[([^\]]+)\]\s*\(\[([^\]]+)\]\)(?:\s+ON\s+DELETE\s+(CASCADE|NO\s+ACTION|SET\s+NULL|SET\s+DEFAULT))?(?:\s+ON\s+UPDATE\s+(CASCADE|NO\s+ACTION|SET\s+NULL|SET\s+DEFAULT))?(?:\s+NOT\s+FOR\s+REPLICATION)?/gi;
  let fkMatch;
  while ((fkMatch = fkRegex.exec(text)) !== null) {
    fkRefs.push({
      name: fkMatch[1],
      column: fkMatch[2],
      refSchema: fkMatch[3] || 'dbo',
      refTable: fkMatch[4],
      refColumn: fkMatch[5],
      deleteAction: (fkMatch[6] || 'NO_ACTION').replace(/\s+/g, '_').toUpperCase(),
      updateAction: (fkMatch[7] || 'NO_ACTION').replace(/\s+/g, '_').toUpperCase(),
    });
  }

  const indexRefs = [];
  const idxRegex = /CREATE\s+(UNIQUE\s+)?(NONCLUSTERED\s+|CLUSTERED\s+)?INDEX\s+\[([^\]]+)\]\s+ON\s+(?:\[([^\]]+)\]\.)?\[([^\]]+)\]\s*\(([^)]+)\)(?:\s+INCLUDE\s*\(([^)]+)\))?(?:\s+WHERE\s+(.+?))?\s*(?:WITH\s*\([^)]+\))?/gis;
  let idxMatch;
  while ((idxMatch = idxRegex.exec(text)) !== null) {
    indexRefs.push({
      isUnique: idxMatch[1] ? 'UNIQUE' : 'NONUNIQUE',
      type: (idxMatch[2] || 'CLUSTERED').trim().toUpperCase(),
      name: idxMatch[3],
      columnList: idxMatch[6].split(',').map((c) => stripBrackets(c.trim().split(' ')[0])).join(', '),
      includedColumns: (idxMatch[7] || '').split(',').map((c) => stripBrackets(c.trim())).join(', ').trim(),
      filterDefinition: (idxMatch[8] || '').trim(),
    });
  }

  const checkConstraints = [];
  const chkRegex = /CONSTRAINT\s+\[([^\]]+)\]\s+CHECK\s+\((.+?)\)/gis;
  let chkMatch;
  while ((chkMatch = chkRegex.exec(text)) !== null) {
    if (chkMatch[1].toUpperCase() !== pkName.toUpperCase()) {
      checkConstraints.push({ name: chkMatch[1], definition: chkMatch[2].trim() });
    }
  }

  return { schema, tableName, columns, pkName, pkColumns, fkRefs, indexRefs, checkConstraints, fullText: text };
}

async function convertPdfToMarkdown(filePath) {
  const stat = fs.statSync(filePath);
  if (stat.size === 0 || stat.size > 55 * 1024 * 1024) return '';
  try {
    const text = await extractPdfText(filePath);
    return normalizeText(text);
  } catch (error) {
    console.warn(`[pdf_text] Failed for ${path.basename(filePath)}: ${error.message}`);
    return '';
  }
}

function splitLongContent(text, maxLength = DOC_CHUNK_MAX) {
  const paragraphs = normalizeText(text).split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  if (paragraphs.length === 0) return [];
  const chunks = [];
  let current = '';
  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= maxLength) { current = candidate; continue; }
    if (current) chunks.push(current);
    if (paragraph.length <= maxLength) { current = paragraph; continue; }
    for (let idx = 0; idx < paragraph.length; idx += maxLength) {
      chunks.push(paragraph.slice(idx, idx + maxLength));
    }
    current = '';
  }
  if (current) chunks.push(current);
  return chunks;
}

function inferModuleHint(tableName) {
  const n = String(tableName || '').toLowerCase();
  if (n.startsWith('kh_') || n.startsWith('knt') || n.startsWith('adr')) return 'KONTRAHENCI_CRM';
  if (n.startsWith('tw_') || n.startsWith('tow') || n.startsWith('cen_') || n.startsWith('mag')) return 'TOWARY_MAGAZYN';
  if (n.startsWith('dok_') || n.startsWith('tr_') || n.startsWith('tra') || n.startsWith('zam') || n.startsWith('st_')) return 'DOKUMENTY_HANDEL';
  if (n.startsWith('khz') || n.startsWith('roz') || n.startsWith('fin') || n.startsWith('bnk') || n.startsWith('kas') || n.startsWith('plat')) return 'FINANSE_ROZRACHUNKI';
  if (n.startsWith('vat') || n.startsWith('dekl') || n.startsWith('jpk') || n.startsWith('ksef')) return 'VAT_DEKLARACJE';
  if (n.startsWith('gr_') || n.startsWith('grat') || n.startsWith('pr_') || n.startsWith('prac') || n.startsWith('um_') || n.startsWith('umow')) return 'KADRY_PLACE';
  if (n.startsWith('sl_') || n.startsWith('cfg') || n.startsWith('par_') || n.startsWith('net_') || n.startsWith('pd_') || n.startsWith('cert')) return 'KONFIGURACJA';
  if (n.startsWith('__')) return 'SYSTEMOWE';
  if (n.startsWith('hb_') || n.startsWith('hb') || n.startsWith('imp_')) return 'INTEGRACJE_BANKOWE';
  if (n.startsWith('fe_') || n.startsWith('feniks')) return 'INTEGRACJE_FENIKS';
  if (n.startsWith('ap') || n.startsWith('ap_')) return 'AUTOMATYZACJA';
  if (n.startsWith('cr') || n.startsWith('crm')) return 'CRM';
  if (n.startsWith('rej') || n.startsWith('ks_')) return 'KSIEGOWOSC';
  return 'OGOLNE';
}

function inferTableRole(tableName) {
  const n = String(tableName || '').toLowerCase();
  if (n.endsWith('_nag') || n.endsWith('nag') || n.includes('naglowek')) return 'HEADER';
  if (n.endsWith('_elem') || n.endsWith('elem') || n.endsWith('_poz') || n.endsWith('poz') || n.endsWith('_skl') || n.includes('pozycja')) return 'LINE';
  if (n.startsWith('sl_') || n.includes('_sl_') || n.includes('slownik')) return 'DICTIONARY';
  if (n.endsWith('_hist') || n.includes('historia') || n.includes('_log')) return 'HISTORY';
  if (n.includes('_par_') || n.includes('parametr') || n.startsWith('cfg') || n.startsWith('par_')) return 'CONFIG';
  if (n.startsWith('__')) return 'SYSTEM';
  return 'MASTER';
}

function objectNameFromRefId(refId) {
  const parts = String(refId || '').split(':');
  return parts[parts.length - 1] || '';
}

function shortObjectName(sqlName) {
  return String(sqlName || '').replace(/^dbo\./i, '');
}

function uniqueValues(values, max = 8) {
  return Array.from(new Set(values.filter(Boolean))).slice(0, max);
}

function compactWhitespace(text, maxLength = 320) {
  return normalizeText(String(text || '')).replace(/\s+/g, ' ').slice(0, maxLength);
}

function extractParameters(fullText, objectId, objectKind) {
  const params = [];
  const defMatch = fullText.match(/CREATE\s+(PROCEDURE|PROC|FUNCTION)\s+(?:\[([^\]]+)\]\.)?\[([^\]]+)\]\s*\(([\s\S]*?)\)\s*(?:AS|RETURNS)/i);
  if (!defMatch) return params;
  const paramBlock = defMatch[4];
  const paramRegex = /@(\w+)\s+(?:AS\s+)?(\[?(?:dbo\]\.)?\[?\w+\]?)(?:\s*\(\s*(\d+)(?:\s*,\s*(\d+))?\s*\))?\s*(?:=\s*(.+?))?\s*(?:OUTPUT|OUT)?\s*,?\s*(?=@|$)/gi;
  let pm;
  let pos = 1;
  while ((pm = paramRegex.exec(paramBlock)) !== null) {
    const name = pm[1];
    const dataType = pm[2].replace(/\[dbo\]\./i, '').replace(/\[|\]/g, '');
    const maxLength = pm[3] || '';
    const scale = pm[4] || '';
    const hasDefault = pm[5] ? 'YES' : 'NO';
    const isOutput = (pm[0] || '').toLowerCase().includes('output') ? 'YES' : 'NO';
    params.push({
      id: `${objectId}:PARAM:${name}`,
      name,
      description: `Parameter ${name} of ${objectKind}`,
      semanticType: 'parameter',
      objectRefId: objectId,
      sqlName: name,
      objectKind,
      ordinalPosition: String(pos),
      dataType,
      maxLength,
      precisionValue: maxLength,
      scaleValue: scale,
      isOutput,
      hasDefaultValue: hasDefault,
    });
    pos += 1;
  }
  return params;
}

function extractObjectDeps(fullText, objectRefId, objectKind, knownTables) {
  const deps = [];
  const seen = new Set();

  function resolveTableRef(tableName, schema) {
    const cleaned = stripBrackets(tableName);
    const targetId = `${DB_NAME}:TABLE:${schema || 'dbo'}.${cleaned}`;
    if (knownTables.has(targetId) && targetId !== objectRefId) return { id: targetId, name: cleaned };
    return null;
  }

  const tableRefRegex = /(?:FROM|JOIN|APPLY)\s+(\[?(?:dbo\]\.)?\[?\w+\]?)(?:\.\[?(\w+)\]?)?(?:\s+AS\s+\w+)?/gi;
  let tr;
  while ((tr = tableRefRegex.exec(fullText)) !== null) {
    const schema = tr[2] ? stripBrackets(tr[1]) : 'dbo';
    const tableName = tr[2] ? stripBrackets(tr[2]) : stripBrackets(tr[1]);
    const target = resolveTableRef(tableName, schema);
    if (!target) continue;
    const key = `${objectRefId}:READ:${target.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deps.push({
      id: `DEP:${slugify(objectRefId)}:READ:${slugify(target.id)}`,
      name: `${objectNameFromRefId(objectRefId)} reads ${target.name}`,
      description: `Definition-derived read dependency to ${target.name}.`,
      semanticType: 'object_dependency',
      sourceObjectRefId: objectRefId,
      targetObjectRefId: target.id,
      sourceObjectKind: objectKind,
      targetObjectKind: 'TABLE',
      dependencyType: 'SQL_READ',
      evidence: tr[0].trim().slice(0, 180),
    });
  }

  const writeRegex = /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|MERGE)\s+(\[?(?:dbo\]\.)?\[?\w+\]?)(?:\.\[?(\w+)\]?)?/gi;
  let wr;
  while ((wr = writeRegex.exec(fullText)) !== null) {
    const schema = wr[2] ? stripBrackets(wr[1]) : 'dbo';
    const tableName = wr[2] ? stripBrackets(wr[2]) : stripBrackets(wr[1]);
    const target = resolveTableRef(tableName, schema);
    if (!target) continue;
    const key = `${objectRefId}:WRITE:${target.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deps.push({
      id: `DEP:${slugify(objectRefId)}:WRITE:${slugify(target.id)}`,
      name: `${objectNameFromRefId(objectRefId)} writes ${target.name}`,
      description: `Definition-derived write dependency to ${target.name}.`,
      semanticType: 'object_dependency',
      sourceObjectRefId: objectRefId,
      targetObjectRefId: target.id,
      sourceObjectKind: objectKind,
      targetObjectKind: 'TABLE',
      dependencyType: 'SQL_WRITE',
      evidence: wr[0].trim().slice(0, 180),
    });
  }

  const execRegex = /(?:EXEC(?:UTE)?|EXEC)\s+(\[?(?:dbo\]\.)?\[?\w+\]?)(?:\.\[?(\w+)\]?)?/gi;
  let er;
  while ((er = execRegex.exec(fullText)) !== null) {
    const schema = er[2] ? stripBrackets(er[1]) : 'dbo';
    const name = er[2] ? stripBrackets(er[2]) : stripBrackets(er[1]);
    if (name === objectNameFromRefId(objectRefId)) continue;
    const key = `${objectRefId}:EXEC:${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deps.push({
      id: `DEP:${slugify(objectRefId)}:EXEC:${slugify(name)}`,
      name: `${objectNameFromRefId(objectRefId)} calls ${name}`,
      description: `Definition-derived call to ${name}.`,
      semanticType: 'object_dependency',
      sourceObjectRefId: objectRefId,
      targetObjectRefId: `${DB_NAME}:PROCEDURE:${schema}.${name}`,
      sourceObjectKind: objectKind,
      targetObjectKind: 'PROCEDURE',
      dependencyType: 'EXEC_CALL',
      evidence: er[0].trim().slice(0, 180),
    });
  }

  return deps;
}

function readTextFile(filePath) {
  if (!fs.existsSync(filePath)) return '';
  try {
    return normalizeText(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return '';
  }
}

function processZipExamples() {
  const entries = [];
  const extractedRoot = path.join(DRIVE_ROOT, 'extracted');
  const extractDirs = fs.readdirSync(extractedRoot).filter((d) => {
    const full = path.join(extractedRoot, d);
    return fs.statSync(full).isDirectory() && d !== 'Skrypty_SQL_1_89_HF1' && d !== 'Dokumentacja_bazy_danych_1_89_HF1';
  });

  for (const dirName of extractDirs) {
    const dirPath = path.join(extractedRoot, dirName);
    const files = [];
    const walk = (d) => {
      for (const entry of fs.readdirSync(d)) {
        const fullPath = path.join(d, entry);
        if (fs.statSync(fullPath).isDirectory()) { walk(fullPath); continue; }
        const ext = path.extname(entry).toLowerCase();
        if (['.vbs', '.xml', '.xsd', '.xsl', '.html', '.htm', '.txt', '.cpp', '.h', '.idl', '.sql', '.js', '.css', '.xls', '.doc', '.reg', '.csv', '.json', '.ini', '.config', '.md'].includes(ext)) {
          files.push({ path: fullPath, name: entry, ext });
        }
      }
    };
    walk(dirPath);

    if (files.length === 0) continue;

    for (const f of files) {
      const content = readTextFile(f.path);
      if (!content || content.length < 10) continue;
      const docId = `REF_DOC:INSERT_GT:EXAMPLE:${slugify(dirName)}:${slugify(f.name)}`;
      entries.push({
        doc: {
          id: docId,
          name: `${f.name} (${dirName})`,
          description: `InsERT GT example file from ${dirName}: ${f.name}.`,
          semanticType: 'reference_document',
          sourceFile: path.relative(DRIVE_ROOT, f.path),
          sourceFormat: f.ext.replace('.', ''),
          sourceSection: dirName,
          summary: content.slice(0, 800).replace(/\n/g, ' '),
        },
        chunks: splitLongContent(`${f.name} (${dirName})\n\n${content}`).map((chunkContent, index) => ({
          id: `CHUNK:INSERT_GT:EXAMPLE:${slugify(dirName)}:${slugify(path.relative(dirPath, f.path).replace(/\//g, '_'))}:${index + 1}`,
          name: `${f.name} [${index + 1}]`,
          description: `Example chunk from ${dirName}/${f.name}.`,
          content: chunkContent,
          sourceDocument: path.relative(DRIVE_ROOT, f.path),
          sourceSection: `${dirName}/${f.name}`,
          sourceObjectRefId: docId,
          semanticType: 'chunk',
        })),
      });
    }
  }
  return entries;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: 'InsERT GT extracted SQL scripts + XML documentation + Drive PDFs',
    files: [],
  };

  // Parse XML documentation
  console.log('Parsing XML documentation...');
  const xmlDocs = parseXmlDoc(XML_DOC_PATH);
  console.log(`  Found ${xmlDocs.size} documented tables with ${[...xmlDocs.values()].reduce((sum, t) => sum + t.fields.length, 0)} fields`);

  let dedupDeps;
  const tables = [];
  const allColumns = [];
  const allPKs = [];
  const allFKs = [];
  const allIndexes = [];
  const allConstraints = [];
  const views = [];
  const storedProcedures = [];
  const allParameters = [];
  const allDependencies = [];
  const functions = [];

  if (!HELPER_ONLY) {
  // Parse all table SQL files
  console.log('Parsing table SQL files...');
  const tablesDir = path.join(SQL_ROOT, 'Tables');
  const tableFiles = fs.readdirSync(tablesDir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of tableFiles) {
    const parsed = parseCreateTable(path.join(tablesDir, file));
    if (!parsed || parsed.tableName.startsWith('__')) continue;

    const xmlDoc = xmlDocs.get(parsed.tableName);
    const tableId = `${DB_NAME}:TABLE:${parsed.schema}.${parsed.tableName}`;
    const tableSqlName = `${parsed.schema}.${parsed.tableName}`;

    tables.push({
      id: tableId,
      name: parsed.tableName,
      description: xmlDoc?.description || `Table ${tableSqlName} in InsERT GT database.`,
      semanticType: 'table',
      databaseRefId: `${DB_NAME}:DATABASE`,
      sqlName: tableSqlName,
      schemaName: parsed.schema,
      objectKind: 'TABLE',
      documentationRef: xmlDoc ? `${parsed.tableName}.HTML` : '',
      moduleHint: inferModuleHint(parsed.tableName),
    });

    for (let i = 0; i < parsed.columns.length; i += 1) {
      const col = parsed.columns[i];
      const xmlField = xmlDoc?.fields?.find((f) => f.name === col.name);
      allColumns.push({
        id: `${DB_NAME}:TABLE:${parsed.schema}.${parsed.tableName}:COLUMN:${col.name}`,
        name: col.name,
        description: xmlField?.description || `Column ${col.name} of ${tableSqlName} (${col.dataType}).`,
        semanticType: 'column',
        tableRefId: tableId,
        sqlName: col.name,
        ordinalPosition: String(i + 1),
        dataType: col.dataType,
        fullDataType: col.fullDataType,
        nullable: col.nullable,
        defaultDefinition: col.defaultValue,
        defaultDefinitionAccessState: col.defaultConstraint ? 'ACCESSIBLE' : 'NONE',
        computedDefinition: col.computedDefinition,
        computedDefinitionAccessState: col.computedDefinition ? 'ACCESSIBLE' : 'NONE',
        collationName: '',
        isIdentity: col.isIdentity,
        isComputed: col.isComputed,
        keyRole: col.isPrimaryKey ? 'PRIMARY_KEY' : '',
      });
    }

    if (parsed.pkName && parsed.pkColumns.length > 0) {
      allPKs.push({
        id: `${DB_NAME}:PRIMARY_KEY:${parsed.schema}.${parsed.tableName}.${parsed.pkName}`,
        name: parsed.pkName,
        description: `Primary key ${parsed.pkName} on ${tableSqlName}`,
        semanticType: 'primary_key',
        tableRefId: tableId,
        sqlName: `${parsed.schema}.${parsed.pkName}`,
        columnList: parsed.pkColumns.join(', '),
      });
    }

    for (const fk of parsed.fkRefs) {
      allFKs.push({
        id: `${DB_NAME}:FOREIGN_KEY:${parsed.schema}.${fk.name}`,
        name: fk.name,
        description: `Foreign key ${fk.name} from ${tableSqlName} to ${fk.refSchema}.${fk.refTable}`,
        semanticType: 'foreign_key',
        tableRefId: tableId,
        referencedTableRefId: `${DB_NAME}:TABLE:${fk.refSchema}.${fk.refTable}`,
        sqlName: `${parsed.schema}.${fk.name}`,
        columnMapping: `${fk.column}->${fk.refColumn}`,
        deleteAction: fk.deleteAction,
        updateAction: fk.updateAction,
        isDisabled: 'NO',
      });
    }

    for (const idx of parsed.indexRefs) {
      allIndexes.push({
        id: `${DB_NAME}:INDEX:${parsed.schema}.${parsed.tableName}.${idx.name}`,
        name: idx.name,
        description: `${idx.isUnique === 'UNIQUE' ? 'UNIQUE ' : ''}${idx.type} INDEX ${idx.name} on ${tableSqlName}`,
        semanticType: 'index',
        tableRefId: tableId,
        sqlName: `${parsed.schema}.${idx.name}`,
        indexType: idx.type,
        uniqueness: idx.isUnique,
        columnList: idx.columnList,
        includedColumns: idx.includedColumns,
        filterDefinition: idx.filterDefinition,
      });
    }

    for (const chk of parsed.checkConstraints) {
      allConstraints.push({
        id: `${DB_NAME}:CONSTRAINT:${parsed.schema}.${parsed.tableName}.${chk.name}`,
        name: chk.name,
        description: `CHECK constraint ${chk.name} on ${tableSqlName}`,
        semanticType: 'constraint',
        tableRefId: tableId,
        sqlName: `${parsed.schema}.${chk.name}`,
        constraintType: 'CHECK',
        definition: chk.definition,
        definitionAccessState: 'ACCESSIBLE',
      });
    }
  }

  console.log(`  Parsed ${tables.length} tables, ${allColumns.length} columns, ${allPKs.length} PKs, ${allFKs.length} FKs, ${allIndexes.length} indexes, ${allConstraints.length} check constraints`);

  // Parse views
  console.log('Parsing views...');
  const viewsDir = path.join(SQL_ROOT, 'Views');
  const viewFiles = fs.readdirSync(viewsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of viewFiles) {
    const parsed = parseSqlFile(path.join(viewsDir, file));
    if (!parsed || parsed.name.startsWith('__')) continue;
    const vid = `${DB_NAME}:VIEW:${parsed.schema}.${parsed.name}`;
    const def = parsed.fullText;
    const preview = normalizeText(def).slice(0, 800);
    const hash = createHash('sha256').update(normalizeText(def)).digest('hex');
    views.push({
      id: vid,
      name: parsed.name,
      description: `View ${parsed.schema}.${parsed.name} in InsERT GT database.`,
      semanticType: 'view',
      databaseRefId: `${DB_NAME}:DATABASE`,
      sqlName: `${parsed.schema}.${parsed.name}`,
      schemaName: parsed.schema,
      definition: def,
      definitionPreview: preview,
      definitionHash: hash,
      definitionLength: String(normalizeText(def).length),
      definitionAccessState: def ? 'ACCESSIBLE' : 'INACCESSIBLE',
      isEncrypted: 'NO',
      usesAnsiNulls: '',
      usesQuotedIdentifier: '',
      isSchemaBound: 'NO',
      dependencySummary: '',
    });
  }
  console.log(`  Parsed ${views.length} views`);

  // Parse stored procedures
  console.log('Parsing stored procedures...');
  const spDir = path.join(SQL_ROOT, 'Stored Procedures');
  const spFiles = fs.readdirSync(spDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of spFiles) {
    const parsed = parseSqlFile(path.join(spDir, file));
    if (!parsed || parsed.name.startsWith('__')) continue;
    const def = parsed.fullText;
    const preview = normalizeText(def).slice(0, 800);
    const hash = createHash('sha256').update(normalizeText(def)).digest('hex');
    const spId = `${DB_NAME}:PROCEDURE:${parsed.schema}.${parsed.name}`;
    const params = extractParameters(def, spId, 'PROCEDURE');
    allParameters.push(...params);
    storedProcedures.push({
      id: spId,
      name: parsed.name,
      description: `Stored procedure ${parsed.schema}.${parsed.name} in InsERT GT database.`,
      semanticType: 'stored_procedure',
      databaseRefId: `${DB_NAME}:DATABASE`,
      sqlName: `${parsed.schema}.${parsed.name}`,
      schemaName: parsed.schema,
      definition: def,
      definitionPreview: preview,
      definitionHash: hash,
      definitionLength: String(normalizeText(def).length),
      definitionAccessState: def ? 'ACCESSIBLE' : 'INACCESSIBLE',
      isEncrypted: 'NO',
      usesAnsiNulls: '',
      usesQuotedIdentifier: '',
      isSchemaBound: 'NO',
      parameterCount: String(params.length),
      _def: def,
      _paramsLength: params.length,
    });
  }
  console.log(`  Parsed ${storedProcedures.length} stored procedures, ${allParameters.length} parameters so far`);

  // Parse functions
  console.log('Parsing functions...');
  const funcDir = path.join(SQL_ROOT, 'Functions');
  const funcFiles = fs.readdirSync(funcDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of funcFiles) {
    const parsed = parseSqlFile(path.join(funcDir, file));
    if (!parsed || parsed.name.startsWith('__')) continue;
    const def = parsed.fullText;
    const preview = normalizeText(def).slice(0, 800);
    const hash = createHash('sha256').update(normalizeText(def)).digest('hex');
    const fnId = `${DB_NAME}:FUNCTION:${parsed.schema}.${parsed.name}`;
    const params = extractParameters(def, fnId, 'FUNCTION');
    allParameters.push(...params);
    functions.push({
      id: fnId,
      name: parsed.name,
      description: `Function ${parsed.schema}.${parsed.name} in InsERT GT database.`,
      semanticType: 'function',
      databaseRefId: `${DB_NAME}:DATABASE`,
      sqlName: `${parsed.schema}.${parsed.name}`,
      schemaName: parsed.schema,
      functionType: parsed.fullText.includes('RETURNS TABLE') ? 'TABLE_VALUED' : 'SCALAR',
      definition: def,
      definitionPreview: preview,
      definitionHash: hash,
      definitionLength: String(normalizeText(def).length),
      definitionAccessState: def ? 'ACCESSIBLE' : 'INACCESSIBLE',
      isEncrypted: 'NO',
      usesAnsiNulls: '',
      usesQuotedIdentifier: '',
      isSchemaBound: 'NO',
      parameterCount: String(params.length),
      _def: def,
      _paramsLength: params.length,
    });
  }
  console.log(`  Parsed ${functions.length} functions, ${allParameters.length} total parameters`);

  // Build object dependencies from procedure/function/view definitions
  console.log('Extracting object dependencies...');
  const knownTableIds = new Set(tables.map((t) => t.id));
  const spsForDeps = HELPER_ONLY ? parseCsvRows(path.join(OUTPUT_DIR, 'stored_procedure.csv')) : storedProcedures;
  const fnsForDeps = HELPER_ONLY ? parseCsvRows(path.join(OUTPUT_DIR, 'function.csv')) : functions;
  const vwsForDeps = HELPER_ONLY ? parseCsvRows(path.join(OUTPUT_DIR, 'view.csv')) : views;
  for (const sp of spsForDeps) {
    if (sp.definition) allDependencies.push(...extractObjectDeps(sp.definition, sp.id, 'PROCEDURE', knownTableIds));
  }
  for (const fn of fnsForDeps) {
    if (fn.definition) allDependencies.push(...extractObjectDeps(fn.definition, fn.id, 'FUNCTION', knownTableIds));
  }
  for (const vw of vwsForDeps) {
    if (vw.definition) allDependencies.push(...extractObjectDeps(vw.definition, vw.id, 'VIEW', knownTableIds));
  }
  const dedupDeps2 = [];
  const depSeen2 = new Set();
  for (const dep of allDependencies) {
    const key = `${dep.sourceObjectRefId}|${dep.targetObjectRefId}|${dep.dependencyType}`;
    if (depSeen2.has(key)) continue;
    depSeen2.add(key);
    dedupDeps2.push(dep);
  }
  dedupDeps = dedupDeps2;
  console.log(`  Extracted ${allDependencies.length} raw dependencies, ${dedupDeps2.length} unique`);

  } // end if !HELPER_ONLY

  // Load tables from CSV if HELPER_ONLY
  const tablesForHelpers = HELPER_ONLY
    ? parseCsvRows(path.join(OUTPUT_DIR, 'table.csv'))
    : tables;
  const allFKsForHelpers = HELPER_ONLY
    ? parseCsvRows(path.join(OUTPUT_DIR, 'foreign_key.csv'))
    : allFKs;

  if (HELPER_ONLY) {
    console.log('Extracting object dependencies (helper mode)...');
    const tids = new Set(tablesForHelpers.map((t) => t.id));
    const sps = parseCsvRows(path.join(OUTPUT_DIR, 'stored_procedure.csv'));
    const fns = parseCsvRows(path.join(OUTPUT_DIR, 'function.csv'));
    const vws = parseCsvRows(path.join(OUTPUT_DIR, 'view.csv'));
    const deps = [];
    for (const sp of sps) {
      if (sp.definition) deps.push(...extractObjectDeps(sp.definition, sp.id, 'PROCEDURE', tids));
    }
    for (const fn of fns) {
      if (fn.definition) deps.push(...extractObjectDeps(fn.definition, fn.id, 'FUNCTION', tids));
    }
    for (const vw of vws) {
      if (vw.definition) deps.push(...extractObjectDeps(vw.definition, vw.id, 'VIEW', tids));
    }
    dedupDeps = [];
    const seen = new Set();
    for (const dep of deps) {
      const key = `${dep.sourceObjectRefId}|${dep.targetObjectRefId}|${dep.dependencyType}`;
      if (seen.has(key)) continue;
      seen.add(key);
      dedupDeps.push(dep);
    }
    console.log(`  Extracted ${deps.length} raw deps, ${dedupDeps.length} unique`);
  }

  const databaseInstances = [{
    id: `${DB_NAME}:DATABASE`,
    name: DB_NAME,
    description: `Database metadata entry for ${DB_NAME} in InsERT GT MSSQL.`,
    semanticType: 'database_instance',
    sqlName: DB_NAME,
    databaseRole: 'COMPANY',
    schemaName: 'dbo',
    platform: 'MSSQL',
    engineVersion: '1.89',
  }];

  // Generators (table_query_guide, join_path_guide, sql_object_guide)
  const tablesById = new Map(tablesForHelpers.map((row) => [row.id, row]));
  const inboundMap = new Map();
  const outboundMap = new Map();
  for (const fk of allFKsForHelpers) {
    if (!outboundMap.has(fk.tableRefId)) outboundMap.set(fk.tableRefId, []);
    if (!inboundMap.has(fk.referencedTableRefId)) inboundMap.set(fk.referencedTableRefId, []);
    outboundMap.get(fk.tableRefId).push(fk);
    inboundMap.get(fk.referencedTableRefId).push(fk);
  }

  const tableQueryGuides = tablesForHelpers.map((table) => {
    const outbound = outboundMap.get(table.id) || [];
    const inbound = inboundMap.get(table.id) || [];
    const roleHint = inferTableRole(table.name);
    const outboundCount = outbound.length;
    const inboundCount = inbound.length;
    const importanceHint = outboundCount + inboundCount >= 6 ? 'HIGH' : outboundCount + inboundCount >= 3 ? 'MEDIUM' : 'NORMAL';
    const localJoinColumns = outbound.flatMap((fk) => String(fk.columnMapping || '').split('->')[0]?.trim()).filter(Boolean);
    const referencedJoinColumns = inbound.flatMap((fk) => String(fk.columnMapping || '').split('->')[1]?.trim()).filter(Boolean);
    const joinAnchorColumns = uniqueValues([...localJoinColumns, ...referencedJoinColumns]).join('; ');
    const relatedTableSummary = uniqueValues([
      ...outbound.map((fk) => shortObjectName(tablesById.get(fk.referencedTableRefId)?.sqlName)),
      ...inbound.map((fk) => shortObjectName(tablesById.get(fk.tableRefId)?.sqlName)),
    ], 10).join('; ');
    const queryDesignNote = [
      `Role ${roleHint}. Module ${table.moduleHint}.`,
      `Outbound foreign keys: ${outboundCount}. Inbound foreign keys: ${inboundCount}.`,
      joinAnchorColumns ? `Join anchors: ${joinAnchorColumns}.` : '',
      relatedTableSummary ? `Related tables: ${relatedTableSummary}.` : '',
    ].filter(Boolean).join(' ');

    return {
      id: `TABLE_GUIDE:${slugify(table.id)}`,
      name: `${table.sqlName} Query Guide`,
      description: `Query design helper for table ${table.sqlName}.`,
      semanticType: 'table_query_guide',
      tableRefId: table.id,
      sqlName: table.sqlName,
      moduleHint: table.moduleHint,
      roleHint,
      businessAreaHint: table.moduleHint,
      importanceHint,
      usageCategory: 'QUERY_DESIGN',
      inboundForeignKeyCount: String(inboundCount),
      outboundForeignKeyCount: String(outboundCount),
      joinAnchorColumns,
      relatedTableSummary,
      queryDesignNote,
    };
  });

  const joinPathGuides = allFKsForHelpers.map((fk) => {
    const sourceTable = tablesById.get(fk.tableRefId);
    const targetTable = tablesById.get(fk.referencedTableRefId);
    const sourceName = sourceTable?.sqlName || fk.tableRefId;
    const targetName = targetTable?.sqlName || fk.referencedTableRefId;
    const colMap = String(fk.columnMapping || '');
    const [left, right] = colMap.split('->').map((p) => p?.trim());
    const joinSqlTemplate = left && right
      ? `FROM ${sourceName} src JOIN ${targetName} tgt ON src.${left} = tgt.${right}`
      : `FROM ${sourceName} src JOIN ${targetName} tgt`;
    return {
      id: `JOIN_GUIDE:${slugify(fk.id)}`,
      name: `${shortObjectName(sourceName)} -> ${shortObjectName(targetName)}`,
      description: `Direct join path from ${sourceName} to ${targetName} based on ${fk.sqlName}.`,
      semanticType: 'join_path_guide',
      sourceTableRefId: fk.tableRefId,
      targetTableRefId: fk.referencedTableRefId,
      viaForeignKeyRefId: fk.id,
      pathLength: '1',
      joinKind: 'DIRECT_FOREIGN_KEY',
      joinSqlTemplate,
      confidence: fk.isDisabled === 'YES' ? 'LOW' : 'HIGH',
      useCase: `Use when joining ${shortObjectName(sourceName)} to ${shortObjectName(targetName)} in SQL queries.`,
      notes: `Column mapping ${fk.columnMapping}. Delete ${fk.deleteAction}. Update ${fk.updateAction}.`,
    };
  });

  const sqlObjectGuides = [
    ...(HELPER_ONLY ? parseCsvRows(path.join(OUTPUT_DIR, 'stored_procedure.csv')) : storedProcedures).map((sp) => ({
      id: `SQL_GUIDE:${slugify(sp.id)}`,
      name: `${sp.sqlName} Guide`,
      description: `Query-design helper for stored procedure ${sp.sqlName}.`,
      semanticType: 'sql_object_guide',
      objectRefId: sp.id,
      objectKind: 'STORED_PROCEDURE',
      usageCategory: 'GENERAL_SQL_OBJECT',
      moduleHint: inferModuleHint(sp.name),
      importanceHint: 'NORMAL',
      detectionEvidence: `Procedure ${sp.sqlName}`,
      queryDesignNote: `Stored procedure ${sp.sqlName}.`,
    })),
    ...(HELPER_ONLY ? parseCsvRows(path.join(OUTPUT_DIR, 'function.csv')) : functions).map((fn) => ({
      id: `SQL_GUIDE:${slugify(fn.id)}`,
      name: `${fn.sqlName} Guide`,
      description: `Query-design helper for function ${fn.sqlName}.`,
      semanticType: 'sql_object_guide',
      objectRefId: fn.id,
      objectKind: 'FUNCTION',
      usageCategory: 'GENERAL_SQL_OBJECT',
      moduleHint: inferModuleHint(fn.name),
      importanceHint: 'NORMAL',
      detectionEvidence: `Function ${fn.sqlName}`,
      queryDesignNote: `Function ${fn.sqlName}, type ${fn.functionType}.`,
    })),
    ...(HELPER_ONLY ? parseCsvRows(path.join(OUTPUT_DIR, 'view.csv')) : views).map((vw) => ({
      id: `SQL_GUIDE:${slugify(vw.id)}`,
      name: `${vw.sqlName} Guide`,
      description: `Query-design helper for view ${vw.sqlName}.`,
      semanticType: 'sql_object_guide',
      objectRefId: vw.id,
      objectKind: 'VIEW',
      usageCategory: 'REPORTING_SUPPORT',
      moduleHint: inferModuleHint(vw.name),
      importanceHint: 'MEDIUM',
      detectionEvidence: `View ${vw.sqlName}`,
      queryDesignNote: `View ${vw.sqlName} for reporting support.`,
    })),
  ];

  // Process Drive PDFs → ReferenceDocument + Chunk
  console.log('Converting Drive PDFs to markdown...');
  const pdfFiles = fs.readdirSync(DRIVE_ROOT).filter((f) => f.toLowerCase().endsWith('.pdf')).sort();
  const referenceDocuments = [];
  const allChunks = [];

  for (const pdfFile of pdfFiles) {
    const pdfPath = path.join(DRIVE_ROOT, pdfFile);
    const docId = `REF_DOC:INSERT_GT:${slugify(pdfFile)}`;
    console.log(`  Processing: ${pdfFile}`);
    const markdown = await convertPdfToMarkdown(pdfPath);
    if (!markdown || markdown.length < 20) {
      console.log(`    Skipped (no meaningful text extracted)`);
      continue;
    }

    referenceDocuments.push({
      id: docId,
      name: pdfFile.replace(/\.pdf$/i, ''),
      description: `InsERT GT reference document: ${pdfFile}`,
      semanticType: 'reference_document',
      sourceFile: pdfFile,
      sourceFormat: 'pdf',
      sourceSection: '',
      summary: markdown.slice(0, 800).replace(/\n/g, ' '),
    });

    const chunks = splitLongContent(`${pdfFile.replace(/\.pdf$/i, '')}\n\n${markdown}`);
    chunks.forEach((chunkContent, index) => {
      allChunks.push({
        id: `CHUNK:INSERT_GT:${slugify(pdfFile)}:${index + 1}`,
        name: chunks.length > 1 ? `${pdfFile.replace(/\.pdf$/i, '')} [${index + 1}]` : pdfFile.replace(/\.pdf$/i, ''),
        description: `Documentation chunk from ${pdfFile}.`,
        content: chunkContent,
        sourceDocument: pdfFile,
        sourceSection: pdfFile.replace(/\.pdf$/i, ''),
        sourceObjectRefId: docId,
        semanticType: 'chunk',
      });
    });
  }
  console.log(`  Converted ${referenceDocuments.length} PDF documents into ${allChunks.length} chunks`);

  // Process ZIP example files
  console.log('Processing ZIP example files...');
  const zipEntries = processZipExamples();
  for (const entry of zipEntries) {
    referenceDocuments.push(entry.doc);
    allChunks.push(...entry.chunks);
  }
  console.log(`  Added ${zipEntries.length} example documents, ${zipEntries.reduce((sum, e) => sum + e.chunks.length, 0)} chunks from ZIP archives`);

  // Write all CSVs
  console.log('Writing CSV files...');
  const csvFiles = [
    {
      fileName: 'database_instance.csv',
      headers: ['id', 'name', 'description', 'semanticType', 'sqlName', 'databaseRole', 'schemaName', 'platform', 'engineVersion'],
      rows: databaseInstances,
      baseOnly: true,
    },
    {
      fileName: 'table.csv',
      headers: ['id', 'name', 'description', 'semanticType', 'databaseRefId', 'sqlName', 'schemaName', 'objectKind', 'documentationRef', 'moduleHint'],
      rows: HELPER_ONLY ? [] : tables,
      baseOnly: true,
    },
    {
      fileName: 'column.csv',
      headers: ['id', 'name', 'description', 'semanticType', 'tableRefId', 'sqlName', 'ordinalPosition', 'dataType', 'fullDataType', 'nullable', 'defaultDefinition', 'defaultDefinitionAccessState', 'computedDefinition', 'computedDefinitionAccessState', 'collationName', 'isIdentity', 'isComputed', 'keyRole'],
      rows: HELPER_ONLY ? [] : allColumns,
      baseOnly: true,
    },
    {
      fileName: 'primary_key.csv',
      headers: ['id', 'name', 'description', 'semanticType', 'tableRefId', 'sqlName', 'columnList'],
      rows: HELPER_ONLY ? [] : allPKs,
      baseOnly: true,
    },
    {
      fileName: 'foreign_key.csv',
      headers: ['id', 'name', 'description', 'semanticType', 'tableRefId', 'referencedTableRefId', 'sqlName', 'columnMapping', 'deleteAction', 'updateAction', 'isDisabled'],
      rows: HELPER_ONLY ? [] : allFKs,
      baseOnly: true,
    },
    {
      fileName: 'index.csv',
      headers: ['id', 'name', 'description', 'semanticType', 'tableRefId', 'sqlName', 'indexType', 'uniqueness', 'columnList', 'includedColumns', 'filterDefinition'],
      rows: HELPER_ONLY ? [] : allIndexes,
      baseOnly: true,
    },
    {
      fileName: 'constraint.csv',
      headers: ['id', 'name', 'description', 'semanticType', 'tableRefId', 'sqlName', 'constraintType', 'definition', 'definitionAccessState'],
      rows: HELPER_ONLY ? [] : allConstraints,
      baseOnly: true,
    },
    {
      fileName: 'view.csv',
      headers: ['id', 'name', 'description', 'semanticType', 'databaseRefId', 'sqlName', 'schemaName', 'definition', 'definitionPreview', 'definitionHash', 'definitionLength', 'definitionAccessState', 'isEncrypted', 'usesAnsiNulls', 'usesQuotedIdentifier', 'isSchemaBound', 'dependencySummary'],
      rows: HELPER_ONLY ? [] : views,
      baseOnly: true,
    },
    {
      fileName: 'stored_procedure.csv',
      headers: ['id', 'name', 'description', 'semanticType', 'databaseRefId', 'sqlName', 'schemaName', 'definition', 'definitionPreview', 'definitionHash', 'definitionLength', 'definitionAccessState', 'isEncrypted', 'usesAnsiNulls', 'usesQuotedIdentifier', 'isSchemaBound', 'parameterCount'],
      rows: HELPER_ONLY ? [] : storedProcedures,
      baseOnly: true,
    },
    {
      fileName: 'function.csv',
      headers: ['id', 'name', 'description', 'semanticType', 'databaseRefId', 'sqlName', 'schemaName', 'functionType', 'definition', 'definitionPreview', 'definitionHash', 'definitionLength', 'definitionAccessState', 'isEncrypted', 'usesAnsiNulls', 'usesQuotedIdentifier', 'isSchemaBound', 'parameterCount'],
      rows: HELPER_ONLY ? [] : functions,
      baseOnly: true,
    },
    {
      fileName: 'trigger.csv',
      headers: ['id', 'name', 'description', 'semanticType', 'databaseRefId', 'sqlName', 'schemaName', 'parentObjectRefId', 'triggerScope', 'definition', 'definitionPreview', 'definitionHash', 'definitionLength', 'definitionAccessState', 'isEncrypted', 'usesAnsiNulls', 'usesQuotedIdentifier', 'isSchemaBound'],
      rows: HELPER_ONLY ? [] : [],
      baseOnly: true,
    },
    {
      fileName: 'parameter.csv',
      headers: ['id', 'name', 'description', 'semanticType', 'objectRefId', 'sqlName', 'objectKind', 'ordinalPosition', 'dataType', 'maxLength', 'precisionValue', 'scaleValue', 'isOutput', 'hasDefaultValue'],
      rows: HELPER_ONLY ? [] : allParameters,
      baseOnly: true,
    },
    {
      fileName: 'object_dependency.csv',
      headers: ['id', 'name', 'description', 'semanticType', 'sourceObjectRefId', 'targetObjectRefId', 'sourceObjectKind', 'targetObjectKind', 'dependencyType', 'evidence'],
      rows: dedupDeps,
    },
    {
      fileName: 'table_query_guide.csv',
      headers: ['id', 'name', 'description', 'semanticType', 'tableRefId', 'sqlName', 'moduleHint', 'roleHint', 'businessAreaHint', 'importanceHint', 'usageCategory', 'inboundForeignKeyCount', 'outboundForeignKeyCount', 'joinAnchorColumns', 'relatedTableSummary', 'queryDesignNote'],
      rows: tableQueryGuides,
    },
    {
      fileName: 'join_path_guide.csv',
      headers: ['id', 'name', 'description', 'semanticType', 'sourceTableRefId', 'targetTableRefId', 'viaForeignKeyRefId', 'pathLength', 'joinKind', 'joinSqlTemplate', 'confidence', 'useCase', 'notes'],
      rows: joinPathGuides,
    },
    {
      fileName: 'sql_object_guide.csv',
      headers: ['id', 'name', 'description', 'semanticType', 'objectRefId', 'objectKind', 'usageCategory', 'moduleHint', 'importanceHint', 'detectionEvidence', 'queryDesignNote'],
      rows: sqlObjectGuides,
    },
    {
      fileName: 'reference_document.csv',
      headers: ['id', 'name', 'description', 'semanticType', 'sourceFile', 'sourceFormat', 'sourceSection', 'summary'],
      rows: referenceDocuments,
    },
    {
      fileName: 'chunk.csv',
      headers: ['id', 'name', 'description', 'content', 'sourceDocument', 'sourceSection', 'sourceObjectRefId', 'semanticType'],
      rows: allChunks,
    },
  ];

  for (const csvFile of csvFiles) {
    if (HELPER_ONLY && csvFile.baseOnly) {
      const outPath = path.join(OUTPUT_DIR, csvFile.fileName);
      if (fs.existsSync(outPath)) {
        const existingRows = parseCsvRows(outPath);
        upsertManifestFile(manifest.files, {
          fileName: csvFile.fileName,
          rowCount: existingRows.length,
          columns: csvFile.headers,
        });
      }
      continue;
    }
    const outPath = path.join(OUTPUT_DIR, csvFile.fileName);
    writeCsvRows(outPath, csvFile.headers, csvFile.rows);
    upsertManifestFile(manifest.files, {
      fileName: csvFile.fileName,
      rowCount: csvFile.rows.length,
      columns: csvFile.headers,
    });
    console.log(`  ${csvFile.fileName}: ${csvFile.rows.length} rows`);
  }

  const uniqueChunks = deduplicateIdenticalRowsById(allChunks, 'chunk.csv');
  assertUniqueIds(uniqueChunks, 'chunk.csv');

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  const summaryTables = HELPER_ONLY ? tablesForHelpers.length : tables.length;
  const summaryCols = HELPER_ONLY ? tablesForHelpers.length : allColumns.length;
  const summaryFks = HELPER_ONLY ? allFKsForHelpers.length : allFKs.length;
  const summaryViews = HELPER_ONLY ? parseCsvRows(path.join(OUTPUT_DIR, 'view.csv')).length : views.length;
  const summarySPs = HELPER_ONLY ? parseCsvRows(path.join(OUTPUT_DIR, 'stored_procedure.csv')).length : storedProcedures.length;
  const summaryFuncs = HELPER_ONLY ? parseCsvRows(path.join(OUTPUT_DIR, 'function.csv')).length : functions.length;
  console.log(`\nExport complete. Manifest: ${MANIFEST_FILE}`);
  console.log(`Summary: ${summaryTables} tables, ${summaryCols} columns, ${summaryFks} FKs, ${summaryViews} views, ${summarySPs} SPs, ${summaryFuncs} functions, ${referenceDocuments.length} PDF docs, ${allChunks.length} chunks`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
