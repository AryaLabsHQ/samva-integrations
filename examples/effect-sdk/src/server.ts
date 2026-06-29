import { Data, Effect, Schedule } from "effect";
import { SamvaClient, type SamvaClientConfig } from "samva/effect";

import { readSamvaConfig } from "./config";
import { renderMessageHtml } from "./html";

class RequestError extends Data.TaggedError("RequestError")<{
  readonly message: string;
  readonly status: number;
  readonly fields?: Readonly<Record<string, string>>;
}> {}

interface SendRequest {
  readonly to: string;
  readonly subject: string;
  readonly message: string;
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return Response.json(body, init);
}

function asNonEmptyString(
  body: Record<string, unknown>,
  field: keyof SendRequest,
): string | undefined {
  const value = body[field];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function parseSendRequest(body: unknown): Effect.Effect<SendRequest, RequestError> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return Effect.fail(
      new RequestError({
        message: "Request body must be a JSON object.",
        status: 400,
      }),
    );
  }

  const record = body as Record<string, unknown>;
  const to = asNonEmptyString(record, "to");
  const subject = asNonEmptyString(record, "subject");
  const message = asNonEmptyString(record, "message");
  const fields: Record<string, string> = {};

  if (!to) fields.to = "Provide a recipient email address.";
  if (!subject) fields.subject = "Provide an email subject.";
  if (!message) fields.message = "Provide a plain-text message.";

  if (
    Object.keys(fields).length > 0 ||
    to === undefined ||
    subject === undefined ||
    message === undefined
  ) {
    return Effect.fail(
      new RequestError({
        message: "Request body is missing required fields.",
        status: 400,
        fields,
      }),
    );
  }

  return Effect.succeed({ to, subject, message });
}

function parseJson(request: Request): Effect.Effect<unknown, RequestError> {
  return Effect.tryPromise({
    try: () => request.json() as Promise<unknown>,
    catch: () =>
      new RequestError({
        message: "Request body must be valid JSON.",
        status: 400,
      }),
  });
}

function retryAfterSeconds(value: number | string): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isRetryable(error: { readonly _tag: string }): boolean {
  const tag = error["_tag"];
  return tag === "MessagesSend429" || tag === "MessagesSend500" || tag === "MessagesSend502";
}

export function createFetchHandler(config: SamvaClientConfig): {
  readonly fetch: (request: Request) => Promise<Response>;
} {
  const SamvaLayer = SamvaClient.layerFetch(config);

  return {
    fetch: (request) => {
      if (request.method !== "POST") {
        return Promise.resolve(jsonResponse({ error: "method_not_allowed" }, { status: 405 }));
      }

      const program = Effect.gen(function* () {
        const body = yield* parseJson(request);
        const input = yield* parseSendRequest(body);
        const samva = yield* SamvaClient;

        return yield* samva.email.send({
          to: input.to,
          subject: input.subject,
          html: renderMessageHtml(input.message),
          text: input.message,
        });
      }).pipe(
        Effect.retry({
          schedule: Schedule.exponential("200 millis").pipe(Schedule.jittered),
          times: 3,
          while: isRetryable,
        }),
        Effect.map((message) =>
          jsonResponse({
            id: message.id,
            status: message.status,
          }),
        ),
        Effect.catchTags({
          RequestError: (error) =>
            Effect.succeed(
              jsonResponse(
                {
                  error: "bad_request",
                  message: error.message,
                  fields: error.fields ?? {},
                },
                { status: error.status },
              ),
            ),
          MessagesSend422: (error) =>
            Effect.succeed(
              jsonResponse(
                {
                  error: "validation_failed",
                  message: error.cause.message,
                  fields: error.cause.fields ?? {},
                },
                { status: 400 },
              ),
            ),
          MessagesSend401: () =>
            Effect.succeed(
              jsonResponse(
                {
                  error: "samva_configuration_error",
                  message: "SAMVA_API_KEY is invalid or missing permissions.",
                },
                { status: 500 },
              ),
            ),
          MessagesSend429: (error) =>
            Effect.succeed(
              jsonResponse(
                {
                  error: "rate_limited",
                  retryAfterSeconds: retryAfterSeconds(error.cause.retryAfterSeconds),
                },
                { status: 429 },
              ),
            ),
        }),
        Effect.match({
          onFailure: (error) =>
            jsonResponse(
              {
                error: "samva_send_failed",
                message: String(error),
              },
              { status: 502 },
            ),
          onSuccess: (response) => response,
        }),
        Effect.provide(SamvaLayer),
      );

      return Effect.runPromise(program);
    },
  };
}

const handler = createFetchHandler(readSamvaConfig());

export default handler;

if (import.meta.main) {
  const port = Number(Bun.env.PORT ?? 3000);
  Bun.serve({
    port,
    fetch: handler.fetch,
  });
  console.log(`Effect SDK example listening on http://localhost:${port}`);
}
