#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import process from 'process';
import crypto from 'crypto';
import { getServer } from './lib/mcp_registry.mjs';
import { getMcpProfile } from './lib/erp_knowledge_mcp_profiles.mjs';

const ROOT = '/docker/openspg';
const UNIT_DIR = '/etc/systemd/system';
const ENV_DIR = '/etc';

function usage() {
  return [
    'Usage:',
    '  node scripts/generate_mcp_systemd_unit.mjs --mcp-id <id>',
    '',
    'Options:',
    '  --mcp-id <id>   MCP server id from registry',
    '',
  ].join('\n');
}

function argValue(args, name, fallback = '') {
  const index = args.indexOf(name);
  return index >= 0 ? (args[index + 1] || fallback) : fallback;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) { process.stdout.write(usage()); return; }

  const mcpId = argValue(args, '--mcp-id', '');
  if (!mcpId) throw new Error('--mcp-id is required');

  const server = getServer(mcpId) || { id: mcpId, name: mcpId };
  const profile = getMcpProfile(server.profile || server.id);

  const unitPath = path.join(UNIT_DIR, `${mcpId}.service`);
  const envPath = path.join(ENV_DIR, `${mcpId}.env`);
  const port = server.port || profile.port;
  const allowed = (profile.namespaces || server.kbFilter || []).join(',');

  const unitContent = [
    '[Unit]',
    `Description=MCP ${server.name}`,
    'After=network.target',
    '',
    '[Service]',
    'Type=simple',
    'WorkingDirectory=' + ROOT,
    'EnvironmentFile=' + envPath,
    'ExecStart=/usr/bin/node ' + ROOT + '/scripts/erp_knowledge_mcp_http_bridge.mjs',
    'Restart=always',
    'RestartSec=3',
    'User=mcpbot',
    'Group=mcpbot',
    '',
    '[Install]',
    'WantedBy=multi-user.target',
  ].join('\n');

  const mainEnv = fs.readFileSync(path.join(ENV_DIR, 'erp-kb-mcp.env'), 'utf8');
  const inheritedLines = mainEnv.split('\n').filter((line) => line.startsWith('EXA_'));
  const existingEnv = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const existingToken = existingEnv.split('\n').find((line) => line.startsWith('ERP_KB_HTTP_TOKEN='))?.slice('ERP_KB_HTTP_TOKEN='.length);
  const authToken = existingToken || crypto.randomBytes(32).toString('base64url');
  const envContent = [
    `# MCP ${server.name} – auto-generated on ${new Date().toISOString()}`,
    `ROOT=${ROOT}`,
    `ERP_KB_HTTP_HOST=10.10.254.42`,
    `ERP_KB_HTTP_PORT=${port}`,
    `ERP_KB_MCP_PROFILE=${profile.id}`,
    `ERP_KB_HTTP_TOKEN=${authToken}`,
    `ERP_KB_MCP_ALLOWED_NAMESPACES=${allowed}`,
    `ERP_KB_HTTP_AUDIT_LOG=${ROOT}/logs/${mcpId}_audit.jsonl`,
    ...inheritedLines,
  ].join('\n');

  fs.writeFileSync(unitPath, unitContent + '\n', 'utf8');
  fs.writeFileSync(envPath, envContent + '\n', 'utf8');

  console.log(JSON.stringify({
    ok: true,
    mcpId,
    unitPath,
    envPath,
    port,
    allowedNamespaces: allowed || '(all)',
    profile: profile.id,
    unitContent: unitContent,
    envContent: '<redacted>',
  }));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
