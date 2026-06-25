#!/usr/bin/env node

process.env.OPENSPG_BUILD_PROFILE = process.env.OPENSPG_BUILD_PROFILE || 'optima_sprint';
await import('./build_kb_runner.mjs');
