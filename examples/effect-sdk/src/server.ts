import { Data, Effect } from "effect";
import { Client, Email, catchAuthError, isRetryable } from "samva/effect";

import { readSamvaConfig } from "./config";
import { renderMessageHtml } from "./html";

class RequestError extends Data.TaggedError("RequestError")<{
  readonly message: string;
  readonly status: number;
  readonly fields?: Readonly<Record<string, ReadonlyArray<string>>>;
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
  const fields: Record<string, ReadonlyArray<string>> = {};

  if (!to) fields.to = ["Provide a recipient email address."];
  if (!subject) fields.subject = ["Provide an email subject."];
  if (!message) fields.message = ["Provide a plain-text message."];

  if (Object.keys(fields).length > 0) {
    return Effect.fail(
      new RequestError({
        message: "Request body is missing required fields.",
        status: 400,
        fields,
      }),
    );
  }

  return Effect.succeed({ to: to!, subject: subject!, message: message! });
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

export function createFetchHandler(config: Client.Config): {
  readonly fetch: (request: Request) => Promise<Response>;
} {
  const SamvaLayer = Client.layerFetch(config);

  return {
    fetch: (request) => {
      if (request.method !== "POST") {
        return Promise.resolve(
          jsonResponse(
            { error: "method_not_allowed" },
            { status: 405, headers: { Allow: "POST" } },
          ),
        );
      }

      const program = Effect.gen(function* () {
        const body = yield* parseJson(request);
        const input = yield* parseSendRequest(body);

        // Sends carry an Idempotency-Key and retry themselves on throttling and
        // transient failures, so a failure reaching the handlers below has
        // already outlived the built-in backoff. Provide `Retry.layer` to
        // tune the policy, or `Retry.layerDisabled` to opt out.
        return yield* Email.send({
          to: input.to,
          subject: input.subject,
          html: renderMessageHtml(input.message),
          text: input.message,
        });
      }).pipe(
        Effect.map((message) =>
          jsonResponse({
            id: message.id,
            status: message.status,
            createdAt: message.createdAt,
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
          ValidationError: (error) =>
            Effect.succeed(
              jsonResponse(
                {
                  error: "validation_failed",
                  message: error.message,
                  fields: error.fields ?? {},
                },
                { status: 400 },
              ),
            ),
          RateLimitedError: (error) =>
            Effect.succeed(
              jsonResponse(
                {
                  error: "rate_limited",
                  retryAfterSeconds: error.retryAfterSeconds,
                },
                { status: 429 },
              ),
            ),
        }),
        // One handler for the whole auth category. `UnauthorizedError` and
        // `ForbiddenError` both mean the key is unusable, never the caller's fault.
        catchAuthError(() =>
          Effect.succeed(
            jsonResponse(
              {
                error: "samva_configuration_error",
                message: "SAMVA_API_KEY is invalid or missing permissions.",
              },
              { status: 500 },
            ),
          ),
        ),
        Effect.match({
          onFailure: (error) =>
            isRetryable(error)
              ? jsonResponse(
                  {
                    error: "samva_unavailable",
                    message: "Samva is still failing after the SDK exhausted its retries.",
                  },
                  { status: 502 },
                )
              : jsonResponse(
                  {
                    error: "samva_send_failed",
                    message: String(error),
                  },
                  { status: 500 },
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
