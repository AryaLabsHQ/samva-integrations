import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SRC_FILES = ["index.ts", "verify.ts", "scheme.ts", "events.ts", "errors.ts"];

describe("edge safety", () => {
  for (const file of SRC_FILES) {
    it(`src/${file} contains no node: imports`, () => {
      const content = readFileSync(join(import.meta.dirname, "../src", file), "utf8");
      expect(content).not.toMatch(/["']node:/);
    });
  }
});
