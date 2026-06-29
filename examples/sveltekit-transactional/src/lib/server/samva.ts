import { env } from "$env/dynamic/private";
import { createClient } from "samva";
import type { SamvaClient } from "samva";

let samva: SamvaClient | undefined;

export function getSamva(): SamvaClient {
  const apiKey = env.SAMVA_API_KEY;
  if (!apiKey) {
    throw new Error("SAMVA_API_KEY is not set. Copy .env.example to .env and add your key.");
  }

  return (samva ??= createClient({ apiKey }));
}
