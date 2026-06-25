# Add Files To KB

This runbook is the practical workflow for adding new source files to the existing OpenSPG KBs in this workspace.

Workspace:
- `/docker/openspg`

OpenSPG host:
- `http://10.10.254.42:8887`

Important:
- do not add live business data
- add only technical artifacts, documentation, templates, examples, exported definitions, or sanitized logs
- after every larger ingestion pass, verify the staged counts and builder jobs

## 0. Know the Data Source limitation

In this OpenSPG build, `Settings -> Data Source` is not the right place for feeding the Optima KBs from SQL Server.

Confirmed instance behavior:
- datasource search works
- configured datasource count may be `0`
- datasource types exposed by this build are only:
  - `ODPS`
  - `SLS`
- there is no native `MSSQL` datasource connector in this instance

Practical consequence:
- do not plan Optima KB ingestion through GUI `Settings -> Data Source`
- for Optima and other MSSQL-backed KBs use:
  - `source files / SQL export -> CSV staging -> uploadFile -> builder job`

## 1. Pick the target KB

Use the right corpus directory.

### Additional Functions

KB:
- project `6`
- namespace `ComarchOptimaAdditionalFunctions`

Input directory:
- `downloads/google_drive/additional_functions/`

Use for:
- `js`
- `xpt`
- `hta`
- `xml`
- `csv` dictionaries
- COM-related examples
- markdown notes
- PDFs

PDF note:
- the exporter now attempts best-effort text extraction from local PDFs
- if the PDF contains selectable text, it can feed `ReferenceDocument` and `Chunk`
- scanned/image-only PDFs are still low quality for retrieval; for those, add a companion `.md` or `.txt` when possible

### Sprint

KB:
- project `7`
- namespace `ComarchOptimaSprint`

Input directory:
- `downloads/google_drive/sprint/`

Use for:
- `.sp`
- exported parameter definitions
- SQL examples for prints
- markdown notes
- troubleshooting artifacts
- screenshots or logs when technically useful

PDF note:
- the Sprint exporter also attempts best-effort text extraction from local PDFs
- if you add a PDF manual with selectable text, it can be chunked automatically
- for scanned/image-only PDFs, add a companion `.md` or `.txt` if you need reliable retrieval

### General Reference

KB:
- project `8`
- namespace `ComarchOptimaReference`

Input directory:
- `downloads/official/optima_reference/`

Use for:
- official Comarch documentation snapshots
- printable article HTML
- sitemap-derived official help sources

### Community News

KB:
- project `11`
- namespace `ComarchCommunityNews`

Input directory:
- `downloads/community_news/`

Use for:
- public community news posts
- local HTML snapshots of public news pages
- public attachments linked from those pages
- promoted local notes that summarize public announcements

Important:
- treat this as a supporting public corpus, not as authoritative product documentation
- do not ingest private community content or authenticated partner-only materials here

### Partner Technical

KB:
- project `9`
- namespace `ComarchOptimaPartnerTechnical`

Input directories:
- metadata snapshot root: `downloads/partner/optima_technical/api/`
- downloaded binary root: `downloads/partner/optima_technical/downloads/`
- recovered PDF text: `downloads/partner/optima_technical/extracted/pdf_text/`
- ZIP inventories: `downloads/partner/optima_technical/unpacked/zip_inventory/`

Use for:
- partner-only technical PDFs
- partner ZIP packages
- XML structure manuals
- driver/runtime packages
- helper files
- technical documentation that is not already better represented in another KB

Important:
- do not blindly mirror the whole partner portal
- start from staged `partner_asset.csv`
- prefer `INDEX_AND_RETRIEVE`
- keep `ROUTE_ONLY` assets mainly as metadata and routing
- downloaded `Dictionaries_*.zip` are parsed into:
  - `cfg_entry.csv`
  - `proc_entry.csv`
  - `msg_entry.csv`
- downloaded `Przyklady-uzycia-obiektow-COM-*` are parsed into:
  - `com_example.csv`
  - `com_interface_use.csv`
  - `com_schema_touchpoint.csv`
- URL provenance for duplicate checks and source attribution is kept in:
  - `downloads/partner/optima_technical/source_registry.json`
  - `exports/optima_partner_technical/v1/partner_asset.csv`
  - `downloads/partner/optima_technical/download_manifest.json`

## 2. Add the files locally

Copy files into the correct directory.

Examples:

```bash
cp /path/to/new-script.js /docker/openspg/downloads/google_drive/additional_functions/
cp /path/to/template.sp /docker/openspg/downloads/google_drive/sprint/
cp /path/to/article_print.html /docker/openspg/downloads/official/optima_reference/pages/
```

If the file belongs to an existing subfolder pattern, keep that structure. This matters for the exporters, because some heuristics depend on path and filename.

Examples:
- Additional Functions COM examples should stay under the COM examples tree
- Sprint artifacts should keep meaningful names like `invoice-copy.sp` or `vat-summary.sp`

### Knowledge inbox drafts from MCP

If the material was submitted through MCP `submit_knowledge_draft`, do not copy
it manually into a KB folder. Review and promote it first:

```bash
cd /docker/openspg
node scripts/manage_knowledge_inbox.mjs list --status pending
node scripts/manage_knowledge_inbox.mjs show <draft_id>
node scripts/manage_knowledge_inbox.mjs promote <draft_id> --note "source checked" --by "<operator>"
```

Promoted drafts are copied to:

```text
docs/reference/knowledge_inbox/promoted/<kbNamespace>/
```

Then regenerate staging for the target KB as usual. The exporters consume only
promoted drafts, never raw pending inbox drafts.

For a one-command reviewed refresh:

```bash
cd /docker/openspg
node scripts/run_knowledge_inbox_pipeline.mjs \
  --promote <draft_id> \
  --export \
  --note "source checked" \
  --by "<operator>"
```

To run OpenSPG build jobs too:

```bash
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie \
node scripts/run_knowledge_inbox_pipeline.mjs --kb <kbNamespace> --export --build
```

## 3. Regenerate staging CSV files

### Additional Functions

```bash
cd /docker/openspg
node scripts/export_optima_additional_functions.mjs
```

### Sprint

```bash
cd /docker/openspg
node scripts/export_optima_sprint.mjs
```

### General Reference

```bash
cd /docker/openspg
node scripts/export_optima_reference.mjs
```

### Community News

Download or refresh the public source snapshot:

```bash
cd /docker/openspg
node scripts/download_comarch_community_news.mjs
```

Then build CSV staging:

```bash
cd /docker/openspg
node scripts/export_comarch_community_news.mjs
```

To create the OpenSPG project and push schema:

```bash
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie \
node scripts/create_comarch_community_news_project.mjs
```

Then set the returned project id in the build step:

```bash
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie \
OPENSPG_PROJECT_ID=<project_id> \
node scripts/build_comarch_community_news.mjs
```

One-command refresh for the current project:

```bash
cd /docker/openspg
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie \
OPENSPG_PROJECT_ID=11 \
node scripts/refresh_comarch_community_news.mjs
```

Useful knobs:

- `COMMUNITY_NEWS_MAX_POSTS=200`
- `COMMUNITY_NEWS_FORCE=1`
- `OPENSPG_BUILD=0` to refresh only local snapshot and CSV staging
- `OPENSPG_FORCE_FILES=reference_document.csv,news_topic.csv,community_attachment.csv,chunk.csv`

Cron-ready wrapper:

```bash
/usr/bin/env bash /docker/openspg/scripts/cron_refresh_comarch_community_news.sh
```

See:

- `docs/reference/ComarchCommunityNews.cron.md`

### Partner Technical

Metadata refresh only:

```bash
cd /docker/openspg
node scripts/export_optima_partner_technical.mjs
```

Live metadata refresh:

```bash
cd /docker/openspg
PARTNER_COOKIE='PHPSESSID=...' PARTNER_REFRESH=1 node scripts/export_optima_partner_technical.mjs
```

Selective partner asset download:

```bash
cd /docker/openspg
PARTNER_COOKIE='PHPSESSID=...' node scripts/download_optima_partner_technical_assets.mjs
```

Common filters:

```bash
cd /docker/openspg
PARTNER_COOKIE='PHPSESSID=...' \
PARTNER_DOWNLOAD_LIMIT=8 \
PARTNER_STATE_FILTER='CURRENT' \
PARTNER_DOWNLOAD_TYPES='pdf,zip' \
node scripts/download_optima_partner_technical_assets.mjs
```

Selective ZIP extraction after download:

```bash
cd /docker/openspg
node scripts/extract_optima_partner_technical_archives.mjs
```

Example with explicit archive limits:

```bash
cd /docker/openspg
PARTNER_EXTRACT_LIMIT=8 \
PARTNER_EXTRACT_MAX_FILES_PER_ARCHIVE=120 \
node scripts/extract_optima_partner_technical_archives.mjs
```

## 4. Inspect staging

Check the KB-specific README and manifest.

### Additional Functions

- `exports/optima_additional_functions/v1/README.md`
- `exports/optima_additional_functions/v1/_manifest.json`

### Sprint

- `exports/optima_sprint/v1/README.md`
- `exports/optima_sprint/v1/_manifest.json`

### General Reference

- `exports/optima_reference/v1/README.md`
- `exports/optima_reference/v1/_manifest.json`

### Partner Technical

- `exports/optima_partner_technical/v1/README.md`
- `exports/optima_partner_technical/v1/_manifest.json`
- `downloads/partner/optima_technical/source_registry.json`
- `downloads/partner/optima_technical/download_manifest.json`
- `downloads/partner/optima_technical/extraction_manifest.json`

Quick check examples:

```bash
cat exports/optima_additional_functions/v1/README.md
cat exports/optima_sprint/v1/README.md
cat exports/optima_reference/v1/README.md
cat exports/optima_partner_technical/v1/README.md
cat downloads/partner/optima_technical/source_registry.json
cat downloads/partner/optima_technical/download_manifest.json
cat downloads/partner/optima_technical/extraction_manifest.json
```

## 5. Build into OpenSPG

All build runners require an authenticated OpenSPG session cookie. Prefer
`OPENSPG_COOKIE_FILE` so operators do not paste long cookie strings into every
command.

Format:

```bash
OPENSPG_COOKIE='OPEN_SPG_TOKEN=...; x-hng=lang=en-US; ctoken=...'
```

Recommended file-based format:

```bash
sudo install -m 600 -o root -g root /dev/null /etc/erp-kb-openspg.cookie
sudoedit /etc/erp-kb-openspg.cookie
```

The file should contain one line:

```text
OPEN_SPG_TOKEN=...; x-hng=lang=en-US; ctoken=...
```

Check it:

```bash
cd /docker/openspg
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie node scripts/openspg_auth_check.mjs
```

### Automatic cookie refresh from OpenSPG login

If browser cookies expire too often, use a dedicated OpenSPG login file instead
of copying cookies manually. Keep this file outside the repository:

```bash
sudo install -m 600 -o root -g root /dev/null /etc/erp-kb-openspg-login.env
sudoedit /etc/erp-kb-openspg-login.env
```

Expected format:

```text
OPENSPG_LOGIN_ACCOUNT=<operator_login>
OPENSPG_LOGIN_PASSWORD=<operator_password>
```

Refresh the session cookie:

```bash
cd /docker/openspg
OPENSPG_LOGIN_FILE=/etc/erp-kb-openspg-login.env \
OPENSPG_COOKIE_OUT=/etc/erp-kb-openspg.cookie \
node scripts/openspg_login.mjs
```

The login script uses the same endpoint and password hashing as the OpenSPG UI:

- `POST /v1/accounts/login`
- `SHA256(password + "OPENSPG")`

It prints only validation metadata and cookie names; it does not print the
password, hash, or cookie value.

For one-command reviewed refreshes, enable automatic login only for that run:

```bash
cd /docker/openspg
OPENSPG_AUTO_LOGIN=1 \
OPENSPG_LOGIN_FILE=/etc/erp-kb-openspg-login.env \
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie \
node scripts/run_knowledge_inbox_pipeline.mjs --kb ComarchBetterflyReference --export --build
```

When the same command promotes a draft and runs `--build`, the pipeline
automatically forces the KB files that receive promoted knowledge, usually
`reference_document.csv` and `chunk.csv`. This prevents OpenSPG from reusing an
older finished builder job for a changed CSV.

### Additional Functions

Full build:

```bash
cd /docker/openspg
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie node scripts/build_optima_additional_functions.mjs
```

Selective refresh:

```bash
cd /docker/openspg
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie \
OPENSPG_FORCE_FILES='reference_document.csv,file_artifact.csv,implementation_example.csv,chunk.csv' \
node scripts/build_optima_additional_functions.mjs
```

### Sprint

Full build:

```bash
cd /docker/openspg
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie node scripts/build_optima_sprint.mjs
```

Selective refresh:

```bash
cd /docker/openspg
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie \
OPENSPG_FORCE_FILES='reference_document.csv,file_artifact.csv,sql_pattern.csv,chunk.csv' \
node scripts/build_optima_sprint.mjs
```

### General Reference

Full build:

```bash
cd /docker/openspg
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie node scripts/build_optima_reference.mjs
```

Selective refresh:

```bash
cd /docker/openspg
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie \
OPENSPG_FORCE_FILES='reference_document.csv,learning_guide.csv,knowledge_route.csv,entry_guide.csv,chunk.csv' \
node scripts/build_optima_reference.mjs
```

### Partner Technical

Full build:

```bash
cd /docker/openspg
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie \
OPENSPG_PROJECT_ID=9 \
OPENSPG_NAMESPACE='ComarchOptimaPartnerTechnical' \
OPENSPG_JOB_PREFIX='COPT' \
node scripts/build_optima_partner_technical.mjs
```

Selective refresh:

```bash
cd /docker/openspg
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie \
OPENSPG_PROJECT_ID=9 \
OPENSPG_NAMESPACE='ComarchOptimaPartnerTechnical' \
OPENSPG_JOB_PREFIX='COPT' \
OPENSPG_FORCE_FILES='partner_asset.csv,chunk.csv' \
node scripts/build_optima_partner_technical.mjs
```

## 6. Verify build results

Check:
- builder manifest
- job list in OpenSPG
- KB README

Examples:

```bash
cat exports/optima_additional_functions/v1/build_additional_functions_jobs_manifest.json
cat exports/optima_sprint/v1/build_optima_sprint_jobs_manifest.json
cat exports/optima_reference/v1/build_optima_reference_jobs_manifest.json
```

Expected terminal status:
- `FINISH`

## 7. Use the right refresh strategy

### Refresh only changed slices when:
- you added a few examples
- you added a few markdown notes
- you added one or two templates
- schema did not change

### Rebuild a wider slice when:
- you added a whole new source family
- the exporter now emits new entity rows
- path heuristics changed
- you changed schema-to-file mapping logic

## 8. Safety rules

Do not add:
- production customer rows
- contractor data
- payroll or HR data
- banking data
- personal identifiers
- raw database dumps

Prefer:
- definitions
- templates
- scripts
- documentation
- exported metadata
- sanitized logs
- synthetic or redacted examples

## 9. When schema must change

If the new source material clearly introduces a new semantic class, change the KB schema first, then export, then build.

Typical cases:
- new Sprint artifact family
- new Additional Functions source family
- new official-document routing layer

Schema source files:
- `docs/reference/ComarchOptimaAdditionalFunctions.schema`
- `docs/reference/ComarchOptimaSprint.schema`
- `docs/reference/ComarchOptimaReference.schema`

Schema push:

```bash
cd /docker/openspg
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie \
OPENSPG_SCHEMA_FILE='/docker/openspg/docs/reference/ComarchOptimaSprint.schema' \
node scripts/push_openspg_schema.mjs
```

Swap the schema file path for the target KB.

## 10. Useful references

- `docs/reference/OpenSPG_KB_Operational_Memory.md`
- `docs/reference/ComarchOptimaKB_CorpusCoverageAudit.md`
- `docs/LOCAL_KNOWLEDGE.md`
- `AGENTS.md`

Use those before bigger ingestion changes so later refreshes stay consistent with the current confirmed workflow.
