import type { Awaitable, BetterAuthOptions } from "better-auth";
import type {
  EmailOTPOptions,
  MagicLinkOptions,
  OrganizationOptions,
  TwoFactorOptions,
} from "better-auth/plugins";

export type SamvaClient = {
  readonly messages: {
    readonly send: (input: {
      readonly to: ReadonlyArray<{ readonly email: string }>;
      readonly channel: "email";
      readonly email: {
        readonly subject: string;
        readonly html: string;
        readonly text?: string;
      };
    }) => Promise<unknown>;
  };
};

export type SamvaClientInput =
  | {
      readonly client: SamvaClient;
      readonly apiKey?: never;
      readonly baseUrl?: never;
    }
  | {
      readonly apiKey: string;
      readonly baseUrl?: string;
      readonly client?: never;
    };

type CallbackData<Callback> = Callback extends (data: infer Data, ...args: infer _Rest) => unknown
  ? Data
  : never;

export type VerificationEmailData = CallbackData<
  NonNullable<NonNullable<BetterAuthOptions["emailVerification"]>["sendVerificationEmail"]>
>;

export type ResetPasswordData = CallbackData<
  NonNullable<NonNullable<BetterAuthOptions["emailAndPassword"]>["sendResetPassword"]>
>;

export type ChangeEmailData = CallbackData<
  NonNullable<
    NonNullable<
      NonNullable<BetterAuthOptions["user"]>["changeEmail"]
    >["sendChangeEmailConfirmation"]
  >
>;

export type DeleteAccountData = CallbackData<
  NonNullable<
    NonNullable<
      NonNullable<BetterAuthOptions["user"]>["deleteUser"]
    >["sendDeleteAccountVerification"]
  >
>;

export type EmailOtpData = CallbackData<EmailOTPOptions["sendVerificationOTP"]>;

export type TwoFactorOtpData = CallbackData<
  NonNullable<NonNullable<TwoFactorOptions["otpOptions"]>["sendOTP"]>
>;

export type MagicLinkData = CallbackData<MagicLinkOptions["sendMagicLink"]>;

export type OrganizationInvitationData = CallbackData<
  NonNullable<OrganizationOptions["sendInvitationEmail"]>
>;

export type SamvaEmailDataByTrigger = {
  readonly verification: VerificationEmailData;
  readonly resetPassword: ResetPasswordData;
  readonly changeEmail: ChangeEmailData;
  readonly deleteAccount: DeleteAccountData;
  readonly emailOtp: EmailOtpData;
  readonly twoFactorOtp: TwoFactorOtpData;
  readonly magicLink: MagicLinkData;
  readonly organizationInvitation: OrganizationInvitationData;
};

export type SamvaEmailTrigger = keyof SamvaEmailDataByTrigger;

export type SamvaRenderedEmail = {
  readonly subject: string;
  readonly html: string;
  readonly text?: string;
};

export type SamvaTemplateOutput =
  | string
  | {
      readonly subject?: string;
      readonly html: string;
      readonly text?: string;
    }
  | unknown;

export type SamvaTemplate<Trigger extends SamvaEmailTrigger> = (
  data: SamvaEmailDataByTrigger[Trigger],
) => Awaitable<SamvaTemplateOutput>;

export type SamvaTemplates = {
  readonly [Trigger in SamvaEmailTrigger]?: SamvaTemplate<Trigger>;
};

export type SamvaBetterAuthOptions = SamvaClientInput & {
  readonly appUrl?: string;
  readonly templates?: SamvaTemplates;
};

export async function createSamvaClient(input: SamvaClientInput): Promise<SamvaClient> {
  if ("client" in input && input.client) {
    return input.client;
  }

  const { createClient } = await import("samva");
  return createClient({
    apiKey: input.apiKey,
    ...(input.baseUrl ? { baseUrl: input.baseUrl } : {}),
  });
}
