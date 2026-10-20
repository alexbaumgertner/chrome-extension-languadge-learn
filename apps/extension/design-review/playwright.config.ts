import { defineConfig } from "@playwright/test";

/** Captures the design-review screenshots (docs/design-review/). Run: pnpm design:capture */
export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.ts/,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 120_000,
  use: { actionTimeout: 10_000 },
  expect: { timeout: 10_000 },
});
