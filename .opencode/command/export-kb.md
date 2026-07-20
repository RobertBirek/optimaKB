---
description: Export CSV files from MSSQL for an OpenSPG knowledge base. Usage: /export-kb <profile>
---

The user provides a profile name. Map the profile to the correct export script:

- `optima_schema_metadata` → `export_optima_schema_metadata.mjs`
- `optima_additional_functions` → `export_optima_additional_functions.mjs`
- `optima_sprint` → `export_optima_sprint.mjs`
- `optima_reference` → `export_optima_reference.mjs`
- `optima_partner_technical` → `export_optima_partner_technical.mjs`
- `optima_business_semantics` → `export_optima_business_semantics.mjs`
- `betterfly_reference` → `export_betterfly_reference.mjs`

Run `node scripts/<script>` with the correct OPENSPG environment vars. Check `OPENSPG_API_BASE`, `OPENSPG_COOKIE`/`OPENSPG_COOKIE_FILE` before starting.

Output goes to `exports/<kb>/v1/`. Confirm by listing the output directory after completion.
