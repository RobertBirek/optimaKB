import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAMESPACE = 'OWAOntology';
const EVIDENCE = fs.mkdtempSync('/tmp/opencode/owa-quality-cli-');
console.log(`OWA CLI evidence: ${EVIDENCE}`);
const CONTENT = "Customer's `literal` invoice.\nSecond line, with \"quotes\".\n\nApproved content.";
const SOURCE = 'downloads/knowledge_inbox/2026-01-01/draft_a.md';
const REQUIRED = ['ontology_entity.csv', 'ontology_field.csv', 'ontology_relation.csv', 'workflow_pattern.csv', 'chunk.csv'];

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

// Run the real CLI against complete offline staging; only the forbidden child is a harmless marker.
function fixture(t, name, { equivalent = false, conflict = false, missing = false, changed = false, noPromoted = false } = {}) {
  const root = fs.mkdtempSync(path.join(EVIDENCE, `${name}-root-`));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const reportDir = path.join(EVIDENCE, name);
  fs.mkdirSync(reportDir, { recursive: true });
  const exportDir = path.join(root, 'exports/owa_ontology/v1');
  fs.mkdirSync(exportDir, { recursive: true });
  const draft = {
    id: 'draft_a', title: 'Invoice A', content: CONTENT, kbNamespace: NAMESPACE,
    status: 'promoted', promotedAt: '2026-01-01',
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
  // No Markdown fixture: the gate must use approved snapshots, never recover raw content.
  const columns = ['id', 'sourceDocumentRefId', 'sourcePath', 'sectionOrder', 'content'];
  const chunk = ['chunk_a', missing ? 'OWA_ENTITY_DECOY' : 'OWA_ENTITY_INVOICE_A', SOURCE, '1',
    missing ? 'Decoy mentions draft_a.' : changed ? CONTENT.replace('Approved', 'Changed') : CONTENT];
  fs.writeFileSync(path.join(exportDir, 'chunk.csv'), `${columns.join(',')}\n${chunk.map(csvCell).join(',')}\n`);
  for (const fileName of REQUIRED.filter((file) => file !== 'chunk.csv')) {
    fs.writeFileSync(path.join(exportDir, fileName), `id,name\n${fileName.replace('.csv', '')}_1,Fixture\n`);
  }
  const manifest = { generatedAt: '2026-01-01', files: REQUIRED.map((fileName) => ({ fileName, rowCount: 1 })) };
  writeJson(path.join(exportDir, '_manifest.json'), manifest);
  const buildManifest = { jobs: [{ id: 'fixture_job', fileName: 'chunk.csv', status: 'FINISH' }] };
  writeJson(path.join(exportDir, 'build_owa_ontology_jobs_manifest.json'), buildManifest);
  const marker = path.join(root, 'child-invoked');
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'scripts/process_knowledge_inbox.mjs'),
    "import fs from 'node:fs'; fs.writeFileSync('child-invoked', 'fixture-only child ran');\n");

  let invocation = 0;
  return {
    root, exportDir, promotedDir, reportDir, marker, manifest, buildManifest,
    run(extra = [], namespace = NAMESPACE) {
      invocation += 1;
      const outJson = path.join(reportDir, 'report.json');
      const outMd = path.join(reportDir, 'report.md');
      const result = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts/kb_quality_gate.mjs'),
        '--kb', namespace, '--json-only', ...extra], {
        cwd: root,
        env: { ...process.env, ROOT: root, KB_QUALITY_GATE_OUT_JSON: outJson,
          KB_QUALITY_GATE_OUT_MD: outMd, OPENSPG_COOKIE: '', OPENSPG_COOKIE_FILE: '' },
        encoding: 'utf8', timeout: 10000,
      });
      fs.writeFileSync(path.join(reportDir, `run-${invocation}.stdout`), result.stdout || '');
      fs.writeFileSync(path.join(reportDir, `run-${invocation}.stderr`), result.stderr || '');
      writeJson(path.join(reportDir, `run-${invocation}.exit.json`), { status: result.status, signal: result.signal, error: result.error?.message });
      assert.ifError(result.error);
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
  assert.deepEqual(result.owa.errors, [`OWA promoted coverage ${kind}: 1`]);
  assert.deepEqual(result.owa.warnings, []);
  assert.ok(result.owa.files.every((file) => file.exists && file.rowCount === 1));
  assert.equal(result.owa.jobs[0].status, 'FINISH');
}

test('equivalent revisions with different IDs/dates pass complete OWA coverage', (t) => {
  const f = fixture(t, 'equivalent', { equivalent: true });
  const result = f.run();
  assert.equal(result.stderr, '', result.stderr);
  assert.equal(result.status, 0, result.stdout);
  assert.equal(result.owa.verdict, 'PASS');
  assert.deepEqual(result.owa.promotedCoverage, { promotedCount: 2, groupCount: 1, coveredCount: 1, issues: [] });
  assert.deepEqual(result.owa.errors, []);
  assert.deepEqual(result.owa.warnings, []);
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
  const result = f.run(['--auto-fix']);
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
  assert.equal(result.owa.verdict, 'PASS');
  assert.equal(result.owa.promotedCoverage.coveredCount, 1);
  assert.deepEqual(result.payload.results, [unrelated, result.owa]);
});

test('standard required-file, row-count, duplicate-ID and unfinished-job checks remain active', (t) => {
  const f = fixture(t, 'standard-checks');
  fs.unlinkSync(path.join(f.exportDir, 'ontology_field.csv'));
  fs.writeFileSync(path.join(f.exportDir, 'ontology_relation.csv'), 'id,name\nsame,First\nsame,Second\n');
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
  assert.equal(result.status, 0, result.stdout);
  assert.deepEqual(result.owa.promotedCoverage, { promotedCount: 0, groupCount: 0, coveredCount: 0, issues: [] });
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
  const result = f.run([], namespace);
  assert.equal(result.status, 0, result.stdout);
  const other = result.payload.results[0];
  assert.equal(other.verdict, 'PASS');
  assert.equal(Object.hasOwn(other, 'promotedCoverage'), false);
  assert.deepEqual(other.errors, []);
});
