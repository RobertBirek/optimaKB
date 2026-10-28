import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { copyOwaCodeForTests, fixtureOwaRelationPolicy } from './test_helpers/owa_relation_fixtures.mjs';

// Offline only: retain fixtures and actual CLI output as reviewable evidence.
const EVIDENCE = fs.mkdtempSync('/tmp/opencode/owa-export-cli-');
console.log(`OWA export CLI evidence: ${EVIDENCE}`);
const NS = 'OWAOntology';
const PROMOTED = `docs/reference/knowledge_inbox/promoted/${NS}`;
const REGISTRY = 'docs/reference/knowledge_inbox/registry.json';
const OCTOBER = 'downloads/knowledge_inbox/2026-10-23';
const JULY = 'downloads/knowledge_inbox/2026-07-17';
const COLUMNS = {
  'ontology_entity.csv': ['id', 'name', 'description', 'semanticType', 'canonicalName', 'ontologyId', 'verificationStatus', 'confidenceLevel', 'businessDomain', 'mainTable', 'mcpReadTools', 'mcpWriteTools', 'aliases', 'summary'],
  'ontology_field.csv': ['id', 'name', 'description', 'semanticType', 'entityRefId', 'fieldName', 'mssqlColumn', 'mcpField', 'sqlType', 'nullable', 'keyRole', 'mappingStatus', 'summary'],
  'ontology_relation.csv': ['id', 'name', 'description', 'semanticType', 'sourceEntityRefId', 'targetEntityRefId', 'predicate', 'cardinality', 'relationType', 'joinCondition', 'status', 'summary'],
  'workflow_pattern.csv': ['id', 'name', 'description', 'semanticType', 'workflowName', 'sourceEntityRefId', 'targetEntityRefId', 'mcpTool', 'mode', 'status', 'summary'],
  'chunk.csv': ['id', 'name', 'description', 'semanticType', 'sourceDocumentRefId', 'sourcePath', 'sectionHeading', 'sectionOrder', 'content'],
};

// Verbatim excerpts of the approved October synthesis, read from the preserved
// frozen snapshot draft_2026-10-23_17aa0a1c_encja-korekta-zbiorcza-fa.json.
// No technical relation or endpoint is invented for this business assertion.
const BUSINESS = 'W proponowanej encji sprzedażowej jeden dokument korekty może odnosić się do wielu faktur sprzedaży. Pomoc opisuje listę tych faktur na zakładce Dokumenty korekty oraz odnośnik do korekty w każdej fakturze źródłowej. Nie wynika z tego obowiązek tworzenia osobnego dokumentu korygującego dla każdej faktury. [S1: L30, L32, L36]';
const SYNTHESIS = `# Encja: Korekta zbiorcza FA

## Status weryfikacji

- Nazwa: \`Encja: Korekta zbiorcza FA\`.
- Identyfikator ontologiczny: \`OWAOntology.KorektaZbiorczaFA\`.
- Zakres proponowany: zbiorcza korekta rabatowa faktur sprzedaży; odniesienie do wariantu zakupowego stanowi kontekst produktu.

## Opis biznesowy

${BUSINESS}

## MCP i API

**UNKNOWN:** dostępność i kontrakt bieżącej operacji MCP/API dla korekty zbiorczej. Zweryfikowane tu źródła nie potwierdzają \`create_sales_correction\` ani \`POST /api/v1/sales/correction\`. Nie dowodzą też nieistnienia takiej operacji. [S1–S3]`;

// Separate synthetic parser contract: all original section styles and one row
// per table, plus independently known 1800-character chunk boundaries.
const MAPPING = `# Encja: Fixture

- Status: verified
- Poziom pewności: high
- Aliasy: sample

## Opis biznesowy
Fixture's "quoted", Magazyn description.

## Źródła danych
| Rola | Schemat | Tabela |
|---|---|---|
| Tabela główna | CDN | Fixture |

## Pola i mapowanie API ↔ MSSQL
| A | API | B | Kolumna | Typ | Null | Klucz | Opis | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | id | x | FixtureId | int | NO | PK | Field description | verified |

## Relacje ontologiczne
| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Warunek JOIN | Status |
|---|---|---|---|---|---|---|
| belongs | x | Target | N:1 | synthetic | a.id=b.id | verified |

## Endpointy OptimaMCP
### WRITE
- \`fixture_write\` \`POST /fixture\` — Fixture operation`;
const LONG = 'x'.repeat(1800);
const MAPPING_CONTENT = `${MAPPING}\n\n${LONG}\n\nFinal approved paragraph.`;

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function write(root, relative, value) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`);
}

function fixture(name) {
  const root = fs.mkdtempSync(path.join(EVIDENCE, `${name}-`));
  const codeRoot = path.join(root, 'private-code');
  const { cliPath } = copyOwaCodeForTests(codeRoot, fixtureOwaRelationPolicy());
  const entries = [];
  function add(id, title, content, inbox = OCTOBER) {
    const rawJsonPath = `${inbox}/${id}.json`;
    const promotedJsonPath = `${PROMOTED}/${id}.json`;
    const promotedMarkdownPath = `${PROMOTED}/${id}.md`;
    write(root, rawJsonPath, { id, title, kbNamespace: NS, content: 'Changed unapproved raw text.' });
    write(root, rawJsonPath.replace(/\.json$/, '.md'), 'Changed unapproved Markdown.');
    const draft = { id, title, content, kbNamespace: NS, status: 'promoted',
      createdAt: '2026-10-23', promotedAt: '2026-10-23', sourceDraftPath: rawJsonPath };
    write(root, promotedJsonPath, draft);
    write(root, promotedMarkdownPath, 'Promoted Markdown is not a content source either.');
    entries.push({ draftId: id, title, kbNamespace: NS, status: 'promoted', rawJsonPath,
      promotedJsonPath, promotedMarkdownPath });
    return draft;
  }
  add('approved_a', 'Encja: Korekta zbiorcza FA', SYNTHESIS);
  const f = {
    root, entries, add, codeRoot, cliPath, exportDir: path.join(root, 'exports/owa_ontology/v1'),
    saveRegistry() { write(root, REGISTRY, { entries }); },
    run() {
      const result = spawnSync(process.execPath, [cliPath], {
        cwd: root, env: { ROOT: root, LANG: 'C.UTF-8' }, encoding: 'utf8', timeout: 10000,
      });
      write(root, 'cli.stdout', result.stdout || '');
      write(root, 'cli.stderr', result.stderr || '');
      write(root, 'cli.exit.json', { status: result.status, signal: result.signal, error: result.error?.message });
      assert.ifError(result.error);
      return result;
    },
  };
  f.saveRegistry();
  return f;
}

function readCsv(file) {
  const text = fs.readFileSync(file, 'utf8');
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (!quoted && (char === ',' || char === '\n')) {
      row.push(cell); cell = '';
      if (char === '\n') { rows.push(row); row = []; }
    } else cell += char;
  }
  assert.equal(quoted, false, 'CSV must have balanced quotes');
  const columns = rows.shift();
  for (const values of rows) assert.equal(values.length, columns.length);
  return { columns, rows: rows.map((values) => Object.fromEntries(columns.map((key, i) => [key, values[i]]))) };
}

function inventory(dir) {
  if (!fs.existsSync(dir)) return null;
  return Object.fromEntries(fs.readdirSync(dir).sort().map((file) => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    return [file, { sha256: hash(fs.readFileSync(full)), uid: stat.uid, gid: stat.gid, mode: stat.mode & 0o7777 }];
  }));
}

function seed(f) {
  for (const file of [...Object.keys(COLUMNS), 'README.md', '_manifest.json', 'relation_audit.json', 'build_owa_ontology_jobs_manifest.json']) {
    write(f.exportDir, file, `BASELINE SENTINEL ${file}\n`);
    fs.chmodSync(path.join(f.exportDir, file), 0o640);
  }
}

function refused(f, kind) {
  const before = inventory(f.exportDir);
  const result = f.run();
  assert.equal(result.status, 2, result.stderr || result.stdout);
  assert.equal(result.stdout, '', 'Refusal must not emit success output');
  const payload = JSON.parse(result.stderr);
  assert.equal(payload.ok, false);
  assert.equal(payload.namespace, NS);
  assert.ok(payload.issues.some((issue) => issue.kind === kind), JSON.stringify(payload));
  for (const issue of payload.issues) {
    assert.equal(typeof issue.title, 'string');
    assert.ok(Array.isArray(issue.draftIds));
    assert.ok(issue.reason.trim());
  }
  assert.deepEqual(inventory(f.exportDir), before, 'Refusal must preserve all output bytes/ownership/modes or directory absence');
  return payload;
}

test('approved snapshots beat longer withdrawn raw and changed raw; schemas, full chunks and October provenance survive', () => {
  const f = fixture('approved');
  f.add('approved_z', 'Encja: Korekta zbiorcza FA', SYNTHESIS, JULY);
  f.add('fixture', 'Encja: Fixture', MAPPING_CONTENT, JULY);
  write(f.root, `${JULY}/withdrawn.json`, { id: 'withdrawn', title: 'Encja: Korekta zbiorcza FA',
    kbNamespace: NS, createdAt: '2027-01-01', content: `${SYNTHESIS}\n\n- Aliasy: retired alias\n- Status: retired status\n- Poziom pewności: retired certainty\n${'Retired text. '.repeat(800)}` });
  f.entries.push({ draftId: 'withdrawn', kbNamespace: NS, status: 'withdrawn' });
  f.saveRegistry();
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.namespace, NS);
  assert.equal(payload.selectedDraftCount, 2);
  assert.equal(payload.exportDir, f.exportDir);
  const counts = { 'ontology_entity.csv': 2, 'ontology_field.csv': 1, 'ontology_relation.csv': 1, 'workflow_pattern.csv': 1, 'chunk.csv': 4 };
  const csvs = {};
  for (const [file, columns] of Object.entries(COLUMNS)) {
    const csv = csvs[file] = readCsv(path.join(f.exportDir, file));
    assert.deepEqual(csv.columns, columns);
    assert.equal(csv.rows.length, counts[file], file);
    assert.equal(new Set(csv.rows.map((row) => row.id)).size, csv.rows.length, file);
  }
  const entity = csvs['ontology_entity.csv'].rows.find((row) => row.canonicalName === 'Korekta zbiorcza FA');
  assert.equal(entity.id, 'OWA_ENTITY_ENCJA_KOREKTA_ZBIORCZA_FA');
  assert.equal(entity.description, BUSINESS);
  assert.equal(entity.aliases, '');
  assert.equal(entity.verificationStatus, '');
  assert.equal(entity.confidenceLevel, '');
  assert.equal(entity.mcpWriteTools, '');
  assert.ok(csvs['ontology_relation.csv'].rows.every((row) => row.sourceEntityRefId !== entity.id));
  assert.ok(csvs['workflow_pattern.csv'].rows.every((row) => row.sourceEntityRefId !== entity.id));
  assert.equal(csvs['ontology_field.csv'].rows[0].id, 'OWA_FIELD_FIXTURE_FIXTUREID');
  assert.equal(csvs['ontology_relation.csv'].rows[0].id, 'OWA_REL_FIXTURE_BELONGS_TARGET');
  assert.equal(csvs['ontology_relation.csv'].rows[0].targetEntityRefId, '', 'Unapproved relation targets must never become graph FKs');
  assert.equal(csvs['workflow_pattern.csv'].rows[0].id, 'OWA_WF_FIXTURE_FIXTURE_WRITE_0');
  assert.equal(csvs['ontology_entity.csv'].rows.find((row) => row.canonicalName === 'Fixture').mainTable, 'CDN.Fixture');
  assert.deepEqual(csvs['chunk.csv'].rows.map((row) => [row.id, row.sourceDocumentRefId, row.sourcePath, row.sectionOrder, row.content]), [
    ['OWA_CHUNK_FIXTURE_1', 'OWA_ENTITY_ENCJA_FIXTURE', `${JULY}/fixture.md`, '1', MAPPING],
    ['OWA_CHUNK_FIXTURE_2', 'OWA_ENTITY_ENCJA_FIXTURE', `${JULY}/fixture.md`, '2', LONG],
    ['OWA_CHUNK_FIXTURE_3', 'OWA_ENTITY_ENCJA_FIXTURE', `${JULY}/fixture.md`, '3', 'Final approved paragraph.'],
    ['OWA_CHUNK_KOREKTA_ZBIORCZA_FA_1', entity.id, `${OCTOBER}/approved_a.md`, '1', SYNTHESIS],
  ]);
  const manifest = JSON.parse(fs.readFileSync(path.join(f.exportDir, '_manifest.json'), 'utf8'));
  assert.ok(Number.isFinite(Date.parse(manifest.generatedAt)));
  assert.equal(manifest.namespace, NS);
  assert.equal(manifest.sourceType, 'promoted_knowledge_snapshots');
  assert.deepEqual(manifest.sourceRoots, [JULY, OCTOBER]);
  assert.equal(manifest.selectedDraftCount, 2);
  assert.deepEqual(manifest.files, Object.entries(COLUMNS).map(([fileName, columns]) => ({ fileName, columns, rowCount: counts[fileName] })));
  assert.equal(manifest.files.length, 5);
  assert.ok(manifest.files.every((file) => file.fileName !== 'relation_audit.json'));
  const auditBytes = fs.readFileSync(path.join(f.exportDir, 'relation_audit.json'));
  const audit = JSON.parse(auditBytes);
  assert.deepEqual(auditBytes, Buffer.from(`${JSON.stringify(audit, null, 2)}\n`));
  const policyHash = hash(fs.readFileSync(path.join(f.codeRoot, 'scripts/lib/owa_relation_id_policy.json')));
  assert.deepEqual(manifest.relationAudit, { schemaVersion: 1, fileName: 'relation_audit.json', rowCount: 1, sha256: hash(auditBytes), policySha256: policyHash });
  assert.deepEqual(audit.policy, { schemaVersion: 1, sha256: policyHash, observedAt: '2026-10-28T00:00:00Z' });
  assert.equal(audit.schemaVersion, 1);
  assert.equal(audit.namespace, NS);
  assert.equal(audit.rows.length, 1);
  assert.deepEqual(audit.rows[0], {
    id: 'OWA_REL_FIXTURE_BELONGS_TARGET', sourceEntityRefId: 'OWA_ENTITY_ENCJA_FIXTURE', predicate: 'belongs',
    rawSourceLabel: 'x', rawTargetLabel: 'Target', legacyTargetRefId: 'OWA_ENTITY_TARGET',
    targetResolution: { status: 'unresolved', resolvedRefId: '', reason: 'not_approved' },
    idAssignment: { kind: 'preserved' }, draftId: 'fixture', equivalentDraftIds: ['fixture'],
    source: { promotedJsonPath: `${PROMOTED}/fixture.json`, promotedMarkdownPath: `${PROMOTED}/fixture.md`,
      rawJsonPath: `${JULY}/fixture.json`, rawMarkdownPath: `${JULY}/fixture.md`, contentSha256: hash(MAPPING_CONTENT),
      lineBasis: 'snapshot.content', tableIndex: 1, headerLine: 21, rowLine: 23,
      rawHeaders: [' Predykat ', ' Encja źródłowa ', ' Encja docelowa ', ' Kardynalność ', ' Typ relacji ', ' Warunek JOIN ', ' Status '],
      rawCells: [' belongs ', ' x ', ' Target ', ' N:1 ', ' synthetic ', ' a.id=b.id ', ' verified '], evidence: '' },
  });
  assert.equal(payload.relationAuditRowCount, 1);
  assert.equal(payload.unresolvedRelationCount, 1);
  const firstAudit = Buffer.from(auditBytes);
  assert.equal(f.run().status, 0);
  assert.deepEqual(fs.readFileSync(path.join(f.exportDir, 'relation_audit.json')), firstAudit, 'Sidecar bytes must be reproducible');
  assert.deepEqual(payload.files, Object.entries(counts).map(([fileName, rowCount]) => ({ fileName, rowCount })));
  assert.deepEqual(manifest.selectedDrafts, [
    { draftId: 'fixture', equivalentDraftIds: ['fixture'], entityId: 'OWA_ENTITY_ENCJA_FIXTURE',
      promotedJsonPath: `${PROMOTED}/fixture.json`, promotedMarkdownPath: `${PROMOTED}/fixture.md`,
      rawJsonPath: `${JULY}/fixture.json`, rawMarkdownPath: `${JULY}/fixture.md`, contentSha256: hash(MAPPING_CONTENT) },
    { draftId: 'approved_a', equivalentDraftIds: ['approved_a', 'approved_z'], entityId: entity.id,
      promotedJsonPath: `${PROMOTED}/approved_a.json`, promotedMarkdownPath: `${PROMOTED}/approved_a.md`,
      rawJsonPath: `${OCTOBER}/approved_a.json`, rawMarkdownPath: `${OCTOBER}/approved_a.md`, contentSha256: hash(SYNTHESIS) },
  ]);
});

test('missing raw/promoted Markdown does not replace approved snapshot content', () => {
  const f = fixture('no-markdown');
  fs.unlinkSync(path.join(f.root, OCTOBER, 'approved_a.md'));
  fs.unlinkSync(path.join(f.root, PROMOTED, 'approved_a.md'));
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readCsv(path.join(f.exportDir, 'chunk.csv')).rows.map((row) => row.content), [SYNTHESIS]);
  const audit = JSON.parse(fs.readFileSync(path.join(f.exportDir, 'relation_audit.json')));
  assert.deepEqual(audit.rows, [], 'Business synthesis without relations must not invent a relation');
});

// Literal versions of all six observed header layouts; expected columns do not
// use the parser as their oracle. Snapshot text is retained exactly, including CRLF.
for (const [name, headers, cells, relationType, joinCondition, status, evidence] of [
  ['short-five', '| Predykat | Źródło | Cel | Kardynalność | Warunek JOIN |', '| P | Child | Target | N:1 | J |', '', 'J', '', ''],
  ['entity-five', '| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Warunek JOIN |', '| P | Child | Target | N:1 | J |', '', 'J', '', ''],
  ['type-status', '| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Status |', '| P | Child | Target | N:1 | T | S |', 'T', '', 'S', ''],
  ['type-status-evidence', '| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Status | Dowód |', '| P | Child | Target | N:1 | T | S | E |', 'T', '', 'S', 'E'],
  ['type-join-status', '| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Warunek JOIN | Status |', '| P | Child | Target | N:1 | T | J | S |', 'T', 'J', 'S', ''],
  ['all-eight', '| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Warunek JOIN | Status | Dowód |', '| P | Child | Target | N:1 | T | J | S | E |', 'T', 'J', 'S', 'E'],
]) {
  test(`CLI maps ${name} from original snapshot and keeps child label separate from owner`, () => {
    const f = fixture(`layout-${name}`);
    const separator = `|${headers.slice(1, -1).split('|').map(() => '---').join('|')}|`;
    const content = `# Encja: Fixture\r\n\r\n## Relacje ontologiczne\r\n${headers}\r\n${separator}\r\n${cells}\r\n`;
    f.add('layout', 'Encja: Fixture', content);
    f.saveRegistry();
    assert.equal(f.run().status, 0);
    const [row] = readCsv(path.join(f.exportDir, 'ontology_relation.csv')).rows;
    assert.deepEqual(row, {
      id: 'OWA_REL_LAYOUT_P_TARGET', name: 'P', description: joinCondition, semanticType: 'ontology_relation',
      sourceEntityRefId: 'OWA_ENTITY_ENCJA_FIXTURE', targetEntityRefId: '', predicate: 'P', cardinality: 'N:1',
      relationType, joinCondition, status, summary: joinCondition ? 'P J' : 'P',
    });
    const audit = JSON.parse(fs.readFileSync(path.join(f.exportDir, 'relation_audit.json')));
    assert.equal(audit.rows.length, 1);
    const [entry] = audit.rows;
    assert.equal(entry.sourceEntityRefId, 'OWA_ENTITY_ENCJA_FIXTURE');
    assert.equal(entry.rawSourceLabel, 'Child');
    assert.equal(entry.rawTargetLabel, 'Target');
    assert.equal(entry.legacyTargetRefId, 'OWA_ENTITY_TARGET');
    assert.equal(entry.source.contentSha256, hash(content));
    assert.equal(entry.source.headerLine, 4);
    assert.equal(entry.source.rowLine, 6);
    assert.equal(entry.source.evidence, evidence);
    assert.equal(entry.source.lineBasis, 'snapshot.content');
    assert.deepEqual(entry.source.rawHeaders, headers.slice(1, -1).split('|'));
    assert.deepEqual(entry.source.rawCells, cells.slice(1, -1).split('|'));
    assert.deepEqual(entry.targetResolution, { status: 'unresolved', resolvedRefId: '', reason: 'not_approved' });
    assert.equal(JSON.parse(fs.readFileSync(path.join(f.root, PROMOTED, 'layout.json'))).content, content);
  });
}

test('CLI records new IDs without generating a target FK', () => {
  const f = fixture('new-id');
  f.add('new', 'Encja: Fixture', MAPPING_CONTENT.replace('| belongs |', '| new |'));
  f.saveRegistry();
  assert.equal(f.run().status, 0);
  const [row] = readCsv(path.join(f.exportDir, 'ontology_relation.csv')).rows;
  assert.equal(row.id, 'OWA_REL_NEW');
  assert.equal(row.targetEntityRefId, '');
  const audit = JSON.parse(fs.readFileSync(path.join(f.exportDir, 'relation_audit.json')));
  assert.deepEqual(audit.rows[0].idAssignment, { kind: 'new' });
});

test('CLI records an empty relation section without consuming a following nonrelation table', () => {
  const f = fixture('empty-relation-section');
  f.add('empty', 'Encja: Fixture', '# Fixture\n## Relacje ontologiczne\nNo approved technical relations.\n## Other\n| Unknown |\n|---|\n| Value |');
  f.saveRegistry();
  assert.equal(f.run().status, 0);
  assert.deepEqual(readCsv(path.join(f.exportDir, 'ontology_relation.csv')).rows, []);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.exportDir, 'relation_audit.json'))).rows, []);
});

for (const existing of [true, false]) {
  for (const [name, malformed, gap] of [
    ['both-frames', 'Q | Child | Other | 1:N | K', ''],
    ['leading-after-blank', 'Q | Child | Other | 1:N | K |', '\n'],
    ['both-after-blank', 'Q | Child | Other | 1:N | K', '\n'],
  ]) {
    for (const trailing of [false, true]) {
      test(`I-1 CLI refuses ${trailing ? 'trailing' : 'sole'} ${name} before touching ${existing ? 'nine sentinels' : 'absent output'}`, () => {
        const f = fixture(`I-1-${name}-${trailing}-${existing}`);
        if (existing) seed(f);
        const content = '# Encja: Fixture\n\n## Relacje ontologiczne\n'
          + '| Predykat | Źródło | Cel | Kardynalność | Warunek JOIN |\n|---|---|---|---|---|\n'
          + (trailing ? '| P | Child | Target | N:1 | J |\n' : '') + gap + malformed;
        f.add('malformed', 'Encja: Fixture', content.replaceAll('\n', '\r\n'));
        f.saveRegistry();
        const payload = refused(f, 'invalid_table_row');
        assert.equal(payload.issues.length, 1);
        assert.equal(payload.issues[0].line, 6 + Number(trailing) + Number(Boolean(gap)));
        assert.equal(JSON.parse(fs.readFileSync(path.join(f.root, PROMOTED, 'malformed.json'))).content,
          content.replaceAll('\n', '\r\n'), 'Refusal must not repair the source');
      });
    }
  }
}

for (const existing of [true, false]) {
  for (const [name, kind, mutate] of [
    ['unknown-key', 'owa_relation_key_missing', (f) => {
      f.add('unknown', 'Encja: Fixture', MAPPING_CONTENT.replace('| belongs |', '| unknown |'));
    }],
    ['retired-key', 'owa_relation_retired', (f) => {
      f.add('retired', 'Encja: Fixture', MAPPING_CONTENT.replace('| belongs |', '| retired |'));
    }],
    ['bad-table', 'unknown_header', (f) => {
      f.add('bad-table', 'Encja: Fixture', MAPPING_CONTENT.replace('Warunek JOIN', 'JOIN'));
    }],
    ['missing-policy', 'owa_relation_policy_read_failed', (f) => {
      fs.renameSync(path.join(f.codeRoot, 'scripts/lib/owa_relation_id_policy.json'), path.join(f.codeRoot, 'scripts/lib/retained-policy.json'));
    }],
    ['malformed-policy', 'owa_relation_policy_json_invalid', (f) => {
      write(f.codeRoot, 'scripts/lib/owa_relation_id_policy.json', '{broken JSON');
    }],
    ['policy-id-collision', 'invalid_owa_relation_policy', (f) => {
      const policy = fixtureOwaRelationPolicy();
      policy.entries[1].id = 'OWA_REL_FIXTURE_BELONGS_TARGET';
      write(f.codeRoot, 'scripts/lib/owa_relation_id_policy.json', policy);
    }],
  ]) {
    test(`relation ${name} refuses before touching ${existing ? 'nine sentinels' : 'absent output'}`, () => {
      const f = fixture(`relation-${name}-${existing}`);
      if (existing) seed(f);
      mutate(f);
      f.saveRegistry();
      refused(f, kind);
    });
  }
}

for (const [name, variant] of [
  ['CRLF', MAPPING_CONTENT.replaceAll('\n', '\r\n')],
  ['spaces-tabs', MAPPING_CONTENT.replaceAll(' ', ' \t  ')],
  ['CRLF-spaces-tabs', MAPPING_CONTENT.replaceAll(' ', ' \t  ').replaceAll('\n', '\r\n')],
  ['indented-spaces-tabs', MAPPING_CONTENT.replace(/^## /gm, ' \t ## \t ')],
]) {
  test(`equivalent ${name} snapshot lexical winner preserves complete LF structured output and original hash`, () => {
    const baseline = fixture(`equivalent-${name}-baseline`);
    const changed = fixture(`equivalent-${name}-changed`);
    for (const [f, winnerContent] of [[baseline, MAPPING_CONTENT], [changed, variant]]) {
      f.add('mapping_z', 'Encja: Fixture', MAPPING_CONTENT);
      f.add('mapping_a', 'Encja: Fixture', winnerContent);
      f.saveRegistry();
      const result = f.run();
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stderr, '');
      assert.equal(JSON.parse(result.stdout).selectedDraftCount, 2);
    }
    const expectedCounts = { 'ontology_entity.csv': 2, 'ontology_field.csv': 1, 'ontology_relation.csv': 1, 'workflow_pattern.csv': 1, 'chunk.csv': 4 };
    const csvs = {};
    for (const file of Object.keys(COLUMNS)) {
      const lf = readCsv(path.join(baseline.exportDir, file));
      csvs[file] = readCsv(path.join(changed.exportDir, file));
      assert.equal(lf.rows.length, expectedCounts[file]);
      assert.deepEqual(csvs[file], lf, `${file}: equivalent whitespace must not erase/change structured rows`);
    }
    const entity = csvs['ontology_entity.csv'].rows.find((row) => row.canonicalName === 'Fixture');
    assert.equal(entity.description, 'Fixture\'s "quoted", Magazyn description.');
    assert.equal(entity.mainTable, 'CDN.Fixture');
    assert.equal(entity.mcpWriteTools, 'fixture_write');
    assert.equal(csvs['ontology_field.csv'].rows[0].fieldName, 'FixtureId');
    assert.equal(csvs['ontology_relation.csv'].rows[0].joinCondition, 'a.id=b.id');
    assert.equal(csvs['workflow_pattern.csv'].rows[0].mcpTool, 'fixture_write');
    assert.deepEqual(csvs['chunk.csv'].rows.filter((row) => row.sourceDocumentRefId === entity.id)
      .map((row) => [row.id, row.sectionOrder, row.sourcePath, row.content]), [
      ['OWA_CHUNK_FIXTURE_1', '1', `${OCTOBER}/mapping_a.md`, MAPPING],
      ['OWA_CHUNK_FIXTURE_2', '2', `${OCTOBER}/mapping_a.md`, LONG],
      ['OWA_CHUNK_FIXTURE_3', '3', `${OCTOBER}/mapping_a.md`, 'Final approved paragraph.'],
    ]);
    const manifest = JSON.parse(fs.readFileSync(path.join(changed.exportDir, '_manifest.json'), 'utf8'));
    const selected = manifest.selectedDrafts.find((draft) => draft.entityId === entity.id);
    assert.equal(selected.draftId, 'mapping_a');
    assert.deepEqual(selected.equivalentDraftIds, ['mapping_a', 'mapping_z']);
    assert.equal(selected.contentSha256, hash(variant), 'Hash must describe the original snapshot, not parser-normalized content');
    assert.notEqual(selected.contentSha256, hash(MAPPING_CONTENT));
    const [audited] = JSON.parse(fs.readFileSync(path.join(changed.exportDir, 'relation_audit.json'))).rows;
    assert.equal(audited.draftId, 'mapping_a');
    assert.deepEqual(audited.equivalentDraftIds, ['mapping_a', 'mapping_z']);
    assert.equal(audited.source.contentSha256, hash(variant));
    assert.equal(audited.source.headerLine, 21);
    assert.equal(audited.source.rowLine, 23);
    assert.deepEqual(audited.source.rawHeaders, variant.split(/\r\n|\n/)[20].trim().slice(1, -1).split('|'));
    assert.deepEqual(audited.source.rawCells, variant.split(/\r\n|\n/)[22].trim().slice(1, -1).split('|'));
    assert.equal(JSON.parse(fs.readFileSync(path.join(changed.root, PROMOTED, 'mapping_a.json'), 'utf8')).content, variant);
  });
}

for (const existing of [true, false]) {
  test(`generated ID collisions cross-entity refuse all colliding child rowsets with ${existing ? 'nine existing sentinels' : 'absent output'}`, () => {
    const f = fixture(`cross-entity-${existing ? 'seeded' : 'absent'}`);
    if (existing) seed(f);
    // Field/workflow/chunk IDs still collide under canonical child naming.
    // Relation IDs instead belong to distinct owner-qualified policy entries.
    f.add('prefixed', 'Encja: Fixture', MAPPING_CONTENT);
    f.add('unprefixed', 'Fixture', MAPPING_CONTENT);
    f.saveRegistry();
    const payload = refused(f, 'duplicate_ids');
    assert.deepEqual(payload.issues.map(({ kind, fileName, duplicateIds }) => ({ kind, fileName, duplicateIds })), [
      { kind: 'duplicate_ids', fileName: 'ontology_field.csv', duplicateIds: ['OWA_FIELD_FIXTURE_FIXTUREID'] },
      { kind: 'duplicate_ids', fileName: 'workflow_pattern.csv', duplicateIds: ['OWA_WF_FIXTURE_FIXTURE_WRITE_0'] },
      { kind: 'duplicate_ids', fileName: 'chunk.csv', duplicateIds: ['OWA_CHUNK_FIXTURE_1', 'OWA_CHUNK_FIXTURE_2', 'OWA_CHUNK_FIXTURE_3'] },
    ]);
    for (const issue of payload.issues) {
      assert.ok(issue.reason.includes(issue.fileName));
      for (const id of issue.duplicateIds) assert.ok(issue.reason.includes(id));
    }
  });

  test(`later unknown relation refuses the whole corpus with ${existing ? 'nine sentinels' : 'absent output'}`, () => {
    const f = fixture(`late-unknown-${existing}`);
    if (existing) seed(f);
    f.add('valid', 'Encja: Fixture', MAPPING_CONTENT);
    f.add('later-unknown', 'Encja: ZZZ', MAPPING_CONTENT);
    f.saveRegistry();
    refused(f, 'owa_relation_key_missing');
  });

  for (const identical of [true, false]) {
    test(`generated ID collisions within one entity refuse ${identical ? 'identical' : 'different'} duplicate rows with ${existing ? 'nine existing sentinels' : 'absent output'}`, () => {
      const f = fixture(`intra-entity-${identical ? 'identical' : 'different'}-${existing ? 'seeded' : 'absent'}`);
      if (existing) seed(f);
      const fieldRow = '| 1 | id | x | FixtureId | int | NO | PK | Field description | verified |';
      const relationRow = '| belongs | x | Target | N:1 | synthetic | a.id=b.id | verified |';
      const content = MAPPING_CONTENT
        .replace(fieldRow, `${fieldRow}\n${identical ? fieldRow : fieldRow.replace('Field description', 'Different field description')}`)
        .replace(relationRow, `${relationRow}\n${identical ? relationRow : relationRow.replace('a.id=b.id', 'different.id=b.id')}`);
      f.add('duplicates', 'Encja: Fixture', content);
      f.saveRegistry();
      const payload = refused(f, 'duplicate_ids');
      assert.deepEqual(payload.issues.map(({ fileName, duplicateIds }) => ({ fileName, duplicateIds })), [
        { fileName: 'ontology_field.csv', duplicateIds: ['OWA_FIELD_FIXTURE_FIXTUREID'] },
        { fileName: 'ontology_relation.csv', duplicateIds: ['OWA_REL_FIXTURE_BELONGS_TARGET'] },
      ]);
    });
  }
}

test('large refusal diagnostics remain complete JSON for a slow stderr consumer', async () => {
  const f = fixture('large-refusal');
  for (let i = 0; i < 1600; i += 1) f.add(`invalid_${i}`, `Encja: Invalid ${i}`, '');
  f.saveRegistry();
  const child = spawn(process.execPath, [f.cliPath], {
    cwd: f.root, env: { ROOT: f.root, LANG: 'C.UTF-8' }, timeout: 10000,
  });
  let stdout = '', stderr = '';
  child.stdout.on('data', (data) => { stdout += data; });
  child.stderr.on('data', (data) => { stderr += data; });
  child.stderr.pause();
  // Model a real piped consumer with backpressure, not an infinitely fast reader.
  const resume = setTimeout(() => child.stderr.resume(), 2000);
  child.on('exit', () => child.stderr.resume());
  const status = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  }).finally(() => clearTimeout(resume));
  write(f.root, 'cli.stdout', stdout);
  write(f.root, 'cli.stderr', stderr);
  write(f.root, 'cli.exit.json', { status });
  assert.equal(status, 2);
  assert.equal(stdout, '');
  assert.equal(fs.existsSync(f.exportDir), false);
  const payload = JSON.parse(stderr);
  assert.equal(payload.issues.length, 1600);
  assert.deepEqual(payload.issues.flatMap((issue) => issue.draftIds).sort(),
    Array.from({ length: 1600 }, (_, i) => `invalid_${i}`).sort());
});

const failures = [
  ['conflict', 'ambiguous_versions', (f) => { f.add('approved_b', 'Encja: Korekta zbiorcza FA', `${SYNTHESIS}\n\nDifferent approved revision.`); f.saveRegistry(); }],
  ['registry-drift', 'invalid_registry', (f) => { f.entries[0].status = 'withdrawn'; f.saveRegistry(); }],
  ['no-approved-input', 'empty_approved_corpus', (f) => { fs.unlinkSync(path.join(f.root, PROMOTED, 'approved_a.json')); f.entries.length = 0; f.saveRegistry(); }],
  ['invalid-provenance', 'invalid_provenance', (f) => { f.entries[0].rawJsonPath = '../outside.json'; f.saveRegistry(); }],
  ['empty-snapshot-no-fallback', 'invalid_draft', (f) => {
    const file = path.join(f.root, PROMOTED, 'approved_a.json');
    write(f.root, path.relative(f.root, file), { ...JSON.parse(fs.readFileSync(file, 'utf8')), content: '' });
  }],
  ...[['snapshot-json', `${PROMOTED}/approved_a.json`], ['raw-json', `${OCTOBER}/approved_a.json`], ['registry-json', REGISTRY]]
    .map(([name, file]) => [name, 'input_error', (f) => write(f.root, file, '{malformed JSON')]),
  ['registry-shape', 'input_error', (f) => write(f.root, REGISTRY, { entries: null })],
  ['parser-error', 'input_error', (f) => {
    f.add('broken', 'Encja: Broken', '## Źródła danych\n| Rola |\n|---|\n| Tabela główna |');
    f.saveRegistry();
  }],
];

for (const [name, kind, induce] of failures) {
  for (const existing of [true, false]) {
    test(`${name}: structured exit 2 preserves ${existing ? 'all baseline CSVs, README and both manifests' : 'absent output directory'}`, () => {
      const f = fixture(`${name}-${existing ? 'seeded' : 'absent'}`);
      if (existing) seed(f);
      induce(f);
      refused(f, kind);
    });
  }
}
