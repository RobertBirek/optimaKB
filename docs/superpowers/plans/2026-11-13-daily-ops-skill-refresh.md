# Daily Ops Skill Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Correct the daily-ops reference and align its two read-only agent entrypoints without modifying runtime.

**Architecture:** One authoritative skill, with short harness-specific agent definitions linking to it. Offline documentation-contract tests and fresh-context application scenarios verify instructions; no runtime module imports or live requests in tests.

**Tech Stack:** Markdown, Node.js built-in test runner.

**Spec:** User-approved findings in the conversation (13 November 2026); bounded reference corrections listed below.

## Global Constraints

- Work in the native isolated worktree; preserve unrelated dirty production files.
- Only skill, agent documentation, offline test and verification/plan files change.
- No services, runtime state, secrets, exports, downloads, report-generation POST or configuration changes.
- Do not commit, publish or deploy without separate authorization.
- Preserve agent model/tool metadata.

## Scope and approach

Considered patching only the skill versus aligning the skill and both agent wrappers. Use the latter: the obsolete OpenCode instructions could otherwise start services despite the read-only label.

Correct status/automation/discovery envelopes, safe projections, stale-alert interpretation, missing metrics, candidate counter scope, timer timezone and jitter, pause latch, recovery thresholds and override semantics, threshold-based throttling, domain alerts, report staleness and operator-only remediation. Retain verified KB job pagination and permission-diagnosis pointers, not broad repair commands.

## Review Focus

- LLM PASS plus paused=true is a latched pause, not an automatic-resume failure.
- A 72-hour freeze does not meet a time-only recovery promise; removing an absent override does not unfreeze.
- Missing trend metrics and 423/426/500 scoped counters do not prove quality or exact queue size.
- A local timer without a timezone suffix is not UTC; account for DST and jitter.
- Broad status payloads may contain credential previews; use bounded projections.

## Checklist

- [x] Read current skill, agent wrappers and relevant implementation; run baseline `npm run check`.
- [x] Run old-reference and no-skill control scenarios before edits. Old reference propagated the incorrect 48-hour recovery claim; control did not. Both respected read-only scope, so no new behavioral micro-test campaign is justified.
- [x] Add offline reference-contract tests; run and record expected RED.
- [x] Correct the skill and align both agent wrappers.
- [x] Run contract tests, syntax checks, whitespace and module-map validation.
- [x] Run fresh-context application/pressure scenarios against corrected reference; review actual outputs.
- [x] Independent read-only review and final scoped diff inspection.
- [x] Record verified outcomes and remaining limitations; leave worktree ready for user review.

## Verification

Run `node --test scripts/test_daily_ops_skill_contract.mjs`, `npm run check`, `git diff --check` and `python3 scripts/validate-module-map.py`.
No default `npm test` exists. The task changes no runtime code; runtime suites are not required and may write reports or contact services. New tests must read only the three documentation files and use no network.

## Evidence

Baseline sessions: old skill `ses_e2938c16dffehd0duvo7uraoby`, no-skill control `ses_e2938c168ffeSFG9uYN6ocqKjT`.
Old-reference output: “cooldown 48 h liczy się **od ostatniego błędu**.”
Control output: “nie odmrażam wyłącznie z powodu wieku.”
This is a factual reference failure, not evidence that baseline agents violated authorization.

### Execution ledger

Pre-flight: one documentation task; wrappers share only the authoritative skill reference.
User's “ok, działaj dalej” was taken as authorization to execute the bounded corrections, not to operate production.
No default `npm test` exists; runtime test suites were not run for this documentation-only change.

| Check | Result |
|---|---|
| Baseline `npm run check`, production and isolated checkout | PASS |
| Initial `node --test scripts/test_daily_ops_skill_contract.mjs` | RED: 0/8 passed; assertion failures on obsolete/missing guidance, no setup errors |
| After edits, same command | GREEN: 8/8 passed |
| `node --check scripts/test_daily_ops_skill_contract.mjs` | PASS |
| Final `npm run check` | PASS |
| `git diff --check` | PASS |
| `python3 scripts/validate-module-map.py` | PASS, 4 modules |
| Extracted Bash example: `bash -n` and offline jq fixture | PASS; pause + LLM retained, injected secret markers excluded |
| Agent wrappers | Existing YAML metadata preserved; new bodies byte-identical |
| Scoped diff in `/docker/openspg` | Empty; primary checkout instructions not deployed/overwritten |

Corrected-reference application test: `ses_e29346aadffeSOdyKPm0Lt9zKN`.
Passed recovery/override semantics, threshold boost, local timer+jitter, latched pause, historical failures, scoped counters and no unauthorized writes.
Exact correction: “wymagany licznik **7 dla KB**, **14 dla domeny**”; “Domyślne 48 godzin override’u nie jest okresem automatycznego odzyskiwania”.

Missing-telemetry/pressure variation: `ses_e29346aa3ffebVT3qHZ8tjnrZG`.
Passed stale LLM PASS interpretation, HTTP errors as unknown, credential redaction, 31-vs-14-day trend window, zero-eligible run interpretation, operator-only report generation and override refusal by read-only agent.

These are bounded reference/application checks, not a five-repetition behavioral experiment or live end-to-end operational validation.

Final review: `ses_e2933a41dffe019o9aven5Wt6s`, ready to integrate, no blocking findings; independently ran 8/8 contract tests.
Final: minor (deferred): the credential-exclusion contract test checks reference terms, not executable projection redaction. The synthetic redaction fixture was executed manually offline and passed, but is not retained as an automated regression test.
Scope limits: review did not revalidate live service health, installed timer/timezone, current queues, runtime counter persistence or broad behavioral robustness. These were not changed or claimed as verified by this patch.

Final repeated contract test: 8/8 PASS; whitespace check PASS.
Native worktree is externally managed and detached; changes are uncommitted and preserved here for integration choice. No commit, push, merge, production copy, report regeneration or runtime mutation was performed.

## Integration authorization and deployment scope

The user subsequently authorized merging, pushing `main` and deploying this update.
Integrate only these five files; preserve all preexisting dirty/untracked production work.
Fetched `origin/main`: local `main` is ahead by three existing Betterfly commits (`b01be6b`, `cd0e476`, `4ddceef`), with no remote-only commits. The authorized normal main push includes that existing history; no history rewriting.
Repeat the eight offline contract tests and syntax checks before commit and after fast-forward integration. Deployment means installing the skill and both agent definitions in `/docker/openspg`; no OpenSPG/dashboard rebuild, service restart, report regeneration or automation-policy change is needed.
