# Main Consolidation Design

**Date:** 2026-08-31
**Status:** Approved for implementation planning

## Goal

Produce a clean local `main`, publish it to `origin/main`, and remove the
redundant discovery-retry worktree without committing unsupported knowledge or
losing operational evidence.

## Current State

The discovery retry implementation and its design documents already exist on
`main`. The temporary `fix/discovery-transient-retry` branch is patch-equivalent
and contains no unique files.

The remaining worktree changes consist of generated operational reports, two
promoted draft pairs, and their registry entries. The Schema draft lacks a
relevant source. The Business Semantics draft uses a relevant official page but
contains truncated text and claims broader than that source supports.

## Schema Draft Requeue

Add `reopenPromotedDraft()` to `scripts/lib/promoted_knowledge.mjs`. It will:

- accept only a draft whose current registry status is `promoted`;
- preserve the raw inbox draft;
- move promoted JSON and Markdown snapshots to the existing withdrawn archive;
- replace the registry entry with status `pending`;
- retain `previousPromotedAt`, moved paths, actor, timestamp, and review reason;
- append a dashboard audit event.

The operation will not reject or delete the Schema draft. It will return the
unsupported `CDN.Terminy` item to operator review, as requested.

## Business Semantics Repair

Fetch the full official Zestawy Promocyjne article and rewrite the promoted
snapshot as a source-faithful description of promotional bundles. Remove
truncation, fallback boilerplate, review warnings, and unsupported COM or SQL
claims. Preserve source URL, retrieval provenance, promotion history, and a
review note that states the corrected scope.

The repaired document must distinguish documented behavior from absent
technical detail. It must not claim that the source documents generic discount
CRUD, COM interfaces, or `CDN.Rabaty` relationships.

## Business Semantics Export

Extend `export_optima_business_semantics.mjs` to load promoted knowledge for
`ComarchOptimaBusinessSemantics` and emit it as `BusinessDescription` rows in
`business_description.csv`.

Each content segment will:

- use a stable `makePromotedId()` identifier derived from draft ID and segment;
- store full segment text in `description`;
- keep `descriptionPreview` within the existing 800-character vector field;
- populate hash, length, source, language, and domain fields;
- leave table and column references empty unless the source confirms them.

The exporter will report the promoted row count in its manifest metadata. It
will not add `ReferenceDocument` or `Chunk` entity types to the Business
Semantics schema.

## Quality Gate

Extend the Business Semantics gate to verify that every promoted draft has at
least one visible `BusinessDescription` row with the expected promoted ID
prefix. Keep the existing `chunk.csv` coverage rule for KBs that use chunks.

After requeue and repair:

- the Schema promotion must no longer produce a missing-chunk error;
- the Business Semantics promotion must be visible in
  `business_description.csv`;
- generated JSON and Markdown reports must agree;
- any unrelated historical warning must remain visible rather than being
  hidden or rewritten.

## Pipeline

Run the Schema helper-only export and the Business Semantics helper-only export.
Build project 15 with the changed Business Semantics files after export and
preflight succeed. The Schema draft was never built, so requeue requires export
and quality verification but no destructive graph cleanup.

No schema push is required because the existing BusinessDescription entity
already supports the exported fields.

## Tests

Add regression coverage for:

1. Reopening a promoted draft to pending while preserving archive and audit
   metadata.
2. Rejecting requeue for non-promoted drafts.
3. Exporting promoted Business Semantics content with stable IDs and empty
   unverified table/column references.
4. Detecting a promoted Business Semantics draft missing from the export.
5. Passing the gate after the promoted description is present.

Run the repository syntax checks, focused inbox/export tests, quality gates,
20Q regression, and `docker compose config` before publication.

## Commits And Publication

Use atomic commits for:

1. Requeue/export/quality-gate code and tests.
2. Schema pending state plus repaired Business Semantics promotion and registry.
3. Export artifacts and build manifests.
4. Generated operational reports grouped by report family.

Before push, fetch `origin/main` and verify it remains an ancestor of local
`main`. Do not force-push. If the remote advanced, integrate it normally and
repeat verification.

After a successful push and clean status, remove the temporary worktree and
delete `fix/discovery-transient-retry`. The temporary branch has no unique
patches, so no merge commit is needed.
