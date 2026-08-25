import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@sprachweise/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      GOOGLE_TRANSLATE_API_KEY: "test-google-key",
      GEMINI_API_KEY: "test-gemini-key",
      CMS_DB_PATH: ":memory:",
    },
  },
});
