# ERP Knowledge Assistant MCP Client Configs

Date: `2026-06-02`

## Scope

This file contains ready-to-adapt client examples for the intranet HTTP bridge
of `erp-kb`.

Assumed private endpoint:

- URL: `http://erp-kb.mcp.taxbell.local/mcp`
- legacy SSE URL: `http://erp-kb.mcp.taxbell.local/sse`
- bearer token environment variable: `ERP_KB_HTTP_TOKEN`

## Codex

### Local Codex on the MCP host

If Codex runs on the same host as `/docker/openspg`, prefer the local read-only
auth proxy:

```toml
[mcp_servers.erp-kb-http]
url = "http://127.0.0.1:3401/mcp"
```

The proxy injects the read-only `ERP_KB_HTTP_TOKEN` from
`/etc/erp-kb-mcp.env` and forwards to the protected bridge at
`http://10.10.254.42:3400`.

This avoids fragile desktop/session environment problems with
`bearer_token_env_var`.

### Remote or desktop Codex

Register the HTTP MCP endpoint:

```bash
codex mcp add erp-kb-http \
  --url http://erp-kb.mcp.taxbell.local/mcp \
  --bearer-token-env-var ERP_KB_HTTP_TOKEN
```

Set token in the desktop session:

```bash
export ERP_KB_HTTP_TOKEN='replace-me'
```

Verify:

```bash
codex mcp list
```

Expected new entry:

- `erp-kb-http`

## Claude Desktop

### Important note

Claude Desktop builds differ. Some support only stdio MCP servers, while newer
builds may support HTTP/streamable MCP configuration.

Treat the required transport values as:

- URL: `https://erp-kb-mcp.intra.example.local/mcp`
- legacy SSE URL for older builds: `http://erp-kb.mcp.taxbell.local/sse`
- auth: `Authorization: Bearer ${ERP_KB_HTTP_TOKEN}`

### Example JSON shape for HTTP-capable builds

Use this as an adaptation template, not a guaranteed exact schema for every
Claude build:

```json
{
  "mcpServers": {
    "erp-kb-http": {
      "url": "http://erp-kb.mcp.taxbell.local/mcp",
      "headers": {
        "Authorization": "Bearer ${ERP_KB_HTTP_TOKEN}"
      }
    }
  }
}
```

### Example JSON shape for legacy SSE builds

Some Claude Desktop builds expect `transport: "sse"` and `/sse`:

```json
{
  "mcpServers": {
    "erp-kb-http": {
      "url": "http://erp-kb.mcp.taxbell.local/sse",
      "transport": "sse",
      "headers": {
        "Authorization": "Bearer ${ERP_KB_HTTP_TOKEN}"
      }
    }
  }
}
```

### If your Claude Desktop build supports only stdio

Do not point it to the HTTP bridge directly. Use one of:

1. local stdio:
```json
{
  "mcpServers": {
    "erp-kb": {
      "command": "node",
      "args": ["/docker/openspg/scripts/erp_knowledge_mcp_server.mjs"],
      "env": {
        "ROOT": "/docker/openspg"
      }
    }
  }
}
```

2. SSH + stdio from desktop to central host:
```json
{
  "mcpServers": {
    "erp-kb": {
      "command": "ssh",
      "args": [
        "mcp-host",
        "bash",
        "-lc",
        "ROOT=/docker/openspg node /docker/openspg/scripts/erp_knowledge_mcp_server.mjs"
      ]
    }
  }
}
```

## Windows notes

If desktops are on Windows:

- for Codex HTTP, only the environment variable matters
- for Claude stdio or SSH mode, use full executable paths when needed

Example OpenSSH path:

```json
{
  "mcpServers": {
    "erp-kb": {
      "command": "C:\\\\Windows\\\\System32\\\\OpenSSH\\\\ssh.exe",
      "args": [
        "mcp-host",
        "bash",
        "-lc",
        "ROOT=/docker/openspg node /docker/openspg/scripts/erp_knowledge_mcp_server.mjs"
      ]
    }
  }
}
```

## Smoke test questions

Use these after attaching the server in a client:

1. `Jak połączyć TraNag z TraElem i Towary?`
2. `Kiedy użyć funkcji dodatkowej zamiast kolumny użytkownika?`
3. `Jak zacząć wydruk sPrint z nagłówkiem i pozycjami?`
4. `Jak działa token Betterfly API i które endpointy są wersjonowane?`

Expected:

- routing to the correct KB family
- evidence-backed starter answer
- no dependency on the broken live OpenSPG app runtime
- `resources/list` may appear as an empty list; tools are the intended surface
