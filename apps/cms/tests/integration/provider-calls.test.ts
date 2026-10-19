import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, createTestDb } from "../helpers/test-app";
import { createMockProviders, type MockProvidersController } from "./mock-providers";

describe("provider call recording", () => {
  let providers: MockProvidersController;

  beforeEach(() => {
    providers = createMockProviders();
    providers.install();
  });

  afterEach(() => {
    providers.restore();
  });

  it("records model, tokens and cost for a paid call, and nothing for a cache hit", async () => {
    const db = createTestDb();
    const app = buildTestApp(undefined, db);
    const payload = { text: "Привет, мир.", level: "A1-A2", topic: "general" };

    await app.inject({ method: "POST", url: "/api/translate", payload });
    await app.inject({ method: "POST", url: "/api/translate", payload });

    const rows = await db.query<Record<string, unknown>>(
      "SELECT model, thinking_level, status, prompt_tokens, output_tokens, cost_usd FROM provider_calls",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      model: "gemini-3.5-flash-lite",
      thinking_level: "minimal",
      status: "ok",
      prompt_tokens: 10,
      output_tokens: 20,
    });
    // (10 × $0.30 + 20 × $2.50) / 1M
    expect(Number(rows[0]!.cost_usd)).toBeCloseTo(0.000053, 9);
  });

  it("records a failed call with status error", async () => {
    providers.setMode("fail");
    const db = createTestDb();
    const app = buildTestApp(undefined, db);

    await app.inject({
      method: "POST",
      url: "/api/translate",
      payload: { text: "Сбой.", level: "A1-A2", topic: "general" },
    });

    const rows = await db.query<{ status: string }>("SELECT status FROM provider_calls");
    expect(rows).toEqual([{ status: "error" }]);
  });
});
