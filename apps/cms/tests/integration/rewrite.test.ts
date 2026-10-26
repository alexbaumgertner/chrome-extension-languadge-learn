import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, createTestDb } from "../helpers/test-app";
import { loadConfig } from "../../src/config";
import { createMockProviders, type MockProvidersController } from "./mock-providers";

const post = (app: FastifyInstance, payload: Record<string, unknown>) =>
  app.inject({ method: "POST", url: "/api/rewrite", payload });

describe("POST /api/rewrite", () => {
  let providers: MockProvidersController;

  beforeEach(() => {
    providers = createMockProviders({
      rewrite: (source, _level, mode) => ({
        text: `Das ist <strong>einfach</strong> (${mode}): ${source}`,
        vocab: [{ german: "einfach", russian: "просто" }],
      }),
    });
    providers.install();
  });

  afterEach(() => {
    providers.restore();
  });

  it("returns the translate response shape with validated spans and the producing version", async () => {
    const app = buildTestApp();
    const res = await post(app, { text: "Das ist kompliziert.", level: "A1-A2", mode: "simpler" });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.text).toBe("Das ist <strong>einfach</strong> (simpler): Das ist kompliziert.");
    expect(body.markedVocab).toEqual([
      { start: 16, end: 23, german: "einfach", russian: "просто" },
    ]);
    expect(body.cache).toBe("miss");
    expect(body.promptVersion).toBe("1");
  });

  it("sends the mode and level to the model in a prompt for German source text", async () => {
    const app = buildTestApp();
    await post(app, { text: "Hallo", level: "B1-B2", mode: "richer" });
    expect(providers.prompts[0]).toMatch(/\nMode: richer\nLevel: B1-B2\nSource paragraph:\nHallo$/);
    expect(providers.prompts[0]).toContain("CEFR C1+");
    expect(providers.prompts[0]).toContain("Russian or English");
  });

  it("caches per mode and level, and a repeat is served without a provider call", async () => {
    const app = buildTestApp();
    const base = { text: "Der Zug faehrt ab.", level: "A1-A2" };

    const first = await post(app, { ...base, mode: "formal" });
    const again = await post(app, { ...base, mode: "formal" });
    const other = await post(app, { ...base, mode: "casual" });

    expect([first.json().cache, again.json().cache, other.json().cache]).toEqual([
      "miss",
      "hit",
      "miss",
    ]);
    expect(again.json().text).toBe(first.json().text);
    expect(providers.callCounts.gemini).toBe(2);
  });

  it("does not share cache entries with /api/translate for the same text", async () => {
    const app = buildTestApp();
    const text = "Ich lerne Deutsch.";
    await app.inject({
      method: "POST",
      url: "/api/translate",
      payload: { text, level: "A1-A2", topic: "x" },
    });
    const res = await post(app, { text, level: "A1-A2", mode: "simpler" });
    expect(res.json().cache).toBe("miss");
    expect(res.json().text).toContain("(simpler)");
  });

  it("rejects an unknown mode, a missing field and an over-long text", async () => {
    const app = buildTestApp();
    expect((await post(app, { text: "x", level: "A1-A2", mode: "shorter" })).statusCode).toBe(400);
    expect((await post(app, { text: "x", level: "A1-A2" })).statusCode).toBe(400);
    const long = await post(app, { text: "a".repeat(601), level: "A1-A2", mode: "simpler" });
    expect(long.statusCode).toBe(413);
    expect(providers.callCounts.gemini).toBe(0);
  });

  it("answers 502 and caches nothing when the model's answer fails validation", async () => {
    providers.restore();
    providers = createMockProviders({
      rewrite: () => ({ text: "Ein <script>x</script> Text", vocab: [] }),
    });
    providers.install();
    const app = buildTestApp();

    expect((await post(app, { text: "Hallo", level: "A1-A2", mode: "simpler" })).statusCode).toBe(
      502,
    );
    expect((await post(app, { text: "Hallo", level: "A1-A2", mode: "simpler" })).statusCode).toBe(
      502,
    );
    expect(providers.callCounts.gemini).toBe(2);
  });

  it("answers 502 when the provider fails", async () => {
    providers.setMode("fail");
    const app = buildTestApp();
    const res = await post(app, { text: "Hallo", level: "A1-A2", mode: "simpler" });
    expect(res.statusCode).toBe(502);
    expect(res.json()).toEqual({ error: "upstream-failure" });
  });

  it("has its own daily allowance and a refusal leaves the global counter untouched", async () => {
    const cfg = loadConfig({ ...process.env, REWRITE_DAILY_REQUEST_ALLOWANCE: "1" });
    const db = createTestDb();
    const app = buildTestApp(cfg, db);

    expect((await post(app, { text: "Eins", level: "A1-A2", mode: "simpler" })).statusCode).toBe(
      200,
    );
    const refused = await post(app, { text: "Zwei", level: "A1-A2", mode: "simpler" });
    expect(refused.statusCode).toBe(429);
    expect(refused.json()).toEqual({ error: "allowance-exhausted" });
    expect(providers.callCounts.gemini).toBe(1);

    // Translation is not limited by the rewrite allowance, and the global counter only counts calls.
    const translated = await app.inject({
      method: "POST",
      url: "/api/translate",
      payload: { text: "Drei", level: "A1-A2", topic: "x" },
    });
    expect(translated.statusCode).toBe(200);
    const rows = await db.query<{ counter: string; usage: number }>(
      "SELECT counter, usage FROM usage_counters ORDER BY counter",
    );
    expect(rows).toEqual([
      { counter: "gemini", usage: 2 },
      { counter: "rewrite", usage: 1 },
    ]);
  });

  it("is refused once the global allowance is used up, without counting a rewrite", async () => {
    const cfg = loadConfig({ ...process.env, GEMINI_DAILY_REQUEST_ALLOWANCE: "1" });
    const db = createTestDb();
    const app = buildTestApp(cfg, db);
    await app.inject({
      method: "POST",
      url: "/api/translate",
      payload: { text: "Eins", level: "A1-A2", topic: "x" },
    });
    const res = await post(app, { text: "Zwei", level: "A1-A2", mode: "simpler" });
    expect(res.statusCode).toBe(429);
    const rows = await db.query<{ counter: string }>(
      "SELECT counter FROM usage_counters WHERE counter = 'rewrite'",
    );
    expect(rows).toEqual([]);
  });
});
