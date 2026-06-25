import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import process from 'process';

const ROOT = process.env.ROOT || '/docker/openspg';
const REGISTRY_PATH = path.join(ROOT, 'docs/reference/mcp_registry.json');
const USERS_PATH = path.join(ROOT, 'docs/reference/mcp_users.json');
const MAX_ACTIVE_KEYS = 5;

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function generateKeyId() {
  return `key_${crypto.randomUUID().slice(0, 8)}`;
}

function generateUserId() {
  return `user_${crypto.randomUUID().slice(0, 8)}`;
}

function hashToken(token) {
  return `sha256:${crypto.createHash('sha256').update(token).digest('hex')}`;
}

export function generateApiKey() {
  const raw = `sk-${crypto.randomBytes(24).toString('base64url')}`;
  const hash = hashToken(raw);
  const prefix = raw.slice(0, 5);
  return { raw, hash, prefix };
}

export function verifyApiKey(token) {
  const hash = hashToken(token);
  const data = loadUsers();
  for (const user of data.users) {
    for (const key of user.apiKeys) {
      if (key.hash === hash && key.status === 'active') {
        key.lastUsed = new Date().toISOString();
        writeJson(USERS_PATH, data);
        return { valid: true, user, key };
      }
    }
  }
  return { valid: false };
}

function defaultRegistry() {
  return {
    generatedAt: new Date().toISOString(),
    servers: [
      {
        id: 'erp-kb',
        name: 'ERP Knowledge MCP',
        kind: 'erp_knowledge',
        url: process.env.ERP_KB_MCP_BASE_URL || 'http://10.10.254.42:3400',
        healthUrl: process.env.ERP_KB_MCP_BASE_URL ? `${process.env.ERP_KB_MCP_BASE_URL}/health` : 'http://10.10.254.42:3400/health',
        sseUrl: process.env.ERP_KB_MCP_BASE_URL ? `${process.env.ERP_KB_MCP_BASE_URL}/sse` : 'http://10.10.254.42:3400/sse',
        authMethod: 'bearer',
        description: 'Comarch ERP Optima knowledge base queries: routing, answering, external search, and knowledge draft creation.',
        capabilities: ['route_question', 'answer_question', 'search_external_sources', 'submit_knowledge_draft', 'list_knowledge_bases', 'run_community_thread_test', 'draft_external_source'],
        toolCount: 7,
        transport: 'sse',
        status: 'active',
      },
      {
        id: 'betterfly-commercial',
        name: 'Betterfly Commercial MCP',
        kind: 'betterfly_commercial',
        url: process.env.BETTERFLY_MCP_HTTP_BASE_URL || '',
        healthUrl: process.env.BETTERFLY_MCP_HTTP_BASE_URL ? `${process.env.BETTERFLY_MCP_HTTP_BASE_URL}/health` : '',
        sseUrl: process.env.BETTERFLY_MCP_HTTP_BASE_URL ? `${process.env.BETTERFLY_MCP_HTTP_BASE_URL}/sse` : '',
        authMethod: 'bearer',
        description: 'Betterfly commercial API: products, customers, invoices, payment details with authentication flow.',
        capabilities: ['betterfly_answer', 'betterfly_endpoint_lookup', 'betterfly_list_products', 'betterfly_list_customers', 'betterfly_list_invoices', 'betterfly_list_paymentdetails', 'betterfly_auth_flow', 'betterfly_health'],
        toolCount: 16,
        transport: 'sse',
        status: 'active',
      },
      {
        id: 'erp-kb-auth-proxy',
        name: 'ERP Knowledge Auth Proxy',
        kind: 'erp_knowledge_proxy',
        url: `http://${process.env.ERP_KB_MCP_PROXY_HOST || '127.0.0.1'}:${process.env.ERP_KB_MCP_PROXY_PORT || '3401'}`,
        healthUrl: `http://${process.env.ERP_KB_MCP_PROXY_HOST || '127.0.0.1'}:${process.env.ERP_KB_MCP_PROXY_PORT || '3401'}/health`,
        sseUrl: `http://${process.env.ERP_KB_MCP_PROXY_HOST || '127.0.0.1'}:${process.env.ERP_KB_MCP_PROXY_PORT || '3401'}/sse`,
        authMethod: 'bearer',
        description: 'Auth proxy for ERP Knowledge MCP that injects Bearer token into upstream requests.',
        capabilities: ['proxy', 'auth_injection'],
        toolCount: 0,
        transport: 'sse',
        status: 'active',
      },
    ],
  };
}

export function loadRegistry() {
  let registry = readJson(REGISTRY_PATH);
  if (!registry || !registry.servers) {
    registry = defaultRegistry();
    writeJson(REGISTRY_PATH, registry);
  }
  return registry;
}

export function getServers() {
  return loadRegistry().servers;
}

export function getServer(id) {
  return loadRegistry().servers.find((s) => s.id === id) || null;
}

export function updateServerStatus(id, status) {
  const data = loadRegistry();
  const server = data.servers.find((s) => s.id === id);
  if (!server) return null;
  server.status = status;
  writeJson(REGISTRY_PATH, data);
  return server;
}

function defaultUsers() {
  return { generatedAt: new Date().toISOString(), users: [] };
}

export function loadUsers() {
  let data = readJson(USERS_PATH);
  if (!data || !Array.isArray(data.users)) {
    data = defaultUsers();
    writeJson(USERS_PATH, data);
  }
  return data;
}

export function getUsers() {
  const data = loadUsers();
  return data.users.map((u) => ({
    ...u,
    apiKeys: u.apiKeys.map((k) => ({
      id: k.id,
      prefix: k.prefix,
      status: k.status,
      createdAt: k.createdAt,
      lastUsed: k.lastUsed,
      expiresAt: k.expiresAt,
    })),
  }));
}

export function getUser(id) {
  return loadUsers().users.find((u) => u.id === id) || null;
}

export function createUser({ name, email, mcpAssignments = [] }) {
  const data = loadUsers();
  const user = {
    id: generateUserId(),
    name,
    email: email || '',
    mcpAssignments,
    createdAt: new Date().toISOString(),
    apiKeys: [],
  };
  data.users.push(user);
  writeJson(USERS_PATH, data);
  return { ...user, apiKeys: [] };
}

export function updateUser(id, patch) {
  const data = loadUsers();
  const idx = data.users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  if (patch.name !== undefined) data.users[idx].name = patch.name;
  if (patch.email !== undefined) data.users[idx].email = patch.email;
  if (patch.mcpAssignments !== undefined) data.users[idx].mcpAssignments = patch.mcpAssignments;
  writeJson(USERS_PATH, data);
  const u = data.users[idx];
  return { ...u, apiKeys: u.apiKeys.map((k) => ({ id: k.id, prefix: k.prefix, status: k.status, createdAt: k.createdAt, lastUsed: k.lastUsed, expiresAt: k.expiresAt })) };
}

export function deleteUser(id) {
  const data = loadUsers();
  const idx = data.users.findIndex((u) => u.id === id);
  if (idx === -1) return false;
  data.users.splice(idx, 1);
  writeJson(USERS_PATH, data);
  return true;
}

export function createUserApiKey(userId) {
  const data = loadUsers();
  const user = data.users.find((u) => u.id === userId);
  if (!user) return null;
  const activeKeys = user.apiKeys.filter((k) => k.status === 'active');
  if (activeKeys.length >= MAX_ACTIVE_KEYS) {
    return { error: `Max ${MAX_ACTIVE_KEYS} active keys per user`, key: null };
  }
  const { raw, hash, prefix } = generateApiKey();
  const keyEntry = {
    id: generateKeyId(),
    prefix,
    hash,
    createdAt: new Date().toISOString(),
    lastUsed: null,
    expiresAt: null,
    status: 'active',
  };
  user.apiKeys.push(keyEntry);
  writeJson(USERS_PATH, data);
  return { key: { ...keyEntry, hash: undefined, _raw: raw }, raw };
}

export function revokeUserApiKey(userId, keyId) {
  const data = loadUsers();
  const user = data.users.find((u) => u.id === userId);
  if (!user) return null;
  const key = user.apiKeys.find((k) => k.id === keyId);
  if (!key) return null;
  key.status = 'revoked';
  writeJson(USERS_PATH, data);
  return { id: key.id, status: 'revoked' };
}

export function rotateUserApiKey(userId, keyId) {
  const revokeResult = revokeUserApiKey(userId, keyId);
  if (!revokeResult) return null;
  return createUserApiKey(userId);
}

const MCP_PORT_START = 3402;
const MCP_PORT_END = 3499;

export function allocatePort() {
  const existing = getServers();
  const usedPorts = new Set();
  for (const server of existing) {
    const match = String(server.url || '').match(/:(\d+)$/);
    if (match) usedPorts.add(Number(match[1]));
  }
  for (let port = MCP_PORT_START; port <= MCP_PORT_END; port++) {
    if (!usedPorts.has(port)) return port;
  }
  return 0;
}

function mcpIdFromName(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return `mcp-${slug}`;
}

export function createMcpServer({ name, kbFilter = [], port, baseUrl = process.env.ERP_KB_MCP_BASE_URL || 'http://10.10.254.42' }) {
  const portNum = port || allocatePort();
  if (!portNum) throw new Error('No available MCP ports (3402-3499 full)');
  const id = mcpIdFromName(name);
  const server = {
    id,
    name,
    kind: 'erp_knowledge_scoped',
    url: `${baseUrl.replace(/\/+$/, '')}:${portNum}`,
    healthUrl: `${baseUrl.replace(/\/+$/, '')}:${portNum}/health`,
    sseUrl: `${baseUrl.replace(/\/+$/, '')}:${portNum}/sse`,
    authMethod: 'bearer',
    description: `Scoped MCP ${name}: ${kbFilter.length} KB(s).`,
    capabilities: ['route_question', 'answer_question', 'search_external_sources', 'list_knowledge_bases', 'run_community_thread_test', 'submit_knowledge_draft', 'draft_external_source'],
    toolCount: 7,
    transport: 'sse',
    port: portNum,
    kbFilter,
    status: 'created',
    createdAt: new Date().toISOString(),
  };
  const data = loadRegistry();
  data.servers.push(server);
  writeJson(REGISTRY_PATH, data);
  return server;
}

export function deleteMcpServer(id) {
  const data = loadRegistry();
  const idx = data.servers.findIndex((s) => s.id === id);
  if (idx === -1 || data.servers[idx].kind !== 'erp_knowledge_scoped') return null;
  const server = data.servers[idx];
  data.servers.splice(idx, 1);
  writeJson(REGISTRY_PATH, data);
  return server;
}

export function getConnectionSnippet(serverId, apiKey = 'TWÓJ_KLUCZ_API') {
  const server = getServer(serverId);
  if (!server) return null;
  const sseUrl = server.sseUrl || `${server.url}/sse`;
  return {
    sseUrl,
    label: server.name,
    snippet: {
      mcpServers: {
        [serverId]: {
          transport: 'sse',
          url: sseUrl.replace(/\/+$/, ''),
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        },
      },
    },
    snippetStdio: {
      mcpServers: {
        [serverId]: {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-sse-proxy', sseUrl.replace(/\/+$/, ''), apiKey],
        },
      },
    },
  };
}

export function getConnectionSnippets(apiKey = 'TWÓJ_KLUCZ_API') {
  return getServers().map((s) => getConnectionSnippet(s.id, apiKey)).filter(Boolean);
}

export { MAX_ACTIVE_KEYS };
