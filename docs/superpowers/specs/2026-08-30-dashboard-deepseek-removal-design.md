# Dashboard DeepSeek Removal Design

**Date:** 2026-08-30

## Goal

Remove DeepSeek from the active dashboard reviewer path and use the already
validated OpenAI `gpt-5.4-mini` model with the current key. Keep automation
enabled only in shadow mode and keep publication disabled.

## Confirmed Root Cause

OpenSPG applications `2` and `4` use `gpt-5.4-mini`, and the installed LLM
health service also checks `gpt-5.4-mini`. The dashboard process still reports
`deepseek-reasoner` because the installed, untracked systemd drop-in
`/etc/systemd/system/erp-kb-dashboard.service.d/llm-reviewer.conf` explicitly
sets that legacy model. The earlier rotation updated the OpenSPG applications
and reference health/discovery units but did not update this dashboard drop-in.

## Selected Approach

Create a tracked reference drop-in for the dashboard reviewer, install the same
content under `/etc/systemd/system`, reload systemd, and restart only
`erp-kb-dashboard.service`. The drop-in will preserve app ID `4`, session ID
`42`, the cookie path, and the allowed namespace while changing only the model
to `gpt-5.4-mini`.

Alternatives were rejected:

- `gpt-5.6-luna` passed a direct OpenAI probe but previously missed the
  integrated two-pass latency gate.
- Removing `OPENSPG_LLM_MODEL` entirely would make the effective model depend
  implicitly on application configuration and weaken runtime observability.

## Safety And Data Flow

Before changing runtime, capture the current dashboard drop-in and service
state, verify OpenAI direct connectivity, and verify application `4` uses the
same `gpt-5.4-mini` record and current key. Automation must remain
`enabled=true`, `paused=false`, `shadowOnly=true`, and
`publicationApproved=false`.

After installing the drop-in, the dashboard sends reviewer requests to OpenSPG
application `4` with `model=gpt-5.4-mini`. A controlled health service run then
checks the same application/model path. No automation run, discovery run,
builder job, ingestion, publication, or KB build is part of this change.

## DeepSeek Record Removal

List model records, deployed application assignments, installed service
environments, and repository configuration first. Delete the DeepSeek model
record only if no active application, service, or current configuration refers
to it. Historical draft metadata may continue to mention the model that created
those drafts and must not be rewritten.

If the record is still referenced outside historical metadata, leave it in
place and report the blocker instead of forcing deletion.

## Rollback

If the dashboard fails to restart, its API does not report
`gpt-5.4-mini`, the integrated health probe fails, or automation safety fields
change, restore the captured drop-in, reload systemd, restart the dashboard,
and verify the original service state. Do not delete any model record after a
failed switch.

## Verification

Success requires all of the following:

- dashboard service is active after a single controlled restart;
- dashboard API reports `llmModel=gpt-5.4-mini`;
- automation remains enabled, resumed, shadow-only, and publication-disabled;
- direct OpenAI probes for `gpt-5.4-mini` and `gpt-5.6-luna` return HTTP 200;
- integrated application `4` health check passes with zero consecutive failures;
- apps `2` and `4` use `gpt-5.4-mini` and their keys match the current key file;
- all four automation/discovery timers remain active and enabled;
- no active automation job appears because of this operation;
- draft counts and quality alerts are reviewed through dashboard APIs;
- repository checks and the model-rotation test pass;
- DeepSeek is absent from active configuration and, if unreferenced, from the
  model registry.
