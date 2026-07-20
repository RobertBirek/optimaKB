# Encja: Grupa towarowa
- draftId: `draft_2026-07-17_348659b8_encja-grupa-towarowa`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:46.896Z`
- tags: `OWA`, `ontologia`, `optima`, `grupa-towarowa`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encyja: Grupa towarowa

## Status weryfikacji
**Częściowo zweryfikowane** — tabela MSSQL potwierdzona, endpointy MCP potwierdzone, mapowanie pól niekompletne.

## Opis biznesowy
Grupy towarowe (CDN.Grupy) to wielozadaniowy słownik w Optimie. Rekordy są rozróżniane polem `Gru_Typ`, które określa przeznaczenie grupy: towarowa, kontrahenta, środka trwałego itp. Grupa towarowa agreguje towary i definiuje domyślne konta księgowe Wn/Ma.

## Reguły biznesowe
- `Gru_Typ` identyfikuje typ grupy (towarowa= [UNKNOWN], kontrahent= [UNKNOWN])
- `Gru_KontoWn` i `Gru_KontoMa` to domyślne konta księgowe dla towarów w grupie
- Grupa może mieć tłumaczenia w `CDN.GrupyJezykObcy`
- Usunięcie grupy jest blokowane jeśli są przypisane towary (sprawdź CASCADE)

## Źródła danych
- **Tabela główna**: `CDN.Grupy` (BASE TABLE)
- **Tabele pomocnicze**: `CDN.GrupyJezykObcy`, `CDN.GrupaZakazy`

## Identyfikatory
| Pole | Typ | Opis |
|------|-----|------|
| `Gru_GruID` | int IDENTITY | PK, identyfikator grupy |
| `Gru_Typ` | [UNKNOWN] | Typ grupy (towarowa, kontrahenta, …) |
| `Gru_Nazwa` | [UNKNOWN] | Nazwa grupy |

## Pola i mapowanie API↔MSSQL
- `Gru_GruID` (int, IDENTITY, PK) — NOT EXPOSED BY MCP
- `Gru_Typ` — NOT EXPOSED BY MCP
- `Gru_Nazwa` — NOT EXPOSED BY MCP
- `Gru_Opis` — NOT EXPOSED BY MCP
- `Gru_Flaga` — NOT EXPOSED BY MCP
- `Gru_NazwaPEF` — NOT EXPOSED BY MCP
- `Gru_KontoWn` — NOT EXPOSED BY MCP
- `Gru_KontoMa` — NOT EXPOSED BY MCP
- `Gru_OpeZalID` — NOT EXPOSED BY MCP
- `Gru_OpeModID` — NOT EXPOSED BY MCP
- `Gru_TS_Zal` — NOT EXPOSED BY MCP
- `Gru_TS_Mod` — NOT EXPOSED BY MCP

## Relacje ontologiczne
- **GRUPUJE** (1:N) → `CDN.Towary` przez `Twr_TwGGIDNumer → Gru_GruID`
- **POSIADA_TLUMACZENIE** (1:N) → `CDN.GrupyJezykObcy`
- **POSIADA_ZAKAZ** (1:N) → `CDN.GrupaZakazy`

## Endpointy OptimaMCP
| Narzędzie | Operacja |
|-----------|----------|
| `list_item_groups` | READ — lista grup towarowych |
| `create_group` | WRITE — tworzy grupę |

## Pochodzenie wiedzy
- Analiza manualna MCP + MSSQL (2026-07-15)
- `mssql_list_tables` potwierdza `CDN.Grupy`
- JOIN potwierdzony przez analizę FK w tabeli Towary

## Otwarte problemy
1. Pełna lista kolumn `CDN.Grupy` niezweryfikowana przez `mssql_describe_table` — narzędzie nie akceptuje schematu CDN dla tej tabeli. Należy użyć `mssql_execute_query` z SELECT TOP 1 * FROM CDN.Grupy.
2. Wartości `Gru_Typ` dla typu "towarowa" nieznane.
3. Endpointy MCP nie eksponują kolumn MSSQL w udokumentowanym API; potrzebna walidacja runtime.

## Metadane
- Wykryte przez: `manual_analysis_mcp_mssql`
- Data pozyskania: 2026-07-15
- Tabela: `CDN.Grupy`

## Walidacja
- [ ] Sprawdź SELECT TOP 1 * FROM CDN.Grupy
- [ ] Potwierdź enum Gru_Typ
- [ ] Zweryfikuj relację Gru_GruID ↔ Twr_TwGGIDNumer