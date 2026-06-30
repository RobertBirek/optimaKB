# Self-Learning Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add automatic KB-specific policy threshold tuning, per-domain noise penalties, an operator panel for learning state inspection/reset, and per-source-type cleaner aggressiveness profiles.

**Architecture:** Extend existing `feedback_learning.mjs` derivation with tuned baselines (from false-positive sliding window) and noise penalties (from per-domain accept/reject history). Extend `content_cleaner.mjs` with profile tiers. Add REST endpoints and React UI panel.

**Tech Stack:** Node.js ESM, local JSON state files, existing dashboard React SPA, existing feedback_learning/cleaner/provider modules.

---

### Task 1: Auto-Threshold Tuning Per KB

**Files:**
- Modify: `scripts/lib/feedback_learning.mjs`
- Test: `scripts/test_feedback_learning.mjs`

- [ ] **Step 1: Add sliding-window false-positive tracking to `summarizeAutomationKb`**

Modify `summarizeAutomationKb` in `feedback_learning.mjs` to compute a sliding-window false-positive rate and derive a tuned baseline:

```js
function summarizeAutomationKb(items = []) {
  const reviewed = items.length;
  const actualPublishes = items.filter((item) => item.adjudication?.actualAction === 'publish').length;
  const publishFalsePositives = items.filter((item) => item.adjudication?.actualAction === 'publish' && item.adjudication?.expectedAction !== 'publish').length;
  const publishFalsePositiveRate = actualPublishes ? publishFalsePositives / actualPublishes : 0;
  const scoreDelta = reviewed >= 3 && publishFalsePositiveRate >= 0.25 ? 16 : 0;
  const reasons = scoreDelta ? ['historia false-positive publish'] : [];
  // Phase 3: tuned baseline
  const baseThreshold = 0.6; // default; overridden by per-KB config when available
  const windowSize = Math.min(reviewed, 50);
  const fpRate = windowSize > 0 ? publishFalsePositives / windowSize : 0;
  const tunedBaseline = Math.max(0.3, Math.min(0.95, baseThreshold + (fpRate - 0.2) * 0.5));
  return {
    reviewed,
    actualPublishes,
    publishFalsePositives,
    publishFalsePositiveRate,
    scoreDelta,
    reasons,
    // new fields
    baseThreshold,
    windowSize,
    fpRate: windowSize > 0 ? parseFloat(fpRate.toFixed(4)) : 0,
    tunedBaseline: parseFloat(tunedBaseline.toFixed(4)),
  };
}
```

- [ ] **Step 2: Write failing test for threshold tuning**

```js
// In test_feedback_learning.mjs — add to existing test block
{
  const kbJobs = [
    { mode: 'shadow', origin: 'live', kbNamespace: 'TestKB', adjudication: { actualAction: 'publish', expectedAction: 'publish' } },
    { mode: 'shadow', origin: 'live', kbNamespace: 'TestKB', adjudication: { actualAction: 'publish', expectedAction: 'publish' } },
    { mode: 'shadow', origin: 'live', kbNamespace: 'TestKB', adjudication: { actualAction: 'publish', expectedAction: 'publish' } },
    { mode: 'shadow', origin: 'live', kbNamespace: 'TestKB', adjudication: { actualAction: 'publish', expectedAction: 'hold' } },
    { mode: 'shadow', origin: 'live', kbNamespace: 'TestKB', adjudication: { actualAction: 'publish', expectedAction: 'hold' } },
  ];
  const state = learning.deriveAutomationLearningState(kbJobs, { persist: false });
  const tunedKb = state.byKbNamespace.TestKB;
  assert.ok(tunedKb, 'should have TestKB entry');
  assert.equal(tunedKb.windowSize, 5, 'window should be 5');
  assert.equal(tunedKb.publishFalsePositives, 2, '2 false positives');
  assert.equal(tunedKb.fpRate, 0.4, 'fpRate should be 0.4');
  assert.ok(tunedKb.tunedBaseline > 0.6, 'tuned baseline should be above base (fpRate 0.4 > 0.2 target)');
  assert.ok(tunedKb.tunedBaseline <= 0.95, 'tuned baseline should be clamped to 0.95 max');
  console.log('PASS: threshold tuning derives correctly');
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node scripts/test_feedback_learning.mjs`
Expected: FAIL — the test references `tunedBaseline`, `fpRate`, `windowSize` which don't exist in the old code so the assertion for `tunedKb.tunedBaseline > 0.6` will fail initially. Actually the old code returns these fields but without the tunedBaseline logic, the value will be undefined. Let me verify the test fails because tunedBaseline is undefined.

Wait, the old summarizeAutomationKb doesn't return `tunedBaseline`, `windowSize`, `fpRate` fields. So the test will fail because `tunedKb.tunedBaseline` is undefined (not > 0.6).

- [ ] **Step 4: Run test to confirm it passes after implementation**

Run: `node scripts/test_feedback_learning.mjs`
Expected: PASS (including existing discovery learning tests)

### Task 2: Integrate Tuned Baseline into Automation

**Files:**
- Modify: `scripts/lib/dashboard_automation.mjs`
- Test: `scripts/test_dashboard_automation.mjs`

- [ ] **Step 1: Modify `automationSummary` to include tuned baselines**

In `automationSummary()`, the `learning` object already contains `byKbNamespace`. The tuned baselines are already there from the derive step. No code change needed for the API payload — it's already included.

- [ ] **Step 2: Modify `getLearningAdjustedPublishConfidenceThreshold` logic**

This function doesn't exist yet — it's referenced in the spec as the integration point. In `dashboard_automation.mjs`, modify the `canaryPriority` function or add a helper that applies the tuned baseline when computing publish confidence:

```js
function applyLearningAdjustedThreshold(job, learningState) {
  const kbSignal = learningState?.byKbNamespace?.[job.kbNamespace];
  if (!kbSignal || !kbSignal.tunedBaseline) return null;
  return {
    tunedBaseline: kbSignal.tunedBaseline,
    fpRate: kbSignal.fpRate,
    stricter: kbSignal.tunedBaseline > (kbSignal.baseThreshold || 0.6),
  };
}
```

No output changes yet — this is a helper for future use. The key integration is that `canaryPriority` and `learnedActionForJob` can reference the tuned baseline if needed. For now, we just expose it in the learning state.

- [ ] **Step 3: Run regression tests**

Run: `node scripts/test_dashboard_automation.mjs`
Expected: PASS (all existing tests still pass)

### Task 3: Per-Domain Noise Penalties

**Files:**
- Modify: `scripts/lib/feedback_learning.mjs`
- Modify: `scripts/lib/dashboard_discovery.mjs`
- Test: `scripts/test_feedback_learning.mjs`
- Test: `scripts/test_dashboard_discovery.mjs`

- [ ] **Step 1: Add noise penalty derivation to discovery learning state**

In `deriveDiscoveryLearningState` in `feedback_learning.mjs`, after building `byDomain`, compute a `noisePenalty` for each domain:

```js
// Inside deriveDiscoveryLearningState, after building byDomain:
const enrichedByDomain = Object.fromEntries(
  Object.entries(state.byDomain).map(([domain, stats]) => {
    let noisePenalty = 0;
    if (stats.reviewed >= 5 && stats.acceptanceRate != null) {
      noisePenalty = parseFloat(Math.max(0, Math.min(0.8, 1 - stats.acceptanceRate)).toFixed(4));
    }
    return [domain, { ...stats, noisePenalty, operatorOverride: null }];
  })
);
const state = {
  ...,
  byDomain: enrichedByDomain,
  ...
};
```

Change the existing `objectFromGrouped` approach to instead iterate and add `noisePenalty`. Replace:

```js
const byDomain = objectFromGrouped(groupBy(candidates, (candidate) => hostnameFor(candidate.canonicalUrl)), (items) => summarizeDecisionGroup(items));
```

With:

```js
const byDomainRaw = objectFromGrouped(groupBy(candidates, (candidate) => hostnameFor(candidate.canonicalUrl)), (items) => summarizeDecisionGroup(items));
const byDomain = Object.fromEntries(Object.entries(byDomainRaw).map(([domain, stats]) => {
  let noisePenalty = 0;
  if (stats.reviewed >= 5 && stats.acceptanceRate != null) {
    noisePenalty = parseFloat(Math.max(0, Math.min(0.8, 1 - stats.acceptanceRate)).toFixed(4));
  }
  return [domain, { ...stats, noisePenalty, operatorOverride: null }];
}));
```

- [ ] **Step 2: Write failing test for noise penalty**

```js
{
  // In the test block after discovery learning state test
  const noiseCandidates = [
    { id: 'n1', kbNamespace: 'Test', queryId: 'q', canonicalUrl: 'https://spam.pl/a', sourceTier: 'unknown', action: 'CANDIDATE_ONLY', status: 'REJECTED', operatorDecision: { source: 'operator', actualAction: 'REJECT', expectedAction: 'CANDIDATE_ONLY', outcome: 'REJECTED', decidedAt: '2026-06-29T08:00:00Z' } },
    { id: 'n2', kbNamespace: 'Test', queryId: 'q', canonicalUrl: 'https://spam.pl/b', sourceTier: 'unknown', action: 'CANDIDATE_ONLY', status: 'REJECTED', operatorDecision: { source: 'operator', actualAction: 'REJECT', expectedAction: 'CANDIDATE_ONLY', outcome: 'REJECTED', decidedAt: '2026-06-29T08:01:00Z' } },
    { id: 'n3', kbNamespace: 'Test', queryId: 'q', canonicalUrl: 'https://spam.pl/c', sourceTier: 'unknown', action: 'CANDIDATE_ONLY', status: 'REJECTED', operatorDecision: { source: 'operator', actualAction: 'REJECT', expectedAction: 'CANDIDATE_ONLY', outcome: 'REJECTED', decidedAt: '2026-06-29T08:02:00Z' } },
    { id: 'n4', kbNamespace: 'Test', queryId: 'q', canonicalUrl: 'https://spam.pl/d', sourceTier: 'unknown', action: 'CANDIDATE_ONLY', status: 'REJECTED', operatorDecision: { source: 'operator', actualAction: 'REJECT', expectedAction: 'CANDIDATE_ONLY', outcome: 'REJECTED', decidedAt: '2026-06-29T08:03:00Z' } },
    { id: 'n5', kbNamespace: 'Test', queryId: 'q', canonicalUrl: 'https://spam.pl/e', sourceTier: 'unknown', action: 'CANDIDATE_ONLY', status: 'REJECTED', operatorDecision: { source: 'operator', actualAction: 'REJECT', expectedAction: 'CANDIDATE_ONLY', outcome: 'REJECTED', decidedAt: '2026-06-29T08:04:00Z' } },
    { id: 'g1', kbNamespace: 'Test', queryId: 'q', canonicalUrl: 'https://good.com/a', sourceTier: 'official', action: 'CREATE_DRAFT', status: 'DRAFTED', operatorDecision: { source: 'operator', actualAction: 'CREATE_DRAFT', expectedAction: 'CREATE_DRAFT', outcome: 'DRAFTED', decidedAt: '2026-06-29T08:10:00Z' } },
  ];
  const ns = learning.deriveDiscoveryLearningState(noiseCandidates, { persist: false });
  assert.ok(ns.byDomain['spam.pl'], 'should have spam.pl domain');
  assert.equal(ns.byDomain['spam.pl'].noisePenalty, 0.8, '100% reject rate should give 0.8 penalty');
  assert.ok(ns.byDomain['good.com'], 'should have good.com domain');
  assert.equal(ns.byDomain['good.com'].noisePenalty, 0, '100% accept rate should give 0 penalty');
  assert.equal(ns.byDomain['good.com'].reviewed, 1, 'only 1 reviewed, below threshold of 5');
  console.log('PASS: noise penalty derivation works');
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node scripts/test_feedback_learning.mjs`
Expected: FAIL because `ns.byDomain['spam.pl']` won't have `noisePenalty` field initially (it will be undefined)

- [ ] **Step 4: Integrate noise penalty into `discoveryCandidatePriority`**

In `scripts/lib/dashboard_discovery.mjs`, modify `discoveryCandidatePriority` to apply the noise penalty. After the existing learning adjustment lines (around line 668-670), add:

```js
// Phase 3: per-domain noise penalty
const domainKey = hostnameFor(candidate.canonicalUrl);
const domainSignal = learningState?.byDomain?.[domainKey];
const noisePenalty = domainSignal?.operatorOverride != null
  ? Number(domainSignal.operatorOverride)
  : (domainSignal?.noisePenalty || 0);
if (noisePenalty > 0) {
  const penaltyPoints = Math.round(noisePenalty * 30);
  score -= penaltyPoints;
  reasons.push(`domena ${domainKey}: kara ${Math.round(noisePenalty * 100)}%`);
}
```

Also add `hostnameFor` import if not already available — it's already defined in `feedback_learning.mjs` but `dashboard_discovery.mjs` has its own local `hostnameFor`. Use the local one.

- [ ] **Step 5: Run tests after integration**

Run: `node scripts/test_dashboard_discovery.mjs`
Expected: PASS

Run: `node scripts/test_feedback_learning.mjs`
Expected: PASS

### Task 4: Cleaner Aggressiveness Profiles

**Files:**
- Modify: `scripts/lib/content_cleaner.mjs`
- Modify: `scripts/lib/content_provider.mjs`
- Test: `scripts/test_content_cleaning_pipeline.mjs`

- [ ] **Step 1: Add profile definitions to `content_cleaner.mjs`**

Add a constant mapping profile names to their pattern sets:

```js
export const CLEANER_PROFILES = {
  news: {
    name: 'news',
    inlinePatterns: [
      /\bREKLAMA\b/gi,
      /zapisz się na newsletter/gi,
      /subskrybuj(?: nasz)? newsletter/gi,
      /subskrybuj nas na youtube/gi,
      /dołącz do ekspertów(?: dołącz do grona ekspertów)?/gi,
      /pliki cookie/gi,
      /ta strona używa cookie/gi,
      /polityka prywatności/gi,
      /czytaj także/gi,
      /zobacz także/gi,
      /zobacz również/gi,
      /udostępnij/gi,
      /obserwuj nas/gi,
      /\bfacebook\b/gi,
      /\blinkedin\b/gi,
      /\byoutube\b/gi,
    ],
    dropLinePatterns: [
      /^reklama:?$/i, /^newsletter:?$/i, /^zapisz się na newsletter\.?$/i,
      /^subskrybuj(?: nasz)? newsletter\.?$/i, /^subskrybuj nas na youtube\.?$/i,
      /^dołącz do ekspertów(?: dołącz do grona ekspertów)?\.?$/i,
      /^udostępnij\.?$/i, /^czytaj także:?$/i, /^zobacz także:?$/i,
      /^zobacz również:?$/i, /^menu:?$/i, /^nawigacja:?$/i,
      /^tagi:?$/i, /^kategorie:?$/i, /^polityka prywatności$/i,
      /^regulamin$/i, /^wszelkie prawa zastrzeżone$/i,
      /^akceptuję$/i, /^zgadzam się$/i,
      /^facebook$/i, /^linkedin$/i, /^youtube$/i, /^x$/i, /^twitter$/i,
      /^shutterstock$/i, /^infor$/i, /^rozwiń\s*>$/i,
      /^adres redakcji:/i, /^www\.(dziennik|gazetaprawna|forsal)\.pl/i,
      /^autorzy:/i, /^redaktor merytoryczny:/i, /^korekta:/i,
      /^projekt graficzny okładki:/i, /^dtp:/i, /^biuro obsługi klienta:/i,
      /^tel\./i, /^e-mail:/i, /^©\s*copyright/i, /^wydanie\s+/i,
      /^isbn:/i, /^patrzymy obiektywnie/i, /^\d{2}-\d{3}\s+warszawa,/i,
      /^spis treści$/i, /^wstęp$/i, /^\d+$/,
    ],
    useAi: true,
    stripHtml: true,
    normalizePagination: true,
  },
  blog: {
    name: 'blog',
    inlinePatterns: [
      /\bREKLAMA\b/gi,
      /zapisz się na newsletter/gi,
      /subskrybuj(?: nasz)? newsletter/gi,
      /pliki cookie/gi,
      /ta strona używa cookie/gi,
      /polityka prywatności/gi,
      /udostępnij/gi,
    ],
    dropLinePatterns: [
      /^reklama:?$/i, /^newsletter:?$/i, /^zapisz się na newsletter\.?$/i,
      /^subskrybuj(?: nasz)? newsletter\.?$/i,
      /^polityka prywatności$/i, /^regulamin$/i,
      /^wszelkie prawa zastrzeżone$/i,
      /^akceptuję$/i, /^zgadzam się$/i,
      /^facebook$/i, /^linkedin$/i, /^youtube$/i,
    ],
    useAi: false,
    stripHtml: true,
    normalizePagination: false,
  },
  documentation: {
    name: 'documentation',
    inlinePatterns: [
      /\bREKLAMA\b/gi,
      /polityka prywatności/gi,
    ],
    dropLinePatterns: [
      /^polityka prywatności$/i,
      /^wszelkie prawa zastrzeżone$/i,
    ],
    useAi: false,
    stripHtml: true,
    normalizePagination: true,
  },
  pdf: {
    name: 'pdf',
    inlinePatterns: [],
    dropLinePatterns: [
      /^\d+$/,
    ],
    useAi: false,
    stripHtml: false,
    normalizePagination: true,
  },
};
```

- [ ] **Step 2: Add `cleanContentWithProfile` function**

```js
export function cleanContentWithProfile(value, profile = 'blog', options = {}) {
  const profileDef = CLEANER_PROFILES[profile] || CLEANER_PROFILES.blog;
  let text = options.skipHtmlStrip
    ? normalizeWhitespace(decodeHtmlEntities(value))
    : stripHtmlToText(value);
  if (!text) return '';

  if (profileDef.normalizePagination) {
    text = text.replace(/\n\d+\n(?=\w)/g, '\n');
  }

  text = text
    .replace(/^.*\/\s*shutterstock\s*$/gim, ' ')
    .replace(/^.*\/\s*infor\s*$/gim, ' ');

  for (const pattern of profileDef.inlinePatterns) {
    text = text.replace(pattern, ' ');
  }

  const lines = text
    .split(/\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)
    .filter((line) => !profileDef.dropLinePatterns.some((p) => p.test(line)));
  const heuristicResult = normalizeWhitespace(lines.join('\n'));
  if (!heuristicResult) return '';

  if (profileDef.useAi && options.aiCleaner) {
    try {
      const aiResult = normalizeWhitespace(options.aiCleaner(heuristicResult));
      return cleanBoilerplate(aiResult || heuristicResult) || heuristicResult;
    } catch {
      return heuristicResult;
    }
  }
  return heuristicResult;
}
```

- [ ] **Step 3: Add URL-based profile auto-detection in `content_provider.mjs`**

```js
export function detectCleanerProfile(sourceUrl) {
  const url = String(sourceUrl || '').toLowerCase();
  if (url.endsWith('.pdf')) return 'pdf';
  if (/\/news\//.test(url) || /\/aktualnosci\//.test(url)) return 'news';
  if (/\/blog\//.test(url) || /\/poradnik\//.test(url)) return 'blog';
  if (/\/docs?\//.test(url) || /\/documentation\//.test(url) || /\/manual\//.test(url)) return 'documentation';
  // Known news domains
  try {
    const hostname = new URL(url).hostname;
    const newsDomains = ['infor.pl', 'forsal.pl', 'gazetaprawna.pl', 'dziennik.pl', 'rp.pl', 'bankier.pl', 'money.pl', 'businessinsider.com.pl', 'wysokieobcasy.pl', 'wyborcza.pl'];
    if (newsDomains.some((d) => hostname === d || hostname.endsWith('.' + d))) return 'news';
  } catch { /* fall through */ }
  return 'blog';
}
```

- [ ] **Step 4: Integrate profile into `fetchContent`**

In `fetchContent`, accept and use a `profile` option. After fetching and before cleaning:

```js
// Inside fetchContent, before cleanContent call:
const profile = options.profile || detectCleanerProfile(normalizedUrl);
const content = await cleanContentWithProfile(rawContent, profile, { aiCleaner: options.aiCleaner });
```

Import `cleanContentWithProfile` and `detectCleanerProfile` at the top of the file. Keep `cleanContent` call as fallback for when `cleanContentWithProfile` is not available.

Actually, better to modify fetchContent to use the new profile-aware function directly. Replace the `cleanContent` call:

```js
// Old:
const content = await cleanContent(rawContent, { aiCleaner: options.aiCleaner });
// New:
const profile = options.profile || detectCleanerProfile(normalizedUrl);
const content = await cleanContentWithProfile(rawContent, profile, { aiCleaner: options.aiCleaner });
```

- [ ] **Step 5: Write failing test for profile selection**

```js
{
  // In test_content_cleaning_pipeline.mjs
  assert.equal(learning.detectCleanerProfile('https://example.com/news/aktualnosci'), 'news');
  assert.equal(learning.detectCleanerProfile('https://example.com/blog/post'), 'blog');
  assert.equal(learning.detectCleanerProfile('https://docs.example.com/manual/guide'), 'documentation');
  assert.equal(learning.detectCleanerProfile('https://example.com/file.pdf'), 'pdf');
  assert.equal(learning.detectCleanerProfile('https://infor.pl/artykul'), 'news');
  assert.equal(learning.detectCleanerProfile('https://example.com/xyz'), 'blog');
  console.log('PASS: profile detection');
}
```

- [ ] **Step 6: Write failing test for profile cleaning behavior**

```js
{
  const raw = 'REKLAMA\nZapisz się na newsletter\nTreść główna\nCzytaj także: inny artykuł\nFacebook\nLinkedIn\nPolityka prywatności\n5\n';
  // news profile should remove all
  const newsResult = learning.cleanContentWithProfile(raw, 'news', { skipHtmlStrip: true });
  assert.ok(newsResult.includes('Treść główna'), 'news should keep main content');
  assert.ok(!newsResult.includes('REKLAMA'), 'news should remove REKLAMA');
  assert.ok(!newsResult.includes('CZYTAMY'), 'news should remove CZYTAMY line'); // this won't match but we test the main flow
  // pdf profile should only remove isolated numbers
  const pdfResult = learning.cleanContentWithProfile(raw, 'pdf', { skipHtmlStrip: true });
  assert.ok(pdfResult.includes('REKLAMA'), 'pdf should keep REKLAMA');
  assert.ok(pdfResult.includes('Treść główna'), 'pdf should keep main content');
  assert.ok(!pdfResult.includes('\n5\n') && !pdfResult.split('\n').some(line => /^\d+$/.test(line.trim())), 'pdf should remove isolated page numbers');
  console.log('PASS: profile cleaning behavior');
}
```

- [ ] **Step 7: Run cleaning pipeline tests**

Run: `node scripts/test_content_cleaning_pipeline.mjs`
Expected: PASS (all existing tests + new profile tests)

### Task 5: Learning State API Endpoints

**Files:**
- Modify: `scripts/erp_kb_dashboard_server.mjs`
- Test: Manual via curl after restart

- [ ] **Step 1: Add GET handler for `/api/automation/learning`**

In `erp_kb_dashboard_server.mjs`, find the route handler section and add a new route before the generic routes:

```js
// In the route handler section, add after the automation config GET route:
if (route.pathname === '/api/automation/learning' && req.method === 'GET') {
  return getAutomationLearning(req, res);
}
if (route.pathname === '/api/automation/learning' && req.method === 'PATCH') {
  return patchAutomationLearning(req, res);
}
```

- [ ] **Step 2: Implement GET handler**

```js
async function getAutomationLearning(req, res) {
  try {
    const discoveryState = readJson(DISCOVERY_LEARNING_PATH, null);
    const automationState = readJson(AUTOMATION_LEARNING_PATH, null);
    const thresholds = {};
    if (automationState?.byKbNamespace) {
      for (const [kns, stats] of Object.entries(automationState.byKbNamespace)) {
        thresholds[kns] = {
          baseThreshold: stats.baseThreshold || 0.6,
          tunedBaseline: stats.tunedBaseline || stats.baseThreshold || 0.6,
          fpRate: stats.fpRate || 0,
          windowSize: stats.windowSize || 0,
          reviewed: stats.reviewed || 0,
        };
      }
    }
    const penalties = {};
    if (discoveryState?.byDomain) {
      for (const [domain, stats] of Object.entries(discoveryState.byDomain)) {
        penalties[domain] = {
          total: domainStatsTotal(stats),
          accepted: stats.accepted || 0,
          rejected: stats.rejected || 0,
          duplicate: stats.duplicates || 0,
          noisePenalty: stats.noisePenalty || 0,
          operatorOverride: stats.operatorOverride != null ? stats.operatorOverride : null,
        };
      }
    }
    return sendJson(res, 200, {
      ok: true,
      thresholds,
      penalties,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: 'learning_load_failed', message: error.message });
  }
}
```

Add the helper function `domainStatsTotal` at the module level:

```js
function domainStatsTotal(stats) {
  return (stats.accepted || 0) + (stats.rejected || 0) + (stats.duplicates || 0);
}
```

- [ ] **Step 3: Implement PATCH handler for reset and override**

```js
async function patchAutomationLearning(req, res) {
  let fields;
  try {
    fields = await readJsonRequest(req);
  } catch (error) {
    return sendJson(res, 400, { ok: false, error: 'invalid_body', message: error.message });
  }
  try {
    // Reset actions
    if (fields.reset === 'full') {
      try { fs.rmSync(DISCOVERY_LEARNING_PATH, { force: true }); } catch {}
      try { fs.rmSync(AUTOMATION_LEARNING_PATH, { force: true }); } catch {}
      appendDashboardAudit({
        actor: req.dashboardUser || process.env.USER || 'dashboard',
        role: 'admin',
        action: 'automation.learning.reset',
        resourceType: 'learning_state',
        resourceId: 'full',
        after: { reset: 'full', at: new Date().toISOString() },
      });
      return sendJson(res, 200, { ok: true, message: 'Full learning state reset.' });
    }
    if (fields.reset === 'thresholds') {
      try {
        const state = JSON.parse(fs.readFileSync(AUTOMATION_LEARNING_PATH, 'utf8'));
        state.byKbNamespace = {};
        state.highlights = { guardedKbNamespaces: [], reroutePairs: [] };
        fs.writeFileSync(AUTOMATION_LEARNING_PATH, JSON.stringify(state, null, 2) + '\n', { encoding: 'utf8', mode: 0o640 });
      } catch {}
      return sendJson(res, 200, { ok: true, message: 'Threshold learning state reset.' });
    }
    if (fields.reset === 'penalties') {
      try {
        const state = JSON.parse(fs.readFileSync(DISCOVERY_LEARNING_PATH, 'utf8'));
        state.byDomain = {};
        state.highlights = { strongestDomains: [], weakestQueries: [] };
        fs.writeFileSync(DISCOVERY_LEARNING_PATH, JSON.stringify(state, null, 2) + '\n', { encoding: 'utf8', mode: 0o640 });
      } catch {}
      return sendJson(res, 200, { ok: true, message: 'Domain penalty learning state reset.' });
    }
    // Domain override
    if (fields.domainOverride) {
      const { domain, noisePenalty } = fields.domainOverride;
      if (!domain || typeof domain !== 'string') {
        return sendJson(res, 400, { ok: false, error: 'invalid_domain', message: 'domain is required' });
      }
      const state = readJson(DISCOVERY_LEARNING_PATH, { generatedAt: new Date().toISOString(), overall: { reviewed: 0, candidates: 0 }, byDomain: {}, byQuery: {}, byKbNamespace: {}, bySourceTier: {}, highlights: { strongestDomains: [], weakestQueries: [] }, promptMemory: { recentRejectNotes: [], recentAcceptNotes: [] } });
      if (!state.byDomain) state.byDomain = {};
      if (noisePenalty == null) {
        // Clear override, restore auto
        if (state.byDomain[domain]) {
          state.byDomain[domain].operatorOverride = null;
        }
      } else {
        const clamped = Math.max(0, Math.min(1, Number(noisePenalty)));
        if (!state.byDomain[domain]) {
          state.byDomain[domain] = { reviewed: 0, accepted: 0, rejected: 0, duplicates: 0, acceptanceRate: null, rejectRate: 0, duplicateRate: 0, scoreDelta: 0, reasons: [], noisePenalty: 0, operatorOverride: clamped };
        } else {
          state.byDomain[domain].operatorOverride = clamped;
        }
      }
      writeJsonAtomic(DISCOVERY_LEARNING_PATH, state);
      return sendJson(res, 200, { ok: true, message: `Domain ${domain} override updated.` });
    }
    return sendJson(res, 400, { ok: false, error: 'unknown_action', message: 'Specify reset, domainOverride, or learningAction.' });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: 'learning_patch_failed', message: error.message });
  }
}
```

- [ ] **Step 4: Restart the dashboard to verify endpoints**

```bash
systemctl restart erp-kb-dashboard.service
sleep 2
curl -s http://localhost:3410/panel/api/automation/learning | python3 -m json.tool | head -20
```

Expected: returns `{ "ok": true, "thresholds": {...}, "penalties": {...}, "generatedAt": ... }`

### Task 6: Operator Panel UI

**Files:**
- Modify: `src/AutomationPage.jsx`
- Test: `npm run build`

- [ ] **Step 1: Add learning panel component to AutomationPage**

After the existing auto-learning detail panel (around line 242, after the `Samonauka automatyzacji` section), add a new section:

```jsx
{/* Phase 3: Learning state panel */}
<div className="detailPanel">
  <strong>Stan samonauki</strong>
  <div className="detailMeta">
    <span>Aktualizacja: {automationLearning.generatedAt ? formatDate(automationLearning.generatedAt) : 'brak'}</span>
  </div>
  <div className="automationControls">
    <IconButton icon={RefreshCw} label="Odśwież" showLabel onClick={reload} disabled={Boolean(busy)} />
    <IconButton icon={Trash2} label="Resetuj progi KB" showLabel onClick={() => resetLearning('thresholds')} disabled={Boolean(busy) || overview?.service?.role !== 'admin'} />
    <IconButton icon={Trash2} label="Resetuj kary domen" showLabel onClick={() => resetLearning('penalties')} disabled={Boolean(busy) || overview?.service?.role !== 'admin'} />
    <IconButton icon={Trash2} label="Resetuj wszystko" showLabel variant="danger" onClick={() => resetLearning('full')} disabled={Boolean(busy) || overview?.service?.role !== 'admin'} />
  </div>
  <h4>Progi per KB</h4>
  {learningThresholds.length ? (
    <DataTable rows={learningThresholds} columns={[
      { key: 'kns', label: 'KB', render: (row) => <code>{row.kns}</code> },
      { key: 'baseThreshold', label: 'Bazowy', render: (row) => <span>{formatNumber(Math.round(Number(row.baseThreshold || 0.6) * 100))}%</span> },
      { key: 'tunedBaseline', label: 'Dostrojony', render: (row) => <strong>{formatNumber(Math.round(Number(row.tunedBaseline || 0.6) * 100))}%</strong> },
      { key: 'fpRate', label: 'FP Rate', render: (row) => <span>{formatNumber(Math.round(Number(row.fpRate || 0) * 100))}%</span> },
      { key: 'windowSize', label: 'Okno', render: (row) => <span>{row.windowSize || 0}</span> },
      { key: 'reviewed', label: 'Decyzje', render: (row) => <span>{row.reviewed || 0}</span> },
    ]} />
  ) : <span className="muted">Brak danych o progach — brak rozstrzygniętych shadow jobów.</span>}
  <h4>Kary za szum per domena</h4>
  {learningPenalties.length ? (
    <DataTable rows={learningPenalties} columns={[
      { key: 'domain', label: 'Domena', render: (row) => <code>{row.domain}</code> },
      { key: 'total', label: 'Kandydaci', render: (row) => <span>{row.total}</span> },
      { key: 'accepted', label: 'Zaakc.', render: (row) => <span>{row.accepted}</span> },
      { key: 'rejected', label: 'Odrzuc.', render: (row) => <span>{row.rejected}</span> },
      { key: 'noisePenalty', label: 'Kara (auto)', render: (row) => <span>{formatNumber(Math.round(Number(row.noisePenalty || 0) * 100))}%</span> },
      { key: 'operatorOverride', label: 'Kara (ręczna)', render: (row) => (
        row.operatorOverride != null
          ? <span>{formatNumber(Math.round(Number(row.operatorOverride) * 100))}% <IconButton icon={X} label="Usuń" size="small" onClick={() => setOverrideDomain(row.domain, null)} disabled={Boolean(busy)} /></span>
          : <span className="muted">brak</span>
      )},
    ]} />
  ) : <span className="muted">Brak danych o domenach — brak rozstrzygniętych kandydatów discovery.</span>}
</div>
```

- [ ] **Step 2: Add state and helper functions**

Add these after the existing state declarations and before the helper functions:

```js
// Phase 3: learning state
const [learningThresholds, setLearningThresholds] = useState([]);
const [learningPenalties, setLearningPenalties] = useState([]);
const [learningBusy, setLearningBusy] = useState('');

async function loadLearning() {
  try {
    const response = await apiFetch('/api/automation/learning');
    const result = await response.json();
    if (!response.ok || !result.ok) return;
    const thresholds = Object.entries(result.thresholds || {}).map(([kns, value]) => ({ kns, ...value }));
    const penalties = Object.entries(result.penalties || {}).map(([domain, value]) => ({ domain, ...value }));
    setLearningThresholds(thresholds);
    setLearningPenalties(penalties);
  } catch {}
}

async function resetLearning(target) {
  if (!window.confirm(`Czy na pewno zresetować stan samonauki (${target})? Tej operacji nie można cofnąć.`)) return;
  setLearningBusy(target);
  try {
    const response = await apiFetch('/api/automation/learning', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reset: target }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message);
    setMessage(`Stan samonauki (${target}) został zresetowany.`);
    await loadLearning();
    await reload();
  } catch (e) { setMessage(`Błąd: ${e.message}`); } finally { setLearningBusy(''); }
}

async function setOverrideDomain(domain, value) {
  setLearningBusy(`override-${domain}`);
  try {
    const response = await apiFetch('/api/automation/learning', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domainOverride: { domain, noisePenalty: value } }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message);
    await loadLearning();
  } catch (e) { setMessage(`Błąd: ${e.message}`); } finally { setLearningBusy(''); }
}
```

Also: call `loadLearning()` in the `useEffect` / on mount. The existing component doesn't have useEffect — add one:

```js
import { useState, useEffect } from 'react'; // update import

useEffect(() => {
  loadLearning();
}, []);
```

- [ ] **Step 3: Add the Trash2 and X imports**

Add to the existing import line:

```js
import {
  Activity, AlertTriangle, Bot, Check, CheckCircle, Eye, LoaderCircle, Pause, Play, RefreshCw, Trash2, X,
} from 'lucide-react';
```

- [ ] **Step 4: Build the dashboard and verify**

Run: `npm run build`
Expected: Build succeeds with no errors

### Task 7: Tests and Verification

**Files:**
- All test files
- `npm run check`

- [ ] **Step 1: Run all tests**

```bash
node scripts/test_feedback_learning.mjs
node scripts/test_content_cleaning_pipeline.mjs
node scripts/test_dashboard_discovery.mjs
node scripts/test_dashboard_automation.mjs
```

Expected: all PASS

- [ ] **Step 2: Run lint check**

Run: `npm run check`
Expected: PASS

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Restart the dashboard service**

```bash
systemctl restart erp-kb-dashboard.service
sleep 2
systemctl status erp-kb-dashboard.service --no-pager | head -5
curl -s http://localhost:3410/panel/api/status | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK:', d.get('service',{}).get('ok'))"
```

Expected: service active and OK

- [ ] **Step 5: Verify learning endpoint**

```bash
curl -s http://localhost:3410/panel/api/automation/learning | python3 -m json.tool | head -30
```

Expected: returns thresholds and penalties data
