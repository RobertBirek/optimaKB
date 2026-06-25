# TAXBELL Knowledge Panel - Full Audit

Date: `2026-06-06`

## Executive Summary

The dashboard is a functional desktop operations tool, but its original
design relied on manual promotion and had no transaction boundary around
promotion, build, and validation. A build or quality failure could therefore
leave a draft promoted even though the full pipeline had failed.

This audit introduced an automatic LLM review and publication controller with
deterministic gates, durable state, per-KB locking, regression detection, and
automatic rollback. It also added CSRF protection, security headers, SSRF
protection, accessible modal behavior, and a hardened systemd profile.

The live rollout now uses a dedicated OpenSPG reviewer app whose app id matches
an existing project id, working around the current OpenSPG app-to-project
runtime defect. Automation is enabled only as a shadow canary for
`ComarchCommunityNews`; it cannot promote or build while `shadowOnly=true`.

## Findings and Remediation

### Critical and High

1. **Non-transactional promotion and build**
   - Previous behavior promoted the draft before exporter/build/test results
     were known.
   - Implemented a durable state machine and snapshot before promotion.
   - A failed pipeline or regression restores the registry/promoted files and
     rebuilds the previous KB state.

2. **No concurrency or idempotency boundary**
   - Parallel requests could start competing operations for the same KB.
   - Implemented one filesystem lock per KB, a separate registry lock, stale
     lock recovery, and duplicate-job detection by draft id.

3. **Server-side request forgery**
   - URL analysis and recurring sources could fetch local/private endpoints.
   - Implemented protocol, credential, hostname, DNS/IP, and redirect checks.
   - Private source URLs require an explicit
     `ERP_KB_ALLOW_PRIVATE_SOURCE_URLS=1` override.

4. **No automatic recovery from post-build regression**
   - Implemented baseline/post-build comparison for target quality verdict and
     the 20-question testpack PASS/MISS counts.
   - Regression triggers automatic rollback and records the complete result.

5. **Weak service sandbox**
   - Original systemd exposure score was `9.2 UNSAFE`.
   - Added no-new-privileges, empty capability set, private devices/tmp,
     kernel/control-group protections, namespace restrictions, restrictive
     umask, and read-only application code paths.

### Medium

1. **Basic Auth without CSRF protection or authorization levels**
   - Added a restart-scoped CSRF token required for all mutating API calls.
   - Added optional `viewer`, `operator`, and `admin` credentials. Existing
     dashboard credentials remain the admin account.
   - Added in-memory read/write rate limits per client.
   - Long-term recommendation: terminate identity at the proxy and map company
     identities to these roles.

2. **Missing response security policy**
   - Added CSP, HSTS, frame, MIME, referrer, permissions, CORP, and no-store
     headers at the backend.

3. **LLM result previously used only for metadata**
   - Added a dedicated versioned review prompt and strict JSON contract.
   - Stored decision, confidence, target KB, source/factuality/duplicate/content
     risk, reasons, model context, prompt version, and content hash.

4. **No automatic exception queue**
   - Added `EXCEPTION` and `ROLLBACK_FAILED` views with retry from the desktop
     dashboard.

5. **Dialog accessibility**
   - Added dialog labels, initial focus, focus trapping, Escape handling, focus
     restoration, and visible focus styles.

6. **Desktop overflow at 1280px**
   - Added min-width containment and ellipsis for global status values.
   - Mobile behavior is explicitly outside product scope.

### Low and Residual

1. **Large frontend/backend modules**
   - `src/main.jsx` and `erp_kb_dashboard_server.mjs` remain large.
   - Functional boundaries are now clearer, but physical module extraction is
     still recommended after automation stabilizes.

2. **Large `/api/status` payload**
   - Current payload includes drafts, jobs, sources, reports, and KB state.
   - Add cursor pagination and detail endpoints when job/draft history exceeds
     operationally useful limits.

3. **Build-tool vulnerabilities**
   - `npm audit` reports two moderate Vite/esbuild development-tool findings.
   - The production server serves static output and does not expose Vite dev
     server. A full fix requires a newer Vite generation and Node runtime,
     which should be handled as a controlled Node upgrade.

4. **Source credentials**
   - Credentials are mode `0600` when created, but remain local JSON secrets.
   - Migrate to a dedicated credential broker or encrypted secret store if
     authenticated recurring sources are introduced.

## Implemented Architecture

- `scripts/lib/dashboard_automation.mjs`: config, jobs, locks, summaries, worker
  triggering.
- `scripts/run_dashboard_automation.mjs`: deterministic review, LLM decision,
  historical shadow benchmark, snapshot, promotion, build, validation, and
  rollback.
- `scripts/provision_dashboard_llm_reviewer.mjs`: idempotent provisioning,
  deployment, session creation, and a JSON probe for the dedicated reviewer.
- `scripts/lib/safe_http.mjs`: SSRF-resistant source fetching.
- Dashboard `Automatyzacja` tab: enable/pause, confidence threshold, queue,
  exceptions, review evidence, transitions, rollback evidence, and retry.
- HTTP authorization: viewers are read-only, operators may run workflows, and
  only admins may change automation configuration.

Durable job stages:

```text
PENDING
REVIEWING
SHADOW_COMPLETE
APPROVED
BUILDING
VALIDATING
PUBLISHED
ROLLING_BACK
ROLLED_BACK
EXCEPTION
ROLLBACK_FAILED
```

## Acceptance Evidence

- JavaScript syntax checks pass for the server, automation modules, scanner,
  and tests.
- Vite production build passes.
- Isolated successful publication test passes.
- Isolated regression rollback test passes.
- Shadow-history no-mutation regression test passes.
- Real DeepSeek reviewer probe passes through OpenSPG SSE.
- Historical shadow benchmark completed `28/28` reviews with `0` exceptions,
  `22` matches, and `6` safe holds.
- Threshold calibration selected `0.90`; every tested threshold had `0` false
  positives, while `0.95` added two more false negatives.
- Full quality gate passes for all `10` configured KBs.
- Existing read-only dashboard smoke test is retained and extended with CSP,
  CSRF, and automation-status assertions.
- Live systemd hardening reduced the measured exposure score from `9.2 UNSAFE`
  to `3.1 OK`.
- Confident cross-KB decisions now end in `REROUTE_PROPOSED` without mutating
  the draft registry or any KB export.
- Publication mode is protected by a live-sample gate: `20` adjudications,
  `95%` accuracy, `0` false-positive publishes, healthy LLM, no active jobs or
  rollback failures, and explicit admin approval.
- A 15-minute LLM health timer pauses automation after two consecutive probe
  failures; successful recovery never resumes publication automatically.
- Operator-confirmed reroutes now update only pending draft routing, append
  routing history, and launch a second shadow review in the target KB.
- The canary sample threshold is protected against repeated-review inflation
  by counting unique drafts while calculating quality over every decision.
- Dashboard mutations and worker transitions now write a redacted,
  SHA-256-chained append-only audit log with verification in the System tab.

## Remaining Backlog

The deferred long-term development plan is recorded in
`docs/reference/ERP_KB_Dashboard_Future_Roadmap.md`. It is planning material
only and must not be treated as approval to implement or deploy those changes.

1. Collect and adjudicate `20` new `ComarchCommunityNews` shadow decisions.
2. Remove the systemd `ERP_KB_AUTOMATION_SHADOW_ONLY=1` override only after the
   gate is approved and a scheduled canary window is agreed.
3. Add proxy-backed identity; application-level admin/operator/viewer roles
   are already enforced.
4. Add pagination for drafts, actions, and automation jobs.
5. Move source credentials to a managed secret store before authenticated
   source scanning is used.
6. Upgrade Node and Vite together to clear development-tool advisories.
7. Split the React and HTTP server monoliths after the new automation contract
   has operated without rollback failures.
