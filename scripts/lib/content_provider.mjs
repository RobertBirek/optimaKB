#!/usr/bin/env node

import process from 'process';
import { assertSafeHttpUrl, safeFetch } from './safe_http.mjs';
import { cleanContent, cleanContentWithProfile, normalizeWhitespace, stripHtmlToText } from './content_cleaner.mjs';
import { loadProviderSecrets } from './provider_secrets.mjs';

const CONTENT_PROVIDER = process.env.CONTENT_PROVIDER || 'auto';
const CONTENT_FETCH_TIMEOUT_MS = Number(process.env.CONTENT_FETCH_TIMEOUT_MS || process.env.EXA_REQUEST_TIMEOUT_MS || 20000);
const TAVILY_EXTRACT_API_URL = process.env.TAVILY_EXTRACT_API_URL || 'https://api.tavily.com/extract';
const FIRECRAWL_API_URL = process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev/v1';
const EXA_CONTENTS_API_URL = process.env.EXA_CONTENTS_API_URL || 'https://api.exa.ai/contents';
const EXA_MAX_CHARACTERS = Number(process.env.ERP_KB_DRAFT_ANALYZE_MAX_CHARS || 28000);

function normalizeHttpUrl(value) {
  const url = new URL(String(value || '').trim());
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('URL must use http or https');
  }
  url.hash = '';
  return url.toString();
}

async function postJson(url, headers, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONTENT_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Provider returned non-JSON response: ${text.slice(0, 300)}`);
    }
    if (!response.ok) {
      throw new Error(`Provider failed with HTTP ${response.status}: ${text.slice(0, 300)}`);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithTavily(sourceUrl) {
  const { tavilyApiKey } = loadProviderSecrets();
  if (!tavilyApiKey) throw new Error('TAVILY_API_KEY is not configured');
  const json = await postJson(TAVILY_EXTRACT_API_URL, {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${tavilyApiKey}`,
  }, {
    api_key: tavilyApiKey,
    urls: [sourceUrl],
    extract_depth: 'advanced',
    include_images: false,
  });
  const result = Array.isArray(json.results) ? json.results[0] : null;
  if (!result) throw new Error('Tavily returned no result');
  return {
    provider: 'tavily',
    title: String(result.title || '').trim(),
    content: normalizeWhitespace(result.raw_content || result.content || result.text || ''),
    summary: normalizeWhitespace(result.summary || ''),
    rawUrl: result.url || sourceUrl,
    retrievedAt: new Date().toISOString(),
    warning: '',
  };
}

async function fetchWithFirecrawl(sourceUrl) {
  const { firecrawlApiKey } = loadProviderSecrets();
  if (!firecrawlApiKey) throw new Error('FIRECRAWL_API_KEY is not configured');
  const json = await postJson(`${FIRECRAWL_API_URL.replace(/\/+$/, '')}/scrape`, {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${firecrawlApiKey}`,
  }, {
    url: sourceUrl,
    formats: ['markdown'],
  });
  if (json.success === false) {
    throw new Error(json.error || 'Firecrawl scrape failed');
  }
  const data = json.data || {};
  return {
    provider: 'firecrawl',
    title: String(data.metadata?.title || data.title || '').trim(),
    content: normalizeWhitespace(data.markdown || data.content || data.text || ''),
    summary: normalizeWhitespace(data.metadata?.description || ''),
    rawUrl: data.metadata?.sourceURL || data.url || sourceUrl,
    retrievedAt: new Date().toISOString(),
    warning: '',
  };
}

async function fetchWithExa(sourceUrl) {
  const { exaApiKey } = loadProviderSecrets();
  if (!exaApiKey) throw new Error('EXA_API_KEY is not configured');
  const json = await postJson(EXA_CONTENTS_API_URL, {
    'Content-Type': 'application/json',
    'x-api-key': exaApiKey,
  }, {
    urls: [sourceUrl],
    text: { maxCharacters: EXA_MAX_CHARACTERS },
    summary: true,
  });
  const result = Array.isArray(json.results) ? json.results[0] : null;
  if (!result) throw new Error('Exa contents returned no result');
  return {
    provider: 'exa',
    requestId: json.requestId || '',
    title: String(result.title || '').trim(),
    content: normalizeWhitespace(result.text || result.summary || ''),
    summary: normalizeWhitespace(result.summary || ''),
    rawUrl: result.url || sourceUrl,
    retrievedAt: new Date().toISOString(),
    warning: '',
  };
}

async function fetchWithHttp(sourceUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONTENT_FETCH_TIMEOUT_MS);
  try {
    const response = await safeFetch(sourceUrl, {
      headers: {
        Accept: 'text/html,text/plain,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.3',
        'User-Agent': 'TaxbellKnowledgePanel/1.0',
      },
      signal: controller.signal,
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
    const title = body.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || '';
    const contentType = response.headers.get('content-type') || '';
    const content = contentType.includes('html') ? stripHtmlToText(body) : normalizeWhitespace(body);
    return {
      provider: 'http',
      title,
      content,
      summary: '',
      rawUrl: sourceUrl,
      retrievedAt: new Date().toISOString(),
      warning: '',
    };
  } finally {
    clearTimeout(timer);
  }
}

function providerOrder(explicitProviders = []) {
  if (explicitProviders.length) return explicitProviders;
  if (CONTENT_PROVIDER === 'tavily') return ['tavily', 'http'];
  if (CONTENT_PROVIDER === 'firecrawl') return ['firecrawl', 'http'];
  if (CONTENT_PROVIDER === 'exa') return ['exa', 'http'];
  return ['tavily', 'firecrawl', 'exa', 'http'];
}

async function runProvider(provider, sourceUrl) {
  if (provider === 'tavily') return fetchWithTavily(sourceUrl);
  if (provider === 'firecrawl') return fetchWithFirecrawl(sourceUrl);
  if (provider === 'exa') return fetchWithExa(sourceUrl);
  if (provider === 'http') return fetchWithHttp(sourceUrl);
  throw new Error(`Unsupported content provider: ${provider}`);
}

export function detectCleanerProfile(sourceUrl) {
  const url = String(sourceUrl || '').toLowerCase();
  if (url.endsWith('.pdf')) return 'pdf';
  if (/\/news\//.test(url) || /\/aktualnosci\//.test(url)) return 'news';
  if (/\/blog\//.test(url) || /\/poradnik\//.test(url)) return 'blog';
  if (/\/docs?\//.test(url) || /\/documentation\//.test(url) || /\/manual\//.test(url)) return 'documentation';
  try {
    const hostname = new URL(url).hostname;
    const newsDomains = ['infor.pl', 'forsal.pl', 'gazetaprawna.pl', 'dziennik.pl', 'rp.pl', 'bankier.pl', 'money.pl', 'businessinsider.com.pl', 'wysokieobcasy.pl', 'wyborcza.pl'];
    if (newsDomains.some((d) => hostname === d || hostname.endsWith('.' + d))) return 'news';
  } catch { }
  return 'blog';
}

export async function fetchContent(sourceUrl, options = {}) {
  const normalizedUrl = normalizeHttpUrl(sourceUrl);
  await assertSafeHttpUrl(normalizedUrl);
  const warnings = [];
  for (const provider of providerOrder(options.providers || [])) {
    try {
      const fetched = await runProvider(provider, normalizedUrl);
      const rawContent = fetched.content || fetched.summary || '';
      const profile = options.profile || detectCleanerProfile(normalizedUrl);
      const content = await cleanContentWithProfile(rawContent, profile, { aiCleaner: options.aiCleaner });
      return {
        ...fetched,
        provider,
        sourceUrl: normalizedUrl,
        rawUrl: fetched.rawUrl || normalizedUrl,
        content,
        warning: warnings.join(' | '),
      };
    } catch (error) {
      warnings.push(`${provider}: ${error.message}`);
    }
  }
  throw new Error(`All content providers failed for ${normalizedUrl}: ${warnings.join(' | ')}`);
}
