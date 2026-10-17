import { owaDocumentPaths } from './owa_query_context.mjs';

/**
 * @typedef {object} Catalog
 * @property {object[]} identities Declared entity/concept/process identities, labels, phrases and origins.
 * @property {object[]} fields Owned metadata or structured source declarations (never verified SQL facts).
 * @property {object[]} relations Literal directed endpoint references, including unresolved references.
 * @property {object[]} workflows Declared process IDs and ordered paths.
 * @property {object[]} symbols Owned name/classification declarations with literal statuses.
 * @property {Map<string, object[]>} references Namespace + literal id/ontologyId index; no alias references.
 */

const fold = value => String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '')
  .replace(/ł/g, 'l').replace(/Ł/g, 'L').toLowerCase();
const clean = value => String(value ?? '').trim().replace(/^`|`$/g, '');
const list = value => {
  if (Array.isArray(value)) return value.filter(v => typeof v === 'string');
  try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) return list(parsed); } catch { /* delimited export */ }
  return String(value || '').split(/[;,|\n]/).map(clean).filter(Boolean);
};
const refKey = (namespace, id) => JSON.stringify([namespace, id]);
const statusOf = fields => fields.status ?? fields.mappingStatus ?? fields.verificationStatus ?? null;
const locator = (origin, bodyField = null, line = null, section = null) => ({
  artifact: origin.artifact, contentHash: origin.contentHash, csvLine: origin.line,
  csvEndLine: origin.endLine, bodyField, line, section,
});

function rowKind(row) {
  const f = row.fields || {}, type = `${f.semanticType || ''} ${row.artifact || ''}`;
  if (/ontology_field/.test(type) || f.entityRefId && f.fieldName) return 'field';
  if (/workflow_pattern/.test(type) || f.workflowName) return 'process';
  if (/ontology_relation/.test(type) || f.sourceEntityRefId || f.targetEntityRefId) return 'relation';
  if (/ontology_entity/.test(type) || f.ontologyId || f.canonicalName) return 'entity';
  if (/business_(?:description|rule|domain)|code_meaning/.test(type)) return 'concept';
  return null;
}

function identityLabels(fields) {
  return [['id', fields.id], ['ontologyId', fields.ontologyId], ['name', fields.name],
    ['canonicalName', fields.canonicalName], ['title', fields.title], ['workflowName', fields.workflowName],
    ['mainTable', fields.mainTable], ...list(fields.aliases).map(value => ['alias', value])]
    .filter(([, value]) => typeof value === 'string' && value.trim())
    .map(([kind, value]) => ({ kind, value, exact: ['id', 'ontologyId'].includes(kind)
      || /[_.:]|^[A-Z\d-]{2,}$/.test(value) }));
}

// Bounded candidate text only, never an assertion or an inferred table owner.
function sourcePhrases(origin) {
  return ['description', 'descriptionPreview', 'content', 'sectionHeading'].flatMap(bodyField => {
    const text = origin.fields[bodyField];
    if (typeof text !== 'string') return [];
    return text.split('\n').flatMap((line, index) => line.split(/[.!?](?:\s|$)/).flatMap(text => {
      // Facet headings describe document structure, not candidate identities.
      if (/^#{1,6}\s/.test(text)) return [];
      text = text.trim();
      if (!text || /^\s*\|/.test(text)) return [];
      return [{ text, origin, locator: locator(origin, bodyField, index + 1) }];
    }));
  });
}

/**
 * Request-local source declarations, not verified SQL facts. References are
 * literal id/ontologyId within the same namespace; aliases never bind FKs.
 * @param {import('./owa_query_context.mjs').ParsedRow[]} rows
 * @param {Set<string>} allowed
 * @returns {Catalog}
 */
export function buildSemanticCatalog(rows, allowed) {
  const catalog = { identities: [], fields: [], relations: [], workflows: [], symbols: [], references: new Map() };
  // Do not even inspect excluded row.fields (including when scope is empty).
  const selected = rows.filter(row => allowed.has(row.namespace));
  const identities = selected.filter(row => ['entity', 'concept', 'process'].includes(rowKind(row)) && row.fields.id);
  for (const origin of identities) {
    const f = origin.fields;
    const identity = { id: f.id, namespace: origin.namespace, kind: rowKind(origin),
      name: f.canonicalName || f.workflowName || f.name || f.id, mainTable: f.mainTable,
      labels: identityLabels(f), phrases: sourcePhrases(origin), origin, locator: locator(origin),
      tables: f.mainTable ? [{name:f.mainTable,origin,locator:locator(origin)}] : [] };
    catalog.identities.push(identity);
    for (const id of new Set([f.id, f.ontologyId].filter(Boolean))) {
      const key = refKey(origin.namespace, id);
      catalog.references.set(key, [...(catalog.references.get(key) || []), identity]);
    }
  }
  const owners = (origin, id) => catalog.references.get(refKey(origin.namespace, id)) || [];
  for (const origin of selected) {
    const f = origin.fields || {}, kind = rowKind(origin);
    if (kind === 'field') for (const owner of owners(origin, f.entityRefId)) {
      catalog.fields.push({ id: f.id, name: f.fieldName || f.mssqlColumn || f.name,
        ownerId: owner.id, owner, fields: f, keyRole: f.keyRole || null,
        status: statusOf(f), text: f.description || '', origin, locator: locator(origin), declaration: 'metadata' });
    }
    if (kind === 'relation' || kind === 'process') {
      const endpointRefIds = [f.sourceEntityRefId, f.targetEntityRefId].filter(Boolean);
      const endpoints = endpointRefIds.map(id => owners(origin, id));
      const entry = { id: f.id, endpointRefIds,
        endpointOwnerIds: [...new Set(endpoints.flat().map(owner => owner.id))],
        sourceOwnerIds: owners(origin, f.sourceEntityRefId).map(owner => owner.id),
        targetOwnerIds: owners(origin, f.targetEntityRefId).map(owner => owner.id),
        unresolvedEndpointIds: endpointRefIds.filter((id, i) => !endpoints[i].length),
        status: statusOf(f), origin, locator: locator(origin) };
      if (kind === 'process') catalog.workflows.push({ ...entry, documentPaths: owaDocumentPaths(f.description || '') });
      else catalog.relations.push(entry);
    }
  }
  for (const owner of catalog.identities) {
    const identityOrigin = owner.origin, f = identityOrigin.fields;
    // Only literal, unique same-namespace references can contribute declarations.
    const sources = [identityOrigin, ...selected.filter(row => rowKind(row) === null
      && row.fields.sourceDocumentRefId && owners(row, row.fields.sourceDocumentRefId).length === 1
      && owners(row, row.fields.sourceDocumentRefId)[0] === owner)];
    owner.phrases.push(...sources.slice(1).flatMap(sourcePhrases));
    const nameSymbols = [];
    let origin = identityOrigin;
    const addTable = (name, location) => {
      name = clean(name);
      if (/^[\p{L}_][\p{L}\p{N}_]*(?:\.[\p{L}_][\p{L}\p{N}_]*)*$/u.test(name)
          && !owner.tables.some(t=>t.name===name&&t.origin===origin)) owner.tables.push({name,origin,locator:location});
    };
    const addSymbol = (name, classification, status, text, location) => {
      if (!/^[\p{L}\p{N}_-]{2,24}$/u.test(name)) return;
      catalog.symbols.push({ name, ownerId: owner.id, owner, classification: classification || null,
        status, text, origin, locator: location, declaration: 'source' });
    };
    if (f.classification) for (const label of owner.labels.filter(l => ['name', 'canonicalName', 'alias'].includes(l.kind))) {
      if (/^[A-Z][A-Z\d_-]{1,23}$/.test(label.value)) {
        addSymbol(label.value, f.classification, statusOf(f), label.value, locator(origin));
      }
    }
    for (const value of [f.name, f.canonicalName].filter(Boolean)) {
      const terminal = /^(.+\s+.+?)\s+([A-Z][A-Z\d_-]{1,23})$/.exec(value);
      if (terminal && owner.kind === 'entity') {
        if (!owner.labels.some(l => l.kind === 'baseName' && l.value === terminal[1])) owner.labels.push({ kind: 'baseName', value: terminal[1], exact: false });
        nameSymbols.push([terminal[2], f.classification, statusOf(f), value, locator(origin)]);
      }
      const match = /^(.+?)\s*\(([^()]+)\)$/.exec(value);
      if (!match) continue;
      if (!owner.labels.some(l => l.kind === 'baseName' && l.value === match[1])) {
        owner.labels.push({ kind: 'baseName', value: match[1].trim(), exact: false });
        if (/^[A-Z][A-Z\d_-]{1,23}$/.test(match[2])) nameSymbols.push([match[2], f.classification, statusOf(f), value, locator(origin)]);
      }
    }
    if (f.symbol) addSymbol(f.symbol, f.classification, statusOf(f), f.symbol, locator(origin));
    for (origin of sources) for (const bodyField of ['description', 'content']) {
      const lines = String(origin.fields[bodyField] || '').split('\n');
      let section = null, headers = null;
      const addField = (name, keyRole, status, text, line) => {
        if (!/^[\p{L}_][\p{L}\p{N}_.]*$/u.test(name)) return;
        catalog.fields.push({ name, ownerId: owner.id, owner, fields: { fieldName: name },
          keyRole: keyRole || null, status, text, origin, declaration: 'source',
          locator: locator(origin, bodyField, line, section) });
      };
      for (let i = 0; i < lines.length; i++) {
        const text = lines[i], heading = /^#{1,6}\s+(.+)/.exec(text);
        if (heading) { section = heading[1]; headers = null; continue; }
        if (/^\s*\|/.test(text)) {
          const cells = text.trim().replace(/^\||\|$/g, '').split('|').map(clean);
          if (cells.every(cell => /^:?-{3,}:?$/.test(cell))) continue;
          if (!headers) { headers = cells.map(fold); continue; }
          if (cells.length !== headers.length) continue;
          const value = (...keys) => cells[headers.findIndex(h => keys.includes(h))] || null;
          const table = value('tabela lub obiekt','tabela','table');
          const role = fold(value('rola zrodla','rola','role') || '');
          if (table && (/^(?:tabela glowna|main table)$/.test(role) || owner.labels.some(l=>fold(l.value)===fold(table)
              || fold(l.value)===fold(table.split('.').at(-1))))) {
            const schema=value('schemat','schema');
            addTable(schema&&!table.includes('.') ? `${schema}.${table}` : table,locator(origin,bodyField,i+1,section));
          }
          const name = value('pole', 'kolumna', 'kolumna mssql', 'field', 'fieldname', 'mssqlcolumn');
          if (name) addField(name, value('typ', 'rola', 'keyrole'), value('status', 'mappingstatus'), text, i + 1);
          const symbol = value('symbol');
          const namedSubject = value('nazwa', 'name');
          // A dictionary row naming another document is a reference, not a
          // self-declaration that turns the dictionary owner into that document.
          if (symbol && (!namedSubject || owner.labels.some(label => fold(label.value) === fold(namedSubject)))) addSymbol(symbol, value('klasyfikacja', 'classification', 'typ'), value('status'), text,
            locator(origin, bodyField, i + 1, section));
        } else {
          headers = null;
          const mainTable = /^\s*-\s*\*\*Tabela g[łl][oó]wna\*\*:\s*`([^`]+)`/iu.exec(text)?.[1];
          const listedTable = fold(section)==='tabele mssql' ? /^\s*-\s*`([^`]+)`/.exec(text)?.[1] : null;
          if (mainTable || listedTable) addTable(mainTable || listedTable,locator(origin,bodyField,i+1,section));
          // A named declaration is required. A paragraph mentioning a field is not one.
          const sourceBullet = /^\s*[-*]\s+`([\p{L}_][\p{L}\p{N}_.]*)`\s*(.*)$/u.exec(text);
          if (sourceBullet && /pol|kolumn|identyfikator|regu[łl]/iu.test(section || '')) {
            const [, name, tail] = sourceBullet;
            addField(name, /\bPK\b/.test(tail) ? 'PK' : /\bFK\b/.test(tail) ? 'FK' : null,
              /\bUNKNOWN\b[^\]]*/i.exec(tail)?.[0] || null, text, i + 1);
          }
          const bullet = /^\s*(?:[-*]\s+)?(PK|FK|Pole|Kolumna|Field|Symbol)\s*:\s*(`[^`]+`|[\p{L}_][\p{L}\p{N}_.-]*)(.*)$/iu.exec(text);
          if (!bullet) continue;
          const [, type, token, tail] = bullet;
          const status = /(?:Status|MappingStatus)\s*:\s*([^;]+)/i.exec(tail)?.[1]?.trim() || null;
          if (fold(type) === 'symbol') addSymbol(clean(token), /(?:Klasyfikacja|Classification)\s*:\s*([^;]+)/i.exec(tail)?.[1]?.trim(),
            status, text, locator(origin, bodyField, i + 1, section));
          else addField(clean(token), /^(?:PK|FK)$/i.test(type) ? type : null, status, text, i + 1);
        }
      }
    }
    origin = identityOrigin;
    for (const declaration of nameSymbols) addSymbol(...declaration);
  }
  // A name such as "Transformation ABC" declares its head and literal target
  // code. Resolve that code only through another allowed owner's declared name;
  // this creates private recognition evidence, not a new stored alias or fact.
  for (const owner of catalog.identities) {
    owner.compositions = [];
    for (const label of owner.labels.filter(l => !l.exact)) {
      const parts = /^(.+?)\s+([A-Z][A-Z\d_-]{1,23})$/.exec(label.value);
      if (!parts) continue;
      for (const symbol of catalog.symbols.filter(s => s.name === parts[2] && s.owner !== owner && s.owner.namespace === owner.namespace)) {
        const targetLabels = symbol.owner.labels.filter(l => ['baseName', 'alias'].includes(l.kind) && !l.exact && /\s/.test(l.value));
        for (const target of targetLabels) {
          const values = [target.value];
          const [head, ...tail] = target.value.split(/\s+/);
          if (tail.length && catalog.identities.some(other => other !== symbol.owner && other.namespace === owner.namespace
            && other.labels.some(l => l.kind === 'baseName' && l.value.startsWith(head + ' ')))) values.push(tail.join(' '));
          for (const value of values) owner.compositions.push({ value: `${parts[1]} ${value}`, origin: owner.origin,
            locator: owner.locator, targetOrigin: symbol.origin, targetLocator: symbol.locator, targetIdentityOrigin:symbol.owner.origin });
        }
      }
    }
  }
  return catalog;
}
