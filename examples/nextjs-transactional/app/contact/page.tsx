import Link from "next/link";

import { ContactForm } from "./contact-form";

export const runtime = "edge";

export default function ContactPage() {
  return (
    <main className="shell">
      <section className="panel narrow">
        <Link className="back" href="/">
          Back
        </Link>
        <p className="eyebrow">Server Action</p>
        <h1>Contact form</h1>
        <p className="lede">
          Submit the form to call a server action that sends
          <code>samva.messages.send</code> with your server-only API key.
        </p>
        <ContactForm />
      </section>
    </main>
  );
}
