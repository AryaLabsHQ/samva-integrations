# Better Auth Next.js Example

This example wires a Next.js App Router Better Auth route handler to Samva with
`@samva/better-auth`.

```sh
bun install
cp examples/better-auth-nextjs/.env.example examples/better-auth-nextjs/.env
bun run --filter better-auth-nextjs-samva dev
```

The route handler lives at `app/api/auth/[...all]/route.ts`. It enables
email/password callbacks plus the email OTP plugin.
