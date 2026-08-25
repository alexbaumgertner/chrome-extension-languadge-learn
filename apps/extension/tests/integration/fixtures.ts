import { test as base, chromium, type BrowserContext, type Worker } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixtureServer } from "./fixture-server";
import { createMockCmsServer } from "./mock-cms-server";
import { CMS_PORT, FIXTURE_PORT } from "./ports";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, "../../.output/chrome-mv3");

type Fixtures = {
  fixtureServer: ReturnType<typeof createFixtureServer>;
  cmsServer: ReturnType<typeof createMockCmsServer>;
  context: BrowserContext;
  serviceWorker: Worker;
  extensionId: string;
  /** Seeds chrome.storage.local's siteRules so the given hostname is treated as enabled. */
  enableSite: (hostname: string) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern -- Playwright requires the literal destructuring pattern here.
  fixtureServer: async ({}, use) => {
    const server = createFixtureServer();
    await server.listen(FIXTURE_PORT);
    await use(server);
    await server.close();
  },

  // eslint-disable-next-line no-empty-pattern -- Playwright requires the literal destructuring pattern here.
  cmsServer: async ({}, use) => {
    const server = createMockCmsServer();
    await server.listen(CMS_PORT);
    await use(server);
    await server.close();
  },

  context: async ({ fixtureServer: _fixtureServer, cmsServer: _cmsServer }, use) => {
    if (!fs.existsSync(EXTENSION_PATH)) {
      throw new Error(
        `Extension build not found at ${EXTENSION_PATH}. Run "pnpm test:integration" (it builds first) rather than "playwright test" directly.`,
      );
    }
    // Headless Chromium silently fails to load unpacked MV3 extensions with
    // this Playwright/Chrome-for-Testing combination (no service worker ever
    // registers, no error) — headed mode is required for extension tests.
    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
    });
    await use(context);
    await context.close();
  },

  serviceWorker: async ({ context }, use) => {
    let worker = context.serviceWorkers()[0];
    worker ??= await context.waitForEvent("serviceworker");
    await use(worker);
  },

  extensionId: async ({ serviceWorker }, use) => {
    await use(new URL(serviceWorker.url()).host);
  },

  enableSite: async ({ serviceWorker }, use) => {
    await use(async (hostname: string) => {
      await serviceWorker.evaluate(async (h) => {
        const rules = (await chrome.storage.local.get("siteRules")).siteRules ?? {};
        rules[h] = { hostname: h, status: "enabled", grantedPermissionOrigin: null };
        await chrome.storage.local.set({ siteRules: rules });
      }, hostname);
    });
  },
});

export const expect = test.expect;
