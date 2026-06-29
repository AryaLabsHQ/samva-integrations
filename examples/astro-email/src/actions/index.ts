import { z } from "astro/zod";
import { ActionError, defineAction } from "astro:actions";

import { samva } from "../lib/samva";

const contactInput = z.object({
  email: z.email(),
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

export const server = {
  send: defineAction({
    accept: "form",
    input: contactInput,
    handler: async ({ email, message, subject }) => {
      try {
        await samva.messages.send({
          to: [{ email }],
          channel: "email",
          email: {
            subject,
            html: `<p>${escapeHtml(message).replaceAll("\n", "<br />")}</p>`,
            text: message,
          },
        });
      } catch {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send email.",
        });
      }

      return { ok: true };
    },
  }),
};
