"use server";

import { buildContactEmail } from "../../lib/contact-email";
import { samva } from "../../lib/samva";

export interface ContactFormState {
  readonly status: "idle" | "success" | "error";
  readonly message: string;
}

const getField = (formData: FormData, field: string): string =>
  String(formData.get(field) ?? "").trim();

export async function sendContactEmail(
  _state: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const name = getField(formData, "name");
  const email = getField(formData, "email");
  const message = getField(formData, "message");

  if (!email || !message) {
    return { status: "error", message: "Email and message are required." };
  }

  const contact = {
    email,
    message,
    ...(name ? { name } : {}),
  };

  await samva.messages.send({
    to: [{ email }],
    channel: "email",
    email: buildContactEmail(contact),
  });

  return { status: "success", message: "Message accepted by Samva." };
}
