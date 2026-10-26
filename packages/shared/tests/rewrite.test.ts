import { describe, expect, it } from "vitest";
import {
  AnyMessageSchema,
  REWRITE_MAX_CHARS,
  RequestMessageSchema,
  RewriteModeSchema,
  RewriteRequestSchema,
  SELECTION_MAX_CHARS,
  SelectionPayloadSchema,
} from "../src/index";

describe("rewrite schemas", () => {
  it("knows exactly four modes", () => {
    expect(RewriteModeSchema.options).toEqual(["simpler", "richer", "formal", "casual"]);
    expect(RewriteModeSchema.safeParse("shorter").success).toBe(false);
  });

  it("RewriteRequest needs text, a level and a mode", () => {
    const ok = { text: "Hallo", level: "A1-A2", mode: "formal" };
    expect(RewriteRequestSchema.parse(ok)).toEqual(ok);
    expect(RewriteRequestSchema.safeParse({ ...ok, text: "" }).success).toBe(false);
    expect(RewriteRequestSchema.safeParse({ ...ok, mode: "x" }).success).toBe(false);
    expect(RewriteRequestSchema.safeParse({ text: "Hallo", level: "A1-A2" }).success).toBe(false);
  });

  it("the backend and the panel cap fragments at the same length", () => {
    expect(REWRITE_MAX_CHARS).toBe(SELECTION_MAX_CHARS);
  });

  it("rewrite is a selection tool", () => {
    expect(
      SelectionPayloadSchema.safeParse({ id: "a", tool: "rewrite", text: "x", truncated: false })
        .success,
    ).toBe(true);
  });

  it("REWRITE_SELECTION and REPORT_SELECTION_RESULT are requests to the background", () => {
    const rewrite = { type: "REWRITE_SELECTION", text: "Hallo", mode: "casual" };
    const report = { type: "REPORT_SELECTION_RESULT", source: "Hallo", output: "Hi" };
    for (const m of [rewrite, report]) {
      expect(RequestMessageSchema.parse(m)).toEqual(m);
      expect(AnyMessageSchema.parse(m)).toEqual(m);
    }
    expect(
      RequestMessageSchema.safeParse({ ...rewrite, text: "a".repeat(SELECTION_MAX_CHARS + 1) })
        .success,
    ).toBe(false);
    expect(RequestMessageSchema.safeParse({ ...rewrite, mode: "x" }).success).toBe(false);
  });
});
