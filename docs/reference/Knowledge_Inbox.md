# Knowledge Inbox

Date: `2026-06-02`

## Purpose

This inbox stores local knowledge drafts before they are promoted into a
specific OpenSPG KB staging/export flow.

It is the safe write-side entry point for the ERP assistant layer.

## What it does

- accepts a draft title and content
- captures the target KB name and namespace
- optionally stores a source URL and tags
- optionally stores source-discovery metadata such as Exa query and source tier
- validates the target KB namespace against the known ERP KB allowlist
- applies conservative field length limits before writing files
- writes:
  - JSON draft record
  - Markdown human-readable draft

## What it does not do

- it does not write directly into OpenSPG
- it does not mutate live KB graphs
- it does not ingest tenant business data

## Storage

Current storage root:

- `downloads/knowledge_inbox/`

Draft files are grouped by day and use a generated id:

- `downloads/knowledge_inbox/YYYY-MM-DD/<draft_id>.json`
- `downloads/knowledge_inbox/YYYY-MM-DD/<draft_id>.md`

Reviewed/promoted drafts are copied into:

- `docs/reference/knowledge_inbox/promoted/<kbNamespace>/<draft_id>.json`
- `docs/reference/knowledge_inbox/promoted/<kbNamespace>/<draft_id>.md`

Review state is stored in:

- `docs/reference/knowledge_inbox/registry.json`

## MCP tool

The MCP bridge now exposes:

- `submit_knowledge_draft`
- `search_external_sources`
- `draft_external_source`

Required arguments:

- `kbName`
- `kbNamespace`
- `title`
- `content`

Optional arguments:

- `sourceUrl`
- `tags`

Allowed `kbNamespace` values:

- `ComarchOptimaSchema`
- `ComarchOptimaAdditionalFunctions`
- `ComarchOptimaSprint`
- `ComarchOptimaReference`
- `ComarchOptimaPartnerTechnical`
- `ComarchBetterflyReference`
- `ComarchCommunityNews`
- `TaxbellLegalReference`
- `TaxbellPayrollHRReference`
- `TaxbellAccountingVATReference`

Optional metadata currently supported for externally discovered drafts:

- `discoveredVia=exa`
- `discoveredVia=source_list`
- `exaQuery`
- `sourceTier`
- `retrievedAt`

Dashboard discovery stores candidates first. Converting a candidate to a draft
is a separate, audited operator action and remains subject to the inbox and
per-KB discovery limits.

When `EXA_AUTO_DRAFT=1` is enabled, the answer layer may create one inbox draft
automatically from a fallback search result, but only for `official` or
`community` sources. The auto-created draft still goes through the same inbox
storage and promotion path as manual drafts.

Write-side safety controls:

- `ERP_KB_DRAFT_MAX_PER_DAY`, default `100`
- `ERP_KB_AUTO_DRAFT_MAX_PER_DAY`, default `25`
- `ERP_KB_DRAFT_ALLOWED_SOURCE_DOMAINS`, default official Comarch, Betterfly,
  and public community domains
- `ERP_KB_HTTP_WRITE_TOKEN`, optional bearer token for MCP write tools

The bridge accepts `ERP_KB_HTTP_TOKEN` for read and write tools. If
`ERP_KB_HTTP_WRITE_TOKEN` is also set, it is accepted for write tools too.
Desktop and HTTP clients therefore only need the read token for
`answer_question`, `route_question`, benchmarks, external search, and inbox
draft creation.

Duplicate cleanup:

- Dashboard: use the `Duplicate source URLs` section when it appears in the
  dashboard reports view.
- CLI check: `node scripts/manage_knowledge_inbox.mjs duplicates --kb ComarchOptimaReference`
- CLI withdraw: `node scripts/manage_knowledge_inbox.mjs withdraw <draft_id> --note "duplicate source URL" --by "<operator>"`

Default limits:

- title: `200` characters
- content: `50000` characters
- source URL: `2048` characters, only `http` or `https`
- tags: `20` items
- tag: `64` characters

## Promotion model

The draft is a holding pattern until an operator promotes or rejects it.

List drafts:

```bash
cd /docker/openspg
node scripts/manage_knowledge_inbox.mjs list --status all
```

Show one draft:

```bash
cd /docker/openspg
node scripts/manage_knowledge_inbox.mjs show <draft_id>
```

Promote one draft after review:

```bash
cd /docker/openspg
node scripts/manage_knowledge_inbox.mjs promote <draft_id> --note "source checked" --by "<operator>"
```

Reject one draft:

```bash
cd /docker/openspg
node scripts/manage_knowledge_inbox.mjs reject <draft_id> --note "reason" --by "<operator>"
```

Promoted drafts are consumed by the KB exporters. After promotion, regenerate
the target KB staging and then run the normal build script for that KB.

Automated pipeline:

```bash
cd /docker/openspg
node scripts/run_knowledge_inbox_pipeline.mjs --status
node scripts/run_knowledge_inbox_pipeline.mjs --promote <draft_id> --export --note "source checked" --by "<operator>"
```

Operator pipeline with regression test:

```bash
cd /docker/openspg
OPENSPG_AUTO_LOGIN=1 \
OPENSPG_LOGIN_FILE=/etc/erp-kb-openspg-login.env \
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie \
node scripts/process_knowledge_inbox.mjs \
  --promote <draft_id> \
  --build \
  --test-size 20 \
  --freshness \
  --note "source checked" \
  --by "<operator>"
```

Source freshness reporting:

```bash
cd /docker/openspg
node scripts/source_freshness_report.mjs --stale-days 14
```

The report is written to:

- `docs/reference/KB_Source_Freshness_Report.json`
- `docs/reference/KB_Source_Freshness_Report.md`

`WARN` means the source state is usable but lacks strong freshness metadata
such as content hashes or a source registry. `ACTION_NEEDED` means staging is
behind a newer local source snapshot.

To also refresh OpenSPG builder jobs, provide `OPENSPG_COOKIE_FILE` or
`OPENSPG_COOKIE` and add `--build`:

```bash
cd /docker/openspg
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie \
node scripts/run_knowledge_inbox_pipeline.mjs --kb ComarchBetterflyReference --export --build
```

Check the stored session before running a build:

```bash
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie \
node scripts/openspg_auth_check.mjs
```

Use `--dry-run` to see planned actions without changing staging or OpenSPG:

```bash
node scripts/run_knowledge_inbox_pipeline.mjs --all --export --dry-run
```

Supported exporter hooks:

- `ComarchOptimaSchema` -> promoted documentation chunks only
- `ComarchOptimaAdditionalFunctions` -> `ReferenceDocument` and `Chunk`
- `ComarchOptimaSprint` -> `ReferenceDocument` and `Chunk`
- `ComarchOptimaReference` -> `ReferenceDocument` and `Chunk`
- `ComarchOptimaPartnerTechnical` -> `ReferenceDocument` and `Chunk`
- `ComarchBetterflyReference` -> `ReferenceDocument` and `Chunk`

This deliberately separates three steps:

1. MCP creates a local draft.
2. Operator reviews and promotes the draft.
3. Export/build refreshes the actual OpenSPG KB.

## Safe use

Use this when:

- you want to capture a new answerable fact
- you want to prepare material for later review
- you want to add source-backed knowledge without editing live KBs directly

Do not use this as a shortcut for live business data ingestion.

The current intranet MCP profile uses one bearer token for both read tools and
this draft-writing tool. Anyone with that token can create inbox drafts.
