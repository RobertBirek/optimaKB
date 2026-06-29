# Quality Trends per KB Implementation Plan

**Goal:** Daily snapshot + line charts for FP rate, tuned baseline, acceptance rate per KB.

**Architecture:** JSONL snapshot appended by daily discovery run, REST API to serve windowed data, plain SVG chart on new TrendsPage.

**Tech Stack:** Node.js ESM, React, plain SVG

---

### Task 1: Snapshot function + daily call

**Files:**
- Modify: `scripts/lib/dashboard_discovery.mjs`
- Modify: `scripts/run_dashboard_discovery.mjs`

- [ ] **Add `appendTrendSnapshot()`** to `scripts/lib/dashboard_discovery.mjs` after `appendAutoDraftLog`:

```javascript
const TRENDS_PATH = path.join(ROOT, 'data/dashboard/learning/trends.jsonl');

export function appendTrendSnapshot() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const policy = loadDiscoveryPolicy();
    const candidates = listDiscoveryCandidates(5000);
    const feedback = discoveryFeedbackSummary(candidates);
    const autoLearningPath = path.join(ROOT, 'data/dashboard/learning/automation_learning_state.json');
    let automationState = null;
    try { automationState = JSON.parse(fs.readFileSync(autoLearningPath, 'utf8')); } catch {}
    const lines = [];
    for (const profile of policy.profiles) {
      const ns = profile.kbNamespace;
      const kbFeedback = feedback.byKb?.[ns] || {};
      const kbAuto = automationState?.byKbNamespace?.[ns] || {};
      lines.push(JSON.stringify({
        date: today,
        kbNamespace: ns,
        fpRate: kbAuto.windowFpRate ?? null,
        tunedBaseline: kbAuto.tunedBaseline ?? null,
        acceptanceRate: kbFeedback.acceptanceRate ?? null,
        draftedCount: kbFeedback.drafted ?? 0,
        reviewedCount: kbFeedback.reviewed ?? 0,
      }));
    }
    if (lines.length) {
      fs.mkdirSync(path.dirname(TRENDS_PATH), { recursive: true });
      fs.appendFileSync(TRENDS_PATH, lines.join('\n') + '\n', 'utf8');
    }
  } catch { /* silently fail */ }
}
```

- [ ] **Call after daily run** in `scripts/run_dashboard_discovery.mjs`, at the end of `runDaily` (after the audit log entry, around line 350): `appendTrendSnapshot();`

- [ ] **Run syntax check**: `node --check scripts/lib/dashboard_discovery.mjs && node --check scripts/run_dashboard_discovery.mjs`

- [ ] **Commit**: `git add scripts/lib/dashboard_discovery.mjs scripts/run_dashboard_discovery.mjs && git commit -m "feat: appendTrendSnapshot daily metrics"`

---

### Task 2: API endpoint

**Files:**
- Modify: `scripts/erp_kb_dashboard_server.mjs`

- [ ] **Add handler** after the learning API handler (around line 2235):

```javascript
async function handleGetTrends(req, res) {
  try {
    const days = Math.max(1, Math.min(365, Number(req.route?.searchParams?.get('days') || 30)));
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const trendsPath = path.join(ROOT, 'data/dashboard/learning/trends.jsonl');
    const grouped = {};
    if (fs.existsSync(trendsPath)) {
      const raw = fs.readFileSync(trendsPath, 'utf8');
      for (const line of raw.trim().split('\n').filter(Boolean)) {
        try {
          const entry = JSON.parse(line);
          if (entry.date >= cutoff) {
            (grouped[entry.kbNamespace] = grouped[entry.kbNamespace] || []).push(entry);
          }
        } catch {}
      }
    }
    return sendJson(res, 200, { ok: true, trends: grouped });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: 'trends_load_failed', message: error.message });
  }
}
```

- [ ] **Register route** in the router section (around line 3807, after the learning PATCH handler):

```javascript
if (route.pathname === '/api/automation/trends' && req.method === 'GET') {
  return handleGetTrends(req, res);
}
```

- [ ] **Run syntax check**: `node --check scripts/erp_kb_dashboard_server.mjs`

- [ ] **Commit**: `git add scripts/erp_kb_dashboard_server.mjs && git commit -m "feat: GET /api/automation/trends endpoint"`

---

### Task 3: TrendsPage + CSS + nav

**Files:**
- Create: `src/TrendsPage.jsx`
- Create: `src/styles/trends.css`
- Modify: `src/PageShell.jsx`
- Modify: `src/App.jsx` (or wherever routes are defined)

- [ ] **Create `src/TrendsPage.jsx`**:

```jsx
import { useState, useEffect, useMemo } from 'react';
import { useApi } from './useApi';
import './styles/trends.css';

const METRICS = [
  { key: 'fpRate', label: 'FP Rate', unit: '%', format: (v) => v != null ? `${(v * 100).toFixed(1)}%` : '—' },
  { key: 'tunedBaseline', label: 'Tuned Baseline', unit: '', format: (v) => v != null ? v.toFixed(2) : '—' },
  { key: 'acceptanceRate', label: 'Acceptance Rate', unit: '%', format: (v) => v != null ? `${(v * 100).toFixed(1)}%` : '—' },
  { key: 'draftedCount', label: 'Drafts', unit: '', format: (v) => v != null ? String(v) : '0' },
];
const RANGES = [7, 30, 90, 0];
const COLORS = ['#3b82f6','#ef4444','#22c55e','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16'];

export default function TrendsPage() {
  const [metric, setMetric] = useState('fpRate');
  const [days, setDays] = useState(30);
  const { data } = useApi(`/api/automation/trends?days=${days}`);

  const entries = useMemo(() => {
    if (!data?.trends) return [];
    const result = [];
    for (const [ns, points] of Object.entries(data.trends)) {
      if (!Array.isArray(points) || points.length < 2) continue;
      result.push({ ns, points });
    }
    return result.sort((a, b) => b.points.length - a.points.length);
  }, [data]);

  const selectedMetric = METRICS.find((m) => m.key === metric);

  function chartDimensions() {
    const width = Math.max(600, entries.reduce((max, s) => Math.max(max, s.points.length), 0) * 12);
    return { width: Math.min(width, 1200), height: 300 };
  }

  function linePoints(points, dim) {
    if (!points.length) return '';
    const values = points.map((p) => p[metric]);
    const min = Math.min(...values.filter((v) => v != null));
    const max = Math.max(...values.filter((v) => v != null));
    const range = max - min || 1;
    const padding = range * 0.1;
    const yMin = Math.max(0, min - padding);
    const yMax = Math.min(1, max + padding);
    const yRange = yMax - yMin || 1;
    const stepX = dim.width / Math.max(points.length - 1, 1);
    return points.map((p, i) => {
      const x = i * stepX;
      const yVal = p[metric] != null ? p[metric] : min;
      const y = dim.height - ((yVal - yMin) / yRange) * (dim.height - 20) - 10;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');
  }

  return (
    <div className="trendsPage">
      <div className="trendsControls">
        <div className="metricTabs">
          {METRICS.map((m) => (
            <button key={m.key} className={metric === m.key ? 'active' : ''} onClick={() => setMetric(m.key)}>{m.label}</button>
          ))}
        </div>
        <div className="rangeTabs">
          {RANGES.map((d) => (
            <button key={d} className={days === d ? 'active' : ''} onClick={() => setDays(d)}>{d === 0 ? 'All' : `${d}d`}</button>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="trendsEmpty">Brak danych historycznych. Trendy pojawią się po kilku dniach od włączenia snapshota.</div>
      ) : (
        <div className="trendsGrid">
          {entries.map(({ ns, points }, index) => {
            const dim = chartDimensions();
            return (
              <div key={ns} className="trendChart">
                <h4><span className="trendDot" style={{ background: COLORS[index % COLORS.length] }} />{ns}</h4>
                <svg viewBox={`0 0 ${dim.width} ${dim.height}`} className="trendSvg">
                  <polyline fill="none" stroke={COLORS[index % COLORS.length]} strokeWidth="2" points={linePoints(points, dim)} />
                </svg>
                <div className="trendSummary">
                  {points.length} dni | {selectedMetric.format(points.at(-1)?.[metric])} obecnie
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Create `src/styles/trends.css`**:

```css
.trendsPage { padding: 1.5rem; }
.trendsControls { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; align-items: center; }
.metricTabs, .rangeTabs { display: flex; gap: 0.25rem; }
.metricTabs button, .rangeTabs button {
  padding: 0.4rem 0.8rem; border: 1px solid var(--line); background: var(--panel);
  border-radius: 6px; cursor: pointer; font-size: 0.85rem; color: var(--text);
}
.metricTabs button.active, .rangeTabs button.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.trendsEmpty { padding: 2rem; text-align: center; color: var(--muted); }
.trendsGrid { display: flex; flex-direction: column; gap: 1.5rem; }
.trendChart {
  background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 1rem;
}
.trendChart h4 { margin: 0 0 0.5rem; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem; }
.trendDot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.trendSvg { width: 100%; height: auto; max-height: 300px; }
.trendSummary { font-size: 0.8rem; color: var(--muted); margin-top: 0.5rem; }
```

- [ ] **Add route** — find where other routes are defined (in `src/App.jsx` or `src/PageShell.jsx`). Read the file to determine the pattern. Likely a route entry like:

```javascript
import TrendsPage from './TrendsPage';
// in the route config:
{ path: '/trends', element: <TrendsPage /> }
```

And in `PageShell.jsx`, add a nav link for Trends (or it may be auto-detected from the route). Read both files and add accordingly.

- [ ] **Run dashboard check**: `npm run check`

- [ ] **Build**: `npm run build`

- [ ] **Commit**: `git add src/ && git commit -m "feat: TrendsPage with daily quality metrics charts"`
