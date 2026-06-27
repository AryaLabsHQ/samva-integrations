# Samva webhooks

Use `@samva/webhooks` to verify that a request came from Samva before you update
delivery state, trigger follow-up email, or mark a forwarded conversation as handled.

## What Samva sends

Samva sends JSON webhook payloads for email-forwarding and delivery events such as
`message.sent`, `message.delivered`, `message.read`, `message.failed`, `message.bounced`,
`message.received`, `contact.created`, `contact.updated`, `conversation.started`,
`conversation.ended`, and `webhook.test`.

Each POST includes:

```http
X-Webhook-Signature: sha256=<hex>
```

The signature is an HMAC-SHA256 hex digest over the raw JSON request body using the endpoint
signing secret.

## Get a signing secret

Create a webhook endpoint through the Samva SDK:

```ts
const webhook = await samva.webhooks.create({
  url: "https://example.com/webhooks/samva",
});
```

Rotate the endpoint secret when needed:

```ts
const rotated = await samva.webhooks.regenerateSecret(webhook.id);
```

The SDK owns endpoint creation and rotation. `@samva/webhooks` only verifies requests you
receive.

## Route-handler shape

Read the raw body, verify the signature, switch on `event.event`, return a 2xx quickly, and do
follow-up work after the response when your runtime supports it.

### Next.js Route Handler

```ts
import { verifyRequest } from "@samva/webhooks";

export async function POST(req: Request) {
  const event = await verifyRequest(req, process.env.SAMVA_WEBHOOK_SECRET!);

  switch (event.event) {
    case "message.delivered":
      console.log("Delivered", event.messageId);
      break;
    case "message.bounced":
      console.log("Bounced", event.messageId);
      break;
    default:
      break;
  }

  return new Response("OK", { status: 200 });
}
```

### Cloudflare Workers

```ts
import { WebhookVerificationError, verifyRequest } from "@samva/webhooks";

export default {
  async fetch(req: Request, env: { SAMVA_WEBHOOK_SECRET: string }, ctx: ExecutionContext) {
    if (req.method !== "POST") {
      return new Response("Not Found", { status: 404 });
    }

    try {
      const event = await verifyRequest(req, env.SAMVA_WEBHOOK_SECRET);
      ctx.waitUntil(recordDeliveryEvent(event));
      return new Response("OK", { status: 200 });
    } catch (err) {
      if (err instanceof WebhookVerificationError) {
        return new Response("Unauthorized", { status: 400 });
      }
      throw err;
    }
  },
};
```

### Node and Express

```ts
import express from "express";
import { verify } from "@samva/webhooks/node";

const app = express();

app.post("/webhooks/samva", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const payload = (req.body as Buffer).toString("utf8");
    const event = await verify({
      payload,
      signature: req.header("x-webhook-signature") ?? "",
      secret: process.env.SAMVA_WEBHOOK_SECRET!,
    });

    console.log("Samva event", event.event, event.messageId);
    res.sendStatus(200);
  } catch {
    res.sendStatus(400);
  }
});
```

You can also use `verifyNodeRequest(req, secret)` from `@samva/webhooks/node` when your server
exposes a raw `IncomingMessage`.

## Gotchas

The raw body is required. Do not call `req.json()`, use JSON middleware, or re-stringify a
parsed object before verification.

`tolerance` is opt-in and advisory. Samva signs the body, and the payload timestamp is useful for
operational checks, but it is not a separate signed timestamp header.

Handle duplicates idempotently by `messageId`. Webhook delivery is at-least-once, so repeated
events should be safe to accept.

## Provider webhooks

For non-Samva provider webhooks such as Stripe, verify with that provider's own SDK. Reuse this
route-handler shape, but do not verify another provider's signature with `@samva/webhooks`.
