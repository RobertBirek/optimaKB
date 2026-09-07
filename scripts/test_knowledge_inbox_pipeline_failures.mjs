#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const runner = path.resolve('scripts/run_knowledge_inbox_pipeline.mjs');
const runnerSource = fs.readFileSync(runner, 'utf8');

assert.match(
  runnerSource,
  /ComarchOptimaBusinessSemantics:\s*{[\s\S]*?promotedForceFiles:\s*\['business_description\.csv'\]/,
  'Business Semantics promotion must force only business_description.csv.',
);

function makeRoot(exportSource) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-inbox-pipeline-'));
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'scripts/export_optima_business_semantics.mjs'), exportSource);
  return root;
}

const helperRoot = makeRoot(`
  import fs from 'node:fs';
  import path from 'node:path';
  fs.writeFileSync(path.join(process.env.ROOT, 'helper-mode.txt'), process.env.OPENSPG_HELPER_ONLY || '');
`);
const helperResult = spawnSync(process.execPath, [runner, '--kb', 'ComarchOptimaBusinessSemantics', '--export'], {
  cwd: helperRoot,
  env: { ...process.env, ROOT: helperRoot },
  encoding: 'utf8',
});
assert.equal(helperResult.status, 0, helperResult.stderr || helperResult.stdout);
assert.equal(fs.readFileSync(path.join(helperRoot, 'helper-mode.txt'), 'utf8'), '1');

const failureRoot = makeRoot('process.exit(17);\n');
const failureResult = spawnSync(process.execPath, [runner, '--kb', 'ComarchOptimaBusinessSemantics', '--export'], {
  cwd: failureRoot,
  env: { ...process.env, ROOT: failureRoot },
  encoding: 'utf8',
});
assert.notEqual(failureResult.status, 0, 'A failed namespace must make the pipeline process fail.');

console.log('Knowledge inbox pipeline failure tests passed.');
