import { WebhookVerificationError, verifyRequest } from "@samva/webhooks";

export default {
  async fetch(req: Request, env: { SAMVA_WEBHOOK_SECRET: string }): Promise<Response> {
    const url = new URL(req.url);
    if (req.method !== "POST" || url.pathname !== "/webhooks/samva") {
      return new Response("Not Found", { status: 404 });
    }
    try {
      const event = await verifyRequest(req, env.SAMVA_WEBHOOK_SECRET);
      switch (event.event) {
        case "message.delivered":
          console.log("Message delivered", event.messageId);
          break;
        case "message.bounced":
          console.log("Message bounced", event.messageId);
          break;
        default:
          break;
      }
      return new Response("OK", { status: 200 });
    } catch (err) {
      if (err instanceof WebhookVerificationError) {
        return new Response("Unauthorized", { status: 400 });
      }
      throw err;
    }
  },
} satisfies ExportedHandler<{ SAMVA_WEBHOOK_SECRET: string }>;
