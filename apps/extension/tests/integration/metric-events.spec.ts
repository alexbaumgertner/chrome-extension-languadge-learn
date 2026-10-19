import { expect, test } from "./fixtures";
import { FIXTURE_ORIGIN } from "./ports";

const PARAGRAPH =
  "Metric events paragraph padded well past the eighty character minimum threshold so the parser treats this as real article content.";

test("translating sends a paragraph_translated event with the install ID; the translate request carries none", async ({
  context,
  fixtureServer,
  cmsServer,
  selectText,
  clickMenu,
  serviceWorker,
}) => {
  fixtureServer.setHtml(
    `<!doctype html><html><body><article><p id="target">${PARAGRAPH}</p></article></body></html>`,
  );
  const page = await context.newPage();
  await page.goto(FIXTURE_ORIGIN);
  await selectText(page, "#target");
  await clickMenu(page, "translate");
  await expect(page.locator("#target .sw-vocab").first()).toBeVisible();

  const installId = await serviceWorker.evaluate(
    async () => (await chrome.storage.local.get("installId")).installId as string,
  );
  expect(installId).toMatch(/^[0-9a-f-]{36}$/);

  await expect
    .poll(() => cmsServer.requests.events.flatMap((b) => b.events.map((e) => e.name)))
    .toEqual(["install", "paragraph_translated"]);
  expect(cmsServer.requests.events.every((b) => b.installId === installId)).toBe(true);
  const translated = cmsServer.requests.events.flatMap((b) => b.events)[1]!;
  expect(translated).toMatchObject({ cache: "miss" });
  expect(translated.latencyMs).toEqual(expect.any(Number));

  // Constitution III: page text travels without the ID, the ID travels without page text.
  expect(cmsServer.requests.translate).toHaveLength(1);
  expect(Object.keys(cmsServer.requests.translate[0] as object).sort()).toEqual([
    "level",
    "text",
    "topic",
  ]);
  expect(JSON.stringify(cmsServer.requests.events)).not.toContain("Metric events paragraph");
  expect(JSON.stringify(cmsServer.requests.events)).not.toContain("127.0.0.1");
});
