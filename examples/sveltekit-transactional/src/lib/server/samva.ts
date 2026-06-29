import { env } from "$env/dynamic/private";
import { createClient } from "samva";

export function getSamva() {
  const apiKey = env.SAMVA_API_KEY;
  if (!apiKey) {
    throw new Error("SAMVA_API_KEY is not set. Copy .env.example to .env and add your key.");
  }

  return createClient({ apiKey });
}
