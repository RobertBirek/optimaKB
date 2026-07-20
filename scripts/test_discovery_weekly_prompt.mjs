#!/usr/bin/env node

import assert from 'assert';
import { buildWeeklyPlannerPrompt } from './lib/discovery_weekly_prompt.mjs';

const hugeByQuery = Object.fromEntries(
  Array.from({ length: 120 }, (_, index) => [
    `generated_query_${index}`,
    {
      candidates: 10 + index,
      reviewed: 5,
      duplicates: index % 4,
      accepted: 5,
      rejected: 0,
      holdsResolved: 0,
      evaluable: 5,
      agreed: 5,
      agreement: 1,
      falsePositives: 0,
      falseNegatives: 0,
    },
  ]),
);

const prompt = buildWeeklyPlannerPrompt({
  generatedQueriesPerKb: 3,
  profiles: [
    {
      kbNamespace: 'ComarchOptimaReference',
      mode: 'DIRECT_DRAFT',
      topics: ['instrukcje', 'aktualizacje', 'obsluga programu'],
      domains: ['pomoc.comarch.pl', 'comarch.pl'],
      communityDomains: ['spolecznosc.comarch.pl'],
      professionalDomains: [],
    },
  ],
}, {
  candidateStats: {
    ComarchOptimaReference: {
      total: 50,
      pending: 12,
      drafted: 20,
      corpusDuplicates: 15,
      operatorReviewed: 8,
      operatorRejected: 0,
      recentReasons: Array.from({ length: 20 }, (_, index) => `reason ${index}`),
    },
  },
  queryStats: Array.from({ length: 60 }, (_, index) => ({
    id: `query_${index}`,
    kbNamespace: 'ComarchOptimaReference',
    source: index < 3 ? 'seed' : 'generated',
    lastResultCount: 3,
    lastCorpusDuplicateCount: index % 3,
    emptyRuns: 0,
    enabled: true,
  })),
  feedback: {
    overall: { reviewed: 92, agreement: 1 },
    calibration: { target: 30, size: 30, reviewed: 17, pending: 13 },
    byKb: {
      ComarchOptimaReference: { reviewed: 9, accepted: 9, agreement: 1 },
    },
    byTier: {
      official: { reviewed: 77, agreement: 1 },
    },
    byAction: {
      CREATE_DRAFT: { reviewed: 62, agreement: 1 },
    },
    byQuery: hugeByQuery,
    recentNotes: Array.from({ length: 20 }, (_, index) => `note ${index}`),
  },
  learning: {
    overall: { reviewed: 8, kbNamespaces: 1 },
    byKbNamespace: {
      ComarchCommunityNews: {
        reviewed: 8,
        baseThreshold: 0.6,
        tunedBaseline: 0.5,
        windowFpRate: 0,
        windowSize: 8,
      },
    },
    highlights: {
      guardedKbNamespaces: [],
      reroutePairs: [],
    },
  },
  reports: Array.from({ length: 10 }, (_, index) => ({
    path: `report_${index}.json`,
    generatedAt: '2026-07-20T00:00:00.000Z',
    overall: 'PASS',
    summary: { veryLarge: 'x'.repeat(500) },
  })),
});

assert(prompt.includes('ComarchOptimaReference'), 'Prompt should preserve KB namespace context.');
assert(prompt.length < 15000, `Weekly planner prompt budget exceeded: ${prompt.length}`);

process.stdout.write(`${JSON.stringify({ ok: true, promptChars: prompt.length }, null, 2)}\n`);
