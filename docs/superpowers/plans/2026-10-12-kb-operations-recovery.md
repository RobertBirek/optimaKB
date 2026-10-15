# KB Operations Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recover failed and stale KB pipelines through scoped exports and builds, then resume automation only when its quality gates are clear.

**Architecture:** The existing pipeline scripts remain the only write path: `refresh_official_reference_delta.mjs` refreshes official source snapshots, `run_knowledge_inbox_pipeline.mjs` coordinates scoped exports and builds, and each KB-specific exporter produces staged CSVs. Quality and freshness reports provide the acceptance criteria after each bounded operation.

**Tech Stack:** Node.js ESM scripts, OpenSPG builder API, CSV staging manifests, dashboard HTTP API.

## Global Constraints

- Do not modify `data/`, `downloads/`, or `exports/` by hand.
- Do not print, persist, or inspect secrets, cookies, or tokens.
- Do not change automation thresholds, throttles, allowlists, or candidate decisions without explicit operator approval.
- Run scoped exports and builds; do not use `--all` as a recovery shortcut.
- Preserve unrelated worktree changes and generated operational files.
- Stop and diagnose a KB-specific failed build before retrying it.

---

### Task 1: Establish a reproducible recovery baseline

**Files:**
- Read: `docs/reference/KB_Quality_Gate_Report.md`
- Read: `docs/reference/KB_Source_Freshness_Report.md`
- Read: `docs/reference/Official_Reference_Delta_Refresh_Report.md`
- Read: `docs/reference/ERP_KB_Dashboard_Canary_Readiness_Report.md`
- Read: `docs/reference/ERP_KB_Quality_Weekly_Report.md`

**Interfaces:**
- Consumes: dashboard reports and `scripts/kb_quality_gate.mjs`.
- Produces: a dated baseline that identifies the Betterfly and Business Semantics blockers before writes begin.

- [ ] **Step 1: Validate the repository metadata map**

Run: `python3 scripts/validate-module-map.py`

Expected: `Mapa modułów: OK (4 modułów)`.

- [ ] **Step 2: Capture current scoped gate results**

Run: `node scripts/kb_quality_gate.mjs --kb ComarchBetterflyReference --kb ComarchOptimaBusinessSemantics`

Expected: Business Semantics reports `Promoted drafts without visible business descriptions: 3`; record the exact Betterfly job status without editing staged files.

- [ ] **Step 3: Confirm automation safety state**

Run: `curl -fsS http://10.10.254.42:3410/panel/api/automation/autopilot`

Expected: no frozen KBs or domains. Retain the existing domain throttle unchanged.

### Task 2: Recover the Betterfly scoped refresh

**Files:**
- Read: `scripts/refresh_official_reference_delta.mjs:342-378`
- Read: `scripts/build_betterfly_reference.mjs`
- Read: `exports/betterfly_reference/v1/build_betterfly_reference_jobs_manifest.json`
- Read: `exports/betterfly_reference/v1/upload_betterfly_reference_manifest.json`
- Read: `docs/reference/Official_Reference_Delta_Refresh_Report.md`
- Test: `scripts/test_build_wrapper_invocation.mjs`

**Interfaces:**
- Consumes: registered Betterfly snapshots and the `betterfly_reference` build profile.
- Produces: a new Betterfly build manifest whose relevant jobs have status `FINISH`.

- [ ] **Step 1: Run the build-runner regression before operational recovery**

Run: `node scripts/test_build_wrapper_invocation.mjs`

Expected: exit code `0`.

- [ ] **Step 2: Inspect the previous scoped build result**

Run: `node -e "const fs=require('fs');const p='exports/betterfly_reference/v1/build_betterfly_reference_jobs_manifest.json';const m=JSON.parse(fs.readFileSync(p,'utf8'));console.log(JSON.stringify(m.jobs||m,null,2))"`

Expected: identify the non-`FINISH` job and its error. If the manifest has no failure details, inspect the corresponding OpenSPG builder job using its recorded ID and `start=1`.

- [ ] **Step 3: Re-run only the Betterfly official delta pipeline**

Run: `node scripts/refresh_official_reference_delta.mjs --kb betterfly --build --freshness --quality`

Expected: the script refreshes only Betterfly, exports only changed staging files, and starts only the required builder jobs. If it exits nonzero, do not rerun: record the returned command stderr and repair only its confirmed cause before repeating this step.

- [ ] **Step 4: Verify Betterfly state**

Run: `node scripts/kb_quality_gate.mjs --kb ComarchBetterflyReference && node scripts/source_freshness_report.mjs`

Expected: Betterfly required CSVs and builder jobs are `FINISH`; its freshness entry does not report an export older than its newest source.

### Task 3: Restore promoted Business Semantics coverage

**Files:**
- Read: `scripts/export_optima_business_semantics.mjs:621-645`
- Read: `scripts/kb_quality_gate.mjs:354-360`
- Read: `scripts/lib/promoted_knowledge.mjs`
- Test: `scripts/test_optima_business_semantics_promoted.mjs`
- Test: `scripts/test_kb_quality_gate_business_semantics.mjs`

**Interfaces:**
- Consumes: promoted draft JSON records from `loadPromotedKnowledge('ComarchOptimaBusinessSemantics')`.
- Produces: `business_description.csv` rows identified by `makePromotedId('BD_PROMOTED', `${draft.id}_${segmentNumber}`)`.

- [ ] **Step 1: Run the isolated exporter and quality-gate tests**

Run: `node scripts/test_optima_business_semantics_promoted.mjs && node scripts/test_kb_quality_gate_business_semantics.mjs`

Expected: both commands exit `0`, proving the exporter and gate cover promoted descriptions in isolated fixtures.

- [ ] **Step 2: Compare production promoted IDs with export coverage**

Run: `node scripts/kb_quality_gate.mjs --kb ComarchOptimaBusinessSemantics --json-only`

Expected: reproduce the current missing-description count. Compare the reported missing draft IDs with the promoted records through `loadPromotedKnowledge`; do not modify promoted JSON manually.

- [ ] **Step 3: Re-export and rebuild only Business Semantics**

Run: `node scripts/process_knowledge_inbox.mjs --kb ComarchOptimaBusinessSemantics --export --build --no-test`

Expected: the pipeline forces `business_description.csv` as declared in `scripts/run_knowledge_inbox_pipeline.mjs:46-52`. If the rebuild does not create all promoted-description rows, stop and correct the production-only discrepancy in the exporter or promoted-record loader, adding an isolated regression test first.

- [ ] **Step 4: Verify the scoped quality result**

Run: `node scripts/kb_quality_gate.mjs --kb ComarchOptimaBusinessSemantics`

Expected: no `Promoted drafts without visible business descriptions` error and no builder job for this KB left outside `FINISH`.

### Task 4: Bring Taxbell exports up to date one KB at a time

**Files:**
- Read: `scripts/lib/taxbell_reference_config.mjs`
- Read: `scripts/export_taxbell_legal_reference.mjs`
- Read: `scripts/export_taxbell_payroll_hr_reference.mjs`
- Read: `scripts/export_taxbell_accounting_vat_reference.mjs`
- Read: `scripts/source_freshness_report.mjs`
- Test: `scripts/test_taxbell_reference_duplicate_ids.mjs`

**Interfaces:**
- Consumes: Taxbell source registries and each KB-specific export wrapper.
- Produces: a current manifest and successful scoped builder job for each refreshed Taxbell namespace.

- [ ] **Step 1: Verify the Taxbell duplicate-ID safeguard**

Run: `node scripts/test_taxbell_reference_duplicate_ids.mjs`

Expected: exit code `0` before regenerating any Taxbell staging CSV.

- [ ] **Step 2: Process Legal only**

Run: `node scripts/process_knowledge_inbox.mjs --kb TaxbellLegalReference --export --build --no-test --freshness`

Expected: a successful Legal builder result and a freshness report that no longer says its export is older than its newest source.

- [ ] **Step 3: Process Payroll HR only**

Run: `node scripts/process_knowledge_inbox.mjs --kb TaxbellPayrollHRReference --export --build --no-test --freshness`

Expected: a successful Payroll HR builder result and a current export manifest.

- [ ] **Step 4: Process Accounting VAT only**

Run: `node scripts/process_knowledge_inbox.mjs --kb TaxbellAccountingVATReference --export --build --no-test --freshness`

Expected: a successful Accounting VAT builder result and a current export manifest.

- [ ] **Step 5: Verify all refreshed Taxbell KBs**

Run: `node scripts/kb_quality_gate.mjs --kb TaxbellLegalReference --kb TaxbellPayrollHRReference --kb TaxbellAccountingVATReference && node scripts/source_freshness_report.mjs`

Expected: all three scoped quality verdicts are `PASS` and no Taxbell entry reports `Export manifest is older than newest source file.`

### Task 5: Handle manual Optima refreshes and discovery triage

**Files:**
- Read: `docs/reference/KB_Source_Freshness_Report.md`
- Read: `docs/reference/Knowledge_Inbox.md`
- Read: `docs/reference/ERP_Knowledge_Assistant_Routing.json`
- Read: `scripts/refresh_official_reference_delta.mjs:189-236`

**Interfaces:**
- Consumes: official Optima snapshot registry and the dashboard discovery API.
- Produces: an evidence-based decision for each manual KB and a documented, non-mutating discovery review.

- [ ] **Step 1: Preview the Optima delta without writing files**

Run: `node scripts/refresh_official_reference_delta.mjs --kb optima --dry-run --max-sources 0`

Expected: a report listing changed and failed official Optima sources without local writes or builds.

- [ ] **Step 2: Refresh only confirmed changed Optima sources**

Run: `node scripts/refresh_official_reference_delta.mjs --kb optima --build --freshness --quality`

Expected: the script builds only changed Optima export files. If no official source changed, it performs no build; leave partner-authenticated material untouched.

- [ ] **Step 3: Export discovery facts without applying decisions**

Run: `curl -fsS http://10.10.254.42:3410/panel/api/discovery`

Expected: retain the existing three unknown-domain candidates for manual review. Do not call PATCH endpoints, approve allowlist changes, or promote candidates in this task.

- [ ] **Step 4: Review the low-acceptance schema query and backlog**

Run: `curl -fsS http://10.10.254.42:3410/panel/api/discovery | jq '[.discovery.queries[] | select(.id == "seed_ComarchOptimaSchema") | {id, query, analytics, lastRunAt, lastResultCount}]'`

Expected: record the query's rejection evidence and propose a narrower replacement separately; do not change the query in-place without operator approval. Prioritize manual review of Taxbell Legal candidates and inbox drafts.

### Task 6: Final gate and controlled automation resumption

**Files:**
- Read: `docs/reference/ERP_KB_Dashboard_Canary_Readiness_Report.md`
- Read: `docs/reference/ERP_KB_Quality_Weekly_Report.md`
- Read: `docs/reference/KB_Quality_Gate_Report.md`
- Read: `docs/reference/KB_Source_Freshness_Report.md`

**Interfaces:**
- Consumes: quality, freshness, LLM health, autopilot, and canary dashboard endpoints.
- Produces: a go/no-go decision to resume automation, with no threshold or throttle change.

- [ ] **Step 1: Run final scoped validation**

Run: `npm run check && node scripts/kb_quality_gate.mjs --kb ComarchBetterflyReference --kb ComarchOptimaBusinessSemantics --kb TaxbellLegalReference --kb TaxbellPayrollHRReference --kb TaxbellAccountingVATReference --kb ComarchOptimaReference && node scripts/source_freshness_report.mjs`

Expected: `npm run check` exits `0`; the quality and freshness reports identify no unresolved blocker from Tasks 2-4.

- [ ] **Step 2: Read the current automation and LLM state**

Run: `curl -fsS http://10.10.254.42:3410/panel/api/automation && curl -fsS http://10.10.254.42:3410/panel/api/automation/autopilot`

Expected: LLM health is `PASS`, there are no frozen KBs or domains, and the pre-existing `spolecznosc.comarch.pl` throttle remains unchanged.

- [ ] **Step 3: Resume automation only when all gates are clear**

Run: use the dashboard Automation control with the existing CSRF-protected, authenticated session to resume automation.

Expected: the canary report changes from `BLOCKED` to a state with no `Automation must be enabled and resumed.` blocker. If any Task 2-4 check failed, do not resume automation and report the exact blocker.

## Plan Self-Review

- Spec coverage: Tasks 2-6 cover Betterfly, Business Semantics, Taxbell, manual Optima refreshes, discovery review, and conditional automation resumption.
- Scope: every write uses an existing scoped script or dashboard action; no direct runtime-file edits or whole-platform rebuilds are included.
- Testing: Tasks 2-4 begin with existing targeted regressions, and Task 6 runs the project syntax check and final operational reports.
- Placeholder scan: the plan uses no TBD/TODO markers and specifies commands, files, expected outputs, and stop conditions for each task.
