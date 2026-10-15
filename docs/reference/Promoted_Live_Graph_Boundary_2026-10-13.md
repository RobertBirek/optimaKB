# Promoted live graph boundary — 2026-10-13

**POTWIERDZONE: all 14 mapped documents, 19 owned chunks and 19 retained chunks exist live, exactly once per semantic ID in their respective databases. All exported fields match the current staged CSV after accounting for JSON-string storage.** The read also found **21 additional objects absent from current CSV: 3 historical draft-owned documents, 7 historical draft-owned chunks and 11 shared external chunks**.

Companion: [Promoted_Live_Graph_Boundary_2026-10-13.json](Promoted_Live_Graph_Boundary_2026-10-13.json). Its row contracts specify every full semantic ID, namespace, ownership, graph internal ID, count, label, content/summary fingerprint and relationship result. Record keys are display links to the [input map](Promoted_Derived_Record_Map_2026-10-13.json), never substring query predicates.

Read window: **2026-10-13 10:05:39–10:15:01 UTC**, separate read statements, not an atomic snapshot. Branch `main`, base commit `79e376d241322b2debbffb900a68bcf67ae78004`. Existing workspace changes were preserved. Access blocker: **none**.

## Read path and scope

The existing `scripts/verify_optima_schema_graph_parity.mjs:54–68` documents the local read path: `docker exec release-openspg-neo4j` invokes `$NEO4J_HOME/bin/cypher-shell`, using `$OPENSPG_NEO4J_USER` and `$OPENSPG_NEO4J_PASSWORD` inside the container. Temporary Python scripts used that same invocation and supplied only the database and read-only Cypher as arguments. No credential values were displayed, returned or persisted; no `.env`, secret file, connection string, service configuration or runtime-state file was opened. Errors were captured internally rather than printing raw connection diagnostics.

The parity script itself was **not executed**: its top-level code writes import files under `data/`. Temporary scripts and sanitized intermediate evidence were authored only under `/tmp/opencode/`; final reports were added with `apply_patch`.

There are 31 successful statements in the retained verification trace: 8 exact-ID field comparisons, 4 mapped relationship reads, 4 scoped metadata boundary reads, 3 historical-object evidence reads, 3 historical relationship reads, 2 old-document chunk-reference reads, 3 topic-membership reads and 4 exact-content duplicate-pair reads. Earlier exact-ID probes and parser-debug reads were also read-only. No OpenSPG GET was needed; project IDs below come from the input map, while database names and node labels were verified live.

| Namespace | Project from map | Live Neo4j database | Docs direct / shared | Owned / retained chunks | Additional owned / shared objects |
|---|---:|---|---:|---:|---:|
| ComarchCommunityNews | 11 | `comarchcommunitynews` | 2 / 0 | 3 / 0 | 2 / 0 |
| TaxbellLegalReference | 12 | `taxbelllegalreference` | 1 / 1 | 2 / 13 | 1 / 0 |
| TaxbellPayrollHRReference | 13 | `taxbellpayrollhrreference` | 7 / 0 | 7 / 0 | 0 / 0 |
| TaxbellAccountingVATReference | 14 | `taxbellaccountingvatreference` | 1 / 2 | 7 / 6 | 7 / 11 |
| **Total** | | | **11 / 3** | **19 / 19** | **10 / 11** |

## Semantic IDs, properties, hashes and links

- Semantic identity is the raw string property **`n.id`**. Every mapped ID returned count **1**, including a namespace-agnostic label search within its own database. No second node with the same queried ID or alternate namespace label was found in that database.
- Documents have labels `Entity` and `<namespace>.ReferenceDocument`; chunks have `Entity` and `<namespace>.Chunk`. Internal IDs are database-local, not global: for example `448` refers to different objects in Legal and Accounting. Always interpret them with their database and semantic ID.
- **Custom text properties are JSON-encoded strings.** For example the physical `sourceDocumentRefId` value includes outer JSON quotes, while `id` does not. The same applies to nonempty `content`, `summary`, `description`, URL/path and other exported custom text fields. Querying a ref with the raw semantic ID alone returned no rows; exact equality with its JSON serialization did return the expected rows. No substring-ID predicates were used.
- Field verification tested all CSV columns, including every `sourceDocumentRefId`, source URL/path, document snapshot path, description and summary. An absent property was accepted only for an empty staged field. **52/52 mapped nodes have zero mismatched fields.** This is source-projection parity, not a content-quality endorsement.
- No scoped node has a stored **`bodyHash`**. The JSON records SHA256 of each current chunk's decoded content (38 chunks) and document's decoded summary (14 documents), supported by exact server-side equality with the CSV input. These fingerprints are derived from equality, not invented graph-native hash properties. Three canonical `contentHash` properties also match CSV exactly; those stored source hashes are separate from summary hashes. The full unexported draft body was not compared to a graph bodyHash.
- `size(n.content)` on JSON-encoded storage includes quotes and escapes; it is not the decoded content length. Current-node rows record decoded CSV lengths after equality. Historical rows explicitly record **stored** lengths.
- **All 73 scoped document/chunk nodes have zero physical relationships; relationship types are empty.** The three historical promoted documents also have zero live chunk `sourceDocumentRefId` referrers. Current chunks link through the JSON-encoded `sourceDocumentRefId` property. The four local schema files declare these ref properties; source topics are shared aggregate metadata, not ownership edges. Vector property keys were observed but vector values were not retrieved or certified.

## Obsolete draft-owned objects

**POTWIERDZONE: these ten objects exist live but their exact semantic IDs are absent from current staged CSV.** Ownership is supported by exact promoted path and URL/ref metadata. Full IDs are individually enumerated in JSON `additionalObjects`; none were reconstructed from a displayed suffix.

| Record | Database | Object kind | Internal IDs | Evidence |
|---|---|---|---|---|
| `fb53cb2b` | Community | 2 historical chunks | `934`, `940` | Exact draft path/ref; section orders 2 and 3; current CSV owns only section 1. Stored content lengths 175 and 37; neither equals a current scoped chunk. |
| `de720ffd` | Accounting | 5 historical chunks | `450`, `440`, `448`, `444`, `442` | Exact draft path/ref; five old un-hashed IDs absent from CSV. Each content equals one current SHA1-suffixed-ID chunk. Current partner internal IDs: `560`, `558`, `561`, `562`, `564`, respectively. |
| `6b5ac5ed` | Accounting | 1 historical promoted document | `384` | Exact promoted snapshot path; current document is shared canonical internal ID `24`. No live chunk referrers to old document. |
| `dcfc95c2` | Accounting | 1 historical promoted document | `438` | Exact promoted snapshot path; current document is shared canonical internal ID `664`. No live chunk referrers to old document. |
| `93f75109` | Legal | 1 historical promoted document | `448` | Exact promoted snapshot path; current document is shared canonical internal ID `979`. No live chunk referrers to old document. |

**WNIOSEK:** correction preparation must include these ten historical objects in old-versus-new exact-ID reconciliation, in addition to whichever current owned projections change. Re-exporting or UPSERTing only current IDs cannot reconcile objects omitted from the payload. The five legacy `de720ffd` chunks are verified duplicate-content aliases; the two `fb53cb2b` chunks are residual tail objects. The import history that produced each object was not queried, so its exact creation chronology is **NIEUSTALONE**.

If all fourteen drafts were hypothetically withdrawn, the observed draft-owned upper boundary is **14 documents + 26 chunks = 40 nodes**: 11 current direct documents + 3 historical promoted documents, and 19 current owned chunks + 7 historical chunks. This is an inventory boundary, not a withdrawal recommendation. Partial-span correction can retain valid material; replacement spans and future IDs are not determined by this read.

## Shared boundary and other findings

The three canonical documents, all nineteen mapped retained chunks, and **eleven additional historical external chunks** belong to shared-source scope. Preserve this **33-node shared document/chunk boundary** during draft-only correction preparation.

- `6b5ac5ed`: eight additional external chunks, internal IDs `96`, `85`, `111`, `71`, `491`, `492`, `497`, `493`. All point to the same canonical document, using old snapshot `downloads/taxbell/accounting_vat_reference/snapshots/998f1ce66607d2b4.json`. Four pairs have exactly equal content and reference values: `(96,491)`, `(85,492)`, `(111,497)`, `(71,493)`. Their full IDs differ and both sets are absent from current CSV. Current four retained chunks come from the separately recorded `3d9fd4ece3a1c84e.json` snapshot.
- `dcfc95c2`: three additional external chunks, section orders 2–4, internal IDs `883`, `891`, `892`, from `0e5af2db138ff3c0.json`. Current CSV retains external section 1 and the other-draft `e14d7c0a` chunk. These three extra chunks are not owned by the audited promoted draft.
- The shared external objects are obsolete relative to **current staged IDs**, but this read does not authorize deleting them as draft contamination or certify their body quality. Historical unequal bodies have metadata/length evidence only; no computed body hash is claimed.
- There are **9 exact-content duplicate pairs**, all in Accounting: 5 audited-draft old/new alias pairs and 4 historical shared-source pairs. This differs from duplicate semantic IDs, whose count is zero in the scoped search.
- Seven shared topic IDs were checked: six exist once and **`TBTOPIC_TAXBELLPAYROLLHRREFERENCE_PIP` has count 0**. The existing topics and internal IDs are enumerated in JSON. This is an aggregate metadata discrepancy for separate reconciliation; it does not make the mapped Payroll document/chunk absent. Shared topics are not draft-owned.

## Executed Cypher shapes and exact bindings

The scripts rendered these statements with escaped literal bindings; `$...` below describes those exact binding sets without dumping full source content into this report. Inputs are reproducible from full IDs in JSON and the fingerprinted CSV files. All searches use full equality or exact list membership, never ID-prefix/substring matching.

### 1. Membership, labels and all-field source parity (8 statements)

For each namespace and type, `expected` contains its exact mapped CSV rows: `{id, properties, encodedProperties}`. `properties` is the CSV dictionary; `encodedProperties[p]` is `json.dumps(properties[p], ensure_ascii=False)`. `$expectedLabel` is the namespace-qualified type. Source values are sent only as equality inputs.

```cypher
UNWIND $expected AS expected
OPTIONAL MATCH (n) WHERE n.id = expected.id
WITH expected, collect(n) AS nodes
UNWIND CASE WHEN size(nodes)=0 THEN [null] ELSE nodes END AS n
RETURN expected.id AS semanticId, size(nodes) AS matchCount,
       id(n) AS internalId, labels(n) AS labels, keys(n) AS propertyKeys,
       $expectedLabel IN labels(n) AS expectedLabel,
       [p IN keys(expected.properties)
        WHERE coalesce(n[p], "") <> expected.properties[p]
          AND coalesce(n[p], "") <> expected.encodedProperties[p]] AS mismatchedFields,
       [p IN keys(expected.properties) WHERE n[p]=expected.properties[p]] AS rawExactFields,
       [p IN keys(expected.properties) WHERE n[p]=expected.encodedProperties[p]] AS jsonEncodedExactFields,
       n.contentHash AS storedContentHash, n.bodyHash AS storedBodyHash,
       n.sourceDocumentRefId AS storedSourceDocumentRefId,
       n.sourcePath AS storedSourcePath, n.localSnapshotPath AS storedLocalSnapshotPath,
       n.sourceUrl AS storedSourceUrl,
       size(n.content) AS contentLength, size(n.summary) AS summaryLength,
       size(n.description) AS descriptionLength
ORDER BY semanticId, internalId;
```

### 2. Physical relationship types/counts (7 statements)

`$ids` contains mapped IDs for four initial reads, or exact discovered additional IDs for three historical reads. The initial script used `r/m` rather than `rel/other` aliases; the predicates and aggregation are identical.

```cypher
MATCH (n) WHERE n.id IN $ids
OPTIONAL MATCH (n)-[rel]-(other)
RETURN n.id AS semanticId, id(n) AS internalId, type(rel) AS relationshipType,
       CASE WHEN rel IS NULL THEN "none"
            WHEN id(startNode(rel))=id(n) THEN "outgoing" ELSE "incoming" END AS direction,
       count(rel) AS relationshipCount
ORDER BY semanticId, relationshipType, direction;
```

### 3. Scoped historical boundary metadata (4 statements)

`$labels` is the seven namespace-qualified knowledge types: ReferenceDocument, Chunk, EntryGuide, CommunityAttachment, NewsTopic, SourceTopic, KnowledgeRoute. The executed script rendered seven explicit label-membership disjunctions. `$docs`, `$paths`, `$urls` contain both raw values and their JSON-string serialization. Values come exclusively from that namespace's audited document IDs, promoted/document snapshot paths and source/document URLs in the input map. The `split` test uses exact semicolon tokens; no new matching ownership is inferred from an unmatched encoded secondary-ref list.

```cypher
MATCH (n)
WHERE any(label IN labels(n) WHERE label IN $labels)
  AND (n.sourceDocumentRefId IN $docs OR n.parentDocumentRefId IN $docs
       OR n.primaryDocumentRefId IN $docs
       OR any(ref IN split(coalesce(n.secondaryDocumentRefIds,""),";") WHERE ref IN $docs)
       OR n.sourcePath IN $paths OR n.localSnapshotPath IN $paths OR n.sourceUrl IN $urls)
RETURN n.id AS semanticId, id(n) AS internalId, labels(n) AS labels,
       n.semanticType AS semanticType, n.sourceDocumentRefId AS sourceDocumentRefId,
       n.parentDocumentRefId AS parentDocumentRefId,
       n.primaryDocumentRefId AS primaryDocumentRefId,
       n.secondaryDocumentRefIds AS secondaryDocumentRefIds,
       n.sourcePath AS sourcePath, n.localSnapshotPath AS localSnapshotPath,
       n.sourceUrl AS sourceUrl
ORDER BY semanticId, internalId;
```

### 4. Historical source equality evidence (3 statements)

`$extraIds` is the exact metadata-discovered set; `$currentIds` is the 52 mapped IDs partitioned by namespace. No content is returned by the successful evidence statements.

```cypher
MATCH (n) WHERE n.id IN $extraIds
OPTIONAL MATCH (peer)
WHERE peer.id IN $currentIds
  AND ((n.content IS NOT NULL AND n.content=peer.content)
       OR (n.summary IS NOT NULL AND n.summary=peer.summary))
RETURN n.id AS semanticId, id(n) AS internalId, labels(n) AS labels,
       keys(n) AS propertyKeys, size(n.content) AS contentLength,
       size(n.summary) AS summaryLength, size(n.description) AS descriptionLength,
       n.contentHash AS contentHash, n.bodyHash AS bodyHash,
       n.sectionOrder AS sectionOrder, collect(peer.id) AS sameSourceContentCurrentIds
ORDER BY semanticId, internalId;
```

### 5. Old-document refs, topic membership, duplicate content (2 + 3 + 4 statements)

`$oldDocs` is the three discovered historical document IDs plus their JSON encodings, partitioned by namespace. `$topicIds` is the input map's exact related shared IDs. `$scopeIds` is all 73 metadata-discovered document/chunk IDs partitioned by namespace.

```cypher
MATCH (n)
WHERE $chunkLabel IN labels(n) AND n.sourceDocumentRefId IN $oldDocs
RETURN n.id AS semanticId, n.sourceDocumentRefId AS sourceDocumentRefId;

UNWIND $topicIds AS expectedId
OPTIONAL MATCH (n) WHERE n.id=expectedId
RETURN expectedId AS semanticId, count(n) AS matchCount,
       collect(id(n)) AS internalIds, collect(labels(n)) AS labels
ORDER BY semanticId;

MATCH (a), (b)
WHERE a.id IN $scopeIds AND b.id IN $scopeIds AND a.id < b.id
  AND a.content IS NOT NULL AND a.content=b.content
  AND a.sourceDocumentRefId=b.sourceDocumentRefId
RETURN a.id AS firstId, id(a) AS firstInternalId,
       b.id AS secondId, id(b) AS secondInternalId,
       size(a.content) AS storedContentLength
ORDER BY firstId, secondId;
```

## Validation and limits

- `npm run check`: passed; syntax checks only.
- `python3 scripts/validate-module-map.py`: passed, four modules.
- Live comparisons: 52 exact IDs, no missing/wrong-label/mismatched-field rows; 73 physical relationship readbacks all zero; 21 additional exact IDs absent from staged CSV; 9 duplicate-content pairs; 7 shared topic membership checks.
- `python3 /tmp/opencode/validate-promoted-live-report.py`: passed exact saved-report/live-evidence/input-map parity, 52 source hashes, 21 historical IDs, 73 internal IDs/zero relationships, 9 duplicate pairs, 7 topics and 8 unchanged CSV fingerprints. `git diff --check` also passed.
- No global graph census, query of unrelated business data or guarantee about historical nodes whose exact paths/URLs/refs no longer match the audited boundary. Project-to-database configuration was not read via OpenSPG GET. The read does not establish source quality, creation chronology or future replacement content.

Only the two report files were added in the repository. No graph write, builder/export job, candidate/status/configuration change, service action or commit was performed.

### Handoff

```yaml
task_id: Promoted_Live_Graph_Boundary_2026-10-13
agent: OpenCode
host: local workspace host / release-openspg-neo4j read backend
repository: /docker/openspg
base_branch: main
base_commit: 79e376d241322b2debbffb900a68bcf67ae78004
result_commit: uncommitted
changed_files:
  - docs/reference/Promoted_Live_Graph_Boundary_2026-10-13.md
  - docs/reference/Promoted_Live_Graph_Boundary_2026-10-13.json
skills_used: [codex-delegation, systematic-debugging, verification-before-completion]
commands_run:
  - git status --short / git branch --show-current / git rev-parse HEAD
  - npm run check
  - python3 scripts/validate-module-map.py
  - python3 /tmp/opencode/promoted-live-graph.py
  - python3 /tmp/opencode/promoted-live-graph.py --full
  - python3 /tmp/opencode/promoted-live-extra-evidence.py
  - python3 /tmp/opencode/prepare-promoted-live-report.py
  - python3 /tmp/opencode/validate-promoted-live-report.py
  - git diff --check
validation:
  passed: [52 exact mapped IDs and CSV projections, 73 zero-relationship readbacks, 21 additional IDs, 9 exact duplicate-content pairs, saved-report parity, 8 unchanged CSV fingerprints, syntax, module map, diff whitespace]
  failed: []
  not_run: [graph writes, builder/export, OpenSPG project configuration GET]
confirmed_findings: [14 mapped documents, 19 owned chunks, 19 retained chunks, 10 historical draft-owned objects, 11 historical shared external chunks, missing Payroll PIP topic]
inferences: [current-ID UPSERT alone does not reconcile omitted historical objects]
hypotheses: []
risks: [shared source ownership must remain distinct from audited draft ownership]
approval_required: []
recommended_next_action: Use exact current and historical inventories when preparing replacement-span and old-versus-new reconciliation; this task executes no correction.
```
