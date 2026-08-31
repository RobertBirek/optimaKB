#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'promoted-knowledge-reopen-'));
process.env.ROOT = root;

const draftId = 'draft_test';
const namespace = 'ComarchOptimaSchema';
const rawDir = path.join(root, 'downloads/knowledge_inbox');
const reviewDir = path.join(root, 'docs/reference/knowledge_inbox');
const promotedDir = path.join(reviewDir, 'promoted', namespace);
const rawJsonPath = path.join(rawDir, `${draftId}.json`);
const rawMarkdownPath = path.join(rawDir, `${draftId}.md`);
const promotedJsonPath = path.join(promotedDir, `${draftId}.json`);
const promotedMarkdownPath = path.join(promotedDir, `${draftId}.md`);
const auditPath = path.join(root, 'data/dashboard/audit', `${new Date().toISOString().slice(0, 10)}.jsonl`);

const draft = {
  id: draftId,
  kbName: 'Comarch Optima ERP MSSQL Schema',
  kbNamespace: namespace,
  title: 'Schema claim requiring review',
  sourceUrl: 'https://example.test/schema-claim',
  createdAt: '2026-08-30T12:00:00.000Z',
  content: 'Claim content.',
};
const registryEntry = {
  draftId,
  status: 'promoted',
  kbName: draft.kbName,
  kbNamespace: namespace,
  title: draft.title,
  sourceUrl: draft.sourceUrl,
  rawJsonPath: path.relative(root, rawJsonPath).replaceAll(path.sep, '/'),
  promotedJsonPath: path.relative(root, promotedJsonPath).replaceAll(path.sep, '/'),
  promotedMarkdownPath: path.relative(root, promotedMarkdownPath).replaceAll(path.sep, '/'),
  promotedAt: '2026-08-30T13:18:20.885Z',
  promotedBy: 'original-operator',
  reviewNote: 'Initial approval.',
};

try {
  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(promotedDir, { recursive: true });
  fs.writeFileSync(rawJsonPath, `${JSON.stringify(draft, null, 2)}\n`, 'utf8');
  fs.writeFileSync(rawMarkdownPath, '# Schema claim requiring review\n', 'utf8');
  fs.writeFileSync(promotedJsonPath, `${JSON.stringify({ ...draft, status: 'promoted' }, null, 2)}\n`, 'utf8');
  fs.writeFileSync(promotedMarkdownPath, '# Promoted schema claim\n', 'utf8');
  fs.writeFileSync(
    path.join(reviewDir, 'registry.json'),
    `${JSON.stringify({ generatedAt: registryEntry.promotedAt, entries: [registryEntry] }, null, 2)}\n`,
    'utf8',
  );

  const { reopenPromotedDraft } = await import('./lib/promoted_knowledge.mjs');
  const entry = reopenPromotedDraft('draft_test', {
    reopenedBy: 'test-operator',
    reviewNote: 'Source does not support the requested Schema claim.',
  });

  assert.equal(entry.status, 'pending');
  assert.equal(entry.previousPromotedAt, '2026-08-30T13:18:20.885Z');
  assert.equal(entry.reopenedBy, 'test-operator');
  assert.equal(entry.movedPaths.length, 2);
  assert(fs.existsSync(path.join(root, entry.movedPaths[0].to)));
  assert(!fs.existsSync(promotedJsonPath));
  assert(fs.existsSync(rawJsonPath));
  assert.match(fs.readFileSync(auditPath, 'utf8'), /knowledge_draft\.reopen/);
  assert.throws(() => reopenPromotedDraft('draft_test'), /Only promoted drafts can be reopened/);

  console.log('Promoted knowledge reopen tests passed.');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
