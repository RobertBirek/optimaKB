# OpenAI Model Rotation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rotate all active OpenSPG model roles to a new OpenAI API key, retain `text-embedding-3-small`, and use `gpt-5.4-mini` for generation.

**Architecture:** Model records are managed by the installed OpenSPG UI at `/#/setting/model`. Existing KB vectorizers remain bound to their current `text-embedding-3-small` model ID; only its provider credential is rotated. The new generative-model record is assigned to active app and pipeline roles before legacy records are deleted.

**Tech Stack:** OpenSPG 1.0.x, OpenAI-compatible API, OpenAI `text-embedding-3-small`, OpenAI `gpt-5.4-mini`, Node.js validation scripts.

## Global Constraints

- Do not place the new OpenAI API key in chat, source control, `.env`, shell arguments, logs, or reports.
- The operator enters the new API key directly in the OpenSPG UI.
- Preserve the current `text-embedding-3-small` model ID and its 1536 dimensions.
- Do not create KB projects, run builder jobs, or re-vectorize existing KB data.
- Delete legacy models only after every active model assignment and validation check succeeds.
- Do not change existing unrelated working-tree files.

---

## File Structure

```
docs/superpowers/
  specs/2026-08-28-openai-model-rotation-design.md  # Approved design
  plans/2026-08-28-openai-model-rotation.md         # This operational plan

scripts/
  check_dashboard_llm_health.mjs                     # Existing post-cutover health check
```

---

### Task 1: Capture the live model and assignment baseline

**Files:**
- Read: `docs/superpowers/specs/2026-08-28-openai-model-rotation-design.md`
- Read: `scripts/check_dashboard_llm_health.mjs`

**Interfaces:**
- Consumes: OpenSPG model-management UI and active application configuration.
- Produces: A private operator record of current model names, IDs, roles, and app assignments. It must not include API keys.

- [ ] **Step 1: Open the OpenSPG model page**

Navigate to `http://10.10.254.42:8887/#/setting/model` as an administrator.

- [ ] **Step 2: Record the non-secret model baseline**

For every configured model, record only: display name, model ID, provider type,
base URL host, vector dimensions, and whether it is used as vectorizer, OpenIE,
solver/chat, or app LLM. Confirm that the existing vectorizer is
`text-embedding-3-small` with 1536 dimensions.

- [ ] **Step 3: Record active app LLM assignments**

Open `http://10.10.254.42:8887/#/application`, inspect every deployed app, and
record each `config.llm` model reference without exporting its access token.

- [ ] **Step 4: Confirm the dashboard integration baseline without changing automation state**

Run:

```bash
ERP_KB_AUTOMATION_LLM_HEALTH_FAILURE_THRESHOLD=999 node scripts/check_dashboard_llm_health.mjs
```

Expected: a health JSON document with `health: true`, or a documented existing
failure caused by a disabled/paused dashboard automation setting. Do not use a
failed pre-existing dashboard automation state as evidence against the model
cutover.

---

### Task 2: Rotate the embedding credential and add the OpenAI LLM

**Files:**
- Read: `docs/reference/Dokumentacja OpenSPG.md:1143-1204`

**Interfaces:**
- Consumes: the existing `text-embedding-3-small` model record and an operator-held new OpenAI key.
- Produces: a credential-rotated embedding model and a registered
  `gpt-5.4-mini` LLM record.

- [ ] **Step 1: Update the existing embedding model record**

In `/#/setting/model`, edit the existing `text-embedding-3-small` record only.
Set the OpenAI-compatible base URL to `https://api.openai.com/v1` if it is not
already set, enter the new OpenAI key in the UI, and preserve the existing
model ID and `1536` vector dimensions.

- [ ] **Step 2: Run the embedding connection test**

Use that record's UI test action.

Expected: successful authentication and a successful embedding-service response.
Do not submit a builder job as a test.

- [ ] **Step 3: Create the generative model record**

In `/#/setting/model`, add a generative model with these exact values:

```text
Model ID: gpt-5.4-mini
Provider type: maas (or the UI's OpenAI-compatible equivalent)
Base URL: https://api.openai.com/v1
API key: enter the same new OpenAI key directly in the UI
```

- [ ] **Step 4: Run the generative-model connection test**

Use the new record's UI test action.

Expected: a successful OpenAI-compatible chat-completions response.

---

### Task 3: Assign the new LLM and deploy affected apps

**Files:**
- Read: `docs/reference/OpenSPG_KB_Operational_Memory.md:1782-1791`

**Interfaces:**
- Consumes: the validated `gpt-5.4-mini` model record.
- Produces: active OpenIE, solver/chat, and application `config.llm` assignments that reference the new record.

- [ ] **Step 1: Reassign active generative roles**

In the OpenSPG settings UI, change every active OpenIE/extraction and
solver/chat role from its legacy model to `gpt-5.4-mini`. Do not
change the vectorizer assignment.

- [ ] **Step 2: Reassign each deployed application LLM**

In the application configuration UI, update each active app's `config.llm` to
the new LLM. Preserve `config.kb`, `config.language`, and `config.chat`.

- [ ] **Step 3: Deploy changed applications from the UI**

For every changed app, use its UI deploy action. Do not use
`scripts/deploy_erp_knowledge_openspg_app.mjs`: it intentionally preserves the
current `config.llm` and is not a model-assignment tool. Do not print or save
an application access token.

---

### Task 4: Validate the cutover and remove legacy models

**Files:**
- Read: `scripts/check_dashboard_llm_health.mjs:1-150`
- Read: `docs/superpowers/specs/2026-08-28-openai-model-rotation-design.md:58-66`

**Interfaces:**
- Consumes: all active model assignments pointing to OpenAI records.
- Produces: a verified OpenAI-only active model configuration with legacy model records removed.

- [ ] **Step 1: Validate the dashboard LLM path**

Run:

```bash
ERP_KB_AUTOMATION_LLM_HEALTH_FAILURE_THRESHOLD=999 \
OPENSPG_LLM_MODEL=gpt-5.4-mini \
node scripts/check_dashboard_llm_health.mjs
```

Expected: exit code `0` and reported `health: true`. The temporary failure
threshold prevents a failed probe from changing the intentionally paused
automation state; do not resume automation as part of this model-rotation task.

- [ ] **Step 2: Inspect application deployment status without using question-answering as a model test**

Open each changed deployed app and confirm its deployment status and selected
`config.llm` model. Do not use app question-answering as a model test: the
known OpenSPG app-id/project-id backend bug prevents an end-to-end app answer
independently of provider configuration.

- [ ] **Step 3: Verify no active legacy references remain**

Re-open model roles and application `config.llm` settings. Confirm that every
active generative role references `gpt-5.4-mini` and every active
vectorizer reference is `text-embedding-3-small`.

- [ ] **Step 4: Delete non-OpenAI legacy model records**

Delete every legacy non-OpenAI model record in `/#/setting/model`. Do not
delete `text-embedding-3-small` or `gpt-5.4-mini`.

- [ ] **Step 5: Re-run final connectivity checks**

Run:

```bash
ERP_KB_AUTOMATION_LLM_HEALTH_FAILURE_THRESHOLD=999 \
OPENSPG_LLM_MODEL=gpt-5.4-mini \
node scripts/check_dashboard_llm_health.mjs
docker compose ps
```

Expected: LLM health exits `0`; all OpenSPG compose services report healthy or
running according to their declared health checks.

- [ ] **Step 6: Revoke obsolete provider keys**

In each legacy provider's console, revoke the obsolete key after Step 5
succeeds. Do not record revoked or replacement key values in this repository.
