# Hono + Cloudflare Workers + Samva

A deployable [Hono](https://hono.dev) Worker that sends email through
[Samva](https://samva.app). The send path uses Worker bindings and `fetch`; it
does not need SMTP, Node APIs, or `nodejs_compat`.

## Setup

```sh
bun install
cp .dev.vars.example .dev.vars
```

Add your Samva API key to `.dev.vars`:

```sh
SAMVA_API_KEY="sk_sm_..."
```

## Run locally

```sh
bun run dev
```

Send an email:

```sh
curl -X POST http://localhost:8787/send \
  -H "content-type: application/json" \
  -d '{"to":"you@example.com","subject":"Hello from Hono","html":"<p>Sent from a Worker.</p>"}'
```

`POST /send` validates `to` and `subject`, builds the Samva client from
`c.env.SAMVA_API_KEY`, and returns the SDK result. There is no `from` field;
Samva sends from the verified sender configured on your account.

The example also includes `POST /webhooks/samva`, which reads the raw body and
signature header. Verification is left to the `samva/webhooks` SDK subpath.

## Deploy

Store the API key as a production Worker secret, then deploy:

```sh
wrangler secret put SAMVA_API_KEY
bun run deploy
```

Your Samva account must have a verified sender/domain before real mail can be
sent.

## Scripts

- `bun run dev` - start `wrangler dev`.
- `bun run deploy` - deploy with Wrangler.
- `bun run typecheck` - typecheck the Worker.

See the [Hono Cloudflare Workers cookbook](../../cookbooks/hono-cloudflare-workers.md)
for the full walkthrough, including the `waitUntil` pattern and React Email edge
rendering.
