import type { SamvaClientConfig } from "samva/effect";

export function readSamvaConfig(
  env: Record<string, string | undefined> = Bun.env,
): SamvaClientConfig {
  const apiKey = env.SAMVA_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "SAMVA_API_KEY is not set. Copy examples/effect-sdk/.env.example to .env and add your key.",
    );
  }

  return { apiKey };
}
