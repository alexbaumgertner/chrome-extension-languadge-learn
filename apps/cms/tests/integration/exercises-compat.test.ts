import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ExerciseKindSchema, ExercisesResponseSchema } from "@sprachweise/shared";
import { buildTestApp } from "../helpers/test-app";
import { ExercisesResponseSchema as V1ExercisesResponseSchema } from "../fixtures/v1.0.0-exercises-schema";

/**
 * The CMS deploys on merge; installed extensions update only after store review. Extension v1.0.0
 * rejects the whole /api/exercises response on an unknown kind or a fifth entry, so a client that
 * does not declare `supportedKinds` must keep getting exactly that format.
 */

// Every sentence anchors a different word and three nouns carry an article: enough candidates
// for all five kinds, so an ungated response would include article-choice.
const variantText =
  "Ich möchte einen Kaffee bestellen. Danach lese ich die Zeitung. Wir fahren mit dem Riesenrad.";
const span = (german: string, lemma: string, russian: string) => {
  const start = variantText.indexOf(german);
  return { start, end: start + german.length, german, lemma, russian };
};
const markedVocab = [
  span("möchte", "mögen", "хотел бы"),
  span("Kaffee", "der Kaffee", "кофе"),
  span("Zeitung", "die Zeitung", "газета"),
  span("Riesenrad", "das Riesenrad", "колесо обозрения"),
];
const base = { variantText, markedVocab, level: "A1-A2", topic: "general" };

describe("POST /api/exercises across client versions", () => {
  const app = buildTestApp();
  const post = (payload: Record<string, unknown>) =>
    app.inject({ method: "POST", url: "/api/exercises", payload });

  it("answers a client without supportedKinds in a format the v1.0.0 schema parses", async () => {
    const response = await post(base);
    expect(response.statusCode).toBe(200);
    const parsed = V1ExercisesResponseSchema.safeParse(response.json());
    expect(parsed.success).toBe(true);
    expect(parsed.data?.exercises.map((e) => e.kind).sort()).toEqual([
      "audio-dictation",
      "fill-blank",
      "multiple-choice",
      "word-pairing",
    ]);
  });

  it("gives article-choice to a client that declares it", async () => {
    const response = await post({ ...base, supportedKinds: ExerciseKindSchema.options });
    expect(response.statusCode).toBe(200);
    const body = ExercisesResponseSchema.parse(response.json());
    expect(body.exercises.map((e) => e.kind)).toContain("article-choice");
    expect(body.exercises.length).toBeGreaterThan(4);
    // The same paragraph is exactly what breaks v1.0.0 when the kinds are not gated.
    expect(V1ExercisesResponseSchema.safeParse(response.json()).success).toBe(false);
  });

  it("does not let one client's answer leak into another's for the same paragraph", async () => {
    const legacy = (await post(base)).json();
    await post({ ...base, supportedKinds: ExerciseKindSchema.options });
    expect((await post(base)).json()).toEqual(legacy);
  });

  it("returns only declared kinds and ignores kinds the server does not know", async () => {
    const response = await post({
      ...base,
      supportedKinds: ["article-choice", "word-order-from-the-future"],
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().exercises.map((e: { kind: string }) => e.kind)).toEqual([
      "article-choice",
    ]);
  });

  it("rejects a malformed supportedKinds with 400", async () => {
    expect((await post({ ...base, supportedKinds: "article-choice" })).statusCode).toBe(400);
    expect((await post({ ...base, supportedKinds: [""] })).statusCode).toBe(400);
  });
});

describe("v1.0.0 schema fixture", () => {
  const repoRoot = path.resolve(__dirname, "../../../..");
  const tagged = (() => {
    try {
      return execFileSync("git", ["show", "v1.0.0:packages/shared/src/schemas/cms.ts"], {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch {
      return null; // shallow CI checkout without tags
    }
  })();

  it.skipIf(tagged === null)("is a verbatim copy of the schema at tag v1.0.0", () => {
    const fixture = readFileSync(
      path.join(__dirname, "../fixtures/v1.0.0-exercises-schema.ts"),
      "utf8",
    );
    const copied = fixture.split("// --- verbatim from v1.0.0 ---\n")[1];
    expect(copied?.trim()).toBeTruthy();
    expect(tagged).toContain(copied!.trim());
  });
});
