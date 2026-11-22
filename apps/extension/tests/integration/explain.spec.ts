import type { Worker } from "@playwright/test";
import { expect, test } from "./fixtures";
import { FIXTURE_ORIGIN } from "./ports";

/**
 * "Explain" in the side panel. As in selection-tools.spec.ts the menu handler is called directly
 * (Playwright can't click the native menu) and `sidepanel.html` is opened in a tab.
 */
const PAGE_HTML = `<!doctype html><html><body><article>
<p id="target">Dieser Absatz wird markiert und danach im Seitenbereich erklaert, ohne dass die Seite sich aendert.</p>
</article></body></html>`;

const SELECTED = "Ich habe einen Hund.";

async function storageValue(serviceWorker: Worker, key: string): Promise<Record<string, unknown>> {
  return serviceWorker.evaluate(
    async (k) => ((await chrome.storage.local.get(k))[k] ?? {}) as Record<string, unknown>,
    key,
  );
}

test("Explain shows translation, words and grammar, adds a word to the vocabulary and sends no page address", async ({
  context,
  fixtureServer,
  cmsServer,
  serviceWorker,
  extensionId,
  selectText,
  clickMenu,
}) => {
  fixtureServer.setHtml(PAGE_HTML);
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);
  const before = await tab.evaluate(() => document.documentElement.outerHTML);
  await selectText(tab, "#target");

  await clickMenu(tab, "explain", SELECTED);
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  await expect(panel.getByText("Перевод: У меня есть собака.")).toBeVisible();
  await expect(panel.locator(".sp-token")).toHaveCount(4);
  await expect(panel.locator(".side-grammar-title")).toHaveText("Аккузатив (прямое дополнение)");

  await panel.locator(".sp-token", { hasText: "Hund" }).click();
  await expect(panel.locator(".side-token")).toContainText("der Hund");
  await expect(panel.locator(".side-token")).toContainText("собака");

  await panel.getByRole("button", { name: "Add to vocabulary" }).click();
  await expect(panel.getByText("Added to vocabulary")).toBeVisible();
  expect(Object.keys(await storageValue(serviceWorker, "vocabulary"))).toContain("der hund");
  expect(await storageValue(serviceWorker, "reviewQueue")).toHaveProperty(
    ["der hund", "repetitions"],
    0,
  );

  // Only the fragment and the level went out. Not the page address.
  expect(cmsServer.requests.explain).toEqual([{ text: SELECTED, level: "A1-A2" }]);
  expect(JSON.stringify(cmsServer.requests)).not.toContain("127.0.0.1");
  const pending = await serviceWorker.evaluate(() => chrome.storage.session.get(null));
  expect(JSON.stringify(pending)).not.toContain("127.0.0.1");
  expect(await tab.evaluate(() => document.documentElement.outerHTML)).toBe(before);

  // The same fragment again comes from the local cache.
  await clickMenu(tab, "explain", SELECTED);
  await expect(panel.locator(".sp-token")).toHaveCount(4);
  expect(cmsServer.callCounts.explain).toBe(1);
});

test("an explanation that was opened before works offline", async ({
  context,
  fixtureServer,
  cmsServer,
  extensionId,
  clickMenu,
}) => {
  fixtureServer.setHtml(PAGE_HTML);
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  await clickMenu(tab, "explain", SELECTED);
  await expect(panel.locator(".sp-token")).toHaveCount(4);

  cmsServer.setMode("fail");
  await clickMenu(tab, "explain", SELECTED);
  await expect(panel.locator(".sp-token")).toHaveCount(4);
  expect(cmsServer.callCounts.explain).toBe(1);
});

test("a backend failure is explained in the panel and recorded without the text", async ({
  context,
  fixtureServer,
  cmsServer,
  serviceWorker,
  extensionId,
  clickMenu,
}) => {
  fixtureServer.setHtml(PAGE_HTML);
  cmsServer.setMode("fail");
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  await clickMenu(tab, "explain", SELECTED);
  await expect(panel.getByText("The translation service is unavailable right now.")).toBeVisible();
  await expect(panel.getByRole("button", { name: "Retry" })).toBeVisible();

  const queued = await serviceWorker.evaluate(
    async () =>
      ((await chrome.storage.local.get("metricsQueue")).metricsQueue ?? []) as Array<
        Record<string, unknown>
      >,
  );
  const sent = cmsServer.requests.events.flatMap((b) => b.events);
  const errors = [...sent, ...queued].filter((e) => e.name === "client_error");
  expect(errors).toContainEqual(
    expect.objectContaining({ error: "selection-panel-failed", httpStatus: 500 }),
  );
  expect(JSON.stringify(errors)).not.toContain("Hund");
});
