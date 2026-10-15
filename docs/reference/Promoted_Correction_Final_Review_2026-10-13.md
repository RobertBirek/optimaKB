# Final review — promoted correction and exact40 cleanup, 2026-10-13

## Verdict

**PASS for recorded correction, conditional cleanup and preservation evidence consistency, with one Minor reporting finding. No Critical or Important execution defect was identified in the reviewed evidence.** Controller restoration is explicitly distinguished below: it is stated by the user, but is not independently established by the reviewed stage-completion artifacts.

Repository: `/docker/openspg`; branch `main`; base commit `79e376d241322b2debbffb900a68bcf67ae78004`.

This review compared existing reports, protected completion evidence, exact identities, journal events, recorded transaction payloads and file hashes offline. It made **no new live call**. Recorded graph/API/systemd results are execution evidence, not a fresh observation of the running system. No builders, tests, lifecycle operations, services or timers were rerun. No credentials or runtime files were read. Protected vector-bearing evidence was processed in memory for equality/hashing; vector values were not printed.

Evidence labels:

- **POTWIERDZONE — offline:** independently checked artifact bytes, identities, hashes or journal consistency in this review.
- **Recorded execution evidence:** prior observations and results contained in the reviewed artifacts.
- **User-attested:** current controller status supplied in the review request.
- **NIEUSTALONE:** not independently established by this review.

## Findings

### Minor M-1 — journal checksum has an unlabeled pre-seal boundary

`Promoted_Correction_Graph_Cleanup_2026-10-13.json`, `protectedEvidenceHashes` (lines 861–864), identifies `graph-cleanup/journal.jsonl` with SHA-256:

`965741ef5bd61e348d3bd10bb9f9d493a34fa76b9cf9689357e2498d0997d419`.

The current complete journal has SHA-256:

`3be8e7edb5110bc6b876c0af4e3fc5a0739fc96960823c53e2c271d3a17c8bb9`.

**POTWIERDZONE — offline:** the reported checksum matches the exact journal byte prefix before its last line. The appended line is the `FINAL_DONE_REPORT_SEALED` event at `2026-10-13T16:13:01.582Z`, matching `graph-cleanup/completion-seal.json` and the current public JSON/Markdown hashes. Transaction receipts and checkpoints agree. This is a checksum-boundary documentation issue, not evidence of a changed transaction history.

Recommendation: in future seals, identify the journal prefix by byte length/event boundary or checksum an immutable journal copy. Do not rewrite the historical report merely to make its self-referential final checksum appear current. This review changes neither artifact.

## Authority and exact deletion scope

The current user request confirms prior authorization for fourteen replacements and conditional deletion after replacement builds. `Execution_Scope` remains an immutable historical proposal with `executionAuthorized=false` and `deletionAuthorized=false`; those flags are not the later authority. Preflight and local-apply records attribute later authority to operator instructions, and the cleanup journal records explicit exact40 consent tied to the scope checksum **before** its first transaction intent.

**POTWIERDZONE — offline:**

- Current scope bytes match `84814cd82c67a76f3b0192b2f402c701ed2b8531f65947915b3ce4b697d89d7f`.
- Current fourteen-record pack bytes match `34091066998a7849249d15ade359656b83d0accbc46c315bed9a12d7f869c36a`.
- All forty `(database, full semantic ID)` tuples in cleanup `partitions[].exactDeleted` equal the scope's removal tuples, including expected internal IDs and namespace-qualified type labels.
- Removal and preserve sets are disjoint. Removal is also disjoint from all thirty-six new descendant identities. The three reused canonical documents are members of preserve33, not additional deletion targets.
- Decoding the four recorded statement payloads yielded exactly the approved per-database tuples and original full-state guards. Their Cypher hashes match receipts. Both deletion clauses operate only on the matched plan rows, chunks before documents, using plain `DELETE`; no `DETACH` or broader deletion clause appears.

| Database | Documents | Chunks | Exact deleted | Total before → after | Final old count |
|---|---:|---:|---:|---|---:|
| `comarchcommunitynews` | 2 | 5 | 7 | 1773 → 1766 | 0 |
| `taxbelllegalreference` | 2 | 2 | 4 | 1338 → 1334 | 0 |
| `taxbellpayrollhrreference` | 7 | 7 | 14 | 1515 → 1501 | 0 |
| `taxbellaccountingvatreference` | 3 | 12 | 15 | 1159 → 1144 | 0 |
| **Total** | **14** | **26** | **40** | **Exact deltas 7/4/14/15** | **0** |

The four committed journal events equal both public receipts and protected checkpoints. Four intents precede four committed readbacks; five cleanup locks have matching acquisition/release events. Prior blocked attempts have no committed receipts. The successful cleanup ran from `16:04:08.162Z` to `16:11:05.576Z`, within its recorded twenty-minute deadline.

**No outside deletion is indicated:** recorded statement payloads are exactly allowlisted, database count deltas equal deletion counts, and all 92 remaining identities in the 132-identity protected cleanup snapshot are byte-equivalent as parsed full-state objects before/after. This is not an independent whole-database before/after content census; unchanged unrelated content outside that snapshot is not proved solely by total counts.

## Fourteen local replacements and archives

**POTWIERDZONE — offline:** pack, scope, local-apply mapping, protected ledger and descendant manifest identify the same fourteen full predecessor IDs and fourteen unique successors, partitioned Community2 / Legal2 / Payroll7 / Accounting3.

For every successor, the current promoted JSON matches the approved content, title, URL and tags. Metadata matches exactly after the authorized serialization adaptation: `namespace → kbNamespace`, and `discoveredVia=source_correction_review → correctionOrigin=source_correction_review`, omitting `discoveredVia`. Full `supersedesDraftId`, source dates and source-evidence fingerprints are retained. Promoted JSON/Markdown hashes match the sealed ledger.

All 28 withdrawn JSON/Markdown files match their ledger archive hashes; all fourteen archived content hashes match the old content hashes in the approved pack. Every corresponding old promoted snapshot path is absent. The sealed registry contains **14 new promoted / 14 old withdrawn** entries. The sealed lifecycle journal has exactly fourteen submissions, raw verifications, promotions, promoted verifications, withdrawals and archive verifications. Its timeout reconciliation is consistent with nine completed archives followed by five remaining archives, without duplicate submissions/promotions.

Recorded local preservation additionally covers 896 unchanged pre-existing raw files, 323 unchanged unrelated registry entries and 112 backed-up source artifacts. Those broad current-state claims were not refreshed through runtime loaders in this review. Source-hash parity here means fidelity to the approved pack/archived snapshots and retained evidence fingerprints, not renewed source retrieval or certification of present legal validity.

## Replacement builds precede cleanup

**POTWIERDZONE — offline:** build records contain exactly jobs **881–892**, twelve unique IDs, each with recorded `status=FINISH` and `liveStatus=FINISH`. Their files/partitions agree with the Markdown job table. The thirty-nine projected-field checks each report count1, exact fields and no mismatches: **36 new descendants + 3 reused canonical references**. The descendant manifest binds these identities to the fourteen local mappings.

The build readback at `15:04:55.661261Z`, final verification at `15:05:18.200Z`, and completion seal at `15:14:48.826Z` precede cleanup's `16:06:22.009Z` consent/pre-write gate and `16:06:41.329923Z` first transaction intent. The cleanup pre-write evidence still records all forty originals present, all replacements/canonical references exact and all twelve jobs finished. Conditional deletion therefore follows the recorded replacement-build/readback gate.

Jobs881–885 were recorded as existing completed imports, not repeated. Jobs886/887 were reconciled after timeout; the journal records their FINISH-file skips and subsequent job887 manifest bookkeeping without resubmission. Job completion and graph readbacks remain **recorded execution evidence**, not fresh API/database verification by this reviewer.

## Preserve33 and guarded restoration

**POTWIERDZONE — offline:** cleanup preserve fingerprints match all thirty-three original `graph-checks.json` full-node hashes, the public preflight baseline and the exact scope identities/internal IDs. Independently recomputed full-state hashes from the protected post-cleanup snapshot match the baseline for every preserved node, including labels, property types, complete properties and vectors. All eleven historical external chunks remain within this equality check.

Preservation is **final baseline parity**, not a claim that vectors never changed during imports. Build evidence records seventeen exact-identity restoration events: 7 initial Legal, 1 resume-initial Payroll, and 2 + 1 + 6 Accounting. Each event reports immutable nonvector parity and equality of baseline, offline-recovered, actual-recovered and final full hashes. Allowed fields are limited to `_name_vector`, `_summary_vector`, `_content_vector`; recorded transactions guard full expected-current properties/types, labels and internal identity. Protected restoration evidence hashes for all 28 cited files match. Journal committed restoration counts sum to seventeen. Recorded index checks report unchanged metadata and ONLINE indexes, with zero index drops.

## Limited metadata changes

The metadata set contains **23 identities**: 14 existing objects updated, 5 newly materialized topics, and 4 unchanged objects. The five new topics are Payroll `PIP`, `URLOP`, `SKADKI` and Accounting `DEKLARACJA`, `ROZLICZENIE`; they are not deletions. The omitted Payroll `TAXBELL` topic remains present and unchanged.

**POTWIERDZONE — offline:** recorded property diffs for existing metadata equal the protected pre-build/post-cleanup property diffs. Changes are limited to `summary`, `usageCount`, route `anchorObjects`, and `_name_vector`/`_summary_vector`. The fourteen intentional aggregate-change records account for the existing semantic updates; recomputed metadata vectors were retained. All twenty-three identities have count1 afterward and are unchanged across cleanup. This establishes bounded reported metadata handling, not a metadata-wide mutation census beyond the captured identities.

## Rollback and protected evidence

**POTWIERDZONE — offline:** the original full rollback archive still matches SHA-256 `ac3add0f87d36f7b684bcd5d3441f446bbe07b40a7407d249913af910f09cbc0` and size **6,911,776 bytes**. The original73 snapshot checksum is `15e7663b6f1048b3778250d54aa62dede2c76aa694ccb0d360a6cffd14d8bf93`.

The exact OLD40 backup matches `a6de810c624c089e7d42ae241ae4b4f31f8dbce594ce249047f0c7ecc18df366`; independently recomputed hashes for all forty backed-up nodes match original full-state baselines. Cleanup rehearsal evidence matches `10559933548c59a602bb05eee00c9d40f3916b871128f09679867969dd0f309c` and records complete-vector round-trip parity plus four read-only-compiled statements. Local six sealed artifacts, four protected stage-manifest copies, metadata backup, public completion seals, cleanup snapshots and checkpoints all match their cited checksums, apart from M-1's explained journal suffix.

Preflight records archive-member verification for 153 members and DB-free reconstruction for all73 nodes, local drafts, registry and source-file inventory. Rehearsals were not rerun. **No live full rollback/index-engine restoration was rehearsed or independently verified here.** Successful guarded vector restoration is narrower than a successful full rollback of local lifecycle and deleted graph objects. The preserved rollback procedure requires the journal-proven committed subset, semantic-ID absence checks and new internal-ID mapping; blind registry replacement is not the recorded procedure.

## Automation hold and controller restoration

Recorded initial policy is `enabled=true`, `shadowOnly=true`, `publicationApproved=true`, `allowedNamespaces=[ComarchCommunityNews]`, `paused=false`. Preflight changes only pause and supported audit timestamps/actor fields. Local/build/cleanup evidence consistently retains the paused policy fingerprint. Cleanup records that the controller temporarily stopped **only** `erp-kb-discovery-autodraft.timer`, kept it enabled, and verified its service inactive with MainPID0; the cleanup completion seal still records `paused=true`, timer inactive+enabled.

**Controller-supplied final state:** the coordinating assistant subsequently resumed `paused=false` and started that same timer; original enabled/shadow/publication flags and Community namespace allowlist remain unchanged; final timer is **active+enabled**, with service `Result=success`. This state was supplied by the controller, not asserted by the human operator.

**NIEUSTALONE from the original reviewed stage artifacts:** a post-cleanup resume timestamp, supported-config readback or systemd result record binding that final restoration. No such restoration entry is present in the reviewed cleanup completion journal/seal. Restoration is a later phase and does not contradict the stage-specific paused/inactive reports. The reviewer made no new status call. A subsequent coordinator addendum, `Promoted_Correction_Completion_2026-10-13.md`, records the actual supported PATCH, timer start, API readbacks and final systemd/status check at 16:25 UTC; these are controller execution evidence rather than this reviewer's independent live observation.

## Review boundary and output

Primary inputs: `Promoted_Correction_{Preflight,Local_Apply,Build_Readback,Graph_Cleanup,Execution_Scope}_2026-10-13.md/json` and `Promoted_Correction_Pack_2026-10-13.md/json`. Protected evidence under `/tmp/opencode/protected-source-correction-20261013/` supplied sealed lifecycle/registry, original graph hashes, descendant manifest, metadata baseline, restoration evidence and cleanup statements/snapshots/journal/checkpoints/seals.

Read-only Git checks and offline JSON/hash/equality comparisons were run. One exploratory shape inspection stopped on a list/object mismatch; a subsequent inspection used the actual evidence shape. The initial all-checksum assertion exposed M-1; the subsequent check established exact pre-seal prefix parity and completed the remaining comparisons. These were evidence inspections, not reruns of repository tests or execution scripts.

Only this report was added through `apply_patch`. Existing workspace changes were retained. No commit was made.
