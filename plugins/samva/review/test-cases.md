# Reviewer test cases

## Positive

| Case                                          | Expected result                                                             |
| --------------------------------------------- | --------------------------------------------------------------------------- |
| Parse both manifests and the root marketplace | All referenced paths stay inside `plugins/samva` and exist                  |
| Inspect both MCP configs                      | Exactly one HTTP server named `samva` targets `https://mcp.samva.dev`       |
| Load the skill                                | `SKILL.md` resolves all six canonical references                            |
| Verify provenance                             | Version matches both manifests and `SKILL.md`; local bundle digest matches  |
| Scan distributable text and JSON              | No embedded credentials, challenge tokens, portal IDs, or submission claims |

## Negative

The focused test suite copies the bundle to a temporary directory and proves
the validator rejects:

- a non-canonical MCP endpoint
- an MCP configuration containing an authorization header
- a missing skill reference
- a path that escapes the plugin root
- a changed skill file with a stale digest
- unsupported product and submission claims
