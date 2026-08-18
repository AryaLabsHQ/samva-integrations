import {
  createEmailClient,
  EmailAbortError,
  EmailAdapterError,
  EmailValidationError,
} from "@opencoredev/email-sdk";
import type { EmailAdapterContext, EmailMessage } from "@opencoredev/email-sdk";
import type { SamvaClient } from "samva";
import { describe, expect, it, vi } from "vitest";

import { samva, samvaPlugin } from "../src";

const message: EmailMessage = {
  from: "Samva <hello@samva.dev>",
  to: ["Ada <ada@example.com>", { email: "linus@example.com", name: "Linus" }],
  cc: "cc@example.com",
  bcc: { email: "bcc@example.com" },
  replyTo: ["reply@example.com", { email: "help@example.com" }],
  subject: "Welcome",
  html: "<p>Hello</p>",
  text: "Hello",
  metadata: { tenant: "arya", attempt: 2, active: true, empty: null },
  attachments: [{ filename: "hello.txt", content: "hello", contentType: "text/plain" }],
};

const context: EmailAdapterContext = {
  adapter: "samva",
  operation: "send",
  attempt: 1,
};

function injectedClient(
  send: (payload: unknown, options?: { signal?: AbortSignal }) => Promise<unknown>,
): SamvaClient {
  return { email: { send } } as unknown as SamvaClient;
}

describe("samva", () => {
  it("declares the exact community adapter capabilities", () => {
    const adapter = samva({ client: injectedClient(async () => ({ id: "message_1" })) });

    expect(adapter.name).toBe("samva");
    expect(adapter.capabilities).toEqual({
      repeatedHeaders: false,
      idempotency: "none",
      scheduling: false,
      personalized: "expanded",
    });
    expect(adapter.sendPersonalized).toBeUndefined();
  });

  it("maps supported fields exactly and normalizes the result", async () => {
    const raw = { id: "message_1", status: "queued", recipients: [{ status: "queued" }] };
    const send = vi.fn(async (_payload: unknown, _options?: { signal?: AbortSignal }) => raw);
    const adapter = samva({ client: injectedClient(send) });

    await expect(adapter.send(message, context)).resolves.toEqual({
      adapter: "samva",
      id: "message_1",
      raw,
    });
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0]![0]).toEqual({
      from: { email: "hello@samva.dev", name: "Samva" },
      to: [
        { email: "ada@example.com", name: "Ada" },
        { email: "linus@example.com", name: "Linus" },
      ],
      cc: [{ email: "cc@example.com" }],
      bcc: [{ email: "bcc@example.com" }],
      replyTo: ["reply@example.com", "help@example.com"],
      subject: "Welcome",
      html: "<p>Hello</p>",
      text: "Hello",
      metadata: { tenant: "arya", attempt: 2, active: true, empty: null },
      attachments: [
        {
          filename: "hello.txt",
          content: "aGVsbG8=",
          contentType: "text/plain",
          size: 5,
        },
      ],
    });
  });

  it.each([
    ["headers", { headers: [{ name: "X-Test", value: "yes" }] }],
    ["tags", { tags: [{ name: "kind", value: "welcome" }] }],
    ["sendAt", { sendAt: new Date("2026-08-18T00:00:00Z") }],
    ["path", { attachments: [{ filename: "x", path: "/tmp/x", contentType: "text/plain" }] }],
    [
      "contentId",
      {
        attachments: [{ filename: "x", content: "x", contentType: "text/plain", contentId: "cid" }],
      },
    ],
    [
      "disposition",
      {
        attachments: [
          { filename: "x", content: "x", contentType: "text/plain", disposition: "inline" },
        ],
      },
    ],
    ["contentType", { attachments: [{ filename: "x", content: "x" }] }],
    ["replyTo", { replyTo: "Support <support@example.com>" }],
    ["to", { to: "Ada <broken>" }],
  ])("rejects unsupported or lossy %s before calling Samva", async (_field, update) => {
    const send = vi.fn(async (_payload: unknown, _options?: { signal?: AbortSignal }) => ({
      id: "message_1",
    }));
    const adapter = samva({ client: injectedClient(send) });

    await expect(
      adapter.send({ ...message, ...update } as EmailMessage, context),
    ).rejects.toBeInstanceOf(EmailValidationError);
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects idempotency keys before calling Samva", async () => {
    const send = vi.fn(async (_payload: unknown, _options?: { signal?: AbortSignal }) => ({
      id: "message_1",
    }));
    const adapter = samva({ client: injectedClient(send) });

    await expect(
      adapter.send(message, { ...context, idempotencyKey: "dedupe" }),
    ).rejects.toBeInstanceOf(EmailValidationError);
    expect(send).not.toHaveBeenCalled();
  });

  it("forwards the AbortSignal and preserves Email SDK abort semantics", async () => {
    const controller = new AbortController();
    const send = vi.fn(async (_payload: unknown, options?: { signal?: AbortSignal }) => {
      await new Promise<void>((_resolve, reject) => {
        options?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("aborted", "AbortError")),
          { once: true },
        );
      });
      return { id: "unreachable" };
    });
    const client = createEmailClient({
      adapters: [samva({ client: injectedClient(send) })],
      telemetry: false,
    });

    const sending = client.send(message, { signal: controller.signal });
    await vi.waitFor(() => expect(send).toHaveBeenCalledOnce());
    controller.abort("stop");
    await expect(sending).rejects.toBeInstanceOf(EmailAbortError);
    expect(send.mock.calls[0]![1]?.signal).toBe(controller.signal);
  });

  it("normalizes unknown failures conservatively", async () => {
    const adapter = samva({
      client: injectedClient(async () => {
        throw new Error("secret provider body");
      }),
    });

    const error = await Promise.resolve(adapter.send(message, context)).catch(
      (failure: unknown) => failure,
    );
    expect(error).toBeInstanceOf(EmailAdapterError);
    expect(error).toMatchObject({
      adapter: "samva",
      retryable: false,
      delivery: "unknown",
      message: "Samva email send failed.",
    });
    expect(String(error)).not.toContain("secret provider body");
  });

  it("registers one adapter through samvaPlugin and requires credentials otherwise", () => {
    const plugin = samvaPlugin({ client: injectedClient(async () => ({ id: "message_1" })) });
    expect(plugin).toMatchObject({ id: "samva" });
    expect(plugin.adapters).toHaveLength(1);
    expect(Array.isArray(plugin.adapters) && plugin.adapters[0]?.name).toBe("samva");
    expect(() => samva({})).toThrow(EmailValidationError);
  });
});
