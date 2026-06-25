import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    passWithNoTests: true,
    include: ["packages/**/tests/**/*.{test,spec}.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.turbo/**", "**/coverage/**"],
    coverage: {
      enabled: false,
      provider: "v8",
      reportsDirectory: "./coverage",
      include: ["packages/**/src/**"],
    },
  },
});
