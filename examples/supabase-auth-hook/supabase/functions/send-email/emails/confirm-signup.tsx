import { Text } from "react-email";

import { ActionButton, AuthEmail, FallbackLink, type LinkEmailProps } from "./shared.tsx";

export function ConfirmSignup({ url }: LinkEmailProps) {
  return (
    <AuthEmail title="Confirm your email">
      <Text>Confirm this email address to finish creating your account.</Text>
      <ActionButton url={url}>Confirm email</ActionButton>
      <FallbackLink url={url} />
    </AuthEmail>
  );
}
