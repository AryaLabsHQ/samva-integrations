import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { getSamva } from "~/lib/samva";

const sendRouteInput = z
  .object({
    to: z.string().email(),
    subject: z.string().min(1),
    html: z.string().min(1).optional(),
    text: z.string().min(1).optional(),
  })
  .refine((value) => value.html || value.text, {
    message: "html or text is required",
  });

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const Route = createFileRoute("/api/send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sendToken = process.env.SAMVA_SEND_TOKEN;
        if (!sendToken) {
          return Response.json({ error: "Send endpoint token is not configured" }, { status: 500 });
        }

        if (request.headers.get("authorization") !== `Bearer ${sendToken}`) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = await request.json().catch(() => null);
        const parsed = sendRouteInput.safeParse(payload);
        if (!parsed.success) {
          return Response.json({ error: "Invalid send payload" }, { status: 400 });
        }

        const body = parsed.data;
        const text = body.text;
        const html =
          body.html ?? (text ? `<p>${escapeHtml(text).replaceAll("\n", "<br />")}</p>` : undefined);
        const samva = getSamva();

        await samva.messages.send({
          to: [{ email: body.to }],
          channel: "email",
          email: {
            subject: body.subject,
            ...(html ? { html } : {}),
            ...(text ? { text } : {}),
          },
        });

        return Response.json({ ok: true });
      },
    },
  },
});
