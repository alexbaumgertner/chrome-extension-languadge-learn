import { expect, test } from "./fixtures";
import { FIXTURE_ORIGIN } from "./ports";

const LONG = (label: string): string =>
  `${label} padded well past the eighty character minimum threshold so the parser treats this as real article content.`;

function articlePage(): string {
  return `<!doctype html>
<html><body>
<article>
  <p id="target">${LONG("Site gating variant")}</p>
</article>
</body></html>`;
}

async function dispatchClick(locator: import("@playwright/test").Locator): Promise<void> {
  await locator.evaluate((el) => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

test("a never-enabled site stays fully inert; enabling and disabling via the popup UI takes effect", async ({
  context,
  fixtureServer,
  extensionId,
}) => {
  fixtureServer.setHtml(articlePage());
  const page = await context.newPage();
  await page.goto(FIXTURE_ORIGIN);

  // Fresh install: no siteRule for this hostname (undecided) — clicking must do nothing at all.
  const target = page.locator("#target");
  const before = await target.evaluate((el) => el.outerHTML);
  await dispatchClick(target);
  await page.waitForTimeout(300);
  const afterClick = await target.evaluate((el) => el.outerHTML);
  expect(afterClick).toBe(before);
  await expect(page.locator(".sw-panel")).toHaveCount(0);

  // Enable via the actual popup UI (a real user gesture path), then reload the article page.
  // The popup reads the *active* tab's hostname via chrome.tabs.query({active: true}); a real
  // toolbar popup never itself becomes "the active tab", but opening popup.html as a plain
  // page via Playwright does — so re-focus the fixture page, then reload the popup so its
  // query re-runs while the fixture tab is the active one.
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.bringToFront();
  await popup.reload();
  const enableButton = popup.getByRole("button", { name: /enable on this site/i });
  await expect(enableButton).toBeVisible();
  await enableButton.click();
  await expect(popup.getByRole("button", { name: /disable on this site/i })).toBeVisible();
  await popup.close();

  await page.reload();
  const targetAfterEnable = page.locator("#target");
  const beforeSecondClick = await targetAfterEnable.evaluate((el) => el.outerHTML);
  await dispatchClick(targetAfterEnable);
  await expect(targetAfterEnable.locator(".sw-vocab").first()).toBeVisible();
  const translatedHtml = await targetAfterEnable.evaluate((el) => el.outerHTML);
  expect(translatedHtml).not.toBe(beforeSecondClick);

  // Disable via the popup while the translated page is still live — the paragraph must revert.
  const popup2 = await context.newPage();
  await popup2.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.bringToFront();
  await popup2.reload();
  await popup2.getByRole("button", { name: /disable on this site/i }).click();
  await popup2.close();

  await expect(targetAfterEnable.locator(".sw-vocab")).toHaveCount(0, { timeout: 5000 });
  const revertedHtml = await targetAfterEnable.evaluate((el) => el.outerHTML);
  expect(revertedHtml).toBe(beforeSecondClick);
});
