# Cursor reviewer preparation

The root `.cursor-plugin/marketplace.json` points to `plugins/samva`. The nested
manifest loads the canonical skill directory and `mcp.json`; that MCP file has
one credential-free HTTP server at `https://mcp.samva.dev`.

Cursor `3.13.0` is the minimum declared version, matching current official
third-party remote-MCP plugin examples. OAuth-capable clients discover Samva's
authorization server from the protected-resource metadata returned by the MCP
origin.

The description deliberately says "operate" rather than "read" because the
canonical tool inventory includes email sends and resource mutations. No
plugin variable asks a user to persist a key in marketplace metadata.

## Local install and test procedure

Cursor's local-plugin convention is
`~/.cursor/plugins/local/<plugin-name>/`. A reviewer can exercise this checkout
without publishing it:

```bash
test ! -e ~/.cursor/plugins/local/samva
mkdir -p ~/.cursor/plugins/local
cp -R plugins/samva ~/.cursor/plugins/local/samva
```

Then reload Cursor, confirm **Samva** appears as a local plugin, inspect that it
loads one skill and one remote MCP server, and complete OAuth discovery. Run
the reviewer prompts in [`test-cases.md`](./test-cases.md) only with synthetic
data and explicit approval for live mutations. Remove the copied local plugin
after review. This repository delivery did not perform a user-level install.

## Submission preparation and external gate

The marketplace and nested manifest prepare the plugin name, display name,
version, minimum Cursor version, description, author, homepage, repository,
license, icon, keywords, category, tags, skills path, and MCP path. The Cursor
submission form, reviewer credentials, any requested evidence upload, final
submission, and marketplace publication remain external approval gates; none
is claimed by this PR.
