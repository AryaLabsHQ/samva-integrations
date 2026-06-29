# Effect SDK with Samva

Use the `samva/effect` entrypoint when your app already runs on
[Effect](https://effect.website). It gives you an Effect-native Samva client:
typed errors, `Effect.retry` with `Schedule`, and `Layer`-provided dependencies
over the fetch HTTP client.

If you are not using Effect, use the plain `samva` client instead. The payload is
the same; this cookbook focuses on the Effect runtime shape.

## Setup

```sh
bun add samva effect@4.0.0-beta.85
```

Keep `SAMVA_API_KEY` server-side only. The Effect SDK currently imports
`effect/unstable/http`, so pin an Effect 4 beta that matches the SDK peer
dependency and expect namespace churn before Effect 4 is stable.

## First send

`createClient` yields the Samva client inside an Effect program. Provide
`FetchHttpClient.layer` once so the generated client can use `globalThis.fetch`.

```ts
import { Effect } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { createClient } from "samva/effect";

const program = Effect.gen(function* () {
  const samva = yield* createClient({ apiKey: process.env.SAMVA_API_KEY! });

  return yield* samva.email.send({
    to: "ada@example.com",
    subject: "Welcome",
    html: "<p>Hi Ada</p>",
    text: "Hi Ada",
  });
}).pipe(Effect.provide(FetchHttpClient.layer));

const message = await Effect.runPromise(program);
console.log(message.id, message.status);
```

There is no `from` field. Samva sends from the verified sender configured on
your account.

## Layer-provided client

For an application, provide `SamvaClient.layerFetch(config)` at the boundary and
`yield* SamvaClient` anywhere inside the program.

```ts
import { Effect } from "effect";
import { SamvaClient } from "samva/effect";

const SamvaLayer = SamvaClient.layerFetch({
  apiKey: process.env.SAMVA_API_KEY!,
});

const sendWelcome = (to: string) =>
  Effect.gen(function* () {
    const samva = yield* SamvaClient;

    return yield* samva.email.send({
      to,
      subject: "Welcome",
      html: "<p>Your workspace is ready.</p>",
      text: "Your workspace is ready.",
    });
  });

await Effect.runPromise(sendWelcome("ada@example.com").pipe(Effect.provide(SamvaLayer)));
```

Use `SamvaClient.layer(config)` instead when you want to provide your own
`HttpClient.HttpClient` layer.

## Typed errors

Generated errors are tagged by operation and status, such as
`MessagesSend429`, not by the inner cause tag. Match the wrapper tag and then
read `cause` for the status-specific payload.

```ts
import { Effect } from "effect";

const handled = sendWelcome("ada@example.com").pipe(
  Effect.catchTags({
    MessagesSend429: (error) =>
      Effect.succeed({
        retryAfterSeconds: error.cause.retryAfterSeconds,
      }),
    MessagesSend422: (error) =>
      Effect.succeed({
        validationFields: error.cause.fields ?? {},
      }),
    MessagesSend401: () =>
      Effect.succeed({
        configurationError: "SAMVA_API_KEY is invalid or missing permissions.",
      }),
  }),
);
```

For `email.send`, the status union also includes `MessagesSend402`,
`MessagesSend403`, `MessagesSend404`, `MessagesSend409`, `MessagesSend500`, and
`MessagesSend502`. Keep the common send path focused on actionable errors:
credentials, validation, rate limiting, and transient server failures.

`RateLimitedError.retryAfterSeconds` can be a finite number or a non-finite
sentinel string from OpenAPI decoding. Check it before using it as a delay:

```ts
const retryAfter =
  typeof error.cause.retryAfterSeconds === "number" &&
  Number.isFinite(error.cause.retryAfterSeconds)
    ? error.cause.retryAfterSeconds
    : undefined;
```

## Retry with Schedule

Retry transient wrapper tags and fail fast on validation or credentials errors.
`Schedule.recurs(3)` allows three retries after the first attempt.

```ts
import { Effect, Schedule } from "effect";

const retryableSend = sendWelcome("ada@example.com").pipe(
  Effect.retry({
    schedule: Schedule.exponential("200 millis").pipe(Schedule.jittered),
    times: 3,
    while: (error) =>
      error._tag === "MessagesSend429" ||
      error._tag === "MessagesSend500" ||
      error._tag === "MessagesSend502",
  }),
);
```

You can still catch `MessagesSend429` after retries are exhausted and include a
`retryAfterSeconds` hint in your HTTP response.

## React Email

Samva accepts rendered `html` and optional `text`. React Email stays in your app:
render the component, derive text, and pass the strings to `email.send`.

```tsx
import { render, toPlainText } from "react-email";

const html = await render(<WelcomeEmail name="Ada" />);
const text = toPlainText(html);

yield *
  samva.email.send({
    to: "ada@example.com",
    subject: "Welcome",
    html,
    text,
  });
```

See the [React Email cookbook](./react-email.md) for template structure, preview,
plain-text fallbacks, and edge rendering.

## Edge and Workers

`FetchHttpClient.layer` runs through the platform `globalThis.fetch`, so the
same client shape works in Bun, Node with fetch, Vercel Edge, and Cloudflare
Workers. For Workers, pass the key from the Worker environment and build the
layer at the request or module boundary:

```ts
import { Effect } from "effect";
import { SamvaClient } from "samva/effect";

export default {
  async fetch(_request: Request, env: { SAMVA_API_KEY: string }) {
    const program = Effect.gen(function* () {
      const samva = yield* SamvaClient;
      return yield* samva.email.send({
        to: "ada@example.com",
        subject: "Hello from the edge",
        html: "<p>Hello from the edge.</p>",
        text: "Hello from the edge.",
      });
    }).pipe(Effect.provide(SamvaClient.layerFetch({ apiKey: env.SAMVA_API_KEY })));

    const message = await Effect.runPromise(program);
    return Response.json({ id: message.id, status: message.status });
  },
};
```

## Runnable example

The [`examples/effect-sdk`](../examples/effect-sdk) app includes:

- `src/send.ts` - a first-send script with `createClient`.
- `src/server.ts` - a fetch handler with `SamvaClient.layerFetch`, typed error to
  HTTP mapping, and retries.
- loud `SAMVA_API_KEY` validation.
- escaping for user text before it is placed into HTML.

## FAQ

**Why is there no `from`?** Samva sends from the verified sender configured on
your account. Configure senders at [samva.app](https://samva.app).

**Where should the API key live?** Only on the server or in an edge environment
binding. Do not expose it to browser code.

**Why are the error tags named `MessagesSend429`?** `email.send` is an ergonomic
wrapper over the generated `messages.send` endpoint. The generated Effect client
tags errors by operation and status.

**Can I receive webhooks here too?** Receiving and verifying Samva webhooks is a
separate concern. Use the `samva/webhooks` SDK export or the webhook cookbook
when you need inbound delivery events.
