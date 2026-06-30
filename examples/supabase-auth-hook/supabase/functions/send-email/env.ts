import type { HookEnv } from "./types.ts";

export function getRequiredEnv(env: HookEnv, key: keyof HookEnv): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function supabaseAuthBaseURL(env: HookEnv): string {
  const configured = env.SUPABASE_AUTH_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/u, "");
  }

  const projectRef = env.SUPABASE_PROJECT_REF?.trim();
  if (!projectRef) {
    throw new Error(
      "Set SUPABASE_AUTH_URL or SUPABASE_PROJECT_REF before building Supabase verify links.",
    );
  }

  return `https://${projectRef}.supabase.co`;
}
