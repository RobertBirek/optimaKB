# ERP Knowledge Assistant MCP Intranet Deployment

Date: `2026-06-02`

## Goal

Expose the ERP assistant MCP server to internal desktops through a private HTTP
endpoint in the company intranet.

Current implementation:

- stdio MCP server:
  - `scripts/erp_knowledge_mcp_server.mjs`
- shared MCP core:
  - `scripts/lib/erp_knowledge_mcp_core.mjs`
- HTTP bridge:
  - `scripts/erp_knowledge_mcp_http_bridge.mjs`

## Recommended architecture

1. run the HTTP bridge on one central Linux host
2. bind the bridge on localhost or internal LAN only
3. place nginx or another reverse proxy in front
4. terminate TLS on the proxy
5. protect access with:
   - bearer token
   - plus IP allowlist or internal VPN or internal SSO

Do not expose this endpoint to the public internet.

## Host prerequisites

- Node.js `18+`
- repo available at `/docker/openspg`
- dedicated service account, e.g. `mcpbot`
- internal DNS name, e.g. `erp-kb-mcp.intra.example.local`
- TLS certificate for that internal name

## Step 1. Choose runtime values

Suggested values:

- bridge bind host: `127.0.0.1`
- bridge bind port: `3400`
- MCP path: `/mcp`
- health path: `/health`
- bearer token: long random value, stored outside repo

Example token generation:

```bash
openssl rand -hex 32
```

## Step 2. Test the bridge manually

```bash
cd /docker/openspg
ERP_KB_HTTP_HOST=127.0.0.1 \
ERP_KB_HTTP_PORT=3400 \
ERP_KB_HTTP_PATH=/mcp \
ERP_KB_HTTP_TOKEN='replace-me' \
node scripts/erp_knowledge_mcp_http_bridge.mjs
```

Expected startup output:

```json
{"ok":true,"service":"erp-knowledge-assistant","transport":"http-bridge","host":"127.0.0.1","port":3400,"mcpPath":"/mcp","auth":"bearer"}
```

Verify locally:

```bash
curl -sS http://127.0.0.1:3400/health
```

```bash
curl -sS \
  -H 'Authorization: Bearer replace-me' \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  http://127.0.0.1:3400/mcp
```

## Step 3. Install as systemd service

Use sample unit:

- `docs/reference/ERP_Knowledge_Assistant_MCP_HTTP_Bridge.systemd`

Suggested rollout:

```bash
sudo cp docs/reference/ERP_Knowledge_Assistant_MCP_HTTP_Bridge.systemd /etc/systemd/system/erp-kb-mcp.service
sudo systemctl daemon-reload
sudo systemctl enable --now erp-kb-mcp.service
sudo systemctl status erp-kb-mcp.service
```

Before enabling:

- change `ERP_KB_HTTP_TOKEN`
- verify `User=` and `Group=`
- verify `/usr/bin/node`

## Step 4. Put nginx in front

Use sample proxy config:

- `docs/reference/ERP_Knowledge_Assistant_MCP_HTTP_Bridge.nginx.conf`

Suggested rollout:

```bash
sudo cp docs/reference/ERP_Knowledge_Assistant_MCP_HTTP_Bridge.nginx.conf /etc/nginx/conf.d/erp-kb-mcp.conf
sudo nginx -t
sudo systemctl reload nginx
```

Before enabling:

- set the real internal hostname
- set real certificate paths
- confirm proxy points to `127.0.0.1:3400`

## Step 5. Network policy

At minimum:

- allow only internal LAN or VPN ranges
- deny public ingress
- keep the bridge bound to localhost if nginx is on the same host

Recommended:

- internal DNS only
- internal CA or company-issued cert
- bearer token per environment

## Step 6. Codex client config

Best path for Codex over HTTP:

```bash
codex mcp add erp-kb-http \
  --url https://erp-kb-mcp.intra.example.local/mcp \
  --bearer-token-env-var ERP_KB_HTTP_TOKEN
```

Then export token in the user session:

```bash
export ERP_KB_HTTP_TOKEN='replace-me'
```

Verify:

```bash
codex mcp list
```

## Step 7. Claude Desktop

If the installed Claude Desktop build supports HTTP MCP endpoints, point it to:

- URL: `https://erp-kb-mcp.intra.example.local/mcp`
- auth header: `Authorization: Bearer ...`

If that build supports only stdio MCP, use the SSH/stdio model instead of this
HTTP endpoint.

## Step 8. Smoke test after rollout

Use these questions:

1. `Jak połączyć TraNag z TraElem i Towary?`
2. `Kiedy użyć funkcji dodatkowej zamiast kolumny użytkownika?`
3. `Jak zacząć wydruk sPrint z nagłówkiem i pozycjami?`
4. `Jak działa token Betterfly API i które endpointy są wersjonowane?`

Expected:

- MCP transport responds immediately
- `answer_question` returns evidence-backed text
- no dependency on the broken live OpenSPG app runtime

## What this does not depend on

This intranet MCP path does not depend on:

- the broken OpenSPG app runtime for app `2`
- the OpenSPG live Q&A template path
- Betterfly live tenant data

It depends only on the local KB artifacts and the verified assistant layer.
