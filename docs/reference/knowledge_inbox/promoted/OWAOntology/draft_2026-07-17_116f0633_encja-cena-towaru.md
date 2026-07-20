# Encja: Cena towaru
- draftId: `draft_2026-07-17_116f0633_encja-cena-towaru`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:42:25.699Z`
- tags: `OWA`, `ontologia`, `optima`, `cena-towaru`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encyja: Cena towaru

## Status weryfikacji
**Częściowo zweryfikowane** — struktura tabeli potwierdzona przez AGENTS.md, endpointy MCP potwierdzone. Kolumny niezweryfikowane w MSSQL.

## Opis biznesowy
Cena towaru (CDN.TwrCeny) przechowuje definicje cen dla towarów. Każdy towar może mieć wiele cen (rozróżnianych przez `TwC_TwCNumer`). Cena może być wyrażona jako wartość brutto/netto, marża lub narzut. Obsługiwane są przeliczenia walutowe i zaokrąglenia.

## Reguły biznesowe
- UNIQUE na (TwC_TwrID, TwC_TwCNumer) — nie może być duplikatu numeru ceny dla tego samego towaru
- FK do Towary z CASCADE — usunięcie towaru kasuje wszystkie jego ceny
- `TwC_Typ` określa rodzaj ceny (netto/brutto/marża/narzut) [UNKNOWN — enum]
- `TwC_WartoscZakOld` przechowuje poprzednią wartość zakupu

## Źródła danych
- **Tabela główna**: `CDN.TwrCeny` (BASE TABLE)

## Identyfikatory
| Pole | Typ | Opis |
|------|-----|------|
| `TwC_TwCID` | int IDENTITY | PK |
| `TwC_TwrID` | int FK→CDN.Towary | Towar, którego dotyczy cena |
| `TwC_TwCNumer` | int | Numer ceny (unikalny per towar) |

## Pola i mapowanie API↔MSSQL
- `TwC_TwCID` (int, IDENTITY, PK) — NOT EXPOSED BY MCP
- `TwC_TwrID` (int, FK→Towary, CASCADE) — NOT EXPOSED BY MCP
- `TwC_TwCNumer` (int) — NOT EXPOSED BY MCP
- `TwC_Typ` — `get_item_price_info` (READ)
- `TwC_Wartosc` — `get_item_price_info` / `set_item_price` / `calculate_price`
- `TwC_Waluta` — NOT EXPOSED BY MCP
- `TwC_Aktualizacja` — NOT EXPOSED BY MCP
- `TwC_Zaokraglenie` — NOT EXPOSED BY MCP
- `TwC_Marza` — `get_item_price_info` (READ)
- `TwC_MarzaWStu` — NOT EXPOSED BY MCP
- `TwC_Offset` — NOT EXPOSED BY MCP
- `TwC_DokID` — NOT EXPOSED BY MCP
- `TwC_WartoscZakOld` — NOT EXPOSED BY MCP
- `TwC_Punkty` — NOT EXPOSED BY MCP

## Relacje ontologiczne
- **NALEZY_DO_TOWARU** (N:1) → `CDN.Towary` przez `TwC_TwrID → Twr_TwrId` (CASCADE)

## Endpointy OptimaMCP
| Narzędzie | Operacja |
|-----------|----------|
| `get_item_price_info` | READ — pobiera cenę towaru |
| `set_item_price` | WRITE — ustawia cenę |
| `create_item_price` | WRITE — tworzy cenę |
| `calculate_price` | WRITE — kalkulacja ceny bez zapisu |

## Pochodzenie wiedzy
- AGENTS.md + analiza manualna MCP
- Struktura tabeli zdefiniowana w AGENTS.md (sekcja "Entities to create")
- Kolumny niezweryfikowane w MSSQL

## Otwarte problemy
1. Kolumny MSSQL niezweryfikowane przez `mssql_describe_table`. Należy wykonać SELECT.
2. Enum `TwC_Typ`: jakie wartości dla netto, brutto, marży, narzutu?
3. Jak API `get_item_price_info` zwraca które kolumny?

## Metadane
- Wykryte przez: `manual_analysis_mcp_mssql`
- Data pozyskania: 2026-07-15
- Tabela: `CDN.TwrCeny`

## Walidacja
- [ ] Sprawdź `mssql_describe_table` dla CDN.TwrCeny
- [ ] Potwierdź enum TwC_Typ
- [ ] Zweryfikuj endpoint `get_item_price_info` dla przykładowego towaru