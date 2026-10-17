# Sequential32 PASS; operational acceptance conditional

## Current independently reviewed state

- Deployment: completed on reviewed V1. Evaluation/reporting: **COMPLETE WITH OPEN FINDINGS**.
- Spec: PASS for the controlled sequential procedure. Operational quality: **CONDITIONAL ACCEPTANCE**.
- Final sequential32: **12 PASS /0 PARTIAL /0 MISS +20 PASS /0 PARTIAL /0 MISS**. Independent unseen10: **2 PASS /5 PARTIAL /3 MISS**, with no per-case grade disagreements.
- **ImportantI1 remains OPEN:** CPU-bound central responsiveness loss, overlapping health failure and concurrent socket failure. Exact socket closer remains uncertain. Concurrent/throughput readiness is **NOT APPROVED**; no general-accuracy or concurrency-fixed claim. M4 remains open.
- Only evaluator retrievals were serialized. Evaluator-issued health probes occurred between completed cases/banks; this does not establish an idle or monitoring-free host. Archived service metadata records a health oneshot overlapping N10; effects on latency and content are UNKNOWN and no score is attributed to load.
- The recorded health oneshot07:34:49–07:35:07 UTC overlaps N10's07:34:54.954–07:35:09.743 UTC. This is not evidence of a retry or a cause for the MISS. The snapshot does not establish who triggered it or semantic-endpoint contact.

Current recovery narrative: `/docker/openspg/backups/manual-repairs/semantic-intent-subject-20261016/v1-deployment-20261017T063200Z/sequential-attempt-20261017T071900Z/final-review-report-revision-20261017T080328288Z/RECOVERY.md`. Old recovery documents and blocker/unexecuted-bank wording remain labelled historical evidence. No rollback or performance change was performed or authorized by this revision.

Independent byte-exact reviews: `/docker/openspg/backups/manual-repairs/semantic-intent-subject-20261016/v1-deployment-20261017T063200Z/sequential-attempt-20261017T071900Z/final-review-report-revision-20261017T080328288Z/independent-reviews/task-5-review.md` (SHA-256`b53ac630a403b5e10600727373746de568da4b465325e7c3c7383bd0b922b504`) and `/docker/openspg/backups/manual-repairs/semantic-intent-subject-20261016/v1-deployment-20261017T063200Z/sequential-attempt-20261017T071900Z/final-review-report-revision-20261017T080328288Z/independent-reviews/holdout10-independent-review.md` (SHA-256`93a126993fda96f0b639c0b4dc68bd11743d9cb5d5814a16f9d2dc60b5469e02`). The operational review's original pending-holdout handoff is historical; the peer review now supplies its independent2/5/3 verdict.


**Original12 12/0/0 +original20 20/0/0 (PASS/PARTIAL/MISS).** New complete authorized attempt on unchangedV1;32 successful actual connected calls, one attempt/case, one evaluator retrieval in flight. No directHTTP answer substitution.

Start2026-10-17T07:20:45.382Z; completed2026-10-17T07:28:57.353Z, MAX actual case end. Sum of call durations281433ms; median7322ms; max16454ms. These observations are not throughput capacity.

Fresh manual reading covered all32 actual full replies against unchanged criteria, including unknown dictionaries, tentative keys, FK/logical relations, comparisons, absent identities, ambiguity and historical-source qualifications. Independent visible-source audits bind exact CSV IDs/physical locators/hashes; max2 sources/3 units/3911 local extract characters. No factual credit from hidden JSON, flags, confidence or body equality.

| Case | Grade | Visible manual basis |
| --- | --- | --- |
| Q01 | PASS | Visible contractor overview supplies Knt_KntId and independent supplier/recipient flags, with partial verification in entity extract and historical-source limitations. |
| Q02 | PASS | Visible item identifiers give Twr_TwrId/Twr_Kod; owned table and rules give separate CDN.TwrCeny and multiple price numbers. Sources/UNKNOWN qualifications stay visible. |
| Q03 | PASS | Magazyny source gives Mag_MagId PK, Mag_Symbol UNIQUE and Mag_NieAktywny; source historical verified label is not presented as fresh inspection. |
| Q04 | PASS | This actual connected reply supplies supplier receipt/PZ, purchase invoice/FZ workflow and PZ stock increase; WRITE/Workflow NOT CALLED and explicit no-execution warning remain. Prior transport MISS remains a separate attempt. |
| Q05 | PASS | WZ source explicitly reduces stock, links FS and full-realization workflow, and distinguishes documentation from current execution. |
| Q06 | PASS | Complete contractor relation table shows TraNag→Kontrahent N:1 with TrN_PodID=Knt_KntId and contractor→contact1:N via KntO_KntId; historical qualification retained. |
| Q07 | PASS | Visible workflow tables include DokNagEtapy, DokNagEtapyHistoria and DokNagProcesEtapy, mandatory DnE_Obowiazkowy and type-specific definitions. Partial verification and no-execution statement retained. |
| Q08 | PASS | Visible Towar table gives group N:1 LOGICAL_JOIN, price1:N FK, full joins/CASCADE and source attribution without current runtime proof. |
| Q09 | PASS | Exact attribute-test entity, definition, literal CDN.DefAtrybuty, partial status and explicit absence of full displayed field mapping; no missing detail invented. |
| Q10 | PASS | Actual answer requests document type/state axis rather than choosing a universal value. M4 unrequested workflow diagnostic persists but does not replace clarification. |
| Q11 | PASS | Source-owned Knt_Rodzaj UNKNOWN and open problem are explicit; no confirmed complete numeric enum invented. |
| Q12 | PASS | Exact fictional process is unsupported in searched local sources; no substituted workflow or ERP-wide nonexistence claim. |
| H01 | PASS | Cena definition distinguishes multiple TwC_TwCNumer prices within TwrCeny; visible UNIQUE(TwC_TwrID,TwC_TwCNumer) prevents repeated variant without a new item card. |
| H02 | PASS | TwC_TwCID, N:1 TwC_TwrID→Twr_TwrId/CASCADE and deletion consequence are visible; partial verification and unverified MSSQL columns are preserved. |
| H03 | PASS | All four composite-key members, TwJ_JmZ and TwJ_PrzeliczM/TwJ_PrzeliczL with converter meanings occur in owned visible units; no single identity invented. |
| H04 | PASS | Visible unit→item N:1 composite relation explicitly lacks formal FK; no application guarantee or freshly confirmed key added. |
| H05 | PASS | Visible payment-bank-event definition contrasts with document-generated receivable/payable settlement rules; N:M settlement relationship and both owners' limitations/citations remain. |
| H06 | PASS | Actual table/rules give direction1/-1/0 and amount>0/settled>=0 with source; no actual balance read or invented. |
| H07 | PASS | Four visible amount rows distinguish BZd_Kwota/BZd_KwotaRoz and their Sys equivalents with correct meanings; no fake balance. |
| H08 | PASS | KsR_KsRId is visibly tentative/to establish; PK/full columns/FK uncertainty stays explicit rather than promoted by endpoint provenance. |
| H09 | PASS | Compensation description says no money flow; rules require at least two opposite-sign settlements; no execution asserted. |
| H10 | PASS | Visible table gives header→elements1:N and header→decree1:1 through KPN_DekID; no element FK column invented, schema gaps retained. |
| H11 | PASS | FSKOR is separate and does not modify original FS; price/discount/quantity changes and plus/minus appear with NOT CALLED qualifiers. |
| H12 | PASS | Both sources distinguish purchase create_purchase_correction/no dedicated correct workflow from sales correct_invoice, with separate document types and WRITE NOT CALLED. |
| H13 | PASS | PZKOR separately corrects original PZ, supplier return/PZ minus/opposite stock movement; no write/workflow execution claimed. |
| H14 | PASS | MM source decreases source/increases destination, preserves company total, requires both warehouses and excludes external contractor; no execution claimed. |
| H15 | PASS | Two owner-specific sources contrast MM internal relocation/no total change with PZKOR supplier return and opposite PZ movement; no ownership mixing. |
| H16 | PASS | RKUR automatic-calculation description and UNKNOWN automatic-versus-manual problem are both visible; no fresh resolution asserted. |
| H17 | PASS | TwC_Typ UNKNOWN enum is named and sourced; no numeric net/gross/margin/markup code map guessed. |
| H18 | PASS | Visible TwJ_TypJm UNKNOWN enum and open problem reject a confirmed full dictionary; tinyint is not treated as code semantics. |
| H19 | PASS | Asks for document type, state axis and intended operation instead of equating closing with payment/compensation/posting or claiming execution. |
| H20 | PASS | Exact fictional identity remains unsupported in searched local sources without replacement compensation or universal nonexistence claim. |

The earlier first attempt remains11/0/1+20/0/0, including Q04 transportMISS; the subsequent unscored public Q04 does not replace that score. **Performance limitation remains:** one diagnostic Q04 used about15s CPU; the earlier concurrent burst caused a socket failure and an overlapping health probe starved/failed. The exact closing component is uncertain. Sequential passing does not repair concurrent capacity or establish throughput readiness.

Full actual harness strings and safeJSON: `/docker/openspg/backups/manual-repairs/semantic-intent-subject-20261016/v1-deployment-20261017T063200Z/sequential-attempt-20261017T071900Z/live32`. These are not connected rawHTTP envelopes. Dates15/16, limit5 and original bank hashes remain unchanged.

Report-locator erratum: N10 visible evidence range is L18–L55 (the captured file has63 lines), replacing the clerical L18–L70 reference. Scores, criteria, responses and sources are unchanged; the sealed original review remains history. See `/docker/openspg/backups/manual-repairs/semantic-intent-subject-20261016/v1-deployment-20261017T063200Z/sequential-attempt-20261017T071900Z/report-locator-erratum/erratum.json`.
