import type { Locator } from "@playwright/test";
import { expect, test } from "./fixtures";
import { FIXTURE_ORIGIN } from "./ports";
import { msg } from "./locale";

/** A Russian browser gets a Russian UI on every surface; the English specs cover the rest. */
test.use({ uiLocale: "ru" });

const LONG = (label: string): string =>
  `${label} padded well past the eighty character minimum threshold so the parser treats this as real article content.`;

const page = (body: string): string =>
  `<!doctype html><html><body><article>${body}</article></body></html>`;

/** Latin words in `text` other than the brand and the German shown in exercises. */
function latinWords(text: string, allowed: string[]): string[] {
  return (text.match(/[A-Za-zÄÖÜäöüß]{2,}/g) ?? []).filter(
    (w) => w !== "Sprachweise" && !allowed.some((a) => a.includes(w)),
  );
}

/**
 * Panel copy cut off at the panel's real width: placeholders (measured by typing them in, then
 * clearing the field without telling React) and the labels of the panel's own buttons.
 */
async function overflowingCopy(panel: Locator): Promise<string[]> {
  return panel.evaluate((el) => {
    const cut: string[] = [];
    for (const input of el.querySelectorAll<HTMLInputElement>("input[placeholder]")) {
      const before = input.value;
      input.value = input.placeholder;
      if (input.scrollWidth > input.clientWidth) cut.push(`placeholder: ${input.placeholder}`);
      input.value = before;
    }
    const buttons = el.querySelectorAll<HTMLElement>(
      ".sw-header button, .sw-submit, .sw-audio-controls button, .sw-report-btn",
    );
    for (const button of buttons) {
      if (button.scrollWidth > button.clientWidth) cut.push(`button: ${button.textContent}`);
    }
    return cut;
  });
}

test("the panel, its exercises and the report footer are in Russian", async ({
  context,
  fixtureServer,
  selectText,
  clickMenu,
}) => {
  fixtureServer.setHtml(page(`<p id="target">${LONG("Russian panel")}</p>`));
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);
  await selectText(tab, "#target");
  await clickMenu(tab, "translate");

  const panel = tab.locator(".sw-panel");
  await expect(panel.locator(".sw-card")).toHaveCount(5);
  await expect(panel).toHaveAttribute("lang", "ru");
  await expect(panel.getByRole("button", { name: msg("ru", "panelCollapse") })).toBeVisible();
  await expect(panel).toContainText(msg("ru", "kickerWordPairing"));
  await expect(panel).toContainText(msg("ru", "pairingInstruction"));
  await expect(panel).toContainText(msg("ru", "panelTopic", msg("ru", "topicGeneral")));
  await expect(panel.getByRole("button", { name: msg("ru", "reportButton") })).toBeVisible();
  await expect(
    panel.locator(`input[placeholder="${msg("ru", "fillBlankPlaceholder")}"]`),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: msg("ru", "exerciseCheck") }).first(),
  ).toBeVisible();

  // Every placeholder and button label fits the 412px panel.
  expect(await overflowingCopy(panel)).toEqual([]);

  // Nothing English left: only the German of the exercises themselves.
  const german = await panel
    .locator(".sw-sentence, .sw-choice, .sw-pairing button")
    .allTextContents();
  const uiText = await panel.evaluate((el) => {
    const copy = el.cloneNode(true) as HTMLElement;
    copy.querySelectorAll(".sw-sentence, .sw-choice, .sw-pairing").forEach((n) => n.remove());
    const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
    const parts: string[] = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) parts.push(n.textContent ?? "");
    return parts.join(" ");
  });
  expect(latinWords(uiText, german)).toEqual([]);

  await panel.getByRole("button", { name: msg("ru", "panelCollapse") }).click();
  await expect(tab.locator(".sw-tab")).toHaveAccessibleName(/^\d+ упражнени/);
});

test("notices are in Russian", async ({
  context,
  fixtureServer,
  cmsServer,
  selectText,
  clickMenu,
}) => {
  fixtureServer.setHtml(page(`<p id="target">${LONG("Russian notice")}</p>`));
  const tab = await context.newPage();
  await tab.goto(FIXTURE_ORIGIN);

  await clickMenu(tab, "translate");
  await expect(tab.getByText(msg("ru", "noticeSelectFirst"))).toBeVisible();

  cmsServer.setMode("fail");
  await selectText(tab, "#target");
  await clickMenu(tab, "translate");
  const error = tab.getByRole("alert");
  await expect(error).toHaveText(msg("ru", "noticeUnavailable"));
  await expect(error.getByRole("button", { name: msg("ru", "noticeDismiss") })).toBeVisible();
});

test("the popup and the options page are in Russian", async ({ context, extensionId }) => {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(popup.locator("html")).toHaveAttribute("lang", "ru");
  await expect(popup.getByText(msg("ru", "popupSolvedToday"))).toBeVisible();
  await expect(popup.locator(".popup-howto-text")).toHaveText(
    msg("ru", "popupHowto", msg("ru", "menuTranslate")),
  );
  // The shortcut (Alt+Shift+G) or the chrome:// address to set one are the only Latin text.
  const keys = ["Alt Shift Ctrl Command", "chrome extensions shortcuts"];
  expect(latinWords(await popup.locator("body").innerText(), keys)).toEqual([]);

  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(options).toHaveTitle(msg("ru", "optionsTitle"));
  await expect(options.locator(".stats")).toContainText(msg("ru", "progressStreakLabel"));
  await options.getByRole("button", { name: msg("ru", "optionsTabSettings") }).click();
  await expect(options.getByRole("heading", { name: msg("ru", "settingsHeading") })).toBeVisible();
  expect(latinWords(await options.locator("body").innerText(), [])).toEqual([]);
});
