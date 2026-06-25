#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import process from 'process';

const ROOT = process.env.ROOT || '/docker/openspg';
const OUT_DIR = path.join(ROOT, 'docs/reference');
const REPORT_JSON = path.join(OUT_DIR, 'Official_Reference_Delta_Refresh_Report.json');
const REPORT_MD = path.join(OUT_DIR, 'Official_Reference_Delta_Refresh_Report.md');
const USER_AGENT = process.env.OFFICIAL_REFRESH_USER_AGENT || 'Taxbell ERP KB freshness monitor/1.0';
const DEFAULT_TIMEOUT_MS = Number(process.env.OFFICIAL_REFRESH_TIMEOUT_MS || 20000);

const TARGETS = {
  optima: {
    key: 'optima',
    namespace: 'ComarchOptimaReference',
    name: 'Comarch Optima Reference',
    sourceRoot: 'downloads/official/optima_reference',
    registryPath: 'downloads/official/optima_reference/meta/source_registry.json',
    exportDir: 'exports/optima_reference/v1',
    exportScript: 'scripts/export_optima_reference.mjs',
    buildScript: 'scripts/build_optima_reference.mjs',
    buildEnv: {
      OPENSPG_PROJECT_ID: '8',
      OPENSPG_NAMESPACE: 'ComarchOptimaReference',
      OPENSPG_JOB_PREFIX: 'CORF',
    },
  },
  betterfly: {
    key: 'betterfly',
    namespace: 'ComarchBetterflyReference',
    name: 'Comarch Betterfly Reference',
    sourceRoot: 'downloads/official/betterfly_reference',
    registryPath: 'downloads/official/betterfly_reference/meta/source_registry.json',
    exportDir: 'exports/betterfly_reference/v1',
    exportScript: 'scripts/export_betterfly_reference.mjs',
    buildScript: 'scripts/build_betterfly_reference.mjs',
    buildEnv: {
      OPENSPG_PROJECT_ID: '10',
      OPENSPG_NAMESPACE: 'ComarchBetterflyReference',
      OPENSPG_JOB_PREFIX: 'CBRF',
    },
  },
};

const OPTIMA_SOURCE_OVERRIDES = {
  'downloads/official/optima_reference/pages/opt057_strojenie_mssql_print.html': {
    sourceUrl: 'https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/opt057-strojenie-wydajnosciowe-baz-ms-sql-dla-comarch-erp-optima/?print=print',
  },
  'downloads/official/optima_reference/pages/opt074_kolumny_uzytkownika_print.html': {
    sourceUrl: 'https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/opt074-dodawanie-kolumn-uzytkownika-na-listach/?print=print',
  },
  'downloads/official/optima_reference/pages/spis_tresci_print.html': {
    sourceUrl: 'https://pomoc.comarch.pl/optima/pl/2026/spis-tresci/?print=print',
  },
  'downloads/official/optima_reference/pages/szkolenia_e_learningowe_print.html': {
    sourceUrl: 'https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/szkolenia-e_learningowe/?print=print',
  },
  'downloads/official/optima_reference/pages/wymagania_sprzetowe_print.html': {
    sourceUrl: 'https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/wymagania-sprzetowe-i-programowe/?print=print',
  },
  'downloads/official/optima_reference/sitemaps/optima_ht_kb_2.xml': {
    skipReason: 'Second ht_kb sitemap is not currently published by pomoc.comarch.pl; keep local historical snapshot but do not poll it.',
  },
};

function parseArgs(argv) {
  const args = {
    kb: 'all',
    build: false,
    dryRun: false,
    quality: false,
    freshness: false,
    test: false,
    maxSources: 0,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--kb') args.kb = argv[++index] || args.kb;
    else if (arg.startsWith('--kb=')) args.kb = arg.slice('--kb='.length);
    else if (arg === '--build') args.build = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--quality') args.quality = true;
    else if (arg === '--freshness') args.freshness = true;
    else if (arg === '--test') args.test = true;
    else if (arg === '--max-sources') args.maxSources = Number(argv[++index] || 0);
    else if (arg.startsWith('--max-sources=')) args.maxSources = Number(arg.slice('--max-sources='.length));
    else if (arg === '--timeout-ms') args.timeoutMs = Number(argv[++index] || DEFAULT_TIMEOUT_MS);
    else if (arg.startsWith('--timeout-ms=')) args.timeoutMs = Number(arg.slice('--timeout-ms='.length));
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/refresh_official_reference_delta.mjs [options]

Options:
  --kb optima|betterfly|all   Target KB, default: all
  --dry-run                  Probe URLs and report potential changes without writing snapshots
  --build                    Run OpenSPG build only for changed exported CSV files
  --quality                  Run KB quality gate after refresh/build
  --freshness                Regenerate source freshness report after refresh
  --test                     Run a small assistant testpack after refresh/build
  --max-sources N            Limit fetched sources, useful for smoke tests
  --timeout-ms N             HTTP fetch timeout, default from OFFICIAL_REFRESH_TIMEOUT_MS or 20000
`);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonIfExists(relativePathOrAbs, fallback = null) {
  const filePath = path.isAbsolute(relativePathOrAbs) ? relativePathOrAbs : path.join(ROOT, relativePathOrAbs);
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function sha256File(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return sha256Buffer(fs.readFileSync(filePath));
}

function listFilesRecursive(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const results = [];
  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.isFile()) results.push(fullPath);
    }
  }
  walk(rootDir);
  return results.sort((a, b) => a.localeCompare(b));
}

function fileHashMap(rootRelative) {
  const rootAbs = path.join(ROOT, rootRelative);
  const map = {};
  for (const filePath of listFilesRecursive(rootAbs)) {
    const relPath = path.relative(ROOT, filePath).replaceAll(path.sep, '/');
    map[relPath] = sha256File(filePath);
  }
  return map;
}

function changedKeys(before, after) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  return [...keys].filter((key) => before?.[key] !== after?.[key]).sort((a, b) => a.localeCompare(b));
}

function normalizeUrl(url) {
  return String(url || '').trim();
}

function optimaSitemapUrl(localSnapshotPath) {
  const base = path.basename(localSnapshotPath || '');
  if (base === 'optima_ht_kb_1.xml') return 'https://pomoc.comarch.pl/optima/pl/2026/wp-sitemap-posts-ht_kb-1.xml';
  if (base === 'optima_ht_kb_2.xml') return 'https://pomoc.comarch.pl/optima/pl/2026/wp-sitemap-posts-ht_kb-2.xml';
  if (base === 'optima_ht_kb_categories.xml') return 'https://pomoc.comarch.pl/optima/pl/2026/wp-sitemap-taxonomies-ht_kb_category-1.xml';
  return '';
}

function withPrintMode(url) {
  if (!url) return '';
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}print=print`;
}

function sourceTasksForTarget(target) {
  const registry = readJsonIfExists(target.registryPath, {});
  const tasksByPath = new Map();

  function addTask({ sourceUrl, localSnapshotPath, sourceType }) {
    const relPath = normalizeUrl(localSnapshotPath);
    const override = target.key === 'optima' ? OPTIMA_SOURCE_OVERRIDES[relPath] : null;
    if (override?.skipReason) return;
    const url = normalizeUrl(override?.sourceUrl || sourceUrl);
    if (!url || !relPath) return;
    if (!relPath.startsWith(target.sourceRoot)) return;
    tasksByPath.set(relPath, {
      sourceUrl: url,
      localSnapshotPath: relPath,
      sourceType: sourceType || 'official_source',
    });
  }

  for (const source of registry.sources || []) {
    if (target.key === 'optima' && source.sourceType === 'sitemap') {
      addTask({
        sourceUrl: optimaSitemapUrl(source.localSnapshotPath),
        localSnapshotPath: source.localSnapshotPath,
        sourceType: 'sitemap',
      });
      continue;
    }
    if (target.key === 'betterfly') {
      addTask({
        sourceUrl: source.canonicalUrl,
        localSnapshotPath: source.localSnapshotPath,
        sourceType: 'official_help_snapshot',
      });
    }
  }

  if (target.key === 'optima') {
    for (const doc of registry.referenceDocuments || []) {
      if (!doc.localSnapshotPath) continue;
      addTask({
        sourceUrl: withPrintMode(doc.sourceUrl),
        localSnapshotPath: doc.localSnapshotPath,
        sourceType: 'official_help_print_snapshot',
      });
    }
  }

  return [...tasksByPath.values()].sort((a, b) => a.localSnapshotPath.localeCompare(b.localSnapshotPath));
}

async function fetchBytes(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
      redirect: 'follow',
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      contentType: response.headers.get('content-type') || '',
      buffer,
      hash: sha256Buffer(buffer),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function refreshSources(target, args) {
  const tasks = sourceTasksForTarget(target);
  const selectedTasks = args.maxSources > 0 ? tasks.slice(0, args.maxSources) : tasks;
  const results = [];
  let changed = 0;
  let failed = 0;

  for (const task of selectedTasks) {
    const localPath = path.join(ROOT, task.localSnapshotPath);
    const oldHash = sha256File(localPath);
    try {
      const fetched = await fetchBytes(task.sourceUrl, args.timeoutMs);
      const wouldChange = fetched.ok && fetched.hash !== oldHash;
      if (wouldChange) changed += 1;
      if (fetched.ok && wouldChange && !args.dryRun) {
        ensureDir(path.dirname(localPath));
        fs.writeFileSync(localPath, fetched.buffer);
      }
      if (!fetched.ok) failed += 1;
      results.push({
        ...task,
        ok: fetched.ok,
        status: fetched.status,
        finalUrl: fetched.finalUrl,
        contentType: fetched.contentType,
        oldHash,
        newHash: fetched.hash,
        changed: wouldChange,
        written: Boolean(fetched.ok && wouldChange && !args.dryRun),
      });
    } catch (error) {
      failed += 1;
      results.push({
        ...task,
        ok: false,
        status: 0,
        error: error.message,
        changed: false,
        written: false,
      });
    }
  }

  return {
    totalKnownSources: tasks.length,
    checkedSources: selectedTasks.length,
    changedSources: changed,
    failedSources: failed,
    changedLocalPaths: results.filter((row) => row.changed).map((row) => row.localSnapshotPath),
    results,
  };
}

function runNodeScript(relativeScript, { env = {}, label, args = [] }) {
  const result = spawnSync('node', [path.join(ROOT, relativeScript), ...args], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  return {
    label: label || relativeScript,
    command: `node ${relativeScript}${args.length ? ` ${args.join(' ')}` : ''}`,
    status: result.status,
    ok: result.status === 0,
    stdout: result.stdout?.slice(-8000) || '',
    stderr: result.stderr?.slice(-8000) || '',
  };
}

function exportFileHashes(target) {
  const manifest = readJsonIfExists(path.join(target.exportDir, '_manifest.json'), {});
  const hashes = {};
  for (const file of manifest.files || []) {
    const relPath = path.join(target.exportDir, file.fileName).replaceAll(path.sep, '/');
    hashes[file.fileName] = fs.existsSync(path.join(ROOT, relPath)) ? sha256File(path.join(ROOT, relPath)) : '';
  }
  return hashes;
}

async function refreshTarget(target, args) {
  const sourceHashesBefore = fileHashMap(target.sourceRoot);
  const exportHashesBefore = exportFileHashes(target);
  const sourceRefresh = await refreshSources(target, args);
  const sourceHashesAfter = fileHashMap(target.sourceRoot);
  const changedSourceFiles = changedKeys(sourceHashesBefore, sourceHashesAfter);
  const commands = [];

  let exportChangedFiles = [];
  if (!args.dryRun && (changedSourceFiles.length || sourceRefresh.changedSources > 0)) {
    commands.push(runNodeScript(target.exportScript, { label: `${target.key}: export` }));
    const exportHashesAfter = exportFileHashes(target);
    exportChangedFiles = changedKeys(exportHashesBefore, exportHashesAfter);
  }

  if (!args.dryRun && args.build && exportChangedFiles.length) {
    commands.push(runNodeScript(target.buildScript, {
      label: `${target.key}: build`,
      env: {
        ...target.buildEnv,
        OPENSPG_FORCE_FILES: exportChangedFiles.join(','),
      },
    }));
  }

  return {
    key: target.key,
    namespace: target.namespace,
    name: target.name,
    dryRun: args.dryRun,
    buildRequested: args.build,
    sourceRefresh,
    changedSourceFiles,
    exportChangedFiles,
    buildTriggered: Boolean(args.build && exportChangedFiles.length && !args.dryRun),
    commands,
  };
}

function buildMarkdown(payload) {
  const lines = [
    '# Official Reference Delta Refresh Report',
    '',
    `Generated at: ${payload.generatedAt}`,
    `Overall: \`${payload.overall}\``,
    '',
    '## Options',
    '',
    `- KB: \`${payload.options.kb}\``,
    `- Dry run: \`${payload.options.dryRun}\``,
    `- Build: \`${payload.options.build}\``,
    `- Max sources: \`${payload.options.maxSources || 'all'}\``,
    '',
  ];

  for (const item of payload.results) {
    lines.push(`## ${item.namespace}`);
    lines.push('');
    lines.push(`- Known sources: \`${item.sourceRefresh.totalKnownSources}\``);
    lines.push(`- Checked sources: \`${item.sourceRefresh.checkedSources}\``);
    lines.push(`- Changed sources: \`${item.sourceRefresh.changedSources}\``);
    lines.push(`- Failed sources: \`${item.sourceRefresh.failedSources}\``);
    lines.push(`- Changed source files: \`${item.changedSourceFiles.length}\``);
    lines.push(`- Changed export files: \`${item.exportChangedFiles.join(', ') || 'none'}\``);
    lines.push(`- Build triggered: \`${item.buildTriggered}\``);
    if (item.changedSourceFiles.length) {
      lines.push('');
      lines.push('Changed local source files:');
      for (const relPath of item.changedSourceFiles.slice(0, 30)) lines.push(`- \`${relPath}\``);
      if (item.changedSourceFiles.length > 30) lines.push(`- ...and \`${item.changedSourceFiles.length - 30}\` more`);
    }
    const failed = item.sourceRefresh.results.filter((row) => !row.ok);
    if (failed.length) {
      lines.push('');
      lines.push('Failed fetches:');
      for (const row of failed.slice(0, 20)) lines.push(`- \`${row.status || 'ERR'}\` ${row.sourceUrl} -> ${row.error || row.localSnapshotPath}`);
      if (failed.length > 20) lines.push(`- ...and \`${failed.length - 20}\` more`);
    }
    if (item.commands.length) {
      lines.push('');
      lines.push('Commands:');
      for (const command of item.commands) {
        lines.push(`- \`${command.label}\`: \`${command.ok ? 'OK' : `FAIL ${command.status}`}\``);
      }
    }
    lines.push('');
  }

  if (payload.followUpCommands.length) {
    lines.push('## Follow-up Checks');
    lines.push('');
    for (const command of payload.followUpCommands) {
      lines.push(`- \`${command.label}\`: \`${command.ok ? 'OK' : `FAIL ${command.status}`}\``);
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const selectedTargets = args.kb === 'all'
    ? [TARGETS.optima, TARGETS.betterfly]
    : [TARGETS[args.kb]].filter(Boolean);

  if (!selectedTargets.length) {
    throw new Error(`Unknown --kb value: ${args.kb}`);
  }

  const results = [];
  for (const target of selectedTargets) {
    results.push(await refreshTarget(target, args));
  }

  const followUpCommands = [];
  const anyRealChange = results.some((item) => item.changedSourceFiles.length || item.exportChangedFiles.length);
  if (!args.dryRun && args.freshness) {
    followUpCommands.push(runNodeScript('scripts/source_freshness_report.mjs', { label: 'source freshness' }));
  }
  if (!args.dryRun && args.quality && (anyRealChange || args.build)) {
    followUpCommands.push(runNodeScript('scripts/kb_quality_gate.mjs', { label: 'quality gate', args: ['--all'] }));
  }
  if (!args.dryRun && args.test && anyRealChange) {
    followUpCommands.push(runNodeScript('scripts/run_erp_knowledge_testpack.mjs', {
      label: 'assistant testpack',
      args: ['--size', '20'],
    }));
  }

  const commandFailed = [...results.flatMap((item) => item.commands), ...followUpCommands].some((command) => !command.ok);
  const fetchFailed = results.some((item) => item.sourceRefresh.failedSources > 0);
  const payload = {
    generatedAt: new Date().toISOString(),
    overall: commandFailed ? 'FAIL' : fetchFailed ? 'WARN' : 'OK',
    options: args,
    results,
    followUpCommands,
  };

  writeJson(REPORT_JSON, payload);
  fs.writeFileSync(REPORT_MD, `${buildMarkdown(payload)}\n`, 'utf8');
  console.log(JSON.stringify({
    overall: payload.overall,
    reportJson: path.relative(ROOT, REPORT_JSON).replaceAll(path.sep, '/'),
    reportMarkdown: path.relative(ROOT, REPORT_MD).replaceAll(path.sep, '/'),
    results: results.map((item) => ({
      namespace: item.namespace,
      checkedSources: item.sourceRefresh.checkedSources,
      changedSources: item.sourceRefresh.changedSources,
      failedSources: item.sourceRefresh.failedSources,
      changedSourceFiles: item.changedSourceFiles.length,
      exportChangedFiles: item.exportChangedFiles,
      buildTriggered: item.buildTriggered,
    })),
  }, null, 2));

  if (commandFailed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
