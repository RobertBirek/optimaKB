import fs from 'fs';
import zlib from 'zlib';
import process from 'process';

const TIKA_URL = process.env.TIKA_URL || 'http://127.0.0.1:9998';
const STIRLING_PDF_URL = process.env.STIRLING_PDF_URL || '';
const STIRLING_PDF_API_KEY = process.env.STIRLING_PDF_API_KEY || '';
const MAX_BYTES_EXTERNAL = 50 * 1024 * 1024;
const EXTERNAL_TIMEOUT_MS = 30000;

function normalizeWhitespace(value) {
  return String(value || '')
    .split('\x00').join(' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function looksHumanText(value) {
  const text = normalizeWhitespace(value);
  if (!text || text.length < 4) return false;
  const chars = [...text];
  let letterish = 0;
  let printable = 0;
  let weird = 0;
  for (const ch of chars) {
    if (/[\p{L}\p{N}]/u.test(ch)) {
      letterish += 1;
      printable += 1;
    } else if (/[\s.,:;!?()[\]{}'"%&@/\\+\-=_*#]/u.test(ch)) {
      printable += 1;
    } else {
      weird += 1;
    }
  }
  const ratio = printable / Math.max(chars.length, 1);
  if (letterish < 3) return false;
  if (ratio < 0.72) return false;
  if (weird > printable) return false;
  if (/^(?:[\p{L}\p{N}] ?){1,4}$/u.test(text)) return false;
  return true;
}

function decodePdfLiteral(literal) {
  let out = '';
  for (let i = 0; i < literal.length; i += 1) {
    const ch = literal[i];
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    const next = literal[i + 1];
    if (next == null) break;
    i += 1;
    if (next === 'n') out += '\n';
    else if (next === 'r') out += '\r';
    else if (next === 't') out += '\t';
    else if (next === 'b') out += '\b';
    else if (next === 'f') out += '\f';
    else if (next === '(' || next === ')' || next === '\\') out += next;
    else if (/[0-7]/.test(next)) {
      let oct = next;
      while (i + 1 < literal.length && oct.length < 3 && /[0-7]/.test(literal[i + 1])) {
        i += 1;
        oct += literal[i];
      }
      out += String.fromCharCode(parseInt(oct, 8));
    } else {
      out += next;
    }
  }
  return out;
}

function decodePdfHex(hex) {
  const normalized = hex.replace(/[^0-9a-fA-F]/g, '');
  const padded = normalized.length % 2 === 1 ? `${normalized}0` : normalized;
  const bytes = Buffer.from(padded, 'hex');
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const swapped = Buffer.from(bytes.slice(2));
    swapped.swap16();
    return swapped.toString('utf16le');
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return bytes.slice(2).swap16().toString('utf16le');
  }
  return bytes.toString('latin1');
}

function extractTextTokens(streamText) {
  const tokens = [];
  let i = 0;
  while (i < streamText.length) {
    const ch = streamText[i];
    if (ch === '(') {
      let depth = 1;
      let token = '';
      i += 1;
      while (i < streamText.length && depth > 0) {
        const current = streamText[i];
        if (current === '\\') {
          token += current;
          i += 1;
          if (i < streamText.length) token += streamText[i];
        } else if (current === '(') {
          depth += 1;
          token += current;
        } else if (current === ')') {
          depth -= 1;
          if (depth > 0) token += current;
        } else {
          token += current;
        }
        i += 1;
      }
      const decoded = normalizeWhitespace(decodePdfLiteral(token));
      if (looksHumanText(decoded)) tokens.push(decoded);
      continue;
    }
    if (ch === '<' && streamText[i + 1] !== '<') {
      const end = streamText.indexOf('>', i + 1);
      if (end !== -1) {
        const decoded = normalizeWhitespace(decodePdfHex(streamText.slice(i + 1, end)));
        if (looksHumanText(decoded)) tokens.push(decoded);
        i = end + 1;
        continue;
      }
    }
    i += 1;
  }
  return tokens;
}

function maybeInflate(buffer) {
  const attempts = [() => zlib.inflateSync(buffer), () => zlib.inflateRawSync(buffer)];
  for (const attempt of attempts) {
    try {
      return attempt();
    } catch {
      // try next inflate method
    }
  }
  return null;
}

function extractStreams(buffer) {
  const text = buffer.toString('latin1');
  const streams = [];
  const streamToken = 'stream';
  const endToken = 'endstream';
  let cursor = 0;
  while (cursor < text.length) {
    const streamIndex = text.indexOf(streamToken, cursor);
    if (streamIndex === -1) break;
    const dictStart = text.lastIndexOf('<<', streamIndex);
    const dictEnd = text.lastIndexOf('>>', streamIndex);
    const startLineIndex = text.indexOf('\n', streamIndex);
    if (dictStart === -1 || dictEnd === -1 || startLineIndex === -1) {
      cursor = streamIndex + streamToken.length;
      continue;
    }
    let dataStart = startLineIndex + 1;
    if (text[startLineIndex - 1] === '\r') {
      dataStart = startLineIndex + 1;
    }
    const endIndex = text.indexOf(endToken, dataStart);
    if (endIndex === -1) break;
    const dict = text.slice(dictStart, dictEnd + 2);
    const raw = buffer.subarray(dataStart, endIndex);
    streams.push({ dict, raw });
    cursor = endIndex + endToken.length;
  }
  return streams;
}

function titleFromMetadata(buffer) {
  const text = buffer.toString('latin1');
  const match = text.match(/\/Title\s*\(([\s\S]*?)\)/);
  if (!match) return '';
  return normalizeWhitespace(decodePdfLiteral(match[1]));
}

function extractPdfTextLocal(filePath) {
  const buffer = fs.readFileSync(filePath);
  const tokenSet = new Set();
  for (const { dict, raw } of extractStreams(buffer)) {
    const decodedBuffer = /\/FlateDecode/.test(dict) ? maybeInflate(raw) : raw;
    if (!decodedBuffer) continue;
    const streamText = decodedBuffer.toString('latin1');
    if (!/(BT|Tj|TJ|Tf)/.test(streamText)) continue;
    for (const token of extractTextTokens(streamText)) {
      if (token.length >= 2) tokenSet.add(token);
    }
  }
  const parts = [...tokenSet];
  const title = titleFromMetadata(buffer);
  if (looksHumanText(title)) parts.unshift(title);
  return normalizeWhitespace(parts.join('\n'));
}

async function extractPdfTextViaTika(buffer) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXTERNAL_TIMEOUT_MS);
  try {
    const response = await fetch(`${TIKA_URL}/tika`, {
      method: 'PUT',
      body: buffer,
      headers: { 'Content-Type': 'application/pdf' },
      signal: controller.signal,
    });
    if (!response.ok) {
      console.warn(`[pdf_text] Tika returned HTTP ${response.status}, falling back`);
      return null;
    }
    const xhtml = await response.text();
    const cleaned = xhtml
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .trim();
    return normalizeWhitespace(cleaned);
  } catch (error) {
    console.warn(`[pdf_text] Tika error: ${error.message}, falling back`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function extractPdfTextViaStirling(buffer) {
  if (!STIRLING_PDF_URL) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXTERNAL_TIMEOUT_MS);
  try {
    const form = new FormData();
    form.append('fileInput', new Blob([buffer], { type: 'application/pdf' }), 'document.pdf');
    const headers = { 'X-API-KEY': STIRLING_PDF_API_KEY };
    const response = await fetch(`${STIRLING_PDF_URL}/api/v1/convert/pdf/markdown`, {
      method: 'POST',
      body: form,
      headers,
      signal: controller.signal,
    });
    if (!response.ok) {
      console.warn(`[pdf_text] StirlingPDF returned HTTP ${response.status}, falling back`);
      return null;
    }
    const markdown = await response.text();
    return normalizeWhitespace(markdown);
  } catch (error) {
    console.warn(`[pdf_text] StirlingPDF error: ${error.message}, falling back`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function extractPdfText(filePath) {
  const stat = fs.statSync(filePath);
  const buffer = fs.readFileSync(filePath);

  if (stat.size <= MAX_BYTES_EXTERNAL && stat.size > 0) {
    let text = await extractPdfTextViaStirling(buffer);
    if (text && text.length >= 120) return text;
    text = await extractPdfTextViaTika(buffer);
    if (text && text.length >= 120) return text;
  }

  const fallback = extractPdfTextLocal(filePath);
  if (fallback && fallback.length >= 120) return fallback;
  return fallback || '';
}
