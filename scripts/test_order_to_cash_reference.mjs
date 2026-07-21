#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.env.ROOT || process.cwd();
const filePath = path.join(root, 'docs/reference/OWA_Order_to_Cash_v1.md');
const content = fs.readFileSync(filePath, 'utf8');

for (const required of [
  'owa.process.order_to_cash.v1',
  'SalesOrder',
  'GoodsIssue',
  'SalesInvoice',
  'Receivable',
  'Payment',
  'Settlement',
  'preview -> approval -> commit',
  'Scenariusze akceptacyjne',
  'WYMAGA EKSPERTA',
]) {
  assert.ok(content.includes(required), `Missing Order-to-Cash contract element: ${required}`);
}

process.stdout.write('Order-to-Cash reference tests passed.\n');
