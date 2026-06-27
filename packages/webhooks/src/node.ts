import type { IncomingMessage } from "node:http";

import {
  MalformedPayloadError,
  MissingSignatureError,
  SignatureMismatchError,
  TimestampToleranceError,
  WebhookVerificationError,
} from "./errors.js";
import { SAMVA_WEBHOOK_EVENT_TYPES } from "./events.js";
import type { SamvaWebhookEvent, SamvaWebhookEventType } from "./events.js";
import { safeVerify, verify } from "./verify.js";

export {
  SAMVA_WEBHOOK_EVENT_TYPES,
  MalformedPayloadError,
  MissingSignatureError,
  SignatureMismatchError,
  TimestampToleranceError,
  WebhookVerificationError,
  safeVerify,
  verify,
};
export type { SamvaWebhookEvent, SamvaWebhookEventType };

/**
 * Verify a Samva webhook from a Node.js IncomingMessage.
 *
 * @example Express (with express.raw middleware):
 * app.post("/webhooks/samva", express.raw({ type: "application/json" }), (req, res) => {
 *   const payload = (req.body as Buffer).toString("utf8");
 *   verify({ payload, signature: req.header("x-webhook-signature") ?? "", secret })
 *     .then(() => res.sendStatus(200))
 *     .catch(() => res.sendStatus(400));
 * });
 */
export async function verifyNodeRequest(
  req: IncomingMessage & { rawBody?: string | Uint8Array },
  secret: string,
  opts?: { tolerance?: number },
): Promise<SamvaWebhookEvent> {
  let payload: string;
  if (typeof req.rawBody === "string") {
    payload = req.rawBody;
  } else if (req.rawBody instanceof Uint8Array) {
    payload = Buffer.from(req.rawBody).toString("utf8");
  } else {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
    }
    payload = Buffer.concat(chunks).toString("utf8");
  }

  const header = req.headers["x-webhook-signature"];
  const signature = (Array.isArray(header) ? header[0] : header) ?? "";

  return verify({
    payload,
    signature,
    secret,
    ...(opts?.tolerance !== undefined ? { tolerance: opts.tolerance } : {}),
  });
}
