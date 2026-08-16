import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/server";
import { createMockProviders, type MockProvidersController } from "./mock-providers";

describe("POST /api/translate — User Story 2 (cache reuse)", () => {
  let providers: MockProvidersController;

  beforeEach(() => {
    providers = createMockProviders();
    providers.install();
  });

  afterEach(() => {
    providers.restore();
  });

  it("Scenario 1: a repeat request is served from cache with no new provider call and an identical body", async () => {
    const app = buildApp();
    const payload = { text: "Der Zug faehrt um acht Uhr ab.", level: "B1-B2", topic: "travel" };

    const first = await app.inject({ method: "POST", url: "/api/translate", payload });
    const second = await app.inject({ method: "POST", url: "/api/translate", payload });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual(first.json());
    expect(providers.callCounts.gemini).toBe(1);
    expect(providers.callCounts.translateRaw).toBe(1);
  });

  it("Scenario 2: a second simulated learner's matching request also hits the cache", async () => {
    const app = buildApp();
    const payload = { text: "Die Sonne scheint heute.", level: "A1-A2", topic: "weather" };

    // No learner identity exists in the request shape (FR-007) — a "different learner" is
    // indistinguishable from any other caller sending the same text/level/topic.
    await app.inject({ method: "POST", url: "/api/translate", payload });
    const secondLearner = await app.inject({ method: "POST", url: "/api/translate", payload });

    expect(secondLearner.statusCode).toBe(200);
    expect(providers.callCounts.gemini).toBe(1);
  });

  it("Scenario 3: a different level or topic is translated as a separate entry", async () => {
    const app = buildApp();
    const text = "Ich lerne Deutsch.";

    await app.inject({
      method: "POST",
      url: "/api/translate",
      payload: { text, level: "A1-A2", topic: "learning" },
    });
    await app.inject({
      method: "POST",
      url: "/api/translate",
      payload: { text, level: "C1+", topic: "learning" },
    });
    await app.inject({
      method: "POST",
      url: "/api/translate",
      payload: { text, level: "A1-A2", topic: "grammar" },
    });

    expect(providers.callCounts.gemini).toBe(3);
  });

  it("Scenario 4: two concurrent never-before-seen identical requests result in at most one provider call", async () => {
    const app = buildApp();
    const payload = { text: "Berlin ist die Hauptstadt.", level: "B1-B2", topic: "geography" };

    const [a, b] = await Promise.all([
      app.inject({ method: "POST", url: "/api/translate", payload }),
      app.inject({ method: "POST", url: "/api/translate", payload }),
    ]);

    expect(a.statusCode).toBe(200);
    expect(b.statusCode).toBe(200);
    expect(a.json()).toEqual(b.json());
    expect(providers.callCounts.gemini).toBe(1);
    expect(providers.callCounts.translateRaw).toBe(1);
  });
});
