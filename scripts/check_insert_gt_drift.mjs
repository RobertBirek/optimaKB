#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { Connection, Request } = require(process.env.TEDIOUS_MODULE_PATH || '/root/.npm/_npx/096058dd12901fb0/node_modules/tedious');

const ROOT = '/docker/openspg';
const LOG_PATH = path.join(ROOT, 'logs/insert_gt_schema_drift.log');
const CONN_FILE = '/etc/erp-kb-insert-gt-mssql.connection';

function parseConn() {
  const t = fs.readFileSync(CONN_FILE, 'utf8').trim();
  const cfg = { server: 'localhost', options: { encrypt: true, trustServerCertificate: true, enableArithAbort: true }, authentication: { type: 'default', options: {} } };
  for (const part of t.split(';').filter(Boolean)) {
    const idx = part.indexOf('='); if (idx === -1) continue;
    const key = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    switch (key) {
      case 'server': case 'data source':
        if (value.includes(',')) { const [h,p] = value.split(','); cfg.server = h.trim(); cfg.options.port = parseInt(p.trim()); }
        else cfg.server = value;
        break;
      case 'database': cfg.options.database = value; break;
      case 'user id': cfg.authentication.options.userName = value; break;
      case 'password': cfg.authentication.options.password = value; break;
      case 'encrypt': cfg.options.encrypt = value.toLowerCase() === 'true'; break;
      case 'trustservercertificate': cfg.options.trustServerCertificate = value.toLowerCase() === 'true'; break;
    }
  }
  return cfg;
}

async function query(sql) {
  return new Promise((res, rej) => {
    const conn = new Connection(parseConn());
    const rows = [];
    conn.on('connect', (err) => {
      if (err) { rej(err); return; }
      const req = new Request(sql, (err2) => { conn.close(); if (err2) { rej(err2); return; } res(rows); });
      req.on('row', (cols) => { const r = {}; cols.forEach(c => r[c.metadata.colName] = c.value); rows.push(r); });
      conn.execSql(req);
    });
    conn.connect();
  });
}

async function main() {
  const log = (msg) => {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log(msg);
    fs.appendFileSync(LOG_PATH, line + '\n');
  };

  log('=== InsERT GT Schema Drift Check ===');

  try {
    // Live MSSQL counts
    const metrics = [
      { name: 'tables', sql: 'SELECT COUNT(*) cnt FROM sys.tables' },
      { name: 'views', sql: 'SELECT COUNT(*) cnt FROM sys.views' },
      { name: 'procedures', sql: "SELECT COUNT(*) cnt FROM sys.procedures WHERE type='P'" },
      { name: 'functions', sql: "SELECT COUNT(*) cnt FROM sys.objects WHERE type IN ('FN','IF','TF')" },
      { name: 'triggers', sql: 'SELECT COUNT(*) cnt FROM sys.triggers' },
      { name: 'columns', sql: 'SELECT COUNT(*) cnt FROM sys.columns AS c JOIN sys.tables AS t ON t.object_id = c.object_id' },
      { name: 'indexes', sql: 'SELECT COUNT(*) cnt FROM sys.indexes WHERE index_id > 0' },
      { name: 'parameters', sql: 'SELECT COUNT(*) cnt FROM sys.parameters' },
    ];

    log('Live MSSQL counts (pomagier):');
    const live = {};
    for (const m of metrics) {
      const rows = await query(m.sql);
      const cnt = rows[0]?.cnt || 0;
      live[m.name] = cnt;
      log(`  ${m.name.padEnd(15)} ${cnt}`);
    }

    // Neo4j counts
    log('Neo4j counts (insertgtschema):');
    const neo4j = {};
    const labels = {
      tables: 'InsERTGTSchema.Table',
      views: 'InsERTGTSchema.View',
      procedures: 'InsERTGTSchema.StoredProcedure',
      functions: 'InsERTGTSchema.Function',
      triggers: 'InsERTGTSchema.Trigger',
      columns: 'InsERTGTSchema.Column',
      indexes: 'InsERTGTSchema.Index',
      parameters: 'InsERTGTSchema.Parameter',
    };

    for (const [key, label] of Object.entries(labels)) {
      try {
        const { spawnSync } = require('child_process');
        const result = spawnSync('docker', [
          'exec', 'release-openspg-neo4j',
          'cypher-shell', '-u', 'neo4j', '-p', 'e5b0b65b78cda315782ea9deef5c198f5a0497707abb8fa3',
          '-d', 'insertgtschema',
          `MATCH (n) WHERE "${label}" IN labels(n) RETURN count(n) AS cnt;`
        ], { encoding: 'utf8', timeout: 10000 });
        const match = (result.stdout || '').match(/(\d+)/);
        const cnt = match ? parseInt(match[1]) : 0;
        neo4j[key] = cnt;
        log(`  ${key.padEnd(15)} ${cnt}`);
      } catch (e) {
        log(`  ${key.padEnd(15)} ERROR: ${e.message}`);
        neo4j[key] = -1;
      }
    }

    // Compare
    log('Drift:');
    let driftCount = 0;
    for (const key of Object.keys(live)) {
      const l = live[key];
      const n = neo4j[key] ?? -1;
      if (n < 0) { log(`  ${key}: Neo4j unreachable`); driftCount++; continue; }
      const diff = l - n;
      if (diff === 0) { log(`  ${key}: OK (${l})`); }
      else { log(`  ${key}: DRIFT live=${l} neo4j=${n} diff=${diff > 0 ? '+' + diff : diff}`); driftCount++; }
    }
    log(`Total drifts: ${driftCount}`);
    log('=== End ===\n');
  } catch (error) {
    log(`ERROR: ${error.message}`);
  }
}

main();
