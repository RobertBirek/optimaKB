# Comarch KB Global Audit

Date: `2026-05-31`

This document is the current cross-KB audit for the OpenSPG knowledge-base set in
this workspace. It evaluates the active KBs by practical usefulness, coverage,
strengths, gaps, and recommended next step.

It is not a schema-design note. It is an operational quality audit.

## Scope

Active KBs covered:

- `ComarchOptimaSchema`
- `ComarchOptimaAdditionalFunctions`
- `ComarchOptimaSprint`
- `ComarchOptimaReference`
- `ComarchOptimaPartnerTechnical`
- `ComarchOptimaBusinessSemantics`
- `ComarchBetterflyReference`

## Executive Summary

Current state:

- The KB layer is already usable.
- The project is no longer in an infrastructure phase.
- The main remaining work is:
  - real question testing,
  - routing across KBs,
  - optional assistant/app layer on top.

Overall assessment by KB:

- `ComarchOptimaSchema` -> `READY`
- `ComarchOptimaAdditionalFunctions` -> `READY`
- `ComarchOptimaSprint` -> `GOOD`
- `ComarchOptimaReference` -> `READY`
- `ComarchOptimaPartnerTechnical` -> `GOOD`
- `ComarchOptimaBusinessSemantics` -> `READY`
- `ComarchBetterflyReference` -> `READY`

Interpretation:

- `READY` means the KB already supports real work in its intended domain.
- `GOOD` means the KB is useful and stable, but still benefits from more real
  corpus or more direct question-driven tuning.

## 1. ComarchOptimaSchema

Project:

- name: `Comarch Optima ERP MSSQL Schema`
- namespace: `ComarchOptimaSchema`
- project id: `4`

Primary purpose:

- analyze Optima MSSQL structure
- design SQL
- identify tables, joins, dependencies, procedures, functions, triggers

Current strengths:

- broad schema coverage for `CDN_TEST` and `CDN_KNF_Konfiguracja`
- helper layer for:
  - table roles
  - curated join paths
  - SQL object guidance
  - object dependencies
- safe handling of large SQL definitions through:
  - `definitionPreview`
  - `definitionHash`
  - `definitionLength`

Representative question types already covered well:

- how to join document header, lines, product, contractor
- which SQL objects read/write selected tables
- which procedures/functions touch a business area
- where a table sits in the schema and how it relates to nearby objects

Assessment:

- `READY`

Main remaining gaps:

- no dedicated assistant/routing layer on top
- still no materialized custom relation graph from raw schema DSL, so some
  semantics are carried through helper entities instead of native relations

Recommendation:

- use this as the primary KB for table, join, and SQL-object questions

## 2. ComarchOptimaAdditionalFunctions

Project:

- name: `Comarch Optima Additional Functions`
- namespace: `ComarchOptimaAdditionalFunctions`
- project id: `6`

Primary purpose:

- implementation guidance for Additional Functions
- examples
- COM usage
- support for deciding between function, SQL reuse, and user-column style
  mechanisms

Current strengths:

- local corpus from Google Drive is ingested and audited
- implementation examples and COM interfaces are present
- large dictionary layers exist for:
  - configuration
  - procedures
  - messages
- mapping bridge to `ComarchOptimaSchema`
- curated implementation guides and module recipes

Representative question types already covered well:

- when to use Additional Function vs User Column
- which examples touch a given module or area
- which COM interfaces appear in examples
- which schema objects are relevant for a specific example class

Assessment:

- `READY`

Main remaining gaps:

- retrieval chunk volume is still relatively small compared to the size of the
  artifact corpus
- some value is still in source files and dictionaries rather than elevated into
  more opinionated guides

Recommendation:

- use this KB for implementation-choice and example-seeking questions
- extend it only in response to real user questions, not broad blind expansion

## 3. ComarchOptimaSprint

Project:

- name: `Comarch Optima Sprint and Prints`
- namespace: `ComarchOptimaSprint`
- project id: `7`

Primary purpose:

- prints and Sprint reporting
- SQL/report patterns
- workflow and diagnostic guidance

Current strengths:

- explicit layers for:
  - SQL patterns
  - workflows
  - print options
  - template features
  - diagnostic cases
  - glossary
  - schema touchpoints
  - module recipes

Representative question types already covered reasonably well:

- which SQL patterns are used for report data sources
- how header/content patterns are structured
- where diagnostic problems tend to appear
- which schema areas matter for a class of report

Assessment:

- `GOOD`

Why not `READY` yet:

- current corpus is still more documentation-first than artifact-first
- this KB will become materially stronger when real `.sp` files, richer report
  definitions, or more concrete customer-side print examples are added

Recommendation:

- use it now for pattern and workflow questions
- strengthen it later with real Sprint artifacts where available

## 4. ComarchOptimaReference

Project:

- name: `Comarch Optima Reference`
- namespace: `ComarchOptimaReference`
- project id: `8`

Primary purpose:

- broad official documentation reference
- category/module routing
- entry layer into the specialized Optima KBs

Current strengths:

- large official document corpus
- category coverage
- module areas
- version topics
- curated guides and entry guides
- explicit knowledge routing to specialist KBs

Representative question types already covered well:

- where to start in official docs for a module or topic
- which KB should answer a given class of question
- where release/update or onboarding material lives

Assessment:

- `READY`

Main remaining gaps:

- it is intentionally not the deepest KB for implementation or schema work
- value depends on good routing, not on dense specialist knowledge

Recommendation:

- use it as the first-stop documentation KB, not as the final answer source for
  technical deep dives

## 5. ComarchOptimaPartnerTechnical

Project:

- name: `Comarch Optima Partner Technical`
- namespace: `ComarchOptimaPartnerTechnical`
- project id: `9`

Primary purpose:

- partner-only technical material
- unique assets
- dictionaries
- procedure/message/config catalogs
- COM examples and module recipes

Current strengths:

- metadata-first partner asset catalog with provenance
- anti-duplication policy against other Optima KBs
- parsed dictionary layers:
  - `CfgEntry`
  - `ProcEntry`
  - `MsgEntry`
- COM example layer
- COM schema touchpoints
- module-level recipes
- selective real-content ingestion from downloaded partner assets

Representative question types already covered reasonably well:

- which partner assets exist for a product area/version
- which COM examples exist for a module
- which procedures/messages/configuration entries appear in partner dictionaries
- which partner examples touch schema objects in Optima

Assessment:

- `GOOD`

Why not `READY` yet:

- some partner assets still depend on selective authenticated retrieval and are
  not uniformly materialized
- this KB is intentionally constrained by anti-duplication rules, so it is more
  of a technical enrichment/routing KB than a universal source

Recommendation:

- use it for partner-only technical material, dictionaries, and COM examples
- keep expanding only unique content, not overlapping public/reference content

## 6. ComarchOptimaBusinessSemantics

Project:

- name: `Comarch Optima Business Semantics`
- namespace: `ComarchOptimaBusinessSemantics`
- project id: `15`

Primary purpose:

- map business meaning onto the schema KB
- expose code-to-label pairs
- store business descriptions and business rules

Current strengths:

- dense `code_meaning`, `business_description`, and `business_rule` coverage
- direct link to schema refs through `tableRefId` and `columnRefId`
- useful for questions about meanings, labels, domain values, and validation

Representative question types already covered well:

- what does this code mean
- which labels map to a column value
- what business rule applies to this table or column
- what domain/value dictionary explains this field

Assessment:

- `READY`

Recommendation:

- use this as the primary KB for meaning, label, and rule questions that are not schema-only

## 7. ComarchBetterflyReference

Project:

- name: `Comarch Betterfly Reference`
- namespace: `ComarchBetterflyReference`
- project id: `10`

Primary purpose:

- official Betterfly documentation
- Betterfly API reference and implementation guidance
- metadata-only live validation notes

Current strengths:

- API-focused extraction instead of generic article scraping
- explicit layers for:
  - `ApiResource`
  - `ApiPattern`
  - `LearningGuide`
  - `EntryGuide`
- verified metadata-only live behavior notes
- archived API pages for legacy version families
- curated contract and write-side notes
- explicit usability test already recorded locally

Representative question types already covered well:

- token flow and authentication
- versioned vs unversioned endpoint families
- envelope shape and response expectations
- filtering/paging
- payments vs paymentdetails
- write-side and confirm/finalize flows
- print endpoint cautions

Assessment:

- `READY`

Main remaining gaps:

- no field-by-field endpoint contract layer yet
- no full error taxonomy
- intentionally avoids live tenant payload ingestion

Recommendation:

- use this KB now for Betterfly API onboarding and integration planning
- only widen it further in metadata-only mode

## Cross-KB Audit

### Overall architecture quality

Assessment:

- `GOOD`

What works:

- KB boundaries are now mostly coherent
- schema, implementation, reporting, public reference, partner technical, and
  Betterfly API are separated on purpose
- partner duplication risk has been explicitly controlled
- Betterfly live checks are constrained to metadata-only behavior

What still needs work:

- there is no single assistant/routing app yet
- real user-question audit across all KBs should happen next
- some KBs are stronger as corpora than as polished retrieval experiences

## Recommended Next Step

Do not build another KB first.

Do this next:

1. run a real question audit across all active KBs
2. capture failures and weak answers
3. only then decide whether to:
   - add corpus,
   - add guides,
   - or build a single assistant over all KBs

If a single next implementation target is needed, it should be:

- an `ERP Knowledge Assistant` application/routing layer over:
  - `ComarchOptimaSchema`
  - `ComarchOptimaBusinessSemantics`
  - `ComarchOptimaAdditionalFunctions`
  - `ComarchOptimaSprint`
  - `ComarchOptimaReference`
  - `ComarchOptimaPartnerTechnical`
  - `ComarchBetterflyReference`

## Practical Routing Rule

Use:

- `ComarchOptimaSchema` for tables, joins, SQL objects, dependencies
- `ComarchOptimaBusinessSemantics` for code meanings, labels, and business rules
- `ComarchOptimaAdditionalFunctions` for implementation patterns, COM, examples
- `ComarchOptimaSprint` for reports, SQL print patterns, diagnostics
- `ComarchOptimaReference` for official-doc navigation and orientation
- `ComarchOptimaPartnerTechnical` for partner-only technical assets and
  dictionaries
- `ComarchBetterflyReference` for Betterfly API and integration guidance
