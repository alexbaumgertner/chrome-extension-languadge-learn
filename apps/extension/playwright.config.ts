import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/integration",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 30_000,
  // Full Chromium (new headless) — the default headless shell can't load extensions.
  use: { channel: "chromium" },
});
