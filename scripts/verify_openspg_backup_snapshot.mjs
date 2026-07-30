#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import process from 'process';
import { spawnSync } from 'child_process';

const ROOT = process.env.ROOT || '/docker/openspg';
const BACKUP_ROOT = process.env.OPENSPG_BACKUP_ROOT || path.join(ROOT, 'backups/automated');
const VERIFY_TIMEOUT_MS = Math.max(1000, Number(process.env.OPENSPG_BACKUP_VERIFY_TIMEOUT_MS || 10 * 60 * 1000));
const DEFAULT_REPORT_PATH = path.join(ROOT, 'docs/reference/OpenSPG_Backup_Verification_Report.json');
const REPORT_PATH = process.env.OPENSPG_BACKUP_VERIFY_REPORT || DEFAULT_REPORT_PATH;

function parseArgs(args) {
  const snapshotIndex = args.indexOf('--snapshot');
  return {
    snapshot: snapshotIndex >= 0 ? String(args[snapshotIndex + 1] || '').trim() : '',
  };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: VERIFY_TIMEOUT_MS, maxBuffer: 20 * 1024 * 1024, ...options });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}\n${result.stderr || result.stdout}`);
  }
  return result.stdout || '';
}

function latestSnapshotDir() {
  if (!fs.existsSync(BACKUP_ROOT)) return '';
  const dirs = fs
    .readdirSync(BACKUP_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  if (!dirs.length) return '';
  return path.join(BACKUP_ROOT, dirs[dirs.length - 1]);
}

function verifySqlDump(filePath) {
  const stat = fs.statSync(filePath);
  if (stat.size <= 0) throw new Error('SQL dump is empty');
  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(128);
    const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
    const prefix = buffer.slice(0, bytesRead).toString('utf8');
    if (!/MySQL dump|MariaDB dump/i.test(prefix)) {
      throw new Error('SQL dump does not look like mysql/mariadb dump output');
    }
  } finally {
    fs.closeSync(fd);
  }
}

function verifyTar(filePath) {
  run('tar', ['-tf', filePath], { stdio: 'ignore' });
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const snapshotDir = args.snapshot || latestSnapshotDir();
  if (!snapshotDir) throw new Error(`No backup snapshots found in ${BACKUP_ROOT}`);
  const manifestPath = path.join(snapshotDir, '_manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error(`Missing manifest: ${manifestPath}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const checks = [];
  for (const archive of manifest.archives || []) {
    const targetPath = archive.archivePath;
    const check = {
      id: archive.id,
      path: targetPath,
      ok: false,
      error: '',
    };
    try {
      if (!fs.existsSync(targetPath)) throw new Error('Archive file is missing');
      if (targetPath.endsWith('.sql')) {
        verifySqlDump(targetPath);
      } else if (targetPath.endsWith('.tar')) {
        verifyTar(targetPath);
      } else {
        throw new Error('Unsupported archive extension');
      }
      check.ok = true;
    } catch (error) {
      check.error = String(error.message || error).slice(0, 2000);
    }
    checks.push(check);
  }

  const report = {
    ok: checks.every((item) => item.ok),
    checkedAt: new Date().toISOString(),
    backupRoot: BACKUP_ROOT,
    snapshotDir,
    checks,
  };
  writeReport(report);
  // OPENSPG_BACKUP_VERIFY_REPORT may point outside the repo (e.g. the systemd
  // unit's sandboxed StateDirectory) so the repo-committed copy doesn't go
  // stale — mirror it here best-effort, without failing the verification run.
  if (REPORT_PATH !== DEFAULT_REPORT_PATH) {
    try {
      fs.mkdirSync(path.dirname(DEFAULT_REPORT_PATH), { recursive: true });
      fs.writeFileSync(DEFAULT_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    } catch (error) {
      process.stderr.write(`Warning: could not mirror report to ${DEFAULT_REPORT_PATH}: ${error.message}\n`);
    }
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) process.exitCode = 1;
}

main();
