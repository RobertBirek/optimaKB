# Read-only Dashboard Summaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stop summary GETs from writing learning/reports and align discovery read metrics with the pipeline's 5000-candidate window.
**Architecture:** Non-persisted discovery snapshot shared by summary/learning/alerts; automation report rendering with explicit opt-out of persistence. Existing writers retain defaults.
**Tech Stack:** Node.js ESM, built-in test runner, synthetic filesystem fixtures and loopback HTTP.
**Spec:** `docs/superpowers/specs/2026-11-14-dashboard-readonly-summaries-design.md`.

## Global Constraints

No live requests, source deployment, restart, policy changes, cookie access, merge or push. Preserve unrelated production edits; worktree starts at committed `c114e24`.

## Review Focus

- More than 500 candidates: independent full-window noise rate, unchanged 500-row UI cap.
- Missing directories and malformed/stale reports: GET does not create, rewrite or repair.
- Existing operator overrides and pause/publication flags: preserved in memory and on disk.
- GET order: learning/alerts agree before and after discovery/status.
- Explicit writer calls: still persist and repair reports.

## Task 1: Reproduce and repair read-side persistence

Files: new `scripts/test_dashboard_readonly_summaries.mjs`; modify `scripts/lib/dashboard_discovery.mjs`, `scripts/lib/dashboard_automation.mjs`, `scripts/erp_kb_dashboard_server.mjs`.

- [x] Inspect bug, existing tests, side effects and dirty production diff; run baseline syntax checks.
- [x] Add regression fixtures (>500 candidates, stale state/overrides, corrupt/missing reports) and observe RED.
- [x] Implement non-persisted snapshots and read-only report rendering.
- [x] Verify GREEN and existing discovery/automation/feedback regression suites.
- [x] Independent whole-diff review; address blocking findings via RED→GREEN.
- [x] Record results, compatibility scope and integration needs.

Verification: `node --test scripts/test_dashboard_readonly_summaries.mjs`; `npm run check`; `node scripts/test_feedback_learning.mjs`; `npm run test:automation`; `npm run test:discovery`; `git diff --check`; module-map validation. Inspect test side effects before running. Do not run `scripts/test_erp_kb_dashboard.mjs` (live credentials/endpoints). No default `npm test` exists.

## Execution ledger

Pre-flight: discovery and automation share feedback derivation, but no algorithm/threshold changes are needed. Primary source differs from HEAD in unrelated observation/publication/content-fetch safeguards; the repair must remain a small applicable patch, not a whole-file replacement.
User authorized continuing the bounded repair; design is the short written scope above, not permission to resume automation.

### Evidence and scope decisions

- Initial RED: 5/6 tests failed for the expected defects (500 vs 531 rows, wrong noise, writes on GET, stale learning). Explicit writer positive control passed.
- Removing automatic report repair exposed an existing `/api/status` parse failure on malformed canary JSON. Reproduced RED (`Unexpected token b`) before adding bounded `INVALID` report status and alert, without repairing the file.
- Core GREEN 6/6; extended coverage GREEN 9/9, including opposite stale-noise direction, default priority/queue helper purity and empty-ROOT GETs.
- `npm run test:automation` PASS (18 named checks, including canary stability/artifact repair and no auto-resume).
- `npm run test:discovery` PASS (mocked pipeline, local HTTP fixtures only; fixture reports under temporary ROOT).
- `node scripts/test_feedback_learning.mjs` PASS (pure `persist:false` fixtures).
- `npm run check`, new test syntax, whitespace and module-map validation PASS.
- Main dirty sources remain untouched. A separate copy of current primary `scripts/` plus only our 3-file source patch passed all 9 new tests in `/tmp/opencode/dashboard-readonly-overlay-3cpnntq1`; log `/tmp/opencode/dashboard-readonly-overlay-test.log`.
- The compatibility overlay includes existing observation/publication/content-fetch safeguards, but is not a deployed build or a full revalidation of unrelated work.
- Independent review: `ses_e272d60bcffeR99NwjoJrm5f6f`, initially two Important findings, no Critical.

Implementation is confined to 3 source files, the new offline test, and these scope/plan documents. No runtime configuration or policy was changed; no production GET was used for verification.

### Review fix pass and final evidence

- Corrupt optional override JSON caused summary HTTP500 and suppressed automation FP alerts. Added direct+HTTP regression cases, observed RED, then ignored only JSON syntax errors while leaving the artifact untouched. Candidate-derived metrics and unrelated FP alerts remain available.
- Stored-only and zero-valued domain overrides disappeared from the response. Added regression cases, observed RED, then retained override-only domains with zero counts/noise and unknown acceptance rate, not stale learned statistics.
- Review regression RED: 9/12 passed, 3 failed for these defects. Final GREEN: 12/12 on committed-base worktree sources and 12/12 on a fresh copy of the current dirty primary sources plus this patch (`/tmp/opencode/dashboard-readonly-final-overlay-vy730u3u`).
- Both relevant existing suites rerun after the fix: automation PASS, discovery PASS; feedback learning PASS; syntax check, module map and whitespace checks PASS.
- Final: minor (deferred): add >5000 upper-bound and deliberately varied display-priority ordering fixtures. Current tests prove the original >500 window defect and unchanged display membership, but not those two additional boundaries.
- Review scope exclusions remain exclusions: no live-runtime or retrieval-quality certification; no deployment, resume, policy, threshold or approval work. Compatibility overlay is the applicability evidence, not production execution.
- No second reviewer run was used; the two Important findings were resolved in one RED→GREEN fix pass with the relevant suites rerun.

Integration requires applying only this patch over the primary checkout's preexisting changes, followed by separate authorization for deploying/restarting the dashboard. Never replace full production source files with the clean-base worktree copies.

## Authorized integration and deployment

The user subsequently answered “tak” to merging, pushing main and deploying this repair.
Both fetched `main` and `origin/main` are at `c114e24`. Primary source still contains unrelated dirty observation/publication/content-fetch changes.
Integrate only the reviewed six-file patch into the primary working tree and its index, then commit that patch on main; do not autostash or replace full source files. Verify the staged tree equals the isolated worktree's staged tree so no preexisting dirty change enters the commit.
Back up the three actual deployed source files and ownership/mode before applying. Rollback, if startup/routes fail: restore only these backed-up source files and restart only `erp-kb-dashboard`; do not reset the repository or change policy/runtime state.
Restart only the dashboard service after syntax and fixture checks. Verify health, namespace/domain metric consistency, paused/publication flags and that GETs do not change learning/report file metadata. Keep scheduler/timer configuration, credentials, data and publication decisions unchanged.
No frontend bundle or Compose rebuild is required: this patch changes Node ESM backend files only.
