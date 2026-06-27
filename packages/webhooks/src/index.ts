/// <reference lib="dom" />

import type { SamvaWebhookEvent } from "./events.js";
import { verify } from "./verify.js";

export { SAMVA_WEBHOOK_EVENT_TYPES } from "./events.js";
export type { SamvaWebhookEvent, SamvaWebhookEventType } from "./events.js";
export {
  MalformedPayloadError,
  MissingSignatureError,
  SignatureMismatchError,
  TimestampToleranceError,
  WebhookVerificationError,
} from "./errors.js";
export { safeVerify, verify } from "./verify.js";

/**
 * Verify a Samva webhook from a Web API Request (edge-safe).
 * Pass the RAW Request — do NOT JSON-parse the body before calling this.
 */
export async function verifyRequest(
  req: Request,
  secret: string,
  opts?: { tolerance?: number },
): Promise<SamvaWebhookEvent> {
  const payload = await req.text();
  const signature = req.headers.get("x-webhook-signature") ?? "";
  return verify({
    payload,
    signature,
    secret,
    ...(opts?.tolerance !== undefined ? { tolerance: opts.tolerance } : {}),
  });
}
