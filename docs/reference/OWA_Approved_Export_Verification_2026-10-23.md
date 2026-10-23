# OWA: isolated approved-only exporter verification, 2026-10-23

## Scope and implementation

Operator authorized the design and implementation plan, then isolated code changes/tests only. No production export, corpus edit, build, schema push, graph operation, service operation, merge or push occurred. This is a prepared patch, not a deployed exporter or refreshed knowledge graph.

Worktree: `/root/.local/share/opencode/worktree/b088ac/owa-quality-gate-20261023`, branch `fix/owa-quality-coverage-20261023`.

- Plan/design commit: `81670ac`.
- Selector commit: `2456567` (pure selector and unit tests).
- CLI commit: `c53ab1e` (exporter, CLI tests, npm commands).
- Final integration fixes: `f2d6a1e` (approved-only whitespace parsing and generated-ID preflight; two exporter/test files only).

The selector requires active promoted OWA snapshots consistent with the registry in both directions. Raw metadata maps identity/provenance; raw content never wins over approved content. Different complete segment sequences produce `ambiguous_versions` and no selected drafts. Equivalent revisions use a deterministic lexical-ID representative and preserve their equivalent approved IDs in manifest provenance. Empty or invalid inputs also refuse.

The CLI validates all inputs and prepares all rows and provenance before creating/writing staging. Refusal emits structured JSON and exit 2, leaving existing CSV/README/manifests untouched. It no longer reads raw Markdown as a content fallback. Successful unambiguous fixtures retain the same five CSV formats and ID generation. Parser input is normalized for splitter-compatible whitespace, preventing equivalent CRLF/spacing representations from erasing structured sections; original snapshot content still supplies chunks and exact manifest hashes. Every complete generated rowset is checked for duplicate IDs before any output write. The manifest derives sourceRoots and records selected IDs, snapshot/raw paths and SHA256 of exact approved content; it no longer hardcodes July sources.

Per operator's editorial decision, the correction-to-multiple-invoices business link remains prose-only. No old N:M/JOIN/VAT/settlement assertions or create_sales_correction workflow are restored, and missing aliases/status/confidence are not inherited from withdrawn revisions. These omissions do not prove the corresponding aliases or product functionality invalid/nonexistent.

## Verification evidence

Final controller verification on `f2d6a1e`:

| Check | Actual result |
|---|---|
| npm run check | exit 0 |
| npm run test:owa-export | 107/107 PASS, 0 failed/skipped |
| npm run test:owa-quality | 49/49 PASS, 0 failed/skipped |
| npm run test:schema-export-integrity | exit 0 |
| module-map validator | exit 0, 4 modules OK |
| git diff --check 81670ac..HEAD | exit 0 |

Final logs and fresh bounded production-integrity snapshots: `/tmp/opencode/owa-approved-export-verified-f9dretfb/`. The 563 recorded production paths retained SHA256/UID/GID/mode during this verification. Scope is those paths and interval, not every file/process in production. The earlier pre-fix controller run remains preserved at `/tmp/opencode/owa-approved-export-controller-final-_nd5cgv7/` and is not the final-code evidence.

TDD evidence retained separately:

- Task 1: `/tmp/opencode/owa-task1-20261023/`, missing-module RED, 74-selector GREEN.
- Task 2: `/tmp/opencode/owa-task2-evidence-20261023-eb0tSA/`, old-CLI RED failures, final 97-export/selector GREEN. An additional real slow-stderr RED exposed truncated structured errors; synchronous diagnostic writing resolved it.
- Final fix wave: `/tmp/opencode/owa-final-fix-evidence-20261023-y1r9pure/`, section-bearing LF/CRLF/spaces/tabs/paragraph-indentation RED→GREEN; cross-/intra-entity ID collision RED→GREEN; final107+49 PASS. This addresses both Important findings from combined review.
- Final fix-wave synthetic fixture evidence: `/tmp/opencode/owa-export-cli-nEPiNI/`. This is not a successful export of the real corpus. Earlier pre-fix success fixtures remain preserved separately.

## Actual real-corpus refusal trial

Final-code trial: `/tmp/opencode/owa-final-fix-trial-20261023-x27bx0ac/`. Earlier pre-fix trial `/tmp/opencode/owa-approved-export-trial-final-20261023-ox3_giw2/` remains preserved separately.

The new ROOT contains byte-identical copied inputs from the previous preserved corpus: 135 raw and 133 promoted OWA JSON records, with the registry. It retains all PS/FPF/WZ versions; no conflict was silently resolved or dropped. Five baseline CSVs were copied intact; README and staging/build manifests were explicit baseline sentinels, not new-build proof.

Actual exporter result: exit 2, empty stdout, exactly three `ambiguous_versions`: Faktura Proforma (FPF), Potwierdzenie Salda (PS), Wydanie Zewnętrzne (WZ). No extra registry/provenance qualification errors occurred. All 8 output files and copied/original inputs remained unchanged; fresh before/after metadata matched for 563 protected production paths.

This is the expected refusal of the entire real-corpus export, not a new complete export, live quality PASS or graph refresh. PS/FPF/WZ still require separate source/editorial review.

## Independent reviews

- Task 1 reviewer `ses_e955a11c0ffeZPMt2tJUalNZk5`: spec PASS, quality Approved, no findings.
- Task 2 reviewer `ses_e954c1a00ffeyHRsWNIlHAaupv`: spec PASS, quality Approved, no findings; independently checked logs, checksums, trial code and retained artifacts.
- Final combined reviewer `ses_e95499121ffeV332Xr8ozsyI1g`: found two Important integration issues (equivalent whitespace vs section parsing, child-ID collisions). Both independently reproduced and fixed in one wave. Scoped re-review of `c53ab1e..f2d6a1e`: both ADDRESSED, no new Critical/Important breakage. No open review findings remain for this plan's patch; broader exclusions below are not assessed as solved.

## Limits and disposition

No runtime/model accuracy or graph freshness assessment was performed. Path containment is lexical, not symlink/realpath hardening; write safety covers rejected input before output mutation, not a transaction across five files after disk/process failure. Optional ESLint was unavailable; syntax and required tests passed without installing dependencies. Builder UPSERT deletion and clearing empty properties remain unverified and outside this patch.

Retain the patch/worktree and evidence. Production is still held: the corrected exporter intentionally refuses unresolved real-corpus conflicts. Any future merge/deploy/export/build/graph reconciliation requires separate operator authorization.

## Controller rulings

1. Implementation commits precede diff-based review, task completion follows review. Cost if wrong: local follow-up commits, never an automatic production change.
2. Reuse the existing linked worktree/dependencies, no install. Cost if wrong: missing-dependency work must be reported instead of silently changing lockfiles.
3. Do not override subagent models, honoring the harness restriction unless the operator names one. Cost: potentially higher review/implementation cost than a skill-selected lower tier.
4. Keep pure-selector containment lexical, consistent with the approved offline interface. Cost: no claim of live symlink/concurrent-writer hardening.
5. Treat absent optional ESLint as an environment limitation, not permission to install packages or claim lint success. Cost: lint remains unmeasured.
6. Combined final review covers this plan's full `81670ac..HEAD` range, not unrelated previously completed branch work. Cost: no blanket merge-readiness claim for the accumulated branch.
7. Normalize only approved parser input and validate IDs across all five complete generated rowsets before writes, without changing original-content hashes or ID generation. Cost if wrong: local parser-compatibility rework; targeted RED/GREEN and scoped re-review provide evidence.
