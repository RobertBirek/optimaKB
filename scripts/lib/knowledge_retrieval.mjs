// Znane skróty dokumentów zachowujemy również wtedy, gdy mają dwa znaki.
export const DOCUMENT_CODES = new Set(['pz', 'wz', 'fs', 'fz', 'pw', 'rw', 'mm', 'ro', 'zd', 'pa', 'pf']);
export const MAX_EVIDENCE = 5;
export const MAX_SNIPPET_LENGTH = 280;

export function containsTerm(text, term) {
  return findTermIndex(text, term) >= 0;
}

export function findTermIndex(text, term) {
  if (!DOCUMENT_CODES.has(term) && !/^(cdn|dbo)\.[a-z0-9_]+$/.test(term)) return text.indexOf(term);
  const match = new RegExp(`(^|[^a-z0-9_])${term.replaceAll('.', '\\.')}($|[^a-z0-9_])`).exec(text);
  return match ? match.index + match[1].length : -1;
}

// Wzorzec parsera z optima_reference_duplicates rozszerzony o pozycje źródłowe.
// Błędny CSV nie może dostarczyć pozornie poprawnego fragmentu dowodu.
export function parseCsvRecords(text) {
  const records = [];
  let cells = [];
  let fieldStart = 0;
  let fieldEnd = 0;
  let escapedQuotes = false;
  let quoted = false;
  let closedQuote = false;
  let line = 1;
  let startLine = 1;
  const raw = text.replace(/^\uFEFF/, '');
  const finishField = (index) => {
    const value = raw.slice(fieldStart, closedQuote ? fieldEnd : index);
    cells.push(escapedQuotes ? value.replaceAll('""', '"') : value);
    escapedQuotes = false;
    closedQuote = false;
  };
  const finishRecord = (index) => {
    finishField(index);
    if (cells.some(cell => cell.trim())) records.push({ cells, line: startLine, endLine: line });
    cells = [];
  };
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (quoted) {
      if (char === '"' && raw[index + 1] === '"') {
        escapedQuotes = true;
        index += 1;
      } else if (char === '"') {
        quoted = false;
        closedQuote = true;
        fieldEnd = index;
      } else {
        if (char === '\n' || (char === '\r' && raw[index + 1] !== '\n')) line += 1;
      }
      continue;
    }
    if (char === '"') {
      if (index !== fieldStart || closedQuote) return { records: [], warnings: ['invalid_csv'] };
      quoted = true;
      fieldStart = index + 1;
    } else if (char === ',') {
      finishField(index);
      fieldStart = index + 1;
    } else if (char === '\n' || char === '\r') {
      finishRecord(index);
      if (char === '\r' && raw[index + 1] === '\n') index += 1;
      fieldStart = index + 1;
      line += 1;
      startLine = line;
    } else {
      if (closedQuote) return { records: [], warnings: ['invalid_csv'] };
    }
  }
  if (quoted) return { records: [], warnings: ['invalid_csv'] };
  if (raw.length > fieldStart || cells.length || closedQuote) finishRecord(raw.length);
  const columnCount = records[0]?.cells.length;
  if (records.some(record => record.cells.length !== columnCount)) {
    return { records: [], warnings: ['invalid_csv'] };
  }
  return { records: records.slice(1), warnings: [] };
}

export function selectEvidence(evidence) {
  const ranked = [...evidence].filter(item => item.hits.length).sort((a, b) =>
    (b.hits[0].score - a.hits[0].score) || a.kb.localeCompare(b.kb) || a.artifact.localeCompare(b.artifact));
  // Najpierw najlepszy wynik każdej KB, potem pozostałe według trafności.
  const selected = [];
  const namespaces = new Set();
  for (const item of ranked) {
    if (namespaces.has(item.kb)) continue;
    selected.push(item);
    namespaces.add(item.kb);
    if (selected.length === MAX_EVIDENCE) return selected;
  }
  for (const item of ranked) {
    if (!selected.includes(item)) selected.push(item);
    if (selected.length === MAX_EVIDENCE) break;
  }
  return selected;
}
