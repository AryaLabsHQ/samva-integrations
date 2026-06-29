import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["supabase/functions/send-email/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/.turbo/**", "**/coverage/**"],
  },
});
