#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['scripts/build_kb_runner.mjs'], {
  cwd: '/docker/openspg',
  stdio: 'inherit',
  env: {
    ...process.env,
    OPENSPG_BUILD_PROFILE: process.env.OPENSPG_BUILD_PROFILE || 'owa_ontology',
  },
});

process.exit(result.status ?? 0);
