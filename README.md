# Samva Integrations

Open-source packages, examples, and cookbooks for integrating
[Samva](https://samva.app) into real applications.

Use these to send transactional email, connect auth email flows, work with
templates, handle delivery events, verify signed webhooks, and build
conversation-aware email workflows.

## Structure

- `packages/*` — published integration packages (`@samva/*`).
- `examples/*` — complete, runnable example apps.
- `cookbooks/*.md` — documentation-first, copy-pasteable recipes.

## Packages

- `@samva/ai-sdk` — AI SDK-compatible Samva tools, including
  `@samva/ai-sdk/mailbox` for programmable mailbox read, draft, and
  approval-aware send tools.

## Cookbooks

- [`AI SDK Mailbox Tools`](./cookbooks/ai-sdk-mailbox.md)

Integrations land as individual pull requests. See
[CONTRIBUTING.md](./CONTRIBUTING.md) to propose or build one.

## Getting started

This is a [Bun](https://bun.com) + [Turborepo](https://turborepo.com) monorepo.

```sh
bun install
bun run build
bun run typecheck
bun run test
bun run lint
bun run format:check
```

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) for local
setup, package conventions, and how to propose a new integration.

## Security

To report a vulnerability, see [SECURITY.md](./SECURITY.md). Please do not file
public issues for security reports.

## License

[MIT](./LICENSE) © Arya Labs, Inc.
