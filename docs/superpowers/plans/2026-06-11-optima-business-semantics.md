# Comarch Optima Business Semantics KB — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new OpenSPG KB (`ComarchOptimaBusinessSemantics`) that maps business meaning onto the Schema KB (project 4) through `tableRefId`/`columnRefId` links, covering code→label mappings, business descriptions, and business rules extracted from CDN_TEST/CDN_KNF_Konfiguracja.

**Architecture:** Follows the existing KB pipeline: `.schema` file → `push_openspg_schema.mjs` → export script (MSSQL + heuristics → 4 CSVs) → thin build wrapper → `build_kb_runner.mjs`. Integrates with the assistant routing and MCP server. Project ID TBD — create in OpenSPG dashboard first.

**Tech Stack:** Node.js ESM, `tedious` MSSQL driver, OpenSPG Schema DSL, existing `build_kb_runner.mjs` + lib helpers.

---

### Task 0: Create OpenSPG Project (manual step)

**Files:** No file changes — use OpenSPG dashboard.

- [ ] **Step 0.1: Open the OpenSPG dashboard** at `http://10.10.254.42:8887/#/application` and create a new project named `Comarch Optima Business Semantics`.

- [ ] **Step 0.2: Note the project ID** from the URL (`/#/application/detail/arrange?appid={id}`) or from `GET /v1/schemas/graph/{id}`. If the ID is not 15, update all references below to match.

Expected project ID: **15** (first free after 14).

---

### Task 1: Create Schema Definition

**Files:**
- Create: `docs/reference/ComarchOptimaBusinessSemantics.schema`

- [ ] **Step 1.1: Write the schema file**

```text
namespace ComarchOptimaBusinessSemantics

BusinessDomain(BusinessDomain): ConceptType
	hypernymPredicate: isA

BusinessDescription(BusinessDescription): EntityType
	properties:
		description(description): Text
		name(name): Text
		semanticType(semanticType): Text
			index: Text
		tableRefId(tableRefId): Text
		columnRefId(columnRefId): Text
		source(source): Text
		language(language): Text
		domainName(domainName): Text
		descriptionPreview(descriptionPreview): Text
			index: TextAndVector
		descriptionHash(descriptionHash): Text
			index: Text
		descriptionLength(descriptionLength): Text

CodeMeaning(CodeMeaning): EntityType
	properties:
		description(description): Text
		name(name): Text
		semanticType(semanticType): Text
			index: Text
		columnRefId(columnRefId): Text
		codeValue(codeValue): Text
		label(label): Text
		source(source): Text
		domainName(domainName): Text

BusinessRule(BusinessRule): EntityType
	properties:
		description(description): Text
		name(name): Text
		semanticType(semanticType): Text
			index: Text
		tableRefId(tableRefId): Text
		ruleType(ruleType): Text
		expression(expression): Text
		descriptionPreview(descriptionPreview): Text
			index: TextAndVector
		descriptionHash(descriptionHash): Text
			index: Text
		descriptionLength(descriptionLength): Text
		isHardConstraint(isHardConstraint): Text
		domainName(domainName): Text
```

- [ ] **Step 1.2: Push schema to OpenSPG**

```bash
OPENSPG_PROJECT_ID=15 OPENSPG_SCHEMA_FILE=docs/reference/ComarchOptimaBusinessSemantics.schema node scripts/push_openspg_schema.mjs
```

- [ ] **Step 1.3: Verify schema push was successful**

Check the output contains `"success": true`. If it fails, check the project exists and the OPENSPG_COOKIE is valid.

- [ ] **Step 1.4: Commit**

```bash
git add docs/reference/ComarchOptimaBusinessSemantics.schema
git commit -m "feat: add ComarchOptimaBusinessSemantics schema"
```

---

### Task 2: Setup Export Directory Structure

**Files:**
- No file changes — only `mkdir`

- [ ] **Step 2.1: Create export directory**

```bash
mkdir -p /docker/openspg/exports/optima_business_semantics/v1
```

---

### Task 3: Create Export Script

**Files:**
- Create: `scripts/export_optima_business_semantics.mjs`

This is the core script. It runs two modes:
- **Live MSSQL mode** (default): connects to CDN_TEST + CDN_KNF, extracts CHECK constraints, lookup tables, extended properties, defaults.
- **Helper-only mode** (`OPENSPG_HELPER_ONLY=1`): parses existing `exports/optima_schema/v1/constraint.csv` and `table_query_guide.csv` for heuristics, skips MSSQL.

- [ ] **Step 3.1: Write the export script (part 1 — imports, config, helpers)**

```javascript
#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Connection, Request } from 'tedious';
import { ensureDir, csvEscape, writeCsv, writeJson, slug, makeId } from './lib/export_utils.mjs';

const ROOT = '/docker/openspg';
const EXPORT_DIR = path.join(ROOT, 'exports/optima_business_semantics/v1');
const MANIFEST_PATH = path.join(EXPORT_DIR, '_manifest.json');
const SCHEMA_EXPORT_DIR = path.join(ROOT, 'exports/optima_schema/v1');

function fileSha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function normalizeValue(value) {
  return String(value ?? '').trim();
}

function typedAs(connectionString) {
  return connectionString.includes('KNF') ? 'KNF' : 'TEST';
}

function tableRefId(database, schema, tableName) {
  const dbType = typedAs(database);
  return `CDN_${dbType}:TABLE:${schema}.${tableName}`;
}

function columnRefId(database, schema, tableName, columnName) {
  const dbType = typedAs(database);
  return `CDN_${dbType}:COLUMN:${schema}.${tableName}.${columnName}`;
}

function sha256hex(value) {
  return crypto.createHash('sha256').update(String(value ?? '')).digest('hex');
}

// --- MSSQL query helpers ---
function executeQuery(connectionString, query, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const config = { connectionString, options: { encrypt: false, trustServerCertificate: true } };
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
```

- [ ] **Step 3.2: Write export script (part 2 — connection string loading)**

```javascript
function loadConnectionStrings() {
  const configPath = '/root/.codex/config.toml';
  if (!fs.existsSync(configPath)) return { test: null, knf: null };

  const config = fs.readFileSync(configPath, 'utf8');
  const matchTest = config.match(/^connection_string\s*=\s*"([^"]*CDN_TEST[^"]*)"/m);
  const matchKnf = config.match(/^connection_string\s*=\s*"([^"]*KNF[^"]*)"/m);

  return {
    test: matchTest ? matchTest[1] : null,
    knf: matchKnf ? matchKnf[1] : null,
  };
}
```

- [ ] **Step 3.3: Write export script (part 3 — CHECK constraints extraction)**

```javascript
async function extractCheckConstraints(connectionString) {
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
  const result = await executeQuery(connectionString, query);
  const rows = result.rows.map((row) => ({
    schema_name: normalizeValue(row.schema_name),
    table_name: normalizeValue(row.table_name),
    constraint_name: normalizeValue(row.constraint_name),
    constraint_definition: normalizeValue(row.constraint_definition),
  }));
  return rows;
}

function parseInValues(definition) {
  if (!definition) return null;
  const match = definition.match(/IN\s*\(([^)]+)\)/i);
  if (!match) return null;
  const values = [];
  for (const part of match[1].split(',')) {
    const trimmed = part.trim().replace(/^'|'$/g, '').replace(/^0x[0-9a-f]+$/i, '');
    if (trimmed) values.push(trimmed);
  }
  return values.length > 0 ? values : null;
}
```

- [ ] **Step 3.4: Write export script (part 4 — lookup table detection)**

```javascript
async function detectLookupTables(connectionString) {
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
  const result = await executeQuery(connectionString, query);
  const tables = result.rows.map((row) => ({
    schema_name: normalizeValue(row.schema_name),
    table_name: normalizeValue(row.table_name),
    row_count: Number(row.row_count ?? 0),
  }));
  return tables;
}

async function loadLookupTableData(connectionString, schemaName, tableName) {
  const colsResult = await executeQuery(connectionString, `
    SELECT TOP 0 * FROM [${schemaName}].[${tableName}]
  `);
  const cols = colsResult.columns;
  if (cols.length < 2 || cols.length > 4) return null;

  const dataQuery = `SELECT TOP 200 * FROM [${schemaName}].[${tableName}]`;
  const dataResult = await executeQuery(connectionString, dataQuery);
  if (dataResult.rows.length < 1) return null;

  const idCol = cols.find((c) => /id|typ|kod/i.test(c)) || cols[0];
  const labelCol = (cols.length >= 2 ? cols.find((c) => c !== idCol && /nazw|nazw[ae]|opis|etykiet|label|name|wartosc/i.test(c)) : null) || (cols.length >= 2 ? cols[1] : null);

  if (!labelCol) return null;

  return dataResult.rows.map((row) => ({
    code: normalizeValue(row[idCol]),
    label: normalizeValue(row[labelCol]),
  }));
}
```

- [ ] **Step 3.5: Write export script (part 5 — extended properties)**

```javascript
async function extractExtendedProperties(connectionString) {
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
  const result = await executeQuery(connectionString, query);
  return result.rows.map((row) => ({
    schema_name: normalizeValue(row.schema_name),
    table_name: normalizeValue(row.table_name),
    column_name: normalizeValue(row.column_name),
    description: normalizeValue(row.description),
  }));
}
```

- [ ] **Step 3.6: Write export script (part 6 — default constraints)**

```javascript
async function extractDefaultConstraints(connectionString) {
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
  const result = await executeQuery(connectionString, query);
  return result.rows.map((row) => ({
    schema_name: normalizeValue(row.schema_name),
    table_name: normalizeValue(row.table_name),
    column_name: normalizeValue(row.column_name),
    constraint_name: normalizeValue(row.constraint_name),
    constraint_definition: normalizeValue(row.constraint_definition),
  }));
}
```

- [ ] **Step 3.7: Write export script (part 7 — heuristic table classification)**

```javascript
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
  if (/crm/i.test(t)) return `${domainPrefix} Dane CRM — leady, szanse sprzedaży, oferty.`;
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
```

- [ ] **Step 3.8: Write export script (part 8 — helper-only mode: parse existing constraint.csv)**

```javascript
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
      constraintType: parts[colIdx.constraintType] ?? '',
      definition: parts[colIdx.definition] ?? '',
      sqlName: parts[colIdx.sqlName] ?? '',
      tableRefId: parts[colIdx.tableRefId] ?? '',
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
      tableRefId: parts[colIdx.tableRefId] ?? '',
      sqlName: parts[colIdx.sqlName] ?? '',
      moduleHint: parts[colIdx.moduleHint] ?? '',
      businessAreaHint: parts[colIdx.businessAreaHint] ?? '',
    };
  });
}
```

- [ ] **Step 3.9: Write export script (part 9 — main export function)**

```javascript
async function main() {
  ensureDir(EXPORT_DIR);
  const isHelperOnly = process.env.OPENSPG_HELPER_ONLY === '1';
  const connStrings = loadConnectionStrings();

  // === CSV 1: BusinessDomain ===
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

  // === MSSQL extraction (if available) ===
  let allCheckConstraints = [];
  let allLookupTables = [];
  let allExtendedProps = [];
  let allDefaultConstraints = [];

  if (!isHelperOnly && (connStrings.test || connStrings.knf)) {
    const connections = [];
    if (connStrings.test) connections.push({ db: 'TEST', cs: connStrings.test });
    if (connStrings.knf) connections.push({ db: 'KNF', cs: connStrings.knf });

    for (const { db, cs } of connections) {
      try {
        const checks = await extractCheckConstraints(cs);
        allCheckConstraints.push(...checks.map((c) => ({ ...c, database: db })));

        const lookups = await detectLookupTables(cs);
        allLookupTables.push(...lookups.map((l) => ({ ...l, database: db })));

        const props = await extractExtendedProperties(cs);
        allExtendedProps.push(...props.map((p) => ({ ...p, database: db })));

        const defaults = await extractDefaultConstraints(cs);
        allDefaultConstraints.push(...defaults.map((d) => ({ ...d, database: db })));
      } catch (err) {
        console.error(`MSSQL connection failed for ${db}: ${err.message}`);
      }
    }
  }

  // === Helper-only: parse existing exports ===
  if (isHelperOnly || allCheckConstraints.length === 0) {
    const existingChecks = loadExistingConstraints();
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

  // === CSV 2: BusinessDescription ===
  const descriptionRows = [];
  const descSeen = new Set();

  // From extended properties
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

  // From table guides + heuristics (for tables without extended properties)
  for (const guide of tableGuides) {
    if (!guide.tableRefId) continue;
    if (descSeen.has(guide.tableRefId)) continue;
    descSeen.add(guide.tableRefId);

    const tableName = guide.sqlName || guide.tableRefId.split('.')[1] || '';
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

  // Column descriptions from heuristics
  for (const check of allCheckConstraints) {
    const def = check.constraint_definition || '';
    const colMatch = def.match(/\(([a-zA-Z_]+)\s*(?:>=|<=|=|<|>|!=|<>|IN)\s*/);
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

  // === CSV 3: CodeMeaning ===
  const codeRows = [];
  const codeSeen = new Set();

  // From CHECK constraints with IN(...)
  for (const check of allCheckConstraints) {
    const def = check.constraint_definition || '';
    const inVals = parseInValues(def);
    if (!inVals) continue;

    const colMatch = def.match(/\(([a-zA-Z_]+)\s+IN\s*\(/);
    if (!colMatch) continue;

    const colName = colMatch[1];
    const trId = check.tableRefId || tableRefId(`CDN_${check.database}`, check.schema_name, check.table_name);
    const crId = columnRefId(`CDN_${check.database}`, check.schema_name, check.table_name, colName);

    for (const codeVal of inVals) {
      const key = `${crId}:${codeVal}`;
      if (codeSeen.has(key)) continue;
      codeSeen.add(key);

      codeRows.push({
        id: makeId('CM', key),
        name: `${check.table_name}.${colName}=${codeVal}`,
        columnRefId: crId,
        codeValue: codeVal,
        label: '',
        source: 'check_constraint',
        domainName: classifyDomain(check.table_name),
      });
    }
  }

  // From lookup tables (only in live MSSQL mode)
  if (!isHelperOnly) {
    for (const lookup of allLookupTables) {
      const cs = lookup.database === 'KNF' ? connStrings.knf : connStrings.test;
      if (!cs) continue;

      try {
        const data = await loadLookupTableData(cs, lookup.schema_name, lookup.table_name);
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

  // === CSV 4: BusinessRule ===
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

  // === Manifest ===
  const manifest = {
    generatedAt: new Date().toISOString(),
    namespace: 'ComarchOptimaBusinessSemantics',
    mode: isHelperOnly ? 'helper_only' : 'live_mssql',
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

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
```

- [ ] **Step 3.10: Test the export script in helper-only mode**

```bash
OPENSPG_HELPER_ONLY=1 node scripts/export_optima_business_semantics.mjs
```

Expected: creates 4 CSV files in `exports/optima_business_semantics/v1/` and a `_manifest.json`. Domain CSV should have 8 rows. Other CSVs should have at least some rows from existing constraint.csv (if available).

- [ ] **Step 3.11: Commit**

```bash
git add scripts/export_optima_business_semantics.mjs
git commit -m "feat: add business semantics exporter for Optima"
```

---

### Task 4: Create Build Thin Wrapper

**Files:**
- Create: `scripts/build_optima_business_semantics.mjs`

- [ ] **Step 4.1: Write the build wrapper**

```javascript
#!/usr/bin/env node

process.env.OPENSPG_BUILD_PROFILE = process.env.OPENSPG_BUILD_PROFILE || 'optima_business_semantics';
await import('./build_kb_runner.mjs');
```

- [ ] **Step 4.2: Commit**

```bash
git add scripts/build_optima_business_semantics.mjs
git commit -m "feat: add business semantics build wrapper"
```

---

### Task 5: Add Profile to build_kb_runner.mjs

**Files:**
- Modify: `scripts/build_kb_runner.mjs` — add profile object to PROFILES map

- [ ] **Step 5.1: Add profile after `optima_schema_metadata` profile** (after line ~169)

Add to `PROFILES` object:

```javascript
  optima_business_semantics: {
    projectId: Number(process.env.OPENSPG_PROJECT_ID || 15),
    namespace: 'ComarchOptimaBusinessSemantics',
    jobPrefix: 'COBS',
    exportDir: 'exports/optima_business_semantics/v1',
    uploadManifest: 'upload_business_semantics_manifest.json',
    buildManifest: 'build_business_semantics_jobs_manifest.json',
    readmeTitle: 'ComarchOptimaBusinessSemantics',
    includeShortNames: true,
    listLimit: 100,
    reuseActive: false,
    fileEntityMap: {
      'business_domain.csv': 'BusinessDomain',
      'business_description.csv': 'BusinessDescription',
      'code_meaning.csv': 'CodeMeaning',
      'business_rule.csv': 'BusinessRule',
    },
  },
```

- [ ] **Step 5.2: Commit**

```bash
git add scripts/build_kb_runner.mjs
git commit -m "feat: add optima_business_semantics build profile"
```

---

### Task 6: Integrate with Assistant Routing

**Files:**
- Modify: `scripts/erp_knowledge_assistant.mjs` — add KB_DETAILS entry and morphology boosts
- Modify: `docs/reference/ERP_Knowledge_Assistant_Routing.json` — add route

- [ ] **Step 6.1: Add KB_DETAILS entry in `erp_knowledge_assistant.mjs`** (after `ComarchBetterflyReference`, before the closing `};`)

```javascript
  ComarchOptimaBusinessSemantics: {
    projectId: 0,
    namespace: 'ComarchOptimaBusinessSemantics',
    summary: 'Business semantics for Optima tables: code-to-label mappings, business descriptions, validation rules, domain classification.',
    artifacts: [
      'docs/reference/ComarchOptimaBusinessSemantics.schema',
      'exports/optima_business_semantics/v1/business_description.csv',
      'exports/optima_business_semantics/v1/code_meaning.csv',
      'exports/optima_business_semantics/v1/business_rule.csv',
      'exports/optima_business_semantics/v1/business_domain.csv',
    ],
  },
```

Note: `projectId: 0` is temporary — update when the project ID is confirmed.

- [ ] **Step 6.2: Add morphology boost for business semantics questions** (after the `betterfly_api` morphology block, before the closing `}` of `applyMorphologyBoosts`)

```javascript
  if (route.intent === 'optima_business_semantics') {
    if (questionNormalized.includes('znaczy') || questionNormalized.includes('znaczenie')) {
      score += 4;
      matched.push('znacz*');
    }
    if (questionNormalized.includes('typ') && (questionNormalized.includes('dokument') || questionNormalized.includes('dokumentu'))) {
      score += 3;
      matched.push('typ* + dokument*');
    }
    if (questionNormalized.includes('kod') || questionNormalized.includes('kody')) {
      score += 2;
      matched.push('kod*');
    }
    if (questionNormalized.includes('oznacza') || questionNormalized.includes('reprezentuje')) {
      score += 3;
      matched.push('oznacza/reprezentuje');
    }
    if (questionNormalized.includes('co to') && (questionNormalized.includes('tabela') || questionNormalized.includes('kolumna'))) {
      score += 3;
      matched.push('co to + tabela/kolumna');
    }
    if (questionNormalized.includes('opis') && (questionNormalized.includes('biznesow') || questionNormalized.includes('dziedzin'))) {
      score += 2;
      matched.push('opis* + biznesow*/dziedzin*');
    }
    if (questionNormalized.includes('slownik') || questionNormalized.includes('wartosci')) {
      score += 2;
      matched.push('slownik/wartosci');
    }
    if (questionNormalized.includes('regula') || questionNormalized.includes('walidacj') || questionNormalized.includes('ograniczen')) {
      score += 3;
      matched.push('regula/walidacj/ograniczen');
    }
    if (questionNormalized.includes('co oznacza') || questionNormalized.includes('czym jest')) {
      score += 3;
      matched.push('co oznacza/czym jest');
    }
    if (questionNormalized.includes('jaka') && (questionNormalized.includes('wartosc') || questionNormalized.includes('dopuszczaln'))) {
      score += 2;
      matched.push('jaka wartosc/dopuszczaln');
    }
  }
```

- [ ] **Step 6.3: Add new route to `ERP_Knowledge_Assistant_Routing.json`** (before the `betterfly_api` route, at the end of the routes array)

```json
    {
      "intent": "optima_business_semantics",
      "primaryKb": "ComarchOptimaBusinessSemantics",
      "supportKbs": [
        "ComarchOptimaSchema"
      ],
      "keywords": [
        "znaczy",
        "znaczenie",
        "oznacza",
        "reprezentuje",
        "co to za",
        "czym jest",
        "typ dokumentu",
        "kod",
        "kody",
        "etykieta",
        "słownik",
        "wartości",
        "dopuszczalne",
        "reguła",
        "walidacja",
        "ograniczenie",
        "opis biznesowy",
        "co oznacza",
        "jaka wartość",
        "domena biznesowa"
      ]
    },
```

- [ ] **Step 6.4: Update `primaryKbOrder` in routing.json** — add `"ComarchOptimaBusinessSemantics"` before `"ComarchOptimaSchema"` in the order array:

```json
  "primaryKbOrder": [
    "TaxbellLegalReference",
    "TaxbellPayrollHRReference",
    "TaxbellAccountingVATReference",
    "ComarchCommunityNews",
    "ComarchOptimaBusinessSemantics",
    "ComarchOptimaSchema",
    ...
```

- [ ] **Step 6.5: Commit**

```bash
git add scripts/erp_knowledge_assistant.mjs docs/reference/ERP_Knowledge_Assistant_Routing.json
git commit -m "feat: integrate business semantics KB into assistant routing"
```

---

### Task 7: Integrate with MCP Server

**Files:**
- Modify: `scripts/lib/erp_knowledge_mcp_core.mjs` — add to KB_REGISTRY

- [ ] **Step 7.1: Add KB to KB_REGISTRY in mcp_core.mjs** (after `ComarchBetterflyReference`)

```javascript
  { name: 'Comarch Optima Business Semantics', namespace: 'ComarchOptimaBusinessSemantics', projectId: 15 },
```

- [ ] **Step 7.2: Commit**

```bash
git add scripts/lib/erp_knowledge_mcp_core.mjs
git commit -m "feat: register business semantics KB in MCP server"
```

---

### Task 8: Update AGENTS.md Project Table

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 8.1: Add new KB entry to the Active OpenSPG knowledge bases table**

After project 10 row, add:
```
| 15 | Comarch Optima Business Semantics | `ComarchOptimaBusinessSemantics` | `export_optima_business_semantics.mjs` | `build_optima_business_semantics.mjs` |
```

- [ ] **Step 8.2: Commit**

```bash
git add AGENTS.md
git commit -m "docs: add business semantics KB to AGENTS.md"
```

---

### Task 9: Full Pipeline Test

**Files:** No file changes — verification only

- [ ] **Step 9.1: Run export in helper-only mode**

```bash
OPENSPG_HELPER_ONLY=1 node scripts/export_optima_business_semantics.mjs
```

Expected: 4 CSV files created. Check `exports/optima_business_semantics/v1/_manifest.json` for row counts.

- [ ] **Step 9.2: Validate manifest contents**

```bash
cat exports/optima_business_semantics/v1/_manifest.json
```

Expected: `files` array with 4 entries, each having `fileName`, `rowCount`, `columns`.

- [ ] **Step 9.3: Spot-check CSV contents**

```bash
head -5 exports/optima_business_semantics/v1/business_domain.csv
head -5 exports/optima_business_semantics/v1/business_description.csv
head -5 exports/optima_business_semantics/v1/code_meaning.csv
head -5 exports/optima_business_semantics/v1/business_rule.csv
```

Expected: Well-formed CSV with headers matching entity properties.

- [ ] **Step 9.4: Run syntax check**

```bash
node --check scripts/export_optima_business_semantics.mjs && echo "OK"
node --check scripts/build_optima_business_semantics.mjs && echo "OK"
```

Expected: `OK` for both.

- [ ] **Step 9.5: If MSSQL is available, run live export**

```bash
node scripts/export_optima_business_semantics.mjs
```

Expected: Larger row counts, code meanings with labels from lookup tables.

- [ ] **Step 9.6: Run build pipeline**

```bash
OPENSPG_PROJECT_ID=15 node scripts/build_optima_business_semantics.mjs
```

Expected: Uploads CSVs, submits builder jobs, waits for FINISH.

- [ ] **Step 9.7: Test assistant routing**

```bash
node scripts/erp_knowledge_assistant.mjs "co oznacza typ dokumentu TrN_Typ = 3 w tabeli TraNag"
```

Expected: Should route to `ComarchOptimaBusinessSemantics` primary KB with `ComarchOptimaSchema` as support.

- [ ] **Step 9.8: Test MCP routing**

```bash
curl -s http://10.10.254.42:3400/mcp -X POST -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"route_question","arguments":{"question":"co oznacza kod 1 w tabeli TraNag"}}}' 2>&1 | head -50
```

Expected: Response routes to `ComarchOptimaBusinessSemantics`.

- [ ] **Step 9.9: Verify docker compose still valid**

```bash
docker compose config --quiet && echo "OK" || echo "FAIL"
```

Expected: `OK`.
