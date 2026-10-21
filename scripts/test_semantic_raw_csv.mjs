import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
const api = await import('./lib/semantic_raw_csv.mjs').catch(e => { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; return {}; });
const artifact = 'exports/owa_ontology/v1/chunk.csv';
const header = 'id,name,description,semanticType,sourceDocumentRefId,sourcePath,sectionHeading,sectionOrder,content';
const hash = b => createHash('sha256').update(b).digest('hex');
test('byte CSV preserves multiline CRLF, doubled quotes, nonASCII, exact slices and physical lines', () => {
  assert.equal(typeof api.parseRawCsv, 'function');
  const row = 'x,ł,,chunk,o,/never/open,heading,1,"a\r\nb\n""quoted"""\r\n';
  const bytes = Buffer.from(header + '\r\n' + row + 'y,,,,,,,,EOF');
  const out = api.parseRawCsv(artifact, bytes);
  assert.deepEqual(out.columns, header.split(',')); assert.equal(out.records.length, 2);
  assert.equal(out.records[0].fields.content, 'a\r\nb\n"quoted"');
  const start = Buffer.byteLength(header + '\r\n'), end = start + Buffer.byteLength(row);
  assert.deepEqual(out.records[0].physical, { byte_start: start, byte_end: end, line_start: 2, line_end: 4 });
  assert.equal(out.records[0].raw_record_sha256, hash(bytes.subarray(start, end)));
  assert.deepEqual(out.records[1].physical, { byte_start: end, byte_end: bytes.length, line_start: 5, line_end: 5 });
});
test('CSV allows EOF/no final newline and header-only, without inventing empty records', () => {
  assert.equal(typeof api.parseRawCsv, 'function');
  for (const suffix of ['', '\n', '\r\n']) assert.equal(api.parseRawCsv(artifact, Buffer.from(header + suffix)).records.length, 0);
  for (const suffix of ['', '\n', '\r\n']) assert.equal(api.parseRawCsv(artifact, Buffer.from(header + '\n' + 'x,,,,,,,,""' + suffix)).records.length, 1);
});
test('CSV rejects malformed UTF8/BOM/header/blank/ragged/quote/bare CR with CSV_INVALID', () => {
  assert.equal(typeof api.parseRawCsv, 'function');
  for (const value of ['\ufeff' + header, header.replace('name', 'id'), header + ',extra', header + '\n\n', header + '\nx,y', header + '\nx,,,,,,,,"unclosed', header + '\nx,,,,,,,,"closed"x', header + '\nx,,,,,,,,a"b', header + '\rx,,,,,,,,x', header + '\nx,,,,,,,,x\n\n', Buffer.concat([Buffer.from(header + '\nx,,,,,,,,'), Buffer.from([0xff])])]) {
    assert.throws(() => api.parseRawCsv(artifact, Buffer.isBuffer(value) ? value : Buffer.from(value)), e => e.code === 'CSV_INVALID');
  }
  assert.throws(() => api.parseRawCsv('../chunk.csv', Buffer.from(header)), e => e.code === 'CSV_INVALID');
});
