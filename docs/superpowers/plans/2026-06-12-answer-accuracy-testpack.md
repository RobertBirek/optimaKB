# Answer Accuracy Testpack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create `scripts/run_erp_knowledge_accuracy_testpack.mjs` that tests answer QUALITY, not just routing.

**Architecture:** Single script matching the existing testpack pattern, importing `answerQuestion` from `erp_knowledge_answer.mjs` with HTTP bridge fallback, plus heuristic quality checks.

**Tech Stack:** Node.js ESM, native `fetch` for HTTP bridge, `fs` for JSON/MD output.

---

### Task 1: Write the script

**Files:**
- Create: `scripts/run_erp_knowledge_accuracy_testpack.mjs`

- Pick 30 questions (3-4 per category) with clean PASS history
- Define quality scoring heuristics
- Try HTTP bridge first, fall back to direct `answerQuestion` import
- Output JSON report + Markdown summary

### Task 2: Verify syntax

Run: `node --check scripts/run_erp_knowledge_accuracy_testpack.mjs`
Expected: no errors

### Task 3: Smoke test

Run: `node scripts/run_erp_knowledge_accuracy_testpack.mjs --sample`
Expected: 5 questions tested, JSON+MD written, summary output
