# Comarch Optima Reference KB Seed

## Scope

This KB is the general official-reference layer for Comarch ERP Optima.

It is intentionally separate from:

- `ComarchOptimaSchema` - MSSQL structure and SQL-object KB
- `ComarchOptimaAdditionalFunctions` - additional functions KB
- `ComarchOptimaSprint` - Sprint and prints KB

This KB must remain documentation-only. It must not ingest live business rows
or sensitive operational data from Optima databases.

## Primary references

### Official help

- Root help site:
  `https://pomoc.comarch.pl/optima/pl/2026/`
- Key structured sources:
  - `wp-sitemap-posts-ht_kb-1.xml`
  - `wp-sitemap-posts-ht_kb-2.xml`
  - `wp-sitemap-taxonomies-ht_kb_category-1.xml`

### Local snapshot

Official source snapshots for this KB are stored under:

- `downloads/official/optima_reference/sitemaps/`
- `downloads/official/optima_reference/pages/`

The local snapshot currently includes:

- article sitemaps
- category sitemap
- selected printable pages for:
  - onboarding
  - administration
  - general program areas
  - module entry pages
  - SQL and reporting entry points
  - current update page

## Seed entity plan

- `ReferenceDocument`
  - official help articles and selected locally snapshotted pages
- `HelpCategory`
  - official category taxonomy from `ht_kb_category` sitemap
- `ModuleArea`
  - curated module entry points and how to use them
- `VersionTopic`
  - official update streams and release-note entry points
- `LearningGuide`
  - practical start paths through the official help
- `KnowledgeRoute`
  - explicit bridge from this KB into:
    - `ComarchOptimaSchema`
    - `ComarchOptimaAdditionalFunctions`
    - `ComarchOptimaSprint`
- `EntryGuide`
  - curated first-stop entry points for the most common official help intents
- `Chunk`
  - section-level retrieval over selected local printable pages

## Design decisions

1. Use the official help sitemap as the broad coverage layer.
2. Use selected local printable-page snapshots as the retrieval layer.
3. Keep document summaries compact; do not try to mirror the entire website body
   into OpenSPG in one pass.
4. Treat this KB as the first stop for orientation and official terminology.
   Route deeper SQL, additional-function, and Sprint work to the dedicated KBs.

## Extension policy

When the official help coverage expands, extend this KB by:

- refreshing the sitemap snapshot
- adding new printable pages for high-value module entry points
- widening `LearningGuide` and `KnowledgeRoute`
- adding more chunks only for pages that materially improve retrieval

Do not mix Google Drive project corpora into this KB. Keep it official-doc
centric.
