// Presentation of already-selected public evidence only. No retrieval or I/O.
export function summarizeOmissions(omissions = []) {
  const counts = new Map();
  const uncovered = new Set();
  for (const omission of omissions) {
    const item = publicFields(omission, ['reason', 'uncoveredFacets', 'missingFacets']);
    counts.set(item.reason, (counts.get(item.reason) || 0) + 1);
    for (const facet of item.uncoveredFacets ?? item.missingFacets ?? []) uncovered.add(facet);
  }
  return {
    total: omissions.length,
    byReason: [...counts].map(([reason, count]) => ({ reason, count })),
    uncoveredFacets: [...uncovered],
  };
}

// Read only named enumerable public properties, never whole objects or rows.
function publicFields(object, names) {
  const result = {};
  for (const name of names) if (object != null && Object.prototype.propertyIsEnumerable.call(object, name)) result[name] = object[name];
  return result;
}

function location(unit) {
  if (unit.line != null) return unit.endLine != null && unit.endLine !== unit.line ? `L${unit.line}-L${unit.endLine}` : `L${unit.line}`;
  return unit.locator || 'lokalizacja nieznana';
}

const UNIT_FIELDS = ['sourceKey', 'artifact', 'line', 'endLine', 'locator', 'recordId', 'text'];

// Only a complete declarative source notice with the same provenance and named
// fields can replace its JSON-derived duplicate. Questions/metadata get no credit.
function hasScopedNotice(notes, limitation) {
  const identity = [limitation.artifact, limitation.recordId].filter(Boolean).join(', ') || 'pokazany fragment';
  const unknown = limitation.type === 'unknown';
  if (!unknown && limitation.type !== 'ambiguous') return false;
  const prefix = `Źródło (${identity}) ${unknown ? 'oznacza zakres „' : 'wskazuje konflikt lub niejednoznaczność w zakresie „'}`;
  const suffix = unknown ? '” jako UNKNOWN / do potwierdzenia; pokazany fragment nie potwierdza kompletnej wiedzy w tym zakresie.'
    : '”. Pokazany fragment wymaga wyjaśnienia przed rozstrzygnięciem.';
  return notes.some(note => note.startsWith(prefix) && note.endsWith(suffix)
    && (limitation.fieldNames || []).every(field => note.slice(prefix.length, -suffix.length).split(', ').includes(field)));
}

export function renderCompactOwaAnswer(input) {
  const answer = publicFields(input, ['extracts', 'sources', 'answerNotes', 'owaCoverage', 'evidenceAssessment', 'evidence', 'omissions', 'freshnessNote', 'externalEvidence', 'retrieval', 'note']);
  const extracts = (answer.extracts || []).map(unit => publicFields(unit, UNIT_FIELDS));
  const sources = (answer.sources || []).slice(0, 2).map(source => publicFields(source,
    ['key', 'title', 'namespace', 'sourceUrl', 'publication', 'update', 'retrieved']));
  const coverage = publicFields(answer.owaCoverage, ['status', 'missingFacets', 'uncoveredFacets', 'requirements', 'limitations', 'notices', 'reasons']);
  const assessment = publicFields(answer.evidenceAssessment, ['status', 'missingTerms', 'reasons']);
  const omissions = summarizeOmissions(answer.omissions);
  const blocks = ['Odpowiedź:'];
  const retrieval = publicFields(answer.retrieval, ['backend']);
  if (['external_search', 'local_artifacts_with_external_search'].includes(retrieval.backend)) {
    if (answer.note) blocks.push(answer.note);
    const backend = retrieval.backend === 'external_search' ? 'zewnętrzne wyszukiwanie' : 'lokalne artefakty KB i zewnętrzne wyszukiwanie';
    blocks.push(`Źródło: ${backend}; bez wykonania grafu KAG/OpenSPG.`);
  }
  const notes = [...new Set([...(answer.answerNotes || []), ...(coverage.notices || [])])].filter(note => note?.trim());
  if (notes.length) blocks.push(notes.join('\n'));
  if (assessment.status === 'insufficient_evidence') {
    blocks.push('Brak wystarczających lokalnych dowodów dla pytania. Nie traktuj fragmentów jako potwierdzonej procedury.');
  }
  const missing = [...new Set([...(coverage.uncoveredFacets ?? coverage.missingFacets ?? []), ...omissions.uncoveredFacets])];
  if (coverage.status && (coverage.status !== 'covered' || missing.length)) blocks.push(`Pokrycie: ${coverage.status}.${missing.length ? ` Brak pokrycia: ${missing.join(', ')}.` : ''}`);
  for (const value of coverage.requirements || []) {
    const requirement = publicFields(value, ['ownerId', 'fieldName', 'facet', 'covered', 'processId']);
    if (requirement.covered !== false) continue;
    if (!requirement.ownerId && !requirement.processId && !requirement.fieldName && missing.includes(requirement.facet)) continue;
    blocks.push(`Brak pokrycia wymagania: ${[requirement.ownerId, requirement.processId, requirement.fieldName, requirement.facet].filter(Boolean).join(' / ')}.`);
  }
  for (const value of coverage.limitations || []) {
    const limitation = publicFields(value, ['type', 'fieldNames', 'artifact', 'recordId', 'relevant']);
    if (hasScopedNotice(notes, limitation)) continue;
    blocks.push(`${String(limitation.type || 'ograniczenie').toUpperCase()}: ${[limitation.artifact, limitation.recordId, ...(limitation.fieldNames || [])].filter(Boolean).join(', ')}${limitation.relevant === false ? ' (zakres poboczny)' : ''}.`);
  }
  if (assessment.missingTerms?.length) blocks.push(`Brakujące terminy: ${assessment.missingTerms.join(', ')}.`);
  const reasons = [...new Set([...(assessment.reasons || []), ...(coverage.reasons || [])])].filter(reason => reason !== 'text_matches_do_not_verify_claims');
  if (reasons.includes('invalid_csv')) blocks.push('Część źródeł CSV ma nieprawidłowy format i została pominięta.');
  if (answer.freshnessNote) blocks.push(`Uwaga o świeżości: ${answer.freshnessNote}`);
  for (const extract of extracts) {
    const index = sources.findIndex(source => source.key && source.key === extract.sourceKey);
    const label = index >= 0 ? `[S${index + 1}]` : '[źródło nieustalone]';
    const locator = extract.line != null ? `linie ${extract.line}–${extract.endLine ?? extract.line}` : location(extract);
    const record = index < 0 && extract.recordId ? `; rekord ${extract.recordId}` : '';
    blocks.push(`${label} ${extract.artifact || 'artefakt nieznany'}, ${locator}${record}:\n${extract.text}`);
  }
  // Each item is its own provenance group: never merge owners or versions.
  // Hn binds the original hit index; E is a distinct item-only excerpt.
  // Exact same-item excerpt equality proves duplication, not lexical relevance.
  const auxiliary = [];
  for (const [itemIndex, value] of (answer.evidence || []).entries()) {
    const item = publicFields(value, ['kb', 'artifact', 'locator', 'excerpt', 'hits']);
    const entries = [], texts = [];
    for (const [hitIndex, value] of (item.hits || []).entries()) {
      const hit = publicFields(value, ['snippet', 'line', 'endLine', 'locator', 'recordId', 'source']);
      if (!hit.snippet?.trim()) continue;
      const source = publicFields(hit.source, ['locator', 'sourceUrl']);
      const locator = location({ ...hit, locator: hit.locator || source.locator });
      entries.push(`- [H${hitIndex + 1}] ${locator}${source.sourceUrl ? `; ${source.sourceUrl}` : ''}:\n${hit.snippet}`);
      texts.push(hit.snippet);
    }
    if (item.excerpt?.trim() && !texts.includes(item.excerpt)) entries.push(`- [E] ${location(item)}:\n${item.excerpt}`);
    if (entries.length) auxiliary.push(`[A${itemIndex + 1}] ${item.kb || 'namespace nieznany'}; ${item.artifact || 'artefakt nieznany'}:\n\n${entries.join('\n\n')}`);
  }
  if (auxiliary.length) blocks.push('Dodatkowe dowody:\n\n' + auxiliary.join('\n\n'));
  if (!extracts.length && !auxiliary.length) blocks.push('Brak lokalnych dowodów dla żądanego zakresu.');
  // Keep the complete previously visible provider block, including conditions,
  // real URLs and source dates. External text is not a local extract unit.
  if (answer.externalEvidence?.length) {
    const lines = ['Zewnętrzne dowody live:'];
    for (const value of answer.externalEvidence) {
      const item = publicFields(value, ['title', 'sourceType', 'url', 'publishedDate', 'snippet']);
      lines.push(`- ${item.title} [${item.sourceType}] -> ${item.url}`);
      if (item.publishedDate) lines.push(`  - opublikowano: ${item.publishedDate}`);
      if (item.snippet) lines.push(`  - fragment: ${item.snippet}`);
    }
    blocks.push(lines.join('\n'));
  }
  blocks.push('Źródła lokalne nie są świeżą weryfikacją ERP/MSSQL ani wykonaniem grafu KAG/OpenSPG.');
  const citations = [];
  for (const [index, source] of sources.entries()) {
    const used = extracts.filter(extract => source.key && extract.sourceKey === source.key);
    if (!used.length) continue;
    const locators = [...new Set(used.map(extract => `${extract.artifact || 'artefakt nieznany'} ${location(extract)}; rekord ${extract.recordId || 'nieznany'}`))];
    let citation = `- [S${index + 1}] ${source.title || used.map(extract => extract.recordId).filter(Boolean).join(', ')} — ${source.namespace}; ${locators.join('; ')}`;
    if (source.sourceUrl) citation += `; ${source.sourceUrl}`;
    const unknown = [];
    for (const [field, label] of [['publication', 'Publikacja'], ['update', 'Aktualizacja'], ['retrieved', 'Pobranie']]) {
      const date = publicFields(source[field], ['value', 'timezone']);
      if (date?.value) citation += `; ${label}: ${date.value}${date.timezone ? ` (${date.timezone})` : ''}`;
      else unknown.push(label.toLowerCase());
    }
    if (unknown.length) citation += `. Nieznane daty źródłowe: ${unknown.join(', ')}.`;
    citations.push(citation);
  }
  if (citations.length) blocks.push('Źródła:\n' + citations.join('\n'));
  if (omissions.total) {
    const labels = new Map([['source_limit', 'limit źródeł'], ['section_limit', 'limit sekcji'], ['budget', 'budżet']]);
    const reasons = omissions.byReason.map(({ reason, count }) => `${labels.get(reason) || reason}: ${count}`).join('; ');
    blocks.push(`Pominięcia: ${omissions.total} jednostek (${reasons}). Szczegóły w danych strukturalnych.`);
  }
  return blocks.join('\n\n');
}
