# Automation summary inbox-index repair

## Scope

User approved continuing diagnosis of the ~14–15s automation/status reads. Implement a bounded, output-preserving repair in an isolated worktree; no production deployment, restart, policy/approval changes or new live calls without further authorization.

Measured live on PID 2774432 through supported HTTP APIs and aggregate `/proc` counters (no runtime contents inspected):

| Route | Wall ms | Server CPU ms | Read syscalls | Read chars |
|---|---:|---:|---:|---:|
| `/api/automation` | 14391.0 | 15050.0 | 57549 | 262084659 |
| `/api/status` | 14644.6 | 15480.0 | 61199 | 273600052 |

Both returned HTTP200; disk read bytes were zero (page cache). Health before/after was 65.1/8.9ms.

## Root cause and design

`automationSummary()` calls `findRawDraftById()` once per actionable exception/reroute. That function calls `findRawDrafts()`, which recursively reads/parses the entire raw inbox before looking up one ID. With 100 visible exceptions this is approximately 100 full scans per request.

Load a lazy, request-local Set of raw draft IDs once, using the existing real parser. Preserve registry filtering, missing-draft behavior, malformed-inbox fail-closed behavior, queue/job limits, and all mutation-side lookups. Do not add a process-global cache or change `findRawDraftById()` for writers.

## Checklist

- [x] Inspect production source and existing tests; reproduce via bounded HTTP/CPU/read counters.
- [x] Create native isolated worktree at committed `dcdda9c`; baseline syntax check.
- [x] Add real-filesystem regression tests and collect failing read-budget baseline.
- [x] Implement lazy per-summary index; verify read budget, membership and freshness between requests.
- [x] Run existing automation, read-only summary and syntax regressions.
- [x] Fresh read-only review; no blocking findings.
- [x] Verify applicability on an isolated copy of current dirty primary source.
- [x] Record results and remaining integration scope.

## Verification

New tests must forward real `fs.readFileSync` calls while counting reads only under their synthetic raw inbox. No module/lookup mocks. Assert deterministic read budgets rather than flaky wall-time thresholds. Measure wall time and CPU for information only.

Fixtures: 600 drafts/100 exception jobs; registry exclusions; eligible/ineligible reroutes; missing drafts; no-eligible-jobs lazy path; add/remove/registry changes between requests; malformed JSON. Preserve the existing read-only guarantee.

Commands: `node --test scripts/test_automation_summary_inbox_index.mjs`; `npm run test:automation`; `node --test scripts/test_dashboard_readonly_summaries.mjs`; `npm run check`; `git diff --check`. No default `npm test` exists. Existing live dashboard test is not permitted.

## Results

- RED: 2/5 passed. Read-budget assertions failed as expected: 60000 vs 600 reads; mixed queue 16 vs 4; corrupt inbox 6 vs 2.
- Synthetic original run: 258900000 raw bytes, 10490ms wall, 10926ms CPU.
- GREEN: 5/5 passed. Same large fixture: 600 reads, 2589000 raw bytes, 211ms wall, 217ms CPU. These are single-run fixture measurements, not production latency claims.
- Relevant automation suite PASS (18 named checks); existing read-only summary suite 12/12 PASS. Syntax, new-test syntax, whitespace and module map PASS.
- Current dirty-source compatibility overlay: `/tmp/opencode/automation-inbox-index-overlay-idtg9pdn`; only the one-file patch applied to a copy of primary source. New suite 5/5 and read-only suite 12/12 PASS. Primary files were not changed.
- Independent read-only review `ses_e271338bbffetpo2425mf6wI1O`: ready to integrate, no Critical/Important findings. Reviewer independently ran 5/5 plus syntax checks and measured ~208ms/600 reads. Checklist bookkeeping was completed at handoff as requested.
- No global cache, policy/approval changes, runtime writes, restart, merge, commit or push. Writer-side lookup behavior remains unchanged.

## Limits and integration

This is one request-local snapshot, not a transactional guarantee against concurrent external file writers. The next request re-reads inbox/registry, including after a failed scan.
Production improvement must be measured after separately authorized deployment. Integrate only the small reviewed patch over existing primary edits; do not replace the full deployed module with the clean-base copy.

## Authorized deployment

The user subsequently approved merging, pushing main and deploying this repair.
Fresh pre-deploy measurements on PID2774432: automation14904.2ms /15520CPUms /57549read syscalls /262084659read chars; status14469.9ms /15290CPUms /61199read syscalls /273600052read chars.
Both routes returned 100 exceptions, zero reroutes and zero active jobs, with pause enabled and publication approval disabled.
Back up the actual deployed module, apply only the reviewed three-file patch to primary worktree/index, verify staged tree and preservation of the preexisting optional-config-loader change, and commit only those files. Restart only `erp-kb-dashboard`.
Rollback if startup, queue equivalence or read-only checks fail: restore only the backed-up module and restart the dashboard; never reset the repository or runtime state.
Keep policy and autopilot metadata unchanged; verify learning/report metadata across controlled GETs and compare request-local CPU/read counters and queue signatures before/after. No frontend/Compose rebuild or policy resume is required.
