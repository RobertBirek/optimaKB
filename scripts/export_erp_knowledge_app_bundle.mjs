#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const ROOT = '/docker/openspg';
const ROUTING_PATH = path.join(ROOT, 'docs/reference/ERP_Knowledge_Assistant_Routing.json');
const PROMPT_PATH = path.join(ROOT, 'docs/reference/ERP_Knowledge_Assistant_OpenSPG_App_Prompt.md');
const OUT_PATH = path.join(ROOT, 'docs/reference/ERP_Knowledge_Assistant_OpenSPG_App_Bundle.json');

const routing = JSON.parse(fs.readFileSync(ROUTING_PATH, 'utf8'));
const prompt = fs.readFileSync(PROMPT_PATH, 'utf8');

const bundle = {
  generatedAt: new Date().toISOString(),
  appName: 'ERP Knowledge Assistant',
  appAlias: 'erpknowledgeassistant',
  appDescription: 'Single-entry assistant across Optima and Betterfly knowledge bases.',
  appLogo: '/img/logo/appicon.png',
  openSpgAppId: 2,
  template: 'think_pipeline',
  purpose: 'Single-entry OpenSPG application layer above the active Optima and Betterfly KB set.',
  kbProjects: [
    {
      name: 'ComarchOptimaSchema',
      displayName: 'Comarch Optima ERP MSSQL Schema',
      projectId: 4,
    },
    {
      name: 'ComarchOptimaAdditionalFunctions',
      displayName: 'Comarch Optima Additional Functions',
      projectId: 6,
    },
    {
      name: 'ComarchOptimaSprint',
      displayName: 'Comarch Optima Sprint and Prints',
      projectId: 7,
    },
    {
      name: 'ComarchOptimaReference',
      displayName: 'Comarch Optima Reference',
      projectId: 8,
    },
    {
      name: 'ComarchOptimaPartnerTechnical',
      displayName: 'Comarch Optima Partner Technical',
      projectId: 9,
    },
    {
      name: 'ComarchBetterflyReference',
      displayName: 'Comarch Betterfly Reference',
      projectId: 10,
    },
  ],
  routing,
  prompt,
};

fs.writeFileSync(OUT_PATH, JSON.stringify(bundle, null, 2) + '\n', 'utf8');
console.log(`Wrote: ${OUT_PATH}`);
