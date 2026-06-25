# Comarch Optima Reference KB Schema Audit

Date: `2026-05-24`

## Scope

This audit was performed against the official Comarch ERP Optima help site:

- `https://pomoc.comarch.pl/optima/pl/2026/`

and the local snapshot stored under:

- `downloads/official/optima_reference/sitemaps/`
- `downloads/official/optima_reference/pages/`

## Corpus signals observed

The official help site has two distinct useful layers:

1. a broad sitemap/catalog layer
2. a smaller set of high-value article bodies that are useful for retrieval

The category sitemap exposes the global knowledge landscape:

- product modules
- configuration areas
- update streams
- integration topics
- FAQ clusters
- newer product areas such as `KSeF`, `IWD`, `OCR`, `ChatERP`

The article sitemaps expose:

- canonical article URLs
- article-level freshness through `lastmod`
- a wide surface of module, operational, and troubleshooting topics

The local printable pages expose:

- clean article titles
- readable section text
- practical content for chunk retrieval

## What the schema must cover

The general-reference KB must support:

1. official article lookup
2. official category and module navigation
3. version/update discovery
4. practical onboarding paths
5. routing into other specialized KBs
6. chunk retrieval from selected official pages
7. a curated first-stop layer for high-value entry points

## Schema design chosen

The active schema uses:

- `ReferenceDocument`
- `HelpCategory`
- `ModuleArea`
- `VersionTopic`
- `LearningGuide`
- `KnowledgeRoute`
- `EntryGuide`
- `Chunk`

## Why this is sufficient

- `ReferenceDocument` gives broad coverage over the official article surface.
- `HelpCategory` preserves the official taxonomy without scraping every page.
- `ModuleArea` turns the taxonomy into practical module-level entry points.
- `VersionTopic` isolates updates and release-oriented navigation.
- `LearningGuide` gives task-oriented starting paths.
- `KnowledgeRoute` prevents this KB from becoming a dead-end by routing users to
  the specialized Optima KBs when work becomes structural or implementation-heavy.
- `EntryGuide` provides a practical first-screen layer above the broad article corpus.
- `Chunk` provides retrieval quality over selected key pages without mirroring
  the entire help corpus.

## Deliberate exclusions

The schema does not currently model:

- every help page body as chunks
- binary assets from the official help site
- screenshots as first-class entities
- cross-page relational graphs inferred from breadcrumbs

Those can be added later if retrieval quality or navigation needs justify it.

## Recommended next step

1. create the KB in OpenSPG
2. build the current official sitemap plus selected-page snapshot set
3. verify that the KB is useful for:
   - module orientation
   - locating official articles
   - routing to `Schema`, `AdditionalFunctions`, and `Sprint`
