# Samva webhooks receiver

Minimal Cloudflare Workers receiver for Samva webhook delivery events.

## Run locally

```sh
bun install
cp examples/webhooks-receiver/.dev.vars.example examples/webhooks-receiver/.dev.vars
bun --filter @samva/example-webhooks-receiver dev
```

Set `SAMVA_WEBHOOK_SECRET` in `.dev.vars` to the signing secret for your Samva webhook
endpoint.

## Test it

Point a Samva webhook endpoint at:

```text
http://localhost:8787/webhooks/samva
```

Then send a test webhook from the Samva SDK:

```ts
await samva.webhooks.test(webhookId);
```

Valid signed requests return `200 OK`. Missing or invalid signatures return `400 Unauthorized`.
