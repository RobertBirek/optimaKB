#!/usr/bin/env node
process.env.OPENSPG_BUILD_PROFILE = process.env.OPENSPG_BUILD_PROFILE || 'insert_gt_schema';
const { main } = await import('./build_kb_runner.mjs');
await main();
