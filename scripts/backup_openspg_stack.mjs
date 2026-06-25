#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import process from 'process';
import { spawnSync } from 'child_process';

const ROOT = process.env.ROOT || '/docker/openspg';
const BACKUP_ROOT = process.env.OPENSPG_BACKUP_ROOT || path.join(ROOT, 'backups/automated');
const RETENTION_DAYS = Math.max(1, Number(process.env.OPENSPG_BACKUP_RETENTION_DAYS || 14));
const NOW = new Date();
const STAMP = NOW.toISOString().replace(/[:.]/g, '-');
const SNAPSHOT_DIR = path.join(BACKUP_ROOT, STAMP);
const SOURCES = [
  { id: 'neo4j', dir: path.join(ROOT, 'data/neo4j') },
  { id: 'minio', dir: path.join(ROOT, 'data/minio') },
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}\n${result.stderr || result.stdout}`);
  }
  return (result.stdout || '').trim();
}

function runNoCapture(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

function runCompose(args, options = {}) {
  try {
    return run('docker', ['compose', ...args], options);
  } catch (error) {
    const message = String(error.message || error);
    if (!/unknown command: docker compose/i.test(message)) throw error;
    return run('docker-compose', args, options);
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function archiveDirectory(sourceDir, outputPath) {
  run('tar', ['-cf', outputPath, '-C', path.dirname(sourceDir), path.basename(sourceDir)]);
}

function dumpMysql(outputPath) {
  const escaped = outputPath.replace(/'/g, "'\\''");
  const command = `docker exec release-openspg-mysql sh -lc 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --databases "$MYSQL_DATABASE"' > '${escaped}'`;
  runNoCapture('bash', ['-lc', command]);
}

function pruneOldSnapshots() {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const entry of fs.readdirSync(BACKUP_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(BACKUP_ROOT, entry.name);
    const stat = fs.statSync(full);
    if (stat.mtimeMs < cutoff) {
      fs.rmSync(full, { recursive: true, force: true });
    }
  }
}

function writeText(filePath, value) {
  fs.writeFileSync(filePath, `${value.endsWith('\n') ? value : `${value}\n`}`, 'utf8');
}

function main() {
  ensureDir(BACKUP_ROOT);
  ensureDir(SNAPSHOT_DIR);

  const composeConfig = runCompose(['config'], { cwd: ROOT });
  writeText(path.join(SNAPSHOT_DIR, 'compose.config.yaml'), composeConfig);
  const composePs = runCompose(['ps'], { cwd: ROOT });
  writeText(path.join(SNAPSHOT_DIR, 'compose.ps.txt'), composePs);

  const archives = [];
  const warnings = [];
  try {
    const mysqlDumpPath = path.join(SNAPSHOT_DIR, 'mysql.sql');
    dumpMysql(mysqlDumpPath);
    archives.push({ id: 'mysql_logical', archivePath: mysqlDumpPath, sizeBytes: fs.statSync(mysqlDumpPath).size });
  } catch (error) {
    warnings.push(`mysql_logical_dump_failed: ${String(error.message || error)}`);
  }

  for (const source of SOURCES) {
    if (!fs.existsSync(source.dir)) continue;
    try {
      const archivePath = path.join(SNAPSHOT_DIR, `${source.id}.tar`);
      archiveDirectory(source.dir, archivePath);
      archives.push({ id: source.id, archivePath, sizeBytes: fs.statSync(archivePath).size });
    } catch (error) {
      warnings.push(`${source.id}_archive_failed: ${String(error.message || error)}`);
    }
  }

  const manifest = {
    ok: archives.length > 0,
    createdAt: NOW.toISOString(),
    root: ROOT,
    backupRoot: BACKUP_ROOT,
    snapshotDir: SNAPSHOT_DIR,
    retentionDays: RETENTION_DAYS,
    archives,
    warnings,
  };
  fs.writeFileSync(path.join(SNAPSHOT_DIR, '_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  pruneOldSnapshots();
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
  if (!manifest.ok) process.exitCode = 1;
}

main();
