import { tool } from "ai";
import { createClient, type JsonValue, type SamvaClient, type SamvaClientConfig } from "samva";
import { z } from "zod";

export type SamvaMailboxClientConfig = SamvaClientConfig & {
  mailboxId: string;
};

export type SamvaMailboxToolCapabilities = {
  read?: boolean;
  draft?: boolean;
  send?: boolean;
};

export type SamvaMailboxApprovalMode = "samvaPolicy" | "requireApproval";

export type SamvaMailboxToolsConfig = SamvaMailboxClientConfig & {
  capabilities?: SamvaMailboxToolCapabilities;
  approvalMode?: SamvaMailboxApprovalMode;
};

export type SamvaMailboxThreadListQuery = {
  folder?: string | undefined;
  q?: string | undefined;
  read?: "true" | "false" | undefined;
  priority?: "low" | "normal" | "high" | "urgent" | undefined;
  label?: string | undefined;
  cursor?: string | undefined;
  limit?: number | undefined;
};

export type SamvaMailboxClient = {
  mailboxId: string;
  mailboxes: SamvaClient["mailboxes"];
};

const createMailboxContext = (config: SamvaMailboxClientConfig): SamvaMailboxClient => {
  const { mailboxId, ...clientConfig } = config;
  return {
    mailboxId,
    mailboxes: createClient({
      ...clientConfig,
      responseStyle: "data",
      throwOnError: true,
    }).mailboxes,
  };
};

const threadListInput = z.object({
  folder: z.string().optional().describe("Mailbox folder to list, such as inbox or pending."),
  q: z.string().optional().describe("Search query for mailbox threads."),
  read: z.enum(["true", "false"]).optional().describe("Filter by actor read state."),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  label: z.string().optional().describe("Label slug to filter by."),
  cursor: z.string().optional().describe("Pagination cursor from the previous response."),
  limit: z.number().int().positive().max(100).optional(),
});

const threadIdInput = z.object({
  threadId: z.string().describe("Samva mailbox thread id."),
});

const createDraftInput = z.object({
  threadId: z.string().describe("Samva mailbox thread id."),
  subject: z.string().optional().describe("Draft subject, when applicable."),
  text: z.string().optional().describe("Plain-text draft body."),
  html: z.string().optional().describe("HTML draft body."),
  to: z.array(z.string()).optional().describe("Recipient email addresses."),
  cc: z.array(z.string()).optional().describe("CC recipient email addresses."),
  bcc: z.array(z.string()).optional().describe("BCC recipient email addresses."),
  metadata: z.record(z.string(), z.json()).optional(),
});

const updateDraftInput = createDraftInput.extend({
  draftId: z.string().describe("Samva mailbox draft id."),
});

const replyInput = z.object({
  threadId: z.string().describe("Samva mailbox thread id to reply to."),
  draftId: z
    .string()
    .optional()
    .describe("Existing Samva draft id to send or request approval for."),
  text: z.string().optional().describe("Plain-text reply body."),
  html: z.string().optional().describe("HTML reply body."),
  metadata: z.record(z.string(), z.json()).optional(),
});

const sendEmailInput = z.object({
  threadId: z.string().optional().describe("Optional mailbox thread id for contextual sends."),
  to: z.array(z.string()).min(1).describe("Recipient email addresses."),
  cc: z.array(z.string()).optional().describe("CC recipient email addresses."),
  bcc: z.array(z.string()).optional().describe("BCC recipient email addresses."),
  subject: z.string().describe("Email subject."),
  text: z.string().optional().describe("Plain-text email body."),
  html: z.string().optional().describe("HTML email body."),
  metadata: z.record(z.string(), z.json()).optional(),
});

const assertSendCapability = (config: SamvaMailboxToolsConfig) => {
  if (config.capabilities?.send !== true) {
    throw new Error(
      "Send tools are disabled by default. Pass capabilities: { send: true } to opt into policy-gated sends.",
    );
  }
};

const omitUndefined = (input: Record<string, JsonValue | undefined>): Record<string, JsonValue> =>
  Object.fromEntries(
    Object.entries(input).filter((entry): entry is [string, JsonValue] => entry[1] !== undefined),
  );

const approvalPayload = (
  approvalMode: SamvaMailboxApprovalMode | undefined,
  payload: Record<string, JsonValue | undefined>,
) =>
  omitUndefined({
    ...payload,
    approvalMode: approvalMode ?? "samvaPolicy",
    requireApproval: approvalMode === "requireApproval" ? true : undefined,
  });

export const listMailboxThreadsTool = (client: SamvaMailboxClient) =>
  tool({
    description:
      "List Samva mailbox threads. Use this to find recent inbound, pending, or labeled conversations before reading a specific thread.",
    inputSchema: threadListInput,
    execute: async ({ limit, ...query }) =>
      client.mailboxes.listThreads({
        mailboxId: client.mailboxId,
        ...query,
        ...(limit === undefined ? {} : { limit: String(limit) }),
      }),
  });

export const getMailboxThreadTool = (client: SamvaMailboxClient) =>
  tool({
    description:
      "Get a Samva mailbox thread with participants, actor state, and visible timeline item references.",
    inputSchema: threadIdInput,
    execute: async ({ threadId }) =>
      client.mailboxes.getThread({ mailboxId: client.mailboxId, threadId }),
  });

export const listMailboxThreadItemsTool = (client: SamvaMailboxClient) =>
  tool({
    description:
      "List unified timeline items for a Samva mailbox thread, including message, event, action, note, and draft references.",
    inputSchema: threadIdInput,
    execute: async ({ threadId }) =>
      client.mailboxes.listThreadItems({ mailboxId: client.mailboxId, threadId }),
  });

export const listMailboxThreadMessagesTool = (client: SamvaMailboxClient) =>
  tool({
    description: "List message references for a Samva mailbox thread.",
    inputSchema: threadIdInput,
    execute: async ({ threadId }) =>
      client.mailboxes.listThreadMessages({ mailboxId: client.mailboxId, threadId }),
  });

export const listMailboxThreadDraftsTool = (client: SamvaMailboxClient) =>
  tool({
    description: "List saved drafts for a Samva mailbox thread.",
    inputSchema: threadIdInput,
    execute: async ({ threadId }) =>
      client.mailboxes.listThreadDrafts({ mailboxId: client.mailboxId, threadId }),
  });

export const createMailboxDraftTool = (client: SamvaMailboxClient) =>
  tool({
    description:
      "Create a Samva mailbox draft. This does not send email and is safe for automatic agent use.",
    inputSchema: createDraftInput,
    execute: async ({ threadId, ...content }) =>
      client.mailboxes.createDraft({
        mailboxId: client.mailboxId,
        threadId,
        content: omitUndefined(content),
      }),
  });

export const updateMailboxDraftTool = (client: SamvaMailboxClient) =>
  tool({
    description:
      "Update a Samva mailbox draft. This does not send email and is safe for automatic agent use.",
    inputSchema: updateDraftInput,
    execute: async ({ threadId, draftId, ...content }) =>
      client.mailboxes.updateDraft({
        mailboxId: client.mailboxId,
        threadId,
        draftId,
        content: omitUndefined(content),
      }),
  });

export const sendMailboxReplyTool = (config: SamvaMailboxToolsConfig) => {
  const client = createMailboxContext(config);
  return tool({
    description:
      "Propose a Samva mailbox reply. This routes through Samva policy gates and may return approvalRequired instead of sending immediately.",
    inputSchema: replyInput,
    execute: async ({ threadId, ...payload }) => {
      assertSendCapability(config);
      return client.mailboxes.proposeThreadAction({
        mailboxId: client.mailboxId,
        threadId,
        type: "reply",
        source: "aiSdkTool",
        payload: approvalPayload(config.approvalMode, payload),
      });
    },
  });
};

export const sendMailboxEmailTool = (config: SamvaMailboxToolsConfig) => {
  const client = createMailboxContext(config);
  return tool({
    description:
      "Propose a new Samva mailbox email send. This is opt-in and routes through Samva policy gates.",
    inputSchema: sendEmailInput,
    execute: async ({ threadId, ...payload }) => {
      assertSendCapability(config);
      const body = {
        type: "sendMessage" as const,
        source: "aiSdkTool" as const,
        payload: approvalPayload(config.approvalMode, payload),
      };
      if (threadId === undefined) {
        return client.mailboxes.proposeAction({ mailboxId: client.mailboxId, ...body });
      }
      return client.mailboxes.proposeThreadAction({
        mailboxId: client.mailboxId,
        threadId,
        ...body,
      });
    },
  });
};

export const samvaMailboxToolApproval = (input: { mode: SamvaMailboxApprovalMode }) => ({
  approvalMode: input.mode,
});

export const mailboxTools = (config: SamvaMailboxToolsConfig) => {
  const client = createMailboxContext(config);
  const capabilities = {
    read: true,
    draft: true,
    send: false,
    ...config.capabilities,
  };

  return {
    ...(capabilities.read
      ? {
          listMailboxThreads: listMailboxThreadsTool(client),
          getMailboxThread: getMailboxThreadTool(client),
          listMailboxThreadItems: listMailboxThreadItemsTool(client),
          listMailboxThreadMessages: listMailboxThreadMessagesTool(client),
          listMailboxThreadDrafts: listMailboxThreadDraftsTool(client),
        }
      : {}),
    ...(capabilities.draft
      ? {
          createMailboxDraft: createMailboxDraftTool(client),
          updateMailboxDraft: updateMailboxDraftTool(client),
        }
      : {}),
    ...(capabilities.send
      ? {
          sendMailboxReply: sendMailboxReplyTool(config),
          sendMailboxEmail: sendMailboxEmailTool(config),
        }
      : {}),
  };
};
