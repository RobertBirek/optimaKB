#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readMssqlConnectionString } from './lib/mssql_connection_string.mjs';

assert.equal(readMssqlConnectionString({ MSSQL_CONNECTION_STRING: 'Server=direct;' }), 'Server=direct;');
assert.throws(() => readMssqlConnectionString({}), /MSSQL_CONNECTION_STRING/);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mssql-connection-'));
try {
  const filePath = path.join(tempDir, 'connection-string');
  fs.writeFileSync(filePath, 'Server=from-file;\n', { mode: 0o600 });
  assert.equal(readMssqlConnectionString({ MSSQL_CONNECTION_STRING_FILE: filePath }), 'Server=from-file;');
  assert.equal(
    readMssqlConnectionString({
      MSSQL_CONNECTION_STRING: 'Server=direct;',
      MSSQL_CONNECTION_STRING_FILE: filePath,
    }),
    'Server=direct;',
  );
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

process.stdout.write('MSSQL connection string tests passed.\n');
