#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'scripts/erp_kb_dashboard_server.mjs'), 'utf8');

assert.match(
  source,
  /ComarchOptimaBusinessSemantics:\s*\['business_description\.csv'\]/,
  'Dashboard KB builds must force the promoted Business Semantics description file.',
);

console.log('Dashboard Business Semantics force-file test passed.');
