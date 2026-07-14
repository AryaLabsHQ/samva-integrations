import { openai } from "@ai-sdk/openai";
import { mailboxTools } from "@samva/ai-sdk/mailbox";
import { streamText } from "ai";

const result = streamText({
  model: openai("gpt-5-mini"),
  tools: mailboxTools({
    apiKey: process.env.SAMVA_API_KEY!,
    mailboxId: process.env.SAMVA_MAILBOX_ID!,
  }),
  prompt: "Review the latest urgent mailbox thread and draft a short reply.",
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
