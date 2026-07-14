import { describe, expect, it } from "vitest";

import { mailboxTools, samvaMailboxToolApproval, sendMailboxReplyTool } from "../src/mailbox";

const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });

const createFetch = (response: Response = jsonResponse({ ok: true })) => {
  const calls: Array<{
    url: string;
    method: string;
    headers: Headers;
    body: string | undefined;
  }> = [];
  const mockedFetch: typeof fetch = (async (url, init) => {
    const request = url instanceof Request ? url : new Request(url, init);
    const body = await request.clone().text();
    calls.push({
      url: request.url,
      method: request.method,
      headers: request.headers,
      body: body === "" ? undefined : body,
    });
    return response.clone();
  }) as typeof fetch;
  return { calls, fetch: mockedFetch };
};

const headersObject = (headers: HeadersInit) => Object.fromEntries(new Headers(headers).entries());

const executeTool = async <TInput>(toolValue: unknown, input: TInput) => {
  const executable = toolValue as {
    execute: (input: TInput, options?: unknown) => Promise<unknown>;
  };
  return executable.execute(input, {});
};

describe("@samva/ai-sdk mailbox tools", () => {
  it("creates read and draft tools by default", () => {
    const tools = mailboxTools({
      apiKey: "sk_test",
      mailboxId: "11111111-1111-4111-8111-111111111111",
    });

    expect(Object.keys(tools).sort()).toEqual([
      "createMailboxDraft",
      "getMailboxThread",
      "listMailboxThreadDrafts",
      "listMailboxThreadItems",
      "listMailboxThreadMessages",
      "listMailboxThreads",
      "updateMailboxDraft",
    ]);
  });

  it("lists threads through the Samva mailbox API", async () => {
    const { calls, fetch } = createFetch(
      jsonResponse({ items: [], pagination: { hasMore: false } }),
    );
    const tools = mailboxTools({
      apiKey: "sk_test",
      mailboxId: "mailbox_123",
      baseUrl: "https://api.test",
      fetch,
    });

    const result = await executeTool(tools.listMailboxThreads, { folder: "inbox", limit: 10 });

    expect(result).toEqual({ items: [], pagination: { hasMore: false } });
    expect(calls[0]?.url).toBe(
      "https://api.test/v1/mailboxes/mailbox_123/threads?folder=inbox&limit=10",
    );
    expect(headersObject(calls[0]!.headers)).toMatchObject({
      "x-api-key": "sk_test",
    });
  });

  it("creates drafts without proposing a send action", async () => {
    const { calls, fetch } = createFetch(jsonResponse({ id: "draft_123" }, { status: 201 }));
    const tools = mailboxTools({
      apiKey: "sk_test",
      mailboxId: "mailbox_123",
      baseUrl: "https://api.test",
      fetch,
    });

    const result = await executeTool(tools.createMailboxDraft, {
      threadId: "thread_123",
      text: "Thanks, we are checking this.",
    });

    expect(result).toEqual({ id: "draft_123" });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.test/v1/mailboxes/mailbox_123/threads/thread_123/drafts",
    );
    expect(calls[0]?.method).toBe("POST");
    expect(JSON.parse(String(calls[0]?.body))).toEqual({
      content: { text: "Thanks, we are checking this." },
    });
  });

  it("omits send tools unless send capability is enabled", () => {
    const safeTools = mailboxTools({
      apiKey: "sk_test",
      mailboxId: "mailbox_123",
      capabilities: { read: true, draft: true },
    });
    const sendTools = mailboxTools({
      apiKey: "sk_test",
      mailboxId: "mailbox_123",
      capabilities: { send: true },
    });

    expect("sendMailboxReply" in safeTools).toBe(false);
    expect("sendMailboxReply" in sendTools).toBe(true);
    expect("sendMailboxEmail" in sendTools).toBe(true);
  });

  it("returns a structured failure if an individual send tool is used without opt in", async () => {
    const toolValue = sendMailboxReplyTool({
      apiKey: "sk_test",
      mailboxId: "mailbox_123",
    });

    await expect(
      executeTool(toolValue, {
        threadId: "thread_123",
        text: "Ship it",
      }),
    ).rejects.toThrow("Send tools are disabled by default");
  });

  it("proposes send actions through Samva policy gates", async () => {
    const { calls, fetch } = createFetch(
      jsonResponse(
        {
          status: "approvalRequired",
          reason: "Human approval required",
          action: { id: "action_123", state: "approvalRequired" },
        },
        { status: 202 },
      ),
    );
    const tools = mailboxTools({
      apiKey: "sk_test",
      mailboxId: "mailbox_123",
      baseUrl: "https://api.test",
      fetch,
      capabilities: { send: true },
      ...samvaMailboxToolApproval({ mode: "requireApproval" }),
    });

    const result = await executeTool(tools.sendMailboxReply, {
      threadId: "thread_123",
      draftId: "draft_123",
      text: "Approved?",
    });

    expect(result).toEqual({
      status: "approvalRequired",
      reason: "Human approval required",
      action: { id: "action_123", state: "approvalRequired" },
    });
    expect(calls[0]?.url).toBe(
      "https://api.test/v1/mailboxes/mailbox_123/threads/thread_123/actions",
    );
    expect(JSON.parse(String(calls[0]?.body))).toEqual({
      type: "reply",
      source: "aiSdkTool",
      payload: {
        draftId: "draft_123",
        text: "Approved?",
        approvalMode: "requireApproval",
        requireApproval: true,
      },
    });
  });
});
