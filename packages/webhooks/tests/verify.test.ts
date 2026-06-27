import { createHmac } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  MalformedPayloadError,
  MissingSignatureError,
  safeVerify,
  SignatureMismatchError,
  TimestampToleranceError,
  verify,
  WebhookVerificationError,
} from "../src/index.js";

interface Fixture {
  description: string;
  secret: string;
  body: string;
  signature: string;
  expect: "pass" | "error";
  errorType?: keyof typeof errorClasses;
  event?: string;
  messageId?: string;
}

const fixtureDir = join(import.meta.dirname, "fixtures");
const errorClasses = {
  MalformedPayloadError,
  MissingSignatureError,
  SignatureMismatchError,
  TimestampToleranceError,
};

async function loadFixtures(): Promise<Fixture[]> {
  const files = (await readdir(fixtureDir)).filter((file) => file.endsWith(".json")).sort();

  return Promise.all(
    files.map(async (file) => {
      const content = await readFile(join(fixtureDir, file), "utf8");
      return JSON.parse(content) as Fixture;
    }),
  );
}

function sign(body: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

describe("verify", () => {
  it("verifies passing fixtures and rejects error fixtures with typed errors", async () => {
    const fixtures = await loadFixtures();

    await Promise.all(
      fixtures.map(async (fixture) => {
        if (fixture.expect === "pass") {
          const event = await verify({
            payload: fixture.body,
            signature: fixture.signature,
            secret: fixture.secret,
          });
          const parsedBody = JSON.parse(fixture.body) as { data: Record<string, unknown> };
          expect(event.event).toBe(fixture.event);
          expect(event.messageId).toBe(fixture.messageId);
          expect(event.data).toEqual(parsedBody.data);
        } else {
          expect(fixture.errorType).toBeDefined();
          const ErrorClass = errorClasses[fixture.errorType as keyof typeof errorClasses];
          await expect(
            verify({
              payload: fixture.body,
              signature: fixture.signature,
              secret: fixture.secret,
            }),
          ).rejects.toThrow(ErrorClass);
        }
      }),
    );
  });

  it("safeVerify never throws for pass or error fixtures", async () => {
    const fixtures = await loadFixtures();

    const results = await Promise.all(
      fixtures.map(async (fixture) => {
        const result = await safeVerify({
          payload: fixture.body,
          signature: fixture.signature,
          secret: fixture.secret,
        });
        return { fixture, result };
      }),
    );

    for (const { fixture, result } of results) {
      expect(result.verified).toBe(fixture.expect === "pass");
    }
  });

  it("rejects a JSON-reserialized body with reordered keys and the original signature", async () => {
    const fixtures = await loadFixtures();
    const fixture = fixtures.find((candidate) => candidate.expect === "pass");
    expect(fixture).toBeDefined();
    if (!fixture) return;

    const parsed = JSON.parse(fixture.body) as {
      data: Record<string, unknown>;
      event: string;
      messageId: string;
      timestamp: string;
    };
    const reorderedBody = JSON.stringify({
      messageId: parsed.messageId,
      event: parsed.event,
      timestamp: parsed.timestamp,
      data: parsed.data,
    });

    await expect(
      verify({
        payload: reorderedBody,
        signature: fixture.signature,
        secret: fixture.secret,
      }),
    ).rejects.toThrow(SignatureMismatchError);
  });

  it("checks timestamp tolerance only when requested", async () => {
    const secret = "whsec_test_samva_0123456789abcdef";
    const oldBody = JSON.stringify({
      event: "message.delivered",
      messageId: "msg_old",
      timestamp: new Date(Date.now() - 60 * 60 * 1000 - 1000).toISOString(),
      data: { subject: "Old delivery", recipient: "person@example.com" },
    });
    const oldSignature = sign(oldBody, secret);

    await expect(
      verify({
        payload: oldBody,
        signature: oldSignature,
        secret,
      }),
    ).resolves.toMatchObject({ messageId: "msg_old" });

    await expect(
      verify({
        payload: oldBody,
        signature: oldSignature,
        secret,
        tolerance: 60,
      }),
    ).rejects.toThrow(TimestampToleranceError);

    const freshBody = JSON.stringify({
      event: "message.delivered",
      messageId: "msg_fresh",
      timestamp: new Date().toISOString(),
      data: { subject: "Fresh delivery", recipient: "person@example.com" },
    });
    await expect(
      verify({
        payload: freshBody,
        signature: sign(freshBody, secret),
        secret,
        tolerance: 60,
      }),
    ).resolves.toMatchObject({ messageId: "msg_fresh" });
  });

  it("throws a typed error when the signing secret is missing", async () => {
    const secret = "whsec_test_samva_0123456789abcdef";
    const body = JSON.stringify({
      event: "message.delivered",
      messageId: "msg_secret",
      timestamp: new Date().toISOString(),
      data: {},
    });
    await expect(
      verify({ payload: body, signature: sign(body, secret), secret: "" }),
    ).rejects.toThrow(WebhookVerificationError);
  });

  it("rejects a signed payload missing required fields", async () => {
    const secret = "whsec_test_samva_0123456789abcdef";
    const body = JSON.stringify({ event: "message.delivered", messageId: "msg_partial" });
    await expect(verify({ payload: body, signature: sign(body, secret), secret })).rejects.toThrow(
      MalformedPayloadError,
    );
  });

  it("enforces tolerance even when the timestamp is unparsable", async () => {
    const secret = "whsec_test_samva_0123456789abcdef";
    const body = JSON.stringify({
      event: "message.delivered",
      messageId: "msg_badts",
      timestamp: "not-a-date",
      data: {},
    });
    await expect(
      verify({ payload: body, signature: sign(body, secret), secret, tolerance: 60 }),
    ).rejects.toThrow(TimestampToleranceError);
  });

  it("accepts and returns a webhook with an unknown (future) event type", async () => {
    const secret = "whsec_test_samva_0123456789abcdef";
    const body = JSON.stringify({
      event: "future.event.type",
      messageId: "msg_future",
      timestamp: new Date().toISOString(),
      data: {},
    });
    const event = await verify({ payload: body, signature: sign(body, secret), secret });
    expect(event.event).toBe("future.event.type");
  });

  it("rejects an invalid tolerance value instead of silently skipping the check", async () => {
    const secret = "whsec_test_samva_0123456789abcdef";
    const body = JSON.stringify({
      event: "message.delivered",
      messageId: "msg_badtol",
      timestamp: new Date().toISOString(),
      data: {},
    });
    await expect(
      verify({ payload: body, signature: sign(body, secret), secret, tolerance: Number.NaN }),
    ).rejects.toThrow(WebhookVerificationError);
  });
});
