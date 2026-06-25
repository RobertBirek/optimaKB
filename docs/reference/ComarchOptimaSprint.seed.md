# Comarch Optima Sprint KB Seed

## Scope

This KB is a documentation and design-reference layer for:

- `Comarch sPrint`
- other Optima print technologies used as context:
  - `Crystal Reports`
  - `GenRap`
  - `XML`

It is intentionally separate from:

- `ComarchOptimaSchema` - MSSQL structure KB
- `ComarchOptimaAdditionalFunctions` - additional functions KB

It must not ingest live business rows or sensitive operational data.

## Primary references

### Local Sprint corpus

- Local root:
  `downloads/google_drive/sprint/`
- Main materials:
  - `comarch-optima-sprint-kb.md`
  - `compass_artifact_wf-a680a44a-32dd-4634-9e8a-6e744515a6cb_text_markdown.md`
  - `KB-sprint-00-index.md`
  - `KB-sprint-01` through `KB-sprint-07`

This corpus already covers:

- architecture and migration context
- Optima workflow for print configuration
- template editor and features
- SQL/MSSQL patterns
- diagnostics and logging
- sources, roadmap, and training
- glossary

### Official Optima and sPrint help

Key URLs that belong in the KB as first-class references:

- `https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/jak-dodawac-edytowac-wydruki-sprint/`
- `https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/konfiguracja-wydrukow/`
- `https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/jak-wyeksportowac-zaimportowac-definicje-wydruku/`
- `https://pomoc.comarch.pl/optima/pl/2026/kategorie/nowosci-i-zmiany-w-wersji-2026-0-1/`
- `https://pomoc.comarch.pl/sprint/`
- `https://pomoc.comarch.pl/sprint/index.php/spis-tresci/`
- `https://pomoc.comarch.pl/sprint/index.php/dokumentacja/integracja-z-comarch-erp-optima/`
- `https://pomoc.comarch.pl/sprint/index.php/dokumentacja/parametry/`
- `https://pomoc.comarch.pl/sprint/index.php/dokumentacja/bindowanie-parametrow/`
- `https://pomoc.comarch.pl/sprint/index.php/kategorie/miary-wyliczane/`
- `https://pomoc.comarch.pl/sprint/index.php/dokumentacja/logi-dla-comarch-sprint/`
- `https://pomoc.comarch.pl/sprint/index.php/dokumentacja/komunikat-incorrect-syntax-near-the-keyword-where/`

## Seed entity plan

- `ReferenceDocument`
  - local markdown KB files
  - official Optima/sPrint pages
- `FileArtifact`
  - provenance for locally downloaded markdown and later `.sp` or media assets
- `PrintTechnology`
  - `sPrint`, `Crystal Reports`, `GenRap`, `XML`
- `PrintWorkflow`
  - create, clone, import/export, edit, test, deploy, complex print workflow
- `PrintOption`
  - important options such as `Ignoruj filtr aplikacji`
- `TemplateFeature`
  - sections, tables, subreports, QR, barcode, Pixel Perfect, measures
- `SqlPattern`
  - source modes, parameter rules, procedure usage, safe SQL patterns
- `DiagnosticCase`
  - common symptoms, checks, log paths, corrective actions
- `VersionChange`
  - feature deltas across `2024.0` to `2026.4.1`
- `PrintCatalog`
  - standard print families and module coverage
- `LearningResource`
  - official docs, demo, playlists, training, partner materials
- `GlossaryTerm`
  - project vocabulary
- `SchemaTouchpoint`
  - explicit bridge to `ComarchOptimaSchema` tables/procedures/views
- `ModuleRecipe`
  - practical per-area recipes for trade, accounting, VAT, HR, warehouse
- `Chunk`
  - section-level text retrieval over the local markdown corpus

## Design decisions

1. Keep the KB focused on print/report work, not on live print definitions.
2. Treat migration from `Crystal` and `GenRap` as contextual knowledge inside
   the same KB, because users designing new prints must understand legacy input.
3. Use `SchemaTouchpoint` as the stable bridge to `ComarchOptimaSchema` because
   custom relation materialization is still not reliable in this OpenSPG build.
4. Prefer compact previews and summaries for retrieval. Do not push large raw
   binary payloads into OpenSPG unless future source material actually requires it.

## Extension policy

When the Sprint corpus grows, extend the KB with:

- new `FileArtifact` rows for `.sp`, screenshots, exported definitions, or notes
- richer `PrintCatalog` entries for concrete standard prints
- more `SchemaTouchpoint` rows for module-specific SQL anchors
- more `ModuleRecipe` rows for specific document families
- additional `Chunk` rows for new markdown/PDF sources

Keep this KB focused on Sprint and prints. Do not merge additional functions
or generic Optima product documentation into it.
