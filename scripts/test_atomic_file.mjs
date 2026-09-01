#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assertAtomicWriteAccess, writeFileAtomically } from './lib/atomic_file.mjs';

if (process.argv[2] === '--replace-as-current-user') {
  const childTargetPath = process.argv[3];
  assert.throws(() => fs.writeFileSync(childTargetPath, 'direct write\n', 'utf8'), /EACCES|EPERM/);
  assertAtomicWriteAccess(childTargetPath);
  writeFileAtomically(childTargetPath, 'replaced by non-owner\n');
  process.exit(0);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspg-atomic-file-'));
const targetPath = path.join(tempDir, 'artifact.csv');
const currentUid = typeof process.getuid === 'function' ? process.getuid() : null;

try {
  fs.writeFileSync(targetPath, 'old\n', 'utf8');
  if (process.platform !== 'win32') {
    fs.chmodSync(targetPath, 0o444);
  }

  if (currentUid !== null && currentUid !== 0) {
    assert.throws(
      () => fs.writeFileSync(targetPath, 'direct write\n', 'utf8'),
      /EACCES|EPERM/,
      'fixture must reject direct writes',
    );
  }

  writeFileAtomically(targetPath, 'new\n');

  assert.equal(fs.readFileSync(targetPath, 'utf8'), 'new\n');
  if (currentUid !== null) {
    assert.equal(fs.statSync(targetPath).uid, currentUid);
  }

  if (currentUid === 0) {
    const nonRootUid = 65534;
    const nonRootGid = 65534;
    fs.chownSync(targetPath, nonRootUid, nonRootGid);
    writeFileAtomically(targetPath, 'root repair\n');
    const stat = fs.statSync(targetPath);
    assert.equal(stat.uid, nonRootUid, 'root repair must preserve the existing owner');
    assert.equal(stat.gid, nonRootGid, 'root repair must preserve the existing group');

    const rootOwnedPath = path.join(tempDir, 'root-owned-report.json');
    fs.writeFileSync(rootOwnedPath, '{}\n', { encoding: 'utf8', mode: 0o644 });
    fs.chownSync(rootOwnedPath, 0, 0);
    fs.chownSync(tempDir, nonRootUid, nonRootGid);
    const child = spawnSync(process.execPath, [new URL(import.meta.url).pathname, '--replace-as-current-user', rootOwnedPath], {
      encoding: 'utf8',
      uid: nonRootUid,
      gid: nonRootGid,
    });
    assert.equal(child.status, 0, child.stderr || child.stdout);
    assert.equal(fs.readFileSync(rootOwnedPath, 'utf8'), 'replaced by non-owner\n');
  }

  console.log('Atomic file replacement test passed.');
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
