import { DOCUMENT_CODES } from './knowledge_retrieval.mjs';

/**
 * @typedef {Object} Context
 * @property {string} question Original text (opaque IDs retain their case).
 * @property {string} normalizedQuestion Lowercase, Polish-diacritic folded text.
 * @property {boolean} explicitOwa
 * @property {string[]} tokens Normalized, bounded tokens, in mention order.
 * @property {string[]} qualifiedIds Exact ontology identifiers, in mention order.
 * @property {string[]} fieldNames Quoted/bracketed or table-style identifiers.
 * @property {string[]} documentCodes Uppercase bounded codes, in mention order.
 * @property {string[][]} documentPaths Explicit ordered paths, including repeated codes.
 * @property {string[]} facets Requested aspects, not assertions about source facts.
 *
 * @typedef {Object} ParsedRow
 * @property {Object.<string, string>} fields Parsed CSV source fields.
 * @property {string} [artifact] Relative CSV artifact locator.
 */

const normalize = value => String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '')
  .replace(/ł/g, 'l').replace(/Ł/g, 'L').toLowerCase();
const unique = values => [...new Set(values)];
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function isExplicitOwaQuestion(question) {
  return /(?:^|[^\p{L}\p{N}_])owa(?:ontology)?(?=$|[^\p{L}\p{N}_])/u.test(normalize(question));
}

// Preserve the submitted arrow path, including unknown steps. A request must
// never be reconstructed from the unique, known document-code vocabulary.
export function owaDocumentPaths(value) {
  return [...normalize(value).matchAll(/(?<![\p{L}\p{N}_])[\p{L}\p{N}_]+(?:\s*(?:→|->)\s*[\p{L}\p{N}_]+)+(?![\p{L}\p{N}_])/gu)]
    .map(match => match[0].split(/\s*(?:→|->)\s*/).map(code => code.toUpperCase()));
}

// A qualified request is an owned table+column binding, never just a tail
// spelling. Qualified column metadata may declare its own table reference.
export function matchesOwaField(name, fields, owner) {
  const labels = ['fieldName', 'mssqlColumn', 'mcpField'].map(key => fields[key]).filter(Boolean);
  const parts = normalize(name).split('.');
  if (parts.length === 1) return labels.some(label => normalize(label) === parts[0]);
  const column = parts.pop(), qualifier = parts.join('.');
  const tables = [owner?.mainTable, ...['fieldName', 'mssqlColumn'].map(key => fields[key])
    .filter(value => value?.includes('.')).map(value => value.split('.').slice(0, -1).join('.'))].filter(Boolean);
  return tables.some(table => normalize(table) === qualifier
      || parts.length === 1 && normalize(table).split('.').at(-1) === qualifier)
    && labels.some(label => normalize(label).split('.').at(-1) === column);
}

/**
 * @param {string} question
 * @param {{symbols?: Array<{name: string}>}} [metadata] Already scoped catalog declarations.
 * @returns {Context}
 */
export function parseOwaQuestion(question, { symbols = [] } = {}) {
  question = String(question ?? '');
  const normalizedQuestion = normalize(question);
  const tokens = unique(normalizedQuestion.match(/[\p{L}\p{N}_]+/gu) || []);
  const qualifiedMentions = [...question.matchAll(/(?<![\p{L}\p{N}_])OWAOntology\.[\p{L}\p{N}_-]+(?:\.[\p{L}\p{N}_-]+)*/giu)];
  if (/\b(?:proces\w*|workflow|encj\w*)\b/.test(normalizedQuestion)) {
    qualifiedMentions.push(...question.matchAll(/(?<![\p{L}\p{N}_])[A-Z][A-Z0-9]*(?:_+[A-Z0-9]+){2,}(?![\p{L}\p{N}_])/gu));
  }
  const qualifiedIds = unique(qualifiedMentions.map(match => match[0]));
  const fieldMentions = [];
  for (const match of question.matchAll(/`([^`\n]+)`|"([^"\n]+)"|'([^'\n]+)'|„([^”\n]+)”|\[([^\]\n]+)\]|(?<![\p{L}\p{N}_])[\p{L}_][\p{L}\p{N}_]*(?:\.[\p{L}_][\p{L}\p{N}_]*){2,}|(?<![\p{L}\p{N}_])[\p{L}_][\p{L}\p{N}_]*\.[\p{L}][\p{L}\p{N}]*_[\p{L}\p{N}_]+|(?<![\p{L}\p{N}_])[\p{L}][\p{L}\p{N}]*_[\p{L}\p{N}_]+/gu)) {
    if (qualifiedMentions.some(id => match.index >= id.index && match.index + match[0].length <= id.index + id[0].length)) continue;
    const name = (match.slice(1).find(Boolean) || match[0]).trim();
    if (/^[\p{L}_][\p{L}\p{N}_.]*$/u.test(name) && !qualifiedIds.includes(name)) fieldMentions.push(name);
  }
  // Optional request-local declarations. Never mutate the shared legacy code set.
  const declaredSymbols = new Set(symbols.map(symbol => normalize(symbol.name)).filter(Boolean));
  const documentCodes = tokens.filter(token => DOCUMENT_CODES.has(token) || declaredSymbols.has(token)).map(token => token.toUpperCase());
  const facets = [];
  const facetPatterns = {
    overview: /\b(?:czym jest|co opisuje|opisz encj\w*)\b/,
    identifiers: /\b(?:identyfikator\w*|klucz\w*|identity|identifier\w*|id)\b/,
    roles: /\b(?:rol[aei]|rolom|roles?|odbiorc\w*|dostawc\w*|nabywc\w*|sprzedawc\w*)\b/,
    prices: /\b(?:cen|cen[ayie]|cenach|cenami|cenowy\w*|walut\w*|prices?|pricing)\b/,
    fields: /\b(?:pol[aeu]|polach|polami|kolumn\w*|mapowani\w*|fields?|mssql|api)\b/,
    relations: /\b(?:relacj\w*|powiazan\w*|join|foreign key|fk|predykat\w*|relations?)\b/,
    cardinality: /\b(?:kardynaln\w*|licznosc\w*|cardinality)\b/,
    workflow: /\b(?:workflow|proces\w*|przebieg\w*|obieg\w*|ograniczen\w*|przeksztalc\w*)\b/,
    unknownEnums: /\b(?:enum\w*|(?:dopuszczaln\w*|slownik\w*|lista) wartosc\w*|unknown|nieznan\w*|do potwierdzenia)\b/,
  };
  for (const [facet, pattern] of Object.entries(facetPatterns)) {
    if (pattern.test(normalizedQuestion)) facets.push(facet);
  }
  // Instrumental price nouns in a JOIN/cardinality question name relation
  // endpoints. They do not ask for price values for every mentioned entity.
  if (facets.includes('relations') && facets.includes('cardinality') && /\bcenami\b/.test(normalizedQuestion)
      && !/\b(?:wartosc\w*|kwot\w*|netto|brutto|walut\w*|marz\w*|narzut\w*)\b/.test(normalizedQuestion)) {
    const index = facets.indexOf('prices');
    if (index >= 0) facets.splice(index, 1);
  }
  if (fieldMentions.length && !facets.includes('fields')) facets.push('fields');
  const generalStatus = /\b(?:stan\w*|status\w*)\b.*\bdokument\w*\b|\bdokument\w*\b.*\b(?:stan\w*|status\w*)\b/.test(normalizedQuestion);
  const statusAxis = /\b(?:platn\w*|ksiegow\w*|obieg\w*|magazyn\w*)\b/.test(normalizedQuestion);
  const unspecifiedType = /\b(?:nie poda\w*|bez|brak)\b[^.!?]*\btyp\w* dokument\w*/.test(normalizedQuestion);
  const unspecifiedOperation = unspecifiedType && /\bdokument\w*\b/.test(normalizedQuestion)
    && /\b(?:operacj\w*|zamkn\w*|(?:nie)?rozlicz\w*|zatwierdz\w*)\b/.test(normalizedQuestion);
  if ((generalStatus && (!statusAxis || unspecifiedType) || unspecifiedOperation) && !documentCodes.length && !qualifiedIds.length) facets.push('statusAmbiguity');
  return { question, normalizedQuestion, explicitOwa: isExplicitOwaQuestion(question), tokens,
    qualifiedIds, fieldNames: unique(fieldMentions), documentCodes, documentPaths: owaDocumentPaths(question), facets };
}

// Whole metadata labels only. Inflection is a small closed set of complete word
// endings, never a prefix/stem search; short names and technical IDs stay literal.
function wordPattern(word) {
  if (!/^[a-z]{5,}$/.test(word)) return escape(word);
  let stem = word, endings = [''];
  const softened = [];
  if (/[ck]i$/.test(word)) {
    stem = word.slice(0, -1);
    endings = ['i', 'iego', 'iemu', 'im', 'a', 'iej', 'ie', 'ich', 'imi'];
  } else if (/[nwl][ye]$/.test(word)) {
    stem = word.slice(0, -1);
    endings = ['y', 'ego', 'emu', 'ym', 'a', 'ej', 'e', 'ych', 'ymi'];
  } else if (/nie$/.test(word)) {
    stem = word.slice(0, -2);
    endings = ['ie', 'ia', 'iu', 'iem'];
  } else if (/owa$/.test(word)) {
    stem = word.slice(0, -1);
    endings = ['a', 'ej', 'e', 'ego', 'ym', 'ych', 'ymi'];
  } else if (/a$/.test(word)) {
    stem = word.slice(0, -1);
    endings = ['a', 'y', 'i', 'e', 'ie', 'om', 'ami', 'ach'];
    if (/[nw]$|[sc]k$/.test(stem)) endings.push('ej', 'ych', 'ymi');
    if (/r$/.test(stem)) softened.push(`${stem}ze`);
  } else if (/[bcdfghjklmnpqrstvwxyz]$/.test(word)) {
    endings = ['', 'a', 'u', 'owi', 'em', 'iem', 'ie', 'y', 'ow', 'om', 'ami', 'ach'];
    const softEndings = { t: ['cie', 'ci'], d: ['dzie'], r: ['rze'], k: ['cy'] };
    for (const ending of softEndings[word.at(-1)] || []) softened.push(word.slice(0, -1) + ending);
  }
  return `(?:${escape(stem)}(?:${endings.join('|')})${softened.map(form => `|${escape(form)}`).join('')})`;
}

// Read only the literal prefix shared by every branch of wordPattern's closed
// grammar. Unknown future pattern shapes have no usable necessary condition.
function requiredWordLiteral(word, pattern) {
  const generated = /^\(\?:([a-z]+)\(\?:[a-z|]*\)((?:\|[a-z]+)*)\)$/.exec(pattern);
  if (!generated) return pattern === escape(word) ? word : '';
  let prefix = generated[1];
  for (const alternative of generated[2].split('|').slice(1)) {
    let length = 0;
    while (length < prefix.length && prefix[length] === alternative[length]) length++;
    prefix = prefix.slice(0, length);
  }
  return prefix;
}

function mentions(text, label, inflect = false, opaque = false) {
  if (!label) return [];
  // Necessary negatives only: every potential match still passes the
  // authoritative Unicode/opaque boundary grammar below.
  if (!inflect && !text.includes(label)) return [];
  let pattern;
  if (inflect) {
    const words = label.split(/\s+/), patterns = words.map(wordPattern);
    if (words.some((word, i) => {
      const literal = requiredWordLiteral(word, patterns[i]);
      return literal && !text.includes(literal);
    })) return [];
    pattern = patterns.join('\\s+');
  } else pattern = escape(label);
  const boundary = opaque ? '\\p{L}\\p{N}_.:-' : '\\p{L}\\p{N}_';
  // Terminal periods/colons delimit requests; .Child or :Child extends an ID.
  const end = opaque ? '(?![\\p{L}\\p{N}_-]|[.:][\\p{L}\\p{N}_.:-])' : `(?![${boundary}])`;
  return [...text.matchAll(new RegExp(`(?<![${boundary}])${pattern}${end}`, 'gu'))]
    .map(match => ({ start: match.index, end: match.index + match[0].length }));
}

// Share the bounded metadata-label grammar with request-local semantic catalogs.
// Exact IDs preserve case; natural labels use the same conservative inflections.
export function owaMetadataMentions(text, label, { inflect = false, exact = false } = {}) {
  return mentions(exact ? String(text) : normalize(text), exact ? String(label) : normalize(label), inflect, exact);
}

// Private resolver context: exact raw string tuples only, never ambient or shared
// across requests. Admission stops at either cap; uncached calls keep full grammar.
export function createOwaMentionContext({ maxEntries = 8192, maxCharacters = 4194304 } = {}) {
  const entries = new Map();
  const entryLimit = Math.min(8192, maxEntries), characterLimit = Math.min(4194304, maxCharacters);
  let retained = 0;
  return {
    mentions(text, label, { inflect = false, exact = false } = {}) {
      // Coercible objects can be stateful/reentrant; retain their original evaluation.
      if (typeof text !== 'string' || typeof label !== 'string' || text.length + label.length > characterLimit) {
        return owaMetadataMentions(text, label, { inflect, exact });
      }
      const key = JSON.stringify([text, label, Boolean(inflect), Boolean(exact)]);
      let spans = entries.get(key);
      if (!spans) {
        spans = owaMetadataMentions(text, label, { inflect, exact });
        const size = key.length + spans.length * 32;
        if (entries.size < entryLimit && retained + size <= characterLimit) {
          entries.set(key, spans);
          retained += size;
        }
      }
      return spans.map(span => ({ ...span }));
    },
    clear() { entries.clear(); retained = 0; },
  };
}

function aliases(value) {
  if (Array.isArray(value)) return value;
  const text = String(value || '').trim();
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.filter(item => typeof item === 'string');
    } catch { /* Non-JSON aliases still use the export's delimited text format. */ }
  }
  return text.split(/[;,|\n]/).map(label => label.trim().replace(/^`|`$/g, '')).filter(Boolean);
}

/**
 * Resolve only from supplied entity/field metadata. No I/O, ID rewriting,
 * source-body guesses or fabricated qualified identities.
 * @param {Context} context
 * @param {ParsedRow[]} entityRows Entity rows and any available field rows.
 * @returns {{ownerIds: string[], identityMatches: Array<{ownerId: string, kind: string}>, missing: boolean}}
 */
export function resolveOwaOwners(context, entityRows) {
  const entities = entityRows.filter(row => row.fields?.id && !row.fields.entityRefId
    && row.fields.semanticType !== 'workflow_pattern' && !/(?:^|\/)workflow_pattern\.csv$/.test(row.artifact || '')
    && (row.fields.semanticType === 'ontology_entity' || /(?:^|\/)ontology_entity\.csv$/.test(row.artifact || '')
      || row.fields.canonicalName || row.fields.ontologyId));
  const idOwners = new Map();
  for (const { fields } of entities) {
    for (const id of [fields.id, fields.ontologyId].filter(Boolean)) {
      const owners = idOwners.get(id) || [];
      if (!owners.includes(fields.id)) owners.push(fields.id);
      idOwners.set(id, owners);
    }
  }
  // Qualified labels are identities only when declared literally in metadata.
  // Keep them separate from ID references used to establish field ownership.
  const exactIdentities = entities.flatMap(({ fields }) => [
    ['id', fields.id], ['ontologyId', fields.ontologyId],
    ...[['canonicalName', fields.canonicalName], ['name', fields.name],
      ...aliases(fields.aliases).map(label => ['alias', label])]
      .filter(([, value]) => context.qualifiedIds.includes(value)),
  ].map(([kind, value]) => ({ ownerId: fields.id, kind, value })));
  const missingId = context.qualifiedIds.some(id => !exactIdentities.some(identity => identity.value === id));
  const candidates = [];
  let labelQuestion = context.question;
  for (const { ownerId, kind, value } of exactIdentities) {
    for (const span of mentions(context.question, value, false, true)) {
      candidates.push({ ownerId, kind, ...span, exact: true });
      labelQuestion = labelQuestion.slice(0, span.start) + ' '.repeat(span.end - span.start) + labelQuestion.slice(span.end);
    }
  }
  // An unresolved qualified request must not turn into a nearby name lookup.
  if (!missingId) {
    const normalized = normalize(labelQuestion);
    for (const { fields } of entities) {
      const labels = [['canonicalName', fields.canonicalName], ['name', fields.name],
        ...aliases(fields.aliases).map(label => ['alias', label]), ['mainTable', fields.mainTable]];
      for (const value of [fields.canonicalName, fields.name].filter(Boolean)) {
        const parenthetical = /^([^()]+?)\s*\(([^()]+)\)$/.exec(value);
        if (!parenthetical) continue;
        labels.push(['baseName', parenthetical[1].trim()]);
        if (DOCUMENT_CODES.has(normalize(parenthetical[2]))) labels.push(['documentCode', parenthetical[2].trim()]);
      }
      for (const [kind, value] of labels) {
        const label = normalize(value).trim();
        for (const span of mentions(normalized, label, kind !== 'mainTable' && !/[_.]/.test(label))) {
          candidates.push({ ownerId: fields.id, kind, ...span });
        }
      }
    }
    const namedOwners = new Set(candidates.map(candidate => candidate.ownerId));
    for (const { fields = {} } of entityRows) {
      const owners = idOwners.get(fields.entityRefId) || [];
      for (const ownerId of owners) {
        // Named owners establish scope before a shared unqualified column can
        // infer an unrelated owner. With no named scope, fields may resolve it.
        if (namedOwners.size && !context.facets.includes('relations') && !context.facets.includes('cardinality')
            && !namedOwners.has(ownerId)) continue;
        const owner = entities.find(row => row.fields.id === ownerId)?.fields;
        const labels = context.fieldNames.length ? context.fieldNames.filter(name => matchesOwaField(name, fields, owner))
          : context.facets.includes('fields') ? ['fieldName', 'mssqlColumn', 'mcpField'].map(key => fields[key]).filter(Boolean) : [];
        for (const label of labels) for (const span of mentions(normalized, normalize(label))) {
          candidates.push({ ownerId, kind: 'fieldName', ...span });
        }
      }
    }
  }
  // Prefer complete longer labels over their nested generic names. Equal spans
  // keep all competing owners; no arbitrary tie-breaking by row order.
  const selected = candidates.filter(candidate => !candidates.some(other =>
    other.start <= candidate.start && other.end >= candidate.end
      && (other.start < candidate.start || other.end > candidate.end
        || other.kind === 'documentCode' && candidate.kind !== 'documentCode' && !candidate.exact)));
  selected.sort((a, b) => a.start - b.start || Number(Boolean(b.exact)) - Number(Boolean(a.exact)));
  const identityMatches = [];
  for (const { ownerId, kind } of selected) {
    if (!identityMatches.some(match => match.ownerId === ownerId)) identityMatches.push({ ownerId, kind });
  }
  const result = { ownerIds: identityMatches.map(match => match.ownerId), identityMatches,
    missing: missingId || !identityMatches.length };
  // Private span-level ties distinguish competing labels from two deliberately
  // requested owners. Preserve the existing enumerable resolver contract.
  const spans = new Map();
  for (const match of selected) {
    const key = `${match.start}:${match.end}`;
    spans.set(key, [...new Set([...(spans.get(key) || []), match.ownerId])]);
  }
  Object.defineProperty(result, 'ambiguities', { value: [...spans.values()].filter(owners => owners.length > 1) });
  return result;
}
