# Hono on Cloudflare Workers with Samva

Send email from a [Hono](https://hono.dev) app running on
[Cloudflare Workers](https://developers.cloudflare.com/workers/) with Samva. The
Samva SDK uses `fetch`, so the send path runs on `workerd` without SMTP,
`nodemailer`, Node built-ins, or `nodejs_compat`.

## Setup

```sh
bun add hono samva
bun add -d wrangler @cloudflare/workers-types typescript
```

Use Workers bindings for secrets. In production:

```sh
wrangler secret put SAMVA_API_KEY
```

For local development, keep a `.dev.vars` file next to `wrangler.jsonc`:

```sh
SAMVA_API_KEY="sk_sm_..."
```

Configure the Worker with a module entrypoint. You do not need
`nodejs_compat`.

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "hono-cloudflare-workers-samva",
  "main": "src/index.ts",
  "compatibility_date": "2026-06-29",
}
```

## The Worker seam

Hono's app object is the Worker entrypoint: `export default app`. Cloudflare
passes `(request, env, ctx)` to Hono's `app.fetch`, and Hono exposes `env` as
`c.env` inside handlers.

```ts
import { Hono } from "hono";
import { createClient } from "samva";

type Bindings = {
  SAMVA_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => c.text("samva + hono on workers"));

export default app;
```

Create the Samva client inside the handler from `c.env`. Do not read
`process.env`, and do not construct a module-top client for a Worker secret.

## Route handler send

```ts
import { Hono } from "hono";
import { createClient } from "samva";

type Bindings = {
  SAMVA_API_KEY: string;
};

type SendRequestBody = {
  to?: unknown;
  subject?: unknown;
  html?: unknown;
  text?: unknown;
};

const app = new Hono<{ Bindings: Bindings }>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

app.post("/send", async (c) => {
  const body: unknown = await c.req.json().catch(() => null);
  if (!isRecord(body)) {
    return c.json({ error: "Expected a JSON object." }, 400);
  }

  const { to, subject, html, text } = body as SendRequestBody;
  const recipientEmail = readString(to);
  const emailSubject = readString(subject);

  if (!recipientEmail || !emailSubject) {
    return c.json({ error: "to and subject are required" }, 400);
  }

  const apiKey = c.env.SAMVA_API_KEY;
  if (!apiKey) {
    throw new Error("SAMVA_API_KEY is not configured for this Worker.");
  }

  const samva = createClient({ apiKey });
  const { data, error } = await samva.messages.send({
    to: [{ email: recipientEmail }],
    channel: "email",
    email: {
      subject: emailSubject,
      html: readString(html) || "<p>Hello from Hono on Cloudflare Workers.</p>",
      text: readString(text) || undefined,
    },
  });

  if (error) {
    return c.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      502,
    );
  }

  return c.json({ ok: true, id: data?.id });
});

export default app;
```

There is no `from` field. Samva sends from the verified sender configured on
your account.

## Edge-native send path

This route stays inside the Workers runtime:

- Hono reads JSON and returns `Response` objects through Web APIs.
- The Samva SDK sends over `fetch`.
- The API key comes from a Worker secret binding.
- No SMTP sockets, Node `crypto`, Node `fs`, or compatibility flags are needed.

## Await vs. waitUntil

For user-facing sends, await `samva.messages.send(...)` and return the result to
the caller. That surfaces delivery API errors in the HTTP response.

Use `c.executionCtx.waitUntil(...)` only when the request should return before
the send finishes, such as an analytics-style notification or webhook side
effect.

```ts
app.post("/send-background", async (c) => {
  const body: unknown = await c.req.json().catch(() => null);
  if (!isRecord(body)) {
    return c.json({ error: "Expected a JSON object." }, 400);
  }

  const { to, subject, html } = body as SendRequestBody;
  const recipientEmail = readString(to);
  const emailSubject = readString(subject);

  if (!recipientEmail || !emailSubject) {
    return c.json({ error: "to and subject are required" }, 400);
  }

  const apiKey = c.env.SAMVA_API_KEY;
  if (!apiKey) {
    throw new Error("SAMVA_API_KEY is not configured for this Worker.");
  }

  const samva = createClient({ apiKey });
  c.executionCtx.waitUntil(
    samva.messages.send({
      to: [{ email: recipientEmail }],
      channel: "email",
      email: {
        subject: emailSubject,
        html: readString(html) || "<p>Hello from Hono on Cloudflare Workers.</p>",
      },
    }),
  );

  return c.json({ accepted: true }, 202);
});
```

`waitUntil` extends work after the response, but the client will not see send
errors. Keep the awaited path as the default for forms, admin actions, and API
calls where the caller expects a real send result.

## React Email on Workers

React Email's render package has an edge build for `workerd`. Render to HTML,
derive a text fallback, then send the strings with Samva.

```sh
bun add @react-email/render react react-dom
```

```tsx
import { render, toPlainText } from "@react-email/render";
import { Hono } from "hono";
import { createClient } from "samva";
import WelcomeEmail from "./emails/welcome-email";

type Bindings = {
  SAMVA_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.post("/welcome", async (c) => {
  const html = await render(<WelcomeEmail name="Ada" />);

  const apiKey = c.env.SAMVA_API_KEY;
  if (!apiKey) {
    throw new Error("SAMVA_API_KEY is not configured for this Worker.");
  }

  const samva = createClient({ apiKey });
  const { data, error } = await samva.messages.send({
    to: [{ email: "ada@example.com" }],
    channel: "email",
    email: {
      subject: "Welcome",
      html,
      text: toPlainText(html),
    },
  });

  if (error) {
    return c.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      502,
    );
  }

  return c.json({ ok: true, id: data?.id });
});
```

For components, Tailwind, preview workflows, and text strategies, use the
[React Email cookbook](./react-email.md).

## Webhook receiver shape

When you receive Samva webhooks in a Worker, read the raw body before any JSON
parsing. Signature verification is intentionally not hand-rolled here; use the
`samva/webhooks` SDK subpath.

```ts
app.post("/webhooks/samva", async (c) => {
  const payload = await c.req.text();
  const signature = c.req.header("x-webhook-signature");

  // TODO(wave 3): verify payload and signature with samva/webhooks.
  void payload;
  void signature;

  return c.body(null, 204);
});
```

## FAQ

**Why no `from`?** Samva sends from the verified sender configured on your
account. Your Worker only supplies recipients and email content.

**Can I use `process.env.SAMVA_API_KEY`?** Not on Workers. Put the secret in
Wrangler and read `c.env.SAMVA_API_KEY` inside the handler.

**Should sends use `waitUntil`?** Usually no. Await the send when a user or API
caller needs to know whether it worked. Use `waitUntil` for background side
effects where the response should be returned immediately.

**How do I send many emails?** Put the work behind a queue or batch process.
Keep the request handler focused on one user-facing send.

**Can I use the Effect-native SDK?** Yes. `samva/effect` can run with a
fetch-backed HTTP client, but this cookbook uses the promises client because it
is the shortest Hono route-handler shape.

## Example

See the runnable
[`hono-cloudflare-workers` example](../examples/hono-cloudflare-workers) for a
complete Worker with `wrangler.jsonc`, `.dev.vars.example`, `POST /send`, and a
Samva webhook receiver stub.
