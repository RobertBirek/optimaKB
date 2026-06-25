#!/usr/bin/env node

const BASE_URL = process.env.ERP_KB_HTTP_BASE_URL || 'http://127.0.0.1:3400';
const TOKEN = process.env.ERP_KB_HTTP_TOKEN || '';

function authHeaders() {
  return TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new Error(`Non-JSON response from ${url}: ${text.slice(0, 400)}`);
  }
  return { response, json };
}

async function main() {
  const health = await fetchJson(`${BASE_URL}/health`);
  const tools = await fetchJson(`${BASE_URL}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    }),
  });
  const answer = await fetchJson(`${BASE_URL}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'answer_question',
        arguments: {
          question: 'Jak działa token Betterfly API i które endpointy są wersjonowane?',
        },
      },
    }),
  });
  const resources = await fetchJson(`${BASE_URL}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'resources/list',
      params: {},
    }),
  });

  const summary = {
    ok: true,
    baseUrl: BASE_URL,
    healthOk: health.response.ok && health.json.ok === true,
    toolCount: Array.isArray(tools.json?.result?.tools) ? tools.json.result.tools.length : 0,
    resourceCount: Array.isArray(resources.json?.result?.resources) ? resources.json.result.resources.length : null,
    answerPrimaryKb: answer.json?.result?.structuredContent?.primaryKb || null,
    answerHasContent: !!answer.json?.result?.content?.[0]?.text,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
