#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

import {
  findOptimaReferenceCleanupCandidates,
  withdrawOptimaReferenceDuplicatePromotedDrafts,
} from './lib/optima_reference_duplicates.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';
const OUT_JSON = path.join(ROOT, 'docs/reference/Optima_Reference_Duplicate_Cleanup_Report.json');
const OUT_MD = path.join(ROOT, 'docs/reference/Optima_Reference_Duplicate_Cleanup_Report.md');

function renderMarkdown(report) {
  const lines = [
    '# Optima Reference Duplicate Cleanup Report',
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    `Overall: \`${report.overall}\``,
    `Candidates: \`${report.candidateCount}\``,
    `Withdrawn: \`${report.withdrawnCount}\``,
    `Skipped: \`${report.skippedCount}\``,
    '',
  ];
  if (report.withdrawn.length) {
    lines.push('## Withdrawn', '');
    for (const item of report.withdrawn) {
      lines.push(`- \`${item.draftId}\` ${item.title} -> ${item.sourceUrl}`);
    }
    lines.push('');
  }
  if (report.skipped.length) {
    lines.push('## Skipped', '');
    for (const item of report.skipped) {
      lines.push(`- \`${item.draftId}\` ${item.error}`);
    }
    lines.push('');
  }
  if (!report.candidateCount) {
    lines.push('No duplicate promoted drafts matched official Optima Reference URLs.', '');
  }
  return `${lines.join('\n')}\n`;
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  const candidates = findOptimaReferenceCleanupCandidates({ root: ROOT });
  const report = {
    generatedAt: new Date().toISOString(),
    overall: dryRun ? (candidates.length ? 'READY' : 'OK') : 'PENDING',
    root: ROOT,
    dryRun,
    candidateCount: candidates.length,
    withdrawnCount: 0,
    skippedCount: 0,
    candidates,
    withdrawn: [],
    skipped: [],
  };

  if (dryRun) {
    report.skippedCount = 0;
    fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
    fs.writeFileSync(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    fs.writeFileSync(OUT_MD, renderMarkdown(report), 'utf8');
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  const result = withdrawOptimaReferenceDuplicatePromotedDrafts({ root: ROOT, operator: process.env.USER || 'cron' });
  const finalReport = {
    ...report,
    overall: result.overall,
    withdrawnCount: result.withdrawnCount,
    skippedCount: result.skippedCount,
    withdrawn: result.withdrawn,
    skipped: result.skipped,
  };
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(finalReport, null, 2)}\n`, 'utf8');
  fs.writeFileSync(OUT_MD, renderMarkdown(finalReport), 'utf8');
  process.stdout.write(`${JSON.stringify(finalReport, null, 2)}\n`);
}

main();
