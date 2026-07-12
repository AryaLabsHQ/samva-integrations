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

## Cookbooks

- [`Hono on Cloudflare Workers`](./cookbooks/hono-cloudflare-workers.md)
- [`Next.js`](./cookbooks/nextjs.md)
- [`React Email`](./cookbooks/react-email.md)

Integrations land as individual pull requests. See
[CONTRIBUTING.md](./CONTRIBUTING.md) to propose or build one.

## Examples

- [`nextjs-transactional`](./examples/nextjs-transactional) — App Router
  contact form plus `/api/send` route handler using the Samva SDK.

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
