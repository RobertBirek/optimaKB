#!/usr/bin/env node

const OFFICIAL_DOMAINS = [
  'comarch.pl',
  'pomoc.comarch.pl',
  'comarchbetterfly.pl',
  'pomoc.comarchbetterfly.pl',
  'app.comarchbetterfly.pl',
  'partner.erp.comarch.pl',
  'gov.pl',
  'podatki.gov.pl',
  'zus.pl',
  'pip.gov.pl',
  'biznes.gov.pl',
  'isap.sejm.gov.pl',
  'dziennikustaw.gov.pl',
  'sejm.gov.pl',
  'praca.gov.pl',
];

const PROFESSIONAL_DOMAINS = [
  'infor.pl',
  'poradnikprzedsiebiorcy.pl',
  'pit.pl',
  'lexlege.pl',
  'rachunkowosc.com.pl',
];

const COMMUNITY_DOMAINS = [
  'spolecznosc.comarch.pl',
];

const RECENCY_TERMS = [
  'ostatnio',
  'aktualizacja',
  'aktualizacje',
  'aktualnosc',
  'aktualnosci',
  'nowa wersja',
  'nowe wersje',
  'planowane wersje',
  'komunikat',
  'awaria',
  'awarie',
  'przerwa techniczna',
  'niedostepnosc',
  'news',
];

function normalizeHostname(hostname) {
  return String(hostname || '')
    .trim()
    .toLowerCase()
    .replace(/^www\./, '');
}

function domainMatches(hostname, domain) {
  const left = normalizeHostname(hostname);
  const right = normalizeHostname(domain);
  return left === right || left.endsWith(`.${right}`);
}

export function normalizeUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    url.hash = '';
    if ((url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443')) {
      url.port = '';
    }
    return url.toString();
  } catch {
    return String(value || '').trim();
  }
}

export function classifySourceTier(urlOrDomain) {
  let hostname = '';
  try {
    hostname = new URL(String(urlOrDomain || '').trim()).hostname;
  } catch {
    hostname = String(urlOrDomain || '').trim();
  }
  hostname = normalizeHostname(hostname);
  if (!hostname) return 'third_party';
  if (OFFICIAL_DOMAINS.some((domain) => domainMatches(hostname, domain))) return 'official';
  if (COMMUNITY_DOMAINS.some((domain) => domainMatches(hostname, domain))) return 'community';
  if (PROFESSIONAL_DOMAINS.some((domain) => domainMatches(hostname, domain))) return 'third_party';
  return 'third_party';
}

export function trustRankForTier(tier) {
  if (tier === 'official') return 3;
  if (tier === 'community') return 2;
  return 1;
}

export function isRecencyQuestion(questionNormalized) {
  const normalized = String(questionNormalized || '').toLowerCase();
  return RECENCY_TERMS.some((term) => normalized.includes(term));
}

export function preferredDomainsForKb(kbName) {
  switch (kbName) {
    case 'ComarchBetterflyReference':
      return [
        'pomoc.comarchbetterfly.pl',
        'comarchbetterfly.pl',
        'app.comarchbetterfly.pl',
        'spolecznosc.comarch.pl',
      ];
    case 'ComarchCommunityNews':
      return [
        'spolecznosc.comarch.pl',
        'pomoc.comarch.pl',
        'pomoc.comarchbetterfly.pl',
      ];
    case 'TaxbellLegalReference':
      return ['isap.sejm.gov.pl', 'dziennikustaw.gov.pl', 'podatki.gov.pl', 'gov.pl', 'biznes.gov.pl'];
    case 'TaxbellPayrollHRReference':
      return ['zus.pl', 'pip.gov.pl', 'gov.pl', 'biznes.gov.pl', 'praca.gov.pl'];
    case 'TaxbellAccountingVATReference':
      return ['podatki.gov.pl', 'gov.pl', 'biznes.gov.pl', 'isap.sejm.gov.pl'];
    default:
      return [
        'pomoc.comarch.pl',
        'comarch.pl',
        'spolecznosc.comarch.pl',
      ];
  }
}

export function dedupeExternalResults(results) {
  const seen = new Set();
  const deduped = [];
  for (const result of results || []) {
    const key = normalizeUrl(result.url || result.id || '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(result);
  }
  return deduped;
}

export function sortExternalResults(results, preferredDomains = []) {
  return [...(results || [])].sort((a, b) => {
    const tierDiff = (b.trustRank || 0) - (a.trustRank || 0);
    if (tierDiff !== 0) return tierDiff;
    const aPreferred = preferredDomains.some((domain) => domainMatches(a.domain, domain)) ? 1 : 0;
    const bPreferred = preferredDomains.some((domain) => domainMatches(b.domain, domain)) ? 1 : 0;
    if (aPreferred !== bPreferred) return bPreferred - aPreferred;
    const aDate = Date.parse(a.publishedDate || a.updatedDate || '') || 0;
    const bDate = Date.parse(b.publishedDate || b.updatedDate || '') || 0;
    if (aDate !== bDate) return bDate - aDate;
    return String(a.title || '').localeCompare(String(b.title || ''));
  });
}

export function shouldUseExternalFallback({ questionNormalized, evidence, primaryKb }) {
  const recency = isRecencyQuestion(questionNormalized);
  const localMaxScore = Math.max(0, ...((evidence || []).map((entry) => entry.hits?.[0]?.score || 0)));
  const weakEvidence = !evidence.length || localMaxScore < 3;
  const kbIsNews = primaryKb === 'ComarchCommunityNews';
  return {
    shouldFallback: weakEvidence || recency || (kbIsNews && localMaxScore < 4),
    reason: weakEvidence ? 'weak_local_evidence' : recency ? 'recency_question' : kbIsNews ? 'community_news_refresh_bias' : '',
    localMaxScore,
    recency,
  };
}

export function buildExternalCitationLine(result) {
  const sourceLabel = result.sourceType === 'official'
    ? 'official'
    : result.sourceType === 'community'
      ? 'community'
      : 'third-party';
  return `${result.title || result.url} (${sourceLabel}) - ${result.url}`;
}
