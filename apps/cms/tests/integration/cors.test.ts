import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config";
import { buildTestApp } from "../helpers/test-app";

const EXTENSION = "chrome-extension://abcdefghijklmnopabcdefghijklmnop";

function preflight(origin: string) {
  const app = buildTestApp(loadConfig({ ...process.env, CORS_ALLOWED_ORIGINS: EXTENSION }));
  return app.inject({
    method: "OPTIONS",
    url: "/api/translate",
    headers: {
      origin,
      "access-control-request-method": "POST",
      "access-control-request-headers": "content-type",
    },
  });
}

describe("CORS", () => {
  it("grants the configured extension origin", async () => {
    const response = await preflight(EXTENSION);
    expect(response.headers["access-control-allow-origin"]).toBe(EXTENSION);
  });

  it("grants nothing to any other origin", async () => {
    const response = await preflight("https://evil.example");
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
