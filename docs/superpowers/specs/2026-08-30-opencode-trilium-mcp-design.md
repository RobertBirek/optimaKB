# OpenCode Trilium MCP Design

**Date:** 2026-08-30

## Goal

Add the Trilium MCP endpoint to this machine's global OpenCode configuration so
all OpenCode projects can read and modify notes through streamable HTTP.

## Configuration

Add an enabled remote MCP named `trilium` to
`/root/.config/opencode/opencode.jsonc`:

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

The endpoint uses the requested HTTP transport. Do not configure SSE and do
not use the Docker-network address `http://172.21.0.5:30070/mcp` from this
OpenCode installation.

## Secret Handling

The ETAPI token remains only in
`/root/.config/opencode/trilium-etapi-token`. The file must be owned by root,
be non-empty, and have mode `0600`. The token must not appear in the repository,
OpenCode configuration, command output, logs, or final response.

## Validation

Preserve every existing global OpenCode setting and MCP entry. Validate the
edited JSONC with OpenCode itself, then run `opencode mcp list` and require the
`trilium` server to connect successfully. Use only sanitized status output.

The current OpenCode process does not hot-reload configuration. After the file
is saved and validated, the user must quit and restart OpenCode before Trilium
tools become available in a new session.

## Failure Handling

Capture a backup of the global configuration before editing. If schema parsing
or MCP connection fails, restore the backup and report the sanitized error.
Never fall back to embedding the token directly in JSONC.
