import { readFile } from "node:fs/promises";
import type { IncomingMessage } from "node:http";
import { join } from "node:path";
import { Readable } from "node:stream";

import { describe, expect, it } from "vitest";

import { MissingSignatureError, SignatureMismatchError, verifyRequest } from "../src/index.js";
import { verifyNodeRequest } from "../src/node.js";

interface Fixture {
  secret: string;
  body: string;
  signature: string;
  event?: string;
  messageId?: string;
}

async function loadValidFixture(): Promise<Fixture> {
  const content = await readFile(
    join(import.meta.dirname, "fixtures", "valid-message-delivered.json"),
    "utf8",
  );
  return JSON.parse(content) as Fixture;
}

function nodeRequest(body: string, signature?: string): IncomingMessage & { rawBody?: string } {
  const req = Readable.from([body]) as IncomingMessage & { rawBody?: string };
  req.headers = signature === undefined ? {} : { "x-webhook-signature": signature };
  return req;
}

describe("verifyRequest", () => {
  it("verifies a Web API Request", async () => {
    const fixture = await loadValidFixture();
    const req = new Request("https://example.com/webhooks/samva", {
      method: "POST",
      body: fixture.body,
      headers: { "x-webhook-signature": fixture.signature },
    });

    const event = await verifyRequest(req, fixture.secret);
    expect(event.event).toBe(fixture.event);
    expect(event.messageId).toBe(fixture.messageId);
  });

  it("rejects a tampered Web API Request body", async () => {
    const fixture = await loadValidFixture();
    const req = new Request("https://example.com/webhooks/samva", {
      method: "POST",
      body: fixture.body.replace("delivered", "bounced"),
      headers: { "x-webhook-signature": fixture.signature },
    });

    await expect(verifyRequest(req, fixture.secret)).rejects.toThrow(SignatureMismatchError);
  });

  it("rejects a missing Web API Request signature", async () => {
    const fixture = await loadValidFixture();
    const req = new Request("https://example.com/webhooks/samva", {
      method: "POST",
      body: fixture.body,
    });

    await expect(verifyRequest(req, fixture.secret)).rejects.toThrow(MissingSignatureError);
  });
});

describe("verifyNodeRequest", () => {
  it("verifies a Node IncomingMessage stream", async () => {
    const fixture = await loadValidFixture();
    const event = await verifyNodeRequest(
      nodeRequest(fixture.body, fixture.signature),
      fixture.secret,
    );
    expect(event.event).toBe(fixture.event);
    expect(event.messageId).toBe(fixture.messageId);
  });

  it("rejects a missing Node IncomingMessage signature", async () => {
    const fixture = await loadValidFixture();
    await expect(verifyNodeRequest(nodeRequest(fixture.body), fixture.secret)).rejects.toThrow(
      MissingSignatureError,
    );
  });

  it("verifies a Node request rawBody string", async () => {
    const fixture = await loadValidFixture();
    const req = nodeRequest("", fixture.signature);
    req.rawBody = fixture.body;

    const event = await verifyNodeRequest(req, fixture.secret);
    expect(event.event).toBe(fixture.event);
    expect(event.messageId).toBe(fixture.messageId);
  });
});
