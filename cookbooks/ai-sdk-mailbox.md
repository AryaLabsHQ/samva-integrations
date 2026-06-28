# AI SDK Mailbox Tools

Use `@samva/ai-sdk/mailbox` when an AI app needs to inspect, draft, or
policy-gate replies from a Samva programmable mailbox.

## Install

```sh
bun add ai @samva/ai-sdk
```

## Safe default toolset

```ts
import { streamText } from "ai";
import { mailboxTools } from "@samva/ai-sdk/mailbox";

const result = streamText({
  model,
  tools: mailboxTools({
    apiKey: process.env.SAMVA_API_KEY!,
    mailboxId: process.env.SAMVA_MAILBOX_ID!,
  }),
  prompt: "Find urgent inbound threads and draft concise replies.",
});
```

The default toolset can list threads, read thread items/messages/drafts, and
create or update drafts. It cannot send email.

## Approval-aware sends

```ts
import { mailboxTools, samvaMailboxToolApproval } from "@samva/ai-sdk/mailbox";

const tools = mailboxTools({
  apiKey: process.env.SAMVA_API_KEY!,
  mailboxId: process.env.SAMVA_MAILBOX_ID!,
  capabilities: { send: true },
  ...samvaMailboxToolApproval({ mode: "requireApproval" }),
});
```

`sendMailboxReply` and `sendMailboxEmail` call Samva's mailbox action API with
`source: "aiSdkTool"`. The result is structured:

- `accepted` means Samva policy allowed the action.
- `approvalRequired` means the mailbox UI should collect approval.
- `denied` means policy blocked the action.

Avoid granting send tools to autonomous agents until the mailbox policy is
configured for that use case.
