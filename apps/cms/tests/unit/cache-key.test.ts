import { describe, expect, it } from "vitest";
import { cacheKey, normalize } from "../../src/cache/key";

describe("cache-key normalization", () => {
  it("collapses whitespace-only differences to the same normalized text", () => {
    expect(normalize("  Ich   moechte  einen Kaffee.  ")).toBe("Ich moechte einen Kaffee.");
    expect(normalize("Ich moechte einen Kaffee.")).toBe("Ich moechte einen Kaffee.");
  });

  it("produces the same cache key for whitespace-only differences", () => {
    const a = cacheKey("  Ich   moechte  einen Kaffee.  ", "B1-B2", "food");
    const b = cacheKey("Ich moechte einen Kaffee.", "B1-B2", "food");
    expect(a).toBe(b);
  });

  it("produces a different cache key for a different level", () => {
    const a = cacheKey("Ich moechte einen Kaffee.", "A1-A2", "food");
    const b = cacheKey("Ich moechte einen Kaffee.", "B1-B2", "food");
    expect(a).not.toBe(b);
  });

  it("produces a different cache key for a different topic", () => {
    const a = cacheKey("Ich moechte einen Kaffee.", "B1-B2", "food");
    const b = cacheKey("Ich moechte einen Kaffee.", "B1-B2", "politics");
    expect(a).not.toBe(b);
  });

  it("does not collide across text/level/topic field boundaries", () => {
    const a = cacheKey("ab", "B1-B2", "cd");
    const b = cacheKey("a", "B1-B2", "bcd");
    expect(a).not.toBe(b);
  });
});
