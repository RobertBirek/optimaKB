import assert from 'node:assert/strict';
import test from 'node:test';
import { assessOwaPromotedCoverage } from './lib/owa_promoted_coverage.mjs';

const ROOT = '/tmp/opencode/owa-coverage-synthetic';
const NAMESPACE = 'OWAOntology';
const SOURCE = 'downloads/knowledge_inbox/2026-01-01/draft_a.md';
const CONTENT = 'Approved invoice content.';

function fixture() {
  return {
    root: ROOT,
    promotedDrafts: [{
      id: 'draft_a', title: 'Invoice A', content: CONTENT,
      kbNamespace: NAMESPACE, status: 'promoted', promotedAt: '2026-01-01',
      sourceUrl: 'https://example.test/invoice',
    }],
    rawDrafts: [{ id: 'draft_a', kbNamespace: NAMESPACE, rawMarkdownPath: `${ROOT}/${SOURCE}` }],
    chunkRows: [{
      id: 'chunk_a', sourceDocumentRefId: 'OWA_ENTITY_INVOICE_A',
      sourcePath: SOURCE, sectionOrder: '1', content: CONTENT,
    }],
  };
}

function revision(input, overrides = {}) {
  input.promotedDrafts.push({ ...input.promotedDrafts[0], id: 'draft_b', promotedAt: '2026-02-01', ...overrides });
  return input;
}

function issue(input, kind, draftIds = input.promotedDrafts.map((draft) => draft.id).sort()) {
  const result = assessOwaPromotedCoverage(input);
  assert.equal(result.coveredCount, 0);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].kind, kind);
  assert.deepEqual(result.issues[0].draftIds, draftIds);
  assert.equal(typeof result.issues[0].title, 'string');
  assert.ok(result.issues[0].reason.trim());
  return result.issues[0];
}

// These tests reject ID/date selection, partial matching, and provenance guessing.
test('equivalent revisions count as one covered group without mutating inputs', () => {
  const input = revision(fixture(), { content: '  Approved  invoice content.\r\n\n\n' });
  const before = structuredClone(input);
  assert.deepEqual(assessOwaPromotedCoverage(input), {
    promotedCount: 2, groupCount: 1, coveredCount: 1, issues: [],
  });
  assert.deepEqual(input, before);
  assert.deepEqual(assessOwaPromotedCoverage({ root: ROOT, promotedDrafts: [], rawDrafts: [], chunkRows: [] }), {
    promotedCount: 0, groupCount: 0, coveredCount: 0, issues: [],
  });
});

for (const content of ['Different.', `${CONTENT} A much longer approved revision.`]) {
  for (const promotedAt of ['2025-01-01', '2027-01-01']) {
    test(`different approved contents are ambiguous, not selected by length/date (${content.length}, ${promotedAt})`, () => {
      const input = revision(fixture(), { content, promotedAt });
      issue(input, 'ambiguous_versions', ['draft_a', 'draft_b']);
      input.promotedDrafts.reverse();
      issue(input, 'ambiguous_versions', ['draft_a', 'draft_b']);
    });
  }
}

test('only exact owner chunks count, not draft IDs or URLs mentioned by a decoy', () => {
  const input = fixture();
  input.chunkRows[0].sourceDocumentRefId = 'OWA_ENTITY_OTHER';
  input.chunkRows[0].content = 'draft_a https://example.test/invoice';
  assert.equal(issue(input, 'missing_chunks').entityId, 'OWA_ENTITY_INVOICE_A');
});

function twoSegments() {
  const input = fixture();
  input.promotedDrafts[0].content = `${'x'.repeat(1800)}\n\nSecond segment.`;
  input.chunkRows[0].content = 'x'.repeat(1800);
  input.chunkRows.push({ ...input.chunkRows[0], id: 'chunk_b', sectionOrder: '2', content: 'Second segment.' });
  return input;
}

test('physical row order is irrelevant but swapping section contents is a mismatch', () => {
  const input = twoSegments();
  input.chunkRows.reverse();
  assert.equal(assessOwaPromotedCoverage(input).coveredCount, 1);
  [input.chunkRows[0].content, input.chunkRows[1].content] = [input.chunkRows[1].content, input.chunkRows[0].content];
  issue(input, 'content_mismatch');
});

test('one changed segment in a complete layout fails exact content coverage', () => {
  const input = twoSegments();
  input.chunkRows[1].content = 'Changed segment.';
  issue(input, 'content_mismatch');
});

for (const [name, change] of [
  ['partial', (rows) => rows.pop()],
  ['duplicate', (rows) => { rows[1].sectionOrder = '1'; }],
  ['extra', (rows) => rows.push({ ...rows[0], id: 'chunk_c', sectionOrder: '3' })],
  ['gap', (rows) => { rows[1].sectionOrder = '3'; }],
  ...['0', '-1', '1.5', 'nope', '', true, null].map((value) => [`order ${JSON.stringify(value)}`, (rows) => { rows[0].sectionOrder = value; }]),
]) {
  test(`rejects invalid chunk layout: ${name}`, () => {
    const input = twoSegments();
    change(input.chunkRows);
    issue(input, 'invalid_chunk_layout');
  });
}

for (const [name, change] of [
  ['mixed paths', (input) => { input.chunkRows[1].sourcePath = 'downloads/knowledge_inbox/another.md'; }],
  ['unapproved raw ID', (input) => { input.rawDrafts[0].id = 'not_approved'; }],
  ['wrong raw namespace', (input) => { input.rawDrafts[0].kbNamespace = 'ComarchOptimaSchema'; }],
  ['missing raw mapping', (input) => { input.rawDrafts = []; }],
  ['missing chunk path', (input) => { input.chunkRows.forEach((row) => { delete row.sourcePath; }); }],
  ['outside root', (input) => {
    input.rawDrafts[0].rawMarkdownPath = '/tmp/opencode/outside.md';
    input.chunkRows.forEach((row) => { row.sourcePath = '/tmp/opencode/outside.md'; });
  }],
  ['outside inbox', (input) => {
    input.rawDrafts[0].rawMarkdownPath = `${ROOT}/docs/draft_a.md`;
    input.chunkRows.forEach((row) => { row.sourcePath = 'docs/draft_a.md'; });
  }],
  ['inbox prefix lookalike', (input) => {
    input.rawDrafts[0].rawMarkdownPath = `${ROOT}/downloads/knowledge_inbox_extra/draft_a.md`;
    input.chunkRows.forEach((row) => { row.sourcePath = 'downloads/knowledge_inbox_extra/draft_a.md'; });
  }],
  ['traversal', (input) => {
    input.rawDrafts[0].rawMarkdownPath = `${ROOT}/downloads/knowledge_inbox/../../../outside.md`;
    input.chunkRows.forEach((row) => { row.sourcePath = input.rawDrafts[0].rawMarkdownPath; });
  }],
]) {
  test(`rejects invalid provenance: ${name}`, () => {
    const input = twoSegments();
    change(input);
    issue(input, 'invalid_provenance');
  });
}

test('accepts a coherent path for either equivalent approved revision, normalized against root', () => {
  const input = revision(twoSegments());
  input.rawDrafts = [{ id: 'draft_b', kbNamespace: NAMESPACE, rawMarkdownPath: 'downloads/knowledge_inbox/2026-02-01/draft_b.md' }];
  input.chunkRows[0].sourcePath = `${ROOT}/${input.rawDrafts[0].rawMarkdownPath}`;
  input.chunkRows[1].sourcePath = input.rawDrafts[0].rawMarkdownPath;
  assert.equal(assessOwaPromotedCoverage(input).coveredCount, 1);
});

for (const [field, value] of [['content', ' \r\n '], ['title', '  '], ['id', ''], ['content', null], ['title', 12], ['id', null]]) {
  test(`invalid ${field} ${JSON.stringify(value)} is not silently skipped`, () => {
    const input = revision(fixture(), { [field]: value });
    // Invalid title creates its own group; an invalid revision must still fail.
    const result = assessOwaPromotedCoverage(input);
    assert.equal(result.issues.length, 1);
    assert.equal(result.issues[0].kind, 'invalid_draft');
  });
}

test('different expected owner IDs in the same normalized title group fail identity', () => {
  const input = revision(fixture(), { title: 'Invoice&A' });
  issue(input, 'ambiguous_identity');
});

test('owner collision across distinct title groups fails both groups', () => {
  const input = revision(fixture(), { title: 'Café' });
  input.promotedDrafts[0].title = 'Cafe';
  const result = assessOwaPromotedCoverage(input);
  assert.equal(result.groupCount, 2);
  assert.equal(result.coveredCount, 0);
  assert.deepEqual(result.issues.map((item) => [item.kind, item.entityId]), [
    ['ambiguous_identity', 'OWA_ENTITY_CAFE'], ['ambiguous_identity', 'OWA_ENTITY_CAFE'],
  ]);
});

test('apostrophes, backticks, multiline and oversized paragraphs retain every segment/token', () => {
  const input = fixture();
  const first = "Customer's `literal` code\nSecond line.";
  input.promotedDrafts[0].content = `${first}\n\n${'L'.repeat(1801)}\n\nFinal paragraph.`;
  const segments = [first, 'L'.repeat(1800), 'L', 'Final paragraph.'];
  input.chunkRows = segments.map((content, index) => ({
    ...input.chunkRows[0], id: `chunk_${index}`, sectionOrder: String(index + 1), content,
  }));
  assert.equal(assessOwaPromotedCoverage(input).coveredCount, 1);
  input.chunkRows[0].content = first.replace('literal', 'changed');
  issue(input, 'content_mismatch');
});

test('primary issue precedence is conservative and deterministic under input permutations', () => {
  const input = revision(fixture(), { content: 'Different approved content.', title: 'Invoice&A' });
  input.chunkRows = [];
  input.rawDrafts = [];
  issue(input, 'ambiguous_versions');
  input.promotedDrafts[1].content = '';
  issue(input, 'invalid_draft');
  input.promotedDrafts[1].content = CONTENT;
  issue(input, 'ambiguous_identity');
  input.promotedDrafts[1].title = 'Invoice A';
  issue(input, 'missing_chunks');
  const secondGroup = { ...input.promotedDrafts[0], id: 'z', title: 'Another entity', content: '' };
  input.promotedDrafts.push(secondGroup, { ...secondGroup, id: 'a' });
  const before = structuredClone(input);
  const result = assessOwaPromotedCoverage(input);
  assert.deepEqual(result.issues.map((item) => [item.title, item.draftIds]), [
    ['Another entity', ['a', 'z']], ['Invoice A', ['draft_a', 'draft_b']],
  ]);
  for (const records of [input.promotedDrafts, input.rawDrafts, input.chunkRows]) records.reverse();
  assert.deepEqual(assessOwaPromotedCoverage(input), result);
  assert.deepEqual(before.promotedDrafts, [...input.promotedDrafts].reverse());
  const layout = twoSegments();
  layout.chunkRows[0].content = 'changed';
  layout.chunkRows[0].sourcePath = '';
  layout.chunkRows[1].sectionOrder = '1';
  issue(layout, 'invalid_chunk_layout');
  layout.chunkRows[1].sectionOrder = '2';
  issue(layout, 'content_mismatch');
});
