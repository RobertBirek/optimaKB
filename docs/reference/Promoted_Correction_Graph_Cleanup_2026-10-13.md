# Promoted correction — exact OLD40 graph cleanup, 2026-10-13

**DONE. Deleted exactly 40/40 approved old objects. Automation remains paused=true; controller-held autodraft timer remains inactive+enabled.**

## Execution

Window: **2026-10-13T16:04:08.162Z – 2026-10-13T16:11:05.576Z**, below the approved 20-minute maximum (deadline 2026-10-13T16:24:08.162Z). The controller temporarily stopped only `erp-kb-discovery-autodraft.timer`; its service remained inactive, MainPID=0. Fresh gates verified this hold, other schedules outside the execution window, no active automation/actions/runners/target builders, jobs881–892 FINISH, exact bound inputs and registry. Supported registry/four-KB locks were acquired, revalidated and released.

| Database | Deleted documents | Deleted chunks | Total deleted | OLD final | Total nodes before → after |
|---|---:|---:|---:|---:|---|
| comarchcommunitynews | 2 | 5 | **7** | 0 | 1773 → 1766 |
| taxbelllegalreference | 2 | 2 | **4** | 0 | 1338 → 1334 |
| taxbellpayrollhrreference | 7 | 7 | **14** | 0 | 1515 → 1501 |
| taxbellaccountingvatreference | 3 | 12 | **15** | 0 | 1159 → 1144 |
| **Total** | **14** | **26** | **40** | **0** | Exact deltas 7/4/14/15 |

## Transaction guards and durable checkpoints

Current explicit user consent authorizes the exact manifest; original preparation flags remain unchanged. Every transaction used database-qualified exact semantic IDs, count1, expected internal IDs, labels, complete expected-current properties including vectors, property types, degree0 and the exact captured internal-only property-referrer set. Transaction-time node locks and plain `DELETE n` were used, chunks before documents. No DETACH or broader deletion. All four compiled read-only before the first live write. Protected complete OLD40 backup and full-state JSON round-trip rehearsal passed before mutation. Consent and pre-write gates were journaled durably; per-database before/after counts, transaction hashes and idempotency keys were checkpointed atomically. No timeout, retry or compensation was needed.

## Final readback

- **OLD40 = 0** across all four databases.
- **NEW36 + canonical3 exact**, including full-state comparison to protected completion snapshot.
- **Preserve33** original full hashes, vectors and internal IDs unchanged; historical external11 retained.
- **Shared metadata/topics23 unchanged and live**; every remaining object in the scoped full snapshot unchanged.
- Database total deltas exactly **7/4/14/15**; no additional node loss observed.
- Index metadata unchanged, all relevant indexes **ONLINE**.
- Local statuses unchanged: **14 successors promoted / 14 predecessors withdrawn**; registry unchanged.
- Actual final `paused=true`; autodraft timer **inactive+enabled**, service inactive, MainPID=0. Controller alone performs final restoration.

## Integrity

- Execution scope SHA-256: `84814cd82c67a76f3b0192b2f402c701ed2b8531f65947915b3ce4b697d89d7f`
- Original graph snapshot including vectors: `15e7663b6f1048b3778250d54aa62dede2c76aa694ccb0d360a6cffd14d8bf93`
- Protected rollback archive: `ac3add0f87d36f7b684bcd5d3441f446bbe07b40a7407d249913af910f09cbc0`
- Exact OLD40 full backup: `a6de810c624c089e7d42ae241ae4b4f31f8dbce594ce249047f0c7ecc18df366`
- Fresh rehearsal: `10559933548c59a602bb05eee00c9d40f3916b871128f09679867969dd0f309c`

Protected evidence: `/tmp/opencode/protected-source-correction-20261013/graph-cleanup`. Companion JSON includes exact deleted identities/expected internal IDs/labels/full hashes, transaction hashes, preserve fingerprints, all bound checksums, public guard template, and checkpoint/snapshot/journal hashes. Public reports contain no auth tokens or vector arrays. Prior BLOCKED reports and attempts are preserved. No build repeat, lifecycle change, timer restoration, automation resume, service restart or commit was performed.
