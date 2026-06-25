# Optima Wydruki and Additional Functions Type-Family Map

Date: `2026-06-01`

## Scope

This note consolidates the current evidence-based mapping for the shared
`Wydruk` configuration model used by:

- print definitions
- Additional Functions

Primary evidence sources:

- `downloads/google_drive/manual_exports/export_fd.xml`
- `downloads/google_drive/manual_exports/export_wydruki.xml`
- direct SQL inspection of `CDN_KNF_Konfiguracja.CDN.Wydruki`
- SQL procedure inspection of `CDN.Wydruk_Dodaj` and `CDN.Wydruk_Zmien`

## Bottom Line

There is now strong confirmation that:

1. print definitions and Additional Functions share the same broad storage
   model
2. the key family discriminator is the tuple:
   - `WDR_RODZAJ`
   - `WDR_TYP`
   - `WDR_PODTYP`
3. `WDR_KOMPRESJA` is operationally important because many definitions are
   stored in compressed form
4. readable, non-compressed definitions are already enough to strengthen:
   - `ComarchOptimaAdditionalFunctions`
   - `ComarchOptimaSprint`

## Shared Model

The direct manual exports use the same structure:

- `Zestaw`
- `Wydruki`
- `Wydruk`

Important fields:

- `WDR_ID`
- `WDR_NAZWA`
- `WDR_RODZAJ`
- `WDR_TYP`
- `WDR_PODTYP`
- `WDR_DEFINICJA`
- `WDR_PARAMETRY`
- `WDR_WARUNEK`
- `WDR_WARUNEKAUTO`
- `WDR_KOMPRESJA`

This matches the earlier database finding that configuration-layer definitions
live in `CDN_KNF_Konfiguracja.CDN.Wydruki`.

## Additional Functions Families

Source:

- `downloads/google_drive/manual_exports/export_fd.xml`

Observed totals:

- `145` records total

### `2 / 12 / 0`

Observed volume:

- `106`

Observed kinds:

- `jscript` -> `2`
- `sql` -> `35`
- `compressed` -> `69`

Interpretation:

- strongest confirmed core family for Additional Functions
- includes direct `[JS]` and `[SQL]` bodies
- many records are compressed, so the family is broader than the currently
  readable subset

Representative examples:

- `Informacja :: Funkcje dodatkowe` -> `jscript`
- `Funkcje paragonów :: Automatyczne ustawianie bufora` -> `jscript`
- `Eksport dokumentu :: Eksport faktury zakupu do pliku XML` -> `sql`
- `Import dokumentów :: Import faktury sprzedaży z pliku XML` -> `sql`

Assessment:

- treat `2/12/0` as the primary Additional Functions family

### `2 / 11 / 0`

Observed volume:

- `39`

Observed kinds:

- `sql` -> `15`
- `compressed` -> `24`

Interpretation:

- adjacent automation/export family
- not a generic print family
- looks strongly tied to export/integration workflows

Representative examples:

- `Eksport do Comarch ERP Klasyka :: Eksport ewidencji dodatkowej` -> `sql`
- `Eksport do Comarch ERP Klasyka :: Eksport raportów bankowych` -> `sql`
- `Eksport do Comarch ERP Klasyka :: Eksport raportów kasowych` -> `sql`

Assessment:

- keep this family near `Additional Functions`
- especially relevant for export/integration recipes

## Print Families

Source:

- `downloads/google_drive/manual_exports/export_wydruki.xml`

Observed totals:

- `3573` records total

### `1 / 4 / 0`

Observed volume:

- `366`

Observed kinds:

- `compressed` -> `366`

Interpretation:

- strongest explicit sPrint family

Representative set names:

- `Rejestry VAT (sPrint)`
- `Rejestr VAT marża (sPrint)`
- `Klasyfikacja zakupów (sPrint)`
- `Klasyfikacja sprzedaży (sPrint)`

Assessment:

- treat `1/4/0` as confirmed sPrint-oriented family

### `1 / 2 / 2`

Observed volume:

- `987`

Observed kinds:

- `compressed` -> `983`
- `sql` -> `3`
- `plain_text` -> `1`

Interpretation:

- mixed family with strong Sprint signal
- includes both general print sets and explicit `(sPrint)` sets

Representative examples:

- `Dowody wewnętrzne :: Wzór standard` -> `sql`
- `Dowody wewnętrzne (sPrint) :: Wzór standard` -> `compressed`
- `Dokumenty zaznaczone :: Nota księgowa` -> `sql`

Assessment:

- treat `1/2/2` as mixed structured-report family
- likely contains both Sprint-style and adjacent structured print definitions

### `1 / 3 / 0`

Observed volume:

- `384`

Observed kinds:

- `compressed` -> `383`
- `genrap_xml` -> `1`

Interpretation:

- strongest confirmed GenRap family

Representative examples:

- `Nota korygująca (GenRap) :: Wzór standard`
- `Rejestr VAT :: Wydruk pełny - wszystkie stawki (GenRap)`
- `Faktura wewnętrzna (GenRap) :: Wzór standard`

Assessment:

- treat `1/3/0` as confirmed GenRap family

### `1 / 2 / 3`

Observed volume:

- `18`

Observed kinds:

- `compressed` -> `18`

Interpretation:

- likely Word/XML family

Evidence:

- set names in this branch include wording like `Wydruki do Worda (XML)`

Assessment:

- treat `1/2/3` as likely Word/XML output family
- confidence: medium

### `1 / 2 / 1`

Observed volume:

- `23`

Observed kinds:

- `compressed` -> `23`

Interpretation:

- likely text-printer family

Evidence:

- associated names include variants such as:
  - `Wydruk tekstowy`
  - `10 cali`
  - `15 cali`

Assessment:

- treat `1/2/1` as likely text/plain printer family
- confidence: medium

### `1 / 6 / 0`

Observed volume:

- `11`

Observed kinds:

- `empty` -> `11`

Representative examples:

- `Deklaracja PIT-11 od wersji 28`
- `Deklaracja PIT-8AR od wersji 12`
- `Deklaracja PIT-8C od wersji 11`
- `Deklaracja VAT-9M`

Interpretation:

- declaration/form family with empty bodies in this export

Assessment:

- treat `1/6/0` as special form/declaration family

### `1 / 7 / 0`

Observed volume:

- `24`

Observed kinds:

- `compressed` -> `24`

Interpretation:

- appears to be another declaration/reporting branch
- the current readable evidence is weaker than for `1/4/0` and `1/3/0`

Assessment:

- keep as unresolved declaration/report branch

### `1 / 1 / 0`

Observed volume:

- `1760`

Observed kinds:

- `compressed` -> `1632`
- `plain_text` -> `128`

Interpretation:

- very large legacy/generic print family
- clearly not limited to one technology
- includes many traditional invoice and document print variants

Representative examples:

- `Faktura VAT :: Duplikat`
- `Faktura VAT :: Kolumna z rabatem`
- `Faktura VAT :: Rachunek`
- `Specyfikacja załadunku :: Wzór standard`

Assessment:

- treat `1/1/0` as broad legacy/default print family
- do not force a narrower technology label yet

## Compression Findings

### What is confirmed

In the database and exports, many definitions look compressed:

- `WDR_KOMPRESJA = 1`
- `WDR_DEFINICJA` often starts with `xÚ...`

This is consistent across:

- direct SQL reads from `CDN_KNF_Konfiguracja.CDN.Wydruki`
- manual export XML files

### What was tried

The following approaches were tested:

1. standard zlib decompression on export text
2. entity-decoded export text converted back to bytes
3. multiple `wbits` variants
4. direct SQL byte extraction using:
   - `CAST(CAST(Wdr_Definicja AS varchar(max)) AS image)`
5. SQL procedure inspection for decompression logic

### Result

Readable compressed bodies were not recovered yet.

The current evidence suggests:

- the compressed payload is not directly recoverable by a naive zlib pass from
  the export text
- SQL procedures `CDN.Wydruk_Dodaj` and `CDN.Wydruk_Zmien` do not perform the
  decompression/compression logic
- the actual transform is likely implemented in the application layer

### Operational implication

For now:

- use readable non-compressed definitions immediately
- keep compressed definitions indexed as metadata-bearing records
- do not claim full-body coverage for compressed families yet

## Practical Use in Current KBs

### `ComarchOptimaAdditionalFunctions`

Already improved by:

- `145` manual-export definition records
- readable `[JS]` and `[SQL]` bodies
- family awareness for `2/12/0` and `2/11/0`

### `ComarchOptimaSprint`

Already improved by:

- `144` readable manual print definitions promoted as `ReferenceDocument`
- `3` readable SQL definitions promoted as `SqlPattern`
- confirmed family hints for:
  - `1/4/0`
  - `1/2/2`
  - `1/3/0`
  - `1/2/3`
  - `1/2/1`
  - `1/6/0`

## Recommended Next Step

If deeper recovery is needed, the next high-value path is:

1. capture one definition before XML export, directly from Optima/UI or any
   vendor-side export format that preserves binary payload cleanly
2. compare it byte-for-byte with the SQL-extracted `Wdr_Definicja`
3. identify whether the remaining gap is:
   - codepage loss
   - export-layer escaping
   - proprietary wrapper around the compressor

Until then, the current safe stance is:

- readable definitions are trustworthy and already useful
- family mapping is strong enough to improve KB routing
- compressed definitions are confirmed to exist, but not yet decoded
