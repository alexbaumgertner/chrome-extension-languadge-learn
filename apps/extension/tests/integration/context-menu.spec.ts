import { expect, test } from "./fixtures";
import { FIXTURE_ORIGIN } from "./ports";

function page(body: string): string {
  return `<!doctype html><html><body><article>${body}</article></body></html>`;
}

test("a selection inside one paragraph replaces exactly that text; Restore puts it back verbatim", async ({
  context,
  fixtureServer,
  cmsServer,
  clickMenu,
}) => {
  fixtureServer.setHtml(
    page(
      `<p id="target">Erster Satz bleibt. Dieser Satz mit <a href="https://example.com">einem Link</a> wird übersetzt. Letzter Satz bleibt.</p>`,
    ),
  );
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);
  const target = tab.locator("#target");
  const before = await target.evaluate((el) => el.outerHTML);

  // From inside the sentence to inside the link: a range that cuts through an inline element.
  await tab.evaluate(() => {
    const p = document.getElementById("target")!;
    const range = document.createRange();
    range.setStart(p.firstChild!, "Erster Satz bleibt. ".length);
    range.setEnd(p.querySelector("a")!.firstChild!, "einem".length);
    getSelection()!.removeAllRanges();
    getSelection()!.addRange(range);
  });
  await clickMenu(tab, "translate");

  await expect(target.locator(".sw-segment .sw-vocab").first()).toBeVisible();
  expect(cmsServer.requests.translate).toEqual([
    expect.objectContaining({ text: "Dieser Satz mit einem" }),
  ]);
  const text = await target.evaluate((el) => el.textContent ?? "");
  expect(text.startsWith("Erster Satz bleibt. Ich moechte")).toBe(true);
  expect(text.endsWith(" Link wird übersetzt. Letzter Satz bleibt.")).toBe(true);
  await expect(tab.locator(".sw-panel")).toBeVisible();

  await clickMenu(tab, "restore");
  await expect(target.locator(".sw-segment")).toHaveCount(0);
  expect(await target.evaluate((el) => el.outerHTML)).toBe(before);
});

test("a selection across paragraphs translates covered paragraphs whole and exactly the selected text of the ends", async ({
  context,
  fixtureServer,
  cmsServer,
  clickMenu,
}) => {
  fixtureServer.setHtml(
    page(`
  <p id="one">Der erste Absatz wird ganz übersetzt.</p>
  <h2 id="two">Eine Zwischenüberschrift</h2>
  <p id="three">Der dritte Absatz wird nur angefangen.</p>
  <p id="four">Der vierte Absatz bleibt unberührt.</p>`),
  );
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);
  const original = await tab.locator("article").evaluate((el) => el.innerHTML);
  const fourBefore = await tab.locator("#four").evaluate((el) => el.outerHTML);

  await tab.evaluate(() => {
    const range = document.createRange();
    range.setStart(document.getElementById("one")!.firstChild!, 4);
    range.setEnd(document.getElementById("three")!.firstChild!, 10);
    getSelection()!.removeAllRanges();
    getSelection()!.addRange(range);
  });
  await clickMenu(tab, "translate");

  for (const id of ["#one", "#two", "#three"]) {
    await expect(tab.locator(`${id} .sw-vocab`).first()).toBeVisible();
  }
  expect(cmsServer.requests.translate.map((r) => (r as { text: string }).text)).toEqual([
    "erste Absatz wird ganz übersetzt.",
    "Eine Zwischenüberschrift",
    "Der dritte",
  ]);
  // The ends keep their unselected text; the heading, covered whole, is replaced whole.
  await expect(tab.locator("#one")).toHaveText(/^Der Ich moechte/);
  await expect(tab.locator("#three")).toHaveText(/ Absatz wird nur angefangen\.$/);
  await expect(tab.locator("#two .sw-segment")).toHaveCount(0);
  expect(await tab.locator("#four").evaluate((el) => el.outerHTML)).toBe(fourBefore);
  await expect(tab.locator(".sw-panel .sw-card")).toHaveCount(4);

  await clickMenu(tab, "restore");
  await expect(tab.locator(".sw-vocab")).toHaveCount(0);
  expect(await tab.locator("article").evaluate((el) => el.innerHTML)).toBe(original);
});

test("the keyboard shortcut translates the selection like the menu item", async ({
  context,
  fixtureServer,
  selectText,
  pressShortcut,
}) => {
  fixtureServer.setHtml(
    page(`<p id="target">Ein Absatz, der per Tastenkürzel übersetzt wird.</p>`),
  );
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);
  await selectText(tab, "#target");
  await pressShortcut(tab);
  await expect(tab.locator("#target .sw-vocab").first()).toBeVisible();
});

test("without a selection nothing is sent and the learner is told to select text", async ({
  context,
  fixtureServer,
  cmsServer,
  pressShortcut,
}) => {
  fixtureServer.setHtml(page(`<p id="target">Nichts ist ausgewählt.</p>`));
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);
  await pressShortcut(tab);
  await expect(tab.getByText("Select the text you want to translate first.")).toBeVisible();
  expect(cmsServer.callCounts.translate).toBe(0);
});

test("a selection over the length cap is refused before anything is sent", async ({
  context,
  fixtureServer,
  cmsServer,
  selectText,
  clickMenu,
}) => {
  const sentence = "Dieser Satz wiederholt sich, bis die Auswahl zu lang wird. ";
  fixtureServer.setHtml(
    page(
      `<p id="a">${sentence.repeat(14)}</p><p id="b">${sentence.repeat(14)}</p>`, // ~1,650 chars
    ),
  );
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);
  const before = await tab.locator("article").evaluate((el) => el.innerHTML);
  await selectText(tab, "#a", { to: "#b" });
  await clickMenu(tab, "translate");

  await expect(tab.getByText(/The selection is too long \(1,6\d\d characters\)/)).toBeVisible();
  await expect(tab.getByText("Select at most 1,500 characters", { exact: false })).toBeVisible();
  expect(cmsServer.callCounts.translate).toBe(0);
  expect(await tab.locator("article").evaluate((el) => el.innerHTML)).toBe(before);
  await expect
    .poll(() => cmsServer.requests.events.flatMap((b) => b.events))
    .toContainEqual(
      expect.objectContaining({
        name: "client_error",
        error: "translate-too-long",
        httpStatus: null,
      }),
    );
});

test("a second translation reuses the running script: one panel, and Restore covers both", async ({
  context,
  fixtureServer,
  selectText,
  clickMenu,
}) => {
  fixtureServer.setHtml(
    page(
      `<p id="one">Erster Absatz zum Übersetzen.</p><p id="two">Zweiter Absatz zum Übersetzen.</p>`,
    ),
  );
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);
  const original = await tab.locator("article").evaluate((el) => el.innerHTML);

  await selectText(tab, "#one");
  await clickMenu(tab, "translate");
  await expect(tab.locator("#one .sw-vocab").first()).toBeVisible();
  await selectText(tab, "#two");
  await clickMenu(tab, "translate");
  await expect(tab.locator("#two .sw-vocab").first()).toBeVisible();

  await expect(tab.locator("sprachweise-panel")).toHaveCount(1);
  await expect(tab.locator("#one .sw-vocab").first()).toBeVisible();

  await clickMenu(tab, "restore");
  await expect(tab.locator(".sw-vocab")).toHaveCount(0);
  expect(await tab.locator("article").evaluate((el) => el.innerHTML)).toBe(original);
});

test("selecting already-translated text again re-translates the original, not the German", async ({
  context,
  fixtureServer,
  cmsServer,
  selectText,
  clickMenu,
}) => {
  fixtureServer.setHtml(page(`<p id="target">Ein Absatz, der zweimal ausgewählt wird.</p>`));
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);
  const before = await tab.locator("#target").evaluate((el) => el.outerHTML);

  await selectText(tab, "#target");
  await clickMenu(tab, "translate");
  await expect(tab.locator("#target .sw-vocab").first()).toBeVisible();
  await selectText(tab, "#target", { part: "Kaffee" });
  await clickMenu(tab, "translate");
  await expect(tab.locator("#target .sw-vocab").first()).toBeVisible();

  // The second request carried the original paragraph (answered from the local cache: no call).
  expect(cmsServer.callCounts.translate).toBe(1);
  await clickMenu(tab, "restore");
  await expect(tab.locator("#target .sw-vocab")).toHaveCount(0);
  expect(await tab.locator("#target").evaluate((el) => el.outerHTML)).toBe(before);
});

test("Restore while a translation is in flight wins: the late answer changes nothing", async ({
  context,
  fixtureServer,
  cmsServer,
  selectText,
  clickMenu,
}) => {
  fixtureServer.setHtml(page(`<p id="target">Ein Absatz, dessen Übersetzung zu spät ankommt.</p>`));
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);
  const original = await tab.locator("article").evaluate((el) => el.innerHTML);

  const release = cmsServer.holdTranslate();
  await selectText(tab, "#target");
  await clickMenu(tab, "translate");
  await expect.poll(() => cmsServer.callCounts.translate).toBe(1);
  await clickMenu(tab, "restore");
  await expect(tab.getByText("Translating…")).toHaveCount(0);

  release();
  // The background fetches exercises after the translation; the content script gets both after.
  await expect.poll(() => cmsServer.callCounts.exercises).toBe(1);
  await tab.waitForTimeout(500);
  expect(await tab.locator("article").evaluate((el) => el.innerHTML)).toBe(original);
  await expect(tab.locator(".sw-panel .sw-card")).toHaveCount(0);
});

test("a selection that includes code is refused with a clear message; nothing is sent or changed", async ({
  context,
  fixtureServer,
  cmsServer,
  selectText,
  clickMenu,
}) => {
  fixtureServer.setHtml(
    page(`<p id="a">Installiere es mit <code>npm i sprachweise</code> im Terminal.</p>`),
  );
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);
  const before = await tab.locator("article").evaluate((el) => el.innerHTML);
  await selectText(tab, "#a");
  await clickMenu(tab, "translate");

  await expect(
    tab.getByText("Selection includes code or form fields — select plain text only."),
  ).toBeVisible();
  expect(cmsServer.callCounts.translate).toBe(0);
  expect(await tab.locator("article").evaluate((el) => el.innerHTML)).toBe(before);
  await expect
    .poll(() => cmsServer.requests.events.flatMap((b) => b.events))
    .toContainEqual(expect.objectContaining({ name: "client_error", error: "selection-excluded" }));
});

test("a container's own text is refused, and a paragraph inside it is translated alone", async ({
  context,
  fixtureServer,
  cmsServer,
  clickMenu,
}) => {
  fixtureServer.setHtml(
    page(
      `<div id="box">Header<p id="sel">Selected paragraph text.</p><p id="unsel">Unselected paragraph text.</p><input id="field" value="typed"></div>`,
    ),
  );
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);
  const before = await tab.locator("article").evaluate((el) => el.innerHTML);
  const untouched = () =>
    tab.evaluate(() =>
      ["unsel", "field"].map((id) => document.getElementById(id)!.outerHTML).join(""),
    );
  const untouchedBefore = await untouched();

  // From inside "Header" into the first paragraph: that text has no paragraph of its own.
  await tab.evaluate(() => {
    const box = document.getElementById("box")!;
    const range = document.createRange();
    range.setStart(box.firstChild!, 2);
    range.setEnd(document.getElementById("sel")!.firstChild!, 8);
    getSelection()!.removeAllRanges();
    getSelection()!.addRange(range);
  });
  await clickMenu(tab, "translate");
  await expect(
    tab.getByText(
      "Selection includes text outside a paragraph — select text inside paragraphs only.",
    ),
  ).toBeVisible();
  expect(cmsServer.callCounts.translate).toBe(0);
  expect(await tab.locator("article").evaluate((el) => el.innerHTML)).toBe(before);
  await expect
    .poll(() => cmsServer.requests.events.flatMap((b) => b.events))
    .toContainEqual(expect.objectContaining({ name: "client_error", error: "selection-mixed" }));

  // Triple-click style: the whole first paragraph up to the start of the next one.
  await tab.evaluate(() => {
    const range = document.createRange();
    range.setStart(document.getElementById("sel")!.firstChild!, 0);
    range.setEnd(document.getElementById("unsel")!, 0);
    getSelection()!.removeAllRanges();
    getSelection()!.addRange(range);
  });
  await clickMenu(tab, "translate");
  await expect(tab.locator("#sel .sw-vocab").first()).toBeVisible();
  expect(cmsServer.requests.translate).toEqual([
    expect.objectContaining({ text: "Selected paragraph text." }),
  ]);
  expect(await untouched()).toBe(untouchedBefore);
  await expect(tab.locator("#box")).toHaveText(/^Header/);

  await clickMenu(tab, "restore");
  await expect(tab.locator(".sw-vocab")).toHaveCount(0);
  expect(await tab.locator("article").evaluate((el) => el.innerHTML)).toBe(before);
});
