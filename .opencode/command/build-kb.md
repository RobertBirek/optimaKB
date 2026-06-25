---
description: Build an OpenSPG knowledge base from staged CSV exports. Usage: /build-kb <profile>
---

The user provides a profile name (e.g. `optima_schema_metadata`, `optima_reference`, `optima_sprint`, `optima_additional_functions`, `optima_partner_technical`, `optima_business_semantics`, `betterfly_reference`).

Map the profile to the correct build script:
- `optima_schema_metadata` → `build_optima_schema_metadata.mjs`
- `optima_additional_functions` → `build_optima_additional_functions.mjs`
- `optima_sprint` → `build_optima_sprint.mjs`
- `optima_reference` → `build_optima_reference.mjs`
- `optima_partner_technical` → `build_optima_partner_technical.mjs`
- `optima_business_semantics` → `build_optima_business_semantics.mjs`
- `betterfly_reference` → `build_betterfly_reference.mjs`

Run `node scripts/<script>` with the correct OPENSPG environment. Check `OPENSPG_API_BASE`, `OPENSPG_COOKIE`/`OPENSPG_COOKIE_FILE` before starting.

If OPENSPG_FORCE_FILES is needed, ask the user which CSV files to force-rebuild.
