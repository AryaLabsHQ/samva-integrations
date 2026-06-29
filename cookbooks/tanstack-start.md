# TanStack Start with Samva

Send transactional email from a TanStack Start app with Samva. The default path is
a `createServerFn` for in-app forms, with a server route for raw HTTP triggers.
The Samva SDK uses `fetch`, so the same send path works in Node and edge SSR
runtimes such as Cloudflare Workers when you keep API keys server-side.

## Setup

```sh
bun add samva zod
```

Add React Email when you want component templates:

```sh
bun add react-email react react-dom
```

Set a server-only key. Do not prefix it with `VITE_`; client-side env vars are
public in TanStack Start.

```sh
SAMVA_API_KEY=sk_sm_your_key_here
```

Create a tiny server-only helper:

```ts
// src/lib/samva.ts
import "@tanstack/react-start/server-only";
import { createClient } from "samva";

export function getSamva() {
  const apiKey = process.env.SAMVA_API_KEY;
  if (!apiKey) {
    throw new Error("SAMVA_API_KEY is not set");
  }

  return createClient({ apiKey });
}
```

Build the client inside a handler or another per-request callback. On Cloudflare
Workers and other edge SSR runtimes, `process.env` is injected per request, so a
module-scope `process.env.SAMVA_API_KEY` read can evaluate to `undefined`.

## Send from a server function

Use a server function for app-owned mutations such as contact forms, invitations,
and transactional sends triggered by your UI.

```ts
// src/functions/send-email.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getSamva } from "~/lib/samva";

const sendEmailInput = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(1),
});

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const sendEmail = createServerFn({ method: "POST" })
  .validator(sendEmailInput)
  .handler(async ({ data }) => {
    const samva = getSamva();
    const html = `<p>${escapeHtml(data.message).replaceAll("\n", "<br />")}</p>`;

    await samva.messages.send({
      to: [{ email: data.to }],
      channel: "email",
      email: {
        subject: data.subject,
        html,
        text: data.message,
      },
    });

    return { ok: true };
  });
```

The handler context is `{ data, context, method, serverFnMeta }`; there is no
`signal` field on the server function handler context. `validator()` accepts
Standard Schema validators, so Zod, Valibot, and ArkType all fit. Zod is used
here because it is common and direct. Older TanStack Start examples may show
`.inputValidator()`; current Start builds warn in favor of `.validator()`.

`samva.messages.send()` returns the SDK response envelope. For a form flow,
return your own small app response such as `{ ok: true }`; read `response.data`
only when your UI needs fields from the send response.

## Call it from a form

```tsx
// src/routes/index.tsx
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { sendEmail } from "~/functions/send-email";

export function ContactForm() {
  const send = useServerFn(sendEmail);
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);

        setStatus("sending");
        setError(null);

        try {
          await send({
            data: {
              to: String(form.get("to") ?? ""),
              subject: String(form.get("subject") ?? ""),
              message: String(form.get("message") ?? ""),
            },
          });
          setStatus("sent");
          event.currentTarget.reset();
        } catch (err) {
          setStatus("idle");
          setError(err instanceof Error ? err.message : "Unable to send email");
        }
      }}
    >
      <input name="to" type="email" required />
      <input name="subject" required />
      <textarea name="message" required />
      <button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending..." : "Send"}
      </button>
      {error ? <p role="alert">{error}</p> : null}
      {status === "sent" ? <p>Email sent.</p> : null}
    </form>
  );
}
```

For multi-step or heavily validated forms, pair the same server function with
`@tanstack/react-form`. The send boundary stays the same.

## Add a server route

Use a server route when an external system needs to POST to your app, or when
you want a raw HTTP endpoint instead of TanStack Start's server-function RPC.

```ts
// src/routes/api/send.ts
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { getSamva } from "~/lib/samva";

const sendRouteInput = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().min(1).optional(),
  text: z.string().min(1).optional(),
});

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const Route = createFileRoute("/api/send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const payload = await request.json().catch(() => null);
        const parsed = sendRouteInput.safeParse(payload);
        if (!parsed.success) {
          return Response.json({ error: "Invalid send payload" }, { status: 400 });
        }

        const body = parsed.data;
        const text = body.text ?? "";
        const html = body.html ?? `<p>${escapeHtml(text).replaceAll("\n", "<br />")}</p>`;
        const samva = getSamva();

        await samva.messages.send({
          to: [{ email: body.to }],
          channel: "email",
          email: { subject: body.subject, html, text },
        });

        return Response.json({ ok: true });
      },
    },
  },
});
```

A server function is already an RPC endpoint. Enforce auth and rate limits inside
the server function handler, middleware, or server route handler; do not rely on
a UI route `beforeLoad` to protect a mutation.

TanStack Start also exposes request/response helpers from
`@tanstack/react-start/server`, such as `getRequestHeader()` and
`setResponseStatus()`, when you need framework-managed response state.

## Render React Email

React Email renders a component to the `html` string Samva sends. Keep the full
template work in your email files and pass the rendered result to
`samva.messages.send()`.

```tsx
import { render, toPlainText } from "react-email";

import WelcomeEmail from "~/emails/welcome";
import { getSamva } from "~/lib/samva";

const html = await render(<WelcomeEmail name="Ada" />);
const text = toPlainText(html);

await getSamva().messages.send({
  to: [{ email: "ada@example.com" }],
  channel: "email",
  email: { subject: "Welcome", html, text },
});
```

You can also derive text with a second render:

```tsx
const text = await render(<WelcomeEmail name="Ada" />, { plainText: true });
```

For deeper template structure, preview workflows, and Tailwind examples, see the
[React Email cookbook](./react-email.md).

## Edge and Workers notes

The Samva SDK uses `fetch`, and React Email's edge render path avoids Node-only
runtime APIs. That means a TanStack Start app deployed to Cloudflare Workers can
render and send in the same request path.

The load-bearing rule is env access: build the Samva client per request, inside
`.handler()`, middleware `.server()`, or a server route handler. Do not build a
module-scope client from `process.env.SAMVA_API_KEY` in a Workers-targeted app.

The official TanStack `start-basic-cloudflare` example is the right reference
for framework deployment shape. This cookbook focuses on the Samva send seam,
not a full Workers deploy walkthrough.

## Effect aside

Promise APIs are the default, but the SDK also exposes `samva/effect` for Effect
applications:

```ts
import * as Effect from "effect/Effect";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";
import { createClient } from "samva/effect";

const program = Effect.gen(function* () {
  const samva = yield* createClient({ apiKey: process.env.SAMVA_API_KEY! });
  return yield* samva.messages.send({
    to: [{ email: "ada@example.com" }],
    channel: "email",
    email: { subject: "Hello", html: "<p>Hello</p>", text: "Hello" },
  });
}).pipe(Effect.provide(FetchHttpClient.layer));
```

Keep the same server-only and per-request env rules when running this from
TanStack Start.

## FAQ

**Server function or server route?** Use a server function for app UI mutations
called with `useServerFn`. Use a server route for raw HTTP integrations and
external triggers.

**Where is `from`?** Samva sends from the verified sender configured on your
account. The send payload does not include a `from` field.

**Can I put the key in `VITE_SAMVA_API_KEY`?** No. `VITE_` variables are client
visible. Use `process.env.SAMVA_API_KEY` from server-only code.

**What should fail loudly?** Invalid form input should fail validation. A missing
`SAMVA_API_KEY` should throw inside the handler. Do not silently skip sends or
stub them in production code.

**What about webhooks?** Webhook receiving and signature verification are owned
by `samva/webhooks`. The TanStack Start server route shape above is the raw HTTP
seam; do not treat it as webhook verification by itself.

**What about bulk sends?** Put high-volume or retry-heavy work behind a queue and
call Samva from the worker. This cookbook covers request/response sends.

## Runnable example

See [`examples/tanstack-start-transactional`](../examples/tanstack-start-transactional)
for a self-contained TanStack Start app with both send flows.
