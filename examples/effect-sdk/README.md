# Effect SDK example

Send email with Samva's Effect-native SDK entrypoint.

## Setup

```sh
bun install
cp examples/effect-sdk/.env.example examples/effect-sdk/.env
```

Set `SAMVA_API_KEY` in `.env`. The key must belong to a Samva account with a
verified sender; the email payload does not include `from`.

This example pins `effect@4.0.0-beta.85`, matching the current `samva/effect`
peer dependency. The HTTP transport import comes from `effect/unstable/http`
while Effect 4 is in beta.

## Send from a script

```sh
bun run send --to ada@example.com --subject "Welcome" --message "Your workspace is ready."
```

`src/send.ts` uses `createClient`, provides `FetchHttpClient.layer`, and runs the
program with `Effect.runPromise`. Missing `SAMVA_API_KEY` throws before any send
is attempted.

## Run the fetch handler

```sh
bun run serve
```

Then call it:

```sh
curl -sS http://localhost:3000 \
  -H 'content-type: application/json' \
  -d '{"to":"ada@example.com","subject":"Welcome","message":"Your workspace is ready."}'
```

`src/server.ts` builds `SamvaClient.layerFetch(config)` once, parses the JSON
body, escapes the plain-text `message` before placing it into HTML, and maps
typed Samva errors to HTTP responses:

- `MessagesSend422` -> `400 validation_failed`
- `MessagesSend401` -> `500 samva_configuration_error`
- `MessagesSend429` -> `429 rate_limited`

Transient `MessagesSend429`, `MessagesSend500`, and `MessagesSend502` failures
are retried with exponential jittered backoff.

## Validate the example

```sh
bun run typecheck
bun run build
bun run smoke
```

`bun run smoke` checks local HTML escaping and the missing-key failure path. It
does not stub a successful send; `bun run send` and `bun run serve` call the real
Samva API when configured.
