// oxlint-disable-next-line import/no-unassigned-import -- Next.js uses this marker package to block client imports.
import "server-only";
import { createClient } from "samva";

const apiKey = process.env.SAMVA_API_KEY;
if (!apiKey) {
  throw new Error("SAMVA_API_KEY is not set. Copy .env.example to .env and add your key.");
}

export const samva = createClient({ apiKey });
