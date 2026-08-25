# TanStack Start Transactional Email

A self-contained TanStack Start app that sends transactional email with
[Samva](https://samva.dev).

It includes both common TanStack Start send paths:

- A contact form that calls a `createServerFn` through `useServerFn`.
- A raw `POST /api/send` server route.

## Setup

```sh
bun install
cp examples/tanstack-start-transactional/.env.example examples/tanstack-start-transactional/.env
```

Add a real `SAMVA_API_KEY` and a random `SAMVA_SEND_TOKEN` in `.env`. Both are
server-only and intentionally do not use a `VITE_` prefix.

Your Samva account must have a verified sender/domain before production sends
will deliver.

## Run

```sh
bun run --filter tanstack-start-transactional-samva dev
```

Open `http://localhost:3000` and submit the form.

## Exercise the server route

```sh
curl -X POST http://localhost:3000/api/send \
  -H "Authorization: Bearer replace-with-a-random-route-token" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "ada@example.com",
    "subject": "Hello from TanStack Start",
    "text": "This was sent through Samva."
  }'
```

The route returns `{ "ok": true }` after Samva accepts the send. Invalid payloads
return `400`.

## Files

- `src/lib/samva.ts` builds the Samva client per request from `process.env.SAMVA_API_KEY`.
- `src/functions/send-email.ts` defines the `createServerFn` send flow.
- `src/routes/index.tsx` renders the contact form and calls `useServerFn`.
- `src/routes/api/send.ts` exposes the raw HTTP route.

See the [TanStack Start cookbook](../../cookbooks/tanstack-start.md) for the full
walkthrough, including React Email and edge runtime notes.
