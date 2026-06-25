# ERP KB Dashboard Runbook

The ERP KB dashboard is a desktop-only intranet panel for KB operations,
automatic LLM review, publication validation, and rollback.

The current UI is a React/Vite frontend served by the same dashboard backend from `dist/dashboard/`. The old server-rendered HTML remains only as a fallback when the frontend build is missing.

## URL

NPMplus route:

```text
http://kag.taxbell.local/panel -> http://10.10.254.42:3410
```

Backend defaults:

```text
host: 10.10.254.42
port: 3410
base path: /panel
```

## Service

Environment file:

```text
/etc/erp-kb-dashboard.env
```

Systemd unit:

```text
/etc/systemd/system/erp-kb-dashboard.service
```

Useful checks:

```bash
systemctl status erp-kb-dashboard.service
curl -sS http://10.10.254.42:3410/panel/health
curl -u "$ERP_KB_DASHBOARD_USER:$ERP_KB_DASHBOARD_PASSWORD" http://10.10.254.42:3410/panel/api/status
```

Frontend build:

```bash
npm install
npm run build
sudo systemctl restart erp-kb-dashboard.service
```

Proxy path checks:

```bash
curl -sS -I -H "Host: kag.taxbell.local" http://10.10.254.46/panel/health
curl -sS -k --resolve kag.taxbell.local:443:10.10.254.46 https://kag.taxbell.local/panel/health
```

If the direct backend check works but the HTTPS proxy path returns `502 Bad Gateway`, verify the NPMplus host entry for `kag.taxbell.local` on `10.10.254.46`. The expected upstream is:

```text
http://10.10.254.42:3410
```

Do not set the upstream itself to `/panel`; `/panel` is the application base path and must remain in the request URL.

## Scope

The dashboard v1 can:

- show KB status, reports, cron entries, inbox counts, and dashboard charts
- show an overview tab with global quality/freshness/delta/status metrics
- split operational views into tabs for KB, reports, inbox, draft creation, source/registry state, and system state
- list recent inbox drafts
- filter inbox drafts by status
- preview a draft from the inbox without promoting it
- approve a `pending` draft, run the target KB exporter, and run the OpenSPG builder as a tracked background dashboard action
- create new knowledge drafts from fetched URLs, pasted text, `.md`, `.txt`, or `.pdf`
- pre-analyze draft title, target KB, tags, source metadata, and extracted content before saving
- run best-effort PDF text extraction for selectable text
- expose read-only JSON endpoints for health, status, reports, inbox, and draft detail
- detect export directories that are not yet configured in the dashboard KB registry
- automatically review new drafts with an LLM
- publish an approved draft immediately through export and OpenSPG build
- compare post-build quality/testpack results with the previous baseline
- automatically restore the previous promoted state and rebuild after regression
- pause automation globally and retry exception jobs from the UI
- propose a target-KB reroute without moving or publishing the draft
- collect operator adjudications for live shadow jobs
- enforce a formal canary gate before publication mode can be enabled
- probe the reviewer LLM periodically and pause automation after repeated failures
- apply an operator-confirmed reroute to a pending draft and run a second shadow review
- keep a tamper-evident append-only audit log for mutations and background state changes
- discover new official/community/professional sources across all 10 KBs
- generate focused discovery queries weekly with an LLM
- keep scheduled discovery in forced dry-run until an operator accepts candidates

The UI targets desktop widths of `1280px` and wider. Mobile layout is not a
supported product requirement.

## PDF Handling

PDF extraction uses the existing local `scripts/lib/pdf_text.mjs` helper. This is best-effort selectable-text extraction, not OCR. Scanned/image-only PDFs are saved as uploads and converted into a warning draft so an operator can add a Markdown/TXT companion before promotion.

## Automatic Source Discovery

Discovery covers all 10 registered KB namespaces. Profiles define allowed
domains, source tiers, topics, and one of three handling modes:

- `DIRECT_DRAFT`: a high-confidence candidate may be converted to a pending draft
- `CANDIDATE_ONLY`: schema, Additional Functions, and Sprint sources require an operator decision
- `PARTNER_ROUTE`: partner portal results are queued for matching with the existing partner asset/downloader pipeline

Scheduled execution is deliberately non-mutating:

```bash
node scripts/run_dashboard_discovery.mjs --daily --dry-run --limit 3
node scripts/run_dashboard_discovery.mjs --weekly
```

The daily run searches active seed and generated queries, asks the LLM to
assess relevance/risk/novelty, applies deterministic domain and confidence
gates, deduplicates URLs against both previous discovery candidates and the
existing source registries, and stores new candidates under:

```text
data/dashboard/discovery/candidates/
```

Dry-run query work uses bounded concurrency (`3` by default). Draft-creating
runs remain sequential so per-KB budget checks cannot race.

The weekly run uses current candidate outcomes and selected quality/freshness
reports to generate focused queries. Generated queries expire after 28 days
and are disabled after three consecutive empty runs.

The `Sources / Refresh` tab includes a stable calibration sample of `30`
candidates, selected evenly across the 10 KBs. Operators can filter by KB,
recommended action, source tier, confidence, decision state, and free text.
The UI presents three separate source layers:

- `Stałe monitory źródeł`: manually configured URL/RSS/sitemap/Exa monitors
- `Automatyczne zapytania discovery`: seed and weekly-generated search definitions
- `Znalezione źródła`: individual result pages awaiting triage or marked duplicate

Discovery results intentionally do not become permanent monitors. The summary
cards and section names expose the counts for all three layers to avoid treating
the configured monitor list as a complete result registry.
The desktop screen renders these layers as tabs with counters. A fourth
`Historia` tab contains source/discovery actions. Only the active table is
rendered, and contextual actions use icon buttons with keyboard-accessible
labels and tooltips.
Candidate rows support individual and bulk decisions:

- create pending draft
- route to the partner pipeline
- reject

The current operator layer also includes:

- deterministic candidate priority (`0-100`) based on source tier, confidence,
  freshness, recommended action, risk, and current KB queue depth
- a source-detail modal with fetched content, LLM rationale, risk metadata,
  decision history, and duplicate provenance
- locally saved filter views for each desktop browser profile
- a ten-minute audited undo window for operator rejection and partner routing
- per-query efficiency, duplicate rate, acceptance outcomes, health, and
  refinement/retirement recommendation
- automatic retirement of generated queries after repeated empty or
  duplicate-heavy runs; seed queries are only flagged for review

The `Briefing` tab reads:

```text
docs/reference/ERP_KB_Discovery_Daily_Briefing.json
docs/reference/ERP_KB_Discovery_Daily_Briefing.md
```

It contains the current priority queue, query problems, source-quality alerts,
and semi-automatic draft gate. The briefing is regenerated with every discovery
coverage refresh, including the daily scheduled run.

Source-quality alerts currently cover:

- monitor scan errors and monitors without a successful scan for over three days
- URL monitors returning content from a different hostname
- repeated empty discovery queries
- discovery queries with at least 80% corpus duplicates
- unresolved candidates from domains outside configured trust profiles

Semi-automatic mode can only create pending drafts from official domains and
allowed KB namespaces. It never promotes, exports, builds, or publishes. Its
default gate requires at least `30` operator decisions, `90%` recommendation
agreement, no more than `5%` false positives, at least `7` observation days,
minimum candidate confidence `0.95`, and an explicit admin enablement. The
production discovery systemd profile still forces dry-run, so the gate remains
inactive until that separate safety control is intentionally changed.

Bulk operations accept at most `50` candidate ids. They may partially succeed,
for example when a per-KB draft budget is exhausted. Every result remains
audited per candidate and under one bulk action id.

Before a manual draft or partner route is executed, the URL is checked again
against the current corpus registries and knowledge inbox. A match is marked as
`DUPLICATE`, audited, and excluded from the calibration sample. This prevents
stale candidates from recreating content that was ingested after discovery.

Operator decisions are stored separately from the original LLM recommendation.
The feedback report tracks:

- reviewed and accepted/rejected candidates
- recommendation agreement for evaluable actions
- false-positive actionable recommendations
- false-negative reject recommendations
- held candidates resolved by an operator
- metrics by KB, tier, action, and query

The weekly planner receives only these aggregated metrics and recent operator
notes. It also receives bounded per-query yield counters, including how many
last-run results were already present in the corpus. It does not receive raw
candidate content through the feedback layer.

Safety controls:

- systemd forces `ERP_KB_DISCOVERY_DRY_RUN=1`
- no discovery action promotes, exports, builds, or writes to OpenSPG
- operator draft conversion is limited to `3` per KB per day and `10` per KB per week
- unknown domains and high-risk assessments cannot create drafts automatically
- partner results are routed, not directly drafted
- every run and candidate decision is recorded in the dashboard audit chain

Timers:

```text
erp-kb-dashboard-discovery-daily.timer   04:45 daily
erp-kb-dashboard-discovery-weekly.timer  Sunday 05:30
```

Install or refresh the timer pack:

```bash
sudo install -m 0644 docs/reference/ERP_KB_Dashboard_Discovery_Daily.systemd \
  /etc/systemd/system/erp-kb-dashboard-discovery-daily.service
sudo install -m 0644 docs/reference/ERP_KB_Dashboard_Discovery_Daily.timer \
  /etc/systemd/system/erp-kb-dashboard-discovery-daily.timer
sudo install -m 0644 docs/reference/ERP_KB_Dashboard_Discovery_Weekly.systemd \
  /etc/systemd/system/erp-kb-dashboard-discovery-weekly.service
sudo install -m 0644 docs/reference/ERP_KB_Dashboard_Discovery_Weekly.timer \
  /etc/systemd/system/erp-kb-dashboard-discovery-weekly.timer
sudo touch \
  docs/reference/ERP_KB_Discovery_Coverage_Report.json \
  docs/reference/ERP_KB_Discovery_Coverage_Report.md
sudo chown mcpbot:mcpbot \
  docs/reference/ERP_KB_Discovery_Coverage_Report.json \
  docs/reference/ERP_KB_Discovery_Coverage_Report.md
sudo chmod 0664 \
  docs/reference/ERP_KB_Discovery_Coverage_Report.json \
  docs/reference/ERP_KB_Discovery_Coverage_Report.md
sudo systemctl daemon-reload
sudo systemctl enable --now \
  erp-kb-dashboard-discovery-daily.timer \
  erp-kb-dashboard-discovery-weekly.timer
```

Coverage report:

```text
docs/reference/ERP_KB_Discovery_Coverage_Report.json
docs/reference/ERP_KB_Discovery_Coverage_Report.md
```

## Add Draft Analysis

The `Add Draft` tab has three input modes:

- `URL` fetches source content before saving. If `EXA_API_KEY` is configured for the dashboard service, the backend uses Exa Contents API first; otherwise it falls back to direct HTTP fetch.
- `Tekst` analyzes pasted content and can keep an optional source URL for provenance.
- `Plik` accepts `.md`, `.txt`, `.pdf`, and text/code examples such as `.xml`, `.xpt`, `.xsd`, `.json`, `.jsonl`, `.vb`, `.vbs`, `.bas`, `.sql`, `.js`, `.ts`, `.cs`, `.ps1`, `.bat`, `.cmd`, `.html`, `.css`, `.ini`, `.cfg`, `.conf`, `.yml`, `.yaml`, and `.csv` through normal file selection or drag and drop.

The analysis step writes no KB draft. It returns generated `title`, `kbNamespace`, `tags`, `content`, source metadata, and warnings. The operator can edit those fields and then click `Zapisz draft`.

Optional service configuration in `/etc/erp-kb-dashboard.env`:

```text
EXA_API_KEY=<secret>
EXA_CONTENTS_API_URL=https://api.exa.ai/contents
EXA_REQUEST_TIMEOUT_MS=15000
OPENSPG_API_BASE=http://10.10.254.42:8887
ERP_KB_MCP_BASE_URL=http://10.10.254.42:3400
OPENSPG_LLM_ENDPOINT=/v1/chat/completions
OPENSPG_LLM_APP_ID=<app_id>
OPENSPG_LLM_SESSION_ID=<session_id>
ERP_KB_DRAFT_ANALYZE_MAX_CHARS=28000
ERP_KB_DRAFT_LLM_INPUT_MAX_CHARS=6000
ERP_KB_AUTOMATION_ENABLED=0
ERP_KB_AUTOMATION_MIN_CONFIDENCE=0.85
ERP_KB_AUTOMATION_SHADOW_ONLY=1
ERP_KB_AUTOMATION_ALLOWED_NAMESPACES=ComarchCommunityNews
ERP_KB_AUTOMATION_LLM_INPUT_MAX_CHARS=12000
ERP_KB_AUTOMATION_LLM_TIMEOUT_MS=60000
ERP_KB_AUTOMATION_CANARY_MIN_SAMPLES=20
ERP_KB_AUTOMATION_CANARY_MIN_ACCURACY=0.95
ERP_KB_AUTOMATION_CANARY_MAX_FALSE_POSITIVES=0
ERP_KB_AUTOMATION_LLM_HEALTH_FAILURE_THRESHOLD=2
ERP_KB_AUTOMATION_LLM_HEALTH_MAX_AGE_MS=1800000
```

Technical/code uploads are treated as UTF-8 text and wrapped in a fenced code block inside the draft so examples for Additional Functions, sPrint/prints, XML templates, JSON payloads, SQL snippets, and VB/VBS code keep their formatting. If Exa or OpenSPG LLM is not configured, analysis still works through direct HTTP fetch and local heuristics. `/panel/api/status` reports whether Exa and LLM are configured without exposing secret values.

The dashboard overview exposes direct desktop links to OpenSPG knowledge bases,
applications, app `2`, model settings, and the ERP KB MCP health endpoint.
`OPENSPG_API_BASE` and `ERP_KB_MCP_BASE_URL` are the authoritative base
addresses for those links. The app `2` tile remains marked as a warning until
the known OpenSPG app-to-project runtime mapping defect is resolved.

## Automatic Review Workflow

Automation is disabled by default in the example configuration. Configure and verify
`OPENSPG_LLM_APP_ID`, `OPENSPG_LLM_SESSION_ID`, the OpenSPG cookie, and the
target model before enabling it in the `Automatyzacja` tab.

The current live profile uses `shadowOnly=true`, an allowlist containing only
`ComarchCommunityNews`, and confidence `0.90`. In this mode the LLM decision is
recorded but promotion and OpenSPG build are never executed.

Provision or verify the dedicated reviewer with:

```bash
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie \
  node scripts/provision_dashboard_llm_reviewer.mjs
```

This OpenSPG build incorrectly starts reasoner tasks with `projectId=appId`.
The provisioner creates a reviewer whose app id matches an existing project id,
then performs a real JSON probe before returning a usable app/session pair.

The automatic state machine is:

```text
PENDING -> REVIEWING -> APPROVED -> BUILDING -> VALIDATING -> PUBLISHED
                                      |
                                      +-> ROLLING_BACK -> ROLLED_BACK
```

Negative, ambiguous, low-confidence, duplicate, or high-risk decisions enter
`EXCEPTION`. A confident, low-risk decision targeting another KB ends in
`REROUTE_PROPOSED`. It never moves, promotes, exports, or builds the draft.

Shadow jobs end in `SHADOW_COMPLETE` or `REROUTE_PROPOSED`. Their
`shadow.actualAction` is `publish`, `hold`, or `reroute`. Live jobs can be
adjudicated by an operator in the UI; historical benchmark jobs are excluded
from the publication gate.

The canary queue contains only completed, live shadow jobs without an operator
adjudication. It is ordered by reroute proposals, risk, lower confidence, and
age. The `Oceń następny` action opens the highest-priority item.

An accepted reroute is a two-step operation:

1. adjudicate the proposal as `Przekieruj`
2. use `Zastosuj reroute i sprawdź`

The second step updates only the pending raw draft's `kbName` and
`kbNamespace`, appends `metadata.routingHistory`, and starts a new shadow
review in the target KB. It does not promote, export, or build anything.
The same proposal cannot be applied twice.

The canary publication gate requires all of the following:

- at least `20` adjudicated live shadow samples
- at least `95%` correct actions
- `0` false-positive publish decisions
- a current passing LLM health check
- no active automation jobs or rollback failures
- explicit admin approval

Changing the routing/confidence policy or revoking approval forces
`shadowOnly=true`. The live systemd override also forces shadow mode, so passing
the gate alone cannot enable publication until that deployment override is
removed deliberately.

`erp-kb-dashboard-llm-health.timer` runs every 15 minutes. Two consecutive
probe failures pause automation, revoke publication approval, and force shadow
mode. A later successful probe clears the health failure counter but does not
resume automation automatically.

The generated readiness report is available at:

- `docs/reference/ERP_KB_Dashboard_Canary_Readiness_Report.json`
- `docs/reference/ERP_KB_Dashboard_Canary_Readiness_Report.md`

The minimum sample count uses unique draft ids. Accuracy and false positives
use all adjudicated decisions, so a reroute followed by a second review cannot
inflate the sample count.

## Audit Log

Audit events are appended under `data/dashboard/audit/YYYY-MM-DD.jsonl`.
Each event contains the hash of the previous event and its own SHA-256 hash.
Secrets, cookies, authorization headers, passwords, and tokens are redacted.

The audit covers:

- every accepted mutating dashboard HTTP request and its response status
- automation configuration, health, job transitions, adjudications, and gate approval
- reroute application with before/after KB routing
- direct draft promote, reject, and withdraw operations
- dashboard background action status transitions

The System tab displays chain verification and recent events to admins.
Use the admin-only `GET /panel/api/audit` endpoint for filtered retrieval.

The deterministic gates run before the LLM and block invalid namespace,
invalid/binary content, duplicate source/content, and invalid source URL.
Source fetches also reject private/local IP addresses and validate redirects.

Manual CLI operations:

```bash
node scripts/run_dashboard_automation.mjs --draft <draft_id>
node scripts/run_dashboard_automation.mjs --pending
node scripts/run_dashboard_automation.mjs --retry <automation_job_id>
node scripts/run_dashboard_automation.mjs --shadow <draft_id>
node scripts/run_dashboard_automation.mjs --shadow-history
node scripts/run_dashboard_automation.mjs --shadow-history --namespace ComarchCommunityNews
```

The latest benchmark is stored in
`docs/reference/ERP_KB_Dashboard_Shadow_Review_Report.json` and `.md`.

State is stored under `data/dashboard/automation/`. Each job records the
prompt version, content hash, deterministic gates, LLM decision, state
transitions, pipeline output, validation result, and rollback result.

## API

All endpoints except `/panel/health` require Basic Auth when configured in `/etc/erp-kb-dashboard.env`.
The original `ERP_KB_DASHBOARD_USER` account is treated as `admin`. Optional
`operator` and `viewer` accounts can be configured with the corresponding
environment variables. Viewers are read-only; operators can run workflows;
only admins can change automation configuration.
Mutating endpoints additionally require the per-process
`X-ERP-KB-CSRF` token returned by authenticated `GET /panel/api/status`.
The React UI handles this automatically.

```text
GET  /panel/health
GET  /panel/api/status
GET  /panel/api/inbox
GET  /panel/api/drafts/{draft_id}
GET  /panel/api/actions
GET  /panel/api/actions/{action_id}
GET  /panel/api/automation
POST /panel/api/automation/run
POST /panel/api/automation/llm-health/run
POST /panel/api/automation/jobs/{job_id}/adjudicate
POST /panel/api/automation/jobs/{job_id}/reroute/apply
POST /panel/api/automation/promotion/approve
GET  /panel/api/audit
GET  /panel/api/discovery
POST /panel/api/discovery/run
PATCH /panel/api/discovery/policy
PATCH /panel/api/discovery/queries/{query_id}
POST /panel/api/discovery/candidates/{candidate_id}/draft
POST /panel/api/discovery/candidates/{candidate_id}/route
POST /panel/api/discovery/candidates/{candidate_id}/reject
POST /panel/api/discovery/candidates/bulk
GET  /panel/api/reports/{report_key}?format=json
GET  /panel/api/reports/{report_key}?format=md
POST /panel/api/drafts
POST /panel/api/drafts/analyze
POST /panel/api/drafts/{draft_id}/promote-export
PATCH /panel/api/automation/config
POST /panel/api/automation/run
POST /panel/api/automation/jobs/{job_id}/retry
```

`POST /panel/api/drafts` is intentionally limited to draft creation under `downloads/knowledge_inbox/`. It does not promote content, rebuild exporters, or write to OpenSPG.

`POST /panel/api/drafts/analyze` accepts multipart form data and returns a preview payload. It does not create, promote, export, or build anything.

The dashboard `Zatwierdź` button calls `POST /panel/api/drafts/{draft_id}/promote-export`. It performs a preflight check for writable action logs, writable promoted draft storage, and readable OpenSPG cookie, then starts a background action that runs:

```bash
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie node scripts/process_knowledge_inbox.mjs --promote <draft_id> --export --build --freshness --by <dashboard_user> --note "Approved, exported, and built from dashboard"
```

Action state and logs are written under `logs/dashboard_actions/` and are visible in the dashboard `System` tab. The log contains the command, target draft, target KB, preflight context, exporter output, OpenSPG auth check output, builder output, and final exit code.

`GET /panel/api/status` includes the legacy fields `overall`, `kbs`, `reports`, `inbox`, and `crontab`, plus frontend-oriented sections:

- `summary` for KPI tiles
- `charts` for dashboard charts
- `discoveredKbs` for export directories not present in the registry
- `kbRegistry` for the configured KB source of truth
- `system` for backend/frontend paths and runtime metadata

## KB Registry

The dashboard uses a hybrid KB model:

- configured KBs come from `docs/reference/ERP_KB_Dashboard_KB_Registry.json`
- unconfigured export directories are detected from `exports/*/v1/_manifest.json`

To add a future KB to the dashboard, add a registry entry with:

```json
{
  "namespace": "ExampleNamespace",
  "kbName": "Example KB",
  "category": "Example",
  "exportDir": "exports/example/v1",
  "buildManifestPath": "exports/example/v1/build_example_jobs_manifest.json",
  "primaryFiles": ["reference_document.csv", "chunk.csv"],
  "enabled": true
}
```

The dashboard will then include the KB in the main KB tab and overview charts. If the export exists but no registry entry is present, it appears in `Sources / Refresh` as detected but not configured.

## Smoke Test

Read-only dashboard validation:

```bash
node scripts/test_erp_kb_dashboard.mjs
```

Isolated automation validation:

```bash
npm run test:automation
```

Isolated discovery validation:

```bash
npm run test:discovery
```

This test uses a temporary `ROOT`, mock LLM responses, and a mock build
pipeline. It verifies publication, rollback, shadow no-mutation, reroute
proposals, health-check auto-pause, manual-resume semantics, and the canary
publication gate without touching production data or OpenSPG.

## Recovery

- `EXCEPTION`: fix configuration or source data, then use `Ponów job`.
- `ROLLED_BACK`: the previous promoted files and registry entry were restored,
  and the previous KB state was rebuilt.
- `ROLLBACK_FAILED`: pause automation immediately and inspect the job detail,
  OpenSPG authentication, exporter output, and build manifests.
- Stale lock files are automatically removed when their process no longer
  exists or after `ERP_KB_AUTOMATION_LOCK_STALE_MS`.

The test reads credentials from `/etc/erp-kb-dashboard.env` by default, checks `/health`, verifies that unauthenticated `/api/status` is rejected when auth is enabled, checks authenticated `/api/status`, and reads one draft detail if the inbox is non-empty.

The hardened service cannot execute the setgid `crontab -l` helper because
`NoNewPrivileges=true`. The System tab therefore falls back to
`ERP_KB_SOURCE_SCAN_CRON_SCHEDULE` for the known source scanner entry while
keeping the stronger sandbox.

The source-scan cron now also runs Optima Reference duplicate cleanup after the
scan. Exact `sourceUrl` matches between promoted drafts and official Optima
Reference rows are auto-withdrawn and reported as `REMEDIATED` in the dashboard
reports table with a warning alert.
