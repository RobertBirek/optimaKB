# Independent holdout10:2 PASS /5 PARTIAL /3 MISS; open findings retained

## Current independently reviewed state

- Deployment: completed on reviewed V1. Evaluation/reporting: **COMPLETE WITH OPEN FINDINGS**.
- Spec: PASS for the controlled sequential procedure. Operational quality: **CONDITIONAL ACCEPTANCE**.
- Final sequential32: **12 PASS /0 PARTIAL /0 MISS +20 PASS /0 PARTIAL /0 MISS**. Independent unseen10: **2 PASS /5 PARTIAL /3 MISS**, with no per-case grade disagreements.
- **ImportantI1 remains OPEN:** CPU-bound central responsiveness loss, overlapping health failure and concurrent socket failure. Exact socket closer remains uncertain. Concurrent/throughput readiness is **NOT APPROVED**; no general-accuracy or concurrency-fixed claim. M4 remains open.
- Only evaluator retrievals were serialized. Evaluator-issued health probes occurred between completed cases/banks; this does not establish an idle or monitoring-free host. Archived service metadata records a health oneshot overlapping N10; effects on latency and content are UNKNOWN and no score is attributed to load.
- The recorded health oneshot07:34:49–07:35:07 UTC overlaps N10's07:34:54.954–07:35:09.743 UTC. This is not evidence of a retry or a cause for the MISS. The snapshot does not establish who triggered it or semantic-endpoint contact.

Current recovery narrative: `/docker/openspg/backups/manual-repairs/semantic-intent-subject-20261016/v1-deployment-20261017T063200Z/sequential-attempt-20261017T071900Z/final-review-report-revision-20261017T080328288Z/RECOVERY.md`. Old recovery documents and blocker/unexecuted-bank wording remain labelled historical evidence. No rollback or performance change was performed or authorized by this revision.

Independent byte-exact reviews: `/docker/openspg/backups/manual-repairs/semantic-intent-subject-20261016/v1-deployment-20261017T063200Z/sequential-attempt-20261017T071900Z/final-review-report-revision-20261017T080328288Z/independent-reviews/task-5-review.md` (SHA-256`b53ac630a403b5e10600727373746de568da4b465325e7c3c7383bd0b922b504`) and `/docker/openspg/backups/manual-repairs/semantic-intent-subject-20261016/v1-deployment-20261017T063200Z/sequential-attempt-20261017T071900Z/final-review-report-revision-20261017T080328288Z/independent-reviews/holdout10-independent-review.md` (SHA-256`93a126993fda96f0b639c0b4dc68bd11743d9cb5d5814a16f9d2dc60b5469e02`). The operational review's original pending-holdout handoff is historical; the peer review now supplies its independent2/5/3 verdict.


**Complete one-shot, untuned evaluation, not a general accuracy claim.** Executed only after fresh sequential32 acceptance, on unchangedV1 `44af4cdf5f0c325fcf39b64ad9c7574d0253c64b`.

BankSHA `5d6d45891aa5855a2d17c3c4ddaf71ed90fca206456a2ac5fbfd6159e31f0529` remains unchanged. It was created after V0 freeze, before the generic V1 write-gate extension; original candidate/date/criteria fields and seal remain intact. Separate authorized V1 binding is preserved. Only the correlation prefix changed under the controller's current authorization; query/tool/as_of16/limit5 remained exact.

Ten actual connected calls, once each, sequential; all transport responses completed. Start2026-10-17T07:30:57.607Z; completed2026-10-17T07:35:09.743Z, MAX end. Sum147651ms, median14519ms, maximum23110ms. No retries, query rewrites, source/candidate/retrieval tuning or post-result repair.

| Case | Grade | Fresh visible-answer assessment |
| --- | --- | --- |
| N01 | PARTIAL | Visible BnkRachunki metadata identifies BRa_BRaID as IDENTITY PK and the overview mentions acronym/symbol, but neither BRa_Akronim/BRa_Symbol field mapping nor either UNIQUE assertion is displayed. F1 is useful; requested F2 is incomplete. |
| N02 | PASS | Visible EAN overview/rules supply multiple codes per item, per-item UNIQUE(TwE_TwrID,TwE_EAN), TwE_Domyslny and TwE_JM. No global EAN UNIQUE or TwrJm FK is invented. The extra ambiguity diagnostic is noise; it does not remove the requested facts. |
| N03 | PARTIAL | Visible overview gives PRA_PraId/int IDENTITY, PRA_Kod and PRA_Archiwalny; the open problem correctly locates names in PracEtaty rather than PracKod. It omits PRA_Kod uniqueness and the 0=active/1=archived interpretation, so F1/F2 are incomplete despite correct F3. |
| N04 | MISS | The actual local units describe Pracownik, not the requested fixed asset. No SrT_SrTID, SrT_KatID→Kategorie.Kat_KatID or SrT_PrcID→PRA_PraId relation is shown. External Enterprise HR/Altum/general column material cannot substitute the sealed Optima asset mapping and contains inventory-number identity descriptions. None of required F1-F3 is substantively answered. |
| N05 | MISS | The response only says PRE_TypPracownika was not found and provides no attributable source units. It does not show the explicit source UNKNOWN for both PRE_ETARodzajZatrudnienia/PRE_TypPracownika or distinguish confirmed schema from undeciphered dictionaries. The document contains those exact open problems; local retrieval ignorance cannot pass this specific-unknown item. |
| N06 | PASS | The complete visible absence relation table supplies all three N:1 roles and exact joins. CASCADE appears only on the absent employee FK; substitute is a reference without CASCADE and continuation is hierarchy supported by PNBParentId index. No index-to-formal-FK/CASCADE upgrade occurs; owned rules/source citations reinforce the distinctions. |
| N07 | PARTIAL | The full visible table distinguishes nullable datetime LPL_Zamknieta from tinyint LPL_Zaksiegowana/status0/1 and supplies month/year/date range; WRITE NOT CALLED is retained. However it does not explain the requested present-date closed condition versus flag1=posted in KH, nor clearly answer equivalence beyond listing the separate fields. Conservative PARTIAL for incomplete F1/F2 interpretation; period F3 and conditional F4 are present. |
| N08 | PARTIAL | Visible journal units give Dzi_DziId and correct period→journals CASCADE deletion direction. They omit the per-period unique symbol index Dzi_OObId+Dzi_Symbol, leaving the central local-versus-global uniqueness question unanswered. No wrong global guarantee is asserted. |
| N09 | PARTIAL | Visible currency units support inline BRa_Waluta/varchar(3), source-claimed absence of a separate dictionary, and retain probability language for API-side storage plus historical disclaimer. They omit the concrete open questions about where create_currency writes and where list_currencies obtains its list, and do not expressly display the non-FK/ISO declaration. The probable-storage caveat is credited but does not fully supply required specific unresolved backing-store account. |
| N10 | MISS | The answer treats konto as an unrecognized field of Jednostka miary and returns unit-conversion material. It supplies neither source-backed bank-account nor ledger-account interpretation and no specific choice between them. Generic insufficient-evidence text does not meet the frozen genuine-ambiguity contract. |

N07's PARTIAL is conservative: the visible table's distinct date/flag and period are credited, but the required non-null/flag1=KH interpretation is not inferred from field labels. N09's probability caveat is credited; the concrete unresolved storage questions were omitted. Full case-specific source/line references and exact frozen expectations remain in the JSON companion/manual review.

N04 selected employee material and invoked real external search, including other-product documentation; it did not supply the frozen asset PK/joins and scoresMISS. Its entire visible external block, URLs and available publication date are retained without factual substitution. The public response was not replayed over HTTP. Local-only budget audit excludes the separately rendered external block, not the captured output. Max local2 sources/3 units/3940 characters.

Before/after raw/inbox/registry/corpus/policy/code/index hashes match despite configured autoDraft1/api and N04 fallback. No draft side effect was observed; ordinary telemetry is allowed. Complete Markdown/safe tool-state/request hashes: `/docker/openspg/backups/manual-repairs/semantic-intent-subject-20261016/v1-deployment-20261017T063200Z/sequential-attempt-20261017T071900Z/holdout10`.

**Performance limitation remains:** one diagnostic Q04 used about15s CPU; the earlier concurrent burst caused a socket failure and an overlapping health probe starved/failed. The exact closing component is uncertain. Sequential passing does not repair concurrent capacity or establish throughput readiness.

This bank is now evaluated. Preserve its result; any future use for fixes makes it regression input and requires a different unseen bank. No fixes were made in this evaluation.

Report-locator erratum: N10 visible evidence range is L18–L55 (the captured file has63 lines), replacing the clerical L18–L70 reference. Scores, criteria, responses and sources are unchanged; the sealed original review remains history. See `/docker/openspg/backups/manual-repairs/semantic-intent-subject-20261016/v1-deployment-20261017T063200Z/sequential-attempt-20261017T071900Z/report-locator-erratum/erratum.json`.
