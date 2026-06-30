"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { sendContactEmail, type ContactFormState } from "./actions";

const initialState: ContactFormState = {
  status: "idle",
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="button" disabled={pending} type="submit">
      {pending ? "Sending..." : "Send message"}
    </button>
  );
}

export function ContactForm() {
  const [state, formAction] = useActionState(sendContactEmail, initialState);

  return (
    <form action={formAction} className="form">
      <label>
        Name
        <input autoComplete="name" name="name" placeholder="Ada Lovelace" type="text" />
      </label>
      <label>
        Email
        <input
          autoComplete="email"
          name="email"
          placeholder="ada@example.com"
          required
          type="email"
        />
      </label>
      <label>
        Message
        <textarea name="message" placeholder="Tell us what you need." required rows={6} />
      </label>
      <SubmitButton />
      {state.message ? (
        <p className={state.status === "error" ? "error" : "success"}>{state.message}</p>
      ) : null}
    </form>
  );
}
