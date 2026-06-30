import type { ReactNode } from "react";
import { Body, Button, Container, Head, Heading, Html, Link, Section, Text } from "react-email";

export interface LinkEmailProps {
  readonly url: string;
}

export interface OtpEmailProps {
  readonly otp: string;
}

export interface LinkAndOtpEmailProps extends LinkEmailProps, OtpEmailProps {}

interface AuthEmailProps {
  readonly title: string;
  readonly children: ReactNode;
}

export function AuthEmail({ title, children }: AuthEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>{title}</Heading>
          {children}
          <Text style={styles.footer}>
            This message was sent by Samva for a Supabase Auth flow.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function ActionButton({ url, children }: LinkEmailProps & { readonly children: ReactNode }) {
  return (
    <Section style={styles.section}>
      <Button href={url} style={styles.button}>
        {children}
      </Button>
    </Section>
  );
}

export function FallbackLink({ url }: LinkEmailProps) {
  return (
    <Text style={styles.text}>
      If the button does not open, use this link: <Link href={url}>{url}</Link>
    </Text>
  );
}

export function OtpCode({ otp }: OtpEmailProps) {
  return <Text style={styles.otp}>{otp}</Text>;
}

const styles = {
  body: {
    backgroundColor: "#f6f7f9",
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    padding: "32px 0",
  },
  container: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    margin: "0 auto",
    maxWidth: "480px",
    padding: "32px",
  },
  heading: {
    color: "#111827",
    fontSize: "22px",
    lineHeight: "30px",
    margin: "0 0 16px",
  },
  text: {
    color: "#374151",
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 16px",
  },
  section: {
    margin: "24px 0",
  },
  button: {
    backgroundColor: "#111827",
    borderRadius: "6px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "14px",
    fontWeight: 600,
    padding: "12px 18px",
    textDecoration: "none",
  },
  otp: {
    backgroundColor: "#f3f4f6",
    borderRadius: "6px",
    color: "#111827",
    fontSize: "28px",
    fontWeight: 700,
    letterSpacing: "4px",
    lineHeight: "36px",
    margin: "20px 0",
    padding: "14px 18px",
    textAlign: "center" as const,
  },
  footer: {
    color: "#6b7280",
    fontSize: "12px",
    lineHeight: "18px",
    margin: "24px 0 0",
  },
};
