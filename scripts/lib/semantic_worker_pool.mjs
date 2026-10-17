import { Worker } from 'node:worker_threads';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { SEMANTIC_WORKER_BOOTSTRAP } from './semantic_worker_generation.mjs';

const METHODS = new Set(['erp_concept.search', 'erp_entity.get', 'erp_relation.list', 'erp_process.explain']);
export function isSemanticWorkerRequest(request, context) {
  return request?.method === 'tools/call' && METHODS.has(request.params?.name)
    && (!context?.profile?.tools || context.profile.tools.includes(request.params.name))
    && !(context?.allowedNamespaces && context.allowedNamespaces.size === 0);
}
function failure(code) {
  return Object.assign(new Error({ SEMANTIC_BUSY: 'Semantic request capacity is busy.',
    SEMANTIC_REQUEST_FAILED: 'Semantic request failed.',
    SEMANTIC_CANCELLED: 'Semantic request cancelled.', SEMANTIC_UNAVAILABLE: 'Semantic execution unavailable.' }[code]), { code });
}

// Internal dependencies for deterministic mechanism tests, never HTTP inputs.
export function createSemanticWorkerPool(generation, { spawnWorker = () => new Worker(SEMANTIC_WORKER_BOOTSTRAP, {
  eval: true, workerData: { generation },
  // HTTP bearer credentials are transport-only, not domain configuration.
  env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('ERP_KB_HTTP_'))),
}) } = {}) {
  const slots = [], queue = [];
  let available = true, termination, unavailableReason = null;
  const settle = (job, error, value) => {
    if (job.settled) return;
    job.settled = true;
    job.signal?.removeEventListener('abort', job.abort);
    if (error) job.reject(error); else job.resolve(value);
  };
  const stop = reason => {
    if (termination) return termination;
    available = false;
    unavailableReason = reason; // fixed internal reason codes only; first cause wins
    for (const job of queue.splice(0)) settle(job, failure('SEMANTIC_UNAVAILABLE'));
    for (const slot of slots) if (slot.job) { settle(slot.job, failure('SEMANTIC_UNAVAILABLE')); slot.job = null; }
    termination = Promise.all(slots.map(slot => Promise.resolve().then(() => slot.worker.terminate()).catch(() => {})));
    return termination;
  };
  const send = slot => {
    if (!available || !slot.ready || !slot.job) return;
    const job = slot.job;
    job.dispatched = performance.now();
    try { slot.worker.postMessage({ jobId: job.id, request: job.request, context: job.context,
      timing: { queueMs: job.assigned - job.enqueued, startupMs: job.dispatched - job.assigned } }); }
    catch { void stop('DISPATCH_FAILED'); }
  };
  const next = slot => {
    slot.job = queue.shift() || null;
    if (slot.job) slot.job.assigned = performance.now();
    send(slot);
  };
  const start = job => {
    job.assigned = performance.now();
    try {
      const slot = { worker: spawnWorker(), ready: false, job };
      slots.push(slot);
      slot.worker.on('error', () => { void stop('WORKER_ERROR'); });
      slot.worker.on('exit', () => { if (available) void stop('WORKER_EXIT'); });
      slot.worker.on('messageerror', () => { void stop('MESSAGE_ERROR'); });
      slot.worker.on('message', message => {
        if (!available) return;
        if (message?.type === 'ready') {
          if (slot.ready) { void stop('PROTOCOL_ERROR'); return; }
          if (message.generation !== generation.id) { void stop('GENERATION_MISMATCH'); return; }
          slot.ready = true; send(slot); return;
        }
        if (!slot.ready || !slot.job || message?.jobId !== slot.job.id) return; // unknown/late cannot own another request
        if (message.type !== 'result' && message.type !== 'request-error') { void stop('PROTOCOL_ERROR'); return; }
        const current = slot.job;
        if (message.type === 'request-error') settle(current, failure('SEMANTIC_REQUEST_FAILED'));
        else settle(current, null, { response: message.response, timing: { queueAndStartupMs: current.dispatched - current.enqueued,
          queueMs: current.assigned - current.enqueued, startupMs: current.dispatched - current.assigned,
          handlerWallMs: message.handlerWallMs, totalMs: performance.now() - current.enqueued } });
        slot.job = null; next(slot);
      });
    } catch {
      settle(job, failure('SEMANTIC_UNAVAILABLE')); void stop('WORKER_CONSTRUCTION_FAILED');
    }
  };
  return {
    run(request, context, { signal } = {}) {
      if (!available) return Promise.reject(failure('SEMANTIC_UNAVAILABLE'));
      if (signal?.aborted) return Promise.reject(failure('SEMANTIC_CANCELLED'));
      const idle = slots.find(slot => !slot.job);
      if (!idle && slots.length === 2 && queue.length === 8) return Promise.reject(failure('SEMANTIC_BUSY'));
      let snapshot;
      try {
        snapshot = structuredClone({ request, context: { profileId: context.profile?.id,
          allowedNamespaces: context.allowedNamespaces, writeAllowed: context.writeAllowed, serverInfo: context.serverInfo } });
      } catch { return Promise.reject(failure('SEMANTIC_UNAVAILABLE')); }
      return new Promise((resolve, reject) => {
        const job = { id: randomUUID(), ...snapshot, resolve, reject, signal, enqueued: performance.now(), settled: false };
        job.abort = () => {
          const index = queue.indexOf(job);
          if (index !== -1) queue.splice(index, 1);
          // Active job remains the owner of its slot until completion/termination.
          settle(job, failure('SEMANTIC_CANCELLED'));
        };
        signal?.addEventListener('abort', job.abort, { once: true });
        if (idle) { job.assigned = performance.now(); idle.job = job; send(idle); }
        else if (slots.length < 2) start(job);
        else queue.push(job);
      });
    },
    stats() { return { available, workers: slots.length, active: slots.filter(s => s.job).length, queued: queue.length, maxWorkers: 2, maxQueued: 8, unavailableReason }; },
    close: () => stop('CLOSED'),
  };
}
