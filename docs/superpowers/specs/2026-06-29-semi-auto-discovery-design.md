# Semi-Auto Discovery: Auto-Draft High-Confidence Candidates

**Date:** 2026-06-29
**Status:** Draft

## Goal

Automatically draft high-confidence discovery candidates to the knowledge inbox without operator intervention, using Phase 3 learning state (`tunedBaseline` per KB) as the dynamic threshold.

## Design

### Architecture

Instead of a single hardcoded `semiAutoMinConfidence = 0.95`, the auto-draft threshold is computed per KB namespace:

```
autoDraftThreshold(namespace) =
  automationLearningState.byKbNamespace[namespace]?.tunedBaseline ?? 0.95
```

`tunedBaseline` is derived by Phase 3 sliding window (last 50 automation jobs):
- High acceptance rate → threshold drops (e.g., 0.82 → more auto-drafts)
- High false-positive rate → threshold rises (max 0.95 → system gets more conservative)

Zero operator action needed — threshold self-adjusts based on automation outcomes.

### Tiers

| Tier | Auto-draft? | Notes |
|---|---|---|
| `official` | Yes | Same as now, but with dynamic threshold |
| `professional` | Yes | New — trust extends to professional tier |
| `community` | No | Always manual review |

### Trigger mechanisms

**A) Inline in daily discovery run** (`--daily`): During candidate processing, if the gate is active, the action is `CREATE_DRAFT`, tier is official/professional, and confidence >= namespace threshold, auto-draft immediately. Same flow as existing semi-auto code (lines 310-323 in `run_dashboard_discovery.mjs`).

**B) Standalone `--auto-draft` mode**: Iterates over existing `CANDIDATE_ONLY` candidates from previous runs (ordered by priority descending) and drafts those that now meet the threshold (e.g., after learning state lowered the bar for a KB). Runs as a separate systemd timer every 6 hours. This prevents candidates from waiting until the next daily run.

### Safeguards

| Guard | Value | Why |
|---|---|---|
| Per-run limit | 5 (vs 3 currently) | Don't flood inbox |
| Daily global limit | 25 (`MAX_AUTO_DRAFTS_PER_DAY`) | Shared rate limit |
| Min observation days | 7 | Don't auto-draft without learning data |
| Min reviews per KB | 30 | Statistical significance |
| Max FP rate | 5% | If KB has >5% FP, auto-draft blocked entirely for that KB |
| Min agreement | 90% | Operator review must be consistent |
| KB without learning data | Falls back to 0.95 | Conservative default |
| Tier gate | official + professional only | Community always manual |

### Logging

Every auto-draft append to `data/dashboard/learning/auto_draft_log.jsonl`:

```jsonl
{"ts":"2026-06-29T10:00:00Z","kb":"ComarchOptimaSchema","tier":"official","confidence":0.88,"threshold":0.82,"candidateId":"...","draftId":"...","query":"..."}
```

### UI — Read-Only Status Panel

New section in SourcesPage: **Auto-Draft Status** — table per namespace:

| Namespace | Tuned Baseline | Effective Threshold | Status | FP Rate | Drafted Today |
|---|---|---|---|---|---|
| `ComarchOptimaSchema` | 0.82 | 0.82 | ✅ Active | 3.2% | 12 |
| `ComarchOptimaAdditionalFunctions` | 0.95 | 0.95 | ⏸ Blocked (FP 8.1%) | 8.1% | 0 |

No edit controls — read-only trust panel.

### Files changed

1. **`scripts/lib/dashboard_discovery.mjs`** — dynamic threshold in `discoverySemiAutoStatus()`, add `professional` tier, `autoDraftLog()` helper
2. **`scripts/run_dashboard_discovery.mjs`** — `--auto-draft` mode, inline auto-draft uses dynamic threshold
3. **`scripts/lib/feedback_learning.mjs`** — `deriveDiscoveryAutoDraftState()` helper, exposed via learning API
4. **`scripts/erp_kb_dashboard_server.mjs`** — expose auto-draft state on `/api/automation/learning`
5. **`src/SourcesPage.jsx`** — read-only auto-draft status panel per namespace

### Testing

- Unit: threshold fallback (no learning data → 0.95), dynamic threshold (tunedBaseline → used), tier eligibility (official/professional yes, community no)
- Integration: `--auto-draft` mode processes stale candidates, respects per-run limit, respects FP gate
- Existing `test_dashboard_discovery.mjs` tests updated for new policy fields
