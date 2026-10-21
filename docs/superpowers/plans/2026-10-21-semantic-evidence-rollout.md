# Explicit evidence main rollout

The user now explicitly requests commit, push to main and deployment. This supersedes the prior no-commit/no-deploy scope for the reviewed PoC; it does not turn raw-record delivery into semantic answer certification.

## Activation of the approved controller/executor contract

- Preserve existing default/public profile enumeration and old four-method endpoints. Opt in to an additional `/mcp/erp-semantic-evidence-poc` path only when an operator supplies `ERP_KB_RAW_BINDING_FILE`.
- A new small `semantic_raw_deployment.mjs` helper reads a bounded root/operator configuration file containing only `{trusted,code}`, validates the closed descriptor and exact captured runtime/environment binding, and constructs the already reviewed raw pool with constructor options. It reads no domain files before authorization. A dedicated raw pool has the approved 2-worker/8-queued limits; it does not change legacy pools or run legacy jobs inside the raw filesystem guard.
- Bridge keeps its legacy pool and dispatches only the opted-in raw profile to the raw pool and existing strict adapter. User-key `kb.semantic.read` continues to authorize the new path. An explicit operator flag `ERP_KB_RAW_ALLOW_READ_TOKEN=1` additionally maps the existing read transport token to this read-only semantic scope for this new path only; no editorial grant or new credential. Default off. Tokens never enter binding files, reports, Git or worker data.
- Include every new runtime module in all three explicit code inventories; source closure/environment/hash checks remain unchanged. Recompile for the final `/docker/openspg` source URL root after main integration; never deploy the temporary-worktree generation under a new label.
- Offline compiler stages in a unique `/tmp/opencode` root. Copy only its five known original-byte data files to a new immutable `/var/lib/erp-kb-raw/releases/<snapshot>/` directory. Configuration and release parents root-owned; mcpbot group-readable, not service-writable. Independently verify final paths as the service user before activation. Binding JSON and config live outside Git.
- Activate environment through a service drop-in for `erp-kb-mcp.service`; restart this service and `erp-semantic-mcp.service` after the reviewed main update. Existing proxy forwards the new suffix without changing public profile enumeration. Keep prior configuration/release for rollback.

## Execution

1. TDD activation helper/bridge opt-in wiring, strict malformed/mismatched configuration refusal, no pre-auth artifact reads, token scope mapping only with explicit flag, unchanged legacy profiles. Fix offline CLI M1 exit-code issue as needed for automated gating with a focused test.
2. Run affected MCP/worker/HTTP/profile/protocol tests and code closure capture checks. Fresh independent spec/quality review; fix Important findings before proceeding.
3. Inspect status/diff/recent commits; stage only reviewed implementation/tests/docs, never scratch captures or timer reports. Commit in isolated worktree. Fast-forward main preserving unrelated dirty reports. Include the approved normative documents explicitly in a documentation commit if still untracked. Push main without force.
4. Compile and independently verify a fresh main-root generation. Provision durable five-file release and trusted binding; set operator flags and restart the relevant services.
5. Probe unauthenticated denial, authenticated initialize/tools/list, actual discovery then evidence/snapshot/parity/budget on the new public path, and both existing Semantic metadata/health endpoints. Use configured token only inside a local probe process; never print/store it. Record deployed commit, snapshot and statuses, not secrets.

Failure handling: do not report deployment success if the new raw path remains unprovisioned/inaccessible. Restore prior service drop-in/config and restart on failed readiness; preserve commits, logs and unrelated main changes. No forced push/reset or operational-data cleanup.
