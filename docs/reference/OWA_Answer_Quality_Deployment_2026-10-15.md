# OWA answer-quality deployment — DONE

**Connected acceptance: 12 PASS / 0 PARTIAL / 0 MISS.** Final report 2026-10-15T20:13:53.639Z. Reviewed tree `f2100a4d0c55e478aa9c62523a23511a899acc0a` remains the exact deployed 17-file candidate; no further production-code edits were made.

## Controlled restart and public readback

| Scope | Before | After |
|---|---|---|
| Central erp-kb-mcp.service PID | 2880869 | **3762440** |
| Central start | 2026-10-14 14:45:46 CEST | **2026-10-15 22:09:49 CEST** |
| Central health/state | healthy / active-running | healthy / active-running, ExecMainStatus=0 |
| Dedicated Semantic PID | 3750833 | **3750833 unchanged** |
| Public TLS verification | — | **0** |
| Central public read-only profiles | — | **7 initialize/tool-list checks passed** |
| Connected live12 | preserved attempt **0/4/8** | **12/0/0**, manual grading |

The public `/mcp/erp-semantic-mcp` route is served by the central dispatcher's dynamic semantic profile, not by a port-forward to dedicated 3420. The dedicated Semantic restart had been approved and performed earlier; the central service was then explicitly approved and restarted exactly once in this continuation using `sudo -n systemctl restart erp-kb-mcp.service`. No proxy/config changes or other-unit restarts followed. The stale-import endpoint discrepancy is resolved by public full-body readback and actual connected QA.

## Tests and preservation

- The integrated **35-command gate / 388 behavioral PASS / 0 FAIL** remains bound to unchanged code; every saved log/hash/exit was revalidated. It was not broadly rerun.
- Fresh continuation checks: main `npm run check`, module-map validation, whitespace check, TLS, 7 public read-only profile initialize/tool-list checks, diagnostic full-Q01 equality and 12 actual connected calls.
- All 17 reviewed files plus full frozen closure (20 modules / 16 static artifacts) matched preflight hashes. Code hashes and new service start are retained together in `restart-after.json`.

| Scope | Files | Before/after fingerprint |
|---|---:|---|
| raw | 964 | identical: `630fc7bdef4f455605a8de9368710e10bb69f7601721288c805f533e6c705f7d` |
| promoted | 606 | identical: `5e30614990bd4f08033d22835702259c1a2a8e36630e2242e0129e8694771bc7` |
| registry | 1 | identical: `1591ffa4f2cc93b77e6c9cfd5f5a29e65a4f83cd055772f254f55d3e2027901e` |
| csv | 135 | identical: `fb9c87300a5c67bbed3eb706515bcd8ec4e0abc139215f0792647515f69a013c` |
| policy | 2 | identical: `9cb6bf2eb023f187165aab94babf68a13d369df8b7648b430df0a744dd577b5c` |

Supported automation config hash stayed `58497b350c06bedaefdc63764072b1a842f295c5a8bed0db7bfce684af721523`; 56 job states and 92 actions stayed unchanged, with zero active automation jobs before/after. Unrelated byte drift: **0**. Indexes unchanged; no commits or pushes. Ordinary MCP audit/learning telemetry was permitted; no learning or automation configuration was changed to suppress it. No raw/promoted/CSV, graph, ERP, export/build, policy/timer, proxy or Docker mutation was performed.

## Evidence and attempt timeline

Original failed `qa-live12`, its reports and hashes remain intact. Failed public versions are archived byte-for-byte in `/docker/openspg/backups/manual-repairs/owa-answer-quality-20261015/qa-live12-central-reload/20261015T200922081Z/failed-public-reports` and the original `/docker/openspg/backups/manual-repairs/owa-answer-quality-20261015/public-reports`. The first attempt's **0/4/8** is retained as history, not rewritten into a pass. Read-only diagnosis is retained under `/docker/openspg/backups/manual-repairs/owa-answer-quality-20261015/topology-readonly`.

New timestamped operation journal, central before/after metadata, full connected replies/safe JSON, requests, source hashes, manual review and manifests: `/docker/openspg/backups/manual-repairs/owa-answer-quality-20261015/qa-live12-central-reload/20261015T200922081Z`. Public results: `OWA_SemanticKB_12Q_After_2026-10-15.{json,md}`. Task 6 worktree/durable reports have an appended final section. Private evidence is mcpbot-owned/readable with private modes. Rollback originals/candidate and original integration patches remain under `/docker/openspg/backups/manual-repairs/owa-answer-quality-20261015`; rollback was not needed.

Remaining nonblocking issues: verbose omission/support presentation and conservative source-UNKNOWN notices. Other dedicated MCP processes retain their prior imports; only the central public dispatcher and dedicated Semantic were separately approved for reload. Source statements are not fresh ERP/MSSQL/graph verification.

## Recovery runbook — I1 correction, documentation only

The two cached processes affected by this deployment are the **central erp-kb-mcp.service** and **dedicated erp-semantic-mcp.service**. This section describes a future separately approved rollback; **no rollback or new restart is authorized or executed by this revision**.

1. Separate rollback authorization is required. This documentation revision authorizes and executes no rollback, file restoration or service restart. Record before-state metadata for only the two affected processes and stop on unexpected source drift.
2. Use preflight.json files as the exact rollback allowlist: verify all 17 current candidate hashes before changing any runtime file; verify the four original backup hashes against originalSha256. Preserve unrelated files, corpus, policies and all evidence; never restore the whole checkout.
3. Restore only the four backed-up originally-existing reviewed files from original/ through apply_patch. Remove only the thirteen reviewed additions whose originalSha256 is null, and only while their current bytes still equal the recorded candidate hashes. No other file restoration/removal is in scope.
4. Before either restart, verify restored original byte hashes against preflight.json, verify all thirteen additions are absent, and verify mcpbot traversal/readability of the restored entrypoint and its required dependency closure. Stop before restarting if any byte, absence or readability check fails.
5. Restart erp-kb-mcp.service first. Wait for active/running, ExecMainStatus=0, changed PID/start and http://10.10.254.42:3400/health ok=true; verify the public semantic route serves the restored baseline. If any central check fails, stop and retain evidence; do not proceed to the next restart.
6. Only after the central checks pass, restart erp-semantic-mcp.service. Wait for active/running, ExecMainStatus=0, changed PID/start and http://10.10.254.42:3420/health ok=true. Recheck public and dedicated answers against the restored baseline and record the actual result.
7. Bind the restored hash/absence/readability checks, both before/after PID/start/health records, and public readback in one new rollback evidence manifest. Use the archived baseline response bindings only if the relevant source inputs still match; otherwise stop and report the drift.
8. Restart no other unit and change no proxy, configuration, policy, timer, Docker, graph, export/build or ERP state. Do not reuse the candidate 12/0/0 result as proof of rollback readback.

Sequential reload commands, only after restored-hash/absence/mcpbot-readability gates pass:

| Order | Future command | Required local health before proceeding |
|---|---|---|
| 1 | `sudo -n systemctl restart erp-kb-mcp.service` | `http://10.10.254.42:3400/health` → ok=true, active/running, ExecMainStatus=0 and new PID/start |
| 2 | `sudo -n systemctl restart erp-semantic-mcp.service` | `http://10.10.254.42:3420/health` → ok=true, active/running, ExecMainStatus=0 and new PID/start |

The first row must pass its public restored-baseline readback before executing the second row. No other unit is in this recovery scope.

## Documentation revision 20261015T202836648Z-I1-M2

Connected live12 interval: **2026-10-15T20:10:06.911Z–2026-10-15T20:10:51.225Z**. Start is the minimum and completion is the maximum over all 12 actual calls; **Q11** finished last, 599 ms after Q12. Original per-call timestamps, responses, grades and the failed attempt remain unchanged.

I1 recovery instructions and M2 aggregate timing are corrected without operational action. The earlier sealed report versions remain historical under `/docker/openspg/backups/manual-repairs/owa-answer-quality-20261015/qa-live12-central-reload/20261015T200922081Z/final-public-reports`; this revision's before/after copies and new bindings are under `/docker/openspg/backups/manual-repairs/owa-answer-quality-20261015/report-revisions/20261015T202836648Z-I1-M2`. Independent review remains preserved, not rewritten. Live answer score stays **12 PASS / 0 PARTIAL / 0 MISS**.
