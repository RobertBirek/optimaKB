#!/usr/bin/env node

process.env.OPENSPG_BUILD_PROFILE = process.env.OPENSPG_BUILD_PROFILE || 'community_news';
await import('./build_kb_runner.mjs');
