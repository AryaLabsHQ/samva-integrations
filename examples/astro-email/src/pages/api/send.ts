import type { APIRoute } from "astro";
import { z } from "astro/zod";

import { escapeHtml } from "../../lib/html";
import { samva } from "../../lib/samva";

export const prerender = false;

const emailInput = z.email();

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON request body." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("email" in body) ||
    !("subject" in body) ||
    !("message" in body) ||
    typeof body.email !== "string" ||
    typeof body.subject !== "string" ||
    typeof body.message !== "string" ||
    !emailInput.safeParse(body.email).success ||
    body.email.length === 0 ||
    body.subject.length === 0 ||
    body.message.length === 0
  ) {
    return Response.json(
      { error: "email, subject, and message are required string fields." },
      { status: 400 },
    );
  }

  try {
    await samva.messages.send({
      to: [{ email: body.email }],
      channel: "email",
      email: {
        subject: body.subject,
        html: `<p>${escapeHtml(body.message).replaceAll("\n", "<br />")}</p>`,
        text: body.message,
      },
    });
  } catch {
    return Response.json({ error: "Failed to send email." }, { status: 502 });
  }

  return Response.json({ ok: true });
};
