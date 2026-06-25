# Comarch Betterfly Reference KB Seed

## Scope

This KB is the official Betterfly documentation layer with explicit emphasis on
the public API.

It must remain documentation-only. It must not ingest live business rows or
sensitive operational data from Betterfly accounts.

## Primary references

### Official help

- root help site:
  `https://pomoc.comarchbetterfly.pl/`
- API category:
  `https://pomoc.comarchbetterfly.pl/kategorie/api/`
- API general information:
  `https://pomoc.comarchbetterfly.pl/dokumentacja/api-informacje-ogolne/`

### Local snapshot

Official source snapshots for this KB are stored under:

- `downloads/official/betterfly_reference/pages/`
- `downloads/official/betterfly_reference/meta/`
- `docs/reference/ComarchBetterflyReference.live_probe.md`
- `docs/reference/ComarchBetterflyReference.contract_notes.md`
- `docs/reference/ComarchBetterflyReference.write_notes.md`

The local snapshot should prioritize:

- API overview
- authentication and user guide
- filtering, pagination, and change history
- archived version pages where Betterfly still documents active legacy endpoint
  families used in older integrations, especially `v1.4`
- major document resources:
  - products
  - customers
  - payment types
  - bank accounts
  - payments
  - invoices
  - proformas
  - advance invoices
  - purchase invoices
  - VAT margin invoices
  - corrective invoices
  - VAT purchase register
  - prints
- Betterfly / ERP XT naming-transition context

## Seed entity plan

- `ReferenceDocument`
  - official Betterfly help articles and key local snapshots
- `HelpCategory`
  - Betterfly help entry categories used in this KB
- `ModuleArea`
  - curated work areas, especially API onboarding and document flows
- `ApiResource`
  - normalized API resources and endpoint families
- `ApiPattern`
  - concrete method/endpoint usage patterns
- `LearningGuide`
  - practical start paths for API onboarding
- `KnowledgeRoute`
  - explicit route layer inside this KB for API-first versus orientation-first use
- `EntryGuide`
  - curated first-stop entry points for common Betterfly questions
- `Chunk`
  - retrieval chunks over high-value official pages

## Design decisions

1. Treat Betterfly API as a first-class retrieval surface, not just a tag on
   generic help articles.
2. Keep `ReferenceDocument` broad enough for orientation, but move concrete API
   usage into `ApiResource` and `ApiPattern`.
3. Prefer canonical official pages and local snapshots over hand-written notes.
3a. Safe live API metadata validation is allowed only for auth flow, endpoint
    availability, versioning, and response-envelope behavior. Do not persist
    business payloads from a Betterfly tenant.
4. Keep this KB self-contained instead of routing into the Optima KB family.
5. Preserve Betterfly / Comarch ERP XT legacy naming where it matters for old
   API articles and versioned endpoints.

## Extension policy

When Betterfly docs expand, extend this KB by:

- downloading new API and release pages into the local snapshot
- widening `ApiResource` and `ApiPattern`
- adding curated guides only where they materially improve retrieval

Do not mix partner-only or private customer materials into this KB unless a
separate Betterfly partner KB is created later.
