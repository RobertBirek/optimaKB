# Optima Reference Duplicate Self-Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the current `reference_document.csv` duplicate in ComarchOptimaReference and give operators a simple way to detect and withdraw future promoted-draft collisions themselves.

**Architecture:** Keep one source of truth for duplicate detection in a small shared helper that compares official Optima Reference URLs with promoted inbox drafts. The exporter uses that helper logic to suppress promoted drafts that collide with official help pages, while the dashboard and CLI consume the same duplicate list for operator remediation.

**Tech Stack:** Node.js ESM scripts, existing dashboard HTTP server, existing inbox promotion workflow.

---

### Task 1: Add duplicate detection regression

**Files:**
- Create: `scripts/test_optima_reference_duplicate_sources.mjs`
- Modify: `package.json` (add a test script entry if needed)

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findOptimaReferenceDuplicateSources } from './lib/optima_reference_duplicates.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'optima-dupe-test-'));
fs.mkdirSync(path.join(root, 'exports/optima_reference/v1'), { recursive: true });
fs.mkdirSync(path.join(root, 'docs/reference/knowledge_inbox/promoted/ComarchOptimaReference'), { recursive: true });
fs.writeFileSync(path.join(root, 'exports/optima_reference/v1/reference_document.csv'), [
  'id,name,sourceUrl,sourceType',
  'OFFICIAL_1,Official page,https://example.test/doc,official_help_print_snapshot',
].join('\n'));
fs.writeFileSync(path.join(root, 'docs/reference/knowledge_inbox/promoted/ComarchOptimaReference/draft_1.json'), JSON.stringify({
  id: 'draft_1',
  kbNamespace: 'ComarchOptimaReference',
  title: 'Promoted draft',
  sourceUrl: 'https://example.test/doc',
  sourceDraftPath: 'downloads/knowledge_inbox/2026-06-19/draft_1.json',
  promotedJsonPath: 'docs/reference/knowledge_inbox/promoted/ComarchOptimaReference/draft_1.json',
}, null, 2));

const duplicates = findOptimaReferenceDuplicateSources({ root });
assert.equal(duplicates.length, 1);
assert.equal(duplicates[0].sourceUrl, 'https://example.test/doc');
assert.equal(duplicates[0].promotedDraftIds[0], 'draft_1');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test_optima_reference_duplicate_sources.mjs`
Expected: fail because `findOptimaReferenceDuplicateSources` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add `scripts/lib/optima_reference_duplicates.mjs` with `findOptimaReferenceDuplicateSources({ root })`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/test_optima_reference_duplicate_sources.mjs`
Expected: PASS.

### Task 2: Suppress current duplicate in export

**Files:**
- Modify: `scripts/export_optima_reference.mjs`
- Modify: `scripts/lib/optima_reference_duplicates.mjs`

- [ ] **Step 1: Add a regression for exporter suppression**

Use the duplicate helper to assert a promoted draft with the same `sourceUrl` as an official page is excluded from the exported reference rows.

- [ ] **Step 2: Run test to verify it fails**

Run the new exporter regression script.

- [ ] **Step 3: Implement suppression**

Skip promoted drafts whose `sourceUrl` already exists in the official Optima Reference URL set.

- [ ] **Step 4: Re-run export regression and quality gate**

Confirm the duplicate is gone from `exports/optima_reference/v1/reference_document.csv` and `scripts/kb_quality_gate.mjs --kb ComarchOptimaReference` reports `PASS`.

### Task 3: Add operator self-service in dashboard and CLI

**Files:**
- Modify: `scripts/erp_kb_dashboard_server.mjs`
- Modify: `scripts/manage_knowledge_inbox.mjs`

- [ ] **Step 1: Expose duplicate list in dashboard status**

Render a small table for duplicate promoted drafts with source URL, official row, promoted row, and a withdraw action.

- [ ] **Step 2: Add CLI command**

Add `node scripts/manage_knowledge_inbox.mjs duplicates --kb ComarchOptimaReference` and `withdraw <draftId>`.

- [ ] **Step 3: Verify the self-service path**

Use the CLI and dashboard withdrawal endpoint against a seeded duplicate draft and confirm the promoted draft is withdrawn cleanly.

### Task 4: Verify end state

**Files:**
- `docs/reference/KB_Quality_Gate_Report.json`
- `docs/reference/KB_Quality_Gate_Report.md`

- [ ] **Step 1: Refresh the Optima Reference export and quality gate**
- [ ] **Step 2: Confirm Quality Gate becomes `PASS`**
- [ ] **Step 3: Confirm dashboard still shows the remaining reports cleanly**
