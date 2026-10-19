import type { Worker } from "@playwright/test";
import { expect, test } from "./fixtures";
import type { MockCmsMode } from "./mock-cms-server";
import { FIXTURE_ORIGIN } from "./ports";

const PARAGRAPH =
  "Error message paragraph padded well past the eighty character minimum threshold so it reads as article content.";

/** client_error events, whether already sent or still queued because the backend is failing. */
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

const CASES: Array<{
  name: string;
  mode: MockCmsMode | "down";
  message: string;
  error: string;
  httpStatus: number | null;
}> = [
  {
    name: "a backend that doesn't answer",
    mode: "down",
    message: "The translation service is unavailable right now.",
    error: "translate-unreachable",
    httpStatus: null,
  },
  {
    name: "a response blocked by CORS",
    mode: "cors-fail",
    message: "The translation service is unavailable right now.",
    error: "translate-cors",
    httpStatus: null,
  },
  {
    name: "a server error",
    mode: "fail",
    message: "The translation service is unavailable right now.",
    error: "translate-server-error",
    httpStatus: 500,
  },
  {
    name: "the daily limit",
    mode: "limit",
    message: "Today's translation limit is used up.",
    error: "translate-limit",
    httpStatus: 429,
  },
];

for (const c of CASES) {
  test(`${c.name} is reported as such, not as offline`, async ({
    context,
    fixtureServer,
    cmsServer,
    serviceWorker,
    selectText,
    clickMenu,
  }) => {
    fixtureServer.setHtml(
      `<!doctype html><html><body><article><p id="target">${PARAGRAPH}</p></article></body></html>`,
    );
    if (c.mode === "down") await cmsServer.close();
    else cmsServer.setMode(c.mode);

    const page = await context.newPage();
    await page.goto(FIXTURE_ORIGIN);
    const before = await page.locator("#target").evaluate((el) => el.outerHTML);
    await selectText(page, "#target");
    await clickMenu(page, "translate");

    await expect(page.getByText(c.message)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("offline")).toHaveCount(0);
    expect(await page.locator("#target").evaluate((el) => el.outerHTML)).toBe(before);

    await expect
      .poll(() => recordedErrors(serviceWorker, cmsServer.requests.events))
      .toContainEqual(expect.objectContaining({ error: c.error, httpStatus: c.httpStatus }));
  });
}
