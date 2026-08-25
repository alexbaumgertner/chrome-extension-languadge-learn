/** FR-011: a provider call that times out or errors is retried once after a short timeout. */
export async function withRetry<T>(fn: () => Promise<T>, delayMs = 200): Promise<T> {
  try {
    return await fn();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return fn();
  }
}
