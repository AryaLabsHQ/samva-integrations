/// <reference lib="dom" />

import {
  MalformedPayloadError,
  MissingSignatureError,
  SignatureMismatchError,
  TimestampToleranceError,
} from "./errors.js";
import type { SamvaWebhookEvent } from "./events.js";
import { samvaScheme } from "./scheme.js";

function arrayBufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= (a.charCodeAt(i) ?? 0) ^ (b.charCodeAt(i) ?? 0);
  }
  return diff === 0;
}

export async function verify(opts: {
  payload: string;
  signature: string;
  secret: string;
  tolerance?: number;
}): Promise<SamvaWebhookEvent> {
  const { signature: providedHex } = samvaScheme.parseHeader(opts.signature ?? "");
  if (!opts.signature || !providedHex) {
    throw new MissingSignatureError();
  }

  const enc = new TextEncoder();
  const material = samvaScheme.signedMaterial(opts.payload);
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(opts.secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(material));
  const computedHex = arrayBufferToHex(mac);

  if (!constantTimeEqual(computedHex, providedHex.toLowerCase())) {
    throw new SignatureMismatchError();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(opts.payload);
  } catch {
    throw new MalformedPayloadError("Webhook payload is not valid JSON");
  }
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    typeof (parsed as Record<string, unknown>)["event"] !== "string" ||
    typeof (parsed as Record<string, unknown>)["messageId"] !== "string"
  ) {
    throw new MalformedPayloadError("Webhook payload missing required fields");
  }
  const event = parsed as SamvaWebhookEvent;

  if (opts.tolerance !== undefined && Number.isFinite(opts.tolerance)) {
    const ts = (parsed as Record<string, unknown>)["timestamp"];
    if (typeof ts === "string") {
      const parsedTs = Date.parse(ts);
      if (!Number.isNaN(parsedTs)) {
        const ageSeconds = Math.abs(Date.now() - parsedTs) / 1000;
        if (ageSeconds > opts.tolerance) {
          throw new TimestampToleranceError(
            `Webhook timestamp is ${ageSeconds.toFixed(0)}s old (tolerance: ${opts.tolerance}s)`,
          );
        }
      }
    }
  }

  return event;
}

export async function safeVerify(opts: {
  payload: string;
  signature: string;
  secret: string;
  tolerance?: number;
}): Promise<{ verified: true; event: SamvaWebhookEvent } | { verified: false; reason: string }> {
  try {
    const event = await verify(opts);
    return { verified: true, event };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { verified: false, reason };
  }
}
