import { createHmac } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const secret = "whsec_test_samva_0123456789abcdef";
const fixtureDir = import.meta.dirname;

const events = [
  "message.sent",
  "message.delivered",
  "message.read",
  "message.failed",
  "message.bounced",
  "message.received",
  "contact.created",
  "contact.updated",
  "conversation.started",
  "conversation.ended",
  "webhook.test",
] as const;

interface Fixture {
  description: string;
  secret: string;
  body: string;
  signature: string;
  expect: "pass" | "error";
  errorType?: string;
  event?: string;
  messageId?: string;
}

function sign(body: string, signingSecret = secret): string {
  return `sha256=${createHmac("sha256", signingSecret).update(body).digest("hex")}`;
}

function writeFixture(fileName: string, fixture: Fixture): void {
  writeFileSync(join(fixtureDir, fileName), `${JSON.stringify(fixture, null, 2)}\n`);
}

function eventData(event: (typeof events)[number], index: number): Record<string, unknown> {
  if (event.startsWith("message.")) {
    return {
      subject: `Forwarded conversation ${index + 1}`,
      recipient: `person-${index + 1}@example.com`,
      status: event.split(".")[1],
    };
  }
  if (event.startsWith("contact.")) {
    return {
      contactId: `contact_${index + 1}`,
      email: `contact-${index + 1}@example.com`,
      source: "inbox",
    };
  }
  if (event.startsWith("conversation.")) {
    return {
      conversationId: `conversation_${index + 1}`,
      lastMessageAt: "2026-06-25T12:00:00.000Z",
    };
  }
  return {
    ok: true,
    endpoint: "webhook-test",
  };
}

mkdirSync(fixtureDir, { recursive: true });

for (const [index, event] of events.entries()) {
  const messageId = `msg_${String(index + 1).padStart(2, "0")}`;
  const body = JSON.stringify({
    event,
    messageId,
    timestamp: "2026-06-25T12:00:00.000Z",
    data: eventData(event, index),
  });
  writeFixture(`valid-${event.replaceAll(".", "-")}.json`, {
    description: `Valid ${event} webhook`,
    secret,
    body,
    signature: sign(body),
    expect: "pass",
    event,
    messageId,
  });
}

const originalTamperedBody = JSON.stringify({
  event: "message.delivered",
  messageId: "msg_tampered",
  timestamp: "2026-06-25T12:00:00.000Z",
  data: { subject: "Original subject", recipient: "person@example.com", status: "delivered" },
});
writeFixture("tampered-body.json", {
  description: "Body changed after signing",
  secret,
  body: originalTamperedBody.replace("Original", "Changed"),
  signature: sign(originalTamperedBody),
  expect: "error",
  errorType: "SignatureMismatchError",
});

const wrongSecretBody = JSON.stringify({
  event: "message.delivered",
  messageId: "msg_wrong_secret",
  timestamp: "2026-06-25T12:00:00.000Z",
  data: { subject: "Wrong secret", recipient: "person@example.com", status: "delivered" },
});
writeFixture("wrong-secret.json", {
  description: "Signature was created with the wrong signing secret",
  secret,
  body: wrongSecretBody,
  signature: sign(wrongSecretBody, "wrong_secret"),
  expect: "error",
  errorType: "SignatureMismatchError",
});

const missingSignatureBody = JSON.stringify({
  event: "message.delivered",
  messageId: "msg_missing_signature",
  timestamp: "2026-06-25T12:00:00.000Z",
  data: { subject: "Missing signature", recipient: "person@example.com", status: "delivered" },
});
writeFixture("missing-signature.json", {
  description: "No signature header value",
  secret,
  body: missingSignatureBody,
  signature: "",
  expect: "error",
  errorType: "MissingSignatureError",
});

const malformedSignatureBody = JSON.stringify({
  event: "message.delivered",
  messageId: "msg_malformed_signature",
  timestamp: "2026-06-25T12:00:00.000Z",
  data: { subject: "Malformed signature", recipient: "person@example.com", status: "delivered" },
});
writeFixture("malformed-signature.json", {
  description: "Malformed hex signature",
  secret,
  body: malformedSignatureBody,
  signature: "sha256=zzzz",
  expect: "error",
  errorType: "SignatureMismatchError",
});

const malformedPayloadBody = "not json {";
writeFixture("malformed-payload.json", {
  description: "Signature is valid but payload is not JSON",
  secret,
  body: malformedPayloadBody,
  signature: sign(malformedPayloadBody),
  expect: "error",
  errorType: "MalformedPayloadError",
});
