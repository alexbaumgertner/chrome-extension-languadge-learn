import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.output/**",
      "**/.wxt/**",
      "**/coverage/**",
      "**/test-results/**",
      "**/playwright-report/**",
      // Reference/handoff material, not project source.
      "design_handoff_sprachweise/**",
      "docs/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Playwright fixtures use a `use` callback parameter (its own convention,
    // unrelated to React hooks) — the react-hooks rule false-positives on it.
    files: ["**/tests/integration/fixtures.ts"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
);
