#!/usr/bin/env node

import process from 'process';
import { OPENSPG_API_BASE } from './config.mjs';
import { readOpenSpgCookie } from './openspg_auth.mjs';

const CONTENT_AI_CLEAN = !['0', 'false', 'off'].includes(String(process.env.CONTENT_AI_CLEAN || '1').toLowerCase());
const CONTENT_AI_CLEAN_MAX_CHARS = Number(process.env.CONTENT_AI_CLEAN_MAX_CHARS || 12000);
const OPENSPG_LLM_ENDPOINT = process.env.OPENSPG_LLM_ENDPOINT || '/v1/chat/completions';
const OPENSPG_LLM_APP_ID = process.env.OPENSPG_LLM_APP_ID || '';
const OPENSPG_LLM_SESSION_ID = process.env.OPENSPG_LLM_SESSION_ID || '';
const OPENSPG_LLM_MODEL = process.env.OPENSPG_LLM_MODEL || '';

const INLINE_PATTERNS = [
  /\bREKLAMA\b/gi,
  /zapisz się na newsletter/gi,
  /subskrybuj(?: nasz)? newsletter/gi,
  /subskrybuj nas na youtube/gi,
  /dołącz do ekspertów(?: dołącz do grona ekspertów)?/gi,
  /pliki cookie/gi,
  /ta strona używa cookie/gi,
  /polityka prywatności/gi,
  /czytaj także/gi,
  /zobacz także/gi,
  /zobacz również/gi,
  /udostępnij/gi,
  /obserwuj nas/gi,
];

const DROP_LINE_PATTERNS = [
  /^reklama:?$/i,
  /^newsletter:?$/i,
  /^zapisz się na newsletter\.?$/i,
  /^subskrybuj(?: nasz)? newsletter\.?$/i,
  /^subskrybuj nas na youtube\.?$/i,
  /^dołącz do ekspertów(?: dołącz do grona ekspertów)?\.?$/i,
  /^udostępnij\.?$/i,
  /^czytaj także:?$/i,
  /^zobacz także:?$/i,
  /^zobacz również:?$/i,
  /^menu:?$/i,
  /^nawigacja:?$/i,
  /^tagi:?$/i,
  /^kategorie:?$/i,
  /^polityka prywatności$/i,
  /^regulamin$/i,
  /^wszelkie prawa zastrzeżone$/i,
  /^akceptuję$/i,
  /^zgadzam się$/i,
  /^facebook$/i,
  /^linkedin$/i,
  /^youtube$/i,
  /^x$/i,
  /^twitter$/i,
  /^shutterstock$/i,
  /^infor$/i,
  /^rozwiń\s*>$/i,
  /^adres redakcji:/i,
  /^www\.(dziennik|gazetaprawna|forsal)\.pl/i,
  /^autorzy:/i,
  /^redaktor merytoryczny:/i,
  /^korekta:/i,
  /^projekt graficzny okładki:/i,
  /^dtp:/i,
  /^biuro obsługi klienta:/i,
  /^tel\./i,
  /^e-mail:/i,
  /^©\s*copyright/i,
  /^wydanie\s+/i,
  /^isbn:/i,
  /^patrzymy obiektywnie/i,
  /^\d{2}-\d{3}\s+warszawa,/i,
  /^spis treści$/i,
  /^wstęp$/i,
  /^\d+$/,
];

export const CLEANER_PROFILES = {
  news: {
    name: 'news',
    inlinePatterns: [
      /\bREKLAMA\b/gi,
      /zapisz się na newsletter/gi,
      /subskrybuj(?: nasz)? newsletter/gi,
      /subskrybuj nas na youtube/gi,
      /dołącz do ekspertów(?: dołącz do grona ekspertów)?/gi,
      /pliki cookie/gi,
      /ta strona używa cookie/gi,
      /polityka prywatności/gi,
      /czytaj także/gi,
      /zobacz także/gi,
      /zobacz również/gi,
      /udostępnij/gi,
      /obserwuj nas/gi,
      /\bfacebook\b/gi,
      /\blinkedin\b/gi,
      /\byoutube\b/gi,
    ],
    dropLinePatterns: [
      /^reklama:?$/i, /^newsletter:?$/i, /^zapisz się na newsletter\.?$/i,
      /^subskrybuj(?: nasz)? newsletter\.?$/i, /^subskrybuj nas na youtube\.?$/i,
      /^dołącz do ekspertów(?: dołącz do grona ekspertów)?\.?$/i,
      /^udostępnij\.?$/i, /^czytaj także:?$/i, /^zobacz także:?$/i,
      /^zobacz również:?$/i, /^menu:?$/i, /^nawigacja:?$/i,
      /^tagi:?$/i, /^kategorie:?$/i, /^polityka prywatności$/i,
      /^regulamin$/i, /^wszelkie prawa zastrzeżone$/i,
      /^akceptuję$/i, /^zgadzam się$/i,
      /^facebook$/i, /^linkedin$/i, /^youtube$/i, /^x$/i, /^twitter$/i,
      /^shutterstock$/i, /^infor$/i, /^rozwiń\s*>$/i,
      /^adres redakcji:/i, /^www\.(dziennik|gazetaprawna|forsal)\.pl/i,
      /^autorzy:/i, /^redaktor merytoryczny:/i, /^korekta:/i,
      /^projekt graficzny okładki:/i, /^dtp:/i, /^biuro obsługi klienta:/i,
      /^tel\./i, /^e-mail:/i, /^©\s*copyright/i, /^wydanie\s+/i,
      /^isbn:/i, /^patrzymy obiektywnie/i, /^\d{2}-\d{3}\s+warszawa,/i,
      /^spis treści$/i, /^wstęp$/i, /^\d+$/,
    ],
    useAi: true,
    stripHtml: true,
    normalizePagination: true,
  },
  blog: {
    name: 'blog',
    inlinePatterns: [
      /\bREKLAMA\b/gi,
      /zapisz się na newsletter/gi,
      /subskrybuj(?: nasz)? newsletter/gi,
      /pliki cookie/gi,
      /ta strona używa cookie/gi,
      /polityka prywatności/gi,
      /udostępnij/gi,
    ],
    dropLinePatterns: [
      /^reklama:?$/i, /^newsletter:?$/i, /^zapisz się na newsletter\.?$/i,
      /^subskrybuj(?: nasz)? newsletter\.?$/i,
      /^polityka prywatności$/i, /^regulamin$/i,
      /^wszelkie prawa zastrzeżone$/i,
      /^akceptuję$/i, /^zgadzam się$/i,
      /^facebook$/i, /^linkedin$/i, /^youtube$/i,
    ],
    useAi: false,
    stripHtml: true,
    normalizePagination: false,
  },
  documentation: {
    name: 'documentation',
    inlinePatterns: [
      /\bREKLAMA\b/gi,
      /polityka prywatności/gi,
    ],
    dropLinePatterns: [
      /^polityka prywatności$/i,
      /^wszelkie prawa zastrzeżone$/i,
    ],
    useAi: false,
    stripHtml: true,
    normalizePagination: true,
  },
  pdf: {
    name: 'pdf',
    inlinePatterns: [],
    dropLinePatterns: [/^\d+$/],
    useAi: false,
    stripHtml: false,
    normalizePagination: true,
  },
};

export function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
}

export function stripHtmlToText(html) {
  return normalizeWhitespace(decodeHtmlEntities(String(html || '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<\/(p|div|section|article|header|footer|li|tr|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')));
}

export function cleanBoilerplate(value) {
  let text = normalizeWhitespace(decodeHtmlEntities(value));
  if (!text) return '';

  text = text
    .replace(/^.*\/\s*shutterstock\s*$/gim, ' ')
    .replace(/^.*\/\s*infor\s*$/gim, ' ');

  for (const pattern of INLINE_PATTERNS) {
    text = text.replace(pattern, ' ');
  }

  const lines = text
    .split(/\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)
    .filter((line) => !DROP_LINE_PATTERNS.some((pattern) => pattern.test(line)));

  return normalizeWhitespace(lines.join('\n'));
}

export function cleanContentWithProfile(value, profile = 'blog', options = {}) {
  const profileDef = CLEANER_PROFILES[profile] || CLEANER_PROFILES.blog;
  let text = options.skipHtmlStrip
    ? normalizeWhitespace(decodeHtmlEntities(value))
    : stripHtmlToText(value);
  if (!text) return '';

  if (profileDef.normalizePagination) {
    text = text.replace(/\n\d+\n(?=\w)/g, '\n');
  }

  text = text
    .replace(/^.*\/\s*shutterstock\s*$/gim, ' ')
    .replace(/^.*\/\s*infor\s*$/gim, ' ');

  for (const pattern of profileDef.inlinePatterns) {
    text = text.replace(pattern, ' ');
  }

  const lines = text
    .split(/\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)
    .filter((line) => !profileDef.dropLinePatterns.some((p) => p.test(line)));
  const heuristicResult = normalizeWhitespace(lines.join('\n'));
  if (!heuristicResult) return '';

  if (profileDef.useAi && options.aiCleaner) {
    try {
      const aiResult = normalizeWhitespace(options.aiCleaner(heuristicResult));
      return cleanBoilerplate(aiResult || heuristicResult) || heuristicResult;
    } catch {
      return heuristicResult;
    }
  }
  return heuristicResult;
}

function trimForAi(value, maxChars = CONTENT_AI_CLEAN_MAX_CHARS) {
  const text = normalizeWhitespace(value);
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars).trim();
}

function llmResponseText(json) {
  return String(
    json?.choices?.[0]?.message?.content
    || json?.choices?.[0]?.text
    || json?.result?.choices?.[0]?.message?.content
    || json?.result?.output
    || json?.result?.content
    || json?.data?.choices?.[0]?.message?.content
    || '',
  );
}

function llmResponseTextFromBody(body) {
  const text = String(body || '').trim();
  if (!text.includes('\ndata:') && !text.startsWith('data:')) {
    return llmResponseText(JSON.parse(text));
  }
  let lastAnswer = '';
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    if (['[ERROR]', '[TIMEOUT]'].includes(payload)) {
      throw new Error(`OpenSPG LLM stream ended with ${payload}`);
    }
    try {
      const event = JSON.parse(payload);
      if (event.success === false) {
        throw new Error(event.errorMsg || event.message || 'OpenSPG LLM stream failed');
      }
      if (typeof event.answer === 'string') lastAnswer = event.answer;
    } catch (error) {
      if (error instanceof SyntaxError) continue;
      throw error;
    }
  }
  if (!lastAnswer) throw new Error('OpenSPG LLM stream did not contain an answer');
  return lastAnswer;
}

async function defaultAiCleaner(text) {
  const cookie = readOpenSpgCookie();
  if (!cookie || !OPENSPG_LLM_APP_ID || !OPENSPG_LLM_SESSION_ID) {
    return text;
  }
  const prompt = [
    'Oczyść surową treść pobraną ze strony WWW.',
    'Usuń reklamy, newslettery, cookie bannery, nawigację, stopki, linki społecznościowe, tagi, sekcje "czytaj także" i inny boilerplate.',
    'Zachowaj wyłącznie merytoryczną treść dokumentu lub artykułu.',
    'Zwróć tylko oczyszczoną treść bez komentarza i bez markdownowych bloków kodu.',
    '',
    trimForAi(text),
  ].join('\n');
  const payload = {
    ...(OPENSPG_LLM_MODEL ? { model: OPENSPG_LLM_MODEL } : {}),
    app_id: /^\d+$/.test(OPENSPG_LLM_APP_ID) ? Number(OPENSPG_LLM_APP_ID) : OPENSPG_LLM_APP_ID,
    session_id: /^\d+$/.test(OPENSPG_LLM_SESSION_ID) ? Number(OPENSPG_LLM_SESSION_ID) : OPENSPG_LLM_SESSION_ID,
    prompt: [{ type: 'text', content: prompt }],
    thinking_enabled: false,
    search_enabled: false,
  };
  const response = await fetch(`${OPENSPG_API_BASE}${OPENSPG_LLM_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify(payload),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`OpenSPG LLM failed with HTTP ${response.status}: ${body.slice(0, 240)}`);
  }
  return llmResponseTextFromBody(body);
}

export async function cleanContent(value, options = {}) {
  const heuristicallyCleaned = cleanBoilerplate(value);
  if (!heuristicallyCleaned) return '';
  const aiCleaner = options.aiCleaner || (CONTENT_AI_CLEAN ? defaultAiCleaner : null);
  if (!aiCleaner) return heuristicallyCleaned;
  try {
    const aiResult = normalizeWhitespace(await aiCleaner(heuristicallyCleaned));
    return cleanBoilerplate(aiResult || heuristicallyCleaned) || heuristicallyCleaned;
  } catch {
    return heuristicallyCleaned;
  }
}
