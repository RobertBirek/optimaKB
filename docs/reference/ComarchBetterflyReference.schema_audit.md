# Comarch Betterfly Reference KB Schema Audit

Date: `2026-05-25`

## Objective

Design a Betterfly-only KB around the official Betterfly help center with
special emphasis on the public API.

## Sources audited

Local snapshot under:

- `downloads/official/betterfly_reference/pages/`

Key audited pages include:

- root help page
- `Spis treści`
- API category page
- API general information
- API user guide
- API authentication
- API filtering
- API change history
- API document resources and payments resources
- Betterfly / Comarch ERP XT transition article

## Findings

1. The Betterfly help center is article-centric, but the API section is
   structurally rich enough to justify dedicated API entities.
2. The API docs are stable official prose, not raw OpenAPI specs.
3. Endpoint examples are embedded directly inside article content and can be
   extracted reliably with lightweight regex patterns.
4. Resource semantics are visible from page titles, canonical URLs, endpoint
   families, and repeated example sections.
5. Legacy naming still matters:
   - Betterfly is described in some pages as former `Comarch ERP XT`
   - API versions such as `v1.2`, `v1.4`, `v1.5` coexist in the docs

## Resulting schema decision

Use a reference-style KB plus an API layer:

- `ReferenceDocument`
- `HelpCategory`
- `ModuleArea`
- `ApiResource`
- `ApiPattern`
- `LearningGuide`
- `KnowledgeRoute`
- `EntryGuide`
- `Chunk`

This is intentionally lighter than a full API-contract model. The goal is
retrieval and implementation guidance, not request validation or codegen.

## Rejected alternatives

### Reuse Optima Reference schema unchanged

Rejected because it would hide the most valuable Betterfly-specific signal:
public API resources, versions, and method patterns.

### Full endpoint-per-operation schema with request/response fields

Rejected for now because the source material is article prose rather than a
strict machine-readable specification. It would add model noise before proving
retrieval value.

## Current recommendation

Build `ComarchBetterflyReference` as an official-doc KB with:

- broad article coverage through `ReferenceDocument`
- explicit API resource catalog through `ApiResource`
- method/example guidance through `ApiPattern`
- curated onboarding through `LearningGuide` and `EntryGuide`
