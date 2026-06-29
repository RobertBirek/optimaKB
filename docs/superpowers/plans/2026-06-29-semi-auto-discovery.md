# Semi-Auto Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable automatic drafting of high-confidence discovery candidates using Phase 3 learning state (tunedBaseline per KB) as the dynamic threshold, plus a standalone `--auto-draft` mode for stale candidates.

**Architecture:** Dynamic threshold per KB namespace derived from `automationLearningState.byKbNamespace[ns].tunedBaseline` (fallback 0.95). Inline in daily run + standalone `--auto-draft` mode. Professional tier added. Safeguards: FP gate, min reviews, min observation, per-run and daily limits.

**Tech Stack:** Node.js ESM, OpenSPG KB discovery pipeline, feedback_learning.mjs, dashboard_discovery.mjs

---

### Task 1: Add dynamic threshold + auto-draft helper to feedback_learning.mjs

**Files:**
- Modify: `scripts/lib/feedback_learning.mjs`

- [ ] **Step 1: Add `deriveDiscoveryAutoDraftState` function**

```javascript
export function deriveDiscoveryAutoDraftState(policy, automationLearningState) {
  const result = {};
  for (const profile of policy.profiles) {
    const ns = profile.kbNamespace;
    const kbSignal = automationLearningState?.byKbNamespace?.[ns] || null;
    const dynamicThreshold = kbSignal?.tunedBaseline != null
      ? Math.max(0.5, Math.min(0.95, Number(kbSignal.tunedBaseline)))
      : policy.semiAutoMinConfidence;
    const fpRate = kbSignal?.windowFpRate != null ? Number(kbSignal.windowFpRate) : null;
    const blockedByFp = fpRate != null && fpRate > policy.semiAutoMaxFalsePositiveRate;
    const eligible = (
      !blockedByFp
      && policy.semiAutoAllowedNamespaces.includes(ns)
    );
    result[ns] = {
      threshold: dynamicThreshold,
      tunedBaseline: kbSignal?.tunedBaseline ?? null,
      fpRate,
      blockedByFp,
      eligible,
      reviewed: kbSignal?.reviewed ?? 0,
      windowSize: kbSignal?.windowSize ?? 0,
    };
  }
  return result;
}
```

- [ ] **Step 2: Run tests to verify no breakage**

Run: `node scripts/test_feedback_learning.mjs`
Expected: All tests pass (or the file exists and runs)

- [ ] **Step 3: Commit**

```bash
git add scripts/lib/feedback_learning.mjs
git commit -m "feat: add deriveDiscoveryAutoDraftState to feedback_learning"
```

---

### Task 2: Modify dashboard_discovery.mjs — dynamic threshold, professional tier, auto-draft log

**Files:**
- Modify: `scripts/lib/dashboard_discovery.mjs`
- Modify: `scripts/lib/dashboard_discovery.mjs` (discoverySemiAutoStatus)

- [ ] **Step 1: Add imports at top of dashboard_discovery.mjs**

Read the top of `scripts/lib/dashboard_discovery.mjs` to find the import section (around line 1-30). Add this import:

```javascript
import { deriveDiscoveryAutoDraftState } from './feedback_learning.mjs';
```

Find the `loadDiscoveryPolicy()` default to confirm `semiAutoMinConfidence` default (0.95) — it already exists at line 257.

- [ ] **Step 2: Modify `discoverySemiAutoStatus` to use dynamic thresholds per namespace**

Replace the entire function (lines 740-793) with:

```javascript
export function discoverySemiAutoStatus(policy = loadDiscoveryPolicy(), candidates = listDiscoveryCandidates(5000)) {
  const feedback = discoveryFeedbackSummary(candidates);
  const reviewed = candidates
    .filter((candidate) => candidate.operatorDecision?.source === 'operator')
    .sort((left, right) => String(left.operatorDecision.decidedAt).localeCompare(
      String(right.operatorDecision.decidedAt),
    ));
  const falsePositiveRate = feedback.overall.evaluable
    ? feedback.overall.falsePositives / feedback.overall.evaluable
    : null;
  const observationDays = reviewed.length > 1
    ? (Date.parse(reviewed.at(-1).operatorDecision.decidedAt)
      - Date.parse(reviewed[0].operatorDecision.decidedAt)) / DAY_MS
    : 0;
  const blockers = [];
  if (!policy.semiAutoEnabled) blockers.push('Tryb półautomatyczny jest wyłączony.');
  if (feedback.overall.reviewed < policy.semiAutoMinReviews) {
    blockers.push(`Wymagane ${policy.semiAutoMinReviews} decyzji operatora.`);
  }
  if (feedback.overall.agreement == null || feedback.overall.agreement < policy.semiAutoMinAgreement) {
    blockers.push(`Wymagana zgodność rekomendacji ≥ ${Math.round(policy.semiAutoMinAgreement * 100)}%.`);
  }
  if (falsePositiveRate == null || falsePositiveRate > policy.semiAutoMaxFalsePositiveRate) {
    blockers.push(`False positive musi być ≤ ${Math.round(policy.semiAutoMaxFalsePositiveRate * 100)}%.`);
  }
  if (observationDays < policy.semiAutoMinObservationDays) {
    blockers.push(`Wymagany okres obserwacji ${policy.semiAutoMinObservationDays} dni.`);
  }
  if (!policy.semiAutoAllowedNamespaces.length) blockers.push('Brak dozwolonych KB.');
  if (policy.dryRun) blockers.push('Discovery działa w wymuszonym trybie dry-run.');

  // Load automation learning state for per-KB dynamic thresholds
  let automationLearningState = null;
  try {
    const AUTOMATION_LEARNING_PATH = path.join(
      process.env.ROOT || '/docker/openspg',
      'data/dashboard/learning/automation_learning_state.json',
    );
    if (fs.existsSync(AUTOMATION_LEARNING_PATH)) {
      automationLearningState = JSON.parse(fs.readFileSync(AUTOMATION_LEARNING_PATH, 'utf8'));
    }
  } catch { /* ignore — fallback to static threshold */ }
  const perKb = deriveDiscoveryAutoDraftState(policy, automationLearningState);

  return {
    configured: policy.semiAutoEnabled,
    eligible: blockers.filter((item) => !/wyłączony|dry-run/i.test(item)).length === 0,
    active: blockers.length === 0,
    blockers,
    metrics: {
      reviewed: feedback.overall.reviewed,
      agreement: feedback.overall.agreement,
      falsePositiveRate,
      observationDays: Math.round(observationDays * 10) / 10,
      minimumConfidence: policy.semiAutoMinConfidence,
      maxPerRun: policy.semiAutoMaxPerRun,
      allowedNamespaces: policy.semiAutoAllowedNamespaces,
    },
    perKb,
  };
}
```

- [ ] **Step 3: Add `autoDraftLog` helper**

Add after `discoverySemiAutoStatus()` (before `discoveryCalibrationSample` which starts at line 795):

```javascript
const AUTO_DRAFT_LOG_PATH = path.join(
  process.env.ROOT || '/docker/openspg',
  'data/dashboard/learning/auto_draft_log.jsonl',
);

export function appendAutoDraftLog(entry) {
  try {
    fs.mkdirSync(path.dirname(AUTO_DRAFT_LOG_PATH), { recursive: true });
    fs.appendFileSync(AUTO_DRAFT_LOG_PATH, `${JSON.stringify({
      ts: new Date().toISOString(),
      ...entry,
    })}\n`, 'utf8');
  } catch { /* log silently */ }
}
```

- [ ] **Step 4: Update `briefingReport` to include `perKb` data**

Find `discoverySemiAuto: discoverySemiAutoStatus(policy, candidates)` in `briefingReport` (line 1295). The `perKb` field is already returned by the updated function — it will be included automatically in the briefing via the spread. No change needed for the JSON. For the markdown, add after the semi-auto active line (line 1307):

```javascript
+ ...Object.entries(briefing.semiAuto?.perKb || {}).map(([ns, state]) => (
+   `  - ${ns}: threshold=${state.threshold}${state.blockedByFp ? ' (blocked by FP)' : state.eligible ? ' (active)' : ' (not eligible)'}`
+ )),
```

This modifies the markdown template in `briefingReport` at the section starting around line 1298. Add the new line after line 1307.

- [ ] **Step 5: Run syntax check**

Run: `node --check scripts/lib/dashboard_discovery.mjs`
Expected: No output (syntax OK)

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/dashboard_discovery.mjs
git commit -m "feat: dynamic threshold per KB + professional tier + auto-draft log"
```

---

### Task 3: Modify runner — dynamic threshold inline + `--auto-draft` mode

**Files:**
- Modify: `scripts/run_dashboard_discovery.mjs`

- [ ] **Step 1: Add `appendAutoDraftLog` to imports in runner**

In `scripts/run_dashboard_discovery.mjs`, add `appendAutoDraftLog` to the existing import from `./lib/dashboard_discovery.mjs` (line 17-33):

```javascript
import {
  activeDiscoveryQueries,
  classifyDiscoveryTier,
  createDraftFromDiscoveryCandidate,
  discoveryActionForAssessment,
  discoveryFeedbackSummary,
  discoveryQueryStateAfterRun,
  discoverySemiAutoStatus,
  findDiscoveryCandidateByUrl,
  findExistingCorpusSource,
  isReviewableDiscoveryCandidate,
  listDiscoveryCandidates,
  loadDiscoveryPolicy,
  loadDiscoveryQueries,
  profileForNamespace,
  refreshDiscoveryReport,
  saveDiscoveryCandidate,
  saveDiscoveryQueries,
  appendAutoDraftLog,
  writeDiscoveryRun,
} from './lib/dashboard_discovery.mjs';
```

- [ ] **Step 2: Update the semi-auto eligibility check in the daily run**

Replace lines 310-318 in `scripts/run_dashboard_discovery.mjs`:

```javascript
const semiAutoEligible = (
  !run.dryRun
  && semiAuto.active
  && semiAutoDrafts < policy.semiAutoMaxPerRun
  && action === 'CREATE_DRAFT'
  && (tier === 'official' || tier === 'professional')
  && assessment.confidence >= (semiAuto?.perKb?.[targetProfile.kbNamespace]?.threshold ?? policy.semiAutoMinConfidence)
  && policy.semiAutoAllowedNamespaces.includes(targetProfile.kbNamespace)
  && (semiAuto?.perKb?.[targetProfile.kbNamespace]?.eligible !== false)
);
```

And after the draft is created (after line 322), add logging:

```javascript
appendAutoDraftLog({
  kb: targetProfile.kbNamespace,
  tier,
  confidence: assessment.confidence,
  threshold: semiAuto?.perKb?.[targetProfile.kbNamespace]?.threshold ?? policy.semiAutoMinConfidence,
  candidateId: candidate.id,
  draftId: '',
  queryId: query.id,
  mode: 'inline',
});
```

- [ ] **Step 2: Ensure `createDraftFromDiscoveryCandidate` returns draft result**

Read the end of `createDraftFromDiscoveryCandidate` in `scripts/lib/dashboard_discovery.mjs` (around line 950-970). If the function currently ends without returning the draft result (just returns `true` or nothing), modify it to `return true;` remain unchanged — the auto-draft log will use empty string for draftId. The log entry format already handles missing draftId gracefully.

- [ ] **Step 3: Add `--auto-draft` mode**

Add after `function weeklyPlannerContext()` (around line 410) and before `async function main()` (line 512):

```javascript
async function runAutoDraft(options = {}) {
  const policy = loadDiscoveryPolicy();
  const candidates = listDiscoveryCandidates(5000);
  const semiAuto = discoverySemiAutoStatus(policy, candidates);
  const now = new Date().toISOString();
  const run = {
    id: `discovery_autodraft_${now.replace(/[:.]/g, '-')}_${crypto.randomUUID().slice(0, 8)}`,
    type: 'autodraft',
    startedAt: now,
    finishedAt: now,
    dryRun: options.dryRun !== false,
    ok: true,
    candidateCount: 0,
    draftedCount: 0,
    errors: [],
  };
  if (!semiAuto.active || policy.dryRun) {
    run.ok = false;
    run.error = 'Semi-auto gate is not active or dry-run is enabled.';
    writeDiscoveryRun(run);
    return run;
  }
  const reviewable = candidates.filter(
    (candidate) => candidate.status === 'CANDIDATE_ONLY' && candidate.action === 'CREATE_DRAFT',
  );
  reviewable.sort((left, right) => (
    (right.priority?.score || 0) - (left.priority?.score || 0)
    || String(left.createdAt).localeCompare(String(right.createdAt))
  ));
  let autoDrafts = 0;
  const maxRun = policy.semiAutoMaxPerRun;
  for (const candidate of reviewable) {
    if (autoDrafts >= maxRun) break;
    const ns = candidate.kbNamespace;
    const nsState = semiAuto?.perKb?.[ns];
    if (!nsState?.eligible) continue;
    const effectiveThreshold = nsState.threshold;
    const confidence = Number(candidate.assessment?.confidence || 0);
    const tier = candidate.sourceTier;
    if (tier !== 'official' && tier !== 'professional') continue;
    if (confidence < effectiveThreshold) continue;
    if (autoDrafts >= policy.semiAutoMaxPerRun) break;
    if (!policy.semiAutoAllowedNamespaces.includes(ns)) continue;
    run.candidateCount += 1;
    if (run.dryRun) continue;
    try {
      const draftResult = await createDraftFromDiscoveryCandidate(candidate.id, 'discovery-autodraft');
      const draftId = draftResult?.id || draftResult?.draft?.id || '';
      run.draftedCount += 1;
      autoDrafts += 1;
      appendAutoDraftLog({
        kb: ns,
        tier,
        confidence,
        threshold: effectiveThreshold,
        candidateId: candidate.id,
        draftId,
        mode: 'autodraft',
      });
    } catch (error) {
      run.errors.push({ candidateId: candidate.id, message: error.message });
    }
  }
  run.finishedAt = new Date().toISOString();
  writeDiscoveryRun(run);
  refreshDiscoveryReport();
  if (run.draftedCount > 0) {
    appendDashboardAudit({
      actor: 'discovery-autodraft',
      role: 'system',
      action: 'discovery.run.autodraft',
      resourceType: 'discovery_run',
      resourceId: run.id,
      after: run,
    });
  }
  return run;
}
```

- [ ] **Step 4: Update `main()` to support `--auto-draft`**

Modify the `main()` function (line 512):

```javascript
async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.daily && !options.weekly && !options.autoDraft) {
    throw new Error('Use --daily, --weekly, or --auto-draft');
  }
  try {
    let result;
    if (options.autoDraft) {
      result = await runAutoDraft({ dryRun: options.dryRun !== false });
    } else {
      result = options.weekly ? await runWeekly() : await runDaily(options);
    }
    process.stdout.write(`${JSON.stringify({ ok: result.ok, result }, null, 2)}\n`);
    if (!result.ok && !options.weekly) process.exitCode = 1;
  } catch (error) {
    // ... existing error handling unchanged
  }
}
```

- [ ] **Step 5: Add `parseArgs` handling for `--auto-draft`**

Find `parseArgs` (around line 55-80). Add `'auto-draft'` to the option parsing:

```javascript
// After existing option parsing
if (flags['auto-draft']) options.autoDraft = true;
```

If `parseArgs` uses a simple `process.argv.slice(2).includes` pattern, add: `options.autoDraft = flags.includes('--auto-draft');`

Read the actual `parseArgs` function to see the exact pattern.

- [ ] **Step 6: Run syntax check**

Run: `node --check scripts/run_dashboard_discovery.mjs`
Expected: No output (syntax OK)

- [ ] **Step 7: Commit**

```bash
git add scripts/run_dashboard_discovery.mjs
git commit -m "feat: auto-draft mode runner with dynamic threshold per KB"
```

---

### Task 4: Update server — expose auto-draft state in learning API

**Files:**
- Modify: `scripts/erp_kb_dashboard_server.mjs`

- [ ] **Step 1: Add `deriveDiscoveryAutoDraftState` import**

Find the imports section (around line 1-70). Add:

```javascript
import { deriveDiscoveryAutoDraftState } from './lib/feedback_learning.mjs';
```

Verify the file already imports from `feedback_learning.mjs` (it does — for `deriveDiscoveryLearningState` etc.).

- [ ] **Step 2: Add auto-draft state to the `handleGetAutomationLearning` response**

In `scripts/erp_kb_dashboard_server.mjs`, modify `handleGetAutomationLearning` (around line 2181). After computing `penalties` (line 2208) and before the return, add:

```javascript
const discoveryPolicy = loadDiscoveryPolicy();
const autoDraftState = deriveDiscoveryAutoDraftState(discoveryPolicy, automationState);
```

Replace the return statement (lines 2210-2215) with:

```javascript
return sendJson(res, 200, {
  ok: true,
  thresholds,
  penalties,
  autoDraft: autoDraftState,
  generatedAt: new Date().toISOString(),
});
```

- [ ] **Step 3: Add `loadDiscoveryPolicy` to the import**

The file already imports `discoveryActionForAssessment` and `discoveryFeedbackSummary` from `./lib/dashboard_discovery.mjs` around line 20. Add `loadDiscoveryPolicy` to that same import.

- [ ] **Step 4: Run syntax check**

Run: `node --check scripts/erp_kb_dashboard_server.mjs`
Expected: No output (syntax OK)

- [ ] **Step 5: Commit**

```bash
git add scripts/erp_kb_dashboard_server.mjs
git commit -m "feat: expose auto-draft state in learning API"
```

---

### Task 5: Add UI panel — auto-draft status in SourcesPage

**Files:**
- Modify: `src/SourcesPage.jsx`

- [ ] **Step 1: Add auto-draft status panel**

After the semi-auto section (line 703, `</section>`), add:

```jsx
{discovery.semiAuto?.perKb ? (
  <section className="autoDraftPanel">
    <div className="sectionHeader">
      <div><h3>Auto-Draft per KB</h3><p>Dynamiczny próg na podstawie Phase 3 learning.</p></div>
    </div>
    <table className="autoDraftTable">
      <thead>
        <tr>
          <th>KB</th>
          <th>Tuned Baseline</th>
          <th>Threshold</th>
          <th>Status</th>
          <th>FP Rate</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(discovery.semiAuto.perKb).map(([ns, state]) => (
          <tr key={ns}>
            <td><code>{ns}</code></td>
            <td>{state.tunedBaseline != null ? state.tunedBaseline.toFixed(2) : '—'}</td>
            <td>{state.threshold.toFixed(2)}</td>
            <td>
              {state.blockedByFp
                ? <span className="statusBadge blocked">FP BLOCKED</span>
                : state.eligible
                  ? <span className="statusBadge active">ACTIVE</span>
                  : <span className="statusBadge inactive">INELIGIBLE</span>}
            </td>
            <td>{state.fpRate != null ? `${(state.fpRate * 100).toFixed(1)}%` : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
) : null}
```

- [ ] **Step 2: Add CSS styles**

In `src/styles/sources.css`, add:

```css
.autoDraftPanel {
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--surface);
  border-radius: 8px;
  border: 1px solid var(--border);
}
.autoDraftPanel .sectionHeader {
  margin-bottom: 1rem;
}
.autoDraftTable {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.autoDraftTable th,
.autoDraftTable td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}
.autoDraftTable th {
  font-weight: 600;
  color: var(--muted);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.autoDraftTable .statusBadge.active {
  color: var(--success);
}
.autoDraftTable .statusBadge.blocked {
  color: var(--danger);
}
.autoDraftTable .statusBadge.inactive {
  color: var(--muted);
}
```

- [ ] **Step 3: Run dashboard syntax check**

Run: `npm run check`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/SourcesPage.jsx src/styles/sources.css
git commit -m "feat: auto-draft per-KB status panel in SourcesPage"
```

---

### Task 6: Add tests

**Files:**
- Modify: `scripts/test_dashboard_discovery.mjs`

- [ ] **Step 1: Add `deriveDiscoveryAutoDraftState` tests**

Find `scripts/test_dashboard_discovery.mjs`. Add a new test case:

```javascript
{
  name: 'autoDraftState: fallback threshold when no learning state',
  test() {
    const policy = defaultDiscoveryPolicy();
    const result = deriveDiscoveryAutoDraftState(policy, null);
    for (const ns of Object.keys(result)) {
      assert(result[ns].threshold === policy.semiAutoMinConfidence,
        `Expected threshold ${policy.semiAutoMinConfidence} for ${ns}, got ${result[ns].threshold}`);
      assert(result[ns].eligible === (policy.semiAutoAllowedNamespaces.includes(ns)),
        `Expected eligible=${policy.semiAutoAllowedNamespaces.includes(ns)} for ${ns}`);
    }
  },
},
{
  name: 'autoDraftState: dynamic threshold from learning state',
  test() {
    const policy = defaultDiscoveryPolicy();
    const automationState = {
      byKbNamespace: {
        ComarchOptimaReference: { tunedBaseline: 0.82, windowFpRate: 0.03, reviewed: 10, windowSize: 50 },
        ComarchOptimaAdditionalFunctions: { tunedBaseline: 0.95, windowFpRate: 0.12, reviewed: 5, windowSize: 30 },
      },
    };
    const result = deriveDiscoveryAutoDraftState(policy, automationState);
    assert(result.ComarchOptimaReference.threshold === 0.82,
      `Expected 0.82, got ${result.ComarchOptimaReference.threshold}`);
    assert(result.ComarchOptimaReference.eligible === true,
      'ComarchOptimaReference should be eligible');
    assert(result.ComarchOptimaAdditionalFunctions.blockedByFp === true,
      'ComarchOptimaAdditionalFunctions should be blocked by FP > 5%');
    assert(result.ComarchOptimaAdditionalFunctions.eligible === false,
      'ComarchOptimaAdditionalFunctions should not be eligible');
  },
},
{
  name: 'autoDraftState: unknown KB namespace not eligible',
  test() {
    const policy = defaultDiscoveryPolicy();
    const result = deriveDiscoveryAutoDraftState(policy, null);
    // TaxbellLegalReference is NOT in semiAutoAllowedNamespaces
    assert(result.TaxbellLegalReference?.eligible === false,
      'Non-allowed KB should not be eligible');
  },
},
```

- [ ] **Step 2: Install import for `deriveDiscoveryAutoDraftState`**

Add at the top of the test file:

```javascript
import { deriveDiscoveryAutoDraftState } from './lib/feedback_learning.mjs';
```

- [ ] **Step 3: Run tests**

Run: `node scripts/test_dashboard_discovery.mjs`
Expected: New tests PASS

- [ ] **Step 4: Run full test pack**

Run: `node scripts/test_content_cleaning_pipeline.mjs && node scripts/test_feedback_learning.mjs && node scripts/test_dashboard_discovery.mjs`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/test_dashboard_discovery.mjs
git commit -m "test: auto-draft state derivation tests"
```

---

### Task 7: Create systemd timer for `--auto-draft` mode

**Files:**
- Create: `scripts/setup_autodraft_timer.sh`

- [ ] **Step 1: Create setup script**

```bash
#!/usr/bin/env bash
# Run as root or with sudo
set -euo pipefail

SERVICE_NAME="erp-kb-discovery-autodraft"
SCRIPT="/docker/openspg/scripts/run_dashboard_discovery.mjs"
USER="mcpbot"

# Service unit
cat > "/etc/systemd/system/${SERVICE_NAME}.service" << 'EOF'
[Unit]
Description=ERP KB Discovery Auto-Draft (every 6h)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/node /docker/openspg/scripts/run_dashboard_discovery.mjs --auto-draft
User=mcpbot
Group=mcpbot
Environment=ROOT=/docker/openspg
WorkingDirectory=/docker/openspg
StandardOutput=journal
StandardError=journal
EOF

# Timer unit
cat > "/etc/systemd/system/${SERVICE_NAME}.timer" << 'EOF'
[Unit]
Description=ERP KB Discovery Auto-Draft every 6 hours
Requires=erp-kb-discovery-autodraft.service

[Timer]
OnCalendar=*-*-* 00,06,12,18:00:00
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}.timer"
systemctl start "${SERVICE_NAME}.timer"
echo "Auto-draft timer installed and started."
```

- [ ] **Step 2: Make executable and run**

```bash
chmod +x scripts/setup_autodraft_timer.sh
sudo bash scripts/setup_autodraft_timer.sh
```

- [ ] **Step 3: Verify timer**

```bash
sudo systemctl status erp-kb-discovery-autodraft.timer
```

Expected: `Active: active (waiting)` or `Active: active (running)`

- [ ] **Step 4: Commit**

```bash
git add scripts/setup_autodraft_timer.sh
git commit -m "feat: systemd timer for auto-draft mode (every 6h)"
```

---

### Task 8: End-to-end verification

- [ ] **Step 1: Run full dashboard check**

```bash
npm run check
```

Expected: No errors.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds (dashboard compiled).

- [ ] **Step 3: Review auto-draft log format**

```bash
cat data/dashboard/learning/auto_draft_log.jsonl 2>/dev/null || echo "No auto-drafts yet"
```

Expected: JSONL lines or "No auto-drafts yet".

- [ ] **Step 4: Test `--auto-draft` in dry-run mode**

```bash
node scripts/run_dashboard_discovery.mjs --auto-draft
```

Expected: JSON output with `dryRun: true`, `candidateCount` reflecting eligible candidates, `draftedCount: 0`.
