declare const Deno: {
  readonly env: {
    get(name: string): string | undefined;
    toObject(): Record<string, string>;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};
