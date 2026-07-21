#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { readMssqlConnectionString } from './lib/mssql_connection_string.mjs';

const ROOT = process.env.OPENSPG_ROOT || process.cwd();
const TABLE_CSV = process.env.OPTIMA_SCHEMA_TABLE_CSV || path.join(ROOT, 'exports/optima_schema/v1/table.csv');
const CLASSIFICATION_FILE = process.env.OPTIMA_SCHEMA_DRIFT_CLASSIFICATION || path.join(
  ROOT,
  'docs/reference/ComarchOptimaSchema.drift-classification.json',
);
const COMPANY_DATABASE = process.env.OPTIMA_COMPANY_DATABASE || 'CDN_TEST';
const CONFIGURATION_DATABASE = process.env.OPTIMA_CONFIGURATION_DATABASE || 'CDN_Konfiguracja';
const TEDIOUS_PATH = process.env.TEDIOUS_MODULE_PATH || '/root/.npm/_npx/096058dd12901fb0/node_modules/tedious';

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += char;
  }
  return rows;
}

function parseConnectionString(connectionString) {
  const config = {
    server: 'localhost',
    options: { encrypt: true, trustServerCertificate: true, enableArithAbort: true },
    authentication: { type: 'default', options: {} },
  };
  for (const part of connectionString.split(';').filter(Boolean)) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim().toLowerCase();
    const value = part.slice(separator + 1).trim();
    if (['server', 'data source'].includes(key)) {
      const [server, instanceName] = value.split('\\');
      config.server = server;
      if (instanceName) config.options.instanceName = instanceName;
    } else if (['user id', 'uid'].includes(key)) config.authentication.options.userName = value;
    else if (['password', 'pwd'].includes(key)) config.authentication.options.password = value;
    else if (key === 'encrypt') config.options.encrypt = value.toLowerCase() === 'true';
    else if (key === 'trustservercertificate') config.options.trustServerCertificate = value.toLowerCase() === 'true';
  }
  return config;
}

function validateDatabaseName(value) {
  assert.match(value, /^[A-Za-z0-9_]+$/, `Unsafe database name: ${value}`);
  return value;
}

async function queryLiveTables() {
  const require = createRequire(import.meta.url);
  const { Connection, Request } = require(TEDIOUS_PATH);
  const connection = await new Promise((resolve, reject) => {
    const instance = new Connection(parseConnectionString(readMssqlConnectionString()));
    instance.on('connect', (error) => error ? reject(error) : resolve(instance));
    instance.connect();
  });
  const company = validateDatabaseName(COMPANY_DATABASE);
  const configuration = validateDatabaseName(CONFIGURATION_DATABASE);
  const query = `
    SELECT 'company' AS databaseKind, s.name + '.' + t.name AS sqlName
    FROM [${company}].sys.tables t JOIN [${company}].sys.schemas s ON s.schema_id=t.schema_id
    UNION ALL
    SELECT 'configuration' AS databaseKind, s.name + '.' + t.name AS sqlName
    FROM [${configuration}].sys.tables t JOIN [${configuration}].sys.schemas s ON s.schema_id=t.schema_id;
  `;
  try {
    return await new Promise((resolve, reject) => {
      const rows = [];
      const request = new Request(query, (error) => error ? reject(error) : resolve(rows));
      request.on('row', (columns) => rows.push(Object.fromEntries(
        columns.map((column) => [column.metadata.colName, column.value]),
      )));
      connection.execSql(request);
    });
  } finally {
    connection.close();
  }
}

function exportTables() {
  const [header, ...rows] = parseCsv(fs.readFileSync(TABLE_CSV, 'utf8')).filter(
    (row) => row.some((value) => value !== ''),
  );
  const columns = Object.fromEntries(header.map((name, index) => [name, index]));
  return rows.map((row) => ({
    databaseKind: row[columns.databaseRefId].startsWith('CDN_TEST:') ? 'company' : 'configuration',
    sqlName: row[columns.sqlName],
  }));
}

const key = (row) => `${row.databaseKind}|${row.sqlName}`.toLowerCase();
const live = new Map((await queryLiveTables()).map((row) => [key(row), row]));
const exported = new Map(exportTables().map((row) => [key(row), row]));
const actual = [
  ...[...live].filter(([item]) => !exported.has(item)).map(([, row]) => ({ direction: 'live_only', ...row })),
  ...[...exported].filter(([item]) => !live.has(item)).map(([, row]) => ({ direction: 'export_only', ...row })),
];
const classification = JSON.parse(fs.readFileSync(CLASSIFICATION_FILE, 'utf8')).differences;
const classified = new Set(classification.map((row) => `${row.direction}|${key(row)}`));
const unclassified = actual.filter((row) => !classified.has(`${row.direction}|${key(row)}`));
const stale = classification.filter((row) => !actual.some(
  (item) => `${item.direction}|${key(item)}` === `${row.direction}|${key(row)}`,
));

console.log(JSON.stringify({
  live: live.size,
  exported: exported.size,
  differences: actual.length,
  classified: actual.length - unclassified.length,
  unclassified,
  staleClassifications: stale,
}, null, 2));
assert.deepEqual(unclassified, [], 'Unclassified Optima schema drift detected');
assert.deepEqual(stale, [], 'Stale Optima schema drift classification detected');
