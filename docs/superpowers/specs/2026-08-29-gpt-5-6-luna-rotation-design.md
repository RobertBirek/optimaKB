# GPT-5.6 Luna Rotation Design

## Goal

Use `gpt-5.6-luna` for every active OpenSPG generative-model assignment while
keeping `gpt-5.4-mini` as an unused rollback model.

## Current State

- The OpenAI account exposes `gpt-5.6-luna`; `GET /v1/models/gpt-5.6-luna`
  returned HTTP 200 on 2026-08-29.
- OpenSPG stores `gpt-5.4-mini` and `text-embedding-3-small` as public model
  records.
- Applications `2` and `4` use `gpt-5.4-mini`. Application `5` has no LLM
  assignment and stays unchanged.
- Dashboard health and discovery units use application `4`, session `57`, and
  `gpt-5.4-mini`.
- The health timer runs every 15 minutes. Recent probes include two passes and
  one timeout, so one successful probe cannot establish stability.
- The worktree contains unrelated Canary Readiness report changes. The model
  rotation must preserve them without staging or editing them.

## Architecture

Create a second OpenSPG chat-model record for `gpt-5.6-luna`. Keep the current
`gpt-5.4-mini` record unchanged. Update applications and service configuration
only after a direct OpenAI chat request confirms access to Luna.

Use the authenticated OpenSPG APIs documented by the installed server:

- `POST /v1/model` to create the Luna model record
- `PUT /v1/app/{appid}` to change application configuration
- `POST /v1/app/deploy` to deploy applications `2` and `4`
- `GET /v1/model/list/` and `GET /v1/app/{appid}` for verification

Do not write directly to OpenSPG MySQL tables.

## Cutover Flow

1. Capture non-secret snapshots of the model registry and applications `2` and
   `4`.
2. Stop the health timer without disabling it. Discovery timers remain enabled,
   but no discovery job may run as part of this rotation.
3. Read the OpenAI key from `/etc/openspg-openai.key` inside the provisioning
   process. Do not print, persist, or pass it as a command-line argument.
4. Send a minimal direct chat request to `gpt-5.6-luna`.
5. Create a public OpenSPG chat-model record named `OpenAI GPT-5.6 Luna` with:
   - provider: `OpenAI`
   - visibility: `PUBLIC_READ`
   - model: `gpt-5.6-luna`
   - model type: `chat`
   - config type: `maas`
   - base URL: `https://api.openai.com/v1`
6. Preserve the Luna record's generated `instance_id` and full `modelId` when
   assigning it to applications.
7. Update only `config.llm` in applications `2` and `4`. Preserve each app's
   name, description, logo, alias, `config.kb`, `config.chat`, and
   `config.language`.
8. Deploy both applications. Session `57` remains valid because it belongs to
   application `4`, not to a specific model record.
9. Change active dashboard systemd reference files and
   `ERP_KB_Dashboard.env.example` to `gpt-5.6-luna`. Install the three validated
   service files and reload systemd.
10. Append the result to `OpenSPG_KB_Operational_Memory.md`. Keep the previous
    rotation spec and plan as historical records.
11. Run validation, then restart the health timer.

## Validation

The cutover succeeds only when all checks pass:

- the registry contains both chat records, with Luna selected by active apps
- applications `2` and `4` reference the Luna `modelId`
- `text-embedding-3-small` keeps its existing record, model ID, and 1536
  dimensions
- installed health, daily discovery, and weekly discovery units name
  `gpt-5.6-luna`
- a direct Luna chat request returns HTTP 200
- two consecutive application `4` health checks return `PASS`
- each health result reports latency below 90000 ms
- fresh OpenSPG and systemd logs contain no API-key pattern, authorization
  header, full `pipeline_config`, or raw solver argument object
- `docker compose config --quiet`, dashboard syntax checks, patch tests, and
  `systemd-analyze verify` pass

No validation step may submit a builder job, run discovery, rebuild a KB, or
re-vectorize data.

## Rollback

If model creation, app deployment, or either health probe fails:

1. Restore the captured `config.llm` objects for applications `2` and `4`.
2. Deploy both restored applications.
3. Restore `gpt-5.4-mini` in the active systemd files, install them, and reload
   systemd.
4. Run one rollback health check.
5. Restart the health timer.
6. Remove the failed Luna record only after no application references it.

The successful cutover leaves `gpt-5.4-mini` in the registry as an unused
fallback. It does not leave active application or systemd references to that
model.

## Secret Handling

- Never print OpenAI keys, application access tokens, or session cookies.
- Read secrets from the existing root-owned files inside the process that sends
  the request.
- Keep `/etc/openspg-openai.key` and `/etc/erp-kb-openspg.cookie` out of Git.
- Scan staged changes and fresh runtime logs before commit.
