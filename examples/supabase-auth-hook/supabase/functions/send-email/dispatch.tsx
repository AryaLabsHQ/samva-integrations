import { render, toPlainText } from "react-email";

import { ConfirmSignup, EmailChange, Invite, MagicLink, Reauth, Recovery } from "./emails/index.ts";
import type { EmailData, HookEnv, SamvaClient, SendEmailHookPayload, User } from "./types.ts";
import { deliveryTargetsForEmailData, type EmailDeliveryTarget } from "./verify-url.ts";

interface RenderedEmail {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

export async function dispatchSupabaseAuthEmail(
  payload: SendEmailHookPayload,
  client: SamvaClient,
  env: HookEnv,
): Promise<void> {
  const targets = deliveryTargetsForEmailData(payload.user, payload.email_data, env);

  await Promise.all(
    targets.map(async (target) => {
      const rendered = await renderForAction(payload.email_data, payload.user, target);
      await client.messages.send({
        to: [{ email: target.email }],
        channel: "email",
        email: rendered,
      });
    }),
  );
}

export async function renderForAction(
  data: EmailData,
  _user: User,
  target: EmailDeliveryTarget,
): Promise<RenderedEmail> {
  const html = await renderHtmlForAction(data, target);
  return {
    subject: subjectForAction(data.email_action_type),
    html,
    text: toPlainText(html),
  };
}

function subjectForAction(actionType: string): string {
  switch (actionType) {
    case "signup":
      return "Confirm your email";
    case "invite":
      return "You're invited";
    case "magiclink":
      return "Your magic link";
    case "recovery":
      return "Reset your password";
    case "email_change":
      return "Confirm email change";
    case "reauthentication":
      return "Confirm it's you";
    default:
      throw new Error(`Unhandled email_action_type: ${actionType}`);
  }
}

async function renderHtmlForAction(data: EmailData, target: EmailDeliveryTarget): Promise<string> {
  switch (data.email_action_type) {
    case "signup":
      return render(<ConfirmSignup url={requiredURL(target, data.email_action_type)} />);
    case "invite":
      return render(<Invite url={requiredURL(target, data.email_action_type)} />);
    case "magiclink":
      return render(<MagicLink url={requiredURL(target, data.email_action_type)} />);
    case "recovery":
      return render(<Recovery url={requiredURL(target, data.email_action_type)} />);
    case "email_change":
      return render(
        <EmailChange url={requiredURL(target, data.email_action_type)} otp={target.otp ?? ""} />,
      );
    case "reauthentication":
      return render(<Reauth otp={target.otp ?? data.token} />);
    default:
      throw new Error(`Unhandled email_action_type: ${data.email_action_type}`);
  }
}

function requiredURL(target: EmailDeliveryTarget, actionType: string): string {
  if (!target.verifyURL) {
    throw new Error(`Cannot render ${actionType} email without a verify URL.`);
  }
  return target.verifyURL;
}
