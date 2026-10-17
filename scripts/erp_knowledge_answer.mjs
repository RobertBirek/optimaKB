#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  buildResponse,
  classifyQuestion,
  loadRouting,
  normalizeText,
} from './erp_knowledge_assistant.mjs';
import {
  buildExternalCitationBlock,
  createExternalKnowledgeDraft,
  recordExternalFallback,
  searchExternalSources,
} from './lib/external_search.mjs';
import { shouldUseExternalFallback } from './lib/external_search_policy.mjs';
import {
  DOCUMENT_CODES, MAX_SNIPPET_LENGTH, containsTerm, findTermIndex, getSourceFields,
  makeBodyPreview, parseCsvRecords, selectEvidence,
} from './lib/knowledge_retrieval.mjs';
import { parseOwaQuestion } from './lib/owa_query_context.mjs';
import { semanticCandidateNamespaces } from './lib/semantic_request_intent.mjs';
import { buildSemanticCatalog } from './lib/semantic_catalog.mjs';
import { buildSemanticRequestPlan } from './lib/semantic_requirements.mjs';
import { budgetSemanticUnits, semanticConceptUnits } from './lib/semantic_evidence.mjs';
import { assessOwaCoverage, reconcileOwaOmissions, selectOwaEvidence } from './lib/owa_evidence.mjs';
import { describeLocalSource } from './lib/local_source_provenance.mjs';
import { renderCompactOwaAnswer } from './lib/owa_answer_presentation.mjs';
import {
  computeConfidenceScore,
  CONFIDENCE_LOW_THRESHOLD,
  recordLearningGap,
} from './lib/learning.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';
const STOPWORDS = new Set([
  'a', 'aby', 'albo', 'ale', 'api', 'bez', 'co', 'czy', 'dla', 'do', 'gdzie',
  'i', 'ich', 'jak', 'jakie', 'jaki', 'jest', 'kiedy', 'ktore', 'ktory', 'lub',
  'na', 'nad', 'nie', 'od', 'oraz', 'po', 'pod', 'przy', 'sie', 'sql', 'to',
  'u', 'w', 'we', 'z', 'za', 'ze',
  'pokaz', 'ontologia', 'ontologii', 'encja', 'encji', 'mapowanie', 'mapuje',
  'mcp', 'mssql', 'owa',
]);

export function extractTerms(question) {
  const normalized = normalizeText(question);
  const versions = [...normalized.matchAll(/(?<![a-z0-9_.])\d+(?:\.\d+){2,}(?![a-z0-9_]|\.\d)/g)].map(match => match[0]);
  const tokens = normalized
    .split(/[^a-z0-9_]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.length >= 3 || DOCUMENT_CODES.has(token))
    .filter((token) => !STOPWORDS.has(token));
  return [...new Set([...tokens, ...versions])];
}

export function extractFocusHints(question) {
  const normalizedQuestion = normalizeText(question);
  const hints = [...normalizedQuestion.matchAll(/\b(?:cdn|dbo)\.[a-z0-9_]+\b/g)].map((match) => match[0]);
  const patterns = [
    /encj[aiy]?\s+(.+?)\s+i\s+mapowan/,
    /dla\s+encj[aiy]?\s+(.+?)\s+i\s+mapowan/,
    /ontologi[ai]\s+owa\s+dla\s+encj[aiy]?\s+(.+?)\s+i\s+mapowan/,
  ];
  for (const pattern of patterns) {
    const match = normalizedQuestion.match(pattern);
    if (!match) continue;
    const value = String(match[1] || '').trim();
    if (value) hints.push(value);
  }
  return [...new Set(hints)];
}

function resolveArtifactPath(relativePath) {
  if (typeof relativePath !== 'string' || relativePath.includes('\\')
      || relativePath.split('/').some(part => part === '..' || part === '.')) return null;
  try {
    const base = fs.realpathSync(ROOT);
    const file = fs.realpathSync(path.resolve(base, relativePath));
    return file.startsWith(`${base}${path.sep}`) ? file : null;
  } catch { return null; }
}

function scoreLine(lineNormalized, terms, focusHints = []) {
  let score = 0;
  for (const term of terms) {
    if (containsTerm(lineNormalized, term)) {
      score += DOCUMENT_CODES.has(term) || /^\d+(?:\.\d+){2,}$/.test(term) ? 8 : term.length > 6 ? 2 : 1;
      continue;
    }
    if (term.length >= 8 && !/^\d+(?:\.\d+){2,}$/.test(term)) {
      const stem = term.slice(0, 5);
      if (stem && lineNormalized.includes(stem)) {
        score += 1;
      }
    }
  }
  for (const hint of focusHints) {
    if (!hint) continue;
    if (containsTerm(lineNormalized, hint)) {
      score += 8;
      continue;
    }
    const hintTokens = hint.split(/[^a-z0-9_]+/).filter(Boolean);
    if (hintTokens.length && hintTokens.every((token) => lineNormalized.includes(token))) {
      score += 4;
    }
  }
  return score;
}

export function scanArtifact(relativePath, terms, focusHints = [], limit = 4, collectSiblings = false, requestContext = null) {
  const filePath = resolveArtifactPath(relativePath);
  if (!filePath || !fs.existsSync(filePath)) {
    return { artifact: relativePath, type: 'missing', hits: [] };
  }

  const stats = fs.statSync(filePath);
  if (stats.isDirectory()) {
    return { artifact: relativePath, type: 'directory', hits: [] };
  }

  const bytes = fs.readFileSync(filePath);
  const raw = bytes.toString('utf8');
  const contentHash = `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
  const observedAt = new Date().toISOString();
  const isCsv = path.extname(relativePath).toLowerCase() === '.csv';
  const parsed = isCsv ? parseCsvRecords(raw) : null;
  const records = parsed ? parsed.records : raw.split('\n').map((text, index) => ({ text, line: index + 1, endLine: index + 1 }));
  const hits = [];
  const siblingHits = [];
  const owaRows = requestContext?.context && isCsv
    && (requestContext.namespace === 'OWAOntology' || requestContext.context.semanticIntent) ? [] : null;

  for (const record of records) {
    const text = (record.cells ? record.cells.join(' | ') : record.text).replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const normalized = normalizeText(text);
    const score = scoreLine(normalized, terms, focusHints);
    const body = isCsv ? getSourceFields(parsed.columns, record, relativePath, requestContext) : null;
    if (owaRows) owaRows.push({ namespace: requestContext.namespace, artifact: relativePath,
      contentHash, observedAt, line: record.line, endLine: record.endLine,
      fields: body.fields, bodyField: body.bodyField, bodyText: body.bodyText,
      source: body.source, score, matchedTerms: terms.filter(term => containsTerm(normalized, term)) });
    if (collectSiblings && requestContext?.namespace !== 'OWAOntology' && body?.source.sourceUrl && body.source.owningPath) {
      siblingHits.push({ line: record.line, endLine: record.endLine, score,
        bodyField: body.bodyField, bodyText: body.bodyText, source: body.source });
    }
    if (score <= 0 || limit <= 0 || (hits.length >= limit && score <= hits.at(-1).score)) continue;
    const matchedTerms = terms.filter(term => containsTerm(normalized, term));
    let presentation;
    if (body) {
      presentation = {
        recordId: body.source.recordId,
        bodyField: body.bodyField,
        bodyText: body.bodyText,
        source: body.source,
        ...makeBodyPreview(body.bodyText, terms, focusHints, normalizeText),
      };
    } else {
      const anchors = [...focusHints, ...terms.filter(term => DOCUMENT_CODES.has(term))];
      const focus = [...anchors, ...matchedTerms].find(term => containsTerm(normalized, term));
      const offset = focus ? Math.max(0, findTermIndex(normalized, focus) - 60) : 0;
      const prefix = offset ? '...' : '';
      const remainingLength = MAX_SNIPPET_LENGTH - prefix.length;
      const fragment = text.slice(offset, offset + remainingLength);
      presentation = { snippet: prefix + (text.length > offset + remainingLength ? `${fragment.slice(0, -3)}...` : fragment) };
    }
    hits.push({
      line: record.line,
      endLine: record.endLine,
      score,
      matchedTerms,
      ...presentation,
    });
    hits.sort((a, b) => b.score - a.score || a.line - b.line);
    if (hits.length > limit) hits.pop();
  }

  const result = {
    artifact: relativePath,
    type: path.extname(relativePath).slice(1) || 'text',
    hits: hits.slice(0, limit),
    contentHash,
    observedAt,
    warnings: parsed?.warnings || [],
  };
  // Private request-local candidates from this exact permitted artifact only.
  Object.defineProperty(result, 'siblingHits', { value: siblingHits });
  if (owaRows) Object.defineProperty(result, 'owaRows', { value: owaRows });
  return result;
}

function encodeArtifactPath(relativePath) {
  return String(relativePath)
    .replaceAll('\\', '/')
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
}

export function gatherEvidence(response, terms, focusHints = [], allowedNamespaces = null, diagnostics = [], context = null) {
  const evidence = [];
  const scannedSiblings = [];
  const scans = [];
  const scanned = new Set();
  const groups = [
    { kb: response.primaryKb.name, artifacts: response.primaryKb.artifacts || [] },
    ...response.supportKbs.map((kb) => ({ kb: kb.name, artifacts: kb.artifacts || [] })),
  ];

  for (const group of groups) {
    if (allowedNamespaces && !allowedNamespaces.has(group.kb)) continue;
    for (const artifact of group.artifacts) {
      const scanKey = JSON.stringify([group.kb, artifact]);
      if (scanned.has(scanKey)) continue;
      scanned.add(scanKey);
      const requestContext = context && (group.kb === 'OWAOntology' || context.semanticIntent) ? { namespace: group.kb, context } : null;
      const result = scanArtifact(artifact, terms, focusHints, Math.max(3, focusHints.length), true, requestContext);
      scans.push({ kb: group.kb, result });
      if (result.siblingHits?.length) scannedSiblings.push({ kb: group.kb,
        artifact: result.artifact, contentHash: result.contentHash, siblingHits: result.siblingHits });
      for (const code of result.warnings || []) diagnostics.push({ artifact, code });
    }
  }

  // Index all permitted OWA metadata before selecting from any artifact. In
  // particular, an owned zero-score chunk cannot be recovered from lexical top-k.
  let requestPlan = null;
  if (context?.semanticIntent) {
    const allowed = allowedNamespaces || new Set(groups.map(group => group.kb));
    const catalog = buildSemanticCatalog(scans.flatMap(({ result }) => result.owaRows || []), allowed);
    requestPlan = buildSemanticRequestPlan(context.question, context.semanticIntent, catalog);
    Object.defineProperty(evidence, 'requestPlan', { value: requestPlan });
    context = { ...context, documentSymbols: catalog.symbols.map(s => s.name) };
  }
  const owaEnabled = context && groups.some(group => group.kb === 'OWAOntology'
    && (!allowedNamespaces || allowedNamespaces.has(group.kb)));
  const planUsesOwa = requestPlan && (requestPlan.identityBarrier || requestPlan.subjects.some(s => s.namespace === 'OWAOntology')
    || requestPlan.documentPaths.length || requestPlan.ambiguities.some(a => a.candidates.some(c => c.owner.namespace === 'OWAOntology')));
  // Explicit status-axis clarification survives even incidental catalog matches.
  // Merely allowing OWA is not a reason to activate its assessor.
  const legacyClarification = requestPlan && context.explicitOwa && context.facets.includes('statusAmbiguity');
  const rows = scans.flatMap(({ result }) => result.owaRows || []);
  const semanticSelection = requestPlan && !legacyClarification ? selectOwaEvidence(context, rows, requestPlan) : null;
  if (semanticSelection) Object.defineProperty(evidence, 'semanticSelection', { value: semanticSelection });
  const selected = owaEnabled && (!requestPlan || planUsesOwa || legacyClarification)
    ? semanticSelection || selectOwaEvidence(context, rows) : null;
  if (selected) Object.defineProperty(evidence, 'owaSelection', { value: selected });
  const selectedRows = new Set(selected?.candidates);
  for (const { kb, result } of scans) {
    if (requestPlan && (!selected || kb !== 'OWAOntology')) {
      const origins = new Set(requestPlan.subjects.filter(s => s.namespace === kb).map(s => s.origin));
      // Declared Business concepts are valid subjects. Unrelated lexical hits
      // cannot replace an unknown identity or matched OWA owner.
      result.hits = requestPlan.identityBarrier ? [] : (result.owaRows || []).filter(row => origins.has(row)).map(row => {
        const hit = { line: row.line, endLine: row.endLine, score: row.score, matchedTerms: row.matchedTerms,
          recordId: row.fields.id || null, bodyField: row.bodyField, bodyText: row.bodyText, source: row.source,
          ...makeBodyPreview(row.bodyText, terms, focusHints, normalizeText),
        };
        Object.defineProperty(hit, 'owa', { value: { ...(semanticSelection?.metadata.get(row)
          || { ownerIds: [row.fields.id], units: semanticConceptUnits(row) }), row } });
        return hit;
      });
    }
    if (selected && kb === 'OWAOntology') {
      result.hits = (result.owaRows || []).filter(row => selectedRows.has(row)).map(row => {
        const hit = { line: row.line, endLine: row.endLine, score: row.score,
          matchedTerms: row.matchedTerms, recordId: row.fields.id || null,
          bodyField: row.bodyField, bodyText: row.bodyText, source: row.source,
          ...makeBodyPreview(row.bodyText, terms, focusHints, normalizeText) };
        Object.defineProperty(hit, 'owa', { value: { ...selected.metadata.get(row), row } });
        return hit;
      });
    }
    if (result.hits.length) {
      const locator = result.hits.map(hit => hit.endLine > hit.line ? `L${hit.line}-L${hit.endLine}` : `L${hit.line}`).join(',');
      const sourceId = `sha256:${crypto.createHash('sha256')
        .update(`${kb}\0${result.artifact}\0${result.contentHash}`)
        .digest('hex')}`;
      evidence.push({
        kb,
        artifact: result.artifact,
        type: result.type,
        hits: result.hits,
        sourceId,
        uri: `knowledge://legacy/${encodeURIComponent(kb)}/${encodeArtifactPath(result.artifact)}`,
        locator,
        contentHash: result.contentHash,
        observedAt: result.observedAt,
        excerpt: result.hits[0].snippet,
      });
    }
  }

  // Keep even zero-score sibling rows from already scanned allowed artifacts.
  // Non-enumerable request-local candidates never enter the public response.
  for (const item of evidence) {
    Object.defineProperty(item, 'siblingArtifacts', { value: scannedSiblings });
    if (selected && item.kb === 'OWAOntology') Object.defineProperty(item, 'owaSelection', { value: selected });
  }
  return evidence;
}

export function sourceDate(value, basis) {
  const unknown = reason => ({ value: null, precision: null, timezone: null, basis, reason });
  if (!value) return unknown('source_date_unavailable');
  const text = String(value);
  const match = /^(\d{4})-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?)?$/.exec(text);
  if (!match) return unknown('invalid_source_date');
  const [, y, m, d, h, minute, second, zone] = match;
  const year = Number(y), month = Number(m);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (!year || month < 1 || month > 12 || (d && (Number(d) < 1 || Number(d) > days[month - 1]))
      || (h && (Number(h) > 23 || Number(minute) > 59 || Number(second || 0) > 59))
      || (zone && zone !== 'Z' && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4)) > 59))) {
    return unknown('invalid_source_date');
  }
  return { value: text, precision: h ? 'datetime' : d ? 'day' : 'month',
    timezone: h ? zone || 'unspecified' : null, basis, reason: null };
}

export function resolveSourceMetadata(source, namespace, allowedNamespaces, root = ROOT) {
  const unknown = reason => ({ owningDraftId: null,
    publication: { ...sourceDate(null, 'unresolved'), reason },
    update: { ...sourceDate(null, 'unresolved'), reason },
    retrieved: { ...sourceDate(null, 'unresolved'), reason }, dateResolutionReason: reason });
  if (allowedNamespaces && !allowedNamespaces.has(namespace)) return unknown('metadata_path_rejected');
  const value = String(source.owningPath || '');
  if (value.includes('\\') || value.split('/').some(part => part === '..' || part === '.')) {
    return unknown('metadata_path_rejected');
  }
  const promoted = value.includes('knowledge_inbox/promoted') || /promoted/i.test(source.sourceOrigin || '');
  // Positive declarations only; an absent/unknown origin is not evidence of a source date.
  const ordinaryOrigins = new Set(['official', 'community', 'partner', 'local', 'manual']);
  if (!promoted && ordinaryOrigins.has(source.sourceOrigin)) {
    const dates = source.csvDates || {};
    const publication = sourceDate(dates.publishedAt, 'declared_csv_source_date');
    return { owningDraftId: null, publication,
      update: sourceDate(dates.lastModified, 'declared_csv_source_date'),
      retrieved: sourceDate(dates.retrievedAt, 'declared_csv_source_date'),
      dateResolutionReason: publication.reason };
  }
  if (!promoted && !value) return unknown('source_date_unavailable');
  const match = /^docs\/reference\/knowledge_inbox\/promoted\/([^/]+)\/([^/]+)\.(md|json)$/.exec(value);
  if (!match || match[1] !== namespace) {
    return unknown(promoted || value ? 'metadata_path_rejected' : 'source_date_unavailable');
  }
  try {
    const rootBase = fs.realpathSync(root);
    const expectedBase = path.resolve(rootBase, 'docs/reference/knowledge_inbox/promoted');
    const promotedBase = fs.realpathSync(expectedBase);
    if (promotedBase !== expectedBase) return unknown('metadata_path_rejected');
    const namespaceBase = fs.realpathSync(path.resolve(promotedBase, namespace));
    if (path.dirname(namespaceBase) !== promotedBase || path.basename(namespaceBase) !== namespace) {
      return unknown('metadata_path_rejected');
    }
    const file = fs.realpathSync(path.resolve(namespaceBase, `${match[2]}.json`));
    if (path.dirname(file) !== namespaceBase || path.basename(file) !== `${match[2]}.json`) {
      return unknown('metadata_path_rejected');
    }
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > 1024 * 1024) return unknown('metadata_path_rejected');
    const draft = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (draft.id !== match[2] || draft.kbNamespace !== namespace || draft.status !== 'promoted'
        || draft.sourceUrl !== source.sourceUrl) return unknown('metadata_identity_mismatch');
    const metadata = draft.metadata || {};
    const publication = sourceDate(metadata.sourcePublicationDate, 'promoted_source_metadata');
    return { owningDraftId: draft.id, publication,
      update: sourceDate(metadata.sourceUpdatedAt, 'promoted_source_metadata'),
      retrieved: sourceDate(metadata.sourceRetrievedAt || metadata.retrievedAt, 'promoted_source_metadata'),
      dateResolutionReason: publication.reason };
  } catch { return unknown('source_date_unavailable'); }
}

function sourceIdentity(namespace, source, metadata) {
  // Raw observed CSV provenance also separates versions when resolution is unknown.
  const unresolvedVersion = metadata.publication.basis === 'unresolved'
    ? [source.sourceOrigin || null, source.csvDates?.publishedAt || null,
      source.csvDates?.lastModified || null, source.csvDates?.retrievedAt || null] : null;
  return JSON.stringify([namespace, source.sourceUrl, source.owningPath || null,
    metadata, unresolvedVersion]);
}

function coherentUnits(body) {
  // A heading-associated section (including tables/lists) is atomic. Never cut
  // a condition/outcome paragraph at a preview anchor or sentence boundary.
  return String(body || '').replace(/\r\n?/g, '\n').trim()
    .split(/\n(?=#{1,6} )/).flatMap(section => /^#{1,6} /m.test(section)
      ? [section.trim()] : section.split(/\n\s*\n/).map(p => p.trim())).filter(Boolean);
}

function localSourceForHit(item, hit) {
  const row = hit.owa?.row;
  if (!row || item.kb !== row.namespace || item.artifact !== row.artifact
      || item.contentHash !== row.contentHash || hit.line !== row.line || hit.endLine !== row.endLine) return null;
  return describeLocalSource(row);
}

function localSourceDescription(item, hit) {
  const source = localSourceForHit(item, hit);
  if (!source) return null;
  const fields = hit.owa.row.fields;
  // Explicit source-specific fields have a meaning independent of promotion.
  // Generic exported publishedAt can be a promotion date: never reinterpret it.
  const publication = sourceDate(fields.sourcePublicationDate, 'declared_csv_source_date');
  const metadata = { owningDraftId: null, publication,
    update: sourceDate(fields.sourceUpdatedAt, 'declared_csv_source_date'),
    retrieved: sourceDate(fields.sourceRetrievedAt, 'declared_csv_source_date'),
    dateResolutionReason: publication.reason };
  const owner = item.artifact === 'exports/owa_ontology/v1/chunk.csv'
    && typeof fields.sourceDocumentRefId === 'string' && fields.sourceDocumentRefId.trim() && source.owningPath
    ? ['explicit_chunk_owner', fields.sourceDocumentRefId, source.owningPath]
    : ['record', source.artifact, source.recordId];
  const version = [source.artifact, source.contentHash, fields.sourceOrigin || null,
    fields.publishedAt || null, fields.lastModified || null, fields.retrievedAt || null,
    fields.promotedAt || null, fields.sourcePublicationDate || null,
    fields.sourceUpdatedAt || null, fields.sourceRetrievedAt || null];
  return { source: { ...source, title: fields.name || fields.title || null }, metadata,
    identity: JSON.stringify([item.kb, 'local_artifact', owner, version]) };
}

function hasExternalSourceBody(hit) {
  // Structured OWA mappings have complete private table units even when the
  // legacy body selector labels the CSV row technical_fields. An empty array
  // is also authoritative: it must not fall back to a shorter body preview.
  const owaUnits = hit.owa?.row?.namespace === 'OWAOntology' && Array.isArray(hit.owa.units);
  return Boolean(hit.source?.sourceUrl && (owaUnits || hit.bodyField
    && !['technical_fields', 'definitionPreview'].includes(hit.bodyField)));
}

export function assembleSourceExtracts(question, evidence, allowedNamespaces = null, root = ROOT, selection = null) {
  const sources = [], extracts = [], omissions = [];
  const groups = new Map(), metadataCache = new Map(), selectedOwners = new Map();
  const permitted = allowedNamespaces || new Set(evidence.map(item => item.kb));
  const terms = extractTerms(question);
  const requestedFacets = new Set(parseOwaQuestion(question).facets);
  function observedIdentity(item, hit) {
    if (!permitted.has(item.kb) || !hasExternalSourceBody(hit)) return null;
    const source = hit.source;
    return JSON.stringify([item.kb, source.sourceUrl, source.owningPath || null,
      source.sourceOrigin || null, source.csvDates?.publishedAt || null,
      source.csvDates?.lastModified || null, source.csvDates?.retrievedAt || null]);
  }
  function describe(item, hit) {
    if (permitted.has(item.kb) && !hit.source?.sourceUrl) return localSourceDescription(item, hit);
    if (!permitted.has(item.kb) || !hasExternalSourceBody(hit)) return null;
    const source = hit.source;
    const promoted = String(source.owningPath || '').includes('knowledge_inbox/promoted')
      || /promoted/i.test(source.sourceOrigin || '');
    const cacheKey = JSON.stringify([item.kb, source.sourceUrl, source.owningPath,
      promoted ? null : [source.sourceOrigin, source.csvDates?.publishedAt,
        source.csvDates?.lastModified, source.csvDates?.retrievedAt]]);
    if (!metadataCache.has(cacheKey)) metadataCache.set(cacheKey, resolveSourceMetadata(source, item.kb, permitted, root));
    const metadata = metadataCache.get(cacheKey);
    const identity = sourceIdentity(item.kb, source, metadata);
    return { source: { ...source, kind: 'external_url' }, metadata, identity };
  }
  function add(item, hit, description, selected) {
    const { source, metadata, identity } = description;
    if (!groups.has(identity)) {
      if (!selected) return;
      const key = `sha256:${crypto.createHash('sha256').update(identity).digest('hex')}`;
      groups.set(identity, { source: { key, namespace: item.kb, recordIds: [], title: source.title,
        kind: source.kind || 'external_url',
        ...(source.kind === 'local_artifact' ? { ...source, records: [] } : {}),
        sourceUrl: source.sourceUrl, owningPath: source.owningPath || null, ...metadata },
      units: [], seen: new Map(), relevance: 0, score: 0 });
    }
    const group = groups.get(identity);
    if (source.recordId && !group.source.recordIds.includes(source.recordId)) group.source.recordIds.push(source.recordId);
    if (source.kind === 'local_artifact' && !group.source.records.some(record => record.recordId === source.recordId
        && record.locator === source.locator)) {
      group.source.records.push({ recordId: source.recordId, artifact: source.artifact,
        locator: source.locator, contentHash: source.contentHash });
    }
    const candidates = hit.owa?.units || coherentUnits(hit.bodyText).map(text => ({ text }));
    for (const { text, facet } of candidates) {
      const normalized = text.replace(/\s+/g, ' ').trim();
      if (!normalized) continue;
      if (group.seen.has(normalized)) {
        const existing = group.seen.get(normalized);
        if (facet) {
          existing.facets ||= [];
          if (!existing.facets.includes(facet)) existing.facets.push(facet);
        }
        if (hit.owa && !existing.owa) Object.defineProperty(existing, 'owa', { value: hit.owa });
        continue;
      }
      const relevance = scoreLine(normalizeText(text), terms);
      group.score = Math.max(group.score, selected ? hit.score || 0 : 0);
      const unit = { sourceKey: group.source.key, text, bodyField: hit.bodyField,
        ...(facet ? { facets: [facet] } : {}), kind: group.source.kind,
        ...(source.kind === 'local_artifact' ? { recordId: source.recordId, locator: source.locator } : {}),
        artifact: item.artifact, line: hit.line, endLine: hit.endLine,
        contentHash: item.contentHash, relevance };
      if (hit.owa) Object.defineProperty(unit, 'owa', { value: hit.owa });
      group.units.push(unit);
      group.seen.set(normalized, unit);
    }
  }
  for (const item of evidence) for (const hit of item.hits) {
    const description = describe(item, hit);
    if (description) {
      add(item, hit, description, true);
      if (description.source.kind !== 'local_artifact') selectedOwners.set(observedIdentity(item, hit), description);
    }
  }
  if (!groups.size) return { sources, extracts, omissions };
  // Only private candidates from the same already-permitted scan. No new reads,
  // URL following, canonical-document lookup or cross-version expansion.
  const siblingArtifacts = new Set(evidence.flatMap(item => [item, ...(item.siblingArtifacts || [])]));
  for (const item of siblingArtifacts) for (const hit of item.siblingHits || []) {
    if (!hit.source?.owningPath) continue;
    // Raw owner/version membership precedes all resolver/cache work. Reuse only
    // metadata already validated for a selected hit with this exact provenance.
    const selected = selectedOwners.get(observedIdentity(item, hit));
    if (!selected) continue;
    const description = { source: hit.source, metadata: selected.metadata,
      identity: sourceIdentity(item.kb, hit.source, selected.metadata) };
    if (description.identity === selected.identity && groups.has(description.identity)) {
      add(item, hit, description, false);
    }
  }
  for (const group of groups.values()) {
    // Only a declared/validated exact owner/version may dominate a lossy
    // summary. Strip the explicit truncation marker, never unique clauses.
    if (group.source.owningPath && group.source.publication.basis !== 'unresolved') {
      group.units = group.units.filter(unit => {
        if (unit.bodyField !== 'summary' || !/(?:\.{3}|…)\s*$/.test(unit.text)) return true;
        const prefix = unit.text.replace(/(?:\.{3}|…)\s*$/, '').replace(/\s+/g, ' ').trim();
        return !prefix || !group.units.some(full => full.bodyField === 'content'
          && !/(?:\.{3}|…)\s*$/.test(full.text)
          && full.text.replace(/\s+/g, ' ').trim().startsWith(prefix));
      });
    }
    // Score coverage once per term across the source, not frequency or the
    // highest-scoring preview. Retain atomic sections for budget selection.
    group.relevance = scoreLine(normalizeText(group.units.map(unit => unit.text).join('\n')), terms);
  }
  let remaining = 4000;
  const priority = unit => {
    if (!unit.facets) return 0;
    let result = unit.facets.some(facet => requestedFacets.has(facet)) ? 2
      : unit.facets.includes('unknownEnums') || /\b(?:unknown|conflict|konflikt|do potwierdzenia)\b/.test(normalizeText(unit.text)) ? 1 : 0;
    if (!unit.owa) return result;
    const heading = normalizeText([...unit.text.matchAll(/^#{2,6}\s+(.+)$/gm)].map(m => m[1]).join(' '));
    const query = normalizeText(question);
    if (/\breguly biznesowe\b/.test(heading) && requestedFacets.size) result++;
    if (requestedFacets.has('workflow') && /\bstruktura procesu\b/.test(heading)) result++;
    if (/\btabel\w*\b/.test(query) && /\b(?:zrodla danych|tabele mssql)\b/.test(heading)) result++;
    if (!/\b(?:endpoint\w*|narzedz\w*|api|mcp)\b/.test(query) && /\b(?:endpoint\w*|mcp api)\b/.test(heading)) result--;
    return result;
  };
  const groupPriority = group => Math.max(0, ...group.units.map(priority));
  const ranked = [...groups.values()].sort((a, b) => groupPriority(b) - groupPriority(a)
    || b.relevance - a.relevance || b.score - a.score);
  function omit(group, units, reason) {
    for (const unit of units) {
      const omission = { sourceKey: group.source.key, reason,
        ...(unit.facets ? { missingFacets: [...unit.facets], artifact: unit.artifact,
          recordId: unit.recordId || null, locator: unit.locator || null } : {}) };
      if (unit.owa) Object.defineProperty(omission, 'owa', { value: unit.owa });
      if (unit.owa) Object.defineProperty(omission, 'owaUnit', { value: { text: unit.text,
        facets: unit.facets, namespace: group.source.namespace, owa: unit.owa } });
      omissions.push(omission);
    }
  }
  if (selection?.requestPlan) {
    const assess = units => assessOwaCoverage(selection.effectiveContext, selection, units, selection.requestPlan);
    return { ...budgetSemanticUnits(ranked, assess, omit, selection.requestPlan), omissions };
  }
  for (const [index, group] of ranked.entries()) {
    if (index >= 2) { omit(group, group.units, 'source_limit'); continue; }
    sources.push(group.source);
    let sections = 0;
    // Prioritize relevant whole sections, retaining stable source order on ties.
    for (const unit of group.units.sort((a, b) => priority(b) - priority(a) || b.relevance - a.relevance)) {
      if (sections >= 3 || unit.text.length > remaining) {
        omit(group, [unit], sections >= 3 ? 'section_limit' : 'answer_budget');
        continue;
      }
      const { relevance, ...extract } = unit;
      if (unit.owa) Object.defineProperty(extract, 'owa', { value: unit.owa });
      extracts.push(extract);
      sections++;
      remaining -= unit.text.length;
    }
  }
  return { sources, extracts, omissions };
}

function hasSourceBody(hit, item = null) {
  return Boolean(hit.source?.kind === 'local_artifact' || item && localSourceForHit(item, hit)
    || hit.source?.kind === 'external_url' && hit.source.sourceUrl || hasExternalSourceBody(hit));
}

function publicEvidence(evidence) {
  return evidence.map(item => ({ ...item,
    excerpt: hasSourceBody(item.hits[0], item) ? '' : item.excerpt,
    hits: item.hits.map(hit => {
    const { bodyText, bodyDisplayText, ...bounded } = hit;
    // Source previews may cut a qualification even when they are short. Public
    // substantive text lives only in atomic budgeted extracts, not a second
    // unconditional preview in JSON. Technical/no-source hits stay compatible.
    if (hasSourceBody(hit, item)) bounded.snippet = '';
    const local = !hit.source?.sourceUrl && localSourceForHit(item, hit);
    if (local) bounded.source = local;
    else if (hasExternalSourceBody(hit)) bounded.source = { ...hit.source, kind: 'external_url' };
    return bounded;
  }) }));
}

export function buildPragmaticAnswer(question, response, evidence, diagnostics = [], allowedNamespaces = null) {
  const routed = new Set([response.primaryKb.name, ...response.supportKbs.map(kb => kb.name)]);
  const permitted = new Set([...routed].filter(kb => !allowedNamespaces || allowedNamespaces.has(kb)));
  const parsedContext = parseOwaQuestion(question);
  const requestPlan = evidence.requestPlan;
  const owaEnabled = permitted.has('OWAOntology') && (!requestPlan || Boolean(evidence.owaSelection));
  const selection = evidence.semanticSelection || (owaEnabled ? evidence.owaSelection : null);
  const context = selection?.effectiveContext || parsedContext;
  // A partially resolved exact request cannot be answered by a different owner
  // or by generic support-KB evidence. Keep the original selection for coverage.
  const usableEvidence = requestPlan?.identityBarrier || owaEnabled && context.qualifiedIds.length && selection?.missing ? [] : evidence;
  const topEvidence = selectEvidence(usableEvidence.filter(item => permitted.has(item.kb)));
  // Apply the actual source/unit budget to all scoped candidates, independently
  // of the generic artifact preview cap. Legacy evidence retains that cap.
  const presentationEvidence = [...topEvidence, ...usableEvidence.filter(item => permitted.has(item.kb)
    && item.hits.some(hit => hit.owa) && !topEvidence.includes(item))];
  const presentation = assembleSourceExtracts(question, presentationEvidence, permitted, ROOT, selection);
  const requiredTerms = [...new Set([
    ...extractTerms(question).filter(term => DOCUMENT_CODES.has(term)),
    ...extractFocusHints(question),
  ])];
  const publicItems = publicEvidence(topEvidence);
  const visibleUnits = [...presentation.extracts.map(unit => ({ ...unit,
    owa: unit.owa,
    namespace: presentation.sources.find(source => source.key === unit.sourceKey)?.namespace })), ...publicItems.flatMap(item => item.hits
    .filter(hit => !hasSourceBody(hit) && hit.snippet?.trim())
    .map(hit => ({ text: hit.snippet, namespace: item.kb, artifact: item.artifact, recordId: hit.recordId })))];
  const coverage = owaEnabled || selection?.requestPlan ? assessOwaCoverage(context, selection, visibleUnits) : null;
  if (coverage) presentation.omissions = reconcileOwaOmissions(context, selection, coverage, presentation.omissions);
  const visibleText = normalizeText(visibleUnits.map(unit => unit.text).join('\n'));
  const missingTerms = requiredTerms.filter(term => !containsTerm(visibleText, term));
  const insufficient = !topEvidence.length || missingTerms.length > 0 || diagnostics.length > 0
    || Boolean(coverage && coverage.status !== 'covered');
  const answer = {
    question,
    primaryKb: response.primaryKb.name,
    supportKbs: response.supportKbs.map((kb) => kb.name),
    recommendedArtifacts: [...new Set([
      ...topEvidence.map(item => item.artifact),
      ...response.primaryKb.artifacts,
      ...response.supportKbs.flatMap((kb) => kb.artifacts || []),
    ])].slice(0, 8),
    retrieval: { backend: 'local_artifacts', graphUsed: false, confidenceMeaning: 'heuristic_retrieval_score' },
    evidenceAssessment: {
      scope: 'local_artifacts',
      status: insufficient ? 'insufficient_evidence' : 'unverified_evidence',
      missingTerms,
      reasons: [...new Set([
        ...(!topEvidence.length ? ['no_local_evidence'] : []),
        ...(missingTerms.length ? ['missing_requested_terms'] : []),
        ...diagnostics.map(item => item.code),
        ...(coverage?.reasons || []),
        'text_matches_do_not_verify_claims',
      ])],
    },
    evidence: publicItems,
    ...presentation,
    ...(coverage ? { ...(owaEnabled ? { owaCoverage: coverage } : {}), answerNotes: coverage.notices } : {}),
    externalEvidence: [],
    evidenceSource: topEvidence.length ? 'local' : 'none',
    freshnessNote: '',
    externalSearch: {
      used: false,
      provider: '',
      reason: '',
      query: '',
      resultCount: 0,
    },
    note: topEvidence.length
      ? 'To jest wstępna odpowiedź z lokalnych artefaktów KB.'
      : 'Routing zadziałał, ale w wybranych artefaktach startowych nie znaleziono mocnych lokalnych trafień tekstowych.',
  };
  return answer;
}

export function renderAnswerMarkdown(answer) {
  if (answer.owaCoverage) return renderCompactOwaAnswer(answer);
  const lines = [
    `Pytanie: ${answer.question}`,
    '',
    `Główna KB: ${answer.primaryKb}`,
  ];
  if (answer.supportKbs.length) {
    lines.push(`KB pomocnicze: ${answer.supportKbs.join(', ')}`);
  }
  lines.push('');
  lines.push(answer.note);
  if (answer.retrieval) {
    const backendLabel = answer.retrieval.backend === 'external_search'
      ? 'zewnętrzne wyszukiwanie'
      : answer.retrieval.backend === 'local_artifacts_with_external_search'
        ? 'lokalne artefakty KB i zewnętrzne wyszukiwanie'
        : 'lokalne artefakty KB';
    lines.push(`Źródło: ${backendLabel}; bez wykonania grafu KAG/OpenSPG.`);
    lines.push('Confidence oznacza punktację wyszukiwania, nie prawdopodobieństwo poprawności.');
  }
  if (answer.evidenceAssessment) {
    lines.push(answer.evidenceAssessment.status === 'insufficient_evidence'
      ? 'Brak wystarczających lokalnych dowodów dla pytania. Nie traktuj fragmentów jako potwierdzonej procedury.'
      : 'Lokalne fragmenty wymagają weryfikacji; dopasowanie tekstu nie potwierdza prawdziwości twierdzeń.');
    if (answer.evidenceAssessment.missingTerms.length) lines.push(`Brakujące terminy: ${answer.evidenceAssessment.missingTerms.join(', ')}.`);
    if (answer.evidenceAssessment.reasons.includes('invalid_csv')) lines.push('Część źródeł CSV ma nieprawidłowy format i została pominięta.');
  }
  lines.push('');
  if (answer.freshnessNote) {
    lines.push(`Uwaga o świeżości: ${answer.freshnessNote}`);
    lines.push('');
  }
  if (answer.answerNotes?.length) {
    lines.push('Zakres odpowiedzi:');
    for (const note of answer.answerNotes) lines.push(`- ${note}`);
    lines.push('');
  }
  if (answer.evidence.length) {
    lines.push('Dowody z lokalnej KB:');
    for (const item of answer.evidence) {
      lines.push(`- ${item.kb} -> ${item.artifact}`);
      for (const hit of item.hits) {
        // Source-bearing body previews can cut qualifications. Their complete,
        // budgeted units are rendered below; legacy technical previews remain.
        if (hasSourceBody(hit)) continue;
        const location = hit.endLine > hit.line ? `linie ${hit.line}–${hit.endLine}` : `linia ${hit.line}`;
        lines.push(`  - ${location}: ${hit.snippet}`);
      }
    }
    lines.push('');
  }
  if (answer.extracts?.length) {
    lines.push('Fragmenty treści źródeł:');
    for (const extract of answer.extracts) {
      const label = (answer.sources || []).findIndex(source => source.key === extract.sourceKey) + 1;
      lines.push(`\n[S${label}] ${extract.artifact}, linie ${extract.line}–${extract.endLine || extract.line}:`, extract.text);
    }
    lines.push('');
  }
  if (answer.omissions?.length) {
    lines.push(answer.owaCoverage
      ? 'Ograniczenie prezentacji: pominięto całe fragmenty lub źródła; brakujące aspekty oceniono względem pokazanych dowodów.'
      : 'Ograniczenie pokrycia: pominięto całe fragmenty lub źródła; odpowiedź nie obejmuje wszystkich aspektów.');
    for (const omission of answer.omissions) {
      const missing = omission.uncoveredFacets ?? omission.missingFacets;
      lines.push(`- ${omission.sourceKey}: ${omission.reason}`
        + (missing?.length ? `; brak pokrycia: ${missing.join(', ')}` : ''));
    }
    lines.push('');
  }
  if (answer.sources?.length) {
    lines.push('Cytowane źródła (daty źródłowe, nie daty wejścia w życie):');
    for (const [index, source] of answer.sources.entries()) {
      lines.push(`- [S${index + 1}] ${source.title || source.recordIds.join(', ')} — ${source.namespace}`);
      if (source.kind === 'local_artifact') {
        for (const record of source.records || [source]) {
          lines.push(`  Źródło lokalne: ${record.artifact}, ${record.locator}`);
          lines.push(`  Rekord: ${record.recordId}; hash: ${record.contentHash}`);
        }
        if (source.owningPath) lines.push(`  Dokument właścicielski: ${source.owningPath}`);
      } else {
        lines.push(`  URL: ${source.sourceUrl}`);
      }
      for (const [field, label] of [['publication', 'Publikacja'], ['update', 'Aktualizacja'], ['retrieved', 'Pobranie']]) {
        const date = source[field];
        lines.push(`  ${label}: ${date.value || `nieznana (${date.reason})`}; podstawa: ${date.basis}`
          + (date.value ? `; precyzja: ${date.precision}; strefa: ${date.timezone || 'nie dotyczy'}` : ''));
      }
    }
    lines.push('');
  }
  if (answer.externalEvidence.length) {
    lines.push('Zewnętrzne dowody live:');
    for (const item of answer.externalEvidence) {
      lines.push(`- ${item.title} [${item.sourceType}] -> ${item.url}`);
      if (item.publishedDate) lines.push(`  - opublikowano: ${item.publishedDate}`);
      if (item.snippet) lines.push(`  - fragment: ${item.snippet}`);
    }
    lines.push('');
  }
  lines.push('Polecane artefakty:');
  for (const artifact of answer.recommendedArtifacts) {
    lines.push(`- ${artifact}`);
  }
  return lines.join('\n');
}

function printHelp() {
  console.log(`Użycie:
  node scripts/erp_knowledge_answer.mjs "twoje pytanie"
  node scripts/erp_knowledge_answer.mjs --json "twoje pytanie"

Działanie:
  - kieruje pytanie do właściwej KB
  - skanuje artefakty startowe z głównej i pomocniczych KB
  - zwraca praktyczną pierwszą odpowiedź z fragmentami dowodów
`);
}

export async function answerQuestion(question, allowedNamespaces = null, options = {}) {
  const routing = loadRouting();
  // Intersect scope before any artifact/metadata access. Release and callers
  // without a recognized private intent retain their original route contract.
  const semanticNamespaces = options.intent === 'release' ? []
    : semanticCandidateNamespaces(options.semanticIntent, allowedNamespaces);
  const candidateScope = semanticNamespaces.length ? new Set(semanticNamespaces) : allowedNamespaces;
  const classified = classifyQuestion(question, routing, candidateScope, options);
  const candidates = semanticNamespaces.length ? { ...classified,
    supportKbs: [...new Set([...classified.supportKbs, ...semanticNamespaces])] } : classified;
  const response = buildResponse(candidates, routing, candidateScope);
  const terms = extractTerms(question);
  const focusHints = extractFocusHints(question);
  const diagnostics = [];
  const context = parseOwaQuestion(question);
  if (semanticNamespaces.length) Object.defineProperty(context, 'semanticIntent', { value: options.semanticIntent });
  const evidence = gatherEvidence(response, terms, focusHints, candidateScope, diagnostics, context);
  const answer = buildPragmaticAnswer(question, response, evidence, diagnostics, candidateScope);
  if (semanticNamespaces.length) {
    // Candidate KBs are scan inputs, not claims of used evidence. Keep the
    // classified primary only when selected evidence actually uses it.
    const used = [...new Set([
      ...answer.extracts.map(unit => answer.sources.find(source => source.key === unit.sourceKey)?.namespace),
      ...answer.evidence.filter(item => item.hits.some(hit => hit.snippet?.trim())).map(item => item.kb),
    ].filter(Boolean))];
    const primarySubjects = evidence.requestPlan?.subjects.filter(s => ['primary', 'comparison'].includes(s.role)).map(s => s.namespace) || [];
    answer.primaryKb = primarySubjects.find(namespace => used.includes(namespace))
      || (used.includes(response.primaryKb.name) ? response.primaryKb.name : used[0])
      || primarySubjects[0] || response.primaryKb.name;
    answer.supportKbs = used.filter(namespace => namespace !== answer.primaryKb);
    const finalNamespaces = new Set([answer.primaryKb, ...answer.supportKbs]);
    const finalArtifacts = new Set([response.primaryKb, ...response.supportKbs]
      .filter(kb => finalNamespaces.has(kb.name)).flatMap(kb => kb.artifacts || []));
    answer.recommendedArtifacts = answer.recommendedArtifacts.filter(artifact => finalArtifacts.has(artifact));
  }
  const fallbackDecision = shouldUseExternalFallback({
    questionNormalized: classified.normalizedQuestion,
    evidence,
    primaryKb: response.primaryKb.name,
  });
  // Explicit, permitted OWA answers describe this local ontology, including its
  // missing/ambiguous boundaries. A provider cannot supply substitute claims.
  // Release and generic requests retain the existing fallback policy.
  const localOwaAnswer = Boolean(answer.owaCoverage) && (evidence.requestPlan?.identityBarrier
    || parseOwaQuestion(question).explicitOwa);
  if (fallbackDecision.shouldFallback && !localOwaAnswer && !evidence.requestPlan?.identityBarrier) {
    try {
      const external = await searchExternalSources({
        query: question,
        kbName: response.primaryKb.name,
        numResults: 5,
        allowedSourceTiers: ['official', 'community'],
        logContext: 'answer_fallback',
      });
      if (external.ok && external.results.length) {
        answer.externalEvidence = external.results.slice(0, 5);
        answer.externalSearch = {
          used: true,
          provider: external.provider,
          reason: fallbackDecision.reason,
          query: question,
          resultCount: external.resultCount,
          citations: buildExternalCitationBlock(external.results, 5),
        };
        answer.evidenceSource = answer.evidence.length ? 'blended' : 'external';
        answer.retrieval.backend = answer.evidence.length ? 'local_artifacts_with_external_search' : 'external_search';
        answer.freshnessNote = 'Użyto zewnętrznego wyszukiwania live, ponieważ lokalne dowody KB były słabe albo pytanie wyglądało na czasowo wrażliwe.';
        answer.note = answer.evidence.length
          ? 'Ta odpowiedź łączy lokalne artefakty KB z zewnętrznie cytowanymi wynikami wyszukiwania live.'
          : 'Ta odpowiedź opiera się na zewnętrznie cytowanych wynikach wyszukiwania live, ponieważ lokalna KB nie dostarczyła wystarczająco mocnych dowodów.';
        if (options.allowAutoDraft !== false && String(process.env.EXA_AUTO_DRAFT || '0') === '1') {
          const autoDraft = await createExternalKnowledgeDraft({
            kbName: response.primaryKb.name,
            kbNamespace: response.primaryKb.name,
            query: question,
            result: external.results[0],
            notes: 'Automatyczny draft utworzony z odpowiedzi fallback KB-first. Sprawdź przed promocją.',
            tags: ['exa', 'auto-draft', fallbackDecision.reason || 'fallback'],
            auto: true,
          });
          answer.externalSearch.autoDraft = {
            enabled: true,
            created: Boolean(autoDraft.created),
            skipped: autoDraft.skipped || '',
            draftId: autoDraft.draft?.draft?.id || '',
            jsonPath: autoDraft.draft?.jsonPath || '',
            mdPath: autoDraft.draft?.mdPath || '',
            sourceUrl: autoDraft.result?.url || '',
            sourceType: autoDraft.result?.sourceType || '',
          };
        }
        recordExternalFallback({
          question,
          primaryKb: response.primaryKb.name,
          reason: fallbackDecision.reason,
          localEvidenceCount: answer.evidence.length,
          localMaxScore: fallbackDecision.localMaxScore,
          provider: external.provider,
          resultCount: external.resultCount,
          topUrls: external.results.slice(0, 5).map((item) => item.url),
          autoDraft: answer.externalSearch.autoDraft || null,
        });
      }
    } catch (error) {
      answer.externalSearch = {
        used: false,
        provider: '',
        reason: fallbackDecision.reason,
        query: question,
        resultCount: 0,
        error: error.message,
      };
    }
  }
  answer.confidence = computeConfidenceScore({
    evidenceCount: answer.evidence.length,
    maxScore: Math.max(...answer.evidence.flatMap((e) => e.hits.map((h) => h.score)), 0),
    externalResultCount: answer.externalSearch?.resultCount || 0,
  });
  if (answer.confidence < CONFIDENCE_LOW_THRESHOLD) {
    recordLearningGap(question, {
      source: process.env.ENABLE_LIVE_LEARNING === '1' ? 'live_query' : 'testpack',
      routedKb: response.primaryKb.name,
      evidenceCount: answer.evidence.length,
      confidence: answer.confidence,
      externalFallbackUsed: answer.externalSearch?.used || false,
      externalResultCount: answer.externalSearch?.resultCount || 0,
    });
  }
  return { routing, classified, response, answer };
}

async function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const filtered = args.filter((arg) => arg !== '--json');
  const question = filtered.join(' ').trim();

  if (!question || filtered.includes('--help') || filtered.includes('-h')) {
    printHelp();
    process.exit(question ? 0 : 1);
  }

  const { answer } = await answerQuestion(question);

  if (asJson) {
    process.stdout.write(JSON.stringify(answer, null, 2) + '\n');
    return;
  }

  process.stdout.write(renderAnswerMarkdown(answer) + '\n');
}

const ENTRY_FILE = process.argv[1] ? path.resolve(process.argv[1]) : '';
const MODULE_FILE = fileURLToPath(import.meta.url);

if (ENTRY_FILE === MODULE_FILE) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
