import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@sprachweise/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@": __dirname,
    },
  },
  test: {
    environment: "jsdom",
    // design-tokens.test.ts reads the token sheets as text; Vitest blanks CSS without this.
    css: true,
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    setupFiles: ["./tests/unit/setup.ts"],
  },
});
