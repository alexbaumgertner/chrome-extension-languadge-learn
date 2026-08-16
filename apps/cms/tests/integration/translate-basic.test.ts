import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/server";
import { createMockProviders, type MockProvidersController } from "./mock-providers";

describe("POST /api/translate — User Story 1 (leveled, glossed translation)", () => {
  let providers: MockProvidersController;

  beforeEach(() => {
    providers = createMockProviders({
      adapted: (raw, level, topic) => ({
        text: `[${level}/${topic}] ${raw}`,
        vocabTerms: raw.includes("Kaffee") ? ["Kaffee"] : [],
      }),
    });
    providers.install();
  });

  afterEach(() => {
    providers.restore();
  });

  it("Scenario 1: returns a German rewrite plus marked vocabulary spans with Russian meanings", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/translate",
      payload: { text: "Ich haette gern einen Kaffee.", level: "B1-B2", topic: "food" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { text: string; markedVocab: unknown[] };
    expect(typeof body.text).toBe("string");
    expect(body.text.length).toBeGreaterThan(0);
    expect(Array.isArray(body.markedVocab)).toBe(true);
    for (const span of body.markedVocab as Array<{ russian: string }>) {
      expect(typeof span.russian).toBe("string");
      expect(span.russian.length).toBeGreaterThan(0);
    }
  });

  it("Scenario 2: rejects a request with missing/empty text, level, or topic without calling any provider", async () => {
    const app = buildApp();
    const cases = [
      { text: "", level: "B1-B2", topic: "food" },
      { level: "B1-B2", topic: "food" },
      { text: "Hallo Welt.", level: "", topic: "food" },
      { text: "Hallo Welt.", topic: "food" },
      { text: "Hallo Welt.", level: "B1-B2", topic: "" },
      { text: "Hallo Welt.", level: "B1-B2" },
    ];

    for (const payload of cases) {
      const response = await app.inject({ method: "POST", url: "/api/translate", payload });
      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ error: "invalid-request" });
    }

    expect(providers.callCounts.translateRaw).toBe(0);
    expect(providers.callCounts.gemini).toBe(0);
  });

  it("Scenario 3: the same text at two different levels produces different rewrites", async () => {
    const app = buildApp();
    const text = "Der Bundestag hat heute ein neues Gesetz beschlossen.";

    const a1 = await app.inject({
      method: "POST",
      url: "/api/translate",
      payload: { text, level: "A1-A2", topic: "politics" },
    });
    const c1 = await app.inject({
      method: "POST",
      url: "/api/translate",
      payload: { text, level: "C1+", topic: "politics" },
    });

    expect(a1.statusCode).toBe(200);
    expect(c1.statusCode).toBe(200);
    expect(a1.json<{ text: string }>().text).not.toBe(c1.json<{ text: string }>().text);
  });

  it("Scenario 4: a short/generic paragraph still returns a valid rewrite with an empty vocab list, never an error", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/translate",
      payload: { text: "Kurzer Satz.", level: "A1-A2", topic: "greetings" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { text: string; markedVocab: unknown[] };
    expect(body.text.length).toBeGreaterThan(0);
    expect(body.markedVocab).toEqual([]);
  });
});
