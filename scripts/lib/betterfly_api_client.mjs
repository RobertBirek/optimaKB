#!/usr/bin/env node

import { redactError } from './betterfly_privacy.mjs';

const DEFAULT_BASE_URL = 'https://app.comarchbetterfly.pl';
const DEFAULT_TIMEOUT_MS = 30000;
const TOKEN_SAFETY_WINDOW_MS = 15000;

let tokenCache = {
  accessToken: '',
  expiresAt: 0,
};

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBool(value, fallback = false) {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export const READ_OPERATIONS = {
  list_products: {
    id: 'list_products',
    method: 'GET',
    pathTemplate: '/api2/public/products',
    allowId: false,
    supportsQuery: true,
    resource: 'products',
  },
  get_product: {
    id: 'get_product',
    method: 'GET',
    pathTemplate: '/api2/public/products/{id}',
    allowId: true,
    supportsQuery: false,
    resource: 'products',
  },
  list_customers: {
    id: 'list_customers',
    method: 'GET',
    pathTemplate: '/api2/public/v1.2/customers',
    allowId: false,
    supportsQuery: true,
    resource: 'customers',
  },
  get_customer: {
    id: 'get_customer',
    method: 'GET',
    pathTemplate: '/api2/public/v1.2/customers/{id}',
    allowId: true,
    supportsQuery: false,
    resource: 'customers',
  },
  list_invoices: {
    id: 'list_invoices',
    method: 'GET',
    pathTemplate: '/api2/public/v1.5/invoices',
    allowId: false,
    supportsQuery: true,
    resource: 'invoices',
  },
  get_invoice: {
    id: 'get_invoice',
    method: 'GET',
    pathTemplate: '/api2/public/v1.5/invoices/{id}',
    allowId: true,
    supportsQuery: false,
    resource: 'invoices',
  },
  list_paymentdetails: {
    id: 'list_paymentdetails',
    method: 'GET',
    pathTemplate: '/api2/public/v1.5/paymentdetails',
    allowId: false,
    supportsQuery: true,
    resource: 'paymentdetails',
  },
};

export function getClientConfig() {
  const defaultPageSize = clamp(toNumber(process.env.BETTERFLY_MCP_DEFAULT_PAGE_SIZE, 10), 1, 100);
  const maxPageSize = clamp(toNumber(process.env.BETTERFLY_MCP_MAX_PAGE_SIZE, 25), 1, 200);
  return {
    baseUrl: String(process.env.BETTERFLY_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    clientId: String(process.env.BETTERFLY_CLIENT_ID || ''),
    clientSecret: String(process.env.BETTERFLY_CLIENT_SECRET || ''),
    timeoutMs: clamp(toNumber(process.env.BETTERFLY_MCP_REQUEST_TIMEOUT_MS, DEFAULT_TIMEOUT_MS), 1000, 120000),
    defaultPageSize,
    maxPageSize: Math.max(defaultPageSize, maxPageSize),
    allowInsecureHttp: toBool(process.env.BETTERFLY_MCP_ALLOW_INSECURE_HTTP, false),
  };
}

export function getCapabilities() {
  return {
    mode: 'read_only',
    operations: Object.keys(READ_OPERATIONS),
    resources: [...new Set(Object.values(READ_OPERATIONS).map((op) => op.resource))],
  };
}

export function validateClientConfig(config = getClientConfig()) {
  const errors = [];
  if (!config.baseUrl) errors.push('BETTERFLY_API_BASE_URL is missing.');
  if (!config.allowInsecureHttp && !config.baseUrl.startsWith('https://')) {
    errors.push('BETTERFLY_API_BASE_URL must use https:// unless BETTERFLY_MCP_ALLOW_INSECURE_HTTP=true.');
  }
  if (!config.clientId) errors.push('BETTERFLY_CLIENT_ID is missing.');
  if (!config.clientSecret) errors.push('BETTERFLY_CLIENT_SECRET is missing.');
  return {
    ok: errors.length === 0,
    errors,
    config: {
      baseUrl: config.baseUrl,
      timeoutMs: config.timeoutMs,
      defaultPageSize: config.defaultPageSize,
      maxPageSize: config.maxPageSize,
      hasClientId: Boolean(config.clientId),
      hasClientSecret: Boolean(config.clientSecret),
    },
  };
}

function ensureOperation(operationId) {
  const operation = READ_OPERATIONS[String(operationId || '')];
  if (!operation) {
    const error = new Error(`Unsupported read operation: ${operationId}`);
    error.code = 'UNSUPPORTED_OPERATION';
    throw error;
  }
  return operation;
}

function normalizeId(value) {
  const id = String(value || '').trim();
  if (!id) {
    const error = new Error('Parameter "id" is required for this operation.');
    error.code = 'MISSING_ID';
    throw error;
  }
  return encodeURIComponent(id);
}

function buildPath(operation, args = {}) {
  if (!operation.allowId) return operation.pathTemplate;
  return operation.pathTemplate.replace('{id}', normalizeId(args.id));
}

function normalizeQuery(args = {}, config = getClientConfig()) {
  const top = clamp(toNumber(args.top, config.defaultPageSize), 1, config.maxPageSize);
  const skip = clamp(toNumber(args.skip, 0), 0, 100000);
  const query = {
    $top: String(top),
  };
  if (skip > 0) query.$skip = String(skip);
  if (args.filter) query.$filter = String(args.filter).slice(0, 500);
  if (args.orderBy) query.$orderby = String(args.orderBy).slice(0, 200);
  return query;
}

function buildUrl(config, path, query = {}) {
  const url = new URL(path, `${config.baseUrl}/`);
  Object.entries(query).forEach(([key, value]) => {
    if (value == null || value === '') return;
    url.searchParams.set(key, String(value));
  });
  return url;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function parseTokenExpiry(rawExpires) {
  const expiresSeconds = clamp(toNumber(rawExpires, 600), 30, 86400);
  return Date.now() + (expiresSeconds * 1000);
}

export function clearTokenCache() {
  tokenCache = {
    accessToken: '',
    expiresAt: 0,
  };
}

export async function getAccessToken({ forceRefresh = false } = {}) {
  const config = getClientConfig();
  const validation = validateClientConfig(config);
  if (!validation.ok) {
    const error = new Error(`Invalid Betterfly client configuration: ${validation.errors.join(' ')}`);
    error.code = 'INVALID_CONFIG';
    throw error;
  }

  if (!forceRefresh && tokenCache.accessToken && (Date.now() + TOKEN_SAFETY_WINDOW_MS) < tokenCache.expiresAt) {
    return {
      accessToken: tokenCache.accessToken,
      expiresAt: tokenCache.expiresAt,
      source: 'cache',
    };
  }

  const authValue = Buffer.from(`${config.clientId}:${config.clientSecret}`, 'utf8').toString('base64');
  const body = new URLSearchParams({ grant_type: 'client_credentials' }).toString();
  const startedAt = Date.now();
  const tokenUrl = buildUrl(config, '/api2/public/token');

  let response;
  try {
    response = await fetchWithTimeout(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authValue}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    }, config.timeoutMs);
  } catch (error) {
    const wrapped = new Error(`Token request failed: ${error.message}`);
    wrapped.code = 'TOKEN_REQUEST_FAILED';
    throw wrapped;
  }

  const durationMs = Date.now() - startedAt;
  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text.slice(0, 300) };
  }

  if (!response.ok) {
    const message = parsed?.Message || parsed?.message || `HTTP ${response.status}`;
    const wrapped = new Error(`Token request rejected (${response.status}): ${message}`);
    wrapped.code = 'TOKEN_REQUEST_REJECTED';
    wrapped.status = response.status;
    wrapped.durationMs = durationMs;
    throw wrapped;
  }

  const accessToken = String(parsed?.access_token || '');
  if (!accessToken) {
    const wrapped = new Error('Token response does not include access_token.');
    wrapped.code = 'TOKEN_MISSING_ACCESS_TOKEN';
    throw wrapped;
  }

  tokenCache.accessToken = accessToken;
  tokenCache.expiresAt = parseTokenExpiry(parsed?.expires);
  return {
    accessToken,
    expiresAt: tokenCache.expiresAt,
    source: 'fresh',
  };
}

function normalizeError(responsePayload, status) {
  if (responsePayload && typeof responsePayload === 'object') {
    const message = responsePayload.Message || responsePayload.message || responsePayload.error_description || responsePayload.error;
    if (message) return `${message}`;
  }
  return `HTTP ${status}`;
}

async function parseApiResponse(response) {
  const text = await response.text();
  const type = response.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return { raw: text.slice(0, 1000) };
    }
  }
  return text;
}

export async function executeReadOperation(operationId, args = {}) {
  const config = getClientConfig();
  const validation = validateClientConfig(config);
  if (!validation.ok) {
    return {
      ok: false,
      code: 'INVALID_CONFIG',
      error: validation.errors.join(' '),
      config: validation.config,
    };
  }

  const operation = ensureOperation(operationId);
  const path = buildPath(operation, args);
  const query = operation.supportsQuery ? normalizeQuery(args, config) : {};
  const url = buildUrl(config, path, query);

  let token;
  try {
    token = await getAccessToken();
  } catch (error) {
    const redacted = redactError(error);
    return {
      ok: false,
      code: redacted.code,
      error: redacted.message,
      operation: operation.id,
      path,
    };
  }

  const startedAt = Date.now();
  let response;
  try {
    response = await fetchWithTimeout(url, {
      method: operation.method,
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        Accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
      },
    }, config.timeoutMs);
  } catch (error) {
    const wrapped = redactError(error);
    return {
      ok: false,
      code: wrapped.code,
      error: `API request failed: ${wrapped.message}`,
      operation: operation.id,
      path,
      durationMs: Date.now() - startedAt,
    };
  }

  const payload = await parseApiResponse(response);
  const durationMs = Date.now() - startedAt;

  if (!response.ok) {
    return {
      ok: false,
      code: 'API_REQUEST_REJECTED',
      error: normalizeError(payload, response.status),
      status: response.status,
      operation: operation.id,
      path,
      durationMs,
      data: payload,
    };
  }

  const itemCount = Array.isArray(payload)
    ? payload.length
    : (payload && typeof payload === 'object' ? Object.keys(payload).length : 0);

  return {
    ok: true,
    operation: operation.id,
    resource: operation.resource,
    status: response.status,
    durationMs,
    tokenSource: token.source,
    path,
    query,
    itemCount,
    data: payload,
  };
}
