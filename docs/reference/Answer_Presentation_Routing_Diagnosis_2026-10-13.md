# Answer presentation and release routing — read-only diagnosis

**Confirmed: Q07 and Q16 lose available body evidence at CSV-to-snippet conversion; Q10 loses the release intent before evidence gathering.** Full source URLs are also discarded as structured fields. Fixing routing alone will not fix presentation. Increasing the 280-character limit alone will not fix field selection, stem-only anchors, source attribution or publication dates.

Task: `Answer_Presentation_Routing_Diagnosis_2026-10-13`; repository `/docker/openspg`; branch `main`; base commit `79e376d241322b2debbffb900a68bcf67ae78004`. This is a **proposal, with no implementation**. Original QA remains **0 PASS / 13 PARTIAL / 3 MISS**; no benchmark was changed or rescored.

## Evidence and execution boundary

- **POTWIERDZONE:** Read the retrieval working set from `docs/module-map.json:58–86`, root instructions and `scripts/AGENTS.md`; inspected the relevant operational-memory context, routing, MCP core/profile, exports, correction pack, QA report and retained raw responses.
- Durable QA: `/docker/openspg/backups/manual-repairs/source-correction-20261013/qa-16q/`. Recomputed **all 16 raw response SHA-256 hashes and byte counts** against `Post_Correction_16Q_2026-10-13.json`. Recomputed the supplemental `qa-evidence-manifest.json` hash: `d83bd0e1b94db5b11f1ae3ca99953603da0e7338b4f57caf91b7d7b1f8719f0b`. This verifies these QA files and manifest binding, not the unrelated historical backup core.
- Reproduced the **exact original Q07, Q10, Q16 questions** through `handleJsonRpcRequest`, `tools/call`, original domain tools and unmodified profile namespace sets. Arguments: `as_of=2026-10-13`, `limit=5`, diagnosis correlation IDs; `writeAllowed=false`.
- New isolated ROOT: `/tmp/opencode/answer-presentation-routing-20261013`. Only production `exports` and `docs/reference` are linked. No `downloads`, `data` or secrets linkage. Possible learning logs remain in temporary ROOT. Provider disabled, auto-draft disabled, live-learning processor disabled; pure preflight predicts **no fallback** for all three. Fetch guard observed **zero network attempts**. No external/editorial tool was invoked.
- Execution UTC: **2026-10-13T19:48:51.624Z–19:48:54.700Z** for primary reproductions. **Answer text and every returned hit match durable QA exactly**. Full JSON bytes intentionally differ because observation timestamps and correlation IDs differ.
- One extra actual-handler control used the **same Q10 query** with `optima_docs.search`; its answer equals `optima_release.search`. A separate pure diagnostic changed only the selected route to the existing, permitted Community route. Neither control replaces a primary answer or changes QA scores.
- Runner: `/tmp/opencode/answer-presentation-diagnose.mjs`. Trace with fields, offsets, exact requests, hashes, scores and diagnostic controls: temporary ROOT `analysis.json`. Full new responses: `Q07-response.json`, `Q10-response.json`, `Q16-response.json`; control: `Q10-domain-identity-control.json`. Preserve these temporary files before cleanup; durable original QA remains available.

## Actual call chain and loss boundaries

All line references describe this checkout at inspection time.

| Boundary | Actual implementation | Finding |
|---|---|---|
| Domain MCP request → scoped call | `scripts/lib/erp_knowledge_mcp_core.mjs:546–583`, `handleJsonRpcRequest` | Checks visible tool and namespace context. Non-live domain names converge on `answerQuestionTool(query, allowedNss)` at line 583. Tool identity and `limit` are not forwarded. |
| Scoped call → answer/render | core `answerQuestionTool:309–315` | Calls `answerQuestion(question, allowedNamespaces)` and `renderAnswerMarkdown(answer)`. |
| Query → profile-filtered route | `scripts/erp_knowledge_answer.mjs:317–325`; `scripts/erp_knowledge_assistant.mjs:631–643,653–802` | Classification sees query text and namespaces, not the requested release tool. `buildResponse:804–851` supplies only artifacts from selected routes. |
| Route → files | answer `gatherEvidence:162–196`, especially 164–172 | Scans primary/support artifacts only; allowed KB does not imply searched KB. Each artifact supplies up to `max(3, focusHints.length)` rows. |
| CSV → text/score/window | `scripts/lib/knowledge_retrieval.mjs:18–79`; answer `scanArtifact:98–151`, `scoreLine:70–96` | Parser correctly handles quoted multiline records and physical locators, but drops headers at parser line 78. Scanner joins **all cells** at line 119; title/ID/URL/path/body share one text. |
| Score → snippet anchor | answer `124–131`; retrieval `MAX_SNIPPET_LENGTH:4` | Score accepts five-character stems for terms of length ≥8; `matchedTerms` and snippet focus accept **exact terms only**. First focus in question order is used, with 60 preceding characters and a 280-character budget. No body-aware field preference. |
| Hits → answer evidence | answer `179–190,198–243`; retrieval `selectEvidence:81–97` | Hits expose only line/endLine/score/snippet/matchedTerms. Artifact-level evidence exposes hash/URI/locator/observedAt/excerpt, but no record source URL or publication metadata. Up to five artifacts; each retains its selected rows. |
| Evidence → text/citations | answer `renderAnswerMarkdown:246–303`, especially 278–285 | Local rendering prints artifact and snippet. **There is no local structured-source citation formatter in this path.** URL appearance depends on accidental inclusion in the snippet. |
| Render → domain payload | core `583–606`, `toolResultPayload:455–460` | Wrapper preserves rendered text and evidence, adds domain/validity/warnings/correlation. It does not recover omitted CSV source fields. `as_of` is a warning context, not effective-date filtering. |

External citation helpers do exist: `scripts/lib/external_search.mjs:421–423`, `buildExternalCitationBlock`, calls `scripts/lib/external_search_policy.mjs:171–178`, `buildExternalCitationLine`. Answer line 348 uses these **only for external fallback**. They are not a hidden local citation formatter and were not exercised by these reproductions.

## Single-cause traces for the three MISS cases

### Q07 — correct CIT rows, metadata window instead of rate conditions

**POTWIERDZONE:** `legal_source.search`, profile `legal-compliance-mcp`, sole namespace `TaxbellLegalReference`. Corrected chunks are selected from `exports/taxbell_legal_reference/v1/chunk.csv:L11979–L11986` and `L11987–L11991`, both score **19**.

On both joined records, first exact query term is `informacje`, index **527**, inside **`sourceDocumentRefId`**. Window offset is **467**. `content` starts at **905**. The output window ends before the body: it exposes the canonical reference ID, full CIT URL and part of `sourcePath`. The scanner has already read the whole record; the rate conditions are not absent from the input.

Chunk 2 `content` at physical line **11989** explicitly supplies 19%, conditional 9% for non-capital income, current-year revenue versus prior VAT-inclusive small-taxpayer sales, startup/exclusions/non-12-month proportionality and separate bank/SKOK rules. `description` is only its 240-character introductory truncation. Chunk 1 body line **11981** supplies publication **15 December 2025** and update **24 June 2026**.

**Immediate cause:** field-blind focus in `scanArtifact:119,124–131` chooses metadata, then discards the useful body before `gatherEvidence` and renderer. Route, CSV parsing and corrected-row selection succeeded. This confirms body masking for Q07, not merely a hypothesis about snippet length.

### Q16 — stem-only positive score, no exact anchor, fallback to record start

**POTWIERDZONE:** exact query remains `Czy podziękowanie autora wątku Betterfly78292 potwierdza przyczynę i skuteczną naprawę błęduKSeF?`. `optima_docs.search`, Product profile, Community primary and OptimaReference support; no Betterfly namespace expansion.

Selected corrected Community chunk: `exports/community_news/v1/chunk.csv:L2819–L2820`, score **5**, **`matchedTerms=[]`**, no focus, offset **0**. All five points come from stems: `podziekowanie→podzi`, `betterfly78292→bette`, `potwierdza→potwi`, `przyczyne→przyc`, `bleduksef→bledu`. `naprawe` is too short for stem fallback; `skuteczna` has no matching stem. The concatenated product/thread and error/KSeF words are not split into useful exact identifiers.

The joined record body begins at **642**, beyond the 280-character window. Its **437-character `content`**, physical line 2820, states: thanks at **23 March 10:02**; no identified cause or retry result; suggestion cannot be labelled a confirmed fix; no proof of current behavior. The rendered snippet ends in the reference ID before even reaching the URL.

**Immediate cause:** scoring/window inconsistency (`scoreLine:77–81` versus `scanArtifact:124–127`) selects a stem-only hit but supplies no anchor; field-blind default offset 0 exposes metadata. A body-aware default is required even when no exact term exists. Merely selecting the correct projection is insufficient. Splitting embedded identifiers is a possible later search improvement, **not necessary to repair this already-selected row**.

### Q10 — tool intent erased before classification; Community never scanned

**POTWIERDZONE:** `optima_release.search`, Product profile permits `ComarchOptimaReference` **and** `ComarchCommunityNews` (`scripts/lib/erp_knowledge_mcp_profiles.mjs:29–33`). Actual route is OptimaReference only, no support. Official route score **3** is solely the explicit Comarch/Optima boost (`assistant:705–727`); Community score **0**.

Exact question uses “ogłoszono dostępność”, dated comments and thread 77465. It contains none of the bounded `hasNewsContext` terms in `assistant:656–670`; neither release-tool identity nor thread/version identity creates an intent constraint. Community route keywords at `ERP_Knowledge_Assistant_Routing.json:102–117` do not match that phrasing. Official support excludes Community (`205–223`) and other support namespaces are filtered out by Product scope. `gatherEvidence` therefore never visits Community artifacts.

Same-query actual handler `optima_docs.search` and `optima_release.search` outputs are equal, confirming that the tool description's release semantics do not reach retrieval (`core:583`). Pure diagnostic inclusion of the existing Community route, with the **same original question and allowed set**, selects release chunks **2826–2829 score 22**, **2821–2825 score 17**, **2830–2831 score 17**. These contain the January announcement/comments and no-deployment-proof boundary. This control proves the missing-candidate boundary; it does not prove a complete corrected answer. Two counterfactual snippets still center on metadata, so routing alone remains insufficient.

**Immediate cause:** non-live domain tool dispatch loses explicit release intent before `answerQuestion` → classification → artifact groups. This is not a namespace permission failure, missing export or low release-row score. The later irrelevant schema-routing names originate from permitted Reference entry guides/global audit, not unauthorized reads of the Schema namespace.

## URLs, source fields and date semantics

**POTWIERDZONE:** full original URLs exist in named CSV `sourceUrl` cells but are not carried as hit/source objects. Example: Q02 actual `chunk.csv:L11968–L11975` includes full `https://g.infor.pl/p/_files/39075000/zmiany-w-podatkach-2026-39075452.pdf`; snippet ends `https://g.infor.pl/p/_files/39075000/zmiany-w-podat...`. Neither hit `sourceUrl` nor evidence `sources` exists. Q02 target document `L1443–L1455` also has the full URL, outside its returned window. Thus there is **no downstream full-URL truncation formatter**: scanner clipping plus missing structured attribution is the loss boundary. `knowledge://legacy/...` identifies a local artifact; it is not the original publication URL.

Field contract in actual exports:

- Community and Taxbell chunks: `id,name,description,semanticType,sourceDocumentRefId,sourceUrl,sourcePath,sectionHeading,sectionOrder,content`. Use **`content`** as substantive body. Community description is boilerplate; Taxbell description is a shortened preview. Never assume description is complete when content exists.
- Community documents: `...publishedAt,lastModified,localSnapshotPath,sourceOrigin,summary`. Use **`summary`** before boilerplate description, but promoted summary is capped at 420 characters (`scripts/export_comarch_community_news.mjs:355`). Retrieve eligible sibling chunks for missing conditions.
- Taxbell documents: `...publishedAt,lastModified,retrievedAt,localSnapshotPath,contentHash,summary`. Promoted description/summary capped at 600/1400; full chunks retain content (`scripts/export_taxbell_reference.mjs:162,176,179–190`). Canonical reuse may leave an old document row, while corrected chunks reference it; prefer the actual chunk's owning `sourcePath` for correction metadata.
- Business Semantics uses **`description`** as full substantive text. A single hard-coded `content` rule would regress it. The existing `test_optima_business_semantics_promoted.mjs:91–109` maps header names to fields and asserts full description fidelity; this test was inspected, not run because it invokes an exporter.

**Date boundary confirmed:** promoted Community `publishedAt` and `lastModified` are both `draft.promotedAt`, not source dates (`export_comarch_community_news:337–355`). Release document `L239–L243` contains `2026-10-13T11:52:11.414Z` in both fields, but its owning promoted JSON metadata explicitly supplies `sourcePublicationDate=2026-01-29T13:51`, `sourceUpdatedAt=2026-02-10T13:38`, timezone unspecified. Betterfly document `L237–L238` likewise has promotion `2026-10-13T11:52:07.950Z` in both fields. Promoted Taxbell documents set publication/update **blank** and put promotion in `retrievedAt` (`export_taxbell_reference:171–175`); chunks have no publication columns.

Consequently a renderer patch that blindly relabels `publishedAt` as “source published” would introduce a factual regression. Actual corrected metadata is already in the same-namespace promoted JSON under `docs/reference/knowledge_inbox/promoted/...`; a bounded read-only resolver can use that metadata without re-export/build, while reporting unresolved dates as unknown. Ordinary document dates must carry their documented basis, not be inferred from ID, filename, `observedAt` or `as_of`.

## Why working tests pass

Existing tests passed unchanged: answer-focus; retrieval **34/34**; blended-routes **11/11**. They verify real properties, but do not assert these answer-quality boundaries:

1. `test_erp_knowledge_retrieval.mjs:154–180`: long prefixes contain neutral `x` and the body contains an **exact** query term; scanner correctly reaches it. No earlier meaningful metadata term competes with body conditions.
2. `122–147`: small multiline `description` fits the window; verifies parser/locators, not content-field preference. `182–208` tests artifact hashes/URIs, not original publication URLs or date basis.
3. `396–407`: domain test uses only a schema tool and a schema query. It does not compare the same Product query across docs/release tool semantics.
4. `test_erp_knowledge_answer_focus.mjs:13–17,20–55` validates table-name focus and artifact provenance. `test_erp_knowledge_blended_routes.mjs:67–105,111–137` validates scoping and support, not explicit release intent.
5. `buildPragmaticAnswer:200–206` requires only known document codes or SQL/entity focus hints. The three natural-language questions have neither; **`missingTerms=[]` is expected even for MISS**, not evidence that their facts were covered.

No function named `getSourceFields` was found in the inspected checkout's scripts/src or relevant documentation. Named-column mapping in the export-fidelity test is a working comparison, **not an existing body-aware getter in the actual MCP path**. A proposed `getSourceFields` must be identified as new code, not claimed to have been bypassed at runtime. The old community browser test (`run_community_thread_test.mjs:81–84,156–168`) calls PASS for expected route plus any evidence and writes production reports; it was inspected only and is not a functional-answer gold standard.

## Minimal patch proposal — not implemented

Four existing runtime files suffice for a bounded retrieval/presentation fix; no new LLM, schema change, build or broader permission scope is needed. Source metadata gaps must remain explicit.

| Proposed surface | Minimal change and invariants |
|---|---|
| `scripts/lib/knowledge_retrieval.mjs`, `parseCsvRecords:18–79` | Add header/columns to return value without changing records, quoted CSV handling, line/endLine, malformed-CSV fail-closed behavior. Existing callers tolerate additive fields. Add a named-field/body policy helper (new `getSourceFields`, not existing). Prefer content → summary → substantive description, entity-aware; non-body technical fields retain compatibility. |
| `scripts/erp_knowledge_answer.mjs`, `scoreLine/scanArtifact:70–151` | Separate body, title/identity and provenance. Keep identity for candidate relevance, never let URL/ref ID/path choose the answer window. Preserve match contributions including stem positions so a positive score cannot silently mean an unanchored metadata-only snippet. Build whole sentence/paragraph/section excerpts from body; body start is fallback for stem-only matches. Add selected-body field and body-relative locator/offset. Preserve artifact hashes and physical locators. |
| answer `gatherEvidence:162–196`, `buildPragmaticAnswer/renderAnswerMarkdown:198–303` | Carry record-level `id`, `sourceDocumentRefId`, title, complete `sourceUrl`, date fields/basis/precision, owning source path and provenance into structured `sources`; map each excerpt to a source key. Bound same-source sibling expansion **inside selected allowed namespace** (e.g. 3 sections/source, 2 principal sources, ≤4000 substantive characters); select by body relevance, retain conditions and negative/outcome caveats. Deduplicate substantive content and separate document/source metadata from answer text. Use cited, attributed extractive prose and explicit unanswered facets, not a raw cell dump or newly asserted current-law conclusion. Citations outside snippet budgets; every link remains complete. |
| answer, proposed read-only source metadata helper | Resolve promoted metadata from validated owning `sourcePath`/`localSnapshotPath` only under ROOT `docs/reference/knowledge_inbox/promoted/<allowed namespace>/`, verify namespace and URL consistency, constrain realpath and refuse path escape; do not follow arbitrary CSV paths into downloads/data/secrets. Prefer `metadata.sourcePublicationDate` / `sourceUpdatedAt`; keep sourceRetrievedAt, createdAt, promotedAt, observedAt distinct. For reused canonical references, do not substitute canonical metadata for the corrected owning chunk. If unresolved, emit null plus reason. No production source writes or automatic date guessing. |
| `scripts/lib/erp_knowledge_mcp_core.mjs`, `answerQuestionTool:309–315`, dispatch `583–606` | Forward an internal server-selected intent option for `optima_release.search` through answerQuestionTool to answerQuestion. Keep query unchanged, wrapper validity/warnings unchanged; emit sources additively in structuredContent. Tool name alone must not grant access. |
| `scripts/erp_knowledge_assistant.mjs`, `classifyQuestion:653–802`, `buildResponse:804–851` | Apply explicit release intent **after namespace filtering**: choose/include existing Community release route, retain permitted official support. Keep allowed set unchanged; no Community if excluded, no fallback to disallowed namespace. Fail closed or expose no permitted release evidence when constrained out. No new public intent override granting scope; generic docs behavior remains intact. |

The table has two rows for the same answer module; runtime file count is four. Budgets above are proposed starting constraints to test, not measured optimal values. Default 280 can remain a legacy/preview limit; increasing it globally is neither necessary nor sufficient. Extractive selection must not cut away “not confirmed” clauses while retaining preceding suggestions, nor mix one thread's patch outcome with another thread's thanks. When source facets exceed the bounded answer, explicitly state what was not supplied.

**Expected behavior examples (proposal, not regenerated QA answers):** Q07 presents conditional rates and two limits with CIT citation; Q10 attributes January multi-key reports and says the retained source does not confirm patch deployment; Q16 presents the source's explicit no-cause/no-retry statement, not an invented diagnosis. These expectations follow the retained source content; they do not certify actual product operation or current law.

## Meaningful regression plan

Use failing-before/passing-after tests in an isolated checkout/ROOT; no deployed-service calls or production reports. Separate stages so a route improvement cannot conceal presentation regressions.

| Test | Acceptance |
|---|---|
| R1: exact Q07 handler on frozen production CSV snapshot | Corrected chunks actually returned; answer, excluding question echo, contains 19/conditional 9/non-capital/two different limits and separate bank/SKOK caveat; dates 2025-12-15/2026-06-24 and full MF URL attributable. Body-field/locator tie checked. No current-law certification. |
| R2: metadata-anchor CSV control | Put same term earlier in long id/title/ref/url/path and later in substantive content; expected excerpt contains requested body condition, not the metadata hit. Reorder columns and verify semantic equivalence. Test content/summary/description policies separately. |
| R3: exact Q16 handler, stem-only control | Original unsplit query preserved. Selected 437-character body returns 23 March thanks, absence of cause/retry and no confirmed fix; complete Betterfly78292 URL, March source date basis. A stem-only selected row with `matchedTerms=[]` still produces body evidence or explicit insufficient-body status. No unrelated Optima patch as Betterfly outcome. |
| R4: exact Q10 release handler and tool control | Original query preserved; release intent survives to permitted Community candidate group. Actual release successor rows returned, publication Jan29 13:51/update Feb10 13:38, timezone unspecified; Jan29–30 comments attributed, patch unconfirmed. Generic docs control shows the intent difference at routing, not just the tool label. |
| R5: route-only and presentation-only controls | Route-only includes corrected Q10 but may still fail completeness; body-only cannot find Q10 while Community unselected. Combined change must fix both boundaries. Assertions distinguish retrieval coverage and answer facts. |
| R6: source URL/data contract | Long URL containing commas/query/percent encoding preserved byte-exact as source object and complete rendered link; bibliography URL not sliced. Multiple hits have per-row attribution. Artifact hash/locator remains stable. |
| R7: publication semantics | Promotion date must never become source publication/update. Blank Taxbell dates stay unknown unless owning metadata resolves. Test month-only December2025, unspecified Community timezone, missing update date, canonical reuse, URL/namespace mismatch and path escape. Metadata from disallowed KB never leaks. |
| R8: bounded completeness and negative guards | Multi-section questions retain conditions/table rows when within budget; explicit omissions if beyond it. Q15 historical indicators do not become 2026 rates; UC127 empty status/deadline does not prove enactment; Q09/Q16 thanks does not prove fix. Complete citation lines remain outside body budget. |
| R9: unchanged technical/scoping tests | Existing 34 retrieval, focus and 11 blended-route checks; table/doc-code bounded matching, multiline CSV, invalid CSV, empty allowed Set, unrelated namespace exclusion, stable hash/URI/locator. Release with Community excluded must not cross scope. |
| R10: all16 frozen source-fidelity QA | Re-run the real domain handler against frozen exports and permitted metadata inputs. Preserve original questions/criteria and compare returned facts/citations, not fixture backfill or ID-only success. Report exact-source coverage separately. Any gold amendment needs a separate version and reason. Zero network/provider/draft/production-learning writes. |

Capture export/input hashes before/after, network attempts, full JSON-RPC requests/responses, owning metadata hashes, per-facet omissions, and answer-versus-question-echo assertions. The reproduced `analysis.json` binds used CSV input hashes via actual artifact `contentHash`; this is local-artifact evidence, not live graph parity. Do not run the browser community benchmark or ordinary report-writing testpack against production to satisfy these tests.

## Source QA / Q02 PIP correctness

**POTWIERDZONE:** Q02 asks about **PIP**, not PIT; this is a valid topic request. Retained reviewed PDF extraction `priority-bf920a10-full-extraction.txt:L2073–L2106` explicitly places “Nowe uprawnienia Państwowej Inspekcji Pracy” on PDF page 57 under the PIT chapter; footnote 27 says project at RCL opinion stage as of 3 December 2025. Pages 58–59 continue it (`L2108–L2183`). Thus PIP and project-not-enacted-law expectations are supported; do not silently replace PIP with PIT or weaken PASS to bibliography-only.

**Qualification:** the subsection continues onto page **60**, through its final paragraph and author (`L2185–L2197`), before the next topic. Gold “PIP 57–59” is a supported **covered range**, but incomplete if interpreted as the entire subsection's exclusive range. Any future requirement for the complete subsection should be versioned explicitly to 57–60 with retained PDF evidence; this diagnosis leaves the original gold and scores unchanged. No invalidity of the original question is established. Reviewed extraction hash is bound by correction-pack metadata `d575a935ce8b9c85fa04156e65fdffd343d225a3de87b1e694e5d93e9cd93b92`; report verification checks that local extraction against that binding.

**WNIOSEK:** strict PASS criteria require citation dates, some of which the CSV contract does not preserve correctly. That is a legitimate product/source-attribution gap, not a reason to award PASS from unreturned pack data. Full numerical statutory CIT limits or detailed bank rates, if later requested, exceed this corrected summary's detail; additional evidence would be necessary. No reclassification of the other 13 PARTIAL cases as having one proven cause is claimed: shared scanner/citation defects explain risks, but the three MISS traces are the individually reproduced cases.

## Validation and limitations

- `npm run check`: PASS; syntax validation only. `python3 scripts/validate-module-map.py`: PASS, four modules.
- `npm run test:answer-focus`: PASS; `npm run test:retrieval`: **34 PASS / 0 FAIL**; `npm run test:blended-routes`: **11 PASS**, zero external calls. Read test side effects before execution: fixture tests write/remove temporary roots and mock external results; blended test is pure routing. No production test report is written by these commands.
- Diagnosis runner: PASS, **16 durable raw hashes/bytes**, manifest hash, three exact-question actual-handler reproductions, text/hit parity, zero fallback predicted and zero fetch attempts.
- Final separate report/evidence validator: `/tmp/opencode/verify-answer-presentation-diagnosis.mjs`; checks report JSON, raw hashes/bytes/request identity/text-hit parity, CIT/Betterfly loss offsets, release-route diagnostic, exact PDF extraction binding and source gold boundary. `git diff --check` checks tracked differences; a separate whitespace check covers the new untracked reports.
- No code/config/runtime/export/build/status edit, service action, authentication secret read, commit, source mutation or live graph call was performed. Existing unrelated working-tree changes were preserved. Only the two named diagnosis reports were created in the repository; reproduction/verification code and evidence are temporary. This is an invoked-operation boundary, not an audit of concurrent automation.
- **NIEUSTALONE:** current law, effective dates, project enactment, patch deployment, current Betterfly behavior, running-service corpus/config parity and graph/vector behavior. Production downloads/source registries are intentionally omitted from isolated ROOT, matching the original QA boundary. Complete current-law certification is not provided.

## Machine-readable handoff

The companion JSON contains precise findings, file/function/line boundaries, reproduction evidence and proposed tests. `codex-delegation` was inspected; this is a direct task, so no external delegation or agent was spawned. `systematic-debugging` governed investigation; `verification-before-completion` governs the final evidence checks.

```yaml
task_id: Answer_Presentation_Routing_Diagnosis_2026-10-13
agent: OpenCode
host: current linux host
repository: /docker/openspg
base_branch: main
base_commit: 79e376d241322b2debbffb900a68bcf67ae78004
result_commit: uncommitted
changed_files:
  - docs/reference/Answer_Presentation_Routing_Diagnosis_2026-10-13.md
  - docs/reference/Answer_Presentation_Routing_Diagnosis_2026-10-13.json
skills_used: [codex-delegation, systematic-debugging, verification-before-completion]
commands_run:
  - git status --short; git branch --show-current; git rev-parse HEAD
  - npm run check
  - python3 scripts/validate-module-map.py
  - node /tmp/opencode/answer-presentation-diagnose.mjs
  - npm run test:answer-focus
  - npm run test:retrieval
  - npm run test:blended-routes
  - node /tmp/opencode/verify-answer-presentation-diagnosis.mjs
  - git diff --check
validation:
  passed: [syntax, module_map, existing_focus_retrieval_blended_tests, retained_QA_hashes, exact_handler_reproductions, report_evidence_validation]
  failed: []
  not_run: [live_MCP, external_sources, graph_vector_QA, proposed_patch_regressions]
confirmed_findings: [Q07_metadata_anchor_body_loss, Q16_stem_score_no_anchor_body_loss, Q10_release_intent_loss, local_structured_citations_absent, promoted_date_semantics]
inferences: [shared_presentation_defects_likely_affect_PARTIAL_cases]
hypotheses: [proposed_extract_budgets_require_regression_tuning]
risks: [blind_publishedAt_citation_would_misdate_promoted_sources, local_channel_not_live_parity]
approval_required: []
recommended_next_action: implement_only_the_bounded_four_file_proposal_in_an_isolated_checkout_then_run_R1_to_R10_without_modifying_original_gold
```
