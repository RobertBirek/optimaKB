# AppController Log Suppression Implementation Plan

> **HISTORICAL EXECUTION RECORD - DO NOT USE AS A RUNBOOK.** The class-level
> `LOGGING_LEVEL_...APPCONTROLLER` environment-variable configuration below is
> ineffective for case-sensitive class loggers. This record is superseded by
> `2026-08-29-appcontroller-class-logger-correction.md`. Operators must use the
> correction plan instead and must not execute this historical procedure.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop OpenSPG `AppController` from writing application request payloads to server logs.

**Architecture:** Add one exact Spring Boot logger override to the existing OpenSPG server environment in Compose. Recreate only the server container, then verify configuration, health, service isolation, timer state, and a read-only API request without printing response bodies or secrets.

**Tech Stack:** Docker Compose, Spring Boot logging configuration, Node.js, systemd.

## Global Constraints

- Set `LOGGING_LEVEL_COM_ANTGROUP_OPENSPGAPP_API_HTTP_SERVER_APP_APPCONTROLLER` to `OFF`.
- Change only `compose.yaml` and this implementation plan.
- Do not print API keys, application access tokens, session cookies, or API response bodies.
- Do not update an OpenSPG application or model configuration.
- Do not run discovery, builders, ingestion, KB builds, or re-vectorization.
- Recreate only `release-openspg-server`; do not recreate or restart MySQL, Neo4j, MinIO, or Tika.
- Keep `erp-kb-dashboard-llm-health.timer` inactive and enabled.
- Original requirement: preserve historical Docker logs and the current OpenAI
  key. The key remained unchanged, but the log-preservation requirement was
  not met and was explicitly waived by the user on 2026-08-29 after the loss
  was identified; see **Post-Implementation Retention Outcome** below.
- Preserve all unrelated worktree changes.

---

### Task 1: Suppress AppController Payload Logging

**Files:**
- Modify: `/docker/openspg/compose.yaml:135-139`
- Create: `/docker/openspg/docs/superpowers/plans/2026-08-29-appcontroller-log-suppression.md`

**Interfaces:**
- Consumes: Docker Compose `server.environment`, Spring Boot relaxed environment-variable binding, `/etc/erp-kb-openspg.cookie` for a read-only probe.
- Produces: a recreated healthy server with the exact `AppController` logger disabled.

- [x] **Step 1: Record isolation state without reading secrets**

Run:

```bash
docker inspect release-openspg-mysql release-openspg-neo4j release-openspg-minio openspg-tika \
  --format '{{.Name}} {{.Id}}' | sort
systemctl is-active erp-kb-dashboard-llm-health.timer
systemctl is-enabled erp-kb-dashboard-llm-health.timer
```

Expected: four container names and IDs; timer output is `inactive` followed by
`enabled`. Save the IDs in the task report for the post-deployment comparison.

- [x] **Step 2: Run the failing Compose assertion**

Run:

```bash
docker compose config --format json | node -e '
let raw = "";
process.stdin.on("data", chunk => raw += chunk).on("end", () => {
  const config = JSON.parse(raw);
  const value = config.services.server.environment.LOGGING_LEVEL_COM_ANTGROUP_OPENSPGAPP_API_HTTP_SERVER_APP_APPCONTROLLER;
  console.log(value ?? "missing");
  if (value !== "OFF") process.exitCode = 1;
});
'
```

Expected: FAIL with output `missing`.

- [x] **Step 3: Add the exact logger override**

Add this line immediately after the two existing OpenSPG package logger rules
in `compose.yaml`:

```yaml
      LOGGING_LEVEL_COM_ANTGROUP_OPENSPGAPP_API_HTTP_SERVER_APP_APPCONTROLLER: "OFF"
```

Do not change any other Compose field.

- [x] **Step 4: Run the Compose assertion again**

Run the command from Step 2.

Expected: PASS with output `OFF`.

Run:

```bash
docker compose config --quiet
```

Expected: exit code 0 and no output.

- [x] **Step 5: Recreate only the server container**

Run:

```bash
docker compose up -d --no-deps --force-recreate server
```

Expected: `release-openspg-server` is recreated and started; no other service
is recreated.

- [x] **Step 6: Wait for a condition-based health result**

Run:

```bash
for attempt in $(seq 1 60); do
  status=$(docker inspect release-openspg-server --format '{{.State.Health.Status}}')
  if [ "$status" = healthy ]; then
    printf 'healthy\n'
    break
  fi
  if [ "$status" = unhealthy ]; then
    printf 'unhealthy\n' >&2
    exit 1
  fi
  sleep 5
done
test "$(docker inspect release-openspg-server --format '{{.State.Health.Status}}')" = healthy
```

Expected: `healthy` within five minutes and final exit code 0.

- [x] **Step 7: Verify runtime logger configuration without dumping environment**

Run:

```bash
docker inspect release-openspg-server --format '{{range .Config.Env}}{{println .}}{{end}}' |
node -e '
let raw = "";
process.stdin.on("data", chunk => raw += chunk).on("end", () => {
  const expected = "LOGGING_LEVEL_COM_ANTGROUP_OPENSPGAPP_API_HTTP_SERVER_APP_APPCONTROLLER=OFF";
  const found = raw.split(/\r?\n/).includes(expected);
  console.log(found ? expected : "missing");
  if (!found) process.exitCode = 1;
});
'
```

Expected: the exact logger assignment and exit code 0. The command prints no
other environment variables.

- [x] **Step 8: Run a read-only API probe without printing its body**

Run:

```bash
marker=$(date --iso-8601=seconds)
node -e '
const fs = require("fs");
const cookie = fs.readFileSync("/etc/erp-kb-openspg.cookie", "utf8").trim();
fetch("http://10.10.254.42:8887/v1/app/4", { headers: { Cookie: cookie } })
  .then(response => {
    console.log(`status=${response.status}`);
    if (!response.ok) process.exitCode = 1;
  })
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
'
sleep 2
docker logs --since "$marker" release-openspg-server 2>&1 |
node -e '
let raw = "";
process.stdin.on("data", chunk => raw += chunk).on("end", () => {
  const count = raw.split(/\r?\n/).filter(line => line.includes("AppController")).length;
  console.log(`appControllerLines=${count}`);
  if (count !== 0) process.exitCode = 1;
});
'
```

Expected: `status=200` and `appControllerLines=0`. Do not print the response
body, cookie, or matching historical log lines.

- [x] **Step 9: Verify service isolation and project checks**

Run the container-ID command from Step 1 and compare all four IDs with the
recorded values. Expected: every ID is unchanged.

Run:

```bash
systemctl is-active erp-kb-dashboard-llm-health.timer || test $? -eq 3
systemctl is-enabled erp-kb-dashboard-llm-health.timer
docker compose ps
npm run check
git diff --check -- compose.yaml docs/superpowers/plans/2026-08-29-appcontroller-log-suppression.md
```

Expected: timer is `inactive` and `enabled`; all five Compose services are up
and healthy; syntax checks pass; diff check has no output.

- [x] **Step 10: Commit only the logger override and plan**

Run:

```bash
git add compose.yaml docs/superpowers/plans/2026-08-29-appcontroller-log-suppression.md
git diff --cached --check
git diff --cached --name-only
git commit -m "fix: suppress AppController request logging"
```

Expected staged names are exactly:

```text
compose.yaml
docs/superpowers/plans/2026-08-29-appcontroller-log-suppression.md
```

Expected commit subject: `fix: suppress AppController request logging`.

---

## Post-Implementation Retention Outcome

This section records an implementation outcome discovered after the original
plan was executed; it is not a change to what the plan originally intended.

The forced recreation in Step 5 removed the prior
`release-openspg-server` container and its Docker-managed log history. Six
known historical `AppController` lines therefore became unavailable through
`docker logs`. Docker provides no technical recovery for the removed
container's logs unless an independent backup or log collector retained them.

On 2026-08-29, the user explicitly accepted this irreversible loss, authorized
continuation, and waived the original historical-log preservation requirement.
The OpenAI key remained unchanged. The retention loss does not invalidate the
other completed runtime verification: the exact logger override remains
active, the server returned healthy, dependency container IDs remained
unchanged, the health timer remained inactive and enabled, and the read-only
probe added no `AppController` line.
