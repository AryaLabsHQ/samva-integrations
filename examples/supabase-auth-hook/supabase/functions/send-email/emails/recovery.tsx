import { Text } from "react-email";

import { ActionButton, AuthEmail, FallbackLink, type LinkEmailProps } from "./shared.tsx";

export function Recovery({ url }: LinkEmailProps) {
  return (
    <AuthEmail title="Reset your password">
      <Text>Use this link to choose a new password for your account.</Text>
      <ActionButton url={url}>Reset password</ActionButton>
      <FallbackLink url={url} />
    </AuthEmail>
  );
}
