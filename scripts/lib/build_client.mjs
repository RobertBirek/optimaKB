import fs from 'fs';
import path from 'path';

export function createBuildClient({ apiBase, cookie }) {
  async function api(pathname, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('Cookie', cookie);
    const response = await fetch(`${apiBase}${pathname}`, { ...options, headers });
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Non-JSON response from ${pathname}: ${text.slice(0, 400)}`);
    }
    if (!response.ok) {
      throw new Error(`${pathname} failed with HTTP ${response.status}: ${text.slice(0, 400)}`);
    }
    return json;
  }

  async function uploadCsvFile(filePath) {
    const form = new FormData();
    const fileName = path.basename(filePath);
    form.append('file', new Blob([fs.readFileSync(filePath)]), fileName);
    const response = await fetch(`${apiBase}/public/v1/reasoner/dialog/uploadFile`, {
      method: 'POST',
      headers: { Cookie: cookie },
      body: form,
    });
    const text = await response.text();
    const json = JSON.parse(text);
    if (!response.ok || !json.success || !json.result) {
      throw new Error(`Upload failed for ${fileName}: ${text.slice(0, 400)}`);
    }
    return json.result;
  }

  async function submitBuilderJob(payload) {
    const json = await api('/public/v1/builder/job/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!json.success || !json.result) {
      throw new Error(`Job submit failed: ${JSON.stringify(json).slice(0, 400)}`);
    }
    return json.result;
  }

  async function getBuilderJob(jobId) {
    const json = await api(`/public/v1/builder/job/get?id=${jobId}`);
    if (!json.success) {
      throw new Error(`Unable to read builder job ${jobId}`);
    }
    return json.result;
  }

  async function listBuilderJobs(projectId, { limit = 100 } = {}) {
    const json = await api(`/public/v1/builder/job/list?projectId=${projectId}&start=1&limit=${limit}`);
    if (!json.success || !json.result?.data) {
      throw new Error('Unable to read existing builder jobs');
    }
    return json.result.data;
  }

  async function getSchemaEntityIdMap(projectId, { includeShortNames = true } = {}) {
    const json = await api(`/v1/schemas/graph/${projectId}`);
    if (!json.success || !json.result) {
      throw new Error(`Unable to read schema graph for project ${projectId}`);
    }
    const map = new Map();
    for (const entity of json.result.entityTypeDTOList || []) {
      map.set(entity.name, entity.id);
      if (includeShortNames) {
        const shortName = String(entity.name || '').split('.').pop();
        if (shortName) map.set(shortName, entity.id);
      }
    }
    return map;
  }

  return {
    api,
    uploadCsvFile,
    submitBuilderJob,
    getBuilderJob,
    listBuilderJobs,
    getSchemaEntityIdMap,
  };
}
