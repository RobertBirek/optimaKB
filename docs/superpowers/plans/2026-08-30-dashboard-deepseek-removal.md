# Dashboard DeepSeek Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stale dashboard DeepSeek override with `gpt-5.4-mini`, verify the OpenAI path and automation safety state, and confirm DeepSeek is absent from the model registry.

**Architecture:** Store the dashboard reviewer systemd drop-in as a tracked reference file, install that exact file, and restart only the dashboard service. Use direct OpenAI probes, the existing integrated health service, OpenSPG read APIs, and dashboard read APIs as independent gates; restore the captured drop-in if any post-restart gate fails.

**Tech Stack:** systemd, Node.js ESM, OpenSPG HTTP API, dashboard HTTP API, Git.

## Global Constraints

- Keep automation `enabled=true`, `paused=false`, `shadowOnly=true`, and `publicationApproved=false`.
- Do not call `/api/automation/run` or `/api/discovery/run`.
- Do not run builders, ingestion, KB builds, publication, or re-vectorization.
- Restart only `erp-kb-dashboard.service`; do not restart OpenSPG, Neo4j, or MCP services.
- Never print API keys, cookies, authorization headers, CSRF tokens, access tokens, or full API responses.
- Preserve historical draft metadata that names DeepSeek.
- Preserve unrelated worktree changes.

---

### Task 1: Track The Dashboard Reviewer Drop-In

**Files:**
- Create: `docs/reference/ERP_KB_Dashboard_LLM_Reviewer.conf`
- Test: `systemd-analyze verify`

**Interfaces:**
- Consumes: installed dashboard drop-in structure and verified app `4` assignment.
- Produces: a tracked systemd drop-in that names `gpt-5.4-mini` explicitly.

- [ ] **Step 1: Record the failing desired-state check**

Run:

```bash
test ! -e docs/reference/ERP_KB_Dashboard_LLM_Reviewer.conf
systemctl show erp-kb-dashboard.service -p Environment --value | grep -F 'OPENSPG_LLM_MODEL=deepseek-reasoner'
```

Expected: both commands exit `0`, proving the tracked reference is absent and
the installed dashboard still has the legacy override.

- [ ] **Step 2: Create the minimal tracked drop-in**

Create `docs/reference/ERP_KB_Dashboard_LLM_Reviewer.conf` with exactly:

```ini
[Service]
Environment=OPENSPG_LLM_APP_ID=4
Environment=OPENSPG_LLM_SESSION_ID=42
Environment=OPENSPG_LLM_MODEL=gpt-5.4-mini
Environment=OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie
Environment=ERP_KB_AUTOMATION_ALLOWED_NAMESPACES=ComarchCommunityNews
```

- [ ] **Step 3: Verify the reference as a systemd drop-in**

Run:

```bash
mkdir -p /tmp/opencode/erp-kb-dashboard.service.d
cp /etc/systemd/system/erp-kb-dashboard.service /tmp/opencode/erp-kb-dashboard.service
cp docs/reference/ERP_KB_Dashboard_LLM_Reviewer.conf /tmp/opencode/erp-kb-dashboard.service.d/llm-reviewer.conf
SYSTEMD_UNIT_PATH=/tmp/opencode systemd-analyze verify erp-kb-dashboard.service
grep -F 'OPENSPG_LLM_MODEL=gpt-5.4-mini' /tmp/opencode/erp-kb-dashboard.service.d/llm-reviewer.conf
```

Expected: verification exits `0` and grep prints only the expected model line.

- [ ] **Step 4: Run repository checks**

Run:

```bash
node scripts/test_rotate_openspg_chat_model.mjs
npm run check
git diff --check
```

Expected: rotation test reports `PASS`, syntax checks exit `0`, and diff check
has no output.

- [ ] **Step 5: Commit the tracked configuration**

Run:

```bash
git add docs/reference/ERP_KB_Dashboard_LLM_Reviewer.conf
git diff --cached --check
git commit -m "fix: move dashboard reviewer to OpenAI"
```

Expected: the commit contains only the tracked drop-in.

---

### Task 2: Install, Verify, And Record The Runtime Switch

**Files:**
- Modify: `/etc/systemd/system/erp-kb-dashboard.service.d/llm-reviewer.conf`
- Modify: `docs/reference/OpenSPG_KB_Operational_Memory.md`
- Modify if regenerated: `docs/reference/ERP_KB_Dashboard_Canary_Readiness_Report.json`
- Modify if regenerated: `docs/reference/ERP_KB_Dashboard_Canary_Readiness_Report.md`

**Interfaces:**
- Consumes: `docs/reference/ERP_KB_Dashboard_LLM_Reviewer.conf` from Task 1.
- Produces: active dashboard reviewer requests on `gpt-5.4-mini`, verified OpenAI health, and durable operational evidence.

- [x] **Step 1: Capture preflight state without secrets**

Verify:

```bash
ls -ld /etc/systemd/system/erp-kb-dashboard.service.d /tmp/opencode
cp /etc/systemd/system/erp-kb-dashboard.service.d/llm-reviewer.conf /tmp/opencode/erp-kb-dashboard-llm-reviewer.before.conf
systemctl is-active erp-kb-dashboard.service
systemctl show erp-kb-dashboard.service -p MainPID -p Environment --no-pager
```

Use dashboard and OpenSPG read APIs to print only these sanitized fields:

```text
automation: enabled, paused, shadowOnly, publicationApproved, jobCount, activeCount, llmModel
apps: id, model, modelId, keyMatchesCurrentFile
models: provider, group, model, modelId, modelType
```

Expected: safe automation state, zero active jobs, apps `2` and `4` on
`gpt-5.4-mini` with the current key, and no DeepSeek model record. If a
DeepSeek record or another active DeepSeek reference exists, stop and report it;
do not delete it in this task.

- [x] **Step 2: Re-run direct OpenAI probes**

Run:

```bash
node scripts/rotate_openspg_chat_model.mjs --model gpt-5.4-mini --display-name "OpenAI GPT-5.4 Mini"
node scripts/rotate_openspg_chat_model.mjs --model gpt-5.6-luna --display-name "OpenAI GPT-5.6 Luna"
```

Expected: each result has `applied=false`, HTTP status `200`, and does not
contain key material.

- [x] **Step 3: Install the tracked drop-in and restart only the dashboard**

Run:

```bash
install -m 0644 docs/reference/ERP_KB_Dashboard_LLM_Reviewer.conf /etc/systemd/system/erp-kb-dashboard.service.d/llm-reviewer.conf
systemctl daemon-reload
systemctl restart erp-kb-dashboard.service
```

Poll `systemctl is-active erp-kb-dashboard.service` and dashboard `/api/status`
for up to 60 seconds. Do not continue until both are healthy.

- [x] **Step 4: Apply rollback on any failed post-restart gate**

If service health, API health, model state, integrated LLM health, timers, or
automation safety fields fail, run:

```bash
install -m 0644 /tmp/opencode/erp-kb-dashboard-llm-reviewer.before.conf /etc/systemd/system/erp-kb-dashboard.service.d/llm-reviewer.conf
systemctl daemon-reload
systemctl restart erp-kb-dashboard.service
```

Then verify the dashboard is active and stop. Do not attempt model deletion.

- [x] **Step 5: Verify the integrated OpenAI path**

Run:

```bash
systemctl start erp-kb-dashboard-llm-health.service
systemctl show erp-kb-dashboard-llm-health.service -p Result -p ExecMainStatus -p InactiveExitTimestamp --no-pager
```

Expected: `Result=success`, `ExecMainStatus=0`, LLM health `PASS`, model
`gpt-5.4-mini`, and zero consecutive failures.

- [x] **Step 6: Verify final runtime invariants**

Require:

```text
dashboard service: active
dashboard llmModel: gpt-5.4-mini
automation active jobs: 0
apps 2 and 4: gpt-5.4-mini, keyMatchesCurrentFile=true
model registry: no DeepSeek record
health/discovery timers: all active and enabled
```

Search active repository configuration and installed service environments for
`deepseek-reasoner`. Ignore matches under historical draft metadata and old
specs/plans. Expected: no active match.

- [x] **Step 7: Review drafts through dashboard APIs**

Report without changing draft status:

```text
inbox counts by status
pending drafts by KB
missing title/source counts
ten newest pending drafts: id, title, KB, source host, createdAt
discovery pending candidates, drafted count, semi-auto state, quality alerts
```

Expected baseline: 63 pending inbox drafts, no missing titles or sources, 139
pending discovery candidates, one duplicate-rate warning, and zero active
automation jobs. Explain any drift; do not approve, reject, promote, or build.

- [x] **Step 8: Record and commit operational evidence**

Append a dated note to `docs/reference/OpenSPG_KB_Operational_Memory.md` with
the root cause, selected model, direct and integrated probe outcomes, dashboard
restart scope, model-registry result, automation safety state, draft summary,
and confirmation that no prohibited job ran. Do not include credentials.

Run:

```bash
node scripts/test_rotate_openspg_chat_model.mjs
npm run check
git diff --check
git status --short
```

Stage only the operational-memory entry and canary files regenerated by the
controlled health probe, then commit:

```bash
git add docs/reference/OpenSPG_KB_Operational_Memory.md \
  docs/reference/ERP_KB_Dashboard_Canary_Readiness_Report.json \
  docs/reference/ERP_KB_Dashboard_Canary_Readiness_Report.md
git diff --cached --check
git commit -m "docs: record dashboard OpenAI cutover"
```

Expected: tests pass and no unrelated file is committed.
