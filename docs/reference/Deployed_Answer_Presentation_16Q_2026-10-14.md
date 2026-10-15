# Deployed answer presentation — live sixteen-question verification

**DONE — 16 manual PASS / 0 PARTIAL / 0 MISS.** Exactly sixteen primary connected domain MCP read calls succeeded, once per original question. The previous live score was **0 PASS / 13 PARTIAL / 3 MISS**. This is source-fidelity verification against unchanged criteria, not certification of current law or current product behavior.

## Actual channel and request identity

- Connected tools: AccountingTaxKB (3), LegalComplianceKB (2), PayrollHrKB (8), OptimaProductKB (3). The configured public HTTPS endpoints are `https://optima.kag.taxbell.pl/mcp/{accounting-tax-mcp,legal-compliance-mcp,payroll-hr-mcp,optima-product-mcp}`.
- Original queries and tools: `Post_Correction_16Q_2026-10-13.json#questions,execution.actualToolMapping`. Every request retained `as_of=2026-10-13`, `limit=5` and a unique `Deployed_Answer_16Q_2026-10-14-Qnn` correlation ID. No rewrite, refinement, repeat or local answer-handler substitution.
- Canonical criteria/questions SHA-256: `66fea24365072f6490799b2c8db16efe7bb74b5c0af63a6e5df0d8d5e1448f7c` (UTF-8 `JSON.stringify({criteria,questions})`). The original declared freeze hash remains a distinct historical identifier; it was not replaced.
- Actual harness call window: **2026-10-14T12:55:37.019Z–12:59:54.215Z**. Individual client start/end bounds and durations are retained in the evidence index. These are harness observations, not invented server execution timestamps.
- A subsequent public health check returned HTTP **200**, `ssl_verify_result=0`. All primary calls succeeded through the connected tools after the TLS renewal and deployment; no TLS bypass or transport fallback was used. The tools expose complete Markdown text, not HTTP headers or a raw JSON-RPC envelope.
- All sixteen responses explicitly report **local KB artifacts, without executing KAG/OpenSPG graph retrieval**. Connected HTTPS transport is live; the declared retrieval backend is local artifacts.

Deployment authority was read from `Answer_Presentation_Deployment_2026-10-14.md`: integration into `/docker/openspg`, eight new service PIDs, reload at 12:45:46–12:45:59 UTC. That earlier service readback is deployment evidence, not a fresh PID audit in this QA task. The final private candidate report and `final16facts.json` were read as historical comparison only; no facts or grades were copied into absent live response content.

## Independent manual review

Facts below are present in each particular returned response, excluding the question echo. Full verbatim rendered facts, all literal URLs and complete citation/date-basis blocks are in `evidence-index.json`. Principal citation URLs/dates were checked against the deployed source-owner metadata, not inferred from correction-pack, promotion or test dates.

| ID | Before → deployed | Actual returned facts and scope |
|---|---|---|
| Q01 | PARTIAL → PASS | INFOR, Paweł Huczko, 9 April 2026; OFF outage without number versus DI other evidence/offline24/unavailability, later DI-to-number; consultation and brochure contexts kept separate rather than unconditional current rule. |
| Q02 | PARTIAL → PASS | MDDP/INFOR bibliography, I/2025, December 2025, ISBN, 130 PDF pages; JPK CIT 48–49, PIP 57–59, KSeF 86–88; February file modification not edition; some proposals await enactment. Accepted PIP range unchanged, with continuation on 60 not required to replace it. |
| Q03 | PARTIAL → PASS | 24 June 2025 MRPiPS preparation: GUS art. 9 reporting to monitoring body, planned free CIOP-PIB job-evaluation tool/manual; explicit no proof of later availability or present implementation. |
| Q04 | PARTIAL → PASS | 9 February 2025 article; 14 holidays including 24 December; all twelve monthly pairs: 21/168, 20/160, 21/168, 21/168, 20/160, 20/160, 23/184, 20/160, 22/176, 23/184, 18/144, 20/160; source total 249/1992; projects not evidence of enactment or later implementation. |
| Q05 | PARTIAL → PASS | Principal corrected MF catalog: spec 5.6.0; JPK_VAT(3) not JPK_V7M(3)/JPK_V7K(3); publication 15 December 2025/update 16 September 2026; labels/descriptions of five sections only, no PDF/XSD/ZIP content or service test. |
| Q06 | PARTIAL → PASS | MF publication 19 December/update 29 December 2025; monthly CRWDE 14090 and quarterly 14089; application from 1 February 2026; OFF/BFK/DI described with explicit limits, attachments/repository not read and no current-obligation certification. |
| Q07 | MISS → PASS | General 19%, conditional 9% for noncapital income; current-year revenue versus prior-year VAT-inclusive small-taxpayer sales; start-up, exclusions and non-12-month proportionality; separate bank/SKOK rules. Principal citation dates 15 December 2025/24 June 2026. No unconditional 9% claim. |
| Q08 | PARTIAL → PASS | Published 3 June 2026; historical 5 June 23:00–6 June 03:00, unspecified timezone; Płatnik downloads/ePłatnik verification/e-ZLA cancellation; physician mZUS must already be installed and linked to eZUS; no current outage, measured availability or completion claim. |
| Q09 | PARTIAL → PASS | 21 March 2026 question, 22 March 19:26 community reply, 23 March thanks/update; production/demo token consistency and previously granted permissions as participant suggestions; neither diagnosed cause nor successful retry established. |
| Q10 | MISS → PASS | Routes to Community plus OptimaReference; release published 29 January 2026 13:51/update 10 February 13:38, timezone unspecified; dated 29–30 January multikey reports/workarounds for differing configurations; explicit no proof of deployed patch. August draft date is not release date. |
| Q11 | PARTIAL → PASS | 21 October 2025 announcement for January 2026; activity/cooperation/childcare suspension/commissions/services/agency/cooperatives listed; employment still documented by work certificate; no later form IDs, availability or all-employer schedule certification. |
| Q12 | PARTIAL → PASS | UC127 first publication 25 November 2025 16:49/version 2.0 dated 25 May 2026 09:49, timezone unspecified; proposed ≥100 every three years/≥250 annually; joint assessment ≥5%, unjustified and unremedied six months; blank status and deadline do not establish enactment. |
| Q13 | PARTIAL → PASS | ZUS publication 7 June 2023; account 114.40%/subaccount 109.20%, balances recorded 31 January 2022, statement as at 31 December 2022; 2026 draft date does not change source year or establish 2026 indicators. |
| Q14 | PARTIAL → PASS | ZUS 1 July 2026; paying employer paper/email/HR-system/scan versus ZUS PUE/eZUS/e-delivery and specified signatures; nonpaying employer forwarding; seven days from receipt when ZUS pays; >20/≤20 and post-insurance exception. No universal ordinary-email rule. |
| Q15 | PARTIAL → PASS | Explicit rejection of historical indicators as established 2026 values; 2023 publication, both 2022 reference dates and full original ZUS URL; no invented current indicators. |
| Q16 | MISS → PASS | 23 March 2026 thanks did not disclose cause or retry result; explicit refusal to mark suggestion as confirmed repair; full Betterfly thread URL, dated question/reply/update and unspecified timezone. |

**All sixteen preserve source-attributed historical, proposed or conditional scope. No requested historical/proposed/suggestion content was elevated into a verified current-law/product claim.** Manual grades remain reviewer judgments, separate from successful transport and the server's unverified-evidence warning.

Regex/provisional grading was **not executed in this live task**. The candidate's prior 10 PASS / 6 PARTIAL / 0 MISS remains explicitly historical and is not a live regex score. No patterns or golden criteria were changed.

## Evidence and verification

Safe evidence directory: `/tmp/opencode/deployed-answer16q-20261014` (0700; evidence files 0600).

- `Q01-response.md` through `Q16-response.md`: exact complete harness-visible text, **138,601 UTF-8 bytes** in total, extracted from the current session's read-only tool records. No transcription, newline normalization, candidate response substitution, HTTP headers or auth values.
- `evidence-index.json`: full actual requests, connected tool names, individual time bounds, response hashes/bytes, backend statements, verbatim rendered facts excluding echoes, literal URLs and citation blocks. SHA-256 **`c2b006cb330c879ffa4a935308cf8664bcfc6f9495f1e3901cc70c84e7dbc2e5`**.
- `provenance-index.json`: per-call physical CSV locators, exact corrected rendered IDs, source-owner metadata hashes, actual principal URL/publication/update/retrieved values, date basis, corpus hashes and observed source/unit/character bounds. SHA-256 **`33d4166ac8c4665b99b4c978079acce754231635c2a3f000cb0001acb1fb4213`**.
- Fresh checks: **16 exact request/tool/date identities**, **16 unique correlations**, **16 full-response SHA-256/byte/mode checks**, **16 principal citation URL/date-owner checks**, **91 physical locator and returned-text checks**, **16 observed bounds checks**. Expected corrected rendered provenance occurs in every question, **21 distinct expected projection IDs**. This is rendered coverage, not the prior candidate's hidden retrieval-hit coverage of 36/36.
- Observed bounds: two cited sources per response, at most three sections per source, at most 4000 extract-text characters. Formatting, citations, registry snippets and omission lists are outside that extract budget. Q07 is exactly 4000; the first checker counted the terminal renderer LF and reported 4001. Read-only diagnosis confirmed the formatting boundary; excluding that LF corrected the checker measurement, not the response or runtime.
- `npm run check` passed before calls. `parseCsvRecords` was used only for offline physical-locator/record validation, never to answer a question. No local handler, external source-search or editorial tool was invoked.
- Final report/evidence validation at **13:50:12.625 UTC** checked all sixteen report rows against actual requests, hashes, principal dates and bounds; **42 reviewer proof strings** occur in the corresponding returned facts, and **20 deployed artifact hashes** remained equal to the provenance index. Module-map validation passed (four modules); report-path diff whitespace check passed.

Companion JSON binds every manual row to its actual response hash and evidence/provenance index row. Temporary evidence must be preserved before `/tmp` cleanup.

## Accepted live-state differences and genuine gaps

The live corpus was not replaced by the private frozen candidate corpus. Production can include registry snippets and additional artifacts; extra snippets are visibly present in thirteen Taxbell responses. The score improvement is an observed deployment-era result, not a corpus-controlled code-only causal estimate or byte-parity claim with the candidate. **This live-state difference is explicitly accepted and recorded.** Neither original gold nor source data was changed to obtain the score.

Remaining actual quality gaps:

- Unrelated secondary excerpts remain (e.g. holidays in Q08, declaration guidance in Q11, start-up material in Q14). Q07 includes tiny secondary headings unrelated to the requested rate conditions.
- Secondary citation dates can remain unknown with `metadata_path_rejected` or `source_date_unavailable`; they were not filled from pack or retrieval dates. Principal corrected citations are complete to the source's established precision; unknown updates remain unknown.
- Q13 exposes an older exporter/editorial boundary paragraph and discovery metadata in an INFOR 2026 secondary excerpt. Q15's secondary gov.pl excerpt is internally inconsistent about 2024/2023. The requested corrected historical ZUS facts stay separately and explicitly attributed; these secondary defects are reported rather than repaired or silently merged.
- Q02's broad topic-map tail and some secondary extracts remain truncated. The required facts are actually visible. Repeated omission notices greatly inflate Q07/Q11 responses.
- No unrelated ERP catalog/FK/schema body was observed. Q10's SQL procedure is relevant to the requested dated multikey comment; Q13's generic schema-document boilerplate is presentation noise, not ERP schema evidence.

The task invoked no production mutation, source/build/policy/service operation or commit. Ordinary read-query logging was permitted; internal concurrent corpus/log activity was not globally audited. **Final status: DONE.**
