import { createClient } from "samva";

import { getRequiredEnv } from "./env.ts";
import { createSendEmailHookHandler } from "./handler.ts";

const env = Deno.env.toObject();
getRequiredEnv(env, "SEND_EMAIL_HOOK_SECRET");
const samva = createClient({ apiKey: getRequiredEnv(env, "SAMVA_API_KEY") });

Deno.serve(createSendEmailHookHandler({ client: samva, env }));
