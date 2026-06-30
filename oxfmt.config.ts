import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  sortImports: {},
  sortPackageJson: {},
  ignorePatterns: [
    "**/dist",
    "**/coverage",
    "**/.next",
    "**/.output",
    "**/.turbo",
    "**/routeTree.gen.ts",
    "**/.wrangler",
    ".claude",
    "node_modules",
  ],
});
