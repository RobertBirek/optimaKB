---
name: openspg-daily-ops
description: Use when performing daily OpenSPG ERP KB inspection, reviewing quality or discovery trends, investigating autopilot alerts, latched automation pauses, stale reports, or assessing whether operator intervention is needed.
---

# OpenSPG Daily Ops

## Scope

Daily triage is **read-only**: observe, explain, recommend. Skills grant no additional permissions.
Report generation is an operator action; resumes, overrides, approvals, builds, permission repairs and service changes require explicit operator authorization outside the inspection. A read-only delegated agent only reports these needs.
Never start a second dashboard server, modify runtime files under `data/`, or run broad ownership repairs. Use dedicated KB/pipeline skills for authorized ingestion or builds.

Dashboard: `http://10.10.254.42:3410/panel/`; persistent service, base path `/panel`.
Start with live APIs; generated reports are dated evidence, not current health.

## Daily checklist

### 1. Overview and automation

- Begin with `GET /panel/api/status`: top-level `.overall`, `.summary`, `.alerts`, `.reports`, `.automation` (not `.status`). Record `generatedAt` and report timestamps. Quality/freshness WARN needs explanation even when services answer.
- In `.automation`, inspect `config.enabled`, `paused`, `pauseReason`, `pausedAt`, `shadowOnly`, `publicationApproved`, `allowedNamespaces`, plus `llmHealth` and `promotionGate`. A healthy LLM **does not automatically resume** a paused controller: this is the intentional latch covered by `llm_health_no_auto_resume`. Resuming and approving publication are separate decisions.
- Provider `configured=true` means credentials exist, not that Tavily/Firecrawl/Exa passed a live check. A blocked canary is not an outage by itself.
- Inspect action timestamps before calling failures new: historical FAIL entries are **not a fresh incident**. Quote queue counts with source and timestamp; the recent-job list may be capped.
- Print a bounded projection, never the entire status or automation payload: `providerSecrets`, credential previews and unrelated job content are not needed.

### 2. Autopilot and domain alerts

`GET /api/automation/autopilot` returns `.autopilot`: freeze counts, namespace/domain arrays, throttled boosts, recent actions and override keys. No freezes does not imply the controller is running.

Reference: `scripts/lib/dashboard_autopilot.mjs`.

- KB freeze: `windowFpRate > 0.15`, or `reviewed >= 5` and `acceptanceRate < 0.25`; not a generic job-error rate.
- Domain freeze: `noisePenalty > 0.5`. `high_noise_domain` alerts use this threshold too; compare `GET /api/automation/learning` penalties, discovery context and autopilot before recommending intervention. Conflicting values require source/time investigation, not silently choosing one.
- A throttle is a recorded boost to the confidence threshold (`effectiveThreshold`), not a job sleep. Do not infer observed throughput or a domain boost's effect from its presence.
- Recovery uses counters: KB required count 7, domain required count 14, plus quality checks. Constants are named days, but elapsed time alone does not prove successful evaluations or persisted counter progress. The summary does not expose counters; flag unavailable evidence rather than reading runtime files manually.
- Default 48-hour operator override suppresses freeze/throttle evaluation; it is not a recovery cooldown. Override keys are `kb:<namespace>` or `domain:<hostname>`. Removing an override does not unfreeze an item (`removeOperatorOverride(nsOrDomain, type)` only removes the key).

| Observation | Read-only action |
|---|---|
| New freeze | Diagnose cause before recommending a scoped operator action |
| Existing override | Preserve operator intent; report its key, do not guess expiry from summary |
| Old freeze | Verify recovery evidence; age alone is not grounds for clearing state |
| Throttle only | Monitor; review age/quality evidence without resetting it |
| Alert and learning disagree | Report both values, endpoints and observation times |

### 3. Discovery and scheduler

`GET /api/discovery` wraps data in `.discovery`: `policy`, `semiAuto`, `queries`, `candidates`, `runs`, `report`, `briefing`, `coverage`, `qualityAlerts`.

- Check latest daily/autodraft run `ok`, `dryRun`, errors, candidate/draft counts and times. Successful zero-draft runs can mean no eligible candidates, not a broken timer. Discovery semi-auto and publication automation have separate gates.
- Read active `semiAuto` blockers, per-KB thresholds, allowed namespaces and policy `semiAutoMaxPerRun`; the daily draft guard is currently 25 (UTC date). Verify limits against current policy/implementation instead of hardcoding all limits.
- Review low-yield queries, `suspendedUntil` and unknown-domain suggestions. Confidence alone is not authorization to approve a domain.
- Candidate arrays can be capped; pending counts use filters and report snapshots. Example: Overview 423 pending, report 426 pending, array length 500 are different observations, not interchangeable totals. Check scope/time/status before claiming a defect.
- Inspect timer with `systemctl cat erp-kb-discovery-autodraft.timer` and `systemctl list-timers --all --no-pager`. Without a timezone suffix, `OnCalendar` uses the host's timezone. Current schedule `00,06,12,18:00:00` has `RandomizedDelaySec=300`; in `Europe/Warsaw` winter this is roughly 23/05/11/17 UTC, with DST changes in summer. Verify actual host timezone and last/next activation.

### 4. Trends and weekly maintenance

- `GET /api/automation/trends?days=14` returns `.trends[namespace][]`. Confirm returned date range; trim to the intended interval if the deployment returns extra rows.
- Actual fields: `fpRate`, `tunedBaseline`, `acceptanceRate`, `draftedCount`, `reviewedCount`. `null` means unknown, not zero or PASS; these rows do not contain `automationAccuracy` or `noisePenalty`.
- Review anomalies from `.alerts` in `GET /api/automation/alerts`; these are distinct from overview and discovery alerts.
- On Monday or when the weekly report is older than 7 days, flag it due. Check **Generated** in `docs/reference/ERP_KB_Quality_Weekly_Report.md` as well as mtime. A report refresh is not a KB refresh.
- Authorized report generation: Reports tab, or admin `POST /panel/api/automation/report` with `X-ERP-KB-CSRF: 1`. Verify response and new report timestamp only after separate authorization.

## Safe API example

```bash
set -o pipefail
curl -fsS --max-time 60 http://10.10.254.42:3410/panel/api/status |
  jq '{generatedAt, overall, summary, alerts,
    reports: [.reports[] | {key, overallStatus, json, markdown}],
    automation: {config: (.automation.config | {enabled, paused, pauseReason,
      pausedAt, shadowOnly, publicationApproved, allowedNamespaces}),
      llmHealth: .automation.llmHealth,
      promotionGate: .automation.promotionGate}}'
```

Use the same bounded HTTP timeout and projection pattern for other GETs (paths above are relative to `/panel`). HTTP errors, timeout, invalid JSON or missing fields mean **unknown**, not green. A single bounded retry of an idempotent GET is reasonable; report persistent failure. Never bypass authentication or expose tokens.

## Escalation

- Dashboard 5xx: read bounded service logs (`journalctl -u erp-kb-dashboard -n 50 --no-pager`), redact secrets.
- MCP: read `http://10.10.254.42:3400/health`; report unavailability, do not restart.
- Suspected stuck build: authorized read of `GET /public/v1/builder/job/list?projectId=N&start=1`; never use `start=0`.
- EACCES: inspect only the affected file's owner/mode and service-user access, never cookie contents. Consult `docs/reference/OpenSPG_KB_Operational_Memory.md` sections **Auth / cookie file permissions**, **Knowledge inbox registry permissions**, **Schema helper export permissions**. Propose a least-privilege, single-path repair for operator approval.

## Report contract

Return: observation time; overall status and unknowns; top priorities with evidence/source dates; healthy capabilities with verification scope; proposed operator actions; changes actually made (**none** in read-only triage). Distinguish facts, suspected causes and historical evidence.
