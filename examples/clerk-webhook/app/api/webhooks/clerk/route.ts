import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { render, toPlainText } from "@react-email/render";
import type { NextRequest } from "next/server";

import WelcomeEmail from "../../../../emails/welcome";
import { samva } from "../../../../lib/samva";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  let event: Awaited<ReturnType<typeof verifyWebhook>>;

  try {
    event = await verifyWebhook(request);
  } catch {
    return new Response("Verification failed", { status: 400 });
  }

  switch (event.type) {
    case "user.created": {
      const email =
        event.data.email_addresses.find(
          (address) => address.id === event.data.primary_email_address_id,
        )?.email_address ?? event.data.email_addresses[0]?.email_address;

      if (!email) {
        break;
      }

      const html = await render(
        WelcomeEmail(event.data.first_name ? { firstName: event.data.first_name } : {}),
      );

      await samva.messages.send({
        to: [{ email }],
        channel: "email",
        email: {
          subject: "Welcome",
          html,
          text: toPlainText(html),
        },
      });

      break;
    }

    case "email.created": {
      // Custom-delivery mode: turn off "Delivered by Clerk" for a Clerk email template.
      // Clerk still renders the auth email, then Samva delivers it from your verified sender.
      const to = event.data.to_email_address;
      const html = event.data.body ?? undefined;
      const text = event.data.body_plain ?? undefined;

      if (!to || (!html && !text)) {
        break;
      }

      await samva.messages.send({
        to: [{ email: to }],
        channel: "email",
        email: {
          subject: event.data.subject ?? "Clerk email",
          html,
          text,
        },
      });

      // To render your own template instead, branch on event.data.slug and inspect
      // event.data.data from a first live event. Clerk documents otp_code for verification email.
      break;
    }
  }

  return new Response("OK", { status: 200 });
}
