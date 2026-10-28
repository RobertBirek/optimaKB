import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { copyOwaCodeForTests, fixtureOwaRelationPolicy } from './test_helpers/owa_relation_fixtures.mjs';

const NAMESPACE = 'OWAOntology';
const EVIDENCE = fs.mkdtempSync('/tmp/opencode/owa-quality-cli-');
console.log(`OWA CLI evidence: ${EVIDENCE}`);
const CONTENT = "Customer's `literal` invoice.\nSecond line, with \"quotes\".\n\nApproved content.\n\n## Relacje ontologiczne\n"
  + '| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Warunek JOIN | Dowód |\n'
  + '|---|---|---|---|---|---|\n| P | Invoice A | Target | N:1 | A.id = B.id | proof |';
const SOURCE = 'downloads/knowledge_inbox/2026-01-01/draft_a.md';
const REQUIRED = ['ontology_entity.csv', 'ontology_field.csv', 'ontology_relation.csv', 'workflow_pattern.csv', 'chunk.csv'];
const UNRESOLVED = 'OWA unresolved relation targets: 1; publicationReady=false';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function writeRows(file, rows, columns = Object.keys(rows[0])) {
  fs.writeFileSync(file, `${columns.join(',')}\n${rows.map((row) => columns.map((key) => csvCell(row[key] ?? '')).join(',')).join('\n')}\n`);
}

// Run the real CLI against complete offline staging, with forbidden reads and
// auto-fix child execution trapped before they can have side effects.
function fixture(t, name, { equivalent = false, conflict = false, missing = false, changed = false, noPromoted = false } = {}) {
  const root = fs.mkdtempSync(path.join(EVIDENCE, `${name}-root-`));
  // Keep private fixture inputs and outputs as evidence; never clean shared paths.
  const policy = fixtureOwaRelationPolicy();
  policy.entries.push({ sourceEntityRefId: 'OWA_ENTITY_INVOICE_A', predicate: 'P', legacyTargetRefId: 'OWA_ENTITY_TARGET', id: 'OWA_REL_INVOICE_P_TARGET', state: 'new' });
  const codeDir = path.join(root, 'private-code');
  const { gatePath } = copyOwaCodeForTests(codeDir, policy);
  const policySha256 = hash(fs.readFileSync(path.join(codeDir, 'scripts/lib/owa_relation_id_policy.json')));
  const reportDir = path.join(EVIDENCE, name);
  fs.mkdirSync(reportDir, { recursive: true });
  const exportDir = path.join(root, 'exports/owa_ontology/v1');
  fs.mkdirSync(exportDir, { recursive: true });
  const draft = {
    id: 'draft_a', title: 'Invoice A', content: CONTENT, kbNamespace: NAMESPACE,
    status: 'promoted', promotedAt: '2026-01-01',
    sourceDraftPath: SOURCE.replace(/\.md$/, '.json'),
  };
  const promotedDir = path.join(root, 'docs/reference/knowledge_inbox/promoted', NAMESPACE);
  if (!noPromoted) {
    writeJson(path.join(promotedDir, 'draft_a.json'), draft);
    if (equivalent || conflict) {
      writeJson(path.join(promotedDir, 'draft_b.json'), {
        ...draft, id: 'draft_b', promotedAt: '2026-02-01',
        content: conflict ? `${CONTENT} Different approved revision.` : CONTENT,
      });
    }
  }
  writeJson(path.join(root, SOURCE.replace(/\.md$/, '.json')), { id: 'draft_a', kbNamespace: NAMESPACE });
  const ids = equivalent || conflict ? ['draft_a', 'draft_b'] : ['draft_a'];
  if (ids.includes('draft_b')) {
    writeJson(path.join(root, SOURCE.replace('draft_a.md', 'draft_b.json')), { id: 'draft_b', kbNamespace: NAMESPACE });
    // Each equivalent snapshot has its own qualified raw provenance.
    const otherPath = path.join(promotedDir, 'draft_b.json');
    if (!noPromoted) {
      const other = JSON.parse(fs.readFileSync(otherPath));
      other.sourceDraftPath = SOURCE.replace('draft_a.md', 'draft_b.json');
      writeJson(otherPath, other);
    }
  }
  writeJson(path.join(root, 'docs/reference/knowledge_inbox/registry.json'), { entries: ids.map((id) => ({
    draftId: id, kbNamespace: NAMESPACE, status: 'promoted',
    rawJsonPath: SOURCE.replace('draft_a.md', `${id}.json`),
    promotedJsonPath: `docs/reference/knowledge_inbox/promoted/${NAMESPACE}/${id}.json`,
    promotedMarkdownPath: `docs/reference/knowledge_inbox/promoted/${NAMESPACE}/${id}.md`,
  })) });
  // No Markdown fixture: the gate must use approved snapshots, never recover raw content.
  const columns = ['id', 'sourceDocumentRefId', 'sourcePath', 'sectionOrder', 'content'];
  const chunk = ['chunk_a', missing ? 'OWA_ENTITY_DECOY' : 'OWA_ENTITY_INVOICE_A', SOURCE, '1',
    missing ? 'Decoy mentions draft_a.' : changed ? CONTENT.replace('Approved', 'Changed') : CONTENT];
  fs.writeFileSync(path.join(exportDir, 'chunk.csv'), `${columns.join(',')}\n${chunk.map(csvCell).join(',')}\n`);
  for (const fileName of REQUIRED.filter((file) => file !== 'chunk.csv')) {
    fs.writeFileSync(path.join(exportDir, fileName), `id,name\n${fileName.replace('.csv', '')}_1,Fixture\n`);
  }
  const relationRows = [{ id: 'OWA_REL_INVOICE_P_TARGET', name: 'P', description: 'A.id = B.id', semanticType: 'ontology_relation',
    sourceEntityRefId: 'OWA_ENTITY_INVOICE_A', targetEntityRefId: '', predicate: 'P', cardinality: 'N:1', relationType: '',
    joinCondition: 'A.id = B.id', status: '', summary: 'P A.id = B.id' }];
  writeRows(path.join(exportDir, 'ontology_relation.csv'), relationRows);
  const manifest = { generatedAt: '2026-01-01', files: REQUIRED.map((fileName) => ({ fileName, rowCount: 1 })) };
  const audit = { schemaVersion: 1, namespace: NAMESPACE,
    policy: { schemaVersion: 1, sha256: policySha256, observedAt: policy.observedAt }, rows: [{
      id: 'OWA_REL_INVOICE_P_TARGET', sourceEntityRefId: 'OWA_ENTITY_INVOICE_A', predicate: 'P', rawSourceLabel: 'Invoice A',
      rawTargetLabel: 'Target', legacyTargetRefId: 'OWA_ENTITY_TARGET',
      targetResolution: { status: 'unresolved', resolvedRefId: '', reason: 'not_approved' }, idAssignment: { kind: 'new' },
      draftId: 'draft_a', equivalentDraftIds: ids,
      source: { promotedJsonPath: `docs/reference/knowledge_inbox/promoted/${NAMESPACE}/draft_a.json`,
        promotedMarkdownPath: `docs/reference/knowledge_inbox/promoted/${NAMESPACE}/draft_a.md`, rawJsonPath: SOURCE.replace(/\.md$/, '.json'),
        rawMarkdownPath: SOURCE, contentSha256: hash(CONTENT), lineBasis: 'snapshot.content', tableIndex: 1, headerLine: 7, rowLine: 9,
        rawHeaders: [' Predykat ', ' Encja źródłowa ', ' Encja docelowa ', ' Kardynalność ', ' Warunek JOIN ', ' Dowód '],
        rawCells: [' P ', ' Invoice A ', ' Target ', ' N:1 ', ' A.id = B.id ', ' proof '], evidence: 'proof' },
    }] };
  function saveAudit() {
    const bytes = `${JSON.stringify(audit, null, 2)}\n`;
    fs.writeFileSync(path.join(exportDir, 'relation_audit.json'), bytes);
    manifest.relationAudit = { schemaVersion: 1, fileName: 'relation_audit.json', rowCount: audit.rows.length, sha256: hash(bytes), policySha256 };
    writeJson(path.join(exportDir, '_manifest.json'), manifest);
  }
  saveAudit();
  const buildManifest = { jobs: [{ id: 'fixture_job', fileName: 'chunk.csv', status: 'FINISH' }] };
  writeJson(path.join(exportDir, 'build_owa_ontology_jobs_manifest.json'), buildManifest);
  const marker = path.join(root, 'child-invoked');
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'scripts/process_knowledge_inbox.mjs'),
    "import fs from 'node:fs'; fs.writeFileSync('child-invoked', 'fixture-only child ran');\n");

  let invocation = 0;
  return {
    root, exportDir, promotedDir, reportDir, marker, manifest, buildManifest, audit, saveAudit, relationRows, codeDir,
    run(extra = [], namespace = NAMESPACE, forbiddenReads = [], probeAutoFix = false) {
      invocation += 1;
      const outJson = path.join(reportDir, 'report.json');
      const outMd = path.join(reportDir, 'report.md');
      const guardPath = path.join(root, 'read-guard.mjs');
      const readMarker = path.join(root, 'forbidden-read');
      fs.writeFileSync(guardPath, `import fs from 'node:fs';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { fileURLToPath } from 'node:url';
const denied = ${JSON.stringify(forbiddenReads)};
for (const method of ['readFileSync', 'openSync']) {
  const original = fs[method];
  fs[method] = function(file, ...args) {
    const name = file instanceof URL ? fileURLToPath(file) : String(file);
    if (denied.includes(name)) { fs.writeFileSync(${JSON.stringify(readMarker)}, name); throw new Error('Forbidden fixture read'); }
    return original.call(this, file, ...args);
  };
}
// Exercise only the classifier under an unconditional child-execution trap.
// No auto-fix child can execute, even if the gate regresses.
childProcess.execSync = () => { fs.writeFileSync(${JSON.stringify(marker)}, 'Forbidden child attempt'); throw new Error('Forbidden child execution'); };
if (${probeAutoFix}) process.argv.push('--auto-fix');
syncBuiltinESMExports();
`);
      const result = spawnSync(process.execPath, ['--import', guardPath, gatePath,
        '--kb', namespace, '--json-only', ...extra], {
        cwd: root,
        env: { LANG: 'C.UTF-8', ROOT: root, KB_QUALITY_GATE_OUT_JSON: outJson,
          KB_QUALITY_GATE_OUT_MD: outMd, OPENSPG_COOKIE: '', OPENSPG_COOKIE_FILE: '' },
        encoding: 'utf8', timeout: 10000,
      });
      fs.writeFileSync(path.join(reportDir, `run-${invocation}.stdout`), result.stdout || '');
      fs.writeFileSync(path.join(reportDir, `run-${invocation}.stderr`), result.stderr || '');
      writeJson(path.join(reportDir, `run-${invocation}.exit.json`), { status: result.status, signal: result.signal, error: result.error?.message });
      assert.ifError(result.error);
      assert.equal(fs.existsSync(readMarker), false, 'gate must reject before reading the untrusted path');
      assert.equal(fs.existsSync(marker), false, 'OWA errors must not reach auto-fix child execution');
      const payload = JSON.parse(result.stdout);
      assert.deepEqual(JSON.parse(fs.readFileSync(outJson, 'utf8')), payload);
      assert.match(fs.readFileSync(outMd, 'utf8'), /KB Quality Gate Report/);
      return { ...result, payload, owa: payload.results.find((row) => row.namespace === NAMESPACE) };
    },
  };
}

function assertCoverageFailure(result, kind) {
  assert.equal(result.stderr, '', result.stderr);
  assert.equal(result.status, 2, result.stdout);
  assert.equal(result.owa.verdict, 'FAIL');
  assert.equal(result.owa.promotedCoverage.coveredCount, 0);
  assert.deepEqual(result.owa.promotedCoverage.issues.map((item) => item.kind), [kind]);
  assert.deepEqual(result.owa.errors, [`OWA promoted coverage ${kind}: 1`,
    ...(kind === 'ambiguous_versions' ? ['OWA relation audit ambiguous_versions: 1'] : [])]);
  assert.deepEqual(result.owa.relationAudit.issues.map((issue) => issue.kind), kind === 'ambiguous_versions' ? ['ambiguous_versions'] : []);
  assert.deepEqual(result.owa.warnings, kind === 'ambiguous_versions' ? [] : [UNRESOLVED]);
  assert.ok(result.owa.files.every((file) => file.exists && file.rowCount === 1));
  assert.equal(result.owa.jobs[0].status, 'FINISH');
}

test('equivalent revisions give complete coverage but unresolved targets WARN', (t) => {
  const f = fixture(t, 'equivalent', { equivalent: true });
  const result = f.run();
  assert.equal(result.stderr, '', result.stderr);
  assert.equal(result.status, 0, result.stdout);
  assert.equal(result.owa.verdict, 'WARN');
  assert.deepEqual(result.owa.promotedCoverage, { promotedCount: 2, groupCount: 1, coveredCount: 1, issues: [] });
  assert.deepEqual(result.owa.errors, []);
  assert.deepEqual(result.owa.warnings, [UNRESOLVED]);
  assert.deepEqual(result.owa.relationAudit, { rowCount: 1, unresolvedCount: 1, publicationReady: false, issues: [], warnings: [UNRESOLVED] });
});

for (const [name, options, kind] of [
  ['version-conflict', { conflict: true }, 'ambiguous_versions'],
  ['missing-chunks', { missing: true }, 'missing_chunks'],
  ['changed-content', { changed: true }, 'content_mismatch'],
]) {
  test(`${name} fails with structured coverage and a non-rebuild error`, (t) => {
    const f = fixture(t, name, options);
    assertCoverageFailure(f.run(), kind);
  });
}

test('a conflicting-version fixture cannot invoke the harmless auto-fix child marker', (t) => {
  const f = fixture(t, 'auto-fix-conflict', { conflict: true });
  const result = f.run([], NAMESPACE, [], true);
  assert.equal(fs.existsSync(f.marker), false, 'OWA conflicts must never start an auto-fix process');
  assertCoverageFailure(result, 'ambiguous_versions');
});

test('merging retains unrelated namespaces and exit status is scoped to the assessed KB', (t) => {
  const f = fixture(t, 'merge');
  const unrelated = { namespace: 'ComarchOptimaReference', verdict: 'FAIL', errors: ['Existing failure'], warnings: [], files: [], jobs: [] };
  writeJson(path.join(f.reportDir, 'report.json'), { results: [unrelated, { namespace: NAMESPACE, verdict: 'FAIL' }] });
  const result = f.run();
  assert.equal(result.status, 0, result.stdout);
  assert.equal(result.payload.overall, 'FAIL');
  assert.equal(result.owa.verdict, 'WARN');
  assert.deepEqual(result.owa.errors, []);
  assert.deepEqual(result.owa.warnings, [UNRESOLVED]);
  assert.equal(result.owa.promotedCoverage.coveredCount, 1);
  assert.deepEqual(result.payload.results, [unrelated, result.owa]);
});

test('standard required-file, row-count, duplicate-ID and unfinished-job checks remain active', (t) => {
  const f = fixture(t, 'standard-checks');
  fs.unlinkSync(path.join(f.exportDir, 'ontology_field.csv'));
  writeRows(path.join(f.exportDir, 'ontology_relation.csv'), [
    { ...f.relationRows[0], id: 'same', name: 'First' }, { ...f.relationRows[0], id: 'same', name: 'Second' },
  ]);
  f.manifest.files.find((entry) => entry.fileName === 'ontology_entity.csv').rowCount = 9;
  writeJson(path.join(f.exportDir, '_manifest.json'), f.manifest);
  f.buildManifest.jobs[0].status = 'RUNNING';
  writeJson(path.join(f.exportDir, 'build_owa_ontology_jobs_manifest.json'), f.buildManifest);
  const result = f.run();
  assert.equal(result.status, 2, result.stdout);
  assert.equal(result.owa.promotedCoverage.coveredCount, 1);
  for (const expected of ['Missing required CSV: ontology_field.csv',
    'Manifest rowCount mismatch for ontology_entity.csv: declared 9, actual 1',
    'Duplicate IDs in ontology_relation.csv: 1', 'Builder jobs not FINISH: fixture_job:RUNNING']) {
    assert.ok(result.owa.errors.includes(expected), result.owa.errors.join('\n'));
  }
});

test('missing chunk.csv still reports promoted coverage as well as required-file errors', (t) => {
  const f = fixture(t, 'missing-chunk-file');
  fs.unlinkSync(path.join(f.exportDir, 'chunk.csv'));
  const result = f.run();
  assert.equal(result.status, 2, result.stdout);
  assert.deepEqual(result.owa.promotedCoverage.issues.map((item) => item.kind), ['missing_chunks']);
  assert.ok(result.owa.errors.includes('Missing required CSV: chunk.csv'));
  assert.ok(result.owa.errors.includes('OWA promoted coverage missing_chunks: 1'));
});

test('no OWA snapshots avoids reading raw metadata', (t) => {
  const f = fixture(t, 'no-snapshots', { noPromoted: true });
  fs.writeFileSync(path.join(f.root, 'downloads/knowledge_inbox/invalid.json'), 'invalid JSON');
  const result = f.run();
  assert.equal(result.status, 2, result.stdout);
  assert.deepEqual(result.owa.promotedCoverage, { promotedCount: 0, groupCount: 0, coveredCount: 0, issues: [] });
  assert.equal(result.owa.verdict, 'FAIL');
  assert.equal(result.owa.relationAudit.publicationReady, false);
  assert.ok(result.owa.errors.includes('OWA relation audit empty_approved_corpus: 1'));
});

test('non-OWA keeps ID/URL matching without coverage fields or raw reads', (t) => {
  const f = fixture(t, 'non-owa');
  const namespace = 'ComarchOptimaReference';
  const exportDir = path.join(f.root, 'exports/optima_reference/v1');
  fs.mkdirSync(exportDir, { recursive: true });
  const promotedDir = path.join(f.root, 'docs/reference/knowledge_inbox/promoted', namespace);
  writeJson(path.join(promotedDir, 'other.json'), { id: 'other', title: 'Other', content: 'Does not match',
    status: 'promoted', kbNamespace: namespace, sourceUrl: 'https://example.test/other' });
  fs.writeFileSync(path.join(exportDir, 'reference_document.csv'), 'id,sourceUrl\nref,https://example.test/other\n');
  fs.writeFileSync(path.join(exportDir, 'chunk.csv'), 'id,content\nchunk,Decoy https://example.test/other\n');
  writeJson(path.join(exportDir, '_manifest.json'), { files: [
    { fileName: 'reference_document.csv', rowCount: 1 }, { fileName: 'chunk.csv', rowCount: 1 },
  ] });
  writeJson(path.join(exportDir, 'build_optima_reference_jobs_manifest.json'), { jobs: [{ id: 'other_job', status: 'FINISH' }] });
  fs.writeFileSync(path.join(f.root, 'downloads/knowledge_inbox/invalid.json'), 'invalid JSON');
  fs.unlinkSync(path.join(f.codeDir, 'scripts/lib/owa_relation_id_policy.json'));
  fs.unlinkSync(path.join(f.exportDir, 'relation_audit.json'));
  fs.symlinkSync('/not-readable/non-owa-sidecar', path.join(f.exportDir, 'relation_audit.json'));
  const result = f.run([], namespace);
  assert.equal(result.status, 0, result.stdout);
  const other = result.payload.results[0];
  assert.equal(other.verdict, 'PASS');
  assert.equal(Object.hasOwn(other, 'promotedCoverage'), false);
  assert.equal(Object.hasOwn(other, 'relationAudit'), false);
  assert.deepEqual(other.errors, []);
});

test('--fail-on-warn exits 2 for a valid unresolved rehearsal with missing build warning', (t) => {
  const f = fixture(t, 'fail-on-warn');
  fs.unlinkSync(path.join(f.exportDir, 'build_owa_ontology_jobs_manifest.json'));
  const result = f.run(['--fail-on-warn']);
  assert.equal(result.status, 2);
  assert.equal(result.owa.verdict, 'WARN');
  assert.deepEqual(result.owa.errors, []);
  assert.deepEqual(result.owa.warnings, [UNRESOLVED, 'Missing or empty build manifest: build_owa_ontology_jobs_manifest.json']);
  assert.equal(result.owa.relationAudit.publicationReady, false);
});

function assertAuditFailure(result, kind) {
  assert.equal(result.status, 2, result.stdout);
  assert.equal(result.stderr, '');
  assert.equal(result.owa.verdict, 'FAIL');
  assert.equal(result.owa.relationAudit.publicationReady, false);
  assert.ok(result.owa.errors.includes(`OWA relation audit ${kind}: 1`), result.owa.errors.join('\n'));
  assert.ok(result.owa.errors.every((error) => !error.startsWith('Promoted drafts without visible chunks')));
}

for (const [name, malformed] of [
  ['both-frames', 'Q | Invoice A | Other | 1:N | K | proof'],
  ['leading-after-blank', '\nQ | Invoice A | Other | 1:N | K | proof |'],
  ['both-after-blank', '\nQ | Invoice A | Other | 1:N | K | proof'],
]) {
  test(`I-1 gate refuses an otherwise consistent reduced rowset: ${name}`, (t) => {
    // Hand-built CSV/audit fixture: no exporter call, even during arrangement.
    // P survives; Q has no policy entry and must not silently disappear before
    // policy assignment. Coverage, source hash, chunks and sidecar all agree.
    const f = fixture(t, `I-1-reduced-${name}`);
    const baseline = f.run();
    assert.equal(baseline.status, 0, baseline.stdout);
    assert.equal(baseline.owa.verdict, 'WARN');
    assert.deepEqual(baseline.owa.errors, []);
    const content = CONTENT + '\n' + malformed;
    const promotedPath = path.join(f.promotedDir, 'draft_a.json');
    const draft = JSON.parse(fs.readFileSync(promotedPath));
    writeJson(promotedPath, { ...draft, content });
    writeRows(path.join(f.exportDir, 'chunk.csv'), [{ id: 'chunk_a', sourceDocumentRefId: 'OWA_ENTITY_INVOICE_A',
      sourcePath: SOURCE, sectionOrder: '1', content }]);
    f.audit.rows[0].source.contentSha256 = hash(content);
    f.saveAudit();
    const result = f.run();
    assert.deepEqual(result.owa.promotedCoverage, { promotedCount: 1, groupCount: 1, coveredCount: 1, issues: [] });
    assert.equal(result.owa.relationAudit.rowCount, 1);
    assert.ok(result.owa.files.every((file) => file.exists && file.rowCount === 1));
    assertAuditFailure(result, 'invalid_table_row');
    assert.deepEqual(result.owa.errors, ['OWA relation audit invalid_table_row: 1']);
    assert.deepEqual(result.owa.relationAudit.issues.map((issue) => issue.kind), ['invalid_table_row']);
    assert.equal(result.owa.relationAudit.unresolvedCount, 0, 'A failed reconstruction cannot authorize a partial count');
  });
}

for (const [name, mutate, kind] of [
  ['missing-json', (f) => fs.unlinkSync(path.join(f.exportDir, 'relation_audit.json')), 'missing_relation_audit'],
  ['invalid-json', (f) => { fs.writeFileSync(path.join(f.exportDir, 'relation_audit.json'), '{'); f.manifest.relationAudit.sha256 = hash('{'); }, 'invalid_relation_audit_json'],
  ['wrong-hash', (f) => { f.manifest.relationAudit.sha256 = '0'.repeat(64); }, 'relation_audit_hash_mismatch'],
  ['legacy-no-descriptor', (f) => { delete f.manifest.relationAudit; }, 'missing_or_unsupported_relation_audit'],
  ['removed-format', (f) => { delete f.manifest.relationAudit.schemaVersion; }, 'missing_or_unsupported_relation_audit'],
  ['unsupported-format', (f) => { f.manifest.relationAudit.schemaVersion = 2; }, 'missing_or_unsupported_relation_audit'],
  ['descriptor-count', (f) => { f.manifest.relationAudit.rowCount = 9; }, 'relation_audit_descriptor_mismatch'],
  ['descriptor-policy', (f) => { f.manifest.relationAudit.policySha256 = '0'.repeat(64); }, 'relation_audit_descriptor_mismatch'],
  ['nonblank-fk', (f) => { f.relationRows[0].targetEntityRefId = 'OWA_ENTITY_TARGET'; writeRows(path.join(f.exportDir, 'ontology_relation.csv'), f.relationRows); }, 'csv_row_mismatch'],
  ['csv-missing-id', (f) => { writeRows(path.join(f.exportDir, 'ontology_relation.csv'), [], Object.keys(f.relationRows[0])); }, 'missing_csv_id'],
  ['csv-extra-id', (f) => { writeRows(path.join(f.exportDir, 'ontology_relation.csv'), [...f.relationRows, { ...f.relationRows[0], id: 'EXTRA' }]); }, 'extra_csv_id'],
  ['csv-duplicate-id', (f) => { writeRows(path.join(f.exportDir, 'ontology_relation.csv'), [...f.relationRows, f.relationRows[0]]); }, 'duplicate_csv_id'],
]) {
  test(`gate refuses ${name}`, (t) => {
    const f = fixture(t, name);
    mutate(f);
    writeJson(path.join(f.exportDir, '_manifest.json'), f.manifest);
    assertAuditFailure(f.run([], NAMESPACE, [], name === 'missing-json'), kind);
  });
}

for (const [name, mutate, kind = 'audit_row_mismatch'] of [
  ['raw-target', (a) => { a.rows[0].rawTargetLabel = 'Forged'; }],
  ['raw-source', (a) => { a.rows[0].rawSourceLabel = 'Forged'; }],
  ['evidence', (a) => { a.rows[0].source.evidence = 'Forged'; }],
  ['physical-line', (a) => { a.rows[0].source.rowLine = 99; }],
  ['header-line', (a) => { a.rows[0].source.headerLine = 99; }],
  ['content-hash', (a) => { a.rows[0].source.contentSha256 = '0'.repeat(64); }],
  ['raw-cells', (a) => { a.rows[0].source.rawCells[1] = 'forged'; }],
  ['unapproved-source', (a) => { a.rows[0].draftId = 'unapproved'; a.rows[0].source.promotedJsonPath = '/outside/unapproved.json'; }],
  ['raw-source-path', (a) => { a.rows[0].source.rawJsonPath = '../../outside.json'; }],
  ['equivalent-ids', (a) => { a.rows[0].equivalentDraftIds.push('unapproved'); }],
  ['resolution', (a) => { a.rows[0].targetResolution = { status: 'resolved', resolvedRefId: 'OWA_ENTITY_TARGET', reason: 'approved' }; }],
  ['assignment', (a) => { a.rows[0].idAssignment.kind = 'preserved'; }],
  ['extra-field', (a) => { a.rows[0].source.extra = 'forged'; }],
  ['missing-field', (a) => { delete a.rows[0].source.evidence; }],
  ['policy-hash', (a) => { a.policy.sha256 = '0'.repeat(64); }, 'relation_audit_metadata_mismatch'],
  ['policy-time', (a) => { a.policy.observedAt = '2020-01-01T00:00:00Z'; }, 'relation_audit_metadata_mismatch'],
  ['duplicate-id', (a) => { a.rows.push(structuredClone(a.rows[0])); }, 'duplicate_audit_id'],
  ['missing-id', (a) => { a.rows = []; }, 'missing_audit_id'],
  ['extra-id', (a) => { a.rows.push({ ...a.rows[0], id: 'EXTRA' }); }, 'extra_audit_id'],
]) {
  test(`rehashed JSON cannot hide ${name} tampering`, (t) => {
    const f = fixture(t, `rehashed-${name}`);
    mutate(f.audit);
    f.saveAudit();
    const forbidden = name === 'unapproved-source' ? ['/outside/unapproved.json']
      : name === 'raw-source-path' ? [path.resolve(f.root, '../../outside.json')] : [];
    assertAuditFailure(f.run([], NAMESPACE, forbidden), kind);
  });
}

for (const name of ['../relation_audit.json', '/outside/relation_audit.json', 'other.json', 'symlink', 'directory']) {
  test(`sidecar ${name} is refused before any read`, (t) => {
    const f = fixture(t, `unsafe-${name.replaceAll('/', '_')}`);
    const sidecar = path.join(f.exportDir, 'relation_audit.json');
    const outside = path.join(f.root, 'unapproved.json');
    fs.writeFileSync(outside, 'must never read');
    if (name === 'symlink' || name === 'directory') {
      fs.unlinkSync(sidecar);
      if (name === 'symlink') fs.symlinkSync(outside, sidecar);
      else fs.mkdirSync(sidecar);
    } else f.manifest.relationAudit.fileName = name;
    writeJson(path.join(f.exportDir, '_manifest.json'), f.manifest);
    const result = f.run([], NAMESPACE, [sidecar, outside, path.resolve(f.exportDir, name)]);
    assertAuditFailure(result, name === 'symlink' || name === 'directory' ? 'unsafe_relation_audit_file' : 'missing_or_unsupported_relation_audit');
  });
}

test('unqualified snapshot metadata fails rather than trusting matching sidecar and CSV', (t) => {
  const f = fixture(t, 'unqualified');
  const registryPath = path.join(f.root, 'docs/reference/knowledge_inbox/registry.json');
  const registry = JSON.parse(fs.readFileSync(registryPath));
  registry.entries[0].rawJsonPath = '/outside/unapproved.json';
  writeJson(registryPath, registry);
  assertAuditFailure(f.run(), 'invalid_provenance');
});

test('self-consistent rehashed JSON and CSV cannot replace the approved relation ID', (t) => {
  const f = fixture(t, 'forged-csv-and-json');
  f.relationRows[0].id = 'FORGED';
  f.audit.rows[0].id = 'FORGED';
  writeRows(path.join(f.exportDir, 'ontology_relation.csv'), f.relationRows);
  f.saveAudit();
  const result = f.run();
  assertAuditFailure(result, 'missing_audit_id');
  for (const kind of ['extra_audit_id', 'missing_csv_id', 'extra_csv_id']) {
    assert.ok(result.owa.errors.includes(`OWA relation audit ${kind}: 1`));
  }
});

for (const name of ['missing', 'malformed']) {
  test(`${name} static policy fails closed with an OWA relation result`, (t) => {
    const f = fixture(t, `policy-${name}`);
    const policyPath = path.join(f.codeDir, 'scripts/lib/owa_relation_id_policy.json');
    if (name === 'missing') fs.unlinkSync(policyPath);
    else fs.writeFileSync(policyPath, '{');
    assertAuditFailure(f.run(), name === 'missing' ? 'owa_relation_policy_read_failed' : 'owa_relation_policy_json_invalid');
  });
}

test('OWA manifest cannot smuggle arbitrary source files through the CSV list', (t) => {
  const f = fixture(t, 'manifest-source-file');
  const outside = path.join(f.root, 'unapproved-source.json');
  fs.writeFileSync(outside, 'unapproved content');
  f.manifest.files.push({ fileName: '../../../unapproved-source.json', rowCount: 1 });
  writeJson(path.join(f.exportDir, '_manifest.json'), f.manifest);
  assertAuditFailure(f.run([], NAMESPACE, [outside]), 'invalid_csv_file');
});

for (const [name, mutate] of [
  ['absent', (manifest) => { delete manifest.files; }],
  ['nonarray-object', (manifest) => { manifest.files = {}; }],
  ['nonarray-null', (manifest) => { manifest.files = null; }],
  ['empty', (manifest) => { manifest.files = []; }],
  ...REQUIRED.map((fileName) => [`omitted-${fileName}`, (manifest) => {
    manifest.files = manifest.files.filter((entry) => entry.fileName !== fileName);
  }]),
  ['duplicate-replacing-required', (manifest) => { manifest.files[4] = { ...manifest.files[0] }; }],
  ['duplicate-extra', (manifest) => { manifest.files.push({ ...manifest.files[0] }); }],
  ['sidecar-extra', (manifest) => { manifest.files.push({ fileName: 'relation_audit.json', rowCount: 1 }); }],
  ['null-entry', (manifest) => { manifest.files[0] = null; }],
]) {
  test(`fix1 manifest requires the exact five-CSV set: ${name}`, (t) => {
    const f = fixture(t, `fix1-manifest-${name}`);
    mutate(f.manifest);
    writeJson(path.join(f.exportDir, '_manifest.json'), f.manifest);
    const result = f.run([], NAMESPACE, [], true);
    assertAuditFailure(result, 'invalid_manifest_csv_set');
    assert.ok(result.owa.relationAudit.issues.some((issue) => issue.kind === 'invalid_manifest_csv_set'));
    assert.equal(result.owa.promotedCoverage.coveredCount, 1);
  });
}

for (const [name, change, kind] of [
  ['duplicate-fk-hides-nonblank', (columns, cells) => {
    cells[columns.indexOf('targetEntityRefId')] = csvCell('OWA_ENTITY_TARGET');
    columns.push('targetEntityRefId'); cells.push(csvCell(''));
  }, 'relation_csv_duplicate_header'],
  ['duplicate-identical-header', (columns, cells) => { columns.push('predicate'); cells.push(csvCell('P')); }, 'relation_csv_duplicate_header'],
  ['extra-unheaded-cell', (_columns, cells) => { cells.push(csvCell('hidden data')); }, 'relation_csv_arity_mismatch'],
  ['truncated-final-blank-field', (_columns, cells) => { cells.pop(); }, 'relation_csv_arity_mismatch'],
  ['missing-header', (columns, cells) => { const index = columns.indexOf('status'); columns.splice(index, 1); cells.splice(index, 1); }, 'relation_csv_schema_mismatch'],
  ['extra-header', (columns, cells) => { columns.push('unapproved'); cells.push(csvCell('')); }, 'relation_csv_schema_mismatch'],
  ['unclosed-quote', (_columns, cells) => { cells[cells.length - 1] = cells.at(-1).slice(0, -1); }, 'relation_csv_invalid_quoting'],
  ['quote-in-unquoted-cell', (columns, cells) => { cells[columns.indexOf('predicate')] = 'P"'; }, 'relation_csv_invalid_quoting'],
  ['text-after-closing-quote', (columns, cells) => { cells[columns.indexOf('predicate')] = '"P"junk'; }, 'relation_csv_invalid_quoting'],
]) {
  test(`fix1 relation CSV rejects structure before conversion: ${name}`, (t) => {
    const f = fixture(t, `fix1-csv-${name}`);
    const columns = Object.keys(f.relationRows[0]);
    const cells = columns.map((key) => csvCell(f.relationRows[0][key]));
    change(columns, cells);
    fs.writeFileSync(path.join(f.exportDir, 'ontology_relation.csv'), `${columns.join(',')}\n${cells.join(',')}\n`);
    const result = f.run([], NAMESPACE, [], true);
    assertAuditFailure(result, kind);
    assert.equal(result.owa.relationAudit.issues.filter((issue) => issue.kind === kind).length, 1);
    assert.equal(result.owa.promotedCoverage.coveredCount, 1);
  });
}

test('fix1 valid relation CSV still accepts escaped quotes, embedded newlines, CRLF and EOF without newline', (t) => {
  const f = fixture(t, 'fix1-valid-csv');
  const promotedPath = path.join(f.promotedDir, 'draft_a.json');
  const draft = JSON.parse(fs.readFileSync(promotedPath));
  draft.content = CONTENT.replace('A.id = B.id', 'A."id" = B.id');
  writeJson(promotedPath, draft);
  f.audit.rows[0].source.contentSha256 = hash(draft.content);
  f.audit.rows[0].source.rawCells[4] = ' A."id" = B.id ';
  f.saveAudit();
  f.relationRows[0].description = 'A."id" = B.id';
  f.relationRows[0].joinCondition = 'A."id" = B.id';
  f.relationRows[0].summary = 'P A."id" = B.id';
  writeRows(path.join(f.exportDir, 'ontology_relation.csv'), f.relationRows);
  // The approved JOIN has an escaped quote. Chunks already contain embedded
  // newlines/quotes and must retain their existing parsing and coverage behavior.
  const chunkFile = path.join(f.exportDir, 'chunk.csv');
  fs.writeFileSync(chunkFile, fs.readFileSync(chunkFile, 'utf8').replace(CONTENT.replaceAll('"', '""'), draft.content.replaceAll('"', '""')));
  const relationFile = path.join(f.exportDir, 'ontology_relation.csv');
  fs.writeFileSync(relationFile, fs.readFileSync(relationFile, 'utf8').trimEnd().replaceAll('\n', '\r\n'));
  const result = f.run();
  assert.equal(result.status, 0, result.stdout);
  assert.equal(result.owa.verdict, 'WARN');
  assert.deepEqual(result.owa.errors, []);
  assert.deepEqual(result.owa.warnings, [UNRESOLVED]);
});
