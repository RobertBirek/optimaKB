# Trust-First Autopilot Implementation Plan

> **For agentic workers:** Use inline execution.

**Goal:** System autonomicznie freezuje/throttle'uje pipeline przy spadku jakości i odzyskuje po poprawie, operator widzi głównie wyjątki.

**Architecture:** Nowy moduł `dashboard_autopilot.mjs` + integracja w existing pipeline + 3 frontendowe zmiany.

**Tech Stack:** Node.js + React

---

### Task 1: Core module `dashboard_autopilot.mjs`
**Create:** `scripts/lib/dashboard_autopilot.mjs`
**Test:** `scripts/test_dashboard_autopilot.mjs`

- `loadAutopilotState`, `saveAutopilotState`, `defaultAutopilotState`
- `evaluateAutopilotDecisions(learningState, discoveryState)` → 7 arrays
- `applyAutopilotDecisions(decisions)` → state + audit
- `autopilotSummary(state)` → compact summary
- `effectiveThreshold`, `isKbFrozen`, `isDomainFrozen`
- `setOperatorOverride`, `removeOperatorOverride`

### Task 2: Integrate into `run_dashboard_discovery.mjs`
**Modify:** `scripts/run_dashboard_discovery.mjs`

- Import autopilot functions
- After daily run: evaluate + apply autopilot decisions
- In inline auto-draft: use `effectiveThreshold` instead of raw threshold
- In `runAutoDraft`: check `isKbFrozen` and `isDomainFrozen`

### Task 3: API endpoint
**Modify:** `scripts/erp_kb_dashboard_server.mjs`

- Import autopilot module
- Add `GET /api/automation/autopilot` → `handleGetAutopilot`

### Task 4: Overview KAG panel
**Modify:** `src/Overview.jsx`

- Fetch `/api/automation/autopilot`
- Add Autopilot status, Freeze count signals

### Task 5: SourcesPage freeze info
**Modify:** `src/SourcesPage.jsx`

- Fetch `/api/automation/autopilot`
- Show alert bar with frozen KBs/domains

### Task 6: AutomationPage history
**Modify:** `src/AutomationPage.jsx`

- Fetch `/api/automation/autopilot`
- Show recent autopilot actions panel

### Verification
- `node scripts/test_dashboard_autopilot.mjs` — 12 tests PASS
- `node scripts/test_dashboard_discovery.mjs` — autoDraftState tests PASS
- `node scripts/test_dashboard_automation.mjs` — 16 checks PASS
- `node scripts/test_feedback_learning.mjs` — 3 tests PASS
- `npm run build` — passes
