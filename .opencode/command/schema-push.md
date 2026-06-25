---
description: POST a .schema DSL file to the OpenSPG schema API. Usage: /schema-push [schema-file]
---

Run `node scripts/push_openspg_schema.mjs` with the OPENSPG_SCHEMA_FILE env var if the user provides a specific file path. Default schema file is `docs/reference/ComarchOptimaSchema.schema`.

Requires `OPENSPG_COOKIE` or `OPENSPG_COOKIE_FILE` to be set.
