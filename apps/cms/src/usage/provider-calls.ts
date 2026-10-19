import type { Db } from "../db";
import { costUsd } from "../pipeline/pricing";

export interface ProviderCall {
  model: string;
  thinkingLevel: string;
  status: "ok" | "error";
  usage?: { promptTokens: number; outputTokens: number; thoughtsTokens: number };
  latencyMs: number;
}

/** Records one Gemini call for cost tracking. Never throws: bookkeeping must not fail a request. */
export async function recordProviderCall(
  db: Db,
  call: ProviderCall,
  onError: (err: unknown) => void,
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO provider_calls
         (model, thinking_level, status, prompt_tokens, output_tokens, thoughts_tokens, cost_usd, latency_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        call.model,
        call.thinkingLevel,
        call.status,
        call.usage?.promptTokens ?? null,
        call.usage?.outputTokens ?? null,
        call.usage?.thoughtsTokens ?? null,
        call.usage ? costUsd(call.model, call.usage) : null,
        Math.round(call.latencyMs),
      ],
    );
  } catch (err) {
    onError(err);
  }
}
