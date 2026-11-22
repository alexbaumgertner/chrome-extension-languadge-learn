import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { EXPLAIN_MAX_CHARS, ExplainRequestSchema } from "@sprachweise/shared";
import type { Config } from "../config";
import type { Db } from "../db";
import { cacheKey } from "../cache/key";
import { getExplainEntry, putExplainEntry } from "../cache/explain-store";
import { createCoalescingMap } from "../cache/coalesce";
import { dailyPeriodKey, reserveCounters } from "../usage/ledger";
import { EXPLAIN_PROMPT_VERSION, explainFragment, type ExplainResult } from "../pipeline/explain";
import { ProviderConfigError, UpstreamFailureError } from "../pipeline/translate";
import { recordProviderCall } from "../usage/provider-calls";

class AllowanceExhaustedError extends Error {}

export const EXPLAIN_COUNTER = "gemini-explain";

export function registerExplainRoute(app: FastifyInstance, cfg: Config, db: Db): void {
  const coalescing = createCoalescingMap<ExplainResult["explanation"]>();
  const producedBy = { model: cfg.GEMINI_MODEL, promptVersion: EXPLAIN_PROMPT_VERSION };

  app.post("/api/explain", async (request, reply) => {
    const parsed = ExplainRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid-request", detail: parsed.error.message });
    }
    const { text, level } = parsed.data;
    if (text.length > EXPLAIN_MAX_CHARS) {
      return reply.status(413).send({ error: "text-too-long", maxChars: EXPLAIN_MAX_CHARS });
    }

    try {
      const key = cacheKey(
        text,
        level,
        cfg.GEMINI_MODEL,
        cfg.GEMINI_THINKING_LEVEL,
        EXPLAIN_PROMPT_VERSION,
      );
      const cached = await getExplainEntry(db, key);
      if (cached) return reply.status(200).send({ ...cached, ...producedBy, cache: "hit" });

      const result = await coalescing.run(key, async () => {
        // One reservation per real pipeline run, from the explain counter only.
        const reserved = await reserveCounters(db, [
          {
            counter: EXPLAIN_COUNTER,
            periodKey: dailyPeriodKey(new Date()),
            amount: 1,
            allowance: cfg.EXPLAIN_DAILY_REQUEST_ALLOWANCE,
          },
        ]);
        if (!reserved) throw new AllowanceExhaustedError();

        const started = performance.now();
        const call = { model: cfg.GEMINI_MODEL, thinkingLevel: cfg.GEMINI_THINKING_LEVEL };
        const logRecordError = (e: unknown) =>
          request.log.error({ err: e }, "failed to record provider call");
        let explained: ExplainResult;
        try {
          explained = await explainFragment(text, level, cfg);
        } catch (err) {
          // A bad answer (ZodError) was still a paid call, but its usage isn't known here.
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
            usage: explained.usage,
            latencyMs: performance.now() - started,
          },
          logRecordError,
        );
        // explainFragment already validated it; nothing was cached before this point (FR-003).
        await putExplainEntry(db, key, explained.explanation);
        return explained.explanation;
      });

      return reply.status(200).send({ ...result, ...producedBy, cache: "miss" });
    } catch (err) {
      if (err instanceof ProviderConfigError) {
        request.log.error(err.message);
        return reply.status(503).send({ error: "misconfigured" });
      }
      if (err instanceof AllowanceExhaustedError) {
        return reply.status(429).send({ error: "allowance-exhausted" });
      }
      if (err instanceof UpstreamFailureError || err instanceof ZodError) {
        return reply.status(502).send({ error: "upstream-failure" });
      }
      // Never the request body: it holds the learner's text (FR-006).
      request.log.error({ err }, "explain request failed with an unexpected internal error");
      return reply.status(503).send({ error: "internal-failure" });
    }
  });
}
