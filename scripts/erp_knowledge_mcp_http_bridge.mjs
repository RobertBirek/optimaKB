#!/usr/bin/env node

import http from 'http';
import { randomUUID, timingSafeEqual } from 'crypto';
import fs from 'fs';
import path from 'path';
import { handleJsonRpcRequest, PROTOCOL_VERSION } from './lib/erp_knowledge_mcp_core.mjs';
import { verifyApiKey } from './lib/mcp_registry.mjs';
import { getMcpProfile, listMcpProfiles, MCP_PROFILE_VERSION } from './lib/erp_knowledge_mcp_profiles.mjs';

const HOST = process.env.ERP_KB_HTTP_HOST || '127.0.0.1';
const PORT = Number(process.env.ERP_KB_HTTP_PORT || 3400);
const MCP_PATH = process.env.ERP_KB_HTTP_PATH || '/mcp';
const AUTH_TOKEN = process.env.ERP_KB_HTTP_TOKEN || '';
const WRITE_AUTH_TOKEN = process.env.ERP_KB_HTTP_WRITE_TOKEN || '';
const PROFILE = getMcpProfile(process.env.ERP_KB_MCP_PROFILE || 'legacy');
const PROFILE_NAMESPACES = PROFILE.namespaces ? new Set(PROFILE.namespaces) : null;
const PROFILE_SERVER_INFO = { name: PROFILE.serverName, version: MCP_PROFILE_VERSION };
const PATH_PROFILES = new Map(listMcpProfiles()
  .filter((profile) => profile.mode === 'read-only')
  .map((profile) => [`${MCP_PATH}/${profile.id}`, getMcpProfile(profile.id)]));
const SSE_KEEPALIVE_MS = Number(process.env.ERP_KB_HTTP_SSE_KEEPALIVE_MS || 15000);
const LEGACY_SSE_PATH = process.env.ERP_KB_LEGACY_SSE_PATH || '/sse';
const DISABLE_SSE = process.env.ERP_KB_HTTP_DISABLE_SSE === '1';
const ALLOWED_NAMESPACES = process.env.ERP_KB_MCP_ALLOWED_NAMESPACES
  ? new Set(process.env.ERP_KB_MCP_ALLOWED_NAMESPACES.split(',').map((ns) => ns.trim()).filter(Boolean))
  : null;
const EFFECTIVE_NAMESPACES = PROFILE_NAMESPACES && ALLOWED_NAMESPACES
  ? new Set([...PROFILE_NAMESPACES].filter((namespace) => ALLOWED_NAMESPACES.has(namespace)))
  : (PROFILE_NAMESPACES || ALLOWED_NAMESPACES);
const MAX_BODY_BYTES = Number(process.env.ERP_KB_HTTP_MAX_BODY_BYTES || 1048576);
const MAX_SSE_CLIENTS = Number(process.env.ERP_KB_HTTP_MAX_SSE_CLIENTS || 50);
const REQUEST_TIMEOUT_MS = Number(process.env.ERP_KB_HTTP_REQUEST_TIMEOUT_MS || 30000);
const HEADERS_TIMEOUT_MS = Number(process.env.ERP_KB_HTTP_HEADERS_TIMEOUT_MS || 10000);
const REQUIRE_AUTH_ON_PUBLIC_BIND = process.env.ERP_KB_HTTP_REQUIRE_AUTH_ON_PUBLIC_BIND !== '0';
const RATE_LIMIT_WINDOW_MS = Number(process.env.ERP_KB_HTTP_RATE_WINDOW_MS || 60000);
const RATE_LIMIT_READ = Number(process.env.ERP_KB_HTTP_RATE_READ || 300);
const RATE_LIMIT_WRITE = Number(process.env.ERP_KB_HTTP_RATE_WRITE || 90);
const AUDIT_LOG_ENABLED = process.env.ERP_KB_HTTP_AUDIT_LOG_ENABLED !== '0';
const AUDIT_LOG_PATH = process.env.ERP_KB_HTTP_AUDIT_LOG || '/docker/openspg/data/dashboard/erp_kb_mcp_http_audit.jsonl';
const AUDIT_LOG_MAX_BYTES = Number(process.env.ERP_KB_HTTP_AUDIT_LOG_MAX_BYTES || 5 * 1024 * 1024);
const AUDIT_LOG_MAX_FILES = Math.max(1, Number(process.env.ERP_KB_HTTP_AUDIT_LOG_MAX_FILES || 5));

const sseClients = new Map();
const rateBuckets = new Map();

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body, 'utf8'),
    ...extraHeaders,
  });
  res.end(body);
}

function unauthorized(res) {
  sendJson(res, 401, {
    error: 'unauthorized',
    message: 'Missing or invalid bearer token.',
  }, {
    'WWW-Authenticate': 'Bearer',
  });
}

function payloadTooLarge(res) {
  sendJson(res, 413, {
    error: 'payload_too_large',
    message: `Request body exceeds ${MAX_BODY_BYTES} bytes.`,
  });
}

function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket.remoteAddress || 'unknown';
}

function rateLimit(req) {
  const now = Date.now();
  const write = String(req.method || 'GET').toUpperCase() === 'POST';
  const limit = write ? RATE_LIMIT_WRITE : RATE_LIMIT_READ;
  const ip = clientIp(req);
  const key = `${ip}:${write ? 'write' : 'read'}`;
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(key, { windowStart: now, count: 1 });
    return { ok: true, ip, write };
  }
  if (bucket.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (now - bucket.windowStart)) / 1000));
    return { ok: false, retryAfter, ip, write };
  }
  bucket.count += 1;
  return { ok: true, ip, write };
}

function sanitizeAuditValue(value) {
  if (value == null) return value;
  if (typeof value === 'string') return value.replace(/(bearer\s+)[^\s]+/ig, '$1<redacted>');
  if (Array.isArray(value)) return value.map((item) => sanitizeAuditValue(item));
  if (typeof value === 'object') {
    const out = {};
    for (const [key, inner] of Object.entries(value)) {
      if (/authorization|cookie|token|secret|password|key/i.test(key)) {
        out[key] = '<redacted>';
      } else {
        out[key] = sanitizeAuditValue(inner);
      }
    }
    return out;
  }
  return value;
}

function appendAudit(entry) {
  if (!AUDIT_LOG_ENABLED) return;
  try {
    fs.mkdirSync(path.dirname(AUDIT_LOG_PATH), { recursive: true });
    try {
      const stat = fs.statSync(AUDIT_LOG_PATH);
      if (stat.size >= AUDIT_LOG_MAX_BYTES) {
        for (let index = AUDIT_LOG_MAX_FILES - 1; index >= 1; index -= 1) {
          const source = `${AUDIT_LOG_PATH}.${index}`;
          const target = `${AUDIT_LOG_PATH}.${index + 1}`;
          if (fs.existsSync(source)) fs.renameSync(source, target);
        }
        fs.renameSync(AUDIT_LOG_PATH, `${AUDIT_LOG_PATH}.1`);
      }
    } catch {
      // ignore rotation errors
    }
    fs.appendFileSync(AUDIT_LOG_PATH, `${JSON.stringify(sanitizeAuditValue(entry))}\n`, 'utf8');
  } catch {
    // no-op: audit path must never break requests
  }
}

function isLoopbackHost(host) {
  const value = String(host || '').toLowerCase();
  return value === '127.0.0.1' || value === '::1' || value === 'localhost';
}

function secureTokenMatch(actual, expected) {
  const supplied = Buffer.from(String(actual || ''), 'utf8');
  const target = Buffer.from(String(expected || ''), 'utf8');
  return supplied.length === target.length && timingSafeEqual(supplied, target);
}

function authContext(req) {
  if (!AUTH_TOKEN && !WRITE_AUTH_TOKEN) return { authorized: true, writeAllowed: PROFILE.mode === 'legacy', mode: 'no_auth', scopes: [] };
  const header = String(req.headers.authorization || '');
  const token = header.replace(/^Bearer\s+/i, '');
  const userKey = verifyApiKey(token);
  if (userKey.valid) {
    const scopes = Array.isArray(userKey.key.scopes) ? userKey.key.scopes : [];
    const assigned = Array.isArray(userKey.user.mcpAssignments) ? userKey.user.mcpAssignments : [];
    const profileAllowed = PROFILE.id === 'legacy' || assigned.includes(PROFILE.id) || PROFILE.scopes.some((scope) => scopes.includes(scope));
    if (!profileAllowed) return { authorized: false, writeAllowed: false, mode: 'user_key_scope_denied', scopes };
    return { authorized: true, writeAllowed: PROFILE.mode === 'editorial' && scopes.includes('kb.editorial.write'), mode: 'user_key', user: userKey.user.name, scopes };
  }
  if (WRITE_AUTH_TOKEN && secureTokenMatch(header, `Bearer ${WRITE_AUTH_TOKEN}`)) {
    return { authorized: true, writeAllowed: PROFILE.mode === 'editorial' || PROFILE.mode === 'legacy', mode: 'write_token', scopes: ['kb.editorial.write'] };
  }
  if (AUTH_TOKEN && secureTokenMatch(header, `Bearer ${AUTH_TOKEN}`)) {
    return { authorized: true, writeAllowed: PROFILE.mode === 'legacy' && !WRITE_AUTH_TOKEN, mode: 'read_token', scopes: [] };
  }
  return { authorized: false, writeAllowed: false };
}

function addSseClient(res, path) {
  const clientId = randomUUID();
  const timer = setInterval(() => {
    if (!res.writableEnded) {
      res.write(`: keepalive ${Date.now()}\n\n`);
    }
  }, SSE_KEEPALIVE_MS);

  sseClients.set(clientId, { res, timer });
  res.write(`event: endpoint\ndata: ${JSON.stringify({
    protocolVersion: PROTOCOL_VERSION,
    serverInfo: PROFILE_SERVER_INFO,
    path,
  })}\n\n`);

  reqCleanup(res, clientId);
}

function reqCleanup(res, clientId) {
  const cleanup = () => {
    const client = sseClients.get(clientId);
    if (!client) return;
    clearInterval(client.timer);
    sseClients.delete(clientId);
  };
  res.on('close', cleanup);
  res.on('finish', cleanup);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    let rejected = false;
    req.on('data', (chunk) => {
      if (rejected) return;
      totalBytes += chunk.length;
      if (totalBytes > MAX_BODY_BYTES) {
        rejected = true;
        reject(Object.assign(new Error(`Request body exceeds ${MAX_BODY_BYTES} bytes.`), {
          code: 'PAYLOAD_TOO_LARGE',
        }));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (rejected) return;
      const body = Buffer.concat(chunks).toString('utf8');
      if (!body.trim()) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

async function handleMcpPost(req, res, auditContext = null, requestProfile = PROFILE) {
  const auth = authContext(req);
  if (!auth.authorized) return unauthorized(res);

  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (error) {
    if (error.code === 'PAYLOAD_TOO_LARGE') {
      return payloadTooLarge(res);
    }
    return sendJson(res, 400, {
      jsonrpc: '2.0',
      error: { code: -32700, message: `Parse error: ${error.message}` },
    });
  }

  if (!payload || Array.isArray(payload)) {
    return sendJson(res, 400, {
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Only single JSON-RPC requests are supported.' },
    });
  }

  if (auditContext) {
    auditContext.rpcMethod = payload.method || '';
    auditContext.toolName = payload.method === 'tools/call' ? (payload.params?.name || '') : '';
  }

  let response;
  try {
    const requestNamespaces = requestProfile.id === PROFILE.id
      ? EFFECTIVE_NAMESPACES
      : new Set(requestProfile.namespaces || []);
    response = await handleJsonRpcRequest(payload, {
      writeAllowed: ['editorial', 'legacy'].includes(requestProfile.mode) && auth.writeAllowed,
      allowedNamespaces: requestNamespaces,
      profile: requestProfile,
      serverInfo: { name: requestProfile.serverName, version: MCP_PROFILE_VERSION },
    });
  } catch (error) {
    return sendJson(res, 500, {
      jsonrpc: '2.0',
      id: payload.id ?? null,
      error: { code: -32603, message: error.message },
    });
  }

  if (!response) {
    res.writeHead(202, { 'Content-Length': '0' });
    res.end();
    return;
  }

  sendJson(res, 200, response, {
    'MCP-Protocol-Version': PROTOCOL_VERSION,
  });
}

function handleMcpSse(req, res) {
  if (DISABLE_SSE) {
    return sendJson(res, 410, {
      error: 'sse_disabled',
      message: 'SSE transport is deprecated. Use POST to the MCP path instead.',
      deprecation: 'This endpoint will be removed in a future version. Set ERP_KB_HTTP_DISABLE_SSE=0 to re-enable temporarily.',
      mcpPath: MCP_PATH,
    });
  }
  const auth = authContext(req);
  if (!auth.authorized) return unauthorized(res);
  if (sseClients.size >= MAX_SSE_CLIENTS) {
    return sendJson(res, 503, {
      error: 'sse_client_limit',
      message: `SSE client limit reached: ${MAX_SSE_CLIENTS}.`,
    });
  }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'MCP-Protocol-Version': PROTOCOL_VERSION,
    'Deprecation': 'true',
    'Sunset': 'Sat, 01 Nov 2026 00:00:00 GMT',
  });
  res.write(': connected\n\n');
  res.write(': SSE transport is deprecated. Use POST to the MCP path instead.\n\n');
  addSseClient(res, req.url);
}

function isMcpPath(url) {
  return url === MCP_PATH || url === LEGACY_SSE_PATH || PATH_PROFILES.has(url);
}

const server = http.createServer(async (req, res) => {
  const startedAt = Date.now();
  const rate = rateLimit(req);
  const auditContext = {
    ts: new Date().toISOString(),
    service: PROFILE_SERVER_INFO.name,
    transport: 'http-bridge',
    method: req.method,
    path: req.url,
    ip: rate.ip,
    write: rate.write,
    rpcMethod: '',
    toolName: '',
  };
  res.on('finish', () => {
    appendAudit({
      ...auditContext,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  if (!rate.ok) {
    return sendJson(res, 429, {
      error: 'rate_limited',
      message: `Too many requests. Retry after ${rate.retryAfter} seconds.`,
      retryAfter: rate.retryAfter,
    });
  }

  if (req.url === '/health') {
    return sendJson(res, 200, {
      ok: true,
      service: PROFILE_SERVER_INFO.name,
      version: PROFILE_SERVER_INFO.version,
      profile: PROFILE.id,
      protocolVersion: PROTOCOL_VERSION,
      transport: DISABLE_SSE ? 'streamable-http' : 'http-bridge',
      mcpPath: MCP_PATH,
      legacySsePath: LEGACY_SSE_PATH,
      sseDeprecated: true,
      sseDisabled: DISABLE_SSE,
      auth: (AUTH_TOKEN || WRITE_AUTH_TOKEN) ? 'bearer' : 'none',
      writeAuth: WRITE_AUTH_TOKEN ? 'separate_bearer' : ((AUTH_TOKEN || WRITE_AUTH_TOKEN) ? 'same_bearer' : 'none'),
      maxBodyBytes: MAX_BODY_BYTES,
      rateWindowMs: RATE_LIMIT_WINDOW_MS,
      rateRead: RATE_LIMIT_READ,
      rateWrite: RATE_LIMIT_WRITE,
      maxSseClients: MAX_SSE_CLIENTS,
      sseClients: sseClients.size,
    });
  }

  if (isMcpPath(req.url) && req.method === 'OPTIONS') {
    res.writeHead(204, {
      Allow: 'GET, POST, OPTIONS',
      'MCP-Protocol-Version': PROTOCOL_VERSION,
    });
    res.end();
    return;
  }

  if (isMcpPath(req.url) && req.method === 'GET') {
    if (PATH_PROFILES.has(req.url)) return sendJson(res, 405, { error: 'streamable_http_required' });
    return handleMcpSse(req, res);
  }

  if (isMcpPath(req.url) && req.method === 'POST') {
    return handleMcpPost(req, res, auditContext, PATH_PROFILES.get(req.url) || PROFILE);
  }

  sendJson(res, 404, {
    error: 'not_found',
    message: 'Use /health or the configured MCP path.',
  });
});

server.requestTimeout = REQUEST_TIMEOUT_MS;
server.headersTimeout = HEADERS_TIMEOUT_MS;

if (REQUIRE_AUTH_ON_PUBLIC_BIND && !isLoopbackHost(HOST) && !AUTH_TOKEN && !WRITE_AUTH_TOKEN) {
  throw new Error('Refusing to start MCP HTTP bridge on non-loopback host without ERP_KB_HTTP_TOKEN or ERP_KB_HTTP_WRITE_TOKEN.');
}

server.listen(PORT, HOST, () => {
  process.stdout.write(
    JSON.stringify({
      ok: true,
      service: PROFILE_SERVER_INFO.name,
      profile: PROFILE.id,
      transport: 'http-bridge',
      host: HOST,
      port: PORT,
      mcpPath: MCP_PATH,
      legacySsePath: LEGACY_SSE_PATH,
      auth: (AUTH_TOKEN || WRITE_AUTH_TOKEN) ? 'bearer' : 'none',
      maxBodyBytes: MAX_BODY_BYTES,
      rateWindowMs: RATE_LIMIT_WINDOW_MS,
      rateRead: RATE_LIMIT_READ,
      rateWrite: RATE_LIMIT_WRITE,
      maxSseClients: MAX_SSE_CLIENTS,
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
      headersTimeoutMs: HEADERS_TIMEOUT_MS,
    }) + '\n',
  );
});
