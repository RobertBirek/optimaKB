# OWA content recovery execution — DONE

Executed **2026-10-15 UTC**; filename retains the approved task's 2026-10-14 date.
Repository `/docker/openspg`, branch `main`, uncommitted. Reviewed source worktree
`/tmp/opencode/openspg-owa-recovery-20261014` remains available.

## Actual completion

| Acceptance check | Verified result |
|---|---:|
| Authorized exact diagnosis IDs | 67 |
| Guarded CLI dry-runs as `mcpbot` | 67 planned, zero CLI mutation attempts |
| Sequential CLI apply | **67 recovered** |
| Promoted OWA records / empty bodies | **134 / 0** |
| Historical fields and metadata preserved | 67/67 |
| Matching raw MD full-byte content hash and MD Content body | 67/67 |
| COMMITTED journals / unique deterministic success audit events | **67 / 67** |
| Other nonempty OWA snapshots unchanged | 67 |
| Timeouts, retries, force promotions | 0 |

The companion JSON contains the complete exact67 manifest, literal source/target
paths, original and final hashes, per-record historical-field proof, full repair
provenance, COMMITTED journal hash and matching audit receipt.

## Approved extension and controlled integration

Read the updated spec/addendum, checkpoint-extension report, complete incremental
diff and `checkpoint-review.md`: **Spec APPROVED; Quality APPROVED**.
Spec SHA-256: `9e23cf585b0cb5c664e87bb254f7f6ad65e2ed46a30a2c520eaaccdb3124aa80`.
Extension diff SHA-256: `3a1d543ad2b1f171955b2da5a30e22916804a4c60fd931100a01a7c38fbd9562`.

All six exact pre-extension destinations matched the reviewed baseline blobs;
the new audit test was absent. Integrated only these files using native
`apply_patch` from byte-verified staging copies; the source worktree was not moved.

| File | Final source/main SHA-256 |
|---|---|
| `scripts/lib/dashboard_audit.mjs` | `653a3e6941ef3c9a55b9baec6cee1e0317fb503cfc39887ad0d88392e8e206a0` |
| `scripts/lib/promoted_knowledge.mjs` | `ae94aa30b2e8405297996505ffd972fe96dab62e187660a3e6524d7ab1c6b85d` |
| `scripts/manage_knowledge_inbox.mjs` | `ea495033199a485851ffac848b35354ccbef31aa98680499e95edc24862ea57c` |
| `scripts/test_owa_snapshot_recovery.mjs` | `1f02fcd4aef6b8a206093207ab338621f1f9e7056961b144d03c2501cdf6123e` |
| `scripts/test_owa_recovery_cli.mjs` | `31b44156cb5ff0bf6a064e2d1bfb9d8d61cc3047f787d617b63031215a5849a7` |
| `scripts/test_dashboard_audit_checkpoint.mjs` | `5ecfa2c312952da00dc68342f09e7b3d0dd0ade77ee23f88fff5c7b4cbe1de76` |

Previously integrated promotion test remains unchanged. Fresh checks:
`npm run check` before/after integration, module-map validation, explicit
readability and syntax as `mcpbot` for six files. **224 isolated checks PASS**:
20 audit +116 recovery +40 promotion +48 CLI, plus **four compatibility suites
PASS** (reopen, atomic file, BusinessSemantics, Sprint reconciliation). Fixture
exports remain isolated; no production exporter/build entrypoint was run.

## Checkpoint scope, sizes and pruning boundary

Checkpoint captured with `captureOwaRecoveryAuditCheckpoint()` as `mcpbot` at
**09:26:52.567Z**, exclusively persisted `0600`, owner UID999, inside the existing
private execution backup. It is outside the new operation's journal subtree.

- Capture: **9118 events**, **90 day files**, **6,660,515 audit bytes**.
- Serialized checkpoint: **2,349,696 bytes**; below the 8-MiB cap.
- Full audit input below 10,000 events /64 MiB with headroom for 67 repairs.
- Scope throughout: **`checkpointed_retained_suffix`**.
- Throughout: **`ancestryVerified=false`**.
- Final verification: **9188 events**, **6,781,733 audit bytes**, all available
  hashes/internal links, baseline positions and terminal anchor valid; no truncation.

This is an operator-trusted local observation of the complete retained suffix,
not authentication of historical deletions or a new genesis assertion. Strict
default verification and configured retention/pruning were not weakened.

The clean recovery-process environment uses the unchanged helper's effective
**90-day** retention. At the fresh capture check, cutoff was
`2026-07-17T09:26:44.515Z`; earliest retained day was `2026-07-18`. Its midnight
becomes pruning-eligible only immediately after **2026-10-16T00:00:00Z**.
Thus no ordinary pre-capture pruning-intent append was needed or performed.

Before any apply, a fresh bounded 60-minute window plus ten-minute pruning
margin was checked against that boundary. Apply was further constrained to
**09:59:00Z**, two minutes before the unchanged autodraft timer's 10:01 UTC run.
First intent: **09:38:53.584200Z**. Batch completed **09:58:54.800203Z**;
dashboard restarted and controller completed **09:58:55.132903Z**.
Every record checked deadline, source/manifest/checkpoint identity and supported
registry/OWA lock release. No parent held the CLI's own locks; no global mutex
guarantee is claimed.

## Frozen manifest and operation identity

Operation: `owa-content-recovery-checkpoint-20261015-v1`, actor `opencode`.
The historical-preservation note, actor and complete manifest remain bound to
every journal/provenance/audit record. No old operation was rebound.

New frozen manifest:
`backups/manual-repairs/owa-content-recovery-20261014/extension-20261015/manifest-checkpoint-v1.json`

SHA-256: `94c4d76613c87681de2526aa0a6935e2eae98a06af46f636ab6ae41cc7137858`.

Checkpoint:
`backups/manual-repairs/owa-content-recovery-20261014/execution-journal/checkpoint-v1/audit-checkpoint.json`

SHA-256: `d2c4c54b700d4aeeab638307f82cf6a939f03bd4fae323810db28fe31423b4a0`.

The original sealed manifest was not modified; SHA remains
`c9ec594dd6ab6cb7b284457f105778dc4d4ab307c256eddd849dc6a5a8fdaa95`.
New manifest changes only the explicit `auditCheckpoint` reference; exact67
records and complete registry SHA are identical to the original bindings.

## Preservation and backup evidence

Backup root: `backups/manual-repairs/owa-content-recovery-20261014/`.
Original 67 pairs and source pairs, complete registry and fingerprint evidence
remain root-protected/immutable; original **282/282 offline restoration proof**
was revalidated. `extension-20261015/` preserves immutable pre-extension and
reviewed code, approvals, fresh tests and copies of both prior BLOCKED reports.

`execution-journal/checkpoint-v1/` remains private `0700 mcpbot:mcpbot`.
Checkpoint is `0600 mcpbot:mcpbot`; all 67 COMMITTED journals, before-pair backups
and durable intent/readback ledgers are retained. Completed operation records
and checkpoint/manifest evidence are immutable. Operator scripts and the prior
source-worktree Task4 report are also archived under `operator-tools/`.

Dry-run ledger SHA:
`465d6fb6a30a175f498c85dac7e74aaa52433b48a1adfd7b5cd6baa04e42dd04`.
Apply ledger SHA:
`0830316c06c6c4fe993eee14b574610d74374edc43be5f20cc84068bd21eff80`.

Final preservation verified:

- **748 untouched fingerprints** match the pre-repair snapshot.
- All **268 OWA raw JSON/MD files** unchanged; all recovered content hashes use
  complete raw Markdown bytes, never trimmed-body hashes.
- Complete registry byte-identical, SHA
  `1d8dbcd907e1f55cd7618f4532244db1f31b03ea25ccc773c65b8e165687025d`.
- Other **67 OWA pairs** and **338 other-namespace snapshot files** byte-identical;
  promoted file sets are unchanged across all namespaces.
- Every original field, including metadata, status, `promotedAt`, `promotedBy`,
  review note and source path, unchanged. New repair time is separate top-level
  `contentRecovery.recoveredAt`; no historical promotion date was replaced.
- Five OWA CSVs, export manifest, exporter code, selector inputs and exact
  selected67 IDs unchanged; staged chunks remain 190. No build is required for
  this snapshot-only repair and no new build is claimed.
- **192 unrelated dirty main files** remain byte/status exact; Git index unchanged.
  Four discovery coverage/briefing report artifacts were regenerated by the
  unchanged scheduled autodraft service at 10:01:11–10:01:20 UTC, **after** the
  repair window. Their before/after hashes and successful unit execution are
  recorded in JSON; current generated output was preserved, not overwritten.

## Controlled deployment and availability

With zero active actions/jobs/runners, only the direct promotion writer
`erp-kb-dashboard.service` was stopped for the bounded apply window and started
afterwards. PID changed **2060561 →3455638**, start **09:58:55Z**, active/running.
It loads the reviewed promotion fallback for future normal legacy OWA promotion.

MCP bridges are read/draft-only transitive importers for this path, with no
direct promotion/recovery endpoint; no unnecessary MCP, proxy, Docker or timer
reload was performed. Other service metadata/PIDs and timer states were checked
unchanged. Automation config is exact: **enabled, unpaused, shadowOnly=true**;
autopilot configuration is unchanged. Final active jobs/actions: zero.

All **ten HTTP checks PASS**: dashboard status, eight MCP health endpoints,
public `https://optima.kag.taxbell.pl/health` with TLS verification result0.
Existing dashboard quality/freshness WARN is not represented as repaired.
Connected `SemanticKB_erp_entity_get` remained available after reload
(`owa-task4-completed-checkpoint-20261015`); it returned local BusinessSemantics
evidence. The existing OWA namespace-routing/ranking issue remains separate;
availability is not a claim of namespace-exclusive answer correctness.

No commit, production export/build, graph operation, policy/retention/timer
change, synthetic production promotion or ERP write was performed. Source
claims and “Atrybuty test v2” test/archival status were preserved, not newly
verified against MSSQL. Pair files and audit remain nontransactional; existing
audit-appender fsync limitations are not changed by this execution.
