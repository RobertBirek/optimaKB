#!/usr/bin/env node

process.env.OPENSPG_BUILD_PROFILE = process.env.OPENSPG_BUILD_PROFILE || 'community_news';
const { main } = await import('./build_kb_runner.mjs');
await main();
