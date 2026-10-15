# Promoted correction write path — 2026-10-13

## Decision

**POTWIERDZONE: there is no supported existing action that stores corrected content under an existing draft ID.** `reopenPromotedDraft()` preserves the ID and archives published snapshots, but leaves the original raw content intact. `promoteDraft(..., {force:true})` republishes that raw content; it accepts no replacement body. Neither the inbox CLI nor dashboard exposes a revise/update-content action.

**POTWIERDZONE: supported primitives can create a new corrected draft, promote it and withdraw the old one.** This is a composable local replacement path, not an atomic supersession API. It changes draft-owned derived IDs, supplies no built-in predecessor/successor registry relationship, and does not reconcile previously imported graph nodes. It cannot by itself satisfy guaranteed controlled replacement after live verification.

**Recommendation:** use a separately implemented, bounded correction utility if preserving the original ID is required, or if replacement must be held against automation and recorded transactionally. Do not implement an ad hoc script that overwrites raw/promoted files. The utility contract proposed below is a specification only; nothing was implemented or executed.

Evidence labels: **POTWIERDZONE** = inspected source behavior or explicitly attributed existing report; **WNIOSEK** = consequence of that evidence; **NIEUSTALONE** = runtime/source facts not inspected. No live verification occurred in this task. The operator's approval of controlled replacement after live verification is a prerequisite for a later operation, not evidence that that prerequisite has been met.

## Scope and fourteen-material boundary

Source-only investigation in `/docker/openspg`; the sole write is this report. No raw/promoted corpus, registry instance, service state, secrets, graph, status endpoint, exporter, builder, test or application runtime was read/executed. Repository branch/SHA and working-tree status were deliberately not queried.

The existing `Promoted_Derived_Record_Map_2026-10-13.md:30–75,140–152` reports this boundary; its data was **not revalidated** here:

| Namespace | Material short keys (display only) | Direct docs | Reused canonical docs | Draft-owned chunks | Other dependent chunks to retain |
|---|---|---:|---:|---:|---:|
| ComarchCommunityNews | fb53cb2b, f0ede681 | 2 | 0 | 3 | 0 |
| TaxbellAccountingVATReference | de720ffd, 6b5ac5ed, dcfc95c2 | 1 | 2 | 7 | 6 |
| TaxbellLegalReference | bf920a10, 93f75109 | 1 | 1 | 2 | 13 |
| TaxbellPayrollHRReference | d1c8371c, 08cfe029, 0bdb5e10, 7c66353e, a939510d, 9c43b46e, 4ce9f131 | 7 | 0 | 7 | 0 |
| Total | 14 | 11 | 3 | 19 | 19 |

Use the companion `Promoted_Derived_Record_Map_2026-10-13.json` for full draft IDs and exact ownership sets in a later authorized operation. Short keys are not mutation identifiers. The retained dependencies comprise 18 source-registry chunks and one other-draft chunk. Partial-span correction, especially for `08cfe029` and `d1c8371c`, must retain verified valid text. Canonical source content and those outside-boundary chunks are not certified clean by this report.

## Existing interfaces and exact contracts

### Local library and CLI

Implementation: `scripts/lib/promoted_knowledge.mjs`; wrapper: `scripts/manage_knowledge_inbox.mjs`.

| Signature | Preconditions and effect | Wrapper |
|---|---|---|
| `submitKnowledgeDraft(input, options = {})` (async; separate `lib/knowledge_inbox.mjs:200–247`) | Requires `kbName`, `kbNamespace`, `title`, `content`; optional `sourceUrl`, `tags`, `metadata`. Always generates a new random/date/title ID; input ID is not used. `options.silent` controls stdout only. Writes new raw JSON/MD and calls automation. | Dashboard creation or MCP submission; not a `manage_knowledge_inbox` command. |
| `promoteDraft(draftId, {reviewNote, promotedBy, force})` | Finds original raw draft; validates target namespace. Blocks already-promoted registry entry unless `force`. Copies raw draft content to promoted snapshots and replaces its registry entry. Returns `{promoted, jsonPath, mdPath, registryEntry}`. | `node scripts/manage_knowledge_inbox.mjs promote <FULL_ID> --note "..." --by "..." [--force]` |
| `reopenPromotedDraft(draftId, {reviewNote, reopenedBy})` | Requires registry status `promoted` and original raw draft. Archives both promoted snapshots in a unique timestamp directory and changes registry status to `pending`. Returns new entry. Does not edit content, reroute or launch automation/build. | **No CLI command and no dashboard/MCP endpoint found.** Exported library API only. |
| `withdrawPromotedDraft(draftId, {reviewNote, withdrawnBy})` | Requires registry status `promoted` and original raw draft. Moves available promoted snapshots to withdrawn namespace directory; replaces registry entry with `withdrawn`. Returns entry. | `node scripts/manage_knowledge_inbox.mjs withdraw <FULL_ID> --note "..." --by "..."` |
| `rejectDraft(draftId, {reviewNote, rejectedBy})` | Changes registry only. Library lacks pending-only guard and does not remove promoted snapshots. Dashboard enforces pending-only. **Not a withdrawal substitute.** | `node scripts/manage_knowledge_inbox.mjs reject <FULL_ID> --note "..." --by "..."` |
| `reroutePendingDraft(draftId, targetNamespace, {reroutedBy, note, automationJobId})` | Changes raw namespace/name and appends routing history, not body. Blocks an existing non-pending registry entry. | Not a correction API. |

These signatures are in `promoted_knowledge.mjs:217–290,296–409,412–582`. CLI dispatch/flags are `manage_knowledge_inbox.mjs:13–26,73–109,128–132`. The CLI has no reopen, revise or update command. Passing corrected text in a review note does not change `draft.content`.

**Auth:** local functions/CLI perform no HTTP authentication or role check. They depend on OS access to raw snapshots, destination directories, registry and dashboard audit directory. Operator fields are labels, falling back to `process.env.USER`/`operator`, not authenticated authorization. Atomic registry writes require writable/executable parent directory; root replacements preserve existing owner/group (`lib/atomic_file.mjs:4–29`). Actual permissions were not inspected.

### Dashboard HTTP

Paths are logical server routes, prefixed by configured `BASE_PATH` when used through the panel (UI commonly `/panel/api/...`). Source: `erp_kb_dashboard_server.mjs:558–568,1981–2166,2600–2694,3517–3576,3672–3744,4286–4345`.

| Endpoint | Payload | Effect |
|---|---|---|
| `POST /api/drafts` | **multipart/form-data** fields `kbNamespace`, `title`, `content`, optional `sourceUrl`, comma-separated `tags`, `metadataJson`, optional file field `file` | New draft only; target display name comes from `TARGET_KBS`. Returns 201 with new `draftId`, raw paths, upload warning and automation result. JSON body is not this handler's contract. |
| `POST /api/drafts/analyze` | Multipart fields `sourceType` (`text`, `file`, `url`), `title`, `content`, `sourceUrl`, optional `file` | Extracts/analyzes source and returns editable text/metadata; does not revise or persist a draft. File analysis **does save an upload** and can call external extraction/LLM services. |
| `POST` or `PUT /api/drafts/<FULL_ID>/promote` | JSON `{"reviewNote":"...","promotedBy":"..."}` (optional fields) | Pending-only local promotion; 200. No export/build; no body update; dashboard does not expose `force`. |
| `POST` or `PUT /api/drafts/<FULL_ID>/promote-export` | JSON review/operator fields | Starts approve/export/**build**, 202 (or reuses an existing action). Does not accept corrected content. |
| `POST` or `PUT /api/drafts/<FULL_ID>/withdraw-build` | JSON `{"reviewNote":"...","withdrawnBy":"..."}`; `operator` is an actor fallback | Preflight, local withdrawal, then immediate namespace export/build with forced promoted files; 202. **No local-only withdrawal route or documented dry-run branch here.** |
| `POST` or `PUT /api/drafts/<FULL_ID>/reject` | JSON `{"reviewNote":"...","rejectedBy":"..."}` | Pending-only rejection; 200. |
| `GET /api/drafts/<FULL_ID>` | None | Draft detail/preview, not update. |

There is no matching route for `PUT/PATCH /api/drafts/<ID>`, `/edit`, `/revise`, `/update` or `/reopen` in the inspected dispatcher. The React `AddDraftPage.jsx:37–91,222–231` edits transient analyzed text then POSTs a **new** draft. `InboxPage.jsx:102–204` reads detail and invokes approve/build, withdraw/build or reject. Its saved-draft interface has no content save handler. Editing a source-list entry changes discovery source configuration, not an existing draft body.

**Auth requirements (static, not runtime):** HTTP Basic authentication against configured admin/operator/viewer credentials; admin or operator for mutations, viewer blocked. If explicitly configured anonymous mode, the code assigns anonymous admin. Missing configuration otherwise yields 503; missing/invalid Basic credentials 401. Every mutation also requires `X-ERP-KB-CSRF` for the authenticated username. The code exposes this as `service.csrfToken` in authenticated `GET /api/status`; use transiently in a later authorized operation, never store it in remediation reports. No credentials/token were read here. Auth/CSRF source: `:500–534,1075,3825–3845`. Payload actor fields need not equal authenticated username; domain audit and HTTP audit can consequently have different actor labels.

### MCP new-draft creation

`submit_knowledge_draft` exists in editorial and legacy profiles (`lib/erp_knowledge_mcp_profiles.mjs:12,49–52`). Its declared arguments are only `kbName`, `kbNamespace`, `title`, `content`, optional `sourceUrl` and array `tags`; `additionalProperties:false`. It does not declare an existing ID, metadata/supersession linkage or automation suppression. Handler passes those fields to `submitKnowledgeDraft(..., {silent:true})` (`lib/erp_knowledge_mcp_core.mjs:143–168,641–670`).

Illustrative JSON-RPC envelope for a **later authorized** new submission:

```json
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"submit_knowledge_draft","arguments":{"kbName":"Taxbell Legal Reference","kbNamespace":"TaxbellLegalReference","title":"Verified corrected material","content":"<reviewed Markdown within the content limit>","sourceUrl":"https://<allowed-source>/<exact-source-path>","tags":["correction"]}}}
```

HTTP bridge routes include `POST /mcp`. Requires visible tool and `context.writeAllowed === true` (`mcp_core:548–556`). Bearer user-key auth must pass profile assignment/scope checks; user keys get write permission in editorial mode with `kb.editorial.write`. Configured write bearer token allows editorial/legacy writes. A read bearer token allows writes only in legacy mode when no separate write token is configured; no-auth mode also only grants legacy writes (`erp_knowledge_mcp_http_bridge.mjs:161–179`). Read-only domain profiles do not expose this tool. Source defaults do not establish the active deployed profile/auth. This route can start automation just like dashboard submission, even though its description says it does not directly mutate OpenSPG.

## Persistence, archival and preservation guarantees

Paths are constructed from `ROOT` (default `/docker/openspg`):

| Operation | Exactly what local artifacts it changes | Immediate graph effect |
|---|---|---|
| New submit | Creates `downloads/knowledge_inbox/<UTC-day>/<NEW_ID>.json` and `.md` with exclusive `wx`; no inbox registry entry is created. Pending status is inferred by `listInboxDrafts()` when absent from registry. May also create automation job artifacts/launch runner. Upload routes separately save files below `downloads/knowledge_inbox/uploads/<day>/`. | None directly; automation may later promote/export/build. |
| Promote | Writes `docs/reference/knowledge_inbox/promoted/<namespace>/<ID>.json` and `.md`; replaces same-ID entry in `docs/reference/knowledge_inbox/registry.json`; updates registry `generatedAt` and sorts entries. Appends audit. Original raw files untouched. | None. |
| Reopen | Moves promoted JSON/MD to `docs/reference/knowledge_inbox/withdrawn/<existing-namespace>/<ID>/<unique-ISO-timestamp>/`; replaces same-ID registry entry with `pending`; appends audit. Raw files untouched. | None. |
| Withdraw | Moves available promoted JSON/MD to `docs/reference/knowledge_inbox/withdrawn/<raw-namespace>/<basename>`; replaces same-ID registry entry with `withdrawn`; appends audit. Raw files untouched. | None. Dashboard wrapper subsequently builds. |

**Registry schemas:** promotion writes `draftId,status,kbName,kbNamespace,title,sourceUrl,rawJsonPath,promotedJsonPath,promotedMarkdownPath,promotedAt,promotedBy,reviewNote`. Reopen writes `draftId,status=pending,kbName,kbNamespace,title,sourceUrl,rawJsonPath,reopenedAt,reopenedBy,reviewNote,previousPromotedAt,movedPaths`. Withdrawal writes the analogous `withdrawnAt,withdrawnBy` fields and `status=withdrawn`. These replace the previous entry, not append a registry version history. `movedPaths` holds `{from,to}` pairs. Later re-promotion replaces the reopen/withdraw entry; the archive still exists but its pointer is no longer in the current entry.

Promoted snapshots retain the stored `status:'promoted'` when moved; they are not rewritten as withdrawn/pending. `loadPromotedKnowledge()` scans only the promoted namespace tree and filters snapshot status, **not registry status** (`promoted_knowledge:604–616`). Thus registry-only rejection of a promoted draft would leave its published content loadable. Both reopen and withdraw require the original raw draft even when promoted snapshots exist.

**Preservation strength:** reopen uses unique per-ID timestamp archives and attempts compensation for snapshot moves, registry and audit failure (`:478–581`); compensation itself may fail and raise `AggregateError`. Ordinary withdrawal uses a flat destination, skips missing paths, has no comparable rollback, and on Linux can overwrite a prior same-basename archive on repeat promote/withdraw cycles. Promotion with `force` overwrites active promoted snapshots without archiving them, updates promotion time and replaces registry metadata. Per-file atomic JSON writes are not a multi-file/registry transaction; Markdown promotion uses an ordinary write. New submission can leave JSON without Markdown if its second write fails; an automation-trigger exception can occur after both files have been saved. No global registry lock/CAS is present in these functions.

All promote/reject/withdraw/reopen calls append `knowledge_draft.*` events through `lib/dashboard_audit.mjs`. That implementation writes hash-chained daily JSONL under `data/dashboard/audit/`, uses an append lock, and can prune whole day-files older than a default 90-day retention on first append (`dashboard_audit:7–10,58–80,126–130`). Dashboard mutations also append `http.mutation` events (`dashboard_server:3847–3868`). Audit is useful trace evidence, not perpetual full-content version storage.

## Limits and the 130-page PDF

All numbers below are **source defaults**, not inspected live settings. Environment overrides and upstream proxy limits are **NIEUSTALONE**.

| Layer | Limit / behavior | Evidence |
|---|---|---|
| Inbox content | 50,000 JavaScript string-length units after trim; larger text rejected, not truncated. This is effectively UTF-16 code units, not PDF pages or UTF-8 bytes. | `knowledge_inbox:12–18,136–167` |
| Inbox metadata | Title 200; source URL 2,048; 20 tags, each 64. Required body/title/KB fields nonempty. `metadata.exaQuery` also limited to content max; other recognized tier/date/source checks. | `knowledge_inbox:158–198` |
| Daily total | 100 JSON draft files in today's UTC day directory. Count includes existing raw files regardless of registry status; withdrawal does not free quota. No reservation/locking around count and writes. | `knowledge_inbox:62–67,105–107,204–219` |
| Daily automatic | 25 drafts with `metadata.discoveredVia` equal to `exa` or `source_list`, shared across those categories; also subject to total 100. Manual drafts still invoke automation despite not counting against this 25. | `knowledge_inbox:18–19,212–228` |
| Dashboard request body | 15 MiB = 15,728,640 bytes for the entire request, including multipart overhead. File extension/nonempty validation, no page-count limit. | `dashboard_server:139,571–586,1345–1353` |
| Dashboard analyze | 28,000 characters default; `trimToLimit()` silently keeps only the prefix. Metadata LLM gets at most 6,000 default. Returned `contentLength` describes retained text, not original extraction length. | `dashboard_server:225–226,1698–1705,1896,2041,2075` |
| Direct dashboard creation | PDF extraction is passed to inbox validation without the analyze truncation. With both text and file, extraction is appended under `## Uploaded file extract`; wrapper text also counts toward 50,000. | `dashboard_server:2114–2152` |
| MCP HTTP / auth proxy body | 1 MiB default = 1,048,576 bytes each (JSON envelope/escaping included). Inbox content cap still applies. | `erp_knowledge_mcp_http_bridge:31,215`; `erp_kb_mcp_auth_proxy:12,35` |
| Dashboard rate limit | 60 writes / 240 reads per 60,000 ms, per socket remote-address bucket, not per user. Proxy clients can share quota. | `dashboard_server:141–143,536–555` |
| Bulk approval | Maximum 50 draft IDs per request. This is approve/export/build, not revise. | `dashboard_server:3590–3596` |
| Automation guard | Body 120–50,000, no NUL; URL protocol; duplicate source URL and content hash against promoted snapshots across namespaces. Upper bound is hard-coded here, independent of inbox env override. | `run_dashboard_automation:304–328` |
| Automation reviewer input | 12,000 chars default; reviewer cannot be assumed to inspect the whole long draft. | `run_dashboard_automation:39` |

`submitKnowledgeDraft()` additionally requires HTTP(S) source URLs and an allowed source domain (default Comarch, government/ZUS/PIP and listed professional domains). Domain suffix matching admits subdomains; `g.infor.pl` is admitted by `infor.pl`. Source-list discovery bypasses domain filtering; `third_party` via Exa is rejected. Do not spoof discovery metadata to evade restrictions (`knowledge_inbox:20–43,82–93,168–176,209–218`). Local `file://` provenance is not a valid `sourceUrl`; use the original public source URL and separate provenance metadata.

**PDF extraction details:** `.pdf` accepted. `lib/pdf_text.mjs:259–272` tries configured StirlingPDF, then Tika, then local extraction. External extraction gate is 50 MiB with a 30-second timeout per external attempt (`:8–9,202–257`); dashboard's 15-MiB request cap normally binds earlier. The local fallback deduplicates extracted tokens via a `Set`, is not page-aware, and cannot guarantee layout/repeated-text fidelity (`:184–200`). No OCR/page-completeness guarantee is made by this path. At least 120 extracted characters is treated as acceptable; weaker extraction returns a textual placeholder/warning, which can itself be saved as a draft (`dashboard_server:1676–1693`). File analysis/failed creation may leave saved upload files because saving precedes extraction/validation.

**WNIOSEK:** a 130-page PDF cannot be considered preserved merely because analyze/save succeeds. Analyze can lose everything after character 28,000 without warning; direct create can reject over 50,000 after saving the PDF. Page count alone does not determine extracted size. Full-document extraction length, byte size, OCR quality, page coverage and current quota availability remain **NIEUSTALONE**.

For full preservation, use reviewed page/section partitions with a completeness manifest and stable original source attribution, each within the existing body cap, or implement explicit validated long-document handling in the correction utility. Never silently retain a prefix or replace a full document with the extraction placeholder. If normalized reviewed text has length `L`, `ceil(L / 50000)` is only a theoretical lower bound on new drafts; section/provenance overhead can require more. Fourteen replacements plus PDF partitions compete with all other submissions for the daily quota. Raising only the inbox cap is insufficient because automation's 50,000 upper guard and dashboard analyze cap remain separate.

## Automatic triggers and the supported composable replacement path

`submitKnowledgeDraft()` always calls `triggerAutomationForDraft(draft)` after writing (`knowledge_inbox:226–228`). `silent:true` does **not** suppress it. The trigger loads automation config, exits if disabled/paused or namespace not allowed, otherwise creates a job and spawns a detached runner; shadow-only config selects shadow, otherwise publish (`dashboard_automation:980–1011`). On approved publish, that runner promotes, exports/builds and validates, with optional rollback on failure (`run_dashboard_automation:589–634`). Current config, queued/running jobs and external schedules were not inspected.

An identical source URL can trip `source_duplicate` while the old draft remains promoted (`run_dashboard_automation:320–327`). The generic submit/promotion APIs themselves do not enforce duplicate/supersession rules. Dashboard metadata filtering drops custom fields such as `supersedesDraftId` or arbitrary correction provenance (`dashboard_server:1953–1978`); MCP submission does not pass metadata at all. Direct `submitKnowledgeDraft()` accepts metadata objects, so a proposed supersedes marker can be stored there, but no inspected code enforces or consumes it as a lifecycle relationship.

**Concrete existing local path, conditional on a later controlled operation:**

1. Verify the exact old full IDs, authoritative corrected text, live exposure and exact graph ownership. Establish that new submissions cannot be published automatically during the correction window; pausing config alone does not prove already-running jobs are stopped. No current per-submit automation opt-out exists.
2. Submit reviewed corrected content with `submitKnowledgeDraft(input, {silent:true})` or the dashboard/MCP new-draft endpoint. Keep old content active while validating the new raw JSON/MD and a full-ID old→new ledger. Returned ID is new. This is a new-draft write, not editing the old corpus.
3. Promote the verified new draft with `promoteDraft(newId, {promotedBy,reviewNote})` or `/promote`. In the review note record the full predecessor ID and correction reason; maintain a durable full-ID mapping because existing registry does not store structured supersession. This promotion is local only. At this point local loaders can temporarily see both versions.
4. Withdraw the old ID with `withdrawPromotedDraft(oldId, {withdrawnBy,reviewNote})` or the CLI `withdraw`, using the note to record successor ID(s). The original raw pair remains and promoted snapshots are moved. Do not use `/withdraw-build` if local correction must be separated from live publication.
5. Only after that local phase and authorization for live publication: export the four affected namespaces, force changed import files where needed, reconcile obsolete graph IDs separately and perform exact readback. Existing submit/promote/withdraw primitives provide no atomic rollback for this entire sequence.

This sequence can store corrected body text **without manual corpus edits**, but it is not presently a guaranteed, held, version-linked correction transaction. If those guarantees are mandatory, **there is no complete supported path yet**; implement the bounded utility before writing corrected drafts. No step above was executed.

### Same-ID route is blocked

Reopen → edit → promote would be the conceptual route, but its **edit** step is absent. Reopen → promote alone republishes the unchanged raw body. Forced promote accepts no content and does not archive. Namespace reroute changes routing only. Do not reopen the fourteen just to make them pending: it removes local promoted loader visibility without resolving content and may expose them to independently scheduled pending-draft processing. The reopen function itself launches no job, but absence of future queue pickup is not established.

## Derived files and graph consequences

**POTWIERDZONE (source):** no direct library operation above issues a graph request. A subsequent namespace export rewrites its configured staged CSVs/manifest from current source loaders, not just fourteen rows. The relevant document/chunk changes are:

- Community: document ID `makeId('COMMUNITY_DOC_PROMOTED', draft.id)`; chunk IDs `makeId('COMMUNITY_CHUNK_PROMOTED', draft.id + '_' + order)`. Chunking joins two paragraphs, not a fixed character cap (`export_comarch_community_news.mjs:457–479`). A very long paragraph can still yield an oversized downstream vector input; source length validation alone is not a chunk-token guarantee.
- Taxbell: source document reuses `makeId('TBDOC', sourceUrl)` if present in canonical registry IDs; otherwise `makeId('TBDOC_PROMOTED', draft.id)`. Own chunks always use `makeId('TBCHUNK_PROMOTED', draft.id + '_' + order)` (`export_taxbell_reference.mjs:152–193`). Defaults split around 1,800 characters and exclude chunks of length at most 80 (`export_taxbell_reference.mjs:11,47–49`; `promoted_knowledge:153–179`).
- For the three reused canonical documents, corrected promoted content updates its own chunks, **not** the canonical document's summary/description/source snapshot. Those are generated independently from source registry snapshots (`export_taxbell_reference:112–149,157`).
- New-ID supersession changes all draft-owned document/chunk IDs; reused canonical IDs remain shared if URL mapping remains stable. Same-ID correction would retain ID construction, but reordered/split content changes chunk meanings and shortening can leave obsolete tail IDs. ID reuse depends on preserving namespace/source identity and the exporter algorithm, not just draft ID.

The builder declares `FILE_EXTRACT`, CSV, `ONCE`, `action:'UPSERT'` (`lib/build_runner_core.mjs:14–65`), with no tombstone/deletion or missing-ID reconciliation. Direct build runner skips zero-row files, reuses upload entries and skips `FINISH` jobs unless filenames are forced; it performs no content-hash comparison (`build_kb_runner.mjs:431–467,498–534`). Inbox pipeline explicit namespace/promote targets force `reference_document.csv,chunk.csv` for all four relevant namespaces (`run_knowledge_inbox_pipeline.mjs:65–87,335–336`); force is reimport, not pruning. Dashboard withdrawal similarly forces and starts the full export/build/quality/regression/freshness path (`dashboard_server:3051–3108,3728–3734`). A downstream build failure does not restore the earlier flat local withdrawal.

**WNIOSEK:** under those declared UPSERT semantics, graph IDs omitted after withdrawal persist if previously imported. New-ID replacement can leave all old draft-owned graph nodes; same-ID shorter replacement can leave old tail chunks. No existing local content operation guarantees graph preservation/cleanup. The maximum draft-owned boundary in the existing map is 11 documents + 19 chunks, **not** 14 documents plus every dependent chunk. Protect the three shared canonical documents and 19 outside-boundary chunks. Source-topic counts may need recomputation; forced document/chunk imports alone do not refresh every aggregate. Actual graph nodes, relationships, historical IDs, imported content and runtime deletion semantics remain **NIEUSTALONE**.

## Bounded correction utility specification (not implemented)

Prefer a canonical library action plus thin CLI/HTTP wrapper, rather than privileged file overwrites. Proposed operation names and payloads below are **not existing APIs**.

```text
planPromotedCorrection({
  correctionId, draftId, mode: 'preserve_id' | 'supersede',
  expectedNamespace, expectedRegistryStatus: 'promoted',
  expectedRawHash, expectedPromotedHash, correctedContent,
  sourceEvidence: { sourceUrl, sourceHash, retrievedAt, pageRanges, coverage },
  reason, actor
}) -> immutable plan + content diff + ownership diff + limits + preconditions

applyPromotedCorrection({planHandle, expectedPlanHash, idempotencyKey})
  -> local correction result + archive/version/supersession ledger
```

Required bounded behavior:

1. Exact allowlist of the fourteen **full** IDs from the prior mapping; no namespace-wide blanket mutation. Refuse mismatched status, namespace, source identity or hashes. Plan must include retained spans and complete source/page evidence, not only replacement text. Do not accept guessed authoritative body.
2. Correction hold checked by submit, promotion and pending automation/schedulers, including already-running-job preconditions. No hidden auto promotion/export/build. The existing `silent` option is not sufficient; implement and test an explicit no-automation correction mode in the canonical action.
3. Immutable version archive of **both raw and promoted JSON/MD**, original registry entry and content hashes, timestamped per ID/correction ID. Reopen's archive preserves promoted versions only; extend the canonical mechanism for raw-body revision instead of manually patching snapshots. Preserve ID, createdAt, KB/source identity and unrelated metadata in preserve-ID mode; regenerate raw Markdown from the validated revised object. Finish as held pending for independent approval. Re-promotion creates the corrected snapshot through the normal promotion layer.
4. Registry CAS/lock and idempotency ledger; transactional or recoverable paired-file/registry changes, durable compensation journal and conflict refusal. Audit identifies authenticated actor, hashes, retained/replaced spans and archive paths; archive must remain discoverable after re-promotion replaces the current registry entry. Preserve filesystem ownership/access expected by `mcpbot`.
5. Supersede mode uses canonical new submission with automation suppressed, immutable full-ID predecessor→successor links (including one→many PDF parts), page coverage and hashes. Withdraw predecessor only after all successors pass local verification; use versioned archive semantics, not flat overwrite-prone withdrawal. Define rollback without destroying either version.
6. Validate body/transport/daily limits before any write, and reject overflow with measured sizes. Partition the PDF explicitly or provide separately tested bounded long-document support. Never invoke dashboard analysis for lossless storage without a completeness check; never silently truncate. Review vector chunk token sizes separately, especially Community two-paragraph chunking.
7. Local apply returns an exact old/new derived-ID reconciliation plan; it does **not** mutate the graph. Protect canonical/shared records and unrelated nodes. Export/build/prune/readback remains an explicit separately authorized phase after live verification, with full imported-content checks and obsolete-ID readback. Define aggregate refresh requirements alongside document/chunk force lists.
8. Verification for that future implementation: meaningful isolated tests for same-ID corrected body persistence, untouched original archive, repeat/idempotency, concurrency/CAS, paired-write/audit failure compensation, no automation spawn, structured supersession, PDF completeness/overflow and shared-node retention. No runtime/services/build changes should be needed to author those tests.

## Blockers and consequences for the later correction

- **Same-ID content replacement:** missing canonical revise action and missing CLI/HTTP route. Reopen is necessary archival infrastructure, not a solution on its own.
- **Controlled new-ID replacement:** missing per-submit automation hold, enforced supersession relationship, batch transaction and robust flat-withdrawal archive. Existing composable path works only with externally established control and explicit version ledger.
- **PDF preservation:** default analysis truncation, content maximum, extraction fidelity/page coverage and partition quota must be resolved from the actual reviewed source. No actual PDF was inspected here.
- **Graph cleanup:** library withdrawal has none; UPSERT/force does not remove old IDs. Actual graph ownership and imported content must be verified before any deletion/reconciliation.
- **Current operating conditions:** active credentials/profile, effective env limits, permissions, quota usage, automation state/running jobs and proxy size limits were intentionally not read. Static route support is not proof that running services have loaded this checkout's version.
- **Approval consequence:** the approved controlled-replacement objective cannot safely be equated with fourteen forced re-promotions or fourteen withdraw/build requests. Those would either republish unchanged content or start live work before the missing verification/control step.

## Investigation validation and handoff

Using `verification-before-completion`, claims were checked against the inspected signatures, handlers, source limits and loader/export/build logic, and the report was read back. Shell/runtime checks (`npm run check`, module-map validator, tests, git commands, service/API/graph checks) were intentionally not run under the explicit read-only investigation constraints. No runtime success or effective live configuration is asserted.

```yaml
task_id: Promoted_Correction_Write_Path_2026-10-13
agent: OpenCode
host: local workspace host (not queried)
repository: /docker/openspg
base_branch: not queried per task constraint
base_commit: not queried per task constraint
result_commit: uncommitted
changed_files:
  - docs/reference/Promoted_Correction_Write_Path_2026-10-13.md
skills_used: [codex-delegation, verification-before-completion]
commands_run: []
validation:
  passed: [static signature/route/limit cross-check, report readback]
  failed: []
  not_run: [syntax tests, module-map command, git status, runtime/service checks, live API/graph verification, exports, builds]
confirmed_findings:
  - No existing same-ID content revision action in the inspected interfaces.
  - Reopen archives promoted snapshots and returns the original raw draft to pending.
  - New corrected draft submission and local promotion/withdrawal primitives exist.
  - Submission invokes automation; dashboard withdrawal starts export/build.
  - Local withdrawal does not issue graph deletion.
inferences:
  - Composable supersession is not an atomic controlled correction transaction.
  - UPSERT omission and forced import do not establish obsolete-node cleanup.
hypotheses: []
risks: [silent PDF prefix truncation, premature automatic publication, flat archive overwrite, registry/file partial failures, stale graph nodes, shared canonical dependency loss]
approval_required: [later live verification and controlled correction execution; no new execution requested here]
recommended_next_action: Review this specification; implement a bounded canonical correction action if same-ID or held transactional guarantees are required, then verify live ownership before the approved correction operation.
```
