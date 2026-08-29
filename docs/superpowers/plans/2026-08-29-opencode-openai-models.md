# OpenCode OpenAI Models Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure OpenAI as the global and OpenSPG-project model source, using GPT-5.6 Sol for complex work and GPT-5.4 Mini Fast for lightweight work.

**Architecture:** Change only existing `model` fields in the global config, project config, and four project-agent frontmatter blocks. Keep OpenAI OAuth as the authentication mechanism and leave all other providers, plugins, MCP servers, permissions, skills, and references unchanged.

**Tech Stack:** OpenCode 1.18.25, JSON, JSONC, Markdown frontmatter, OpenAI OAuth.

## Global Constraints

- Use `openai/gpt-5.6-sol` as `model` globally and in `/docker/openspg`.
- Use `openai/gpt-5.4-mini-fast` as `small_model` globally and in `/docker/openspg`.
- Assign `openai/gpt-5.6-sol` to `frontend`, `kb-ops`, and `codex-openspg-delegate`.
- Assign `openai/gpt-5.4-mini-fast` to `daily-ops`.
- Do not add API keys, tokens, provider secrets, or authentication file paths.
- Do not set `enabled_providers` or `disabled_providers`.
- Preserve every unrelated field and concurrent worktree change.
- Do not commit unless the user explicitly requests a commit.
- Tell the user to quit and restart OpenCode after validation.

---

### Task 1: Set Global And Project Defaults

**Files:**
- Modify: `/root/.config/opencode/opencode.jsonc:2-3`
- Modify: `/docker/openspg/opencode.json:2-10`

**Interfaces:**
- Consumes: existing OpenAI OAuth credential and model catalog.
- Produces: global and project defaults that resolve to OpenAI model IDs.

- [ ] **Step 1: Confirm both models and OAuth are available**

Run:

```bash
opencode models openai
opencode auth list
```

Expected: the model list contains both lines below, and the credential list
contains `OpenAI oauth` without printing credential values.

```text
openai/gpt-5.6-sol
openai/gpt-5.4-mini-fast
```

- [ ] **Step 2: Re-read only the fields that will change**

Read `/root/.config/opencode/opencode.jsonc:1-5` and
`/docker/openspg/opencode.json:1-12`. Stop if either file changed from the
values recorded in the design; do not overwrite concurrent edits.

- [ ] **Step 3: Change the two global defaults**

Apply this exact replacement in `/root/.config/opencode/opencode.jsonc`:

```jsonc
  "model": "openai/gpt-5.6-sol",
  "small_model": "openai/gpt-5.4-mini-fast",
```

Preserve `$schema` and every line after it.

- [ ] **Step 4: Add the project primary model and replace its small model**

Make the beginning of `/docker/openspg/opencode.json` read:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "openai/gpt-5.6-sol",
  "small_model": "openai/gpt-5.4-mini-fast",
  "plugin": [
    "superpowers@git+https://github.com/obra/superpowers.git"
  ],
```

Remove the old `"small_model": "google/gemini-2.0-flash"` line and preserve
the existing Google provider block as a manual fallback.

- [ ] **Step 5: Validate effective defaults without printing merged secrets**

Run from `/tmp/opencode` to validate the global scope:

```bash
opencode debug config | node -e '
let raw = "";
process.stdin.on("data", chunk => raw += chunk).on("end", () => {
  const config = JSON.parse(raw);
  console.log(JSON.stringify({ model: config.model, small_model: config.small_model }));
});
'
```

Expected:

```json
{"model":"openai/gpt-5.6-sol","small_model":"openai/gpt-5.4-mini-fast"}
```

Run the same command from `/docker/openspg`. Expected output is identical.

---

### Task 2: Assign OpenAI Models To Project Agents

**Files:**
- Modify: `/docker/openspg/.opencode/agent/frontend.md:4`
- Modify: `/docker/openspg/.opencode/agent/kb-ops.md:4`
- Modify: `/docker/openspg/.opencode/agent/codex-openspg-delegate.md:4`
- Modify: `/docker/openspg/.opencode/agent/daily-ops.md:4`

**Interfaces:**
- Consumes: model IDs validated in Task 1.
- Produces: four agent definitions that use only OpenAI models.

- [ ] **Step 1: Re-read all four frontmatter blocks**

Read lines 1-7 from each agent file. Confirm that only line 4 needs to change
and preserve descriptions, modes, permissions, and prompt bodies.

- [ ] **Step 2: Assign GPT-5.6 Sol to complex agents**

Set this line in `frontend.md`, `kb-ops.md`, and
`codex-openspg-delegate.md`:

```yaml
model: openai/gpt-5.6-sol
```

- [ ] **Step 3: Assign GPT-5.4 Mini Fast to daily operations**

Set this line in `daily-ops.md`:

```yaml
model: openai/gpt-5.4-mini-fast
```

- [ ] **Step 4: Validate each effective agent definition**

Run from `/docker/openspg`:

```bash
for agent in frontend kb-ops codex-openspg-delegate daily-ops; do
  opencode debug agent "$agent" | node -e '
  let raw = "";
  process.stdin.on("data", chunk => raw += chunk).on("end", () => {
    const agent = JSON.parse(raw);
    const model = `${agent.model.providerID}/${agent.model.modelID}`;
    console.log(`${agent.name}: ${model}`);
  });
  '
done
```

Expected model assignments:

```text
frontend: openai/gpt-5.6-sol
kb-ops: openai/gpt-5.6-sol
codex-openspg-delegate: openai/gpt-5.6-sol
daily-ops: openai/gpt-5.4-mini-fast
```

- [ ] **Step 5: Run final safety checks**

Run:

```bash
git diff --check
git diff -- opencode.json .opencode/agent docs/superpowers/specs/2026-08-29-opencode-openai-models-design.md docs/superpowers/plans/2026-08-29-opencode-openai-models.md
git status --short
```

Search the changed project files for these secret patterns and require zero
matches:

```text
sk-[A-Za-z0-9_-]{20,}
Authorization: Bearer
```

Inspect `/root/.config/opencode/opencode.jsonc:1-5` and confirm that only
`model` and `small_model` changed. Do not print the rest of the global config.

- [ ] **Step 6: Report restart requirement**

Tell the user to quit and restart OpenCode. The running session keeps the
configuration loaded at its own startup; only a new process uses all changes.
