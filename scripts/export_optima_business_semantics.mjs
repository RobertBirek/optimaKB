#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
import { ensureDir, writeCsv, writeJson, makeId } from './lib/export_utils.mjs';

const ROOT = '/docker/openspg';
const EXPORT_DIR = path.join(ROOT, 'exports/optima_business_semantics/v1');
const MANIFEST_PATH = path.join(EXPORT_DIR, '_manifest.json');
const SCHEMA_EXPORT_DIR = path.join(ROOT, 'exports/optima_schema/v1');
const CODEX_CONFIG = '/root/.codex/config.toml';
const TEDIOUS_PATH =
  process.env.TEDIOUS_MODULE_PATH ||
  '/root/.npm/_npx/096058dd12901fb0/node_modules/tedious';
const HELPER_ONLY = process.env.OPENSPG_HELPER_ONLY === '1';

function normalizeValue(value) {
  return String(value ?? '').trim();
}

function sha256hex(value) {
  return crypto.createHash('sha256').update(String(value ?? '')).digest('hex');
}

function readConnectionString() {
  if (process.env.MSSQL_CONNECTION_STRING) {
    return process.env.MSSQL_CONNECTION_STRING;
  }
  const content = fs.readFileSync(CODEX_CONFIG, 'utf8');
  const match = content.match(/MSSQL_CONNECTION_STRING\s*=\s*'([^']+)'/);
  if (!match) {
    throw new Error('MSSQL_CONNECTION_STRING not found in /root/.codex/config.toml');
  }
  return match[1];
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

function dbConfigFor(config, databaseName) {
  return {
    ...config,
    options: { ...config.options, database: databaseName },
  };
}

function executeQuery(Connection, Request, config, query) {
  return new Promise((resolve, reject) => {
    const conn = new Connection(config);
    const rows = [];
    const columns = [];

    conn.on('connect', (err) => {
      if (err) { conn.close(); reject(err); return; }
      const req = new Request(query, (err) => {
        conn.close();
        if (err) reject(err);
        else resolve({ columns, rows });
      });
      req.on('columnMetadata', (cols) => {
        for (const col of cols) columns.push(col.colName);
      });
      req.on('row', (cols) => {
        const row = {};
        let idx = 0;
        for (const col of cols) {
          row[columns[idx]] = col.value;
          idx += 1;
        }
        rows.push(row);
      });
      conn.execSql(req);
    });
    conn.connect();
  });
}

function typedAs(databaseName) {
  return databaseName.includes('KNF') ? 'KNF' : 'TEST';
}

function tableRefId(databaseName, schema, tableName) {
  const dbType = typedAs(databaseName);
  return `CDN_${dbType}:TABLE:${schema}.${tableName}`;
}

function columnRefId(databaseName, schema, tableName, columnName) {
  const dbType = typedAs(databaseName);
  return `CDN_${dbType}:COLUMN:${schema}.${tableName}.${columnName}`;
}

async function extractCheckConstraints(Connection, Request, config) {
  const query = `
    SELECT
      sch.name AS schema_name,
      t.name AS table_name,
      cc.name AS constraint_name,
      cc.definition AS constraint_definition
    FROM sys.check_constraints cc
    JOIN sys.tables t ON cc.parent_object_id = t.object_id
    JOIN sys.schemas sch ON t.schema_id = sch.schema_id
    WHERE cc.is_ms_shipped = 0
    ORDER BY sch.name, t.name, cc.name
  `;
  const result = await executeQuery(Connection, Request, config, query);
  return result.rows.map((row) => ({
    schema_name: normalizeValue(row.schema_name),
    table_name: normalizeValue(row.table_name),
    constraint_name: normalizeValue(row.constraint_name),
    constraint_definition: normalizeValue(row.constraint_definition),
  }));
}

function parseInValues(definition) {
  if (!definition) return null;
  const match = definition.match(/IN\s*\(([^)]+)\)/i);
  if (!match) return null;
  const values = [];
  for (const part of match[1].split(',')) {
    const trimmed = part.trim().replace(/^'([^']*)'$/, '$1').replace(/^0x[0-9a-f]+$/i, '');
    if (trimmed) values.push(trimmed);
  }
  return values.length > 0 ? values : null;
}

function parseEqualityChainValues(definition) {
  if (!definition) return null;
  const matches = [...definition.matchAll(/\[?([a-zA-Z_]+)\]?\s*=\s*\(([^)]+)\)/g)];
  if (!matches.length) return null;
  const byColumn = new Map();
  for (const match of matches) {
    const col = match[1];
    const value = match[2].trim().replace(/^'([^']*)'$/, '$1');
    if (!value) continue;
    const key = col.toLowerCase();
    if (!byColumn.has(key)) byColumn.set(key, { colName: col, values: [] });
    byColumn.get(key).values.push(value);
  }
  return [...byColumn.values()].find((entry) => entry.values.length > 1) || null;
}

async function detectLookupTables(Connection, Request, config) {
  const query = `
    SELECT
      sch.name AS schema_name,
      t.name AS table_name,
      SUM(ps.row_count) AS row_count
    FROM sys.tables t
    JOIN sys.schemas sch ON t.schema_id = sch.schema_id
    JOIN sys.dm_db_partition_stats ps ON t.object_id = ps.object_id AND ps.index_id IN (0, 1)
    GROUP BY sch.name, t.name
    HAVING SUM(ps.row_count) BETWEEN 1 AND 200
    ORDER BY SUM(ps.row_count) ASC
  `;
  const result = await executeQuery(Connection, Request, config, query);
  return result.rows.map((row) => ({
    schema_name: normalizeValue(row.schema_name),
    table_name: normalizeValue(row.table_name),
    row_count: Number(row.row_count ?? 0),
  }));
}

async function loadLookupTableData(Connection, Request, config, schemaName, tableName) {
  const colsResult = await executeQuery(Connection, Request, config, `
    SELECT TOP 0 * FROM [${schemaName}].[${tableName}]
  `);
  const cols = colsResult.columns;
  if (cols.length < 2 || cols.length > 4) return null;

  const dataQuery = `SELECT TOP 200 * FROM [${schemaName}].[${tableName}]`;
  const dataResult = await executeQuery(Connection, Request, config, dataQuery);
  if (dataResult.rows.length < 1) return null;

  const idCol = cols.find((c) => /id|typ|kod/i.test(c)) || cols[0];
  const labelCol = (cols.length >= 2 ? cols.find((c) => c !== idCol && /nazw|nazw[ae]|opis|etykiet|label|name|wartosc/i.test(c)) : null) || (cols.length >= 2 ? cols[1] : null);

  if (!labelCol) return null;

  return dataResult.rows.map((row) => ({
    code: normalizeValue(row[idCol]),
    label: normalizeValue(row[labelCol]),
  }));
}

async function extractExtendedProperties(Connection, Request, config) {
  const query = `
    SELECT
      sch.name AS schema_name,
      t.name AS table_name,
      c.name AS column_name,
      ep.value AS description
    FROM sys.extended_properties ep
    LEFT JOIN sys.tables t ON ep.major_id = t.object_id AND ep.minor_id = 0
    LEFT JOIN sys.columns c ON ep.major_id = c.object_id AND ep.minor_id = c.column_id
    LEFT JOIN sys.schemas sch ON COALESCE(t.schema_id, c.object_id) = sch.schema_id
    WHERE ep.class = 1 AND ep.name = 'MS_Description'
    ORDER BY sch.name, t.name, ISNULL(c.name, '')
  `;
  const result = await executeQuery(Connection, Request, config, query);
  return result.rows.map((row) => ({
    schema_name: normalizeValue(row.schema_name),
    table_name: normalizeValue(row.table_name),
    column_name: normalizeValue(row.column_name),
    description: normalizeValue(row.description),
  }));
}

async function extractDefaultConstraints(Connection, Request, config) {
  const query = `
    SELECT
      sch.name AS schema_name,
      t.name AS table_name,
      c.name AS column_name,
      dc.name AS constraint_name,
      dc.definition AS constraint_definition
    FROM sys.default_constraints dc
    JOIN sys.tables t ON dc.parent_object_id = t.object_id
    JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
    JOIN sys.schemas sch ON t.schema_id = sch.schema_id
    WHERE dc.is_ms_shipped = 0
    ORDER BY sch.name, t.name, c.name
  `;
  const result = await executeQuery(Connection, Request, config, query);
  return result.rows.map((row) => ({
    schema_name: normalizeValue(row.schema_name),
    table_name: normalizeValue(row.table_name),
    column_name: normalizeValue(row.column_name),
    constraint_name: normalizeValue(row.constraint_name),
    constraint_definition: normalizeValue(row.constraint_definition),
  }));
}

function classifyDomain(tableName) {
  const t = tableName.toLowerCase();
  if (/tra(nag|elem|plat|zap|naghist|elemhist)|dokumenty|faktur|zamowien|paragon|rejestr.*vat/i.test(t)) return 'Handel';
  if (/towar|magazyn|stan|cen|dostaw|parti|rezerw/i.test(t)) return 'Magazyn';
  if (/kontrahen|klien|dostawc|odbiorc|adres/i.test(t)) return 'Kontrahenci';
  if (/prc|pracown|umow|kadr|place|wynagrodz|urlop|zatrudnien|etat/i.test(t)) return 'Kadry-Płace';
  if (/dekret|konto|księg|rejestr|vat(?![a-z])|budzet|koszt|przychod|rozrach|bank|kas|platnos|walut|kurs/i.test(t)) return 'Finanse-Księgowość';
  if (/zadan|kalendarz|termin|notatk|attach|szablon|uprawnien|operator|baz[ay]|uzytkowni|prawo/i.test(t)) return 'Administracja';
  if (/crm|lead|szans|ofert|kampani|serwis|zgloszen|napraw/i.test(t)) return 'CRM';
  return 'Ogólne';
}

function generateTableDescription(tableName) {
  const t = tableName.toLowerCase();
  const domain = classifyDomain(tableName);
  const domainPrefix = `Tabela "${tableName}" w domenie ${domain}.`;

  if (/tranag$/i.test(t)) return `${domainPrefix} Nagłówki dokumentów handlowych — faktury sprzedaży, zakupu, korekty, zamówienia, paragony.`;
  if (/traelem$/i.test(t)) return `${domainPrefix} Pozycje (wiersze) dokumentów handlowych — artykuły, usługi, kwoty w dokumentach.`;
  if (/traplat$/i.test(t)) return `${domainPrefix} Płatności powiązane z dokumentami handlowymi — formy płatności, terminy, kwoty.`;
  if (/kontrahenci$/i.test(t)) return `${domainPrefix} Główna tabela kontrahentów — dane firmowe, NIP, REGON, adresy, dane kontaktowe.`;
  if (/towary$/i.test(t)) return `${domainPrefix} Kartoteka towarów — nazwy, kody, jednostki miary, stawki VAT, ceny.`;
  if (/magazyn/i.test(t)) return `${domainPrefix} Definicje magazynów i ich stany magazynowe.`;
  if (/pracown/i.test(t)) return `${domainPrefix} Dane pracowników — personalia, stanowiska, daty zatrudnienia.`;
  if (/umow/i.test(t)) return `${domainPrefix} Umowy pracownicze — typy, okresy, wymiary etatu.`;
  if (/dekret/i.test(t)) return `${domainPrefix} Dekrety księgowe — zapisy na kontach księgowych.`;
  if (/konto/i.test(t) && /ksieg/i.test(t)) return `${domainPrefix} Plan kont księgowych.`;
  if (/walut/i.test(t)) return `${domainPrefix} Definicje walut i kursów wymiany.`;
  if (/platnos|formaplat/i.test(t)) return `${domainPrefix} Formy płatności i terminy.`;
  if (/operator/i.test(t)) return `${domainPrefix} Operatorzy systemu — loginy, uprawnienia, profile.`;
  if (/cfg/i.test(t)) return `${domainPrefix} Konfiguracja systemu — klucze i wartości konfiguracyjne.`;
  if (/wydruk/i.test(t)) return `${domainPrefix} Definicje wydruków i szablonów raportów.`;
  if (/baza|bazy$/i.test(t)) return `${domainPrefix} Definicje baz danych i instancji.`;
  return `${domainPrefix} Tabela systemowa.`;
}

function generateColumnDescription(columnName) {
  const c = columnName.toLowerCase();
  if (c === 'trn_typ') return 'Typ dokumentu handlowego (FS, FZ, KFS, KFZ, ZS, ZZ itp.).';
  if (c === 'trn_numer') return 'Numer dokumentu handlowego.';
  if (c === 'trn_datawyst') return 'Data wystawienia dokumentu.';
  if (c === 'trn_datasprz') return 'Data sprzedaży dokumentu.';
  if (c === 'trn_wartosc') return 'Wartość brutto dokumentu.';
  if (c === 'trn_liczydlo') return 'Unikalny identyfikator (liczydło) dokumentu.';
  if (c === 'tre_towid') return 'Identyfikator towaru w pozycji dokumentu.';
  if (c === 'tre_ilosc') return 'Ilość towaru lub usługi w pozycji dokumentu.';
  if (c === 'tre_cena') return 'Cena jednostkowa w pozycji dokumentu.';
  if (c === 'tre_wartosc') return 'Wartość netto pozycji dokumentu.';
  if (c === 'knt_kod') return 'Kod (symbol) kontrahenta.';
  if (c === 'knt_nazwa1' || c === 'knt_nazwa2' || c === 'knt_nazwa3') return 'Nazwa kontrahenta (pełna/linia).';
  if (c === 'knt_nip') return 'NIP kontrahenta.';
  if (c === 'tow_kod') return 'Kod (symbol) towaru.';
  if (c === 'tow_nazwa') return 'Nazwa towaru.';
  if (c === 'tow_jm') return 'Jednostka miary towaru (szt, kg, m, usługa itp.).';
  if (c === 'tow_stawkavat') return 'Stawka VAT dla towaru.';
  if (c === 'tow_cena') return 'Cena sprzedaży towaru.';
  if (c === 'prcnumer') return 'Numer ewidencyjny pracownika.';
  if (c === 'prcnazwisko') return 'Nazwisko pracownika.';
  if (c === 'prcimie') return 'Imię pracownika.';
  if (c === 'prcdatazatrudnienia') return 'Data zatrudnienia pracownika.';
  if (c === 'wdr_id') return 'Identyfikator wydruku (uwaga: może nie być unikalny).';
  if (c === 'wdr_nazwa') return 'Nazwa wydruku / szablonu.';
  if (c === 'anulowany') return 'Flaga anulowania rekordu (1 = anulowany).';
  if (c === 'bufor') return 'Flaga bufora (1 = dokument w buforze, niezatwierdzony).';
  if (c === 'data_modyfikacji' || c === 'datamodyfikacji') return 'Data ostatniej modyfikacji rekordu.';
  if (c === 'operator') return 'Identyfikator operatora, który utworzył lub zmodyfikował rekord.';
  return `Kolumna ${columnName}.`;
}

function generateRuleDescription(definition, tableName, constraintName) {
  if (!definition) return `Reguła sprawdzająca (CHECK) na tabeli ${tableName}.`;

  const def = definition.trim().replace(/^\(|\)$/g, '');

  const notNull = def.match(/^([a-zA-Z_]+)\s+IS\s+NOT\s+NULL$/i);
  if (notNull) return `Kolumna ${notNull[1]} nie może być pusta (NOT NULL) w tabeli ${tableName}.`;

  const range = def.match(/^([a-zA-Z_]+)\s*(>=|<=|>|<)\s*(.+)$/);
  if (range) {
    const op = range[2] === '>=' ? 'większej lub równej' : range[2] === '<=' ? 'mniejszej lub równej' : range[2] === '>' ? 'większej niż' : 'mniejszej niż';
    return `Kolumna ${range[1]} musi być ${op} ${range[3]} w tabeli ${tableName}.`;
  }

  const inVal = def.match(/^([a-zA-Z_]+)\s+IN\s*\(([^)]+)\)$/i);
  if (inVal) return `Kolumna ${inVal[1]} może przyjmować tylko wartości: ${inVal[2]} w tabeli ${tableName}.`;

  const like = def.match(/^([a-zA-Z_]+)\s+LIKE\s+'([^']+)'$/i);
  if (like) return `Kolumna ${like[1]} musi pasować do wzorca '${like[2]}' w tabeli ${tableName}.`;

  const between = def.match(/^([a-zA-Z_]+)\s+BETWEEN\s+(.+)\s+AND\s+(.+)$/i);
  if (between) return `Kolumna ${between[1]} musi być w zakresie od ${between[2]} do ${between[3]} w tabeli ${tableName}.`;

  return `Reguła sprawdzająca (CHECK) "${constraintName}": ${def}.`;
}

function loadExistingConstraints() {
  const constraintPath = path.join(SCHEMA_EXPORT_DIR, 'constraint.csv');
  if (!fs.existsSync(constraintPath)) return [];
  const raw = fs.readFileSync(constraintPath, 'utf8');
  const lines = raw.split('\n').filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].split(',');
  const colIdx = {};
  header.forEach((h, i) => { colIdx[h.trim()] = i; });

  if (colIdx.constraintType === undefined || colIdx.definition === undefined || colIdx.sqlName === undefined || colIdx.tableRefId === undefined) {
    return [];
  }

  return lines.slice(1).map((line) => {
    const parts = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { parts.push(current); current = ''; }
      else current += ch;
    }
    parts.push(current);

    return {
      constraintType: (parts[colIdx.constraintType] ?? '').trim(),
      definition: (parts[colIdx.definition] ?? '').trim(),
      sqlName: (parts[colIdx.sqlName] ?? '').trim(),
      tableRefId: (parts[colIdx.tableRefId] ?? '').trim(),
    };
  }).filter((row) => row.constraintType === 'CHECK');
}

function loadTableGuides() {
  const guidePath = path.join(SCHEMA_EXPORT_DIR, 'table_query_guide.csv');
  if (!fs.existsSync(guidePath)) return [];
  const raw = fs.readFileSync(guidePath, 'utf8');
  const lines = raw.split('\n').filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].split(',');
  const colIdx = {};
  header.forEach((h, i) => { colIdx[h.trim()] = i; });

  return lines.slice(1).map((line) => {
    const parts = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { parts.push(current); current = ''; }
      else current += ch;
    }
    parts.push(current);

    return {
      tableRefId: (parts[colIdx.tableRefId] ?? '').trim(),
      sqlName: (parts[colIdx.sqlName] ?? '').trim(),
      moduleHint: (parts[colIdx.moduleHint] ?? '').trim(),
      businessAreaHint: (parts[colIdx.businessAreaHint] ?? '').trim(),
    };
  });
}

async function main() {
  ensureDir(EXPORT_DIR);

  const domains = [
    { name: 'Handel', description: 'Dokumenty handlowe — sprzedaż, zakup, korekty, zamówienia, paragony.' },
    { name: 'Magazyn', description: 'Gospodarka magazynowa — towary, stany, dostawy, ceny.' },
    { name: 'Kontrahenci', description: 'Kontrahenci — dane firmowe, adresy, dane kontaktowe.' },
    { name: 'Kadry-Płace', description: 'Kadry i płace — pracownicy, umowy, wynagrodzenia, urlopy.' },
    { name: 'Finanse-Księgowość', description: 'Finanse i księgowość — dekrety, konta, rejestry VAT, płatności.' },
    { name: 'Administracja', description: 'Administracja systemu — operatorzy, konfiguracja, bazy, uprawnienia.' },
    { name: 'CRM', description: 'Zarządzanie relacjami z klientami — leady, oferty, serwis.' },
    { name: 'Ogólne', description: 'Tabele ogólne i pomocnicze.' },
  ];

  const domainRows = domains.map((d) => ({
    name: d.name,
    description: d.description,
  }));
  const domainFile = writeCsv(EXPORT_DIR, 'business_domain.csv', ['name', 'description'], domainRows);

  let allCheckConstraints = [];
  let allLookupTables = [];
  let allExtendedProps = [];
  let allDefaultConstraints = [];

  if (!HELPER_ONLY) {
    const require = createRequire(import.meta.url);
    const { Connection, Request } = require(TEDIOUS_PATH);
    const baseConfig = parseConnectionString(readConnectionString());

    const databases = [
      { name: 'CDN_TEST', dbRef: 'TEST' },
      { name: 'CDN_KNF_Konfiguracja', dbRef: 'KNF' },
    ];

    for (const db of databases) {
      const config = dbConfigFor(baseConfig, db.name);
      console.error(`Connecting to ${db.name}...`);
      try {
        const checks = await extractCheckConstraints(Connection, Request, config);
        allCheckConstraints.push(...checks.map((c) => ({ ...c, database: db.dbRef })));
        console.error(`  check constraints: ${checks.length}`);

        const lookups = await detectLookupTables(Connection, Request, config);
        allLookupTables.push(...lookups.map((l) => ({ ...l, database: db.dbRef })));
        console.error(`  lookup tables: ${lookups.length}`);

        const props = await extractExtendedProperties(Connection, Request, config);
        allExtendedProps.push(...props.map((p) => ({ ...p, database: db.dbRef })));
        console.error(`  extended properties: ${props.length}`);

        const defaults = await extractDefaultConstraints(Connection, Request, config);
        allDefaultConstraints.push(...defaults.map((d) => ({ ...d, database: db.dbRef })));
        console.error(`  default constraints: ${defaults.length}`);
      } catch (err) {
        console.error(`MSSQL connection failed for ${db.name}: ${err.message}`);
      }
    }
  }

  if (HELPER_ONLY || allCheckConstraints.length === 0) {
    const existingChecks = loadExistingConstraints();
    console.error(`Loaded ${existingChecks.length} CHECK constraints from existing constraint.csv`);
    for (const c of existingChecks) {
      allCheckConstraints.push({
        schema_name: 'CDN',
        table_name: '',
        constraint_name: c.sqlName,
        constraint_definition: c.definition,
        database: 'TEST',
        tableRefId: c.tableRefId,
      });
    }
  }

  const tableGuides = loadTableGuides();
  console.error(`Loaded ${tableGuides.length} table query guides`);

  const descriptionRows = [];
  const descSeen = new Set();

  for (const ep of allExtendedProps) {
    if (!ep.description) continue;
    const trId = tableRefId(`CDN_${ep.database}`, ep.schema_name, ep.table_name);
    const crId = ep.column_name
      ? columnRefId(`CDN_${ep.database}`, ep.schema_name, ep.table_name, ep.column_name)
      : undefined;

    const key = crId ? `${trId}:${ep.column_name}` : trId;
    if (descSeen.has(key)) continue;
    descSeen.add(key);

    const name = crId ? `${ep.schema_name}.${ep.table_name}.${ep.column_name}` : `${ep.schema_name}.${ep.table_name}`;
    const domain = classifyDomain(ep.table_name);

    descriptionRows.push({
      id: makeId('BD', key),
      name,
      description: ep.description,
      descriptionPreview: ep.description.length > 800 ? `${ep.description.slice(0, 797)}...` : ep.description,
      descriptionHash: sha256hex(ep.description),
      descriptionLength: String(ep.description.length),
      tableRefId: trId,
      columnRefId: crId ?? '',
      source: 'extended_property',
      language: 'pl',
      domainName: domain,
    });
  }

  for (const guide of tableGuides) {
    if (!guide.tableRefId) continue;
    if (descSeen.has(guide.tableRefId)) continue;
    descSeen.add(guide.tableRefId);

    const tableName = guide.sqlName || '';
    const domain = guide.businessAreaHint || classifyDomain(tableName);
    const desc = generateTableDescription(tableName);

    descriptionRows.push({
      id: makeId('BD', guide.tableRefId),
      name: tableName,
      description: desc,
      descriptionPreview: desc.length > 800 ? `${desc.slice(0, 797)}...` : desc,
      descriptionHash: sha256hex(desc),
      descriptionLength: String(desc.length),
      tableRefId: guide.tableRefId,
      columnRefId: '',
      source: 'heuristic',
      language: 'pl',
      domainName: domain,
    });
  }

  for (const check of allCheckConstraints) {
    const def = check.constraint_definition || '';
    const colMatch = def.match(/\(([a-zA-Z_]+)\s*(?:>=|<=|=|<|>|!=|<>|IN|LIKE|BETWEEN|IS)/);
    if (!colMatch) continue;

    const colName = colMatch[1];
    const trId = check.tableRefId || tableRefId(`CDN_${check.database}`, check.schema_name, check.table_name);
    const crId = columnRefId(`CDN_${check.database}`, check.schema_name, check.table_name, colName);
    const key = `${trId}:${colName}`;

    if (descSeen.has(key)) continue;
    descSeen.add(key);

    const desc = generateColumnDescription(colName);
    const domain = classifyDomain(check.table_name);

    descriptionRows.push({
      id: makeId('BD', key),
      name: `${check.schema_name || 'CDN'}.${check.table_name}.${colName}`,
      description: desc,
      descriptionPreview: desc.length > 800 ? `${desc.slice(0, 797)}...` : desc,
      descriptionHash: sha256hex(desc),
      descriptionLength: String(desc.length),
      tableRefId: trId,
      columnRefId: crId,
      source: 'heuristic',
      language: 'pl',
      domainName: domain,
    });
  }

  const descColumns = ['id', 'name', 'description', 'descriptionPreview', 'descriptionHash', 'descriptionLength', 'tableRefId', 'columnRefId', 'source', 'language', 'domainName'];
  const descFile = writeCsv(EXPORT_DIR, 'business_description.csv', descColumns, descriptionRows);

  const codeRows = [];
  const codeSeen = new Set();

  for (const check of allCheckConstraints) {
    const def = check.constraint_definition || '';
    const inVals = parseInValues(def);
    const colMatch = inVals ? def.match(/\(([a-zA-Z_]+)\s+IN\s*\(/) : null;
    const enumMatch = inVals && colMatch ? null : parseEqualityChainValues(def);

    const colName = colMatch ? colMatch[1] : enumMatch?.colName;
    const values = colMatch ? inVals : enumMatch?.values;
    if (!colName || !values) continue;

    const crId = columnRefId(`CDN_${check.database}`, check.schema_name, check.table_name, colName);

    for (const codeVal of values) {
      const key = `${crId}:${codeVal}`;
      if (codeSeen.has(key)) continue;
      codeSeen.add(key);

      const idSafeCodeVal = codeVal.replace(/^-/, 'NEG_');
      codeRows.push({
        id: makeId('CM', `${crId}:${idSafeCodeVal}`),
        name: `${check.table_name}.${colName}=${codeVal}`,
        columnRefId: crId,
        codeValue: codeVal,
        label: '',
        source: 'check_constraint',
        domainName: classifyDomain(check.table_name),
      });
    }
  }

  if (!HELPER_ONLY && allLookupTables.length > 0) {
    const require = createRequire(import.meta.url);
    const { Connection, Request } = require(TEDIOUS_PATH);
    const baseConfig = parseConnectionString(readConnectionString());

    for (const lookup of allLookupTables) {
      const dbName = lookup.database === 'KNF' ? 'CDN_KNF_Konfiguracja' : 'CDN_TEST';
      const config = dbConfigFor(baseConfig, dbName);

      try {
        const data = await loadLookupTableData(Connection, Request, config, lookup.schema_name, lookup.table_name);
        if (!data) continue;

        for (const entry of data) {
          if (!entry.code || !entry.label) continue;
          const trId = tableRefId(`CDN_${lookup.database}`, lookup.schema_name, lookup.table_name);
          const key = `${trId}:${entry.code}`;

          if (codeSeen.has(key)) {
            const existing = codeRows.find((r) => r.columnRefId === trId && r.codeValue === entry.code);
            if (existing) { existing.label = entry.label; existing.source = 'lookup_table'; }
            continue;
          }
          codeSeen.add(key);

          codeRows.push({
            id: makeId('CM', key),
            name: `${lookup.schema_name}.${lookup.table_name}=${entry.code}`,
            columnRefId: trId,
            codeValue: entry.code,
            label: entry.label,
            source: 'lookup_table',
            domainName: classifyDomain(lookup.table_name),
          });
        }
      } catch (err) {
        console.error(`Failed to load lookup table ${lookup.schema_name}.${lookup.table_name}: ${err.message}`);
      }
    }
  }

  const codeColumns = ['id', 'name', 'columnRefId', 'codeValue', 'label', 'source', 'domainName'];
  const codeFile = writeCsv(EXPORT_DIR, 'code_meaning.csv', codeColumns, codeRows);

  const ruleRows = [];

  for (const check of allCheckConstraints) {
    const def = check.constraint_definition || '';
    const trId = check.tableRefId || tableRefId(`CDN_${check.database}`, check.schema_name, check.table_name);
    const desc = generateRuleDescription(def, check.table_name, check.constraint_name);
    const domain = classifyDomain(check.table_name);

    ruleRows.push({
      id: makeId('BR', `CHECK:${check.constraint_name}`),
      name: check.constraint_name || '',
      description: desc,
      descriptionPreview: desc.length > 800 ? `${desc.slice(0, 797)}...` : desc,
      descriptionHash: sha256hex(desc),
      descriptionLength: String(desc.length),
      tableRefId: trId,
      ruleType: 'CHECK',
      expression: def,
      isHardConstraint: 'true',
      domainName: domain,
    });
  }

  for (const defC of allDefaultConstraints) {
    const trId = tableRefId(`CDN_${defC.database}`, defC.schema_name, defC.table_name);
    const def = defC.constraint_definition || '';
    const desc = `Domyślna wartość dla kolumny ${defC.column_name}: ${def}`;
    const domain = classifyDomain(defC.table_name);

    ruleRows.push({
      id: makeId('BR', `DEFAULT:${defC.constraint_name}`),
      name: defC.constraint_name || '',
      description: desc,
      descriptionPreview: desc.length > 800 ? `${desc.slice(0, 797)}...` : desc,
      descriptionHash: sha256hex(desc),
      descriptionLength: String(desc.length),
      tableRefId: trId,
      ruleType: 'DEFAULT',
      expression: def,
      isHardConstraint: 'false',
      domainName: domain,
    });
  }

  const ruleColumns = ['id', 'name', 'description', 'descriptionPreview', 'descriptionHash', 'descriptionLength', 'tableRefId', 'ruleType', 'expression', 'isHardConstraint', 'domainName'];
  const ruleFile = writeCsv(EXPORT_DIR, 'business_rule.csv', ruleColumns, ruleRows);

  const manifest = {
    generatedAt: new Date().toISOString(),
    namespace: 'ComarchOptimaBusinessSemantics',
    mode: HELPER_ONLY ? 'helper_only' : 'live_mssql',
    files: [domainFile, descFile, codeFile, ruleFile].map((f) => ({
      fileName: f.fileName,
      rowCount: f.rowCount,
      columns: f.columns,
    })),
  };

  writeJson(MANIFEST_PATH, manifest);
  console.error(`Exported to ${EXPORT_DIR}`);
  console.error(`  domains: ${domainFile.rowCount}`);
  console.error(`  descriptions: ${descFile.rowCount}`);
  console.error(`  code meanings: ${codeFile.rowCount}`);
  console.error(`  rules: ${ruleFile.rowCount}`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
