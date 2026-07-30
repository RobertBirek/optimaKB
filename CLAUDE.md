# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language

Always respond to the user in Polish, regardless of the language used in the request.

## What this repo is

A Docker Compose deployment of OpenSPG (a knowledge-graph platform: MySQL + Neo4j + MinIO + Tika + a Java `server`), plus a substantial custom layer built on top of it: a Node.js ESM export/build pipeline that feeds Comarch Optima ERP documentation into OpenSPG knowledge bases, an assistant/MCP layer that answers questions against those KBs, and a Vite/React operations dashboard (`src/`) for monitoring and managing it all.

**Read `AGENTS.md` first** — it is the canonical repository guide (project layout, active KB table, OpenSPG API quirks, known gotchas, assistant-layer file map). This file adds architecture context that spans multiple files/directories and isn't restated from `AGENTS.md`.

Also read `docs/reference/OpenSPG_KB_Operational_Memory.md` before any OpenSPG KB work — it's the durable memory of confirmed API behavior and current KB state, and is updated as facts change.

## Commands

```bash
# Compose stack
docker compose config              # validate compose config
docker compose up -d               # start mysql, neo4j, minio, tika, server
docker compose logs -f server      # tail a service's logs
docker compose down                # stop, keep volumes

# Dashboard (Vite/React, src/)
npm run dev                        # dev server on 0.0.0.0
npm run build                      # build to dist/dashboard/
npm run lint                       # eslint scripts/ + src/
npm run check                      # node --check syntax validation across all scripts/*.mjs (no unit-test framework — this is the closest thing to a build check)

# Run a single test (tests are plain Node scripts, not a test-runner framework)
node scripts/test_<name>.mjs

# Common named test/validate scripts (see package.json "scripts" for the full list)
npm run test:mcp-kb-registry
npm run test:mcp-profiles
npm run test:mcp-protocol
npm run validate:mcp-profiles-live
npm run test:automation
npm run test:discovery
```

There is no repo-wide test runner — each `scripts/test_*.mjs` file is a standalone Node script that exits non-zero on failure. `npm run check` is the fastest smoke test after touching any script (syntax-checks every script in the dependency chain).

## Architecture

### Three layers, one data flow

1. **Export/build pipeline** (`scripts/export_*.mjs`, `scripts/build_*.mjs`, `scripts/lib/`) — pulls source material (MSSQL schema metadata, Comarch documentation, community forum threads, partner technical assets) and stages it as CSVs under `exports/<kb>/v1/` with a `_manifest.json`, then uploads and submits OpenSPG builder jobs. Pipeline shape per KB: `<kb>.schema file → push_openspg_schema.mjs → export_<kb>.mjs → build_<kb>.mjs`. Shared logic (OpenSPG auth, HTTP helpers, content cleaning, dedup, schema-export integrity checks) lives in `scripts/lib/`.
2. **Assistant / MCP layer** — answers questions against the built KBs. Key pieces: `erp_knowledge_assistant.mjs` (rule-based router across KBs — namespace routing rules live in `docs/reference/ERP_Knowledge_Assistant_Routing.json`), `erp_knowledge_answer.mjs` (answer generation), `erp_knowledge_mcp_server.mjs` (stdio MCP) and `erp_knowledge_mcp_http_bridge.mjs` (HTTP bridge exposing `/health`, `/mcp`, `/sse`). Regression baseline is `run_erp_knowledge_testpack.mjs` (`--size 100|200`, expected `200 PASS / 0 PARTIAL / 0 MISS`). A separate commercial integration lives under `betterfly_*` (client, MCP core, HTTP bridge) with its own privacy layer (`scripts/lib/betterfly_privacy.mjs`).
3. **Operations dashboard** (`src/`, served by `scripts/erp_kb_dashboard_server.mjs`, built by Vite) — React SPA (no router library; page components like `Overview.jsx`, `SourcesPage.jsx`, `AutomationPage.jsx`, `InboxPage.jsx`, `McpPage.jsx` are switched in `App.jsx`) giving a UI over KB health, source discovery, the knowledge inbox, automation runs, and MCP status. `scripts/lib/dashboard_*.mjs` holds the server-side logic the dashboard's API surface calls into (audit, automation, discovery, autopilot).

### Knowledge inbox (write path)

New/updated knowledge proposed by discovery or manual review flows through a draft pipeline (`scripts/lib/knowledge_inbox.mjs`, `run_knowledge_inbox_pipeline.mjs`, `manage_knowledge_inbox.mjs`) into `downloads/knowledge_inbox/` and `docs/reference/knowledge_inbox/promoted/<KB>/`. This path only writes local drafts — it never mutates OpenSPG directly; promotion into a KB still goes through the normal export/build scripts.

### Reports and operational memory

`docs/reference/` doubles as both narrative documentation and a machine-readable state store: many `.md` reports have a paired `.json` (e.g. `ERP_KB_Dashboard_Canary_Readiness_Report.{md,json}`, `KB_Quality_Gate_Report.{md,json}`, `Optima_Reference_Duplicate_Cleanup_Report.{md,json}`). These are regenerated by corresponding `scripts/*.mjs` runners (quality gate, drift checks, duplicate cleanup, freshness reports) — treat them as generated output, not hand-authored docs, and regenerate via their script rather than hand-editing when the underlying state changes. `OpenSPG_KB_Operational_Memory.md` is the exception: it's the durable, hand-maintained memory of confirmed facts about the live OpenSPG instance.

### Cron / automation

Several `scripts/cron_*.sh` wrappers (schema drift, quality-gate autoheal, community-news refresh, taxbell refresh, dashboard source scan) are invoked by the host's crontab/systemd timers outside this repo — check `scripts/generate_mcp_systemd_unit.mjs` and the `cron_*` scripts themselves for the invocation contract before changing their CLI args or output paths, since external schedulers depend on them.

### Data and secrets

`data/` (service state) and `.env*` are gitignored and must never be hand-edited or reviewed for content changes — treat `data/` as opaque runtime state. Provider secrets used by scripts are handled via `scripts/lib/provider_secrets.mjs`, not inlined in scripts.
