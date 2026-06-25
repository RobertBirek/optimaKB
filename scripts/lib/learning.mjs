import fs from 'fs';
import path from 'path';
import process from 'process';
import crypto from 'crypto';

const ROOT = process.env.ROOT || '/docker/openspg';
const GAPS_LOG = path.join(ROOT, 'logs/learning_gaps.jsonl');
const MAX_DAILY_DRAFTS = Number(process.env.LEARNING_MAX_DAILY_DRAFTS || 20);
const GAP_LOG_MAX_BYTES = 5 * 1024 * 1024;
const GAP_LOG_BACKUP_COUNT = 3;
const CONFIDENCE_LOW_THRESHOLD = 0.3;

export function normalizeQuestion(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function computeConfidenceScore(opts = {}) {
  const { evidenceCount = 0, maxScore = 0, externalResultCount = 0 } = opts;
  const evidenceScore = Math.min(evidenceCount / 5, 1) * 0.6;
  const scoreScore = Math.min(maxScore / 10, 1) * 0.3;
  const externalScore = Math.min(externalResultCount / 3, 1) * 0.1;
  return Math.round((evidenceScore + scoreScore + externalScore) * 100) / 100;
}

function rotateGapLog() {
  if (!fs.existsSync(GAPS_LOG)) return;
  const stat = fs.statSync(GAPS_LOG);
  if (stat.size < GAP_LOG_MAX_BYTES) return;
  const dir = path.dirname(GAPS_LOG);
  const base = path.basename(GAPS_LOG);
  for (let i = GAP_LOG_BACKUP_COUNT - 1; i >= 0; i--) {
    const oldPath = path.join(dir, `${base}.${i}`);
    const newPath = path.join(dir, `${base}.${i + 1}`);
    if (fs.existsSync(oldPath)) fs.renameSync(oldPath, newPath);
  }
  fs.renameSync(GAPS_LOG, path.join(dir, `${base}.1`));
}

export function readGapLog() {
  if (!fs.existsSync(GAPS_LOG)) return [];
  const lines = fs.readFileSync(GAPS_LOG, 'utf8').trim().split('\n').filter(Boolean);
  return lines.map((line) => {
    try { return JSON.parse(line); }
    catch { return null; }
  }).filter(Boolean);
}

function appendGapLog(entry) {
  rotateGapLog();
  fs.mkdirSync(path.dirname(GAPS_LOG), { recursive: true });
  fs.appendFileSync(GAPS_LOG, JSON.stringify(entry) + '\n', 'utf8');
}

export function recordLearningGap(question, context = {}) {
  const normalized = normalizeQuestion(question);
  const existing = readGapLog();
  const dup = existing.some((g) => g.normalizedQuestion === normalized && g.status === 'open');
  if (dup) return null;

  const entry = {
    id: `gap_${new Date().toISOString().slice(0, 10)}_${crypto.randomBytes(4).toString('hex')}`,
    question,
    normalizedQuestion: normalized,
    source: context.source || 'live_query',
    routedKb: context.routedKb || '',
    evidenceCount: context.evidenceCount || 0,
    confidence: context.confidence ?? 0,
    externalFallbackUsed: context.externalFallbackUsed ?? false,
    externalResultCount: context.externalResultCount ?? 0,
    status: 'open',
    draftId: null,
    targetKb: null,
    createdAt: new Date().toISOString(),
    processedAt: null,
  };
  appendGapLog(entry);
  return entry;
}

export function getGaps(filters = {}) {
  let gaps = readGapLog();
  if (filters.status) gaps = gaps.filter((g) => g.status === filters.status);
  if (filters.kb) gaps = gaps.filter((g) => g.targetKb === filters.kb || g.routedKb === filters.kb);
  if (filters.source) gaps = gaps.filter((g) => g.source === filters.source);
  if (filters.limit) gaps = gaps.slice(0, filters.limit);
  return gaps.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getGap(id) {
  return readGapLog().find((g) => g.id === id) || null;
}

export function updateGapStatus(id, patch = {}) {
  const gaps = readGapLog();
  let found = false;
  const updated = gaps.map((g) => {
    if (g.id !== id) return g;
    found = true;
    return { ...g, ...patch, processedAt: patch.status ? new Date().toISOString() : g.processedAt };
  });
  if (!found) return null;
  fs.writeFileSync(GAPS_LOG, updated.map((g) => JSON.stringify(g)).join('\n') + '\n', 'utf8');
  return updated.find((g) => g.id === id);
}

export function gapStats() {
  const gaps = readGapLog();
  const today = new Date().toISOString().slice(0, 10);
  return {
    total: gaps.length,
    open: gaps.filter((g) => g.status === 'open').length,
    drafted: gaps.filter((g) => g.status === 'drafted').length,
    resolved: gaps.filter((g) => g.status === 'resolved').length,
    ignored: gaps.filter((g) => g.status === 'ignored').length,
    draftedToday: gaps.filter((g) => g.status === 'drafted' && g.processedAt?.startsWith(today)).length,
  };
}

export function canCreateMoreDraftsToday() {
  const stats = gapStats();
  return stats.draftedToday < MAX_DAILY_DRAFTS;
}

export function resolveDraftKb({ question, content = '' }) {
  const haystack = `${question} ${content}`.toLowerCase();
  if (/kodeks pracy|zus|ubezpieczen|skladk|składk|wynagrodzen|urlop|pip|pracownik|umowa o prace|umowa o pracę|zlecen/.test(haystack)) {
    return 'TaxbellPayrollHRReference';
  }
  if (/rachunkow|ksi[eę]gow|jpk|sprawozdanie finansowe|ewidencj|faktur|deklaracj|vat[_ -]?7|jpk[_ -]?v7/.test(haystack)) {
    return 'TaxbellAccountingVATReference';
  }
  if (/prawo|ustaw|ordynacja podatkowa|interpretacj|obja[sś]nien|podatek|podatkow|kodeks|isap|dziennik ustaw/.test(haystack)) {
    return 'TaxbellLegalReference';
  }
  if (/\bbetterfly\b|api2|ksef|faktury zakupowe|faktury sprzedaży/.test(haystack)) {
    return 'ComarchBetterflyReference';
  }
  if (/aktualno|komunikat|news|społeczność|spolecznosc/.test(haystack)) {
    return 'ComarchCommunityNews';
  }
  if (/sprint|wydruk|wydruki|generator raportów|genrap|szablon wydruku|wdr_|wydruk_id|report template/.test(haystack)) {
    return 'ComarchOptimaSprint';
  }
  if (/funkcj[aei] dodatkow|procedur|trigger|makr|sql|cdn\.|visual basic|\bvbscript\b|\.vb\b/.test(haystack)) {
    return 'ComarchOptimaAdditionalFunctions';
  }
  if (/konfiguracj|tabela|kolumna|schemat|baza danych|mssql|constraint|indeks/.test(haystack)) {
    return 'ComarchOptimaSchema';
  }
  if (/partner|technicz|com\b|dictionary|dictionaries/.test(haystack)) {
    return 'ComarchOptimaPartnerTechnical';
  }
  if (/optima|xls|docs|reference|podręcznik|podrecznik|instrukcja/.test(haystack)) {
    return 'ComarchOptimaReference';
  }
  return 'ComarchUniversalKnowledge';
}

export function inferKbName(namespace) {
  const names = {
    ComarchOptimaSchema: 'Comarch Optima ERP MSSQL Schema',
    ComarchOptimaAdditionalFunctions: 'Comarch Optima Additional Functions',
    ComarchOptimaSprint: 'Comarch Optima Sprint and Prints',
    ComarchOptimaReference: 'Comarch Optima Reference',
    ComarchOptimaPartnerTechnical: 'Comarch Optima Partner Technical',
    ComarchOptimaBusinessSemantics: 'Comarch Optima Business Semantics',
    ComarchBetterflyReference: 'Comarch Betterfly Reference',
    ComarchCommunityNews: 'Comarch Community News',
    TaxbellLegalReference: 'Taxbell Legal Reference',
    TaxbellPayrollHRReference: 'Taxbell Payroll HR Reference',
    TaxbellAccountingVATReference: 'Taxbell Accounting VAT Reference',
    ComarchUniversalKnowledge: 'Comarch Universal Knowledge',
  };
  return names[namespace] || namespace;
}

export { CONFIDENCE_LOW_THRESHOLD, MAX_DAILY_DRAFTS };
