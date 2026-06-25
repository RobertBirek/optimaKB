#!/usr/bin/env node

import fs from 'fs';
import { answerQuestion, renderAnswerMarkdown } from '../erp_knowledge_answer.mjs';
import { buildResponse, classifyQuestion, loadRouting, renderMarkdown } from '../erp_knowledge_assistant.mjs';
import { submitKnowledgeDraft } from './knowledge_inbox.mjs';
import {
  createExternalKnowledgeDraft,
  getExternalSearchStatus,
  searchExternalSources,
} from './external_search.mjs';

const routing = loadRouting();

export const SERVER_INFO = { name: 'erp-knowledge-assistant', version: '1.1.0' };
export const PROTOCOL_VERSION = '2024-11-05';

const KB_REGISTRY = [
  { name: 'Comarch Optima ERP MSSQL Schema', namespace: 'ComarchOptimaSchema', projectId: 4 },
  { name: 'Comarch Optima Additional Functions', namespace: 'ComarchOptimaAdditionalFunctions', projectId: 6 },
  { name: 'Comarch Optima Sprint and Prints', namespace: 'ComarchOptimaSprint', projectId: 7 },
  { name: 'Comarch Optima Reference', namespace: 'ComarchOptimaReference', projectId: 8 },
  { name: 'Comarch Optima Partner Technical', namespace: 'ComarchOptimaPartnerTechnical', projectId: 9 },
  { name: 'Comarch Betterfly Reference', namespace: 'ComarchBetterflyReference', projectId: 10 },
  { name: 'Comarch Optima Business Semantics', namespace: 'ComarchOptimaBusinessSemantics', projectId: 15 },
];

function makeTool(name, description, inputSchema, annotations, outputSchema) {
  const tool = { name, description, inputSchema };
  if (annotations) tool.annotations = annotations;
  if (outputSchema) tool.outputSchema = outputSchema;
  return tool;
}

function readOnlyTool(name, description, inputSchema, outputSchema) {
  return makeTool(name, description, inputSchema, {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  }, outputSchema);
}

function writeTool(name, description, inputSchema, outputSchema) {
  return makeTool(name, description, inputSchema, {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  }, outputSchema);
}

export function listTools() {
  return [
    readOnlyTool(
      'route_question',
      'Classify a question into the correct ERP knowledge base set. Returns KB names, namespaces, project IDs and confidence scores.',
      {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'Natural language question about Comarch ERP Optima, Betterfly, or Taxbell.' },
        },
        required: ['question'],
        additionalProperties: false,
      },
      {
        type: 'object',
        properties: {
          primaryKb: { type: 'object', properties: { name: { type: 'string' }, namespace: { type: 'string' }, projectId: { type: 'integer' }, confidence: { type: 'number' } } },
          additionalKbs: { type: 'array', items: { type: 'object' } },
          question: { type: 'string' },
        },
      },
    ),
    readOnlyTool(
      'answer_question',
      'Return a practical starter answer with evidence snippets from the routed KBs. Use after route_question to get detailed answers.',
      {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'Natural language question about Comarch ERP Optima, Betterfly, or Taxbell.' },
        },
        required: ['question'],
        additionalProperties: false,
      },
      {
        type: 'object',
        properties: {
          answer: { type: 'string' },
          kbsUsed: { type: 'array', items: { type: 'object' } },
          confidence: { type: 'number' },
        },
      },
    ),
    readOnlyTool(
      'run_community_thread_test',
      'Return the latest public Comarch community full-thread benchmark summary with PASS/PARTIAL/MISS counts.',
      {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      {
        type: 'object',
        properties: {
          available: { type: 'boolean' },
          summary: { type: 'object', properties: { PASS: { type: 'integer' }, PARTIAL: { type: 'integer' }, MISS: { type: 'integer' } } },
        },
      },
    ),
    writeTool(
      'submit_knowledge_draft',
      'Write a local knowledge draft to downloads/knowledge_inbox/ for later promotion into a target KB. Does NOT mutate OpenSPG directly.',
      {
        type: 'object',
        properties: {
          kbName: { type: 'string', description: 'Target KB display name, e.g. Comarch Optima ERP MSSQL Schema' },
          kbNamespace: { type: 'string', description: 'Target KB namespace, e.g. ComarchOptimaSchema' },
          title: { type: 'string', description: 'Draft title, should be descriptive and searchable' },
          content: { type: 'string', description: 'Markdown content body of the knowledge draft' },
          sourceUrl: { type: 'string', description: 'Optional URL where the source material was found' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Optional filter tags for the inbox' },
        },
        required: ['kbName', 'kbNamespace', 'title', 'content'],
        additionalProperties: false,
      },
      {
        type: 'object',
        properties: {
          saved: { type: 'boolean' },
          jsonPath: { type: 'string' },
          mdPath: { type: 'string' },
          draft: { type: 'object' },
        },
      },
    ),
    readOnlyTool(
      'search_external_sources',
      'Search external web sources through Exa for Optima, Betterfly, or adjacent topics. Requires Exa API or MCP configuration.',
      {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query describing the information to find' },
          kbName: { type: 'string', description: 'Optional KB name to narrow search context' },
          includeDomains: { type: 'array', items: { type: 'string' }, description: 'Optional list of domains to restrict search to' },
          numResults: { type: 'integer', description: 'Number of results to return (default 5, max 20)' },
        },
        required: ['query'],
        additionalProperties: false,
      },
      {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          results: { type: 'array', items: { type: 'object' } },
        },
      },
    ),
    writeTool(
      'draft_external_source',
      'Search Exa for an external source and save one selected result as a reviewed-later knowledge draft. Searches first, then drafts the best match.',
      {
        type: 'object',
        properties: {
          kbName: { type: 'string', description: 'Target KB display name' },
          kbNamespace: { type: 'string', description: 'Target KB namespace' },
          query: { type: 'string', description: 'Search query to find the source material' },
          url: { type: 'string', description: 'Optional specific URL to draft (must be in Exa results)' },
          title: { type: 'string', description: 'Optional override title' },
          notes: { type: 'string', description: 'Optional editorial notes' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Optional inbox filter tags' },
        },
        required: ['kbName', 'kbNamespace', 'query'],
        additionalProperties: false,
      },
      {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          draft: { type: 'object' },
          jsonPath: { type: 'string' },
          mdPath: { type: 'string' },
        },
      },
    ),
    readOnlyTool(
      'list_knowledge_bases',
      'Return the list of configured ERP knowledge bases with their names, namespaces, and project IDs.',
      {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      {
        type: 'object',
        properties: {
          kbs: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, namespace: { type: 'string' }, projectId: { type: 'integer' } } } },
          count: { type: 'integer' },
        },
      },
    ),
  ];
}

function routeQuestionTool(question, allowedNamespaces) {
  const classified = classifyQuestion(question, routing, allowedNamespaces);
  const response = buildResponse(classified, routing, allowedNamespaces);
  return {
    text: renderMarkdown(response),
    structured: response,
  };
}

async function answerQuestionTool(question, allowedNamespaces) {
  const { answer } = await answerQuestion(question, allowedNamespaces);
  return {
    text: renderAnswerMarkdown(answer),
    structured: answer,
  };
}

async function searchExternalSourcesTool({ query, kbName, includeDomains, numResults }) {
  const status = getExternalSearchStatus();
  if (!status.enabled) {
    return {
      text: 'External search is not configured. Set Exa API or MCP configuration first.',
      structured: {
        ok: false,
        enabled: false,
        status,
        results: [],
      },
    };
  }
  const result = await searchExternalSources({
    query,
    kbName,
    includeDomains: Array.isArray(includeDomains) ? includeDomains : [],
    numResults: Number(numResults || 5),
    logContext: 'mcp_search_external_sources',
    text: true,
  });
  return {
    text: result.results.length
      ? result.results
        .slice(0, 5)
        .map((item, index) => `${index + 1}. [${item.sourceType}] ${item.title} -> ${item.url}`)
        .join('\n')
      : 'No external results returned.',
    structured: result,
  };
}

async function draftExternalSourceTool({ kbName, kbNamespace, query, url, title, notes, tags }) {
  const searchResult = await searchExternalSources({
    query,
    kbName,
    numResults: 10,
    logContext: 'mcp_draft_external_source',
    text: true,
  });
  if (!searchResult.ok || !searchResult.results.length) {
    return {
      text: 'No external result was available to draft.',
      structured: {
        ok: false,
        searchResult,
      },
    };
  }
  const selected = url
    ? searchResult.results.find((item) => item.url === url)
    : searchResult.results[0];
  if (!selected) {
    return {
      text: `Requested URL was not found in Exa results: ${url}`,
      structured: {
        ok: false,
        searchResult,
      },
    };
  }
  const drafted = await createExternalKnowledgeDraft({
    kbName: String(kbName || ''),
    kbNamespace: String(kbNamespace || ''),
    query,
    result: {
      ...selected,
      title: String(title || selected.title || query || '').trim(),
    },
    notes,
    tags: Array.isArray(tags) ? tags : [],
    auto: false,
  });
  if (!drafted.ok) {
    return {
      text: 'External draft could not be created.',
      structured: drafted,
    };
  }
  if (!drafted.created) {
    return {
      text: drafted.skipped === 'duplicate_source'
        ? `External source already exists in the inbox or promoted drafts: ${drafted.existing?.sourceUrl || selected.url}`
        : 'External draft was skipped.',
      structured: drafted,
    };
  }
  const draft = drafted.draft;
  return {
    text: [
      'External knowledge draft saved.',
      `Title: ${draft.draft.title}`,
      `URL: ${selected.url}`,
      `JSON: ${draft.jsonPath}`,
      `Markdown: ${draft.mdPath}`,
    ].join('\n'),
    structured: {
      ok: true,
      draft: draft.draft,
      jsonPath: draft.jsonPath,
      mdPath: draft.mdPath,
      selectedResult: selected,
    },
  };
}

function runCommunityThreadTest() {
  const jsonPath = '/docker/openspg/docs/reference/ERP_Knowledge_Assistant_Community_FullThread_TestPack.json';
  const mdPath = '/docker/openspg/docs/reference/ERP_Knowledge_Assistant_Community_FullThread_TestPack.md';
  if (!fs.existsSync(jsonPath) || !fs.existsSync(mdPath)) {
    return {
      text: 'Community full-thread benchmark artifacts are missing. Run node scripts/run_community_thread_test.mjs first.',
      structured: {
        available: false,
        jsonPath,
        mdPath,
      },
    };
  }

  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  return {
    text: `Community full-thread benchmark summary: PASS=${json.summary.PASS}, PARTIAL=${json.summary.PARTIAL}, MISS=${json.summary.MISS}.`,
    structured: {
      available: true,
      summary: json.summary,
      jsonPath,
      mdPath,
    },
  };
}

function toolResultPayload(result) {
  return {
    content: [{ type: 'text', text: result.text }],
    structuredContent: result.structured,
  };
}

function writeToolDenied(id, name) {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code: -32003,
      message: `Write access is required for tool: ${name}`,
    },
  };
}

export async function handleJsonRpcRequest(request, context = {}) {
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
    const kbList = context.allowedNamespaces
      ? KB_REGISTRY.filter((kb) => context.allowedNamespaces.has(kb.namespace))
      : KB_REGISTRY;
    const resources = kbList.map((kb) => ({
      uri: `erp-kb://${kb.namespace}/info`,
      name: kb.name,
      description: `Knowledge base: ${kb.name} (project ${kb.projectId})`,
      mimeType: 'application/json',
    }));
    return {
      jsonrpc: '2.0',
      id,
      result: { resources },
    };
  }

  if (method === 'resources/read') {
    const uri = params?.uri || '';
    const match = uri.match(/^erp-kb:\/\/(\w+)\/info$/);
    if (match) {
      const kb = KB_REGISTRY.find((k) => k.namespace === match[1]);
      if (kb) {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(kb, null, 2),
            }],
          },
        };
      }
    }
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32002, message: `Resource not found: ${uri}. Available resources: erp-kb://{namespace}/info for each configured KB.` },
    };
  }

  if (method === 'tools/call') {
    const name = params?.name;
    const args = params?.arguments || {};
    const writeTools = new Set(['submit_knowledge_draft', 'draft_external_source']);
    if (writeTools.has(name) && context.writeAllowed === false) {
      return writeToolDenied(id, name);
    }

    const allowedNss = context.allowedNamespaces; // Set or null

    if (name === 'route_question') {
      const result = allowedNss
        ? routeQuestionTool(String(args.question || ''), allowedNss)
        : routeQuestionTool(String(args.question || ''));
      return { jsonrpc: '2.0', id, result: toolResultPayload(result) };
    }

    if (name === 'answer_question') {
      const result = await answerQuestionTool(String(args.question || ''), allowedNss);
      return { jsonrpc: '2.0', id, result: toolResultPayload(result) };
    }

    if (name === 'run_community_thread_test') {
      return {
        jsonrpc: '2.0',
        id,
        result: toolResultPayload(runCommunityThreadTest()),
      };
    }

    if (name === 'list_knowledge_bases') {
      const kbList = allowedNss
        ? KB_REGISTRY.filter((kb) => allowedNss.has(kb.namespace))
        : KB_REGISTRY;
      return {
        jsonrpc: '2.0',
        id,
        result: toolResultPayload({
          text: kbList.map((kb) => `- ${kb.name} (${kb.namespace}, project ${kb.projectId})`).join('\n'),
          structured: { kbs: kbList, count: kbList.length },
        }),
      };
    }

    if (name === 'submit_knowledge_draft') {
      const result = await submitKnowledgeDraft({
        kbName: String(args.kbName || ''),
        kbNamespace: String(args.kbNamespace || ''),
        title: String(args.title || ''),
        content: String(args.content || ''),
        sourceUrl: args.sourceUrl ? String(args.sourceUrl) : '',
        tags: Array.isArray(args.tags) ? args.tags : [],
      }, { silent: true });
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: [
                'Knowledge draft saved.',
                `JSON: ${result.jsonPath}`,
                `Markdown: ${result.mdPath}`,
              ].join('\n'),
            },
          ],
          structuredContent: {
            saved: true,
            jsonPath: result.jsonPath,
            mdPath: result.mdPath,
            draft: result.draft,
          },
        },
      };
    }

    if (name === 'search_external_sources') {
      return {
        jsonrpc: '2.0',
        id,
        result: toolResultPayload(await searchExternalSourcesTool({
          query: String(args.query || ''),
          kbName: String(args.kbName || ''),
          includeDomains: Array.isArray(args.includeDomains) ? args.includeDomains : [],
          numResults: Number(args.numResults || 5),
        })),
      };
    }

    if (name === 'draft_external_source') {
      return {
        jsonrpc: '2.0',
        id,
        result: toolResultPayload(await draftExternalSourceTool({
          kbName: String(args.kbName || ''),
          kbNamespace: String(args.kbNamespace || ''),
          query: String(args.query || ''),
          url: args.url ? String(args.url) : '',
          title: args.title ? String(args.title) : '',
          notes: args.notes ? String(args.notes) : '',
          tags: Array.isArray(args.tags) ? args.tags : [],
        })),
      };
    }

    const toolNames = listTools().map((t) => t.name).join(', ');
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Unknown tool: "${name}". Available tools: ${toolNames}. Use tools/list to discover all tools.` },
    };
  }

  const knownMethods = ['initialize', 'notifications/initialized', 'tools/list', 'tools/call', 'resources/list', 'resources/read'];
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code: -32601,
      message: `Unknown method: "${method}". Supported methods: ${knownMethods.join(', ')}. Check the method name for typos.`,
    },
  };
}
