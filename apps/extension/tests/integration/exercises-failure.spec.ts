import { expect, test } from "./fixtures";
import { FIXTURE_ORIGIN } from "./ports";

const LONG = (label: string): string =>
  `${label} padded well past the eighty character minimum threshold so the parser treats this as real article content.`;

test("a failed exercises call keeps the translation, and translating again retries only the exercises", async ({
  context,
  fixtureServer,
  cmsServer,
  selectText,
  clickMenu,
}) => {
  fixtureServer.setHtml(`<!doctype html>
<html><body><article><p id="para">${LONG("Exercises failure")}</p></article></body></html>`);
  cmsServer.setMode("exercises-fail");

  const page = await context.newPage();
  await page.goto(FIXTURE_ORIGIN);

  const para = page.locator("#para");
  await selectText(page, "#para");
  await clickMenu(page, "translate");
  await expect(para.locator(".sw-vocab").first()).toBeVisible();
  await expect(page.locator("text=Couldn't translate")).toHaveCount(0);
  await expect(page.locator(".sw-panel")).toHaveCount(0);
  expect(cmsServer.callCounts.translate).toBe(1);

  cmsServer.setMode("ok");
  await page.reload();
  await selectText(page, "#para");
  await clickMenu(page, "translate");

  await expect(page.locator(".sw-panel .sw-card")).toHaveCount(5);
  expect(cmsServer.callCounts.translate).toBe(1);
  expect(cmsServer.callCounts.exercises).toBe(2);
});
