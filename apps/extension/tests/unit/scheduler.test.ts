import { describe, expect, it } from "vitest";
import { addDays, advance } from "@/lib/srs/scheduler";

const fresh = { vocabId: "moechten", repetitions: 0, intervalDays: 1, dueDate: "2026-08-10" };

describe("addDays", () => {
  it("rolls over month/year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("advance", () => {
  it("progresses the interval 1 -> 6 -> ~2.5x on consecutive correct answers", () => {
    const first = advance(fresh, true, "2026-08-10");
    expect(first.repetitions).toBe(1);
    expect(first.intervalDays).toBe(1);
    expect(first.dueDate).toBe("2026-08-11");

    const second = advance(first, true, "2026-08-11");
    expect(second.repetitions).toBe(2);
    expect(second.intervalDays).toBe(6);
    expect(second.dueDate).toBe("2026-08-17");

    const third = advance(second, true, "2026-08-17");
    expect(third.repetitions).toBe(3);
    expect(third.intervalDays).toBe(15); // round(6 * 2.5)
    expect(third.dueDate).toBe("2026-09-01");
  });

  it("caps the interval instead of growing unbounded", () => {
    const nearCap = { vocabId: "x", repetitions: 10, intervalDays: 300, dueDate: "2026-08-10" };
    const next = advance(nearCap, true, "2026-08-10");
    expect(next.intervalDays).toBe(365);
  });

  it("resets repetitions to 0 and interval to 1 day on an incorrect answer", () => {
    const learned = {
      vocabId: "moechten",
      repetitions: 4,
      intervalDays: 40,
      dueDate: "2026-08-10",
    };
    const reset = advance(learned, false, "2026-08-10");
    expect(reset.repetitions).toBe(0);
    expect(reset.intervalDays).toBe(1);
    expect(reset.dueDate).toBe("2026-08-11");
  });
});
