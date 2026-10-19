import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp } from "../helpers/test-app";
import { createMockProviders, type MockProvidersController } from "./mock-providers";

describe("POST /api/translate — User Story 1 (leveled, glossed translation)", () => {
  let providers: MockProvidersController;

  beforeEach(() => {
    providers = createMockProviders({
      translate: (source, level) => ({
        text: `[${level}] ${source}`,
        vocab: source.includes("Kaffee") ? [{ german: "Kaffee", russian: "кофе" }] : [],
      }),
    });
    providers.install();
  });

  afterEach(() => {
    providers.restore();
  });

  it("Scenario 1: returns a German rewrite plus marked vocabulary spans with Russian meanings", async () => {
    const app = buildTestApp();
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
    expect(body.markedVocab).toEqual([{ start: 30, end: 36, german: "Kaffee", russian: "кофе" }]);
  });

  it("Scenario 2: rejects a request with missing/empty text, level, or topic without calling any provider", async () => {
    const app = buildTestApp();
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

    expect(providers.callCounts.gemini).toBe(0);
  });

  it("Scenario 3: the same text at two different levels produces different rewrites", async () => {
    const app = buildTestApp();
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
    const app = buildTestApp();
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

  it("sends the API key in a header, never in the URL, to the configured model", async () => {
    const app = buildTestApp();
    await app.inject({
      method: "POST",
      url: "/api/translate",
      payload: { text: "Привет", level: "A1-A2", topic: "general" },
    });

    expect(providers.apiKeys).toEqual(["test-gemini-key"]);
    expect(providers.urls[0]).toContain("/models/gemini-3.5-flash-lite:generateContent");
    expect(providers.urls[0]).not.toContain("key=");
  });
});
