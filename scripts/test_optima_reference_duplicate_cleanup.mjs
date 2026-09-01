#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'optima-duplicate-cleanup-'));
const day = '2026-06-19';
const draftId = 'draft_cleanup_1';

fs.mkdirSync(path.join(root, 'exports/optima_reference/v1'), { recursive: true });
fs.mkdirSync(path.join(root, 'downloads/knowledge_inbox', day), { recursive: true });
fs.mkdirSync(path.join(root, 'docs/reference/knowledge_inbox/promoted/ComarchOptimaReference'), { recursive: true });
fs.mkdirSync(path.join(root, 'docs/reference/knowledge_inbox'), { recursive: true });
fs.mkdirSync(path.join(root, 'data/dashboard/audit'), { recursive: true });

fs.writeFileSync(path.join(root, 'exports/optima_reference/v1/reference_document.csv'), [
  'id,name,sourceUrl,sourceType',
  'OFFICIAL_1,Official page,https://example.test/doc,official_help_print_snapshot',
  'PROMOTED_1,Promoted page,https://example.test/doc,promoted_knowledge_draft',
].join('\n'), 'utf8');

const rawDraftPath = path.join(root, 'downloads/knowledge_inbox', day, `${draftId}.json`);
fs.writeFileSync(rawDraftPath, JSON.stringify({
  id: draftId,
  kbName: 'Comarch Optima Reference',
  kbNamespace: 'ComarchOptimaReference',
  title: 'Promoted draft',
  content: 'Duplicate promoted draft content.',
  sourceUrl: 'https://example.test/doc',
  tags: [],
  createdAt: '2026-06-19T12:00:00.000Z',
}, null, 2));
fs.writeFileSync(rawDraftPath.replace(/\.json$/, '.md'), '# Promoted draft\n', 'utf8');

fs.writeFileSync(path.join(root, 'docs/reference/knowledge_inbox/promoted/ComarchOptimaReference', `${draftId}.json`), JSON.stringify({
  id: draftId,
  kbNamespace: 'ComarchOptimaReference',
  title: 'Promoted draft',
  sourceUrl: 'https://example.test/doc',
  sourceDraftPath: path.relative(root, rawDraftPath).replaceAll(path.sep, '/'),
  promotedJsonPath: `docs/reference/knowledge_inbox/promoted/ComarchOptimaReference/${draftId}.json`,
  promotedMarkdownPath: `docs/reference/knowledge_inbox/promoted/ComarchOptimaReference/${draftId}.md`,
  promotedAt: '2026-06-19T12:05:00.000Z',
  promotedBy: 'tester',
  reviewNote: 'seed fixture',
}, null, 2));
fs.writeFileSync(path.join(root, 'docs/reference/knowledge_inbox/promoted/ComarchOptimaReference', `${draftId}.md`), '# Promoted draft\n', 'utf8');

fs.writeFileSync(path.join(root, 'docs/reference/knowledge_inbox/registry.json'), JSON.stringify({
  generatedAt: '2026-06-19T12:05:00.000Z',
  entries: [{
    draftId,
    status: 'promoted',
    kbName: 'Comarch Optima Reference',
    kbNamespace: 'ComarchOptimaReference',
    title: 'Promoted draft',
    sourceUrl: 'https://example.test/doc',
    rawJsonPath: path.relative(root, rawDraftPath).replaceAll(path.sep, '/'),
    promotedJsonPath: `docs/reference/knowledge_inbox/promoted/ComarchOptimaReference/${draftId}.json`,
    promotedMarkdownPath: `docs/reference/knowledge_inbox/promoted/ComarchOptimaReference/${draftId}.md`,
    promotedAt: '2026-06-19T12:05:00.000Z',
    promotedBy: 'tester',
    reviewNote: 'seed fixture',
  }],
}, null, 2));

const run = spawnSync(process.execPath, [path.join(repoRoot, 'scripts/cleanup_optima_reference_duplicates.mjs')], {
  cwd: repoRoot,
  env: {
    ...process.env,
    ROOT: root,
    USER: 'cron',
  },
  encoding: 'utf8',
});

assert.equal(run.status, 0, run.stderr || run.stdout);
const report = JSON.parse(run.stdout);

assert.equal(report.overall, 'REMEDIATED');
assert.equal(report.withdrawnCount, 1);
assert.equal(report.candidates.length, 1);
assert.equal(report.candidates[0].draftId, draftId);

const registry = JSON.parse(fs.readFileSync(path.join(root, 'docs/reference/knowledge_inbox/registry.json'), 'utf8'));
assert.equal(registry.entries[0].status, 'withdrawn');
assert.equal(registry.entries[0].withdrawnBy, 'cron');

console.log(JSON.stringify({ ok: true, report }, null, 2));
