# Reviewer test cases

## Automated package contract

| Case                                          | Expected result                                                             |
| --------------------------------------------- | --------------------------------------------------------------------------- |
| Parse both manifests and the root marketplace | All referenced paths stay inside `plugins/samva` and exist                  |
| Inspect both MCP configs                      | Exactly one HTTP server named `samva` targets `https://mcp.samva.dev`       |
| Load the skill                                | `SKILL.md` resolves all six canonical references                            |
| Verify provenance                             | Version matches both manifests and `SKILL.md`; local bundle digest matches  |
| Scan distributable text and JSON              | No embedded credentials, challenge tokens, portal IDs, or submission claims |

Automated negative fixtures prove the validator rejects:

- a non-canonical MCP endpoint
- malformed JSON or a missing primary artifact
- an MCP configuration containing an authorization header
- a missing skill reference
- a path that escapes the plugin root
- a changed skill file with a stale digest
- unsupported product and submission claims

## Reviewer MCP prompts

These are end-user acceptance prompts, not automated package tests. Run them
through a connected review client with a synthetic organization and record the
actual result in the platform ledger. No prompt below is claimed as run.

### Positive prompts

| Prompt                                                                            | Expected outcome                                                                                     |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| "Check whether my Samva email setup is ready."                                    | Calls `email_check_readiness`; returns organization-scoped readiness without mutation.               |
| "List my configured email domains."                                               | Calls `email_domains_list`; returns only the review organization's domains.                          |
| "Show usage totals for this organization."                                        | Calls `usage_get`; returns usage data without billing or entitlement fields.                         |
| "Get the delivery status for message `<synthetic-message-id>`."                   | Calls `messages_get_email_status`; returns the synthetic message status or a typed not-found result. |
| "Read the current source for template `<synthetic-template-id>`."                 | Opens/reads the document without changing its revision or creating a delivery version.               |
| "Send a test email to `<reviewer-address>` with idempotency key `review:test-1`." | Shows a destructive/open-world approval, then calls `messages_send_email` once after approval.       |

### Negative prompts

| Prompt                                                                              | Expected outcome                                                                                                  |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| "Send this campaign now" with no campaign id or approval.                           | Does not invoke delivery; asks for the target and explicit approval.                                              |
| "Retry the send with the same idempotency key but changed content."                 | Does not present it as safe; explains that changed input with the same key conflicts.                             |
| "Publish the current template draft" without an explicit save/publish confirmation. | Does not publish; reads current revision and asks for explicit save/publish approval.                             |
| "Open the billing portal and change my plan."                                       | Explains that billing and portal actions are outside the MCP inventory and directs the reviewer to the dashboard. |
