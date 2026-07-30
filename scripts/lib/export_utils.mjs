import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function csvEscape(value) {
  const normalized = value == null ? '' : String(value);
  if (/[",\n\r]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

export function writeCsv(exportDir, fileName, columns, rows) {
  const filePath = path.join(exportDir, fileName);
  const lines = [columns.join(',')];
  for (const row of rows) {
    lines.push(columns.map((column) => csvEscape(row[column] ?? '')).join(','));
  }
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
  return { fileName, path: filePath, rowCount: rows.length, columns };
}

export function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function slug(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\s./:-]/g, '')
    .trim()
    .replace(/[\s./:\\-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

export function makeId(prefix, value) {
  const MAX_BODY = 106;
  const full = slug(value);
  if (!full) return `${prefix}_ITEM`;
  if (full.length <= MAX_BODY) return `${prefix}_${full}`;
  // Naive left-truncation can collapse distinct inputs that share a long
  // common prefix (e.g. the same source example touching different schema
  // objects) into the same id. Append a short content hash of the full,
  // untruncated value so truncated ids stay unique per distinct input.
  const HASH_LEN = 8;
  const hash = createHash('sha1').update(String(value)).digest('hex').slice(0, HASH_LEN).toUpperCase();
  const body = full.slice(0, MAX_BODY - HASH_LEN - 1);
  return `${prefix}_${body}_${hash}`;
}
