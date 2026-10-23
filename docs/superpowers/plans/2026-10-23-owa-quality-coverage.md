# OWA Quality Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace OWA's ID-substring coverage heuristic with full-content/provenance checks and explicit unresolved-version failures, without touching production artifacts.

**Architecture:** Add one pure OWA coverage helper and call it only from the OWA branch of the existing quality gate. Equivalent promoted revisions can share one complete staged representation; differing promoted content remains ambiguous rather than being ranked by length/date. All other namespaces and exporter behavior stay unchanged.

**Tech Stack:** Node.js ESM, built-in node:test/assert/fs/child_process/path; no new dependencies.

**Spec:** docs/superpowers/specs/2026-10-23-owa-quality-coverage-design.md

## Global Constraints

- Bez zmian produkcyjnych exports/downloads/runtime/sekretów/usług, bez SQL, operacji zapisu MCP, eksportu produkcyjnego, builda, --auto-fix, restartu, publikacji, push ani wznowienia automatu.
- Brak nowych zależności. Pozostałe namespace'y zachowują obecne zachowanie bramki.
- Implementation stays in /root/.local/share/opencode/worktree/b088ac/owa-quality-gate-20261023, a native isolated worktree. Do not edit /docker/openspg sources.
- Synthetic test ROOTs and evidence output live under /tmp/opencode; tests may only delete their own fresh temporary directory. Real-input checks read /docker/openspg but redirect both output files to /tmp/opencode.
- Normalization uses splitDraftContent(content, 1800); entity IDs use makeId('OWA_ENTITY', draft.title). No semantic similarity, version-length ranking or date ranking.
- A red gate is expected while divergent promoted versions remain unresolved; no requirement to manufacture PASS.

## Review Focus

- Draft ID or source URL mentioned in a different owner's chunk must never satisfy coverage; add a decoy-body test in Task 1.
- A complete body assembled from mixed source paths must fail even when segment text matches; add a mixed-provenance test in Task 1.
- A dropped, duplicated, extra or misnumbered segment must fail; physical CSV row reordering with intact sectionOrder must pass; test both in Task 1.
- Empty approved snapshots, absent raw metadata and title/ID collisions must fail closed, not silently disappear; add explicit cases in Task 1.
- New ambiguity/content issue text must not match the legacy rebuild trigger; use a harmless fixture command marker to prove CLI --auto-fix does not execute a child for these issue types in Task 1. This test uses only a synthetic ROOT, not production.

---

## File Structure

- Create scripts/lib/owa_promoted_coverage.mjs — pure OWA-only coverage assessment.
- Create scripts/test_owa_promoted_coverage.mjs — unit fixtures for identity, content, versions, layout, provenance.
- Create scripts/test_kb_quality_gate_owa.mjs — isolated CLI/output/exit/auto-fix compatibility tests.
- Modify scripts/kb_quality_gate.mjs — replace OWA-only canonical/substring path; preserve non-OWA logic.
- Modify package.json — explicit test:owa-quality command and syntax checks for the three new modules; no dependency changes.
- Create docs/reference/OWA_Collective_Correction_Source_Review_2026-10-23.md — bounded source comparison, limitations and recommendation, not corpus text.
- Create docs/reference/OWA_Quality_Coverage_Verification_2026-10-23.md — verification ledger and non-deployment boundary.

### Task 1: OWA coverage helper and CLI integration

**Files:** all five scripts/package files listed above.

**Interfaces:**
- Consumes existing splitDraftContent(content, maxLength) from scripts/lib/promoted_knowledge.mjs and makeId(prefix, value) from scripts/lib/export_utils.mjs.
- Produces assessOwaPromotedCoverage({ promotedDrafts, rawDrafts, chunkRows, root }) -> { promotedCount, groupCount, coveredCount, issues } in scripts/lib/owa_promoted_coverage.mjs.
- issues entries: { kind, title, draftIds: string[], reason: string, entityId?: string }. Allowed kinds and primary-issue precedence are defined in the spec.
- The gate passes loadPromotedKnowledge('OWAOntology'), OWA-filtered findRawDrafts(), parsed chunk rows, and ROOT. It reads raw metadata only when promoted OWA snapshots exist.

- [ ] **Step 1: Write pure helper tests.** Use fresh in-memory records and explicit source paths under a synthetic root. Pin these assertions:
  - Two IDs/dates, identical splitDraftContent output -> coveredCount 1, issues [], promotedCount 2, groupCount 1.
  - Two differing nonempty approved contents -> exactly one ambiguous_versions issue containing both IDs regardless of input order, length or dates.
  - No chunks for the expected owner -> missing_chunks, even if a decoy owner includes the draft ID/source URL in its body.
  - Full layout with one changed segment -> content_mismatch; partial, duplicate, extra or non-positive/noninteger sectionOrder -> invalid_chunk_layout.
  - Correct sectionOrder but reversed physical array order -> PASS; swapped segment contents -> content_mismatch.
  - Mixed sourcePath, unapproved raw ID, missing raw mapping, path outside root or outside downloads/knowledge_inbox -> invalid_provenance.
  - Blank content/title/ID -> invalid_draft; distinct expected IDs in a normalized title group or owner collision across groups -> ambiguous_identity.
  - Fixtures with apostrophes, literal backticks, multiline content and a paragraph longer than 1800 preserve exact expected segments; changing a token remains a mismatch.

- [ ] **Step 2: Run RED.** `TMPDIR=/tmp/opencode node --test scripts/test_owa_promoted_coverage.mjs` must fail because the helper does not exist. Save the result under a new /tmp/opencode verification directory.

- [ ] **Step 3: Implement assessOwaPromotedCoverage in the new helper.** Follow the spec's ordered checks and exact field semantics. It performs no filesystem/network/process calls, does not mutate input arrays, and validates a single coherent provenance path from an approved equivalent draft's raw metadata.

- [ ] **Step 4: Run unit GREEN.** Rerun the exact command from Step 2; all explicit cases must pass. Add a deterministic-input-order assertion for issue ordering and draftIds.

- [ ] **Step 5: Write isolated CLI tests.** Model fixture ROOT setup on scripts/test_kb_quality_gate_business_semantics.mjs; provide every required OWA CSV, matching _manifest.json counts and a FINISH build manifest. Override ROOT and both KB_QUALITY_GATE_OUT_* variables. Assert:
  - Equivalent-revision fixture -> exit 0 / PASS / promotedCoverage.coveredCount 1.
  - Version conflict, missing chunk and changed-content fixtures -> exit 2 / FAIL, structured issue kind and new OWA-specific error prefix.
  - Existing result merging retains unrelated namespaces and standard file/job checks remain active.
  - A conflicting-version fixture run with --auto-fix cannot invoke the fixture's harmless node-command marker. No actual exporter/build process or network call is allowed.

- [ ] **Step 6: Run CLI RED.** `TMPDIR=/tmp/opencode node --test scripts/test_kb_quality_gate_owa.mjs` must fail on missing structured coverage / false ID-based verdicts, not missing fixture files or invalid manifests.

- [ ] **Step 7: Wire the OWA-only path.** Import the helper and findRawDrafts. Remove the now-unused canonicalDraftsByTitle helper only after confirming it has no other caller. For OWA, expose promotedCoverage and summarize issues into errors with `OWA promoted coverage <kind>: <count>`. For non-OWA retain the existing ID/URL behavior. Do not modify export_owa_ontology.mjs, auto-fix implementation or report merge semantics.

- [ ] **Step 8: Register and run focused tests.** Add `test:owa-quality` as `node --test scripts/test_owa_promoted_coverage.mjs scripts/test_kb_quality_gate_owa.mjs`; add node --check for the three new files to npm run check. Run npm run check, npm run test:owa-quality and `TMPDIR=/tmp/opencode node scripts/test_kb_quality_gate_business_semantics.mjs`. Expected: exit 0 for each.

- [ ] **Step 9: Review the diff and checkpoint.** Only the four named source/test files and package.json may change in this task. A local worktree-only commit may be made after checks and review; do not merge, push or edit main. If native worktree remains detached, create a named branch before a commit rather than touching main.

### Task 2: Source advisory and real-input verification

**Files:** the two docs/reference documents in File Structure; no runtime source changes.

**Interfaces:**
- Consumes assessOwaPromotedCoverage and the integrated CLI from Task 1.
- Produces a human-readable source recommendation and verification ledger. Neither document is an approved/promoted knowledge record.

- [ ] **Step 1: Finish read-only source comparison for Korekta zbiorcza FA.** Read the two promoted snapshots and selected sections of the historical COM example; never execute it or copy credential/login examples. Cite original path, line numbers, encoding and SHA256. Include Struktura_Bazy_2026.4.1.md's collective-correction entry as version-specific documentary evidence, not live SQL proof. Compare concrete claims: one correction vs one per source invoice, COM vs current MCP, document fields/codes, relations and verification level. Do not infer global absence of an API from an absent tool name.

- [ ] **Step 2: Write the source recommendation.** Recommend an explicitly reviewed replacement/synthesis rather than automatically accepting either snapshot. Mark unsupported current API, exact live mappings, effects and cardinalities as unconfirmed. Preserve differences between the 2016 example and 2026.4.1 documentation. Make no corpus edits or draft submissions.

- [ ] **Step 3: Run read-only real-input comparison.** Use `ROOT=/docker/openspg` and BOTH `KB_QUALITY_GATE_OUT_JSON` and `KB_QUALITY_GATE_OUT_MD` set to unique paths under /tmp/opencode. Run the isolated worktree's CLI with `--kb OWAOntology,ComarchOptimaBusinessSemantics --json-only`, never --auto-fix. Expected exit 2 because unresolved versions remain. Record issue groups and every unexpected difference; predicted OWA ambiguous groups are PS/FPF/WZ/Korekta, with 63 other groups covered. BusinessSemantics should remain PASS for local content checks; file ownership is not what that gate measures.

- [ ] **Step 4: Verify non-mutation.** Capture SHA256 and uid/gid/mode of the two production export directories before and after the real-input check; they must match, including the recently authorized mcpbot ownership of the two BusinessSemantics files. Outputs must exist only in the worktree and temporary evidence directory. Do not regenerate production dashboard reports.

- [ ] **Step 5: Final verification and review.** Run npm run check, npm run test:owa-quality, both existing BusinessSemantics tests with TMPDIR=/tmp/opencode, python3 scripts/validate-module-map.py, and git diff --check in the worktree. Inspect effects before every newly selected test. Record exact exits, unit/CLI test counts, unresolved real-data failures and limits of source evidence. Independently review the full change using the execution/review method previously selected by the user before claiming it is ready.

- [ ] **Step 6: Hand off, without deployment.** Link the source recommendation, verification ledger and worktree diff. Explicitly state: tests passing is not a green production gate; production code/corpus/runtime and automation state were not changed. Any merge, push, corpus correction, rebuild or restart requires a separate request.

## Plan Self-Review

- Scope: preserves every agreed non-mutation boundary; exporter selection is intentionally unchanged.
- Spec coverage: helper/CLI tests cover content, equivalence, identity, provenance, layout, fail-closed ambiguity and rebuild-trigger separation; Task 2 covers evidence and recommendation.
- Type consistency: helper return and gate's additive promotedCoverage field use the same names.
- Review Focus: each of the five failure classes above has an explicit Task 1 test.
- Decision approved by the user on 2026-10-23: all divergent still-promoted revisions are ambiguous (currently four groups), not just the one conflict exposed by the old ranking heuristic.
