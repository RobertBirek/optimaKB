# Semantic CPU acceptance — measured gates passed

**Independently accepted for the bounded workload: 4/4 attached SemanticKB burst calls and 32/32 direct public MCP protocol compatibility cases.** Spec/contract: **PASS WITH DOCUMENTED REPLAY-METHOD DEVIATION**; quality/operational: **PASS WITH RESIDUAL RISKS**. No current Critical or Important blocker was established for this finite acceptance. Release tree `716d9edf05fa476b17bc573e4998a5feebc82156`; retained deployment and coordinator-supplied current central/dedicated PIDs **787565 / 788778**. Deployment and portable per-file hashes: [deployment report](Semantic_CPU_Block_Deployment_2026-10-17.md) and adjacent JSON.

Historical HTTP availability **I1 is CLOSED ONLY for the tested four attached-call burst and original32 public protocol replay**. The independent review does not erase earlier failures, identify the exact historical socket-closing component or promise unrestricted availability. Its single archived copy is `backups/manual-repairs/semantic-cpu-block-20261017/final-report-revision-20261017T133609Z/review/cpu-operational-review.md`, SHA-256 `4a86f220fab5246dc5d01a7d3c853ca528666c83c5d13b98c5e614335e26ddee`.

## Four actual attached-tool calls with overlapping probes

One parallel batch called the four attached SemanticKB tools using the unchanged original Q04/Q03/Q06/Q10 queries, **as_of 2026-10-15**, limit **5**, and distinct `cpu-deploy-public-burst-<id>` correlations. All returned complete accepted Markdown; no socket error occurred. The saved transcript files add exactly one declared terminal LF; removing that recording delimiter yields the exact accepted body hashes.

| Original case | Actual method | Existing bridge elapsed time |
|---|---|---:|
| Q04 | `erp_process.explain` | 2573 ms |
| Q03 | `erp_entity.get` | 4741 ms |
| Q06 | `erp_relation.list` | 6993 ms |
| Q10 | `erp_concept.search` | 4909 ms |

Actual arrivals/completions span **13:07:36.200–13:07:43.517 UTC**, **7317 ms**, using maximum completion across all calls. These times come from the existing bridge audit, not an invented client timer. The attached renderer exposes Markdown but not structured JSON; it is not represented as providing raw JSON. Full JSON capture comes from the distinct actual MCP original32 harness below.

Attached transport RPC IDs are also not exposed. Native `*.request.json` files retain original case IDs only as binding templates; `native-tool-boundary-addendum.json` separately hashes the actual attached-tool inputs. The protocol harness's recorded RPC IDs and raw replies are actual, and `connected-wire-request-manifest.json` binds its exact serialized wire bodies.

Independent probes ran at **750 ms public health / 2500 ms metadata / 1000 ms local health**, with process samples every **100 ms**. Metadata plus the finite semantic workload stayed below the configured 90 POST/minute scheduling budget; no rate-limit response was observed. No public saturation, malformed request or worker crash was attempted.

| Observation | Public health successes | Health p50 / p95 / max, ms | Metadata successes | Metadata p50 / p95 / max, ms |
|---|---:|---:|---:|---:|
| Idle before | 13/13 | 10.159 / 241.361 / 241.361 | 4/4 | 14.833 / 144.601 / 144.601 |
| **Actual active burst interval** | **9/9** | **10.743 / 26.235 / 26.235** | **3/3** | **12.700 / 15.918 / 15.918** |
| Whole burst observation window | 39/39 | 10.660 / 35.000 / 205.915 | 12/12 | 14.550 / 118.263 / 118.263 |
| Original32 observation window | 125/125 | 9.883 / 18.258 / 262.789 | 38/38 | 13.634 / 26.742 / 163.028 |

**Zero probe failures/timeouts.** The active measurements pass public thresholds **p95 ≤1000 ms / max ≤2000 ms**. Idle/active differences include network/TLS jitter and small-sample variation; they are not a measured CPU reduction ratio. The complete wider windows are retained rather than presenting only the favorable active subset.

## Capacity and cost

Live health snapshots observed **2 active executors / 2 queued requests**, with configured **2 executor / 8 waiter** bounds and no fatal reason. Both services finished available with zero active/queued work. Successful worker responses passed the local generation handshake; destination hash/closure checks are recorded separately from that runtime inference.

During **7223 ms of sampled active work**, central process CPU increased **16,310 ms**, sampled RSS reached **256,626,688 bytes (~244.7 MiB)** and thread count reached **21**. Dedicated RSS reached **145,350,656 bytes**, with **17 threads** and one executor allocated. The wider original32 observation window recorded **99,730 ms central CPU** and **247,468,032 bytes** sampled maximum central RSS. Samples do not establish hard peak memory or sustained throughput.

Supplemental direct HTTP readbacks are separately labelled in `connected/`: dedicated Q01 **3895.869 ms cold / 2776.909 ms warm**; central public Q01 **2484.052 ms**; dedicated-phase public Q01 **2350.682 ms**. Exact production queue/startup/handler decomposition is not exposed by the unchanged public interface; queueing was actually observed, and whole-request elapsed times include it. Source-bound private fixture timings retain that finer decomposition.

The mechanism improves event-loop isolation while CPU-bound semantic execution continues. Two executor slots exclude Node loader/V8/libuv/helper threads from their count. Neither worker offload nor these measurements prove less total CPU or more sustained throughput.

## Original32 full-body compatibility replay

The actual public, authenticated **MCP protocol harness** connects to `https://optima.kag.taxbell.pl/mcp/erp-semantic-mcp`, performs initialize/initialized notification/tool discovery, and executes the original 32 `tools/call` requests. It imports only independent audit helpers; it does not call the domain handler directly, use a fake server, substitute frozen runtime inputs or override production providers. The four attached-tool calls above are separate from these 32 protocol-harness calls. Supplemental HTTP smokes are separately identified and do not substitute for either workload.

The reviewer explicitly accepts this **replay-method deviation** on its bounded operational merits: instead of the literal 32 attached-tool replay requirement, the replay used 32 direct public authenticated protocol calls with the same route/profile/configured auth context and full protocol/body parity evidence. **Four attached calls are not 32 attached calls**; no native JSON, wire IDs, client timings or attached-tool states are inferred from the protocol captures.

Results: **32/32**, **83,487.614 ms total**, maximum individual HTTP call **3027.728 ms**. Q01–Q12 retain **2026-10-15**, H01–H20 retain **2026-10-16**, all limit **5**, with their 32 distinct original correlation IDs and exact original request bytes. Full Markdown and ordered whole JSON match accepted V1; the only allowed differences are `/result/structuredContent/evidence/<index>/observedAt`. Independent physical CSV/record/locator/artifact-hash/source/presentation audits match for all cases. UNKNOWN/FK/provenance qualifications and **2 sources / 3 sections / 4000 extract characters** remain intact.

This is now a **compatibility regression replay**, not a new held-out accuracy score. The independent new10 bank was not accessed, retested or tuned. Its historical **2/5/3** remains unchanged.

## Evidence and disposition

Private root: `backups/manual-repairs/semantic-cpu-block-20261017/operation-20261017T123800Z/`.

- `connected/native-burst-*.md`, request files and `native-burst-proof.json`: attached-tool captures, request hashes, sanitized server timing events and active probe/resource overlap.
- `connected/parity32/`: all 32 requests, raw JSON, safe parsed JSON, whole Markdown, exact difference paths and independent source audits.
- `final-evidence.json#/parity32/responses`: every request, response, Markdown and source-audit SHA-256; bound file SHA-256 `c6e93891eab77b25d82fbf213a956f9ffe4b452ff4e12bc646375e70f9d82d94`.
- `probes/`: full idle/burst/replay probe results and sampled process counters, not only percentile summaries.
- `gates/` and `retained-validation.json`: fresh **44/44** focused tests and freshly bound historical **1066-pass** evidence; no fresh broad rerun claim.
- `history/`, `reviews/`, `old-outputs/`, backup/recovery proofs and seals preserve the initial count blocker and earlier availability failures.

Pre/post preservation checks passed for source release identity, both indexes, raw/inbox/registry, CSV/manifests, policies/configuration and eight unrelated generated reports. Configured `autoDraft=1` and provider `api` remain unchanged; the read-only no-draft guard remains forced. Ordinary telemetry was allowed.

## Final report revision and supplied metadata

The documentation-only revision is under `backups/manual-repairs/semantic-cpu-block-20261017/final-report-revision-20261017T133609Z/`. All previous public versions and seals were archived byte-exact before updating. The original **715 operation entries are preserved**; the revision's final manifest binds the current reports, review and append-only source/durable report without modifying the original operation seal.

The coordinator supplied current metadata: central **787565**, start **2026-10-17 15:04:45 CEST**; dedicated **788778**, start **15:06:24 CEST**, both active/running/exit0; public health `ok:true`, semantic `available:true`, workers **2**, active/queued **0/0**, limits **2/8**, reason `null`; default TLS verification and Git diff check PASS; main `f23796f` equals remote. This is stored in `coordinator-metadata-receipt.json` as **supplied, unscored metadata—not a new performance observation**. No new request, test/load or service action was performed for finalization.

**Independent acceptance applies only to the demonstrated finite workload.** Historical availability I1 is closed within that boundary, with no current Critical or Important acceptance blocker. CPU work continues; no execution/startup watchdog, prolonged overload guarantee, full combined four-executor capacity proof, new accuracy score or total-CPU/throughput improvement is asserted. Indefinitely stuck slots, RSS/helper-thread costs and untested real shared-telemetry stress remain explicit residual risks. Earlier failed evidence and the historical new10 **2/5/3** remain unchanged.
