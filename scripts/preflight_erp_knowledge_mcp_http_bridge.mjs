#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.env.ROOT || '/docker/openspg';
const host = process.env.ERP_KB_HTTP_HOST || '127.0.0.1';
const port = Number(process.env.ERP_KB_HTTP_PORT || '3410');
const mcpPath = process.env.ERP_KB_HTTP_PATH || '/mcp';
const legacySsePath = process.env.ERP_KB_LEGACY_SSE_PATH || '/sse';
const token = process.env.ERP_KB_HTTP_TOKEN || 'preflight-token';

const requiredFiles = [
  'scripts/erp_knowledge_mcp_http_bridge.mjs',
  'scripts/erp_knowledge_mcp_server.mjs',
  'scripts/lib/erp_knowledge_mcp_core.mjs',
  'scripts/erp_knowledge_assistant.mjs',
  'scripts/erp_knowledge_answer.mjs',
  'docs/reference/ERP_Knowledge_Assistant_MCP_Runbook.md',
];

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function waitForHealth(baseUrl, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return response.json();
      }
    } catch {
      // retry until timeout
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`health check timed out after ${timeoutMs}ms`);
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return payload;
}

async function main() {
  const missing = [];
  for (const relativePath of requiredFiles) {
    const absolutePath = path.join(root, relativePath);
    if (!(await fileExists(absolutePath))) {
      missing.push(relativePath);
    }
  }

  if (missing.length) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          stage: 'filesystem',
          root,
          missing,
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const bridgeScript = path.join(root, 'scripts/erp_knowledge_mcp_http_bridge.mjs');
  const child = spawn(process.execPath, [bridgeScript], {
    cwd: root,
    env: {
      ...process.env,
      ROOT: root,
      ERP_KB_HTTP_HOST: host,
      ERP_KB_HTTP_PORT: String(port),
      ERP_KB_HTTP_PATH: mcpPath,
      ERP_KB_LEGACY_SSE_PATH: legacySsePath,
      ERP_KB_HTTP_TOKEN: token,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString('utf8');
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString('utf8');
  });

  const stopChild = async () => {
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (child.exitCode === null) {
        child.kill('SIGKILL');
      }
    }
  };

  const baseUrl = `http://${host}:${port}`;

  try {
    const health = await waitForHealth(baseUrl);
    const toolsList = await postJson(`${baseUrl}${mcpPath}`, {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    });
    const resourcesList = await postJson(`${baseUrl}${mcpPath}`, {
      jsonrpc: '2.0',
      id: 2,
      method: 'resources/list',
      params: {},
    });
    const answer = await postJson(`${baseUrl}${mcpPath}`, {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'answer_question',
        arguments: {
          question: 'Jak działa token Betterfly API i które endpointy są wersjonowane?',
        },
      },
    });

    const tools = toolsList?.result?.tools ?? [];
    const toolNames = tools.map((t) => t.name);
    const hasAnnotations = tools.every((t) => t.annotations?.readOnlyHint !== undefined);

    console.log(
      JSON.stringify(
        {
          ok: true,
          root,
          baseUrl,
          mcpPath,
          legacySsePath,
          health,
          toolCount: toolNames.length,
          toolNames,
          hasAnnotations,
          resourceCount: resourcesList?.result?.resources?.length ?? null,
          answerPrimaryKb:
            answer?.result?.structuredContent?.routing?.primaryKb ??
            answer?.result?.primaryKb ??
            null,
          answerHasContent: Boolean(
            answer?.result?.structuredContent?.answer || answer?.result?.content?.length,
          ),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          stage: 'runtime',
          root,
          baseUrl,
          mcpPath,
          error: error instanceof Error ? error.message : String(error),
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  } finally {
    await stopChild();
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        stage: 'fatal',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
