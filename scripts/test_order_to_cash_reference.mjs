#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { classifyQuestion } from './erp_knowledge_assistant.mjs';

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

const route = classifyQuestion(
  'Jak wygląda Order-to-Cash od zamówienia przez fakturę do rozliczenia płatności?',
  JSON.parse(fs.readFileSync(path.join(root, 'docs/reference/ERP_Knowledge_Assistant_Routing.json'), 'utf8')),
);
assert.equal(route.primaryRoute.primaryKb, 'OWAOntology');

process.stdout.write('Order-to-Cash reference tests passed.\n');
