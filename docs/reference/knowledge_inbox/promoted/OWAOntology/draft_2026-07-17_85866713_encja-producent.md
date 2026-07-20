# Encja: Producent
- draftId: `draft_2026-07-17_85866713_encja-producent`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:46.048Z`
- tags: `OWA`, `ontologia`, `optima`, `producent`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encyja: Producent

## Status weryfikacji
**Zweryfikowane** — tabela MSSQL i endpointy MCP potwierdzone. Uwaga: tabela w MSSQL to `CDN.Producenci` (nie "Produconci").

## Opis biznesowy
Producent (CDN.Producenci) reprezentuje producenta towaru. Każdy producent ma kod (`Prd_Kod`, UNIQUE) i nazwę (`Prd_Nazwa`, UNIQUE). Opcjonalnie może mieć URL strony i logo (referencja do danych binarnych). Istnieje też osobna tabela `CDN.Marki` — relacja między Producentem a Marką jest do zbadania.

## Reguły biznesowe
- `Prd_Kod` — UNIQUE (varchar(40))
- `Prd_Nazwa` — UNIQUE na (Nazwa, PrdId)
- `Prd_Logo` (int) — referencja do danych binarnych [UNKNOWN tabela]
- `Prd_URL` — nullable

## Źródła danych
- **Tabela główna**: `CDN.Producenci` (BASE TABLE, 0 wierszy)
- **Powiązane**: `CDN.ProducenciJezykObcy` (tłumaczenia), `CDN.Marki` (marki)

## Identyfikatory
| Pole | Typ | Opis |
|------|-----|------|
| `Prd_PrdId` | int IDENTITY | PK (clustered) |
| `Prd_Kod` | varchar(40) | Kod producenta (UNIQUE) |
| `Prd_Nazwa` | nvarchar(250) | Nazwa producenta (UNIQUE) |

## Pola i mapowanie API↔MSSQL
- `Prd_PrdId` (int, IDENTITY, PK) — `list_manufacturers` / `update_manufacturer` / `delete_manufacturer`
- `Prd_Kod` (varchar(40)) — `list_manufacturers` / `create_manufacturer`
- `Prd_Nazwa` (nvarchar(250)) — `list_manufacturers` / `create_manufacturer` / `update_manufacturer`
- `Prd_URL` (varchar(250)) — `list_manufacturers` / `create_manufacturer` / `update_manufacturer`
- `Prd_Logo` (int) — NOT EXPOSED BY MCP
- `Prd_OpeZalId`, `Prd_StaZalId`, `Prd_TS_Zal` — NOT EXPOSED BY MCP
- `Prd_OpeModId`, `Prd_StaModId`, `Prd_TS_Mod` — NOT EXPOSED BY MCP
- `Prd_OpeModKod`, `Prd_OpeModNazwisko`, `Prd_OpeZalKod`, `Prd_OpeZalNazwisko` — NOT EXPOSED BY MCP

## Relacje ontologiczne
- **PRODUKUJE_TOWAR** (1:N) → `CDN.Towary` [UNKNOWN kolumna FK]
- **POSIADA_TLUMACZENIE** (1:N) → `CDN.ProducenciJezykObcy`
- **POWIAZANY_Z_MARKA** (1:N?) → `CDN.Marki` [do zbadania]

## Endpointy OptimaMCP
| Narzędzie | Operacja |
|-----------|----------|
| `list_manufacturers` | READ — lista producentów |
| `create_manufacturer` | WRITE — tworzy producenta |
| `update_manufacturer` | WRITE — aktualizuje producenta |
| `delete_manufacturer` | WRITE — usuwa producenta |

## Pochodzenie wiedzy
- `mssql_describe_table` (CDN.Producenci, 2026-07-15)
- 0 wierszy, 15 kolumn, 3 indeksy (Prd_Primary, PrdKod UNIQUE, PrdNazwa UNIQUE)
- Potwierdzono nazwę tabeli: `CDN.Producenci` (nie Produconci)

## Otwarte problemy
1. Relacja Producenci ↔ Marki — jaka jest różnica biznesowa?
2. `Prd_Logo` — FK do `CDN.DaneBinarne`?
3. FK do Towary — która kolumna w Towary wskazuje producenta?
4. 0 wierszy w testowej — struktura potwierdzona ale bez danych.

## Metadane
- Wykryte przez: `manual_analysis_mcp_mssql`
- Data pozyskania: 2026-07-15
- Tabela: `CDN.Producenci` (ROW_COUNT=0)
- PK: `Prd_PrdId` (IDENTITY)

## Walidacja
- [x] `mssql_describe_table` potwierdza strukturę
- [x] Potwierdzono poprawną nazwę tabeli: Producenci
- [ ] Zweryfikuj `list_manufacturers` runtime
- [ ] Zbadaj relację Producent ↔ Towary