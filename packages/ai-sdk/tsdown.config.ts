import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/mailbox.ts"],
  dts: true,
  clean: true,
  format: ["esm"],
  external: ["ai", "zod"],
});
