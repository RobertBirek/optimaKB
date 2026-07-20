# Encja: Definicja dokumentu
- draftId: `draft_2026-07-17_a5fed980_encja-definicja-dokumentu`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:46.327Z`
- tags: `OWA`, `ontologia`, `optima`, `definicja-dokumentu`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Definicja dokumentu

## Identyfikacja

- **Typ encji:** Definicja
- **Tabela MSSQL:** `CDN.DokDefinicje`
- **Klucz główny:** `DDf_DDfID` (int, IDENTITY)
- **Liczba rekordów:** 110 definicji (11 nieaktywnych)
- **Status weryfikacji:** częściowo-zweryfikowane

## Struktura tabeli

| Kolumna | Typ | Opis |
|---------|-----|------|
| `DDf_DDfID` | int (PK, IDENTITY) | Identyfikator definicji |
| `DDf_Klasa` | int | Klasa dokumentu (101-650) |
| `DDf_Symbol` | varchar(5) | Symbol dokumentu, np. FS, FZ, KP, KW, RO, WZ, PZ |
| `DDf_Nazwa` | nvarchar(256) | Nazwa, np. "Faktura sprzedaży", "Wydanie zewnętrzne" |
| `DDf_Numeracja` | nvarchar(50) | Schemat numeracji z tokenami @symbol/@numerS/@rok_kal itp. |
| `DDf_PrevSymbol` | varchar(5) | Poprzedni symbol |
| `DDf_PrevNumeracja` | nvarchar(50) | Poprzedni schemat numeracji |
| `DDf_Nieaktywna` | tinyint | 0=aktywna, 1=nieaktywna |
| `DDf_SeriaOperatora` | tinyint | Czy seria zależna od operatora |
| `DDf_KierunekOrg` | int (COMPUTED) | -1=przychodowy, 1=rozchodowy, 0=neutralny |
| `DDf_PowDDfID` | int | ID definicji powiązanej |
| `DDf_PowSeria` | nvarchar(5) | Seria powiązana |
| `DDf_KatalogObdId` | int | ID katalogu obdarowanego |
| `DDf_TS_Zal` / `DDf_TS_Mod` | datetime | Sygnatury czasowe utworzenia/modyfikacji |
| `DDf_OpeZalID` / `DDf_OpeModID` | int | ID operatorów |
| `DDf_OpeZalKod` / `DDf_OpeModKod` | varchar(20) | Kody operatorów |
| `DDf_ImportRowId` / `DDf_ImportRowId2` | varchar(36) | GUID importu |

## Kluczowe klasy dokumentów (TOP 20 z 110)

| Symbol | Klasa | Nazwa |
|--------|-------|-------|
| EDP | 101 | Ewid.dod. przychodów |
| EDK | 102 | Ewid.dod. kosztów |
| PSLD | 111 | Potwierdzenie salda |
| PZAP | 112 | Ponaglenie zapłaty |
| NODS | 113 | Nota odsetkowa |
| DLG | 114 | Delegacje |
| KOMPK | 115 | PK kompensata |
| RKKH | 116 | Różnica kursowa KH |
| E-DEL | 117 | e-Delegacja |
| DEK, KW, RVZ | 201 | Deklaracje / Wypłata / Rejestr zakupów VAT |
| KP, RVS | 202 | Wpłata / Rejestr sprzedaży VAT |
| RKB | 211 | Raport kas./bank. |
| NO | 221 | Nota odsetkowa |
| PON | 222 | Ponaglenie zapłaty |
| PS | 223 | Potwierdzenie salda |
| RKUR | 224 | Różnica kursowa |
| RKURM | 225 | Różnica kursowa MW |

## Referencje kluczy obcych (tabele odwołujące się do DokDefinicje)

- `TraNag.TrN_DDfId` — nagłówki transakcji (dokumenty SEK)
- `BnkDokNag.BDN_DDfId` — nagłówki dokumentów bankowych
- `BnkRachunki.BRa_DDfID` — rachunki bankowe
- `BnkRaporty.BRp_DDfID` — raporty bankowe
- `BnkRozKwoty.BRK_DDfId` — rozliczenia kwot
- `BnkRozKwotyMW.BRKMW_DDfId` — rozliczenia kwot wielowalutowe
- `BnkZapisy.BZp_DDfID` — zapisy bankowe
- `BnkZdarzenia.BZd_DDfID` — zdarzenia bankowe
- `BONag.BON_DDfId` — operacje bazowe
- `CRMKontakty.CRK_DDfId` — kontakty CRM
- `DokumentyDostawyNag.DDN_DDfId` — dokumenty dostawy
- `EwidDodNag.EDN_DDfId` — ewidencja dodatkowa
- `DekretyNag.DeN_DDfId` (prawdopodobne)

## MCP API

- `mssql_list_document_definitions` lub `OptimaMCP_optima_list_document_definitions` — lista (READ), zwraca id, symbol, name, isActive
- `OptimaMCP_optima_list_rejestroperacjitypyobiektow` — 3598 wierszy rejestru operacji powiązanych z typami obiektów

## Reguły biznesowe

1. Definicja dokumentu jest używana w nagłówkach transakcji (`TraNag`). Nie można zmieniać jej symbolu, schematu numeracji ani klasy po utworzeniu dokumentów w systemie.
2. Symbol definicji (DDf_Symbol) jest unikalny w obrębie klasy.
3. Klasa dokumentu determinuje jego kierunek organizacyjny (przychodowy/rozchodowy/neutralny) poprzez kolumnę computed `DDf_KierunekOrg`.
4. Definicje mogą być dezaktywowane (`DDf_Nieaktywna=1`) — nieaktywne definicje nie są dostępne przy tworzeniu nowych dokumentów.
5. Schemat numeracji używa tokenów: `@symbol`, `@numerS` (numer serii), `@rok_kal` (rok kalendarzowy), `@miesiac`, `@rejestr`, `@magazyn`, `@brak`.