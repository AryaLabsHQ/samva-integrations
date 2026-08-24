# Claude remote connector preparation

This repository does not package a Claude plugin. For a Claude remote MCP
connector, use the canonical endpoint `https://mcp.samva.dev` without a path
suffix and without embedding credentials. The endpoint uses Streamable HTTP
and publishes OAuth protected-resource metadata for interactive login.

Expected review path:

1. Add the remote connector URL.
2. Complete OAuth discovery and user authorization.
3. Confirm the organization before allowing a live mutation.
4. Compare discovered tools and resources with `skills/samva/references/mcp.md`.

API keys are an alternative for unattended, single-organization clients, but
belong in private client configuration and are not part of this bundle.

## Data and permission boundaries

- Every tool is organization-scoped by the authenticated API key or OAuth
  session. An API key selects one organization; an OAuth reviewer must confirm
  the active organization before invoking a mutation.
- Read tools expose that organization's email configuration, messages, events,
  inbound email, contacts, campaigns, templates, webhooks, usage, and readiness
  data. The connector does not expose billing status, entitlements, or billing
  portal actions.
- Write tools can persist Samva resources. Delivery tools can send email to
  recipients or webhook payloads to customer-configured endpoints; their
  destructive/open-world annotations must remain visible in the client.
- Use synthetic reviewer addresses, content, domains, templates, and webhook
  endpoints. Do not inspect or send customer data during review.

## Inventory reconciliation

The connector acceptance target is exactly **70 uniquely named tools** and
**5 resources**. Every tool must have a non-empty title and description, an
object input schema, and all four MCP annotations. Reconcile the six
destructive external-delivery tools and the two closed-world cases listed in
[`openai.md`](./openai.md) against the final Samva PR `#1083` inventory.

The expected resources are:

- `samva://guide/email`
- `samva://guide/template-editor`
- `samva://guide/scheduling`
- `samva://reference/sml-agent-contract`
- `samva://reference/sml`

## Inspector/custom-connector ledger schema

Create one ledger row per discovered tool and do not mark the connector ready
until there are exactly 70 unique `tool` rows. This is a fillable schema; no
Inspector or Claude test run is claimed here.

```json
{
  "connector": "claude-remote-mcp",
  "endpoint": "https://mcp.samva.dev",
  "reviewedServerVersion": null,
  "reviewedAt": null,
  "reviewer": null,
  "toolCount": 70,
  "resourceCount": 5,
  "tools": [
    {
      "tool": "<exact tools/list name>",
      "present": null,
      "titleAndDescription": null,
      "inputSchemaObject": null,
      "annotations": {
        "readOnlyHint": null,
        "destructiveHint": null,
        "idempotentHint": null,
        "openWorldHint": null
      },
      "permissionPromptMatched": null,
      "testInputClass": "synthetic-read | synthetic-write | not-invoked-destructive",
      "expectedOutcome": "<reviewer fills>",
      "actualOutcome": null,
      "status": "not-run",
      "evidence": null
    }
  ],
  "resources": [
    {
      "uri": "<exact resources/list URI>",
      "readSucceeded": null,
      "status": "not-run",
      "evidence": null
    }
  ]
}
```

## External gate

Claude review requires an isolated Samva reviewer organization and a private
reviewer email/password with no MFA, email-link verification, SMS, customer
account, or personal-mailbox dependency. Provisioning and transferring those
credentials, configuring the custom connector, running the ledger, and
submitting it for review are external gates and have not occurred in this PR.
