import { describe, expect, it } from "vitest";
import { ExercisesResponseSchema, TRANSLATE_MAX_CHARS } from "@sprachweise/shared";
import { buildTestApp } from "../helpers/test-app";

describe("POST /api/exercises", () => {
  it("returns schema-valid exercises built from the translated paragraph", async () => {
    const app = buildTestApp();
    const variantText = "Ich trinke gern Kaffee. Die Zeitung liegt auf dem Tisch.";
    const response = await app.inject({
      method: "POST",
      url: "/api/exercises",
      payload: {
        variantText,
        markedVocab: [
          { start: 16, end: 22, german: "Kaffee", russian: "кофе" },
          { start: 28, end: 35, german: "Zeitung", russian: "газета" },
        ],
        level: "A1-A2",
        topic: "general",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = ExercisesResponseSchema.parse(response.json());
    expect(body.exercises.map((e) => e.kind)).toContain("word-pairing");
  });

  it("accepts a German rewrite longer than the translate cap, up to twice it", async () => {
    const app = buildTestApp();
    const send = (variantText: string) =>
      app.inject({
        method: "POST",
        url: "/api/exercises",
        payload: { variantText, markedVocab: [], level: "A1-A2", topic: "general" },
      });
    expect((await send("a".repeat(2 * TRANSLATE_MAX_CHARS))).statusCode).toBe(200);
    expect((await send("a".repeat(2 * TRANSLATE_MAX_CHARS + 1))).statusCode).toBe(400);
  });

  it("rejects an invalid request with 400", async () => {
    const app = buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/exercises",
      payload: { variantText: "", markedVocab: [], level: "A1-A2", topic: "general" },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "invalid-request" });
  });
});
