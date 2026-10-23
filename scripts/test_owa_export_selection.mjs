import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { selectOwaExportDrafts } from './lib/owa_export_selection.mjs';

// All metadata is synthetic. No raw/snapshot files, CLI, services or network reads.
const ROOT = fs.mkdtempSync('/tmp/opencode/owa-export-selection-');
const NAMESPACE = 'OWAOntology';
const CONTENT = 'Approved invoice content.';
const INBOX = 'downloads/knowledge_inbox/2026-01-01';
const PROMOTED = 'docs/reference/knowledge_inbox/promoted/OWAOntology';

function addDraft(input, overrides = {}) {
  const id = overrides.id ?? 'draft_a';
  const draft = {
    id, title: 'Invoice A', content: CONTENT, kbNamespace: NAMESPACE,
    status: 'promoted', promotedAt: '2026-01-01',
    sourceDraftPath: `${INBOX}/${id}.json`,
    promotedJsonPath: `${PROMOTED}/${id}.json`,
    promotedMarkdownPath: `${PROMOTED}/${id}.md`,
    ...overrides,
  };
  input.promotedDrafts.push(draft);
  input.registryEntries.push({
    draftId: id, title: draft.title, status: draft.status, kbNamespace: draft.kbNamespace,
    rawJsonPath: draft.sourceDraftPath,
    promotedJsonPath: draft.promotedJsonPath, promotedMarkdownPath: draft.promotedMarkdownPath,
  });
  input.rawDrafts.push({
    id, kbNamespace: draft.kbNamespace, rawJsonPath: `${ROOT}/${INBOX}/${id}.json`,
    rawMarkdownPath: `${ROOT}/${INBOX}/${id}.md`, content: 'Unapproved raw text.',
  });
  return draft;
}

function fixture() {
  const input = { root: ROOT, promotedDrafts: [], registryEntries: [], rawDrafts: [] };
  addDraft(input);
  return input;
}

function refused(input, kind) {
  const result = selectOwaExportDrafts(input);
  assert.deepEqual(result.drafts, [], 'Any issue must refuse the entire selection');
  assert.ok(result.issues.some((item) => item.kind === kind), JSON.stringify(result.issues));
  for (const item of result.issues) {
    assert.equal(typeof item.title, 'string');
    assert.ok(Array.isArray(item.draftIds));
    assert.ok(item.reason.trim());
  }
  return result;
}

test('approved snapshot is authoritative and inputs are not mutated', () => {
  const input = fixture();
  const before = structuredClone(input);
  const result = selectOwaExportDrafts(input);
  assert.deepEqual(result, {
    drafts: [{ ...before.promotedDrafts[0], rawMarkdownPath: `${ROOT}/${INBOX}/draft_a.md`,
      equivalentDraftIds: ['draft_a'] }], issues: [],
  });
  assert.deepEqual(input, before);
});

test('withdrawn, pending and unregistered longer raw drafts never qualify or fill fields', () => {
  const input = fixture();
  for (const [id, status] of [['withdrawn', 'withdrawn'], ['pending', 'pending'], ['unregistered', null]]) {
    input.rawDrafts.push({ ...input.rawDrafts[0], id, title: 'Invoice A',
      content: CONTENT.repeat(100), aliases: ['old alias'], confidence: 'high', status,
      rawMarkdownPath: `${ROOT}/${INBOX}/${id}.md` });
    if (status) input.registryEntries.push({ draftId: id, kbNamespace: NAMESPACE, status });
  }
  const result = selectOwaExportDrafts(input);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.drafts.map((draft) => draft.id), ['draft_a']);
  assert.equal(result.drafts[0].content, CONTENT);
  assert.equal(result.drafts[0].aliases, undefined);
  assert.equal(result.drafts[0].confidence, undefined);
});

test('raw content is never even inspected', () => {
  const input = fixture();
  Object.defineProperty(input.rawDrafts[0], 'content', { get() { throw new Error('raw content read'); } });
  assert.equal(selectOwaExportDrafts(input).drafts[0].content, CONTENT);
});

test('equivalent full segments choose lexical ID, keep snapshot text and sorted equivalent IDs', () => {
  const input = fixture();
  addDraft(input, { id: 'draft_Z', title: 'INVOICE A', content: '  Approved  invoice content.\r\n\n\n',
    promotedAt: '2025-01-01' });
  addDraft(input, { id: 'draft_z', promotedAt: '2027-01-01' });
  const before = structuredClone(input);
  const result = selectOwaExportDrafts(input);
  assert.deepEqual(result.issues, []);
  assert.equal(result.drafts.length, 1);
  assert.equal(result.drafts[0].id, 'draft_Z');
  assert.equal(result.drafts[0].content, '  Approved  invoice content.\r\n\n\n');
  assert.equal(result.drafts[0].rawMarkdownPath, `${ROOT}/${INBOX}/draft_Z.md`);
  assert.deepEqual(result.drafts[0].equivalentDraftIds, ['draft_Z', 'draft_a', 'draft_z']);
  for (const records of [input.promotedDrafts, input.registryEntries, input.rawDrafts]) records.reverse();
  assert.deepEqual(selectOwaExportDrafts(input), result);
  assert.deepEqual(before.promotedDrafts, [...input.promotedDrafts].reverse());
});

test('final selection uses Polish title ordering, not input order', () => {
  const input = fixture();
  addDraft(input, { id: 'z', title: 'Żaba' });
  addDraft(input, { id: 'l', title: 'Łódź' });
  addDraft(input, { id: 'a', title: 'Ala' });
  addDraft(input, { id: 'za', title: 'Zebra' });
  const result = selectOwaExportDrafts(input);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.drafts.map((draft) => draft.id), ['a', 'draft_a', 'l', 'za', 'z']);
});

for (const [name, first, second] of [
  ['different text', CONTENT, `${CONTENT} Longer revision.`],
  ['changed late segment', `${'x'.repeat(1800)}\n\nLast segment.`, `${'x'.repeat(1800)}\n\nChanged segment.`],
  ['extra late segment', `${'x'.repeat(1800)}\n\nLast segment.`, `${'x'.repeat(1800)}\n\nLast segment.\n\n${'y'.repeat(1800)}`],
  ['reordered segments', `${'x'.repeat(1800)}\n\n${'y'.repeat(1800)}`, `${'y'.repeat(1800)}\n\n${'x'.repeat(1800)}`],
]) {
  test(`different full segment sequences refuse: ${name}`, () => {
    const input = fixture();
    input.promotedDrafts[0].content = first;
    addDraft(input, { id: 'draft_b', content: second, promotedAt: '2027-01-01' });
    const result = refused(input, 'ambiguous_versions');
    assert.deepEqual(result.issues[0].draftIds, ['draft_a', 'draft_b']);
  });
}

for (const [first, second] of [['Invoice A', 'Invoice&A'], ['Cafe', 'Café']]) {
  test(`ambiguous entity ownership refuses: ${first} / ${second}`, () => {
    const input = fixture();
    input.promotedDrafts[0].title = first;
    addDraft(input, { id: 'draft_b', title: second });
    refused(input, 'ambiguous_identity');
  });
}

for (const [field, value] of [
  ['id', ''], ['id', '  '], ['id', null], ['id', 12],
  ['title', ''], ['title', '  '], ['title', null], ['title', 12], ['title', '!!!'],
  ['content', ''], ['content', ' \r\n '], ['content', null], ['content', 12],
  ['kbNamespace', ''], ['kbNamespace', null], ['kbNamespace', 12], ['kbNamespace', 'ComarchOptimaReference'],
]) {
  test(`invalid snapshot ${field} ${JSON.stringify(value)} refuses without raw fallback`, () => {
    const input = fixture();
    input.promotedDrafts[0][field] = value;
    refused(input, 'invalid_draft');
  });
}

for (const records of ['promotedDrafts', 'registryEntries', 'rawDrafts']) {
  test(`duplicate ID in ${records} refuses even for identical records`, () => {
    const input = fixture();
    input[records].push({ ...input[records][0] });
    refused(input, 'ambiguous_identity');
  });
}

test('an active registry entry without a snapshot refuses the whole otherwise valid corpus', () => {
  const input = fixture();
  addDraft(input, { id: 'draft_b', title: 'Other invoice' });
  input.promotedDrafts.pop();
  refused(input, 'invalid_registry');
});

test('an unregistered snapshot refuses', () => {
  const input = fixture();
  input.registryEntries = [];
  refused(input, 'invalid_registry');
});

for (const [record, field, value] of [
  ['registryEntries', 'status', 'withdrawn'], ['registryEntries', 'status', 'pending'],
  ['registryEntries', 'status', undefined], ['promotedDrafts', 'status', 'withdrawn'],
  ['promotedDrafts', 'status', undefined], ['registryEntries', 'draftId', 'wrong_id'],
  ['registryEntries', 'kbNamespace', 'ComarchOptimaReference'], ['registryEntries', 'kbNamespace', ''],
  ['registryEntries', 'promotedJsonPath', `${PROMOTED}/wrong.json`],
  ['registryEntries', 'promotedMarkdownPath', `${PROMOTED}/wrong.md`],
  ['registryEntries', 'promotedJsonPath', ''], ['registryEntries', 'promotedMarkdownPath', undefined],
  ['promotedDrafts', 'promotedJsonPath', undefined], ['promotedDrafts', 'promotedMarkdownPath', ''],
]) {
  test(`registry/snapshot disagreement refuses: ${record}.${field} ${JSON.stringify(value)}`, () => {
    const input = fixture();
    input[record][0][field] = value;
    refused(input, 'invalid_registry');
  });
}

test('absolute and relative snapshot/raw paths agree after lexical resolution', () => {
  const input = fixture();
  input.registryEntries[0].promotedJsonPath = `${ROOT}/${PROMOTED}/./draft_a.json`;
  input.registryEntries[0].promotedMarkdownPath = `${ROOT}/${PROMOTED}/draft_a.md`;
  input.rawDrafts[0].rawJsonPath = `${INBOX}/draft_a.json`;
  input.rawDrafts[0].rawMarkdownPath = `${INBOX}/./draft_a.md`;
  const result = selectOwaExportDrafts(input);
  assert.deepEqual(result.issues, []);
  assert.equal(result.drafts[0].rawMarkdownPath, `${ROOT}/${INBOX}/draft_a.md`);
});

for (const [name, change] of [
  ['missing raw', (input) => { input.rawDrafts = []; }],
  ['unapproved raw ID', (input) => { input.rawDrafts[0].id = 'other'; }],
  ['wrong namespace', (input) => { input.rawDrafts[0].kbNamespace = 'ComarchOptimaReference'; }],
  ['missing markdown', (input) => { delete input.rawDrafts[0].rawMarkdownPath; }],
  ['missing JSON', (input) => { delete input.rawDrafts[0].rawJsonPath; }],
  ['different registry raw path', (input) => { input.registryEntries[0].rawJsonPath = `${INBOX}/other.json`; }],
  ['different snapshot source', (input) => { input.promotedDrafts[0].sourceDraftPath = `${INBOX}/other.json`; }],
  ['mismatched raw pair', (input) => { input.rawDrafts[0].rawMarkdownPath = `${INBOX}/other.md`; }],
]) {
  test(`invalid raw provenance refuses: ${name}`, () => {
    const input = fixture();
    change(input);
    refused(input, 'invalid_provenance');
  });
}

for (const escaped of [
  '/tmp/opencode/outside.md', 'docs/draft_a.md', 'downloads/knowledge_inbox_extra/draft_a.md',
  'downloads/knowledge_inbox/../../../outside.md', 'downloads/knowledge_inbox', '', null, 12, 'bad\0path',
]) {
  test(`raw Markdown outside inbox or invalid refuses: ${JSON.stringify(escaped)}`, () => {
    const input = fixture();
    input.rawDrafts[0].rawMarkdownPath = escaped;
    refused(input, 'invalid_provenance');
  });
}

for (const field of ['promotedJsonPath', 'promotedMarkdownPath']) {
  test(`matching but escaped ${field} refuses`, () => {
    const input = fixture();
    input.promotedDrafts[0][field] = '/tmp/opencode/escaped-snapshot';
    input.registryEntries[0][field] = '/tmp/opencode/escaped-snapshot';
    refused(input, 'invalid_registry');
  });
}

test('invalid provenance on an equivalent revision cannot be hidden by lexical selection', () => {
  const input = fixture();
  addDraft(input, { id: 'draft_b' });
  input.rawDrafts.pop();
  refused(input, 'invalid_provenance');
});

test('an empty approved corpus refuses rather than returning a successful empty export', () => {
  refused({ root: ROOT, promotedDrafts: [], registryEntries: [], rawDrafts: [] }, 'empty_approved_corpus');
});

test('unrelated namespaces do not taint valid OWA qualification', () => {
  const input = fixture();
  // These are deliberately incomplete and duplicated, but not OWA identities.
  input.promotedDrafts.push({ id: 'other', kbNamespace: 'ComarchOptimaReference' });
  input.registryEntries.push({ draftId: 'other', kbNamespace: 'ComarchOptimaReference', status: 'promoted' },
    { draftId: 'other', kbNamespace: 'ComarchOptimaReference', status: 'pending' });
  input.rawDrafts.push({ id: 'other', kbNamespace: 'ComarchOptimaReference' },
    { id: 'other', kbNamespace: 'ComarchOptimaReference' });
  assert.deepEqual(selectOwaExportDrafts(input), selectOwaExportDrafts(fixture()));
});

test('an OWA snapshot path cannot conceal namespace drift on both records', () => {
  const input = fixture();
  input.promotedDrafts[0].kbNamespace = 'ComarchOptimaReference';
  input.registryEntries[0].kbNamespace = 'ComarchOptimaReference';
  refused(input, 'invalid_draft');
});

test('a cross-namespace duplicate of an OWA ID still refuses', () => {
  const input = fixture();
  input.registryEntries.push({ ...input.registryEntries[0], kbNamespace: 'ComarchOptimaReference' });
  refused(input, 'ambiguous_identity');
});

test('multiple issues are deterministic under all input permutations', () => {
  const input = fixture();
  addDraft(input, { id: 'draft_b', content: 'Conflicting version.' });
  addDraft(input, { id: 'bad', title: 'Another invoice', content: '' });
  const result = refused(input, 'ambiguous_versions');
  assert.ok(result.issues.some((item) => item.kind === 'invalid_draft'));
  for (const records of [input.promotedDrafts, input.registryEntries, input.rawDrafts]) records.reverse();
  assert.deepEqual(selectOwaExportDrafts(input), result);
});

test('invalid root refuses with structured issues instead of throwing', () => {
  const input = fixture();
  input.root = null;
  refused(input, 'invalid_provenance');
});
