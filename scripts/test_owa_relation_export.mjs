import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { compileOwaRelationPolicy } from './lib/owa_relation_policy.mjs';
import { fixtureOwaRelationPolicy } from './test_helpers/owa_relation_fixtures.mjs';

const root = '/tmp/opencode/owa-relation-pure-fixture';
const content = '# Fixture\r\n\r\n## Relacje ontologiczne\r\n'
  + '|  Predykat\t | Encja źródłowa | Encja docelowa | Kardynalność | Warunek JOIN | Dowód |\r\n'
  + '|---|---|---|---|---|---|\r\n'
  + '| P | Child concept | Target | N:1 | `A.x = B.y` | [S1: L2] |\r\n';
const draft = {
  id: 'approved', title: 'Encja: Fixture', content, equivalentDraftIds: ['approved', 'equivalent'],
  promotedJsonPath: `${root}/docs/reference/knowledge_inbox/promoted/OWAOntology/approved.json`,
  promotedMarkdownPath: 'docs/reference/knowledge_inbox/promoted/OWAOntology/approved.md',
  sourceDraftPath: `${root}/downloads/knowledge_inbox/2026-10-23/approved.json`,
  rawMarkdownPath: `${root}/downloads/knowledge_inbox/2026-10-23/approved.md`,
};

test('buildOwaRelationRows preserves original provenance, owner and raw cells while leaving FK blank', async () => {
  const { buildOwaRelationRows } = await import('./lib/owa_relation_export.mjs');
  const before = structuredClone(draft);
  const result = buildOwaRelationRows({ draft, entityId: 'OWA_ENTITY_ENCJA_FIXTURE', root, policy: compileOwaRelationPolicy(fixtureOwaRelationPolicy()) });
  assert.deepEqual(result.rows, [{
    id: 'OWA_REL_LAYOUT_P_TARGET', name: 'P', description: '`A.x = B.y`', semanticType: 'ontology_relation',
    sourceEntityRefId: 'OWA_ENTITY_ENCJA_FIXTURE', targetEntityRefId: '', predicate: 'P', cardinality: 'N:1',
    relationType: '', joinCondition: '`A.x = B.y`', status: '', summary: 'P `A.x = B.y`',
  }]);
  assert.deepEqual(result.auditRows, [{
    id: 'OWA_REL_LAYOUT_P_TARGET', sourceEntityRefId: 'OWA_ENTITY_ENCJA_FIXTURE', predicate: 'P',
    rawSourceLabel: 'Child concept', rawTargetLabel: 'Target', legacyTargetRefId: 'OWA_ENTITY_TARGET',
    targetResolution: { status: 'unresolved', resolvedRefId: '', reason: 'not_approved' }, idAssignment: { kind: 'preserved' },
    draftId: 'approved', equivalentDraftIds: ['approved', 'equivalent'],
    source: {
      promotedJsonPath: 'docs/reference/knowledge_inbox/promoted/OWAOntology/approved.json',
      promotedMarkdownPath: 'docs/reference/knowledge_inbox/promoted/OWAOntology/approved.md',
      rawJsonPath: 'downloads/knowledge_inbox/2026-10-23/approved.json', rawMarkdownPath: 'downloads/knowledge_inbox/2026-10-23/approved.md',
      contentSha256: createHash('sha256').update(content).digest('hex'), lineBasis: 'snapshot.content', tableIndex: 1,
      headerLine: 4, rowLine: 6, rawHeaders: ['  Predykat\t ', ' Encja źródłowa ', ' Encja docelowa ', ' Kardynalność ', ' Warunek JOIN ', ' Dowód '],
      rawCells: [' P ', ' Child concept ', ' Target ', ' N:1 ', ' `A.x = B.y` ', ' [S1: L2] '], evidence: '[S1: L2]',
    },
  }]);
  assert.deepEqual(draft, before);
});

test('buildOwaRelationRows keeps legacy targets solely in audit and uses the entire policy tuple', async () => {
  const { buildOwaRelationRows } = await import('./lib/owa_relation_export.mjs');
  const policyValue = fixtureOwaRelationPolicy();
  policyValue.entries.push({ sourceEntityRefId: 'OWA_ENTITY_ENCJA_FIXTURE', predicate: 'P', legacyTargetRefId: 'OWA_ENTITY_OTHER', id: 'OWA_REL_OTHER_NEW', state: 'new' });
  const two = { ...draft, content: `${content}| P | Child concept | Other | N:1 | Another JOIN | Another proof |\r\n` };
  const result = buildOwaRelationRows({ draft: two, entityId: 'OWA_ENTITY_ENCJA_FIXTURE', root, policy: compileOwaRelationPolicy(policyValue) });
  assert.deepEqual(result.rows.map((row) => [row.id, row.targetEntityRefId, row.joinCondition]), [
    ['OWA_REL_LAYOUT_P_TARGET', '', '`A.x = B.y`'], ['OWA_REL_OTHER_NEW', '', 'Another JOIN'],
  ]);
  assert.deepEqual(result.auditRows.map((row) => [row.rawTargetLabel, row.legacyTargetRefId, row.idAssignment.kind, row.source.rowLine]), [
    ['Target', 'OWA_ENTITY_TARGET', 'preserved', 6], ['Other', 'OWA_ENTITY_OTHER', 'new', 7],
  ]);
  for (const row of result.rows) {
    assert.equal(Object.hasOwn(row, 'legacyTargetRefId'), false);
    assert.equal(Object.hasOwn(row, 'rawTargetLabel'), false);
  }
});

for (const [name, changed, kind] of [
  ['unknown key', content.replace('| P |', '| unknown |'), 'owa_relation_key_missing'],
  ['retired key', content.replace('| P |', '| retired |'), 'owa_relation_retired'],
  ['bad table', content.replace('Warunek JOIN', 'JOIN'), 'unknown_header'],
]) {
  test(`buildOwaRelationRows refuses ${name} without fallback`, async () => {
    const { buildOwaRelationRows } = await import('./lib/owa_relation_export.mjs');
    assert.throws(() => buildOwaRelationRows({ draft: { ...draft, content: changed }, entityId: 'OWA_ENTITY_ENCJA_FIXTURE', root,
      policy: compileOwaRelationPolicy(fixtureOwaRelationPolicy()) }), (error) => error.kind === kind && Boolean(error.reason));
  });
}

test('buildOwaRelationRows returns empty rowsets for a section without relations', async () => {
  const { buildOwaRelationRows } = await import('./lib/owa_relation_export.mjs');
  assert.deepEqual(buildOwaRelationRows({ draft: { ...draft, content: '## Relacje ontologiczne\nNone approved.' },
    entityId: 'OWA_ENTITY_ENCJA_FIXTURE', root, policy: compileOwaRelationPolicy(fixtureOwaRelationPolicy()) }), { rows: [], auditRows: [] });
});

async function assessmentFixture() {
  const module = await import('./lib/owa_relation_export.mjs');
  const policy = compileOwaRelationPolicy(fixtureOwaRelationPolicy());
  const policySha256 = 'b'.repeat(64);
  const built = module.buildOwaRelationRows({ draft, entityId: 'OWA_ENTITY_ENCJA_FIXTURE', root, policy });
  const audit = { schemaVersion: 1, namespace: 'OWAOntology', policy: { schemaVersion: 1, sha256: policySha256, observedAt: policy.observedAt }, rows: built.auditRows };
  const args = { root, policy, policySha256, selectedDrafts: [structuredClone(draft)], relationRows: built.rows, manifest: {} };
  function rehash() {
    args.auditBytes = Buffer.from(`${JSON.stringify(audit, null, 2)}\n`);
    args.manifest.relationAudit = { schemaVersion: 1, fileName: 'relation_audit.json', rowCount: audit.rows.length,
      sha256: createHash('sha256').update(args.auditBytes).digest('hex'), policySha256 };
  }
  rehash();
  return { assess: module.assessOwaRelationExport, args, audit, rehash };
}

test('assessor validates exact raw-byte digest and rebuilds unresolved rows without I/O or mutation', async () => {
  const { assess, args } = await assessmentFixture();
  assert.equal(typeof assess, 'function', 'Task 4 assessor must be exported');
  const before = structuredClone(args);
  before.auditBytes = Buffer.from(before.auditBytes);
  assert.deepEqual(assess(args), { rowCount: 1, unresolvedCount: 1, publicationReady: false, issues: [],
    warnings: ['OWA unresolved relation targets: 1; publicationReady=false'] });
  assert.deepEqual(args, before);
  const whitespace = { ...args, auditBytes: Buffer.concat([args.auditBytes, Buffer.from(' ')]) };
  assert.ok(assess(whitespace).issues.some((issue) => issue.kind === 'relation_audit_hash_mismatch'));
});

for (const [name, mutate, kind] of [
  ['rehashed target', (f) => { f.audit.rows[0].rawTargetLabel = 'Forged'; f.rehash(); }, 'audit_row_mismatch'],
  ['rehashed missing source', (f) => { delete f.audit.rows[0].source; f.rehash(); }, 'audit_row_mismatch'],
  ['rehashed extra envelope field', (f) => { f.audit.extra = 'forged'; f.rehash(); }, 'relation_audit_metadata_mismatch'],
  ['rehashed envelope namespace', (f) => { f.audit.namespace = 'Other'; f.rehash(); }, 'relation_audit_metadata_mismatch'],
  ['missing CSV field', (f) => { delete f.args.relationRows[0].targetEntityRefId; }, 'csv_row_mismatch'],
  ['extra CSV field', (f) => { f.args.relationRows[0].extra = ''; }, 'csv_row_mismatch'],
  ['self-consistent forged ID', (f) => { f.args.relationRows[0].id = 'forged'; f.audit.rows[0].id = 'forged'; f.rehash(); }, 'missing_audit_id'],
  ['legacy manifest', (f) => { delete f.args.manifest.relationAudit; }, 'missing_or_unsupported_relation_audit'],
  ['no selected snapshots', (f) => { f.args.selectedDrafts = []; }, 'empty_approved_corpus'],
  ['snapshot outside policy', (f) => { f.args.selectedDrafts[0].content = content.replace('| P |', '| unknown |'); }, 'owa_relation_key_missing'],
  ['parser refusal', (f) => { f.args.selectedDrafts[0].content = content.replace('Warunek JOIN', 'JOIN'); }, 'unknown_header'],
]) {
  test(`assessor refuses ${name}`, async () => {
    const f = await assessmentFixture();
    assert.equal(typeof f.assess, 'function', 'Task 4 assessor must be exported');
    mutate(f);
    const result = f.assess(f.args);
    assert.equal(result.publicationReady, false);
    assert.ok(result.issues.some((issue) => issue.kind === kind), JSON.stringify(result));
    assert.ok(result.issues.every((issue) => typeof issue.reason === 'string' && Boolean(issue.reason)));
  });
}
