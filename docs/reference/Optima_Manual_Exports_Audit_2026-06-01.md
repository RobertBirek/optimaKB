# Optima Manual Exports Audit

Date: `2026-06-01`

## Scope

User-provided direct exports from Optima:

- `downloads/google_drive/manual_exports/export_fd.xml`
- `downloads/google_drive/manual_exports/export_wydruki.xml`

These files were downloaded from Google Drive and inspected locally.

## Bottom Line

Yes, both files are useful.

They are not marginal source material. They are direct, structurally valuable
exports from Optima and they materially improve the KB model for:

- `ComarchOptimaAdditionalFunctions`
- `ComarchOptimaSprint`
- indirectly `ComarchOptimaSchema`

## Key Finding

The exports strongly support the hypothesis that:

- print definitions and Additional Functions are stored in the same broad
  configuration-layer print/export model
- they are differentiated by print/function type columns, not by completely
  separate storage logic

In the export format, both appear under:

- `Zestaw`
- `Wydruki`
- `Wydruk`

with fields such as:

- `WDR_RODZAJ`
- `WDR_TYP`
- `WDR_PODTYP`
- `WDR_DEFINICJA`
- `WDR_PARAMETRY`
- `WDR_WARUNEK`
- `WDR_WARUNEKAUTO`
- `WDR_KOMPRESJA`

## Additional Functions Export

File:

- `downloads/google_drive/manual_exports/export_fd.xml`

Observed volume:

- `145` `Wydruk` records

Observed type distribution:

- `WDR_RODZAJ=2`, `WDR_TYP=12`, `WDR_PODTYP=0` -> `106`
- `WDR_RODZAJ=2`, `WDR_TYP=11`, `WDR_PODTYP=0` -> `39`

Observed compression:

- `WDR_KOMPRESJA=1` -> `93`
- `WDR_KOMPRESJA=0` -> `52`

Observed definition heads:

- compressed definitions with `xÚ...` -> `93`
- plain script-style definitions -> `52`

Important direct evidence:

The export contains a record:

- `WDR_NAZWA=Funkcje dodatkowe`
- `WDR_RODZAJ=2`
- `WDR_TYP=12`
- `WDR_PODTYP=0`
- `WDR_KOMPRESJA=0`

with a plain JavaScript definition starting with:

- `[JS]`

This is a direct confirmation that Additional Functions can be exported through
the same `Wydruk`-style structure and are not merely inferred from unrelated
configuration tables.

Other observed plain-definition families in this file:

- `[SQL]`
- `[JS]`

Representative names:

- `Funkcje dodatkowe`
- `Automatyczne ustawianie bufora`
- `Eksport ewidencji dodatkowej`
- `Eksport raportów bankowych`
- `Import faktury sprzedaży z pliku XML`
- `Definiowalny wydruk faktury (MS Excel)`
- `Eksport faktury w formacie PEF`

## Print Export

File:

- `downloads/google_drive/manual_exports/export_wydruki.xml`

Observed volume:

- `3573` `Wydruk` records

Observed type distribution:

- `WDR_RODZAJ=1`, `WDR_TYP=1`, `WDR_PODTYP=0` -> `1760`
- `WDR_RODZAJ=1`, `WDR_TYP=2`, `WDR_PODTYP=2` -> `987`
- `WDR_RODZAJ=1`, `WDR_TYP=3`, `WDR_PODTYP=0` -> `384`
- `WDR_RODZAJ=1`, `WDR_TYP=4`, `WDR_PODTYP=0` -> `366`
- `WDR_RODZAJ=1`, `WDR_TYP=7`, `WDR_PODTYP=0` -> `24`
- `WDR_RODZAJ=1`, `WDR_TYP=2`, `WDR_PODTYP=1` -> `23`
- `WDR_RODZAJ=1`, `WDR_TYP=2`, `WDR_PODTYP=3` -> `18`
- `WDR_RODZAJ=1`, `WDR_TYP=6`, `WDR_PODTYP=0` -> `11`

Observed compression:

- `WDR_KOMPRESJA=1` -> `3440`
- `WDR_KOMPRESJA=0` -> `133`

Observed definition heads:

- compressed definitions with `xÚ...` -> `3426`
- plain or alternative definitions -> `147`

Important direct evidence:

The file contains many records where:

- `WDR_DEFINICJA` is compressed
- `WDR_PARAMETRY` is readable plain text
- `WDR_WARUNEK` and `WDR_WARUNEKAUTO` are exported directly

Representative visible families:

- plain `[SQL]` definitions
- plain XML-ish / GenRap-like definitions such as:
  - `&lt;GenrapGrs&gt;...`
- heavily compressed definitions with `xÚ...`

Representative names:

- `FS_RI`
- `Wzór standard`
- `Wzór standard 6 kolumn`
- `Transakcje z podmiotami`
- `Suma transakcji z podmiotami`
- `Zapisy wg kategorii (nagłówki)`
- `Zapisy wg kategorii (elementy)`

## What These Files Change

Before this export audit, the storage model was strongly suspected but not yet
confirmed at content level.

After this audit:

1. Additional Functions are confirmed to exist as exportable `Wydruk`-style
   records with their own type family.
2. Print definitions are confirmed to be a mixed-technology family under the
   same broad configuration structure.
3. The type columns are now clearly important classification signals:
   - `WDR_RODZAJ`
   - `WDR_TYP`
   - `WDR_PODTYP`
4. `WDR_KOMPRESJA` is operationally important because not all definitions are
   compressed; some are directly readable and should be parsed as-is.

## KB Impact

### ComarchOptimaAdditionalFunctions

These exports are highly useful for:

- promoting real Optima-side function definitions into the KB
- distinguishing:
  - `[JS]`
  - `[SQL]`
  - compressed definitions
- linking function exports to:
  - module recipes
  - schema touchpoints
  - implementation examples

### ComarchOptimaSprint

These exports are highly useful for:

- classifying report technologies by `Rodzaj/Typ/PodTyp`
- promoting real print definitions and parameters
- linking print definitions to:
  - SQL patterns
  - workflows
  - diagnostics
  - schema touchpoints

### ComarchOptimaSchema

Indirectly useful for:

- grounding metadata about `CDN_KNF_Konfiguracja.CDN.Wydruki`
- validating how configuration-layer print/function records map to schema and
  helper guides

## Recommended Next Step

Do not treat these as generic attachments.

Treat them as first-class ingestion sources and build a narrow parser for:

1. `export_fd.xml`
   - classify by `WDR_RODZAJ/TYP/PODTYP`
   - detect `[JS]`, `[SQL]`, compressed definitions
   - promote readable definitions to `ReferenceDocument` / guide layers for
     `ComarchOptimaAdditionalFunctions`

2. `export_wydruki.xml`
   - classify print technologies by `WDR_RODZAJ/TYP/PODTYP`
   - extract readable parameters and conditions immediately
   - optionally defer compressed-definition decode until needed
   - promote real print-definition metadata into `ComarchOptimaSprint`

## Operational Note

The XML is not fully clean XML for standard strict parsers:

- some embedded definitions contain invalid character/entity sequences
- plain `xml.etree.ElementTree` can fail on those records

Use a tolerant line-oriented or recovery parser for ingestion, not a naïve
strict XML parser.
