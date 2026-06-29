import { buildContactEmail } from "../../../lib/contact-email";
import { samva } from "../../../lib/samva";

export const runtime = "edge";

interface SendRequestBody {
  readonly name?: unknown;
  readonly email?: unknown;
  readonly message?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body)) {
    return Response.json({ ok: false, error: "Expected a JSON object." }, { status: 400 });
  }

  const { name, email, message } = body as SendRequestBody;
  const recipientEmail = readString(email);
  const text = readString(message);

  if (!recipientEmail || !text) {
    return Response.json({ ok: false, error: "email and message are required." }, { status: 400 });
  }

  const senderName = readString(name);
  const contact = {
    email: recipientEmail,
    message: text,
    ...(senderName ? { name: senderName } : {}),
  };

  const result = await samva.messages.send({
    to: [{ email: recipientEmail }],
    channel: "email",
    email: buildContactEmail(contact),
  });

  return Response.json({ ok: true, result });
}
