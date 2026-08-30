# Shadow Automation Resume Design

## Goal

Remove the stale LLM-health pause from dashboard automation while keeping all
automation in shadow mode and publication disabled.

## Current Evidence

The previous OOM incident occurred when the VM exposed about 8 GiB RAM and
Neo4j consumed about 4.4 GiB. The host now exposes 23 GiB RAM with 12-13 GiB
available and 0 of 4 GiB swap used. Neo4j uses about 5.6 GiB of its 10 GiB
container limit; OpenSPG server uses about 2.4 GiB of its 6 GiB limit.

Since the current boot:

- kernel logs contain no OOM event;
- Neo4j and OpenSPG server have zero restarts and no container OOM flag;
- Neo4j and OpenSPG server are healthy;
- an OpenSPG graph request returned HTTP 200;
- two consecutive manual LLM health checks passed;
- dashboard LLM health is `PASS` with zero consecutive failures.

These measurements identify the former VM memory shortage as the resolved root
cause. They do not justify restarting or right-sizing a healthy Neo4j instance.

## State Change

Use the authenticated dashboard API to update only these automation fields:

```json
{
  "paused": false,
  "shadowOnly": true,
  "publicationApproved": false
}
```

The request uses the dashboard's current authentication context and CSRF token
in memory. It must not print either value. The API must authorize the context
as admin. It clears the stale pause reason when `paused` becomes false.

The update does not trigger `/api/automation/run`, discovery, a builder, KB
ingestion, publication, or an OpenSPG application update. No service or
container restarts.

## Runtime Boundaries

- Keep `ERP_KB_AUTOMATION_SHADOW_ONLY=1` in the health service environment.
- Keep `publicationApproved=false`.
- Leave the active health timer and discovery timers unchanged.
- Do not change Neo4j heap, page cache, or container memory limits.
- Do not change OpenSPG server heap or container memory limits.
- Do not change the current OpenAI key.
- Preserve unrelated worktree changes.

## Verification

Before the update, record only non-secret automation fields and require:

- `enabled=true`;
- `paused=true`;
- pause reason category `llm-health`;
- `shadowOnly=true`;
- `llmHealth=PASS`;
- `consecutiveFailures=0`.

After the update, require:

- `enabled=true`;
- `paused=false`;
- empty pause reason;
- `shadowOnly=true`;
- `publicationApproved=false`;
- `llmHealth=PASS`;
- `consecutiveFailures=0`.

Also require the health timer to remain active and enabled, Neo4j and OpenSPG
server to remain healthy with unchanged container IDs, swap usage to remain
zero, and kernel OOM count to remain zero. Confirm that no automation run was
started by comparing job activity before and after the configuration update.

## Failure Handling

Stop without retrying if authentication, admin authorization, CSRF validation,
or the API state assertion fails. Do not force an automation run. If the API
accepts the update but the final state differs from the approved values, set
`paused=true` through the same authenticated API and report the mismatch.

## Rollback

Set `paused=true` through the authenticated dashboard API with a concise
operator pause reason. Keep `shadowOnly=true` and
`publicationApproved=false`. Rollback does not stop the health timer or alter
service memory settings.
