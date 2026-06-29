# Astro Email + Samva

Send email from Astro with Samva using an Astro Action for the contact form and
a JSON API endpoint for headless clients. The example uses `@astrojs/cloudflare`
with `output: "server"` so the same app can run on Cloudflare Workers.

## Setup

```sh
bun install
cp examples/astro-email/.dev.vars.example examples/astro-email/.dev.vars
```

Add your `SAMVA_API_KEY` to `.dev.vars`. Samva sends from the verified sender
configured on your account, so make sure your Samva account has a verified email
sender or domain before testing real delivery.

## Run locally

From the repository root:

```sh
bun run --filter astro-email-samva dev
```

Or run through Wrangler from the example directory:

```sh
cd examples/astro-email
bun run wrangler:dev
```

## Try the send flows

Open the home page and submit the contact form. The form posts to the `send`
Astro Action in `src/actions/index.ts`; the page reads the post-submit result
with `Astro.getActionResult`.

For the JSON path:

```sh
curl -X POST http://localhost:4321/api/send \
  -H "content-type: application/json" \
  -d '{"email":"ada@example.com","subject":"Hello from Astro","message":"This came from /api/send"}'
```

Bad input returns a `400` JSON response. Send failures return a non-2xx response
or an Action error; the example never stubs a successful send.

## Build

```sh
bun run --filter astro-email-samva typecheck
bun run --filter astro-email-samva build
```

The build script injects a placeholder key so Astro can validate the typed
server secret at build time.

## Node adapter swap

To run as a Node server instead of a Worker, install `@astrojs/node`, replace the
Cloudflare import and adapter in `astro.config.mjs`, and copy `.env.example` to
`.env`. The Samva client and send calls do not change.

## Files

- `src/lib/samva.ts` — typed server-only Samva client from `astro:env/server`.
- `src/actions/index.ts` — form Action using Zod input validation.
- `src/pages/index.astro` — progressive-enhancement contact form.
- `src/pages/api/send.ts` — JSON endpoint alternative.
