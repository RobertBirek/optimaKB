// Pure request-local lexical attribution. No metadata classification or SQL
// inference belongs here. All spans, including decoded-unit maps, are UTF-16.
const VIEWS = Symbol('semantic lexical views');
const IDENTIFIER = /^[\p{L}_][\p{L}\p{N}_-]*(?:[.:][\p{L}\p{N}_-]+)*$/u;
const BARE = /^[\p{L}_][\p{L}\p{N}_-]*$/u;
const NUMBER = /^[+-]?\d+(?:\.\d+)?$/;
const COMPARISON = /^(?:!=|<>|>=|<=|=|>|<)$/;
const CLOSE = Object.freeze({ "'": "'", '"': '"', '`': '`', '[': ']', '„': '”' });

function unitAt(text, index) {
  return text[index];
}
function whitespace(c) { return c !== undefined && /\s/u.test(c); }
function linebreak(text) { return /[\r\n]/.test(text); }
function letterNumber(c) { return c !== undefined && /[\p{L}\p{N}]/u.test(c); }
function apostropheInsideWord(text, i) {
  const previous = unitAt(text, i - 1);
  const start = previous && /[\uDC00-\uDFFF]/.test(previous) ? i - 2 : i - 1;
  return start >= 0 && i + 1 < text.length
    && letterNumber(String.fromCodePoint(text.codePointAt(start)))
    && letterNumber(String.fromCodePoint(text.codePointAt(i + 1)));
}
function token(text, start, end, kind, role = 'syntax', delimiter = null, closed = true) {
  return { start, end, kind, role, raw: text.slice(start, end), delimiter, closed,
    value: null, valueSpans: [], intendedRole: null };
}
function malformed(t, intendedRole) {
  t.role = 'malformed'; t.value = null; t.valueSpans = []; t.intendedRole = intendedRole;
  return t;
}
function reference(t, value, spans) {
  t.role = 'technicalIdentifier'; t.kind = 'reference'; t.value = value;
  t.valueSpans = spans;
  return t;
}
function rawSpans(start, end) {
  const spans = [];
  for (let i = start; i < end; i++) {
    spans.push({ start: i, end: i + 1 });
  }
  return spans;
}

// One forward closure scan. Doubled/escaped closers decode for references only;
// operands later retain their full original spelling instead of this value.
function atom(text, start, mode) {
  const delimiter = unitAt(text, start), close = CLOSE[delimiter];
  let i = start + 1, closed = false;
  const units = [], spans = [];
  while (i < text.length) {
    const c = unitAt(text, i), next = unitAt(text, i + 1);
    if ((c === '\\' && (next === close || next === '\\')) || (c === close && next === close)) {
      units.push(next); spans.push({ start: i, end: i + 2 }); i += 2;
    } else if (c === close) {
      i++; closed = true; break;
    } else {
      units.push(c); spans.push({ start: i, end: i + 1 }); i++;
    }
  }
  const technical = delimiter === '`' || delimiter === '[';
  const role = technical ? 'technicalIdentifier' : mode === 'request' ? 'requestLabel' : 'opaque';
  const t = token(text, start, i, 'quoted', role, delimiter, closed);
  if (!closed) return malformed(t, role);
  if (role === 'opaque') return t;
  const decoded = units.join('');
  const left = decoded.length - decoded.trimStart().length, right = decoded.trimEnd().length;
  const value = decoded.slice(left, Math.max(left, right));
  if (technical && !IDENTIFIER.test(value)) return malformed(t, role);
  t.value = value; t.valueSpans = spans.slice(left, Math.max(left, right));
  if (technical) t.kind = 'reference';
  return t;
}

function fence(text, start, width) {
  let i = start + width, closed = false;
  while (i < text.length) {
    if (unitAt(text, i) !== '`') { i++; continue; }
    const begin = i;
    while (unitAt(text, i) === '`') {
      i++;
    }
    if (i - begin === width) { closed = true; break; }
  }
  const t = token(text, start, i, 'opaque', 'opaque', '`', closed);
  return closed ? t : malformed(t, 'opaque');
}

function arrowAt(text, i) {
  return unitAt(text, i) === '→' || (unitAt(text, i) === '-' && unitAt(text, i + 1) === '>');
}
function stopWord(text, i) {
  const c = unitAt(text, i);
  if (c === undefined || whitespace(c) || /["`[„,;?!|(){}=<>]/u.test(c) || arrowAt(text, i)) return true;
  if (c === "'") return !apostropheInsideWord(text, i);
  // A terminal dot/colon is outside punctuation, never a partial ID extension.
  return (c === '.' || c === ':') && !(c === ':' && unitAt(text, i - 1) === ':')
    && (i + 1 === text.length || whitespace(unitAt(text, i + 1)));
}
function scan(text, mode) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const start = i, c = unitAt(text, i);
    if (whitespace(c)) {
      do { i++; } while (whitespace(unitAt(text, i)));
      tokens.push(token(text, start, i, 'space'));
    } else if (Object.hasOwn(CLOSE, c)) {
      let width = 1;
      if (c === '`') {
        while (unitAt(text, i + width) === '`') {
          width++;
        }
      }
      const t = width >= 3 ? fence(text, start, width) : atom(text, start, mode);
      tokens.push(t); i = t.end;
    } else if (arrowAt(text, i)) {
      i += c === '→' ? 1 : 2;
      tokens.push(token(text, start, i, 'operator'));
    } else if (/[!=<>]/.test(c)) {
      do { i++; } while (/[!=<>]/.test(unitAt(text, i) ?? ''));
      tokens.push(token(text, start, i, 'operator'));
    } else if (stopWord(text, i)) {
      tokens.push(token(text, start, ++i, 'punctuation'));
    } else {
      i++;
      while (i < text.length && !stopWord(text, i)) {
        i++;
      }
      const t = token(text, start, i, 'word');
      // Shape detection must also reach invalid leading characters; complete
      // grammar validation decides usability. Pure numbers remain syntax.
      if (/[_:.]|.-./u.test(t.raw) && /[\p{L}_]/u.test(t.raw)) {
        if (IDENTIFIER.test(t.raw)) reference(t, t.raw, rawSpans(start, i));
        else malformed(t, 'technicalIdentifier');
      }
      tokens.push(t);
    }
  }
  return invalidAdjacencies(text, tokens);
}

// Delimited references do not grant a usable prefix when glued to another
// spelling. Group only adjacent word/atom units; real separators stay syntax.
function invalidAdjacencies(text, tokens) {
  const result = [];
  let i = 0;
  while (i < tokens.length) {
    const first = tokens[i];
    if (!['word', 'reference', 'quoted'].includes(first.kind)) { result.push(first); i++; continue; }
    let end = i, technical = false, closed = true;
    while (end < tokens.length && ['word', 'reference', 'quoted'].includes(tokens[end].kind)) {
      const t = tokens[end];
      technical ||= t.role === 'technicalIdentifier' || t.intendedRole === 'technicalIdentifier';
      closed &&= t.closed; end++;
    }
    if (technical && end > i + 1) {
      result.push(malformed(token(text, first.start, tokens[end - 1].end, 'reference',
        'malformed', first.delimiter, closed), 'technicalIdentifier'));
    } else {
      for (let j = i; j < end; j++) {
        result.push(tokens[j]);
      }
    }
    i = end;
  }
  return result;
}

function skipSpace(tokens, index, sameLine = false) {
  while (tokens[index]?.kind === 'space' && (!sameLine || !linebreak(tokens[index].raw))) {
    index++;
  }
  return index;
}
function headName(t) {
  if (!t) return null;
  if (t.role === 'technicalIdentifier' || t.role === 'requestLabel')
    return IDENTIFIER.test(t.value) ? t.value : null;
  return t.role === 'syntax' && t.kind === 'word' && IDENTIFIER.test(t.raw) ? t.raw : null;
}
function terminator(t) {
  return !t || t.kind === 'space' || (t.role === 'syntax' && /^[?!;,|.]$/.test(t.raw));
}
function adjacentEnd(tokens, index) {
  let end = index + 1;
  while (end < tokens.length && tokens[end].start === tokens[end - 1].end && !terminator(tokens[end])) {
    end++;
  }
  return end;
}
function operandExtent(tokens, index, text, missingAt) {
  const first = tokens[index];
  if (terminator(first)) return { next: index, record: { start: missingAt, end: missingAt,
    text: '', kind: 'missing', supported: false }, token: null };
  let end = adjacentEnd(tokens, index);
  // Whitespace-separated arithmetic, cast and dot continuations are part of
  // this operand, not proof of its supported prefix. Never scan the remainder.
  while (end < tokens.length) {
    const next = skipSpace(tokens, end, true), t = tokens[next];
    const previous = tokens[end - 1];
    if (next !== end && !terminator(t) && !previous.delimiter
        && /(?:[+*/-]|::)$/.test(previous.raw) && !BARE.test(previous.raw)) {
      end = adjacentEnd(tokens, next); continue;
    }
    if (next === end || !t || t.role === 'opaque' || !/^(?:[+*/-]|::|\.)/.test(t.raw) || t.raw === '->') break;
    if (t.raw === '.' && terminator(tokens[skipSpace(tokens, next + 1, true)])) break;
    end = adjacentEnd(tokens, next);
    if (/^(?:[+*/.-]|::)$/.test(t.raw)) {
      const rhs = skipSpace(tokens, end, true);
      if (!terminator(tokens[rhs])) end = adjacentEnd(tokens, rhs);
    }
  }
  const last = tokens[end - 1], raw = text.slice(first.start, last.end);
  let closed = true;
  for (let j = index; j < end; j++) {
    if (!tokens[j].closed) closed = false;
  }
  const sole = end === index + 1;
  const quoted = sole && first.kind === 'quoted' && first.closed && ["'", '"', '„'].includes(first.delimiter);
  const kind = quoted ? 'quoted' : NUMBER.test(raw) ? 'number' : BARE.test(raw) ? 'bare' : 'unsupported';
  const supported = closed && kind !== 'unsupported';
  const t = token(text, first.start, last.end, 'operand', 'literalOperand', first.delimiter, closed);
  if (!closed) malformed(t, 'literalOperand');
  return { next: end, record: { start: first.start, end: last.end, text: raw,
    kind: supported ? kind : 'unsupported', supported }, token: t };
}

// Physical-line table eligibility is derived once before condition attribution.
// Newlines inside atoms reset physical-line state but never become separators.
function tableLines(tokens) {
  const led = [];
  let first = true, pipe = false;
  for (const t of tokens) {
    led.push(pipe);
    for (let i = 0; i < t.raw.length; i++) {
      const c = unitAt(t.raw, i);
      if (c === '\r' || c === '\n') { first = true; pipe = false; }
      else if (first && !whitespace(c)) {
        pipe = t.role === 'syntax' && c === '|'; first = false;
      }
    }
  }
  return led;
}
function conditionsAndRoles(text, tokens, mode) {
  const result = [], conditions = [], led = mode === 'source' ? tableLines(tokens) : [];
  let i = 0;
  while (i < tokens.length) {
    const head = tokens[i], name = headName(head);
    let opIndex = skipSpace(tokens, i + 1);
    if (mode === 'source' && led[i] && tokens[opIndex]?.raw === '|'
        && !linebreak(text.slice(head.end, tokens[opIndex].start))) {
      opIndex = skipSpace(tokens, opIndex + 1, true);
    }
    const op = tokens[opIndex];
    if (name === null || op?.role !== 'syntax' || !COMPARISON.test(op.raw)) {
      result.push(head); i++; continue;
    }
    if (head.role === 'syntax') reference(head, name, rawSpans(head.start, head.end));
    const valueIndex = skipSpace(tokens, opIndex + 1, true);
    const missingAt = tokens[valueIndex]?.start ?? text.length;
    const value = operandExtent(tokens, valueIndex, text, missingAt);
    const end = value.token?.end ?? missingAt;
    conditions.push({ start: head.start, end, text: text.slice(head.start, end),
      head: { start: head.start, end: head.end, text: head.raw, name },
      operator: { start: op.start, end: op.end, text: op.raw }, operand: value.record,
      supported: value.record.supported,
      key: value.record.supported ? JSON.stringify([name, op.raw, value.record.text]) : null });
    for (let j = i; j < valueIndex; j++) {
      result.push(tokens[j]);
    }
    if (value.token) result.push(value.token);
    i = Math.max(valueIndex, value.next);
  }
  // Explicit path steps are atomic reference positions, not natural phrases.
  for (let j = 0; j < result.length; j++) {
    const t = result[j];
    if (t.role !== 'syntax' || !['->', '→'].includes(t.raw)) continue;
    let left = j - 1;
    while (result[left]?.kind === 'space') {
      left--;
    }
    const right = skipSpace(result, j + 1);
    for (const index of [left, right]) {
      const step = result[index];
      if (step?.role === 'syntax' && step.kind === 'word' && IDENTIFIER.test(step.raw))
        reference(step, step.raw, rawSpans(step.start, step.end));
    }
  }
  return { tokens: result, conditions };
}

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      freeze(child);
    }
    Object.freeze(value);
  }
  return value;
}
function makeContext(mode, raw, originStart, tokens, conditions, diagnostics) {
  const structure = [], references = [];
  for (const t of tokens) {
    for (let i = 0; i < t.raw.length; i++) {
      const c = unitAt(t.raw, i), blank = c === '\r' || c === '\n' ? c : ' ';
      structure.push(t.role === 'syntax' ? c : blank);
      references.push(t.role === 'syntax' || t.role === 'technicalIdentifier' ? c : blank);
    }
  }
  const context = { mode, raw, originStart, tokens, conditions, diagnostics };
  Object.defineProperty(context, VIEWS, { value: Object.freeze({ structure: structure.join(''), references: references.join('') }) });
  return freeze(context);
}
function requireContext(context) {
  if (!context || typeof context !== 'object' || !Object.hasOwn(context, VIEWS))
    throw new TypeError('Require a semantic lexical context');
}

export function analyzeSemanticLexicalContext(text, options) {
  if (typeof text !== 'string' || !options || !['request', 'source'].includes(options.mode))
    throw new TypeError('Require a string and explicit request/source mode');
  const { mode } = options;
  const { tokens, conditions } = conditionsAndRoles(text, scan(text, mode), mode);
  const diagnostics = [];
  for (const t of tokens) {
    if (t.role === 'malformed') diagnostics.push({ start: t.start, end: t.end,
      reason: t.closed ? 'invalidIdentifier' : 'unclosedQuote' });
  }
  return makeContext(mode, text, 0, tokens, conditions, diagnostics);
}

export function projectSemanticLexicalContext(context, view) {
  requireContext(context);
  if (view !== 'structure' && view !== 'references') throw new TypeError('Invalid lexical view');
  return context[VIEWS][view];
}

function firstIntersecting(records, start) {
  let low = 0, high = records.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (records[middle].end <= start) low = middle + 1;
    else high = middle;
  }
  return low;
}
function rebase(span, start) { return { ...span, start: span.start - start, end: span.end - start }; }
function copyCondition(c, start = 0) {
  return { ...rebase(c, start), head: rebase(c.head, start), operator: rebase(c.operator, start), operand: rebase(c.operand, start) };
}
function appendDiagnostic(records, diagnostic) {
  const last = records.at(-1);
  if (!last || last.start !== diagnostic.start || last.end !== diagnostic.end || last.reason !== diagnostic.reason)
    records.push(diagnostic);
}

export function sliceSemanticLexicalContext(context, start, end) {
  requireContext(context);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > context.raw.length)
    throw new RangeError('Invalid lexical slice bounds');
  const raw = context.raw.slice(start, end), tokens = [], conditions = [], diagnostics = [];
  if (start === end) return makeContext(context.mode, raw, context.originStart + start, tokens, conditions, diagnostics);
  for (let i = firstIntersecting(context.tokens, start); i < context.tokens.length && context.tokens[i].start < end && start < end; i++) {
    const t = context.tokens[i];
    if (t.start < start || t.end > end) {
      const a = Math.max(start, t.start) - start, b = Math.min(end, t.end) - start;
      const partial = token(raw, a, b, 'opaque', 'malformed', t.delimiter, false);
      partial.intendedRole = ['technicalIdentifier', 'requestLabel', 'literalOperand', 'opaque'].includes(t.role)
        ? t.role : t.intendedRole ?? 'opaque';
      tokens.push(partial); diagnostics.push({ start: a, end: b, reason: 'partialToken' });
    } else {
      tokens.push({ ...rebase(t, start), valueSpans: t.valueSpans.map(s => rebase(s, start)) });
    }
  }
  for (let i = firstIntersecting(context.conditions, start); i < context.conditions.length && context.conditions[i].start < end; i++) {
    const c = context.conditions[i];
    if (c.start >= start && c.end <= end) conditions.push(copyCondition(c, start));
  }
  // At most two new edge diagnostics; merge them with the already ordered
  // inherited records in one pass rather than sorting an unbounded collection.
  const edges = diagnostics.splice(0);
  let edge = 0;
  for (let i = firstIntersecting(context.diagnostics, start); i < context.diagnostics.length && context.diagnostics[i].start < end; i++) {
    const d = context.diagnostics[i];
    const local = { ...d, start: Math.max(d.start, start) - start, end: Math.min(d.end, end) - start };
    while (edge < edges.length && edges[edge].start <= local.start) {
      appendDiagnostic(diagnostics, edges[edge++]);
    }
    appendDiagnostic(diagnostics, local);
  }
  while (edge < edges.length) {
    appendDiagnostic(diagnostics, edges[edge++]);
  }
  return makeContext(context.mode, raw, context.originStart + start, tokens, conditions, diagnostics);
}

export function readSemanticConditions(context) {
  requireContext(context);
  return context.conditions.map(c => copyCondition(c));
}

export function foldSemanticLexicalText(text) {
  if (typeof text !== 'string') throw new TypeError('Require a string');
  const output = [], unitSpans = [];
  let i = 0;
  while (i < text.length) {
    const start = i, point = String.fromCodePoint(text.codePointAt(i));
    i += point.length;
    while (i < text.length && /\p{M}/u.test(String.fromCodePoint(text.codePointAt(i)))) {
      i += String.fromCodePoint(text.codePointAt(i)).length;
    }
    const folded = text.slice(start, i).normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/g, 'l').replace(/Ł/g, 'L');
    output.push(folded);
    // Local lowercase widths locate result units, including expansions. Default
    // contextual casing (final sigma) changes spelling, not these widths; the
    // actual text is lowercased as a whole after joining, just like query fold.
    const width = folded.toLowerCase().length;
    for (let j = 0; j < width; j++) {
      unitSpans.push({ start, end: i });
    }
  }
  return { text: output.join('').toLowerCase(), unitSpans };
}
