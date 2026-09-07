#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  listInboxDrafts,
  loadPromotedKnowledge,
  promoteDraft,
  loadRegistry,
  registryEntryFor,
  TARGET_KBS,
} from './lib/promoted_knowledge.mjs';
import { readOpenSpgCookie, openSpgCookieSource } from './lib/openspg_auth.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';
const TAXBELL_PROJECT_MAP_PATH = path.join(ROOT, 'docs/reference/Taxbell_KB_Project_Map.json');

const PIPELINE_TARGETS = {
  ComarchOptimaSchema: {
    projectId: '4',
    exportScript: 'scripts/export_optima_schema_metadata.mjs',
    exportEnv: { OPENSPG_HELPER_ONLY: '1' },
    buildScript: 'scripts/build_optima_schema_metadata.mjs',
    promotedForceFiles: ['chunk.csv'],
  },
  ComarchOptimaAdditionalFunctions: {
    projectId: '6',
    exportScript: 'scripts/export_optima_additional_functions.mjs',
    buildScript: 'scripts/build_optima_additional_functions.mjs',
    promotedForceFiles: ['reference_document.csv', 'chunk.csv'],
  },
  ComarchOptimaSprint: {
    projectId: '7',
    exportScript: 'scripts/export_optima_sprint.mjs',
    buildScript: 'scripts/build_optima_sprint.mjs',
    promotedForceFiles: ['reference_document.csv', 'chunk.csv'],
  },
  ComarchOptimaReference: {
    projectId: '8',
    exportScript: 'scripts/export_optima_reference.mjs',
    buildScript: 'scripts/build_optima_reference.mjs',
    promotedForceFiles: ['reference_document.csv', 'chunk.csv'],
  },
  ComarchOptimaBusinessSemantics: {
    projectId: '15',
    exportScript: 'scripts/export_optima_business_semantics.mjs',
    exportEnv: { OPENSPG_HELPER_ONLY: '1' },
    buildScript: 'scripts/build_optima_business_semantics.mjs',
    promotedForceFiles: ['business_description.csv'],
  },
  ComarchOptimaPartnerTechnical: {
    projectId: '9',
    exportScript: 'scripts/export_optima_partner_technical.mjs',
    buildScript: 'scripts/build_optima_partner_technical.mjs',
    promotedForceFiles: ['reference_document.csv', 'chunk.csv'],
  },
  ComarchBetterflyReference: {
    projectId: '10',
    exportScript: 'scripts/export_betterfly_reference.mjs',
    buildScript: 'scripts/build_betterfly_reference.mjs',
    promotedForceFiles: ['reference_document.csv', 'chunk.csv'],
  },
  ComarchCommunityNews: {
    projectId: '11',
    exportScript: 'scripts/export_comarch_community_news.mjs',
    buildScript: 'scripts/build_comarch_community_news.mjs',
    promotedForceFiles: ['reference_document.csv', 'chunk.csv'],
  },
  TaxbellLegalReference: {
    projectId: '',
    exportScript: 'scripts/export_taxbell_legal_reference.mjs',
    buildScript: 'scripts/build_taxbell_legal_reference.mjs',
    promotedForceFiles: ['reference_document.csv', 'chunk.csv'],
  },
  TaxbellPayrollHRReference: {
    projectId: '',
    exportScript: 'scripts/export_taxbell_payroll_hr_reference.mjs',
    buildScript: 'scripts/build_taxbell_payroll_hr_reference.mjs',
    promotedForceFiles: ['reference_document.csv', 'chunk.csv'],
  },
  TaxbellAccountingVATReference: {
    projectId: '',
    exportScript: 'scripts/export_taxbell_accounting_vat_reference.mjs',
    buildScript: 'scripts/build_taxbell_accounting_vat_reference.mjs',
    promotedForceFiles: ['reference_document.csv', 'chunk.csv'],
  },
  ComarchUniversalKnowledge: {
    projectId: '',
    exportScript: 'scripts/export_universal_knowledge.mjs',
    buildScript: '',
    promotedForceFiles: ['reference_document.csv', 'chunk.csv'],
  },
  OWAOntology: {
    projectId: '16',
    exportScript: 'scripts/export_owa_ontology.mjs',
    buildScript: 'scripts/build_owa_ontology.mjs',
    promotedForceFiles: ['ontology_entity.csv', 'ontology_field.csv', 'ontology_relation.csv', 'workflow_pattern.csv', 'chunk.csv'],
  },
  InsERTGTSchema: {
    projectId: '17',
    exportScript: 'scripts/export_insert_gt_schema.mjs',
    buildScript: 'scripts/build_insert_gt_schema.mjs',
    promotedForceFiles: ['reference_document.csv', 'chunk.csv'],
  },
};

function usage() {
  return [
    'Usage:',
    '  node scripts/run_knowledge_inbox_pipeline.mjs --status',
    '  node scripts/run_knowledge_inbox_pipeline.mjs --promote <draftId[,draftId]> --export',
    '  node scripts/run_knowledge_inbox_pipeline.mjs --kb <kbNamespace> --export',
    '  node scripts/run_knowledge_inbox_pipeline.mjs --kb <kbNamespace> --export --build',
    '  node scripts/run_knowledge_inbox_pipeline.mjs --all --export --dry-run',
    '',
    'Options:',
    '  --status              Print pending/promoted/rejected summary only',
    '  --promote <ids>       Promote comma-separated draft ids before export',
    '  --kb <namespaces>     Comma-separated target KB namespaces',
    '  --all                 Target all namespaces',
    '  --export              Run target exporters',
    '  --build               Run target OpenSPG build scripts after export',
    '  --dry-run             Print actions without running exporters/builders',
    '  --note <text>         Review note for promoted drafts',
    '  --by <operator>       Operator name for promoted drafts',
    '  --force               Re-promote an already promoted draft',
    '',
    'Build requires OPENSPG_COOKIE or OPENSPG_COOKIE_FILE in the environment.',
  ].join('\n');
}

function valuesFor(args, name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name && args[index + 1]) {
      values.push(...args[index + 1].split(',').map((value) => value.trim()).filter(Boolean));
      index += 1;
    }
  }
  return values;
}

function valueFor(args, name, fallback = '') {
  const values = valuesFor(args, name);
  return values[0] || fallback;
}

function hasArg(args, name) {
  return args.includes(name);
}

function namespacesWithPromotedDrafts() {
  return Object.keys(TARGET_KBS).filter((namespace) => loadPromotedKnowledge(namespace).length > 0);
}

function statusPayload() {
  const drafts = listInboxDrafts();
  const byStatus = drafts.reduce((acc, draft) => {
    acc[draft.status] = (acc[draft.status] || 0) + 1;
    return acc;
  }, {});
  const promotedByNamespace = Object.keys(TARGET_KBS).map((namespace) => ({
    kbNamespace: namespace,
    promotedCount: loadPromotedKnowledge(namespace).length,
  }));
  return {
    ok: true,
    pendingCount: byStatus.pending || 0,
    promotedCount: byStatus.promoted || 0,
    rejectedCount: byStatus.rejected || 0,
    promotedByNamespace,
    pending: drafts.filter((draft) => draft.status === 'pending'),
  };
}

function runNodeScript(scriptPath, env = {}) {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: ROOT,
    env: { ...process.env, ROOT, ...env },
    encoding: 'utf8',
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`${scriptPath} exited with ${result.status}`);
  }
}

function maybeRefreshOpenSpgCookie(projectId) {
  if (String(process.env.OPENSPG_AUTO_LOGIN || '').trim() !== '1') {
    return;
  }
  runNodeScript('scripts/openspg_login.mjs', {
    OPENSPG_PROJECT_ID: projectId,
  });
}

function mergeForceFiles(existingValue, additionalFiles = []) {
  const values = new Set(
    String(existingValue || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
  additionalFiles.forEach((fileName) => values.add(fileName));
  return [...values].join(',');
}

function assertTargets(namespaces) {
  for (const namespace of namespaces) {
    if (!PIPELINE_TARGETS[namespace]) {
      throw new Error(`Unsupported pipeline namespace: ${namespace}`);
    }
  }
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function resolveProjectId(namespace, target) {
  if (String(target.projectId || '').trim()) return String(target.projectId);
  if (!fs.existsSync(TAXBELL_PROJECT_MAP_PATH)) return '';
  const map = JSON.parse(fs.readFileSync(TAXBELL_PROJECT_MAP_PATH, 'utf8'));
  const entry = (map.entries || []).find((item) => item.namespace === namespace);
  return entry?.projectId ? String(entry.projectId) : '';
}

const args = process.argv.slice(2);

try {
  if (!args.length || hasArg(args, '--help')) {
    process.stdout.write(`${usage()}\n`);
    process.exit(0);
  }

  const dryRun = hasArg(args, '--dry-run');
  const shouldExport = hasArg(args, '--export');
  const shouldBuild = hasArg(args, '--build');
  const promoteIds = valuesFor(args, '--promote');
  const explicitNamespaces = valuesFor(args, '--kb');
  const affectedNamespaces = new Set();
  const promotedNamespaces = new Set();
  const actions = [];

  if (hasArg(args, '--status') && !promoteIds.length && !shouldExport && !shouldBuild) {
    printJson(statusPayload());
    process.exit(0);
  }

  for (const draftId of promoteIds) {
    if (dryRun) {
      const draft = listInboxDrafts().find((item) => item.id === draftId);
      if (!draft) throw new Error(`Draft not found: ${draftId}`);
      affectedNamespaces.add(draft.kbNamespace);
      promotedNamespaces.add(draft.kbNamespace);
      actions.push({ action: 'promote', draftId, kbNamespace: draft.kbNamespace, dryRun: true });
      continue;
    }
    let result;
    try {
      result = promoteDraft(draftId, {
        reviewNote: valueFor(args, '--note', ''),
        promotedBy: valueFor(args, '--by', ''),
        force: hasArg(args, '--force'),
      });
    } catch (promoteErr) {
      if (String(promoteErr.message).startsWith('Draft already promoted:')) {
        const registry = loadRegistry();
        const existing = registryEntryFor(registry, draftId);
        const kbNs = existing?.kbNamespace || '';
        affectedNamespaces.add(kbNs);
        promotedNamespaces.add(kbNs);
        actions.push({
          action: 'promote',
          draftId,
          kbNamespace: kbNs,
          alreadyPromoted: true,
          promotedJsonPath: existing?.promotedJsonPath || '',
        });
        if (!hasArg(args, '--export')) continue;
        process.stderr.write(`[SKIP] Draft already promoted: ${draftId}\n`);
        continue;
      }
      throw promoteErr;
    }
    affectedNamespaces.add(result.promoted.kbNamespace);
    promotedNamespaces.add(result.promoted.kbNamespace);
    actions.push({
      action: 'promote',
      draftId,
      kbNamespace: result.promoted.kbNamespace,
      promotedJsonPath: result.registryEntry.promotedJsonPath,
    });
  }

  if (hasArg(args, '--all')) {
    Object.keys(PIPELINE_TARGETS).forEach((namespace) => affectedNamespaces.add(namespace));
  }
  explicitNamespaces.forEach((namespace) => affectedNamespaces.add(namespace));
  if (!affectedNamespaces.size && (shouldExport || shouldBuild)) {
    namespacesWithPromotedDrafts().forEach((namespace) => affectedNamespaces.add(namespace));
  }

  const namespaces = [...affectedNamespaces].sort();
  assertTargets(namespaces);

  if (shouldBuild && !dryRun && !readOpenSpgCookie()) {
    maybeRefreshOpenSpgCookie(namespaces[0] ? PIPELINE_TARGETS[namespaces[0]].projectId : '4');
  }
  if (shouldBuild && !dryRun && !readOpenSpgCookie()) {
    throw new Error('OPENSPG_COOKIE or OPENSPG_COOKIE_FILE is required when --build is used; set OPENSPG_AUTO_LOGIN=1 with an OpenSPG login file to refresh it automatically');
  }

  const results = [];
  for (const namespace of namespaces) {
    const target = PIPELINE_TARGETS[namespace];
    const nsResult = { namespace, status: 'ok', exportOk: false, buildOk: false, error: '' };
    try {
      if (shouldExport) {
        actions.push({ action: 'export', kbNamespace: namespace, script: target.exportScript, dryRun });
        if (!dryRun) {
          runNodeScript(target.exportScript, target.exportEnv || {});
          nsResult.exportOk = true;
        }
      }
      if (shouldBuild) {
        const projectId = resolveProjectId(namespace, target);
        if (!projectId && !dryRun) {
          nsResult.status = 'skip';
          nsResult.error = `KB ${namespace} does not have an OpenSPG projectId configured yet; create the project first or run export-only`;
        } else {
          const forceFilesForBuild = promotedNamespaces.has(namespace)
            ? target.promotedForceFiles || []
            : [];
          actions.push({
            action: 'build',
            kbNamespace: namespace,
            script: target.buildScript,
            projectId,
            forceFiles: forceFilesForBuild,
            dryRun,
          });
          if (!dryRun) {
            try {
              runNodeScript('scripts/openspg_auth_check.mjs', {
                OPENSPG_PROJECT_ID: projectId,
              });
            } catch (error) {
              maybeRefreshOpenSpgCookie(projectId);
              runNodeScript('scripts/openspg_auth_check.mjs', {
                OPENSPG_PROJECT_ID: projectId,
              });
            }
            const buildEnv = {
              OPENSPG_PROJECT_ID: projectId,
              OPENSPG_NAMESPACE: namespace,
            };
            if (forceFilesForBuild.length) {
              buildEnv.OPENSPG_FORCE_FILES = mergeForceFiles(
                process.env.OPENSPG_FORCE_FILES,
                forceFilesForBuild,
              );
            }
            runNodeScript(target.buildScript, buildEnv);
            nsResult.buildOk = true;
          }
        }
      }
    } catch (error) {
      nsResult.status = 'fail';
      nsResult.error = error.message;
    }
    results.push(nsResult);
  }

  const failedNs = results.filter((r) => r.status === 'fail');
  const skippedNs = results.filter((r) => r.status === 'skip');
  if (failedNs.length) {
    for (const f of failedNs) {
      process.stderr.write(`[FAIL] ${f.namespace}: ${f.error}\n`);
    }
    for (const s of skippedNs) {
      process.stderr.write(`[SKIP] ${s.namespace}: ${s.error}\n`);
    }
  }

  const failedReport = results.filter((r) => r.status === 'fail');
  const skippedReport = results.filter((r) => r.status === 'skip');
  const passedReport = results.filter((r) => r.status === 'ok');
  if (dryRun) {
    printJson({
      ok: true,
      dryRun,
      openSpgCookieSource: openSpgCookieSource(),
      actions,
      status: statusPayload(),
    });
  } else {
    printJson({
      ok: failedReport.length === 0,
      dryRun,
      openSpgCookieSource: openSpgCookieSource(),
      actions,
      pipelineResults: results,
      pipelineSummary: `PASS ${passedReport.length} / SKIP ${skippedReport.length} / FAIL ${failedReport.length}`,
      status: statusPayload(),
    });
    if (failedReport.length) process.exitCode = 1;
  }
} catch (error) {
  process.stderr.write(`${error.message}\n\n${usage()}\n`);
  process.exit(1);
}
