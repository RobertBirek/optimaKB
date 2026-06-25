# Comarch Optima KB Corpus Coverage Audit

Date: 2026-05-24
Workspace: `/docker/openspg`

This audit checks whether the local Google Drive corpora were actually consumed by the dedicated KB export/build pipelines, and where the remaining semantic gaps still are.

## Additional Functions KB

KB:
- Project: `6`
- Name: `Comarch Optima Additional Functions`
- Namespace: `ComarchOptimaAdditionalFunctions`

Local corpus root:
- `downloads/google_drive/additional_functions/`

### File-level coverage

Local corpus file count:
- `57` files total

Top-level split:
- `7` top-level files
- `3` files in `Dictionaries_2026_4/`
- `1` file in `Interfejsy_Obiektow_COM_2025.3.1/`
- `1` file in `Komunikaty_Optimy_2025_3/`
- `45` files in `Przyklady użycia obiektów COM 2016 - NET - XPT - JS - VB60 - VC/`

Extension split:
- `31` `js`
- `8` `txt`
- `3` `csv`
- `3` `ico`
- `3` `pdf`
- `1` `xpt`
- `1` `xml`
- `1` `hta`
- `1` `exe`
- `1` `db`
- `4` `md`

The exporter writes:
- `file_artifact.csv` -> `57`

Conclusion:
- every locally downloaded file is represented at least as a `FileArtifact`

### Semantic coverage

The exporter also derives richer entities from the local corpus:
- `reference_document.csv` now also absorbs local top-level markdown and PDF references
- markdown-based local reference chunks are now emitted into `chunk.csv`
- `implementation_example.csv` -> `33`
- `com_interface.csv` -> `30`
- `configuration_catalog_entry.csv` -> `1740`
- `procedure_dictionary_entry.csv` -> `1442`
- `message_catalog_entry.csv` -> `7061`

Semantic interpretation by source class:
- `Dictionaries_2026_4/configuration.csv` -> `ConfigurationCatalogEntry`
- `Dictionaries_2026_4/Procedures.csv` -> `ProcedureDictionaryEntry`
- `Dictionaries_2026_4/messages.csv` -> `MessageCatalogEntry`
- `Komunikaty_Optimy_2025_3/Messages.xml` -> enriches `MessageCatalogEntry`
- `js`, `xpt`, `hta`, `xml` files under the COM examples tree -> `ImplementationExample`
- COM interfaces declared in `COM_DOK` headers -> `ComInterface`

### Known semantic gaps

The following local files are currently represented only as `FileArtifact` or companion provenance, not as deeper structured entities:

- `Interfejsy_Obiektow_COM_2025.3.1/Interfejsy_Obiektów_COM_2025.3.1.exe`
- companion `txt` files:
  - `.../Dekrety_KH/Dekret.TXT`
  - `.../DodawanieDokKP/KP.TXT`
  - `.../DokMagazynowe/BO.txt`
  - `.../DokMagazynowe/Czytaj_to.txt`
  - `.../DokMagazynowe/FA.TXT`
  - `.../DokMagazynowe/FZ.TXT`
  - `.../DokMagazynowe/PZ.TXT`
  - `.../DokMagazynowe/WZ.TXT`
- UI assets:
  - `.../OknoLogowania/Ico/Akcept.ico`
  - `.../OknoLogowania/Ico/Anuluj.ICO`
  - `.../OknoLogowania/Ico/Optima.ico`
  - `.../OknoLogowania/Ico/Thumbs.db`

Interpretation:
- the KB already consumes all useful executable and dictionary content from this corpus
- the remaining uncovered files are mostly support assets, companion notes, or a binary SDK/runtime package

### Download completeness caveat

The local folder is not guaranteed to be a mathematically complete mirror of the shared Drive folder.

Recovered after a later sync pass:
- Google Drive file id `1zRoujRUPbS_nQTfPk5bUikW1Tf4YHSzF`
- recovered file name: `KorektaZbiorczaFA.js`
- the file was downloaded successfully through the Drive warning-confirm flow and placed into the COM examples tree

Operational conclusion:
- the current KB fully consumes the currently downloaded local corpus
- the previously known blocked file is no longer missing locally
- additional top-level markdown and PDF documents are now present locally and included in staging

## Sprint KB

KB:
- Project: `7`
- Name: `Comarch Optima Sprint and Prints`
- Namespace: `ComarchOptimaSprint`

Local corpus root:
- `downloads/google_drive/sprint/`

### File-level coverage

Local corpus file count:
- `10` files total

Extension split:
- `10` `md`

The exporter writes:
- `file_artifact.csv` -> `10`
- local markdown-backed `ReferenceDocument` rows
- markdown-derived `Chunk` rows

Conclusion:
- every locally downloaded Sprint file is represented as a `FileArtifact`
- every local file is also ingestible as documentation content because the current corpus is markdown-only

### Semantic coverage

The current Sprint KB derives:
- `reference_document.csv` -> `22`
- `file_artifact.csv` -> `10`
- `print_technology.csv` -> `4`
- `print_workflow.csv` -> `8`
- `print_option.csv` -> `8`
- `template_feature.csv` -> `12`
- `sql_pattern.csv` -> `12`
- `diagnostic_case.csv` -> `10`
- `version_change.csv` -> `10`
- `print_catalog.csv` -> `12`
- `learning_resource.csv` -> `11`
- `glossary_term.csv` -> `44`
- `schema_touchpoint.csv` -> `22`
- `module_recipe.csv` -> `7`
- `chunk.csv` -> `145`

Interpretation:
- the local markdown corpus is fully used
- the KB shape is currently documentation-first and recipe-first, not template-artifact-first

### Known semantic gaps

There are no local `.sp` files in the current Sprint corpus.

That means the KB currently lacks:
- real Sprint definition artifacts
- real template internals extracted from `.sp`
- field-level mappings from actual customer print definitions
- real parameter layouts from shipped or custom Sprint templates

Operational conclusion:
- Sprint KB fully consumes the current local corpus
- but the current local corpus is knowledge markdown only, not a real print-template corpus

## Practical next steps

Highest-value additions for later enrichment:

1. Additional Functions
- ingest missing blocked Drive files if access can be fixed
- add structured parsing for companion `txt` files only if they contain reusable recipes or payload contracts
- optionally unpack or document the COM runtime package if a safe textual inventory is needed

2. Sprint
- add real `.sp` files
- add exported parameter definitions
- add screenshots or logs for recurring failure modes
- add curated pairs: source SQL -> template -> output behavior

Current bottom line:
- `ComarchOptimaAdditionalFunctions` fully consumes the currently downloaded local corpus at file level and covers almost all semantically useful content already
- `ComarchOptimaSprint` fully consumes the currently downloaded local corpus, but that corpus still lacks real Sprint template artifacts
