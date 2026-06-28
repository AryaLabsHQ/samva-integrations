import { tool } from "ai";
import { z } from "zod";

export type SamvaMailboxToolResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; details?: unknown };

export type SamvaMailboxClientConfig = {
  apiKey: string;
  mailboxId: string;
  baseUrl?: string;
  fetch?: typeof fetch;
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

export type SamvaMailboxActionType =
  | "sendMessage"
  | "reply"
  | "updateDraft"
  | "createNote"
  | "assignThread"
  | "changeThreadState"
  | "call"
  | "extensionRequest";

export type SamvaMailboxActionProposalResponse =
  | { status: "accepted"; action: Record<string, unknown> }
  | { status: "approvalRequired"; action: Record<string, unknown>; reason: string }
  | { status: "denied"; action: Record<string, unknown>; reason: string };

const DEFAULT_BASE_URL = "https://api.samva.app";

const joinUrl = (baseUrl: string, path: string) =>
  `${baseUrl.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

const encodeQuery = (query: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
};

const readErrorBody = async (response: Response) => {
  const text = await response.text();
  if (!text) return response.statusText || "Samva request failed";
  try {
    const parsed = JSON.parse(text) as { message?: unknown; error?: unknown };
    if (typeof parsed.message === "string") return parsed.message;
    if (typeof parsed.error === "string") return parsed.error;
    return text;
  } catch {
    return text;
  }
};

const normalizeFailure = (error: unknown): SamvaMailboxToolResult<never> => ({
  ok: false,
  status: 0,
  error: error instanceof Error ? error.message : String(error),
});

export const createMailboxClient = (config: SamvaMailboxClientConfig) => {
  const requestFetch = config.fetch ?? globalThis.fetch;
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const mailboxPath = `/v1/mailboxes/${encodeURIComponent(config.mailboxId)}`;

  const request = async <T>(
    path: string,
    init?: RequestInit,
  ): Promise<SamvaMailboxToolResult<T>> => {
    try {
      const response = await requestFetch(joinUrl(baseUrl, path), {
        ...init,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${config.apiKey}`,
          ...(init?.body === undefined ? {} : { "Content-Type": "application/json" }),
          ...init?.headers,
        },
      });
      if (!response.ok) {
        return { ok: false, status: response.status, error: await readErrorBody(response) };
      }
      if (response.status === 204) return { ok: true, data: undefined as T };
      return { ok: true, data: (await response.json()) as T };
    } catch (error) {
      return normalizeFailure(error);
    }
  };

  const post = <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) });

  const patch = <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) });

  return {
    listMailboxes: () => request<{ items: unknown[] }>("/v1/mailboxes"),
    getMailbox: () => request<Record<string, unknown>>(mailboxPath),
    listThreads: (query: SamvaMailboxThreadListQuery = {}) =>
      request<{ items: unknown[]; pagination?: unknown }>(
        `${mailboxPath}/threads${encodeQuery(query)}`,
      ),
    getThread: (threadId: string) =>
      request<Record<string, unknown>>(`${mailboxPath}/threads/${encodeURIComponent(threadId)}`),
    listThreadItems: (threadId: string) =>
      request<{ items: unknown[]; pagination?: unknown }>(
        `${mailboxPath}/threads/${encodeURIComponent(threadId)}/items`,
      ),
    listThreadMessages: (threadId: string) =>
      request<{ items: unknown[]; pagination?: unknown }>(
        `${mailboxPath}/threads/${encodeURIComponent(threadId)}/messages`,
      ),
    listThreadDrafts: (threadId: string) =>
      request<{ items: unknown[] }>(
        `${mailboxPath}/threads/${encodeURIComponent(threadId)}/drafts`,
      ),
    createDraft: (threadId: string, content: Record<string, unknown>) =>
      post<Record<string, unknown>>(
        `${mailboxPath}/threads/${encodeURIComponent(threadId)}/drafts`,
        {
          content,
        },
      ),
    updateDraft: (threadId: string, draftId: string, content: Record<string, unknown>) =>
      patch<Record<string, unknown>>(
        `${mailboxPath}/threads/${encodeURIComponent(threadId)}/drafts/${encodeURIComponent(
          draftId,
        )}`,
        { content },
      ),
    listActions: () => request<{ items: unknown[] }>(`${mailboxPath}/actions`),
    proposeAction: (input: {
      type: SamvaMailboxActionType;
      threadId?: string | undefined;
      payload: Record<string, unknown>;
    }) =>
      post<SamvaMailboxActionProposalResponse>(`${mailboxPath}/actions`, {
        type: input.type,
        source: "aiSdkTool",
        threadId: input.threadId,
        payload: input.payload,
      }),
  };
};

export type SamvaMailboxClient = ReturnType<typeof createMailboxClient>;

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
  metadata: z.record(z.string(), z.unknown()).optional(),
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
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const sendEmailInput = z.object({
  threadId: z.string().optional().describe("Optional mailbox thread id for contextual sends."),
  to: z.array(z.string()).min(1).describe("Recipient email addresses."),
  cc: z.array(z.string()).optional().describe("CC recipient email addresses."),
  bcc: z.array(z.string()).optional().describe("BCC recipient email addresses."),
  subject: z.string().describe("Email subject."),
  text: z.string().optional().describe("Plain-text email body."),
  html: z.string().optional().describe("HTML email body."),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const requireSendCapability = (config: SamvaMailboxToolsConfig) => {
  if (config.capabilities?.send !== true) {
    return {
      ok: false as const,
      status: 403,
      error:
        "Send tools are disabled by default. Pass capabilities: { send: true } to opt into policy-gated sends.",
    };
  }
  return undefined;
};

const approvalPayload = (
  approvalMode: SamvaMailboxApprovalMode | undefined,
  payload: Record<string, unknown>,
) => ({
  ...payload,
  approvalMode: approvalMode ?? "samvaPolicy",
  requireApproval: approvalMode === "requireApproval" ? true : undefined,
});

export const listMailboxThreadsTool = (client: SamvaMailboxClient) =>
  tool({
    description:
      "List Samva mailbox threads. Use this to find recent inbound, pending, or labeled conversations before reading a specific thread.",
    inputSchema: threadListInput,
    execute: async (input) => client.listThreads(input),
  });

export const getMailboxThreadTool = (client: SamvaMailboxClient) =>
  tool({
    description:
      "Get a Samva mailbox thread with participants, actor state, and visible timeline item references.",
    inputSchema: threadIdInput,
    execute: async ({ threadId }) => client.getThread(threadId),
  });

export const listMailboxThreadItemsTool = (client: SamvaMailboxClient) =>
  tool({
    description:
      "List unified timeline items for a Samva mailbox thread, including message, event, action, note, and draft references.",
    inputSchema: threadIdInput,
    execute: async ({ threadId }) => client.listThreadItems(threadId),
  });

export const listMailboxThreadMessagesTool = (client: SamvaMailboxClient) =>
  tool({
    description: "List message references for a Samva mailbox thread.",
    inputSchema: threadIdInput,
    execute: async ({ threadId }) => client.listThreadMessages(threadId),
  });

export const listMailboxThreadDraftsTool = (client: SamvaMailboxClient) =>
  tool({
    description: "List saved drafts for a Samva mailbox thread.",
    inputSchema: threadIdInput,
    execute: async ({ threadId }) => client.listThreadDrafts(threadId),
  });

export const createMailboxDraftTool = (client: SamvaMailboxClient) =>
  tool({
    description:
      "Create a Samva mailbox draft. This does not send email and is safe for automatic agent use.",
    inputSchema: createDraftInput,
    execute: async ({ threadId, ...content }) => client.createDraft(threadId, content),
  });

export const updateMailboxDraftTool = (client: SamvaMailboxClient) =>
  tool({
    description:
      "Update a Samva mailbox draft. This does not send email and is safe for automatic agent use.",
    inputSchema: updateDraftInput,
    execute: async ({ threadId, draftId, ...content }) =>
      client.updateDraft(threadId, draftId, content),
  });

export const sendMailboxReplyTool = (config: SamvaMailboxToolsConfig) => {
  const client = createMailboxClient(config);
  return tool({
    description:
      "Propose a Samva mailbox reply. This routes through Samva policy gates and may return approvalRequired instead of sending immediately.",
    inputSchema: replyInput,
    execute: async ({ threadId, ...payload }) => {
      const disabled = requireSendCapability(config);
      if (disabled) return disabled;
      return client.proposeAction({
        type: "reply",
        threadId,
        payload: approvalPayload(config.approvalMode, payload),
      });
    },
  });
};

export const sendMailboxEmailTool = (config: SamvaMailboxToolsConfig) => {
  const client = createMailboxClient(config);
  return tool({
    description:
      "Propose a new Samva mailbox email send. This is opt-in and routes through Samva policy gates.",
    inputSchema: sendEmailInput,
    execute: async ({ threadId, ...payload }) => {
      const disabled = requireSendCapability(config);
      if (disabled) return disabled;
      return client.proposeAction({
        type: "sendMessage",
        ...(threadId === undefined ? {} : { threadId }),
        payload: approvalPayload(config.approvalMode, payload),
      });
    },
  });
};

export const samvaMailboxToolApproval = (input: { mode: SamvaMailboxApprovalMode }) => ({
  approvalMode: input.mode,
});

export const mailboxTools = (config: SamvaMailboxToolsConfig) => {
  const client = createMailboxClient(config);
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
