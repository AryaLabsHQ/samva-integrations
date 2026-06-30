// eslint-disable-next-line import/no-unassigned-import
import "@tanstack/react-start/server-only";
import { createClient } from "samva";

export function getSamva() {
  const apiKey = process.env.SAMVA_API_KEY;
  if (!apiKey) {
    throw new Error("SAMVA_API_KEY is not set");
  }

  return createClient({ apiKey });
}
