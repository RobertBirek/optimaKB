#!/usr/bin/env node

import fs from 'fs';
import http from 'http';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import process from 'process';
import { randomUUID, timingSafeEqual, createHmac } from 'crypto';
import { extractPdfText } from './lib/pdf_text.mjs';
import { submitKnowledgeDraft } from './lib/knowledge_inbox.mjs';
import { listInboxDrafts, promoteDraft, rejectDraft, withdrawPromotedDraft, TARGET_KBS } from './lib/promoted_knowledge.mjs';
import { readOpenSpgCookie } from './lib/openspg_auth.mjs';
import { classifySourceTier } from './lib/external_search_policy.mjs';
import { fetchContent } from './lib/content_provider.mjs';
import { stripHtmlToText } from './lib/content_cleaner.mjs';
import { loadProviderSecrets, maskProviderSecrets } from './lib/provider_secrets.mjs';
import { assertSafeHttpUrl, safeFetch } from './lib/safe_http.mjs';
import { OPENSPG_API_BASE, ERP_KB_MCP_BASE_URL } from './lib/config.mjs';
import { getGaps, updateGapStatus, gapStats } from './lib/learning.mjs';
import { getServers, getUsers, createUser, updateUser, deleteUser, createUserApiKey, revokeUserApiKey, rotateUserApiKey, createMcpServer, deleteMcpServer } from './lib/mcp_registry.mjs';
import { reusableDraftApprovalAction } from './lib/dashboard_action_idempotency.mjs';
import { assertAtomicWriteAccess } from './lib/atomic_file.mjs';

function generateMcpSystemd(server) {
  const mcpDir = path.join(ROOT, 'config', 'mcp', server.id);
  fs.mkdirSync(mcpDir, { recursive: true });
  const unitPath = path.join(mcpDir, `${server.id}.service`);
  const envPath = path.join(mcpDir, `${server.id}.env`);
  const port = server.port || 9999;
  const allowed = (server.kbFilter || []).join(',');
  const unitContent = [
    '[Unit]',
    `Description=MCP ${server.name}`,
    'After=network.target',
    '',
    '[Service]',
    'Type=simple',
    `WorkingDirectory=${ROOT}`,
    `EnvironmentFile=${path.resolve(envPath)}`,
    `ExecStart=/usr/bin/node ${ROOT}/scripts/erp_knowledge_mcp_http_bridge.mjs`,
    'Restart=always',
    'RestartSec=3',
    'User=mcpbot',
    'Group=mcpbot',
    '',
    '[Install]',
    'WantedBy=multi-user.target',
  ].join('\n');
  let exaLines = '';
  try {
    const mainEnv = fs.readFileSync('/etc/erp-kb-mcp.env', 'utf8');
    exaLines = mainEnv.split('\n').filter((l) => l.startsWith('EXA_')).join('\n');
  } catch { exaLines = '# EXA_API_KEY not shared from /etc/erp-kb-mcp.env'; }
  const envContent = [
    `# MCP ${server.name} – auto-generated on ${new Date().toISOString()}`,
    `ROOT=${ROOT}`,
    `ERP_KB_HTTP_HOST=10.10.254.42`,
    `ERP_KB_HTTP_PORT=${port}`,
    `ERP_KB_MCP_PROFILE=scoped-readonly`,
    `ERP_KB_HTTP_TOKEN=${randomUUID().replaceAll('-', '')}`,
    `ERP_KB_MCP_ALLOWED_NAMESPACES=${allowed}`,
    `ERP_KB_HTTP_AUDIT_LOG=${ROOT}/logs/${server.id}_audit.jsonl`,
    exaLines,
  ].join('\n');
  try {
    fs.writeFileSync(unitPath, unitContent + '\n', { mode: 0o644 });
    fs.writeFileSync(envPath, envContent + '\n', { mode: 0o600 });
    process.stderr.write(`[generateMcpSystemd] wrote ${unitPath} and ${envPath}\n`);
  } catch (e) {
    process.stderr.write(`[generateMcpSystemd] write failed: ${e.message}\n`);
  }
}
import {
  appendDashboardAudit,
  dashboardAuditSummary,
  listDashboardAudit,
} from './lib/dashboard_audit.mjs';
import {
  applyAutomationReroute,
  adjudicateAutomationJob,
  approveAutomationPublication,
  automationSummary,
  loadAutomationConfig,
  readAutomationJob,
  saveAutomationConfig,
  triggerAutomationForDraft,
  triggerShadowBenchmark,
  updateProviderSecrets,
} from './lib/dashboard_automation.mjs';
import {
  createSource,
  deleteSource,
  listSources,
  SOURCE_CREDENTIALS_PATH,
  SOURCE_LIST_PATH,
  updateSource,
} from './lib/dashboard_source_list.mjs';
import { deriveDiscoveryAutoDraftState } from './lib/feedback_learning.mjs';
import { loadAutopilotState, autopilotSummary } from './lib/dashboard_autopilot.mjs';
import {
  activeDiscoveryQueries,
  classifyDiscoveryTier,
  createDraftFromDiscoveryCandidate,
  detectAnomalies,
  discoveryActionForAssessment,
  generateQualityReport,
  discoveryFeedbackSummary,
  discoverySemiAutoStatus,
  discoverySummary,
  loadDiscoveryPolicy,
  refreshDiscoveryReport,
  refreshDiscoveryBriefing,
  rejectDiscoveryCandidate,
  routeDiscoveryCandidate,
  saveDiscoveryPolicy,
  setDiscoveryQueryEnabled,
  undoDiscoveryCandidate,
  bulkDecideDiscoveryCandidates,
} from './lib/dashboard_discovery.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';
const HOST = process.env.ERP_KB_DASHBOARD_HOST || '127.0.0.1';
const PORT = Number(process.env.ERP_KB_DASHBOARD_PORT || 3410);
const BASE_PATH = normalizeBasePath(process.env.ERP_KB_DASHBOARD_BASE_PATH || '/panel');
const USERNAME = process.env.ERP_KB_DASHBOARD_USER || '';
const PASSWORD = process.env.ERP_KB_DASHBOARD_PASSWORD || '';
const OPERATOR_USERNAME = process.env.ERP_KB_DASHBOARD_OPERATOR_USER || '';
const OPERATOR_PASSWORD = process.env.ERP_KB_DASHBOARD_OPERATOR_PASSWORD || '';
const VIEWER_USERNAME = process.env.ERP_KB_DASHBOARD_VIEWER_USER || '';
const VIEWER_PASSWORD = process.env.ERP_KB_DASHBOARD_VIEWER_PASSWORD || '';
const ALLOW_ANON = String(process.env.ERP_KB_DASHBOARD_ALLOW_ANON || '0').trim() === '1';
const AUTH_CONFIGURED = Boolean(
  ALLOW_ANON
  || (USERNAME && PASSWORD)
  || (OPERATOR_USERNAME && OPERATOR_PASSWORD)
  || (VIEWER_USERNAME && VIEWER_PASSWORD)
);
const AUTH_MODE = ALLOW_ANON ? 'none' : AUTH_CONFIGURED ? 'basic' : 'misconfigured';
const MAX_BODY_BYTES = Number(process.env.ERP_KB_DASHBOARD_MAX_BODY_BYTES || 15 * 1024 * 1024);
const REQUEST_TIMEOUT_MS = Number(process.env.ERP_KB_DASHBOARD_REQUEST_TIMEOUT_MS || 45000);
const RATE_LIMIT_WINDOW_MS = Number(process.env.ERP_KB_DASHBOARD_RATE_WINDOW_MS || 60000);
const RATE_LIMIT_READ = Number(process.env.ERP_KB_DASHBOARD_RATE_READ || 240);
const RATE_LIMIT_WRITE = Number(process.env.ERP_KB_DASHBOARD_RATE_WRITE || 60);
const UPLOAD_ROOT = path.join(ROOT, 'downloads/knowledge_inbox/uploads');
const SUPPORTED_UPLOAD_EXTENSIONS = new Set([
  '.md',
  '.txt',
  '.pdf',
  '.xml',
  '.xpt',
  '.xsd',
  '.json',
  '.jsonl',
  '.vb',
  '.vbs',
  '.bas',
  '.sql',
  '.js',
  '.ts',
  '.cs',
  '.ps1',
  '.bat',
  '.cmd',
  '.html',
  '.htm',
  '.css',
  '.ini',
  '.cfg',
  '.conf',
  '.yml',
  '.yaml',
  '.csv',
]);
const SUPPORTED_UPLOAD_ACCEPT = [
  '.md',
  '.txt',
  '.pdf',
  '.xml',
  '.xpt',
  '.xsd',
  '.json',
  '.jsonl',
  '.vb',
  '.vbs',
  '.bas',
  '.sql',
  '.js',
  '.ts',
  '.cs',
  '.ps1',
  '.bat',
  '.cmd',
  '.html',
  '.htm',
  '.css',
  '.ini',
  '.cfg',
  '.conf',
  '.yml',
  '.yaml',
  '.csv',
  'text/markdown',
  'text/plain',
  'application/pdf',
  'application/json',
  'application/xml',
  'text/xml',
].join(',');
const DASHBOARD_DIST = path.join(ROOT, 'dist/dashboard');
const KB_REGISTRY_PATH = 'docs/reference/ERP_KB_Dashboard_KB_Registry.json';
const APP_BUNDLE_PATH = 'docs/reference/ERP_Knowledge_Assistant_OpenSPG_App_Bundle.json';
const ROUTING_PATH = 'docs/reference/ERP_Knowledge_Assistant_Routing.json';
const ACTION_ROOT = path.join(ROOT, 'logs/dashboard_actions');
const SOURCE_SCAN_SCRIPT = 'scripts/scan_dashboard_sources.mjs';
const DISCOVERY_SCRIPT = 'scripts/run_dashboard_discovery.mjs';
const DISCOVERY_LEARNING_PATH = path.join(ROOT, 'data/dashboard/learning/discovery_learning_state.json');
const AUTOMATION_LEARNING_PATH = path.join(ROOT, 'data/dashboard/learning/automation_learning_state.json');
const SOURCE_SCAN_CRON_SCHEDULE = process.env.ERP_KB_SOURCE_SCAN_CRON_SCHEDULE || '25 4 * * *';
const DEFAULT_OPENSPG_COOKIE_FILE = process.env.OPENSPG_COOKIE_FILE || '/etc/erp-kb-openspg.cookie';
// constants imported from ./lib/config.mjs
const OPENSPG_LLM_ENDPOINT = process.env.OPENSPG_LLM_ENDPOINT || '/v1/chat/completions';
const OPENSPG_LLM_MODEL = process.env.OPENSPG_LLM_MODEL || '';
const OPENSPG_LLM_APP_ID = process.env.OPENSPG_LLM_APP_ID || '';
const OPENSPG_LLM_SESSION_ID = process.env.OPENSPG_LLM_SESSION_ID || '';
const DRAFT_ANALYZE_MAX_CHARS = Number(process.env.ERP_KB_DRAFT_ANALYZE_MAX_CHARS || 28000);
const DRAFT_LLM_INPUT_MAX_CHARS = Number(process.env.ERP_KB_DRAFT_LLM_INPUT_MAX_CHARS || 6000);
const EXA_CONTENTS_API_URL = process.env.EXA_CONTENTS_API_URL || 'https://api.exa.ai/contents';
const EXA_REQUEST_TIMEOUT_MS = Number(process.env.EXA_REQUEST_TIMEOUT_MS || '15000');
const CSRF_SERVER_SECRET = randomUUID();
function csrfTokenFor(username) {
  return createHmac('sha256', CSRF_SERVER_SECRET).update(username || '').digest('base64url');
}
const RATE_BUCKETS = new Map();
const SOURCE_FRESHNESS_ROOTS = [
  'downloads/official/optima_reference',
  'downloads/official/betterfly_reference',
  'downloads/community_news',
  'downloads/partner/optima_technical',
  'downloads/google_drive/additional_functions',
  'downloads/google_drive/sprint',
  'downloads/taxbell/legal_reference',
  'downloads/taxbell/payroll_hr_reference',
  'downloads/taxbell/accounting_vat_reference',
];
const PROMOTED_FORCE_FILES = {
  ComarchOptimaSchema: ['chunk.csv'],
  ComarchOptimaAdditionalFunctions: ['reference_document.csv', 'chunk.csv'],
  ComarchOptimaSprint: ['reference_document.csv', 'chunk.csv'],
  ComarchOptimaReference: ['reference_document.csv', 'chunk.csv'],
  ComarchOptimaPartnerTechnical: ['reference_document.csv', 'chunk.csv'],
  ComarchBetterflyReference: ['reference_document.csv', 'chunk.csv'],
  ComarchCommunityNews: ['reference_document.csv', 'chunk.csv'],
  TaxbellLegalReference: ['reference_document.csv', 'chunk.csv'],
  TaxbellPayrollHRReference: ['reference_document.csv', 'chunk.csv'],
  TaxbellAccountingVATReference: ['reference_document.csv', 'chunk.csv'],
};
const SOURCE_REGISTRY_WRITES = {
  ComarchOptimaReference: ['downloads/official/optima_reference/meta/source_registry.json'],
  ComarchBetterflyReference: ['downloads/official/betterfly_reference/meta/source_registry.json'],
  ComarchCommunityNews: ['downloads/community_news/meta/source_registry.json'],
  ComarchOptimaPartnerTechnical: ['downloads/partner/optima_technical/source_registry.json'],
  ComarchOptimaAdditionalFunctions: ['downloads/google_drive/additional_functions/meta/source_registry.json'],
  ComarchOptimaSprint: ['downloads/google_drive/sprint/meta/source_registry.json'],
  TaxbellLegalReference: ['downloads/taxbell/legal_reference/meta/source_registry.json'],
  TaxbellPayrollHRReference: ['downloads/taxbell/payroll_hr_reference/meta/source_registry.json'],
  TaxbellAccountingVATReference: ['downloads/taxbell/accounting_vat_reference/meta/source_registry.json'],
};

const REPORTS = {
  quality: {
    title: 'Quality Gate',
    jsonPath: 'docs/reference/KB_Quality_Gate_Report.json',
    mdPath: 'docs/reference/KB_Quality_Gate_Report.md',
  },
  freshness: {
    title: 'Source Freshness',
    jsonPath: 'docs/reference/KB_Source_Freshness_Report.json',
    mdPath: 'docs/reference/KB_Source_Freshness_Report.md',
  },
  official_delta: {
    title: 'Official Delta Refresh',
    jsonPath: 'docs/reference/Official_Reference_Delta_Refresh_Report.json',
    mdPath: 'docs/reference/Official_Reference_Delta_Refresh_Report.md',
  },
  erp_20q: {
    title: 'ERP 20Q Testpack',
    jsonPath: 'docs/reference/ERP_Knowledge_Assistant_20Q_TestPack.json',
    mdPath: 'docs/reference/ERP_Knowledge_Assistant_20Q_Report.md',
  },
  erp_200q: {
    title: 'ERP 200Q Testpack',
    jsonPath: 'docs/reference/ERP_Knowledge_Assistant_200Q_TestPack.json',
    mdPath: 'docs/reference/ERP_Knowledge_Assistant_200Q_Report.md',
  },
  community_news: {
    title: 'Community News Testpack',
    jsonPath: 'docs/reference/ComarchCommunityNews_TestPack.json',
    mdPath: 'docs/reference/ComarchCommunityNews_TestReport.md',
  },
  community_threads: {
    title: 'Community Full Thread Benchmark',
    jsonPath: 'docs/reference/ERP_Knowledge_Assistant_Community_FullThread_TestPack.json',
    mdPath: 'docs/reference/ERP_Knowledge_Assistant_Community_FullThread_Report.md',
  },
  dashboard_canary: {
    title: 'Dashboard Canary Readiness',
    jsonPath: 'docs/reference/ERP_KB_Dashboard_Canary_Readiness_Report.json',
    mdPath: 'docs/reference/ERP_KB_Dashboard_Canary_Readiness_Report.md',
  },
  discovery_coverage: {
    title: 'KB Source Discovery Coverage',
    jsonPath: 'docs/reference/ERP_KB_Discovery_Coverage_Report.json',
    mdPath: 'docs/reference/ERP_KB_Discovery_Coverage_Report.md',
  },
  optima_reference_duplicate_cleanup: {
    title: 'Optima Reference Duplicate Cleanup',
    jsonPath: 'docs/reference/Optima_Reference_Duplicate_Cleanup_Report.json',
    mdPath: 'docs/reference/Optima_Reference_Duplicate_Cleanup_Report.md',
  },
  quality_weekly: {
    title: 'Jakościowy raport tygodniowy',
    jsonPath: '',
    mdPath: 'docs/reference/ERP_KB_Quality_Weekly_Report.md',
  },
};

function normalizeBasePath(value) {
  const normalized = `/${String(value || '').trim().replace(/^\/+|\/+$/g, '')}`;
  return normalized === '/' ? '' : normalized;
}

function relativeUrl(pathname) {
  return `${BASE_PATH}${pathname}`;
}

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function truncate(value, limit = 500) {
  const text = normalizeWhitespace(value);
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 3)}...`;
}

function safeFileName(value) {
  const name = path.basename(String(value || 'upload.bin')).replace(/[^a-zA-Z0-9._ -]/g, '_').trim();
  return name || 'upload.bin';
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function readJsonIfExists(relativePath, fallback = null) {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonAbsoluteIfExists(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readDashboardOpenSpgCookie() {
  const existing = readOpenSpgCookie();
  if (existing) return existing;
  try {
    return fs.readFileSync(DEFAULT_OPENSPG_COOKIE_FILE, 'utf8').trim();
  } catch {
    return '';
  }
}

function writeJsonAbsolute(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function fileInfo(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) return { exists: false, relativePath };
  const stat = fs.statSync(filePath);
  return {
    exists: true,
    relativePath,
    size: stat.size,
    mtime: stat.mtime.toISOString(),
  };
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function send(res, statusCode, body, headers = {}) {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8');
  res.writeHead(statusCode, {
    'Content-Length': buffer.length,
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; connect-src 'self'; font-src 'self' https://fonts.gstatic.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'",
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    ...headers,
  });
  res.end(buffer);
}

function sendJson(res, statusCode, payload) {
  send(res, statusCode, JSON.stringify(payload, null, 2), {
    'Content-Type': 'application/json; charset=utf-8',
  });
}

function redirect(res, location) {
  res.writeHead(302, { Location: location, 'Content-Length': '0' });
  res.end();
}

function contentTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  }[extension] || 'application/octet-stream';
}

function sendFile(res, filePath) {
  const immutable = /\/assets\/.*-[a-f0-9]{8,}\./i.test(filePath)
    ? { 'Cache-Control': 'public, immutable, max-age=31536000' }
    : {};
  return send(res, 200, fs.readFileSync(filePath), {
    'Content-Type': contentTypeFor(filePath),
    ...immutable,
  });
}

function staticFilePathFor(routePathname) {
  const cleanPath = decodeURIComponent(routePathname.replace(/^\/+/, ''));
  if (!cleanPath || cleanPath === '/') return path.join(DASHBOARD_DIST, 'index.html');
  const candidate = path.normalize(path.join(DASHBOARD_DIST, cleanPath));
  const relative = path.relative(DASHBOARD_DIST, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return candidate;
}

function sendDashboardApp(res, routePathname = '/') {
  const indexPath = path.join(DASHBOARD_DIST, 'index.html');
  const filePath = staticFilePathFor(routePathname);
  if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return sendFile(res, filePath);
  }
  if (fs.existsSync(indexPath)) return sendFile(res, indexPath);
  return send(res, 200, pageHtml(), { 'Content-Type': 'text/html; charset=utf-8' });
}

function unauthorized(res) {
  send(res, 401, 'Unauthorized', {
    'Content-Type': 'text/plain; charset=utf-8',
    'WWW-Authenticate': 'Basic realm="ERP KB Dashboard"',
  });
}

function authUnavailable(res) {
  return sendJson(res, 503, {
    ok: false,
    error: 'auth_not_configured',
    message: 'Dashboard authentication is not configured. Set ERP_KB_DASHBOARD_* credentials.',
  });
}

function secureCredentialMatch(value, expected) {
  const supplied = Buffer.from(value);
  const target = Buffer.from(expected);
  return supplied.length === target.length && timingSafeEqual(supplied, target);
}

function authenticate(req) {
  if (ALLOW_ANON) return { ok: true, role: 'admin', username: 'anonymous' };
  const credentials = [
    { role: 'admin', username: USERNAME, password: PASSWORD },
    { role: 'operator', username: OPERATOR_USERNAME, password: OPERATOR_PASSWORD },
    { role: 'viewer', username: VIEWER_USERNAME, password: VIEWER_PASSWORD },
  ].filter((entry) => entry.username && entry.password);
  if (!credentials.length) return { ok: false, reason: 'auth_not_configured' };
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return { ok: false };
  let decoded = '';
  try {
    decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  } catch {
    return { ok: false };
  }
  const separator = decoded.indexOf(':');
  if (separator === -1) return { ok: false };
  const user = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);
  const match = credentials.find((entry) => (
    secureCredentialMatch(user, entry.username)
    && secureCredentialMatch(password, entry.password)
  ));
  return match ? { ok: true, role: match.role, username: match.username } : { ok: false };
}

function csrfOk(req) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method || 'GET')) return true;
  const token = String(req.headers['x-erp-kb-csrf'] || '');
  if (!token || !req.dashboardUser) return false;
  const supplied = Buffer.from(token);
  const expected = Buffer.from(csrfTokenFor(req.dashboardUser));
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function rateLimit(req) {
  const now = Date.now();
  const write = !['GET', 'HEAD', 'OPTIONS'].includes(req.method || 'GET');
  const limit = write ? RATE_LIMIT_WRITE : RATE_LIMIT_READ;
  const client = req.socket.remoteAddress || 'unknown';
  const key = `${client}:${write ? 'write' : 'read'}`;
  const current = RATE_BUCKETS.get(key);
  if (!current || now - current.startedAt >= RATE_LIMIT_WINDOW_MS) {
    RATE_BUCKETS.set(key, { startedAt: now, count: 1 });
    return { ok: true, remaining: Math.max(0, limit - 1), retryAfter: 0 };
  }
  current.count += 1;
  if (current.count <= limit) {
    return { ok: true, remaining: Math.max(0, limit - current.count), retryAfter: 0 };
  }
  return {
    ok: false,
    remaining: 0,
    retryAfter: Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (now - current.startedAt)) / 1000)),
  };
}

function routePath(urlValue) {
  const url = new URL(urlValue, 'http://dashboard.local');
  if (BASE_PATH && url.pathname === BASE_PATH) return { pathname: '/', searchParams: url.searchParams };
  if (BASE_PATH && url.pathname.startsWith(`${BASE_PATH}/`)) {
    return { pathname: url.pathname.slice(BASE_PATH.length) || '/', searchParams: url.searchParams };
  }
  if (BASE_PATH && url.pathname.startsWith('/api/')) {
    return { pathname: url.pathname, searchParams: url.searchParams };
  }
  if (!BASE_PATH) return { pathname: url.pathname, searchParams: url.searchParams };
  return null;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(Object.assign(new Error(`Body exceeds ${MAX_BODY_BYTES} bytes`), { code: 'BODY_TOO_LARGE' }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseMultipart(buffer, contentType) {
  const boundaryMatch = String(contentType || '').match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) throw new Error('Missing multipart boundary');
  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const raw = buffer.toString('binary');
  const parts = raw.split(`--${boundary}`).slice(1, -1);
  const fields = {};
  const files = [];

  for (const rawPart of parts) {
    const part = rawPart.replace(/^\r?\n/, '').replace(/\r?\n$/, '');
    if (!part.trim()) continue;
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    const headerText = part.slice(0, headerEnd);
    const bodyBinary = part.slice(headerEnd + 4);
    const headers = Object.fromEntries(headerText.split(/\r\n/).map((line) => {
      const index = line.indexOf(':');
      if (index === -1) return ['', ''];
      return [line.slice(0, index).trim().toLowerCase(), line.slice(index + 1).trim()];
    }).filter(([key]) => key));
    const disposition = headers['content-disposition'] || '';
    const name = disposition.match(/name="([^"]+)"/)?.[1] || '';
    const filename = disposition.match(/filename="([^"]*)"/)?.[1] || '';
    const content = Buffer.from(bodyBinary, 'binary');
    if (filename) {
      files.push({
        name,
        filename,
        contentType: headers['content-type'] || 'application/octet-stream',
        content,
      });
    } else if (name) {
      fields[name] = content.toString('utf8').trim();
    }
  }

  return { fields, files };
}

function readCsvRowCount(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) return 0;
  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) return 0;
  return Math.max(0, text.split(/\r?\n/).length - 1);
}

function listFilesSafe(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath, { withFileTypes: true });
}

function actionJsonPath(actionId) {
  return path.join(ACTION_ROOT, `${actionId}.json`);
}

function actionLogPath(actionId) {
  return path.join(ACTION_ROOT, `${actionId}.log`);
}

function saveAction(action) {
  const previous = readJsonAbsoluteIfExists(actionJsonPath(action.id), null);
  writeJsonAbsolute(actionJsonPath(action.id), action);
  if (!previous || previous.status !== action.status) {
    appendDashboardAudit({
      actor: action.operator || action.createdBy || 'dashboard-worker',
      role: 'system',
      action: 'dashboard.action.transition',
      resourceType: 'dashboard_action',
      resourceId: action.id,
      outcome: action.status === 'FAIL' ? 'failure' : 'success',
      before: previous ? { status: previous.status } : null,
      after: { status: action.status, type: action.type },
      metadata: {
        draftId: action.draftId || '',
        kbNamespace: action.kbNamespace || '',
        error: action.error || '',
      },
    });
  }
}

function readAction(actionId) {
  return readJsonAbsoluteIfExists(actionJsonPath(actionId), null);
}

function appendActionLog(actionId, chunk) {
  fs.mkdirSync(ACTION_ROOT, { recursive: true });
  fs.appendFileSync(actionLogPath(actionId), chunk, 'utf8');
}

function tailFile(filePath, limit = 8000) {
  if (!fs.existsSync(filePath)) return '';
  const stat = fs.statSync(filePath);
  const start = Math.max(0, stat.size - limit);
  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(stat.size - start);
    fs.readSync(fd, buffer, 0, buffer.length, start);
    return buffer.toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
}

function listActions(limit = 30) {
  return listFilesSafe(ACTION_ROOT)
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => readJsonAbsoluteIfExists(path.join(ACTION_ROOT, entry.name), null))
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .slice(0, limit);
}

function actionDetail(actionId) {
  const action = readAction(actionId);
  if (!action) return null;
  return {
    ...action,
    logTail: tailFile(actionLogPath(actionId)),
    logPath: path.relative(ROOT, actionLogPath(actionId)).replaceAll(path.sep, '/'),
  };
}

function latestJobForBuildManifest(manifestPath) {
  const manifest = readJsonIfExists(manifestPath, null);
  if (!manifest?.jobs?.length) return null;
  return [...manifest.jobs].sort((a, b) => Number(b.id || 0) - Number(a.id || 0))[0];
}

function loadKbRegistry() {
  const registry = readJsonIfExists(KB_REGISTRY_PATH, { entries: [] });
  return {
    generatedAt: registry.generatedAt || '',
    entries: Array.isArray(registry.entries) ? registry.entries.filter((entry) => entry.enabled !== false) : [],
  };
}

function inferNamespaceFromExportDir(exportDir, manifest) {
  if (manifest?.namespace) return manifest.namespace;
  return path.basename(path.dirname(exportDir)).replace(/[^a-zA-Z0-9]+/g, '_');
}

function inferKbNameFromExportDir(exportDir, manifest) {
  if (manifest?.kbName) return manifest.kbName;
  return inferNamespaceFromExportDir(exportDir, manifest);
}

function csvFilesForExportDir(exportDir) {
  const absoluteDir = path.join(ROOT, exportDir);
  return listFilesSafe(absoluteDir)
    .filter((entry) => entry.isFile() && entry.name.endsWith('.csv'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function findBuildManifest(exportDir) {
  const absoluteDir = path.join(ROOT, exportDir);
  const match = listFilesSafe(absoluteDir)
    .filter((entry) => entry.isFile() && /jobs_manifest\.json$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a))[0];
  return match ? `${exportDir}/${match}` : '';
}

function summarizeKb(entry, configured = true) {
  const exportDir = entry.exportDir || '';
  const manifest = exportDir ? readJsonIfExists(`${exportDir}/_manifest.json`, {}) : {};
  const manifestFiles = Array.isArray(manifest.files) ? manifest.files : [];
  const primaryFiles = Array.isArray(entry.primaryFiles) && entry.primaryFiles.length
    ? entry.primaryFiles
    : manifestFiles.slice(0, 4).map((item) => item.fileName).filter(Boolean);
  const allFiles = manifestFiles.length
    ? manifestFiles.map((item) => ({
      fileName: item.fileName,
      rowCount: Number(item.rowCount ?? readCsvRowCount(`${exportDir}/${item.fileName}`)),
    }))
    : csvFilesForExportDir(exportDir).map((fileName) => ({
      fileName,
      rowCount: readCsvRowCount(`${exportDir}/${fileName}`),
    }));
  const files = primaryFiles.map((fileName) => {
    const manifestFile = allFiles.find((item) => item.fileName === fileName);
    return {
      fileName,
      rowCount: Number(manifestFile?.rowCount ?? readCsvRowCount(`${exportDir}/${fileName}`)),
    };
  });
  const totalRows = allFiles.reduce((sum, file) => sum + Number(file.rowCount || 0), 0);
  const chunkRows = allFiles
    .filter((file) => /(^|_)chunk\.csv$/i.test(file.fileName))
    .reduce((sum, file) => sum + Number(file.rowCount || 0), 0);
  const buildManifestPath = entry.buildManifestPath || findBuildManifest(exportDir);
  return {
    namespace: entry.namespace || inferNamespaceFromExportDir(exportDir, manifest),
    kbName: entry.kbName || TARGET_KBS[entry.namespace]?.kbName || inferKbNameFromExportDir(exportDir, manifest),
    category: entry.category || 'Other',
    exportDir,
    configured,
    generatedAt: manifest.generatedAt || '',
    source: manifest.source || manifest.sourceRoot || '',
    latestJob: buildManifestPath ? latestJobForBuildManifest(buildManifestPath) : null,
    buildManifestPath,
    files,
    allFiles,
    totals: {
      files: allFiles.length,
      rows: totalRows,
      chunks: chunkRows,
      primaryRows: files.reduce((sum, file) => sum + Number(file.rowCount || 0), 0),
    },
  };
}

function discoverKbExports(configuredExportDirs = new Set()) {
  const exportsRoot = path.join(ROOT, 'exports');
  return listFilesSafe(exportsRoot)
    .filter((entry) => entry.isDirectory())
    .map((entry) => `exports/${entry.name}/v1`)
    .filter((exportDir) => fs.existsSync(path.join(ROOT, exportDir, '_manifest.json')))
    .filter((exportDir) => !configuredExportDirs.has(exportDir))
    .map((exportDir) => summarizeKb({ exportDir }, false));
}

function kbSummaries() {
  const registry = loadKbRegistry();
  const configuredExportDirs = new Set(registry.entries.map((entry) => entry.exportDir).filter(Boolean));
  return {
    registry,
    configured: registry.entries.map((entry) => summarizeKb(entry, true)),
    discovered: discoverKbExports(configuredExportDirs),
  };
}

function crontabStatus() {
  const result = spawnSync('crontab', ['-l'], { encoding: 'utf8' });
  if (result.status !== 0 && fs.existsSync(path.join(ROOT, 'scripts/cron_scan_dashboard_sources.sh'))) {
    const entry = `${SOURCE_SCAN_CRON_SCHEDULE} /usr/bin/env bash ${ROOT}/scripts/cron_scan_dashboard_sources.sh >> ${ROOT}/logs/dashboard_source_scan.log 2>&1`;
    return {
      ok: true,
      source: 'configured_fallback',
      entries: [entry],
      raw: `# NoNewPrivileges prevents setgid crontab inspection; showing configured source scan schedule.\n${entry}\n`,
    };
  }
  const text = result.status === 0 ? result.stdout : '';
  return {
    ok: result.status === 0,
    source: 'crontab',
    entries: text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#')),
    raw: text,
  };
}

function reportSummary() {
  return Object.entries(REPORTS).map(([key, config]) => {
    const json = config.jsonPath ? readJsonIfExists(config.jsonPath, null) : null;
    const report = {
      key,
      title: config.title,
      hasJsonPath: Boolean(config.jsonPath),
      json: config.jsonPath ? fileInfo(config.jsonPath) : { exists: false, relativePath: '' },
      markdown: fileInfo(config.mdPath),
      status: json?.overall || json?.summary?.counts || json?.summary || null,
    };
    report.overallStatus = reportOverallStatus(report);
    return report;
  });
}

function reportOverallStatus(report) {
  const status = report.status;
  if (typeof status === 'string') return status;
  if (status?.overall) return status.overall;
  if (typeof status?.pass === 'number' && typeof status?.miss === 'number') {
    return status.miss === 0 ? 'PASS' : 'FAIL';
  }
  if (typeof status?.PASS === 'number' && typeof status?.MISS === 'number') {
    return status.MISS === 0 ? 'PASS' : 'FAIL';
  }
  if (!report.hasJsonPath && report.markdown.exists) return 'OK';
  return report.json.exists ? 'OK' : 'MISSING';
}

function inboxSummary() {
  const drafts = listInboxDrafts();
  const counts = drafts.reduce((acc, draft) => {
    acc[draft.status] = (acc[draft.status] || 0) + 1;
    return acc;
  }, {});
  return {
    counts: {
      pending: counts.pending || 0,
      promoted: counts.promoted || 0,
      rejected: counts.rejected || 0,
      withdrawn: counts.withdrawn || 0,
    },
    drafts,
  };
}

function statusClass(value) {
  const text = String(value || 'UNKNOWN');
  if (/PASS|FINISH|FRESH|OK|REMEDIATED|^0$/i.test(text)) return 'ok';
  if (/WARN|PARTIAL|WAITING|RUNNING|INIT/i.test(text)) return 'warn';
  if (/FAIL|MISS|ERROR|MISSING/i.test(text)) return 'bad';
  return 'neutral';
}

function summarizeCharts(kbs, reports, inbox) {
  const jobStatusCounts = kbs.reduce((acc, kb) => {
    const status = kb.latestJob?.status || 'NO_JOB';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const categoryRows = kbs.reduce((acc, kb) => {
    acc[kb.category] = (acc[kb.category] || 0) + kb.totals.rows;
    return acc;
  }, {});
  return {
    kbRows: kbs.map((kb) => ({
      label: kb.kbName,
      namespace: kb.namespace,
      rows: kb.totals.rows,
      chunks: kb.totals.chunks,
      files: kb.totals.files,
      status: kb.latestJob?.status || 'NO_JOB',
    })),
    categoryRows: Object.entries(categoryRows).map(([label, rows]) => ({ label, rows })),
    jobStatuses: Object.entries(jobStatusCounts).map(([label, value]) => ({ label, value })),
    inboxStatuses: Object.entries(inbox.counts).map(([label, value]) => ({ label, value })),
    reportStatuses: reports.map((report) => ({
      label: report.title,
      status: report.overallStatus,
      className: statusClass(report.overallStatus),
      updatedAt: report.json.mtime || report.markdown.mtime || '',
    })),
  };
}

function summarizeDashboard(kbs, discoveredKbs, reports, inbox, crontab) {
  const sources = listSources();
  const discovery = discoverySummary();
  const reportProblemCount = reports.filter((report) => statusClass(report.overallStatus) === 'bad').length;
  const warningReportCount = reports.filter((report) => statusClass(report.overallStatus) === 'warn').length;
  return {
    kbCount: kbs.length,
    discoveredKbCount: discoveredKbs.length,
    totalRows: kbs.reduce((sum, kb) => sum + kb.totals.rows, 0),
    totalChunks: kbs.reduce((sum, kb) => sum + kb.totals.chunks, 0),
    totalFiles: kbs.reduce((sum, kb) => sum + kb.totals.files, 0),
    finishedJobs: kbs.filter((kb) => kb.latestJob?.status === 'FINISH').length,
    reportProblemCount,
    warningReportCount,
    cronEntries: crontab.entries.length,
    pendingDrafts: inbox.counts.pending,
    runningActions: listActions(50).filter((action) => action.status === 'RUNNING').length,
    sourceCount: sources.length,
    enabledSourceCount: sources.filter((source) => source.enabled !== false).length,
    failedSourceCount: sources.filter((source) => source.lastError).length,
    discoveryCoveredKbs: discovery.coverage.coveredKbs,
    discoveryConfiguredKbs: discovery.coverage.configuredKbs,
    discoveryPendingCandidates: discovery.candidates.filter((candidate) => (
      ['NEW', 'CANDIDATE_ONLY'].includes(candidate.status)
    )).length,
  };
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function loadKbSyncStatus(kbState) {
  const bundleExists = fs.existsSync(path.join(ROOT, APP_BUNDLE_PATH));
  const routingExists = fs.existsSync(path.join(ROOT, ROUTING_PATH));
  const bundle = readJsonIfExists(APP_BUNDLE_PATH, { kbProjects: [] });
  const routing = readJsonIfExists(ROUTING_PATH, { primaryKbOrder: [], routes: [] });
  const registryNamespaces = uniqueValues(kbState.configured.map((kb) => kb.namespace));
  const bundleNamespaces = uniqueValues((bundle.kbProjects || []).map((kb) => kb.name));
  const routingNamespaces = uniqueValues([
    ...(routing.primaryKbOrder || []),
    ...((routing.routes || []).flatMap((route) => [route.primaryKb, ...(route.supportKbs || [])])),
  ]);
  const discoveredNamespaces = uniqueValues(kbState.discovered.map((kb) => kb.namespace));
  const registryMissingFromRouting = registryNamespaces.filter((namespace) => !routingNamespaces.includes(namespace));
  const bundleMissingFromRouting = bundleNamespaces.filter((namespace) => !routingNamespaces.includes(namespace));
  const discoveredOnly = discoveredNamespaces.filter((namespace) => !registryNamespaces.includes(namespace));
  const ok = registryMissingFromRouting.length === 0 && bundleMissingFromRouting.length === 0 && discoveredOnly.length === 0;
  const status = ok ? 'PASS' : (!bundleExists || !routingExists ? 'WARN' : 'FAIL');
  return {
    status,
    label: `${registryNamespaces.length} registry / ${bundleNamespaces.length} app / ${routingNamespaces.length} routing / ${discoveredOnly.length} discovered`,
    registryCount: registryNamespaces.length,
    bundleCount: bundleNamespaces.length,
    routingCount: routingNamespaces.length,
    discoveredCount: discoveredNamespaces.length,
    discoveredOnlyCount: discoveredOnly.length,
    discoveredOnly,
    registryMissingFromRouting,
    bundleMissingFromRouting,
  };
}

function dashboardToolLinks() {
  const openSpgBase = OPENSPG_API_BASE.replace(/\/+$/, '');
  const mcpBase = ERP_KB_MCP_BASE_URL.replace(/\/+$/, '');
  return [
    {
      id: 'openspg-knowledge',
      title: 'Bazy wiedzy OpenSPG',
      description: 'Projekty, schematy i dane wszystkich baz wiedzy.',
      url: `${openSpgBase}/#/knowledge`,
      healthUrl: `${openSpgBase}/`,
      icon: 'database',
      status: 'OK',
    },
    {
      id: 'openspg-applications',
      title: 'Aplikacje OpenSPG',
      description: 'Lista wdrożonych aplikacji i ich konfiguracja.',
      url: `${openSpgBase}/#/application`,
      healthUrl: `${openSpgBase}/`,
      icon: 'applications',
      status: 'OK',
    },
    {
      id: 'erp-assistant-config',
      title: 'ERP Knowledge Assistant',
      description: 'Konfiguracja aplikacji 2. Runtime Q&A nadal wymaga naprawy mapowania projektu.',
      url: `${openSpgBase}/#/application/detail/arrange?appid=2`,
      healthUrl: `${openSpgBase}/`,
      icon: 'assistant',
      status: 'WARN',
    },
    {
      id: 'openspg-models',
      title: 'Modele OpenSPG',
      description: 'Konfiguracja modeli językowych używanych przez OpenSPG.',
      url: `${openSpgBase}/#/setting/model`,
      healthUrl: `${openSpgBase}/`,
      icon: 'models',
      status: 'OK',
    },
    {
      id: 'mcp-health',
      title: 'ERP KB MCP',
      description: 'Stan intranetowego mostu MCP dla klientów desktopowych.',
      url: `${mcpBase}/health`,
      healthUrl: `${mcpBase}/health`,
      icon: 'mcp',
      status: 'OK',
    },
  ];
}

function statusPayload(role = 'viewer', username = '') {
  const quality = readJsonIfExists(REPORTS.quality.jsonPath, {});
  const freshness = readJsonIfExists(REPORTS.freshness.jsonPath, {});
  const officialDelta = readJsonIfExists(REPORTS.official_delta.jsonPath, {});
  const inbox = inboxSummary();
  const reports = reportSummary();
  const kbState = kbSummaries();
  const crontab = crontabStatus();
  const actions = listActions(30);
  const sources = listSources();
  const automation = automationSummary();
  const providerSecrets = maskProviderSecrets(loadProviderSecrets());
  const discovery = discoverySummary();
  const kbSync = loadKbSyncStatus(kbState);
  discovery.qualityAlerts = [
    ...(discovery.qualityAlerts || []),
    ...sourceQualityAlerts(sources),
  ];
  const payload = {
    generatedAt: new Date().toISOString(),
    service: {
      ok: true,
      host: HOST,
      port: PORT,
      basePath: BASE_PATH,
      auth: AUTH_MODE,
      role,
      csrfToken: csrfTokenFor(username),
      maxBodyBytes: MAX_BODY_BYTES,
      maxBody: formatBytes(MAX_BODY_BYTES),
      draftAnalyze: {
        exaConfigured: providerSecrets.exaApiKey.configured,
        tavilyConfigured: providerSecrets.tavilyApiKey.configured,
        firecrawlConfigured: providerSecrets.firecrawlApiKey.configured,
        exaContentsApiUrl: EXA_CONTENTS_API_URL,
        openSpgLlmConfigured: Boolean(readDashboardOpenSpgCookie() && OPENSPG_LLM_APP_ID && OPENSPG_LLM_SESSION_ID),
        openSpgLlmCookieConfigured: Boolean(readDashboardOpenSpgCookie()),
        openSpgLlmEndpoint: OPENSPG_LLM_ENDPOINT,
        heuristicMetadataConfigured: true,
        maxAnalyzeChars: DRAFT_ANALYZE_MAX_CHARS,
      },
    },
    overall: {
      quality: quality.overall || 'UNKNOWN',
      freshness: freshness.overall || 'UNKNOWN',
      officialDelta: officialDelta.overall || 'UNKNOWN',
      pendingDrafts: inbox.counts.pending,
    },
    summary: summarizeDashboard(kbState.configured, kbState.discovered, reports, inbox, crontab),
    kbSync,
    reports,
    crontab,
    charts: summarizeCharts(kbState.configured, reports, inbox),
    tools: dashboardToolLinks(),
    inbox: { counts: inbox.counts },
    sources: {
      count: sources.length,
      enabled: sources.filter((source) => source.enabled !== false).length,
      failed: sources.filter((source) => source.lastError).length,
      listPath: path.relative(ROOT, SOURCE_LIST_PATH).replaceAll(path.sep, '/'),
      credentialsPath: path.relative(ROOT, SOURCE_CREDENTIALS_PATH).replaceAll(path.sep, '/'),
      items: sources,
    },
    kbs: kbState.configured.map((kb) => ({ namespace: kb.namespace, kbName: kb.kbName, category: kb.category })),
    discoveredKbs: kbState.discovered.map((kb) => ({ namespace: kb.namespace, kbName: kb.kbName, exportDir: kb.exportDir })),
    actions,
    discovery: {
      coverage: discovery.coverage,
      policy: discovery.policy,
      report: discovery.report,
      qualityAlerts: discovery.qualityAlerts,
      briefing: discovery.briefing,
      semiAuto: discovery.semiAuto,
    },
    automation: {
      config: automation.config,
      counts: automation.counts,
      active: automation.active,
      exceptions: automation.exceptions,
      reroutes: automation.reroutes,
      canaryQueue: automation.canaryQueue,
      canaryReport: automation.canaryReport,
      shadowReport: automation.shadowReport,
      llmHealth: automation.llmHealth,
      promotionGate: automation.promotionGate,
      llm: {
        configured: Boolean(
          process.env.ERP_KB_AUTOMATION_LLM_MOCK_FILE
          || (
            readDashboardOpenSpgCookie()
            && OPENSPG_LLM_APP_ID
            && OPENSPG_LLM_SESSION_ID
          )
        ),
      },
      providerSecrets,
    },
  };
  payload.summary.automationActive = automation.active.length;
  payload.summary.automationExceptions = automation.exceptions.length;
  payload.summary.canaryPending = automation.canaryQueue.length;
  payload.alerts = dashboardAlerts(payload);
  return payload;
}

function kbsPayload() {
  const kbState = kbSummaries();
  return {
    kbs: kbState.configured,
    discoveredKbs: kbState.discovered,
    kbRegistry: kbState.registry,
  };
}

function systemPayload() {
  return {
    system: {
      root: ROOT,
      dashboardDist: path.relative(ROOT, DASHBOARD_DIST).replaceAll(path.sep, '/'),
      kbRegistryPath: KB_REGISTRY_PATH,
      nodeVersion: process.version,
    },
    crontab: crontabStatus(),
  };
}

function sourceQualityAlerts(sources) {
  const now = Date.now();
  return sources.flatMap((source) => {
    const alerts = [];
    if (source.lastError) {
      alerts.push({
        level: 'bad',
        type: 'monitor_error',
        resourceId: source.id,
        kbNamespace: source.kbNamespace,
        message: `${source.title || source.id}: ${source.lastError}`,
      });
    }
    const lastSuccess = Date.parse(source.lastSuccessAt || '');
    if (source.enabled !== false && (!Number.isFinite(lastSuccess) || now - lastSuccess > 3 * 24 * 60 * 60 * 1000)) {
      alerts.push({
        level: 'warn',
        type: 'monitor_stale',
        resourceId: source.id,
        kbNamespace: source.kbNamespace,
        message: `${source.title || source.id} nie miał udanego skanu od ponad 3 dni.`,
      });
    }
    if (source.url) {
      try {
        const configuredHost = new URL(source.url).hostname;
        const changed = (source.seen || []).find((item) => (
          item.url && new URL(item.url).hostname !== configuredHost
        ));
        if (changed) {
          alerts.push({
            level: 'warn',
            type: 'monitor_domain_change',
            resourceId: source.id,
            kbNamespace: source.kbNamespace,
            message: `${source.title || source.id} zwrócił wynik z domeny ${new URL(changed.url).hostname}.`,
          });
        }
      } catch {
        // Invalid URLs are already rejected during source configuration.
      }
    }
    return alerts;
  });
}

function dashboardAlerts(payload) {
  const alerts = [];
  if (payload.overall.quality !== 'PASS') {
    alerts.push({ level: 'bad', message: `Quality Gate is ${payload.overall.quality}` });
  }
  if (payload.overall.freshness !== 'FRESH') {
    alerts.push({ level: 'warn', message: `Source Freshness is ${payload.overall.freshness}` });
  }
  if (!['OK', 'PASS', 'FRESH'].includes(String(payload.overall.officialDelta || ''))) {
    alerts.push({ level: 'warn', message: `Official Delta is ${payload.overall.officialDelta}` });
  }
  if (payload.overall.pendingDrafts > 0) {
    alerts.push({ level: 'warn', message: `${payload.overall.pendingDrafts} draft(s) waiting for review` });
  }
  for (const report of payload.reports) {
    if (!report.json.exists && !report.markdown.exists) {
      alerts.push({ level: 'bad', message: `Missing report: ${report.title}` });
    }
  }
  if (!payload.crontab.ok) {
    alerts.push({ level: 'warn', message: 'Crontab could not be read for the current service user' });
  }
  const runningActions = (payload.actions || []).filter((action) => action.status === 'RUNNING').length;
  const actions = payload.actions || [];
  const failedActions = actions.filter((action, index) => {
    if (action.status !== 'FAIL') return false;
    const scope = `${action.type}|${action.sourceId || ''}|${action.kbNamespace || ''}|${action.draftId || ''}`;
    return !actions.slice(0, index).some((newer) => (
      ['FINISH', 'REMEDIATED', 'PUBLISHED', 'ROLLED_BACK'].includes(newer.status)
      && `${newer.type}|${newer.sourceId || ''}|${newer.kbNamespace || ''}|${newer.draftId || ''}` === scope
    ));
  }).length;
  if (runningActions) {
    alerts.push({ level: 'warn', message: `${runningActions} dashboard action(s) still running` });
  }
  if (failedActions) {
    alerts.push({ level: 'bad', message: `${failedActions} recent dashboard action(s) failed` });
  }
  if (payload.automation?.config?.enabled && !payload.automation?.llm?.configured) {
    alerts.push({ level: 'bad', message: 'Automation is enabled but the review LLM is not configured' });
  }
  if (payload.automation?.config?.paused) {
    alerts.push({
      level: 'warn',
      message: payload.automation.config.pauseReason
        ? `Automation is paused: ${payload.automation.config.pauseReason}`
        : 'Automation is paused',
    });
  }
  if (
    payload.automation?.config?.enabled
    && payload.automation?.llm?.configured
    && !payload.automation?.llmHealth?.healthy
  ) {
    alerts.push({
      level: 'bad',
      message: `Automation LLM health is ${payload.automation.llmHealth?.status || 'UNKNOWN'}`,
    });
  }
  if (payload.automation?.reroutes?.length) {
    alerts.push({
      level: 'warn',
      message: `${payload.automation.reroutes.length} reroute proposal(s) need operator action`,
    });
  }
  if (payload.automation?.canaryQueue?.length) {
    alerts.push({
      level: 'warn',
      message: `${payload.automation.canaryQueue.length} live shadow decision(s) await operator adjudication`,
    });
  }
  if (payload.audit?.verification && !payload.audit.verification.ok) {
    alerts.push({ level: 'bad', message: 'Dashboard audit hash chain verification failed' });
  }
  const rollbackFailures = (payload.automation?.jobs || []).filter((job) => job.status === 'ROLLBACK_FAILED').length;
  if (rollbackFailures) {
    alerts.push({ level: 'bad', message: `${rollbackFailures} automation rollback(s) failed` });
  } else if (payload.automation?.exceptions?.length) {
    alerts.push({ level: 'warn', message: `${payload.automation.exceptions.length} automation exception(s) need review` });
  }
  if (payload.sources?.failed) {
    alerts.push({ level: 'warn', message: `${payload.sources.failed} source(s) have scan errors` });
  }
  if (
    payload.discovery?.coverage
    && payload.discovery.coverage.coveredKbs < payload.discovery.coverage.configuredKbs
  ) {
    alerts.push({
      level: 'bad',
      message: `Discovery covers ${payload.discovery.coverage.coveredKbs}/${payload.discovery.coverage.configuredKbs} KBs`,
    });
  }
  const discoveryRuns = payload.discovery?.runs || [];
  const failedDiscoveryRuns = discoveryRuns.filter((run, index) => (
    !run.ok
    && !discoveryRuns.slice(0, index).some((newer) => newer.type === run.type && newer.ok)
  )).length;
  if (failedDiscoveryRuns) {
    alerts.push({ level: 'warn', message: `${failedDiscoveryRuns} recent discovery run(s) failed` });
  }
  if (payload.optimaReferenceCleanup?.withdrawnCount > 0) {
    alerts.push({
      level: 'warn',
      message: `Optima Reference auto-cleanup withdrew ${payload.optimaReferenceCleanup.withdrawnCount} duplicate promoted draft(s)`,
    });
  }
  return alerts;
}

function draftDetail(draftId) {
  const draft = listInboxDrafts().find((item) => item.id === draftId);
  if (!draft) return null;
  const raw = readJsonIfExists(draft.rawJsonPath, {});
  const content = raw.content || '';
  return {
    ...draft,
    sourceUrl: raw.sourceUrl || draft.sourceUrl || '',
    tags: raw.tags || draft.tags || [],
    metadata: raw.metadata || null,
    contentLength: content.length,
    contentPreview: truncate(content, 4000),
    rawMarkdownPath: draft.rawJsonPath.replace(/\.json$/, '.md'),
  };
}

function assertSupportedUpload(file) {
  const extension = path.extname(String(file.filename || '').toLowerCase());
  if (!SUPPORTED_UPLOAD_EXTENSIONS.has(extension)) {
    throw new Error(`Unsupported upload extension: ${extension || '(none)'}`);
  }
  if (!file.content.length) {
    throw new Error('Uploaded file is empty');
  }
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pageHtml() {
  const kbOptions = Object.entries(TARGET_KBS).map(([namespace, target]) => (
    `<option value="${htmlEscape(namespace)}">${htmlEscape(target.kbName)}</option>`
  )).join('');
  return `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TAXBELL Knowledge Panel</title>
  <style>
    :root { color-scheme: light; --bg:#f5f6f8; --panel:#fff; --line:#d9dee7; --text:#17202e; --muted:#667085; --ok:#0f7a45; --warn:#a15c00; --bad:#b42318; --blue:#175cd3; --soft:#f8fafc; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; background: var(--bg); color: var(--text); }
    header { padding: 18px 24px 12px; border-bottom: 1px solid var(--line); background: var(--panel); display:flex; justify-content:space-between; gap:16px; align-items:flex-start; }
    h1 { margin: 0; font-size: 22px; }
    main { padding: 18px 24px 36px; display: grid; gap: 18px; }
    section { background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 16px; }
    h2 { margin: 0 0 12px; font-size: 16px; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .split { display:grid; grid-template-columns:minmax(0, 1.4fr) minmax(320px, .8fr); gap:18px; align-items:start; }
    .metric { border: 1px solid var(--line); border-radius: 6px; padding: 12px; min-height: 82px; }
    .metric .label { color: var(--muted); font-size: 12px; margin-bottom: 8px; }
    .metric .value { font-size: 22px; font-weight: 700; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; background:#eef2f6; color:var(--text); }
    .badge.ok { background:#dcfae6; color:var(--ok); }
    .badge.warn { background:#fff3d6; color:var(--warn); }
    .badge.bad { background:#fee4e2; color:var(--bad); }
    .alerts { display:grid; gap:8px; }
    .alert { border:1px solid var(--line); border-left-width:4px; border-radius:6px; padding:10px 12px; background:var(--soft); font-size:13px; }
    .alert.ok { border-left-color:var(--ok); }
    .alert.warn { border-left-color:var(--warn); }
    .alert.bad { border-left-color:var(--bad); }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; border-bottom: 1px solid var(--line); padding: 8px; vertical-align: top; }
    th { color: var(--muted); font-weight: 700; background: #f8fafc; }
    tr.clickable { cursor:pointer; }
    tr.clickable:hover { background:#f8fafc; }
    code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px; }
    form { display: grid; gap: 10px; max-width: 900px; }
    label { display: grid; gap: 5px; font-size: 13px; color: var(--muted); }
    input, select, textarea, button { font: inherit; }
    input, select, textarea { border: 1px solid var(--line); border-radius: 5px; padding: 8px; background: #fff; color: var(--text); }
    textarea { min-height: 150px; resize: vertical; }
    button { justify-self: start; border: 1px solid #155eef; background: #155eef; color: white; border-radius: 5px; padding: 8px 12px; cursor: pointer; }
    button.secondary { border-color: var(--line); background:#fff; color:var(--text); }
    button:disabled { opacity: .6; cursor: wait; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .toolbar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
    .muted { color: var(--muted); }
    .message { margin-top: 8px; font-size: 13px; }
    .detail { border:1px solid var(--line); border-radius:6px; background:var(--soft); padding:12px; min-height:160px; overflow:auto; }
    .detail pre, #cronBox { white-space:pre-wrap; word-break:break-word; margin:0; font-size:12px; }
    a { color:var(--blue); text-decoration:none; }
    a:hover { text-decoration:underline; }
    @media (max-width: 980px) { .grid, .row, .split { grid-template-columns: 1fr; } main, header { padding-left: 12px; padding-right: 12px; } header { display:block; } }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>TAXBELL Knowledge Panel</h1>
      <div class="muted">Status, raporty i bezpieczne dodawanie draftów do baz wiedzy</div>
    </div>
    <div class="toolbar">
      <button class="secondary" id="reloadButton" type="button">Odśwież</button>
    </div>
  </header>
  <main>
    <section>
      <h2>Status</h2>
      <div class="grid" id="metrics"></div>
    </section>
    <section>
      <h2>Alerty</h2>
      <div class="alerts" id="alerts"></div>
    </section>
    <section>
      <h2>Knowledge Bases</h2>
      <div id="kbTable"></div>
    </section>
    <div class="split">
      <section>
        <h2>Dodaj dokument jako draft</h2>
        <form id="draftForm">
          <div class="row">
            <label>KB
              <select name="kbNamespace" required>${kbOptions}</select>
            </label>
            <label>Tytuł
              <input name="title" maxlength="200" required>
            </label>
          </div>
          <label>URL źródła
            <input name="sourceUrl" type="url" placeholder="https://...">
          </label>
          <label>Tagi
            <input name="tags" placeholder="tag1, tag2">
          </label>
          <label>Treść
            <textarea name="content" placeholder="Wklej treść, albo wybierz plik .md/.txt/.pdf"></textarea>
          </label>
          <label>Plik
            <input name="file" type="file" accept="${htmlEscape(SUPPORTED_UPLOAD_ACCEPT)}">
          </label>
          <button type="submit">Zapisz draft</button>
          <div class="message" id="draftMessage"></div>
        </form>
      </section>
      <section>
        <h2>Podgląd draftu</h2>
        <div class="detail" id="draftDetail"><span class="muted">Wybierz draft z inboxa.</span></div>
      </section>
    </div>
    <section>
      <div class="toolbar" style="justify-content:space-between;margin-bottom:12px">
        <h2 style="margin:0">Inbox</h2>
        <div class="toolbar">
          <button class="secondary" data-filter="pending" type="button">Pending</button>
          <button class="secondary" data-filter="all" type="button">All</button>
          <button class="secondary" data-filter="promoted" type="button">Promoted</button>
          <button class="secondary" data-filter="rejected" type="button">Rejected</button>
        </div>
      </div>
      <div id="inboxTable"></div>
    </section>
    <section>
      <h2>Raporty i cron</h2>
      <div id="reportsTable"></div>
      <pre id="cronBox" class="muted"></pre>
    </section>
    <section>
      <div class="toolbar" style="justify-content:space-between;margin-bottom:12px">
        <h2 style="margin:0">Duplicate source URLs</h2>
        <span class="muted">Promoted drafts that collide with official Optima Reference URLs</span>
      </div>
      <div id="duplicateSources"></div>
    </section>
  </main>
  <script>
    const base = ${JSON.stringify(BASE_PATH)};
    let inboxFilter = 'pending';
    function badge(value) {
      const text = String(value ?? 'UNKNOWN');
      const cls = /PASS|FINISH|FRESH|OK|REMEDIATED|^0$/.test(text) ? 'ok' : /WARN|PARTIAL|WAITING|RUNNING|INIT/.test(text) ? 'warn' : /FAIL|MISS|ERROR|MISSING/.test(text) ? 'bad' : '';
      return '<span class="badge ' + cls + '">' + escapeHtml(text) + '</span>';
    }
    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;'}[ch]));
    }
    function rows(items, columns) {
      return '<table><thead><tr>' + columns.map(c => '<th>' + escapeHtml(c.label) + '</th>').join('') + '</tr></thead><tbody>' +
        items.map(item => '<tr' + (item.__click ? ' class="clickable" data-id="' + escapeHtml(item.__click) + '"' : '') + '>' + columns.map(c => '<td>' + c.render(item) + '</td>').join('') + '</tr>').join('') +
        '</tbody></table>';
    }
    function shortDate(value) {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return date.toLocaleString('pl-PL');
    }
    function reportStatus(report) {
      return badge(report.overallStatus || report.status || 'UNKNOWN');
    }
    async function loadStatus() {
      const res = await fetch(base + '/api/status');
      const data = await res.json();
      document.getElementById('metrics').innerHTML = [
        ['Quality', badge(data.overall.quality)],
        ['Freshness', badge(data.overall.freshness)],
        ['Official delta', badge(data.overall.officialDelta)],
        ['Pending drafts', badge(data.overall.pendingDrafts)]
      ].map(([label, value]) => '<div class="metric"><div class="label">' + label + '</div><div class="value">' + value + '</div></div>').join('');
      document.getElementById('alerts').innerHTML = data.alerts.length
        ? data.alerts.map(x => '<div class="alert ' + escapeHtml(x.level) + '">' + escapeHtml(x.message) + '</div>').join('')
        : '<div class="alert ok">Brak alertów operacyjnych.</div>';
      document.getElementById('kbTable').innerHTML = rows(data.kbs, [
        { label: 'KB', render: x => '<strong>' + escapeHtml(x.kbName) + '</strong><br><code>' + escapeHtml(x.namespace) + '</code>' },
        { label: 'Rows', render: x => x.files.map(f => '<code>' + escapeHtml(f.fileName) + '</code>: ' + escapeHtml(f.rowCount)).join('<br>') },
        { label: 'Generated', render: x => escapeHtml(shortDate(x.generatedAt)) },
        { label: 'Latest job', render: x => x.latestJob ? badge(x.latestJob.status) + '<br><code>' + escapeHtml(x.latestJob.id) + ' ' + escapeHtml(x.latestJob.fileName || x.latestJob.jobName || '') + '</code>' : '' }
      ]);
      const inbox = data.inbox.drafts
        .filter(x => inboxFilter === 'all' || x.status === inboxFilter)
        .slice().reverse().slice(0, 60)
        .map(x => ({ ...x, __click: x.id }));
      document.getElementById('inboxTable').innerHTML = rows(inbox, [
        { label: 'Status', render: x => badge(x.status) },
        { label: 'Draft', render: x => '<strong>' + escapeHtml(x.title) + '</strong><br><code>' + escapeHtml(x.id) + '</code>' },
        { label: 'KB', render: x => escapeHtml(x.kbName) + '<br><code>' + escapeHtml(x.kbNamespace) + '</code>' },
        { label: 'Source', render: x => x.sourceUrl ? '<a href="' + escapeHtml(x.sourceUrl) + '">' + escapeHtml(x.sourceUrl) + '</a>' : '<span class="muted">local/upload</span>' },
        { label: 'Created', render: x => escapeHtml(shortDate(x.createdAt)) }
      ]);
      document.querySelectorAll('#inboxTable tr[data-id]').forEach(row => row.addEventListener('click', () => loadDraftDetail(row.dataset.id)));
      document.getElementById('reportsTable').innerHTML = rows(data.reports, [
        { label: 'Report', render: x => '<strong>' + escapeHtml(x.title) + '</strong>' },
        { label: 'Status', render: x => reportStatus(x) },
        { label: 'Updated', render: x => escapeHtml(shortDate((x.json && x.json.mtime) || (x.markdown && x.markdown.mtime) || '')) },
        { label: 'Links', render: x => '<a href="' + base + '/api/reports/' + encodeURIComponent(x.key) + '?format=md">Markdown</a> · <a href="' + base + '/api/reports/' + encodeURIComponent(x.key) + '?format=json">JSON</a>' }
      ]);
      const duplicateRows = (data.qualityDuplicates || []).flatMap(group => group.promotedDrafts.map(draft => ({
        sourceUrl: group.sourceUrl,
        officialDocuments: group.officialDocuments || [],
        promotedDraft: draft,
        __click: draft.id,
      })));
      document.getElementById('duplicateSources').innerHTML = duplicateRows.length
        ? rows(duplicateRows, [
          { label: 'Source URL', render: x => '<a href="' + escapeHtml(x.sourceUrl) + '">' + escapeHtml(x.sourceUrl) + '</a>' },
          { label: 'Official', render: x => x.officialDocuments.map(doc => '<code>' + escapeHtml(doc.id) + '</code> ' + escapeHtml(doc.name)).join('<br>') },
          { label: 'Promoted draft', render: x => '<strong>' + escapeHtml(x.promotedDraft.title) + '</strong><br><code>' + escapeHtml(x.promotedDraft.id) + '</code>' },
          { label: 'Action', render: x => '<button class="secondary" data-withdraw-draft="' + escapeHtml(x.promotedDraft.id) + '">Withdraw promoted</button>' },
        ])
        : '<div class="alert ok">Brak konfliktów sourceUrl między oficjalnym eksportem a promowanymi draftami.</div>';
      document.querySelectorAll('button[data-withdraw-draft]').forEach(button => button.addEventListener('click', async () => {
        const draftId = button.dataset.withdrawDraft;
        button.disabled = true;
        button.textContent = 'Withdrawing...';
        try {
          const res = await fetch(base + '/api/drafts/' + encodeURIComponent(draftId) + '/withdraw-build', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reviewNote: 'Withdrawn from duplicate source URL report', withdrawnBy: 'dashboard' }),
          });
          const data = await res.json();
          if (!res.ok || !data.ok) throw new Error(data.message || data.error || 'Withdraw failed');
          await loadStatus();
        } catch (error) {
          button.disabled = false;
          button.textContent = 'Withdraw promoted';
          alert(error.message);
        }
      }));
      document.getElementById('cronBox').textContent = data.crontab.raw || '';
    }
    async function loadDraftDetail(id) {
      const res = await fetch(base + '/api/drafts/' + encodeURIComponent(id));
      const data = await res.json();
      if (!res.ok) {
        document.getElementById('draftDetail').textContent = data.message || data.error || 'Draft detail failed';
        return;
      }
      document.getElementById('draftDetail').innerHTML =
        '<strong>' + escapeHtml(data.title) + '</strong><br>' +
        badge(data.status) + ' <code>' + escapeHtml(data.id) + '</code><br><br>' +
        '<div class="muted">KB</div><code>' + escapeHtml(data.kbNamespace) + '</code><br><br>' +
        (data.sourceUrl ? '<div class="muted">Source</div><a href="' + escapeHtml(data.sourceUrl) + '">' + escapeHtml(data.sourceUrl) + '</a><br><br>' : '') +
        '<div class="muted">Paths</div><code>' + escapeHtml(data.rawJsonPath) + '</code><br><code>' + escapeHtml(data.rawMarkdownPath) + '</code><br><br>' +
        '<div class="muted">Preview, ' + escapeHtml(data.contentLength) + ' chars</div><pre>' + escapeHtml(data.contentPreview) + '</pre>';
    }
    document.getElementById('reloadButton').addEventListener('click', () => loadStatus());
    document.querySelectorAll('button[data-filter]').forEach(button => button.addEventListener('click', () => {
      inboxFilter = button.dataset.filter;
      loadStatus();
    }));
    document.getElementById('draftForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button');
      const message = document.getElementById('draftMessage');
      button.disabled = true;
      message.textContent = 'Zapisywanie...';
      try {
        const res = await fetch(base + '/api/drafts', { method: 'POST', body: new FormData(form) });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.message || data.error || 'Draft save failed');
        message.textContent = 'Zapisano draft: ' + data.draftId + (data.warning ? ' | ' + data.warning : '');
        form.reset();
        await loadStatus();
        await loadDraftDetail(data.draftId);
      } catch (error) {
        message.textContent = 'Błąd: ' + error.message;
      } finally {
        button.disabled = false;
      }
    });
    loadStatus().catch(error => { document.getElementById('metrics').textContent = error.message; });
  </script>
</body>
</html>`;
}

function saveUpload(file) {
  const dayDir = path.join(UPLOAD_ROOT, todayStamp());
  fs.mkdirSync(dayDir, { recursive: true });
  const fileName = `${Date.now()}_${randomUUID().slice(0, 8)}_${safeFileName(file.filename)}`;
  const filePath = path.join(dayDir, fileName);
  fs.writeFileSync(filePath, file.content);
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
}

async function contentFromUpload(file, relativePath) {
  const lower = String(file.filename || '').toLowerCase();
  const extension = path.extname(lower);
  if (SUPPORTED_UPLOAD_EXTENSIONS.has(extension) && extension !== '.pdf') {
    const rawContent = file.content.toString('utf8');
    const isCodeLike = !['.md', '.txt', '.csv'].includes(extension);
    const language = extension.replace(/^\./, '') || 'text';
    return {
      content: isCodeLike
        ? [
          `Uploaded technical file: ${file.filename}`,
          `Detected extension: ${extension}`,
          `Saved upload: ${relativePath}`,
          '',
          `\`\`\`${language}`,
          rawContent.trimEnd(),
          '```',
        ].join('\n')
        : rawContent,
      warning: '',
    };
  }
  if (lower.endsWith('.pdf') || file.contentType === 'application/pdf') {
    const text = await extractPdfText(path.join(ROOT, relativePath));
    if (text && text.length >= 120) {
      return {
        content: text,
        warning: '',
      };
    }
    return {
      content: [
        'PDF upload did not yield reliable selectable text.',
        '',
        `Uploaded file: ${relativePath}`,
        '',
        'Operator note: add a companion Markdown/TXT summary or process this PDF with OCR before promotion.',
      ].join('\n'),
      warning: 'PDF did not yield reliable selectable text; saved as draft with upload reference.',
    };
  }
  throw new Error(`Unsupported upload extension: ${extension || '(none)'}`);
}

function trimToLimit(value, limit = DRAFT_ANALYZE_MAX_CHARS) {
  const text = String(value || '')
    .replace(/\r/g, '')
    .replace(/\n{5,}/g, '\n\n\n\n')
    .trim();
  if (text.length <= limit) return text;
  return text.slice(0, limit).trim();
}

function parseTags(value) {
  return String(value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeHttpUrl(value) {
  const url = new URL(String(value || '').trim());
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('URL must use http or https');
  }
  url.hash = '';
  return url.toString();
}

function titleFromContent(content, fallback = 'Knowledge draft') {
  const firstStrongLine = String(content || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^#+\s*/, '').trim())
    .find((line) => line.length >= 8 && line.length <= 180);
  if (firstStrongLine) return firstStrongLine.slice(0, 180);
  const sentence = normalizeWhitespace(content).split(/[.!?]\s+/)[0];
  return (sentence && sentence.length >= 8 ? sentence : fallback).slice(0, 180);
}

function inferKbNamespace({ sourceUrl = '', content = '', title = '' }) {
  const haystack = `${sourceUrl} ${title} ${content}`.toLowerCase();
  let hostname = '';
  try {
    hostname = new URL(sourceUrl).hostname.toLowerCase();
  } catch {
    hostname = '';
  }
  if (hostname.includes('spolecznosc.comarch.pl') || /aktualno|komunikat|news|społeczność|spolecznosc/.test(haystack)) {
    return 'ComarchCommunityNews';
  }
  if (/kodeks pracy|zus|ubezpieczen|skladk|składk|wynagrodzen|urlop|pip|pracownik|umowa o prace|umowa o pracę|zlecen/.test(haystack)) {
    return 'TaxbellPayrollHRReference';
  }
  if (/rachunkow|ksi[eę]gow|jpk|sprawozdanie finansowe|ewidencj|faktur|deklaracj|vat[_ -]?7|jpk[_ -]?v7/.test(haystack)) {
    return 'TaxbellAccountingVATReference';
  }
  if (/prawo|ustaw|ordynacja podatkowa|interpretacj|obja[sś]nien|podatek|podatkow|kodeks|isap|dziennik ustaw/.test(haystack)) {
    return 'TaxbellLegalReference';
  }
  if (hostname.includes('betterfly') || /\bbetterfly\b|api2|api-|ksef|faktury zakupowe|faktury sprzedaży/.test(haystack)) {
    return 'ComarchBetterflyReference';
  }
  if (/sprint|wydruk|wydruki|generator raportów|genrap|szablon wydruku|wdr_|wydruk_id|report template/.test(haystack)) {
    return 'ComarchOptimaSprint';
  }
  if (/funkcj[aei] dodatkow|procedur|trigger|makr|sql|cdn\.|visual basic|\bvbscript\b|\.vb\b|\.vbs\b|uploaded technical file/.test(haystack)) {
    return 'ComarchOptimaAdditionalFunctions';
  }
  if (/konfigurac|tabela|kolumna|schemat|baza danych|mssql|constraint|indeks/.test(haystack)) {
    return 'ComarchOptimaSchema';
  }
  if (hostname.includes('partner.erp.comarch.pl') || /partner|technicz|com\b|api ksef|dictionary|dictionaries/.test(haystack)) {
    return 'ComarchOptimaPartnerTechnical';
  }
  return 'ComarchUniversalKnowledge';
}

function inferTags({ content = '', sourceUrl = '', kbNamespace = '' }) {
  const haystack = `${sourceUrl} ${content}`.toLowerCase();
  const candidates = [
    ['optima', /optima|erp xl|cdn\./],
    ['betterfly', /betterfly|api2/],
    ['api', /\bapi\b|endpoint|oauth|bearer|token/],
    ['ksef', /ksef|krajow(?:y|ego) system(?:u)? e-faktur/],
    ['wydruki', /\bwydruk(?:i|u|iem|ów)?\b|\bsprint\b|\bgenrap\b|szablon wydruku/],
    ['funkcje-dodatkowe', /funkcj[aei] dodatkow|makr|procedur|visual basic|\bvbscript\b/],
    ['schema', /schemat|mssql|tabela|kolumna|indeks|constraint/],
    ['xml', /\bxml\b|<\?xml|\.xml\b|\.xpt\b/],
    ['json', /\bjson\b|```json|\{[\s\S]{0,200}":/],
    ['sql', /\bsql\b|```sql|\bselect\s+[\s\S]{1,120}\bfrom\b|\binsert\s+into\b|\bupdate\s+\w+\s+set\b|\bdelete\s+from\b|\bcreate\s+procedure\b/],
    ['kod', /uploaded technical file|```|function |sub |class |const |dim /],
    ['community', /spolecznosc|społeczność|forum|pytanie/],
    ['partner', /partner\.erp|partner|technicz/],
    ['instrukcja', /instrukcja|manual|dokumentacja|pomoc/],
    ['prawo', /prawo|ustaw|kodeks|isap|dziennik ustaw/],
    ['podatki', /podatek|podatkow|ordynacja|interpretacj|obja[sś]nien/],
    ['kadry-place', /kadry|place|płace|pracownik|umowa o prac[eę]|wynagrodzen|urlop/],
    ['zus', /zus|skladk|składk|ubezpieczen/],
    ['ksiegowosc', /ksi[eę]gow|rachunkow|sprawozdanie finansowe/],
    ['vat-jpk', /vat|jpk|jpk[_ -]?v7/],
  ];
  const tags = candidates.filter(([, pattern]) => pattern.test(haystack)).map(([tag]) => tag);
  if (kbNamespace === 'ComarchBetterflyReference' && !tags.includes('betterfly')) tags.unshift('betterfly');
  if (kbNamespace.startsWith('ComarchOptima') && !tags.includes('optima')) tags.unshift('optima');
  return [...new Set(tags)].slice(0, 8);
}

function heuristicDraftAnalysis({ content, sourceUrl = '', titleHint = '' }) {
  const kbNamespace = inferKbNamespace({ sourceUrl, content, title: titleHint });
  return {
    title: titleHint || titleFromContent(content),
    kbNamespace,
    tags: inferTags({ content, sourceUrl, kbNamespace }),
    confidence: 'heuristic',
  };
}

async function fetchUrlFallback(sourceUrl) {
  return fetchContent(sourceUrl, { providers: ['http'] });
}

async function fetchUrlWithExa(sourceUrl) {
  return fetchContent(sourceUrl, { providers: ['exa'] });
}

async function fetchSourceUrlContent(sourceUrl) {
  return fetchContent(sourceUrl);
}

function extractJsonObject(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON object in LLM response');
  return JSON.parse(candidate.slice(start, end + 1));
}

function llmResponseText(json) {
  return String(
    json?.choices?.[0]?.message?.content ||
    json?.choices?.[0]?.text ||
    json?.result?.choices?.[0]?.message?.content ||
    json?.result?.output ||
    json?.result?.content ||
    json?.data?.choices?.[0]?.message?.content ||
    '',
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

async function callOpenSpgLlmForDraft({ content, sourceUrl, titleHint }) {
  const cookie = readDashboardOpenSpgCookie();
  if (!cookie) throw new Error('OpenSPG cookie is not configured');
  if (!OPENSPG_LLM_APP_ID || !OPENSPG_LLM_SESSION_ID) {
    throw new Error('OPENSPG_LLM_APP_ID and OPENSPG_LLM_SESSION_ID are not configured');
  }
  const targets = Object.entries(TARGET_KBS)
    .map(([namespace, target]) => `${namespace}: ${target.kbName}`)
    .join('\n');
  const prompt = [
    'Jesteś klasyfikatorem draftów dla panelu KB. Zwróć wyłącznie JSON.',
    'Wszystkie pola tekstowe, w tym title i tags, zapisuj po polsku.',
    'Wybierz najbardziej pasującą bazę wiedzy, krótki polski tytuł i 3-8 polskich tagów.',
    'Dozwolone namespaces:',
    targets,
    '',
    'Format JSON:',
    '{"title":"...","kbNamespace":"...","tags":["..."],"confidence":"high|medium|low"}',
    '',
    `URL: ${sourceUrl || ''}`,
    `Tytuł roboczy: ${titleHint || ''}`,
    '',
    'Treść:',
    trimToLimit(content, DRAFT_LLM_INPUT_MAX_CHARS),
  ].join('\n');
  const payload = {
    ...(OPENSPG_LLM_MODEL ? { model: OPENSPG_LLM_MODEL } : {}),
    app_id: /^\d+$/.test(OPENSPG_LLM_APP_ID) ? Number(OPENSPG_LLM_APP_ID) : OPENSPG_LLM_APP_ID,
    session_id: /^\d+$/.test(OPENSPG_LLM_SESSION_ID) ? Number(OPENSPG_LLM_SESSION_ID) : OPENSPG_LLM_SESSION_ID,
    prompt: [
      {
        type: 'text',
        content: `Zwracasz tylko poprawny JSON bez markdown. Wszystkie pola tekstowe zapisuj po polsku.\n\n${prompt}`,
      },
    ],
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
  if (!response.ok) throw new Error(`OpenSPG LLM failed with HTTP ${response.status}: ${body.slice(0, 240)}`);
  const parsed = extractJsonObject(llmResponseTextFromBody(body));
  if (!TARGET_KBS[parsed.kbNamespace]) throw new Error(`OpenSPG LLM returned unsupported kbNamespace: ${parsed.kbNamespace}`);
  return {
    title: String(parsed.title || titleHint || titleFromContent(content)).trim().slice(0, 180),
    kbNamespace: parsed.kbNamespace,
    tags: Array.isArray(parsed.tags) ? parsed.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 8) : [],
    confidence: parsed.confidence || 'medium',
  };
}

async function analyzeDraftMetadata({ content, sourceUrl = '', titleHint = '' }) {
  const warnings = [];
  const heuristic = heuristicDraftAnalysis({ content, sourceUrl, titleHint });
  try {
    const llm = await callOpenSpgLlmForDraft({ content, sourceUrl, titleHint: heuristic.title });
    return {
      ...llm,
      title: llm.title || heuristic.title,
      tags: llm.tags.length ? llm.tags : heuristic.tags,
      provider: 'openspg_llm',
      warnings,
    };
  } catch (error) {
    warnings.push(`OpenSPG LLM unavailable; used heuristics: ${error.message}`);
    return {
      ...heuristic,
      provider: 'heuristic',
      warnings,
    };
  }
}

function safeMetadataFromFields(fields, defaults = {}) {
  let fromClient = {};
  if (fields.metadataJson) {
    try {
      fromClient = JSON.parse(fields.metadataJson);
    } catch {
      fromClient = {};
    }
  }
  const allowed = {};
  for (const key of [
    'discoveredVia',
    'exaQuery',
    'sourceTier',
    'retrievedAt',
    'analysisProvider',
    'contentProvider',
    'sourceType',
    'analysisConfidence',
  ]) {
    if (fromClient[key] !== undefined && fromClient[key] !== '') allowed[key] = fromClient[key];
  }
  return {
    ...allowed,
    ...defaults,
  };
}

async function handleAnalyzeDraft(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    return sendJson(res, error.code === 'BODY_TOO_LARGE' ? 413 : 400, {
      ok: false,
      error: 'invalid_body',
      message: error.message,
    });
  }

  let parsed;
  try {
    parsed = parseMultipart(body, req.headers['content-type'] || '');
  } catch (error) {
    return sendJson(res, 400, { ok: false, error: 'invalid_multipart', message: error.message });
  }

  const { fields, files } = parsed;
  const sourceType = String(fields.sourceType || 'text').trim();
  const warnings = [];
  let sourceUrl = '';
  let content = '';
  let titleHint = String(fields.title || '').trim();
  let contentProvider = sourceType;
  const providerSecrets = maskProviderSecrets(loadProviderSecrets());
  let uploadPath = '';
  let upload = null;

  try {
    if (sourceType === 'url') {
      sourceUrl = normalizeHttpUrl(fields.sourceUrl || '');
      const fetched = await fetchSourceUrlContent(sourceUrl);
      sourceUrl = fetched.sourceUrl;
      content = fetched.content;
      titleHint = titleHint || fetched.title || titleFromContent(fetched.content, sourceUrl);
      contentProvider = fetched.provider;
      if (fetched.warning) warnings.push(fetched.warning);
      if (fetched.requestId) warnings.push(`Exa requestId: ${fetched.requestId}`);
    } else if (sourceType === 'file') {
      upload = files.find((file) => file.name === 'file' && file.filename && file.content.length);
      if (!upload) throw new Error('Upload file is required');
      assertSupportedUpload(upload);
      uploadPath = saveUpload(upload);
      const extracted = await contentFromUpload(upload, uploadPath);
      content = extracted.content;
      titleHint = titleHint || upload.filename;
      contentProvider = 'upload';
      if (extracted.warning) warnings.push(extracted.warning);
    } else {
      content = String(fields.content || '').trim();
      sourceUrl = fields.sourceUrl ? normalizeHttpUrl(fields.sourceUrl) : '';
      titleHint = titleHint || titleFromContent(content);
      contentProvider = 'manual_text';
    }
  } catch (error) {
    return sendJson(res, 400, { ok: false, error: 'source_extract_failed', message: error.message });
  }

  content = trimToLimit(content);
  if (!content || content.length < 20) {
    return sendJson(res, 400, {
      ok: false,
      error: 'empty_content',
      message: 'Extracted content is too short to create a useful draft.',
    });
  }

  const analysis = await analyzeDraftMetadata({ content, sourceUrl, titleHint });
  const kbNamespace = TARGET_KBS[analysis.kbNamespace] ? analysis.kbNamespace : inferKbNamespace({ sourceUrl, content, title: analysis.title });
  const sourceTier = sourceUrl ? classifySourceTier(sourceUrl) : 'official';
  const metadata = {
    discoveredVia: contentProvider === 'exa' ? 'exa' : undefined,
    sourceTier,
    retrievedAt: new Date().toISOString(),
    analysisProvider: analysis.provider,
    analysisConfidence: analysis.confidence,
    contentProvider,
    sourceType,
    uploadPath,
    uploadFileName: upload?.filename || '',
    uploadContentType: upload?.contentType || '',
  };

  return sendJson(res, 200, {
    ok: true,
    sourceType,
    title: analysis.title || titleFromContent(content, titleHint || 'Knowledge draft'),
    kbNamespace,
    kbName: TARGET_KBS[kbNamespace]?.kbName || kbNamespace,
    tags: analysis.tags?.length ? analysis.tags : inferTags({ content, sourceUrl, kbNamespace }),
    sourceUrl,
    content,
    contentLength: content.length,
    metadata,
    providers: {
      ...providerSecrets,
      content: contentProvider,
      metadata: analysis.provider,
      exaConfigured: providerSecrets.exaApiKey.configured,
      openSpgLlmConfigured: Boolean(readDashboardOpenSpgCookie() && OPENSPG_LLM_APP_ID && OPENSPG_LLM_SESSION_ID),
    },
    warnings: [...warnings, ...(analysis.warnings || [])].filter(Boolean),
  });
}

async function handleCreateDraft(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    return sendJson(res, error.code === 'BODY_TOO_LARGE' ? 413 : 400, {
      ok: false,
      error: 'invalid_body',
      message: error.message,
    });
  }

  let parsed;
  try {
    parsed = parseMultipart(body, req.headers['content-type'] || '');
  } catch (error) {
    return sendJson(res, 400, { ok: false, error: 'invalid_multipart', message: error.message });
  }

  const { fields, files } = parsed;
  const kbNamespace = fields.kbNamespace || '';
  const target = TARGET_KBS[kbNamespace];
  if (!target) {
    return sendJson(res, 400, { ok: false, error: 'invalid_kb', message: `Unsupported kbNamespace: ${kbNamespace}` });
  }

  const upload = files.find((file) => file.name === 'file' && file.filename && file.content.length);
  let content = fields.content || '';
  let uploadPath = '';
  let warning = '';
  if (upload) {
    try {
      assertSupportedUpload(upload);
    } catch (error) {
      return sendJson(res, 400, { ok: false, error: 'unsupported_upload', message: error.message });
    }
    uploadPath = saveUpload(upload);
    const extracted = await contentFromUpload(upload, uploadPath);
    content = content.trim()
      ? `${content.trim()}\n\n## Uploaded file extract\n\n${extracted.content}`
      : extracted.content;
    warning = extracted.warning;
  }

  const title = fields.title || upload?.filename || 'Knowledge draft';
  const tags = parseTags(fields.tags);
  const sourceTier = fields.sourceUrl ? classifySourceTier(fields.sourceUrl) : 'official';
  const metadata = safeMetadataFromFields(fields, {
    sourceTier,
    uploadPath,
    uploadFileName: upload?.filename || '',
    uploadContentType: upload?.contentType || '',
    dashboardSubmittedAt: new Date().toISOString(),
  });

  try {
    const result = await submitKnowledgeDraft({
      kbName: target.kbName,
      kbNamespace,
      title,
      content,
      sourceUrl: fields.sourceUrl || '',
      tags,
      metadata,
    }, { silent: true });
    return sendJson(res, 201, {
      ok: true,
      draftId: result.draft.id,
      kbNamespace,
      jsonPath: path.relative(ROOT, result.jsonPath).replaceAll(path.sep, '/'),
      mdPath: path.relative(ROOT, result.mdPath).replaceAll(path.sep, '/'),
      uploadPath,
      warning,
      automation: result.automation,
    });
  } catch (error) {
    return sendJson(res, 400, { ok: false, error: 'draft_save_failed', message: error.message });
  }
}

async function handleAutomationConfig(req, res) {
  let fields;
  try {
    fields = await readJsonRequest(req);
  } catch (error) {
    return sendJson(res, error.responseStatus || 400, {
      ok: false,
      error: error.apiError || 'invalid_body',
      message: error.message,
    });
  }
  try {
    const { providerSecrets: providerSecretsPatch, ...configPatch } = fields;
    let providerSecrets = null;
    if (providerSecretsPatch && typeof providerSecretsPatch === 'object') {
      providerSecrets = updateProviderSecrets(
        providerSecretsPatch,
        req.dashboardUser || USERNAME || process.env.USER || 'dashboard',
      );
    }
    const config = saveAutomationConfig(
      configPatch,
      req.dashboardUser || USERNAME || process.env.USER || 'dashboard',
    );
    return sendJson(res, 200, { ok: true, config, providerSecrets, automation: automationSummary() });
  } catch (error) {
    return sendJson(res, error.code === 'PROMOTION_GATE_BLOCKED' ? 409 : 400, {
      ok: false,
      error: error.code || 'automation_config_failed',
      message: error.message,
      gate: error.gate || null,
    });
  }
}

async function handleGetAutomationLearning(req, res) {
  try {
    const discoveryState = readJsonAbsoluteIfExists(DISCOVERY_LEARNING_PATH, null);
    const automationState = readJsonAbsoluteIfExists(AUTOMATION_LEARNING_PATH, null);
    const thresholds = {};
    if (automationState?.byKbNamespace) {
      for (const [kns, stats] of Object.entries(automationState.byKbNamespace)) {
        thresholds[kns] = {
          baseThreshold: stats.baseThreshold || 0.6,
          tunedBaseline: stats.tunedBaseline || stats.baseThreshold || 0.6,
          windowFpRate: stats.windowFpRate || 0,
          windowSize: stats.windowSize || 0,
          reviewed: stats.reviewed || 0,
        };
      }
    }
    const penalties = {};
    if (discoveryState?.byDomain) {
      for (const [domain, stats] of Object.entries(discoveryState.byDomain)) {
        penalties[domain] = {
          total: (stats.accepted || 0) + (stats.rejected || 0) + (stats.duplicates || 0),
          accepted: stats.accepted || 0,
          rejected: stats.rejected || 0,
          duplicate: stats.duplicates || 0,
          noisePenalty: stats.noisePenalty || 0,
          operatorOverride: stats.operatorOverride != null ? stats.operatorOverride : null,
        };
      }
    }
    const discoveryPolicy = loadDiscoveryPolicy();
    const autoDraftState = deriveDiscoveryAutoDraftState(discoveryPolicy, automationState);
    return sendJson(res, 200, {
      ok: true,
      thresholds,
      penalties,
      autoDraft: autoDraftState,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: 'learning_load_failed',
      message: error.message,
    });
  }
}

async function handlePatchAutomationLearning(req, res) {
  let fields;
  try {
    fields = await readJsonRequest(req);
  } catch (error) {
    return sendJson(res, 400, {
      ok: false,
      error: 'invalid_body',
      message: error.message,
    });
  }
  try {
    if (fields.reset === 'full') {
      try { fs.rmSync(DISCOVERY_LEARNING_PATH, { force: true }); } catch { /* optional state file */ }
      try { fs.rmSync(AUTOMATION_LEARNING_PATH, { force: true }); } catch { /* optional state file */ }
      appendDashboardAudit({
        actor: req.dashboardUser || process.env.USER || 'dashboard',
        role: 'admin',
        action: 'automation.learning.reset',
        resourceType: 'learning_state',
        resourceId: 'full',
        after: { reset: 'full', at: new Date().toISOString() },
      });
      return sendJson(res, 200, { ok: true, message: 'Full learning state reset.' });
    }
    if (fields.reset === 'thresholds') {
      try {
        const state = JSON.parse(fs.readFileSync(AUTOMATION_LEARNING_PATH, 'utf8'));
        state.byKbNamespace = {};
        state.highlights = { guardedKbNamespaces: [], reroutePairs: [] };
        fs.writeFileSync(AUTOMATION_LEARNING_PATH, JSON.stringify(state, null, 2) + '\n', { encoding: 'utf8', mode: 0o640 });
      } catch { /* optional state file */ }
      return sendJson(res, 200, { ok: true, message: 'Threshold learning state reset.' });
    }
    if (fields.reset === 'penalties') {
      try {
        const state = JSON.parse(fs.readFileSync(DISCOVERY_LEARNING_PATH, 'utf8'));
        state.byDomain = {};
        state.highlights = { strongestDomains: [], weakestQueries: [] };
        fs.writeFileSync(DISCOVERY_LEARNING_PATH, JSON.stringify(state, null, 2) + '\n', { encoding: 'utf8', mode: 0o640 });
      } catch { /* optional state file */ }
      return sendJson(res, 200, { ok: true, message: 'Domain penalty learning state reset.' });
    }
    if (fields.domainOverride) {
      const { domain, noisePenalty } = fields.domainOverride;
      if (!domain || typeof domain !== 'string') {
        return sendJson(res, 400, { ok: false, error: 'invalid_domain', message: 'domain is required' });
      }
      const state = readJsonAbsoluteIfExists(DISCOVERY_LEARNING_PATH, { generatedAt: new Date().toISOString(), overall: { reviewed: 0, candidates: 0 }, byDomain: {}, byQuery: {}, byKbNamespace: {}, bySourceTier: {}, highlights: { strongestDomains: [], weakestQueries: [] }, promptMemory: { recentRejectNotes: [], recentAcceptNotes: [] } });
      if (!state.byDomain) state.byDomain = {};
      if (noisePenalty == null) {
        if (state.byDomain[domain]) state.byDomain[domain].operatorOverride = null;
      } else {
        const clamped = Math.max(0, Math.min(1, Number(noisePenalty)));
        if (!state.byDomain[domain]) {
          state.byDomain[domain] = { reviewed: 0, accepted: 0, rejected: 0, duplicates: 0, acceptanceRate: null, rejectRate: 0, duplicateRate: 0, scoreDelta: 0, reasons: [], noisePenalty: 0, operatorOverride: clamped };
        } else {
          state.byDomain[domain].operatorOverride = clamped;
        }
      }
      fs.mkdirSync(path.dirname(DISCOVERY_LEARNING_PATH), { recursive: true });
      fs.writeFileSync(DISCOVERY_LEARNING_PATH, JSON.stringify(state, null, 2) + '\n', { encoding: 'utf8', mode: 0o640 });
      return sendJson(res, 200, { ok: true, message: `Domain ${domain} override updated.` });
    }
    return sendJson(res, 400, { ok: false, error: 'unknown_action', message: 'Specify reset, domainOverride, or learningAction.' });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: 'learning_patch_failed', message: error.message });
  }
}

async function handleExportLearningState(req, res) {
  try {
    const discoveryPath = path.join(ROOT, 'data/dashboard/learning/discovery_learning_state.json');
    const automationPath = path.join(ROOT, 'data/dashboard/learning/automation_learning_state.json');
    const discovery = fs.existsSync(discoveryPath) ? JSON.parse(fs.readFileSync(discoveryPath, 'utf8')) : null;
    const automation = fs.existsSync(automationPath) ? JSON.parse(fs.readFileSync(automationPath, 'utf8')) : null;
    res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="learning_state_export.json"' });
    res.end(JSON.stringify({ ok: true, exportedAt: new Date().toISOString(), discovery, automation }, null, 2));
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: 'export_failed', message: error.message });
  }
}

async function handleImportLearningState(req, res) {
  let fields;
  try { fields = await readJsonRequest(req); } catch (error) {
    return sendJson(res, 400, { ok: false, error: 'invalid_body', message: error.message });
  }
  try {
    const learningRoot = path.join(ROOT, 'data/dashboard/learning');
    fs.mkdirSync(learningRoot, { recursive: true });
    if (fields.discovery) {
      fs.writeFileSync(path.join(learningRoot, 'discovery_learning_state.json'), JSON.stringify(fields.discovery, null, 2) + '\n', { encoding: 'utf8', mode: 0o640 });
    }
    if (fields.automation) {
      fs.writeFileSync(path.join(learningRoot, 'automation_learning_state.json'), JSON.stringify(fields.automation, null, 2) + '\n', { encoding: 'utf8', mode: 0o640 });
    }
    appendDashboardAudit({
      actor: req.dashboardUser || 'dashboard', role: 'admin', action: 'automation.learning.import',
      resourceType: 'learning_state', resourceId: 'import',
      after: { importedAt: new Date().toISOString(), hasDiscovery: Boolean(fields.discovery), hasAutomation: Boolean(fields.automation) },
    });
    return sendJson(res, 200, { ok: true, message: 'Learning state imported.' });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: 'import_failed', message: error.message });
  }
}

async function handleGetTrends(req, res) {
  try {
    const days = Math.max(0, Math.min(365, Number(req.route?.searchParams?.get('days') || 30)));
    const cutoff = days === 0 ? '' : new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const trendsPath = path.join(ROOT, 'data/dashboard/learning/trends.jsonl');
    const grouped = {};
    if (fs.existsSync(trendsPath)) {
      const latestPerDay = {};
      const raw = fs.readFileSync(trendsPath, 'utf8');
      for (const line of raw.trim().split('\n').filter(Boolean)) {
        try {
          const entry = JSON.parse(line);
          if (cutoff === '' || entry.date >= cutoff) {
            const dedupKey = `${entry.date}|${entry.kbNamespace}`;
            latestPerDay[dedupKey] = entry;
          }
        } catch { /* skip malformed historical trend row */ }
      }
      for (const entry of Object.values(latestPerDay)) {
        (grouped[entry.kbNamespace] = grouped[entry.kbNamespace] || []).push(entry);
      }
    }
    return sendJson(res, 200, { ok: true, trends: grouped });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: 'trends_load_failed', message: error.message });
  }
}

async function handleGetAlerts(req, res) {
  try {
    const alerts = detectAnomalies();
    return sendJson(res, 200, { ok: true, alerts });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: 'alerts_failed', message: error.message });
  }
}

async function handleGetAutopilot(req, res) {
  try {
    const state = loadAutopilotState();
    return sendJson(res, 200, { ok: true, autopilot: autopilotSummary(state) });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: 'autopilot_failed', message: error.message });
  }
}

async function handleGenerateReport(req, res) {
  try {
    const path = generateQualityReport();
    return sendJson(res, 200, { ok: true, path, message: 'Raport wygenerowany.' });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: 'report_failed', message: error.message });
  }
}

async function handleAutomationRun(req, res) {
  let fields;
  try {
    fields = await readJsonRequest(req);
  } catch (error) {
    return sendJson(res, error.responseStatus || 400, {
      ok: false,
      error: error.apiError || 'invalid_body',
      message: error.message,
    });
  }
  const config = loadAutomationConfig();
  if (fields.shadowHistory === true) {
    const result = triggerShadowBenchmark({
      namespace: String(fields.namespace || config.allowedNamespaces[0] || '').trim(),
      limit: Number(fields.limit || 100),
    });
    return sendJson(res, 202, {
      ok: true,
      ...result,
      message: 'Historical shadow benchmark started.',
    });
  }
  if ((!config.enabled || config.paused) && fields.force !== true) {
    return sendJson(res, 409, {
      ok: false,
      error: config.paused ? 'automation_paused' : 'automation_disabled',
      message: config.paused ? 'Automation is paused.' : 'Automation is disabled.',
    });
  }
  const draftId = String(fields.draftId || '').trim();
  if (draftId) {
    const draft = listInboxDrafts().find((item) => item.id === draftId);
    if (!draft) return sendJson(res, 404, { ok: false, error: 'draft_missing', message: `Draft not found: ${draftId}` });
    if (draft.status !== 'pending') {
      return sendJson(res, 409, {
        ok: false,
        error: 'draft_not_pending',
        message: `Draft status is ${draft.status}; expected pending.`,
      });
    }
    const result = triggerAutomationForDraft(draft, { force: fields.force === true });
    return sendJson(res, result.started ? 202 : 409, { ok: result.started, ...result });
  }
  const child = spawn(process.execPath, [
    path.join(ROOT, 'scripts/run_dashboard_automation.mjs'),
    '--pending',
    ...(fields.force === true ? ['--force'] : []),
  ], {
    cwd: ROOT,
    env: {
      ...process.env,
      ROOT,
      ...(fields.force === true ? { ERP_KB_AUTOMATION_FORCE: '1' } : {}),
    },
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  return sendJson(res, 202, {
    ok: true,
    pid: child.pid,
    message: 'Pending automation scan started.',
  });
}

async function handleAutomationRetry(req, res, jobId) {
  const previous = readAutomationJob(jobId);
  if (!previous) return sendJson(res, 404, { ok: false, error: 'job_missing', message: `Automation job not found: ${jobId}` });
  const child = spawn(process.execPath, [
    path.join(ROOT, 'scripts/run_dashboard_automation.mjs'),
    '--retry',
    jobId,
  ], {
    cwd: ROOT,
    env: { ...process.env, ROOT, ERP_KB_AUTOMATION_FORCE: '1' },
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  return sendJson(res, 202, {
    ok: true,
    pid: child.pid,
    retryOf: jobId,
    message: 'Automation retry started.',
  });
}

async function handleAutomationAdjudication(req, res, jobId) {
  let fields;
  try {
    fields = await readJsonRequest(req);
  } catch (error) {
    return sendJson(res, error.responseStatus || 400, {
      ok: false,
      error: error.apiError || 'invalid_body',
      message: error.message,
    });
  }
  try {
    const job = adjudicateAutomationJob(
      jobId,
      String(fields.expectedAction || ''),
      req.dashboardUser || 'dashboard',
      fields.note || '',
    );
    return sendJson(res, 200, {
      ok: true,
      job,
      automation: automationSummary(),
    });
  } catch (error) {
    return sendJson(res, /not found/i.test(error.message) ? 404 : 409, {
      ok: false,
      error: 'adjudication_failed',
      message: error.message,
    });
  }
}

async function handleAutomationRerouteApply(req, res, jobId) {
  let fields;
  try {
    fields = await readJsonRequest(req);
  } catch (error) {
    return sendJson(res, error.responseStatus || 400, {
      ok: false,
      error: error.apiError || 'invalid_body',
      message: error.message,
    });
  }
  try {
    const result = applyAutomationReroute(
      jobId,
      req.dashboardUser || 'dashboard',
      fields.note || '',
    );
    return sendJson(res, 202, {
      ok: true,
      ...result,
      automation: automationSummary(),
      message: 'Draft rerouted and a new shadow review was started.',
    });
  } catch (error) {
    return sendJson(res, /not found/i.test(error.message) ? 404 : 409, {
      ok: false,
      error: 'reroute_apply_failed',
      message: error.message,
    });
  }
}

function handleAutomationPromotionApproval(req, res) {
  try {
    const result = approveAutomationPublication(req.dashboardUser || 'dashboard');
    return sendJson(res, 200, {
      ok: true,
      ...result,
      automation: automationSummary(),
    });
  } catch (error) {
    return sendJson(res, error.code === 'PROMOTION_GATE_BLOCKED' ? 409 : 400, {
      ok: false,
      error: error.code || 'promotion_approval_failed',
      message: error.message,
      gate: error.gate || null,
    });
  }
}

function handleAutomationLlmHealthRun(req, res) {
  const child = spawn(process.execPath, [
    path.join(ROOT, 'scripts/check_dashboard_llm_health.mjs'),
  ], {
    cwd: ROOT,
    env: { ...process.env, ROOT },
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  return sendJson(res, 202, {
    ok: true,
    pid: child.pid,
    message: 'LLM health check started.',
  });
}

async function handleRejectDraft(req, res, draftId) {
  let fields;
  try {
    fields = await readJsonRequest(req);
  } catch (error) {
    return sendJson(res, error.responseStatus || 400, {
      ok: false,
      error: error.apiError || 'invalid_body',
      message: error.message,
    });
  }

  const draft = listInboxDrafts().find((item) => item.id === draftId);
  if (!draft) {
    return sendJson(res, 404, { ok: false, error: 'draft_missing', message: `Draft not found: ${draftId}` });
  }
  if (draft.status !== 'pending') {
    return sendJson(res, 409, {
      ok: false,
      error: 'draft_not_pending',
      message: `Only pending drafts can be rejected. Current status: ${draft.status}`,
    });
  }

  try {
    rejectDraft(draftId, {
      rejectedBy: String(fields.rejectedBy || USERNAME || process.env.USER || 'dashboard').trim(),
      reviewNote: String(fields.reviewNote || 'Rejected from dashboard').trim(),
    });
    return sendJson(res, 200, {
      ok: true,
      draftId,
      status: 'rejected',
      kbNamespace: draft.kbNamespace,
      message: 'Draft rejected.',
    });
  } catch (error) {
    return sendJson(res, 400, { ok: false, error: 'draft_reject_failed', message: error.message });
  }
}

async function handlePromoteDraft(req, res, draftId) {
  let body = Buffer.alloc(0);
  if (!['POST', 'PUT'].includes(req.method)) {
    return sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  try {
    body = await readBody(req);
  } catch (error) {
    return sendJson(res, error.code === 'BODY_TOO_LARGE' ? 413 : 400, {
      ok: false,
      error: 'invalid_body',
      message: error.message,
    });
  }

  let fields = {};
  if (body.length) {
    try {
      fields = JSON.parse(body.toString('utf8'));
    } catch (error) {
      return sendJson(res, 400, { ok: false, error: 'invalid_json', message: error.message });
    }
  }

  const draft = listInboxDrafts().find((item) => item.id === draftId);
  if (!draft) {
    return sendJson(res, 404, { ok: false, error: 'draft_missing', message: `Draft not found: ${draftId}` });
  }
  if (draft.status !== 'pending') {
    return sendJson(res, 409, {
      ok: false,
      error: 'draft_not_pending',
      message: `Only pending drafts can be promoted from the dashboard. Current status: ${draft.status}`,
    });
  }

  try {
    const result = promoteDraft(draftId, {
      promotedBy: String(fields.promotedBy || USERNAME || process.env.USER || 'dashboard').trim(),
      reviewNote: String(fields.reviewNote || 'Approved from dashboard').trim(),
    });
    return sendJson(res, 200, {
      ok: true,
      draftId,
      status: 'promoted',
      kbNamespace: result.promoted.kbNamespace,
      promotedJsonPath: result.registryEntry.promotedJsonPath,
      promotedMarkdownPath: result.registryEntry.promotedMarkdownPath,
      message: 'Draft promoted. Export/build still needs to be run separately.',
    });
  } catch (error) {
    return sendJson(res, 400, { ok: false, error: 'draft_promote_failed', message: error.message });
  }
}

async function readJsonRequest(req) {
  let body = Buffer.alloc(0);
  try {
    body = await readBody(req);
  } catch (error) {
    error.responseStatus = error.code === 'BODY_TOO_LARGE' ? 413 : 400;
    throw error;
  }
  if (!body.length) return {};
  try {
    return JSON.parse(body.toString('utf8'));
  } catch (error) {
    error.responseStatus = 400;
    error.apiError = 'invalid_json';
    throw error;
  }
}

function buildPreflight(draftOrNamespace) {
  const draft = typeof draftOrNamespace === 'string' ? null : draftOrNamespace;
  const kbNamespace = typeof draftOrNamespace === 'string' ? draftOrNamespace : draftOrNamespace?.kbNamespace;
  const checks = [];
  function add(name, ok, message) {
    checks.push({ name, ok, message });
  }
  function addWritablePath(name, filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.accessSync(filePath, fs.constants.W_OK);
        add(name, true, filePath);
        return;
      }
      fs.accessSync(path.dirname(filePath), fs.constants.W_OK);
      add(name, true, `${filePath} can be created`);
    } catch (error) {
      add(name, false, `${filePath}: ${error.message}`);
    }
  }
  function addAtomicWritablePath(name, filePath) {
    try {
      assertAtomicWriteAccess(filePath, { readable: true });
      add(name, true, fs.existsSync(filePath) ? `${filePath} can be atomically replaced` : `${filePath} can be created`);
    } catch (error) {
      add(name, false, `${filePath}: ${error.message}`);
    }
  }
  function addReadableTree(name, dirPath, limit = 5000) {
    let checked = 0;
    const failures = [];
    function visit(currentPath) {
      if (failures.length >= 5 || checked >= limit) return;
      checked += 1;
      let stat;
      try {
        stat = fs.statSync(currentPath);
        fs.accessSync(currentPath, stat.isDirectory() ? fs.constants.R_OK | fs.constants.X_OK : fs.constants.R_OK);
      } catch (error) {
        failures.push(`${currentPath}: ${error.message}`);
        return;
      }
      if (!stat.isDirectory()) return;
      let entries = [];
      try {
        entries = fs.readdirSync(currentPath);
      } catch (error) {
        failures.push(`${currentPath}: ${error.message}`);
        return;
      }
      for (const entry of entries) visit(path.join(currentPath, entry));
    }

    if (!fs.existsSync(dirPath)) {
      add(name, false, `${dirPath}: missing`);
      return;
    }
    visit(dirPath);
    add(name, failures.length === 0, failures.length ? failures.join('; ') : `${dirPath} readable (${checked} paths checked)`);
  }

  if (draft) add('draft_status', ['pending', 'promoted'].includes(draft.status), `Draft status is ${draft.status}`);
  if (!TARGET_KBS[kbNamespace]) add('kb_namespace', false, `Unsupported kbNamespace: ${kbNamespace}`);
  try {
    fs.mkdirSync(ACTION_ROOT, { recursive: true });
    fs.accessSync(ACTION_ROOT, fs.constants.W_OK);
    add('action_log_dir', true, ACTION_ROOT);
  } catch (error) {
    add('action_log_dir', false, error.message);
  }

  const promotedRoot = path.join(ROOT, 'docs/reference/knowledge_inbox/promoted');
  try {
    fs.accessSync(promotedRoot, fs.constants.W_OK);
    add('promoted_dir', true, promotedRoot);
  } catch (error) {
    add('promoted_dir', false, error.message);
  }
  if (draft?.status === 'promoted') {
    const promotedKbDir = path.join(promotedRoot, kbNamespace);
    try {
      fs.accessSync(promotedKbDir, fs.constants.W_OK);
      add('promoted_kb_dir', true, promotedKbDir);
    } catch (error) {
      add('promoted_kb_dir', false, `${promotedKbDir}: ${error.message}`);
    }
    for (const relativePath of [
      draft.registryEntry?.promotedJsonPath,
      draft.registryEntry?.promotedMarkdownPath,
    ].filter(Boolean)) {
      const promotedPath = path.join(ROOT, relativePath);
      try {
        fs.accessSync(promotedPath, fs.constants.R_OK | fs.constants.W_OK);
        add(`promoted_file:${path.basename(promotedPath)}`, true, promotedPath);
      } catch (error) {
        add(`promoted_file:${path.basename(promotedPath)}`, false, `${promotedPath}: ${error.message}`);
      }
    }
  }
  const withdrawnRoot = path.join(ROOT, 'docs/reference/knowledge_inbox/withdrawn');
  try {
    fs.mkdirSync(withdrawnRoot, { recursive: true });
    fs.accessSync(withdrawnRoot, fs.constants.W_OK);
    add('withdrawn_dir', true, withdrawnRoot);
  } catch (error) {
    add('withdrawn_dir', false, error.message);
  }
  addAtomicWritablePath('knowledge_inbox_registry', path.join(ROOT, 'docs/reference/knowledge_inbox/registry.json'));

  const registry = loadKbRegistry();
  const registryEntry = registry.entries.find((entry) => entry.namespace === kbNamespace);
  const exportDir = registryEntry?.exportDir ? path.join(ROOT, registryEntry.exportDir) : '';
  if (exportDir) {
    try {
      fs.accessSync(exportDir, fs.constants.W_OK);
      add('export_dir', true, exportDir);
    } catch (error) {
      add('export_dir', false, error.message);
    }
  } else {
    add('export_dir', false, `No dashboard registry exportDir for ${kbNamespace}`);
  }

  for (const reportPath of [
    path.join(ROOT, REPORTS.quality.jsonPath),
    path.join(ROOT, REPORTS.quality.mdPath),
    path.join(ROOT, REPORTS.erp_20q.jsonPath),
    path.join(ROOT, REPORTS.erp_20q.mdPath),
    path.join(ROOT, REPORTS.freshness.jsonPath),
    path.join(ROOT, REPORTS.freshness.mdPath),
  ]) {
    const reportName = path.basename(reportPath);
    addAtomicWritablePath(`pipeline_report:${reportName}`, reportPath);
  }
  for (const relativePath of SOURCE_REGISTRY_WRITES[kbNamespace] || []) {
    addWritablePath(`source_registry:${path.basename(relativePath)}`, path.join(ROOT, relativePath));
  }

  for (const sourceRoot of SOURCE_FRESHNESS_ROOTS) {
    addReadableTree(`freshness_source:${sourceRoot}`, path.join(ROOT, sourceRoot));
  }

  const hasEnvCookie = Boolean(String(process.env.OPENSPG_COOKIE || '').trim());
  const cookieFile = String(DEFAULT_OPENSPG_COOKIE_FILE || '').trim();
  if (hasEnvCookie) {
    add('openspg_cookie', true, 'OPENSPG_COOKIE is set');
  } else {
    try {
      const stat = fs.statSync(cookieFile);
      fs.accessSync(cookieFile, fs.constants.R_OK);
      add('openspg_cookie_file', stat.size > 0, `${cookieFile} (${stat.size} bytes)`);
    } catch (error) {
      add('openspg_cookie_file', false, `${cookieFile}: ${error.message}`);
    }
  }

  return {
    ok: checks.every((check) => check.ok),
    checks,
  };
}

function startApproveBuildAction(draft, fields = {}, preflight = null) {
  const now = new Date().toISOString();
  const actionId = `action_${todayStamp()}_${randomUUID().slice(0, 8)}_approve_build`;
  const operator = String(fields.promotedBy || USERNAME || process.env.USER || 'dashboard').trim();
  const reviewNote = String(fields.reviewNote || 'Approved, exported, and built from dashboard').trim();
  const args = [
    'scripts/process_knowledge_inbox.mjs',
    '--promote',
    draft.id,
    '--export',
    '--build',
    '--freshness',
    '--by',
    operator,
    '--note',
    reviewNote,
  ];
  const action = {
    id: actionId,
    type: 'approve_export_build',
    status: 'RUNNING',
    draftId: draft.id,
    title: draft.title,
    kbNamespace: draft.kbNamespace,
    kbName: draft.kbName,
    operator,
    reviewNote,
    command: [process.execPath, ...args].join(' '),
    createdAt: now,
    startedAt: now,
    finishedAt: '',
    exitCode: null,
    error: '',
  };
  saveAction(action);
  appendActionLog(actionId, [
    `[${now}] Starting dashboard approve pipeline`,
    `Draft: ${draft.id}`,
    `KB: ${draft.kbNamespace}`,
    'Pipeline: promote -> export -> OpenSPG build -> quality gate -> 20Q testpack -> freshness report',
    `Command: ${action.command}`,
    `OPENSPG_COOKIE_FILE: ${DEFAULT_OPENSPG_COOKIE_FILE}`,
    preflight ? `Preflight: ${preflight.ok ? 'OK' : 'FAIL'}` : '',
    preflight ? preflight.checks.map((check) => `  - ${check.ok ? 'OK' : 'FAIL'} ${check.name}: ${check.message}`).join('\n') : '',
    '',
  ].join('\n'));

  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    env: {
      ...process.env,
      ROOT,
      OPENSPG_COOKIE_FILE: DEFAULT_OPENSPG_COOKIE_FILE,
    },
  });

  child.stdout.on('data', (chunk) => appendActionLog(actionId, chunk.toString('utf8')));
  child.stderr.on('data', (chunk) => appendActionLog(actionId, chunk.toString('utf8')));
  child.on('error', (error) => {
    const current = readAction(actionId) || action;
    const finishedAt = new Date().toISOString();
    appendActionLog(actionId, `[${finishedAt}] ERROR ${error.message}\n`);
    saveAction({
      ...current,
      status: 'FAIL',
      finishedAt,
      error: error.message,
    });
  });
  child.on('close', (code) => {
    const current = readAction(actionId) || action;
    const finishedAt = new Date().toISOString();
    appendActionLog(actionId, `[${finishedAt}] Finished with exit code ${code}\n`);
    saveAction({
      ...current,
      status: code === 0 ? 'FINISH' : 'FAIL',
      finishedAt,
      exitCode: code,
      error: code === 0 ? '' : `Process exited with ${code}`,
    });
  });

  return action;
}

function startBulkApproveBuildAction(drafts, fields = {}, preflightByNamespace = {}) {
  const now = new Date().toISOString();
  const actionId = `action_${todayStamp()}_${randomUUID().slice(0, 8)}_bulk_approve_build`;
  const operator = String(fields.promotedBy || fields.operator || USERNAME || process.env.USER || 'dashboard').trim();
  const reviewNote = String(fields.reviewNote || `Bulk approved ${drafts.length} drafts from dashboard`).trim();
  const draftIds = drafts.map((draft) => draft.id);
  const namespaces = [...new Set(drafts.map((draft) => draft.kbNamespace))].sort();
  const args = [
    'scripts/process_knowledge_inbox.mjs',
    '--promote',
    draftIds.join(','),
    '--export',
    '--build',
    '--freshness',
    '--by',
    operator,
    '--note',
    reviewNote,
  ];
  const action = {
    id: actionId,
    type: 'bulk_approve_export_build',
    status: 'RUNNING',
    draftId: draftIds.join(','),
    draftIds,
    title: `Approve ${drafts.length} selected drafts`,
    kbNamespace: namespaces.join(','),
    kbName: namespaces.map((namespace) => TARGET_KBS[namespace]?.kbName || namespace).join(', '),
    operator,
    reviewNote,
    command: [process.execPath, ...args].join(' '),
    createdAt: now,
    startedAt: now,
    finishedAt: '',
    exitCode: null,
    error: '',
  };
  saveAction(action);
  appendActionLog(actionId, [
    `[${now}] Starting dashboard bulk approve pipeline`,
    `Drafts: ${draftIds.length}`,
    `KB namespaces: ${namespaces.join(', ')}`,
    'Pipeline: promote selected -> export affected KBs -> OpenSPG build -> quality gate -> 20Q testpack -> freshness report',
    `Command: ${action.command}`,
    `OPENSPG_COOKIE_FILE: ${DEFAULT_OPENSPG_COOKIE_FILE}`,
    ...Object.entries(preflightByNamespace).map(([namespace, preflight]) => [
      `Preflight ${namespace}: ${preflight.ok ? 'OK' : 'FAIL'}`,
      preflight.checks.map((check) => `  - ${check.ok ? 'OK' : 'FAIL'} ${check.name}: ${check.message}`).join('\n'),
    ].join('\n')),
    '',
  ].join('\n'));

  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    env: {
      ...process.env,
      ROOT,
      OPENSPG_COOKIE_FILE: DEFAULT_OPENSPG_COOKIE_FILE,
    },
  });

  child.stdout.on('data', (chunk) => appendActionLog(actionId, chunk.toString('utf8')));
  child.stderr.on('data', (chunk) => appendActionLog(actionId, chunk.toString('utf8')));
  child.on('error', (error) => {
    const current = readAction(actionId) || action;
    const finishedAt = new Date().toISOString();
    appendActionLog(actionId, `[${finishedAt}] ERROR ${error.message}\n`);
    saveAction({
      ...current,
      status: 'FAIL',
      finishedAt,
      error: error.message,
    });
  });
  child.on('close', (code) => {
    const current = readAction(actionId) || action;
    const finishedAt = new Date().toISOString();
    appendActionLog(actionId, `[${finishedAt}] Finished with exit code ${code}\n`);
    saveAction({
      ...current,
      status: code === 0 ? 'FINISH' : 'FAIL',
      finishedAt,
      exitCode: code,
      error: code === 0 ? '' : `Process exited with ${code}`,
    });
  });

  return action;
}

function startKbBuildAction(kbNamespace, fields = {}, preflight = null, options = {}) {
  const now = new Date().toISOString();
  const actionId = `action_${todayStamp()}_${randomUUID().slice(0, 8)}_${options.type || 'build_kb'}`;
  const operator = String(fields.operator || fields.promotedBy || USERNAME || process.env.USER || 'dashboard').trim();
  const reviewNote = String(fields.reviewNote || options.reviewNote || 'Export and build from dashboard').trim();
  const args = [
    'scripts/process_knowledge_inbox.mjs',
    '--kb',
    kbNamespace,
    '--export',
    '--build',
    '--freshness',
    '--by',
    operator,
    '--note',
    reviewNote,
  ];
  const forceFiles = options.forcePromotedFiles ? (PROMOTED_FORCE_FILES[kbNamespace] || []) : [];
  const action = {
    id: actionId,
    type: options.type || 'build_kb',
    status: 'RUNNING',
    draftId: options.draftId || '',
    title: options.title || `Build ${kbNamespace}`,
    kbNamespace,
    kbName: TARGET_KBS[kbNamespace]?.kbName || kbNamespace,
    operator,
    reviewNote,
    command: [process.execPath, ...args].join(' '),
    createdAt: now,
    startedAt: now,
    finishedAt: '',
    exitCode: null,
    error: '',
    forceFiles,
  };
  saveAction(action);
  appendActionLog(actionId, [
    `[${now}] Starting dashboard KB build pipeline`,
    `KB: ${kbNamespace}`,
    `Pipeline: export -> OpenSPG build -> quality gate -> 20Q testpack -> freshness report`,
    forceFiles.length ? `OPENSPG_FORCE_FILES: ${forceFiles.join(',')}` : 'OPENSPG_FORCE_FILES: default',
    `Command: ${action.command}`,
    `OPENSPG_COOKIE_FILE: ${DEFAULT_OPENSPG_COOKIE_FILE}`,
    preflight ? `Preflight: ${preflight.ok ? 'OK' : 'FAIL'}` : '',
    preflight ? preflight.checks.map((check) => `  - ${check.ok ? 'OK' : 'FAIL'} ${check.name}: ${check.message}`).join('\n') : '',
    '',
  ].join('\n'));

  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    env: {
      ...process.env,
      ROOT,
      OPENSPG_COOKIE_FILE: DEFAULT_OPENSPG_COOKIE_FILE,
      ...(forceFiles.length ? { OPENSPG_FORCE_FILES: forceFiles.join(',') } : {}),
    },
  });

  child.stdout.on('data', (chunk) => appendActionLog(actionId, chunk.toString('utf8')));
  child.stderr.on('data', (chunk) => appendActionLog(actionId, chunk.toString('utf8')));
  child.on('error', (error) => {
    const current = readAction(actionId) || action;
    const finishedAt = new Date().toISOString();
    appendActionLog(actionId, `[${finishedAt}] ERROR ${error.message}\n`);
    saveAction({
      ...current,
      status: 'FAIL',
      finishedAt,
      error: error.message,
    });
  });
  child.on('close', (code) => {
    const current = readAction(actionId) || action;
    const finishedAt = new Date().toISOString();
    appendActionLog(actionId, `[${finishedAt}] Finished with exit code ${code}\n`);
    saveAction({
      ...current,
      status: code === 0 ? 'FINISH' : 'FAIL',
      finishedAt,
      exitCode: code,
      error: code === 0 ? '' : `Process exited with ${code}`,
    });
  });

  return action;
}

function startSourceScanAction(sourceId = '', fields = {}) {
  const now = new Date().toISOString();
  const allSources = !sourceId;
  const actionId = `action_${todayStamp()}_${randomUUID().slice(0, 8)}_${allSources ? 'scan_sources' : 'scan_source'}`;
  const args = [
    SOURCE_SCAN_SCRIPT,
    ...(allSources ? ['--all'] : ['--source', sourceId]),
    '--create-drafts',
  ];
  const action = {
    id: actionId,
    type: allSources ? 'scan_sources' : 'scan_source',
    status: 'RUNNING',
    draftId: '',
    sourceId,
    title: allSources ? 'Scan all dashboard sources' : `Scan dashboard source ${sourceId}`,
    kbNamespace: fields.kbNamespace || '',
    kbName: '',
    operator: String(fields.operator || USERNAME || process.env.USER || 'dashboard').trim(),
    command: [process.execPath, ...args].join(' '),
    createdAt: now,
    startedAt: now,
    finishedAt: '',
    exitCode: null,
    error: '',
  };
  saveAction(action);
  appendActionLog(actionId, [
    `[${now}] Starting dashboard source scan`,
    `Source: ${allSources ? 'all enabled sources' : sourceId}`,
    'Pipeline: discover -> fetch -> deduplicate -> pending drafts',
    `Command: ${action.command}`,
    '',
  ].join('\n'));

  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    env: {
      ...process.env,
      ROOT,
    },
  });

  child.stdout.on('data', (chunk) => appendActionLog(actionId, chunk.toString('utf8')));
  child.stderr.on('data', (chunk) => appendActionLog(actionId, chunk.toString('utf8')));
  child.on('error', (error) => {
    const current = readAction(actionId) || action;
    const finishedAt = new Date().toISOString();
    appendActionLog(actionId, `[${finishedAt}] ERROR ${error.message}\n`);
    saveAction({
      ...current,
      status: 'FAIL',
      finishedAt,
      error: error.message,
    });
  });
  child.on('close', (code) => {
    const current = readAction(actionId) || action;
    const finishedAt = new Date().toISOString();
    appendActionLog(actionId, `[${finishedAt}] Finished with exit code ${code}\n`);
    saveAction({
      ...current,
      status: code === 0 ? 'FINISH' : 'FAIL',
      finishedAt,
      exitCode: code,
      error: code === 0 ? '' : `Process exited with ${code}`,
    });
  });

  return action;
}

function startDiscoveryAction(mode, fields = {}) {
  const now = new Date().toISOString();
  const weekly = mode === 'weekly';
  const createDrafts = !weekly && fields.createDrafts === true;
  const actionId = `action_${todayStamp()}_${randomUUID().slice(0, 8)}_discovery_${mode}`;
  const limit = Math.max(1, Math.min(10, Number(fields.limit) || 3));
  const args = [
    DISCOVERY_SCRIPT,
    weekly ? '--weekly' : '--daily',
    ...(weekly ? [] : [createDrafts ? '--create-drafts' : '--dry-run', '--limit', String(limit)]),
  ];
  const action = {
    id: actionId,
    type: `discovery_${mode}`,
    status: 'RUNNING',
    draftId: '',
    sourceId: '',
    title: weekly ? 'Plan weekly KB discovery queries' : 'Run daily KB source discovery',
    kbNamespace: '',
    kbName: '',
    operator: String(fields.operator || USERNAME || process.env.USER || 'dashboard').trim(),
    command: [process.execPath, ...args].join(' '),
    dryRun: weekly || !createDrafts,
    createdAt: now,
    startedAt: now,
    finishedAt: '',
    exitCode: null,
    error: '',
  };
  saveAction(action);
  appendActionLog(actionId, [
    `[${now}] Starting ${weekly ? 'weekly query planning' : 'daily source discovery'}`,
    `Mode: ${weekly ? 'planner' : action.dryRun ? 'dry-run' : 'draft creation requested'}`,
    'Safety: discovery never publishes or builds a KB',
    `Command: ${action.command}`,
    '',
  ].join('\n'));

  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    env: { ...process.env, ROOT },
  });
  child.stdout.on('data', (chunk) => appendActionLog(actionId, chunk.toString('utf8')));
  child.stderr.on('data', (chunk) => appendActionLog(actionId, chunk.toString('utf8')));
  child.on('error', (error) => {
    const current = readAction(actionId) || action;
    const finishedAt = new Date().toISOString();
    appendActionLog(actionId, `[${finishedAt}] ERROR ${error.message}\n`);
    saveAction({ ...current, status: 'FAIL', finishedAt, error: error.message });
  });
  child.on('close', (code) => {
    const current = readAction(actionId) || action;
    const finishedAt = new Date().toISOString();
    appendActionLog(actionId, `[${finishedAt}] Finished with exit code ${code}\n`);
    saveAction({
      ...current,
      status: code === 0 ? 'FINISH' : 'FAIL',
      finishedAt,
      exitCode: code,
      error: code === 0 ? '' : `Process exited with ${code}`,
    });
  });
  return action;
}

async function handleDiscoveryRun(req, res) {
  try {
    const fields = await readJsonRequest(req);
    const mode = fields.mode === 'weekly' ? 'weekly' : 'daily';
    if ((mode === 'weekly' || fields.createDrafts === true) && req.dashboardRole !== 'admin') {
      return sendJson(res, 403, {
        ok: false,
        error: 'forbidden',
        message: 'Admin role is required for weekly planning or automatic draft creation.',
      });
    }
    const running = listActions(100).find((action) => (
      action.status === 'RUNNING' && action.type === `discovery_${mode}`
    ));
    if (running) {
      return sendJson(res, 409, {
        ok: false,
        error: 'action_already_running',
        message: `A ${mode} discovery action is already running.`,
        actionId: running.id,
      });
    }
    const action = startDiscoveryAction(mode, {
      ...fields,
      operator: req.dashboardUser || 'dashboard',
    });
    return sendJson(res, 202, {
      ok: true,
      actionId: action.id,
      status: action.status,
      dryRun: action.dryRun,
    });
  } catch (error) {
    return sendJson(res, error.responseStatus || 400, {
      ok: false,
      error: 'discovery_run_failed',
      message: error.message,
    });
  }
}

async function handleDiscoveryPolicy(req, res) {
  try {
    const fields = await readJsonRequest(req);
    const patch = {};
    for (const key of [
      'enabled',
      'dryRun',
      'dailyDraftLimitPerKb',
      'weeklyDraftLimitPerKb',
      'calibrationTarget',
      'globalSearchLimit',
      'generatedQueriesPerKb',
      'generatedQueryTtlDays',
      'emptyRunRetirementThreshold',
      'lowValueRetirementThreshold',
      'highDuplicateRate',
      'officialConfidence',
      'communityConfidence',
      'professionalConfidence',
      'semiAutoEnabled',
      'semiAutoMinReviews',
      'semiAutoMinAgreement',
      'semiAutoMaxFalsePositiveRate',
      'semiAutoMinConfidence',
      'semiAutoMinObservationDays',
      'semiAutoMaxPerRun',
      'semiAutoAllowedNamespaces',
    ]) {
      if (Object.hasOwn(fields, key)) patch[key] = fields[key];
    }
    const policy = saveDiscoveryPolicy(patch, req.dashboardUser || 'dashboard');
    return sendJson(res, 200, { ok: true, policy });
  } catch (error) {
    return sendJson(res, 400, {
      ok: false,
      error: 'discovery_policy_update_failed',
      message: error.message,
    });
  }
}

async function handleDiscoveryQuery(req, res, queryId) {
  try {
    const fields = await readJsonRequest(req);
    const query = setDiscoveryQueryEnabled(queryId, fields.enabled !== false, req.dashboardUser || 'dashboard');
    return sendJson(res, 200, { ok: true, query });
  } catch (error) {
    return sendJson(res, /not found/i.test(error.message) ? 404 : 400, {
      ok: false,
      error: 'discovery_query_update_failed',
      message: error.message,
    });
  }
}

async function handleDiscoveryCandidate(req, res, candidateId, decision) {
  try {
    const fields = await readJsonRequest(req);
    const operator = req.dashboardUser || 'dashboard';
    const candidate = decision === 'draft'
      ? await createDraftFromDiscoveryCandidate(candidateId, operator, fields.note || '')
      : decision === 'route'
        ? routeDiscoveryCandidate(candidateId, operator, fields.note || '')
        : rejectDiscoveryCandidate(candidateId, operator, fields.note || '');
    refreshDiscoveryReport();
    return sendJson(res, 200, { ok: true, candidate });
  } catch (error) {
    return sendJson(res, /not found/i.test(error.message) ? 404 : 409, {
      ok: false,
      error: 'discovery_candidate_update_failed',
      message: error.message,
    });
  }
}

async function handleDiscoveryCandidateUndo(req, res, candidateId) {
  try {
    const candidate = undoDiscoveryCandidate(candidateId, req.dashboardUser || 'dashboard');
    const report = refreshDiscoveryReport();
    return sendJson(res, 200, { ok: true, candidate, report });
  } catch (error) {
    return sendJson(res, /not found/i.test(error.message) ? 404 : 409, {
      ok: false,
      error: 'discovery_candidate_undo_failed',
      message: error.message,
    });
  }
}

async function handleDiscoveryCandidateBulk(req, res) {
  try {
    const fields = await readJsonRequest(req);
    const result = await bulkDecideDiscoveryCandidates(
      fields.candidateIds,
      fields.decision,
      req.dashboardUser || 'dashboard',
      fields.note || '',
    );
    const report = refreshDiscoveryReport();
    return sendJson(res, result.failed ? 207 : 200, { ok: result.failed === 0, result, report });
  } catch (error) {
    return sendJson(res, 400, {
      ok: false,
      error: 'discovery_candidate_bulk_failed',
      message: error.message,
    });
  }
}

async function handleDismissAction(req, res, actionId) {
  const action = readAction(actionId);
  if (!action) {
    return sendJson(res, 404, { ok: false, error: 'action_missing', message: `Action not found: ${actionId}` });
  }
  if (!['FAIL', 'ERROR'].includes(action.status)) {
    return sendJson(res, 409, {
      ok: false,
      error: 'action_not_failed',
      message: `Only FAIL or ERROR actions can be dismissed. Current status: ${action.status}`,
    });
  }
  saveAction({ ...action, status: 'REMEDIATED', dismissedAt: new Date().toISOString() });
  return sendJson(res, 200, { ok: true, actionId, status: 'REMEDIATED', message: 'Action dismissed.' });
}

async function handleCreateSource(req, res) {
  let fields;
  try {
    fields = await readJsonRequest(req);
    const source = createSource(fields);
    return sendJson(res, 201, { ok: true, source });
  } catch (error) {
    return sendJson(res, error.responseStatus || 400, {
      ok: false,
      error: error.apiError || 'source_create_failed',
      message: error.message,
    });
  }
}

async function handleUpdateSource(req, res, sourceId) {
  let fields;
  try {
    fields = await readJsonRequest(req);
    const source = updateSource(sourceId, fields);
    return sendJson(res, 200, { ok: true, source });
  } catch (error) {
    return sendJson(res, error.responseStatus || 400, {
      ok: false,
      error: error.apiError || 'source_update_failed',
      message: error.message,
    });
  }
}

async function handleDeleteSource(req, res, sourceId) {
  try {
    const source = deleteSource(sourceId);
    return sendJson(res, 200, { ok: true, source });
  } catch (error) {
    return sendJson(res, 400, { ok: false, error: 'source_delete_failed', message: error.message });
  }
}

async function handleScanSource(req, res, sourceId = '') {
  let fields = {};
  try {
    fields = await readJsonRequest(req);
  } catch (error) {
    return sendJson(res, error.responseStatus || 400, {
      ok: false,
      error: error.apiError || 'invalid_body',
      message: error.message,
    });
  }
  const running = listActions(100).find((action) => (
    action.status === 'RUNNING'
    && (action.type === 'scan_sources' || (sourceId && action.type === 'scan_source' && action.sourceId === sourceId))
  ));
  if (running) {
    return sendJson(res, 409, {
      ok: false,
      error: 'action_already_running',
      message: sourceId ? `A scan is already running for source: ${sourceId}` : 'A source scan is already running',
      actionId: running.id,
    });
  }
  if (sourceId && !listSources().some((source) => source.id === sourceId)) {
    return sendJson(res, 404, { ok: false, error: 'source_missing', message: `Source not found: ${sourceId}` });
  }
  const action = startSourceScanAction(sourceId, fields);
  return sendJson(res, 202, {
    ok: true,
    actionId: action.id,
    status: action.status,
    sourceId,
    message: 'Source scan action started.',
  });
}

async function handlePromoteExportDraft(req, res, draftId) {
  let fields;
  try {
    fields = await readJsonRequest(req);
  } catch (error) {
    return sendJson(res, error.responseStatus || 400, {
      ok: false,
      error: error.apiError || 'invalid_body',
      message: error.message,
    });
  }

  const draft = listInboxDrafts().find((item) => item.id === draftId);
  if (!draft) {
    return sendJson(res, 404, { ok: false, error: 'draft_missing', message: `Draft not found: ${draftId}` });
  }
  const reusableAction = reusableDraftApprovalAction(draft, listActions(100));
  if (reusableAction) {
    const running = reusableAction.status === 'RUNNING';
    return sendJson(res, running ? 202 : 200, {
      ok: true,
      reused: true,
      actionId: reusableAction.id,
      status: reusableAction.status,
      draftId,
      kbNamespace: draft.kbNamespace,
      message: running
        ? 'Approve/export/build action is already running.'
        : 'Draft is already promoted and its approve/export/build action finished.',
    });
  }
  if (draft.status !== 'pending') {
    return sendJson(res, 409, {
      ok: false,
      error: 'draft_not_pending',
      message: `Only pending drafts can be promoted and exported. Current status: ${draft.status}`,
    });
  }

  const preflight = buildPreflight(draft);
  if (!preflight.ok) {
    return sendJson(res, 422, {
      ok: false,
      error: 'preflight_failed',
      message: 'Dashboard approve/build preflight failed',
      preflight,
    });
  }

  const action = startApproveBuildAction(draft, fields, preflight);
  return sendJson(res, 202, {
    ok: true,
    actionId: action.id,
    status: action.status,
    draftId,
    kbNamespace: draft.kbNamespace,
    message: 'Approve/export/build action started.',
    preflight,
  });
}

async function handleBulkPromoteExportDrafts(req, res) {
  let fields;
  try {
    fields = await readJsonRequest(req);
  } catch (error) {
    return sendJson(res, error.responseStatus || 400, {
      ok: false,
      error: error.apiError || 'invalid_body',
      message: error.message,
    });
  }

  const draftIds = [...new Set((Array.isArray(fields.draftIds) ? fields.draftIds : [])
    .map((draftId) => String(draftId || '').trim())
    .filter(Boolean))];
  if (!draftIds.length) {
    return sendJson(res, 400, { ok: false, error: 'missing_draft_ids', message: 'draftIds is required' });
  }
  if (draftIds.length > 50) {
    return sendJson(res, 400, { ok: false, error: 'too_many_drafts', message: 'At most 50 drafts can be approved at once' });
  }

  const allDrafts = listInboxDrafts();
  const drafts = draftIds.map((draftId) => allDrafts.find((item) => item.id === draftId)).filter(Boolean);
  const foundIds = new Set(drafts.map((draft) => draft.id));
  const missingIds = draftIds.filter((draftId) => !foundIds.has(draftId));
  if (missingIds.length) {
    return sendJson(res, 404, {
      ok: false,
      error: 'draft_missing',
      message: `Drafts not found: ${missingIds.join(', ')}`,
      missingIds,
    });
  }

  const nonPending = drafts.filter((draft) => draft.status !== 'pending');
  if (nonPending.length) {
    return sendJson(res, 409, {
      ok: false,
      error: 'draft_not_pending',
      message: `Only pending drafts can be bulk approved. Non-pending: ${nonPending.map((draft) => `${draft.id}:${draft.status}`).join(', ')}`,
      nonPending: nonPending.map((draft) => ({ id: draft.id, status: draft.status })),
    });
  }

  const namespaces = [...new Set(drafts.map((draft) => draft.kbNamespace))].sort();
  const runningForKb = listActions(100).find((action) => (
    action.status === 'RUNNING'
    && ['withdraw_promoted_build', 'build_kb', 'approve_export_build', 'bulk_approve_export_build'].includes(action.type)
    && namespaces.some((namespace) => String(action.kbNamespace || '').split(',').map((item) => item.trim()).includes(namespace))
  ));
  if (runningForKb) {
    return sendJson(res, 409, {
      ok: false,
      error: 'action_already_running',
      message: `A build-related action is already running for selected KBs: ${runningForKb.id}`,
      actionId: runningForKb.id,
    });
  }

  const preflightByNamespace = Object.fromEntries(namespaces.map((namespace) => [namespace, buildPreflight(namespace)]));
  const failedPreflight = Object.entries(preflightByNamespace).filter(([, preflight]) => !preflight.ok);
  if (failedPreflight.length) {
    return sendJson(res, 422, {
      ok: false,
      error: 'preflight_failed',
      message: 'Dashboard bulk approve/build preflight failed',
      preflightByNamespace,
    });
  }

  if (fields.dryRun === true) {
    return sendJson(res, 200, {
      ok: true,
      dryRun: true,
      draftIds,
      kbNamespaces: namespaces,
      message: 'Bulk approve/export/build dry run passed.',
      preflightByNamespace,
    });
  }

  const action = startBulkApproveBuildAction(drafts, fields, preflightByNamespace);
  return sendJson(res, 202, {
    ok: true,
    actionId: action.id,
    status: action.status,
    draftIds,
    kbNamespaces: namespaces,
    message: 'Bulk approve/export/build action started.',
    preflightByNamespace,
  });
}

async function handleWithdrawPromotedDraft(req, res, draftId) {
  let fields;
  try {
    fields = await readJsonRequest(req);
  } catch (error) {
    return sendJson(res, error.responseStatus || 400, {
      ok: false,
      error: error.apiError || 'invalid_body',
      message: error.message,
    });
  }

  const draft = listInboxDrafts().find((item) => item.id === draftId);
  if (!draft) {
    return sendJson(res, 404, { ok: false, error: 'draft_missing', message: `Draft not found: ${draftId}` });
  }
  if (draft.status !== 'promoted') {
    return sendJson(res, 409, {
      ok: false,
      error: 'draft_not_promoted',
      message: `Only promoted drafts can be withdrawn. Current status: ${draft.status}`,
    });
  }

  const runningForDraft = listActions(100).find((action) => (
    action.draftId === draftId && ['withdraw_promoted_build', 'build_kb', 'approve_export_build'].includes(action.type) && action.status === 'RUNNING'
  ));
  if (runningForDraft) {
    return sendJson(res, 409, {
      ok: false,
      error: 'action_already_running',
      message: `A build-related action is already running for draft: ${draftId}`,
      actionId: runningForDraft.id,
    });
  }

  const preflight = buildPreflight(draft);
  if (!preflight.ok) {
    return sendJson(res, 422, {
      ok: false,
      error: 'preflight_failed',
      message: 'Dashboard withdraw/build preflight failed',
      preflight,
    });
  }

  let withdrawn;
  try {
    withdrawn = withdrawPromotedDraft(draftId, {
      withdrawnBy: String(fields.withdrawnBy || fields.operator || USERNAME || process.env.USER || 'dashboard').trim(),
      reviewNote: String(fields.reviewNote || 'Withdrawn from dashboard').trim(),
    });
  } catch (error) {
    return sendJson(res, 400, { ok: false, error: 'withdraw_failed', message: error.message });
  }

  const action = startKbBuildAction(draft.kbNamespace, fields, preflight, {
    type: 'withdraw_promoted_build',
    draftId,
    title: `Withdraw ${draft.title}`,
    reviewNote: 'Withdraw promoted draft and rebuild KB from dashboard',
    forcePromotedFiles: true,
  });
  return sendJson(res, 202, {
    ok: true,
    actionId: action.id,
    status: action.status,
    draftId,
    kbNamespace: draft.kbNamespace,
    withdrawn,
    message: 'Draft withdrawn from promoted storage. Export/build action started.',
    preflight,
  });
}

async function handleBuildKb(req, res, kbNamespace) {
  let fields;
  try {
    fields = await readJsonRequest(req);
  } catch (error) {
    return sendJson(res, error.responseStatus || 400, {
      ok: false,
      error: error.apiError || 'invalid_body',
      message: error.message,
    });
  }

  if (!TARGET_KBS[kbNamespace]) {
    return sendJson(res, 404, { ok: false, error: 'unknown_kb', message: `Unsupported kbNamespace: ${kbNamespace}` });
  }
  const runningForKb = listActions(100).find((action) => (
    action.kbNamespace === kbNamespace && ['withdraw_promoted_build', 'build_kb', 'approve_export_build'].includes(action.type) && action.status === 'RUNNING'
  ));
  if (runningForKb) {
    return sendJson(res, 409, {
      ok: false,
      error: 'action_already_running',
      message: `A build-related action is already running for KB: ${kbNamespace}`,
      actionId: runningForKb.id,
    });
  }

  const preflight = buildPreflight(kbNamespace);
  if (!preflight.ok) {
    return sendJson(res, 422, {
      ok: false,
      error: 'preflight_failed',
      message: 'Dashboard KB build preflight failed',
      preflight,
    });
  }

  const action = startKbBuildAction(kbNamespace, fields, preflight, {
    type: 'build_kb',
    title: `Build ${TARGET_KBS[kbNamespace].kbName}`,
    reviewNote: 'Export and build KB from dashboard',
    forcePromotedFiles: Boolean(fields.forcePromotedFiles),
  });
  return sendJson(res, 202, {
    ok: true,
    actionId: action.id,
    status: action.status,
    kbNamespace,
    message: 'Export/build action started.',
    preflight,
  });
}

async function handleRequest(req, res) {
  const rawUrl = new URL(req.url, 'http://dashboard.local');
  if (BASE_PATH && rawUrl.pathname === BASE_PATH && ['GET', 'HEAD'].includes(req.method)) {
    return redirect(res, relativeUrl('/'));
  }

  const route = routePath(req.url);
  if (!route) {
    return sendJson(res, 404, { ok: false, error: 'not_found', message: `Use ${BASE_PATH}/` });
  }

  const rate = rateLimit(req);
  if (!rate.ok) {
    return sendJson(res, 429, {
      ok: false,
      error: 'rate_limited',
      message: `Too many requests. Retry after ${rate.retryAfter} seconds.`,
      retryAfter: rate.retryAfter,
    });
  }

  if (route.pathname === '/health') {
    return sendJson(res, 200, { ok: true, service: 'erp-kb-dashboard', basePath: BASE_PATH });
  }

  const auth = authenticate(req);
  if (!auth.ok) {
    if (auth.reason === 'auth_not_configured') return authUnavailable(res);
    return unauthorized(res);
  }
  req.dashboardRole = auth.role;
  req.dashboardUser = auth.username;
  const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(req.method || 'GET');
  if (mutating && auth.role === 'viewer') {
    return sendJson(res, 403, {
      ok: false,
      error: 'forbidden',
      message: 'Viewer role cannot mutate dashboard state.',
    });
  }
  if (!csrfOk(req)) {
    return sendJson(res, 403, {
      ok: false,
      error: 'csrf_failed',
      message: 'Missing or invalid X-ERP-KB-CSRF token.',
    });
  }
  if (mutating) {
    const auditStartedAt = Date.now();
    res.once('finish', () => {
      try {
        appendDashboardAudit({
          actor: auth.username || 'dashboard',
          role: auth.role,
          action: 'http.mutation',
          resourceType: 'http_endpoint',
          resourceId: route.pathname,
          outcome: res.statusCode < 400 ? 'success' : 'failure',
          metadata: {
            method: req.method,
            statusCode: res.statusCode,
            durationMs: Date.now() - auditStartedAt,
            remoteAddress: req.socket.remoteAddress || '',
          },
        });
      } catch (error) {
        process.stderr.write(`Audit append failed: ${error.message}\n`);
      }
    });
  }

  if (route.pathname === '/' && req.method === 'GET') {
    return sendDashboardApp(res, '/');
  }
  if (route.pathname === '' && req.method === 'GET') {
    return redirect(res, relativeUrl('/'));
  }
  if (['GET', 'HEAD'].includes(req.method) && /^(?:\/assets\/|\/favicon\.ico|\/manifest\.json)/.test(route.pathname)) {
    return sendDashboardApp(res, route.pathname);
  }
  if (route.pathname === '/api/status' && req.method === 'GET') {
    return sendJson(res, 200, statusPayload(auth.role, auth.username));
  }
  if (route.pathname === '/api/kbs' && req.method === 'GET') {
    return sendJson(res, 200, { ok: true, ...kbsPayload() });
  }
  if (route.pathname === '/api/reports' && req.method === 'GET') {
    return sendJson(res, 200, { ok: true, reports: reportSummary() });
  }
  if (route.pathname === '/api/tools' && req.method === 'GET') {
    return sendJson(res, 200, { ok: true, tools: dashboardToolLinks() });
  }
  if (route.pathname === '/api/system' && req.method === 'GET') {
    return sendJson(res, 200, { ok: true, ...systemPayload() });
  }
  if (route.pathname === '/api/automation' && req.method === 'GET') {
    return sendJson(res, 200, { ok: true, automation: automationSummary() });
  }
  if (route.pathname === '/api/automation/config' && ['PUT', 'PATCH', 'POST'].includes(req.method)) {
    if (auth.role !== 'admin') {
      return sendJson(res, 403, {
        ok: false,
        error: 'forbidden',
        message: 'Admin role is required to change automation configuration.',
      });
    }
    return handleAutomationConfig(req, res);
  }
  if (route.pathname === '/api/automation/run' && ['POST', 'PUT'].includes(req.method)) {
    return handleAutomationRun(req, res);
  }
  if (route.pathname === '/api/automation/promotion/approve' && ['POST', 'PUT'].includes(req.method)) {
    if (auth.role !== 'admin') {
      return sendJson(res, 403, {
        ok: false,
        error: 'forbidden',
        message: 'Admin role is required to approve publication mode.',
      });
    }
    return handleAutomationPromotionApproval(req, res);
  }
  if (route.pathname === '/api/automation/llm-health/run' && ['POST', 'PUT'].includes(req.method)) {
    return handleAutomationLlmHealthRun(req, res);
  }
  if (route.pathname === '/api/automation/learning' && req.method === 'GET') {
    return handleGetAutomationLearning(req, res);
  }
  if (route.pathname === '/api/automation/learning' && ['PATCH', 'POST'].includes(req.method)) {
    if (auth.role !== 'admin') {
      return sendJson(res, 403, {
        ok: false,
        error: 'forbidden',
        message: 'Admin role is required to modify learning state.',
      });
    }
    return handlePatchAutomationLearning(req, res);
  }
  if (route.pathname === '/api/automation/learning/export' && req.method === 'GET') {
    return handleExportLearningState(req, res);
  }
  if (route.pathname === '/api/automation/learning/import' && ['POST', 'PUT'].includes(req.method)) {
    if (auth.role !== 'admin') {
      return sendJson(res, 403, { ok: false, error: 'forbidden', message: 'Admin role is required to import learning state.' });
    }
    return handleImportLearningState(req, res);
  }
  if (route.pathname === '/api/automation/trends' && req.method === 'GET') {
    return handleGetTrends(req, res);
  }
  if (route.pathname === '/api/automation/autopilot' && req.method === 'GET') {
    return handleGetAutopilot(req, res);
  }
  if (route.pathname === '/api/automation/alerts' && req.method === 'GET') {
    return handleGetAlerts(req, res);
  }
  if (route.pathname === '/api/automation/report' && ['POST', 'PUT'].includes(req.method)) {
    if (auth.role !== 'admin') {
      return sendJson(res, 403, { ok: false, error: 'forbidden', message: 'Admin role required.' });
    }
    return handleGenerateReport(req, res);
  }
  if (route.pathname.startsWith('/api/automation/jobs/') && route.pathname.endsWith('/reroute/apply') && ['POST', 'PUT'].includes(req.method)) {
    const jobId = decodeURIComponent(route.pathname.slice('/api/automation/jobs/'.length, -'/reroute/apply'.length));
    return handleAutomationRerouteApply(req, res, jobId);
  }
  if (route.pathname.startsWith('/api/automation/jobs/') && route.pathname.endsWith('/adjudicate') && ['POST', 'PUT'].includes(req.method)) {
    const jobId = decodeURIComponent(route.pathname.slice('/api/automation/jobs/'.length, -'/adjudicate'.length));
    return handleAutomationAdjudication(req, res, jobId);
  }
  if (route.pathname.startsWith('/api/automation/jobs/') && route.pathname.endsWith('/retry') && ['POST', 'PUT'].includes(req.method)) {
    const jobId = decodeURIComponent(route.pathname.slice('/api/automation/jobs/'.length, -'/retry'.length));
    return handleAutomationRetry(req, res, jobId);
  }
  if (route.pathname === '/api/inbox' && req.method === 'GET') {
    const limit = Math.max(1, Math.min(500, Number(route.searchParams.get('limit') || 200)));
    const offset = Math.max(0, Number(route.searchParams.get('offset') || 0));
    const status = route.searchParams.get('status') || '';
    const kb = route.searchParams.get('kb') || '';
    const query = (route.searchParams.get('q') || '').trim().toLowerCase();
    const raw = inboxSummary();
    const filteredDrafts = raw.drafts
      .filter((draft) => !status || draft.status === status)
      .filter((draft) => !kb || draft.kbNamespace === kb)
      .filter((draft) => {
        if (!query) return true;
        return `${draft.title || ''} ${draft.id || ''} ${draft.kbName || ''} ${draft.kbNamespace || ''} ${draft.sourceUrl || ''}`
          .toLowerCase()
          .includes(query);
      })
      .slice()
      .reverse();
    const total = filteredDrafts.length;
    const drafts = filteredDrafts.slice(offset, offset + limit);
    return sendJson(res, 200, {
      ...raw,
      drafts,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    });
  }
  if (route.pathname === '/api/actions' && req.method === 'GET') {
    const status = route.searchParams.get('status') || '';
    const type = route.searchParams.get('type') || '';
    const limit = Math.max(1, Math.min(200, Number(route.searchParams.get('limit') || 50)));
    const actions = listActions(limit)
      .filter((action) => !status || action.status === status)
      .filter((action) => !type || action.type === type);
    return sendJson(res, 200, { ok: true, actions });
  }
  if (route.pathname === '/api/audit' && req.method === 'GET') {
    if (auth.role !== 'admin') {
      return sendJson(res, 403, {
        ok: false,
        error: 'forbidden',
        message: 'Admin role is required to read the audit log.',
      });
    }
    const summary = dashboardAuditSummary();
    return sendJson(res, 200, {
      ok: true,
      events: listDashboardAudit({
        limit: route.searchParams.get('limit') || 100,
        action: route.searchParams.get('action') || '',
        actor: route.searchParams.get('actor') || '',
        resourceId: route.searchParams.get('resourceId') || '',
      }),
      verification: summary.verification,
    });
  }
  if (route.pathname === '/api/discovery' && req.method === 'GET') {
    return sendJson(res, 200, { ok: true, discovery: discoverySummary() });
  }
  if (route.pathname === '/api/discovery/run' && ['POST', 'PUT'].includes(req.method)) {
    return handleDiscoveryRun(req, res);
  }
  if (route.pathname === '/api/discovery/briefing/refresh' && ['POST', 'PUT'].includes(req.method)) {
    return sendJson(res, 200, { ok: true, briefing: refreshDiscoveryBriefing() });
  }
  if (route.pathname === '/api/discovery/policy' && ['PUT', 'PATCH', 'POST'].includes(req.method)) {
    if (auth.role !== 'admin') {
      return sendJson(res, 403, {
        ok: false,
        error: 'forbidden',
        message: 'Admin role is required to change discovery policy.',
      });
    }
    return handleDiscoveryPolicy(req, res);
  }
  const discoveryQueryMatch = route.pathname.match(/^\/api\/discovery\/queries\/([^/]+)$/);
  if (discoveryQueryMatch && ['PUT', 'PATCH'].includes(req.method)) {
    if (auth.role !== 'admin') {
      return sendJson(res, 403, {
        ok: false,
        error: 'forbidden',
        message: 'Admin role is required to change discovery queries.',
      });
    }
    return handleDiscoveryQuery(req, res, decodeURIComponent(discoveryQueryMatch[1]));
  }
  if (route.pathname === '/api/discovery/candidates/bulk' && ['POST', 'PUT'].includes(req.method)) {
    return handleDiscoveryCandidateBulk(req, res);
  }
  const discoveryCandidateUndoMatch = route.pathname.match(
    /^\/api\/discovery\/candidates\/([^/]+)\/undo$/,
  );
  if (discoveryCandidateUndoMatch && ['POST', 'PUT'].includes(req.method)) {
    return handleDiscoveryCandidateUndo(
      req,
      res,
      decodeURIComponent(discoveryCandidateUndoMatch[1]),
    );
  }
  const discoveryCandidateMatch = route.pathname.match(
    /^\/api\/discovery\/candidates\/([^/]+)\/(draft|route|reject)$/,
  );
  if (discoveryCandidateMatch && ['POST', 'PUT'].includes(req.method)) {
    return handleDiscoveryCandidate(
      req,
      res,
      decodeURIComponent(discoveryCandidateMatch[1]),
      discoveryCandidateMatch[2],
    );
  }
  if (route.pathname === '/api/source-list' && req.method === 'GET') {
    return sendJson(res, 200, {
      ok: true,
      listPath: path.relative(ROOT, SOURCE_LIST_PATH).replaceAll(path.sep, '/'),
      credentialsPath: path.relative(ROOT, SOURCE_CREDENTIALS_PATH).replaceAll(path.sep, '/'),
      sources: listSources(),
    });
  }
  if (route.pathname === '/api/source-list' && req.method === 'POST') {
    return handleCreateSource(req, res);
  }
  if (route.pathname === '/api/source-list/scan-all' && ['POST', 'PUT'].includes(req.method)) {
    return handleScanSource(req, res, '');
  }
  if (route.pathname.startsWith('/api/source-list/') && route.pathname.endsWith('/scan') && ['POST', 'PUT'].includes(req.method)) {
    const sourceId = decodeURIComponent(route.pathname.slice('/api/source-list/'.length, -'/scan'.length));
    return handleScanSource(req, res, sourceId);
  }
  if (route.pathname.startsWith('/api/source-list/') && ['PUT', 'PATCH'].includes(req.method)) {
    const sourceId = decodeURIComponent(route.pathname.slice('/api/source-list/'.length));
    return handleUpdateSource(req, res, sourceId);
  }
  if (route.pathname.startsWith('/api/source-list/') && req.method === 'DELETE') {
    const sourceId = decodeURIComponent(route.pathname.slice('/api/source-list/'.length));
    return handleDeleteSource(req, res, sourceId);
  }
  if (route.pathname.startsWith('/api/actions/') && route.pathname.endsWith('/dismiss') && ['POST', 'PUT'].includes(req.method)) {
    const actionId = decodeURIComponent(route.pathname.slice('/api/actions/'.length, -'/dismiss'.length));
    return handleDismissAction(req, res, actionId);
  }
  if (route.pathname === '/api/learning/stats' && req.method === 'GET') {
    return sendJson(res, 200, { ok: true, stats: gapStats() });
  }
  if (route.pathname === '/api/learning/gaps' && req.method === 'GET') {
    const status = route.searchParams.get('status') || '';
    const kb = route.searchParams.get('kb') || '';
    const source = route.searchParams.get('source') || '';
    const limit = Math.max(1, Math.min(500, Number(route.searchParams.get('limit') || 200)));
    const gaps = getGaps({ status, kb, source, limit });
    return sendJson(res, 200, { ok: true, gaps });
  }
  if (route.pathname === '/api/learning/gaps/process' && ['POST', 'PUT'].includes(req.method)) {
    const limit = Math.max(1, Math.min(50, Number(route.searchParams.get('limit') || 10)));
    if (typeof spawn === 'function') {
      const child = spawn(process.execPath, ['scripts/process_learning_gaps.mjs', '--limit', String(limit)], {
        cwd: ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, ROOT },
      });
      let stdout = '';
      child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
      child.on('close', (exitCode) => {
        appendDashboardAudit({
          action: 'process_learning_gaps',
          status: exitCode === 0 ? 'FINISH' : 'FAIL',
          details: { gapLimit: limit, exitCode, output: stdout.slice(0, 2000) },
        });
      });
      return sendJson(res, 202, { ok: true, message: `Processing up to ${limit} learning gaps in background.`, actionType: 'process_learning_gaps' });
    }
    return sendJson(res, 503, { ok: false, error: 'no_spawn', message: 'Background processing not available.' });
  }
  if (route.pathname.startsWith('/api/learning/gaps/') && route.pathname.endsWith('/ignore') && ['POST', 'PUT'].includes(req.method)) {
    const gapId = decodeURIComponent(route.pathname.slice('/api/learning/gaps/'.length, -'/ignore'.length));
    const updated = updateGapStatus(gapId, { status: 'ignored' });
    if (!updated) return sendJson(res, 404, { ok: false, error: 'gap_missing', message: `Gap not found: ${gapId}` });
    return sendJson(res, 200, { ok: true, gap: updated });
  }
  if (route.pathname.startsWith('/api/learning/gaps/') && route.pathname.endsWith('/resolve') && ['POST', 'PUT'].includes(req.method)) {
    const gapId = decodeURIComponent(route.pathname.slice('/api/learning/gaps/'.length, -'/resolve'.length));
    const updated = updateGapStatus(gapId, { status: 'resolved' });
    if (!updated) return sendJson(res, 404, { ok: false, error: 'gap_missing', message: `Gap not found: ${gapId}` });
    return sendJson(res, 200, { ok: true, gap: updated });
  }
  if (route.pathname === '/api/mcp/servers' && req.method === 'GET') {
    return sendJson(res, 200, { ok: true, servers: getServers() });
  }
  if (route.pathname === '/api/mcp/servers/health' && req.method === 'GET') {
    const results = [];
    for (const server of getServers()) {
      if (!server.healthUrl) { results.push({ id: server.id, status: 'unknown' }); continue; }
      try {
        const resp = await fetch(server.healthUrl, { signal: AbortSignal.timeout(5000) });
        results.push({ id: server.id, status: resp.ok ? 'reachable' : 'error', httpStatus: resp.status });
      } catch (e) {
        results.push({ id: server.id, status: 'unreachable', error: e.message });
      }
    }
    return sendJson(res, 200, { ok: true, results });
  }
  if (route.pathname === '/api/mcp/servers' && ['POST', 'PUT'].includes(req.method)) {
    if (auth.role !== 'admin') return sendJson(res, 403, { ok: false, error: 'admin_required' });
    let fields;
    try { fields = JSON.parse(await readBody(req)); } catch { return sendJson(res, 400, { ok: false, error: 'invalid_json' }); }
    const name = String(fields.name || '').trim();
    if (!name) return sendJson(res, 400, { ok: false, error: 'name_required' });
    const kbFilter = Array.isArray(fields.kbFilter) ? fields.kbFilter.map((ns) => String(ns).trim()).filter(Boolean) : [];
    let server;
    try { server = createMcpServer({ name, kbFilter, port: fields.port || 0 }); }
    catch (e) { return sendJson(res, 400, { ok: false, error: e.message }); }
    generateMcpSystemd(server);
    return sendJson(res, 201, { ok: true, server, message: `MCP server created. Config: config/mcp/${server.id}/. Run: sudo cp config/mcp/${server.id}/${server.id}.service /etc/systemd/system/ && sudo systemctl enable --now ${server.id}` });
  }
  if (route.pathname.startsWith('/api/mcp/servers/') && route.pathname.endsWith('/stop') && ['POST', 'PUT'].includes(req.method)) {
    if (auth.role !== 'admin') return sendJson(res, 403, { ok: false, error: 'admin_required' });
    const mcpId = decodeURIComponent(route.pathname.slice('/api/mcp/servers/'.length, -'/stop'.length));
    const child = spawn('systemctl', ['stop', mcpId], { stdio: 'pipe' });
    child.on('close', (code) => {
      if (code === 0) appendDashboardAudit({ action: 'mcp_stop', status: 'FINISH', details: { mcpId } });
    });
    return sendJson(res, 202, { ok: true, message: `Stopping MCP ${mcpId}.` });
  }
  if (route.pathname.startsWith('/api/mcp/servers/') && route.pathname.endsWith('/start') && ['POST', 'PUT'].includes(req.method)) {
    if (auth.role !== 'admin') return sendJson(res, 403, { ok: false, error: 'admin_required' });
    const mcpId = decodeURIComponent(route.pathname.slice('/api/mcp/servers/'.length, -'/start'.length));
    const child = spawn('systemctl', ['enable', '--now', mcpId], { stdio: 'pipe' });
    child.on('close', (code) => {
      if (code === 0) appendDashboardAudit({ action: 'mcp_start', status: 'FINISH', details: { mcpId } });
    });
    return sendJson(res, 202, { ok: true, message: `Starting MCP ${mcpId}.` });
  }
  if (route.pathname.startsWith('/api/mcp/servers/') && route.pathname.endsWith('/restart') && ['POST', 'PUT'].includes(req.method)) {
    if (auth.role !== 'admin') return sendJson(res, 403, { ok: false, error: 'admin_required' });
    const mcpId = decodeURIComponent(route.pathname.slice('/api/mcp/servers/'.length, -'/restart'.length));
    const child = spawn('systemctl', ['restart', mcpId], { stdio: 'pipe' });
    child.on('close', (code) => {
      if (code === 0) appendDashboardAudit({ action: 'mcp_restart', status: 'FINISH', details: { mcpId } });
    });
    return sendJson(res, 202, { ok: true, message: `Restarting MCP ${mcpId}.` });
  }
  if (route.pathname.startsWith('/api/mcp/servers/') && req.method === 'DELETE') {
    if (auth.role !== 'admin') return sendJson(res, 403, { ok: false, error: 'admin_required' });
    const mcpId = decodeURIComponent(route.pathname.slice('/api/mcp/servers/'.length));
    const removed = deleteMcpServer(mcpId);
    if (!removed) return sendJson(res, 404, { ok: false, error: 'mcp_missing' });
    spawn('systemctl', ['stop', mcpId], { stdio: 'ignore' });
    spawn('systemctl', ['disable', mcpId], { stdio: 'ignore' });
    const mcpDir = path.join(ROOT, 'config', 'mcp', mcpId);
    try { fs.rmSync(mcpDir, { recursive: true, force: true }); } catch (e) { console.error(`Failed to clean up MCP dir: ${e.message}`); }
    return sendJson(res, 200, { ok: true, message: `MCP ${mcpId} removed from registry.` });
  }
  if (route.pathname === '/api/mcp/users' && req.method === 'GET') {
    return sendJson(res, 200, { ok: true, users: getUsers(), servers: getServers() });
  }
  if (route.pathname === '/api/mcp/users' && req.method === 'POST') {
    if (auth.role !== 'admin') return sendJson(res, 403, { ok: false, error: 'admin_required' });
    let fields;
    try { fields = JSON.parse(await readBody(req)); } catch { return sendJson(res, 400, { ok: false, error: 'invalid_json' }); }
    const user = createUser({ name: fields.name, email: fields.email, mcpAssignments: fields.mcpAssignments || [] });
    return sendJson(res, 201, { ok: true, user });
  }
  if (route.pathname.startsWith('/api/mcp/users/') && req.method === 'PUT') {
    if (auth.role !== 'admin') return sendJson(res, 403, { ok: false, error: 'admin_required' });
    const userId = decodeURIComponent(route.pathname.slice('/api/mcp/users/'.length));
    let fields;
    try { fields = JSON.parse(await readBody(req)); } catch { return sendJson(res, 400, { ok: false, error: 'invalid_json' }); }
    const user = updateUser(userId, fields);
    if (!user) return sendJson(res, 404, { ok: false, error: 'user_missing', message: `User not found: ${userId}` });
    return sendJson(res, 200, { ok: true, user });
  }
  if (route.pathname.startsWith('/api/mcp/users/') && req.method === 'DELETE') {
    if (auth.role !== 'admin') return sendJson(res, 403, { ok: false, error: 'admin_required' });
    const userId = decodeURIComponent(route.pathname.slice('/api/mcp/users/'.length));
    if (!deleteUser(userId)) return sendJson(res, 404, { ok: false, error: 'user_missing' });
    return sendJson(res, 200, { ok: true });
  }
  if (route.pathname.startsWith('/api/mcp/users/') && route.pathname.endsWith('/keys') && req.method === 'POST') {
    if (auth.role !== 'admin') return sendJson(res, 403, { ok: false, error: 'admin_required' });
    const userId = decodeURIComponent(route.pathname.slice('/api/mcp/users/'.length, -'/keys'.length));
    const result = createUserApiKey(userId);
    if (!result) return sendJson(res, 404, { ok: false, error: 'user_missing' });
    if (result.error) return sendJson(res, 400, { ok: false, error: result.error });
    return sendJson(res, 201, { ok: true, keyPrefix: result.key.prefix, keyRaw: result.raw });
  }
  if (route.pathname.startsWith('/api/mcp/users/') && route.pathname.endsWith('/keys/rotate') && req.method === 'POST') {
    if (auth.role !== 'admin') return sendJson(res, 403, { ok: false, error: 'admin_required' });
    let body;
    try { body = JSON.parse(await readBody(req)); } catch { return sendJson(res, 400, { ok: false, error: 'invalid_json' }); }
    const userId = decodeURIComponent(route.pathname.slice('/api/mcp/users/'.length, -'/keys/rotate'.length));
    const keyId = body.keyId;
    if (!keyId) return sendJson(res, 400, { ok: false, error: 'missing_keyId' });
    const result = rotateUserApiKey(userId, keyId);
    if (!result) return sendJson(res, 404, { ok: false, error: 'user_or_key_missing' });
    if (result.error) return sendJson(res, 400, { ok: false, error: result.error });
    return sendJson(res, 200, { ok: true, keyPrefix: result.key.prefix, keyRaw: result.raw });
  }
  if (route.pathname.startsWith('/api/mcp/users/') && route.pathname.includes('/keys/') && req.method === 'DELETE') {
    if (auth.role !== 'admin') return sendJson(res, 403, { ok: false, error: 'admin_required' });
    const parts = route.pathname.split('/');
    const keyId = parts.pop();
    const userId = parts[parts.length - 2];
    const result = revokeUserApiKey(userId, keyId);
    if (!result) return sendJson(res, 404, { ok: false, error: 'user_or_key_missing' });
    return sendJson(res, 200, { ok: true, key: result });
  }
  if (route.pathname.startsWith('/api/actions/') && req.method === 'GET') {
    const actionId = decodeURIComponent(route.pathname.slice('/api/actions/'.length));
    let detail = actionDetail(actionId);
    if (!detail) return sendJson(res, 404, { ok: false, error: 'action_missing', message: `Action not found: ${actionId}` });
    return sendJson(res, 200, detail);
  }
  if (route.pathname.startsWith('/api/drafts/') && req.method === 'GET') {
    const draftId = decodeURIComponent(route.pathname.slice('/api/drafts/'.length));
    const detail = draftDetail(draftId);
    if (!detail) return sendJson(res, 404, { ok: false, error: 'draft_missing', message: `Draft not found: ${draftId}` });
    return sendJson(res, 200, detail);
  }
  if (route.pathname.startsWith('/api/kbs/') && route.pathname.endsWith('/build') && ['POST', 'PUT'].includes(req.method)) {
    const kbNamespace = decodeURIComponent(route.pathname.slice('/api/kbs/'.length, -'/build'.length));
    return handleBuildKb(req, res, kbNamespace);
  }
  if (route.pathname === '/api/drafts/bulk-promote-export' && ['POST', 'PUT'].includes(req.method)) {
    return handleBulkPromoteExportDrafts(req, res);
  }
  if (route.pathname.startsWith('/api/drafts/') && route.pathname.endsWith('/withdraw-build') && ['POST', 'PUT'].includes(req.method)) {
    const draftId = decodeURIComponent(route.pathname.slice('/api/drafts/'.length, -'/withdraw-build'.length));
    return handleWithdrawPromotedDraft(req, res, draftId);
  }
  if (route.pathname.startsWith('/api/drafts/') && route.pathname.endsWith('/reject') && ['POST', 'PUT'].includes(req.method)) {
    const draftId = decodeURIComponent(route.pathname.slice('/api/drafts/'.length, -'/reject'.length));
    return handleRejectDraft(req, res, draftId);
  }
  if (route.pathname.startsWith('/api/drafts/') && route.pathname.endsWith('/promote-export') && ['POST', 'PUT'].includes(req.method)) {
    const draftId = decodeURIComponent(route.pathname.slice('/api/drafts/'.length, -'/promote-export'.length));
    return handlePromoteExportDraft(req, res, draftId);
  }
  if (route.pathname.startsWith('/api/drafts/') && route.pathname.endsWith('/promote') && ['POST', 'PUT'].includes(req.method)) {
    const draftId = decodeURIComponent(route.pathname.slice('/api/drafts/'.length, -'/promote'.length));
    return handlePromoteDraft(req, res, draftId);
  }
  if (route.pathname === '/api/drafts/analyze' && req.method === 'POST') {
    return handleAnalyzeDraft(req, res);
  }
  if (route.pathname === '/api/drafts' && req.method === 'GET') {
    const status = route.searchParams.get('status') || '';
    const kbNamespace = route.searchParams.get('kbNamespace') || '';
    const sourceListId = route.searchParams.get('sourceListId') || '';
    const limit = Math.max(1, Math.min(500, Number(route.searchParams.get('limit') || 200)));
    const drafts = listInboxDrafts()
      .filter((draft) => !status || draft.status === status)
      .filter((draft) => !kbNamespace || draft.kbNamespace === kbNamespace)
      .filter((draft) => !sourceListId || draft.metadata?.sourceListId === sourceListId)
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .slice(0, limit);
    return sendJson(res, 200, { ok: true, drafts });
  }
  if (route.pathname.startsWith('/api/reports/') && req.method === 'GET') {
    const key = decodeURIComponent(route.pathname.slice('/api/reports/'.length));
    const report = REPORTS[key];
    if (!report) return sendJson(res, 404, { ok: false, error: 'unknown_report' });
    const format = route.searchParams.get('format') || 'json';
    const relPath = format === 'md' ? report.mdPath : report.jsonPath;
    const filePath = path.join(ROOT, relPath);
    if (!fs.existsSync(filePath)) return sendJson(res, 404, { ok: false, error: 'report_missing' });
    return send(res, 200, fs.readFileSync(filePath), {
      'Content-Type': format === 'md' ? 'text/markdown; charset=utf-8' : 'application/json; charset=utf-8',
    });
  }
  if (route.pathname === '/api/drafts' && req.method === 'POST') {
    return handleCreateDraft(req, res);
  }

  if (['GET', 'HEAD'].includes(req.method) && !route.pathname.startsWith('/api/')) {
    return sendDashboardApp(res, route.pathname);
  }

  return sendJson(res, 404, { ok: false, error: 'not_found' });
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    sendJson(res, 500, { ok: false, error: 'internal_error', message: error.message });
  });
});

server.requestTimeout = REQUEST_TIMEOUT_MS;
server.headersTimeout = Math.min(REQUEST_TIMEOUT_MS, 15000);

server.listen(PORT, HOST, () => {
  process.stdout.write(JSON.stringify({
    ok: true,
    service: 'erp-kb-dashboard',
    host: HOST,
    port: PORT,
    basePath: BASE_PATH,
    auth: AUTH_MODE,
    maxBodyBytes: MAX_BODY_BYTES,
  }) + '\n');
});
