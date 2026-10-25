import { describe, expect, it } from "vitest";
import {
  AnyMessageSchema,
  ClientErrorCodeSchema,
  GetPendingSelectionResponseSchema,
  RequestMessageSchema,
  SELECTION_MAX_CHARS,
  SelectionToolMessageSchema,
  TranslateSelectionRequestSchema,
  TranslateSelectionResponseSchema,
} from "../src/index";

const selection = { id: "a1", tool: "translate", text: "Guten Tag", truncated: false } as const;

describe("selection tool messages", () => {
  it("SelectionToolMessage round-trips a valid fixture and is an AnyMessage", () => {
    const fixture = { type: "SELECTION_TOOL", selection } as const;
    expect(SelectionToolMessageSchema.parse(fixture)).toEqual(fixture);
    expect(AnyMessageSchema.parse(fixture)).toEqual(fixture);
  });

  it("is not accepted as a request to the background router", () => {
    expect(RequestMessageSchema.safeParse({ type: "SELECTION_TOOL", selection }).success).toBe(
      false,
    );
  });

  it("accepts only the known tools and a non-empty fragment of at most the cap", () => {
    const parse = (patch: object) =>
      SelectionToolMessageSchema.safeParse({
        type: "SELECTION_TOOL",
        selection: { ...selection, ...patch },
      }).success;
    expect(parse({ tool: "speak" })).toBe(true);
    expect(parse({ tool: "explain" })).toBe(false);
    expect(parse({ text: "" })).toBe(false);
    expect(parse({ text: "x".repeat(SELECTION_MAX_CHARS) })).toBe(true);
    expect(parse({ text: "x".repeat(SELECTION_MAX_CHARS + 1) })).toBe(false);
  });

  it("carries no page address: unknown keys are not part of the payload", () => {
    const parsed = SelectionToolMessageSchema.parse({
      type: "SELECTION_TOOL",
      selection: { ...selection, pageUrl: "https://example.com/secret" },
    });
    expect(parsed.selection).not.toHaveProperty("pageUrl");
  });

  it("GetPendingSelection answers a selection or null", () => {
    expect(GetPendingSelectionResponseSchema.parse({ selection: null })).toEqual({
      selection: null,
    });
    expect(GetPendingSelectionResponseSchema.parse({ selection }).selection).toEqual(selection);
    expect(RequestMessageSchema.parse({ type: "GET_PENDING_SELECTION" })).toBeTruthy();
  });

  it("TranslateSelectionRequest takes only the text (the level is read from settings)", () => {
    const fixture = { type: "TRANSLATE_SELECTION", text: "Hallo" } as const;
    expect(TranslateSelectionRequestSchema.parse(fixture)).toEqual(fixture);
    expect(
      TranslateSelectionRequestSchema.safeParse({ type: "TRANSLATE_SELECTION", text: "" }).success,
    ).toBe(false);
    expect(RequestMessageSchema.parse(fixture)).toBeTruthy();
  });

  it("TranslateSelectionResponse checks spans and refuses markup beyond strong/em", () => {
    const ok = (text: string, spans: Array<{ start: number; end: number; russian: string }>) =>
      TranslateSelectionResponseSchema.safeParse({ ok: true, text, spans }).success;
    expect(ok("Ich <em>gehe</em> heim", [{ start: 7, end: 11, russian: "иду" }])).toBe(true);
    expect(ok("Ich gehe", [{ start: 4, end: 20, russian: "иду" }])).toBe(false);
    expect(
      ok("Ich gehe heim", [
        { start: 4, end: 8, russian: "иду" },
        { start: 6, end: 10, russian: "x" },
      ]),
    ).toBe(false);
    expect(ok("Ich <script>alert(1)</script>", [])).toBe(false);
    expect(ok('Ich <a href="x">gehe</a>', [])).toBe(false);
    for (const reason of ["offline", "unavailable", "limit", "too-long", "failed"]) {
      expect(TranslateSelectionResponseSchema.parse({ ok: false, reason })).toEqual({
        ok: false,
        reason,
      });
    }
  });

  it("has a client error code for a failed panel tool", () => {
    expect(ClientErrorCodeSchema.parse("selection-panel-failed")).toBe("selection-panel-failed");
  });
});
