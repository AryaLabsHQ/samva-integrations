import { Text } from "react-email";

import { AuthEmail, OtpCode, type OtpEmailProps } from "./shared.tsx";

export function Reauth({ otp }: OtpEmailProps) {
  return (
    <AuthEmail title="Confirm it's you">
      <Text>Enter this code to continue the sensitive action in your account.</Text>
      <OtpCode otp={otp} />
    </AuthEmail>
  );
}
