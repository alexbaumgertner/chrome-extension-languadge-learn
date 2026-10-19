import { expect, test } from "./fixtures";
import { FIXTURE_ORIGIN } from "./ports";

const PARAGRAPH =
  "Report button paragraph padded well past the eighty character minimum threshold so the parser treats this as real article content.";

test("'Плохой перевод' sends the fragment once on click, thanks the user, and retries after a failure", async ({
  context,
  fixtureServer,
  cmsServer,
  enableSite,
}) => {
  await enableSite("127.0.0.1");
  fixtureServer.setHtml(
    `<!doctype html><html><body><article><p id="target">${PARAGRAPH}</p></article></body></html>`,
  );
  const page = await context.newPage();
  await page.goto(FIXTURE_ORIGIN);
  const target = page.locator("#target");
  await target.evaluate((el) => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await expect(target.locator(".sw-vocab").first()).toBeVisible();
  const translatedHtml = await target.evaluate((el) => el.outerHTML);
  const germanText = await target.evaluate((el) => el.textContent);

  const panel = page.locator(".sw-panel");
  await expect(panel).toBeVisible();
  // Nothing is reported without the click.
  expect(cmsServer.requests.report).toHaveLength(0);

  // A failed send says so and offers a retry.
  cmsServer.setMode("report-fail");
  await panel.getByRole("button", { name: "Плохой перевод" }).click();
  await expect(panel.getByText("Не удалось отправить")).toBeVisible();

  cmsServer.setMode("ok");
  await panel.getByRole("button", { name: "Повторить" }).click();
  await expect(panel.getByText("Спасибо! Отправили на проверку.")).toBeVisible();

  expect(cmsServer.requests.report).toHaveLength(1);
  const report = cmsServer.requests.report[0]!;
  expect(Object.keys(report).sort()).toEqual([
    "density",
    "level",
    "model",
    "output",
    "promptVersion",
    "source",
  ]);
  expect(report).toMatchObject({
    source: PARAGRAPH,
    level: "A1-A2",
    density: "medium",
    model: "mock-model",
    promptVersion: "2",
  });
  // The German output as served (its plain text is what the page shows).
  expect(String(report.output)).toContain("Ich moechte einen Kaffee bestellen");
  expect(germanText).toContain("Ich moechte einen Kaffee bestellen");

  // The host paragraph is untouched by reporting.
  expect(await target.evaluate((el) => el.outerHTML)).toBe(translatedHtml);
});

test("'Плохой перевод' is still offered when the paragraph has no exercises", async ({
  context,
  fixtureServer,
  cmsServer,
  enableSite,
}) => {
  await enableSite("127.0.0.1");
  fixtureServer.setHtml(
    `<!doctype html><html><body><article><p id="target">${PARAGRAPH}</p></article></body></html>`,
  );
  cmsServer.setMode("exercises-fail");
  const page = await context.newPage();
  await page.goto(FIXTURE_ORIGIN);
  const target = page.locator("#target");
  await target.evaluate((el) => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await expect(target.locator(".sw-vocab").first()).toBeVisible();

  // Without exercises the panel stays a collapsed tab rather than opening over the page.
  await expect(page.locator(".sw-panel")).toHaveCount(0);
  await page.locator(".sw-tab", { hasText: "No exercises" }).click();
  const panel = page.locator(".sw-panel");
  await expect(panel.getByText("No exercises for this paragraph.")).toBeVisible();

  cmsServer.setMode("ok");
  await panel.getByRole("button", { name: "Плохой перевод" }).click();
  await expect(panel.getByText("Спасибо! Отправили на проверку.")).toBeVisible();
  expect(cmsServer.requests.report).toHaveLength(1);
  expect(cmsServer.requests.report[0]).toMatchObject({ source: PARAGRAPH });
});
