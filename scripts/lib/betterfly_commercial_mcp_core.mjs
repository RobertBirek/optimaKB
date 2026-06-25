#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import {
  executeReadOperation,
  getAccessToken,
  getCapabilities,
  getClientConfig,
  READ_OPERATIONS,
  validateClientConfig,
} from './betterfly_api_client.mjs';
import {
  applyPrivacyMode,
  getPrivacyPolicy,
  redactBetterflyPayload,
  redactError,
} from './betterfly_privacy.mjs';

const ROOT = '/docker/openspg';
const BETTERFLY_NAMESPACE = 'ComarchBetterflyReference';
const BETTERFLY_KB_NAME = 'Comarch Betterfly Reference';
const API_RESOURCE_CSV = path.join(ROOT, 'exports/betterfly_reference/v1/api_resource.csv');
const API_PATTERN_CSV = path.join(ROOT, 'exports/betterfly_reference/v1/api_pattern.csv');
const REFERENCE_DOCUMENT_CSV = path.join(ROOT, 'exports/betterfly_reference/v1/reference_document.csv');
const CHUNK_CSV = path.join(ROOT, 'exports/betterfly_reference/v1/chunk.csv');
const CONTRACT_NOTES_PATH = path.join(ROOT, 'docs/reference/ComarchBetterflyReference.contract_notes.md');
const WRITE_NOTES_PATH = path.join(ROOT, 'docs/reference/ComarchBetterflyReference.write_notes.md');
const LIVE_PROBE_PATH = path.join(ROOT, 'docs/reference/ComarchBetterflyReference.live_probe.md');

const csvCache = new Map();
const textCache = new Map();

export const SERVER_INFO = { name: 'betterfly-commercial-mcp', version: '1.0.0' };
export const PROTOCOL_VERSION = '2024-11-05';

function makeTool(name, description, inputSchema) {
  return { name, description, inputSchema };
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsTerm(haystack, term) {
  const normalizedHaystack = normalizeText(haystack);
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) return false;
  if (normalizedTerm.includes(' ')) return normalizedHaystack.includes(normalizedTerm);
  if (normalizedTerm.length <= 4) {
    return new RegExp(`(^|[^a-z0-9_])${escapeRegExp(normalizedTerm)}($|[^a-z0-9_])`).test(normalizedHaystack);
  }
  return normalizedHaystack.includes(normalizedTerm);
}

function extractTerms(text) {
  const stopwords = new Set([
    'a', 'aby', 'albo', 'ale', 'api', 'bez', 'co', 'czy', 'dla', 'do', 'gdzie',
    'i', 'ich', 'jak', 'jakie', 'jaki', 'jest', 'kiedy', 'ktore', 'ktory', 'lub',
    'na', 'nad', 'nie', 'od', 'oraz', 'po', 'pod', 'przy', 'sie', 'to', 'u',
    'w', 'we', 'z', 'za', 'ze', 'betterfly',
  ]);
  return [...new Set(
    normalizeText(text)
      .split(/[^a-z0-9_]+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .filter((token) => token.length >= 3)
      .filter((token) => !stopwords.has(token)),
  )];
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    if (char !== '\r') {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  if (!rows.length) return [];
  const headers = rows[0].map((header, index) => {
    if (index === 0) return String(header || '').replace(/^\uFEFF/, '');
    return header;
  });
  return rows.slice(1)
    .filter((cells) => cells.some((cell) => String(cell || '').trim() !== ''))
    .map((cells, rowIndex) => {
      const output = { __row: rowIndex + 2 };
      headers.forEach((header, index) => {
        output[header] = cells[index] ?? '';
      });
      return output;
    });
}

function readCsvCached(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const stat = fs.statSync(filePath);
  const cached = csvCache.get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.rows;
  const rows = parseCsv(fs.readFileSync(filePath, 'utf8'));
  csvCache.set(filePath, { mtimeMs: stat.mtimeMs, rows });
  return rows;
}

function readTextCached(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const stat = fs.statSync(filePath);
  const cached = textCache.get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.text;
  const text = fs.readFileSync(filePath, 'utf8');
  textCache.set(filePath, { mtimeMs: stat.mtimeMs, text });
  return text;
}

function scoreText(text, terms) {
  const normalized = normalizeText(text);
  let score = 0;
  for (const term of terms) {
    if (containsTerm(normalized, term)) {
      score += term.length > 8 ? 2 : 1;
    }
  }
  return score;
}

function renderApiItem(item) {
  const method = item.httpMethod ? `${item.httpMethod} ` : '';
  const endpoint = item.endpointPath || item.endpointBase || '';
  const version = item.versionHint ? ` (${item.versionHint})` : '';
  const title = item.name || item.description || item.id || 'Unknown item';
  return `${method}${endpoint}${version} - ${title}`.trim();
}

function searchApiRows({ query = '', method = '', limit = 10 }) {
  const terms = extractTerms(`${query} ${method}`);
  const methodNormalized = normalizeText(method);
  const resources = readCsvCached(API_RESOURCE_CSV)
    .map((row) => {
      const score = scoreText(
        `${row.name} ${row.description} ${row.resourceGroup} ${row.endpointBase} ${row.exampleEndpoints} ${row.summary}`,
        terms,
      );
      return {
        type: 'resource',
        score,
        id: row.id,
        name: row.name,
        description: row.description,
        resourceGroup: row.resourceGroup,
        endpointBase: row.endpointBase,
        supportedMethods: row.supportedMethods,
        versionHint: row.versionHint,
        sourceDocumentRefIds: row.sourceDocumentRefIds,
      };
    })
    .filter((item) => item.score > 0 || !terms.length);

  const patterns = readCsvCached(API_PATTERN_CSV)
    .map((row) => {
      const score = scoreText(
        `${row.name} ${row.description} ${row.endpointPath} ${row.httpMethod} ${row.useCase} ${row.summary}`,
        terms,
      );
      return {
        type: 'pattern',
        score,
        id: row.id,
        name: row.name,
        description: row.description,
        httpMethod: row.httpMethod,
        endpointPath: row.endpointPath,
        versionHint: row.versionHint,
        useCase: row.useCase,
        sourceDocumentRefId: row.sourceDocumentRefId,
      };
    })
    .filter((item) => item.score > 0 || !terms.length)
    .filter((item) => !methodNormalized || normalizeText(item.httpMethod) === methodNormalized);

  return [...resources, ...patterns]
    .sort((a, b) => b.score - a.score || String(a.name).localeCompare(String(b.name)))
    .slice(0, Math.max(1, Math.min(Number(limit) || 10, 50)));
}

function searchMarkdownFile(filePath, query, limit = 8) {
  const terms = extractTerms(query);
  const lines = readTextCached(filePath).split('\n');
  const hits = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    const score = scoreText(line, terms);
    if (!terms.length || score > 0) {
      hits.push({
        line: index + 1,
        score,
        snippet: line.length > 240 ? `${line.slice(0, 237)}...` : line,
      });
    }
  }
  return hits
    .sort((a, b) => b.score - a.score || a.line - b.line)
    .slice(0, limit);
}

function knowledgeArtifacts() {
  return [
    path.relative(ROOT, API_RESOURCE_CSV),
    path.relative(ROOT, API_PATTERN_CSV),
    path.relative(ROOT, REFERENCE_DOCUMENT_CSV),
    path.relative(ROOT, CHUNK_CSV),
    path.relative(ROOT, CONTRACT_NOTES_PATH),
    path.relative(ROOT, WRITE_NOTES_PATH),
    path.relative(ROOT, LIVE_PROBE_PATH),
  ];
}

function formatKnowledgeAnswer(answer) {
  const lines = [
    `Pytanie: ${answer.question}`,
    `KB: ${answer.primaryKb} (${answer.namespace})`,
    answer.note,
    '',
  ];
  if (answer.endpointHints.length) {
    lines.push('Najbardziej trafne endpointy/patterny:');
    answer.endpointHints.forEach((item) => lines.push(`- ${renderApiItem(item)}`));
    lines.push('');
  }
  if (answer.contractHits.length) {
    lines.push('Kontrakt i uwagi (fragmenty):');
    answer.contractHits.forEach((hit) => lines.push(`- [linia ${hit.line}] ${hit.snippet}`));
    lines.push('');
  }
  lines.push('Artefakty:');
  answer.recommendedArtifacts.forEach((artifact) => lines.push(`- ${artifact}`));
  return lines.join('\n');
}

function buildKnowledgeAnswer(question) {
  const endpointHints = searchApiRows({ query: question, limit: 8 });
  const contractHits = searchMarkdownFile(CONTRACT_NOTES_PATH, question, 6);
  const writeHits = searchMarkdownFile(WRITE_NOTES_PATH, question, 4);
  const liveHits = searchMarkdownFile(LIVE_PROBE_PATH, question, 4);

  const note = endpointHints.length
    ? 'To jest odpowiedz Betterfly oparta o lokalna baze wiedzy i artefakty API.'
    : 'Brak mocnych trafien endpointow. Sprawdz artykuly referencyjne i doprecyzuj pytanie.';

  const answer = {
    question,
    primaryKb: BETTERFLY_KB_NAME,
    namespace: BETTERFLY_NAMESPACE,
    note,
    endpointHints,
    contractHits,
    writeHits,
    liveHits,
    recommendedArtifacts: knowledgeArtifacts(),
  };

  return {
    text: formatKnowledgeAnswer(answer),
    structured: answer,
  };
}

async function runReadTool(operationId, args = {}) {
  const includeSensitive = Boolean(args.includeSensitive);
  const result = await executeReadOperation(operationId, args);

  if (!result.ok) {
    const errorPayload = result.data ? redactBetterflyPayload(result.data) : null;
    return {
      text: `Request failed for ${operationId}: ${result.error}`,
      structured: {
        ok: false,
        operation: operationId,
        code: result.code,
        error: result.error,
        status: result.status || null,
        durationMs: result.durationMs || null,
        path: result.path || '',
        data: errorPayload,
      },
    };
  }

  const privacyApplied = applyPrivacyMode(result.data, { includeSensitive });
  const headline = `Operation ${operationId} finished: status=${result.status}, items=${result.itemCount}, durationMs=${result.durationMs}.`;

  return {
    text: `${headline} Privacy mode=${privacyApplied.privacy.mode}, redacted=${privacyApplied.privacy.redacted}.`,
    structured: {
      ok: true,
      operation: operationId,
      status: result.status,
      durationMs: result.durationMs,
      path: result.path,
      query: result.query,
      itemCount: result.itemCount,
      tokenSource: result.tokenSource,
      privacy: privacyApplied.privacy,
      data: privacyApplied.payload,
    },
  };
}

async function betterflyHealthTool() {
  const config = getClientConfig();
  const validation = validateClientConfig(config);
  const privacy = getPrivacyPolicy();
  return {
    text: validation.ok
      ? 'Betterfly MCP is configured and ready.'
      : `Betterfly MCP configuration issue: ${validation.errors.join(' ')}`,
    structured: {
      ok: validation.ok,
      service: SERVER_INFO,
      kb: {
        name: BETTERFLY_KB_NAME,
        namespace: BETTERFLY_NAMESPACE,
      },
      mode: 'read_only',
      privacy,
      config: validation.config,
      errors: validation.errors,
      capabilities: getCapabilities(),
    },
  };
}

async function betterflyTestAuthTool() {
  const startedAt = Date.now();
  try {
    const token = await getAccessToken({ forceRefresh: true });
    const ttlSeconds = Math.max(0, Math.floor((token.expiresAt - Date.now()) / 1000));
    return {
      text: `Authentication OK. Token source=${token.source}, ttlSeconds=${ttlSeconds}.`,
      structured: {
        ok: true,
        tokenSource: token.source,
        ttlSeconds,
        durationMs: Date.now() - startedAt,
      },
    };
  } catch (error) {
    const redacted = redactError(error);
    return {
      text: `Authentication failed: ${redacted.message}`,
      structured: {
        ok: false,
        code: redacted.code,
        error: redacted.message,
        durationMs: Date.now() - startedAt,
      },
    };
  }
}

function betterflyEndpointLookupTool(args = {}) {
  const results = searchApiRows({
    query: String(args.query || ''),
    method: String(args.method || ''),
    limit: Number(args.limit || 10),
  });
  const text = results.length
    ? results.map((item, index) => `${index + 1}. ${renderApiItem(item)}`).join('\n')
    : 'No endpoint matches found in local Betterfly KB artifacts.';
  return {
    text,
    structured: {
      ok: true,
      count: results.length,
      results,
      artifacts: [path.relative(ROOT, API_RESOURCE_CSV), path.relative(ROOT, API_PATTERN_CSV)],
    },
  };
}

function betterflyAuthFlowTool() {
  const guide = {
    tokenEndpoint: 'POST /api2/public/token',
    tokenHeaders: {
      Authorization: 'Basic base64(clientId:clientSecret)',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    tokenBody: 'grant_type=client_credentials',
    responseFields: ['access_token', 'token_type', 'expires'],
    nextHeader: 'Authorization: Bearer <access_token>',
  };
  return {
    text: [
      'Betterfly auth flow:',
      `- ${guide.tokenEndpoint}`,
      '- Authorization Basic client credentials',
      '- Body grant_type=client_credentials',
      '- Use Bearer token for later requests',
    ].join('\n'),
    structured: {
      ok: true,
      sourceNamespace: BETTERFLY_NAMESPACE,
      guide,
      evidenceArtifacts: [
        path.relative(ROOT, LIVE_PROBE_PATH),
        path.relative(ROOT, CONTRACT_NOTES_PATH),
      ],
    },
  };
}

function betterflyWriteWorkflowInfoTool() {
  const hits = searchMarkdownFile(WRITE_NOTES_PATH, 'create update confirm delete finalize invoices advance corrective', 12);
  return {
    text: hits.length
      ? hits.map((hit) => `- [linia ${hit.line}] ${hit.snippet}`).join('\n')
      : 'No write workflow snippets found.',
    structured: {
      ok: true,
      note: 'Knowledge-only write workflow guidance. MCP remains read-only.',
      hits,
      source: path.relative(ROOT, WRITE_NOTES_PATH),
    },
  };
}

function betterflyResourceContractTool(args = {}) {
  const resource = String(args.resource || '').trim();
  const query = resource || 'products customers invoices paymentdetails token';
  const contractHits = searchMarkdownFile(CONTRACT_NOTES_PATH, query, 12);
  const endpointHints = searchApiRows({ query, limit: 10 });
  return {
    text: contractHits.length
      ? contractHits.map((hit) => `- [linia ${hit.line}] ${hit.snippet}`).join('\n')
      : 'No contract snippets found for this resource.',
    structured: {
      ok: true,
      resource,
      contractHits,
      endpointHints,
      source: path.relative(ROOT, CONTRACT_NOTES_PATH),
    },
  };
}

async function betterflyExplainAndCallTool(args = {}) {
  const question = String(args.question || '').trim();
  const operation = String(args.operation || '').trim();
  const params = args.params && typeof args.params === 'object' && !Array.isArray(args.params)
    ? args.params
    : {};

  if (!READ_OPERATIONS[operation]) {
    return {
      text: `Unknown operation for explain_and_call: ${operation}`,
      structured: {
        ok: false,
        error: 'Unknown operation',
        operation,
        supported: Object.keys(READ_OPERATIONS),
      },
    };
  }

  const knowledge = buildKnowledgeAnswer(question || operation);
  const apiCall = await runReadTool(operation, {
    ...params,
    includeSensitive: Boolean(args.includeSensitive),
  });

  return {
    text: [
      'Knowledge:',
      knowledge.text,
      '',
      'API call:',
      apiCall.text,
    ].join('\n'),
    structured: {
      ok: Boolean(apiCall.structured?.ok),
      question,
      operation,
      knowledge: knowledge.structured,
      api: apiCall.structured,
    },
  };
}

function toolResultPayload(result) {
  return {
    content: [{ type: 'text', text: result.text }],
    structuredContent: result.structured,
  };
}

export function listTools() {
  return [
    makeTool('betterfly_health', 'Show Betterfly MCP configuration and privacy status.', {
      type: 'object',
      properties: {},
      additionalProperties: false,
    }),
    makeTool('betterfly_list_capabilities', 'List read-only Betterfly operations and resources.', {
      type: 'object',
      properties: {},
      additionalProperties: false,
    }),
    makeTool('betterfly_test_auth', 'Test Betterfly token authentication without returning tokens.', {
      type: 'object',
      properties: {},
      additionalProperties: false,
    }),
    makeTool('betterfly_answer', 'Answer Betterfly questions from local Betterfly KB artifacts.', {
      type: 'object',
      properties: {
        question: { type: 'string' },
      },
      required: ['question'],
      additionalProperties: false,
    }),
    makeTool('betterfly_endpoint_lookup', 'Lookup Betterfly endpoints and patterns from local KB.', {
      type: 'object',
      properties: {
        query: { type: 'string' },
        method: { type: 'string' },
        limit: { type: 'integer' },
      },
      required: ['query'],
      additionalProperties: false,
    }),
    makeTool('betterfly_auth_flow', 'Return Betterfly token and bearer authorization flow.', {
      type: 'object',
      properties: {},
      additionalProperties: false,
    }),
    makeTool('betterfly_write_workflow_info', 'Return Betterfly write workflow guidance (knowledge-only).', {
      type: 'object',
      properties: {},
      additionalProperties: false,
    }),
    makeTool('betterfly_resource_contract', 'Return contract snippets and endpoint hints for a Betterfly resource.', {
      type: 'object',
      properties: {
        resource: { type: 'string' },
      },
      required: ['resource'],
      additionalProperties: false,
    }),
    makeTool('betterfly_list_products', 'Read Betterfly products list.', {
      type: 'object',
      properties: {
        top: { type: 'integer' },
        skip: { type: 'integer' },
        filter: { type: 'string' },
        orderBy: { type: 'string' },
        includeSensitive: { type: 'boolean' },
      },
      additionalProperties: false,
    }),
    makeTool('betterfly_get_product', 'Read one Betterfly product by id.', {
      type: 'object',
      properties: {
        id: { type: 'string' },
        includeSensitive: { type: 'boolean' },
      },
      required: ['id'],
      additionalProperties: false,
    }),
    makeTool('betterfly_list_customers', 'Read Betterfly customers list.', {
      type: 'object',
      properties: {
        top: { type: 'integer' },
        skip: { type: 'integer' },
        filter: { type: 'string' },
        orderBy: { type: 'string' },
        includeSensitive: { type: 'boolean' },
      },
      additionalProperties: false,
    }),
    makeTool('betterfly_get_customer', 'Read one Betterfly customer by id.', {
      type: 'object',
      properties: {
        id: { type: 'string' },
        includeSensitive: { type: 'boolean' },
      },
      required: ['id'],
      additionalProperties: false,
    }),
    makeTool('betterfly_list_invoices', 'Read Betterfly invoices list.', {
      type: 'object',
      properties: {
        top: { type: 'integer' },
        skip: { type: 'integer' },
        filter: { type: 'string' },
        orderBy: { type: 'string' },
        includeSensitive: { type: 'boolean' },
      },
      additionalProperties: false,
    }),
    makeTool('betterfly_get_invoice', 'Read one Betterfly invoice by id.', {
      type: 'object',
      properties: {
        id: { type: 'string' },
        includeSensitive: { type: 'boolean' },
      },
      required: ['id'],
      additionalProperties: false,
    }),
    makeTool('betterfly_list_paymentdetails', 'Read Betterfly paymentdetails list.', {
      type: 'object',
      properties: {
        top: { type: 'integer' },
        skip: { type: 'integer' },
        filter: { type: 'string' },
        orderBy: { type: 'string' },
        includeSensitive: { type: 'boolean' },
      },
      additionalProperties: false,
    }),
    makeTool('betterfly_explain_and_call', 'Blend KB explanation with one live read-only Betterfly API call.', {
      type: 'object',
      properties: {
        question: { type: 'string' },
        operation: { type: 'string' },
        params: { type: 'object' },
        includeSensitive: { type: 'boolean' },
      },
      required: ['question', 'operation'],
      additionalProperties: false,
    }),
  ];
}

function listCapabilitiesTool() {
  return {
    text: `Supported read operations: ${Object.keys(READ_OPERATIONS).join(', ')}`,
    structured: {
      ok: true,
      capabilities: getCapabilities(),
      privacy: getPrivacyPolicy(),
      readOnly: true,
    },
  };
}

export async function handleJsonRpcRequest(request) {
  const { id, method, params } = request || {};

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        serverInfo: SERVER_INFO,
        capabilities: { tools: {}, resources: {} },
      },
    };
  }

  if (method === 'notifications/initialized') {
    return null;
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: { tools: listTools() },
    };
  }

  if (method === 'resources/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: { resources: [] },
    };
  }

  if (method === 'resources/read') {
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32002, message: 'Resources are not exposed by this bridge.' },
    };
  }

  if (method === 'tools/call') {
    const name = params?.name;
    const args = params?.arguments || {};

    try {
      if (name === 'betterfly_health') {
        return { jsonrpc: '2.0', id, result: toolResultPayload(await betterflyHealthTool()) };
      }
      if (name === 'betterfly_list_capabilities') {
        return { jsonrpc: '2.0', id, result: toolResultPayload(listCapabilitiesTool()) };
      }
      if (name === 'betterfly_test_auth') {
        return { jsonrpc: '2.0', id, result: toolResultPayload(await betterflyTestAuthTool()) };
      }
      if (name === 'betterfly_answer') {
        return {
          jsonrpc: '2.0',
          id,
          result: toolResultPayload(buildKnowledgeAnswer(String(args.question || ''))),
        };
      }
      if (name === 'betterfly_endpoint_lookup') {
        return {
          jsonrpc: '2.0',
          id,
          result: toolResultPayload(betterflyEndpointLookupTool(args)),
        };
      }
      if (name === 'betterfly_auth_flow') {
        return {
          jsonrpc: '2.0',
          id,
          result: toolResultPayload(betterflyAuthFlowTool()),
        };
      }
      if (name === 'betterfly_write_workflow_info') {
        return {
          jsonrpc: '2.0',
          id,
          result: toolResultPayload(betterflyWriteWorkflowInfoTool()),
        };
      }
      if (name === 'betterfly_resource_contract') {
        return {
          jsonrpc: '2.0',
          id,
          result: toolResultPayload(betterflyResourceContractTool(args)),
        };
      }

      if (name === 'betterfly_list_products') {
        return { jsonrpc: '2.0', id, result: toolResultPayload(await runReadTool('list_products', args)) };
      }
      if (name === 'betterfly_get_product') {
        return { jsonrpc: '2.0', id, result: toolResultPayload(await runReadTool('get_product', args)) };
      }
      if (name === 'betterfly_list_customers') {
        return { jsonrpc: '2.0', id, result: toolResultPayload(await runReadTool('list_customers', args)) };
      }
      if (name === 'betterfly_get_customer') {
        return { jsonrpc: '2.0', id, result: toolResultPayload(await runReadTool('get_customer', args)) };
      }
      if (name === 'betterfly_list_invoices') {
        return { jsonrpc: '2.0', id, result: toolResultPayload(await runReadTool('list_invoices', args)) };
      }
      if (name === 'betterfly_get_invoice') {
        return { jsonrpc: '2.0', id, result: toolResultPayload(await runReadTool('get_invoice', args)) };
      }
      if (name === 'betterfly_list_paymentdetails') {
        return { jsonrpc: '2.0', id, result: toolResultPayload(await runReadTool('list_paymentdetails', args)) };
      }
      if (name === 'betterfly_explain_and_call') {
        return { jsonrpc: '2.0', id, result: toolResultPayload(await betterflyExplainAndCallTool(args)) };
      }
    } catch (error) {
      const redacted = redactError(error);
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32010,
          message: redacted.message,
          data: { code: redacted.code || 'ERROR' },
        },
      };
    }

    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Unknown tool: ${name}` },
    };
  }

  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Unknown method: ${method}` },
  };
}
