import { describe, expect, it } from "vitest";
import { applySolve, effectiveProgress } from "@/lib/progress/logic";

const base = {
  currentStreak: 3,
  lastSolvedLocalDate: "2026-08-09",
  activeVocabCount: 5,
  topicAccuracy: {},
  solvedTodayCount: 0,
};

describe("applySolve", () => {
  it("increments the streak exactly once on the first solve of a new consecutive local date", () => {
    const next = applySolve(base, "2026-08-10", true, "dative-case");
    expect(next.currentStreak).toBe(4);
    expect(next.solvedTodayCount).toBe(1);
    expect(next.lastSolvedLocalDate).toBe("2026-08-10");
  });

  it("does not increment the streak again for a second solve on the same local date", () => {
    const first = applySolve(base, "2026-08-10", true, "dative-case");
    const second = applySolve(first, "2026-08-10", false, "dative-case");
    expect(second.currentStreak).toBe(4);
    expect(second.solvedTodayCount).toBe(2);
  });

  it("resets to 0 then 1 when more than one local day has passed since the last solve", () => {
    const stale = { ...base, lastSolvedLocalDate: "2026-08-01" };
    const next = applySolve(stale, "2026-08-10", true, "dative-case");
    expect(next.currentStreak).toBe(1);
    expect(next.solvedTodayCount).toBe(1);
  });

  it("updates per-topic accuracy independently of streak logic", () => {
    const next = applySolve(base, "2026-08-10", false, "dative-case");
    expect(next.topicAccuracy["dative-case"]).toEqual({ correct: 0, total: 1 });
    const again = applySolve(next, "2026-08-10", true, "dative-case");
    expect(again.topicAccuracy["dative-case"]).toEqual({ correct: 1, total: 2 });
  });
});

describe("effectiveProgress", () => {
  it("leaves the profile untouched when already solved today", () => {
    const profile = { ...base, lastSolvedLocalDate: "2026-08-10", solvedTodayCount: 2 };
    expect(effectiveProgress(profile, "2026-08-10")).toEqual(profile);
  });

  it("zeroes solvedTodayCount but preserves streak the day after a solve", () => {
    const profile = { ...base, lastSolvedLocalDate: "2026-08-09", solvedTodayCount: 3 };
    const next = effectiveProgress(profile, "2026-08-10");
    expect(next.solvedTodayCount).toBe(0);
    expect(next.currentStreak).toBe(3);
  });

  it("zeroes both streak and solvedTodayCount when more than one day has passed", () => {
    const profile = { ...base, lastSolvedLocalDate: "2026-08-01", solvedTodayCount: 3 };
    const next = effectiveProgress(profile, "2026-08-10");
    expect(next.currentStreak).toBe(0);
    expect(next.solvedTodayCount).toBe(0);
  });
});
