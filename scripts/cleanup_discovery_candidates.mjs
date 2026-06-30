#!/usr/bin/env node

import process from 'process';
import { retroCleanDiscoveryCandidates } from './lib/dashboard_discovery.mjs';

function argValue(args, name, fallback = '') {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] || fallback;
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limit = Number(argValue(args, '--limit', '5000')) || 5000;
const operator = argValue(args, '--by', process.env.USER || 'cleanup');

const result = await retroCleanDiscoveryCandidates({ limit, operator, dryRun });
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
