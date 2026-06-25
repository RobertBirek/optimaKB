import fs from 'node:fs';
import path from 'node:path';

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
  const body = slug(value).slice(0, 110) || 'ITEM';
  return `${prefix}_${body}`;
}
