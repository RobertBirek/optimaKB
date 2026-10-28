#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import process from 'process';
import { execSync } from 'child_process';
import { findRawDrafts, loadPromotedKnowledge, loadRegistry, makePromotedId, TARGET_KBS } from './lib/promoted_knowledge.mjs';
import { slug } from './lib/export_utils.mjs';
import { writeFileAtomically } from './lib/atomic_file.mjs';
import { assessOwaPromotedCoverage } from './lib/owa_promoted_coverage.mjs';
import { selectOwaExportDrafts } from './lib/owa_export_selection.mjs';
import { assessOwaRelationExport } from './lib/owa_relation_export.mjs';
import { loadOwaRelationPolicy } from './lib/owa_relation_policy.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';
const OUT_JSON = process.env.KB_QUALITY_GATE_OUT_JSON || path.join(ROOT, 'docs/reference/KB_Quality_Gate_Report.json');
const OUT_MD = process.env.KB_QUALITY_GATE_OUT_MD || path.join(ROOT, 'docs/reference/KB_Quality_Gate_Report.md');

const TARGETS = {
  ComarchOptimaSchema: {
    exportDir: 'exports/optima_schema/v1',
    buildManifest: 'build_schema_metadata_jobs_manifest.json',
    requiredFiles: ['table.csv', 'column.csv', 'chunk.csv'],
  },
  ComarchOptimaAdditionalFunctions: {
    exportDir: 'exports/optima_additional_functions/v1',
    buildManifest: 'build_additional_functions_jobs_manifest.json',
    requiredFiles: ['reference_document.csv', 'chunk.csv'],
  },
  ComarchOptimaSprint: {
    exportDir: 'exports/optima_sprint/v1',
    buildManifest: 'build_optima_sprint_jobs_manifest.json',
    requiredFiles: ['reference_document.csv', 'chunk.csv'],
  },
  ComarchOptimaReference: {
    exportDir: 'exports/optima_reference/v1',
    buildManifest: 'build_optima_reference_jobs_manifest.json',
    requiredFiles: ['reference_document.csv', 'chunk.csv'],
  },
  ComarchOptimaBusinessSemantics: {
    exportDir: 'exports/optima_business_semantics/v1',
    buildManifest: 'build_business_semantics_jobs_manifest.json',
    requiredFiles: ['business_domain.csv', 'business_description.csv', 'code_meaning.csv', 'business_rule.csv'],
  },
  ComarchOptimaPartnerTechnical: {
    exportDir: 'exports/optima_partner_technical/v1',
    buildManifest: 'build_optima_partner_technical_jobs_manifest.json',
    requiredFiles: ['reference_document.csv', 'partner_asset.csv', 'chunk.csv'],
  },
  ComarchBetterflyReference: {
    exportDir: 'exports/betterfly_reference/v1',
    buildManifest: 'build_betterfly_reference_jobs_manifest.json',
    requiredFiles: ['reference_document.csv', 'api_resource.csv', 'api_pattern.csv', 'chunk.csv'],
  },
  ComarchCommunityNews: {
    exportDir: 'exports/community_news/v1',
    buildManifest: 'build_community_news_jobs_manifest.json',
    requiredFiles: ['reference_document.csv', 'news_topic.csv', 'chunk.csv'],
  },
  TaxbellLegalReference: {
    exportDir: 'exports/taxbell_legal_reference/v1',
    buildManifest: 'build_taxbell_legal_reference_jobs_manifest.json',
    requiredFiles: ['reference_document.csv', 'source_topic.csv', 'chunk.csv'],
  },
  TaxbellPayrollHRReference: {
    exportDir: 'exports/taxbell_payroll_hr_reference/v1',
    buildManifest: 'build_taxbell_payroll_hr_reference_jobs_manifest.json',
    requiredFiles: ['reference_document.csv', 'source_topic.csv', 'chunk.csv'],
  },
  TaxbellAccountingVATReference: {
    exportDir: 'exports/taxbell_accounting_vat_reference/v1',
    buildManifest: 'build_taxbell_accounting_vat_reference_jobs_manifest.json',
    requiredFiles: ['reference_document.csv', 'source_topic.csv', 'chunk.csv'],
  },
  ComarchUniversalKnowledge: {
    exportDir: 'exports/universal_knowledge/v1',
    buildManifest: '',
    requiredFiles: ['reference_document.csv', 'chunk.csv'],
  },
  OWAOntology: {
    exportDir: 'exports/owa_ontology/v1',
    buildManifest: 'build_owa_ontology_jobs_manifest.json',
    requiredFiles: ['ontology_entity.csv', 'ontology_field.csv', 'ontology_relation.csv', 'workflow_pattern.csv', 'chunk.csv'],
  },
};

function usage() {
  return [
    'Usage:',
    '  node scripts/kb_quality_gate.mjs --kb <kbNamespace[,kbNamespace]>',
    '  node scripts/kb_quality_gate.mjs --all',
    '',
    'Options:',
    '  --json-only           Print JSON only',
    '  --fail-on-warn        Exit non-zero when warnings exist',
    '  --auto-fix            Rebuild KBs with known fixable errors (needs OPENSPG_COOKIE_FILE for build step)',
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

function hasArg(args, name) {
  return args.includes(name);
}

function readJsonIfExists(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === ',' && !quoted) {
      cells.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}

function parseCsvRecords(raw) {
  const records = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (char === '"') {
      current += char;
      if (quoted && raw[index + 1] === '"') {
        current += raw[index + 1];
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && raw[index + 1] === '\n') index += 1;
      if (current.length > 0) records.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  if (current.length > 0) records.push(current);
  return records;
}

function parseCsv(filePath, maxRows = 100000) {
  if (!fs.existsSync(filePath)) return { exists: false, columns: [], rows: [] };
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const records = parseCsvRecords(raw).filter((record) => record.length > 0);
  if (!records.length) return { exists: true, columns: [], rows: [] };
  const columns = parseCsvLine(records[0]);
  const rows = records.slice(1, maxRows + 1).map((record) => {
    const cells = parseCsvLine(record);
    return Object.fromEntries(columns.map((column, index) => [column, cells[index] || '']));
  });
  return { exists: true, columns, rows };
}

// OWA relations must retain structural evidence until validation is complete.
// Leave the legacy parser (including its non-OWA behavior) unchanged.
function parseOwaRelationCsv(filePath) {
  if (!fs.existsSync(filePath)) return { exists: false, columns: [], rows: [], issues: [] };
  const expectedColumns = ['id', 'name', 'description', 'semanticType', 'sourceEntityRefId', 'targetEntityRefId',
    'predicate', 'cardinality', 'relationType', 'joinCondition', 'status', 'summary'];
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const records = [];
  let cells = [];
  let cell = '';
  let state = 'start';
  const finishCell = () => { cells.push(cell); cell = ''; state = 'start'; };
  const finishRecord = () => { finishCell(); records.push(cells); cells = []; };
  const invalidQuoting = (reason) => ({ exists: true, columns: [], rows: [],
    issues: [{ kind: 'relation_csv_invalid_quoting', reason }] });
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (state === 'quoted') {
      if (char === '"') state = 'closed';
      else cell += char;
      continue;
    }
    if (state === 'closed') {
      if (char === '"') { cell += '"'; state = 'quoted'; continue; }
      if (char !== ',' && char !== '\r' && char !== '\n') {
        return invalidQuoting('Only a delimiter or record end may follow a closing quote.');
      }
    } else if (char === '"') {
      if (state !== 'start') return invalidQuoting('A quote may only open at the start of a cell.');
      state = 'quoted';
      continue;
    }
    if (char === ',') finishCell();
    else if (char === '\r' || char === '\n') {
      finishRecord();
      if (char === '\r' && raw[index + 1] === '\n') index += 1;
    } else { cell += char; state = 'unquoted'; }
  }
  if (state === 'quoted') return invalidQuoting('The final quoted cell is unterminated.');
  if (cells.length || cell.length || state !== 'start') finishRecord();

  const columns = records.shift() || [];
  const issues = [];
  if (new Set(columns).size !== columns.length) {
    issues.push({ kind: 'relation_csv_duplicate_header', reason: 'OWA relation CSV headers must be unique before row conversion.' });
  } else if (columns.length !== expectedColumns.length || expectedColumns.some((column) => !columns.includes(column))) {
    issues.push({ kind: 'relation_csv_schema_mismatch', reason: 'OWA relation CSV must contain exactly the approved named columns.' });
  }
  const badRecord = records.findIndex((record) => record.length !== columns.length);
  if (badRecord !== -1) issues.push({ kind: 'relation_csv_arity_mismatch',
    reason: `CSV record ${badRecord + 2} has ${records[badRecord].length} cells; expected ${columns.length}.` });
  // No maxRows slicing, padding, duplicate-key overwrite or surplus-cell loss.
  const rows = issues.length ? [] : records.map((record) => Object.fromEntries(columns.map((column, index) => [column, record[index]])));
  return { exists: true, columns, rows, issues };
}

function duplicateSourceUrls(rows, namespace) {
  const counts = new Map();
  for (const row of rows) {
    if (
      namespace === 'ComarchOptimaPartnerTechnical' &&
      ['partner_example_extract', 'partner_asset_extract'].includes(row.semanticType)
    ) {
      continue;
    }
    const url = String(row.sourceUrl || '').trim();
    if (!url) continue;
    counts.set(url, (counts.get(url) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([sourceUrl, count]) => ({ sourceUrl, count }));
}

function promotedDraftChunkMatches(namespace, chunkRows) {
  const promoted = loadPromotedKnowledge(namespace);
  if (!promoted.length) return { promotedCount: 0, missing: [] };
  const haystack = chunkRows.map((row) => [
    row.sourceUrl,
    row.sourcePath,
    row.sourceDocumentRefId,
    row.sourceObjectRefId,
    row.id,
    row.content,
  ].join('\n')).join('\n');
  const haystackLower = haystack.toLowerCase();
  const missing = promoted
    .filter((draft) => {
      const sluggedId = slug(draft.id).slice(0, 96);
      const schemaChunkId = namespace === 'ComarchOptimaSchema'
        ? makePromotedId('CHUNK_PROMOTED', `${draft.id}_1`)
        : '';
      const idFound = haystack.includes(draft.id)
        || haystackLower.includes(draft.id.toLowerCase())
        || haystack.includes(sluggedId)
        || (schemaChunkId && haystack.includes(schemaChunkId));
      const srcUrlFound = draft.sourceUrl && (haystack.includes(draft.sourceUrl) || haystackLower.includes(draft.sourceUrl.toLowerCase()));
      return !idFound && !srcUrlFound;
    })
    .map((draft) => ({ draftId: draft.id, sourceUrl: draft.sourceUrl || '', title: draft.title }));
  return { promotedCount: promoted.length, missing };
}

function promotedDraftDescriptionMatches(namespace, descriptionRows) {
  const promoted = loadPromotedKnowledge(namespace);
  const ids = new Set(descriptionRows.map((row) => row.id));
  const missing = promoted
    .filter((draft) => !ids.has(makePromotedId('BD_PROMOTED', `${draft.id}_1`)))
    .map((draft) => ({ draftId: draft.id, sourceUrl: draft.sourceUrl || '', title: draft.title }));
  return { promotedCount: promoted.length, missing };
}

function assessNamespace(namespace) {
  const target = TARGETS[namespace];
  if (!target) {
    return {
      namespace,
      verdict: 'FAIL',
      errors: [`Unsupported namespace: ${namespace}`],
      warnings: [],
      files: [],
      jobs: [],
    };
  }

  const exportDir = path.join(ROOT, target.exportDir);
  const manifest = readJsonIfExists(path.join(exportDir, '_manifest.json'), {});
  const buildManifest = target.buildManifest ? readJsonIfExists(path.join(exportDir, target.buildManifest), {}) : {};
  const errors = [];
  const warnings = [];
  const owaInputIssues = [];
  const owaRelationCsv = namespace === 'OWAOntology' ? parseOwaRelationCsv(path.join(exportDir, 'ontology_relation.csv')) : undefined;

  if (!fs.existsSync(exportDir)) errors.push(`Missing export directory: ${target.exportDir}`);

  const rawManifestFileEntries = Array.isArray(manifest.files) ? manifest.files : [];
  const manifestFileEntries = namespace === 'OWAOntology'
    ? rawManifestFileEntries.filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry))
    : rawManifestFileEntries;
  const manifestFileNames = manifestFileEntries.map((file) => file.fileName);
  if (namespace === 'OWAOntology' && (!Array.isArray(manifest.files)
      || rawManifestFileEntries.length !== target.requiredFiles.length
      || manifestFileEntries.length !== rawManifestFileEntries.length
      || new Set(manifestFileNames).size !== target.requiredFiles.length
      || target.requiredFiles.some((fileName) => !manifestFileNames.includes(fileName)))) {
    owaInputIssues.push({ kind: 'invalid_manifest_csv_set',
      reason: 'OWA manifest.files must contain exactly one entry for each of the five required CSV basenames, with no sidecar or other entries.' });
  }
  const duplicateManifestFiles = [...new Set(
    manifestFileNames.filter((fileName, index) => manifestFileNames.indexOf(fileName) !== index),
  )];
  if (duplicateManifestFiles.length) {
    errors.push(`Duplicate files in export manifest: ${duplicateManifestFiles.join(', ')}`);
  }

  const manifestFiles = new Map(manifestFileEntries.map((file) => [file.fileName, file]));
  for (const manifestFile of manifestFileEntries) {
    if (namespace === 'OWAOntology' && !target.requiredFiles.includes(manifestFile.fileName)) {
      errors.push('OWA relation audit invalid_csv_file: 1');
      continue;
    }
    const parsed = owaRelationCsv && manifestFile.fileName === 'ontology_relation.csv'
      ? owaRelationCsv : parseCsv(path.join(exportDir, manifestFile.fileName));
    if (!parsed.exists) {
      errors.push(`Manifest references missing CSV: ${manifestFile.fileName}`);
      continue;
    }
    if (Number(manifestFile.rowCount) !== parsed.rows.length) {
      errors.push(
        `Manifest rowCount mismatch for ${manifestFile.fileName}: declared ${manifestFile.rowCount}, actual ${parsed.rows.length}`,
      );
    }
    if (parsed.columns.includes('id')) {
      const ids = parsed.rows.map((row) => String(row.id || ''));
      const duplicateIds = ids.length - new Set(ids).size;
      if (duplicateIds > 0) {
        errors.push(`Duplicate IDs in ${manifestFile.fileName}: ${duplicateIds}`);
      }
      if (ids.some((id) => !id)) errors.push(`Empty IDs in ${manifestFile.fileName}`);
    }
  }
  const files = [];
  for (const fileName of target.requiredFiles) {
    const csvPath = path.join(exportDir, fileName);
    const parsed = owaRelationCsv && fileName === 'ontology_relation.csv' ? owaRelationCsv : parseCsv(csvPath);
    const rowCount = manifestFiles.get(fileName)?.rowCount ?? parsed.rows.length;
    const fileReport = {
      fileName,
      exists: parsed.exists,
      rowCount,
      columns: parsed.columns,
    };
    files.push(fileReport);
    if (!parsed.exists) errors.push(`Missing required CSV: ${fileName}`);
    else if (rowCount <= 0) {
      if (namespace === 'ComarchUniversalKnowledge') {
        warnings.push(`Required CSV has zero rows: ${fileName} (catch-all KB starts empty)`);
      } else {
        errors.push(`Required CSV has zero rows: ${fileName}`);
      }
    }
  }

  const referenceCsv = parseCsv(path.join(exportDir, 'reference_document.csv'));
  if (referenceCsv.exists) {
    const duplicates = namespace === 'ComarchOptimaPartnerTechnical'
      ? []
      : duplicateSourceUrls(referenceCsv.rows, namespace);
    if (duplicates.length) {
      warnings.push(`Duplicate sourceUrl values in reference_document.csv: ${duplicates.length}`);
    }
  }

  const chunkCsv = parseCsv(path.join(exportDir, 'chunk.csv'));
  let owaPromotedCoverage;
  let relationAudit;
  if (namespace === 'OWAOntology') {
    const promotedDrafts = loadPromotedKnowledge(namespace);
    // No snapshots means no raw/registry discovery: an empty corpus fails closed.
    const rawDrafts = promotedDrafts.length ? findRawDrafts() : [];
    owaPromotedCoverage = assessOwaPromotedCoverage({
      promotedDrafts,
      rawDrafts: rawDrafts.filter((draft) => draft.kbNamespace === namespace),
      chunkRows: chunkCsv.rows,
      root: ROOT,
    });
    const issueCounts = new Map();
    for (const { kind } of owaPromotedCoverage.issues) {
      issueCounts.set(kind, (issueCounts.get(kind) || 0) + 1);
    }
    for (const [kind, count] of issueCounts) {
      errors.push(`OWA promoted coverage ${kind}: ${count}`);
    }
    const selection = selectOwaExportDrafts({ promotedDrafts, rawDrafts, root: ROOT,
      registryEntries: promotedDrafts.length ? loadRegistry().entries : [] });
    const relationIssues = [...owaInputIssues, ...owaRelationCsv.issues, ...selection.issues];
    let auditBytes;
    const descriptor = manifest.relationAudit;
    // Never interpret manifest source paths or arbitrary sidecar names as files.
    if (descriptor?.schemaVersion === 1 && descriptor.fileName === 'relation_audit.json') {
      const auditPath = path.join(exportDir, 'relation_audit.json');
      let fd;
      try {
        const stat = fs.lstatSync(auditPath);
        if (!stat.isFile() || stat.isSymbolicLink()) {
          relationIssues.push({ kind: 'unsafe_relation_audit_file', reason: 'The sidecar must be a regular file, never a symlink.' });
        } else {
          fd = fs.openSync(auditPath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
          if (!fs.fstatSync(fd).isFile()) throw new Error('Sidecar is not a regular file.');
          auditBytes = fs.readFileSync(fd);
        }
      } catch (error) {
        if (error.code !== 'ENOENT') relationIssues.push({ kind: 'unsafe_relation_audit_file', reason: error.message });
      } finally {
        if (fd !== undefined) fs.closeSync(fd);
      }
    }
    try {
      const { policy, sha256: policySha256 } = loadOwaRelationPolicy();
      relationAudit = assessOwaRelationExport({ root: ROOT, manifest, auditBytes,
        relationRows: owaRelationCsv.rows,
        selectedDrafts: selection.drafts, policy, policySha256 });
      // Selection issues already explain why reconstruction could not start.
      if (selection.issues.length) relationAudit.issues = relationAudit.issues.filter((issue) => issue.kind !== 'empty_approved_corpus');
    } catch (error) {
      relationAudit = { rowCount: 0, unresolvedCount: 0, publicationReady: false, issues: [{
        kind: error.kind || 'relation_audit_failed', reason: error.reason || error.message,
      }], warnings: [] };
    }
    relationAudit.issues.unshift(...relationIssues);
    const relationIssueCounts = new Map();
    for (const { kind } of relationAudit.issues) relationIssueCounts.set(kind, (relationIssueCounts.get(kind) || 0) + 1);
    for (const [kind, count] of relationIssueCounts) errors.push(`OWA relation audit ${kind}: ${count}`);
    warnings.push(...relationAudit.warnings);
  } else if (chunkCsv.exists) {
    const promotedCoverage = promotedDraftChunkMatches(namespace, chunkCsv.rows);
    if (promotedCoverage.missing.length) {
      errors.push(`Promoted drafts without visible chunks: ${promotedCoverage.missing.length}`);
    }
  }

  if (namespace === 'ComarchOptimaBusinessSemantics') {
    const descriptionCsv = parseCsv(path.join(exportDir, 'business_description.csv'));
    const promotedCoverage = promotedDraftDescriptionMatches(namespace, descriptionCsv.rows);
    if (promotedCoverage.missing.length) {
      errors.push(`Promoted drafts without visible business descriptions: ${promotedCoverage.missing.length}`);
    }
  }

  const jobs = Array.isArray(buildManifest.jobs) ? buildManifest.jobs : [];
  if (!jobs.length && target.buildManifest) {
    warnings.push(`Missing or empty build manifest: ${target.buildManifest}`);
  } else if (jobs.length) {
    const unfinished = jobs.filter((job) => job.status !== 'FINISH');
    if (unfinished.length) {
      errors.push(`Builder jobs not FINISH: ${unfinished.map((job) => `${job.id}:${job.status}`).join(', ')}`);
    }
  }

  const verdict = errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS';
  return {
    namespace,
    kbName: TARGET_KBS[namespace]?.kbName || namespace,
    verdict,
    exportDir: target.exportDir,
    generatedAt: manifest.generatedAt || '',
    errors,
    warnings,
    ...(owaPromotedCoverage ? { promotedCoverage: owaPromotedCoverage } : {}),
    ...(relationAudit ? { relationAudit } : {}),
    files,
    jobs: jobs.map((job) => ({
      id: job.id,
      fileName: job.fileName,
      status: job.status,
      jobName: job.jobName,
      gmtModified: job.gmtModified,
    })),
  };
}

function buildMarkdown(payload) {
  const lines = [
    '# KB Quality Gate Report',
    '',
    `Generated at: ${payload.generatedAt}`,
    '',
    `Overall: \`${payload.overall}\``,
    '',
  ];
  for (const result of payload.results) {
    lines.push(`## ${result.namespace}`);
    lines.push('');
    lines.push(`- Verdict: \`${result.verdict}\``);
    lines.push(`- Export dir: \`${result.exportDir}\``);
    if (result.generatedAt) lines.push(`- Staging generatedAt: \`${result.generatedAt}\``);
    if (result.errors.length) {
      lines.push('- Errors:');
      for (const error of result.errors) lines.push(`  - ${error}`);
    }
    if (result.warnings.length) {
      lines.push('- Warnings:');
      for (const warning of result.warnings) lines.push(`  - ${warning}`);
    }
    lines.push('- Required files:');
    for (const file of result.files) {
      lines.push(`  - \`${file.fileName}\`: exists \`${file.exists}\`, rows \`${file.rowCount}\``);
    }
    if (result.jobs.length) {
      lines.push('- Jobs:');
      for (const job of result.jobs) {
        lines.push(`  - \`${job.id}\` \`${job.status}\` \`${job.fileName || job.jobName || ''}\``);
      }
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

const args = process.argv.slice(2);

try {
  if (!args.length || hasArg(args, '--help')) {
    process.stdout.write(`${usage()}\n`);
    process.exit(0);
  }

  const namespaces = hasArg(args, '--all')
    ? Object.keys(TARGETS)
    : valuesFor(args, '--kb');
  if (!namespaces.length) throw new Error('Provide --kb <namespace> or --all');

  const results = namespaces.map(assessNamespace);
  let overall = results.some((result) => result.verdict === 'FAIL')
    ? 'FAIL'
    : results.some((result) => result.verdict === 'WARN')
      ? 'WARN'
      : 'PASS';

  if (hasArg(args, '--auto-fix') && overall === 'FAIL') {
    const FIXABLE_ERROR = 'Promoted drafts without visible chunks';
    const failedKbs = results.filter(r => r.verdict === 'FAIL'
      && r.errors.some(e => e.startsWith(FIXABLE_ERROR)));

    if (failedKbs.length) {
      const cookieFile = process.env.OPENSPG_COOKIE_FILE;
      const cookie = process.env.OPENSPG_COOKIE;
      const cookieEnv = cookieFile ? `OPENSPG_COOKIE_FILE=${cookieFile}`
        : cookie ? `OPENSPG_COOKIE=${cookie}` : '';
      const hasCookie = Boolean(cookieFile || cookie);

      process.stderr.write(`Auto-fix: rebuilding ${failedKbs.length} KB(s) with ${FIXABLE_ERROR} errors...\n`);

      for (const kb of failedKbs) {
        const ns = kb.namespace;
        process.stderr.write(`  Fixing ${ns}...\n`);
        try {
          const buildFlag = hasCookie ? ' --build' : '';
          execSync(
            `${cookieEnv} node scripts/process_knowledge_inbox.mjs --kb ${ns} --export${buildFlag}`,
            { stdio: 'inherit', cwd: ROOT },
          );
          results.splice(results.indexOf(kb), 1, assessNamespace(ns));
          process.stderr.write(`  ${ns}: fixed.\n`);
        } catch (e) {
          process.stderr.write(`  ${ns}: fix failed — ${e.message}\n`);
        }
      }

      overall = results.some((result) => result.verdict === 'FAIL')
        ? 'FAIL'
        : results.some((result) => result.verdict === 'WARN')
          ? 'WARN'
          : 'PASS';
    }
  }
  let existingResults = [];
  try {
    const existing = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
    if (Array.isArray(existing.results)) existingResults = existing.results;
  } catch {
    // no prior report, or unreadable — proceed with just this run's results
  }
  const assessedNamespaces = new Set(results.map((result) => result.namespace));
  const mergedResults = [
    ...existingResults.filter((result) => !assessedNamespaces.has(result.namespace)),
    ...results,
  ];
  const fileOverall = mergedResults.some((result) => result.verdict === 'FAIL')
    ? 'FAIL'
    : mergedResults.some((result) => result.verdict === 'WARN')
      ? 'WARN'
      : 'PASS';

  const payload = {
    generatedAt: new Date().toISOString(),
    overall: fileOverall,
    results: mergedResults,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  writeFileAtomically(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);
  writeFileAtomically(OUT_MD, buildMarkdown(payload));

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  if (overall === 'FAIL' || (overall === 'WARN' && hasArg(args, '--fail-on-warn'))) {
    process.exit(2);
  }
} catch (error) {
  process.stderr.write(`${error.message}\n\n${usage()}\n`);
  process.exit(1);
}
