export type Awaitable<T> = T | Promise<T>;

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

export type BetterAuthUser = {
  readonly id?: string;
  readonly name?: string | null;
  readonly email: string;
};

export type VerificationEmailData = {
  readonly user: BetterAuthUser;
  readonly url: string;
  readonly token: string;
};

export type ResetPasswordData = VerificationEmailData;

export type ChangeEmailData = {
  readonly user: BetterAuthUser;
  readonly newEmail: string;
  readonly url: string;
  readonly token: string;
};

export type DeleteAccountData = VerificationEmailData;

export type EmailOtpData = {
  readonly email: string;
  readonly otp: string;
  readonly type: "sign-in" | "email-verification" | "forget-password" | "change-email";
};

export type TwoFactorOtpData = {
  readonly user: BetterAuthUser;
  readonly otp: string;
};

export type MagicLinkData = {
  readonly email: string;
  readonly url: string;
  readonly token: string;
  readonly metadata?: Record<string, unknown>;
};

export type OrganizationInvitationData = {
  readonly id: string;
  readonly role: string;
  readonly email: string;
  readonly organization: {
    readonly name?: string | null;
    readonly slug?: string | null;
  };
  readonly invitation: unknown;
  readonly inviter: {
    readonly user?: BetterAuthUser;
  };
};

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
