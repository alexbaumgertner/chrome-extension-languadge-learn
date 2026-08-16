/**
 * In-process Map<cacheKey, Promise<T>> request-coalescing (research.md §5, FR-008).
 * The first call for a key creates and stores the pipeline promise; concurrent calls for the
 * same key await the same promise; the entry is deleted once it settles (success or failure)
 * so a later call starts fresh.
 */
export function createCoalescingMap<T>() {
  const inFlight = new Map<string, Promise<T>>();

  return {
    run(key: string, fn: () => Promise<T>): Promise<T> {
      const existing = inFlight.get(key);
      if (existing) return existing;

      const promise = fn().finally(() => {
        inFlight.delete(key);
      });
      inFlight.set(key, promise);
      return promise;
    },
  };
}
