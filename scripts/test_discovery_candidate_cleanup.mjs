#!/usr/bin/env node

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-kb-discovery-retro-clean-'));
process.env.ROOT = root;
process.env.CONTENT_AI_CLEAN = '0';

fs.mkdirSync(path.join(root, 'data/dashboard/discovery/candidates'), { recursive: true });
fs.mkdirSync(path.join(root, 'data/dashboard/audit'), { recursive: true });

const discovery = await import(`./lib/dashboard_discovery.mjs?test=${Date.now()}`);

discovery.saveDiscoveryCandidate({
  id: 'candidate_dirty',
  title: 'Dirty candidate',
  canonicalUrl: 'https://example.com/dirty',
  kbNamespace: 'ComarchOptimaReference',
  query: 'fixture',
  sourceTier: 'professional',
  content: 'REKLAMA\nZapisz się na newsletter\nTreść główna artykułu.\nUdostępnij',
  snippet: 'REKLAMA\nTreść główna artykułu.',
  status: 'CANDIDATE_ONLY',
  createdAt: '2026-06-29T07:00:00.000Z',
  assessment: { confidence: 0.9, duplicateRisk: 'low', contentRisk: 'low' },
});
discovery.saveDiscoveryCandidate({
  id: 'candidate_clean',
  title: 'Clean candidate',
  canonicalUrl: 'https://example.com/clean',
  kbNamespace: 'ComarchOptimaReference',
  query: 'fixture',
  sourceTier: 'professional',
  content: 'Treść bez artefaktów.',
  snippet: 'Treść bez artefaktów.',
  status: 'CANDIDATE_ONLY',
  createdAt: '2026-06-29T07:01:00.000Z',
  assessment: { confidence: 0.9, duplicateRisk: 'low', contentRisk: 'low' },
});

const result = await discovery.retroCleanDiscoveryCandidates({ operator: 'test-cleanup' });
assert.strictEqual(result.scanned, 2);
assert.strictEqual(result.cleaned, 1);

const dirty = discovery.readDiscoveryCandidate('candidate_dirty');
assert(!dirty.content.includes('REKLAMA'));
assert(!dirty.content.includes('newsletter'));
assert(!dirty.content.includes('Udostępnij'));
assert(dirty.content.includes('Treść główna artykułu.'));
assert.strictEqual(dirty.cleanup?.operator, 'test-cleanup');

const clean = discovery.readDiscoveryCandidate('candidate_clean');
assert.strictEqual(clean.content, 'Treść bez artefaktów.');
assert.strictEqual(clean.cleanup, undefined);

process.stdout.write(`${JSON.stringify({ ok: true, cleaned: result.cleaned }, null, 2)}\n`);
