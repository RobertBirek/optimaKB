#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makePromotedId } from './lib/promoted_knowledge.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const namespace = 'ComarchOptimaBusinessSemantics';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-quality-business-semantics-'));
const exportDir = path.join(root, 'exports/optima_business_semantics/v1');
const promotedDir = path.join(root, 'docs/reference/knowledge_inbox/promoted', namespace);
const draft = {
  id: 'draft_business_quality',
  status: 'promoted',
  kbName: 'Comarch Optima Business Semantics',
  kbNamespace: namespace,
  title: 'Promotional bundles',
  content: 'Promotional bundles group products sold under shared conditions.',
  sourceUrl: 'https://example.test/promotional-bundles',
  promotedAt: '2026-08-31T10:00:00.000Z',
};

function writeManifest(descriptionCount) {
  const files = [
    ['business_domain.csv', 1],
    ['business_description.csv', descriptionCount],
    ['code_meaning.csv', 1],
    ['business_rule.csv', 1],
  ].map(([fileName, rowCount]) => ({ fileName, rowCount }));
  fs.writeFileSync(
    path.join(exportDir, '_manifest.json'),
    `${JSON.stringify({ generatedAt: '2026-08-31T10:00:00.000Z', files }, null, 2)}\n`,
    'utf8',
  );
}

function runGate() {
  return spawnSync(process.execPath, [
    'scripts/kb_quality_gate.mjs',
    '--kb',
    namespace,
    '--json-only',
  ], {
    cwd: REPO_ROOT,
    env: { ...process.env, ROOT: root },
    encoding: 'utf8',
  });
}

try {
  fs.mkdirSync(exportDir, { recursive: true });
  fs.mkdirSync(promotedDir, { recursive: true });
  fs.writeFileSync(path.join(promotedDir, `${draft.id}.json`), `${JSON.stringify(draft, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(exportDir, 'business_domain.csv'), 'id,name\nDOMAIN_1,Commerce\n', 'utf8');
  fs.writeFileSync(path.join(exportDir, 'business_description.csv'), 'id,name\n', 'utf8');
  fs.writeFileSync(path.join(exportDir, 'code_meaning.csv'), 'id,name\nCODE_1,Active\n', 'utf8');
  fs.writeFileSync(path.join(exportDir, 'business_rule.csv'), 'id,name\nRULE_1,Bundle rule\n', 'utf8');
  writeManifest(0);

  const missingResult = runGate();
  assert.equal(missingResult.status, 2, missingResult.stderr || missingResult.stdout);
  assert(missingResult.stdout.includes('Promoted drafts without visible business descriptions: 1'));

  const promotedId = makePromotedId('BD_PROMOTED', `${draft.id}_1`);
  fs.writeFileSync(
    path.join(exportDir, 'business_description.csv'),
    `id,name\n${promotedId},${draft.title}\n`,
    'utf8',
  );
  writeManifest(1);

  const coveredResult = runGate();
  assert.equal(coveredResult.status, 0, coveredResult.stderr || coveredResult.stdout);
  assert(!coveredResult.stdout.includes('Promoted drafts without visible business descriptions'));

  console.log('Business Semantics quality gate tests passed.');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
