#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import process from 'process';
import { appendDashboardAudit } from './dashboard_audit.mjs';
import { submitKnowledgeDraft } from './knowledge_inbox.mjs';
import { findExistingDraftBySourceUrl, normalizeUrl } from './dashboard_source_list.mjs';
import { TARGET_KBS } from './promoted_knowledge.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';
export const DISCOVERY_ROOT = path.join(ROOT, 'data/dashboard/discovery');
export const DISCOVERY_POLICY_PATH = path.join(DISCOVERY_ROOT, 'policy.json');
export const DISCOVERY_QUERIES_PATH = path.join(DISCOVERY_ROOT, 'queries.json');
export const DISCOVERY_CANDIDATES_ROOT = path.join(DISCOVERY_ROOT, 'candidates');
export const DISCOVERY_RUNS_ROOT = path.join(DISCOVERY_ROOT, 'runs');
export const DISCOVERY_ROUTES_PATH = path.join(DISCOVERY_ROOT, 'partner_routes.jsonl');
export const DISCOVERY_REPORT_PATH = path.join(
  ROOT,
  'docs/reference/ERP_KB_Discovery_Coverage_Report.json',
);
export const DISCOVERY_BRIEFING_PATH = path.join(
  ROOT,
  'docs/reference/ERP_KB_Discovery_Daily_Briefing.json',
);
const CORPUS_REGISTRIES = {
  ComarchOptimaAdditionalFunctions: 'downloads/google_drive/additional_functions/meta/source_registry.json',
  ComarchOptimaSprint: 'downloads/google_drive/sprint/meta/source_registry.json',
  ComarchOptimaReference: 'downloads/official/optima_reference/meta/source_registry.json',
  ComarchOptimaPartnerTechnical: 'downloads/partner/optima_technical/source_registry.json',
  ComarchBetterflyReference: 'downloads/official/betterfly_reference/meta/source_registry.json',
  ComarchCommunityNews: 'downloads/community_news/meta/source_registry.json',
  TaxbellLegalReference: 'downloads/taxbell/legal_reference/meta/source_registry.json',
  TaxbellPayrollHRReference: 'downloads/taxbell/payroll_hr_reference/meta/source_registry.json',
  TaxbellAccountingVATReference: 'downloads/taxbell/accounting_vat_reference/meta/source_registry.json',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const UNDO_WINDOW_MS = 10 * 60 * 1000;
const PROFILE_VERSION = 'discovery-profiles-v1';
let corpusIndexCache = { signature: '', index: new Map() };

const PROFILE_DEFINITIONS = [
  {
    kbNamespace: 'ComarchOptimaSchema',
    mode: 'CANDIDATE_ONLY',
    domains: ['partner.erp.comarch.pl', 'pomoc.comarch.pl'],
    tiers: ['official'],
    topics: ['struktura bazy danych', 'schemat SQL', 'zmiany wersji'],
    seedQuery: 'Comarch ERP Optima struktura bazy danych schemat SQL zmiany 2026',
  },
  {
    kbNamespace: 'ComarchOptimaAdditionalFunctions',
    mode: 'CANDIDATE_ONLY',
    domains: ['partner.erp.comarch.pl', 'pomoc.comarch.pl'],
    tiers: ['official'],
    topics: ['funkcje dodatkowe', 'XML', 'XPT', 'przykłady'],
    seedQuery: 'Comarch ERP Optima funkcje dodatkowe XML XPT przykłady 2026',
  },
  {
    kbNamespace: 'ComarchOptimaSprint',
    mode: 'CANDIDATE_ONLY',
    domains: ['partner.erp.comarch.pl', 'pomoc.comarch.pl'],
    tiers: ['official'],
    topics: ['sPrint', 'wydruki', 'GenRap', 'wzorce'],
    seedQuery: 'Comarch ERP Optima sPrint wydruki GenRap wzorce 2026',
  },
  {
    kbNamespace: 'ComarchOptimaReference',
    mode: 'DIRECT_DRAFT',
    domains: ['pomoc.comarch.pl', 'comarch.pl'],
    communityDomains: ['spolecznosc.comarch.pl'],
    tiers: ['official', 'community'],
    topics: ['instrukcje', 'aktualizacje', 'KSeF', 'obsługa programu'],
    seedQuery: 'Comarch ERP Optima instrukcje aktualizacje KSeF 2026',
  },
  {
    kbNamespace: 'ComarchOptimaPartnerTechnical',
    mode: 'PARTNER_ROUTE',
    domains: ['partner.erp.comarch.pl'],
    tiers: ['official'],
    topics: ['API', 'COM', 'narzędzia', 'dokumentacja techniczna'],
    seedQuery: 'site:partner.erp.comarch.pl Comarch ERP Optima API COM dokumentacja techniczna 2026',
  },
  {
    kbNamespace: 'ComarchBetterflyReference',
    mode: 'DIRECT_DRAFT',
    domains: ['pomoc.comarchbetterfly.pl', 'comarchbetterfly.pl', 'app.comarchbetterfly.pl'],
    communityDomains: ['spolecznosc.comarch.pl'],
    tiers: ['official', 'community'],
    topics: ['API', 'KSeF', 'faktury', 'integracje'],
    seedQuery: 'Comarch Betterfly API KSeF faktury integracje 2026',
  },
  {
    kbNamespace: 'ComarchCommunityNews',
    mode: 'DIRECT_DRAFT',
    domains: ['pomoc.comarch.pl', 'pomoc.comarchbetterfly.pl'],
    communityDomains: ['spolecznosc.comarch.pl'],
    tiers: ['official', 'community'],
    topics: ['pytania społeczności', 'KSeF', 'Optima', 'Betterfly'],
    seedQuery: 'site:spolecznosc.comarch.pl Comarch Optima Betterfly KSeF 2026',
  },
  {
    kbNamespace: 'TaxbellLegalReference',
    mode: 'DIRECT_DRAFT',
    domains: ['gov.pl', 'podatki.gov.pl', 'isap.sejm.gov.pl', 'dziennikustaw.gov.pl', 'sejm.gov.pl'],
    professionalDomains: ['infor.pl', 'lexlege.pl'],
    tiers: ['official', 'professional'],
    topics: ['prawo podatkowe', 'interpretacje', 'ustawy', 'objaśnienia'],
    seedQuery: 'prawo podatkowe interpretacje ustawy objaśnienia 2026',
  },
  {
    kbNamespace: 'TaxbellPayrollHRReference',
    mode: 'DIRECT_DRAFT',
    domains: ['zus.pl', 'pip.gov.pl', 'gov.pl', 'biznes.gov.pl', 'praca.gov.pl'],
    professionalDomains: ['infor.pl'],
    tiers: ['official', 'professional'],
    topics: ['kadry', 'płace', 'ZUS', 'prawo pracy'],
    seedQuery: 'kadry płace ZUS prawo pracy zmiany 2026',
  },
  {
    kbNamespace: 'TaxbellAccountingVATReference',
    mode: 'DIRECT_DRAFT',
    domains: ['podatki.gov.pl', 'ksef.podatki.gov.pl', 'gov.pl', 'biznes.gov.pl'],
    professionalDomains: ['infor.pl', 'rachunkowosc.com.pl', 'poradnikprzedsiebiorcy.pl'],
    tiers: ['official', 'professional'],
    topics: ['VAT', 'JPK', 'KSeF', 'rachunkowość'],
    seedQuery: 'VAT JPK KSeF rachunkowość zmiany 2026',
  },
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value, mode = 0o640) {
  ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.${process.pid}.${crypto.randomUUID().slice(0, 8)}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode });
  fs.renameSync(tempPath, filePath);
}

function domainMatches(hostname, domain) {
  const left = String(hostname || '').toLowerCase().replace(/^www\./, '');
  const right = String(domain || '').toLowerCase().replace(/^www\./, '');
  return left === right || left.endsWith(`.${right}`);
}

function hostnameFor(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function corpusSourceKey(value) {
  try {
    const url = new URL(normalizeUrl(value));
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|print$|output$)/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.toString();
  } catch {
    return String(value || '').trim();
  }
}

function collectHttpUrls(value, output, depth = 0) {
  if (depth > 12 || value == null) return;
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value.trim())) output.add(value.trim());
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectHttpUrls(item, output, depth + 1);
    return;
  }
  if (typeof value === 'object') {
    for (const item of Object.values(value)) collectHttpUrls(item, output, depth + 1);
  }
}

function corpusSourceIndex() {
  const files = Object.entries(CORPUS_REGISTRIES)
    .map(([kbNamespace, relativePath]) => ({
      kbNamespace,
      relativePath,
      filePath: path.join(ROOT, relativePath),
    }))
    .filter((item) => fs.existsSync(item.filePath));
  const signature = files
    .map((item) => `${item.relativePath}:${fs.statSync(item.filePath).mtimeMs}:${fs.statSync(item.filePath).size}`)
    .join('|');
  if (corpusIndexCache.signature === signature) return corpusIndexCache.index;
  const index = new Map();
  for (const item of files) {
    const urls = new Set();
    collectHttpUrls(readJson(item.filePath, {}), urls);
    for (const url of urls) {
      const key = corpusSourceKey(url);
      if (!key || index.has(key)) continue;
      index.set(key, {
        kbNamespace: item.kbNamespace,
        registryPath: item.relativePath,
        sourceUrl: url,
      });
    }
  }
  corpusIndexCache = { signature, index };
  return index;
}

export function findExistingCorpusSource(sourceUrl) {
  return corpusSourceIndex().get(corpusSourceKey(sourceUrl)) || null;
}

function weekKey(value = new Date()) {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return `${date.getUTCFullYear()}-W${String(Math.ceil((((date - yearStart) / DAY_MS) + 1) / 7)).padStart(2, '0')}`;
}

export function defaultDiscoveryPolicy() {
  return {
    version: PROFILE_VERSION,
    enabled: true,
    dryRun: true,
    dailyDraftLimitPerKb: 3,
    weeklyDraftLimitPerKb: 10,
    calibrationTarget: 30,
    globalSearchLimit: 60,
    generatedQueriesPerKb: 3,
    generatedQueryTtlDays: 28,
    emptyRunRetirementThreshold: 3,
    lowValueRetirementThreshold: 3,
    highDuplicateRate: 0.8,
    officialConfidence: 0.85,
    communityConfidence: 0.92,
    professionalConfidence: 0.92,
    semiAutoEnabled: false,
    semiAutoMinReviews: 30,
    semiAutoMinAgreement: 0.9,
    semiAutoMaxFalsePositiveRate: 0.05,
    semiAutoMinConfidence: 0.95,
    semiAutoMinObservationDays: 7,
    semiAutoMaxPerRun: 3,
    semiAutoAllowedNamespaces: [
      'ComarchOptimaReference',
      'ComarchBetterflyReference',
      'TaxbellLegalReference',
      'TaxbellPayrollHRReference',
      'TaxbellAccountingVATReference',
    ],
    profiles: PROFILE_DEFINITIONS.map((profile) => ({
      ...profile,
      kbName: TARGET_KBS[profile.kbNamespace].kbName,
      communityDomains: profile.communityDomains || [],
      professionalDomains: profile.professionalDomains || [],
      enabled: true,
    })),
    updatedAt: '',
    updatedBy: '',
  };
}

export function loadDiscoveryPolicy() {
  const stored = readJson(DISCOVERY_POLICY_PATH, {});
  const defaults = defaultDiscoveryPolicy();
  const byNamespace = new Map((stored.profiles || []).map((profile) => [profile.kbNamespace, profile]));
  return {
    ...defaults,
    ...stored,
    dryRun: process.env.ERP_KB_DISCOVERY_DRY_RUN === '0'
      ? false
      : process.env.ERP_KB_DISCOVERY_DRY_RUN === '1'
        ? true
        : stored.dryRun !== false,
    profiles: defaults.profiles.map((profile) => ({
      ...profile,
      ...(byNamespace.get(profile.kbNamespace) || {}),
    })),
  };
}

export function saveDiscoveryPolicy(patch = {}, operator = 'dashboard') {
  const current = loadDiscoveryPolicy();
  const numericRanges = {
    dailyDraftLimitPerKb: [0, 50],
    weeklyDraftLimitPerKb: [0, 200],
    calibrationTarget: [1, 200],
    globalSearchLimit: [1, 500],
    generatedQueriesPerKb: [0, 10],
    generatedQueryTtlDays: [1, 365],
    emptyRunRetirementThreshold: [1, 20],
    lowValueRetirementThreshold: [1, 20],
    highDuplicateRate: [0, 1],
    officialConfidence: [0, 1],
    communityConfidence: [0, 1],
    professionalConfidence: [0, 1],
    semiAutoMinReviews: [1, 500],
    semiAutoMinAgreement: [0, 1],
    semiAutoMaxFalsePositiveRate: [0, 1],
    semiAutoMinConfidence: [0, 1],
    semiAutoMinObservationDays: [0, 90],
    semiAutoMaxPerRun: [0, 50],
  };
  const normalizedPatch = {};
  for (const [key, value] of Object.entries(patch)) {
    if (['enabled', 'dryRun', 'semiAutoEnabled'].includes(key)) {
      normalizedPatch[key] = Boolean(value);
      continue;
    }
    if (key === 'semiAutoAllowedNamespaces') {
      normalizedPatch[key] = [...new Set((Array.isArray(value) ? value : [])
        .map(String)
        .filter((namespace) => TARGET_KBS[namespace]))];
      continue;
    }
    if (numericRanges[key]) {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) throw new Error(`Invalid discovery policy value for ${key}`);
      const [minimum, maximum] = numericRanges[key];
      normalizedPatch[key] = Math.max(minimum, Math.min(maximum, parsed));
    }
  }
  const next = {
    ...current,
    ...normalizedPatch,
    profiles: current.profiles,
    updatedAt: new Date().toISOString(),
    updatedBy: operator,
  };
  writeJson(DISCOVERY_POLICY_PATH, next);
  appendDashboardAudit({
    actor: operator,
    role: 'admin',
    action: 'discovery.policy.update',
    resourceType: 'discovery_policy',
    resourceId: 'default',
    before: current,
    after: next,
  });
  return next;
}

export function loadDiscoveryQueries() {
  const policy = loadDiscoveryPolicy();
  const state = readJson(DISCOVERY_QUERIES_PATH, { generatedAt: '', queries: [] });
  const existing = new Map((state.queries || []).map((query) => [query.id, query]));
  const seeds = policy.profiles.map((profile) => {
    const id = `seed_${profile.kbNamespace}`;
    return existing.get(id) || {
      id,
      kbNamespace: profile.kbNamespace,
      query: profile.seedQuery,
      includeDomains: [...profile.domains, ...profile.communityDomains, ...profile.professionalDomains],
      source: 'seed',
      enabled: true,
      createdAt: new Date().toISOString(),
      expiresAt: '',
      emptyRuns: 0,
      lastRunAt: '',
      lastResultCount: 0,
      promptVersion: '',
      model: '',
      reason: 'Default profile seed query.',
    };
  });
  const seedIds = new Set(seeds.map((query) => query.id));
  return {
    generatedAt: state.generatedAt || new Date().toISOString(),
    queries: [
      ...seeds,
      ...(state.queries || []).filter((query) => !seedIds.has(query.id)),
    ],
  };
}

export function saveDiscoveryQueries(queries) {
  const state = {
    generatedAt: new Date().toISOString(),
    queries: [...queries].sort((left, right) => (
      left.kbNamespace.localeCompare(right.kbNamespace)
      || left.id.localeCompare(right.id)
    )),
  };
  writeJson(DISCOVERY_QUERIES_PATH, state);
  return state;
}

export function activeDiscoveryQueries(now = new Date()) {
  return loadDiscoveryQueries().queries.filter((query) => (
    query.enabled !== false
    && (!query.expiresAt || Date.parse(query.expiresAt) > now.getTime())
  ));
}

export function classifyDiscoveryTier(url, profile) {
  const hostname = hostnameFor(url);
  if (profile.domains.some((domain) => domainMatches(hostname, domain))) return 'official';
  if (profile.communityDomains.some((domain) => domainMatches(hostname, domain))) return 'community';
  if (profile.professionalDomains.some((domain) => domainMatches(hostname, domain))) return 'professional';
  return 'unknown';
}

export function profileForNamespace(namespace, policy = loadDiscoveryPolicy()) {
  return policy.profiles.find((profile) => profile.kbNamespace === namespace) || null;
}

function candidatePath(candidateId) {
  return path.join(DISCOVERY_CANDIDATES_ROOT, `${candidateId}.json`);
}

export function saveDiscoveryCandidate(candidate) {
  const next = { ...candidate, updatedAt: new Date().toISOString() };
  writeJson(candidatePath(next.id), next);
  return next;
}

export function readDiscoveryCandidate(candidateId) {
  return readJson(candidatePath(candidateId), null);
}

export function listDiscoveryCandidates(limit = 500) {
  if (!fs.existsSync(DISCOVERY_CANDIDATES_ROOT)) return [];
  return fs.readdirSync(DISCOVERY_CANDIDATES_ROOT)
    .filter((name) => name.endsWith('.json'))
    .flatMap((name) => {
      try {
        return [readJson(path.join(DISCOVERY_CANDIDATES_ROOT, name), null)];
      } catch {
        return [];
      }
    })
    .filter(Boolean)
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
    .slice(0, Math.max(1, Math.min(5000, Number(limit) || 500)));
}

export function findDiscoveryCandidateByUrl(url) {
  let normalized = '';
  try {
    normalized = normalizeUrl(url);
  } catch {
    normalized = String(url || '');
  }
  return listDiscoveryCandidates(5000).find((candidate) => candidate.canonicalUrl === normalized) || null;
}

export function isReviewableDiscoveryCandidate(candidate) {
  if (!candidate || candidate.operatorDecision) return false;
  if (['NEW', 'CANDIDATE_ONLY'].includes(candidate.status)) return true;
  return candidate.status === 'REJECTED' && !candidate.rejectedBy;
}

function decisionAction(decision) {
  if (decision === 'draft') return 'CREATE_DRAFT';
  if (decision === 'route') return 'ROUTE_TO_PIPELINE';
  return 'REJECT';
}

function buildOperatorDecision(candidate, decision, operator, note = '', outcome = '') {
  const expectedAction = candidate.action || 'CANDIDATE_ONLY';
  const actualAction = decisionAction(decision);
  const evaluable = expectedAction !== 'CANDIDATE_ONLY';
  return {
    decision,
    expectedAction,
    actualAction,
    evaluable,
    agreed: evaluable ? expectedAction === actualAction : null,
    source: String(operator || '').startsWith('discovery-') ? 'system' : 'operator',
    operator,
    note: String(note || '').slice(0, 1000),
    outcome,
    decidedAt: new Date().toISOString(),
  };
}

function markDiscoveryCandidateDuplicate(
  candidate,
  decision,
  operator,
  note,
  duplicateType,
  match,
) {
  const next = saveDiscoveryCandidate({
    ...candidate,
    status: 'DUPLICATE',
    duplicateType,
    ...(duplicateType === 'existing_corpus' ? { corpusMatch: match } : { existing: match }),
    duplicateDetectedAt: new Date().toISOString(),
    operatorDecision: buildOperatorDecision(candidate, decision, operator, note, 'DUPLICATE'),
  });
  appendDashboardAudit({
    actor: operator,
    role: 'operator',
    action: 'discovery.candidate.duplicate',
    resourceType: 'discovery_candidate',
    resourceId: candidate.id,
    before: { status: candidate.status },
    after: {
      status: next.status,
      duplicateType,
      decision,
      match,
    },
  });
  return next;
}

function metricGroup(candidates) {
  const reviewed = candidates.filter((candidate) => candidate.operatorDecision?.source === 'operator');
  const resolved = reviewed.filter((candidate) => candidate.operatorDecision.outcome !== 'DUPLICATE');
  const evaluable = resolved.filter((candidate) => candidate.operatorDecision.evaluable);
  const agreed = evaluable.filter((candidate) => candidate.operatorDecision.agreed).length;
  const falsePositives = resolved.filter((candidate) => (
    ['CREATE_DRAFT', 'ROUTE_TO_PIPELINE'].includes(candidate.operatorDecision.expectedAction)
    && candidate.operatorDecision.actualAction === 'REJECT'
  )).length;
  const falseNegatives = resolved.filter((candidate) => (
    candidate.operatorDecision.expectedAction === 'REJECT'
    && ['CREATE_DRAFT', 'ROUTE_TO_PIPELINE'].includes(candidate.operatorDecision.actualAction)
  )).length;
  return {
    candidates: candidates.length,
    reviewed: reviewed.length,
    duplicates: reviewed.filter((candidate) => candidate.operatorDecision.outcome === 'DUPLICATE').length,
    accepted: resolved.filter((candidate) => (
      ['CREATE_DRAFT', 'ROUTE_TO_PIPELINE'].includes(candidate.operatorDecision.actualAction)
    )).length,
    rejected: resolved.filter((candidate) => candidate.operatorDecision.actualAction === 'REJECT').length,
    holdsResolved: resolved.filter((candidate) => candidate.operatorDecision.expectedAction === 'CANDIDATE_ONLY').length,
    evaluable: evaluable.length,
    agreed,
    agreement: evaluable.length ? agreed / evaluable.length : null,
    falsePositives,
    falseNegatives,
  };
}

function groupFeedback(candidates, keyFn) {
  const grouped = new Map();
  for (const candidate of candidates) {
    const key = keyFn(candidate) || 'unknown';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(candidate);
  }
  return Object.fromEntries(
    [...grouped.entries()]
      .map(([key, items]) => [key, metricGroup(items)])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function candidateAgeDays(candidate, now = new Date()) {
  const timestamp = Date.parse(candidate.publishedDate || candidate.retrievedAt || candidate.createdAt || '');
  return Number.isFinite(timestamp) ? Math.max(0, (now.getTime() - timestamp) / DAY_MS) : null;
}

export function discoveryCandidatePriority(candidate, candidates = listDiscoveryCandidates(5000)) {
  const confidence = Number(candidate.assessment?.confidence || 0);
  const kbPending = candidates.filter((item) => (
    item.kbNamespace === candidate.kbNamespace && isReviewableDiscoveryCandidate(item)
  )).length;
  const ageDays = candidateAgeDays(candidate);
  const reasons = [];
  let score = 0;
  const tierPoints = { official: 25, professional: 15, community: 10, unknown: 0 };
  score += tierPoints[candidate.sourceTier] || 0;
  if (candidate.sourceTier === 'official') reasons.push('oficjalne źródło');
  score += Math.round(confidence * 35);
  if (confidence >= 0.95) reasons.push('wysoka pewność LLM');
  const actionPoints = {
    CREATE_DRAFT: 15,
    ROUTE_TO_PIPELINE: 12,
    CANDIDATE_ONLY: 5,
    REJECT: 0,
  };
  score += actionPoints[candidate.action] || 0;
  if (['CREATE_DRAFT', 'ROUTE_TO_PIPELINE'].includes(candidate.action)) {
    reasons.push('rekomendowana akcja');
  }
  if (ageDays != null && ageDays <= 30) {
    score += 10;
    reasons.push('świeża publikacja');
  } else if (ageDays != null && ageDays <= 90) {
    score += 5;
  }
  if (kbPending <= 3) {
    score += 10;
    reasons.push('niska liczba kandydatów dla KB');
  } else if (kbPending <= 7) {
    score += 5;
  }
  if (candidate.assessment?.duplicateRisk === 'high') {
    score -= 20;
    reasons.push('wysokie ryzyko duplikatu');
  }
  if (candidate.assessment?.contentRisk === 'high') {
    score -= 25;
    reasons.push('wysokie ryzyko treści');
  }
  if (candidate.sourceTier === 'unknown') {
    score -= 20;
    reasons.push('nieznana domena');
  }
  const normalized = Math.max(0, Math.min(100, score));
  return {
    score: normalized,
    level: normalized >= 75 ? 'HIGH' : normalized >= 50 ? 'MEDIUM' : 'LOW',
    reasons: reasons.slice(0, 5),
    ageDays: ageDays == null ? null : Math.round(ageDays),
    kbPending,
  };
}

export function discoveryQueryAnalytics(
  queries = loadDiscoveryQueries().queries,
  candidates = listDiscoveryCandidates(5000),
) {
  return queries.map((query) => {
    const scoped = candidates.filter((candidate) => candidate.queryId === query.id);
    const reviewed = scoped.filter((candidate) => candidate.operatorDecision?.source === 'operator');
    const accepted = reviewed.filter((candidate) => (
      ['CREATE_DRAFT', 'ROUTE_TO_PIPELINE'].includes(candidate.operatorDecision.actualAction)
      && candidate.operatorDecision.outcome !== 'DUPLICATE'
    )).length;
    const rejected = reviewed.filter((candidate) => candidate.operatorDecision.actualAction === 'REJECT').length;
    const duplicates = scoped.filter((candidate) => candidate.status === 'DUPLICATE').length;
    const lastResults = Number(query.lastResultCount || 0);
    const lastCorpusDuplicates = Number(query.lastCorpusDuplicateCount || 0);
    const duplicateRate = lastResults ? lastCorpusDuplicates / lastResults : 0;
    const acceptanceRate = reviewed.length ? accepted / reviewed.length : null;
    let health = 'GOOD';
    let recommendation = 'KEEP';
    if (Number(query.emptyRuns || 0) >= 2) {
      health = 'LOW_YIELD';
      recommendation = query.source === 'generated' ? 'RETIRE_IF_REPEATED' : 'REVIEW';
    } else if (duplicateRate >= 0.8) {
      health = 'DUPLICATE_HEAVY';
      recommendation = query.source === 'generated' ? 'RETIRE_IF_REPEATED' : 'REFINE';
    } else if (reviewed.length >= 3 && acceptanceRate < 0.34) {
      health = 'LOW_ACCEPTANCE';
      recommendation = 'REFINE';
    }
    const efficiencyScore = Math.max(0, Math.min(100, Math.round(
      100
      - duplicateRate * 55
      - Math.min(3, Number(query.emptyRuns || 0)) * 15
      + (acceptanceRate == null ? 0 : (acceptanceRate - 0.5) * 30)
    )));
    return {
      ...query,
      analytics: {
        candidates: scoped.length,
        pending: scoped.filter(isReviewableDiscoveryCandidate).length,
        reviewed: reviewed.length,
        accepted,
        rejected,
        duplicates,
        duplicateRate,
        acceptanceRate,
        efficiencyScore,
        health,
        recommendation,
      },
    };
  });
}

export function discoverySemiAutoStatus(
  policy = loadDiscoveryPolicy(),
  candidates = listDiscoveryCandidates(5000),
) {
  const feedback = discoveryFeedbackSummary(candidates);
  const reviewed = candidates
    .filter((candidate) => candidate.operatorDecision?.source === 'operator')
    .sort((left, right) => String(left.operatorDecision.decidedAt).localeCompare(
      String(right.operatorDecision.decidedAt),
    ));
  const falsePositiveRate = feedback.overall.evaluable
    ? feedback.overall.falsePositives / feedback.overall.evaluable
    : null;
  const observationDays = reviewed.length > 1
    ? (Date.parse(reviewed.at(-1).operatorDecision.decidedAt)
      - Date.parse(reviewed[0].operatorDecision.decidedAt)) / DAY_MS
    : 0;
  const blockers = [];
  if (!policy.semiAutoEnabled) blockers.push('Tryb półautomatyczny jest wyłączony.');
  if (feedback.overall.reviewed < policy.semiAutoMinReviews) {
    blockers.push(`Wymagane ${policy.semiAutoMinReviews} decyzji operatora.`);
  }
  if (feedback.overall.agreement == null || feedback.overall.agreement < policy.semiAutoMinAgreement) {
    blockers.push(`Wymagana zgodność rekomendacji ≥ ${Math.round(policy.semiAutoMinAgreement * 100)}%.`);
  }
  if (falsePositiveRate == null || falsePositiveRate > policy.semiAutoMaxFalsePositiveRate) {
    blockers.push(`False positive musi być ≤ ${Math.round(policy.semiAutoMaxFalsePositiveRate * 100)}%.`);
  }
  if (observationDays < policy.semiAutoMinObservationDays) {
    blockers.push(`Wymagany okres obserwacji ${policy.semiAutoMinObservationDays} dni.`);
  }
  if (!policy.semiAutoAllowedNamespaces.length) blockers.push('Brak dozwolonych KB.');
  if (policy.dryRun) blockers.push('Discovery działa w wymuszonym trybie dry-run.');
  return {
    configured: policy.semiAutoEnabled,
    eligible: blockers.filter((item) => !/wyłączony|dry-run/i.test(item)).length === 0,
    active: blockers.length === 0,
    blockers,
    metrics: {
      reviewed: feedback.overall.reviewed,
      agreement: feedback.overall.agreement,
      falsePositiveRate,
      observationDays: Math.round(observationDays * 10) / 10,
      minimumConfidence: policy.semiAutoMinConfidence,
      maxPerRun: policy.semiAutoMaxPerRun,
      allowedNamespaces: policy.semiAutoAllowedNamespaces,
    },
  };
}

export function discoveryCalibrationSample(
  candidates = listDiscoveryCandidates(5000),
  target = loadDiscoveryPolicy().calibrationTarget,
) {
  const eligibleCandidates = candidates.filter((candidate) => candidate.status !== 'DUPLICATE');
  const normalizedTarget = Math.max(1, Math.min(200, Number(target) || 30));
  const profiles = loadDiscoveryPolicy().profiles;
  const perKb = Math.max(1, Math.floor(normalizedTarget / Math.max(profiles.length, 1)));
  const selected = [];
  for (const profile of profiles) {
    const scoped = eligibleCandidates
      .filter((candidate) => candidate.kbNamespace === profile.kbNamespace)
      .sort((left, right) => (
        String(left.createdAt).localeCompare(String(right.createdAt))
        || String(left.id).localeCompare(String(right.id))
      ));
    selected.push(...scoped.slice(0, perKb));
  }
  if (selected.length < normalizedTarget) {
    const selectedIds = new Set(selected.map((candidate) => candidate.id));
    const remaining = eligibleCandidates
      .filter((candidate) => !selectedIds.has(candidate.id))
      .sort((left, right) => (
        String(left.createdAt).localeCompare(String(right.createdAt))
        || String(left.id).localeCompare(String(right.id))
      ));
    selected.push(...remaining.slice(0, normalizedTarget - selected.length));
  }
  const sample = selected.slice(0, normalizedTarget);
  const reviewed = sample.filter((candidate) => candidate.operatorDecision?.source === 'operator').length;
  return {
    target: normalizedTarget,
    size: sample.length,
    reviewed,
    pending: sample.length - reviewed,
    complete: sample.length >= normalizedTarget && reviewed >= normalizedTarget,
    candidateIds: sample.map((candidate) => candidate.id),
  };
}

export function discoveryFeedbackSummary(candidates = listDiscoveryCandidates(5000)) {
  const operatorReviewed = candidates.filter((candidate) => candidate.operatorDecision?.source === 'operator');
  const notes = operatorReviewed
    .filter((candidate) => candidate.operatorDecision.note)
    .sort((left, right) => (
      String(right.operatorDecision.decidedAt).localeCompare(String(left.operatorDecision.decidedAt))
    ))
    .slice(0, 20)
    .map((candidate) => ({
      kbNamespace: candidate.kbNamespace,
      queryId: candidate.queryId,
      expectedAction: candidate.operatorDecision.expectedAction,
      actualAction: candidate.operatorDecision.actualAction,
      note: candidate.operatorDecision.note,
    }));
  return {
    overall: metricGroup(candidates),
    calibration: discoveryCalibrationSample(candidates),
    byKb: groupFeedback(candidates, (candidate) => candidate.kbNamespace),
    byTier: groupFeedback(candidates, (candidate) => candidate.sourceTier),
    byAction: groupFeedback(candidates, (candidate) => candidate.action),
    byQuery: groupFeedback(candidates, (candidate) => candidate.queryId),
    recentNotes: notes,
  };
}

export function draftBudgetStatus(namespace, now = new Date(), policy = loadDiscoveryPolicy()) {
  const candidates = listDiscoveryCandidates(5000).filter((candidate) => (
    candidate.kbNamespace === namespace && candidate.status === 'DRAFTED'
  ));
  const day = now.toISOString().slice(0, 10);
  const week = weekKey(now);
  const daily = candidates.filter((candidate) => String(candidate.draftedAt || '').startsWith(day)).length;
  const weekly = candidates.filter((candidate) => (
    candidate.draftedAt && weekKey(new Date(candidate.draftedAt)) === week
  )).length;
  return {
    daily,
    weekly,
    dailyLimit: policy.dailyDraftLimitPerKb,
    weeklyLimit: policy.weeklyDraftLimitPerKb,
    allowed: daily < policy.dailyDraftLimitPerKb && weekly < policy.weeklyDraftLimitPerKb,
  };
}

export function discoveryActionForAssessment(profile, tier, assessment, policy = loadDiscoveryPolicy()) {
  if (assessment.action === 'REJECT' || tier === 'unknown') return 'REJECT';
  if (profile.mode === 'PARTNER_ROUTE') return 'ROUTE_TO_PIPELINE';
  if (profile.mode === 'CANDIDATE_ONLY') return 'CANDIDATE_ONLY';
  const threshold = tier === 'official'
    ? policy.officialConfidence
    : tier === 'community'
      ? policy.communityConfidence
      : policy.professionalConfidence;
  if (
    assessment.confidence < threshold
    || assessment.duplicateRisk === 'high'
    || assessment.contentRisk === 'high'
  ) return 'CANDIDATE_ONLY';
  return assessment.action === 'CREATE_DRAFT' ? 'CREATE_DRAFT' : 'CANDIDATE_ONLY';
}

export async function createDraftFromDiscoveryCandidate(
  candidateId,
  operator = 'discovery',
  note = '',
) {
  const candidate = readDiscoveryCandidate(candidateId);
  if (!candidate) throw new Error(`Discovery candidate not found: ${candidateId}`);
  if (!isReviewableDiscoveryCandidate(candidate)) {
    throw new Error(`Candidate cannot create a draft from status ${candidate.status}`);
  }
  if (candidate.action === 'ROUTE_TO_PIPELINE') {
    throw new Error('Partner pipeline candidate must be routed instead of drafted');
  }
  const corpusMatch = findExistingCorpusSource(candidate.canonicalUrl);
  if (corpusMatch) {
    return markDiscoveryCandidateDuplicate(
      candidate,
      'draft',
      operator,
      note,
      'existing_corpus',
      corpusMatch,
    );
  }
  const existing = findExistingDraftBySourceUrl(candidate.canonicalUrl);
  if (existing) {
    return markDiscoveryCandidateDuplicate(
      candidate,
      'draft',
      operator,
      note,
      'existing_draft',
      existing,
    );
  }
  const policy = loadDiscoveryPolicy();
  const budget = draftBudgetStatus(candidate.kbNamespace, new Date(), policy);
  if (!budget.allowed) throw new Error(`Discovery draft budget exceeded for ${candidate.kbNamespace}`);
  const target = TARGET_KBS[candidate.kbNamespace];
  if (!target) throw new Error(`Unsupported discovery target: ${candidate.kbNamespace}`);
  const draft = await submitKnowledgeDraft({
    kbName: target.kbName,
    kbNamespace: candidate.kbNamespace,
    title: candidate.title,
    content: [
      'Automated source-discovery draft.',
      '',
      `Query: ${candidate.query}`,
      `Source: ${candidate.canonicalUrl}`,
      `Tier: ${candidate.sourceTier}`,
      `Discovery confidence: ${candidate.assessment.confidence}`,
      '',
      candidate.content || candidate.snippet,
      '',
      'Review this draft before promotion.',
    ].join('\n'),
    sourceUrl: candidate.canonicalUrl,
    tags: [...new Set(['discovery', candidate.sourceTier, ...(candidate.tags || [])])],
    metadata: {
      discoveredVia: 'source_list',
      sourceTier: candidate.sourceTier === 'professional' ? 'professional_commentary' : candidate.sourceTier,
      retrievedAt: candidate.retrievedAt,
      discoveryCandidateId: candidate.id,
      discoveryQueryId: candidate.queryId,
      discoveryRunId: candidate.runId,
      discoveryAction: candidate.action,
      discoveryConfidence: candidate.assessment.confidence,
      discoveryPromptVersion: candidate.assessment.promptVersion,
      discoveryModel: candidate.assessment.model,
      contentHash: candidate.contentHash,
    },
  }, { silent: true });
  const next = saveDiscoveryCandidate({
    ...candidate,
    status: 'DRAFTED',
    draftedAt: new Date().toISOString(),
    draftedBy: operator,
    draftId: draft.draft.id,
    operatorDecision: buildOperatorDecision(candidate, 'draft', operator, note, 'DRAFTED'),
  });
  appendDashboardAudit({
    actor: operator,
    role: operator === 'discovery-daily' ? 'system' : 'operator',
    action: 'discovery.candidate.draft',
    resourceType: 'discovery_candidate',
    resourceId: candidate.id,
    before: { status: candidate.status },
    after: { status: next.status, draftId: next.draftId },
  });
  return next;
}

export function routeDiscoveryCandidate(candidateId, operator = 'discovery', note = '') {
  const candidate = readDiscoveryCandidate(candidateId);
  if (!candidate) throw new Error(`Discovery candidate not found: ${candidateId}`);
  if (candidate.action !== 'ROUTE_TO_PIPELINE') {
    throw new Error(`Candidate action is ${candidate.action}; expected ROUTE_TO_PIPELINE`);
  }
  if (!isReviewableDiscoveryCandidate(candidate)) {
    throw new Error(`Candidate cannot be routed from status ${candidate.status}`);
  }
  const corpusMatch = findExistingCorpusSource(candidate.canonicalUrl);
  if (corpusMatch) {
    return markDiscoveryCandidateDuplicate(
      candidate,
      'route',
      operator,
      note,
      'existing_corpus',
      corpusMatch,
    );
  }
  ensureDir(path.dirname(DISCOVERY_ROUTES_PATH));
  const route = {
    id: `partner_route_${crypto.randomUUID().slice(0, 10)}`,
    candidateId,
    url: candidate.canonicalUrl,
    title: candidate.title,
    targetPipeline: 'scripts/download_optima_partner_technical_assets.mjs',
    status: 'QUEUED_FOR_PARTNER_REGISTRY_MATCH',
    routedAt: new Date().toISOString(),
    routedBy: operator,
  };
  fs.appendFileSync(DISCOVERY_ROUTES_PATH, `${JSON.stringify(route)}\n`, 'utf8');
  const next = saveDiscoveryCandidate({
    ...candidate,
    status: 'ROUTED',
    route,
    operatorDecision: buildOperatorDecision(candidate, 'route', operator, note, 'ROUTED'),
  });
  appendDashboardAudit({
    actor: operator,
    role: 'operator',
    action: 'discovery.candidate.route',
    resourceType: 'discovery_candidate',
    resourceId: candidate.id,
    before: { status: candidate.status },
    after: { status: next.status, route },
  });
  return next;
}

export function rejectDiscoveryCandidate(candidateId, operator = 'discovery', note = '') {
  const candidate = readDiscoveryCandidate(candidateId);
  if (!candidate) throw new Error(`Discovery candidate not found: ${candidateId}`);
  if (!isReviewableDiscoveryCandidate(candidate)) {
    throw new Error(`Candidate cannot be rejected from status ${candidate.status}`);
  }
  const next = saveDiscoveryCandidate({
    ...candidate,
    status: 'REJECTED',
    rejectedAt: new Date().toISOString(),
    rejectedBy: operator,
    rejectionNote: String(note || '').slice(0, 1000),
    operatorDecision: buildOperatorDecision(candidate, 'reject', operator, note, 'REJECTED'),
  });
  appendDashboardAudit({
    actor: operator,
    role: 'operator',
    action: 'discovery.candidate.reject',
    resourceType: 'discovery_candidate',
    resourceId: candidate.id,
    before: { status: candidate.status },
    after: { status: next.status, note: next.rejectionNote },
  });
  return next;
}

export async function bulkDecideDiscoveryCandidates(
  candidateIds,
  decision,
  operator = 'dashboard',
  note = '',
) {
  const ids = [...new Set((candidateIds || []).map(String).filter(Boolean))];
  if (!ids.length) throw new Error('candidateIds is required');
  if (ids.length > 50) throw new Error('At most 50 discovery candidates can be processed at once');
  if (!['draft', 'route', 'reject'].includes(decision)) throw new Error(`Unsupported bulk decision: ${decision}`);
  const bulkId = `discovery_bulk_${crypto.randomUUID().slice(0, 12)}`;
  const results = [];
  for (const candidateId of ids) {
    try {
      const candidate = decision === 'draft'
        ? await createDraftFromDiscoveryCandidate(candidateId, operator, note)
        : decision === 'route'
          ? routeDiscoveryCandidate(candidateId, operator, note)
          : rejectDiscoveryCandidate(candidateId, operator, note);
      const next = saveDiscoveryCandidate({
        ...candidate,
        operatorDecision: {
          ...candidate.operatorDecision,
          bulkId,
        },
      });
      results.push({ candidateId, ok: true, status: next.status, draftId: next.draftId || '' });
    } catch (error) {
      results.push({ candidateId, ok: false, error: error.message });
    }
  }
  const result = {
    bulkId,
    decision,
    requested: ids.length,
    succeeded: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results,
  };
  appendDashboardAudit({
    actor: operator,
    role: 'operator',
    action: 'discovery.candidate.bulk',
    resourceType: 'discovery_bulk',
    resourceId: bulkId,
    outcome: result.failed ? 'partial' : 'success',
    after: result,
  });
  return result;
}

export function canUndoDiscoveryCandidate(candidate, now = new Date()) {
  if (!candidate?.operatorDecision || candidate.operatorDecision.source !== 'operator') return false;
  if (!['REJECTED', 'ROUTED'].includes(candidate.status)) return false;
  const decidedAt = Date.parse(candidate.operatorDecision.decidedAt || '');
  return Number.isFinite(decidedAt) && now.getTime() - decidedAt <= UNDO_WINDOW_MS;
}

export function undoDiscoveryCandidate(candidateId, operator = 'dashboard') {
  const candidate = readDiscoveryCandidate(candidateId);
  if (!candidate) throw new Error(`Discovery candidate not found: ${candidateId}`);
  if (!canUndoDiscoveryCandidate(candidate)) {
    throw new Error('Decision can only be undone within 10 minutes for a rejected or routed candidate');
  }
  const previousDecision = candidate.operatorDecision;
  if (candidate.status === 'ROUTED') {
    ensureDir(path.dirname(DISCOVERY_ROUTES_PATH));
    fs.appendFileSync(DISCOVERY_ROUTES_PATH, `${JSON.stringify({
      id: `partner_route_cancel_${crypto.randomUUID().slice(0, 10)}`,
      candidateId,
      routeId: candidate.route?.id || '',
      status: 'CANCELLED_BY_OPERATOR',
      cancelledAt: new Date().toISOString(),
      cancelledBy: operator,
    })}\n`, 'utf8');
  }
  const next = saveDiscoveryCandidate({
    ...candidate,
    status: 'CANDIDATE_ONLY',
    operatorDecision: null,
    decisionHistory: [
      ...(candidate.decisionHistory || []),
      {
        ...previousDecision,
        undoneAt: new Date().toISOString(),
        undoneBy: operator,
      },
    ],
    route: undefined,
    rejectedAt: undefined,
    rejectedBy: undefined,
    rejectionNote: undefined,
  });
  appendDashboardAudit({
    actor: operator,
    role: 'operator',
    action: 'discovery.candidate.undo',
    resourceType: 'discovery_candidate',
    resourceId: candidate.id,
    before: { status: candidate.status, operatorDecision: previousDecision },
    after: { status: next.status },
  });
  return next;
}

export function reconcileDiscoveryCorpusDuplicates(operator = 'discovery-reconcile') {
  const candidates = listDiscoveryCandidates(5000);
  const reconciled = [];
  for (const candidate of candidates) {
    if (!isReviewableDiscoveryCandidate(candidate)) continue;
    const corpusMatch = findExistingCorpusSource(candidate.canonicalUrl);
    if (!corpusMatch) continue;
    reconciled.push(saveDiscoveryCandidate({
      ...candidate,
      status: 'DUPLICATE',
      duplicateType: 'existing_corpus',
      corpusMatch,
      duplicateDetectedAt: new Date().toISOString(),
    }));
  }
  if (reconciled.length) {
    appendDashboardAudit({
      actor: operator,
      role: 'system',
      action: 'discovery.candidate.corpus_reconcile',
      resourceType: 'discovery_candidates',
      resourceId: `corpus_reconcile_${new Date().toISOString()}`,
      outcome: 'success',
      after: {
        reconciled: reconciled.length,
        candidateIds: reconciled.map((candidate) => candidate.id),
      },
    });
  }
  return {
    scanned: candidates.length,
    reconciled: reconciled.length,
    candidateIds: reconciled.map((candidate) => candidate.id),
  };
}

export function discoveryQualityAlerts(
  queries = loadDiscoveryQueries().queries,
  candidates = listDiscoveryCandidates(5000),
) {
  const alerts = [];
  const analytics = discoveryQueryAnalytics(queries, candidates);
  for (const query of analytics) {
    if (query.analytics.health === 'DUPLICATE_HEAVY') {
      alerts.push({
        level: 'warn',
        type: 'query_duplicate_rate',
        resourceId: query.id,
        kbNamespace: query.kbNamespace,
        message: `Zapytanie ma ${Math.round(query.analytics.duplicateRate * 100)}% duplikatów w ostatnim przebiegu.`,
      });
    }
    if (query.analytics.health === 'LOW_YIELD') {
      alerts.push({
        level: 'warn',
        type: 'query_low_yield',
        resourceId: query.id,
        kbNamespace: query.kbNamespace,
        message: `Zapytanie nie zwraca nowych wyników (${query.emptyRuns || 0} puste przebiegi).`,
      });
    }
  }
  const unknownDomains = candidates.filter((candidate) => (
    isReviewableDiscoveryCandidate(candidate) && candidate.sourceTier === 'unknown'
  ));
  if (unknownDomains.length) {
    alerts.push({
      level: 'warn',
      type: 'unknown_domains',
      resourceId: '',
      kbNamespace: '',
      message: `${unknownDomains.length} kandydatów pochodzi z domen spoza profili zaufania.`,
    });
  }
  return alerts
    .sort((left, right) => left.type.localeCompare(right.type))
    .slice(0, 30);
}

export function refreshDiscoveryBriefing() {
  const policy = loadDiscoveryPolicy();
  const candidates = listDiscoveryCandidates(5000);
  const queries = loadDiscoveryQueries().queries;
  const enriched = candidates.map((candidate) => ({
    ...candidate,
    priority: discoveryCandidatePriority(candidate, candidates),
  }));
  const alerts = discoveryQualityAlerts(queries, candidates);
  const briefing = {
    generatedAt: new Date().toISOString(),
    totals: {
      candidates: candidates.length,
      pending: candidates.filter(isReviewableDiscoveryCandidate).length,
      duplicates: candidates.filter((candidate) => candidate.status === 'DUPLICATE').length,
      reviewed: candidates.filter((candidate) => candidate.operatorDecision?.source === 'operator').length,
      activeQueries: queries.filter((query) => query.enabled !== false).length,
      alerts: alerts.length,
    },
    topCandidates: enriched
      .filter(isReviewableDiscoveryCandidate)
      .sort((left, right) => (
        right.priority.score - left.priority.score
        || String(left.createdAt).localeCompare(String(right.createdAt))
      ))
      .slice(0, 10)
      .map((candidate) => ({
        id: candidate.id,
        title: candidate.title,
        kbNamespace: candidate.kbNamespace,
        canonicalUrl: candidate.canonicalUrl,
        action: candidate.action,
        priority: candidate.priority,
      })),
    queryIssues: discoveryQueryAnalytics(queries, candidates)
      .filter((query) => query.analytics.health !== 'GOOD')
      .sort((left, right) => left.analytics.efficiencyScore - right.analytics.efficiencyScore)
      .slice(0, 15)
      .map((query) => ({
        id: query.id,
        kbNamespace: query.kbNamespace,
        query: query.query,
        analytics: query.analytics,
      })),
    alerts,
    semiAuto: discoverySemiAutoStatus(policy, candidates),
  };
  fs.writeFileSync(DISCOVERY_BRIEFING_PATH, `${JSON.stringify(briefing, null, 2)}\n`, 'utf8');
  const markdown = [
    '# ERP KB Discovery Daily Briefing',
    '',
    `Generated: \`${briefing.generatedAt}\``,
    '',
    `- Pending candidates: \`${briefing.totals.pending}\``,
    `- Corpus duplicates: \`${briefing.totals.duplicates}\``,
    `- Operator decisions: \`${briefing.totals.reviewed}\``,
    `- Quality alerts: \`${briefing.totals.alerts}\``,
    `- Semi-auto active: \`${briefing.semiAuto.active}\``,
    '',
    '## Top candidates',
    '',
    ...briefing.topCandidates.map((item) => (
      `- **${item.priority.score}** [${item.title}](${item.canonicalUrl}) → \`${item.kbNamespace}\``
    )),
    '',
    '## Query issues',
    '',
    ...briefing.queryIssues.map((item) => (
      `- \`${item.id}\`: ${item.analytics.health}, efficiency ${item.analytics.efficiencyScore}`
    )),
    '',
  ].join('\n');
  fs.writeFileSync(DISCOVERY_BRIEFING_PATH.replace(/\.json$/, '.md'), markdown, 'utf8');
  return briefing;
}

export function setDiscoveryQueryEnabled(queryId, enabled, operator = 'dashboard') {
  const state = loadDiscoveryQueries();
  const index = state.queries.findIndex((query) => query.id === queryId);
  if (index === -1) throw new Error(`Discovery query not found: ${queryId}`);
  const before = state.queries[index];
  state.queries[index] = {
    ...before,
    enabled: Boolean(enabled),
    updatedAt: new Date().toISOString(),
    updatedBy: operator,
  };
  saveDiscoveryQueries(state.queries);
  appendDashboardAudit({
    actor: operator,
    role: 'admin',
    action: 'discovery.query.update',
    resourceType: 'discovery_query',
    resourceId: queryId,
    before,
    after: state.queries[index],
  });
  return state.queries[index];
}

export function discoveryQueryStateAfterRun(
  query,
  resultCount,
  corpusDuplicateCount,
  now = new Date(),
  policy = loadDiscoveryPolicy(),
) {
  const results = Math.max(0, Number(resultCount || 0));
  const duplicates = Math.max(0, Number(corpusDuplicateCount || 0));
  const duplicateRate = results ? duplicates / results : 0;
  const emptyRuns = results ? 0 : Number(query.emptyRuns || 0) + 1;
  const lowValueRun = !results || duplicateRate >= policy.highDuplicateRate;
  const consecutiveLowValueRuns = lowValueRun
    ? Number(query.consecutiveLowValueRuns || 0) + 1
    : 0;
  const retireForEmpty = emptyRuns >= policy.emptyRunRetirementThreshold;
  const retireForLowValue = consecutiveLowValueRuns >= policy.lowValueRetirementThreshold;
  const retire = query.source === 'generated' && (retireForEmpty || retireForLowValue);
  return {
    ...query,
    lastRunAt: now.toISOString(),
    lastResultCount: results,
    lastCorpusDuplicateCount: duplicates,
    totalResultCount: Number(query.totalResultCount || 0) + results,
    totalCorpusDuplicateCount: Number(query.totalCorpusDuplicateCount || 0) + duplicates,
    consecutiveLowValueRuns,
    emptyRuns,
    enabled: retire ? false : query.enabled,
    retiredReason: retire
      ? retireForEmpty ? 'repeated_empty' : 'repeated_low_value'
      : '',
  };
}

export function writeDiscoveryRun(report) {
  const filePath = path.join(DISCOVERY_RUNS_ROOT, `${report.id}.json`);
  writeJson(filePath, report);
  return filePath;
}

export function listDiscoveryRuns(limit = 30) {
  if (!fs.existsSync(DISCOVERY_RUNS_ROOT)) return [];
  return fs.readdirSync(DISCOVERY_RUNS_ROOT)
    .filter((name) => name.endsWith('.json'))
    .map((name) => readJson(path.join(DISCOVERY_RUNS_ROOT, name), null))
    .filter(Boolean)
    .sort((left, right) => String(right.startedAt).localeCompare(String(left.startedAt)))
    .slice(0, limit);
}

export function refreshDiscoveryReport() {
  const policy = loadDiscoveryPolicy();
  const queries = loadDiscoveryQueries().queries;
  const candidates = listDiscoveryCandidates(5000);
  const active = activeDiscoveryQueries();
  const feedback = discoveryFeedbackSummary(candidates);
  const byKb = policy.profiles.map((profile) => {
    const kbCandidates = candidates.filter((candidate) => candidate.kbNamespace === profile.kbNamespace);
    return {
      kbNamespace: profile.kbNamespace,
      kbName: profile.kbName,
      mode: profile.mode,
      activeQueries: active.filter((query) => query.kbNamespace === profile.kbNamespace).length,
      totalQueries: queries.filter((query) => query.kbNamespace === profile.kbNamespace).length,
      candidates: kbCandidates.length,
      drafted: kbCandidates.filter((candidate) => candidate.status === 'DRAFTED').length,
      pending: kbCandidates.filter(isReviewableDiscoveryCandidate).length,
      routed: kbCandidates.filter((candidate) => candidate.status === 'ROUTED').length,
      rejected: kbCandidates.filter((candidate) => candidate.status === 'REJECTED').length,
      duplicates: kbCandidates.filter((candidate) => candidate.status === 'DUPLICATE').length,
      lastCandidateAt: kbCandidates[0]?.createdAt || '',
    };
  });
  const report = {
    generatedAt: new Date().toISOString(),
    overall: byKb.every((item) => item.activeQueries > 0) ? 'PASS' : 'ACTION_NEEDED',
    profileVersion: policy.version,
    dryRun: policy.dryRun,
    coverage: {
      configuredKbs: byKb.length,
      coveredKbs: byKb.filter((item) => item.activeQueries > 0).length,
    },
    totals: {
      queries: queries.length,
      activeQueries: active.length,
      candidates: candidates.length,
      drafted: candidates.filter((candidate) => candidate.status === 'DRAFTED').length,
      pending: candidates.filter(isReviewableDiscoveryCandidate).length,
      routed: candidates.filter((candidate) => candidate.status === 'ROUTED').length,
      rejected: candidates.filter((candidate) => candidate.status === 'REJECTED').length,
      duplicates: candidates.filter((candidate) => candidate.status === 'DUPLICATE').length,
    },
    feedback,
    byKb,
    recentRuns: listDiscoveryRuns(10).map((run) => ({
      id: run.id,
      type: run.type,
      ok: run.ok,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      resultCount: run.resultCount || 0,
      draftedCount: run.draftedCount || 0,
      error: run.error || '',
    })),
  };
  fs.writeFileSync(DISCOVERY_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  const lines = [
    '# ERP KB Discovery Coverage Report',
    '',
    `Generated: \`${report.generatedAt}\``,
    '',
    `- Overall: \`${report.overall}\``,
    `- Coverage: \`${report.coverage.coveredKbs}/${report.coverage.configuredKbs}\``,
    `- Active queries: \`${report.totals.activeQueries}\``,
    `- Candidates: \`${report.totals.candidates}\``,
    `- Drafted: \`${report.totals.drafted}\``,
    `- Corpus duplicates: \`${report.totals.duplicates}\``,
    `- Operator decisions: \`${report.feedback.overall.reviewed}\``,
    `- Calibration: \`${report.feedback.calibration.reviewed}/${report.feedback.calibration.target}\``,
    `- Agreement: \`${report.feedback.overall.agreement == null ? 'N/A' : `${Math.round(report.feedback.overall.agreement * 100)}%`}\``,
    `- Dry run: \`${report.dryRun}\``,
    '',
    '| KB | Mode | Queries | Candidates | Drafted | Pending | Routed |',
    '|---|---|---:|---:|---:|---:|---:|',
    ...byKb.map((item) => (
      `| ${item.kbNamespace} | ${item.mode} | ${item.activeQueries} | ${item.candidates} | ${item.drafted} | ${item.pending} | ${item.routed} |`
    )),
    '',
  ];
  fs.writeFileSync(DISCOVERY_REPORT_PATH.replace(/\.json$/, '.md'), lines.join('\n'), 'utf8');
  refreshDiscoveryBriefing();
  return report;
}

function duplicateExplanation(candidate) {
  if (candidate.status !== 'DUPLICATE') return null;
  if (candidate.duplicateType === 'existing_corpus') {
    return {
      type: 'existing_corpus',
      method: 'exact_canonical_url',
      label: 'Dokładny URL istnieje już w rejestrze korpusu.',
      kbNamespace: candidate.corpusMatch?.kbNamespace || '',
      sourceUrl: candidate.corpusMatch?.sourceUrl || candidate.canonicalUrl,
      registryPath: candidate.corpusMatch?.registryPath || '',
    };
  }
  return {
    type: 'existing_draft',
    method: 'exact_canonical_url',
    label: 'Dokładny URL istnieje już w knowledge inbox.',
    kbNamespace: candidate.existing?.kbNamespace || '',
    sourceUrl: candidate.canonicalUrl,
    draftId: candidate.existing?.draftId || '',
    status: candidate.existing?.status || '',
    title: candidate.existing?.title || '',
  };
}

export function discoverySummary() {
  const policy = loadDiscoveryPolicy();
  const rawQueries = loadDiscoveryQueries().queries;
  const rawCandidates = listDiscoveryCandidates(500);
  const candidates = rawCandidates.map((candidate) => ({
    ...candidate,
    priority: discoveryCandidatePriority(candidate, rawCandidates),
    duplicateExplanation: duplicateExplanation(candidate),
    canUndo: canUndoDiscoveryCandidate(candidate),
    undoExpiresAt: canUndoDiscoveryCandidate(candidate)
      ? new Date(Date.parse(candidate.operatorDecision.decidedAt) + UNDO_WINDOW_MS).toISOString()
      : '',
  })).sort((left, right) => (
    right.priority.score - left.priority.score
    || String(right.createdAt).localeCompare(String(left.createdAt))
  ));
  const queries = discoveryQueryAnalytics(rawQueries, rawCandidates);
  const report = fs.existsSync(DISCOVERY_REPORT_PATH)
    ? readJson(DISCOVERY_REPORT_PATH, null)
    : null;
  const briefing = fs.existsSync(DISCOVERY_BRIEFING_PATH)
    ? readJson(DISCOVERY_BRIEFING_PATH, null)
    : null;
  return {
    policy,
    queries,
    candidates,
    feedback: discoveryFeedbackSummary(rawCandidates),
    qualityAlerts: discoveryQualityAlerts(rawQueries, rawCandidates),
    semiAuto: discoverySemiAutoStatus(policy, rawCandidates),
    briefing,
    report,
    runs: listDiscoveryRuns(20),
    coverage: report?.coverage || {
      configuredKbs: policy.profiles.length,
      coveredKbs: new Set(activeDiscoveryQueries().map((query) => query.kbNamespace)).size,
    },
  };
}
