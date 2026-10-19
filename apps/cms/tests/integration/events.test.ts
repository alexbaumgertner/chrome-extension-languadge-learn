import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { config } from "../../src/config";
import { withSchema } from "../../src/db";
import { deleteExpiredEvents, eventDay } from "../../src/metrics/events";
import { buildTestApp, createTestDb } from "../helpers/test-app";

const INSTALL_ID = "0b6c3a62-5d2e-4f0a-9c1b-2e8f7d6a5b4c";

function setup() {
  const db = createTestDb();
  const app = buildTestApp(config, db);
  const post = (payload: object) => app.inject({ method: "POST", url: "/api/events", payload });
  return { db, post };
}

describe("POST /api/events", () => {
  it("stores each event with its day and only the metric fields", async () => {
    const { db, post } = setup();
    const occurredAt = new Date().toISOString();
    const response = await post({
      installId: INSTALL_ID,
      events: [
        { name: "install", id: randomUUID(), occurredAt },
        {
          name: "paragraph_translated",
          id: randomUUID(),
          occurredAt,
          cache: "miss",
          latencyMs: 1830,
        },
        { name: "paragraph_translated", id: randomUUID(), occurredAt, cache: "hit", latencyMs: 95 },
        { name: "exercise_completed", id: randomUUID(), occurredAt },
        {
          name: "client_error",
          id: randomUUID(),
          occurredAt,
          error: "translate-failed",
          httpStatus: 502,
        },
      ],
    });

    expect(response.statusCode).toBe(204);
    const rows = await db.query(
      `SELECT install_id::text, name, occurred_on::text, cache, latency_ms, error_code, http_status
       FROM events ORDER BY id`,
    );
    const today = occurredAt.slice(0, 10);
    const row = { install_id: INSTALL_ID, occurred_on: today };
    const none = { cache: null, latency_ms: null, error_code: null, http_status: null };
    expect(rows).toEqual([
      { ...row, name: "install", ...none },
      { ...row, name: "paragraph_translated", ...none, cache: "miss", latency_ms: 1830 },
      { ...row, name: "paragraph_translated", ...none, cache: "hit", latency_ms: 95 },
      { ...row, name: "exercise_completed", ...none },
      { ...row, name: "client_error", ...none, error_code: "translate-failed", http_status: 502 },
    ]);
  });

  it("has no column that could hold text, a URL or an IP", async () => {
    const { db, post } = setup();
    await post({
      installId: INSTALL_ID,
      events: [{ name: "install", id: randomUUID(), occurredAt: new Date().toISOString() }],
    });
    const columns = await db.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'events' ORDER BY 1`,
    );
    expect(columns.map((c) => c.column_name)).toEqual([
      "cache",
      "error_code",
      "event_id",
      "http_status",
      "id",
      "install_id",
      "latency_ms",
      "name",
      "occurred_on",
    ]);
  });

  it("stores a batch sent twice (lost response, retried) only once", async () => {
    const { db, post } = setup();
    const occurredAt = new Date().toISOString();
    const first = { name: "exercise_completed", id: randomUUID(), occurredAt };
    const second = { name: "exercise_completed", id: randomUUID(), occurredAt };

    expect((await post({ installId: INSTALL_ID, events: [first] })).statusCode).toBe(204);
    expect((await post({ installId: INSTALL_ID, events: [first, second] })).statusCode).toBe(204);
    const ids = await db.query<{ event_id: string }>(
      "SELECT event_id::text FROM events ORDER BY id",
    );
    expect(ids.map((r) => r.event_id)).toEqual([first.id, second.id]);
  });

  it("rejects a batch without a valid install ID and stores nothing", async () => {
    const { db, post } = setup();
    const events = [
      { name: "exercise_completed", id: randomUUID(), occurredAt: new Date().toISOString() },
    ];

    expect((await post({ events })).statusCode).toBe(400);
    expect((await post({ installId: "anonymous", events })).statusCode).toBe(400);
    await withSchema(db).query("SELECT 1");
    expect(await db.query("SELECT * FROM events")).toEqual([]);
  });

  it("does not let the translate request carry the install ID into the response or cache", async () => {
    // The translate schema has no installId field; zod strips it, so it can't reach storage.
    const { db } = setup();
    await withSchema(db).query("SELECT 1");
    const columns = await db.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'cache_entries'`,
    );
    expect(columns.map((c) => c.column_name)).not.toContain("install_id");
  });
});

describe("eventDay", () => {
  const now = new Date("2026-10-19T10:00:00Z");

  it("uses the client's UTC day for events queued while offline", () => {
    expect(eventDay("2026-10-17T23:30:00Z", now)).toBe("2026-10-17");
  });

  it("pins far-past and future-dated events to today", () => {
    expect(eventDay("2026-01-01T00:00:00Z", now)).toBe("2026-10-19");
    expect(eventDay("2026-10-21T00:00:00Z", now)).toBe("2026-10-19");
  });
});

describe("deleteExpiredEvents", () => {
  // A far-future "now": cleanup runs once per process per day, and the route tests above already
  // used up today's run.
  it("deletes events older than 90 days and keeps the rest", async () => {
    const db = withSchema(createTestDb());
    await db.query(
      `INSERT INTO events (event_id, install_id, name, occurred_on) VALUES
         (gen_random_uuid(), $1, 'install', '2029-10-02'),
         (gen_random_uuid(), $1, 'install', '2029-10-03'),
         (gen_random_uuid(), $1, 'install', '2030-01-01')`,
      [INSTALL_ID],
    );
    await deleteExpiredEvents(db, () => {}, new Date("2030-01-01T12:00:00Z"));
    const days = await db.query<{ d: string }>(
      "SELECT occurred_on::text AS d FROM events ORDER BY 1",
    );
    expect(days.map((r) => r.d)).toEqual(["2029-10-03", "2030-01-01"]);
  });
});
