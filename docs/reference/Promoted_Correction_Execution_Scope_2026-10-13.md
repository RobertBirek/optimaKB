# Promoted correction — operator signoff scope (2026-10-13)

**Preparation only. `deletionAuthorized=false`, `executionAuthorized=false`. No submission, lifecycle change, export, build or graph operation was executed.**

Manifest: [Promoted_Correction_Execution_Scope_2026-10-13.json](Promoted_Correction_Execution_Scope_2026-10-13.json). It binds SHA-256 fingerprints of both input reports and lists full semantic IDs, database partitions, expected internal IDs/types/labels, observed lengths and available old body fingerprints. Database + exact semantic ID is the identity; short keys/internal IDs alone are insufficient.

| Namespace / database | Old drafts | Removal proposal | Preserve |
|---|---:|---:|---:|
| ComarchCommunityNews / `comarchcommunitynews` | 2 | 7 | 0 |
| TaxbellLegalReference / `taxbelllegalreference` | 2 | 4 | 14 |
| TaxbellPayrollHRReference / `taxbellpayrollhrreference` | 7 | 14 | 0 |
| TaxbellAccountingVATReference / `taxbellaccountingvatreference` | 3 | 15 | 19 |
| **Total** | **14** | **40** | **33** |

The 40 proposal objects are 30 current-owned + 10 historical-owned (14 documents, 26 chunks). The 33 preserved are 22 current-shared + 11 historical-external (3 documents, 30 chunks). Exact sets are unique, **disjoint (intersection 0)** and complete against the 73 input document/chunk objects. All 14 full old draft IDs and namespace partitions match the correction pack. This is complete supersession scope, not a finding that every current-owned object is already obsolete. All other graph objects, topics and aggregates are outside deletion scope.

## Automation blocker

`dashboard_automation.mjs:131` uses `ERP_KB_AUTOMATION_ENABLED === '1' ? true : Boolean(stored.enabled)`. **Per-process `ERP_KB_AUTOMATION_ENABLED=0` does not disable stored enabled automation**, without or with unchanged service configuration. `silent:true` only suppresses stdout; submission still triggers automation (`knowledge_inbox.mjs:226–228`). No effective runtime hold was checked or established.

A nonempty process-local `ERP_KB_AUTOMATION_ALLOWED_NAMESPACES` list excluding all four target namespaces reaches the supported `namespace_not_allowed` return (`dashboard_automation.mjs:985–990`, absent `force`). An empty list allows all namespaces. This guard is static evidence only and requires separate approval/verification, including independent schedulers and in-flight jobs. Do not submit using `ENABLED=0` alone.

## Proposed order — requires later execution signoff

1. Obtain separate local/publication execution approval and prove an effective automation hold/exclusive correction window. Establish protected full rollback snapshot and all 33 preserve baselines before changing local or graph state.
2. With requested per-process `ERP_KB_AUTOMATION_ENABLED=0` **plus an independently verified effective hold**, use supported `submitKnowledgeDraft` for exactly 14 successors. Map pack `namespace` to `kbNamespace` and supply target `kbName`. Preserve correction metadata and a durable full old→new ledger; verify no automation starts.
3. Verify all 14 new local raw JSON/MD bodies, exact hashes, complete text, namespaces, source URLs and evidence. Promote verified successors through `promoteDraft`; then withdraw/archive exact originals through `withdrawPromotedDraft`, backed by an immutable independent snapshot. No same-ID edit utility is required for this conditional composable supersession path.
4. Export the four namespaces, determine actual successor descendant IDs, inspect the full staged diff, and force only `reference_document.csv,chunk.csv` via supported build runners. Namespace exports/import files contain more than the 14 draft projections; stop on unrelated drift. Force is UPSERT, not pruning. Verify every successor descendant built/read back and all 33 preserved hashes unchanged.
5. Renew all old counts/identity/labels/content/provenance and relationship/property-referrer checks. Revalidate removal disjoint from successor and preserve sets. Refresh/verify complete protected rollback evidence. Obtain **separate exact-deletion signoff** binding all 40 `(database, semantic ID)` tuples, manifest hash, renewed evidence, successful successor build/readback and backup checksum.
6. Only then perform conditional exact old-only cleanup with transaction-time guards; halt on drift or partial failure. Read back absence of old40, presence of all successors, and preserved33 identity/hashes. No prefix/URL-wide cleanup or automatic detach; metadata/aggregate changes require separate scope review.

## Remaining blockers and rollback requirements

- Effective hold, quotas/permissions, exclusive window and absence of racing jobs/schedulers are unverified.
- Separate execution/publication approval and exact-delete signoff are absent.
- Successor draft IDs do not exist yet; descendant IDs are unknown until actual export, then require successful build/readback. **No deletion before that gate.**
- Fresh live counts, internal-ID/provenance verification, relationships and property referrers have not been checked in this preparation. The input read was non-atomic and is not a current execution gate.
- Entire old node properties **including vectors**, actual labels and dependent/index state must be backed up internally with restricted access and verified restore completeness. Body projections are not sufficient. Five old removal objects lack body hashes; eleven preserved historical chunks lack hashes. Compute protected baselines for **all 33** preserved objects before import and compare after import/cleanup, including the three canonical stored `contentHash` values.
- Submit/promote/withdraw/import/delete are **not atomic**, especially across databases; flat withdrawal archives can overwrite. A durable stage journal and separately approved, tested compensation rollback must cover local versions/registry/staged files, committed graph subsets and index state. Re-promoting raw alone does not restore exact historical state. Never remove guessed successor IDs during rollback.

Validation: offline exact input/manifest parity, namespace/type/internal-ID/length/hash checks, `npm run check` and module-map validation. No secret or raw runtime files were read. The manifest grants no authority to execute its proposed sequence.
