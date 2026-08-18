import { createEmailClient } from "@opencoredev/email-sdk";
import { samva } from "@samva/email-sdk";

function requiredEnvironment(name: "SAMVA_API_KEY" | "SAMVA_FROM" | "SAMVA_TO"): string {
  const value = Bun.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const email = createEmailClient({
  adapters: [samva({ apiKey: requiredEnvironment("SAMVA_API_KEY") })],
});

const result = await email.send({
  from: requiredEnvironment("SAMVA_FROM"),
  to: requiredEnvironment("SAMVA_TO"),
  subject: "Welcome from Samva + Email SDK",
  html: "<p>Your workspace is ready.</p>",
  text: "Your workspace is ready.",
  metadata: { example: "email-sdk" },
});

console.log("Queued email:", { adapter: result.adapter, id: result.id });
