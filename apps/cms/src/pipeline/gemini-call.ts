import { withRetry } from "./retry";
import { ProviderConfigError, UpstreamFailureError, type GeminiConfig } from "./translate";

/**
 * One Gemini structured-output call for tools other than translation (explain today). Same
 * behaviour as `translateParagraph` in translate.ts: key in a header, timeout, one retry, and a
 * rejected configuration is never retried and remembered per process. translate.ts is left as it
 * is on purpose (see specs/006-explain/plan.md).
 */
export interface GeminiJsonResult {
  /** The model's JSON payload, parsed but not validated. */
  payload: unknown;
  usage: { promptTokens: number; outputTokens: number; thoughtsTokens: number };
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
  };
}

const CONFIG_ERROR_DETAIL = /thinking|model|api key|permission|not found|not supported/i;
const configFailures = new Map<string, ProviderConfigError>();
const configKey = (cfg: GeminiConfig) => `${cfg.GEMINI_MODEL}\0${cfg.GEMINI_THINKING_LEVEL}`;

async function callOnce(
  prompt: string,
  responseSchema: Record<string, unknown>,
  cfg: GeminiConfig,
): Promise<GeminiJsonResult> {
  const generationConfig: Record<string, unknown> = {
    responseMimeType: "application/json",
    responseSchema,
  };
  if (cfg.GEMINI_THINKING_LEVEL) {
    generationConfig.thinkingConfig = { thinkingLevel: cfg.GEMINI_THINKING_LEVEL };
  }

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${cfg.GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        // Header, not ?key=, so the secret never appears in a URL or access log.
        headers: { "Content-Type": "application/json", "x-goog-api-key": cfg.GEMINI_API_KEY },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig }),
        signal: AbortSignal.timeout(cfg.GEMINI_TIMEOUT_MS),
      },
    );
  } catch (err) {
    throw new UpstreamFailureError(`Gemini call failed: ${(err as Error).name}`);
  }

  if (!response.ok) {
    // Google's error text never echoes the learner's text, so it is safe to surface.
    const detail = await response
      .json()
      .then((b: { error?: { message?: string } }) => b.error?.message ?? "")
      .catch(() => "");
    if (
      [401, 403, 404].includes(response.status) ||
      (response.status === 400 && CONFIG_ERROR_DETAIL.test(detail))
    ) {
      throw new ProviderConfigError(
        `Gemini rejected the configuration (GEMINI_MODEL=${cfg.GEMINI_MODEL}, ` +
          `GEMINI_THINKING_LEVEL=${cfg.GEMINI_THINKING_LEVEL || "(omitted)"}): ` +
          `${response.status} ${detail.slice(0, 200)}`,
      );
    }
    throw new UpstreamFailureError(
      `Gemini call failed: ${response.status}${detail ? ` ${detail.slice(0, 200)}` : ""}`,
    );
  }

  const body = (await response.json()) as GeminiResponse;
  const raw = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof raw !== "string") {
    throw new UpstreamFailureError("Gemini response missing candidates[0].content.parts[0].text");
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new UpstreamFailureError("Gemini structured-output payload was not valid JSON");
  }
  return {
    payload,
    usage: {
      promptTokens: body.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: body.usageMetadata?.candidatesTokenCount ?? 0,
      thoughtsTokens: body.usageMetadata?.thoughtsTokenCount ?? 0,
    },
  };
}

export function callGeminiJson(
  prompt: string,
  responseSchema: Record<string, unknown>,
  cfg: GeminiConfig,
): Promise<GeminiJsonResult> {
  const known = configFailures.get(configKey(cfg));
  if (known) return Promise.reject(known);
  return withRetry(
    () => callOnce(prompt, responseSchema, cfg),
    200,
    (err) => !(err instanceof ProviderConfigError),
  ).catch((err: unknown) => {
    if (err instanceof ProviderConfigError) configFailures.set(configKey(cfg), err);
    throw err;
  });
}

/** Test seam: forget remembered configuration failures. */
export function resetGeminiCallConfigFailures(): void {
  configFailures.clear();
}
