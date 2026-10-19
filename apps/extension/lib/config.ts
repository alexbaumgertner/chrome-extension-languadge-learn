/**
 * Backend base URL — the background worker's sole network egress point. `WXT_CMS_BASE_URL` at
 * build time wins (tests, staging); otherwise production builds use the deployed API and dev
 * builds a local server. Switch PRODUCTION_CMS_BASE_URL to the custom domain once its DNS is live.
 */
const PRODUCTION_CMS_BASE_URL = "https://sprachweise.vercel.app";
const DEV_CMS_BASE_URL = "http://localhost:8787";

const env = (import.meta as unknown as { env?: Record<string, string | boolean | undefined> }).env;

export const CMS_BASE_URL: string =
  (env?.WXT_CMS_BASE_URL as string | undefined) ??
  (env?.PROD ? PRODUCTION_CMS_BASE_URL : DEV_CMS_BASE_URL);
