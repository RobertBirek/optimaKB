# ERP Knowledge Assistant MCP Rollout for Taxbell

Date: `2026-06-02`

## Target

- DNS: `erp-kb.mcp.taxbell.local`
- host: current `/docker/openspg` server
- reachability: LAN only
- reverse proxy: NPMplus
- bridge bind: `10.10.254.42:3400`
- auth: bearer token
- service account: `mcpbot`
- transport: HTTP MCP bridge only

## Decision

This rollout exposes only `erp-kb`.

It does not expose:

- `mssql`
- OpenSPG app runtime
- any direct SQL or tenant-data bridge

## 1. Create service account

Run once on the host:

```bash
sudo useradd --system --no-create-home --shell /usr/sbin/nologin mcpbot
```

If the user already exists:

```bash
id mcpbot
```

## 2. Create bearer token

Generate a long random token:

```bash
openssl rand -hex 32
```

Keep it outside the repo.

## 3. Install env file

Template source:

- `docs/reference/ERP_Knowledge_Assistant_MCP_Taxbell.env.example`

Install:

```bash
sudo cp docs/reference/ERP_Knowledge_Assistant_MCP_Taxbell.env.example /etc/erp-kb-mcp.env
sudo chmod 600 /etc/erp-kb-mcp.env
sudo chown root:root /etc/erp-kb-mcp.env
```

Edit `/etc/erp-kb-mcp.env` and set the real token:

```dotenv
ROOT=/docker/openspg
ERP_KB_HTTP_HOST=10.10.254.42
ERP_KB_HTTP_PORT=3400
ERP_KB_HTTP_PATH=/mcp
ERP_KB_LEGACY_SSE_PATH=/sse
ERP_KB_HTTP_TOKEN=<real-token>
ERP_KB_HTTP_MAX_BODY_BYTES=1048576
ERP_KB_HTTP_MAX_SSE_CLIENTS=50
```

## 4. Install systemd service

Source:

- `docs/reference/ERP_Knowledge_Assistant_MCP_Taxbell.systemd`

Install:

```bash
sudo cp docs/reference/ERP_Knowledge_Assistant_MCP_Taxbell.systemd /etc/systemd/system/erp-kb-mcp.service
sudo systemctl daemon-reload
sudo systemctl enable --now erp-kb-mcp.service
sudo systemctl status erp-kb-mcp.service
```

## 5. Local host verification

Health:

```bash
curl -sS http://127.0.0.1:3400/health
```

If the bridge is bound to the LAN address, use:

```bash
curl -sS http://10.10.254.42:3400/health
```

MCP:

```bash
curl -sS \
  -H 'Authorization: Bearer <real-token>' \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  http://127.0.0.1:3400/mcp
```

Full preflight:

```bash
ERP_KB_HTTP_TOKEN='<real-token>' node scripts/preflight_erp_knowledge_mcp_http_bridge.mjs
```

Expected:

- `ok: true`
- `toolCount: 4`
- `answerHasContent: true`

## 6. NPMplus proxy

Create a new proxy host in NPMplus with:

- Domain Names:
  - `erp-kb.mcp.taxbell.local`
- Scheme:
  - `http`
- Forward Hostname / IP:
  - `10.10.254.42`
- Forward Port:
  - `3400`
- Block Common Exploits:
  - `on`
- Websockets Support:
  - `on`
- Cache Assets:
  - `off`

For now keep it internal HTTP only.

No public exposure.

## 7. NPMplus advanced config

Use this advanced config:

```nginx
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Authorization $http_authorization;
proxy_read_timeout 3600s;
proxy_send_timeout 3600s;
proxy_buffering off;
```

## 8. LAN-only policy

Recommended:

- only internal DNS resolves `erp-kb.mcp.taxbell.local`
- do not expose this hostname outside LAN
- if host firewall is active, allow only LAN access to NPMplus listener
- keep bridge itself reachable only from NPMplus, for example with UFW allowing
  `10.10.254.46` to `3400/tcp`

## 9. Codex desktop config

Register:

```bash
codex mcp add erp-kb-http \
  --url http://erp-kb.mcp.taxbell.local/mcp \
  --bearer-token-env-var ERP_KB_HTTP_TOKEN
```

Then in the desktop session:

```bash
export ERP_KB_HTTP_TOKEN='<real-token>'
```

## 10. Claude Desktop

If the installed build supports HTTP MCP, use:

- URL:
  - `http://erp-kb.mcp.taxbell.local/mcp`
- legacy SSE URL for older builds:
  - `http://erp-kb.mcp.taxbell.local/sse`
- header:
  - `Authorization: Bearer ${ERP_KB_HTTP_TOKEN}`

If the build is stdio-only, use the fallback templates from:

- `docs/reference/ERP_Knowledge_Assistant_MCP_Client_Configs.md`

## 11. Smoke test from desktop

Ask:

1. `Jak połączyć TraNag z TraElem i Towary?`
2. `Kiedy użyć funkcji dodatkowej zamiast kolumny użytkownika?`
3. `Jak zacząć wydruk sPrint z nagłówkiem i pozycjami?`
4. `Jak działa token Betterfly API i które endpointy są wersjonowane?`

Expected:

- immediate MCP response
- routing to the right KB family
- evidence-backed starter answer

## 12. Rollback

Disable service:

```bash
sudo systemctl disable --now erp-kb-mcp.service
```

Remove proxy host from NPMplus.

Optionally remove unit:

```bash
sudo rm /etc/systemd/system/erp-kb-mcp.service
sudo systemctl daemon-reload
```
