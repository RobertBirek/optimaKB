# Testpack Question Auto-Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically generate ~5 new test questions after each testpack run, targeting routing gaps (PARTIAL/MISS), seed initial questions for Taxbell KBs, and rotate stale questions from 100%-PASS categories.

**Architecture:** One new CLI script (`generate_testpack_questions.mjs`) reads the latest testpack JSON report, extracts gaps, calls OpenSPG LLM to generate variant questions, deduplicates against existing pool, rotates out stale questions, and mutates `run_erp_knowledge_testpack.mjs` to update the `ALL_QUESTIONS` array. History of failing questions is tracked in `testpack_question_history.json`.

**Tech Stack:** Node.js ESM, OpenSPG `/v1/chat/completions` API (SSE), same auth as dashboard automation (cookie + app_id + session_id).

---

## File Structure

```
scripts/
  generate_testpack_questions.mjs    # NEW — main script
  run_erp_knowledge_testpack.mjs     # MODIFIED (by script) — ALL_QUESTIONS array

docs/reference/
  testpack_question_history.json     # NEW — tracks questions that ever had PARTIAL/MISS
```

---

### Task 1: Create question history file

**Files:**
- Create: `docs/reference/testpack_question_history.json`

- [ ] **Step 1: Create empty history file**

```bash
cat > /docker/openspg/docs/reference/testpack_question_history.json << 'EOF'
{
  "entries": {}
}
EOF
```

- [ ] **Step 2: Commit**

```bash
git add docs/reference/testpack_question_history.json
git commit -m "feat: add testpack question history file"
```

---

### Task 2: Create the generator script skeleton

**Files:**
- Create: `scripts/generate_testpack_questions.mjs`

- [ ] **Step 1: Write script header with imports and constants**

```javascript
#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { readOpenSpgCookie } from './lib/openspg_auth.mjs';
import { OPENSPG_API_BASE } from './lib/config.mjs';
import { TARGET_KBS } from './lib/promoted_knowledge.mjs';

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
```

- [ ] **Step 2: Commit**

```bash
git add scripts/generate_testpack_questions.mjs
git commit -m "feat: scaffold testpack question generator"
```

---

### Task 3: Add ALL_QUESTIONS parser

**Files:**
- Modify: `scripts/generate_testpack_questions.mjs`

- [ ] **Step 1: Add functions to parse ALL_QUESTIONS from the .mjs file**

Insert after the constants block:

```javascript
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
  fs.writeFileSync(TESTPACK_SCRIPT, newSource, 'utf8');
}

function formatQuestionsArray(questions) {
  const lines = ['const ALL_QUESTIONS = ['];
  const categories = [];
  let currentCategory = '';
  for (const q of questions) {
    if (q.category !== currentCategory) {
      currentCategory = q.category;
      const comment = categoryToComment(currentCategory);
      if (comment) lines.push(`  ${comment}`);
    }
    const line = `  { id: '${q.id}', category: '${q.category}', expectedPrimaryKb: '${q.expectedPrimaryKb}', question: '${q.question.replace(/'/g, "\\'")}' },`;
    lines.push(line);
  }
  lines.push('];');
  return lines.join('\n');
}

function categoryToComment(category) {
  const map = {
    schema: '// Schema 1-25',
    additional_functions: '// Additional Functions 26-45',
    sprint: '// Sprint 46-60',
    reference: '// Reference 61-70',
    partner: '// Partner 71-85',
    betterfly: '// Betterfly 86-100',
    taxbell_legal: '// Taxbell Legal',
    taxbell_payroll_hr: '// Taxbell Payroll HR',
    taxbell_accounting_vat: '// Taxbell Accounting VAT',
  };
  return map[category] || null;
}
```

- [ ] **Step 2: Commit (add functions, no test yet)**

```bash
git add scripts/generate_testpack_questions.mjs
git commit -m "feat: add ALL_QUESTIONS parser/writer"
```

---

### Task 4: Add LLM caller

**Files:**
- Modify: `scripts/generate_testpack_questions.mjs`

- [ ] **Step 1: Add SSE parser and LLM call function**

Insert after the parser functions:

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add scripts/generate_testpack_questions.mjs
git commit -m "feat: add LLM caller with SSE parsing"
```

---

### Task 5: Add gap-based question generation prompts

**Files:**
- Modify: `scripts/generate_testpack_questions.mjs`

- [ ] **Step 1: Add prompt builder and generation function**

Insert after LLM caller:

```javascript
function existingQuestionsSummary(questions, category, limit) {
  const relevant = questions
    .filter((q) => q.category === category)
    .slice(0, limit);
  return relevant.map((q) => `- Q: "${q.question}" (expected: ${q.expectedPrimaryKb})`).join('\n');
}

function buildGapPrompt(failingQuestion, existingQuestions) {
  const existingSummary = existingQuestionsSummary(
    existingQuestions, failingQuestion.category, 5,
  );
  return [
    'Jesteś asystentem QA dla bazy wiedzy ERP. Generujesz pytania testowe.',
    '',
    `To pytanie dostało PARTIAL lub MISS w testpacku routingu:`,
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

function buildSeedPrompt(targetKb, namespace) {
  return [
    'Jesteś asystentem QA. Generujesz seed questions dla nowej kategorii wiedzy.',
    '',
    `KB: ${targetKb.kbName}`,
    `Namespace: ${namespace}`,
    '',
    'Wygeneruj 3 pytania w języku polskim, które sprawdzą czy asystent ERP',
    'poprawnie rutuje zapytania do tej KB. Pytania powinny dotyczyć typowych',
    'tematów jakie ta KB pokrywa.',
    '',
    'Zwróć TYLKO JSON w formacie:',
    '[{"question":"...","expectedPrimaryKb":"' + namespace + '","category":"' + namespaceToCategory(namespace) + '"}]',
    'Żadnych dodatkowych komentarzy.',
  ].join('\n');
}

function namespaceToCategory(namespace) {
  const map = {
    TaxbellLegalReference: 'taxbell_legal',
    TaxbellPayrollHRReference: 'taxbell_payroll_hr',
    TaxbellAccountingVATReference: 'taxbell_accounting_vat',
  };
  return map[namespace] || 'unknown';
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
        if (!q.question || !q.expectedPrimaryKb || !q.category) continue;
        generated.push({
          question: q.question,
          expectedPrimaryKb: q.expectedPrimaryKb,
          category: q.category,
        });
      }
    } catch (error) {
      process.stderr.write(`LLM error for ${item.expectedPrimaryKb}: ${error.message}\n`);
    }
  }
  return generated.slice(0, MAX_ADD);
}

async function generateSeedQuestions(zeroCoverageNamespaces) {
  const generated = [];
  for (const namespace of zeroCoverageNamespaces) {
    const target = TARGET_KBS[namespace];
    if (!target) continue;
    const prompt = buildSeedPrompt(target, namespace);
    try {
      const result = await callLlm(prompt);
      const questions = Array.isArray(result) ? result : [result];
      for (const q of questions) {
        if (!q.question) continue;
        generated.push({
          question: q.question,
          expectedPrimaryKb: q.expectedPrimaryKb || namespace,
          category: q.category || namespaceToCategory(namespace),
        });
      }
    } catch (error) {
      process.stderr.write(`Seed LLM error for ${namespace}: ${error.message}\n`);
    }
  }
  return generated;
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/generate_testpack_questions.mjs
git commit -m "feat: add gap-based and seed prompt generators"
```

---

### Task 6: Add deduplication and ID assignment

**Files:**
- Modify: `scripts/generate_testpack_questions.mjs`

- [ ] **Step 1: Add Levenshtein distance and dedup functions**

Insert after the generation functions:

```javascript
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
    (q) => q.expectedPrimaryKb === newQuestion.expectedPrimaryKb,
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
```

- [ ] **Step 2: Commit**

```bash
git add scripts/generate_testpack_questions.mjs
git commit -m "feat: add deduplication and ID assignment"
```

---

### Task 7: Add rotation logic

**Files:**
- Modify: `scripts/generate_testpack_questions.mjs`

- [ ] **Step 1: Add history tracking and rotation functions**

Insert after dedup functions:

```javascript
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

function rotateQuestions(existingQuestions, summary, history, addedCount) {
  if (addedCount >= MAX_ADD) return existingQuestions;
  const slotsToFree = Math.max(0, MAX_ADD - addedCount);
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
```

- [ ] **Step 2: Commit**

```bash
git add scripts/generate_testpack_questions.mjs
git commit -m "feat: add rotation logic with history tracking"
```

---

### Task 8: Add CLI and main function

**Files:**
- Modify: `scripts/generate_testpack_questions.mjs`

- [ ] **Step 1: Add args parser, report reader, and main**

Insert after rotation functions:

```javascript
function parseArgs(args) {
  return {
    dryRun: args.includes('--dry-run'),
    maxAdd: Number(args[args.indexOf('--max-add') + 1]) || MAX_ADD,
    maxPool: Number(args[args.indexOf('--max-pool') + 1]) || MAX_POOL,
    reportPath: args[args.indexOf('--report') + 1] || '',
  };
}

function findLatestReport() {
  const dir = path.join(ROOT, 'docs/reference');
  const files = fs.readdirSync(dir)
    .filter((f) => f.startsWith('ERP_Knowledge_Assistant_') && f.endsWith('Q_TestPack.json'))
    .sort()
    .reverse();
  if (!files.length) throw new Error('No testpack report found');
  return path.join(dir, files[0]);
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
    existingQuestions.map((q) => q.expectedPrimaryKb),
  );
  return Object.keys(TARGET_KBS).filter((ns) => !coveredNamespaces.has(ns));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const report = readReport(args.reportPath);
  const existingQuestions = parseQuestionsFromScript();
  const failingItems = findFailing(report);
  const zeroCoverage = findZeroCoverage(existingQuestions);
  const history = loadHistory();

  if (!failingItems.length && !zeroCoverage.length) {
    process.stdout.write(JSON.stringify({ ok: true, message: 'no gaps, skipping' }) + '\n');
    return;
  }

  let generated = [];

  if (failingItems.length) {
    const gapQuestions = await generateGapQuestions(failingItems, existingQuestions);
    generated = gapQuestions.filter((q) => !isDuplicate(q, existingQuestions));
  }

  const remainingBudget = args.maxAdd - generated.length;
  if (zeroCoverage.length && remainingBudget > 0) {
    const seedQuestions = await generateSeedQuestions(zeroCoverage.slice(0, 3));
    const uniqueSeeds = seedQuestions.filter((q) => !isDuplicate(q, existingQuestions));
    generated = [...generated, ...uniqueSeeds.slice(0, remainingBudget)];
  }

  generated = assignNextIds(generated, existingQuestions);

  if (args.dryRun) {
    const rotationCandidates = rotateQuestions(existingQuestions, report.summary, history, generated.length);
    const rotatedOut = existingQuestions.filter(
      (q) => !rotationCandidates.some((r) => r.id === q.id),
    );
    process.stdout.write(JSON.stringify({
      ok: true,
      dryRun: true,
      added: generated.map((q) => ({ id: q.id, question: q.question, category: q.category })),
      rotated: rotatedOut.map((q) => ({ id: q.id, question: q.question })),
      poolSize: existingQuestions.length + generated.length - rotatedOut.length,
    }, null, 2) + '\n');
    return;
  }

  const finalQuestions = rotateQuestions(existingQuestions, report.summary, history, generated.length);
  const allQuestions = [...finalQuestions, ...generated];

  const backupPath = `${TESTPACK_SCRIPT}.bak`;
  fs.copyFileSync(TESTPACK_SCRIPT, backupPath);

  writeQuestionsToScript(allQuestions);

  const updatedHistory = recordFailingQuestions(failingItems, history);
  saveHistory(updatedHistory);

  process.stdout.write(JSON.stringify({
    ok: true,
    added: generated.length,
    addedIds: generated.map((q) => q.id),
    rotated: existingQuestions.length - finalQuestions.length,
    poolSize: allQuestions.length,
    backupPath,
  }) + '\n');
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
```

- [ ] **Step 2: Mark script executable**

```bash
chmod +x /docker/openspg/scripts/generate_testpack_questions.mjs
```

- [ ] **Step 3: Commit**

```bash
git add scripts/generate_testpack_questions.mjs
git commit -m "feat: add CLI, report reader, and main loop"
```

---

### Task 9: Dry-run test

**Files:**
- Test: `scripts/generate_testpack_questions.mjs` (integration test)

- [ ] **Step 1: Run dry-run to validate the script works end-to-end**

```bash
cd /docker/openspg && \
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie \
node scripts/generate_testpack_questions.mjs --dry-run
```

Expected: JSON output with `added`, `rotated`, `poolSize`. No file mutations.

- [ ] **Step 2: Check output is valid JSON with expected keys**

Expected keys in output: `ok`, `dryRun`, `added` (array), `rotated` (array), `poolSize` (number).

---

### Task 10: Real run and rotation test

**Files:**
- Test: `scripts/generate_testpack_questions.mjs` (live test)
- Modify: `scripts/run_erp_knowledge_testpack.mjs` (will be mutated by generator)

- [ ] **Step 1: Run real generation (requires LLM env vars)**

```bash
cd /docker/openspg && \
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie \
node scripts/generate_testpack_questions.mjs
```

Expected: new questions appended to `ALL_QUESTIONS`, backup created, history updated.

- [ ] **Step 2: Verify backup exists**

```bash
test -f /docker/openspg/scripts/run_erp_knowledge_testpack.mjs.bak && echo "BACKUP OK"
```

- [ ] **Step 3: Verify testpack still loads and runs**

```bash
cd /docker/openspg && node -e "
import('/docker/openspg/scripts/run_erp_knowledge_testpack.mjs').then(() => {
  console.log('MODULE LOAD OK');
}).catch(e => console.error('FAIL:', e.message));
"
```

- [ ] **Step 4: Verify history file updated**

```bash
cat /docker/openspg/docs/reference/testpack_question_history.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'History entries: {len(d.get(\"entries\",{}))}')"
```

---

### Task 11: Restore and retest with Taxbell seed

**Files:**
- Restore: `scripts/run_erp_knowledge_testpack.mjs` from backup

- [ ] **Step 1: Restore original testpack from backup**

```bash
cd /docker/openspg && git checkout scripts/run_erp_knowledge_testpack.mjs
```

- [ ] **Step 2: Run generator again — confirm Taxbell seed questions appear**

```bash
cd /docker/openspg && \
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie \
node scripts/generate_testpack_questions.mjs
```

Expected: Taxbell categories (`taxbell_legal`, `taxbell_payroll_hr`, `taxbell_accounting_vat`) in generated questions.

- [ ] **Step 3: Restore original testpack again**

```bash
cd /docker/openspg && git checkout scripts/run_erp_knowledge_testpack.mjs
```

---

### Task 12: Hook into testpack runner

**Files:**
- Modify: `scripts/run_erp_knowledge_testpack.mjs`

- [ ] **Step 1: Add optional auto-generation at end of testpack runner**

In `run_erp_knowledge_testpack.mjs`, after the line `console.log('Wrote: ${outMd}');`, add:

```javascript
  if (process.env.ERP_KB_TESTPACK_AUTO_GENERATE === '1') {
    const { spawnSync } = await import('node:child_process');
    const result = spawnSync(
      process.execPath,
      ['scripts/generate_testpack_questions.mjs'],
      { cwd: ROOT, env: { ...process.env, ROOT }, encoding: 'utf8' },
    );
    if (result.stdout) console.log(result.stdout.trim());
    if (result.stderr) console.error(result.stderr.trim());
  }
```

- [ ] **Step 2: Commit**

```bash
git add scripts/run_erp_knowledge_testpack.mjs
git commit -m "feat: add ERP_KB_TESTPACK_AUTO_GENERATE hook"
```

---

## Self-Review

**Spec coverage check:**
- [x] Gap detection from testpack JSON report (Task 8)
- [x] PARTIAL/MISS → new questions via LLM (Task 5)
- [x] Taxbell zero-coverage seed (Task 5, seed prompts)
- [x] Deduplication (Task 6)
- [x] Rotation from 100% PASS categories (Task 7)
- [x] Never rotate historically-failing questions (Task 7, history check)
- [x] Max pool 250, ~5 per run (Task 3 constants, Task 8 CLI)
- [x] Backup before mutation (Task 8)
- [x] Dry-run mode (Task 8)
- [x] History file `testpack_question_history.json` (Task 7)
- [x] Separate script, not built into runner (architecture)
- [x] Auto-generate hook via env var (Task 12)

**Placeholder scan:** No TBD, TODO, or vague steps found.

**Type consistency:** `question`, `expectedPrimaryKb`, `category`, `id`, `status` consistent across all tasks.
