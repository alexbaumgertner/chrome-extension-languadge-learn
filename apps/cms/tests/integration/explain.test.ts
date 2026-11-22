import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EXPLAIN_MAX_CHARS } from "@sprachweise/shared";
import { buildTestApp, createTestDb } from "../helpers/test-app";
import { loadConfig } from "../../src/config";
import { resetGeminiCallConfigFailures } from "../../src/pipeline/gemini-call";
import { createMockProviders, type MockProvidersController } from "./mock-providers";

const TEXT = "Ich habe einen Hund.";

/** A correct model answer for TEXT. */
function answer() {
  return {
    germanText: TEXT,
    translationRu: "У меня есть собака.",
    tokens: [
      { surface: "Ich", lemma: "ich", pos: "pronoun", glossRu: "я" },
      { surface: "habe", lemma: "haben", pos: "verb", glossRu: "иметь" },
      { surface: "einen", lemma: "ein", pos: "article", glossRu: "один" },
      { surface: "Hund", lemma: "der Hund", pos: "noun", glossRu: "собака" },
    ],
    grammar: [
      { id: "accusative-case", explanationRu: "Прямое дополнение.", surfaces: ["einen Hund"] },
    ],
  };
}

describe("POST /api/explain", () => {
  let providers: MockProvidersController;
  let model: () => Record<string, unknown>;

  beforeEach(() => {
    model = answer;
    providers = createMockProviders({ translate: () => model() });
    providers.install();
  });
  afterEach(() => {
    providers.restore();
    resetGeminiCallConfigFailures();
  });

  const post = (app: ReturnType<typeof buildTestApp>, text = TEXT, level = "A1-A2") =>
    app.inject({ method: "POST", url: "/api/explain", payload: { text, level } });

  it("explains a fragment: translation, located tokens, grammar with the catalog title", async () => {
    const response = await post(buildTestApp());
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toMatchObject({
      germanText: TEXT,
      translationRu: "У меня есть собака.",
      cache: "miss",
      promptVersion: "1",
    });
    expect(body.tokens[3]).toMatchObject({ surface: "Hund", start: 15, end: 19 });
    expect(body.grammar[0]).toMatchObject({
      id: "accusative-case",
      titleRu: "Аккузатив (прямое дополнение)",
      surfaceSpans: [{ start: 9, end: 19 }],
    });
  });

  it("serves a repeat from the cache without a second provider call", async () => {
    const app = buildTestApp();
    await post(app);
    const second = await post(app, `  ${TEXT} `);
    expect(second.json().cache).toBe("hit");
    expect(providers.callCounts.gemini).toBe(1);
  });

  it("rejects bad requests and too-long text without calling the provider", async () => {
    const app = buildTestApp();
    expect((await post(app, "")).statusCode).toBe(400);
    expect((await post(app, TEXT, "Z9")).statusCode).toBe(400);
    const long = await post(app, "a".repeat(EXPLAIN_MAX_CHARS + 1));
    expect(long.statusCode).toBe(413);
    expect(long.json()).toEqual({ error: "text-too-long", maxChars: EXPLAIN_MAX_CHARS });
    expect(providers.callCounts.gemini).toBe(0);
  });

  it("answers 502 and caches nothing when the answer does not fit the text", async () => {
    model = () => ({
      ...answer(),
      tokens: [{ surface: "Katze", lemma: "die Katze", pos: "noun", glossRu: "кошка" }],
    });
    const app = buildTestApp();
    expect((await post(app)).statusCode).toBe(502);
    model = answer;
    const retry = await post(app);
    expect(retry.statusCode).toBe(200);
    expect(retry.json().cache).toBe("miss");
  });

  it("answers 502 for an unknown grammar id or part of speech", async () => {
    model = () => ({
      ...answer(),
      grammar: [{ id: "made-up", explanationRu: "x", surfaces: ["Hund"] }],
    });
    expect((await post(buildTestApp())).statusCode).toBe(502);
  });

  it("answers 502 when the provider fails", async () => {
    providers.setMode("fail");
    expect((await post(buildTestApp())).statusCode).toBe(502);
  });

  it("has its own daily allowance: exhausting it never touches translation", async () => {
    const cfg = loadConfig({
      ...process.env,
      EXPLAIN_DAILY_REQUEST_ALLOWANCE: "1",
      GEMINI_DAILY_REQUEST_ALLOWANCE: "5",
    });
    const app = buildTestApp(cfg, createTestDb());
    expect((await post(app)).statusCode).toBe(200);
    const refused = await post(app, "Das ist ein Haus.");
    expect(refused.statusCode).toBe(429);
    expect(refused.json()).toEqual({ error: "allowance-exhausted" });
    expect(providers.callCounts.gemini).toBe(1);

    model = () => ({ text: "Hallo.", vocab: [] });
    const translated = await app.inject({
      method: "POST",
      url: "/api/translate",
      payload: { text: "Hello.", level: "A1-A2", topic: "x" },
    });
    expect(translated.statusCode).toBe(200);
  });

  it("a cached explanation is still served once the allowance is used up", async () => {
    const cfg = loadConfig({ ...process.env, EXPLAIN_DAILY_REQUEST_ALLOWANCE: "1" });
    const app = buildTestApp(cfg);
    await post(app);
    expect((await post(app)).json().cache).toBe("hit");
  });

  it("answers 503 misconfigured for a rejected Gemini configuration", async () => {
    providers.setMode("config-error");
    const response = await post(buildTestApp());
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: "misconfigured" });
  });
});
