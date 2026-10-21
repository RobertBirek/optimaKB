import { RAW_HEADERS, sha256 } from './semantic_raw_contract.mjs';

// A byte machine: UTF8 validation never normalizes the bytes used for locators.
// Cell decoding happens only after quote removal/doubling; delimiters belong to
// the original physical record slice, including an optional terminal CRLF/LF.
export function parseRawCsv(artifact, bytes) {
  const invalid = () => { throw Object.assign(new Error('CSV_INVALID'), { code:'CSV_INVALID' }); };
  if (!Object.hasOwn(RAW_HEADERS,artifact) || !(bytes instanceof Uint8Array)) invalid();
  const data = Buffer.from(bytes), decoder = new TextDecoder('utf-8',{ fatal:true,ignoreBOM:true });
  try { if (decoder.decode(data).startsWith('\ufeff')) invalid(); } catch { invalid(); }
  const columns = [...RAW_HEADERS[artifact]], records = [];
  let pos = 0, line = 1, header = false;
  while (pos < data.length) {
    const byte_start = pos, line_start = line, cells = [];
    let line_end;
    for (;;) {
      const chunks = []; let start;
      if (data[pos] === 34) {
        pos++; start = pos;
        for (;;) {
          if (pos >= data.length) invalid();
          if (data[pos] === 34) {
            chunks.push(data.subarray(start,pos)); pos++;
            if (data[pos] === 34) { chunks.push(Buffer.from([34])); pos++; start = pos; continue; }
            break;
          }
          if (data[pos] === 10) line++;
          pos++;
        }
        if (pos < data.length && ![44,13,10].includes(data[pos])) invalid();
      } else {
        start = pos;
        while (pos < data.length && ![44,13,10].includes(data[pos])) { if (data[pos] === 34) invalid(); pos++; }
        chunks.push(data.subarray(start,pos));
      }
      cells.push(decoder.decode(Buffer.concat(chunks)));
      if (data[pos] === 44) { pos++; continue; }
      line_end = line;
      if (data[pos] === 13) { if (data[pos+1] !== 10) invalid(); pos += 2; line++; }
      else if (data[pos] === 10) { pos++; line++; }
      break;
    }
    if (cells.length !== columns.length) invalid();
    if (!header) { if (!cells.every((s,i) => s === columns[i])) invalid(); header = true; continue; }
    records.push({ fields:Object.fromEntries(columns.map((c,i) => [c,cells[i]])),physical:{ byte_start,byte_end:pos,line_start,line_end },raw_record_sha256:sha256(data.subarray(byte_start,pos)) });
  }
  if (!header) invalid();
  return { columns,records };
}
