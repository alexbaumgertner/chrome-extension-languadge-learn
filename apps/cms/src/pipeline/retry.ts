/**
 * FR-011: a provider call that times out or errors is retried once after a short timeout —
 * unless `shouldRetry` says the error is permanent (e.g. a rejected configuration).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  delayMs = 200,
  shouldRetry: (err: unknown) => boolean = () => true,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!shouldRetry(err)) throw err;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return fn();
  }
}
