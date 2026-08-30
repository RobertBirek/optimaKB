# Shadow Automation Resume Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clear the stale LLM-health pause while keeping dashboard automation in shadow mode with publication disabled.

**Architecture:** Use one authenticated dashboard API transaction that reads the current state and CSRF token, applies the approved three-field patch, verifies the final state and job activity, and restores `paused=true` if verification fails. Do not change service memory or restart any container.

**Tech Stack:** Node.js, dashboard HTTP API, Docker, systemd, Linux memory diagnostics.

## Global Constraints

- Set only `paused=false`, `shadowOnly=true`, and `publicationApproved=false` through `/api/automation/config`.
- Do not call `/api/automation/run` or trigger a discovery, builder, ingestion, KB build, publication, or OpenSPG application update.
- Do not print dashboard credentials, authorization headers, CSRF tokens, cookies, API keys, or full API responses.
- Do not restart a service or container.
- Do not change Neo4j heap, page cache, or container memory limits.
- Do not change OpenSPG server heap or container memory limits.
- Keep the health timer and existing discovery timers active and enabled.
- Preserve the current OpenAI key and all unrelated worktree changes.
- If final automation state differs from the approved values, restore `paused=true` through the same API before reporting failure.

---

### Task 1: Resume Shadow Automation

**Files:**
- Create: `/docker/openspg/docs/superpowers/plans/2026-08-30-shadow-automation-resume.md`

**Interfaces:**
- Consumes: dashboard `/api/status`, `/api/automation`, and `/api/automation/config` endpoints; `/etc/erp-kb-dashboard.env` for in-memory authentication.
- Produces: dashboard automation with `paused=false`, `shadowOnly=true`, and `publicationApproved=false`, without starting a job.

- [x] **Step 1: Record infrastructure baseline**

Run:

```bash
free -h
swapon --show --bytes
docker inspect release-openspg-neo4j release-openspg-server \
  --format '{{.Name}} {{.Id}} restart={{.RestartCount}} oom={{.State.OOMKilled}} health={{.State.Health.Status}}'
for timer in \
  erp-kb-dashboard-llm-health.timer \
  erp-kb-discovery-autodraft.timer \
  erp-kb-dashboard-discovery-daily.timer \
  erp-kb-dashboard-discovery-weekly.timer
do
  active="$(systemctl is-active "$timer")"
  enabled="$(systemctl is-enabled "$timer")"
  printf '%s active=%s enabled=%s\n' "$timer" "$active" "$enabled"
  [ "$active" = active ] && [ "$enabled" = enabled ] || exit 1
done
journalctl -k --since '2026-08-29 00:00:00' --no-pager -o short-iso 2>/dev/null |
node -e '
let raw = "";
process.stdin.on("data", chunk => raw += chunk).on("end", () => {
  const count = raw.split(/\r?\n/).filter(line => /out of memory|oom-kill|killed process/i.test(line)).length;
  console.log(JSON.stringify({ oomRelatedLines: count }));
  if (count !== 0) process.exitCode = 1;
});
'
```

Expected: at least 10 GiB available RAM, zero swap usage, both containers
healthy with zero restarts and no OOM flag, the LLM-health timer and all three
discovery timers `active` and `enabled`, and `{"oomRelatedLines":0}`. Stop
before the API update if any requirement fails.

- [x] **Step 2: Apply and verify the API transaction**

Run this command from `/docker/openspg`. It reads credentials and the CSRF
token in memory but prints only approved non-secret fields:

```bash
node --input-type=module -e '
import fs from "fs";
import { ERP_KB_DASHBOARD_TEST_URL as baseUrl } from "./scripts/lib/config.mjs";

function loadEnv(filePath) {
  const values = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("\x27") && value.endsWith("\x27"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const env = loadEnv("/etc/erp-kb-dashboard.env");
const username = env.ERP_KB_DASHBOARD_USER || "";
const password = env.ERP_KB_DASHBOARD_PASSWORD || "";
const authHeaders = username || password
  ? { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}` }
  : {};

async function getJson(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, { headers: authHeaders });
  const json = await response.json();
  if (!response.ok) throw new Error(`${pathname} returned HTTP ${response.status}`);
  return json;
}

async function patchConfig(csrfToken, body, onAccepted = () => {}) {
  const response = await fetch(`${baseUrl}/api/automation/config`, {
    method: "PATCH",
    headers: {
      ...authHeaders,
      "X-ERP-KB-CSRF": csrfToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`config patch returned HTTP ${response.status}`);
  onAccepted();
  return response.json();
}

function summarize(payload) {
  const automation = payload.automation || {};
  const config = automation.config || {};
  const health = automation.llmHealth || {};
  const jobs = Array.isArray(automation.jobs) ? automation.jobs : [];
  const active = Array.isArray(automation.active) ? automation.active : [];
  return {
    enabled: config.enabled,
    paused: config.paused,
    pauseReasonType: String(config.pauseReason || "").startsWith("LLM health check failed") ? "llm-health" : (config.pauseReason ? "other" : "none"),
    shadowOnly: config.shadowOnly,
    publicationApproved: config.publicationApproved,
    llmHealth: health.status,
    consecutiveFailures: health.consecutiveFailures,
    jobCount: jobs.length,
    canonicalActiveCount: active.length,
  };
}

const status = await getJson("/api/status");
const csrfToken = status.service?.csrfToken;
if (!csrfToken) throw new Error("dashboard status did not provide a CSRF token");

const beforePayload = await getJson("/api/automation");
const before = summarize(beforePayload);
console.log(JSON.stringify({ before }));
if (before.enabled !== true || before.paused !== true || before.pauseReasonType !== "llm-health"
  || before.shadowOnly !== true || before.llmHealth !== "PASS" || before.consecutiveFailures !== 0) {
  throw new Error("automation preflight state does not match the approved baseline");
}

let updateAccepted = false;
try {
  await patchConfig(csrfToken, {
    paused: false,
    shadowOnly: true,
    publicationApproved: false,
  }, () => {
    updateAccepted = true;
  });

  const afterPayload = await getJson("/api/automation");
  const after = summarize(afterPayload);
  console.log(JSON.stringify({ after }));
  const valid = after.enabled === true
    && after.paused === false
    && after.pauseReasonType === "none"
    && after.shadowOnly === true
    && after.publicationApproved === false
    && after.llmHealth === "PASS"
    && after.consecutiveFailures === 0
    && after.jobCount === before.jobCount
    && after.canonicalActiveCount === before.canonicalActiveCount;

  if (!valid) throw new Error("final automation state failed validation");
} catch (error) {
  if (!updateAccepted) throw error;
  try {
    await patchConfig(csrfToken, {
      paused: true,
      pauseReason: "Shadow resume verification failed",
      shadowOnly: true,
      publicationApproved: false,
    });
  } catch {
    throw new Error("final automation validation and rollback both failed");
  }
  throw error;
}
'
```

Expected: two JSON lines. `before` has `paused=true`, pause reason type
`llm-health`, shadow mode, LLM health PASS, and zero consecutive failures.
`after` has `paused=false`, pause reason type `none`, shadow mode,
`publicationApproved=false`, LLM health PASS, zero consecutive failures, and
unchanged job and canonical active counts.

- [x] **Step 3: Verify infrastructure remained stable**

Run the commands from Step 1 again and compare Neo4j and server container IDs
with the recorded values. Expected: IDs are unchanged, health remains healthy,
restart and OOM fields remain zero/false, all four timers remain active/enabled,
swap usage remains zero, and kernel OOM count remains zero.

Run:

```bash
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}' \
  release-openspg-neo4j release-openspg-server
node scripts/test_erp_kb_dashboard.mjs
npm run check
git diff --check -- docs/superpowers/plans/2026-08-30-shadow-automation-resume.md
```

Expected: Neo4j remains below its 10 GiB limit, server remains below its 6 GiB
limit, dashboard test reports `ok=true` and LLM health PASS, syntax checks pass,
and diff check has no output.

- [x] **Step 4: Mark and commit the operational record**

After all verification succeeds, change all four checkbox markers in this plan
from `- [ ]` to `- [x]`.

Run:

```bash
git add docs/superpowers/plans/2026-08-30-shadow-automation-resume.md
git diff --cached --check
git diff --cached --name-only
git commit -m "ops: resume dashboard shadow automation"
```

Expected staged and committed path:

```text
docs/superpowers/plans/2026-08-30-shadow-automation-resume.md
```

## Post-Review Correction

The successful runtime state remains unchanged. This correction only hardens
the recorded transaction and verification procedure; it does not repeat the
configuration PATCH. The original rollback branch was not exercised during the
successful operation. Current `automation.active` evidence was gathered through
a read-only request and uses the canonical active array. The LLM-health timer
and all three discovery timers were verified active and enabled through
read-only systemd queries.
