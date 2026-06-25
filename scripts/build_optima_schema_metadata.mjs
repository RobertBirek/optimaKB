#!/usr/bin/env node

process.env.OPENSPG_BUILD_PROFILE = process.env.OPENSPG_BUILD_PROFILE || 'optima_schema_metadata';
await import('./build_kb_runner.mjs');
