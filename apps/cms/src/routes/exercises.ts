import type { FastifyInstance } from "fastify";
import { ExercisesRequestSchema, ExercisesResponseSchema } from "@sprachweise/shared";
import type { Config } from "../config";
import { generateExercises } from "../exercises/generate";

/** Pure computation over the already-translated paragraph — no provider call, nothing metered. */
export function registerExercisesRoute(app: FastifyInstance, cfg: Config): void {
  app.post("/api/exercises", async (request, reply) => {
    const parsed = ExercisesRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid-request", detail: parsed.error.message });
    }
    const { variantText, markedVocab } = parsed.data;

    if (variantText.length > cfg.TRANSLATE_MAX_CHARS) {
      return reply.status(400).send({
        error: "invalid-request",
        detail: `variantText exceeds the configured maximum length of ${cfg.TRANSLATE_MAX_CHARS} characters`,
      });
    }

    const exercises = generateExercises(variantText, markedVocab);
    return reply.status(200).send(ExercisesResponseSchema.parse({ exercises }));
  });
}
