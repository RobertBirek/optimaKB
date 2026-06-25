# Testpack Question Auto-Generation

Date: `2026-06-12`

## Summary

After each testpack run, automatically generate ~5 new test questions targeting routing gaps (PARTIAL/MISS), rotate out stale questions from 100%-PASS categories, and seed initial questions for new KB categories (Taxbell). New script `scripts/generate_testpack_questions.mjs`.

## Architecture

One new script, called independently after `run_erp_knowledge_testpack.mjs`:

```
node scripts/run_erp_knowledge_testpack.mjs --size 200
node scripts/generate_testpack_questions.mjs
```

It reads the latest testpack JSON report, generates new questions via LLM, applies rotation, and writes updated `ALL_QUESTIONS` back into `run_erp_knowledge_testpack.mjs`.

## Data Flow

```
run_erp_knowledge_testpack.mjs
  └─ writes ERP_Knowledge_Assistant_200Q_TestPack.json  (input)

generate_testpack_questions.mjs                            (new script)
  ├─ reads TestPack.json → extracts PARTIAL/MISS
  ├─ reads TARGET_KBS → finds categories with zero questions
  ├─ LLM generates new questions (gap-based + seed for new KBs)
  ├─ appends to ALL_QUESTIONS in run_erp_knowledge_testpack.mjs
  └─ rotates out stale questions from 100%-PASS categories
```

## Components

### 1. Gap Detection

Reads the latest testpack JSON report. Extracts:

- **PARTIAL/MISS entries**: each has `question`, `expectedPrimaryKb`, `actualPrimaryKb`, `category`, `evidence`
- **100%-PASS categories**: categories where `PASS == total` and `PARTIAL == 0` and `MISS == 0`
- **Zero-coverage KBs**: namespaces from `TARGET_KBS` that have no questions in `ALL_QUESTIONS` (currently TaxbellLegalReference, TaxbellPayrollHRReference, TaxbellAccountingVATReference)

### 2. Question Generation (LLM)

For each PARTIAL/MISS entry, construct a prompt:

> To pytanie dostało PARTIAL/MISS w testpacku routingu ERP knowledge assistant. Oryginalne pytanie: "{question}". Oczekiwany routing: {expectedPrimaryKb}, rzeczywisty routing: {actualPrimaryKb}. Kategoria: {category}. Wygeneruj 1-2 nowe pytania w języku polskim, które testują ten sam obszar wiedzy ale innym sformułowaniem. Zwróć JSON: [{"question": "...", "expectedPrimaryKb": "...", "category": "..."}]. Oto istniejące pytania z tej kategorii (unikaj podobnych): {existingQuestions}

For zero-coverage KBs, construct a seed prompt:

> To jest nowa kategoria KB: {kbName} ({namespace}). Wygeneruj 3 pytania w języku polskim które sprawdzą czy asystent poprawnie rutuje zapytania do tej KB. Pytania powinny dotyczyć typowych tematów tej KB. Zwróć JSON: [{"question": "...", "expectedPrimaryKb": "{namespace}", "category": "{categorySlug}"}]

**LLM**: same backend as `answerQuestion()` — `scripts/erp_knowledge_answer.mjs` or direct call to configured model.

### 3. Deduplication

Before accepting a generated question:
- Check if any existing question in `ALL_QUESTIONS` has the same `expectedPrimaryKb` AND Levenshtein similarity > 0.7 (normalized)
- Skip duplicates, decrement remaining budget

### 4. Rotation

After adding new questions:
- For each category with 100% PASS in current run AND that still has > 5 questions:
  - Remove the oldest question (lowest numeric ID suffix)
  - **Never** remove a question that was PARTIAL or MISS in any historical run (tracked via `docs/reference/testpack_question_history.json`)

### 5. File Mutation

`generate_testpack_questions.mjs` modifies `scripts/run_erp_knowledge_testpack.mjs`:

1. Write backup: `scripts/run_erp_knowledge_testpack.mjs.bak`
2. Parse `ALL_QUESTIONS` array boundaries
3. Remove rotated-out lines
4. Append new question objects after the last existing entry
5. Assign new IDs: find `max(existing_ids_numeric)` + 1, format as `Q{NNN}`
6. Write file

**Output**: JSON summary to stdout with `{added, rotated, dryRun, backupPath}`.

## Edge Cases

| Case | Behavior |
|---|---|
| 0 PARTIAL, 0 MISS, no new categories | Log "no gaps, skipping" |
| Pool at 250 | Only rotate (if applicable), no additions |
| LLM returns invalid JSON | Retry x2, then skip that generation slot |
| LLM returns question without required fields | Validate schema, retry, skip on failure |
| Generated question duplicate | Skip, decrement budget |
| Rotation candidate was PARTIAL/MISS historically | Skip, try next oldest |
| No backup file write possible | Abort, log error |
| ALL_QUESTIONS array not parseable | Abort with clear error message |

## CLI Interface

```
node scripts/generate_testpack_questions.mjs [options]

Options:
  --dry-run          Preview questions and rotations without writing
  --max-add N        Max new questions to add (default: 5)
  --max-pool N       Max total pool size (default: 250)
  --report FILE      Override report path (default: auto-detect latest)
```

## History Tracking

New file: `docs/reference/testpack_question_history.json`

```json
{
  "entries": {
    "Q035": { "firstPartial": "2026-06-12", "category": "additional_functions" },
    "Q103": { "firstPartial": "2026-06-12", "category": "schema" }
  }
}
```

Updated after each testpack run with any new PARTIAL/MISS question IDs.

## Taxbell Seed (First Run)

On first execution, the script detects 3 KBs with zero questions:
- `TaxbellLegalReference` → category: `taxbell_legal`, 3 seed questions
- `TaxbellPayrollHRReference` → category: `taxbell_payroll_hr`, 3 seed questions
- `TaxbellAccountingVATReference` → category: `taxbell_accounting_vat`, 3 seed questions

Seed questions are generated from KB metadata (KB name + namespace), not from KB content directly (to keep generation fast). The runner's `ALL_QUESTIONS` is extended with these categories.

## Scope Boundaries

- **In scope**: gap-based generation, rotation, Taxbell seeding, deduplication, dry-run
- **Out of scope**: content-based generation (reading KB files), re-evaluating historical results, auto-running testpack after generation
- **Deferred**: trigger from dashboard pipeline, per-category budget caps, cross-KB question generation
