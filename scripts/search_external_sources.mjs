#!/usr/bin/env node

import { searchExternalSources } from './lib/external_search.mjs';

function argValue(args, name, fallback = '') {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] || fallback;
}

function usage() {
  return [
    'Usage:',
    '  node scripts/search_external_sources.mjs "query" [--kb <kbName>] [--limit <n>] [--domains a,b,c] [--json]',
  ].join('\n');
}

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const kbName = argValue(args, '--kb', '');
const limit = Number(argValue(args, '--limit', '5')) || 5;
const domains = String(argValue(args, '--domains', ''))
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const query = args.filter((arg, index) => {
  if (arg.startsWith('--')) return false;
  const prev = args[index - 1];
  return !prev || !prev.startsWith('--');
}).join(' ').trim();

if (!query) {
  process.stderr.write(`${usage()}\n`);
  process.exit(1);
}

const result = await searchExternalSources({
  query,
  kbName,
  includeDomains: domains,
  numResults: limit,
  text: true,
  logContext: 'cli_search_external_sources',
});

if (asJson) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}

if (!result.ok) {
  process.stdout.write(`External search unavailable: ${result.message}\n`);
  process.exit(0);
}

for (const [index, item] of result.results.entries()) {
  process.stdout.write([
    `${index + 1}. [${item.sourceType}] ${item.title}`,
    `   URL: ${item.url}`,
    item.publishedDate ? `   Published: ${item.publishedDate}` : '',
    item.snippet ? `   Snippet: ${item.snippet}` : '',
  ].filter(Boolean).join('\n') + '\n');
}
