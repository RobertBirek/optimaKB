# Independent final design review — revision 2

**Verdict: Approved. Original issues closed: 5/5. New blocking issues: 0.**

Date: 2026-10-21. Approval is of the written **raw-record-provider design proposal**, assessed against the controlling v2 brief. It is not the user's written acceptance of the changed service role/budget, an implementation authorization, or a runtime/semantic-quality result.

Reviewed complete design: `docs/superpowers/specs/2026-10-21-semantic-evidence-contract-design.md`, **81,104 bytes**, SHA256 **`eb3dca5e6864133c8982005b79c3269d3de5c7193a5b1a847cd830541505d380`**. All design line references below refer to these exact bytes, including the full long L336.

## Scope and review method

The controlling brief changes the proposed server responsibility to candidate discovery plus exact source-record retrieval. Accordingly, the review does not demand draft-1's four semantic aspects, source-knowledge/coverage judgments, interpreted UNKNOWN, physical SQL mapping, semantic proof edges, or automatic qualifier closure. Their removal is an explicit proposed scope change, not evidence that those old tasks were implemented or completed.

Read the complete revised design, revision-resolution record, controlling v2 brief, and raw-context feasibility Markdown/JSON. The prior draft and first review remain separately preserved. Domain evidence came only from frozen EsJ4gr E/F/C CSV bytes; existing main transport/worker interfaces and the exact pinned frozen lexer were inspected as text.

Verification used file reads, SHA256, standard-library JSON/CSV parsing, byte/physical-line locators, canonical serialization arithmetic and UTF16 counting. **No application module, source lexer, posting/index builder, controller, factory, test, CPU benchmark, HTTP/provider/service operation, corpus operation or agent was executed.** No implementation edits or commits were made. This final review is a new file, not a replacement for the initial review.

## I1–I5 dispositions

### I1 — Closed wire and error contracts: Closed

**Design locations:** §§3–7, L44–251; synthetic examples §11, L443–528; transcript constraints §10.

The revised types close scalars, the three raw field objects, physical/provenance records, candidates/origins/related refs, request/result arrays, budgets, MCP envelopes and controlled errors. Optional versus null is explicit, arbitrary extension keys/coercion are rejected, and UTF16 limits are distinguished from JSON Schema code-point lengths. Duplicate JSON keys, invalid UTF8/lone surrogates, unsafe numbers and negative zero have specified rejection rules.

Discovery now defines absent/ambiguous canonical-owner results, candidate kinds, caps/counts, exact-match/fold/token/set tiers and deterministic order. Evidence defines 1–8 requests, 1–8 unique refs within each request, unique request IDs, at most two exact owners, and one result per request. Unknown/quarantined/mismatched refs are explicit missing outcomes; they do not trigger alternate owner/field lookup. Returned/missing partitions and status precedence are specified, including mixed budget and non-budget failures.

RPC validation/denial, tool-level stale/index/data failures, and normal missing delivery results are distinct. Fixed messages avoid source/exception echo. Success/error mode coupling and the single canonical text item's parity with structuredContent are normative. Four fenced JSON examples parsed independently; synthetic fields/source/record/ref/snapshot hashes, the 277-character cost, and expanded discovery/error text parity recomputed correctly. This establishes document consistency, not a running validator or MCP call.

### I2 — Semantic proof-edge contradiction: Closed by the explicit role change

**Design locations:** §1 L9–13; §4 L65–102; §6 L206–216; §8.1.

There are no semantic facts, per-aspect proof edges or inherited verification fields to implement. The replacement contract proves **export-record integrity and literal ownership**: original artifact SHA, byte and physical-line range, raw record hash, complete decoded-fields hash/size, deterministic record hash/ref, and membership in the active trusted snapshot. Record identity is physical, so duplicate logical IDs do not silently select the first occurrence.

Metadata F candidates remain distinct from `identifier_mention` candidates. Neither kind certifies current SQL existence, a table mapping, an API parameter, or interpreted meaning. All emitted records carry `semantic_completeness:not_assessed`; `integrity:exact_export_record` does not certify Markdown/table/document completeness. K3/K4 may be delivered as their exact original CSV records but cannot be repaired, joined or presented as server-certified complete mappings. Shared refs deduplicate globally without relabeling field/aspect/version.

The sixteen §12 production example refs recomputed from the original CSV bytes under the **normative v2** algorithm. The raw-feasibility report's provisional candidate-ID algorithm is explicitly different and is not used as the new wire ABI.

### I3 — Context/qualification ambiguity: Closed by a bounded delivery policy

**Design locations:** §5 L154; §6 L206–216; §10 L417–441; §12.

The only automatic context is the complete unique owner-E record. Context reservation occurs for all resolvable requested owners, in first-owner order, before explicit records. E is charged once globally, including when also explicitly requested. Missing/quarantined/unfit mandatory context prevents body delivery for that owner and has an explicit reason. Subsequent explicit refs are considered in request/ref order; an oversized record is skipped whole and does not prevent a smaller later record from fitting. Repeated refs share the same eligibility and cost; output partition/budget cross-checks are mandatory.

Status/date/other C records are explicit whole-record selections. Same-owner, same-path and section-order links are navigation, not semantic closure or a shared historical version. An unversioned/pathless F row does not inherit C's date/status. `returned_all` means all selected refs were delivered with required E, not that all relevant qualifications were found or all user obligations answered. The caller must preserve returned qualifications and may need refinement when relevant records were not selected or did not fit.

This removes the previous unspecified semantic-closure algorithm rather than pretending it has been solved. Its adequacy for a final answer belongs to later caller evaluation and written scope acceptance.

### I4 — Unsupported four-aspect grammars: Closed by finite hint-only rules

**Design locations:** §5 L148–171; §8.1 L257–300; §12 L559–569.

The four source-fact readers are no longer promised. Finite metadata rules use E IDs/names/aliases and genuine F `fieldName` or explicit valid `mssqlColumn` fallback. Canonical EntityRef inputs require E.id; aliases/ontologyId are not repaired into caller selectors. Internal F/C owner references may resolve only through the unique literal same-namespace id/ontologyId union, with ambiguity retained and quarantined.

Body hints are limited to closed technical-reference tokens from the exact pinned source-mode lexer, with specified token roles/kinds/grammar and maximum candidate spelling. Opaque quotes, RHS/literal operands, fences, malformed/unclosed/glued atoms and wildcards do not become mention postings. The conservative whole-cell `unsupported_fence` rule covers tilde-fence input unsupported by that lexer. Raw delivery still preserves those original cells, including RHS text, fences, questions and source fragments. No question/type/role/table semantic reduction is introduced.

The lexer source and its actual API/token/diagnostic definitions were inspected; its SHA matches the design. The lexer was **not run**, so this review does not claim particular posting counts, discovery ranks or admission results. The complete accounting/diagnostic scheme retains every record even if owned but without hints or with unsupported body syntax. A hint miss is not global absence or a source-UNKNOWN conclusion.

### I5 — Compiler/index/snapshot/worker ABI: Closed as a design contract

**Design locations:** §§3–4; §8 L253–399; actual-main map §9 L401–413.

Stored records, owner lists/lookups, postings, diagnostics, accounting, Compiler, IndexPayload, DataManifest, TrustedDataGeneration, CodeBinding and functional compile/load/lookup/verifier interfaces are now defined. Sorting, null ordering, diagnostic/ref deduplication and canonical unsigned-UTF16-key serialization are specified. The 366-record accounting partition is exact; the actual fixture's zero ownership quarantine is an observation, not a compiler success constant.

The hash dependency chain is acyclic: source/code/environment → physical record hashes/refs → IndexPayload bytes/hash → snapshot → manifest → externally trusted manifest hash. The index has no own hash/snapshot/manifest hash; the manifest has no own hash. `data_bytes` excludes manifest bytes to avoid recursion, while the separate hard aggregate check includes the actual manifest bytes. Compiler/runtime file inventories and their canonical closure hashes are distinct from the retained existing `generation.id` algorithm, and both bindings are explicitly pinned. Data files do not enter captured code or its hash.

The controller-selected staging descriptor provides the trust root. Independent verification precedes release of the same immutable descriptor to the pool. Workers load only after an authorized PoC job, not on code-ready or a warm preload. Both slots bind the same manifest/snapshot/code generation; data-ready/result identities and controlled unavailable/error states are explicit. Subsequent authorized jobs recheck fixed-path fingerprints and use captured immutable bytes rather than mixing mutable reads. Untrusted paths/headers/query hashes cannot select a generation. Missing/corrupt/unknown-format/over-bound/data-code/source-changed/caller-stale outcomes and first-failure precedence are specified.

The data generation is capped at **8 MiB total serialized bytes across the five files**, separate from **2 MiB runtime code** and the separately bounded compiler closure. Two workers may retain validated copies; the document correctly does not equate serialized bytes with a measured heap bound. No rebuild, “latest” generation, synchronous fallback, provider fallback or server-session reservation API is assumed.

## Source/budget verification

Independently parsed E67/F109/C190: **366 records, 406,996 original bytes**. All 299 F/C owner refs resolve to exactly one E using literal id/ontologyId lookup; canonical E IDs are unique. Complete fields payload totals **461,823 UTF16 / 470,707 UTF8 bytes**, which is not a built index size or proof of 8 MiB fit.

All eighteen report witnesses matched full-fields hashes/lengths, raw CSV record hashes and physical ranges. The new budget includes every original field/key/empty cell and JSON escape, not body-only excerpts:

| Explicit source selection, including mandatory E | Unique records | Owners | UTF16(C(fields)) | Conclusion |
|---|---:|---:|---:|---|
| EB, EL, B1–B3, L1–L3 | 8 | 2 | 13,175 | Fits proposed raw context budget |
| EK, F47, F48, F50, K1, K2, K5, K6 | 8 | 1 | 9,231 | Fits selected contractor context; K3/K4 omitted |
| EB, B1–B3 | 4 | 1 | 6,579 | Fits selected bank context |
| Contractor selection above plus K3/K4 | 10 | 1 | 13,436 | Fails record cap despite character fit |

The first three selections are file-measured availability/arithmetic witnesses, not executed API batches or semantically sufficient answer proofs. The ten-record case cannot be accumulated through extra evidence calls or represented as complete physical SQL mapping. E.mainTable remains blank; F.mcpField=`CDN` remains literal export data. BRa_IBAN body text/questions remain raw source content, not a server-known type/unknown-meaning adjudication.

The proposed client protocol is explicit: ≤2 discovery calls, then ≤1 evidence call, one snapshot; every explicit get ref must actually have been exposed by a prior successful discovery for that owner/snapshot. Automatic E is exempt only from exposure, not cost. Verification replays deterministic delivery and checks artifacts, parity, partitions and budgets; it does not parse natural language as semantic evidence. A mechanically valid transcript is not a certified correct final answer. Known20 remains regression; fresh client holdout work follows a separately frozen caller/PoC protocol.

## Current-main integration check

These are confirmed source interfaces, not newly implemented functionality:

- Main core L280–299 / L548–615 currently declares generic query tools and dispatches the answerer. V2 requires dedicated strict typed handlers/validators and fixed new error envelopes, bypassing that path.
- Main profile L19–23 and pool L6–10 currently have **four** semantic methods. V2 explicitly requires a **six-name global worker allowlist (old4 + new2)**, while new tools are exposed only in private `erp-semantic-evidence-poc` with OWA and `kb.semantic.read`. Existing profiles retain their tools. Common `list_knowledge_bases` is not an extra retrieval channel.
- Main bridge L247–300 currently authenticates before dispatch and has a non-worker synchronous fallback. The future typed branch must deny/validate before data access and cannot accidentally fall through because a new name was omitted from the worker whitelist.
- Main pool L83–107 currently provides 2 workers / 8 queued and cancellation/isolation. V2 preserves those bounds while specifying a separate closed raw-job/data-ready/result path, trusted context reconstruction and generation checks. It does not reinterpret old four-method jobs.
- Main generation `SEMANTIC_CODE_FILES` and offline harness `MODULE_FILES` are separate fixed inventories. V2 names both required inclusion/closure changes, including the exact frozen lexer absent from main's current inventory, and a new exact-kind data fixture rather than alteration of the sealed 79-member bundle.

Authorization before scope-index/body access, whole-batch foreign-namespace denial, absent/null allowlist denial, stale refs and no-substitution are specified at parent and worker boundaries. Actual implementation/enforcement and final closure sizes remain future acceptance checks, not reasons to invent missing APIs now: the normative new interfaces and responsibilities are present.

## New issues

**None identified that blocks implementation planning for this proposed scope.** No style findings or demands to restore draft-1 semantic adjudication are raised. Numerical source fit, closed document contracts and preserved hashes do not stand in for unexecuted implementation/auth/worker/client checks.

## Exact fingerprints and preservation

All values below are SHA256 of complete file bytes. `W` = `/tmp/opencode/openspg-semantic-material-20261017`; `F` = `/tmp/opencode/semantic42-frozen-EsJ4gr`; `M` = `/docker/openspg`.

| Root / document | Bytes | SHA256 |
|---|---:|---|
| W `docs/superpowers/specs/2026-10-21-semantic-evidence-contract-design.md` | 81104 | `eb3dca5e6864133c8982005b79c3269d3de5c7193a5b1a847cd830541505d380` |
| W `.superpowers/sdd/explicit-semantic-design-revision-20261021.md` | 11192 | `4b238e8ff1908a783a0b26abe44ee838f3c7c7415c4b3da4eb969c2b028d8d4a` |
| W `.superpowers/sdd/explicit-semantic-design-v2-20261021-brief.md` | 6639 | `1535e0e07e324efe7dd5567d6ccf2a004e1cf78377d0855b195a63d63a462b3c` |
| W `.superpowers/sdd/explicit-semantic-runtime-feasibility-20261021-raw-context.md` | 16570 | `f18ada675d57217c395470bfb0bb64c7fbfe64bf05bfee73a9433cd249226d92` |
| W `.superpowers/sdd/explicit-semantic-runtime-feasibility-20261021-raw-context.json` | 23391 | `c17c40c7c2d6589e7f02521f3d2ec049bf669f8561b62e5bc46e903baee82924` |
| W `docs/superpowers/specs/2026-10-21-semantic-evidence-contract-design-v1.md` | 29701 | `83d401abce569a866ea59782a86eefd3fe4056d219156a79090d7e9e7d346757` |
| W `docs/superpowers/specs/2026-10-21-semantic-evidence-contract-review.md` | 29753 | `d1e57ea0987a1ef6001f0b155c62a52676bd25cd4dbb1f30791f1da6155e7af1` |
| F `manifest.json` | 25850 | `9f4275a2400e7853f7b8bcdcfe3f4463c3ad30384f1bdb49a0bbfbfc3626eede` |

All 79 frozen members matched the manifest hashes/lengths. The four earlier feasibility report hashes recorded in the raw-context JSON also matched their preserved files. Draft1 and the original independent review retain the exact hashes above.

| Frozen domain source / code | SHA256 |
|---|---|
| F `exports/owa_ontology/v1/ontology_entity.csv` | `35af823973b1d0377365efbcc68f184a83cac787f12dfecf983fb31190239d16` |
| F `exports/owa_ontology/v1/ontology_field.csv` | `c0c17e8f0115f86b140e40a9e2cc02b1601bcca93f2d932e21736031d8aa6e17` |
| F `exports/owa_ontology/v1/chunk.csv` | `6c8bc167db9c0009e5cb21c259ac191b81e8e721897487110a6946276fb7aca8` |
| F `scripts/lib/semantic_lexical_context.mjs` | `ed19d8afc0293ab62a0bc5f64a0dfb6966a9f39b546343c385df98153701e1d1` |

| Inspected main interface | SHA256 |
|---|---|
| M `scripts/lib/erp_knowledge_mcp_core.mjs` | `bd6f00321d41b431a12cd2ed5ed3718428f6a898797a34ad1228a97bef844866` |
| M `scripts/lib/erp_knowledge_mcp_profiles.mjs` | `a53cca533e94624f42abdbb6f5f2acf5322dfaa7c132d6de674ff322efa2bade` |
| M `scripts/lib/semantic_worker_pool.mjs` | `0b34d7bac67690f21f32a30372c49776570898ed8e664f9c81b6d1baaafabdd8` |
| M `scripts/lib/semantic_worker_generation.mjs` | `f7082d1546966ef6946b630b3d43ddc3d22326e22a7bc8266618ea5c16a165d0` |
| M `scripts/lib/semantic_worker_entry.mjs` | `4e73ce24526ef627cd9c955ee577e8e3a60db7b89ae34dc9e8a9b048b0aaebe6` |
| M `scripts/erp_knowledge_mcp_http_bridge.mjs` | `718770329c7177ca66e8eaa8b28dc3c389db8d817959cb7738d2f6b0398ad4e5` |
| M `scripts/lib/owa_offline_harness.mjs` | `69cba48debc021073d7996c2256036d9893c022d47b3ec7970709981d39acde5` |

Script-tree checksums match the preserved baselines: W **270 files**, digest `ee7e9729afe27351311aa73f207de2f86b0a6468495b6792792f97eed7865f5d`; M **248 files**, digest `dd467a09268d33ce6d1f3c8f84352b0592fd7fbf09b682aa4ae9355d6897249d`. The digest is SHA256 of compact sorted-key JSON of path-sorted `{path,bytes,sha256}` entries. No existing draft, review, report, seal, source or script is changed by this review.

## Remaining user decisions

1. Written acceptance/rejection of the **raw-record-only** server role, with source interpretation and preservation of semantic qualifications remaining the caller's responsibility. This is not acceptance of full SQL mapping or old question success.
2. Written acceptance/rejection of the **new** 8-record / 16,000-UTF16-canonical-fields / 2-owner budget, complete mandatory E charging, and bounded two-discover/one-get workflow with actual discovery exposure. Legacy 2 sources / 3 units / 4,000 remains unchanged.
3. Written acceptance/rejection of the immutable OWA E/F/C data/code ABI, trusted controller root, authorized-only worker loading, and separate 8 MiB data / 2 MiB runtime code ceilings; then a separately authorized private-PoC execution plan. Live implementation/publication/deployment do not follow from this review.

Actual compiler/verifier correctness, index/code sizes, enforced runtime schemas/authorization and both-worker bindings remain unmeasured. Cold build, independent verification, authorized load/hash work, warm calls and the full client transcript must be measured separately. Old A8 remains **FAIL/BLOCKED at 1.25**, with no initialization-offload PASS; known20 remains known regression. Contract mechanics success is not natural-language client success, fresh-holdout performance or release readiness.
