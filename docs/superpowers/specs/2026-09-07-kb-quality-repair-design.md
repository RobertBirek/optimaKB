# KB Quality Repair Design

## Goal

Restore the quality gate for `ComarchOptimaBusinessSemantics` and remove the
staged duplicate `sourceUrl` in `ComarchOptimaSprint` without discarding the
promoted Sprint draft content. Publish both corrected datasets to OpenSPG.

`ComarchOptimaAdditionalFunctions` remains outside the implementation scope.
Its latest discovery run reports `GOOD` with recommendation `KEEP`, and the
historical `fetch failed` event has cleared.

## Confirmed Causes

### Business Semantics

The current helper export was generated on 2026-08-31 and contains four
promoted drafts. The `Formy płatności` draft was promoted on 2026-09-01, so its
expected `BD_PROMOTED_*_1` row does not exist in `business_description.csv`.
The exporter already handles this draft format. Regenerating the helper export
is sufficient; no exporter code change is required.

### Sprint

The Sprint exporter creates official document IDs from `sourceUrl` and
promoted document IDs from draft IDs. It deduplicates final document rows only
by ID. An official document and a promoted draft therefore produce two
`ReferenceDocument` rows for the same URL. Promoted chunks refer to the second
document ID.

## Design

### Canonical URL Matching

The Sprint exporter will normalize HTTP and HTTPS source URLs before comparing
them. Normalization will use the URL parser, remove the fragment, remove a
trailing slash from non-root paths, and lowercase the host. It will preserve
the path and query string except for the trailing slash rule. Invalid or local
URLs will fall back to trimmed text and will not match official HTTP sources.

The exporter will build a map from normalized official URLs to official
`ReferenceDocument` IDs before processing promoted drafts.

### Promoted Sprint Documents

For each promoted draft:

- If its normalized URL matches an official document, the exporter will not
  emit a second promoted `ReferenceDocument` row.
- Its promoted chunks will use the official document ID as
  `sourceObjectRefId`.
- If no official match exists, the exporter will retain the current promoted
  document and chunk behavior.
- The exporter will preserve promoted chunk IDs and content in both cases.

This approach changes no schema and keeps one source-document identity per
canonical official page.

### Business Semantics Refresh

The existing helper-only export will run again after the Sprint code change.
The regenerated `business_description.csv` must contain the first promoted row
for `draft_2026-08-21_5f225097_formy-p-atnosci`. The scoped quality gate must
return `PASS` before publication.

## Tests

A focused Sprint regression test will use temporary fixtures with:

- one official document URL;
- one promoted draft using the same URL;
- one promoted draft using a distinct URL.

The test will prove that the matching pair produces one document, that the
matching draft's chunks refer to the official ID, and that the distinct draft
retains a promoted document. It will also run the scoped quality gate and
confirm that no duplicate-URL warning remains.

Existing script syntax checks and the Business Semantics quality-gate test will
run unchanged.

## Export And Publication

After tests pass:

1. Regenerate the Sprint staging files.
2. Regenerate the Business Semantics helper-only staging files.
3. Run scoped quality gates for both namespaces.
4. Build only changed CSV files with `OPENSPG_FORCE_FILES`.
5. Confirm every submitted builder job reaches `FINISH`.
6. Run both scoped quality gates again and inspect the resulting manifests.

Expected forced files:

- Sprint: `reference_document.csv,chunk.csv`
- Business Semantics: `business_description.csv`

If regeneration changes another CSV, stop before publication and inspect the
cause rather than widening the force-file list.

## Error Handling

No build starts unless tests and pre-build quality gates pass. A failed or
stuck builder job stops the workflow; the process will not submit unrelated
files as a recovery attempt. Existing deployed data remains available because
the builders use UPSERT semantics.

## Success Criteria

- `ComarchOptimaBusinessSemantics` reports no missing promoted descriptions.
- Sprint staging contains one `ReferenceDocument` for the duplicated official
  URL.
- All promoted Sprint chunks remain present and reference an existing document.
- Both scoped quality gates return `PASS` after export and build.
- All new builder jobs report `FINISH`.
- No unrelated worktree changes are modified or reverted.
