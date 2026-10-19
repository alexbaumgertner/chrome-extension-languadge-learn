import { defineConfig } from "@playwright/test";

/** Renders Chrome Web Store assets (icons, promo tile, screenshots). Run: pnpm store:assets */
export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.ts/,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 60_000,
  use: { actionTimeout: 10_000 },
  expect: { timeout: 10_000 },
});
