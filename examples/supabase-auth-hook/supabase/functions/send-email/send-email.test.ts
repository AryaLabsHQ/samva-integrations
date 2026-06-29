import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { dispatchSupabaseAuthEmail, renderForAction } from "./dispatch.tsx";
import { createSendEmailHookHandler } from "./handler.ts";
import type { HookEnv, SamvaClient, SendEmailHookPayload, SendEmailInput } from "./types.ts";
import { buildVerifyURL, deliveryTargetsForEmailData } from "./verify-url.ts";
import { verifySupabaseSendEmailHook, normalizeSupabaseWebhookSecret } from "./verify.ts";

const rawSecret = "supabase-send-email-hook-secret";
const base64Secret = Buffer.from(rawSecret).toString("base64");
const env: HookEnv = {
  SEND_EMAIL_HOOK_SECRET: `v1,whsec_${base64Secret}`,
  SUPABASE_PROJECT_REF: "project-ref",
  SAMVA_API_KEY: "sk_sm_test",
};

function fixture(name: string): SendEmailHookPayload {
  return JSON.parse(
    readFileSync(new URL(`./__fixtures__/${name}.json`, import.meta.url), "utf8"),
  ) as SendEmailHookPayload;
}

function signedRequest(
  payload: SendEmailHookPayload,
  init?: { timestamp?: number; secret?: string },
) {
  const body = JSON.stringify(payload);
  const id = "msg_test";
  const timestamp = String(init?.timestamp ?? Math.floor(Date.now() / 1000));
  const secret = init?.secret ?? base64Secret;
  const signature = createHmac("sha256", Buffer.from(secret, "base64"))
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");

  return new Request("https://example.com/send-email", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "webhook-id": id,
      "webhook-signature": `v1,${signature}`,
      "webhook-timestamp": timestamp,
    },
  });
}

function fakeClient() {
  const calls: SendEmailInput[] = [];
  const send = vi.fn(async (input: SendEmailInput) => {
    calls.push(input);
    return { id: "msg_123" };
  });
  const client = { messages: { send } } satisfies SamvaClient;
  return { calls, client, send };
}

describe("Supabase Auth Send Email Hook example", () => {
  it("builds verify URLs with token_hash, type, and redirect_to", () => {
    const url = buildVerifyURL(
      {
        tokenHash: "hashed-token",
        type: "signup",
        redirectTo: "https://app.example.com/welcome",
        siteURL: "https://app.example.com",
      },
      env,
    );

    expect(url).toBe(
      "https://project-ref.supabase.co/auth/v1/verify?token=hashed-token&type=signup&redirect_to=https%3A%2F%2Fapp.example.com%2Fwelcome",
    );
  });

  it("falls back to site_url when redirect_to is empty", () => {
    const url = buildVerifyURL(
      {
        tokenHash: "hashed-token",
        type: "magiclink",
        redirectTo: "",
        siteURL: "https://app.example.com",
      },
      env,
    );

    expect(url).toContain("redirect_to=https%3A%2F%2Fapp.example.com");
  });

  it("normalizes Supabase v1 whsec secrets before verification", () => {
    expect(normalizeSupabaseWebhookSecret(`v1,whsec_${base64Secret}`)).toBe(base64Secret);
    expect(normalizeSupabaseWebhookSecret(`whsec_${base64Secret}`)).toBe(base64Secret);
  });

  it("verifies a signed raw request body", async () => {
    await expect(
      verifySupabaseSendEmailHook(signedRequest(fixture("signup")), env),
    ).resolves.toEqual(fixture("signup"));
  });

  it("rejects tampered bodies, wrong secrets, and expired timestamps", async () => {
    const payload = fixture("signup");
    await expect(
      verifySupabaseSendEmailHook(
        new Request("https://example.com/send-email", {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            user: { ...payload.user, email: "tampered@example.com" },
          }),
          headers: signedRequest(payload).headers,
        }),
        env,
      ),
    ).rejects.toThrow();

    await expect(
      verifySupabaseSendEmailHook(
        signedRequest(payload, { secret: Buffer.from("wrong-secret").toString("base64") }),
        env,
      ),
    ).rejects.toThrow();

    await expect(
      verifySupabaseSendEmailHook(
        signedRequest(payload, { timestamp: Math.floor(Date.now() / 1000) - 10 * 60 }),
        env,
      ),
    ).rejects.toThrow();
  });

  it.each([
    ["signup", "Confirm your email", "ada@example.com"],
    ["invite", "You're invited", "invitee@example.com"],
    ["magiclink", "Your magic link", "magic@example.com"],
    ["recovery", "Reset your password", "recover@example.com"],
    ["email_change", "Confirm email change", "new@example.com"],
    ["reauthentication", "Confirm it's you", "reauth@example.com"],
  ])("dispatches %s emails through Samva without from", async (name, subject, recipient) => {
    const { calls, client } = fakeClient();
    await dispatchSupabaseAuthEmail(fixture(name), client, env);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      to: [{ email: recipient }],
      channel: "email",
      email: { subject },
    });
    expect(calls[0]).not.toHaveProperty("from");
    expect(calls[0]?.email.html).toContain(
      name === "reauthentication" ? "666666" : "project-ref.supabase.co",
    );
    expect(calls[0]?.email.text).not.toBe("");
  });

  it("sends both secure email-change confirmations with the documented token/hash pairs", async () => {
    const { calls, client } = fakeClient();
    await dispatchSupabaseAuthEmail(fixture("email_change_secure"), client, env);

    expect(calls.map((call) => call.to[0]?.email)).toEqual([
      "current@example.com",
      "updated@example.com",
    ]);
    expect(calls[0]?.email.html).toContain("current-email-token-hash");
    expect(calls[0]?.email.html).toContain("123456");
    expect(calls[1]?.email.html).toContain("new-email-token-hash");
    expect(calls[1]?.email.html).toContain("654321");
  });

  it("renders email_change with a link and OTP, and reauthentication with OTP only", async () => {
    const emailChange = fixture("email_change");
    const [emailChangeTarget] = deliveryTargetsForEmailData(
      emailChange.user,
      emailChange.email_data,
      env,
    );
    const emailChangeRendered = await renderForAction(
      emailChange.email_data,
      emailChange.user,
      emailChangeTarget!,
    );

    expect(emailChangeRendered.html).toContain("email-change-token-hash");
    expect(emailChangeRendered.html).toContain("555555");

    const reauth = fixture("reauthentication");
    const [reauthTarget] = deliveryTargetsForEmailData(reauth.user, reauth.email_data, env);
    const reauthRendered = await renderForAction(reauth.email_data, reauth.user, reauthTarget!);

    expect(reauthRendered.html).toContain("666666");
    expect(reauthRendered.html).not.toContain("/auth/v1/verify");
  });

  it("returns 200 empty on success and 401 without sending on bad signatures", async () => {
    const { calls, client } = fakeClient();
    const handler = createSendEmailHookHandler({ client, env });

    const success = await handler(signedRequest(fixture("signup")));
    expect(success.status).toBe(200);
    expect(await success.text()).toBe("");
    expect(calls).toHaveLength(1);

    const invalid = await handler(
      signedRequest(fixture("signup"), { secret: Buffer.from("wrong-secret").toString("base64") }),
    );
    expect(invalid.status).toBe(401);
    expect(calls).toHaveLength(1);
  });

  it("returns 500 when the webhook signing secret is not configured", async () => {
    const { calls, client } = fakeClient();
    const handler = createSendEmailHookHandler({
      client,
      env: { ...env, SEND_EMAIL_HOOK_SECRET: "" },
    });

    const response = await handler(signedRequest(fixture("signup")));

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("missing webhook secret");
    expect(calls).toHaveLength(0);
  });

  it("fails loudly for unsupported email_action_type values", async () => {
    const { calls, client } = fakeClient();

    await expect(dispatchSupabaseAuthEmail(fixture("unsupported"), client, env)).rejects.toThrow(
      "Unhandled email_action_type: password_changed_notification",
    );
    expect(calls).toHaveLength(0);
  });

  it("returns non-200 on send failures", async () => {
    const client = {
      messages: {
        send: vi.fn(async () => {
          throw new Error("Samva send failed");
        }),
      },
    } satisfies SamvaClient;
    const handler = createSendEmailHookHandler({ client, env });

    const response = await handler(signedRequest(fixture("signup")));
    expect(response.status).toBe(500);
  });
});
