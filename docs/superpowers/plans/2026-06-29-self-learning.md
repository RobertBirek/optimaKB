# Self-Learning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-phase self-learning layer that uses operator feedback to improve discovery prioritization and automation canary recommendations.

**Architecture:** Derive compact learning states from existing audited decisions, persist them under `data/dashboard/learning/`, and inject bounded adjustments into discovery priority and automation canary recommendation logic. Surface the learned signals in existing dashboard API payloads and UI panels.

**Tech Stack:** Node.js ESM, local JSON state files, existing dashboard React SPA, existing audit/automation/discovery modules.

---

### Task 1: Learning State Module

**Files:**
- Create: `scripts/lib/feedback_learning.mjs`
- Test: `scripts/test_feedback_learning.mjs`

- [ ] Write a failing test for derived discovery and automation learning state.
- [ ] Run `node scripts/test_feedback_learning.mjs` and confirm it fails.
- [ ] Implement deterministic discovery/automation learning state derivation and persistence helpers.
- [ ] Re-run `node scripts/test_feedback_learning.mjs` and confirm it passes.

### Task 2: Discovery Integration

**Files:**
- Modify: `scripts/lib/dashboard_discovery.mjs`
- Test: `scripts/test_dashboard_discovery.mjs`

- [ ] Inject discovery learning state into priority scoring with bounded score deltas and reasons.
- [ ] Expose `discovery.learning` via summary payload.
- [ ] Re-run `node scripts/test_dashboard_discovery.mjs` and verify it still passes.

### Task 3: Automation Integration

**Files:**
- Modify: `scripts/lib/dashboard_automation.mjs`
- Test: `scripts/test_dashboard_automation.mjs`, `scripts/test_feedback_learning.mjs`

- [ ] Inject automation learning state into canary priority and recommended action selection.
- [ ] Expose `automation.learning` via automation summary.
- [ ] Re-run focused tests and confirm no canary/reroute regressions.

### Task 4: Dashboard Visibility

**Files:**
- Modify: `src/SourcesPage.jsx`
- Modify: `src/AutomationPage.jsx`
- Test: `npm run build`

- [ ] Add compact panels for learned discovery and automation signals.
- [ ] Build the dashboard and verify the SPA compiles.

### Task 5: Verification

**Files:**
- Verify only

- [ ] Run `node scripts/test_feedback_learning.mjs`
- [ ] Run `node scripts/test_dashboard_discovery.mjs`
- [ ] Run `node scripts/test_dashboard_automation.mjs`
- [ ] Run `npm run check`
- [ ] Run `npm run build`
