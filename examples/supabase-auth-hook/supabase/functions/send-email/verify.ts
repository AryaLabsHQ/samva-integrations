import { Webhook } from "standardwebhooks";

import { getRequiredEnv } from "./env.ts";
import type { HookEnv, SendEmailHookPayload } from "./types.ts";

export async function verifySupabaseSendEmailHook(
  request: Request,
  env: HookEnv,
): Promise<SendEmailHookPayload> {
  const rawBody = await request.text();
  const headers = Object.fromEntries(request.headers);
  const secret = normalizeSupabaseWebhookSecret(getRequiredEnv(env, "SEND_EMAIL_HOOK_SECRET"));
  const webhook = new Webhook(secret);

  return webhook.verify(rawBody, headers) as SendEmailHookPayload;
}

export function normalizeSupabaseWebhookSecret(secret: string): string {
  const trimmed = secret.trim();
  if (trimmed.startsWith("v1,whsec_")) {
    return trimmed.slice("v1,whsec_".length);
  }
  if (trimmed.startsWith("whsec_")) {
    return trimmed.slice("whsec_".length);
  }
  return trimmed;
}
