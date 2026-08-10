import { describe, expect, it } from "vitest";
import {
  ExercisesRequestSchema,
  ExercisesResponseSchema,
  ExerciseSchema,
  GermanVariantSchema,
  GetProgressSnapshotResponseSchema,
  GetSiteRulesResponseSchema,
  GetSiteStatusResponseSchema,
  LearnerSettingsSchema,
  PlayTtsRequestSchema,
  ProgressProfileSchema,
  RequestMessageSchema,
  ReviewQueueEntrySchema,
  SetSiteStatusResponseSchema,
  SiteRuleSchema,
  StorageChangedMessageSchema,
  SubmitExerciseAttemptResponseSchema,
  TranslateParagraphResponseSchema,
  TranslateRequestSchema,
  TranslateResponseSchema,
  TtsRequestSchema,
  VocabularyItemSchema,
} from "../src/index";

describe("storage schemas", () => {
  it("LearnerSettings round-trips a valid fixture", () => {
    const fixture = { level: "B1-B2", currentTopic: "dative-case", translationDensity: "medium" };
    expect(LearnerSettingsSchema.parse(fixture)).toEqual(fixture);
  });

  it("LearnerSettings rejects an invalid enum value", () => {
    const result = LearnerSettingsSchema.safeParse({
      level: "Z9",
      currentTopic: "dative-case",
      translationDensity: "medium",
    });
    expect(result.success).toBe(false);
  });

  it("SiteRule round-trips a valid fixture", () => {
    const fixture = {
      hostname: "spiegel.de",
      status: "enabled",
      grantedPermissionOrigin: "https://spiegel.de/*",
    };
    expect(SiteRuleSchema.parse(fixture)).toEqual(fixture);
  });

  it("SiteRule rejects a missing field", () => {
    const result = SiteRuleSchema.safeParse({ hostname: "spiegel.de", status: "enabled" });
    expect(result.success).toBe(false);
  });

  it("VocabularyItem round-trips a valid fixture", () => {
    const fixture = {
      id: "moechten",
      german: "möchten",
      russian: "хотеть бы",
      encounterCount: 3,
      status: "active",
      firstEncounteredAt: 1_700_000_000_000,
    };
    expect(VocabularyItemSchema.parse(fixture)).toEqual(fixture);
  });

  it("VocabularyItem rejects a wrong-type field", () => {
    const result = VocabularyItemSchema.safeParse({
      id: "moechten",
      german: "möchten",
      russian: "хотеть бы",
      encounterCount: "three",
      status: "active",
      firstEncounteredAt: 1_700_000_000_000,
    });
    expect(result.success).toBe(false);
  });

  it("ReviewQueueEntry round-trips a valid fixture", () => {
    const fixture = { vocabId: "moechten", repetitions: 2, intervalDays: 6, dueDate: "2026-08-16" };
    expect(ReviewQueueEntrySchema.parse(fixture)).toEqual(fixture);
  });

  it("ReviewQueueEntry rejects a malformed dueDate", () => {
    const result = ReviewQueueEntrySchema.safeParse({
      vocabId: "moechten",
      repetitions: 2,
      intervalDays: 6,
      dueDate: "16.08.2026",
    });
    expect(result.success).toBe(false);
  });

  it("ProgressProfile round-trips a valid fixture", () => {
    const fixture = {
      currentStreak: 5,
      lastSolvedLocalDate: "2026-08-10",
      activeVocabCount: 42,
      topicAccuracy: { "dative-case": { correct: 8, total: 10 } },
      solvedTodayCount: 1,
    };
    expect(ProgressProfileSchema.parse(fixture)).toEqual(fixture);
  });

  it("ProgressProfile rejects a negative streak", () => {
    const result = ProgressProfileSchema.safeParse({
      currentStreak: -1,
      lastSolvedLocalDate: "2026-08-10",
      activeVocabCount: 42,
      topicAccuracy: {},
      solvedTodayCount: 1,
    });
    expect(result.success).toBe(false);
  });

  it("GermanVariant round-trips a valid fixture", () => {
    const fixture = {
      id: "abc123:B1-B2:dative-case",
      contentHash: "abc123",
      level: "B1-B2",
      topic: "dative-case",
      text: "Ich moechte einen Kaffee.",
      markedVocab: [{ start: 4, end: 12, vocabId: "moechten" }],
      fetchedAt: 1_700_000_000_000,
    };
    expect(GermanVariantSchema.parse(fixture)).toEqual(fixture);
  });

  it("GermanVariant rejects an out-of-bounds markedVocab offset", () => {
    const result = GermanVariantSchema.safeParse({
      id: "abc123:B1-B2:dative-case",
      contentHash: "abc123",
      level: "B1-B2",
      topic: "dative-case",
      text: "Kurz.",
      markedVocab: [{ start: 0, end: 999, vocabId: "moechten" }],
      fetchedAt: 1_700_000_000_000,
    });
    expect(result.success).toBe(false);
  });

  it("GermanVariant rejects overlapping markedVocab spans", () => {
    const result = GermanVariantSchema.safeParse({
      id: "abc123:B1-B2:dative-case",
      contentHash: "abc123",
      level: "B1-B2",
      topic: "dative-case",
      text: "Ich moechte einen Kaffee.",
      markedVocab: [
        { start: 4, end: 12, vocabId: "moechten" },
        { start: 8, end: 18, vocabId: "einen" },
      ],
      fetchedAt: 1_700_000_000_000,
    });
    expect(result.success).toBe(false);
  });

  it("Exercise round-trips each valid kind fixture", () => {
    const fillBlank = {
      id: "ex1",
      kind: "fill-blank",
      sourceParagraphHash: "abc123",
      sourceSentence: "Ich moechte einen Kaffee.",
      prompt: { blankedSentence: "Ich ___ einen Kaffee." },
      correctAnswer: "moechte",
      answered: false,
      lastAttempt: null,
    };
    const multipleChoice = {
      id: "ex2",
      kind: "multiple-choice",
      sourceParagraphHash: "abc123",
      sourceSentence: "Ich moechte einen Kaffee.",
      prompt: { blankedSentence: "Ich ___ einen Kaffee.", options: ["moechte", "moechten"] },
      correctAnswer: 0,
      answered: false,
      lastAttempt: null,
    };
    const wordPairing = {
      id: "ex3",
      kind: "word-pairing",
      sourceParagraphHash: "abc123",
      sourceSentence: "",
      prompt: { pairs: [{ german: "Kaffee", russian: "кофе" }] },
      correctAnswer: { Kaffee: "кофе" },
      answered: false,
      lastAttempt: null,
    };
    const audioDictation = {
      id: "ex4",
      kind: "audio-dictation",
      sourceParagraphHash: "abc123",
      sourceSentence: "Ich moechte einen Kaffee.",
      prompt: { audioSentence: "Ich moechte einen Kaffee." },
      correctAnswer: "Ich moechte einen Kaffee.",
      answered: false,
      lastAttempt: null,
    };
    for (const fixture of [fillBlank, multipleChoice, wordPairing, audioDictation]) {
      expect(ExerciseSchema.parse(fixture)).toEqual(fixture);
    }
  });

  it("Exercise rejects a malformed/empty options list for multiple-choice", () => {
    const result = ExerciseSchema.safeParse({
      id: "ex2",
      kind: "multiple-choice",
      sourceParagraphHash: "abc123",
      sourceSentence: "Ich moechte einen Kaffee.",
      prompt: { blankedSentence: "Ich ___ einen Kaffee.", options: [] },
      correctAnswer: 0,
      answered: false,
      lastAttempt: null,
    });
    expect(result.success).toBe(false);
  });
});

describe("message schemas", () => {
  it("RequestMessage accepts a valid TRANSLATE_PARAGRAPH request", () => {
    const fixture = {
      type: "TRANSLATE_PARAGRAPH",
      contentHash: "abc123",
      paragraphText: "Ich moechte einen Kaffee.",
      level: "B1-B2",
      topic: "dative-case",
    };
    expect(RequestMessageSchema.parse(fixture)).toEqual(fixture);
  });

  it("RequestMessage rejects an unknown message type", () => {
    const result = RequestMessageSchema.safeParse({ type: "NOT_A_MESSAGE" });
    expect(result.success).toBe(false);
  });

  it("TranslateParagraphResponse accepts both ok and error shapes", () => {
    const errorFixture = { ok: false, reason: "offline-no-cache" };
    expect(TranslateParagraphResponseSchema.parse(errorFixture)).toEqual(errorFixture);
  });

  it("TranslateParagraphResponse rejects an invalid reason", () => {
    const result = TranslateParagraphResponseSchema.safeParse({ ok: false, reason: "oops" });
    expect(result.success).toBe(false);
  });

  it("SubmitExerciseAttemptResponse round-trips a valid fixture", () => {
    const fixture = {
      ok: true,
      correct: true,
      updatedProgress: {
        currentStreak: 1,
        lastSolvedLocalDate: "2026-08-10",
        activeVocabCount: 1,
        topicAccuracy: {},
        solvedTodayCount: 1,
      },
    };
    expect(SubmitExerciseAttemptResponseSchema.parse(fixture)).toEqual(fixture);
  });

  it("GetSiteStatusResponse rejects an invalid status", () => {
    const result = GetSiteStatusResponseSchema.safeParse({ status: "maybe" });
    expect(result.success).toBe(false);
  });

  it("SetSiteStatusResponse accepts the permission-denied shape", () => {
    const fixture = { ok: false, reason: "permission-denied" };
    expect(SetSiteStatusResponseSchema.parse(fixture)).toEqual(fixture);
  });

  it("GetProgressSnapshotResponse rejects a missing vocab array", () => {
    const result = GetProgressSnapshotResponseSchema.safeParse({
      profile: {
        currentStreak: 0,
        lastSolvedLocalDate: "2026-08-10",
        activeVocabCount: 0,
        topicAccuracy: {},
        solvedTodayCount: 0,
      },
      reviewQueue: [],
    });
    expect(result.success).toBe(false);
  });

  it("PlayTtsRequest round-trips a valid fixture and rejects a bad rate", () => {
    const fixture = {
      type: "PLAY_TTS",
      sentence: "Guten Tag.",
      rate: "slow",
      contentHash: "abc123",
      level: "B1-B2",
      topic: "dative-case",
    } as const;
    expect(PlayTtsRequestSchema.parse(fixture)).toEqual(fixture);
    expect(PlayTtsRequestSchema.safeParse({ ...fixture, rate: "fast" }).success).toBe(false);
  });

  it("GetSiteRulesResponse round-trips a valid fixture and rejects a malformed entry", () => {
    const fixture = {
      siteRules: {
        "spiegel.de": {
          hostname: "spiegel.de",
          status: "enabled",
          grantedPermissionOrigin: "*://spiegel.de/*",
        },
      },
    };
    expect(GetSiteRulesResponseSchema.parse(fixture)).toEqual(fixture);
    const result = GetSiteRulesResponseSchema.safeParse({
      siteRules: { "spiegel.de": { hostname: "spiegel.de", status: "maybe" } },
    });
    expect(result.success).toBe(false);
  });

  it("StorageChangedMessage round-trips a valid fixture", () => {
    const fixture = { type: "STORAGE_CHANGED", slice: "progress" } as const;
    expect(StorageChangedMessageSchema.parse(fixture)).toEqual(fixture);
  });
});

describe("cms schemas", () => {
  it("TranslateRequest round-trips a valid fixture", () => {
    const fixture = { text: "I would like a coffee.", level: "B1-B2", topic: "dative-case" };
    expect(TranslateRequestSchema.parse(fixture)).toEqual(fixture);
  });

  it("TranslateResponse rejects an out-of-bounds markedVocab span", () => {
    const result = TranslateResponseSchema.safeParse({
      text: "Kurz.",
      markedVocab: [{ start: 0, end: 999, german: "kurz", russian: "коротко" }],
    });
    expect(result.success).toBe(false);
  });

  it("ExercisesRequest round-trips a valid fixture", () => {
    const fixture = {
      variantText: "Ich moechte einen Kaffee.",
      markedVocab: [{ start: 4, end: 12, german: "moechte", russian: "хотел бы" }],
      level: "B1-B2",
      topic: "dative-case",
    };
    expect(ExercisesRequestSchema.parse(fixture)).toEqual(fixture);
  });

  it("ExercisesResponse rejects more than 4 exercises", () => {
    const entry = { kind: "word-pairing", pairs: [{ german: "Kaffee", russian: "кофе" }] };
    const result = ExercisesResponseSchema.safeParse({
      exercises: [entry, entry, entry, entry, entry],
    });
    expect(result.success).toBe(false);
  });

  it("ExercisesResponse accepts zero exercises", () => {
    const fixture = { exercises: [] };
    expect(ExercisesResponseSchema.parse(fixture)).toEqual(fixture);
  });

  it("TtsRequest rejects an invalid rate", () => {
    const result = TtsRequestSchema.safeParse({ sentence: "Guten Tag.", rate: "fast" });
    expect(result.success).toBe(false);
  });
});
