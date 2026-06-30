#!/usr/bin/env node

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-kb-discovery-cleaning-'));
process.env.ROOT = root;
process.env.CONTENT_AI_CLEAN = '1';

fs.mkdirSync(path.join(root, 'docs/reference/knowledge_inbox'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/reference/knowledge_inbox/registry.json'), JSON.stringify({ generatedAt: new Date().toISOString(), entries: [] }, null, 2));

const discovery = await import(`./lib/dashboard_discovery.mjs?test=${Date.now()}`);

const created = new Date().toISOString();
discovery.saveDiscoveryCandidate({
  id: 'candidate_cleaning',
  kbNamespace: 'ComarchOptimaReference',
  title: 'Discovery cleaning fixture',
  canonicalUrl: 'https://pomoc.comarch.pl/test/discovery-cleaning',
  query: 'fixture query',
  sourceTier: 'official',
  retrievedAt: created,
  contentHash: 'hash-1',
  content: 'REKLAMA\nZapisz się na newsletter\nTreść merytoryczna o KSeF.',
  snippet: 'Treść merytoryczna o KSeF.',
  status: 'CANDIDATE_ONLY',
  action: 'CREATE_DRAFT',
  tags: [],
  createdAt: created,
  assessment: {
    confidence: 0.99,
    duplicateRisk: 'low',
    contentRisk: 'low',
    promptVersion: 'test',
    model: 'test',
  },
});

const drafted = await discovery.createDraftFromDiscoveryCandidate('candidate_cleaning', 'test');
assert.strictEqual(drafted.status, 'DRAFTED');

const dayDir = path.join(root, 'downloads/knowledge_inbox', new Date().toISOString().slice(0, 10));
const draftFiles = fs.readdirSync(dayDir).filter((name) => name.endsWith('.json'));
assert.strictEqual(draftFiles.length, 1);
const draftJson = JSON.parse(fs.readFileSync(path.join(dayDir, draftFiles[0]), 'utf8'));
assert(!draftJson.content.includes('REKLAMA'));
assert(!draftJson.content.includes('newsletter'));
assert(draftJson.content.includes('Treść merytoryczna o KSeF.'));

process.stdout.write(`${JSON.stringify({ ok: true, draftId: draftJson.id }, null, 2)}\n`);
