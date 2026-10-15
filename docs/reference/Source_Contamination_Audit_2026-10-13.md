# Source contamination audit, 2026-10-13

## Result

I confirmed source-integrity defects in **29 distinct draft IDs**. **14 have current promoted copies** in the supported local promoted corpus. The other confirmed cases have status **pending (13), rejected (1), or withdrawn (1)**. I retained **7 uncertain IDs**, including **3 promoted**. Counts refer to IDs, not independent incidents or factual errors.

The strongest new promoted finding is `de720ffd`: an Infor JPK/KSeF article has a body containing Optima database-schema catalog fragments. Promoted `bf920a10` explicitly claims to use the model's internal knowledge. These findings widen the August 2 Community investigation to June/July and Taxbell. They do not establish the historical server-side retrieval trace or current live-graph contents.

I made no status changes, withdrawals, corpus edits, exports, builds, network/LLM requests, service actions, policy changes, or commits. The only workspace writes for this audit are this report and its companion JSON. Temporary screening scripts and results reside under `/tmp/opencode/`.

## Scope and exact coverage

I used `listInboxDrafts()` and `loadPromotedKnowledge()` from `scripts/lib/promoted_knowledge.mjs:584-617`, iterating all **14 configured namespaces**. **12 namespaces contain records**; `ComarchUniversalKnowledge` and `InsERTGTSchema` contain none in these loaders.

| Measure | Count |
|---|---:|
| Raw drafts, all available statuses | 448 |
| Pending / promoted / rejected / withdrawn raw drafts | 113 / 303 / 19 / 13 |
| Current promoted records | 303 |
| Metadata and body-availability screens, raw plus promoted | 751 |
| Nonempty bodies screened | 684 (448 raw + 236 promoted) |
| Empty promoted bodies | 67, all OWAOntology |
| Rule hits before human classification | 236 record instances (113 raw + 123 promoted) |
| Non-OWA raw candidates manually examined in structured excerpts/bodies | 73 |
| Confirmed IDs / record instances including promoted copies | 29 / 43 |
| Uncertain IDs / record instances including promoted copies | 7 / 10 |

For every raw record, the temporary script read the JSON at the loader's `rawJsonPath`; it read the adjacent Markdown when JSON lacked `content`. The promoted loader supplies JSON content; the script checked adjacent Markdown when that content was absent. Dedicated reads inspected actual raw/promoted Markdown and JSON for findings before confirmation. I also read the temporary structured review containing full short bodies and match contexts for larger bodies. I did not treat a keyword hit as a classification.

The **67 empty promoted OWA bodies** are a separate completeness limitation, excluded from confirmed/uncertain contamination counts. Their raw Markdown contains ontology documentation, while promoted Markdown has an empty `## Content` section. Example: `draft_2026-07-15_d0a94846_konto-ksiegowe`, raw Markdown lines 9-82 versus promoted Markdown lines 1-8. I screened the available raw bodies and the empty promoted representations; I cannot claim to have screened nonexistent promoted body text. This does not justify a contamination withdrawal.

### Namespace inventory

| Namespace | Raw | Promoted | Confirmed promoted |
|---|---:|---:|---:|
| ComarchBetterflyReference | 16 | 10 | 0 |
| ComarchCommunityNews | 17 | 12 | 2 |
| ComarchOptimaAdditionalFunctions | 18 | 11 | 0 |
| ComarchOptimaBusinessSemantics | 11 | 8 | 0 |
| ComarchOptimaPartnerTechnical | 4 | 4 | 0 |
| ComarchOptimaReference | 21 | 5 | 0 |
| ComarchOptimaSchema | 8 | 7 | 0 (1 uncertain) |
| ComarchOptimaSprint | 9 | 8 | 0 (1 uncertain) |
| OWAOntology | 134 | 134 | 0; 67 empty promoted bodies |
| TaxbellAccountingVATReference | 77 | 38 | 3 |
| TaxbellLegalReference | 101 | 40 | 2 (1 uncertain) |
| TaxbellPayrollHRReference | 32 | 26 | 7 |

### Provenance cohorts and overlap

- Raw `discoveredVia`: `source_list=263`, `exa=23`, `manual_analysis=3`, `manual_analysis_mcp_mssql=63`, `owa_ontology_mcp=1`, absent `95`.
- Promoted `discoveredVia`: `source_list=133`, `exa=18`, `manual_analysis=3`, `manual_analysis_mcp_mssql=63`, `owa_ontology_mcp=1`, absent `85`.
- The `source_list` raw cohort separates into **140 discovery-candidate drafts** and **123 source-list scan drafts**; promoted: **101 discovery** and **32 scans**. All 29 confirmed cases have `discoveredVia=source_list`.
- All **303 promoted IDs overlap a raw draft**. The **236 nonempty promoted bodies equal their raw JSON bodies byte-for-byte**. The 67 empty promoted bodies differ from the raw Markdown fallback. All **14 confirmed promoted copies equal their corresponding raw bodies**; do not count them as 14 additional incidents.
- The two pending 77145 drafts share one URL and candidate ID, but have different bodies (FK output versus refusal). `eed0f4c5` and `ca8ac0e5` use www/non-www spellings of one CIT PDF and have different summaries. `6b5ac5ed` and `f944c008` point to trailing-slash variants of one JPK downloads page and contain different speculative summaries.

## Detection and classification

The offline script screened full available bodies for model refusals, search/query speculation and offers, security-block messages, navigation/shell content, retrieval references, FK/schema output, and short source bodies. It removed discovery wrappers for title-only checks. Broad rules included ordinary words such as `nie ma`, `cannot`, `403`, and `FK_`; human review eliminated their false positives.

**Confirmed** means the stored body itself establishes a source-integrity defect: unsupported model output, model-processing prose, speculative search content, a source-access failure summary, or no substantive source body. This includes source insufficiency, not only invented facts. For mixed bodies, confirmation applies to the identified contaminating span; it does not declare the remaining article false.

**Uncertain** means a plausible summary has unresolved source fidelity or mixes stated typical behavior with source facts. No external source fetch was permitted, so I did not convert these into confirmed factual contamination.

### Confirmed promoted findings (14)

Keys below identify exact full IDs and URLs in the companion JSON. Local promoted Markdown paths follow `docs/reference/knowledge_inbox/promoted/<namespace>/<id>.md`.

| Key | Namespace | Evidence in promoted Markdown | Smallest correction candidate |
|---|---|---|---|
| `de720ffd` | TaxbellAccountingVATReference | Lines 17-177: catalog of `CDN.CapitalizeFirstChar`, `DayOfWeekNo`, `KatStawkiVAT`, `VatTab7`, `VatNag`, FK/HTML schema tables. No article explanation of NrKSeF/OFF/BFK/DI. | Replace this one body after obtaining the article; inspect its derived chunks. Priority 1. |
| `bf920a10` | TaxbellLegalReference | Line 17: “na podstawie wewnętrznej wiedzy modelu”; body is a partial tax-book contents list. | Reacquire this PDF/body; do not merely delete the admission and certify the remainder. Priority 1. |
| `d1c8371c` | TaxbellPayrollHRReference | Line 17: “na podstawie własnej analizy, ponieważ podane referencje nie zawierają tej treści”. | Remove model preface only if independent comparison verifies the remaining body. Priority 1. |
| `08cfe029` | TaxbellPayrollHRReference | Line 17: cleaning explanation says it used raw text in the question rather than references; substantive article follows. | One preface sentence is the confirmed contaminating span; preserve remainder pending comparison. |
| `6b5ac5ed` | TaxbellAccountingVATReference | Lines 16-20: general portal description, “likely JPK VAT”, offer “I can pull” exact details. | Reacquire JPK source text; replace speculative summary. |
| `dcfc95c2` | TaxbellAccountingVATReference | Lines 16-19: provided highlights do not show direct links to claimed 2026 templates; directions to search portal/ePUAP instead. | Verify dated announcement and replace query-driven search guidance. |
| `93f75109` | TaxbellLegalReference | Lines 18-20: “likely covered”, “If you want, I can extract”. | Replace speculative portal summary with actual CIT text. |
| `0bdb5e10` | TaxbellPayrollHRReference | Lines 17-51: title and pension menu (`label.expand.menu`), no June 5 access-limitation notice. | Reacquire notice body. |
| `fb53cb2b` | ComarchCommunityNews | Lines 17-21: repeated title, logo, loader; no thread. | Reacquire thread 78292. |
| `f0ede681` | ComarchCommunityNews | Line 17 only: release announcement title; no release body. | Reacquire news 77465. |
| `7c66353e` | TaxbellPayrollHRReference | Line 17 only: ZUS service-length title. | Reacquire notice body. |
| `a939510d` | TaxbellPayrollHRReference | Line 17 only: legislative project title. | Reacquire project text and stage metadata. |
| `9c43b46e` | TaxbellPayrollHRReference | Line 17 only: annual ZUS valorization title. | Reacquire notice body. |
| `4ce9f131` | TaxbellPayrollHRReference | Line 17 only: benefit-application title. | Reacquire notice body. |

The schema classification for `de720ffd` rests on the **whole body/source mismatch**, catalog-format artifacts and absence of the claimed article explanation. I did not classify it solely because it mentions database objects. The original article and historical cleaner input are unavailable in this audit; the exact replacement mechanism remains unverified.

### Confirmed pending findings (13)

Local raw Markdown paths follow `downloads/knowledge_inbox/<YYYY-MM-DD>/<id>.md`.

| Key | Namespace | Evidence |
|---|---|---|
| `7b5dd1ca` | ComarchCommunityNews | Aug 2, lines 19-63: 11 FK relations across CRM/payroll/bank tables with `chunk:0_*` references under thread 77145. |
| `a3442aa7` | ComarchCommunityNews | Aug 2, JSON line 6: refusal to clean because references contain schema relationships, no web/article text. Same URL/candidate as preceding row. |
| `e107b7d2` | ComarchCommunityNews | Aug 2, line 19: title only for Betterfly thread 77295. Source insufficiency, not FK contamination. |
| `c4f79265` | TaxbellPayrollHRReference | Aug 2, lines 19-26: refusal about schema chunks, then article reconstruction from query description; explicitly not based on references. |
| `f944c008` | TaxbellAccountingVATReference | July 24, lines 18-21: navigation hub speculation; no JPK structural content in highlights. |
| `321523e3` | TaxbellAccountingVATReference | July 25, lines 18-25: “Likely sections”, highlights lack explicit 2026 details. |
| `c352d5c1` | TaxbellAccountingVATReference | Aug 6, lines 18-25: executive-regulation topics “likely covered”, generic navigation suggestions. |
| `28e5e98e` | TaxbellAccountingVATReference | Aug 9, lines 23-28: “Key topics likely covered (based on the page structure)”. |
| `2986138a` | TaxbellLegalReference | Aug 17, lines 18-22: summary says no actual explanations; model offers to locate notice/dates. Confirmed offer span; remaining claims unverified. |
| `6329565a` | TaxbellLegalReference | Sept 11, lines 18-25: summary of Incapsula/request-unsuccessful failure, says no source content can be summarized. |
| `7bff76bf` | TaxbellLegalReference | Oct 7, line 25: “If you need, I can pull out” exact limits. Confirmed model-offer span. |
| `b7dddab3` | TaxbellLegalReference | Oct 8, lines 18-23: “You searched for” and request-oriented guidance; not source article prose. |
| `5628e4f7` | TaxbellLegalReference | Oct 11, lines 21-24: “What you likely want (based on your query)” and “I can craft”. |

### Confirmed historical/non-active cases (2)

- **`67726d6a`, withdrawn, ComarchOptimaReference**: June 30 raw Markdown line 19 refuses cleaning because references contain only a copyright footer. It is not a current promoted-loader record.
- **`ba542c6a`, rejected, ComarchCommunityNews**: Aug 3 raw Markdown line 19 lists removed CDN functions and chunk references under a Betterfly certificate-error thread (77387). It is not a current promoted-loader record.

These already-inactive cases require no additional withdrawal. The loader excludes archived withdrawn copies; this audit screens their available original raw bodies and current statuses, not every historical archive version.

## Uncertain findings (7)

| Key | Status / namespace | Reason to retain uncertainty |
|---|---|---|
| `eed0f4c5` | promoted / TaxbellLegalReference | CIT 2024 PDF described as guidance; “appears”, “likely a placeholder”, and tax-year interpretation need comparison with PDF. |
| `ca8ac0e5` | pending / TaxbellLegalReference | Same PDF, different summary; “Key topics likely covered”, guidance-versus-statistical-report interpretation unresolved. |
| `beeff7f8` | promoted / ComarchOptimaSchema | Explicit Exa fallback answer combines source text and “typical ... behavior”, separates hypotheses; source fidelity unresolved. FK mention occurs in the user query, not an unrelated schema replacement. |
| `f3e18de6` | promoted / ComarchOptimaSprint | RAM-optimization summary with advice to consult GenRap release notes; might be a valid partial source summary. |
| `68799ad1` | pending / TaxbellLegalReference | ORD-OG form summary says “appears” but provides specific fields; no proof of invented content. |
| `e8dc535e` | pending / TaxbellAccountingVATReference | Plausible UPO field summary; “appears” is insufficient proof of contamination. |
| `7afd64d0` | pending / TaxbellAccountingVATReference | Mixes historical JPK(3)/2020 material and 2026 framing; version relevance needs source comparison. |

## False positives and source-path assessment

- Betterfly FAQ `87dea2a7` describes **403** as a product error with substantive configuration guidance. This is not a blocked-source capture.
- FA(3) brochure `9b53ea7c` matched `403` within its `04032026.pdf` URL. Its body contains a plausible brochure summary, not Incapsula or a request-failure page.
- `558fd729` includes “Przejdź do treści” followed by substantive BHP duties. It is not navigation-only.
- Additional-function `9b246466` documents SQL/JS and `FK_DoRBnkZapis` in context; `ff6c8d60`/`7b595a8a` contain legitimate business constraints and error strings. Ontology `d0a94846` and July 17 entity drafts deliberately document schema/relations. I did not classify these as source contamination because table/FK names appear.
- The 19 rejected records include explicit smoke-test drafts. Short diagnostics are not failed external-source extraction.
- Exa drafts such as `211928ef`, `8bbe6dfb`, `5f225097`, `7fd2a582`, and `4439c646` contain intentionally labeled query/fallback summaries. Intentional summary format and routing concerns do not by themselves prove this cleaner contamination. Their factual accuracy is outside this offline screen.

The current discovery constructor calls `cleanContent(candidate.content || candidate.snippet || '')`, then validates body availability (`dashboard_discovery.mjs:1080-1112`). Scan file, summary and authenticated-web branches call the same cleaner (`scan_dashboard_sources.mjs:256-291`); `item.summary` is accepted directly on the summary path. Scan metadata records `sourceListId`, `contentProvider`, and `scanRunId` (`scan_dashboard_sources.mjs:362-385`). Therefore `source_list` alone is not proof that one historical app/model produced a given body.

In this checkout, the cleaner is now deterministic: `content_cleaner.mjs:237-239` returns `cleanBoilerplate()`. Existing user changes also added source-body validation. The earlier [77145 investigation](Community_77145_Root_Cause_2026-10-13.md) documents historical app-backed cleaning and a KB-enabled configuration. I did not run a new extraction, inspect live configuration, or infer that existing records became clean after the code change. The discovery model metadata identifies assessment provenance, not necessarily the cleaner model. Historical input/output fidelity cannot be reconstructed from old `contentHash` values alone.

## Smallest correction scope, proposed only

1. **First investigate three promoted high-priority IDs**: `de720ffd`, `bf920a10`, `d1c8371c`. Obtain source bodies and compare them before a repair. `08cfe029` has a narrower confirmed defect: one processing-preface sentence.
2. **Review the other ten confirmed promoted IDs individually**. Reacquire seven title/shell/navigation captures (`0bdb5e10`, `fb53cb2b`, `f0ede681`, `7c66353e`, `a939510d`, `9c43b46e`, `4ce9f131`) and three speculative summaries (`6b5ac5ed`, `dcfc95c2`, `93f75109`). Keep partial valid text where independent comparison supports it.
3. Any later approved correction can target **14 IDs across four namespaces**: Community 2, Accounting VAT 3, Legal 2, Payroll HR 7. Match derived documents/chunks to these exact IDs and URLs first. Staged CSV/export deduplication may reuse source IDs; current local promotion does not prove live graph exposure. No blanket namespace withdrawal or full-stack rebuild follows from this audit.
4. For the **13 pending** cases, the smallest later action is record-specific review/replacement before publication. `7b5dd1ca`, `a3442aa7`, and `c4f79265` are the highest-priority pending model-output failures. Keep rejected/withdrawn records inactive. Do not change the seven uncertain cases solely from this screen.
5. Track **67 empty OWA promoted bodies** as a separate preservation/export completeness issue. Verify consumers before proposing restoration; do not combine it with contaminated-source withdrawal.

## Verification and limits

`npm run check` passed syntax checks at the start; `python3 scripts/validate-module-map.py` passed (4 modules). The audit used local read-only loader imports and temporary scripts, not live tests. Companion verification checks exact case IDs, source URLs, namespace/status, copy overlap, coverage counts and the inventory fingerprint against a fresh supported-loader screen.

Inventory fingerprint: `327e005ff8b3b596d5dbf984e1f59d5eb8626587ab1853bc29d3a32d93b6c478` (SHA-256 of ordered `[layer,id,path,status,bodyHash]` arrays; raw Markdown fallback included).

Confirmed counts are evidence-based findings within this local corpus, not an estimate of all contamination. A zero in the namespace table means no confirmed case from this screening. It does not certify other snapshots, exports, historical archives, or the live graph. I made no external factual verification, source refetch, or causal assertion about every cleaner invocation.
