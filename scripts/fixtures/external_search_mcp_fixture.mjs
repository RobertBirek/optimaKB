#!/usr/bin/env node

import fs from 'fs';

const [mode, counterPath] = process.argv.slice(2);
const attempt = fs.existsSync(counterPath)
  ? Number(fs.readFileSync(counterPath, 'utf8')) + 1
  : 1;
fs.writeFileSync(counterPath, String(attempt), 'utf8');

let buffer = Buffer.alloc(0);

function writeFrame(payload) {
  const body = JSON.stringify(payload);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`);
}

function readFrames() {
  const frames = [];
  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) return frames;
    const header = buffer.slice(0, headerEnd).toString('utf8');
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) return frames;
    const length = Number(match[1]);
    const total = headerEnd + 4 + length;
    if (buffer.length < total) return frames;
    const body = buffer.slice(headerEnd + 4, total).toString('utf8');
    buffer = buffer.slice(total);
    frames.push(JSON.parse(body));
  }
}

process.stdin.on('data', (chunk) => {
  if (mode === 'exit') process.exit(17);
  if (mode === 'timeout-then-success' && attempt === 1) return;

  buffer = Buffer.concat([buffer, chunk]);
  for (const request of readFrames()) {
    if (mode === 'malformed') {
      process.stdout.write('Content-Length: 1\r\n\r\n{');
      continue;
    }
    writeFrame({
      jsonrpc: '2.0',
      id: request.id,
      result: request.method === 'tools/call'
        ? { structuredContent: { results: [] } }
        : {},
    });
  }
});
