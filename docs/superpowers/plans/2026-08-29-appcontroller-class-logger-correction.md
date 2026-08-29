# AppController Class Logger Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ineffective lowercased environment-variable logger override with a case-preserving Spring Boot JSON configuration and prove suppression on the vulnerable controller path.

**Architecture:** Use `SPRING_APPLICATION_JSON` to preserve the uppercase letters in the exact `AppController` class name. Demonstrate the existing failure with a credential-free request to negative application ID `-1`, recreate only the server, then repeat the same request and require zero controller logger-header lines.

**Tech Stack:** Docker Compose, Spring Boot 2.7.8, Node.js, systemd.

## Global Constraints

- Set `logging.level.com.antgroup.openspgapp.api.http.server.app.AppController` to `OFF` through `SPRING_APPLICATION_JSON`.
- Remove `LOGGING_LEVEL_COM_ANTGROUP_OPENSPGAPP_API_HTTP_SERVER_APP_APPCONTROLLER`.
- The controlled request must use `PUT /v1/app/-1` with body `{}` and must not print its response body.
- Do not print API keys, application access tokens, session cookies, environment dumps, or matching log lines.
- Do not update an existing OpenSPG application or model configuration.
- Do not run discovery, builders, ingestion, KB builds, or re-vectorization.
- Recreate only `release-openspg-server`; do not recreate or restart MySQL, Neo4j, MinIO, or Tika.
- Keep `erp-kb-dashboard-llm-health.timer` inactive and enabled.
- Preserve the current OpenAI key.
- The user accepted loss of the current server container's Docker-managed logs during the approved recreation.
- Preserve all unrelated worktree changes.

---

### Task 1: Correct And Prove The Class Logger Override

**Files:**
- Modify: `/docker/openspg/compose.yaml:135-139`
- Modify: `/docker/openspg/docs/superpowers/plans/2026-08-29-appcontroller-log-suppression.md`
- Create: `/docker/openspg/docs/superpowers/plans/2026-08-29-appcontroller-class-logger-correction.md`

**Interfaces:**
- Consumes: Spring Boot `SPRING_APPLICATION_JSON`, the authenticated app API, and Docker log timestamps.
- Produces: a healthy server whose exact case-sensitive `AppController` logger is `OFF`, with RED/GREEN evidence from the same benign controller request.

- [x] **Step 1: Record isolation and timer state**

Run:

```bash
docker inspect release-openspg-mysql release-openspg-neo4j release-openspg-minio openspg-tika \
  --format '{{.Name}} {{.Id}}' | sort
systemctl is-active erp-kb-dashboard-llm-health.timer || test $? -eq 3
systemctl is-enabled erp-kb-dashboard-llm-health.timer
```

Expected: four container IDs; timer output is `inactive` then `enabled`. Record
the IDs in the task report.

- [x] **Step 2: Prove the current configuration uses the unsupported form**

Run:

```bash
docker compose config --format json | node -e '
let raw = "";
process.stdin.on("data", chunk => raw += chunk).on("end", () => {
  const env = JSON.parse(raw).services.server.environment;
  const oldValue = env.LOGGING_LEVEL_COM_ANTGROUP_OPENSPGAPP_API_HTTP_SERVER_APP_APPCONTROLLER;
  const jsonValue = env.SPRING_APPLICATION_JSON;
  console.log(JSON.stringify({ oldValue: oldValue ?? null, springApplicationJsonPresent: jsonValue !== undefined }));
  if (oldValue !== "OFF" || jsonValue !== undefined) process.exitCode = 1;
});
'
```

Expected: PASS with:

```json
{"oldValue":"OFF","springApplicationJsonPresent":false}
```

- [x] **Step 3: Run the RED controller-path reproduction**

Run:

```bash
marker=$(date --iso-8601=seconds)
node -e '
const fs = require("fs");
const cookie = fs.readFileSync("/etc/erp-kb-openspg.cookie", "utf8").trim();
fetch("http://10.10.254.42:8887/v1/app/-1", {
  method: "PUT",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: "{}",
}).then(response => {
  console.log(`status=${response.status}`);
}).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
'
sleep 2
docker logs --since "$marker" release-openspg-server 2>&1 |
node -e '
let raw = "";
process.stdin.on("data", chunk => raw += chunk).on("end", () => {
  const configuredLoggerPattern = String.raw`(?:com|c)\.(?:antgroup|a)\.(?:openspgapp|o)\.(?:api|a)\.(?:http|h)\.(?:server|s)\.(?:app|a)\.AppController`;
  const stackFramePattern = /^\s*at\s+com\.antgroup\.openspgapp\.api\.http\.server\.app\.AppController(?:[.$])/;
  const loggerHeaderPattern = new RegExp(`(?:^|\\s)${configuredLoggerPattern}\\s*:`);
  const matching = raw.split(/\r?\n/).filter(line => line.includes("AppController"));
  const result = {
    matchingCount: matching.length,
    stackFrames: matching.filter(line => stackFramePattern.test(line)).length,
    loggerHeaders: matching.filter(line => loggerHeaderPattern.test(line)).length,
  };
  console.log(JSON.stringify(result));
  if (result.loggerHeaders < 1) process.exitCode = 1;
});
'
```

Expected: the request returns an HTTP status without printing a response body,
and `loggerHeaders` is at least 1. Do not print matching lines. The original
RED run used the broader substring count and returned `appControllerLines=3`.
Its removed container logs are unavailable, so the precise RED classifier
cannot be rerun against that historical evidence.

- [x] **Step 4: Replace the ineffective override**

Replace:

```yaml
      LOGGING_LEVEL_COM_ANTGROUP_OPENSPGAPP_API_HTTP_SERVER_APP_APPCONTROLLER: "OFF"
```

with:

```yaml
      SPRING_APPLICATION_JSON: '{"logging.level.com.antgroup.openspgapp.api.http.server.app.AppController":"OFF"}'
```

Do not change another Compose field.

- [x] **Step 5: Validate the exact case-preserving JSON**

Run:

```bash
docker compose config --format json | node -e '
let raw = "";
process.stdin.on("data", chunk => raw += chunk).on("end", () => {
  const env = JSON.parse(raw).services.server.environment;
  const settings = JSON.parse(env.SPRING_APPLICATION_JSON);
  const key = "logging.level.com.antgroup.openspgapp.api.http.server.app.AppController";
  const result = {
    exactClassLevel: settings[key] ?? null,
    legacyPresent: env.LOGGING_LEVEL_COM_ANTGROUP_OPENSPGAPP_API_HTTP_SERVER_APP_APPCONTROLLER !== undefined,
  };
  console.log(JSON.stringify(result));
  if (result.exactClassLevel !== "OFF" || result.legacyPresent) process.exitCode = 1;
});
'
docker compose config --quiet
```

Expected:

```json
{"exactClassLevel":"OFF","legacyPresent":false}
```

`docker compose config --quiet` exits 0 with no output.

- [x] **Step 6: Recreate only the server and wait for health**

Run:

```bash
docker compose up -d --no-deps --force-recreate server
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

Expected: only `release-openspg-server` is recreated and it reaches `healthy`
within five minutes.

- [x] **Step 7: Verify runtime JSON without dumping environment**

Run:

```bash
docker inspect release-openspg-server --format '{{range .Config.Env}}{{println .}}{{end}}' |
node -e '
let raw = "";
process.stdin.on("data", chunk => raw += chunk).on("end", () => {
  const prefix = "SPRING_APPLICATION_JSON=";
  const line = raw.split(/\r?\n/).find(value => value.startsWith(prefix));
  const settings = line ? JSON.parse(line.slice(prefix.length)) : {};
  const key = "logging.level.com.antgroup.openspgapp.api.http.server.app.AppController";
  const result = { exactClassLevel: settings[key] ?? null };
  console.log(JSON.stringify(result));
  if (result.exactClassLevel !== "OFF") process.exitCode = 1;
});
'
```

Expected: `{"exactClassLevel":"OFF"}` and no unrelated environment output.

- [x] **Step 8: Run the GREEN controller-path verification**

Run:

```bash
marker=$(date --iso-8601=seconds)
node -e '
const fs = require("fs");
const cookie = fs.readFileSync("/etc/erp-kb-openspg.cookie", "utf8").trim();
fetch("http://10.10.254.42:8887/v1/app/-1", {
  method: "PUT",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: "{}",
}).then(response => {
  console.log(`status=${response.status}`);
}).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
'
sleep 2
docker logs --since "$marker" release-openspg-server 2>&1 |
node -e '
let raw = "";
process.stdin.on("data", chunk => raw += chunk).on("end", () => {
  const configuredLoggerPattern = String.raw`(?:com|c)\.(?:antgroup|a)\.(?:openspgapp|o)\.(?:api|a)\.(?:http|h)\.(?:server|s)\.(?:app|a)\.AppController`;
  const stackFramePattern = /^\s*at\s+com\.antgroup\.openspgapp\.api\.http\.server\.app\.AppController(?:[.$])/;
  const loggerHeaderPattern = new RegExp(`(?:^|\\s)${configuredLoggerPattern}\\s*:`);
  const matching = raw.split(/\r?\n/).filter(line => line.includes("AppController"));
  const result = {
    matchingCount: matching.length,
    stackFrames: matching.filter(line => stackFramePattern.test(line)).length,
    loggerHeaders: matching.filter(line => loggerHeaderPattern.test(line)).length,
  };
  console.log(JSON.stringify(result));
  if (result.loggerHeaders !== 0) process.exitCode = 1;
});
'
```

Expected: the request returns an HTTP status without printing its body and
the classifier returns `loggerHeaders=0`. Stack frames do not fail the GREEN
gate because they are emitted by another logger and do not contain the request
payload logged by the configured class logger.

- [x] **Step 9: Verify isolation, timer, and project checks**

Run the container-ID command from Step 1. Expected: all four IDs match the
recorded values.

Run:

```bash
systemctl is-active erp-kb-dashboard-llm-health.timer || test $? -eq 3
systemctl is-enabled erp-kb-dashboard-llm-health.timer
docker compose ps
npm run check
git diff --check -- compose.yaml docs/superpowers/plans/2026-08-29-appcontroller-log-suppression.md docs/superpowers/plans/2026-08-29-appcontroller-class-logger-correction.md
```

Expected: timer is `inactive` and `enabled`; server, MySQL, Neo4j, and MinIO
are healthy; Tika is up; syntax and diff checks pass.

- [x] **Step 10: Mark the original execution record complete**

In `docs/superpowers/plans/2026-08-29-appcontroller-log-suppression.md`, replace
each of its ten task checkbox markers from `- [ ]` to `- [x]`. Do not change
the task text or post-implementation outcome.

- [x] **Step 11: Commit only the correction**

Run:

```bash
git add compose.yaml docs/superpowers/plans/2026-08-29-appcontroller-log-suppression.md docs/superpowers/plans/2026-08-29-appcontroller-class-logger-correction.md
git diff --cached --check
git diff --cached --name-only
git commit -m "fix: use case-preserving AppController logger config"
```

Expected staged names are exactly:

```text
compose.yaml
docs/superpowers/plans/2026-08-29-appcontroller-class-logger-correction.md
docs/superpowers/plans/2026-08-29-appcontroller-log-suppression.md
```

---

## Post-Implementation Test Refinement

The original RED and GREEN commands counted every line containing
`AppController`. The original broad RED result was `appControllerLines=3`; the
broad GREEN result after the corrected runtime was `appControllerLines=2`.
The one-line decrease is consistent with suppression of the logger-header line,
but the removed RED container's Docker-managed logs are unavailable, so a
precise historical RED header count cannot be rerun or claimed.

The post-fix classifier separates logger headers from Java stack frames without
printing either. Its observed GREEN result was:

```json
{"matchingCount":2,"stackFrames":2,"loggerHeaders":0}
```

On 2026-08-29, the user explicitly approved `loggerHeaders === 0` as the precise
GREEN criterion and approved ignoring stack frames for this assertion. The
corrected server runtime was reused; no additional service recreation or
restart was performed for this refinement.
