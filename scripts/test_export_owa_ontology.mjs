#!/usr/bin/env node

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'owa-export-'));

try {
  const draftId = 'draft_2026-07-17_test_owa_markdown_fallback';
  const inboxDir = path.join(root, 'downloads/knowledge_inbox/2026-07-17');
  fs.mkdirSync(inboxDir, { recursive: true });

  writeJson(path.join(inboxDir, `${draftId}.json`), {
    id: draftId,
    kbName: 'OWA Platform Optima Ontology',
    kbNamespace: 'OWAOntology',
    title: 'Encja: Atrybuty test fallback',
    tags: ['OWA', 'ontologia'],
    metadata: {
      discoveredVia: 'owa_ontology_mcp',
      sourceTier: 'ontology',
      retrievedAt: '2026-07-17T20:20:34.864Z',
    },
    createdAt: '2026-07-17T20:20:34.864Z',
  });

  fs.writeFileSync(path.join(inboxDir, `${draftId}.md`), [
    '# Encja: Atrybuty test fallback',
    '',
    '## Status weryfikacji',
    '- Status: `częściowo-zweryfikowane`',
    '- Identyfikator ontologiczny: `OWAOntology.Atrybutytestfallback`',
    '',
    '## Opis biznesowy',
    'Definicje atrybutów w Comarch ERP Optima.',
    '',
    '## Źródła danych',
    '| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |',
    '|---|---|---|---|---|',
    '| Tabela główna | `CDN` | `CDN.DefAtrybuty` | `CONFIRMED` | MSSQL + OWA Ontology MCP |',
    '',
    '## Endpointy OptimaMCP',
    '### READ',
    '- `OptimaMCP_optima_list_attributes` - Lista atrybutów',
    '',
  ].join('\n'), 'utf8');

  const result = spawnSync(process.execPath, ['scripts/export_owa_ontology.mjs'], {
    cwd: '/docker/openspg',
    env: { ...process.env, ROOT: root },
    encoding: 'utf8',
  });

  assert.strictEqual(result.status, 0, result.stderr || result.stdout);

  const chunkCsv = fs.readFileSync(path.join(root, 'exports/owa_ontology/v1/chunk.csv'), 'utf8');
  assert(chunkCsv.includes('Atrybuty test fallback'), chunkCsv);
  assert(chunkCsv.includes(draftId), chunkCsv);

  process.stdout.write(`${JSON.stringify({ ok: true }, null, 2)}\n`);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
