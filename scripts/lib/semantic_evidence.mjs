// Internal adapter: declarative request obligations -> eligible complete units.
// No I/O, public catalog facts, guessed identities or independent coverage model.
import { matchesOwaField, parseOwaQuestion, owaDocumentPaths } from './owa_query_context.mjs';

const OWA = 'OWAOntology';
const unique = values => [...new Set(values)];
const kind = row => row.fields?.semanticType || String(row.artifact || '').split('/').at(-1)?.replace(/\.csv$/, '');

export function semanticRequirementKey(r) {
  return JSON.stringify([r.namespace, r.ownerId, r.facet, r.fieldName || null,
    r.processId || null, r.endpointOwnerIds || null, r.unresolvedEndpointIds || null, r.documentPath || null, r.workflowAspect || null, r.qualifierClass || null]);
}

// Consume top-level paths as well as exact process requirements. A null owner
// on a literal path is an explicit obligation, never an arbitrary-owner match.
export function semanticCoverageRequirements(plan, namespace = null) {
  const requirements = plan.requirements.filter(r => !namespace || r.namespace === namespace || !r.namespace && r.documentPath)
    .map(({ evidence, ...r }) => ({ ...r, fieldName: r.fieldName || null }));
  for (const field of plan.unresolved.filter(u => u.kind === 'field' && !requirements.some(r => r.fieldName === u.value
    && r.requestSpans.some(span => span.start <= u.start && span.end >= u.end)))) requirements.push({ namespace: namespace || OWA,
    ownerId: null, fieldName: field.value, facet: 'fields', unresolved: true,
    requestSpans: [{ start: field.start, end: field.end, text: field.value }] });
  for (const documentPath of plan.documentPaths) {
    if (requirements.some(r => JSON.stringify(r.documentPath) === JSON.stringify(documentPath))) continue;
    const processes = requirements.filter(r => r.processId && r.requestSpans?.some(span =>
      owaDocumentPaths(span.text).some(path => JSON.stringify(path) === JSON.stringify(documentPath))));
    const process = processes.length === 1 ? processes[0] : null;
    requirements.push({ namespace: process?.namespace || namespace || OWA, ownerId: process?.ownerId || null, fieldName: null,
      facet: 'workflow', documentPath, ...(process ? { processId: process.processId } : {}),
      requestSpans: (process ? [process] : requirements).flatMap(r => r.requestSpans || []).filter(span =>
        owaDocumentPaths(span.text).some(path => JSON.stringify(path) === JSON.stringify(documentPath))) });
  }
  return requirements.flatMap(r => r.workflowAspects?.length ? r.workflowAspects.map(workflowAspect => ({ ...r,
    workflowAspect, workflowAspects: [workflowAspect],
    ...(workflowAspect==='outcome'&&r.ownerId&&!r.processId ? {effectOwnerId:r.ownerId} : {}),
    requestSpans: r.workflowAspectRequests?.filter(request => request.aspect === workflowAspect)
      .map(({ aspect, ...span }) => span) || r.requestSpans })) : [r]);
}

// Only source prose or a literal declared path establishes substantive process
// support. Inventory labels, modes, statuses and identity are handled separately.
export function semanticWorkflowAspects(prose, paths) {
  const text = String(prose).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ł/g, 'l');
  const aspects = [];
  if (paths.length || /\b(?:najpierw|nastepnie|potem|first|then)\s+[\p{L}\p{N}]|\b(?:rozpoczyna|zaczyna)\w*\s+(?:sie\s+)?od\s+\S|\bprzechodzi\b[^.;\n]+\bdo\s+\S|\b(?:przenosi|przesuwa|generuje|tworzy)\s+[\p{L}\p{N}]+/u.test(text)) aspects.push('progression');
  if (paths.length || /\b(?:z|od|from)\s+[\p{L}\p{N}][^.;\n]{1,100}?\s+(?:do|to)\s+[\p{L}\p{N}][\p{L}\p{N}_-]+/u.test(text)) aspects.push('direction');
  if (/\b(?:skutkiem|wynikiem|rezultatem)\s+(?:jest|sa)\s+[\p{L}\p{N}]+|\b(?:powstaje|powstaja|tworzy|generuje|przenosi|przesuwa|zwieksza|zmniejsza|zmienia|kasuje|usuwa)\s+[\p{L}\p{N}]+|\bnie\s+(?:zmienia|powoduje)\s+\S/u.test(text)) aspects.push('outcome');
  if (/\b(?:tylko|wylacznie)\s+(?:po|gdy|jesli|dla|przy)\s+\S|\bpod warunkiem\s+\S|\bonly\s+(?:if|after|when)\s+\S|\b(?:wymaga\w*|wymagan\w*|musi|musza|co najmniej)\s+\S/u.test(text)) aspects.push('conditions');
  return aspects;
}

// Source statement classes, not answers or inferred enum values. Selection and
// final proof use this same classifier on complete attributable units.
export function semanticMaterialFacts(prose) {
  const text = String(prose).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ł/g, 'l');
  return Object.entries({
    original: /\b(?:oryginal\w*|pierwotn\w*)\b[^\n]*\b(?:nadpis\w*|modyfik\w*|osobn\w*)|\b(?:nie nadpis\w*|nie modyfik\w*)[^\n]*(?:oryginal|pierwotn)/,
    dimensions: /\bkwot\w*\b[^\n]*\bilosc\w*\b|\bilosc\w*\b[^\n]*\bkwot\w*\b/,
    polarity: /\bin plus\b[^\n]*\bin minus\b|\bzwieksz\w*\b[^\n]*\bzmniejsz\w*\b/,
    necessity: /\b(?:wymagan\w*|musi|musza|nie ma)\b\s+\S/,
    participation: /\b(?:co najmniej|przynajmniej|minimum)\b\s+\S|\bprzeciwn\w* znak\w*\b/,
    sourceTables: /\b(?:schemat|schema)\b[^\n]*\b(?:tabela|table)\b[\s\S]*\n\|[^\n]+\n\|[^\n]+|## tabele mssql\n[\s\S]*`[\w]+\.[\w]+`/,
    scope: /\bkazd\w* (?:typ|rodzaj)\b[^\n]*\bwlasn\w*\b|\bzalezn\w* od typu\b/,
    completion: /\b(?:peln\w*|calkowit\w*) realizacj\w*\b/,
    activation: /\b(?:dezaktyw\w*|nieaktywn\w*)\b/,
    execution: /\b(?:nie wywolano|write_not_called|nie zostal\w* wywolan\w*)\b/,
    reference: /\b(?:oryginal\w*|odnosi sie do|koryguje|referencj\w*)\b/,
    effectRelation: /\bprzeciwn\w* ruch\w*\b|\bodwraca\b[^\n]*(?:ruch|skutek)/,
    verification: /\b(?:(?:czesciowo[- ])?zweryfikowan\w*|niezweryfikowan\w*|niepotwierdz\w*|do potwierdzenia|do ustalenia|unknown)\b/,
  }).filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

export function semanticEvidenceContext(context, plan) {
  const requirements = semanticCoverageRequirements(plan);
  const symbols = unique(plan.subjects.flatMap(s => s.mentions.filter(m => m.kind === 'symbol').map(m => m.value)));
  // Other declared symbols in the source path must remain valid even when they
  // were not typed by the user. The coordinator attaches only allowed symbols.
  const documentSymbols = unique([...(context.documentSymbols || []), ...symbols]);
  const parsed = parseOwaQuestion(context.question, { symbols: documentSymbols.map(name => ({ name })) });
  return { ...parsed, documentSymbols,
    facets: unique(requirements.map(r => r.facet)),
    fieldNames: unique(requirements.map(r => r.fieldName).filter(Boolean)),
    qualifiedIds: plan.unresolved.filter(u => u.kind === 'identity').map(u => u.value) };
}

export function selectSemanticEvidence(context, rows, plan, unitsForRow) {
  context = semanticEvidenceContext(context, plan);
  const subjects = plan.subjects;
  const ownerIds = subjects.filter(s => s.kind !== 'process').map(s => s.id);
  const processIds = subjects.filter(s => s.kind === 'process').map(s => s.id);
  const requirements = semanticCoverageRequirements(plan);
  const result = { ownerIds, processIds, identityMatches: subjects.map(s => ({ ownerId: s.id, kind: s.kind })),
    missing: plan.identityBarrier || !subjects.length, candidates: [], metadata: new Map() };
  Object.defineProperties(result, { effectiveContext: { value: context }, requestPlan: { value: plan },
    ambiguities: { value: plan.ambiguities.filter(a => a.candidates.some(c => c.owner.namespace === OWA)).map(a => a.ownerIds) } });
  if (plan.identityBarrier) return result;
  const permitted = rows.filter(r => r.namespace === OWA || subjects.some(s => s.namespace === r.namespace && s.origin === r));
  const entities = permitted.filter(r => kind(r) === 'ontology_entity');
  const refs = new Map();
  for (const row of entities) for (const id of [row.fields.id, row.fields.ontologyId].filter(Boolean)) {
    const key = JSON.stringify([row.namespace, id]);
    refs.set(key, unique([...(refs.get(key) || []), row.fields.id]));
  }
  for (const row of permitted) {
    const f = row.fields, type = kind(row);
    const forRef = id => refs.get(JSON.stringify([row.namespace, id])) || [];
    const scoped = requirements.filter(r => r.namespace === row.namespace);
    let owners = [], relevant = [];
    if (row.namespace !== OWA) {
      owners = [f.id];
      relevant = scoped.filter(r => r.ownerId === f.id);
    } else if (type === 'ontology_entity' || type === 'chunk') {
      owners = type === 'ontology_entity' ? [f.id] : forRef(f.sourceDocumentRefId);
      owners = owners.filter(id => ownerIds.includes(id));
      relevant = scoped.filter(r => owners.includes(r.ownerId)
        || ['relations', 'cardinality'].includes(r.facet) && r.endpointOwnerIds?.some(id => owners.includes(id)));
    } else if (type === 'ontology_field') {
      owners = forRef(f.entityRefId).filter(id => ownerIds.includes(id));
      relevant = scoped.filter(r => owners.includes(r.ownerId) && ['fields', 'identifiers', 'unknownEnums'].includes(r.facet)
        && (r.facet !== 'identifiers' || /\b(?:PK|PRIMARY KEY|IDENTITY)\b/i.test(f.keyRole || ''))
        && (!r.fieldName || owners.some(id => matchesOwaField(r.fieldName, f, entities.find(e => e.fields.id === id)?.fields))));
    } else if (type === 'ontology_relation' || type === 'workflow_pattern') {
      if (type === 'ontology_relation' && [f.sourceEntityRefId,f.targetEntityRefId].filter(Boolean).some(id => !forRef(id).length)) continue;
      owners = unique([...forRef(f.sourceEntityRefId), ...forRef(f.targetEntityRefId)]);
      relevant = scoped.filter(r => type === 'workflow_pattern' ? r.facet === 'workflow'
        && (r.processId ? r.processId === f.id : r.documentPath || owners.includes(r.ownerId))
        : ['relations', 'cardinality'].includes(r.facet) && !r.unresolvedEndpointIds?.length
          && r.endpointOwnerIds?.length && r.endpointOwnerIds.every(id => owners.includes(id)));
    }
    // Identity records also supply private attribution labels, never coverage.
    if (!relevant.length && !(type === 'ontology_entity' && ownerIds.includes(f.id))) continue;
    const local = { ...context, materialPlan:true, qualifierClasses:unique(relevant.map(r=>r.qualifierClass).filter(Boolean)), facets: unique(relevant.map(r => r.facet)),
      fieldNames: unique(relevant.map(r => r.fieldName).filter(Boolean)) };
    for (const name of [...local.fieldNames]) {
      const tail = name.split('.').at(-1);
      if (name.includes('.') && owners.some(id => matchesOwaField(name, { fieldName: tail }, entities.find(e => e.fields.id === id)?.fields))) local.fieldNames.push(tail);
    }
    const paths = relevant.filter(r => r.documentPath).map(r => r.documentPath);
    const contexts = paths.length ? paths.map(path => ({ ...local, documentPaths: [path], documentCodes: unique(path) }))
      : [{ ...local, documentPaths: [], ...(local.facets.includes('workflow') ? { documentCodes: [] } : {}) }];
    if (relevant.some(r => r.facet === 'qualifiers' && ['reference','effectRelation'].includes(r.qualifierClass)))
      contexts.push({ ...local, facets:['qualifiers'], documentPaths:[], documentCodes:[] });
    if (relevant.some(r=>r.facet==='overview'&&r.definitionOnly))
      contexts.push({ ...local, facets:['overview'], documentPaths:[], documentCodes:[] });
    let units = relevant.length ? contexts.flatMap(c => unitsForRow(c, row)) : [];
    if (row.namespace !== OWA) units = semanticConceptUnits(row);
    if (type === 'ontology_entity' && relevant.some(r => r.facet === 'overview' && r.identityOnly)) {
      const columns = ['id', 'name', 'canonicalName', 'mainTable', 'verificationStatus'];
      const cells = columns.map(key => String(f[key] || '').replaceAll('|', '\\|').replace(/\r?\n/g, '<br>'));
      units.push({ facet: 'overview', text: `| ${columns.join(' | ')} |\n| ${columns.map(() => '---').join(' | ')} |\n| ${cells.join(' | ')} |` });
    }
    if (type === 'workflow_pattern' && !units.length) continue;
    result.candidates.push(row);
    result.metadata.set(row, { ownerIds: owners, facets: unique(units.map(u => u.facet)), units });
  }
  return result;
}

export function semanticConceptUnits(row) {
  const text = row.bodyText || row.fields.content || row.fields.description || row.fields.summary || '';
  return text.trim() ? unique(['overview', ...parseOwaQuestion(text).facets]).map(facet => ({ facet, text: text.replace(/\r\n?/g, '\n').trim() })) : [];
}

/** Greedy missing-obligation reservation across sources, with complete-unit
 * costs. Uses the assessor's exact cells, not a second facet scoring system. */
export function budgetSemanticUnits(groups, assess, omit, requestPlan = null) {
  const sources = [], extracts = [], counts = new Map();
  const primaryKeys = new Set(assess([]).requirements.filter(r => !['relations', 'cardinality'].includes(r.facet)
    && (!requestPlan || requestPlan.subjects.some(s => s.namespace === r.namespace && s.id === r.ownerId
      && ['primary', 'comparison'].includes(s.role)))).map(semanticRequirementKey));
  // Requirements require one complete attributable unit, so their support sets
  // are additive. Classify each unit once using the real assessor.
  const pending = groups.flatMap(group => group.units.map(unit => {
    const coverage = assess([{ ...unit, namespace: group.source.namespace, owa: unit.owa }]);
    const supports = new Set(coverage.requirements.filter(r => r.covered).map(semanticRequirementKey));
    const limitations = unique(coverage.limitations.filter(l => l.relevant).map(l => l.type));
    const conditions = semanticMaterialFacts(unit.text).filter(type => ['completion', 'scope'].includes(type));
    const identityWitness = kind(unit.owa?.row || {}) === 'workflow_pattern'
      && requestPlan?.subjects.some(s=>s.kind==='process'&&s.id===unit.owa.row.fields.id);
    return { group, unit, supports, identityWitness, qualification: limitations.length ? 1 : 0,
      states: [...supports].flatMap(key => [...(limitations.length ? limitations : ['statement']),
        ...(['workflow', 'overview'].includes(JSON.parse(key)[2]) ? conditions.map(type => 'condition:' + type) : [])]
        .map(type => JSON.stringify([key, type]))) };
  }));
  let remaining = 4000;
  const satisfied = new Set(), shownStates = new Set();
  const fits = (entry, budget = remaining, used = counts) => entry.unit.text.length <= budget
    && (used.get(entry.group) || 0) < 3 && (used.has(entry.group) || used.size < 2);
  // Bounded one-unit lookahead: do not spend space/source slots if it removes
  // every fitting witness for another primary/comparison obligation.
  const preservesPrimary = entry => {
    if (!fits(entry)) return false;
    const used = new Map(counts);
    used.set(entry.group, (used.get(entry.group) || 0) + 1);
    const required = [...primaryKeys].filter(key => !satisfied.has(key) && !entry.supports.has(key));
    const witnesses = pending.filter(other => other !== entry && fits(other, remaining - entry.unit.text.length, used));
    const exclusive = new Map();
    for (const key of required) {
      const choices = witnesses.filter(w => w.supports.has(key));
      if (!choices.length) return false;
      const groups = new Set(choices.map(w => w.group));
      if (groups.size === 1) {
        const group = choices[0].group;
        exclusive.set(group, [...(exclusive.get(group) || []), key]);
      }
    }
    // At most three units fit one source. Check its exclusive obligations as a
    // set, not each witness independently: three distinct remaining conditions
    // cannot share two remaining slots. This bounded depth-three check does not
    // introduce a second coverage model or an unbounded global packing solver.
    const cover = (keys, slots, choices) => {
      if (!keys.length) return true;
      if (!slots) return false;
      const key = keys.reduce((a, b) => choices.filter(c => c.supports.has(a)).length <= choices.filter(c => c.supports.has(b)).length ? a : b);
      return choices.filter(c => c.supports.has(key)).some(c => cover(keys.filter(k => !c.supports.has(k)), slots - 1, choices));
    };
    return [...exclusive].every(([group, keys]) => cover(keys, 3 - (used.get(group) || 0), witnesses.filter(w => w.group === group)));
  };
  while (pending.length) {
    const ranked = pending.map(entry => {
      const gains = [...entry.supports].filter(key => !satisfied.has(key)).length;
      // Reserve both the source statement and its unresolved/conflicting side,
      // before spending slots on repeated qualifications of the same fact.
      const primaryGain = [...entry.supports].filter(key => primaryKeys.has(key) && !satisfied.has(key)).length;
      return { ...entry, gains, primaryGain, reservationSafe: preservesPrimary(entry), stateGain: entry.states.filter(state => !shownStates.has(state)).length };
    }).sort((a, b) => Number(b.primaryGain > 0) - Number(a.primaryGain > 0)
      || Number(b.reservationSafe) - Number(a.reservationSafe) || b.primaryGain - a.primaryGain
      || b.gains - a.gains || b.stateGain - a.stateGain || b.qualification - a.qualification
      || (a.gains && b.gains ? a.unit.text.length - b.unit.text.length : 0)
      || b.unit.relevance - a.unit.relevance || b.group.score - a.group.score);
    const { group, unit, supports, states, qualification, identityWitness } = ranked[0];
    pending.splice(pending.findIndex(e => e.group === group && e.unit === unit), 1);
    const count = counts.get(group) || 0;
    const reason = !count && sources.length >= 2 ? 'source_limit' : count >= 3 ? 'section_limit'
      : unit.text.length > remaining ? 'answer_budget' : null;
    if (reason) { omit(group, [unit], reason); continue; }
    // Spare slots do not authorize another owner's inventory or unrelated facts.
    // Relevant negative/UNKNOWN qualifications remain eligible without positive
    // support; oversized admitted units still receive their precise cap omission.
    if (!supports.size && !qualification && !identityWitness) continue;
    if (!count) sources.push(group.source);
    counts.set(group, count + 1);
    remaining -= unit.text.length;
    const { relevance, ...extract } = unit;
    if (unit.owa) Object.defineProperty(extract, 'owa', { value: unit.owa });
    extracts.push(extract);
    for (const key of supports) satisfied.add(key);
    for (const state of states) shownStates.add(state);
  }
  return { sources, extracts };
}
