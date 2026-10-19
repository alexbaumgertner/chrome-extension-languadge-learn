import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp } from "../helpers/test-app";
import { createMockProviders, type MockProvidersController } from "./mock-providers";

describe("POST /api/translate — User Story 4 (resilience)", () => {
  let providers: MockProvidersController;

  beforeEach(() => {
    providers = createMockProviders();
    providers.install();
  });

  afterEach(() => {
    providers.restore();
  });

  it("Scenario 1: an already-cached combination still succeeds once providers become unreachable", async () => {
    const app = buildTestApp();
    const payload = { text: "Gecachter Satz.", level: "A1-A2", topic: "cache" };

    const primed = await app.inject({ method: "POST", url: "/api/translate", payload });
    expect(primed.statusCode).toBe(200);

    providers.setMode("fail");
    const cached = await app.inject({ method: "POST", url: "/api/translate", payload });
    expect(cached.statusCode).toBe(200);
    expect(cached.json()).toEqual(primed.json());
  });

  it("Scenario 2: a new combination returns a clear 502 upstream-failure, not a hang or partial body", async () => {
    providers.setMode("fail");
    const app = buildTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/translate",
      payload: { text: "Nie zuvor gesehen.", level: "B1-B2", topic: "new" },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({ error: "upstream-failure" });
  });

  it("retries a transient failure once and still succeeds", async () => {
    const app = buildTestApp();
    providers.failNext("gemini", 1);

    const response = await app.inject({
      method: "POST",
      url: "/api/translate",
      payload: { text: "Ein Wiederholungsversuch.", level: "B1-B2", topic: "retry" },
    });

    expect(response.statusCode).toBe(200);
    expect(providers.callCounts.gemini).toBe(2);
  });

  it("Scenario 3: a malformed/unsafe provider response is discarded, returns 502, and caches nothing", async () => {
    providers.setMode("malformed");
    const app = buildTestApp();
    const payload = { text: "Fehlerhafte Antwort.", level: "A1-A2", topic: "broken" };

    const response = await app.inject({ method: "POST", url: "/api/translate", payload });
    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({ error: "upstream-failure" });

    // The malformed attempt and its one retry.
    expect(providers.callCounts.gemini).toBe(2);

    providers.setMode("ok");
    const retried = await app.inject({ method: "POST", url: "/api/translate", payload });
    expect(retried.statusCode).toBe(200);
    // Nothing was cached from the malformed attempt, so this needed a fresh Gemini call.
    expect(providers.callCounts.gemini).toBe(3);
  });

  it("a provider response with unsafe HTML is discarded with 502", async () => {
    providers.restore();
    providers = createMockProviders({
      translate: () => ({ text: '<a href="x">Hallo</a>', vocab: [] }),
    });
    providers.install();
    const app = buildTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/translate",
      payload: { text: "Ссылка", level: "A1-A2", topic: "general" },
    });
    expect(response.statusCode).toBe(502);
  });
});
