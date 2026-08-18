# Releasing Samva integration packages

This repository uses [Tegami](https://tegami.fuma-nama.dev) for changelogs,
version pull requests, npm publication, Git tags, and GitHub Releases.
Releases are attended local sessions; GitHub Actions does not publish packages.

The public packages version independently:

- `@samva/better-auth` — release group `better-auth`
- `@samva/email-sdk` — release group `email-sdk`

## Queue a change

Run `bun run tegami` to create a pending file under `.tegami/`, or write one as
`YYYY-MM-DD-{hash}.md`:

```md
---
packages:
  "@samva/email-sdk": patch
---

## Preserve Email SDK metadata

The adapter now forwards normalized metadata to Samva.
```

Use `@samva/better-auth`, `@samva/email-sdk`, `group:better-auth`, or
`group:email-sdk` as the package key, with a `patch`, `minor`, or `major` bump.
Commit the pending changelog with the user-visible change it describes. Do not
edit package `CHANGELOG.md` files or `.tegami/publish-lock.yaml` directly.

## Prepare the version pull request

Start from a clean, current `main` with GitHub CLI authentication:

```sh
bun install --frozen-lockfile
bun run version:packages
```

The version command passes the authenticated `gh` token to Tegami. Tegami
consumes pending changelogs, updates package versions and changelogs, refreshes
`bun.lock`, writes `.tegami/publish-lock.yaml`, pushes `tegami/version-packages`,
and opens or updates a pull request against `main`. Review and merge that pull
request before publishing.

## Publish

From the clean, current merged `main`, authenticate npm and run the attended
release:

```sh
npm whoami
gh auth status
bun run release
```

The release command runs the full repository gates, passes the authenticated
`gh` token to Tegami, audits each canonical npm tarball, publishes planned
packages, then pushes group tags and creates matching GitHub Releases.

Verify the result for each affected package:

```sh
npm view @samva/better-auth version dist-tags --json
npm view @samva/email-sdk version dist-tags --json
gh release list --limit 10
```

Do not publish from a dirty worktree. If a release stops partway through, check
npm versions, Git tags, GitHub Releases, and Tegami publish status before
resuming or cleaning up the publish lock.
