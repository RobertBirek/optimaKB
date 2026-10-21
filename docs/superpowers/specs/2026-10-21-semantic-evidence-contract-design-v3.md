# SemanticKB design v3 — description discovery and literal metadata names

2026-10-21 · **DESIGN ONLY. Controller self-review correction; pending independent re-review and written user acceptance.**

## 1. Normative base and exact revision scope

This is the v3 design **amendment to a hash-pinned complete base**, not a replacement publication over v2. Its complete contract is the frozen v2 below, with exactly the replacements and additions in §§2–8 of this document. All other v2 clauses remain normative without modification. There are no deferred interfaces or optional interpretations of these replacements.

Base: [2026-10-21-semantic-evidence-contract-design.md](2026-10-21-semantic-evidence-contract-design.md), **81104 bytes**, SHA256 `eb3dca5e6864133c8982005b79c3269d3de5c7193a5b1a847cd830541505d380`. References such as “v2 §5 L148” refer to those exact bytes. This document takes precedence only for its enumerated changed clauses. Reviewers need this document and that exact base; v1, reviews, decision brief and archives supply history, not unstated v3 rules.

The original v2 review `2026-10-21-semantic-evidence-contract-review-final.md` approved **v2**, not this correction. It remains unchanged, as do v2, v1, the first review, the decision brief, the controlling brief and the sealed archive. V3 adds no publication, implementation, provider, source file, schema field, public tool or budget change. The existing caller model remains the source interpreter.

The self-review exposed two concrete discovery-goal failures:

1. V2 displays E/F description hints but excludes their plain text from metadata `Posting.search_value`. F47/F48/F50 have technical names; their Polish descriptions supply “Operator…” / “Data…”. Name-only discovery cannot find those declarations using those descriptive words.
2. V2 applies the body technical-identifier grammar to genuine F metadata selectors. F96/F97 and other Towar names contain literal backticks. Metadata existence in F does not depend on being a valid unquoted SQL spelling, and the raw provider must not silently drop or repair those selectors.

**Only decisions changed:** complete E.description and F.description join metadata search values; a metadata F selector uses its bounded raw spelling without the body identifier grammar; diagnostics, compiler/verifier rules and descriptive-workflow acceptance expectations follow those two decisions. The AND-token tier and exact technical-set tier are retained.

## 2. Replacement for v2 §5 L148 — candidate identity and raw F selector

Candidate identity remains `H('candidate',{candidate_kind,entity_ref,name})`, with v2's exact canonical serialization/hash algorithm. Only owned records contribute selectable candidates. E candidate name remains E.id; label remains nonempty canonicalName else name else null, with the existing display cap.

For F metadata, determine one **raw selector cell** without lexical decoding:

1. A usable raw selector has **1..128 UTF16 code units** and contains neither U+0000..U+001F nor U+007F. No additional SQL/technical-identifier grammar applies to metadata names.
2. If `fieldName` is usable, select that exact cell and metadata_key=`fieldName`. Otherwise consider the explicit `mssqlColumn` fallback and select that exact cell only if it is usable, with metadata_key=`mssqlColumn`. This retains v2's usable-primary/usable-fallback precedence with the corrected raw-string admission predicate. It is not prefix/alias binding, spelling repair or source-body inference.
3. Unsupported nonempty selector cells considered by this rule receive the existing invalid_field_name diagnostic at their own key; if no usable selector exists, the record has no metadata field candidate and the unavailable fallback is diagnosed as specified in §4. A valid explicit fallback never removes a diagnostic on an unsupported nonempty primary or rewrites either cell. All cases retain the complete owned raw record.

Admission does **not** strip backticks, quotes, brackets, spaces or punctuation; trim, unescape, case repair and reconstruction are prohibited for metadata identity. Thus the literal string containing both backticks around Twr_OpeZalID is the metadata candidate's name, not Twr_OpeZalID without them. Nonempty whitespace is not trimmed into a different name. Candidate.Id's existing 1..256/control-free wire definition already permits these spellings; this local 128-unit admission bound does not alter that wire type.

The candidate kind is `field` because an actual F metadata record declares the raw selector under its literal owner. It does not certify an SQL identifier, column existence, table mapping, API field, truth or current version. Label remains raw F.name if nonempty, else null, under v2's display rules. Multiple F rows with the same owner and **exact raw** selected name share a candidate; raw spellings differing by quotes/case/spacing remain distinct candidates.

Mention candidate names remain the exact **decoded technical tokens** returned by the unchanged pinned source-mode lexer, ≤128 UTF16, with label null. The metadata name containing literal backticks and a decoded body mention of the unwrapped token remain separate candidate kinds/identities. Neither a body mention nor a normalized search match repairs or replaces the metadata name.

## 3. Replacement for v2 §5 L150–169 — complete metadata descriptions as hints

### 3.1 Origins and displayed metadata

All v2 wire types, null rules, origin ordering/deduplication, record-ref caps/counts, candidate caps, related navigation and display rules remain unchanged. Entity metadata origins anchor E.id; F metadata origins anchor the selected fieldName/mssqlColumn key under §2. Metadata origins have null body_field/start/end/token. **Description postings use that same identity origin**, not a new origin kind, description-based owner, support span or source fact. Each emitted origin/record/related ref still resolves to an owned record of that exact candidate.entity_ref.

`metadata_hints.description` continues to contain a complete raw description only if ≤240 UTF16. Longer values are wholly omitted with `description` in omitted_metadata_keys. That is a **display omission only**: it never removes, truncates or shortens the complete description's metadata search value or token bag. Labels/other metadata hints retain their existing caps and null behavior. No excerpt is generated and no description is treated as final-answer proof.

### 3.2 Finite compiler posting admission

This table replaces the input-form table at v2 §5 L158–163 and defines all v3 `Posting.search_value` inputs. Empty values add no searchable posting; the raw empty cell still remains in RecordCore.fields. Identical full Posting tuples deduplicate under v2's existing rule.

| Candidate channel | Complete permitted search values | Existing identity origin | Limits on interpretation |
|---|---|---|---|
| E metadata, kind entity | E.id, E.name, E.canonicalName, E.ontologyId, each existing semicolon-separated alias search entry, **complete E.description** | metadata_entity anchored at E.id | Description/alias text cannot create owners, fields, table roles or facts. Alias search normalization remains separate from literal owner binding. |
| F metadata, kind field | Exact raw selected name from §2, F.name, **complete F.description** | metadata_field anchored at chosen fieldName/mssqlColumn | Only an admitted genuine F name supplies identity; words in description never create a field candidate. No SQL-name/type/meaning/UNKNOWN adjudication. |
| Body identifier hints, kind identifier_mention | Decoded technical-reference token only, from complete E.description/E.summary, F.description/F.summary, or C.content | Unchanged identifier_mention origin and half-open cell span | The same pinned source-mode lexer/grammar/RHS/opaque/fence/malformed/wildcard exclusions remain mandatory. No prose token is promoted to a body identifier. |
| Other raw cells/path/section metadata | Only v2's existing display/navigation uses | Existing record/related refs | No additional search values, file reads, source-fact grammar or inferred provenance. |

A description can participate in both existing channels with different roles: its **whole raw metadata string** is a search value for an already identified E/F candidate, while its body lexer may separately yield admissible identifier_mention tokens. Plain metadata token search does not invoke the body lexer and does not adopt its fact/operand interpretation. Quoted/fenced/RHS text in a description can contribute ordinary **metadata search words**, but cannot thereby create a body mention/declaration or a certified fact. The body-mention exclusions are unchanged. F.summary and C.content do not acquire a new plain-prose metadata search channel.

Descriptions are finite original E/F cells already in the allowed inputs, not arbitrary source discovery. They are indexed complete regardless of 240-unit display omission, with no new per-description cutoff. The existing total immutable data-generation ceiling remains the fail-closed bound; an enlarged posting artifact that exceeds it fails build/load rather than sampling or omitting descriptions. No source-body semantic reader, LLM, date interpretation, truth ranking or extra corpus input is introduced.

### 3.3 Search normalization and tiers — same rules, expanded values

Normalization remains v2's hint-only NFD → remove Unicode marks → ł/Ł to l/L → lowercase under pinned environment → maximal `[\p{L}\p{N}_]+` tokens. The search bag is the union of tokens from the complete permitted search values above. Normalization affects **matching only**, never Candidate.name, origin, owner binding, record refs or hash inputs. Metadata Posting.search_value is the complete original admitted value, including original quotation and description characters; it is not a normalized string or extracted semantic predicate. Mention search_value remains origin.token. Multiple search values can share one metadata origin, which deduplicates independently of search_value.

The first applicable tier remains:

1. Original query equals an indexed original complete search value.
2. Folded whole query equals a folded whole search value, before token extraction.
3. Query is a whitespace-separated list of 2..8 distinct exact technical identifier spellings under the **unchanged technical grammar**, and the candidate's exact name is a member. Metadata admission no longer requires that grammar; tier 3 still does. Quoted metadata names do not receive a new quote-decoding/set-matching exception.
4. **Every** unique normalized query token occurs in the candidate's bag. Empty normalized token sets do not match this tier. No OR rewrite, stemming, synonym expansion, semantic planning or cross-candidate token pooling.

Rank remains tier, candidate kind (entity, field, identifier_mention), canonical owner ID, exact name, candidate_id. No metadata-priority change across different tiers is made to force particular fixtures into the cap. Therefore a future full-ranked run must check competing body mentions; metadata-only arithmetic cannot stand in for that run.

Exact tier 1/2 matching on a raw quoted name is legal: e.g. the raw backtick-wrapped Twr_OpeZalID query equals that F metadata search value at tier 1; changing case but keeping delimiters can match tier 2. A query without those backticks may match tier 4's punctuation-insensitive bag, but the returned metadata name/ID retains the backticks. Body mention candidates remain separate even when their decoded name equals that bare query. No spelling is repaired or certified as SQL syntax.

## 4. Replacement/addition for v2 §8 — compiler, posting, diagnostics, hashes

The `Posting` structure stays exactly `{candidate_kind,entity_ref,name,search_value,origin}`. The compiler and independent verifier enumerate its permitted metadata values from §3.2 for **every** admitted owned E/F row, not a hand-picked audit-field registry. They must check complete-value equality to the original cells, exact raw F selector identity, anchor-key consistency, owner binding and full deterministic deduplication/order. Descriptions from another row/owner, summary snippets, display-limited prefixes, reconstructed names and external text are not admissible substitutes. This replaces the name-only reading of v2's §5 finite-posting rules wherever §8 compilation/lookup/verification refers to them.

The existing `invalid_field_name` diagnostic code and schema are retained. Its F meaning is now **raw-selector admission failure only**, never failure of the body technical grammar:

* A nonempty fieldName outside 1..128 UTF16 or containing a forbidden control gets invalid_field_name, key fieldName, null spans; that cell supplies no candidate name. The existing explicit mssqlColumn fallback may still supply its own usable raw selector, anchored to mssqlColumn, without repairing the primary cell or erasing its diagnostic.
* When fieldName is unusable, unsupported/empty mssqlColumn gets invalid_field_name, key mssqlColumn, null spans; if neither selector is usable there is no metadata field candidate. An empty primary with a usable fallback is a normal fallback, not an invalid-primary diagnostic. A fallback is never inspected or selected in place of a usable primary.
* Backticks, other quotation, spaces or punctuation alone are **not** invalid_field_name reasons. No such metadata shape generates malformed_identifier/unclosed_atom; those diagnostics remain restricted to the unchanged body lexer and its cell spans.

Owned/quarantined partitioning and all 366 StoredRecords remain unchanged by selector-hint admission. A row with an unsupported name still has its exact physical RecordCore, ownership and diagnostics and remains eligible for scoped whole-record retrieval/navigation by its record_ref. No arbitrary file or alternate field is read. `no_hint_postings` is computed from actual permitted postings; the compiler cannot hard-code the observed raw-name census or treat a hint miss as source UNKNOWN.

All schemas, ABI/version literals, sort rules, scalar bounds, `C`, `SHA` and `H` definitions are inherited **without changing their algorithms**. All original E/F/C bytes, record_hash/record_ref/fields hashes and existing unquoted candidate identities remain unchanged. Newly admitted quoted names receive candidate IDs computed from their exact raw name. Examples derived by file-only hash arithmetic:

| Actual F row | Exact metadata Candidate.name (backticks are data) | H(candidate, existing key) |
|---|---|---|
| F96, owner OWA_ENTITY_ENCJA_TOWAR_KARTOTEKA_TOWAROW_I_USUG | `` `Twr_OpeZalID` `` | `2617082c1553e2d215e9be21cc1c5344855f03861cbcb44dde41b3ea38139f7a` |
| F97, same literal owner | `` `Twr_OpeModID` `` | `93adcfbb784cba42650aee8e56ef1365ddff6c7549fdda0f22b03dc3d7cca38d` |

These are candidate-ID formula specimens, not discovery-issued refs, executed lexer admissions or a compiled snapshot. A future compiler/runtime implementing this correction has a new closure binding and different posting/index bytes; the existing acyclic hash chain requires a correspondingly new index/snapshot/manifest/TrustedDataGeneration. **No old generation may be relabeled v3 or reused as if its postings already contained descriptions.** No active generation or replacement snapshot was created by this document.

V2's 8 MiB total serialized data bound, separate 2 MiB runtime-code bound, trusted controller root, authorized-only identical artifact loading in both workers, failure precedence and no per-query rebuild/substitution remain normative. Description search does not create a bypass for those boundaries.

## 5. File-only source evidence for the correction

Only the actual frozen EsJ4gr E/F/C CSVs were read as domain input. SHA256/bytes/record inventory matched v2 §2 exactly: E **74880 / 67**, F **25729 / 109**, C **306387 / 190**, total **406996 bytes / 366 records**. No existing parser/lexer, index, application module, test, API, controller, factory, provider or model was run. The measurements below use standard-library CSV, Unicode token/string arithmetic and hashes, not compiled Posting objects.

| File-only observation | Result |
|---|---|
| F raw-name admission under §2 | 109/109 admitted, 0 unsupported, 0 mssqlColumn fallbacks needed |
| Raw backtick-wrapped F names | 41, physical F lines 62–102 inclusive; all fail v2's technical-shaped metadata test because both fieldName and mssqlColumn are wrapped |
| Descriptions present | E 67/67; F 109/109 |
| Description display omission at >240 UTF16 | E 65/67; F 0/109. Longest E=1000, F=47. Search still consumes every complete cell. |
| Global field metadata query `operator` | F47/F48/F96/F97: four declaration matches; v2 metadata name-only query has zero |
| Contractor-scoped field metadata query `data` | F49/F50: two declaration matches; v2 metadata name-only query has zero |
| Global field metadata AND query `operator modyfikujący` | F48/F97: two declaration matches |
| Global field metadata AND query `operator data` | Zero metadata declaration matches; never rewritten as OR |
| Description-only E contribution for `rachunek` | E171 Konto bankowe, description 333 UTF16, has this token absent from its old name/ID/alias bag; description is omitted for display but remains searchable |

Exact F metadata witnesses (physical CSV line numbers; not SQL row IDs):

| F line | Raw fieldName and raw name | Complete description | Literal entityRefId |
|---|---|---|---|
| 47 | `Knt_OpeZalID` | Operator zakładający rekord | OWA_ENTITY_ENCJA_KONTRAHENT_KARTOTEKA_KONTRAHENTOW |
| 48 | `Knt_OpeModID` | Operator modyfikujący rekord | same exact contractor ID |
| 49 | `Knt_TS_Zal` | Data utworzenia | same exact contractor ID |
| 50 | `Knt_TS_Mod` | Data ostatniej modyfikacji | same exact contractor ID |
| 96 | `` `Twr_OpeZalID` `` | Operator zakładający | OWA_ENTITY_ENCJA_TOWAR_KARTOTEKA_TOWAROW_I_USUG |
| 97 | `` `Twr_OpeModID` `` | Operator modyfikujący | same exact Towar ID |

In all six rows raw mssqlColumn equals raw fieldName. The Polish meanings in this witness are in `.description`, not a Polish `.name`. Quotes in the two Towar names are actual CSV cell characters, not presentation markup introduced by this document.

These counts establish the **metadata subproblem only**. They do not establish full candidate ranks, source-lexer posting counts, has_more, a working compiler/discovery tool or a successful natural-language client. Expected metadata identities below are assertions for future contract checking, not technical IDs given to the caller before discovery.

## 6. Replacement for v2 §12B — NONEXECUTED descriptive workflow contract

Initial client goal: **„Dla kontrahenta pokaż operatora zakładającego, operatora modyfikującego oraz datę ostatniej modyfikacji.”** The caller's initial question/prompt contains no Knt/Twr technical field names, canonical owner IDs, record refs, gold answers or row numbers. The following workflow has **not been executed**; S/owner/ref variables are bound only from prospective tool responses, never from this document's witness table.

1. First discovery input: `{query:'operator',kind:'field',limit:5}` — global, no entity_ref, no preselected technical name. Under §3 the metadata slice contains four F candidates: two contractor and two Towar declarations. Each preserves its exact raw name, description hint, literal canonical entity_ref and record_refs. **Future full-tool expectation:** those four metadata declarations and both owners must actually be exposed within the bounded response for this descriptive fixture; body mention competitors/has_more and the complete ranked response must be checked when the pinned lexer/index exists. The file-only measurement does not assert that this full-tool expectation already passes.
2. The existing caller model chooses the contractor owner from the returned entity_refs in light of the user's contractor goal, retaining the two operator refs from that owner. It must not merge the Towar records or strip their backticks. If returned owner information is insufficient or expected refs were not exposed, stop for refinement, not a gold-provided selector or extra discovery.
3. Second discovery input: `{query:'data',kind:'field',entity_ref:owner_selected_from_first_response,expected_snapshot_id:S,limit:5}`. Metadata-only expected declarations are the contractor's **Data utworzenia** and **Data ostatniej modyfikacji** records. Future full-tool expectation is actual exposure of both, with the correct owner and distinct refs. The caller chooses the latter by its displayed literal description. It does not request an exact technical field name supplied outside the responses.
4. One evidence input: snapshot S, three requests with IDs `created_by`, `modified_by`, `modified_at`, all using the selected owner; the first two request refs actually exposed by discovery 1, the third the selected ref actually exposed by discovery 2. The mandatory complete contractor E record is added and charged automatically. There is no get fieldName/aspect input and no third discovery/second get.
5. Future delivery expectation for these exact refs: three returned_all partitions, shared complete E context, and **4 unique whole records / 1 owner / 2600 UTF16(C(fields))**, from source arithmetic `1312 + 431 + 433 + 424 = 2600`. This numerical selection is within the unchanged proposed 8/16000/2-owner ceiling; it is not a tool response or semantic sufficiency result. The caller interprets the complete returned F descriptions/cells with their qualifications. No current SQL existence, field-to-table mapping, interpreted UNKNOWN or semantic completeness is certified.

For future assertion/debugging **after** discovery exposure, the two operator records correspond to F47/F48, the two `data` choices to F49/F50, and the intended final selection to F47/F48/F50 plus E173. Their existing record refs/hashes in v2 remain unchanged. These labels must not be injected into the initial client prompt or first two query strings. The older exact-technical-set workflow is still legal for a caller that already knows names, but is no longer the witness for descriptive discoverability.

V2 §12A and §12C retain their source selections, budgets, no-repair boundaries and unexecuted status. Because E descriptions now participate in search, any prior rank assumptions are prospective, not frozen measured discovery results; their candidate cap/exposure still needs a future full-ranked check. The source budgets in v2 §2 remain the same file-only finite selections.

## 7. Nonexecuted acceptance expectations and unchanged contract boundaries

These expectations supplement v2 §13 and the I4/I5 resolution rows. They are **test contracts for a future separately authorized PoC**, not tests run by this revision:

| Expectation | Required result |
|---|---|
| Description-only metadata matching | Complete E/F descriptions contribute to their existing identity candidates even when no name/alias matches; metadata description omission at 240 does not suppress matches. |
| Descriptive client sequence | The exact `operator` → contractor-scoped `data` → one get workflow in §6 exposes the needed refs without pre-discovery technical IDs; real full rank/caps must be verified, not inferred from metadata counts. |
| Raw quoted metadata names | F96/F97 and all 41 wrapped names remain genuine F candidates with exact raw names/owner identity. Raw quote tier 1/2 works; generic token matching never changes returned names. |
| Invalid raw metadata names | Control-containing, oversized, and empty-with-empty-fallback cases produce the specified existing diagnostic and retain the whole owned record. No cell is repaired. The existing explicit usable-primary/usable-fallback precedence is retained; a fallback is anchored to mssqlColumn and cannot erase a diagnostic on an unsupported nonempty fieldName. |
| Two independent channels | Description metadata search does not synthesize new fields or body identifier mentions. Existing body RHS/opaque/fence/malformed exclusions and grammar remain unchanged; metadata candidates and decoded mentions do not merge. |
| Token/set behavior | AND remains AND; query `operator data` has no metadata declaration match in this fixture. Exact technical-set tier retains its grammar, cardinality, literal membership and rank. |
| Compiler/verifier completeness | Enumerate all finite original E/F description values, retain origin/identity/raw spelling, and enforce original data/code bounds; no selective 240-character index, sample, snippet, source-fact grammar or truth/date ranking. |
| Source/evidence binding | Get uses only active exact physical refs exposed by discovery for that owner/snapshot; E context, global deduplication, whole-record delivery, missing/status partitions and all no-substitution behavior remain v2's. |

No wire type, output enum, error shape, ABI format string, public tool/profile/scope, namespace, source inventory, reference/hash algorithm, authorization order or worker binding/cap is added or changed. The v2 raw-provider role, **8 records / 16000 canonical-fields UTF16 / 2 owners**, ≤2 discovery + 1 get, mandatory whole E, **8 MiB data / 2 MiB runtime code**, two workers/eight queued, all-366 accounting, source-chunk semantic_completeness:not_assessed and no semantic adjudication remain normative. Description discovery cannot use paths as capabilities or fall back to providers/legacy free-form answers.

The v3 correction still needs independent re-review. V2's Approved review is not evidence that v3 descriptive workflow tests pass. Generic index/posting correctness, code/index sizes, runtime auth/schema enforcement, complete candidate ranking/caps, both-worker binding, cold/load/warm/transcript costs and caller answer quality remain unexecuted/unmeasured. Known20 remains regression; legacy **2/3/4000** and old **A8 FAIL/BLOCKED 1.25** do not change.

## 8. Existing four synthetic examples — unchanged, NONEXECUTED

The following four JSON blocks are the exact same four examples from v2 §11. They are carried here for document-consistency checking; their surrounding source/header/canonicalization definitions and envelope coupling remain v2's. The single synthetic E record has empty description and no F selector, so neither correction changes its 277-unit raw-fields charge, fields/source/record/ref hashes or synthetic snapshot specimen. The `unmatched` discovery query still has no metadata hit. No full compiled index/snapshot is asserted by these examples.

```json
{
  "schema_version": "0.1",
  "mode": "evidence",
  "snapshot_id": "fe0294cf7aeb55c2974d68fb90425d963a0b0a670685603261ff4ab359287b55",
  "assessment": "source_records_only",
  "semantic_assessment": "not_performed",
  "correlation_id": null,
  "results": [{
    "id": "example",
    "entity_ref": {"namespace": "OWAOntology", "id": "SYNTH_ENTITY"},
    "requested_refs": ["23a414754fb011be8bbe08638342651c022c46267eba30ff6b59a2756766c664"],
    "status": "returned_all",
    "returned_refs": ["23a414754fb011be8bbe08638342651c022c46267eba30ff6b59a2756766c664"],
    "context_refs": ["23a414754fb011be8bbe08638342651c022c46267eba30ff6b59a2756766c664"],
    "missing": []
  }],
  "records": [{
    "record_ref": "23a414754fb011be8bbe08638342651c022c46267eba30ff6b59a2756766c664",
    "kind": "entity_metadata",
    "record_id": "SYNTH_ENTITY",
    "entity_ref": {"namespace": "OWAOntology", "id": "SYNTH_ENTITY"},
    "ownership": {"via": "self", "literal_ref": "SYNTH_ENTITY"},
    "artifact": "exports/owa_ontology/v1/ontology_entity.csv",
    "physical": {"byte_start": 161, "byte_end": 220, "line_start": 2, "line_end": 2},
    "raw_record_sha256": "6c3810c85ee654aa632833b641848dda19353aa06547f511dbf62be13ec6cee7",
    "record_hash": "cc9faf12b6d1c77a9a689feddcc198c59a0846227acd16a983bbb24eef780838",
    "fields_sha256": "3469bb2ceb01078c7a2cda3b0c2262143e82575d842917fa4c744eff4605a075",
    "fields_utf16": 277,
    "fields": {
      "id": "SYNTH_ENTITY", "name": "Synthetic", "description": "",
      "semanticType": "ontology_entity", "canonicalName": "Synthetic",
      "ontologyId": "", "verificationStatus": "", "confidenceLevel": "",
      "businessDomain": "", "mainTable": "", "mcpReadTools": "",
      "mcpWriteTools": "", "aliases": "", "summary": ""
    },
    "integrity": "exact_export_record",
    "semantic_completeness": "not_assessed"
  }],
  "sources": [{
    "artifact": "exports/owa_ontology/v1/ontology_entity.csv",
    "sha256": "9af641619beaffcf5b0b4b7aa6f61c549248af6a824e00c7650d197df2e6ac70",
    "bytes": 220, "record_count": 1
  }],
  "budget": {"max_records": 8, "max_fields_utf16": 16000, "max_entity_refs": 2,
    "used_records": 1, "used_fields_utf16": 277, "used_entity_refs": 1}
}
```

Corresponding evidence request:

```json
{"jsonrpc":"2.0","id":"synthetic-ok","method":"tools/call","params":{"name":"erp_evidence.get","arguments":{"snapshot_id":"fe0294cf7aeb55c2974d68fb90425d963a0b0a670685603261ff4ab359287b55","requests":[{"id":"example","entity_ref":{"namespace":"OWAOntology","id":"SYNTH_ENTITY"},"record_refs":["23a414754fb011be8bbe08638342651c022c46267eba30ff6b59a2756766c664"]}]}}}
```

Complete discovery success for query unmatched/kind entity against that synthetic record:

```json
{"jsonrpc":"2.0","id":"synthetic-discover","result":{"isError":false,"structuredContent":{"schema_version":"0.1","mode":"discovery","snapshot_id":"fe0294cf7aeb55c2974d68fb90425d963a0b0a670685603261ff4ab359287b55","assessment":"source_records_only","semantic_assessment":"not_performed","correlation_id":null,"status":"no_candidates","candidates":[],"has_more":false},"content":[{"type":"text","text":"{\"assessment\":\"source_records_only\",\"candidates\":[],\"correlation_id\":null,\"has_more\":false,\"mode\":\"discovery\",\"schema_version\":\"0.1\",\"semantic_assessment\":\"not_performed\",\"snapshot_id\":\"fe0294cf7aeb55c2974d68fb90425d963a0b0a670685603261ff4ab359287b55\",\"status\":\"no_candidates\"}"}]}}
```

Complete stale-snapshot tool error for the synthetic evidence request:

```json
{
  "jsonrpc": "2.0",
  "id": "synthetic-stale",
  "result": {
    "isError": true,
    "structuredContent": {
      "schema_version": "0.1", "mode": "error", "operation": "evidence",
      "code": "SNAPSHOT_MISMATCH", "retry": "new_turn",
      "expected_snapshot_id": "2ef3a3563e3af594fec1c0ce56b75c7a87df7b4875b26e5c642f024a539c1410",
      "active_snapshot_id": "fe0294cf7aeb55c2974d68fb90425d963a0b0a670685603261ff4ab359287b55",
      "correlation_id": null
    },
    "content": [{"type": "text", "text": "{\"active_snapshot_id\":\"fe0294cf7aeb55c2974d68fb90425d963a0b0a670685603261ff4ab359287b55\",\"code\":\"SNAPSHOT_MISMATCH\",\"correlation_id\":null,\"expected_snapshot_id\":\"2ef3a3563e3af594fec1c0ce56b75c7a87df7b4875b26e5c642f024a539c1410\",\"mode\":\"error\",\"operation\":\"evidence\",\"retry\":\"new_turn\",\"schema_version\":\"0.1\"}"}]
  }
}
```

## 9. Re-review and written decision

Independent re-review should assess these specific changes against the frozen base, including complete metadata description admission independent of display, exact raw quoted identity, body-lexer separation, diagnostic behavior, the unchanged AND/set tiers and the descriptive workflow's **unexecuted** full-rank expectations. It must not inherit v2's Approved label onto v3 or interpret the metadata census as a passing client/index test.

The user still decides the raw-record role/new context budget/immutable ABI under v2's unchanged acceptance boundary. This correction authorizes no implementation, publication over v2, archive rewrite, service/configuration operation or execution plan. The private resolution/source-proof record is `.superpowers/sdd/explicit-semantic-discovery-description-correction-20261021.md`; its external fingerprint can be reported without a self-hash cycle.
