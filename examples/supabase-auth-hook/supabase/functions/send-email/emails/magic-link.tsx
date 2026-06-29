import { Text } from "react-email";

import { ActionButton, AuthEmail, FallbackLink, type LinkEmailProps } from "./shared.tsx";

export function MagicLink({ url }: LinkEmailProps) {
  return (
    <AuthEmail title="Your magic link">
      <Text>Use this link to sign in. It expires soon.</Text>
      <ActionButton url={url}>Sign in</ActionButton>
      <FallbackLink url={url} />
    </AuthEmail>
  );
}
