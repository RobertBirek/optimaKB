# Encja: Kategoria
- draftId: `draft_2026-07-17_b9489f6b_encja-kategoria`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:46.259Z`
- tags: `OWA`, `ontologia`, `optima`, `kategoria`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encyja: Kategoria

## Status weryfikacji
**Zweryfikowane** — tabela MSSQL potwierdzona. **Brak dedykowanego narzędzia MCP** — obsługa tylko przez MSSQL.

## Opis biznesowy
Kategoria (CDN.Kategorie) to hierarchiczny słownik klasyfikacji używany do kategoryzacji towarów, kontrahentów i dokumentów. Hierarchia oparta na `Kat_Typ` (typ kategorii), `Kat_Poziom` (poziom) i `Kat_ParentID` (samoreferencja). Kategorie zawierają informacje o stawkach VAT (`Kat_Stawka`), odliczeniach, kolumnach KPiR, budżetach i segmentach księgowych.

## Reguły biznesowe
- Hierarchia: `Kat_ParentID` → `Kat_KatID` (samoreferencja)
- UNIQUE na (Kat_Typ, Kat_KodOgolny, Kat_Poziom, Kat_KodSzczegol)
- UNIQUE na `Kat_KodSzczegol`
- `Kat_Nieaktywny` (tinyint) — dezaktywacja
- `Kat_Fiskalny` (tinyint) — kategoria fiskalna
- `Kat_Detal` (tinyint) — kategoria detaliczna

## Źródła danych
- **Tabela główna**: `CDN.Kategorie` (BASE TABLE, 0 wierszy)
- **eSklep**: `CDN.IGaleriaKategorie`, `CDN.RejestracjaZgodKategorie`

## Identyfikatory
| Pole | Typ | Opis |
|------|-----|------|
| `Kat_KatID` | int IDENTITY | PK (clustered) |
| `Kat_Typ` | smallint | Typ kategorii |
| `Kat_KodOgolny` | varchar(20) | Kod ogólny |
| `Kat_Poziom` | smallint | Poziom hierarchii |
| `Kat_KodSzczegol` | varchar(20) | Kod szczegółowy (UNIQUE) |

## Pola i mapowanie API↔MSSQL
- `Kat_KatID` (int, IDENTITY, PK) — NOT EXPOSED BY MCP
- `Kat_Typ` (smallint) — NOT EXPOSED BY MCP
- `Kat_Poziom` (smallint) — NOT EXPOSED BY MCP
- `Kat_ParentID` (int, self-FK) — NOT EXPOSED BY MCP
- `Kat_KodOgolny` (varchar(20)) — NOT EXPOSED BY MCP
- `Kat_KodSzczegol` (varchar(20)) — NOT EXPOSED BY MCP
- `Kat_Opis` (varchar(50)) — NOT EXPOSED BY MCP
- `Kat_KolumnaKPIR` (tinyint) — NOT EXPOSED BY MCP
- `Kat_KolumnaRycz` (tinyint) — NOT EXPOSED BY MCP
- `Kat_WzID` (smallint) — NOT EXPOSED BY MCP
- `Kat_Stawka` (decimal(5,2)) — NOT EXPOSED BY MCP
- `Kat_Flaga` (smallint) — NOT EXPOSED BY MCP
- `Kat_Zrodlowa` (decimal(5,2)) — NOT EXPOSED BY MCP
- `Kat_Odliczenia` (smallint) — NOT EXPOSED BY MCP
- `Kat_RodzajZakupu` (smallint) — NOT EXPOSED BY MCP
- `Kat_Fiskalny` (tinyint) — NOT EXPOSED BY MCP
- `Kat_Detal` (tinyint) — NOT EXPOSED BY MCP
- `Kat_Kwota` (decimal(15,2)) — NOT EXPOSED BY MCP
- `Kat_Udzial` (decimal(5,2)) — NOT EXPOSED BY MCP
- `Kat_Budzet` (decimal(15,2)) — NOT EXPOSED BY MCP
- `Kat_Nieaktywny` (tinyint) — NOT EXPOSED BY MCP
- `Kat_KontoSegmentWN`, `Kat_KontoSegmentMA` (varchar(50)) — NOT EXPOSED BY MCP
- `Kat_TS_Uzyc` (datetime) — NOT EXPOSED BY MCP
- `Kat_ElixirO1..O4` (varchar(35)) — NOT EXPOSED BY MCP
- `Kat_PodzielOdliczenia`, `Kat_PodzielOdliczeniaProcent` — NOT EXPOSED BY MCP
- `Kat_KsiegujWKoszty`, `Kat_KsiegujWKosztyProcent` — NOT EXPOSED BY MCP
- `Kat_TS_Export`, `Kat_ImportAppId`, `Kat_ImportRowId` — NOT EXPOSED BY MCP
- `Kat_OpeZalID`..`Kat_OpeZalNazwisko` — NOT EXPOSED BY MCP

## Relacje ontologiczne
- **KLASYFIKUJE_TOWAR** (1:N) → `CDN.Towary` przez `Twr_KatId`
- **KLASYFIKUJE_KONTRAHENTA** (1:N) → `CDN.Kontrahenci` przez `Knt_KatID`
- **KLASYFIKUJE_DOKUMENT** (1:N) → `CDN.TraNag` przez `TrN_KatID`
- **NADRZEDNA_KATEGORIA** (N:1) → `CDN.Kategorie` przez `Kat_ParentID → Kat_KatID`
- **UZYWANA_PRZEZ_ESKLEP** (1:N?) → `CDN.IGaleriaKategorie`
- **UZYWANA_PRZEZ_RG_ZGODY** (1:N?) → `CDN.RejestracjaZgodKategorie`

## Endpointy OptimaMCP
**Brak dedykowanego narzędzia MCP.** Operacje tylko przez MSSQL.

## Pochodzenie wiedzy
- `mssql_describe_table` (CDN.Kategorie, 2026-07-15)
- 0 wierszy, 45 kolumn, 5 indeksów
- Hierarchia potwierdzona przez `Kat_ParentID` i `Kat_Poziom`

## Otwarte problemy
1. Brak MCP endpointu — czy kategorie są zarządzane przez inny mechanizm?
2. `Kat_Typ` — ile typów kategorii istnieje?
3. `Kat_ElixirO1..O4` — znaczenie?
4. `Kat_WzID` — referencja do czego?
5. Relacja z `CDN.Marki` i `CDN.Producenci`?

## Metadane
- Wykryte przez: `manual_analysis_mcp_mssql`
- Data pozyskania: 2026-07-15
- Tabela: `CDN.Kategorie` (ROW_COUNT=0)
- PK: `Kat_KatID` (IDENTITY)
- Brak MCP endpointu

## Walidacja
- [x] `mssql_describe_table` potwierdza strukturę
- [ ] Zbadaj enum `Kat_Typ`
- [ ] Zbadaj relację z Marki/Producenci
- [ ] Ustal czy jest MCP endpoint nieudokumentowany