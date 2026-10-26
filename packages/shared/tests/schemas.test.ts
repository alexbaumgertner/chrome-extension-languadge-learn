import { describe, expect, it } from "vitest";
import {
  EventsRequestSchema,
  ExercisesRequestSchema,
  ExercisesResponseSchema,
  ExerciseSchema,
  ExerciseSetSchema,
  GermanVariantSchema,
  GetProgressSnapshotResponseSchema,
  InstallIdSchema,
  PageActionMessageSchema,
  RecordClientErrorRequestSchema,
  ReportRequestSchema,
  isSafeHtmlSubset,
  LearnerSettingsSchema,
  ProgressProfileSchema,
  RequestMessageSchema,
  ReviewQueueEntrySchema,
  StorageChangedMessageSchema,
  SubmitExerciseAttemptResponseSchema,
  TranslateParagraphResponseSchema,
  TranslateRequestSchema,
  TranslateResponseSchema,
  VocabularyItemSchema,
} from "../src/index";

describe("storage schemas", () => {
  it("InstallId accepts crypto.randomUUID() output and rejects anything else", () => {
    for (let i = 0; i < 20; i++) expect(InstallIdSchema.parse(crypto.randomUUID())).toBeTruthy();
    expect(InstallIdSchema.safeParse("").success).toBe(false);
    expect(InstallIdSchema.safeParse("not-a-uuid").success).toBe(false);
    // UUID v1 (time + MAC based) is not random, and upper case is not what randomUUID emits.
    expect(InstallIdSchema.safeParse("6ba7b810-9dad-11d1-80b4-00c04fd430c8").success).toBe(false);
    expect(InstallIdSchema.safeParse("3F2504E0-4F89-41D3-9A0C-0305E82C3301").success).toBe(false);
  });

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
    const articleChoice = {
      id: "ex5",
      kind: "article-choice",
      sourceParagraphHash: "abc123",
      sourceSentence: "",
      prompt: { noun: "Riesenrad", russian: "колесо обозрения" },
      correctAnswer: "das",
      answered: false,
      lastAttempt: null,
    };
    const wordOrder = {
      id: "ex6",
      kind: "word-order",
      sourceParagraphHash: "abc123",
      sourceSentence: "Ich trinke jeden Morgen Kaffee.",
      prompt: { tokens: ["Kaffee", "ich", "jeden", "trinke", "Morgen"], ending: "." },
      correctAnswer: "Ich trinke jeden Morgen Kaffee",
      answered: false,
      lastAttempt: null,
    };
    for (const fixture of [
      fillBlank,
      multipleChoice,
      wordPairing,
      audioDictation,
      articleChoice,
      wordOrder,
    ]) {
      expect(ExerciseSchema.parse(fixture)).toEqual(fixture);
    }
  });

  it("ExercisesResponse accepts a word-order and rejects one with a single token", () => {
    const ok = {
      kind: "word-order",
      sourceSentence: "Ich trinke jeden Morgen Kaffee.",
      tokens: ["Kaffee", "ich", "jeden", "trinke", "Morgen"],
      ending: ".",
    };
    expect(ExercisesResponseSchema.safeParse({ exercises: [ok] }).success).toBe(true);
    const bad = { ...ok, tokens: ["Kaffee"] };
    expect(ExercisesResponseSchema.safeParse({ exercises: [bad] }).success).toBe(false);
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
    const errorFixture = { ok: false, reason: "offline" };
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

  it("StorageChangedMessage round-trips a valid fixture", () => {
    const fixture = { type: "STORAGE_CHANGED", slice: "progress" } as const;
    expect(StorageChangedMessageSchema.parse(fixture)).toEqual(fixture);
  });

  it("PageActionMessage accepts the three actions and nothing else", () => {
    for (const action of ["status", "translate-selection", "restore"]) {
      expect(PageActionMessageSchema.parse({ type: "PAGE_ACTION", action })).toBeTruthy();
    }
    expect(
      PageActionMessageSchema.safeParse({ type: "PAGE_ACTION", action: "enable" }).success,
    ).toBe(false);
  });

  it("TranslateParagraphResponse distinguishes offline from an unavailable service", () => {
    for (const reason of ["offline", "unavailable", "limit", "too-long", "failed"]) {
      expect(TranslateParagraphResponseSchema.parse({ ok: false, reason })).toEqual({
        ok: false,
        reason,
      });
    }
    expect(
      TranslateParagraphResponseSchema.safeParse({ ok: false, reason: "offline-no-cache" }).success,
    ).toBe(false);
  });

  it("RecordClientError only carries a fixed error code", () => {
    const fixture = { type: "RECORD_CLIENT_ERROR", error: "translate-too-long" } as const;
    expect(RecordClientErrorRequestSchema.parse(fixture)).toEqual(fixture);
    expect(
      RecordClientErrorRequestSchema.safeParse({ type: "RECORD_CLIENT_ERROR", error: "x" }).success,
    ).toBe(false);
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

  it("ExercisesResponse rejects more than 6 exercises", () => {
    const entry = { kind: "word-pairing", pairs: [{ german: "Kaffee", russian: "кофе" }] };
    const result = ExercisesResponseSchema.safeParse({ exercises: Array(7).fill(entry) });
    expect(result.success).toBe(false);
  });

  it("ExercisesResponse accepts an article-choice and rejects an unknown article", () => {
    const ok = { kind: "article-choice", noun: "Riesenrad", article: "das", russian: "колесо" };
    expect(ExercisesResponseSchema.safeParse({ exercises: [ok] }).success).toBe(true);
    const bad = { ...ok, article: "dem" };
    expect(ExercisesResponseSchema.safeParse({ exercises: [bad] }).success).toBe(false);
  });

  it("a set of four exercises persisted under the old max(4) still parses", () => {
    const base = { sourceParagraphHash: "h", answered: false, lastAttempt: null };
    const legacy = [
      {
        ...base,
        id: "a",
        kind: "fill-blank",
        sourceSentence: "Ich moechte.",
        prompt: { blankedSentence: "Ich ___." },
        correctAnswer: "moechte",
      },
      {
        ...base,
        id: "b",
        kind: "multiple-choice",
        sourceSentence: "Ich moechte.",
        prompt: { blankedSentence: "Ich ___.", options: ["moechte", "will"] },
        correctAnswer: 0,
      },
      {
        ...base,
        id: "c",
        kind: "word-pairing",
        sourceSentence: "",
        prompt: { pairs: [{ german: "Kaffee", russian: "кофе" }] },
        correctAnswer: { Kaffee: "кофе" },
      },
      {
        ...base,
        id: "d",
        kind: "audio-dictation",
        sourceSentence: "Ich moechte.",
        prompt: { audioSentence: "Ich moechte." },
        correctAnswer: "Ich moechte.",
      },
    ];
    expect(ExerciseSetSchema.safeParse(legacy).success).toBe(true);
  });

  it("ExercisesResponse accepts zero exercises", () => {
    const fixture = { exercises: [] };
    expect(ExercisesResponseSchema.parse(fixture)).toEqual(fixture);
  });

  it("isSafeHtmlSubset accepts plain text and bare strong/em tags", () => {
    expect(isSafeHtmlSubset("Kurzer Satz.")).toBe(true);
    expect(isSafeHtmlSubset("Ich <strong>moechte</strong> einen <em>Kaffee</em>.")).toBe(true);
    expect(isSafeHtmlSubset("<strong>outer <em>inner</em> text</strong>")).toBe(true);
  });

  it("isSafeHtmlSubset rejects any tag outside the allowlist", () => {
    expect(isSafeHtmlSubset("<script>alert(1)</script>")).toBe(false);
    expect(isSafeHtmlSubset("<b>bold</b>")).toBe(false);
    expect(isSafeHtmlSubset("<div>text</div>")).toBe(false);
  });

  it("isSafeHtmlSubset rejects any attribute on an allowlisted tag", () => {
    expect(isSafeHtmlSubset('<strong class="x">text</strong>')).toBe(false);
    expect(isSafeHtmlSubset('<em onclick="x()">text</em>')).toBe(false);
  });

  it("isSafeHtmlSubset rejects unclosed or mismatched tags", () => {
    expect(isSafeHtmlSubset("<strong>text")).toBe(false);
    expect(isSafeHtmlSubset("text</strong>")).toBe(false);
    expect(isSafeHtmlSubset("<strong>text</em>")).toBe(false);
  });

  it("TranslateResponse accepts a safe-subset HTML text with matching spans", () => {
    const fixture = {
      text: "Ich <strong>moechte</strong> einen Kaffee.",
      markedVocab: [{ start: 4, end: 28, german: "<strong>moechte</strong>", russian: "хотел бы" }],
    };
    expect(TranslateResponseSchema.parse(fixture)).toEqual(fixture);
  });

  it("TranslateResponse rejects text with markup outside the safe subset", () => {
    const result = TranslateResponseSchema.safeParse({
      text: "Ich <b>moechte</b> einen Kaffee.",
      markedVocab: [],
    });
    expect(result.success).toBe(false);
  });

  it("TranslateResponse rejects a markedVocab span whose german field doesn't match the text substring", () => {
    const result = TranslateResponseSchema.safeParse({
      text: "Ich moechte einen Kaffee.",
      markedVocab: [{ start: 4, end: 11, german: "wollte", russian: "хотел бы" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("metric event schemas", () => {
  const installId = "0b6c3a62-5d2e-4f0a-9c1b-2e8f7d6a5b4c";
  const occurredAt = "2026-10-19T12:00:00.000Z";
  const id = "7d3f1c2e-8a4b-4c6d-9e0f-1a2b3c4d5e6f";

  it("accepts one of each event kind", () => {
    const request = {
      installId,
      events: [
        { name: "install", id, occurredAt },
        { name: "paragraph_translated", id, occurredAt, cache: "miss", latencyMs: 1830 },
        { name: "exercise_completed", id, occurredAt },
        { name: "client_error", id, occurredAt, error: "translate-failed", httpStatus: 502 },
        { name: "client_error", id, occurredAt, error: "translate-offline", httpStatus: null },
        { name: "client_error", id, occurredAt, error: "translate-cors", httpStatus: null },
        { name: "client_error", id, occurredAt, error: "translate-limit", httpStatus: 429 },
        { name: "client_error", id, occurredAt, error: "translate-too-long", httpStatus: 413 },
        { name: "client_error", id, occurredAt, error: "selection-excluded", httpStatus: null },
        { name: "client_error", id, occurredAt, error: "selection-mixed", httpStatus: null },
      ],
    };
    expect(EventsRequestSchema.parse(request)).toEqual(request);
  });

  it("strips anything beyond the allowed fields, so page text or URLs never reach the server", () => {
    const parsed = EventsRequestSchema.parse({
      installId,
      url: "https://example.com/private",
      events: [
        { name: "exercise_completed", id, occurredAt, text: "Привет", hostname: "example.com" },
      ],
    });
    expect(parsed).toEqual({ installId, events: [{ name: "exercise_completed", id, occurredAt }] });
  });

  it("rejects a missing or non-UUID install ID, unknown events and free-form errors", () => {
    const event = { name: "exercise_completed", id, occurredAt };
    expect(EventsRequestSchema.safeParse({ events: [event] }).success).toBe(false);
    expect(EventsRequestSchema.safeParse({ installId: "anon", events: [event] }).success).toBe(
      false,
    );
    expect(
      EventsRequestSchema.safeParse({ installId, events: [{ name: "page_view", id, occurredAt }] })
        .success,
    ).toBe(false);
    expect(
      EventsRequestSchema.safeParse({
        installId,
        events: [{ name: "client_error", id, occurredAt, error: "TypeError: x", httpStatus: null }],
      }).success,
    ).toBe(false);
    expect(EventsRequestSchema.safeParse({ installId, events: [] }).success).toBe(false);
    expect(
      EventsRequestSchema.safeParse({
        installId,
        events: [{ name: "exercise_completed", occurredAt }],
      }).success,
    ).toBe(false);
  });
});

describe("bad-translation report schemas", () => {
  const report = {
    source: "Колесо обозрения закрыли.",
    output: "Das Riesenrad ist zu.",
    level: "A1-A2",
    density: "medium",
    model: "gemini-3.8-flash",
    promptVersion: "2",
  };

  it("accepts a report and drops any extra field such as an install ID or URL", () => {
    expect(
      ReportRequestSchema.parse({ ...report, installId: crypto.randomUUID(), url: "https://x.y" }),
    ).toEqual(report);
    expect(ReportRequestSchema.parse({ ...report, model: null, promptVersion: null }).model).toBe(
      null,
    );
  });

  it("requires every field and caps the text length", () => {
    const { density: _density, ...withoutDensity } = report;
    expect(ReportRequestSchema.safeParse(withoutDensity).success).toBe(false);
    expect(ReportRequestSchema.safeParse({ ...report, source: "" }).success).toBe(false);
    expect(ReportRequestSchema.safeParse({ ...report, source: "x".repeat(10_001) }).success).toBe(
      false,
    );
  });

  it("routes the REPORT_BAD_TRANSLATION message", () => {
    const message = { type: "REPORT_BAD_TRANSLATION", variantId: "v1", sourceText: "Текст" };
    expect(RequestMessageSchema.parse(message)).toEqual(message);
    expect(RequestMessageSchema.safeParse({ ...message, sourceText: "" }).success).toBe(false);
  });
});
