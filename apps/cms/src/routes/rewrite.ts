import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import {
  REWRITE_MAX_CHARS,
  RewriteRequestSchema,
  TranslateResponseSchema,
} from "@sprachweise/shared";
import type { Config } from "../config";
import type { Db } from "../db";
import { cacheKey } from "../cache/key";
import { getCacheEntry, putCacheEntry, type CachedTranslation } from "../cache/store";
import { createCoalescingMap } from "../cache/coalesce";
import { reserveRewriteUsage } from "../usage/ledger";
import { ProviderConfigError, UpstreamFailureError } from "../pipeline/translate";
import { REWRITE_PROMPT_VERSION, rewriteText } from "../pipeline/rewrite";
import { markVocab } from "../pipeline/mark-vocab";
import { recordProviderCall } from "../usage/provider-calls";

class AllowanceExhaustedError extends Error {}

export function registerRewriteRoute(app: FastifyInstance, cfg: Config, db: Db): void {
  const coalescing = createCoalescingMap<CachedTranslation>();
  // Both are in the cache key, so they also describe any cached answer.
  const producedBy = { model: cfg.GEMINI_MODEL, promptVersion: REWRITE_PROMPT_VERSION };

  app.post("/api/rewrite", async (request, reply) => {
    const parsed = RewriteRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid-request", detail: parsed.error.message });
    }
    const { text, level, mode } = parsed.data;

    // Its own status and code, so the extension can tell the learner to select less.
    if (text.length > REWRITE_MAX_CHARS) {
      return reply.status(413).send({ error: "text-too-long", maxChars: REWRITE_MAX_CHARS });
    }

    try {
      // The mode is part of the key (through the version slot), so each mode has its own entry
      // and none can collide with a translation of the same text.
      const key = cacheKey(
        text,
        level,
        cfg.GEMINI_MODEL,
        cfg.GEMINI_THINKING_LEVEL,
        `rewrite:${REWRITE_PROMPT_VERSION}:${mode}`,
      );
      const cached = await getCacheEntry(db, key);
      if (cached) {
        return reply.status(200).send({ ...cached, ...producedBy, cache: "hit" });
      }

      const result = await coalescing.run(key, async () => {
        // Reserved once per actual pipeline run (inside the coalescing callback), not once per
        // incoming HTTP request, so concurrent coalesced callers never double-reserve (FR-008/FR-010).
        if (!(await reserveRewriteUsage(db, cfg))) {
          throw new AllowanceExhaustedError();
        }

        const started = performance.now();
        const call = { model: cfg.GEMINI_MODEL, thinkingLevel: cfg.GEMINI_THINKING_LEVEL };
        const logRecordError = (e: unknown) =>
          request.log.error({ err: e }, "failed to record provider call");
        let rewritten;
        try {
          rewritten = await rewriteText(text, level, mode, cfg);
        } catch (err) {
          await recordProviderCall(
            db,
            { ...call, status: "error", latencyMs: performance.now() - started },
            logRecordError,
          );
          throw err;
        }
        await recordProviderCall(
          db,
          {
            ...call,
            status: "ok",
            usage: rewritten.usage,
            latencyMs: performance.now() - started,
          },
          logRecordError,
        );
        const markedVocab = markVocab(rewritten.text, rewritten.vocab);

        // FR-012: any validation failure (span bounds/content mismatch, unsafe HTML) discards the
        // whole response — nothing below this line runs, so nothing is cached, on a thrown ZodError.
        const validated = TranslateResponseSchema.parse({ text: rewritten.text, markedVocab });
        await putCacheEntry(db, key, validated);
        return validated;
      });

      return reply.status(200).send({ ...result, ...producedBy, cache: "miss" });
    } catch (err) {
      if (err instanceof ProviderConfigError) {
        // A deployment mistake, not a provider outage: loud in the logs, distinct for the client.
        request.log.error(err.message);
        return reply.status(503).send({ error: "misconfigured" });
      }
      if (err instanceof AllowanceExhaustedError) {
        return reply.status(429).send({ error: "allowance-exhausted" });
      }
      // FR-011/FR-012: provider unreachable/timeout/non-2xx or a response that fails validation.
      if (err instanceof UpstreamFailureError || err instanceof ZodError) {
        return reply.status(502).send({ error: "upstream-failure" });
      }
      // FR-013: anything else (e.g. the Postgres cache/usage-ledger store itself failing) is
      // reported as a distinguishable internal failure, not conflated with an upstream provider issue.
      request.log.error({ err }, "rewrite request failed with an unexpected internal error");
      return reply.status(503).send({ error: "internal-failure" });
    }
  });
}
