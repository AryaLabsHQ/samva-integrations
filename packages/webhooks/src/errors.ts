export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

export class MissingSignatureError extends WebhookVerificationError {
  constructor(message = "Missing or empty webhook signature") {
    super(message);
    this.name = "MissingSignatureError";
  }
}

export class SignatureMismatchError extends WebhookVerificationError {
  constructor(message = "Webhook signature verification failed") {
    super(message);
    this.name = "SignatureMismatchError";
  }
}

export class MalformedPayloadError extends WebhookVerificationError {
  constructor(message = "Webhook payload is malformed") {
    super(message);
    this.name = "MalformedPayloadError";
  }
}

export class TimestampToleranceError extends WebhookVerificationError {
  constructor(message = "Webhook timestamp is outside the tolerance window") {
    super(message);
    this.name = "TimestampToleranceError";
  }
}
