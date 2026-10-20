/**
 * Token values the extension writes into the host page's own DOM, where our CSS variables can't
 * exist without leaking (the vocabulary chip around a glossed German word). They mirror
 * tokens.css — tests/unit/design-tokens.test.ts keeps the two equal.
 */
export const HOST_TOKENS = {
  "--color-accent-200": "#ffe1d0",
  "--color-accent-400": "#f6a06b",
  "--color-accent-900": "#402310",
} as const;
