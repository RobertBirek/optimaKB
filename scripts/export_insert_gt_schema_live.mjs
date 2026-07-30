#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = '/docker/openspg';
const SQL_FILE = path.join(ROOT, 'docs/reference/InsERTGTSchema.extract_metadata.sql');
const OUTPUT_DIR = path.join(ROOT, 'exports/insert_gt_schema/v1');
const MANIFEST_FILE = path.join(OUTPUT_DIR, '_manifest.json');
const TEDIOUS_PATH = process.env.TEDIOUS_MODULE_PATH || '/root/.npm/_npx/096058dd12901fb0/node_modules/tedious';

const CONN_FILE = '/etc/erp-kb-insert-gt-mssql.connection';
const connText = fs.readFileSync(CONN_FILE, 'utf8').trim();

function parseConnectionString() {
  const config = { server: 'localhost', options: { encrypt: true, trustServerCertificate: true, enableArithAbort: true }, authentication: { type: 'default', options: {} } };
  for (const part of connText.split(';').filter(Boolean)) {
    const idx = part.indexOf('='); if (idx === -1) continue;
    const key = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    switch (key) {
      case 'server': case 'data source':
        if (value.includes(',')) {
          const [host, port] = value.split(',');
          config.server = host.trim();
          config.options.port = parseInt(port.trim(), 10);
        } else if (value.includes('\\')) {
          const [serverName, instanceName] = value.split('\\');
          config.server = serverName; config.options.instanceName = instanceName;
        } else { config.server = value; }
        break;
      case 'database': case 'initial catalog': config.options.database = value; break;
      case 'user id': case 'uid': config.authentication.options.userName = value; break;
      case 'password': case 'pwd': config.authentication.options.password = value; break;
      case 'encrypt': config.options.encrypt = value.toLowerCase() === 'true'; break;
      case 'trustservercertificate': config.options.trustServerCertificate = value.toLowerCase() === 'true'; break;
    }
  }
  if (!config.options.database) config.options.database = 'pomagier';
  return config;
}

function csvEscape(v) {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function parseExports(sqlText) {
  const exports = []; let current = null;
  for (const line of sqlText.split('\n')) {
    const fm = line.match(/^--\s+([a-z0-9_]+\.csv)\s*$/i);
    if (fm) { if (current?.queryLines.length) exports.push({ fileName: current.fileName, query: current.queryLines.join('\n').trim() }); current = { fileName: fm[1], queryLines: [] }; continue; }
    if (!current || line.startsWith('--')) continue;
    if (line.trim() === '' && current.queryLines.length === 0) continue;
    current.queryLines.push(line);
  }
  if (current?.queryLines.length) exports.push({ fileName: current.fileName, query: current.queryLines.join('\n').trim() });
  return exports;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const { Connection, Request } = require(TEDIOUS_PATH);
  const config = parseConnectionString();
  const sqlText = fs.readFileSync(SQL_FILE, 'utf8');
  const exportsList = parseExports(sqlText);
  console.log(`Found ${exportsList.length} export sections`);
  console.log(`Connecting to ${config.server}:${config.options.port || 1433}...`);

  // Connect once
  const conn = await new Promise((resolve, reject) => {
    const c = new Connection(config);
    c.on('connect', (err) => {
      if (err) { reject(err); return; }
      console.log('Connected!');
      resolve(c);
    });
    c.on('error', (err) => { reject(err); });
    c.connect();
  });

  const manifest = { generatedAt: new Date().toISOString(), source: 'InsERTGTSchema.extract_metadata.sql (live MSSQL)', files: [] };

  for (const exp of exportsList) {
    const outPath = path.join(OUTPUT_DIR, exp.fileName);
    console.log(`  Exporting ${exp.fileName}...`);
    const result = await new Promise((resolve, reject) => {
      let rowCount = 0; let headers = null;
      const out = fs.createWriteStream(outPath, { encoding: 'utf8' });
      const req = new Request(exp.query, (err2) => {
        out.end();
        if (err2) { reject(err2); return; }
        resolve({ rowCount, headers });
      });
      req.on('row', (cols) => {
        if (!headers) { headers = cols.map(c => c.metadata.colName); out.write(headers.map(h => csvEscape(h)).join(',') + '\n'); }
        const vals = cols.map(c => csvEscape(c.value)); out.write(vals.join(',') + '\n'); rowCount++;
      });
      conn.execSql(req);
    });
    manifest.files.push({ fileName: exp.fileName, rowCount: result.rowCount, columns: result.headers || [] });
    console.log(`    ${result.rowCount} rows`);
  }

  conn.close();
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`\nLive extraction complete. ${manifest.files.length} files.`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
