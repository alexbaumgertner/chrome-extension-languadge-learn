import { expect, test } from "./fixtures";
import { FIXTURE_ORIGIN } from "./ports";

const LONG = (label: string): string =>
  `${label} padded well past the eighty character minimum threshold so the parser treats this as real article content.`;

async function dispatchClick(locator: import("@playwright/test").Locator): Promise<void> {
  await locator.evaluate((el) => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
}

/**
 * Edge Case (spec.md): a client-side framework replacing the DOM subtree
 * containing a translated paragraph must not throw, corrupt surrounding
 * content, or leave an orphaned German node behind — and the paragraph is
 * treated as fresh/untranslated afterward (no attempt to re-detect/re-apply
 * the prior translation, per the Assumptions section).
 */
test("a host-driven DOM replacement of a translated paragraph leaves no orphaned node and throws nothing", async ({
  context,
  fixtureServer,
  enableSite,
}) => {
  await enableSite("127.0.0.1");
  const originalText = LONG("Host re-render variant");
  fixtureServer.setHtml(`<!doctype html>
<html><body>
<article>
  <div id="host-root"><p id="target">${originalText}</p></div>
  <p id="sibling">${LONG("Sibling paragraph, untouched control content")}</p>
</article>
</body></html>`);

  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.goto(FIXTURE_ORIGIN);

  const target = page.locator("#target");
  await dispatchClick(target);
  await expect(target.locator(".sw-vocab").first()).toBeVisible();

  // Simulate a client-side framework re-render: the host replaces the whole subtree
  // with a brand-new element carrying the original (untranslated) text.
  await page.evaluate((text) => {
    const root = document.getElementById("host-root")!;
    root.innerHTML = `<p id="target">${text}</p>`;
  }, originalText);

  expect(pageErrors).toEqual([]);

  // No orphaned German content or vocab-marking spans anywhere on the page.
  await expect(page.locator(".sw-vocab")).toHaveCount(0);
  await expect(page.locator("#host-root")).toContainText(originalText);

  // Surrounding content (the sibling paragraph, never touched) is untouched.
  await expect(page.locator("#sibling")).toContainText(
    "Sibling paragraph, untouched control content",
  );

  // The new node is a fresh element with no stale translated markup.
  const newTargetHtml = await page.locator("#target").evaluate((el) => el.innerHTML);
  expect(newTargetHtml).toBe(originalText);
});
