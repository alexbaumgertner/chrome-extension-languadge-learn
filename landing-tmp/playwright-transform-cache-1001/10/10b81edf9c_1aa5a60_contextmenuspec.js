// 92b6b038bdbd03f7852597253fa2d11ae21fff2c
import { expect, test } from "./fixtures";
import { FIXTURE_ORIGIN } from "./ports";
function page(body) {
  return `<!doctype html><html><body><article>${body}</article></body></html>`;
}
test("a selection inside one paragraph replaces exactly that text; Restore puts it back verbatim", async ({
  context,
  fixtureServer,
  cmsServer,
  clickMenu
}) => {
  fixtureServer.setHtml(page(`<p id="target">Erster Satz bleibt. Dieser Satz mit <a href="https://example.com">einem Link</a> wird übersetzt. Letzter Satz bleibt.</p>`));
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);
  const target = tab.locator("#target");
  const before = await target.evaluate(el => el.outerHTML);

  // From inside the sentence to inside the link: a range that cuts through an inline element.
  await tab.evaluate(() => {
    const p = document.getElementById("target");
    const range = document.createRange();
    range.setStart(p.firstChild, "Erster Satz bleibt. ".length);
    range.setEnd(p.querySelector("a").firstChild, "einem".length);
    getSelection().removeAllRanges();
    getSelection().addRange(range);
  });
  await clickMenu(tab, "translate");
  await expect(target.locator(".sw-segment .sw-vocab").first()).toBeVisible();
  expect(cmsServer.requests.translate).toEqual([expect.objectContaining({
    text: "Dieser Satz mit einem"
  })]);
  const text = await target.evaluate(el => {
    var _el$textContent;
    return (_el$textContent = el.textContent) !== null && _el$textContent !== void 0 ? _el$textContent : "";
  });
  expect(text.startsWith("Erster Satz bleibt. Ich moechte")).toBe(true);
  expect(text.endsWith(" Link wird übersetzt. Letzter Satz bleibt.")).toBe(true);
  await expect(tab.locator(".sw-panel")).toBeVisible();
  await clickMenu(tab, "restore");
  await expect(target.locator(".sw-segment")).toHaveCount(0);
  expect(await target.evaluate(el => el.outerHTML)).toBe(before);
});
test("a selection across paragraphs translates covered paragraphs whole and exactly the selected text of the ends", async ({
  context,
  fixtureServer,
  cmsServer,
  clickMenu
}) => {
  fixtureServer.setHtml(page(`
  <p id="one">Der erste Absatz wird ganz übersetzt.</p>
  <h2 id="two">Eine Zwischenüberschrift</h2>
  <p id="three">Der dritte Absatz wird nur angefangen.</p>
  <p id="four">Der vierte Absatz bleibt unberührt.</p>`));
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);
  const original = await tab.locator("article").evaluate(el => el.innerHTML);
  const fourBefore = await tab.locator("#four").evaluate(el => el.outerHTML);
  await tab.evaluate(() => {
    const range = document.createRange();
    range.setStart(document.getElementById("one").firstChild, 4);
    range.setEnd(document.getElementById("three").firstChild, 10);
    getSelection().removeAllRanges();
    getSelection().addRange(range);
  });
  await clickMenu(tab, "translate");
  for (const id of ["#one", "#two", "#three"]) {
    await expect(tab.locator(`${id} .sw-vocab`).first()).toBeVisible();
  }
  expect(cmsServer.requests.translate.map(r => r.text)).toEqual(["erste Absatz wird ganz übersetzt.", "Eine Zwischenüberschrift", "Der dritte"]);
  // The ends keep their unselected text; the heading, covered whole, is replaced whole.
  await expect(tab.locator("#one")).toHaveText(/^Der Ich moechte/);
  await expect(tab.locator("#three")).toHaveText(/ Absatz wird nur angefangen\.$/);
  await expect(tab.locator("#two .sw-segment")).toHaveCount(0);
  expect(await tab.locator("#four").evaluate(el => el.outerHTML)).toBe(fourBefore);
  await expect(tab.locator(".sw-panel .sw-card")).toHaveCount(4);
  await clickMenu(tab, "restore");
  await expect(tab.locator(".sw-vocab")).toHaveCount(0);
  expect(await tab.locator("article").evaluate(el => el.innerHTML)).toBe(original);
});
test("the keyboard shortcut translates the selection like the menu item", async ({
  context,
  fixtureServer,
  selectText,
  pressShortcut
}) => {
  fixtureServer.setHtml(page(`<p id="target">Ein Absatz, der per Tastenkürzel übersetzt wird.</p>`));
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
  pressShortcut
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
  clickMenu
}) => {
  const sentence = "Dieser Satz wiederholt sich, bis die Auswahl zu lang wird. ";
  fixtureServer.setHtml(page(`<p id="a">${sentence.repeat(14)}</p><p id="b">${sentence.repeat(14)}</p>` // ~1,650 chars
  ));
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);
  const before = await tab.locator("article").evaluate(el => el.innerHTML);
  await selectText(tab, "#a", {
    to: "#b"
  });
  await clickMenu(tab, "translate");
  await expect(tab.getByText(/The selection is too long \(1,6\d\d characters\)/)).toBeVisible();
  await expect(tab.getByText("Select at most 1,500 characters", {
    exact: false
  })).toBeVisible();
  expect(cmsServer.callCounts.translate).toBe(0);
  expect(await tab.locator("article").evaluate(el => el.innerHTML)).toBe(before);
  await expect.poll(() => cmsServer.requests.events.flatMap(b => b.events)).toContainEqual(expect.objectContaining({
    name: "client_error",
    error: "translate-too-long",
    httpStatus: null
  }));
});
test("a second translation reuses the running script: one panel, and Restore covers both", async ({
  context,
  fixtureServer,
  selectText,
  clickMenu
}) => {
  fixtureServer.setHtml(page(`<p id="one">Erster Absatz zum Übersetzen.</p><p id="two">Zweiter Absatz zum Übersetzen.</p>`));
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);
  const original = await tab.locator("article").evaluate(el => el.innerHTML);
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
  expect(await tab.locator("article").evaluate(el => el.innerHTML)).toBe(original);
});
test("selecting already-translated text again re-translates the original, not the German", async ({
  context,
  fixtureServer,
  cmsServer,
  selectText,
  clickMenu
}) => {
  const original = "Erster Satz bleibt. Zweiter Satz wird übersetzt.";
  fixtureServer.setHtml(page(`<p id="target">${original}</p>`));
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);
  const before = await tab.locator("#target").evaluate(el => el.outerHTML);
  await selectText(tab, "#target", {
    part: "Zweiter Satz"
  });
  await clickMenu(tab, "translate");
  await expect(tab.locator("#target .sw-segment .sw-vocab").first()).toBeVisible();
  // A word of the German segment: the paragraph's original is what gets translated now.
  await selectText(tab, "#target", {
    part: "Kaffee"
  });
  await clickMenu(tab, "translate");
  await expect(tab.locator("#target .sw-segment")).toHaveCount(0);
  await expect(tab.locator("#target .sw-vocab").first()).toBeVisible();
  expect(cmsServer.requests.translate.map(r => r.text)).toEqual(["Zweiter Satz", original]);
  await clickMenu(tab, "restore");
  await expect(tab.locator("#target .sw-vocab")).toHaveCount(0);
  expect(await tab.locator("#target").evaluate(el => el.outerHTML)).toBe(before);
});
test("a selection refused for length leaves the translations already on the page as they are", async ({
  context,
  fixtureServer,
  cmsServer,
  selectText,
  clickMenu
}) => {
  const sentence = "Dieser Satz wiederholt sich, bis die Auswahl zu lang wird. ";
  fixtureServer.setHtml(page(`<p id="a">${sentence.repeat(14)}</p><p id="b">${sentence.repeat(14)}</p>`));
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);
  await selectText(tab, "#a");
  await clickMenu(tab, "translate");
  await expect(tab.locator("#a .sw-vocab").first()).toBeVisible();
  const translated = await tab.locator("article").evaluate(el => el.innerHTML);

  // #a shows short German now, but its original counts: together they're over the cap.
  await selectText(tab, "#a", {
    to: "#b"
  });
  await clickMenu(tab, "translate");
  await expect(tab.getByText(/The selection is too long \(1,6\d\d characters\)/)).toBeVisible();
  expect(cmsServer.callCounts.translate).toBe(1);
  expect(await tab.locator("article").evaluate(el => el.innerHTML)).toBe(translated);
});
test("a failed re-translation keeps the German that was there", async ({
  context,
  fixtureServer,
  cmsServer,
  selectText,
  clickMenu
}) => {
  fixtureServer.setHtml(page(`<p id="target">Erster Satz bleibt. Zweiter Satz wird übersetzt.</p>`));
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);
  await selectText(tab, "#target", {
    part: "Zweiter Satz"
  });
  await clickMenu(tab, "translate");
  await expect(tab.locator("#target .sw-segment .sw-vocab").first()).toBeVisible();
  const translated = await tab.locator("#target").evaluate(el => el.innerHTML);
  cmsServer.setMode("fail");
  await selectText(tab, "#target", {
    part: "Kaffee"
  });
  await clickMenu(tab, "translate");
  await expect(tab.getByText("The translation service is unavailable right now.", {
    exact: false
  })).toBeVisible();
  expect(cmsServer.callCounts.translate).toBe(1); // the 500 isn't counted as a translate call
  expect(await tab.locator("#target").evaluate(el => el.innerHTML)).toBe(translated);
});
test("Restore while a translation is in flight wins: the late answer changes nothing", async ({
  context,
  fixtureServer,
  cmsServer,
  selectText,
  clickMenu
}) => {
  fixtureServer.setHtml(page(`<p id="target">Ein Absatz, dessen Übersetzung zu spät ankommt.</p>`));
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);
  const original = await tab.locator("article").evaluate(el => el.innerHTML);
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
  expect(await tab.locator("article").evaluate(el => el.innerHTML)).toBe(original);
  await expect(tab.locator(".sw-panel .sw-card")).toHaveCount(0);
});
test("a selection that includes code is refused with a clear message; nothing is sent or changed", async ({
  context,
  fixtureServer,
  cmsServer,
  selectText,
  clickMenu
}) => {
  fixtureServer.setHtml(page(`<p id="a">Installiere es mit <code>npm i sprachweise</code> im Terminal.</p>`));
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);
  const before = await tab.locator("article").evaluate(el => el.innerHTML);
  await selectText(tab, "#a");
  await clickMenu(tab, "translate");
  await expect(tab.getByText("Selection includes code or form fields — select plain text only.")).toBeVisible();
  expect(cmsServer.callCounts.translate).toBe(0);
  expect(await tab.locator("article").evaluate(el => el.innerHTML)).toBe(before);
  await expect.poll(() => cmsServer.requests.events.flatMap(b => b.events)).toContainEqual(expect.objectContaining({
    name: "client_error",
    error: "selection-excluded"
  }));
});
test("a container's own text is refused, and a paragraph inside it is translated alone", async ({
  context,
  fixtureServer,
  cmsServer,
  clickMenu
}) => {
  fixtureServer.setHtml(page(`<div id="box">Header<p id="sel">Selected paragraph text.</p><p id="unsel">Unselected paragraph text.</p><input id="field" value="typed"></div>`));
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);
  const before = await tab.locator("article").evaluate(el => el.innerHTML);
  const untouched = () => tab.evaluate(() => ["unsel", "field"].map(id => document.getElementById(id).outerHTML).join(""));
  const untouchedBefore = await untouched();

  // From inside "Header" into the first paragraph: that text has no paragraph of its own.
  await tab.evaluate(() => {
    const box = document.getElementById("box");
    const range = document.createRange();
    range.setStart(box.firstChild, 2);
    range.setEnd(document.getElementById("sel").firstChild, 8);
    getSelection().removeAllRanges();
    getSelection().addRange(range);
  });
  await clickMenu(tab, "translate");
  await expect(tab.getByText("Selection includes text outside a paragraph — select text inside paragraphs only.")).toBeVisible();
  expect(cmsServer.callCounts.translate).toBe(0);
  expect(await tab.locator("article").evaluate(el => el.innerHTML)).toBe(before);
  await expect.poll(() => cmsServer.requests.events.flatMap(b => b.events)).toContainEqual(expect.objectContaining({
    name: "client_error",
    error: "selection-mixed"
  }));

  // Triple-click style: the whole first paragraph up to the start of the next one.
  await tab.evaluate(() => {
    const range = document.createRange();
    range.setStart(document.getElementById("sel").firstChild, 0);
    range.setEnd(document.getElementById("unsel"), 0);
    getSelection().removeAllRanges();
    getSelection().addRange(range);
  });
  await clickMenu(tab, "translate");
  await expect(tab.locator("#sel .sw-vocab").first()).toBeVisible();
  expect(cmsServer.requests.translate).toEqual([expect.objectContaining({
    text: "Selected paragraph text."
  })]);
  expect(await untouched()).toBe(untouchedBefore);
  await expect(tab.locator("#box")).toHaveText(/^Header/);
  await clickMenu(tab, "restore");
  await expect(tab.locator(".sw-vocab")).toHaveCount(0);
  expect(await tab.locator("article").evaluate(el => el.innerHTML)).toBe(before);
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJleHBlY3QiLCJ0ZXN0IiwiRklYVFVSRV9PUklHSU4iLCJwYWdlIiwiYm9keSIsImNvbnRleHQiLCJmaXh0dXJlU2VydmVyIiwiY21zU2VydmVyIiwiY2xpY2tNZW51Iiwic2V0SHRtbCIsInRhYiIsIm5ld1BhZ2UiLCJnb3RvIiwidGFyZ2V0IiwibG9jYXRvciIsImJlZm9yZSIsImV2YWx1YXRlIiwiZWwiLCJvdXRlckhUTUwiLCJwIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsInJhbmdlIiwiY3JlYXRlUmFuZ2UiLCJzZXRTdGFydCIsImZpcnN0Q2hpbGQiLCJsZW5ndGgiLCJzZXRFbmQiLCJxdWVyeVNlbGVjdG9yIiwiZ2V0U2VsZWN0aW9uIiwicmVtb3ZlQWxsUmFuZ2VzIiwiYWRkUmFuZ2UiLCJmaXJzdCIsInRvQmVWaXNpYmxlIiwicmVxdWVzdHMiLCJ0cmFuc2xhdGUiLCJ0b0VxdWFsIiwib2JqZWN0Q29udGFpbmluZyIsInRleHQiLCJfZWwkdGV4dENvbnRlbnQiLCJ0ZXh0Q29udGVudCIsInN0YXJ0c1dpdGgiLCJ0b0JlIiwiZW5kc1dpdGgiLCJ0b0hhdmVDb3VudCIsIm9yaWdpbmFsIiwiaW5uZXJIVE1MIiwiZm91ckJlZm9yZSIsImlkIiwibWFwIiwiciIsInRvSGF2ZVRleHQiLCJzZWxlY3RUZXh0IiwicHJlc3NTaG9ydGN1dCIsImdldEJ5VGV4dCIsImNhbGxDb3VudHMiLCJzZW50ZW5jZSIsInJlcGVhdCIsInRvIiwiZXhhY3QiLCJwb2xsIiwiZXZlbnRzIiwiZmxhdE1hcCIsImIiLCJ0b0NvbnRhaW5FcXVhbCIsIm5hbWUiLCJlcnJvciIsImh0dHBTdGF0dXMiLCJwYXJ0IiwidHJhbnNsYXRlZCIsInNldE1vZGUiLCJyZWxlYXNlIiwiaG9sZFRyYW5zbGF0ZSIsImV4ZXJjaXNlcyIsIndhaXRGb3JUaW1lb3V0IiwidW50b3VjaGVkIiwiam9pbiIsInVudG91Y2hlZEJlZm9yZSIsImJveCJdLCJzb3VyY2VzIjpbImNvbnRleHQtbWVudS5zcGVjLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGV4cGVjdCwgdGVzdCB9IGZyb20gXCIuL2ZpeHR1cmVzXCI7XG5pbXBvcnQgeyBGSVhUVVJFX09SSUdJTiB9IGZyb20gXCIuL3BvcnRzXCI7XG5cbmZ1bmN0aW9uIHBhZ2UoYm9keTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGA8IWRvY3R5cGUgaHRtbD48aHRtbD48Ym9keT48YXJ0aWNsZT4ke2JvZHl9PC9hcnRpY2xlPjwvYm9keT48L2h0bWw+YDtcbn1cblxudGVzdChcImEgc2VsZWN0aW9uIGluc2lkZSBvbmUgcGFyYWdyYXBoIHJlcGxhY2VzIGV4YWN0bHkgdGhhdCB0ZXh0OyBSZXN0b3JlIHB1dHMgaXQgYmFjayB2ZXJiYXRpbVwiLCBhc3luYyAoe1xuICBjb250ZXh0LFxuICBmaXh0dXJlU2VydmVyLFxuICBjbXNTZXJ2ZXIsXG4gIGNsaWNrTWVudSxcbn0pID0+IHtcbiAgZml4dHVyZVNlcnZlci5zZXRIdG1sKFxuICAgIHBhZ2UoXG4gICAgICBgPHAgaWQ9XCJ0YXJnZXRcIj5FcnN0ZXIgU2F0eiBibGVpYnQuIERpZXNlciBTYXR6IG1pdCA8YSBocmVmPVwiaHR0cHM6Ly9leGFtcGxlLmNvbVwiPmVpbmVtIExpbms8L2E+IHdpcmQgw7xiZXJzZXR6dC4gTGV0enRlciBTYXR6IGJsZWlidC48L3A+YCxcbiAgICApLFxuICApO1xuICBjb25zdCB0YWIgPSBhd2FpdCBjb250ZXh0Lm5ld1BhZ2UoKTtcbiAgYXdhaXQgdGFiLmdvdG8oRklYVFVSRV9PUklHSU4pO1xuICBjb25zdCB0YXJnZXQgPSB0YWIubG9jYXRvcihcIiN0YXJnZXRcIik7XG4gIGNvbnN0IGJlZm9yZSA9IGF3YWl0IHRhcmdldC5ldmFsdWF0ZSgoZWwpID0+IGVsLm91dGVySFRNTCk7XG5cbiAgLy8gRnJvbSBpbnNpZGUgdGhlIHNlbnRlbmNlIHRvIGluc2lkZSB0aGUgbGluazogYSByYW5nZSB0aGF0IGN1dHMgdGhyb3VnaCBhbiBpbmxpbmUgZWxlbWVudC5cbiAgYXdhaXQgdGFiLmV2YWx1YXRlKCgpID0+IHtcbiAgICBjb25zdCBwID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0YXJnZXRcIikhO1xuICAgIGNvbnN0IHJhbmdlID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKTtcbiAgICByYW5nZS5zZXRTdGFydChwLmZpcnN0Q2hpbGQhLCBcIkVyc3RlciBTYXR6IGJsZWlidC4gXCIubGVuZ3RoKTtcbiAgICByYW5nZS5zZXRFbmQocC5xdWVyeVNlbGVjdG9yKFwiYVwiKSEuZmlyc3RDaGlsZCEsIFwiZWluZW1cIi5sZW5ndGgpO1xuICAgIGdldFNlbGVjdGlvbigpIS5yZW1vdmVBbGxSYW5nZXMoKTtcbiAgICBnZXRTZWxlY3Rpb24oKSEuYWRkUmFuZ2UocmFuZ2UpO1xuICB9KTtcbiAgYXdhaXQgY2xpY2tNZW51KHRhYiwgXCJ0cmFuc2xhdGVcIik7XG5cbiAgYXdhaXQgZXhwZWN0KHRhcmdldC5sb2NhdG9yKFwiLnN3LXNlZ21lbnQgLnN3LXZvY2FiXCIpLmZpcnN0KCkpLnRvQmVWaXNpYmxlKCk7XG4gIGV4cGVjdChjbXNTZXJ2ZXIucmVxdWVzdHMudHJhbnNsYXRlKS50b0VxdWFsKFtcbiAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7IHRleHQ6IFwiRGllc2VyIFNhdHogbWl0IGVpbmVtXCIgfSksXG4gIF0pO1xuICBjb25zdCB0ZXh0ID0gYXdhaXQgdGFyZ2V0LmV2YWx1YXRlKChlbCkgPT4gZWwudGV4dENvbnRlbnQgPz8gXCJcIik7XG4gIGV4cGVjdCh0ZXh0LnN0YXJ0c1dpdGgoXCJFcnN0ZXIgU2F0eiBibGVpYnQuIEljaCBtb2VjaHRlXCIpKS50b0JlKHRydWUpO1xuICBleHBlY3QodGV4dC5lbmRzV2l0aChcIiBMaW5rIHdpcmQgw7xiZXJzZXR6dC4gTGV0enRlciBTYXR6IGJsZWlidC5cIikpLnRvQmUodHJ1ZSk7XG4gIGF3YWl0IGV4cGVjdCh0YWIubG9jYXRvcihcIi5zdy1wYW5lbFwiKSkudG9CZVZpc2libGUoKTtcblxuICBhd2FpdCBjbGlja01lbnUodGFiLCBcInJlc3RvcmVcIik7XG4gIGF3YWl0IGV4cGVjdCh0YXJnZXQubG9jYXRvcihcIi5zdy1zZWdtZW50XCIpKS50b0hhdmVDb3VudCgwKTtcbiAgZXhwZWN0KGF3YWl0IHRhcmdldC5ldmFsdWF0ZSgoZWwpID0+IGVsLm91dGVySFRNTCkpLnRvQmUoYmVmb3JlKTtcbn0pO1xuXG50ZXN0KFwiYSBzZWxlY3Rpb24gYWNyb3NzIHBhcmFncmFwaHMgdHJhbnNsYXRlcyBjb3ZlcmVkIHBhcmFncmFwaHMgd2hvbGUgYW5kIGV4YWN0bHkgdGhlIHNlbGVjdGVkIHRleHQgb2YgdGhlIGVuZHNcIiwgYXN5bmMgKHtcbiAgY29udGV4dCxcbiAgZml4dHVyZVNlcnZlcixcbiAgY21zU2VydmVyLFxuICBjbGlja01lbnUsXG59KSA9PiB7XG4gIGZpeHR1cmVTZXJ2ZXIuc2V0SHRtbChcbiAgICBwYWdlKGBcbiAgPHAgaWQ9XCJvbmVcIj5EZXIgZXJzdGUgQWJzYXR6IHdpcmQgZ2FueiDDvGJlcnNldHp0LjwvcD5cbiAgPGgyIGlkPVwidHdvXCI+RWluZSBad2lzY2hlbsO8YmVyc2NocmlmdDwvaDI+XG4gIDxwIGlkPVwidGhyZWVcIj5EZXIgZHJpdHRlIEFic2F0eiB3aXJkIG51ciBhbmdlZmFuZ2VuLjwvcD5cbiAgPHAgaWQ9XCJmb3VyXCI+RGVyIHZpZXJ0ZSBBYnNhdHogYmxlaWJ0IHVuYmVyw7xocnQuPC9wPmApLFxuICApO1xuICBjb25zdCB0YWIgPSBhd2FpdCBjb250ZXh0Lm5ld1BhZ2UoKTtcbiAgYXdhaXQgdGFiLmdvdG8oRklYVFVSRV9PUklHSU4pO1xuICBjb25zdCBvcmlnaW5hbCA9IGF3YWl0IHRhYi5sb2NhdG9yKFwiYXJ0aWNsZVwiKS5ldmFsdWF0ZSgoZWwpID0+IGVsLmlubmVySFRNTCk7XG4gIGNvbnN0IGZvdXJCZWZvcmUgPSBhd2FpdCB0YWIubG9jYXRvcihcIiNmb3VyXCIpLmV2YWx1YXRlKChlbCkgPT4gZWwub3V0ZXJIVE1MKTtcblxuICBhd2FpdCB0YWIuZXZhbHVhdGUoKCkgPT4ge1xuICAgIGNvbnN0IHJhbmdlID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKTtcbiAgICByYW5nZS5zZXRTdGFydChkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm9uZVwiKSEuZmlyc3RDaGlsZCEsIDQpO1xuICAgIHJhbmdlLnNldEVuZChkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInRocmVlXCIpIS5maXJzdENoaWxkISwgMTApO1xuICAgIGdldFNlbGVjdGlvbigpIS5yZW1vdmVBbGxSYW5nZXMoKTtcbiAgICBnZXRTZWxlY3Rpb24oKSEuYWRkUmFuZ2UocmFuZ2UpO1xuICB9KTtcbiAgYXdhaXQgY2xpY2tNZW51KHRhYiwgXCJ0cmFuc2xhdGVcIik7XG5cbiAgZm9yIChjb25zdCBpZCBvZiBbXCIjb25lXCIsIFwiI3R3b1wiLCBcIiN0aHJlZVwiXSkge1xuICAgIGF3YWl0IGV4cGVjdCh0YWIubG9jYXRvcihgJHtpZH0gLnN3LXZvY2FiYCkuZmlyc3QoKSkudG9CZVZpc2libGUoKTtcbiAgfVxuICBleHBlY3QoY21zU2VydmVyLnJlcXVlc3RzLnRyYW5zbGF0ZS5tYXAoKHIpID0+IChyIGFzIHsgdGV4dDogc3RyaW5nIH0pLnRleHQpKS50b0VxdWFsKFtcbiAgICBcImVyc3RlIEFic2F0eiB3aXJkIGdhbnogw7xiZXJzZXR6dC5cIixcbiAgICBcIkVpbmUgWndpc2NoZW7DvGJlcnNjaHJpZnRcIixcbiAgICBcIkRlciBkcml0dGVcIixcbiAgXSk7XG4gIC8vIFRoZSBlbmRzIGtlZXAgdGhlaXIgdW5zZWxlY3RlZCB0ZXh0OyB0aGUgaGVhZGluZywgY292ZXJlZCB3aG9sZSwgaXMgcmVwbGFjZWQgd2hvbGUuXG4gIGF3YWl0IGV4cGVjdCh0YWIubG9jYXRvcihcIiNvbmVcIikpLnRvSGF2ZVRleHQoL15EZXIgSWNoIG1vZWNodGUvKTtcbiAgYXdhaXQgZXhwZWN0KHRhYi5sb2NhdG9yKFwiI3RocmVlXCIpKS50b0hhdmVUZXh0KC8gQWJzYXR6IHdpcmQgbnVyIGFuZ2VmYW5nZW5cXC4kLyk7XG4gIGF3YWl0IGV4cGVjdCh0YWIubG9jYXRvcihcIiN0d28gLnN3LXNlZ21lbnRcIikpLnRvSGF2ZUNvdW50KDApO1xuICBleHBlY3QoYXdhaXQgdGFiLmxvY2F0b3IoXCIjZm91clwiKS5ldmFsdWF0ZSgoZWwpID0+IGVsLm91dGVySFRNTCkpLnRvQmUoZm91ckJlZm9yZSk7XG4gIGF3YWl0IGV4cGVjdCh0YWIubG9jYXRvcihcIi5zdy1wYW5lbCAuc3ctY2FyZFwiKSkudG9IYXZlQ291bnQoNCk7XG5cbiAgYXdhaXQgY2xpY2tNZW51KHRhYiwgXCJyZXN0b3JlXCIpO1xuICBhd2FpdCBleHBlY3QodGFiLmxvY2F0b3IoXCIuc3ctdm9jYWJcIikpLnRvSGF2ZUNvdW50KDApO1xuICBleHBlY3QoYXdhaXQgdGFiLmxvY2F0b3IoXCJhcnRpY2xlXCIpLmV2YWx1YXRlKChlbCkgPT4gZWwuaW5uZXJIVE1MKSkudG9CZShvcmlnaW5hbCk7XG59KTtcblxudGVzdChcInRoZSBrZXlib2FyZCBzaG9ydGN1dCB0cmFuc2xhdGVzIHRoZSBzZWxlY3Rpb24gbGlrZSB0aGUgbWVudSBpdGVtXCIsIGFzeW5jICh7XG4gIGNvbnRleHQsXG4gIGZpeHR1cmVTZXJ2ZXIsXG4gIHNlbGVjdFRleHQsXG4gIHByZXNzU2hvcnRjdXQsXG59KSA9PiB7XG4gIGZpeHR1cmVTZXJ2ZXIuc2V0SHRtbChcbiAgICBwYWdlKGA8cCBpZD1cInRhcmdldFwiPkVpbiBBYnNhdHosIGRlciBwZXIgVGFzdGVua8O8cnplbCDDvGJlcnNldHp0IHdpcmQuPC9wPmApLFxuICApO1xuICBjb25zdCB0YWIgPSBhd2FpdCBjb250ZXh0Lm5ld1BhZ2UoKTtcbiAgYXdhaXQgdGFiLmdvdG8oRklYVFVSRV9PUklHSU4pO1xuICBhd2FpdCBzZWxlY3RUZXh0KHRhYiwgXCIjdGFyZ2V0XCIpO1xuICBhd2FpdCBwcmVzc1Nob3J0Y3V0KHRhYik7XG4gIGF3YWl0IGV4cGVjdCh0YWIubG9jYXRvcihcIiN0YXJnZXQgLnN3LXZvY2FiXCIpLmZpcnN0KCkpLnRvQmVWaXNpYmxlKCk7XG59KTtcblxudGVzdChcIndpdGhvdXQgYSBzZWxlY3Rpb24gbm90aGluZyBpcyBzZW50IGFuZCB0aGUgbGVhcm5lciBpcyB0b2xkIHRvIHNlbGVjdCB0ZXh0XCIsIGFzeW5jICh7XG4gIGNvbnRleHQsXG4gIGZpeHR1cmVTZXJ2ZXIsXG4gIGNtc1NlcnZlcixcbiAgcHJlc3NTaG9ydGN1dCxcbn0pID0+IHtcbiAgZml4dHVyZVNlcnZlci5zZXRIdG1sKHBhZ2UoYDxwIGlkPVwidGFyZ2V0XCI+TmljaHRzIGlzdCBhdXNnZXfDpGhsdC48L3A+YCkpO1xuICBjb25zdCB0YWIgPSBhd2FpdCBjb250ZXh0Lm5ld1BhZ2UoKTtcbiAgYXdhaXQgdGFiLmdvdG8oRklYVFVSRV9PUklHSU4pO1xuICBhd2FpdCBwcmVzc1Nob3J0Y3V0KHRhYik7XG4gIGF3YWl0IGV4cGVjdCh0YWIuZ2V0QnlUZXh0KFwiU2VsZWN0IHRoZSB0ZXh0IHlvdSB3YW50IHRvIHRyYW5zbGF0ZSBmaXJzdC5cIikpLnRvQmVWaXNpYmxlKCk7XG4gIGV4cGVjdChjbXNTZXJ2ZXIuY2FsbENvdW50cy50cmFuc2xhdGUpLnRvQmUoMCk7XG59KTtcblxudGVzdChcImEgc2VsZWN0aW9uIG92ZXIgdGhlIGxlbmd0aCBjYXAgaXMgcmVmdXNlZCBiZWZvcmUgYW55dGhpbmcgaXMgc2VudFwiLCBhc3luYyAoe1xuICBjb250ZXh0LFxuICBmaXh0dXJlU2VydmVyLFxuICBjbXNTZXJ2ZXIsXG4gIHNlbGVjdFRleHQsXG4gIGNsaWNrTWVudSxcbn0pID0+IHtcbiAgY29uc3Qgc2VudGVuY2UgPSBcIkRpZXNlciBTYXR6IHdpZWRlcmhvbHQgc2ljaCwgYmlzIGRpZSBBdXN3YWhsIHp1IGxhbmcgd2lyZC4gXCI7XG4gIGZpeHR1cmVTZXJ2ZXIuc2V0SHRtbChcbiAgICBwYWdlKFxuICAgICAgYDxwIGlkPVwiYVwiPiR7c2VudGVuY2UucmVwZWF0KDE0KX08L3A+PHAgaWQ9XCJiXCI+JHtzZW50ZW5jZS5yZXBlYXQoMTQpfTwvcD5gLCAvLyB+MSw2NTAgY2hhcnNcbiAgICApLFxuICApO1xuICBjb25zdCB0YWIgPSBhd2FpdCBjb250ZXh0Lm5ld1BhZ2UoKTtcbiAgYXdhaXQgdGFiLmdvdG8oRklYVFVSRV9PUklHSU4pO1xuICBjb25zdCBiZWZvcmUgPSBhd2FpdCB0YWIubG9jYXRvcihcImFydGljbGVcIikuZXZhbHVhdGUoKGVsKSA9PiBlbC5pbm5lckhUTUwpO1xuICBhd2FpdCBzZWxlY3RUZXh0KHRhYiwgXCIjYVwiLCB7IHRvOiBcIiNiXCIgfSk7XG4gIGF3YWl0IGNsaWNrTWVudSh0YWIsIFwidHJhbnNsYXRlXCIpO1xuXG4gIGF3YWl0IGV4cGVjdCh0YWIuZ2V0QnlUZXh0KC9UaGUgc2VsZWN0aW9uIGlzIHRvbyBsb25nIFxcKDEsNlxcZFxcZCBjaGFyYWN0ZXJzXFwpLykpLnRvQmVWaXNpYmxlKCk7XG4gIGF3YWl0IGV4cGVjdCh0YWIuZ2V0QnlUZXh0KFwiU2VsZWN0IGF0IG1vc3QgMSw1MDAgY2hhcmFjdGVyc1wiLCB7IGV4YWN0OiBmYWxzZSB9KSkudG9CZVZpc2libGUoKTtcbiAgZXhwZWN0KGNtc1NlcnZlci5jYWxsQ291bnRzLnRyYW5zbGF0ZSkudG9CZSgwKTtcbiAgZXhwZWN0KGF3YWl0IHRhYi5sb2NhdG9yKFwiYXJ0aWNsZVwiKS5ldmFsdWF0ZSgoZWwpID0+IGVsLmlubmVySFRNTCkpLnRvQmUoYmVmb3JlKTtcbiAgYXdhaXQgZXhwZWN0XG4gICAgLnBvbGwoKCkgPT4gY21zU2VydmVyLnJlcXVlc3RzLmV2ZW50cy5mbGF0TWFwKChiKSA9PiBiLmV2ZW50cykpXG4gICAgLnRvQ29udGFpbkVxdWFsKFxuICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgICBuYW1lOiBcImNsaWVudF9lcnJvclwiLFxuICAgICAgICBlcnJvcjogXCJ0cmFuc2xhdGUtdG9vLWxvbmdcIixcbiAgICAgICAgaHR0cFN0YXR1czogbnVsbCxcbiAgICAgIH0pLFxuICAgICk7XG59KTtcblxudGVzdChcImEgc2Vjb25kIHRyYW5zbGF0aW9uIHJldXNlcyB0aGUgcnVubmluZyBzY3JpcHQ6IG9uZSBwYW5lbCwgYW5kIFJlc3RvcmUgY292ZXJzIGJvdGhcIiwgYXN5bmMgKHtcbiAgY29udGV4dCxcbiAgZml4dHVyZVNlcnZlcixcbiAgc2VsZWN0VGV4dCxcbiAgY2xpY2tNZW51LFxufSkgPT4ge1xuICBmaXh0dXJlU2VydmVyLnNldEh0bWwoXG4gICAgcGFnZShcbiAgICAgIGA8cCBpZD1cIm9uZVwiPkVyc3RlciBBYnNhdHogenVtIMOcYmVyc2V0emVuLjwvcD48cCBpZD1cInR3b1wiPlp3ZWl0ZXIgQWJzYXR6IHp1bSDDnGJlcnNldHplbi48L3A+YCxcbiAgICApLFxuICApO1xuICBjb25zdCB0YWIgPSBhd2FpdCBjb250ZXh0Lm5ld1BhZ2UoKTtcbiAgYXdhaXQgdGFiLmdvdG8oRklYVFVSRV9PUklHSU4pO1xuICBjb25zdCBvcmlnaW5hbCA9IGF3YWl0IHRhYi5sb2NhdG9yKFwiYXJ0aWNsZVwiKS5ldmFsdWF0ZSgoZWwpID0+IGVsLmlubmVySFRNTCk7XG5cbiAgYXdhaXQgc2VsZWN0VGV4dCh0YWIsIFwiI29uZVwiKTtcbiAgYXdhaXQgY2xpY2tNZW51KHRhYiwgXCJ0cmFuc2xhdGVcIik7XG4gIGF3YWl0IGV4cGVjdCh0YWIubG9jYXRvcihcIiNvbmUgLnN3LXZvY2FiXCIpLmZpcnN0KCkpLnRvQmVWaXNpYmxlKCk7XG4gIGF3YWl0IHNlbGVjdFRleHQodGFiLCBcIiN0d29cIik7XG4gIGF3YWl0IGNsaWNrTWVudSh0YWIsIFwidHJhbnNsYXRlXCIpO1xuICBhd2FpdCBleHBlY3QodGFiLmxvY2F0b3IoXCIjdHdvIC5zdy12b2NhYlwiKS5maXJzdCgpKS50b0JlVmlzaWJsZSgpO1xuXG4gIGF3YWl0IGV4cGVjdCh0YWIubG9jYXRvcihcInNwcmFjaHdlaXNlLXBhbmVsXCIpKS50b0hhdmVDb3VudCgxKTtcbiAgYXdhaXQgZXhwZWN0KHRhYi5sb2NhdG9yKFwiI29uZSAuc3ctdm9jYWJcIikuZmlyc3QoKSkudG9CZVZpc2libGUoKTtcblxuICBhd2FpdCBjbGlja01lbnUodGFiLCBcInJlc3RvcmVcIik7XG4gIGF3YWl0IGV4cGVjdCh0YWIubG9jYXRvcihcIi5zdy12b2NhYlwiKSkudG9IYXZlQ291bnQoMCk7XG4gIGV4cGVjdChhd2FpdCB0YWIubG9jYXRvcihcImFydGljbGVcIikuZXZhbHVhdGUoKGVsKSA9PiBlbC5pbm5lckhUTUwpKS50b0JlKG9yaWdpbmFsKTtcbn0pO1xuXG50ZXN0KFwic2VsZWN0aW5nIGFscmVhZHktdHJhbnNsYXRlZCB0ZXh0IGFnYWluIHJlLXRyYW5zbGF0ZXMgdGhlIG9yaWdpbmFsLCBub3QgdGhlIEdlcm1hblwiLCBhc3luYyAoe1xuICBjb250ZXh0LFxuICBmaXh0dXJlU2VydmVyLFxuICBjbXNTZXJ2ZXIsXG4gIHNlbGVjdFRleHQsXG4gIGNsaWNrTWVudSxcbn0pID0+IHtcbiAgY29uc3Qgb3JpZ2luYWwgPSBcIkVyc3RlciBTYXR6IGJsZWlidC4gWndlaXRlciBTYXR6IHdpcmQgw7xiZXJzZXR6dC5cIjtcbiAgZml4dHVyZVNlcnZlci5zZXRIdG1sKHBhZ2UoYDxwIGlkPVwidGFyZ2V0XCI+JHtvcmlnaW5hbH08L3A+YCkpO1xuICBjb25zdCB0YWIgPSBhd2FpdCBjb250ZXh0Lm5ld1BhZ2UoKTtcbiAgYXdhaXQgdGFiLmdvdG8oRklYVFVSRV9PUklHSU4pO1xuICBjb25zdCBiZWZvcmUgPSBhd2FpdCB0YWIubG9jYXRvcihcIiN0YXJnZXRcIikuZXZhbHVhdGUoKGVsKSA9PiBlbC5vdXRlckhUTUwpO1xuXG4gIGF3YWl0IHNlbGVjdFRleHQodGFiLCBcIiN0YXJnZXRcIiwgeyBwYXJ0OiBcIlp3ZWl0ZXIgU2F0elwiIH0pO1xuICBhd2FpdCBjbGlja01lbnUodGFiLCBcInRyYW5zbGF0ZVwiKTtcbiAgYXdhaXQgZXhwZWN0KHRhYi5sb2NhdG9yKFwiI3RhcmdldCAuc3ctc2VnbWVudCAuc3ctdm9jYWJcIikuZmlyc3QoKSkudG9CZVZpc2libGUoKTtcbiAgLy8gQSB3b3JkIG9mIHRoZSBHZXJtYW4gc2VnbWVudDogdGhlIHBhcmFncmFwaCdzIG9yaWdpbmFsIGlzIHdoYXQgZ2V0cyB0cmFuc2xhdGVkIG5vdy5cbiAgYXdhaXQgc2VsZWN0VGV4dCh0YWIsIFwiI3RhcmdldFwiLCB7IHBhcnQ6IFwiS2FmZmVlXCIgfSk7XG4gIGF3YWl0IGNsaWNrTWVudSh0YWIsIFwidHJhbnNsYXRlXCIpO1xuICBhd2FpdCBleHBlY3QodGFiLmxvY2F0b3IoXCIjdGFyZ2V0IC5zdy1zZWdtZW50XCIpKS50b0hhdmVDb3VudCgwKTtcbiAgYXdhaXQgZXhwZWN0KHRhYi5sb2NhdG9yKFwiI3RhcmdldCAuc3ctdm9jYWJcIikuZmlyc3QoKSkudG9CZVZpc2libGUoKTtcbiAgZXhwZWN0KGNtc1NlcnZlci5yZXF1ZXN0cy50cmFuc2xhdGUubWFwKChyKSA9PiAociBhcyB7IHRleHQ6IHN0cmluZyB9KS50ZXh0KSkudG9FcXVhbChbXG4gICAgXCJad2VpdGVyIFNhdHpcIixcbiAgICBvcmlnaW5hbCxcbiAgXSk7XG5cbiAgYXdhaXQgY2xpY2tNZW51KHRhYiwgXCJyZXN0b3JlXCIpO1xuICBhd2FpdCBleHBlY3QodGFiLmxvY2F0b3IoXCIjdGFyZ2V0IC5zdy12b2NhYlwiKSkudG9IYXZlQ291bnQoMCk7XG4gIGV4cGVjdChhd2FpdCB0YWIubG9jYXRvcihcIiN0YXJnZXRcIikuZXZhbHVhdGUoKGVsKSA9PiBlbC5vdXRlckhUTUwpKS50b0JlKGJlZm9yZSk7XG59KTtcblxudGVzdChcImEgc2VsZWN0aW9uIHJlZnVzZWQgZm9yIGxlbmd0aCBsZWF2ZXMgdGhlIHRyYW5zbGF0aW9ucyBhbHJlYWR5IG9uIHRoZSBwYWdlIGFzIHRoZXkgYXJlXCIsIGFzeW5jICh7XG4gIGNvbnRleHQsXG4gIGZpeHR1cmVTZXJ2ZXIsXG4gIGNtc1NlcnZlcixcbiAgc2VsZWN0VGV4dCxcbiAgY2xpY2tNZW51LFxufSkgPT4ge1xuICBjb25zdCBzZW50ZW5jZSA9IFwiRGllc2VyIFNhdHogd2llZGVyaG9sdCBzaWNoLCBiaXMgZGllIEF1c3dhaGwgenUgbGFuZyB3aXJkLiBcIjtcbiAgZml4dHVyZVNlcnZlci5zZXRIdG1sKFxuICAgIHBhZ2UoYDxwIGlkPVwiYVwiPiR7c2VudGVuY2UucmVwZWF0KDE0KX08L3A+PHAgaWQ9XCJiXCI+JHtzZW50ZW5jZS5yZXBlYXQoMTQpfTwvcD5gKSxcbiAgKTtcbiAgY29uc3QgdGFiID0gYXdhaXQgY29udGV4dC5uZXdQYWdlKCk7XG4gIGF3YWl0IHRhYi5nb3RvKEZJWFRVUkVfT1JJR0lOKTtcbiAgYXdhaXQgc2VsZWN0VGV4dCh0YWIsIFwiI2FcIik7XG4gIGF3YWl0IGNsaWNrTWVudSh0YWIsIFwidHJhbnNsYXRlXCIpO1xuICBhd2FpdCBleHBlY3QodGFiLmxvY2F0b3IoXCIjYSAuc3ctdm9jYWJcIikuZmlyc3QoKSkudG9CZVZpc2libGUoKTtcbiAgY29uc3QgdHJhbnNsYXRlZCA9IGF3YWl0IHRhYi5sb2NhdG9yKFwiYXJ0aWNsZVwiKS5ldmFsdWF0ZSgoZWwpID0+IGVsLmlubmVySFRNTCk7XG5cbiAgLy8gI2Egc2hvd3Mgc2hvcnQgR2VybWFuIG5vdywgYnV0IGl0cyBvcmlnaW5hbCBjb3VudHM6IHRvZ2V0aGVyIHRoZXkncmUgb3ZlciB0aGUgY2FwLlxuICBhd2FpdCBzZWxlY3RUZXh0KHRhYiwgXCIjYVwiLCB7IHRvOiBcIiNiXCIgfSk7XG4gIGF3YWl0IGNsaWNrTWVudSh0YWIsIFwidHJhbnNsYXRlXCIpO1xuICBhd2FpdCBleHBlY3QodGFiLmdldEJ5VGV4dCgvVGhlIHNlbGVjdGlvbiBpcyB0b28gbG9uZyBcXCgxLDZcXGRcXGQgY2hhcmFjdGVyc1xcKS8pKS50b0JlVmlzaWJsZSgpO1xuICBleHBlY3QoY21zU2VydmVyLmNhbGxDb3VudHMudHJhbnNsYXRlKS50b0JlKDEpO1xuICBleHBlY3QoYXdhaXQgdGFiLmxvY2F0b3IoXCJhcnRpY2xlXCIpLmV2YWx1YXRlKChlbCkgPT4gZWwuaW5uZXJIVE1MKSkudG9CZSh0cmFuc2xhdGVkKTtcbn0pO1xuXG50ZXN0KFwiYSBmYWlsZWQgcmUtdHJhbnNsYXRpb24ga2VlcHMgdGhlIEdlcm1hbiB0aGF0IHdhcyB0aGVyZVwiLCBhc3luYyAoe1xuICBjb250ZXh0LFxuICBmaXh0dXJlU2VydmVyLFxuICBjbXNTZXJ2ZXIsXG4gIHNlbGVjdFRleHQsXG4gIGNsaWNrTWVudSxcbn0pID0+IHtcbiAgZml4dHVyZVNlcnZlci5zZXRIdG1sKFxuICAgIHBhZ2UoYDxwIGlkPVwidGFyZ2V0XCI+RXJzdGVyIFNhdHogYmxlaWJ0LiBad2VpdGVyIFNhdHogd2lyZCDDvGJlcnNldHp0LjwvcD5gKSxcbiAgKTtcbiAgY29uc3QgdGFiID0gYXdhaXQgY29udGV4dC5uZXdQYWdlKCk7XG4gIGF3YWl0IHRhYi5nb3RvKEZJWFRVUkVfT1JJR0lOKTtcbiAgYXdhaXQgc2VsZWN0VGV4dCh0YWIsIFwiI3RhcmdldFwiLCB7IHBhcnQ6IFwiWndlaXRlciBTYXR6XCIgfSk7XG4gIGF3YWl0IGNsaWNrTWVudSh0YWIsIFwidHJhbnNsYXRlXCIpO1xuICBhd2FpdCBleHBlY3QodGFiLmxvY2F0b3IoXCIjdGFyZ2V0IC5zdy1zZWdtZW50IC5zdy12b2NhYlwiKS5maXJzdCgpKS50b0JlVmlzaWJsZSgpO1xuICBjb25zdCB0cmFuc2xhdGVkID0gYXdhaXQgdGFiLmxvY2F0b3IoXCIjdGFyZ2V0XCIpLmV2YWx1YXRlKChlbCkgPT4gZWwuaW5uZXJIVE1MKTtcblxuICBjbXNTZXJ2ZXIuc2V0TW9kZShcImZhaWxcIik7XG4gIGF3YWl0IHNlbGVjdFRleHQodGFiLCBcIiN0YXJnZXRcIiwgeyBwYXJ0OiBcIkthZmZlZVwiIH0pO1xuICBhd2FpdCBjbGlja01lbnUodGFiLCBcInRyYW5zbGF0ZVwiKTtcbiAgYXdhaXQgZXhwZWN0KFxuICAgIHRhYi5nZXRCeVRleHQoXCJUaGUgdHJhbnNsYXRpb24gc2VydmljZSBpcyB1bmF2YWlsYWJsZSByaWdodCBub3cuXCIsIHsgZXhhY3Q6IGZhbHNlIH0pLFxuICApLnRvQmVWaXNpYmxlKCk7XG4gIGV4cGVjdChjbXNTZXJ2ZXIuY2FsbENvdW50cy50cmFuc2xhdGUpLnRvQmUoMSk7IC8vIHRoZSA1MDAgaXNuJ3QgY291bnRlZCBhcyBhIHRyYW5zbGF0ZSBjYWxsXG4gIGV4cGVjdChhd2FpdCB0YWIubG9jYXRvcihcIiN0YXJnZXRcIikuZXZhbHVhdGUoKGVsKSA9PiBlbC5pbm5lckhUTUwpKS50b0JlKHRyYW5zbGF0ZWQpO1xufSk7XG5cbnRlc3QoXCJSZXN0b3JlIHdoaWxlIGEgdHJhbnNsYXRpb24gaXMgaW4gZmxpZ2h0IHdpbnM6IHRoZSBsYXRlIGFuc3dlciBjaGFuZ2VzIG5vdGhpbmdcIiwgYXN5bmMgKHtcbiAgY29udGV4dCxcbiAgZml4dHVyZVNlcnZlcixcbiAgY21zU2VydmVyLFxuICBzZWxlY3RUZXh0LFxuICBjbGlja01lbnUsXG59KSA9PiB7XG4gIGZpeHR1cmVTZXJ2ZXIuc2V0SHRtbChwYWdlKGA8cCBpZD1cInRhcmdldFwiPkVpbiBBYnNhdHosIGRlc3NlbiDDnGJlcnNldHp1bmcgenUgc3DDpHQgYW5rb21tdC48L3A+YCkpO1xuICBjb25zdCB0YWIgPSBhd2FpdCBjb250ZXh0Lm5ld1BhZ2UoKTtcbiAgYXdhaXQgdGFiLmdvdG8oRklYVFVSRV9PUklHSU4pO1xuICBjb25zdCBvcmlnaW5hbCA9IGF3YWl0IHRhYi5sb2NhdG9yKFwiYXJ0aWNsZVwiKS5ldmFsdWF0ZSgoZWwpID0+IGVsLmlubmVySFRNTCk7XG5cbiAgY29uc3QgcmVsZWFzZSA9IGNtc1NlcnZlci5ob2xkVHJhbnNsYXRlKCk7XG4gIGF3YWl0IHNlbGVjdFRleHQodGFiLCBcIiN0YXJnZXRcIik7XG4gIGF3YWl0IGNsaWNrTWVudSh0YWIsIFwidHJhbnNsYXRlXCIpO1xuICBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiBjbXNTZXJ2ZXIuY2FsbENvdW50cy50cmFuc2xhdGUpLnRvQmUoMSk7XG4gIGF3YWl0IGNsaWNrTWVudSh0YWIsIFwicmVzdG9yZVwiKTtcbiAgYXdhaXQgZXhwZWN0KHRhYi5nZXRCeVRleHQoXCJUcmFuc2xhdGluZ+KAplwiKSkudG9IYXZlQ291bnQoMCk7XG5cbiAgcmVsZWFzZSgpO1xuICAvLyBUaGUgYmFja2dyb3VuZCBmZXRjaGVzIGV4ZXJjaXNlcyBhZnRlciB0aGUgdHJhbnNsYXRpb247IHRoZSBjb250ZW50IHNjcmlwdCBnZXRzIGJvdGggYWZ0ZXIuXG4gIGF3YWl0IGV4cGVjdC5wb2xsKCgpID0+IGNtc1NlcnZlci5jYWxsQ291bnRzLmV4ZXJjaXNlcykudG9CZSgxKTtcbiAgYXdhaXQgdGFiLndhaXRGb3JUaW1lb3V0KDUwMCk7XG4gIGV4cGVjdChhd2FpdCB0YWIubG9jYXRvcihcImFydGljbGVcIikuZXZhbHVhdGUoKGVsKSA9PiBlbC5pbm5lckhUTUwpKS50b0JlKG9yaWdpbmFsKTtcbiAgYXdhaXQgZXhwZWN0KHRhYi5sb2NhdG9yKFwiLnN3LXBhbmVsIC5zdy1jYXJkXCIpKS50b0hhdmVDb3VudCgwKTtcbn0pO1xuXG50ZXN0KFwiYSBzZWxlY3Rpb24gdGhhdCBpbmNsdWRlcyBjb2RlIGlzIHJlZnVzZWQgd2l0aCBhIGNsZWFyIG1lc3NhZ2U7IG5vdGhpbmcgaXMgc2VudCBvciBjaGFuZ2VkXCIsIGFzeW5jICh7XG4gIGNvbnRleHQsXG4gIGZpeHR1cmVTZXJ2ZXIsXG4gIGNtc1NlcnZlcixcbiAgc2VsZWN0VGV4dCxcbiAgY2xpY2tNZW51LFxufSkgPT4ge1xuICBmaXh0dXJlU2VydmVyLnNldEh0bWwoXG4gICAgcGFnZShgPHAgaWQ9XCJhXCI+SW5zdGFsbGllcmUgZXMgbWl0IDxjb2RlPm5wbSBpIHNwcmFjaHdlaXNlPC9jb2RlPiBpbSBUZXJtaW5hbC48L3A+YCksXG4gICk7XG4gIGNvbnN0IHRhYiA9IGF3YWl0IGNvbnRleHQubmV3UGFnZSgpO1xuICBhd2FpdCB0YWIuZ290byhGSVhUVVJFX09SSUdJTik7XG4gIGNvbnN0IGJlZm9yZSA9IGF3YWl0IHRhYi5sb2NhdG9yKFwiYXJ0aWNsZVwiKS5ldmFsdWF0ZSgoZWwpID0+IGVsLmlubmVySFRNTCk7XG4gIGF3YWl0IHNlbGVjdFRleHQodGFiLCBcIiNhXCIpO1xuICBhd2FpdCBjbGlja01lbnUodGFiLCBcInRyYW5zbGF0ZVwiKTtcblxuICBhd2FpdCBleHBlY3QoXG4gICAgdGFiLmdldEJ5VGV4dChcIlNlbGVjdGlvbiBpbmNsdWRlcyBjb2RlIG9yIGZvcm0gZmllbGRzIOKAlCBzZWxlY3QgcGxhaW4gdGV4dCBvbmx5LlwiKSxcbiAgKS50b0JlVmlzaWJsZSgpO1xuICBleHBlY3QoY21zU2VydmVyLmNhbGxDb3VudHMudHJhbnNsYXRlKS50b0JlKDApO1xuICBleHBlY3QoYXdhaXQgdGFiLmxvY2F0b3IoXCJhcnRpY2xlXCIpLmV2YWx1YXRlKChlbCkgPT4gZWwuaW5uZXJIVE1MKSkudG9CZShiZWZvcmUpO1xuICBhd2FpdCBleHBlY3RcbiAgICAucG9sbCgoKSA9PiBjbXNTZXJ2ZXIucmVxdWVzdHMuZXZlbnRzLmZsYXRNYXAoKGIpID0+IGIuZXZlbnRzKSlcbiAgICAudG9Db250YWluRXF1YWwoZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoeyBuYW1lOiBcImNsaWVudF9lcnJvclwiLCBlcnJvcjogXCJzZWxlY3Rpb24tZXhjbHVkZWRcIiB9KSk7XG59KTtcblxudGVzdChcImEgY29udGFpbmVyJ3Mgb3duIHRleHQgaXMgcmVmdXNlZCwgYW5kIGEgcGFyYWdyYXBoIGluc2lkZSBpdCBpcyB0cmFuc2xhdGVkIGFsb25lXCIsIGFzeW5jICh7XG4gIGNvbnRleHQsXG4gIGZpeHR1cmVTZXJ2ZXIsXG4gIGNtc1NlcnZlcixcbiAgY2xpY2tNZW51LFxufSkgPT4ge1xuICBmaXh0dXJlU2VydmVyLnNldEh0bWwoXG4gICAgcGFnZShcbiAgICAgIGA8ZGl2IGlkPVwiYm94XCI+SGVhZGVyPHAgaWQ9XCJzZWxcIj5TZWxlY3RlZCBwYXJhZ3JhcGggdGV4dC48L3A+PHAgaWQ9XCJ1bnNlbFwiPlVuc2VsZWN0ZWQgcGFyYWdyYXBoIHRleHQuPC9wPjxpbnB1dCBpZD1cImZpZWxkXCIgdmFsdWU9XCJ0eXBlZFwiPjwvZGl2PmAsXG4gICAgKSxcbiAgKTtcbiAgY29uc3QgdGFiID0gYXdhaXQgY29udGV4dC5uZXdQYWdlKCk7XG4gIGF3YWl0IHRhYi5nb3RvKEZJWFRVUkVfT1JJR0lOKTtcbiAgY29uc3QgYmVmb3JlID0gYXdhaXQgdGFiLmxvY2F0b3IoXCJhcnRpY2xlXCIpLmV2YWx1YXRlKChlbCkgPT4gZWwuaW5uZXJIVE1MKTtcbiAgY29uc3QgdW50b3VjaGVkID0gKCkgPT5cbiAgICB0YWIuZXZhbHVhdGUoKCkgPT5cbiAgICAgIFtcInVuc2VsXCIsIFwiZmllbGRcIl0ubWFwKChpZCkgPT4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpIS5vdXRlckhUTUwpLmpvaW4oXCJcIiksXG4gICAgKTtcbiAgY29uc3QgdW50b3VjaGVkQmVmb3JlID0gYXdhaXQgdW50b3VjaGVkKCk7XG5cbiAgLy8gRnJvbSBpbnNpZGUgXCJIZWFkZXJcIiBpbnRvIHRoZSBmaXJzdCBwYXJhZ3JhcGg6IHRoYXQgdGV4dCBoYXMgbm8gcGFyYWdyYXBoIG9mIGl0cyBvd24uXG4gIGF3YWl0IHRhYi5ldmFsdWF0ZSgoKSA9PiB7XG4gICAgY29uc3QgYm94ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJib3hcIikhO1xuICAgIGNvbnN0IHJhbmdlID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKTtcbiAgICByYW5nZS5zZXRTdGFydChib3guZmlyc3RDaGlsZCEsIDIpO1xuICAgIHJhbmdlLnNldEVuZChkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNlbFwiKSEuZmlyc3RDaGlsZCEsIDgpO1xuICAgIGdldFNlbGVjdGlvbigpIS5yZW1vdmVBbGxSYW5nZXMoKTtcbiAgICBnZXRTZWxlY3Rpb24oKSEuYWRkUmFuZ2UocmFuZ2UpO1xuICB9KTtcbiAgYXdhaXQgY2xpY2tNZW51KHRhYiwgXCJ0cmFuc2xhdGVcIik7XG4gIGF3YWl0IGV4cGVjdChcbiAgICB0YWIuZ2V0QnlUZXh0KFxuICAgICAgXCJTZWxlY3Rpb24gaW5jbHVkZXMgdGV4dCBvdXRzaWRlIGEgcGFyYWdyYXBoIOKAlCBzZWxlY3QgdGV4dCBpbnNpZGUgcGFyYWdyYXBocyBvbmx5LlwiLFxuICAgICksXG4gICkudG9CZVZpc2libGUoKTtcbiAgZXhwZWN0KGNtc1NlcnZlci5jYWxsQ291bnRzLnRyYW5zbGF0ZSkudG9CZSgwKTtcbiAgZXhwZWN0KGF3YWl0IHRhYi5sb2NhdG9yKFwiYXJ0aWNsZVwiKS5ldmFsdWF0ZSgoZWwpID0+IGVsLmlubmVySFRNTCkpLnRvQmUoYmVmb3JlKTtcbiAgYXdhaXQgZXhwZWN0XG4gICAgLnBvbGwoKCkgPT4gY21zU2VydmVyLnJlcXVlc3RzLmV2ZW50cy5mbGF0TWFwKChiKSA9PiBiLmV2ZW50cykpXG4gICAgLnRvQ29udGFpbkVxdWFsKGV4cGVjdC5vYmplY3RDb250YWluaW5nKHsgbmFtZTogXCJjbGllbnRfZXJyb3JcIiwgZXJyb3I6IFwic2VsZWN0aW9uLW1peGVkXCIgfSkpO1xuXG4gIC8vIFRyaXBsZS1jbGljayBzdHlsZTogdGhlIHdob2xlIGZpcnN0IHBhcmFncmFwaCB1cCB0byB0aGUgc3RhcnQgb2YgdGhlIG5leHQgb25lLlxuICBhd2FpdCB0YWIuZXZhbHVhdGUoKCkgPT4ge1xuICAgIGNvbnN0IHJhbmdlID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKTtcbiAgICByYW5nZS5zZXRTdGFydChkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNlbFwiKSEuZmlyc3RDaGlsZCEsIDApO1xuICAgIHJhbmdlLnNldEVuZChkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInVuc2VsXCIpISwgMCk7XG4gICAgZ2V0U2VsZWN0aW9uKCkhLnJlbW92ZUFsbFJhbmdlcygpO1xuICAgIGdldFNlbGVjdGlvbigpIS5hZGRSYW5nZShyYW5nZSk7XG4gIH0pO1xuICBhd2FpdCBjbGlja01lbnUodGFiLCBcInRyYW5zbGF0ZVwiKTtcbiAgYXdhaXQgZXhwZWN0KHRhYi5sb2NhdG9yKFwiI3NlbCAuc3ctdm9jYWJcIikuZmlyc3QoKSkudG9CZVZpc2libGUoKTtcbiAgZXhwZWN0KGNtc1NlcnZlci5yZXF1ZXN0cy50cmFuc2xhdGUpLnRvRXF1YWwoW1xuICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHsgdGV4dDogXCJTZWxlY3RlZCBwYXJhZ3JhcGggdGV4dC5cIiB9KSxcbiAgXSk7XG4gIGV4cGVjdChhd2FpdCB1bnRvdWNoZWQoKSkudG9CZSh1bnRvdWNoZWRCZWZvcmUpO1xuICBhd2FpdCBleHBlY3QodGFiLmxvY2F0b3IoXCIjYm94XCIpKS50b0hhdmVUZXh0KC9eSGVhZGVyLyk7XG5cbiAgYXdhaXQgY2xpY2tNZW51KHRhYiwgXCJyZXN0b3JlXCIpO1xuICBhd2FpdCBleHBlY3QodGFiLmxvY2F0b3IoXCIuc3ctdm9jYWJcIikpLnRvSGF2ZUNvdW50KDApO1xuICBleHBlY3QoYXdhaXQgdGFiLmxvY2F0b3IoXCJhcnRpY2xlXCIpLmV2YWx1YXRlKChlbCkgPT4gZWwuaW5uZXJIVE1MKSkudG9CZShiZWZvcmUpO1xufSk7XG4iXSwibWFwcGluZ3MiOiJBQUFBLFNBQVNBLE1BQU0sRUFBRUMsSUFBSSxRQUFRLFlBQVk7QUFDekMsU0FBU0MsY0FBYyxRQUFRLFNBQVM7QUFFeEMsU0FBU0MsSUFBSUEsQ0FBQ0MsSUFBWSxFQUFVO0VBQ2xDLE9BQU8sdUNBQXVDQSxJQUFJLDBCQUEwQjtBQUM5RTtBQUVBSCxJQUFJLENBQUMsNEZBQTRGLEVBQUUsT0FBTztFQUN4R0ksT0FBTztFQUNQQyxhQUFhO0VBQ2JDLFNBQVM7RUFDVEM7QUFDRixDQUFDLEtBQUs7RUFDSkYsYUFBYSxDQUFDRyxPQUFPLENBQ25CTixJQUFJLENBQ0YsMElBQ0YsQ0FDRixDQUFDO0VBQ0QsTUFBTU8sR0FBRyxHQUFHLE1BQU1MLE9BQU8sQ0FBQ00sT0FBTyxDQUFDLENBQUM7RUFDbkMsTUFBTUQsR0FBRyxDQUFDRSxJQUFJLENBQUNWLGNBQWMsQ0FBQztFQUM5QixNQUFNVyxNQUFNLEdBQUdILEdBQUcsQ0FBQ0ksT0FBTyxDQUFDLFNBQVMsQ0FBQztF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