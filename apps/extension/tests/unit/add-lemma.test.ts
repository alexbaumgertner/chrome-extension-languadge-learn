import { beforeEach, describe, expect, it, vi } from "vitest";
import { addLemmaToVocabulary } from "@/lib/vocab/add-lemma";
import { getAllReviewQueue, getAllVocabulary } from "@/lib/storage/progress";
import { formatLocalDate } from "@/lib/srs/scheduler";

function stubStorage(initial: Record<string, unknown> = {}): void {
  const data: Record<string, unknown> = structuredClone(initial);
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        async get(key: string) {
          return key in data ? { [key]: structuredClone(data[key]) } : {};
        },
        async set(items: Record<string, unknown>) {
          Object.assign(data, structuredClone(items));
        },
      },
    },
  });
}

const NOW = new Date(2026, 10, 21, 12).getTime();
const TODAY = formatLocalDate(new Date(NOW));

describe("addLemmaToVocabulary", () => {
  beforeEach(() => stubStorage());

  it("adds the lemma as an active word with a card due today", async () => {
    await addLemmaToVocabulary("der Hund", "собака", NOW);
    expect((await getAllVocabulary())["der hund"]).toMatchObject({
      german: "der Hund",
      russian: "собака",
      status: "active",
      encounterCount: 0,
      firstEncounteredAt: NOW,
    });
    expect((await getAllReviewQueue())["der hund"]).toEqual({
      vocabId: "der hund",
      repetitions: 0,
      intervalDays: 1,
      dueDate: TODAY,
    });
  });

  it("changes nothing when it is added twice", async () => {
    await addLemmaToVocabulary("der Hund", "собака", NOW);
    const first = [await getAllVocabulary(), await getAllReviewQueue()];
    await addLemmaToVocabulary("der Hund", "пёс", NOW + 86_400_000);
    expect([await getAllVocabulary(), await getAllReviewQueue()]).toEqual(first);
  });

  it("keeps the record and the schedule of a word the learner already has", async () => {
    stubStorage({
      vocabulary: {
        "der hund": {
          id: "der hund",
          german: "der Hund",
          russian: "собака",
          encounterCount: 3,
          status: "due",
          firstEncounteredAt: 1,
        },
      },
      reviewQueue: {
        "der hund": { vocabId: "der hund", repetitions: 2, intervalDays: 6, dueDate: "2026-11-01" },
      },
    });
    await addLemmaToVocabulary("der Hund", "собака", NOW);
    expect((await getAllVocabulary())["der hund"]).toMatchObject({
      encounterCount: 3,
      status: "due",
    });
    expect((await getAllReviewQueue())["der hund"]).toMatchObject({
      repetitions: 2,
      intervalDays: 6,
    });
  });

  it("gives a known word without a card its first card", async () => {
    stubStorage({
      vocabulary: {
        "der hund": {
          id: "der hund",
          german: "der Hund",
          russian: "собака",
          encounterCount: 1,
          status: "active",
          firstEncounteredAt: 1,
        },
      },
    });
    await addLemmaToVocabulary("der Hund", "собака", NOW);
    expect((await getAllReviewQueue())["der hund"]).toMatchObject({ dueDate: TODAY });
  });
});
