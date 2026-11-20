import type { Worker } from "@playwright/test";
import { expect, test } from "./fixtures";
import { FIXTURE_ORIGIN } from "./ports";

/**
 * The side-panel tools. Playwright can't click Chrome's native context menu, and `sidePanel.open`
 * needs a real user gesture, so these specs call the same `onMenuClicked` handler the menu calls
 * (see `clickMenu`) and open `sidepanel.html` in a tab, which is the page the side panel shows.
 * The handler's `sidePanel.open` is refused outside a gesture and logged; the selection still
 * reaches the panel, both when the panel is already listening (broadcast) and when it opens later
 * (pending selection).
 */
const PAGE_HTML = `<!doctype html><html><body><article>
<p id="target">Dieser Absatz wird markiert und danach im Seitenbereich uebersetzt, ohne dass die Seite sich aendert.</p>
</article></body></html>`;

const SELECTED = "Hello, I would like a coffee and some peace.";

async function recordedErrors(
  serviceWorker: Worker,
  sent: Array<{ events: Array<Record<string, unknown>> }>,
): Promise<Array<Record<string, unknown>>> {
  const queued = await serviceWorker.evaluate(
    async () =>
      ((await chrome.storage.local.get("metricsQueue")).metricsQueue ?? []) as Array<
        Record<string, unknown>
      >,
  );
  return [...sent.flatMap((b) => b.events), ...queued].filter((e) => e.name === "client_error");
}

test("Translate to my level shows the translation in the side panel and leaves the page alone", async ({
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

  // The choice comes first; the panel opens afterwards and finds it waiting.
  await clickMenu(tab, "translate-level", SELECTED);
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  await expect(panel.getByText(SELECTED)).toBeVisible();
  await expect(panel.locator(".side-german")).toContainText("Ich moechte einen Kaffee");
  await expect(panel.locator(".sp-word")).not.toHaveCount(0);

  await panel.locator(".sp-word", { hasText: "Ruhe" }).click();
  await expect(panel.locator(".side-gloss")).toContainText("спокойствие");

  // Only the selected text, the level and the topic went out. Not the page address.
  expect(cmsServer.requests.translate).toEqual([
    { text: SELECTED, level: "A1-A2", topic: "general" },
  ]);
  expect(JSON.stringify(cmsServer.requests)).not.toContain("127.0.0.1");
  const pending = await serviceWorker.evaluate(() => chrome.storage.session.get(null));
  expect(JSON.stringify(pending)).not.toContain("127.0.0.1");

  // The words are in the vocabulary like after a paragraph click.
  const vocabulary = await serviceWorker.evaluate(
    async () =>
      (await chrome.storage.local.get("vocabulary")).vocabulary as Record<string, unknown>,
  );
  expect(Object.keys(vocabulary)).toEqual(expect.arrayContaining(["moechte", "ruhe"]));

  // The page: untouched, no script injected, no overlay.
  expect(await tab.evaluate(() => document.documentElement.outerHTML)).toBe(before);

  // The same text again comes from the saved translation.
  await clickMenu(tab, "translate-level", SELECTED);
  await expect(panel.locator(".side-german")).toContainText("Ich moechte einen Kaffee");
  expect(cmsServer.requests.translate).toHaveLength(1);
});

test("a choice made while the panel is open replaces what it shows", async ({
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
  await expect(panel.locator(".side-empty")).toBeVisible();

  await clickMenu(tab, "translate-level", "Erster Text");
  await expect(panel.getByText("Erster Text", { exact: true }).first()).toBeVisible();
  await expect(panel.locator(".side-german")).toContainText("Ich moechte einen Kaffee");

  await clickMenu(tab, "translate-level", "Zweiter Text");
  await expect(panel.locator(".side-original")).toContainText("Zweiter Text");
  await expect(panel.locator(".side-german")).toContainText("(Zweiter Text)");
  expect(cmsServer.requests.translate).toHaveLength(2);
});

test("a selection over 600 characters is cut and the panel says so", async ({
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

  await clickMenu(tab, "translate-level", `  ${"a".repeat(700)}  `);
  await expect(panel.locator(".side-note").first()).toContainText("600");
  await expect(panel.locator(".side-german")).toBeVisible();
  expect(cmsServer.requests.translate).toEqual([
    expect.objectContaining({ text: "a".repeat(600) }),
  ]);
});

test("a backend failure is explained in the panel and recorded", async ({
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

  await clickMenu(tab, "translate-level", SELECTED);
  await expect(panel.getByText("The translation service is unavailable right now.")).toBeVisible();
  await expect
    .poll(() => recordedErrors(serviceWorker, cmsServer.requests.events))
    .toContainEqual(expect.objectContaining({ error: "selection-panel-failed", httpStatus: 500 }));

  // Retry once the backend is back.
  cmsServer.setMode("ok");
  await panel.getByRole("button", { name: "Retry" }).click();
  await expect(panel.locator(".side-german")).toBeVisible();
});

test("Read aloud shows the text with a play button and sends nothing to the backend", async ({
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

  await clickMenu(tab, "speak", "Guten Morgen, wie geht es dir?");
  await expect(panel.getByText("Guten Morgen, wie geht es dir?")).toBeVisible();
  await expect(panel.getByRole("button", { name: "Listen" })).toBeVisible();
  expect(cmsServer.callCounts.translate).toBe(0);
});

test("a blank selection opens nothing", async ({
  context,
  fixtureServer,
  serviceWorker,
  clickMenu,
}) => {
  fixtureServer.setHtml(PAGE_HTML);
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);
  await clickMenu(tab, "translate-level", "   \n ");
  await clickMenu(tab, "speak");
  const stored = await serviceWorker.evaluate(() => chrome.storage.session.get(null));
  expect(stored).toEqual({});
});
