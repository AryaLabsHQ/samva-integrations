# Clerk Webhook Example

This Next.js App Router example receives Clerk webhooks, verifies them with
`@clerk/nextjs/webhooks`, and sends email through Samva.

## Run locally

```sh
bun install
cp examples/clerk-webhook/.env.example examples/clerk-webhook/.env
bun run --filter clerk-webhook-samva dev
```

Fill `.env` with:

- `SAMVA_API_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

The Samva account must have a verified email sender. The send payload has no
`from`; Samva uses that verified sender.

## Configure Clerk

In the Clerk Dashboard, add a webhook endpoint:

```txt
https://your-public-url.example/api/webhooks/clerk
```

For local testing, expose Next.js with a tunnel such as ngrok, then use that URL
as the Clerk endpoint. Subscribe to `user.created` and send a test event. The
route resolves the primary email address, renders `emails/welcome.tsx`, and calls
`samva.messages.send`.

Bad or missing Svix signatures return `400`. The route is public in `proxy.ts`
through `clerkMiddleware()`; do not put Clerk auth in front of the webhook. If
you copy this into a Next.js 15 or older app, use the same code in
`middleware.ts` instead.

## Custom delivery

To have Samva deliver Clerk-rendered auth email, open a Clerk email template and
turn off **Delivered by Clerk**. Clerk will emit `email.created`. This example
includes a real `email.created` branch that forwards Clerk's rendered `body`,
`body_plain`, and `subject` through Samva.

If you render your own React Email template, branch on `event.data.slug` and log
the first live `event.data.data` for each template. Clerk documents `otp_code`
for verification email; other keys vary by template.
