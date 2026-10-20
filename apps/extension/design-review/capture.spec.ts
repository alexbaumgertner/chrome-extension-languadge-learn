import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect, test, type Locator, type Page, type Worker } from "@playwright/test";
import { CMS_PORT, FIXTURE_ORIGIN, FIXTURE_PORT } from "../tests/integration/ports";
import { localeLaunchOptions, msg, type UiLocale } from "../tests/integration/locale";
import {
  ARTICLE,
  GERMAN,
  GLOSSES,
  createStoreMockBackend,
  type StoreMockFailure,
} from "../store/mock-backend";

/**
 * Captures every UI surface for the design review (docs/design-review/<phase>/<locale>/), with
 * the browser set to DESIGN_REVIEW_LOCALE (ru by default, as most learners are). Run it once on
 * the old UI with DESIGN_REVIEW_PHASE=before and once on the new one with =after. Copy is looked
 * up in public/_locales, so the spec follows the UI's language. Run: pnpm design:capture
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, "../.output/chrome-mv3");
const PHASE = process.env.DESIGN_REVIEW_PHASE ?? "after";
const LOCALE = (process.env.DESIGN_REVIEW_LOCALE ?? "ru") as UiLocale;
const OUT_DIR = path.resolve(__dirname, "../../../docs/design-review", PHASE, LOCALE);
const m = (key: string, ...subs: string[]): string => msg(LOCALE, key, ...subs);

const LONG_PARAGRAPH = `${ARTICLE.paragraphs.join(" ")} `.repeat(4);

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
  <main><h1>${ARTICLE.title}</h1><div class="by">Анна К. · 6 мин чтения</div>${paragraphs}
  <p id="long">${LONG_PARAGRAPH}</p></main>
  </body></html>`;
}

async function shoot(page: Page, name: string): Promise<void> {
  await page.mouse.move(0, 0);
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
}

/** A screenshot of `locator` with some of the page around it. */
async function shootAround(page: Page, locator: Locator, name: string, pad = 32): Promise<void> {
  const box = (await locator.boundingBox())!;
  const viewport = page.viewportSize()!;
  const x = Math.max(0, box.x - pad);
  const y = Math.max(0, box.y - pad);
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: path.join(OUT_DIR, `${name}.png`),
    clip: {
      x,
      y,
      width: Math.min(viewport.width - x, box.width + pad * 2),
      height: Math.min(viewport.height - y, box.height + pad * 2),
    },
  });
}

async function select(page: Page, selector: string | null): Promise<void> {
  await page.evaluate((selector) => {
    const selection = getSelection()!;
    selection.removeAllRanges();
    if (selector) selection.selectAllChildren(document.querySelector(selector)!);
  }, selector);
}

/** Picks "Translate to German" as a right-click would (the test build exposes the handler). */
async function translate(worker: Worker): Promise<void> {
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
}

test("design review screenshots", async () => {
  test.skip(!fs.existsSync(EXTENSION_PATH), "run via pnpm design:capture (builds the extension)");
  test.setTimeout(120_000);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const site = http.createServer((_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(articleHtml());
  });
  await new Promise<void>((resolve) => site.listen(FIXTURE_PORT, "127.0.0.1", resolve));
  let failing: StoreMockFailure = null;
  const backend = createStoreMockBackend(() => failing);
  await backend.listen(CMS_PORT);

  const locale = localeLaunchOptions(LOCALE);
  const context = await chromium.launchPersistentContext("", {
    channel: "chromium",
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

    // Info notice: the menu without a selection.
    await select(page, null);
    await translate(worker);
    const infoNotice = page.getByText(m("noticeSelectFirst"));
    await expect(infoNotice).toBeVisible();
    await shootAround(page, infoNotice, "notice-info", 48);

    // Error notice: a selection over the limit.
    await select(page, "#long");
    await translate(worker);
    // The message up to its character count, e.g. "The selection is too long".
    const tooLongStart = m("noticeSelectionTooLong").split("(")[0]!.trim();
    const tooLong = page.getByText(tooLongStart, { exact: false });
    await expect(tooLong).toBeVisible();
    await tooLong.scrollIntoViewIfNeeded();
    await shootAround(page, tooLong, "notice-too-long", 48);
    await page.evaluate(() => scrollTo(0, 0));

    // The panel with four fresh exercises.
    const first = page.locator("#p0");
    await select(page, "#p0");
    await translate(worker);
    await expect(first.locator(".sw-vocab").first()).toBeVisible();
    const panel = page.locator(".sw-panel");
    await expect(panel.locator(".sw-card")).toHaveCount(4);
    await page.waitForTimeout(300);
    await shoot(page, "panel-exercises");

    // Answered: fill-blank right, multiple choice wrong, one pair right and one wrong.
    const fillBlank = panel
      .locator(".sw-card")
      .filter({ has: page.locator(`input[placeholder="${m("fillBlankPlaceholder")}"]`) });
    const blanked = (await fillBlank.locator("p").first().textContent()) ?? "";
    const answer = GLOSSES.map((g) => g.german).find((w) =>
      GERMAN.includes(blanked.replace(/_+/, w).trim()),
    );
    await fillBlank.locator("input").fill(answer ?? "Wochenende");
    await fillBlank.locator("button.sw-submit").click();

    const multipleChoice = panel.locator(".sw-card").filter({ has: page.locator(".sw-options") });
    const mcSentence = (await multipleChoice.locator("p").first().textContent()) ?? "";
    const options = await multipleChoice.locator(".sw-options button").allTextContents();
    const wrong = options.find((o) => !GERMAN.includes(mcSentence.replace(/_+/, o.trim()).trim()));
    await multipleChoice.locator(".sw-options button", { hasText: wrong ?? options[0]! }).click();

    const pairing = panel.locator(".sw-card").filter({ has: page.locator(".sw-pairing") });
    const germanCol = pairing.locator(".sw-pairing-col").first();
    const russianCol = pairing.locator(".sw-pairing-col").last();
    const germanWords = (await germanCol.locator("button").allTextContents()).map((w) => w.trim());
    const meaning = (german: string) =>
      GLOSSES.find((g) => g.german === german || g.lemma === german)?.russian ?? "?";
    await germanCol.locator("button", { hasText: germanWords[0]! }).click();
    await russianCol.locator("button", { hasText: meaning(germanWords[0]!) }).click();
    await germanCol.locator("button", { hasText: germanWords[1]! }).click();
    await russianCol.locator("button", { hasText: meaning(germanWords[2]!) }).click();
    await germanCol.locator("button", { hasText: germanWords[2]! }).click();
    await expect(multipleChoice.locator(".sw-feedback")).toBeVisible();
    await page.waitForTimeout(300);
    await shoot(page, "panel-answered");

    // The report footer after sending.
    await panel.getByRole("button", { name: m("reportButton") }).click();
    const thanks = panel.getByText(m("reportSent"));
    await expect(thanks).toBeVisible();
    await shootAround(page, thanks, "report-sent", 24);

    // Collapsed tab, then a word's gloss.
    await panel.getByRole("button", { name: m("panelCollapse") }).click();
    await expect(page.locator(".sw-tab")).toBeVisible();
    await shoot(page, "panel-collapsed");
    await first.locator(".sw-vocab", { hasText: "Fernsehturm" }).click();
    const gloss = page.getByText("телебашня");
    await expect(gloss).toBeVisible();
    await shootAround(page, gloss, "vocab-tooltip", 64);
    await page.mouse.click(5, 5);

    // Error notice: the backend is down.
    failing = "translate";
    await select(page, "#p1");
    await translate(worker);
    const unavailable = page.getByText(m("noticeUnavailable"));
    await expect(unavailable).toBeVisible();
    await shootAround(page, unavailable, "notice-error", 48);

    // Translated, but no exercises: the tab still offers the report.
    failing = "exercises";
    await select(page, "#p2");
    await translate(worker);
    await expect(page.locator(".sw-tab", { hasText: m("panelTabNoExercises") })).toBeVisible();
    await shoot(page, "panel-no-exercises");
    failing = null;

    const extensionId = new URL(worker.url()).host;
    const options_ = await context.newPage();
    await options_.goto(`chrome-extension://${extensionId}/options.html`);
    await expect(options_.locator(".stats")).toContainText(m("progressStreakLabel"));
    await options_.waitForTimeout(500);
    await options_.screenshot({ path: path.join(OUT_DIR, "options-progress.png") });
    await options_.getByRole("button", { name: m("optionsTabSettings") }).click();
    await expect(options_.getByRole("heading", { name: m("settingsHeading") })).toBeVisible();
    await options_.waitForTimeout(300);
    await options_.screenshot({ path: path.join(OUT_DIR, "options-settings.png") });

    const popup = await context.newPage();
    await popup.setViewportSize({ width: 420, height: 480 });
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(popup.getByText(m("popupSolvedToday"))).toBeVisible();
    await popup.waitForTimeout(500);
    await popup.locator("body").screenshot({ path: path.join(OUT_DIR, "popup.png") });
  } finally {
    await context.close();
    await backend.close();
    await new Promise<void>((resolve) => site.close(() => resolve()));
  }
});
