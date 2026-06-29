# Quality Trends per KB

**Date:** 2026-06-29
**Status:** Draft

## Goal

Visualize FP rate, tuned baseline, acceptance rate, and draft count over time per KB using aggregated daily snapshots.

## Design

### Data flow

1. **Daily snapshot** — appended to `data/dashboard/learning/trends.jsonl` during the daily discovery run. Each line:

```jsonl
{"date":"2026-06-29","kbNamespace":"ComarchOptimaReference","fpRate":0.03,"tunedBaseline":0.82,"acceptanceRate":0.75,"draftedCount":12,"reviewedCount":45}
```

2. **API** — `GET /api/automation/trends?days=30` returns all lines within the window, grouped by kbNamespace.

3. **UI** — new TrendsPage tab, simple custom SVG line chart (no external chart lib), metric switcher, date range filter.

### Snapshot logic

New function `appendTrendSnapshot()` called from the daily discovery runner. Reads current automation learning state and discovery feedback, writes one JSONL line per KB.

### API endpoint

```
GET /api/automation/trends?days=30
→ { ok: true, trends: { "ComarchOptimaReference": [{ date, fpRate, tunedBaseline, acceptanceRate, draftedCount, reviewedCount }, ...], ... } }
```

### UI — TrendsPage

- New tab in main nav: **Trends**
- Metric selector: FP Rate | Tuned Baseline | Acceptance Rate | Drafts
- Date range: 7d | 30d | 90d | All
- Line chart per KB (plain SVG `<polyline>`, one color per KB)
- Legend showing KB names with color dots
- Responsive, follows existing page shell pattern

### Files changed

1. **`scripts/lib/dashboard_discovery.mjs`** — `appendTrendSnapshot()` function
2. **`scripts/run_dashboard_discovery.mjs`** — call snapshot after daily run
3. **`scripts/erp_kb_dashboard_server.mjs`** — `GET /api/automation/trends` handler
4. **`src/TrendsPage.jsx`** — new page component
5. **`src/styles/trends.css`** — styling
6. **`src/PageShell.jsx`** — add Trends tab (if tab-based nav)
