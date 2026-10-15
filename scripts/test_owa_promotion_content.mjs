#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import childProcess from 'node:child_process';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { syncBuiltinESMExports } from 'node:module';

// All probes, including escape targets, are synthetic files in this sandbox.
const sandbox = fs.mkdtempSync('/tmp/opencode/owa-promotion-content-');
const root = path.join(sandbox, 'root');
const oldRoot = process.env.ROOT;
process.env.ROOT = root;
const raw = path.join(root, 'downloads/knowledge_inbox');
const review = path.join(root, 'docs/reference/knowledge_inbox');
const registry = path.join(review, 'registry.json');
const body = '# Encja: Konto testowe\n\n## Opis biznesowy\nDokumentacja testowa, nie dane ERP.\n';
const restore = [];
let passed = 0;
const deny = () => { throw new Error('Fixture blocked network/process execution'); };
function patch(object, key, replacement) {
  const original = object[key];
  object[key] = replacement;
  restore.push(() => { object[key] = original; });
}
patch(globalThis, 'fetch', deny);
for (const key of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) {
  patch(childProcess, key, deny);
}
patch(net.Socket.prototype, 'connect', deny);
for (const object of [http, https]) {
  for (const key of ['request', 'get']) patch(object, key, deny);
}
syncBuiltinESMExports();

function inside(base, file) {
  const relative = path.relative(base, file);
  return !relative || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}
const reads = [];
const readFileSync = fs.readFileSync;
patch(fs, 'readFileSync', (file, ...args) => {
  assert.equal(typeof file, 'string', 'Fixture expects literal file reads');
  assert(inside(sandbox, path.resolve(file)), `Read outside fixture: ${file}`);
  const actual = fs.realpathSync(file);
  assert(inside(sandbox, actual), `Resolved read outside fixture: ${file}`);
  reads.push(actual);
  return readFileSync(file, ...args);
});
// Check every write destination; audit files therefore cannot reach runtime ROOT.
for (const key of ['writeFileSync', 'appendFileSync', 'mkdirSync', 'rmSync', 'unlinkSync', 'chmodSync', 'chownSync']) {
  const original = fs[key];
  patch(fs, key, (file, ...args) => {
    if (typeof file !== 'number') assert(inside(sandbox, path.resolve(file)), `Write outside fixture: ${file}`);
    return original(file, ...args);
  });
}
const renameSync = fs.renameSync;
patch(fs, 'renameSync', (from, to) => {
  assert(inside(sandbox, path.resolve(from)) && inside(sandbox, path.resolve(to)));
  return renameSync(from, to);
});
const openSync = fs.openSync;
patch(fs, 'openSync', (file, ...args) => {
  assert(inside(sandbox, path.resolve(file)), `Open outside fixture: ${file}`);
  return openSync(file, ...args);
});

function reset() {
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(registry), { recursive: true });
  fs.mkdirSync(path.join(raw, '2026-07-15'), { recursive: true });
  fs.writeFileSync(registry, '{"generatedAt":"2020-01-01T00:00:00Z","entries":[]}\n');
  reads.length = 0;
}
function fixture({ id = 'DRAFT_2026-07-15_FIXTURE', name = id, fields = {}, markdown = body } = {}) {
  const draft = {
    id, kbName: 'OWA Platform Optima Ontology', kbNamespace: 'OWAOntology',
    title: 'Encja: Konto testowe', createdAt: '2026-07-15T00:00:00Z',
    metadata: { sourceTier: 'ontology', retrievedAt: '2026-07-15T00:00:00Z', verification: 'częściowo-zweryfikowane' },
    ...fields,
  };
  const json = path.join(raw, '2026-07-15', `${name}.json`);
  const md = json.replace(/\.json$/, '.md');
  fs.writeFileSync(json, JSON.stringify(draft));
  if (markdown !== null) fs.writeFileSync(md, markdown);
  return { draft, json, md };
}
function snapshot(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory() ? snapshot(file) : [[path.relative(root, file), fs.readFileSync(file).toString('hex')]];
    });
}
function test(name, run) {
  reset();
  run();
  passed += 1;
  console.log(`PASS ${name}`);
}

try {
  const { promoteDraft, findRawDraftById, resolveOwaPromotionContent } = await import('./lib/promoted_knowledge.mjs');
  function refuse(run, code) {
    const before = [...snapshot(review), ...snapshot(path.join(root, 'data'))];
    assert.throws(run, { code });
    assert.deepEqual([...snapshot(review), ...snapshot(path.join(root, 'data'))], before,
      'Refusal must precede promoted/registry/audit writes');
    assert(!fs.existsSync(path.join(review, 'promoted')));
  }
  test('actual promotion snapshots metadata-only OWA adjacent Markdown', () => {
    const f = fixture();
    const jsonBefore = fs.readFileSync(f.json);
    const mdBefore = fs.readFileSync(f.md);
    const before = Date.now();
    const result = promoteDraft(f.draft.id, { promotedBy: 'fixture', reviewNote: 'legacy fixture' });
    assert.equal(result.promoted.content, body);
    assert.equal(JSON.parse(fs.readFileSync(result.jsonPath, 'utf8')).content, body);
    assert(fs.readFileSync(result.mdPath, 'utf8').includes(body));
    assert.deepEqual(result.promoted.metadata, f.draft.metadata);
    assert.equal(result.promoted.createdAt, f.draft.createdAt);
    assert(Date.parse(result.promoted.promotedAt) >= before);
    assert(Date.parse(result.promoted.promotedAt) <= Date.now());
    assert.equal(result.registryEntry.promotedAt, result.promoted.promotedAt);
    assert.equal(result.registryEntry.reviewNote, 'legacy fixture');
    assert.deepEqual(result.promoted.contentProvenance, {
      method: 'legacy_owa_adjacent_markdown', schemaVersion: 1,
      rawJsonPath: path.relative(root, f.json), rawMarkdownPath: path.relative(root, f.md),
      rawMarkdownSha256: createHash('sha256').update(mdBefore).digest('hex'),
      capturedAt: result.promoted.promotedAt,
    });
    assert.deepEqual(fs.readFileSync(f.json), jsonBefore);
    assert.deepEqual(fs.readFileSync(f.md), mdBefore);
    assert(!Object.hasOwn(findRawDraftById(f.draft.id), 'content'));
    const audit = snapshot(path.join(root, 'data/dashboard/audit'));
    assert.equal(audit.length, 1);
    assert.match(Buffer.from(audit[0][1], 'hex').toString(), /knowledge_draft\.promote/);
  });
  test('helper does not mutate loader result', () => {
    const f = fixture();
    const draft = findRawDraftById(f.draft.id);
    const before = structuredClone(draft);
    assert.equal(resolveOwaPromotionContent(draft).content, body);
    assert.deepEqual(draft, before);
  });
  for (const [id, name] of [
    ['DRAFT_2026-07-15_cbefb9ce', 'draft_2026-07-15_cbefb9ce_dokument-magazynowy'],
    ['DRAFT_2026-07-15_6a2a0f1c', 'draft_2026-07-15_6a2a0f1c_kontrahent'],
  ]) test(`uppercase short ID uses loader pair: ${id}`, () => {
    fixture({ id, name });
    assert.equal(promoteDraft(id).promoted.content, body);
  });
  test('nonempty JSON has byte priority and preserves existing provenance', () => {
    const content = '\uFEFF  JSON\r\n\nczęściowo-zweryfikowane  \n';
    const contentProvenance = { method: 'original', source: 'fixture' };
    const f = fixture({ fields: { content, contentProvenance }, markdown: 'different body' });
    reads.length = 0;
    const result = promoteDraft(f.draft.id);
    assert.equal(result.promoted.content, content);
    assert.deepEqual(result.promoted.contentProvenance, contentProvenance);
    assert(!reads.includes(f.md), 'JSON preference must not read MD');
  });
  test('JSON body needs no raw paths', () => {
    assert.deepEqual(resolveOwaPromotionContent({ kbNamespace: 'OWAOntology', content: ' JSON ' }),
      { content: ' JSON ', provenance: null });
  });
  test('loader paths override untrusted JSON path fields', () => {
    const f = fixture({ fields: { rawJsonPath: '/synthetic/untrusted.json', rawMarkdownPath: '/synthetic/untrusted.md' } });
    assert.equal(promoteDraft(f.draft.id).promoted.content, body);
  });
  test('normal repeat refusal and force registry/timestamp semantics preserved', () => {
    const f = fixture();
    promoteDraft(f.draft.id, { promotedBy: 'first' });
    assert.throws(() => promoteDraft(f.draft.id), /already promoted/);
    const stored = JSON.parse(fs.readFileSync(registry, 'utf8'));
    stored.entries[0].promotedAt = '2020-01-01T00:00:00Z';
    stored.entries[0].custom = 'normal force replaces this entry';
    fs.writeFileSync(registry, JSON.stringify(stored));
    const result = promoteDraft(f.draft.id, { force: true, promotedBy: 'second' });
    assert.equal(result.registryEntry.promotedBy, 'second');
    assert.notEqual(result.registryEntry.promotedAt, '2020-01-01T00:00:00Z');
    assert(!Object.hasOwn(result.registryEntry, 'custom'));
    assert.equal(JSON.parse(fs.readFileSync(registry, 'utf8')).entries.length, 1);
  });
  test('other namespace metadata-only receives no fallback', () => {
    const f = fixture({ fields: { kbNamespace: 'ComarchOptimaBusinessSemantics' } });
    const result = promoteDraft(f.draft.id);
    assert(!Object.hasOwn(result.promoted, 'content'));
    assert(!Object.hasOwn(result.promoted, 'contentProvenance'));
  });
  for (const content of ['', ' \r\n\t', null, 0, false, {}, []]) {
    test(`explicit invalid OWA content refused: ${JSON.stringify(content)}`, () => {
      const f = fixture({ fields: { content } });
      refuse(() => promoteDraft(f.draft.id), 'EXPLICIT_OWA_CONTENT_INVALID');
    });
  }
  for (const [name, markdown] of [['missing', null], ['empty', ''], ['whitespace', ' \r\n'],
    ['invalid UTF-8', Buffer.from([0xc3, 0x28])]]) {
    test(`${name} Markdown refused before writes`, () => {
      const f = fixture({ markdown });
      refuse(() => promoteDraft(f.draft.id), 'LEGACY_OWA_MD_UNAVAILABLE');
    });
  }
  test('BOM and mixed newlines preserved losslessly', () => {
    const markdown = '\uFEFF# Treść\r\n\r\nCONFIRMED\nunchecked\r\n';
    const f = fixture({ markdown });
    const result = promoteDraft(f.draft.id);
    assert(Buffer.from(result.promoted.content).equals(Buffer.from(markdown)));
    assert(fs.readFileSync(result.mdPath, 'utf8').includes(markdown));
  });
  test('exactly 1 MiB accepted', () => {
    const f = fixture({ markdown: 'a'.repeat(1024 * 1024) });
    assert.equal(promoteDraft(f.draft.id).promoted.content.length, 1024 * 1024);
  });
  test('over 1 MiB Markdown refused', () => {
    const f = fixture({ markdown: 'a'.repeat(1024 * 1024 + 1) });
    refuse(() => promoteDraft(f.draft.id), 'UNSAFE_LEGACY_OWA_SOURCE');
  });
  test('Markdown directory refused', () => {
    const f = fixture({ markdown: null });
    fs.mkdirSync(f.md);
    refuse(() => promoteDraft(f.draft.id), 'UNSAFE_LEGACY_OWA_SOURCE');
  });
  for (const kind of ['directory', 'oversized', 'missing']) test(`JSON ${kind} refused`, () => {
    const f = fixture();
    const draft = findRawDraftById(f.draft.id);
    fs.rmSync(f.json);
    if (kind === 'directory') fs.mkdirSync(f.json);
    if (kind === 'oversized') fs.writeFileSync(f.json, ' '.repeat(1024 * 1024 + 1));
    reads.length = 0;
    refuse(() => resolveOwaPromotionContent(draft),
      kind === 'missing' ? 'LEGACY_OWA_MD_UNAVAILABLE' : 'UNSAFE_LEGACY_OWA_SOURCE');
    assert(!reads.includes(f.md));
  });
  for (const [name, mutate] of [
    ['JSON identity drift', (d) => ({ ...d, id: 'different' })],
    ['JSON namespace drift', (d) => ({ ...d, kbNamespace: 'ComarchOptimaSprint' })],
    ['JSON content drift', (d) => ({ ...d, content: 'now present' })],
  ]) test(name, () => {
    const f = fixture();
    const draft = findRawDraftById(f.draft.id);
    fs.writeFileSync(f.json, JSON.stringify(mutate(f.draft)));
    refuse(() => resolveOwaPromotionContent(draft), 'UNSAFE_LEGACY_OWA_SOURCE');
  });
  for (const [name, change] of [
    ['pair mismatch', (d) => { d.rawMarkdownPath = path.join(path.dirname(d.rawMarkdownPath), 'different.md'); }],
    ['traversal', (d) => { d.rawJsonPath = `${raw}/2026-07-15/../2026-07-15/${path.basename(d.rawJsonPath)}`;
      d.rawMarkdownPath = d.rawJsonPath.replace(/\.json$/, '.md'); }],
    ['relative paths', (d) => { d.rawJsonPath = path.relative(root, d.rawJsonPath);
      d.rawMarkdownPath = d.rawJsonPath.replace(/\.json$/, '.md'); }],
    ['non-json suffix', (d) => { d.rawJsonPath = d.rawMarkdownPath; }],
    ['missing paths', (d) => { delete d.rawJsonPath; delete d.rawMarkdownPath; }],
  ]) test(`unsafe source layout: ${name}`, () => {
    const f = fixture();
    const draft = findRawDraftById(f.draft.id);
    change(draft);
    reads.length = 0;
    refuse(() => resolveOwaPromotionContent(draft), 'UNSAFE_LEGACY_OWA_SOURCE');
    assert(!reads.includes(f.md), 'Unsafe source must be rejected before body read');
  });
  for (const kind of ['file escape', 'directory escape', 'inbox escape', 'wrong adjacent symlink']) {
    test(`symlink refused: ${kind}`, () => {
      const f = fixture();
      const draft = findRawDraftById(f.draft.id);
      const outside = path.join(sandbox, `outside-${kind.replaceAll(' ', '-')}`);
      fs.mkdirSync(outside, { recursive: true });
      const outsideMd = path.join(outside, path.basename(f.md));
      fs.writeFileSync(outsideMd, body);
      if (kind === 'file escape') {
        fs.rmSync(f.md);
        fs.symlinkSync(outsideMd, f.md);
      } else if (kind === 'wrong adjacent symlink') {
        const other = path.join(path.dirname(f.md), 'other.md');
        fs.writeFileSync(other, body);
        fs.rmSync(f.md);
        fs.symlinkSync(other, f.md);
      } else {
        fs.writeFileSync(path.join(outside, path.basename(f.json)), JSON.stringify(f.draft));
        const directory = kind === 'inbox escape' ? raw : path.dirname(f.json);
        fs.rmSync(directory, { recursive: true });
        if (kind === 'inbox escape') {
          fs.mkdirSync(path.join(outside, '2026-07-15'));
          fs.renameSync(outsideMd, path.join(outside, '2026-07-15', path.basename(f.md)));
          fs.renameSync(path.join(outside, path.basename(f.json)), path.join(outside, '2026-07-15', path.basename(f.json)));
        }
        fs.symlinkSync(outside, directory);
      }
      reads.length = 0;
      refuse(() => resolveOwaPromotionContent(draft), 'UNSAFE_LEGACY_OWA_SOURCE');
      assert(!reads.some((file) => file.startsWith(outside)), 'Escape source was read');
      if (kind === 'file escape' || kind === 'wrong adjacent symlink') {
        refuse(() => promoteDraft(f.draft.id), 'UNSAFE_LEGACY_OWA_SOURCE');
      }
    });
  }
  test('guards self-test with synthetic targets only', () => {
    assert.throws(() => globalThis.fetch('https://fixture.invalid'), /blocked/);
    assert.throws(() => childProcess.spawn('fixture-denied'), /blocked/);
    assert.throws(() => net.connect(1, '127.0.0.1'), /blocked/);
    assert.throws(() => fs.readFileSync(path.join(sandbox, '..', 'synthetic-denied')), /outside fixture/);
    assert.throws(() => fs.writeFileSync(path.join(sandbox, '..', 'synthetic-denied'), ''), /outside fixture/);
  });
  console.log(`OWA promotion content: ${passed} PASS, 0 FAIL`);
} finally {
  for (const undo of restore.reverse()) undo();
  syncBuiltinESMExports();
  if (oldRoot === undefined) delete process.env.ROOT;
  else process.env.ROOT = oldRoot;
  fs.rmSync(sandbox, { recursive: true, force: true });
  assert(!fs.existsSync(sandbox), 'Fixture cleanup failed');
}
