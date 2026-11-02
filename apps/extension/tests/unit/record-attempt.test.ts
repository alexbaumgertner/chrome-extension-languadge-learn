import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAllReviewQueue,
  getAllVocabulary,
  getProgressProfile,
  recordAttempt,
} from "@/lib/storage/progress";
import { formatLocalDate } from "@/lib/srs/scheduler";

/** In-memory chrome.storage.local whose every call yields to the event loop, so unserialized read-modify-writes interleave. */
function stubStorage(initial: Record<string, unknown>): void {
  const data: Record<string, unknown> = structuredClone(initial);
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        async get(key: string) {
          await tick();
          return key in data ? { [key]: structuredClone(data[key]) } : {};
        },
        async set(items: Record<string, unknown>) {
          await tick();
          Object.assign(data, structuredClone(items));
        },
      },
    },
  });
}

const today = formatLocalDate(new Date());

function seed() {
  const word = (id: string) => ({
    id,
    german: id,
    russian: `ru-${id}`,
    encounterCount: 1,
    status: "due",
    firstEncounteredAt: 1,
  });
  const due = (vocabId: string) => ({ vocabId, repetitions: 2, intervalDays: 3, dueDate: today });
  return {
    vocabulary: { haus: word("haus"), baum: word("baum") },
    reviewQueue: { haus: due("haus"), baum: due("baum") },
  };
}

describe("recordAttempt serialization", () => {
  beforeEach(() => stubStorage(seed()));
  afterEach(() => vi.unstubAllGlobals());

  it("keeps both words' schedules and the counters when two review answers overlap", async () => {
    // What two SUBMIT_REVIEW_ATTEMPT messages sent back to back make the background do.
    const attempt = (vocabId: string) =>
      recordAttempt({
        correct: true,
        affectedVocabIds: [vocabId],
        topic: "review",
        timestamp: Date.now(),
      });
    await Promise.all([attempt("haus"), attempt("baum")]);

    const queue = await getAllReviewQueue();
    expect(queue.haus).toMatchObject({ repetitions: 3 });
    expect(queue.baum).toMatchObject({ repetitions: 3 });
    expect(queue.haus!.dueDate > today).toBe(true);
    expect(queue.baum!.dueDate > today).toBe(true);

    const vocab = await getAllVocabulary();
    expect(vocab.haus!.status).toBe("active");
    expect(vocab.baum!.status).toBe("active");

    const profile = await getProgressProfile();
    expect(profile.solvedTodayCount).toBe(2);
    expect(profile.topicAccuracy["review"]).toEqual({ correct: 2, total: 2 });
  });

  it("a failing attempt does not block the ones queued behind it", async () => {
    const original = chrome.storage.local.set;
    let calls = 0;
    chrome.storage.local.set = async (items) => {
      if (++calls === 1) throw new Error("quota");
      return original(items);
    };
    const first = recordAttempt({
      correct: true,
      affectedVocabIds: ["haus"],
      topic: "review",
      timestamp: Date.now(),
    });
    const second = recordAttempt({
      correct: true,
      affectedVocabIds: ["baum"],
      topic: "review",
      timestamp: Date.now(),
    });
    await expect(first).rejects.toThrow("quota");
    await expect(second).resolves.toMatchObject({ solvedTodayCount: 1 });
  });
});
