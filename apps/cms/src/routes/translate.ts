import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { TranslateRequestSchema, TranslateResponseSchema } from "@sprachweise/shared";
import type { Config } from "../config";
import type { Db } from "../db";
import { cacheKey } from "../cache/key";
import { getCacheEntry, putCacheEntry, type CachedTranslation } from "../cache/store";
import { createCoalescingMap } from "../cache/coalesce";
import { reserveUsage } from "../usage/ledger";
import { translateParagraph, UpstreamFailureError } from "../pipeline/translate";
import { markVocab } from "../pipeline/mark-vocab";

class AllowanceExhaustedError extends Error {}

export function registerTranslateRoute(app: FastifyInstance, cfg: Config, db: Db): void {
  const coalescing = createCoalescingMap<CachedTranslation>();

  app.post("/api/translate", async (request, reply) => {
    const parsed = TranslateRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid-request", detail: parsed.error.message });
    }
    // `topic` is still accepted for wire compatibility but no longer shapes the output.
    const { text, level } = parsed.data;

    if (text.length > cfg.TRANSLATE_MAX_CHARS) {
      return reply.status(400).send({
        error: "invalid-request",
        detail: `text exceeds the configured maximum length of ${cfg.TRANSLATE_MAX_CHARS} characters`,
      });
    }

    try {
      const key = cacheKey(text, level, cfg.GEMINI_MODEL);
      const cached = await getCacheEntry(db, key);
      if (cached) {
        return reply.status(200).send(cached);
      }

      const result = await coalescing.run(key, async () => {
        // Reserved once per actual pipeline run (inside the coalescing callback), not once per
        // incoming HTTP request, so concurrent coalesced callers never double-reserve (FR-008/FR-010).
        if (!(await reserveUsage(db, cfg))) {
          throw new AllowanceExhaustedError();
        }

        const translated = await translateParagraph(text, level, cfg);
        const markedVocab = markVocab(translated.text, translated.vocab);

        // FR-012: any validation failure (span bounds/content mismatch, unsafe HTML) discards the
        // whole response — nothing below this line runs, so nothing is cached, on a thrown ZodError.
        const validated = TranslateResponseSchema.parse({ text: translated.text, markedVocab });
        await putCacheEntry(db, key, validated);
        return validated;
      });

      return reply.status(200).send(result);
    } catch (err) {
      if (err instanceof AllowanceExhaustedError) {
        return reply.status(429).send({ error: "allowance-exhausted" });
      }
      // FR-011/FR-012: provider unreachable/timeout/non-2xx or a response that fails validation.
      if (err instanceof UpstreamFailureError || err instanceof ZodError) {
        return reply.status(502).send({ error: "upstream-failure" });
      }
      // FR-013: anything else (e.g. the Postgres cache/usage-ledger store itself failing) is
      // reported as a distinguishable internal failure, not conflated with an upstream provider issue.
      request.log.error({ err }, "translate request failed with an unexpected internal error");
      return reply.status(503).send({ error: "internal-failure" });
    }
  });
}
