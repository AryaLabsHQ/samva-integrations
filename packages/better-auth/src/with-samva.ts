import type { BetterAuthOptions } from "better-auth";
import { emailOTP, magicLink, organization, twoFactor } from "better-auth/plugins";

import { samvaEmail } from "./fragments";
import type { SamvaBetterAuthOptions } from "./types";

type EmailOtpOptions = Omit<NonNullable<Parameters<typeof emailOTP>[0]>, "sendVerificationOTP">;
type TwoFactorOptions = Omit<NonNullable<Parameters<typeof twoFactor>[0]>, "otpOptions"> & {
  readonly otpOptions?: Omit<
    NonNullable<NonNullable<Parameters<typeof twoFactor>[0]>["otpOptions"]>,
    "sendOTP"
  >;
};
type MagicLinkOptions = Omit<NonNullable<Parameters<typeof magicLink>[0]>, "sendMagicLink">;
type OrganizationOptions = Omit<
  NonNullable<Parameters<typeof organization>[0]>,
  "sendInvitationEmail"
>;

export type SamvaBetterAuthPluginOptions = {
  readonly emailOTP?: boolean | EmailOtpOptions;
  readonly twoFactor?: boolean | TwoFactorOptions;
  readonly magicLink?: boolean | MagicLinkOptions;
  readonly organization?: boolean | OrganizationOptions;
};

export type SamvaBetterAuthTransformOptions = SamvaBetterAuthOptions & {
  readonly plugins?: SamvaBetterAuthPluginOptions;
};

type MutableOptions = BetterAuthOptions & {
  emailVerification?: BetterAuthOptions["emailVerification"];
  emailAndPassword?: BetterAuthOptions["emailAndPassword"];
  user?: BetterAuthOptions["user"];
  plugins?: Array<unknown>;
};

type SamvaEmailOptionsShape = {
  readonly emailVerification: ReturnType<typeof samvaEmail>["emailVerification"];
  readonly emailAndPassword: ReturnType<typeof samvaEmail>["emailAndPassword"];
  readonly user?: BetterAuthOptions["user"];
  readonly plugins?: BetterAuthOptions["plugins"];
};

function mergeIfMissing<T extends Record<string, unknown>, K extends string>(
  target: T | undefined,
  key: K,
  value: unknown,
): T & Record<K, unknown> {
  return {
    ...(target ?? {}),
    ...((target as Record<K, unknown> | undefined)?.[key] === undefined ? { [key]: value } : {}),
  } as T & Record<K, unknown>;
}

function pluginConfig<T extends Record<string, unknown>>(value: boolean | T | undefined): T {
  return (value === true || value === undefined ? {} : value) as T;
}

export function withSamva<Options extends BetterAuthOptions>(
  options: Options,
  samvaOptions: SamvaBetterAuthTransformOptions,
): Options & SamvaEmailOptionsShape {
  const fragments = samvaEmail(samvaOptions);
  const next = { ...options } as MutableOptions;

  next.emailVerification = mergeIfMissing(
    next.emailVerification,
    "sendVerificationEmail",
    fragments.emailVerification.sendVerificationEmail,
  );
  next.emailAndPassword = mergeIfMissing(
    next.emailAndPassword,
    "sendResetPassword",
    fragments.emailAndPassword.sendResetPassword,
  );
  if (next.user?.changeEmail || next.user?.deleteUser) {
    next.user = {
      ...next.user,
      ...(next.user.changeEmail
        ? {
            changeEmail: mergeIfMissing(
              next.user.changeEmail,
              "sendChangeEmailConfirmation",
              fragments.user.changeEmail.sendChangeEmailConfirmation,
            ),
          }
        : {}),
      ...(next.user.deleteUser
        ? {
            deleteUser: mergeIfMissing(
              next.user.deleteUser,
              "sendDeleteAccountVerification",
              fragments.user.deleteUser.sendDeleteAccountVerification,
            ),
          }
        : {}),
    };
  }

  const configuredPlugins = samvaOptions.plugins;
  const plugins = [...(next.plugins ?? [])];

  if (configuredPlugins?.emailOTP) {
    plugins.push(
      emailOTP({
        ...pluginConfig(configuredPlugins.emailOTP),
        sendVerificationOTP: fragments.plugins.emailOTP.sendVerificationOTP,
      }),
    );
  }

  if (configuredPlugins?.twoFactor) {
    const config = pluginConfig(configuredPlugins.twoFactor);
    plugins.push(
      twoFactor({
        ...config,
        otpOptions: {
          ...config.otpOptions,
          sendOTP: fragments.plugins.twoFactor.otpOptions.sendOTP,
        },
      }),
    );
  }

  if (configuredPlugins?.magicLink) {
    plugins.push(
      magicLink({
        ...pluginConfig(configuredPlugins.magicLink),
        sendMagicLink: fragments.plugins.magicLink.sendMagicLink,
      }),
    );
  }

  if (configuredPlugins?.organization) {
    plugins.push(
      organization({
        ...pluginConfig(configuredPlugins.organization),
        sendInvitationEmail: fragments.plugins.organization.sendInvitationEmail,
      }),
    );
  }

  if (plugins.length > 0) {
    next.plugins = plugins as NonNullable<BetterAuthOptions["plugins"]>;
  }

  return next as Options & SamvaEmailOptionsShape;
}
