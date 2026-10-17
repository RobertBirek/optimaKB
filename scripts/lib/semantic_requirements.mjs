import { parseOwaQuestion, matchesOwaField, owaMetadataMentions, createOwaMentionContext } from './owa_query_context.mjs';

/**
 * @typedef {'primary'|'comparison'|'endpoint'|'auxiliary'} SubjectRole
 * @typedef {object} RequestPlan
 * @property {import('./semantic_request_intent.mjs').SemanticIntent} intent
 * @property {object[]} subjects Namespace, literal id, role, kind, origin and span-level evidence/roles.
 * @property {object[]} unresolved Explicit identity/field/subject requests, never wildcard owners.
 * @property {object[]} ambiguities Competing span-level candidates with their source evidence.
 * @property {object[]} requirements Owned facets; optional fieldName, processId, endpointOwnerIds,
 * documentPath, unresolvedEndpointIds and relation qualifications. Evidence is attribution, not coverage.
 * Every requirement retains requestSpans; relation qualificationRequests attribute each qualification
 * to its original request span. Duplicate obligations merge these arrays and all source evidence.
 * @property {string[][]} documentPaths Ordered submitted paths, including unknown/repeated codes.
 * @property {boolean} identityBarrier At least one exact identity request is unresolved.
 */

const fold = value => String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '')
  .replace(/ł/g, 'l').replace(/Ł/g, 'L').toLowerCase();
const unique = values => [...new Set(values)];
const key = owner => JSON.stringify([owner.namespace, owner.id]);
const overlaps = (a, b) => a.start < b.end && b.start < a.end;
const relationCue = /\b(?:relacj\w*|powiazan\w*|join|fk|kardynaln\w*|foreign key|klucz\w* obc\w*)\b/;
const workflowCue = /\b(?:workflow|proces\w*|przebieg\w*|obieg\w*|przeksztalc\w*|krok\w*|sciezk\w*|skutek\w*)\b|→|->/;
const comparisonCue = /\b(?:porown\w*|roznic\w*|versus|vs)\b|tak\w* sam\w* jak|\bto (?:to )?sam\w*\b/;
const dominates = (other, c) => other !== c && overlaps(c, other) && (other.priority > c.priority
  || other.priority === c.priority && other.start <= c.start && other.end >= c.end && other.end - other.start > c.end - c.start);

function requestedWorkflowAspects(text, identityOnly) {
  const aspects = [];
  if (/\b(?:przebieg\w*|krok\w*|etap\w*|sciezk\w*|przeksztalc\w*)\b|→|->/.test(text)) aspects.push('progression');
  if (/\bkierun\w*\b|→|->/.test(text)) aspects.push('direction');
  if (/\b(?:skutek\w*|skutk\w*|wynik\w*|rezultat\w*|zmienia\w*|odwrac\w*|zwieksz\w*|zmniejsz\w*|dzieje)\b/.test(text)) aspects.push('outcome');
  if (/\b(?:warunk\w*|wymag\w*|potrzebn\w*|obejmuje)\b/.test(text)) aspects.push('conditions');
  // A bare named-process lookup asks for its identity, not an explanation.
  if (identityOnly && !aspects.length) return ['identity'];
  return unique(aspects.length ? aspects : ['progression']);
}

function processIdentityLookup(clause, subjects) {
  let remainder = clause.text;
  for (const mention of subjects.flatMap(s => s.mentions).filter(m => !['sourcePhrase', 'field'].includes(m.kind)).sort((a, b) => b.start - a.start)) {
    const start = mention.start - clause.start, end = mention.end - clause.start;
    remainder = remainder.slice(0, start) + ' '.repeat(end - start) + remainder.slice(end);
  }
  return !fold(remainder).replace(/\b(?:owa|proces\w*|workflow|id|identyfikator\w*|metadan\w*|rekord\w*|pokaz|pobierz|znajdz|wyszukaj|i|oraz|dla)\b/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '').length;
}

// Generic morphology for source-language anchors, not a domain synonym map.
function anchor(word) {
  return word.length < 5 ? word : word.replace(/(?:owanie|owania|owaniu|owac|uje|uja|owych|owymi|owej|owym|owy|owa|owe|ych|ymi|ego|emu|em|ej|ym|ami|ach|ow|om|ek|ki|ka|ke|ku|ie|y|a|u|e|i)$/u, '');
}
const grammatical = new Set(['czy', 'jak', 'jaki', 'jakie', 'co', 'jest', 'ma', 'oraz', 'dla', 'sie', 'jego', 'jej', 'ktory', 'ktora']);
function words(text) {
  return [...fold(text).matchAll(/[\p{L}]{3,}/gu)].filter(m => !grammatical.has(m[0]))
    .map(m => ({ token: anchor(m[0]), start: m.index, end: m.index + m[0].length }));
}

function naturalCandidates(question, catalog) {
  // Request scaffolding and verification vocabulary do not identify an entity.
  const anchors = text => words(text).filter(w => !/^(?:teg|sam|nie|zrodl|material|weryfik|potwierdz|dokladn|liczbow|pokaz|podaj|nazw|identyfikator|kolumn|tabel|mapowan)/.test(w.token));
  const frequency = new Map();
  const arms = clauses(question).flatMap(clause => {
    const parts = clause.text.split(/\b(?:ze|z|versus|vs|jak)\b/iu); let offset = clause.start;
    return parts.map(part => { const start = question.indexOf(part, offset); offset = start + part.length;
      return { start, text: part, query: anchors(part).map(w => ({ ...w, start: start + w.start, end: start + w.end })) }; });
  });
  for (const owner of catalog.identities) {
    const tokens = unique(owner.phrases.flatMap(phrase => anchors(phrase.text).map(w => w.token)));
    for (const token of tokens) frequency.set(token, (frequency.get(token) || 0) + 1);
  }
  return catalog.identities.flatMap(owner => owner.phrases.flatMap(phrase => arms.flatMap(arm => {
    if (/\b(?:nie pytam o|nie opisuj|pomijaj)\b/.test(fold(arm.text))) return [];
    const query = arm.query;
    const vocabulary = new Set(anchors(phrase.text).map(w => w.token));
    const matched = query.filter(w => vocabulary.has(w.token));
    if (unique(matched.map(w => w.token)).length < 2) return [];
    // At least one discriminating anchor; a frequent product/common phrase
    // cannot identify a subject even when it contains several tokens.
    if (!matched.some(w => w.token.length >= 4 && frequency.get(w.token) <= Math.max(1, catalog.identities.length / 2))) return [];
    if (matched.at(-1).end - matched[0].start > 160) return [];
    const head = words(arm.text).find(w => !/^(?:porown|opisz|wyjasn|pokaz|podaj|przebieg|proces)/.test(w.token));
    const sourceHead = words(phrase.text)[0]?.token;
    const metadataHead = words(owner.name)[0]?.token;
    const sameHead = head && [sourceHead, metadataHead].some(token => token && (head.token === token
      || head.token.length >= 7 && token.length >= 7 && head.token.slice(0, 5) === token.slice(0, 5)));
    const interrogative = head && /\b(?:ktory|ktora|ktore|jakie|jaki|czy)\b/.test(fold(arm.text.slice(0, head.start)));
    const action = sameHead && !interrogative && !comparisonCue.test(head.token)
      && new Set(matched.filter(w => w.start !== arm.start + head.start).map(w => w.token)).size >= 2;
    return [{ owner, kind: 'sourcePhrase', action, value: phrase.text, start: action ? arm.start + head.start : matched[0].start,
      end: matched.at(-1).end, origin: phrase.origin, locator: phrase.locator,
      priority: action ? 85 : 20 + Math.min(10, unique(matched.map(w => w.token)).length) }];
  })));
}

function nominalCompositions(question, catalog, metadataMentions) {
  const entities = catalog.identities.filter(o => o.kind === 'entity');
  const definitions = new Map(entities.map(o => [o, words(o.origin.fields.description || '').map(w => w.token)]));
  const frequency = new Map();
  for (const tokens of definitions.values()) for (const token of unique(tokens)) frequency.set(token, (frequency.get(token) || 0) + 1);
  // Short nominal heads still need an independently source-backed object; this
  // bounded declension is not an unqualified single-token identity lookup.
  const headStem = word => word.length === 4 ? word.replace(/[ayei]$/, '') : anchor(word);
  const result = [];
  result.objectConstraints = [];
  for (const owner of entities) for (const label of owner.labels.filter(l => !l.exact && ['name', 'canonicalName', 'baseName'].includes(l.kind))) {
    const match = /^([\p{L}]+)\s+([\p{L} ]+)$/u.exec(label.value);
    if (!match) continue;
    const head = headStem(fold(match[1])), objectLabel = match[2];
    const objects = entities.filter(o => o !== owner && o.namespace === owner.namespace && o.labels.some(l => !l.exact
      && metadataMentions(objectLabel, l.value, { inflect: true }).some(s => s.start === 0 && s.end === objectLabel.length)));
    for (const clause of clauses(question)) {
      const tokens = words(clause.text), heads = tokens.filter(w => headStem(w.token) === head);
      if (heads.length && objects.length) result.objectConstraints.push({ owner, start: clause.start, end: clause.end });
      for (const object of objects) {
        const argumentsIn = tokens.filter(w => w.token.length >= 4 && definitions.get(object).includes(w.token)
          && frequency.get(w.token) <= Math.max(1, entities.length / 5));
        for (const h of heads) for (const argument of argumentsIn.filter(a => a.start !== h.start)) {
          result.push({ owner, kind: 'sourceComposition', value: label.value, exact: false, priority: 85,
            start: clause.start + Math.min(h.start, argument.start), end: clause.start + Math.max(h.end, argument.end),
            origin: owner.origin, locator: owner.locator, targetOrigin: object.origin });
        }
      }
    }
  }
  return result;
}

function mentionRole(question, mention, intent) {
  const before = fold(question.slice(0, mention.start));
  if (/\b(?:w kontekscie|pomocniczo|na przyklad)\s*$/.test(before)) return 'auxiliary';
  const clause = clauses(question).find(c => mention.start >= c.start && mention.end <= c.end);
  if (comparisonCue.test(fold(clause?.text))) return 'comparison';
  if ((relationCue.test(fold(question)) || intent === 'relation' || intent === 'process')
      && /\b(?:do|z|ze|miedzy)\s*$/.test(before)) return 'endpoint';
  if (/(?:→|->)\s*$/.test(before)) return 'endpoint';
  return 'primary';
}

// The parser's unique spelling hints are not occurrences. Recover every bounded
// occurrence, including source-declared fields classified as heuristic IDs.
function fieldOccurrences(question, context, catalog, metadataMentions = owaMetadataMentions) {
  const names = unique([...context.fieldNames, ...context.qualifiedIds.filter(name =>
    catalog.fields.some(f => matchesOwaField(name, f.fields, f.owner)))])
    .filter(name => !catalog.identities.some(owner => owner.labels.some(label => label.exact && label.value === name))
      && !catalog.symbols.some(symbol => fold(symbol.name) === fold(name)));
  const occurrences = names.flatMap(value => metadataMentions(question, value).map(span => ({ value, ...span })));
  // A heuristic uppercase tail inside a qualified column cannot discard its
  // qualifier, even when the complete qualified request has no declared owner.
  return occurrences.filter(span => !occurrences.some(other => other.start <= span.start && other.end >= span.end
    && other.end - other.start > span.end - span.start)).sort((a, b) => a.start - b.start);
}

/**
 * All selected subjects retain literal allowed evidence. An exact missing ID
 * suppresses nearby label/body substitutions, while known exact sides survive.
 * @param {string} question
 * @param {import('./semantic_request_intent.mjs').SemanticIntent} intent
 * @param {import('./semantic_catalog.mjs').Catalog} catalog
 * @returns {{subjects: object[], unresolved: object[], ambiguities: object[]}}
 */
export function resolveSemanticSubjects(question, intent, catalog) {
  question = String(question ?? '');
  const { mentions: metadataMentions } = createOwaMentionContext();
  const context = parseOwaQuestion(question, { symbols: catalog.symbols });
  const candidates = [], unresolved = [], ambiguities = [];
  const add = (owner, label, priority, origin = owner.origin, locator = owner.locator) => {
    for (const span of metadataMentions(question, label.value, { exact: label.exact,
      inflect: !label.exact && !['mainTable', 'field', 'symbol'].includes(label.kind) })) {
      candidates.push({ owner, ...label, ...span, priority, origin, locator });
    }
  };
  for (const owner of catalog.identities) for (const label of owner.labels) {
    add(owner, label, ['id', 'ontologyId'].includes(label.kind) || /^OWAOntology\./.test(label.value) ? 100
      : label.kind === 'mainTable' ? 90 : 70);
  }
  const declared = candidates.filter(c=>!candidates.some(other=>dominates(other,c)));
  const declaredCount = candidates.length;
  const admitsComposition = candidate => !declared.some(label => label.owner !== candidate.owner && overlaps(label,candidate)
    // Only an outer head actually referring to THIS declared target may consume
    // its nested natural label. A synonym from some other object's definition
    // is not permission to override a complete name, alias or qualified identity.
    && !((candidate.targetIdentityOrigin || candidate.targetOrigin) === label.owner.origin && !label.exact && label.kind !== 'mainTable'
      && candidate.start < label.start && candidate.end >= label.end));
  for (const owner of catalog.identities) for (const composition of owner.compositions || []) {
    add(owner, { kind: 'sourceComposition', value: composition.value, exact: false, targetOrigin:composition.targetOrigin,
      targetIdentityOrigin:composition.targetIdentityOrigin }, 85, composition.origin, composition.locator);
  }
  const nominal = nominalCompositions(question, catalog, metadataMentions);
  candidates.push(...nominal);
  candidates.splice(declaredCount, candidates.length-declaredCount, ...candidates.slice(declaredCount).filter(admitsComposition));
  const admittedNominal = nominal.filter(admitsComposition);
  const exactRequests = unique([...context.qualifiedIds,
    ...[...question.matchAll(/(?<![\p{L}\p{N}_.:-])(?:[\p{L}][\p{L}\p{N}_.-]*(?::[\p{L}\p{N}_-]+)+(?:[.:][\p{L}\p{N}_-]+)*|[A-Z][A-Z\d]+_[\p{L}\p{N}_]+)(?![\p{L}\p{N}_])/gu)]
      .map(m => m[0])])
    .filter(value => metadataMentions(question, value, { exact: true }).length)
    .filter(value => candidates.some(c => c.exact && c.value === value)
      || !catalog.symbols.some(s => fold(s.name) === fold(value))
        && !catalog.fields.some(f => matchesOwaField(value, f.fields, f.owner)));
  for (const value of exactRequests) {
    if (!candidates.some(c => c.exact && c.value === value)) unresolved.push({ kind: 'identity', value });
  }
  const barrier = unresolved.some(u => u.kind === 'identity');
  if (barrier) {
    for (let i = candidates.length - 1; i >= 0; i--) if (!(candidates[i].exact && exactRequests.includes(candidates[i].value))) candidates.splice(i, 1);
  } else {
    for (const symbol of catalog.symbols) add(symbol.owner, { kind: 'symbol', value: symbol.name, exact: false }, 80, symbol.origin, symbol.locator);
    const namedCandidates = candidates.filter(c => !candidates.some(other => dominates(other, c))), segments = clauses(question);
    for (const span of fieldOccurrences(question, context, catalog, metadataMentions)) {
      const name = span.value;
      const clause = segments.find(c => span.start >= c.start && span.end <= c.end);
      const namesIn = segment => namedCandidates.filter(c => segment && c.start >= segment.start && c.end <= segment.end
        && !['endpoint', 'auxiliary'].includes(mentionRole(question, c, intent)));
      let named = namesIn(clause);
      if (!named.length) for (const previous of segments.filter(c => c.start >= clause?.scopeStart && c.end <= clause.start).reverse()) {
        named = namesIn(previous);
        if (named.length) break;
      }
      const declarations = catalog.fields.filter(f => matchesOwaField(name, f.fields, f.owner)
        && (name.includes('.') || !named.length || relationCue.test(fold(clause?.text))
          || named.some(c => key(c.owner) === key(f.owner))));
      if (!declarations.length) {
        // A requested main table is metadata, not an unknown column.
        if (!candidates.some(c => c.kind === 'mainTable' && c.value === name)) unresolved.push({ kind: 'field', ...span });
      }
      for (const field of declarations) candidates.push({ owner: field.owner, kind: 'field', ...span,
        exact: false, priority: 90, origin: field.origin, locator: field.locator });
    }
    const strong = candidates.filter(c => !candidates.some(other => dominates(other, c)));
    candidates.push(...naturalCandidates(question, catalog).filter(candidate => {
      const clause = segments.find(c => candidate.start >= c.start && candidate.end <= c.end);
      if (!clause) return false;
      if (nominal.objectConstraints.some(c => c.owner === candidate.owner && c.start === clause.start && c.end === clause.end)
          && !admittedNominal.some(c => c.owner === candidate.owner && c.start >= clause.start && c.end <= clause.end)) return false;
      const named = strong.filter(c => c.start >= clause.start && c.end <= clause.end);
      if (candidate.action && !named.filter(c => overlaps(c,candidate)).some(c => c.exact || c.kind === 'field'
        || c.kind === 'mainTable' || c.value.trim().split(/\s+/).length > 1)) return true;
      if (named.length) return named.some(c => key(c.owner) === key(candidate.owner));
      // Sentence punctuation does not reset request scope. A generic instruction
      // can refine the established owner but cannot discover a new one merely
      // because its words occur in another document. Explicit new labels/fields
      // already entered `strong`; independently requested natural subjects and
      // explicit comparisons may still introduce a source-backed second owner.
      const previous = strong.filter(c => c.end <= clause.start);
      const independent = /\b(?:porown\w*|versus|vs)\b|tak\w* sam\w* jak/.test(fold(clause.text))
        || /\b(?:niezaleznie|osobno|oddzielnie)\b/.test(fold(clause.text));
      return !previous.length || independent || previous.some(c => key(c.owner) === key(candidate.owner));
    }));
  }
  const selected = candidates.filter(c => !candidates.some(other => dominates(other, c)));
  const spans = new Map();
  for (const c of selected) {
    const spanKey = `${c.start}:${c.end}`;
    const group = spans.get(spanKey) || [];
    if (!group.some(other => key(other.owner) === key(c.owner))) group.push(c);
    spans.set(spanKey, group);
  }
  const matches = [];
  const declaredMatches = [...spans.values()].filter(g=>g.length===1 && !['sourcePhrase','sourceComposition'].includes(g[0].kind)).map(g=>g[0]);
  for (const group of spans.values()) {
    const clause=clauses(question).find(c=>group[0].start>=c.start&&group[0].end<=c.end);
    const incidentalTie=group.length>1 && group.every(c=>['sourcePhrase','sourceComposition'].includes(c.kind)
      && declaredMatches.some(d=>key(d.owner)===key(c.owner)&&d.start>=clause?.start&&d.end<=clause?.end));
    if (incidentalTie) continue; // keep the explicit owners, do not pick a weak tie winner
    if (group.length > 1) ambiguities.push({ value: question.slice(group[0].start, group[0].end),
      ownerIds: group.map(c => c.owner.id), candidates: group });
    else matches.push(group[0]);
  }
  matches.sort((a, b) => a.start - b.start);
  const subjects = [];
  let actionScope = null;
  for (const match of matches) {
    if (match.action || match.kind === 'sourceComposition' || !match.exact && ['name','canonicalName','baseName'].includes(match.kind)
      && match.value.trim().split(/\s+/).length > 1) actionScope = match;
    let role = mentionRole(question, match, intent);
    const clause = clauses(question).find(c => match.start >= c.start && match.end <= c.end);
    if (actionScope && actionScope.owner !== match.owner && !match.exact && !['field', 'mainTable'].includes(match.kind)
        && !comparisonCue.test(fold(clause?.text)) && !/\b(?:opisz|pokaz|klucz\w*|identyfikator\w*|mapowani\w*|slownik\w*|enum)\b/.test(fold(clause?.text))
        && actionScope.owner.phrases.some(p => metadataMentions(p.text, match.value, { inflect: true }).length)) role = 'endpoint';
    let subject = subjects.find(s => key(s) === key(match.owner));
    if (!subject) {
      subject = { id: match.owner.id, namespace: match.owner.namespace, kind: match.owner.kind,
        role, origin: match.owner.origin, mentions: [] };
      Object.defineProperty(subject,'catalogIdentity',{value:match.owner});
      subjects.push(subject);
    }
    if (role === 'primary') subject.role = role;
    subject.mentions.push({ start: match.start, end: match.end, kind: match.kind, value: match.value,
      role, origin: match.origin, locator: match.locator });
  }
  for (const clause of clauses(question).filter(c => comparisonCue.test(fold(c.text)))) {
    const first = subjects.find(s => s.mentions.some(m => m.start >= clause.start && m.end <= clause.end));
    if (first?.role === 'comparison') first.role = 'primary';
  }
  if (!subjects.length && !unresolved.length && !ambiguities.length) unresolved.push({ kind: 'subject', value: question });
  return { subjects, unresolved, ambiguities };
}

// A clause boundary preserves identifiers containing periods. Coordinated new
// facet requests get local ownership; a bare continuation inherits its subject.
function clauses(question) {
  const cuts = /;|[!?\n]|\.(?=\s|$)|(?:\s+(?:oraz|i|a)\s+|,\s*)(?=(?:niezaleznie\s+)?(?:(?:jej|jego|ich)\s+)?(?:pola|kolumny|klucz\w*|identyfikator\w*|relacj\w*|proces\w*|workflow|slownik\w*|enum\w*|(?:dopuszczaln\w*|lista) wartosc\w*)\b)/g;
  const result = []; let start = 0, scopeStart = 0;
  for (const match of fold(question).matchAll(cuts)) {
    result.push({ start, end: match.index, text: question.slice(start, match.index), scopeStart });
    start = match.index + match[0].length;
    if (/^[;!?\n.]/.test(match[0])) scopeStart = start;
  }
  result.push({ start, end: question.length, text: question.slice(start), scopeStart });
  return result;
}

/**
 * Private declarative requirements; no evidence selection, scoring or I/O.
 * @param {string} question
 * @param {import('./semantic_request_intent.mjs').SemanticIntent} intent
 * @param {import('./semantic_catalog.mjs').Catalog} catalog
 * @returns {RequestPlan}
 */
export function buildSemanticRequestPlan(question, intent, catalog) {
  question = String(question ?? '');
  const context = parseOwaQuestion(question, { symbols: catalog.symbols });
  const resolved = resolveSemanticSubjects(question, intent, catalog);
  if (context.facets.includes('statusAmbiguity') && !resolved.unresolved.some(u=>u.kind==='identity')) {
    // Alternative operation names are options to clarify, not independently
    // requested explanations of those operations. No lifecycle is selected.
    const subjects = resolved.subjects.map(s=>({...s,role:'auxiliary',mentions:s.mentions.map(m=>({...m,role:'auxiliary'}))}));
    const ambiguities=resolved.ambiguities.filter(a=>a.candidates.some(c=>!['sourcePhrase','sourceComposition'].includes(c.kind)));
    return { intent,...resolved,subjects,ambiguities,requirements:[{ ownerId:null,namespace:subjects[0]?.namespace || null,
      facet:'statusAmbiguity',evidence:[],requestSpans:[{start:0,end:question.length,text:question}] }],
      documentPaths:context.documentPaths,identityBarrier:false };
  }
  const fields = fieldOccurrences(question, context, catalog);
  const requirements = [];
  const primary = resolved.subjects.filter(s => ['primary', 'comparison'].includes(s.role));
  const add = (requirement, clause) => {
    const request = { start: clause.start, end: clause.end, text: clause.text };
    const qualificationRequests = (requirement.qualifications || []).map(qualification => ({ ...request, qualification }));
    const workflowAspectRequests = requirement.workflowAspects?.map(aspect => ({ ...request, aspect }));
    const signature = JSON.stringify([requirement.namespace, requirement.ownerId, requirement.facet,
      requirement.fieldName, requirement.endpointOwnerIds, requirement.unresolvedEndpointIds, requirement.processId, requirement.documentPath, requirement.qualifierClass]);
    const existing = requirements.find(r => r.signature === signature);
    if (!existing) requirements.push({ ...requirement, signature, requestSpans: [request],
      ...(requirement.qualifications ? { qualificationRequests } : {}),
      ...(workflowAspectRequests ? { workflowAspectRequests } : {}) });
    else {
      if (requirement.definitionOnly) existing.definitionOnly = true;
      existing.requestSpans.push(request);
      existing.evidence = unique([...existing.evidence, ...requirement.evidence]);
      if (requirement.qualifications) {
        existing.qualifications = unique([...existing.qualifications, ...requirement.qualifications]);
        existing.qualificationRequests.push(...qualificationRequests);
      }
      if (workflowAspectRequests) {
        existing.workflowAspects = unique([...existing.workflowAspects, ...requirement.workflowAspects]);
        existing.workflowAspectRequests.push(...workflowAspectRequests);
      }
    }
  };
  let inherited = primary.slice(0, 1);
  const segments=clauses(question);
  const asks = text => /^\s*(?:niezaleznie\s+|osobno\s+)?(?:czy|jak\w*|co|gdzie|kiedy|opisz|wyjasn\w*|podaj|pokaz|porown\w*)\b/.test(fold(text));
  for (const clause of segments) {
    const text = fold(clause.text);
    const local = resolved.subjects.flatMap(s => {
      const mentions = s.mentions.filter(m => m.start >= clause.start && m.end <= clause.end);
      if (!mentions.length) return [];
      const role = ['primary', 'comparison', 'endpoint', 'auxiliary'].find(role => mentions.some(m => m.role === role));
      return [{ ...s, role, mentions }];
    });
    const direct = local.filter(s => !['endpoint', 'auxiliary'].includes(s.role));
    const owners = direct.length ? direct : inherited;
    if (direct.length) inherited = direct;
    const hints = parseOwaQuestion(clause.text, { symbols: catalog.symbols });
    const requestedFields = fields.filter(span => span.start >= clause.start && span.end <= clause.end);
    const contextualStatement = intent==='process' && !asks(clause.text) && !workflowCue.test(text)
      && /\b(?:jest|sa|mam|mamy|ma|maja|posiada)\b/.test(text)
      && segments.some(next=>next.start>clause.end&&asks(next.text)&&resolved.subjects.some(s=>!owners.some(o=>key(o)===key(s))
        && s.mentions.some(m=>!['endpoint','auxiliary'].includes(m.role)&&m.kind!=='sourcePhrase'&&m.start>=next.start&&m.end<=next.end)));
    let roleTargets=owners;
    if (comparisonCue.test(text)&&owners.length>1) {
      const mentions=owners.flatMap(s=>s.mentions.map(m=>({...m,owner:s}))).sort((a,b)=>a.start-b.start);
      const terms=[...text.matchAll(/\b(?:rol[aeiy]|rolom|roles?|odbiorc\w*|dostawc\w*|nabywc\w*|sprzedawc\w*)\b/g)];
      const roleNoun=terms.some(t=>/^rol/.test(t[0]));
      const colon=text.lastIndexOf(':');
      const shared=roleNoun && (terms.some(t=>clause.start+t.index<mentions[0]?.start)
        || /\bich rol/.test(text) || colon>=0&&clause.start+colon>Math.max(...mentions.map(m=>m.end)));
      if (!shared) roleTargets=owners.filter(s=>terms.some(t=>{
        const mention=mentions.filter(m=>m.start<=clause.start+t.index).at(-1);
        return mention && key(mention.owner)===key(s);
      }));
    }
    const qualifierClasses = [];
    if (/\b(?:oryginal\w*|pierwotn\w*)\b/.test(text) && /\b(?:nadpis\w*|modyfik\w*|osobn\w*)\b/.test(text)) qualifierClasses.push('original');
    if (/\bkwot\w*\b/.test(text) && /\bilosc\w*\b/.test(text)) qualifierClasses.push('dimensions');
    if (/\bzwieksz\w*\b/.test(text) && /\bzmniejsz\w*\b/.test(text) || /in plus|in minus/.test(text)) qualifierClasses.push('polarity');
    if (/\b(?:potrzebn\w*|wymagan\w*|obowiazkow\w*)\b/.test(text)) qualifierClasses.push('necessity');
    if (/\b(?:jakie|ktore)\b[^?]*\b(?:obejmuje|uczestnicz\w*)\b/.test(text)) qualifierClasses.push('participation');
    if (/\btabel\w*\b/.test(text)) qualifierClasses.push('sourceTables');
    if (/\bograniczen\w*\b/.test(text) && owners.some(owner => requirements.some(r => r.ownerId === owner.id && r.facet === 'workflow'))) qualifierClasses.push('scope');
    if (/\b(?:dezaktyw\w*|nieaktywn\w*)\b/.test(text)) qualifierClasses.push('activation');
    if (/\b(?:testowan\w*|wywolan\w*)\b/.test(text)) qualifierClasses.push('execution');
    if (/\b(?:zweryfikowan\w*|weryfikowan\w*|potwierdza\w*|potwierdzono)\b/.test(text)) qualifierClasses.push('verification');
    if (/\bodnosi sie\b/.test(text)) qualifierClasses.push('reference');
    if (/\bruch\w*\b[^?]*\bpierwotn\w*\b|\bskutek\w*\b[^?]*\boryginal\w*\b/.test(text)) qualifierClasses.push('effectRelation');
    const referencedOwners = local.filter(s => {
      const name = catalog.identities.find(o => key(o) === key(s))?.name.split(/\s+/)[0];
      return name && owaMetadataMentions(clause.text, name, { inflect:true }).some(span => /\bodnosi sie\s*$/.test(fold(clause.text.slice(0,span.start))));
    });
    for (const qualifierClass of qualifierClasses) for (const owner of ['reference','effectRelation'].includes(qualifierClass) && referencedOwners.length === 1 ? referencedOwners : owners)
      add({ ownerId: owner.id, namespace: owner.namespace, facet: 'qualifiers', qualifierClass,
        ...(qualifierClass === 'verification' && requestedFields.length === 1 ? {fieldName:requestedFields[0].value} : {}), evidence: owner.mentions }, clause);
    // Natural data questions can request source-declared columns by their
    // descriptions. Keep every matching owned declaration, not a guessed enum
    // or a field from another subject. Literal field requests use their own path.
    if (!requestedFields.length && /\b(?:danych|kwot\w*|wartosc\w*)\b/.test(text)) {
      const queryWords = new Set(words(clause.text).map(w => w.token).filter(w => w.length >= 4
        && !/^(?:pole|kolumn|danych|opis|wartosc|system|material|zrodl)/.test(w)));
      for (const owner of owners) for (const field of catalog.fields.filter(f => key(f.owner) === key(owner))) {
        if (!words(field.text).some(w => queryWords.has(w.token))) continue;
        add({ ownerId: owner.id, namespace: owner.namespace, facet: 'fields', fieldName: field.name,
          recognition: 'sourceDescription', evidence: [field] }, clause);
      }
    }
    let facets = hints.facets.filter(f => f !== 'workflow' && f !== 'statusAmbiguity');
    if (requestedFields.length) facets.push('fields');
    if (/\b(?:opisz|opis|wyjasn\w*|czym|co oznacz\w*|porown\w*)\b/.test(text)) facets.push('overview');
    if (/\b(?:sprzeczn\w*|konflikt\w*|rozstrzygn\w*)\b/.test(text)) facets.push('unknownEnums');
    if (/\b(?:regul\w*|zasad\w*|zapobieg\w*|ograniczen\w*)\b/.test(text.split(/\bw kontekscie\b/)[0])
        && !/\b(?:weryfik\w*|potwierdz\w*|wiarygodn\w*)\b/.test(text) && !relationCue.test(text)) facets.push('rules');
    const workflowText = text.replace(/\b(?:bez(?:\s+opisywania)?|nie pytam o|nie opisuj|pomijaj)\s+[^,;:]+/g, '');
    if (workflowCue.test(workflowText)) facets.push('workflow');
    if (intent === 'process' && /\b(?:dzieje|zmienia\w*|odwrac\w*|zwieksz\w*|zmniejsz\w*)\b/.test(workflowText)) facets.push('workflow');
    if (intent==='process' && !requestedFields.length && asks(clause.text)
        && /\b(?:wymaga\w*|potrzebn\w*|obejmuje)\b/.test(workflowText)) facets.push('workflow');
    const relation = relationCue.test(text) || intent === 'relation' && !requirements.length && !facets.length;
    if (relation) facets.push('relations');
    // Qualification of a relation is not a request for a primary key or enum.
    if (relation) {
      const withoutFk = text.replace(/\bklucz\w*\s+obc\w*\b/g, '');
      facets = facets.filter(f => (f !== 'unknownEnums' || hints.fieldNames.length)
        && (f !== 'identifiers' || parseOwaQuestion(withoutFk).facets.includes('identifiers')));
    }
    if (!facets.length && clause.text.trim() && !requirements.length && !contextualStatement) facets = [intent === 'process' ? 'workflow' : 'overview'];
    for (const facet of unique(facets)) {
      if (['relations', 'cardinality'].includes(facet)) {
        let endpoints = local.filter(s => s.role !== 'auxiliary' && s.kind !== 'process');
        if (endpoints.length < 2) endpoints = unique([...owners, ...endpoints]);
        if (!endpoints.length) continue;
        const endpointOwnerIds = unique(endpoints.map(s => s.id));
        const main = endpoints.find(s => s.role === 'primary') || endpoints[0];
        const qualifications = [];
        if (/\b(?:weryfik\w*|potwierdz\w*|ograniczen\w*|wiarygodn\w*)\b/.test(text)) qualifications.push('verification');
        if (/\bfk\b|foreign key|\bklucz\w*\s+obc\w*\b/.test(text)) qualifications.push('formalFk');
        add({ ownerId: main.id, namespace: main.namespace, facet, endpointOwnerIds, qualifications,
          ...(/\b(?:jej|jego)\b|\blaczy sie\b/.test(fold(question)) ? { ownerAttributed:true } : {}),
          unresolvedEndpointIds: resolved.unresolved.filter(u => u.kind === 'identity'
            && owaMetadataMentions(clause.text, u.value, { exact: true }).length).map(u => u.value),
          evidence: catalog.relations.filter(r => r.origin.namespace === main.namespace
            && endpointOwnerIds.length >= 2 && endpointOwnerIds.every(id => r.endpointOwnerIds.includes(id))) }, clause);
      } else if (facet === 'workflow') {
        const processes = local.filter(s => s.kind === 'process');
        if (processes.length) for (const process of processes) add({ ownerId: process.id, namespace: process.namespace,
          processId: process.id, facet, workflowAspects: requestedWorkflowAspects(workflowText, processIdentityLookup(clause, local)), evidence: process.mentions }, clause);
        else if (hints.documentPaths.length) for (const documentPath of hints.documentPaths) add({ ownerId: owners[0]?.id || null,
          namespace: owners[0]?.namespace || null, facet, documentPath, workflowAspects: requestedWorkflowAspects(workflowText, false), endpointOwnerIds: local.map(s => s.id), evidence: local.flatMap(s => s.mentions) }, clause);
        else for (const owner of owners) {
          // Defining a catalogued concept that mentions processes does not ask
          // for a particular process's progression. Explicit aspect requests do.
          const conceptMeaning = owner.kind === 'concept' && /\b(?:znaczeni\w*|definicj\w*|czym|co oznacz\w*)\b/.test(text)
            && !/\b(?:przebieg\w*|kierun\w*|skutek\w*|skutk\w*|warunk\w*|sciezk\w*|krok\w*)\b/.test(workflowText);
          add({ ownerId: owner.id, namespace: owner.namespace, facet: conceptMeaning ? 'overview' : facet,
            ...(!conceptMeaning ? { workflowAspects: requestedWorkflowAspects(workflowText, false) } : {}), evidence: owner.mentions }, clause);
        }
      } else {
        const targets = facet==='roles' ? roleTargets : facet === 'overview' && /\b(?:oba|obie|obydw\w*)\b/.test(text)
          ? local.filter(s=>s.role!=='auxiliary') : owners;
        for (const owner of targets.filter(s => s.kind !== 'process')) {
          const ownedFields = unique(requestedFields.filter(span => local.some(s => key(s) === key(owner)
            && s.mentions.some(m => m.kind === 'field' && m.start === span.start && m.end === span.end))
            // An explicit owner may REQUEST an undeclared field. This does not
            // declare its existence: coverage must still show its literal fact.
            || !span.value.includes('.') && owner.mentions.some(m => m.kind !== 'field') && resolved.unresolved.some(u => u.kind === 'field'
              && u.start === span.start && u.end === span.end)).map(span => span.value));
          if (requestedFields.length && !ownedFields.length) continue;
          for (const fieldName of ownedFields.length ? ownedFields : [null]) add({ ownerId: owner.id, namespace: owner.namespace,
            facet, ...(facet === 'overview' && processIdentityLookup(clause, local) ? { identityOnly: true } : {}),
            ...(facet === 'overview' && (/\b(?:co oznacz\w*|czym|znaczeni\w*)\b|\bto (?:to )?sam\w*\b/.test(text)
              || intent === 'concept' && /\broznic\w*\b/.test(text)) ? { definitionOnly:true } : {}),
            ...(fieldName ? { fieldName } : {}), evidence: owner.mentions }, clause);
        }
      }
    }
  }
  if (context.facets.includes('statusAmbiguity')) add({ ownerId: primary[0]?.id || null,
    namespace: primary[0]?.namespace || null, facet: 'statusAmbiguity', evidence: [] },
  { start: 0, end: question.length, text: question });
  return { intent, ...resolved, requirements: requirements.map(({ signature, ...r }) => r),
    documentPaths: context.documentPaths, identityBarrier: resolved.unresolved.some(u => u.kind === 'identity') };
}
