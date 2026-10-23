# OWA Approved Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export only registry-consistent approved OWA snapshots and refuse the entire export on ambiguity before touching staging files.

**Architecture:** Add an OWA-only pure input selector beside the existing coverage helper. The CLI loads snapshots/registry/raw metadata, validates and parses everything before writing the unchanged five CSV formats, and derives provenance from selected snapshots. Do not modify shared promotion, CSV writers, routing or build code.

**Tech Stack:** Node.js ESM, node:test/assert, existing splitDraftContent/makeId helpers, offline temporary ROOT fixtures under /tmp/opencode.

**Spec:** `docs/superpowers/specs/2026-10-23-owa-approved-export-design.md` (approved conversational contract; technical details recorded for plan review).

## Global Constraints

- Kod/dokumenty wyłącznie w istniejącym izolowanym worktree. Fixture i próby wyłącznie w nowych katalogach pod `/tmp/opencode/`.
- Bez zmian `/docker/openspg` exports/downloads/rejestru/kodu produkcyjnego, usług, schematu lub grafu; bez builda, pushowania i scalania.
- Relacja korekty z wieloma fakturami zostaje w opisie/chunkach; nie przywracamy starego N:M, JOIN, VAT/rozrachunków ani `create_sales_correction`.
- Brakujące aliasy/status/pewność nie są uzupełniane z wycofanych wersji.
- Błąd kwalifikacji, parsowania lub konflikt kończy CLI kodem różnym od zera, z maszynowo czytelnym zestawem problemów, bez zmiany istniejących CSV, README i manifestów.

## Review Focus

- Conflicting promoted revisions plus an existing complete staging directory: all existing output bytes remain unchanged (Task 2).
- Raw content changes after approval: snapshot remains authoritative, including when raw Markdown is missing (Tasks 1–2).
- Snapshot/registry disagreement or duplicate IDs: refuse instead of dropping an entity or choosing first (Task 1).
- Equivalent revisions with varying input order: stable representative/provenance, no date/length tie-break (Task 1).
- Empty corpus or paths escaping ROOT/inbox: refuse before creating outputs (Tasks 1–2).

---

### Task 1: Registry-consistent snapshot selection

**Files:** Create `scripts/lib/owa_export_selection.mjs`, `scripts/test_owa_export_selection.mjs`.

**Interfaces:**
- Consumes `{ promotedDrafts, registryEntries, rawDrafts, root }`, arrays with existing helper fields; raw content is never used for selection or output.
- Produces `selectOwaExportDrafts(input) -> { drafts, issues }`. `drafts` is empty on any problem. Each selected draft keeps approved content plus validated absolute rawMarkdownPath and `equivalentDraftIds`. Issues carry `kind`, identifying draft IDs/title and a reason; use `ambiguous_versions` and `ambiguous_identity` consistently with the coverage gate.

- [ ] **Step 1: Write failing unit tests** covering withdrawn/pending/unregistered longer raw, snapshot-authoritative content, equivalent segment sequences with stable lexical-ID selection, different full segments, owner collision, invalid/empty ID/title/content/namespace, duplicate registry/snapshot/raw ID, missing active snapshot, mismatched registry status/paths/namespace, missing/ambiguous raw mapping and escaped paths. Assert zero returned drafts on any issue. Test empty approved corpus refuses, while unrelated namespaces do not affect OWA qualification.
- [ ] **Step 2: Run RED**: `node --test scripts/test_owa_export_selection.mjs`; confirm failure is the missing selector module, not fixture infrastructure.
- [ ] **Step 3: Implement selector** using existing title normalization, makeId and full splitDraftContent(...,1800) equivalence. Validate both directions between active OWA registry entries and promoted snapshots, unique identities and inbox-scoped provenance. Select equivalent versions by lexical ID and sort final drafts by Polish title order, then ID. No filesystem writes or content fallback.
- [ ] **Step 4: Run GREEN**: `node --test scripts/test_owa_export_selection.mjs` and `node --test scripts/test_owa_promoted_coverage.mjs`; require all tests pass. Inspect tests before execution for temporary-root scope and absence of live calls.
- [ ] **Step 5: Local commit** only Task 1 files after review; do not push or merge.

### Task 2: Fail-closed CLI and derived manifest provenance

**Files:** Modify `scripts/export_owa_ontology.mjs`, `package.json`; create `scripts/test_export_owa_ontology.mjs`.

**Interfaces:**
- Consumes Task 1 selector; existing loadPromotedKnowledge('OWAOntology'), loadRegistry().entries and findRawDrafts() supply inputs.
- Successful CLI preserves the five CSVs/columns/ID generation, emits exit 0 and the existing success JSON. Failure emits `{ok:false, namespace:'OWAOntology', issues:[...]}` on stderr, exits 2, and never reaches output-directory creation.
- Manifest `sourceType: 'promoted_knowledge_snapshots'`; sorted unique raw parent directories as `sourceRoots`; `selectedDrafts` records `{draftId, equivalentDraftIds, entityId, promotedJsonPath, promotedMarkdownPath, rawJsonPath, rawMarkdownPath, contentSha256}`, with ROOT-relative POSIX paths. Keep generatedAt, namespace, selectedDraftCount and files metadata.

- [ ] **Step 1: Write failing offline CLI tests** spawning the real exporter with minimal environment and fixture ROOT. Assert approved snapshot wins over a longer withdrawn raw and over modified raw text; missing Markdown cannot trigger fallback. Verify all five CSV columns/counts/unique IDs, exact full chunk sequence/sourcePath and October sourceRoots/selectedDrafts hashes. Pin prose-only business relation, empty aliases/status/confidence and absent unverified workflow using the approved-synthesis fixture content, not invented mapping.
- [ ] **Step 2: Add refusal tests**: seed every CSV, README, staging manifest and an old build-manifest sentinel; induce each of conflict, registry drift, no approved input and invalid provenance. Require exit 2, structured issues and identical file hashes/permissions after refusal. Repeat with absent output directory: it must remain absent. No force/partial-export flag.
- [ ] **Step 3: Run RED**: `node --test scripts/test_export_owa_ontology.mjs`; old exporter must fail the new selection/provenance/refusal assertions. Preserve evidence under /tmp/opencode.
- [ ] **Step 4: Implement CLI integration**: replace raw ranking with Task 1 selection, remove raw Markdown reads, validate/parse complete inputs before ensureDir or writes; map exceptions from input loading/parsing to structured refusal. Derive manifest records/roots from selected drafts, keep all existing parser section behavior and five CSV schemas. Add `test:owa-export` running both new tests and add changed/new scripts to the syntax-check command. Do not modify global helpers.
- [ ] **Step 5: Run GREEN/regressions**: start with `npm run check`; run `npm run test:owa-export`, `npm run test:owa-quality`, and inspected offline `npm run test:schema-export-integrity`. Run `python3 scripts/validate-module-map.py` and `git diff --check`. Do not run build/runtime tests.
- [ ] **Step 6: Repeat isolated trial** in a new /tmp/opencode directory using a byte-identical copy of the previous frozen real corpus and baseline CSVs. Snapshot protected production hashes/UID/GID/modes before/after. Run only the corrected exporter with ROOT set to the new copy. Require exit 2 with the three PS/FPF/WZ ambiguous groups and no output changes; if another error occurs, investigate rather than weakening guards or editing corpus. Success-path fixture evidence is separate from real-corpus refusal evidence; never describe it as a successful full-corpus export.
- [ ] **Step 7: Independent read-only whole-change review** of source selection, refusal before writes, manifest provenance, tests and actual trial evidence. Fix findings through RED/GREEN; update task checklist and concise Polish results. Commit only scoped files after verification; no production apply, build, merge or push.

## Plan self-review

Both tasks implement the approved snapshot-only/fail-closed/provenance scope. Task 1 owns qualification and deterministic equivalence; Task 2 owns output safety, manifest metadata and unchanged parser limitations. Each Review Focus item has an explicit test above. Successful export tests use synthetic unambiguous inputs; real-corpus tests must preserve all unresolved versions and fail. No task resolves PS/FPF/WZ or changes corpus/model assertions.

## Execution handoff

Preserve the user's previously chosen subagent work and independent reviews. Request review of this saved plan before implementation; then use subagent-driven-development, with isolated implementation and fresh reviewers. Current status: design contract approved; implementation not started.
