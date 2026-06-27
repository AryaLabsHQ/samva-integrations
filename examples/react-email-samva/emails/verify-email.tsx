import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "react-email";

export interface VerifyEmailProps {
  /** The verification link the recipient clicks to confirm their address. */
  url: string;
  /** The recipient's name, for a warmer greeting. Optional. */
  name?: string;
}

export const VerifyEmail = ({ url, name }: VerifyEmailProps) => (
  <Tailwind>
    <Html lang="en">
      <Head />
      <Preview>Confirm your email address to finish setting up your account</Preview>
      <Body className="bg-gray-100 py-[40px] font-sans">
        <Container className="mx-auto max-w-[465px] rounded-[12px] bg-white px-[40px] py-[32px]">
          <Heading className="m-0 text-[22px] font-bold text-gray-900">Confirm your email</Heading>
          <Text className="mt-[16px] text-[15px] leading-[24px] text-gray-700">
            {name ? `Hi ${name},` : "Hi,"} thanks for signing up. Confirm this email address to
            activate your account and start sending.
          </Text>
          <Section className="mt-[28px] text-center">
            <Button
              href={url}
              className="rounded-[8px] bg-gray-900 px-[28px] py-[14px] text-[14px] font-semibold text-white"
            >
              Verify email address
            </Button>
          </Section>
          <Text className="mt-[28px] mb-[8px] text-[13px] leading-[22px] text-gray-500">
            Or paste this link into your browser:
          </Text>
          <Link href={url} className="text-[13px] break-all text-gray-700 underline">
            {url}
          </Link>
          <Hr className="my-[28px] border-gray-200" />
          <Text className="m-0 text-[12px] leading-[20px] text-gray-400">
            You received this because someone signed up with this address. If you did not request
            it, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  </Tailwind>
);

VerifyEmail.PreviewProps = {
  url: "https://app.example.com/verify?token=abc123",
  name: "Ada",
} satisfies VerifyEmailProps;

export default VerifyEmail;
