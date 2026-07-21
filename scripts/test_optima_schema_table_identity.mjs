#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const tableCsv = process.argv[2] || path.join(
  process.cwd(),
  'exports/optima_schema/v1/table.csv',
);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  return rows;
}

assert.ok(fs.existsSync(tableCsv), `Missing table export: ${tableCsv}`);
const [header, ...data] = parseCsv(fs.readFileSync(tableCsv, 'utf8')).filter(
  (row) => row.some((value) => value !== ''),
);
const columns = Object.fromEntries(header.map((name, index) => [name, index]));
for (const required of ['id', 'databaseRefId', 'sqlName']) {
  assert.notEqual(columns[required], undefined, `Missing column ${required}`);
}

const allowedDatabases = new Set([
  'CDN_TEST:DATABASE',
  'CDN_KNF_Konfiguracja:DATABASE',
]);
const ids = new Set();
const qualifiedNames = new Set();
const namesByDatabase = new Map();

for (const row of data) {
  const id = row[columns.id];
  const databaseRefId = row[columns.databaseRefId];
  const sqlName = row[columns.sqlName];
  assert.ok(id && databaseRefId && sqlName, 'Table identity fields cannot be empty');
  assert.ok(allowedDatabases.has(databaseRefId), `Unknown databaseRefId: ${databaseRefId}`);
  assert.ok(!ids.has(id), `Duplicate table id: ${id}`);
  ids.add(id);

  const qualifiedName = `${databaseRefId}|${sqlName}`.toLowerCase();
  assert.ok(!qualifiedNames.has(qualifiedName), `Duplicate qualified table: ${qualifiedName}`);
  qualifiedNames.add(qualifiedName);

  if (!namesByDatabase.has(sqlName.toLowerCase())) namesByDatabase.set(sqlName.toLowerCase(), new Set());
  namesByDatabase.get(sqlName.toLowerCase()).add(databaseRefId);
}

const crossDatabaseNames = [...namesByDatabase.values()].filter((databases) => databases.size > 1).length;
console.log(JSON.stringify({
  rows: data.length,
  uniqueIds: ids.size,
  uniqueQualifiedNames: qualifiedNames.size,
  crossDatabaseNames,
}));
