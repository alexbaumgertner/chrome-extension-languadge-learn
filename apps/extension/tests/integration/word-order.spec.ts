import { expect, test } from "./fixtures";
import { FIXTURE_ORIGIN } from "./ports";

const LONG = (label: string): string =>
  `${label} padded well past the eighty character minimum threshold so the parser treats this as real article content.`;

test("word order: build the sentence with the mouse, a wrong order shows the right one", async ({
  context,
  fixtureServer,
  cmsServer,
  selectText,
  clickMenu,
}) => {
  fixtureServer.setHtml(`<!doctype html>
<html><body><article><p id="target">${LONG("Word order wrong")}</p></article></body></html>`);
  cmsServer.setMode("word-order");
  const page = await context.newPage();
  await page.goto(FIXTURE_ORIGIN);
  await selectText(page, "#target");
  await clickMenu(page, "translate");
  const card = page.locator(".sw-card");
  await expect(card).toHaveCount(1);
  const bank = card.locator(".sw-order-bank button");
  const line = card.locator(".sw-order-line");
  const check = card.locator("button.sw-submit");

  await expect(bank).toHaveText(["Kaffee", "trinke", "jeden", "ich", "Morgen"]);
  await expect(check).toBeDisabled();

  // Place "Kaffee" first, then take it back: it returns to the bank.
  await bank.filter({ hasText: "Kaffee" }).click();
  await expect(line.locator("button")).toHaveText(["Kaffee"]);
  await line.locator("button", { hasText: "Kaffee" }).click();
  await expect(line.locator("button")).toHaveCount(0);
  await expect(bank).toHaveCount(5);

  // Wrong order: Kaffee at the front.
  for (const word of ["Kaffee", "ich", "trinke", "jeden", "Morgen"]) {
    await card.locator(".sw-order-bank button", { hasText: word }).click();
  }
  await expect(line).toContainText(".");
  await check.click();
  await expect(card.locator(".sw-feedback")).toContainText("Ich trinke jeden Morgen Kaffee.");
  await expect(line.locator("button").first()).toBeDisabled();
});

test("word order: works from the keyboard and focus stays inside the panel", async ({
  context,
  fixtureServer,
  cmsServer,
  selectText,
  clickMenu,
}) => {
  fixtureServer.setHtml(`<!doctype html>
<html><body><article><p id="target">${LONG("Word order keyboard")}</p></article></body></html>`);
  cmsServer.setMode("word-order");
  const page = await context.newPage();
  await page.goto(FIXTURE_ORIGIN);
  await selectText(page, "#target");
  await clickMenu(page, "translate");
  const card = page.locator(".sw-card");
  await expect(card).toHaveCount(1);
  const bank = card.locator(".sw-order-bank button");

  // The host page must keep no focus: the active element is the extension's shadow host (or the
  // body only if nothing took focus), never an element of the page's own content.
  const activeInsidePanel = (): Promise<boolean> =>
    page.evaluate(() => {
      const host = document.activeElement;
      return host !== null && host.shadowRoot !== null && host.shadowRoot.activeElement !== null;
    });

  await bank.filter({ hasText: "ich" }).focus();
  const expected = ["ich", "trinke", "jeden", "Morgen", "Kaffee"];
  for (const word of expected) {
    // The focused bank button is the next word; Enter moves it and focus follows it to the line.
    await card.locator(".sw-order-bank button", { hasText: new RegExp(`^${word}$`) }).focus();
    await page.keyboard.press("Enter");
    await expect.poll(activeInsidePanel).toBe(true);
    await expect(
      card.locator(".sw-order-line button", { hasText: new RegExp(`^${word}$`) }),
    ).toBeFocused();
  }
  await expect(card.locator(".sw-order-line button")).toHaveText(expected);

  // Tab leads from the last placed word to the check button; Enter submits.
  await card.locator("button.sw-submit").focus();
  await page.keyboard.press("Enter");
  await expect(card.locator(".sw-feedback-ok")).toBeVisible();
  await expect(card.locator(".sw-feedback")).toHaveCount(0);
});
