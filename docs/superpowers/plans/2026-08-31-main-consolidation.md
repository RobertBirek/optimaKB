# Main Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the two invalid knowledge promotions, publish the valid Business Semantics content, commit all verified operational artifacts, push `main`, and remove the redundant retry worktree.

**Architecture:** Add one auditable promotion-state transition to the existing inbox library, then map promoted Business Semantics drafts into the existing `BusinessDescription` export. Extend the quality gate for that entity type, apply the transition and content repair through existing library operations, and run the normal export/build/quality pipeline before publication.

**Tech Stack:** Node.js ESM, synchronous filesystem helpers, CSV staging, OpenSPG structured builder, Git, Docker Compose.

## Global Constraints

- Keep the unsupported Schema draft pending; do not reject, delete, or publish it.
- Preserve raw drafts, promoted history, archived snapshots, and dashboard audit events.
- Do not add new OpenSPG entity types or push a schema.
- Do not claim undocumented COM, SDK, SQL, GUI, or tax behavior.
- Do not force-push `main`.
- Do not alter unrelated worktree changes except by validating and committing them.
- Remove the temporary worktree and retry branch only after a successful push and clean status.

## File Map

- `scripts/lib/promoted_knowledge.mjs`: add the promoted-to-pending state transition.
- `scripts/test_promoted_knowledge_reopen.mjs`: isolate and verify requeue filesystem, registry, and audit behavior.
- `scripts/export_optima_business_semantics.mjs`: emit promoted drafts as `BusinessDescription` rows.
- `scripts/test_optima_business_semantics_promoted.mjs`: verify stable promoted export fields and manifest counts.
- `scripts/kb_quality_gate.mjs`: check promoted Business Semantics coverage in `business_description.csv`.
- `scripts/test_kb_quality_gate_business_semantics.mjs`: verify missing and present coverage outcomes.
- `package.json`: include new test files in `npm run check`.
- `downloads/knowledge_inbox/2026-08-28/draft_2026-08-28_542b7ff6_zestawy-promocyjne-baza-wiedzy-programu-comarch-erp-optima.{json,md}`: runtime source draft repair; this inbox path is not committed.
- `docs/reference/knowledge_inbox/promoted/ComarchOptimaBusinessSemantics/draft_2026-08-28_542b7ff6_zestawy-promocyjne-baza-wiedzy-programu-comarch-erp-optima.{json,md}`: reviewed source-faithful snapshot.
- `docs/reference/knowledge_inbox/withdrawn/ComarchOptimaSchema/**`: archived unsupported promotion snapshot.
- `docs/reference/knowledge_inbox/registry.json`: pending Schema and corrected promoted Business Semantics states.
- `exports/optima_business_semantics/v1/{business_description.csv,_manifest.json,build_business_semantics_jobs_manifest.json,upload_business_semantics_manifest.json}`: staged and built Business Semantics artifacts.
- `docs/reference/*Report*.{json,md}` and related testpack/briefing files already modified in the worktree: verified operational snapshots.

---

### Task 1: Auditable Promoted-Draft Requeue

**Files:**
- Modify: `scripts/lib/promoted_knowledge.mjs:414-470`
- Create: `scripts/test_promoted_knowledge_reopen.mjs`
- Modify: `package.json:9`

**Interfaces:**
- Consumes: `findRawDraftById(draftId)`, `loadRegistry()`, `saveRegistry(registry)`, `appendDashboardAudit(input)`.
- Produces: `reopenPromotedDraft(draftId: string, options?: { reopenedBy?: string, reviewNote?: string }): RegistryEntry`.

- [ ] **Step 1: Write the isolated failing test**

Create a temporary `ROOT` containing one raw draft, matching promoted JSON/Markdown files, and a promoted registry entry. Dynamically import the library after setting `process.env.ROOT`, call:

```js
const entry = reopenPromotedDraft('draft_test', {
  reopenedBy: 'test-operator',
  reviewNote: 'Source does not support the requested Schema claim.',
});
```

Assert:

```js
assert.equal(entry.status, 'pending');
assert.equal(entry.previousPromotedAt, '2026-08-30T13:18:20.885Z');
assert.equal(entry.reopenedBy, 'test-operator');
assert.equal(entry.movedPaths.length, 2);
assert(fs.existsSync(path.join(root, entry.movedPaths[0].to)));
assert(!fs.existsSync(promotedJsonPath));
assert(fs.existsSync(rawJsonPath));
assert.match(fs.readFileSync(auditPath, 'utf8'), /knowledge_draft\.reopen/);
assert.throws(() => reopenPromotedDraft('draft_test'), /Only promoted drafts can be reopened/);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node scripts/test_promoted_knowledge_reopen.mjs`

Expected: non-zero exit with an import error because `reopenPromotedDraft` is not exported.

- [ ] **Step 3: Implement the minimal transition**

Add `reopenPromotedDraft()` next to `withdrawPromotedDraft()`. Validate `existing.status === 'promoted'`, move both snapshots into a collision-safe directory under `WITHDRAWN_ROOT/<namespace>/<draftId>/<ISO timestamp>/`, then save this entry:

```js
const nextEntry = {
  draftId,
  status: 'pending',
  kbName: existing.kbName || draft.kbName,
  kbNamespace: existing.kbNamespace || draft.kbNamespace,
  title: existing.title || draft.title,
  sourceUrl: existing.sourceUrl || draft.sourceUrl || '',
  rawJsonPath: existing.rawJsonPath || path.relative(ROOT, draft.rawJsonPath).replaceAll(path.sep, '/'),
  reopenedAt,
  reopenedBy: options.reopenedBy || process.env.USER || 'operator',
  reviewNote: options.reviewNote || '',
  previousPromotedAt: existing.promotedAt || '',
  movedPaths,
};
```

Append an audit event with action `knowledge_draft.reopen`, `before: existing`, and `after: nextEntry`. If moving either snapshot fails, move any already archived snapshots back before rethrowing.

- [ ] **Step 4: Run focused and syntax checks**

Run:

```bash
node scripts/test_promoted_knowledge_reopen.mjs
npm run check
```

Expected: both exit 0; the focused test prints `Promoted knowledge reopen tests passed.`

- [ ] **Step 5: Commit the primitive**

```bash
git add scripts/lib/promoted_knowledge.mjs scripts/test_promoted_knowledge_reopen.mjs package.json
git commit -m "feat: reopen promoted knowledge drafts"
```

---

### Task 2: Promoted Business Semantics Export

**Files:**
- Modify: `scripts/export_optima_business_semantics.mjs:7-17,525-617,742-758`
- Create: `scripts/test_optima_business_semantics_promoted.mjs`
- Modify: `package.json:9`

**Interfaces:**
- Consumes: `loadPromotedKnowledge('ComarchOptimaBusinessSemantics')`, `splitDraftContent(content, 1800)`, `makePromotedId(prefix, draftId)`, and `truncate(value, 800)`.
- Produces: `BusinessDescription` rows whose first ID is `makePromotedId('BD_PROMOTED', `${draft.id}_1`)` and manifest fields `promotedDraftCount` and `promotedDescriptionCount`.

- [ ] **Step 1: Write the failing exporter test**

Create a temporary `ROOT` with one promoted Business Semantics JSON file, run the exporter with `ROOT=<temp> OPENSPG_HELPER_ONLY=1`, parse `business_description.csv`, and assert:

```js
assert.equal(row.id, makePromotedId('BD_PROMOTED', 'draft_business_1'));
assert.equal(row.name, 'Promotional bundles');
assert.equal(row.description, promoted.content);
assert.equal(row.tableRefId, '');
assert.equal(row.columnRefId, '');
assert.equal(row.source, 'promoted_knowledge_draft');
assert.equal(row.language, 'pl');
assert.equal(row.domainName, 'Handel');
assert.equal(row.descriptionHash.length, 64);
assert.equal(Number(row.descriptionLength), promoted.content.length);
assert.equal(manifest.promotedDraftCount, 1);
assert.equal(manifest.promotedDescriptionCount, 1);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node scripts/test_optima_business_semantics_promoted.mjs`

Expected: non-zero exit because the exporter ignores `ROOT` and emits no promoted row.

- [ ] **Step 3: Implement promoted description rows**

Change the root declaration to:

```js
const ROOT = process.env.ROOT || '/docker/openspg';
```

Import the promotion helpers. Before writing `business_description.csv`, append one row per content segment:

```js
const promotedDrafts = loadPromotedKnowledge('ComarchOptimaBusinessSemantics');
let promotedDescriptionCount = 0;
for (const draft of promotedDrafts) {
  const segments = splitDraftContent(draft.content, 1800);
  segments.forEach((description, index) => {
    const segmentNumber = index + 1;
    descriptionRows.push({
      id: makePromotedId('BD_PROMOTED', `${draft.id}_${segmentNumber}`),
      name: segments.length === 1 ? draft.title : `${draft.title} (${segmentNumber}/${segments.length})`,
      description,
      descriptionPreview: truncate(description, 800),
      descriptionHash: sha256hex(description),
      descriptionLength: String(description.length),
      tableRefId: '',
      columnRefId: '',
      source: 'promoted_knowledge_draft',
      language: draft.metadata?.language || 'pl',
      domainName: draft.metadata?.businessDomain || 'Ogólne',
    });
    promotedDescriptionCount += 1;
  });
}
```

Add `promotedDraftCount` and `promotedDescriptionCount` to `_manifest.json` and stderr summary output.

- [ ] **Step 4: Run focused and syntax checks**

Run:

```bash
node scripts/test_optima_business_semantics_promoted.mjs
npm run check
```

Expected: both exit 0; the focused test prints `Promoted Business Semantics export tests passed.`

- [ ] **Step 5: Commit the exporter**

```bash
git add scripts/export_optima_business_semantics.mjs scripts/test_optima_business_semantics_promoted.mjs package.json
git commit -m "feat: export promoted business semantics"
```

---

### Task 3: Business Semantics Quality Coverage

**Files:**
- Modify: `scripts/kb_quality_gate.mjs:218-251,326-343`
- Create: `scripts/test_kb_quality_gate_business_semantics.mjs`
- Modify: `package.json:9`

**Interfaces:**
- Consumes: promoted row IDs from Task 2.
- Produces: `promotedDraftDescriptionMatches(namespace, rows)` and the error `Promoted drafts without visible business descriptions: <count>`.

- [ ] **Step 1: Write the failing quality-gate test**

In a temporary `ROOT`, write the four required Business Semantics CSV files and a matching `_manifest.json`. Add one promoted draft but omit its row from `business_description.csv`. Spawn the quality gate and assert status 2 plus:

```js
assert(result.stdout.includes('Promoted drafts without visible business descriptions: 1'));
```

Then add the row ID `makePromotedId('BD_PROMOTED', `${draft.id}_1`)`, update manifest row counts, rerun, and assert status 0 and absence of that error.

- [ ] **Step 2: Run the test and verify RED**

Run: `node scripts/test_kb_quality_gate_business_semantics.mjs`

Expected: non-zero assertion failure because missing promoted descriptions are not detected.

- [ ] **Step 3: Implement BusinessDescription coverage**

Add a matcher parallel to `promotedDraftChunkMatches()`:

```js
function promotedDraftDescriptionMatches(namespace, descriptionRows) {
  const promoted = loadPromotedKnowledge(namespace);
  const ids = new Set(descriptionRows.map((row) => row.id));
  const missing = promoted
    .filter((draft) => !ids.has(makePromotedId('BD_PROMOTED', `${draft.id}_1`)))
    .map((draft) => ({ draftId: draft.id, sourceUrl: draft.sourceUrl || '', title: draft.title }));
  return { promotedCount: promoted.length, missing };
}
```

For `ComarchOptimaBusinessSemantics`, parse `business_description.csv`, invoke the matcher, and append `Promoted drafts without visible business descriptions: N` when missing rows exist. Keep chunk coverage unchanged for other KBs.

- [ ] **Step 4: Run quality tests and syntax checks**

Run:

```bash
node scripts/test_kb_quality_gate_business_semantics.mjs
node scripts/test_kb_quality_gate_owa_ontology.mjs
npm run check
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit the quality gate**

```bash
git add scripts/kb_quality_gate.mjs scripts/test_kb_quality_gate_business_semantics.mjs package.json
git commit -m "test: gate promoted business descriptions"
```

---

### Task 4: Apply Knowledge Repairs And Run The Pipeline

**Files:**
- Modify runtime source draft: `downloads/knowledge_inbox/2026-08-28/draft_2026-08-28_542b7ff6_zestawy-promocyjne-baza-wiedzy-programu-comarch-erp-optima.{json,md}`
- Move/archive: `docs/reference/knowledge_inbox/promoted/ComarchOptimaSchema/draft_2026-08-29_7fd2a582_bazy-danych-baza-wiedzy-programu-comarch-erp-optima.{json,md}`
- Modify: `docs/reference/knowledge_inbox/promoted/ComarchOptimaBusinessSemantics/draft_2026-08-28_542b7ff6_zestawy-promocyjne-baza-wiedzy-programu-comarch-erp-optima.{json,md}`
- Modify: `docs/reference/knowledge_inbox/registry.json`
- Modify generated files: `exports/optima_business_semantics/v1/**`
- Modify generated files: `docs/reference/KB_Quality_Gate_Report.{json,md}`

**Interfaces:**
- Consumes: `reopenPromotedDraft()` from Task 1, exporter IDs from Task 2, coverage rule from Task 3.
- Produces: pending Schema registry state, corrected promoted Business Semantics snapshot, project 15 build artifacts, and current quality reports.

- [ ] **Step 1: Fetch and inspect the official source**

Fetch `https://pomoc.comarch.pl/optima/pl/2026_5/dokumentacja/zestawy-promocyjne/`. Retain only facts directly supported by the page: purpose of promotional bundles, bundle composition, quantity and price rules, document availability, and documented interaction behavior. Record retrieval URL and date in metadata.

- [ ] **Step 2: Repair the raw Business Semantics draft**

Replace the fallback/query transcript with concise Polish source-faithful content. Set:

```json
{
  "metadata": {
    "discoveredVia": "exa",
    "sourceTier": "official",
    "language": "pl",
    "businessDomain": "Handel",
    "retrievedAt": "2026-08-31T00:00:00.000Z"
  }
}
```

At execution time, replace the example date with `new Date().toISOString()` from
the successful fetch. Merge these fields into the existing metadata so
`exaQuery` remains as provenance, but do not repeat it in `content`. Regenerate
the raw Markdown from the same title, metadata, and content.

- [ ] **Step 3: Refresh the promoted Business Semantics snapshot**

Run `promoteDraft(draftId, { force: true, promotedBy: 'mcpbot', reviewNote: 'Corrected to source-faithful Zestawy Promocyjne scope; unsupported COM/SQL claims removed.' })` from a Node ESM one-liner. Verify JSON and Markdown contain no truncation marker, fallback warning, `CDN.Rabaty`, `ProgID`, or unsupported CRUD claims.

- [ ] **Step 4: Reopen the unsupported Schema draft**

Run `reopenPromotedDraft(draftId, { reopenedBy: 'mcpbot', reviewNote: 'Official database-management article does not support the requested CDN.Terminy claim; returned to pending review.' })` from a Node ESM one-liner. Verify `listInboxDrafts()` returns status `pending`, the promoted paths are absent, and two archived paths exist.

- [ ] **Step 5: Export Business Semantics and run pre-build checks**

Run:

```bash
OPENSPG_HELPER_ONLY=1 node scripts/export_optima_business_semantics.mjs
node scripts/kb_quality_gate.mjs --kb ComarchOptimaSchema,ComarchOptimaBusinessSemantics --json-only
```

Expected: neither KB reports a promoted-coverage error; Business Semantics `business_description.csv` contains the `BD_PROMOTED_...` row.

- [ ] **Step 6: Build changed Business Semantics data**

Run:

```bash
OPENSPG_FORCE_FILES=business_description.csv node scripts/build_optima_business_semantics.mjs
```

Expected: submitted or resumed project 15 job reaches `FINISH`; no failed builder job remains in `build_business_semantics_jobs_manifest.json`.

- [ ] **Step 7: Run post-build gates**

Run:

```bash
node scripts/kb_quality_gate.mjs --all
EXA_AUTO_DRAFT=0 node scripts/run_erp_knowledge_testpack.mjs --size 20
node scripts/source_freshness_report.mjs
docker compose config
```

Expected: targeted promotion errors are absent, testpack reports no partial/miss regression, freshness generation exits 0, and Compose validation exits 0. Historical unrelated warnings remain in the reports.

- [ ] **Step 8: Commit repaired knowledge and generated export artifacts**

Stage only registry, promoted/withdrawn snapshots, Business Semantics exports/manifests, and the quality report changed by this task. Inspect staged diff, then commit:

```bash
git commit -m "fix: repair promoted knowledge coverage"
```

---

### Task 5: Operational Reports, Publication, And Cleanup

**Files:**
- Commit verified existing changes under `docs/reference/ERP_KB_Dashboard_*`, `docs/reference/ERP_KB_Discovery_*`, `docs/reference/ERP_KB_Quality_Weekly_Report.md`, `docs/reference/ERP_Knowledge_Assistant_20Q_*`, and `docs/reference/KB_Source_Freshness_Report.*`.
- Remove worktree metadata for `/tmp/opencode/openspg-discovery-retry` after publication.

**Interfaces:**
- Consumes: all completed code, state, build, and report commits.
- Produces: clean local `main`, pushed `origin/main`, removed temporary worktree and branch.

- [ ] **Step 1: Validate remaining operational report changes**

Run JSON parsing over every modified `.json`, `git diff --check`, and compare each JSON/Markdown pair's timestamps, verdicts, counts, and promoted-draft errors. Confirm discovery coverage remains `ok: true` with `30/30` and `errors: []`; do not rewrite unrelated Sprint or Universal warnings.

- [ ] **Step 2: Commit reports by family**

Commit discovery/readiness/briefing reports, then quality/freshness/testpack reports. Before each commit, inspect `git diff --cached --stat` and `git diff --cached`. Use messages:

```bash
git commit -m "docs: refresh discovery operations reports"
git commit -m "docs: refresh knowledge quality reports"
```

- [ ] **Step 3: Run final verification**

Run:

```bash
npm run check
node scripts/test_promoted_knowledge_reopen.mjs
node scripts/test_optima_business_semantics_promoted.mjs
node scripts/test_kb_quality_gate_business_semantics.mjs
node scripts/test_kb_quality_gate_owa_ontology.mjs
node scripts/kb_quality_gate.mjs --all --json-only
EXA_AUTO_DRAFT=0 node scripts/run_erp_knowledge_testpack.mjs --size 20
docker compose config
git diff --check
git status --short
```

Expected: tests and syntax checks exit 0, no targeted promotion error remains, the testpack has no partial/miss regression, Compose is valid, and status is clean.

- [ ] **Step 4: Fetch and verify remote ancestry**

Run:

```bash
git fetch origin
git merge-base --is-ancestor origin/main main
git status --short --branch
```

Expected: ancestry command exits 0 and `main` is only ahead. If `origin/main` advanced, integrate it without force and repeat all final verification.

- [ ] **Step 5: Push main**

Run: `git push origin main`

Expected: normal fast-forward update succeeds.

- [ ] **Step 6: Remove redundant worktree and branch**

Verify the temporary worktree is clean and its branch has no patch absent from `main`, then run:

```bash
git worktree remove /tmp/opencode/openspg-discovery-retry
git branch -d fix/discovery-transient-retry
git worktree list
git status --short --branch
```

Expected: only the primary worktree remains, the retry branch is absent, and `main` is clean and synchronized with `origin/main`.
