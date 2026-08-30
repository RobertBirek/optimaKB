#!/usr/bin/env node

import assert from 'node:assert/strict';

let rotation;
try {
  rotation = await import('./rotate_openspg_chat_model.mjs');
} catch (error) {
  assert.fail(`rotation module is not implemented: ${error.code || error.message}`);
}

const apiKey = 'test-key-not-a-secret';
const model = 'gpt-5.6-luna';
const modelId = 'instance-luna@gpt-5.6-luna';

const request = rotation.buildModelRequest({
  apiKey,
  model,
  displayName: 'OpenAI GPT-5.6 Luna',
});
assert.deepEqual(request, {
  provider: 'OpenAI',
  visibility: 'PUBLIC_READ',
  name: 'OpenAI GPT-5.6 Luna',
  config: {
    api_key: apiKey,
    base_url: 'https://api.openai.com/v1',
    model,
    modelType: 'chat',
    customize: {},
  },
});

const llm = rotation.buildLlmConfig({ apiKey, model, modelId });
assert.deepEqual(llm, {
  visibility: 'PRIVATE',
  modelId,
  provider: 'OpenAI',
  api_key: apiKey,
  base_url: 'https://api.openai.com/v1',
  name: model,
  logo: '/img/logo/openai.png',
  model,
  modelType: 'chat',
  type: 'maas',
  customize: {},
});

const app = {
  id: 4,
  name: 'Dashboard LLM Reviewer',
  description: 'Reviewer',
  logo: '/img/logo/appicon.png',
  alias: 'dashboardllmreviewer',
  config: {
    kb: [{ id: 4, name: 'Schema', enable: true }],
    chat: { ename: 'think_pipeline' },
    language: 'en',
    llm: { model: 'gpt-5.4-mini' },
  },
};
const update = rotation.buildAppUpdatePayload(app, llm);
assert.deepEqual(update, {
  id: 4,
  name: 'Dashboard LLM Reviewer',
  description: 'Reviewer',
  logo: '/img/logo/appicon.png',
  alias: 'dashboardllmreviewer',
  config: {
    kb: [{ id: 4, name: 'Schema', enable: true }],
    chat: { ename: 'think_pipeline' },
    language: 'en',
    llm,
  },
});
assert.notStrictEqual(update.config, app.config);
assert.deepEqual(app.config.llm, { model: 'gpt-5.4-mini' });

for (const name of [
  'parseOptions',
  'validateModelMatch',
  'assertMutationResult',
  'snapshotApp',
  'assertAppAssignment',
  'buildModelDeleteEndpoint',
  'rotate',
]) {
  assert.equal(typeof rotation[name], 'function', `${name} is not implemented`);
}

assert.deepEqual(
  rotation.parseOptions([
    '--model', model,
    '--display-name', 'OpenAI GPT-5.6 Luna',
    '--app-ids', '2,4',
    '--apply',
  ]),
  {
    model,
    displayName: 'OpenAI GPT-5.6 Luna',
    appIds: [2, 4],
    apply: true,
  },
);
for (const invalid of ['2,foo', '2,', '2,2', '0,2', '-1,2']) {
  assert.throws(
    () => rotation.parseOptions([
      '--model', model,
      '--display-name', 'OpenAI GPT-5.6 Luna',
      '--app-ids', invalid,
    ]),
    /positive, unique integers/,
  );
}

const modelMatch = {
  group: { provider: 'OpenAI', visibility: 'PUBLIC_READ' },
  entry: {
    api_key: apiKey,
    modelId,
    base_url: 'https://api.openai.com/v1',
    model,
    modelType: 'chat',
    type: 'maas',
  },
};
assert.doesNotThrow(() => rotation.validateModelMatch(modelMatch, { apiKey, model }));
assert.doesNotThrow(() => rotation.validateModelMatch({
  ...modelMatch,
  entry: { ...modelMatch.entry, api_key: '******' },
}, { apiKey, model }));
assert.throws(
  () => rotation.validateModelMatch({
    ...modelMatch,
    entry: { ...modelMatch.entry, api_key: 'different-key' },
  }, { apiKey, model }),
  /does not match the required OpenAI chat configuration: api_key/,
);
assert.throws(
  () => rotation.validateModelMatch({
    ...modelMatch,
    entry: { ...modelMatch.entry, base_url: 'https://example.invalid/v1' },
  }, { apiKey, model }),
  /does not match the required OpenAI chat configuration: base_url/,
);

assert.equal(rotation.assertMutationResult(true, 'deploy app 4'), true);
assert.throws(
  () => rotation.assertMutationResult(false, 'deploy app 4'),
  /deploy app 4 returned false/,
);

const rawApp = { ...app, accessToken: 'must-not-survive', userNo: 'mcpadmin' };
const snapshot = rotation.snapshotApp(rawApp);
assert.equal('accessToken' in snapshot, false);
assert.equal('userNo' in snapshot, false);
assert.deepEqual(snapshot, rotation.buildAppUpdatePayload(app, app.config.llm));

assert.doesNotThrow(() => rotation.assertAppAssignment({
  ...app,
  config: { ...app.config, llm: { modelId } },
}, modelId));
assert.throws(
  () => rotation.assertAppAssignment(app, modelId),
  /does not use instance-luna@gpt-5.6-luna/,
);

assert.equal(
  rotation.buildModelDeleteEndpoint({
    group: { provider: 'OpenAI', name: 'OpenAI GPT-5.6 Luna' },
    entry: { modelId },
  }),
  '/v1/model/OpenAI/OpenAI%20GPT-5.6%20Luna/?modelId=instance-luna%40gpt-5.6-luna',
);

const apiCalls = [];
let listCount = 0;
const lunaGroups = [{
  provider: 'OpenAI',
  visibility: 'PUBLIC_READ',
  name: 'OpenAI GPT-5.6 Luna',
  model: [modelMatch.entry],
}];
const fakeApi = async (method, endpoint) => {
  apiCalls.push(`${method} ${endpoint}`);
  if (method === 'GET' && endpoint === '/v1/model/list/') {
    listCount += 1;
    if (listCount === 1) return [];
    if (listCount <= 3) return lunaGroups;
    return [];
  }
  if (method === 'POST' && endpoint === '/v1/model') return 10;
  if (method === 'GET' && endpoint === '/v1/app/2') throw new Error('snapshot failed');
  if (method === 'DELETE') return true;
  throw new Error(`unexpected fake API call: ${method} ${endpoint}`);
};
await assert.rejects(
  () => rotation.rotate({
    model,
    displayName: 'OpenAI GPT-5.6 Luna',
    appIds: [2, 4],
    apply: true,
  }, {
    api: fakeApi,
    apiKey,
    testModel: async () => ({ status: 200, latencyMs: 1 }),
  }),
  /snapshot failed/,
);
assert.equal(
  apiCalls.some((call) => call.startsWith('DELETE /v1/model/OpenAI/')),
  true,
  'new model must be deleted when snapshot capture fails',
);

const rejectedCreateCalls = [];
await assert.rejects(
  () => rotation.rotate({
    model,
    displayName: 'OpenAI GPT-5.6 Luna',
    appIds: [2, 4],
    apply: true,
  }, {
    api: async (method, endpoint) => {
      rejectedCreateCalls.push(`${method} ${endpoint}`);
      if (method === 'GET' && endpoint === '/v1/model/list/') return [];
      if (method === 'POST' && endpoint === '/v1/model') throw new Error('create rejected');
      throw new Error(`unexpected fake API call: ${method} ${endpoint}`);
    },
    apiKey,
    testModel: async () => ({ status: 200, latencyMs: 1 }),
  }),
  /create rejected/,
);
assert.deepEqual(rejectedCreateCalls, [
  'GET /v1/model/list/',
  'POST /v1/model',
]);

console.log('rotate_openspg_chat_model tests: PASS');
