import { parseOwaQuestion, resolveOwaOwners, matchesOwaField, owaDocumentPaths, owaMetadataMentions } from './owa_query_context.mjs';
import { DOCUMENT_CODES } from './knowledge_retrieval.mjs';
import { selectSemanticEvidence, semanticCoverageRequirements, semanticWorkflowAspects, semanticMaterialFacts } from './semantic_evidence.mjs';

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
  if (semanticMaterialFacts(text).length) facets.push('qualifiers');
  if (/^(?:opis biznesowy|status weryfikacji)$/.test(normalize(heading))) facets.push('overview');
  if (/\b(?:otwarte problemy|braki|niewiadome|ograniczenia wiedzy)\b/.test(normalized)
      || /\b(?:unknown|do potwierdzenia|niezweryfikowan\w*)\b/.test(normalize(text))) facets.push('unknownEnums');
  if (/\b(?:regul\w*|zasad\w*|ograniczen\w*)\b/.test(normalized)) facets.push('workflow', 'rules');
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
  const units = sections(fullBody(fields)).flatMap(({ text, scopeText, heading }) => {
    if (!completeTables(text)) return [];
    const facets = sectionFacets(text, heading || fields.sectionHeading);
    // A source's concrete owned properties can describe an entity even when
    // it has no separate business-definition paragraph. Metadata-only headings
    // and inventories remain distinct from an explanatory source statement.
    if (context.facets.includes('overview') && /\b(?:identifiers|fields|relations)\b/.test(facets.join(' '))
        && !/^(?:status|metadan)/.test(normalize(heading))) facets.push('overview');
    const directions = [heading || fields.sectionHeading, text].flatMap(value => declaredWorkflowDirections(value, context));
    if (context.facets.includes('workflow') && semanticWorkflowAspects(scopeText, directions).length) facets.push('workflow');
    const stockCompanion = context.documentCodes.length > 0 && !directions.length
      && stockScopeMatches(context, scopeText, heading)
      && matchesWorkflowDirection(context, declaredWorkflowDirections(fullBody(fields), context));
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
        Object.defineProperty(unit, 'workflowScope', { value: { stockCompanion, documentPaths: context.documentPaths || [] } });
        return unit;
      });
  });
  const body = String(fullBody(fields)).replace(/\r\n?/g,'\n').trim();
  // A complete bounded chunk is an additional coherent witness when several
  // material obligations share it. Never stitch versions/rows, slice a table,
  // or use this path to admit an opposite/unknown directed workflow.
  if (type === 'chunk' && context.materialPlan && !context.documentPaths?.length && !context.documentCodes.length
      && (context.qualifierClasses?.length >= 2 || context.facets.filter(f=>f!=='overview').length >= 3)
      && body.length <= 4000 && !/(?:\.\.\.|…)\s*$/.test(body) && completeTables(body)) {
    const text = qualifiers ? `${body}\n\n${qualifiers}` : body;
    for (const facet of context.facets) if (!units.some(u=>u.facet===facet&&u.text===text)) units.push({text,facet});
  }
  return units;
}

function stockScopeMatches(context, text, heading) {
  // Inspect only this section's actual stock assertions, not the repeated
  // document preamble or incidental mentions in another clause. Every effect
  // kept in this whole unit must have a compatible explicit document subject
  // or an unambiguous local heading scope. Never trim a conflicting qualifier.
  const requested = new Set(context.documentCodes);
  const scopedCodes = value => parseOwaQuestion(value,{symbols:(context.documentSymbols || []).map(name=>({name}))}).documentCodes;
  const stock = /\b(?:stan magazynow\w*|ruch magazynow\w*|skutek magazynow\w*)\b/;
  const headings = [{ level: 0, codes: scopedCodes(heading) }];
  let assertions = 0;
  for (const line of text.split(/\r?\n/)) {
    const localHeading = /^\s{0,3}(#{1,6})[ \t]+(.+?)\s*$/.exec(line);
    if (localHeading) {
      const level = localHeading[1].length;
      while (headings.length && headings.at(-1).level >= level) headings.pop();
      headings.push({ level, codes: scopedCodes(localHeading[2]) });
      continue;
    }
    for (const clause of line.split(/;|(?<=[.!?])\s+/).filter(clause => stock.test(normalize(clause)))) {
      assertions++;
      // A no-code subsection inherits its nearest code-bearing ancestor, not
      // a sibling or a more distant outer scope overridden by a nested code.
      const headingCodes = headings.findLast(scope => scope.codes.length)?.codes || [];
      const codes = scopedCodes(clause);
      if (headingCodes.some(code => !requested.has(code))
          || (codes.length ? codes.some(code => !requested.has(code)) : !headingCodes.length)) return false;
    }
  }
  return assertions > 0;
}

function declaredWorkflowDirections(value, context = null) {
  // Only an explicit arrow connects codes. Plain lists, co-occurrence, prose
  // facet labels and opaque IDs cannot supply a directed process. Validate
  // whole Unicode tokens against the shared vocabulary; never guess a code.
  return owaDocumentPaths(value).flatMap(path => path.reduce((runs, code) => {
    if (DOCUMENT_CODES.has(normalize(code)) || context?.documentSymbols?.some(symbol => normalize(symbol) === normalize(code))) runs.at(-1).push(code);
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
    [fields.workflowName, fullBody(fields)].flatMap(value => declaredWorkflowDirections(value, context)));
}

/** Two-pass selection from already parsed, permitted OWA records only.
 * Candidates retain input row identity/locators. Metadata is request-local and
 * must be attached non-enumerably by callers, never serialized as source facts.
 * @returns {{ownerIds: string[], identityMatches: object[], missing: boolean,
 *   candidates: object[], metadata: Map<object, {ownerIds: string[], facets: string[], units: object[]}>}}
 */
export function selectOwaEvidence(context, rows, requestPlan = null) {
  if (requestPlan) return selectSemanticEvidence(context, rows, requestPlan, owaUnitsForRow);
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
function attributionClauses(text, qualificationStatement = () => false) {
  return String(text).split(/\r?\n/).flatMap(line => /^\s*\|/.test(line) ? [line]
    : line.split(/;|(?<=[.!?])\s+/).flatMap(part => qualificationStatement(part) ? [part]
      : part.split(/(?:,\s*|\s+(?:and|oraz|i)\s+)(?=[`"']?[\p{L}_][\p{L}\p{N}_.]*[`"']?\s*(?::|(?:is|jest)\b))/iu)))
    .map(clause => clause.trim()).filter(Boolean);
}

function ownerScopes(selection) {
  const entries = selection?.requestPlan ? selection.requestPlan.subjects.filter(s => s.kind !== 'process').map(s => ({ ownerId: s.id, namespace: s.namespace }))
    : (selection?.ownerIds || []).map(ownerId => ({ ownerId }));
  return entries.map(({ ownerId, namespace }) => {
    const identity = selection?.requestPlan?.subjects.find(s=>s.id===ownerId&&s.namespace===namespace)?.catalogIdentity;
    const boundIdentity = identity && selection.candidates.includes(identity.origin) ? identity : null;
    const fields = selection.candidates?.find(row => (!namespace ? kind(row) === 'ontology_entity' : row.namespace === namespace) && row.fields.id === ownerId)?.fields || {};
    let aliases = fields.aliases || [];
    if (typeof aliases === 'string') {
      try { aliases = JSON.parse(aliases); } catch { aliases = aliases.split(/[;,|\n]/); }
    }
    const labels = [...new Set([ownerId, fields.ontologyId, fields.canonicalName, fields.name, namespace ? fields.title : null, fields.mainTable,
      ...(Array.isArray(aliases) ? aliases : []), ...(boundIdentity?.labels.map(l=>l.value) || [])].filter(value => typeof value === 'string' && value.trim()))];
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
    const catalogTables = boundIdentity?.tables.filter(t=>t.origin.namespace===namespace&&selection.candidates.includes(t.origin)).map(t=>t.name) || [];
    const tables = [...new Set([fields.mainTable, ...declaredTables, ...catalogTables].filter(Boolean)
      .flatMap(table => [table, table.split('.').at(-1)]))];
    const documentSymbols = selection?.requestPlan?.subjects.find(s=>s.id===ownerId&&s.namespace===namespace)?.mentions
      .filter(m=>m.kind==='symbol').map(m=>m.value) || [];
    return { ownerId, ...(namespace ? { namespace } : {}), label: fields.canonicalName || fields.name || (namespace && fields.title) || ownerId, labels, tables, documentSymbols };
  });
}

const tableCells = text => /^\s*\|/.test(text) ? text.trim().replace(/^\||\|$/g,'').split(/(?<!\\)\|/).map(c=>c.trim().replace(/^`|`$/g,'')) : null;
const tableSeparator = cells => cells?.every(c=>/^:?-{3,}:?$/.test(c));
function relationTableColumns(cells) {
  const names=cells.map(normalize), index=(...keys)=>names.findIndex(n=>keys.includes(n));
  const source=index('sourceentityrefid','encja zrodlowa','zrodlo','source');
  const target=index('targetentityrefid','encja docelowa','cel','target');
  return source>=0&&target>=0 ? {width:cells.length,source,target,type:index('typ relacji','relationtype'),
    cardinality:index('kardynalnosc','cardinality'),join:index('warunek join','joincondition'),
    qualifications:names.flatMap((name,i)=>['typ relacji','relationtype','status','weryfikacja','verification','ograniczenia weryfikacji','uwagi','qualification','dowod','evidence'].includes(name)?[i]:[])} : null;
}
function declaredEndpoint(text,owner,owners) {
  const labels=owner.labels.filter(label=>!owners.some(other=>other!==owner&&other.labels.some(l=>normalize(l)===normalize(label))));
  return labels.some(label=>owaMetadataMentions(text,label,{inflect:!/[_.:]/.test(label)}).some(span=>
    !/[_.:]/.test(text[span.start-1] || '') && !/^[.:][\p{L}\p{N}_]/u.test(text.slice(span.end))));
}
function endpointOwnerIds(text, owners, namespace) {
  return owners.filter(owner => (!owner.namespace || owner.namespace === namespace)
    && (declaredEndpoint(text,owner,owners) || [...owner.tables,...(owner.documentSymbols || [])].some(table =>
      !owners.some(other => other !== owner && [...other.tables,...(other.documentSymbols || [])].some(value => normalize(value) === normalize(table)))
      && mentions(text,table)))).map(owner => owner.ownerId);
}
function assertedRelationOwners(relation, owners, namespace) {
  const source=endpointOwnerIds(relation.source,owners,namespace), target=endpointOwnerIds(relation.target,owners,namespace);
  const joined=endpointOwnerIds(relation.join || '',owners,namespace);
  // A literal JOIN may independently bind identifier-valued table/components;
  // do not turn their spellings into aliases. Empty, unknown or unresolved ID
  // endpoints and an unbound natural source are not an omitted document owner.
  const component=value=>/^[\p{L}_][\p{L}\p{N}_]*$/u.test(value)
    && !/^(?:unknown|unresolved|null|none)$/i.test(value);
  if (!source.length && !(component(relation.source) && joined.length>1)
      || !target.length && !(component(relation.target) && joined.length>1)) return [];
  return [...new Set([...source,...target,...(!source.length || !target.length ? joined : [])])];
}

const proseRelationPredicate=/\b(?:(?:jest|sa|is|are|moze byc)\s+)?(?:powiazan\w*\s+(?:z|ze)|nalezy\s+do|ma\s+relacj\w*\s+(?:z|ze|do)|zawiera|grupuje|rozlicza\w*|koryguje|laczy)\b\s*/;
function proseRelationBinding(text, owners, inheritedOwnerIds, namespace) {
  const clause=normalize(text).replace(/\*\*/g,'').replace(/^[-*]\s+/,'').trim();
  const predicate=proseRelationPredicate.exec(clause);
  if (!predicate) return null; // a target-only noun/qualifier is not a relationship assertion
  const subject=clause.slice(0,predicate.index).trim().replace(/^[`"']|[`"']$/g,'');
  const deictic=/^(?:ten|ta|to|te|this|these)\s+/.test(subject);
  const name=subject.replace(/^(?:ten|ta|to|te|this|these|kazd\w*|wszystk\w*)\s+/,'');
  const whole=(value,label)=>owaMetadataMentions(value,label,{inflect:!/[_.:]/.test(label)})
    .some(span=>span.start===0&&span.end===value.length);
  const literal=endpointOwnerIds(name,owners,namespace).filter(id=>{
    const owner=owners.find(o=>o.ownerId===id);
    return [...owner.labels,...owner.tables,...(owner.documentSymbols || [])].some(label=>whole(name,label));
  });
  // A short self noun is bound to the declared document owner, never to a
  // longer unknown subject containing it (e.g. another modifier or a preposition).
  const heads=owner=>owner.labels.filter(label=>!/[_.:]/.test(label)).map(label=>label.split(/\s+/)[0]);
  const self=inheritedOwnerIds.filter(id=>{
    const owner=owners.find(o=>o.ownerId===id);
    return owner && (deictic && /^(?:obiekt|encja|dokument|object|entity|document)$/.test(name)
      || heads(owner).some(head=>whole(name,head))
        && !owners.some(other=>other!==owner&&heads(other).some(head=>whole(name,head))));
  });
  const sourceOwnerIds=!subject ? inheritedOwnerIds : literal.length ? literal : self;
  if (!sourceOwnerIds.length) return {sourceOwnerIds:[],targetOwnerIds:[]};
  const target=clause.slice(predicate.index+predicate[0].length).split(/\s*\(|,\s*/)[0];
  return {sourceOwnerIds,targetOwnerIds:endpointOwnerIds(target,owners,namespace)};
}

const qualificationCue=/\b(?:brak formaln\w* fk|formal\w*\s+fk|foreign key|klucz\w*\s+obc\w*|(?:ograniczen\w*\s+)?weryfik\w*|status\s+weryfikac\w*|verificationstatus\s*:|niepotwierdz\w*|niezweryfik\w*|potwierdz\w*|do potwierdzenia)\b/;
const qualificationClaims=text=>new Set([
  ...(/\b(?:formal\w*\s+fk|foreign key|klucz\w*\s+obc\w*)\b/.test(text)?['formalFk']:[]),
  ...(/\b(?:weryfik\w*|potwierdz\w*|niepotwierdz\w*|ograniczen\w*|niezweryfik\w*)\b|brak formaln\w* fk/.test(text)?['verification']:[]),
]);
const qualificationResidue=text=>text.replace(new RegExp(qualificationCue.source,'g'),' ')
  .replace(/\bw\s+(?:schemacie|bazie|mssql)\b/g,' ')
  .replace(/\btylko\s+(?:po|gdy|jesli|przy|pod warunkiem)\b[\s\S]*$/,' ')
  .replace(/\b(?:nie|zostal\w*|jest|sa|byl\w*|pozostaj\w*|wymaga\w*|(?:nie)?ustalon\w*|(?:nie)?znan\w*|unknown|confirmed|draft)\b/g,' ')
  .replace(/[^\p{L}\p{N}_]+/gu,' ').trim();
function qualificationReferents(text, owners, namespace) {
  const ids=endpointOwnerIds(text,owners,namespace),masked=text.split('');
  for(const owner of owners.filter(o=>ids.includes(o.ownerId)))for(const label of [...owner.labels,...owner.tables,...(owner.documentSymbols || [])])
    for(const span of owaMetadataMentions(text,label,{inflect:!/[_.:]/.test(label)}))for(let i=span.start;i<span.end;i++)masked[i]=' ';
  const remainder=masked.join('').replace(/\b(?:i|oraz|a|z|ze|do|and|with|to)\b|[^\p{L}\p{N}_]+/gu,'');
  return ids.length&&!remainder ? ids : null;
}
function relationQualification(text, owners, namespace, assertion=false) {
  const value=normalize(text).replace(/^#{1,6}\s+|^[-*]\s+/,'').trim(),cue=qualificationCue.exec(value);
  if(!cue)return null;
  const references=[],surface=value.split('');
  // Reference operands are parsed independently of where the qualification cue
  // occurs. Unresolved operands stay explicit; they can never fall back to self.
  const introducer=/\b(?:dla(?:\s+relacj[aei])?|(?:po)?miedzy|(?:w\s+)?relacj[aei]|(?:w\s+)?zwiazku|powiazania|dotycz\w*|w odniesieniu do)\s+/g;
  const boundary=/\b(?:nie\s+(?:(?:zostal\w*|jest|sa|byl\w*)\s+)?(?:potwierdz\w*|zweryfik\w*|ustal\w*)|nie\s+(?:zostal\w*|jest|sa|byl\w*)|pozostaj\w*|wymaga\w*|(?:jest|sa|zostal\w*|byl\w*)\s+|niepotwierdz\w*|niezweryfik\w*|do\s+(?:potwierdzenia|weryfikacji)|tylko\b|w\s+(?:schemacie|bazie|mssql)\b)|[:;,—](?=\s|$)|\.(?=\s|$)/;
  for(let match;(match=introducer.exec(value));){
    if(assertion&&match.index<cue.index&&!/^dla\b/.test(match[0]))continue;
    const start=match.index+match[0].length,tail=value.slice(start),stop=boundary.exec(tail),end=start+(stop?.index??tail.length);
    const operand=value.slice(start,end).trim();
    const deictic=/^(?:tej|tej samej|powyzszej|poprzedniej) relacj[aei]$/.test(operand);
    const ids=deictic?null:qualificationReferents(operand,owners,namespace);
    references.push({kind:deictic?'deictic':ids?'named':'unresolved',ids,previous:/^poprzedniej|^powyzszej/.test(operand)});
    for(let i=match.index;i<end;i++)surface[i]=' ';
    introducer.lastIndex=end;
  }
  const statement=!qualificationResidue(surface.join('').slice(0,cue.index));
  let claimText=surface.join('');if(assertion)claimText=claimText.slice(cue.index);
  // Consume the bounded claim grammar, not a list of disallowed entity words.
  // Conditions remain literal proof text, but all explicit references within
  // them have already been parsed above before a condition tail is admitted.
  const residue=qualificationResidue(claimText);
  if(residue){
    const ids=qualificationReferents(residue,owners,namespace);
    references.push({kind:ids?'named':'unresolved',ids});
    if(ids){
      const masked=claimText.split('');
      for(const owner of owners.filter(o=>ids.includes(o.ownerId)))for(const label of [...owner.labels,...owner.tables,...(owner.documentSymbols || [])])
        for(const span of owaMetadataMentions(claimText,label,{inflect:!/[_.:]/.test(label)}))for(let i=span.start;i<span.end;i++)masked[i]=' ';
      claimText=masked.join('');
    }
  }
  const named=references.filter(r=>r.kind==='named'),scope=named[0]?.ids;
  const invalid=references.some(r=>r.kind==='unresolved')||named.some(r=>JSON.stringify([...r.ids].sort())!==JSON.stringify([...scope].sort()));
  return {text,statement,claims:qualificationClaims(claimText),scope:invalid?'unresolved':scope?'named':references.length?'deictic':'implicit',
    ids:scope||[],previous:references.some(r=>r.previous)};
}
function bindRelationQualifications(observations, owners, namespace) {
  const sameHeading=(a,b)=>JSON.stringify(a.headingScope)===JSON.stringify(b.headingScope);
  const assertions=observations.filter(o=>o.relationAssertion);
  const attached=new Map();
  for(const o of observations){
    // Intrinsic row qualifications come from their own named columns, never
    // headers, endpoints, JOINs or another row. Prose stays on its assertion.
    const parts=o.relationRow ? o.relationRow.qualificationCells : o.relationAssertion ? [o.text] : [];
    const intrinsic=parts.map(text=>{
      const count=[...normalize(text).matchAll(new RegExp(proseRelationPredicate.source,'g'))].length;
      if(count>1||o.relationRow&&count)return null;
      const parsed=relationQualification(text,owners,namespace,!o.relationRow);
      if(!parsed||parsed.scope==='unresolved')return null;
      return parsed.scope!=='named'||JSON.stringify([...parsed.ids].sort())===JSON.stringify([...o.relationOwnerIds].sort())?parsed:null;
    }).filter(Boolean);
    o.relationQualificationText=intrinsic.map(q=>q.text).join('\n');
    o.relationQualificationClaims=new Set(intrinsic.flatMap(q=>[...q.claims]));
  }
  for(const q of observations){
    if(q.relationAssertion || q.tableLine)continue;
    const parsed=relationQualification(q.text,owners,namespace);
    if(!parsed||parsed.scope==='unresolved')continue;
    let targets=[];
    if(parsed.scope==='named'){
      targets=assertions.filter(o=>o.relationOwnerIds.length
        && (q.isHeading ? q.headingScope.every((id,i)=>o.headingScope[i]===id) : sameHeading(q,o))
        && JSON.stringify([...o.relationOwnerIds].sort())===JSON.stringify([...parsed.ids].sort()));
    }else if(!q.isHeading){
      const local=assertions.filter(o=>sameHeading(q,o));
      if(local.length===1&&local[0].relationOwnerIds.length&&(!parsed.previous||local[0].index<q.index)){
        const target=local[0],between=observations.slice(Math.min(q.index,target.index)+1,Math.max(q.index,target.index));
        if(between.every(o=>o.tableLine&&!o.relationAssertion || attached.get(o)===target))targets=[target];
      }
    }
    if(targets.length!==1)continue;
    const target=targets[0];attached.set(q,target);
    target.relationQualificationText+='\n'+parsed.text;
    for(const claim of parsed.claims)target.relationQualificationClaims.add(claim);
  }
  return observations;
}

function visibleOwnerIds(unit, owners, text = unit.text) {
  if (Array.isArray(unit.owa?.ownerIds)) return unit.owa.ownerIds.filter(id => owners.some(owner => owner.ownerId === id
    && (!owner.namespace || owner.namespace === unit.owa.row?.namespace)));
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
    ...(label && !ownerLabel && !/^(?:unknown|conflict|status|mappingstatus|verificationstatus|confidencelevel)$/i.test(label)
      && !(selection?.requestPlan && /^(?:pk|fk|pole|kolumna|field)$/i.test(label)) ? [label] : [])])];
  if (selection?.requestPlan) {
    const named = /^\s*(?:[-*]\s*)?(?:PK|FK|Pole|Kolumna|Field)\s*:\s*[`"']?([\p{L}_][\p{L}\p{N}_.]*)/iu.exec(clause)?.[1];
    if (named && !fields.includes(named)) fields.push(named);
  }
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
    // Semantic proof is tied to the complete selected bytes and original row
    // object. Catalog entries and source inventories are never visible proof.
    if (selection?.requestPlan && (unit.namespace && unit.namespace !== unit.owa?.row?.namespace
        || !selection.metadata.get(unit.owa?.row)?.units.some(u => u.text === unit.text))) return [];
    const ids = visibleOwnerIds(unit, owners);
    const processIds = visibleProcessIds(unit, selection);
    if (owners.length && !ids.length && !processIds.length) return [];
    const boundUnit = (!unit.namespace || unit.namespace === OWA || selection?.requestPlan)
      && selection?.metadata?.get(unit.owa?.row)?.units.find(selected => selected.text === unit.text);
    const workflowScope = {
      pathEvidence: matchesWorkflowDirection(context, declaredWorkflowDirections(unit.text, context)),
      directions: declaredWorkflowDirections(unit.text, context),
      stockCompanion: Boolean(boundUnit?.workflowScope?.stockCompanion),
      companionPaths: boundUnit?.workflowScope?.documentPaths || [],
    };
    const prose = (kind(unit.owa?.row || {}) === 'workflow_pattern' ? unit.text.split('\n').slice(3).join('\n') : unit.text)
      .split('\n').filter(line => !/^#{1,6}\s|^(?:verificationStatus|confidenceLevel|status|mappingStatus):/i.test(line)).join('\n');
    workflowScope.aspects = [...(processIds.length ? ['identity'] : []), ...semanticWorkflowAspects(prose, workflowScope.directions)];
    const clauses = attributionClauses(unit.text,text=>relationQualification(text,owners,unit.owa?.row?.namespace)?.statement);
    const structured = ['ontology_field', 'ontology_relation', 'workflow_pattern'].includes(kind(unit.owa?.row || {}));
    const declared = unit.facets || (unit.facet ? [unit.facet] : []);
    const headings = [];
    let declarationFields = [];
    let relationHeader = null;
    const observations=clauses.map((text,index) => {
      const cells=tableCells(text);
      if (!cells) relationHeader=null;
      else if (tableSeparator(tableCells(clauses[index+1] || ''))) relationHeader=relationTableColumns(cells);
      const relationRow = relationHeader && cells?.length===relationHeader.width && !tableSeparator(cells)
        && !tableSeparator(tableCells(clauses[index+1] || ''))
        ? {type:cells[relationHeader.type] || '',cardinality:cells[relationHeader.cardinality] || '',
          source:cells[relationHeader.source],target:cells[relationHeader.target],join:cells[relationHeader.join] || '',
          qualificationCells:relationHeader.qualifications.map(i=>cells[i])} : null;
      const heading = /^(#{1,6})\s+(.+)$/u.exec(text);
      if (heading) {
        declarationFields = [];
        while (headings.length && headings.at(-1).level >= heading[1].length) headings.pop();
        headings.push({ index,level: heading[1].length, facets: [...sectionFacets(heading[2]),
          ...(declaredWorkflowDirections(heading[2], context).length ? ['workflow'] : [])],
          fieldNames: clauseFields(unit, heading[2], context, selection) });
      }
      const explicitFields = clauseFields(unit, text, context, selection);
      if (selection?.requestPlan && explicitFields.length && /^(?:[-*]\s*)?(?:\[x\]\s*)?(?:PK|FK|Pole|Kolumna|Field|[`"']?[\p{L}_][\p{L}\p{N}_.]*_[\p{L}\p{N}_.]*[`"']?)\s*:/iu.test(text)) declarationFields = explicitFields;
      const fieldNames = [...(explicitFields.length ? explicitFields : declarationFields.length ? declarationFields : headings.at(-1)?.fieldNames || [])];
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
      if (selection?.requestPlan) for (const name of context.fieldNames) for (const ownerId of ownerIds) {
        const owner = selection.candidates.find(row => kind(row) === 'ontology_entity' && row.fields.id === ownerId);
        if (owner && fieldNames.some(field => matchesOwaField(name, { fieldName: field }, owner.fields)) && !fieldNames.includes(name)) fieldNames.push(name);
      }
      const relationshipContext=Boolean(relationRow) || !cells && !heading
        && /\b(?:relacj\w*|powiazan\w*|laczy|nalezy|zawiera|rozlicza|koryguje|fk)\b|→|->/.test(normalize(text));
      const arrowMatch=!cells && !heading && /^(.*?)\s*(?:→|->)\s*(.+)$/.exec(text);
      // A column mapping after "przez" is not an explicit entity source.
      const arrow=arrowMatch && !/\b(?:przez|through|join)\s+`?[\w.]+`?\s*$/.test(normalize(arrowMatch[1])) ? arrowMatch : null;
      const implicitSource=arrow && /^[-*]\s+\*\*[^*]+\*\*\s*\([^)]*\)\s*$/.test(arrow[1])
        || !cells && !heading && /^[-*\s]*(?:nalezy do|powiazan\w* z|grupuje|zawiera|rozlicza|koryguje)\b/.test(normalize(text));
      const named=relationshipContext ? endpointOwnerIds(text,owners,unit.owa?.row?.namespace) : [];
      const inheritedRelationOwners=selection?.requestPlan ? ownerIds.filter(id=>selection.metadata.get(unit.owa?.row)?.ownerIds.includes(id)) : ownerIds;
      const proseRelation=!cells && !heading && !arrow
        ? proseRelationBinding(text,owners,inheritedRelationOwners,unit.owa?.row?.namespace) : null;
      // Container ownership remains provenance. An explicit row/arrow asserts
      // its own ends; only an actually omitted source inherits the declared owner.
      const relationOwnerIds = relationRow ? assertedRelationOwners(relationRow,owners,unit.owa?.row?.namespace)
        : arrow && !implicitSource ? assertedRelationOwners({source:arrow[1].replace(/^[-*]\s*/,''),target:arrow[2]},owners,unit.owa?.row?.namespace)
        : arrow && implicitSource ? [...new Set([...ownerIds,...named])]
        : proseRelation ? [...new Set([...proseRelation.sourceOwnerIds,...proseRelation.targetOwnerIds])]
        : !selection?.requestPlan && !cells && !heading ? [...new Set([...ownerIds,...named])]
        : [];
      // Workflow has its own declared process/path proof, not relation-row ends.
      const jointOwnerIds=[...new Set([...ownerIds,...(relationRow
        ? endpointOwnerIds([relationRow.source,relationRow.target,relationRow.join].join(' | '),owners,unit.owa?.row?.namespace) : named)])];
      return { unit, text, ownerIds, jointOwnerIds, relationOwnerIds, fieldNames, processIds,
        workflowScope,relationRow,proseRelation,index,tableLine:Boolean(cells),isHeading:Boolean(heading),
        headingScope:headings.map(h=>h.index),relationAssertion:Boolean(relationRow||arrow||proseRelation),
        facets: [...new Set([...inherited.filter(facet => facet !== 'unknownEnums'),
          ...headings.flatMap(scope => scope.facets), ...sectionFacets(text),
          ...(context.fieldNames.some(name => fieldNames.some(field => normalize(name) === normalize(field))) ? ['fields'] : [])])] };
    });
    return selection?.requestPlan?.requirements.some(r=>['relations','cardinality'].includes(r.facet)&&r.qualifications?.length)
      ? bindRelationQualifications(observations,owners,unit.owa?.row?.namespace) : observations;
  });
}

const jointFacets = new Set(['relations', 'cardinality', 'workflow']);
function observationMatches(requirement, observation, owners, purpose = 'coverage') {
  if (['relations','cardinality'].includes(requirement.facet) && observation.proseRelation
      && requirement.endpointOwnerIds?.length>1
      && !requirement.endpointOwnerIds.some(id=>observation.proseRelation.sourceOwnerIds.includes(id))) return false;
  if (requirement.namespace) {
    if (requirement.unresolved) return false;
    if (observation.unit.namespace && observation.unit.namespace !== requirement.namespace) return false;
    if (requirement.unresolvedEndpointIds?.length) return false;
    const ids = ['relations','cardinality'].includes(requirement.facet) ? observation.relationOwnerIds
      : requirement.effectOwnerId ? observation.ownerIds : jointFacets.has(requirement.facet) ? observation.jointOwnerIds : observation.ownerIds;
    if (requirement.ownerId && !ids.includes(requirement.ownerId)
        && !(requirement.processId && observation.processIds.includes(requirement.processId))) return false;
    if (!requirement.effectOwnerId && requirement.endpointOwnerIds?.some(id => !ids.includes(id))) return false;
    if (requirement.effectOwnerId && !observation.ownerIds.includes(requirement.effectOwnerId)) return false;
    if (requirement.processId && !observation.processIds.includes(requirement.processId)) return false;
    if (requirement.fieldName && !observation.fieldNames.some(name => normalize(name) === normalize(requirement.fieldName))) return false;
    if (!observation.facets.includes(requirement.facet)) return false;
    if (requirement.ownerAttributed && !observation.ownerIds.includes(requirement.ownerId)) return false;
    if (requirement.ownerAttributed && requirement.facet === 'relations'
        && !/\b[1NM*]\s*:\s*[1NM*]\b|[\w.]*[_\.][\w.]+\s*(?:=|→|->)\s*[\w.]*[_\.][\w.]+/i.test(observation.text)) return false;
    if (requirement.facet === 'overview' && requirement.definitionOnly && purpose === 'coverage') {
      const body = observation.unit.text;
      if (!/## (?:Opis biznesowy|Znaczenie|Definicja)/iu.test(body)) {
        const heading = /^#{2,6}\s+(.+)$/m.exec(body)?.[1] || '';
        if (/^(?:status|metadan|identyfikator|pol[ae]|kluczowe|endpoint|mcp api|tabel|zrodl)/.test(normalize(heading)) || /^\s*\|/m.test(body)) return false;
        const prose = body.split('\n').filter(line=>!/^\s*#|^(?:verificationStatus|confidenceLevel):/.test(line)).join('\n');
        const predicate = /\b(?:oznacza|reprezentuje|przechowuje|definiuje|obejmuje|umozliwia|okresla|dokumentuje|jest|to)\b/.test(normalize(prose));
        const nominal = prose.split('\n').some(line=>/^\s*[-*]\s+\p{Lu}[\p{L}\s(),—-]+[.!]?$/u.test(line)&&line.match(/\p{L}+/gu)?.length>=4);
        if (!predicate && !nominal) return false;
      }
    }
    if (requirement.facet === 'qualifiers' && !semanticMaterialFacts(observation.unit.text).includes(requirement.qualifierClass)) return false;
    if (requirement.facet === 'cardinality' && !/\b(?:[1NM*]\s*:\s*[1NM*]|kardynaln\w*\s*:\s*\S+)/i.test(observation.relationRow ? observation.relationRow.cardinality : observation.text)) return false;
    if (requirement.facet === 'identifiers' && (purpose !== 'limitation' && !observation.fieldNames.length
      || !/\b(?:pk|primary key|identity|identyfikator\w*|klucz\w*|keyrole)\b/.test(normalize(observation.unit.text)))) return false;
    if (requirement.facet === 'workflow') {
      const scopedCompanion = observation.workflowScope.stockCompanion
        && observation.workflowScope.companionPaths.some(path => JSON.stringify(path) === JSON.stringify(requirement.documentPath))
        && (purpose === 'limitation' || ['outcome', 'conditions'].includes(requirement.workflowAspect));
      if (requirement.documentPath && !scopedCompanion && !observation.workflowScope.directions.some(path => path.some((_, start) =>
        requirement.documentPath.every((code, i) => path[start + i] === code)))) return false;
      if (purpose !== 'limitation' && (requirement.workflowAspect
        ? !observation.workflowScope.aspects.includes(requirement.workflowAspect)
        : !requirement.documentPath && !observation.workflowScope.aspects.includes('progression'))) return false;
    }
    // Relation qualifications share the assertion's endpoint/heading scope.
    // Other facets retain their existing owner/field qualification policy.
    const claims = ['relations','cardinality'].includes(requirement.facet)
      ? observation.relationQualificationClaims || new Set() : qualificationClaims(normalize(observation.unit.text));
    const typedRelation = observation.relationRow && /^(?:fk|foreign key|logical_join|logical)$/.test(normalize(observation.relationRow.type));
    if (requirement.qualifications?.some(q => q === 'formalFk' ? !typedRelation && !claims.has(q)
      : q === 'verification' && !claims.has(q))) return false;
    return true;
  }
  if (requirement.processId) return observation.processIds.includes(requirement.processId)
    && observation.facets.includes(requirement.facet) && observation.workflowScope.pathEvidence;
  const ids = ['relations','cardinality'].includes(requirement.facet) ? observation.relationOwnerIds
    : jointFacets.has(requirement.facet) ? observation.jointOwnerIds : observation.ownerIds;
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
export function assessOwaCoverage(context, selection, visibleUnits, requestPlan = null) {
  requestPlan ||= selection?.requestPlan;
  context = selection?.effectiveContext || context;
  const plannedRequirements = requestPlan ? semanticCoverageRequirements(requestPlan) : null;
  const requestedFacets = plannedRequirements ? [...new Set(plannedRequirements.map(r => r.facet))] : [...context.facets];
  const owners = ownerScopes(selection);
  const units = visibleUnits.filter(unit => unit.text?.trim()
    && (!owners.length || visibleOwnerIds(unit, owners).length || visibleProcessIds(unit, selection).length));
  const observations = scopeObservations(context, selection, units, owners);
  const fieldFacets = requestedFacets.filter(facetBindsRequestedField);
  const requirements = plannedRequirements ? plannedRequirements.map(requirement => ({ ...requirement,
    covered: observations.some(observation => observationMatches(requirement, observation, owners)) }))
    : (owners.length ? owners.map(owner => owner.ownerId) : [null]).flatMap(ownerId =>
    requestedFacets.filter(facet => owners.length || facet !== 'workflow' || !selection?.processIds?.length)
      .flatMap(facet => (context.fieldNames.length && facetBindsRequestedField(facet)
      ? context.fieldNames : [null]).map(fieldName => {
      const requirement = { ownerId, fieldName, facet };
      return { ...requirement, covered: observations.some(observation => observationMatches(requirement, observation, owners)) };
    })));
  for (const processId of requestPlan ? [] : selection?.processIds || []) {
    const requirement = { ownerId: null, fieldName: null, processId, facet: 'workflow' };
    requirements.push({ ...requirement, covered: observations.some(observation => observationMatches(requirement, observation, owners)) });
  }
  const processCoverage = (selection?.processIds || []).map(processId => ({ processId,
    visible: observations.some(observation => observation.processIds.includes(processId)),
    covered: requestPlan ? requirements.filter(req => req.processId === processId).length > 0
      && requirements.filter(req => req.processId === processId).every(req => req.covered)
      : requirements.some(req => req.processId === processId && req.covered) }));
  const coveredFor = (ownerId, fieldName = null) => requestedFacets.filter(facet => {
    const cells = requirements.filter(req => req.ownerId === ownerId && req.facet === facet && (!fieldName || req.fieldName === fieldName));
    return cells.length && cells.every(req => req.covered);
  });
  const ownerCoverage = owners.map(({ ownerId, label }) => {
    const covered = coveredFor(ownerId);
    const ownedFacets = requestPlan ? [...new Set(requirements.filter(r => r.ownerId === ownerId).map(r => r.facet))] : requestedFacets;
    return { ownerId, label, coveredFacets: covered, missingFacets: ownedFacets.filter(facet => !covered.includes(facet)),
      visible: observations.some(observation => observation.ownerIds.includes(ownerId)
        || requestedFacets.some(facet => jointFacets.has(facet) && observation.facets.includes(facet) && observation.jointOwnerIds.includes(ownerId))),
      fieldCoverage: (requestPlan ? [...new Set(requirements.filter(r => r.ownerId === ownerId).map(r => r.fieldName).filter(Boolean))] : context.fieldNames)
        .map(fieldName => ({ fieldName, coveredFacets: coveredFor(ownerId, fieldName),
        missingFacets: (requestPlan ? requirements.filter(r => r.ownerId === ownerId && r.fieldName === fieldName).map(r => r.facet) : fieldFacets)
          .filter(facet => !coveredFor(ownerId, fieldName).includes(facet)) })) };
  });
  const coveredFacets = requestedFacets.filter(facet => requirements.filter(req => req.facet === facet).every(req => req.covered));
  const missingFacets = requestedFacets.filter(facet => !coveredFacets.includes(facet));
  const reasons = [], notices = [], limitations = [];
  let status = missingFacets.length || ownerCoverage.some(owner => !owner.visible && (!requestPlan || requirements.some(r => r.ownerId === owner.ownerId))) ? 'partial' : 'covered';
  const result = () => ({ status, requestedFacets, coveredFacets, missingFacets, ownerCoverage, limitations, requirements,
    ...(processCoverage.length ? { processCoverage } : {}),
    reasons: [...new Set(reasons)], notices: [...new Set(notices)] });
  if (requestPlan?.identityBarrier || context.qualifiedIds.length && selection?.missing) {
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
    if (/\boperacj\w*\b/.test(context.normalizedQuestion)) notices.push('Doprecyzuj także zamierzoną operację; sama etykieta stanu nie rozstrzyga, jaki proces ma zostać wyjaśniony.');
  }
  if (requestedFacets.includes('workflow')) notices.push('Opis workflow w lokalnych źródłach nie jest dowodem wykonania operacji, wywołania endpointów ani potwierdzeniem ich skutków w bieżącym ERP.');
  if (requirements.some(r => r.workflowAspect === 'identity' && r.covered
    && !requirements.some(other => other.processId === r.processId && other.workflowAspect && other.workflowAspect !== 'identity'))) {
    notices.push('Pokazane metadane identyfikują proces; nie są wyjaśnieniem jego przebiegu, kierunku ani skutku.');
  }
  for (const r of requirements.filter(r => r.workflowAspect && !r.covered)) {
    notices.push(`Dla procesu ${r.processId || r.ownerId || 'żądanego zakresu'} w pokazanych dowodach brak pokrycia aspektu workflow: ${r.workflowAspect}. To nie przesądza o pełnej zawartości źródeł.`);
  }
  for (const process of processCoverage.filter(process => !process.covered)) {
    reasons.push('missing_requested_process_evidence');
    notices.push(`Dla procesu ${process.processId} nie pokazano dowodów żądanego zakresu. Inny proces ani lista rekordów źródła nie zastępuje tej tożsamości; nie przesądza to o pełnej zawartości lokalnych źródeł.`);
  }
  const missingPaths = requestPlan ? requirements.filter(r => r.documentPath && !r.covered
    && (!r.workflowAspect || ['progression', 'direction'].includes(r.workflowAspect))).map(r => r.documentPath) : context.documentPaths;
  if (context.documentPaths?.length && (requestPlan ? missingPaths.length : missingFacets.includes('workflow'))) {
    reasons.push('requested_path_not_shown');
    notices.push(`W pokazanych dowodach brak pokrycia całej żądanej ścieżki: ${[...new Set(missingPaths.map(path => path.join(' → ')))].join('; ')}. Nie pomijam nieznanych kroków ani nie łączę odcinków przez lukę.`);
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
    if (!owner.visible && (!requestPlan || requirements.some(r => r.ownerId === owner.ownerId))) {
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
export function reconcileOwaOmissions(context, selection, coverage, omissions, requestPlan = null) {
  context = selection?.effectiveContext || context;
  const owners = ownerScopes(selection);
  return omissions.map(omission => {
    const observations = omission.owaUnit ? scopeObservations(context, selection, [omission.owaUnit], owners) : null;
    const uncoveredRequirements = coverage.requirements.filter(req => !req.covered
      && (omission.missingFacets || []).includes(req.facet)
      && (observations ? observations.some(observation => observationMatches(req, observation, owners, 'omission'))
        : req.processId ? visibleProcessIds({ owa: omission.owa }, selection).includes(req.processId)
          : !omission.owa?.ownerIds?.length || !req.ownerId || omission.owa.ownerIds.includes(req.ownerId)))
      .map(({ covered, ...requirement }) => selection?.requestPlan || requestPlan ? requirement
         : { ownerId: requirement.ownerId, fieldName: requirement.fieldName, facet: requirement.facet,
           ...(requirement.processId ? { processId: requirement.processId } : {}) });
    return { ...omission, uncoveredRequirements,
      uncoveredFacets: (omission.missingFacets || []).filter(facet => uncoveredRequirements.some(req => req.facet === facet)) };
  });
}
