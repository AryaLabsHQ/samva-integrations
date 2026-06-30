export interface ContactEmailInput {
  readonly name?: string;
  readonly email: string;
  readonly message: string;
  readonly subject?: string;
}

export const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export function buildContactEmail({ name, email, message, subject }: ContactEmailInput) {
  const displayName = name ? escapeHtml(name) : "there";
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replaceAll("\n", "<br />");

  return {
    subject: subject ?? "Thanks for contacting us",
    html: `<p>Hi ${displayName},</p><p>Thanks for reaching out. We received your message and will reply to ${safeEmail}.</p><blockquote>${safeMessage}</blockquote>`,
    text: `Hi ${name || "there"},\n\nThanks for reaching out. We received your message and will reply to ${email}.\n\n${message}`,
  };
}
