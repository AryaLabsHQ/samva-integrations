/**
 * Samva webhook event types — canonical list at https://samva.app.
 * Unrecognized event types still parse and verify; this union is informational.
 */
export const SAMVA_WEBHOOK_EVENT_TYPES = [
  "message.sent",
  "message.delivered",
  "message.read",
  "message.failed",
  "message.bounced",
  "message.received",
  "contact.created",
  "contact.updated",
  "conversation.started",
  "conversation.ended",
  "webhook.test",
] as const;

export type SamvaWebhookEventType = (typeof SAMVA_WEBHOOK_EVENT_TYPES)[number];

export interface SamvaWebhookEvent {
  event: SamvaWebhookEventType;
  messageId: string;
  timestamp: string;
  data: Record<string, unknown>;
}
