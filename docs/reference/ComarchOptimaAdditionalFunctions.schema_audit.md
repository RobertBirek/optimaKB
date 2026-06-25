# Comarch Optima Additional Functions Schema Audit

Date: `2026-05-23`

## Scope

This audit was performed against the local corpus downloaded from:

- `downloads/google_drive/additional_functions/`

The goal was to verify whether the current KB schema for
`ComarchOptimaAdditionalFunctions` is sufficient for the real source material,
not only for the official help article.

## Corpus signals observed

The local corpus is not only documentation. It already contains at least these
source families:

- dictionary CSV files:
  - `Dictionaries_2026_4/configuration.csv`
  - `Dictionaries_2026_4/messages.csv`
  - `Dictionaries_2026_4/Procedures.csv`
- message catalog XML:
  - `Komunikaty_Optimy_2025_3/Messages.xml`
- COM/runtime package artifacts:
  - `Interfejsy_Obiektow_COM_2025.3.1/Interfejsy_Obiektów_COM_2025.3.1.exe`
- implementation examples:
  - JS scripts with `COM_DOK` headers
  - XPT files
  - HTA UI examples
  - companion TXT/XML inputs
  - icon and asset files

Representative examples already observed:

- `.../JS/Dekrety_KH/DEKRET.js`
- `.../JS/DodawanieDokKP/ImportZapisyK_B.js`
- `.../JS/DokMagazynowe/BO.js`
- `.../JS/Okno_Postepu_w_IE/ie.XPT`
- `.../JS/OknoLogowania/Logowanie.hta`

## What the previous schema covered well

The existing schema already covered the conceptual/documentation layer:

- `ReferenceDocument`
- `FunctionCapability`
- `FunctionEntryPoint`
- `FunctionExecutionMode`
- `FunctionConfigOption`
- `FunctionRule`
- `FunctionPattern`
- `RelatedFeature`
- `Chunk`

That model is still valid and should remain the semantic/documentation layer of
the KB.

## Gaps found

The previous schema was too narrow for the local corpus because it lacked
dedicated entities for:

1. local file artifacts as first-class sources
2. executable or near-executable implementation examples
3. COM interface references extracted from example headers
4. configuration dictionaries
5. procedure dictionaries
6. message catalogs

Without these entities the KB would flatten real implementation material into
generic chunks, which would make later retrieval and filtering much weaker.

## Schema changes applied

The active schema source file was extended with:

- `FileArtifact`
- `ImplementationExample`
- `ComInterface`
- `ConfigurationCatalogEntry`
- `ProcedureDictionaryEntry`
- `MessageCatalogEntry`

### Intended use of new entities

- `FileArtifact`
  - provenance for every local file
  - file type, path, runtime family, module scope, and preview
- `ImplementationExample`
  - script/template level knowledge
  - example type, author, Optima version, launch hint, interfaces, preview
- `ComInterface`
  - reusable interface-level lookup across examples
- `ConfigurationCatalogEntry`
  - configuration-key dictionary
- `ProcedureDictionaryEntry`
  - procedure id to name lookup
- `MessageCatalogEntry`
  - message id/constant/type/buttons/text lookup

## Export/build implications

The export helper for this KB was updated to support the new schema:

- `scripts/export_optima_additional_functions.mjs`
- `scripts/build_optima_additional_functions.mjs`

The exporter now prepares:

- `file_artifact.csv`
- `implementation_example.csv`
- `com_interface.csv`
- `configuration_catalog_entry.csv`
- `procedure_dictionary_entry.csv`
- `message_catalog_entry.csv`

in addition to the original seed CSV set.

## Design decisions

1. Keep the KB focused on additional functions.
   Sprint report content still belongs in a separate KB.

2. Treat local binaries and assets as provenance-bearing artifacts, not as
   vectorized code content.

3. Vectorize only short previews and summaries for implementation files.
   This preserves retrieval value without pushing large raw payloads into the
   OpenSPG builder path unnecessarily.

4. Preserve `COM_DOK` header metadata explicitly.
   These headers are too useful to leave buried inside raw script text.

## Current limitation

This audit was performed while the Drive download was still in progress. The
schema changes are robust enough for the observed corpus shape, but later
downloaded files may justify further extension, especially if the corpus adds:

- larger .NET example trees
- richer markdown/PDF handbooks
- more XML payload templates
- prepackaged SDK source trees

## Recommended next step

After the local download finishes:

1. rerun `scripts/export_optima_additional_functions.mjs`
2. push the updated schema to OpenSPG
3. run `scripts/build_optima_additional_functions.mjs`
4. verify final counts in the KB for the new artifact/example layers
