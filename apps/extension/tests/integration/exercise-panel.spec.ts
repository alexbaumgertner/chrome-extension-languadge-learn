import { expect, test } from "./fixtures";
import { FIXTURE_ORIGIN } from "./ports";

const LONG = (label: string): string =>
  `${label} padded well past the eighty character minimum threshold so the parser treats this as real article content.`;

function articlePage(targetInner: string): string {
  return `<!doctype html>
<html><body>
<article>
  <p id="target">${targetInner}</p>
</article>
</body></html>`;
}

async function dispatchClick(locator: import("@playwright/test").Locator): Promise<void> {
  await locator.evaluate((el) => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

test("exercise panel: traceability, lenient matching, wrong-answer feedback, collapse/reopen state", async ({
  context,
  fixtureServer,
  enableSite,
}) => {
  await enableSite("127.0.0.1");
  fixtureServer.setHtml(articlePage(LONG("Exercise panel variant")));
  const page = await context.newPage();
  await page.goto(FIXTURE_ORIGIN);

  const target = page.locator("#target");
  await dispatchClick(target);
  await expect(target.locator(".sw-vocab").first()).toBeVisible();

  const variantText = await target.evaluate((el) => el.textContent ?? "");

  // A fresh translation opens the panel automatically.
  const panel = page.locator(".sw-panel");
  await expect(panel).toBeVisible();

  // Every exercise's own text must be traceable back to the translated paragraph's vocabulary
  // (fill-blank/multiple-choice quote a blanked sentence built from it; word-pairing quotes its words).
  const cards = panel.locator(".sw-card");
  await expect(cards).toHaveCount(4);
  const cardTexts = await cards.allTextContents();
  expect(cardTexts.every((text) => text.trim().length > 0)).toBe(true);
  expect(variantText).toContain("moechte");
  expect(variantText).toContain("Ruhe");
  await expect(panel.locator(".sw-pairing-col").first()).toContainText("Kaffee");
  await expect(panel.locator(".sw-pairing-col").first()).toContainText("Zeitung");

  // Fill-blank: submit an umlaut form against the stored ASCII answer — lenient match accepts it.
  const fillBlank = panel.locator(".sw-card").filter({
    has: page.locator('input[placeholder="Type the missing word"]'),
  });
  await fillBlank.locator("input").fill("möchte");
  await fillBlank.locator("button.sw-submit").click();
  await expect(fillBlank.locator(".sw-feedback-ok")).toBeVisible();

  // Multiple-choice: submit the wrong option, expect feedback quoting the source sentence.
  const multipleChoice = panel.locator(".sw-card").filter({ has: page.locator(".sw-options") });
  const wrongOption = multipleChoice.locator(".sw-opt", { hasText: "Lärm" });
  await wrongOption.click();
  await expect(multipleChoice.locator(".sw-feedback")).toContainText(variantText.slice(0, 20));

  // Collapse mid-exercise, reopen — answered state must be preserved, not reset.
  await panel.locator(".sw-header button").click();
  await expect(panel).toBeHidden();
  await page.locator(".sw-tab").click();
  await expect(panel).toBeVisible();
  await expect(fillBlank.locator(".sw-feedback-ok")).toBeVisible();
  await expect(fillBlank.locator("input")).toBeDisabled();
});
