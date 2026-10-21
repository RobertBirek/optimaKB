# Independent final-correction review — v3 discovery amendment

**Verdict: Approved. New blocking issues: 0.**

Date: 2026-10-21. This is a bounded independent review of the **v3 amendment plus its exact incorporated v2 base**. It approves the written correction, not implementation, an executed descriptive workflow, or the user's pending raw-role/budget decision. The original reviews retain their own subjects and verdicts.

## Exact review target and constraints

- Amendment: `docs/superpowers/specs/2026-10-21-semantic-evidence-contract-design-v3.md`, **32,059 bytes**, SHA256 **`52d5a93c2a9ba4ab8ee331e653a02eeed3f787e6e2f3f2fe79034d5e00312b13`**.
- Incorporated base: `docs/superpowers/specs/2026-10-21-semantic-evidence-contract-design.md`, **81,104 bytes**, SHA256 **`eb3dca5e6864133c8982005b79c3269d3de5c7193a5b1a847cd830541505d380`**.
- Correction authority/source record: `.superpowers/sdd/explicit-semantic-discovery-description-correction-20261021.md`, **16,470 bytes**, SHA256 **`93a6b19a8fbbdb456af041aa8b376b4ba6e68bde60610028e93d648b6fd21eef`**.

Read the complete amendment and private correction record, checked relevant incorporated search/compiler/diagnostic clauses against the preserved base, and independently verified the source arithmetic and examples. Existing v2 I1–I5 closures carry forward within their unchanged raw-provider scope; unrelated transport/lifecycle design was not reopened.

All verification was file reading/hashing and Python standard-library CSV/JSON/Unicode/string arithmetic. No source lexer, Posting/index/compiler implementation, application module, test, controller, factory, CPU benchmark, provider/service/HTTP operation, corpus operation or agent was run. No code edits or commits. This review is the only file created by this review task.

## Correction findings

### 1. Description discovery closes the identified product-goal gap

**Locations:** v3 §§1, 3–4; especially L40–76. Replaces incorporated v2 §5 L150–169's name-only metadata search rules and their compiler/verifier interpretation.

The correction explicitly includes **complete E.description and F.description** as metadata `Posting.search_value` values for already admitted E/F identity candidates. The complete cell participates regardless of the 240-UTF16 display cutoff. A long description is wholly omitted from `metadata_hints` with the existing omission marker; it is not omitted, shortened or sampled in search. The compiler and verifier must enumerate the full permitted values for every admitted owned E/F row and reject snippets, another row's text or display prefixes.

Identity origins remain E.id or the selected raw F key, with null body/span/token fields. Description search neither creates a new owner/field nor adds a proof edge or wire field. Its ordinary metadata words may include quoted, fenced or RHS text without turning those words into body identifier mentions or verified facts. The independent body-mention channel retains the pinned lexer's strict exclusions. F.summary and C.content acquire no new plain-prose metadata channel.

The preserved v2 review did not establish the intended description-driven discovery goal. V3 addresses that specific missing search-value rule without pretending the old technical-name-first example demonstrated it.

**Disposition: Closed for design.** Full-ranked runtime exposure remains a future acceptance condition, not established by this review.

### 2. Raw metadata identity is separated from technical-token grammar

**Locations:** v3 §2 L20–34 and §4 L78–84; supersedes v2 §5 L148 and the old `invalid_field_name` admission meaning in §8.

F admission now uses the exact raw `fieldName` if it is 1–128 UTF16 and contains no U+0000–U+001F/U+007F; otherwise it considers the explicit raw `mssqlColumn` fallback under the same bound. Backticks, other quotes, brackets, spaces and punctuation are retained, with no trim/unescape/SQL-name repair. These spellings already fit the incorporated Candidate.name/Id wire type; no schema extension is needed. Raw differences remain distinct candidate identities.

The diagnostic rules are closed: an unsupported nonempty primary is diagnosed at `fieldName`; a usable fallback is anchored to `mssqlColumn` and cannot erase that diagnostic; an unusable fallback considered after a failed primary is diagnosed at `mssqlColumn`. An empty primary with a usable fallback is normal fallback. A usable primary prevents fallback inspection/selection. Metadata punctuation alone does not create body malformed/unclosed diagnostics. All rows and their exact raw fields remain retained even when no selector is admitted.

Body identifier names still use the unchanged decoded technical-token grammar, ≤128 UTF16, with opaque/RHS/fence/malformed/wildcard exclusions. A raw quoted F name and a decoded body mention remain separate kinds and IDs. Metadata declaration classification certifies neither SQL syntax/existence nor table/API mapping.

**Disposition: Closed for design.** The source fixture exercises no invalid-primary/fallback branch; those remain future implementation checks.

### 3. Search, compiler, verifier and identity rules are consistent

**Locations:** v3 §§3.2–4, L44–95; §7 L144–157.

The permitted metadata value set is finite and exhaustive: existing E identity/name/alias values plus complete E.description; selected raw F name/F.name plus complete F.description. Multiple values reuse the identity origin; whole Posting tuples and origins retain their separate deterministic deduplication rules. The replacement precedence is explicit over the incorporated v2 name-only/technical-admission clauses, including §8's references to those rules.

The original normalization, tiers, kind ordering and tie-breaks remain binding. In particular:

- Exact and folded-whole matching retain raw complete values, including quotation characters.
- The 2–8-item exact technical-set tier retains its technical grammar and literal membership. Relaxed metadata admission does not add quote decoding to that tier.
- The token tier remains **AND**, with no OR rewrite or cross-candidate pooling. Punctuation-insensitive matching never changes the returned raw name.
- No across-tier metadata-priority exception is introduced to force the descriptive fixture under limit=5.

Wire/enums/ABI literals, record/ref/candidate **algorithms**, budgets, ownership, auth and worker boundaries are unchanged. Source/fields/physical-record refs remain unchanged; newly admitted raw names get IDs under the existing formula. A future changed compiler/runtime and expanded index require **new closure/index/snapshot/manifest bindings** under the existing acyclic chain. “Unchanged algorithm” does not authorize reuse or relabeling of an old generation that lacks descriptions.

Full descriptions can increase a future artifact's size. The inherited 8 MiB data-generation limit still fails closed; it cannot be satisfied by silently cutting description search values at 240 or sampling postings.

**Disposition: Consistent. No new planning blocker identified.**

## Independent file-only source checks

Only frozen EsJ4gr E/F/C CSVs supplied domain evidence. Source cells and ownership refs were read literally; sourcePath values were not followed. Counts below concern **metadata eligibility**, not instantiated postings, full candidate ordering, has_more, a tool result or LLM success.

| Check | Independently verified result |
|---|---|
| Raw F selector admission | 109/109 usable raw fieldName; 0 unsupported; 0 fallbacks required; every fieldName equals its raw mssqlColumn |
| Backtick-wrapped F names | 41, physical F lines 62–102 inclusive; both selector columns contain the actual backticks |
| Descriptions | E 67/67 and F 109/109 nonempty |
| Description display omission | E 65/67 exceed 240 UTF16, maximum 1000; F 0/109 exceed 240, maximum 47 |
| `operator`, global field metadata | F47/F48/F96/F97: 4 matches, two literal owners; v2 name-only metadata slice: 0 |
| `data`, contractor-scoped field metadata | F49/F50: 2 matches; v2 name-only metadata slice: 0 |
| `operator modyfikujący`, global metadata AND | F48/F97: 2 matches |
| `operator data`, global metadata AND | 0 matches; not OR-expanded |
| E171 description-only `rachunek` | Present in the complete 333-UTF16 bank description, absent from its old name/ID/alias token bag; display omission must not remove the search contribution |

The Unicode arithmetic used only observed ASCII/Latin metadata and standard-library decomposition/category/lowercase operations; it is not a run of the pinned Node environment or source lexer.

Exact raw candidate-ID specimens also recomputed correctly using the unchanged H algorithm:

| F physical line | Raw name, delimiters included as cell characters | Candidate SHA256 |
|---|---|---|
| 96 | `` `Twr_OpeZalID` `` | `2617082c1553e2d215e9be21cc1c5344855f03861cbcb44dde41b3ea38139f7a` |
| 97 | `` `Twr_OpeModID` `` | `93adcfbb784cba42650aee8e56ef1365ddff6c7549fdda0f22b03dc3d7cca38d` |

Both are bound to literal owner `OWA_ENTITY_ENCJA_TOWAR_KARTOTEKA_TOWAROW_I_USUG`. They are formula specimens, not discovery-issued results or a compiled generation.

## Descriptive workflow and budget

**Locations:** v3 §6 L128–140 and §7 acceptance table.

The proposed initial Polish contractor goal contains no technical field/owner IDs, refs, row numbers or gold answer. The first query is global field `operator`; the second is field `data` scoped only by the contractor EntityRef actually returned in the first response, with the returned snapshot. The caller selects the modification date using its returned description. Get uses only refs exposed in those two responses. The witness table is for later assertions, not model prompt injection.

The full-tool expectation explicitly requires actual exposure of all four operator metadata declarations/two owners and both scoped date declarations. This is stronger than the measured metadata slice and remains **unexecuted**. If body-mention competition or cap/rank behavior prevents it, that is a future workflow failure/refinement condition, not permission to inject IDs, change ranking silently or add calls.

For the intended exposed refs, the complete final selection independently measures:

`E173 1312 + F47 431 + F48 433 + F50 424 = 2600 UTF16(C(fields))`.

That is **4 unique complete records / 1 owner**, within the inherited **8 / 16000 / 2-owner** proposal, including automatic complete E charged once. It is not an executed get, qualifier-closure result or complete physical SQL-mapping claim. The inherited two-discover/one-get, one-snapshot and actual prior-exposure checks remain binding. Other base source selections and the ten-record contractor cap failure are unchanged.

## Four inherited synthetic examples

All four v3 fenced JSON blocks are **byte-for-byte identical** to the four in the exact v2 base and parse as JSON. Independently regenerated the 220-byte synthetic E source, record [161,220) at line 2, 277-UTF16 canonical fields, source/raw-record/fields/record/ref/synthetic-snapshot hashes, and discovery/error canonical text parity.

The fixture's description is empty and it has no F selector. The newly added description metadata rule therefore adds no search value or `unmatched` hit, and no new raw-selector decision applies. No example purports to be a complete compiler/index payload or production snapshot. Retaining these wire/hash specimens is normatively consistent; they are not v3 description-discovery test evidence.

## Carry-forward of the original review

| Original issue | Bounded v3 disposition |
|---|---|
| I1 — closed wire/errors | V2 closure retained; no fields/enums/cardinalities/errors added by this correction |
| I2 — proof/record integrity | V2 raw-record/ownership closure retained; description matches and quoted metadata names do not become semantic proof |
| I3 — context policy | V2 complete automatic E, explicit other context and caller responsibilities retained; no status/date inheritance |
| I4 — finite discovery grammar | Corrected metadata value/admission rules explicitly supersede the identified v2 gaps; body-token grammar stays strict and separate |
| I5 — immutable ABI | V2 closure retained; compiler/verifier enumerate the new finite values, and changed code/index requires a fresh trusted binding |

No unrelated scope/code requirements were reopened. **New concrete blocking findings: none.**

## Fingerprints and preservation

`W` = `/tmp/opencode/openspg-semantic-material-20261017`; `F` = `/tmp/opencode/semantic42-frozen-EsJ4gr`. All fingerprints are SHA256 of complete file bytes.

| Root / path | Bytes | SHA256 |
|---|---:|---|
| W `docs/superpowers/specs/2026-10-21-semantic-evidence-contract-design-v3.md` | 32059 | `52d5a93c2a9ba4ab8ee331e653a02eeed3f787e6e2f3f2fe79034d5e00312b13` |
| W `docs/superpowers/specs/2026-10-21-semantic-evidence-contract-design.md` | 81104 | `eb3dca5e6864133c8982005b79c3269d3de5c7193a5b1a847cd830541505d380` |
| W `.superpowers/sdd/explicit-semantic-discovery-description-correction-20261021.md` | 16470 | `93a6b19a8fbbdb456af041aa8b376b4ba6e68bde60610028e93d648b6fd21eef` |
| W `docs/superpowers/specs/2026-10-21-semantic-evidence-contract-design-v1.md` | 29701 | `83d401abce569a866ea59782a86eefd3fe4056d219156a79090d7e9e7d346757` |
| W `docs/superpowers/specs/2026-10-21-semantic-evidence-contract-review.md` | 29753 | `d1e57ea0987a1ef6001f0b155c62a52676bd25cd4dbb1f30791f1da6155e7af1` |
| W `docs/superpowers/specs/2026-10-21-semantic-evidence-contract-review-final.md` | 19819 | `eed88474980e72eabdf10e9f43b7766956ec52ab0f0b8ff02c9c3dcb539f581a` |
| W `docs/reference/Semantic_Explicit_Evidence_PoC_Decision_2026-10-21.md` | 4089 | `4da1520995fc4886fed8c62f2c53c1e62e31ff2ebe94796a68962bb1531ab3dc` |
| W `.superpowers/sdd/explicit-semantic-design-v2-20261021-brief.md` | 6639 | `1535e0e07e324efe7dd5567d6ccf2a004e1cf78377d0855b195a63d63a462b3c` |
| W `.superpowers/sdd/explicit-semantic-design-revision-20261021.md` | 11192 | `4b238e8ff1908a783a0b26abe44ee838f3c7c7415c4b3da4eb969c2b028d8d4a` |
| W `.superpowers/sdd/explicit-semantic-design-handoff-20261021.md` | 6157 | `63644b725bb429f72c95ff9c21fe3ccf016a5fabe5ed4372594899ddc504b97c` |
| F `exports/owa_ontology/v1/ontology_entity.csv` | 74880 | `35af823973b1d0377365efbcc68f184a83cac787f12dfecf983fb31190239d16` |
| F `exports/owa_ontology/v1/ontology_field.csv` | 25729 | `c0c17e8f0115f86b140e40a9e2cc02b1601bcca93f2d932e21736031d8aa6e17` |
| F `exports/owa_ontology/v1/chunk.csv` | 306387 | `6c8bc167db9c0009e5cb21c259ac191b81e8e721897487110a6946276fb7aca8` |

E/F/C counts remain 67/109/190, total 366 records / 406996 bytes. Main published v2, its final review and decision brief byte-match the corresponding preserved W documents. Archive `FILE_INVENTORY.json` still hashes to `b6f3928dc72b50782580367c822dd75fb13de257027d6f87843ae3492f63463c`; external seal still hashes to `33c5edd7fc56ddef49f3a118ffd59ac3a1ab67bd4989307b206b1dc37b742c1a`. Those are preservation fingerprint checks, not a new all-member archive audit or application replay. This review changes none of those documents, source files, archive members or seals.

## Remaining unknowns and user decision

- Full source-lexer/posting output, complete candidate ranks/has_more and whether the required descriptive refs survive limit=5 remain unmeasured. Metadata counts alone cannot pass that workflow.
- Invalid raw-name/fallback cases, complete-description compiler/verifier enforcement, actual index/code sizes, authorized worker loading, runtime schemas/errors and costs need future implementation evidence. Description expansion must fit the existing bound or fail closed.
- The caller's interpretation, qualification preservation and final answer quality remain distinct from record-delivery/contract mechanics. Nothing here demonstrates full SQL mapping or generalization.
- Written user acceptance of the **raw-provider role**, **8-record / 16000-UTF16-fields / 2-owner** budget, complete mandatory E, bounded workflow and immutable ABI is still required. This design-only approval does not authorize implementation, publication over v2, configuration/service changes, commits or deployment.
- Inherited 8 MiB data / 2 MiB runtime code, two workers/eight queued, auth-before-data, exact snapshot/no-substitution and no-rebuild boundaries remain binding. Legacy **2/3/4000**, known20 regression and old **A8 FAIL/BLOCKED at 1.25** are unchanged.
