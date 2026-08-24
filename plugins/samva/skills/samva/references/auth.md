# Authentication

Samva has two credential types. Pick by **who is acting**.

For the public agent-facing setup guide, fetch `https://samva.dev/auth.md`. It
is the canonical prose companion to Samva's OAuth protected-resource metadata
and hosted MCP setup.

| Credential      | Use for                                       | How it scopes the org            |
| --------------- | --------------------------------------------- | -------------------------------- |
| **API key**     | Servers, backends, CI, a single org           | Key is bound to one organization |
| **OAuth login** | A human (or agent) at a terminal, across orgs | User-scoped; pick the active org |

## API keys

Production keys start with `samva_sk_live_`; keys minted outside production start with
`samva_sk_test_`.

Create one in the Samva dashboard under **Developers → API Keys**. The full
value is shown once at creation — store it in an environment variable, never in
source. Send it as the `X-API-Key` header (the SDK and CLI do this for you when
you set `SAMVA_API_KEY`).

The organization is derived from the key, so API-key callers never select an
org.

## OAuth login (CLI device flow)

`samva login` runs the OAuth 2.0 device authorization flow: it prints a
verification URL and code, opens your browser, and waits for approval. The
result is a session bearer token sent as `Authorization: Bearer …`.

- The token is **user-scoped**, so the active org travels separately — set it
  with `samva org use <slug>` (the CLI sends it as `x-org-slug`), or pass
  `headers: { "x-org-slug": "<slug>" }` to the SDK's `createClient({ authToken })`.
- There is **no refresh token**. The session slides while in use and requires
  `samva login` again once the server-side session expires.

Use OAuth for interactive work, especially across multiple organizations. Use an
API key for anything unattended.

## Errors

Auth failures return a tagged JSON body — a `_tag` identifying the error and a
`message`:

| Status | `_tag`              | Meaning                                                                     | Fix                                                    |
| ------ | ------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------ |
| `401`  | `UnauthorizedError` | Invalid or missing credential                                               | Check the `X-API-Key` / `Authorization` header         |
| `403`  | `ForbiddenError`    | Valid credential, not authorized (e.g. not associated with an organization) | Use a credential scoped to the right org / permissions |

```json
{ "_tag": "UnauthorizedError", "message": "Invalid API key" }
```
