import type { FastifyInstance } from "fastify";
import { ExercisesRequestSchema, ExercisesResponseSchema } from "@sprachweise/shared";
import type { Config } from "../config";
import { exercisePolicy, generateExercises } from "../exercises/generate";

/**
 * Pure computation over the already-translated paragraph — no provider call, nothing metered, and
 * nothing cached: the response depends on `supportedKinds`, so a cache added here must key on
 * exercisePolicy(...) too, or an old client would get a set it cannot parse.
 */
export function registerExercisesRoute(app: FastifyInstance, cfg: Config): void {
  app.post("/api/exercises", async (request, reply) => {
    const parsed = ExercisesRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid-request", detail: parsed.error.message });
    }
    const { variantText, markedVocab, supportedKinds } = parsed.data;

    // The German rewrite of a text at the translate cap can run longer than its source.
    const maxChars = 2 * cfg.TRANSLATE_MAX_CHARS;
    if (variantText.length > maxChars) {
      return reply.status(400).send({
        error: "invalid-request",
        detail: `variantText exceeds the configured maximum length of ${maxChars} characters`,
      });
    }

    const exercises = generateExercises(variantText, markedVocab, exercisePolicy(supportedKinds));
    return reply.status(200).send(ExercisesResponseSchema.parse({ exercises }));
  });
}
