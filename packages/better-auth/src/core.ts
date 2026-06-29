import { renderTemplate } from "./templates";
import {
  createSamvaClient,
  type SamvaBetterAuthOptions,
  type SamvaEmailDataByTrigger,
  type SamvaEmailTrigger,
} from "./types";

function recipientFor<Trigger extends SamvaEmailTrigger>(
  trigger: Trigger,
  data: SamvaEmailDataByTrigger[Trigger],
): string {
  switch (trigger) {
    case "emailOtp":
    case "magicLink":
    case "organizationInvitation":
      return (data as { readonly email: string }).email;
    case "changeEmail":
      return (data as { readonly newEmail: string }).newEmail;
    default:
      return (data as { readonly user: { readonly email: string } }).user.email;
  }
}

export async function renderAndSend<Trigger extends SamvaEmailTrigger>(
  trigger: Trigger,
  data: SamvaEmailDataByTrigger[Trigger],
  options: SamvaBetterAuthOptions,
): Promise<void> {
  const email = recipientFor(trigger, data).trim();
  if (!email) {
    throw new Error(`Cannot send ${trigger} email without a recipient email address.`);
  }

  const rendered = await renderTemplate(trigger, data, options.templates, options.appUrl);
  if (!rendered.html.trim()) {
    throw new Error(`Cannot send ${trigger} email with an empty HTML body.`);
  }

  const client = await createSamvaClient(options);
  await client.messages.send({
    to: [{ email }],
    channel: "email",
    email: rendered,
  });
}
