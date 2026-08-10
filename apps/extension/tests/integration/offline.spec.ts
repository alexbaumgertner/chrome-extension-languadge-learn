import { expect, test } from "./fixtures";
import { FIXTURE_ORIGIN } from "./ports";

const LONG = (label: string): string =>
  `${label} padded well past the eighty character minimum threshold so the parser treats this as real article content.`;

async function dispatchClick(locator: import("@playwright/test").Locator): Promise<void> {
  await locator.evaluate((el) => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

test("previously translated content stays usable offline; a never-cached paragraph shows a distinct offline message", async ({
  context,
  fixtureServer,
  cmsServer,
  enableSite,
}) => {
  await enableSite("127.0.0.1");
  fixtureServer.setHtml(`<!doctype html>
<html><body>
<article>
  <p id="cached">${LONG("Offline cached variant")}</p>
  <p id="never-cached">${LONG("Offline never cached variant")}</p>
</article>
</body></html>`);

  const page = await context.newPage();
  await page.goto(FIXTURE_ORIGIN);

  // Online: translate and cache the first paragraph, solve one exercise.
  const cached = page.locator("#cached");
  await dispatchClick(cached);
  await expect(cached.locator(".sw-vocab").first()).toBeVisible();
  const translatedHtml = await cached.evaluate((el) => el.outerHTML);

  const panel = page.locator(".sw-panel");
  await expect(panel).toBeVisible();
  const fillBlank = panel.locator(".sw-card").filter({
    has: page.locator('input[placeholder="Type the missing word"]'),
  });
  await fillBlank.locator("input").fill("moechte");
  await fillBlank.locator("button.sw-submit").click();
  await expect(fillBlank.locator(".sw-feedback-ok")).toBeVisible();

  // Simulate the CMS being unreachable (stop the mock server) — the fixture article page
  // itself is still reachable, matching a real "offline w.r.t. the backend, page already
  // loaded/cached" scenario, and lets page.reload() itself still succeed.
  await cmsServer.close();
  await page.reload();

  // Revisit the previously translated paragraph — cached variant + exercises still work.
  const cachedAfterReload = page.locator("#cached");
  await dispatchClick(cachedAfterReload);
  await expect(cachedAfterReload.locator(".sw-vocab").first()).toBeVisible();
  const reTranslatedHtml = await cachedAfterReload.evaluate((el) => el.outerHTML);
  expect(reTranslatedHtml).toBe(translatedHtml);

  const panelAfterReload = page.locator(".sw-panel");
  await expect(panelAfterReload).toBeVisible();
  await expect(panelAfterReload.locator(".sw-card")).toHaveCount(4);

  // The fill-blank exercise was already answered before reload — that state
  // (answered=true, lastAttempt) must load straight from the cache, not reset.
  const fillBlank2 = panelAfterReload.locator(".sw-card").filter({
    has: page.locator('input[placeholder="Type the missing word"]'),
  });
  await expect(fillBlank2.locator(".sw-feedback-ok")).toBeVisible();
  await expect(fillBlank2.locator("input")).toBeDisabled();

  // Answering a not-yet-answered exercise offline requires no network — matching/progress
  // are fully local, since the exercise set is already cached in IndexedDB.
  const multipleChoice = panelAfterReload.locator(".sw-card").filter({
    has: page.locator(".sw-options"),
  });
  await multipleChoice.locator(".sw-opt", { hasText: "Ruhe" }).click();
  await expect(multipleChoice.locator(".sw-opt-correct")).toBeVisible();

  // A never-translated paragraph shows a distinct "unavailable offline" message, not the generic error.
  const neverCached = page.locator("#never-cached");
  await dispatchClick(neverCached);
  await expect(page.locator("text=unavailable offline")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("text=Couldn't translate")).toHaveCount(0);
});
