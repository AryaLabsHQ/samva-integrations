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
