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
server remain authoritative. In particular, `messages_send_email` is not
statically idempotent because its `idempotencyKey` is optional, and destructive
domain, sender, webhook, schedule, campaign, and template-version actions must
be approved explicitly.

Reviewers can compare the complete tool and resource inventory in
`skills/samva/references/mcp.md` with MCP `tools/list` and `resources/list`.
