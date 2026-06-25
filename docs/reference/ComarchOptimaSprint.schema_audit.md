# Comarch Optima Sprint Schema Audit

Date: `2026-05-23`

## Scope

This audit was performed against the local corpus downloaded from:

- `downloads/google_drive/sprint/`

The goal was to design a KB schema for Sprint and other Optima print
technologies based on the real downloaded materials, not only on one official
article.

## Corpus signals observed

The Sprint corpus is structured and documentation-heavy. It currently consists
mainly of markdown knowledge files rather than binaries or executable samples.

Observed source families:

- project-level Sprint KB:
  - `comarch-optima-sprint-kb.md`
  - `compass_artifact_..._markdown.md`
- modular KB files:
  - `KB-sprint-00-index.md`
  - `KB-sprint-01` through `KB-sprint-07`

Representative knowledge areas already present:

- technology comparison: `sPrint`, `Crystal`, `GenRap`, `XML`
- Optima print configuration workflow
- `.SP` import/export and safe cloning workflow
- template editor structure and controls
- SQL and MSSQL usage patterns
- diagnostics and logging
- version roadmap and training sources
- glossary

## What the corpus needs from the schema

The corpus is not only a bag of chunks. It contains several stable semantic
layers that deserve first-class entities:

1. print technologies and lifecycle status
2. operational workflows in Optima
3. important options and flags
4. template/report features
5. SQL patterns and anti-patterns
6. diagnostic scenarios
7. version changes
8. standard print catalog coverage
9. learning and source map
10. glossary
11. explicit links into the schema KB

Without those entities the KB would devolve into generic text retrieval and
would be much weaker for:

- deciding when to use Sprint vs legacy prints
- planning a change safely
- building SQL for a report
- troubleshooting common failures
- anchoring report work to real MSSQL objects

## Schema changes introduced

The active source-of-truth file introduces:

- `ReferenceDocument`
- `FileArtifact`
- `PrintTechnology`
- `PrintWorkflow`
- `PrintOption`
- `TemplateFeature`
- `SqlPattern`
- `DiagnosticCase`
- `VersionChange`
- `PrintCatalog`
- `LearningResource`
- `GlossaryTerm`
- `SchemaTouchpoint`
- `ModuleRecipe`
- `Chunk`

## Why this shape is appropriate

- `ReferenceDocument` and `FileArtifact` preserve provenance.
- `PrintTechnology` and `VersionChange` capture lifecycle and migration context.
- `PrintWorkflow`, `PrintOption`, and `TemplateFeature` support actual user work.
- `SqlPattern` and `SchemaTouchpoint` make the KB operationally useful for SQL design.
- `DiagnosticCase` supports troubleshooting without mixing in sensitive data.
- `PrintCatalog` and `ModuleRecipe` create practical retrieval surfaces.
- `GlossaryTerm` reduces ambiguity in future Q&A and app layers.

## Current limitation

The current local Sprint corpus contains no real exported `.sp` files and no
binary template bundles. The schema leaves room for those later through
`FileArtifact`, but the first build should stay documentation-focused.

## Recommended next step

1. create the dedicated OpenSPG project
2. push `ComarchOptimaSprint.schema`
3. stage CSV data from the local corpus and curated seed layers
4. run the builder
5. verify counts and preserve the process in repo memory
