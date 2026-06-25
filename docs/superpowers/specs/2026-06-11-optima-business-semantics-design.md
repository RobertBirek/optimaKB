# Comarch Optima Business Semantics KB — Design

**Date:** 2026-06-11
**Status:** Approved
**Namespace:** `ComarchOptimaBusinessSemantics`
**Project ID:** TBD (first free, highest likelihood 15)

## 1. Purpose

This KB fills the gap between database structure (Schema KB, project 4) and interpretation. It answers "what does this mean in business terms." Linked to Schema KB via `tableRefId` / `columnRefId`.

## 2. Data model

| Type | Name | Description |
|---|---|---|
| Entity | `BusinessDescription` | Business-level description of a table or column |
| Entity | `CodeMeaning` | Value → label mapping for a dictionary/enum column |
| Entity | `BusinessRule` | Business rule (CHECK constraint, DEFAULT, trigger logic) |
| Concept | `BusinessDomain` | Business domain: Sales, Warehouse, HR-Payroll, Finance, CRM, Admin |

### Entity properties

**BusinessDescription:**
- `id` (string, PK)
- `name` (string)
- `description` (TextAndVector) — the business description content
- `descriptionLength` (integer)
- `descriptionHash` (string)
- `descriptionPreview` (TextAndVector)
- `tableRefId` (string) — references `Table.id` in `ComarchOptimaSchema`
- `columnRefId` (string, optional) — references `Column.id` in `ComarchOptimaSchema`
- `source` (string) — `extended_property`, `heuristic`, `documentation`
- `language` (string) — `pl`, `en`
- `domainName` (string)

**CodeMeaning:**
- `id` (string, PK)
- `name` (string)
- `columnRefId` (string) — references `Column.id` in `ComarchOptimaSchema`
- `codeValue` (string) — the raw value (e.g. "1", "FS", "PLN")
- `label` (string) — the human-readable label (e.g. "Faktura Sprzedaży")
- `source` (string) — `lookup_table`, `check_constraint`, `documentation`
- `domainName` (string)

**BusinessRule:**
- `id` (string, PK)
- `name` (string)
- `description` (TextAndVector) — human-readable rule description
- `descriptionPreview` (TextAndVector)
- `descriptionLength` (integer)
- `descriptionHash` (string)
- `tableRefId` (string) — references `Table.id` in `ComarchOptimaSchema`
- `ruleType` (string) — `CHECK`, `DEFAULT`, `TRIGGER`
- `expression` (string) — the raw SQL expression
- `isHardConstraint` (boolean) — true for CHECK, false for DEFAULT

**BusinessDomain (concept):**
- `name` (string, PK)
- `description` (string)

## 3. Extraction pipeline (hybrid)

### Layer 1: CodeMeaning (SQL Server — live query)

- Parse `sys.check_constraints` for `IN(...)` lists of fixed values
- Auto-detect lookup tables: tables with <200 rows and 2-3 columns (ID + name pattern)
- Cross-reference: if a column has CHECK `IN(1,2,3)` and a lookup table has matching IDs → map code→label
- Targets: `FormyPlatnosci`, `JednostkiMiar`, `StawkiVAT`, `TypyDokumentow`, `KategorieKontrahentow`, `Magazyny`, etc.
- CSV: `code_meaning.csv` → columns: `columnRefId`, `codeValue`, `label`, `source`, `domainName`

### Layer 2: BusinessDescription (SQL + heuristics)

- Primary: `sys.extended_properties` for `MS_Description` on tables and columns
- Fallback: generate descriptions from:
  - Polish column naming conventions
  - `table_query_guide.csv` business area and role hints from Schema KB
  - Pattern-based table classification (prefixes: `Tra*` → Sales, `Prc*` → HR, `Knt*` → Contractors)
- CSV: `business_description.csv` → columns: `tableRefId`, `columnRefId` (nullable), `description`, `source`, `language`, `domainName`

### Layer 3: BusinessRule (SQL)

- CHECK constraint definitions → parsed to human-readable form
- DEFAULT value definitions → "default rule" type
- Trigger signatures + top-level comments only (not full bodies)
- CSV: `business_rule.csv` → columns: `tableRefId`, `ruleType`, `expression`, `description`, `isHardConstraint`, `domainName`

### Layer 4: Heuristic fallback

For anything SQL didn't cover:
- Business domain classification from table name patterns
- Column descriptions from Polish naming conventions
- Cross-reference with existing `table_query_guide.csv` from Schema KB

### SQL Server connection

Uses the same `tedious` driver and Codex config parsing as `scripts/export_optima_schema_metadata.mjs`. Connects to both `CDN_TEST` and `CDN_KNF_Konfiguracja`.

## 4. Project files

| File | Role |
|---|---|
| `docs/reference/ComarchOptimaBusinessSemantics.schema` | OpenSPG entity definition DSL |
| `scripts/export_optima_business_semantics.mjs` | Exporter (SQL + heuristics → 4 CSVs) |
| `scripts/build_optima_business_semantics.mjs` | Builder (thin wrapper → build_kb_runner) |
| `exports/optima_business_semantics/v1/` | Staging: 4 CSVs + `_manifest.json` |

## 5. CSV → entity mapping for build runner

| CSV | Entity type | Estimated rows |
|---|---|---|
| `business_domain.csv` | `BusinessDomain` (concept) | ~20 |
| `business_description.csv` | `BusinessDescription` | ~2000-4000 |
| `code_meaning.csv` | `CodeMeaning` | ~500-2000 |
| `business_rule.csv` | `BusinessRule` | ~500-1500 |

## 6. Integration with assistant layer

| Script | Change needed |
|---|---|
| `erp_knowledge_assistant.mjs` | Add routing rule: code/type meaning questions → `ComarchOptimaBusinessSemantics` |
| `ERP_Knowledge_Assistant_Routing.json` | New entry for Business Semantics KB |
| `erp_knowledge_mcp_server.mjs` | Add tool/resource for new KB |
| `erp_knowledge_mcp_http_bridge.mjs` | Handle queries to Business Semantics KB |

**No changes needed:** `build_kb_runner.mjs`, `build_client.mjs`, `lib/config.mjs`, `lib/openspg_auth.mjs`.

## 7. Constraints and quirks

- Full SQL expressions stored as plain text (`description`, `expression`) — not `TextAndVector` — to avoid large-body stalling (same pattern as Schema KB)
- Only `descriptionPreview` is vectorized
- Table/column ref-ids follow Schema KB convention: `CDN_TEST:TABLE:CDN.TraNag`, `CDN_TEST:COLUMN:CDN.TraNag.TrN_Numer`
- `POST /v1/schemas` ignores unknown entity types — validate new types server-side before depending on them (standard OpenSPG quirk)
- Cross-KB ref-id properties (`tableRefId`, `columnRefId`) are the FK workaround since custom relations are not materialized in schema graph
