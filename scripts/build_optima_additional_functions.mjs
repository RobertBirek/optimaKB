#!/usr/bin/env node

process.env.OPENSPG_BUILD_PROFILE = process.env.OPENSPG_BUILD_PROFILE || 'optima_additional_functions';
await import('./build_kb_runner.mjs');
