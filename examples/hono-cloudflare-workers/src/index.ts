import { Hono } from "hono";
import { createClient } from "samva";

type Bindings = {
  SAMVA_API_KEY: string;
};

type SendRequestBody = {
  to?: unknown;
  subject?: unknown;
  html?: unknown;
  text?: unknown;
};

const app = new Hono<{ Bindings: Bindings }>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

app.get("/", (c) => c.text("samva + hono on workers"));

app.post("/send", async (c) => {
  const body: unknown = await c.req.json().catch(() => null);
  if (!isRecord(body)) {
    return c.json({ error: "Expected a JSON object." }, 400);
  }

  const { to, subject, html, text } = body as SendRequestBody;
  const recipientEmail = readString(to);
  const emailSubject = readString(subject);

  if (!recipientEmail || !emailSubject) {
    return c.json({ error: "to and subject are required" }, 400);
  }

  const apiKey = c.env.SAMVA_API_KEY;
  if (!apiKey) {
    throw new Error("SAMVA_API_KEY is not configured for this Worker.");
  }

  const samva = createClient({ apiKey });
  const { data, error } = await samva.messages.send({
    to: [{ email: recipientEmail }],
    channel: "email",
    email: {
      subject: emailSubject,
      html: readString(html) || "<p>Hello from Hono on Cloudflare Workers.</p>",
      text: readString(text) || undefined,
    },
  });

  if (error) {
    return c.json({ ok: false, error }, 502);
  }

  return c.json({ ok: true, id: data?.id });
});

app.post("/webhooks/samva", async (c) => {
  const payload = await c.req.text();
  const signature = c.req.header("x-webhook-signature");

  // TODO(wave 3): verify payload and signature with samva/webhooks.
  void payload;
  void signature;

  return c.body(null, 204);
});

export default app;
