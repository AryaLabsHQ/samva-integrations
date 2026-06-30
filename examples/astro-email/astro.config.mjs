import cloudflare from "@astrojs/cloudflare";
import { defineConfig, envField } from "astro/config";

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  env: {
    schema: {
      SAMVA_API_KEY: envField.string({ context: "server", access: "secret" }),
    },
  },
});
