import { Text } from "react-email";

import { ActionButton, AuthEmail, FallbackLink, type LinkEmailProps } from "./shared.tsx";

export function Invite({ url }: LinkEmailProps) {
  return (
    <AuthEmail title="You're invited">
      <Text>Accept the invitation to join this Supabase project.</Text>
      <ActionButton url={url}>Accept invitation</ActionButton>
      <FallbackLink url={url} />
    </AuthEmail>
  );
}
