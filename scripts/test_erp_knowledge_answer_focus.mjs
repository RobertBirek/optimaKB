#!/usr/bin/env node

import assert from 'node:assert/strict';
import { extractFocusHints } from './erp_knowledge_answer.mjs';

assert.deepEqual(
  extractFocusHints('Opisz CDN.EDNKSeFPodmioty3, CDN.PerformanceLog i dbo.TaxOptShp.'),
  ['cdn.ednksefpodmioty3', 'cdn.performancelog', 'dbo.taxoptshp'],
);
assert.deepEqual(extractFocusHints('Jak działa faktura sprzedaży?'), []);

process.stdout.write('ERP knowledge answer focus tests passed.\n');
