# Semantic Intent and Subject Retrieval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Delegate only after the user's execution choice.

**Goal:** Preserve 12/12 prior source-fidelity passes and bring the unchanged 20-question regression from 4/5/11 to 20/0/0 by using server-selected SemanticKB intent, permitted metadata and subject-specific evidence requirements; separately report a new untuned 10Q holdout.

**Architecture:** The domain handler supplies a private semantic intent. A request-local, namespace-filtered catalog resolves entities/fields/processes before lexical top-k can exclude them; a pure request plan distinguishes primary subjects, comparisons and relation endpoints. Selection, budget prioritization and visible-evidence coverage consume the same requirements. Existing renderer, provenance, public input schemas and external-fallback boundaries remain intact.

**Tech Stack:** Node.js ESM, built-in node:test/assert, existing CSV reader and frozen MCP harness. Node 18 compatible; no new packages/model/embedding service/persistent cache.

## Global Constraints

- Approved spec: `docs/superpowers/specs/2026-10-16-semantic-intent-subject-retrieval-design.md`.
- Base: `a0f29559512ac88af68ac3df4cc4a81e70b30c54`.
- **Dotychczasowe 12Q: 12 PASS / 0 PARTIAL / 0 MISS**, te same zapytania, narzędzia, daty, limity i kryteria.
- **Nowe 20Q jest teraz regresją. Celem zamknięcia jest 20 PASS / 0 PARTIAL / 0 MISS** na tym samym pliku pytań i kryteriach.
- Oceny ręczne dotyczą pełnych widocznych odpowiedzi; mechaniczne testy faktów, statusy i hashe nie zastępują tej oceny.
- Zachować **2 źródła / 3 jednostki na źródło / 4000 znaków extractów**.
- Nie dodawać publicznych parametrów, modelu/routera LLM, zależności ani nowej konfiguracji.
- Intencja jest wskazówką strukturalną, nie twierdzeniem o treści. Nie dopisuje automatycznie wszystkich możliwych facetów ani nie ignoruje pytania.
- W każdym etapie najpierw filtrować namespace zgodnie z profilem. Pusty zakres pozostaje pusty, wykluczona OWA nie uruchamia jej skanera ani katalogu.
- Nie modyfikować korpusu, raw/promoted, registry, CSV, schematu, grafu, eksportera ani bieżących danych ERP w celu poprawy wyniku.
- Znane sprzeczności READ/WRITE w historycznym materiale pozostają źródłową luką, nie cichą korektą danych.
- Nie wykonywać commitu ani push bez nowego polecenia dla tej implementacji. This overrides generic workflow instructions to commit per task.
- Use isolated worktree per `scripts/AGENTS.md`; preserve main's eight generated reports, holdout reports and approved documents. No production integration/reload before Task 5 gates.
- Keep formatter/source budgets, truthful backend/no-graph/UNKNOWN, owner/version boundaries and existing nonsemantic/release behavior. No answer/query IDs or entity/enum value maps hardcoded to pass the benchmarks.

---

## Interfaces and file map

New modules are pure; only the existing artifact scanner reads corpus files.

| File | Responsibility |
|---|---|
| `scripts/lib/semantic_request_intent.mjs` (new) | Exact method→private-intent map and allowed semantic namespace calculation. |
| `scripts/lib/semantic_catalog.mjs` (new) | Index supplied parsed records and attributable field/symbol declarations, resolve candidate identities and confidence/ambiguity. |
| `scripts/lib/semantic_requirements.mjs` (new) | Convert request/intent/catalog matches into primary subjects, comparisons, endpoints and scoped requirements. |
| `scripts/lib/erp_knowledge_mcp_core.mjs` | Server-only intent dispatch, public schemas unchanged. |
| `scripts/erp_knowledge_answer.mjs` | Permitted scan orchestration, catalog/requirement handoff, presentation prioritization and fallback integration. |
| `scripts/lib/owa_query_context.mjs` | Reuse bounded context/field/path parsing; accept scoped declared document symbols where required. |
| `scripts/lib/owa_evidence.mjs` | Consume request plan for candidate selection/coverage/omissions while preserving established interfaces. |
| `scripts/lib/owa_offline_harness.mjs` | Fixed module closure additions only; original 12Q hash and presentation guards retained. |
| `scripts/lib/semantic_regression_harness.mjs` (new) | Explicit, hash-bound combined 12+20 banks and closed regression bundle/runner support; no production import. |
| `scripts/test_semantic_regression_32q.mjs` (new) | Actual domain dispatch and capture, never automatic correctness grading. |

JSDoc data contracts, exact names used by subsequent tasks:

```js
// SemanticIntent: 'concept'|'entity'|'relation'|'process'
// ParsedRow: {namespace,artifact,contentHash,line,endLine,fields:Record<string,string>}
// CatalogIdentity: {id,namespace,kind,label,aliases,tableNames,origin:ParsedRow}
// FieldDeclaration: {ownerId,name,qualifiedName,status,text,origin:ParsedRow}
// Catalog: {identities,fields,symbols,diagnostics}; no file handles/global caches.
// RequestPlan: {intent,subjects,requirements,unresolved,ambiguities,context}
// Subject: {id,namespace,role:'primary'|'comparison'|'endpoint'|'auxiliary',match}
// Requirement: {ownerId:string|null,fieldName:string|null,facet:string,
//   endpointOwnerIds?:string[],processId?:string,documentPath?:string[]}
```

`origin` and raw rows stay private/nonenumerable in answer internals. No request plan grants a namespace. If a reference is dangling or an alias names multiple owners, preserve that uncertainty; do not manufacture an ID equivalence.

## Task 1: Semantic method intent and permitted candidate scope

**Files:** Create `scripts/lib/semantic_request_intent.mjs`, `scripts/test_semantic_request_intent.mjs`; modify `scripts/lib/erp_knowledge_mcp_core.mjs:583-584` and the semantic-only orchestration in `scripts/erp_knowledge_answer.mjs:770-778`.

**Interfaces:**
- `semanticIntentForTool(name: string): SemanticIntent|null`.
- `semanticCandidateNamespaces(intent: SemanticIntent|null, allowed: Set<string>|null): string[]`.
- Private `answerQuestion` option `semanticIntent`; not a public tool argument. Existing release option retains precedence in its own method.
- Existing scanner/gatherer signatures stay valid. A semantic request may add private context properties; old calls without intent keep the old route contract.

- [ ] **Step 1 — isolate and capture baseline before implementation.** Use using-git-worktrees at execution time, base commit above. Read root/scripts AGENTS and module map. Run `npm run check`, map validation. Preserve approved 12Q/20Q files byte-exact in the worktree via controlled copy; both 20Q reports and new spec/plan are initially untracked on main. Freeze only the known static artifacts for the permitted KBs and record hashes; do not copy runtime/credentials or run export/build. Capture actual-handler 12+20 baseline with the old code through closed fixtures; keep 12/0/0 and 4/5/11 historical scores separate from any newly reviewed baseline result.
- [ ] **Step 2 — add RED tests for internal dispatch/scope.** Use four real method names, empty/one/two allowed namespaces and a nonsemantic tool; unknown method must not gain intent. Reject user-injected intent/namespaces through existing schemas and verify they cannot affect the private value.

```js
assert.equal(semanticIntentForTool('erp_entity.get'),'entity');
assert.equal(semanticIntentForTool('erp_relation.list'),'relation');
assert.equal(semanticIntentForTool('erp_process.explain'),'process');
assert.equal(semanticIntentForTool('erp_concept.search'),'concept');
assert.equal(semanticIntentForTool('optima_docs.search'),null);
assert.deepEqual(semanticCandidateNamespaces('entity',new Set()),[]);
assert.deepEqual(semanticCandidateNamespaces('entity',new Set(['ComarchOptimaBusinessSemantics'])),
  ['ComarchOptimaBusinessSemantics']);
```

- [ ] **Step 3 — run RED.** `node scripts/test_semantic_request_intent.mjs`; capture the missing-intent/scope or actual-dispatch assertion failure.
- [ ] **Step 4 — implement the closed map and scope intersection.** Only the handler derives intent from its validated tool name. Do not pass through an arbitrary options object from request arguments.

```js
const semanticMethods = new Map([
  ['erp_concept.search','concept'],['erp_entity.get','entity'],
  ['erp_relation.list','relation'],['erp_process.explain','process'],
]);
export function semanticIntentForTool(name) { return semanticMethods.get(name) || null; }
export function semanticCandidateNamespaces(intent,allowed) {
  if (!new Set(semanticMethods.values()).has(intent)) return [];
  return ['OWAOntology','ComarchOptimaBusinessSemantics']
    .filter(namespace=>allowed == null || allowed.has(namespace));
}
```

Dispatch with `{semanticIntent: semanticIntentForTool(name)}` only for the four recognized methods, `{intent:'release'}` only for the existing release method, otherwise `{}`. The retrieval candidate response can include both permitted KBs before subject selection; final primary/support attribution must describe the evidence actually selected. Do not implement an unconditional OWA primary override.

- [ ] **Step 5 — verify scanner boundaries.** In synthetic fixture ROOT, a semantic entity request can inspect both permitted catalogs even when the generic classifier initially prefers Business Semantics. OWA-excluded and empty scopes perform zero OWA reads/metadata probes. Legacy and Product release dispatch retain their original options/routes. Use existing throwing network/write guards and precise fixture learning-writer no-op.
- [ ] **Step 6 — GREEN and handoff.** Run the new suite, `test_release_tool_intent`, `test_erp_knowledge_mcp_profiles`, `test_erp_knowledge_blended_routes` after inspecting side effects. Record exact commands/output and any interim catalog/coverage handoff. No staging/commits by implementer.

## Task 2: Request-local catalog and subject-scoped requirements

**Files:** Create `scripts/lib/semantic_catalog.mjs`, `scripts/lib/semantic_requirements.mjs`, `scripts/test_semantic_catalog.mjs`, `scripts/test_semantic_requirements.mjs`; narrowly extend `scripts/lib/owa_query_context.mjs`.

**Interfaces:**
- `buildSemanticCatalog(rows: ParsedRow[], allowed: Set<string>): Catalog`.
- `resolveSemanticSubjects(question: string, intent: SemanticIntent, catalog: Catalog): {subjects,unresolved,ambiguities}`.
- `buildSemanticRequestPlan(question: string, intent: SemanticIntent, catalog: Catalog): RequestPlan`.
- Reuse `parseOwaQuestion`, `matchesOwaField`, literal source-reference IDs and ordered `documentPaths`. Context facets remain hints, not a global obligation applied to every mention.

- [ ] **Step 1 — RED catalog controls.** Synthetic owners must use unrelated names/IDs, an inflected multiword name, same alias for two owners, exact qualified field and wrong qualifier. Include a field only in an owned Markdown identifier table, a tentative PK, unknown enum, inconsistent status and dangling exported endpoint ID.

```js
const row = (id,name,description)=>({namespace:'OWAOntology',
  artifact:'exports/owa_ontology/v1/ontology_entity.csv',contentHash:'sha256:'+'a'.repeat(64),
  line:2,endLine:8,fields:{id,name,canonicalName:name,description}});
const card = row('opaque:card','Karta próbna',
  '## Identyfikatory\n| Typ | Pole | Status |\n| --- | --- | --- |\n| PK | Sample_Key | do potwierdzenia |\n\n## Otwarte problemy\nUNKNOWN: pełny słownik Sample_Tag.');
const catalog = buildSemanticCatalog([card],new Set(['OWAOntology']));
const field = catalog.fields.find(item=>item.name==='Sample_Key');
assert.equal(field.ownerId,'opaque:card');
assert.equal(field.status,'do potwierdzenia');
assert.equal(field.origin,card);
assert.equal(buildSemanticCatalog([card],new Set()).identities.length,0);
```

- [ ] **Step 2 — implement attributable catalog indexes.** Filter allowed namespaces before inspecting row fields. Index exact IDs/ontologyId, declared names/canonicalName/aliases/mainTable and existing field/relation/workflow references. Add field/symbol declarations from **structured owned** sections only: Markdown tables with headers, named bullet/code declarations and explicit Symbol classification. Preserve original text/status/origin, never label it a verified MSSQL field.

Build natural-language candidates from metadata plus bounded owned descriptions/section labels: full/inflected names first; then multi-token discriminating matches. Common words alone must not establish identity. A generic inflection/action pattern can aid matching, but no per-benchmark synonym dictionary, field prefix→owner map or answer fact table is allowed. Ambiguous ties remain explicit. Do not infer a table owner from an arbitrary mention elsewhere in a paragraph.

- [ ] **Step 3 — RED subject/requirement tests.** For “encja X: jej klucz i relacja do Y”, require only X's identifier and the X–Y relation, not Y's identifier. For “porównaj X i Y”, require both requested explanations. An explicitly separate field question and independent workflow must not become one field×all-facets Cartesian product.

```js
const plan = buildSemanticRequestPlan('Encja Karta próbna: jej klucz i relacja do grupy próbnej',
  'entity',syntheticCatalog);
assert(plan.subjects.some(s=>s.id==='opaque:card' && s.role==='primary'));
assert(plan.subjects.some(s=>s.id==='opaque:group' && s.role==='endpoint'));
assert(plan.requirements.some(r=>r.ownerId==='opaque:card' && r.facet==='identifiers'));
assert(!plan.requirements.some(r=>r.ownerId==='opaque:group' && r.facet==='identifiers'));
assert(plan.requirements.some(r=>r.facet==='relations'
  && r.endpointOwnerIds.includes('opaque:card') && r.endpointOwnerIds.includes('opaque:group')));
```

`syntheticCatalog` must be built in that test from two declared metadata rows, not a mock resolver; include their actual declared relation and aliases. Repeat with reversed mention order, explicit two-primary comparison, another inflected pair and an unknown exact identity.

- [ ] **Step 4 — implement roles and scoped requirements.** Use syntactic ownership/coordination and the method intent. Distinguish primary interrogative scope from “do/z Y” endpoint/auxiliary mentions; separate coordinated requests and explicit comparisons. Assign named field requirements to their declared owners; unresolved owners stay unresolved, not global wildcards. Relation requirements carry their own endpoint set; do not require every owner elsewhere in the question to participate in each relation.

Treat limitations about verification/FK as qualifications of that relation, not workflow. Preserve independent workflow facets without requiring a named field to appear in each process unit. Keep multiple exact process IDs as independent requirements. Recognize correction symbols from bounded metadata labels/classification declarations, not by extending the global document-code set with a one-case fix. Unknown middle steps and repeated codes stay in paths verbatim.

- [ ] **Step 5 — GREEN and generalization controls.** Run catalog/requirements/context/routing tests. Add no-name natural descriptions with discriminating source-language anchors, an unrelated high-frequency product name, ambiguity, proposed-vs-confirmed keys and contradictory statements. Every selected subject must point back to literal allowed metadata/source evidence; no hidden body answer extraction from unselected KBs.

## Task 3: Requirement-aware selection, source budget and visible coverage

**Files:** Modify `scripts/erp_knowledge_answer.mjs`, `scripts/lib/owa_evidence.mjs`; create `scripts/test_semantic_subject_selection.mjs`, `scripts/test_semantic_visible_coverage.mjs`; extend previous context tests only for intended semantic behavior.

**Interfaces:**
- Consume Tasks1/2 intent, Catalog and RequestPlan.
- Extend `selectOwaEvidence(context,rows,requestPlan=null)` and `assessOwaCoverage(context,selection,visibleUnits,requestPlan=null)` compatibly, or carry the plan privately in the existing context/selection. Report the actual interface and use it consistently in selection and omission reconciliation.
- `answerQuestion` still returns `{answer,...}`; `renderAnswerMarkdown`, MCP schemas and current source object contracts stay unchanged.

- [ ] **Step 1 — RED actual-handler cases.** In guarded synthetic fixture ROOT, dispatch natural entity/relation/process/concept requests through all four real methods. Include PK of primary X competing with linked Y's many rules, formal FK limitation, two compared entities, source-owned unknown field lacking a dedicated field CSV row, and positive correction path derived from declared symbols.

```js
const result = await handleJsonRpcRequest({jsonrpc:'2.0',id:1,method:'tools/call',params:{
  name:'erp_entity.get',arguments:{query:'Karta próbna: jej klucz i relacja do grupy próbnej',limit:5}
}}, {profile:getMcpProfile('erp-semantic-mcp'),
  allowedNamespaces:new Set(['OWAOntology','ComarchOptimaBusinessSemantics']),writeAllowed:false});
const body = result.result.structuredContent;
assert(body.answer.includes('Sample_Key'));
assert(body.answer.includes('do potwierdzenia'));
assert(body.answer.includes('N:1'));
assert(!body.owaCoverage.requirements.some(r=>r.ownerId==='opaque:group'
  && r.facet==='identifiers'));
```

- [ ] **Step 2 — scan once, plan before caps.** Candidate collection scans configured allowed artifacts once per request, retaining row locators/hashes before lexical top-k. Build the catalog and requirements over those records. Select final primary/support KB by attributable subject matches and evidence; Business Semantics remains a legitimate source for concept explanations. If no credible subject exists, ask clarification or report limited evidence. Do not keep an irrelevant OWA coverage branch active merely because OWA was allowed in the candidate scan.
- [ ] **Step 3 — budget by requirements.** Prioritize missing primary/explicit-comparison requirements before secondary metadata and endpoint catalogues. Choose complete identifier/relation rows and adjacent qualification; do not split conditions. Limits stay 2/3/4000. Preserve exact source/version identity and selected bytes. Required verification limitations outrank unrelated generic rules. If a requirement cannot fit, report it specifically; do not claim absent data.
- [ ] **Step 4 — assess the exact requirement set against rendered units.** Use each relation's own endpoint set instead of all selected owners; keep owner×requested-field protection for field facts. A displayed complete relation can satisfy relation/cardinality without unrelated owner facts; a different owner's field cannot satisfy the primary key. Reconcile omissions through the same requirement keys and final visible evidence. Do not set coverage to PASS merely because requirements were reduced; every remaining requested fact needs visible support.
- [ ] **Step 5 — unknown/conflict/fallback regressions.** Name tentative PK/unknown enum specifically with attributable source text. Retain both affirmative and conflicting unknown statements, including contrast/negation/checked annotation controls from prior fixes. Never fabricate enum codes. Exact missing/mixed identities remain protected from substitute owners and provider fallback even after intent-based routing. Ordinary unrelated implicit fallback behavior and its full rendered external URLs/dates/qualifications remain compatible.
- [ ] **Step 6 — compatibility gate.** Run new selection/coverage tests and existing semantic scope, OWA query/selection/coverage/final-fixes, compact presentation/contracts/guards, citations/extracts/retrieval/blended/release/profile suites after side-effect inspection. Tests may change only intentional subject-scoping expectations, paired with stronger material-fact controls; do not weaken source isolation, full-text, UNKNOWN, status or budget assertions. No production/runtime write beyond disposable fixtures.

## Task 4: Frozen 32Q acceptance, independent review and sealed new holdout

**Files:** Create `scripts/lib/semantic_regression_harness.mjs`, `scripts/prepare_semantic_regression_fixtures.mjs`, `scripts/test_semantic_regression_32q.mjs`, `scripts/test_semantic_regression_guards.mjs`; modify fixed dependency inventory in `scripts/lib/owa_offline_harness.mjs` without weakening old 12Q checks. Reports: `docs/reference/Semantic_Intent_Subject_Regression32Q_2026-10-16.{json,md}`.

**Interfaces:**

```text
node scripts/prepare_semantic_regression_fixtures.mjs --corpus-root ABSOLUTE_ROOT --code-root ABSOLUTE_ROOT --output-parent /tmp/opencode
node scripts/test_semantic_regression_32q.mjs --bundle ABSOLUTE_BUNDLE --output-parent /tmp/opencode
```

The new wrapper binds both original banks by exact SHA-256, not generated copies. Reuse the closed module loader, virtual static filesystem, precise `recordLearningGap` fixture stub and independent presentation audit. Only explicit static allowlisted artifacts and source-reference documents are copied. Do not loosen the existing 12Q validator to accept arbitrary extra files or a silently different question count.

- [ ] **Step 1 — RED fixture/guard controls.** Missing bundle, altered gold bytes, a swapped query/tool/date, unknown module, symlink/traversal, unmanifested artifact, public intent injection, swallowed read/write/network attempts and unknown output layout must fail before acceptance. Runtime cannot read even reporter-output files; only the reporter has exclusive named-write capability.
- [ ] **Step 2 — capture baseline/candidate on the same static inputs.** Preserve all 12 QNN and 20 HNN full requests/responses, source/module manifests and questions. Use `as_of=2026-10-15` for original12 and `2026-10-16` for H20, both limit5. Avoid normalizing dates or redefining PASS for convenience. Candidate scoring report starts `PENDING_MANUAL_REVIEW`.

```js
const cases = [
  ...original12.questions.map(q=>({...q,asOf:'2026-10-15'})),
  ...original20.questions.map(q=>({...q,asOf:'2026-10-16'})),
];
assert.equal(cases.length,32);
assert.equal(new Set(cases.map(q=>q.id)).size,32);
for (const q of cases) {
  const request = {jsonrpc:'2.0',id:q.id,method:'tools/call',params:{name:q.tool,
    arguments:{query:q.query,as_of:q.asOf,limit:5,correlation_id:`semantic32-candidate-${q.id}`}}};
  const response = await handleJsonRpcRequest(request,{profile:getMcpProfile('erp-semantic-mcp'),
    allowedNamespaces:new Set(['OWAOntology','ComarchOptimaBusinessSemantics']),writeAllowed:false});
  assert(!response.error && !response.result?.isError);
  // Persist complete JSON-rounded result and its entire visible text using the guard's named output writer.
}
```

- [ ] **Step 3 — manual 32Q assessment.** Read every complete changed answer against the bank's unchanged expected facts, including qualifiers/unknowns/corrections/conflicts. Question echoes, scope labels, confidence and coverage flags are not evidence credit. Require 12/0/0 and20/0/0 separately; log each remaining failure honestly. Specific fixes require synthetic RED reproductions and fresh code/body evidence, not a gold/source change.
- [ ] **Step 4 — full gate and whole-change review.** Run `npm run check`, all explicit new syntax checks, module-map validation and the bounded compatibility suites. Bind exact source/test bytes to command/exit/log hashes, no live providers. Perform independent per-task and whole-change source review before integration. Preserve initial4/5/11 and interim candidate failures; do not overwrite them with a passing summary.
- [ ] **Step 5 — freeze candidate, then prepare independent 10Q.** Once source is reviewed and32Q passes, coordinator or fresh QA worker prepares ten new questions and source-guided criteria in `docs/reference/Semantic_Intent_Subject_Holdout10Q_2026-10-16.json`. Use topics/paraphrases not copied from32Q; seal complete UTF-8 bytes/hash before any scored call. Keep bank unavailable to implementation/fix workers; they may receive only its eventual public result, after the frozen candidate has been evaluated. Record source-candidate hash to detect any post-freeze code change.

The new10Q is **not** a condition that can be tuned by repairing code in the same evaluation. After a result, report all failures; if later work uses that bank for fixes, it becomes a new regression bank and a different holdout is needed. Do not claim statistical general readiness from any single small sample.

## Task 5: Controlled central/Semantic deployment, live32Q and untuned live10Q

**Files:** Exact reviewed transfer only; public reports `docs/reference/Semantic_Intent_Subject_Deployment_2026-10-16.{json,md}`, `Semantic_Intent_Subject_Live32Q_2026-10-16.{json,md}`, `Semantic_Intent_Subject_Holdout10Q_Results_2026-10-16.{json,md}`.

**Evidence root:** `backups/manual-repairs/semantic-intent-subject-20261016/`, private and mcpbot-readable. Retain predecessor backups rather than reuse/overwrite them.

- [ ] **Step 1 — preflight and durable recovery evidence.** Check actual main/source/destination hashes, current listener/PID/start/health and supported automation GET state, without showing Environment/secrets. Preserve source/gold/corpus/static hashes and pre-existing eight generated reports plus holdout/spec/plan files. Back up exact changed originals and addition-absence markers; verify restoration bytes before transfer.
- [ ] **Step 2 — integrate reviewed bytes and validate.** Native apply_patch transfer only, exact main/candidate hash parity and mcpbot dependency readability. Run main syntax, map and fixture-isolated focused tests. No export/build, graph, ERP, policy, timer, proxy or arbitrary runtime-file edits.
- [ ] **Step 3 — sequential actual-service reloads.** Verify known public dynamic Semantic profile is served by central3400; dedicatedSemantic3420 shares imports. Restart only `erp-kb-mcp.service`, wait for new PID/start, active/running/exit0, health, public TLS verify0 and reviewed semantic smoke. Then restart only `erp-semantic-mcp.service`, repeat dedicated/public readbacks. Compare seven public read-only profile manifests; no other unit restart or routing edit.
- [ ] **Step 4 — actual connected32Q acceptance.** Invoke exact bank tool/query/date/limit with new correlation prefix via connected tools. Persist complete harness-visible Markdown, safe tool-state JSON, request/source/body hashes and proof of one call per intended scored case. Supplemental authenticated public JSON readbacks, if used, are labelled and never substituted for actual connected calls. Manually grade all32 and check scopes, citations, requirements, source limitations, budgets and compact output. No raw-HTTP-envelope claim when only harness output was captured.
- [ ] **Step 5 — independently score the sealed new10Q.** Verify reviewed deployed code still matches the frozen candidate before and after the calls. Run each new query exactly once with its preregistered date/limit; capture the same complete proof. Report PASS/PARTIAL/MISS and specific gaps independently of32Q. No wording changes, retries, patches or source updates to improve this held-out score. If code drift occurs, preserve the attempt and report the invalid comparison rather than silently rebind it.
- [ ] **Step 6 — final review, preservation and recovery instructions.** Recheck raw/promoted/registry/CSV/policy/allowed config/indices and unrelated service states; distinguish natural timer-report drift from task edits. Aggregate completion as maximum call end, not the last entry. Retain ordinary telemetry without claiming zero audit writes. Archive independent operational/answer review and its own manifest. Recovery documentation restores only exact backed-up originals/removes only hash-verified additions, checks restored hashes/absence/readability, then gates **central→dedicated** reloads/readbacks under separate future rollback authorization. Keep worktree/main changes uncommitted unless a new commit/push request arrives.

## Self-review

- Spec coverage: method/access→Task1; catalog/ownership/natural language→Task2; subject/fact priority and consistent coverage→Task3; immutable32Q/guards/review and candidate-frozen new10Q→Task4; actual public topology/connected acceptance/preservation/rollback→Task5.
- All producer interfaces precede consumers. Intent cannot grant access, origin metadata cannot create verified facts, and private rows/catalog matches are not public response content.
- No blanket OWA override, source refresh, synonym answer table, enum fabrication or global owner×facet workaround is an acceptance strategy.
- Previous compact formatting and provenance tests are retained. Response source selection may legitimately change, so old full-body byte equality or38.91% reduction is not falsely required across newly selected content.
- Current20Q is openly a regression set; the new10Q remains separate and untuned. Unresolved32Q failures block completion, while new10Q failures must be reported without same-run training.
- This document creates no implementation, restart, commit or push. Execution mode is the user's next choice.

## Approved execution extension before Task 5: enforce read-only auto-draft boundary

Preflight stopped before transfer/reloads/scored calls because both running services have auto-draft enabled. The user explicitly approved a small internal read-only MCP write gate, preserving providers/configuration/normal automation. Implement this as a separately reviewed correction before resuming Task 5, not as a policy override.

- [ ] Add RED actual-handler cases with `EXA_AUTO_DRAFT=1`, successful synthetic provider and throwing/counter-only inbox writes for all read-only answer paths. Test both `context.writeAllowed=false` and `true`, omitted context, profile variants and rejected public argument injection; preserve full external result/URL/date/qualifications and telemetry.
- [ ] In the shared helper serving read-only answer methods, call the engine with `{...options, allowAutoDraft:false}` so no caller-supplied option can win. Keep semantic/release intent intact.
- [ ] Guard only automatic draft creation in the engine with `options.allowAutoDraft !== false`. Leave discovery/provider selection, explicit write tools and direct configured engine callers unchanged. Add positive fixture control for the existing authorized write path and default direct automation.
- [ ] Run covering MCP/fallback/scope suites and a complete closed32 capture. Prove identical whole-body answers, request/gold/static identity and preserved 12/0/0 + 20/0/0; if content actually differs, review it rather than transfer old grades blindly.
- [ ] Obtain independent review, freeze new exact source bytes, and create a separate evaluation-binding receipt connecting the unchanged sealed10Q hash with the reviewed write-gate revision. Do not expose 10Q contents to implementers or alter the original bank/seal. All scored10 calls remain zero until the operational executor runs them.
- [ ] Resume Task 5 without changing either `EXA_AUTO_DRAFT=1`, provider configuration or policy. Retain the original blocked preflight and evidence as history; use a new timestamped deployment/evaluation child and separately report actual runtime proof of no draft creation.
