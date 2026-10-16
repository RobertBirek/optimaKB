# OWA compact presentation — controlled deployment

**COMPLETE — executed 2026-10-16.** Task/spec date and filenames remain 2026-10-15. Actual connected acceptance: **12 PASS / 0 PARTIAL / 0 MISS**, with **38.9109%** whole-body shortening and all twelve individually shorter.

## Reviewed transfer and gates

- Base: `38e314b720004e6454af0f3532bc0d50ac0928d6`; reviewed tree: `95728a9b54ac3cdd79082fc6b665d18cf6147fbe`.
- Source: `/tmp/opencode/openspg-owa-compact-20261015`; runtime: `/docker/openspg`.
- Transferred **11 reviewed script files** through **six native `apply_patch` tool calls**. Exact candidate/source/destination bytes and the 21-module readable dependency closure verified. Six originals and five explicit original-absence markers are backed up.
- Both reviewed offline reports are archived unchanged under `reviews/candidate-artifacts/`; the deployment publishes the four Task 4 reports.
- Main: **18 gate commands, 170 numbered passes / 0 failures** across the five focused suites, plus syntax and map checks. Tests use the existing closed synthetic/frozen loaders. The separately retained candidate gate verifies **510 passes / 0 failures**, plus focus/profile assertion suites; it is not represented as freshly rerun on main.

## Sequential service reloads

| Order | Unit | Old → new PID | New start UTC | Gate |
|---|---|---|---|---|
| 1 | `erp-kb-mcp.service` | 3762440 → **4067830** | 2026-10-16 06:54:40 | active/running/exit0, local health, TLS/public compact Q01, seven profile manifests |
| 2 | `erp-semantic-mcp.service` | 3750833 → **4068095** | 2026-10-16 06:54:56 | active/running/exit0, local health/compact Q01, public route recheck |

Each unit was restarted **exactly once**. Central passed its gates before the dedicated restart. Final deployment public readback: **2026-10-16T06:55:04.583Z**.

Actual public SemanticKB URL remains `https://optima.kag.taxbell.pl/mcp/erp-semantic-mcp`, served by the central dispatcher on **3400**, with health profile `legacy`. Dedicated SemanticKB remains on **3420**. Entrypoint and working directory remain the existing bridge and `/docker/openspg`. TLS verification returned **0** with HTTP 200 before and after reloads. Public Q01 hashes equal the complete reviewed compact body.

Public initialize identities and exact read-only tool manifests matched for Semantic, Product, Technical, InsERT GT, Legal, Payroll and Accounting profiles.

## Preservation and evidence

Durable private root: **`backups/manual-repairs/owa-compact-presentation-20261015/`**.

- `preflight.json` / `postflight.json`: actual PID/start/health, supported read-only automation configuration and job/action state, preservation inventories and unchanged indices.
- `source-hash-proof.json` / `native-transfer-receipts.json`: reviewed-tree and exact source/destination/backup bindings, all native transfer requests, original hashes and added-file absence.
- `baseline/`: immutable Task1 and approved prior connected live12; `reviews/`: final review/fix, manual/size proof and full rehashed **66 + 117 + 125 + 163** sealed members. The **18.05% failed attempt remains immutable history**.
- `gates/commands.json`: all exact main commands, exits and complete-log hashes.
- `live12/`: full actual connected Markdown/safe JSON, separately labelled public JSON readbacks, request/source/response hashes, manual review and recomputed same-corpus comparison.
- `RECOVERY.md`: future restoration of exact originals/removal of verified additions, then **both affected services central → dedicated**, gated reloads/readbacks. **No rollback performed.**
- `evidence-manifest.json` / `final-verification.json`: durable-member fingerprints, report hashes, scope/index/preservation checks and private `mcpbot` readability.

Eight existing generated-report modifications, the new plan/spec, unrelated reports, raw/promoted/registry/CSV/policy fingerprints and unrelated running services were preserved. No generated-report drift was observed; none was manually reset. Ordinary call telemetry is allowed and this is **not a zero-audit-write claim**. Worktree and uncommitted changes remain; no commit, push, index write or subdelegation occurred.

No open concerns. This verifies presentation and source fidelity, not fresh ERP/MSSQL facts or graph execution. See [Live12 results](OWA_Compact_Presentation_Live12_2026-10-15.md) and [deployment JSON](OWA_Compact_Presentation_Deployment_2026-10-15.json).
