import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { parseOwaRelationSection } from './lib/owa_relation_parser.mjs';

// Each literal fixture catches positional shifting of JOIN, status or evidence.
const layouts = [
  {
    name: 'short source/target, five columns',
    headers: '| Predykat | Źródło | Cel | Kardynalność | Warunek JOIN |',
    cells: '| P | Source | Target | N:1 | J |',
    optional: { relationType: '', joinCondition: 'J', status: '', evidence: '' },
  },
  {
    name: 'entity source/target, five columns',
    headers: '| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Warunek JOIN |',
    cells: '| P | Source | Target | N:1 | J |',
    optional: { relationType: '', joinCondition: 'J', status: '', evidence: '' },
  },
  {
    name: 'type and status without JOIN or evidence',
    headers: '| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Status |',
    cells: '| P | Source | Target | N:1 | T | S |',
    optional: { relationType: 'T', joinCondition: '', status: 'S', evidence: '' },
  },
  {
    name: 'type, status and evidence without JOIN',
    headers: '| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Status | Dowód |',
    cells: '| P | Source | Target | N:1 | T | S | E |',
    optional: { relationType: 'T', joinCondition: '', status: 'S', evidence: 'E' },
  },
  {
    name: 'type, JOIN and status without evidence',
    headers: '| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Warunek JOIN | Status |',
    cells: '| P | Source | Target | N:1 | T | J | S |',
    optional: { relationType: 'T', joinCondition: 'J', status: 'S', evidence: '' },
  },
  {
    name: 'all eight columns',
    headers: '| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Warunek JOIN | Status | Dowód |',
    cells: '| P | Source | Target | N:1 | T | J | S | E |',
    optional: { relationType: 'T', joinCondition: 'J', status: 'S', evidence: 'E' },
  },
];

function table(headers, cells) {
  const separator = `|${headers.slice(1, -1).split('|').map(() => '---').join('|')}|`;
  return `${headers}\n${separator}\n${cells}`;
}

function section(headers = layouts[0].headers, cells = layouts[0].cells) {
  return `## Relacje ontologiczne\n${table(headers, cells)}`;
}

function rejectsAt(content, kind, line) {
  assert.throws(() => parseOwaRelationSection(content), (error) => {
    assert.ok(error instanceof Error);
    assert.equal(error.kind, kind);
    assert.equal(error.line, line);
    assert.equal(typeof error.reason, 'string');
    assert.ok(error.reason.length > 0);
    assert.ok(error.message.includes(error.reason));
    return true;
  });
}

for (const layout of layouts) {
  test(`maps ${layout.name} by header without shifting cells`, () => {
    const rows = parseOwaRelationSection(section(layout.headers, layout.cells));
    assert.equal(rows.length, 1);
    const [row] = rows;
    assert.equal(row.predicate, 'P');
    assert.equal(row.sourceLabel, 'Source');
    assert.equal(row.targetLabel, 'Target');
    assert.equal(row.cardinality, 'N:1');
    assert.equal(row.relationType, layout.optional.relationType);
    assert.equal(row.joinCondition, layout.optional.joinCondition);
    assert.equal(row.status, layout.optional.status);
    assert.equal(row.evidence, layout.optional.evidence);
  });
}

test('keeps CRLF content/hash and physical header line 4 / row line 6', () => {
  const content = '# Synthetic snapshot\r\n\r\n## Relacje ontologiczne\r\n'
    + '|  Predykat\t | Źródło | Cel | Kardynalność | Warunek JOIN |\r\n'
    + '|---|---|---|---|---|\r\n'
    + '| `P` | **Source** | Target  label | N:1 | `A.x = B.y` |\r\n';
  const before = Buffer.from(content);
  const hash = createHash('sha256').update(before).digest('hex');
  const [row] = parseOwaRelationSection(content);
  assert.deepEqual(Buffer.from(content), before);
  assert.equal(createHash('sha256').update(content).digest('hex'), hash);
  assert.deepEqual(row, {
    predicate: '`P`', sourceLabel: '**Source**', targetLabel: 'Target  label',
    cardinality: 'N:1', relationType: '', joinCondition: '`A.x = B.y`', status: '', evidence: '',
    source: {
      lineBasis: 'snapshot.content', tableIndex: 1, headerLine: 4, rowLine: 6,
      rawHeaders: ['  Predykat\t ', ' Źródło ', ' Cel ', ' Kardynalność ', ' Warunek JOIN '],
      rawCells: [' `P` ', ' **Source** ', ' Target  label ', ' N:1 ', ' `A.x = B.y` '],
    },
  });
});

test('normalizes header case, diacritics and spacing, not source cell spelling', () => {
  const headers = '| PREDYKAT |  eNcJa\t zRoDlOwA | ENCJA DOCELOWA | KARDYNALNOSC | TYP  RELACJI | WARUNEK\tJOIN | STATUS | DOWÓD |';
  const [row] = parseOwaRelationSection(section(headers, layouts[5].cells));
  assert.equal(row.sourceLabel, 'Source');
  assert.equal(row.targetLabel, 'Target');
  assert.equal(row.relationType, 'T');
  assert.equal(row.joinCondition, 'J');
  assert.equal(row.status, 'S');
  assert.equal(row.evidence, 'E');
});

test('uses semantic headers even when their positions differ', () => {
  const [row] = parseOwaRelationSection(section(
    '| Warunek JOIN | Cel | Kardynalność | Predykat | Źródło |',
    '| J | Target | N:1 | P | Source |',
  ));
  assert.equal(row.predicate, 'P');
  assert.equal(row.sourceLabel, 'Source');
  assert.equal(row.targetLabel, 'Target');
  assert.equal(row.cardinality, 'N:1');
  assert.equal(row.joinCondition, 'J');
});

test('retains every row and its original physical line', () => {
  const rows = parseOwaRelationSection(section() + '\n| Q | Source | Other | 1:N | K |');
  assert.deepEqual(rows.map((row) => [row.predicate, row.targetLabel, row.joinCondition, row.source.rowLine]),
    [['P', 'Target', 'J', 4], ['Q', 'Other', 'K', 5]]);
});

test('allows empty optional cells without falling back to neighboring columns', () => {
  const [row] = parseOwaRelationSection(section(layouts[5].headers, '| P | Source | Target | N:1 | | | | |'));
  assert.equal(row.relationType, '');
  assert.equal(row.joinCondition, '');
  assert.equal(row.status, '');
  assert.equal(row.evidence, '');
});

test('ignores tables outside the relation section and returns [] when absent', () => {
  assert.deepEqual(parseOwaRelationSection('# Synthetic\n## Other\n| X |\n|---|\n| Y |'), []);
});

test('returns [] for a relation section without a table, stopping at the next section', () => {
  assert.deepEqual(parseOwaRelationSection('## Relacje ontologiczne\nNone.\n\n## Other\n| X |\n|---|\n| Y |'), []);
});

test('returns [] for an empty relation table', () => {
  assert.deepEqual(parseOwaRelationSection(section().split('\n').slice(0, 3).join('\n')), []);
});

test('does not consume a table in the following section', () => {
  const rows = parseOwaRelationSection(section() + '\n## Other\n| X |\n|---|\n| Y |');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].targetLabel, 'Target');
});

for (const alias of ['B', 'Typ', 'JOIN', 'Krotność', 'Unexpected']) {
  test(`rejects unobserved header ${alias} rather than guessing an alias`, () => {
    rejectsAt(section(layouts[0].headers.replace('Warunek JOIN', alias)), 'unknown_header', 2);
  });
}

for (const [name, headers] of [
  ['identical header', '| Predykat | Źródło | Cel | Kardynalność | Warunek JOIN | Warunek JOIN |'],
  ['source synonyms', '| Predykat | Źródło | Cel | Kardynalność | Encja źródłowa |'],
  ['target synonyms', '| Predykat | Źródło | Cel | Kardynalność | Encja docelowa |'],
  ['normalized duplicate', '| Predykat | Źródło | Cel | Kardynalność | KARDYNALNOSC |'],
]) {
  test(`rejects duplicate semantic columns: ${name}`, () => {
    rejectsAt(section(headers), 'duplicate_header', 2);
  });
}

test('rejects a missing required column', () => {
  rejectsAt(section('| Predykat | Źródło | Kardynalność | Warunek JOIN |', '| P | Source | N:1 | J |'),
    'missing_required_header', 2);
});

for (const [name, cells] of [
  ['predicate', '| | Source | Target | N:1 | J |'],
  ['source', '| P | \t | Target | N:1 | J |'],
  ['target', '| P | Source | | N:1 | J |'],
  ['cardinality', '| P | Source | Target | | J |'],
]) {
  test(`rejects an empty required ${name} cell`, () => {
    rejectsAt(section(layouts[0].headers, cells), 'missing_required_value', 4);
  });
}

for (const [name, cells] of [
  ['too few', '| P | Source | Target | N:1 |'],
  ['too many', '| P | Source | Target | N:1 | J | extra |'],
]) {
  test(`rejects ${name} cells instead of truncating or filling`, () => {
    rejectsAt(section(layouts[0].headers, cells), 'row_width_mismatch', 4);
  });
}

test('rejects a second table at its header line', () => {
  rejectsAt(section() + '\n\n' + table(layouts[5].headers, layouts[5].cells), 'multiple_tables', 6);
});

test('rejects a second table without an intervening blank line', () => {
  rejectsAt(section() + '\n' + table(layouts[0].headers, layouts[0].cells), 'multiple_tables', 5);
});

test('rejects escaped pipes in a row with original CRLF line location', () => {
  rejectsAt(('# Synthetic\n\n' + section(layouts[0].headers, '| P | Source | Target | N:1 | A\\|B |'))
    .replaceAll('\n', '\r\n'), 'unsupported_pipe_escape', 6);
});

test('rejects escaped pipes in a header without silently splitting it', () => {
  rejectsAt(section(layouts[0].headers.replace('Warunek JOIN', 'Warunek\\|JOIN')),
    'unsupported_pipe_escape', 2);
});

test('rejects a malformed separator at its physical line', () => {
  rejectsAt(section().replace('|---|---|---|---|---|', '|---|---|broken|---|---|'),
    'invalid_table_separator', 3);
});

test('rejects separator width different from the header width', () => {
  rejectsAt(section().replace('|---|---|---|---|---|', '|---|---|---|---|'),
    'invalid_table_separator', 3);
});

for (const [name, cells] of [
  ['leading', 'Q | Source | Other | 1:N | K |'],
  ['trailing', '| Q | Source | Other | 1:N | K'],
]) {
  test(`rejects a sole relation row missing its ${name} pipe`, () => {
    rejectsAt(section(layouts[0].headers, cells), 'invalid_table_row', 4);
  });

  test(`rejects a trailing relation row missing its ${name} pipe instead of returning partial rows`, () => {
    rejectsAt(section() + '\n' + cells, 'invalid_table_row', 5);
  });
}

test('preserves legitimate prose around a relation table, including inline pipe notation', () => {
  const content = '## Relacje ontologiczne\nProse with `A | B` notation.\n'
    + table(layouts[0].headers, layouts[0].cells)
    + '\nMore prose with `C | D` notation.\n';
  const rows = parseOwaRelationSection(content);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].predicate, 'P');
  assert.equal(rows[0].source.rowLine, 5);
});

test('does not validate malformed table-like text after section termination', () => {
  const rows = parseOwaRelationSection(section()
    + '\n## Other | section\nQ | Source | Other | 1:N | K |');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].predicate, 'P');
});

for (const [name, cells, gap] of [
  ['both frames', 'Q | Source | Other | 1:N | K', ''],
  ['leading frame after blank', 'Q | Source | Other | 1:N | K |', '\n'],
  ['both frames after blank', 'Q | Source | Other | 1:N | K', '\n'],
]) {
  test(`I-1 rejects sole row missing ${name} with physical CRLF line`, () => {
    rejectsAt(section(layouts[0].headers, gap + cells).replaceAll('\n', '\r\n'),
      'invalid_table_row', gap ? 5 : 4);
  });

  test(`I-1 rejects trailing row missing ${name} rather than returning a reduced rowset`, () => {
    rejectsAt(section() + '\n' + gap + cells, 'invalid_table_row', gap ? 6 : 5);
  });
}

for (const [name, headers] of [
  ['leading', 'Predykat | Źródło | Cel | Kardynalność | Warunek JOIN |'],
  ['both', 'Predykat | Źródło | Cel | Kardynalność | Warunek JOIN'],
]) {
  test(`I-1 rejects known header missing ${name} frames before prose skipping`, () => {
    rejectsAt(section(headers), 'invalid_table_row', 2);
  });
}

test('I-1 rejects unframed four-column and wrong-width table-shaped records', () => {
  rejectsAt(section('| Predykat | Źródło | Cel | Kardynalność |', 'Q | Source | Other | 1:N'),
    'invalid_table_row', 4);
  rejectsAt(section(layouts[0].headers, 'Q | Source | Other | 1:N'), 'invalid_table_row', 4);
});

test('I-1 retains inline-pipe prose after blanks and ignores unframed rows outside the section', () => {
  const rows = parseOwaRelationSection(section()
    + '\n\nInline `A | B` and `C | D` notation.\nSource | Target notation.\n'
    + '## Other\nQ | Source | Other | 1:N | K\n\nQ | Source | Other | 1:N | K |');
  assert.deepEqual(rows.map((row) => [row.predicate, row.source.rowLine]), [['P', 4]]);
});
