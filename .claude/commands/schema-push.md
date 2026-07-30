---
description: POST a .schema DSL file to the OpenSPG schema API. Usage: /schema-push [schema-file]
argument-hint: [schema-file]
---

Run `node scripts/push_openspg_schema.mjs` with `OPENSPG_SCHEMA_FILE=$ARGUMENTS` if a specific file path was given above. Default schema file is `docs/reference/ComarchOptimaSchema.schema`.

Requires `OPENSPG_COOKIE` or `OPENSPG_COOKIE_FILE` to be set.
