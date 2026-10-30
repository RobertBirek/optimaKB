# Betterfly paragraph boundary repair

Intent: stop treating SVG `<path>` (and other tags beginning with `p`) as article paragraphs. The current parser can consume navigation and generate ~65k-character chunks; Betterfly chunk jobs 869 and 982 are still RUNNING.

## Approach

Use an exact paragraph tag boundary in the existing extractor, preserving normalization, grouping, IDs and CSV schemas. Honor `ROOT` like the other exporters so the actual CLI can run against private fixtures. A parser-library rewrite would be disproportionate; splitting polluted navigation into smaller chunks would mask the extraction defect.

Scope chosen by the implementer under the user's “działaj”: code and offline tests only, in an isolated checkout. Do not alter live exports, downloads, runtime, services, registry state or graph nodes. Do not claim token overflow as the confirmed scheduler failure without task-level evidence. No new dependency, import, auto-unpause or publication.

Acceptance: guarded CLI fixtures prove ROOT isolation, exact `<p>` matching, uppercase/attributed/multiline paragraphs, and rejection of `<path>`, `<pre>`, `<picture>`, `<param>`, `<progress>` and custom `p-*` tags. Existing three-paragraph grouping and source provenance stay intact. An offline copy of current Betterfly inputs provides before/after size evidence, not a deployment claim.

Later operational approvals expanded the initial implementation-only scope: successful scoped imports 999/1000, source/test fast-forward deployment and staging/manifest alignment are recorded separately in `docs/reference/Daily_Ops_Remediation_2026-10-30.md`. No graph cleanup, service restart, broad automation resume or remote push was authorized/performed.
