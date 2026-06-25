# ERP Knowledge Assistant Blueprint

Date: `2026-06-01`

## Goal

Build one assistant layer over the current KB set instead of forcing the user to
choose a KB manually.

The assistant is not a new domain KB.

It is a routing and answering layer over:

- `ComarchOptimaSchema`
- `ComarchOptimaBusinessSemantics`
- `ComarchOptimaAdditionalFunctions`
- `ComarchOptimaSprint`
- `ComarchOptimaReference`
- `ComarchOptimaPartnerTechnical`
- `ComarchBetterflyReference`

## Why Now

The current project has moved past infrastructure work.

Cross-KB audits already show:

- the KB set is usable
- the main missing layer is routing and unified entry

Relevant prior artifacts:

- `docs/reference/ComarchKB_Global_Audit.md`
- `docs/reference/ComarchKB_CrossKB_Practical_Test.md`

## Assistant Scope

The assistant should answer four classes of questions:

1. structural SQL and schema questions
2. Optima implementation questions
3. business meaning, code label, and rule questions
4. print/report questions
5. Betterfly API questions

It should also handle vague entry questions such as:

- `where do I start?`
- `which KB should answer this?`
- `what mechanism should I choose?`

## Source of Truth by Question Type

### Schema and SQL

Primary KB:

- `ComarchOptimaSchema`

Typical questions:

- joins
- table roles
- SQL objects that read or write a table
- triggers, views, functions, procedures
- dependencies between schema objects

### Business semantics and code meanings

Primary KB:

- `ComarchOptimaBusinessSemantics`

Support KB:

- `ComarchOptimaSchema`

Typical questions:

- code-to-label mappings
- business descriptions
- rule meanings
- validation semantics
- domain/value dictionaries

### Additional Functions and COM

Primary KB:

- `ComarchOptimaAdditionalFunctions`

Support KB:

- `ComarchOptimaPartnerTechnical`

Typical questions:

- when to use FD versus user columns
- COM examples
- implementation recipes
- configuration/procedure/message context

### Sprint and prints

Primary KB:

- `ComarchOptimaSprint`

Support KBs:

- `ComarchOptimaSchema`
- `ComarchOptimaAdditionalFunctions`

Typical questions:

- report SQL patterns
- report workflow
- data source selection
- diagnostics
- print technology family

### Official Optima docs and onboarding

Primary KB:

- `ComarchOptimaReference`

Typical questions:

- module onboarding
- official docs navigation
- updates
- generic product usage questions

### Partner-only technical material

Primary KB:

- `ComarchOptimaPartnerTechnical`

Support KBs:

- `ComarchOptimaSchema`
- `ComarchOptimaAdditionalFunctions`
- `ComarchOptimaSprint`

Typical questions:

- partner procedures/messages/config dictionaries
- COM sample archives
- technical packages
- unique partner-only materials

### Betterfly API

Primary KB:

- `ComarchBetterflyReference`

Typical questions:

- auth flow
- endpoint families
- versioning
- write-side workflow
- payments, invoices, prints

## Routing Rules

### Hard routes

Use these as primary deterministic routes:

- mentions of `TraNag`, `TraElem`, `Kontrahenci`, `Towary`, `SQL`, `join`,
  `trigger`, `view`, `function`, `procedure`, `schema` -> `ComarchOptimaSchema`
- mentions of `znaczy`, `oznacza`, `reprezentuje`, `kod`, `słownik`,
  `wartości`, `reguła biznesowa`, `walidacja`, `opis biznesowy` ->
  `ComarchOptimaBusinessSemantics`
- mentions of `funkcja dodatkowa`, `FD`, `COM`, `okno logowania`, `dodaj operatora`,
  `user column`, `kolumna użytkownika` -> `ComarchOptimaAdditionalFunctions`
- mentions of `sPrint`, `wydruk`, `GenRap`, `szablon`, `parametry dynamiczne`,
  `RO_GetReportHeader`, `RO_GetReportContent` -> `ComarchOptimaSprint`
- mentions of `jak zacząć`, `gdzie w dokumentacji`, `oficjalna dokumentacja`,
  `aktualizacja`, `instrukcja`, `moduł` -> `ComarchOptimaReference`
- mentions of `partner`, `makra`, `Dictionaries`, `procedures.csv`,
  `messages.csv`, `Przyklady-uzycia-obiektow-COM` -> `ComarchOptimaPartnerTechnical`
- mentions of `Betterfly`, `api2`, `token`, `Bearer`, `customers`, `products`,
  `invoices`, `payments`, `paymentdetails`, `print` with Betterfly context
  -> `ComarchBetterflyReference`

### Multi-KB routes

Use blended answers for:

- print SQL + joins:
  - `ComarchOptimaSprint` + `ComarchOptimaSchema`
- FD implementation touching database tables:
  - `ComarchOptimaAdditionalFunctions` + `ComarchOptimaSchema`
- partner COM example plus implementation choice:
  - `ComarchOptimaPartnerTechnical` + `ComarchOptimaAdditionalFunctions`
- vague Optima business-area entry:
  - start with `ComarchOptimaReference`, then route to specialist KB

## Answer Contract

Every assistant answer should follow this shape:

1. direct answer
2. primary KB used
3. support KBs used if any
4. concrete artifacts or routes
5. explicit uncertainty if corpus is weak

Example structure:

- `Answer`
- `Primary KB`
- `Support KB`
- `Relevant artifacts`
- `Gap or next step`

## Retrieval Discipline

The assistant should not search all KBs equally for every question.

That leads to noisy answers.

Use this order:

1. classify intent
2. pick one primary KB
3. optionally pull one or two support KBs
4. answer from the smallest sufficient set

## Fallback Logic

### If the question is vague

Start with:

- `ComarchOptimaReference`

Then route into:

- `Schema`
- `AdditionalFunctions`
- `Sprint`

### If the question mixes implementation and data structure

Start with:

- `AdditionalFunctions` or `Sprint`

Then enrich from:

- `Schema`

### If the question is partner-specific

Start with:

- `PartnerTechnical`

Only pull:

- `Schema`
- `AdditionalFunctions`
- `Sprint`

when the answer needs object-level grounding.

### If the question is Betterfly

Keep the answer inside:

- `ComarchBetterflyReference`

Do not mix it with Optima KBs unless the question is explicitly integration-wide.

## Known Gaps

### Sprint

Still weaker on:

- real `.sp` artifacts
- concrete customer-side print definitions

### PartnerTechnical

Still depends on:

- selective retrieval of unique partner assets
- avoiding duplication with other Optima KBs

### AdditionalFunctions and Sprint compressed definitions

Readable manual exports are already integrated, but:

- compressed `WDR_DEFINICJA` bodies are still not decoded

This is not a blocker for routing, but it matters for deepest template-level
answers.

## Recommended First Implementation

Phase 1:

- keep this as a rule-based routing layer
- do not build a learned classifier yet

Phase 2:

- expose it either:
  - as an OpenSPG application prompt/playbook
  - or through MCP-backed assistant logic

Phase 3:

- test against real questions
- only then refine routes and answer contract

## Minimal Deliverables

To consider the assistant layer real, not conceptual, the project should keep:

1. this blueprint
2. a machine-readable routing spec
3. a question test set
4. a short operator runbook for using the assistant

## Recommended Next Step

Implement the routing spec as the first operational artifact.
