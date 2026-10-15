# Post-correction: 16 functional answer/retrieval checks

**Result: 0 PASS / 13 PARTIAL / 3 MISS.** These are results from the **actual local MCP handler with an isolated `ROOT` and production exports**, not successful live HTTP MCP QA. Corrected source rows were retrieved for 15/16 questions, representing 13/14 corrected records; their presence did not produce complete answers.

## Channel and evidence boundary

- **POTWIERDZONE:** The connected Accounting tool failed on Q01 with `certificate has expired`. Legal, Payroll and Product profile availability tools returned the same error. No live answer was obtained. No certificate validation was bypassed.
- **POTWIERDZONE:** `http://10.10.254.42:3400/health` returned `ok=true`, legacy profile, bearer authentication. Unauthenticated `tools/list` on `/mcp/accounting-tax-mcp` returned `unauthorized`. No existing read credential was available in this session's `ERP_KB_HTTP_TOKEN`; localhost ports 3400/3424 were inaccessible. No secret/config/runtime files were opened to obtain credentials.
- **POTWIERDZONE:** The 16 scored calls used `scripts/lib/erp_knowledge_mcp_core.mjs:handleJsonRpcRequest`, `tools/call`, the real domain tools and unmodified profile namespace restrictions. The handler called the normal `answerQuestion`/rendering implementation. This was not a fixture, direct correction-payload answer, or fabricated service response.
- UTC execution: **2026-10-13T17:36:38.095Z–17:36:42.593Z**. Each row in the JSON records start/end times, actual tool/profile, exact primary question reference, `as_of=2026-10-13`, and correlation ID contract. `limit=5` is accepted by the domain schema but not forwarded to local retrieval.
- Temporary root: `/tmp/opencode/post-correction-16q-20261013`. `exports` and `docs/reference` link to `/docker/openspg` production inputs. **Downloads/source-registry inputs were not linked**, nor were `data` or `.env`. Consequently, this is not exact running-service corpus/config parity. Missing recommended source registries are an explicit channel limitation.
- Backend returned for every answer: `local_artifacts`, `graphUsed=false`, confidence meaning `heuristic_retrieval_score`. This does not exercise live KAG/vector retrieval or certify removal of old graph nodes.

## Criteria fixed before scoring

The initial JSON held all 16 exact questions, per-question expected facts and PASS/PARTIAL/MISS rules **before answer calls**. Its frozen SHA-256 was `7def8d4ce9fd6ac4eb35112c1a6c40afaa0719fbc8c23ef37ef713c422666b44`. The final JSON retains the criteria and question definitions.

1. **PASS:** An actual successor draft/projection hit plus all requested facts, attributable original URL and correct publication/update dates, proper historical/proposal/conditional boundaries, and no misleading predecessor/schema material. An excerpt may pass only if it actually supplies those facts.
2. **PARTIAL:** Relevant corrected source/useful evidence, but missing facts, citation dates, requested distinctions or negative conclusion; no material contradictory answer.
3. **MISS:** No useful answer to the requested facts, unrelated-only evidence, a material contradiction, or promotion of history/proposal/suggestion into confirmed current fact. A matching record ID alone is not an answer.
4. Count literal returned IDs separately from line-locator-resolved provenance. Do not credit IDs in the question/expected criteria, facts from unreturned CSV content, another question's answer, or the service's generic `partial` label.
5. Source publication/update dates differ from draft/promotion/retrieval/test dates. Question echoes are not source-date evidence. `as_of` adds a wrapper warning, not effective-date filtering.
6. No query rewrite replaces a primary result. **16 primary calls, zero refinements/repeats** in the scored local channel. The failed live Q01 attempt is reported separately as transport evidence.

Expected facts were reviewed against the exact approved source-fidelity pack and its metadata, with old/new IDs from `Promoted_Correction_Local_Apply_2026-10-13.json` and corrected36 semantic IDs from `Promoted_Correction_Build_Readback_2026-10-13.json`. These approved summaries are **not golden assertions of present law or product behavior**. No external law/product status was independently certified in this test.

## Results

`ID explicit / locator` reports whether a complete corrected projection ID actually appears in the answer/evidence and whether returned CSV line/endLine locators resolve to corrected rows. It is not a quality grade.

| Q | Topic | Grade | ID explicit / locator | Functional finding |
|---|---|---|---|---|
| Q01 | INFOR 9 April: OFF vs DI | PARTIAL | no / yes | Corrected INFOR row selected; snippets show CRWDE/context, not OFF/DI or later DI-to-number conditions. Original INFOR URL absent. |
| Q02 | MDDP/INFOR book | PARTIAL | yes / yes | I/2025, December 2025, editor, publisher, ISBN and 130 PDF pages visible. Requested JPK/PIP/KSeF pages and project-status explanation absent; PDF URL truncated. |
| Q03 | MRPiPS 24 June 2025 | PARTIAL | no / yes | Correct date and preparatory introduction. GUS/CIOP-PIB plans and later-availability boundary not in excerpts. |
| Q04 | INFOR 9 February 2025 | PARTIAL | no / yes | Author/date and project heading visible, but holidays and monthly table missing. The table appearing in Q08 cannot count as Q04 success. |
| Q05 | MF JPK catalog 16 September 2026 | PARTIAL | yes / yes | Both corrected chunks identified; catalog/brochure labels visible. Spec 5.6.0, VAT(3)-versus-V7 distinction, full dates and original URL missing. |
| Q06 | MF CRWDE 19 December 2025 | PARTIAL | no / yes | Publication/update dates and February application date visible. CRWDE numbers 14090/14089, full target URL and marking boundaries omitted. |
| Q07 | Conditional CIT 9% | **MISS** | no / yes | Corrected chunks selected but snippets display canonical URL/path metadata. No useful 19/9%, limits, capital-income or bank/SKOK answer. |
| Q08 | ZUS 5–6 June window | PARTIAL | no / yes | Explicit historical-not-current-outage caveat and partial services text. Hours 23:00–03:00, publication date and mZUS installation/linking conditions omitted. |
| Q09 | Betterfly 78292 suggestion | PARTIAL | no / yes | Reply attribution, March dates, beginning of environment suggestion and exact thread URL visible. Production/demo, permissions and thanks-not-fix conclusion cut off. |
| Q10 | Optima 2026.2.1 release | **MISS** | no / no | Routes to OptimaReference without Community evidence. Returns general help, 2018 version streams and schema-routing references, not January release/patch history. |
| Q11 | ZUS seniority announcement | PARTIAL | yes / yes | Corrected IDs and 21 October 2025 introduction. Periods, work certificate, later form IDs and employer schedule limits absent. |
| Q12 | UC127 version 2.0 | PARTIAL | yes / yes | Identifies a project/version 2.0. Exact card dates, reporting thresholds/cadence, joint assessment and deadline/blank-status-not-enactment answer absent. |
| Q13 | ZUS 7 June 2023 | PARTIAL | no / yes | Says July 2026 draft date does not change source year. Actual 2023 date, percentages and 2022 reference dates omitted; unrelated 2026 sources mixed in. |
| Q14 | ZUS 1 July 2026 benefit requests | PARTIAL | yes / yes | Correct source date/title. Request channels, signatures, seven-day trigger, payer distinction and email limitation absent. |
| Q15 | Negative: old indicators in 2026 | PARTIAL | no / yes | Returns account/subaccount percentages and 31 January 2022; expressly says they were not established for 2026. Missing original ZUS URL/publication date prevents PASS. |
| Q16 | Negative: thanks confirms fix | **MISS** | yes / yes | Correct chunk ID returned, but snippet is ID/title/metadata. It does not answer the thanks/cause/retry question; another excerpt concerns an Optima patch. |

### Coverage

- **Literal complete successor draft IDs: 0/16.** The exposed evidence generally uses artifact locators and often truncates record IDs or promoted paths.
- **Literal complete corrected projection IDs: 6/16 questions, 10 distinct / 36 corrected projections** — Q02, Q05, Q11, Q12, Q14, Q16. A truncated suffix is not an exact ID hit.
- **Locator-resolved corrected source hits: 15/16 questions; 13/14 corrected records; 29 distinct / 36 corrected projections.** The missing record is the Optima release successor, Q10. `parseCsvRecords` resolves only the already-returned line/endLine locators; it does not supply omitted facts to the answer or inflate the grades.
- **Exact expected original source URL visible: 2/16**, Q07 and Q09. Other answers often expose no URL or an ellipsis-truncated URL. The JSON preserves these literal returned strings rather than inventing complete citations.
- No expected predecessor draft ID was present in any complete raw response or locator-resolved returned record. This does not certify the entire corpus, unseen rows or live graph history.

## Findings and date boundaries

**POTWIERDZONE — retrieval and useful answer quality diverge.** The ordinary handler returns short CSV excerpts, often centered on matched titles/metadata. A correct selected row can lose the OFF/DI conditions, CIT rate conditions, benefit-request channels, or Betterfly outcome boundary. The 280-character snippet limit and term-centered excerpt generation are visible in the implementation. **WNIOSEK:** This is a plausible explanation for many omissions, not proof of every failure's single cause.

**POTWIERDZONE — the Product domain tool does not force community/release selection.** Q10's actual `optima_release.search` invocation selects ComarchOptimaReference and omits the relevant Community release successor, despite Community being permitted by that profile. No rewrite was used to repair its score.

**POTWIERDZONE — negative controls are unequal.** Q15 exposes the historical-to-2026 guard. Q16 selects the correct Betterfly chunk but does not expose the thank-you/outcome statement. Neither is a complete PASS under the predeclared citation/date criteria.

**POTWIERDZONE — source-date context is incompletely delivered.** Q02 exposes the December 2025 edition; Q03/Q04/Q06/Q11/Q14 expose useful correct publication dates. Other dates occur only in titles, unrelated sources, or the echoed query. No omitted publication date was manufactured from a draft timestamp. UC127 history appearing in Q03 was not credited to Q12.

**POTWIERDZONE — wrapper status is not answer correctness.** Every response reports `knowledge_status=partial`, `missingTerms=[]` and unverified local evidence, including Q07/Q10/Q16 graded MISS. Taxbell warnings say the evidence does not confirm effective dates for the requested date; Product warnings say legacy evidence is not claim-level proof. All validity intervals remain null.

**POTWIERDZONE — no old ERP schema catalog/FK body observed in these answers.** Q10 nevertheless contains unrelated `ComarchOptimaSchema`/MS SQL names and routing suggestions from entry guides/global audit. This is schema-reference noise, not evidence that the original 14 contaminated payloads remain. Broad no-extraneous-schema quality is not fully satisfied for Q10. JPK XML structure names in Accounting answers are relevant and were not falsely flagged as database-schema contamination.

**NIEUSTALONE:** Current law, subsequent enactment of projects, actual distribution of the planned Optima patch, current Betterfly behavior, current ZUS rates/service availability, and running-service graph/vector QA. No current legal or product behavior certification is claimed.

## Read-only execution and verification

- Pure retrieval-policy preflight for the same questions/profile namespaces predicted **zero external fallbacks**. Local scored execution additionally disabled the external provider (`EXA_PROVIDER=mcp`, empty `EXA_MCP_COMMAND`), auto-draft and live-learning processor environment flags.
- `ENABLE_LIVE_LEARNING=0` does **not** disable gap recording in this implementation; any possible learning-gap files are confined to temporary `ROOT`. No learning processor or editorial tool was run.
- No builds, graph mutations, source corrections, statuses, configuration/policy edits, service actions or commits were performed. Existing working-tree changes were preserved. No manual runtime-state files were reviewed. This statement covers invoked operations, not a universal concurrent-system audit.
- `npm run check`: PASS, syntax only. No live/unit testpack was run beyond the requested functional calls. No Docker/service startup or restart occurred.
- Fresh report verification **PASS at 2026-10-13T17:46:52.212Z**: JSON parsing, 16 exact question references, UTC times, raw response SHA-256/bytes/mode, actual tool arguments, profile labels, explicit ID counts, locator matches, original URL presence and aggregate counts. Full raw responses total **262,533 bytes**. Module-map validation and `git diff --check` also passed. Temporary evidence-root listing showed no learning-gap/fallback log files.

## Complete response evidence

All **16 full, exact JSON-RPC responses** are retained as UTF-8 files with mode `0600`:

`/tmp/opencode/post-correction-16q-20261013/Q01-response.json` through `Q16-response.json`.

Every result in `Post_Correction_16Q_2026-10-13.json` includes the exact raw path, SHA-256 and byte count. The temporary `results.json` records requests, profile/channel, expected IDs and full source metadata; `review-index.json` also records the exact locator analysis. No authorization material is in the responses. Raw evidence was not copied into production documentation; **preserve it before `/tmp` cleanup**. The two requested report files are the only repository files created by this task.

Repository: `/docker/openspg`; branch `main`; base commit `79e376d241322b2debbffb900a68bcf67ae78004`; changes uncommitted. Skills: `codex-delegation` inspected but inapplicable to this direct task; `verification-before-completion` used for final evidence checks.
