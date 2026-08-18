import { EmailValidationError } from "@opencoredev/email-sdk";
import type { EmailAddress, EmailAttachment, EmailMessage } from "@opencoredev/email-sdk";
import type { SamvaClient } from "samva";

type SamvaSendInput = Parameters<SamvaClient["email"]["send"]>[0];
type SamvaSender = NonNullable<SamvaSendInput["from"]>;

type NormalizedAddress = {
  readonly email: string;
  readonly name?: string;
};

const ordinaryEmail = /^[^\s@<>,]+@[^\s@<>,]+$/;

function validationError(field: string, detail: string): EmailValidationError {
  return new EmailValidationError(`Samva cannot send email with ${field}: ${detail}.`);
}

function normalizeName(name: string | undefined, field: string): string | undefined {
  if (name === undefined) return undefined;
  const normalized = name.trim();
  if (normalized.length === 0 || /[<>\r\n]/.test(normalized)) {
    throw validationError(field, "the display name is malformed");
  }
  return normalized;
}

function assertEmail(email: string, field: string): string {
  const normalized = email.trim();
  if (normalized !== email || !ordinaryEmail.test(normalized)) {
    throw validationError(field, `the address "${email}" is malformed or ambiguous`);
  }
  return normalized;
}

function normalizeStringAddress(address: string, field: string): NormalizedAddress {
  const normalized = address.trim();
  if (normalized !== address || normalized.length === 0) {
    throw validationError(field, "the address is empty or has surrounding whitespace");
  }

  const hasAngleBracket = normalized.includes("<") || normalized.includes(">");
  if (!hasAngleBracket) return { email: assertEmail(normalized, field) };

  const display = normalized.match(/^(.+?)\s*<([^<>]+)>$/);
  if (!display) {
    throw validationError(field, `the address "${address}" is malformed or ambiguous`);
  }

  const name = normalizeName(display[1]!, field);
  return {
    email: assertEmail(display[2]!, field),
    ...(name === undefined ? {} : { name }),
  };
}

function normalizeAddress(address: EmailAddress, field: string): NormalizedAddress {
  if (typeof address === "string") return normalizeStringAddress(address, field);
  if (!address || typeof address !== "object") {
    throw validationError(field, "the address is malformed");
  }
  const name = normalizeName(address.name, field);
  return { email: assertEmail(address.email, field), ...(name === undefined ? {} : { name }) };
}

function normalizeAddresses(
  addresses: EmailAddress | readonly EmailAddress[] | undefined,
  field: string,
): NormalizedAddress[] | undefined {
  if (addresses === undefined) return undefined;
  const values = Array.isArray(addresses) ? addresses : [addresses as EmailAddress];
  if (values.length === 0) throw validationError(field, "at least one address is required");
  return values.map((address) => normalizeAddress(address, field));
}

function normalizeReplyTo(addresses: EmailMessage["replyTo"]): readonly string[] | undefined {
  const normalized = normalizeAddresses(addresses, "replyTo");
  if (!normalized) return undefined;
  for (const address of normalized) {
    if (address.name !== undefined) {
      throw validationError("replyTo", "Samva cannot preserve reply-to display names");
    }
  }
  return normalized.map(({ email }) => email);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  }
  return btoa(binary);
}

function decodeBase64(content: string, filename: string): Uint8Array {
  if (
    content.length % 4 === 1 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(content)
  ) {
    throw validationError(`attachment "${filename}"`, "base64 content is malformed");
  }
  const decoded = atob(content);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function attachmentBytes(attachment: EmailAttachment): Promise<Uint8Array> | Uint8Array {
  const content = attachment.content;
  if (typeof content === "string") {
    return attachment.contentEncoding === "base64"
      ? decodeBase64(content, attachment.filename)
      : new TextEncoder().encode(content);
  }
  if (content instanceof Uint8Array) return content;
  if (content instanceof ArrayBuffer) return new Uint8Array(content);
  if (content instanceof Blob) {
    return content.arrayBuffer().then((buffer) => new Uint8Array(buffer));
  }
  throw validationError(`attachment "${attachment.filename}"`, "content is malformed");
}

function validateAttachment(attachment: EmailAttachment): string {
  const field = `attachment "${attachment.filename}"`;
  if (!attachment.filename || attachment.filename.trim() !== attachment.filename) {
    throw validationError(field, "filename is empty or has surrounding whitespace");
  }
  if (attachment.path !== undefined) {
    throw validationError(field, "path and URL attachments are not supported");
  }
  if (attachment.contentId !== undefined) {
    throw validationError(field, "contentId is not supported");
  }
  if (attachment.disposition !== undefined) {
    throw validationError(field, "disposition is not supported");
  }
  if (
    attachment.contentType === undefined ||
    attachment.contentType.length === 0 ||
    attachment.contentType.trim() !== attachment.contentType
  ) {
    throw validationError(field, "contentType is required without surrounding whitespace");
  }
  if (attachment.content === undefined) {
    throw validationError(field, "in-memory content is required");
  }
  return attachment.contentType;
}

async function normalizeAttachment(attachment: EmailAttachment) {
  const contentType = validateAttachment(attachment);
  const bytes = await attachmentBytes(attachment);
  return {
    filename: attachment.filename,
    content: bytesToBase64(bytes),
    contentType,
    size: bytes.byteLength,
  };
}

/** Validate every normalized Email SDK field that the Samva adapter accepts. */
export function validateMessage(message: EmailMessage): void {
  normalizeAddress(message.from, "from");
  normalizeAddresses(message.to, "to");
  normalizeAddresses(message.cc, "cc");
  normalizeAddresses(message.bcc, "bcc");
  normalizeReplyTo(message.replyTo);

  if ((message.headers?.length ?? 0) > 0) {
    throw validationError("headers", "custom headers are not supported");
  }
  if ((message.tags?.length ?? 0) > 0) {
    throw validationError("tags", "tags are not supported");
  }
  if (message.sendAt !== undefined) {
    throw validationError("sendAt", "scheduling is not supported");
  }
  for (const attachment of message.attachments ?? []) validateAttachment(attachment);
}

/** Map a validated Email SDK message to the Samva Promise client's email input. */
export async function toSamvaMessage(message: EmailMessage): Promise<SamvaSendInput> {
  validateMessage(message);
  const from = normalizeAddress(message.from, "from");
  const to = normalizeAddresses(message.to, "to")!;
  const cc = normalizeAddresses(message.cc, "cc");
  const bcc = normalizeAddresses(message.bcc, "bcc");
  const replyTo = normalizeReplyTo(message.replyTo);
  const attachments = await Promise.all((message.attachments ?? []).map(normalizeAttachment));

  return {
    from: from as SamvaSender,
    to: to as SamvaSendInput["to"],
    ...(cc === undefined ? {} : { cc: cc as NonNullable<SamvaSendInput["cc"]> }),
    ...(bcc === undefined ? {} : { bcc: bcc as NonNullable<SamvaSendInput["bcc"]> }),
    ...(replyTo === undefined ? {} : { replyTo }),
    subject: message.subject,
    ...(message.html === undefined ? {} : { html: message.html }),
    ...(message.text === undefined ? {} : { text: message.text }),
    ...(message.metadata === undefined ? {} : { metadata: message.metadata }),
    ...(attachments.length === 0 ? {} : { attachments }),
  };
}
