---
name: openspg-kb-pipeline
description: "Complete KB pipeline for this OpenSPG workspace: schema push, CSV export, build runner with job resume, force-refresh, and known API quirks. Use when building, exporting, or refreshing any OpenSPG knowledge base in /docker/openspg."
---

# OpenSPG KB Pipeline

## Pipeline overview

Per KB: `schema (.schema file) → push_openspg_schema.mjs → export_{kb}.mjs → build_{kb}.mjs`

```
scripts/
├── push_openspg_schema.mjs     # POST schema to OpenSPG
├── export_{namespace}.mjs       # Generate CSV files → exports/<kb>/v1/
├── build_{namespace}.mjs        # Upload CSVs → submit builder jobs → wait for FINISH
└── lib/
    ├── build_client.mjs         # HTTP client for builder API
    ├── build_runner_core.mjs    # CSV upsert payload builder + README refresh
    ├── config.mjs               # OPENSPG_API_BASE, constants
    └── openspg_auth.mjs         # Cookie-based auth helpers
```

## Auth

Set `OPENSPG_COOKIE` env var or point to a cookie file via `OPENSPG_COOKIE_FILE`. The cookie is read by `readOpenSpgCookie()` in `scripts/lib/openspg_auth.mjs`.

## Step 1: Push schema

```bash
OPENSPG_PROJECT_ID=<id> OPENSPG_SCHEMA_FILE=docs/reference/<KbName>.schema \
  node scripts/push_openspg_schema.mjs
```

- `POST /v1/schemas?projectId=<id>` accepts the schema script
- **Does NOT materialize custom relation lines** in `GET /v1/schemas/graph/{projectId}` — use explicit ref-id properties as FK workaround
- Ignores unheard-of entity types while accepting the rest of the script — validate new types server-side before depending on them
- OpenSPG type names must stay within backend length limit; shorten if rejected

## Step 2: Export CSV

```bash
node scripts/export_{namespace}.mjs
```

All export scripts write staged CSVs to `exports/<kb>/v1/` with a `_manifest.json`.

### Schema-only code-object strategy

- Keep full SQL `definition` as plain text
- Expose `definitionPreview` as vectorized/searchable preview
- Store `definitionHash` and `definitionLength`
- Do **not** set `definition` to `TextAndVector` — stalls on large SQL bodies

### Known export gotchas

- `Wydruki` table has non-unique `Wdr_ID` — use composite semantic ids
- `Chunk` rows with giant content (>8192 OpenAI tokens) are rejected at build time — exclude oversized documents
- Betterfly `spis-tresci` pages must not be emitted into `chunk.csv` as retrieval rows (exceeds OpenAI embedding input limit)

## Step 3: Build (upload + submit jobs)

```bash
OPENSPG_COOKIE='<cookie>' OPENSPG_PROJECT_ID=<id> OPENSPG_NAMESPACE=<Namespace> \
  OPENSPG_JOB_PREFIX=<PREFIX> node scripts/build_{namespace}.mjs
```

The build runner (`scripts/lib/build_runner_core.mjs`):

1. Reads `_manifest.json` from the export directory
2. Uploads each CSV file via `POST /public/v1/builder/file/upload`
3. Submits a builder job per file via `POST /public/v1/builder/job/submit`
4. Polls until each job reaches `FINISH`
5. Writes `upload_<ns>_manifest.json` and `build_<ns>_jobs_manifest.json`

### Job resume behavior

The runner checks existing jobs by `jobName`. If a matching job exists in `FINISH`, it skips re-upload/submit — unless `OPENSPG_FORCE_FILES=...` is set.

### OPENSPG_FORCE_FILES

Force re-upload and re-submit specific CSV files:

```bash
OPENSPG_FORCE_FILES=reference_document.csv,chunk.csv node scripts/build_optima_sprint.mjs
```

The force-refresh bypasses `existingByJobName` reuse for forced files.

### Builder API quirks

- `GET /public/v1/builder/job/list` must use `start=1` (not `0`); `start=0` triggers a backend SQL negative-offset bug
- `node fetch` may fail with `connect EPERM ...:8887` while `curl` works — use `curl` as fallback
- Sprint build runner maps entity names from `GET /v1/schemas/graph/{projectId}` — check both fully qualified and short names if an entity type is reported missing
- If a matching partner-style job is already in `INIT`, `WAITING`, or `RUNNING`, reuse that active job and wait instead of submitting another duplicate

### Thinker pipeline

- `think_pipeline` template works
- `kag_thinker_pipeline` is unstable (missing `rewrite_prompt`)

## Active KBs reference

| ID | Namespace | Export script | Build script |
|----|-----------|---------------|--------------|
| 4 | `ComarchOptimaSchema` | `export_optima_schema_metadata.mjs` | `build_optima_schema_metadata.mjs` |
| 6 | `ComarchOptimaAdditionalFunctions` | `export_optima_additional_functions.mjs` | `build_optima_additional_functions.mjs` |
| 7 | `ComarchOptimaSprint` | `export_optima_sprint.mjs` | `build_optima_sprint.mjs` |
| 8 | `ComarchOptimaReference` | `export_optima_reference.mjs` | `build_optima_reference.mjs` |
| 9 | `ComarchOptimaPartnerTechnical` | `export_optima_partner_technical.mjs` | `build_optima_partner_technical.mjs` |
| 10 | `ComarchBetterflyReference` | `export_betterfly_reference.mjs` | `build_betterfly_reference.mjs` |

## Data ingestion path

The OpenSPG datasource API only supports `ODPS` and `SLS` (no MSSQL connector). The practical path is:

```
MSSQL export (via Codex MCP) → CSV → structured_builder_chain
```

Export only SQL Server catalog metadata, not business rows.

## Other API conventions

- `/v3/api-docs` returns a JSON array of byte values — decode with `Buffer.from(raw).toString('utf8')`
- `POST /v1/projects` minimal payload: `name`, `namespace`, `description`, `visibility`, `tag`, `config.vectorizer.modelId`
- Hash routing in dashboard SPA: `/#/application`, `/#/application/detail/arrange?appid={id}`
- `GET /v1/app/{appid}` returns `accessToken` — do not store or echo it
