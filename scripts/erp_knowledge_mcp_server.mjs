#!/usr/bin/env node

import { handleJsonRpcRequest } from './lib/erp_knowledge_mcp_core.mjs';

const MAX_FRAME_BYTES = Number(process.env.ERP_KB_MCP_MAX_FRAME_BYTES || 1048576);

function writeMessage(message) {
  const payload = JSON.stringify(message);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(payload, 'utf8')}\r\n\r\n${payload}`);
}

const requestQueue = [];
let processing = false;
let buffer = Buffer.alloc(0);

async function processQueue() {
  if (processing) return;
  processing = true;
  while (requestQueue.length) {
    const request = requestQueue.shift();
    try {
      const response = await handleJsonRpcRequest(request);
      if (response) writeMessage(response);
    } catch (error) {
      writeMessage({
        jsonrpc: '2.0',
        id: request?.id ?? null,
        error: { code: -32603, message: error.message },
      });
    }
  }
  processing = false;
}

process.stdin.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);

  if (buffer.length > MAX_FRAME_BYTES + 8192) {
    buffer = Buffer.alloc(0);
    writeMessage({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32001, message: `Frame buffer exceeds ${MAX_FRAME_BYTES} bytes.` },
    });
    return;
  }

  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) break;

    const header = buffer.slice(0, headerEnd).toString('utf8');
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      buffer = Buffer.alloc(0);
      break;
    }

    const length = Number(match[1]);
    if (length > MAX_FRAME_BYTES) {
      buffer = Buffer.alloc(0);
      writeMessage({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32001, message: `Content-Length exceeds ${MAX_FRAME_BYTES} bytes.` },
      });
      break;
    }

    const total = headerEnd + 4 + length;
    if (buffer.length < total) break;

    const body = buffer.slice(headerEnd + 4, total).toString('utf8');
    buffer = buffer.slice(total);

    try {
      const request = JSON.parse(body);
      requestQueue.push(request);
      processQueue();
    } catch (error) {
      writeMessage({
        jsonrpc: '2.0',
        error: { code: -32700, message: `Parse error: ${error.message}` },
      });
    }
  }
});
