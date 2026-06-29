import type {
  SamvaEmailDataByTrigger,
  SamvaEmailTrigger,
  SamvaRenderedEmail,
  SamvaTemplate,
  SamvaTemplateOutput,
  SamvaTemplates,
} from "./types";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const linkEmail = (subject: string, text: string, url: string): SamvaRenderedEmail => ({
  subject,
  html: `<p>${escapeHtml(text)}</p><p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>`,
  text: `${text}\n\n${url}`,
});

export const defaultSubjects = {
  verification: "Verify your email",
  resetPassword: "Reset your password",
  changeEmail: "Confirm your new email",
  deleteAccount: "Confirm account deletion",
  emailOtp: "Your verification code",
  twoFactorOtp: "Your two-factor code",
  magicLink: "Sign in to your account",
  organizationInvitation: "You were invited to an organization",
} satisfies Record<SamvaEmailTrigger, string>;

export const defaultTemplates = {
  verification: ({ url }: SamvaEmailDataByTrigger["verification"]) =>
    linkEmail(defaultSubjects.verification, "Verify your email address.", url),
  resetPassword: ({ url }: SamvaEmailDataByTrigger["resetPassword"]) =>
    linkEmail(defaultSubjects.resetPassword, "Reset your password.", url),
  changeEmail: ({ newEmail, url }: SamvaEmailDataByTrigger["changeEmail"]) =>
    linkEmail(defaultSubjects.changeEmail, `Confirm ${newEmail} as your new email address.`, url),
  deleteAccount: ({ url }: SamvaEmailDataByTrigger["deleteAccount"]) =>
    linkEmail(defaultSubjects.deleteAccount, "Confirm that you want to delete your account.", url),
  emailOtp: ({ otp, type }: SamvaEmailDataByTrigger["emailOtp"]) => ({
    subject: defaultSubjects.emailOtp,
    html: `<p>Your ${escapeHtml(type)} code is <strong>${escapeHtml(otp)}</strong>.</p>`,
    text: `Your ${type} code is ${otp}.`,
  }),
  twoFactorOtp: ({ otp }: SamvaEmailDataByTrigger["twoFactorOtp"]) => ({
    subject: defaultSubjects.twoFactorOtp,
    html: `<p>Your two-factor code is <strong>${escapeHtml(otp)}</strong>.</p>`,
    text: `Your two-factor code is ${otp}.`,
  }),
  magicLink: ({ url }: SamvaEmailDataByTrigger["magicLink"]) =>
    linkEmail(defaultSubjects.magicLink, "Use this magic link to sign in.", url),
  organizationInvitation: ({
    id,
    organization,
  }: SamvaEmailDataByTrigger["organizationInvitation"]) => {
    const orgName = organization.name || organization.slug || "the organization";
    const url = `/organization/accept-invitation?id=${encodeURIComponent(id)}`;
    return linkEmail(
      defaultSubjects.organizationInvitation,
      `Accept your invitation to ${orgName}.`,
      url,
    );
  },
} satisfies {
  readonly [Trigger in SamvaEmailTrigger]: SamvaTemplate<Trigger>;
};

function hasHtml(
  value: unknown,
): value is { readonly subject?: string; readonly html: string; readonly text?: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "html" in value &&
    typeof (value as { html?: unknown }).html === "string"
  );
}

async function renderReactEmail(value: unknown): Promise<{ html: string; text?: string }> {
  try {
    const renderer = await import("@react-email/render");
    const html = await renderer.render(value as never);
    return {
      html,
      text: renderer.toPlainText(html),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Install @react-email/render to use React Email templates with @samva/better-auth: ${message}`,
      { cause: error },
    );
  }
}

export async function renderTemplate<Trigger extends SamvaEmailTrigger>(
  trigger: Trigger,
  data: SamvaEmailDataByTrigger[Trigger],
  templates: SamvaTemplates | undefined,
): Promise<SamvaRenderedEmail> {
  const template = (templates?.[trigger] ?? defaultTemplates[trigger]) as SamvaTemplate<Trigger>;
  const output = await template(data);

  if (typeof output === "string") {
    return {
      subject: defaultSubjects[trigger],
      html: output,
    };
  }

  if (hasHtml(output)) {
    return {
      subject: output.subject ?? defaultSubjects[trigger],
      html: output.html,
      ...(output.text ? { text: output.text } : {}),
    };
  }

  const rendered = await renderReactEmail(output as SamvaTemplateOutput);
  return {
    subject: defaultSubjects[trigger],
    ...rendered,
  };
}
