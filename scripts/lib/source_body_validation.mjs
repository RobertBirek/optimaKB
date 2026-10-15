import { cleanBoilerplate, normalizeWhitespace } from './content_cleaner.mjs';

function comparisonText(value) {
  return normalizeWhitespace(value)
    .replace(/^#{1,6}\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleText(value) {
  return comparisonText(value).replace(/\s+-\s+Społeczność ERP$/i, '').toLowerCase();
}

function titleShellPattern(title) {
  // Keep original and cleaned variants: discovery cleans the body with these
  // same deterministic rules before validation, but retains the source title.
  const variants = [...new Set([titleText(title), titleText(cleanBoilerplate(title))])]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!variants.length) return null;
  const token = `(?:${variants.join('|')})(?: - Społeczność ERP)?`;
  return new RegExp(`^(?:${token})(?:\\s+(?:${token}))*(?:\\s+loader)?$`, 'i');
}

function withoutFencedDiagnostics(value) {
  const lines = String(value || '').replace(/\r/g, '').split('\n');
  const outside = [];
  let opener = null;
  let start = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (opener) {
      const closer = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(line);
      if (closer && closer[1][0] === opener[0] && closer[1].length >= opener.length) {
        opener = null;
        outside.push('');
      }
    } else {
      const fence = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
      if (fence) {
        opener = fence[1];
        start = index;
      } else outside.push(line);
    }
  }
  // Only complete blocks are excluded; unmatched openers retain their content.
  if (opener) {
    for (let index = start; index < lines.length; index += 1) outside.push(lines[index]);
  }
  return outside.join('\n');
}

export function assessSourceBody(value, title = '') {
  const text = normalizeWhitespace(value);
  if (!text) return { ok: false, code: 'EMPTY_SOURCE_BODY' };
  const titleShell = titleShellPattern(title);
  // Match complete title-token lines only, optionally ending with loader.
  // Substantive trailing text and loader prefixes remain source content.
  const hasBody = text.split('\n').some(line => {
    const trimmed = line.trim();
    if (!trimmed || /^loader$/i.test(trimmed)) return false;
    if (/^!\[(?:logo|logotype)\b[^\]]*\]\([^\n)]*\)$/i.test(trimmed)) return false;
    if (titleShell?.test(comparisonText(trimmed))) return false;
    return true;
  });
  if (!hasBody) return { ok: false, code: 'SOURCE_SHELL_ONLY' };

  const refusal = /^W dostarczonych materiałach nie ma surowej treści\b/i.test(text);
  // Fenced diagnostics are quoted examples, not missing-content statements.
  // Recognize indentation before whitespace normalization collapses it.
  const unquotedText = withoutFencedDiagnostics(value);
  const summary = /^(?:User query:[^\n]*\n\s*)?-?\s*The page title suggests\b/i.test(text)
    && /^\s*-?\s*No detailed content snippets are provided\b/im.test(unquotedText);
  if (refusal || summary) return { ok: false, code: 'SOURCE_CONTENT_UNAVAILABLE' };
  return { ok: true, code: null };
}

export function assertSourceBodyAvailable(value, title = '') {
  const result = assessSourceBody(value, title);
  if (!result.ok) {
    const error = new Error(`Source body unavailable: ${result.code}`);
    error.code = result.code;
    throw error;
  }
}
