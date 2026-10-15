# OWA Answer Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Delegation requires the user's execution choice; otherwise work inline.

**Goal:** Deliver attributable, complete OWA answers and explicit missing/ambiguous-evidence responses, passing the unchanged twelve-question SemanticKB benchmark.

**Architecture:** Keep the existing router, local CSV parser and source presentation. Add small pure OWA context/selection helpers and explicit local-source provenance; adapt the existing answer flow at its routing, candidate-selection, presentation and assessment boundaries. All selection is request-local and restricted to the allowed namespace set.

**Tech Stack:** Node.js ESM, built-in `node:test`/`node:assert`, existing CSV parser, existing MCP HTTP bridge and systemd deployment; Node 18 compatible, no new dependency.

## Global Constraints

- Approved spec: `docs/superpowers/specs/2026-10-15-owa-answer-quality-design.md`.
- Baseline code commit: `2a4ef8a13bfa50997a78c59b39632ef050496643`; baseline QA: `docs/reference/OWA_SemanticKB_12Q_2026-10-15.{json,md}`.
- Celem akceptacji jest **12 PASS / 0 PARTIAL / 0 MISS** według niezmienionych kryteriów.
- Implementować w izolowanym checkoutcie zgodnie z `scripts/AGENTS.md`.
- Nie hardkodować pytań, fikcyjnego ID Q12, enumów ani oczekiwanych odpowiedzi.
- Zachować domyślne limity: dwa źródła, trzy sekcje na źródło, 4000 znaków treści.
- Zachować `retrieval.backend=local_artifacts`, `graphUsed=false`, znaczenie confidence i istniejące pola domenowego MCP.
- Zachować izolację namespace, owner/version, pełne warunki, jawne UNKNOWN i istniejącą ochronę pochodzenia WWW.
- Bez zmian raw, promoted, registry, CSV, eksportera, schematu, grafu, polityk automatyzacji i timerów.
- No commit/push unless explicitly requested for this implementation. Previous commit/push requests have already been completed; preserve checkpoints through diffs and task reports instead.
- All offline tests use disposable fixture roots, disabled network/learning/drafts and synthetic data. Never source production environment secrets into test runners.
- No broad refactor or new generative backend. Actual deployment requires code-byte verification, targeted service reload and connected-tool readback, not just local import success.

---

## File responsibilities and interfaces

Existing integration points:

- `scripts/erp_knowledge_assistant.mjs`: routing, preserve allowed namespace filtering and release precedence.
- `scripts/erp_knowledge_answer.mjs`: artifact scanning/gathering, assembly, evidence assessment and Markdown; delegate OWA-specific logic rather than embedding it throughout this 731-line file.
- `scripts/lib/knowledge_retrieval.mjs`: named CSV fields and bounded lexical ranking; generic behavior remains compatible.
- `scripts/lib/erp_knowledge_mcp_core.mjs`: existing domain dispatch; modify only if additive answer fields need exposure.

New focused modules:

1. `scripts/lib/owa_query_context.mjs` — pure normalization/context/identity resolution, no filesystem or network.
2. `scripts/lib/owa_evidence.mjs` — pure candidate selection and question coverage over parsed permitted OWA rows, no filesystem or network.
3. `scripts/lib/local_source_provenance.mjs` — validate and describe local artifact identity from supplied namespace/path/record/hash/locator, without arbitrary owner-path reads.

Shared data contract, documented in JSDoc in these modules:

```js
// ParsedRow:
// { namespace, artifact, contentHash, line, endLine, fields: Record<string,string> }
// Context:
// { explicitOwa, qualifiedIds: string[], fieldNames: string[],
//   documentCodes: string[], requestedFacets: string[], ambiguity: string|null }
// Selection:
// { ownerIds: string[], candidates: ParsedRow[],
//   requestedIdentityMissing: boolean, ambiguities: string[] }
// Coverage:
// { status: 'supported'|'partial'|'unknown'|'ambiguous', reasons: string[],
//   notices: string[], missingFacets: string[] }
```

`supported` means the selected source covers the requested information, never fresh claim verification. Map it to existing `unverified_evidence`, not a new verified status.

Actual export inputs, all already present:

- `ontology_entity.csv`: `id,canonicalName,ontologyId,aliases,mainTable,verificationStatus,description,summary`.
- `chunk.csv`: `id,sourceDocumentRefId,sourcePath,sectionHeading,sectionOrder,content`.
- `ontology_field.csv`: `id,entityRefId,fieldName,mssqlColumn,keyRole,mappingStatus,description`.
- `ontology_relation.csv`: `id,sourceEntityRefId,targetEntityRefId,predicate,cardinality,relationType,joinCondition,status`.
- `workflow_pattern.csv`: `id,workflowName,sourceEntityRefId,targetEntityRefId,mcpTool,mode,status,description`.

Do not silently repair exported inconsistencies. Example: a workflow row can say READ in its description and WRITE in mode. Keep conflicting source values attributable and qualified; do not turn this into a current capability claim.

## Task 1: Preserve explicit OWA routing and query identity

**Files:**
- Create `scripts/lib/owa_query_context.mjs`.
- Modify `scripts/erp_knowledge_assistant.mjs:653-805`.
- Create `scripts/test_owa_query_context.mjs`, `scripts/test_owa_answer_routing.mjs`.

**Interfaces:**
- Produces `isExplicitOwaQuestion(question: string): boolean`.
- Produces `parseOwaQuestion(question: string): Context`.
- Produces `resolveOwaOwners(context: Context, entityRows: ParsedRow[]): {ownerIds:string[], identityMatches:Array<{ownerId:string,kind:string}>, missing:boolean}`.
- Existing consumers retain `classifyQuestion(question,routing,allowedNamespaces,options={})` signature.

- [ ] **Step 1 — establish isolation and baseline.** Use `using-git-worktrees` at execution time; verify chosen directory and branch before creation. Carry only approved spec/plan and frozen QA reports into that worktree. Read its root/local AGENTS, run `npm run check` and `python3 scripts/validate-module-map.py`. Do not copy downloads/exports wholesale or alter the running checkout.
- [ ] **Step 2 — write pure context tests and routed counterexamples.** Use real routing definitions, but no runtime reads beyond that static file. Minimum contract:

```js
assert.equal(isExplicitOwaQuestion('W ontologii OWA czym jest kontrahent?'), true);
assert.equal(isExplicitOwaQuestion('OWAOntology.TestEntity'), true);
assert.equal(isExplicitOwaQuestion('Przechowywanie towaru'), false);
assert.equal(isExplicitOwaQuestion('nowa faktura'), false);
const q = parseOwaQuestion('Relacja PZ → FZ w OWA');
assert.deepEqual(q.documentCodes, ['PZ', 'FZ']);
assert.deepEqual(parseOwaQuestion('OWAOntology.Example').qualifiedIds,
  ['OWAOntology.Example']);
const allowed = new Set(['OWAOntology', 'ComarchOptimaBusinessSemantics']);
assert.equal(classifyQuestion('W ontologii OWA czym jest kontrahent?', routing, allowed)
  .primaryRoute.primaryKb, 'OWAOntology');
assert.equal(classifyQuestion('Jak OWA opisuje workflow i ograniczenia?', routing, allowed)
  .primaryRoute.primaryKb, 'OWAOntology');
assert.equal(classifyQuestion('W OWA czym jest kontrahent?', routing,
  new Set(['ComarchOptimaBusinessSemantics'])).primaryRoute.primaryKb,
  'ComarchOptimaBusinessSemantics');
assert.throws(() => classifyQuestion('OWA', routing, new Set()));
```

- [ ] **Step 3 — run RED.** `node scripts/test_owa_query_context.mjs && node scripts/test_owa_answer_routing.mjs`. Missing helper/import or wrong primary route must fail; record failure before implementation.
- [ ] **Step 4 — implement context extraction.** Normalize case, Polish diacritics and token boundaries; recognize qualified ontology identifiers separately from ordinary words. Extract quoted/table-style field names and known document codes using existing bounded document-code rules. Facets cover identifiers, roles, prices, fields, relations, cardinality, workflow, unknown enums and status ambiguity; no question-ID handling.

```js
export function isExplicitOwaQuestion(question) {
  return /(?:^|[^a-z0-9_])owa(?:ontology)?(?:$|[^a-z0-9_])/i.test(String(question));
}
```

For owners, index explicit ID/canonicalName/name/aliases/mainTable and field ownership from parsed source rows. Use bounded full labels plus conservative inflection rules; return competing matches rather than guess when equal. IDs are opaque exact identities: do not invent equality by stripping `ENCJA_` from arbitrary references.

- [ ] **Step 5 — apply routing precedence.** After allowed namespace filtering and existing route calculation, select the available OWA route when `isExplicitOwaQuestion(question)` is true. Maintain its allowed support KBs. Keep the existing server-selected release override in its established precedence; no public `options.intent` extension.

```js
if (isExplicitOwaQuestion(question)) {
  const ontology = routeScores.find(route => route.primaryKb === 'OWAOntology');
  if (ontology) primary = ontology;
}
```

- [ ] **Step 6 — verify GREEN and compatibility.** Run both new tests, `node scripts/test_release_tool_intent.mjs`, `node scripts/test_erp_knowledge_blended_routes.mjs`. Add explicit negative scopes and paraphrases of Q01/Q07/Q09 using synthetic owners unrelated to benchmark labels. Record a task diff and results; do not commit automatically.

## Task 2: Select correct owners, relations and complete source facets

**Files:**
- Create `scripts/lib/owa_evidence.mjs`, `scripts/test_owa_evidence_selection.mjs`.
- Modify `scripts/erp_knowledge_answer.mjs:107-228` and `scripts/lib/knowledge_retrieval.mjs:85-115`.

**Interfaces:**
- Consumes Task 1 `Context`, `ParsedRow` and owner resolver.
- Produces `selectOwaEvidence(context: Context, rows: ParsedRow[]): Selection`.
- Produces `owaUnitsForRow(context: Context, row: ParsedRow): Array<{text:string,facet:string}>`.
- Add optional final argument to scanner/gatherer for request-local context; all old call signatures/default behavior remain valid.

- [ ] **Step 1 — create disposable synthetic CSV fixtures.** Include two owners with similar descriptions, zero-score same-owner outcome, foreign-owner chunk, relation sharing one end but not the requested second end, and exact field ownership. Keep header names identical to actual exports. Include rows where summary is shorter than full description/content.

```js
const rows = [
  {namespace:'OWAOntology',artifact:'fixture/ontology_entity.csv',
    contentHash:'sha256:fixture',line:2,endLine:2,
    fields:{id:'OWNER_A',name:'Produkt próbny',canonicalName:'ProduktPróbny',
      ontologyId:'OWAOntology.ProduktProbny',aliases:'SampleProduct',
      description:'## Identyfikatory\nPrb_Id jest kluczem.\n\n## Ceny\nPrbCeny przechowuje ceny.'}},
  {namespace:'OWAOntology',artifact:'fixture/chunk.csv',
    contentHash:'sha256:fixture',line:3,endLine:4,
    fields:{id:'CHUNK_A',sourceDocumentRefId:'OWNER_A',
      sourcePath:'downloads/knowledge_inbox/fixture/a.md',
      content:'## Otwarte problemy\nUNKNOWN: brak kompletnego słownika Prb_Typ.'}}
];
const selection = selectOwaEvidence(parseOwaQuestion('W OWA encja SampleProduct, identyfikator i ceny'), rows);
assert.deepEqual(selection.ownerIds, ['OWNER_A']);
assert(selection.candidates.every(row => row.namespace === 'OWAOntology'));
assert(owaUnitsForRow(parseOwaQuestion('ceny produktu'), rows[0])
  .some(unit => unit.text.includes('PrbCeny')));
```

- [ ] **Step 2 — run RED.** `node scripts/test_owa_evidence_selection.mjs`; expect missing module/function or foreign row selection failure.
- [ ] **Step 3 — implement a request-local two-pass index.** Only when OWA is in effective routed scope, retain parsed permitted OWA rows before lexical top-k truncation. First index entities/fields and resolve owners; then select entity documents, owned chunks, exact field rows, relations touching requested owners and workflow rows. Exact qualified identifier missing must not downgrade to an unrelated owner. No additional filesystem reads from `sourcePath`.
- [ ] **Step 4 — implement row-to-unit formatting.** Format relational rows as complete mini tables containing source/target IDs, predicate, cardinality, relationType, joinCondition and status. Format fields with fieldName/mssqlColumn/keyRole/mappingStatus. Split Markdown at headings; tables may be represented as header + one complete requested row per unit. Always preserve qualifiers and unknown markers adjacent to a selected fact. Full entity description/content outranks summary when available.

```js
const columns = ['sourceEntityRefId','targetEntityRefId','predicate',
  'cardinality','relationType','joinCondition','status'];
const cells = columns.map(key => String(row.fields[key] || '').replaceAll('|','\\|'));
const text = '| '+columns.join(' | ')+' |\n| '+columns.map(()=>'---').join(' | ')
  +' |\n| '+cells.join(' | ')+' |';
```

- [ ] **Step 5 — integrate candidate selection before scanner caps.** Attach owner/facet metadata privately; filter namespace before parsing/indexing. Do not globally raise scores for all rows containing `OWA`. Preserve source bytes/hash and original record locators. Reuse OWA rows for complete same-owner selection; retain generic scanner behavior for other KBs.
- [ ] **Step 6 — verify.** Run selection/context/routing tests and `node scripts/test_answer_body_fields.mjs`, `node scripts/test_erp_knowledge_retrieval.mjs`. Add plural/declined Polish names, alias ambiguity, reversed relation ends, malformed CSV, and unresolvable reference controls. Unknown reference must not grant access to another owner's content.

## Task 3: Present local-source content without invented URLs

**Files:**
- Create `scripts/lib/local_source_provenance.mjs`, `scripts/test_owa_local_sources.mjs`.
- Modify `scripts/erp_knowledge_answer.mjs:322-445,533-570`.

**Interfaces:**
- Produces `describeLocalSource(row: ParsedRow): {kind:'local_artifact',recordId:string,artifact:string,locator:string,contentHash:string,owningPath:string|null,sourceUrl:null}|null`.
- Existing `sources`/`extracts` remain arrays; add `kind`, `artifact`, `locator`, `contentHash` for local sources. Existing external source date/URL fields keep their meanings.
- Task 2 selected units are budgeted using existing limits, with no unconditional second preview.

- [ ] **Step 1 — write failing provenance and rendering tests.** Use a fixture ROOT, blocked network/processes and a valid row with no URL. A hostile owner path must never trigger an actual read; reject unsafe artifact identities. Test exact 4000 versus 4001 chars, two sources, three units, and absence of a truncated duplicate preview.

```js
const row = {namespace:'OWAOntology',artifact:'exports/owa_ontology/v1/chunk.csv',
  contentHash:'sha256:'+'a'.repeat(64),line:85,endLine:102,
  fields:{id:'LOCAL_1',sourcePath:'downloads/knowledge_inbox/fixture.md'}};
const source = describeLocalSource(row);
assert.equal(source.kind, 'local_artifact');
assert.equal(source.sourceUrl, null);
assert.equal(source.locator, 'L85-L102');
assert.equal(describeLocalSource({...row,artifact:'../secret'}), null);
assert.equal(describeLocalSource({...row,namespace:'NotAllowedFixture'}), null);
```

- [ ] **Step 2 — run RED.** `node scripts/test_owa_local_sources.mjs`; current URL-only assembly must fail.
- [ ] **Step 3 — implement pure local provenance.** Accept only the five explicitly configured OWA artifact paths under `exports/owa_ontology/v1/`, namespace OWAOntology, positive integer line ranges, a nonempty record ID, and an actual `sha256:<64 hex>` fingerprint supplied by scanner. Owner path is optional display metadata: preserve only normalized relative paths within the known inbox roots; never open it. Group chunks only by explicit sourceDocumentRefId plus validated consistent owner path, not same URL/topic; use artifact+record as fallback identity.
- [ ] **Step 4 — integrate local and external descriptions explicitly.** Select `kind` based on validated input. Keep URL path's exact owner/version resolver unchanged. Local-source metadata reports publication/update/retrieval as unknown unless an already-parsed field explicitly supports it; never infer source publication from promotedAt, filesystem time or test date.

```js
if (source.kind === 'local_artifact') {
  lines.push(`  Źródło lokalne: ${source.artifact}, ${source.locator}`);
  lines.push(`  Rekord: ${source.recordId}; hash: ${source.contentHash}`);
  if (source.owningPath) lines.push(`  Dokument właścicielski: ${source.owningPath}`);
} else {
  lines.push(`  URL: ${source.sourceUrl}`);
}
```

- [ ] **Step 5 — enforce budget on actual emitted units.** Prioritize requested facets, keep complete conditional paragraphs/table rows, include unknown/conflict units before generic metadata. If a source/unit is omitted, expose omission reason and missing facet. Suppress old preview for both validated local-source and URL-source substantive hits; keep unrelated technical/no-source legacy compatibility.
- [ ] **Step 6 — run compatibility.** `node scripts/test_owa_local_sources.mjs`, `node scripts/test_answer_source_citations.mjs`, `node scripts/test_answer_extracts.mjs`, `node scripts/test_answer_body_fields.mjs`. Existing external version/cache/security expectations must pass unchanged.

## Task 4: Evidence-backed answer coverage, unknowns and ambiguity

**Files:**
- Modify `scripts/lib/owa_evidence.mjs`, `scripts/erp_knowledge_answer.mjs:449-527`.
- Create `scripts/test_owa_answer_coverage.mjs`.
- Modify `scripts/lib/erp_knowledge_mcp_core.mjs:583-607` only for additive coverage exposure if used.

**Interfaces:**
- Produces `assessOwaCoverage(context: Context, selection: Selection, visibleUnits: Array<{text:string,facet:string}>): Coverage`.
- Add `answer.owaCoverage` for OWA answers, and source-backed `answer.answerNotes: string[]` or equivalent documented additive field. Do not add a verified knowledge status.

- [ ] **Step 1 — write failing tests.** Include an explicitly unknown enum with a real field owner, a nonexistent qualified identifier, a question without document type and with several status axes, and a full short source without requested mapping. A truncated retrieval result alone must not prove mapping is absent. All negative controls use synthetic IDs unlike the benchmark.

```js
const coverage = assessOwaCoverage(parseOwaQuestion('OWAOntology.DoesNotExist'),
  {ownerIds:[],candidates:[],requestedIdentityMissing:true,ambiguities:[]}, []);
assert.equal(coverage.status, 'unknown');
assert(coverage.reasons.includes('requested_identity_not_found'));
assert(coverage.notices.some(text => text.includes('lokalnych')));
```

- [ ] **Step 2 — run RED.** `node scripts/test_owa_answer_coverage.mjs`; expect missing specific unknown/ambiguity behavior.
- [ ] **Step 3 — implement coverage assessment.** Compute missing facets from selected and actually emitted units; source unknown markers remain specific notices. For unmatched exact identity, return local no-evidence and do not present an alternate owner as the answer. For equal candidate owners, identify alternatives and request clarification. For unspecified document status, explain independent axes or ask which is intended, without asserting one universal state.
- [ ] **Step 4 — integrate response semantics.** Add notes tied to selected evidence, not new domain claims. Render notices before evidence. Unknown/ambiguous/missing facets yield existing `insufficient_evidence` with additive reason codes. Assess exact document codes/table names using visible extracts as well as retained technical snippets. A qualified source label such as historical CONFIRMED remains a source statement; generic freshness warning stays.

```js
const visibleText = normalizeText([
  ...presentation.extracts.map(unit => unit.text),
  ...topEvidence.flatMap(item => item.hits.map(hit => hit.snippet || '')),
].join('\n'));
```

Do not use this exact unrestricted union if it includes snippets deliberately suppressed from public output: build the union from the same publicEvidence/renderer selection to avoid hidden evidence influencing coverage.

- [ ] **Step 5 — MCP integration test.** Exercise actual `handleJsonRpcRequest` for each Semantic tool in fixture ROOT. Check correlation ID, warnings, validity/as_of, namespace and source caps; `knowledge_status=unknown` on insufficient cases. Public arguments cannot alter internal intent or grant namespaces.
- [ ] **Step 6 — verify paraphrases.** Vary syntax and synthetic IDs; require all specific negative controls to pass with zero network/learning/draft output. Run new coverage tests plus existing retrieval/release/blended suites.

## Task 5: Frozen twelve-question offline acceptance and regression gate

**Files:**
- Create `scripts/test_owa_answer_quality_12q.mjs`.
- Create `scripts/prepare_owa_answer_quality_fixtures.mjs`.
- Create `docs/reference/OWA_Answer_Quality_Offline_2026-10-15.{json,md}` when executed.

**Interfaces:**
- Runner CLI: `node scripts/test_owa_answer_quality_12q.mjs --bundle <absolute-existing-dir> --output-parent /tmp/opencode`.
- Bundle contains an immutable frozen copy of the baseline JSON, routing, listed five OWA CSVs, required allowed Business Semantics artifacts and MCP module dependency closure. Manifest records source path, bytes and SHA-256; metadata cannot be read outside fixture ROOT.
- Runner output records twelve exact requests/responses plus provisional facet checks; authoritative score is a separate manual review using baseline criteria.

- [ ] **Step 1 — write runner guard test before implementation.** Missing explicit bundle and malformed manifest refuse before any module dispatch. Guard blocks fetch/http/https/net/tls, external processes, writes except its private output and runtime reads outside copied fixture ROOT/module closure. Include guard self-tests on synthetic targets.
- [ ] **Step 2 — build immutable fixture preparation.** Read only allowlisted static files and five OWA CSVs, calculate fingerprints, copy into a new private temporary directory, verify copies. Do not source `.env`, data, credentials or cookie files; no production export/build.
- [ ] **Step 3 — dispatch exact frozen probes.** Each question's tool/query and expected fields are read from the unchanged baseline. Use actual profile permissions and actual domain handler; `as_of` and limit remain fixed. Save full returned Markdown plus safe structured response, not just snippets. Include tool request hash and source manifest hash.

```js
const request = {jsonrpc:'2.0',id:q.id,method:'tools/call',params:{
  name:q.tool,arguments:{query:q.query,as_of:'2026-10-15',limit:5,
    correlation_id:`owa-quality-candidate-${q.id}`}}};
const response = await handleJsonRpcRequest(request, {
  profile:getMcpProfile('erp-semantic-mcp'),
  allowedNamespaces:new Set(['OWAOntology','ComarchOptimaBusinessSemantics']),
  writeAllowed:false,
});
assert(!response.error);
assert(!response.result?.isError);
```

- [ ] **Step 4 — manual score.** Read all twelve returned bodies and their attributed full units. Compare to baseline expected facts; do not count question echo as answer evidence. Review negative controls for actual abstention/clarification. Preserve any remaining failure honestly; return to the responsible task rather than modifying questions, corpora or criteria.
- [ ] **Step 5 — full isolated gate.** Run `npm run check`, module-map validator, all new OWA suites, and existing body fields/source citations/extracts/release intent/retrieval/blended/answer-focus/MCP-profiles suites. Inspect the last two test scripts before execution to ensure reports/network are disabled or fixture-scoped. Explicit `node --check` for new scripts not covered by npm check.
- [ ] **Step 6 — preserve evidence and review.** Record changed file list and exact hashes, freeze compatible passing candidate diff, preserve source corpus fingerprints and baseline question hash. Review scope/security/source fidelity and test failures inline; request a separate reviewer only if delegated execution was selected. No automatic commits.

## Task 6: Controlled SemanticKB deployment and unchanged live retest

**Files:**
- Integrate only reviewed runtime/test source files produced by Tasks 1–5.
- Create `docs/reference/OWA_Answer_Quality_Deployment_2026-10-15.{json,md}` and `docs/reference/OWA_SemanticKB_12Q_After_2026-10-15.{json,md}`.
- Durable evidence: `backups/manual-repairs/owa-answer-quality-20261015/`.

**Interfaces:**
- Semantic service: verify current `erp-semantic-mcp.service` metadata before relying on historical port 3420.
- Existing import chain: bridge → MCP core → answer/assistant → retrieval. Shared source files may affect other services on their future reload; record this explicitly.
- Post-deploy test uses connected SemanticKB tools, not only direct function imports or localhost mocks.

- [ ] **Step 1 — preflight without secrets.** Confirm main base/destination hashes and user changes, supported dashboard GET state, active jobs, exact Semantic PID/entrypoint and health. Never display systemd Environment or `.env` contents. If destination drift exists, reconcile it rather than overwrite. Save baseline fingerprints of raw/promoted/registry/CSV and policies using protected operational tooling, without dumping content into public reports.

```bash
systemctl show erp-semantic-mcp.service -p ActiveState -p SubState -p MainPID -p ExecMainStartTimestamp -p ExecMainStatus
curl -fsS --max-time 20 http://127.0.0.1:3420/health
```

- [ ] **Step 2 — durable backup and integration.** Create the private backup only after verifying its existing parent directory. Store original affected files, reviewed hashes, patch and append-only operation notes. Verify restoration bytes offline. Transfer through `apply_patch` after conflict check; verify main bytes match candidate and `mcpbot` can read all new dependencies. Preserve unrelated reports/baseline files.
- [ ] **Step 3 — validate integrated source.** Run main syntax checks and fixture-isolated focused tests; do not execute production export/build. Stop on mismatch before reload. Record source hash and service start time together; a health response alone is not code version evidence.
- [ ] **Step 4 — reload only verified affected Semantic service.** Use `sudo -n systemctl restart erp-semantic-mcp.service`, then verify PID/start changed, active/running, ExecMainStatus 0 and health. Other MCP services are not reloaded by this plan. If failure occurs, restore only backed-up changed files via apply_patch and reload Semantic, preserving evidence and unrelated work.
- [ ] **Step 5 — execute the twelve connected probes.** Use exactly baseline tool/query/as_of/limit. Persist complete visible responses and per-response hashes through a protected evidence writer; do not claim to have captured a raw HTTP envelope when only harness Markdown is available. Apply the same manual criteria; all twelve must PASS to close the quality fix.
- [ ] **Step 6 — final preservation and report.** Recheck corpus/registry/CSV fingerprints and supported automation policy state; note any natural timer-generated report drift rather than rewriting it. Verify scope of running services and remaining process-cache versions. Record before/after table, residual gaps, exact source/response evidence and rollback path. Finish with `git status --short`; do not commit or push without a new explicit instruction.

## Plan self-review

- Spec coverage: routing/identity → Task 1; entity/relation/facet ranking → Task 2; local provenance and budgets → Task 3; unknown/ambiguity and visible-content assessment → Task 4; unchanged acceptance/paraphrases/compatibility → Task 5; real deployment/readback/durable evidence → Task 6.
- All new interfaces are defined above and produced before their consumers. New helpers are pure; only the existing artifact reader and explicit fixture/deployment tooling access files.
- No full-source read is inferred from top-k. No unsupported absence, enum, API behavior, owner equivalence or verification claim is introduced.
- Existing failing baseline and questions are retained; no source-data refresh or synthetic URL is a route to benchmark success.
- Implementation requires an execution choice: inline or delegated, then the corresponding execution skill.
