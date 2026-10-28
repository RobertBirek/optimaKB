// Only the column names present in the six observed OWA relation layouts.
const HEADER_FIELDS = new Map([
  ['predykat', 'predicate'],
  ['zrodlo', 'sourceLabel'],
  ['encja zrodlowa', 'sourceLabel'],
  ['cel', 'targetLabel'],
  ['encja docelowa', 'targetLabel'],
  ['kardynalnosc', 'cardinality'],
  ['typ relacji', 'relationType'],
  ['warunek join', 'joinCondition'],
  ['status', 'status'],
  ['dowod', 'evidence'],
]);
const REQUIRED_FIELDS = ['predicate', 'sourceLabel', 'targetLabel', 'cardinality'];

function normalizeHeader(value) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/ł/g, 'l').replace(/\s+/g, ' ').trim();
}

function refuse(kind, reason, line) {
  const error = new Error(`OWA relation ${kind} at line ${line}: ${reason}`);
  Object.assign(error, { kind, reason, line });
  throw error;
}

function rawCells(text, line) {
  if (text.includes('\\|')) {
    refuse('unsupported_pipe_escape', 'Escaped pipes are not supported', line);
  }
  const framed = text.trim();
  if (!framed.startsWith('|') || !framed.endsWith('|')) {
    refuse('invalid_table_row', 'Expected leading and trailing table pipes', line);
  }
  // Remove only the outer frame. Cell whitespace and Markdown remain verbatim.
  return framed.slice(1, -1).split('|');
}

function isSeparator(text) {
  return /^\s*\|[\s:|\-]+\|\s*$/.test(text || '');
}

/**
 * Interpret relation tables directly from unmodified snapshot.content.
 * Semantic values are trimmed; source.rawHeaders/rawCells retain cell spelling.
 * No I/O or imports: callers decide how to handle the structured errors.
 */
export function parseOwaRelationSection(content) {
  const lines = content.split(/\r\n|\n|\r/);
  const rows = [];
  let sectionLevel = 0;
  let header = null;
  let inTable = false;

  for (let index = 0; index < lines.length; index += 1) {
    const text = lines[index];
    const line = index + 1;
    const heading = text.match(/^\s{0,3}(#{1,6})[ \t]+(.+?)\s*$/);
    if (heading) {
      const title = heading[2].replace(/[ \t]+#+$/, '');
      if (sectionLevel && heading[1].length <= sectionLevel) {
        sectionLevel = 0;
        inTable = false;
      }
      if (normalizeHeader(title) === 'relacje ontologiczne') {
        sectionLevel = heading[1].length;
        inTable = false;
      }
      continue;
    }
    if (!sectionLevel) continue;
    if (!text.trimStart().startsWith('|')) {
      // Classify before skipping prose, even after a blank ended the table.
      // Four columns are the smallest supported relation shape; an inline
      // A | B mention is not a record. These cells classify only, never repair.
      const candidateCells = text.trim().replace(/\|$/, '').split('|');
      const tableLike = candidateCells.length >= REQUIRED_FIELDS.length
        && (header !== null || candidateCells.some((cell) => HEADER_FIELDS.has(normalizeHeader(cell)))
          || isSeparator(lines[index + 1]) || candidateCells.every((cell) => /^:?-{3,}:?$/.test(cell.trim())));
      if (tableLike || (inTable && text.trimEnd().endsWith('|'))) rawCells(text, line);
      inTable = false;
      continue;
    }

    if (header && (!inTable || isSeparator(lines[index + 1]))) {
      refuse('multiple_tables', 'Only one relation table is supported', line);
    }

    const cells = rawCells(text, line);
    if (!header) {
      const fields = cells.map((cell) => HEADER_FIELDS.get(normalizeHeader(cell)));
      const seen = new Set();
      for (let column = 0; column < fields.length; column += 1) {
        const field = fields[column];
        if (!field) {
          refuse('unknown_header', `Unknown column: ${cells[column].trim()}`, line);
        }
        if (seen.has(field)) {
          refuse('duplicate_header', `Duplicate semantic column: ${field}`, line);
        }
        seen.add(field);
      }
      for (const field of REQUIRED_FIELDS) {
        if (!seen.has(field)) {
          refuse('missing_required_header', `Missing required column: ${field}`, line);
        }
      }
      const separatorLine = line + 1;
      const separator = rawCells(lines[index + 1] || '', separatorLine);
      if (separator.length !== cells.length || separator.some((cell) => !/^:?-{3,}:?$/.test(cell.trim()))) {
        refuse('invalid_table_separator', 'Separator must match the header width and Markdown syntax', separatorLine);
      }
      header = { fields, cells, line };
      inTable = true;
      index += 1;
      continue;
    }

    if (cells.length !== header.fields.length) {
      refuse('row_width_mismatch', `Expected ${header.fields.length} cells, received ${cells.length}`, line);
    }
    const row = {
      predicate: '', sourceLabel: '', targetLabel: '', cardinality: '',
      relationType: '', joinCondition: '', status: '', evidence: '',
    };
    for (let column = 0; column < cells.length; column += 1) {
      row[header.fields[column]] = cells[column].trim();
    }
    for (const field of REQUIRED_FIELDS) {
      if (!row[field]) {
        refuse('missing_required_value', `Missing required value: ${field}`, line);
      }
    }
    row.source = {
      lineBasis: 'snapshot.content', tableIndex: 1,
      headerLine: header.line, rowLine: line,
      rawHeaders: [...header.cells], rawCells: cells,
    };
    rows.push(row);
  }
  return rows;
}
