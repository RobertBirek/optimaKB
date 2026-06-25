#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { readOpenSpgCookie } from './lib/openspg_auth.mjs';
import { OPENSPG_API_BASE } from './lib/config.mjs';
import { TARGET_KBS } from './lib/promoted_knowledge.mjs';
import { KB_DETAILS } from './erp_knowledge_assistant.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';
const TESTPACK_SCRIPT = path.join(ROOT, 'scripts/run_erp_knowledge_testpack.mjs');
const HISTORY_PATH = path.join(ROOT, 'docs/reference/testpack_question_history.json');
const API_BASE = OPENSPG_API_BASE;
const ENDPOINT = process.env.OPENSPG_LLM_ENDPOINT || '/v1/chat/completions';
const APP_ID = process.env.OPENSPG_LLM_APP_ID || '';
const SESSION_ID = process.env.OPENSPG_LLM_SESSION_ID || '';
const MODEL = process.env.OPENSPG_LLM_MODEL || '';
const TIMEOUT_MS = 90000;
const MAX_ADD = 5;
const MAX_POOL = 250;
const MAX_QUESTION_LENGTH = 500;
const CONTENT_READ_BYTES = 5 * 1024 * 1024;

function parseQuestionsFromScript() {
  const source = fs.readFileSync(TESTPACK_SCRIPT, 'utf8');
  const match = source.match(/const\s+ALL_QUESTIONS\s*=\s*\[([\s\S]*?)\];/);
  if (!match) throw new Error('Cannot find ALL_QUESTIONS array in testpack script');
  const body = `[${match[1]}]`;
  return Function(`"use strict"; return (${body});`)();
}

function writeQuestionsToScript(questions) {
  const source = fs.readFileSync(TESTPACK_SCRIPT, 'utf8');
  const match = source.match(/const\s+ALL_QUESTIONS\s*=\s*\[([\s\S]*?)\];/);
  if (!match) throw new Error('Cannot find ALL_QUESTIONS array');
  const fullMatch = match[0];
  const replacement = formatQuestionsArray(questions);
  const newSource = source.replace(fullMatch, replacement);
  const tmpPath = TESTPACK_SCRIPT.replace(/\.mjs$/, '.tmp.mjs');
  fs.writeFileSync(tmpPath, newSource, 'utf8');
  try {
    execFileSync(process.execPath, ['--check', tmpPath], { stdio: 'pipe' });
    fs.renameSync(tmpPath, TESTPACK_SCRIPT);
  } catch (error) {
    fs.rmSync(tmpPath, { force: true });
    throw error;
  }
}

function formatQuestionsArray(questions) {
  const lines = ['const ALL_QUESTIONS = ['];
  let currentCategory = '';
  for (const q of questions) {
    if (q.category !== currentCategory) {
      currentCategory = q.category;
      const comment = categoryToComment(currentCategory);
      if (comment) lines.push(`  ${comment}`);
    }
    lines.push(`  ${JSON.stringify({
      id: q.id,
      category: q.category,
      expectedPrimaryKb: cleanKbName(q.expectedPrimaryKb),
      question: q.question,
    })},`);
  }
  lines.push('];');
  return lines.join('\n');
}

function categoryToComment(category) {
  const map = {
    schema: '// Schema',
    additional_functions: '// Additional Functions',
    sprint: '// Sprint',
    reference: '// Reference',
    partner: '// Partner',
    betterfly: '// Betterfly',
    taxbell_legal: '// Taxbell Legal',
    taxbell_payroll_hr: '// Taxbell Payroll HR',
    taxbell_accounting_vat: '// Taxbell Accounting VAT',
  };
  return map[category] || null;
}

function parseSseAnswer(body) {
  let answer = '';
  for (const line of String(body || '').split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') continue;
    try {
      const event = JSON.parse(data);
      if (event.success === false) throw new Error(event.errorMsg || 'LLM stream failed');
      if (typeof event.answer === 'string') answer = event.answer;
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
  }
  if (!answer) throw new Error('LLM did not return an answer');
  return answer;
}

function parseJson(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] || raw;
  const arrayStart = fenced.indexOf('[');
  const objectStart = fenced.indexOf('{');
  const start = arrayStart !== -1 && (objectStart === -1 || arrayStart < objectStart)
    ? arrayStart : objectStart;
  const end = start === arrayStart ? fenced.lastIndexOf(']') : fenced.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('LLM returned invalid JSON');
  return JSON.parse(fenced.slice(start, end + 1));
}

async function callLlm(prompt) {
  const cookie = readOpenSpgCookie({ required: true });
  if (!APP_ID || !SESSION_ID) {
    throw new Error('OPENSPG_LLM_APP_ID and OPENSPG_LLM_SESSION_ID are required');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}${ENDPOINT}`, {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(MODEL ? { model: MODEL } : {}),
        app_id: /^\d+$/.test(APP_ID) ? Number(APP_ID) : APP_ID,
        session_id: /^\d+$/.test(SESSION_ID) ? Number(SESSION_ID) : SESSION_ID,
        prompt: [{ type: 'text', content: prompt }],
        thinking_enabled: false,
        search_enabled: false,
      }),
      signal: controller.signal,
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`LLM HTTP ${response.status}: ${body.slice(0, 300)}`);
    }
    return parseJson(parseSseAnswer(body));
  } finally {
    clearTimeout(timer);
  }
}

function existingQuestionsSummary(questions, category, limit) {
  const relevant = questions
    .filter((q) => q.category === category)
    .slice(0, limit);
  return relevant.map((q) => `- Q: "${q.question}" (expected: ${cleanKbName(q.expectedPrimaryKb)})`).join('\n');
}

function buildGapPrompt(failingQuestion, existingQuestions) {
  const existingSummary = existingQuestionsSummary(
    existingQuestions, failingQuestion.category, 5,
  );
  return [
    'Jesteś asystentem QA dla bazy wiedzy ERP. Generujesz pytania testowe.',
    '',
    'To pytanie dostało PARTIAL lub MISS w testpacku routingu:',
    `Pytanie: "${failingQuestion.question}"`,
    `Oczekiwany routing: KB ${failingQuestion.expectedPrimaryKb}`,
    `Rzeczywisty routing: KB ${failingQuestion.actualPrimaryKb || 'brak'}`,
    `Kategoria: ${failingQuestion.category}`,
    '',
    'Wygeneruj 1 nowe pytanie w języku polskim, które testuje ten sam obszar wiedzy',
    'ale innym sformułowaniem, żeby sprawdzić czy routing jest odporny na warianty.',
    `Pytanie musi kierować do KB "${failingQuestion.expectedPrimaryKb}".`,
    '',
    'Istniejące pytania z tej kategorii (unikaj podobnych):',
    existingSummary || '(brak)',
    '',
    'Zwróć TYLKO JSON w formacie:',
    '[{"question":"...","expectedPrimaryKb":"...","category":"..."}]',
    'Żadnych dodatkowych komentarzy.',
  ].join('\n');
}

function namespaceKeywords(namespace) {
  const map = {
    TaxbellLegalReference: 'prawo, ustawa, kodeks, podatek, CIT, PIT, interpretacja podatkowa',
    TaxbellPayrollHRReference: 'ZUS, kadry, płace, HR, pracownik, urlop, PIP, wynagrodzenie, składki',
    TaxbellAccountingVATReference: 'księgowość, rachunkowość, VAT, JPK, faktura, deklaracja, KSeF, rozliczenie',
    ComarchCommunityNews: 'społeczność, aktualności, baza wiedzy, wydarzenie, ogłoszenie',
  };
  return map[namespace] || '';
}

function buildSeedPrompt(targetKb, namespace, count) {
  const n = count || 3;
  const details = KB_DETAILS[namespace];
  const summary = details?.summary || '';
  const keywords = namespaceKeywords(namespace);
  return [
    'Jesteś asystentem QA. Generujesz seed questions dla nowej kategorii wiedzy.',
    '',
    `KB: ${targetKb.kbName}`,
    `Namespace: ${namespace}`,
    summary ? `Opis KB: ${summary}` : '',
    keywords ? `Słowa kluczowe tej KB: ${keywords}` : '',
    '',
    `Wygeneruj ${n} pytania w języku polskim, które sprawdzą czy asystent ERP`,
    'poprawnie rutuje zapytania do tej KB.',
    'WAŻNE: Pytania muszą dotyczyć WYŁĄCZNIE tematów które pokrywa ta KB.',
    'NIE zadawaj pytań o tabele SQL, obiekty bazy, schemat lub strukturę danych.',
    namespace === 'ComarchOptimaBusinessSemantics' ? [
      'NIE używaj terminów z innych KB: faktura, faktury, Wydanie Zewnętrzne, VAT, JPK, ZUS, BHP.',
      'Pytaj o znaczenie kodów, etykiet, klasyfikację domenową, reguły biznesowe, słowniki wartości.',
    ].join('\n    ') : '',
    namespace.startsWith('Taxbell') ? [
      'NIE używaj terminów z innych KB: Comarch, Optima, Sprint, FD, tabela, kolumna.',
    ].join('\n    ') : '',
    'Pytaj o przepisy, regulacje, dokumenty, procesy, obowiązki — zgodnie z opisem KB.',
    '',
    `Każde pytanie MUSI zawierać przynajmniej 2 słowa kluczowe z listy: ${keywords}`,
    'żeby asystent miał szansę poprawnie zrutować zapytanie.',
    '',
    'Zwróć TYLKO JSON w formacie:',
    `[{"question":"...","expectedPrimaryKb":"${namespace}","category":"${namespaceToCategory(namespace)}"}]`,
    'Żadnych dodatkowych komentarzy.',
  ].filter(Boolean).join('\n');
}

function namespaceToCategory(namespace) {
  const map = {
    TaxbellLegalReference: 'taxbell_legal',
    TaxbellPayrollHRReference: 'taxbell_payroll_hr',
    TaxbellAccountingVATReference: 'taxbell_accounting_vat',
    ComarchCommunityNews: 'community_news',
    ComarchOptimaSchema: 'schema',
    ComarchOptimaAdditionalFunctions: 'additional_functions',
    ComarchOptimaSprint: 'sprint',
    ComarchOptimaReference: 'reference',
    ComarchOptimaPartnerTechnical: 'partner',
    ComarchBetterflyReference: 'betterfly',
    ComarchOptimaBusinessSemantics: 'business_semantics',
  };
  return map[namespace] || 'unknown';
}

function normalizeQuestionText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function buildGeneratedCandidate(raw, namespace, options = {}) {
  const question = normalizeQuestionText(raw?.question);
  if (!question || question.length > MAX_QUESTION_LENGTH) return null;

  const expected = options.forceExpected
    ? namespace
    : cleanKbName(raw?.expectedPrimaryKb || namespace);
  if (!TARGET_KBS[expected]) return null;
  if (namespace && options.requireExpected && expected !== namespace) return null;

  const category = options.forceCategory
    ? namespaceToCategory(expected)
    : String(raw?.category || namespaceToCategory(expected)).trim();
  if (!category || category === 'unknown') return null;

  return { question, expectedPrimaryKb: expected, category };
}

async function generateGapQuestions(failingItems, existingQuestions) {
  const generated = [];
  for (const item of failingItems) {
    if (generated.length >= MAX_ADD) break;
    const prompt = buildGapPrompt(item, existingQuestions);
    try {
      const result = await callLlm(prompt);
      const questions = Array.isArray(result) ? result : [result];
      for (const q of questions) {
        const candidate = buildGeneratedCandidate(q, item.expectedPrimaryKb, { requireExpected: true });
        if (candidate) generated.push(candidate);
      }
    } catch (error) {
      process.stderr.write(`LLM error for ${item.expectedPrimaryKb}: ${error.message}\n`);
    }
  }
  return generated.slice(0, MAX_ADD);
}

function levenshteinDistance(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = a[i - 1] === b[j - 1]
        ? matrix[i - 1][j - 1]
        : 1 + Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1]);
    }
  }
  return matrix[a.length][b.length];
}

function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

function isDuplicate(newQuestion, existingQuestions) {
  const normalizedNew = newQuestion.question.toLowerCase();
  const sameKb = existingQuestions.filter(
    (q) => cleanKbName(q.expectedPrimaryKb) === newQuestion.expectedPrimaryKb,
  );
  for (const existing of sameKb) {
    if (similarity(normalizedNew, existing.question.toLowerCase()) > 0.7) {
      return true;
    }
  }
  return false;
}

function assignNextIds(questions, existingQuestions) {
  const maxExisting = existingQuestions.reduce((max, q) => {
    const num = parseInt(q.id.replace('Q', ''), 10);
    return num > max ? num : max;
  }, 0);
  return questions.map((q, i) => ({
    ...q,
    id: `Q${String(maxExisting + i + 1).padStart(3, '0')}`,
  }));
}

function loadHistory() {
  if (!fs.existsSync(HISTORY_PATH)) return { entries: {} };
  return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
}

function saveHistory(history) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2) + '\n', 'utf8');
}

function recordFailingQuestions(failingItems, history) {
  const today = new Date().toISOString().slice(0, 10);
  for (const item of failingItems) {
    if (!history.entries[item.id]) {
      history.entries[item.id] = {
        firstPartial: today,
        category: item.category,
      };
    }
  }
  return history;
}

function rotateQuestions(existingQuestions, summary, history, slotsToFree) {
  if (!slotsToFree) return existingQuestions;
  const categories100Percent = Object.entries(summary.byCategory)
    .filter(([, bucket]) => bucket.PASS === bucket.total && bucket.PARTIAL === 0 && bucket.MISS === 0)
    .map(([category]) => category);
  const rotated = [...existingQuestions];
  let freed = 0;
  while (freed < slotsToFree && categories100Percent.length) {
    const category = categories100Percent.shift();
    const candidates = rotated
      .map((q, index) => ({ ...q, index }))
      .filter((q) => q.category === category && !history.entries[q.id])
      .sort((a, b) => parseInt(a.id.replace('Q', ''), 10) - parseInt(b.id.replace('Q', ''), 10));
    if (!candidates.length) continue;
    rotated.splice(candidates[0].index, 1);
    freed += 1;
    categories100Percent.push(category);
  }
  return rotated;
}

function valueFor(args, flag, fallback) {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) return fallback;
  const value = args[index + 1];
  if (value && value.startsWith('--')) return fallback;
  return value;
}

function parseArgs(args) {
  const expandArg = valueFor(args, '--expand', '');
  const expand = {};
  if (expandArg) {
    for (const pair of expandArg.split(',')) {
      const [ns, n] = pair.split(':');
      if (ns) expand[ns] = Math.min(Number(n) || 5, 20);
    }
  }
  const hasContent = args.includes('--content');
  const contentArg = valueFor(args, '--content', '');
  const contentNamespaces = [];
  if (hasContent) {
    if (contentArg) {
      for (const ns of contentArg.split(',').map(s => s.trim()).filter(Boolean)) {
        if (TARGET_KBS[ns]) contentNamespaces.push(ns);
        else process.stderr.write(`Unknown namespace in --content: ${ns}\n`);
      }
    } else {
      contentNamespaces.push(...Object.keys(TARGET_KBS));
    }
  }
  return {
    dryRun: args.includes('--dry-run'),
    maxAdd: Number(valueFor(args, '--max-add', '')) || MAX_ADD,
    maxPool: Number(valueFor(args, '--max-pool', '')) || MAX_POOL,
    reportPath: valueFor(args, '--report', ''),
    expand,
    contentNamespaces,
  };
}

function findLatestReport() {
  const dir = path.join(ROOT, 'docs/reference');
  const files = fs.readdirSync(dir)
    .filter((f) => f.startsWith('ERP_Knowledge_Assistant_') && f.endsWith('Q_TestPack.json'));
  if (!files.length) throw new Error('No testpack report found');
  const withMtime = files.map((f) => ({
    name: f,
    mtime: fs.statSync(path.join(dir, f)).mtimeMs,
  }));
  withMtime.sort((a, b) => b.mtime - a.mtime);
  return path.join(dir, withMtime[0].name);
}

function readReport(reportPath) {
  const resolved = reportPath || findLatestReport();
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

function findFailing(report) {
  const results = report.results || [];
  return results.filter((r) => r.status === 'PARTIAL' || r.status === 'MISS');
}

function findZeroCoverage(existingQuestions) {
  const coveredNamespaces = new Set(
    existingQuestions.map((q) => cleanKbName(q.expectedPrimaryKb)),
  );
  return Object.keys(TARGET_KBS).filter((ns) => !coveredNamespaces.has(ns));
}

function cleanKbName(raw) {
  if (!raw) return '';
  return raw.replace(/^KB\s+/i, '').trim();
}

function parseCsvRows(text) {
  const rows = [];
  const lines = text.split('\n');
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (inQuotes) {
        if (c === '"') {
          if (j + 1 < line.length && line[j + 1] === '"') {
            currentField += '"';
            j++;
          } else {
            inQuotes = false;
          }
        } else {
          currentField += c;
        }
      } else {
        if (c === '"') {
          inQuotes = true;
        } else if (c === ',') {
          currentRow.push(currentField);
          currentField = '';
        } else {
          currentField += c;
        }
      }
    }
    if (inQuotes) {
      currentField += '\n';
    } else {
      currentRow.push(currentField);
      currentField = '';
      if (i > 0 || currentRow.some(f => f.trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
    }
  }
  return rows;
}

function readContentSamples(namespace, maxSamples = 20) {
  const details = KB_DETAILS[namespace];
  if (!details?.artifacts) return [];
  const csvFiles = details.artifacts.filter(f => f.endsWith('.csv'));
  if (!csvFiles.length) return [];
  const preferred = ['reference_document.csv', 'source_topic.csv', 'chunk.csv'];
  const candidates = preferred
    .flatMap((p) => csvFiles.filter((f) => f.includes(p)))
    .concat(csvFiles)
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .map((file) => ({ file, path: path.join(ROOT, file) }))
    .filter((entry) => fs.existsSync(entry.path))
    .map((entry) => ({ ...entry, size: fs.statSync(entry.path).size }));
  if (!candidates.length) return [];
  const selected = candidates.find((entry) => entry.size <= CONTENT_READ_BYTES) || candidates[0];
  const sel = selected.file;
  const filePath = path.join(ROOT, sel);
  let text;
  if (selected.size <= CONTENT_READ_BYTES) {
    text = fs.readFileSync(filePath, 'utf8');
  } else {
    const fd = fs.openSync(filePath, 'r');
    try {
      const headerBuffer = Buffer.alloc(Math.min(65536, selected.size));
      fs.readSync(fd, headerBuffer, 0, headerBuffer.length, 0);
      const header = headerBuffer.toString('utf8').split(/\r?\n/)[0] || '';
      const tailSize = Math.min(CONTENT_READ_BYTES, selected.size);
      const tailBuffer = Buffer.alloc(tailSize);
      fs.readSync(fd, tailBuffer, 0, tailSize, selected.size - tailSize);
      const tail = tailBuffer.toString('utf8').replace(/^[\s\S]*?\r?\n/, '');
      text = `${header}\n${tail}`;
    } finally {
      fs.closeSync(fd);
    }
  }
  const rows = parseCsvRows(text);
  if (rows.length <= 1) return [];
  const header = rows[0].map(h => h.trim());
  const sample = rows.slice(1).slice(-maxSamples);
  return sample.map(row => {
    const obj = {};
    header.forEach((col, i) => { obj[col] = (row[i] || '').trim(); });
    return obj;
  });
}

function buildContentPrompt(namespace, samples) {
  const target = TARGET_KBS[namespace];
  const details = KB_DETAILS[namespace];
  const category = namespaceToCategory(namespace);
  const sampleText = samples.map((s, i) => {
    const title = s.name || s.title || `Dokument ${i + 1}`;
    const snippet = (s.content || s.summary || s.description || s.exampleSql || '').slice(0, 2000);
    return `--- Dokument ${i + 1} ---\nTytuł: ${title}\nTreść: ${snippet}`;
  }).join('\n\n');
  return [
    'Jesteś asystentem QA. Generujesz pytania testowe na podstawie RZECZYWISTEJ treści dokumentów w bazie wiedzy.',
    '',
    `KB: ${target?.kbName || namespace}`,
    `Namespace: ${namespace}`,
    details?.summary ? `Opis KB: ${details.summary}` : '',
    '',
    'Oto próbki rzeczywistej treści z dokumentów w tej KB:',
    '',
    sampleText,
    '',
    'Wygeneruj maksymalnie 5 pytań w języku polskim, które testują WIEDZĘ o konkretnych dokumentach,',
    'artykułach, przepisach lub tematach zawartych w powyższej treści.',
    '',
    'PRZYKŁADY DOBRYCH PYTAŃ:',
    '- "Co mówi artykuł 5 ustawy o VAT w sprawie..."',
    '- "Zgodnie z interpretacją podatkową z dnia..., jakie są wymogi dotyczące..."',
    '- "Jaki jest termin na złożenie deklaracji ZUS zgodnie z dokumentem..."',
    '',
    'WAŻNE: Pytania muszą dotyczyć WYŁĄCZNIE dokumentów i treści pokazanych powyżej.',
    'Pytania muszą być w języku polskim.',
    'Pytania powinny wymagać znajomości konkretnych faktów z dokumentów.',
    '',
    `Zwróć TYLKO JSON w formacie:`,
    `[{"question":"...","expectedPrimaryKb":"${namespace}","category":"${category}"}]`,
    'Żadnych dodatkowych komentarzy.',
  ].filter(Boolean).join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const existingQuestions = parseQuestionsFromScript();
  const history = loadHistory();
  const isContentMode = args.contentNamespaces.length > 0;

  let report = null;
  let failingItems = [];
  let zeroCoverage = [];
  if (!isContentMode) {
    report = readReport(args.reportPath);
    failingItems = findFailing(report);
    zeroCoverage = findZeroCoverage(existingQuestions);
  }

  if (!failingItems.length && !zeroCoverage.length && !Object.keys(args.expand).length && !isContentMode) {
    process.stdout.write(JSON.stringify({ ok: true, message: 'no gaps, skipping' }) + '\n');
    return;
  }

  if (!isContentMode && existingQuestions.length >= args.maxPool) {
    process.stdout.write(JSON.stringify({ ok: true, message: 'pool at max size', poolSize: existingQuestions.length }) + '\n');
    return;
  }

  let generated = [];

  if (Object.keys(args.expand).length) {
    const nsOrder = Object.keys(args.expand).sort();
    for (const namespace of nsOrder) {
      if (existingQuestions.length + generated.length >= args.maxPool) break;
      const target = TARGET_KBS[namespace];
      if (!target) {
        process.stderr.write(`Unknown namespace: ${namespace}\n`);
        continue;
      }
      const existingCount = existingQuestions.filter((q) => cleanKbName(q.expectedPrimaryKb) === namespace).length;
      const want = args.expand[namespace];
      const need = want - existingCount;
      if (need <= 0) {
        process.stdout.write(`[expand] ${namespace} already has ${existingCount} >= ${want}, skipping\n`);
        continue;
      }
      const prompt = buildSeedPrompt(target, namespace, need);
      try {
        const result = await callLlm(prompt);
        const questions = Array.isArray(result) ? result : [result];
        for (const q of questions) {
          const candidate = buildGeneratedCandidate(q, namespace, { forceExpected: true, forceCategory: true });
          if (!candidate) continue;
          if (!isDuplicate(candidate, [...existingQuestions, ...generated])) {
            generated.push(candidate);
            if (existingQuestions.length + generated.length >= args.maxPool) break;
          }
        }
      } catch (error) {
        process.stderr.write(`Expand LLM error for ${namespace}: ${error.message}\n`);
      }
    }
  }

  if (isContentMode) {
    for (const namespace of args.contentNamespaces) {
      if (generated.length >= args.maxAdd) break;
      const samples = readContentSamples(namespace, 5);
      if (!samples.length) {
        process.stderr.write(`[content] no content samples for ${namespace}, skipping\n`);
        continue;
      }
      const prompt = buildContentPrompt(namespace, samples);
      try {
        const result = await callLlm(prompt);
        const questions = Array.isArray(result) ? result : [result];
        for (const q of questions) {
          const candidate = buildGeneratedCandidate(q, namespace, { forceExpected: true, forceCategory: true });
          if (!candidate) continue;
          if (!isDuplicate(candidate, [...existingQuestions, ...generated])) {
            generated.push(candidate);
            if (generated.length >= args.maxAdd) break;
          }
        }
      } catch (error) {
        process.stderr.write(`Content LLM error for ${namespace}: ${error.message}\n`);
      }
    }
  }

  if (failingItems.length) {
    const gapQuestions = await generateGapQuestions(failingItems, existingQuestions);
    const newGap = gapQuestions.filter((q) => !isDuplicate(q, [...existingQuestions, ...generated]));
    generated = [...generated, ...newGap];
  }

  if (!isContentMode) {
    const seedReserved = zeroCoverage.length ? Math.min(3, args.maxAdd) : 0;
    const expandBudget = Object.keys(args.expand).length ? args.maxPool - existingQuestions.length : args.maxAdd;
    const gapBudget = Object.keys(args.expand).length ? args.maxAdd - seedReserved : args.maxAdd - seedReserved;
    const effectiveMaxAdd = Math.max(expandBudget, gapBudget);
    if (generated.length > effectiveMaxAdd) {
      generated = generated.slice(0, effectiveMaxAdd);
    }
  }

  const remainingBudget = isContentMode ? generated.length : args.maxAdd - generated.length;
  if (!isContentMode && zeroCoverage.length && remainingBudget > 0) {
    const taxbellFirst = [...zeroCoverage].sort((a, b) => {
      const aTax = a.startsWith('Taxbell') ? 0 : 1;
      const bTax = b.startsWith('Taxbell') ? 0 : 1;
      return aTax - bTax || a.localeCompare(b);
    });
    const seedPerNs = Math.max(1, Math.floor(remainingBudget / Math.min(zeroCoverage.length, remainingBudget)));
    for (const namespace of taxbellFirst) {
      if (generated.length >= args.maxAdd) break;
      const target = TARGET_KBS[namespace];
      if (!target) continue;
      const prompt = buildSeedPrompt(target, namespace, seedPerNs);
      try {
        const result = await callLlm(prompt);
        const questions = Array.isArray(result) ? result : [result];
        for (const q of questions) {
          const candidate = buildGeneratedCandidate(q, namespace, { forceExpected: true, forceCategory: true });
          if (!candidate) continue;
          if (!isDuplicate(candidate, [...existingQuestions, ...generated])) {
            generated.push(candidate);
            if (generated.length >= args.maxAdd) break;
          }
        }
      } catch (error) {
        process.stderr.write(`Seed LLM error for ${namespace}: ${error.message}\n`);
      }
    }
  }

  generated = assignNextIds(generated, existingQuestions);
  const overflow = Math.max(0, existingQuestions.length + generated.length - args.maxPool);

  if (args.dryRun) {
    const rotationCandidates = report
      ? rotateQuestions(existingQuestions, report.summary, history, overflow)
      : existingQuestions;
    const rotatedOut = report
      ? existingQuestions.filter((q) => !rotationCandidates.some((r) => r.id === q.id))
      : [];
    process.stdout.write(JSON.stringify({
      ok: true,
      dryRun: true,
      added: generated.map((q) => ({ id: q.id, question: q.question, category: q.category })),
      rotated: rotatedOut.map((q) => ({ id: q.id, question: q.question })),
      poolSize: existingQuestions.length + generated.length - rotatedOut.length,
    }, null, 2) + '\n');
    return;
  }

  if (!generated.length) {
    const updatedHistory = recordFailingQuestions(failingItems, history);
    saveHistory(updatedHistory);
    process.stdout.write(JSON.stringify({
      ok: true,
      message: 'no valid questions generated, testpack unchanged',
      added: 0,
      rotated: 0,
      poolSize: existingQuestions.length,
    }) + '\n');
    return;
  }

  const finalQuestions = report
    ? rotateQuestions(existingQuestions, report.summary, history, overflow)
    : existingQuestions;
  const allQuestions = [...finalQuestions, ...generated];
  if (allQuestions.length > args.maxPool) {
    throw new Error(`Refusing to write ${allQuestions.length} questions; max pool is ${args.maxPool}`);
  }

  const backupPath = `${TESTPACK_SCRIPT}.bak`;
  fs.copyFileSync(TESTPACK_SCRIPT, backupPath);

  writeQuestionsToScript(allQuestions);

  const updatedHistory = recordFailingQuestions(failingItems, history);
  saveHistory(updatedHistory);

  process.stdout.write(JSON.stringify({
    ok: true,
    added: generated.length,
    addedIds: generated.map((q) => q.id),
    rotated: report ? existingQuestions.length - finalQuestions.length : 0,
    poolSize: allQuestions.length,
    backupPath,
  }) + '\n');
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
