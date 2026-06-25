#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { listInboxDrafts } from './lib/promoted_knowledge.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';

function usage() {
  return [
    'Usage:',
    '  node scripts/process_knowledge_inbox.mjs --promote <draftId[,draftId]> --build',
    '  node scripts/process_knowledge_inbox.mjs --kb <kbNamespace> --export --build --test',
    '  node scripts/process_knowledge_inbox.mjs --status',
    '',
    'Options:',
    '  --promote <ids>       Promote comma-separated draft ids',
    '  --kb <namespaces>     Comma-separated target KB namespaces',
    '  --all                 Target all namespaces',
    '  --export              Run exporters',
    '  --build               Run OpenSPG builders',
    '  --test                Run regression testpack after pipeline',
    '  --quality-gate        Run KB quality gate after pipeline',
    '  --freshness           Run source freshness report after pipeline',
    '  --test-size <n>       Testpack size, default 20',
    '  --note <text>         Review note for promoted drafts',
    '  --by <operator>       Operator name for promoted drafts',
    '  --dry-run             Print planned pipeline actions only',
    '',
    'Defaults:',
    '  --export is implied when --promote is used',
    '  --test is implied after a real --build unless --no-test is provided',
    '  --quality-gate is implied after a real --build unless --no-quality-gate is provided',
    '  --freshness is available on demand for source-state reporting',
  ].join('\n');
}

function hasArg(args, name) {
  return args.includes(name);
}

function valuesFor(args, name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name && args[index + 1]) {
      values.push(args[index + 1]);
      index += 1;
    }
  }
  return values;
}

function valueFor(args, name, fallback = '') {
  return valuesFor(args, name)[0] || fallback;
}

function runNode(args, env = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    env: { ...process.env, ROOT, ...env },
    encoding: 'utf8',
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`${args.join(' ')} exited with ${result.status}`);
  }
}

const args = process.argv.slice(2);

try {
  if (!args.length || hasArg(args, '--help')) {
    process.stdout.write(`${usage()}\n`);
    process.exit(0);
  }

  if (hasArg(args, '--status')) {
    runNode(['scripts/run_knowledge_inbox_pipeline.mjs', '--status']);
    process.exit(0);
  }

  const pipelineArgs = ['scripts/run_knowledge_inbox_pipeline.mjs'];
  const promoteValues = valuesFor(args, '--promote');
  const kbValues = valuesFor(args, '--kb');
  const shouldPromote = promoteValues.length > 0;
  const dryRun = hasArg(args, '--dry-run');
  const shouldBuild = hasArg(args, '--build');
  const shouldExport = hasArg(args, '--export') || shouldPromote || shouldBuild;
  const shouldTest = hasArg(args, '--test') || (shouldBuild && !dryRun && !hasArg(args, '--no-test'));
  const shouldQualityGate = hasArg(args, '--quality-gate') || (shouldBuild && !dryRun && !hasArg(args, '--no-quality-gate'));
  const shouldFreshness = hasArg(args, '--freshness');
  const promotedDraftNamespaces = new Set();
  if (promoteValues.length) {
    const drafts = listInboxDrafts();
    for (const promoteValue of promoteValues) {
      for (const draftId of promoteValue.split(',').map((value) => value.trim()).filter(Boolean)) {
        const draft = drafts.find((item) => item.id === draftId);
        if (draft) promotedDraftNamespaces.add(draft.kbNamespace);
      }
    }
  }

  for (const value of promoteValues) pipelineArgs.push('--promote', value);
  for (const value of kbValues) pipelineArgs.push('--kb', value);
  if (hasArg(args, '--all')) pipelineArgs.push('--all');
  if (shouldExport) pipelineArgs.push('--export');
  if (shouldBuild) pipelineArgs.push('--build');
  if (dryRun) pipelineArgs.push('--dry-run');
  if (hasArg(args, '--force')) pipelineArgs.push('--force');
  if (valueFor(args, '--note')) pipelineArgs.push('--note', valueFor(args, '--note'));
  if (valueFor(args, '--by')) pipelineArgs.push('--by', valueFor(args, '--by'));

  runNode(pipelineArgs);

  if (shouldQualityGate) {
    const qualityArgs = ['scripts/kb_quality_gate.mjs'];
    if (hasArg(args, '--all')) {
      qualityArgs.push('--all');
    } else {
      for (const value of kbValues) qualityArgs.push('--kb', value);
      if (!kbValues.length) {
        for (const namespace of promotedDraftNamespaces) qualityArgs.push('--kb', namespace);
      }
      if (!kbValues.length && !promotedDraftNamespaces.size) qualityArgs.push('--all');
    }
    runNode(qualityArgs);
  }

  if (shouldTest) {
    const testSize = Number(valueFor(args, '--test-size', '20'));
    runNode([
      'scripts/run_erp_knowledge_testpack.mjs',
      '--size',
      Number.isFinite(testSize) && testSize > 0 ? String(testSize) : '20',
    ], {
      EXA_AUTO_DRAFT: '0',
    });
  }

  if (shouldFreshness) {
    runNode(['scripts/source_freshness_report.mjs']);
  }
} catch (error) {
  process.stderr.write(`${error.message}\n\n${usage()}\n`);
  process.exit(1);
}
