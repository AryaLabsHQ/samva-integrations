import { describe, expect, expectTypeOf, it } from "vitest";

import {
  renderAndSend,
  renderTemplate,
  samvaEmail,
  type SamvaClient,
  withSamva,
} from "../src/index";

const user = { id: "user_123", email: "ada@example.com", name: "Ada" };

function fakeClient() {
  const calls: Array<Parameters<SamvaClient["messages"]["send"]>[0]> = [];
  const client = {
    messages: {
      send: async (input: Parameters<SamvaClient["messages"]["send"]>[0]) => {
        calls.push(input);
        return { id: "msg_123" };
      },
    },
  } satisfies SamvaClient;

  return { client, calls };
}

describe("@samva/better-auth", () => {
  it("renders default templates and sends through the Samva messages API", async () => {
    const { client, calls } = fakeClient();

    await renderAndSend(
      "verification",
      { user, url: "https://app.example.com/verify?token=abc", token: "abc" },
      { client },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      to: [{ email: "ada@example.com" }],
      channel: "email",
      email: {
        subject: "Verify your email",
      },
    });
    expect(calls[0]?.email.html).toContain("https://app.example.com/verify?token=abc");
  });

  it("uses trigger templates and sends change-email confirmations to the new address", async () => {
    const { client, calls } = fakeClient();

    await renderAndSend(
      "changeEmail",
      {
        user,
        newEmail: "new@example.com",
        url: "https://app.example.com/change?token=abc",
        token: "abc",
      },
      {
        client,
        templates: {
          changeEmail: ({ newEmail }) => ({
            subject: "Confirm address",
            html: `<p>${newEmail}</p>`,
            text: newEmail,
          }),
        },
      },
    );

    expect(calls[0]?.to).toEqual([{ email: "new@example.com" }]);
    expect(calls[0]?.email).toEqual({
      subject: "Confirm address",
      html: "<p>new@example.com</p>",
      text: "new@example.com",
    });
  });

  it("exposes callback fragments for every Better Auth email trigger", async () => {
    const { client, calls } = fakeClient();
    const fragments = samvaEmail({ client, appUrl: "https://app.example.com" });

    await fragments.emailVerification.sendVerificationEmail({
      user,
      url: "https://app.example.com/verify",
      token: "v",
    });
    await fragments.emailAndPassword.sendResetPassword({
      user,
      url: "https://app.example.com/reset",
      token: "r",
    });
    await fragments.user.changeEmail.sendChangeEmailConfirmation({
      user,
      newEmail: "new@example.com",
      url: "https://app.example.com/change",
      token: "c",
    });
    await fragments.user.deleteUser.sendDeleteAccountVerification({
      user,
      url: "https://app.example.com/delete",
      token: "d",
    });
    await fragments.plugins.emailOTP.sendVerificationOTP({
      email: "otp@example.com",
      otp: "123456",
      type: "sign-in",
    });
    await fragments.plugins.twoFactor.otpOptions.sendOTP({ user, otp: "654321" });
    await fragments.plugins.magicLink.sendMagicLink({
      email: "magic@example.com",
      url: "https://app.example.com/magic",
      token: "m",
    });
    await fragments.plugins.organization.sendInvitationEmail({
      id: "inv_123",
      role: "member",
      email: "invite@example.com",
      organization: { name: "Acme" },
      invitation: {},
      inviter: { user },
    });

    expect(calls.map((call) => call.to[0]?.email)).toEqual([
      "ada@example.com",
      "ada@example.com",
      "new@example.com",
      "ada@example.com",
      "otp@example.com",
      "ada@example.com",
      "magic@example.com",
      "invite@example.com",
    ]);
    expect(calls.at(-1)?.email.html).toContain(
      "https://app.example.com/organization/accept-invitation?id=inv_123",
    );
  });

  it("adds enabled Better Auth plugins without clobbering existing callbacks", () => {
    const existingVerification = async () => {};
    const options = withSamva(
      {
        emailVerification: {
          sendVerificationEmail: existingVerification,
        },
        user: {
          changeEmail: { enabled: true },
          deleteUser: { enabled: true },
        },
        plugins: [{ id: "existing" }],
      },
      {
        client: fakeClient().client,
        plugins: {
          emailOTP: true,
          magicLink: { disableSignUp: true },
          organization: true,
          twoFactor: true,
        },
      },
    );

    expect(options.emailVerification?.sendVerificationEmail).toBe(existingVerification);
    expect(options.emailAndPassword?.sendResetPassword).toBeTypeOf("function");
    expect(options.user?.changeEmail?.sendChangeEmailConfirmation).toBeTypeOf("function");
    expect(options.user?.deleteUser?.sendDeleteAccountVerification).toBeTypeOf("function");
    expect(options.plugins).toHaveLength(5);
  });

  it("supports plain string template output", async () => {
    const rendered = await renderTemplate(
      "emailOtp",
      { email: "ada@example.com", otp: "123456", type: "sign-in" },
      {
        emailOtp: ({ otp }) => `<p>${otp}</p>`,
      },
    );

    expect(rendered).toEqual({
      subject: "Your verification code",
      html: "<p>123456</p>",
    });
  });

  it("requires appUrl for the default organization invitation template", async () => {
    await expect(
      renderTemplate(
        "organizationInvitation",
        {
          id: "inv_123",
          role: "member",
          email: "invite@example.com",
          organization: { name: "Acme" },
          invitation: {},
          inviter: { user },
        },
        undefined,
      ),
    ).rejects.toThrow("Set appUrl");
  });

  it("keeps the transformer return type assignable to the input config", () => {
    const config = {
      emailAndPassword: { enabled: true },
    };
    const transformed = withSamva(config, { client: fakeClient().client });

    expectTypeOf(transformed).toMatchTypeOf(config);
  });

  it("fails loudly when the recipient email is empty", async () => {
    await expect(
      renderAndSend(
        "magicLink",
        { email: " ", url: "https://app.example.com/magic", token: "m" },
        { client: fakeClient().client },
      ),
    ).rejects.toThrow("recipient email");
  });
});
