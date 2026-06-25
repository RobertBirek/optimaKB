# Comarch KB Cross-KB Practical Test

Date: `2026-05-31`

This document is the first practical cross-KB test after the build phase.

Goal:

- verify whether the current KB set answers real work questions
- identify the best KB for each question type
- identify the first concrete gaps worth fixing

Scoring:

- `PASS` -> current KBs should already support useful work on this question
- `PARTIAL` -> useful starting point exists, but likely needs more corpus or
  follow-up work
- `MISS` -> current KB set is not strong enough yet

## Test Set

### 1. How do I join a trade document header with lines and products in Optima?

- best KB: `ComarchOptimaSchema`
- support KBs: `ComarchOptimaSprint`
- result: `PASS`

Why:

- `ComarchOptimaSchema` contains curated join routes for:
  - document header -> lines
  - line -> product
  - header -> products via lines
- `ComarchOptimaSprint` adds reporting-oriented SQL patterns on top of that

### 2. Which tables and keys identify contractor context on a commercial document?

- best KB: `ComarchOptimaSchema`
- result: `PASS`

Why:

- this is a schema and join-path question
- the schema KB is the intended source for header/contractor linkage and object
  dependencies

### 3. Which SQL objects read or write `TraNag` and `TraElem`?

- best KB: `ComarchOptimaSchema`
- result: `PASS`

Why:

- this is directly covered by `ObjectDependency` and `SqlObjectGuide`

### 4. Which SQL objects touch `Kontrahenci`?

- best KB: `ComarchOptimaSchema`
- result: `PASS`

Why:

- same dependency/object-guidance layer applies

### 5. What is the preferred join path for bank events to party and document definition?

- best KB: `ComarchOptimaSchema`
- result: `PASS`

Why:

- current helper layer explicitly models bank-event join routes

### 6. When should I use Additional Function versus User Column?

- best KB: `ComarchOptimaAdditionalFunctions`
- support KBs: `ComarchOptimaReference`
- result: `PASS`

Why:

- Additional Functions KB already has explicit implementation guidance for this
  decision

### 7. Which Additional Function examples relate to trade, warehouse, or invoice work?

- best KB: `ComarchOptimaAdditionalFunctions`
- support KBs: `ComarchOptimaSchema`
- result: `PASS`

Why:

- example layer, schema touchpoints, and module recipes already exist

### 8. Which COM interfaces appear in examples for accounting or operator/login scenarios?

- best KB: `ComarchOptimaAdditionalFunctions`
- support KBs: `ComarchOptimaPartnerTechnical`
- result: `PASS`

Why:

- the Additional Functions KB has curated COM interface coverage
- the partner KB adds more example volume and module recipes

### 9. Where can I find a COM example for login window, adding operator, or invoice posting?

- best KB: `ComarchOptimaPartnerTechnical`
- support KBs: `ComarchOptimaAdditionalFunctions`
- result: `PASS`

Why:

- the partner KB now has promoted example extracts and COM module recipes

### 10. Which partner procedures or dictionaries relate to report configuration or dynamic parameters?

- best KB: `ComarchOptimaPartnerTechnical`
- support KBs: `ComarchOptimaSprint`
- result: `PASS`

Why:

- partner dictionary layers are large and already include procedure/message/config
  entries useful for this class of question

### 11. What SQL pattern should I start with for a Sprint report with header and lines?

- best KB: `ComarchOptimaSprint`
- support KBs: `ComarchOptimaSchema`
- result: `PASS`

Why:

- Sprint KB already has explicit SQL-pattern and module-recipe layers

### 12. Which KB should I use first when I only know the business area but not the table or report mechanism?

- best KB: `ComarchOptimaReference`
- support KBs:
  - `ComarchOptimaSchema`
  - `ComarchOptimaAdditionalFunctions`
  - `ComarchOptimaSprint`
- result: `PASS`

Why:

- the general reference KB is now primarily an entry/routing layer

### 13. Where do I start in official Optima docs for module navigation, updates, or onboarding?

- best KB: `ComarchOptimaReference`
- result: `PASS`

Why:

- this is exactly what the official reference KB is for

### 14. How does Betterfly API authentication work?

- best KB: `ComarchBetterflyReference`
- result: `PASS`

Why:

- Betterfly KB already contains:
  - token flow
  - Bearer auth
  - metadata-only live validation notes

### 15. Which Betterfly endpoints are versioned, and how do version families differ?

- best KB: `ComarchBetterflyReference`
- result: `PASS`

Why:

- versioning behavior is explicitly captured in API resources and API patterns

### 16. What is the difference between `payments` and `paymentdetails` in Betterfly?

- best KB: `ComarchBetterflyReference`
- result: `PASS`

Why:

- already tested and documented in the Betterfly usability test and API pattern
  layer

### 17. How should I model write-side Betterfly flows such as create, confirm, finalize, and correction?

- best KB: `ComarchBetterflyReference`
- result: `PASS`

Why:

- write-side notes and curated API patterns already exist

### 18. Which KB should answer a question about print SQL, Sprint workflow, and table joins at the same time?

- best KBs:
  - `ComarchOptimaSprint`
  - `ComarchOptimaSchema`
- routing KB:
  - `ComarchOptimaReference`
- result: `PASS`

Why:

- the current architecture supports this split cleanly

### 19. Can I reliably answer highly specific Sprint template implementation questions from the current corpus alone?

- best KB: `ComarchOptimaSprint`
- result: `PARTIAL`

Why:

- current KB is good on patterns and guidance
- it is still weaker on real executable/report artifacts than the other mature KBs

### 20. Can I answer every partner-only technical question from the current partner KB without additional downloads?

- best KB: `ComarchOptimaPartnerTechnical`
- result: `PARTIAL`

Why:

- the KB is strong already
- but by design it uses selective authenticated retrieval and anti-duplication,
  so there will still be partner questions that require more asset pulls

### 21. What does a code or business value mean in Optima?

- best KB: `ComarchOptimaBusinessSemantics`
- support KBs: `ComarchOptimaSchema`
- result: `PASS`

Why:

- the business semantics KB is the dedicated source for code meanings, labels,
  descriptions, and business rules
- the schema KB supplies the underlying table and column anchors

## Summary

Results:

- `PASS`: `19`
- `PARTIAL`: `2`
- `MISS`: `0`

Interpretation:

- the current KB architecture is operationally sound
- there is no evidence that another new KB is needed right now
- the biggest remaining improvement area is depth, not breadth

## First Real Gaps

1. `ComarchOptimaSprint`

- needs more real report artifacts if it is supposed to answer deeper
  implementation questions instead of just pattern/workflow questions

2. `ComarchOptimaPartnerTechnical`

- needs additional selective asset retrieval only when a real partner-only
  technical question cannot be answered from current coverage

## Recommended Next Step

Do not broaden the KB landscape.

Do this next:

1. collect the user's real working questions
2. route them against the current KB set
3. only then deepen:
   - `ComarchOptimaSprint`
   - `ComarchOptimaPartnerTechnical`

If a build step follows this phase, it should not be another KB.
It should be a single routing/assistant layer over the existing KBs.
