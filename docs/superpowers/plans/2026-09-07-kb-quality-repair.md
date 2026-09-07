# KB Quality Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile promoted Sprint drafts with canonical official documents, refresh the missing Business Semantics description, and publish only the corrected CSV files.

**Architecture:** The Sprint exporter will map normalized official HTTP URLs to their existing document IDs and reuse those IDs for matching promoted chunks. Business Semantics needs no code change; its helper-only exporter will regenerate the stale description CSV. Scoped quality gates protect both builds.

**Tech Stack:** Node.js ESM, built-in `URL`, temporary fixture directories, CSV exporters, OpenSPG structured builder jobs.

## Global Constraints

- Do not modify or revert unrelated worktree changes.
- Do not change OpenSPG schemas.
- Keep promoted Sprint chunk IDs and content stable.
- Preserve current behavior for promoted drafts without an official URL match.
- Build only `reference_document.csv,chunk.csv` for Sprint and `business_description.csv` for Business Semantics.
- Stop before a build if another CSV changes unexpectedly.
- Do not commit unless the user requests a commit explicitly.

## Execution Result — 2026-09-07

Status: **COMPLETED** after recovery review and runtime reconciliation.

- All four focused regression tests passed:
  - `test_build_readme.mjs`
  - `test_dashboard_business_semantics_force_files.mjs`
  - `test_knowledge_inbox_pipeline_failures.mjs`
  - `test_optima_sprint_promoted_url_reconciliation.mjs`
- `npm run check` passed. Scoped ESLint completed with `0` errors and the
  pre-existing `11` warnings in `erp_kb_dashboard_server.mjs` did not increase.
- Scoped quality gates written under `/tmp/codex-kb-quality-20260907` returned
  `PASS` with `0` errors and `0` warnings for both
  `ComarchOptimaSprint` and `ComarchOptimaBusinessSemantics`.
- OpenSPG builder readback confirmed:
  - job `712`, project `7`, `reference_document.csv`, `171` rows, `FINISH`;
  - job `713`, project `7`, `chunk.csv`, `312` rows, `FINISH`;
  - job `714`, project `15`, `business_description.csv`, `640` rows, `FINISH`.
- All current CSV IDs were present in Neo4j. The readback also exposed stale
  nodes retained by previous upserts: `13` `ReferenceDocument`, `159` `Chunk`,
  and `134` `BusinessDescription` nodes. Their exact ID sets and recovery
  hashes were stored in the protected recovery snapshot before deletion.
- After bounded stale-node reconciliation, Neo4j contains exactly `171`
  Sprint `ReferenceDocument`, `312` Sprint `Chunk`, and `640` Business
  Semantics `BusinessDescription` nodes. The repaired Sprint URL resolves to
  exactly one document with the canonical official document ID.
- No `McpOptima*`, `McpIntegration*`, or `McpShoperReference` artifact or
  namespace was changed by this repair.

---

### Task 1: Sprint Promoted URL Reconciliation

**Files:**
- Create: `scripts/test_optima_sprint_promoted_url_reconciliation.mjs`
- Modify: `scripts/export_optima_sprint.mjs:11-18`
- Modify: `scripts/export_optima_sprint.mjs:405-419`
- Modify: `scripts/export_optima_sprint.mjs:1217-1232`

**Interfaces:**
- Consumes: promoted drafts returned by `loadPromotedKnowledge('ComarchOptimaSprint')` and official `ReferenceDocument` rows.
- Produces: `canonicalHttpUrl(value: unknown): string` and `promotedDocumentIdByDraftId: Map<string, string>` inside the exporter.

- [ ] **Step 1: Write the failing regression test**

Create `scripts/test_optima_sprint_promoted_url_reconciliation.mjs`:

```js
#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeId } from './lib/export_utils.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'optima-sprint-url-reconciliation-'));
const promotedDir = path.join(
  root,
  'docs/reference/knowledge_inbox/promoted/ComarchOptimaSprint',
);

function parseCsv(raw) {
  const records = [];
  let record = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    const next = raw[index + 1];
    if (quoted && char === '"' && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      record.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      record.push(field);
      if (record.some(Boolean)) records.push(record);
      record = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field || record.length) {
    record.push(field);
    records.push(record);
  }
  const [header, ...rows] = records;
  return rows.map((row) => Object.fromEntries(
    header.map((column, index) => [column, row[index] || '']),
  ));
}

const officialUrl = 'https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/jak-dodawac-edytowac-wydruki-sprint/';
const matchingDraft = {
  id: 'draft_matching_official_sprint',
  kbName: 'Comarch Optima Sprint and Prints',
  kbNamespace: 'ComarchOptimaSprint',
  title: 'Reviewed official Sprint workflow',
  content: 'Reviewed workflow content.',
  sourceUrl: 'HTTPS://POMOC.COMARCH.PL/optima/pl/2026/dokumentacja/jak-dodawac-edytowac-wydruki-sprint/#review',
  status: 'promoted',
  promotedAt: '2026-09-07T00:00:00.000Z',
};
const distinctDraft = {
  id: 'draft_distinct_sprint',
  kbName: 'Comarch Optima Sprint and Prints',
  kbNamespace: 'ComarchOptimaSprint',
  title: 'Local Sprint guidance',
  content: 'Distinct reviewed guidance.',
  sourceUrl: 'https://example.test/sprint/local-guidance',
  status: 'promoted',
  promotedAt: '2026-09-07T00:00:00.000Z',
};

try {
  fs.mkdirSync(promotedDir, { recursive: true });
  for (const draft of [matchingDraft, distinctDraft]) {
    fs.writeFileSync(
      path.join(promotedDir, `${draft.id}.json`),
      `${JSON.stringify(draft, null, 2)}\n`,
      'utf8',
    );
  }

  const result = spawnSync(process.execPath, ['scripts/export_optima_sprint.mjs'], {
    cwd: repoRoot,
    env: { ...process.env, ROOT: root },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const exportDir = path.join(root, 'exports/optima_sprint/v1');
  const documents = parseCsv(fs.readFileSync(path.join(exportDir, 'reference_document.csv'), 'utf8'));
  const chunks = parseCsv(fs.readFileSync(path.join(exportDir, 'chunk.csv'), 'utf8'));
  const officialId = makeId('SPR_DOC', officialUrl);
  const matchingPromotedId = makeId('SPR_DOC_PROMOTED', matchingDraft.id);
  const distinctPromotedId = makeId('SPR_DOC_PROMOTED', distinctDraft.id);
  const matchingChunkId = makeId('SPR_CHUNK_PROMOTED', `${matchingDraft.id}_1`);
  const distinctChunkId = makeId('SPR_CHUNK_PROMOTED', `${distinctDraft.id}_1`);

  assert.equal(documents.filter((row) => row.id === officialId).length, 1);
  assert.equal(documents.some((row) => row.id === matchingPromotedId), false);
  assert.equal(documents.some((row) => row.id === distinctPromotedId), true);
  assert.equal(chunks.find((row) => row.id === matchingChunkId)?.sourceObjectRefId, officialId);
  assert.equal(chunks.find((row) => row.id === distinctChunkId)?.sourceObjectRefId, distinctPromotedId);

  const gate = spawnSync(process.execPath, [
    'scripts/kb_quality_gate.mjs',
    '--kb',
    'ComarchOptimaSprint',
    '--json-only',
  ], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ROOT: root,
      KB_QUALITY_GATE_OUT_JSON: path.join(root, 'quality.json'),
      KB_QUALITY_GATE_OUT_MD: path.join(root, 'quality.md'),
    },
    encoding: 'utf8',
  });
  assert.equal(gate.status, 0, gate.stderr || gate.stdout);
  const quality = JSON.parse(gate.stdout).results[0];
  assert.equal(quality.errors.length, 0);
  assert.equal(
    quality.warnings.some((warning) => warning.includes('Duplicate sourceUrl')),
    false,
  );

  process.stdout.write('Sprint promoted URL reconciliation tests passed.\n');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
```

- [ ] **Step 2: Run the regression test and verify the current exporter fails**

Run:

```bash
node scripts/test_optima_sprint_promoted_url_reconciliation.mjs
```

Expected: nonzero exit because `export_optima_sprint.mjs` ignores the temporary
`ROOT`, or because the matching promoted document still exists and its chunk
still refers to `SPR_DOC_PROMOTED_*`.

- [ ] **Step 3: Make the Sprint exporter fixture-safe**

Replace the hard-coded root in `scripts/export_optima_sprint.mjs`:

```js
const ROOT = process.env.ROOT || '/docker/openspg';
```

- [ ] **Step 4: Add canonical HTTP URL normalization**

Add after `normalizeWhitespace`:

```js
function canonicalHttpUrl(value) {
  try {
    const parsed = new URL(String(value || '').trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLowerCase();
    if (parsed.pathname.length > 1) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    }
    return parsed.toString();
  } catch {
    return '';
  }
}
```

- [ ] **Step 5: Reconcile promoted documents with official IDs**

Replace the current promoted-document `map` block with:

```js
const promotedKnowledge = loadPromotedKnowledge('ComarchOptimaSprint');
const officialDocumentIdByCanonicalUrl = new Map(
  referenceDocuments
    .filter((document) => document.sourceType === 'official_web')
    .map((document) => [canonicalHttpUrl(document.sourceUrl), document.id])
    .filter(([canonicalUrl]) => canonicalUrl),
);
const promotedDocumentIdByDraftId = new Map();

for (const draft of promotedKnowledge) {
  const officialDocumentId = officialDocumentIdByCanonicalUrl.get(
    canonicalHttpUrl(draft.sourceUrl),
  );
  const documentId = officialDocumentId || makeId('SPR_DOC_PROMOTED', draft.id);
  promotedDocumentIdByDraftId.set(draft.id, documentId);
  if (officialDocumentId) continue;

  referenceDocuments.push({
    id: documentId,
    name: draft.title,
    description: `Promoted knowledge inbox draft for ${draft.kbName}.`,
    semanticType: 'reference_document',
    sourceUrl: draft.sourceUrl || `local://knowledge-inbox/${draft.id}`,
    sourceType: 'promoted_knowledge_draft',
    documentCategory: 'promoted_knowledge',
    versionHint: draft.promotedAt ? draft.promotedAt.slice(0, 10) : 'local',
    sourceOrigin: 'KnowledgeInboxPromoted',
    summary: truncate(draft.content, 800),
  });
}
```

- [ ] **Step 6: Point promoted chunks to the reconciled document ID**

Change the promoted chunk loop to obtain its document ID from the map:

```js
for (const draft of promotedKnowledge) {
  const documentId = promotedDocumentIdByDraftId.get(draft.id)
    || makeId('SPR_DOC_PROMOTED', draft.id);
  parseMarkdownSections(`# ${draft.title}\n\n${draft.content}`).forEach((section, index) => {
    chunks.push({
      id: makeId('SPR_CHUNK_PROMOTED', `${draft.id}_${index + 1}`),
      name: `${draft.title} - ${section.heading}`,
      description: `Promoted knowledge inbox chunk for ${draft.title}.`,
      sourceObjectRefId: documentId,
      sourceDocument: draft.title,
      sourceSection: section.heading,
      semanticType: 'chunk',
      content: truncate(section.content || draft.content, 3800),
    });
  });
}
```

- [ ] **Step 7: Run focused tests**

Run:

```bash
node scripts/test_optima_sprint_promoted_url_reconciliation.mjs
node scripts/test_kb_quality_gate_business_semantics.mjs
node scripts/test_optima_business_semantics_promoted.mjs
```

Expected: all three commands exit `0`; the new test prints
`Sprint promoted URL reconciliation tests passed.`

- [ ] **Step 8: Run repository syntax checks**

Run:

```bash
node --check scripts/export_optima_sprint.mjs
node --check scripts/test_optima_sprint_promoted_url_reconciliation.mjs
npm run check
```

Expected: every command exits `0` with no syntax errors.

---

### Task 2: Regenerate And Validate Staging

**Files:**
- Regenerate: `exports/optima_sprint/v1/reference_document.csv`
- Regenerate: `exports/optima_sprint/v1/chunk.csv`
- Regenerate: `exports/optima_sprint/v1/_manifest.json`
- Regenerate: `exports/optima_business_semantics/v1/business_description.csv`
- Regenerate: `exports/optima_business_semantics/v1/_manifest.json`

**Interfaces:**
- Consumes: corrected Sprint exporter and the five promoted Business Semantics drafts.
- Produces: quality-gated CSV staging for OpenSPG projects `7` and `15`.

- [ ] **Step 1: Record current content hashes for all CSV files**

Run:

```bash
sha256sum exports/optima_sprint/v1/*.csv exports/optima_business_semantics/v1/*.csv
```

Expected: command exits `0`. Retain the output for comparison after export.

- [ ] **Step 2: Regenerate Sprint staging**

Run:

```bash
node scripts/export_optima_sprint.mjs
```

Expected: exit `0`; the exporter rewrites Sprint staging and `_manifest.json`.

- [ ] **Step 3: Regenerate Business Semantics helper staging**

Run:

```bash
OPENSPG_HELPER_ONLY=1 node scripts/export_optima_business_semantics.mjs
```

Expected: exit `0`; stderr reports `promoted drafts: 5`, and
`business_description.csv` contains
`BD_PROMOTED_DRAFT_2026_08_21_5F225097_FORMY_P_ATNOSCI_1`.

- [ ] **Step 4: Compare CSV content hashes**

Run the same hash command from Step 1 and compare the two outputs.

Expected changes:

- Sprint: `reference_document.csv`, `chunk.csv`
- Business Semantics: `business_description.csv`

If another CSV hash changes, stop and diagnose it before publication.

- [ ] **Step 5: Verify the known Sprint duplicate is gone and promoted content remains**

Run:

```bash
node --input-type=module -e "import fs from 'node:fs'; const docs=fs.readFileSync('exports/optima_sprint/v1/reference_document.csv','utf8').split('\n'); const chunks=fs.readFileSync('exports/optima_sprint/v1/chunk.csv','utf8').split('\n'); const url='https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/jak-dodawac-edytowac-wydruki-sprint/'; const officialId='SPR_DOC_HTTPS_POMOC_COMARCH_PL_OPTIMA_PL_2026_DOKUMENTACJA_JAK_DODAWAC_EDYTOWAC_WYDRUKI_SPRINT'; const promotedId='SPR_DOC_PROMOTED_DRAFT_2026_07_03_356FEE2F'; const promotedChunk='SPR_CHUNK_PROMOTED_DRAFT_2026_07_03_356FEE2F'; const officialRows=docs.filter(line=>line.includes(','+url+',official_web,')).length; const promotedDocumentPresent=docs.some(line=>line.startsWith(promotedId)); const chunk=chunks.find(line=>line.startsWith(promotedChunk)); const result={officialRows,promotedDocumentPresent,promotedChunkUsesOfficial:Boolean(chunk?.includes(','+officialId+','))}; console.log(JSON.stringify(result)); if(officialRows!==1||promotedDocumentPresent||!result.promotedChunkUsesOfficial) process.exitCode=1;"
```

Expected:

```json
{"officialRows":1,"promotedDocumentPresent":false,"promotedChunkUsesOfficial":true}
```

- [ ] **Step 6: Run both pre-build quality gates without replacing dashboard reports**

Run:

```bash
KB_QUALITY_GATE_OUT_JSON=/tmp/opencode/sprint-quality-prebuild.json KB_QUALITY_GATE_OUT_MD=/tmp/opencode/sprint-quality-prebuild.md node scripts/kb_quality_gate.mjs --kb ComarchOptimaSprint --json-only
KB_QUALITY_GATE_OUT_JSON=/tmp/opencode/business-semantics-quality-prebuild.json KB_QUALITY_GATE_OUT_MD=/tmp/opencode/business-semantics-quality-prebuild.md node scripts/kb_quality_gate.mjs --kb ComarchOptimaBusinessSemantics --json-only
```

Expected: both commands exit `0`, both namespace verdicts are `PASS`, Sprint
has no duplicate-URL warning, and Business Semantics has no missing-description
error.

---

### Task 3: Publish Scoped Files And Verify Jobs

**Files:**
- Regenerate: `exports/optima_sprint/v1/upload_optima_sprint_manifest.json`
- Regenerate: `exports/optima_sprint/v1/build_optima_sprint_jobs_manifest.json`
- Regenerate: `exports/optima_business_semantics/v1/upload_business_semantics_manifest.json`
- Regenerate: `exports/optima_business_semantics/v1/build_business_semantics_jobs_manifest.json`

**Interfaces:**
- Consumes: quality-gated staging from Task 2 and `/etc/erp-kb-openspg.cookie`.
- Produces: finished OpenSPG builder jobs for project `7` and project `15`.

- [ ] **Step 1: Check build authentication without printing the cookie**

Run:

```bash
test -s /etc/erp-kb-openspg.cookie
```

Expected: exit `0` and no output. If the command fails, stop before running any
build or login command.

- [ ] **Step 2: Build only the changed Sprint files**

Run:

```bash
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie OPENSPG_FORCE_FILES=reference_document.csv,chunk.csv node scripts/build_optima_sprint.mjs
```

Expected: exit `0`; two submitted or resumed jobs reach `FINISH`.

- [ ] **Step 3: Build only the changed Business Semantics file**

Run:

```bash
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie OPENSPG_FORCE_FILES=business_description.csv node scripts/build_optima_business_semantics.mjs
```

Expected: exit `0`; one submitted or resumed job reaches `FINISH`.

- [ ] **Step 4: Verify the build manifests contain finished jobs for the forced files**

Run:

```bash
node --input-type=module -e "import fs from 'node:fs'; const checks=[['exports/optima_sprint/v1/build_optima_sprint_jobs_manifest.json',['reference_document.csv','chunk.csv']],['exports/optima_business_semantics/v1/build_business_semantics_jobs_manifest.json',['business_description.csv']]]; for(const [file,names] of checks){const manifest=JSON.parse(fs.readFileSync(file,'utf8')); for(const name of names){const jobs=manifest.jobs.filter(job=>job.fileName===name); const latest=jobs.at(-1); if(!latest||latest.status!=='FINISH') throw new Error(file+': '+name+' latest job is not FINISH'); console.log(name+': '+latest.id+' FINISH');}}"
```

Expected: three lines, each ending in `FINISH`.

- [ ] **Step 5: Run post-build quality gates**

Run:

```bash
KB_QUALITY_GATE_OUT_JSON=/tmp/opencode/sprint-quality-postbuild.json KB_QUALITY_GATE_OUT_MD=/tmp/opencode/sprint-quality-postbuild.md node scripts/kb_quality_gate.mjs --kb ComarchOptimaSprint --json-only
KB_QUALITY_GATE_OUT_JSON=/tmp/opencode/business-semantics-quality-postbuild.json KB_QUALITY_GATE_OUT_MD=/tmp/opencode/business-semantics-quality-postbuild.md node scripts/kb_quality_gate.mjs --kb ComarchOptimaBusinessSemantics --json-only
```

Expected: both commands exit `0` with namespace verdict `PASS`.

- [ ] **Step 6: Inspect only task-related changes**

Run:

```bash
git status --short
```

Expected: `git diff --check` exits `0`. Review the status without reverting or
including unrelated dashboard report and backup-script changes.
