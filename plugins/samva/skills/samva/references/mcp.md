# Hosted MCP

Use Samva's hosted MCP server when an AI agent needs live, organization-scoped email tools.

- Endpoint: `https://mcp.samva.dev`
- Transport: Streamable HTTP
- API key: `X-API-Key: samva_sk_live_...` or `Authorization: Bearer samva_sk_live_...`
- OAuth: `Authorization: Bearer <token>` through protected-resource discovery

An OAuth-capable client can connect with only the endpoint URL. For unattended agents, configure a
production API key from the Samva dashboard.

```json
{
  "mcpServers": {
    "samva": {
      "type": "http",
      "url": "https://mcp.samva.dev",
      "headers": { "X-API-Key": "samva_sk_live_your_api_key" }
    }
  }
}
```

## Public tool families

Use tool discovery for input schemas. The current public families are:

<!-- email-launch-mcp-tools:start -->

| Family             | Tools                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Contacts           | `contacts_find_or_create`                                                                                                                                                                                                                                                                                                                                                            |
| Messages           | `messages_send_email`, `messages_get`, `messages_list_email`, `messages_get_email_status`, `messages_list_email_events`                                                                                                                                                                                                                                                              |
| Conversations      | `conversations_get`                                                                                                                                                                                                                                                                                                                                                                  |
| Email tracking     | `email_tracking_get_defaults`, `email_tracking_update_defaults`, `email_tracking_get_recipient`, `email_tracking_update_recipient`                                                                                                                                                                                                                                                   |
| Domains            | `email_domains_add`, `email_domains_list`, `email_domains_get`, `email_domains_verify`, `email_domains_check_verification`, `email_domains_get_status`, `email_domains_remove`, `email_domains_enable_receiving`, `email_domains_enable_custom_tracking`, `email_domains_get_custom_tracking`, `email_domains_disable_custom_tracking`                                               |
| Senders            | `email_senders_add`, `email_senders_list`, `email_senders_get`, `email_senders_check_verification`, `email_senders_remove`                                                                                                                                                                                                                                                           |
| Webhooks           | `webhooks_create`, `webhooks_list`, `webhooks_get`, `webhooks_update`, `webhooks_delete`, `webhooks_test`, `webhooks_list_logs`, `webhooks_get_stats`, `webhooks_retry_delivery`, `webhooks_rotate_secret`                                                                                                                                                                           |
| Usage and proof    | `usage_get`, `email_get_stats`, `email_check_readiness`, `email_get_launch_proof`                                                                                                                                                                                                                                                                                                    |
| Template documents | `templates_open_document`, `templates_read_source`, `templates_read_model`, `templates_apply_ops`, `templates_write_source`, `templates_render_document`, `templates_check_document`, `templates_send_test_email`, `templates_save_document`, `templates_list_document_versions`, `templates_publish_document`, `templates_unpublish_document`, `templates_restore_document_version` |
| Scheduled email    | `scheduled_messages_schedule_email`, `scheduled_messages_list`, `scheduled_messages_get`, `scheduled_messages_cancel`                                                                                                                                                                                                                                                                |
| Campaigns          | `campaigns_create`, `campaigns_update`, `campaigns_list`, `campaigns_get`, `campaigns_archive`, `campaigns_schedule_run`, `campaigns_list_runs`, `campaigns_get_run`, `campaigns_control_run`, `campaigns_list_recipients`                                                                                                                                                           |

<!-- email-launch-mcp-tools:end -->

The hosted MCP surface provides usage totals and email proof reads. It does not provide entitlement,
billing-status, or billing-portal tools.

## Resources

| URI                                    | Contents                                                    |
| -------------------------------------- | ----------------------------------------------------------- |
| `samva://guide/email`                  | Send, status, domain, sender, inbound, and webhook workflow |
| `samva://guide/template-editor`        | Durable template-document workflow                          |
| `samva://guide/scheduling`             | Scheduled email and campaign workflow                       |
| `samva://reference/sml-agent-contract` | Compact machine-readable SML authoring contract             |
| `samva://reference/sml`                | Full SML language reference                                 |

## Retry a transactional send safely

Pass an `idempotencyKey` to `messages_send_email` before a request might be retried. Reuse the
same key only with byte-for-byte equivalent logical input. An identical replay returns the original
email; changing the request while reusing the key returns a conflict.

The tool's static MCP annotation remains `idempotentHint: false`. That hint describes the tool in
general because `idempotencyKey` is optional. It does not change per call. Treat a specific send as
retry-safe only when you supplied a stable key.

## Template editing

Template authoring is document-based. The caller must already have a template id. Follow the
revision-safe sequence in [template authoring](template-authoring.md). Draft writes update the
durable document; explicit Save creates a delivery version, and publish/unpublish/restore operate
only on those saved versions.
