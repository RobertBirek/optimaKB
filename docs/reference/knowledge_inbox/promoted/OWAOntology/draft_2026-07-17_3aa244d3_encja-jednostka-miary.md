# Encja: Jednostka miary
- draftId: `draft_2026-07-17_3aa244d3_encja-jednostka-miary`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:46.626Z`
- tags: `OWA`, `ontologia`, `optima`, `jednostka-miary`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encyja: Jednostka miary

## Status weryfikacji
**Zweryfikowane** — tabela MSSQL potwierdzona, endpoint MCP potwierdzony.

## Opis biznesowy
Jednostka miary (CDN.TwrJm) definiuje przeliczniki jednostek dla towarów. Każdy rekord opisuje relację między jednostką podstawową a pomocniczą (`TwJ_JmZ`), wraz z przelicznikami (`TwJ_PrzeliczM`, `TwJ_PrzeliczL`) i wagą/objętością. Rekordy są identyfikowane przez composite key: (TwJ_TwrTyp, TwJ_TwrFirma, TwJ_TwrNumer, TwJ_TwrLp).

## Reguły biznesowe
- PK composite: TwJ_TwrTyp + TwJ_TwrFirma + TwJ_TwrNumer + TwJ_TwrLp
- `TwJ_JmZ` (nvarchar(8)) — kod jednostki pomocniczej
- `TwJ_PrzeliczM` / `TwJ_PrzeliczL` — mnożnik/licznik przelicznika
- `TwJ_Calkowita` (tinyint) — czy jednostka całkowita
- `TwJ_EAN` (varchar(20)) — EAN dla jednostki (osobny indeks TwjEAN)
- `TwJ_TypJm` (tinyint) — typ jednostki miary [UNKNOWN enum]

## Źródła danych
- **Tabela główna**: `CDN.TwrJm` (BASE TABLE, 0 wierszy w testowej)

## Identyfikatory
| Pole | Typ | Opis |
|------|-----|------|
| `TwJ_TwrTyp` | smallint | Część PK — typ towaru |
| `TwJ_TwrFirma` | int | Część PK — ID firmy |
| `TwJ_TwrNumer` | int | Część PK — numer towaru |
| `TwJ_TwrLp` | smallint | Część PK — liczba porządkowa |

## Pola i mapowanie API↔MSSQL
- `TwJ_TwrTyp`, `TwJ_TwrFirma`, `TwJ_TwrNumer`, `TwJ_TwrLp` (composite PK) — NOT EXPOSED BY MCP
- `TwJ_JmZ` (nvarchar(8)) — `list_unit_mappings`
- `TwJ_JmFormat` (tinyint) — NOT EXPOSED BY MCP
- `TwJ_TypJm` (tinyint) — NOT EXPOSED BY MCP
- `TwJ_Calkowita` (tinyint) — NOT EXPOSED BY MCP
- `TwJ_PrzeliczM` (decimal(15,0)) — `list_unit_mappings`
- `TwJ_PrzeliczL` (decimal(15,0)) — `list_unit_mappings`
- `TwJ_Prog` (decimal(11,4)) — NOT EXPOSED BY MCP
- `TwJ_Obowiazek` (tinyint) — NOT EXPOSED BY MCP
- `TwJ_Waga` (decimal(7,3)) — NOT EXPOSED BY MCP
- `TwJ_WJm` (nvarchar(5)) — NOT EXPOSED BY MCP
- `TwJ_EAN` (varchar(20)) — NOT EXPOSED BY MCP
- `TwJ_WyliczPrzySpr` (smallint) — NOT EXPOSED BY MCP
- `TwJ_ObjetoscL`, `TwJ_ObjetoscM` (decimal(5,0)) — NOT EXPOSED BY MCP
- `TwJ_WagaBrutto` (decimal(7,3)) — NOT EXPOSED BY MCP
- `TwJ_WJmBrutto` (nvarchar(5)) — NOT EXPOSED BY MCP
- `TwJ_KcaTyp`, `TwJ_KcaFirma`, `TwJ_KcaNumer`, `TwJ_KcaLp` — NOT EXPOSED BY MCP (referencja do kaucji? [UNKNOWN])

## Relacje ontologiczne
- **NALEZY_DO_TOWARU** (N:1) → `CDN.Towary` przez composite key (TwJ_TwrTyp, TwJ_TwrFirma, TwJ_TwrNumer) — brak formalnego FK w schemacie
- **POWIAZANA_Z_EAN** (1:1?) → `CDN.TwrEan` przez `TwJ_EAN` (indeks TwjEAN, brak FK)
- **POWIAZANA_Z_KAUCJA** (N:1?) → [UNKNOWN] przez TwJ_Kca* (indeks TwJKaucja)

## Endpointy OptimaMCP
| Narzędzie | Operacja |
|-----------|----------|
| `list_unit_mappings` | READ — lista mapowań jednostek |

## Pochodzenie wiedzy
- `mssql_describe_table` (CDN.TwrJm, 2026-07-15)
- 0 wierszy w testowej — brak danych do analizy wzorców

## Otwarte problemy
1. Brak FK constraints — czy relacja do Towary jest gwarantowana na poziomie aplikacji?
2. `TwJ_Kca*` — co to za referencja? (może Kaucje?)
3. `TwJ_WyliczPrzySpr` — znaczenie flagi?
4. Enum `TwJ_TypJm` nieznany.

## Metadane
- Wykryte przez: `manual_analysis_mcp_mssql`
- Data pozyskania: 2026-07-15
- Tabela: `CDN.TwrJm` (ROW_COUNT=0)
- PK: composite (TwJ_TwrTyp, TwJ_TwrFirma, TwJ_TwrNumer, TwJ_TwrLp)

## Walidacja
- [x] `mssql_describe_table` potwierdza strukturę
- [ ] Zweryfikuj `list_unit_mappings` działanie
- [ ] Zbadaj referencję TwJ_Kca*