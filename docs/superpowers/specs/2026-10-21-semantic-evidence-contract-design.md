# SemanticKB: explicit candidate discovery and exact source-record retrieval

2026-10-21 · **Revision 2, DESIGN-ONLY PROPOSAL awaiting written user acceptance.**

## 1. Decision and authority

The approved activity is two-step MCP retrieval **design and source feasibility**, not implementation. This revision follows `.superpowers/sdd/explicit-semantic-design-v2-20261021-brief.md` (SHA256 `1535e0e07e324efe7dd5567d6ccf2a004e1cf78377d0855b195a63d63a462b3c`) and resolves the original independent review's I1–I5 by simplifying the service's responsibility. The exact first draft is preserved as `2026-10-21-semantic-evidence-contract-design-v1.md`, SHA256 `83d401abce569a866ea59782a86eefd3fe4056d219156a79090d7e9e7d346757`. The original `2026-10-21-semantic-evidence-contract-review.md` remains unchanged, SHA256 `d1e57ea0987a1ef6001f0b155c62a52676bd25cd4dbb1f30791f1da6155e7af1`.

**Proposed role:** `erp_subject.discover` finds metadata candidates and lexical identifier mentions; `erp_evidence.get` retrieves explicitly selected, complete physical CSV records plus mandatory complete owner-E records. The existing model calling MCP interprets their content and writes the answer. The KB server supplies no semantic facts, four-aspect readers, SQL mappings, source-UNKNOWN classification, qualification adjudication, or answer generator. Tool names containing “evidence” do not enlarge this responsibility.

**New budget proposed for written acceptance:** at most **8 unique complete physical records**, at most **16,000 decoded UTF16 code units of canonical serialized raw `fields`**, and at most **2 distinct explicit entity references per evidence batch**. Owner-E context consumes the same budget. This is a new context-provider contract, not preservation or reinterpretation of legacy 2 sources / 3 units / 4,000 characters. There is no source grouping. No family is promised to fit.

The alternatives were: (a) retain the draft-1 server semantic adjudicator, which creates I2–I4's unsupported proof/grammar obligations; (b) add a structured mode to the old free-form `erp_entity.get`, which mixes contracts and fallback paths; (c) retain two separate tools but return raw records, the chosen proposal. No new LLM/provider is introduced. Written acceptance of (c), its limits, and the remaining evidence concerns permits a separately authorized private-PoC planning step, not live integration.

Historical results retain their original meaning: known20 = 1 PASS / 12 PARTIAL / 7 MISS with 20 successful calls; those questions are regression, not a fresh holdout. Historical42 does not score this contract. Old A8 remains **FAIL/BLOCKED, 1.25 against its original ptat31**. Moving work to compilation/load cannot produce an old-A8 PASS.

## 2. Exact source boundary and feasibility claims

Functional source root: frozen EsJ4gr `/tmp/opencode/semantic42-frozen-EsJ4gr`; original manifest SHA256 `9f4275a2400e7853f7b8bcdcfe3f4463c3ad30384f1bdb49a0bbfbfc3626eede`. Main integration baseline: `/docker/openspg`, HEAD `dfb1c8ec40f0639f291e216481277ee3cc7a791d`. Existing dirty worktree code is not the integration baseline.

Only these original-byte CSV files are compiler domain inputs:

| Artifact (also the literal `Artifact` wire enum) | Bytes | Data records | SHA256 |
|---|---:|---:|---|
| `exports/owa_ontology/v1/ontology_entity.csv` (E) | 74880 | 67 | `35af823973b1d0377365efbcc68f184a83cac787f12dfecf983fb31190239d16` |
| `exports/owa_ontology/v1/ontology_field.csv` (F) | 25729 | 109 | `c0c17e8f0115f86b140e40a9e2cc02b1601bcca93f2d932e21736031d8aa6e17` |
| `exports/owa_ontology/v1/chunk.csv` (C) | 306387 | 190 | `6c8bc167db9c0009e5cb21c259ac191b81e8e721897487110a6946276fb7aca8` |

Total: 366 records, 406996 bytes. The old 79-member manifest is a provenance seal, not permission to index all members. Gold/banks, reviewer Markdown, promoted source expansion, old answers, and evaluations are excluded. E/F/C are exports, not current ERP/schema verification. Raw `sourcePath` is data; the file it names is never opened.

Existing source-inspection reports `explicit-semantic-runtime-feasibility-20261021.{md,json}` and `...-budget-option.{md,json}` establish literal witnesses and old representation costs. Their whole-body/section arithmetic is **not** this revision's whole-raw-fields budget arithmetic. The separate raw-budget source task completed during this revision. Its **completed result was read before incorporating arithmetic**: `.superpowers/sdd/explicit-semantic-runtime-feasibility-20261021-raw-context.md` (SHA256 `f18ada675d57217c395470bfb0bb64c7fbfe64bf05bfee73a9433cd249226d92`) and `.json` (SHA256 `c17c40c7c2d6589e7f02521f3d2ec049bf669f8561b62e5bc46e903baee82924`). These are source-availability/stdlib-arithmetic evidence, not executed compiler/tool outputs. Their candidate hash algorithm is explicitly provisional and **is not substituted for §4's normative refs**; raw-fields counting agrees because all field keys are ASCII.

| Completed file-measured selection, including mandatory E | Unique records / owners | UTF16(C(fields)) total | Boundary |
|---|---|---:|---|
| EB, EL, B1–B3, L1–L3 | 8 / 2 | 13175 | Raw selected account context fits; no answer-quality claim |
| EK, F47, F48, F50, K1, K2, K5, K6 | 8 / 1 | 9231 | Selected contractor context fits; K3/K4 omitted |
| EB, B1–B3 | 4 / 1 | 6579 | Raw bank context fits; no type/meaning adjudication |
| Contractor selection above plus K3/K4 | 10 / 1 | 13436 | **Record-cap failure**, despite character fit; no reassembly/multi-batch workaround |

These finite selections do not promise all-family/all-question fit or establish hint-index admission/rank. No lexer, index or MCP client ran in that addendum. A final controller handoff can bind these exact completed files; they do not enlarge compiler inputs beyond E/F/C.

File-only derivation for this revision confirmed the 67/109/190 inventory, unique E canonical IDs and unique literal E id/ontologyId lookups for all 299 F/C owner refs; it also derived the example record refs in §12. It did not compile or execute the proposed index, tools, tests, API or client. Admission and diagnostic verification remain future contract checks.

## 3. Normative scalar, serialization, and CSV rules

The following type notation specifies JSON values, not implementation source. All objects are **closed** (`additionalProperties:false`), all fields are required unless marked `?`, all unions are exclusive, and no type coercion, implicit trimming, case repair or null-to-absent conversion is allowed. Arrays are dense, ordered JSON arrays. Integers are safe nonnegative integers ≤ 9007199254740991 unless a smaller range is given. Duplicate JSON keys, invalid UTF8, lone surrogates, nonfinite numbers and negative zero are rejected. Strings retain all decoded characters; `UTF16(s)` counts UTF16 code units, not UTF8 bytes or Unicode scalar values. Length constraints are enforced explicitly, not assumed equivalent to JSON Schema's code-point `maxLength`.

| Type | Definition |
|---|---|
| `Hex` | string matching `^[0-9a-f]{64}$` |
| `Id` | string, 1..256 UTF16, no U+0000..U+001F or U+007F; exact spelling |
| `RequestId` | string matching `^[A-Za-z0-9_-]{1,64}$` |
| `Correlation` | null or string, 1..128 UTF16, no control characters as for Id |
| `EntityRef` | `{namespace:'OWAOntology', id:Id}`; id is a canonical E `id`, not an alias or ontologyId |
| `Physical` | `{byte_start:integer, byte_end:integer, line_start:integer>=1, line_end:integer>=1}`; start < end, line_start ≤ line_end |
| `Source` | `{artifact:Artifact, sha256:Hex, bytes:integer>=1, record_count:integer>=0}` |
| `Kind` | `'entity_metadata' | 'field_metadata' | 'source_chunk'` |

`C(x)` is canonical JSON: recursively sort object keys by unsigned UTF16 code-unit lexicographic order; preserve array order; emit no whitespace or final LF. Strings use literal Unicode except `\"`, `\\`, `\b`, `\f`, `\n`, `\r`, `\t` and lowercase `\u00xx` for remaining controls. Do not escape `/`, U+2028 or U+2029. Integers use base-10 with no leading zeros and a leading minus only for explicitly signed RPC IDs/error codes; booleans/null use JSON literals. UTF8 has no BOM. These rules apply to all hashes, parity text, and size accounting; they are independent of object insertion order, locale and platform newline. All numbers in hashed objects are nonnegative integers.

`SHA(b)` is lowercase SHA256 of bytes. `H(tag,x) = SHA(UTF8('owa-raw/0.1/' + tag + '\n' + C(x)))`; tags below are exact ASCII literals. Plain file hashes and `fields_sha256` use SHA, not H.

CSV decoding is strict UTF8 without BOM, comma separator, double-quote quoting, doubled double-quote escape, no backslash escape, LF or CRLF record delimiters. Preserve in-cell CR/LF exactly, do not normalize line endings. A quoted field may span physical lines; a quote closes only before delimiter/record-end/EOF. Headers are exactly the ordered lists in §4; duplicate/extra/missing headers, ragged rows, blank extra records or invalid quoting fail the entire build. No malformed-record recovery. A final record without line delimiter is permitted. A record's byte slice includes its terminating record delimiter when present; header bytes are not a data record. Physical line numbers are one-based: CRLF is one break, LF is one; a trailing delimiter does not invent a line occupied by that record. `line_end` is the line containing the last field/closing quote, before the terminating delimiter. No body, table, header, chunk or split-row reconstruction is performed.

## 4. Closed raw record and provenance types

Every cell remains a string, including empty cells, numeric-looking values and literal UNKNOWN. The three **closed** raw field types have these required keys in source-header order (ordering here defines CSV, not C):

* `EFields`: `id,name,description,semanticType,canonicalName,ontologyId,verificationStatus,confidenceLevel,businessDomain,mainTable,mcpReadTools,mcpWriteTools,aliases,summary`.
* `FFields`: `id,name,description,semanticType,entityRefId,fieldName,mssqlColumn,mcpField,sqlType,nullable,keyRole,mappingStatus,summary`.
* `CFields`: `id,name,description,semanticType,sourceDocumentRefId,sourcePath,sectionHeading,sectionOrder,content`.

Each listed property has type string, with no individual truncation limit. A complete record may therefore be too large for evidence. Unknown keys are not admitted even if they look like provenance metadata. Raw empty string is distinguishable from a nonexistent column. Namespace comes from this fixed OWA artifact inventory, not inferred from prose.

```text
RecordCore = {
  record_ref:Hex, kind:Kind, record_id:string, artifact:Artifact,
  physical:Physical, raw_record_sha256:Hex, record_hash:Hex,
  fields_sha256:Hex, fields_utf16:integer,
  fields:EFields|FFields|CFields,
  integrity:'exact_export_record', semantic_completeness:'not_assessed'
}
Record = RecordCore & {
  entity_ref:EntityRef,
  ownership:{via:'self'|'entityRefId'|'sourceDocumentRefId', literal_ref:string}
}
```

`&` is closed field-set composition, not permission for extension keys. Artifact/kind/fields/via must respectively be E/entity_metadata/EFields/self, F/field_metadata/FFields/entityRefId, or C/source_chunk/CFields/sourceDocumentRefId. `record_id = fields.id`, even if duplicate or empty in the export; physical ref is the retrieval identity. Returned E records have `record_id = entity_ref.id = ownership.literal_ref`. Returned F/C literal refs equal their original reference cell; they resolve to that canonical owner under §8. No namespace/owner/predicate/SQL meaning is invented from identifier prefixes.

For each source record, let `physical` be its exact locator, `source_sha256` the full original CSV file hash, and `fields` its complete decoded object:

* `fields_sha256 = SHA(UTF8(C(fields)))`; `fields_utf16 = UTF16(C(fields))`.
* `raw_record_sha256 = SHA(original_csv_bytes[byte_start:byte_end])`.
* `record_hash = H('record',{artifact,source_sha256,physical,fields})`.
* `record_ref = H('record-ref',{artifact,source_sha256,physical,record_hash,raw_record_sha256})`.

Refs bind artifact identity, export bytes, exact physical position and complete decoded cells. Changing line endings, a different occurrence of duplicate ID, or an empty cell changes the applicable hash/ref. Record refs do not depend on query, candidate rank, budget, snapshot ID or semantic interpretation. Membership in a supplied active snapshot is still mandatory; a stable ref alone is not permission or proof of membership.

`integrity` means the emitted fields and locator match one exact original export record, as checked through the trusted data generation. It does **not** assert a complete Markdown table, complete historical document, current SQL mapping or answered obligation. `source_chunk.semantic_completeness` is always the literal `not_assessed`; metadata uses the same literal. A split or headerless chunk can be delivered exactly, never repaired or certified semantically complete.

`sources` on evidence is a unique artifact-sorted list of Source descriptors **only for emitted records**. Every Record.artifact resolves to exactly one Source, and every Source has an emitted record. All record locators/hash calculations use that descriptor. There are no source groups, body slices, derived headers, fragments, semantic fact edges or inherited verification fields.

## 5. Discovery: closed wire and finite hints

```text
DiscoverInput = {
  query:string, kind:'entity'|'field'|'identifier_mention',
  entity_ref?:EntityRef, expected_snapshot_id?:Hex,
  limit?:integer[1..5], correlation_id?:string[1..128 UTF16]
}
```

Query is 1..500 UTF16 and contains a non-whitespace character; correlation has the control-character restriction of Correlation. Omitted limit means 5. Entity scope is permitted for field/identifier_mention, forbidden for entity. `kind:'field'` searches metadata declarations **and** lexical mention candidates, returning distinct candidate kinds. `kind:'identifier_mention'` searches only mentions. This lets BRa_IBAN be found without inventing an F declaration. Query, including a query resembling SQL, a URL or a filesystem path, is only a search string.

```text
MetadataKey = 'id'|'name'|'canonicalName'|'ontologyId'|'aliases'|'description'|
  'fieldName'|'mssqlColumn'|'sqlType'|'mcpField'|'verificationStatus'|
  'mappingStatus'|'sectionHeading'|'sectionOrder'|'sourcePath'
Origin = {
  record_ref:Hex, kind:'metadata_entity'|'metadata_field'|'identifier_mention',
  metadata_key:MetadataKey|null,
  body_field:'description'|'summary'|'content'|null,
  start_utf16:integer|null, end_utf16:integer|null, token:string|null
}
Related = {
  record_ref:Hex, relation:'owner_context'|'same_owner'|'same_owner_source_path',
  source_path:string|null, section_order:string|null
}
Candidate = {
  candidate_id:Hex, candidate_kind:'entity'|'field'|'identifier_mention',
  entity_ref:EntityRef, name:Id, label:string|null,
  metadata_hints:{key:MetadataKey,value:string}[],
  omitted_metadata_keys:MetadataKey[],
  record_refs:Hex[1..8], record_ref_count:integer>=1,
  origins:Origin[1..8], origins_count:integer>=1,
  related_records:Related[0..8], related_record_count:integer>=0
}
DiscoverSuccess = {
  schema_version:'0.1', mode:'discovery', snapshot_id:Hex,
  assessment:'source_records_only', semantic_assessment:'not_performed',
  correlation_id:Correlation,
  status:'candidates'|'no_candidates'|'owner_not_found'|'ambiguous_owner_ref',
  candidates:Candidate[0..5], has_more:boolean
}
```

Candidate identity is `H('candidate',{candidate_kind,entity_ref,name})`; source spelling is retained. Only owned records contribute selectable candidates. E candidate name is E.id, label is nonempty canonicalName else name else null. F field candidate name is nonempty valid fieldName, else nonempty valid mssqlColumn; names must match the technical identifier grammar below and be ≤128 UTF16. This fallback is explicit metadata handling, not inference of SQL existence. Label is F.name if nonempty, else null. Mention candidate name is the exact lexical token (≤128 UTF16), label null. Multiple F rows with the same owner/name form one candidate with all origin refs; metadata differences are not reconciled. Metadata candidates and mentions are never merged into one kind.

Origins for metadata have exactly one metadata_key (id for E; chosen fieldName/mssqlColumn for F), all body/span/token fields null. Mention origins have metadata_key null, body_field set, `[start_utf16,end_utf16)` in that complete raw decoded cell, token equal to the source lexer's decoded identifier; start < end ≤ UTF16(cell). Entity candidates have only metadata_entity origins on E; field candidates only metadata_field origins on F; identifier_mention candidates only identifier_mention origins in the permitted E/F/C body cells. Every origin/record/related ref resolves to an owned record of that same candidate.entity_ref. Their surface can include delimiters; no fact-support range is implied. Mentions from different owners remain different candidates. Origins sort by artifact/byte_start/body_field/start/end/kind, using UTF16 ordering for strings and null before non-null. Record refs use first occurrence in that origin order; emit its first 8 unique refs. Origins emit first 8. Counts are full pre-cap unique record/origin counts; counts exceeding emitted lengths are explicit incompleteness. Each emitted origin's ref must be in emitted record_refs; cap origins after filtering to emitted refs and retain the unfiltered total count. No hint text is an evidence body.

Metadata hints come only from the candidate's first origin record: E keys name/canonicalName/ontologyId/aliases/verificationStatus/description; F name/fieldName/mssqlColumn/sqlType/mcpField/mappingStatus/description; mention sourcePath/sectionHeading/sectionOrder when present in C. Keys follow the enum's listed order, empty values are included, complete values ≤240 UTF16 are included, longer values are omitted with that key in omitted_metadata_keys. Labels longer than 240 are null and the corresponding key is in omitted_metadata_keys. No excerpts or substring descriptions. Both key lists are unique (maximum 16), disjoint for hints versus omitted keys; nullable label is not a semantic omission. These raw hints do not certify their content.

Related records are computed for every origin, then deduplicated by record_ref: owner E is first (`owner_context`), then other owned C records sharing a **nonempty exact literal** sourcePath with an origin C (`same_owner_source_path`), then remaining records of that same owner (`same_owner`). Exclude the candidate's entire record-ref set before capping. For a record eligible by several rules retain the earlier relation. C source_path/section_order carry the raw cells including empty strings; they are null for E/F, never filled from a neighbor. Within same-path navigation sort by path, valid decimal sectionOrder numerically, then artifact/byte_start; invalid/empty orders sort after numeric orders by literal UTF16 spelling. Same-owner navigation sorts artifact/byte_start. Only first 8 are emitted; related_record_count is the full unique eligible count. Related refs are exact selectable record refs but do not imply a contemporary version, document completeness, or a qualifier closure. Owner E is still returned automatically on evidence even if its related ref was not requested.

Finite, query-independent index rules:

| Input form | Indexed hints | What it cannot assert |
|---|---|---|
| E id/name/canonicalName/ontologyId and aliases cell | Entity label/ID tokens; aliases are semicolon-separated complete nonempty trimmed search entries, with the original whole cell retained | Alias-to-owner binding; physical table ownership |
| F fieldName, else explicit mssqlColumn fallback; F name | Metadata field candidate and name tokens, tied to literal entityRefId resolution | API parameter, current column existence, table mapping, meaning/type adjudication |
| Complete raw E.description/E.summary, F.description/F.summary, C.content | Source-lexer technical-reference token postings only, `identifier_mention` | Field declarations or typed facts from tables/bullets/questions |
| Other cells, sourcePath and section metadata | Navigation and metadata hints as enumerated; no body following paths | Opening files/URLs, inherited dates/status or owner selection |

Use the pure frozen `semantic_lexical_context.mjs` source-mode lexer, exact EsJ4gr SHA256 `ed19d8afc0293ab62a0bc5f64a0dfb6966a9f39b546343c385df98153701e1d1`, included in Compiler.files and the future runtime closure; version `source-lexer-esj4gr-v1` is bound to those bytes. Its API is `analyzeSemanticLexicalContext(cell,{mode:'source'})`; consume only tokens with role technicalIdentifier, closed=true, kind reference, non-null value matching `^[\p{L}_][\p{L}\p{N}_-]*(?:[.:][\p{L}\p{N}_-]+)*$` (Unicode properties under the pinned environment). Exclude opaque quotes, literalOperand/RHS, fences, malformed/unclosed/glued atoms and wildcard tokens; do not re-lex substrings or operands. The lexer's comparison attribution is only lexical suppression, not a fact grammar; its conditions are not stored as semantic data. A cell containing a Markdown tilde-fence opener `^ {0,3}~{3,}` on any physical cell line gets no body-token postings for that cell (`unsupported_fence` diagnostic covering that whole cell), since this pinned lexer does not handle that fence form. Whole raw delivery remains available. No role-table, bullet-type-distribution, question-UNKNOWN or meaning parser exists in v0.1.

Search normalization for hints only: NFD, remove Unicode marks, map ł/Ł to l/L, lowercase using the pinned Unicode environment, extract maximal `[\p{L}\p{N}_]+` tokens. No stemming, synonyms or query planning. Each candidate's search bag is the union of its finite Posting.search_value tokens; searchable whole values are precisely the complete E id/name/canonicalName/ontologyId/semicolon aliases, the F chosen name/F.name, or the source lexer token. An empty alias is not a posting. For a metadata posting, search_value is one of those original metadata values, never a source-fact reduction; multiple search values may share the same unique metadata origin. Mention postings have search_value=origin.token. Origins deduplicate independently of search_value.

A candidate matches in the first applicable tier: (1) original query equals an indexed original whole value; (2) folded whole query equals a folded whole value (before token extraction); (3) query is a whitespace-separated list of 2..8 **distinct exact technical identifier spellings**, each valid under the technical grammar, and the candidate's exact name is a member; (4) every unique normalized query token occurs in its token bag. Tier 3 is finite lexical set matching, not a question/fact grammar or an evidence plan. Queries with more than eight terms simply do not qualify for that tier; other tiers remain available. An empty normalized token set has no tier-4 match. Rank by tier then candidate kind (entity, field, identifier_mention), canonical owner ID, name, candidate_id. No inferred ranking by truth, date, table role or answer coverage. All compiled postings are retained within the data bound; no silent cutoff.

For a scoped discovery, a syntactically valid but absent canonical owner yields owner_not_found; duplicate canonical E ID yields ambiguous_owner_ref. Both have empty candidates and has_more=false. An ontologyId/alias supplied instead of canonical ID is absent, not repaired. A known owner with no matches yields no_candidates. Candidates status requires 1..limit items; all other statuses require 0. `has_more` is true exactly when matched candidates exceed limit; it never means the presented set is exhaustive. Output limit equals effective input limit, not always 5. Discovery authorizes no automatic owner selection and supplies no final-answer proof.

## 6. Evidence: closed wire, missing results, and global budget

```text
EvidenceInput = {
  snapshot_id:Hex,
  requests:{id:RequestId,entity_ref:EntityRef,record_refs:Hex[1..8]}[1..8],
  correlation_id?:string[1..128 UTF16]
}
MissingReason = 'owner_not_found'|'ambiguous_owner_ref'|'record_not_found'|
  'record_owner_mismatch'|'record_quarantined_ambiguous'|
  'record_quarantined_unresolved'|'owner_context_unavailable'|
  'owner_context_record_limit'|'owner_context_char_limit'|'record_limit'|'char_limit'
DeliveryResult = {
  id:RequestId, entity_ref:EntityRef, requested_refs:Hex[1..8],
  status:'returned_all'|'returned_some'|'returned_none'|'budget_limited',
  returned_refs:Hex[0..8], context_refs:Hex[0..1],
  missing:{record_ref:Hex,reason:MissingReason}[0..8]
}
Budget = {
  max_records:8,max_fields_utf16:16000,max_entity_refs:2,
  used_records:integer[0..8],used_fields_utf16:integer[0..16000],
  used_entity_refs:integer[0..2]
}
EvidenceSuccess = {
  schema_version:'0.1',mode:'evidence',snapshot_id:Hex,
  assessment:'source_records_only',semantic_assessment:'not_performed',
  correlation_id:Correlation,
  results:DeliveryResult[1..8],records:Record[0..8],sources:Source[0..3],budget:Budget
}
```

No query, path, field-name guessing, aspect, SQL, arbitrary payload, provider, caller-supplied budget or code/data selector is accepted by get. Request IDs are unique; refs are unique **within** each request, but may repeat across requests for sharing. At most two distinct exact EntityRef tuples appear across all requests; more is InvalidParams, not an implicit split into batches. Unknown syntactically valid record refs are normal missing results, not alternate lookups. Stable refs from discovery/related refs are the intended client path; the server checks active membership and ownership, not a server session of previously seen hints.

Deterministic delivery algorithm (one global deduplication set and one record list):

1. Validate the whole batch and all namespaces after authorization but before data load/lookup. Check active snapshot and trusted generation. Enumerate distinct owners in first-request order. Resolve **canonical** IDs without aliases, case folding, prefix matching or ontologyId fallback. Unknown/ambiguous owners make every requested ref missing with that owner reason; do not look up their requested refs or borrow another owner.
2. **Reserve owner contexts first for all resolvable owners**, in that first-occurrence order, before any other record. Owner context is the single full E record, not its label/body/status section. Its unique ref and UTF16(C(fields)) are charged once. If missing/quarantined use owner_context_unavailable. If it cannot fit, do not admit any body record for that owner; every requested ref gets owner_context_record_limit or owner_context_char_limit before any ref lookup (record-limit reason takes precedence if both fail). The context itself is not silently dropped. Context can be delivered even if all requested refs are subsequently unknown or mismatched; it is charged and appears as context_refs.
3. Visit requests in input order and their refs in input order. For a valid owner with no usable context, report the applicable context reason without body delivery. Otherwise: absent active ref → record_not_found; quarantined ref → the exact quarantine reason; known owned ref for another owner → record_owner_mismatch. These do not return another record's contents. If ref already admitted for that owner, reuse it at zero cost. Otherwise charge the complete record if both remaining limits permit; if not, mark record_limit (precedence when both fail) or char_limit and continue to subsequent refs. No slicing, substitution, overshoot or partial reservation. A too-large earlier record does not forbid a later smaller record that fits.
4. Construct one result per request, preserving id/entity_ref/requested_refs exactly. returned_refs are the requested refs actually in records for that owner, in requested order. context_refs is the admitted E ref, or empty if none; E may also be in returned_refs when explicitly requested, counting once. missing is exactly the ordered complement of returned_refs in requested_refs. A repeated ref **for the same requested owner** has identical eligibility/delivery outcome across requests because a skipped record never becomes affordable later; the same ref requested under a different owner remains a mismatch. If the owner-context phase failed, no returned_refs are permitted for it.
5. `status=budget_limited` iff any missing reason is one of owner_context_record_limit/owner_context_char_limit/record_limit/char_limit, even if other failures coexist. Otherwise returned_all iff missing is empty; returned_none iff returned_refs is empty; returned_some otherwise. returned_all requires its E context and ≥1 requested ref delivered. returned_some/returned_none require missing; budget_limited requires missing and may have zero returned refs. No status asserts semantic sufficiency.

The root records list is context-admission order followed by first successful explicit-record admission order, deduplicated globally by record_ref. Every emitted ref must be used in at least one returned_refs or context_refs; no hidden surplus context. `used_records = records.length`; `used_fields_utf16 = sum(UTF16(C(record.fields)))` over those unique records; `used_entity_refs` is the number of distinct owners represented by emitted records. Source wrappers, reference arrays and repeated refs are not a second textual evidence channel. The evidence response has no hints/result-prose channel: raw cells occur only in records.fields. Discovery's bounded metadata hints remain hints, never an uncharged evidence delivery. This exact cost definition deliberately includes all keys/empty cells/JSON escapes in fields, and differs from body-only sizes. Root records, hashes, owner links, budget and result partitions must pass cross-validation before any success is emitted.

Whole E metadata is the **only automatic context policy**, not a semantic qualifier closure. Related C1/status/date records are navigational suggestions, delivered only when explicitly selected and charged in full. An F row with no sourcePath/version cannot inherit a C entry's verification or date. Same owner/path/order does not prove contemporaneity. All conditions, unknown questions and qualifiers in selected records remain literal cells; the caller must preserve their scope and may need clarification when relevant context is not selected/available/within budget. The service cannot claim those records answer all obligations, nor that no further qualifications exist elsewhere. A structurally valid returned_all may still be inadequate to answer the user's question.

## 7. Controlled errors, MCP envelopes, and authorization

Closed JSON-RPC request for a call is `{jsonrpc:'2.0',id:integer|string,method:'tools/call',params:{name:'erp_subject.discover'|'erp_evidence.get',arguments:DiscoverInput|EvidenceInput}}`, with name/argument type coupling. String RPC ids are 1..128 UTF16, no controls; integer ids are signed safe integers excluding negative zero. Calls require an id. Standard MCP initialization/list envelopes are unchanged transport operations, not new retrieval inputs.

```text
ToolErrorCode = 'SNAPSHOT_MISMATCH'|'SOURCE_SNAPSHOT_CHANGED'|
  'INDEX_UNAVAILABLE'|'INDEX_CORRUPT'|'INDEX_FORMAT_UNSUPPORTED'|
  'DATA_BOUND_EXCEEDED'|'DATA_CODE_MISMATCH'|'INTERNAL_CONTRACT_ERROR'
ToolError = {
  schema_version:'0.1',mode:'error',operation:'discovery'|'evidence',
  code:ToolErrorCode,retry:'new_turn'|'operator_required',
  expected_snapshot_id:Hex|null,active_snapshot_id:Hex|null,
  correlation_id:Correlation
}
CallResult = {
  isError:boolean,
  structuredContent:DiscoverSuccess|EvidenceSuccess|ToolError,
  content:[{type:'text',text:string}]
}
RPCSuccess = {jsonrpc:'2.0',id:integer|string,result:CallResult}
RPCError = {
  jsonrpc:'2.0',id:integer|string|null,
  error:{code:-32700|-32600|-32601|-32602|-32603|-32001|-32004,
         message:string}
}
```

`isError=false` iff structuredContent is a success and name/mode correspond. `isError=true` iff ToolError with matching operation. Exactly one text item equals C(structuredContent) byte-for-byte after UTF8 encoding; no Markdown answer, exception, path or provider text. Both tools' outputSchema is the closed success-or-ToolError union, with name-specific success. Runtime validates schemas **and** all cross-invariants; a violation emits only INTERNAL_CONTRACT_ERROR, never a partially leaked success.

Tool error retry is new_turn only for SNAPSHOT_MISMATCH; it has the non-null supplied expected snapshot and current verified active snapshot. Others have retry=operator_required and both snapshot fields null. Internal contract failures also have null correlation if the input did not safely validate. A mismatch on discovery exists only if expected_snapshot_id was supplied; evidence always supplies snapshot_id. Whole-call errors emit no records/candidates/missing results. SOURCE_SNAPSHOT_CHANGED means missing/altered original source file relative to the provisioned manifest, not an answer-UNKNOWN. No automatic rebuild, legacy/free-form fallback or substituted generation occurs.

RPC errors have exactly these fixed messages: -32700 `Parse error.`, -32600 `Invalid request.`, -32601 `Method unavailable.`, -32602 `Invalid parameters.`, -32603 `Semantic execution unavailable.`, -32001 `Access denied.`, -32004 `Semantic capacity busy.` No data/stack/invalid-value echo is allowed. Unauthenticated HTTP is the existing generic 401 transport denial, before JSON/body/data work; malformed authorized JSON gives -32700, invalid envelope -32600, unavailable method/profile -32601, missing semantic scope/effective OWA namespace -32001, strict argument/type/key/cardinality/duplicate-ID/ref validation -32602. These happen before index/source reads. Cancellation disconnects without a success response; for a still-connected authorized cancelled job use -32603 with the same fixed message. Worker failure/unavailable uses -32603, busy uses -32004; neither has synchronous core fallback. Normal unknown refs and budget limits are evidence successes with missing, not tool/transport errors.

Authorization order: authenticate → profile method/scope (`kb.semantic.read`) and nonempty effective namespace intersection → validate full strict argument object and namespace of **every** reference → obtain pinned data descriptor → validate/load data in worker → compare requested snapshot → resolve refs → budget → validate output. An unauthorized namespace anywhere rejects the entire batch before any record lookup/read, not a partial result. A structurally correct foreign namespace is access denied; all other structural errors remain InvalidParams. Parent can validate these schema-independent namespace/scope conditions without inspecting index/body. Worker reconstructs and checks the same trusted profile/scope before data access. Missing/null namespace allowlists do not mean unrestricted access for this profile. Tool arguments and a valid hash never confer permission. Source, query, metadata paths, labels, correlation IDs and arbitrary strings are never filesystem capabilities.

## 8. Immutable compiler → index → lookup → verifier ABI

### 8.1 Complete accounting and ownership

Every parsed data record gets one StoredRecord, one unique physical record_ref and at least one record diagnostic. Header rows are not counted. There are exactly E67/F109/C190 records in a production PoC index. No record disappears because it has no candidate, unsupported Markdown, a duplicate record_id, a missing owner, or an oversized evidence body.

E canonical ownership uses exact unique valid E.id. Duplicate canonical IDs quarantine all their occurrences (`quarantined_ambiguous`), empty/invalid IDs quarantine unresolved. The owner-reference lookup takes the union of each E's nonempty exact id and ontologyId (same E twice collapses). F.entityRefId and C.sourceDocumentRefId must name exactly one E in that same OWA inventory, and that E must be admitted. Zero targets gives quarantined_unresolved; several gives quarantined_ambiguous; a unique quarantined root gives that root's quarantine reason. Aliases, labels, section headings, source paths and prefixes cannot resolve owners. Reference spelling is never normalized. An ontologyId collision need not remove a unique canonical E owner, but makes that ontologyId unusable for binding F/C. Input EntityRef.id still requires canonical id, not this ontologyId lookup.

The accounting partition is exact: `total = owned + quarantined_ambiguous + quarantined_unresolved`, separately for each artifact and globally; every record belongs to exactly one bucket. “Owned but no hints” is still owned, with an explicit diagnostic. Diagnostic counts overlap the partition and must not be added as extra records. The completed file-only addendum observed E **67 owned / 0 ambiguous / 0 unresolved**, F **109 / 0 / 0**, C **190 / 0 / 0**, total **366 / 0 / 0**; this is not an executed compiler admission result or a promise that every cell produces hints. All 366 rows require diagnostics even with zero observed ownership quarantine. The future compiler/verifier must derive the actual partition and every diagnostic rather than baking in 366-owned as a success constant.

```text
Disposition = 'owned'|'quarantined_ambiguous'|'quarantined_unresolved'
DiagnosticCode = 'owned_record'|'ambiguous_owner_ref'|'unresolved_owner_ref'|
  'invalid_owner_id'|'duplicate_record_id'|'no_hint_postings'|
  'invalid_field_name'|'invalid_section_order'|'malformed_identifier'|
  'unclosed_atom'|'unsupported_fence'|'semantic_not_assessed'
Diagnostic = {
  diagnostic_id:Hex,record_ref:Hex,code:DiagnosticCode,
  key:'id'|'ontologyId'|'entityRefId'|'sourceDocumentRefId'|'fieldName'|'mssqlColumn'|
      'sectionOrder'|'description'|'summary'|'content'|null,
  start_utf16:integer|null,end_utf16:integer|null
}
StoredRecord = {
  core:RecordCore,disposition:Disposition,entity_ref:EntityRef|null,
  ownership:{via:'self'|'entityRefId'|'sourceDocumentRefId',literal_ref:string},
  diagnostic_ids:Hex[1..]
}
Owner = {entity_ref:EntityRef,entity_record_ref:Hex,record_refs:Hex[1..]}
OwnerLookup = {literal_ref:Id,entity_record_refs:Hex[1..]}
Posting = {
  candidate_kind:'entity'|'field'|'identifier_mention',entity_ref:EntityRef,
  name:Id,search_value:string,origin:Origin
}
ArtifactAccounting = {
  artifact:Artifact,total:integer,owned:integer,
  quarantined_ambiguous:integer,quarantined_unresolved:integer,
  diagnostic_count:integer>=1
}
Accounting = {
  artifacts:ArtifactAccounting[3],total:366,owned:integer[0..366],
  quarantined_ambiguous:integer[0..366],quarantined_unresolved:integer[0..366],
  diagnostic_count:integer>=366
}
```

Diagnostic span fields are either both null or a valid half-open range in the specified raw body cell; malformed/unclosed/fence lexical diagnostics require spans. No location-less semantic diagnosis is fabricated. Diagnostic ID is H('diagnostic',{record_ref,code,key,start_utf16,end_utf16}); duplicate tuples collapse. All owned rows get owned_record; quarantined rows get the ownership diagnostic; all rows also get semantic_not_assessed. No postings gives no_hint_postings. duplicate_record_id applies to all occurrences of a repeated nonempty id within an artifact, without changing physical identity or guessing another record. Invalid sectionOrder means not an ASCII decimal integer fitting the safe nonnegative integer range; it affects only navigation. Invalid F chosen name gets invalid_field_name if neither fieldName nor fallback is usable. Lexer diagnostic invalidIdentifier maps to malformed_identifier, unclosedQuote to unclosed_atom. Excluded opaque/RHS/fence contents do not create declarations or source-UNKNOWN records.

Owned StoredRecord.entity_ref is non-null; quarantined is null. Owner lists are exactly admitted E roots plus all owned F/C rows for them, including the E itself. OwnerLookup includes nonempty values satisfying Id and retains all matching E occurrences including quarantined ones; an invalid id/ontologyId has invalid_owner_id with that exact key, is not normalized into a valid lookup token, and cannot resolve F/C ownership. Ambiguity is represented, not resolved to the first. Postings reference only owned records with exactly matching entity_ref; no quarantine posting reaches discovery. Diagnostics must resolve to all and only StoredRecords; all diagnostic_ids are used, all IDs recompute. No semantic table/fact/qualification/interface is deferred to a later reader.

### 8.2 Closed manifest and payload

```text
FileEntry = {path:string,bytes:integer>=1,sha256:Hex}
Environment = {node_version:string[1..128],unicode_version:string[1..128],icu_version:string[1..128]}
Compiler = {
  abi:'owa-raw-compiler/1',lexer:'source-lexer-esj4gr-v1',
  files:FileEntry[1..],closure_sha256:Hex,environment:Environment
}
IndexPayload = {
  format:'owa-record-index/1',contract_version:'0.1',
  canonicalization:'cjson-utf16-v1',
  base_manifest_sha256:Hex,compiler_closure_sha256:Hex,
  runtime_code_sha256:Hex,worker_generation_id:Hex,environment:Environment,
  sources:Source[3],records:StoredRecord[366],owners:Owner[0..67],
  owner_lookup:OwnerLookup[1..134],postings:Posting[0..],
  diagnostics:Diagnostic[366..],accounting:Accounting
}
DataManifest = {
  kind:'owa-raw-record-poc',manifest_version:1,contract_version:'0.1',
  canonicalization:'cjson-utf16-v1',base_manifest_sha256:Hex,
  compiler:Compiler,runtime_files:FileEntry[1..],runtime_code_sha256:Hex,
  worker_generation_id:Hex,environment:Environment,
  sources:Source[3],
  index:{path:'index.json',bytes:integer>=1,sha256:Hex,format:'owa-record-index/1'},
  snapshot_id:Hex,data_bytes:integer[1..8388608],accounting:Accounting
}
TrustedDataGeneration = {
  abi:'owa-raw-data-generation/1',data_root:string,manifest_path:string,
  manifest_sha256:Hex,snapshot_id:Hex,worker_generation_id:Hex,
  runtime_code_sha256:Hex
}
```

Compiler/runtime FileEntry paths are safe relative POSIX paths with no empty/dot/dotdot/backslash/NUL/absolute component, unique and sorted by UTF16 path order. They inventory the **entire** respective transitive non-builtin import closure, including the bootstrap/loader/contract/lexer modules and compiler entrypoint where applicable; missing or non-inventoried imports fail closure validation. Builtin imports are literal specifiers accepted by the pinned Node environment's `isBuiltin` predicate; bare and node:-prefixed spellings must identify the same builtin. This is an environment-bound closed builtin set, not permission to resolve unlisted packages or source-derived module names. The only permitted variable application import is the existing trusted generation bootstrap's coreUrl/profilesUrl/workerUrl selection: the selected URL must be an exact member of its captured sources map and correspond to that named inventory file, otherwise reject. Other unresolved variable/dynamic imports fail closure validation. Runtime and compiler environments must exactly match worker process.version/process.versions.unicode/icu, and one another; Environment strings are ASCII version spellings matching `^[A-Za-z0-9._+-]{1,128}$`. The controller pins those exact values; there is no wildcard compatibility promise. Compiler.closure_sha256 = H('compiler-closure',{files,environment,abi,lexer}); runtime_code_sha256 = H('runtime-closure',{files:runtime_files,environment}). Both use exact file byte lengths/hashes. Runtime_code_sha256 covers the transport/pool/generation/bootstrap handlers as well as domain modules; no dependency can be silently outside the code ceiling. The existing generation.id remains its own identifier (SHA of UTF8 JSON.stringify(captured sources) in the existing capture order); the trusted descriptor binds both that exact ID and the canonical runtime closure. Its loader/bootstrap bytes also belong to runtime_files. This does not silently substitute a new hash algorithm for main's existing generation.id.

Index records order by artifact then byte_start; owners by canonical id; owner_lookup by literal_ref and its refs by physical order; postings by candidate_kind/entity_ref.id/name/search_value/origin physical coordinates; diagnostics by record_ref/code/key/start/end (null before value); artifact accounting and sources by artifact. Record_refs/diagnostic_ids inside index objects sort by the same physical/diagnostic order; duplicate posting tuples collapse. Unbounded notation `[0..]`/`[1..]` has no arbitrary logical truncation: its finite maximum is the full data byte cap. Missing/unknown format keys are errors, not extension points.

The acyclic hash dependency order is:

1. Hash original E/F/C bytes and separately hash compiler/runtime code closures and environment. The original EsJ4gr manifest hash is the fixed §2 seal, not a recomputed runtime-input inventory.
2. Parse all records; compute fields hashes, record hashes/refs, diagnostics, ownership and finite postings. Compute candidate IDs only from their §5 key, not the index hash.
3. Serialize **IndexPayload only**, with no snapshot_id/index hash/manifest hash inside it. `index.sha256 = SHA(UTF8(C(IndexPayload)))`, `index.bytes` is that UTF8 length.
4. `snapshot_id = H('snapshot',{format:'owa-record-index/1',contract_version:'0.1',canonicalization:'cjson-utf16-v1',base_manifest_sha256,compiler_closure_sha256,runtime_code_sha256,worker_generation_id,environment,sources,index_sha256:index.sha256})`.
5. Define `data_bytes = sum(Source.bytes) + index.bytes`, explicitly **excluding the manifest itself**, so its value is acyclic. Serialize the final manifest. Independently enforce `data_bytes + UTF8_length(C(DataManifest)) ≤ 8388608` on the actual five-file aggregate. Externally trusted `manifest_sha256 = SHA(its exact canonical UTF8 bytes)`.

The manifest contains no own hash. Code contains ABI rules, not the resulting manifest/snapshot hash; neither captured generation.id nor code closure includes data files. Changing code/environment, any input bytes, index contents or manifest content forces a new binding; there is no cycle or self-hashed field. Manifest bytes are included in the hard aggregate limit even though the data_bytes payload counter excludes them.

Data generation consists **only** of final manifest, index.json and the three original CSV byte files under the paths in §2. **8 MiB is a separate data bound on this entire set** (therefore also on the index), not an allowance added to retained code. Runtime code has a separate total **2 MiB (2097152 bytes)** cap across captured runtime closure; data is never imported as JS/JSON modules, evaled, or inserted into the code `sources` map. Compiler files are design-time input code with a separately checked 2 MiB closure bound; they do not become a hidden worker cache. Exceeding any applicable limit fails build/load; no source/posting/sample truncation or fallback.

### 8.3 Interfaces, trusted lifecycle, and failures

The following are normative **interfaces**, not an implementation plan or existing callable exports. `CodeBinding = {worker_generation_id:Hex,runtime_code_sha256:Hex,environment:Environment}` and `AuthorizedScope = {profile_id:'erp-semantic-evidence-poc',scope:'kb.semantic.read',namespaces:['OWAOntology']}` are closed internal types. ByteSequence means an immutable finite byte vector, not JSON/MCP input.

* `compileRawIndex({compiler:Compiler,runtime_files:FileEntry[1..],runtime_code_sha256:Hex,worker_generation_id:Hex,environment:Environment,base_manifest_sha256:Hex,inputs:{artifact:Artifact,bytes:ByteSequence}[3]}) → {ok:true,index_bytes:ByteSequence,manifest_bytes:ByteSequence,snapshot_id:Hex} | {ok:false,code:BuildError}`. The controller supplies descriptors measured from its captured immutable compiler/runtime code bytes, not declarations accepted from a client; the compiler checks its own closure/environment against that capture. BuildError is the closed enum `SOURCE_FINGERPRINT_MISMATCH | CSV_INVALID | CODE_CLOSURE_INVALID | OWNERSHIP_ACCOUNTING_INVALID | INDEX_CONTRACT_INVALID | DATA_BOUND_EXCEEDED | ENVIRONMENT_MISMATCH`. Inputs must equal §2 bytes/hashes/counts; ambiguity/unresolved refs are accounted quarantine, not a whole-build failure by themselves. Compiler cannot open any path read from cells/query. Outputs use precisely §8.2 bytes, no additional unspecified tables.
* `loadRawGeneration(trusted:TrustedDataGeneration,code:CodeBinding,authorized:AuthorizedScope) → {ok:true,handle:LoadedRawGeneration} | {ok:false,code:LoadError}`. LoadedRawGeneration is an opaque immutable **in-process** pair of validated DataManifest/IndexPayload and original source byte buffers, plus trusted binding; not an arbitrary path/session identifier or serializable client capability. LoadError is exactly ToolErrorCode excluding SNAPSHOT_MISMATCH/INTERNAL_CONTRACT_ERROR. Invalid/missing authorization never enters this loader; RPC denial happens first.
* `discoverRaw(handle:LoadedRawGeneration,input:DiscoverInput) → DiscoverSuccess | ToolError`; `getRawRecords(handle:LoadedRawGeneration,input:EvidenceInput) → EvidenceSuccess | ToolError`. Both use the exact closed types/rules above, validate snapshots and do no source parsing/rebuild/provider work per query. Expected input has passed authorization and strict validation; they still validate outputs.
* `verifyRawArtifact(trusted:TrustedDataGeneration,code:CodeBinding,authorized:AuthorizedScope) → {valid:true,snapshot_id:Hex,accounting:Accounting} | {valid:false,code:BuildError|LoadError}`. An independent verifier reads only controller-pinned files after its authorization and recomputes CSV/fields/ownership/diagnostics/postings/hashes/manifest relationships, not just self-reported checksums. Compilation and verification share this ABI, not a reservation/bookkeeping API.

The controller constructs a provisional TrustedDataGeneration from compiler output and copies the three original input byte vectors plus canonical manifest/index verbatim to its private staging root. The independent verifier receives that controller-selected descriptor and captured CodeBinding; only after verification does the controller release the identical immutable descriptor to the private pool. This staging/release distinction avoids a verification/provisioning cycle. TrustedDataGeneration is attached to private executor configuration, **never MCP arguments, HTTP headers supplied by the client, query strings or a serverSession**. data_root/manifest_path are absolute, trusted local paths without trailing slash/dot components; manifest_path must equal data_root + `/manifest.json`. On authorized load the worker opens only that manifest, its literal `index.json`, and the three fixed source paths under data_root with symlinks/dot traversal rejected for every component, regular-file and size checks before reads. No directory walk or arbitrary manifest extra file is allowed. The controller-provided manifest hash is the trust root; an attacker changing manifest plus index/source hashes cannot authorize a new generation. Manifest source entries must match §2; file lists/closure/environment must match the pinned worker code.

Validation order after authorization: descriptor/code binding → manifest existence/byte bound/hash/canonical encoding/version → index existence/bounds/hash/canonical format → source existence/bounds/original hashes → payload accounting/refs/closed schemas and decoded-fields versus source slices → environment/code closure/snapshot consistency → immutable handle. Both worker slots receive **the same descriptor and pinned code generation**, not “latest file” selection. Workers load/validate only on their first authorized PoC job. Subsequent authorized jobs check pinned manifest/index/source fingerprints again from the fixed trusted paths before reusing the immutable handle; reading and hashing is charged to that job, but CSV parsing/compilation is not repeated. Files read for a job are captured once into owned byte buffers; lookup never rereads a mutable path after validating that job's snapshot. Any change invalidates the generation until operator action. No pre-auth scope index, body read, warm preload or corpus cache is introduced.

The private job/message ABI is also closed. `Milliseconds` is a finite nonnegative JSON number (fractional allowed), not hashed identity material:

```text
RawWorkerJob = {
  jobId:RequestId,request:the closed RPC call in §7,
  context:{authorization:AuthorizedScope,trustedDataGeneration:TrustedDataGeneration,
           code:CodeBinding},
  timing:{queueMs:Milliseconds,startupMs:Milliseconds}
}
RawWorkerReady = {type:'ready',generation:Hex}
RawWorkerDataReady = {
  type:'data-ready',jobId:RequestId,worker_generation_id:Hex,
  manifest_sha256:Hex,snapshot_id:Hex
}
RawWorkerResult = {
  type:'result',jobId:RequestId,response:RPCSuccess|RPCError,
  handlerWallMs:Milliseconds,worker_generation_id:Hex,manifest_sha256:Hex,
  snapshot_id:Hex|null,data_state:'validated'|'unavailable'
}
RawWorkerFailure = {type:'request-error',jobId:RequestId,handlerWallMs:Milliseconds}
```

The pool's initial ready message binds code only and reads no PoC data. RawWorkerJob is constructed from the authorized parent context; worker reconstructs profile/server metadata from the pinned profiles module rather than client context, converts the fixed namespace array to the existing internal Set if needed, and revalidates authorization. Each slot sends data-ready after its **first successful** artifact load, before its first data-bearing response. Validated results require matching non-null snapshot_id plus the same manifest/code hashes. Load-error results have data_state=unavailable and snapshot_id=null, require no data-ready, and contain the corresponding controlled ToolError, not a discovery/evidence success. An authorization/schema rejection is instead an RPCError with data_state=unavailable and snapshot_id=null, even if a prior job loaded data; that rejected job never triggers data access to fill telemetry. manifest_sha256 on an unavailable result identifies the expected trusted root, not a claim that it loaded. Unexpected handler failure uses RawWorkerFailure and generic parent failure, without exception text. The pool checks all identities against the single trusted descriptor, rejects mismatched/late jobs, and isolates/terminates execution failures under the existing policy. A replacement worker uses that descriptor; it cannot select a new data revision. These internal messages are not client API inputs. Two workers may each hold a validated copy of the same artifact set (≤8 MiB serialized bytes per generation, not a measured heap-memory bound); pool ≤2 workers, not one shared mutable object. The old four-method job contract is retained for its own paths; this typed branch does not reinterpret it.

| Condition | Controlled load outcome |
|---|---|
| Manifest/index absent or inaccessible | INDEX_UNAVAILABLE |
| Original source absent or original bytes changed | SOURCE_SNAPSHOT_CHANGED |
| Oversized data/index/final aggregate | DATA_BOUND_EXCEEDED |
| Hash mismatch, noncanonical JSON, bad raw-record/ownership/posting/count/ref invariant, unsafe path or symlink | INDEX_CORRUPT |
| Well-formed but unknown manifest/index/ABI/canonicalization version | INDEX_FORMAT_UNSUPPORTED |
| Trusted descriptor/code generation/runtime closure/environment mismatch | DATA_CODE_MISMATCH |
| Validated data but caller's snapshot differs | SNAPSHOT_MISMATCH, no lookup/substitution |

First failing stage wins. No exceptions/paths are exposed. Code-over-bound prevents worker capture and maps to generic semantic unavailable, not data success. A corrupt generation is never automatically rebuilt or “recovered” from free-form source reads. No proposed lifecycle changes a running service or the frozen EsJ4gr bundle.

## 9. Actual main integration boundaries (future, not implemented)

| Main path/interface inspected as source | Binding required by this design |
|---|---|
| `scripts/lib/erp_knowledge_mcp_core.mjs`, domainTool/listToolsForProfile L280–299 and tools/call L548–615 | Dedicated typed definitions and runtime input/output validators; dispatch two handlers before generic DOMAIN_TOOL_DESCRIPTIONS/answerQuestionTool. No String/Number coercion, answerer/renderCompactOwaAnswer/provider/learning fallback. readOnlyHint/idempotentHint true; destructiveHint/openWorldHint false. |
| `scripts/lib/erp_knowledge_mcp_profiles.mjs` L19–23 | New private `erp-semantic-evidence-poc`, read-only, namespaces [OWAOntology], scope kb.semantic.read, port null, tools exactly [erp_subject.discover, erp_evidence.get, list_knowledge_bases]. No new exposure in existing profiles. list_knowledge_bases remains the existing common metadata tool, filtered to effective OWA scope, not a third retrieval channel. |
| `scripts/lib/semantic_worker_pool.mjs` METHODS L6–10 and run L83–107 | Global worker-method whitelist retains old four plus these two = **six**, while each profile still filters exposure. Keep 2 workers / 8 queued, disconnect cancellation and job isolation. Add trusted data binding validation; disallowed/empty-scope requests deny, never fall through synchronously. |
| `scripts/erp_knowledge_mcp_http_bridge.mjs` handleMcpPost L247–300 | Existing bearer auth precedes dispatch; profile/effective-scope + full namespace validation must precede any PoC data access and worker admission. Missing new-name whitelist cannot route to core's synchronous fallback. No port/service publication. |
| `scripts/lib/semantic_worker_entry.mjs` L6–25 | Reconstruct trusted profile/scope and carry controller descriptor, check before load, return pinned data-ready/result identity. Client cannot set it. |
| `scripts/lib/semantic_worker_generation.mjs` SEMANTIC_CODE_FILES/capture/loader L7–67 | Existing capture pins code only, not corpus. Bind reviewed transport/bootstrap/loader/runtime closure and every new import under its code ceiling; add distinct trustedDataGeneration transfer, never insert index into code inventory. |
| `scripts/lib/owa_offline_harness.mjs` MODULE_FILES and closure validation | New exact fixture kind `owa-raw-record-poc`, with the same runtime closure and separate data manifest ABI; not mutation/reinterpretation of sealed old 79 files or gold inclusion. |

Proposed module responsibilities, with already-defined ABI: `semantic_raw_contract.mjs` owns §§3–7 validation/types/parity; `semantic_raw_index.mjs` owns query-independent §8 compilation representation; `semantic_raw_lookup.mjs` owns discover/get and §6 admission; `semantic_raw_generation.mjs` owns trusted loading/binding; `semantic_raw_verifier.mjs` owns artifact/transcript verification; `scripts/compile_semantic_raw_index.mjs` is the separate offline compiler entrypoint. The exact frozen pure lexer is a pinned dependency, absent from main's current code inventory and requiring explicit inclusion in both future worker and offline inventories. These are responsibility boundaries, not files created by this task or permission to import dirty worktree implementation. There is no undefined shared reservation API and no server-side session.

## 10. Client protocol and contract verifier

Per final answer, the PoC client may make **at most two discovery calls and one evidence call**, in that order, to one pinned snapshot. It may stop for clarification earlier. It selects canonical owners and physical record refs explicitly. Every explicit get ref must actually have appeared in an earlier successful discovery's emitted candidate.record_refs or related_records for that exact owner and snapshot; an omitted count, gold list, filesystem read or guessed hash is not exposure. The server's stateless membership check alone does not establish this client-protocol condition. If a second discovery is made, its expected_snapshot_id must equal the first successful discovery snapshot. A final evidence-backed answer must have exactly one evidence call; zero evidence calls permit only clarification/unavailability, not factual claims from hints. A snapshot mismatch ends that attempt; discovery retries occur in a new user interaction, not accumulated batches. A second evidence batch, snapshot mixing, or use of legacy/common metadata tools to smuggle extra evidence invalidates the transcript under this protocol. The server enforces per-batch bounds; the verifier enforces the cross-call limit and actual discovery exposure without adding session state. This finite workflow is not a promise every question can be answered in three calls.

The caller distinguishes metadata field declarations from lexical mentions. It interprets literal smallint/UNKNOWN/questions/conditions without turning record delivery into a server fact or current ERP verification. Whole source records may still contain incomplete tables or historical contradictions; final wording must not remove these qualifications. When an answer needs unselected/context-limited records, the caller reports that limitation or asks for refinement. No LLM semantic judge is part of the protocol verifier.

```text
Transcript = {
  calls:{request:the closed RPC call type in §7,
         response:RPCSuccess|RPCError}[0..100],
  outcome:'answer'|'clarification'|'unavailable', final_answer:string|null
}
Violation = {
  call_index:integer[0..99]|null,
  rule:'call_limit'|'call_order'|'snapshot_mixing'|'wire_schema'|'text_parity'|
       'artifact_binding'|'reference_membership'|'owner_binding'|
       'record_integrity'|'result_partition'|'context_required'|'budget'|
       'discovery_not_evidence'|'output_not_deterministic'
}
verifyRawTranscript(trusted:TrustedDataGeneration,code:CodeBinding,
  authorized:AuthorizedScope,transcript:Transcript)
  → {valid:true,assessment:'contract_only',semantic_assessment:'not_performed',
     snapshot_id:Hex}
  | {valid:false,violations:Violation[1..]}
```

The verifier first checks trusted artifacts, then reconstructs deterministic discovery/admission from the supplied calls and index, recalculates raw fields/source hashes/refs and all budgets, and checks every wire/owner/partition/envelope constraint, including matching request/response RPC id and name/mode. reference_membership checks both active-index membership and actual prior discovery exposure of every explicit get ref under the same owner/snapshot; automatic E context need not have been exposed separately. Artifact failures map to artifact_binding. Calls outside the closed wire type produce wire_schema; malformed transcripts can be rejected without interpreting final_answer. call_index is null for transcript-wide violations; otherwise the zero-based offending call. It checks discovery_not_evidence structurally: outcome=answer requires exactly one evidence success, while clarification/unavailable permits earlier stopping; every outcome still obeys one-get maximum. Outcome is a caller-declared label, **not a certification that the natural-language text is only clarification or is true**. It cannot certify preservation of semantic qualifications or generalization; valid means contract mechanics only. Final_answer is recorded for separate human/model-client evaluation, never parsed as an additional evidence input. No output pass score is inferred from that string. This explicit limitation is part of acceptance.

## 11. Fully typed synthetic wire examples — NONEXECUTED

These miniature fixtures demonstrate wire types, hashes and budgets, not the production EsJ4gr generation. They were derived with standard-library canonical serialization/hash arithmetic only; no application module/tool/compiler/test/API was executed. `SYNTH_ENTITY` is synthetic, not a new corpus record. Its source is an E header in §4 followed by the CSV row `SYNTH_ENTITY,Synthetic,,ontology_entity,Synthetic,,,,,,,,,` and LF (the header also ends LF). Source bytes=220; record byte span=[161,220), physical line 2. The synthetic snapshot is H('synthetic-snapshot',{fixture:'one-owner-wire-example',source_sha256:'9af641619beaffcf5b0b4b7aa6f61c549248af6a824e00c7650d197df2e6ac70'}), not a claim that a production manifest was built. Production admission still requires all three original files/366 records. Every field of the synthetic success payload is instantiated:

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

The exact corresponding request is:

```json
{"jsonrpc":"2.0","id":"synthetic-ok","method":"tools/call","params":{"name":"erp_evidence.get","arguments":{"snapshot_id":"fe0294cf7aeb55c2974d68fb90425d963a0b0a670685603261ff4ab359287b55","requests":[{"id":"example","entity_ref":{"namespace":"OWAOntology","id":"SYNTH_ENTITY"},"record_refs":["23a414754fb011be8bbe08638342651c022c46267eba30ff6b59a2756766c664"]}]}}}
```

The success RPC has id synthetic-ok, result.isError=false, result.structuredContent equal to the complete payload above and a single result.content text equal to C(that payload), as defined in §7. No field of that envelope is discretionary. For completeness, a fully expanded synthetic discovery-success RPC for a nonmatching hint against the same miniature source is:

```json
{"jsonrpc":"2.0","id":"synthetic-discover","result":{"isError":false,"structuredContent":{"schema_version":"0.1","mode":"discovery","snapshot_id":"fe0294cf7aeb55c2974d68fb90425d963a0b0a670685603261ff4ab359287b55","assessment":"source_records_only","semantic_assessment":"not_performed","correlation_id":null,"status":"no_candidates","candidates":[],"has_more":false},"content":[{"type":"text","text":"{\"assessment\":\"source_records_only\",\"candidates\":[],\"correlation_id\":null,\"has_more\":false,\"mode\":\"discovery\",\"schema_version\":\"0.1\",\"semantic_assessment\":\"not_performed\",\"snapshot_id\":\"fe0294cf7aeb55c2974d68fb90425d963a0b0a670685603261ff4ab359287b55\",\"status\":\"no_candidates\"}"}]}}
```

Its request is `{"jsonrpc":"2.0","id":"synthetic-discover","method":"tools/call","params":{"name":"erp_subject.discover","arguments":{"query":"unmatched","kind":"entity"}}}`. This envelope exemplifies success, not corpus completeness. The following fully expanded error envelope is for the evidence input above with id synthetic-stale and the stated stale synthetic snapshot:

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

An unauthorized request is instead the complete RPC error `{"jsonrpc":"2.0","id":"synthetic-denied","error":{"code":-32001,"message":"Access denied."}}`, with no tool result or data loading. A delivery failure such as unknown ref is **not** either envelope: it is an EvidenceSuccess with returned_none, empty returned_refs, the exact requested ref in missing with record_not_found, admitted owner E context if available, and its charged budget. These are different failure layers.

## 12. Three real-source transcript designs — ALL UNEXECUTED

These are prospective client sequences using literal CSV witnesses, not captured tool responses or precomputed answer-quality results. `S` below denotes the future **verified active** production snapshot returned by discovery; no production snapshot has been computed. Abbreviations below are documentary substitution notation, not extra wire types/inputs. Get accepts only their exact 64hex values. The examples do not invent executed discovery outputs/ranks. The completed addendum in §2 supplies file-measured fit, independently of the normative ref algorithm and unimplemented discovery/compiler/lookup.

| Symbol | Exact CSV record / physical lines | Derived record_ref under §4 |
|---|---|---|
| EB | E Konto bankowe / 171 | `f0995fa082b0e7dc31f39a29b932ef3a9831390ce11db9d8cd3f418dc862817c` |
| EL | E Konto księgowe / 172 | `5ad0cb476fa560cd7e270ad3eb554f6182f78d6ea0eb959d5452a29571d5bb45` |
| EK | E Kontrahent / 173 | `c42227c5225810041b78b23f71088938c18bcef1c9d1c52e174146db718d09bf` |
| B1 | C OWA_CHUNK_KONTO_BANKOWE_1 / 1954–1981 | `64cc68bdec3866dd91fe90c86ae03da039a3a108de1054526b1b7f5a2836e787` |
| B2 | C OWA_CHUNK_KONTO_BANKOWE_2 / 1982–2009 | `d5b2bcdcf60791f0b8be65bd1a2a1209a95a28daf28f8a56341525e81def30c5` |
| B3 | C OWA_CHUNK_KONTO_BANKOWE_3 / 2010–2044 | `5e1c4d27284c6079401e3db86b04dacd8c5d135a2935e22253247d89fce1c245` |
| L1 | C OWA_CHUNK_KONTO_KSIEGOWE_1 / 2045–2077 | `9da9cdf7ece2ef866fb527444a00e066ab2d8b20818aea449a558e12f10d5744` |
| L2 | C OWA_CHUNK_KONTO_KSIEGOWE_2 / 2078–2104 | `e60a87a47f68e2dd95e59f786df1d402f80466cfeb58f2ed9f8fcfbb1844a6a3` |
| L3 | C OWA_CHUNK_KONTO_KSIEGOWE_3 / 2105–2124 | `afea02c7a750f64d5334a52d36fcda7e452d1a100c05acf8b7393c36a1213711` |
| F47 | F Knt_OpeZalID / 47 | `5ae14cee96f0d70c4e8522f7d47f5863f31584b128a21329b8c7f726d4b85285` |
| F48 | F Knt_OpeModID / 48 | `f6beb61d8e6c50fce6cfd52f8cb940c9178fa16f3f9acdc6a4a6df02458ff25f` |
| F50 | F Knt_TS_Mod / 50 | `6ac2f9f1b7684e9b4b31f585916006422bc879dd752080079e87b8de09daff74` |
| K1 | C contractor chunk 1 / 2125–2143 | `c0488980610c1f4fe19201c13d0c71b035ef7792e4b1a0902b552d5cb837f5b6` |
| K2 | C contractor chunk 2 / 2144–2163 | `2674a3e65dc6f233e44babf33958f34fd95da3b7b3ea278bee64641e000bbdab` |
| K5 | C contractor chunk 5 / 2200–2229 | `7e2705268e2639addb3b27ffe59d17e7e38261d56797bd999ca362c7c193ced9` |
| K6 | C contractor chunk 6 / 2230–2238 | `17d2eca2a87f390b26fcbcfe788a0267636777ab69eb56ed8106e3f910011876` |

### A. “Konto”: bank account versus ledger account

1. discover `{query:'konto',kind:'entity',limit:5}`. It must not choose an owner on the caller's behalf. Raw E names support bank and ledger candidates; other matches/has_more depend on the generic index. If this is insufficient to choose, stop for user clarification rather than infer “bank” from “account”.
2. If the user intends comparison and both canonical owners are returned, the caller can issue one evidence batch with request bank for `OWA_ENTITY_ENCJA_KONTO_BANKOWE`, refs [B1,B2,B3], and request ledger for `OWA_ENTITY_ENCJA_KONTO_KSIEGOWE`, refs [L1,L2,L3], snapshot S. These refs must actually be present as discovery-related refs before selection; no file read/gold list supplies them to the model. The automatic contexts are EB and EL. This is the completed addendum's **8 records / 2 owners / 13175 fields characters** selection, not a measured tool response.
3. Expected **unexecuted mechanics** under this pinned source selection: two returned_all results, shared snapshot, exact eight records with no unused source group. Other source selections may be budget_limited. Caller reads literal table roles/definitions from raw cells. Empty E.mainTable is not filled. Ledger alias Konta and source “Plan kont” are not automatically PRIMARY, and no returned status means “verified SQL”. This transcript does not assert final-answer correctness.

### B. Three contractor audit fields

1. discover `{query:'Kontrahent',kind:'entity',limit:5}` to obtain the canonical contractor owner and S; then discover `{query:'Knt_OpeZalID Knt_OpeModID Knt_TS_Mod',kind:'field',entity_ref:{namespace:'OWAOntology',id:'OWA_ENTITY_ENCJA_KONTRAHENT_KARTOTEKA_KONTRAHENTOW'},expected_snapshot_id:S,limit:5}`. The explicit name list is §5's lexical set tier; genuine metadata candidates F47/F48/F50 rank before mentions, with same-owner related navigation and visible cap/counts. The client selects only refs actually exposed. Unexpected absence/truncation ends in refinement, not a gold-supplied selector or third discovery.
2. One get with snapshot S and four requests `created_by` [F47], `modified_by` [F48], `modified_at` [F50], `selected_context` [K1,K2,K5,K6], each with the exact contractor canonical owner. EK is mandatory and charged once. This is the addendum's **8 records / 1 owner / 9231 fields characters** selection. All context chunks are explicit whole records, not synthesized sections. K3/K4 remain omitted; including them needs 10 records even though all ten use only 13436 characters.
3. Expected unexecuted mechanics: four separate result partitions and shared EK, with raw context's own identity intact. The caller can read `int`, `int`, `datetime` and the three literal descriptions. `mcpField='CDN'` is not an API parameter proof; K2 table-role prose does not map every F row physically to CDN.Kontrahenci; K3/K4 remain un-reassembled source fragments. Missing those chunks cannot be declared semantically harmless by the server. This is neither full old-U01 SQL mapping nor a 20Q PASS.

### C. BRa_IBAN type and unresolved meaning

1. discover `{query:'Konto bankowe',kind:'entity',limit:5}` to obtain the canonical bank owner/S, then discover `{query:'BRa_IBAN',kind:'field',entity_ref:{namespace:'OWAOntology',id:'OWA_ENTITY_ENCJA_KONTO_BANKOWE'},expected_snapshot_id:S,limit:5}`. Bank has no F rows. Only identifier_mention candidate(s) can originate from B2/B3 and other lexical occurrences. No fabricated OWA_FIELD ID or field-declaration kind is allowed. Related refs navigate B1 and other same-owner/path records; exact origin/related cap counts are visible.
2. One get, snapshot S, request `iban_sources` for bank owner with [B1,B2,B3] when exposed. EB is automatic: the addendum's **4 records / 1 owner / 6579 fields characters** selection. B1 is explicitly selected to include its separate status, not automatically treated as a semantic closure edge. If only B2/B3 are selected the server must not invent B1 status or say the unseen qualifications were checked.
3. Expected unexecuted mechanics for that selection: returned_all with all four complete raw fields objects; other selections can produce budget_limited. Every chunk has semantic_completeness:not_assessed. Caller sees B2's literal `BRa_IBAN (smallint) — NOT EXPOSED BY MCP`, B3's “to flaga czy ID?” and historical 2026-07-15/unfinished-validation text, and B1's separately scoped status. The server neither decides UNKNOWN nor contradicts the literal source; caller must not choose a flag/ID/enum or reinterpret the question's quoted varchar as an asserted type. Contract success is delivery, not an answer-quality score.

## 13. Acceptance, review resolution, and remaining concerns

| Review issue | Revision decision and normative closure |
|---|---|
| I1 closed wire/errors | §§3–7: all nested types, cardinalities, strict/null/optional behavior, ref/scope errors, missing partitions/status legality, deterministic budget, parity and synthetic success/error. §§8/10 close internal/verifier interfaces. |
| I2 proof edges | §§1/4/6: semantic facts/support edges removed, replaced by exact record hashes/physical locators/literal-owner binding. Shared records deduplicate without field/aspect relabeling. Integrity is export-record integrity only. |
| I3 discretionary qualifier closure | §6: complete owner E mandatory, reserved first; no semantic qualifier/date/version closure or inheritance. Explicit related navigation and caller responsibilities replace the impossible promise. All selected additional records consume whole-record budget. |
| I4 four source readers | §5: removed semantic readers entirely; finite metadata admission and closed source-lexer hint rules, exclusions and diagnostic rules. No source-fact/type/UNKNOWN grammar. Source fragments can be raw-delivered but never “completed”. |
| I5 immutable ABI | §8: complete accounting, index/manifest/diagnostic/owner/posting types, canonical hashes without cycles, compiler/lookup/verifier interfaces, trusted controller root, same data pin for both authorized workers, separate code/data bounds and precise load failures. §9 maps actual main gaps. |

Future contract acceptance must check all 366 physical records/accounting/diagnostics, absence of forbidden domain inputs, exact source-byte/ref integrity, owner/namespace/stale/corrupt denial, deterministic whole-record admission and mandatory context failures, both worker bindings, profile filtering, strict runtime validators, and full transcript bounds. These are **criteria**, not tests run in this revision. Missing ref, cross-owner substitution, truncated table, invented declaration, data-code mismatch, over-bound artifact or unauthorized data read must block the private PoC. Known source fragments and omitted hints cannot manufacture completeness.

Cold compiler CPU/wall and bytes, independent verification, first authorized worker load/hash/lookup, warm per-job fingerprint/lookup and full ≤3-call client transcript costs are separate future measurements. No initialization offload hides cost or changes old A8. Passing deterministic contract fixtures does not demonstrate caller LLM question decomposition, final semantic correctness, qualifier preservation or generalization. Any independent fresh holdout follows a frozen PoC plus frozen caller model/prompt/tools/cost protocol; no promised 20/20 or automatic publication follows.

**Written choices requested:** accept/reject the raw-record-only service role; the explicit new 8-record / 16000-UTF16-fields / 2-owner budget and mandatory whole-E charging; the bounded two-discover/one-get client workflow; immutable OWA-only data/code ABI with 8 MiB total data and separate 2 MiB runtime code ceilings. These replace draft-1 semantic aspects/grouping/4000-budget proposal, not the legacy contract.

**Remaining concerns, not fabricated successes:** completed source arithmetic covers the named selections, not arbitrary question fit; the broader contractor context exceeds the record cap. Index and code closure sizes are not built/measured; there is no runtime schema/auth/worker integration evidence; finite navigation may require clarification rather than expose every desired field within two discoveries; raw whole records and owner context do not ensure semantic qualification sufficiency or answer quality. User acceptance of the maximum is not acceptance that every witness fits. Resolution record and exact document fingerprints are in `.superpowers/sdd/explicit-semantic-design-revision-20261021.md`.
