# OpenSPG KB Operational Memory

This file is the persistent operational memory for KB work in this workspace.
Use it before creating or extending any later KB so work resumes from the last
verified state instead of rediscovering the same OpenSPG behaviors.

The current cross-KB readiness and usefulness assessment lives in
`docs/reference/ComarchKB_Global_Audit.md`. Use that file when deciding whether
to extend an existing KB, create a new KB, or move the project into an
assistant/application phase.
The first question-driven validation across the full active KB set lives in
`docs/reference/ComarchKB_CrossKB_Practical_Test.md`. Use that file when
deciding which KB should be deepened next and which gaps are still only
pattern-level rather than corpus-level.

## Scope

- Workspace: `/docker/openspg`
- OpenSPG host UI/API: `http://10.10.254.42:8887`
- In-container API base: `http://127.0.0.1:8887`
- Main current KB: `ComarchOptimaSchema`
- Current project id: `4`

## OWA Ontology Draft Corpus

On `2026-07-15` to `2026-07-17`, a new draft-only ontology corpus for Comarch
ERP Optima was prepared for the OWA project:

- KB display name: `OWA Platform Optima Ontology`
- Namespace: `OWAOntology`
- Current state: `first_build_complete`
- OpenSPG project id: `16`
- Local draft roots:
  - `downloads/knowledge_inbox/2026-07-15/`
  - `downloads/knowledge_inbox/2026-07-17/`

Verified facts about this corpus:

- `66` ontology entities were drafted as JSON/Markdown pairs.
- Verification sources used:
  - live `MSSQL` reads against `CDN_TEST`
  - live `OptimaMCP` read tools
  - `ComarchOptimaSchema`
  - `ComarchOptimaBusinessSemantics`
- The inbox validator and promotion layer were extended locally to accept
  namespace `OWAOntology` by adding it to:
  - `scripts/lib/promoted_knowledge.mjs`
  - `scripts/lib/knowledge_inbox.mjs`
- Services restarted after that local extension:
  - `erp-kb-mcp.service`
  - `erp-kb-dashboard.service`
- Result: `OptimaKB_submit_knowledge_draft` now accepts `OWAOntology` and writes
  drafts successfully into the local inbox.

Known remaining gap:

- project `16` exists and schema push succeeded
- first export/build pipeline now exists:
  - `scripts/export_owa_ontology.mjs`
  - `scripts/build_owa_ontology.mjs`
  - profile `owa_ontology` in `scripts/build_kb_runner.mjs`
  - pipeline target `OWAOntology` in `scripts/run_knowledge_inbox_pipeline.mjs`
- first verified build completed successfully:
  - job `393` `OntologyEntity` `FINISH`
  - job `394` `OntologyField` `FINISH`
  - job `395` `OntologyRelation` `FINISH`
  - job `396` `Chunk` `FINISH`
- current staged counts:
  - `ontology_entity.csv` -> `67`
  - `ontology_field.csv` -> `109`
  - `ontology_relation.csv` -> `147`
  - `workflow_pattern.csv` -> `0`
  - `chunk.csv` -> `189`
- known remaining tuning gap:
  - workflow extraction is not yet materialized into `workflow_pattern.csv`
    from the current markdown drafts, so the first build loads `0` workflow rows

Do not store passwords, cookies, or tokens here.

## Taxbell Reference KBs

On `2026-06-05`, three document-first Taxbell KBs were created from a broad Exa crawl with ranked source tiers:

- `TaxbellLegalReference`, project `12`
- `TaxbellPayrollHRReference`, project `13`
- `TaxbellAccountingVATReference`, project `14`

The shared source/config/export/build implementation is:

- `scripts/lib/taxbell_reference_config.mjs`
- `scripts/refresh_taxbell_reference_sources.mjs`
- `scripts/export_taxbell_reference.mjs`
- `scripts/create_taxbell_reference_projects.mjs`
- `scripts/build_taxbell_reference.mjs`

Wrapper scripts exist for dashboard/pipeline compatibility:

- `scripts/export_taxbell_legal_reference.mjs`
- `scripts/export_taxbell_payroll_hr_reference.mjs`
- `scripts/export_taxbell_accounting_vat_reference.mjs`
- `scripts/build_taxbell_legal_reference.mjs`
- `scripts/build_taxbell_payroll_hr_reference.mjs`
- `scripts/build_taxbell_accounting_vat_reference.mjs`

Current first-build counts:

- Legal: `44` reference documents, `357` chunks, jobs `247`-`251` all `FINISH`
- Payroll/HR: `47` reference documents, `552` chunks, jobs `252`-`256` all `FINISH`
- Accounting/VAT: `44` reference documents, `378` chunks, jobs `257`-`261` all `FINISH`

Source registries:

- `downloads/taxbell/legal_reference/meta/source_registry.json`
- `downloads/taxbell/payroll_hr_reference/meta/source_registry.json`
- `downloads/taxbell/accounting_vat_reference/meta/source_registry.json`

Dashboard, inbox pipeline, quality gate, source freshness and assistant routing have been extended for these three namespaces. The dashboard now reports `10` configured KBs. Operational runbook: `docs/reference/TaxbellReferenceKBs_Runbook.md`.

## Betterfly Reference KB

### Purpose

- KB name: `Comarch Betterfly Reference`
- Namespace: `ComarchBetterflyReference`
- Project id: `10`
- Scope:
  - official Betterfly help center
  - Betterfly public API documentation
  - onboarding and usage guides for API resources
- Do not ingest live business rows or sensitive operational data.

### Active local source files

- Schema: `docs/reference/ComarchBetterflyReference.schema`
- Seed plan: `docs/reference/ComarchBetterflyReference.seed.md`
- Schema audit: `docs/reference/ComarchBetterflyReference.schema_audit.md`
- Live metadata note: `docs/reference/ComarchBetterflyReference.live_probe.md`
- Contract notes: `docs/reference/ComarchBetterflyReference.contract_notes.md`
- Export script: `scripts/export_betterfly_reference.mjs`
- Build script: `scripts/build_betterfly_reference.mjs`
- Staging directory: `exports/betterfly_reference/v1/`
- Local official snapshot: `downloads/official/betterfly_reference/`

### Current Betterfly export set

- `reference_document.csv` - `31`
- `help_category.csv` - `3`
- `module_area.csv` - `5`
- `api_resource.csv` - `25`
- `api_pattern.csv` - `74`
- `learning_guide.csv` - `5`
- `knowledge_route.csv` - `2`
- `entry_guide.csv` - `7`
- `chunk.csv` - `254`

### Current Betterfly execution history

- Project `10` created successfully through `POST /v1/projects`
- Betterfly schema push to project `10` succeeded through `POST /v1/schemas?projectId=10`
- Job `166` - `ReferenceDocument` - `FINISH`
- Job `167` - `HelpCategory` - `FINISH`
- Job `168` - `ModuleArea` - `FINISH`
- Job `169` - `ApiResource` - `FINISH`
- Job `170` - `ApiPattern` - `FINISH`
- Job `171` - `LearningGuide` - `FINISH`
- Job `172` - `KnowledgeRoute` - `FINISH`
- Job `173` - `EntryGuide` - `FINISH`
- Job `174` - `Chunk` - stale `RUNNING`; server logs showed OpenAI vectorization failure on an oversize `spis-tresci` retrieval row (`maximum input length is 8192 tokens`)
- Exporter fix: keep Betterfly `spis-tresci` pages as `ReferenceDocument` rows, but exclude them from the `Chunk` layer
- Job `175` - `Chunk` - `FINISH`
- Metadata-only live Betterfly enrichment:
  - Job `176` - `ReferenceDocument` - `FINISH`
  - Job `177` - `ApiResource` - `FINISH`
  - Job `178` - `ApiPattern` - `FINISH`
  - Job `179` - `LearningGuide` - `FINISH`
  - Job `180` - `EntryGuide` - `FINISH`
  - Job `181` - `Chunk` - `FINISH`
- Contract-note Betterfly enrichment:
  - Job `182` - `ReferenceDocument` - `FINISH`
  - Job `183` - `ApiPattern` - `FINISH`
  - Job `184` - `Chunk` - `FINISH`
- Archived API-page Betterfly enrichment:
  - Job `185` - `ReferenceDocument` - `FINISH`
  - Job `186` - `ApiResource` - `FINISH`
  - Job `187` - `ApiPattern` - `FINISH`
  - Job `189` - `Chunk` - `FINISH`
  - Duplicate job `188` for `ApiPattern` also reached `FINISH`, but it is duplicate noise. Use `187` as the authoritative archived-pattern refresh.
- Write-side Betterfly enrichment:
  - Job `191` - `ReferenceDocument` - `FINISH`
  - Job `192` - `ApiPattern` - `FINISH`
  - Job `193` - `LearningGuide` - `FINISH`
  - Job `194` - `EntryGuide` - `FINISH`
  - Job `195` - `Chunk` - `FINISH`

Execution artifacts:

- `exports/betterfly_reference/v1/_manifest.json`
- `exports/betterfly_reference/v1/upload_betterfly_reference_manifest.json`
- `exports/betterfly_reference/v1/build_betterfly_reference_jobs_manifest.json`
- `exports/betterfly_reference/v1/README.md`

### Current Betterfly implementation notes

- The Betterfly KB is intentionally document-first with an API layer, not a full OpenAPI or request-validation model.
- The active schema adds:
  - `ApiResource`
  - `ApiPattern`
  over a standard reference KB core.
- The Betterfly exporter deduplicates local HTML snapshots by canonical URL before producing staged rows. This is necessary because the local corpus may contain multiple local files resolving to the same official page.
- The exporter also limits API extraction to pages under `/dokumentacja/api-`, so root pages and table-of-contents pages do not pollute `ApiResource` or `ApiPattern` with navigation-only links.
- Betterfly `spis-tresci` pages must not be emitted into `chunk.csv` as retrieval rows. They can become giant one-row blobs and exceed the OpenAI embedding input limit in this OpenSPG build.
- Betterfly live-API validation must remain metadata-only. Allowed probes:
  - token acquisition
  - endpoint/version reachability
  - response envelope shape
  - auth/error behavior
  Do not intentionally persist live tenant business payloads into repo files or KB rows. Use ephemeral `/tmp` probes only and delete them after the check.
- The current Betterfly enrichment adds one local metadata-only live-validation `ReferenceDocument`, one token-auth `ApiResource`, four live-behavior `ApiPattern` rows, one safe-validation `LearningGuide`, one live-auth `EntryGuide`, and derived retrieval chunks from `ComarchBetterflyReference.live_probe.md`.
- The later Betterfly contract-note enrichment adds one local contract-note `ReferenceDocument`, six contract-oriented `ApiPattern` rows, and derived retrieval chunks from `ComarchBetterflyReference.contract_notes.md`. The contract layer covers products, customers, invoices, paymentdetails, and two negative-path cautions for payment-status probing and invoice print probing.
- The later Betterfly archived-page enrichment adds four official archived API articles for legacy `v1.4` endpoint families:
  - sales invoices
  - advance invoices
  - payments
  - VAT margin invoices
  This widened the local API corpus and added corresponding archived `ApiResource`, `ApiPattern`, and `Chunk` rows without introducing live-data risk.
- The later Betterfly write-side enrichment adds one local workflow note document plus:
  - five curated write-side `ApiPattern` rows
  - one write-side `LearningGuide`
  - one write-side `EntryGuide`
  - retrieval chunks from the write-side note
  This layer focuses on create, update, confirm, delete, finalize, corrective sequences, and version-selection cautions without storing live payloads.
- URL provenance for this KB is stored in:
  - `downloads/official/betterfly_reference/meta/source_registry.json`
- Official Optima/Betterfly source refresh now has a shared delta runner:
  - `scripts/refresh_official_reference_delta.mjs`
  - runbook: `docs/reference/Official_Reference_Delta_Refresh.md`
  - reports: `docs/reference/Official_Reference_Delta_Refresh_Report.json` and `.md`
  It refreshes known official snapshots, compares SHA-256 hashes, reruns exporters only after real source changes, and can build only changed CSV files through `OPENSPG_FORCE_FILES`.
- The ERP KB web dashboard is implemented as a separate lightweight HTTP service:
  - server: `scripts/erp_kb_dashboard_server.mjs`
  - runbook: `docs/reference/ERP_KB_Dashboard_Runbook.md`
  - KB registry: `docs/reference/ERP_KB_Dashboard_KB_Registry.json`
  - frontend: React/Vite build served from `dist/dashboard/`
  - env example: `docs/reference/ERP_KB_Dashboard.env.example`
  - systemd example: `docs/reference/ERP_KB_Dashboard.systemd`
  - intended LAN URL: `http://kag.taxbell.local/panel`
  - backend: `http://10.10.254.42:3410`
  The dashboard can create local knowledge drafts and approve reviewed `pending` drafts through a tracked background action that promotes the draft, runs the matching local exporter, runs the OpenSPG builder, and refreshes source freshness. Rejection remains operator-controlled outside the dashboard. Dashboard action logs live under `logs/dashboard_actions/` and are visible in the `System` tab. The current UI uses tabs, overview KPI tiles, lightweight charts, and a hybrid KB model: registry-backed configured KBs plus read-only detection of export directories not yet configured.
- The local Betterfly snapshot currently includes `28` canonical pages after deduplication and focuses on:
  - API overview
  - authentication and user guide
  - filtering
  - change history
  - products, customers, payments, bank accounts, payment types
  - invoice, proforma, advance, purchase, VAT margin, corrective, VAT purchase register, and print resources
  - ERP XT legacy naming context

## Current active KB

### Purpose

- KB name: `Comarch Optima ERP MSSQL Schema`
- Namespace: `ComarchOptimaSchema`
- Project id: `4`
- Scope is schema metadata only for:
  - `CDN_TEST`
  - `CDN_KNF_Konfiguracja`
- Do not ingest business rows from live tables into this KB.
- Intended use:
  - database structure analysis
  - query design for special functions
  - query design for Sprint reports/prints

## Additional Functions KB

### Purpose

- KB name: `Comarch Optima Additional Functions`
- Namespace: `ComarchOptimaAdditionalFunctions`
- Project id: `6`
- Scope:
  - official Additional Functions documentation
  - supporting User Columns article
  - implementation-reference patterns and cautions
- Do not ingest live business rows or sensitive operational data.

### Active local source files

- Schema: `docs/reference/ComarchOptimaAdditionalFunctions.schema`
- Seed plan: `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`
- Schema audit: `docs/reference/ComarchOptimaAdditionalFunctions.schema_audit.md`
- Seed export script: `scripts/export_optima_additional_functions.mjs`
- Seed build script: `scripts/build_optima_additional_functions.mjs`
- Staging directory: `exports/optima_additional_functions/v1/`
- Local drive corpus: `downloads/google_drive/additional_functions/`

### Current Additional Functions export set

- `reference_document.csv` - `158`
- `additional_function_capability.csv` - `4`
- `additional_function_entry_point.csv` - `3`
- `additional_function_execution_mode.csv` - `3`
- `additional_function_configuration_option.csv` - `3`
- `additional_function_rule.csv` - `2`
- `additional_function_pattern.csv` - `4`
- `related_feature.csv` - `3`
- `file_artifact.csv` - `58`
- `implementation_example.csv` - `178`
- `com_interface.csv` - `30`
- `configuration_catalog_entry.csv` - `1740`
- `procedure_dictionary_entry.csv` - `1442`
- `message_catalog_entry.csv` - `7061`
- `implementation_guide.csv` - `7`
- `schema_touchpoint.csv` - `206`
- `module_recipe.csv` - `7`
- `chunk.csv` - `185`

### Current Additional Functions execution history

- Job `67` - `ReferenceDocument` - `FINISH`
- Job `68` - `FunctionCapability` - `FINISH`
- Job `69` - `FunctionEntryPoint` - `FINISH`
- Job `70` - `FunctionExecutionMode` - `FINISH`
- Job `71` - `FunctionConfigOption` - `FINISH`
- Job `72` - `FunctionRule` - `FINISH`
- Job `73` - `FunctionPattern` - `FINISH`
- Job `74` - `RelatedFeature` - `FINISH`
- Job `75` - `Chunk` - `FINISH`
- Job `76` - `ReferenceDocument` - `FINISH`
- Job `77` - `FileArtifact` - `FINISH`
- Job `78` - `ImplementationExample` - `FINISH`
- Job `79` - `ComInterface` - `FINISH`
- Job `80` - `ConfigurationCatalogEntry` - `FINISH`
- Job `81` - `ProcedureDictionaryEntry` - `FINISH`
- Job `82` - `MessageCatalogEntry` - `FINISH`
- Job `83` - `ImplementationGuide` - `FINISH`
- Job `84` - `SchemaTouchpoint` - `FINISH`
- Job `85` - `ModuleRecipe` - `FINISH`
- Job `113` - `ReferenceDocument` refresh - `FINISH`
- Job `114` - `FileArtifact` refresh - `FINISH`
- Job `115` - `ImplementationExample` refresh - `FINISH`
- Job `116` - `SchemaTouchpoint` refresh - `FINISH`
- Job `117` - `Chunk` refresh - `FINISH`
- Job `118` - `ReferenceDocument` PDF-text refresh - `FINISH`
- Job `119` - `FileArtifact` PDF-text refresh - `FINISH`
- Job `120` - `Chunk` PDF-text refresh - `FINISH`
- Job `196` - `ReferenceDocument` manual-export refresh - `FINISH`
- Job `197` - `FileArtifact` manual-export refresh - `FINISH`
- Job `198` - `ImplementationExample` manual-export refresh - `FINISH`
- Job `199` - `Chunk` manual-export refresh - `FINISH`

Execution artifacts:

- `exports/optima_additional_functions/v1/_manifest.json`
- `exports/optima_additional_functions/v1/upload_additional_functions_manifest.json`
- `exports/optima_additional_functions/v1/build_additional_functions_jobs_manifest.json`
- `exports/optima_additional_functions/v1/README.md`

### Current Additional Functions implementation notes

- Creating the KB proved that `POST /v1/projects` can succeed with a minimal payload:
  - `name`
  - `namespace`
  - `description`
  - `visibility`
  - `tag`
  - `config.vectorizer.modelId`
- The backend fills the remaining graph-store defaults automatically.
- Project names are mutable, but namespace is effectively immutable after create for this workflow; use a clean create if namespace is wrong.
- `POST /v1/schemas` still uses the current project context in this build path. After creating project `6`, pushing `ComarchOptimaAdditionalFunctions.schema` correctly updated project `6` and did not alter project `4`.
- OpenSPG type names must stay within the backend length limit. The original long names such as `AdditionalFunctionCapability` were rejected. The active shortened entity names are:
  - `FunctionCapability`
  - `FunctionEntryPoint`
  - `FunctionExecutionMode`
  - `FunctionConfigOption`
  - `FunctionRule`
  - `FunctionPattern`
- Builder job names also hit a MySQL length limit. The active build script now uses the short prefix `COAF` for later job names.
- The first corpus-based schema audit against the local Drive materials showed that the KB needs more than the conceptual/documentation layer. The active schema source now includes:
  - `FileArtifact`
  - `ImplementationExample`
  - `ComInterface`
  - `ConfigurationCatalogEntry`
  - `ProcedureDictionaryEntry`
  - `MessageCatalogEntry`
- The export helper was widened accordingly and now scans the local drive corpus for:
  - file-level provenance
  - executable example metadata from `COM_DOK` headers
  - COM interface usage
  - configuration dictionaries
  - procedure dictionaries
  - message catalogs
- The export helper was successfully re-run after the schema audit and produced the counts listed above from the currently downloaded local snapshot.
- Because the Google Drive download was still in progress during the audit pass, treat the current local-corpus counts as a moving lower bound until the download session is complete.
- A later direct Drive sync recovered the previously blocked file:
  - id `1zRoujRUPbS_nQTfPk5bUikW1Tf4YHSzF`
  - file name `KorektaZbiorczaFA.js`
- The local Additional Functions corpus now has `57` files and includes extra top-level markdown and PDF documents discovered from the shared folder listing.
- The export helper was widened again so those top-level local documents now contribute:
  - extra `ReferenceDocument` rows
  - markdown-derived local `Chunk` rows
- A later exporter pass introduced shared best-effort PDF text extraction through:
  - `scripts/lib/pdf_text.mjs`
- The Additional Functions exporter now uses that helper so top-level local PDF manuals can contribute:
  - `ReferenceDocument` rows
  - local `Chunk` rows
- The Sprint exporter also uses the same helper, so future local Sprint PDFs can be chunked without a separate manual markdown conversion.
- The workspace now also includes direct Optima UI exports under `downloads/google_drive/manual_exports/`:
  - `export_fd.xml`
  - `export_wydruki.xml`
- Their audit is recorded in:
  - `docs/reference/Optima_Manual_Exports_Audit_2026-06-01.md`
- `scripts/export_optima_additional_functions.mjs` now consumes `export_fd.xml` directly and emits:
  - one raw-export `FileArtifact`
  - one master export `ReferenceDocument`
  - `145` `ImplementationExample` rows of type `optima_manual_export_definition`
  - per-definition `ReferenceDocument` and `Chunk` rows
- This direct export materially confirms that Additional Functions use the same broad `Wydruk` configuration/export model as prints and can be distinguished by `WDR_RODZAJ`, `WDR_TYP`, and `WDR_PODTYP`.
- The parser for these manual exports is intentionally tolerant and line-oriented because strict XML parsing fails on some embedded definition payloads.
- A later corpus-coverage audit confirmed:
  - every currently downloaded file under `downloads/google_drive/additional_functions/` is represented as a `FileArtifact`
  - the semantically important classes are already consumed:
    - dictionaries
    - message XML enrichment
    - executable example sources (`js`, `xpt`, `hta`, `xml`)
  - the remaining artifact-only files are mostly support assets:
    - companion `txt`
    - UI icons / `Thumbs.db`
    - one COM runtime `exe`
- That expanded staging was later refreshed successfully into OpenSPG project `6` through jobs `113`-`117`.
- The later PDF-text refresh then updated the local-document slices again through jobs `118`-`120`, bringing `chunk.csv` from `37` to `40`.
- The widened `ComarchOptimaAdditionalFunctions.schema` was pushed successfully to OpenSPG project `6` after the audit pass, so the server-side schema is aligned with the repo source-of-truth even before the next full data build.
- The post-audit build then completed successfully for all new layers, so project `6` now includes:
  - refreshed `ReferenceDocument`
  - `FileArtifact`
  - `ImplementationExample`
  - `ComInterface`
  - `ConfigurationCatalogEntry`
  - `ProcedureDictionaryEntry`
  - `MessageCatalogEntry`
- A later enrichment pass added:
  - `ImplementationGuide`
  - `SchemaTouchpoint`
- `ImplementationGuide` is the curated pattern/decision layer for choosing between additional functions, user columns, shell wrappers, and database logic reuse.
- `SchemaTouchpoint` is the cross-KB bridge into `ComarchOptimaSchema`. It stores example-to-schema anchors as explicit entities because relation materialization is still not reliable in this OpenSPG build.
- `ModuleRecipe` is the practical per-area recipe layer. It summarizes how to approach common Additional Functions work in:
  - trade and warehouse
  - bank/cash
  - accounting decrees
  - VAT and auxiliary ledgers
  - attributes/dictionaries
  - CRM contacts
  - operator administration and shell wrappers

## Sprint KB

### Purpose

- KB name: `Comarch Optima Sprint and Prints`
- Namespace: `ComarchOptimaSprint`
- Project id: `7`
- Scope:
  - Comarch sPrint
  - Optima print workflow
  - legacy print context: `Crystal Reports`, `GenRap`, `XML`
  - SQL/report design patterns
  - diagnostics, version changes, standard print families, glossary
  - explicit schema anchors into `ComarchOptimaSchema`
- Do not ingest live business rows or sensitive operational data.

### Active local source files

- Schema: `docs/reference/ComarchOptimaSprint.schema`
- Seed plan: `docs/reference/ComarchOptimaSprint.seed.md`
- Schema audit: `docs/reference/ComarchOptimaSprint.schema_audit.md`
- Export script: `scripts/export_optima_sprint.mjs`
- Build script: `scripts/build_optima_sprint.mjs`
- Staging directory: `exports/optima_sprint/v1/`
- Local drive corpus: `downloads/google_drive/sprint/`

### Current Sprint export set

- `reference_document.csv` - `167`
- `file_artifact.csv` - `11`
- `print_technology.csv` - `4`
- `print_workflow.csv` - `8`
- `print_option.csv` - `8`
- `template_feature.csv` - `12`
- `sql_pattern.csv` - `15`
- `diagnostic_case.csv` - `10`
- `version_change.csv` - `10`
- `print_catalog.csv` - `12`
- `learning_resource.csv` - `11`
- `glossary_term.csv` - `44`
- `schema_touchpoint.csv` - `22`
- `module_recipe.csv` - `7`
- `chunk.csv` - `290`

### Current Sprint execution history

- Job `86` - `ReferenceDocument` - `FINISH`
- Job `87` - `FileArtifact` - `FINISH`
- Job `88` - `PrintTechnology` - `FINISH`
- Job `89` - `PrintWorkflow` - `FINISH`
- Job `90` - `PrintOption` - `FINISH`
- Job `91` - `TemplateFeature` - `FINISH`
- Job `92` - `SqlPattern` - `FINISH`
- Job `93` - `DiagnosticCase` - `FINISH`
- Job `94` - `VersionChange` - `FINISH`
- Job `95` - `PrintCatalog` - `FINISH`
- Job `96` - `LearningResource` - `FINISH`
- Job `97` - `GlossaryTerm` - `FINISH`
- Job `98` - `SchemaTouchpoint` - `FINISH`
- Job `99` - `ModuleRecipe` - `FINISH`
- Job `100` - `Chunk` - `FINISH`
- Job `200` - `ReferenceDocument` manual-export refresh - `FINISH`
- Job `201` - `FileArtifact` manual-export refresh - `FINISH`
- Job `202` - `SqlPattern` manual-export refresh - `FINISH`
- Job `203` - `Chunk` manual-export refresh - `FINISH`

Execution artifacts:

- `exports/optima_sprint/v1/_manifest.json`
- `exports/optima_sprint/v1/upload_optima_sprint_manifest.json`
- `exports/optima_sprint/v1/build_optima_sprint_jobs_manifest.json`
- `exports/optima_sprint/v1/README.md`

### Current Sprint implementation notes

- The local Sprint drive corpus is documentation-first. The current schema therefore focuses on:
  - workflows
  - SQL/report patterns
  - diagnostics
  - versioning and migration
  - schema touchpoints into `ComarchOptimaSchema`
  - glossary/routing layers
- `scripts/export_optima_sprint.mjs` now also consumes `downloads/google_drive/manual_exports/export_wydruki.xml`.
- That direct export currently contributes:
  - one raw-export `FileArtifact`
  - one master export `ReferenceDocument`
  - `144` readable per-print `ReferenceDocument` rows
  - `3` extra `SqlPattern` rows of type `OPTIMA_MANUAL_EXPORT_SQL`
  - per-definition retrieval chunks for readable print definitions
- The direct export confirms that multiple print technologies share the same `Wydruk` storage/export model and are differentiated mainly by:
  - `WDR_RODZAJ`
  - `WDR_TYP`
  - `WDR_PODTYP`
- Most exported print definitions remain compressed, so the current parser surfaces readable definitions first and preserves metadata for the compressed majority. Full decompression of the large compressed family is still an open follow-up.
- `scripts/build_optima_sprint.mjs` had a force-refresh bug: even with `OPENSPG_FORCE_FILES`, it could still reuse an old finished server job by matching only `jobName`. This is now fixed by bypassing `existingByJobName` reuse for forced files. The first corrected manual refresh used jobs `200`-`203`.

## Partner portal audit

### Scope

- First authenticated audit date: `2026-05-24`
- Portal: `https://partner.erp.comarch.pl/`
- Product area audited: `Comarch ERP Optima`
- Detailed audit file:
  - `docs/reference/ComarchOptimaPartnerTechnical.audit.md`

### Confirmed technical behavior

- The partner portal exposes a usable WordPress REST surface:
  - `/wp-json/wp/v2/categories`
  - `/wp-json/wp/v2/media`
  - `/wp-json/wp/v2/posts`
  - `/wp-json/wp/v2/pages`
  - `/wp-json/wp/v2/search`
- For the technical Optima areas, the corpus is primarily `attachment` / `media` driven rather than post-body driven.
- This means a future partner-technical KB should be asset-first:
  - download file metadata first
  - treat pages/posts as routing and context
  - model current vs archived version bands explicitly

### Confirmed Optima technical category families

- `Struktura baz danych`
- `Funkcje dodatkowe`
- `Pliki pomocnicze`
- `Makra księgowe`
- `Sterowniki`
- `Struktura plików XML`
- `Aktualna dokumentacja techniczna działa z Comarch ERP Optima`
- `Archiwalna dokumentacja techniczna działa z Comarch ERP Optima`

### Immediate design implication

- If a new partner KB is built, start with:
  - category catalog
  - media catalog
  - selective download of technical Optima assets
- Do not start with blind full-site scraping.

### Prepared partner technical KB skeleton

- Prepared KB name:
  - `Comarch Optima Partner Technical`
- Prepared namespace:
  - `ComarchOptimaPartnerTechnical`
- OpenSPG project id:
  - `9`
- Local schema and seed files:
  - `docs/reference/ComarchOptimaPartnerTechnical.schema`
  - `docs/reference/ComarchOptimaPartnerTechnical.seed.md`
- Local source workspace:
  - `downloads/partner/optima_technical/`
- Export/build helpers:
  - `scripts/export_optima_partner_technical.mjs`
  - `scripts/build_optima_partner_technical.mjs`

### Current prepared staging state

- Live metadata refresh was executed on `2026-05-24` with an authenticated partner session.
- Snapshot files were written to:
  - `downloads/partner/optima_technical/api/categories.json`
  - `downloads/partner/optima_technical/api/media.json`
- The prepared partner exporter now applies an explicit anti-duplication split:
  - `ROUTE_ONLY`
  - `INDEX_AND_RETRIEVE`
- Use `ROUTE_ONLY` for partner assets that overlap a specialist KB, especially:
  - database structure materials
  - additional functions materials
- Keep those assets in catalog metadata, but do not let them dominate retrieval chunks in the partner KB.
- Prepared staged counts:
  - `reference_document.csv` - `2`
  - `partner_category.csv` - `14`
  - `partner_asset.csv` - `548`
  - `asset_type.csv` - `9`
  - `version_band.csv` - `234`
  - `product_area.csv` - `8`
  - `knowledge_route.csv` - `3`
  - `chunk.csv` - `151`
- Current overlap split:
  - `ROUTE_ONLY` - `289`
  - `INDEX_AND_RETRIEVE` - `259`
- The current content-enriched partner staging now also includes parsed dictionary layers from downloaded `Dictionaries_*.zip` archives:
  - `cfg_entry.csv` - `3446`
  - `proc_entry.csv` - `2884`
  - `msg_entry.csv` - `14109`
- The current content-enriched partner staging now also includes parsed COM-example layers from downloaded `Przyklady-uzycia-obiektow-COM-*` archives:
  - `com_example.csv` - `97`
  - `com_interface_use.csv` - `537`
  - `com_schema_touchpoint.csv` - `202`
  - `com_module_recipe.csv` - `8`
- The current content-enriched staging counts are:
  - `reference_document.csv` - `121`
  - `partner_category.csv` - `14`
  - `partner_asset.csv` - `548`
  - `asset_type.csv` - `9`
  - `version_band.csv` - `234`
  - `product_area.csv` - `8`
  - `cfg_entry.csv` - `3446`
  - `proc_entry.csv` - `2884`
  - `msg_entry.csv` - `14109`
  - `knowledge_route.csv` - `3`
  - `chunk.csv` - `296`
- A later targeted partner-source probe on `2026-05-25` selected `18` `INDEX_AND_RETRIEVE` assets from:
  - `PRODUCT_AREA_XMLSTRUCTURES`
  - `PRODUCT_AREA_ACCOUNTINGMACROS`
  - `PRODUCT_AREA_HELPERFILES`
- Practical result of that probe:
  - all `18` downloads completed at the HTTP level
  - all `18` returned the Comarch SSO HTML page instead of the requested binary when using only `PHPSESSID=...`
  - the local downloader now records this explicitly as `AUTH_REDIRECT_HTML`
  - the exporter now injects that probe result into `partner_asset.csv` summaries and derived `chunk.csv` asset chunks
- This means the partner KB now distinguishes between:
  - a real binary/local extract
  - a metadata-only asset
  - an auth-blocked asset probe
- A later retry with a fuller browser cookie succeeded for the same selected XML/helper/macro slice:
  - `18` direct binary downloads
  - PDF text sidecars recovered for the selected partner PDFs
  - ZIP inventories captured for the selected partner archives
  - a later ZIP extraction pass completed successfully with `133` extracted text files
- The partner downloader probe bug was also corrected on `2026-05-25`:
  - earlier sidecars could preserve stale HTML-auth notes after a later successful binary download
  - `detectBarrierFromDownloadedFile()` now only flags files that actually look like HTML
  - `assetRunStateMap()` no longer backfills older `probeState` / `probeNote` into newer successful runs
- The resulting content-enrichment refresh into OpenSPG project `9` completed as:
  - `144` `ReferenceDocument` `FINISH`
  - `145` `PartnerAsset` `FINISH`
  - `146` `Chunk` `FINISH`
- A later narrow partner refresh widened retrieval without adding new schema types:
  - selected extracted XML/XPT/HTML files from XML structures, helper packages, and accounting-macro archives are now emitted as additional `ReferenceDocument` rows with `semanticType=partnerExampleExtract`
  - extracted `Chunk` rows now point to those example-style source documents where available instead of only to the parent asset
  - representative ids now include:
    - `PARTNER_EXAMPLE_DOC_PARTNER_ASSET_5056_RYCZALT_XML_1`
    - `PARTNER_EXAMPLE_DOC_PARTNER_ASSET_5056_RYCZALT_XPT_2`
    - `PARTNER_EXAMPLE_DOC_PARTNER_ASSET_5059_DODATKOWA_KOLUMNA_XML_1`
    - `PARTNER_EXAMPLE_DOC_PARTNER_ASSET_5059_FUNKCJE_DODATKOWE_XML_2`
- That extracted-example refresh completed as:
  - `151` `ReferenceDocument` `FINISH`
  - `152` `Chunk` `FINISH`
- A later pass promoted real COM sample extracts from `Przyklady-uzycia-obiektow-COM-*` into the same stable `ReferenceDocument + Chunk` path instead of adding new schema types.
- That COM-example promotion refresh completed as:
  - `153` `ReferenceDocument` `FINISH`
  - `154` `Chunk` `FINISH`
- That pass raised `reference_document.csv` from `27` to `124`, including `105` `partnerExampleExtract` rows such as:
  - `PARTNER_EXAMPLE_DOC_PARTNER_ASSET_10444_ATRYBUTY_1`
  - `PARTNER_EXAMPLE_DOC_PARTNER_ASSET_10444_DODAJOPERATORA_5`
  - `PARTNER_EXAMPLE_DOC_PARTNER_ASSET_10444_KSIEGUJFAKTUREKSIEGUJFAKTURESPRZEDAZY_28`
  - `PARTNER_EXAMPLE_DOC_PARTNER_ASSET_10444_OKNOLOGOWANIALOGOWANIE_92`
- A later dedup refresh collapsed exact multi-language variant duplicates for the same COM example name into single `ReferenceDocument` rows with `Primary variant` and `Variants:` listed in `summary`.
- That cleanup completed as:
  - `155` `ReferenceDocument` `FINISH`
  - `156` `Chunk` `FINISH`
- After deduplication:
  - COM-derived `partnerExampleExtract` rows dropped from `97` to `93`
  - `reference_document.csv` dropped from `124` to `120`
- The partner ZIP extractor was then widened again to recover text from PDF files embedded inside ZIP archives.
- The first confirmed use was:
  - `PARTNER_ASSET_11023` `Comarch ERP Optima 2026.4 – API KSeF`
  - embedded file `Optima.Core.API - szybki start.pdf`
- That ZIP-PDF refresh completed as:
  - `157` `ReferenceDocument` `FINISH`
  - `158` `Chunk` `FINISH`
- After that step:
  - `reference_document.csv` rose from `120` to `121`
  - `chunk.csv` rose from `295` to `296`
- Direct graph verification on database `comarchoptimapartnertechnical` confirmed:
  - `ReferenceDocument` count = `121`
  - `Chunk` count = `296`
  - `Chunk(PARTNER_CHUNK_EXTRACT_PARTNER_ASSET_5051_PDF)` exists
  - `PartnerAsset(PARTNER_ASSET_5051).summary` now ends with `Local probe: BINARY_OK.`
- The partner ZIP extractor was later widened again to recurse one level into nested ZIP archives. The first confirmed nested recovery was:
  - `PARTNER_ASSET_10061` `_Dictionaries_2026_2.zip`
  - nested `Dictionaries_2026_1.zip`
  - recovered nested sidecars:
    - `001__Dictionaries_2026_1.zip__configuration.csv.csv.txt`
    - `002__Dictionaries_2026_1.zip__messages.csv.csv.txt`
    - `003__Dictionaries_2026_1.zip__Procedures.csv.csv.txt`
- The same pass also fixed a control-flow bug in `scripts/extract_optima_partner_technical_archives.mjs`:
  - skip/output checks inside the per-entry archive loop now use `continue`
  - previously, an already-extracted entry could abort processing of the rest of the archive
- After nested ZIP recovery, the current staged partner counts are:
  - `reference_document.csv` - `122`
  - `partner_category.csv` - `14`
  - `partner_asset.csv` - `548`
  - `asset_type.csv` - `9`
  - `version_band.csv` - `234`
  - `product_area.csv` - `8`
  - `cfg_entry.csv` - `5149`
  - `proc_entry.csv` - `4324`
  - `msg_entry.csv` - `21140`
  - `com_example.csv` - `97`
  - `com_interface_use.csv` - `537`
  - `com_schema_touchpoint.csv` - `202`
  - `com_module_recipe.csv` - `8`
  - `knowledge_route.csv` - `3`
  - `chunk.csv` - `299`
- The OpenSPG refresh after that pass is partially complete and currently verified as:
  - `159` `ReferenceDocument` `FINISH`
  - `160` `CfgEntry` `FINISH`
  - `161` `ProcEntry` duplicate submit `FINISH`
  - `162` `ProcEntry` duplicate submit `FINISH`
- The same refresh also produced duplicate `MsgEntry` submits:
  - `163`
  - `164`
  - `165`
- Those duplicate `MsgEntry` jobs later all reached `FINISH`; use `165` as the authoritative manifest row for the widened `msg_entry.csv` refresh to `21140`.
- To prevent repeating that pattern on later reruns, `scripts/build_optima_partner_technical.mjs` was hardened so that if a matching partner job is already in `INIT`, `WAITING`, or `RUNNING`, the runner reuses that active job and waits for it instead of submitting another duplicate build.

### Project creation and first build

- Project `9` exists:
  - name: `Comarch Optima Partner Technical`
  - namespace: `ComarchOptimaPartnerTechnical`
  - visibility: `PRIVATE`
  - tag: `LOCAL`
  - graph store database: `comarchoptimapartnertechnical`
  - vectorizer model:
    - `b87d551d4ba14909907c6e29218fa011@text-embedding-3-small`
- The default schema in project `9` was replaced successfully through:
  - `POST /v1/schemas?projectId=9`
- Verified builder jobs for the first metadata-first load:
  - `121` `ReferenceDocument` `FINISH`
  - `122` `PartnerCategory` `FINISH`
  - `123` `PartnerAsset` `FINISH`
  - `124` `AssetType` `FINISH`
  - `125` `VersionBand` `FINISH`
  - `126` `ProductArea` `FINISH`
  - `127` `KnowledgeRoute` `FINISH`
  - `128` `Chunk` `FINISH`
- Execution artifacts:
  - `exports/optima_partner_technical/v1/upload_optima_partner_technical_manifest.json`
  - `exports/optima_partner_technical/v1/build_optima_partner_technical_jobs_manifest.json`
  - `exports/optima_partner_technical/v1/README.md`

### Refresh contract

- Baseline export without live portal access:
  - `node scripts/export_optima_partner_technical.mjs`
- Live partner refresh:
  - `PARTNER_COOKIE='PHPSESSID=...' PARTNER_REFRESH=1 node scripts/export_optima_partner_technical.mjs`
- Selective asset download:
  - `PARTNER_COOKIE='PHPSESSID=...' node scripts/download_optima_partner_technical_assets.mjs`
- Selective ZIP extraction:
  - `node scripts/extract_optima_partner_technical_archives.mjs`
- Build into the current project:
  - `OPENSPG_COOKIE='...' OPENSPG_PROJECT_ID=9 OPENSPG_NAMESPACE=ComarchOptimaPartnerTechnical OPENSPG_JOB_PREFIX=COPT node scripts/build_optima_partner_technical.mjs`
- In the current workspace sandbox, direct `node fetch` from that builder may fail with:
  - `connect EPERM 10.10.254.42:8887`
  - `connect EPERM 127.0.0.1:8887`
- The same OpenSPG API is still reachable through `curl`, so narrow partner refreshes can still be completed through:
  - manual `uploadFile`
  - manual `builder/job/submit`
  - manual `builder/job/get`
- A later escalated run of `scripts/build_optima_partner_technical.mjs` also succeeded directly for a narrow refresh, so the current confirmed partner refreshes are:
  - `142` `PartnerAsset` `FINISH`
  - `143` `Chunk` `FINISH`
- Downloader defaults:
  - `INDEX_AND_RETRIEVE` only
  - `CURRENT` only
  - file types `pdf,zip`
  - limit `20`
  - max size `157286400` bytes
- URL provenance for duplicate checks and source attribution is now persisted in:
  - `downloads/partner/optima_technical/source_registry.json`
  - `exports/optima_partner_technical/v1/partner_asset.csv`
  - `downloads/partner/optima_technical/download_manifest.json`
- The download manifest stores per-asset:
  - `directDownloadUrl`
  - local path
  - content type
  - content length
  - `sha256`
  - sidecar paths
- ZIP extraction state is persisted in:
  - `downloads/partner/optima_technical/extraction_manifest.json`
- The ZIP extractor reads already downloaded archives and extracts only text-bearing files such as:
  - `txt`
  - `md`
  - `csv`
  - `xml`
  - `js`
  - `xpt`
  - `hta`
  - `cs`
  - `sql`
  - `json`
  - `ini`
  - `config`
  - `xsd`
  - `xsl`
  - `vbs`
  - `vb`
  - `h`
  - `tlh`
  - `tli`
- The ZIP extractor now prioritizes high-value implementation files over raw header/support files.
- First controlled partner download pass on `2026-05-24` used:
  - `PARTNER_DOWNLOAD_LIMIT=8`
  - default `CURRENT`
  - default `pdf,zip`
- Result:
  - `8` selected
  - `8` downloaded
  - `0` skipped existing
  - `0` skipped large
  - `0` errors
- Sidecars created:
  - `1` recovered PDF text sidecar under `downloads/partner/optima_technical/extracted/pdf_text/`
  - `7` ZIP inventory sidecars under `downloads/partner/optima_technical/unpacked/zip_inventory/`
- First ZIP extraction pass on `2026-05-24`:
  - `7` archives selected
  - `7` archives processed
  - `125` extracted text files
  - `1` skipped as non-text
  - `0` errors
- Refined ZIP extraction pass after extension prioritization on `2026-05-24`:
  - `7` archives selected
  - `7` archives processed
  - `126` extracted text files
  - `0` skipped as non-text
  - `0` errors
- Extracted archive text now lives under:
  - `downloads/partner/optima_technical/extracted/zip_text/`
- The exporter now consumes local partner extracts and reflects them back into the partner KB staging:
  - `reference_document.csv` increased from `2` to `6`
  - `chunk.csv` increased from `151` to `278`
- The first content-enriched partner KB refresh completed successfully as:
  - `129` `ReferenceDocument` `FINISH`
  - `130` `PartnerAsset` `FINISH`
  - `131` `Chunk` `FINISH`
- The partner schema was then widened with:
  - `CfgEntry`
  - `ProcEntry`
  - `MsgEntry`
- Those entities are populated from parsed local dictionary extracts, not from live Optima business rows.
- The dictionary-content build then completed successfully as:
  - `132` `CfgEntry` `FINISH`
  - `133` `ProcEntry` `FINISH`
  - `134` `MsgEntry` `FINISH`
- The first COM-example build initially completed as:
  - `135` `ComExample` `FINISH`
  - `136` `ComInterfaceUse` `FINISH`
  - `137` `ComSchemaTouchpoint` `FINISH`
- A later direct Neo4j verification showed that these first COM-example rows had a few id collisions after name normalization:
  - `97` staged `ComExample` rows produced `93` nodes
  - `537` staged `ComInterfaceUse` rows produced `534` nodes
  - `202` staged `ComSchemaTouchpoint` rows produced `200` nodes
- Root cause:
  - some examples existed in parallel `js`, `xpt`, and `cs` variants with the same normalized name
  - the first id scheme used normalized example names instead of file-unique source keys
- The exporter was then corrected to generate COM example ids from the source file identity, not only the normalized example name.
- The stale `ComExample`, `ComInterfaceUse`, and `ComSchemaTouchpoint` nodes were deleted from graph database `comarchoptimapartnertechnical`, and a clean rebuild completed as:
  - `138` `ComExample` `FINISH`
  - `139` `ComInterfaceUse` `FINISH`
  - `140` `ComSchemaTouchpoint` `FINISH`
- Final verified graph counts after the clean rebuild:
  - `ComExample` - `97`
  - `ComInterfaceUse` - `537`
  - `ComSchemaTouchpoint` - `202`
- The COM-example parser is intentionally scoped to meaningful implementation files from `Przyklady-uzycia-obiektow-COM-*`:
  - it prefers `js`, `xpt`, `xml`, `hta`, and `cs`
  - it ignores build noise such as `obj`, `bin`, `AssemblyInfo`, `tlh`, `tli`, and header-only artifacts
  - it parses `COM_DOK` blocks, `ActiveXObject(...)`, `CreateObject(...)`, and schema-hint patterns
- The current partner COM-example layer now gives the KB:
  - normalized example names such as `Atrybuty`, `DodajOperatora`, `WyborDostawy`, `WydrukiPrzykladyWykonywaniaWydrukow`
  - explicit interface usage rows
  - explicit touchpoints back into `ComarchOptimaSchema`
- The partner schema was later widened again with:
  - `ComModuleRecipe`
- That layer is synthesized from:
  - grouped COM examples by `moduleHint`
  - grouped interface usage
  - grouped schema touchpoints
  - explicit, heuristic partner dictionary hints from `ProcEntry`, `CfgEntry`, and `MsgEntry`
- The module-recipe enrichment completed successfully as:
  - `141` `ComModuleRecipe` `FINISH`
- Final verified graph count for that layer:
  - `ComModuleRecipe` - `8`
- The module-recipe layer was later refreshed again as job `149` after the recipe summaries were enriched with XML/XPT and accounting-macro hints from partner technical assets.
- A later attempt to add separate `XmlPatternEntry` and `MacroGuideEntry` layers was intentionally reverted because `POST /v1/schemas` accepted the script but did not materialize those new types in the schema graph. The current stable approach is to keep XML and macro hints folded into `ComModuleRecipe.summary`; the graph materializes only the recipe entity, not those helper fields.
- The `MsgEntry` batch was long-running but verified healthy during execution:
  - `job 134` stayed in `RUNNING` while `Neo4jSinkWriter` continued writing `MSG_PARTNER_ASSET_*` nodes
  - the graph database `comarchoptimapartnertechnical` grew from `7887` to `21284` total nodes during that batch
  - the build runner session finally exited successfully after `job 134` reached `FINISH`

## General Optima Reference KB

### Purpose

- KB name: `Comarch Optima Reference`
- Namespace: `ComarchOptimaReference`
- Project id: `8`
- Scope:
  - official Comarch ERP Optima help structure from `pomoc.comarch.pl`
  - official categories, module entry points, update streams, onboarding paths, and operational entry articles
  - explicit routing into `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, and `ComarchOptimaSprint`
  - selected local printable-page snapshots for retrieval
- Do not ingest live business rows or sensitive operational data.

### Active local source files

- Schema: `docs/reference/ComarchOptimaReference.schema`
- Seed plan: `docs/reference/ComarchOptimaReference.seed.md`
- Schema audit: `docs/reference/ComarchOptimaReference.schema_audit.md`
- Export script: `scripts/export_optima_reference.mjs`
- Build script: `scripts/build_optima_reference.mjs`
- Staging directory: `exports/optima_reference/v1/`
- Official snapshot root: `downloads/official/optima_reference/`
- Corpus coverage audit: `docs/reference/ComarchOptimaKB_CorpusCoverageAudit.md`

### Current General Reference export set

- `reference_document.csv` - `3364`
- `help_category.csv` - `466`
- `module_area.csv` - `10`
- `version_topic.csv` - `95`
- `learning_guide.csv` - `12`
- `knowledge_route.csv` - `6`
- `entry_guide.csv` - `12`
- `chunk.csv` - `361`

### Current General Reference execution history

- Job `101` - `ReferenceDocument` - `FINISH`
- Job `102` - `HelpCategory` - `FINISH`
- Job `103` - `ModuleArea` - `FINISH`
- Job `104` - `VersionTopic` - `FINISH`
- Job `105` - `LearningGuide` - `FINISH`
- Job `106` - `KnowledgeRoute` - `FINISH`
- Job `107` - `Chunk` - `FINISH`
- Job `108` - `ReferenceDocument` refresh - `FINISH`
- Job `109` - `LearningGuide` refresh - `FINISH`
- Job `110` - `KnowledgeRoute` refresh - `FINISH`
- Job `111` - `Chunk` refresh - `FINISH`
- Job `112` - `EntryGuide` - `FINISH`

Execution artifacts:

- `exports/optima_reference/v1/_manifest.json`
- `exports/optima_reference/v1/upload_optima_reference_manifest.json`
- `exports/optima_reference/v1/build_optima_reference_jobs_manifest.json`
- `exports/optima_reference/v1/README.md`

### Current General Reference implementation notes

- The local source snapshot currently contains:
  - `3` official sitemap files
  - `27` printable-page HTML snapshots
- The best structured source for this KB turned out to be the WordPress `ht_kb` sitemap layer, not the printable table of contents itself.
- The exporter intentionally combines:
  - wide official article coverage from the `ht_kb` sitemaps
  - a narrower retrieval-oriented layer from selected printable-page snapshots
- `EntryGuide` is the curated first-stop layer for this KB. It is meant to route users by intent into the right official articles and, when useful, onward into `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, or `ComarchOptimaSprint`.
- Creating project `8` again confirmed the minimal `POST /v1/projects` contract already used by the other KBs:
  - `name`
  - `namespace`
  - `description`
  - `visibility`
  - `tag`
  - `config.vectorizer.modelId`
- Project `8` uses the public embedding model:
  - `b87d551d4ba14909907c6e29218fa011@text-embedding-3-small`
- `KnowledgeRoute` is the practical bridge layer that routes users from the official-doc KB into:
  - `ComarchOptimaSchema`
  - `ComarchOptimaAdditionalFunctions`
  - `ComarchOptimaSprint`
- The first pass includes many broad official articles from the sitemap layer, including highly specific FAQ and troubleshooting pages. This is acceptable for coverage. If later retrieval becomes noisy, add a curated helper layer instead of shrinking the official corpus blindly.
- A later enrichment pass used additional official pages explicitly discovered through web search on `pomoc.comarch.pl`, including:
  - `automatyczne-aktualizacje-programu`
  - `szkolenia-e_learningowe`
  - `internetowa-wymiana-dokumentow`
  - `opt074-dodawanie-kolumn-uzytkownika-na-listach`
  - `opt057-strojenie-wydajnosciowe-baz-ms-sql-dla-comarch-erp-optima`
  - `aktualizacje-po-wydaniu-wersji-36`
  - `aktualizacje-po-wydaniu-wersji-37`
  - `instalacja-i-reinstalacja-systemu-49`
- That enrichment widened:
  - `ReferenceDocument` from `3361` to `3364`
  - `LearningGuide` from `8` to `12`
  - `KnowledgeRoute` from `5` to `6`
  - `Chunk` from `240` to `361`

### Active local source files

- Schema: `docs/reference/ComarchOptimaSchema.schema`
- Metadata export templates: `docs/reference/ComarchOptimaSchema.extract_metadata.sql`
- Metadata export script: `scripts/export_optima_schema_metadata.mjs`
- Metadata build script: `scripts/build_optima_schema_metadata.mjs`
- Schema push helper: `scripts/push_openspg_schema.mjs`
- Staging directory: `exports/optima_schema/v1/`

### Current metadata export set

The active schema-only export contains:

- `database_instance.csv` - `2`
- `table.csv` - `634`
- `column.csv` - `12426`
- `primary_key.csv` - `618`
- `foreign_key.csv` - `609`
- `index.csv` - `1966`
- `constraint.csv` - `2414`
- `view.csv` - `49`
- `stored_procedure.csv` - `1367`
- `function.csv` - `743`
- `trigger.csv` - `449`
- `parameter.csv` - `11702`
- `object_dependency.csv` - `14113`
- `schema_change.csv` - `936`
- `chunk.csv` - `13118`
- `table_query_guide.csv` - `634`
- `join_path_guide.csv` - `609`
- `sql_object_guide.csv` - `2608`

Important source facts for this Optima instance:

- `VIEW DEFINITION` is now granted on:
  - `CDN_TEST`
  - `CDN_KNF_Konfiguracja`
- Full definitions are now available from:
  - views
  - stored procedures
  - functions
  - triggers
  - check/default constraints
  - computed columns
- `OBJECTPROPERTYEX(..., 'IsEncrypted')` remains `0` for sampled functions, views, triggers, and procedures.
- The current dependency layer is still conservative and uses exported metadata/object references rather than full procedure-to-table relation materialization.

### Current schema-only execution history

The active schema KB was rebuilt from scratch after removing project `3` and creating project `4`.

Confirmed builder jobs for `ComarchOptimaSchema`:

- Job `29` - `ComarchOptimaSchema DatabaseInstance CSV Import` - `FINISH`
- Job `30` - `ComarchOptimaSchema Table CSV Import` - `FINISH`
- Job `31` - `ComarchOptimaSchema Column CSV Import` - `FINISH`
- Job `32` - `ComarchOptimaSchema PrimaryKey CSV Import` - `FINISH`
- Job `33` - `ComarchOptimaSchema ForeignKey CSV Import` - `FINISH`
- Job `34` - `ComarchOptimaSchema Index CSV Import` - `FINISH`
- Job `35` - `ComarchOptimaSchema Constraint CSV Import` - `FINISH`
- Job `36` - `ComarchOptimaSchema View CSV Import` - `FINISH`
- Job `37` - `ComarchOptimaSchema Function CSV Import` - `FINISH`
- Job `38` - `ComarchOptimaSchema Trigger CSV Import` - `FINISH`
- Job `39` - `ComarchOptimaSchema Parameter CSV Import` - `FINISH`
- Job `40` - `ComarchOptimaSchema ObjectDependency CSV Import` - `FINISH`
- Job `41` - `ComarchOptimaSchema SchemaChange CSV Import` - `FINISH`
- Job `42` - `ComarchOptimaSchema Chunk CSV Import` - `FINISH`
- Job `43` - `ComarchOptimaSchema Column CSV Import` - `FINISH`
- Job `44` - `ComarchOptimaSchema Constraint CSV Import` - `FINISH`
- Job `45` - `ComarchOptimaSchema View CSV Import` - `FINISH`
- Job `46` - `ComarchOptimaSchema Function CSV Import` - `FINISH`
- Job `47` - `ComarchOptimaSchema Trigger CSV Import` - `FINISH`
- Job `52` - `ComarchOptimaSchema View CSV Import` - `FINISH`
- Job `53` - `ComarchOptimaSchema StoredProcedure CSV Import` - `FINISH`
- Job `54` - `ComarchOptimaSchema Function CSV Import` - `FINISH`
- Job `55` - `ComarchOptimaSchema Trigger CSV Import` - `FINISH`
- Job `56` - `ComarchOptimaSchema Parameter CSV Import` - `FINISH`
- Job `57` - `ComarchOptimaSchema ObjectDependency CSV Import` - `FINISH`
- Job `58` - `ComarchOptimaSchema TableQueryGuide CSV Import` - `FINISH`
- Job `59` - `ComarchOptimaSchema JoinPathGuide CSV Import` - `FINISH`
- Job `60` - `ComarchOptimaSchema SqlObjectGuide CSV Import` - `FINISH`
- Job `61` - `ComarchOptimaSchema ObjectDependency CSV Import` - `FINISH`
- Job `62` - `ComarchOptimaSchema SqlObjectGuide CSV Import` - `FINISH`

Execution artifacts:

- `exports/optima_schema/v1/_manifest.json`
- `exports/optima_schema/v1/upload_schema_metadata_manifest.json`
- `exports/optima_schema/v1/build_schema_metadata_jobs_manifest.json`

### Current builder-script behavior

- `scripts/build_optima_schema_metadata.mjs` now supports resume/checkpoint behavior.
- It writes upload/build manifests incrementally after each file.
- It can reuse already finished builder jobs from OpenSPG instead of replaying finished slices.
- It skips empty CSV slices automatically.
- It now also supports forced refresh for selected files through:
  - `OPENSPG_FORCE_FILES=column.csv,constraint.csv,...`
- `scripts/export_optima_schema_metadata.mjs` now also supports:
  - `OPENSPG_HELPER_ONLY=1`
- This helper-only mode regenerates only:
  - `table_query_guide.csv`
  - `join_path_guide.csv`
  - `object_dependency.csv`
  - `sql_object_guide.csv`
  - `_manifest.json`
- Use helper-only mode when tuning the query-design layer without replaying the full MSSQL catalog export.

### Current schema-only audit/tuning layer

- `Column` now carries:
  - `defaultDefinitionAccessState`
  - `computedDefinition`
  - `computedDefinitionAccessState`
- `Constraint` now carries:
  - `definitionAccessState`
- `View`, `StoredProcedure`, `Function`, and `Trigger` now carry:
  - `definitionAccessState`
  - `isEncrypted`
  - `usesAnsiNulls`
  - `usesQuotedIdentifier`
  - `isSchemaBound`
- Latest safe code-object tuning:
  - full `definition` is kept as plain text
  - `definitionPreview` is the vectorized/search preview
  - `definitionHash` is SHA-256 over full definition text
  - `definitionLength` is the full definition length
- Reason:
  - the first full-body procedure import (`job 51`) stalled in `RUNNING`
  - server logs showed `kag.common.vectorize_model.openai_model` errors on very large stored procedure bodies
  - cancelling `job 51` and moving vectorization to `definitionPreview` fixed the issue
- The safe code-object refresh was deployed into project `4` and completed through jobs `52`-`57`.

### Current schema-only dependency behavior

- `docs/reference/ComarchOptimaSchema.extract_metadata.sql` now emits `object_dependency.csv`.
- The original metadata-only slice contained `365` dependencies.
- The active enriched slice now contains `14113` dependencies.
- Dependency type breakdown in the current enriched slice:
  - `SQL_READ`: `6809`
  - `SQL_WRITE`: `1521`
  - `EXEC_CALL`: `955`
  - `FUNCTION_CALL`: `931`
  - `HEURISTIC_SQL_TEXT_MATCH`: `3448`
  - `TRIGGER_PARENT_TABLE`: `449`
- This slice is still metadata-only and safe for the schema KB.
- The enriched layer is built from extracted object definitions and does not use business row data.

### Current schema-only documentation layer

- `schema_change.csv` is built from the local Optima `2026.4.1` schema change documentation.
- In the current verified build this slice contains `936` rows.
- `chunk.csv` is built from the local Optima structure and change-history markdown sources.
- In the current verified build this slice contains `13118` rows.
- Chunk source inference currently links recognizable Optima object names to schema object ids where possible, using:
  - `F_*` -> `CDN_TEST:TABLE:CDN.<name>`
  - `K_*` -> `CDN_KNF_Konfiguracja:TABLE:CDN.<name>`
- The section title `Wersja 2026.4:` is intentionally skipped during chunk expansion to avoid oversized duplicate documentation chunks.

### Current schema-only query-design helper layer

- `TableQueryGuide` is now loaded for all `634` tables.
- `JoinPathGuide` is now loaded for all `609` direct foreign keys.
- `SqlObjectGuide` is now loaded for `2608` SQL objects:
  - stored procedures
  - functions
  - views
  - triggers
- Purpose of the helper layer:
  - classify tables for query design
  - expose ready-to-use FK join templates
  - tag SQL objects relevant to Sprint prints, reporting, import/export, compliance, and special-function work
- `TableQueryGuide` carries:
  - `roleHint`
  - `businessAreaHint`
  - `joinAnchorColumns`
  - `relatedTableSummary`
  - `queryDesignNote`
- `JoinPathGuide` carries:
  - `joinSqlTemplate`
  - `viaForeignKeyRefId`
  - `confidence`
  - `useCase`
- `SqlObjectGuide` carries:
  - `usageCategory`
  - `moduleHint`
  - `importanceHint`

### Latest helper-layer tuning

- The helper export was tuned to reduce false positives from short table prefixes such as:
  - `Pod`
  - `Det`
  - `Aut`
  - `Dan`
- Exact table overrides are now applied for key Optima tables, including:
  - `TraNag`
  - `TraElem`
  - `Towary`
  - `Kontrahenci`
  - `PodmiotyView`
  - `BnkZdarzenia`
  - `PracEtaty`
  - `PracKod`
  - `TypWyplata`
  - `TypNieobec`
  - `DaneKadMod`
  - `Kalendarze`
  - `Dzialy`
  - `ZestawyRegul`
  - `PodArkuszInwenNag`
  - `PodArkuszInwenElem`
  - `CfgKlucze`
  - `CfgWartosci`
  - `VatNag`
  - `VatTab`
- Configuration-prefixed tables such as `Cfg*` are now classified as `CONFIGURATION_ADMIN` before generic HR/organization heuristics are applied.
- `JoinPathGuide` staging now contains `621` rows:
  - `609` direct FK routes
  - `12` curated Optima business routes
- The curated routes currently cover:
  - trade header -> lines
  - trade line -> product
  - trade header -> document definition
  - trade header -> buyer
  - trade header -> payer
  - trade header -> products via lines
  - bank event -> business party
  - bank event -> document definition
  - VAT header -> VAT lines
  - employment -> employee/person
  - company config value -> config key
  - global config value -> config key
- Verified staged examples after this tuning:
  - `CDN.PodArkuszInwenNag` -> `HEADER / PRODUCTS_WAREHOUSE`
  - `CDN.PodArkuszInwenElem` -> `LINE / PRODUCTS_WAREHOUSE`
  - `CDN.TypWyplata` -> `DICTIONARY / HR_PAYROLL`
  - `CDN.DaneKadMod` -> `MASTER / HR_PAYROLL`
  - `CDN.VatTab` -> `LINE / COMPLIANCE_ACCOUNTING`
  - `CDN.CfgWartosci` -> `CONFIG / CONFIGURATION_ADMIN`
  - `CDN.CfgKlucze` -> `DICTIONARY / CONFIGURATION_ADMIN`

### Current helper refresh attempt

- Helper-only export was regenerated after the latest tuning.
- The current staging manifest reports:
  - `table_query_guide.csv` -> `634`
  - `join_path_guide.csv` -> `621`
  - `object_dependency.csv` -> `10780`
  - `sql_object_guide.csv` -> `2608`
- Refresh builder jobs:
  - Job `63` - `ComarchOptimaSchema TableQueryGuide CSV Import` - `FINISH`
  - Job `64` - `ComarchOptimaSchema JoinPathGuide CSV Import` - `FINISH`
  - Job `65` - `ComarchOptimaSchema ObjectDependency CSV Import` - `FINISH`
  - Job `66` - `ComarchOptimaSchema SqlObjectGuide CSV Import` - `FINISH`
  - `detectionEvidence`
  - `queryDesignNote`
- `SqlObjectGuide` now also summarizes, where detected:
  - tables/views read by the object
  - tables/views written by the object
  - procedures executed by the object
  - functions called by the object

## Confirmed platform behavior

### Schema behavior

- `POST /v1/schemas` works for replacing schema script content for:
  - entity types
  - concept types
  - properties
- Custom relation lines accepted by the schema script are not materialized in:
  - `GET /v1/schemas/getSchemaScript`
  - `GET /v1/schemas/graph/{projectId}`
- Because of that:
  - deployed source-of-truth for the active schema-only KB stays in `ComarchOptimaSchema.schema`
  - FK semantics should be materialized first as explicit reference properties on entities

### Datasource and ingestion behavior

- This OpenSPG build exposes datasource types `ODPS` and `SLS`.
- `Settings -> Data Source` is therefore limited to those datasource families on this instance.
- Direct API verification on `2026-05-24` returned `0` configured datasources from `POST /public/v1/datasource/search`.
- There is no MSSQL datasource connector in the current instance.
- Practical ingestion path for MSSQL-backed KBs in this workspace is:
  - `MSSQL export -> CSV -> uploadFile -> builder/job/submit`
- For the active schema-only KB, the export source is limited to SQL Server catalog metadata from:
  - `CDN_TEST`
  - `CDN_KNF_Konfiguracja`
- Upload endpoint is confirmed working:
  - `POST /public/v1/reasoner/dialog/uploadFile`

### Builder job behavior

- Builder job submit endpoint is confirmed working:
  - `POST /public/v1/builder/job/submit`
- Builder job detail endpoint is confirmed working:
  - `GET /public/v1/builder/job/get?id={jobId}`
- Builder job list endpoint works only with:
  - `start=1`
  - `limit={n}`
- `start=0` causes a backend SQL bug producing negative offset.

### Auth / cookie file permissions

- `scripts/openspg_login.mjs` always writes the refreshed session cookie to
  `/etc/erp-kb-openspg.cookie` with mode `0600` (owner-only), hardcoded at
  `scripts/openspg_login.mjs:83` — this has been true since the script was
  first added and does not depend on who runs it.
- The dashboard server (`scripts/erp_kb_dashboard_server.mjs`) runs as OS user
  `mcpbot`, not root. Its approve/build preflight check
  (`openspg_cookie_file`) and the build runners (`scripts/build_kb_runner.mjs`
  via `readOpenSpgCookie()`) need to *read* this same file.
- Consequence: if `openspg_login.mjs` is ever run as `root` (e.g. manually,
  or via a root cron job) without a follow-up permission fix, the cookie file
  ends up `root:root 0600` and every dashboard approve/build action fails
  preflight with `EACCES: permission denied, access '/etc/erp-kb-openspg.cookie'`
  — even though the login itself succeeded and the cookie is valid.
- Fix after any manual/root login refresh: `chmod 644 /etc/erp-kb-openspg.cookie`
  (world-readable is intentional here — this is a short-lived session cookie,
  not the account password; `/etc/erp-kb-openspg-login.env`, which does hold
  the real credentials, stays `0600` and is never read by the dashboard).
- First observed and fixed 2026-07-31, after a manual `openspg_login.mjs` run
  (done to force-refresh the KB build for `TaxbellPayrollHRReference`) broke
  approve/build preflight for an unrelated draft in
  `TaxbellAccountingVATReference`.

### Host memory / OOM incident (2026-08-03 — 2026-08-04)

- The Proxmox VM hosting this stack ran with only **11 GB RAM + 4 GB swap**,
  while `compose.yaml` `mem_limit` values summed to **21 GB** across
  `mysql` (2g) + `neo4j` (10g) + `minio` (1g) + `tika` (2g) + `server` (6g) —
  a large overcommit with no relation to actual usage (mysql/minio/tika were
  each using well under 20% of their limit; the real consumers were `neo4j`
  (heap 4G + pagecache 2G, ~3.6-3.9 GiB RSS) and `server` (Xmx 4096m,
  ~2.5 GiB RSS).
- Confirmed via `journalctl -k` that the Linux **global** OOM killer
  (`constraint=CONSTRAINT_NONE`, i.e. host-wide memory exhaustion, not a
  per-container cgroup limit hit) killed the `server` or `neo4j` Java
  process roughly **once a day each**, alternating, from at least
  2026-07-31 through 2026-08-04.
- This was the root cause of two separate-looking symptoms that are actually
  the same issue:
  - `Official_Reference_Delta_Refresh_Report` (`ComarchOptimaReference` /
    `ComarchBetterflyReference`) failing its build step with
    `TypeError: fetch failed ... ECONNREFUSED 10.10.254.42:8887` — the
    `server` container had just been OOM-killed and was mid-restart when the
    cron-driven refresh hit it.
  - Builder jobs for `ComarchOptimaReference` (`CORF Chunk CSV Import`)
    permanently stuck in `RUNNING`/`INIT` (job ids 553, 575, 384) for days —
    the worker thread died with the OOM-killed process and OpenSPG has no
    reconciliation step to mark an orphaned job `FAILED` after a restart.
    These stuck jobs were never resolved/cancelled, just superseded by the
    fix below; if `build_optima_reference.mjs`'s job-resume-by-name logic
    ever appears to skip work it shouldn't, check `GET
    /public/v1/builder/job/list?projectId=8&start=1&limit=N` for stuck
    non-FINISH jobs with the same name first.
- **Fix applied 2026-08-04**: host RAM was raised in Proxmox (guest-visible
  min/max target 16/24 GB) and the VM was rebooted. Guest now sees
  **~19-20 GB RAM**, swap dropped from >99% full to fully free. Both
  OpenSPG (`docker compose -f /docker/openspg/compose.yaml`) and n8n
  (`docker compose -f /docker/n8n/compose.yaml`) stacks were stopped
  gracefully (`compose stop`, not `down`, so `restart: always` containers
  would come back automatically) before the reboot.
- **Gotcha found during recovery**: `openspg-tika` and the entire n8n stack
  (`n8n`, `n8n-postgres`, `n8n-redis`) use `restart: unless-stopped`, not
  `always`. Because they were manually `compose stop`'d before the reboot,
  Docker treated that as an intentional stop and did **not** auto-start
  them after the host came back — unlike `mysql`/`neo4j`/`minio`/`server`
  (all `restart: always`), which did auto-start. Had to bring them up
  manually with `docker compose up -d` on both stacks post-reboot.
- **Not yet applied** (proposed but deferred): right-sizing the
  `compose.yaml` `mem_limit` values themselves (e.g. `mysql` 2g→1g, `tika`
  2g→768m, `minio` 1g→512m, `neo4j` heap 4G→3G / pagecache 2G→1.5G /
  `mem_limit` 10g→6g, `server` `mem_limit` 6g→5g) and doubling host swap to
  8 GB. The RAM increase + reboot resolved the immediate crisis, but if OOM
  kills recur, this tuning is the next lever — check `journalctl -k | grep
  -i oom` and `free -h` first to confirm the same pattern before reapplying.
- **Stuck jobs 553/575/384 confirmed harmless, no fix needed/possible**:
  decompiled the live server jar (`docker exec release-openspg-server`, jar
  at `/arks-sofaboot-0.0.1-SNAPSHOT-executable.jar` →
  `BOOT-INF/lib/com.antgroup.openspgapp-api-http-server-*.jar` →
  `com/antgroup/openspgapp/api/http/server/builder/BuilderJobController.class`)
  and confirmed the builder job REST API only exposes `getById`, `list`,
  `submit` — **no cancel/delete/abort/update endpoint exists**, so these
  orphaned rows cannot be cleared via the API (and shouldn't be edited
  directly in MySQL). This turns out not to matter:
  `scripts/build_kb_runner.mjs` (`isReusableActiveJob`, ~line 391) only
  treats an `INIT`/`WAITING`/`RUNNING` job as reusable if its age is
  `<= OPENSPG_ACTIVE_JOB_MAX_AGE_MINUTES` (default **60 minutes**). Jobs
  553/575/384 are days-to-weeks old, so any future build for this KB will
  log `Skipping stale builder job {id} ({status})...` and submit a fresh
  job rather than waiting on them. No action needed; leave them as-is.

## Reconstructed FILE_EXTRACT contract

The current UI task editor submits structured CSV imports as:

- `type: FILE_EXTRACT`
- `dataSourceType: CSV`
- `lifeCycle: ONCE`
- `action: UPSERT`

The important request fields are:

1. Top-level:
   - `projectId`
   - `createUser`
   - `jobName`
   - `type`
   - `dataSourceType`
   - `fileUrl`
   - `lifeCycle`
   - `action`

2. `extension` JSON string containing:
   - `dataSourceConfig`
     - `columns`: array of `{name,index}` from CSV header
     - `type: "UPLOAD"`
     - `fileName`
     - `fileUrl`
     - `ignoreHeader: true`
     - `structure: true`
   - `mappingConfig`
     - `mappingType: "entityMapping"`
     - `filter`: target entity metadata
     - `config[0].mapping`: property-to-column mapping

### Mapping notes

- Required mapping for entity import includes `id`.
- CSV header parsing used by UI yields source columns as:
  - `{name:"column_name", index:<0-based>}`
- Property mapping that was confirmed working in this instance used:
  - `"propertyName": ["csvColumnName"]`
- The current stable workaround for missing writable relation types is:
  - export FK-backed target entity ids as explicit `...RefId` properties
  - upsert them through ordinary entity CSV imports
- A second stable rule for this workspace:
  - never assume source numeric ids are globally unique across semantic slices
  - verify uniqueness before choosing the exported entity `id`

## Reusable next-step pattern for later KBs

When creating another KB in this workspace, follow this order:

1. Create or confirm KB/project.
2. Replace default schema with local domain schema.
3. Verify schema graph behavior before depending on custom relations.
4. Export source data from MSSQL to CSV.
5. Upload CSV through `uploadFile`.
6. Submit minimal `FILE_EXTRACT` builder jobs for the first entity slice.
7. Verify:
   - builder job status
   - direct graph write in Neo4j
8. Only then expand to:
   - larger entity batches
   - FK reference refresh batches when relation types are unavailable
   - app-layer workflows

Build runner operator runbook:

- `docs/reference/Build_Runner_Profiles.md` documents unified profile-based builds via `scripts/build_kb_runner.mjs`, thin `build_*.mjs` shims, Taxbell namespace/project mapping, and `OPENSPG_FORCE_FILES` usage.

## Optima manual exports: shared Wydruk model

On `2026-06-01`, direct Optima exports supplied by the user were integrated as
first-class sources:

- `downloads/google_drive/manual_exports/export_fd.xml`
- `downloads/google_drive/manual_exports/export_wydruki.xml`

The supporting parser is:

- `scripts/lib/optima_manual_exports.mjs`

It uses a tolerant line-oriented approach instead of a strict XML parser,
because embedded definition bodies in the exports are not fully strict-XML safe.

Current confirmed findings:

- print definitions and Additional Functions share the same broad `Wydruk`
  configuration model
- the main family discriminator is the tuple:
  - `WDR_RODZAJ`
  - `WDR_TYP`
  - `WDR_PODTYP`
- `WDR_KOMPRESJA` is a real, operational signal

Direct family evidence recorded in
`docs/reference/Optima_Wydruki_FD_TypeFamily_Map_2026-06-01.md` currently
supports:

- `2/12/0` as the primary Additional Functions family
- `2/11/0` as an adjacent export/integration function family
- `1/4/0` as a confirmed sPrint-oriented family
- `1/3/0` as a confirmed GenRap family
- `1/2/2` as a mixed structured-report family with strong Sprint signal
- `1/2/3` as a likely Word/XML family
- `1/2/1` as a likely text-printer family
- `1/6/0` as a declaration/form family
- `1/1/0` as a large generic/legacy print family

### Compression reverse engineering status

Multiple attempts were made to recover compressed `WDR_DEFINICJA` payloads from:

- manual export XML content
- direct SQL reads from `CDN_KNF_Konfiguracja.CDN.Wydruki`

including direct byte extraction through:

- `CAST(CAST(Wdr_Definicja AS varchar(max)) AS image)`

and standard zlib-based decompression attempts.

Current conclusion:

- compressed bodies are confirmed to exist
- SQL-side procedures do not implement the decompression logic
- naive zlib recovery from the current export/SQL paths is not sufficient
- the remaining transform likely lives in the Optima application layer or an
  export-layer encoding step

Operational rule for now:

- trust readable non-compressed definitions
- use compressed rows as metadata-bearing evidence
- do not claim full definition coverage for compressed families yet

### KB refreshes driven by manual exports

`ComarchOptimaAdditionalFunctions` was widened with direct manual-export
definitions and refreshed successfully as:

- `196` `ReferenceDocument` -> `FINISH`
- `197` `FileArtifact` -> `FINISH`
- `198` `ImplementationExample` -> `FINISH`
- `199` `Chunk` -> `FINISH`

Current widened staging now includes:

- `reference_document.csv` -> `158`
- `file_artifact.csv` -> `58`
- `implementation_example.csv` -> `178`
- `chunk.csv` -> `185`

`ComarchOptimaSprint` was widened with direct manual-export print definitions
and refreshed successfully as:

- `200` `ReferenceDocument` -> `FINISH`
- `201` `FileArtifact` -> `FINISH`
- `202` `SqlPattern` -> `FINISH`
- `203` `Chunk` -> `FINISH`

Current widened staging now includes:

- `reference_document.csv` -> `167`
- `file_artifact.csv` -> `11`
- `sql_pattern.csv` -> `15`
- `chunk.csv` -> `290`

## ERP Knowledge Assistant planning layer

On `2026-06-01`, the project moved from raw KB expansion to a concrete
assistant-layer design.

The current source-of-truth artifacts are:

- `docs/reference/ERP_Knowledge_Assistant_Blueprint.md`
- `docs/reference/ERP_Knowledge_Assistant_Routing.json`

Current design choice:

- do not build another KB for this
- treat it as a routing and answering layer over the existing KB set

Primary target KBs:

- `ComarchOptimaSchema`
- `ComarchOptimaAdditionalFunctions`
- `ComarchOptimaSprint`
- `ComarchOptimaReference`
- `ComarchOptimaPartnerTechnical`
- `ComarchBetterflyReference`

Current recommended first implementation:

- rule-based intent routing
- one primary KB per question
- optional one or two support KBs
- explicit answer contract with:
  - direct answer
  - primary KB
  - support KBs
  - relevant artifacts
  - gap or next step

The first operational implementation now exists as:

- `scripts/erp_knowledge_assistant.mjs`

Supporting operator docs:

- `docs/reference/ERP_Knowledge_Assistant_Runbook.md`

Current behavior:

- reads `docs/reference/ERP_Knowledge_Assistant_Routing.json`
- classifies a question locally
- returns:
  - primary KB
  - support KBs
  - matched intent/keywords
  - recommended artifacts to inspect first

Current rule:

- this assistant layer is a router, not a second retrieval engine
- do not make it search every KB blindly before routing

The first pragmatic answer layer now also exists as:

- `scripts/erp_knowledge_answer.mjs`

Current behavior:

- reuses the same routing layer from `scripts/erp_knowledge_assistant.mjs`
- extracts simple question terms
- scans starter artifacts from the selected primary/support KBs
- returns evidence snippets as a first practical answer

Current scope:

- local artifact scan only
- no direct OpenSPG retrieval
- intended for fast operator use before a richer app/MCP integration exists

The current repeatable large-sample validation layer now also exists as:

- `scripts/run_erp_knowledge_testpack.mjs`
- `docs/reference/ERP_Knowledge_Assistant_100Q_TestPack.json`
- `docs/reference/ERP_Knowledge_Assistant_100Q_Report.md`

Current 100-question result on `2026-06-01`:

- `PASS` -> `98`
- `PARTIAL` -> `2`
- `MISS` -> `0`

Category-level result:

- `schema` -> `25/25 PASS`
- `additional_functions` -> `19 PASS`, `1 PARTIAL`
- `sprint` -> `15/15 PASS`
- `reference` -> `9 PASS`, `1 PARTIAL`
- `partner` -> `15/15 PASS`
- `betterfly` -> `15/15 PASS`

The two remaining `PARTIAL` cases are acceptable boundary cases rather than hard
misses:

- `ComarchOptimaAdditionalFunctions` vs `ComarchOptimaSprint` for COM examples
  in print/reporting context
- `ComarchOptimaReference` vs `ComarchOptimaAdditionalFunctions` for official
  information on user columns

The same harness was then expanded to a larger `200`-question sample through:

- `scripts/run_erp_knowledge_testpack.mjs --size 200`
- `docs/reference/ERP_Knowledge_Assistant_200Q_TestPack.json`
- `docs/reference/ERP_Knowledge_Assistant_200Q_Report.md`

Current final 200-question result on `2026-06-01` after routing and evidence
polish:

- `PASS` -> `200`
- `PARTIAL` -> `0`
- `MISS` -> `0`

Category-level result:

- `schema` -> `50/50 PASS`
- `additional_functions` -> `40/40 PASS`
- `sprint` -> `30/30 PASS`
- `reference` -> `20/20 PASS`
- `partner` -> `30/30 PASS`
- `betterfly` -> `30/30 PASS`

Interpretation:

- the assistant layer is now internally consistent on the current synthetic
  benchmark corpus
- remaining future tuning should now be driven by real operator questions, not
  more synthetic benchmark expansion
- the first title-level public-community sanity check now lives in
  `docs/reference/ERP_Knowledge_Assistant_Community_Questions_Report.md`; it
  confirms a sane conservative pattern on real `spolecznosc.comarch.pl`
  question titles:
  - vague operational Optima titles -> `ComarchOptimaReference`
  - KSeF technical titles -> `ComarchOptimaPartnerTechnical`
  - structural/compliance titles -> `ComarchOptimaSchema`
  This is intentionally a title-only pass, not a full-thread evaluation.
- the stronger public-community full-thread validation now lives in
  `docs/reference/ERP_Knowledge_Assistant_Community_FullThread_Report.md`
  and currently records `8/8 PASS` on real public thread bodies
  (collected through headless Chromium because raw HTTP fetch only returned the
  JS shell/loader)
- that full-thread pass exposed and fixed an important routing defect in
  `scripts/erp_knowledge_assistant.mjs`: short tokens such as `com` must be
  matched as bounded tokens, otherwise `Comarch` pollutes routing and pushes
  ordinary Optima questions into `ComarchOptimaAdditionalFunctions`
- the repeatable runner for this stronger benchmark is now
  `scripts/run_community_thread_test.mjs`
- its output artifacts are:
  - `docs/reference/ERP_Knowledge_Assistant_Community_FullThread_TestPack.json`
  - `docs/reference/ERP_Knowledge_Assistant_Community_FullThread_TestPack.md`
- the deployment-ready OpenSPG-side application pack now exists locally as:
  - `docs/reference/ERP_Knowledge_Assistant_OpenSPG_App_Prompt.md`
  - `docs/reference/ERP_Knowledge_Assistant_OpenSPG_App_Spec.md`
  - `docs/reference/ERP_Knowledge_Assistant_OpenSPG_App_Bundle.json`
- authenticated OpenSPG app publication is now confirmed on this instance
  through real UI-driven validation with a fresh session cookie
- confirmed app endpoints from authenticated `/v3/api-docs`:
  - `POST /v1/app`
  - `PUT /v1/app/{appid}`
  - `POST /v1/app/deploy`
  - `GET /v1/app/{appid}`
  - `GET /v1/app/list`
- the OpenAPI payload for `/v3/api-docs` is returned as a JSON array of byte
  values; decode it with `Buffer.from(raw).toString('utf8')` before parsing
- the route is hash-based SPA routing; use `/#/application` and
  `/#/application/detail/arrange?appid={id}` instead of `/application`
- the first real published app is now:
  - name: `ERP Knowledge Assistant`
  - app id: `2`
  - alias: `erpknowledgeassistant`
  - description: `Single-entry assistant across Optima and Betterfly knowledge bases.`
- confirmed create payload shape:
  - `POST /v1/app`
  - body:
    - `name`
    - `description`
    - `logo`
    - `alias`
- confirmed KB attachment/update payload shape:
  - `PUT /v1/app/2`
  - body preserves app metadata and carries:
    - `config.llm`
    - `config.language`
    - `config.kb` as array of `{ id, name, enable }`
    - optional `config.chat` when an application template is selected
- confirmed deploy payload shape:
  - `POST /v1/app/deploy`
  - body: `{ "id": 2 }`
- the published app currently references all seven active KBs:
  - project `4` `Comarch Optima ERP MSSQL Schema`
  - project `15` `Comarch Optima Business Semantics`
  - project `6` `Comarch Optima Additional Functions`
  - project `7` `Comarch Optima Sprint and Prints`
  - project `8` `Comarch Optima Reference`
  - project `9` `Comarch Optima Partner Technical`
  - project `10` `Comarch Betterfly Reference`
- the first publication used template `kag_thinker_pipeline`, but that template
  is not stable in this build for the ERP assistant path
- on `2026-06-01`, live user testing exposed runtime failure:
  `No configuration setting found for key rewrite_prompt`
- root cause:
  - `APP_CHAT` exposes both `think_pipeline` (`id=2`) and
    `kag_thinker_pipeline` (`id=4`)
  - the installed backend pipeline file for `think_pipeline` defines
    `planner.rewrite_prompt`
  - the installed backend pipeline file for `kag_thinker_pipeline` does not
    define that field
  - this instance still expects `rewrite_prompt` on the active path used by the
    app, so `kag_thinker_pipeline` breaks at runtime for user questions
- corrective action completed live:
  - app `2` was switched to template `think_pipeline`
  - `PUT /v1/app/2` succeeded
  - `POST /v1/app/deploy` succeeded
  - `GET /v1/app/2` now returns `config.chat.ename = think_pipeline`
- on `2026-06-02`, a live benchmark of the published app was executed through
  the app-aware public reasoner flow using:
  - `POST /public/v1/reasoner/session/create`
  - `POST /public/v1/reasoner/task/submit`
  - `POST /public/v1/reasoner/dialog/submit`
  - `GET /public/v1/reasoner/dialog/query`
- the repeatable runner is:
  - `scripts/run_openspg_app_live_benchmark.mjs`
- saved outputs are:
  - `docs/reference/ERP_Knowledge_Assistant_OpenSPG_Live_Benchmark.json`
  - `docs/reference/ERP_Knowledge_Assistant_OpenSPG_Live_Benchmark.md`
- the first live sample used `12` benchmark questions across schema, additional
  functions, sprint, reference, partner, and betterfly categories
- result:
  - `12` `RUNNING_TIMEOUT`
  - `0` terminal `FINISH`
- server-side diagnosis from `/logs/openspgapp/completions.log`:
  - base reasoner tasks are started with `projectId=2`, i.e. the app id, not a
    real KB project id
  - backend then throws `IllegalArgumentException: 2 is not exists`
  - paired NL query tasks then throw `NullPointerException`
- representative failing pairs from the first live run:
  - `Q148`: base task `27`, dialog task `28`
  - `Q162`: base task `29`, dialog task `30`
  - `Q175`: base task `31`, dialog task `32`
  - `Q194`: base task `33`, dialog task `34`
- current state of app `2` should therefore be treated as:
  - published and deployable
  - template-fixed (`think_pipeline`)
  - but still not end-to-end usable for live question answering until the
    backend app-to-project resolution bug is fixed
- do not persist or echo the runtime app `accessToken` in repo files or user
  responses; treat it as sensitive runtime material
- the current OpenSPG build still has no verified persisted custom-prompt field
  for apps through the confirmed UI/API path; only `config.kb`,
  `config.language`, `config.llm`, and template-backed `config.chat` are
  confirmed
- the reproducible API-side deploy helper is now:
  - `scripts/deploy_erp_knowledge_openspg_app.mjs`
  It reuses app id `2` by default, preserves accepted live config fields,
  reattaches the six ERP KBs, and deploys the app without attempting to inject
  an unverified custom prompt field
- the MCP-side bridge now exists locally as:
  - `scripts/erp_knowledge_mcp_server.mjs`
  - `docs/reference/ERP_Knowledge_Assistant_MCP_Runbook.md`
- the MCP server has been smoke-tested for:
  - `initialize`
  - `tools/list`
  and currently exposes:
  - `route_question`
  - `answer_question`
  - `run_community_thread_test`
- on `2026-06-02`, the MCP bridge was also validated through real stdio framing
  with:
  - `initialize`
  - `tools/call -> answer_question` for Optima schema question
  - `tools/call -> answer_question` for Betterfly API question
  - `tools/call -> run_community_thread_test`
- the same day it was registered in local Codex MCP config as:
  - `erp-kb`
- registration command:
  - `codex mcp add erp-kb --env ROOT=/docker/openspg -- node /docker/openspg/scripts/erp_knowledge_mcp_server.mjs`
- verification:
  - `codex mcp list` now shows enabled servers:
    - `erp-kb`
    - `mssql`
- later the same day, an intranet-oriented HTTP bridge was added:
  - `scripts/erp_knowledge_mcp_http_bridge.mjs`
- implementation model:
  - shared MCP core in `scripts/lib/erp_knowledge_mcp_core.mjs`
  - stdio server reuses the same core
  - HTTP bridge exposes the same tools over:
    - `GET /health`
    - `GET /mcp` (SSE-capable endpoint)
    - `POST /mcp` (JSON-RPC request/response)
    - `GET /sse` (legacy Claude-compatible SSE alias)
    - `POST /sse` (legacy Claude-compatible JSON-RPC alias)
- configurable environment:
  - `ERP_KB_HTTP_HOST`
  - `ERP_KB_HTTP_PORT`
  - `ERP_KB_HTTP_PATH`
  - `ERP_KB_HTTP_TOKEN`
- local validation of the HTTP bridge succeeded for:
  - `/health`
  - `tools/list`
  - `tools/call -> answer_question`
- later compatibility validation also confirmed that `GET /sse` streams the
  expected SSE prelude for legacy Claude-style clients
- deployment samples now exist as:
  - `docs/reference/ERP_Knowledge_Assistant_MCP_HTTP_Bridge.systemd`
  - `docs/reference/ERP_Knowledge_Assistant_MCP_HTTP_Bridge.nginx.conf`
- the full intranet deployment checklist is now:
  - `docs/reference/ERP_Knowledge_Assistant_MCP_Intranet_Deployment.md`
- desktop/client configuration templates now live at:
  - `docs/reference/ERP_Knowledge_Assistant_MCP_Client_Configs.md`
- example bridge environment file:
  - `docs/reference/ERP_Knowledge_Assistant_MCP_HTTP_Bridge.env.example`
- repeatable HTTP smoke test:
- `scripts/test_erp_knowledge_mcp_http_bridge.mjs`
- host-side bridge preflight:
  - `scripts/preflight_erp_knowledge_mcp_http_bridge.mjs`
The stricter preflight has now also been executed successfully end to end on `2026-06-02`: it started the local bridge, verified `/health`, verified `tools/list`, and completed a real `answer_question` call over HTTP.
The MCP bridge also now exposes a safe write-side draft tool:
- `submit_knowledge_draft`
It writes to the local inbox under:
- `downloads/knowledge_inbox/`
The draft tool does not write into OpenSPG directly; it only creates local JSON/Markdown drafts for later promotion into a KB-specific export/build flow.
The first concrete intranet rollout profile is now prepared for:
- hostname `erp-kb.mcp.taxbell.local`
- same current host as `/docker/openspg`
- LAN-only exposure
- NPMplus reverse proxy
- bridge bind `127.0.0.1:3400`
- service account `mcpbot`
- bearer-token auth
Its concrete artifacts are:
- `docs/reference/ERP_Knowledge_Assistant_MCP_Taxbell.env.example`
- `docs/reference/ERP_Knowledge_Assistant_MCP_Taxbell.systemd`
- `docs/reference/ERP_Knowledge_Assistant_MCP_Taxbell_Rollout.md`
The host-side part of that rollout is now actually installed on `2026-06-02`:
- system user `mcpbot` created
- `/etc/erp-kb-mcp.env` installed
- `/etc/systemd/system/erp-kb-mcp.service` installed
- `erp-kb-mcp.service` enabled and running
- bridge initially verified on `127.0.0.1:3400`, then rebound for LAN access
  to `10.10.254.42:3400`
- runtime auth confirmed as `bearer`
The actual LAN-side proxy path is now confirmed:
- NPMplus runs on a different LAN host: `10.10.254.46`
- `erp-kb.mcp.taxbell.local` there is configured to forward to
  `http://10.10.254.42:3400`
The first live proxy test initially hung because UFW on `10.10.254.42` had
default `deny incoming` and no allow rule for port `3400`. The narrow fix that
made the NPMplus path work was:
- `sudo ufw allow from 10.10.254.46 to any port 3400 proto tcp`
After that rule, the full desktop-facing path was verified through NPMplus:
- `Host: erp-kb.mcp.taxbell.local` + `GET /health` -> `ok: true`
- `Host: erp-kb.mcp.taxbell.local` + `POST /mcp` `tools/list` -> valid tool set
- `Host: erp-kb.mcp.taxbell.local` + `POST /mcp` `tools/call -> answer_question`
  -> valid evidence-backed response
Treat the LAN-facing MCP path as live. Remaining rollout work is now only
desktop/client attachment and any proxy-side hardening on the NPMplus host.

## Dashboard Source Discovery - 2026-06-06

The desktop dashboard now has an automatic source-discovery layer covering all
10 registered KB namespaces.

Current implementation:

- profiles, policy, candidates, queries, runs, budgets, and partner routes:
  - `scripts/lib/dashboard_discovery.mjs`
- daily and weekly runner:
  - `scripts/run_dashboard_discovery.mjs`
- deterministic integration test:
  - `scripts/test_dashboard_discovery.mjs`
- operator UI:
  - `Sources / Refresh` in the React dashboard
- runbook and service templates:
  - `docs/reference/ERP_KB_Dashboard_Runbook.md`
  - `docs/reference/ERP_KB_Dashboard_Discovery_Daily.systemd`
  - `docs/reference/ERP_KB_Dashboard_Discovery_Daily.timer`
  - `docs/reference/ERP_KB_Dashboard_Discovery_Weekly.systemd`
  - `docs/reference/ERP_KB_Dashboard_Discovery_Weekly.timer`

Live production state confirmed on `2026-06-06`:

- discovery coverage: `10/10`
- active queries: `40`
  - `10` persistent seed queries
  - `30` latest weekly LLM-generated queries
- weekly planner run: `FINISH`
- daily run: `FINISH`
- daily run details:
  - `40` queries
  - `114` search results
  - `50` new candidates
  - `64` duplicates/skips
  - `0` query errors
  - `0` drafts created
- total candidates after the initial controlled passes: `78`
- report:
  - `docs/reference/ERP_KB_Discovery_Coverage_Report.json`
  - `docs/reference/ERP_KB_Discovery_Coverage_Report.md`

Safety state:

- both live systemd services force `ERP_KB_DISCOVERY_DRY_RUN=1`
- discovery never promotes, exports, builds, or mutates OpenSPG
- manual draft conversion is limited to `3/KB/day` and `10/KB/week`
- partner portal candidates use a route queue pointing at the existing partner
  downloader pipeline instead of direct draft creation
- daily dry-run uses bounded concurrency `3`; draft-creating runs remain
  sequential to avoid budget races
- weekly generated queries replace the previous generated set, preventing
  unbounded query growth and preserving even coverage across all KBs

Installed live timers:

- `erp-kb-dashboard-discovery-daily.timer`
  - daily at `04:45`, randomized delay up to `5m`
- `erp-kb-dashboard-discovery-weekly.timer`
  - Sunday at `05:30`, randomized delay up to `10m`

Both discovery services score `3.1 OK` in `systemd-analyze security`.

The next calibration layer was added on the same date:

- stable `30`-candidate sample, evenly selected across all 10 KBs
- desktop filters for KB, recommendation, tier, confidence, status, and text
- individual and bulk draft/route/reject decisions
- maximum bulk size `50`
- explicit `operatorDecision` records kept separately from LLM recommendations
- recommendation agreement, false-positive, false-negative, hold-resolution,
  and per-KB/tier/action/query metrics
- weekly planner context now includes aggregated operator feedback and notes
- automatic `REJECT` recommendations remain reviewable until an operator
  decides them; they are no longer counted as human feedback
- discovery now indexes the URL-bearing source registries for all supported
  corpus-backed KBs and filters existing corpus URLs before candidate creation
- old pending candidates can be reconciled to `DUPLICATE`; manual draft and
  partner-route actions repeat the corpus check and audit a duplicate outcome
- corpus duplicates are excluded from the stable calibration sample, so the
  operator reviews only genuinely unresolved source candidates
- the first production reconciliation on `2026-06-06` scanned `78` candidates,
  marked `25` as existing-corpus duplicates, left `53` reviewable candidates,
  and produced a fresh `30`-candidate calibration sample with `0` operator
  decisions and `0` discovery-created drafts
- the weekly planner now receives per-query result and corpus-duplicate counts,
  allowing it to replace low-yield query patterns without exposing raw
  candidate content in the feedback context

On `2026-06-07`, the discovery operator layer was expanded again:

- candidate detail panel with source content, LLM rationale, risk fields,
  priority explanation, operator decision, and duplicate provenance
- deterministic priority queue scored from `0-100`
- local saved filter views per browser profile
- per-query efficiency, duplicate rate, acceptance rate, health, and action
  recommendation
- generated-query retirement after repeated empty or duplicate-heavy runs
- audited ten-minute undo for rejection and partner routing
- daily JSON/Markdown briefing with top candidates and quality alerts
- source-quality alerts for stale/error monitors, domain changes, unknown
  domains, low-yield queries, and duplicate-heavy queries
- gated semi-automatic pending-draft mode; publication and KB build remain
  outside discovery

The first production briefing after that change reported:

- `88` candidates
- `48` reviewable
- `25` corpus duplicates
- `15` operator decisions
- `8` discovery quality alerts

The semi-automatic gate remained correctly blocked because it had only `15/30`
required decisions, `0/7` observation days, and production discovery still had
forced dry-run enabled.

## InsERT GT Schema KB

### Purpose

- KB name: `InsERT GT MSSQL Schema`
- Namespace: `InsERTGTSchema`
- Project id: `17`
- Scope:
  - InsERT GT (Subiekt GT, Rewizor GT, Gratyfikant GT) MSSQL database schema metadata
  - database `pomagier` on `10.10.254.87\OPTIMA`
  - official InsERT GT documentation from Google Drive
- Do not ingest live business rows or sensitive operational data.

### Active local source files

- Schema: `docs/reference/InsERTGTSchema.schema`
- SQL templates: `docs/reference/InsERTGTSchema.extract_metadata.sql`
- Export script: `scripts/export_insert_gt_schema.mjs`
- Build script: `scripts/build_insert_gt_schema.mjs`
- Staging directory: `exports/insert_gt_schema/v1/`
- Local drive corpus: `downloads/google_drive/insert_gt/`
- Extracted SQL scripts: `downloads/google_drive/insert_gt/extracted/Skrypty_SQL_1_89_HF1/`
- XML documentation: `downloads/google_drive/insert_gt/extracted/Dokumentacja_bazy_danych_1_89_HF1/Dokumentacja_DB.xml`

### Current export set

- `database_instance.csv` - `1`
- `table.csv` - `956`
- `column.csv` - `8302`
- `primary_key.csv` - `877`
- `foreign_key.csv` - `1071`
- `index.csv` - `136`
- `constraint.csv` - `235`
- `view.csv` - `367`
- `stored_procedure.csv` - `602`
- `function.csv` - `127`
- `trigger.csv` - `0`
- `parameter.csv` - `0`
- `table_query_guide.csv` - `956`
- `join_path_guide.csv` - `1071`
- `sql_object_guide.csv` - `1096`
- `reference_document.csv` - `17`
- `chunk.csv` - `519`

### Current execution history

- Project `17` created successfully through `POST /v1/projects`
- Schema push to project `17` succeeded through `POST /v1/schemas?projectId=17`
- Job `443` - `DatabaseInstance` - `FINISH`
- Job `444` - `Table` - `FINISH`
- Job `445` - `Column` - `FINISH`
- Job `446` - `PrimaryKey` - `FINISH`
- Job `447` - `ForeignKey` - `FINISH`
- Job `448` - `Index` - `FINISH`
- Job `449` - `Constraint` - `FINISH`
- Job `450` - `View` - `FINISH`
- Job `451` - `StoredProcedure` - `FINISH`
- Job `452` - `Function` - `FINISH`
- Job `453` - `TableQueryGuide` - `FINISH`
- Job `454` - `JoinPathGuide` - `FINISH`
- Job `455` - `SqlObjectGuide` - `FINISH`
- Job `456` - `ReferenceDocument` - `FINISH`
- Job `457` - `Chunk` - `FINISH`

### Current implementation notes

- First build completed on `2026-07-22` from offline-extracted SQL scripts + XML documentation
- No live MSSQL connection available yet (port blocked); pool operates on exported source files
- Export parses `963` table SQL files, `370` views, `604` procedures, `185` functions from `Skrypty_SQL_1_89_HF1`
- Table/column descriptions sourced from InsERT DBDokumentator3 XML (`Dokumentacja_DB.xml`, `603` documented tables with `11225` fields)
- PDF reference documents converted via Stirling PDF API to markdown chunks
- Drive corpus contains `18` PDFs (documentation, guides, COM/XML examples)
- 1 ZIP contains InsERT GT COM example (Subiekt_GT_Zmiana_Stawek_VAT)
- InsERT GT table naming uses prefix conventions (`kh_`=kontrahenci, `tw_`=towary, `dok_`=dokumenty, `adr_`=adresy, `gr_`/`grat_`=kadry-płace)
- No triggers found in the current extraction
- MCP profile `insert-gt-technical-mcp` on port `3427` with tools `insert_gt_schema.search`, `insert_gt_object.get`, `insert_gt_join_path.find`

## OpenSPG native app `2` — re-confirmed still broken (2026-08-08)

- Re-ran `scripts/run_openspg_app_live_benchmark.mjs` (6 questions) during daily ops
- Result: `6/6 RUNNING_TIMEOUT`, `0` terminal `FINISH` — unchanged from the original
  2026-06-02 finding above
- `docker exec release-openspg-server` log tail of `/logs/openspgapp/completions.log`
  still shows the same `IllegalArgumentException: 2 is not exists` followed by
  `NullPointerException` on every task
- conclusion: the app-to-project id resolution bug in the native OpenSPG App UI
  reasoner path is still present six weeks later; not something this repo's code
  can fix (server-side OpenSPG bug). The dashboard's static `WARN` tile for
  "ERP Knowledge Assistant" (`erp_kb_dashboard_server.mjs:1018`) is accurate, not
  stale.
- this does not affect production Q&A: the actual serving path is the custom
  MCP/assistant layer (`erp_knowledge_assistant.mjs`, `erp_knowledge_mcp_http_bridge.mjs`
  instances), which never goes through `/public/v1/reasoner/*` for app id `2`
- re-check by re-running the benchmark script above; do not consider this fixed
  until it returns terminal `FINISH` results

## 2026-08-29 OpenAI model rotation and runtime compatibility

- the active model registry contains `gpt-5.4-mini` for chat and
  `text-embedding-3-small` for 1536-dimensional embeddings; legacy DeepSeek
  model records are no longer active
- applications `2` and `4` use `gpt-5.4-mini`; dashboard reviewer session `57`
  remains valid for application `4`
- `scripts/patch_openspg_openai_client.py` is mounted read-only and executed on
  every server start; it removes unsupported OpenAI request fields, uses
  `max_completion_tokens`, omits unsupported temperature, and matches only the
  exact `https://api.openai.com/v1` endpoint
- the same startup patch replaces KAG's full `pipeline_config` error log and
  the bridge's full solver-arguments print with secret-free messages; the patch
  fails closed when the installed KAG source no longer matches either the
  original or already-patched form
- dashboard health and discovery systemd units use
  `LoadCredential=openspg.cookie:/etc/erp-kb-openspg.cookie`; do not weaken the
  source cookie from `root:root 0600`
- post-rotation verification: direct chat HTTP 200 in 3.1 seconds, direct
  embedding HTTP 200 with 1536 dimensions in 2.1 seconds, and the final
  application `4` systemd health probe passed in 13.5 seconds
- no builder jobs, KB rebuilds, discovery runs, or re-vectorization were used
  for this validation

### 2026-08-29 GPT-5.6 Luna attempted cutover and rollback

- `gpt-5.6-luna` was created successfully as
  `8e778b95d04845efb1835f6b2bdac23f@gpt-5.6-luna`; its direct OpenAI chat probe
  returned HTTP 200 in 2.3 seconds. The model remains registered as an unused
  candidate after rollback.
- applications `2` and `4` were temporarily deployed with Luna. The first app
  `4` health probe passed in 59.7 seconds, but the second completed server-side
  in 90.4 seconds after the 90-second health-client timeout. This failed the
  required two-consecutive-pass gate.
- the guarded rollback completed: applications `2` and `4`, plus the installed
  health/daily/weekly systemd services, again use `gpt-5.4-mini`. The
  `text-embedding-3-small` model ID and all KB/vector state remained unchanged.
- the rollback health probe was blocked by a separate infrastructure failure:
  the VM exposed only about 8.1 GiB RAM with all 4 GiB swap consumed, while
  Neo4j repeatedly reached about 4.4 GiB RSS and was killed by the global OOM
  killer. OpenSPG then failed schema retrieval with `No routing server
  available` and crossed the health timeout.
- to stop repeated global OOM kills, `release-openspg-neo4j` was stopped without
  removing its container or volumes. The health timer remains enabled but
  inactive, and dashboard automation remains paused after two health failures.
  Restore the documented 16/24 GiB VM memory target or explicitly approve the
  deferred Neo4j right-sizing from the 2026-08-03 OOM note before starting
  Neo4j, clearing the pause, and resuming the health timer.
- this cutover did not invoke discovery, builder jobs, KB builds, ingestion, or
  re-vectorization. Scheduled discovery/report files changed concurrently and
  were deliberately left untouched.
- post-run secret scanning found that OpenSPG `AppController` logs the complete
  application update request at INFO level. The rollback payload therefore
  exposed the OpenAI key in two Docker log lines even though the Node command
  itself redacted output. Treat the key as compromised and rotate it before
  another app update. Do not reuse the rotation command until AppController
  request logging is suppressed/redacted or the app update contract is proven
  to preserve credentials when only a masked value is sent.

## 2026-08-30 Dashboard reviewer OpenAI cutover

- Root cause: the installed, untracked dashboard systemd drop-in still set
  `OPENSPG_LLM_MODEL=deepseek-reasoner`, although OpenSPG applications `2` and
  `4` and the active chat-model registry had already moved to OpenAI.
- Installed the tracked reviewer drop-in with `gpt-5.4-mini` byte-for-byte and
  restarted only `erp-kb-dashboard.service` (main PID `950` to `90976`). The
  service and authenticated dashboard status endpoint became healthy within the
  60-second gate; rollback was not used.
- Direct, non-applying OpenAI probes returned HTTP `200` for `gpt-5.4-mini` in
  `2098 ms` and `gpt-5.6-luna` in `2402 ms`. The integrated dashboard health
  service completed successfully at `2026-08-30 12:00:24 CEST`; dashboard LLM
  health was `PASS` on `gpt-5.4-mini` with zero consecutive failures.
- Final model registry contained only OpenAI `gpt-5.6-luna`,
  `gpt-5.4-mini`, and `text-embedding-3-small`; no DeepSeek record existed and
  no model record was deleted. Applications `2` and `4` remained on
  `gpt-5.4-mini` and their key fields matched the current key file without
  exposing key material.
- Automation remained `enabled=true`, `paused=false`, `shadowOnly=true`, and
  `publicationApproved=false`, with `56` jobs and `0` active jobs. The LLM
  health timer and both discovery timers remained active and enabled. Active
  repository configuration and installed service environments had no
  `deepseek-reasoner` match; remaining repository matches were historical draft
  metadata or the cutover specification and plan.
- Inbox state remained `63` pending, `288` promoted, `19` rejected, and `13`
  withdrawn, with no pending draft missing a title or source. Pending drafts by
  KB were: Community News `3`, Additional Functions `1`, Business Semantics
  `3`, Optima Reference `1`, Optima Schema `5`, Optima Sprint `1`, Taxbell
  Accounting/VAT `20`, Taxbell Legal `26`, and Taxbell Payroll/HR `3`.
  Discovery remained at `139` pending candidates and `130` drafted candidates;
  semi-automatic drafting was active and eligible, with one duplicate-rate
  warning.
- No automation or discovery run endpoint, draft approval/rejection/promotion,
  builder, ingestion, KB build, publication, re-vectorization, or model deletion
  ran during this switch.
