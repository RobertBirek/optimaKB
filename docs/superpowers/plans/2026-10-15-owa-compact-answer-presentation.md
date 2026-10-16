# OWA Compact Answer Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Delegate only after the user selects that execution mode.

**Goal:** Shorten complete OWA Markdown answers by at least 35% in aggregate while preserving the unchanged 12/12 source-fidelity score, all selected facts/qualifications and public structured evidence.

**Architecture:** Add a pure compact formatter behind the existing `owaCoverage` branch, leaving retrieval, source selection and sufficiency unchanged. Add public `extracts` and `omissions` to OWA domain responses, and independently audit their parity with actually rendered content. Reuse the explicit frozen offline harness, with a presentation validator that checks both old and new layouts rather than interpreting an unrecognized layout as zero extract characters.

**Tech Stack:** Node.js ESM, Node 18-compatible builtins, existing MCP handler and CSV retrieval, built-in assert/node:test. No new dependency or model.

## Global Constraints

- Approved spec: `docs/superpowers/specs/2026-10-15-owa-compact-answer-presentation-design.md`.
- Base commit: `38e314b720004e6454af0f3532bc0d50ac0928d6`.
- Niezmienione 12 pytań, narzędzia, kryteria, `as_of=2026-10-15`, `limit=5`: wymagane **12 PASS / 0 PARTIAL / 0 MISS** po ręcznej ocenie pełnych odpowiedzi.
- Suma znaków dla 12 odpowiedzi ma spaść o **co najmniej 35%**, a żadna pojedyncza odpowiedź nie ma być dłuższa niż jej baseline.
- Wszystkie aktualnie wybrane `extract.text` pozostają w Markdown w całości.
- Zachować limity **2 źródła / 3 jednostki na źródło / 4000 znaków treści extractów**.
- Nie zmieniać statusów UNKNOWN ani progów, aby wynik wyglądał lepiej. Nie dodawać modelu, endpointu, publicznego trybu „compact” ani nowej konfiguracji.
- Przed i po renderowaniu obiekt odpowiedzi musi być identyczny. Zmienia się tekst `answer`; `extracts` i `omissions` są addytywne.
- Kod zmieniać w izolowanym checkoutcie, zgodnie z `scripts/AGENTS.md`.
- Nie zmieniać proxy ani pozostałych usług, korpusu, raw/promoted, registry, CSV, grafu, polityk i timerów. Zwykła telemetria wywołań jest dopuszczalna.
- Kontrolowane wdrożenie obejmuje centralny `erp-kb-mcp.service` i dedykowany `erp-semantic-mcp.service`, sekwencyjnie, po odczytaniu faktycznej bieżącej konfiguracji i przejściu testów.
- Nie wykonywać commitu ani push bez nowego polecenia użytkownika dotyczącego tej zmiany.
- Node 18: no JSON import `with` attributes; use `createRequire` or explicit fixture parsing. Do not consume production credentials in offline child environments.

---

## Files and responsibilities

| File | Responsibility |
|---|---|
| New `scripts/lib/owa_answer_presentation.mjs` | Pure compact Markdown, stable citations, exact-note deduplication and omission aggregation. No I/O. |
| Existing `scripts/erp_knowledge_answer.mjs:649-754` | Delegate OWA rendering only; preserve non-OWA branch verbatim. |
| Existing `scripts/lib/erp_knowledge_mcp_core.mjs:583-610` | Add public extract/omission arrays to existing OWA structured result. |
| Existing `scripts/lib/owa_offline_harness.mjs:28-35,101-115` | Bind the new formatter in candidate module closure; audit actual rendered compact units and legacy units. |
| New `scripts/test_owa_answer_presentation.mjs` | Pure formatting invariants, citations, limitations, mutation and length controls. |
| New `scripts/test_owa_presentation_contract.mjs` | Real-handler serialization, old-field parity and non-OWA compatibility. |
| New `scripts/compare_owa_presentation_runs.mjs` | Explicit-directory comparison of twelve immutable captured responses and quantitative gates. |
| Existing `scripts/test_owa_offline_guards.mjs` | Prevent unknown compact layout, hidden qualifiers or over-budget Markdown from passing the audit. |

Do not add presentation rules to the OWA context, evidence selector or coverage engine. Do not use this task to improve retrieval or rewrite source facts. If a genuine source-selection defect appears, preserve its reproduction and escalate rather than changing acceptance inputs.

## Task 1: Pure compact formatter with preserved visible evidence

**Files:** Create `scripts/lib/owa_answer_presentation.mjs`, `scripts/test_owa_answer_presentation.mjs`.

**Interfaces:**

```js
// Consumes an already-built public answer. No mutation, I/O or lookup.
export function renderCompactOwaAnswer(answer) {} // => string
export function summarizeOmissions(omissions) {}
// => { total:number, byReason:Array<{reason:string,count:number}>, uncoveredFacets:string[] }
```

The answer has existing `extracts`, `sources`, `omissions`, `answerNotes`, `owaCoverage`, `evidenceAssessment`, `retrieval`, `evidence` and metadata fields. `extracts` contain text, sourceKey, artifact, line/endLine and, for OWA, recordId/locator/facets. Sources may have multiple records. Never read `.owa`, its private row, or object properties hidden from public serialization.

- [ ] **Step 1 — create isolated workspace and baseline capture before edits.** Use using-git-worktrees; verify no existing isolated workspace before creating one. Read root/scripts AGENTS and module map. Run `npm run check` and map validation. Preserve main's six generated report modifications. Use current **unchanged** preparation and runner to freeze the explicit corpus allowlist and capture baseline12 before changing the module inventory. Save baseline runner/helper bytes, manifest and all twelve complete Markdown/JSON files; record the baseline question hash `4124f75b330142b6894637380e90589c78dec24362af721eedc45f57276221d2`. This is a read-only snapshot, not export/build.
- [ ] **Step 2 — write RED formatting tests using synthetic answers.** Include an intact conditional paragraph/table and several identical/other-scope notes, two distinct versions with the same title, sources with real/unknown dates, empty extracts with explicit missing/ambiguous notices, one sole technical evidence snippet, and 49 omissions.

```js
const text = '## Warunki\nTylko w buforze; nie potwierdzono wykonania.\n\n| Pole | Typ |\n| --- | --- |\n| Sample_Key | int |';
const answer = {
  question:'OWA: mapowanie karty', primaryKb:'OWAOntology', supportKbs:[],
  owaCoverage:{status:'partial',missingFacets:['fields']},
  answerNotes:['UNKNOWN: brak pełnego enum Sample_Tag.'],
  evidenceAssessment:{status:'insufficient_evidence',missingTerms:[],reasons:[]},
  retrieval:{backend:'local_artifacts',graphUsed:false}, evidence:[],
  extracts:[{sourceKey:'source-a',artifact:'fixture/chunk.csv',line:2,endLine:8,
    recordId:'ROW_A',text}],
  sources:[{key:'source-a',kind:'local_artifact',title:'Karta próbna',
    namespace:'OWAOntology',recordIds:['ROW_A'],records:[{
      artifact:'fixture/chunk.csv',locator:'L2-L8',recordId:'ROW_A',contentHash:'sha256:'+'a'.repeat(64)}]}],
  omissions:Array.from({length:49},()=>({sourceKey:'omitted',reason:'source_limit'})),
};
const before = JSON.stringify(answer);
const markdown = renderCompactOwaAnswer(answer);
assert.equal(JSON.stringify(answer), before);
assert(markdown.includes(text));
assert(markdown.includes('UNKNOWN: brak pełnego enum Sample_Tag.'));
assert(!markdown.includes('Pytanie:'));
assert(!markdown.includes('sha256:'));
assert(!markdown.includes('Polecane artefakty:'));
assert.deepEqual(summarizeOmissions(answer.omissions).byReason,
  [{reason:'source_limit',count:49}]);
assert.equal(summarizeOmissions(answer.omissions).total,49);
```

- [ ] **Step 3 — run RED.** `node scripts/test_owa_answer_presentation.mjs`; capture actual failure before adding the formatter. A missing export is allowed for the initial pure interface test, followed by semantic failing cases before each new behavior.
- [ ] **Step 4 — implement pure aggregation.** Count omitted units, not inferred documents/sources. Maintain stable first-seen reason order and a deduplicated union of uncovered facets; an explicit empty `uncoveredFacets` overrides historical `missingFacets`.

```js
export function summarizeOmissions(omissions = []) {
  const counts = new Map();
  const uncovered = new Set();
  for (const item of omissions) {
    counts.set(item.reason, (counts.get(item.reason) || 0) + 1);
    for (const facet of item.uncoveredFacets ?? item.missingFacets ?? []) uncovered.add(facet);
  }
  return {total:omissions.length,
    byReason:[...counts].map(([reason,count])=>({reason,count})),
    uncoveredFacets:[...uncovered]};
}
```

- [ ] **Step 5 — implement compact composition without summarizing source text.** Emit source-supported/missing/ambiguous `answerNotes` before or next to relevant facts; deduplicate only exact same text and scope. Use these stable blocks for offline audit:

```text
Odpowiedź:

[S1] fixture/chunk.csv, linie 2–8:
<complete unchanged extract.text>

Źródła:
- [S1] Karta próbna — OWAOntology; fixture/chunk.csv L2-L8; rekord ROW_A

Pominięcia: 49 jednostek (limit źródeł: 49). Szczegóły w danych strukturalnych.
```

The angle-bracket content in this layout means the exact supplied `extract.text`, not new prose generated from it. Use actual arrays/values; do not template any benchmark fact. Emit at most the already-selected two source entries. Derive displayed locators from emitted extracts, matching sourceKey/recordId/line; do not cite unused candidate records as displayed facts. Keep real source dates/URLs, nonempty freshness/diagnostic notes and scope-limited unknowns; combine absent technical dates without inventing values.

Preserve technical/no-source evidence that might be the only support for any requested fact. With no reliable public metadata proving it redundant, keep it under `Dodatkowe dowody:` with its original artifact/locator. Only suppress an auxiliary snippet when exact same-owner/version text is already retained, or existing metadata proves it supplies no claimed/requested fact. Do not add a new lexical relevance threshold. Existing coverage must not be justified by text hidden from Markdown.

- [ ] **Step 6 — verify GREEN and purity.** Run the new tests. Add a frozen/deep-freeze answer input, unknown omission reasons rendered literally, no-source clarification, missing required field preserved, negated/conflicting status, multiple source records and different-version controls. No sentence/row truncation or cross-version deduplication; count every original extract unchanged.

## Task 2: Integrate renderer and additive MCP data; make the audit layout-aware

**Files:** Modify `scripts/erp_knowledge_answer.mjs`, `scripts/lib/erp_knowledge_mcp_core.mjs`, `scripts/lib/owa_offline_harness.mjs`; create `scripts/test_owa_presentation_contract.mjs`; extend `scripts/test_owa_offline_guards.mjs`.

**Interfaces:** Consume Task1 `renderCompactOwaAnswer(answer)`. Keep `renderAnswerMarkdown(answer): string` and `handleJsonRpcRequest(request,context)` signatures. Add OWA-only `structuredContent.extracts`/`omissions` from existing public answer properties. Do not expose raw/private objects or alter existing fields/status.

- [ ] **Step 1 — write RED handler/contract tests.** In a synthetic guarded fixture root, dispatch all four SemanticKB domain tools and compare their original structured evidence/source/coverage/notes/status/validity/warnings/correlation fields before/after rendering. The renderer must not mutate either root answer or nested data. Existing release/non-OWA output remains byte-for-byte identical. Block network, process launches, runtime writes and out-of-fixture reads; preserve the existing precise fixture-only no-op for `recordLearningGap`.

```js
const structured = result.result.structuredContent;
assert.deepEqual(structured.extracts, JSON.parse(JSON.stringify(answer.extracts)));
assert.deepEqual(structured.omissions, JSON.parse(JSON.stringify(answer.omissions)));
assert.equal(structured.answer, result.result.content.filter(p=>p.type==='text').map(p=>p.text).join('\n'));
assert(!JSON.stringify(structured).includes('PRIVATE_CANDIDATE_ROW_SENTINEL'));
```

- [ ] **Step 2 — run RED.** `node scripts/test_owa_presentation_contract.mjs`. Current code lacks the new domain arrays and still renders old OWA layout; record these assertion failures.
- [ ] **Step 3 — integrate the two bounded production branches.** Import the helper in the existing answer module and delegate only when `answer.owaCoverage` exists; preserve all old non-OWA renderer code. In the existing OWA-only MCP addition, expose just the existing public arrays alongside coverage/notes.

```js
// At start of renderAnswerMarkdown:
if (answer.owaCoverage) return renderCompactOwaAnswer(answer);

// Existing OWA conditional addition in domain structured response:
...(result.structured?.owaCoverage ? {
  owaCoverage:result.structured.owaCoverage,
  answerNotes:result.structured.answerNotes || [],
  extracts:result.structured.extracts || [],
  omissions:result.structured.omissions || [],
} : {})
```

- [ ] **Step 4 — update fixed module closure and independent presentation audit.** Add only `owa_answer_presentation` to `MODULE_FILES`; keep the static artifact allowlist and baseline SHA unchanged. Retain old legacy-body parsing for legacy replies; explicitly recognize compact `Odpowiedź`/`Źródła` markers. Reject unrecognized layouts with nonempty extracts rather than return a zero-size pass. For OWA, compare parsed Markdown units/source labels to the JSON-rounded public extract list, and recompute actual emitted-character/per-source caps independently. Check both directions: no structured unit missing from text, no unbound extra substantive unit hidden from the budget parser.

```js
const expected = body.extracts || [];
const actual = parsedVisibleUnits;
assert.equal(actual.length, expected.length);
for (let i=0;i<actual.length;i++) {
  assert.equal(actual[i].text, expected[i].text);
  assert.equal(actual[i].sourceKey, expected[i].sourceKey);
}
assert(actual.reduce((n,u)=>n+u.text.length,0)<=4000);
```

Citation labels are renderer labels mapped back through the ordered `sources` keys, never substituted source identities. Audit complete text with absolute end-of-input matching, not `$` under `/m`, which previously undercounted multiline content. A literal heading that resembles a renderer delimiter inside an extract must not silently terminate it; reject ambiguous framing or validate boundaries against the exact structured sequence without losing the independent whole-body check.

- [ ] **Step 5 — add audit RED/GREEN controls.** Cover intact multiline tables, 4000/4001 characters, a lost final qualifier, extra unbound text, absent source key, source-version label collision, fake compact headings, no-extract genuine clarification, 3/4 units per source and more than 2 sources. No weakening of original guard tests.
- [ ] **Step 6 — run focused and compatibility tests.** New formatter/contract tests, `test_owa_offline_guards`, `test_owa_local_sources`, `test_owa_answer_coverage`, `test_answer_source_citations`, `test_answer_extracts`, `test_release_tool_intent`, `test_erp_knowledge_retrieval`. Update only assertions about intentionally changed OWA headings/layout, paired with stronger intact-content/provenance assertions. No source/gold/coverage-status edits to make tests pass.

## Task 3: Same-corpus twelve-question comparison and quantitative acceptance

**Files:** Create `scripts/compare_owa_presentation_runs.mjs`, `scripts/test_owa_presentation_comparison.mjs`; report `docs/reference/OWA_Compact_Presentation_Offline_2026-10-15.{json,md}` when executed.

**Interfaces:**

```text
node scripts/compare_owa_presentation_runs.mjs --before ABSOLUTE_RUN_DIR --after ABSOLUTE_RUN_DIR --output-parent /tmp/opencode
```

Explicit roots only, no production fallback. Read exactly the two manifests, baseline binding, and named Q01–Q12 files. Results include per-question character/line counts, before/after hashes, reduction, structured parity diffs and `PENDING_MANUAL_REVIEW`; automatic diagnostics are not correctness grades.

- [ ] **Step 1 — write RED comparison tests.** Use 12 synthetic captures with known lengths, unchanged gold/request identity and additive fields; reject a missing call, swapped query, changed correlation-independent request arguments, changed source hash, changed existing semantic field, lost extract qualifier, and a single longer after-response.

```js
const counts = pairs.map(({before,after})=>({before:before.length,after:after.length}));
const beforeTotal = counts.reduce((sum,p)=>sum+p.before,0);
const afterTotal = counts.reduce((sum,p)=>sum+p.after,0);
assert(beforeTotal>0);
const reduction = 1-afterTotal/beforeTotal;
assert(reduction>=0.35);
assert(counts.every(p=>p.after<=p.before));
```

Use JavaScript UTF-16 `String.length` consistently with the current extract budget, label it explicitly, and report UTF-8 bytes separately if included. Line counts include all visible Markdown; do not exclude notices, citations or support text to inflate reduction.

- [ ] **Step 2 — run RED then implement comparison.** Compare actual requests ignoring only ID/correlation prefix where declared; query/tool/as_of/limit unchanged. Existing semantic response fields equal apart from declared observation timestamps and the new answer text. Only `extracts`/`omissions` are new. Align original pre-render public arrays through guarded offline capture if needed; do not claim they were present in historical domain JSON. Verify every original extract text still exists intact. No output scoring by keyword/equality alone.
- [ ] **Step 3 — capture candidate against baseline static bytes.** Use preparation with the candidate module closure and the exact static artifact bytes frozen in Task1; manifests must prove same corpus/question bytes. Execute the actual MCP-handler runner with explicit bundle/output-parent. Preserve all twelve full Markdown/JSON outputs, updated guard results and source/request manifests.
- [ ] **Step 4 — manually judge every complete answer.** Apply unchanged 12Q criteria, exclude echoed query from evidence, verify UNKNOWN, directed paths, joins, IDs, multi-owner coverage and ambiguity. Require 12/0/0 and quantitative gates together. If a body changes, it needs actual review; do not inherit prior manual PASS through partial hashes or presence of unchanged JSON.
- [ ] **Step 5 — full gate and review.** `npm run check`, explicit syntax of new files, map validator, the new presentation suites and existing OWA/context/routing/selection/coverage/local/final-fixes/guards plus body/citations/extracts/release/retrieval/blended/profile suites after side-effect inspection. Retain exact commands/exit/log hashes, old/new code fingerprints and immutable comparison evidence. Review the whole bounded diff before main transfer. Do not commit/push automatically.

## Task 4: Controlled deployment and actual connected compact-answer acceptance

**Files:** Integrate reviewed runtime/helper/test changes; reports `docs/reference/OWA_Compact_Presentation_Deployment_2026-10-15.{json,md}` and `OWA_Compact_Presentation_Live12_2026-10-15.{json,md}`.

**Evidence root:** `backups/manual-repairs/owa-compact-presentation-20261015/` with private modes and required mcpbot readability.

- [ ] **Step 1 — bind existing successful baseline, before-state and reviewed candidate.** Preserve old 12/0/0 responses at `backups/manual-repairs/owa-answer-quality-20261015/qa-live12-central-reload/20261015T200922081Z/`, original reports/seals, current code hashes, service PID/start/health and supported automation configuration. Check main's relevant destination bytes match the base before backup. Preserve naturally generated Canary/Discovery changes.
- [ ] **Step 2 — durable scoped integration.** Back up only affected originals/new-file absence, verify restoration bytes, transfer exact reviewed code through apply_patch, verify main matches reviewed candidate and mcpbot can read its dependency closure. Do not run export/build or modify runtime state manually. Run main syntax and fixture-isolated focused tests before reload.
- [ ] **Step 3 — central then dedicated reload.** Verify actual entrypoints/ports using allowlisted systemd/listener metadata, without dumping Environment. Restart only `erp-kb-mcp.service`, wait for active/running/ExecMainStatus0/new PID/start, local health and public Q01 compact-format readback with TLS verification. Then restart only `erp-semantic-mcp.service`, wait for its corresponding local health/readback and recheck public route. Stop on failures; do not restart other services or edit proxy/configuration.
- [ ] **Step 4 — connected live12.** Invoke actual connected SemanticKB tools with the immutable twelve questions/tools/as_of/limit and a new correlation prefix. Archive full harness-visible Markdown, safe JSON, request/source hashes, manifests and manual grades. Never substitute direct function tests for connected acceptance or claim a raw HTTP envelope if only harness output is retained.
- [ ] **Step 5 — verify content, JSON and size.** Require manual12/0/0; measure whole visible replies versus same-corpus old format. If production corpus drift occurred naturally, do not claim a renderer-only shortening comparison across differing inputs: use the established frozen before/after for the 35% gate and separately report live content/lengths with their actual source hashes. Check additive JSON, exact extracts and public notes/citations/unknowns. Aggregate start/end as minimum/maximum across all twelve calls, not last array element.
- [ ] **Step 6 — preservation and recovery documentation.** Recheck original raw/promoted/registry/CSV/automation-policy hashes and unchanged unrelated files/index. Retain ordinary telemetry without claiming zero writes. Recovery runbook must restore only exact backed-up originals/remove only verified additions, verify restored hashes/absence/readability, then gate central→dedicated reloads and readbacks; this is future separately approved recovery, not an instruction to perform rollback now. Archive final independent review and scope/diff/evidence hashes. Keep worktree and uncommitted changes unless user requests commit/push.

## Self-review

- Every approved requirement has a task: pure presentation/citations/notes/pominięcia → Task1; unchanged renderer branches and additive JSON/independent budget validation → Task2; complete-response length, semantic parity and unchanged12Q → Task3; known public topology, durability, rollback and real endpoint → Task4.
- Interfaces are defined before their consumers; extraction/provenance/coverage engines are not changed. The formatter uses public data only and remains pure.
- Baseline capture precedes module-inventory changes, avoiding an incompatible old bundle accepted through a relaxed validator. Static corpus and baseline SHA remain fixed.
- No hidden evidence is used to keep a covered status: uncertain technical snippets remain visible conservatively. A missed length target is a reported failure, not permission to remove conditions or recalculate coverage.
- No implementation, service operation, commit or push is performed by writing this plan. Execution choice remains with the user.
