#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'answer-citations-'));
process.env.ROOT = root;
process.env.EXA_AUTO_DRAFT = '0';
process.env.ENABLE_LIVE_LEARNING = '0';
delete process.env.EXA_API_KEY;
delete process.env.EXA_MCP_COMMAND;
let networkAttempts = 0;
globalThis.fetch = async () => { networkAttempts++; throw new Error('Network forbidden'); };
const checks = [];
function check(name, run) {
  try { run(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', message: error.message }); }
}
const kb = 'TaxbellLegalReference';
const base = `docs/reference/knowledge_inbox/promoted/${kb}`;
const url = 'https://example.test/book.pdf?version=2026%2F02&chapter=1&long=' + 'x'.repeat(900);
const source = { recordId: 'CHUNK_FIXTURE', title: 'Poradnik', sourceUrl: url,
  owningPath: `${base}/draft_fixture.md`, sourceDocumentRefId: 'DOC_CANONICAL',
  csvDates: { publishedAt: '2026-10-13T12:00:00Z' } };
const draft = { id: 'draft_fixture', status: 'promoted', kbNamespace: kb, sourceUrl: url,
  promotedAt: '2026-10-13T12:00:00Z', secret: 'NEVER_PUBLIC', metadata: {
    sourcePublicationDate: '2025-12', sourceUpdatedAt: '2026-02-27T18:03:45+01:00',
    sourceRetrievedAt: '2026-03-01T09:00:00Z' } };
fs.mkdirSync(path.join(root, base), { recursive: true });
const write = (id, value) => fs.writeFileSync(path.join(root, base, `${id}.json`), JSON.stringify(value));
write('draft_fixture', draft);
try {
  const api = await import(process.env.TASK2_ANSWER_MODULE || './erp_knowledge_answer.mjs');
  const resolve = (s = source, allowed = new Set([kb])) => api.resolveSourceMetadata(s, kb, allowed, root);
  check('Owning metadata wins over CSV promotion and canonical document', () => {
    write('DOC_CANONICAL', { ...draft, id: 'DOC_CANONICAL', metadata: { sourcePublicationDate: '1999-01-01' } });
    const meta = resolve();
    assert.deepEqual(meta.publication, { value: '2025-12', precision: 'month', timezone: null,
      basis: 'promoted_source_metadata', reason: null });
    assert.equal(meta.owningDraftId, 'draft_fixture');
    assert.equal(meta.update.timezone, '+01:00');
    assert.equal(meta.retrieved.value, '2026-03-01T09:00:00Z');
    assert(!JSON.stringify(meta).includes('NEVER_PUBLIC'));
  });
  check('Calendar and time validation preserves precision and unspecified timezone', () => {
    for (const value of ['2025-13', '2025-00', '2025-02-29', '2026-04-31', '0000-01',
      '2026-02-27T24:00', '2026-02-27T18:60', '2026-02-27T18:03:60Z',
      '2026-02-27T18:03+24:00', '2026-02-27T18:03+01:60', 'junk']) {
      assert.equal(api.sourceDate(value, 'fixture').reason, 'invalid_source_date', value);
    }
    for (const value of ['2024-02-29', '2000-02-29', '2026-02', '2026-02-27T18:03',
      '2026-02-27T18:03:45.123Z', '2026-02-27T18:03-05:30']) {
      assert.equal(api.sourceDate(value, 'fixture').value, value);
    }
    assert.equal(api.sourceDate('1900-02-29', 'fixture').value, null);
    assert.equal(api.sourceDate('2026-02-27T18:03', 'fixture').timezone, 'unspecified');
    assert.equal(api.sourceDate(null, 'unresolved').reason, 'source_date_unavailable');
  });
  check('Ordinary explicit origin accepts CSV; missing/promoted origins never assume publication', () => {
    const ordinary = { ...source, owningPath: 'ordinary/source.md', sourceOrigin: 'official' };
    assert.equal(resolve(ordinary).publication.basis, 'declared_csv_source_date');
    assert.equal(resolve(ordinary).publication.value, source.csvDates.publishedAt);
    for (const sourceOrigin of [null, 'promoted_knowledge_draft', 'unknown']) {
      assert.equal(resolve({ ...ordinary, sourceOrigin }).publication.value, null);
    }
    assert.equal(resolve({ ...ordinary, sourceOrigin: 'official', owningPath: `${base}/missing.md` }).publication.value, null);
  });
  check('Wrong identity URL namespace status and ID fail closed', () => {
    for (const changed of [{ id: 'wrong' }, { sourceUrl: url + '&different' },
      { kbNamespace: 'Foreign' }, { status: 'draft' }]) {
      write('draft_fixture', { ...draft, ...changed });
      assert.equal(resolve().dateResolutionReason, 'metadata_identity_mismatch');
      assert.equal(resolve().publication.value, null);
    }
    write('draft_fixture', draft);
  });
  check('Disallowed scope and adversarial paths perform no file reads', () => {
    const read = fs.readFileSync;
    let reads = 0;
    fs.readFileSync = (...args) => { reads++; return read(...args); };
    try {
      assert.equal(resolve(source, new Set()).dateResolutionReason, 'metadata_path_rejected');
      for (const owningPath of [`${base}/../draft_fixture.md`, `${base}/./draft_fixture.md`,
        `${base}/draft_fixture.txt`, `${base}/nested/draft_fixture.md`,
        '/etc/passwd', 'data/private.json', base.replace(kb, 'Foreign') + '/draft_fixture.md',
        `${base}\\draft_fixture.md`]) {
        assert.equal(resolve({ ...source, owningPath }).dateResolutionReason, 'metadata_path_rejected');
      }
      assert.equal(reads, 0);
    } finally { fs.readFileSync = read; }
  });
  check('File and namespace symlink escapes rejected before reading content', () => {
    fs.writeFileSync(path.join(root, 'outside.json'), JSON.stringify(draft));
    fs.symlinkSync(path.join(root, 'outside.json'), path.join(root, base, 'escape.json'));
    const read = fs.readFileSync;
    let reads = 0;
    fs.readFileSync = (...args) => { reads++; return read(...args); };
    try {
      assert.equal(resolve({ ...source, owningPath: `${base}/escape.md` }).dateResolutionReason, 'metadata_path_rejected');
      fs.mkdirSync(path.join(root, 'outside'));
      fs.symlinkSync(path.join(root, 'outside'), path.join(root, 'docs/reference/knowledge_inbox/promoted/Foreign'));
      assert.equal(api.resolveSourceMetadata({ ...source, owningPath: 'docs/reference/knowledge_inbox/promoted/Foreign/draft_fixture.md' },
        'Foreign', new Set(['Foreign']), root).dateResolutionReason, 'metadata_path_rejected');
      assert.equal(reads, 0);
    } finally { fs.readFileSync = read; }
  });
  check('Oversized JSON rejected and missing metadata never uses promotion time; cache request-local', () => {
    write('large', { ...draft, id: 'large', extra: 'x'.repeat(1024 * 1024) });
    assert.equal(resolve({ ...source, owningPath: `${base}/large.md` }).dateResolutionReason, 'metadata_path_rejected');
    write('draft_fixture', { ...draft, metadata: {} });
    assert.equal(resolve().publication.value, null);
    assert.equal(resolve().dateResolutionReason, 'source_date_unavailable');
    write('draft_fixture', draft);
    assert.equal(resolve().publication.value, '2025-12');
  });
  check('Full URL and distinct date citations outside preview; no arbitrary metadata exposed', () => {
    const response = { primaryKb: { name: kb, artifacts: [] }, supportKbs: [] };
    const answer = api.buildPragmaticAnswer('Stawki', response, [{ kb, artifact: 'fixture.csv', contentHash: 'sha256:fixture',
      hits: [{ line: 2, endLine: 3, score: 10, snippet: 'Preview', bodyField: 'content', bodyText: 'Stawki są warunkowe.', source }] }]);
    const md = api.renderAnswerMarkdown(answer);
    assert(md.includes(url));
    for (const value of ['2025-12', '2026-02-27T18:03:45+01:00', '2026-03-01T09:00:00Z']) assert(md.includes(value));
    assert(!JSON.stringify(answer).includes('NEVER_PUBLIC'));
    assert(!md.includes('2026-10-13T12:00:00Z'));
    assert(md.includes('Confidence oznacza'));
    assert(md.includes('bez wykonania grafu'));
  });
  check('Unknown dates explicitly rendered with reason and basis', () => {
    const response = { primaryKb: { name: kb, artifacts: [] }, supportKbs: [] };
    const answer = api.buildPragmaticAnswer('Stawki', response, [{ kb, artifact: 'fixture.csv', hits: [{
      line: 2, score: 10, snippet: 'Stawki', bodyField: 'content', bodyText: 'Stawki.',
      source: { ...source, owningPath: null, csvDates: {} } }] }]);
    assert.equal(answer.sources[0].publication.value, null);
    assert.match(api.renderAnswerMarkdown(answer), /nieznana.*source_date_unavailable/);
  });
  check('Cache is per owning metadata read within one assembly', () => {
    const item = { kb, artifact: 'fixture.csv', hits: [1, 2].map(id => ({ line: id + 1, score: 10,
      bodyField: 'content', bodyText: `Sekcja ${id}.`, source: { ...source, recordId: `CHUNK_${id}` } })) };
    const read = fs.readFileSync;
    let reads = 0;
    fs.readFileSync = (...args) => { reads++; return read(...args); };
    try {
      const first = api.assembleSourceExtracts('Sekcja', [item], new Set([kb]), root);
      assert.equal(reads, 1);
      write('draft_fixture', { ...draft, metadata: { sourcePublicationDate: '2026-04' } });
      const second = api.assembleSourceExtracts('Sekcja', [item], new Set([kb]), root);
      assert.equal(reads, 2);
      assert.equal(first.sources[0].publication.value, '2025-12');
      assert.equal(second.sources[0].publication.value, '2026-04');
    }
    finally { fs.readFileSync = read; }
    write('draft_fixture', draft);
  });
  check('Validated owner dates group chunks despite CSV promotion times and field order; dates separate actual versions', () => {
    const make = (s, text) => ({ kb, artifact: 'fixture.csv', hits: [{ line: 2, score: 10,
      bodyField: 'content', bodyText: text, source: s }] });
    const first = make(source, 'Pierwszy warunek.');
    const second = make({ ...source, recordId: 'CHUNK_SECOND', csvDates: { retrievedAt: null,
      publishedAt: '2026-10-14T12:00:00Z', lastModified: null } }, 'Drugi warunek.');
    const grouped = api.assembleSourceExtracts('warunek', [first, second], new Set([kb]), root);
    assert.equal(grouped.sources.length, 1);
    assert.deepEqual(grouped.sources[0].recordIds, ['CHUNK_FIXTURE', 'CHUNK_SECOND']);
    assert.equal(grouped.extracts.length, 2);
    const ordinary = { ...source, sourceOrigin: 'official', owningPath: 'ordinary/source.md',
      csvDates: { publishedAt: '2025-12', lastModified: '2026-02', retrievedAt: null } };
    const reordered = { ...ordinary, csvDates: { retrievedAt: null, lastModified: '2026-02', publishedAt: '2025-12' } };
    assert.equal(api.assembleSourceExtracts('warunek', [make(ordinary, 'A'), make(reordered, 'B')], new Set([kb]), root).sources.length, 1);
    assert.equal(api.assembleSourceExtracts('warunek', [make(ordinary, 'A'), make({ ...ordinary,
      csvDates: { ...ordinary.csvDates, lastModified: '2026-03' } }, 'B')], new Set([kb]), root).sources.length, 2);
  });
  check('Promoted base cannot escape ROOT', () => {
    const alternate = path.join(root, 'alternate');
    fs.mkdirSync(path.join(alternate, 'docs/reference/knowledge_inbox'), { recursive: true });
    fs.symlinkSync(path.join(root, 'docs/reference/knowledge_inbox/promoted'),
      path.join(alternate, 'docs/reference/knowledge_inbox/promoted'));
    assert.equal(api.resolveSourceMetadata(source, kb, new Set([kb]), alternate).dateResolutionReason, 'metadata_path_rejected');
  });
  check('Zero network and no learning/draft writes', () => {
    assert.equal(networkAttempts, 0);
    assert.equal(fs.existsSync(path.join(root, 'downloads')), false);
  });
} finally { fs.rmSync(root, { recursive: true, force: true }); }
const failed = checks.filter(c => c.status === 'FAIL').length;
console.log(JSON.stringify({ passed: checks.length - failed, failed, checks }, null, 2));
if (failed) process.exitCode = 1;
