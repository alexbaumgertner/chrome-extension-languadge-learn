import type { Config } from "../config";
import { withRetry } from "./retry";

export class UpstreamFailureError extends Error {}

interface GoogleTranslateResponse {
  data?: { translations?: Array<{ translatedText?: string }> };
}

async function doTranslateRaw(
  text: string,
  cfg: Pick<Config, "GOOGLE_TRANSLATE_API_KEY">,
): Promise<string> {
  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${cfg.GOOGLE_TRANSLATE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, target: "de", format: "text" }),
    },
  );

  if (!response.ok) {
    throw new UpstreamFailureError(
      `Google Translate raw-translation call failed: ${response.status}`,
    );
  }

  const body = (await response.json()) as GoogleTranslateResponse;
  const translatedText = body.data?.translations?.[0]?.translatedText;
  if (typeof translatedText !== "string") {
    throw new UpstreamFailureError(
      "Google Translate raw-translation response missing data.translations",
    );
  }

  return translatedText;
}

/** Google Cloud Translation API (Basic v2): source paragraph text → German. */
export function translateRaw(
  text: string,
  cfg: Pick<Config, "GOOGLE_TRANSLATE_API_KEY">,
): Promise<string> {
  return withRetry(() => doTranslateRaw(text, cfg));
}
