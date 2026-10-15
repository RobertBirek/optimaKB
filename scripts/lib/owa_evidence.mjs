import { parseOwaQuestion, resolveOwaOwners, matchesOwaField, owaDocumentPaths } from './owa_query_context.mjs';
import { DOCUMENT_CODES } from './knowledge_retrieval.mjs';

const OWA = 'OWAOntology';
const normalize = value => String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '')
  .replace(/ł/g, 'l').replace(/Ł/g, 'L').toLowerCase();
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mentions = (text, value) => value && new RegExp(`(?<![\\p{L}\\p{N}_.])${escape(normalize(value))}(?![\\p{L}\\p{N}_])`, 'u')
  .test(normalize(text));
const kind = row => row.fields?.semanticType || String(row.artifact || '').split('/').at(-1)?.replace(/\.csv$/, '');
const fullBody = fields => [fields.content, fields.description, fields.summary].find(value => value?.trim()) || '';
const relationColumns = ['sourceEntityRefId', 'targetEntityRefId', 'predicate',
  'cardinality', 'relationType', 'joinCondition', 'status'];
const fieldColumns = ['entityRefId', 'fieldName', 'mssqlColumn', 'mcpField', 'sqlType',
  'nullable', 'keyRole', 'mappingStatus'];
const workflowColumns = ['sourceEntityRefId', 'targetEntityRefId', 'workflowName', 'mcpTool', 'mode', 'status'];

function miniTable(fields, columns) {
  // Embedded pipes/newlines stay inside one complete Markdown row.
  const cells = columns.map(key => String(fields[key] || '').replaceAll('|', '\\|').replace(/\r\n?|\n/g, '<br>'));
  return '| ' + columns.join(' | ') + ' |\n| ' + columns.map(() => '---').join(' | ')
    + ' |\n| ' + cells.join(' | ') + ' |';
}

function sections(body) {
  const text = String(body).replace(/\r\n?/g, '\n').trim();
  if (!text) return [];
  const headings = [...text.matchAll(/^(#{1,6})\s+(.+)$/gm)];
  // A document title is not a reason to swallow all its facet sections. Nested
  // subsections remain with the parent so inherited conditions cannot be lost.
  const level = headings.some(match => match[1].length === 2) ? 2
    : Math.min(...headings.map(match => match[1].length));
  const starts = [...new Set([0, ...headings.filter(match => match[1].length <= level).map(match => match.index)])];
  const parts = starts.map((start, index) => text.slice(start, starts[index + 1] ?? text.length).trim()).filter(Boolean);
  const introduction = parts.length > 1 && !/^#{2,6}\s/m.test(parts[0]) ? parts[0] : '';
  return parts.map((part, index) => ({
    text: index && introduction ? `${introduction}\n\n${part}` : part,
    scopeText: part,
    heading: /^#{1,6}\s+(.+)$/m.exec(part)?.[1] || '',
  }));
}

function sectionFacets(text, sectionHeading = '') {
  const heading = sectionHeading || /^#{1,6}\s+(.+)$/m.exec(text)?.[1] || '';
  // Parent and nested headings/prose all describe the same atomic unit. A
  // recognized parent must not suppress an explicitly requested child facet.
  const facets = [...parseOwaQuestion(heading).facets, ...parseOwaQuestion(text).facets]
    .filter(facet => facet !== 'statusAmbiguity');
  const normalized = normalize(`${heading}\n${text}`);
  if (/^(?:opis biznesowy|status weryfikacji)$/.test(normalize(heading))) facets.push('overview');
  if (/\b(?:otwarte problemy|braki|niewiadome|ograniczenia wiedzy)\b/.test(normalized)
      || /\b(?:unknown|do potwierdzenia|niezweryfikowan\w*)\b/.test(normalize(text))) facets.push('unknownEnums');
  if (/\b(?:regul\w*|zasad\w*|ograniczen\w*)\b/.test(normalized)) facets.push('workflow');
  return [...new Set(facets)];
}

function completeTables(text) {
  let width = null;
  for (const line of text.split('\n')) {
    if (!/^\s*\|/.test(line)) { width = null; continue; }
    const cells = line.trim().split(/(?<!\\)\|/);
    if (cells.at(-1) !== '') return false;
    if (width === null) width = cells.length;
    if (cells.length !== width) return false;
  }
  return true;
}

/** Whole evidence units; no presentation cap, truncation or claim verification.
 * @param {import('./owa_query_context.mjs').Context} context
 * @param {import('./owa_query_context.mjs').ParsedRow} row
 * @returns {Array<{text: string, facet: string}>}
 */
export function owaUnitsForRow(context, row) {
  const fields = row.fields || {};
  const type = kind(row);
  if (type === 'ontology_relation' || fields.sourceEntityRefId && fields.predicate) {
    const text = miniTable(fields, relationColumns) + (fullBody(fields) ? `\n\n${fullBody(fields)}` : '');
    const facets = context.facets.filter(facet => ['relations', 'cardinality'].includes(facet));
    return (facets.length ? facets : ['relations']).map(facet => ({ text, facet }));
  }
  if (type === 'ontology_field' || fields.entityRefId && fields.fieldName) {
    const text = miniTable(fields, fieldColumns) + (fullBody(fields) ? `\n\n${fullBody(fields)}` : '');
    const facets = context.facets.filter(facet => facet === 'fields' || facet === 'identifiers' && fields.keyRole?.trim());
    return (facets.length ? facets : ['fields']).map(facet => ({ text, facet }));
  }
  if (type === 'workflow_pattern') {
    if (!workflowMatches(context, fields)) return [];
    return [{ text: miniTable(fields, workflowColumns) + (fullBody(fields) ? `\n\n${fullBody(fields)}` : ''), facet: 'workflow' }];
  }
  const qualifiers = ['verificationStatus', 'confidenceLevel', 'status', 'mappingStatus']
    .filter(key => fields[key]).map(key => `${key}: ${fields[key]}`).join('\n');
  return sections(fullBody(fields)).flatMap(({ text, scopeText, heading }) => {
    if (!completeTables(text)) return [];
    const facets = sectionFacets(text, heading || fields.sectionHeading);
    const directions = [heading || fields.sectionHeading, text].flatMap(declaredWorkflowDirections);
    const stockCompanion = context.documentCodes.length > 0 && !directions.length
      && stockScopeMatches(context, scopeText, heading)
      && matchesWorkflowDirection(context, declaredWorkflowDirections(fullBody(fields)));
    if (stockCompanion) facets.unshift('workflow');
    // Explicit source syntax establishes a workflow independently of prose
    // vocabulary. This also gives code-only requests a substantive facet.
    if (directions.length) facets.unshift('workflow');
    // Ownership alone does not make an opposite or unspecified process qualify
    // for an ordered document-code request. Keep or omit the complete unit,
    // including when its qualifications also match another requested facet.
    if ((directions.length || facets.includes('workflow'))
        && !stockCompanion && !matchesWorkflowDirection(context, directions)) return [];
    if (context.facets.includes('overview') && !facets.length && !/^#{1,6}\s/.test(text)) facets.push('overview');
    const fieldMatch = context.fieldNames.some(name => mentions(text, name));
    if (fieldMatch) facets.push('fields');
    const requested = context.facets.filter(facet => facets.includes(facet)
      && (facet !== 'fields' || !context.fieldNames.length || fieldMatch));
    if (context.facets.length && !requested.length) return [];
    return (requested.length ? requested : [facets[0] || 'overview'])
      .map(facet => {
        const unit = { text: qualifiers ? `${text}\n\n${qualifiers}` : text, facet };
        // Request-qualified companion scope is not direct arrow evidence. Keep
        // this private eligibility result bound to the complete selected unit.
        Object.defineProperty(unit, 'workflowScope', { value: { stockCompanion } });
        return unit;
      });
  });
}

function stockScopeMatches(context, text, heading) {
  // Inspect only this section's actual stock assertions, not the repeated
  // document preamble or incidental mentions in another clause. Every effect
  // kept in this whole unit must have a compatible explicit document subject
  // or an unambiguous local heading scope. Never trim a conflicting qualifier.
  const requested = new Set(context.documentCodes);
  const stock = /\b(?:stan magazynow\w*|ruch magazynow\w*|skutek magazynow\w*)\b/;
  const headings = [{ level: 0, codes: parseOwaQuestion(heading).documentCodes }];
  let assertions = 0;
  for (const line of text.split(/\r?\n/)) {
    const localHeading = /^\s{0,3}(#{1,6})[ \t]+(.+?)\s*$/.exec(line);
    if (localHeading) {
      const level = localHeading[1].length;
      while (headings.length && headings.at(-1).level >= level) headings.pop();
      headings.push({ level, codes: parseOwaQuestion(localHeading[2]).documentCodes });
      continue;
    }
    for (const clause of line.split(/;|(?<=[.!?])\s+/).filter(clause => stock.test(normalize(clause)))) {
      assertions++;
      // A no-code subsection inherits its nearest code-bearing ancestor, not
      // a sibling or a more distant outer scope overridden by a nested code.
      const headingCodes = headings.findLast(scope => scope.codes.length)?.codes || [];
      const codes = parseOwaQuestion(clause).documentCodes;
      if (headingCodes.some(code => !requested.has(code))
          || (codes.length ? codes.some(code => !requested.has(code)) : !headingCodes.length)) return false;
    }
  }
  return assertions > 0;
}

function declaredWorkflowDirections(value) {
  // Only an explicit arrow connects codes. Plain lists, co-occurrence, prose
  // facet labels and opaque IDs cannot supply a directed process. Validate
  // whole Unicode tokens against the shared vocabulary; never guess a code.
  return owaDocumentPaths(value).flatMap(path => path.reduce((runs, code) => {
    if (DOCUMENT_CODES.has(normalize(code))) runs.at(-1).push(code);
    else runs.push([]);
    return runs;
  }, [[]])).filter(path => path.length > 1);
}

function matchesWorkflowDirection(context, directions) {
  if (!context.documentPaths?.length && !context.documentCodes.length) return true;
  // Match a contiguous declared path, not a sequence assembled from separate
  // lists/paragraphs or unrelated process pairs in the same source.
  const paths = context.documentPaths?.length ? context.documentPaths : [context.documentCodes];
  return paths.every(path => directions.some(codes => codes.some((_, start) =>
    path.every((code, index) => codes[start + index] === code))));
}

function workflowMatches(context, fields) {
  return matchesWorkflowDirection(context,
    [fields.workflowName, fullBody(fields)].flatMap(declaredWorkflowDirections));
}

/** Two-pass selection from already parsed, permitted OWA records only.
 * Candidates retain input row identity/locators. Metadata is request-local and
 * must be attached non-enumerably by callers, never serialized as source facts.
 * @returns {{ownerIds: string[], identityMatches: object[], missing: boolean,
 *   candidates: object[], metadata: Map<object, {ownerIds: string[], facets: string[], units: object[]}>}}
 */
export function selectOwaEvidence(context, rows) {
  const permitted = rows.filter(row => row.namespace === OWA);
  const entities = permitted.filter(row => kind(row) === 'ontology_entity');
  // Process record identities are literal metadata, separate from entity owners.
  // No derived OWAOntology.<id> aliases or prefix/body matching.
  const processMatches = permitted.filter(row => kind(row) === 'workflow_pattern').flatMap(row =>
    ['id', 'ontologyId', 'canonicalName'].map(key => row.fields[key]).filter(value => value
      && new RegExp(`(?<![\\p{L}\\p{N}_.:-])${escape(value)}(?![\\p{L}\\p{N}_:-]|\\.[\\p{L}\\p{N}_])`, 'u').test(context.question))
      .map(value => ({ row, value })));
  const processIdentities = new Set(processMatches.map(match => match.value));
  // Remove recognized opaque identity mentions before deriving field obligations.
  // Explicit mapping prose and separately named fields remain in this context.
  let effectiveQuestion = context.question;
  for (const identity of processIdentities) effectiveQuestion = effectiveQuestion.replace(
    new RegExp(`(?<![\\p{L}\\p{N}_.:-])${escape(identity)}(?![\\p{L}\\p{N}_:-]|\\.[\\p{L}\\p{N}_])`, 'gu'),
    match => ' '.repeat(match.length));
  const effective = processIdentities.size ? parseOwaQuestion(effectiveQuestion) : context;
  context = { ...context, fieldNames: effective.fieldNames, facets: [...effective.facets] };
  if ((processIdentities.size || context.documentPaths?.length) && !context.facets.includes('workflow')) context.facets.push('workflow');
  const ownerContext = { ...context, qualifiedIds: context.qualifiedIds.filter(id => !processIdentities.has(id)),
    fieldNames: context.fieldNames.filter(name => !processIdentities.has(name)) };
  const resolution = resolveOwaOwners(ownerContext, permitted);
  const processIds = new Set(processMatches.map(match => match.row.fields.id));
  const unresolved = ownerContext.qualifiedIds.length && resolution.missing;
  if (processIds.size && !unresolved) resolution.missing = false;
  const metadata = new Map();
  const result = { ...resolution, processIds: [...processIds], candidates: [], metadata };
  Object.defineProperty(result, 'effectiveContext', { value: context });
  Object.defineProperty(result, 'ambiguities', { value: resolution.ambiguities });
  // Includes the resolver's mixed known/unknown qualified-ID barrier.
  if (unresolved) return result;
  // Eligibility uses the same explicit direction grammar as source units; a
  // directed request does not need an additional workflow/proces keyword.
  const workflowRequested = context.facets.includes('workflow')
    || declaredWorkflowDirections(context.question).length > 0;
  const references = new Map();
  for (const { fields } of entities) {
    for (const ref of [fields.id, fields.ontologyId].filter(Boolean)) {
      const owners = references.get(ref) || [];
      references.set(ref, [...new Set([...owners, fields.id])]);
    }
  }
  const requested = new Set(resolution.ownerIds);
  const ownersFor = ref => (references.get(ref) || []).filter(owner => requested.has(owner));
  const allOwnersFor = ref => references.get(ref) || [];
  const requestedTypes = [];
  if (/\b(?:fk|foreign key)\b/.test(context.normalizedQuestion)) requestedTypes.push('fk');
  if (/\b(?:logiczn\w*|logical)\b/.test(context.normalizedQuestion)) requestedTypes.push('logical');
  const predicates = [...new Set(permitted.filter(row => kind(row) === 'ontology_relation')
    .map(row => row.fields.predicate).filter(value => mentions(context.question, value)))];

  for (const row of permitted) {
    const fields = row.fields || {};
    const type = kind(row);
    let owners = [], selected = false;
    if (type === 'ontology_entity') {
      owners = requested.has(fields.id) ? [fields.id] : [];
      selected = owners.length > 0;
    } else if (type === 'chunk') {
      owners = ownersFor(fields.sourceDocumentRefId);
      selected = owners.length > 0;
    } else if (type === 'ontology_field') {
      owners = ownersFor(fields.entityRefId);
      selected = owners.length > 0 && context.facets.some(facet => ['fields', 'identifiers'].includes(facet))
        && (!context.fieldNames.length || context.fieldNames.some(name =>
          owners.some(ownerId => matchesOwaField(name, fields, entities.find(row => row.fields.id === ownerId)?.fields))));
    } else if (type === 'ontology_relation' || type === 'workflow_pattern') {
      const source = ownersFor(fields.sourceEntityRefId), target = ownersFor(fields.targetEntityRefId);
      owners = [...new Set([...source, ...target])];
      const endpointsMatch = requested.size > 1 ? source.length > 0 && target.length > 0
        && owners.length > 1 : owners.length > 0;
      // A dangling end is not an alternative spelling of a requested entity.
      const knownEnds = (!fields.sourceEntityRefId || allOwnersFor(fields.sourceEntityRefId).length > 0)
        && (!fields.targetEntityRefId || allOwnersFor(fields.targetEntityRefId).length > 0);
      if (type === 'ontology_relation') {
        const relationType = normalize(fields.relationType);
        selected = endpointsMatch && context.facets.some(facet => ['relations', 'cardinality'].includes(facet))
          && (!requestedTypes.length || requestedTypes.some(value => value === 'fk'
            ? relationType === 'fk' || relationType === 'foreign key' : /logiczn|logical/.test(relationType)))
          && (!predicates.length || predicates.includes(fields.predicate));
      } else {
        selected = workflowMatches(context, fields) && (processIds.size ? processIds.has(fields.id)
          : workflowRequested && knownEnds && (requested.size ? endpointsMatch : context.documentCodes.length > 0));
      }
    }
    if (!selected) continue;
    const units = owaUnitsForRow(context, row);
    if (type === 'chunk' && !units.length) continue;
    result.candidates.push(row);
    metadata.set(row, { ownerIds: owners, facets: [...new Set(units.map(unit => unit.facet))], units });
  }
  if (!requested.size && result.candidates.length) result.missing = false;
  return result;
}

// These clauses are for attribution only: presentation still emits the original
// atomic unit, with all its rows, conditions and qualifications intact.
function attributionClauses(text) {
  return String(text).split(/\r?\n/).flatMap(line => /^\s*\|/.test(line) ? [line]
    : line.split(/;|(?<=[.!?])\s+|(?:,\s*|\s+(?:and|oraz|i)\s+)(?=[`"']?[\p{L}_][\p{L}\p{N}_.]*[`"']?\s*(?::|(?:is|jest)\b))/iu))
    .map(clause => clause.trim()).filter(Boolean);
}

function ownerScopes(selection) {
  return (selection?.ownerIds || []).map(ownerId => {
    const fields = selection.candidates?.find(row => kind(row) === 'ontology_entity' && row.fields.id === ownerId)?.fields || {};
    let aliases = fields.aliases || [];
    if (typeof aliases === 'string') {
      try { aliases = JSON.parse(aliases); } catch { aliases = aliases.split(/[;,|\n]/); }
    }
    const labels = [...new Set([ownerId, fields.ontologyId, fields.canonicalName, fields.name, fields.mainTable,
      ...(Array.isArray(aliases) ? aliases : [])].filter(value => typeof value === 'string' && value.trim()))];
    for (const name of [fields.canonicalName, fields.name].filter(Boolean)) {
      const base = /^([^()]+?)\s*\([^()]+\)$/.exec(name)?.[1]?.trim();
      if (base && !labels.includes(base)) labels.push(base);
    }
    // Table identity is accepted only from explicit entity-owned table metadata,
    // not arbitrary mentions in a description, JOIN target or another source.
    const bodies = [fullBody(fields), ...(selection.candidates || []).filter(row => kind(row) === 'chunk'
      && row.fields.sourceDocumentRefId === ownerId).map(row => fullBody(row.fields))];
    const declaredTables = bodies.flatMap(body => {
      const tableSection = /(?:^|\n)## Tabele MSSQL\n([\s\S]*?)(?=\n## |$)/.exec(body)?.[1] || '';
      return [...[...tableSection.matchAll(/^\s*-\s*`((?:CDN|dbo)\.[\w]+)`/gm)].map(m => m[1]),
        ...[...body.matchAll(/^\s*-\s*\*\*Tabela g[łl][oó]wna\*\*:\s*`((?:CDN|dbo)\.[\w]+)`/gmi)].map(m => m[1])];
    });
    const tables = [...new Set([fields.mainTable, ...declaredTables].filter(Boolean)
      .flatMap(table => [table, table.split('.').at(-1)]))];
    return { ownerId, label: fields.canonicalName || fields.name || ownerId, labels, tables };
  });
}

function visibleOwnerIds(unit, owners, text = unit.text) {
  if (Array.isArray(unit.owa?.ownerIds)) return unit.owa.ownerIds.filter(id => owners.some(owner => owner.ownerId === id));
  const matched = owners.filter(owner => owner.labels.some(label =>
    !owners.some(other => other !== owner && other.labels.some(value => normalize(value) === normalize(label)))
    && new RegExp(`(?<![\\p{L}\\p{N}_.:-])${escape(normalize(label))}(?![\\p{L}\\p{N}_-]|[.:][\\p{L}\\p{N}_])`, 'u')
      .test(normalize(text)))).map(owner => owner.ownerId);
  // The original bare-unit API is preselected for a single owner. Never extend
  // that implicit single-scope contract to multi-owner or namespace-tagged units.
  return matched.length ? matched : !unit.namespace && !unit.owa && owners.length === 1 ? [owners[0].ownerId] : [];
}

function visibleProcessIds(unit, selection) {
  // Only the actual emitted/omitted unit's bound workflow row establishes process
  // identity. A selected row, source record inventory or lexical mention cannot.
  const row = unit.owa?.row;
  return (!unit.namespace || unit.namespace === OWA) && row?.namespace === OWA
    && kind(row) === 'workflow_pattern' && selection?.candidates?.includes(row)
    && selection.processIds?.includes(row.fields.id) ? [row.fields.id] : [];
}

function clauseFields(unit, clause, context, selection) {
  const declared = unit.owa?.row?.fields || {};
  const fieldRow = kind(unit.owa?.row || {}) === 'ontology_field';
  const knownFields = [...context.fieldNames, ...(selection?.candidates || []).filter(row => kind(row) === 'ontology_field')
    .flatMap(row => ['fieldName', 'mssqlColumn', 'mcpField'].map(key => row.fields[key]))];
  const label = /^\s*[-*]?\s*[`"']?([\p{L}_][\p{L}\p{N}_.]*)[`"']?\s*:/u.exec(clause)?.[1];
  const ownerLabel = ownerScopes(selection).some(owner => owner.labels.some(value => normalize(value) === normalize(label)));
  const fields = [...new Set([...knownFields.filter(name => name && mentions(clause, name)),
    ...(clause.match(/(?<![\p{L}\p{N}])[\p{L}][\p{L}\p{N}]*_[\p{L}\p{N}_]+/gu) || []),
    ...(label && !ownerLabel && !/^(?:unknown|conflict|status|mappingstatus|verificationstatus|confidencelevel)$/i.test(label) ? [label] : [])])];
  const declaredFields = fieldRow ? ['fieldName', 'mssqlColumn', 'mcpField'].map(key => declared[key])
    .filter(name => name && mentions(unit.text, name)) : [];
  if (!fields.length || fields.some(field => declaredFields.some(name => normalize(name) === normalize(field)))) {
    for (const field of declaredFields) if (!fields.includes(field)) fields.push(field);
  }
  return fields;
}

function sourceMarkers(clause) {
  const text = normalize(clause);
  if (/^#{1,6}\s+(?:otwarte problemy(?: i konflikty)?|braki(?: i konflikty)?)\s*$/.test(text)) return [];
  // Only a complete category-annotation statement is neutral. A checked field
  // assertion remains substantive even when its follow-up says it was marked.
  const checked = /^[-*]\s*\[x\]\s*(.+)$/.exec(text)?.[1];
  if (checked && (/^(?:konflikty i braki|braki i konflikty)\s+(?:(?:sa|zostaly)\s+)?oznaczone[.!]?$/.test(checked)
      || /^(?:conflicts and gaps|gaps and conflicts)\s+(?:(?:are|were|have been)\s+)?(?:marked|tagged|labelled)[.!]?$/.test(checked))) return [];
  if (/^(?:(?:termin|slowo|znacznik|etykieta|token|term|keyword|status|wartosc|value|label)\s+)?[`"']?(?:unknown|conflict|ambiguous)[`"']?\s+(?:oznacza|means)\b/u.test(text)) return [];
  // CONFIRMED is scanned only to delimit the operand of a negation, never to
  // verify a claim. Negation cannot jump over a status or a positive contrast.
  let previousEnd = 0, previousNegated = false;
  const types = [];
  for (const match of text.matchAll(/\b(?:confirmed|unknown|do potwierdzenia|niezweryfikowan\w*|conflicts?|konflikt\w*|niejednoznaczn\w*|ambiguous)\b/g)) {
    const between = text.slice(previousEnd, match.index);
    const prefix = between.split(/\b(?:but|however|yet|ale|lecz|jednak|natomiast)\b/u).at(-1);
    const negated = !/\b(?:not only|nie tylko)\s*$/u.test(prefix)
      && (/\b(?:brak|bez|nie|nie ma|nie wykryto|nie stwierdzono|no|without|not|neither)(?:\s+[\p{L}\p{N}_-]+){0,3}\s*$/u.test(prefix)
        || previousNegated && /^\s*(?:or|nor|ani|lub)\s*$/u.test(between));
    previousEnd = match.index + match[0].length;
    previousNegated = negated;
    if (!negated && match[0] !== 'confirmed') types.push(/^(?:conflict|konflikt|niejednoznaczn|ambiguous)/.test(match[0]) ? 'ambiguous' : 'unknown');
  }
  return [...new Set(types)];
}

// Only mapping, enum/uncertainty and named-price facts bind a requested field.
// Identifiers, roles, relations/cardinality, workflow and status clarification
// describe the selected entity/document scope independently of a mapping name.
// Coverage, observation matching and omission association share this policy.
function facetBindsRequestedField(facet) {
  return ['fields', 'unknownEnums', 'prices'].includes(facet);
}

// One representation drives sufficiency, field limitations and omission scope.
// A clause retains its selected owner, its actual fields, and its own facets;
// a named field from another owner/row cannot fill a requested cell.
function scopeObservations(context, selection, units, owners = ownerScopes(selection)) {
  return units.flatMap(unit => {
    const ids = visibleOwnerIds(unit, owners);
    const processIds = visibleProcessIds(unit, selection);
    if (owners.length && !ids.length && !processIds.length) return [];
    const boundUnit = (!unit.namespace || unit.namespace === OWA)
      && selection?.metadata?.get(unit.owa?.row)?.units.find(selected => selected.text === unit.text);
    const workflowScope = {
      pathEvidence: matchesWorkflowDirection(context, declaredWorkflowDirections(unit.text)),
      stockCompanion: Boolean(boundUnit?.workflowScope?.stockCompanion),
    };
    const clauses = attributionClauses(unit.text);
    const structured = ['ontology_field', 'ontology_relation', 'workflow_pattern'].includes(kind(unit.owa?.row || {}));
    const declared = unit.facets || (unit.facet ? [unit.facet] : []);
    const headings = [];
    return clauses.map(text => {
      const heading = /^(#{1,6})\s+(.+)$/u.exec(text);
      if (heading) {
        while (headings.length && headings.at(-1).level >= heading[1].length) headings.pop();
        headings.push({ level: heading[1].length, facets: [...sectionFacets(heading[2]),
          ...(declaredWorkflowDirections(heading[2]).length ? ['workflow'] : [])],
          fieldNames: clauseFields(unit, heading[2], context, selection) });
      }
      const explicitFields = clauseFields(unit, text, context, selection);
      const fieldNames = [...(explicitFields.length ? explicitFields : headings.at(-1)?.fieldNames || [])];
      // Section annotations can describe several nested topics. For a named
      // field, inherit only its CURRENT heading scope (or a structural row),
      // never facets from a later or unrelated subsection in the same unit.
      const inherited = declared.filter(facet => !facetBindsRequestedField(facet)
        || !context.fieldNames.length || structured || clauses.length === 1);
      const ownerIds = unit.owa || ids.length <= 1 ? ids : visibleOwnerIds(unit, owners, text);
      // Coverage uses the same table/reference binding as selection. Only a
      // visible declaration for this owner/column may supply its qualified name.
      for (const name of context.fieldNames) for (const row of selection?.candidates || []) {
        if (kind(row) !== 'ontology_field') continue;
        const owner = selection.candidates.find(entity => kind(entity) === 'ontology_entity'
          && [entity.fields.id, entity.fields.ontologyId].includes(row.fields.entityRefId));
        if (!owner || !ownerIds.includes(owner.fields.id) || !matchesOwaField(name, row.fields, owner.fields)) continue;
        if (['fieldName', 'mssqlColumn', 'mcpField'].some(key => row.fields[key]
            && fieldNames.some(field => normalize(field) === normalize(row.fields[key]))) && !fieldNames.includes(name)) fieldNames.push(name);
      }
      const jointOwnerIds = [...new Set([...ownerIds, ...owners.filter(owner => owner.tables.some(table =>
        !owners.some(other => other !== owner && other.tables.some(value => normalize(value) === normalize(table)))
        && mentions(text, table))).map(owner => owner.ownerId)])];
      return { unit, text, ownerIds, jointOwnerIds, fieldNames, processIds,
        workflowScope,
        facets: [...new Set([...inherited.filter(facet => facet !== 'unknownEnums'),
          ...headings.flatMap(scope => scope.facets), ...sectionFacets(text),
          ...(context.fieldNames.some(name => fieldNames.some(field => normalize(name) === normalize(field))) ? ['fields'] : [])])] };
    });
  });
}

const jointFacets = new Set(['relations', 'cardinality', 'workflow']);
function observationMatches(requirement, observation, owners, purpose = 'coverage') {
  if (requirement.processId) return observation.processIds.includes(requirement.processId)
    && observation.facets.includes(requirement.facet) && observation.workflowScope.pathEvidence;
  const ids = jointFacets.has(requirement.facet) ? observation.jointOwnerIds : observation.ownerIds;
  return (!requirement.ownerId || ids.includes(requirement.ownerId))
    && (!facetBindsRequestedField(requirement.facet) || !requirement.fieldName
      || observation.fieldNames.some(field => normalize(field) === normalize(requirement.fieldName)))
    && requirement.facet !== 'statusAmbiguity' && observation.facets.includes(requirement.facet)
    // Coverage/omission matching still needs a visible directed unit. Only a
    // limitation may inherit the validated companion scope of its selected row.
    && (requirement.facet !== 'workflow' || observation.workflowScope.pathEvidence
      || purpose === 'limitation' && observation.workflowScope.stockCompanion)
    && (!jointFacets.has(requirement.facet) || owners.every(owner => ids.includes(owner.ownerId)));
}

/** Assess only units the public renderer actually emits. Selection establishes
 * requested identity, never visibility or the absence of facts in the corpus.
 * @param {import('./owa_query_context.mjs').Context} context
 * @param {ReturnType<typeof selectOwaEvidence> | null} selection
 * @param {Array<{text: string, facet?: string, facets?: string[], artifact?: string, recordId?: string, namespace?: string, owa?: object}>} visibleUnits
 * @returns {{status: 'covered'|'partial'|'unknown'|'ambiguous', requestedFacets: string[], coveredFacets: string[], missingFacets: string[], reasons: string[], notices: string[],
 *   ownerCoverage: Array<{ownerId:string, label:string, coveredFacets:string[], missingFacets:string[], visible:boolean, fieldCoverage:object[]}>,
 *   limitations: Array<{type:string, fieldNames:string[], relevant:boolean, artifact:string|null, recordId:string|null}>,
 *   requirements: Array<{ownerId:string|null, fieldName:string|null, facet:string, covered:boolean}>}}
 */
export function assessOwaCoverage(context, selection, visibleUnits) {
  context = selection?.effectiveContext || context;
  const requestedFacets = [...context.facets];
  const owners = ownerScopes(selection);
  const units = visibleUnits.filter(unit => unit.text?.trim()
    && (!owners.length || visibleOwnerIds(unit, owners).length || visibleProcessIds(unit, selection).length));
  const observations = scopeObservations(context, selection, units, owners);
  const fieldFacets = requestedFacets.filter(facetBindsRequestedField);
  const requirements = (owners.length ? owners.map(owner => owner.ownerId) : [null]).flatMap(ownerId =>
    requestedFacets.filter(facet => owners.length || facet !== 'workflow' || !selection?.processIds?.length)
      .flatMap(facet => (context.fieldNames.length && facetBindsRequestedField(facet)
      ? context.fieldNames : [null]).map(fieldName => {
      const requirement = { ownerId, fieldName, facet };
      return { ...requirement, covered: observations.some(observation => observationMatches(requirement, observation, owners)) };
    })));
  for (const processId of selection?.processIds || []) {
    const requirement = { ownerId: null, fieldName: null, processId, facet: 'workflow' };
    requirements.push({ ...requirement, covered: observations.some(observation => observationMatches(requirement, observation, owners)) });
  }
  const processCoverage = (selection?.processIds || []).map(processId => ({ processId,
    visible: observations.some(observation => observation.processIds.includes(processId)),
    covered: requirements.some(req => req.processId === processId && req.covered) }));
  const coveredFor = (ownerId, fieldName = null) => requestedFacets.filter(facet => {
    const cells = requirements.filter(req => req.ownerId === ownerId && req.facet === facet && (!fieldName || req.fieldName === fieldName));
    return cells.length && cells.every(req => req.covered);
  });
  const ownerCoverage = owners.map(({ ownerId, label }) => {
    const covered = coveredFor(ownerId);
    return { ownerId, label, coveredFacets: covered, missingFacets: requestedFacets.filter(facet => !covered.includes(facet)),
      visible: observations.some(observation => observation.ownerIds.includes(ownerId)
        || requestedFacets.some(facet => jointFacets.has(facet) && observation.facets.includes(facet) && observation.jointOwnerIds.includes(ownerId))),
      fieldCoverage: context.fieldNames.map(fieldName => ({ fieldName, coveredFacets: coveredFor(ownerId, fieldName),
        missingFacets: fieldFacets.filter(facet => !coveredFor(ownerId, fieldName).includes(facet)) })) };
  });
  const coveredFacets = requestedFacets.filter(facet => requirements.filter(req => req.facet === facet).every(req => req.covered));
  const missingFacets = requestedFacets.filter(facet => !coveredFacets.includes(facet));
  const reasons = [], notices = [], limitations = [];
  let status = missingFacets.length || ownerCoverage.some(owner => !owner.visible) ? 'partial' : 'covered';
  const result = () => ({ status, requestedFacets, coveredFacets, missingFacets, ownerCoverage, limitations, requirements,
    ...(processCoverage.length ? { processCoverage } : {}),
    reasons: [...new Set(reasons)], notices: [...new Set(notices)] });
  if (context.qualifiedIds.length && selection?.missing) {
    status = 'unknown';
    reasons.push('requested_identity_not_found');
    notices.push(`Nie znaleziono dowodów dla wszystkich żądanych identyfikatorów (${context.qualifiedIds.join(', ')}) w przeszukanych lokalnych źródłach. Nie zastępuję ich inną encją ani procesem; nie jest to dowód nieistnienia w ERP.`);
    coveredFacets.length = 0;
    missingFacets.splice(0, missingFacets.length, ...requestedFacets);
    for (const requirement of requirements) requirement.covered = false;
    for (const owner of ownerCoverage) {
      owner.coveredFacets = [];
      owner.missingFacets = [...requestedFacets];
      for (const field of owner.fieldCoverage) { field.coveredFacets = []; field.missingFacets = [...fieldFacets]; }
    }
    return result();
  }
  if (selection?.ambiguities?.length) {
    status = 'ambiguous';
    reasons.push('ambiguous_owner');
    notices.push(`Dopasowanie nazwy ma równorzędnych właścicieli: ${selection.ambiguities.map(owners => owners.join(' / ')).join('; ')}. Doprecyzuj identyfikator encji.`);
  }
  if (requestedFacets.includes('statusAmbiguity')) {
    status = 'ambiguous';
    reasons.push('unspecified_document_status');
    notices.push('Doprecyzuj typ dokumentu i oś stanu, o którą pytasz. Sam ogólny „stan dokumentu” nie ustala zakresu żądanej informacji.');
  }
  if (requestedFacets.includes('workflow')) notices.push('Opis workflow w lokalnych źródłach nie jest dowodem wykonania operacji, wywołania endpointów ani potwierdzeniem ich skutków w bieżącym ERP.');
  for (const process of processCoverage.filter(process => !process.covered)) {
    reasons.push('missing_requested_process_evidence');
    notices.push(`Dla procesu ${process.processId} nie pokazano dowodów żądanego zakresu. Inny proces ani lista rekordów źródła nie zastępuje tej tożsamości; nie przesądza to o pełnej zawartości lokalnych źródeł.`);
  }
  if (context.documentPaths?.length && missingFacets.includes('workflow')) {
    reasons.push('requested_path_not_shown');
    notices.push(`W pokazanych dowodach brak pokrycia całej żądanej ścieżki: ${context.documentPaths.map(path => path.join(' → ')).join('; ')}. Nie pomijam nieznanych kroków ani nie łączę odcinków przez lukę.`);
  }
  for (const observation of observations) {
    const { unit, fieldNames: fields } = observation;
    for (const type of sourceMarkers(observation.text)) {
      // A process-level limitation remains relevant to an independently
      // requested workflow even when its status field differs from the mapping
      // field. A broad unnamed limitation may qualify a named field scope, but
      // cannot supply the missing named-field evidence used for coverage.
      const relevant = !requirements.length || requirements.some(requirement => observationMatches(
        fields.length ? requirement : { ...requirement, fieldName: null }, observation, owners, 'limitation'));
      const scope = (fields.length ? fields : observation.facets).join(', ') || 'pokazany fragment';
      const locator = [unit.artifact, unit.recordId].filter(Boolean).join(', ') || 'pokazany fragment';
      limitations.push({ type, fieldNames: fields, relevant, artifact: unit.artifact || null, recordId: unit.recordId || null });
      if (type === 'unknown') {
        if (relevant) {
          if (status !== 'ambiguous') status = 'unknown';
          reasons.push('source_explicit_unknown');
        }
        notices.push(`Źródło (${locator}) oznacza zakres „${scope}” jako UNKNOWN / do potwierdzenia; pokazany fragment nie potwierdza kompletnej wiedzy w tym zakresie.`);
      } else {
        if (relevant) {
          status = 'ambiguous';
          reasons.push('source_explicit_ambiguity');
        }
        notices.push(`Źródło (${locator}) wskazuje konflikt lub niejednoznaczność w zakresie „${scope}”. Pokazany fragment wymaga wyjaśnienia przed rozstrzygnięciem.`);
      }
    }
  }
  const missing = missingFacets.filter(facet => facet !== 'statusAmbiguity');
  if (context.facets.includes('fields') && /\bmapowani\w* pol\b/.test(context.normalizedQuestion)
      && !units.some(unit => kind(unit.owa?.row || {}) === 'ontology_field'
        || /\b(?:kolumna mssql|mssqlcolumn|mapowani\w* pol|pola i mapowani\w*)\b/.test(normalize(unit.text)))) {
    notices.push('W pokazanych fragmentach nie przedstawiono pełnego mapowania pól. Wskazanie tabeli źródłowej nie zastępuje mapowania; ten wniosek dotyczy tylko pokazanej treści, nie całej bazy ani ERP.');
  }
  for (const owner of ownerCoverage) {
    const absent = owner.missingFacets.filter(facet => facet !== 'statusAmbiguity');
    if (absent.length) notices.push(`Dla ${owner.label} (${owner.ownerId}) w pokazanych fragmentach brak pokrycia: ${absent.join(', ')}. To nie przesądza o zawartości pełnych źródeł.`);
    if (owners.length > 1 && owner.coveredFacets.length) notices.push(`Pokazane dowody dla ${owner.label} (${owner.ownerId}) obejmują: ${owner.coveredFacets.join(', ')}; są to nadal nieweryfikowane twierdzenia źródłowe.`);
    if (!owner.visible) {
      reasons.push('missing_requested_owner_evidence');
      notices.push(`Dla ${owner.label} (${owner.ownerId}) nie pokazano dowodów żądanego zakresu. Nie zastępują ich fragmenty innego właściciela.`);
    }
    for (const field of owner.fieldCoverage.filter(field => field.missingFacets.length)) {
      notices.push(`Dla ${owner.label} (${owner.ownerId}), żądane pole ${field.fieldName}: w pokazanych dowodach brak pokrycia ${field.missingFacets.join(', ')}. Inne pola lub inny właściciel nie zastępują tego mapowania.`);
    }
  }
  if (missing.length) {
    reasons.push('missing_requested_facets');
    notices.push(`W pokazanych fragmentach brak pokrycia żądanych aspektów: ${missing.join(', ')}. To nie przesądza o braku tych informacji w kompletnym źródle ani w całej bazie.`);
  }
  if (!units.length) {
    if (status !== 'ambiguous') status = 'unknown';
    reasons.push('no_visible_evidence');
    notices.push('W tej odpowiedzi nie pokazano lokalnych dowodów dla żądanego zakresu. Nie przesądza to o zawartości całej bazy.');
  }
  const missingFields = [...new Set(requirements.filter(req => req.fieldName && !req.covered).map(req => req.fieldName))];
  if (missingFields.length) {
    if (status === 'covered') status = 'partial';
    reasons.push('requested_field_not_shown');
    notices.push(`W pokazanych fragmentach brak żądanego pokrycia nazw w ich zakresie właściciela i aspektu: ${missingFields.join(', ')}. Nie zastępuje go ogólny opis innych pól; nie przesądza to o pełnej zawartości źródeł.`);
  }
  return result();
}

/** Associate omitted units with already-missing request cells. Their text is
 * used only for scope association, never added to displayed evidence coverage. */
export function reconcileOwaOmissions(context, selection, coverage, omissions) {
  context = selection?.effectiveContext || context;
  const owners = ownerScopes(selection);
  return omissions.map(omission => {
    const observations = omission.owaUnit ? scopeObservations(context, selection, [omission.owaUnit], owners) : null;
    const uncoveredRequirements = coverage.requirements.filter(req => !req.covered
      && (omission.missingFacets || []).includes(req.facet)
      && (observations ? observations.some(observation => observationMatches(req, observation, owners))
        : req.processId ? visibleProcessIds({ owa: omission.owa }, selection).includes(req.processId)
          : !omission.owa?.ownerIds?.length || !req.ownerId || omission.owa.ownerIds.includes(req.ownerId)))
      .map(({ ownerId, fieldName, facet, processId }) => ({ ownerId, fieldName, facet, ...(processId ? { processId } : {}) }));
    return { ...omission, uncoveredRequirements,
      uncoveredFacets: (omission.missingFacets || []).filter(facet => uncoveredRequirements.some(req => req.facet === facet)) };
  });
}
