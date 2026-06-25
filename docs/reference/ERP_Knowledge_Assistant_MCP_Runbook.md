# ERP Knowledge Assistant MCP Runbook

Date: `2026-06-01`

## Purpose

This runbook describes the local MCP bridge for the ERP assistant layer.

## Server

- `scripts/erp_knowledge_mcp_server.mjs`
- `scripts/erp_knowledge_mcp_http_bridge.mjs`

## What it exposes

Tools:

1. `route_question`
   - input: `{ "question": "..." }`
   - output: primary KB, support KBs, matched intent, artifacts

2. `answer_question`
   - input: `{ "question": "..." }`
   - output: practical starter answer with evidence snippets

3. `run_community_thread_test`
   - input: `{}`
   - output: summary plus paths to the generated benchmark artifacts

4. `submit_knowledge_draft`
   - input: `{ kbName, kbNamespace, title, content, sourceUrl?, tags? }`
   - output: local JSON/Markdown draft paths for later promotion into a KB

5. `search_external_sources`
   - input: `{ query, kbName?, includeDomains?, numResults? }`
   - output: externally searched sources with source tier and citations

6. `draft_external_source`
   - input: `{ kbName, kbNamespace, query, url?, title?, notes?, tags? }`
   - output: inbox draft created from one Exa-backed external result

## Local run

```bash
cd /docker/openspg
node scripts/erp_knowledge_mcp_server.mjs
```

The server uses stdio MCP framing.

## HTTP bridge for intranet use

The HTTP bridge wraps the same MCP core and exposes it as a private intranet
endpoint.

Default bind:

- host: `127.0.0.1`
- port: `3400`
- MCP path: `/mcp`
- legacy SSE alias: `/sse`
- health path: `/health`

Example local bind with bearer token:

```bash
cd /docker/openspg
ERP_KB_HTTP_HOST=0.0.0.0 \
ERP_KB_HTTP_PORT=3400 \
ERP_KB_HTTP_TOKEN='replace-me' \
node scripts/erp_knowledge_mcp_http_bridge.mjs
```

Health check:

```bash
curl -sS http://127.0.0.1:3400/health
```

MCP JSON-RPC POST:

```bash
curl -sS \
  -H 'Authorization: Bearer replace-me' \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  http://127.0.0.1:3400/mcp
```

The bridge also accepts `GET /mcp` as an SSE endpoint for clients that expect
streamable HTTP transport, but the ERP assistant currently answers in normal
request/response mode and does not push unsolicited server events.
For legacy Claude Desktop style SSE configs, the bridge also accepts `/sse` as
an alias for the same transport.

Compatibility:

- `initialize` declares `tools` and `resources`
- `resources/list` returns an empty list
- `resources/read` returns a controlled error because this bridge exposes tools,
  not MCP resources

Default transport limits:

- HTTP body: `ERP_KB_HTTP_MAX_BODY_BYTES=1048576`
- SSE clients: `ERP_KB_HTTP_MAX_SSE_CLIENTS=50`
- HTTP request timeout: `ERP_KB_HTTP_REQUEST_TIMEOUT_MS=30000`
- HTTP headers timeout: `ERP_KB_HTTP_HEADERS_TIMEOUT_MS=10000`
- stdio frame: `ERP_KB_MCP_MAX_FRAME_BYTES=1048576`

## Knowledge inbox

Use `submit_knowledge_draft` when you want to capture new knowledge safely
without writing directly into OpenSPG.

This tool writes to:

- `downloads/knowledge_inbox/YYYY-MM-DD/<draft_id>.json`
- `downloads/knowledge_inbox/YYYY-MM-DD/<draft_id>.md`

Promotion into a real KB still goes through the existing export/build flow for
the target KB.

Review commands:

```bash
cd /docker/openspg
node scripts/manage_knowledge_inbox.mjs list --status pending
node scripts/manage_knowledge_inbox.mjs show <draft_id>
node scripts/manage_knowledge_inbox.mjs promote <draft_id> --note "source checked" --by "<operator>"
```

Promoted drafts are then consumed by the relevant KB exporter as additional
retrieval documents/chunks.

The same flow can be automated after review:

```bash
cd /docker/openspg
node scripts/run_knowledge_inbox_pipeline.mjs --promote <draft_id> --export --note "source checked" --by "<operator>"
```

Add `--build` only when `OPENSPG_COOKIE_FILE` or `OPENSPG_COOKIE` is available
and you intentionally want to submit OpenSPG builder jobs.

Recommended:

```bash
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie node scripts/openspg_auth_check.mjs
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie node scripts/run_knowledge_inbox_pipeline.mjs --kb ComarchBetterflyReference --export --build
```

If the cookie file is missing or expired, refresh it from a dedicated OpenSPG
login file kept outside the repository:

```bash
sudo install -m 600 -o root -g root /dev/null /etc/erp-kb-openspg-login.env
sudoedit /etc/erp-kb-openspg-login.env
```

```text
OPENSPG_LOGIN_ACCOUNT=<operator_login>
OPENSPG_LOGIN_PASSWORD=<operator_password>
```

```bash
cd /docker/openspg
OPENSPG_LOGIN_FILE=/etc/erp-kb-openspg-login.env \
OPENSPG_COOKIE_OUT=/etc/erp-kb-openspg.cookie \
node scripts/openspg_login.mjs
```

For an explicit one-shot pipeline run with automatic refresh:

```bash
OPENSPG_AUTO_LOGIN=1 \
OPENSPG_LOGIN_FILE=/etc/erp-kb-openspg-login.env \
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie \
node scripts/run_knowledge_inbox_pipeline.mjs --kb ComarchBetterflyReference --export --build
```

For the preferred review/build/test flow after accepting a draft:

```bash
OPENSPG_AUTO_LOGIN=1 \
OPENSPG_LOGIN_FILE=/etc/erp-kb-openspg-login.env \
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie \
node scripts/process_knowledge_inbox.mjs \
  --promote <draft_id> \
  --build \
  --test-size 20 \
  --freshness \
  --note "source checked" \
  --by "<operator>"
```

Desktop clients using only `ERP_KB_HTTP_TOKEN` can read/search and also call
`submit_knowledge_draft` or `draft_external_source`. If
`ERP_KB_HTTP_WRITE_TOKEN` is configured, the bridge accepts it as an alternate
write credential, but it is not required by the current client flow.

Source freshness can also be checked directly:

```bash
cd /docker/openspg
node scripts/source_freshness_report.mjs --stale-days 14
```

The current deployment uses one bearer token for all tools. That keeps desktop
setup simple, but it means every client with the token can create local inbox
drafts. Rotate the token if it was shared too broadly.

## Community News in MCP answers

`answer_question` and `route_question` already use the same local routing and
artifact scanner as:

```bash
node scripts/erp_knowledge_answer.mjs "..."
```

That means `ComarchCommunityNews` becomes visible to MCP automatically after:

1. refreshing `downloads/community_news/`
2. regenerating `exports/community_news/v1/*.csv`
3. keeping `scripts/erp_knowledge_assistant.mjs` and
   `docs/reference/ERP_Knowledge_Assistant_Routing.json` in sync

The current one-command refresh is:

```bash
cd /docker/openspg
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie \
OPENSPG_PROJECT_ID=11 \
node scripts/refresh_comarch_community_news.mjs
```

If you only want to refresh local files without OpenSPG builder jobs:

```bash
cd /docker/openspg
OPENSPG_BUILD=0 node scripts/refresh_comarch_community_news.mjs
```

## Exa-backed external search

The assistant can now use Exa as:

1. a live fallback for `answer_question`
2. an explicit MCP search tool
3. a draft source for later KB review/promotion

Current behavior:

- `answer_question` remains KB-first
- Exa is only used when local evidence is weak or the question looks time-sensitive
- external evidence is always labeled and cited with source URLs
- external results are never written directly into OpenSPG

Configuration modes:

- `EXA_PROVIDER=auto` -> prefer API, then MCP
- `EXA_PROVIDER=api` -> use Exa HTTP API
- `EXA_PROVIDER=mcp` -> use an external Exa MCP server command

API mode:

```bash
export EXA_PROVIDER=api
export EXA_API_KEY='<real-exa-key>'
```

Optional API settings:

- `EXA_API_URL` default `https://api.exa.ai/search`
- `EXA_DEFAULT_NUM_RESULTS` default `5`

MCP mode:

```bash
export EXA_PROVIDER=mcp
export EXA_MCP_COMMAND='node /path/to/exa-mcp-server.js'
```

Optional MCP settings:

- `EXA_MCP_TOOL_NAME` default `search`
- `EXA_MCP_QUERY_ARG` default `query`
- `EXA_MCP_LIMIT_ARG` default `numResults`
- `EXA_MCP_DOMAINS_ARG` default `includeDomains`

CLI helpers:

```bash
node scripts/search_external_sources.mjs "Czy były ostatnio newsy o Comarch Betterfly?" --kb ComarchCommunityNews
node scripts/discover_external_sources.mjs --kbName "Comarch Betterfly Reference" --kbNamespace ComarchBetterflyReference --query "Comarch Betterfly KSeF API" --limit 2
```

Deployment samples:

- systemd unit:
  - `docs/reference/ERP_Knowledge_Assistant_MCP_HTTP_Bridge.systemd`
- nginx reverse proxy:
  - `docs/reference/ERP_Knowledge_Assistant_MCP_HTTP_Bridge.nginx.conf`
- full intranet rollout checklist:
  - `docs/reference/ERP_Knowledge_Assistant_MCP_Intranet_Deployment.md`
- client configuration templates:
  - `docs/reference/ERP_Knowledge_Assistant_MCP_Client_Configs.md`
- example environment file:
  - `docs/reference/ERP_Knowledge_Assistant_MCP_HTTP_Bridge.env.example`
- smoke-test script:
  - `scripts/test_erp_knowledge_mcp_http_bridge.mjs`
- full preflight script:
  - `scripts/preflight_erp_knowledge_mcp_http_bridge.mjs`

## Codex over HTTP

Register a streamable HTTP MCP endpoint:

```bash
codex mcp add erp-kb-http \
  --url http://mcp-host:3400/mcp \
  --bearer-token-env-var ERP_KB_HTTP_TOKEN
```

Then export the token in the desktop session that launches Codex:

```bash
export ERP_KB_HTTP_TOKEN='replace-me'
```

## Claude Desktop over HTTP

If your Claude Desktop build supports HTTP MCP servers, point it at the same
private URL and send the same bearer token. The exact JSON key names differ
between Claude builds, so treat the transport model as:

- URL: `http://mcp-host:3400/mcp`
- header: `Authorization: Bearer ...`

If your Claude build does not support HTTP MCP yet, use the SSH/stdio model
instead of exposing this bridge publicly.

## Reverse proxy recommendation

For intranet rollout, prefer:

1. bridge bound on localhost
2. reverse proxy on the host
3. TLS on the proxy
4. IP allowlist or internal SSO in front of the proxy

Do not publish the bridge directly to the public internet.

## Registered local server

The server is now also registered in local Codex MCP config as:

- `erp-kb`

Registration command:

```bash
codex mcp add erp-kb --env ROOT=/docker/openspg -- node /docker/openspg/scripts/erp_knowledge_mcp_server.mjs
```

Verification:

```bash
codex mcp list
```

The current expected entry is:

- `erp-kb` -> `node /docker/openspg/scripts/erp_knowledge_mcp_server.mjs`

## Design note

This MCP server is intentionally local and lightweight.

It does not:

- query OpenSPG directly
- implement a second retrieval engine
- fetch live business data
- expose MCP resources beyond an empty compatibility list

It wraps the already verified assistant layer:

- `scripts/erp_knowledge_assistant.mjs`
- `scripts/erp_knowledge_answer.mjs`
- `scripts/run_community_thread_test.mjs`

## Safety

- no credentials are stored in the server
- Betterfly remains metadata-only
- the bridge exposes local KB guidance, not tenant data
