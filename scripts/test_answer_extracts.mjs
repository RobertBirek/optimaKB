#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'answer-extracts-'));
process.env.ROOT = root;
process.env.EXA_AUTO_DRAFT = '0';
process.env.ENABLE_LIVE_LEARNING = '0';
delete process.env.EXA_API_KEY;
delete process.env.EXA_MCP_COMMAND;
let networkAttempts = 0;
globalThis.fetch = async () => { networkAttempts++; throw new Error('Network forbidden'); };
const kb = 'TaxbellLegalReference';
const response = { primaryKb: { name: kb, artifacts: [] }, supportKbs: [] };
const checks = [];
function check(name, run) {
  try { run(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', message: error.message }); }
}
function source(version = 'one') {
  return { recordId: version, title: 'Przykład', sourceUrl: 'https://example.test/source',
    owningPath: `ordinary/${version}.md`, sourceOrigin: 'official', sourceDocumentRefId: 'SHARED_CANONICAL',
    csvDates: { publishedAt: version === 'two' ? '2026-02' : '2025-12' } };
}
function evidence(body, version = 'one', score = 10) {
  return { kb, artifact: 'fixture/chunk.csv', contentHash: 'sha256:fixture', uri: 'knowledge://legacy/fixture', locator: 'L2-L3',
    hits: [{ line: 2, endLine: 3, score, snippet: 'Metadata preview deliberately has no requested facts.',
      matchedTerms: [], bodyField: 'content', bodyText: body, bodyDisplayText: body, source: source(version) }] };
}
try {
  const api = await import(process.env.TASK2_ANSWER_MODULE || './erp_knowledge_answer.mjs');
  const { findTermIndex } = await import('./lib/knowledge_retrieval.mjs');
  check('Requested dotted version survives term extraction', () => {
    assert(api.extractTerms('Katalog interfejsu 5.6.0').includes('5.6.0'));
  });
  check('Dotted version is bounded against different versions and identifiers', () => {
    for (const text of ['15.6.0', '5.6.00', '5.6.0.1', 'x5.6.0', '5.6.0x'])
      assert.equal(findTermIndex(text, '5.6.0'), -1, text);
    assert.equal(findTermIndex('version 5.6.0.', '5.6.0'), 8);
  });
  check('Source competition rewards substantive coverage across complete units', () => {
    const result = api.assembleSourceExtracts('alpha beta gamma delta', [
      evidence('## First\nalpha beta', 'two', 100),
      evidence('## Other\nalpha gamma', 'three', 90),
      evidence('## A\nalpha\n\n## B\nbeta\n\n## C\ngamma delta', 'one', 1)]);
    assert.equal(result.sources[0].owningPath, 'ordinary/one.md');
  });
  check('Exact requested version outweighs competing generic and longer-version catalogs', () => {
    const result = api.assembleSourceExtracts('alpha beta gamma delta 5.6.0', [
      evidence('alpha beta gamma delta 15.6.0', 'two', 100),
      evidence('alpha beta gamma delta 5.1.0', 'three', 90),
      evidence('alpha 5.6.0', 'one', 1)]);
    assert.equal(result.sources[0].owningPath, 'ordinary/one.md');
  });
  const fullPrefix = '## Report\nalpha beta gamma. Only conditionally; not confirmed.';
  const prefixSummary = '## Report\nalpha  beta gamma...';
  function summaryItem(text = prefixSummary, version = 'one') {
    const item = evidence(text, version);
    item.hits[0].bodyField = 'summary';
    return item;
  }
  check('Same-owner exact leading summary prefix cannot displace unique third section', () => {
    const third = '## Reply\nUnique permissions clause.';
    const result = api.assembleSourceExtracts('alpha beta gamma', [summaryItem(),
      evidence(`${fullPrefix}\n\n## Outcome\nalpha beta gamma not diagnosed.\n\n${third}`)]);
    assert.equal(result.extracts.length, 3);
    assert(result.extracts.some(e => e.text === third));
    assert(!result.extracts.some(e => e.bodyField === 'summary'));
  });
  check('Distinct-owner summary prefix is retained even at the same URL', () => {
    const result = api.assembleSourceExtracts('alpha', [summaryItem(prefixSummary, 'two'), evidence(fullPrefix)]);
    assert(result.extracts.some(e => e.bodyField === 'summary'));
    assert.equal(result.sources.length, 2);
  });
  check('Changed version and unique summary clauses are never suppressed', () => {
    const changed = summaryItem();
    changed.hits[0].source.csvDates.publishedAt = '2026-04';
    assert(api.assembleSourceExtracts('alpha', [changed, evidence(fullPrefix)]).extracts.some(e => e.bodyField === 'summary'));
    const unique = summaryItem('## Report\nalpha beta gamma. Separate exception.');
    assert(api.assembleSourceExtracts('alpha', [unique, evidence(fullPrefix)]).extracts.some(e => e.bodyField === 'summary'));
  });
  check('Oversized full conditional content omits dominated summary without claim leakage', () => {
    const result = api.assembleSourceExtracts('alpha beta gamma', [summaryItem(),
      evidence(fullPrefix + 'x'.repeat(4100) + ' Final restrictive condition.')]);
    assert.deepEqual(result.extracts, []);
    assert(result.omissions.some(o => o.reason === 'answer_budget'));
  });
  check('Unvalidated promoted owner cannot suppress a summary prefix', () => {
    const summary = summaryItem(), full = evidence(fullPrefix);
    for (const item of [summary, full]) {
      item.hits[0].source.sourceOrigin = 'promoted';
      item.hits[0].source.owningPath = `docs/reference/knowledge_inbox/promoted/${kb}/missing.md`;
    }
    assert(api.assembleSourceExtracts('alpha', [summary, full], new Set([kb]), root).extracts.some(e => e.bodyField === 'summary'));
  });
  const answerFor = (...items) => api.buildPragmaticAnswer('Wyjaśnij ograniczenia źródła.', response, items);
  const rate = '## Stawki\nStawka ogólna to 19%. Stawka 9% jest warunkowa, dla dochodów innych niż kapitałowe. Dwa limity dotyczą bieżących przychodów i wcześniejszej sprzedaży z VAT. Banki i SKOK mają odrębne zasady.';
  const outcome = '## Wynik wątku\nAutor podziękował 23 marca 2026. Nie podał przyczyny błędu ani wyniku ponownego połączenia. Sugestia nie jest potwierdzoną naprawą.';
  function mockedSiblingExpansion(selectedGroups) {
    // Entire filesystem boundary is synthetic after import: no real content reads.
    const mockRoot = '/synthetic-task2-root';
    const base = `${mockRoot}/docs/reference/knowledge_inbox/promoted`;
    const owner = id => ({ ...source(), recordId: id, sourceOrigin: 'promoted',
      owningPath: `docs/reference/knowledge_inbox/promoted/${kb}/${id}.md` });
    const selectedSource = owner('selected');
    const hit = (s, body, line = 2) => ({ source: s, bodyField: 'content', bodyText: body,
      score: 10, line, endLine: line + 1 });
    const item = { kb, artifact: 'fixture/selected.csv', contentHash: 'sha256:selected',
      hits: [selectedGroups ? hit(selectedSource, rate) : { bodyField: 'technical_fields', bodyText: 'AddNew' }] };
    const sibling = { kb, artifact: 'fixture/siblings.csv', contentHash: 'sha256:siblings',
      siblingHits: [hit({ ...selectedSource, recordId: 'OUTCOME' }, outcome, 12),
        ...Array.from({ length: 100 }, (_, i) => hit(owner(`foreign_${i}`), 'FOREIGN_OWNER_SENTINEL')),
        ...[
          { sourceUrl: 'https://example.test/foreign' },
          { sourceOrigin: 'community' },
          { csvDates: { publishedAt: '2026-03' } },
          { csvDates: { ...selectedSource.csvDates, lastModified: '2026-04' } },
          { csvDates: { ...selectedSource.csvDates, retrievedAt: '2026-05' } },
        ].map(change => hit({ ...selectedSource, ...change }, 'FOREIGN_VERSION_SENTINEL'))] };
    const foreignNamespace = { ...sibling, kb: 'Forbidden', siblingHits: [hit(selectedSource, 'FOREIGN_NAMESPACE_SENTINEL')] };
    Object.defineProperty(item, 'siblingArtifacts', { value: [sibling, foreignNamespace] });
    const saved = { realpathSync: fs.realpathSync, statSync: fs.statSync, readFileSync: fs.readFileSync };
    const reads = [], operations = [];
    let forbiddenReads = 0;
    const guarded = value => {
      const file = String(value);
      assert(file === mockRoot || file === base || file === `${base}/${kb}`
        || new RegExp(`^${base}/${kb}/(?:selected|foreign_\\d+)\\.json$`).test(file), 'Non-synthetic filesystem path');
      return file;
    };
    fs.realpathSync = value => { const file = guarded(value); operations.push(file); return file; };
    fs.statSync = value => { const file = guarded(value); operations.push(file); return { isFile: () => true, size: 100 }; };
    fs.readFileSync = value => {
      let file;
      try { file = guarded(value); } catch (error) { forbiddenReads++; throw error; }
      reads.push(file);
      const id = path.basename(file, '.json');
      return JSON.stringify({ id, kbNamespace: kb, status: 'promoted', sourceUrl: selectedSource.sourceUrl,
        metadata: { sourcePublicationDate: '2025-12' } });
    };
    let result;
    try { result = api.assembleSourceExtracts('Stawki', [item], new Set([kb]), mockRoot); }
    finally { Object.assign(fs, saved); }
    console.log(JSON.stringify({ probe: selectedGroups ? 'selected-owner' : 'no-selected-groups',
      simulatedMetadataReads: reads.length, filesystemOperations: operations.length, forbiddenReads, actualContentReads: 0 }));
    assert.equal(forbiddenReads, 0);
    return { result, reads, operations, selectedFile: `${base}/${kb}/selected.json` };
  }
  check('Sibling prefilter reads only selected owner once despite 100 foreign owners and raw version mismatches', () => {
    const { result, reads, selectedFile } = mockedSiblingExpansion(true);
    assert.deepEqual(reads, [selectedFile]);
    assert.equal(result.sources.length, 1);
    assert.deepEqual(result.sources[0].recordIds, ['selected', 'OUTCOME']);
    assert.equal(result.sources[0].publication.value, '2025-12');
    const extracted = result.extracts.find(e => e.text === outcome);
    assert(extracted);
    assert.equal(extracted.artifact, 'fixture/siblings.csv');
    assert.equal(extracted.contentHash, 'sha256:siblings');
    assert.equal(extracted.line, 12);
    assert.equal(extracted.endLine, 13);
    assert(!JSON.stringify(result).includes('FOREIGN_'));
  });
  check('No selected source groups skip sibling expansion with zero metadata and filesystem operations', () => {
    const { result, reads, operations } = mockedSiblingExpansion(false);
    assert.deepEqual(result, { sources: [], extracts: [], omissions: [] });
    assert.deepEqual(reads, []);
    assert.deepEqual(operations, []);
  });
  check('CIT paragraph preserves 19/9 conditions two limits and exceptions', () => {
    const answer = answerFor(evidence(rate));
    assert.equal(answer.extracts[0].text, rate);
    const md = api.renderAnswerMarkdown(answer);
    for (const text of ['19%', '9% jest warunkowa', 'innych niż kapitałowe', 'bieżących przychodów',
      'wcześniejszej sprzedaży z VAT', 'Banki i SKOK']) assert(md.includes(text));
    assert.equal(answer.evidenceAssessment.status, 'unverified_evidence');
  });
  check('Negative outcome and stem-only body preserve lack of confirmed fix', () => {
    const item = evidence(outcome);
    item.hits[0].stemMatchedTerms = ['polaczenie'];
    const md = api.renderAnswerMarkdown(answerFor(item));
    assert(md.includes('Nie podał przyczyny błędu ani wyniku ponownego połączenia'));
    assert(md.includes('Sugestia nie jest potwierdzoną naprawą'));
  });
  check('Named multiline CSV produces substantive CIT extract through actual scanner and answer', () => {
    const cells = { id: 'CIT_METADATA', title: 'CIT', sourceUrl: source().sourceUrl,
      sourcePath: source().owningPath, sourceOrigin: 'official', publishedAt: '2025-12', content: rate };
    const bytes = [Object.keys(cells), Object.values(cells)].map(row => row.map(value =>
      `"${value.replaceAll('"', '""')}"`).join(',')).join('\n') + '\n';
    fs.writeFileSync(path.join(root, 'rate_chunk.csv'), bytes);
    const scoped = { primaryKb: { name: kb, artifacts: ['rate_chunk.csv'] }, supportKbs: [] };
    const answer = api.buildPragmaticAnswer('CIT', scoped, api.gatherEvidence(scoped, ['cit'], [], new Set([kb])));
    assert.equal(answer.extracts[0].text, rate);
    assert.equal(answer.extracts[0].line, 2);
    assert.equal(answer.extracts[0].endLine, 3);
    assert(!JSON.stringify(answer).includes('bodyDisplayText'));
  });
  check('Explicit empty assembly scope performs no metadata reads or extraction', () => {
    const read = fs.readFileSync;
    let reads = 0;
    fs.readFileSync = (...args) => { reads++; return read(...args); };
    try {
      assert.deepEqual(api.assembleSourceExtracts('Stawki', [evidence(rate)], new Set(), root),
        { sources: [], extracts: [], omissions: [] });
      assert.equal(reads, 0);
    } finally { fs.readFileSync = read; }
  });
  check('Shared canonical ID and exact URL do not merge owning versions or dates', () => {
    const answer = answerFor(evidence(rate), evidence(outcome, 'two'));
    assert.equal(answer.sources.length, 2);
    assert.notEqual(answer.sources[0].key, answer.sources[1].key);
    assert.deepEqual(answer.sources.map(s => s.publication.value).sort(), ['2025-12', '2026-02']);
    assert.equal(new Set(answer.extracts.map(e => e.sourceKey)).size, 2);
    const changed = evidence(outcome);
    changed.hits[0].source.csvDates.publishedAt = '2026-03';
    assert.equal(answerFor(evidence(rate), changed).sources.length, 2);
  });
  check('Exact normalized units deduplicate only within version and retain locators/hashes', () => {
    const answer = answerFor(evidence(rate), evidence(rate.replace('to 19%', 'to   19%')));
    assert.equal(answer.extracts.length, 1);
    assert.equal(answer.extracts[0].contentHash, 'sha256:fixture');
    assert.equal(answer.extracts[0].line, 2);
    assert.equal(answer.extracts[0].endLine, 3);
    assert.equal(answer.evidence[0].uri, 'knowledge://legacy/fixture');
    assert.equal(answerFor(evidence(rate), evidence(rate, 'two')).extracts.length, 2);
  });
  check('Two principal sources three sections per source and 4000 characters; explicit omissions', () => {
    const sections = Array.from({ length: 5 }, (_, i) => `## Sekcja ${i}\nWarunek ${i}: ${'x'.repeat(700)}.`).join('\n\n');
    const answer = answerFor(evidence(sections), evidence(sections, 'two'), evidence(rate, 'three', 1));
    assert.equal(answer.sources.length, 2);
    assert(answer.extracts.reduce((sum, e) => sum + e.text.length, 0) <= 4000);
    for (const s of answer.sources) assert(answer.extracts.filter(e => e.sourceKey === s.key).length <= 3);
    assert(answer.omissions.some(o => o.reason === 'answer_budget'));
    assert(answer.omissions.some(o => o.reason === 'source_limit'));
    assert.match(api.renderAnswerMarkdown(answer), /Ograniczenie pokrycia/);
  });
  check('Over-budget condition paragraph omitted whole with no unconditional preview leak', () => {
    const body = 'Stawka 9% przysługuje. ' + 'x'.repeat(4100) + ' Jednak tylko warunkowo; nie potwierdzono.';
    const item = evidence(body);
    item.hits[0].snippet = 'Stawka 9% przysługuje.';
    const answer = answerFor(item);
    assert.deepEqual(answer.extracts, []);
    assert.equal(answer.omissions[0].reason, 'answer_budget');
    assert(!api.renderAnswerMarkdown(answer).includes('Stawka 9% przysługuje.'));
    assert(!JSON.stringify(answer).includes('x'.repeat(4001)));
    assert(!Object.hasOwn(answer.evidence[0].hits[0], 'bodyText'));
    assert(!Object.hasOwn(answer.evidence[0].hits[0], 'bodyDisplayText'));
    assert.equal(item.hits[0].bodyText, body);
  });
  check('Exact 4000-character unit fits; 4001-character unit is omitted without slicing', () => {
    const boundary = answerFor(evidence('w'.repeat(4000)));
    assert.equal(boundary.extracts.length, 1);
    assert.equal(boundary.extracts[0].text.length, 4000);
    assert.deepEqual(boundary.omissions, []);
    const overflow = answerFor(evidence('w'.repeat(4001)));
    assert.deepEqual(overflow.extracts, []);
    assert.equal(overflow.omissions[0].reason, 'answer_budget');
    assert(!JSON.stringify(overflow).includes('w'.repeat(4001)));
  });
  check('Tables keep heading and row boundaries or explicit incomplete coverage', () => {
    const table = '## Limity\n| Typ | Warunek |\n| --- | --- |\n| 9% | Warunkowo |\n| 19% | Ogólnie |';
    assert.equal(answerFor(evidence(table)).extracts[0].text, table);
    const huge = table + '\n| Dalsze | ' + 'x'.repeat(4100) + ' |';
    assert.equal(answerFor(evidence(huge)).omissions[0].reason, 'answer_budget');
  });
  check('Leading preamble cannot absorb the first heading and exceed a coherent unit budget', () => {
    const body = 'Preambuła.\n\n## Stawki\nStawka 9% jest warunkowa.\n\n## Wynik\nNie potwierdzono.';
    const answer = answerFor(evidence(body));
    assert.deepEqual(new Set(answer.extracts.map(e => e.text)), new Set([
      'Preambuła.', '## Stawki\nStawka 9% jest warunkowa.', '## Wynik\nNie potwierdzono.',
    ]));
  });
  check('Public source previews cannot leak an unconditional claim when its complete unit is omitted', () => {
    const item = evidence('Stawka 9% przysługuje. ' + 'x'.repeat(4100) + ' Tylko warunkowo.');
    item.hits[0].snippet = 'Stawka 9% przysługuje.';
    item.excerpt = item.hits[0].snippet;
    const answer = answerFor(item);
    assert(!JSON.stringify(answer).includes('Stawka 9% przysługuje.'));
    assert.equal(item.hits[0].snippet, 'Stawka 9% przysługuje.');
  });
  check('Answer boundary filters foreign evidence and honors explicit empty scope before metadata I/O', () => {
    const foreign = { ...evidence('FOREIGN_SENTINEL'), kb: 'Forbidden' };
    assert(!JSON.stringify(answerFor(foreign)).includes('FOREIGN_SENTINEL'));
    const read = fs.readFileSync;
    let reads = 0;
    fs.readFileSync = (...args) => { reads++; return read(...args); };
    try {
      const answer = api.buildPragmaticAnswer('Stawki', response, [evidence(rate)], [], new Set());
      assert.deepEqual(answer.sources, []);
      assert.deepEqual(answer.evidence, []);
      assert.equal(reads, 0);
    } finally { fs.readFileSync = read; }
  });
  check('Ranking uses substantive query matches rather than metadata scores', () => {
    const answer = api.buildPragmaticAnswer('kapitałowe', response, [evidence('Inna treść.', 'three', 100),
      evidence(rate, 'one', 1), evidence('Neutralne.', 'two', 90)]);
    assert.equal(answer.sources[0].owningPath, 'ordinary/one.md');
  });
  check('Already scanned same-owner siblings carry unscored outcome with real hash and physical locator', () => {
    const fields = ['id', 'title', 'sourceUrl', 'sourcePath', 'sourceOrigin', 'publishedAt', 'sourceDocumentRefId', 'content'];
    const rows = [fields, ['A', 'Poradnik', source().sourceUrl, source().owningPath, 'official', '2025-12', 'SHARED', '## Sugestia\nPołączenie można ponowić.'],
      ['B', 'Poradnik', source().sourceUrl, source().owningPath, 'official', '2025-12', 'SHARED', outcome],
      ['C', 'Poradnik', source().sourceUrl, source('two').owningPath, 'official', '2026-02', 'SHARED', 'FOREIGN_VERSION_SENTINEL']];
    const bytes = rows.map(row => row.map(v => `"${v.replaceAll('"', '""')}"`).join(',')).join('\n') + '\n';
    fs.writeFileSync(path.join(root, 'chunk.csv'), bytes);
    const scoped = { primaryKb: { name: kb, artifacts: ['chunk.csv'] }, supportKbs: [{ name: 'Forbidden', artifacts: ['/etc/passwd'] }] };
    const ev = api.gatherEvidence(scoped, ['polaczenie'], [], new Set([kb]));
    const answer = api.buildPragmaticAnswer('połączenie', scoped, ev);
    assert(api.renderAnswerMarkdown(answer).includes('Nie podał przyczyny'));
    assert(!JSON.stringify(answer).includes('FOREIGN_VERSION_SENTINEL'));
    const extracted = answer.extracts.find(e => e.text === outcome);
    assert.equal(extracted.contentHash, `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`);
    assert.equal(extracted.line, 4);
    assert.equal(extracted.endLine, 5);
    assert(answer.sources[0].recordIds.includes('B'));
  });
  check('Already permitted second artifact supplies same-owner outcome with its own hash, not shared-ID neighbors', () => {
    const unscoredOutcome = '## Wynik\nAutor podziękował. Nie podał przyczyny błędu ani wyniku ponownej próby. Sugestia nie jest potwierdzoną naprawą.';
    const fields = ['id', 'title', 'sourceUrl', 'sourcePath', 'sourceOrigin', 'publishedAt', 'sourceDocumentRefId', 'content'];
    const encode = rows => rows.map(row => row.map(v => `"${v.replaceAll('"', '""')}"`).join(',')).join('\n') + '\n';
    const first = encode([fields, ['A', 'Poradnik', source().sourceUrl, source().owningPath, 'official', '2025-12', 'SHARED', '## Sugestia\nPołączenie można ponowić.']]);
    const second = encode([fields, ['B', 'Poradnik', source().sourceUrl, source().owningPath, 'official', '2025-12', 'SHARED', unscoredOutcome],
      ['C', 'Poradnik', source().sourceUrl, source('two').owningPath, 'official', '2026-02', 'SHARED', 'FOREIGN_VERSION_SENTINEL']]);
    fs.writeFileSync(path.join(root, 'first.csv'), first);
    fs.writeFileSync(path.join(root, 'second.csv'), second);
    assert.deepEqual(api.scanArtifact('second.csv', ['polaczenie']).hits, []);
    const scoped = { primaryKb: { name: kb, artifacts: ['first.csv', 'second.csv'] }, supportKbs: [] };
    const ev = api.gatherEvidence(scoped, ['polaczenie'], [], new Set([kb]));
    const answer = api.buildPragmaticAnswer('połączenie', scoped, ev);
    const extracted = answer.extracts.find(e => e.text === unscoredOutcome);
    assert(extracted);
    assert.equal(extracted.artifact, 'second.csv');
    assert.equal(extracted.contentHash, `sha256:${crypto.createHash('sha256').update(second).digest('hex')}`);
    assert.equal(extracted.line, 2);
    assert.equal(extracted.endLine, 3);
    assert(!JSON.stringify(answer).includes('FOREIGN_VERSION_SENTINEL'));
  });
  check('Legacy technical/no URL snippets stay compatible without invented citations', () => {
    const item = evidence('CREATE PROCEDURE PZ AddNew');
    item.hits[0].bodyField = 'technical_fields';
    item.hits[0].source.sourceUrl = null;
    item.hits[0].snippet = 'CREATE PROCEDURE PZ AddNew';
    const answer = answerFor(item);
    assert.equal(answer.sources.length, 0);
    assert(api.renderAnswerMarkdown(answer).includes(item.hits[0].snippet));
  });
  check('Unrelated sibling owners cause zero metadata I/O; same-owner outcome retains hash and locator', () => {
    const base = `docs/reference/knowledge_inbox/promoted/${kb}`;
    fs.mkdirSync(path.join(root, base), { recursive: true });
    fs.writeFileSync(path.join(root, base, 'selected.json'), JSON.stringify({ id: 'selected', kbNamespace: kb,
      status: 'promoted', sourceUrl: source().sourceUrl, metadata: { sourcePublicationDate: '2025-12' } }));
    const item = evidence(rate);
    item.hits[0].source.owningPath = `${base}/selected.md`;
    const same = { ...item.hits[0], line: 8, endLine: 9, bodyText: outcome,
      source: { ...item.hits[0].source, recordId: 'OUTCOME' } };
    Object.defineProperty(item, 'siblingHits', { value: [same, ...Array.from({ length: 100 }, (_, i) => ({
      ...same, source: { ...same.source, owningPath: `${base}/unrelated_${i}.md` },
    }))] });
    const read = fs.readFileSync, realpath = fs.realpathSync;
    let reads = 0, unrelatedIO = 0;
    fs.readFileSync = (...args) => { reads++; return read(...args); };
    fs.realpathSync = (...args) => {
      if (String(args[0]).includes('unrelated_')) { unrelatedIO++; throw new Error('Unrelated metadata I/O forbidden'); }
      return realpath(...args);
    };
    try {
      const answer = answerFor(item);
      assert.equal(unrelatedIO, 0);
      assert.equal(reads, 1);
      const extracted = answer.extracts.find(e => e.text === outcome);
      assert.equal(extracted.line, 8);
      assert.equal(extracted.endLine, 9);
      assert.equal(extracted.contentHash, 'sha256:fixture');
      const legacy = { ...item, hits: [{ ...item.hits[0], bodyField: 'technical_fields' }] };
      Object.defineProperty(legacy, 'siblingHits', { value: item.siblingHits });
      assert.deepEqual(api.assembleSourceExtracts('PZ', [legacy], new Set([kb]), root),
        { sources: [], extracts: [], omissions: [] });
      assert.equal(unrelatedIO, 0);
      assert.equal(reads, 1);
    } finally { fs.readFileSync = read; fs.realpathSync = realpath; }
  });
  check('Artifact traversal and symlink fail closed; empty scope scans nothing', () => {
    // Manual external target; guard reads as well as checking the result.
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'extract-outside-'));
    const target = path.join(outside, 'fixture.csv');
    fs.writeFileSync(target, 'id,content\nX,FORBIDDEN_SENTINEL\n');
    fs.symlinkSync(target, path.join(root, 'escape.csv'));
    const read = fs.readFileSync;
    let forbiddenReads = 0;
    fs.readFileSync = (...args) => {
      if (!String(args[0]).startsWith(root + path.sep)) { forbiddenReads++; throw new Error('Outside read forbidden'); }
      return read(...args);
    };
    try {
      for (const artifact of [target, '../outside.csv', 'escape.csv']) assert.deepEqual(api.scanArtifact(artifact, ['forbidden']).hits, []);
      assert.equal(forbiddenReads, 0);
      assert.deepEqual(api.gatherEvidence(response, ['stawki'], [], new Set()), []);
    } finally { fs.readFileSync = read; fs.rmSync(outside, { recursive: true, force: true }); }
  });
  check('Zero network and no draft/learning artifacts', () => {
    assert.equal(networkAttempts, 0);
    assert.equal(fs.existsSync(path.join(root, 'downloads')), false);
  });
} finally { fs.rmSync(root, { recursive: true, force: true }); }
const failed = checks.filter(c => c.status === 'FAIL').length;
console.log(JSON.stringify({ passed: checks.length - failed, failed, checks }, null, 2));
if (failed) process.exitCode = 1;
