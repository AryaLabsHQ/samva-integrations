# OpenAI reviewer preparation

## Product surface

- Publisher: Arya Labs, Inc.
- Website: `https://samva.dev`
- Source: `https://github.com/AryaLabsHQ/samva-integrations/tree/main/plugins/samva`
- Hosted MCP: `https://mcp.samva.dev` over Streamable HTTP
- Authentication: OAuth protected-resource discovery; API keys remain a private client-side alternative
- Skill: one `samva` skill at version `0.2.1`, including all six canonical references

The plugin exposes email-only Samva capabilities: contacts needed for email,
transactional messages, email domains and senders, inbound email, webhooks,
usage and readiness, templates, scheduled email, and email campaigns. It does
not claim billing actions, SMS, WhatsApp, UI, Code Mode, or OpenAPI
search/execute.

## Safety metadata

The plugin advertises `Interactive` and `Write` because the hosted MCP inventory
contains both reads and live mutations. Tool-level annotations from the hosted
server remain authoritative. The final 70-tool annotation inventory in Samva
PR `#1083` classifies these irreversible external deliveries as
`readOnlyHint: false`, `destructiveHint: true`, and `openWorldHint: true`:

- `messages_send_email`
- `scheduled_messages_schedule_email`
- `campaigns_schedule_run`
- `templates_send_test_email`
- `webhooks_test`
- `webhooks_retry_delivery`

`messages_send_email` remains `idempotentHint: false` because its
`idempotencyKey` is optional. `scheduled_messages_cancel` is closed-world
(`openWorldHint: false`), while `webhooks_rotate_secret` is destructive but
closed-world. Other destructive domain, sender, webhook, campaign, schedule,
and template-version actions still require explicit approval.

Reviewers can compare the complete tool and resource inventory in
`skills/samva/references/mcp.md` with MCP `tools/list` and `resources/list`.

## Submission preparation

| Field             | Prepared value                                                             |
| ----------------- | -------------------------------------------------------------------------- |
| Name              | Samva                                                                      |
| Developer         | Arya Labs, Inc.                                                            |
| Category          | Developer Tools                                                            |
| Short description | Email infrastructure through Samva MCP                                     |
| Website           | `https://samva.dev`                                                        |
| MCP endpoint      | `https://mcp.samva.dev`                                                    |
| Authentication    | OAuth protected-resource discovery; private API-key alternative            |
| Privacy policy    | `https://samva.dev/legal/privacy`                                          |
| Terms             | `https://samva.dev/legal/terms`                                            |
| Support           | `support@samva.dev`                                                        |
| Source            | `https://github.com/AryaLabsHQ/samva-integrations/tree/main/plugins/samva` |
| Icon              | `assets/icon.png`                                                          |
| Starter prompts   | The three `interface.defaultPrompt` values in the Codex manifest           |

The manifest and reviewer packet are prepared; no submission or approval is
claimed.

## External gates

- **Reviewer account:** provision outside this repository an isolated Samva
  reviewer organization and reviewer email/password. It must not depend on MFA,
  email-link verification, SMS, a customer account, or a personal mailbox.
  Credentials are supplied privately to the review platform and never added to
  this bundle.
- **Domain challenge:** if OpenAI issues a domain challenge, place only its
  supplied challenge response at the required Samva domain location, deploy it,
  and request a platform rescan. The challenge value, deployment, and rescan are
  external approval gates; none has occurred as part of this PR.
- **Submission:** a maintainer must review the final form, credentials, and
  live endpoint, then explicitly approve the portal submission.
