import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    globals: false,
    // Use Bun's pool to support Bun-specific imports
    pool: "forks",
  },
});
