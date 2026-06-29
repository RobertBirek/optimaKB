# Auto-Reroute: Apply High-Confidence Reroute Pairs Without Operator

**Date:** 2026-06-29
**Status:** Draft

## Goal

Automatically apply reroute proposals for (sourceKb→targetKb) pairs with `correctRate ≥ 0.90` and `reviewed ≥ 5`, eliminating the need for manual operator adjudication and application for well-established reroute patterns.

## Design

### Architecture

New function `applyAutomationRerouteAuto(job, learningState)` in `dashboard_automation.mjs` that bypasses the operator adjudication guard when the reroute pair meets confidence thresholds.

### Flow

```
LLM proposes reroute (targetKb !== draft.kbNamespace)
  → publicationEvaluation() returns rerouteProposed=true
  → Runner checks reroutePairs[key].correctRate >= 0.90
  → Runner checks reroutePairs[key].reviewed >= 5
  → Runner checks duplicateRisk !== 'high' && contentRisk !== 'high'
  → If all pass: applyAutomationRerouteAuto(job, learningState)
    → reroutePendingDraft() — moves draft to target KB
    → Job status = REROUTED, autoApplied = true
    → appendDashboardAudit
    → No operator action needed
  → If any fail: normal REROUTE_PROPOSED flow (needs operator)
```

### Safety Guards

| Guard | Value | Why |
|---|---|---|
| `correctRate` | ≥ 0.90 | High statistical confidence |
| `reviewed` | ≥ 5 | Enough sample for significance |
| `duplicateRisk` | ≠ high | Don't auto-reroute risky drafts |
| `contentRisk` | ≠ high | Don't auto-reroute risky drafts |
| Never auto-publish | Only reroute | Reroute is a move, not a publish |

### Files changed

1. **`scripts/lib/dashboard_automation.mjs`** — add `applyAutomationRerouteAuto(job, learningState)`
2. **`scripts/run_dashboard_automation.mjs`** — after reroute proposal, check and call auto-apply
3. **`scripts/test_dashboard_automation.mjs`** — tests for auto-apply path
