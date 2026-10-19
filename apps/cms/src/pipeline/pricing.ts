/** USD per 1M tokens (input, output incl. thinking), Gemini standard paid tier, as of 2026-10. */
const PRICES: Record<string, [number, number]> = {
  "gemini-3.5-flash-lite": [0.3, 2.5],
  "gemini-3.1-flash-lite": [0.25, 1.5],
  "gemini-2.5-flash-lite": [0.1, 0.4],
  "gemini-2.5-flash": [0.3, 2.5],
  // 3.6 and 3.8 Flash double to [1.5, 7.5] on 2027-01-01.
  "gemini-3.6-flash": [0.75, 3.75],
  "gemini-3.8-flash": [0.75, 3.75],
};

/** Cost of one call in USD, or null when the model has no price on file. */
export function costUsd(
  model: string,
  usage: { promptTokens: number; outputTokens: number; thoughtsTokens: number },
): number | null {
  const price = PRICES[model];
  if (!price) return null;
  return (
    (usage.promptTokens * price[0] + (usage.outputTokens + usage.thoughtsTokens) * price[1]) / 1e6
  );
}
