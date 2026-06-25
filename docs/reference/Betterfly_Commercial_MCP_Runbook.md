# Betterfly Commercial MCP Runbook

Date: `2026-06-09`

## Goal

Run a dedicated Betterfly MCP for one production tenant with:

- read-only API operations
- Betterfly KB-backed guidance
- strict privacy controls for sensitive data

This MCP does not write into Betterfly and does not persist production payloads
to repository files.

## Implemented components

- core: `scripts/lib/betterfly_commercial_mcp_core.mjs`
- privacy: `scripts/lib/betterfly_privacy.mjs`
- Betterfly API client: `scripts/lib/betterfly_api_client.mjs`
- stdio server: `scripts/betterfly_commercial_mcp_server.mjs`
- HTTP/SSE bridge: `scripts/betterfly_commercial_mcp_http_bridge.mjs`
- env template: `docs/reference/Betterfly_Commercial_MCP.env.example`
- systemd template: `docs/reference/Betterfly_Commercial_MCP.systemd`

## Privacy modes

### strict_privacy (default)

- all sensitive fields are redacted
- `includeSensitive=true` is rejected

### trusted_operator

- sensitive fields are still redacted by default
- full sensitive output is allowed only when all are true:
  - `BETTERFLY_MCP_PRIVACY_MODE=trusted_operator`
  - `BETTERFLY_MCP_ALLOW_SENSITIVE=true`
  - tool call includes `includeSensitive=true`

## Sensitive field handling

The privacy layer redacts fields matching common Betterfly business identifiers,
including tax ids, emails, phone numbers, addresses, account numbers,
document numbers, representative names, sender/recipient details, and payment
ids.

## Supported tools

Knowledge and diagnostics:

- `betterfly_health`
- `betterfly_list_capabilities`
- `betterfly_test_auth`
- `betterfly_answer`
- `betterfly_endpoint_lookup`
- `betterfly_auth_flow`
- `betterfly_write_workflow_info` (knowledge-only)
- `betterfly_resource_contract`

Live read-only API:

- `betterfly_list_products`
- `betterfly_get_product`
- `betterfly_list_customers`
- `betterfly_get_customer`
- `betterfly_list_invoices`
- `betterfly_get_invoice`
- `betterfly_list_paymentdetails`
- `betterfly_explain_and_call`

## Deliberately excluded in stage 1

- print/download endpoints
- all write-side operations (`POST/PUT/DELETE` business resources)
- arbitrary URL call tool

## Setup

1. Create env file:

```bash
cp docs/reference/Betterfly_Commercial_MCP.env.example .env.betterfly-mcp
```

2. Fill production values in `.env.betterfly-mcp`:

- `BETTERFLY_CLIENT_ID`
- `BETTERFLY_CLIENT_SECRET`
- `BETTERFLY_MCP_HTTP_TOKEN`

3. Choose privacy mode:

- default safe mode:

```bash
BETTERFLY_MCP_PRIVACY_MODE=strict_privacy
BETTERFLY_MCP_ALLOW_SENSITIVE=false
```

- trusted operator mode:

```bash
BETTERFLY_MCP_PRIVACY_MODE=trusted_operator
BETTERFLY_MCP_ALLOW_SENSITIVE=true
```

## Run (stdio)

```bash
set -a
. ./.env.betterfly-mcp
set +a
node scripts/betterfly_commercial_mcp_server.mjs
```

## Run (HTTP/SSE)

```bash
set -a
. ./.env.betterfly-mcp
set +a
node scripts/betterfly_commercial_mcp_http_bridge.mjs
```

Health endpoint:

```bash
curl -s http://127.0.0.1:3500/health
```

## MCP quick checks

Use `POST /mcp` with bearer token `BETTERFLY_MCP_HTTP_TOKEN`.

1. `initialize`
2. `tools/list`
3. `tools/call` with `betterfly_health`
4. `tools/call` with `betterfly_test_auth`
5. `tools/call` with one read tool, e.g. `betterfly_list_products` and `top=1`

## Operational safeguards

- keep secrets out of git
- keep default page sizes low in production
- avoid `includeSensitive=true` unless required
- do not copy API payloads into docs/reference or exports
- expose HTTP bridge behind network controls and bearer auth

## Systemd deployment (optional)

1. Copy env and fill production values:

```bash
sudo cp /docker/openspg/docs/reference/Betterfly_Commercial_MCP.env.example /etc/betterfly-commercial-mcp.env
sudo chmod 600 /etc/betterfly-commercial-mcp.env
```

2. Install unit file:

```bash
sudo cp /docker/openspg/docs/reference/Betterfly_Commercial_MCP.systemd /etc/systemd/system/betterfly-commercial-mcp.service
sudo systemctl daemon-reload
sudo systemctl enable --now betterfly-commercial-mcp.service
```

3. Verify service:

```bash
systemctl status betterfly-commercial-mcp.service --no-pager
curl -s http://127.0.0.1:3500/health
```
