# Supabase Auth Send Email Hook with Samva

This example runs a Supabase Edge Function for the Supabase Auth Send Email Hook.
Supabase signs each hook request with Standard Webhooks headers, the function
verifies the raw request body, renders a small React Email template, and sends it
with `samva.messages.send`.

Samva does not take a `from` value in the send call. Configure your verified
sender in Samva; the hook only supplies the recipient, subject, HTML, and text.

## Configure

Create `supabase/functions/.env` from the example file:

```sh
cp supabase/functions/.env.example supabase/functions/.env
```

Set:

```sh
SAMVA_API_KEY=sk_sm_...
SEND_EMAIL_HOOK_SECRET=v1,whsec_<base64-secret>
SUPABASE_PROJECT_REF=your-project-ref
```

`SUPABASE_PROJECT_REF` builds links like
`https://<project-ref>.supabase.co/auth/v1/verify`. Use `SUPABASE_AUTH_URL`
instead when your auth endpoint is not the hosted Supabase URL.

## Supabase hook config

`supabase/config.toml` enables the Send Email Hook:

```toml
[auth.hook.send_email]
enabled = true
uri = "http://host.docker.internal:54321/functions/v1/send-email"
secrets = "env(SEND_EMAIL_HOOK_SECRET)"
```

Enabling the hook overrides Supabase's built-in email and Custom SMTP sending for
the covered auth flows.

## Run locally

Serve the Edge Function without JWT verification. The Auth hook fires before a
user JWT exists.

```sh
supabase functions serve send-email --no-verify-jwt
```

A successful hook returns an empty `200`. Signature failures return `401`; send
failures return non-200 so Supabase treats the hook as failed.

## Test

The test suite signs fixture payloads locally and uses a mocked Samva client. It
does not send network requests.

```sh
bun run test
bun run typecheck
bun run smoke
```

The dispatch covers the core Supabase Auth email actions: `signup`, `invite`,
`magiclink`, `recovery`, `email_change`, and `reauthentication`. Notification
actions and the bare `email` OTP action fail loudly until you add an explicit
case for them.
