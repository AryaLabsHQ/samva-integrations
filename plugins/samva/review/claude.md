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
