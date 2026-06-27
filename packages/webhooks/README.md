# @samva/webhooks

Verify Samva webhook signatures in edge and server runtimes. The verifier uses
WebCrypto, has zero runtime dependencies, and expects the raw request body.

```sh
bun add @samva/webhooks
```

## 30-second verify

```ts
import { verifyRequest } from "@samva/webhooks";

export async function POST(req: Request) {
  const event = await verifyRequest(req, process.env.SAMVA_WEBHOOK_SECRET!);

  if (event.event === "message.delivered") {
    console.log("Delivered", event.messageId);
  }

  return new Response("ok");
}
```

## Raw body required

Read the request body exactly once and verify the raw bytes Samva sent. Do not
parse JSON first, do not run JSON middleware before verification, and do not
re-stringify the payload before calling `verifyRequest` or `verify`.

Samva sends email-forwarding and delivery events with
`X-Webhook-Signature: sha256=<hex>`. Endpoint setup and signing-secret rotation
live in the Samva SDK. See https://samva.app for the product docs.
