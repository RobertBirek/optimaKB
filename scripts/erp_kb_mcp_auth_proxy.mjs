#!/usr/bin/env node

import http from 'http';
import process from 'process';
import { ERP_KB_MCP_PROXY_TARGET_BASE } from './lib/config.mjs';
import { verifyApiKey } from './lib/mcp_registry.mjs';

const HOST = process.env.ERP_KB_MCP_PROXY_HOST || '127.0.0.1';
const PORT = Number(process.env.ERP_KB_MCP_PROXY_PORT || 3401);
const TARGET_BASE = ERP_KB_MCP_PROXY_TARGET_BASE;
const READ_TOKEN = process.env.ERP_KB_HTTP_TOKEN || process.env.ERP_KB_MCP_TOKEN || '';
const MAX_BODY_BYTES = Number(process.env.ERP_KB_MCP_PROXY_MAX_BODY_BYTES || 1048576);
const REQUEST_TIMEOUT_MS = Number(process.env.ERP_KB_MCP_PROXY_REQUEST_TIMEOUT_MS || 30000);

if (!READ_TOKEN) {
  process.stderr.write('ERP_KB_HTTP_TOKEN or ERP_KB_MCP_TOKEN is required\n');
  process.exit(1);
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(Object.assign(new Error(`Body exceeds ${MAX_BODY_BYTES} bytes`), { code: 'BODY_TOO_LARGE' }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function copyResponseHeaders(headers) {
  const out = {};
  for (const [key, value] of headers.entries()) {
    const lower = key.toLowerCase();
    if (['connection', 'keep-alive', 'transfer-encoding', 'upgrade'].includes(lower)) continue;
    out[key] = value;
  }
  return out;
}

async function proxyRequest(req, res) {
  const authHeader = String(req.headers.authorization || '');
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const userKey = verifyApiKey(token);
  if (!userKey.valid && token !== READ_TOKEN) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized', message: 'Missing or invalid bearer token.' }));
    return;
  }

  const targetUrl = new URL(req.url || '/', TARGET_BASE);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    if (['authorization', 'host', 'connection'].includes(key.toLowerCase())) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
  }
  headers.set('Authorization', `Bearer ${READ_TOKEN}`);

  let body;
  try {
    body = ['GET', 'HEAD'].includes(req.method || '') ? undefined : await readBody(req);
  } catch (error) {
    return sendJson(res, error.code === 'BODY_TOO_LARGE' ? 413 : 400, {
      error: 'invalid_body',
      message: error.message,
    });
  }

  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body,
    redirect: 'manual',
  });

  res.writeHead(response.status, copyResponseHeaders(response.headers));
  if (response.body) {
    const reader = response.body.getReader();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
  }
  res.end();
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/health') {
    sendJson(res, 200, { ok: true, service: 'erp-kb-mcp-auth-proxy', host: HOST, port: PORT });
    return;
  }
  proxyRequest(req, res).catch((error) => {
    sendJson(res, 502, {
      error: 'proxy_error',
      message: error.message,
    });
  });
});

server.requestTimeout = REQUEST_TIMEOUT_MS;
server.headersTimeout = Math.min(REQUEST_TIMEOUT_MS, 15000);

server.listen(PORT, HOST, () => {
  process.stdout.write(JSON.stringify({
    ok: true,
    service: 'erp-kb-mcp-auth-proxy',
    host: HOST,
    port: PORT,
    targetBase: TARGET_BASE,
    auth: 'inject_read_bearer',
  }) + '\n');
});
