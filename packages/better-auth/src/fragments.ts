import { renderAndSend } from "./core";
import type { SamvaBetterAuthOptions } from "./types";

export function samvaEmail(options: SamvaBetterAuthOptions) {
  return {
    emailVerification: {
      sendVerificationEmail: (data: Parameters<typeof renderAndSend<"verification">>[1]) =>
        renderAndSend("verification", data, options),
    },
    emailAndPassword: {
      sendResetPassword: (data: Parameters<typeof renderAndSend<"resetPassword">>[1]) =>
        renderAndSend("resetPassword", data, options),
    },
    user: {
      changeEmail: {
        sendChangeEmailConfirmation: (data: Parameters<typeof renderAndSend<"changeEmail">>[1]) =>
          renderAndSend("changeEmail", data, options),
      },
      deleteUser: {
        sendDeleteAccountVerification: (
          data: Parameters<typeof renderAndSend<"deleteAccount">>[1],
        ) => renderAndSend("deleteAccount", data, options),
      },
    },
    plugins: {
      emailOTP: {
        sendVerificationOTP: (data: Parameters<typeof renderAndSend<"emailOtp">>[1]) =>
          renderAndSend("emailOtp", data, options),
      },
      twoFactor: {
        otpOptions: {
          sendOTP: (data: Parameters<typeof renderAndSend<"twoFactorOtp">>[1]) =>
            renderAndSend("twoFactorOtp", data, options),
        },
      },
      magicLink: {
        sendMagicLink: (data: Parameters<typeof renderAndSend<"magicLink">>[1]) =>
          renderAndSend("magicLink", data, options),
      },
      organization: {
        sendInvitationEmail: (
          data: Parameters<typeof renderAndSend<"organizationInvitation">>[1],
        ) => renderAndSend("organizationInvitation", data, options),
      },
    },
  };
}
