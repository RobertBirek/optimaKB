# ERP Knowledge Assistant Exa Search

Date: `2026-06-03`

## Purpose

This layer adds external web search above the local ERP KB set without turning
the assistant into a web-only answer engine.

## Design

- local KB remains first
- Exa is used only as fallback for weak or time-sensitive questions
- external evidence is always labeled and cited
- external discoveries go to the knowledge inbox, not directly to OpenSPG

## Current integration points

- answer layer:
  - `scripts/erp_knowledge_answer.mjs`
- MCP tools:
  - `search_external_sources`
  - `draft_external_source`
- adapter:
  - `scripts/lib/external_search.mjs`
  - `scripts/lib/external_search_policy.mjs`

## Provider modes

### API

Required:

```bash
export EXA_PROVIDER=api
export EXA_API_KEY='<real-exa-key>'
```

Official Exa API reference used for this implementation:

- `POST /search`
- `includeDomains`
- `numResults`
- `contents.summary / contents.highlights / contents.text`

Source:

- `https://exa.ai/docs/reference/search`

### MCP

Required:

```bash
export EXA_PROVIDER=mcp
export EXA_MCP_COMMAND='node /path/to/exa-mcp-server.js'
```

Defaults assume the Exa MCP tool is called `search` and accepts:

- `query`
- `numResults`
- `includeDomains`

If your MCP server uses different names, override:

- `EXA_MCP_TOOL_NAME`
- `EXA_MCP_QUERY_ARG`
- `EXA_MCP_LIMIT_ARG`
- `EXA_MCP_DOMAINS_ARG`

## Source trust policy

The current trust tiers are:

1. `official`
   - `pomoc.comarch.pl`
   - `pomoc.comarchbetterfly.pl`
   - `comarch.pl`
   - `comarchbetterfly.pl`
2. `community`
   - `spolecznosc.comarch.pl`
3. `third_party`
   - everything else

Ranking prefers:

1. higher trust tier
2. preferred domains for the routed KB
3. newer publication date

Runtime fallback for `answer_question` uses only `official` and `community`
sources. `third_party` remains available through explicit external search tools
and manual review workflows.

## Draft policy

Exa-discovered material can be stored as inbox drafts with metadata:

- `discoveredVia=exa`
- `exaQuery`
- `sourceTier`
- `retrievedAt`

That keeps review and promotion inside the existing KB workflow.

## Auto-draft mode

Optional automatic draft creation is available during fallback answers when:

- `EXA_AUTO_DRAFT=1`
- the selected source tier is `official` or `community`

In that mode, `answer_question` writes one controlled inbox draft from the top
Exa fallback result. Draft creation is still deduplicated against pending and
promoted drafts, and it still uses the inbox rather than writing directly to
OpenSPG.
