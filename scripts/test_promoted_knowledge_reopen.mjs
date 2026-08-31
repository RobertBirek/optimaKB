#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'promoted-knowledge-reopen-'));
process.env.ROOT = root;

const rawDir = path.join(root, 'downloads/knowledge_inbox');
const reviewDir = path.join(root, 'docs/reference/knowledge_inbox');
const registryPath = path.join(reviewDir, 'registry.json');
const auditRoot = path.join(root, 'data/dashboard/audit');
const failures = [];

function runTest(name, callback) {
  try {
    callback();
  } catch (error) {
    failures.push({ name, error });
    console.error(`FAIL: ${name}\n${error.stack}`);
  }
}

function captureError(callback) {
  try {
    callback();
  } catch (error) {
    return error;
  }
  assert.fail('Expected callback to throw');
}

function createFixture({
  draftId,
  draftNamespace = 'ComarchOptimaSchema',
  registryNamespace = draftNamespace,
  includePromotedMarkdown = true,
}) {
  const promotedDir = path.join(reviewDir, 'promoted', registryNamespace);
  const rawJsonPath = path.join(rawDir, `${draftId}.json`);
  const rawMarkdownPath = path.join(rawDir, `${draftId}.md`);
  const promotedJsonPath = path.join(promotedDir, `${draftId}.json`);
  const promotedMarkdownPath = path.join(promotedDir, `${draftId}.md`);
  const draft = {
    id: draftId,
    kbName: 'Comarch Optima ERP MSSQL Schema',
    kbNamespace: draftNamespace,
    title: 'Schema claim requiring review',
    sourceUrl: 'https://example.test/schema-claim',
    createdAt: '2026-08-30T12:00:00.000Z',
    content: 'Claim content.',
  };
  const registryEntry = {
    draftId,
    status: 'promoted',
    kbName: draft.kbName,
    kbNamespace: registryNamespace,
    title: draft.title,
    sourceUrl: draft.sourceUrl,
    rawJsonPath: path.relative(root, rawJsonPath).replaceAll(path.sep, '/'),
    promotedJsonPath: path.relative(root, promotedJsonPath).replaceAll(path.sep, '/'),
    promotedMarkdownPath: path.relative(root, promotedMarkdownPath).replaceAll(path.sep, '/'),
    promotedAt: '2026-08-30T13:18:20.885Z',
    promotedBy: 'original-operator',
    reviewNote: 'Initial approval.',
  };

  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(promotedDir, { recursive: true });
  fs.writeFileSync(rawJsonPath, `${JSON.stringify(draft, null, 2)}\n`, 'utf8');
  fs.writeFileSync(rawMarkdownPath, '# Schema claim requiring review\n', 'utf8');
  fs.writeFileSync(promotedJsonPath, `${JSON.stringify({ ...draft, status: 'promoted' }, null, 2)}\n`, 'utf8');
  if (includePromotedMarkdown) {
    fs.writeFileSync(promotedMarkdownPath, '# Promoted schema claim\n', 'utf8');
  }
  fs.writeFileSync(
    registryPath,
    `${JSON.stringify({ generatedAt: registryEntry.promotedAt, entries: [registryEntry] }, null, 2)}\n`,
    'utf8',
  );

  return { registryEntry, rawJsonPath, promotedJsonPath, promotedMarkdownPath };
}

function assertPromotedState(fixture) {
  assert(fs.existsSync(fixture.promotedJsonPath));
  assert(fs.existsSync(fixture.promotedMarkdownPath));
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  assert.equal(registry.entries[0].status, 'promoted');
  assert.deepEqual(registry.entries[0], fixture.registryEntry);
}

try {
  fs.mkdirSync(reviewDir, { recursive: true });
  const { reopenPromotedDraft } = await import('./lib/promoted_knowledge.mjs');

  runTest('reopens a promoted draft', () => {
    const fixture = createFixture({ draftId: 'draft_test' });
    const entry = reopenPromotedDraft('draft_test', {
      reopenedBy: 'test-operator',
      reviewNote: 'Source does not support the requested Schema claim.',
    });
    const auditFiles = fs.readdirSync(auditRoot).filter((name) => name.endsWith('.jsonl'));

    assert.equal(entry.status, 'pending');
    assert.equal(entry.previousPromotedAt, '2026-08-30T13:18:20.885Z');
    assert.equal(entry.reopenedBy, 'test-operator');
    assert.equal(entry.movedPaths.length, 2);
    assert(fs.existsSync(path.join(root, entry.movedPaths[0].to)));
    assert(!fs.existsSync(fixture.promotedJsonPath));
    assert(fs.existsSync(fixture.rawJsonPath));
    assert.match(fs.readFileSync(path.join(auditRoot, auditFiles.at(-1)), 'utf8'), /knowledge_draft\.reopen/);
    assert.throws(() => reopenPromotedDraft('draft_test'), /Only promoted drafts can be reopened/);
  });

  runTest('uses the promoted registry namespace for the archive', () => {
    const fixture = createFixture({
      draftId: 'draft_namespace',
      draftNamespace: 'ComarchOptimaSchema',
      registryNamespace: 'ComarchOptimaReference',
    });
    const entry = reopenPromotedDraft('draft_namespace');

    assert.equal(entry.kbNamespace, 'ComarchOptimaReference');
    assert(entry.movedPaths.every(({ to }) => to.includes('/withdrawn/ComarchOptimaReference/draft_namespace/')));
    assert(!fs.existsSync(fixture.promotedJsonPath));
  });

  runTest('restores the first snapshot when the second move fails', () => {
    const fixture = createFixture({ draftId: 'draft_partial_move', includePromotedMarkdown: false });

    assert.throws(() => reopenPromotedDraft('draft_partial_move'), /ENOENT/);
    assert(fs.existsSync(fixture.promotedJsonPath));
    assert.equal(JSON.parse(fs.readFileSync(registryPath, 'utf8')).entries[0].status, 'promoted');
  });

  runTest('restores snapshots and registry when registry persistence fails', () => {
    const fixture = createFixture({ draftId: 'draft_registry_failure' });
    const renameSync = fs.renameSync;
    let injectFailure = true;
    fs.renameSync = (sourcePath, destinationPath) => {
      if (injectFailure && destinationPath === registryPath) {
        injectFailure = false;
        throw new Error('injected registry persistence failure');
      }
      return renameSync(sourcePath, destinationPath);
    };
    try {
      assert.throws(
        () => reopenPromotedDraft('draft_registry_failure'),
        /injected registry persistence failure/,
      );
    } finally {
      fs.renameSync = renameSync;
    }

    assertPromotedState(fixture);
  });

  runTest('restores snapshots and registry when audit persistence fails', () => {
    const fixture = createFixture({ draftId: 'draft_audit_failure' });
    const appendFileSync = fs.appendFileSync;
    fs.appendFileSync = (filePath, ...args) => {
      if (String(filePath).startsWith(auditRoot)) throw new Error('injected audit persistence failure');
      return appendFileSync(filePath, ...args);
    };
    try {
      assert.throws(
        () => reopenPromotedDraft('draft_audit_failure'),
        /injected audit persistence failure/,
      );
    } finally {
      fs.appendFileSync = appendFileSync;
    }

    assertPromotedState(fixture);
  });

  runTest('preserves the original failure and reports compensation failures', () => {
    const fixture = createFixture({ draftId: 'draft_compensation_failure' });
    const appendFileSync = fs.appendFileSync;
    const renameSync = fs.renameSync;
    fs.appendFileSync = (filePath, ...args) => {
      if (String(filePath).startsWith(auditRoot)) throw new Error('original audit failure');
      return appendFileSync(filePath, ...args);
    };
    fs.renameSync = (sourcePath, destinationPath) => {
      if (destinationPath === fixture.promotedMarkdownPath) {
        throw new Error('injected snapshot compensation failure');
      }
      return renameSync(sourcePath, destinationPath);
    };
    let error;
    try {
      error = captureError(() => reopenPromotedDraft('draft_compensation_failure'));
    } finally {
      fs.appendFileSync = appendFileSync;
      fs.renameSync = renameSync;
    }

    assert.equal(error.cause?.message, 'original audit failure');
    assert.match(error.message, /compensation failed/i);
    assert(error.errors.some((item) => /snapshot compensation failure/.test(item.message)));
    assert(fs.existsSync(fixture.promotedJsonPath));
    assert.equal(JSON.parse(fs.readFileSync(registryPath, 'utf8')).entries[0].status, 'promoted');
  });

  if (failures.length) {
    throw new AggregateError(failures.map(({ error }) => error), `${failures.length} promoted knowledge reopen tests failed`);
  }
  console.log('Promoted knowledge reopen tests passed.');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
