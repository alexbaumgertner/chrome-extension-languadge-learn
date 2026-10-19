import { describe, expect, it } from "vitest";
import { ensureSchema } from "../../src/db";
import { reserveCounters, reserveUsage } from "../../src/usage/ledger";
import { createTestDb } from "../helpers/test-app";

const cfg = { GEMINI_DAILY_REQUEST_ALLOWANCE: 2 };
const now = new Date("2026-08-16T12:00:00Z");

async function freshDb() {
  const db = createTestDb();
  await ensureSchema(db);
  return db;
}

describe("usage-ledger threshold math", () => {
  it("allows requests within the allowance, then refuses past it", async () => {
    const db = await freshDb();
    expect(await reserveUsage(db, cfg, now)).toBe(true);
    expect(await reserveUsage(db, cfg, now)).toBe(true);
    expect(await reserveUsage(db, cfg, now)).toBe(false);
  });

  it("a new period_key starts a fresh row at usage = 0 with no explicit reset", async () => {
    const db = await freshDb();
    const day2 = new Date("2026-08-17T12:00:00Z");
    expect(await reserveUsage(db, cfg, now)).toBe(true);
    expect(await reserveUsage(db, cfg, now)).toBe(true);
    expect(await reserveUsage(db, cfg, now)).toBe(false);
    expect(await reserveUsage(db, cfg, day2)).toBe(true);
  });

  it("an amount larger than the allowance is refused even on a fresh period", async () => {
    const db = await freshDb();
    expect(
      await reserveCounters(db, [{ counter: "x", periodKey: "p", amount: 5, allowance: 4 }]),
    ).toBe(false);
  });

  it("a refusal never leaves a partial increment on an earlier counter", async () => {
    const db = await freshDb();
    expect(
      await reserveCounters(db, [
        { counter: "a", periodKey: "p", amount: 1, allowance: 10 },
        { counter: "b", periodKey: "p", amount: 3, allowance: 2 },
      ]),
    ).toBe(false);

    const rows = await db.query<{ usage: number }>(
      "SELECT usage FROM usage_counters WHERE counter = 'a'",
    );
    expect(rows.every((row) => row.usage === 0)).toBe(true);
  });

  it("concurrent reservations never overshoot the allowance", async () => {
    const db = await freshDb();
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        reserveCounters(db, [{ counter: "x", periodKey: "p", amount: 1, allowance: 3 }]),
      ),
    );
    expect(results.filter(Boolean)).toHaveLength(3);
  });
});
