#!/usr/bin/env node

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'taxbell-reference-duplicate-id-test-'));
const sourceRoot = path.join(root, 'downloads/taxbell/legal_reference');
const snapshotsDir = path.join(sourceRoot, 'snapshots');
const registryPath = path.join(sourceRoot, 'meta/source_registry.json');
const promotedDir = path.join(root, 'docs/reference/knowledge_inbox/promoted/TaxbellLegalReference');

fs.mkdirSync(snapshotsDir, { recursive: true });
fs.mkdirSync(path.dirname(registryPath), { recursive: true });
fs.mkdirSync(promotedDir, { recursive: true });

const entries = [
  {
    title: 'Substantive source',
    url: 'https://example.test/Legal/Document/',
    domain: 'example.test',
    sourceTier: 'official_law',
    contentLength: 240,
    localSnapshotPath: 'downloads/taxbell/legal_reference/snapshots/substantive.json',
  },
  {
    title: 'Human Verification',
    url: 'https://example.test/legal/document',
    domain: 'example.test',
    sourceTier: 'official_law',
    contentLength: 120,
    localSnapshotPath: 'downloads/taxbell/legal_reference/snapshots/verification.json',
  },
];

fs.writeFileSync(registryPath, `${JSON.stringify({ entries }, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(snapshotsDir, 'substantive.json'), `${JSON.stringify({
  content: 'Substantive legal content '.repeat(10),
}, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(snapshotsDir, 'verification.json'), `${JSON.stringify({
  content: 'Human Verification challenge '.repeat(5),
}, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(promotedDir, 'draft_url_variant.json'), `${JSON.stringify({
  id: 'draft_url_variant',
  title: 'Reviewed URL variant',
  content: 'Reviewed operator content '.repeat(5),
  sourceUrl: 'https://example.test/legal/document',
  status: 'promoted',
  promotedAt: '2026-09-01T00:00:00.000Z',
}, null, 2)}\n`, 'utf8');

execFileSync(process.execPath, ['scripts/export_taxbell_legal_reference.mjs'], {
  cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  env: { ...process.env, ROOT: root },
  stdio: 'pipe',
});

const referenceCsv = fs.readFileSync(path.join(root, 'exports/taxbell_legal_reference/v1/reference_document.csv'), 'utf8');
const chunkCsv = fs.readFileSync(path.join(root, 'exports/taxbell_legal_reference/v1/chunk.csv'), 'utf8');
const documentId = 'TBDOC_HTTPS_EXAMPLE_TEST_LEGAL_DOCUMENT';
const chunkId = `TBCHUNK_${documentId}_1`;

assert.equal(referenceCsv.match(new RegExp(`^${documentId},`, 'gm'))?.length, 1);
assert.match(referenceCsv, new RegExp(`^${documentId},Substantive source,`, 'm'));
assert.doesNotMatch(referenceCsv, /Human Verification/);
assert.doesNotMatch(referenceCsv, /^TBDOC_PROMOTED_DRAFT_URL_VARIANT,/m);
assert.equal(chunkCsv.match(new RegExp(`^${chunkId},`, 'gm'))?.length, 1);
assert.match(chunkCsv, /Substantive legal content/);
assert.doesNotMatch(chunkCsv, /Human Verification challenge/);
assert.match(chunkCsv, new RegExp(`taxbell_promoted_chunk,${documentId},https://example\\.test/legal/document,`));

process.stdout.write('Taxbell reference duplicate ID tests passed.\n');
