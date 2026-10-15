#!/usr/bin/env node

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

  return heuristicResult;
}

export async function cleanContent(value, options = {}) {
  return cleanBoilerplate(value);
}
