export type CoreEmailActionType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "reauthentication";

export interface EmailData {
  readonly token: string;
  readonly token_hash: string;
  readonly redirect_to: string;
  readonly email_action_type: string;
  readonly site_url: string;
  readonly token_new?: string;
  readonly token_hash_new?: string;
  readonly old_email?: string;
}

export interface User {
  readonly id: string;
  readonly email: string;
  readonly new_email?: string;
  readonly aud?: string;
  readonly role?: string;
  readonly app_metadata?: Record<string, unknown>;
  readonly user_metadata?: Record<string, unknown>;
}

export interface SendEmailHookPayload {
  readonly user: User;
  readonly email_data: EmailData;
}

export interface SendEmailInput {
  readonly to: ReadonlyArray<{ readonly email: string }>;
  readonly channel: "email";
  readonly email: {
    readonly subject: string;
    readonly html: string;
    readonly text: string;
  };
}

export interface SamvaClient {
  readonly messages: {
    send(input: SendEmailInput): Promise<unknown>;
  };
}

export interface HookEnv {
  readonly SAMVA_API_KEY?: string;
  readonly SEND_EMAIL_HOOK_SECRET?: string;
  readonly SUPABASE_AUTH_URL?: string;
  readonly SUPABASE_PROJECT_REF?: string;
}
