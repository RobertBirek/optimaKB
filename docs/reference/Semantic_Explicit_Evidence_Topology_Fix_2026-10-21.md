# Explicit evidence: actual bridge entrypoint

The failed rollout readiness probe (30 seconds, health without `rawExecution`)
targeted a service whose later `60`/`70` drop-ins override `ExecStart`. The reported
effective entrypoint is
`/opt/erp-kb-entity-guides/releases/optima-internal-assistant-20261020/bridge.mjs`.
That wrapper imports MAIN core/pool code but retains an older bridge, including
the deployed entity-guide proxy and excluding raw activation.

The topology fix brings the deployed guide helper unchanged into
`scripts/lib/entity_guide_text_proxy.mjs` (SHA256
`9dda86e0b7f4e3f213b3336a0bc6c6ec23b31f9a2037ae214a695476f8a670d9`),
preserves its initialization/early route in the MAIN bridge, and includes it in
the identical 44-file runtime captures. Synthetic guide/Operation and raw-worker
isolation checks are in `scripts/test_entity_guide_proxy_rollout.mjs`.

## Operator action after the independent review gate

1. Integrate the reviewed fix into MAIN. Compile and independently verify a
   **fresh `/docker/openspg`-root generation**, then provision a new immutable
   five-file release and matching trusted binding. Earlier bindings and the
   temporary-worktree capture are not valid substitutes.
2. Add `/etc/systemd/system/erp-kb-mcp.service.d/80-main-bridge.conf`:

   ```ini
   [Service]
   ExecStart=
   ExecStart=/usr/bin/node /docker/openspg/scripts/erp_knowledge_mcp_http_bridge.mjs
   ```

   Keep the existing `70` drop-in and its
   `ERP_KB_ENTITY_GUIDE_PROXY_CONFIG` Environment assignment exactly as installed;
   retain all existing environment settings. Point `ERP_KB_RAW_BINDING_FILE` at
   the freshly provisioned binding under the approved rollout plan. Preserve
   the old `/opt/erp-kb-entity-guides/releases/` files and prior raw releases for
   rollback.
3. Reload systemd, restart the services specified in the rollout plan, and check
   the **effective** `ExecStart` now selects the MAIN bridge. Require health
   `rawExecution.configured === true`, unauthenticated denial, authenticated
   discovery/evidence/snapshot/parity/budget checks, existing semantic metadata,
   and the preserved guide/Operation path. A timeout or missing health field is
   a failed activation, not successful deployment.

Implementation evidence and limitations:
`.superpowers/sdd/topology-fix-report.md`. This note records required operator
actions; the bounded topology repair does not itself change live services.
