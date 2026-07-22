#!/usr/bin/env node

import assert from 'node:assert/strict';
import path from 'node:path';
import process from 'node:process';
import { getMcpProfile, listMcpProfiles } from './lib/erp_knowledge_mcp_profiles.mjs';

process.env.ROOT = process.env.ROOT || path.resolve(import.meta.dirname, '..');
const { handleJsonRpcRequest, listToolsForProfile } = await import('./lib/erp_knowledge_mcp_core.mjs');
const { classifyQuestion, loadRouting } = await import('./erp_knowledge_assistant.mjs');

const publicProfiles = listMcpProfiles().filter((profile) => profile.mode === 'read-only');
assert.equal(publicProfiles.length, 6, 'Expected exactly six public read-only profiles.');

for (const profileData of publicProfiles) {
  const profile = getMcpProfile(profileData.id);
  const actualTools = listToolsForProfile(profile).map((tool) => tool.name);
  assert.deepEqual(actualTools, profile.tools, `${profile.id}: tools/list differs from profile manifest.`);
  assert.equal(actualTools.includes('route_question'), false, `${profile.id}: route_question must stay in the gateway.`);
  assert.equal(actualTools.includes('submit_knowledge_draft'), false, `${profile.id}: write tool leaked into public profile.`);
  assert.equal(actualTools.includes('draft_external_source'), false, `${profile.id}: write tool leaked into public profile.`);

  const listed = await handleJsonRpcRequest({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, {
    profile,
    allowedNamespaces: new Set(profile.namespaces),
    writeAllowed: false,
  });
  assert.deepEqual(listed.result.tools.map((tool) => tool.name), profile.tools);

  const forbidden = await handleJsonRpcRequest({
    jsonrpc: '2.0', id: 2, method: 'tools/call',
    params: { name: 'submit_knowledge_draft', arguments: {} },
  }, { profile, allowedNamespaces: new Set(profile.namespaces), writeAllowed: true });
  assert.equal(forbidden.error?.code, -32601, `${profile.id}: hidden write tool call was not rejected.`);

  const kbList = await handleJsonRpcRequest({
    jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'list_knowledge_bases', arguments: {} },
  }, { profile, allowedNamespaces: new Set(profile.namespaces), writeAllowed: false });
  const returnedNamespaces = kbList.result.structuredContent.kbs.map((kb) => kb.namespace).sort();
  assert.deepEqual(returnedNamespaces, [...profile.namespaces].sort(), `${profile.id}: namespace isolation failed.`);
}

const editorial = getMcpProfile('knowledge-editorial-mcp');
assert.equal(editorial.tools.includes('submit_knowledge_draft'), true);
assert.equal(editorial.tools.includes('draft_external_source'), true);
assert.equal(editorial.tools.includes('answer_question'), false);

const semantic = getMcpProfile('erp-semantic-mcp');
const semanticRoute = classifyQuestion(
  'Wyjasnij proces faktury',
  loadRouting(),
  new Set(semantic.namespaces),
);
assert.ok(semantic.namespaces.includes(semanticRoute.primaryRoute.primaryKb));

process.stdout.write(JSON.stringify({ ok: true, publicProfiles: publicProfiles.map((profile) => profile.id) }, null, 2) + '\n');
