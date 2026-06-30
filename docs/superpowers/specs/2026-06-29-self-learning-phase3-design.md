# Self-Learning Phase 3 Design

## Goal

Extend the self-learning layer with automatic KB-specific policy threshold tuning, per-domain noise penalties, an operator panel for inspecting and resetting learning state, and per-source-type cleaner aggressiveness profiles.

## Scope

- automatic threshold baseline tuning per KB from false-positive history
- per-domain noise penalty derivation from discovery accept/reject/duplicate patterns
- operator panel for viewing and resetting learning state
- per-source-type cleaner aggressiveness tiers (news, blog, documentation, pdf)
- no changes to publication gates or adjudication bypass

## Approach

Phase 3 builds on the Phase 1+2 learning state (`discovery_learning_state.json`, `automation_learning_state.json`) and uses the same derivation pattern — compact state from audited decisions, bounded adjustments, no ML.

### 1. Automatic Threshold Tuning per KB

**Current state:** `getLearningAdjustedPublishConfidenceThreshold` returns a per-job delta but does not change the baseline stored in KB config.

**Phase 3:** The automation learning state derivation will compute a sliding-window false-positive rate per KB namespace from the last 50 adjudicated shadow jobs. A tuned baseline is computed as:

```
fpRate = falsePositives / max(windowSize, 1)
tunedBaseline = clamp(baseThreshold + (fpRate - 0.2) * 0.5, 0.3, 0.95)
```

Where 0.2 is the target false-positive rate (20%) and 0.5 is the sensitivity multiplier. KBs with fpRate > 0.2 get a higher baseline (harder to publish); KBs with fpRate < 0.2 get a lower baseline (easier to publish). The clamp protects against extreme values.

**Storage:** Added to `automation_learning_state.json` per KB:
```json
{
  "kns": "ComarchOptimaSchema",
  "windowSize": 50,
  "falsePositives": 12,
  "fpRate": 0.24,
  "tunedBaseline": 0.62,
  "baseThreshold": 0.6
}
```

**Integration:** `computeCanaryPriority` and `getLearningAdjustedPublishConfidenceThreshold` use `tunedBaseline` instead of the static KB threshold when learning state exists.

### 2. Per-Domain Noise Penalties

**Current state:** Discovery learning state tracks per-domain accept/reject/duplicate counts but does not fold them into candidate priority as a direct penalty.

**Phase 3:** The discovery learning state derivation computes a noise penalty per domain:

```
noisePenalty = domain.total >= 5
  ? clamp(1 - (domain.accepted / domain.total), 0, 0.8)
  : 0
```

Domains with fewer than 5 candidates get zero penalty (insufficient signal). High-rejection domains approach 0.8 penalty. The penalty is multiplied into candidate priority:

```
effectiveScore = rawScore * (1 - noisePenalty)
priorityDelta = -noisePenalty * 100
```

**Storage:** Added to `discovery_learning_state.json` per domain:
```json
{
  "domain": "some-spam-site.pl",
  "total": 12,
  "accepted": 2,
  "rejected": 8,
  "duplicate": 2,
  "noisePenalty": 0.667,
  "operatorOverride": null
}
```

**Operator override:** `operatorOverride` can be set to any value 0.0–1.0 via the panel API. When set, it replaces the computed `noisePenalty`.

**Integration:** `discoveryCandidatePriority` (or equivalent scoring function) applies the penalty at priority computation time.

### 3. Operator Panel

A new panel section added to the existing Automation page with three sub-sections:

#### Thresholds per KB
- Table: KB name, base threshold, tuned baseline, FP rate, window size
- Read-only display — thresholds are derived, not directly editable

#### Noise Penalties per Domain
- Table: domain, total candidates, accepted, rejected, duplicate, noise penalty (auto), operator override (editable)
- Inline edit: click override value → number input 0.0–1.0, Save sets it, Clear restores auto
- Sortable by domain, noise penalty, total

#### Reset Controls
- Button: "Reset per-KB thresholds" — clears threshold state for all KBs
- Button: "Reset per-domain penalties" — clears domain state (relearning from scratch)
- Button: "Reset full learning state" — removes both discovery and automation state files
- Confirmation dialog before each reset

**API:**
- `GET /api/automation/learning` — returns `{ thresholds: {...}, penalties: {...}, discoveryState, automationState }`
- `PATCH /api/automation/learning` — body `{ domainOverride: { domain: "x.pl", noisePenalty: 0.5 } }` or `{ reset: "thresholds"|"penalties"|"full" }`

### 4. Source-Type Cleaner Aggressiveness

Four profiles in `content_cleaner.mjs`:

| Profile | boilerplate | html-to-text | normalize | AI clean | Best for |
|---------|-------------|--------------|-----------|----------|----------|
| `news` | aggressive (REKLAMA, newsletter, cookie, social, footer) | yes | yes | yes | artykuły, wiadomości |
| `blog` | standard (REKLAMA, cookie, social) | yes | yes | optional | blogi, poradniki |
| `documentation` | minimal (only universal boilerplate) | yes | yes | no | docs, wiki, manuale |
| `pdf` | none | no | yes (pagination removal) | no | PDF extracts |

**Auto-detection:** In `content_provider.mjs` `fetchContent`, after URL resolve:
- URL contains `/news/` or `/aktualnosci/` or domain is known news → `news`
- URL contains `/blog/` or `/poradnik/` → `blog`
- URL contains `/docs/` or `/documentation/` or `/manual/` or `.pdf` → `pdf` / `documentation`
- Otherwise → `blog` (default)

**Per-fetch config:** `fetchContent` accepts optional `{ profile: "news"|"blog"|"documentation"|"pdf" }` parameter. When omitted, auto-detection runs.

**Provider config override:** The automation config can set `cleanerProfile` per source URL pattern:
```json
{
  "sourceProfiles": {
    "https://www.orange.pl/*": "news",
    "https://docs.example.com/*": "documentation"
  }
}
```

### Files Changed

| File | Change |
|------|--------|
| `scripts/lib/feedback_learning.mjs` | Add threshold tuning derivation, noise penalty derivation, stored in learning state |
| `scripts/lib/content_cleaner.mjs` | Add `cleanContentWithProfile(html, profile)` and profile definitions |
| `scripts/lib/content_provider.mjs` | Add profile auto-detection, per-fetch profile param, source config lookup |
| `scripts/lib/dashboard_discovery.mjs` | Integrate noise penalty into candidate priority |
| `scripts/lib/dashboard_automation.mjs` | Integrate tuned baseline, expose learning state |
| `scripts/erp_kb_dashboard_server.mjs` | Add GET/PATCH `/api/automation/learning` endpoints |
| `src/AutomationPage.jsx` | Add learning panel: thresholds table, penalties table, reset buttons |
| `scripts/test_feedback_learning.mjs` | New tests for threshold tuning, noise penalty derivation |
| `scripts/test_content_cleaning_pipeline.mjs` | New tests for profile tiers |
| `scripts/test_dashboard_discovery.mjs` | Regression test with noise penalty |
| `scripts/test_dashboard_automation.mjs` | Regression test with tuned baseline |

### Safety

- All BP adjustments clamped to [0.3, 0.95]
- Noise penalties clamped to [0, 0.8]
- Domain penalties only activate after ≥5 candidates (statistical significance)
- All resets require confirmation (no instant irreversible action)
- Recommendations change, gates don't

### Tests

- threshold tuning: verified fpRate → expected baseline delta
- noise penalty: domain with 0% accept → penalty 0.8, domain with 100% accept → penalty 0, unknown domain → penalty 0
- profile selection: URLs map to expected profiles
- profile cleaning: each profile applies correct pattern set
- API: GET returns full state, PATCH updates and re-derives
- regression: existing discovery/automation tests still pass
