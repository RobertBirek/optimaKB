# Comarch Optima Partner Technical KB Seed

## Scope

This KB is a partner-only technical knowledge layer for `Comarch ERP Optima`.

It is intentionally separate from:

- `ComarchOptimaSchema` - MSSQL structure KB
- `ComarchOptimaAdditionalFunctions` - additional functions KB
- `ComarchOptimaSprint` - print and report KB
- `ComarchOptimaReference` - public official documentation KB

It must not ingest live business rows or customer operational data.

## Primary source

- Partner portal:
  `https://partner.erp.comarch.pl/`
- Product root:
  `https://partner.erp.comarch.pl/kategoria/comarch-erp-optima/`

This corpus requires authenticated access.

## Audit result

The first authenticated audit is recorded in:

- `docs/reference/ComarchOptimaPartnerTechnical.audit.md`

That audit showed:

- the technical corpus is primarily `WordPress media`, not only article pages
- categories and version bands are first-class organizing concepts
- current vs archived material should be modeled explicitly
- some partner materials overlap thematically with existing KBs and should stay
  route-first instead of being ingested as duplicated content

## Seed entity plan

- `ReferenceDocument`
  - audit record
  - root portal references
  - future partner technical landing pages
- `PartnerCategory`
  - portal category tree for Optima technical areas
- `PartnerAsset`
  - partner-hosted downloadable items such as:
    - `zip`
    - `pdf`
    - `xlsx`
    - future technical documents and helper packages
- `AssetType`
  - normalized asset families such as:
    - version package
    - schema pack
    - XML manual
    - driver
    - service tool
    - accounting macro pack
- `VersionBand`
  - extracted version families and lifecycle state:
    - current
    - archived
- `ProductArea`
  - partner technical areas aligned to later usage:
    - database structure
    - additional functions
    - helper files
    - accounting macros
    - drivers
    - XML structures
    - technical documentation
- `KnowledgeRoute`
  - explicit routing into:
    - `ComarchOptimaSchema`
    - `ComarchOptimaAdditionalFunctions`
    - `ComarchOptimaSprint`
- `CfgEntry`
  - partner technical configuration dictionaries extracted from `Dictionaries_*.zip`
- `ProcEntry`
  - procedure dictionaries extracted from `Dictionaries_*.zip`
- `MsgEntry`
  - message catalogs extracted from `Dictionaries_*.zip`
- `ComExample`
  - implementation examples extracted from `Przyklady-uzycia-obiektow-COM-*`
- `ComInterfaceUse`
  - normalized interface usage extracted from COM example metadata and runtime object creation
- `ComSchemaTouchpoint`
  - explicit bridges from partner COM examples into `ComarchOptimaSchema`
- `ComModuleRecipe`
  - curated module-level implementation recipes derived from COM examples,
    interface usage, schema touchpoints, and partner dictionaries
  - enriched in the recipe summary with XML/XPT and accounting-macro hints from partner technical assets
- `Chunk`
  - retrieval chunks over:
    - audit text
    - category summaries
    - asset metadata previews
    - selected local PDF and ZIP extracts

## Ingestion policy

Use a metadata-first approach.

Order:
1. category catalog
2. media catalog
3. selective technical downloads
4. optional text extraction from PDFs
5. selective archive unpacking for text-bearing files
6. structured parsing of high-value extracted assets such as `Dictionaries_*.zip`
7. structured parsing of `Przyklady-uzycia-obiektow-COM-*` into examples, interfaces, and schema touchpoints
8. module-level recipe synthesis over COM examples and partner dictionaries
9. targeted XML/XPT pattern extraction from helper/XML assets
10. targeted accounting-macro guide extraction from HTML macro packs

Do not start with blind full-site mirroring.

## Anti-duplication policy

This KB is not allowed to become a second copy of:

- `ComarchOptimaSchema`
- `ComarchOptimaAdditionalFunctions`
- `ComarchOptimaSprint`

Therefore:

- keep partner assets as metadata and provenance first
- use explicit routing for overlapping areas
- avoid deep retrieval chunking for assets that clearly belong to an existing
  specialist KB

Route-first areas:

- `Struktura baz danych` -> `ComarchOptimaSchema`
- `Funkcje dodatkowe` -> `ComarchOptimaAdditionalFunctions`

Selective retrieval areas:

- `Struktura plików XML`
- `Sterowniki`
- `Makra księgowe`
- `Pliki pomocnicze`
- partner technical materials that do not already exist in a richer local KB

## Initial category focus

- `Struktura baz danych`
- `Funkcje dodatkowe`
- `Pliki pomocnicze`
- `Makra księgowe`
- `Sterowniki`
- `Struktura plików XML`
- `Aktualna dokumentacja techniczna działa z Comarch ERP Optima`
- `Archiwalna dokumentacja techniczna działa z Comarch ERP Optima`

## Extension policy

When the local partner snapshot grows, extend the KB with:

- more `PartnerAsset` rows from partner media
- more `ReferenceDocument` rows from partner pages and bulletins
- richer `VersionBand` normalization
- more `KnowledgeRoute` rows into the specialist Optima KBs
- later optional artifact-specific entities if the downloaded corpus justifies them

Before widening retrieval or downloading asset bodies, first verify that the new
material is not already better represented in:

- `ComarchOptimaSchema`
- `ComarchOptimaAdditionalFunctions`
- `ComarchOptimaSprint`

Keep this KB technical. Do not merge pricing, offers, promotions, or formal sales paperwork here.
