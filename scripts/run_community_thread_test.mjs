#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { answerQuestion } from './erp_knowledge_answer.mjs';

const ROOT = '/docker/openspg';
const PLAYWRIGHT_HOME = '/tmp/erp-kb-playwright';
const SEED = [
  {
    id: 'C001',
    expectedPrimaryKb: 'ComarchOptimaReference',
    title: 'Preliminarz płatności',
    url: 'https://spolecznosc.comarch.pl/question/preliminarz-platnosci-77037',
  },
  {
    id: 'C002',
    expectedPrimaryKb: 'ComarchOptimaReference',
    title: 'Jak odblokować wyeksportowane dokumenty?',
    url: 'https://www.spolecznosc.comarch.pl/question/jak-odblokowac-wyeksportowane-dokumenty-8057',
  },
  {
    id: 'C003',
    expectedPrimaryKb: 'ComarchOptimaSchema',
    title: 'nie można wysłac jpk-nie zgodne ze schematem xsd',
    url: 'https://www.spolecznosc.comarch.pl/question/nie-mozna-wyslac-jpk-nie-zgodne-ze-schematem-xsd-44851',
  },
  {
    id: 'C004',
    expectedPrimaryKb: 'ComarchOptimaPartnerTechnical',
    title: 'KSEF nie działa',
    url: 'https://www.spolecznosc.comarch.pl/question/ksef-nie-dziala-77547',
  },
  {
    id: 'C005',
    expectedPrimaryKb: 'ComarchOptimaReference',
    title: 'Import danych kadrowych z pliku kedu',
    url: 'https://www.spolecznosc.comarch.pl/question/Import-danych-kadrowych-z-pliku-kedu-60423',
  },
  {
    id: 'C006',
    expectedPrimaryKb: 'ComarchOptimaReference',
    title: 'format listy na dokumentach',
    url: 'https://spolecznosc.comarch.pl/question/format-listy-na-dokumentach-34497',
  },
  {
    id: 'C007',
    expectedPrimaryKb: 'ComarchOptimaPartnerTechnical',
    title: 'Wysyłanie faktur do KSeF - błąd',
    url: 'https://spolecznosc.comarch.pl/question/wysylanie-faktur-do-ksef-blad-78367',
  },
  {
    id: 'C008',
    expectedPrimaryKb: 'ComarchOptimaSchema',
    title: 'Rejestr sprzedaży polska faktura w EUR różnice groszowe w VAT',
    url: 'https://spolecznosc.comarch.pl/question/rejestr-sprzedazy-polska-faktura-w-eur-roznice-groszowe-w-vat-72704',
  },
];

function ensurePlaywrightHome() {
  fs.mkdirSync(PLAYWRIGHT_HOME, { recursive: true });
  const packageJson = path.join(PLAYWRIGHT_HOME, 'package.json');
  if (!fs.existsSync(packageJson)) {
    fs.writeFileSync(
      packageJson,
      JSON.stringify({ name: 'erp-kb-playwright-runtime', private: true, version: '1.0.0' }, null, 2) + '\n',
      'utf8',
    );
  }

  const moduleDir = path.join(PLAYWRIGHT_HOME, 'node_modules', 'playwright');
  if (!fs.existsSync(moduleDir)) {
    execFileSync('npm', ['install', 'playwright'], {
      cwd: PLAYWRIGHT_HOME,
      stdio: 'inherit',
    });
  }
}

function classifyResult(expectedPrimaryKb, actualPrimaryKb, evidenceCount) {
  if (expectedPrimaryKb === actualPrimaryKb && evidenceCount > 0) return 'PASS';
  if (expectedPrimaryKb === actualPrimaryKb) return 'PARTIAL';
  return 'MISS';
}

function summarize(results) {
  const summary = { PASS: 0, PARTIAL: 0, MISS: 0 };
  for (const row of results) summary[row.status] += 1;
  return summary;
}

function buildMarkdown(results, summary) {
  const lines = [
    '# ERP Knowledge Assistant Community Full Thread Test Pack',
    '',
    `Date: \`${new Date().toISOString().slice(0, 10)}\``,
    '',
    '## Summary',
    '',
    `- PASS: \`${summary.PASS}\``,
    `- PARTIAL: \`${summary.PARTIAL}\``,
    `- MISS: \`${summary.MISS}\``,
    '',
    '## Results',
    '',
  ];

  for (const row of results) {
    lines.push(`### ${row.id} ${row.status}`);
    lines.push('');
    lines.push(`- Title: ${row.title}`);
    lines.push(`- Expected primary KB: \`${row.expectedPrimaryKb}\``);
    lines.push(`- Actual primary KB: \`${row.actualPrimaryKb}\``);
    lines.push(`- Matched intent: \`${row.matchedIntent}\``);
    if (row.matchedKeywords.length) {
      lines.push(`- Matched keywords: \`${row.matchedKeywords.join('`, `')}\``);
    }
    if (row.supportKbs.length) {
      lines.push(`- Support KBs: \`${row.supportKbs.join('`, `')}\``);
    }
    lines.push(`- Evidence count: \`${row.evidenceCount}\``);
    lines.push(`- Source: ${row.url}`);
    lines.push(`- Excerpt: ${row.excerpt}`);
    lines.push('');
  }

  return lines.join('\n');
}

async function extractCommunityThreads(playwright) {
  const { chromium } = playwright;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const results = [];
  let cookiesAccepted = false;

  for (const item of SEED) {
    await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (!cookiesAccepted) {
      const button = page.getByText('Zaakceptuj wszystkie');
      if (await button.count()) {
        await button.click().catch(() => {});
        await page.waitForTimeout(1500);
      }
      cookiesAccepted = true;
    }
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2500);

    const body = await page.locator('body').innerText();
    const lines = body.split('\n').map((line) => line.trim()).filter(Boolean);
    const titleIndex = lines.findIndex((line) => line === item.title || line === item.title.replace(/\?$/, ''));
    const excerpt = (titleIndex >= 0 ? lines.slice(titleIndex, Math.min(lines.length, titleIndex + 14)) : lines.slice(0, 20)).join(' ');
    const prompt = `${item.title}\n${excerpt}`;
    const routed = await answerQuestion(prompt);

    results.push({
      ...item,
      actualPrimaryKb: routed.answer.primaryKb,
      supportKbs: routed.answer.supportKbs,
      matchedIntent: routed.response.matchedIntent,
      matchedKeywords: routed.response.matchedKeywords,
      evidenceCount: routed.answer.evidence.length,
      excerpt: excerpt.slice(0, 900),
      status: classifyResult(item.expectedPrimaryKb, routed.answer.primaryKb, routed.answer.evidence.length),
    });
  }

  await browser.close();
  return results;
}

async function main() {
  ensurePlaywrightHome();
  const playwright = await import(path.join(PLAYWRIGHT_HOME, 'node_modules/playwright/index.mjs'));
  const results = await extractCommunityThreads(playwright);
  const summary = summarize(results);

  const outJson = path.join(ROOT, 'docs/reference/ERP_Knowledge_Assistant_Community_FullThread_TestPack.json');
  const outMd = path.join(ROOT, 'docs/reference/ERP_Knowledge_Assistant_Community_FullThread_TestPack.md');

  fs.writeFileSync(outJson, JSON.stringify({
    generatedAt: new Date().toISOString(),
    summary,
    results,
  }, null, 2) + '\n', 'utf8');
  fs.writeFileSync(outMd, buildMarkdown(results, summary) + '\n', 'utf8');

  console.log(JSON.stringify(summary, null, 2));
  console.log(`Wrote: ${outJson}`);
  console.log(`Wrote: ${outMd}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
