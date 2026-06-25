export async function waitForBuilderJob({
  jobId,
  pollIntervalMs,
  maxWaitMs,
  terminalStatuses,
  fetchJob,
}) {
  const startedAt = Date.now();
  for (;;) {
    const job = await fetchJob(jobId);
    const status = job?.status;
    if (terminalStatuses.has(status)) return job;
    if (Date.now() - startedAt > maxWaitMs) {
      throw new Error(`Timeout waiting for builder job ${jobId} after ${Math.round(maxWaitMs / 60000)} minute(s)`);
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}
