import { SAMVA_API_KEY } from "astro:env/server";
import { createClient } from "samva";

export const samva = createClient({ apiKey: SAMVA_API_KEY });
