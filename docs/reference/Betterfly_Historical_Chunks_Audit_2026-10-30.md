# Betterfly historical chunks — read-only audit

Observed: 2026-10-30 11:46 UTC. Database: `comarchbetterflyreference`.

## Outcome

**Do not delete all 20 audited chunks as one batch.** The proposed scope is 19 candidate chunks and one separately reviewed `versionHint` property; one historical technical example is on HOLD. No graph mutation was performed or authorized by this audit.

| Group | Count | Evidence / recommendation |
|---|---:|---|
| Promotion/navigation/contact footer only | 17 | Full texts inspected; candidates for removal after explicit approval |
| Payment error codes plus footer | 2 | The complete ErrorCode 0–8 technical span is preserved, after whitespace normalization, in current chunks of the same parent document; candidates for removal |
| Historical technical example plus page chrome | 1 | HOLD: contains DocumentException / ErrorCode 5 example absent from current exports and current source HTML |

All 20 IDs are absent from the current 218-row export. All have existing source snapshots and parents in the current document export. There are zero materialized incident relationships. A scan of named reference/anchor properties across 800 nodes found no incoming references to these IDs. This does **not** prove absence of references in arbitrary prose or external consumers.

No complete old chunk is an exact duplicate of a new chunk: the candidate decision is based on inspecting footer-only content or proving preservation of the technical span, not merely on ID absence.

## Held technical example

`BFCHUNK_BFRD_HTTPS_POMOC_COMARCHBETTERFLY_PL_DOKUMENTACJA_API_PRZEKSZTALCANIE_FAKTUR_ZALICZKOWYCH_7`

The old chunk contains:

```json
{"Message":"Tego dokumentu nie można przekształcić do faktury finalnej.","Code":"DocumentException","Data":{"ErrorCode":"5"}}
```

The example was found only in this chunk among the nine graph chunks with that declared parent. Neither `DocumentException` nor the full message occurs in any current exported CSV or the current HTML snapshot. Therefore it must not be presented as a currently verified contract, but it must not be discarded as mere footer boilerplate either. Decide separately whether to verify it against authoritative sources, preserve it as historical evidence, or archive it outside active retrieval. No exporter regression is inferred from absence in the current source.

## Retained versionHint

- Document: `BFRD_HTTPS_POMOC_COMARCHBETTERFLY_PL_DOKUMENTACJA_API_OBSLUGA_PROCEDURY_OSS`
- Graph value: `unversioned; v1.7; v1.5`
- Current CSV: empty
- Current source HTML: zero recognized canonical API endpoint URLs, zero mentions of `v1.7` or `v1.5`; those versions are also absent from current paragraphs/chunks.
- Candidate action: remove **only** this property after explicit approval and a compare-before-write check. Do not invent a replacement version and do not delete the document.

## Backup and verification

- Protected selected-subgraph snapshot: `/tmp/opencode/betterfly-readonly-audit-vmb4prmw/selected-subgraph.json`
- SHA-256: `68e25937c6d8315309943a9c1d6e4412935f42266b1db1deb81d2e9d9a18d46b`
- Contains full properties, including vectors, of 20 selected Chunk nodes and one ReferenceDocument; zero incident relationships. Endpoint metadata would be retained for relationships if present.
- Snapshot mode `0600`, directory mode `0700`. JSON round-trip, exact ID set, checksum and all 20 pairs of 1536-dimensional chunk vectors verified.
- This is a bounded snapshot, **not** a full database backup; restoration was not exercised against production.
- Detailed evidence and per-ID content/source hashes: `/tmp/opencode/betterfly-readonly-audit-vmb4prmw/final-audit.json`.
- Reviewable candidate allowlist: `Betterfly_Historical_Chunks_Audit_2026-10-30.json` beside this report.

Before any later mutation: obtain explicit approval for the exact scope, recheck hashes/labels/IDs, export membership and relationships/references, and stop on any concurrent change. Preserve all 218 current chunks, all 40 documents, the held technical example and every node outside the explicit allowlist. No node/property deletion, build, ingestion, restart, report regeneration or automation resume ran in this audit.

## Subsequent approved cleanup — completed

After reviewing the proposed 19 IDs plus the single `versionHint` property, the user explicitly confirmed **“tak”**. The audit JSON above remains the unchanged, hashed approval input; the later mutation is recorded separately in `Betterfly_Historical_Chunks_Cleanup_2026-10-30.json`.

- Executed at **2026-10-30 12:11:12–12:11:14 UTC** in one guarded transaction. Full backed-up properties/element IDs/labels were checked under locks, with relationship and named-reference guards. A prior dry run selected exactly 19 nodes and made no data changes.
- Used plain `DELETE`, not `DETACH DELETE`: exactly **19 nodes deleted**, **zero relationships deleted**, **one property removed**. No document node was deleted.
- Post-check at **12:12:43 UTC**: total Chunk nodes **561→542**; all 19 approved IDs absent; held historical node has every property unchanged; the OSS document differs from its snapshot only by removal of `versionHint`.
- All **218 current chunks** retain exact content and complete 1536-dimensional vector pairs. All **40 current ReferenceDocuments** match every CSV property after accounting for JSON string storage and omitted empty properties.
- No dangling references were found in the scanned fields. Export bytes are unchanged. MCP health and LLM PASS confirmed; automation remains paused/shadow-only/not publication-approved.
- Execution and verification evidence: `/tmp/opencode/betterfly-approved-cleanup-7ppu04vx/operation.json` and `verification.json`. A second verified copy of the selected-subgraph snapshot is `backup-before.json` in that directory, with the original checksum above.

This approval did not cover the held historical example, other out-of-export nodes, OWA changes, service restarts or automation resume. None of those actions was performed.
