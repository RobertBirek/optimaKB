#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { answerQuestion } from './erp_knowledge_answer.mjs';

const ROOT = '/docker/openspg';
const JSON_OUT = path.join(ROOT, 'docs/reference/ComarchCommunityNews_TestPack.json');
const MD_OUT = path.join(ROOT, 'docs/reference/ComarchCommunityNews_TestReport.md');

const QUESTIONS = [
  { id: 'CN001', expectedPrimaryKb: 'ComarchCommunityNews', question: 'Czy była ostatnio przerwa techniczna w Comarch OCR?' },
  { id: 'CN002', expectedPrimaryKb: 'ComarchCommunityNews', question: 'Jaka nowa wersja Comarch TNA została ostatnio opublikowana?' },
  { id: 'CN003', expectedPrimaryKb: 'ComarchCommunityNews', question: 'Czy są planowane wersje Comarch ERP Optima na rok 2026?' },
  { id: 'CN004', expectedPrimaryKb: 'ComarchCommunityNews', question: 'Czy na społeczności był ostatnio komunikat o KSeF w Optimie?' },
  { id: 'CN005', expectedPrimaryKb: 'ComarchCommunityNews', question: 'Czy były ostatnio newsy o Comarch Betterfly?' },
  { id: 'CN006', expectedPrimaryKb: 'ComarchCommunityNews', question: 'Czy był komunikat serwisowy o Comarch OCR?' },
  { id: 'CN007', expectedPrimaryKb: 'ComarchCommunityNews', question: 'Jakie publiczne aktualności były ostatnio dla Comarch ERP XL?' },
  { id: 'CN008', expectedPrimaryKb: 'ComarchCommunityNews', question: 'Czy były ostatnio newsy o nowej wersji Optimy?' },
  { id: 'CN009', expectedPrimaryKb: 'ComarchCommunityNews', question: 'Czy na społeczności jest wpis KSeF w Comarch ERP Optima pod lupą?' },
  { id: 'CN010', expectedPrimaryKb: 'ComarchCommunityNews', question: 'Czy były ostatnio prace serwisowe albo niedostępność usług Comarch?' },
  { id: 'CN011', expectedPrimaryKb: 'ComarchCommunityNews', question: 'Jakie tematy newsów dominują ostatnio w społeczności Comarch?' },
  { id: 'CN012', expectedPrimaryKb: 'ComarchCommunityNews', question: 'Czy publiczne newsy wspominają Comarch OCR, KSeF albo Betterfly?' },
  { id: 'CN013', expectedPrimaryKb: 'ComarchCommunityNews', question: 'Czy był ostatnio wpis o premierze nowej wersji produktu Comarch?' },
  { id: 'CN014', expectedPrimaryKb: 'ComarchCommunityNews', question: 'Jakie komunikaty publiczne dotyczą usług albo chmury Comarch?' },
  { id: 'CN015', expectedPrimaryKb: 'ComarchCommunityNews', question: 'Czy są na społeczności newsy o Comarch Data Editor?' },
  { id: 'CN016', expectedPrimaryKb: 'ComarchCommunityNews', question: 'Czy są publiczne aktualności o Comarch IBARD?' },
  { id: 'CN017', expectedPrimaryKb: 'ComarchCommunityNews', question: 'Jakie newsy publiczne dotyczą kategorii Nowa wersja?' },
  { id: 'CN018', expectedPrimaryKb: 'ComarchCommunityNews', question: 'Czy społeczność publikuje komunikaty o awariach i przerwach technicznych?' },
  { id: 'CN019', expectedPrimaryKb: 'ComarchCommunityNews', question: 'Jakie publiczne newsy dotyczą Comarch ERP Optima i KSeF?' },
  { id: 'CN020', expectedPrimaryKb: 'ComarchCommunityNews', question: 'Czy są publiczne newsy o Comarch TNA, OCR i Betterfly?' },
];

function evaluate(test, result) {
  const actual = result.answer.primaryKb;
  const evidenceCount = result.answer.evidence.length;
  if (actual === test.expectedPrimaryKb && evidenceCount > 0) return 'PASS';
  if (actual === test.expectedPrimaryKb || result.answer.supportKbs.includes(test.expectedPrimaryKb)) return 'PARTIAL';
  return 'MISS';
}

function buildReport(results) {
  const counts = { PASS: 0, PARTIAL: 0, MISS: 0 };
  for (const row of results) counts[row.status] += 1;
  const lines = [
    '# ComarchCommunityNews Test Report',
    '',
    `Generated at: ${new Date().toISOString()}`,
    '',
    `- PASS: ${counts.PASS}`,
    `- PARTIAL: ${counts.PARTIAL}`,
    `- MISS: ${counts.MISS}`,
    '',
    '## Results',
    '',
  ];
  for (const row of results) {
    lines.push(`- ${row.id} ${row.status} -> expected \`${row.expectedPrimaryKb}\`, actual \`${row.actualPrimaryKb}\``);
    lines.push(`  - question: ${row.question}`);
    lines.push(`  - evidence: ${row.evidenceCount}`);
    if (row.topEvidence) lines.push(`  - top evidence: ${row.topEvidence}`);
  }
  return lines.join('\n') + '\n';
}

const results = [];
for (const item of QUESTIONS) {
  const result = await answerQuestion(item.question);
  const status = evaluate(item, result);
  results.push({
    ...item,
    status,
    actualPrimaryKb: result.answer.primaryKb,
    supportKbs: result.answer.supportKbs,
    evidenceCount: result.answer.evidence.length,
    topEvidence: result.answer.evidence[0]
      ? `${result.answer.evidence[0].kb} -> ${result.answer.evidence[0].artifact}`
      : '',
    matchedIntent: result.response.matchedIntent,
    matchedKeywords: result.response.matchedKeywords,
  });
}

fs.writeFileSync(JSON_OUT, `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`, 'utf8');
fs.writeFileSync(MD_OUT, buildReport(results), 'utf8');

const summary = results.reduce((acc, row) => {
  acc[row.status] += 1;
  return acc;
}, { PASS: 0, PARTIAL: 0, MISS: 0 });

process.stdout.write(`${JSON.stringify({ ok: true, json: JSON_OUT, md: MD_OUT, summary }, null, 2)}\n`);
