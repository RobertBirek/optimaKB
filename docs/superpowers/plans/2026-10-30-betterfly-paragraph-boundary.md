# Betterfly Paragraph Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Extract real Betterfly paragraphs without SVG/navigation contamination.
**Architecture:** Preserve the exporter CLI and CSV contracts; qualify its paragraph regex and ROOT. Exercise the real CLI in guarded temporary fixtures.
**Tech Stack:** Node.js ESM, built-in node:test; no dependencies.
**Spec:** `docs/superpowers/specs/2026-10-30-betterfly-paragraph-boundary-design.md`

## Global Constraints

- Code changes in isolated checkout only; preserve live user changes.
- No live export/build/publication, runtime/service/secret edits or graph deletion.
- Offline test writes only inside `/tmp/opencode`; deny live workspace reads/writes and network calls in subprocesses.

## Review Focus

- A hardcoded ROOT must be trapped before any live filesystem operation.
- Tags sharing the `p` prefix must not contribute article text.
- Uppercase, attributes and multiline real paragraphs must still work.
- Three-paragraph grouping, IDs and source paths must stay stable for clean input.
- Removing false matches must not silently truncate valid paragraph content.

### Task 1: Guarded regression and minimal parser repair

**Files:** modify `scripts/export_betterfly_reference.mjs`; create `scripts/test_betterfly_paragraph_extraction.mjs`.
**Interfaces:** real exporter CLI consumes `ROOT` with private pages, writes unchanged CSV schemas under that root. Test uses spawnSync with a preload filesystem/network guard.

- [x] Write a guarded ROOT fixture; verify it fails safely against hardcoded ROOT.
- [x] Honor `process.env.ROOT` while retaining `/docker/openspg` default; verify fixture passes.
- [x] Add SVG/prefix-tag contamination, real paragraph syntax and grouping regressions; verify failure on old regex.
- [x] Require exact `p` start/end tag names in extractor; run all new regressions to PASS.
- [x] Run `npm run check`, focused tests and `git diff --check`; inspect diff.
- [x] Rehearse exporter on a scratch copy of current Betterfly inputs; record counts and maximum content size. No production input/output paths may be used as exporter ROOT.
- [x] Document remaining deployment blockers; do not merge or commit without user direction.

## Execution ledger

Pre-flight: no shared interfaces (one implementation task).

- ROOT test RED: preload intercepted the initial live export-directory mkdir before filesystem mutation. GREEN after honoring ROOT.
- Parser tests RED: seven failures on the old regex; GREEN after exact tag matching. Nine fixture tests pass, including clean grouping/provenance and full-content preservation.
- Final suite: 211/211 passing across Betterfly extraction and four OWA coverage/export suites; `npm run check` passed. Log: `/tmp/opencode/betterfly-final-verification.log`.
- Fresh-context read-only review: no Critical/Important/Minor findings; reviewer also ran nine tests, syntax check and diff check. Guard is intentionally not a complete OS sandbox.
- Rehearsal: `/tmp/opencode/betterfly-rehearsal-1gl0ugvx/comparison.json`; chunks 238→218, largest content 65743→9603 characters, zero duplicate IDs, unchanged document/resource/pattern ID sets. Twenty old chunk IDs disappear; this is not a graph reconciliation or deployment.
- Live report-only maintenance: quality gate regenerated as mcpbot, overall WARN (no FAIL results); weekly report regenerated through supported dashboard API. No production source, staging, graph, service or automation configuration was changed.
- Publication remains blocked: OWA has 135 unresolved relation targets; live OWA jobs predate the current staging. Betterfly jobs 869/982 remain RUNNING with Vectorizer ERROR / Writer WAIT. Task traces show TypeError `'NoneType' object is not iterable`; no token-overflow error was confirmed. Do not claim parser repair alone fixes the scheduler.
- Ruling: leave the code uncommitted and undeployed in this isolated checkout — active checkout has concurrent user work, and safe import needs a separate controlled deployment/reconciliation decision; live import remains broken until then.

## Subsequently authorized operational follow-up

The initial no-import/no-deployment scope above applied to implementation/review. Later user approvals expanded the scope in stages: scoped scheduler stops and one Chunk recovery import, then permanent source deployment and local staging reconciliation. The user separately approved the discovered one-description ReferenceDocument correction.

- Jobs 869/982 TERMINATE; recovery job999 FINISH (218 chunks), graph readback exact for all218 contents and1536-dimensional vector pairs.
- Original giant input independently returns embedding HTTP400/8192-token limit; repaired maximum returns HTTP200/3860tokens/1536dims. This closes the previously unproven provider-error link.
- Exporter/test commit `b01be6b` deployed by fast-forward to live main without touching unrelated dirty files. Deployed exporter regenerated staging as mcpbot; chunk bytes exactly equal job999 input.
- Metadata job1000 FINISH (40 ReferenceDocuments, one changed description), separately approved by user. All40 descriptions and all supplied nonempty properties match the graph. A retained versionHint where CSV is empty is documented, not silently deleted.
- Local manifests reconciled to999/1000 after live job/URL/hash validation; other seven entries preserved. Guarded resume made only two GETs and no upload/submission attempts. Cron path is verified to use deployed code, not forcibly executed.
- No node/property deletion, broad automation resume, service restart or remote push. Detailed handoff: `docs/reference/Daily_Ops_Remediation_2026-10-30.md`.
