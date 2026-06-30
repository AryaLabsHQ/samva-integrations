import { dispatchSupabaseAuthEmail } from "./dispatch.tsx";
import { getRequiredEnv } from "./env.ts";
import type { HookEnv, SamvaClient } from "./types.ts";
import { verifySupabaseSendEmailHook } from "./verify.ts";

export interface SendEmailHookHandlerOptions {
  readonly client: SamvaClient;
  readonly env: HookEnv;
}

export function createSendEmailHookHandler(options: SendEmailHookHandlerOptions) {
  return async function handleSendEmailHook(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("method not allowed", { status: 405 });
    }

    try {
      getRequiredEnv(options.env, "SEND_EMAIL_HOOK_SECRET");
    } catch {
      return new Response("missing webhook secret", { status: 500 });
    }

    let payload;
    try {
      payload = await verifySupabaseSendEmailHook(request, options.env);
    } catch {
      return new Response("invalid signature", { status: 401 });
    }

    try {
      await dispatchSupabaseAuthEmail(payload, options.client, options.env);
      return new Response(null, { status: 200 });
    } catch {
      return new Response("send failed", { status: 500 });
    }
  };
}
