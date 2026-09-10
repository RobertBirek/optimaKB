#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-kb-provenance-'));
process.env.ROOT = fixtureRoot;
const { extractFocusHints, gatherEvidence, scanArtifact } = await import('./erp_knowledge_answer.mjs');

assert.deepEqual(
  extractFocusHints('Opisz CDN.EDNKSeFPodmioty3, CDN.PerformanceLog i dbo.TaxOptShp.'),
  ['cdn.ednksefpodmioty3', 'cdn.performancelog', 'dbo.taxoptshp'],
);
assert.deepEqual(extractFocusHints('Jak działa faktura sprzedaży?'), []);

try {
  fs.mkdirSync(path.join(fixtureRoot, 'docs'), { recursive: true });
  const artifact = 'docs/order-to-cash.md';
  const content = 'Order-to-Cash rozpoczyna się od zamówienia.\nFaktura kończy etap sprzedaży.\n';
  fs.writeFileSync(path.join(fixtureRoot, artifact), content, 'utf8');

  const scanned = scanArtifact(artifact, ['order'], [], 3);
  assert.equal(scanned.contentHash, `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`);
  assert.ok(!Number.isNaN(Date.parse(scanned.observedAt)));

  const evidence = gatherEvidence({
    primaryKb: { name: 'McpOptimaPlaybooks', artifacts: [artifact] },
    supportKbs: [],
  }, ['order']);
  assert.equal(evidence.length, 1);
  assert.match(evidence[0].sourceId, /^sha256:[a-f0-9]{64}$/);
  assert.equal(evidence[0].uri, 'knowledge://legacy/McpOptimaPlaybooks/docs/order-to-cash.md');
  assert.equal(evidence[0].locator, 'L1');
  assert.equal(evidence[0].contentHash, scanned.contentHash);
  assert.ok(!Number.isNaN(Date.parse(evidence[0].observedAt)));
  assert.equal(evidence[0].excerpt, 'Order-to-Cash rozpoczyna się od zamówienia.');

  const repeated = gatherEvidence({
    primaryKb: { name: 'McpOptimaPlaybooks', artifacts: [artifact] },
    supportKbs: [],
  }, ['order']);
  assert.equal(repeated[0].sourceId, evidence[0].sourceId);
  assert.equal(repeated[0].uri, evidence[0].uri);

  const invalidUtf8 = Buffer.concat([Buffer.from('Order-to-Cash '), Buffer.from([0xff, 0xfe])]);
  fs.writeFileSync(path.join(fixtureRoot, artifact), invalidUtf8);
  const changed = gatherEvidence({
    primaryKb: { name: 'McpOptimaPlaybooks', artifacts: [artifact] },
    supportKbs: [],
  }, ['order']);
  assert.equal(changed[0].contentHash, `sha256:${crypto.createHash('sha256').update(invalidUtf8).digest('hex')}`);
  assert.notEqual(changed[0].sourceId, evidence[0].sourceId);
  assert.equal(changed[0].uri, evidence[0].uri);
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

process.stdout.write('ERP knowledge answer focus tests passed.\n');
