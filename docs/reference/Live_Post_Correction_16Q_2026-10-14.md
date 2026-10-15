# Live post-correction: frozen 16-question MCP rerun

**Result: 0 PASS / 13 PARTIAL / 3 MISS. All 16 connected live MCP calls succeeded; zero transport errors.** Quality is unchanged from the previous local-handler result. MISS questions remain **Q07, Q10 and Q16**.

## Execution and evidence boundary

- Actual test date: **14 October 2026**. All requests retain **`as_of=2026-10-13`, `limit=5`**, exactly `Post_Correction_16Q_2026-10-13.json#questions[].query` and the original tool mapping. One primary call per Q01–Q16, no rewrites, repeats or refinements. Correlations: `Live_Post_Correction_16Q_2026-10-14-Qnn`.
- Connected-tool coverage: Accounting **3**, Legal **2**, Payroll/HR **8**, Product **3**. Eight distinct read tools were exercised. TLS validation was not bypassed; no local answer-handler substitute was used.
- Observed UTC bounds: **2026-10-14T05:35:50.089198771Z–2026-10-14T05:38:08.865604944Z**. These bracket the sequential calls, not individual durations. Individual client/server timestamps were not exposed; precise per-call times are unknown.
- Every returned response explicitly says **“Źródło: lokalne artefakty KB; bez wykonania grafu KAG/OpenSPG.”** This is successful live **transport** QA with a service-side local-artifact retrieval backend. It does **not** exercise graph/vector retrieval.
- Tools expose complete visible **Markdown**, not JSON-RPC/`structuredContent`. Exact visible text, including truncation ellipses and locators, is retained; no hidden JSON fields were reconstructed. `knowledge_status`, validity intervals and server-side `as_of` fields are not exposed in this channel. Reviewer quality labels and observed transport success are recorded separately.

## Frozen scoring

The original criteria and expected facts were read before the first call. The original report declares frozen SHA-256 `7def8d4ce9fd6ac4eb35112c1a6c40afaa0719fbc8c23ef37ef713c422666b44`; the current canonical `{criteria, questions}` validation digest is separately recorded in the JSON, using a different declared serialization.

- **PASS:** Expected corrected successor returned literally or by proven locator, all requested facts, complete attributable original URL, correct publication/update dates, appropriate historical/project/conditional limits and no misleading/unrelated schema material.
- **PARTIAL:** Useful relevant evidence, but facts, citation dates, requested distinctions or negative conclusion incomplete; no material contradiction.
- **MISS:** No useful requested answer, unrelated-only evidence, material contradiction or historical/project/suggestion promoted into confirmed current fact. A record ID alone is not an answer.

Only the particular returned response supplies answer facts. Neither query echoes, another question's response, correction-pack bodies nor unreturned CSV content was credited. CSV lookups retained identifiers and row coordinates for provenance only. **Q02 PIP 57–59 remains accepted, with discussion continuing on 60**; no page map was returned, so this clarification changes no grade. This is source-fidelity testing, not current legal/product certification.

## Results

`Explicit / locator` counts the expected corrected projection IDs for that question, independently of quality.

| Q | Grade | Explicit / locator | Actual finding |
|---|---|---:|---|
| Q01 | PARTIAL | 0 / 3 | INFOR successor retrieved; CRWDE context visible. OFF/DI comparison, DI-to-number conditions, consultation/brochure boundary and original full citation missing. |
| Q02 | PARTIAL | 1 / 3 | I/2025, December 2025, editor/publisher/ISBN and 130 pages returned. JPK CIT/PIP/KSeF page map, projects-not-law conclusion and full PDF URL missing. |
| Q03 | PARTIAL | 0 / 2 | Correct 24 June 2025 preparatory introduction. GUS/CIOP-PIB plans, later-availability boundary and full URL omitted. |
| Q04 | PARTIAL | 0 / 3 | Author and 9 February 2025 date plus project fragment. Holidays and monthly table absent; table in Q08 cannot count here. |
| Q05 | PARTIAL | 2 / 2 | Catalog and JPK_VAT(3) labels visible. Spec 5.6.0, explicit VAT-versus-V7 distinction, publication date, inspection boundary and full URL missing. |
| Q06 | PARTIAL | 0 / 1 | 19/29 December 2025 dates and February application date visible. CRWDE numbers, OFF/BFK/DI limits and full target URL missing. |
| Q07 | **MISS** | 0 / 2 | Correct URL/locators but no useful 19/9%, capital-income, two-limit or bank/SKOK answer. Added registry evidence remains generic. |
| Q08 | PARTIAL | 0 / 2 | Historical-not-current-outage guard and partial services text. Hours, publication date, installed/linked mZUS alternative and URL absent. |
| Q09 | PARTIAL | 0 / 3 | Dated reply attribution, beginning of environment suggestion and full thread URL. Production/demo, permissions, publication date and thanks-not-fix conclusion missing. |
| Q10 | **MISS** | 0 / 0 | Selects OptimaReference only; no Community release successor. Generic help and 2018 streams do not answer January release/patch history. |
| Q11 | PARTIAL | 2 / 2 | Correct 21 October 2025 announcement introduction. Periods, work certificate, later-form/schedule boundaries and full URL absent. |
| Q12 | PARTIAL | 2 / 2 | UC127 project/version heading. Exact card dates, reporting/joint-assessment thresholds and blank-status/deadline-not-enactment conclusion missing. |
| Q13 | PARTIAL | 0 / 2 | Draft-date/source-year caveat and historical amounts. Actual 2023 date, percentages/account mapping, 2022 reference dates and original ZUS URL missing. |
| Q14 | PARTIAL | 2 / 2 | Correct 1 July 2026 introduction. Channels, signatures, seven-day receipt trigger, payer boundaries/email conditions and URL missing. |
| Q15 | PARTIAL | 0 / 2 | Historical account/subaccount rates, 31 January 2022 and explicit not-established-for-2026 guard returned. Original publication/date citation incomplete. |
| Q16 | **MISS** | 1 / 1 | Correct Betterfly chunk ID, but title/metadata excerpt does not answer thanks/cause/success. Another excerpt concerns an Optima patch. |

Publication dates and reading/draft/snapshot/test timestamps remain distinct. For example, Q03 returns UC127 card history and the ZUS 2023 source date, but these facts are not credited to Q12/Q13. Q14 returns the outage source's 3 June date, but this does not repair Q08.

## Live coverage, separately from quality

Comparable expected-successor metrics are unchanged:

- Literal complete new draft IDs: **0/16**.
- Literal expected corrected projection IDs: **6/16 questions**, **10 distinct / 36** — Q02, Q05, Q11, Q12, Q14, Q16.
- Proven expected corrected-source locators: **15/16 questions**, **13/14 corrected records**, **29 distinct / 36 projections**. Q10 misses its expected release successor. Each current expected identifier set matches the old row set after current physical CSV coordinate validation.
- Complete expected original URL returned: **2/16**, Q07 and Q09. Truncated URLs were not silently repaired. A full unrelated URL does not satisfy the target-source criterion.
- A separate **any-corrected-ID** metric, including off-topic corrected IDs: **9/16 questions, 15 distinct**. This is not comparable to the old report's expected-successor 6/10 metric and is not claimed as an improvement.
- Main namespaces: Accounting → `TaxbellAccountingVATReference`; Legal → `TaxbellLegalReference`; Payroll → `TaxbellPayrollHRReference`. Product Q09/Q16 → `ComarchCommunityNews` plus `ComarchOptimaReference`; Q10 → `ComarchOptimaReference` only.
- No unrelated ERP catalog/FK body observed. Q10 retains unrelated `ComarchOptimaSchema`/MS SQL entry-guide/global-audit reference noise. Ordinary JPK XML structure references are relevant.

## Comparison with 13 October and real findings

**Old local-handler: 0/13/3. New connected live tools: 0/13/3. No grade changed.** The old run's expired-TLS failure did not obtain live answers; this run did.

1. **Transport is recovered; functional quality is not.** All 16 connected tools now answer, but expected corrected-source retrieval still frequently yields short title/metadata excerpts rather than the asked facts and complete citations.
2. **A real live-input difference is visible:** 13 Taxbell responses include actual `downloads/.../source_registry.json` evidence, absent from the old isolated ROOT. Evidence ordering can differ. These extra registry snippets do not complete the requested answers.
3. **Product routing/date context has not visibly improved.** Q09, Q10 and Q16 Markdown exactly matches the old JSON-RPC text content after terminal-newline normalization. Q10 still omits Community release evidence; January/February source dates and planned-versus-deployed patch status remain unanswered.
4. **Negative controls remain unequal.** Q15 exposes the historical-to-2026 guard but lacks a full historical citation. Q16 returns the correct ID without the negative thanks/cause/success conclusion.
5. **The supplied date contract remains frozen.** The actual test date changed to 14 October while `as_of` stayed 13 October. The old structured wrapper dates/warnings are not exposed in the new Markdown channel; this cannot establish a backend date-filtering change. No publication date was inferred from a draft or test timestamp.

## Evidence and verification

Full visible responses, exact requests and metadata:

`/tmp/opencode/live-post-correction-16q-20261014/`

- `Q01-response.md` … `Q16-response.md`: **69,804 bytes** total, full visible connected-tool text saved with `apply_patch`, terminal LF added for storage.
- `requests.json`: all 16 exact queries/tools/arguments; SHA-256 `d706ed6bb6bcf13a1f108580605334b5e8bcdbd40d0d8d28b2abace867177e1d`.
- `metadata.json`: observed timing window, backend/provenance boundary and report linkage.
- `verify.mjs`: offline, read-only validator; does not invoke a local answer handler or network endpoint. It checks 16 identities, unique correlations, argument parity, query echoes, hashes/bytes, CSV locator identifier parity, namespace labels, URL coverage, status labels and supplemental secret patterns. Hashes bind saved visible text, not an inaccessible transport envelope.

The JSON report includes each response SHA-256/bytes, actual tool/namespace, literal observed URLs, grade reasons and date boundaries. It also records hashes of the current locator artifacts. Full expected locator IDs are verified equal to the original per-question report sets, not assumed from matching URLs.

`npm run check` passed before calls. Fresh final report verification passed at **2026-10-14T05:55:20.307Z**: 16 identities, hashes/bytes, expected locator sets, literal URLs, JSON/Markdown labels and profile/tool totals. Module-map validation also passed (4 modules). Evidence directory mode is `0700`; files are `0600`. Individual call timestamp verification remains limited to the observed common before/after bounds. No authorization material was stored. Preserve temporary evidence before `/tmp` cleanup.

**Blockers:** no transport blocker. Graph/vector QA and hidden structured metadata were not exercised/exposed. Functional omissions and Q10 routing remain. No fixes, source/status/policy/build/service/code/learning edits or commits were implemented; only these requested reports and temporary evidence files were created. Ordinary read-tool logging was allowed; concurrent runtime state was not audited.

Reports:

- `/docker/openspg/docs/reference/Live_Post_Correction_16Q_2026-10-14.md`
- `/docker/openspg/docs/reference/Live_Post_Correction_16Q_2026-10-14.json`
