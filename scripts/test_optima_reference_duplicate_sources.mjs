#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { findOptimaReferenceDuplicateSources } from './lib/optima_reference_duplicates.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'optima-duplicate-source-test-'));

fs.mkdirSync(path.join(root, 'exports/optima_reference/v1'), { recursive: true });
fs.mkdirSync(path.join(root, 'docs/reference/knowledge_inbox/promoted/ComarchOptimaReference'), { recursive: true });

fs.writeFileSync(path.join(root, 'exports/optima_reference/v1/reference_document.csv'), [
  'id,name,sourceUrl,sourceType',
  'OFFICIAL_1,Official page,https://example.test/doc,official_help_print_snapshot',
  'PROMOTED_1,Promoted page,https://example.test/doc,promoted_knowledge_draft',
].join('\n'), 'utf8');

fs.writeFileSync(path.join(root, 'docs/reference/knowledge_inbox/promoted/ComarchOptimaReference/draft_1.json'), JSON.stringify({
  id: 'draft_1',
  kbNamespace: 'ComarchOptimaReference',
  title: 'Promoted draft',
  sourceUrl: 'https://example.test/doc',
  sourceDraftPath: 'downloads/knowledge_inbox/2026-06-19/draft_1.json',
  promotedJsonPath: 'docs/reference/knowledge_inbox/promoted/ComarchOptimaReference/draft_1.json',
}, null, 2));

const duplicates = findOptimaReferenceDuplicateSources({ root });

assert.equal(duplicates.length, 1);
assert.equal(duplicates[0].sourceUrl, 'https://example.test/doc');
assert.equal(duplicates[0].promotedDraftIds[0], 'draft_1');

console.log(JSON.stringify({ ok: true, duplicates }, null, 2));
