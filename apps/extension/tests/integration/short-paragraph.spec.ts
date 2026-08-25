import { expect, test } from "./fixtures";
import { FIXTURE_ORIGIN } from "./ports";
import { SHORT_PARAGRAPH_MARKER } from "./mock-cms-server";

const LONG = (label: string): string =>
  `${label} padded well past the eighty character minimum threshold so the parser treats this as real article content.`;

async function dispatchClick(locator: import("@playwright/test").Locator): Promise<void> {
  await locator.evaluate((el) => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

/**
 * Edge Case (spec.md): a paragraph too short/low-vocabulary to support all
 * four exercise kinds still shows its German translation, and the panel
 * offers only the exercise kinds it can validly build — never a broken or
 * empty card.
 */
test("a short, low-vocabulary paragraph still translates and yields fewer than 4 valid exercise cards", async ({
  context,
  fixtureServer,
  enableSite,
}) => {
  await enableSite("127.0.0.1");
  fixtureServer.setHtml(`<!doctype html>
<html><body>
<article>
  <p id="target">${SHORT_PARAGRAPH_MARKER} ${LONG("Short paragraph variant")}</p>
</article>
</body></html>`);

  const page = await context.newPage();
  await page.goto(FIXTURE_ORIGIN);

  const target = page.locator("#target");
  await dispatchClick(target);

  // German translation still appears, marked vocabulary included.
  await expect(target.locator(".sw-vocab").first()).toBeVisible();
  await expect(target).toContainText("Kurzer Satz mit Kaffee.");

  const panel = page.locator(".sw-panel");
  await expect(panel).toBeVisible();

  const cards = panel.locator(".sw-card");
  await expect(cards).toHaveCount(1); // only word-pairing was buildable
  await expect(cards.first().locator(".sw-pairing")).toBeVisible();
  await expect(cards.first()).toContainText("Kaffee");
  await expect(cards.first()).toContainText("кофе");

  // No malformed/empty card markup.
  const cardText = await cards.first().textContent();
  expect(cardText?.trim().length).toBeGreaterThan(0);
});
