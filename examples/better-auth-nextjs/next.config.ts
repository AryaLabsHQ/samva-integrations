import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const here = dirname(fileURLToPath(import.meta.url));
const samvaSdkEntry = resolve(here, "../../node_modules/samva/dist/index.js");

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      samva: samvaSdkEntry,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      samva: samvaSdkEntry,
    };
    return config;
  },
};

export default nextConfig;
