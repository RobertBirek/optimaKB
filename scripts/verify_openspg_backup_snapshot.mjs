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
const NEO4J_CONTAINER = process.env.OPENSPG_NEO4J_CONTAINER || 'release-openspg-neo4j';

function parseArgs(args) {
  const snapshotIndex = args.indexOf('--snapshot');
  return {
    snapshot: snapshotIndex >= 0 ? String(args[snapshotIndex + 1] || '').trim() : '',
  };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: VERIFY_TIMEOUT_MS,
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}\n${result.stderr || result.stdout}`);
  }
  return (result.stdout || '').trim();
}

function latestSnapshotDir() {
  if (!fs.existsSync(BACKUP_ROOT)) return '';
  const dirs = fs
    .readdirSync(BACKUP_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.partial-'))
    .map((entry) => entry.name)
    .sort();
  if (!dirs.length) return '';
  return path.join(BACKUP_ROOT, dirs[dirs.length - 1]);
}

function isWithin(parentDir, candidatePath) {
  const relative = path.relative(parentDir, candidatePath);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function resolveArchivePath(snapshotDir, archivePath) {
  if (typeof archivePath !== 'string' || !archivePath.trim()) {
    throw new Error('Archive path is missing');
  }

  const snapshotRoot = fs.realpathSync(snapshotDir);
  const requestedPath = path.isAbsolute(archivePath)
    ? path.resolve(archivePath)
    : path.resolve(snapshotRoot, archivePath);
  if (!isWithin(snapshotRoot, requestedPath)) {
    throw new Error('Archive path escapes the snapshot directory');
  }
  if (!fs.existsSync(requestedPath)) throw new Error('Archive file is missing');

  const lstat = fs.lstatSync(requestedPath);
  if (lstat.isSymbolicLink()) throw new Error('Archive path must not be a symbolic link');
  if (!lstat.isFile()) throw new Error('Archive path is not a regular file');

  const realPath = fs.realpathSync(requestedPath);
  if (!isWithin(snapshotRoot, realPath)) {
    throw new Error('Archive path resolves outside the snapshot directory');
  }
  return { snapshotRoot, targetPath: realPath };
}

function verifySize(filePath, expectedSize) {
  if (!Number.isSafeInteger(expectedSize) || expectedSize < 0) {
    throw new Error('Manifest sizeBytes must be a non-negative integer');
  }
  const actualSize = fs.statSync(filePath).size;
  if (actualSize !== expectedSize) {
    throw new Error(`Archive size mismatch: expected ${expectedSize}, got ${actualSize}`);
  }
}

function verifySqlDump(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(256);
    const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
    const prefix = buffer.subarray(0, bytesRead).toString('utf8');
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

function neo4jImage() {
  const configured = String(process.env.OPENSPG_NEO4J_IMAGE || '').trim();
  if (configured) return configured;
  const image = run('docker', ['inspect', '--format', '{{.Config.Image}}', NEO4J_CONTAINER]);
  if (!image) throw new Error(`Could not resolve image for ${NEO4J_CONTAINER}`);
  return image;
}

function verifyNeo4jDumpDirectories(snapshotRoot, dumpDirectories) {
  if (!dumpDirectories.size) return;
  const image = neo4jImage();
  for (const dumpDirectory of [...dumpDirectories].sort()) {
    const relativeDir = path.relative(snapshotRoot, dumpDirectory);
    if (!isWithin(snapshotRoot, dumpDirectory)) {
      throw new Error('Neo4j dump directory escapes the snapshot directory');
    }
    const containerDir = relativeDir ? `/backup/${relativeDir.split(path.sep).join('/')}` : '/backup';
    run('docker', [
      'run', '--rm',
      '--network', 'none',
      '--memory', '1g',
      '--mount', `type=bind,src=${snapshotRoot},dst=/backup,readonly`,
      '--entrypoint', '/var/lib/neo4j/bin/neo4j-admin',
      image,
      'database', 'load', '--info', `--from-path=${containerDir}`, '*',
    ]);
  }
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

function mirrorDefaultReport(report) {
  if (REPORT_PATH === DEFAULT_REPORT_PATH) return;
  try {
    fs.mkdirSync(path.dirname(DEFAULT_REPORT_PATH), { recursive: true });
    fs.writeFileSync(DEFAULT_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  } catch (error) {
    process.stderr.write(`Warning: could not mirror report to ${DEFAULT_REPORT_PATH}: ${error.message}\n`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const selectedSnapshot = args.snapshot || latestSnapshotDir();
  if (!selectedSnapshot) throw new Error(`No backup snapshots found in ${BACKUP_ROOT}`);
  const snapshotDir = path.resolve(selectedSnapshot);
  const manifestPath = path.join(snapshotDir, '_manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error(`Missing manifest: ${manifestPath}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const checks = [];
  const dumpDirectories = new Set();
  const pendingDumpChecks = [];
  let snapshotRoot = fs.realpathSync(snapshotDir);

  for (const archive of manifest.archives || []) {
    const check = {
      id: archive.id,
      path: archive.archivePath,
      ok: false,
      error: '',
    };
    try {
      const resolved = resolveArchivePath(snapshotDir, archive.archivePath);
      snapshotRoot = resolved.snapshotRoot;
      verifySize(resolved.targetPath, archive.sizeBytes);
      const extension = path.extname(resolved.targetPath).toLowerCase();
      if (extension === '.sql') {
        verifySqlDump(resolved.targetPath);
        check.ok = true;
      } else if (extension === '.tar') {
        verifyTar(resolved.targetPath);
        check.ok = true;
      } else if (extension === '.dump') {
        dumpDirectories.add(path.dirname(resolved.targetPath));
        pendingDumpChecks.push(check);
      } else {
        throw new Error('Unsupported archive extension');
      }
    } catch (error) {
      check.error = String(error.message || error).slice(0, 2000);
    }
    checks.push(check);
  }

  if (pendingDumpChecks.length) {
    try {
      verifyNeo4jDumpDirectories(snapshotRoot, dumpDirectories);
      for (const check of pendingDumpChecks) check.ok = true;
    } catch (error) {
      const message = String(error.message || error).slice(0, 2000);
      for (const check of pendingDumpChecks) check.error = message;
    }
  }

  const report = {
    ok: checks.length > 0 && checks.every((item) => item.ok),
    checkedAt: new Date().toISOString(),
    backupRoot: BACKUP_ROOT,
    snapshotDir,
    checks,
  };
  writeReport(report);
  mirrorDefaultReport(report);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) process.exitCode = 1;
}

main();
