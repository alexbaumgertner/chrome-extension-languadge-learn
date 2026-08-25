import { expect, test } from "./fixtures";
import { FIXTURE_ORIGIN } from "./ports";

const LONG = (label: string): string =>
  `${label} padded well past the eighty character minimum threshold so the parser treats this as real article content.`;

async function dispatchClick(locator: import("@playwright/test").Locator): Promise<void> {
  await locator.evaluate((el) => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

test("solving exercises updates streak, active vocabulary, accuracy, and the review queue", async ({
  context,
  fixtureServer,
  enableSite,
  extensionId,
}) => {
  await enableSite("127.0.0.1");
  fixtureServer.setHtml(`<!doctype html>
<html><body><article><p id="target">${LONG("Progress update variant")}</p></article></body></html>`);
  const page = await context.newPage();
  await page.goto(FIXTURE_ORIGIN);

  const target = page.locator("#target");
  await dispatchClick(target);
  await expect(target.locator(".sw-vocab").first()).toBeVisible();

  const panel = page.locator(".sw-panel");
  await expect(panel).toBeVisible();

  // Fill-blank (correct).
  const fillBlank = panel.locator(".sw-card").filter({
    has: page.locator('input[placeholder="Type the missing word"]'),
  });
  await fillBlank.locator("input").fill("moechte");
  await fillBlank.locator("button.sw-submit").click();
  await expect(fillBlank.locator(".sw-feedback-ok")).toBeVisible();

  // Multiple-choice (correct).
  const multipleChoice = panel.locator(".sw-card").filter({ has: page.locator(".sw-options") });
  await multipleChoice.locator(".sw-opt", { hasText: "Ruhe" }).click();
  await expect(multipleChoice.locator(".sw-opt-correct")).toBeVisible();

  // Word-pairing (correct pair).
  const wordPairing = panel.locator(".sw-card").filter({ has: page.locator(".sw-pairing") });
  await wordPairing
    .locator(".sw-pairing-col")
    .first()
    .locator(".sw-opt", { hasText: "Kaffee" })
    .click();
  await wordPairing
    .locator(".sw-pairing-col")
    .nth(1)
    .locator(".sw-opt", { hasText: "кофе" })
    .click();
  await expect(wordPairing.locator(".sw-opt-correct")).toBeVisible();

  // Audio-dictation (correct — type the exact sentence back).
  const audioDictation = panel.locator(".sw-card").filter({
    has: page.locator('input[placeholder="Type what you heard"]'),
  });
  const sourceSentence = await target.evaluate((el) => el.textContent ?? "");
  await audioDictation.locator("input").fill(sourceSentence);
  await audioDictation.locator("button.sw-submit").click();
  await expect(audioDictation.locator(".sw-feedback-ok")).toBeVisible();

  // Open the options page in the same persistent context (shared chrome.storage) without reloading the article.
  const optionsPage = await context.newPage();
  await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);

  await expect(optionsPage.locator(".stats")).toContainText("1"); // streak
  await expect(optionsPage.locator(".stats")).toContainText("day streak");
  const activeVocabStat = optionsPage.locator(".stats > div").nth(1);
  await expect(activeVocabStat.locator("strong")).not.toHaveText("0");

  await expect(optionsPage.locator("table").first()).toBeVisible();

  // The review queue must list at least one word with a future due date.
  const reviewRows = optionsPage.locator("table").last().locator("tr");
  await expect(reviewRows.first()).toBeVisible();
  const reviewText = await optionsPage.locator("table").last().textContent();
  expect(reviewText).toMatch(/due 2\d{3}-\d{2}-\d{2}/);
});
