import { render, toPlainText } from "react-email";
import { createClient } from "samva";

import VerifyEmail from "../emails/verify-email";

const apiKey = process.env.SAMVA_API_KEY;
if (!apiKey) {
  throw new Error("SAMVA_API_KEY is not set. Copy .env.example to .env and add your key.");
}

const samva = createClient({ apiKey });

// Render the template once, then derive a plain-text fallback from the HTML.
const html = await render(
  <VerifyEmail url="https://app.example.com/verify?token=abc123" name="Ada" />,
);
const text = toPlainText(html);

// No `from` — Samva sends from the verified sender configured on your account.
const message = await samva.messages.send({
  to: [{ email: "ada@example.com" }],
  channel: "email",
  email: { subject: "Verify your email", html, text },
});

console.log("Sent message:", message);
