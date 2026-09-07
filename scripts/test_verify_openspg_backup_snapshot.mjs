#!/usr/bin/env node

import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import process from 'process';
import { spawnSync } from 'child_process';

const VERIFIER = path.join(process.cwd(), 'scripts/verify_openspg_backup_snapshot.mjs');

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function writeManifest(snapshotDir, archives) {
  fs.writeFileSync(
    path.join(snapshotDir, '_manifest.json'),
    `${JSON.stringify({ ok: true, archives }, null, 2)}\n`,
    'utf8',
  );
}

function createValidSnapshot(backupRoot, name) {
  const snapshotDir = path.join(backupRoot, name);
  const dumpDir = path.join(snapshotDir, 'neo4j-dumps');
  const tarSource = path.join(snapshotDir, 'tar-source');
  fs.mkdirSync(dumpDir, { recursive: true });
  fs.mkdirSync(tarSource, { recursive: true });

  const sqlPath = path.join(snapshotDir, 'mysql.sql');
  const tarPath = path.join(snapshotDir, 'minio.tar');
  const dumpPath = path.join(dumpDir, 'neo4j.dump');
  fs.writeFileSync(sqlPath, '-- MySQL dump 10.13\nSELECT 1;\n', 'utf8');
  fs.writeFileSync(path.join(tarSource, 'object.txt'), 'fixture\n', 'utf8');
  run('tar', ['-cf', tarPath, '-C', tarSource, 'object.txt']);
  fs.writeFileSync(dumpPath, 'neo4j-dump-fixture\n', 'utf8');

  writeManifest(snapshotDir, [
    { id: 'mysql_logical', archivePath: 'mysql.sql', sizeBytes: fs.statSync(sqlPath).size },
    { id: 'minio', archivePath: 'minio.tar', sizeBytes: fs.statSync(tarPath).size },
    { id: 'neo4j_neo4j', archivePath: 'neo4j-dumps/neo4j.dump', sizeBytes: fs.statSync(dumpPath).size },
  ]);
  return snapshotDir;
}

function invokeVerifier(root, backupRoot, snapshotDir = '', extraEnv = {}) {
  const reportPath = path.join(root, `report-${Math.random().toString(16).slice(2)}.json`);
  const args = [VERIFIER];
  if (snapshotDir) args.push('--snapshot', snapshotDir);
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      ROOT: root,
      OPENSPG_BACKUP_ROOT: backupRoot,
      OPENSPG_BACKUP_VERIFY_REPORT: reportPath,
      OPENSPG_BACKUP_VERIFY_TIMEOUT_MS: '5000',
      OPENSPG_NEO4J_IMAGE: 'neo4j:test',
      ...extraEnv,
    },
  });
  const report = fs.existsSync(reportPath)
    ? JSON.parse(fs.readFileSync(reportPath, 'utf8'))
    : null;
  return { result, report };
}

function failedCheck(report, id) {
  return report?.checks.find((check) => check.id === id && !check.ok);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openspg-backup-verifier-'));
try {
  const backupRoot = path.join(tempRoot, 'backups');
  const binDir = path.join(tempRoot, 'bin');
  fs.mkdirSync(backupRoot, { recursive: true });
  fs.mkdirSync(binDir, { recursive: true });
  const fakeDocker = path.join(binDir, 'docker');
  fs.writeFileSync(
    fakeDocker,
    '#!/bin/sh\nif [ "${FAKE_DOCKER_FAIL:-0}" = "1" ]; then echo "simulated neo4j-admin failure" >&2; exit 42; fi\nexit 0\n',
    'utf8',
  );
  fs.chmodSync(fakeDocker, 0o755);
  process.env.PATH = `${binDir}${path.delimiter}${process.env.PATH}`;

  const validSnapshot = createValidSnapshot(backupRoot, '2026-09-07T00-00-00Z');
  const partialSnapshot = path.join(backupRoot, '.partial-9999-12-31T23-59-59Z');
  fs.mkdirSync(partialSnapshot);
  fs.writeFileSync(path.join(partialSnapshot, '_manifest.json'), '{"archives":[]}\n', 'utf8');
  const valid = invokeVerifier(tempRoot, backupRoot);
  assert.equal(valid.result.status, 0, valid.result.stderr || valid.result.stdout);
  assert.equal(valid.report?.ok, true);
  assert.equal(valid.report?.snapshotDir, validSnapshot);

  const missingSnapshot = createValidSnapshot(backupRoot, 'missing');
  fs.unlinkSync(path.join(missingSnapshot, 'mysql.sql'));
  const missing = invokeVerifier(tempRoot, backupRoot, missingSnapshot);
  assert.equal(missing.result.status, 1);
  assert.match(failedCheck(missing.report, 'mysql_logical')?.error || '', /missing/i);

  const wrongSizeSnapshot = createValidSnapshot(backupRoot, 'wrong-size');
  const wrongSizeManifest = JSON.parse(fs.readFileSync(path.join(wrongSizeSnapshot, '_manifest.json'), 'utf8'));
  wrongSizeManifest.archives[0].sizeBytes += 1;
  writeManifest(wrongSizeSnapshot, wrongSizeManifest.archives);
  const wrongSize = invokeVerifier(tempRoot, backupRoot, wrongSizeSnapshot);
  assert.equal(wrongSize.result.status, 1);
  assert.match(failedCheck(wrongSize.report, 'mysql_logical')?.error || '', /size mismatch/i);

  const traversalSnapshot = createValidSnapshot(backupRoot, 'traversal');
  const escapedPath = path.join(backupRoot, 'escaped.sql');
  fs.writeFileSync(escapedPath, '-- MySQL dump\n', 'utf8');
  writeManifest(traversalSnapshot, [
    { id: 'escaped', archivePath: '../escaped.sql', sizeBytes: fs.statSync(escapedPath).size },
  ]);
  const traversal = invokeVerifier(tempRoot, backupRoot, traversalSnapshot);
  assert.equal(traversal.result.status, 1);
  assert.match(failedCheck(traversal.report, 'escaped')?.error || '', /escapes/i);

  const legacySnapshot = createValidSnapshot(backupRoot, 'legacy-absolute');
  const legacySqlPath = path.join(legacySnapshot, 'mysql.sql');
  writeManifest(legacySnapshot, [
    { id: 'legacy_mysql', archivePath: legacySqlPath, sizeBytes: fs.statSync(legacySqlPath).size },
  ]);
  const legacy = invokeVerifier(tempRoot, backupRoot, legacySnapshot);
  assert.equal(legacy.result.status, 0, legacy.result.stderr || legacy.result.stdout);
  assert.equal(legacy.report?.ok, true);

  const neo4jFailureSnapshot = createValidSnapshot(backupRoot, 'neo4j-failure');
  const neo4jFailure = invokeVerifier(tempRoot, backupRoot, neo4jFailureSnapshot, { FAKE_DOCKER_FAIL: '1' });
  assert.equal(neo4jFailure.result.status, 1);
  assert.match(failedCheck(neo4jFailure.report, 'neo4j_neo4j')?.error || '', /simulated neo4j-admin failure/i);

  process.stdout.write('OpenSPG backup verifier contract: PASS\n');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
