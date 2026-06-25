#!/usr/bin/env node

import { buildExternalDraftContent, searchExternalSources } from './lib/external_search.mjs';
import { submitKnowledgeDraft } from './lib/knowledge_inbox.mjs';

function argValue(args, name, fallback = '') {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] || fallback;
}

function usage() {
  return [
    'Usage:',
    '  node scripts/discover_external_sources.mjs --kbName "..." --kbNamespace ComarchBetterflyReference --query "..." [--limit 3] [--tags a,b] [--domains a,b]',
  ].join('\n');
}

const args = process.argv.slice(2);
const kbName = argValue(args, '--kbName', '');
const kbNamespace = argValue(args, '--kbNamespace', '');
const query = argValue(args, '--query', '');
const limit = Number(argValue(args, '--limit', '3')) || 3;
const notes = argValue(args, '--notes', '');
const tags = String(argValue(args, '--tags', ''))
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const domains = String(argValue(args, '--domains', ''))
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

if (!kbName || !kbNamespace || !query) {
  process.stderr.write(`${usage()}\n`);
  process.exit(1);
}

const searchResult = await searchExternalSources({
  query,
  kbName,
  includeDomains: domains,
  numResults: limit,
  text: true,
  logContext: 'cli_discover_external_sources',
});

if (!searchResult.ok) {
  process.stdout.write(`${JSON.stringify(searchResult, null, 2)}\n`);
  process.exit(0);
}

const drafts = [];
for (const item of searchResult.results.slice(0, limit)) {
  const draft = await submitKnowledgeDraft({
    kbName,
    kbNamespace,
    title: item.title || query,
    content: buildExternalDraftContent({ query, result: item, notes }),
    sourceUrl: item.url,
    tags,
    metadata: {
      discoveredVia: 'exa',
      exaQuery: query,
      sourceTier: item.sourceType,
      retrievedAt: item.retrievedAt,
    },
  });
  drafts.push({
    draftId: draft.draft.id,
    title: draft.draft.title,
    sourceUrl: item.url,
    sourceTier: item.sourceType,
    jsonPath: draft.jsonPath,
    mdPath: draft.mdPath,
  });
}

process.stdout.write(`${JSON.stringify({
  ok: true,
  query,
  kbNamespace,
  draftedCount: drafts.length,
  drafts,
}, null, 2)}\n`);
