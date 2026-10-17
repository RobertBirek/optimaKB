import { parentPort, workerData } from 'node:worker_threads';
import { performance } from 'node:perf_hooks';
import { handleJsonRpcRequest } from './erp_knowledge_mcp_core.mjs';
import { getMcpProfile } from './erp_knowledge_mcp_profiles.mjs';

parentPort.on('message', async ({ jobId, request, context }) => {
  const start = performance.now();
  // Trusted context reconstruction is an executor/integrity boundary, not a
  // client request failure. Keep it outside the domain-call catch below.
  const executionContext = {
    profile: getMcpProfile(context.profileId), allowedNamespaces: context.allowedNamespaces,
    serverInfo: context.serverInfo, writeAllowed: context.writeAllowed,
  };
  let response;
  try {
    response = await handleJsonRpcRequest(request, executionContext);
  } catch {
    // A core/domain exception belongs only to this job. Send no exception text,
    // stack, paths or credentials; the parent constructs the bounded error.
    parentPort.postMessage({ type: 'request-error', jobId, handlerWallMs: performance.now() - start });
    return;
  }
  // Serialization/channel failures remain executor failures, never request-error.
  parentPort.postMessage({ type: 'result', jobId, response, handlerWallMs: performance.now() - start });
});
parentPort.postMessage({ type: 'ready', generation: workerData.generation.id });
