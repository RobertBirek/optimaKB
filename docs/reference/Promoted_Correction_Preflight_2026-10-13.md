# Promoted correction — PREPARATION preflight, 2026-10-13

**DONE — preparation only. Actual automation hold remains `paused=true`.** Fresh live inventory: **73 exact database-qualified nodes = 40 old-owned candidates + 33 preserved shared objects**, including all 11 historical shared chunks. Full properties, vectors, labels and property-type baselines are captured; no correction lifecycle, export, build or deletion was executed.

Companion: [machine-readable preflight](Promoted_Correction_Preflight_2026-10-13.json).

## Authority and input binding

The current operator instruction explicitly approves the corrected 14-record pack, archival of predecessors and conditional cleanup of the manifest's exact 40 objects while preserving 33. This invocation authorizes **PREPARATION only**, including supported pause, protected backups and reports. The earlier manifest's unsigned/proposal flags are historical; they were not edited. Successor publication/readback and renewed transaction-time guards remain prerequisites for the later conditional deletion.

Inputs read: execution scope, correction pack JSON/Markdown, live-boundary JSON/Markdown and write-path report, plus the exact derived map and relevant implementation. Bound SHA-256:

- Scope: `84814cd82c67a76f3b0192b2f402c701ed2b8531f65947915b3ce4b697d89d7f`.
- Pack: `34091066998a7849249d15ade359656b83d0accbc46c315bed9a12d7f869c36a`.
- Live boundary: `df2d92f9c4461240b3753c36983e656edb3fa18ef87ba81168ae35a8f730b33b`.

## Actual hold and previous exact configuration

At **11:09:19.472 UTC**, the supported admin route `PATCH /panel/api/automation/config` received only `{"paused":true}`. The CSRF token came from authenticated `/panel/api/status` and remained transient in process memory. Deployed auth is the supported anonymous-admin mode; the API recorded actor `anonymous`. No credential/token was printed or persisted, and no `.env` was read. Initial localhost access failed because the service binds `10.10.254.42`; subsequent requests used its actual host. Node networking also failed, so the existing curl fallback was used with secret-bearing headers only on stdin.

Previous → current:

| Field | Previous | Current |
|---|---|---|
| paused | false | **true** |
| enabled | true | true |
| shadowOnly / shadowOnlyForced | true / false | true / false |
| publicationApproved | true | true |
| allowedNamespaces | `[ComarchCommunityNews]` | identical |
| minimumConfidence | 0.9 | 0.9 |
| canary samples / accuracy / maximum false positives | 8 / 0.95 / 0 | identical |
| autoRollback / maxRecentJobs | true / 100 | identical |
| publication approval time / actor | 2026-10-12T12:57:05.544Z / anonymous | identical |
| pauseReason / pausedAt | empty / empty | identical |

All other effective policy fields were compared exactly. Only `paused`, `updatedAt` and `updatedBy` are allowed changes. `ENABLED=0` is not treated as a hold. API and supported `loadAutomationConfig()` readbacks both confirmed pause. Last recorded API verification: **11:20:27.122 UTC**.

The exact previous effective config is in protected `config-before-protected.json`; public JSON excludes secret/token/password/key/webhook fields. A verify-only script initially overwrote this config snapshot. The exact prior version was recovered from the supported `listDashboardAudit()` loader's uniquely matched immutable `automation.config.update` event, `audit_2026-10-13_b953d784-484`; its full event is protected in `config-hold-audit-protected.json`. The script now prevents overwrite/reapplication. Recovery and unsuccessful probes are retained in the journal.

### Jobs, schedulers and exclusivity

Supported all-job loader, status API automation list and dashboard action list, and a scoped `/proc` script-path census found **zero queued/running automation jobs, zero active dashboard actions and zero relevant automation/discovery/export/build/pipeline processes**. No active job was killed or halted; there was none to halt. Relevant timer services were inactive; all timers/services remain unchanged.

- `triggerAutomationForDraft()` exits on pause before spawning ordinary submissions (`dashboard_automation.mjs:980–1011`).
- A publish runner checks pause at job entry, not continuously. `ERP_KB_AUTOMATION_FORCE=1` bypasses it; shadow jobs also bypass that entry gate (`run_dashboard_automation.mjs:480–500`). Forced/manual shadow-history entrypoints can still start work. No such process was observed.
- Existing runner locks are per draft/KB, not a correction-wide mutex. No global exclusive lease has been established or claimed.
- **Autodraft does not consult automation pause before creating raw drafts** (`run_dashboard_discovery.mjs:565–647`); submission's ordinary automation trigger still respects pause. Its next scheduled run is **2026-10-13 16:02:38 UTC (18:02:38 CEST)**, outside this preparation's read/backup window. The timer was not stopped. A subsequent phase must recheck this boundary and obtain a controller-managed exclusive window before this run or separately resolve this specific timer.
- Daily discovery is configured `--daily --dry-run --limit 3`, next **2026-10-14 02:45:30 UTC**. Weekly discovery is next **2026-10-18 03:30:32 UTC**.
- LLM-health runs approximately every 15 minutes. It can set pause/reason on repeated failure but does not auto-resume; a run during preparation completed without changing the verified hold/policy.

**Pause is a verified ordinary automation no-spawn hold, not a universal write lock.** Before subsequent mutation, the controller must exclude concurrent operator/MCP forced actions and independent runners and repeat job/config/registry checks. Do not automatically unpause. If any later gate blocks, retain the hold pending controller decision.

## Fresh graph gate

Vectors-inclusive read window: **11:17:06.912898–11:18:04.737764 UTC**; final full-value recheck completed **11:20:47.109661 UTC**. These are separate per-database statements, not a cross-database atomic snapshot.

| Database | Old-owned | Preserve | Total |
|---|---:|---:|---:|
| comarchcommunitynews | 7 | 0 | 7 |
| taxbelllegalreference | 4 | 14 | 18 |
| taxbellpayrollhrreference | 14 | 0 | 14 |
| taxbellaccountingvatreference | 15 | 19 | 34 |
| **Total** | **40** | **33** | **73** |

All exact semantic-ID counts are one; expected historical internal IDs and exact actual label sets match. All available inherited body/summary fingerprints, lengths, current CSV properties/provenance, historical exact promoted/snapshot paths, source URLs, document refs and section order were verified. All three canonical stored `contentHash` values match. Historical null hashes were not invented: fresh raw/decoded and full-node/vector hashes now exist for those five old bodies and eleven preserved bodies, but earlier absent hashes cannot prove prior full-body equality.

Full values were retrieved through the credential-safe `docker exec release-openspg-neo4j` cypher-shell path, with container-environment credential expansion only. APOC JSON/base64 transport preserves embedded JSON text and full floating-point vector values; physical property types are `STRING` and `LIST OF FLOAT`. All **73 nodes have vectors captured**, not just vector keys. No raw connection diagnostics were printed.

All 73 have **zero physical relationships**. The property-reference scan checks every property key containing `ref`, using exact raw/JSON identity and decoded-equivalent semicolon tokens. It found **56 referrer rows** across the inventory. **23 refs target old-owned document IDs; all 23 originate in the same old-owned allowlist. Zero external property referrers target removal candidates.** The three historical owned documents have zero referrers. The exact sets are protected in `refs-<database>.json` and `removal-ref-guards.json`.

Later cleanup must compare these exact sets, remove referencing owned chunks before their documents and then require zero references immediately before document deletion. The guard is not “all refs are zero now.” Recheck count=1, database + full semantic ID, expected internal ID, all labels/properties/types/vectors/provenance, unchanged preserve33 and absence of unexpected relationships/referrers within each write transaction. No detach, prefix/URL sweep or shared-object deletion. Guard inventory is the exact manifest list; the protected checks hold all 40 full identities and fresh fingerprints.

## Protected rollback evidence

Directory: **`/tmp/opencode/protected-source-correction-20261013/`**.

Archive: **`rollback.tar.gz`**, **6,911,776 bytes**, **153 members**.

SHA-256: **`ac3add0f87d36f7b684bcd5d3441f446bbe07b40a7407d249913af910f09cbc0`**.

Ownership/modes: `root:mcpbot`, directories `0750`, files `0640`; explicit `sudo -u mcpbot test -r` checks passed for archive and full graph snapshot. mcpbot can read approved artifacts but cannot overwrite the protected originals. Subsequent operations needing a writable journal should use a separate controller-approved child journal, preserving this baseline.

Contents:

- Full 73-node snapshot with all actual properties, float-vector arrays, labels, physical property types, database/full semantic identity and captured internal IDs; relationship and exact referrer evidence.
- Fresh raw/decoded body hashes, full properties hashes, full-node hashes and vector hashes for **all 73**, including every preserve33 and historical11, in `graph-checks.json`.
- Entire registry object from `loadRegistry()`; raw/promoted14 objects via supported loaders and all **56 original JSON/Markdown files** copied byte-for-byte. All content hashes match old scope; registry and original files remain unchanged on final check.
- Flat withdrawn destinations and per-ID version archive destinations inspected: **42 absent destinations** recorded, no pre-existing scoped destination omitted or silently overwritten.
- **21 staged CSVs** and all existing JSON export/build/upload manifests for the four KBs. CSV hashes remain equal to supplied map. Source evidence files referenced by the corrected pack were additionally copied with verified fingerprints. Total protected source-file inventory: **112**.
- Exact previous config and scoped supported audit event, input reports, scripts, scheduler/job observations and detailed persistent journal. Secrets are excluded from the public report; no CSRF token/admin credentials are in the archive.

Key checksum bindings:

| Artifact | SHA-256 |
|---|---|
| graph-full-snapshot.json | `15e7663b6f1048b3778250d54aa62dede2c76aa694ccb0d360a6cffd14d8bf93` |
| graph-checks.json | `20f90ea25708d0932417c05390ba8570ee9a5d9850bfe7b8f0fe0f34dafaeef0` |
| local-inventory.json | `17819069db3b06e988473d6b60ba52fc8231436a0bfa5818efe864aa4d1cc8a4` |

### Offline verification and restore procedure

`rehearse.py` verified every property/label/type/vector through DB-free parameter serialization and reconstruction for all73, both raw/promoted14 loader content baselines, the registry object and all112 file hashes. `seal.py` reopened the archive, verified every member against its embedded inventory and reconstructed the identical 73-node snapshot. `recheck-graph.py` then proved the captured full values match live, without graph writes.

`restore-plan-OFFLINE-ONLY.json` contains database-qualified parameterized node creation templates, preserving exact labels/property values. **No restore query was run live.** For a later separately approved rollback: verify archive checksum and every member; select only the journal-proven committed deleted subset; require semantic ID absence; recreate that subset from full properties/type evidence; recheck semantic/provenance/vector equality and regenerate internal-ID mapping. Preserve original property refs; physical relationships are empty. Native index definitions/index-engine behavior were not rehearsed in a live/temp DB and no indexes were changed. Local file/registry restoration needs separate controller approval and current-state comparison; blindly overwriting a concurrent registry is prohibited. Re-promoting raw alone is not exact restoration.

## Handoff

Preparation evidence is complete. **Subsequent mutation is not performed and requires a freshly checked exclusive window**, successor submission/export/build/readback and renewal of the conditional exact-delete gate. No new successor IDs exist from this task. The hold stays on.

Scripts under the protected directory: `hold.mjs`, `local-backup.mjs`, `recover-config.mjs`, `graph-backup.py`, `inspect-jobs.mjs`, `verify-local.mjs`, `rehearse.py`, `recheck-graph.py`, `ref-guards.py`, `seal.py`. Persistent journal: **`journal.jsonl`**; embedded archived journal is the version at sealing, and later archive-verification entries remain in the external append-only work journal. These scripts are evidence tools, not a supported correction executor; do not rerun snapshot/seal scripts to overwrite approved baselines.

Validation: `npm run check` PASS (syntax only); module map PASS; local unchanged-source check PASS; all-job/process scan zero active; pause/policy verification PASS; live73 and full readback PASS; DB-free rehearsal/archive-member verification PASS; mcpbot read access PASS. Supported status/config handlers incidentally regenerate the canary report and append their normal audit entries; no manual runtime data edits occurred. Existing workspace changes were retained. No submit, promote, withdraw, export, build, delete, restore, service restart, timer stop or commit was executed.
