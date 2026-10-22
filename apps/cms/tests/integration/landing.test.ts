import { describe, expect, it } from "vitest";
import { buildTestApp } from "../helpers/test-app";

describe("landing page", () => {
  it.each([
    ["/ru", "ru", "Установить из Chrome Web Store"],
    ["/uk", "uk", "Встановити з Chrome Web Store"],
  ])("serves %s with install button and screenshots", async (url, lang, button) => {
    const res = await buildTestApp().inject({ method: "GET", url });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("text/html; charset=utf-8");
    expect(res.body).toContain(`<html lang="${lang}">`);
    expect(res.body).toContain(button);
    expect(res.body).toContain("chromewebstore.google.com");
    expect(res.body).toContain("/assets/screenshot-1.png");
  });

  it("picks the language from Accept-Language on /", async () => {
    const app = buildTestApp();
    const uk = await app.inject({
      method: "GET",
      url: "/",
      headers: { "accept-language": "uk-UA,uk;q=0.9" },
    });
    expect(uk.body).toContain('<html lang="uk">');
    const other = await app.inject({
      method: "GET",
      url: "/",
      headers: { "accept-language": "de" },
    });
    expect(other.body).toContain('<html lang="ru">');
  });

  it("serves screenshots as PNG and 404s unknown assets", async () => {
    const app = buildTestApp();
    const ok = await app.inject({ method: "GET", url: "/assets/screenshot-2.png" });
    expect(ok.statusCode).toBe(200);
    expect(ok.headers["content-type"]).toBe("image/png");
    expect(ok.rawPayload.subarray(1, 4).toString()).toBe("PNG");
    const missing = await app.inject({ method: "GET", url: "/assets/constructor" });
    expect(missing.statusCode).toBe(404);
  });
});
