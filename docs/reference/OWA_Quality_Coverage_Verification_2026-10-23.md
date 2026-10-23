# OWA quality coverage: verification ledger, 2026-10-23

## Outcome and boundary

The isolated implementation passes the selected offline software checks. The real-input gate exits **2 / overall FAIL**: **134 promoted OWA snapshots, 67 title groups, 63 covered, four `ambiguous_versions` groups**. BusinessSemantics remains **PASS** for its existing local staging checks. Passing tests is **not a green production gate**.

Task 2 changes only this document and [the source advisory](OWA_Collective_Correction_Source_Review_2026-10-23.md). Neither is an approved/promoted knowledge record. Task 1 sources were not edited. No production code, corpus, runtime or automation state changed through this task; no deployment occurred.

Context:

- Worktree **W**: `/root/.local/share/opencode/worktree/b088ac/owa-quality-gate-20261023`.
- Branch: `fix/owa-quality-coverage-20261023`.
- Tested Task 1 HEAD / Task 2 BASE: `5a2950c1df06bd9e0490a5da4d073adedc925226`.
- Temporary evidence **E**: `/tmp/opencode/owa-quality-task2-n8qdy5zk`.
- Prepared source evidence **S**: `/tmp/opencode/owa-source-evidence-20261023-eo3x_89j`.
- Tests ran in W on 2026-10-23. A fresh report path prevented merging unrelated pre-existing production report results.

## Effect inspection before execution

Read root/scripts `AGENTS.md`, the module map, applicable operational-memory section, design spec, Task 2 brief and controller progress ledger. Read only the plan's relevant file/command references, not the whole plan.

| Command selection | Inspected effects and containment |
|---|---|
| `npm run check` | `package.json` runs `node --check` syntax checks, not script execution. Started with this check. |
| `npm run test:owa-quality` | Read both named test files, helper and called CLI/loaders. 39 pure helper tests; 10 CLI tests use fresh synthetic ROOTs under `/tmp/opencode/owa-quality-cli-*`, override **both** reports and clear child authentication inputs. Tests delete their own fixture roots; retained stdout/stderr/reports/exit artifacts remain under their evidence directory. |
| Synthetic auto-fix marker test | The controller's ledger explicitly permits this fixture-only test. Its synthetic ROOT contains a harmless child marker, no production process script. The test proves an ambiguity cannot invoke that marker. The real-input invocation has no `--auto-fix`. |
| BusinessSemantics gate test | Read test and gate. Fresh fixture ROOT uses `os.tmpdir()`; set `TMPDIR=/tmp/opencode` and both report overrides to E so reports survive fixture cleanup. Checks a missing description fails, then a matching description passes. |
| BusinessSemantics promoted export test | Read test and exporter execution guards. Test forces a fresh fixture ROOT and `OPENSPG_HELPER_ONLY=1`; MSSQL/config reads/driver creation are behind the disabled live branches. Its fixture-only export writes under `/tmp/opencode` and removes its fixture. No production exporter invocation or SQL occurred. |
| Module-map validator | Read Python source: reads map, checks paths/dependency graph; no runtime access or report writes. |
| Real gate | Read full CLI, loaders, pure helper and atomic writer. Without auto-fix it reads local JSON/CSV/manifests; its only writes are the two report targets. Set ROOT to production for inputs and **both** report paths to E. It makes no API, COM, SQL, build or network request. |
| Independent input/source cross-check | Inspected temporary `E/independent.py`: standard-library CSV/JSON reads and local hashes only; outputs only to E. It does not import the JavaScript gate/helper. |
| `git diff --check` | Local whitespace check only. No git reset/checkout/revert or shared-branch action. |

No auto-discovery, general/live suite, new dependency, production export/build, SQL, business/write MCP call, COM execution, secret read, runtime-data inspection, restart, publish, push, merge or automation change ran.

## Exact commands and retained exits

All commands below ran with cwd W. E/W in this section expand to the absolute paths above. `E/run.py` executed these explicit argv/env combinations, preserving timestamps, exact command and exit in `E/<label>.command.json`, numeric exit in `E/<label>.exit`, and separate `E/<label>.stdout.log` / `E/<label>.stderr.log`. It records only named overrides, not the inherited environment or secrets.

| Label | Command (expand E/W) | Exit | Observed result |
|---|---|---|---|
| `check` | `npm run check` | 0 | Syntax checks passed; stderr empty. |
| `owa` | `TMPDIR=/tmp/opencode npm run test:owa-quality` | 0 | **49/49**: 39 helper + 10 CLI; 0 failed/cancelled/skipped/todo. |
| `business-gate` | `TMPDIR=/tmp/opencode KB_QUALITY_GATE_OUT_JSON=E/business-gate-report.json KB_QUALITY_GATE_OUT_MD=E/business-gate-report.md node scripts/test_kb_quality_gate_business_semantics.mjs` | 0 | Two asserted CLI scenarios: missing description exits 2, covered description exits 0. Script has no TAP case counter. |
| `business-promoted` | `TMPDIR=/tmp/opencode node scripts/test_optima_business_semantics_promoted.mjs` | 0 | One fixture export scenario passed; script has no TAP case counter. Helper-only SQL guard inspected before running. |
| `module-map` | `python3 scripts/validate-module-map.py` | 0 | `Mapa modułów: OK (4 modułów)`; not a runtime-readiness claim. |
| `real-gate` | `ROOT=/docker/openspg KB_QUALITY_GATE_OUT_JSON=E/real-gate-report.json KB_QUALITY_GATE_OUT_MD=E/real-gate-report.md node W/scripts/kb_quality_gate.mjs --kb OWAOntology,ComarchOptimaBusinessSemantics --json-only` | **2** | Expected unresolved-version failure; JSON/Markdown only in E, stderr empty. |
| `independent` | `python3 E/independent.py` | 0 | Independent CSV/JSON coverage counts, source hashes and selected excerpts agree. |
| `independent-final` | `python3 E/independent.py` | 0 | Same check repeated with additional revision-count reporting; no input changes. |
| `diff-check` | `git diff --check` | 0 | Final document diff has no whitespace errors; local commit stages only these two docs. |

The corresponding harness invocations are `python3 /tmp/opencode/owa-quality-task2-n8qdy5zk/run.py <label>`. The first independent run predates an additive revision-count output field; both exits/logs remain. `E/independent.py` is the final inspected version.

OWA fixture evidence: `/tmp/opencode/owa-quality-cli-83IFpO/` (path printed in `E/owa.stdout.log`). Each scenario retains report JSON/Markdown and `run-N.stdout`, `run-N.stderr`, `run-N.exit.json`; the synthetic ROOTs themselves were cleaned by the tests. BusinessSemantics gate reports remain in E; its exporter test normally cleans fixture CSVs, and its passing assertions/log remain. No software-test failure occurred in Task 2.

## Actual staging result

Real gate ran **2026-10-23T07:12:32.923318+00:00 to 07:12:34.449686+00:00**; payload timestamp `2026-10-23T07:12:34.426Z`. Reports: `E/real-gate-report.json` and `E/real-gate-report.md`.

OWA's sole error is `OWA promoted coverage ambiguous_versions: 4`. Warnings are empty; there are no additional missing-content/layout/provenance/identity errors. Each of these groups has two still-promoted divergent revisions:

| Group | draftIds (both included in structured issue) | Expected owner |
|---|---|---|
| Encja: Faktura Proforma (FPF) | `draft_2026-07-15_05bf7276_faktura-proforma`; `draft_2026-07-17_b857aef5_encja-faktura-proforma-fpf` | `OWA_ENTITY_ENCJA_FAKTURA_PROFORMA_FPF` |
| Encja: Korekta zbiorcza FA | `draft_2026-07-15_0570f3dd_korekta-zbiorcza-fa`; `draft_2026-07-17_941acb19_encja-korekta-zbiorcza-fa` | `OWA_ENTITY_ENCJA_KOREKTA_ZBIORCZA_FA` |
| Encja: Potwierdzenie Salda (PS) | `draft_2026-07-15_06e9257b_potwierdzenie-salda`; `draft_2026-07-17_1b02dc6a_encja-potwierdzenie-salda-ps` | `OWA_ENTITY_ENCJA_POTWIERDZENIE_SALDA_PS` |
| Encja: Wydanie Zewnętrzne (WZ) | `draft_2026-07-15_05af9e1c_wydanie-zewnetrzne`; `draft_2026-07-17_e6ad73fd_encja-wydanie-zewnetrzne-wz` | `OWA_ENTITY_ENCJA_WYDANIE_ZEWNETRZNE_WZ` |

Every issue reason is: `Approved revisions have different full content segments; no version was selected.` Coverage fails before the helper selects a content version; the four issues do not certify lower-priority checks for those groups. Ambiguity records content differences, not a ruling that all business assertions conflict.

| Namespace | Independently parsed CSV row counts | Local build-manifest observation |
|---|---|---|
| OWAOntology | entities 67; fields 109; relations 147; workflows **132**; chunks **190** | jobs 462-466 all FINISH |
| ComarchOptimaBusinessSemantics | domains 8; descriptions 643; code meanings 12; rules 21 | jobs 336,338,339,870 all FINISH |

These job states come from local manifests; no live builder/graph verification ran. Staging manifest timestamps are OWA `2026-08-31T18:45:59.936Z`, BusinessSemantics `2026-10-12T12:03:08.215Z`. BusinessSemantics has no errors/warnings and no OWA-only `promotedCoverage` field. Its current gate checks are not an ownership/accessibility test or a new full-content-equivalence contract for that namespace.

### Independent correspondence with real records

`E/independent-summary.json` and `E/independent-group-ledger.json` retain independently parsed counts and per-group IDs, segment-sequence hashes, segment counts, owner, source path, raw ID and staged-content matches. Python used its own CSV parser, Unicode grouping/owner logic and UTF-16-aware segmentation implementation matching the specified exporter normalization. It imported no production/worktree JavaScript helper.

For all **63** non-divergent groups, the check compared **every** chunk to every equivalent approved revision: exact owner, contiguous `sectionOrder` 1..N, exact segment count/content, a single coherent inbox source path and same-ID/same-namespace raw metadata at that path. It found 134 raw OWA records. Independent counts and ambiguous title/ID lists equal the CLI result; no real-input defect required a Task 1 edit.

Concrete real examples:

- **Towar (kartoteka towarów i usług)** has **three** equivalent approved revisions (`9468a772`, `3dd22ba4`, `b759524a` in their full draft IDs). All produce the same eight segments; staging has eight matching chunks sourced from the `b759524a` raw Markdown path. A different revision ID does not mean missing content.
- **Korekta zbiorcza FA** has three segments in the July 15 snapshot and two in July 17. The two staged chunks match July 17 and its raw path. This still fails because July 15 remains promoted; staging presence cannot approve one version over the other.
- The 134/67 total does **not** mean exactly two snapshots per group: 65 groups have two, “Encja: Atrybuty test v2” has one, and Towar has three. The one/three groups are covered. This detail did not change the forecast four/63 result.

Synthetic failures cover missing/changed segments, decoy owners, broken ordering, bad provenance, identity collisions and divergent versions; this task did not damage real inputs to repeat those negative tests. The real run verifies positive coverage for 63 groups and ambiguity for four. Older operational memory lists 189 chunks/zero workflows; the current measured staging has 190/132. No file was regenerated to reconcile that historical note.

## Non-mutation evidence

`E/run.py` captured `E/exports-before.json` immediately before the real gate and `E/exports-after.json` immediately after it. It enumerated both complete export directory trees, hashed each regular file and recorded numeric uid/gid/mode for files and directories. `E/exports-comparison.json`: **equal=true, 19 entries (17 files + two directories), changes=[]**. Tree equality also checks additions/removals within those directories.

| Production path | Before = after ownership/mode | Before = after SHA256 |
|---|---|---|
| `/docker/openspg/exports/owa_ontology/v1` | uid 999 / gid 987, `0755` | Full file hashes in the matching snapshot pair |
| `/docker/openspg/exports/optima_business_semantics/v1` | uid 999 / gid 987, `0775` | Full file hashes in the matching snapshot pair |
| `.../optima_business_semantics/v1/business_description.csv` | **mcpbot:mcpbot**, uid 999 / gid 987, `0644` | `0142c23f02d95cd824b61fcfd8797fb8eef468758947dc2fb962d63f9b04c384` |
| `.../optima_business_semantics/v1/_manifest.json` | **mcpbot:mcpbot**, uid 999 / gid 987, `0644` | `2d5d73dc6c987fe7666b8b1113cecc2d19e1c4a441e80a9f1ccfae035439fc6f` |

The authorized mcpbot ownership remained intact. The task performed no chmod/chown or permissions repair. Other pre-existing owners/modes remain in the snapshots unchanged.

Also compared S's `production-execution-baseline.json` before and after the gate: **555/555 files** retain SHA256, uid, gid and mode (`E/broader-baseline-before.json`, `E/broader-baseline-after.json`, each `changes=[]`). This broader baseline covers its enumerated production source/export/OWA corpus paths, not an exhaustive snapshot of production files, secrets, services or runtime data. It does not include the production dashboard reports; their protection follows from the inspected CLI's two overridden output paths. Neither production report was regenerated. Secrets, services and runtime data were not inspected or operated on.

## Self-review, rulings and handoff

Self-reviewed the two-document diff against the brief/spec and source excerpts: verified source paths, hashes, line references, version/date distinctions, measured counts, limits of local job evidence, report overrides and non-mutation claims. No Task 1 source edit or weakened check. No unresolved self-review finding in the two documents.

Rulings:

- Keep the explicitly authorized **fixture-only** auto-fix marker test; the production gate has no auto-fix. Its value is the regression proof that ambiguity cannot trigger rebuild. Extending this exception to real ROOT would violate the task boundary.
- Treat real gate exit **2** as the expected unresolved-data result, separate from software-test exits. Calling this a PASS would hide four still-promoted version conflicts.
- Do not infer two revisions per group from 134/67, or use historical operational-memory counts instead of current CSV reads.
- Independent whole-branch review belongs to the controller after this handoff. Task 2 reports its own self-review only and dispatches no reviewer or subagent. No controller ledger/plan/recon edit.

Outstanding: source advisory approval/supersession decisions, PS/FPF/WZ review, and current runtime/API/SQL verification remain separate work. The source advisory does not correct the corpus or turn the gate green. Any merge, push, corpus correction, rebuild, restart, deployment or automation-state change requires a separate request.
