import { expect, test } from "./fixtures";
import { FIXTURE_ORIGIN } from "./ports";

function localDate(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

test("due words are reviewed offline, the badge and popup follow the queue", async ({
  context,
  cmsServer,
  serviceWorker,
  extensionId,
}) => {
  // Two words due (one with a stored sentence, one from before sentences were stored), one not.
  await serviceWorker.evaluate(
    async ({ yesterday, today, later }) => {
      const base = { encounterCount: 1, status: "due", firstEncounteredAt: 1 };
      await chrome.storage.local.set({
        vocabulary: {
          termin: {
            ...base,
            id: "termin",
            german: "Termin",
            russian: "встреча",
            contextSentence: "Ich habe heute zwei Termine.",
            contextForm: "Termine",
          },
          haus: { ...base, id: "haus", german: "Haus", russian: "дом" },
          zukunft: { ...base, id: "zukunft", german: "Zukunft", russian: "будущее" },
        },
        reviewQueue: {
          termin: { vocabId: "termin", repetitions: 1, intervalDays: 1, dueDate: yesterday },
          haus: { vocabId: "haus", repetitions: 1, intervalDays: 1, dueDate: today },
          zukunft: { vocabId: "zukunft", repetitions: 2, intervalDays: 6, dueDate: later },
        },
      });
    },
    { yesterday: localDate(-1), today: localDate(0), later: localDate(5) },
  );

  await expect.poll(() => serviceWorker.evaluate(() => chrome.action.getBadgeText({}))).toBe("2");

  // The backend is gone: nothing in a review session may need it.
  await cmsServer.close();

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(popup.getByRole("button", { name: "Review 2 words" })).toBeVisible();

  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html#review`);
  await expect(page.getByText("Word 1 of 2")).toBeVisible();

  // Most overdue first: the fill-the-blank over the stored sentence.
  await expect(page.getByText("Ich habe heute zwei ___.")).toBeVisible();
  await expect(page.getByText("Meaning: встреча")).toBeVisible();
  await page.getByPlaceholder("Type the missing word").fill("termine");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("Correct!")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();

  // No stored sentence: recall the translation.
  await expect(page.getByText("Word 2 of 2")).toBeVisible();
  await expect(page.getByText("Haus", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Show translation" }).click();
  await expect(page.getByText("дом")).toBeVisible();
  await page.getByRole("button", { name: "I remember" }).click();
  await page.getByRole("button", { name: "Next" }).click();

  await expect(page.getByText("Session complete")).toBeVisible();
  await expect(page.getByText("Correct: 2 of 2")).toBeVisible();

  const queue = await serviceWorker.evaluate(
    async () =>
      (await chrome.storage.local.get("reviewQueue")).reviewQueue as Record<
        string,
        { dueDate: string; repetitions: number }
      >,
  );
  expect(queue.termin?.dueDate && queue.termin.dueDate > localDate(0)).toBe(true);
  expect(queue.haus?.dueDate && queue.haus.dueDate > localDate(0)).toBe(true);
  expect(queue.termin?.repetitions).toBe(2);
  expect(queue.zukunft).toEqual({
    vocabId: "zukunft",
    repetitions: 2,
    intervalDays: 6,
    dueDate: localDate(5),
  });

  await expect.poll(() => serviceWorker.evaluate(() => chrome.action.getBadgeText({}))).toBe("");

  // With nothing due the screen says so.
  await page.reload();
  await expect(page.getByText("Nothing is due today.")).toBeVisible();
});

test("a wrong answer makes the word due tomorrow and counts in the score", async ({
  context,
  serviceWorker,
  extensionId,
}) => {
  await serviceWorker.evaluate(async (yesterday) => {
    await chrome.storage.local.set({
      vocabulary: {
        haus: {
          id: "haus",
          german: "Haus",
          russian: "дом",
          encounterCount: 1,
          status: "due",
          firstEncounteredAt: 1,
        },
      },
      reviewQueue: {
        haus: { vocabId: "haus", repetitions: 3, intervalDays: 6, dueDate: yesterday },
      },
    });
  }, localDate(-1));

  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html#review`);
  await page.getByRole("button", { name: "Show translation" }).click();
  await page.getByRole("button", { name: "I don't remember" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Correct: 0 of 1")).toBeVisible();

  const entry = await serviceWorker.evaluate(
    async () =>
      (await chrome.storage.local.get("reviewQueue")).reviewQueue.haus as {
        dueDate: string;
        repetitions: number;
      },
  );
  expect(entry).toMatchObject({ dueDate: localDate(1), repetitions: 0 });
});

test("a translated paragraph stores the sentence each word was seen in", async ({
  context,
  fixtureServer,
  serviceWorker,
  selectText,
  clickMenu,
}) => {
  fixtureServer.setHtml(`<!doctype html>
<html><body><article>
  <p id="target">The mock backend answers with its own German text, whatever this paragraph says, padded well past the eighty character minimum threshold.</p>
</article></body></html>`);
  const page = await context.newPage();
  await page.goto(FIXTURE_ORIGIN);
  await selectText(page, "#target");
  await clickMenu(page, "translate");
  await expect(page.locator("#target .sw-vocab").first()).toBeVisible();

  const vocab = await serviceWorker.evaluate(
    async () =>
      (await chrome.storage.local.get("vocabulary")).vocabulary as Record<
        string,
        { contextSentence?: string; contextForm?: string }
      >,
  );
  expect(vocab.moechte).toMatchObject({
    contextForm: "moechte",
    contextSentence: "Ich moechte einen Kaffee bestellen und dann in Ruhe die Zeitung lesen.",
  });
});
