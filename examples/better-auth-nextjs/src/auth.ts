import { memoryAdapter } from "@better-auth/memory-adapter";
import { withSamva } from "@samva/better-auth";
import { betterAuth } from "better-auth/minimal";
import { createClient } from "samva";

const apiKey = process.env.SAMVA_API_KEY;
if (!apiKey) {
  throw new Error("SAMVA_API_KEY is not set.");
}

export const auth = betterAuth(
  withSamva(
    {
      database: memoryAdapter({}),
      emailAndPassword: {
        enabled: true,
      },
    },
    {
      client: createClient({ apiKey }),
      plugins: {
        emailOTP: true,
      },
    },
  ),
);
