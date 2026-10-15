# KB Operations Recovery Design

## Goal

Restore the OpenSPG KB pipeline to a healthy, current state without broad
rebuilds, unreviewed discovery decisions, or automation-policy changes.

## Scope

The work covers:

- the failed Comarch Betterfly Reference refresh build;
- promoted Comarch Optima Business Semantics drafts missing visible business
  descriptions;
- stale Taxbell Legal, Payroll HR, and Accounting VAT exports;
- stale manual-source Optima KBs where updated source material is available;
- the discovery query with low acceptance, unknown-domain candidates, and the
  prioritized inbox backlog;
- resuming automation only after the operational gates are healthy.

## Execution Model

Run scoped, sequential recovery steps. Each KB is independently diagnosed,
exported, built, and checked before the next KB begins. A failed scoped build
stops work on that KB and is diagnosed before retrying; it does not trigger a
global rebuild.

1. Diagnose Betterfly build artifacts and logs. Correct the smallest confirmed
   cause, then run the required Betterfly export and build. Verify terminal
   `FINISH` jobs and fresh quality and source-freshness reports.
2. Inspect the three promoted Business Semantics drafts and their generated
   `business_description.csv` coverage. Correct the promotion/export path,
   build only `business_description.csv`, and run the scoped quality gate.
3. For each Taxbell reference KB, compare source snapshots with its manifest.
   Run the scoped export and build only when current sources are not reflected
   in the export. Verify the updated manifest is not older than its sources.
4. Review the manual-source Optima KBs. Refresh only with verified new source
   material; do not bypass partner authentication or ingest unavailable data.
5. Triage discovery without applying automatic decisions: refine the schema
   seed query after reviewing its rejected results, manually assess the three
   unknown-domain candidates, and prioritize Taxbell Legal plus inbox reviews.
6. Resume automation only if the current LLM check is healthy and Betterfly,
   Business Semantics, and scoped quality controls have no blocking failures.

## Guardrails

- Do not alter automation thresholds, domain allowlists, throttles, or
  candidate decisions without an explicit operator decision.
- Do not expose or persist cookies, tokens, credentials, or business data.
- Do not modify runtime state files directly; use the supported scripts and
  dashboard endpoints.
- Preserve unrelated worktree changes and generated operational artifacts.
- Do not trigger a whole-platform rebuild as a substitute for diagnosis.

## Verification

- Betterfly: new relevant builder jobs report `FINISH`.
- Business Semantics: the quality report contains no error for promoted drafts
  without visible business descriptions.
- Each refreshed Taxbell KB has an export manifest at least as recent as its
  newest included source snapshot.
- Manual Optima KB refreshes have evidence of a changed source before build.
- Automation is resumed only after an independent health read confirms a
  healthy LLM and no listed blocking quality gate.
