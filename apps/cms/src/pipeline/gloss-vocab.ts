import type { Config } from "../config";
import { UpstreamFailureError } from "./translate-raw";
import { withRetry } from "./retry";

interface GoogleTranslateResponse {
  data?: { translations?: Array<{ translatedText?: string }> };
}

async function doGlossVocab(
  terms: string[],
  cfg: Pick<Config, "GOOGLE_TRANSLATE_API_KEY">,
): Promise<string[]> {
  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${cfg.GOOGLE_TRANSLATE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: terms, target: "ru", format: "text" }),
    },
  );

  if (!response.ok) {
    throw new UpstreamFailureError(`Google Translate vocab-gloss call failed: ${response.status}`);
  }

  const body = (await response.json()) as GoogleTranslateResponse;
  const translations = body.data?.translations;
  if (!Array.isArray(translations) || translations.length !== terms.length) {
    throw new UpstreamFailureError(
      "Google Translate vocab-gloss response missing data.translations",
    );
  }

  return translations.map((t) => {
    if (typeof t.translatedText !== "string") {
      throw new UpstreamFailureError(
        "Google Translate vocab-gloss response entry missing translatedText",
      );
    }
    return t.translatedText;
  });
}

/** Google Cloud Translation API (Basic v2), batched: vocabulary terms → Russian glosses, order preserved. */
export function glossVocab(
  terms: string[],
  cfg: Pick<Config, "GOOGLE_TRANSLATE_API_KEY">,
): Promise<string[]> {
  if (terms.length === 0) return Promise.resolve([]);
  return withRetry(() => doGlossVocab(terms, cfg));
}
