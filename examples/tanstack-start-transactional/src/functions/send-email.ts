import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getSamva } from "~/lib/samva";

const sendEmailInput = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(1),
});

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const sendEmail = createServerFn({ method: "POST" })
  .validator(sendEmailInput)
  .handler(async ({ data }) => {
    const html = `<p>${escapeHtml(data.message).replaceAll("\n", "<br />")}</p>`;
    const samva = getSamva();

    await samva.messages.send({
      to: [{ email: data.to }],
      channel: "email",
      email: {
        subject: data.subject,
        html,
        text: data.message,
      },
    });

    return { ok: true };
  });
