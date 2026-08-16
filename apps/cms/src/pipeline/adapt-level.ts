import type { Config } from "../config";
import { UpstreamFailureError } from "./translate-raw";
import { withRetry } from "./retry";

export interface AdaptLevelResult {
  text: string;
  vocabTerms: string[];
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

const GEMINI_MODEL = "gemini-2.0-flash";

async function doAdaptLevel(
  rawText: string,
  level: string,
  topic: string,
  cfg: Pick<Config, "GEMINI_API_KEY">,
): Promise<AdaptLevelResult> {
  const prompt =
    `Rewrite the following German text for a ${level} learner (CEFR level), focused on the ` +
    `grammar topic "${topic}". Return a rewritten German version at that level, as a safe-subset ` +
    `HTML fragment using only bare <strong>/<em> tags for emphasis (no attributes, no other ` +
    `elements), plus a list of vocabulary terms from the rewritten text worth marking for this ` +
    `level and topic.\n\nRaw German text: ${rawText}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${cfg.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              text: { type: "STRING" },
              vocabTerms: { type: "ARRAY", items: { type: "STRING" } },
            },
            required: ["text", "vocabTerms"],
          },
        },
      }),
    },
  );

  if (!response.ok) {
    throw new UpstreamFailureError(`Gemini level-adaptation call failed: ${response.status}`);
  }

  const body = (await response.json()) as GeminiResponse;
  const rawPayload = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof rawPayload !== "string") {
    throw new UpstreamFailureError("Gemini response missing candidates[0].content.parts[0].text");
  }

  let parsed: { text?: unknown; vocabTerms?: unknown };
  try {
    parsed = JSON.parse(rawPayload) as { text?: unknown; vocabTerms?: unknown };
  } catch {
    throw new UpstreamFailureError("Gemini structured-output payload was not valid JSON");
  }

  if (typeof parsed.text !== "string" || !Array.isArray(parsed.vocabTerms)) {
    throw new UpstreamFailureError("Gemini structured-output payload missing text/vocabTerms");
  }

  const text = parsed.text;
  // A vocabTerms entry not found as a substring of text is dropped, not an error (contract).
  const vocabTerms = parsed.vocabTerms.filter(
    (term): term is string => typeof term === "string" && text.includes(term),
  );

  return { text, vocabTerms };
}

/**
 * Gemini (Flash tier, structured output): raw German + level/topic → CEFR-adapted rewrite
 * and the vocabulary terms worth marking for that level/topic (contracts/api-contract.md).
 * The prompt's wording (level/topic markers, trailing raw-text line) is a stable format —
 * `apps/cms/tests/integration/mock-providers.ts` parses it back out for deterministic test fixtures.
 */
export function adaptLevel(
  rawText: string,
  level: string,
  topic: string,
  cfg: Pick<Config, "GEMINI_API_KEY">,
): Promise<AdaptLevelResult> {
  return withRetry(() => doAdaptLevel(rawText, level, topic, cfg));
}
