#!/usr/bin/env node

import process from 'process';
import {
  getGaps,
  updateGapStatus,
  canCreateMoreDraftsToday,
  resolveDraftKb,
  inferKbName,
  MAX_DAILY_DRAFTS,
} from './lib/learning.mjs';
import {
  searchExternalSources,
  buildExternalDraftContent,
} from './lib/external_search.mjs';
import { submitKnowledgeDraft } from './lib/knowledge_inbox.mjs';
import { safeFetch } from './lib/safe_http.mjs';

const FETCH_TIMEOUT_MS = 15000;
const MAX_FETCH_BYTES = 1024 * 1024;

function usage() {
  return [
    'Usage:',
    '  node scripts/process_learning_gaps.mjs [--limit N] [--dry-run]',
    '',
    'Options:',
    '  --limit N     Process at most N gaps (default: all open)',
    '  --dry-run     Print actions without creating drafts',
    '',
  ].join('\n');
}

function argValue(args, name, fallback = '') {
  const index = args.indexOf(name);
  return index >= 0 ? (args[index + 1] || fallback) : fallback;
}

function hasArg(args, name) {
  return args.includes(name);
}

async function fetchUrlContent(url) {
  try {
    const response = await safeFetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'TaxbellKnowledgePanelLearningProcessor/1.0' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!response.ok || buffer.length > MAX_FETCH_BYTES) return '';
    const text = buffer.toString('utf8');
    return text
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return '';
  }
}

async function processOneGap(gap, { dryRun = false } = {}) {
  console.log(`\nProcessing gap: ${gap.id}`);
  console.log(`  Question: ${gap.question.slice(0, 80)}`);

  const external = await searchExternalSources({
    query: gap.question,
    kbName: '',
    numResults: 3,
    logContext: 'learning_gap',
  });

  if (!external.ok || !external.results.length) {
    console.log(`  No external sources found, marking as resolved`);
    if (!dryRun) updateGapStatus(gap.id, { targetKb: null, status: 'resolved' });
    return { gapId: gap.id, status: 'no_sources' };
  }

  const topResult = external.results[0];
  const fetchedContent = await fetchUrlContent(topResult.url);
  const fullContent = [
    `## Auto-discovered source for: ${gap.question}`,
    '',
    `> Source: ${topResult.title}`,
    `> URL: ${topResult.url}`,
    `> Domain: ${topResult.domain}`,
    '',
    fetchedContent || topResult.snippet || '',
    '',
    buildExternalDraftContent({
      query: gap.question,
      result: topResult,
      notes: `Auto-discovered via learning gap processor. Source KB routing: ${gap.routedKb || 'none'}`,
    }),
  ].join('\n');

  const targetKb = resolveDraftKb({ question: gap.question, content: fetchedContent || topResult.snippet || '' });
  console.log(`  Target KB: ${targetKb} (${inferKbName(targetKb)})`);

  if (dryRun) {
    console.log(`  [DRY RUN] Would create draft with ${external.resultCount} source(s), target: ${targetKb}`);
    return { gapId: gap.id, status: 'dry_run', targetKb, resultCount: external.resultCount };
  }

  const draft = await submitKnowledgeDraft({
    kbName: inferKbName(targetKb),
    kbNamespace: targetKb,
    title: gap.question,
    content: fullContent,
    sourceUrl: topResult.url,
    tags: ['auto-draft', 'learning-gap', ...(gap.routedKb ? [gap.routedKb] : [])],
    metadata: {
      discoveredVia: 'exa',
      exaQuery: gap.question,
      sourceTier: 'official',
      retrievedAt: new Date().toISOString(),
    },
  });

  updateGapStatus(gap.id, { draftId: draft.draft?.id || null, targetKb, status: 'drafted' });
  console.log(`  Draft created: ${draft.draft?.id || 'unknown'}`);
  return { gapId: gap.id, status: 'drafted', draftId: draft.draft?.id, targetKb, resultCount: external.resultCount };
}

async function main() {
  const args = process.argv.slice(2);
  if (hasArg(args, '--help')) {
    process.stdout.write(usage());
    return;
  }

  const limit = Number(argValue(args, '--limit', '')) || 0;
  const dryRun = hasArg(args, '--dry-run');

  const openGaps = getGaps({ status: 'open', limit: limit || undefined });
  if (!openGaps.length) {
    console.log('No open gaps to process.');
    return;
  }

  if (!dryRun && !canCreateMoreDraftsToday()) {
    console.log(`Daily draft limit (${MAX_DAILY_DRAFTS}) reached. Use --dry-run to preview or adjust LEARNING_MAX_DAILY_DRAFTS.`);
    process.exit(1);
  }

  console.log(`Processing ${openGaps.length} open gap(s)${dryRun ? ' (DRY RUN)' : ''}...`);
  const results = [];
  for (const gap of openGaps) {
    if (!dryRun && !canCreateMoreDraftsToday()) {
      console.log(`\nDaily draft limit reached, stopping.`);
      break;
    }
    const result = await processOneGap(gap, { dryRun });
    results.push(result);
  }

  const drafted = results.filter((r) => r.status === 'drafted').length;
  const skipped = results.filter((r) => r.status === 'no_sources').length;
  console.log(`\nDone. Drafted: ${drafted}, No sources: ${skipped}, Total processed: ${results.length}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
