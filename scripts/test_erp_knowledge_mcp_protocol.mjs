#!/usr/bin/env node

import assert from 'node:assert/strict';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
process.env.ROOT = process.env.ROOT || path.resolve(scriptDirectory, '..');
const { formatLegacySseEndpoint, handleJsonRpcRequest, PROTOCOL_VERSION } = await import('./lib/erp_knowledge_mcp_core.mjs');

assert.equal(PROTOCOL_VERSION, '2025-03-26', 'Streamable HTTP requires MCP protocol 2025-03-26 or newer.');
assert.equal(formatLegacySseEndpoint('/mcp'), 'event: endpoint\ndata: /mcp\n\n');
assert.throws(() => formatLegacySseEndpoint('mcp'), /absolute path/);

const initialized = await handleJsonRpcRequest({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'protocol-regression-test', version: '1' },
  },
});
assert.equal(initialized.result.protocolVersion, PROTOCOL_VERSION);

const notification = await handleJsonRpcRequest({
  jsonrpc: '2.0',
  method: 'notifications/initialized',
  params: {},
});
assert.equal(notification, null, 'Initialized notification must not return a JSON-RPC response.');

const tools = await handleJsonRpcRequest({
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/list',
  params: {},
});
assert.ok(Array.isArray(tools.result.tools));
assert.ok(tools.result.tools.length > 0, 'The legacy profile must expose tools after initialization.');

process.stdout.write(JSON.stringify({
  ok: true,
  protocolVersion: PROTOCOL_VERSION,
  toolCount: tools.result.tools.length,
}, null, 2) + '\n');
