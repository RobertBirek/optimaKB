# Auto-Reroute Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-apply reroute proposals for (sourceKb→targetKb) pairs with correctRate ≥ 0.90 and reviewed ≥ 5.

**Architecture:** New function `applyAutomationRerouteAuto()` in `dashboard_automation.mjs` bypasses operator adjudication. Runner checks learning state after LLM proposes reroute and auto-applies if conditions met.

**Tech Stack:** Node.js ESM, OpenSPG KB automation pipeline

---

### Task 1: Add applyAutomationRerouteAuto to dashboard_automation.mjs

**Files:**
- Modify: `scripts/lib/dashboard_automation.mjs`
- Modify: `scripts/lib/feedback_learning.mjs`

- [ ] **Step 1: Export reroutePairKey from feedback_learning.mjs**

In `/docker/openspg/scripts/lib/feedback_learning.mjs`, change line 242 from:

```javascript
function reroutePairKey(sourceKb, targetKb) {
```

to:

```javascript
export function reroutePairKey(sourceKb, targetKb) {
```

- [ ] **Step 2: Add applyAutomationRerouteAuto to dashboard_automation.mjs**

In `/docker/openspg/scripts/lib/dashboard_automation.mjs`, after `applyAutomationReroute` (ends at line 784), add:

```javascript
export function applyAutomationRerouteAuto(job, learningState) {
  if (!job || !job.reroute?.targetKb) {
    throw new Error('Job does not have a reroute proposal');
  }
  if (job.status !== 'REROUTE_PROPOSED' || !job.reroute?.targetKb) {
    throw new Error(`Job does not have an applicable reroute proposal: ${job.status}`);
  }
  if (job.reroute?.appliedAt) throw new Error('Reroute proposal was already applied');

  const pairKey = reroutePairKey(job.kbNamespace, job.reroute.targetKb);
  const pairSignal = learningState?.reroutePairs?.[pairKey];
  const correctRate = pairSignal?.correctRate ?? 0;
  const reviewed = pairSignal?.reviewed ?? 0;

  if (correctRate < 0.9 || reviewed < 5) {
    throw new Error(
      `Reroute pair ${pairKey} does not meet auto-apply threshold: ` +
      `correctRate=${(correctRate * 100).toFixed(1)}% (need ≥90%), reviewed=${reviewed} (need ≥5)`,
    );
  }

  const lock = acquireAutomationLock(`draft_${job.draftId}`, {
    jobId: job.id,
    operation: 'apply_reroute_auto',
  });
  try {
    const beforeDraft = findRawDraftById(job.draftId);
    const rerouted = reroutePendingDraft(job.draftId, job.reroute.targetKb, {
      reroutedBy: 'discovery-autodraft',
      note: `Auto-reroute: pair ${pairKey} has ${(correctRate * 100).toFixed(1)}% accuracy over ${reviewed} reviews.`,
      automationJobId: job.id,
    });
    const nextReview = triggerAutomationForDraft(rerouted.draft, {
      force: true,
      mode: 'shadow',
      origin: 'live',
      reroutedFrom: job.id,
      actor: 'discovery-autodraft',
      message: `Post-reroute shadow review from ${job.kbNamespace} to ${rerouted.draft.kbNamespace} (auto-applied).`,
    });
    if (!nextReview.started) {
      throw new Error(`Post-reroute review did not start: ${nextReview.reason || 'unknown reason'}`);
    }
    const updatedJob = transitionAutomationJob(job, 'REROUTED', {
      status: 'REROUTED',
      actor: 'discovery-autodraft',
      autoApplied: true,
      reroute: {
        ...job.reroute,
        appliedAt: new Date().toISOString(),
        appliedBy: 'discovery-autodraft',
        note: `Auto-reroute: ${pairKey} (${(correctRate * 100).toFixed(1)}% accuracy, ${reviewed} reviews)`,
        reviewJobId: nextReview.job.id,
      },
      transitionMessage: `Draft auto-rerouted to ${rerouted.draft.kbNamespace}; post-reroute shadow review started.`,
    });
    appendDashboardAudit({
      actor: 'discovery-autodraft',
      role: 'system',
      action: 'automation.reroute.auto_apply',
      resourceType: 'knowledge_draft',
      resourceId: job.draftId,
      before: {
        kbName: beforeDraft.kbName,
        kbNamespace: beforeDraft.kbNamespace,
      },
      after: rerouted.after,
      metadata: {
        proposalJobId: job.id,
        reviewJobId: nextReview.job.id,
        reroutePair: pairKey,
        correctRate,
        reviewed,
      },
    });
    refreshAutomationCanaryReport();
    return {
      job: updatedJob,
      draft: rerouted.draft,
      reviewJob: nextReview.job,
    };
  } finally {
    lock.release();
  }
}
```

- [ ] **Step 3: Add reroutePairKey to imports in dashboard_automation.mjs**

Find the import from `./feedback_learning.mjs` in `dashboard_automation.mjs` (line 9). Add `reroutePairKey`:

```javascript
import { automationLearningAdjustment, deriveAutomationLearningState, reroutePairKey } from './feedback_learning.mjs';
```

- [ ] **Step 4: Run syntax check**

Run: `node --check scripts/lib/dashboard_automation.mjs`
Expected: No output (syntax OK)

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/dashboard_automation.mjs scripts/lib/feedback_learning.mjs
git commit -m "feat: applyAutomationRerouteAuto for high-confidence reroute pairs"
```

---

### Task 2: Update runner to call auto-apply

**Files:**
- Modify: `scripts/run_dashboard_automation.mjs`

- [ ] **Step 1: Add import for reroutePairKey and applyAutomationRerouteAuto**

In `scripts/run_dashboard_automation.mjs`, add to the existing `dashboard_automation.mjs` import (lines 8-18):

```javascript
import {
  acquireAutomationLock,
  AUTOMATION_SNAPSHOTS_ROOT,
  AUTOMATION_SHADOW_REPORT_PATH,
  applyAutomationRerouteAuto,
  createAutomationJob,
  listAutomationJobs,
  loadAutomationConfig,
  readAutomationJob,
  saveAutomationJob,
  transitionAutomationJob,
} from './lib/dashboard_automation.mjs';
```

And in the `feedback_learning.mjs` import (line 31), add `reroutePairKey`:

```javascript
import { automationGuardrailsForDraft, buildAutomationPromptMemory, deriveAutomationLearningState, reroutePairKey } from './lib/feedback_learning.mjs';
```

- [ ] **Step 2: Insert auto-apply logic after reroute proposal**

In the `reviewDraft` function, find the reroute handling block (around lines 556-562):

```javascript
    if (reroute) {
      return transitionAutomationJob(job, 'REROUTE_PROPOSED', {
        status: 'REROUTE_PROPOSED',
        reroute,
        transitionMessage: `Proposed reroute ${reroute.sourceKb} -> ${reroute.targetKb}; no promotion or build executed.`,
      });
    }
```

Replace it with:

```javascript
    if (reroute) {
      const pairKey = reroutePairKey(draft.kbNamespace, reroute.targetKb);
      const pairSignal = learningState?.reroutePairs?.[pairKey];
      const canAutoApply = (
        pairSignal?.correctRate >= 0.9
        && (pairSignal?.reviewed ?? 0) >= 5
        && review.duplicateRisk !== 'high'
        && review.contentRisk !== 'high'
      );
      if (canAutoApply) {
        const proposedJob = transitionAutomationJob(job, 'REROUTE_PROPOSED', {
          status: 'REROUTE_PROPOSED',
          reroute,
          transitionMessage: `Auto-reroute candidate ${reroute.sourceKb} -> ${reroute.targetKb}; attempting auto-apply.`,
        });
        try {
          return applyAutomationRerouteAuto(proposedJob, learningState);
        } catch (error) {
          return transitionAutomationJob(job, 'REROUTE_PROPOSED', {
            status: 'REROUTE_PROPOSED',
            reroute,
            transitionMessage: `Auto-reroute failed: ${error.message}. Falling back to operator review.`,
          });
        }
      }
      return transitionAutomationJob(job, 'REROUTE_PROPOSED', {
        status: 'REROUTE_PROPOSED',
        reroute,
        transitionMessage: `Proposed reroute ${reroute.sourceKb} -> ${reroute.targetKb}; no promotion or build executed.`,
      });
    }
```

Note: `learningState` is already available in the `reviewDraft` function — it's computed at line 271 (`const learningState = deriveAutomationLearningState(listAutomationJobs(500))`) inside `publicationEvaluation`, not in `reviewDraft`. Check if `reviewDraft` can access it.

Actually, `publicationEvaluation` recomputes `learningState` every time it's called (line 271). The `reviewDraft` function doesn't currently compute it. So add it before the reroute handling:

```javascript
const learningState = deriveAutomationLearningState(listAutomationJobs(500));
```

Add this line just before the `if (reroute) {` block (around line 556).

- [ ] **Step 3: Run syntax check**

Run: `node --check scripts/run_dashboard_automation.mjs`
Expected: No output (syntax OK)

- [ ] **Step 4: Commit**

```bash
git add scripts/run_dashboard_automation.mjs
git commit -m "feat: auto-apply reroute for high-confidence pairs in runner"
```

---

### Task 3: Add tests

**Files:**
- Modify: `scripts/test_dashboard_automation.mjs`

- [ ] **Step 1: Add test for applyAutomationRerouteAuto**

Read `/docker/openspg/scripts/test_dashboard_automation.mjs` to understand the test structure and find where to add tests. Then add at the end of the test list:

```javascript
{
  name: 'applyAutomationRerouteAuto: rejects pair below threshold',
  test() {
    const job = {
      id: 'test_job_1',
      kbNamespace: 'SourceKb',
      status: 'REROUTE_PROPOSED',
      draftId: 'test_draft_1',
      reroute: { targetKb: 'TargetKb', confidence: 0.85, reasons: ['test'] },
    };
    const weakLearning = {
      reroutePairs: {
        'SourceKb->TargetKb': { correctRate: 0.5, reviewed: 3 },
      },
    };
    assert.throws(
      () => applyAutomationRerouteAuto(job, weakLearning),
      /does not meet auto-apply threshold/,
      'Should reject pair below threshold',
    );
  },
},
{
  name: 'applyAutomationRerouteAuto: throws on missing reroute',
  test() {
    const job = { id: 'test_job_2', kbNamespace: 'SourceKb', status: 'REVIEWED' };
    assert.throws(
      () => applyAutomationRerouteAuto(job, {}),
      /does not have a reroute proposal/,
      'Should throw for missing reroute',
    );
  },
},
```

- [ ] **Step 2: Add imports in test file**

Add to the existing imports:

```javascript
import { applyAutomationRerouteAuto } from './lib/dashboard_automation.mjs';
```

- [ ] **Step 3: Run tests**

Run: `node scripts/test_dashboard_automation.mjs`
Expected: New tests PASS

- [ ] **Step 4: Run full check**

Run: `npm run check`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add scripts/test_dashboard_automation.mjs
git commit -m "test: auto-reroute threshold tests"
```

---

### Task 4: End-to-end verification

- [ ] **Step 1: Run full test suite**

```bash
node scripts/test_dashboard_automation.mjs && node scripts/test_feedback_learning.mjs
```

Expected: All tests PASS

- [ ] **Step 2: Build dashboard**

```bash
npm run build
```

Expected: Build succeeds
