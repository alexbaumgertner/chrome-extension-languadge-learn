import { expect, test } from "./fixtures";
import { FIXTURE_ORIGIN } from "./ports";

const LONG = (label: string): string =>
  `${label} padded well past the eighty character minimum threshold so the parser treats this as real article content.`;

function articlePage(targetInner: string): string {
  return `<!doctype html>
<html><body>
<article>
  <p id="target">${targetInner}</p>
  <p id="sibling">${LONG("Sibling paragraph, untouched control content for comparison")}</p>
</article>
</body></html>`;
}

test.describe("substitution / restoration fidelity", () => {
  test("plain paragraph round-trips byte-identical after translate + restore", async ({
    context,
    fixtureServer,
    selectText,
    clickMenu,
  }) => {
    fixtureServer.setHtml(articlePage(LONG("Plain paragraph variant")));
    const page = await context.newPage();
    await page.goto(FIXTURE_ORIGIN);

    const target = page.locator("#target");
    const before = await target.evaluate((el) => el.outerHTML);
    const siblingBefore = await page.locator("#sibling").evaluate((el) => el.outerHTML);

    await selectText(page, "#target");
    await clickMenu(page, "translate");
    await expect(target.locator(".sw-vocab").first()).toBeVisible();

    const siblingAfterTranslate = await page.locator("#sibling").evaluate((el) => el.outerHTML);
    expect(siblingAfterTranslate).toBe(siblingBefore);

    await clickMenu(page, "restore");
    await expect(target.locator(".sw-vocab")).toHaveCount(0);
    const after = await target.evaluate((el) => el.outerHTML);
    expect(after).toBe(before);
  });

  test("paragraph with a link round-trips byte-identical", async ({
    context,
    fixtureServer,
    selectText,
    clickMenu,
  }) => {
    fixtureServer.setHtml(
      articlePage(
        `${LONG("Paragraph with a link variant")} See <a href="https://example.com">this source</a> for details.`,
      ),
    );
    const page = await context.newPage();
    await page.goto(FIXTURE_ORIGIN);

    const target = page.locator("#target");
    const before = await target.evaluate((el) => el.outerHTML);

    await selectText(page, "#target");
    await clickMenu(page, "translate");
    await expect(target.locator(".sw-vocab").first()).toBeVisible();

    await clickMenu(page, "restore");
    const after = await target.evaluate((el) => el.outerHTML);
    expect(after).toBe(before);
  });

  test("paragraph with inline bold/italic round-trips byte-identical", async ({
    context,
    fixtureServer,
    selectText,
    clickMenu,
  }) => {
    fixtureServer.setHtml(
      articlePage(
        `${LONG("Paragraph with formatting variant")} <strong>Important</strong> and <em>emphasized</em> text follows here.`,
      ),
    );
    const page = await context.newPage();
    await page.goto(FIXTURE_ORIGIN);

    const target = page.locator("#target");
    const before = await target.evaluate((el) => el.outerHTML);

    await selectText(page, "#target");
    await clickMenu(page, "translate");
    await expect(target.locator(".sw-vocab").first()).toBeVisible();

    await clickMenu(page, "restore");
    const after = await target.evaluate((el) => el.outerHTML);
    expect(after).toBe(before);
  });

  test("nested list item round-trips byte-identical", async ({
    context,
    fixtureServer,
    selectText,
    clickMenu,
  }) => {
    fixtureServer.setHtml(`<!doctype html>
<html><body>
<article>
  <ul><li id="target">${LONG("Nested list item variant")}</li></ul>
  <p id="sibling">${LONG("Sibling paragraph, untouched control content for comparison")}</p>
</article>
</body></html>`);
    const page = await context.newPage();
    await page.goto(FIXTURE_ORIGIN);

    const target = page.locator("#target");
    const before = await target.evaluate((el) => el.outerHTML);

    await selectText(page, "#target");
    await clickMenu(page, "translate");
    await expect(target.locator(".sw-vocab").first()).toBeVisible();

    await clickMenu(page, "restore");
    const after = await target.evaluate((el) => el.outerHTML);
    expect(after).toBe(before);
  });

  test("clicking a vocabulary span reveals its meaning without restoring the paragraph", async ({
    context,
    fixtureServer,
    selectText,
    clickMenu,
  }) => {
    fixtureServer.setHtml(articlePage(LONG("Vocab reveal variant")));
    const page = await context.newPage();
    await page.goto(FIXTURE_ORIGIN);

    const target = page.locator("#target");
    await selectText(page, "#target");
    await clickMenu(page, "translate");
    const vocabSpan = target.locator(".sw-vocab").first();
    await expect(vocabSpan).toBeVisible();

    await vocabSpan.evaluate((el) => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    // The gloss appears, and the paragraph stays translated.
    await expect(page.getByText("хотел бы")).toBeVisible();
    await expect(target.locator(".sw-vocab").first()).toBeVisible();
  });
});
