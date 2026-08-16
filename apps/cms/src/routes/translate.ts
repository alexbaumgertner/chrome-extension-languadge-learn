import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { TranslateRequestSchema, TranslateResponseSchema } from "@sprachweise/shared";
import type { Config } from "../config";
import { openDb } from "../db";
import { cacheKey } from "../cache/key";
import { getCacheEntry, putCacheEntry, type CachedTranslation } from "../cache/store";
import { createCoalescingMap } from "../cache/coalesce";
import { reserveUsage } from "../usage/ledger";
import { translateRaw, UpstreamFailureError } from "../pipeline/translate-raw";
import { adaptLevel } from "../pipeline/adapt-level";
import { glossVocab } from "../pipeline/gloss-vocab";

class AllowanceExhaustedError extends Error {}

export function registerTranslateRoute(app: FastifyInstance, cfg: Config): void {
  const db = openDb(cfg);
  const coalescing = createCoalescingMap<CachedTranslation>();

  app.post("/api/translate", async (request, reply) => {
    const parsed = TranslateRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid-request", detail: parsed.error.message });
    }
    const { text, level, topic } = parsed.data;

    if (text.length > cfg.TRANSLATE_MAX_CHARS) {
      return reply.status(400).send({
        error: "invalid-request",
        detail: `text exceeds the configured maximum length of ${cfg.TRANSLATE_MAX_CHARS} characters`,
      });
    }

    try {
      const key = cacheKey(text, level, topic);
      const cached = getCacheEntry(db, key);
      if (cached) {
        return reply.status(200).send(cached);
      }

      const result = await coalescing.run(key, async () => {
        // Reserved once per actual pipeline run (inside the coalescing callback), not once per
        // incoming HTTP request, so concurrent coalesced callers never double-reserve (FR-008/FR-010).
        const reserved = reserveUsage(db, { translateChars: text.length, geminiRequests: 1 }, cfg);
        if (!reserved) {
          throw new AllowanceExhaustedError();
        }

        const rawGerman = await translateRaw(text, cfg);
        const { text: adaptedText, vocabTerms } = await adaptLevel(rawGerman, level, topic, cfg);
        const glosses = await glossVocab(vocabTerms, cfg);

        const markedVocab = vocabTerms.map((term, i) => {
          const start = adaptedText.indexOf(term);
          return { start, end: start + term.length, german: term, russian: glosses[i] ?? "" };
        });

        // FR-012: any validation failure (span bounds/content mismatch, unsafe HTML) discards the
        // whole response — nothing below this line runs, so nothing is cached, on a thrown ZodError.
        const validated = TranslateResponseSchema.parse({ text: adaptedText, markedVocab });
        putCacheEntry(db, key, validated);
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
      // FR-013: anything else (e.g. the local SQLite cache/usage-ledger store itself failing) is
      // reported as a distinguishable internal failure, not conflated with an upstream provider issue.
      request.log.error({ err }, "translate request failed with an unexpected internal error");
      return reply.status(503).send({ error: "internal-failure" });
    }
  });
}
