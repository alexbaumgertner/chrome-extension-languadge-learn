/** Payload CMS base URL — the background worker's sole network egress point. */
export const CMS_BASE_URL: string =
  (import.meta as unknown as { env?: Record<string, string> }).env?.WXT_CMS_BASE_URL ??
  "http://localhost:8787";
