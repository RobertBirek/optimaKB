import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import {
  assignOwaRelationId,
  compileOwaRelationPolicy,
  loadOwaRelationPolicy,
} from './lib/owa_relation_policy.mjs';

const owner = 'OWA_ENTITY_ENCJA_DOKUMENT_KSIEGOWY_PK_BO_WB';
const oldId = 'OWA_REL_DOKUMENT_KSIEGOWY_PK_BO_WB_MA_ELEMENTY';
const newId = 'OWA_REL_DOKUMENT_KSIEGOWY_PK_BO_WB_MA_ELEMENTY_DEKRETYELEM';
const key = (target) => ({ sourceEntityRefId: owner, predicate: 'ma_elementy', legacyTargetRefId: target });
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

function fixture() {
  return {
    schemaVersion: 1,
    namespace: 'OWAOntology',
    database: 'owaontology',
    observedAt: '2026-10-28T07:46:27.189876+00:00',
    sourceEvidence: [{ name: 'saved-audit/relation-properties.csv', sha256: 'a'.repeat(64) }],
    reservedIds: [oldId, 'retired-id'],
    entries: [
      { ...key('OWA_ENTITY_KSIDOKELEM'), id: oldId, state: 'preserved' },
      { ...key('OWA_ENTITY_DEKRETYELEM'), id: newId, state: 'new' },
      { ...key('retired-target'), id: 'retired-id', state: 'retired' },
    ],
  };
}

// Catch owner/predicate-only lookup and accidental reuse of the historical ID.
test('same owner and predicate with distinct targets preserve the old ID and assign the approved new ID', () => {
  const policy = compileOwaRelationPolicy(fixture());
  assert.deepEqual(assignOwaRelationId(policy, key('OWA_ENTITY_KSIDOKELEM')), { id: oldId, kind: 'preserved' });
  assert.deepEqual(assignOwaRelationId(policy, key('OWA_ENTITY_DEKRETYELEM')), { id: newId, kind: 'new' });
});

test('JSON tuple keys do not collide on commas, quotes, pipes or control separators', () => {
  const value = fixture();
  const triples = [
    ['a,b', 'c', 'd'], ['a', 'b,c', 'd'],
    ['a|b', 'c', 'd'], ['a', 'b|c', 'd'],
    ['a\u001fb', 'c', 'd'], ['a', 'b\u001fc', 'd'],
    ['a","b', 'c', 'd'], ['a', 'b","c', 'd'],
  ];
  value.entries = triples.map(([sourceEntityRefId, predicate, legacyTargetRefId], index) => ({
    sourceEntityRefId, predicate, legacyTargetRefId, id: `id-${index}`, state: 'new',
  }));
  value.reservedIds = [];
  const policy = compileOwaRelationPolicy(value);
  assert.equal(policy.byKey.size, 8);
  for (const [index, entry] of value.entries.entries()) {
    assert.deepEqual(assignOwaRelationId(policy, entry), { id: `id-${index}`, kind: 'new' });
    assert.equal(policy.byKey.get(JSON.stringify(triples[index])).id, `id-${index}`);
  }
});

const invalidPolicies = [
  ['duplicate tuple', (v) => v.entries.push({ ...v.entries[0], id: 'different-id' }), /duplicate.*key/i],
  ['duplicate ID', (v) => { v.entries[1].id = oldId; }, /duplicate.*id/i],
  ['unsupported schema version', (v) => { v.schemaVersion = 2; }, /schemaVersion/],
  ['foreign namespace', (v) => { v.namespace = 'Other'; }, /namespace/],
  ['foreign database', (v) => { v.database = 'other'; }, /database/],
  ['reserved new ID', (v) => v.reservedIds.push(newId), /new.*reserved/i],
  ['missing preserved reservation', (v) => { v.reservedIds = ['retired-id']; }, /reservedIds/],
  ['missing retired reservation', (v) => { v.reservedIds = [oldId]; }, /reservedIds/],
  ['extra reservation', (v) => v.reservedIds.push('unknown-id'), /reservedIds/],
  ['duplicate reservation', (v) => v.reservedIds.push(oldId), /duplicate.*reserved/i],
  ['missing entries', (v) => { delete v.entries; }, /entries/],
  ['non-array entries', (v) => { v.entries = {}; }, /entries/],
  ['invalid state', (v) => { v.entries[0].state = 'active'; }, /state/],
  ['blank ID', (v) => { v.entries[0].id = ' '; }, /id/],
  ['absent tuple field', (v) => { delete v.entries[0].legacyTargetRefId; }, /legacyTargetRefId/],
  ['NULL tuple field', (v) => { v.entries[0].legacyTargetRefId = null; }, /legacyTargetRefId/],
  ['empty tuple field', (v) => { v.entries[0].legacyTargetRefId = ''; }, /legacyTargetRefId/],
  ['invalid date', (v) => { v.observedAt = 'yesterday'; }, /observedAt/],
  ['missing evidence', (v) => { v.sourceEvidence = []; }, /sourceEvidence/],
  ['invalid evidence hash', (v) => { v.sourceEvidence[0].sha256 = 'bad'; }, /sha256/],
  ['absolute evidence path', (v) => { v.sourceEvidence[0].name = '/tmp/old/audit'; }, /name/],
  ['traversing evidence path', (v) => { v.sourceEvidence[0].name = '../audit'; }, /name/],
  ['duplicate evidence name', (v) => v.sourceEvidence.push({ ...v.sourceEvidence[0] }), /duplicate.*evidence/i],
  ['unknown policy field', (v) => { v.fallback = true; }, /field/],
  ['unknown entry field', (v) => { v.entries[0].targetEntityRefId = 'ambiguous'; }, /field/],
  ['unknown evidence field', (v) => { v.sourceEvidence[0].path = '/tmp/old'; }, /field/],
];
for (const [name, mutate, expected] of invalidPolicies) {
  test(`compile rejects ${name} without fallback`, () => {
    const value = fixture();
    mutate(value);
    assert.throws(() => compileOwaRelationPolicy(value), expected);
  });
}

test('compile rejects null and non-object policies', () => {
  for (const value of [null, [], 'policy', 1]) assert.throws(() => compileOwaRelationPolicy(value));
});

test('unlisted, retired, changed-case and incomplete tuples cannot receive an ID', () => {
  const policy = compileOwaRelationPolicy(fixture());
  assert.throws(() => assignOwaRelationId(policy, key('missing')), /missing|unlisted/i);
  assert.throws(() => assignOwaRelationId(policy, key('retired-target')), /retired/i);
  assert.throws(() => assignOwaRelationId(policy, { ...key('OWA_ENTITY_KSIDOKELEM'), predicate: 'MA_ELEMENTY' }), /missing|unlisted/i);
  for (const value of [null, {}, key(''), key(null), key(42)]) {
    assert.throws(() => assignOwaRelationId(policy, value));
  }
});

test('compilation owns its entry and metadata snapshots rather than aliasing caller input', () => {
  const value = fixture();
  const policy = compileOwaRelationPolicy(value);
  value.entries[0].state = 'retired';
  value.entries[0].id = 'changed-id';
  value.sourceEvidence[0].sha256 = 'b'.repeat(64);
  assert.deepEqual(assignOwaRelationId(policy, key('OWA_ENTITY_KSIDOKELEM')), { id: oldId, kind: 'preserved' });
  assert.equal(policy.sourceEvidence[0].sha256, 'a'.repeat(64));
  assert.ok(policy.byKey instanceof Map);
  assert.ok(policy.reservedIds instanceof Set);
});

// These tests only write private scratch copies; the real default JSON is never altered.
async function scratchLoader(contents) {
  const directory = mkdtempSync(join(tmpdir(), 'owa-policy-test-'));
  const modulePath = join(directory, 'owa_relation_policy.mjs');
  copyFileSync(new URL('./lib/owa_relation_policy.mjs', import.meta.url), modulePath);
  if (contents !== undefined) writeFileSync(join(directory, 'owa_relation_id_policy.json'), contents);
  return import(pathToFileURL(modulePath).href);
}

test('code-relative loader fails closed when its adjacent policy is missing', async () => {
  const copy = await scratchLoader();
  assert.throws(() => copy.loadOwaRelationPolicy(), /policy|ENOENT/i);
});

test('code-relative loader rejects damaged JSON and valid JSON with invalid schema', async () => {
  for (const contents of ['{broken', 'null', JSON.stringify({ ...fixture(), schemaVersion: 2 })]) {
    const copy = await scratchLoader(contents);
    assert.throws(() => copy.loadOwaRelationPolicy());
  }
});

test('portable loader uses only its adjacent policy and hashes the actual bytes', async () => {
  const bytes = ` ${JSON.stringify(fixture(), null, 2)}\n\n`;
  const copy = await scratchLoader(bytes);
  const loaded = copy.loadOwaRelationPolicy();
  assert.equal(loaded.sha256, digest(bytes));
  assert.deepEqual(copy.assignOwaRelationId(loaded.policy, key('OWA_ENTITY_DEKRETYELEM')), { id: newId, kind: 'new' });
});

test('saved default policy has 134 preserved, 12 retired, one new and exactly 146 historical reservations', () => {
  const bytes = readFileSync(new URL('./lib/owa_relation_id_policy.json', import.meta.url));
  const { policy, sha256 } = loadOwaRelationPolicy();
  assert.equal(sha256, digest(bytes));
  assert.equal(policy.entries.length, 147);
  assert.equal(policy.byKey.size, 147);
  assert.equal(new Set(policy.entries.map((entry) => entry.id)).size, 147);
  assert.equal(policy.reservedIds.size, 146);
  const counts = { preserved: 0, retired: 0, new: 0 };
  for (const entry of policy.entries) {
    counts[entry.state]++;
    if (entry.state === 'retired') assert.throws(() => assignOwaRelationId(policy, entry), /retired/i);
    else assert.deepEqual(assignOwaRelationId(policy, entry), { id: entry.id, kind: entry.state });
    assert.equal(policy.reservedIds.has(entry.id), entry.state !== 'new');
  }
  assert.deepEqual(counts, { preserved: 134, retired: 12, new: 1 });
  // Independent offline derivation pinned every tuple/ID/state, not just counts.
  const mapping = [...policy.entries].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    .map((entry) => [entry.sourceEntityRefId, entry.predicate, entry.legacyTargetRefId, entry.id, entry.state]);
  assert.equal(digest(JSON.stringify(mapping)), '2da97cc720d60f94847a6e25d75cf8d35c249480d00d7caab38932743123c599');
  assert.equal(policy.observedAt, '2026-10-28T07:46:27.189876+00:00');
  assert.equal(policy.sourceEvidence.length, 7);
  assert.deepEqual(assignOwaRelationId(policy, key('OWA_ENTITY_KSIDOKELEM')), { id: oldId, kind: 'preserved' });
  assert.deepEqual(assignOwaRelationId(policy, key('OWA_ENTITY_DEKRETYELEM')), { id: newId, kind: 'new' });
});
