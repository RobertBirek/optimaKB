# OpenCode Trilium MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install an authenticated Trilium streamable HTTP MCP in the global OpenCode configuration.

**Architecture:** Keep the ETAPI token in a root-owned `0600` file and reference it from the global JSONC with OpenCode's `{file:...}` interpolation. Back up the existing configuration, add one enabled remote MCP entry, and validate both configuration loading and remote connectivity without printing the token.

**Tech Stack:** OpenCode 1.18.25, JSONC, remote MCP over HTTPS, ETAPI bearer authentication.

## Global Constraints

- Preserve every existing global OpenCode setting and MCP server.
- Use `https://manual.vps.binext.pl/mcp` with `type: remote`; do not configure SSE.
- Store no token value in Git, JSONC, logs, command output, or reports.
- Read the token only from `/root/.config/opencode/trilium-etapi-token`.
- Require the token file to be root-owned, non-empty, and mode `0600`.
- Restore the configuration backup if OpenCode validation or MCP connectivity fails.
- The running OpenCode session will require a restart after installation.

---

### Task 1: Install And Validate Trilium MCP

**Files:**
- Modify: `/root/.config/opencode/opencode.jsonc`
- Modify: `/root/.config/opencode/trilium-etapi-token` (mode only)
- Create: `/tmp/opencode/opencode.jsonc.before-trilium`

**Interfaces:**
- Consumes: existing global OpenCode JSONC and the user-created ETAPI token file.
- Produces: enabled global MCP server `trilium` using file-backed bearer authentication.

- [ ] **Step 1: Verify the failing desired state**

Run without printing the token:

```bash
test -s /root/.config/opencode/trilium-etapi-token
test "$(stat -c %U /root/.config/opencode/trilium-etapi-token)" = root
test "$(stat -c %a /root/.config/opencode/trilium-etapi-token)" != 600
! opencode mcp list | grep -q '^trilium\b'
```

Expected: all commands exit `0`, proving the token exists but needs permission
hardening and Trilium is not configured.

- [ ] **Step 2: Secure the token file and verify GREEN**

Run:

```bash
chmod 0600 /root/.config/opencode/trilium-etapi-token
test -s /root/.config/opencode/trilium-etapi-token
test "$(stat -c %U /root/.config/opencode/trilium-etapi-token)" = root
test "$(stat -c %a /root/.config/opencode/trilium-etapi-token)" = 600
```

Expected: exit `0` with no token output.

- [ ] **Step 3: Back up the global configuration**

Run:

```bash
ls -ld /root/.config/opencode /tmp/opencode
cp /root/.config/opencode/opencode.jsonc /tmp/opencode/opencode.jsonc.before-trilium
cmp -s /root/.config/opencode/opencode.jsonc /tmp/opencode/opencode.jsonc.before-trilium
```

Expected: exit `0` and an exact backup under `/tmp/opencode`.

- [ ] **Step 4: Add the minimal remote MCP entry**

Add this object under the existing global `mcp` object, preserving all current
entries and fields:

```json
"trilium": {
  "type": "remote",
  "url": "https://manual.vps.binext.pl/mcp",
  "headers": {
    "Authorization": "Bearer {file:/root/.config/opencode/trilium-etapi-token}"
  },
  "enabled": true
}
```

- [ ] **Step 5: Validate JSON and OpenCode configuration loading**

Run:

```bash
node -e 'JSON.parse(require("fs").readFileSync("/root/.config/opencode/opencode.jsonc", "utf8")); console.log("global config JSON: PASS")'
opencode models openai
```

Expected: JSON reports `PASS` and OpenCode lists OpenAI models without a
configuration error. Neither command may print the ETAPI token.

- [ ] **Step 6: Verify Trilium MCP connectivity**

Run:

```bash
opencode mcp list
```

Expected: `trilium` is listed as connected. Existing MCP servers remain listed.
Do not print request headers or enable debug logging.

- [ ] **Step 7: Apply rollback if a gate fails**

If Steps 5 or 6 fail, run:

```bash
cp /tmp/opencode/opencode.jsonc.before-trilium /root/.config/opencode/opencode.jsonc
cmp -s /tmp/opencode/opencode.jsonc.before-trilium /root/.config/opencode/opencode.jsonc
```

Then report only the sanitized validation error. Keep the token file at mode
`0600`.

- [ ] **Step 8: Final sanitized verification**

Run:

```bash
stat --format='tokenFile=present owner=%U mode=%a size=%s' /root/.config/opencode/trilium-etapi-token
opencode mcp list
git status --short
```

Expected: root ownership, mode `600`, non-zero size, connected Trilium MCP, and
no repository changes beyond this committed plan/spec and unrelated existing
worktree changes.
