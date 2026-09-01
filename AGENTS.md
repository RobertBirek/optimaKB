# Repository Guidelines

## What this repo is

A Docker Compose deployment workspace for OpenSPG knowledge-base services, plus a local Vite React dashboard (`src/`, `vite.config.js`). The main Compose config is `compose.yaml`. Runtime state lives in `data/` — never edit or review it manually.

There is **no test suite** for this checkout. Validate with `docker compose config`, then start the stack and check `docker compose ps` + logs.

## Developer commands

| Command | Purpose |
|---|---|
| `docker compose config` | Validate compose config |
| `docker compose up -d` | Start all services (mysql, neo4j, minio, server) |
| `docker compose logs -f server` | Tail server logs (replace `server` with any service) |
| `docker compose down` | Stop containers, keep volumes |
| `npm run dev` | Start dashboard dev server on `0.0.0.0` |
| `npm run build` | Build dashboard to `dist/dashboard/` |
| `npm run check` | Syntax-check all dashboard scripts |

## Project layout

```
├── compose.yaml         # Service definitions
├── .env                 # Runtime secrets (gitignored)
├── src/                 # React dashboard (SPA)
├── scripts/             # Export/build/assistant scripts (Node.js ESM)
│   └── lib/             # Shared helpers
├── exports/<kb>/v1/     # Staged CSV files + _manifest.json per KB
├── downloads/           # Raw reference input (Drive, official, partner, etc.)
├── docs/reference/      # Reference material, schemas, KB operational memory
│   └── OpenSPG_KB_Operational_Memory.md  # MUST read before OpenSPG KB work
└── data/                # Service state (gitignored)
```

## Active OpenSPG knowledge bases

| Project | Name | Namespace | Export script | Build script |
|---|---|---|---|---|
| 4 | Comarch Optima ERP MSSQL Schema | `ComarchOptimaSchema` | `export_optima_schema_metadata.mjs` | `build_optima_schema_metadata.mjs` |
| 6 | Comarch Optima Additional Functions | `ComarchOptimaAdditionalFunctions` | `export_optima_additional_functions.mjs` | `build_optima_additional_functions.mjs` |
| 7 | Comarch Optima Sprint and Prints | `ComarchOptimaSprint` | `export_optima_sprint.mjs` | `build_optima_sprint.mjs` |
| 8 | Comarch Optima Reference | `ComarchOptimaReference` | `export_optima_reference.mjs` | `build_optima_reference.mjs` |
| 9 | Comarch Optima Partner Technical | `ComarchOptimaPartnerTechnical` | `export_optima_partner_technical.mjs` | `build_optima_partner_technical.mjs` |
| 10 | Comarch Betterfly Reference | `ComarchBetterflyReference` | `export_betterfly_reference.mjs` | `build_betterfly_reference.mjs` |
| 12 | Taxbell Legal Reference | `TaxbellLegalReference` | `export_taxbell_legal_reference.mjs` | `build_taxbell_legal_reference.mjs` |
| 13 | Taxbell Payroll HR Reference | `TaxbellPayrollHRReference` | `export_taxbell_payroll_hr_reference.mjs` | `build_taxbell_payroll_hr_reference.mjs` |
| 14 | Taxbell Accounting VAT Reference | `TaxbellAccountingVATReference` | `export_taxbell_accounting_vat_reference.mjs` | `build_taxbell_accounting_vat_reference.mjs` |
| 15 | Comarch Optima Business Semantics | `ComarchOptimaBusinessSemantics` | `export_optima_business_semantics.mjs` | `build_optima_business_semantics.mjs` |
| 16 | OWA Ontology | `OWAOntology` | `export_owa_ontology.mjs` | `build_owa_ontology.mjs` |
| 17 | InsERT GT Schema (Subiekt/Rewizor/Gratyfikant GT) | `InsERTGTSchema` | `export_insert_gt_schema.mjs` | `build_insert_gt_schema.mjs` |
| 11 | Comarch Community News | `ComarchCommunityNews` | `export_comarch_community_news.mjs` | `build_comarch_community_news.mjs` |
| *nigdy niezbudowana (patrz F-20)* | Comarch Universal Knowledge | `ComarchUniversalKnowledge` | `export_universal_knowledge.mjs` | — (brak build script; `enabled: true` w rejestrze z `buildStatus: never_built`, decyzja o wyłączeniu pozostawiona operatorowi) |

Źródło prawdy dla tej tabeli: `docs/reference/ERP_KB_Dashboard_KB_Registry.json` (lista namespace'ów/status enabled), `scripts/build_kb_runner.mjs` (project ID dla większości), `docs/reference/Taxbell_KB_Project_Map.json` (project ID dla 3 KB Taxbell). Ta tabela nie ma automatycznej regeneracji — przy dodaniu/zmianie KB zaktualizuj ją ręcznie i sprawdź zgodność z rejestrem (patrz `AUDYT_PELNY_OPENSPG_2026-07-30.md` F-11).

All export scripts write staged CSVs to `exports/<kb>/v1/`. All build runners upload and submit OpenSPG builder jobs, resume from finished jobs, and support `OPENSPG_FORCE_FILES=...`.

Pipeline per KB: `schema (.schema file) → push_openspg_schema.mjs → export_{kb}.mjs → build_{kb}.mjs`

## OpenSPG API quirks

- `POST /v1/schemas` accepts the schema script but **does not materialize custom relation lines** in `GET /v1/schemas/graph/{projectId}`. Use explicit ref-id properties (`documentDefinitionRefId`, `contractorRefId`, etc.) as the FK workaround.
- `GET /public/v1/builder/job/list` must use `start=1` (not `0`); `start=0` triggers a backend SQL negative-offset bug.
- The app SPA uses hash routing: `/#/application`, `/#/application/detail/arrange?appid={id}`.
- `GET /v1/app/{appid}` returns `accessToken` in the response — do not store or echo it.
- Only `config.kb`, `config.language`, `config.llm`, and template-backed `config.chat` are confirmed in the app config path; no custom prompt/system-instruction field is verified.
- `POST /v1/schemas` ignores unheard-of entity types while accepting the rest of the script; validate new types server-side before depending on them.
- `node fetch` may fail with `connect EPERM ...:8887` while `curl` works; use `curl` as the fallback.
- `/v3/api-docs` returns a JSON array of byte values, not a direct object — decode with `Buffer.from(raw).toString('utf8')`.
- The `think_pipeline` template works; `kag_thinker_pipeline` is unstable (missing `rewrite_prompt`).

## Schema-only code-object import strategy

Keep full SQL `definition` as plain text, expose `definitionPreview` as the vectorized/searchable preview, store `definitionHash` and `definitionLength`. Do not set `definition` to `TextAndVector` — it stalls on large SQL bodies.

## Assistant layer (MCP / HTTP)

- Rule-based router: `scripts/erp_knowledge_assistant.mjs`
- Answer script: `scripts/erp_knowledge_answer.mjs`
- Regression: `scripts/run_erp_knowledge_testpack.mjs` (supports `--size 100` and `--size 200`; baseline `200 PASS` / `0 PARTIAL` / `0 MISS`)
- Community thread test: `scripts/run_community_thread_test.mjs`
- MCP stdio server: `scripts/erp_knowledge_mcp_server.mjs`
- MCP HTTP bridge: `scripts/erp_knowledge_mcp_http_bridge.mjs` (ports `GET /health`, `POST /mcp`, `GET /sse`, `POST /sse`)
- Preflight: `scripts/preflight_erp_knowledge_mcp_http_bridge.mjs`
- App deploy: `scripts/deploy_erp_knowledge_openspg_app.mjs` (app `2`, idempotent)
- Live app `2` is deployable but not end-to-end usable — `projectId=2` resolution bug causes `IllegalArgumentException`.
- Write-side drafts: `submit_knowledge_draft` tool writes to `downloads/knowledge_inbox/` only; does not mutate OpenSPG.
- Inbox pipeline: `run_knowledge_inbox_pipeline.mjs`
- The live MCP HTTP bridge runs on `10.10.254.42:3400` behind NPMplus on `10.10.254.46`.
- UFW rule if needed: `sudo ufw allow from 10.10.254.46 to any port 3400 proto tcp`

## Data ingestion path

For this OpenSPG instance, the datasource API only supports `ODPS` and `SLS` (no MSSQL connector). The practical path is: `MSSQL export (via Codex MCP) → CSV → structured_builder_chain`. Export only SQL Server catalog metadata, not business rows.

## Known gotchas

- `Wydruki` table has non-unique `Wdr_ID` — use composite semantic ids when exporting entities.
- Short keywords like `com` must be matched as bounded tokens in routing, otherwise the brand name `Comarch` falsely triggers `ComarchOptimaAdditionalFunctions`.
- `Chunk` rows with giant content (>8192 OpenAI tokens) are rejected at build time; exclude oversized documents from chunking.
- Partner assets behind Comarch SSO may return `AUTH_REDIRECT_HTML` — `PHPSESSID` alone is insufficient; a full browser cookie is needed.
- Sprint build runner maps entity names from `GET /v1/schemas/graph/{projectId}` — check both fully qualified and short names if an entity type is reported missing.
- Never leave dashboard-mutated artifacts inaccessible to `mcpbot` after root-run repairs. This includes `docs/reference/knowledge_inbox/registry.json` and helper files in `exports/optima_schema/v1/`. Atomic writers now prevent the common replacement failure; still verify `registry.json` with `sudo -u mcpbot test -w .../registry.json`. See the permissions sections in `OpenSPG_KB_Operational_Memory.md`.

## Files the agent should read first

- `docs/reference/OpenSPG_KB_Operational_Memory.md` — durable process memory for confirmed API behavior and current KB state
- `docs/reference/ADD_FILES_TO_KB.md` — practical runbook for feeding new files into existing KBs
- `docs/reference/ERP_Knowledge_Assistant_Blueprint.md` — assistant-layer architecture
- `docs/reference/ERP_Knowledge_Assistant_Routing.json` — machine-readable routing rules
- `docs/reference/Knowledge_Inbox.md` — write-side draft workflow
- `docs/reference/ComarchKB_Global_Audit.md` — cross-KB readiness assessment; read before building another KB
