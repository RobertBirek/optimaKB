# Encja: Kod EAN / Barcode
- draftId: `draft_2026-07-17_73d227b7_encja-kod-ean-barcode`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:44.941Z`
- tags: `OWA`, `ontologia`, `optima`, `kod-ean`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encyja: Kod EAN / Barcode

## Status weryfikacji
**Zweryfikowane** — tabela MSSQL i endpointy MCP potwierdzone.

## Opis biznesowy
Kod EAN (CDN.TwrEan) przechowuje kody kreskowe (barcodes) dla towarów. Jeden towar może mieć wiele kodów EAN. Istnieje również kod domyślny (`TwE_Domyslny`). Każdy kod EAN może być powiązany z jednostką miary (`TwE_JM`).

## Reguły biznesowe
- UNIQUE na (TwE_TwrID, TwE_EAN) — kod EAN jest unikalny w ramach towaru
- FK do Towary z CASCADE — usunięcie towaru kasuje wszystkie jego EANy
- `TwE_Domyslny` (tinyint) — flaga kodu domyślnego
- `TwE_JM` określa jednostkę miary dla danego EAN

## Źródła danych
- **Tabela główna**: `CDN.TwrEan` (BASE TABLE, 1 wiersz w testowej)

## Identyfikatory
| Pole | Typ | Opis |
|------|-----|------|
| `TwE_TwEId` | int IDENTITY | PK (clustered) |
| `TwE_TwrID` | int FK→CDN.Towary | Towar (CASCADE) |
| `TwE_EAN` | varchar(40) | Kod EAN |

## Pola i mapowanie API↔MSSQL
- `TwE_TwEId` (int, IDENTITY, PK) — NOT EXPOSED BY MCP
- `TwE_TwrID` (int, FK→Towary, CASCADE) — `list_item_barcodes` / `create_item_barcode`
- `TwE_EAN` (varchar(40)) — `list_item_barcodes` / `create_item_barcode`
- `TwE_Opis` (nvarchar(100)) — `list_item_barcodes` / `create_item_barcode`
- `TwE_Domyslny` (tinyint) — NOT EXPOSED BY MCP
- `TwE_JM` (nvarchar(20)) — NOT EXPOSED BY MCP

## Relacje ontologiczne
- **NALEZY_DO_TOWARU** (N:1) → `CDN.Towary` przez `TwE_TwrID → Twr_TwrId` (CASCADE)

## Endpointy OptimaMCP
| Narzędzie | Operacja |
|-----------|----------|
| `list_item_barcodes` | READ — lista kodów EAN |
| `create_item_barcode` | WRITE — tworzy kod EAN |

## Pochodzenie wiedzy
- `mssql_describe_table` (CDN.TwrEan, 2026-07-15)
- Analiza indeksów: `TwETowar` (UNIQUE na TwE_TwrID+TwE_EAN), `TwEEan` (NONCLUSTERED na TwE_EAN)

## Otwarte problemy
1. Mapping endpointów MCP do pełnych kolumn niepotwierdzony — `list_item_barcodes` zwraca jakie pola?
2. `TwE_JM` powiązane z `CDN.TwrJm`? Brak FK w schemacie.
3. Tylko 1 wiersz w testowej — mało danych do analizy wzorców.

## Metadane
- Wykryte przez: `manual_analysis_mcp_mssql`
- Data pozyskania: 2026-07-15
- Tabela: `CDN.TwrEan` (ROW_COUNT=1)
- PK: `TwE_TwEId`
- FK: `TwE_TwrID → CDN.Towary.Twr_TwrId` (CASCADE)

## Walidacja
- [x] `mssql_describe_table` potwierdza strukturę
- [ ] Zweryfikuj działanie `list_item_barcodes` i `create_item_barcode`
- [ ] Sprawdź czy `TwE_JM` mapuje się do `CDN.TwrJm.TwJ_JmZ`