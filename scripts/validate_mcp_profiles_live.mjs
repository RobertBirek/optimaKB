#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import { getMcpProfile, listMcpProfiles } from './lib/erp_knowledge_mcp_profiles.mjs';

function readToken(profileId) {
  const content = fs.readFileSync(`/etc/${profileId}.env`, 'utf8');
  const line = content.split('\n').find((item) => item.startsWith('ERP_KB_HTTP_TOKEN='));
  if (!line) throw new Error(`Missing ERP_KB_HTTP_TOKEN in /etc/${profileId}.env`);
  return line.slice('ERP_KB_HTTP_TOKEN='.length);
}

const results = [];
for (const profileData of listMcpProfiles().filter((profile) => profile.port)) {
  const profile = getMcpProfile(profileData.id);
  const host = profile.host || '10.10.254.42';
  const baseUrl = `http://${host}:${profile.port}`;
  const healthResponse = await fetch(`${baseUrl}/health`);
  if (!healthResponse.ok) throw new Error(`${profile.id}: health returned ${healthResponse.status}`);
  const health = await healthResponse.json();
  const toolsResponse = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${readToken(profile.id)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  });
  const payload = await toolsResponse.json();
  const tools = payload.result?.tools?.map((tool) => tool.name) || [];
  if (!toolsResponse.ok || payload.error) throw new Error(`${profile.id}: tools/list failed`);
  if (JSON.stringify(tools) !== JSON.stringify(profile.tools)) throw new Error(`${profile.id}: deployed tools differ from profile manifest`);
  results.push({
    profile: profile.id,
    service: health.service,
    port: profile.port,
    host,
    toolCount: tools.length,
    toolHash: crypto.createHash('sha256').update(tools.join(',')).digest('hex'),
    tools,
  });
}

process.stdout.write(JSON.stringify({ ok: true, checkedAt: new Date().toISOString(), results }, null, 2) + '\n');
