import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect, test, type Page } from "@playwright/test";
import { CMS_PORT, FIXTURE_ORIGIN, FIXTURE_PORT } from "../tests/integration/ports";
import { localeLaunchOptions, msg } from "../tests/integration/locale";
import { ARTICLE, createStoreMockBackend } from "./mock-backend";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, "../.output/chrome-mv3");
const ICON_DIR = path.resolve(__dirname, "../public/icon");
const ASSET_DIR = path.resolve(__dirname, "../../../docs/store-assets");

// Brand tokens from design_handoff_sprachweise (Organic design system).
const ACCENT = "#c67139";
const CREAM = "#f5ead8";
const INK = "#643312";
const FONTS =
  "https://fonts.googleapis.com/css2?family=Caprasimo&family=Figtree:wght@400;600&display=swap";

async function renderHtml(page: Page, html: string): Promise<void> {
  await page.setContent(
    `<!doctype html><html><head><link rel="stylesheet" href="${FONTS}"><style>
      html, body { margin: 0; background: transparent; }
      .logo { display: grid; place-items: center; border-radius: 50%; background: ${ACCENT};
              color: ${CREAM}; font-family: Caprasimo, serif; line-height: 1; }
    </style></head><body>${html}</body></html>`,
  );
  await page.evaluate(() => document.fonts.ready);
}

test("icons and the small promo tile", async ({ page }) => {
  fs.mkdirSync(ICON_DIR, { recursive: true });
  fs.mkdirSync(ASSET_DIR, { recursive: true });

  // Chrome Web Store: the 128px icon is 96px of artwork with 16px transparent padding.
  for (const size of [16, 32, 48, 128]) {
    const art = size === 128 ? 96 : size;
    const pad = (size - art) / 2;
    await page.setViewportSize({ width: size, height: size });
    await renderHtml(
      page,
      `<div style="padding:${pad}px"><div class="logo" style="width:${art}px;height:${art}px;font-size:${Math.round(art * 0.62)}px">S</div></div>`,
    );
    await page.screenshot({ path: path.join(ICON_DIR, `${size}.png`), omitBackground: true });
  }

  await page.setViewportSize({ width: 440, height: 280 });
  await renderHtml(
    page,
    `<div style="width:440px;height:280px;background:${CREAM};display:flex;flex-direction:column;
                 align-items:center;justify-content:center;gap:14px;font-family:Figtree,sans-serif">
       <div class="logo" style="width:84px;height:84px;font-size:52px">S</div>
       <div style="font-family:Caprasimo,serif;font-size:34px;color:${INK}">Sprachweise</div>
       <div style="font-size:17px;color:${INK}">Читайте интернет — по-немецки, на своём уровне</div>
     </div>`,
  );
  await page.screenshot({ path: path.join(ASSET_DIR, "promo-small-440x280.png") });
});

function articleHtml(): string {
  const paragraphs = ARTICLE.paragraphs.map((p, i) => `<p id="p${i}">${p}</p>`).join("\n");
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${ARTICLE.title}</title>
  <style>
    body { margin: 0; background: #fbfaf7; color: #222; font: 19px/1.65 Georgia, serif; }
    header { border-bottom: 1px solid #e6e1d8; padding: 18px 0; background: #fff; }
    header div, main { max-width: 660px; margin: 0 0 0 150px; }
    header b { font: 600 15px system-ui, sans-serif; letter-spacing: .08em; text-transform: uppercase; }
    h1 { font-size: 38px; line-height: 1.2; margin: 36px 0 6px; }
    .by { font: 14px system-ui, sans-serif; color: #777; margin-bottom: 26px; }
    p { margin: 0 0 22px; }
  </style></head>
  <body><header><div><b>Путевые заметки</b></div></header>
  <main><h1>${ARTICLE.title}</h1><div class="by">Анна К. · 6 мин чтения</div>${paragraphs}</main>
  </body></html>`;
}

test("1280×800 screenshots", async () => {
  test.skip(!fs.existsSync(EXTENSION_PATH), "run via pnpm store:assets (builds the extension)");
  fs.mkdirSync(ASSET_DIR, { recursive: true });

  const site = http.createServer((_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(articleHtml());
  });
  await new Promise<void>((resolve) => site.listen(FIXTURE_PORT, "127.0.0.1", resolve));
  const backend = createStoreMockBackend();
  await backend.listen(CMS_PORT);

  // The store listing's screenshots show the Russian UI, as most learners see it.
  const locale = localeLaunchOptions("ru");
  const context = await chromium.launchPersistentContext("", {
    channel: "chromium", // full Chromium (new headless); the default headless shell can't load extensions
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    env: locale.env,
    locale: locale.locale,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      ...locale.args,
    ],
  });
  try {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    const page = await context.newPage();
    await page.goto(FIXTURE_ORIGIN);
    const first = page.locator("#p0");
    // Select the first paragraph and pick "Translate to German" (the test build exposes the menu
    // handler, since Playwright can't click Chrome's native context menu).
    await first.evaluate((el) => getSelection()!.selectAllChildren(el));
    await worker.evaluate(async (pattern) => {
      const [tab] = await chrome.tabs.query({ url: pattern });
      const hooks = (
        globalThis as unknown as {
          sprachweiseTest: {
            onMenuClicked(info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab): void;
          };
        }
      ).sprachweiseTest;
      hooks.onMenuClicked(
        { menuItemId: "sprachweise-translate", frameId: 0, editable: false, pageUrl: tab!.url! },
        tab!,
      );
    }, `${FIXTURE_ORIGIN}/*`);
    await expect(first.locator(".sw-vocab").first()).toBeVisible();
    const panel = page.locator(".sw-panel");
    await expect(panel.locator(".sw-card").first()).toBeVisible();
    await page.mouse.move(0, 0);
    await page.screenshot({
      path: path.join(ASSET_DIR, "screenshot-1-paragraph-and-exercises.png"),
    });

    // Solve the fill-in-the-blank (counts towards progress), then show a word's gloss.
    const fillBlank = panel
      .locator(".sw-card")
      .filter({ has: page.locator(`input[placeholder="${msg("ru", "fillBlankPlaceholder")}"]`) });
    await fillBlank.locator("input").fill("Wochenende");
    await fillBlank.locator("button.sw-submit").click();
    await expect(fillBlank.locator(".sw-feedback-ok")).toBeVisible();
    await panel.getByRole("button", { name: msg("ru", "panelCollapse") }).click();
    await first.locator(".sw-vocab", { hasText: "Fernsehturm" }).click();
    await expect(page.getByText("телебашня")).toBeVisible();
    await page.screenshot({ path: path.join(ASSET_DIR, "screenshot-2-word-gloss.png") });

    const extensionId = new URL(worker.url()).host;
    const options = await context.newPage();
    await options.goto(`chrome-extension://${extensionId}/options.html`);
    await options.waitForTimeout(500);
    await options.screenshot({ path: path.join(ASSET_DIR, "screenshot-3-progress.png") });
  } finally {
    await context.close();
    await backend.close();
    await new Promise<void>((resolve) => site.close(() => resolve()));
  }
});
