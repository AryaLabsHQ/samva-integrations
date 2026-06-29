import { defineConfig } from "oxlint";

export default defineConfig({
  categories: {
    correctness: "error",
    suspicious: "warn",
    perf: "warn",
  },
  plugins: ["typescript", "import"],
  rules: {
    "eslint/no-unused-vars": "warn",
    "typescript/no-extraneous-class": "off",
  },
  ignorePatterns: [
    "node_modules",
    "dist",
    "coverage",
    ".turbo",
    "**/.next",
    "**/.output",
    "**/routeTree.gen.ts",
    "**/.wrangler",
    "*.d.ts",
  ],
});
