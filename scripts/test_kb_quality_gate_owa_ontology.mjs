#!/usr/bin/env node

import assert from 'assert';
import { spawnSync } from 'child_process';

const exportResult = spawnSync(process.execPath, [
  'scripts/export_owa_ontology.mjs',
], {
  cwd: '/docker/openspg',
  encoding: 'utf8',
});

assert.strictEqual(exportResult.status, 0, exportResult.stderr || exportResult.stdout);

const result = spawnSync(process.execPath, [
  'scripts/kb_quality_gate.mjs',
  '--kb',
  'OWAOntology',
  '--json-only',
], {
  cwd: '/docker/openspg',
  encoding: 'utf8',
});

assert.strictEqual(result.status, 0, result.stderr || result.stdout);

const payload = JSON.parse(result.stdout);
const owa = payload.results.find((item) => item.namespace === 'OWAOntology');

assert(owa, 'Missing OWAOntology result.');
assert(!owa.errors.includes('Unsupported namespace: OWAOntology'), result.stdout);

process.stdout.write(`${JSON.stringify({ ok: true, verdict: owa.verdict, errors: owa.errors }, null, 2)}\n`);
