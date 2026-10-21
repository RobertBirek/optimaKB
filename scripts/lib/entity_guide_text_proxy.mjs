import fs from 'node:fs';
import { createHash, timingSafeEqual } from 'node:crypto';

export const GUIDE_TEXT_PATH = '/public/v1/search/text';
const UPSTREAM = 'http://10.10.254.42:8887/public/v1/search/text';
const LABEL = 'McpOptimaEvidence.KnowledgeSection';
const MAX_REQUEST_BYTES = 16_384;
const MAX_RESPONSE_BYTES = 1_048_576;

export function registryHash(registry) {
  const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
  const { registryHash: ignored, ...payload } = registry;
  return createHash('sha256').update(JSON.stringify(canonical(payload))).digest('hex');
}

function loadRegistry(settings) {
  const registry = settings.registry || JSON.parse(fs.readFileSync(settings.registryPath, 'utf8'));
  if (registry.schemaVersion !== 2 || registry.registryHash !== registryHash(registry)
      || !Array.isArray(registry.guides) || registry.guides.length > 500
      || new Set(registry.guides.map(guide => guide.entity)).size !== registry.guides.length) throw new Error('registry_invalid');
  const project = registry.projects.find(project => project.namespace === 'McpOptimaEvidence');
  if (!project || !Number.isSafeInteger(project.projectId) || project.projectId <= 0 || !Array.isArray(project.fields)) throw new Error('registry_project_invalid');
  return { registry, project };
}

function respond(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(body);
}

function permittedAddress(req, settings) {
  const remote = String(req.socket.remoteAddress || '').replace(/^::ffff:/, '');
  if (remote === settings.allowedClient) return true;
  if (!settings.trustedProxies?.includes(remote)) return false;
  const value = req.headers['cf-connecting-ip'] || req.headers['x-real-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return value === settings.allowedClient;
}

export function createEntityGuideTextProxy({ configPath = '', settings: supplied, send = fetch } = {}) {
  return async function entityGuideTextProxy(req, res) {
    if (req.url !== GUIDE_TEXT_PATH) return false;
    const fail = (status, errorCode) => { respond(res, status, { success: false, errorCode, message: 'Odczyt przewodnika jest niedostępny.' }); return true; };
    let settings;
    try { settings = supplied || JSON.parse(fs.readFileSync(configPath, 'utf8')); }
    catch { return fail(503, 'guide_proxy_not_configured'); }
    if (settings.enabled !== true) return fail(503, 'guide_proxy_disabled');
    if (req.method !== 'POST') return fail(405, 'guide_proxy_method_denied');
    if (!permittedAddress(req, settings)) return fail(403, 'guide_proxy_client_denied');
    const cookie = req.headers.cookie;
    if (typeof cookie !== 'string' || !cookie || cookie.length > 8192 || !/^[a-f0-9]{64}$/.test(settings.cookieSha256 || '')) return fail(401, 'guide_proxy_auth_required');
    const actual = createHash('sha256').update(cookie).digest();
    if (!timingSafeEqual(actual, Buffer.from(settings.cookieSha256, 'hex'))) return fail(401, 'guide_proxy_auth_failed');
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) return fail(415, 'guide_proxy_json_required');
    let registry, project;
    try { ({ registry, project } = loadRegistry(settings)); }
    catch { return fail(503, 'guide_proxy_registry_invalid'); }
    let payload;
    try {
      const chunks = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > MAX_REQUEST_BYTES) return fail(413, 'guide_proxy_request_too_large'); chunks.push(chunk); }
      payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch { return fail(400, 'guide_proxy_invalid_json'); }
    let guide = registry.guides.find(guide => guide.entity === payload?.queryString);
    let label = LABEL;
    let operation = false;
    if (!guide && typeof payload?.queryString === 'string') {
      guide = registry.guides.find(guide => guide.readContracts?.some(contract => contract.tool === payload.queryString && contract.policy_level === 'Read'));
      if (guide) {
        project = registry.projects.find(project => project.namespace === 'McpOptimaOntology');
        label = 'McpOptimaOntology.Operation';
        operation = true;
      }
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)
        || Object.keys(payload).sort().join(',') !== 'labelConstraints,projectId,queryString,topk'
        || !project || payload.projectId !== project.projectId || !guide || !Array.isArray(guide.sections) || guide.sections.length > 100
        || payload.topk !== (operation ? 20 : Math.max(20, guide.sections.length)) || typeof payload.queryString !== 'string'
        || JSON.stringify(payload.labelConstraints) !== JSON.stringify([label])) return fail(400, 'guide_proxy_scope_denied');
    try {
      const response = await send(UPSTREAM, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        redirect: 'error', signal: AbortSignal.timeout(12_000), body: JSON.stringify(payload) });
      if (response.status !== 200 || !response.body) return fail(502, 'guide_proxy_upstream_failed');
      const chunks = []; let size = 0;
      for await (const chunk of response.body) { size += chunk.length; if (size > MAX_RESPONSE_BYTES) return fail(502, 'guide_proxy_response_too_large'); chunks.push(chunk); }
      const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const rows = Array.isArray(value) ? value : value?.success === true ? value.result : null;
      if (!Array.isArray(rows) || rows.length > payload.topk) return fail(502, 'guide_proxy_invalid_response');
      const result = [];
      for (const row of rows) {
        const fields = row?.fields;
        if (!fields || !Array.isArray(fields.__labels__) || !fields.__labels__.length || fields.__labels__.some(value => value !== label)) return fail(502, 'guide_proxy_foreign_label');
        let entity = operation ? fields.readEntityRefId : fields.entityRefId;
        if (typeof entity === 'string' && entity.startsWith('"') && entity.endsWith('"')) entity = JSON.parse(entity);
        if (entity !== guide.entityRefId) continue;
        if (operation) {
          const tool = typeof fields.toolName === 'string' && fields.toolName.startsWith('"') ? JSON.parse(fields.toolName) : fields.toolName;
          if (tool !== payload.queryString) continue;
        }
        const filtered = { __labels__: fields.__labels__ };
        for (const key of project.fields) if (Object.hasOwn(fields, key)) filtered[key] = fields[key];
        result.push({ fields: filtered, score: typeof row.score === 'number' ? row.score : 0 });
      }
      respond(res, 200, { success: true, result });
      return true;
    } catch { return fail(502, 'guide_proxy_upstream_unavailable'); }
  };
}
