# Samva AI SDK Tools

AI SDK-compatible tools for Samva products.

## Mailbox

```ts
import { generateText } from "ai";
import { mailboxTools } from "@samva/ai-sdk/mailbox";

const tools = mailboxTools({
  apiKey: process.env.SAMVA_API_KEY!,
  mailboxId: process.env.SAMVA_MAILBOX_ID!,
});

await generateText({
  model,
  tools,
  prompt: "Summarize the latest pending mailbox thread and draft a reply.",
});
```

By default, `mailboxTools()` exposes read and draft tools only. Send/reply tools
are opt-in and route through Samva mailbox policy gates:

```ts
import { mailboxTools, samvaMailboxToolApproval } from "@samva/ai-sdk/mailbox";

const tools = mailboxTools({
  apiKey: process.env.SAMVA_API_KEY!,
  mailboxId: process.env.SAMVA_MAILBOX_ID!,
  capabilities: { send: true },
  ...samvaMailboxToolApproval({ mode: "requireApproval" }),
});
```

The send tools propose mailbox actions with `source: "aiSdkTool"`. Depending on
the mailbox policy, Samva may return `accepted`, `approvalRequired`, or `denied`.
The mailbox UI remains the approval and audit surface.
