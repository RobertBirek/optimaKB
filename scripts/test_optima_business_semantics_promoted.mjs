#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makePromotedId } from './lib/promoted_knowledge.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  return rows.filter((values) => values.some((value) => value !== ''));
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'optima-business-semantics-promoted-'));
const promoted = {
  id: 'draft_business',
  status: 'promoted',
  kbName: 'Comarch Optima Business Semantics',
  kbNamespace: 'ComarchOptimaBusinessSemantics',
  title: 'Promotional bundles',
  content: 'Zestawy promocyjne grupują towary sprzedawane na wspólnych warunkach.',
  promotedAt: '2026-08-31T10:00:00.000Z',
  metadata: {
    language: 'pl',
    businessDomain: 'Handel',
  },
};

try {
  const promotedDir = path.join(
    root,
    'docs/reference/knowledge_inbox/promoted/ComarchOptimaBusinessSemantics',
  );
  fs.mkdirSync(promotedDir, { recursive: true });
  fs.writeFileSync(
    path.join(promotedDir, `${promoted.id}.json`),
    `${JSON.stringify(promoted, null, 2)}\n`,
    'utf8',
  );

  const result = spawnSync(process.execPath, ['scripts/export_optima_business_semantics.mjs'], {
    cwd: path.resolve(SCRIPT_DIR, '..'),
    env: {
      ...process.env,
      ROOT: root,
      OPENSPG_HELPER_ONLY: '1',
    },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const exportDir = path.join(root, 'exports/optima_business_semantics/v1');
  const csvPath = path.join(exportDir, 'business_description.csv');
  assert.ok(fs.existsSync(csvPath), `Missing Business Semantics export: ${csvPath}`);

  const [header, ...data] = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  const columns = Object.fromEntries(header.map((name, index) => [name, index]));
  const exported = Object.fromEntries(
    header.map((name, index) => [name, data[0]?.[index] ?? '']),
  );
  const manifest = JSON.parse(fs.readFileSync(path.join(exportDir, '_manifest.json'), 'utf8'));

  assert.equal(data.length, 1);
  assert.equal(Object.keys(columns).length, 11);
  assert.equal(exported.id, makePromotedId('BD_PROMOTED', 'draft_business_1'));
  assert.equal(exported.name, 'Promotional bundles');
  assert.equal(exported.description, promoted.content);
  assert.equal(exported.tableRefId, '');
  assert.equal(exported.columnRefId, '');
  assert.equal(exported.source, 'promoted_knowledge_draft');
  assert.equal(exported.language, 'pl');
  assert.equal(exported.domainName, 'Handel');
  assert.equal(exported.descriptionHash.length, 64);
  assert.equal(Number(exported.descriptionLength), promoted.content.length);
  assert.equal(manifest.promotedDraftCount, 1);
  assert.equal(manifest.promotedDescriptionCount, 1);

  console.log('Promoted Business Semantics export tests passed.');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
