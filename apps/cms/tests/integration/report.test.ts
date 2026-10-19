import { describe, expect, it } from "vitest";
import { cacheKey } from "../../src/cache/key";
import { config } from "../../src/config";
import { withSchema } from "../../src/db";
import { PROMPT_VERSION } from "../../src/pipeline/translate";
import { buildTestApp, createTestDb } from "../helpers/test-app";

const REPORT = {
  source: "Колесо обозрения закрыли на ремонт.",
  output: "Das Riesenrad ist wegen <strong>Reparatur</strong> geschlossen.",
  level: "A1-A2",
  density: "medium",
  model: "gemini-3.8-flash",
  promptVersion: "2",
};

function setup() {
  const db = createTestDb();
  const app = buildTestApp(config, db);
  const post = (payload: object) => app.inject({ method: "POST", url: "/api/report", payload });
  return { db, post };
}

describe("POST /api/report", () => {
  it("stores the fragment, its output, level, density, model and prompt version", async () => {
    const { db, post } = setup();
    expect((await post(REPORT)).statusCode).toBe(204);
    const rows = await db.query(
      "SELECT source, output, level, density, model, prompt_version FROM translation_reports",
    );
    expect(rows).toEqual([
      {
        source: REPORT.source,
        output: REPORT.output,
        level: "A1-A2",
        density: "medium",
        model: "gemini-3.8-flash",
        prompt_version: "2",
      },
    ]);
  });

  it("accepts an unknown model for variants cached before it was recorded", async () => {
    const { post } = setup();
    expect((await post({ ...REPORT, model: null, promptVersion: null })).statusCode).toBe(204);
  });

  it("never stores an install ID, even if one is sent", async () => {
    const { db, post } = setup();
    await post({ ...REPORT, installId: "0b6c3a62-5d2e-4f0a-9c1b-2e8f7d6a5b4c" });
    const columns = await db.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'translation_reports'`,
    );
    expect(columns.map((c) => c.column_name).sort()).toEqual([
      "created_at",
      "density",
      "id",
      "level",
      "model",
      "output",
      "prompt_version",
      "source",
    ]);
  });

  it("rejects an incomplete or oversized report", async () => {
    const { post } = setup();
    expect((await post({ ...REPORT, output: "" })).statusCode).toBe(400);
    expect((await post({ ...REPORT, level: "C9" })).statusCode).toBe(400);
    expect((await post({ ...REPORT, source: "x".repeat(10_001) })).statusCode).toBe(400);
  });
});

describe("POST /api/translate", () => {
  it("names the model and prompt version that produced the text, so reports can carry them", async () => {
    // A primed cache entry stands in for a Gemini call.
    const db = withSchema(createTestDb());
    const app = buildTestApp(config, db);
    const key = cacheKey(
      "Hallo.",
      "A1-A2",
      config.GEMINI_MODEL,
      config.GEMINI_THINKING_LEVEL,
      PROMPT_VERSION,
    );
    await db.query(
      "INSERT INTO cache_entries (cache_key, result_text, marked_vocab) VALUES ($1, 'Hallo.', '[]')",
      [key],
    );
    const res = await app.inject({
      method: "POST",
      url: "/api/translate",
      payload: { text: "Hallo.", level: "A1-A2", topic: "general" },
    });
    expect(res.json()).toMatchObject({
      cache: "hit",
      model: config.GEMINI_MODEL,
      promptVersion: PROMPT_VERSION,
    });
  });
});
