# Encja: Towar (kartoteka towarów i usług)
- draftId: `draft_2026-07-17_3dd22ba4_encja-towar-kartoteka-towarow-i-us-ug`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:42:26.077Z`
- tags: `OWA`, `ontologia`, `optima`, `towar`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Towar

## Status weryfikacji

- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki`
- Identyfikator ontologiczny: `OWAOntology.Towar`
- Aliasy: `CDN.Towary`, `Towary`, `TwrKarty`

## Opis biznesowy

Kartoteka towarów i usług — centralny rejestr produktów, usług i materiałów w Comarch ERP Optima. Przechowuje nazwy, kody, jednostki miary, stawki VAT, ceny, oraz parametry sprzedażowe i magazynowe. Encja należy do domeny biznesowej **Magazyn** wg ComarchOptimaBusinessSemantics.

## Reguły biznesowe

- Towar musi mieć unikalny kod (`Twr_Kod`) i nazwę (`Twr_Nazwa`)
- Każdy towar ma przypisaną stawkę VAT (`Twr_Stawka`) — sprzedaż, zakup, eksport
- Towar należy do grupy towarowej identyfikowanej przez `Twr_TwGGIDNumer` (referencja do `CDN.Grupy`)
- Towar może być nieaktywny (`Twr_NieAktywny`)
- Ceny przechowywane są w osobnej tabeli `CDN.TwrCeny` z wielowariantowością (`TwC_TwCNumer`)
- [UNKNOWN: szczegółowe reguły walidacji cen, upustów i dostępności nie zostały potwierdzone w dokumentacji semantycznej]

## Źródła danych

| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Tabela główna | `CDN` | `Towary` | `CONFIRMED` | MSSQL describe_table + ComarchOptimaSchema KB |
| Tabela cen | `CDN` | `TwrCeny` | `CONFIRMED` | MSSQL describe_table + FK_TPCTowar |
| Tabela grup | `CDN` | `Grupy` | `CONFIRMED` | MSSQL describe_table |
| Widok pomocniczy | `CDN` | `TwrKarty` | `CONFIRMED` | ComarchOptimaSprint schema_touchpoint |
| Tabela EAN | `CDN` | `TwrEan` | `CONFIRMED` | ComarchOptimaSprint schema_touchpoint |
| Tabela JM | `CDN` | `TwrJm` | `CONFIRMED` | ComarchOptimaSprint schema_touchpoint |
| Tabela ilości | `CDN` | `TwrIlosci` | `CONFIRMED` | ComarchOptimaSprint schema_touchpoint |
| Tabela zasobów | `CDN` | `TwrZasoby` | `CONFIRMED` | ComarchOptimaSprint schema_touchpoint |

## Identyfikatory

| Typ | Pole | Znaczenie | Status | Dowód |
|---|---|---|---|---|
| Klucz główny | `Twr_TwrId` | `int, IDENTITY — wewnętrzny identyfikator towaru` | `CONFIRMED` | MSSQL describe_table (ordinal 1, identity=YES) |
| Klucz biznesowy | `Twr_Kod` | `varchar(50) — kod towaru` | `CONFIRMED` | MSSQL describe_table |
| Klucz GID | `Twr_GIDNumer` | `int — Global ID numer` | `CONFIRMED` | MSSQL describe_table |

## Pola i mapowanie API ↔ MSSQL

| # | Schemat | Tabela | Kolumna MSSQL | Typ SQL | Nullable | PK/FK | Opis biznesowy | Status |
|---:|---|---|---|---|---|---|---|---|
| 1 | `CDN` | `Towary` | `Twr_TwrId` | `int` | NIE | PK | IDENTITY — identyfikator towaru | `CONFIRMED` |
| 2 | `CDN` | `Towary` | `Twr_Typ` | `tinyint` | NIE | - | Typ towaru | `CONFIRMED` |
| 3 | `CDN` | `Towary` | `Twr_Kod` | `varchar(50)` | NIE | - | Kod towaru | `CONFIRMED` |
| 4 | `CDN` | `Towary` | `Twr_Nazwa` | `nvarchar(255)` | NIE | - | Nazwa towaru | `CONFIRMED` |
| 5 | `CDN` | `Towary` | `Twr_NazwaFiskalna` | `nvarchar(40)` | NIE | - | Nazwa fiskalna | `CONFIRMED` |
| 6 | `CDN` | `Towary` | `Twr_JM` | `nvarchar(20)` | NIE | - | Jednostka miary | `CONFIRMED` |
| 7 | `CDN` | `Towary` | `Twr_JMZ` | `nvarchar(20)` | NIE | - | Jednostka zapasowa | `CONFIRMED` |
| 8 | `CDN` | `Towary` | `Twr_JMPrzelicznikL` | `decimal(15,2)` | NIE | - | Przelicznik JMZ licznik | `CONFIRMED` |
| 9 | `CDN` | `Towary` | `Twr_JMPrzelicznikM` | `decimal(7,0)` | NIE | - | Przelicznik JMZ mianownik | `CONFIRMED` |
| 10 | `CDN` | `Towary` | `Twr_Stawka` | `decimal(5,2)` | NIE | - | Stawka VAT sprzedaży | `CONFIRMED` |
| 11 | `CDN` | `Towary` | `Twr_StawkaZak` | `decimal(5,2)` | NIE | - | Stawka VAT zakupu | `CONFIRMED` |
| 12 | `CDN` | `Towary` | `Twr_EAN` | `varchar(40)` | NIE | - | Główny kod EAN | `CONFIRMED` |
| 13 | `CDN` | `Towary` | `Twr_PLU` | `nvarchar(18)` | NIE | - | Kod PLU (kasa fiskalna) | `CONFIRMED` |
| 14 | `CDN` | `Towary` | `Twr_NumerKat` | `nvarchar(40)` | NIE | - | Numer katalogowy | `CONFIRMED` |
| 15 | `CDN` | `Towary` | `Twr_SWW` | `varchar(20)` | NIE | - | Kod SWW | `CONFIRMED` |
| 16 | `CDN` | `Towary` | `Twr_Opis` | `nvarchar(MAX)` | NIE | - | Opis towaru | `CONFIRMED` |
| 17 | `CDN` | `Towary` | `Twr_TwGGIDNumer` | `int` | NIE | FK→Grupy | Referencja do grupy towarowej | `CONFIRMED` |
| 18 | `CDN` | `Towary` | `Twr_KatId` | `int` | TAK | FK→Kategorie | Kategoria ID | `CONFIRMED` |
| 19 | `CDN` | `Towary` | `Twr_Kategoria` | `varchar(50)` | NIE | - | Nazwa kategorii | `CONFIRMED` |
| 20 | `CDN` | `Towary` | `Twr_Waluta` | `varchar(3)` | NIE | - | Waluta | `CONFIRMED` |
| 21 | `CDN` | `Towary` | `Twr_KntId` | `int` | TAK | FK→Kontrahenci | Dostawca ID | `CONFIRMED` |
| 22 | `CDN` | `Towary` | `Twr_KodDostawcy` | `nvarchar(50)` | NIE | - | Kod u dostawcy | `CONFIRMED` |
| 23 | `CDN` | `Towary` | `Twr_ProducentKod` | `nvarchar(50)` | NIE | - | Kod producenta | `CONFIRMED` |
| 24 | `CDN` | `Towary` | `Twr_IloscMin` | `decimal(15,4)` | NIE | - | Minimalna ilość | `CONFIRMED` |
| 25 | `CDN` | `Towary` | `Twr_IloscMax` | `decimal(15,4)` | NIE | - | Maksymalna ilość | `CONFIRMED` |
| 26 | `CDN` | `Towary` | `Twr_NieAktywny` | `tinyint` | NIE | - | Flaga nieaktywności | `CONFIRMED` |
| 27 | `CDN` | `Towary` | `Twr_KosztUslugi` | `decimal(17,4)` | NIE | - | Koszt usługi | `CONFIRMED` |
| 28 | `CDN` | `Towary` | `Twr_MarzaMin` | `decimal(5,2)` | NIE | - | Minimalna marża | `CONFIRMED` |
| 29 | `CDN` | `Towary` | `Twr_Masa` | `decimal(15,3)` | NIE | - | Masa | `CONFIRMED` |
| 30 | `CDN` | `Towary` | `Twr_KrajPochodzenia` | `nvarchar(2)` | NIE | - | Kod kraju pochodzenia | `CONFIRMED` |
| 31 | `CDN` | `Towary` | `Twr_MrkID` | `int` | TAK | FK→Marki | Marka ID | `CONFIRMED` |
| 32 | `CDN` | `Towary` | `Twr_GIDTyp` | `smallint` | TAK | - | Global ID typ | `CONFIRMED` |
| 33 | `CDN` | `Towary` | `Twr_GIDFirma` | `int` | TAK | - | Global ID firma | `CONFIRMED` |
| 34 | `CDN` | `Towary` | `Twr_GIDNumer` | `int` | TAK | - | Global ID numer | `CONFIRMED` |
| 35 | `CDN` | `Towary` | `Twr_OpeZalID` | `int` | TAK | FK→Operatorzy | Operator zakładający | `CONFIRMED` |
| 36 | `CDN` | `Towary` | `Twr_OpeModID` | `int` | TAK | FK→Operatorzy | Operator modyfikujący | `CONFIRMED` |
| 37 | `CDN` | `Towary` | `Twr_TS_Zal` | `datetime` | NIE | - | Data założenia | `CONFIRMED` |
| 38 | `CDN` | `Towary` | `Twr_TS_Mod` | `datetime` | NIE | - | Data modyfikacji | `CONFIRMED` |
| 39 | `CDN` | `Towary` | `Twr_Kaucja` | `tinyint` | NIE | - | Flaga kaucji | `CONFIRMED` |
| 40 | `CDN` | `Towary` | `Twr_BezRabatu` | `tinyint` | NIE | - | Wyłączenie z rabatów | `CONFIRMED` |
| 41 | `CDN` | `Towary` | `Twr_Akcyza` | `tinyint` | NIE | - | Flaga akcyzy | `CONFIRMED` |

Uwaga: Tabela zawiera 121+ kolumn. Powyżej 41 kluczowych kolumn. Pozostałe kolumny istnieją w MSSQL, ale nie mają potwierdzonego opisu biznesowego.

## Relacje ontologiczne

| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Warunek JOIN | Status | Dowód |
|---|---|---|---|---|---|---|---|
| `NALEZY_DO_GRUPY` | Towar | Grupa | N:1 | LOGICAL_JOIN | `CDN.Towary.Twr_TwGGIDNumer = CDN.Grupy.Gru_GruID` | `CONFIRMED` | MSSQL |
| `MA_CENE` | Towar | CenaTowaru | 1:N | FK | `CDN.TwrCeny.TwC_TwrID = CDN.Towary.Twr_TwrId` (CASCADE) | `CONFIRMED` | MSSQL FK_TwCTowar |
| `NALEZY_DO_KATEGORII` | Towar | Kategoria | N:1 | FK | `CDN.Towary.Twr_KatId = CDN.Kategorie.Kat_KatID` | `CONFIRMED` | MSSQL |
| `MA_DOSTAWCE` | Towar | Kontrahent | N:1 | LOGICAL_JOIN | `CDN.Towary.Twr_KntId = CDN.Kontrahenci.Knt_KntId` | `CONFIRMED` | MSSQL |
| `MA_EAN` | Towar | EAN | 1:N | LOGICAL_JOIN | `CDN.TwrEan.TwE_TwrId = CDN.Towary.Twr_TwrId` | `CONFIRMED` | ComarchOptimaSprint KB |
| `MA_JEDNOSTKI` | Towar | JednostkaMiary | 1:N | LOGICAL_JOIN | `CDN.TwrJm.TwJ_TwrId = CDN.Towary.Twr_TwrId` | `CONFIRMED` | ComarchOptimaSprint KB |
| `MA_ILOSCI` | Towar | IloscTowaru | 1:N | LOGICAL_JOIN | `CDN.TwrIlosci.TwI_TwrId = CDN.Towary.Twr_TwrId` | `CONFIRMED` | ComarchOptimaSprint KB |
| `POJAWIA_SIE_NA_POZYCJI` | Towar | PozycjaDokumentu | 1:N | FK | `CDN.TraElem.TrE_TwrId = CDN.Towary.Twr_TwrId` | `CONFIRMED` | ComarchOptimaSchema KB (FK_TrETowar) |

## Procedury, funkcje i triggery

| Nazwa kwalifikowana | Typ | Obiekt powiązany | Opis działania | Status | Dowód |
|---|---|---|---|---|---|
| `CDN.Towary_After_Insert_Trigger` | TRIGGER | `Towary` | AFTER INSERT | `CONFIRMED` | MSSQL list_triggers |
| `CDN.Towary_Delete_Trigger` | TRIGGER | `Towary` | AFTER DELETE | `CONFIRMED` | MSSQL list_triggers |
| `CDN.Towary_DeleteHandler` | TRIGGER | `Towary` | AFTER DELETE Handler | `CONFIRMED` | MSSQL list_triggers |
| `CDN.Towary_InsertUpdate_Trigger` | TRIGGER | `Towary` | AFTER INSERT, UPDATE | `CONFIRMED` | MSSQL list_triggers |

## Endpointy OptimaMCP

| Operacja biznesowa | MCP Tool | Tryb | Parametry | Główne pola odpowiedzi | Zweryfikowano wykonaniem | Uwagi |
|---|---|---|---|---|---|---|
| `[NOT EXPOSED BY MCP: brak narzędzi OptimaMCP w dostępnym zestawie]` | — | — | — | — | NIE | — |

## Przykład użycia przez agenta

```sql
-- MSSQL (read-only) — dostępne w środowisku
SELECT Twr_TwrId, Twr_Kod, Twr_Nazwa, Twr_Stawka, Twr_JM
FROM CDN.Towary
WHERE Twr_NieAktywny = 0
ORDER BY Twr_Kod;
```

```sql
-- Pobranie cen dla towaru
SELECT TwC_TwCNumer, TwC_Wartosc, TwC_Waluta
FROM CDN.TwrCeny
WHERE TwC_TwrID = @TwrId
ORDER BY TwC_TwCNumer;
```

## Pochodzenie wiedzy

| Typ źródła | Projekt lub narzędzie | Dokument, artefakt albo zapytanie | Zakres wykorzystania |
|---|---|---|---|
| Dokumentacja schematu | `ComarchOptimaSchema / project 4` | `table_query_guide.csv`, `join_path_guide.csv`, `trigger.csv` | Tabele, JOIN-y, triggery |
| Semantyka biznesowa | `ComarchOptimaBusinessSemantics / project 15` | `business_description.csv`, `business_domain.csv` | Definicja biznesowa, domena Magazyn |
| Baza danych | `MSSQL` | `CDN_TEST.sys.tables`, `sys.columns`, `sys.foreign_keys`, `sys.triggers` | 121+ kolumn, PK, FK, triggery live |
| Sprint KB | `ComarchOptimaSprint / project 7` | `sql_pattern.csv`, `schema_touchpoint.csv` | Tabele zależne |
| API | `OptimaMCP` | — | [NOT EXPOSED BY MCP] |

## Otwarte problemy i konflikty

- `[NEEDS VERIFICATION: znaczenia >70 kolumn nie potwierdzone w dokumentacji]`
- `[NEEDS VERIFICATION: definicje triggerów nie zostały odczytane]`
- `[NOT EXPOSED BY MCP: brak narzędzi OptimaMCP — pól API nie potwierdzono]`
- `[UNKNOWN: LOGICAL_JOIN dla TwrIlosci/TwrZasoby — nie zweryfikowano FK w MSSQL]`

## Metadane

- Ontologia: `OWA`
- Namespace: `OWAOntology`
- System źródłowy: `Comarch ERP Optima`
- Data wygenerowania: `2026-07-15`
- Autor: `LLM Knowledge Architect`
- Wersja wpisu: `1.0-draft`

## Walidacja

- [x] Tabela główna sprawdzona w MSSQL
- [x] Klucz główny sprawdzony w MSSQL
- [ ] Pola MCP — NOT EXPOSED BY MCP
- [x] JOIN-y z pełnymi warunkami
- [x] Rozróżniono FK i LOGICAL_JOIN
- [x] Znaczenie biznesowe z dokumentacji
- [x] Konflikty i braki oznaczone
- [x] Bez rzeczywistych danych biznesowych