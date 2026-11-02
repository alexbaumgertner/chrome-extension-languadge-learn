import {
  test as base,
  chromium,
  type BrowserContext,
  type Page,
  type Worker,
} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixtureServer } from "./fixture-server";
import { createMockCmsServer } from "./mock-cms-server";
import { CMS_PORT, FIXTURE_ORIGIN, FIXTURE_PORT } from "./ports";
import { localeLaunchOptions, type UiLocale } from "./locale";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, "../../.output/chrome-mv3");

type Fixtures = {
  /** The browser language the extension UI is shown in. Override with `test.use({ uiLocale })`. */
  uiLocale: UiLocale;
  fixtureServer: ReturnType<typeof createFixtureServer>;
  cmsServer: ReturnType<typeof createMockCmsServer>;
  context: BrowserContext;
  serviceWorker: Worker;
  extensionId: string;
  /**
   * Selects text in the page like a mouse drag: all of `selector`'s text, or only `part` of it.
   * With `to`, from the start of `selector` to the end of `to`.
   */
  selectText: (
    page: Page,
    selector: string,
    opts?: { part?: string; to?: string },
  ) => Promise<void>;
  /**
   * Picks one of the extension's context-menu items on `page`, as a right-click would. The side-panel
   * items ("translate-level", "speak") take `selectionText` from the caller, like Chrome's click data.
   */
  clickMenu: (
    page: Page,
    item: "translate" | "restore" | "translate-level" | "speak",
    selectionText?: string,
  ) => Promise<void>;
  /** Presses the extension's "translate selection" keyboard shortcut on `page`. */
  pressShortcut: (page: Page) => Promise<void>;
};

const MENU_IDS = {
  translate: "sprachweise-translate",
  restore: "sprachweise-restore",
  "translate-level": "sprachweise-translate-level",
  speak: "sprachweise-speak",
} as const;

/** The tab showing the fixture origin (each test opens one page on it). */
async function fixtureTab(serviceWorker: Worker): Promise<chrome.tabs.Tab> {
  return serviceWorker.evaluate(async (pattern) => {
    const tabs = await chrome.tabs.query({ url: pattern });
    const tab = tabs.find((t) => t.active) ?? tabs[0];
    if (!tab) throw new Error(`no tab open on ${pattern}`);
    return tab;
  }, `${FIXTURE_ORIGIN}/*`);
}

interface TestHooks {
  onMenuClicked(info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab): void;
  onCommand(command: string, tab: chrome.tabs.Tab): void;
}

export const test = base.extend<Fixtures>({
  uiLocale: ["en", { option: true }],

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

  context: async (
    { fixtureServer: _fixtureServer, cmsServer: _cmsServer, headless, channel, uiLocale },
    use,
  ) => {
    if (!fs.existsSync(EXTENSION_PATH)) {
      throw new Error(
        `Extension build not found at ${EXTENSION_PATH}. Run "pnpm test:integration" (it builds first) rather than "playwright test" directly.`,
      );
    }
    // Extensions need the full Chromium build (channel "chromium", set in
    // playwright.config.ts): the default chromium-headless-shell silently never
    // registers the MV3 service worker. Full Chromium loads them in new headless mode.
    // A fixed language, so the copy the specs look for doesn't depend on the machine's locale.
    const locale = localeLaunchOptions(uiLocale);
    const context = await chromium.launchPersistentContext("", {
      channel,
      headless,
      env: locale.env,
      locale: locale.locale,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        ...locale.args,
      ],
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

  // eslint-disable-next-line no-empty-pattern -- Playwright requires the literal destructuring pattern here.
  selectText: async ({}, use) => {
    await use(async (page, selector, opts = {}) => {
      await page.evaluate(
        ({ selector, part, to }) => {
          const el = document.querySelector(selector)!;
          const range = document.createRange();
          if (part) {
            // The text node holding `part`, so the range is exact.
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            for (let n = walker.nextNode(); n; n = walker.nextNode()) {
              const at = n.textContent!.indexOf(part);
              if (at === -1) continue;
              range.setStart(n, at);
              range.setEnd(n, at + part.length);
              break;
            }
            if (range.collapsed) throw new Error(`"${part}" not found in ${selector}`);
          } else {
            range.setStartBefore(el.firstChild ?? el);
            const end = to ? document.querySelector(to)! : el;
            range.setEndAfter(end.lastChild ?? end);
          }
          const selection = window.getSelection()!;
          selection.removeAllRanges();
          selection.addRange(range);
        },
        { selector, part: opts.part, to: opts.to },
      );
    });
  },

  clickMenu: async ({ serviceWorker }, use) => {
    await use(async (_page, item, selectionText) => {
      const tab = await fixtureTab(serviceWorker);
      await serviceWorker.evaluate(
        ({ tab, menuItemId, selectionText }) => {
          const hooks = (globalThis as unknown as { sprachweiseTest: TestHooks }).sprachweiseTest;
          hooks.onMenuClicked(
            { menuItemId, frameId: 0, editable: false, pageUrl: tab.url ?? "", selectionText },
            tab,
          );
        },
        { tab, menuItemId: MENU_IDS[item], selectionText },
      );
    });
  },

  pressShortcut: async ({ serviceWorker }, use) => {
    await use(async () => {
      const tab = await fixtureTab(serviceWorker);
      await serviceWorker.evaluate((tab) => {
        const hooks = (globalThis as unknown as { sprachweiseTest: TestHooks }).sprachweiseTest;
        hooks.onCommand("translate-selection", tab);
      }, tab);
    });
  },
});

export const expect = test.expect;
