#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = process.env.ROOT || path.resolve(scriptDirectory, '..');
const BRIDGE_SCRIPT = path.join(REPO_ROOT, 'scripts/erp_knowledge_mcp_http_bridge.mjs');
const PORT = Number(process.env.ERP_KB_HTTP_PORT || 3412);
const READ_TOKEN = process.env.ERP_KB_HTTP_TOKEN || 'read-token';
const WRITE_TOKEN = process.env.ERP_KB_HTTP_WRITE_TOKEN || 'write-token';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(baseUrl, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // retry until the bridge starts
    }
    await wait(250);
  }
  throw new Error(`Timed out waiting for ${baseUrl}/health`);
}

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-kb-mcp-write-'));
  fs.mkdirSync(path.join(root, 'downloads/knowledge_inbox'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs/reference'), { recursive: true });
  fs.copyFileSync(
    path.join(REPO_ROOT, 'docs/reference/ERP_Knowledge_Assistant_Routing.json'),
    path.join(root, 'docs/reference/ERP_Knowledge_Assistant_Routing.json'),
  );

  const child = spawn(process.execPath, [BRIDGE_SCRIPT], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      ROOT: root,
      ERP_KB_HTTP_HOST: '127.0.0.1',
      ERP_KB_HTTP_PORT: String(PORT),
      ERP_KB_HTTP_TOKEN: READ_TOKEN,
      ERP_KB_HTTP_WRITE_TOKEN: WRITE_TOKEN,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString('utf8');
  });

  try {
    await waitForHealth(`http://127.0.0.1:${PORT}`);

    const readResponse = await fetch(`http://127.0.0.1:${PORT}/mcp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${READ_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'submit_knowledge_draft',
          arguments: {
            kbName: 'Comarch Optima Business Semantics',
            kbNamespace: 'ComarchOptimaBusinessSemantics',
            title: 'Test diagnostyczny',
            content: 'Test draft - krótka treść diagnostyczna.',
          },
        },
      }),
    });
    const readPayload = await readResponse.json();

    assert.equal(readResponse.status, 200, stderr);
    assert.equal(readPayload.error?.code, -32003, JSON.stringify(readPayload, null, 2));

    const response = await fetch(`http://127.0.0.1:${PORT}/mcp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WRITE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 2, method: 'tools/call',
        params: {
          name: 'submit_knowledge_draft',
          arguments: {
            kbName: 'Comarch Optima Business Semantics',
            kbNamespace: 'ComarchOptimaBusinessSemantics',
            title: 'Test diagnostyczny',
            content: 'Test draft - krotka tresc diagnostyczna.',
          },
        },
      }),
    });
    const payload = await response.json();

    assert.equal(response.status, 200, stderr);
    assert.equal(payload.error, undefined, JSON.stringify(payload, null, 2));
    assert.equal(payload.result?.structuredContent?.saved, true, JSON.stringify(payload, null, 2));
    assert.match((payload.result?.structuredContent?.jsonPath || '').replaceAll('\\', '/'), /downloads\/knowledge_inbox\//);
    assert.match((payload.result?.structuredContent?.mdPath || '').replaceAll('\\', '/'), /downloads\/knowledge_inbox\//);
  } finally {
    child.kill('SIGTERM');
    await wait(250);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
