const DEFAULT_DELAY_MS = Number(process.env.ERP_KB_TRANSIENT_RETRY_DELAY_MS || 500);

function sleep(delayMs) {
  if (delayMs <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = Number(statusCode);
  return error;
}

export function isTransientNetworkError(error) {
  if (!error) return false;
  if (error.name === 'AbortError') return true;
  const message = String(error.message || error);
  if (/fetch failed|timed out|timeout/i.test(message)) return true;
  const statusCode = Number(error.statusCode || 0);
  return statusCode === 408 || statusCode === 429 || statusCode >= 500;
}

export async function withTransientRetry(operation, {
  maxAttempts = 2,
  delayMs = DEFAULT_DELAY_MS,
} = {}) {
  const attempts = Math.max(1, Number(maxAttempts) || 1);
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isTransientNetworkError(error)) throw error;
      await sleep(Math.max(0, Number(delayMs) || 0));
    }
  }
  throw lastError;
}
