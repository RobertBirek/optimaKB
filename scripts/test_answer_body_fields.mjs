#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'answer-body-fields-'));
const previousRoot = process.env.ROOT;
const originalFetch = globalThis.fetch;
process.env.ROOT = root;
let networkAttempts = 0;
globalThis.fetch = async () => { networkAttempts += 1; throw new Error('Network forbidden'); };
const checks = [];
function check(name, run) {
  try { run(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', message: error.message }); }
}
function csv(artifact, fields) {
  const bytes = [Object.keys(fields), Object.values(fields)].map(row => row.map(value =>
    `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n') + '\n';
  fs.writeFileSync(path.join(root, artifact), bytes);
  return artifact;
}
try {
  const { scanArtifact } = await import('./erp_knowledge_answer.mjs');
  const { normalizeText } = await import('./erp_knowledge_assistant.mjs');
  const { makeBodyPreview } = await import('./lib/knowledge_retrieval.mjs');
  const body = '## Stawki\nStawka ogólna wynosi 19%; 9% jest warunkowe i dotyczy dochodów innych niż kapitałowe.';
  const fields = { id: 'TBDOC_INFORMACJE', name: 'Informacje CIT',
    sourceDocumentRefId: 'TBDOC_INFORMACJE_CIT', sourceUrl: 'https://example.test/informacje-cit', content: body };
  check('Early metadata match cannot mask multiline content', () => {
    const hit = scanArtifact(csv('chunk.csv', fields), ['informacje', 'warunkowe', 'kapitalowe']).hits[0];
    assert.equal(hit.bodyField, 'content');
    assert.equal(hit.bodyText, body);
    assert.equal(hit.recordId, fields.id);
    assert(hit.snippet.includes('9%'));
    assert(!hit.snippet.includes('TBDOC_INFORMACJE'));
    assert.deepEqual(hit.bodyMatchedTerms, ['warunkowe', 'kapitalowe']);
    assert.equal(hit.source.sourceUrl, fields.sourceUrl);
    assert.equal(hit.line, 2);
    assert.equal(hit.endLine, 3);
  });
  check('Column order does not determine selected body or source', () => {
    const shuffled = Object.fromEntries(Object.entries(fields).reverse());
    const first = scanArtifact(csv('ordered.csv', fields), ['warunkowe']).hits[0];
    const second = scanArtifact(csv('shuffled.csv', shuffled), ['warunkowe']).hits[0];
    assert.equal(second.bodyField, 'content');
    assert.equal(second.snippet, first.snippet);
    assert.deepEqual(second.source, first.source);
  });
  check('Stem-only match anchors later substantive content', () => {
    const content = 'Wprowadzenie. '.repeat(70) + 'Rozwiązania nie potwierdzono; podziękowanie nie dowodzi skutecznej naprawy.';
    const hit = scanArtifact(csv('stem.csv', { id: 'ROZWIAZANIE', content }), ['rozwiazanie']).hits[0];
    assert(hit.snippet.includes('nie potwierdzono'));
    assert.deepEqual(hit.bodyMatchedTerms, []);
    assert.deepEqual(hit.stemMatchedTerms, ['rozwiazanie']);
    assert(hit.bodyOffset > 0);
  });
  check('Business description retains full description beyond preview', () => {
    const description = 'Opis. '.repeat(100) + 'Warunkowe zasady księgowania.';
    const hit = scanArtifact(csv('business_description.csv', { id: 'BD', name: 'Zasady',
      descriptionPreview: 'Krótki podgląd', content: 'Alternatywa', description, source: 'promoted_knowledge_draft' }), ['warunkowe']).hits[0];
    assert.equal(hit.bodyField, 'description');
    assert.equal(hit.bodyText, description);
    assert.equal(hit.source.sourceOrigin, 'promoted_knowledge_draft');
    assert(hit.snippet.includes('Warunkowe'));
  });
  check('Reference document prefers summary and preserves literal provenance', () => {
    const sourceUrl = 'https://example.test/' + 'long/'.repeat(90);
    const hit = scanArtifact(csv('reference_document.csv', { id: 'D', title: 'Title',
      description: 'Catalog description', content: 'Other content', summary: 'Merytoryczne warunkowe zasady.',
      sourceUrl, localSnapshotPath: 'docs/reference/knowledge_inbox/promoted/KB/D.md',
      sourceType: 'promoted_knowledge_draft', publishedAt: '2025-12', lastModified: '2026-01-02', retrievedAt: '2026-01-03' }), ['warunkowe']).hits[0];
    assert.equal(hit.bodyField, 'summary');
    assert.equal(hit.source.sourceUrl, sourceUrl);
    assert.equal(hit.source.title, 'Title');
    assert.equal(hit.source.sourceOrigin, 'promoted_knowledge_draft');
    assert.equal(hit.source.owningPath, 'docs/reference/knowledge_inbox/promoted/KB/D.md');
    assert.deepEqual(hit.source.csvDates, { publishedAt: '2025-12', lastModified: '2026-01-02', retrievedAt: '2026-01-03' });
  });
  check('Technical fields retain code and names without ID URL path anchors', () => {
    const hit = scanArtifact(csv('table.csv', { id: 'PZ_METADATA', sourceUrl: 'https://example.test/pz',
      sourcePath: 'pz/path', name: 'CDN.TraNag', definition: 'PZW '.repeat(90) + 'PZ AddNew Bufor' }), ['pz'], ['cdn.tranag']).hits[0];
    assert.equal(hit.bodyField, 'technical_fields');
    assert(hit.bodyText.includes('PZ AddNew'));
    assert(hit.snippet.includes('CDN.TraNag'));
    assert(!hit.bodyText.includes('PZ_METADATA'));
    assert(!hit.bodyText.includes('https://'));
    assert(!hit.bodyText.includes('pz/path'));
  });
  check('Body document code uses bounded matching ahead of ordinary terms', () => {
    const hit = scanArtifact(csv('codes.csv', { id: 'PZ', content: 'other PZW ' + 'x '.repeat(200) + 'PZ AddNew' }), ['other', 'pz']).hits[0];
    assert(hit.snippet.includes('PZ AddNew'));
    assert(hit.bodyOffset > 0);
    assert(hit.snippet.length <= 280);
  });
  check('Technical provenance identifiers cannot anchor the preview', () => {
    const hit = scanArtifact(csv('technical-provenance.csv', {
      id: 'OWNER', sourceDocumentRefId: 'WARUNKOWE_DOCUMENT', sourceOrigin: 'WARUNKOWE_ORIGIN',
      sourceType: 'WARUNKOWE_TYPE', source: 'WARUNKOWE_SOURCE', semanticType: 'table',
      name: 'CDN.TraNag', definition: 'Bufor '.repeat(90) + 'Warunkowe AddNew zasady',
    }), ['warunkowe']).hits[0];
    assert(!hit.bodyText.includes('WARUNKOWE_'));
    assert(hit.snippet.includes('Warunkowe AddNew'));
    assert(hit.bodyOffset > 0);
    assert.equal(hit.source.sourceOrigin, 'WARUNKOWE_ORIGIN');
  });
  check('Content is never replaced by definitionPreview', () => {
    const content = 'Pełne ciało. '.repeat(80) + 'PZ warunkowe zasady.';
    const hit = scanArtifact(csv('full.csv', { id: 'F', content, definitionPreview: 'PZ short' }), ['pz']).hits[0];
    assert.equal(hit.bodyText, content);
    assert.equal(hit.bodyField, 'content');
    assert(hit.snippet.includes('warunkowe'));
  });
  check('Technical definitionPreview remains a usable body', () => {
    const hit = scanArtifact(csv('definition.csv', { id: 'F', definitionPreview: 'CREATE PROCEDURE PZ AddNew' }), ['pz']).hits[0];
    assert.equal(hit.bodyField, 'definitionPreview');
    assert.equal(hit.bodyText, 'CREATE PROCEDURE PZ AddNew');
  });
  check('Metadata-only query starts at body beginning', () => {
    const hit = scanArtifact(csv('metadata.csv', { id: 'INFORMACJE', content: body }), ['informacje'], ['informacje']).hits[0];
    assert.equal(hit.bodyOffset, 0);
    assert.equal(hit.snippet, body.replace(/\s+/g, ' '));
  });
  check('Offsets map decomposed accents expansions and whitespace to display text', () => {
    const content = '  ' + 'e\u0301 ﬃ Łódź\t\n'.repeat(70) + 'KAPITAŁOWE zasady 9%. ' + 'z '.repeat(200);
    const display = content.replace(/\s+/g, ' ').trim();
    const expectedOffset = display.indexOf('KAPITAŁOWE') - 60;
    const hit = scanArtifact(csv('unicode.csv', { id: 'U', content }), ['kapitalowe']).hits[0];
    assert.equal(hit.bodyOffset, expectedOffset);
    assert.equal(hit.bodyDisplayText, display);
    assert.equal(hit.bodyText, content);
    assert.equal(hit.snippet, '...' + display.slice(expectedOffset, expectedOffset + 274) + '...');
    assert(hit.snippet.includes('KAPITAŁOWE zasady 9%.'));
    assert.deepEqual(hit.bodyMatchedTerms, ['kapitalowe']);
  });
  for (const [prefix, expectedOffset, normalizedIndex] of [
    ['a¨b '.repeat(300), 1140, 1200], ['¨ '.repeat(300), 540, 0],
  ]) {
    check(`Spacing accent normalization keeps visible match at display offset ${expectedOffset}`, () => {
      const content = prefix + 'KAPITAŁOWE zasady 9%. ' + 'z '.repeat(200);
      const display = content.replace(/\s+/g, ' ').trim();
      // Use the actual whole-string search normalizer, including global trim.
      assert.equal(normalizeText(display).indexOf('kapitalowe'), normalizedIndex);
      const preview = makeBodyPreview(content, ['kapitalowe'], [], normalizeText);
      const hit = scanArtifact(csv(`spacing-${expectedOffset}.csv`, { id: 'U', content }), ['kapitalowe']).hits[0];
      assert(hit);
      assert.deepEqual(hit.bodyMatchedTerms, ['kapitalowe']);
      assert.equal(display.indexOf('KAPITAŁOWE') - 60, expectedOffset);
      assert.equal(hit.bodyOffset, expectedOffset);
      assert.equal(preview.bodyOffset, expectedOffset);
      assert.equal(preview.snippet, hit.snippet);
      assert(hit.snippet.includes('KAPITAŁOWE zasady 9%.'));
      assert.equal(hit.bodyDisplayText, display);
      assert.equal(hit.bodyText, content);
      assert.equal(hit.snippet, '...' + display.slice(expectedOffset, expectedOffset + 274) + '...');
      assert(hit.snippet.length <= 280);
    });
  }
  check('Case expansion and compatibility whitespace preserve display offsets', () => {
    const content = '¨\t\n' + 'İ ﬃ e\u0301 \u00a8\u00a8 𝔸\t\n'.repeat(100) + 'KAPITAŁOWE zasady 9%. ' + 'z '.repeat(200);
    const display = content.replace(/\s+/g, ' ').trim();
    const hit = scanArtifact(csv('case-expansion.csv', { id: 'U', definitionPreview: content }), ['kapitalowe']).hits[0];
    assert.equal(hit.bodyField, 'definitionPreview');
    assert.equal(hit.bodyOffset, display.indexOf('KAPITAŁOWE') - 60);
    assert.deepEqual(hit.bodyMatchedTerms, ['kapitalowe']);
    assert(hit.snippet.includes('KAPITAŁOWE zasady 9%.'));
    assert.equal(hit.bodyText, content);
    assert.equal(hit.bodyDisplayText, display);
    assert(hit.snippet.length <= 280);
  });
  check('Globally trimmed spacing accents do not reposition metadata-only previews', () => {
    const content = '¨ '.repeat(300) + 'Body beginning.';
    const hit = scanArtifact(csv('trimmed-metadata.csv', { id: 'INFORMACJE', content }), ['informacje']).hits[0];
    assert.deepEqual(hit.bodyMatchedTerms, []);
    assert.equal(hit.bodyOffset, 0);
    assert(hit.snippet.startsWith('¨ ¨ '));
  });
  check('Large body mapping normalizes only linear total input', () => {
    const largeBody = 'a¨b ﬃ İ e\u0301 '.repeat(20000) + 'KAPITAŁOWE zasady 9%. ' + 'z '.repeat(200);
    let normalizedUnits = 0;
    const { snippet, bodyOffset, bodyMatchedTerms } = makeBodyPreview(largeBody, ['kapitalowe'], [], value => {
      normalizedUnits += value.length;
      return normalizeText(value);
    });
    assert.equal(bodyOffset, largeBody.indexOf('KAPITAŁOWE') - 60);
    assert.deepEqual(bodyMatchedTerms, ['kapitalowe']);
    assert(snippet.includes('KAPITAŁOWE zasady 9%.'));
    assert(snippet.length <= 280);
    assert(normalizedUnits <= 4 * largeBody.length, `normalized ${normalizedUnits} units for ${largeBody.length}`);
  });
  check('Blank content falls back to description not short previews', () => {
    const hit = scanArtifact(csv('blank.csv', { id: 'X', content: '  ', description: 'PZ substantive', definitionPreview: 'PZ preview' }), ['pz']).hits[0];
    assert.equal(hit.bodyField, 'description');
    assert.equal(hit.bodyText, 'PZ substantive');
  });
  check('Malformed quoted CSV fails closed', () => {
    fs.writeFileSync(path.join(root, 'invalid.csv'), 'id,content\nX,"PZ without closing quote\n');
    const scan = scanArtifact('invalid.csv', ['pz']);
    assert.deepEqual(scan.hits, []);
    assert.deepEqual(scan.warnings, ['invalid_csv']);
  });
  check('Plain text preview remains legacy', () => {
    fs.writeFileSync(path.join(root, 'plain.md'), 'PZ document.\n');
    const hit = scanArtifact('plain.md', ['pz']).hits[0];
    assert.deepEqual(hit, { line: 1, endLine: 1, score: 8, snippet: 'PZ document.', matchedTerms: ['pz'] });
  });
  check('No network attempts', () => assert.equal(networkAttempts, 0));
} finally {
  if (previousRoot === undefined) delete process.env.ROOT;
  else process.env.ROOT = previousRoot;
  globalThis.fetch = originalFetch;
  fs.rmSync(root, { recursive: true, force: true });
}
const failed = checks.filter(check => check.status === 'FAIL').length;
process.stdout.write(JSON.stringify({ passed: checks.length - failed, failed, checks }, null, 2) + '\n');
if (failed) process.exitCode = 1;
