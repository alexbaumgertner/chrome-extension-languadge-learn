import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { withSchema, type Db } from "../../src/db";
import { createTestDb } from "../helpers/test-app";

const SQL_PATH = new URL("../../../../specs/003-private-beta/metrics.sql", import.meta.url);

/** `-- name: x` sections of metrics.sql, keyed by name. */
function loadQueries(): Record<string, string> {
  const queries: Record<string, string> = {};
  for (const section of readFileSync(SQL_PATH, "utf8")
    .split(/^-- name: /m)
    .slice(1)) {
    const [name, ...body] = section.split("\n");
    queries[name!.trim()] = body.join("\n");
  }
  return queries;
}

const A = "aaaaaaaa-0000-4000-8000-000000000000";
const B = "bbbbbbbb-0000-4000-8000-000000000000";

/**
 * A installed 7 days ago, active on days 1 and 7 after install; B installed yesterday, active
 * yesterday only. Offsets are relative to current_date so the queries' date windows apply.
 */
async function seed(db: Db): Promise<void> {
  const rows: Array<
    [string, string, number, string | null, number | null, string | null, number | null]
  > = [
    [A, "install", 7, null, null, null, null],
    [A, "paragraph_translated", 7, "miss", 2000, null, null],
    [A, "paragraph_translated", 6, "miss", 1800, null, null],
    [A, "paragraph_translated", 6, "hit", 100, null, null],
    [A, "exercise_completed", 6, null, null, null, null],
    [A, "client_error", 0, null, null, "translate-failed", 502],
    [A, "paragraph_translated", 0, "miss", 2200, null, null],
    [B, "install", 1, null, null, null, null],
    [B, "paragraph_translated", 1, "hit", 90, null, null],
  ];
  for (const [id, name, daysAgo, cache, latency, error, status] of rows) {
    await db.query(
      `INSERT INTO events
         (event_id, install_id, name, occurred_on, cache, latency_ms, error_code, http_status)
       VALUES (gen_random_uuid(), $1, $2, current_date - $3::int, $4, $5, $6, $7)`,
      [id, name, daysAgo, cache, latency, error, status],
    );
  }
}

describe("specs/003-private-beta/metrics.sql", () => {
  const queries = loadQueries();
  const db = withSchema(createTestDb());

  beforeAll(() => seed(db));

  it("defines the five metric queries", () => {
    expect(Object.keys(queries)).toEqual(["dau", "retention", "per_install", "errors", "latency"]);
  });

  it("dau: one row per day for 30 days, counting only non-install activity", async () => {
    const rows = await db.query<Record<string, unknown>>(queries.dau!);
    expect(rows).toHaveLength(30);
    const [today, yesterday] = rows;
    expect(today).toMatchObject({ active_installs: 1, new_installs: 0, paragraphs: 1, errors: 1 });
    expect(Number(today!.translate_error_pct)).toBe(50);
    expect(yesterday).toMatchObject({ active_installs: 1, new_installs: 1, paragraphs: 1 });
  });

  it("retention: D1 counts both installs, D3/D7 only the one old enough", async () => {
    const rows = await db.query<Record<string, unknown>>(queries.retention!);
    const byDay = Object.fromEntries(
      rows.map((r) => [r.day_n, [Number(r.eligible_installs), Number(r.retained_installs)]]),
    );
    // A: active on install+1 (6 days ago) and install+7 (today); B: installed yesterday, not today.
    expect(byDay).toEqual({ 1: [2, 1], 3: [1, 0], 7: [1, 1] });
  });

  it("per_install: paragraphs, cache hits and active days per install", async () => {
    const rows = await db.query<Record<string, unknown>>(queries.per_install!);
    expect(rows.map((r) => [r.install, r.paragraphs, r.cache_hits, r.active_days])).toEqual([
      ["aaaaaaaa", 4, 1, 3],
      ["bbbbbbbb", 1, 1, 1],
    ]);
  });

  it("errors and latency run and aggregate", async () => {
    const errors = await db.query<Record<string, unknown>>(queries.errors!);
    expect(errors).toEqual([
      expect.objectContaining({ error_code: "translate-failed", http_status: 502, errors: 1 }),
    ]);
    const latency = await db.query<Record<string, unknown>>(queries.latency!);
    const totals = latency.filter((r) => r.day === null);
    expect(totals.map((r) => [r.cache, Number(r.requests)])).toEqual([
      ["hit", 2],
      ["miss", 3],
    ]);
  });
});
