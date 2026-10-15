# Source Cleaning Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent KB-generated content from replacing ingested source text and prevent discovery from creating drafts from unavailable source bodies.

**Architecture:** Keep existing cleaning APIs but make them deterministic. Add one pure source-body validator, called by discovery before draft submission. Verify rejected inputs cannot write drafts or spawn automation; do not change the substantive LLM reviewer.

**Tech Stack:** Node.js ESM, assert, isolated temporary fixtures, existing local mock HTTP tests.

## Global Constraints

- Approved spec: `docs/superpowers/specs/2026-10-13-source-cleaning-integrity-design.md`.
- Do not edit production `data/`, `downloads/`, `exports/`, draft statuses, policy, thresholds, domains or shadow mode.
- Do not invoke production LLM, extraction, discovery runs or builders in tests.
- Code edits must be in an isolated checkout, as required by `scripts/AGENTS.md`.
- Preserve existing uncommitted operational and pipeline changes in `/docker/openspg`.
- Do not commit, push or restart services: none was requested for this implementation.
- Start verification with `npm run check`. Read each test before running it to check side effects.
- Source validation is applied to the body before adding discovery wrappers.
- Validation codes are `EMPTY_SOURCE_BODY`, `SOURCE_SHELL_ONLY`, `SOURCE_CONTENT_UNAVAILABLE`.
- No minimum-length rule: short substantive text must remain usable.

## File responsibilities

- Modify `scripts/lib/content_cleaner.mjs`: retain deterministic normalizers and profiles; remove default LLM invocation and injected AI rewriting.
- Create `scripts/lib/source_body_validation.mjs`: pure body validation; no filesystem, network, runtime configuration or LLM calls.
- Modify `scripts/lib/dashboard_discovery.mjs`: validate before `submitKnowledgeDraft()`.
- Modify `scripts/test_content_cleaning_pipeline.mjs`: verify no AI callback can add content and preserve provider/profile regressions.
- Modify `scripts/test_discovery_draft_cleaning.mjs`: isolated integration fixtures proving rejection has no downstream writes/jobs.
- Create `scripts/test_source_body_validation.mjs`: rejection and false-positive tests of the pure validator.

## Task 1: Deterministic source cleaning

**Interfaces:** Preserve `cleanContent(value, options = {}) -> Promise<string>` and `cleanContentWithProfile(value, profile = 'blog', options = {}) -> string`. Options may still be supplied by callers, but `aiCleaner` is never invoked.

- [ ] **Step 1: Establish isolated baseline**

Read `scripts/AGENTS.md` and approved spec. Establish an isolated checkout using the worktree workflow before editing code. Record its path. Run `npm run check` there; this is syntax-only and does not require a runtime stack. Do not install packages or start services merely for these Node core-module tests.

- [ ] **Step 2: Replace the AI-addition test with a failing integrity regression**

In `scripts/test_content_cleaning_pipeline.mjs`, replace the current test expecting `Sekcja merytoryczna.` with:

```js
let aiCalls = 0;
const contaminatedAnswer = 'Relacje między tabelami: DokumentyKSeF → DokAtrybuty\n<reference id="chunk:0_0"></reference>';
const cleaned = await cleanContent('REKLAMA\nTreść bazowa.', {
  aiCleaner: async () => {
    aiCalls += 1;
    return contaminatedAnswer;
  },
});
assert.strictEqual(cleaned, 'Treść bazowa.');
assert.strictEqual(aiCalls, 0);
const refusal = 'W dostarczonych materiałach nie ma surowej treści strony WWW ani artykułu do oczyszczenia.';
assert.strictEqual(await cleanContent('Treść źródłowa.', {
  aiCleaner: async () => { aiCalls += 1; return refusal; },
}), 'Treść źródłowa.');
assert.strictEqual(aiCalls, 0);
assert.strictEqual(cleanContentWithProfile('REKLAMA\nTreść źródłowa.', 'news', {
  aiCleaner: () => { aiCalls += 1; return contaminatedAnswer; },
}), 'Treść źródłowa.');
assert.strictEqual(aiCalls, 0);
```

Keep mock-provider test assertions. Ensure the mock HTTP server closes in a `finally` block so the RED failure does not leave an open listener. Run `node scripts/test_content_cleaning_pipeline.mjs`; expected RED: unrelated FK content differs from the source and/or callback count is nonzero.

- [ ] **Step 3: Remove generative rewriting from the cleaner**

Replace `cleanContent()` with:

```js
export async function cleanContent(value, options = {}) {
  return cleanBoilerplate(value);
}
```

Remove the `profileDef.useAi && options.aiCleaner` branch from `cleanContentWithProfile()`, leaving its existing `return heuristicResult`. Remove only newly unused cleaner-module imports, environment constants and functions supporting default AI calls: `defaultAiCleaner`, response parsing and AI trimming. Check all references before removal. Keep `options` contracts and `skipHtmlStrip` behavior intact; if an unused argument causes a lint issue, keep callable compatibility without retaining unnecessary named arguments.

- [ ] **Step 4: Verify GREEN and absence of default LLM traffic**

Run `node scripts/test_content_cleaning_pipeline.mjs`; expected exit 0, unchanged mock extraction provider behavior, zero injected AI calls. Add a fresh-process test or local-mock case with dummy app/session/auth environment proving `cleanContent()` performs no HTTP request even when legacy AI cleaning configuration is enabled. Use dummy credentials only, no production auth. Run the test again after that addition; expected exit 0.

## Task 2: Pure source-body validation

**Interfaces:** `assessSourceBody(value, title = '') -> { ok: true, code: null } | { ok: false, code: string }`; `assertSourceBodyAvailable(value, title = '')` throws `Error` with `.code` equal to the validation code. Title comparison accepts cosmetic whitespace, Markdown heading markers and recognized Community site suffixes; input body is not rewritten by this validator.

- [ ] **Step 1: Add pure RED tests**

Create `scripts/test_source_body_validation.mjs` using:

```js
import assert from 'node:assert/strict';
import { assessSourceBody, assertSourceBodyAvailable } from './lib/source_body_validation.mjs';
const title = 'Problemy z odbiorem faktur z KSEF - Społeczność ERP';
const cases = [
  ['', 'EMPTY_SOURCE_BODY'],
  [title, 'SOURCE_SHELL_ONLY'],
  [`${title}\n${title}\n![logotype](assets/img/logo.svg)\nloader`, 'SOURCE_SHELL_ONLY'],
  ['W dostarczonych materiałach nie ma surowej treści strony WWW ani artykułu do oczyszczenia. W związku z tym nie można na ich podstawie wykonać oczyszczania.', 'SOURCE_CONTENT_UNAVAILABLE'],
  ['User query: problemy z KSeF Optima 2026\n- The page title suggests a discussion about receiving invoices.\n- No detailed content snippets are provided, so the summary focuses on the likely scope.', 'SOURCE_CONTENT_UNAVAILABLE'],
];
for (const [body, code] of cases) {
  assert.deepEqual(assessSourceBody(body, title), { ok: false, code });
  assert.throws(() => assertSourceBodyAvailable(body, title), error => error.code === code);
}
for (const body of [
  'Wybierz Importuj, następnie zatwierdź.',
  `${title}\nOpis problemu: token wygasł. Rozwiązanie: odnowić token i ponowić odbiór faktur.`,
  'Loader importu zapisuje stan przetwarzania dokumentów.',
  'Komunikat „No detailed content snippets are provided” jest błędem ekstrakcji. W takiej sytuacji otwórz stronę w przeglądarce i pobierz treść wątku.',
]) {
  assert.deepEqual(assessSourceBody(body, title), { ok: true, code: null });
}
console.log('Source body validation tests passed.');
```

Run `node scripts/test_source_body_validation.mjs`; expected RED because the module does not exist.

- [ ] **Step 2: Implement the pure validator with bounded patterns**

Create `scripts/lib/source_body_validation.mjs`. Normalize whitespace for comparison only. For shell detection, evaluate remaining lines after removing:

- empty lines;
- exact title variants with leading Markdown heading markers;
- title variants removing the literal site suffix ` - Społeczność ERP`;
- a line consisting solely of `loader`;
- Markdown image lines for logo/logotype.

Return `SOURCE_SHELL_ONLY` only when no other body remains. Empty input returns `EMPTY_SOURCE_BODY` first.

For unavailable-source detection use anchored introductory statement combinations from the fixtures, rather than arbitrary occurrence of error words. The Polish refusal must begin with `W dostarczonych materiałach nie ma surowej treści`; the English speculative summary begins with optional `User query:` followed by `The page title suggests` and contains `No detailed content snippets are provided`. Support the actual refusal and summary recorded in the root-cause report. A quoted diagnostic example inside a substantive article must pass.

Initial complete validator implementation (keep rejection-case coverage and refine only when a test demonstrates a defect):

```js
import { normalizeWhitespace } from './content_cleaner.mjs';

function comparisonText(value) {
  return normalizeWhitespace(value)
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function assessSourceBody(value, title = '') {
  const text = normalizeWhitespace(value);
  if (!text) return { ok: false, code: 'EMPTY_SOURCE_BODY' };
  const variants = [...new Set([
    comparisonText(title),
    comparisonText(title).replace(/\s+-\s+Społeczność ERP$/i, ''),
  ])].filter(Boolean).sort((a, b) => b.length - a.length);
  const titlePatterns = variants.map(item => new RegExp(`^${escapeRegExp(item)}(?:\\s+|$)`, 'i'));
  let remainder = comparisonText(text.replace(
    /^\s*!\[(?:logo|logotype)[^\]]*\]\([^\n]*\)\s*$/gim, '',
  ));
  let previous;
  do {
    previous = remainder;
    for (const pattern of titlePatterns) remainder = remainder.replace(pattern, '').trim();
    remainder = remainder.replace(/^loader(?:\s+|$)/i, '').trim();
  } while (previous !== remainder);
  if (!remainder) return { ok: false, code: 'SOURCE_SHELL_ONLY' };

  const refusal = /^W dostarczonych materiałach nie ma surowej treści\b/i.test(text);
  const summary = /^(?:User query:[^\n]*\n\s*)?-?\s*The page title suggests\b/i.test(text)
    && /No detailed content snippets are provided/i.test(text);
  if (refusal || summary) return { ok: false, code: 'SOURCE_CONTENT_UNAVAILABLE' };
  return { ok: true, code: null };
}

export function assertSourceBodyAvailable(value, title = '') {
  const result = assessSourceBody(value, title);
  if (!result.ok) {
    const error = new Error(`Source body unavailable: ${result.code}`);
    error.code = result.code;
    throw error;
  }
}
```

Keep the classifier deterministic, with no network or dependencies on app configuration. This is a bounded detector for confirmed cases, not a claim of semantic source verification.

- [ ] **Step 3: Verify GREEN and cosmetic edge cases**

Run `node scripts/test_source_body_validation.mjs`; expected exit 0. Extend the cases with whitespace-only input, title-plus-loader on one line, heading-formatted repeated title, legitimate short article and legitimate source text quoting a refusal. Run again; expected no false-positive rejection of substantive content.

## Task 3: Block submission before any downstream action

**Interfaces:** Consume `assertSourceBodyAvailable()` from Task 2 inside `createDraftFromDiscoveryCandidate()`, immediately after deterministic cleaning and before `submitKnowledgeDraft()`. Preserve existing checks for routing, duplicates and budget.

- [ ] **Step 1: Extend isolated integration fixtures (RED)**

In `scripts/test_discovery_draft_cleaning.mjs`, reuse its isolated `ROOT` setup. Explicitly configure automation as disabled for positive fixtures so no runner is spawned. Stub global `fetch` to throw on attempted external I/O. Import `readDiscoveryCandidate` and `AUTOMATION_JOBS_ROOT` through the existing modules. Before any positive submission, add four invalid candidates using the existing candidate shape, with unique IDs/URLs: empty, shell-only 77295, refusal 77145 and speculative summary 77145. Set `snippet` to the fixture body too so empty input is not replaced by a valid fallback snippet. Use fixture content, not production files.

For each fixture use:

```js
const before = discovery.readDiscoveryCandidate(candidate.id);
const jobsBefore = fs.existsSync(AUTOMATION_JOBS_ROOT)
  ? fs.readdirSync(AUTOMATION_JOBS_ROOT) : [];
await assert.rejects(
  discovery.createDraftFromDiscoveryCandidate(candidate.id, 'test'),
  error => error.code === expectedCode,
);
assert.deepStrictEqual(discovery.readDiscoveryCandidate(candidate.id), before);
assert.strictEqual(fs.existsSync(path.join(root, 'downloads/knowledge_inbox')), false);
const jobsAfter = fs.existsSync(AUTOMATION_JOBS_ROOT)
  ? fs.readdirSync(AUTOMATION_JOBS_ROOT) : [];
assert.deepStrictEqual(jobsAfter, jobsBefore);
```

Run `node scripts/test_discovery_draft_cleaning.mjs`; expected RED because current code submits the invalid body. The disabled test config prevents any worker even on the RED path; inspect the temporary fixture cleanup before running. Put cleanup and restoring `fetch` in `finally`.

- [ ] **Step 2: Integrate validation**

In `scripts/lib/dashboard_discovery.mjs`, add the import and call:

```js
import { assertSourceBodyAvailable } from './source_body_validation.mjs';
```

```js
const cleanedContent = await cleanContent(candidate.content || candidate.snippet || '');
assertSourceBodyAvailable(cleanedContent, candidate.title);
const draft = await submitKnowledgeDraft({
```

Do not change candidate records to a new status or apply reject decisions. Error propagation must preserve the stable code; inspect the relevant dashboard handler's response and ensure the reason is available in its existing error message without unrelated HTTP changes.

- [ ] **Step 3: Verify invalid and valid paths (GREEN)**

Retain the existing positive advertisement/newsletter fixture; require exactly one generated draft with the substantive source text. Add a short positive instruction and a substantive troubleshooting document quoting a refusal; both must create correctly cleaned drafts. Count expected positive files explicitly. Assertions for rejected fixtures occur before positives so file absence is a meaningful proof. All automation remains disabled in the fixture.

Run `node scripts/test_discovery_draft_cleaning.mjs`; expected exit 0, no worker/network calls, invalid statuses unchanged, exactly the expected valid drafts.

- [ ] **Step 4: Final verification and review**

Read `scripts/test_dashboard_discovery.mjs` to confirm it uses isolated fixtures and mock services rather than production. Run, in order:

```bash
npm run check
node scripts/test_source_body_validation.mjs
node scripts/test_content_cleaning_pipeline.mjs
node scripts/test_discovery_draft_cleaning.mjs
node scripts/test_dashboard_discovery.mjs
git diff --check
```

Expected: all exit 0. If existing discovery fixtures fail because they are title-only, distinguish a real compatibility regression from invalid source fixtures. Update only demonstrably invalid test bodies to substantive fixture text; do not weaken the validator to make tests pass. Review the final diff against every requirement in the spec.

- [ ] **Step 5: Record implementation and deployment status separately**

Report isolated checkout path, changed files, RED/GREEN evidence, validation results and limitations. No production restart/deployment is part of these code steps. Identify relevant entrypoints for a later controlled deployment; do not claim the running dashboard uses the repair merely because tests pass.

## Plan self-review

- Task 1 removes both default and injected generative replacement while preserving cleaning/profile/provider contracts.
- Task 2 defines deterministic rejection codes and positive short/quoted-error cases.
- Task 3 checks the actual discovery submission boundary and downstream side effects.
- Existing historical drafts, reviewer behavior, policy and shadow mode remain untouched.
- Isolated code changes and live deployment are explicitly separated; no runtime-state edits or commits are required.
