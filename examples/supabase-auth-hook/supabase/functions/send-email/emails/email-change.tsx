import { Text } from "react-email";

import {
  ActionButton,
  AuthEmail,
  FallbackLink,
  OtpCode,
  type LinkAndOtpEmailProps,
} from "./shared.tsx";

export function EmailChange({ url, otp }: LinkAndOtpEmailProps) {
  return (
    <AuthEmail title="Confirm email change">
      <Text>Confirm this address change with the button below.</Text>
      <ActionButton url={url}>Confirm email change</ActionButton>
      <FallbackLink url={url} />
      {otp ? (
        <>
          <Text>You can also use this verification code:</Text>
          <OtpCode otp={otp} />
        </>
      ) : null}
    </AuthEmail>
  );
}
