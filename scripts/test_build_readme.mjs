#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { refreshBuildReadme } from './lib/build_runner_core.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'build-readme-'));
const readmePath = path.join(root, 'README.md');

refreshBuildReadme({
  title: 'Test KB',
  readmePath,
  exportManifest: { files: [] },
  uploadManifest: { files: [] },
  buildManifest: { jobs: [] },
});

const readme = fs.readFileSync(readmePath, 'utf8');
assert.equal(readme.endsWith('\n\n'), false, 'Build README must not end with a blank line.');
assert.equal(readme.endsWith('\n'), true, 'Build README must end with one newline.');

console.log('Build README tests passed.');
