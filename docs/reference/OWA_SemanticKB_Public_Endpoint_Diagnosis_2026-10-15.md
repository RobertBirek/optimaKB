# SemanticKB public endpoint diagnosis — confirmed

**Cause: the public semantic path is handled by the old central dispatcher on 3400, not the restarted dedicated service on 3420.** Read-only diagnosis completed 2026-10-15T20:03:08.726Z.

- During the public Q01 request, TCP metadata showed `10.10.254.42:3400 → 10.10.254.46:59342`; contemporaneous socket metadata tied that connection to **PID 2880869, erp-kb-mcp.service**, started **2026-10-14 14:45:46 CEST**. No 3420 packets appeared in that capture window.
- Public `initialize` reports `erp-semantic-mcp`. On the same central listener, `/mcp` reports legacy `erp-knowledge-assistant`, while `/mcp/erp-semantic-mcp` reports `erp-semantic-mcp`. Bridge lines 19–21 and 404–405 implement this dynamic path profile; the declared dedicated port is not a forwarding instruction.
- Public, direct 3400 semantic-path and auth-proxy 3401 answers have identical full Markdown SHA-256: `de6ccae75c788ab053d557baf28a0d4ef791e57c584e7cdce708827899521e37`. They lack `owaCoverage` and route Q01 to BusinessSemantics. Full RPC bytes differ **only in structured evidence observation timestamps**; validated timestamp-only normalization yields identical results. No substantive proxy content rewrite was found.
- Both 3420 paths return OWA-primary, `owaCoverage.status=covered`, full Markdown SHA-256 `1d34189ce23148bf247de8e45842b9101064e53eb2b6592243361eed9d033399`, identical to reviewed offline Q01. Dedicated PID **3750833** started **2026-10-15 21:49:09 CEST**.

The central process predates source integration and statically imported the shared answer chain. Its old imported behavior is the supported cause. No process-memory hash or remote effective NPM configuration was obtained; the observed route is proven for this request window, not every possible backend replica.

## Minimum proposed correction — not executed

**New scope required: YES — permit restarting only `erp-kb-mcp.service`.** After checking reviewed disk hashes and current metadata, the minimum action is `sudo -n systemctl restart erp-kb-mcp.service`, followed by central PID/start/health, public Q01 and a new unchanged connected live12 capture. This affects the central dispatcher serving multiple public profiles. No reverse-proxy/configuration edit, route migration or restart of other units is indicated by this diagnosis.

All three investigated units retained their PID/start/state. Runtime code, corpus, registry, CSV and indexes were preserved. The FAILED live12 snapshot remains **0 PASS / 4 PARTIAL / 8 MISS**, unchanged; these diagnostic calls are unscored. Ordinary request telemetry was allowed. Authentication values were used only in memory; retained headers and configuration fields are allowlisted.

Full sanitized evidence, RPC/Markdown, timestamp-only comparison, socket/packet metadata, source hashes and initialize identities: `/docker/openspg/backups/manual-repairs/owa-answer-quality-20261015/topology-readonly`. Companion: `OWA_SemanticKB_Public_Endpoint_Diagnosis_2026-10-15.json`.
