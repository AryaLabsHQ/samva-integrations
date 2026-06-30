import { supabaseAuthBaseURL } from "./env.ts";
import type { EmailData, HookEnv, User } from "./types.ts";

interface VerifyURLInput {
  readonly tokenHash: string;
  readonly type: string;
  readonly redirectTo: string;
  readonly siteURL: string;
}

export interface EmailDeliveryTarget {
  readonly email: string;
  readonly verifyURL?: string;
  readonly otp?: string;
}

export function buildVerifyURL(input: VerifyURLInput, env: HookEnv): string {
  const tokenHash = input.tokenHash.trim();
  if (!tokenHash) {
    throw new Error(`Cannot build Supabase verify URL for ${input.type} without token_hash.`);
  }

  const redirectTo = input.redirectTo.trim() || input.siteURL.trim();
  if (!redirectTo) {
    throw new Error(
      `Cannot build Supabase verify URL for ${input.type} without redirect_to or site_url.`,
    );
  }

  const params = new URLSearchParams({
    token: tokenHash,
    type: input.type,
    redirect_to: redirectTo,
  });

  return `${supabaseAuthBaseURL(env)}/auth/v1/verify?${params}`;
}

export function deliveryTargetsForEmailData(
  user: User,
  data: EmailData,
  env: HookEnv,
): ReadonlyArray<EmailDeliveryTarget> {
  if (data.email_action_type === "reauthentication") {
    return [{ email: user.email, otp: data.token }];
  }

  if (data.email_action_type === "email_change") {
    return emailChangeTargets(user, data, env);
  }

  return [
    {
      email: user.email,
      verifyURL: buildVerifyURL(
        {
          tokenHash: data.token_hash,
          type: data.email_action_type,
          redirectTo: data.redirect_to,
          siteURL: data.site_url,
        },
        env,
      ),
    },
  ];
}

function emailChangeTargets(
  user: User,
  data: EmailData,
  env: HookEnv,
): ReadonlyArray<EmailDeliveryTarget> {
  const newEmail = user.new_email?.trim();

  if (data.token_hash_new?.trim()) {
    const targets: EmailDeliveryTarget[] = [
      {
        email: user.email,
        verifyURL: buildVerifyURL(
          {
            tokenHash: data.token_hash_new,
            type: data.email_action_type,
            redirectTo: data.redirect_to,
            siteURL: data.site_url,
          },
          env,
        ),
        otp: data.token,
      },
    ];

    if (!newEmail) {
      throw new Error("Cannot send secure email-change confirmation without user.new_email.");
    }

    const newTarget: EmailDeliveryTarget = {
      email: newEmail,
      verifyURL: buildVerifyURL(
        {
          tokenHash: data.token_hash,
          type: data.email_action_type,
          redirectTo: data.redirect_to,
          siteURL: data.site_url,
        },
        env,
      ),
    };
    const newOtp = data.token_new?.trim();
    targets.push(newOtp ? { ...newTarget, otp: newOtp } : newTarget);

    return targets;
  }

  if (!newEmail) {
    throw new Error("Cannot send email-change confirmation without user.new_email.");
  }

  return [
    {
      email: newEmail,
      verifyURL: buildVerifyURL(
        {
          tokenHash: data.token_hash,
          type: data.email_action_type,
          redirectTo: data.redirect_to,
          siteURL: data.site_url,
        },
        env,
      ),
      otp: data.token_new?.trim() || data.token,
    },
  ];
}
