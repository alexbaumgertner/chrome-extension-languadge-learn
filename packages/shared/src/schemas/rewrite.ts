import { z } from "zod";
import { LevelSchema } from "./storage";

/**
 * How "Rewrite" changes a fragment: `simpler` to the learner's level, `richer` one level up,
 * `formal` or `casual` in register. A closed set, so the backend prompt and the cache key can
 * rely on it.
 */
export const RewriteModeSchema = z.enum(["simpler", "richer", "formal", "casual"]);
export type RewriteMode = z.infer<typeof RewriteModeSchema>;

/** Longest fragment /api/rewrite takes; equals the side panel's selection cap. */
export const REWRITE_MAX_CHARS = 600;

export const RewriteRequestSchema = z.object({
  text: z.string().min(1),
  level: LevelSchema,
  mode: RewriteModeSchema,
});
export type CmsRewriteRequest = z.infer<typeof RewriteRequestSchema>;
