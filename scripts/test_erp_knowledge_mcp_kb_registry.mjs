#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
process.env.ROOT = process.env.ROOT || path.resolve(scriptDirectory, '..');
const { handleJsonRpcRequest } = await import('./lib/erp_knowledge_mcp_core.mjs');
const { listKnowledgeBases } = await import('./erp_knowledge_assistant.mjs');

function sortNamespaces(items) {
  return items.map((item) => item.namespace).sort();
}

const expected = Object.values(listKnowledgeBases()).map(({ namespace, projectId, summary }) => ({
  namespace,
  projectId,
  summary,
}));

const listResponse = await handleJsonRpcRequest({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'list_knowledge_bases',
    arguments: {},
  },
});

const resourceResponse = await handleJsonRpcRequest({
  jsonrpc: '2.0',
  id: 2,
  method: 'resources/list',
  params: {},
});

const actualKbs = listResponse?.result?.structuredContent?.kbs || [];
const actualResources = resourceResponse?.result?.resources || [];
const expectedNamespaces = sortNamespaces(expected);
const actualNamespaces = sortNamespaces(actualKbs);
const resourceNamespaces = actualResources
  .map((resource) => String(resource.uri || '').match(/^erp-kb:\/\/(\w+)\/info$/)?.[1])
  .filter(Boolean)
  .sort();

if (expectedNamespaces.length !== actualNamespaces.length) {
  throw new Error([
    `Expected MCP list_knowledge_bases to expose ${expectedNamespaces.length} KBs, got ${actualNamespaces.length}.`,
    `Missing namespaces: ${expectedNamespaces.filter((ns) => !actualNamespaces.includes(ns)).join(', ') || '(none)'}`,
  ].join(' '));
}

if (JSON.stringify(expectedNamespaces) !== JSON.stringify(actualNamespaces)) {
  throw new Error([
    'MCP list_knowledge_bases namespaces diverge from assistant KB registry.',
    `Expected: ${expectedNamespaces.join(', ')}`,
    `Actual: ${actualNamespaces.join(', ')}`,
  ].join(' '));
}

if (JSON.stringify(expectedNamespaces) !== JSON.stringify(resourceNamespaces)) {
  throw new Error([
    'MCP resources/list namespaces diverge from assistant KB registry.',
    `Expected: ${expectedNamespaces.join(', ')}`,
    `Actual: ${resourceNamespaces.join(', ')}`,
  ].join(' '));
}

process.stdout.write(`${JSON.stringify({
  ok: true,
  kbCount: actualNamespaces.length,
  namespaces: actualNamespaces,
}, null, 2)}\n`);
