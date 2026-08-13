import { Effect } from "effect";
import { Client, Email } from "samva/effect";

import { readSamvaConfig } from "./config";
import { renderMessageHtml } from "./html";

interface SendArgs {
  readonly to: string;
  readonly subject: string;
  readonly message: string;
}

function readOption(args: ReadonlyArray<string>, name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function readSendArgs(args: ReadonlyArray<string>): SendArgs {
  return {
    to: readOption(args, "--to") ?? "ada@example.com",
    subject: readOption(args, "--subject") ?? "Hello from Samva + Effect",
    message:
      readOption(args, "--message") ?? "This email was sent with the Effect-native Samva SDK.",
  };
}

const options = readSendArgs(Bun.argv.slice(2));

const program = Email.send({
  to: options.to,
  subject: options.subject,
  html: renderMessageHtml(options.message),
  text: options.message,
}).pipe(
  Effect.provide(Client.layerFetch(readSamvaConfig())),
  Effect.tapError((error) =>
    Effect.sync(() => {
      console.error("Samva send failed:", error);
    }),
  ),
);

const message = await Effect.runPromise(program);

console.log("Sent message:", {
  id: message.id,
  status: message.status,
});
