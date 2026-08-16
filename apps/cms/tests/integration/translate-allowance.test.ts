import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/server";
import { loadConfig } from "../../src/config";
import { createMockProviders, type MockProvidersController } from "./mock-providers";

describe("POST /api/translate — User Story 3 (allowance enforcement)", () => {
  let providers: MockProvidersController;

  beforeEach(() => {
    providers = createMockProviders();
    providers.install();
  });

  afterEach(() => {
    providers.restore();
  });

  it("Scenario 1 & 2: usage increases per distinct request, then a request past the cap is refused with no provider call", async () => {
    const cfg = loadConfig({ ...process.env, GEMINI_DAILY_REQUEST_ALLOWANCE: "2" });
    const app = buildApp(cfg);

    const first = await app.inject({
      method: "POST",
      url: "/api/translate",
      payload: { text: "Erster Satz.", level: "A1-A2", topic: "a" },
    });
    const second = await app.inject({
      method: "POST",
      url: "/api/translate",
      payload: { text: "Zweiter Satz.", level: "A1-A2", topic: "b" },
    });
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(providers.callCounts.gemini).toBe(2);

    const third = await app.inject({
      method: "POST",
      url: "/api/translate",
      payload: { text: "Dritter Satz.", level: "A1-A2", topic: "c" },
    });
    expect(third.statusCode).toBe(429);
    expect(third.json()).toEqual({ error: "allowance-exhausted" });
    expect(providers.callCounts.gemini).toBe(2);
  });

  it("Scenario 3: a request for an already-cached combination still succeeds once the allowance is exhausted", async () => {
    const cfg = loadConfig({ ...process.env, GEMINI_DAILY_REQUEST_ALLOWANCE: "1" });
    const app = buildApp(cfg);
    const cachedPayload = { text: "Bereits uebersetzt.", level: "B1-B2", topic: "x" };

    const primed = await app.inject({
      method: "POST",
      url: "/api/translate",
      payload: cachedPayload,
    });
    expect(primed.statusCode).toBe(200);

    const refused = await app.inject({
      method: "POST",
      url: "/api/translate",
      payload: { text: "Neuer Satz.", level: "B1-B2", topic: "y" },
    });
    expect(refused.statusCode).toBe(429);

    const cachedAgain = await app.inject({
      method: "POST",
      url: "/api/translate",
      payload: cachedPayload,
    });
    expect(cachedAgain.statusCode).toBe(200);
    expect(cachedAgain.json()).toEqual(primed.json());
  });
});
