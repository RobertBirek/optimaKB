// Znane skróty dokumentów zachowujemy również wtedy, gdy mają dwa znaki.
export const DOCUMENT_CODES = new Set(['pz', 'wz', 'fs', 'fz', 'pw', 'rw', 'mm', 'ro', 'zd', 'pa', 'pf']);
export const MAX_EVIDENCE = 5;
export const MAX_SNIPPET_LENGTH = 280;

export function containsTerm(text, term) {
  return findTermIndex(text, term) >= 0;
}

export function findTermIndex(text, term) {
  if (/^\d+(?:\.\d+){2,}$/.test(term)) {
    const match = new RegExp(`(^|[^a-z0-9_.])${term.replaceAll('.', '\\.')}($|[^a-z0-9_.]|\\.(?![0-9]))`).exec(text);
    return match ? match.index + match[1].length : -1;
  }
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
  return { columns: records[0]?.cells || [], records: records.slice(1), warnings: [] };
}

export function getSourceFields(columns, record, artifact = '') {
  const fields = Object.fromEntries(columns.map((name, index) =>
    [String(name).trim(), String(record.cells?.[index] ?? '')]));
  const priorities = /business_description\.csv$/i.test(artifact)
    ? ['description', 'content', 'summary']
    : /reference_document\.csv$/i.test(artifact)
      ? ['summary', 'content', 'description']
      : ['content', 'summary', 'description', 'definitionPreview'];
  const bodyField = priorities.find(name => fields[name]?.trim()) || null;
  const provenanceFields = new Set(['id', 'sourceUrl', 'sourcePath', 'localSnapshotPath',
    'publishedAt', 'lastModified', 'retrievedAt', 'contentHash', 'sourceDocumentRefId',
    'sourceOrigin', 'sourceType', 'source', 'semanticType']);
  const technicalText = Object.entries(fields)
    .filter(([name]) => !provenanceFields.has(name))
    .map(([, value]) => value).filter(Boolean).join(' | ');
  return {
    fields,
    bodyField: bodyField || 'technical_fields',
    bodyText: bodyField ? fields[bodyField] : technicalText,
    identityText: record.cells ? record.cells.join(' | ') : String(record.text || ''),
    source: {
      recordId: fields.id || null,
      title: fields.name || fields.title || null,
      sourceUrl: fields.sourceUrl || null,
      owningPath: fields.sourcePath || fields.localSnapshotPath || null,
      sourceDocumentRefId: fields.sourceDocumentRefId || null,
      sourceOrigin: fields.sourceOrigin || fields.sourceType || fields.source || fields.semanticType || null,
      csvDates: { publishedAt: fields.publishedAt || null,
        lastModified: fields.lastModified || null, retrievedAt: fields.retrievedAt || null },
    },
  };
}

export function makeBodyPreview(bodyText, terms, focusHints, normalize) {
  const text = String(bodyText || '').replace(/\s+/g, ' ').trim();
  const normalized = normalize(text);
  const bodyMatchedTerms = terms.filter(term => containsTerm(normalized, term));
  const stemMatchedTerms = terms.filter(term => term.length >= 8
    && !bodyMatchedTerms.includes(term) && normalized.includes(term.slice(0, 5)));
  const anchors = [...focusHints, ...terms.filter(term => DOCUMENT_CODES.has(term)), ...bodyMatchedTerms];
  let index = anchors.map(term => findTermIndex(normalized, term)).find(value => value >= 0);
  if (index === undefined) index = stemMatchedTerms.length
    ? normalized.indexOf(stemMatchedTerms[0].slice(0, 5)) : -1;
  // Keep NFKD/case expansions, including spaces introduced by spacing accents.
  // Sentinels prevent normalize's trim from deleting a character's whitespace;
  // then fold runs and trim once across the entire mapped stream, as normalize
  // does for the whole body. Only bounded-size strings are normalized per char.
  const displayOffsets = [];
  let displayIndex = 0;
  let pendingSpace;
  for (const char of text) {
    const part = normalize(`x${char}x`).slice(1, -1);
    for (let unit = 0; unit < part.length; unit += 1) {
      if (/\s/.test(part[unit])) {
        if (displayOffsets.length && pendingSpace === undefined) pendingSpace = displayIndex;
      } else {
        if (pendingSpace !== undefined) {
          displayOffsets.push(pendingSpace);
          pendingSpace = undefined;
        }
        displayOffsets.push(displayIndex);
      }
    }
    displayIndex += char.length;
  }
  const bodyOffset = Math.max(0, (displayOffsets[index] ?? 0) - 60);
  const prefix = bodyOffset ? '...' : '';
  const available = MAX_SNIPPET_LENGTH - prefix.length;
  const fragment = text.slice(bodyOffset, bodyOffset + available);
  const snippet = prefix + (text.length > bodyOffset + available
    ? `${fragment.slice(0, -3)}...` : fragment);
  return { snippet, bodyOffset, bodyDisplayText: text, bodyMatchedTerms, stemMatchedTerms };
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
