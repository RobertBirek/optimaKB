# GPT-5.6 Luna Rotation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Assign `gpt-5.6-luna` to OpenSPG applications `2` and `4`, keep `gpt-5.4-mini` as an unused fallback, and update active dashboard services.

**Architecture:** A small Node.js command uses the authenticated OpenSPG API to create or reuse the Luna model and update both applications as one guarded operation. Pure payload builders receive unit tests. Repository and installed systemd files change only after the app cutover succeeds.

**Tech Stack:** Node.js ESM, OpenSPG REST API, OpenAI Chat Completions API, systemd, Docker Compose.

## Global Constraints

- Keep `text-embedding-3-small`, every KB project, and all vectors unchanged.
- Keep `gpt-5.4-mini` in the model registry as an unused fallback.
- Read secrets from `/etc/openspg-openai.key` and `/etc/erp-kb-openspg.cookie`; never print or stage them.
- Do not run discovery, builder jobs, KB builds, ingestion, or re-vectorization.
- Preserve unrelated Canary Readiness report changes without editing or staging them.
- Stop the health timer for the cutover and restart it after success or rollback.

---

### Task 1: Test Model And App Payload Construction

**Files:**
- Create: `scripts/test_rotate_openspg_chat_model.mjs`
- Create: `scripts/rotate_openspg_chat_model.mjs`

**Interfaces:**
- Consumes: sanitized model and application objects returned by OpenSPG.
- Produces: `buildModelRequest()`, `buildLlmConfig()`, and `buildAppUpdatePayload()`.

- [ ] **Step 1: Write failing tests for exact Luna model fields**

Test that `buildModelRequest()` returns provider `OpenAI`, visibility
`PUBLIC_READ`, model `gpt-5.6-luna`, model type `chat`, config type `maas`, the
OpenAI base URL, and the supplied key without printing it.

- [ ] **Step 2: Write failing tests for app preservation**

Test that `buildAppUpdatePayload()` changes only `config.llm` while preserving
name, description, logo, alias, KBs, chat template, and language. Test that
`buildLlmConfig()` uses the generated Luna `modelId` and app visibility
`PRIVATE`.

- [ ] **Step 3: Verify RED**

Run:

```bash
node scripts/test_rotate_openspg_chat_model.mjs
```

Expected: failure because the exported functions do not exist.

---

### Task 2: Implement Guarded OpenSPG Rotation

**Files:**
- Modify: `scripts/rotate_openspg_chat_model.mjs`
- Test: `scripts/test_rotate_openspg_chat_model.mjs`

**Interfaces:**
- Consumes: `OPENSPG_COOKIE_FILE`, `OPENAI_API_KEY_FILE`, target model options,
  and applications `2,4`.
- Produces: a Luna model record and deployed apps using its exact `modelId`.

- [ ] **Step 1: Implement pure payload builders**

Use these signatures:

```js
export function buildModelRequest({ apiKey, model, displayName })
export function buildLlmConfig({ apiKey, model, modelId })
export function buildAppUpdatePayload(app, llm)
```

- [ ] **Step 2: Implement secret-safe API helpers**

The command must:

1. read the cookie and OpenAI key from files
2. send a minimal direct chat request before OpenSPG changes
3. call `GET /v1/model/list/`
4. reuse Luna when present or call `POST /v1/model`
5. re-list models and require exactly one Luna model with a non-empty `modelId`
6. capture apps `2` and `4` in memory
7. update and deploy both apps
8. restore and redeploy captured app payloads if either update or deploy fails
9. print only model names, IDs, app IDs, status, and timings

- [ ] **Step 3: Verify GREEN**

Run:

```bash
node scripts/test_rotate_openspg_chat_model.mjs
npm run check
```

Expected: all rotation tests and repository syntax checks pass.

- [ ] **Step 4: Commit the tested command**

```bash
git add scripts/rotate_openspg_chat_model.mjs scripts/test_rotate_openspg_chat_model.mjs
git commit -m "feat: add guarded OpenSPG chat model rotation"
```

---

### Task 3: Execute The Application Cutover

**Files:**
- Read: `/etc/openspg-openai.key`
- Read: `/etc/erp-kb-openspg.cookie`
- Read: `data/dashboard/automation/llm_health.json`

**Interfaces:**
- Consumes: the tested rotation command from Task 2.
- Produces: applications `2` and `4` deployed with `gpt-5.6-luna`.

- [ ] **Step 1: Capture non-secret baseline and timer state**

Record model names and IDs, app LLM model IDs, timer active/enabled state, and
the latest health result. Do not output keys or access tokens.

- [ ] **Step 2: Stop the health timer**

Run:

```bash
sudo systemctl stop erp-kb-dashboard-llm-health.timer
```

Expected: timer becomes inactive without changing its enabled state.

- [ ] **Step 3: Run the guarded rotation**

Run:

```bash
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie \
OPENAI_API_KEY_FILE=/etc/openspg-openai.key \
node scripts/rotate_openspg_chat_model.mjs \
  --model gpt-5.6-luna \
  --display-name "OpenAI GPT-5.6 Luna" \
  --app-ids 2,4 \
  --apply
```

Expected: direct chat HTTP 200 and both apps deployed with the generated Luna
model ID.

- [ ] **Step 4: Verify live assignments**

Use `GET /v1/model/list/` and `GET /v1/app/{appid}`. Confirm Luna and 5.4 both
exist, apps `2` and `4` use Luna, and app `5` remains unchanged.

---

### Task 4: Update Active Service Configuration

**Files:**
- Modify: `docs/reference/ERP_KB_Dashboard.env.example:50`
- Modify: `docs/reference/ERP_KB_Dashboard_LLM_Health.systemd:15`
- Modify: `docs/reference/ERP_KB_Dashboard_Discovery_Daily.systemd:15`
- Modify: `docs/reference/ERP_KB_Dashboard_Discovery_Weekly.systemd:15`
- Modify: `docs/reference/OpenSPG_KB_Operational_Memory.md`

**Interfaces:**
- Consumes: verified Luna app assignments.
- Produces: repository and installed services that name `gpt-5.6-luna`.

- [ ] **Step 1: Replace active service model names**

Change only `gpt-5.4-mini` to `gpt-5.6-luna` in the four active configuration
files. Preserve app ID `4`, session ID `57`, `LoadCredential`, and dry-run flags.

- [ ] **Step 2: Add an operational-memory entry**

Record the Luna model ID, retained fallback, direct test result, two health
results, and confirmation that no KB build or discovery ran. Do not rewrite the
2026-08-28 historical spec or plan.

- [ ] **Step 3: Validate and install systemd services**

Copy the three reference units to `.service` names under `/tmp/opencode`, run
`systemd-analyze verify`, install them under `/etc/systemd/system`, and run
`systemctl daemon-reload`.

- [ ] **Step 4: Verify installed service environments**

Run `systemctl show -p Environment -p LoadCredential` for all three services.
Expected: Luna, app `4`, session `57`, and private credential paths.

---

### Task 5: Validate, Roll Back On Failure, And Commit

**Files:**
- Test: `scripts/test_rotate_openspg_chat_model.mjs`
- Test: `scripts/tests/test_patch_openspg_openai_client.py`
- Read: `data/dashboard/automation/llm_health.json`

**Interfaces:**
- Consumes: completed app and service cutover.
- Produces: verified Luna runtime or a restored 5.4 runtime.

- [ ] **Step 1: Run two consecutive health checks**

Run `erp-kb-dashboard-llm-health.service` twice. Require `PASS`, model
`gpt-5.6-luna`, zero consecutive failures, and reported latency below 90000 ms
for both runs.

- [ ] **Step 2: Scan fresh logs**

Fail validation if Docker or systemd logs contain an OpenAI key pattern,
authorization header, full `pipeline_config`, or raw `run_solver ... args:`
line.

- [ ] **Step 3: Run repository verification**

```bash
node scripts/test_rotate_openspg_chat_model.mjs
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest scripts.tests.test_patch_openspg_openai_client
npm run check
docker compose config --quiet
docker compose ps
```

- [ ] **Step 4: Roll back on any failed gate**

Invoke the guarded command with `gpt-5.4-mini`, restore the three repository
service files to 5.4, reinstall them, run one rollback health check, and restart
the timer. Do not continue to commit a failed Luna cutover.

- [ ] **Step 5: Restart the health timer after success**

```bash
sudo systemctl reset-failed erp-kb-dashboard-llm-health.service
sudo systemctl start erp-kb-dashboard-llm-health.timer
```

- [ ] **Step 6: Commit only rotation files**

Inspect status, diff, recent log, staged secret scan, and staged diff. Exclude
the unrelated Canary Readiness files.

```bash
git add \
  docs/reference/ERP_KB_Dashboard.env.example \
  docs/reference/ERP_KB_Dashboard_LLM_Health.systemd \
  docs/reference/ERP_KB_Dashboard_Discovery_Daily.systemd \
  docs/reference/ERP_KB_Dashboard_Discovery_Weekly.systemd \
  docs/reference/OpenSPG_KB_Operational_Memory.md
git commit -m "chore: rotate OpenSPG apps to GPT-5.6 Luna"
```
