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
