#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { loadPromotedKnowledge, makePromotedId } from './lib/promoted_knowledge.mjs';
import { csvEscape } from './lib/export_utils.mjs';
import {
  assertUniqueIds,
  deduplicateIdenticalRowsById,
  nextSectionOccurrence,
  upsertManifestFile,
} from './lib/schema_export_integrity.mjs';
import { readMssqlConnectionString } from './lib/mssql_connection_string.mjs';

const ROOT = '/docker/openspg';
const SQL_FILE = path.join(ROOT, 'docs/reference/ComarchOptimaSchema.extract_metadata.sql');
const OUTPUT_DIR = path.join(ROOT, 'exports/optima_schema/v1');
const MANIFEST_FILE = path.join(OUTPUT_DIR, '_manifest.json');
const CONFIGURATION_DATABASE = process.env.OPTIMA_CONFIGURATION_DATABASE || 'CDN_Konfiguracja';
const TEDIOUS_PATH =
  process.env.TEDIOUS_MODULE_PATH ||
  '/root/.npm/_npx/096058dd12901fb0/node_modules/tedious';
const HELPER_ONLY = process.env.OPENSPG_HELPER_ONLY === '1';
const DOC_CHUNK_MAX = 1800;
const DOC_FILES = [
  path.join(ROOT, 'docs/reference/Struktura_Bazy_2026.4.1.md'),
  path.join(ROOT, 'docs/reference/KB_Struktura_Bazy_Firmowej_2026.4.1.md'),
  path.join(ROOT, 'docs/reference/KB_Struktura_Bazy_Konfiguracyjnej_2026.4.1.md'),
  path.join(ROOT, 'docs/reference/KB_Zmiany_Struktury_Bazy_2026.4.1.md'),
];

if (!/^[A-Za-z0-9_]+$/.test(CONFIGURATION_DATABASE)) {
  throw new Error(`Unsafe OPTIMA_CONFIGURATION_DATABASE: ${CONFIGURATION_DATABASE}`);
}

function parseConnectionString(connectionString) {
  const config = {
    server: 'localhost',
    options: {
      encrypt: true,
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    authentication: {
      type: 'default',
      options: {},
    },
  };

  for (const part of connectionString.split(';').filter(Boolean)) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();

    switch (key) {
      case 'server':
      case 'data source':
        if (value.includes('\\')) {
          const [serverName, instanceName] = value.split('\\');
          config.server = serverName;
          config.options.instanceName = instanceName;
        } else {
          config.server = value;
        }
        break;
      case 'database':
      case 'initial catalog':
        config.options.database = value;
        break;
      case 'user id':
      case 'uid':
        config.authentication.options.userName = value;
        break;
      case 'password':
      case 'pwd':
        config.authentication.options.password = value;
        break;
      case 'encrypt':
        config.options.encrypt = value.toLowerCase() === 'true';
        break;
      case 'trustservercertificate':
        config.options.trustServerCertificate = value.toLowerCase() === 'true';
        break;
      default:
        break;
    }
  }

  return config;
}

function parseExports(sqlText) {
  const exports = [];
  const lines = sqlText.split('\n');
  let current = null;

  for (const line of lines) {
    const fileMatch = line.match(/^--\s+([a-z0-9_]+\.csv)\s*$/i);
    if (fileMatch) {
      if (current && current.queryLines.length > 0) {
        exports.push({
          fileName: current.fileName,
          query: current.queryLines.join('\n').trim(),
        });
      }
      current = { fileName: fileMatch[1], queryLines: [] };
      continue;
    }

    if (!current) continue;
    if (line.startsWith('--')) continue;
    if (line.trim() === '' && current.queryLines.length === 0) continue;

    current.queryLines.push(line);
  }

  if (current && current.queryLines.length > 0) {
    exports.push({
      fileName: current.fileName,
      query: current.queryLines.join('\n').trim(),
    });
  }

  if (exports.length === 0) {
    throw new Error(`No export sections found in ${SQL_FILE}`);
  }

  return exports;
}

function normalizeText(text) {
  return text.replace(/\r/g, '').replace(/\uFEFF/g, '').trim();
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

function splitMarkdownSections(text) {
  const lines = normalizeText(text).split('\n');
  const sections = [];
  let currentTitle = null;
  let currentLines = [];

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+?)\s*$/);
    if (headingMatch) {
      if (currentTitle) {
        sections.push({
          title: currentTitle,
          content: currentLines.join('\n').trim(),
        });
      }
      currentTitle = headingMatch[1].trim();
      currentLines = [];
      continue;
    }

    if (currentTitle) {
      currentLines.push(line);
    }
  }

  if (currentTitle) {
    sections.push({
      title: currentTitle,
      content: currentLines.join('\n').trim(),
    });
  }

  return sections.filter((section) => section.content.length > 0);
}

function splitLongContent(text, maxLength = DOC_CHUNK_MAX) {
  const paragraphs = normalizeText(text)
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return [];

  const chunks = [];
  let current = '';

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= maxLength) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
    }

    if (paragraph.length <= maxLength) {
      current = paragraph;
      continue;
    }

    for (let idx = 0; idx < paragraph.length; idx += maxLength) {
      chunks.push(paragraph.slice(idx, idx + maxLength));
    }
    current = '';
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function deriveSourceObjectRefId(title) {
  const match = title.match(/^([FK])_([A-Za-z0-9_]+)$/);
  if (!match) return '';
  const [, prefix, objectName] = match;
  if (prefix === 'F') {
    return `CDN_TEST:TABLE:CDN.${objectName}`;
  }
  return `${CONFIGURATION_DATABASE}:TABLE:CDN.${objectName}`;
}

function writeCsvRows(outPath, headers, rows) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(','));
  }
  fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');
}

function parseCsvRows(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        field += '"';
        index += 1;
        continue;
      }
      if (char === '"') {
        inQuotes = false;
        continue;
      }
      field += char;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ',') {
      row.push(field);
      field = '';
      continue;
    }
    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    if (char === '\r') {
      continue;
    }
    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) {
    return [];
  }

  const [headers, ...dataRows] = rows;
  return dataRows
    .filter((values) => values.some((value) => value !== ''))
    .map((values) =>
      Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])),
    );
}

function uniqueValues(values, max = 8) {
  return Array.from(new Set(values.filter(Boolean))).slice(0, max);
}

function compactWhitespace(text, maxLength = 320) {
  return normalizeText(String(text || ''))
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

function stripSqlIdentifier(value) {
  return String(value || '')
    .trim()
    .replace(/^[["`]+/, '')
    .replace(/[\]"`]+$/, '');
}

function objectNameFromRefId(refId) {
  const parts = String(refId || '').split(':');
  return parts[parts.length - 1] || '';
}

function shortObjectName(sqlName) {
  return String(sqlName || '').replace(/^CDN\./i, '');
}

const TABLE_CLASS_OVERRIDES = {
  Bazy: {
    moduleHint: 'KONFIGURACJA',
    businessAreaHint: 'CONFIGURATION_ADMIN',
    roleHint: 'MASTER',
  },
  BnkZdarzenia: {
    moduleHint: 'KASA_BANK',
    businessAreaHint: 'BANK_CASH',
    roleHint: 'REGISTER',
  },
  CfgKlucze: {
    moduleHint: 'KONFIGURACJA',
    businessAreaHint: 'CONFIGURATION_ADMIN',
    roleHint: 'DICTIONARY',
  },
  CfgWartosci: {
    moduleHint: 'KONFIGURACJA',
    businessAreaHint: 'CONFIGURATION_ADMIN',
    roleHint: 'CONFIG',
  },
  Centra: {
    moduleHint: 'KADRY_PLACE',
    businessAreaHint: 'HR_PAYROLL',
    roleHint: 'MASTER',
  },
  DaneKadMod: {
    moduleHint: 'KADRY_PLACE',
    businessAreaHint: 'HR_PAYROLL',
    roleHint: 'MASTER',
  },
  DokDefinicje: {
    moduleHint: 'HANDEL',
    businessAreaHint: 'TRADE_DOCUMENTS',
    roleHint: 'DICTIONARY',
  },
  Dzialy: {
    moduleHint: 'KADRY_PLACE',
    businessAreaHint: 'HR_PAYROLL',
    roleHint: 'MASTER',
  },
  Kalendarze: {
    moduleHint: 'KADRY_PLACE',
    businessAreaHint: 'HR_PAYROLL',
    roleHint: 'DICTIONARY',
  },
  Kontrahenci: {
    moduleHint: 'CRM_KONTRAHENCI',
    businessAreaHint: 'CONTRACTORS_CRM',
    roleHint: 'MASTER',
  },
  Magazyny: {
    moduleHint: 'HANDEL_MAGAZYN',
    businessAreaHint: 'PRODUCTS_WAREHOUSE',
    roleHint: 'MASTER',
  },
  MailWiadomosci: {
    moduleHint: 'KONFIGURACJA',
    businessAreaHint: 'CONFIGURATION_ADMIN',
    roleHint: 'MESSAGE',
  },
  Operatorzy: {
    moduleHint: 'KONFIGURACJA',
    businessAreaHint: 'CONFIGURATION_ADMIN',
    roleHint: 'MASTER',
  },
  PodArkuszInwenElem: {
    moduleHint: 'HANDEL_MAGAZYN',
    businessAreaHint: 'PRODUCTS_WAREHOUSE',
    roleHint: 'LINE',
  },
  PodArkuszInwenNag: {
    moduleHint: 'HANDEL_MAGAZYN',
    businessAreaHint: 'PRODUCTS_WAREHOUSE',
    roleHint: 'HEADER',
  },
  PodmiotyView: {
    moduleHint: 'CRM_KONTRAHENCI',
    businessAreaHint: 'CONTRACTORS_CRM',
    roleHint: 'MASTER',
  },
  PracEtaty: {
    moduleHint: 'KADRY_PLACE',
    businessAreaHint: 'HR_PAYROLL',
    roleHint: 'MASTER',
  },
  PracKod: {
    moduleHint: 'KADRY_PLACE',
    businessAreaHint: 'HR_PAYROLL',
    roleHint: 'MASTER',
  },
  RegulyRcp: {
    moduleHint: 'KADRY_PLACE',
    businessAreaHint: 'HR_PAYROLL',
    roleHint: 'DICTIONARY',
  },
  Towary: {
    moduleHint: 'HANDEL_MAGAZYN',
    businessAreaHint: 'PRODUCTS_WAREHOUSE',
    roleHint: 'MASTER',
  },
  TraElem: {
    moduleHint: 'HANDEL',
    businessAreaHint: 'TRADE_DOCUMENTS',
    roleHint: 'LINE',
  },
  TraNag: {
    moduleHint: 'HANDEL',
    businessAreaHint: 'TRADE_DOCUMENTS',
    roleHint: 'HEADER',
  },
  TraNagRelacje: {
    moduleHint: 'HANDEL',
    businessAreaHint: 'TRADE_DOCUMENTS',
    roleHint: 'RELATION',
  },
  TypNieobec: {
    moduleHint: 'KADRY_PLACE',
    businessAreaHint: 'HR_PAYROLL',
    roleHint: 'DICTIONARY',
  },
  TypWyplata: {
    moduleHint: 'KADRY_PLACE',
    businessAreaHint: 'HR_PAYROLL',
    roleHint: 'DICTIONARY',
  },
  VatNag: {
    moduleHint: 'KSIEGOWOSC_COMPLIANCE',
    businessAreaHint: 'COMPLIANCE_ACCOUNTING',
    roleHint: 'HEADER',
  },
  VatTab: {
    moduleHint: 'KSIEGOWOSC_COMPLIANCE',
    businessAreaHint: 'COMPLIANCE_ACCOUNTING',
    roleHint: 'LINE',
  },
  VatTab7: {
    moduleHint: 'KSIEGOWOSC_COMPLIANCE',
    businessAreaHint: 'COMPLIANCE_ACCOUNTING',
    roleHint: 'LINE',
  },
  Wydruki: {
    moduleHint: 'KONFIGURACJA',
    businessAreaHint: 'CONFIGURATION_ADMIN',
    roleHint: 'TEMPLATE',
  },
  Zaklady: {
    moduleHint: 'KADRY_PLACE',
    businessAreaHint: 'HR_PAYROLL',
    roleHint: 'MASTER',
  },
  ZestawyRegul: {
    moduleHint: 'KADRY_PLACE',
    businessAreaHint: 'HR_PAYROLL',
    roleHint: 'MASTER',
  },
  ZestawyRegulElem: {
    moduleHint: 'KADRY_PLACE',
    businessAreaHint: 'HR_PAYROLL',
    roleHint: 'LINE',
  },
  ZestawyTwr: {
    moduleHint: 'HANDEL_MAGAZYN',
    businessAreaHint: 'PRODUCTS_WAREHOUSE',
    roleHint: 'MASTER',
  },
  ZestawyTwrSkladniki: {
    moduleHint: 'HANDEL_MAGAZYN',
    businessAreaHint: 'PRODUCTS_WAREHOUSE',
    roleHint: 'LINE',
  },
};

const MODULE_FALLBACK_MAP = {
  Bnk: 'KASA_BANK',
  Cfg: 'KONFIGURACJA',
  Dek: 'KSIEGOWOSC_COMPLIANCE',
  Dok: 'HANDEL',
  Jpk: 'KSIEGOWOSC_COMPLIANCE',
  Kas: 'KASA_BANK',
  Knt: 'CRM_KONTRAHENCI',
  Kon: 'CRM_KONTRAHENCI',
  Mag: 'HANDEL_MAGAZYN',
  Mail: 'KONFIGURACJA',
  Ope: 'KONFIGURACJA',
  Pra: 'KADRY_PLACE',
  Tra: 'HANDEL',
  Twr: 'HANDEL_MAGAZYN',
  Vat: 'KSIEGOWOSC_COMPLIANCE',
  Wyd: 'KONFIGURACJA',
};

function getTableOverride(name) {
  return TABLE_CLASS_OVERRIDES[String(name || '')] || null;
}

function normalizeModuleFallback(fallback = '') {
  return MODULE_FALLBACK_MAP[String(fallback || '').trim()] || '';
}

function inferModuleHint(name, fallback = '') {
  const normalized = String(name || '');
  const override = getTableOverride(normalized);
  if (override?.moduleHint) return override.moduleHint;
  const mappedFallback = normalizeModuleFallback(fallback);
  if (mappedFallback) return mappedFallback;

  if (/^(Cfg|Ope|Baz|Wyd|Mail)/i.test(normalized) || /^(Operatorzy|Bazy|Wydruki|MailWiadomosci)$/i.test(normalized)) {
    return 'KONFIGURACJA';
  }
  if (/(Jpk|KSeF|Dek|VatNag|VatTab)/i.test(normalized)) return 'KSIEGOWOSC_COMPLIANCE';
  if (/^(Tra|Dok|Par|Wz|Pz|Fz|Fs|Fr|Kai)/i.test(normalized)) return 'HANDEL';
  if (/(Tow|Mag|Dst|Ztw|Twr|Zasob|Inwen|ArkuszInwen|KodyCN|Cennik)/i.test(normalized)) {
    return 'HANDEL_MAGAZYN';
  }
  if (/^(Bnk|Kas)/i.test(normalized)) return 'KASA_BANK';
  if (/(Prac|Wyp|Umow|Etat|Zus|Ppl|Kad|Nieobec|Kalendarz|Dzial|Zaklad|Centra|Rcp)/i.test(normalized)) {
    return 'KADRY_PLACE';
  }
  if (/^(Kon|Knt)/i.test(normalized) || /Podmiot/i.test(normalized)) return 'CRM_KONTRAHENCI';
  return 'OGOLNE';
}

function inferBusinessArea(name) {
  const normalized = String(name || '');
  const override = getTableOverride(normalized);
  if (override?.businessAreaHint) return override.businessAreaHint;

  if (/^(Cfg|Ope|Baz|Wyd|Mail)/i.test(normalized) || /^(Operatorzy|Bazy|Wydruki|MailWiadomosci)$/i.test(normalized)) {
    return 'CONFIGURATION_ADMIN';
  }
  if (/(Jpk|KSeF|Dek|VatNag|VatTab)/i.test(normalized)) {
    return 'COMPLIANCE_ACCOUNTING';
  }
  if (/^(Tra|Dok|Par|Wz|Pz|Fz|Fs|Fr|Kai)/i.test(normalized)) {
    return 'TRADE_DOCUMENTS';
  }
  if (/(Tow|Mag|Dst|Ztw|Twr|Zasob|Inwen|ArkuszInwen|KodyCN|Cennik)/i.test(normalized)) {
    return 'PRODUCTS_WAREHOUSE';
  }
  if (/^(Bnk|Kas)/i.test(normalized)) {
    return 'BANK_CASH';
  }
  if (/(Prac|Wyp|Umow|Etat|ZUS|PIT|Kad|Nieobec|Kalendarz|Dzial|Zaklad|Centra|Rcp)/i.test(normalized)) {
    return 'HR_PAYROLL';
  }
  if (/^(Kon|Knt)/i.test(normalized) || /Podmiot/i.test(normalized)) {
    return 'CONTRACTORS_CRM';
  }
  return 'GENERAL_ERP';
}

function inferTableRole(name, outboundCount, inboundCount) {
  const normalized = String(name || '');
  const override = getTableOverride(normalized);
  if (override?.roleHint) return override.roleHint;

  if (/(Nag|Header|Hdr)$/i.test(normalized) || /^TraNag$/i.test(normalized)) return 'HEADER';
  if (/(Elem|Pozyc|SElem|SubElem|Sklad)/i.test(normalized)) return 'LINE';
  if (/(Klucze|Wartosci|Definicje|Typy|Statusy|Kategorie|Slown|Kody|Cechy|Kalendarze|FormyPlatnosci|TypNieobec|TypWyplata)/i.test(normalized)) {
    return 'DICTIONARY';
  }
  if (/(Atrybuty|Relacje|Powiazania|Linki|Mapowania)/i.test(normalized)) return 'RELATION';
  if (/(Historia|Hist|Log)/i.test(normalized)) return 'HISTORY';
  if (/(Wydruki|Szablony|Raporty|Raport)/i.test(normalized)) return 'TEMPLATE';
  if (/(MailWiadomosci|Wiadomosci|Watek)/i.test(normalized)) return 'MESSAGE';
  if (/^(Cfg|Konfig|Operatorzy|Bazy|Parametry)/i.test(normalized)) return 'CONFIG';
  if (/^(Kontrahenci|Towary|Magazyny|Operatorzy|Bazy|PracEtaty|PracKod|Konta)/i.test(normalized)) {
    return 'MASTER';
  }
  if (/^(Tra|Dok|Vat|Bnk|Kas|Prac)/i.test(normalized) && (outboundCount > 0 || inboundCount > 0)) {
    return 'REGISTER';
  }
  return 'OTHER';
}

function inferImportance(roleHint, inboundCount, outboundCount) {
  const total = Number(inboundCount) + Number(outboundCount);
  if (['HEADER', 'LINE', 'MASTER', 'REGISTER'].includes(roleHint) || total >= 6) return 'HIGH';
  if (['CONFIG', 'DICTIONARY', 'RELATION', 'TEMPLATE'].includes(roleHint) || total >= 3) {
    return 'MEDIUM';
  }
  return 'NORMAL';
}

function classifySqlObject(name, objectKind, preview) {
  const haystack = `${name} ${preview || ''}`;

  if (/(Sprint|Wydruk|GetReport|GetPaymentTable|GetVATTable|Pieczatka)/i.test(haystack)) {
    return { usageCategory: 'SPRINT_PRINT', importanceHint: 'HIGH' };
  }
  if (/(Jpk|KSeF|Deklar)/i.test(haystack)) {
    return { usageCategory: 'COMPLIANCE_REPORTING', importanceHint: 'HIGH' };
  }
  if (/(Atrybut|Pobierz|Wartosc|Makra|Wymiar|Lista|Format|Parametr)/i.test(haystack)) {
    return { usageCategory: 'SPECIAL_FUNCTION', importanceHint: 'MEDIUM' };
  }
  if (/(Import|Eksport|Mobile|ESKLEP|Sync|Synchron|Xml|API)/i.test(haystack)) {
    return { usageCategory: 'IMPORT_EXPORT', importanceHint: 'MEDIUM' };
  }
  if (/(Mail|Powiad|Termin|Zadani|Workflow)/i.test(haystack)) {
    return { usageCategory: 'WORKFLOW_INTEGRATION', importanceHint: 'MEDIUM' };
  }
  if (objectKind === 'VIEW') {
    return { usageCategory: 'REPORTING_SUPPORT', importanceHint: 'MEDIUM' };
  }
  return { usageCategory: 'GENERAL_SQL_OBJECT', importanceHint: 'NORMAL' };
}

function buildDbObjectLookups() {
  const sources = [
    { fileName: 'table.csv', kind: 'TABLE' },
    { fileName: 'view.csv', kind: 'VIEW' },
    { fileName: 'stored_procedure.csv', kind: 'PROCEDURE' },
    { fileName: 'function.csv', kind: 'FUNCTION' },
    { fileName: 'trigger.csv', kind: 'TRIGGER' },
  ];
  const dbLookups = new Map();

  function ensureDb(dbRefId) {
    if (!dbLookups.has(dbRefId)) {
      dbLookups.set(dbRefId, {
        byExactSqlName: new Map(),
        byBareName: new Map(),
      });
    }
    return dbLookups.get(dbRefId);
  }

  for (const source of sources) {
    for (const row of parseCsvRows(path.join(OUTPUT_DIR, source.fileName))) {
      const databaseRefId = row.databaseRefId || (row.id || '').split(':').slice(0, 2).join(':');
      const exactSqlName = stripSqlIdentifier(row.sqlName);
      const bareName = stripSqlIdentifier(row.name || shortObjectName(row.sqlName));
      const objectInfo = {
        id: row.id,
        kind: source.kind,
        sqlName: exactSqlName,
        bareName,
        databaseRefId,
      };
      const lookup = ensureDb(databaseRefId);
      lookup.byExactSqlName.set(exactSqlName.toUpperCase(), objectInfo);
      if (!lookup.byBareName.has(bareName.toUpperCase())) {
        lookup.byBareName.set(bareName.toUpperCase(), []);
      }
      lookup.byBareName.get(bareName.toUpperCase()).push(objectInfo);
    }
  }

  return dbLookups;
}

function resolveSqlRef(rawRef, databaseRefId, dbLookups, allowedKinds = []) {
  if (!rawRef) return null;
  const cleaned = String(rawRef)
    .trim()
    .replace(/[),;]+$/g, '')
    .replace(/^(?:AS\s+)?/i, '');
  if (!cleaned || cleaned.startsWith('#') || cleaned.startsWith('@') || cleaned.startsWith('(')) {
    return null;
  }

  const lookup = dbLookups.get(databaseRefId);
  if (!lookup) return null;

  const parts = cleaned
    .split('.')
    .map((part) => stripSqlIdentifier(part))
    .filter(Boolean);
  if (parts.length === 0) return null;

  const candidateSqlNames = [];
  if (parts.length >= 2) {
    candidateSqlNames.push(`${parts[parts.length - 2]}.${parts[parts.length - 1]}`);
  }
  if (parts.length >= 3) {
    candidateSqlNames.push(`${parts[parts.length - 2]}.${parts[parts.length - 1]}`);
  }

  for (const candidate of candidateSqlNames) {
    const direct = lookup.byExactSqlName.get(candidate.toUpperCase());
    if (direct && (allowedKinds.length === 0 || allowedKinds.includes(direct.kind))) {
      return direct;
    }
  }

  const bareName = parts[parts.length - 1].toUpperCase();
  const candidates = (lookup.byBareName.get(bareName) || []).filter(
    (item) => allowedKinds.length === 0 || allowedKinds.includes(item.kind),
  );
  if (candidates.length === 1) {
    return candidates[0];
  }
  return null;
}

function extractRegexRefs(definition, regex, databaseRefId, dbLookups, allowedKinds) {
  const refs = [];
  for (const match of definition.matchAll(regex)) {
    const rawRef = match[1];
    const target = resolveSqlRef(rawRef, databaseRefId, dbLookups, allowedKinds);
    if (target) {
      refs.push({
        rawRef: compactWhitespace(rawRef, 180),
        target,
      });
    }
  }
  return refs;
}

function buildObjectDependencyRows() {
  const existingPath = path.join(OUTPUT_DIR, 'object_dependency.csv');
  const existingRows = fs.existsSync(existingPath) ? parseCsvRows(existingPath) : [];
  const dbLookups = buildDbObjectLookups();
  const seen = new Set();
  const rows = [];
  const sourceObjects = [
    ...parseCsvRows(path.join(OUTPUT_DIR, 'stored_procedure.csv')).map((row) => ({
      ...row,
      objectKind: 'PROCEDURE',
    })),
    ...parseCsvRows(path.join(OUTPUT_DIR, 'function.csv')).map((row) => ({
      ...row,
      objectKind: 'FUNCTION',
    })),
    ...parseCsvRows(path.join(OUTPUT_DIR, 'view.csv')).map((row) => ({
      ...row,
      objectKind: 'VIEW',
    })),
    ...parseCsvRows(path.join(OUTPUT_DIR, 'trigger.csv')).map((row) => ({
      ...row,
      objectKind: 'TRIGGER',
    })),
  ];

  function pushRow(row) {
    const dedupeKey = `${row.sourceObjectRefId}|${row.targetObjectRefId}|${row.dependencyType}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    rows.push(row);
  }

  for (const row of existingRows) {
    pushRow(row);
  }

  for (const source of sourceObjects) {
    const definition = String(source.definition || '');
    const databaseRefId = source.databaseRefId;
    const sourceName = source.sqlName;

    const reads = [
      ...extractRegexRefs(
        definition,
        /\b(?:FROM|JOIN|APPLY)\s+((?:\[[^\]]+\]|\w+|#\w+)(?:\.(?:\[[^\]]+\]|\w+)){0,2})/gi,
        databaseRefId,
        dbLookups,
        ['TABLE', 'VIEW'],
      ),
      ...extractRegexRefs(
        definition,
        /\bDELETE\s+FROM\s+((?:\[[^\]]+\]|\w+|#\w+)(?:\.(?:\[[^\]]+\]|\w+)){0,2})/gi,
        databaseRefId,
        dbLookups,
        ['TABLE', 'VIEW'],
      ),
    ];

    const writes = [
      ...extractRegexRefs(
        definition,
        /\bINSERT\s+INTO\s+((?:\[[^\]]+\]|\w+|#\w+)(?:\.(?:\[[^\]]+\]|\w+)){0,2})/gi,
        databaseRefId,
        dbLookups,
        ['TABLE', 'VIEW'],
      ),
      ...extractRegexRefs(
        definition,
        /\bUPDATE\s+((?:\[[^\]]+\]|\w+|#\w+)(?:\.(?:\[[^\]]+\]|\w+)){0,2})/gi,
        databaseRefId,
        dbLookups,
        ['TABLE', 'VIEW'],
      ),
      ...extractRegexRefs(
        definition,
        /\bMERGE\s+((?:\[[^\]]+\]|\w+|#\w+)(?:\.(?:\[[^\]]+\]|\w+)){0,2})/gi,
        databaseRefId,
        dbLookups,
        ['TABLE', 'VIEW'],
      ),
      ...extractRegexRefs(
        definition,
        /\bDELETE\s+FROM\s+((?:\[[^\]]+\]|\w+|#\w+)(?:\.(?:\[[^\]]+\]|\w+)){0,2})/gi,
        databaseRefId,
        dbLookups,
        ['TABLE', 'VIEW'],
      ),
    ];

    const procedureCalls = extractRegexRefs(
      definition,
      /\bEXEC(?:UTE)?\s+((?:\[[^\]]+\]|\w+)(?:\.(?:\[[^\]]+\]|\w+)){0,2})/gi,
      databaseRefId,
      dbLookups,
      ['PROCEDURE'],
    );

    const functionCalls = extractRegexRefs(
      definition,
      /\b((?:\[[^\]]+\]|\w+)\.(?:\[[^\]]+\]|\w+))\s*\(/gi,
      databaseRefId,
      dbLookups,
      ['FUNCTION'],
    );

    for (const read of reads) {
      if (read.target.id === source.id) continue;
      pushRow({
        id: `DEP:${slugify(source.id)}:READ:${slugify(read.target.id)}`,
        name: `${sourceName} reads ${read.target.sqlName}`,
        description: `Definition-derived read dependency from ${sourceName} to ${read.target.sqlName}.`,
        semanticType: 'object_dependency',
        sourceObjectRefId: source.id,
        targetObjectRefId: read.target.id,
        sourceObjectKind: source.objectKind,
        targetObjectKind: read.target.kind,
        dependencyType: 'SQL_READ',
        evidence: read.rawRef,
      });
    }

    for (const write of writes) {
      if (write.target.id === source.id) continue;
      pushRow({
        id: `DEP:${slugify(source.id)}:WRITE:${slugify(write.target.id)}`,
        name: `${sourceName} writes ${write.target.sqlName}`,
        description: `Definition-derived write dependency from ${sourceName} to ${write.target.sqlName}.`,
        semanticType: 'object_dependency',
        sourceObjectRefId: source.id,
        targetObjectRefId: write.target.id,
        sourceObjectKind: source.objectKind,
        targetObjectKind: write.target.kind,
        dependencyType: 'SQL_WRITE',
        evidence: write.rawRef,
      });
    }

    for (const call of procedureCalls) {
      if (call.target.id === source.id) continue;
      pushRow({
        id: `DEP:${slugify(source.id)}:EXEC:${slugify(call.target.id)}`,
        name: `${sourceName} execs ${call.target.sqlName}`,
        description: `Definition-derived procedure call from ${sourceName} to ${call.target.sqlName}.`,
        semanticType: 'object_dependency',
        sourceObjectRefId: source.id,
        targetObjectRefId: call.target.id,
        sourceObjectKind: source.objectKind,
        targetObjectKind: call.target.kind,
        dependencyType: 'EXEC_CALL',
        evidence: call.rawRef,
      });
    }

    for (const call of functionCalls) {
      if (call.target.id === source.id) continue;
      pushRow({
        id: `DEP:${slugify(source.id)}:FUNC:${slugify(call.target.id)}`,
        name: `${sourceName} uses ${call.target.sqlName}`,
        description: `Definition-derived function call from ${sourceName} to ${call.target.sqlName}.`,
        semanticType: 'object_dependency',
        sourceObjectRefId: source.id,
        targetObjectRefId: call.target.id,
        sourceObjectKind: source.objectKind,
        targetObjectKind: call.target.kind,
        dependencyType: 'FUNCTION_CALL',
        evidence: call.rawRef,
      });
    }
  }

  return rows;
}

function buildTableQueryGuideRows() {
  const tableRows = parseCsvRows(path.join(OUTPUT_DIR, 'table.csv'));
  const foreignKeyRows = parseCsvRows(path.join(OUTPUT_DIR, 'foreign_key.csv'));
  const tablesById = new Map(tableRows.map((row) => [row.id, row]));
  const inboundMap = new Map();
  const outboundMap = new Map();

  for (const fk of foreignKeyRows) {
    if (!outboundMap.has(fk.tableRefId)) outboundMap.set(fk.tableRefId, []);
    if (!inboundMap.has(fk.referencedTableRefId)) inboundMap.set(fk.referencedTableRefId, []);
    outboundMap.get(fk.tableRefId).push(fk);
    inboundMap.get(fk.referencedTableRefId).push(fk);
  }

  return tableRows.map((table) => {
    const outbound = outboundMap.get(table.id) || [];
    const inbound = inboundMap.get(table.id) || [];
    const roleHint = inferTableRole(table.name, outbound.length, inbound.length);
    const businessAreaHint = inferBusinessArea(table.name);
    const importanceHint = inferImportance(roleHint, inbound.length, outbound.length);
    const localJoinColumns = outbound.flatMap((fk) =>
      String(fk.columnMapping || '')
        .split(/\s*;\s*/)
        .map((mapping) => mapping.split('->')[0]?.trim())
        .filter(Boolean),
    );
    const referencedJoinColumns = inbound.flatMap((fk) =>
      String(fk.columnMapping || '')
        .split(/\s*;\s*/)
        .map((mapping) => mapping.split('->')[1]?.trim())
        .filter(Boolean),
    );
    const joinAnchorColumns = uniqueValues([...localJoinColumns, ...referencedJoinColumns]).join('; ');
    const relatedTableSummary = uniqueValues([
      ...outbound.map((fk) => shortObjectName(tablesById.get(fk.referencedTableRefId)?.sqlName)),
      ...inbound.map((fk) => shortObjectName(tablesById.get(fk.tableRefId)?.sqlName)),
    ], 10).join('; ');
    const queryDesignNote = [
      `Role ${roleHint} in ${businessAreaHint}.`,
      `Outbound foreign keys: ${outbound.length}.`,
      `Inbound foreign keys: ${inbound.length}.`,
      joinAnchorColumns ? `Join anchors: ${joinAnchorColumns}.` : '',
      relatedTableSummary ? `Related tables: ${relatedTableSummary}.` : '',
      table.documentationRef ? `Documentation ref: ${table.documentationRef}.` : '',
    ]
      .filter(Boolean)
      .join(' ');

    return {
      id: `TABLE_GUIDE:${slugify(table.id)}`,
      name: `${table.sqlName} Query Guide`,
      description: `Query design helper for table ${table.sqlName}.`,
      semanticType: 'table_query_guide',
      tableRefId: table.id,
      sqlName: table.sqlName,
      moduleHint: inferModuleHint(table.name, table.moduleHint),
      roleHint,
      businessAreaHint,
      importanceHint,
      usageCategory: 'QUERY_DESIGN',
      inboundForeignKeyCount: String(inbound.length),
      outboundForeignKeyCount: String(outbound.length),
      joinAnchorColumns,
      relatedTableSummary,
      queryDesignNote,
    };
  });
}

function buildJoinSqlTemplate(sourceSqlName, targetSqlName, columnMapping) {
  const mappings = String(columnMapping || '')
    .split(/\s*;\s*/)
    .map((mapping) => mapping.trim())
    .filter(Boolean);
  const conditions = mappings
    .map((mapping) => {
      const [left, right] = mapping.split('->').map((part) => part?.trim());
      if (!left || !right) return '';
      return `src.${left} = tgt.${right}`;
    })
    .filter(Boolean);

  if (conditions.length === 0) {
    return `FROM ${sourceSqlName} src JOIN ${targetSqlName} tgt`;
  }
  return `FROM ${sourceSqlName} src JOIN ${targetSqlName} tgt ON ${conditions.join(' AND ')}`;
}

function buildCuratedJoinRouteRows(tablesById, foreignKeyRows) {
  const tableRows = Array.from(tablesById.values());
  const tablesByDbAndSqlName = new Map(
    tableRows.map((row) => [`${row.databaseRefId}|${row.sqlName}`, row]),
  );
  const tablesBySqlName = new Map();
  for (const row of tableRows) {
    if (!tablesBySqlName.has(row.sqlName)) {
      tablesBySqlName.set(row.sqlName, []);
    }
    tablesBySqlName.get(row.sqlName).push(row);
  }
  const fksById = new Map(foreignKeyRows.map((row) => [row.id, row]));
  const curatedRoutes = [
    {
      id: 'trade_document_header_lines',
      sourceSqlName: 'CDN.TraNag',
      targetSqlName: 'CDN.TraElem',
      pathLength: '1',
      joinKind: 'CURATED_BUSINESS_ROUTE',
      joinSqlTemplate:
        'FROM CDN.TraNag nag JOIN CDN.TraElem elem ON elem.TrE_TrNId = nag.TrN_TrNID',
      confidence: 'HIGH',
      useCase:
        'Use when expanding a commercial document header into document lines for Sprint prints and custom SQL outputs.',
      notes:
        'Business route Header -> Lines. Reverse of FK_TrETraNag. Primary path for trade-document detail queries.',
      viaForeignKeyRefId: 'CDN_TEST:FOREIGN_KEY:CDN.FK_TrETraNag',
    },
    {
      id: 'trade_document_line_product',
      sourceSqlName: 'CDN.TraElem',
      targetSqlName: 'CDN.Towary',
      pathLength: '1',
      joinKind: 'CURATED_BUSINESS_ROUTE',
      joinSqlTemplate:
        'FROM CDN.TraElem elem JOIN CDN.Towary twr ON elem.TrE_TwrId = twr.Twr_TwrId',
      confidence: 'HIGH',
      useCase:
        'Use when resolving line items to product master data in sales, warehouse, and Sprint report queries.',
      notes:
        'Business route Line -> Product. Direct product resolution for document positions.',
      viaForeignKeyRefId: 'CDN_TEST:FOREIGN_KEY:CDN.FK_TrETowar',
    },
    {
      id: 'trade_document_header_definition',
      sourceSqlName: 'CDN.TraNag',
      targetSqlName: 'CDN.DokDefinicje',
      pathLength: '1',
      joinKind: 'CURATED_BUSINESS_ROUTE',
      joinSqlTemplate:
        'FROM CDN.TraNag nag JOIN CDN.DokDefinicje def ON nag.TrN_DDfId = def.DDf_DDfID',
      confidence: 'HIGH',
      useCase:
        'Use when classifying commercial documents by Optima document definition, symbol, or behavior.',
      notes:
        'Business route Header -> Document definition. Useful for filtering document families in Sprint.',
      viaForeignKeyRefId: 'CDN_TEST:FOREIGN_KEY:CDN.FK_TrNDokDef',
    },
    {
      id: 'trade_document_header_buyer',
      sourceSqlName: 'CDN.TraNag',
      targetSqlName: 'CDN.PodmiotyView',
      pathLength: '1',
      joinKind: 'CURATED_BUSINESS_ROUTE',
      joinSqlTemplate:
        'FROM CDN.TraNag nag JOIN CDN.PodmiotyView pod ON nag.TrN_PodID = pod.Pod_PodId AND nag.TrN_PodmiotTyp = pod.Pod_PodmiotTyp',
      confidence: 'HIGH',
      useCase:
        'Use when resolving the buyer or main business party for a commercial document.',
      notes:
        'Business route Header -> Business party. Uses buyer path from FK_TrNPodmiot.',
      viaForeignKeyRefId: 'CDN_TEST:FOREIGN_KEY:CDN.FK_TrNPodmiot',
    },
    {
      id: 'trade_document_header_payer',
      sourceSqlName: 'CDN.TraNag',
      targetSqlName: 'CDN.PodmiotyView',
      pathLength: '1',
      joinKind: 'CURATED_BUSINESS_ROUTE',
      joinSqlTemplate:
        'FROM CDN.TraNag nag JOIN CDN.PodmiotyView plat ON nag.TrN_PlatnikID = plat.Pod_PodId AND nag.TrN_PlatnikTyp = plat.Pod_PodmiotTyp',
      confidence: 'HIGH',
      useCase:
        'Use when resolving the payer for a commercial document separately from the buyer.',
      notes:
        'Business route Header -> Payer. Uses payer path from FK_TrNPlatnik.',
      viaForeignKeyRefId: 'CDN_TEST:FOREIGN_KEY:CDN.FK_TrNPlatnik',
    },
    {
      id: 'trade_document_products',
      sourceSqlName: 'CDN.TraNag',
      targetSqlName: 'CDN.Towary',
      pathLength: '2',
      joinKind: 'CURATED_MULTI_HOP',
      joinSqlTemplate:
        'FROM CDN.TraNag nag JOIN CDN.TraElem elem ON elem.TrE_TrNId = nag.TrN_TrNID JOIN CDN.Towary twr ON elem.TrE_TwrId = twr.Twr_TwrId',
      confidence: 'HIGH',
      useCase:
        'Use when retrieving all products present on a commercial document without writing the multi-hop path from scratch.',
      notes:
        'Business route Header -> Lines -> Product. Core document-content traversal for Sprint and custom reports.',
      viaForeignKeyRefId: '',
    },
    {
      id: 'bank_event_business_party',
      sourceSqlName: 'CDN.BnkZdarzenia',
      targetSqlName: 'CDN.PodmiotyView',
      pathLength: '1',
      joinKind: 'CURATED_BUSINESS_ROUTE',
      joinSqlTemplate:
        'FROM CDN.BnkZdarzenia bzd JOIN CDN.PodmiotyView pod ON bzd.BZd_PodmiotID = pod.Pod_PodId AND bzd.BZd_PodmiotTyp = pod.Pod_PodmiotTyp',
      confidence: 'HIGH',
      useCase:
        'Use when resolving the business party attached to a bank or cash event.',
      notes:
        'Business route Bank event -> Business party. Useful for settlements and cashflow reporting.',
      viaForeignKeyRefId: 'CDN_TEST:FOREIGN_KEY:CDN.FK_BZdPodmiot',
    },
    {
      id: 'bank_event_definition',
      sourceSqlName: 'CDN.BnkZdarzenia',
      targetSqlName: 'CDN.DokDefinicje',
      pathLength: '1',
      joinKind: 'CURATED_BUSINESS_ROUTE',
      joinSqlTemplate:
        'FROM CDN.BnkZdarzenia bzd JOIN CDN.DokDefinicje def ON bzd.BZd_DDfID = def.DDf_DDfID',
      confidence: 'HIGH',
      useCase:
        'Use when grouping bank events by their document definition or bank-document behavior.',
      notes:
        'Business route Bank event -> Document definition.',
      viaForeignKeyRefId: 'CDN_TEST:FOREIGN_KEY:CDN.FK_BZdDokDefinicja',
    },
    {
      id: 'vat_register_lines',
      sourceSqlName: 'CDN.VatNag',
      targetSqlName: 'CDN.VatTab',
      pathLength: '1',
      joinKind: 'CURATED_BUSINESS_ROUTE',
      joinSqlTemplate:
        'FROM CDN.VatNag van JOIN CDN.VatTab vat ON vat.VaT_VaNID = van.VaN_VaNID',
      confidence: 'HIGH',
      useCase:
        'Use when expanding a VAT register header into detailed VAT positions or categories.',
      notes:
        'Business route VAT header -> VAT lines. Reverse of FK_VaTVatNag.',
      viaForeignKeyRefId: 'CDN_TEST:FOREIGN_KEY:CDN.FK_VaTVatNag',
    },
    {
      id: 'employee_person',
      sourceSqlName: 'CDN.PracEtaty',
      targetSqlName: 'CDN.PracKod',
      pathLength: '1',
      joinKind: 'CURATED_BUSINESS_ROUTE',
      joinSqlTemplate:
        'FROM CDN.PracEtaty etat JOIN CDN.PracKod prac ON etat.PRE_PraId = prac.PRA_PraId',
      confidence: 'HIGH',
      useCase:
        'Use when resolving an employment record to the core employee/person entry.',
      notes:
        'Business route Employment -> Employee code/person. Canonical HR join path.',
      viaForeignKeyRefId: 'CDN_TEST:FOREIGN_KEY:CDN.FK_PREPraLink',
    },
    {
      id: 'company_config_key_value',
      sourceSqlName: 'CDN.CfgWartosci',
      targetSqlName: 'CDN.CfgKlucze',
      pathLength: '1',
      joinKind: 'CURATED_BUSINESS_ROUTE',
      joinSqlTemplate:
        'FROM CDN.CfgWartosci cfgw JOIN CDN.CfgKlucze cfgk ON cfgw.CFW_CfkId = cfgk.CFK_CfkId',
      confidence: 'HIGH',
      useCase:
        'Use when resolving a company-level configuration value to its configuration key and semantic meaning.',
      notes:
        'Business route Config value -> Config key in company database.',
      viaForeignKeyRefId: 'CDN_TEST:FOREIGN_KEY:CDN.FK_CFWCfkLink',
    },
    {
      id: 'global_config_key_value',
      sourceSqlName: 'CDN.CfgWartosci',
      targetSqlName: 'CDN.CfgKlucze',
      databaseRefId: `${CONFIGURATION_DATABASE}:DATABASE`,
      pathLength: '1',
      joinKind: 'CURATED_BUSINESS_ROUTE',
      joinSqlTemplate:
        'FROM CDN.CfgWartosci cfgw JOIN CDN.CfgKlucze cfgk ON cfgw.CFW_CfkId = cfgk.CFK_CfkId',
      confidence: 'HIGH',
      useCase:
        'Use when resolving a global configuration value to its configuration key in the configuration database.',
      notes:
        'Business route Config value -> Config key in configuration database.',
      viaForeignKeyRefId: `${CONFIGURATION_DATABASE}:FOREIGN_KEY:CDN.FK_CFWCfkLink`,
    },
  ];

  return curatedRoutes
    .map((route) => {
      const sourceTable = route.databaseRefId
        ? tablesByDbAndSqlName.get(`${route.databaseRefId}|${route.sourceSqlName}`)
        : (tablesBySqlName.get(route.sourceSqlName) || [])[0];
      const targetTable = route.databaseRefId
        ? tablesByDbAndSqlName.get(`${route.databaseRefId}|${route.targetSqlName}`)
        : (tablesBySqlName.get(route.targetSqlName) || [])[0];
      if (!sourceTable || !targetTable) return null;
      const viaFk = route.viaForeignKeyRefId ? fksById.get(route.viaForeignKeyRefId) : null;
      return {
        id: `JOIN_GUIDE:curated:${route.id}`,
        name: `${route.sourceSqlName} -> ${route.targetSqlName}`,
        description: `Curated business join path from ${route.sourceSqlName} to ${route.targetSqlName}.`,
        semanticType: 'join_path_guide',
        sourceTableRefId: sourceTable.id,
        targetTableRefId: targetTable.id,
        viaForeignKeyRefId: route.viaForeignKeyRefId,
        pathLength: route.pathLength,
        joinKind: route.joinKind,
        joinSqlTemplate: route.joinSqlTemplate,
        confidence: route.confidence,
        useCase: route.useCase,
        notes: viaFk
          ? `${route.notes} Backing FK mapping ${viaFk.columnMapping}.`
          : route.notes,
      };
    })
    .filter(Boolean);
}

function buildJoinPathGuideRows() {
  const tableRows = parseCsvRows(path.join(OUTPUT_DIR, 'table.csv'));
  const foreignKeyRows = parseCsvRows(path.join(OUTPUT_DIR, 'foreign_key.csv'));
  const tablesById = new Map(tableRows.map((row) => [row.id, row]));
  const directRows = foreignKeyRows.map((fk) => {
    const sourceTable = tablesById.get(fk.tableRefId);
    const targetTable = tablesById.get(fk.referencedTableRefId);
    const sourceName = sourceTable?.sqlName || fk.tableRefId;
    const targetName = targetTable?.sqlName || fk.referencedTableRefId;

    return {
      id: `JOIN_GUIDE:${slugify(fk.id)}`,
      name: `${sourceName} -> ${targetName}`,
      description: `Direct join path from ${sourceName} to ${targetName} based on ${fk.sqlName}.`,
      semanticType: 'join_path_guide',
      sourceTableRefId: fk.tableRefId,
      targetTableRefId: fk.referencedTableRefId,
      viaForeignKeyRefId: fk.id,
      pathLength: '1',
      joinKind: 'DIRECT_FOREIGN_KEY',
      joinSqlTemplate: buildJoinSqlTemplate(sourceName, targetName, fk.columnMapping),
      confidence: fk.isDisabled === 'YES' ? 'LOW' : 'HIGH',
      useCase: `Use when joining ${shortObjectName(sourceName)} to ${shortObjectName(targetName)} in structure-driven SQL design.`,
      notes: `Column mapping ${fk.columnMapping}. Delete ${fk.deleteAction}. Update ${fk.updateAction}.`,
    };
  });
  const curatedRows = buildCuratedJoinRouteRows(tablesById, foreignKeyRows);
  return [...directRows, ...curatedRows];
}

function buildSqlObjectGuideRows(dependencyRows = []) {
  const sources = [
    { fileName: 'stored_procedure.csv', objectKind: 'STORED_PROCEDURE' },
    { fileName: 'function.csv', objectKind: 'FUNCTION' },
    { fileName: 'view.csv', objectKind: 'VIEW' },
    { fileName: 'trigger.csv', objectKind: 'TRIGGER' },
  ];
  const rows = [];
  const dependencySummary = new Map();

  for (const dependency of dependencyRows) {
    const key = dependency.sourceObjectRefId;
    if (!dependencySummary.has(key)) {
      dependencySummary.set(key, {
        reads: [],
        writes: [],
        calls: [],
      });
    }
    const summary = dependencySummary.get(key);
    const targetName = shortObjectName(objectNameFromRefId(dependency.targetObjectRefId));
    if (dependency.dependencyType === 'SQL_READ') summary.reads.push(targetName);
    if (dependency.dependencyType === 'SQL_WRITE') summary.writes.push(targetName);
    if (dependency.dependencyType === 'EXEC_CALL' || dependency.dependencyType === 'FUNCTION_CALL') {
      summary.calls.push(targetName);
    }
  }

  for (const source of sources) {
    for (const objectRow of parseCsvRows(path.join(OUTPUT_DIR, source.fileName))) {
      const { usageCategory, importanceHint } = classifySqlObject(
        objectRow.name,
        source.objectKind,
        objectRow.definitionPreview,
      );
      const moduleHint = inferModuleHint(objectRow.name);
      const preview = compactWhitespace(objectRow.definitionPreview, 320);
      const deps = dependencySummary.get(objectRow.id) || { reads: [], writes: [], calls: [] };
      const readSummary = uniqueValues(deps.reads, 6).join('; ');
      const writeSummary = uniqueValues(deps.writes, 6).join('; ');
      const callSummary = uniqueValues(deps.calls, 6).join('; ');
      const evidence = uniqueValues([
        usageCategory,
        moduleHint,
        preview ? `preview:${preview}` : '',
        objectRow.dependencySummary ? `deps:${objectRow.dependencySummary}` : '',
        readSummary ? `reads:${readSummary}` : '',
        writeSummary ? `writes:${writeSummary}` : '',
        callSummary ? `calls:${callSummary}` : '',
      ], 4).join(' | ');
      const queryDesignNote = [
        `${source.objectKind} ${objectRow.sqlName} is classified as ${usageCategory}.`,
        `Module hint ${moduleHint}.`,
        objectRow.parameterCount ? `Parameter count ${objectRow.parameterCount}.` : '',
        objectRow.functionType ? `Function type ${objectRow.functionType}.` : '',
        objectRow.parentObjectRefId ? `Parent object ${objectRow.parentObjectRefId}.` : '',
        readSummary ? `Reads: ${readSummary}.` : '',
        writeSummary ? `Writes: ${writeSummary}.` : '',
        callSummary ? `Calls: ${callSummary}.` : '',
        preview ? `Preview: ${preview}` : '',
      ]
        .filter(Boolean)
        .join(' ');

      rows.push({
        id: `SQL_GUIDE:${slugify(objectRow.id)}`,
        name: `${objectRow.sqlName} Guide`,
        description: `Query-design helper for ${source.objectKind.toLowerCase()} ${objectRow.sqlName}.`,
        semanticType: 'sql_object_guide',
        objectRefId: objectRow.id,
        objectKind: source.objectKind,
        usageCategory,
        moduleHint,
        importanceHint,
        detectionEvidence: evidence,
        queryDesignNote,
      });
    }
  }

  return rows;
}

function extractObjectNames(text) {
  const names = new Set();
  const linkRegex = /\[([^\]]+)\]\(([^)]+\.HTML)\)/g;
  for (const match of text.matchAll(linkRegex)) {
    names.add(match[1].trim());
  }
  return Array.from(names).slice(0, 12);
}

function mapChangeType(title) {
  const normalized = title.toLowerCase();
  if (normalized.includes('nowe tabele')) return 'ADD_TABLE';
  if (normalized.includes('usunięte tabele')) return 'DROP_TABLE';
  if (normalized.includes('istniejących tabelach')) return 'ALTER_TABLE';
  if (normalized.includes('nowe widoki')) return 'ADD_VIEW';
  if (normalized.includes('usunięte widoki')) return 'DROP_VIEW';
  if (normalized.includes('istniejących widokach')) return 'ALTER_VIEW';
  if (normalized.includes('nowe procedury')) return 'ADD_PROCEDURE';
  if (normalized.includes('usunięte procedury')) return 'DROP_PROCEDURE';
  if (normalized.includes('istniejących procedur')) return 'ALTER_PROCEDURE';
  if (normalized.includes('nowe funkcje')) return 'ADD_FUNCTION';
  if (normalized.includes('usunięte funkcje')) return 'DROP_FUNCTION';
  if (normalized.includes('istniejących funkcji')) return 'ALTER_FUNCTION';
  return 'OTHER';
}

function isMeaningfulChangeContent(text) {
  const normalized = cleanChangeContent(text);
  if (!normalized) return false;
  return !/^\[Brak\]\s*$/i.test(normalized);
}

function cleanChangeContent(text) {
  return normalizeText(text)
    .replace(/\\\[/g, '[')
    .replace(/\\\]/g, ']')
    .replace(/\\$/gm, '')
    .replace(/<[^>]+>/g, '')
    .replace(/Wszelkie prawa zastrzeżone/gi, '')
    .trim();
}

function buildSchemaChangeRows() {
  const filePath = path.join(ROOT, 'docs/reference/KB_Zmiany_Struktury_Bazy_2026.4.1.md');
  const text = normalizeText(fs.readFileSync(filePath, 'utf8'));
  const lines = text.split('\n');
  const rows = [];
  let currentConv = null;
  let currentSection = null;

  function flushSection() {
    if (!currentConv || !currentSection) return;
    const content = currentSection.lines.join('\n').trim();
    if (!isMeaningfulChangeContent(content)) return;
    const cleanedContent = cleanChangeContent(content);
    const names = extractObjectNames(content);
    rows.push({
      id: `SCHEMA_CHANGE:${currentConv.key}:${slugify(currentSection.title)}`,
      name: `${currentConv.key} - ${currentSection.title}`,
      description: `Schema change section ${currentSection.title} for ${currentConv.key}.`,
      semanticType: 'schema_change',
      sourceDocument: path.basename(filePath),
      versionFrom: currentConv.versionFrom,
      versionTo: currentConv.versionTo,
      changeScope: currentConv.scope,
      changeType: mapChangeType(currentSection.title),
      objectName: names.join(', ') || currentSection.title,
      evidence: cleanedContent,
    });
  }

  for (const line of lines) {
    const convMatch = line.match(/^##\s+(dbConv_(ConfDB|FirmDB)_(.+)_vs_(.+))\s*$/);
    if (convMatch) {
      flushSection();
      currentSection = null;
      currentConv = {
        key: convMatch[1],
        scope: convMatch[2] === 'ConfDB' ? 'CONFIGURATION_DB' : 'COMPANY_DB',
        versionTo: convMatch[3],
        versionFrom: convMatch[4],
      };
      continue;
    }

    const sectionMatch = line.match(/^##\s+(.+?)\s*$/);
    if (sectionMatch && currentConv) {
      flushSection();
      currentSection = {
        title: sectionMatch[1].trim(),
        lines: [],
      };
      continue;
    }

    if (currentSection) {
      currentSection.lines.push(line);
    }
  }

  flushSection();
  return rows;
}

function buildChunkRows() {
  const rows = [];
  const sectionOccurrences = new Map();

  for (const filePath of DOC_FILES) {
    const sourceDocument = path.basename(filePath);
    const sections = splitMarkdownSections(fs.readFileSync(filePath, 'utf8'));

    for (const section of sections) {
      if (section.title === 'Wersja 2026.4:') continue;
      const content = `${section.title}\n\n${section.content}`.trim();
      const chunks = splitLongContent(content);
      const sourceObjectRefId = deriveSourceObjectRefId(section.title);
      const occurrence = nextSectionOccurrence(sectionOccurrences, sourceDocument, section.title);
      const occurrenceSuffix = occurrence > 1 ? `:SECTION:${occurrence}` : '';

      chunks.forEach((chunkContent, index) => {
        rows.push({
          id: `CHUNK:${slugify(sourceDocument)}:${slugify(section.title)}${occurrenceSuffix}:${index + 1}`,
          name: chunks.length > 1 ? `${section.title} [${index + 1}]` : section.title,
          description: `Documentation chunk from ${sourceDocument}, section ${section.title}.`,
          content: chunkContent,
          sourceDocument,
          sourceSection: section.title,
          sourceObjectRefId,
          semanticType: 'chunk',
        });
      });
    }
  }

  for (const draft of loadPromotedKnowledge('ComarchOptimaSchema')) {
    const chunks = splitLongContent(`# ${draft.title}\n\n${draft.content}`);
    chunks.forEach((chunkContent, index) => {
      rows.push({
        id: makePromotedId('CHUNK_PROMOTED', `${draft.id}_${index + 1}`),
        name: chunks.length > 1 ? `${draft.title} [${index + 1}]` : draft.title,
        description: `Promoted knowledge inbox chunk for ${draft.title}.`,
        content: chunkContent,
        sourceDocument: draft.promotedMarkdownPath,
        sourceSection: draft.title,
        sourceObjectRefId: '',
        semanticType: 'chunk',
      });
    });
  }

  const uniqueRows = deduplicateIdenticalRowsById(rows, 'chunk.csv');
  assertUniqueIds(uniqueRows, 'chunk.csv');
  return uniqueRows;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: HELPER_ONLY ? 'ComarchOptimaSchema helper refresh' : 'ComarchOptimaSchema.extract_metadata.sql',
    files: [],
  };

  if (HELPER_ONLY) {
    for (const entry of fs.readdirSync(OUTPUT_DIR, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.csv')) continue;
      const rows = parseCsvRows(path.join(OUTPUT_DIR, entry.name));
      upsertManifestFile(manifest.files, {
        fileName: entry.name,
        rowCount: rows.length,
        columns: Object.keys(rows[0] || {}),
      });
    }
  }

  if (!HELPER_ONLY) {
    const require = createRequire(import.meta.url);
    const { Connection, Request } = require(TEDIOUS_PATH);
    const sqlText = fs.readFileSync(SQL_FILE, 'utf8')
      .replaceAll('CDN_KNF_Konfiguracja', CONFIGURATION_DATABASE);
    const exportsList = parseExports(sqlText);
    const connectionConfig = parseConnectionString(readMssqlConnectionString());

    for (const entry of fs.readdirSync(OUTPUT_DIR, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (entry.name.endsWith('.csv') || entry.name === path.basename(MANIFEST_FILE)) {
        fs.rmSync(path.join(OUTPUT_DIR, entry.name), { force: true });
      }
    }

    const connection = await new Promise((resolve, reject) => {
      const conn = new Connection(connectionConfig);
      conn.on('connect', (err) => {
        if (err) reject(err);
        else resolve(conn);
      });
      conn.connect();
    });

    for (const exportDef of exportsList) {
      const outPath = path.join(OUTPUT_DIR, exportDef.fileName);
      const out = fs.createWriteStream(outPath, { encoding: 'utf8' });

      const result = await new Promise((resolve, reject) => {
        let rowCount = 0;
        let headers = null;

        const request = new Request(exportDef.query, (err) => {
          if (err) {
            reject(err);
          } else {
            out.end(() => resolve({ rowCount, headers }));
          }
        });

        request.on('row', (columns) => {
          if (!headers) {
            headers = columns.map((col) => col.metadata.colName);
            out.write(`${headers.join(',')}\n`);
          }

          const values = columns.map((col) => csvEscape(col.value));
          out.write(`${values.join(',')}\n`);
          rowCount += 1;
        });

        connection.execSql(request);
      });

      upsertManifestFile(manifest.files, {
        fileName: exportDef.fileName,
        rowCount: result.rowCount,
        columns: result.headers || [],
      });
    }

    const schemaChangeHeaders = [
      'id',
      'name',
      'description',
      'semanticType',
      'sourceDocument',
      'versionFrom',
      'versionTo',
      'changeScope',
      'changeType',
      'objectName',
      'evidence',
    ];
    const schemaChangeRows = buildSchemaChangeRows();
    writeCsvRows(path.join(OUTPUT_DIR, 'schema_change.csv'), schemaChangeHeaders, schemaChangeRows);
    upsertManifestFile(manifest.files, {
      fileName: 'schema_change.csv',
      rowCount: schemaChangeRows.length,
      columns: schemaChangeHeaders,
    });

    connection.close();
  }

  const chunkHeaders = [
    'id',
    'name',
    'description',
    'content',
    'sourceDocument',
    'sourceSection',
    'sourceObjectRefId',
    'semanticType',
  ];
  const chunkRows = buildChunkRows();
  writeCsvRows(path.join(OUTPUT_DIR, 'chunk.csv'), chunkHeaders, chunkRows);
  upsertManifestFile(manifest.files, {
    fileName: 'chunk.csv',
    rowCount: chunkRows.length,
    columns: chunkHeaders,
  });

  const tableQueryGuideHeaders = [
    'id',
    'name',
    'description',
    'semanticType',
    'tableRefId',
    'sqlName',
    'moduleHint',
    'roleHint',
    'businessAreaHint',
    'importanceHint',
    'usageCategory',
    'inboundForeignKeyCount',
    'outboundForeignKeyCount',
    'joinAnchorColumns',
    'relatedTableSummary',
    'queryDesignNote',
  ];
  const tableQueryGuideRows = buildTableQueryGuideRows();
  writeCsvRows(
    path.join(OUTPUT_DIR, 'table_query_guide.csv'),
    tableQueryGuideHeaders,
    tableQueryGuideRows,
  );
  upsertManifestFile(manifest.files, {
    fileName: 'table_query_guide.csv',
    rowCount: tableQueryGuideRows.length,
    columns: tableQueryGuideHeaders,
  });

  const joinPathGuideHeaders = [
    'id',
    'name',
    'description',
    'semanticType',
    'sourceTableRefId',
    'targetTableRefId',
    'viaForeignKeyRefId',
    'pathLength',
    'joinKind',
    'joinSqlTemplate',
    'confidence',
    'useCase',
    'notes',
  ];
  const joinPathGuideRows = buildJoinPathGuideRows();
  writeCsvRows(path.join(OUTPUT_DIR, 'join_path_guide.csv'), joinPathGuideHeaders, joinPathGuideRows);
  upsertManifestFile(manifest.files, {
    fileName: 'join_path_guide.csv',
    rowCount: joinPathGuideRows.length,
    columns: joinPathGuideHeaders,
  });

  const objectDependencyHeaders = [
    'id',
    'name',
    'description',
    'semanticType',
    'sourceObjectRefId',
    'targetObjectRefId',
    'sourceObjectKind',
    'targetObjectKind',
    'dependencyType',
    'evidence',
  ];
  const objectDependencyRows = buildObjectDependencyRows();
  writeCsvRows(path.join(OUTPUT_DIR, 'object_dependency.csv'), objectDependencyHeaders, objectDependencyRows);
  upsertManifestFile(manifest.files, {
    fileName: 'object_dependency.csv',
    rowCount: objectDependencyRows.length,
    columns: objectDependencyHeaders,
  });

  const sqlObjectGuideHeaders = [
    'id',
    'name',
    'description',
    'semanticType',
    'objectRefId',
    'objectKind',
    'usageCategory',
    'moduleHint',
    'importanceHint',
    'detectionEvidence',
    'queryDesignNote',
  ];
  const sqlObjectGuideRows = buildSqlObjectGuideRows(objectDependencyRows);
  writeCsvRows(path.join(OUTPUT_DIR, 'sql_object_guide.csv'), sqlObjectGuideHeaders, sqlObjectGuideRows);
  upsertManifestFile(manifest.files, {
    fileName: 'sql_object_guide.csv',
    rowCount: sqlObjectGuideRows.length,
    columns: sqlObjectGuideHeaders,
  });

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
