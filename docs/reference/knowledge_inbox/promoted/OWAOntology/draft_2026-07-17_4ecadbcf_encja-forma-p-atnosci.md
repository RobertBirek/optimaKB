# Encja: Forma płatności
- draftId: `draft_2026-07-17_4ecadbcf_encja-forma-p-atnosci`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:42:25.484Z`
- tags: `OWA`, `ontologia`, `optima`, `forma-platnosci`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encyja: Forma płatności

## Status weryfikacji
**Zweryfikowane** — tabela MSSQL i endpointy MCP potwierdzone.

## Opis biznesowy
Forma płatności (CDN.FormyPlatnosci) definiuje sposób rozliczenia dokumentów (przelew, gotówka, karta itp.). Każda forma ma nazwę, typ, termin płatności w dniach (`FPl_Termin`), może być powiązana z rachunkiem bankowym (`FPl_BRaId`) i może mieć przypisany rabat (`FPl_Rabat`).

## Reguły biznesowe
- `FPl_Nazwa` — UNIQUE, maks 20 znaków
- `FPl_Termin >= 0` (CHECK constraint)
- `FPl_Typ` (smallint) — typ formy płatności [UNKNOWN enum]
- `FPl_BRaId` → BnkRachunki (FK, NO ACTION)
- `FPl_NieAktywny` (smallint) — flaga dezaktywacji
- `FPl_Domyslna` (tinyint) — flaga formy domyślnej
- `FPl_Rabat` (decimal(5,2)) — domyślny rabat przy tej formie

## Źródła danych
- **Tabela główna**: `CDN.FormyPlatnosci` (BASE TABLE, 10 wierszy)
- **Tabele pomocnicze**: `CDN.FormyPlatnWaluty` (asocjacja walut)

## Identyfikatory
| Pole | Typ | Opis |
|------|-----|------|
| `FPl_FPlId` | int IDENTITY | PK (clustered) |
| `FPl_Nazwa` | nvarchar(20) | Nazwa (UNIQUE INDEX) |

## Pola i mapowanie API↔MSSQL
- `FPl_FPlId` (int, IDENTITY, PK) — `list_payment_forms` / `create_payment_form`
- `FPl_Nazwa` (nvarchar(20)) — `list_payment_forms` / `create_payment_form`
- `FPl_Typ` (smallint) — NOT EXPOSED BY MCP
- `FPl_BRaId` (int, FK→BnkRachunki) — NOT EXPOSED BY MCP
- `FPl_PodmiotTyp`, `FPl_PodmiotID` — NOT EXPOSED BY MCP
- `FPl_Termin` (smallint) — NOT EXPOSED BY MCP
- `FPl_NieAktywny` (smallint) — NOT EXPOSED BY MCP
- `FPl_TS_Export` (datetime) — NOT EXPOSED BY MCP
- `FPl_ImportAppId`, `FPl_ImportRowId` — NOT EXPOSED BY MCP
- `FPl_XLID` (int) — NOT EXPOSED BY MCP
- `FPl_Rabat` (decimal(5,2)) — NOT EXPOSED BY MCP
- `FPl_TerminalPlatniczy` (smallint, DEFAULT 0) — NOT EXPOSED BY MCP
- `FPl_KSeFId` (int, DEFAULT 0) — NOT EXPOSED BY MCP
- `FPl_Domyslna` (tinyint) — NOT EXPOSED BY MCP

## Relacje ontologiczne
- **POSIADA_RACHUNEK** (N:1) → `CDN.BnkRachunki` przez `FPl_BRaId → BRa_BRaID`
- **OBSLUGUJE_WALUTY** (N:M) → `CDN.FormyPlatnWaluty` przez `FPW_FPlId`
- **UZYWANA_PRZEZ_DOKUMENTY** (1:N) → `CDN.TraNag` przez `TrN_FPlId`
- **UZYWANA_PRZEZ_KONTRAHENTOW** (1:N) → `CDN.Kontrahenci` [UNKNOWN kolumna FK]

## Endpointy OptimaMCP
| Narzędzie | Operacja |
|-----------|----------|
| `list_payment_forms` | READ — lista form płatności |
| `create_payment_form` | WRITE — tworzy formę |
| `update_payment_form` | WRITE — aktualizuje formę |
| `delete_payment_form` | WRITE — usuwa formę |

## Pochodzenie wiedzy
- `mssql_describe_table` (CDN.FormyPlatnosci, 2026-07-15)
- 10 wierszy w testowej, CHECK constraint FPl_Termin>=0

## Otwarte problemy
1. Enum `FPl_Typ` — wartości (przelew, gotówka, karta, …)?
2. `FPl_KSeFId` — jak mapuje się do systemu KSeF?
3. Mapping endpointów MCP do konkretnych kolumn niepotwierdzony runtime.

## Metadane
- Wykryte przez: `manual_analysis_mcp_mssql`
- Data pozyskania: 2026-07-15
- Tabela: `CDN.FormyPlatnosci` (ROW_COUNT=10)
- PK: `FPl_FPlId` (IDENTITY)
- FK: `FPl_BRaId → CDN.BnkRachunki.BRa_BRaID` (NO ACTION)

## Walidacja
- [x] `mssql_describe_table` potwierdza strukturę
- [ ] Zweryfikuj `list_payment_forms` — jakie pola zwraca?
- [ ] Sprawdź enum `FPl_Typ`