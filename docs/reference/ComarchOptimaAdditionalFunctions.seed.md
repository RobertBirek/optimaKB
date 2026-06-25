# Comarch Optima Additional Functions KB Seed

## Scope

This KB is a documentation and implementation-reference layer for Comarch ERP
Optima additional functions. It is intentionally separate from:

- `ComarchOptimaSchema` - MSSQL structure KB
- future Sprint KB

It must not ingest live business rows or sensitive operational data.

## Primary references

### Official article: Additional Functions

- Source URL:
  `https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/funkcje-dodatkowe/`
- Key points:
  - additional functions extend standard Optima behavior
  - they use the same mechanism as prints
  - they are available contextually where printing is available
  - they are split into system functions and user functions
  - the default launch is on the ribbon and by `F11`
  - the configuration window is available by `Ctrl+F11`
  - three configuration filters are exposed in the configuration window
  - automatic execution supports startup, before-save, and after-save modes
  - automatic functions should not trigger document save

### Supporting article: User Columns

- Source URL:
  `https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/opt074-dodawanie-kolumn-uzytkownika-na-listach/`
- Why it belongs here:
  - it describes adjacent SQL customization patterns often used together with
    implementation work around additional functions
  - it allows arbitrary list SQL extensions, joins, and dynamic variables
  - it includes performance caveats that matter for implementation guidance

### Local drive corpus: examples, dictionaries, and COM materials

- Local root:
  `downloads/google_drive/additional_functions/`
- Observed source families:
  - `Dictionaries_2026_4/`
  - `Komunikaty_Optimy_2025_3/`
  - `Interfejsy_Obiektow_COM_2025.3.1/`
  - `Przyklady użycia obiektów COM 2016 - NET - XPT - JS - VB60 - VC/`
- Why they belong here:
  - they provide real implementation examples rather than only conceptual help
  - JS/XPT/HTA examples expose executable patterns, `COM_DOK` headers, and COM interfaces
  - dictionaries expose procedure ids, configuration keys, and message constants
  - local examples often reveal module scope, runtime family, and companion-file structure

## Seed entity plan

- `ReferenceDocument`
  - official and supporting source articles
- `FileArtifact`
  - local downloaded files
  - binaries, scripts, templates, message catalogs, and companion assets
- `ImplementationExample`
  - executable or near-executable examples from JS/XPT/HTA/XML sources
  - extracted `COM_DOK` metadata such as description, author, version, launch hint, and interface list
- `ComInterface`
  - interface names referenced in examples
  - interface families used by COM automation patterns
- `AdditionalFunctionCapability`
  - contextual availability
  - print-mechanism reuse
  - system vs user distinction
  - automatic execution support
- `AdditionalFunctionEntryPoint`
  - ribbon default action
  - dropdown menu
  - configuration window
- `AdditionalFunctionExecutionMode`
  - startup
  - before save
  - after save
- `AdditionalFunctionConfigurationOption`
  - show only populated branches
  - limit to current procedure
  - show only user-defined items
- `AdditionalFunctionRule`
  - do not call document save from automatic function
  - involve an authorized partner for creation work
- `AdditionalFunctionPattern`
  - prefill before form entry
  - validate before persistence
  - trigger follow-up after persistence
- `ConfigurationCatalogEntry`
  - configuration keys and labels from local dictionaries
- `ProcedureDictionaryEntry`
  - procedure ids and names from local dictionaries
- `MessageCatalogEntry`
  - message ids, constants, types, buttons, and visible text from local message catalogs
- `RelatedFeature`
  - user columns / list personalization
  - print mechanism
  - `ComarchOptimaSchema` as the structural KB for SQL/table lookup

## Extension policy

When the local drive corpus is refreshed, extend the KB with:

- new `FileArtifact` rows for every relevant local file
- new `ImplementationExample` rows for executable examples and templates
- `ComInterface` rows derived from `COM_DOK` headers
- dictionary rows from local CSV/XML catalogs
- example-specific `FunctionPattern` rows
- additional `Chunk` rows
- optional `RelatedFeature` rows for exact Optima windows, runtimes, or SQL mechanisms

Keep this KB focused on additional functions. Do not merge Sprint report content
here.
