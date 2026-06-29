import { Body, Container, Head, Heading, Hr, Html, Preview, Text } from "@react-email/components";

export interface WelcomeEmailProps {
  readonly firstName?: string;
}

export default function WelcomeEmail({ firstName }: WelcomeEmailProps) {
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";

  return (
    <Html lang="en">
      <Head />
      <Preview>Welcome to the app</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Welcome</Heading>
          <Text style={styles.text}>{greeting}</Text>
          <Text style={styles.text}>
            Your account is ready. This welcome email was triggered by Clerk's user.created webhook
            and sent through Samva.
          </Text>
          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            Samva sends from the verified sender configured on your account.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: "#f6f7f9",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: "40px 0",
  },
  container: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    margin: "0 auto",
    padding: "32px",
    width: "440px",
  },
  heading: {
    color: "#111827",
    fontSize: "24px",
    lineHeight: "32px",
    margin: "0 0 16px",
  },
  text: {
    color: "#374151",
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 12px",
  },
  hr: {
    borderColor: "#e5e7eb",
    margin: "24px 0",
  },
  footer: {
    color: "#6b7280",
    fontSize: "13px",
    lineHeight: "20px",
    margin: 0,
  },
} as const;

WelcomeEmail.PreviewProps = {
  firstName: "Ada",
} satisfies WelcomeEmailProps;
