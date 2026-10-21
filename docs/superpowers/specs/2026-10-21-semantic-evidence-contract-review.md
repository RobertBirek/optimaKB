# Independent design review: explicit semantic evidence contract

**Verdict: IssuesFound — 5 concrete planning blockers.**

Date: 2026-10-21. Reviewed design: `2026-10-21-semantic-evidence-contract-design.md`, SHA256 `83d401abce569a866ea59782a86eefd3fe4056d219156a79090d7e9e7d346757` (29,701 bytes). Line references below refer to those exact bytes. Review authority: `.superpowers/sdd/explicit-semantic-design-20261021-brief.md`.

The two-tool architecture is reasonable. This revision is not yet an exact, independently implementable contract: wire types, proof/context edges, qualification closure, supported grammars, and the compiled snapshot ABI still require decisions that an implementer would otherwise invent. These findings request design clarification, not implementation or a broader product scope.

**Scope adjustment requiring an explicit user decision:** `field_definition` in place of full physical SQL mapping is a defensible v0.1 boundary. F metadata proves logical-owner declarations and descriptions; same-owner table metadata does not prove that every field physically resides in that table. Accepting this adjustment does not complete the original multi-field SQL-mapping task or establish full success on its old questions. The budget-option report's composite SQL-mapping inference is not adopted as proof of physical mapping.

## Review method and evidence boundary

- Read the complete design, binding brief, and both feasibility report/JSON pairs.
- Independently used Python standard-library file reads, SHA256, JSON/CSV parsing and UTF16-length arithmetic on frozen EsJ4gr. No application modules were imported or run. All 79 manifest members matched their declared lengths and hashes; only E/F/C runtime CSV contents supplied domain facts.
- Read existing core/profile/worker/bridge and frozen parser/catalog interfaces as source text. Main integration evidence is from `/docker/openspg`; functional/source evidence is from `/tmp/opencode/semantic42-frozen-EsJ4gr`. Dirty worktree code is not substituted for either baseline.
- No tests, controller/factory calls, CPU benchmarks, HTTP/provider/service operations, corpus operations, nested agents, implementation edits or commits. This report is the sole new worktree file from this review. Proposed tool names below denote unimplemented interfaces, not callable tools.

## Findings requiring resolution

### I1 — The public wire and error contracts are not closed

**Location:** design §§5–6, L53–88, L93–136; §9, L174–188. Binding brief L16, L21–23, L32.

**Evidence / concrete blocker:** The document promises dedicated strict input/output schemas, but discovery's output is a prose field list. `Candidate`, discovery `origin_refs`, omission notices, `SourceGroup`, `Unit`, provenance-tuple values, and top-level output/error types have no complete structural definitions. L152 additionally promises unit qualification links that have no defined field/type. Even the typed `Result` leaves `missing.property` open and its reasons as a comment. Discovery has no defined outcome for an unknown/ambiguous scoped `entity_ref`; the per-obligation rule only describes evidence. `Toolerror SNAPSHOT_MISMATCH`/`SOURCE_SNAPSHOT_CHANGED` does not define an MCP `isError` payload or its text/structured parity. A client or independent validator cannot determine all legal outputs or validate the advertised exact contract.

Current main core L280–299 only declares generic query schemas; L548–568 coerces/defaults arguments and dispatches by name rather than validating these proposed types. There is no existing strict typed-schema/error adapter that fills this gap.

**Required resolution:** Add complete closed wire definitions (JSON Schema or equally exact normative types plus validation rules) for both inputs, both successes, every nested source/unit/candidate/reference/notice object, and controlled tool errors. Specify required/optional/null fields, literal enums, cardinalities, UTF16-length enforcement, cross-field rules, and discovery's invalid/missing/ambiguous-ref behavior. Define the coverage/knowledge legality rules used by the validator, including budget-limited results and context failures, rather than allowing different handlers to choose combinations independently. Distinguish RPC validation/denial errors from normal per-obligation missing results and snapshot tool errors. Include a nonexecuted full success example and error example that actually instantiate the closed types. This is contract work; it does not require registering tools.

### I2 — Proof edges cannot currently express the promised shared and qualified evidence

**Location:** design §6, L111–134; §7, L152–158.

**Evidence / concrete blocker:** L134 requires every referenced unit to be of the same entity/**field/aspect**, while L158 allows one common unit to serve several obligations. The proposed contractor proof uses K1 entity-wide status and K5 document context for three distinct field obligations. Those units are not intrinsically units of each individual field/aspect. A shared bank B2/B3 unit can likewise support different requested aspects. No normative applicability edge reconciles these rules.

`SourceFact` carries qualifications, but an unknown/tentative/conflict `limitation` has only `kind`, `text`, and `unit_ids`; there is no qualification field on it or on `Result`. Thus an unknown-only meaning result cannot structurally attach the promised entity/document-scoped status/date context without inventing a fact, putting unrelated text into the literal unknown statement, or inventing an extra output key. Finally, L134 requires a confirming range for each value/qualification, but only whole-unit ranges are defined. A pointer to a long whole body is not a specified per-fact support-range representation.

**Source witness:** BRa_IBAN's unresolved question is B3 body L21; its historical provenance/date and validation are different ranges in B3. Owner-wide status is in B1, not B2/B3. Contractor F47/F48/F50 are independent declarations; K1 status and K5 date are separate records, not field-local properties of all three F rows.

**Required resolution:** Define a proof/applicability model that separates a unit's physical identity from its authorized use by an obligation. Specify direct field proof versus entity/document context, explicit shared-unit edges, and local support spans or metadata-key pointers with a fixed coordinate system. Give limitations/unknown variants the same qualification/provenance capability as positive facts. Require every edge and support range to resolve to an emitted unit and preserve its actual owner/cohort; sharing must not relabel a record's field, aspect, version, or historical scope. Provide exact contractor and BRa_IBAN examples showing how this works.

### I3 — Required qualifier closure and cross-record compatibility remain discretionary

**Location:** design §4 L46–49; §7 L140–158; §8 L164; §11 L207–209; P3/P4 L219–221.

**Evidence / concrete blocker:** The document says to calculate required closure but does not specify the rule that determines it. L156 says document dates/status *can* be shown; L158 forbids omitting *required* context. It is therefore unresolved whether K5's date or B1's status must accompany the representative results, which versions/paths may supply that context, and what state results when required context is unavailable or ambiguous. Group separation by raw provenance columns is not itself a context-compatibility rule.

On the actual data F has no `sourcePath`/version/date columns, whereas C has a `sourcePath`. Same unique entity ownership authorizes attribution to the logical entity; it does not establish that an F row and a C document are contemporaneous. The design correctly disclaims common historical SQL versions, but still needs an exact rule for associating a C entry's status with an F declaration without making it the F row's verification/version. Across distinct C paths or explicit revisions, same-owner context must not silently qualify another document.

The missing closure decision is material to the budget, not a wording issue:

| Source-backed arrangement | UTF16 characters | Groups / units under proposed key | Meaning |
|---|---:|---|---|
| Complete F47/F48/F50 canonical JSON | 1,288 | F: 3 units | Declarations; no table proof |
| F + whole K1 | 2,541 | 2 groups; 3/1 | Includes separate contractor-entry status |
| F + whole K1 + complete K5 metadata section | 2,694 | 2 groups; 3/2 | Includes C document-date context, not an F date |
| F + whole K1 + whole K5 | 4,253 | 2 groups; 3/2 | Fails character cap |
| B2 + B3 whole bodies | 3,157 | 1 group; 2 units | Type and specific unknown; no B1 status |
| B2 + B3 + original B1 status section | 3,243 | 1 group; 3 units | Includes status; subject to context-section admission |
| B1 + B2 + B3 whole bodies | 4,374 | 1 group; 3 units | Fails character cap |

K5's complete final metadata section is 153 characters. B1's exact status section, from its heading up to the next peer heading, is 86 characters **including its original trailing two LF characters**. These are manual decoded-source measurements, not outputs of an implemented section reader. Neither the 2,694 nor 3,243 arrangement proves closure until the rules make those contexts sufficient. The design already qualifies its 3,157 claim; it should now settle the rule rather than imply that arithmetic settles it.

**Required resolution:** Define a query-independent closure/applicability algorithm and the accepted status/date/condition forms. State exactly which context is mandatory per aspect, how it is found within a literal owner + source-document cohort, what absent versus known/mismatched structured provenance permits, and how multiple compatible or incompatible contexts are retained or rejected. Define the explicitly scoped treatment of an unversioned F declaration alongside a C entry's status; never infer a common ERP version. Choose mandatory versus optional document dates explicitly. Specify missing/ambiguous/unsupported-context outcomes and source-budget charging. Include fully costed expected closure sets for all three representative families, including overview, without repairing split chunks or using hidden metadata.

### I4 — The closed source-form contract does not cover all four promised aspects

**Location:** design §6 L102–109; §8 L162–166; P1/P3/P4 L215–221. Feasibility initial report §§4–5.

**Evidence / concrete blocker:** §8 lists classes of readers, not a closed grammar or aspect extraction rules. In particular, `entity_overview` needs definitions and table roles, but the listed readers do not define the business-description paragraph or bank `**Tabela główna**` / `**FK**` role-bullet forms. L1 uses a different role table. No rule defines when these are supported and how their local statuses/roles map to facts. The bank/ledger overview witness therefore has source material but not a specified reader contract.

Field bullet typing also requires a decision that cannot be recovered from the general phrase “shared type”: B2 body L14 types `BRa_KursL` and `BRa_KursM` separately, L15 writes `` `BRa_SaldoBO`, `BRa_SaldoBOSys` (decimal(15,2)) ``, while L13 and L19 contain untyped lists. The type's distributive scope must be explicit; no reader may spread a type onto untyped peers by guesswork. B3's numbered BRa_IBAN question must remain an unknown-meaning mention, not a declaration or a second asserted `varchar` type. K3/K4 must remain unsupported as complete mapping units.

Frozen catalog L189–240 uses split-pipe rows, loose heading matching and first-name bullet handling; its source fields are declaration hints, not typed proof objects. Frozen statement reader L292–295 only handles a narrower operation/storage question. Neither supplies the unspecified new grammar. Marking all unfamiliar material unsupported is legitimate, but cannot simultaneously count an aspect as complete using a less qualified metadata label.

**Required resolution:** Add a finite source-form/admission table, with root/heading/header/cell requirements, recognized metadata keys, definition/role-bullet forms, per-name type binding, meaning-question/marker forms, qualification scopes, and fail-closed behavior at record/section/atom boundaries. Define how supported/unsupported/ambiguous diagnostics attach to records **and relevant aspects/fields**, so unsupported indexed material cannot be ignored to manufacture `complete` or become a global absence claim. Include literal positive/negative examples from the frozen CSV and define what each form may assert. This remains a generic four-aspect compiler over all 366 records, not a registry of three successful examples.

### I5 — Compiler → index → lookup snapshot ABI and integrity lifecycle are still unspecified

**Location:** design §7 L140, L152–154; §8 L166–170; §10 L197–201. Binding brief L24, L28, L32.

**Evidence / concrete blocker:** The document specifies an 8 MiB index bound and a conceptual `snapshot_id` hash, but no exact index payload/manifest schema, compiler output contract, or lookup input contract. “Canonical payload,” “compiler closure SHA,” unit IDs and group IDs lack canonical byte/ordering/hash definitions. `record_hash` names `{line,endLine,fields}` and header order but not its exact serialization; `rendererVersion` participates in identity without a defined version field/registry. Independent compiler, lookup and verifier implementations cannot yet reproduce or validate the same identities.

The document also leaves “verify the active index” abstract: it does not specify the trusted manifest/index hash root, when compiler-closure identity is checked against the pinned worker generation, how an index is loaded identically by both workers, or controlled results for absent/corrupt/unknown-format/over-bound index artifacts. `SOURCE_SNAPSHOT_CHANGED` only covers changed source bytes. L201 explicitly defers the shared compiler/index/lookup contract; that is a design deliverable needed before implementation planning can safely divide this work.

Current `captureSemanticGeneration` pins code, not corpus/index bytes. Its loader rejects imports outside its fixed inventory. Existing worker messages carry request/profile/scope information, not a compiled-index generation contract. None is an existing API for the new ABI.

**Required resolution:** Define the immutable index/manifest and compiler/lookup/verifier interfaces, including complete record accounting, diagnostic/qualification/proof edges, explicit source-cohort keys with presence/value handling, and all deterministic serialization/ordering/hash algorithms. Define data/code/index binding, trusted load-time validation, source-change checks, and failure outcomes for unavailable or invalid indexes. State how the same pinned immutable artifact is provisioned to both workers without lazy rebuilding, per-query parsing, broadening file access, or treating an 8 MiB data artifact as part of the 2 MiB code allowance. Concrete module names and implementation steps can follow in the execution plan, but these shared types and invariants cannot be invented independently by its tasks.

## Source facts independently confirmed

### Inventory and identities

- EsJ4gr manifest: SHA256 `9f4275a2400e7853f7b8bcdcfe3f4463c3ad30384f1bdb49a0bbfbfc3626eede`; 79 unique members with matching hashes/lengths. Frozen harness runtime predicate is `(STATIC_FILES.includes(path) && path !== BASELINE) || MODULE_FILES.includes(path)` (offline harness L20–38; regression harness L146–180). Thus `.files` has 43 domain files; `.allFiles` is not an allowed fact-input set.
- Allowed new index input is exactly 3 CSV files, 366 data records, 406,996 bytes. Namespace is OWAOntology. No reviewer Markdown, gold bank, old answer or evaluation result supplied a domain fact for this review.
- E physical L171/L172/L173: `OWA_ENTITY_ENCJA_KONTO_BANKOWE`, `OWA_ENTITY_ENCJA_KONTO_KSIEGOWE`, `OWA_ENTITY_ENCJA_KONTRAHENT_KARTOTEKA_KONTRAHENTOW`. All three `mainTable` values are empty.
- Bank has zero F declarations. BRa_IBAN's concrete source declaration is B2 L9, owned through literal `sourceDocumentRefId`; inventing an `OWA_FIELD_*` ID would be incorrect.
- F physical L47/L48/L50 have exact contractor `entityRefId`, names `Knt_OpeZalID`, `Knt_OpeModID`, `Knt_TS_Mod`, types `int`, `int`, `datetime`, and descriptions `Operator zakładający rekord`, `Operator modyfikujący rekord`, `Data ostatniej modyfikacji`. Literal `mcpField=CDN` proves neither an MCP parameter nor a table.
- K3 ends with the incomplete Knt_Kraj row; K4 begins with its suffix and lacks a header. Whole-body presence does not authorize table reconstruction. K2's `Podstawowa / CDN / Kontrahenci` role cannot by itself establish every F row's physical column mapping. Ledger L1 says `Plan kont`, not an automatically inferred `PRIMARY` role.
- B2 declares `BRa_IBAN (smallint) — NOT EXPOSED BY MCP`. B3 asks whether it is a flag or ID and retains a 2026-07-15 historical provenance assertion and unfinished validation. This supports separating source-known type from source-unknown meaning, not choosing one interpretation or claiming current schema verification.

### Group-definition change is explicit and requires acceptance

The old helper is not the proposed new source contract. Frozen answerer L416–425 groups chunks by literal owner + owning path + export version, but non-chunk metadata by individual record. For F47/F48/F50 + K1/K2, the counts are **5** under the initial strict physical-record option, **4** under the old helper, and **2** under the proposed owner/export grouping. Five physical records remain five physical records.

Design §7 further makes raw `sourcePath`/`localSnapshotPath` presence/value part of its new tuple; the budget-option sketch had left paths outside its proposed key. This is an explicit design refinement to approve, not a reason to reinterpret old results. It does not change these particular witnesses' fit because their C paths are identical. Body dates remain separately sourced document-context statements, not tuple values propagated across records or to F.

Full raw-fields canonical metadata JSON independently measures **431 + 433 + 424 = 1,288** UTF16 characters. The older mini-table total of 892 is a different representation. The budget-option arrangement F + whole K1/K2 measures **3,751**; with complete K5 metadata section, **3,904**. These fit the proposed numerical caps, but do not override the design's narrower `field_definition` scope or I2–I4's provenance/admission requirements. Every physical record, qualification unit and extract character must still be charged.

## Existing integration boundary: confirmed, not implemented

Design §10 correctly identifies separate typed handlers and explicit integration work. These are required future edits, not current callable capability:

| Main source interface | Observed contract | Future work that must appear in the execution plan |
|---|---|---|
| `scripts/lib/erp_knowledge_mcp_core.mjs:L280–299,L548–615` | Generic `query/as_of/limit` domain schemas; `answerQuestionTool` dispatch; no new typed methods | Dedicated definitions, runtime input/output validation, scoped authorization and typed dispatch before the generic branch; no answerer/provider/learning fallback |
| `scripts/lib/erp_knowledge_mcp_profiles.mjs:L19–23` | Four semantic methods plus common `list_knowledge_bases` | Explicit private PoC profile exposure/allowlist policy; existing public profiles are not automatically authorized |
| `scripts/lib/semantic_worker_pool.mjs:L6–10,L83–107` | Four-name worker allowlist; max 2 workers / 8 queued | Admit both proposed names on the intended worker path: **six semantic names if retaining the existing four**, plus the independent profile/common-tool list; preserve bounds and cancellation/isolation |
| `scripts/erp_knowledge_mcp_http_bridge.mjs:L247–300` | Bearer auth precedes dispatch; non-worker request falls through to core at L292–294 | Explicitly ensure new requests are worker-routed after profile/effective-scope checks; no accidental synchronous path when a name is omitted |
| `scripts/lib/semantic_worker_entry.mjs:L6–25` | Reconstructs trusted profile/scope; controlled request errors | Carry/validate the specified immutable-index binding; no client hash as permission |
| `scripts/lib/semantic_worker_generation.mjs:SEMANTIC_CODE_FILES,L34–50` | Fixed code inventory, rejecting unlisted dependencies; total 2 MiB | Add every newly imported runtime module/dependency to the pinned inventory while preserving the ceiling |
| `scripts/lib/owa_offline_harness.mjs:MODULE_FILES` | A separate fixed offline module inventory | Consistently bind the new fixture's runtime closure; new exact-kind manifest/index fixture, not modification of the sealed EsJ4gr 79-member bundle |

These observations are file evidence only, not proof that an auth guard, validator, index loader or six-method profile already exists. The new contract must deny missing/empty effective OWA scope before **scope-index/body** access, reject forbidden batch refs before any batch lookup, distinguish stale snapshot/source bytes, and never substitute another owner/field. The design states those requirements; the unresolved types/ABI must make them executable and verifiable.

The specified client bound is sound: at most two discoveries plus **one** evidence batch per final answer, at most three calls; clarification may stop earlier. The transcript verifier, not extra server sessions, must enforce no multi-batch budget laundering. Contract mechanics success is distinct from natural-language client success. Known20 remains known regression; a future independent holdout follows the frozen PoC/client protocol. Cold index build, initial load, warm lookup and full transcript costs remain separate. No initialization shift or successful contract fixture changes old A8 **FAIL/BLOCKED at 1.25** or creates an old-A8 PASS.

## Exact evidence fingerprints

All hashes are SHA256 of full file bytes. `W` = `/tmp/opencode/openspg-semantic-material-20261017`; `F` = `/tmp/opencode/semantic42-frozen-EsJ4gr`; `M` = `/docker/openspg`.

### Governing documents and feasibility reports

| Root / path | Bytes | SHA256 |
|---|---:|---|
| W `docs/superpowers/specs/2026-10-21-semantic-evidence-contract-design.md` | 29701 | `83d401abce569a866ea59782a86eefd3fe4056d219156a79090d7e9e7d346757` |
| W `.superpowers/sdd/explicit-semantic-design-20261021-brief.md` | 6110 | `e049de660b2e9db9b6c70e0355e8fb714f3493bdba1134dccdb03d5eee492078` |
| W `.superpowers/sdd/explicit-semantic-runtime-feasibility-20261021.md` | 30937 | `ab990a10e00dcf090cad0687f1231a83db2ade80ebb7bc54eaea22822eb4420d` |
| W `.superpowers/sdd/explicit-semantic-runtime-feasibility-20261021.json` | 43753 | `c365d20de50669cb68c7b29d3225377c0efddf9a1fe7c83bc4640e1c0799110d` |
| W `.superpowers/sdd/explicit-semantic-runtime-feasibility-20261021-budget-option.md` | 17914 | `4d46ce802dc9039add1f138522f86569f7870bec9f89078c0b8954c1fe820ebd` |
| W `.superpowers/sdd/explicit-semantic-runtime-feasibility-20261021-budget-option.json` | 24426 | `def38d492c7c4bcf2afc6ba16774cfff6a06a8c9e5b98d8b2c127a0fabad69c5` |
| F `manifest.json` | 25850 | `9f4275a2400e7853f7b8bcdcfe3f4463c3ad30384f1bdb49a0bbfbfc3626eede` |

### Domain sources and physical witnesses

| Frozen path | Bytes / data records | SHA256 |
|---|---|---|
| `exports/owa_ontology/v1/ontology_entity.csv` (E) | 74880 / 67 | `35af823973b1d0377365efbcc68f184a83cac787f12dfecf983fb31190239d16` |
| `exports/owa_ontology/v1/ontology_field.csv` (F) | 25729 / 109 | `c0c17e8f0115f86b140e40a9e2cc02b1601bcca93f2d932e21736031d8aa6e17` |
| `exports/owa_ontology/v1/chunk.csv` (C) | 306387 / 190 | `6c8bc167db9c0009e5cb21c259ac191b81e8e721897487110a6946276fb7aca8` |

Physical ranges are one-based inclusive CSV record lines, not logical-row indices. Chunk aliases below denote complete exact IDs `OWA_CHUNK_KONTO_BANKOWE_{n}` (B), `OWA_CHUNK_KONTO_KSIEGOWE_{n}` (L), `OWA_CHUNK_KONTRAHENT_KARTOTEKA_KONTRAHENTOW_{n}` (K).

| C record | Physical range | Whole content UTF16 chars | SHA256 of decoded content UTF8 |
|---|---|---:|---|
| B1 | 1954–1981 | 1217 | `db0d8b0eea67ecfd08eef876e4b1e5b3efbebdff2a7063ada26d17fd48897cc3` |
| B2 | 1982–2009 | 1743 | `1e67e167abe0e721d8c27fd3509853a1f78447fec9bf7e2cee4931272c95a1d5` |
| B3 | 2010–2044 | 1414 | `63edf94ba8f2be2e494714ca90334634d6c1ce009ef59b863748600359dc50b1` |
| L1 | 2045–2077 | 1709 | `cf882809093917288543145bce8c9240e7901228bfd757c6ffbfdfb910446bfa` |
| L2 | 2078–2104 | 1629 | `3ab192da3b5a59a09974683c0a03a8a4676a7406af5bc3606936608c8018df02` |
| L3 | 2105–2124 | 865 | `ddb28f20a139a9ce3ebc092f0d70d15530cca6c065606cfe91b43879903a459f` |
| K1 | 2125–2143 | 1253 | `90cb020b510f5420c96df37fb098074aaff5dccad64715cb7b027a38a1dbe0cc` |
| K2 | 2144–2163 | 1210 | `7d7223063fb1caf7bc62a737d41d5f577ac7535a658156ee63b324880475827c` |
| K3 | 2164–2184 | 1800 | `b23aae2786049662b7ba0b4147de7fa7b917f4946eb5448277e52f4e71bede2d` |
| K4 | 2185–2199 | 1403 | `b65768d418b0e63bbf093fa660da36f0a7fc376b0a3b9d791fd1017d629e3d6d` |
| K5 | 2200–2229 | 1712 | `415d4edb1169e2ce8964c592653006e57cc185aef4305b1b548d06d43211cf08` |
| K6 | 2230–2238 | 446 | `941e71f2969a807caeac11df749ab0d2d3475eaca85cfbf0e93bad07c91c83de` |

F47/F48/F50 exact IDs are `OWA_FIELD_KONTRAHENT_KARTOTEKA_KONTRAHENTOW_KNT_OPEZALID`, `OWA_FIELD_KONTRAHENT_KARTOTEKA_KONTRAHENTOW_KNT_OPEMODID`, and `OWA_FIELD_KONTRAHENT_KARTOTEKA_KONTRAHENTOW_KNT_TS_MOD`. Their complete canonical metadata text hashes are respectively `99eff6adc199c70c342ee6d474750a279bf35099480f8f74f705336340d62b4c`, `9a1fe0f1a3bdf35ec5ddb9eeba452033f794d4e869efa07c667b599d2cabc5fc`, and `23bb7687637709139127db080bad745a3b77dc6ff3cd52a3c8ad90aac65adf78` (the budget-option's declared raw-fields JSON representation).

### Inspected code interfaces

| Root / path | SHA256 |
|---|---|
| M `scripts/lib/erp_knowledge_mcp_core.mjs` | `bd6f00321d41b431a12cd2ed5ed3718428f6a898797a34ad1228a97bef844866` |
| M `scripts/lib/erp_knowledge_mcp_profiles.mjs` | `a53cca533e94624f42abdbb6f5f2acf5322dfaa7c132d6de674ff322efa2bade` |
| M `scripts/lib/semantic_worker_pool.mjs` | `0b34d7bac67690f21f32a30372c49776570898ed8e664f9c81b6d1baaafabdd8` |
| M `scripts/lib/semantic_worker_generation.mjs` | `f7082d1546966ef6946b630b3d43ddc3d22326e22a7bc8266618ea5c16a165d0` |
| M `scripts/lib/semantic_worker_entry.mjs` | `4e73ce24526ef627cd9c955ee577e8e3a60db7b89ae34dc9e8a9b048b0aaebe6` |
| M `scripts/erp_knowledge_mcp_http_bridge.mjs` | `718770329c7177ca66e8eaa8b28dc3c389db8d817959cb7738d2f6b0398ad4e5` |
| M `scripts/lib/owa_offline_harness.mjs` | `69cba48debc021073d7996c2256036d9893c022d47b3ec7970709981d39acde5` |
| F `scripts/lib/owa_offline_harness.mjs` | `d2b5aea832f0950ddfc426954199563252b007c5e7a46a7998c77f244c084cc3` |
| F `scripts/lib/semantic_regression_harness.mjs` | `3093557012123f7a70b77fed135725fa614512067703669bd1e1345effb7b5c7` |
| F `scripts/lib/semantic_catalog.mjs` | `ab96f64f3b1f75727d12904038cb6730bbd595e7a019076f5e7dcd5443a8821e` |
| F `scripts/lib/semantic_source_statements.mjs` | `db42556548b3596bd58cd2c1c4d09dd5f1e202ccbfd9c0b28c2de89cd89bfcf8` |
| F `scripts/lib/owa_evidence.mjs` | `542097e6ffe413daed3640803f5d0d82cae2094b5588315808cd880832cb41f6` |
| F `scripts/lib/knowledge_retrieval.mjs` | `e91572913db4ef7d61ec4c2b75083d4277ac3ed0a0ca437983d778d95b5decd8` |
| F `scripts/erp_knowledge_answer.mjs` | `52a5f8e525b18ac783919d3c0c4afff75f5277f7aec0c1d5275b57efbb7692c8` |

These main hashes matter: the worktree feasibility report's generation-file hash describes a different dirty file and is not substituted for main's generation inventory.

## Remaining user choices and disposition

1. Accept/reject the **definition-only** four-aspect v0.1 boundary in place of full contractor SQL mapping. Record this as a bounded scope change, not full mapping success.
2. Accept/reject the exact new **`versioned_export_owner`** grouping, including structured provenance presence/value and path handling, independent physical-record accounting, and 2 groups / 3 units per group / 4,000 decoded UTF16 extract characters. It is neither old grouping nor proof of one historical schema version.
3. Accept the full raw-fields metadata JSON, whole-body and strictly closed original context-section representations; decide mandatory status/date closure as required by I3. Source dates remain contextual statements, never inferred F-row/ERP-version dates.
4. After I1–I5 are resolved and the written design is accepted, authorize a separate execution plan/private PoC. Publication, live tool exposure, deployment and later client generalization evaluation remain separate decisions under the brief.

File-only evidence establishes source availability and static interface constraints. It does **not** establish implemented compiler correctness, runtime authorization, a passing PoC/client, latency savings or release readiness. No concrete blocker requires changing the frozen sources, old approved work, reports or seals.

Preservation reference: scripts inventories match the earlier reports: W **270** files / digest `ee7e9729afe27351311aa73f207de2f86b0a6468495b6792792f97eed7865f5d`; M **248** files / digest `dd467a09268d33ce6d1f3c8f84352b0592fd7fbf09b682aa4ae9355d6897249d`. Digest is SHA256 of UTF8 compact sorted-key JSON of path-sorted `{path,bytes,sha256}` entries. Governing-document and frozen-member fingerprints above are the preservation check targets; this review does not rewrite them.
