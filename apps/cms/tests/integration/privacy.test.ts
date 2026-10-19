import { describe, expect, it } from "vitest";
import { buildTestApp } from "../helpers/test-app";

describe("GET /privacy", () => {
  it("serves the RU + EN policy as HTML", async () => {
    const res = await buildTestApp().inject({ method: "GET", url: "/privacy" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("text/html; charset=utf-8");
    const html = res.body;
    expect(html).toContain('<section lang="ru" id="ru">');
    expect(html).toContain('<section lang="en" id="en">');
    // The disclosures the store listing and constitution III rely on.
    for (const phrase of [
      "Google Gemini",
      "https://ai.google.dev/gemini-api/terms",
      "random install ID",
      "90 days",
      "IP address",
      "Limited Use",
      "mailto:alex.baumgertner+sprachweise@gmail.com",
      // Text leaves the device only after the menu choice, capped per selection.
      'only after you\nchoose "Translate to German (Sprachweise)"',
      "1,500 characters",
      "Перевести на немецкий (Sprachweise)",
    ]) {
      expect(html).toContain(phrase);
    }
    // The per-site model is gone.
    expect(html).not.toContain("Enable on this site");
  });
});
