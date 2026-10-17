# Semantic CPU isolation — deployed and measured

**Deployment independently accepted for the bounded workload, with documented replay-method deviation and residual risks.** Measured evidence cutoff remains **2026-10-17 13:15:55 UTC**; this final report revision adds the independent disposition without new runtime measurements.

## Independent disposition and revision boundary

Independent `cpu-operational-review.md` gives **spec/contract PASS WITH DOCUMENTED REPLAY-METHOD DEVIATION** and **quality/operational PASS WITH RESIDUAL RISKS**. No current Critical or Important blocker was established for this finite operation. Historical HTTP availability **I1 is CLOSED ONLY for the tested four attached-call burst and original32 public protocol replay**. Earlier failures remain valid history; neither the exact earlier socket-closing component nor an unrestricted availability guarantee is established. The separately numbered malformed-request pool-poisoning source I1 was already corrected and closed in the approved source review.

The accepted method distinction is explicit: **four actual attached SemanticKB burst calls plus 32 direct public authenticated MCP protocol calls**. The 32-call replay is a documented deviation from the literal attached-tool replay requirement, accepted because it exercises the same public route/profile/configured authentication boundary and retains complete protocol/body/source parity. It does not establish 32 native attached-tool states.

One byte-exact archived copy of the operational review, SHA-256 `4a86f220fab5246dc5d01a7d3c853ca528666c83c5d13b98c5e614335e26ddee`, is under:

`backups/manual-repairs/semantic-cpu-block-20261017/final-report-revision-20261017T133609Z/review/cpu-operational-review.md`

The new revision child contains all previous public versions, the source/durable report prefixes and old seals in `before/`, plus its own archive and final manifests. The original operation's **715 sealed entries remain unchanged**; its publication seal binds the previous report version, while the revision's `final-manifest.json` binds this current version and the append-only source/durable report.

`coordinator-metadata-receipt.json` is **coordinator-supplied, unscored metadata**, not new performance evidence: central **787565**, start **2026-10-17 15:04:45 CEST**; dedicated **788778**, start **15:06:24 CEST**; both active/running/exit0. Supplied public health is `ok:true`, semantic `available:true`, workers **2**, active/queued **0/0**, limits **2/8**, reason `null`; supplied default TLS verification and Git diff check passed, and main commit `f23796f` equals remote. No request, service action, test/load or source/index change was performed for this documentation finalization.

## Release and controlled reload

Transferred all **17 exact paths** from independently approved tree `716d9edf05fa476b17bc573e4998a5feebc82156`, against base `f23796f4ea75b66b61163490d7fbb441f53be100`, using native `apply_patch`. The controller corrected the historical 16-file count; the seventeenth file is the reviewed request-error regression. Initial BLOCKED reports are archived byte-exact under this operation's `history/` directory.

All candidate bytes and the **26-file / 459,817-byte** runtime closure match at the destination and are readable by `mcpbot`. The adjacent JSON gives every transferred file's SHA-256. Portable release digest: `abdd0723069a9396aa77419790b4eff3f6d6383ec8e590dfa4400c6ce34c2730`.

The destination **path-bound** generation is `f96136454717ac8d70ba5c579f32b77ea1dbfbec46688388a99418b7fc6d856c`; the source-worktree generation is `6eee1a419e7895d7d62a9ee7de431625b405521fa44fe9dd23cd42469ffe89c1`. Their difference is expected. Portable file hashes establish transferred release identity. Successful real worker results establish passage through the locally enforced parent/worker ready-generation handshake; health itself does not expose the digest.

| Order | Service | Old → new PID | New start, UTC | Result |
|---|---|---|---|---|
| 1 | `erp-kb-mcp.service` | 576677 → **787565** | 13:04:45 | active/running, exit status 0; local health, public TLS, seven profiles and semantic smoke passed |
| 2 | `erp-semantic-mcp.service` | 577468 → **788778** | 13:06:24 | active/running, exit status 0; dedicated local/public readbacks passed |

Dedicated restart followed successful central acceptance. No other service was restarted; nine unrelated listener PIDs match the earlier observation. Public TLS verification returned **0**. All **seven canonical read-only profile** manifests passed before/after reload and at final readback. Six profiles are attached in the current client configuration; the seventh canonical route, InsERT GT technical, was explicitly checked. An early helper's six-client/seven-route enumeration assertion is retained as a harness issue, not a production failure or a configuration change.

## Resource fit and tests

Both running binaries resolve to `/usr/bin/node`, **Node 18.19.1**. Preflight found **3,701,051,392 bytes available**, exceeding two retained fixture process footprints (**693,010,432 bytes**) plus a **1 GiB reserve**. Service and parent-slice MemoryMax/MemoryHigh are unlimited; TasksMax is **28,738 per service**, with 12 available processors. No quota or configuration was adjusted.

- Fresh main `npm run check`, module-map validation and 16 explicit `.mjs` syntax checks: **PASS**.
- Fresh disposable/synthetic CPU, reuse, pool, generation and actual-core request-error controls: **44 pass / 0 fail / 0 skip**.
- Retained full gate: **1066 pass / 0 fail / 0 skip**, freshly rebound to **67 current files, 30 log hashes, 156 artifacts and 37 raw replies**. This is **not a fresh broad rerun**.
- Production read-only guard remains forced to `allowAutoDraft:false`; configured **autoDraft=1 / provider=api** remain unchanged. Retained authorization proof contains 151 checks, 144 read-only calls, zero draft attempts/guard violations; fresh actual-core controls also exercise this boundary.

## Measured availability and resource cost

See [the acceptance report](Semantic_CPU_Block_Acceptance_2026-10-17.md) for call/probe distributions and original32 parity. The attached four-method burst passed **4/4** with two active executors and two queued requests observed. During its actual active interval, public health passed **9/9**, p95/max **26.235 ms**, and metadata **3/3**, p95/max **15.918 ms**. The server-observed burst span was **7.317 s**, calculated from earliest arrival to maximum completion, not array order.

During a **7.223 s sampled active interval**, central CPU increased by **16.310 CPU-seconds**, RSS sampled at most **256,626,688 bytes (~244.7 MiB)**, and OS thread count reached **21**. Dedicated sampled RSS in that interval was at most **145,350,656 bytes**, with **17 threads** and one allocated executor. These are process-wide samples, not continuous hard peaks or per-worker caps. Two executor slots are not two total Node/V8/libuv/loader threads.

Supplemental dedicated local readbacks measured **3895.869 ms cold** and **2776.909 ms warm** for Q01. The warm interval's dedicated cgroup CPU delta was **3941.196 ms**, including small measurement overhead. These are separately labelled HTTP diagnostics. Exact production queue/startup/handler decomposition is not exposed by the unchanged bridge; server request times include all of them. Private retained fixture timings separately measure startup, queue and handler costs, including a **4395.838 ms** queue wait.

The retained diagnosis measured about **16.099 s handler wall time**, then **3.472 s** after the pure optimizations, still synchronous. Isolation addresses HTTP event-loop availability while semantic CPU work continues. Those private single-request observations, private burst CPU, and production four-request process CPU are different workloads: **no total-CPU reduction ratio or sustained throughput improvement is claimed**. Idle/public timing variation also includes TLS/network jitter.

## Preservation, recovery and evidence

Pre/post hashes match for **966 raw files, 664 inbox files including registry/promoted content, 175 CSV/manifests, two policy files, both service environment/unit configurations, both indexes and all eight unrelated modified generated reports**. Dashboard automation configuration is unchanged. Ordinary MCP/audit/learning telemetry was allowed and is not claimed unchanged. No ERP/graph/export/build, proxy, policy, timer, Docker, environment, stage, commit, push or delegation operation occurred. The independent new10 bank was not accessed or replayed; its historical **2/5/3** is unchanged.

Private operation root:

`backups/manual-repairs/semantic-cpu-block-20261017/operation-20261017T123800Z/`

It retains originals, 12 new-file absence records, candidate bytes, exact reviews, old outputs, profiles, command logs, full original32 responses, attached burst Markdown, probes/resources and seals. `final-evidence.json` SHA-256: `c6e93891eab77b25d82fbf213a956f9ffe4b452ff4e12bc646375e70f9d82d94`. All 32 request/response/Markdown/source-audit hashes and actual dates/correlations are in `parity32.responses`; complete captures are in `connected/parity32/`.

No rollback was needed. `rollback-proof.json` verifies five original files, 12 absences and a 27-file reconstructed baseline import closure. A hash-bound native restoration patch is retained. Any future authorized rollback must hash-check current candidate files, restore only these paths, verify closure/readability, then reload **both services central → dedicated**, repeating health/TLS/profile/smoke gates. The baseline predates worker-generation IDs; a portable original closure is used instead of inventing one.

**Residual risks:** no startup/execution watchdog; indefinite executor occupation remains possible; queue bounds do not guarantee latency; RSS/helper threads and combined-host contention remain relevant; concurrent real telemetry behavior was not stress-tested. No public saturation/crash/malformed test was performed. Historical availability I1 is independently closed only for the demonstrated four attached calls and 32 public protocol replays. This establishes neither sustained arbitrary throughput, full simultaneous capacity of both pools, stuck-job recovery nor absence of all future socket errors. The old failed history remains intact.
