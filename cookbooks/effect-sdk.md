# Effect SDK with Samva

Use the `samva/effect` entrypoint when your app already runs on
[Effect](https://effect.website). It gives you an Effect-native Samva client:
semantic tagged errors, default-on retry with idempotent sends, and
`Layer`-provided dependencies over the fetch HTTP client.

If you are not using Effect, use the plain `samva` client instead. The payload is
the same; this cookbook focuses on the Effect runtime shape.

## Setup

```sh
bun add samva effect@4.0.0-beta.98
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

The client is derived from the same API contract the Samva API serves, so
every operation fails with the server's own semantic tagged errors —
`RateLimitedError`, `ValidationError`, `UnauthorizedError`, and so on — directly
in the Effect error channel. Match them by tag and read each error's own fields.
There is no per-status wrapper and no `cause` to unwrap.

```ts
import { Effect } from "effect";

const handled = sendWelcome("ada@example.com").pipe(
  Effect.catchTags({
    RateLimitedError: (error) =>
      Effect.succeed({
        retryAfterSeconds: error.retryAfterSeconds,
      }),
    ValidationError: (error) =>
      Effect.succeed({
        validationFields: error.fields ?? {},
      }),
    UnauthorizedError: () =>
      Effect.succeed({
        configurationError: "SAMVA_API_KEY is invalid or missing permissions.",
      }),
  }),
);
```

`retryAfterSeconds` is always a finite number, and `ValidationError.fields` is a
`Record<string, string[]>` keyed by field name.

Rather than enumerate tags, you can handle a whole category at once. The SDK
exports `catchAuthError`, `catchValidationError`, `catchNotFoundError`,
`catchConflictError`, `catchThrottlingError`, `catchBillingError`, and
`catchTransient`, plus the matching `isAuthError` / `isRetryable` / `isTransient`
predicates. `catchAuthError` covers both `UnauthorizedError` and
`ForbiddenError`:

```ts
import { Effect } from "effect";
import { catchAuthError, isRetryable } from "samva/effect";

const handledByCategory = sendWelcome("ada@example.com").pipe(
  catchAuthError(() => Effect.succeed({ configurationError: "SAMVA_API_KEY is unusable." })),
  Effect.match({
    onFailure: (error) => (isRetryable(error) ? "upstream_unavailable" : "failed"),
    onSuccess: (result) => result,
  }),
);
```

Timestamps decode to real `Date` values, so `message.createdAt` is a `Date` — no
string parsing:

```ts
const message = await Effect.runPromise(
  sendWelcome("ada@example.com").pipe(Effect.provide(SamvaLayer)),
);
console.log(message.createdAt.toISOString());
```

## Default-on retry

Retry-safe operations retry on their own, so you do not wrap calls in
`Effect.retry`. Reads and sends retry on throttling (`429`), transient server
errors, and request-transport failures with jittered exponential backoff bounded
to four attempts; a `429` waits for the server's `retryAfterSeconds` hint (capped
at 60s). Keyless mutating calls are never auto-retried.

Because retry is built in, a `RateLimitedError` or `InternalError` that reaches
your handler means retrying already failed to recover.

Override or disable the policy with the `SamvaRetry` Layer:

```ts
import { Effect } from "effect";
import { SamvaRetry, isRetryable } from "samva/effect";

// No auto-retry for this program:
sendWelcome("ada@example.com").pipe(Effect.provide(SamvaRetry.layerDisabled));

// Or a custom policy, using any Effect.retry options:
sendWelcome("ada@example.com").pipe(
  Effect.provide(SamvaRetry.layer({ times: 6, while: isRetryable })),
);
```

## Idempotency keys

Every `email.send` / `messages.send` generates an `Idempotency-Key` per call,
stable across the built-in retries, so a retried send never delivers twice. Pass
your own key to deduplicate a send you might replay from another process. Reusing
a key with identical content replays the original response; reusing it with
different content fails with `ConflictError`.

```ts
samva.email.send(input, { idempotencyKey: "order-4417-receipt" });
```

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
- `src/server.ts` - a fetch handler with `SamvaClient.layerFetch`, semantic
  tagged errors and `catchAuthError` mapped to HTTP responses, and `isRetryable`
  splitting exhausted-retry failures from unexpected ones.
- loud `SAMVA_API_KEY` validation.
- escaping for user text before it is placed into HTML.

## FAQ

**Why is there no `from`?** Samva sends from the verified sender configured on
your account. Configure senders at [samva.app](https://samva.app).

**Where should the API key live?** Only on the server or in an edge environment
binding. Do not expose it to browser code.

**Do I need to add my own retries?** No. Reads and sends retry on throttling and
transient failures out of the box, and sends stay safe under retry because they
carry an `Idempotency-Key`. Wrapping a call in `Effect.retry` nests your policy
on top of the built-in one; use `SamvaRetry.layer` to change it instead.

**Can I receive webhooks here too?** Receiving and verifying Samva webhooks is a
separate concern. Use the `samva/webhooks` SDK export or the webhook cookbook
when you need inbound delivery events.
